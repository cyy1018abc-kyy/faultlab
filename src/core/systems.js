/* owner: core-engine | module: systems | contract: docs/CONTRACT.md */
/* 三系统 SystemDef（FL-001 / FC-001 / GT-001）：拓扑、信号元数据、故障目录、模型假设、因果模板。
   纯数据 + 查询 API，挂在 FL.systems；不依赖 DOM / FL.protocol。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};

  /* ------------------------------------------------------------------ */
  /* 构造辅助                                                            */
  /* ------------------------------------------------------------------ */
  var CHART_DEFAULT = { style: 'solid', colorToken: 'acc', axis: 'left', step: false, defaultVisible: true };
  var STYLES = { solid: 1, dashed: 1, dashdot: 1, dotted: 1 };
  var TOKENS = { acc: 1, obs: 1, warm: 1, fault: 1, ink: 1, ok: 1 };
  var SOURCE_KINDS = { CONFIG: 1, MODEL_STATE: 1, OBSERVATION: 1, CONTROLLER: 1, FAULT_EVENT: 1, DERIVED: 1, MODEL_ASSUMPTION: 1 };
  /* exposure 默认映射（DATA_CONTRACT_SPEC §1.6 / G0-DEC-11）；
     blindVisible 为派生兼容字段（= exposure 是否 blind_observable），禁止独立设置。 */
  var EXPOSURE_BY_SOURCE = {
    CONFIG: 'public_demo', MODEL_STATE: 'public_demo', OBSERVATION: 'blind_observable',
    CONTROLLER: 'public_demo', FAULT_EVENT: 'public_demo', DERIVED: 'public_demo',
    MODEL_ASSUMPTION: 'public_demo'
  };

  function chart(o) {
    var c = {
      style: o.style || CHART_DEFAULT.style,
      colorToken: o.colorToken || CHART_DEFAULT.colorToken,
      axis: o.axis || CHART_DEFAULT.axis,
      step: o.step === true,
      defaultVisible: o.defaultVisible !== false
    };
    if (!STYLES[c.style]) throw new Error('systems: 非法 chart.style ' + c.style);
    if (!TOKENS[c.colorToken]) throw new Error('systems: 非法 chart.colorToken ' + c.colorToken);
    return c;
  }

  function sig(o) {
    if (!SOURCE_KINDS[o.sourceKind]) throw new Error('systems: 非法 sourceKind ' + o.sourceKind);
    /* exposure：显式声明优先；否则由 blindVisible（历史标记）或 source_kind 默认映射派生 */
    var exposure = o.exposure || (o.blindVisible === true ? 'blind_observable' : EXPOSURE_BY_SOURCE[o.sourceKind]);
    var s = {
      id: o.id,
      label: o.label,
      shortLabel: o.shortLabel || o.label,
      unit: o.unit || '',
      category: o.category,
      sourceKind: o.sourceKind,
      exposure: exposure,
      definition: o.definition || '',
      formula: o.formula || '',
      precision: o.precision == null ? 2 : o.precision,
      chart: chart(o.chart || {}),
      blindVisible: exposure === 'blind_observable',
      tableOnly: o.tableOnly === true
    };
    /* 观测噪声尺度（仅噪声开启时作用于 primary 传感器通道；0 = 不直接加噪声） */
    s.noiseSigma = o.noiseSigma || 0;
    return s;
  }

  function comp(o) {
    return {
      id: o.id,
      label: o.label,
      kind: o.kind,
      role: o.role || '',
      description: o.description || '',
      x: o.x, y: o.y, w: o.w, h: o.h,
      faultable: o.faultable === true,
      inspector: (o.inspector || []).map(function (it) {
        return { id: it.id, label: it.label || it.id, source: it.source };
      })
    };
  }

  function fault(o) {
    return {
      id: o.id,
      family: o.family,
      label: o.label,
      shortLabel: o.shortLabel || o.label,
      target: o.target,
      description: o.description || '',
      params: (o.params || []).map(function (p) {
        return {
          key: p.key, label: p.label, unit: p.unit,
          min: p.min, max: p.max, step: p.step == null ? 1 : p.step,
          default: p.default, precision: p.precision == null ? 0 : p.precision,
          help: p.help || ''
        };
      }),
      defaultTime_s: o.defaultTime_s,
      timeRange: o.timeRange || [2, 55],
      closedLoopEffect: o.closedLoopEffect || '',
      monitorEffect: o.monitorEffect || '',
      causalTemplateId: o.causalTemplateId || ''
    };
  }

  function paramsDefault(f) {
    var out = {};
    f.params.forEach(function (p) { out[p.key] = p.default; });
    return out;
  }

  var UNITS = {
    time: 's', power: 'kW', current: 'A', voltage: 'V',
    soc: '%', energy: 'kWh', frequency: 'Hz', speed: 'rpm', ratio: '%'
  };

  /* ================================================================== */
  /* FL-001 电池储能（基准系统）                                          */
  /* ================================================================== */
  var FL001 = {
    id: 'FL-001',
    title: '电池储能系统',
    shortTitle: '电池储能',
    experimentCode: 'FL-001',
    experimentName: '电池电流传感器偏置',
    tagline: '在 20 秒注入 +10 A 电流测量偏置，看反馈回路如何改变真实功率。',
    level: 'L0 · 行为级演示模型',
    summary: '40 kWh 电池组经双向 DC/DC 接入理想 400 V 直流母线，与理想发电机共同为 30 kW 恒定负载供电；控制器按电池电流测量值闭环调节放电电流。',
    questions: [
      '传感器测量偏高时，真实电池电流会怎样变化？',
      '+4 kW 的测量残差是额外损失的能量吗？',
      '真实电能与基于测量的估计如何分离？'
    ],
    duration_s: 60,
    dt_s: 0.1,
    topologyViewBox: [0, 0, 1000, 620],
    defaults: {
      feedback_mode: 'closed_loop',
      initial: { load_kW: 30, SOC_pct: 60 },
      noise: { enabled: false, seed: 12345, level: 0 }
    },
    bounds: {
      load_kW: { min: 10, max: 45 },
      SOC_pct: { min: 0, max: 100 }
    },
    components: [
      comp({
        id: 'generator', label: '发电机', kind: 'generator', role: '理想平衡源 · 初始 20 kW',
        description: '理想平衡功率源，瞬时补偿母线剩余功率；初始 20 kW 仅用于展示，不代表真实机组动态。',
        x: 60, y: 60, w: 190, h: 96, faultable: false,
        inspector: [
          { id: 'P_gen_true_kW', source: 'MODEL_STATE' },
          { id: 'P_gen_meas_kW', source: 'OBSERVATION' },
          { id: 'V_bus_V', source: 'MODEL_ASSUMPTION' }
        ]
      }),
      comp({
        id: 'bus', label: '直流母线', kind: 'bus', role: '400 V 理想母线',
        description: '理想 400 V 直流母线：无母线动态、无压降；真实功率平衡由模型结构保证。',
        x: 400, y: 60, w: 160, h: 96, faultable: false,
        inspector: [
          { id: 'V_bus_V', source: 'MODEL_ASSUMPTION' },
          { id: 'r_true_kW', source: 'DERIVED' },
          { id: 'r_meas_kW', source: 'DERIVED' }
        ]
      }),
      comp({
        id: 'load', label: '负载', kind: 'load', role: '恒定 30 kW',
        description: '恒定功率负载；load_step 故障场景中在故障时刻阶跃 +magnitude kW。',
        x: 740, y: 60, w: 190, h: 96, faultable: true,
        inspector: [
          { id: 'P_load_demand_kW', source: 'CONFIG' },
          { id: 'P_load_served_kW', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'battery', label: '电池组', kind: 'battery', role: '40 kWh / 400 V · 放电为正',
        description: '40 kWh 等效电池组（恒压 0.4 kV 近似，100 Ah 等效）；SOC 由真实功率积分得到。',
        x: 60, y: 380, w: 190, h: 96, faultable: false,
        inspector: [
          { id: 'I_bat_true_A', source: 'MODEL_STATE' },
          { id: 'P_bat_true_kW', source: 'MODEL_STATE' },
          { id: 'SOC_true_pct', source: 'MODEL_STATE' },
          { id: 'SOC_est_pct', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'converter', label: '双向 DC/DC 变换器', kind: 'converter', role: '电流闭环执行器',
        description: '按控制器电流目标调节电池放电电流；actuator_fault 场景电流上限被限制。',
        x: 340, y: 380, w: 170, h: 96, faultable: true,
        inspector: [
          { id: 'I_ref_A', source: 'CONTROLLER' },
          { id: 'I_bat_true_A', source: 'MODEL_STATE' },
          { id: 'I_bat_cap_A', source: 'FAULT_EVENT' }
        ]
      }),
      comp({
        id: 'sensor', label: '电流传感器', kind: 'sensor', role: '电池电流测量 · 故障注入点',
        description: '电池电流测量通道；sensor_drift 场景注入阶跃偏置 b(t)，控制器看到错误电流。',
        x: 340, y: 220, w: 170, h: 84, faultable: true,
        inspector: [
          { id: 'I_bat_true_A', source: 'MODEL_STATE' },
          { id: 'bias_A', source: 'FAULT_EVENT' },
          { id: 'I_bat_meas_A', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'controller', label: '功率控制器', kind: 'controller', role: '按测量电流闭环反馈',
        description: '行为级一阶闭环（τ=1.5 s）：τ·dI_true/dt + I_true = I_ref − b(t)。',
        x: 720, y: 360, w: 210, h: 110, faultable: false,
        inspector: [
          { id: 'I_ref_A', source: 'CONTROLLER' },
          { id: 'I_bat_meas_A', source: 'OBSERVATION' },
          { id: 'r_meas_kW', source: 'DERIVED' }
        ]
      })
    ],
    edges: [
      { id: 'battery->converter', from: 'battery', to: 'converter', kind: 'power', label: '电池电流' },
      { id: 'converter->bus', from: 'converter', to: 'bus', kind: 'power', label: '直流 400 V' },
      { id: 'generator->bus', from: 'generator', to: 'bus', kind: 'power', label: '补偿功率' },
      { id: 'bus->load', from: 'bus', to: 'load', kind: 'power', label: '30 kW 需求' },
      { id: 'battery->sensor', from: 'battery', to: 'sensor', kind: 'measurement', label: '电流采样' },
      { id: 'sensor->controller', from: 'sensor', to: 'controller', kind: 'measurement', label: 'I_meas' },
      { id: 'controller->converter', from: 'controller', to: 'converter', kind: 'signal', label: '电流指令' },
      { id: 'load->controller', from: 'load', to: 'controller', kind: 'signal', label: '负载需求' }
    ],
    faultAnchors: { sensor_drift: 'sensor', actuator_fault: 'converter' },
    signalCategories: [
      { id: 'current', label: '电流' },
      { id: 'power', label: '功率' },
      { id: 'soc', label: 'SOC' },
      { id: 'residual', label: '残差' },
      { id: 'actuator', label: '执行器' }
    ],
    signals: [
      sig({ id: 'I_bat_true_A', label: '电池真实电流', shortLabel: 'I_true', unit: 'A', category: 'current', sourceKind: 'MODEL_STATE', definition: '电池实际放电电流（真值），放电为正。', formula: 'I_true', precision: 2, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'I_bat_meas_A', label: '电池测量电流', shortLabel: 'I_meas', unit: 'A', category: 'current', sourceKind: 'OBSERVATION', definition: '传感器输出 = 真实电流 + 故障偏置。', formula: 'I_meas = I_true + b(t)', precision: 2, chart: { style: 'dashed', colorToken: 'obs', axis: 'left', step: true }, blindVisible: true, noiseSigma: 0.35 }),
      sig({ id: 'I_ref_A', label: '控制器电流目标', shortLabel: 'I_ref', unit: 'A', category: 'current', sourceKind: 'CONTROLLER', definition: '控制器下发的电池电流参考，默认 25 A（=10 kW / 0.4 kV）。', formula: 'I_ref = 25 A', precision: 2, chart: { style: 'dashdot', colorToken: 'warm', axis: 'left' }, blindVisible: true }),
      sig({ id: 'bias_A', label: '传感器偏置', shortLabel: 'b(t)', unit: 'A', category: 'current', sourceKind: 'FAULT_EVENT', definition: '故障注入的测量偏置，阶跃信号。', formula: 'b(t)=0 (t<20 s), b(t)=+10 A (t≥20 s)', precision: 2, chart: { style: 'dashed', colorToken: 'fault', axis: 'right', step: true } }),
      sig({ id: 'I_bat_cap_A', label: '变换器电流上限', shortLabel: 'I_cap', unit: 'A', category: 'actuator', sourceKind: 'FAULT_EVENT', definition: '执行器故障场景的电流限幅；其他场景不可用（null）。', formula: 'I_cap = I_ref × magnitude%', precision: 2, chart: { style: 'dashed', colorToken: 'fault', axis: 'left', step: true } }),
      sig({ id: 'P_bat_true_kW', label: '电池真实功率', shortLabel: 'P_bat,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '电池真实功率（放电为正）。', formula: 'P_bat,true = 0.4 × I_true', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_bat_meas_kW', label: '电池测量功率', shortLabel: 'P_bat,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '由测量电流换算的电池功率。', formula: 'P_bat,meas = 0.4 × I_meas', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left', step: true }, blindVisible: true }),
      sig({ id: 'P_gen_true_kW', label: '发电机真实功率', shortLabel: 'P_gen,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '理想发电机真实出力（母线平衡）。', formula: 'P_gen,true = P_load − P_bat,true', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_gen_meas_kW', label: '发电机测量功率', shortLabel: 'P_gen,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '发电机功率测量（健康通道）。', formula: 'P_gen,meas = P_gen,true', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true, noiseSigma: 0.15 }),
      sig({ id: 'P_load_demand_kW', label: '负载需求功率', shortLabel: 'P_load', unit: 'kW', category: 'power', sourceKind: 'CONFIG', definition: '配置的负载需求功率（恒定；FL-001 的 load_step 家族已按 O-13 删除）。', formula: 'P_load = 30 kW', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left' }, blindVisible: true }),
      sig({ id: 'P_load_served_kW', label: '负载实际获得功率', shortLabel: 'P_served', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '负载实际获得的功率（理想母线即需求功率）。', formula: 'P_load,served = P_load,demand', precision: 2, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'V_bus_V', label: '直流母线电压', shortLabel: 'V_bus', unit: 'V', category: 'power', sourceKind: 'MODEL_ASSUMPTION', definition: '理想母线电压，恒为 400 V（模型假设，不是仿真状态）。', formula: 'V_bus = 400 V', precision: 0, chart: { style: 'solid', colorToken: 'ink', axis: 'left', defaultVisible: false }, blindVisible: true, tableOnly: true }),
      sig({ id: 'SOC_true_pct', label: '真实 SOC', shortLabel: 'SOC_true', unit: '%', category: 'soc', sourceKind: 'MODEL_STATE', definition: '由真实电池功率积分得到的荷电状态。', formula: 'SOC_true = SOC0 − ∫P_bat,true dt / 40 kWh × 100%', precision: 5, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'SOC_est_pct', label: '估计 SOC', shortLabel: 'SOC_est', unit: '%', category: 'soc', sourceKind: 'OBSERVATION', definition: '由测量电池功率积分得到的 SOC 估计。', formula: 'SOC_est = SOC0 − ∫P_bat,meas dt / 40 kWh × 100%', precision: 5, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true }),
      sig({ id: 'r_true_kW', label: '真实功率平衡残差', shortLabel: 'r_true', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '真实功率守恒残差，理想模型下恒为 0。', formula: 'r_true = P_gen,true + P_bat,true − P_load,served', precision: 6, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'r_meas_kW', label: '测量一致性残差', shortLabel: 'r_meas', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '由测量构造的功率平衡残差；故障期间为 +4 kW，是测量偏差，不是能量损失。', formula: 'r_meas = P_gen,true + P_bat,meas − P_load,served', precision: 2, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true })
    ],
    faults: [
      fault({
        id: 'I_bat_sensor_bias', family: 'sensor_drift', label: '电池电流传感器偏置', shortLabel: '传感器漂移',
        target: 'sensor',
        description: '电池电流测量通道注入阶跃偏置，控制器按错误测量值闭环反馈。',
        params: [{ key: 'magnitude', label: '偏置幅值', unit: 'A', min: 2, max: 30, step: 1, default: 10, precision: 0, help: '正偏置使控制器认为放电电流偏大，真实电流下降' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '真实电流下降并重新平衡，测量功率残差 +0.4×b kW',
        monitorEffect: '真实电流不变，仅测量值跳变',
        causalTemplateId: 'sensor-drift-feedback'
      }),
      /* FL-001 load_step 已按 O-13（CHG-20261030-06）删除——归档：
         FaultLab-evaluation/NEXT/evidence/g2b/load_step-removed-contract-text.md */
      fault({
        id: 'converter_current_limit', family: 'actuator_fault', label: '变流器电流限幅', shortLabel: '执行器异常',
        target: 'converter',
        description: '变换器输出电流上限降为 I_ref 的 magnitude%，控制器指令不变但执行器无法跟随。',
        params: [{ key: 'magnitude', label: '限幅比例', unit: '%', min: 20, max: 85, step: 1, default: 55, precision: 0, help: 'I_cap = I_ref × magnitude%（55% → 13.75 A）' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '真实电流被限幅，发电机补偿剩余需求',
        monitorEffect: '限幅作用在物理执行器上，两种模式均生效',
        causalTemplateId: 'actuator-limit'
      })
    ],
    model: {
      /* 模型身份按批准契约（DATA_CONTRACT_SPEC §1.1/§2.1）：FL-001 = fl001 / fl001.1 */
      model_id: 'fl001',
      model_version: 'fl001.1',
      assumptions: [
        { id: 'A-ideal-bus', text: '直流母线 400 V 理想，无母线动态与压降。' },
        { id: 'A-ideal-gen', text: '发电机视为理想平衡源，瞬时补偿剩余负载功率；初始 20 kW 仅用于展示。' },
        { id: 'A-const-v', text: '电池端电压按 0.4 kV 等效恒压处理：P_kW = 0.4 × I_A。' },
        { id: 'A-soc-linear', text: 'SOC 由功率积分线性折算，不含温度、OCV-SOC 非线性与效率损耗。' },
        { id: 'A-l0', text: '控制器为行为级一阶闭环（τ = 1.5 s），不是经过验证的设备控制器。' },
        { id: 'A-gen-lag', text: '（仅负载阶跃场景生效）发电机按一阶惯性源 τ_gen = 2.0 s 追踪负载需求与电池功率之差。' }
      ],
      limitations: [
        '单一恒定负载、理想母线、无保护动作与故障传播。',
        '不含电池老化、热管理、变换器开关动态与电网交互。',
        'L0 行为级演示模型；非实测、非 Simulink、无实测对比。'
      ],
      equations: [
        { id: 'EQ-1', latex_text: 'I_meas(t) = I_true(t) + b(t)', note: '测量通道偏置叠加' },
        { id: 'EQ-2', latex_text: 'τ·dI_true/dt + I_true = I_ref − b(t), τ = 1.5 s', note: '闭环反馈等效一阶模型' },
        { id: 'EQ-3', latex_text: 'I_true(t) = 15 + 10·e^{−(t−20)/1.5} (t ≥ 20 s)', note: '默认故障后解析解' },
        { id: 'EQ-4', latex_text: 'P_bat = 0.4·I_bat, P_gen = P_load − P_bat', note: '功率换算与理想平衡' },
        { id: 'EQ-5', latex_text: 'SOC(t) = SOC0 − ∫P_bat dt / (40 kWh) × 100%', note: 'SOC 积分定义' },
        { id: 'EQ-6', latex_text: 'r_true = P_gen + P_bat,true − P_load; r_meas = P_gen + P_bat,meas − P_load', note: '真实/测量残差定义' }
      ]
    },
    acceptance: {
      reference: 'MODEL_VALIDATION_SPEC §1.2/§3（解析金标准，未与实测校准）',
      exactness: 'FL-001 默认场景与解析式在 1e-6 容差内一致（求积/舍入规则见 MODEL_VALIDATION_SPEC §3.5/§7）',
      keyValues: {
        E_bat_kWh: 0.1238889, E_gen_kWh: 0.3761111, E_load_kWh: 0.5,
        SOC_true_end_pct: 59.6902778, SOC_est_end_pct: 59.5791667, SOC_err_pp: -0.1111111,
        max_abs_r_meas_kW: 4.0, I_true_26s_A: 15.183156388
      }
    }
  };

  /* ================================================================== */
  /* FC-001 燃料电池发电系统                                             */
  /* ================================================================== */
  var FC001 = {
    id: 'FC-001',
    title: '燃料电池发电系统',
    shortTitle: '燃料电池',
    experimentCode: 'FC-001',
    experimentName: '电堆电流传感器偏置',
    tagline: '在 20 秒注入 +10 A 电堆电流测量偏置，看电堆与电池的功率分配如何偏移。燃料电池 L0 行为演示，不含电化学/效率/健康模型。',
    level: 'L0 · 行为级演示模型',
    summary: '20 kW 燃料电池电堆经 DC/DC 接入 400 V 直流母线，与 10 kW 电池缓冲共同为 30 kW 负载供电；控制器按测量电堆电流闭环调节功率分配。',
    questions: [
      '电堆电流测量偏高时，电堆真实出力与电池缓冲如何变化？',
      '为什么测量功率残差为 +4 kW 而真实功率仍然守恒？',
      'SOC 估计偏差来自测量链还是真实损失的能量？'
    ],
    duration_s: 60,
    dt_s: 0.1,
    topologyViewBox: [0, 0, 1000, 620],
    defaults: {
      feedback_mode: 'closed_loop',
      initial: { load_kW: 30, SOC_pct: 60 },
      noise: { enabled: false, seed: 12345, level: 0 }
    },
    bounds: {
      load_kW: { min: 10, max: 45 },
      SOC_pct: { min: 0, max: 100 }
    },
    components: [
      comp({
        id: 'valve', label: '氢气供给阀', kind: 'valve', role: '燃料供给执行器',
        description: '氢气供给阀；actuator_fault 场景卡涩于 magnitude% 开度，电堆功率受限。',
        x: 40, y: 60, w: 160, h: 88, faultable: true,
        inspector: [
          { id: 'valve_cmd_pct', source: 'CONTROLLER' },
          { id: 'valve_meas_pct', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'fc_stack', label: '燃料电池电堆', kind: 'fuelcell', role: '20 kW 基准 · τ_fc = 1.2 s',
        description: '20 kW 燃料电池电堆（行为级一阶电流响应）；真实功率 P_fc = 0.4 × I_fc。',
        x: 250, y: 60, w: 190, h: 96, faultable: false,
        inspector: [
          { id: 'I_fc_true_A', source: 'MODEL_STATE' },
          { id: 'P_fc_true_kW', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'fc_converter', label: 'DC/DC 变换器', kind: 'converter', role: '电堆侧功率变换',
        description: '燃料电池 DC/DC 变换器；本 L0 模型不建模其动态，仅传递功率。',
        x: 490, y: 60, w: 170, h: 96, faultable: false,
        inspector: [
          { id: 'P_fc_true_kW', source: 'MODEL_STATE' },
          { id: 'P_fc_meas_kW', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'bus', label: '直流母线', kind: 'bus', role: '400 V 理想母线',
        description: '理想 400 V 直流母线，无动态与压降。',
        x: 730, y: 60, w: 160, h: 96, faultable: false,
        inspector: [
          { id: 'V_bus_V', source: 'MODEL_ASSUMPTION' },
          { id: 'r_true_kW', source: 'DERIVED' }
        ]
      }),
      comp({
        id: 'sensor', label: '电堆电流传感器', kind: 'sensor', role: '电堆电流测量 · 故障注入点',
        description: '电堆电流测量通道；sensor_drift 场景注入阶跃偏置。',
        x: 40, y: 250, w: 180, h: 88, faultable: true,
        inspector: [
          { id: 'I_fc_true_A', source: 'MODEL_STATE' },
          { id: 'bias_A', source: 'FAULT_EVENT' },
          { id: 'I_fc_meas_A', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'controller', label: '功率控制器', kind: 'controller', role: '功率分配闭环',
        description: '按测量电堆电流闭环调节电堆出力，电池缓冲承担剩余功率。',
        x: 260, y: 250, w: 210, h: 100, faultable: false,
        inspector: [
          { id: 'I_fc_ref_A', source: 'CONTROLLER' },
          { id: 'I_fc_meas_A', source: 'OBSERVATION' },
          { id: 'P_bat_true_kW', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'battery', label: '电池缓冲', kind: 'battery', role: '40 kWh · 初始 10 kW',
        description: '电池缓冲作为功率平衡源，P_bat = P_load − P_fc；SOC 由电池真实功率积分。',
        x: 520, y: 250, w: 180, h: 96, faultable: false,
        inspector: [
          { id: 'I_bat_true_A', source: 'MODEL_STATE' },
          { id: 'P_bat_true_kW', source: 'MODEL_STATE' },
          { id: 'SOC_true_pct', source: 'MODEL_STATE' },
          { id: 'SOC_est_pct', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'load', label: '负载', kind: 'load', role: '恒定 30 kW',
        description: '恒定功率负载；load_step 场景在故障时刻阶跃 +magnitude kW。',
        x: 740, y: 250, w: 180, h: 96, faultable: true,
        inspector: [
          { id: 'P_load_demand_kW', source: 'CONFIG' },
          { id: 'P_load_served_kW', source: 'MODEL_STATE' }
        ]
      })
    ],
    edges: [
      { id: 'valve->fc_stack', from: 'valve', to: 'fc_stack', kind: 'power', label: '氢气流量' },
      { id: 'fc_stack->fc_converter', from: 'fc_stack', to: 'fc_converter', kind: 'power', label: '电堆功率' },
      { id: 'fc_converter->bus', from: 'fc_converter', to: 'bus', kind: 'power', label: '直流 400 V' },
      { id: 'bus->load', from: 'bus', to: 'load', kind: 'power', label: '30 kW 需求' },
      { id: 'battery->bus', from: 'battery', to: 'bus', kind: 'power', label: '电池缓冲' },
      { id: 'fc_stack->sensor', from: 'fc_stack', to: 'sensor', kind: 'measurement', label: '电堆电流采样' },
      { id: 'sensor->controller', from: 'sensor', to: 'controller', kind: 'measurement', label: 'I_fc,meas' },
      { id: 'controller->valve', from: 'controller', to: 'valve', kind: 'signal', label: '阀门指令' },
      { id: 'load->controller', from: 'load', to: 'controller', kind: 'signal', label: '负载需求' }
    ],
    faultAnchors: { sensor_drift: 'sensor', load_step: 'load', actuator_fault: 'valve' },
    signalCategories: [
      { id: 'current', label: '电流' },
      { id: 'power', label: '功率' },
      { id: 'soc', label: 'SOC' },
      { id: 'residual', label: '残差' },
      { id: 'actuator', label: '执行器' }
    ],
    signals: [
      sig({ id: 'I_fc_true_A', label: '电堆真实电流', shortLabel: 'I_fc,true', unit: 'A', category: 'current', sourceKind: 'MODEL_STATE', definition: '电堆实际输出电流（真值）。', formula: 'τ_fc·dI_fc/dt + I_fc = I_fc_ref − b(t)', precision: 2, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'I_fc_meas_A', label: '电堆测量电流', shortLabel: 'I_fc,meas', unit: 'A', category: 'current', sourceKind: 'OBSERVATION', definition: '电堆电流传感器输出 = 真实电流 + 故障偏置。', formula: 'I_fc,meas = I_fc + b(t)', precision: 2, chart: { style: 'dashed', colorToken: 'obs', axis: 'left', step: true }, blindVisible: true, noiseSigma: 0.35 }),
      sig({ id: 'I_fc_ref_A', label: '电堆电流目标', shortLabel: 'I_fc,ref', unit: 'A', category: 'current', sourceKind: 'CONTROLLER', definition: '控制器下发的电堆电流参考，默认 50 A（=20 kW / 0.4 kV）。', formula: 'I_fc_ref = 50 A', precision: 2, chart: { style: 'dashdot', colorToken: 'warm', axis: 'left' }, blindVisible: true }),
      sig({ id: 'bias_A', label: '电堆电流偏置', shortLabel: 'b(t)', unit: 'A', category: 'current', sourceKind: 'FAULT_EVENT', definition: '故障注入的测量偏置，阶跃信号。', formula: 'b(t)=0 (t<20 s), b(t)=+10 A (t≥20 s)', precision: 2, chart: { style: 'dashed', colorToken: 'fault', axis: 'right', step: true } }),
      sig({ id: 'I_fc_cap_A', label: '电堆电流上限', shortLabel: 'I_fc,cap', unit: 'A', category: 'actuator', sourceKind: 'FAULT_EVENT', definition: '阀门卡涩场景下的电堆电流上限；其他场景不可用（null）。', formula: 'I_fc,cap = I_fc_ref × magnitude%', precision: 2, chart: { style: 'dashed', colorToken: 'fault', axis: 'left', step: true } }),
      sig({ id: 'P_fc_true_kW', label: '电堆真实功率', shortLabel: 'P_fc,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '电堆真实输出功率。', formula: 'P_fc,true = 0.4 × I_fc', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_fc_meas_kW', label: '电堆测量功率', shortLabel: 'P_fc,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '由测量电流换算的电堆功率。', formula: 'P_fc,meas = 0.4 × I_fc,meas', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left', step: true }, blindVisible: true }),
      sig({ id: 'I_bat_true_A', label: '电池真实电流', shortLabel: 'I_bat,true', unit: 'A', category: 'current', sourceKind: 'MODEL_STATE', definition: '电池缓冲实际电流，放电为正。', formula: 'I_bat,true = (P_load − P_fc) / 0.4', precision: 2, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'I_bat_meas_A', label: '电池测量电流', shortLabel: 'I_bat,meas', unit: 'A', category: 'current', sourceKind: 'OBSERVATION', definition: '电池电流测量（健康通道）。', formula: 'I_bat,meas = I_bat,true', precision: 2, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true, noiseSigma: 0.3 }),
      sig({ id: 'P_bat_true_kW', label: '电池真实功率', shortLabel: 'P_bat,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '电池缓冲真实功率（放电为正）。', formula: 'P_bat,true = P_load − P_fc,true', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_bat_meas_kW', label: '电池测量功率', shortLabel: 'P_bat,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '由电池电流测量换算的功率（电池传感器健康，故 ≈ 真值）。', formula: 'P_bat,meas = 0.4 × I_bat,meas', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true }),
      sig({ id: 'P_bat_est_kW', label: '电池功率 EMS 平衡估算', shortLabel: 'P_bat,est', unit: 'kW', category: 'power', sourceKind: 'DERIVED', definition: '功率管理器按测量电堆功率平衡估算的电池功率：P_bat,est = P_load − P_fc,meas。注意：这是 EMS 级平衡估算，不是电池电流库仑积分；故障期间估算放电偏少。', formula: 'P_bat,est = P_load − P_fc,meas', precision: 3, chart: { style: 'dotted', colorToken: 'obs', axis: 'left' }, blindVisible: true }),
      sig({ id: 'P_load_demand_kW', label: '负载需求功率', shortLabel: 'P_load', unit: 'kW', category: 'power', sourceKind: 'CONFIG', definition: '负载需求功率；load_step 场景在故障时刻阶跃。', formula: 'P_load = 30 kW（load_step: +magnitude）', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left', step: true }, blindVisible: true }),
      sig({ id: 'P_load_served_kW', label: '负载实际获得功率', shortLabel: 'P_served', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '负载实际获得的功率。', formula: 'P_load,served = P_load,demand', precision: 2, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'V_bus_V', label: '直流母线电压', shortLabel: 'V_bus', unit: 'V', category: 'power', sourceKind: 'MODEL_ASSUMPTION', definition: '理想母线电压，恒为 400 V（模型假设）。', formula: 'V_bus = 400 V', precision: 0, chart: { style: 'solid', colorToken: 'ink', axis: 'left', defaultVisible: false }, blindVisible: true, tableOnly: true }),
      sig({ id: 'SOC_true_pct', label: '电池真实 SOC', shortLabel: 'SOC_true', unit: '%', category: 'soc', sourceKind: 'MODEL_STATE', definition: '电池缓冲的真实荷电状态。', formula: 'SOC_true = SOC0 − ∫P_bat,true dt / 40 kWh × 100%', precision: 5, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'SOC_est_pct', label: '电池估计 SOC', shortLabel: 'SOC_est', unit: '%', category: 'soc', sourceKind: 'OBSERVATION', definition: 'EMS 级平衡估算的 SOC：积分 P_bat,est = P_load − P_fc,meas（模型假设 A-fc-soc-est），不是电池电流库仑积分。', formula: 'SOC_est = SOC0 − ∫P_bat,est dt / 40 kWh × 100%', precision: 5, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true }),
      sig({ id: 'r_true_kW', label: '真实功率平衡残差', shortLabel: 'r_true', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '真实功率守恒残差，理想模型下恒为 0。', formula: 'r_true = P_fc,true + P_bat,true − P_load', precision: 6, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'r_meas_kW', label: '测量一致性残差', shortLabel: 'r_meas', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '由测量构造的功率平衡残差；故障期间 ≈ +4 kW，是测量偏差，不是能量损失。', formula: 'r_meas = P_fc,meas + P_bat,meas − P_load', precision: 2, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true }),
      sig({ id: 'valve_cmd_pct', label: '阀门指令开度', shortLabel: 'valve_cmd', unit: '%', category: 'actuator', sourceKind: 'CONTROLLER', definition: '控制器下发的氢气阀开度指令；健康场景保持 100%。', formula: 'valve_cmd = 100%', precision: 0, chart: { style: 'dashdot', colorToken: 'warm', axis: 'right' }, blindVisible: true }),
      sig({ id: 'valve_meas_pct', label: '阀门实际开度', shortLabel: 'valve_meas', unit: '%', category: 'actuator', sourceKind: 'OBSERVATION', definition: '氢气阀实际开度测量；卡涩场景为 magnitude%。', formula: 'valve_meas = 100%（卡涩：magnitude%）', precision: 0, chart: { style: 'dashed', colorToken: 'obs', axis: 'right', step: true }, blindVisible: true })
    ],
    faults: [
      fault({
        id: 'I_fc_sensor_bias', family: 'sensor_drift', label: '电堆电流传感器偏置', shortLabel: '传感器漂移',
        target: 'sensor',
        description: '电堆电流测量通道注入阶跃偏置，控制器按错误测量反馈，电堆真实出力下降、电池补足缺口。',
        params: [{ key: 'magnitude', label: '偏置幅值', unit: 'A', min: 2, max: 30, step: 1, default: 10, precision: 0, help: '正偏置使控制器认为电堆发电偏多' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '电堆真实电流由 50 A 降向 40 A，电池缓冲由 10 kW 升至 14 kW',
        monitorEffect: '电堆真实电流不变，仅测量值与 SOC 估计偏移',
        causalTemplateId: 'fc-sensor-drift'
      }),
      fault({
        id: 'load_step_10kW', family: 'load_step', label: '负载功率阶跃', shortLabel: '负载冲击',
        target: 'load',
        description: '负载需求阶跃 +magnitude kW；功率分配器一阶爬坡抬升电堆参考电流，电池承担瞬态。',
        params: [{ key: 'magnitude', label: '阶跃幅值', unit: 'kW', min: 5, max: 20, step: 1, default: 10, precision: 0, help: '负载需求 30 kW → 30+magnitude kW' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '电堆出力一阶爬升，电池先补瞬态后回到 10 kW',
        monitorEffect: '物理输入，与控制模式无关，两种模式均生效',
        causalTemplateId: 'fc-load-step'
      }),
      fault({
        id: 'valve_stuck', family: 'actuator_fault', label: '氢气阀卡涩', shortLabel: '执行器异常',
        target: 'valve',
        description: '氢气供给阀卡涩于 magnitude% 开度，电堆电流上限降为 50 A × magnitude%，电池补足剩余需求。',
        params: [{ key: 'magnitude', label: '卡涩开度', unit: '%', min: 20, max: 85, step: 1, default: 55, precision: 0, help: 'I_fc,cap = 50 A × magnitude%（55% → 27.5 A）' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '电堆出力受限、电池长期补足，指令与实际阀位背离',
        monitorEffect: '卡涩是物理执行器故障，两种模式均生效',
        causalTemplateId: 'fc-valve-stuck'
      })
    ],
    model: {
      model_id: 'fc.pem.l0',
      model_version: '1.0.0',
      assumptions: [
        { id: 'A-ideal-bus', text: '直流母线 400 V 理想，无母线动态与压降。' },
        { id: 'A-const-v', text: '电堆与电池均按 0.4 kV 等效恒压处理：P_kW = 0.4 × I_A。' },
        { id: 'A-ideal-balance', text: '电池缓冲为理想平衡源：P_bat = P_load − P_fc，无功率爬坡限制。' },
        { id: 'A-soc-linear', text: 'SOC 由电池功率积分线性折算，不含温度、OCV-SOC 非线性与效率损耗。' },
        { id: 'A-valve-linear', text: '阀开度与电堆电流按线性映射处理；阀卡涩场景实现为电堆电流上限比例（I_fc,cap = I_fc_ref × magnitude%），不含阀门机械动态。' },
        { id: 'A-ideal-limiter', text: '电池缓冲与 DC/DC 变换器的限幅为理想上限建模，无恢复动态、无保护动作。' },
        { id: 'A-fc-soc-est', text: '电池 SOC 估计由功率管理器按 P_load − P_fc,meas 平衡估算（EMS 级），非电池电流库仑积分；测量偏差会进入 SOC 估计。' },
        { id: 'A-fc-first-order', text: '电堆电流按一阶响应（τ_fc = 1.2 s）跟随目标，不含热管理、水管理与气体传输动态。' },
        { id: 'A-l0', text: '功率控制器为行为级闭环，不是经过验证的设备控制器。' }
      ],
      limitations: [
        '不含电堆热管理、水管理、气体扩散与寿命衰减。',
        '不含 DC/DC 开关动态与效率曲线；电池缓冲视为理想源。',
        'L0 行为级演示模型；非实测、非 Simulink、无实测对比。'
      ],
      equations: [
        { id: 'EQ-1', latex_text: 'I_fc,meas = I_fc + b(t)', note: '测量通道偏置叠加' },
        { id: 'EQ-2', latex_text: 'τ_fc·dI_fc/dt + I_fc = I_fc_ref − b(t), τ_fc = 1.2 s', note: '电堆电流闭环一阶模型' },
        { id: 'EQ-3', latex_text: 'P_fc = 0.4·I_fc, P_bat = P_load − P_fc,true', note: '功率换算与电池平衡' },
        { id: 'EQ-4', latex_text: 'r_true = P_fc,true + P_bat − P_load; r_meas = P_fc,meas + P_bat,meas − P_load', note: '真实/测量残差定义' },
        { id: 'EQ-5', latex_text: 'SOC_true = SOC0 − ∫P_bat,true dt / (40 kWh) × 100%', note: 'SOC 积分定义' }
      ]
    },
    acceptance: {
      reference: '契约 §5.2',
      exactness: 'FC-001 为验收范围（非逐位）；真实守恒、无 NaN',
      keyValues: {
        I_fc_true_start_A: 50, I_fc_true_end_A: 40, P_fc_true_kW: [20, 16], P_bat_true_kW: [10, 14],
        E_load_kWh: 0.5, E_fc_plus_E_bat_kWh: 0.5, r_meas_peak_kW: 4.0,
        SOC_true_end_pct: 59.4755556, SOC_est_end_pct: 59.5866667, SOC_err_pp: 0.1111111
      }
    }
  };

  /* ================================================================== */
  /* GT-001 燃气涡轮发电系统                                             */
  /* ================================================================== */
  var GT001 = {
    id: 'GT-001',
    title: '燃气涡轮发电系统',
    shortTitle: '燃气涡轮',
    experimentCode: 'GT-001',
    experimentName: '转速传感器偏置',
    tagline: '在 20 秒注入 +0.3 Hz 转速测量偏置，看调速器积分如何把真实频率拉到 49.7 Hz。单机等效频率响应示意（L0b），非机组/电网动态验证。',
    level: 'L0 · 行为级演示模型',
    summary: '燃气涡轮驱动同步发电机（25 kW 基准）接入 400 V 等效母线，电池缓冲提供一次调频；调速器按转速测量积分调节燃料阀，负载 30 kW。',
    questions: [
      '转速测量偏高时，调速器为什么会让真实频率偏低？',
      '频率偏差下电池一次调频与发电机出力如何重分配？',
      '频率下降是测量造成的还是真实功率缺口？'
    ],
    duration_s: 60,
    dt_s: 0.1,
    topologyViewBox: [0, 0, 1000, 620],
    defaults: {
      feedback_mode: 'closed_loop',
      initial: { load_kW: 30, SOC_pct: 60 },
      noise: { enabled: false, seed: 12345, level: 0 }
    },
    bounds: {
      load_kW: { min: 10, max: 45 },
      SOC_pct: { min: 0, max: 100 }
    },
    components: [
      comp({
        id: 'valve', label: '燃料阀', kind: 'valve', role: '燃料供给执行器',
        description: '燃料阀开度由调速器指令驱动；actuator_fault 场景卡涩于 magnitude%。',
        x: 40, y: 60, w: 160, h: 88, faultable: true,
        inspector: [
          { id: 'valve_cmd_pct', source: 'CONTROLLER' },
          { id: 'valve_meas_pct', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'turbine', label: '燃气涡轮', kind: 'turbine', role: '燃料→机械功率',
        description: '燃气涡轮降阶模型：功率由燃料阀指令经一阶惯性（τ_g = 2.0 s）决定。',
        x: 250, y: 60, w: 180, h: 96, faultable: false,
        inspector: [
          { id: 'P_gen_cmd_kW', source: 'CONTROLLER' },
          { id: 'P_gen_true_kW', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'generator', label: '同步发电机', kind: 'generator', role: '25 kW 基准 · K_J = 5 kW·s/Hz',
        description: '同步发电机与转子等效惯量；频率状态 f 由功率不平衡驱动：df/dt = (P_gen + P_bat − P_load)/K_J。',
        x: 480, y: 60, w: 190, h: 96, faultable: false,
        inspector: [
          { id: 'P_gen_true_kW', source: 'MODEL_STATE' },
          { id: 'f_true_Hz', source: 'MODEL_STATE' },
          { id: 'P_rotor_kW', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'bus', label: '母线（AC 整流等效）', kind: 'bus', role: '400 V 等效母线',
        description: 'AC 整流后的等效 400 V 母线，理想无动态。',
        x: 730, y: 60, w: 160, h: 96, faultable: false,
        inspector: [
          { id: 'V_bus_V', source: 'MODEL_ASSUMPTION' },
          { id: 'r_true_kW', source: 'DERIVED' },
          { id: 'f_channel_diff_Hz', source: 'DERIVED' }
        ]
      }),
      comp({
        id: 'speed_sensor', label: '转速传感器', kind: 'sensor', role: '转速测量 · 故障注入点',
        description: '故障转速传感器输出 n_meas = 60 × (f + b)；sensor_drift 场景注入 +0.3 Hz 等效偏置（+18 rpm）。健康电气频率量测 f_meas 仍等于真实频率，二者不一致即冗余检出依据。',
        x: 40, y: 250, w: 180, h: 88, faultable: true,
        inspector: [
          { id: 'f_true_Hz', source: 'MODEL_STATE' },
          { id: 'f_meas_Hz', source: 'OBSERVATION' },
          { id: 'n_meas_rpm', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'governor', label: '调速器', kind: 'governor', role: '积分调速 · Ki = 2.0 kW/(Hz·s)',
        description: '按故障转速传感器通道 n_meas/60 积分调整发电机功率指令：dP_gen_cmd/dt = Ki × (50 − n_meas/60)，钳位 [0, 40] kW。',
        x: 260, y: 250, w: 190, h: 100, faultable: false,
        inspector: [
          { id: 'P_gen_cmd_kW', source: 'CONTROLLER' },
          { id: 'n_meas_rpm', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'battery', label: '电池缓冲', kind: 'battery', role: '40 kWh · 一次调频 K_bat = 24 kW/Hz',
        description: '电池一次调频：P_bat = P_bat_ref − K_bat × (f_meas − 50)，P_bat_ref = 5 kW；SOC 由电池真实功率积分。',
        x: 500, y: 250, w: 180, h: 96, faultable: false,
        inspector: [
          { id: 'P_bat_true_kW', source: 'MODEL_STATE' },
          { id: 'P_bat_meas_kW', source: 'OBSERVATION' },
          { id: 'SOC_true_pct', source: 'MODEL_STATE' },
          { id: 'SOC_est_pct', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'load', label: '负载', kind: 'load', role: '恒定 30 kW',
        description: '恒定功率负载；load_step 场景在故障时刻阶跃 +magnitude kW。',
        x: 730, y: 250, w: 180, h: 96, faultable: true,
        inspector: [
          { id: 'P_load_demand_kW', source: 'CONFIG' },
          { id: 'P_load_served_kW', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'controller', label: '功率管理器', kind: 'controller', role: '功率分配与监测',
        description: '协调电池一次调频参考与发电机目标；本模型不额外引入控制动态。',
        x: 420, y: 430, w: 220, h: 110, faultable: false,
        inspector: [
          { id: 'P_bat_true_kW', source: 'MODEL_STATE' },
          { id: 'P_gen_cmd_kW', source: 'CONTROLLER' },
          { id: 'P_load_demand_kW', source: 'CONFIG' }
        ]
      })
    ],
    edges: [
      { id: 'valve->turbine', from: 'valve', to: 'turbine', kind: 'power', label: '燃料流量' },
      { id: 'turbine->generator', from: 'turbine', to: 'generator', kind: 'power', label: '机械功率' },
      { id: 'generator->bus', from: 'generator', to: 'bus', kind: 'power', label: '发电功率' },
      { id: 'bus->load', from: 'bus', to: 'load', kind: 'power', label: '30 kW 需求' },
      { id: 'battery->bus', from: 'battery', to: 'bus', kind: 'power', label: '一次调频支撑' },
      { id: 'generator->speed_sensor', from: 'generator', to: 'speed_sensor', kind: 'measurement', label: '转速采样' },
      { id: 'speed_sensor->governor', from: 'speed_sensor', to: 'governor', kind: 'measurement', label: 'n_meas' },
      { id: 'governor->valve', from: 'governor', to: 'valve', kind: 'signal', label: '阀门指令' },
      { id: 'battery->governor', from: 'battery', to: 'governor', kind: 'signal', label: '一次调频' },
      { id: 'load->controller', from: 'load', to: 'controller', kind: 'signal', label: '负载需求' }
    ],
    faultAnchors: { sensor_drift: 'speed_sensor', load_step: 'load', actuator_fault: 'valve' },
    signalCategories: [
      { id: 'frequency', label: '频率' },
      { id: 'power', label: '功率' },
      { id: 'soc', label: 'SOC' },
      { id: 'residual', label: '残差' },
      { id: 'actuator', label: '执行器' }
    ],
    signals: [
      sig({ id: 'f_true_Hz', label: '真实频率', shortLabel: 'f_true', unit: 'Hz', category: 'frequency', sourceKind: 'MODEL_STATE', definition: '同步发电机真实电频率（转子惯量状态）。', formula: 'df/dt = (P_gen + P_bat − P_load) / K_J, K_J = 5 kW·s/Hz', precision: 4, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'f_meas_Hz', label: '电气频率量测', shortLabel: 'f_meas', unit: 'Hz', category: 'frequency', sourceKind: 'OBSERVATION', definition: '同步发电机电气频率量测（健康通道，= 真实频率），供 Agent 与转速通道做冗余交叉校验。', formula: 'f_meas = f_true', precision: 4, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true, noiseSigma: 0.01 }),
      sig({ id: 'n_meas_rpm', label: '转速传感器读数', shortLabel: 'n_meas', unit: 'rpm', category: 'frequency', sourceKind: 'OBSERVATION', definition: '故障转速传感器输出（同步机 2 极等价）：n_meas = 60 × (f_true + b(t))；调速器使用 n_meas/60 作为反馈频率。', formula: 'n_meas = 60 × (f_true + b(t))', precision: 1, chart: { style: 'dashed', colorToken: 'obs', axis: 'right', step: true }, blindVisible: true, noiseSigma: 0.6 }),
      sig({ id: 'P_gen_true_kW', label: '发电机真实功率', shortLabel: 'P_gen,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '发电机真实出力，一阶跟随调速器指令。', formula: 'τ_g·dP_gen/dt + P_gen = P_gen_cmd, τ_g = 2.0 s', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_gen_meas_kW', label: '发电机测量功率', shortLabel: 'P_gen,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '发电机功率测量（健康通道）。', formula: 'P_gen,meas = P_gen,true', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true, noiseSigma: 0.15 }),
      sig({ id: 'P_gen_cmd_kW', label: '调速器功率指令', shortLabel: 'P_gen,cmd', unit: 'kW', category: 'power', sourceKind: 'CONTROLLER', definition: '调速器积分输出的功率指令，钳位 [0, 40] kW。', formula: 'dP_gen,cmd/dt = Ki × (50 − f_meas), Ki = 2.0 kW/(Hz·s)', precision: 3, chart: { style: 'dashdot', colorToken: 'warm', axis: 'left' }, blindVisible: true }),
      sig({ id: 'P_bat_true_kW', label: '电池真实功率', shortLabel: 'P_bat,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '电池一次调频真实功率（放电为正）。', formula: 'P_bat = 5 − 24 × (f_meas − 50) kW', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_bat_meas_kW', label: '电池测量功率', shortLabel: 'P_bat,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '电池功率测量（健康通道）。', formula: 'P_bat,meas = P_bat,true', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true, noiseSigma: 0.15 }),
      sig({ id: 'P_load_demand_kW', label: '负载需求功率', shortLabel: 'P_load', unit: 'kW', category: 'power', sourceKind: 'CONFIG', definition: '负载需求功率；load_step 场景在故障时刻阶跃。', formula: 'P_load = 30 kW（load_step: +magnitude）', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left', step: true }, blindVisible: true }),
      sig({ id: 'P_load_served_kW', label: '负载实际获得功率', shortLabel: 'P_served', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '负载实际获得的功率。', formula: 'P_load,served = P_load,demand', precision: 2, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_rotor_kW', label: '转子惯量功率', shortLabel: 'P_rotor', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '转子释放/吸收的惯量功率 = K_J × df/dt；真实守恒含该项。', formula: 'P_rotor = P_gen + P_bat − P_load = K_J × df/dt', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'V_bus_V', label: '母线等效电压', shortLabel: 'V_bus', unit: 'V', category: 'power', sourceKind: 'MODEL_ASSUMPTION', definition: 'AC 整流后等效母线电压，恒为 400 V（模型假设）。', formula: 'V_bus = 400 V', precision: 0, chart: { style: 'solid', colorToken: 'ink', axis: 'left', defaultVisible: false }, blindVisible: true, tableOnly: true }),
      sig({ id: 'SOC_true_pct', label: '电池真实 SOC', shortLabel: 'SOC_true', unit: '%', category: 'soc', sourceKind: 'MODEL_STATE', definition: '电池缓冲真实荷电状态。', formula: 'SOC_true = SOC0 − ∫P_bat,true dt / 40 kWh × 100%', precision: 5, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'SOC_est_pct', label: '电池估计 SOC', shortLabel: 'SOC_est', unit: '%', category: 'soc', sourceKind: 'OBSERVATION', definition: '由电池功率测量积分得到的 SOC 估计。', formula: 'SOC_est = SOC0 − ∫P_bat,meas dt / 40 kWh × 100%', precision: 5, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true }),
      sig({ id: 'r_true_kW', label: '真实功率平衡残差（含转子项）', shortLabel: 'r_true', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '含转子惯量项的真实守恒残差，是定义恒等式（代数一致性，不是物理验证），理想模型下恒为 0。', formula: 'r_true = P_gen + P_bat − P_load − P_rotor', precision: 6, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'f_channel_diff_Hz', label: '转速−电气频率通道不一致', shortLabel: 'f_diff', unit: 'Hz', category: 'frequency', sourceKind: 'DERIVED', exposure: 'blind_observable', definition: '转速与电气两个测量通道的频率冗余不一致（n_meas/60 − f_meas）；健康时恒为 0，转速偏置期间等于偏置量。这是测量通道偏差的直接体现，不是能量损失。', formula: 'f_channel_diff = n_meas/60 − f_meas', precision: 4, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' } }),
      sig({ id: 'valve_cmd_pct', label: '燃料阀指令开度', shortLabel: 'valve_cmd', unit: '%', category: 'actuator', sourceKind: 'CONTROLLER', definition: '由调速器功率指令换算的燃料阀指令；卡涩场景持续上升。', formula: 'valve_cmd = clamp(P_gen_cmd / 40 × 100%, 0, 100)', precision: 1, chart: { style: 'dashdot', colorToken: 'warm', axis: 'right' }, blindVisible: true }),
      sig({ id: 'valve_meas_pct', label: '燃料阀实际开度', shortLabel: 'valve_meas', unit: '%', category: 'actuator', sourceKind: 'OBSERVATION', definition: '燃料阀实际开度测量；卡涩场景为 magnitude%。', formula: 'valve_meas = valve_cmd（卡涩：magnitude%）', precision: 1, chart: { style: 'dashed', colorToken: 'obs', axis: 'right', step: true }, blindVisible: true }),
      sig({ id: 'P_gen_cap_kW', label: '发电机功率上限', shortLabel: 'P_gen,cap', unit: 'kW', category: 'actuator', sourceKind: 'FAULT_EVENT', definition: '燃料阀卡涩场景下的发电机功率上限；其他场景不可用（null）。', formula: 'P_gen,cap = 40 × magnitude%', precision: 2, chart: { style: 'dashed', colorToken: 'fault', axis: 'left', step: true } })
    ],
    faults: [
      fault({
        id: 'speed_sensor_bias', family: 'sensor_drift', label: '转速传感器偏置', shortLabel: '传感器漂移',
        target: 'speed_sensor',
        description: '转速测量通道注入等效频率偏置，调速器与电池一次调频按错误频率动作，真实频率稳态偏移。',
        params: [{ key: 'magnitude', label: '频率偏置', unit: 'Hz', min: 0.05, max: 1.0, step: 0.05, default: 0.3, precision: 2, help: '偏置 b(t)=+0.3 Hz 时真实频率稳态约 49.7 Hz' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '真实频率稳态下降约 magnitude，调速器把测量频率拉回 50 Hz',
        monitorEffect: '真实频率不变，仅测量频率与转速显示偏移',
        causalTemplateId: 'gt-sensor-drift'
      }),
      fault({
        id: 'load_step_10kW', family: 'load_step', label: '负载功率阶跃', shortLabel: '负载冲击',
        target: 'load',
        description: '负载需求阶跃 +magnitude kW；转子释放动能导致频率下降，电池一次调频支撑、调速器积分恢复。',
        params: [{ key: 'magnitude', label: '阶跃幅值', unit: 'kW', min: 5, max: 20, step: 1, default: 10, precision: 0, help: '负载需求 30 kW → 30+magnitude kW' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '频率出现最低点后由电池与调速器共同恢复',
        monitorEffect: '物理输入，与控制模式无关，两种模式均生效',
        causalTemplateId: 'gt-load-step'
      }),
      fault({
        id: 'fuel_valve_stuck', family: 'actuator_fault', label: '燃料阀卡涩', shortLabel: '执行器异常',
        target: 'valve',
        description: '燃料阀卡涩于 magnitude% 开度，发电机功率被钳位，频率持续偏低，电池长期支撑。',
        params: [{ key: 'magnitude', label: '卡涩开度', unit: '%', min: 20, max: 85, step: 1, default: 50, precision: 0, help: 'P_gen,cap = 40 kW × magnitude%（50% → 20 kW）' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '发电机出力钳位、频率持续偏低、电池长期支撑',
        monitorEffect: '卡涩是物理执行器故障，两种模式均生效',
        causalTemplateId: 'gt-valve-stuck'
      })
    ],
    model: {
      model_id: 'gt.sync.l0',
      model_version: '1.0.0',
      assumptions: [
        { id: 'A-ideal-bus', text: 'AC 整流后母线按 400 V 等效理想处理，无母线动态。' },
        { id: 'A-lumped-inertia', text: '转子等效惯量集中参数 K_J = 5.0 kW·s/Hz：df/dt = (P_gen + P_bat − P_load)/K_J。' },
        { id: 'A-droop', text: '电池一次调频为线性下垂：P_bat = 5 − 24 × (f_meas − 50) kW，使用健康电气频率量测 f_meas；无死区、无延迟。' },
        { id: 'A-gov-integral', text: '调速器为积分控制：dP_gen_cmd/dt = 2.0 × (50 − f_gov)，f_gov = n_meas/60 来自故障转速传感器通道；指令钳位 [0, 40] kW。' },
        { id: 'A-freq-redundant', text: '转速传感器通道与电气频率量测 f_meas 互为冗余：二者不一致（n_meas/60 − f_meas = b）是传感器故障的可检出特征。' },
        { id: 'A-gen-lag', text: '发电机功率按一阶惯性（τ_g = 2.0 s）跟随指令。' },
        { id: 'A-soc-linear', text: 'SOC 由电池功率积分线性折算，不含温度、效率与老化。' },
        { id: 'A-l0', text: '降阶行为级模型，不含电网暂态、励磁与保护动作。' },
        { id: 'A-gt-inertia-lin', text: '摇摆方程为 f≈f₀ 线性化（有效性边界 |Δf| ≤ 1 Hz；参数域极端 mag=1.0 Hz 时 Δf=−0.982 Hz 贴边）；线性化能量 E_lin = K_J·Δf 与二次型动能 E_kin(f) = 125·(f/50)² kW·s 之差为截断残差 K_J·Δf²/(2f₀)。' },
        { id: 'A-gt-bat-rating', text: '电池连续额定 ±5 kW、短时额定 ±15 kW（变流器 3× 过载，假设非实测）、物理包络 ±25 kW；工作点超 ±15 kW 时依赖短时过载能力，长时运行须降额。' },
        { id: 'A-gt-antiwindup-clamp', text: '调速器积分钳位 [0, 40] kW 为钳位式抗饱和；故障期间指令 wound-up 至上限，清除后若指令不回置，P_gen 将过冲并引起频率上摆（见局限）。' }
      ],
      limitations: [
        '单机无穷大母线等效，无电网潮流与多机交互。',
        '不含燃烧、透平热力学、励磁调压（AVR）、功率角稳定性、保护动作（低频减载/过频过流）、负荷频率特性（负荷自调节 D）、多机惯量分散与网损、AC/DC 整流动态、调速器死区与非线性阀特性。',
        '执行器死区：actuator magnitude ≥62.5% 时 P_gen_cap ≥ 平衡点 25 kW，钳位不生效、故障不可观（或收紧参数域上限至 ~60%）。',
        '本模型为单机等效频率响应的一阶/一阶跟随降阶示意（L0b），非机组/电网动态验证。',
        'L0 行为级演示模型；非实测、非 Simulink、无实测对比。'
      ],
      equations: [
        { id: 'EQ-1', latex_text: 'df/dt = (P_gen + P_bat − P_load) / K_J, K_J = 5.0 kW·s/Hz', note: '转子等效惯量方程' },
        { id: 'EQ-2', latex_text: 'P_bat = P_bat,ref − K_bat·(f_meas − 50), K_bat = 24 kW/Hz', note: '电池一次调频' },
        { id: 'EQ-3', latex_text: 'dP_gen,cmd/dt = Ki·(50 − f_meas), Ki = 2.0 kW/(Hz·s)', note: '调速器积分（含抗积分饱和钳位）' },
        { id: 'EQ-4', latex_text: 'τ_g·dP_gen/dt + P_gen = P_gen,cmd, τ_g = 2.0 s', note: '发电机一阶跟随' },
        { id: 'EQ-5', latex_text: 'f_meas = f (健康电气量测); n_meas = 60·(f + b(t)); f_gov = n_meas/60', note: '双通道频率测量与偏置' },
        { id: 'EQ-6', latex_text: 'P_rotor = K_J·df/dt = P_gen + P_bat − P_load', note: '转子惯量功率（守恒含该项）' }
      ]
    },
    acceptance: {
      reference: '契约 §5.3',
      exactness: 'GT-001 为验收范围（非逐位）；守恒含转子项 ≤1e-3 kW',
      keyValues: {
        f_true_sensor_drift_Hz: 49.7, f_meas_sensor_drift_Hz: 49.7, n_meas_sensor_drift_rpm: 3000,
        P_gen_sensor_drift_kW: 17.8, P_bat_sensor_drift_kW: 12.2,
        f_nadir_load_step_Hz: [-0.6, -0.3], P_gen_load_step_kW: 35, P_bat_steady_kW: 5,
        P_gen_actuator_kW: 20, f_true_actuator_Hz: [49.6, 49.9], P_bat_actuator_kW: 10
      }
    }
  };

  /* ================================================================== */
  /* 因果模板（engine 用数值证据填充；页面只渲染 run.causal）              */
  /* layer: config = 配置事实 / mechanism = 模型机制 / observation = 数值观测 */
  /* 占位符：{t0} {mag} {unit} {sign} + engine 计算的观测事实               */
  /* ================================================================== */
  FL001.causalTemplates = {
    sensor_drift: {
      id: 'sensor-drift-feedback',
      headline: 't={t0} s，{faultLabel}：{sign}{mag} {unit} 注入测量通道',
      /* G0-DEC-13 / UI_COPY_GUARDRAILS §3.3：r_meas 不是发电机补偿的结果，
         它是测量通道误差的功率当量（代数恒等），与 τ、反馈模式无关。 */
      mechanismSummary: '偏置污染测量通道 → 控制器按错误电流反馈 → 真实电池电流下降 → 理想发电机补偿。测量残差 +{r_meas_peak} kW 是测量通道误差的功率当量（代数恒等），不是能量损失，也不是发电机补偿的结果。',
      nodes: [
        {
          id: 'n1', order: 1, title: '偏置注入', short: '传感器偏置 {sign}{mag} {unit}',
          layer: 'config', componentId: 'sensor', signalIds: ['bias_A'],
          detail: '因为 {t0} s 在{targetComponent}的测量通道注入了 {sign}{mag} {unit} 阶跃偏置（{t0} s 前为 0），所以测量电流的生成规则变为 I_meas = I_true + b(t)。这是配置定义的故障事实，不是测量噪声，也不是模型推断。',
          evidence: [{ varId: 'bias_A', tStartOffset: -0.1, tEndOffset: 0.1, note: '事件前 b(t)=0，{t0} s 起 b(t)={sign}{mag} {unit}' }]
        },
        {
          id: 'n2', order: 2, title: '测量电流偏高', short: 'I_meas {I_meas_pre} → {I_meas_post} A',
          layer: 'observation', componentId: 'sensor', signalIds: ['I_bat_meas_A', 'I_bat_true_A'],
          detail: '因为偏置直接叠加在测量通道上，所以测量电流在 {t0} s 由 {I_meas_pre} A 跳到 {I_meas_post} A；此时真实电流仍为 {I_true_post} A。26 s 时测量电流为 {I_meas_26} A（= 真实 {I_true_26} A + {mag} A）。',
          evidence: [{ varId: 'I_bat_meas_A', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {I_meas_pre} A → 20.0 s {I_meas_post} A' }]
        },
        {
          id: 'n3', order: 3, title: '控制器误认为放电偏大', short: '等效目标 I_ref − b：{I_ref} → {I_target} A',
          layer: 'mechanism', componentId: 'controller', signalIds: ['I_ref_A', 'I_bat_meas_A'],
          detail: '因为模型规定控制器按测量电流闭环反馈（τ·dI_true/dt + I_true = I_ref − b(t)，τ = 1.5 s），而测量电流被抬高 {mag} {unit}，所以控制器等效认为电池放电偏大，真实电流的目标值从 I_ref = {I_ref} A 降为 {I_target} A。控制器本身并不知道传感器存在偏置。',
          evidence: [{ varId: 'I_ref_A', tStartOffset: 0.0, tEndOffset: 40.0, note: 'I_ref 指令保持 {I_ref} A 不变，被污染的只是反馈通道' }]
        },
        {
          id: 'n4', order: 4, title: '真实电池放电下降', short: 'I_true 25 → {I_true_60} A',
          layer: 'observation', componentId: 'battery', signalIds: ['I_bat_true_A', 'P_bat_true_kW'],
          detail: '因为真实一阶环节按 τ = 1.5 s 向新目标 {I_target} A 衰减，所以真实电池电流从 25 A 下降到 {I_true_60} A（26 s 为 {I_true_26} A），真实电池功率由 {P_bat_20} kW 降到 {P_bat_60} kW。',
          evidence: [{ varId: 'I_bat_true_A', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障时刻后真实电流单调下降：20.0 s 25.00 A → 60.0 s {I_true_60} A' }]
        },
        {
          id: 'n5', order: 5, title: '发电机补偿', short: 'P_gen 20 → {P_gen_60} kW',
          layer: 'observation', componentId: 'generator', signalIds: ['P_gen_true_kW'],
          detail: '因为母线功率必须平衡（理想发电机瞬时补偿假设），所以发电机真实功率由 20 kW 升到 {P_gen_60} kW，补偿电池少发的那部分；负载需求始终保持 {P_load_60} kW。',
          evidence: [{ varId: 'P_gen_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 20.00 kW → 60.0 s {P_gen_60} kW' }]
        },
        {
          /* ⑥ 测量功率残差：代数恒等（UI_COPY_GUARDRAILS §3.2/§3.3 逐字口径）。
             不得写"因为发电机补偿所以残差 +4 kW"——⑥ 与 τ、反馈模式、发电机补偿无关。 */
          id: 'n6', order: 6, title: '测量功率残差', short: 'r_meas = +{r_meas_peak} kW，r_true = {r_true_max}',
          layer: 'observation', componentId: 'bus', signalIds: ['r_meas_kW', 'r_true_kW'],
          kind: 'algebraic_identity',
          epistemic: '代数恒等',
          detail: 'r_meas = (P_gen + P_bat,true − P_load) + (P_bat,meas − P_bat,true) = 0 + 0.4·b = +{r_meas_peak} kW。它是测量通道误差的功率当量，不是能量损失，也不是 ⑤ 的结果；在仅监测与闭环两种模式下都为 +{r_meas_peak} kW。真实残差 r_true = {r_true_max} kW；真实能量满足 E_bat {E_bat} kWh + E_gen {E_gen} kWh = E_load {E_load} kWh（定义自洽）。',
          evidence: [{ varId: 'r_meas_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障期间 r_meas 恒为 +{r_meas_peak} kW（代数恒等 0.4·b），r_true 恒为 0' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '注入测量通道' },
        { from: 'n2', to: 'n3', label: '进入闭环反馈' },
        { from: 'n3', to: 'n4', label: '真实电流目标下降' },
        { from: 'n4', to: 'n5', label: '母线功率缺口' },
        /* ⑥ 不再挂在 ⑤ 下游（G0-DEC-13）：从 ② 测量通道分支以虚线接入 */
        { from: 'n2', to: 'n6', label: '测量通道误差的功率当量', dashed: true }
      ],
      monitorNodes: [
        {
          id: 'm1', order: 1, title: '偏置注入', short: '传感器偏置 {sign}{mag} {unit}',
          layer: 'config', componentId: 'sensor', signalIds: ['bias_A'],
          detail: '因为 {t0} s 在{targetComponent}的测量通道注入了 {sign}{mag} {unit} 阶跃偏置，所以测量电流规则变为 I_meas = I_true + b(t)。本次运行是仅监测模式：偏置不进入物理回路，不影响真实电流。',
          evidence: [{ varId: 'bias_A', tStartOffset: -0.1, tEndOffset: 0.1, note: '事件前 b(t)=0，{t0} s 起 b(t)={sign}{mag} {unit}' }]
        },
        {
          id: 'm2', order: 2, title: '测量电流偏高', short: 'I_meas 25 → {I_meas_post} A',
          layer: 'observation', componentId: 'sensor', signalIds: ['I_bat_meas_A', 'I_bat_true_A'],
          detail: '因为偏置叠加在测量通道，所以测量电流由 {I_meas_pre} A 跳到 {I_meas_post} A；仅监测模式下真实电流保持 25 A，测量与真实分离。',
          evidence: [{ varId: 'I_bat_meas_A', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {I_meas_pre} A → 20.0 s {I_meas_post} A' }]
        },
        {
          id: 'm3', order: 3, title: '真实电流保持不变', short: 'I_true ≡ 25 A',
          layer: 'mechanism', componentId: 'battery', signalIds: ['I_bat_true_A'],
          detail: '因为仅监测模式下偏置不进入物理回路，所以真实电池电流恒为 25 A、真实功率恒为 10 kW；故障只改变测量与估计，不改变物理状态。',
          evidence: [{ varId: 'I_bat_true_A', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障期间真实电流保持 25.00 A' }]
        },
        {
          id: 'm4', order: 4, title: '测量功率残差', short: 'r_meas = +{r_meas_peak} kW，r_true = {r_true_max}',
          layer: 'observation', componentId: 'bus', signalIds: ['r_meas_kW', 'r_true_kW'],
          detail: '因为测量电池功率仍含偏置，所以 r_meas = P_gen,true + P_bat,meas − P_load 在故障期间为 +{r_meas_peak} kW，真实残差 r_true = {r_true_max} kW。该残差来自测量偏差，不是能量损失。',
          evidence: [{ varId: 'r_meas_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障期间 r_meas 恒为 +{r_meas_peak} kW' }]
        },
        {
          id: 'm5', order: 5, title: '估计 SOC 偏移', short: 'SOC_err {SOC_err} pp',
          layer: 'observation', componentId: 'battery', signalIds: ['SOC_est_pct', 'SOC_true_pct'],
          detail: '因为 SOC 估计由测量功率积分，所以 SOC_est 比 SOC_true 低约 |{SOC_err}| pp（估计放电偏多）；真实电池电能与无故障基准相同，E_bat = {E_bat} kWh、E_gen = {E_gen} kWh。',
          evidence: [{ varId: 'SOC_est_pct', tStartOffset: 0.0, tEndOffset: 40.0, note: 'SOC_est 与 SOC_true 分离，差值即测量偏差的积分' }]
        }
      ],
      monitorEdges: [
        { from: 'm1', to: 'm2', label: '注入测量通道' },
        { from: 'm1', to: 'm3', label: '不进入物理回路' },
        { from: 'm2', to: 'm4', label: '测量侧出现残差' },
        { from: 'm3', to: 'm5', label: '真实能量不变，仅估计偏移' }
      ],
      assumptions: ['A-ideal-bus', 'A-ideal-gen', 'A-l0'],
      limitations: ['τ = 1.5 s 为行为级等效时间常数，非实测参数。', '不含电池等效电路、温度与效率动态。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若为仅监测模式', text: '偏置不进入物理回路，真实电流保持 25 A，只有测量电流、测量残差与估计 SOC 偏移。' }]
    },
    load_step: {
      id: 'load-step-bus-balance',
      headline: 't={t0} s，{faultLabel}：负载需求 +{mag} kW 阶跃',
      mechanismSummary: '负载需求阶跃 → 母线出现功率缺口 → 一阶惯性发电机来不及瞬时补偿 → 电池承担瞬态 → 发电机爬坡后电池电流回落。',
      nodes: [
        {
          id: 'n1', order: 1, title: '负载阶跃注入', short: 'P_load {P_load_pre} → {P_load_post} kW',
          layer: 'config', componentId: 'load', signalIds: ['P_load_demand_kW'],
          detail: '因为 {t0} s 负载需求从 {P_load_pre} kW 阶跃到 {P_load_post} kW（+{mag} kW），所以母线功率需求发生阶跃变化。这是配置定义的故障输入。',
          evidence: [{ varId: 'P_load_demand_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {P_load_pre} kW → 20.0 s {P_load_post} kW' }]
        },
        {
          id: 'n2', order: 2, title: '母线功率缺口', short: '缺口约 {mag} kW',
          layer: 'mechanism', componentId: 'bus', signalIds: ['P_load_served_kW'],
          detail: '因为模型假设发电机为一阶惯性源（τ_gen = 2.0 s）追踪「负载需求 − 电池功率」，所以阶跃瞬间发电机仍输出约 20 kW，约 {mag} kW 的缺口由电池承担。',
          evidence: [{ varId: 'P_load_served_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '负载实际获得功率随需求阶跃' }]
        },
        {
          id: 'n3', order: 3, title: '电池真实放电短时上升', short: 'I_true 25 → {I_peak} A',
          layer: 'observation', componentId: 'battery', signalIds: ['I_bat_true_A', 'P_bat_true_kW'],
          detail: '因为电池承担瞬态缺口，所以真实电池电流由 25 A 短时升到约 {I_peak} A（20.0 s），随后随发电机爬坡回落，约 10 s 后回到 25 A。',
          evidence: [{ varId: 'I_bat_true_A', tStartOffset: 0.0, tEndOffset: 12.0, note: '故障后电池电流峰值约 {I_peak} A，τ_gen 爬坡结束后回落 25 A' }]
        },
        {
          id: 'n4', order: 4, title: '发电机一阶爬坡补偿', short: 'P_gen 20 → {P_gen_60} kW',
          layer: 'observation', componentId: 'generator', signalIds: ['P_gen_true_kW'],
          detail: '因为发电机按 τ_gen = 2.0 s 一阶惯性向 P_load − P_bat 的目标爬坡，所以 P_gen 由 20 kW 升到 {P_gen_60} kW。',
          evidence: [{ varId: 'P_gen_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 20.00 kW → 60.0 s {P_gen_60} kW' }]
        },
        {
          id: 'n5', order: 5, title: '真实功率守恒与能量再分配', short: 'E_load = E_bat + E_gen',
          layer: 'observation', componentId: 'bus', signalIds: ['r_true_kW'],
          detail: '因为真实功率按模型结构平衡，所以 r_true = {r_true_max} kW；60 s 内 E_load = {E_load} kWh = E_bat {E_bat} + E_gen {E_gen} kWh，能量只是在电池与发电机之间重新分配。',
          evidence: [{ varId: 'r_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '真实残差恒为 0，能量守恒' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '需求阶跃' },
        { from: 'n2', to: 'n3', label: '电池承担瞬态' },
        { from: 'n2', to: 'n4', label: '发电机一阶补偿' },
        { from: 'n3', to: 'n5', label: '能量重新分配' },
        { from: 'n4', to: 'n5', label: '能量重新分配' }
      ],
      assumptions: ['A-ideal-bus', 'A-ideal-gen', 'A-gen-lag', 'A-l0'],
      limitations: ['τ_gen = 2.0 s 为行为级等效时间常数，非实测参数。', '不含保护动作、频率/电压动态与资源限制。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若发电机为理想瞬时平衡源', text: '缺口会被瞬时补偿，电池电流不会出现约 50 A 的短时上升，负载阶跃对电池无影响。' }]
    },
    actuator_fault: {
      id: 'actuator-limit',
      headline: 't={t0} s，{faultLabel}：电流上限降至 {mag}%（I_cap = {I_cap} A）',
      mechanismSummary: '变换器电流上限下降 → 真实电流被限幅 → 电池少发 → 发电机补偿缺口 → 指令与实际持续偏差（测量本身一致）。',
      nodes: [
        {
          id: 'n1', order: 1, title: '电流上限注入', short: 'I_cap = {I_cap} A',
          layer: 'config', componentId: 'converter', signalIds: ['I_bat_cap_A'],
          detail: '因为 {t0} s 变换器输出电流上限被限制为 I_ref × {mag}% = {I_cap} A，所以执行器可输出的最大电流被钳位；控制器指令 I_ref 仍为 {I_ref} A。',
          evidence: [{ varId: 'I_bat_cap_A', tStartOffset: -0.1, tEndOffset: 0.1, note: '{t0} s 前无上限，之后 I_cap = {I_cap} A' }]
        },
        {
          id: 'n2', order: 2, title: '变换器输出限幅', short: '指令 {I_ref} A vs 上限 {I_cap} A',
          layer: 'mechanism', componentId: 'converter', signalIds: ['I_ref_A', 'I_bat_cap_A'],
          detail: '因为执行器存在上限而控制器指令不变，所以真实电流以 τ = 0.4 s 一阶过渡到限幅值 {I_cap} A，形成持续的指令-实际偏差。',
          evidence: [{ varId: 'I_ref_A', tStartOffset: 0.0, tEndOffset: 40.0, note: 'I_ref 保持 {I_ref} A，实际电流被限制在 {I_cap} A' }]
        },
        {
          id: 'n3', order: 3, title: '电池真实电流下降', short: 'I_true 25 → {I_true_60} A',
          layer: 'observation', componentId: 'battery', signalIds: ['I_bat_true_A', 'P_bat_true_kW'],
          detail: '因为执行器被限幅，所以真实电池电流从 25 A 降到 {I_true_60} A，真实电池功率由 10 kW 降到 {P_bat_60} kW。',
          evidence: [{ varId: 'I_bat_true_A', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 25.00 A → 60.0 s {I_true_60} A' }]
        },
        {
          id: 'n4', order: 4, title: '发电机补偿', short: 'P_gen 20 → {P_gen_60} kW',
          layer: 'observation', componentId: 'generator', signalIds: ['P_gen_true_kW'],
          detail: '因为母线功率仍需平衡，所以发电机真实功率由 20 kW 升到 {P_gen_60} kW 补偿电池少发的部分。',
          evidence: [{ varId: 'P_gen_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 20.00 kW → 60.0 s {P_gen_60} kW' }]
        },
        {
          id: 'n5', order: 5, title: '指令-实际偏差与守恒', short: '指令 25 A vs 实际 {I_true_60} A',
          layer: 'observation', componentId: 'controller', signalIds: ['I_ref_A', 'r_true_kW', 'r_meas_kW'],
          detail: '因为测量通道本身健康（无偏置），所以 r_meas = {r_meas_peak} kW、r_true = {r_true_max} kW；真正的异常是指令 I_ref = {I_ref} A 与实际 {I_true_60} A 的持续偏差。',
          evidence: [{ varId: 'r_meas_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '测量一致（r_meas≈0），偏差体现在指令跟踪上' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '执行器限幅' },
        { from: 'n2', to: 'n3', label: '真实电流受限' },
        { from: 'n3', to: 'n4', label: '母线功率缺口' },
        { from: 'n2', to: 'n5', label: '指令跟踪误差' }
      ],
      assumptions: ['A-ideal-bus', 'A-ideal-gen', 'A-l0'],
      limitations: ['不含变换器开关动态、效率曲线与保护逻辑。', '限幅为理想硬限幅，不是真实器件保护行为。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若控制器能感知限幅并降额', text: '控制器会降低电流指令匹配实际能力，指令-实际偏差消失；本模型未建模该自适应逻辑。' }]
    }
  };

  FC001.causalTemplates = {
    sensor_drift: {
      id: 'fc-sensor-drift',
      headline: 't={t0} s，{faultLabel}：{sign}{mag} {unit} 注入电堆电流测量通道',
      mechanismSummary: '电堆电流测量偏高 → 控制器认为电堆出力偏多 → 真实电堆电流下降 → 电池缓冲补足 → 测量残差 +{r_meas_peak} kW，EMS 平衡估算使 SOC_est 偏高 {SOC_err} pp。',
      nodes: [
        {
          id: 'n1', order: 1, title: '偏置注入', short: '电堆电流偏置 {sign}{mag} {unit}',
          layer: 'config', componentId: 'sensor', signalIds: ['bias_A'],
          detail: '因为 {t0} s 在{targetComponent}的电堆电流测量通道注入 {sign}{mag} {unit} 阶跃偏置，所以测量电流规则变为 I_fc,meas = I_fc + b(t)。这是配置定义的故障事实。',
          evidence: [{ varId: 'bias_A', tStartOffset: -0.1, tEndOffset: 0.1, note: '事件前 b(t)=0，{t0} s 起 b(t)={sign}{mag} {unit}' }]
        },
        {
          id: 'n2', order: 2, title: '电堆测量电流偏高', short: 'I_fc,meas {I_fc_meas_pre} → {I_fc_meas_post} A',
          layer: 'observation', componentId: 'sensor', signalIds: ['I_fc_meas_A', 'I_fc_true_A'],
          detail: '因为偏置叠加在测量通道，所以电堆测量电流由 {I_fc_meas_pre} A 跳到 {I_fc_meas_post} A；此时真实电堆电流仍为 {I_fc_pre} A。',
          evidence: [{ varId: 'I_fc_meas_A', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {I_fc_meas_pre} A → 20.0 s {I_fc_meas_post} A' }]
        },
        {
          id: 'n3', order: 3, title: '控制器误认为电堆发电偏多', short: '等效目标 I_fc_ref − b：{I_fc_ref} → {I_fc_target} A',
          layer: 'mechanism', componentId: 'controller', signalIds: ['I_fc_ref_A', 'I_fc_meas_A'],
          detail: '因为控制器按测量电堆电流闭环反馈（τ_fc·dI_fc/dt + I_fc = I_fc_ref − b(t)，τ_fc = 1.2 s），所以等效目标电流从 {I_fc_ref} A 降为 {I_fc_target} A，控制器认为电堆出力已经偏多。',
          evidence: [{ varId: 'I_fc_ref_A', tStartOffset: 0.0, tEndOffset: 40.0, note: 'I_fc_ref 指令保持 {I_fc_ref} A 不变，反馈通道被污染' }]
        },
        {
          id: 'n4', order: 4, title: '电堆真实电流下降', short: 'I_fc 50 → {I_fc_true_60} A',
          layer: 'observation', componentId: 'fc_stack', signalIds: ['I_fc_true_A', 'P_fc_true_kW'],
          detail: '因为一阶环节向新目标 {I_fc_target} A 衰减，所以电堆真实电流由 50 A 降到 {I_fc_true_60} A，真实电堆功率由 20 kW 降到 {P_fc_60} kW。',
          evidence: [{ varId: 'I_fc_true_A', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 50.00 A → 60.0 s {I_fc_true_60} A' }]
        },
        {
          id: 'n5', order: 5, title: '电池缓冲补足缺口', short: 'P_bat 10 → {P_bat_60} kW',
          layer: 'observation', componentId: 'battery', signalIds: ['P_bat_true_kW', 'I_bat_true_A'],
          detail: '因为母线功率需求不变而电堆少发，所以电池缓冲真实功率由 10 kW 升到 {P_bat_60} kW（I_bat ≈ {I_bat_60} A），补偿电堆少发的部分。',
          evidence: [{ varId: 'P_bat_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 10.00 kW → 60.0 s {P_bat_60} kW' }]
        },
        {
          id: 'n6', order: 6, title: '测量残差与 SOC 估计偏差', short: 'r_meas +{r_meas_peak} kW，SOC_err {SOC_err} pp',
          layer: 'observation', componentId: 'bus', signalIds: ['r_meas_kW', 'r_true_kW', 'P_bat_est_kW', 'SOC_est_pct'],
          detail: '因为测量电堆功率仍含 +{mag} A 的假象，所以 r_meas = P_fc,meas + P_bat,meas − P_load 在故障期间为 +{r_meas_peak} kW，而 r_true = {r_true_max} kW。同时 SOC 估计采用 EMS 平衡估算 P_bat,est = P_load − P_fc,meas（模型假设 A-fc-soc-est），估算放电偏少，SOC_est 比真实值高 {SOC_err} pp —— 这是估计口径偏差，不是能量损失。E_load = {E_load} kWh = E_fc {E_fc} + E_bat {E_bat} kWh。',
          evidence: [{ varId: 'r_meas_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障期间 r_meas 恒为 +{r_meas_peak} kW；SOC 估计偏差来自同一测量偏差' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '注入测量通道' },
        { from: 'n2', to: 'n3', label: '进入闭环反馈' },
        { from: 'n3', to: 'n4', label: '电堆目标电流下降' },
        { from: 'n4', to: 'n5', label: '母线功率缺口' },
        { from: 'n5', to: 'n6', label: '测量与估计偏差显现' }
      ],
      monitorNodes: [
        {
          id: 'm1', order: 1, title: '偏置注入', short: '电堆电流偏置 {sign}{mag} {unit}',
          layer: 'config', componentId: 'sensor', signalIds: ['bias_A'],
          detail: '因为 {t0} s 在电堆电流测量通道注入 {sign}{mag} {unit} 阶跃偏置，所以测量电流规则变为 I_fc,meas = I_fc + b(t)。本次运行是仅监测模式：偏置不进入物理回路。',
          evidence: [{ varId: 'bias_A', tStartOffset: -0.1, tEndOffset: 0.1, note: '事件前 b(t)=0，{t0} s 起 b(t)={sign}{mag} {unit}' }]
        },
        {
          id: 'm2', order: 2, title: '测量电流偏高', short: 'I_fc,meas 50 → {I_fc_meas_post} A',
          layer: 'observation', componentId: 'sensor', signalIds: ['I_fc_meas_A'],
          detail: '因为偏置叠加在测量通道，所以电堆测量电流跳到 {I_fc_meas_post} A，而真实电堆电流保持 {I_fc_pre} A。',
          evidence: [{ varId: 'I_fc_meas_A', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {I_fc_meas_pre} A → 20.0 s {I_fc_meas_post} A' }]
        },
        {
          id: 'm3', order: 3, title: '电堆真实电流不变', short: 'I_fc ≡ 50 A',
          layer: 'mechanism', componentId: 'fc_stack', signalIds: ['I_fc_true_A'],
          detail: '因为仅监测模式下偏置不进入物理回路，所以电堆真实电流恒为 50 A、真实功率恒为 20 kW；电池缓冲保持 10 kW。',
          evidence: [{ varId: 'I_fc_true_A', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障期间真实电堆电流保持 50.00 A' }]
        },
        {
          id: 'm4', order: 4, title: '测量残差', short: 'r_meas = +{r_meas_peak} kW',
          layer: 'observation', componentId: 'bus', signalIds: ['r_meas_kW', 'r_true_kW'],
          detail: '因为测量电堆功率仍含偏置，所以 r_meas 在故障期间为 +{r_meas_peak} kW，真实残差 r_true = {r_true_max} kW；这是测量偏差，不是能量损失。',
          evidence: [{ varId: 'r_meas_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障期间 r_meas 恒为 +{r_meas_peak} kW' }]
        },
        {
          id: 'm5', order: 5, title: 'SOC 估计偏差', short: 'SOC_err {SOC_err} pp',
          layer: 'observation', componentId: 'battery', signalIds: ['SOC_est_pct', 'P_bat_est_kW'],
          detail: '因为 SOC 估计按 EMS 平衡估算 P_bat,est = P_load − P_fc,meas 积分，估算放电偏少，所以 SOC_est 比真实值高 {SOC_err} pp；真实电堆与电池电能不受影响。',
          evidence: [{ varId: 'SOC_est_pct', tStartOffset: 0.0, tEndOffset: 40.0, note: 'SOC_est 与 SOC_true 分离，偏差来自测量链' }]
        }
      ],
      monitorEdges: [
        { from: 'm1', to: 'm2', label: '注入测量通道' },
        { from: 'm1', to: 'm3', label: '不进入物理回路' },
        { from: 'm2', to: 'm4', label: '测量侧出现残差' },
        { from: 'm2', to: 'm5', label: '估计链路偏移' }
      ],
      assumptions: ['A-ideal-bus', 'A-const-v', 'A-ideal-balance', 'A-fc-soc-est', 'A-fc-first-order', 'A-l0'],
      limitations: ['τ_fc = 1.2 s 为行为级等效时间常数，非实测参数。', '不含热管理、水管理与气体传输动态。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若 SOC 改用电池电流库仑积分', text: '电池电流传感器健康，SOC 估计误差将≈0；本模型的 SOC 偏差来自 EMS 平衡估算口径（假设 A-fc-soc-est）。' }]
    },
    load_step: {
      id: 'fc-load-step',
      headline: 't={t0} s，{faultLabel}：负载需求 +{mag} kW 阶跃',
      mechanismSummary: '负载需求阶跃 → 功率分配器一阶抬升电堆参考 → 电堆出力爬坡 → 电池承担瞬态后回到 10 kW。',
      nodes: [
        {
          id: 'n1', order: 1, title: '负载阶跃注入', short: 'P_load {P_load_pre} → {P_load_post} kW',
          layer: 'config', componentId: 'load', signalIds: ['P_load_demand_kW'],
          detail: '因为 {t0} s 负载需求从 {P_load_pre} kW 阶跃到 {P_load_post} kW（+{mag} kW），所以母线功率需求发生阶跃。这是配置定义的故障输入。',
          evidence: [{ varId: 'P_load_demand_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {P_load_pre} kW → 20.0 s {P_load_post} kW' }]
        },
        {
          id: 'n2', order: 2, title: '功率分配器一阶爬坡', short: 'I_fc_ref 50 → {I_fc_ref_60} A',
          layer: 'mechanism', componentId: 'controller', signalIds: ['I_fc_ref_A'],
          detail: '因为功率分配器按 τ_ref = 2.5 s 一阶爬坡，把电堆参考电流从 50 A 抬向 (P_load − 10)/0.4 = {I_fc_ref_60} A（30 kW），所以电堆目标出力逐步上升。',
          evidence: [{ varId: 'I_fc_ref_A', tStartOffset: 0.0, tEndOffset: 40.0, note: '电堆参考电流一阶爬向 {I_fc_ref_60} A' }]
        },
        {
          id: 'n3', order: 3, title: '电堆出力上升', short: 'I_fc → {I_fc_true_60} A',
          layer: 'observation', componentId: 'fc_stack', signalIds: ['I_fc_true_A', 'P_fc_true_kW'],
          detail: '因为电堆电流以 τ_fc = 1.2 s 跟随参考，所以电堆真实电流升到 {I_fc_true_60} A，真实功率升到 {P_fc_60} kW。',
          evidence: [{ varId: 'I_fc_true_A', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 50.00 A → 60.0 s {I_fc_true_60} A' }]
        },
        {
          id: 'n4', order: 4, title: '电池承担瞬态后回落', short: 'P_bat 10 → 瞬态 → {P_bat_60} kW',
          layer: 'observation', componentId: 'battery', signalIds: ['P_bat_true_kW'],
          detail: '因为电堆爬坡慢于需求阶跃，所以电池缓冲先承担瞬态缺口，随后回落到 10 kW 基准（60 s 时 {P_bat_60} kW）。',
          evidence: [{ varId: 'P_bat_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '电池先补瞬态，随后回到 10 kW 附近' }]
        },
        {
          id: 'n5', order: 5, title: '真实功率守恒', short: 'E_load = E_fc + E_bat',
          layer: 'observation', componentId: 'bus', signalIds: ['r_true_kW'],
          detail: '因为真实功率按模型结构平衡，所以 r_true = {r_true_max} kW；E_load = {E_load} kWh = E_fc {E_fc} + E_bat {E_bat} kWh，能量只是在电堆与电池之间重新分配。',
          evidence: [{ varId: 'r_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '真实残差恒为 0，能量守恒' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '需求阶跃' },
        { from: 'n2', to: 'n3', label: '电堆参考上升' },
        { from: 'n1', to: 'n4', label: '瞬态缺口' },
        { from: 'n3', to: 'n5', label: '能量重新分配' },
        { from: 'n4', to: 'n5', label: '能量重新分配' }
      ],
      assumptions: ['A-ideal-bus', 'A-const-v', 'A-ideal-balance', 'A-fc-first-order', 'A-l0'],
      limitations: ['τ_ref = 2.5 s / τ_fc = 1.2 s 为行为级等效时间常数。', '不含电堆热管理、水管理与气体传输动态。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若电堆瞬时跟随负载', text: '电堆会立即升到 30 kW，电池缓冲保持 10 kW，不会出现瞬态补足。' }]
    },
    actuator_fault: {
      id: 'fc-valve-stuck',
      headline: 't={t0} s，{faultLabel}：阀卡涩于 {mag}%（I_fc_cap = {I_fc_cap} A）',
      mechanismSummary: '氢气阀卡涩 → 电堆电流上限下降 → 电堆少发 → 电池补足 → 阀指令与实际阀位持续背离。',
      nodes: [
        {
          id: 'n1', order: 1, title: '阀门卡涩注入', short: 'I_fc_cap = {I_fc_cap} A',
          layer: 'config', componentId: 'valve', signalIds: ['I_fc_cap_A'],
          detail: '因为 {t0} s 氢气供给阀卡涩于 {mag}% 开度，电堆电流上限降为 I_fc_ref × {mag}% = {I_fc_cap} A，所以电堆出力被限制。',
          evidence: [{ varId: 'I_fc_cap_A', tStartOffset: -0.1, tEndOffset: 0.1, note: '{t0} s 前无上限，之后 I_fc_cap = {I_fc_cap} A' }]
        },
        {
          id: 'n2', order: 2, title: '电堆出力受限', short: 'I_fc 50 → {I_fc_true_60} A',
          layer: 'mechanism', componentId: 'fc_stack', signalIds: ['I_fc_true_A', 'I_fc_ref_A'],
          detail: '因为电堆电流以 τ = 1.5 s 向电流上限衰减并钳位，所以真实电堆电流由 50 A 降到 {I_fc_true_60} A；控制器指令 I_fc_ref 仍为 {I_fc_ref} A。',
          evidence: [{ varId: 'I_fc_true_A', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 50.00 A → 60.0 s {I_fc_true_60} A' }]
        },
        {
          id: 'n3', order: 3, title: '电堆真实功率下降', short: 'P_fc 20 → {P_fc_60} kW',
          layer: 'observation', componentId: 'fc_stack', signalIds: ['P_fc_true_kW'],
          detail: '因为电堆电流被限制在 {I_fc_cap} A，所以真实电堆功率由 20 kW 降到 {P_fc_60} kW。',
          evidence: [{ varId: 'P_fc_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 20.00 kW → 60.0 s {P_fc_60} kW' }]
        },
        {
          id: 'n4', order: 4, title: '电池补足需求', short: 'P_bat 10 → {P_bat_60} kW',
          layer: 'observation', componentId: 'battery', signalIds: ['P_bat_true_kW'],
          detail: '因为母线功率需求不变，所以电池缓冲真实功率由 10 kW 升到 {P_bat_60} kW，补偿电堆少发的部分。',
          evidence: [{ varId: 'P_bat_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 10.00 kW → 60.0 s {P_bat_60} kW' }]
        },
        {
          id: 'n5', order: 5, title: '阀指令-阀位背离', short: 'valve_cmd {valve_cmd}% vs valve_meas {valve_meas}%',
          layer: 'observation', componentId: 'valve', signalIds: ['valve_cmd_pct', 'valve_meas_pct'],
          detail: '因为控制器持续要求全开（valve_cmd = {valve_cmd}%），而阀门卡涩在 {valve_meas}%，所以指令与实际阀位持续背离；功率测量本身一致（r_meas = {r_meas_peak} kW），真实守恒 r_true = {r_true_max} kW。',
          evidence: [{ varId: 'valve_meas_pct', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {valve_meas_pre}% → 20.0 s {valve_meas}%' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '执行器受限' },
        { from: 'n2', to: 'n3', label: '电堆出力下降' },
        { from: 'n3', to: 'n4', label: '母线功率缺口' },
        { from: 'n1', to: 'n5', label: '阀位背离' }
      ],
      assumptions: ['A-ideal-bus', 'A-const-v', 'A-ideal-balance', 'A-fc-first-order', 'A-l0'],
      limitations: ['不含燃料电池热管理、水管理与气体传输动态。', '卡涩建模为理想电流上限，不含阀门机械动态。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若控制器能感知阀位', text: '控制器会降低电堆参考电流并重新分配功率，阀指令-阀位偏差将消失；本模型未建模该自适应逻辑。' }]
    }
  };

  GT001.causalTemplates = {
    sensor_drift: {
      id: 'gt-sensor-drift',
      headline: 't={t0} s，{faultLabel}：{sign}{mag} Hz 注入转速测量通道（{n_rpm} rpm 等效）',
      mechanismSummary: '转速传感器读数偏高 → 调速器误认为频率偏高而减出力 → 真实频率稳定在 49.7 Hz → 电池一次调频增发、发电机出力下降；健康电气频率量测与转速通道出现 {mag} Hz 冗余不一致。',
      nodes: [
        {
          id: 'n1', order: 1, title: '转速传感器偏置注入', short: '转速通道 +{n_rpm} rpm',
          layer: 'config', componentId: 'speed_sensor', signalIds: ['n_meas_rpm'],
          detail: '因为 {t0} s 转速传感器注入 {sign}{mag} Hz 等效偏置（{n_rpm} rpm），所以转速读数变为 n_meas = 60×(f_true + b)，而健康电气频率量测 f_meas 仍等于真实频率。',
          evidence: [{ varId: 'n_meas_rpm', tStartOffset: -0.1, tEndOffset: 0.1, note: '{t0} s 前转速读数对应 50.0 Hz，之后对应 {f_gov_post} Hz' }]
        },
        {
          id: 'n2', order: 2, title: '冗余量测不一致', short: 'n_meas/60 = {f_gov_post} Hz vs f_meas = {f_meas_pre} Hz',
          layer: 'observation', componentId: 'speed_sensor', signalIds: ['n_meas_rpm', 'f_meas_Hz'],
          detail: '因为偏置只进入转速传感器通道，所以 {t0} s 时 n_meas/60 = {f_gov_post} Hz，而健康电气频率量测 f_meas = {f_meas_pre} Hz，出现约 +{mag} Hz 的冗余不一致；这是 Agent 可交叉校验的检出依据（n_meas/60 − f_meas = b）。',
          evidence: [{ varId: 'f_meas_Hz', tStartOffset: -0.1, tEndOffset: 0.1, note: '健康电气频率量测保持真实频率；转速通道与之相差 +{mag} Hz' }]
        },
        {
          id: 'n3', order: 3, title: '调速器误认为频率偏高', short: 'f_gov = n_meas/60 偏高 → 调速器减出力',
          layer: 'mechanism', componentId: 'governor', signalIds: ['P_gen_cmd_kW', 'n_meas_rpm'],
          detail: '因为调速器按故障转速通道积分（dP_gen_cmd/dt = Ki×(50 − f_gov)，Ki = 2.0 kW/(Hz·s)，f_gov = n_meas/60），f_gov 被抬高 {mag} Hz，所以调速器持续减小功率指令，发电机真实出力下降。',
          evidence: [{ varId: 'P_gen_cmd_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '调速器指令由 25 kW 降到约 {P_gen_60} kW' }]
        },
        {
          id: 'n4', order: 4, title: '真实频率下降', short: 'f_true → {f_true_60} Hz',
          layer: 'observation', componentId: 'generator', signalIds: ['f_true_Hz'],
          detail: '因为发电机出力下降打破功率平衡，所以真实频率向 {f_true_60} Hz 收敛（转子惯量 K_J = 5 kW·s/Hz）；稳态时调速器把带偏置的 f_gov 拉回 50 Hz，即 f_true = 50 − {mag} = {f_true_60} Hz。',
          evidence: [{ varId: 'f_true_Hz', tStartOffset: 0.0, tEndOffset: 40.0, note: '真实频率由 50.0 Hz 下降并稳定在 {f_true_60} Hz 附近' }]
        },
        {
          id: 'n5', order: 5, title: '电池一次调频与出力重分配', short: 'P_bat → {P_bat_60} kW，P_gen → {P_gen_60} kW',
          layer: 'observation', componentId: 'battery', signalIds: ['P_bat_true_kW', 'P_gen_true_kW'],
          detail: '因为电池一次调频使用健康电气频率量测（模型假设 A-droop），f_true 下降使 P_bat 由 5 kW 升到 {P_bat_60} kW，发电机出力相应降到 {P_gen_60} kW，维持 P_gen + P_bat = P_load = {P_load_60} kW。',
          evidence: [{ varId: 'P_bat_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 5.00 kW → 60.0 s {P_bat_60} kW' }]
        },
        {
          id: 'n6', order: 6, title: '频率通道冗余不一致', short: 'f_channel_diff = {f_diff_peak} Hz，r_true = {r_true_max}',
          layer: 'observation', componentId: 'speed_sensor', signalIds: ['f_channel_diff_Hz', 'r_true_kW'],
          detail: '因为转速与电气两个测量通道冗余，其不一致 f_channel_diff = {f_diff_peak} Hz 是测量通道偏差的直接体现（不是能量损失）；真实功率平衡含转子项恒成立（r_true = {r_true_max} kW）。不能把频率偏差说成实际负载变化——负载始终为 {P_load_60} kW。',
          evidence: [{ varId: 'f_channel_diff_Hz', tStartOffset: 0.0, tEndOffset: 40.0, note: '通道冗余不一致 = 测量偏差，异常只在频率/转速通道' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '转速读数偏移' },
        { from: 'n2', to: 'n3', label: '进入调速器反馈' },
        { from: 'n3', to: 'n4', label: '机组减出力' },
        { from: 'n4', to: 'n5', label: '调频功率重分配' },
        { from: 'n5', to: 'n6', label: '功率测量仍一致' }
      ],
      monitorNodes: [
        {
          id: 'm1', order: 1, title: '转速传感器偏置注入', short: '转速通道 +{n_rpm} rpm',
          layer: 'config', componentId: 'speed_sensor', signalIds: ['n_meas_rpm'],
          detail: '因为 {t0} s 转速传感器注入 {sign}{mag} Hz 等效偏置，所以转速读数变为 n_meas = 60×(f_true + b)，而健康电气频率量测仍为真实频率。本次运行是仅监测模式：偏置不进入物理回路。',
          evidence: [{ varId: 'n_meas_rpm', tStartOffset: -0.1, tEndOffset: 0.1, note: '{t0} s 后转速读数偏高 {n_rpm} rpm' }]
        },
        {
          id: 'm2', order: 2, title: '冗余量测不一致', short: 'n_meas/60 − f_meas = +{mag} Hz',
          layer: 'observation', componentId: 'speed_sensor', signalIds: ['n_meas_rpm', 'f_meas_Hz'],
          detail: '因为偏置只进入转速传感器通道，所以 n_meas/60 与健康电气频率量测 f_meas 出现 +{mag} Hz 的不一致；这是可交叉校验的检出依据。',
          evidence: [{ varId: 'n_meas_rpm', tStartOffset: 0.0, tEndOffset: 40.0, note: '转速通道读数持续偏高，健康频率量测不变' }]
        },
        {
          id: 'm3', order: 3, title: '真实频率与功率不变', short: 'f_true ≡ 50 Hz',
          layer: 'mechanism', componentId: 'generator', signalIds: ['f_true_Hz', 'P_gen_true_kW'],
          detail: '因为仅监测模式下偏置不进入调速器与电池调频回路，所以真实频率保持 50 Hz，发电机出力保持 25 kW、电池 5 kW。',
          evidence: [{ varId: 'f_true_Hz', tStartOffset: 0.0, tEndOffset: 40.0, note: '真实频率保持 50.0 Hz' }]
        },
        {
          id: 'm4', order: 4, title: '频率通道冗余不一致', short: 'f_channel_diff = {f_diff_peak} Hz',
          layer: 'observation', componentId: 'speed_sensor', signalIds: ['f_channel_diff_Hz'],
          detail: '因为转速与电气两个测量通道冗余，f_channel_diff = {f_diff_peak} Hz 直接暴露测量通道偏差；功率平衡不受影响。',
          evidence: [{ varId: 'f_channel_diff_Hz', tStartOffset: 0.0, tEndOffset: 40.0, note: '通道冗余不一致 = 测量偏差，异常只在转速通道' }]
        }
      ],
      monitorEdges: [
        { from: 'm1', to: 'm2', label: '冗余不一致' },
        { from: 'm1', to: 'm3', label: '不进入物理回路' },
        { from: 'm3', to: 'm4', label: '功率平衡不变' }
      ],
      assumptions: ['A-ideal-bus', 'A-lumped-inertia', 'A-droop', 'A-gov-integral', 'A-freq-redundant', 'A-l0'],
      limitations: ['K_J = 5.0 kW·s/Hz 为降阶等效惯量，非实测参数。', '不含电网潮流、励磁调压、燃烧与透平热力学。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若为仅监测模式', text: '偏置只污染转速读数，调速器与电池调频使用健康频率，真实频率保持 50 Hz；故障仅体现为冗余量测不一致。' }]
    },
    load_step: {
      id: 'gt-load-step',
      headline: 't={t0} s，{faultLabel}：负载需求 +{mag} kW 阶跃',
      mechanismSummary: '负载需求阶跃 → 转子释放动能（K_J）导致频率下降 → 电池一次调频支撑 → 调速器积分恢复 50 Hz，发电机出力最终升到 {P_gen_60} kW。',
      nodes: [
        {
          id: 'n1', order: 1, title: '负载阶跃注入', short: 'P_load {P_load_pre} → {P_load_post} kW',
          layer: 'config', componentId: 'load', signalIds: ['P_load_demand_kW'],
          detail: '因为 {t0} s 负载需求从 {P_load_pre} kW 阶跃到 {P_load_post} kW（+{mag} kW），所以母线功率需求发生阶跃。这是配置定义的故障输入。',
          evidence: [{ varId: 'P_load_demand_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {P_load_pre} kW → 20.0 s {P_load_post} kW' }]
        },
        {
          id: 'n2', order: 2, title: '转子惯量释放动能', short: 'P_rotor 支撑缺口',
          layer: 'mechanism', componentId: 'generator', signalIds: ['P_rotor_kW', 'f_true_Hz'],
          detail: '因为发电机与调速器无法瞬时补足 +{mag} kW 缺口，所以转子按 df/dt = (P_gen + P_bat − P_load)/K_J 释放动能，频率开始下降（K_J = 5.0 kW·s/Hz）。',
          evidence: [{ varId: 'P_rotor_kW', tStartOffset: 0.0, tEndOffset: 5.0, note: '故障瞬间转子惯量项吸收功率不平衡' }]
        },
        {
          id: 'n3', order: 3, title: '频率最低点', short: 'f_nadir = {f_nadir} Hz',
          layer: 'observation', componentId: 'generator', signalIds: ['f_true_Hz'],
          detail: '因为缺口先由转子动能与电池一次调频共同承担，所以真实频率出现最低点 {f_nadir} Hz（偏差 {f_nadir_dev} Hz，在模型验收范围内）。',
          evidence: [{ varId: 'f_true_Hz', tStartOffset: 0.0, tEndOffset: 15.0, note: '频率最低点出现在故障后数秒，随后回升' }]
        },
        {
          id: 'n4', order: 4, title: '电池一次调频支撑', short: 'P_bat 峰值 {P_bat_peak} kW',
          layer: 'observation', componentId: 'battery', signalIds: ['P_bat_true_kW'],
          detail: '因为电池一次调频按 P_bat = 5 − 24×(f_meas − 50) 响应频率下跌，所以电池出力短时升到约 {P_bat_peak} kW，帮助抑制频率跌落。',
          evidence: [{ varId: 'P_bat_true_kW', tStartOffset: 0.0, tEndOffset: 15.0, note: '电池出力随频率跌落上升，峰值约 {P_bat_peak} kW' }]
        },
        {
          id: 'n5', order: 5, title: '调速器积分恢复', short: 'f → 50 Hz（约 {f_recovery} s）',
          layer: 'observation', componentId: 'governor', signalIds: ['P_gen_cmd_kW', 'f_true_Hz'],
          detail: '因为调速器按 dP_gen_cmd/dt = Ki×(50 − f) 积分并抬高功率指令，所以频率在约 {f_recovery} s 后恢复到 50 Hz，发电机出力最终升到 {P_gen_60} kW、电池回到 5 kW。',
          evidence: [{ varId: 'P_gen_cmd_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '调速器指令由 25 kW 升到约 {P_gen_60} kW' }]
        },
        {
          id: 'n6', order: 6, title: '含转子项的真实功率守恒', short: 'E_load = E_gen + E_bat + E_rotor',
          layer: 'observation', componentId: 'bus', signalIds: ['r_true_kW', 'P_rotor_kW'],
          detail: '因为真实功率平衡含转子惯量项（P_gen + P_bat − P_load − P_rotor = 0），所以 r_true = {r_true_max} kW；E_load = {E_load} kWh 由发电机 E_gen {E_gen} + 电池 E_bat {E_bat} + 转子动能变化 E_rotor {E_rotor} kWh 共同提供。',
          evidence: [{ varId: 'r_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '含转子项的真实残差恒为 0' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '功率缺口' },
        { from: 'n2', to: 'n3', label: '频率跌落' },
        { from: 'n3', to: 'n4', label: '一次调频响应' },
        { from: 'n3', to: 'n5', label: '调速器积分' },
        { from: 'n4', to: 'n6', label: '能量重新分配' },
        { from: 'n5', to: 'n6', label: '能量重新分配' }
      ],
      assumptions: ['A-ideal-bus', 'A-lumped-inertia', 'A-droop', 'A-gov-integral', 'A-gen-lag', 'A-l0'],
      limitations: ['K_J、Ki、K_bat 为降阶等效参数，非实测参数。', '不含电网潮流、励磁调压、燃烧与透平热力学。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若电池一次调频更强', text: '频率最低点会更浅、恢复更快；本模型 K_bat = 24 kW/Hz 为设定值。' }]
    },
    actuator_fault: {
      id: 'gt-valve-stuck',
      headline: 't={t0} s，{faultLabel}：燃料阀卡涩于 {mag}%（P_gen_cap = {P_gen_cap} kW）',
      mechanismSummary: '燃料阀卡涩 → 发电机出力被钳位 → 频率持续偏低 → 电池长期支撑 → 调速器阀指令持续上升但阀位不动。',
      nodes: [
        {
          id: 'n1', order: 1, title: '燃料阀卡涩注入', short: 'P_gen_cap = {P_gen_cap} kW',
          layer: 'config', componentId: 'valve', signalIds: ['P_gen_cap_kW'],
          detail: '因为 {t0} s 燃料阀卡涩于 {mag}% 开度，发电机功率上限降为 40 × {mag}% = {P_gen_cap} kW，所以发电机出力被钳位。',
          evidence: [{ varId: 'P_gen_cap_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '{t0} s 前无上限，之后 P_gen,cap = {P_gen_cap} kW' }]
        },
        {
          id: 'n2', order: 2, title: '发电机出力被钳位', short: 'P_gen 25 → {P_gen_60} kW',
          layer: 'mechanism', componentId: 'generator', signalIds: ['P_gen_true_kW', 'P_gen_cap_kW'],
          detail: '因为发电机功率不能超过卡涩对应的上限 {P_gen_cap} kW，所以真实出力由 25 kW 降到 {P_gen_60} kW 附近并被钳位；母线功率缺口只能由转子动能与电池补足。',
          evidence: [{ varId: 'P_gen_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '发电机出力被限制在 {P_gen_cap} kW 以下' }]
        },
        {
          id: 'n3', order: 3, title: '频率持续偏低', short: 'f_true → {f_true_60} Hz',
          layer: 'observation', componentId: 'generator', signalIds: ['f_true_Hz'],
          detail: '因为发电机长期欠发而负载不变，所以真实频率稳定在 {f_true_60} Hz，出现持续偏差而不是瞬时跌落；调速器把 f 拉回 50 Hz 的能力被阀门卡涩阻断。',
          evidence: [{ varId: 'f_true_Hz', tStartOffset: 0.0, tEndOffset: 40.0, note: '真实频率在故障后持续低于 50 Hz' }]
        },
        {
          id: 'n4', order: 4, title: '电池长期支撑', short: 'P_bat → {P_bat_60} kW',
          layer: 'observation', componentId: 'battery', signalIds: ['P_bat_true_kW'],
          detail: '因为电池一次调频按健康频率量测持续响应，所以电池由 5 kW 升到约 {P_bat_60} kW 并长期支撑，维持 P_gen + P_bat = P_load。',
          evidence: [{ varId: 'P_bat_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 5.00 kW → 60.0 s {P_bat_60} kW' }]
        },
        {
          id: 'n5', order: 5, title: '阀指令与阀位背离', short: 'valve_cmd {valve_cmd}% vs valve_meas {valve_meas}%',
          layer: 'observation', componentId: 'governor', signalIds: ['valve_cmd_pct', 'valve_meas_pct', 'r_true_kW'],
          detail: '因为调速器持续看到频率偏低，所以功率指令（换算为阀指令 {valve_cmd}%）继续上升，而实际阀位卡在 {valve_meas}%；功率测量本身一致（r_meas = {r_meas_peak} kW），真实守恒 r_true = {r_true_max} kW。',
          evidence: [{ varId: 'valve_cmd_pct', tStartOffset: 0.0, tEndOffset: 40.0, note: '阀指令持续上升，实际阀位保持 {valve_meas}%' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '出力钳位' },
        { from: 'n2', to: 'n3', label: '功率缺口' },
        { from: 'n3', to: 'n4', label: '电池长期支撑' },
        { from: 'n3', to: 'n5', label: '调速器持续指令' }
      ],
      assumptions: ['A-ideal-bus', 'A-lumped-inertia', 'A-droop', 'A-gov-integral', 'A-gen-lag', 'A-l0'],
      limitations: ['不含阀门机械动态与透平热力学。', '卡涩建模为理想功率上限，不是真实保护动作。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若阀门未卡涩', text: '调速器能把频率恢复到 50 Hz，电池回到 5 kW；本模型未建模阀门机械动态与保护动作。' }]
    }
  };

  var ALL = [FL001, FC001, GT001];
  var BY_ID = {};
  ALL.forEach(function (s) { BY_ID[s.id] = s; });

  /* ================================================================== */
  /* FL.systems API                                                      */
  /* ================================================================== */
  function clone(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(clone);
    var out = {};
    Object.keys(v).forEach(function (k) { out[k] = clone(v[k]); });
    return out;
  }

  function get(systemId) {
    return BY_ID[systemId] || null;
  }

  function requireSystem(systemId) {
    var s = get(systemId);
    if (!s) throw new Error('FL.systems: 未知系统 ' + systemId);
    return s;
  }

  function list() {
    return ALL.map(function (s) {
      return {
        id: s.id,
        experimentCode: s.experimentCode,
        title: s.title,
        shortTitle: s.shortTitle,
        tagline: s.tagline,
        level: s.level,
        available: true,
        defaultFaultFamily: s.faults[0].family
      };
    });
  }

  function signalMap(systemId) {
    var s = requireSystem(systemId);
    var map = {};
    s.signals.forEach(function (sg) { map[sg.id] = sg; });
    return map;
  }

  function faults(systemId) {
    return clone(requireSystem(systemId).faults);
  }

  function faultFor(systemId, family) {
    var s = requireSystem(systemId);
    for (var i = 0; i < s.faults.length; i++) if (s.faults[i].family === family) return clone(s.faults[i]);
    return null;
  }

  function component(systemId, componentId) {
    var s = requireSystem(systemId);
    for (var i = 0; i < s.components.length; i++) if (s.components[i].id === componentId) return clone(s.components[i]);
    return null;
  }

  function defaultConfig(systemId) {
    var s = requireSystem(systemId);
    var f = s.faults[0];
    return {
      schemaVersion: 1,
      systemId: s.id,
      modelId: s.model.model_id,
      modelVersion: s.model.model_version,
      duration_s: s.duration_s,
      dt_s: s.dt_s,
      feedback_mode: s.defaults.feedback_mode,
      fault: {
        family: f.family,
        faultId: f.id,
        t_start_s: f.defaultTime_s,
        params: paramsDefault(f)
      },
      initial: clone(s.defaults.initial),
      noise: clone(s.defaults.noise)
    };
  }

  function causalTemplate(systemId, faultFamily) {
    var s = requireSystem(systemId);
    if (!s.causalTemplates) return null;
    if (!faultFamily || faultFamily === 'none') return s.causalTemplates.healthy || null;
    return clone(s.causalTemplates[faultFamily] || null);
  }

  function validateDraft(draft) {
    if (FL.core && typeof FL.core.validateConfig === 'function') return FL.core.validateConfig(draft);
    return { ok: false, errors: [{ field: 'systemId', message: '核心引擎尚未加载，无法校验配置' }], warnings: [] };
  }

  FL.systems = {
    list: list,
    get: function (systemId) { return clone(requireSystem(systemId)); },
    defaultConfig: defaultConfig,
    signalMap: signalMap,
    faults: faults,
    fault: faultFor,
    component: component,
    causalTemplate: causalTemplate,
    validateDraft: validateDraft
  };

  /* 供 engine 内部使用的原始引用（克隆开销为零）——非公共契约 API */
  FL.systems._raw = {
    all: function () { return ALL; },
    get: function (systemId) { return BY_ID[systemId] || null; },
    clone: clone,
    units: UNITS
  };
})();
