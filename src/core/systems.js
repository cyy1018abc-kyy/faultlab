/* owner: core-engine | module: systems | contract: docs/CONTRACT.md */
/* 四系统 SystemDef（FL-001 / FC-001 / GT-001 / PV-001）：拓扑、信号元数据、故障目录、模型假设、因果模板。
   纯数据 + 查询 API，挂在 FL.systems；不依赖 DOM / FL.protocol。
   PV-001 = PV001_G2B_SPEC_APPROVED v1.0 实现（PV-G2b-04a / CHG-20261104-10 批准）。 */
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
    soc: '%', energy: 'kWh', frequency: 'Hz', speed: 'rpm', ratio: '%',
    irradiance: 'W/m²', /* PV-001 新轨（PV001_G2B_SPEC_APPROVED v1.0 §8 C-3/C-6）：纯增项 */
    temperature: 'K', pressure: 'kPa' /* GT-001 L1 thermo 轨（GTL1-IMP-Q2，CHG-20261104-12）：纯增项 */
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
      sig({ id: 'I_ref_A', label: '控制器电流目标', shortLabel: 'I_ref', unit: 'A', category: 'current', sourceKind: 'CONTROLLER', definition: '控制器下发的电池电流参考，默认 25 A（=10 kW / 0.4 kV）。', formula: 'I_ref = (P_load − 20)/0.4', precision: 2, chart: { style: 'dashdot', colorToken: 'warm', axis: 'left' }, blindVisible: true }),
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
        { id: 'A-l0', text: '控制器为行为级一阶闭环（健康/传感器轨 τ = 1.5 s、执行器限幅轨 τ = 0.4 s），不是经过验证的设备控制器。' },
        { id: 'A-fl-clamp', text: '变流器限幅为理想钳位（min 语义）：target = min(I_ref − b(t), I_cap)，自 t_start 起生效；无恢复动态、无保护动作、无 t_clear。' },
        { id: 'A-gen-lag', text: '（仅负载阶跃场景生效）发电机按一阶惯性源 τ_gen = 2.0 s 追踪负载需求与电池功率之差。' }
      ],
      limitations: [
        '单一恒定负载、理想母线、无保护动作与故障传播。',
        '不含电池老化、热管理、变换器开关动态与电网交互。',
        'L0 行为级演示模型；非实测、非 Simulink、无实测对比。',
        '退化域：load0 ≤ 20 kW 时 I_ref ≤ 0，min 钳位 no-op（故障零效果），I_bat_cap_A 显示负值；锚点数值仅对 load0 = 30 kW 成立。',
        'normalizeConfig 不钳位 load_kW：合法域仅由 UI bounds（10…45 kW）保证，手拼配置可破 ±25 kW 包络。'
      ],
      equations: [
        { id: 'EQ-1', latex_text: 'I_meas(t) = I_true(t) + b(t)', note: '测量通道偏置叠加' },
        { id: 'EQ-2', latex_text: 'τ·dI_true/dt + I_true = I_ref − b(t), τ = 1.5 s', note: '闭环反馈等效一阶模型' },
        { id: 'EQ-3', latex_text: 'I_true(t) = 15 + 10·e^{−(t−20)/1.5} (t ≥ 20 s)', note: '默认故障后解析解' },
        { id: 'EQ-4', latex_text: 'P_bat = 0.4·I_bat, P_gen = P_load − P_bat', note: '功率换算与理想平衡' },
        { id: 'EQ-5', latex_text: 'SOC(t) = SOC0 − ∫P_bat dt / (40 kWh) × 100%', note: 'SOC 积分定义' },
        { id: 'EQ-6', latex_text: 'r_true = P_gen + P_bat,true − P_load; r_meas = P_gen + P_bat,meas − P_load', note: '真实/测量残差定义' },
        { id: 'EQ-A', latex_text: 'I_cap = I_ref × magnitude/100, I_ref = (P_load − 20)/0.4; target = min(I_ref − b(t), I_cap)', note: '变流器限幅（钳位式，min 语义，自 t_start 起）；actuator 轨 b ≡ 0' },
        { id: 'EQ-B', latex_text: 'τ·dI_true/dt + I_true = target; τ = 1.5 s（healthy/sensor 轨）、τ = 0.4 s（actuator 轨）', note: '执行器双轨一阶跟随（EQ-2 的 τ 按轨细分）' }
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
      sig({ id: 'I_fc_ref_A', label: '电堆电流目标', shortLabel: 'I_fc,ref', unit: 'A', category: 'current', sourceKind: 'CONTROLLER', definition: '控制器下发的电堆电流参考，默认 50 A（=20 kW / 0.4 kV）。', formula: 'I_fc_ref = (P_load − 10)/0.4', precision: 2, chart: { style: 'dashdot', colorToken: 'warm', axis: 'left' }, blindVisible: true }),
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
        closedLoopEffect: '功率分配器以 τ_ref = 2.5 s 一阶跟随 (P_load − 10)/0.4 抬升 I_fc_ref，电堆再以 τ_fc = 1.2 s 跟随 I_fc_ref；电池先补瞬态后回到 10 kW',
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
      model_version: '1.1.0',
      assumptions: [
        { id: 'A-ideal-bus', text: '直流母线 400 V 理想，无母线动态与压降。' },
        { id: 'A-const-v', text: '电堆与电池均按 0.4 kV 等效恒压处理：P_kW = 0.4 × I_A。' },
        { id: 'A-ideal-balance', text: '电池缓冲为理想平衡源：P_bat = P_load − P_fc，无功率爬坡限制。' },
        { id: 'A-soc-linear', text: 'SOC 由电池功率积分线性折算，不含温度、OCV-SOC 非线性与效率损耗。' },
        { id: 'A-valve-linear', text: '阀开度与电堆电流按线性映射处理；阀卡涩场景实现为电堆电流上限比例（I_fc,cap = I_fc_ref × magnitude%），不含阀门机械动态。' },
        { id: 'A-ideal-limiter', text: '电池缓冲与 DC/DC 变换器的限幅为理想上限建模，无恢复动态、无保护动作。' },
        { id: 'A-fc-soc-est', text: '电池 SOC 估计由功率管理器按 P_load − P_fc,meas 平衡估算（EMS 级），非电池电流库仑积分；测量偏差会进入 SOC 估计。' },
        { id: 'A-fc-first-order', text: '电堆电流按一阶响应（τ_fc = 1.2 s）跟随目标，不含热管理、水管理与气体传输动态。' },
        { id: 'A-fc-dispatcher', text: '电堆参考电流 I_fc_ref 由功率分配器以 τ_ref = 2.5 s 一阶跟随 (P_load − 10)/0.4，随负载自适应；不是阶跃设定值（仅 load_step 轨激活该动态，其余轨为恒值）。' },
        { id: 'A-l0', text: '功率控制器为行为级闭环，不是经过验证的设备控制器。' }
      ],
      limitations: [
        '不含电堆热管理、水管理、气体扩散与寿命衰减。',
        '不含 DC/DC 开关动态与效率曲线；电池缓冲视为理想源。',
        'L0 行为级演示模型；非实测、非 Simulink、无实测对比。',
        '包络适用域声明：±25 kW 电池包络仅限锚点场景；load_step 幅值 > 15 kW 即越界（幅值 +20 kW → max|P_bat| = 30 kW）。',
        '执行器轨越界域：卡涩开度 < 25% 即越界（load0 = 30 kW 时 20% → max|P_bat| = 26 kW）；开度 55% 且 load0 > 43.33 kW 时越界。',
        '极端角点（load0 = 45 kW、load_step +20 kW）：需求 65 kW、I_fc_ref → 137.5 A、P_fc = 55 kW；电堆无功率上限建模（为 20 kW 基准的 2.75 倍）。'
      ],
      equations: [
        { id: 'EQ-1', latex_text: 'I_fc,meas = I_fc + b(t)', note: '测量通道偏置叠加' },
        { id: 'EQ-2', latex_text: 'τ_fc·dI_fc/dt + I_fc = I_fc_ref − b(t), τ_fc = 1.2 s', note: '电堆电流闭环一阶模型' },
        { id: 'EQ-3', latex_text: 'P_fc = 0.4·I_fc, P_bat = P_load − P_fc,true', note: '功率换算与电池平衡' },
        { id: 'EQ-4', latex_text: 'r_true = P_fc,true + P_bat − P_load; r_meas = P_fc,meas + P_bat,meas − P_load', note: '真实/测量残差定义' },
        { id: 'EQ-5', latex_text: 'SOC_true = SOC0 − ∫P_bat,true dt / (40 kWh) × 100%', note: 'SOC 积分定义' },
        { id: 'EQ-6', latex_text: 'τ_ref·dI_fc_ref/dt + I_fc_ref = (P_load(t) − 10)/0.4, τ_ref = 2.5 s', note: '功率分配器级一阶跟随；仅 load_step 轨激活（其余轨 I_fc_ref = (P_load − 10)/0.4 恒值）' }
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
    tagline: '在 20 秒注入 +0.3 Hz 转速测量偏置，看调速器积分如何把真实频率拉到 49.7 Hz。热力学耦合频率响应演示（L1 · thermo 默认轨；swing/linear 遗留轨），非机组/电网动态验证。',
    level: 'L1 · 热力学耦合频率响应演示（G2b 已批准）',
    summary: '燃气涡轮驱动同步发电机（25 kW 基准）接入 400 V 等效母线，电池缓冲提供一次调频；调速器按转速测量积分调节燃料指令，经压气机-燃烧室-透平效率链与燃烧室集总热惯性给出电功率，负载 30 kW。三轨 inertia_model：thermo（默认）/ swing / linear（遗留轨）。GT-001 L1 热力学耦合频率响应演示获用户书面批准（G2b，GTL1_G2B_SPEC_APPROVED v1.0，CHG-20261104-12）；非机组/电网动态验证。',
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
      /* A-1 双轨 → L1 三轨（GTL1_G2B_SPEC_APPROVED v1.0 §2.4 Q2/Q4 定案，CHG-20261104-12）：
         thermo=L1 热力链轨（默认，Q4 翻转定案）；swing=完整摇摆方程（遗留轨，gt001_v2 口径）；
         linear=f≈f₀ 线性化（遗留轨，gt001_v1 口径）。已归档场次携带已解析 cfg 键、重放稳定。 */
      inertia_model: 'thermo',
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
        description: '同步发电机与转子等效惯量；频率状态 f 由完整摇摆方程驱动：df/dt = (P_gen + P_bat − P_load)/K_J × (f₀/f)。',
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
      { id: 'thermal', label: '热力' },
      { id: 'soc', label: 'SOC' },
      { id: 'residual', label: '残差' },
      { id: 'actuator', label: '执行器' }
    ],
    signals: [
      sig({ id: 'f_true_Hz', label: '真实频率', shortLabel: 'f_true', unit: 'Hz', category: 'frequency', sourceKind: 'MODEL_STATE', definition: '同步发电机真实电频率（转子惯量状态，完整摇摆方程）。', formula: 'df/dt = (P_gen + P_bat − P_load)/K_J × (f₀/f), K_J = 5 kW·s/Hz, f₀ = 50 Hz', precision: 4, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'f_meas_Hz', label: '电气频率量测', shortLabel: 'f_meas', unit: 'Hz', category: 'frequency', sourceKind: 'OBSERVATION', definition: '同步发电机电气频率量测（健康通道，= 真实频率），供 Agent 与转速通道做冗余交叉校验。', formula: 'f_meas = f_true', precision: 4, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true, noiseSigma: 0.01 }),
      sig({ id: 'n_meas_rpm', label: '转速传感器读数', shortLabel: 'n_meas', unit: 'rpm', category: 'frequency', sourceKind: 'OBSERVATION', definition: '故障转速传感器输出（同步机 2 极等价）：n_meas = 60 × (f_true + b(t))；调速器使用 n_meas/60 作为反馈频率。', formula: 'n_meas = 60 × (f_true + b(t))', precision: 1, chart: { style: 'dashed', colorToken: 'obs', axis: 'right', step: true }, blindVisible: true, noiseSigma: 0.6 }),
      sig({ id: 'P_gen_true_kW', label: '发电机真实功率', shortLabel: 'P_gen,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '发电机真实出力；thermo 轨（L1）由热力链给出 P_gen = η_m·(P_turb − P_comp)，swing/linear 遗留轨一阶跟随调速器指令。', formula: 'thermo: P_gen = η_m·(P_turb − P_comp)（EQ-GTL1-6）；swing/linear: τ_g·dP_gen/dt + P_gen = P_gen_cmd, τ_g = 2.0 s', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_gen_meas_kW', label: '发电机测量功率', shortLabel: 'P_gen,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '发电机功率测量（健康通道）。', formula: 'P_gen,meas = P_gen,true', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true, noiseSigma: 0.15 }),
      sig({ id: 'P_gen_cmd_kW', label: '调速器功率指令', shortLabel: 'P_gen,cmd', unit: 'kW', category: 'power', sourceKind: 'CONTROLLER', definition: '调速器积分输出的指令，钳位 [0, 40] kW；thermo 轨语义 = 调速器燃料指令（等效功率指令域 kW_eq），swing/linear 遗留轨为功率指令。', formula: 'dP_gen,cmd/dt = Ki × (50 − f_meas), Ki = 2.0 kW/(Hz·s)', precision: 3, chart: { style: 'dashdot', colorToken: 'warm', axis: 'left' }, blindVisible: true }),
      sig({ id: 'P_bat_true_kW', label: '电池真实功率', shortLabel: 'P_bat,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '电池一次调频真实功率（放电为正）。', formula: 'P_bat = 5 − 24 × (f_meas − 50) kW', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_bat_meas_kW', label: '电池测量功率', shortLabel: 'P_bat,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '电池功率测量（健康通道）。', formula: 'P_bat,meas = P_bat,true', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true, noiseSigma: 0.15 }),
      sig({ id: 'P_load_demand_kW', label: '负载需求功率', shortLabel: 'P_load', unit: 'kW', category: 'power', sourceKind: 'CONFIG', definition: '负载需求功率；load_step 场景在故障时刻阶跃。', formula: 'P_load = 30 kW（load_step: +magnitude）', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left', step: true }, blindVisible: true }),
      sig({ id: 'P_load_served_kW', label: '负载实际获得功率', shortLabel: 'P_served', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '负载实际获得的功率。', formula: 'P_load,served = P_load,demand', precision: 2, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_rotor_kW', label: '转子惯量功率', shortLabel: 'P_rotor', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '转子释放/吸收的惯量功率；真实守恒含该项。', formula: 'P_rotor = P_gen + P_bat − P_load = K_J·(f/f₀)·df/dt', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'V_bus_V', label: '母线等效电压', shortLabel: 'V_bus', unit: 'V', category: 'power', sourceKind: 'MODEL_ASSUMPTION', definition: 'AC 整流后等效母线电压，恒为 400 V（模型假设）。', formula: 'V_bus = 400 V', precision: 0, chart: { style: 'solid', colorToken: 'ink', axis: 'left', defaultVisible: false }, blindVisible: true, tableOnly: true }),
      sig({ id: 'SOC_true_pct', label: '电池真实 SOC', shortLabel: 'SOC_true', unit: '%', category: 'soc', sourceKind: 'MODEL_STATE', definition: '电池缓冲真实荷电状态。', formula: 'SOC_true = SOC0 − ∫P_bat,true dt / 40 kWh × 100%', precision: 5, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'SOC_est_pct', label: '电池估计 SOC', shortLabel: 'SOC_est', unit: '%', category: 'soc', sourceKind: 'OBSERVATION', definition: '由电池功率测量积分得到的 SOC 估计。', formula: 'SOC_est = SOC0 − ∫P_bat,meas dt / 40 kWh × 100%', precision: 5, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true }),
      sig({ id: 'r_true_kW', label: '真实功率平衡残差（含转子项）', shortLabel: 'r_true', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '含转子惯量项的真实守恒残差，是定义恒等式（代数一致性，不是物理验证），理想模型下恒为 0。', formula: 'r_true = P_gen + P_bat − P_load − P_rotor', precision: 6, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'f_channel_diff_Hz', label: '转速−电气频率通道不一致', shortLabel: 'f_diff', unit: 'Hz', category: 'frequency', sourceKind: 'DERIVED', exposure: 'blind_observable', definition: '转速与电气两个测量通道的频率冗余不一致（n_meas/60 − f_meas）；健康时恒为 0，转速偏置期间等于偏置量。这是测量通道偏差的直接体现，不是能量损失。', formula: 'f_channel_diff = n_meas/60 − f_meas', precision: 4, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' } }),
      sig({ id: 'valve_cmd_pct', label: '燃料阀指令开度', shortLabel: 'valve_cmd', unit: '%', category: 'actuator', sourceKind: 'CONTROLLER', definition: '由调速器功率指令换算的燃料阀指令；卡涩场景持续上升。', formula: 'valve_cmd = clamp(P_gen_cmd / 40 × 100%, 0, 100)', precision: 1, chart: { style: 'dashdot', colorToken: 'warm', axis: 'right' }, blindVisible: true }),
      sig({ id: 'valve_meas_pct', label: '燃料阀实际开度', shortLabel: 'valve_meas', unit: '%', category: 'actuator', sourceKind: 'OBSERVATION', definition: '燃料阀实际开度测量；卡涩场景为 magnitude%。', formula: 'valve_meas = valve_cmd（卡涩：magnitude%）', precision: 1, chart: { style: 'dashed', colorToken: 'obs', axis: 'right', step: true }, blindVisible: true }),
      sig({ id: 'P_gen_cap_kW', label: '发电机功率上限（燃料指令域上限）', shortLabel: 'P_gen,cap', unit: 'kW', category: 'actuator', sourceKind: 'FAULT_EVENT', definition: '燃料阀卡涩场景下的指令域上限 = u_cap = 40 × magnitude%（Q5 定案：thermo 轨实际 P_gen 由热力链给出，actuator 稳态 18.27 kW ≠ 20.00——钳位域差异为跨深度教学点；swing/linear 遗留轨为功率域钳位、P_gen 恰等于该值）。其他场景不可用（null）。', formula: 'u_cap = 40 × magnitude%（燃料指令域）', precision: 2, chart: { style: 'dashed', colorToken: 'fault', axis: 'left', step: true } }),
      /* GT-001 L1 八新热力信号（GTL1_G2B_SPEC_APPROVED v1.0 §1.2；B-1 定案：sourceKind
         前四 = MODEL_STATE、后四 = DERIVED，两值默认映射均落 public_demo——全非盲显，
         不设置 blindVisible/exposure 覆盖，盲包观测面不扩）。仅 thermo 轨填充数值，
         swing/linear 遗留轨全程 null（无热力面）。 */
      sig({ id: 'T3_out_K', label: '燃烧室出口温度', shortLabel: 'T3', unit: 'K', category: 'thermal', sourceKind: 'MODEL_STATE', definition: '燃烧室出口/透平进口温度（L1 新动态状态，ODE 状态向量 y=[f,T3] 之二；swing/linear 遗留轨无热力面，全程 null）。', formula: 'C_3·dT3/dt = η_b·Q_f − ṁ_g·cp_g·(T3 − T2), C_3 = 0.335983796442745 kJ/K, T3(0) = 1173 K', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left' } }),
      sig({ id: 'T2_out_K', label: '压气机出口温度', shortLabel: 'T2', unit: 'K', category: 'thermal', sourceKind: 'MODEL_STATE', definition: '压气机出口温度（ε_c 效率链代数输出；swing/linear 遗留轨全程 null）。', formula: 'T2 = T1·(1 + (π_c^a_c − 1)/ε_c), T1 = 288.15 K, ε_c = 0.82', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left' } }),
      sig({ id: 'p2_out_kPa', label: '压气机出口压力', shortLabel: 'p2', unit: 'kPa', category: 'thermal', sourceKind: 'MODEL_STATE', definition: '压气机出口压力（压比-转速耦合面 π_c·p1；swing/linear 遗留轨全程 null）。', formula: 'p2 = π_c·p1, π_c = π_c0·(f/f₀)², π_c0 = 8.0, p1 = 101.325 kPa', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left' } }),
      sig({ id: 'T4_out_K', label: '透平出口温度（EGT）', shortLabel: 'T4', unit: 'K', category: 'thermal', sourceKind: 'MODEL_STATE', definition: '透平出口温度/排气温度 EGT（ε_t 效率链代数输出；swing/linear 遗留轨全程 null）。', formula: 'T4 = T3·(1 − ε_t·(1 − π_t^(−a_t))), π_t = (1−β_b)·p2/p1, ε_t = 0.86', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left' } }),
      sig({ id: 'Q_fuel_kW', label: '燃料功率', shortLabel: 'Q_f', unit: 'kW', category: 'thermal', sourceKind: 'DERIVED', definition: '燃料功率（k_f·u_eff；执行器激活窗内取指令域钳位后的 u_eff）；swing/linear 遗留轨全程 null。', formula: 'Q_f = k_f·u_eff, k_f = 4.070531454334211 kW_eq/单位指令', precision: 3, chart: { style: 'solid', colorToken: 'warm', axis: 'left' } }),
      sig({ id: 'P_comp_kW', label: '压气机耗功', shortLabel: 'P_comp', unit: 'kW', category: 'thermal', sourceKind: 'DERIVED', definition: '压气机耗功（效率链代数输出；swing/linear 遗留轨全程 null）。', formula: 'P_comp = ṁ_a·cp_a·(T2 − T1), ṁ_a = 0.144299140389011 kg/s, cp_a = 1.005 kJ/(kg·K)', precision: 3, chart: { style: 'solid', colorToken: 'warm', axis: 'left' } }),
      sig({ id: 'P_turb_kW', label: '透平出功', shortLabel: 'P_turb', unit: 'kW', category: 'thermal', sourceKind: 'DERIVED', definition: '透平出功（效率链代数输出；swing/linear 遗留轨全程 null）。', formula: 'P_turb = ṁ_g·cp_g·(T3 − T4), cp_g = 1.148 kJ/(kg·K)', precision: 3, chart: { style: 'solid', colorToken: 'warm', axis: 'left' } }),
      sig({ id: 'eta_cycle_pct', label: '循环折算效率', shortLabel: 'η_cycle', unit: '%', category: 'thermal', sourceKind: 'DERIVED', definition: '模型口径燃料-电功率折算比（教学口径，不对应任何设备热耗率；设计点 24.57%；swing/linear 遗留轨全程 null）。', formula: 'η_cycle = P_gen/Q_f（EQ-GTL1-12）', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left' } })
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
      /* A-1（CHG-20261102-01）：swing 双轨落地，model_version 1.0.0 → 1.1.0；
         L1 thermo 轨（GTL1_G2B_SPEC_APPROVED v1.0，CHG-20261104-12 批准）：1.1.0 → 1.2.0 */
      model_version: '1.2.0',
      assumptions: [
        { id: 'A-ideal-bus', text: 'AC 整流后母线按 400 V 等效理想处理，无母线动态。' },
        { id: 'A-lumped-inertia', text: '转子等效惯量集中参数 K_J = 5.0 kW·s/Hz；完整摇摆方程（swing 轨）：df/dt = (P_gen + P_bat − P_load)/K_J × (f₀/f)，由二次型动能能量守恒导出。' },
        { id: 'A-droop', text: '电池一次调频为线性下垂：P_bat = 5 − 24 × (f_meas − 50) kW，使用健康电气频率量测 f_meas；无死区、无延迟。' },
        { id: 'A-gov-integral', text: '调速器为积分控制：dP_gen_cmd/dt = 2.0 × (50 − f_gov)，f_gov = n_meas/60 来自故障转速传感器通道；指令钳位 [0, 40] kW。' },
        { id: 'A-freq-redundant', text: '转速传感器通道与电气频率量测 f_meas 互为冗余：二者不一致（n_meas/60 − f_meas = b）是传感器故障的可检出特征。' },
        { id: 'A-gen-lag', text: '发电机功率按一阶惯性（τ_g = 2.0 s）跟随指令（swing/linear 遗留轨）。' },
        { id: 'A-soc-linear', text: 'SOC 由电池功率积分线性折算，不含温度、效率与老化。' },
        { id: 'A-l0', text: '降阶行为级模型，不含电网暂态、励磁与保护动作。' },
        { id: 'A-gt-swing-full', text: '【仅 inertia_model=swing 遗留轨适用（L1 thermo 起为遗留轨声明，gt001_v2 口径）】完整摇摆方程：df/dt = (P_rotor/K_J)·(f₀/f)，由 E_kin(f) = (K_J·f₀/2)·(f/f₀)² = 125·(f/50)² kW·s 能量守恒 dE_kin/dt = P_rotor 导出；f = f₀ 处精确退化为线性式。稳态与惯量形式无关（由 f_gov→50 决定），瞬态较线性轨加深（load_step 默认参数 nadir −0.41066 vs −0.41050 Hz）。' },
        { id: 'A-gt-inertia-lin', text: '【仅 inertia_model=linear 遗留轨适用】摇摆方程为 f≈f₀ 线性化 df/dt = P_rotor/K_J（有效性边界 |Δf| ≤ 1 Hz；参数域极端 mag=1.0 Hz 时 Δf=−0.982 Hz 贴边）；线性化能量 E_lin = K_J·Δf 与二次型动能 E_kin 之差为截断残差 K_J·Δf²/(2f₀)。swing 轨下该截断不存在（能量守恒精确成立）。' },
        { id: 'A-gt-bat-rating', text: '电池连续额定 ±5 kW、短时额定 ±15 kW（变流器 3× 过载，假设非实测）、物理包络 ±25 kW；工作点超 ±15 kW 时依赖短时过载能力，长时运行须降额。' },
        { id: 'A-gt-antiwindup-clamp', text: '调速器积分钳位 [0, 40] kW 为钳位式抗饱和；故障期间指令 wound-up 至上限，清除后若指令不回置，P_gen 将过冲并引起频率上摆（见局限）。' },
        /* GT-001 L1 thermo 轨 assumptions（GTL1_G2B_SPEC_APPROVED v1.0 §6.2 八条，CHG-20261104-12 批准） */
        { id: 'A-gtl1-idealgas', text: '【thermo 轨】理想气体、定比热近似（cp_a=1.005、cp_g=1.148 kJ/(kg·K)，γ_a=1.4、γ_g=4/3 常数）；变比热与燃气成分变化未建模（见局限）。' },
        { id: 'A-gtl1-chain-qs', text: '【thermo 轨】压气机/透平为拟稳态效率链（ε_c=0.82、ε_t=0.86 常数效率）；动态仅存在于燃烧室集总热容与转子惯量；η_m=0.95 为机械+发电机集总效率。' },
        { id: 'A-gtl1-combustor-lump', text: '【thermo 轨】燃烧室能量平衡 + 集总热容 C_3：τ_3 = 2.0 s 为教学整定等效时间常数（假设非实测参数），与 L0b τ_g 同值为有意的同尺度对照设计——跨深度分歧来自链非线性与回路增益（1.332 vs 1.0），不来自时间常数。' },
        { id: 'A-gtl1-fuel-map', text: '【thermo 轨】燃料指令 u（等效功率指令域，钳位 [0,40]）线性映射燃料功率 Q_f = k_f·u；k_f 与 ṁ_a 由设计点双条件（u=25 ⇔ P_gen=25 kW ∧ T3=1173 K）闭合导出（设计点标定，非设备参数辨识）；无阀门非线性/死区（沿袭 L0b 执行器面）。' },
        { id: 'A-gtl1-speed-coupling', text: '【thermo 轨】压比-转速耦合为二次线性化 π_c = π_c0·(f/f₀)²（单轴同速假设）；有效性域 |Δf| ≤ 1 Hz（默认参数预填场景最大 0.41 Hz；sensor +1.0 稳态角点恰在边界，贴边声明）；空气流量 ṁ_a 常数（流量-转速耦合未建模）。|Δf| ≤ 1 Hz 系承袭 A-gt-inertia-lin 2% 口径（f₀=50 Hz 下 |Δf| ≤ 1 Hz）的假设性声明、非本链自有推导，据此登记为假设而非推导结论；sensor_drift mag=1.0 暂态最小 f 由 gt001_l1 oracle 域扫描冻结（越界则回改本条或限制幅值域）。' },
        { id: 'A-gtl1-rotor-balance', text: '【thermo 轨】转子平衡保留 L0b 定义恒等：P_rotor = P_gen + P_bat − P_load（r_true 检查面零涟漪）；P_gen = η_m·(P_turb − P_comp) 由热力链给出。' },
        { id: 'A-gtl1-actuator-cmd-domain', text: '【thermo 轨】执行器与调速器钳位作用于燃料指令域（u_cap = 40·magnitude%）；实际电功率由热力链给出，与 L0b 功率域钳位（P_gen = 40·magnitude% 精确值）不同——P_gen 物理包络 [−8.3, +45.0] kW 超出 L0b [0,40]。' },
        { id: 'A-gtl1-l1', text: '【thermo 轨】热力链为教学尺度降阶循环模型，不是经过验证的设备控制器或机组热力学模型。' }
      ],
      limitations: [
        '单机无穷大母线等效，无电网潮流与多机交互。',
        '不含励磁调压（AVR）、功率角稳定性、保护动作（低频减载/过频过流）、负荷频率特性（负荷自调节 D）、多机惯量分散与网损、AC/DC 整流动态、调速器死区与非线性阀特性（燃烧/透平最小热力链见 thermo 轨 L1 局限条目）。',
        '执行器死区：actuator magnitude ≥62.5% 时 P_gen_cap ≥ 平衡点 25 kW，钳位不生效、故障不可观（或收紧参数域上限至 ~60%）。',
        'swing/linear 遗留轨（L0b）为单机等效频率响应的一阶/一阶跟随降阶示意；thermo 轨（L1）为教学尺度降阶热力链示意，非机组/电网动态验证。',
        'L0 行为级演示模型；非实测、非 Simulink、无实测对比。',
        /* GT-001 L1 thermo 轨未建模项（GTL1_G2B_SPEC_APPROVED v1.0 §6.1，L1 新增 8 项 + 定位句） */
        '【thermo 轨】压气机特性图（喘振/堵塞边界、变工况效率）未建模——仅 π_c = π_c0·(f/f₀)² 二次线性化；流量-转速耦合未建模（ṁ_a 常数）。',
        '【thermo 轨】变比热 cp(T)/γ(T) 未建模（定比热豁免）；燃气成分随燃料比的变化仅以 cp_g/γ_g 常数近似——η_cycle 为模型内部折算比，与任何真实循环热效率数字不可互比。',
        '【thermo 轨】透平冷却气量、叶顶间隙与性能老化未建模。',
        '【thermo 轨】燃烧动态（点火延迟、熄火边界、贫富油极限）未建模；燃烧室金属热容与燃气热容不分离（C_3 为集总等效）。',
        '【thermo 轨】进排气压力损失/环境动态未建模（T1/p1 为 ISO 常数；高度/气温修正未建模；排气 p4 = p1 无损失豁免）。',
        '【thermo 轨】轴系扭转模态、轴承摩擦未建模（η_m 为机械+电气集总效率）。',
        '【thermo 轨】发电机电磁暂态、励磁/AVR、功率角稳定性未建模（沿袭 L0b 未建模清单）。',
        '【thermo 轨】保护系统未建模扩展到热力面：超温（T3 上限）、超速、喘振、熄火保护均不动作——注册域内 T3 峰值 1524.9 K / 清除过冲 +0.32 Hz 为合法演示值。',
        '【thermo 轨】零燃料停机/盘车工况未建模：u=0 时压气机耗功 > 无燃烧透平功，负净功为模型外推伪影（物理对应停机）；注册域内 u_min = 6.98（sensor +1.0 角点）不可达；如未来开放燃料配置须先立钳位。'
      ],
      equations: [
        { id: 'EQ-1', latex_text: 'df/dt = (P_gen + P_bat − P_load)/K_J × (f₀/f), K_J = 5.0 kW·s/Hz, f₀ = 50 Hz', note: '完整摇摆方程（swing 轨默认；线性轨遗留式 df/dt = ΔP/K_J 在 f=f₀ 处退化一致）' },
        { id: 'EQ-2', latex_text: 'P_bat = P_bat,ref − K_bat·(f_meas − 50), K_bat = 24 kW/Hz', note: '电池一次调频' },
        { id: 'EQ-3', latex_text: 'dP_gen,cmd/dt = Ki·(50 − f_meas), Ki = 2.0 kW/(Hz·s)', note: '调速器积分（含抗积分饱和钳位）' },
        { id: 'EQ-4', latex_text: 'τ_g·dP_gen/dt + P_gen = P_gen,cmd, τ_g = 2.0 s', note: '发电机一阶跟随（swing/linear 遗留轨）' },
        { id: 'EQ-5', latex_text: 'f_meas = f (健康电气量测); n_meas = 60·(f + b(t)); f_gov = n_meas/60', note: '双通道频率测量与偏置' },
        { id: 'EQ-6', latex_text: 'P_rotor = P_gen + P_bat − P_load = K_J·(f/f₀)·df/dt', note: '转子惯量功率（守恒含该项；linear 遗留轨为 K_J·df/dt）' },
        /* GT-001 L1 thermo 轨方程（GTL1_G2B_SPEC_APPROVED v1.0 §2.2 EQ-GTL1-1…12，CHG-20261104-12 批准） */
        { id: 'EQ-GTL1-1', latex_text: 'π_c = π_c0·(f/f₀)²; p2 = π_c·p1, π_c0 = 8.0, p1 = 101.325 kPa', note: '压比-转速耦合（单轴同速假设的二次线性化；有效性域 |Δf| ≤ 1 Hz 系承袭 A-gtl1-speed-coupling 假设性声明）' },
        { id: 'EQ-GTL1-2', latex_text: 'T2 = T1·(1 + (π_c^a_c − 1)/ε_c), T1 = 288.15 K, a_c = 2/7, ε_c = 0.82', note: '压气机效率链（isen 温差/ε_c）' },
        { id: 'EQ-GTL1-3', latex_text: 'Q_f = k_f·u_eff, k_f = 4.070531454334211; ṁ_f = Q_f/LHV, LHV = 50000 kJ/kg; ṁ_g = ṁ_a + ṁ_f, ṁ_a = 0.144299140389011 kg/s', note: '燃料映射与燃气流量（k_f/ṁ_a 为设计点导出常量，15 位有效数字登记）' },
        { id: 'EQ-GTL1-4', latex_text: 'C_3·dT3/dt = η_b·Q_f − ṁ_g·cp_g·(T3 − T2), C_3 = 0.335983796442745 kJ/K, η_b = 0.99, cp_g = 1.148 kJ/(kg·K)', note: '燃烧室能量平衡 + 集总热容（新动态状态 T3，T3(0) = 1173 K）' },
        { id: 'EQ-GTL1-5', latex_text: 'p3 = (1−β_b)·p2, β_b = 0.04; π_t = p3/p1; T4 = T3·(1 − ε_t·(1 − π_t^(−a_t))), ε_t = 0.86, a_t = 1/4', note: '透平效率链（EGT）' },
        { id: 'EQ-GTL1-6', latex_text: 'P_comp = ṁ_a·cp_a·(T2−T1); P_turb = ṁ_g·cp_g·(T3−T4); P_gen = η_m·(P_turb − P_comp), η_m = 0.95', note: '功率链（L0b 的 τ_g 一阶跟随由 T3 惯性 + 代数链替代）' },
        { id: 'EQ-GTL1-7', latex_text: 'df/dt = (P_rotor/K_J)·(f₀/f); P_rotor = P_gen + P_bat − P_load', note: '摇摆方程保留为机械接口（Q1 定案：P_rotor 定义恒等式，r_true 检查面零涟漪）' },
        { id: 'EQ-GTL1-8', latex_text: 'P_bat = P_bat_ref − K_bat·(f − 50), P_bat_ref = 5, K_bat = 24', note: '电池下垂原样（真值 f）' },
        { id: 'EQ-GTL1-9', latex_text: 'f_gov = (monitor ∧ sensor_drift) ? f : f + b; u_next = clamp(u + Ki·(50 − f_gov)·h, 0, 40), Ki = 2.0', note: '调速器积分原样（仅输出语义改为燃料指令域）' },
        { id: 'EQ-GTL1-10', latex_text: '执行器激活窗内 u_eff = min(u, u_cap), u_cap = 40·magnitude%；清除（t_clear）后 u_eff = u', note: '指令域钳位（L0b 钳 P_gen 功率域 → L1 钳燃料指令域；Q5 定案：P_gen_cap_kW 保留指令域口径）' },
        { id: 'EQ-GTL1-11', latex_text: '设计点闭合：u=25 ∧ f=50 ∧ 稳态 ⇒ P_gen = 25.000000 kW ∧ T3 = 1173.000 K（双条件联立导出 k_f 与 ṁ_a）', note: '设计点标定条件（k_f/ṁ_a 按评审 A 独立精确解 15 位登记：燃烧室平衡残差 4.3e-14 kW、P_gen 误差 0）' },
        { id: 'EQ-GTL1-12', latex_text: 'C_3·(T3(t)−T3(0)) ≡ ∫₀ᵗ(η_b·Q_f − ṁ_g·cp_g·(T3−T2))dt（检查式，RK4 离散自洽）; E_fuel = ∫Q_f dt; η_cycle = E_gen/E_fuel', note: '能量恒等检查与新指标（设计点 η_cycle = 24.57%；gt-energy-consistency thermo 分支承载）' }
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
  /* PV-001 光伏并网等效系统（PV001_G2B_SPEC_APPROVED v1.0，CHG-20261104-10 批准；
     实现 = PV-G2b-04a/V070 §2 T3。§1 全量：拓扑 / 17 信号 / EQ-PV-1..7 / 2 故障族） */
  /* ================================================================== */
  var PV001 = {
    id: 'PV-001',
    title: '光伏并网等效系统',
    shortTitle: '光伏并网',
    experimentCode: 'PV-001',
    experimentName: '辐照度传感器偏置',
    tagline: '在 20 秒注入 +100 W/m² 辐照度测量偏置，看 MPPT 如何把测量偏差变成真实出力偏移。光伏 L0 行为演示，不含电化学/气象/效率模型。',
    level: 'L0 · 光伏并网等效演示（G2b 已批准）',
    summary: '光伏阵列经 MPPT 与理想逆变器接入 400 V 等效母线，与理想平衡馈线共同为 30 kW 恒定负载供电；MPPT 按辐照度测量通道解析计算目标功率，阵列一阶跟随。光伏为不可调度电源：出力由环境辐照度与 MPPT 决定，不响应负载指令（拓扑上无 load→MPPT 信号边）。G2b 规格已批准（PV001_G2B_SPEC_APPROVED v1.0）。',
    questions: [
      '辐照度测量偏高时，MPPT 为什么会把真实出力抬高？',
      '闭环为什么能把测量故障吸收进自洽（d_pv 稳态归零），仅监测为什么能让它持续暴露？',
      '真实电能与基于辐照度估计的电能如何分离（ΔE_pv 承担 SOC_est 的功能位）？'
    ],
    duration_s: 60,
    dt_s: 0.1,
    topologyViewBox: [0, 0, 1000, 620],
    defaults: {
      feedback_mode: 'closed_loop',
      /* PV-001 无储能：initial 无 SOC 键（与 FL/FC/GT 的键面差异点，规格 §1.1） */
      initial: { load_kW: 30, G0_W_m2: 1000 },
      noise: { enabled: false, seed: 12345, level: 0 }
    },
    bounds: {
      load_kW: { min: 10, max: 45 },
      G0_W_m2: { min: 300, max: 1000 }
    },
    components: [
      comp({
        id: 'pv_array', label: '光伏阵列', kind: 'pv_array', role: '10 kW 基准（STC）· 解析 P_mpp',
        description: '光伏阵列（L0 解析最大功率 P_mpp = k·G·φ_T，无 I-V 曲线）；shading_step 场景有效辐照度全平面均匀阶跃下降。',
        x: 60, y: 60, w: 190, h: 96, faultable: true,
        inspector: [
          { id: 'P_pv_true_kW', source: 'MODEL_STATE' },
          { id: 'P_mpp_true_kW', source: 'MODEL_STATE' },
          { id: 'G_true_W_m2', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'mppt', label: 'MPPT 控制器', kind: 'controller', role: '测量辐照度→目标功率→一阶跟随',
        description: '行为级一阶跟随（τ=1.0 s）：按测量辐照度解析计算目标功率；不是经过验证的设备控制器。',
        x: 300, y: 250, w: 190, h: 100, faultable: false,
        inspector: [
          { id: 'P_mpp_ref_kW', source: 'CONTROLLER' },
          { id: 'G_meas_W_m2', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'inverter', label: '逆变器', kind: 'converter', role: '理想 DC→AC 功率传递',
        description: '理想逆变器：P_ac = P_pv，无开关动态、无效率曲线、无无功控制。',
        x: 310, y: 60, w: 170, h: 96, faultable: false,
        inspector: [
          { id: 'P_ac_kW', source: 'MODEL_STATE' },
          { id: 'P_pv_true_kW', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'bus', label: '等效母线', kind: 'bus', role: '400 V 等效（功率平衡抽象）',
        description: '400 V 等效母线：功率平衡的抽象等效，不是电网模型；无电压/频率动态、无功与网损。',
        x: 540, y: 60, w: 160, h: 96, faultable: false,
        inspector: [
          { id: 'V_bus_V', source: 'MODEL_ASSUMPTION' },
          { id: 'r_true_kW', source: 'DERIVED' },
          { id: 'r_meas_kW', source: 'DERIVED' }
        ]
      }),
      comp({
        id: 'grid', label: '电网馈线（理想平衡源）', kind: 'grid', role: '理想双向补差源 · 初始 20 kW 展示',
        description: '理想平衡功率馈线，瞬时吸收/补齐母线剩余功率；初始 20 kW 仅用于展示，不代表真实电网侧动态。',
        x: 760, y: 60, w: 190, h: 96, faultable: false,
        inspector: [
          { id: 'P_grid_true_kW', source: 'MODEL_STATE' },
          { id: 'P_grid_meas_kW', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'load', label: '负载', kind: 'load', role: '恒定 30 kW',
        description: '恒定功率负载；PV-001 无 load_step 族（负载恒定是结构设定，不可调度电源的教学对照面）。',
        x: 760, y: 250, w: 190, h: 96, faultable: false,
        inspector: [
          { id: 'P_load_demand_kW', source: 'CONFIG' },
          { id: 'P_load_served_kW', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'sensor', label: '辐照度传感器', kind: 'sensor', role: '辐照度测量 · 故障注入点',
        description: '辐照度测量通道（与阵列同平面采样）；sensor_drift 场景注入阶跃偏置，MPPT 按错误辐照度重算目标。',
        x: 60, y: 250, w: 180, h: 88, faultable: true,
        inspector: [
          { id: 'G_true_W_m2', source: 'MODEL_STATE' },
          { id: 'bias_W_m2', source: 'FAULT_EVENT' },
          { id: 'G_meas_W_m2', source: 'OBSERVATION' }
        ]
      })
    ],
    edges: [
      { id: 'pv_array->inverter', from: 'pv_array', to: 'inverter', kind: 'power', label: '直流功率' },
      { id: 'inverter->bus', from: 'inverter', to: 'bus', kind: 'power', label: '交流馈入' },
      { id: 'grid->bus', from: 'grid', to: 'bus', kind: 'power', label: '补偿功率' },
      { id: 'bus->load', from: 'bus', to: 'load', kind: 'power', label: '30 kW 需求' },
      { id: 'pv_array->sensor', from: 'pv_array', to: 'sensor', kind: 'measurement', label: '辐照度采样（与阵列同平面）' },
      { id: 'sensor->mppt', from: 'sensor', to: 'mppt', kind: 'measurement', label: 'G_meas' },
      /* 刻意无 load→mppt 边：不可调度电源的结构声明（规格 §1.1） */
      { id: 'mppt->pv_array', from: 'mppt', to: 'pv_array', kind: 'signal', label: 'MPPT 目标功率' }
    ],
    faultAnchors: { sensor_drift: 'sensor', shading_step: 'pv_array' },
    signalCategories: [
      { id: 'irradiance', label: '辐照度' },
      { id: 'power', label: '功率' },
      { id: 'residual', label: '残差' }
    ],
    signals: [
      sig({ id: 'G_true_W_m2', label: '有效真实辐照度', shortLabel: 'G_true', unit: 'W/m²', category: 'irradiance', sourceKind: 'MODEL_STATE', definition: 'PV 阵列平面有效真实辐照度（遮挡为全平面均匀阶跃，非局部遮挡）。', formula: 'G_true = G0 − ΔG·1(t≥t0)', precision: 1, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'G_meas_W_m2', label: '辐照度测量', shortLabel: 'G_meas', unit: 'W/m²', category: 'irradiance', sourceKind: 'OBSERVATION', definition: '辐照度传感器输出 = 真实辐照度 + 传感器偏置。', formula: 'G_meas = G_true + b(t)', precision: 1, chart: { style: 'dashed', colorToken: 'obs', axis: 'left', step: true }, exposure: 'blind_observable', noiseSigma: 2.0 }),
      sig({ id: 'bias_W_m2', label: '辐照度传感器偏置', shortLabel: 'b(t)', unit: 'W/m²', category: 'irradiance', sourceKind: 'FAULT_EVENT', definition: '故障注入的辐照度测量偏置，阶跃信号。', formula: 'b(t)=0 (t<20 s), b(t)=+100 W/m² (t≥20 s)', precision: 1, chart: { style: 'dashed', colorToken: 'fault', axis: 'right', step: true } }),
      sig({ id: 'P_mpp_true_kW', label: '理论最大功率', shortLabel: 'P_mpp,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '当前有效辐照度下的理论最大功率（L0 解析，无 I-V 曲线与工作点约束）。', formula: 'P_mpp,true = k·G_true·φ_T, k = 0.01 kW/(W/m²)', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_mpp_ref_kW', label: 'MPPT 目标功率', shortLabel: 'P_mpp,ref', unit: 'kW', category: 'power', sourceKind: 'CONTROLLER', definition: 'MPPT 按辐照度通道解析计算的目标功率：闭环用测量辐照度，仅监测用真实辐照度。', formula: 'P_mpp,ref = k·G_loop·φ_T；G_loop = G_meas（闭环）/ G_true（仅监测）', precision: 3, chart: { style: 'dashdot', colorToken: 'warm', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'P_pv_true_kW', label: '阵列真实出力', shortLabel: 'P_pv,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '阵列真实输出功率（受控功率源以 τ_mppt = 1.0 s 一阶跟随 MPPT 目标）。', formula: 'τ_mppt·dP_pv/dt + P_pv = P_mpp,ref, τ_mppt = 1.0 s', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_pv_meas_kW', label: '阵列测量功率', shortLabel: 'P_pv,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '阵列功率测量（健康通道，= 真实出力）。', formula: 'P_pv,meas = P_pv,true', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable', noiseSigma: 0.15 }),
      sig({ id: 'P_pv_est_kW', label: 'EMS 辐照度折算估计', shortLabel: 'P_pv,est', unit: 'kW', category: 'power', sourceKind: 'DERIVED', definition: 'EMS 按测量辐照度折算的阵列功率估计；恒用测量辐照度，不随运行模式切换。', formula: 'P_pv,est = k·G_meas·φ_T', precision: 3, chart: { style: 'dotted', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'd_pv_kW', label: 'MPPT 一致性残差', shortLabel: 'd_pv', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '阵列测量功率与 EMS 估计之差（代数恒等，不是能量损失）；sensor_drift 闭环稳态归零、仅监测恒为 −0.01·b。', formula: 'd_pv = P_pv,meas − P_pv,est', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'P_ac_kW', label: '逆变器交流出力', shortLabel: 'P_ac', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '逆变器交流输出功率（理想逆变 P_ac = P_pv）。', formula: 'P_ac = P_pv,true', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_grid_true_kW', label: '馈线真实功率', shortLabel: 'P_grid,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '电网馈线真实功率（受电为正；理想双向补差，倒送为负且不建模约束）。', formula: 'P_grid = P_load − P_pv,true', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_grid_meas_kW', label: '馈线测量功率', shortLabel: 'P_grid,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '馈线功率测量（健康通道）。', formula: 'P_grid,meas = P_grid,true', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable', noiseSigma: 0.15 }),
      sig({ id: 'P_load_demand_kW', label: '负载需求功率', shortLabel: 'P_load', unit: 'kW', category: 'power', sourceKind: 'CONFIG', definition: '恒定功率负载；PV-001 无 load_step 族（负载恒定是结构设定，不可调度电源的教学对照面）。', formula: 'P_load = 30 kW', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'P_load_served_kW', label: '负载实际获得功率', shortLabel: 'P_served', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '负载实际获得的功率（理想母线即需求功率）。', formula: 'P_load,served = P_load,demand', precision: 2, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'V_bus_V', label: '等效母线电压', shortLabel: 'V_bus', unit: 'V', category: 'power', sourceKind: 'MODEL_ASSUMPTION', definition: '400 V 等效母线电压（功率平衡抽象的模型假设，不是仿真状态）。', formula: 'V_bus = 400 V', precision: 0, chart: { style: 'solid', colorToken: 'ink', axis: 'left', defaultVisible: false }, exposure: 'blind_observable', tableOnly: true }),
      sig({ id: 'r_true_kW', label: '真实功率平衡残差', shortLabel: 'r_true', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '真实功率守恒残差，理想模型下恒为 0。', formula: 'r_true = P_pv,true + P_grid,true − P_load,served', precision: 6, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'r_meas_kW', label: '测量一致性残差', shortLabel: 'r_meas', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '由测量构造的功率平衡残差；全部功率测量通道健康，恒为 0（与 FL-001 传感器偏置的 +4 kW 测量残差形成教学对照）。', formula: 'r_meas = P_pv,meas + P_grid,meas − P_load,served', precision: 2, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable' })
    ],
    faults: [
      fault({
        id: 'G_sensor_bias', family: 'sensor_drift', label: '辐照度传感器偏置', shortLabel: '传感器漂移',
        target: 'sensor',
        description: '辐照度测量通道注入阶跃偏置，MPPT 按错误测量值重算目标功率，阵列真实出力跟随测量值偏移。',
        params: [{ key: 'magnitude', label: '偏置幅值', unit: 'W/m²', min: 20, max: 300, step: 10, default: 100, precision: 0, help: '正偏置使 MPPT 高估辐照度，闭环下真实出力跟随测量值上升' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: 'MPPT 目标由 10 kW 升至 k·(G0+b)（默认 11.00 kW），阵列 τ=1.0 s 跟随，馈线 20→19 kW；d_pv 瞬态 −1.00 kW 后归零（稳态自洽，测量冗余失效）',
        monitorEffect: '真实出力不变；G_meas 与 P_pv,est 跳变，d_pv ≡ −0.01·b = −1.00 kW，ΔE_pv = +0.0111 kWh（估计偏多）',
        causalTemplateId: 'pv-sensor-drift'
      }),
      fault({
        /* fault id 与 pv001_v1 golden runs.shading_closed_loop.fault.fault_id 一致（T2 oracle 冻结面） */
        id: 'shading_step', family: 'shading_step', label: '遮挡阶跃（辐照度骤降）', shortLabel: '遮挡阶跃',
        target: 'pv_array',
        description: '有效辐照度全平面均匀阶跃下降（物理输入，与控制模式无关）；MPPT 重算目标，阵列一阶跟随下行。',
        params: [{ key: 'magnitude', label: '遮挡降幅', unit: 'W/m²', min: 50, max: 300, step: 25, default: 300, precision: 0, help: '有效辐照度阶跃下降，MPPT 重算目标，阵列一阶跟随；两模式同生效' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '物理输入，与控制模式无关：P_mpp,ref 10→7 kW，阵列跟随，馈线 20→23 kW；d_pv 瞬态 +3.00 kW（估计先跳、真实滞后）后归零',
        monitorEffect: '同闭环（物理输入，逐位同解——PV001_G2B_SPEC_APPROVED §3.2 复算实证）',
        causalTemplateId: 'pv-shading-step'
      })
    ],
    model: {
      model_id: 'pv.pv.l0',
      model_version: '1.0.0',
      assumptions: [
        { id: 'A-pv-ideal-bus', text: '母线 400 V 等效理想，无电压/频率动态、无功与网损；等效母线是功率平衡抽象，不是电网模型。' },
        { id: 'A-pv-ideal-inv', text: '逆变器理想功率传递（P_ac = P_dc），无开关动态、无效率曲线、无无功控制。' },
        { id: 'A-pv-mppt-firstorder', text: 'MPPT 为行为级一阶跟随（τ_mppt = 1.0 s，教学尺度等效常数，非实测参数）。' },
        { id: 'A-pv-mppt-est', text: 'MPPT 目标功率由辐照度测量通道解析计算（P_mpp,ref = k·G_meas·φ_T）；阵列按行为级受控功率源建模，不建模 I-V 工作点对目标超出理论最大功率的限制（正偏置闭环的真实出力可高于同辐照理论最大功率——该结构的直接推论，见 limitations）。' },
        { id: 'A-pv-temp-const', text: '电池温度 T_cell ≡ 25 °C（STC 常温口径）；温度系数 γ_T = −0.004 /°C 登记为常量、常温下不激活；不建模温度动态与热平衡。' },
        { id: 'A-pv-ideal-feeder', text: '电网馈线为理想双向平衡源：P_grid = P_load − P_pv，瞬时补差，无爬坡限制、无额定约束、无倒送约束。' },
        { id: 'A-pv-const-load', text: '负载恒定 30 kW；PV-001 无 load_step 族（负载恒定是结构设定，不可调度电源的教学对照面）。' },
        { id: 'A-pv-est-channel', text: 'P_pv,est 为 EMS 级辐照度折算估计，恒用测量辐照度 G_meas（不随运行模式切换）；d_pv 是测量链一致性残差（代数恒等），不是能量损失。' },
        { id: 'A-pv-l0', text: 'MPPT 控制为行为级闭环，不是经过验证的设备控制器。' }
      ],
      limitations: [
        'MPPT 扫描/扰动观察动态、追踪效率损失、多峰与部分遮挡空间分布（本模型遮挡为全平面均匀辐照度阶跃，非阵列局部遮挡）。',
        '温度系数激活（T_cell 恒 25 °C，γ_T 不激活）、温度动态与热平衡。',
        '逆变器效率曲线与开关动态、无功/电压控制、直流母线电容动态。',
        'I-V 曲线工作点约束（阵列输出可高于同辐照理论最大功率——A-pv-mppt-est 声明的结构推论；正偏置角点 G0=300、b=+300 时 P_pv=6.00 kW = 同辐照理论最大功率 3.00 kW 的 2 倍）。',
        '孤岛保护、低电压穿越、频率/电压穿越、防雷接地等并网保护面（无频率/电压概念）。',
        '云层/天气连续动态（仅阶跃输入）、季节与日出日落轨迹；倒送域（load < P_pv 时 P_grid < 0）为理想双向馈线的合法工作区，不建模倒送约束。',
        'L0 行为级演示模型；非实测、非 Simulink、无实测对比。',
        'PV-IMP-Q1 钳位声明（实现期定案）：normalizeConfig 无跨参数校验（FL-001 同款先例），手拼配置可致有效辐照度为负；引擎侧对有效辐照度钳 0（G_true < 0 → 0），批准参数域（G0 ∈ [300,1000]、ΔG ≤ 300）内钳位不生效。'
      ],
      equations: [
        { id: 'EQ-PV-1', latex_text: 'G_true(t) = G0 − ΔG·1(t ≥ t0); G_meas(t) = G_true(t) + b(t), b(t) = b0·1(t ≥ t0)', note: '输入与测量通道（t0 处右极限，post 采样行语义）' },
        { id: 'EQ-PV-2', latex_text: 'P_mpp,true(t) = k·G_true·φ_T; k = P_STC/G_STC = 10/1000 = 0.01 kW/(W/m²), φ_T = 1 + γ_T·(T_cell − 25), T_cell ≡ 25 °C, γ_T = −0.004 /°C', note: '解析最大功率（L0 简化：无 I-V 曲线；γ_T 登记常量，常温下 φ_T = 1 不激活）' },
        { id: 'EQ-PV-3', latex_text: 'P_mpp,ref(t) = k·G_loop·φ_T; G_loop = G_meas（closed_loop）/ G_true（monitor）', note: 'MPPT 目标；monitor 语义与 FL-001 同构（偏置不进入物理回路）' },
        { id: 'EQ-PV-4', latex_text: 'τ_mppt·dP_pv/dt + P_pv = P_mpp,ref, τ_mppt = 1.0 s, P_pv(0) = k·G0·φ_T; t0 后 P_pv(t) = P_ref(t0+) + (P_pv(t0−) − P_ref(t0+))·e^(−(t−t0)/τ)', note: 'MPPT 一阶跟随（分段常值目标，精确指数；初值 P_pv(0)=k·G0·φ_T 为 PV-DRAFT-Q2 定案，G0=1000 时全部锚点不变）' },
        { id: 'EQ-PV-5', latex_text: 'P_ac = P_pv,true; P_grid = P_load − P_pv,true; P_load = 30 kW', note: '理想逆变与理想瞬时平衡（馈线补差，A-pv-ideal-feeder）' },
        { id: 'EQ-PV-6', latex_text: 'r_true ≡ 0; r_meas ≡ 0（定义恒等）; d_pv = P_pv,meas − P_pv,est = P_pv,true − k·G_meas·φ_T', note: '残差与一致性通道；sensor_drift 闭环稳态 d_pv → 0、仅监测 d_pv ≡ −0.01·b；shading d_pv 瞬态指数衰减归零' },
        { id: 'EQ-PV-7', latex_text: 'E_x = ∫P_x dt（kW·s，÷3600 → kWh）; E_pv,est = ∫P_pv,est dt（事件感知解析积分）; ΔE_pv = E_pv,est − E_pv,true', note: '能量口径（本系统无 SOC——SOC_est 通道的功能位由 P_pv,est/ΔE_pv 承担）' }
      ]
    },
    acceptance: {
      reference: 'PV001_G2B_SPEC_APPROVED v1.0 §3（解析锚点，独立复算冻结；容差 P ±0.05 kW / E ±0.0005 kWh / d_pv(60) ≤1e-9 kW / r ≤1e-12 kW）',
      exactness: 'PV-001 事件后目标恒定 → 分段精确指数（引擎 foStep 同构），解析锚点在表列容差内一致',
      keyValues: {
        r_true_kW: 0, r_meas_kW: 0,
        A_sensor_drift_closed_loop: {
          P_pv_true_60_kW: 11.0, P_grid_true_60_kW: 19.0, P_mpp_true_60_kW: 10.0, P_mpp_ref_60_kW: 11.0,
          d_pv_60_kW: 0, max_abs_d_pv_kW: 1.0,
          E_pv_true_kWh: 0.1775, E_pv_est_kWh: 0.1777778, E_pv_err_kWh: 0.0002778,
          E_grid_kWh: 0.3225, E_load_kWh: 0.5
        },
        B_sensor_drift_monitor: {
          P_pv_true_60_kW: 10.0, P_grid_true_60_kW: 20.0, d_pv_60_kW: -1.0,
          E_pv_true_kWh: 0.1666667, E_pv_est_kWh: 0.1777778, E_pv_err_kWh: 0.0111111
        },
        C_shading_step_closed_loop: {
          P_pv_true_60_kW: 7.0, P_grid_true_60_kW: 23.0, max_abs_d_pv_kW: 3.0,
          E_pv_true_kWh: 0.1341667, E_pv_est_kWh: 0.1333333, E_pv_err_kWh: -0.0008333
        }
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
    },
    /* GT-001 thermo 轨叙事卡（V072 清算项 6/7；GTL1_G2B_SPEC_APPROVED v1.0 §3.2 分歧表）。
       定位声明：本卡是静态教学叙事面（跨深度对比卡），不是运行期故障因果模板——
       engine.buildCausal 按 fault.family 分派模板（system.causalTemplates[family]），
       既有 sensor_drift / load_step / actuator_fault 三模板零改动、运行期行为零变更；
       本卡经 FL.systems.causalTemplate('GT-001', 'thermo_track') 供教学/对比面引用，
       节点数值为 §3.2 v1.0 口径（与 tests/engine-gt.test.js 跨深度分歧断言同源：
       gt001_v2 冻结锚点 + thermo 轨 T-B 容差断言），不是经过验证的设备特性数字。 */
    thermo_track: {
      id: 'gt-thermo-cross-depth',
      headline: '同一故障、两种模型深度：GT-001 L0b swing ↔ L1 thermo 跨深度叙事卡（thermo 默认轨）',
      mechanismSummary: '测量偏置 → 效率链重新平衡：转速通道偏置 b → 调速器误认为频率偏高（f_gov = n_meas/60）→ 燃料指令 u 下调 → 燃烧室能量平衡左移（Q_f = k_f·u 下调 → T3 下探）→ 压气机-透平效率链重新平衡 → P_gen 稳态偏移。注意：PV-001「测量偏置 → MPPT 重算目标」的类比在此不适用——GT 的调速器是积分结构，偏置不改变目标映射，而是经积分持续误调燃料指令，直到把带偏置的 f_gov 拉回 50 Hz；稳态由控制器结构决定（f = 50 − b，两深度同），模型深度改变的是暂态路径与可观测面。',
      nodes: [
        {
          id: 'n1', order: 1, title: '偏置注入（两深度同一配置事实）', short: '转速通道 +0.3 Hz（+18 rpm）',
          layer: 'config', componentId: 'speed_sensor', signalIds: ['n_meas_rpm', 'f_meas_Hz'],
          detail: '偏置写进转速测量通道（n_meas = 60×(f_true + b)），健康电气频率量测 f_meas 不变。这一步是配置事实，与 inertia_model 无关——swing 与 thermo 轨的注入配置完全相同，分歧从下游开始。'
        },
        {
          id: 'n2', order: 2, title: '调速器积分误调燃料指令', short: 'u 下调；指令域不同不可直比',
          layer: 'mechanism', componentId: 'governor', signalIds: ['P_gen_cmd_kW'],
          detail: '调速器按故障转速通道积分（dP_gen_cmd/dt = Ki×(50 − f_gov)），把燃料指令从设计点 25 kW_eq 持续下调。指令域语义随深度不同：L0b swing 的指令是功率域 P_gen_cmd（稳态 17.80 kW），L1 thermo 的指令是燃料指令域 u（稳态 19.65 kW_eq）——同稳态、异指令，两个数字不能直接比较（§3.2 指令域行）。'
        },
        {
          id: 'n3', order: 3, title: 'T3 / 效率链重新平衡（L1 独有观测）', short: 'T3 1173 → 1044.16 K（t=60 采样）；T4 → 687.22 K',
          layer: 'observation', componentId: 'turbine', signalIds: ['T3_out_K', 'T4_out_K', 'Q_fuel_kW'],
          detail: '燃料功率 Q_f = k_f·u 下调 → 燃烧室能量平衡 η_b·Q_f = ṁ_g·cp_g·(T3 − T2) 左移 → T3 从设计值 1173 K 下探（t=60 采样 1044.16 K，趋向渐近稳态 1043.95 K），EGT T4 随之降至 687.22 K（渐近 686.96 K）——传感器偏置的热力学后果约 −83 K（EGT 下探），这在 L0b swing 轨完全不可见（无热力面）：模型深度的表达力差异，不是精度优劣声明。'
        },
        {
          id: 'n4', order: 4, title: 'P_gen 稳态偏移（两深度同值）', short: 'f = 50 − b = 49.7 Hz；稳态跨深度同',
          layer: 'observation', componentId: 'generator', signalIds: ['f_true_Hz', 'P_bat_true_kW'],
          detail: '真实频率稳态收敛到 49.7 Hz（= 50 − b）——调速器积分结构把带偏置的 f_gov 拉回 50 Hz，稳态由控制器结构决定、与模型深度无关（§3.2 稳态行：两深度同）；电池一次调频按健康频率量测补缺。两深度分歧在暂态路径：L1 回路增益 dP_gen/du ≈ 1.332（vs L0b 1.0），恢复更快（sensor f(60)：49.70050 vs 49.70548）。'
        },
        {
          id: 'n5', order: 5, title: '同故障暂态路径分歧（load_step / actuator / 清除）', short: 'nadir 49.590174 vs 49.589336；P_gen 18.266 vs 20.000 kW',
          layer: 'observation', componentId: 'generator', signalIds: ['f_true_Hz', 'P_gen_true_kW', 'P_rotor_kW'],
          detail: '同一故障在两种模型深度下的暂态/钳位分歧（§3.2 v1.0 口径）：load_step +10 的频率最低点 nadir 49.590174（thermo）vs 49.589336（swing，深 8.4e-4 Hz）——初瞬由摇摆方程主导、几乎同；f(60) 49.999347 vs 49.992213（thermo 快 7.1e-3 Hz，增益 1.332×）。actuator 50% 钳位语义域差异显性化：swing 功率域钳位 P_gen 恰 20.000 kW，thermo 燃料域钳位 u_eff=20 经效率链给出 18.266 kW（Δ = −1.73 kW，−8.7%）；f 稳态 49.719396 vs 49.791667。清除（t_clear=35）过冲 +0.3221 vs +0.213412 Hz——清除瞬间燃料域 40 kW_eq 经链上放大超过 L0b 的 40 kW。'
        },
        {
          id: 'n6', order: 6, title: '口径与边界声明', short: '结构决定稳态；深度改变暂态与表达力',
          layer: 'observation', componentId: 'bus', signalIds: ['r_true_kW', 'f_channel_diff_Hz'],
          detail: '口径：①「控制器结构决定稳态、模型深度改变暂态路径与可观测面」——本库跨深度教学点；②一致性通道两深度同构：r_true（含转子项定义恒等）恒为 0、f_channel_diff = +0.3 Hz 是测量通道偏差的直接体现，不是真实能量变化；③本卡引用数字为库内双实现复现值（gt001_v2 冻结锚点 + thermo 轨 T-B 容差断言），只在本演示模型假设（A-gtl1-* 八条）内成立，不是经过验证的设备控制器或机组热力学模型，不外推到真实设备。'
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '转速读数偏移进入调速器' },
        { from: 'n2', to: 'n3', label: '燃料指令下调' },
        { from: 'n3', to: 'n4', label: '效率链重新平衡' },
        { from: 'n1', to: 'n5', label: '同一故障、两种模型深度', dashed: true },
        { from: 'n5', to: 'n6', label: '口径与边界' }
      ],
      monitorNodes: [
        {
          id: 'm1', order: 1, title: '偏置注入（仅监测）', short: '偏置不进入物理回路',
          layer: 'config', componentId: 'speed_sensor', signalIds: ['n_meas_rpm'],
          detail: '仅监测模式下偏置只污染转速读数，调速器与电池调频使用健康频率量测——真实状态保持设计点。'
        },
        {
          id: 'm2', order: 2, title: '两深度逐点恒等', short: 'f ≡ 50 Hz ∧ T3 ≡ 1173 K',
          layer: 'observation', componentId: 'generator', signalIds: ['f_true_Hz', 'T3_out_K'],
          detail: '偏置不进入物理回路时两深度完全一致：f ≡ 50 Hz 且 T3 ≡ 1173 K（常数轨，§3.2 monitor 行）——跨深度分歧只存在于闭环反馈路径。'
        },
        {
          id: 'm3', order: 3, title: '一致性通道照常暴露', short: 'f_channel_diff = +0.3 Hz',
          layer: 'observation', componentId: 'speed_sensor', signalIds: ['f_channel_diff_Hz'],
          detail: '通道冗余不一致 f_channel_diff = +0.3 Hz 在两深度同样暴露测量通道偏差——检出依据与模型深度无关。'
        }
      ],
      monitorEdges: [
        { from: 'm1', to: 'm2', label: '不进入物理回路' },
        { from: 'm1', to: 'm3', label: '冗余不一致照常' }
      ],
      assumptions: ['A-gtl1-idealgas', 'A-gtl1-chain-qs', 'A-gtl1-combustor-lump', 'A-gtl1-fuel-map', 'A-gtl1-speed-coupling', 'A-gtl1-rotor-balance', 'A-gtl1-actuator-cmd-domain', 'A-gtl1-l1'],
      limitations: [
        '本卡为 thermo 轨静态叙事面，不是运行期故障因果模板——运行期因果链仍按 fault.family 由既有三模板分派。',
        '引用数值为库内双实现复现值（gt001_v2 冻结锚点 / thermo 轨 T-B 容差断言），非机组数据；不外推到真实设备。',
        'swing/linear 遗留轨无热力面（八个热力信号全程 null）；跨深度对比只在 thermo 轨有 T3/T4 观测。'
      ],
      alternatives: [{ title: '若切回 swing/linear 遗留轨', text: '同故障稳态不变（调速器积分结构相同），暂态路径不同（load_step nadir 49.589336 vs 49.590174）；热力面全程不可见（T3/T4 null）——「模型深度导致的表达力差异」，非精度优劣声明。' }]
    }
  };

  PV001.causalTemplates = {
    sensor_drift: {
      id: 'pv-sensor-drift',
      headline: 't={t0} s，{faultLabel}：{sign}{mag} {unit} 注入辐照度测量通道',
      /* PV001_G2B_SPEC_APPROVED §6.4：核心教学点 = 「闭环把测量故障藏进自洽」；
         r_meas ≡ 0（全功率测量通道健康）与 FL-001 的 +4 kW 测量残差形成教学对照。 */
      mechanismSummary: '偏置污染辐照度测量通道 → MPPT 按测量值重算目标功率 → 阵列真实出力跟随测量值上升 → 馈线补差减少。闭环把测量故障吸收进自洽：一致性残差 d_pv 瞬态 {d_pv_peak} kW 后稳态归零（测量冗余在稳态对被吸收的偏置不敏感）；r_meas ≡ 0 与 FL-001 传感器偏置的 +4 kW 测量残差形成教学对照。',
      nodes: [
        {
          id: 'n1', order: 1, title: '偏置注入', short: '辐照度偏置 {sign}{mag} {unit}',
          layer: 'config', componentId: 'sensor', signalIds: ['bias_W_m2'],
          detail: '因为 {t0} s 在{targetComponent}的测量通道注入了 {sign}{mag} {unit} 阶跃偏置（{t0} s 前为 0），所以测量辐照度的生成规则变为 G_meas = G_true + b(t)。这是配置定义的故障事实，不是测量噪声，也不是模型推断。',
          evidence: [{ varId: 'bias_W_m2', tStartOffset: -0.1, tEndOffset: 0.1, note: '事件前 b(t)=0，{t0} s 起 b(t)={sign}{mag} {unit}' }]
        },
        {
          id: 'n2', order: 2, title: '测量辐照度偏高', short: 'G_meas {G_meas_pre} → {G_meas_post} W/m²',
          layer: 'observation', componentId: 'sensor', signalIds: ['G_meas_W_m2', 'G_true_W_m2'],
          detail: '因为偏置直接叠加在测量通道上，所以测量辐照度在 {t0} s 由 {G_meas_pre} W/m² 跳到 {G_meas_post} W/m²；此时真实辐照度仍为 {G_true_post} W/m²，理论最大功率 P_mpp,true 保持 {P_mpp_true_60} kW。',
          evidence: [{ varId: 'G_meas_W_m2', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {G_meas_pre} W/m² → 20.0 s {G_meas_post} W/m²' }]
        },
        {
          id: 'n3', order: 3, title: 'MPPT 按测量值重算目标', short: 'P_mpp,ref {P_ref_pre} → {P_ref_post} kW',
          layer: 'mechanism', componentId: 'mppt', signalIds: ['P_mpp_ref_kW', 'G_meas_W_m2'],
          detail: '因为模型规定 MPPT 目标功率按辐照度测量通道解析计算（P_mpp,ref = k·G_meas·φ_T，EQ-PV-3），而测量辐照度被抬高 {mag} {unit}，所以目标功率从 {P_ref_pre} kW 升为 {P_ref_post} kW。MPPT 本身并不知道传感器存在偏置；真实辐照度未变，理论最大功率仍为 {P_mpp_true_60} kW。',
          evidence: [{ varId: 'P_mpp_ref_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: 'P_mpp,ref 保持 {P_ref_post} kW 不变，被污染的是辐照度输入通道' }]
        },
        {
          id: 'n4', order: 4, title: '阵列真实出力跟随上升', short: 'P_pv {P_pv_pre} → {P_pv_60} kW',
          layer: 'observation', componentId: 'pv_array', signalIds: ['P_pv_true_kW', 'P_pv_meas_kW'],
          detail: '因为阵列按受控功率源以 τ_mppt = 1.0 s 一阶跟随新目标 {P_ref_post} kW，所以真实出力从 {P_pv_pre} kW 升到 {P_pv_60} kW。闭环正偏置下真实出力高于同辐照理论最大功率 {P_mpp_true_60} kW——这是 A-pv-mppt-est 声明的结构推论（本模型不建模 I-V 工作点上限，见 limitations）。',
          evidence: [{ varId: 'P_pv_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障时刻后真实出力一阶上升：20.0 s {P_pv_pre} kW → 60.0 s {P_pv_60} kW' }]
        },
        {
          id: 'n5', order: 5, title: '馈线补差减少', short: 'P_grid {P_grid_pre} → {P_grid_60} kW',
          layer: 'observation', componentId: 'grid', signalIds: ['P_grid_true_kW'],
          detail: '因为负载恒定 {P_load_60} kW 且阵列多发了功率，所以理想馈线的补差功率由 {P_grid_pre} kW 降到 {P_grid_60} kW（受电为正，瞬时补差）。',
          evidence: [{ varId: 'P_grid_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s {P_grid_pre} kW → 60.0 s {P_grid_60} kW' }]
        },
        {
          /* ⑥ 一致性残差：代数恒等（PV001_G2B_SPEC_APPROVED §6.4 / UI_COPY_GUARDRAILS §3.3 口径）。
             d_pv 是测量链一致性的代数恒等，不是能量损失，也不是 ⑤ 的结果。 */
          id: 'n6', order: 6, title: 'MPPT 一致性残差', short: 'd_pv 瞬态 {d_pv_peak} kW → 稳态 {d_pv_60} kW；r_meas = {r_meas_max}',
          layer: 'observation', componentId: 'bus', signalIds: ['d_pv_kW', 'r_meas_kW', 'r_true_kW'],
          kind: 'algebraic_identity',
          epistemic: '代数恒等',
          detail: 'd_pv = P_pv,meas − P_pv,est = P_pv,true − k·G_meas·φ_T（代数恒等，不是能量损失）。估计通道按瞬时跳变、真实出力按 τ = 1.0 s 滞后，故 {t0} s 处 d_pv = {d_pv_peak} kW，随后随真实出力跟上而稳态归零（{d_pv_60} kW）——闭环把测量故障吸收进自洽，测量冗余在稳态对被吸收的偏置不敏感。r_meas = {r_meas_max} kW：全部功率测量通道健康，与 FL-001 传感器偏置的 +4 kW 测量残差形成教学对照；r_true = {r_true_max} kW。能量账本：E_pv = {E_pv} kWh、E_pv,est = {E_pv_est} kWh、ΔE_pv = {E_pv_err} kWh（MPPT 滞后缺口）。',
          evidence: [{ varId: 'd_pv_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障后 d_pv 从 {d_pv_peak} kW 指数回归 0（稳态自洽）' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '注入测量通道' },
        { from: 'n2', to: 'n3', label: '进入 MPPT 目标' },
        { from: 'n3', to: 'n4', label: '阵列一阶跟随' },
        { from: 'n4', to: 'n5', label: '馈线补差变化' },
        /* ⑥ 不挂在 ⑤ 下游：从 ② 测量通道分支以虚线接入（G0-DEC-13 同构） */
        { from: 'n2', to: 'n6', label: '测量通道偏差的代数当量', dashed: true }
      ],
      monitorNodes: [
        {
          id: 'm1', order: 1, title: '偏置注入', short: '辐照度偏置 {sign}{mag} {unit}',
          layer: 'config', componentId: 'sensor', signalIds: ['bias_W_m2'],
          detail: '因为 {t0} s 在{targetComponent}的测量通道注入了 {sign}{mag} {unit} 阶跃偏置，所以测量辐照度规则变为 G_meas = G_true + b(t)。本次运行是仅监测模式：偏置不进入物理回路，不影响真实出力。',
          evidence: [{ varId: 'bias_W_m2', tStartOffset: -0.1, tEndOffset: 0.1, note: '事件前 b(t)=0，{t0} s 起 b(t)={sign}{mag} {unit}' }]
        },
        {
          id: 'm2', order: 2, title: '测量辐照度偏高', short: 'G_meas {G_meas_pre} → {G_meas_post} W/m²',
          layer: 'observation', componentId: 'sensor', signalIds: ['G_meas_W_m2', 'G_true_W_m2'],
          detail: '因为偏置叠加在测量通道，所以测量辐照度由 {G_meas_pre} W/m² 跳到 {G_meas_post} W/m²；仅监测模式下真实辐照度保持 {G_true_post} W/m²，测量与真实分离。',
          evidence: [{ varId: 'G_meas_W_m2', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {G_meas_pre} W/m² → 20.0 s {G_meas_post} W/m²' }]
        },
        {
          id: 'm3', order: 3, title: '真实出力保持不变', short: 'P_pv ≡ {P_pv_pre} kW',
          layer: 'mechanism', componentId: 'pv_array', signalIds: ['P_pv_true_kW'],
          detail: '因为仅监测模式下 MPPT 目标改用真实辐照度（G_loop = G_true，EQ-PV-3 的 monitor 语义），所以阵列真实出力恒为 {P_pv_pre} kW、馈线恒为 {P_grid_60} kW；故障只改变测量与估计，不改变物理状态。',
          evidence: [{ varId: 'P_pv_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障期间真实出力保持 {P_pv_pre} kW' }]
        },
        {
          id: 'm4', order: 4, title: '一致性残差持续暴露', short: 'd_pv ≡ {d_pv_60} kW',
          layer: 'observation', componentId: 'bus', signalIds: ['d_pv_kW'],
          detail: '因为估计通道恒用测量辐照度（P_pv,est = k·G_meas·φ_T，不随运行模式切换），所以 d_pv = P_pv,true − k·G_meas·φ_T 在故障期间恒为 {d_pv_60} kW（= −0.01·b，代数恒等，不是能量损失）；与闭环稳态归零形成对照——仅监测让测量故障持续可见。',
          evidence: [{ varId: 'd_pv_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障期间 d_pv 恒为 {d_pv_60} kW' }]
        },
        {
          id: 'm5', order: 5, title: '估计电能偏多', short: 'ΔE_pv = {E_pv_err} kWh',
          layer: 'observation', componentId: 'pv_array', signalIds: ['P_pv_est_kW'],
          detail: '因为估计按被抬高的测量辐照度积分，所以 E_pv,est = {E_pv_est} kWh 高于真实 E_pv = {E_pv} kWh，ΔE_pv = {E_pv_err} kWh（估计偏多）；本系统无 SOC，SOC_est 通道的功能位由 P_pv,est/ΔE_pv 承担，真实电能与无故障基准相同。',
          evidence: [{ varId: 'P_pv_est_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '估计功率阶跃后保持 {P_ref_post} kW，与真实出力分离' }]
        }
      ],
      monitorEdges: [
        { from: 'm1', to: 'm2', label: '注入测量通道' },
        { from: 'm1', to: 'm3', label: '不进入物理回路' },
        { from: 'm2', to: 'm4', label: '估计通道读测量值' },
        { from: 'm3', to: 'm5', label: '真实能量不变，仅估计偏移' }
      ],
      assumptions: ['A-pv-ideal-bus', 'A-pv-ideal-feeder', 'A-pv-mppt-est', 'A-pv-est-channel', 'A-pv-l0'],
      limitations: ['τ_mppt = 1.0 s 为行为级等效时间常数，非实测参数。', '闭环正偏置下真实出力可高于同辐照理论最大功率（A-pv-mppt-est 结构推论）。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若为仅监测模式', text: '偏置不进入物理回路，真实出力保持 10 kW，只有测量辐照度、估计功率与 d_pv = −0.01·b 暴露故障；ΔE_pv = +0.0111 kWh（默认参数，估计偏多）。' }]
    },
    shading_step: {
      id: 'pv-shading-step',
      headline: 't={t0} s，{faultLabel}：有效辐照度下降 {mag} {unit}',
      mechanismSummary: '遮挡是物理输入阶跃，与控制模式无关：有效辐照度骤降 → MPPT 重算目标 → 阵列一阶跟随下行 → 馈线补差上升。d_pv 出现瞬态 {d_pv_peak} kW（估计先跳、真实滞后）后归零。',
      nodes: [
        {
          id: 'n1', order: 1, title: '遮挡阶跃注入', short: 'G_true {G_true_pre} → {G_true_post} W/m²',
          layer: 'config', componentId: 'pv_array', signalIds: ['G_true_W_m2'],
          detail: '因为 {t0} s 有效辐照度从 {G_true_pre} W/m² 阶跃下降 {mag} {unit} 到 {G_true_post} W/m²（全平面均匀遮挡，非局部遮挡），所以阵列的物理输入发生阶跃。这是配置定义的物理输入事实，与控制模式无关。',
          evidence: [{ varId: 'G_true_W_m2', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {G_true_pre} W/m² → 20.0 s {G_true_post} W/m²' }]
        },
        {
          id: 'n2', order: 2, title: '两模式同生效', short: '物理输入：闭环与仅监测同解',
          layer: 'mechanism', componentId: 'mppt', signalIds: ['P_mpp_true_kW', 'G_true_W_m2'],
          detail: '因为遮挡作用于物理输入而非测量通道，所以两种运行模式下物理过程完全相同（PV001_G2B_SPEC_APPROVED §3.2 复算实证：全序列最大差 0）；理论最大功率同步由 {P_ref_pre} kW 量级降为 {P_mpp_true_60} kW（t≥{t0} s）。',
          evidence: [{ varId: 'P_mpp_true_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '理论最大功率随有效辐照度同步阶跃' }]
        },
        {
          id: 'n3', order: 3, title: 'MPPT 目标重算', short: 'P_mpp,ref {P_ref_pre} → {P_ref_post} kW',
          layer: 'mechanism', componentId: 'mppt', signalIds: ['P_mpp_ref_kW'],
          detail: '因为 MPPT 按辐照度通道解析计算目标功率（P_mpp,ref = k·G_loop·φ_T，EQ-PV-3），而有效辐照度已阶跃下降，所以目标功率从 {P_ref_pre} kW 降为 {P_ref_post} kW（闭环与仅监测同值）。',
          evidence: [{ varId: 'P_mpp_ref_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {P_ref_pre} kW → 20.0 s {P_ref_post} kW' }]
        },
        {
          id: 'n4', order: 4, title: '阵列一阶跟随下行', short: 'P_pv {P_pv_pre} → {P_pv_60} kW',
          layer: 'observation', componentId: 'pv_array', signalIds: ['P_pv_true_kW'],
          detail: '因为阵列按受控功率源以 τ_mppt = 1.0 s 一阶跟随新目标 {P_ref_post} kW，所以真实出力从 {P_pv_pre} kW 降到 {P_pv_60} kW（指数衰减，无超调）。',
          evidence: [{ varId: 'P_pv_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障时刻后真实出力一阶下降：20.0 s {P_pv_pre} kW → 60.0 s {P_pv_60} kW' }]
        },
        {
          id: 'n5', order: 5, title: '馈线补差上升', short: 'P_grid {P_grid_pre} → {P_grid_60} kW',
          layer: 'observation', componentId: 'grid', signalIds: ['P_grid_true_kW'],
          detail: '因为负载恒定 {P_load_60} kW 且阵列少发了功率，所以理想馈线的补差功率由 {P_grid_pre} kW 升到 {P_grid_60} kW（受电为正，瞬时补差）。',
          evidence: [{ varId: 'P_grid_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s {P_grid_pre} kW → 60.0 s {P_grid_60} kW' }]
        },
        {
          id: 'n6', order: 6, title: '一致性残差瞬态', short: 'd_pv 瞬态 +{d_pv_peak} kW → {d_pv_60} kW',
          layer: 'observation', componentId: 'bus', signalIds: ['d_pv_kW', 'r_true_kW', 'r_meas_kW'],
          kind: 'algebraic_identity',
          epistemic: '代数恒等',
          detail: '遮挡时刻估计先跳（P_pv,est = k·G_meas·φ_T 立即下降）、真实出力滞后（τ_mppt = 1.0 s），d_pv = P_pv,meas − P_pv,est 出现 {d_pv_peak} kW 瞬态后随真实出力跟上而归零（{d_pv_60} kW；代数恒等，不是能量损失）。r_true = {r_true_max} kW、r_meas = {r_meas_max} kW 恒为零。能量账本：E_pv = {E_pv} kWh、E_pv,est = {E_pv_est} kWh、ΔE_pv = {E_pv_err} kWh（真实滞后缺口，估计按瞬时跳变）。',
          evidence: [{ varId: 'd_pv_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障后 d_pv 从 {d_pv_peak} kW 指数回归 0' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '物理输入阶跃' },
        { from: 'n2', to: 'n3', label: '目标重算' },
        { from: 'n3', to: 'n4', label: '一阶跟随' },
        { from: 'n4', to: 'n5', label: '馈线补差变化' },
        { from: 'n3', to: 'n6', label: '估计通道瞬时跳变', dashed: true },
        { from: 'n4', to: 'n6', label: '真实出力滞后' }
      ],
      assumptions: ['A-pv-ideal-bus', 'A-pv-ideal-feeder', 'A-pv-mppt-firstorder', 'A-pv-est-channel', 'A-pv-l0'],
      limitations: ['遮挡为全平面均匀辐照度阶跃，非阵列局部遮挡与 MPPT 扫描动态。', 'τ_mppt = 1.0 s 为行为级等效时间常数，非实测参数。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若遮挡发生在测量通道而非物理面', text: '那将成为 sensor_drift 类故障：闭环会把测量偏差变成真实出力偏移，仅监测则保持真实状态不变——与本物理输入阶跃（两模式同解）形成教学对照。' }]
    }
  };

  var ALL = [FL001, FC001, GT001, PV001];
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
    var cfg = {
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
    /* A-1：声明了惯性双轨的系统（GT-001）携带默认轨；未声明的系统不产生该字段 */
    if (s.defaults.inertia_model) cfg.inertia_model = s.defaults.inertia_model;
    return cfg;
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
