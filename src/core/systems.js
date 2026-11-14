/* owner: core-engine | module: systems | contract: docs/CONTRACT.md */
/* 六系统 SystemDef（FL-001 / FC-001 / GT-001 / PV-001 / WT-001 / MG-001）：拓扑、信号元数据、故障目录、模型假设、因果模板。
   纯数据 + 查询 API，挂在 FL.systems；不依赖 DOM / FL.protocol。
   PV-001 = PV001_G2B_SPEC_APPROVED v1.0 实现（PV-G2b-04a / CHG-20261104-10 批准）。
   FL-001 thermal 面 + WT-001 = FL001_THERMAL_G2B_SPEC_APPROVED v1.0 / WT001_G2B_SPEC_APPROVED v1.0
   实现（FLTH-G2b-04 / WT-G2b-04 systems.js 面，V080_WAVE_DESIGN / CHG-20261107-01 批准）。
   MG-001 = MG001_G2B_SPEC_APPROVED v1.0 实现（MG-G2b-04 systems.js 面，V110_WAVE_DESIGN §2 W5 /
   CHG-20261110-01 批准链）——additive 追加，既有五系统 SystemDef 字段语义零变化。 */
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
    /* on 轨专属列标记（FC-001 电化学三信号——FCECH-G2b-04 任务5裁定：registry.runHashInput
       signals 哈希面为整 signals 对象，null 列改变 off 轨 run_hash ⇒ 列仅 on 轨构建、off 轨
       结构性缺席；engine.makeSeries 按本标记门控。存在才落键——既有全部信号定义零变化）。 */
    if (o.onTrackOnly === true) s.onTrackOnly = true;
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
      /* FL-001 L1 thermal 轨开关（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §2.0，DEC-2 定案单键
         枚举）：thermal_model: off|on，默认 off——off 轨（L0/fl001_v1）为 P0 验收轨与教学主角，
         on 轨（L1/fl001_v2）经显式选择到达；FLTH-IMP-Q3 定案：用户未提默认翻转，默认 off 维持。
         engine normalizeConfig/validate 按本键盖章与枚举守卫（engine.js thermal_model 分支）。 */
      thermal_model: 'off',
      /* FL-001 容量/内阻二阶效应轨开关（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §1.1，裁定点二
         定案 (a) 组合键，CHG-20261114-01 批准链；FLTH thermal_model / FCECH electrochem_model
         additive 键先例同构）：capacity_model: off|on，默认 off——前置条件 thermal_model=on
         才可 on，(off,on) 非法组合结构化拒绝（Q11 定案双落点：engine validate + scenario
         declaresCapacity）。B-1(a) 定案：场景缺省轨解析只在 engine normalizeConfig 盖章层发生。
         on 轨声明面挂 model.capacity 子对象（model_hash 九字段域外——B-2 定案）。 */
      capacity_model: 'off',
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
      /* FL-001 L1 thermal 轨类目（FLTH §6.4；GT 先例同字面 systems.js thermal 类目）：纯增项 */
      { id: 'thermal', label: '热力' },
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
      sig({ id: 'r_meas_kW', label: '测量一致性残差', shortLabel: 'r_meas', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '由测量构造的功率平衡残差；故障期间为 +4 kW，是测量偏差，不是能量损失。', formula: 'r_meas = P_gen,true + P_bat,meas − P_load,served', precision: 2, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, blindVisible: true }),
      /* FL-001 L1 thermal 轨两新信号（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §1.2；B-1 定案
         CHG-20261107-01：sourceKind MODEL_STATE / DERIVED 两值默认映射均落 public_demo——
         全非盲显，不设置 blindVisible、不显式声明 exposure（GT-001 L1 八热信号 B-1 先例同构），
         盲包观测面不扩）。仅 thermal_model=on 轨填充数值，thermal_model=off 轨全程 null
         （makeSeries 按 SystemDef.signals 建列——GT 热信号在 swing/linear 遗留轨 null 先例）。 */
      sig({ id: 'T_bat_K', label: '电池温度（单节点集总）', shortLabel: 'T_bat', unit: 'K', category: 'thermal', sourceKind: 'MODEL_STATE', definition: '电池单节点集总温度（thermal_model=on 轨新动态状态，T_bat(0) = T_amb = 298.15 K 冷启动；thermal_model=off 轨无热力面，全程 null）。', formula: 'C_bat·dT_bat/dt = I_true²·R_int(T_bat) − h·(T_bat − T_amb), C_bat = 300 J/K, h = 10 W/K', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left' } }),
      sig({ id: 'P_loss_kW', label: '热损耗功率', shortLabel: 'P_loss', unit: 'kW', category: 'thermal', sourceKind: 'DERIVED', definition: '热损耗功率（模型记账项，不是能量损失；thermal_model=on 轨填充当前状态值，thermal_model=off 轨全程 null）。', formula: 'P_loss = I_true²·R_int(T_bat), R_int(T_bat) = R0·(1 + α·(T_bat − 298.15)), R0 = 0.2 Ω, α = 0.01 1/K', precision: 3, chart: { style: 'solid', colorToken: 'warm', axis: 'left' } }),
      /* FL-001 容量/内阻二阶效应轨新信号（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §1.2 B-3 列 +
         §8 FLCAP-G2b-04，CHG-20261114-01 批准链；FC 三信号 onTrackOnly 先例同构——systems.js
         T_st_K 行体例）：E_cap_kWh 单列（Q10 定案最小集，η_cap 由 E_cap 承载不出信号）。
         sourceKind DERIVED → exposure public_demo 默认映射（B-3 定案——algebraic 折算面与
         P_loss_kW DERIVED 同构）、全非盲显不设 blindVisible/不显式声明 exposure，盲包观测面
         零扩展。onTrackOnly = 列仅 capacity_model=on 轨构建（engine.makeSeries 门控跳过 +
         simulateFL001Capacity 补建——off 轨与 thermal on 无 capacity 轨 timeseries.signals
         逐字节不变 ⇒ run_hash 零变化，§2 新信号列门控行）。单位字典零新增（kWh 既有——
         UNITS energy 与 schema.js UNIT_DICT 实读核对）。signalCategories 归属 'soc' 类目
         （B-3 定案——既有六类目零改动，纯键面归属）。 */
      sig({ id: 'E_cap_kWh', label: '可用容量（温度折算）', shortLabel: 'E_cap', unit: 'kWh', category: 'soc', sourceKind: 'DERIVED', definition: '按电池温度折算的可用容量（记账面）：E_cap(T_bat) = η_cap(T_bat)·E_nom，E_nom = 40 kWh 铭牌容量不动（EQ-FLTH-11；capacity_model=on 轨填充当前状态代数值，off 轨与 thermal on 无 capacity 轨结构性缺席）。', formula: 'E_cap(T_bat) = η_cap(T_bat)·E_nom，η_cap(T) = max(η_floor, 1 − k_cap·max(0, T − T_cap0))，η_floor = 0.5, k_cap = 0.004 1/K, T_cap0 = 313.15 K', precision: 3, chart: { style: 'solid', colorToken: 'warm', axis: 'left' }, onTrackOnly: true })
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
      /* 模型身份按批准契约（DATA_CONTRACT_SPEC §1.1/§2.1）：FL-001 = fl001。
         model_version 1.1.0（FLTH-G2b-04 / B-1 定案 CHG-20261107-01：三段式 v2 归一样式，
         fl001.1 遗留样式在新 id 轮归一；thermal 轨类比 GT 1.1.0→1.2.0 为 minor 增位）。
         B-1 涟漪处置（登记进代码注释）：① scope.js classify 对 FL-001 不消费 modelVersion
         （校验链 = systemId/modelId/family/mode/initial/duration/dt/noise，modelVersion 校验
         仅存在于 FC-001 分支）——显式声明「不校验、仅登记」，scope.js 零改动；
         ② 旧存档（config 元数据 model_version='fl001.1'）重放预期非阻断（该值不参与
         classify 校验）；③ DATA_CONTRACT_SPEC / MODEL_VALIDATION_SPEC 中 'fl001.1' 字面
         引用失效面归 FLTH-G2b-04 工作面清单（文档侧同轮订正或登记双版本并存）。 */
      model_id: 'fl001',
      model_version: '1.1.0',
      assumptions: [
        { id: 'A-ideal-bus', text: '直流母线 400 V 理想，无母线动态与压降。' },
        { id: 'A-ideal-gen', text: '发电机视为理想平衡源，瞬时补偿剩余负载功率；初始 20 kW 仅用于展示。' },
        { id: 'A-const-v', text: '电池端电压按 0.4 kV 等效恒压处理：P_kW = 0.4 × I_A。' },
        { id: 'A-soc-linear', text: 'SOC 由功率积分线性折算，不含温度、OCV-SOC 非线性与效率损耗。' },
        { id: 'A-l0', text: '控制器为行为级一阶闭环（健康/传感器轨 τ = 1.5 s、执行器限幅轨 τ = 0.4 s），不是经过验证的设备控制器。' },
        { id: 'A-fl-clamp', text: '变流器限幅为理想钳位（min 语义）：target = min(I_ref − b(t), I_cap)，自 t_start 起生效；无恢复动态、无保护动作、无 t_clear。' },
        { id: 'A-gen-lag', text: '（仅负载阶跃场景生效）发电机按一阶惯性源 τ_gen = 2.0 s 追踪负载需求与电池功率之差。' },
        /* FL-001 L1 thermal 轨 assumptions（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §6.2 六条，
           CHG-20261107-01 批准；【仅 …适用】作用域句式沿 A-gt-swing-full 先例） */
        { id: 'A-flth-lump', text: '【仅 thermal_model=on 适用】电池为单节点集总热容模型：C_bat·dT_bat/dt = I_true²·R_int(T_bat) − h·(T_bat − T_amb)，T_bat(0) = T_amb = 298.15 K（冷启动）；内部温度分布与热管理动态未建模。' },
        { id: 'A-flth-params', text: '【仅 thermal_model=on 适用】R0 = 0.2 Ω、α = 0.01 1/K、C_bat = 300 J/K、h = 10 W/K 均为教学整定值（非实测参数）：量级按「60 s 演示窗内温升路径可见」整定（健康局稳态温升 14.3 K、时间常数 34.3 s），不对应任何真实电池包热特性或设备参数辨识。' },
        { id: 'A-flth-loss', text: '【仅 thermal_model=on 适用】热损耗记账口径：P_loss = I_true²·R_int(T_bat) 自电池支路扣除、由理想发电机补偿（P_gen = P_load − P_bat + P_loss）；能量恒等式为 E_source + E_bat = E_load + E_loss；r_true/r_meas 定义恒等含 −P_loss 项（损耗为模型已知结构项，不进一致性残差）；SOC 定义不动（P_bat,true = 0.4·I_true 口径不变）。' },
        { id: 'A-flth-no-feedback', text: '【仅 thermal_model=on 适用】热面对电气面零反馈：I_true/P_bat/SOC/测量链与 thermal_model=off 轨逐位同（温度对容量折算、内阻对电流的反馈不做）；跨深度对比的分歧全部位于热面与损耗补偿面。' },
        { id: 'A-flth-stability', text: '【仅 thermal_model=on 适用】热平衡稳定性条件 h > I_true²·R0·α 在注册参数域内成立（load_kW=45 角点 I²R0α = 7.81 < 10 W/K）；手拼配置越域可破该条件（无热保护，见局限）。' },
        { id: 'A-flth-l1', text: '【仅 thermal_model=on 适用】热模型为教学尺度单节点集总示意（L1），不是经过验证的设备控制器或电池热学模型。' }
      ],
      limitations: [
        '单一恒定负载、理想母线、无保护动作与故障传播。',
        '不含电池老化、热管理、变换器开关动态与电网交互。',
        'L0 行为级演示模型；非实测、非 Simulink、无实测对比。',
        '退化域：load0 ≤ 20 kW 时 I_ref ≤ 0，min 钳位 no-op（故障零效果），I_bat_cap_A 显示负值；锚点数值仅对 load0 = 30 kW 成立。',
        'normalizeConfig 不钳位 load_kW：合法域仅由 UI bounds（10…45 kW）保证，手拼配置可破 ±25 kW 包络。',
        /* FL-001 L1 thermal 轨未建模项（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §6.1 项 1…8，
           CHG-20261107-01 批准；与上方 L0 项并存不替换；定位句沿 house 句式） */
        '【thermal_model=on 轨】电池内部温度分布/双节点热网络未建模（单节点集总等效——C_bat 为集总等效热容）。',
        '【thermal_model=on 轨】R_int(T) 非线性未建模：线性温度系数为教学近似，真实电池低温侧 R 显著增大、高温侧 SEI/析锂效应未建模。',
        '【thermal_model=on 轨】热管理/冷却控制动态未建模（h 为常数牛顿冷却，无风扇/液冷回路建模）。',
        '【thermal_model=on 轨】与电气面的双向耦合未建模：温度对电流/电压/SOC 的反馈不做（温度对容量折算登记不做）——I_true 面零反馈是「电气面与 off 轨逐位同」的结构原因。',
        '【thermal_model=on 轨】环境动态未建模（T_amb = 298.15 K（25 °C）常数，昼夜/季节/通风变化未建模）。',
        '【thermal_model=on 轨】温度对容量/OCV/老化耦合未建模（热-电-老化方向，本波登记不做）。',
        '【thermal_model=on 轨】热保护未建模（高温降额/热失控保护/熔断——load0=45 角点渐近 655.29 K（≈382 °C）为合法演示值）。',
        '【thermal_model=on 轨】稳定性域边界：手拼配置 load_kW > 48.2843 kW（越界）可破 h > I_true²·R0·α 稳定性条件 → 正温度反馈失控（normalizeConfig 不钳位沿袭 L0 声明）；未来开放热参数配置须先立钳位。',
        '【thermal_model=on 轨】本模型为教学尺度单节点集总热模型示意（L1），非机组/电网动态验证。'
      ],
      equations: [
        { id: 'EQ-1', latex_text: 'I_meas(t) = I_true(t) + b(t)', note: '测量通道偏置叠加' },
        { id: 'EQ-2', latex_text: 'τ·dI_true/dt + I_true = I_ref − b(t), τ = 1.5 s', note: '闭环反馈等效一阶模型' },
        { id: 'EQ-3', latex_text: 'I_true(t) = 15 + 10·e^{−(t−20)/1.5} (t ≥ 20 s)', note: '默认故障后解析解' },
        { id: 'EQ-4', latex_text: 'P_bat = 0.4·I_bat, P_gen = P_load − P_bat', note: '功率换算与理想平衡' },
        { id: 'EQ-5', latex_text: 'SOC(t) = SOC0 − ∫P_bat dt / (40 kWh) × 100%', note: 'SOC 积分定义' },
        { id: 'EQ-6', latex_text: 'r_true = P_gen + P_bat,true − P_load; r_meas = P_gen + P_bat,meas − P_load', note: '真实/测量残差定义' },
        { id: 'EQ-A', latex_text: 'I_cap = I_ref × magnitude/100, I_ref = (P_load − 20)/0.4; target = min(I_ref − b(t), I_cap)', note: '变流器限幅（钳位式，min 语义，自 t_start 起）；actuator 轨 b ≡ 0' },
        { id: 'EQ-B', latex_text: 'τ·dI_true/dt + I_true = target; τ = 1.5 s（healthy/sensor 轨）、τ = 0.4 s（actuator 轨）', note: '执行器双轨一阶跟随（EQ-2 的 τ 按轨细分）' },
        /* FL-001 L1 thermal 轨方程（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §2.2.1 EQ-FLTH-1…9，
           CHG-20261107-01 批准，oracle/引擎唯一权威文本；EQ-FLTH-5/6/8 含 Q1/Q3/Q4 定案口径）。
           除 EQ-FLTH-1/7 逐字沿用电面外均为 on 域标注——thermal_model=off 轨 P_loss ≡ 0 退化，
           物理面与登记式零变化。 */
        { id: 'EQ-FLTH-1', latex_text: 'I_meas = I_true + b(t); τ·dI_true/dt + I_true = target（healthy/sensor 轨 target = I_ref − b，monitor 轨 target = I_ref，actuator 轨 target = min(I_ref, I_cap)、τ_act = 0.4 s）; P_bat,true = 0.4·I_true', note: '电气面原样（EQ-1/2/A/B 逐字沿用，A-const-v 恒压等效口径保留）；thermal on 不回写电气面' },
        { id: 'EQ-FLTH-2', latex_text: 'R_int(T_bat) = R0·(1 + α·(T_bat − 298.15))，T_bat 单位 K，R0 = 0.2 Ω, α = 0.01 1/K', note: '内阻温度面（任务书 °C 制 R0·(1+α·(T−25)) 的 K 制等价式，两式数值逐位同）；α>0 为正温度反馈（仅 thermal_model=on 轨）' },
        { id: 'EQ-FLTH-3', latex_text: 'P_loss = I_true²·R_int(T_bat)（W；信号面 P_loss_kW = P_loss/1000）', note: '焦耳热；I² 对充放电符号对称（充电同样发热——load0 ≤ 20 退化域教学点；仅 thermal_model=on 轨）' },
        { id: 'EQ-FLTH-4', latex_text: 'C_bat·dT_bat/dt = P_loss − h·(T_bat − T_amb), C_bat = 300 J/K, h = 10 W/K, T_bat(0) = T_amb = 298.15 K', note: '单节点集总热平衡（新动态状态；牛顿冷却；冷启动假设；仅 thermal_model=on 轨）' },
        { id: 'EQ-FLTH-5', latex_text: 'P_gen,true = P_load − P_bat,true + P_loss', note: '守恒面 (a)（Q1 定案 CHG-20261107-01）：热损耗由发电机补偿（模型记账口径）；off 轨原式 P_gen = P_load − P_bat（P_loss ≡ 0 退化，零变化）' },
        { id: 'EQ-FLTH-6', latex_text: 'r_true := P_gen,true + P_bat,true − P_load,served − P_loss ≡ 0; r_meas := P_gen,true + P_bat,meas − P_load,served − P_loss ≡ 0.4·b(t)', note: '定义恒等扩展（Q3 定案：r_meas 同轮扩展含 −P_loss，0.4·b 教学锚点两深度保持）；off 轨 P_loss ≡ 0 退化为原恒等式' },
        { id: 'EQ-FLTH-7', latex_text: 'SOC_true = SOC0 − ∫P_bat,true dt/(40 kWh)×100%; SOC_est = SOC0 − ∫P_bat,meas dt/(40 kWh)×100%', note: 'SOC 定义不动（P_bat,true = 0.4·I_true 口径不变 ⇒ SOC/∫I 面与 L0 逐位同）' },
        { id: 'EQ-FLTH-8', latex_text: 'E_loss = ∫P_loss dt（子步梯形，Q4 定案）; E_source = E_load − E_bat + E_loss', note: '损耗能量账本（kW·s ÷3600 → kWh）；E 恒等式 E_source + E_bat ≡ E_load + E_loss（守恒面 (a) 后果）' },
        { id: 'EQ-FLTH-9', latex_text: 'E_source + E_bat − E_load − E_loss ≡ 0（检查式）; θ_ss = I²·R0/(h − I²·R0·α)（θ = T_bat − T_amb 渐近稳态温升，稳定性条件 h > I²·R0·α）', note: 'oracle 自检 FL-2/FL-7 与 checks thermal 分支判据式；θ_ss 闭式为包络角点声明依据（load0=45 角点与 48.2843 kW 稳定性边界）' }
      ],
      /* FL-001 容量/内阻二阶效应轨声明面（B-2 定案 additive 子对象——FL001_CAPACITY_G2B_
         SPEC_APPROVED v1.0 §2 模型哈希面行/§8 FLCAP-G2b-04，CHG-20261114-01 批准链；
         FC001 model.electrochem 先例同构）：on_cap 轨全部声明面（A-flcap-* 五条、on 域
         limitations 5 项——A-9 新增 ⑤、EQ-FLTH-10…12 equations、level_on/summary_on 变体）
         挂本模型级 additive 字段，置于 model_hash 具名九字段哈希域之外（engine.js
         modelManifest hashObject 具名九键输入清单零变化 ⇒ model_hash/run_hash/config_hash
         既有输入全部零变化）；上方 assumptions/limitations/equations 五数组逐字节不动，
         UI 按轨条件渲染（on 显示本子对象，off 显示上方原文——诚实性由变体渲染承载）。
         文本 = 批准文本 §1.3/§1.6 冻结原文迁入（copy-guard 预检 §6.4 + 终检）。 */
      capacity: {
        assumptions: [
          { id: 'A-flcap-cap', text: '【仅 capacity_model=on 适用】可用容量按温度折算：E_cap(T_bat) = η_cap(T_bat)·E_nom，η_cap(T) = max(η_floor, 1 − k_cap·max(0, T − T_cap0))（η_floor = 0.5 > 0 正性下限——η_cap ∈ (0,1] 全域构造保证、E_cap ≥ 20 kWh、SOC 积分良定义；T_cap0 = 313.15 K、k_cap = 0.004 1/K）；为教学尺度折算面（教学示意），容量慢漂移与循环老化未建模。' },
          { id: 'A-flcap-params', text: '【仅 capacity_model=on 适用】β = 5×10⁻⁷ 1/K² 与 η_cap 折损形态参数（k_cap = 0.004 1/K、T_cap0 = 313.15 K、η_floor = 0.5）均为教学整定值（非实测参数）：按 60 s 演示窗内二阶效应可见、注册域单调与稳定性裕度整定（§3.3 域扫描证据），不对应任何真实电池包容量-温度特性或参数辨识；符号域 β ≥ 0、k_cap ≥ 0、η_floor > 0。' },
          { id: 'A-flcap-soc', text: '【仅 capacity_model=on 适用】SOC 折算口径：SOC_true 以 E_cap(T_bat) 为分母（记账面）；P_bat,true = 0.4·I_true 口径不动，功率链零反馈；SOC_est 维持铭牌容量测量记账口径与 thermal_model=on 轨逐位同；healthy 局 T_bat < T_cap0 ⇒ E_cap ≡ 40 kWh 精确 ⇒ SOC_true/SOC_est/SOC_err 与 fl001_v2 healthy 逐位同；SOC_err 为测量链偏差 + 容量折算双因——容量因子非零仅现于高温段（模型已知结构项、非测量故障——不是能量损失）。' },
          { id: 'A-flcap-stability', text: '【仅 capacity_model=on 适用】热平衡稳定性条件 h > I_true²·R0·(α + 2β·θ) 与稳态存在条件（判别式 ≥ 0）在注册参数域内成立（β 定案后角点复扫：I_max = 62.5 A 角点裕度 +1.0826 W/K、Δ = 3.564453、全域网格 min Δ > 0——§3.3）；手拼配置越域可破（无热保护，见局限）。' },
          { id: 'A-flcap-l1', text: '【仅 capacity_model=on 适用】容量-内阻二阶效应模型为教学尺度单状态集总示意（L1 扩展），不是经过验证的设备控制器或电池容量模型。' }
        ],
        limitations: [
          '【capacity_model=on 轨】容量慢漂移/循环老化未建模（教学示意折算面——ALINE §7 老化轴另立轨留位）。',
          '【capacity_model=on 轨】β 二次项为教学参数（真实电池 R(T) 高温段形态未建模——FLTH §6.1 项 2 扩域）。',
          '【capacity_model=on 轨】稳定性域边界移动（FLTH §3.4 登记的 load_kW > 48.2843 kW 越界边界在 capacity on 域失效——新界 load_kW > 46.4741 kW（I_b = 66.1854 A，β 定案重推：I_b = √(h/(R0(α+2√β)))、load0 界 = 0.4·I_b + 20，FLTH §3.4 推导形态同构），注册域全量复扫已随批准轮完成（§3.3 ④）、emit 复算维持硬条件）。',
          '【capacity_model=on 轨】沿袭 thermal 轨全部局限（单节点集总/无热管理/环境常数/无热保护等）。',
          '【capacity_model=on 轨】β>0 且判别式 < 0（或 h ≤ αI²R0）越域手拼段解为有限时间发散（Riccati a > 0——A-9 定案：批准轮域扫描 load0=150 kW 手拼 t≈7.8 s 窗内非有限、load0=48 kW 越界段窗内未发散而渐近发散；发散时窗与越域深度相关）。'
        ],
        equations: [
          { id: 'EQ-FLTH-10', latex_text: 'R_int(T_bat) = R0·(1 + α·θ + β·θ²)，θ = T_bat − 298.15（K 制；T_bat 单位 K）；β = 5×10⁻⁷ 1/K²（批准轮定案，CHG-20261114-01）；符号域（A-5 定案）：β ≥ 0、α > 0（√β 实值、抛物线开口向上、小根稳定性全部以 β ≥ 0 为前提——FCAP-8 断言面）', note: '内阻温度面二次式（≡ EQ-FLTH-2 域内修订）：β>0 时 R_int 随温升加速增大（正温度反馈增强）；β = 0 时精确退化为现行线性式（退化为 fl001_v2 轨的结构自洽面）；R0/α 冻结值原样（0.2 Ω / 0.01 1/K）；β 教学参数非实测（A-flcap-params）【仅 capacity_model=on 适用】' },
          { id: 'EQ-FLTH-11', latex_text: 'SOC_true(t) = SOC0 − 100·∫₀ᵗ [P_bat,true(t′)/3600] / E_cap(T_bat(t′)) dt′（/3600 位置（A-7 定案）：kW·s→kWh 换算因子作用于积分元内——换算 kWh 后再除 E_cap（kWh）分母）；SOC_est = SOC0 − ∫P_bat,meas dt/(40 kWh)×100% 原式逐字不动；E_cap(T_bat) = η_cap(T_bat)·E_nom，η_cap(T) = max(η_floor, 1 − k_cap·max(0, T − T_cap0))（A-1 定案机制，四常量 β/k_cap/T_cap0/η_floor §1.5 定案）。离散口径（冻结）：子步 E_cap 冻结于子步起点右值（分区结构同构——FLTH Q2 I 冻结先例）；实现形态 = 名义单除项（与 EQ-FLTH-7 原式同源同序：SOC0 − 100·(V·intI)/(E_nom·3600)，intI/intB 同源电气面 L0 序）+ 容量修正累积器（每子步 (V·∫I dt′/3600)·(1/E_cap(T_start) − 1/40)）——恒等改写 1/E_cap = 1/40 + (1/E_cap − 1/40)（修正项与 E_cap ≤ 40 同向、无相消）；T_bat < T_cap0 域内修正累积器恒精确 0.0（IEEE：max(0, T−T_cap0) ≡ 0 ⇒ η_cap ≡ 1.0 精确 ⇒ 1/E_cap − 1/40 ≡ 0.0）⇒ healthy 局 SOC_true/SOC_est/SOC_err 与 fl001_v2 逐位同（位级——扫描复核修正项 = 0.0、SOC_true(60) = 59.583333333333336 位级同，§3.2）。P_bat 符号域：放电段下降加快、充电段上升加快（|ΔSOC| 放大——η_cap ≤ 1 构造推论，方向声明 §1.4）', note: 'SOC_true 分母分域（≡ EQ-FLTH-7 capacity_model=on 域内修订——裁定点一定案：仅 on 域生效，off 与 thermal on 无 capacity 轨 EQ-FLTH-7 原式逐字不动，§6.2/§6.2.1）；SOC_est 维持 E_nom 测量记账口径（测量链零升级——与 FC Q5 定案同构）【仅 capacity_model=on 适用】' },
          { id: 'EQ-FLTH-12', latex_text: '稳态：β·I_true²·R0·θ_ss² + (α·I_true²·R0 − h)·θ_ss + I_true²·R0 = 0（β>0 时二次代数方程，物理根 = 小根 θ₋）；数值稳定小根形态（冻结——Q3/A-3 定案）：θ₋ = 2·I_true²·R0 / [(h − α·I_true²·R0) + √Δ]（有理化式——Δ→0 无相消、β→0 无 0/0；naive 求根式 [(h−αI²R0) − √Δ]/(2βI²R0) 仅作展示不作求解式——β=0 时 0/0 未定义、小 β 段大数相消，扫描复核 β=1e-12 时相对差 2.25e-7，§3.3 ⑦）；局部稳定性条件：h > I_true²·R0·(α + 2β·θ)（轨内全程成立——θ(t) ≤ θ₋ 单调结构性推论，轨内最小裕度 = √Δ）；全轨失稳边界：h = I_true²·R0·(α + 2√β)（⟺ Δ = 0 双重根；注册域要求严格大于——扫描复核 62.5 A 角点裕度 +1.0826 W/K，§3.3 ②）；判别式 Δ = (h − α·I_true²·R0)² − 4β·(I_true²·R0)²：Δ < 0 ⟺ h < I_true²·R0·(α + 2√β)（h > αI²R0 侧精确成立——A-6 定案措辞；边界 h = I²R0(α+2√β) 为 Δ=0 双重根临界、非 Δ<0 等价点）；补记（h ≤ αI²R0 段）：Δ 可为正但两根皆负、同属无正实稳态域（复根段精确范围 I²R0(α−2√β) < h < I²R0(α+2√β)——dθ/dt > 0 全域、解有限时间发散，A-9/§1.6 ⑤）；β = 0 退化：θ₋ → I_true²·R0/(h − I_true²·R0·α)（EQ-FLTH-9 现行式精确还原——扫描复核 0.0 ulp 逐位同，§3.3 ⑦）；推导注：稳定根处 I_true²·R0·(α + 2β·θ₋) = h − √Δ < h 恒成立（√β 单位 1/K 自洽）', note: '稳态二次代数方程与稳定小根（≡ EQ-FLTH-9 域内重推）；闭式保留定案（Q3）——FLTH EQ-FLTH-9 闭式先例 + oracle 自检交叉面（FCAP-5）+ 教学可见（失稳边界 h = I²R0(α+2√β) 闭式直接进 limitations/域声明）；数值求解仅在闭式数值病态时兜底（登记不静默）【仅 capacity_model=on 适用】' }
        ],
        /* UI 变体（§1.6 冻结文案；FLTH levelFor/summaryFor 派生先例同构——FL001.levelFor） */
        level_on: 'L1 · 单节点热-容量折算模型（数值仿真级）',
        summary_on: '电池按温度折算可用容量、内阻随温升非线性增大（教学折算面）。',
        notes: '教学尺度容量-内阻二阶效应示意（L1 扩展），非机组/电网动态验证。'
      }
    },
    acceptance: {
      reference: 'MODEL_VALIDATION_SPEC §1.2/§3（解析金标准，未与实测校准）',
      exactness: 'FL-001 默认场景与解析式在 1e-6 容差内一致（求积/舍入规则见 MODEL_VALIDATION_SPEC §3.5/§7）',
      /* A-3② 定案（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §4 项 8，CHG-20261107-01）：
         以下 keyValues 为 off 轨（L0 / fl001_v1）专用冻结锚点——thermal_model=on 轨验收
         keyValues 由 fl001_v2 golden 承载（FLTH-G2b-03 emit），本键面不引用 off 轨锚点
         作 on 轨通过判据；acceptance 面按 cfg.thermal_model 分域为 FLTH-G2b-04 工作面
         （分域派生落地另行登记，本波键面零变化）。
         FLCAP-G2b-04 分域落地（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §4 项 10② 两门禁面，
         CHG-20261114-01 批准链；FC001 acceptance 分域登记先例同构）：cfg→golden 三元分派表
         = (thermal_model, capacity_model)：(off,·)→fl001_v1 / (on,off)→fl001_v2 /
         (on,on)→fl001_v3 / (off,on)=非法组合拒绝（engine validate + scenario declaresCapacity
         双落点——Q11 定案）。既有 off/(on,off) 域 keyValues 值零变化（上方冻结锚点原样——
         on_cap 轨验收 keyValues 由 fl001_v3 golden 承载，本键面不引用 off 轨锚点作 on_cap 轨
         通过判据，轨区分由 golden_id 承载）。 */
      keyValues: {
        E_bat_kWh: 0.1238889, E_gen_kWh: 0.3761111, E_load_kWh: 0.5,
        SOC_true_end_pct: 59.6902778, SOC_est_end_pct: 59.5791667, SOC_err_pp: -0.1111111,
        max_abs_r_meas_kW: 4.0, I_true_26s_A: 15.183156388
      }
    }
  };

  /* FL-001 thermal 轨层级/摘要派生（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §6.2/§6.4，
     FLTH-IMP-Q2 实现轮裁定，CHG-20261107-01 批准）。
     实现方式选择（登记）：GT 三轨先例的 level 为静态字符串字段（thermo 为默认轨，静态即可）；
     FL 默认 off，故 level 保持 off 默认字符串（home/list/signals/causal 等全部静态消费入口
     零变化），on 轨层级经 levelFor(cfg) / summaryFor(cfg) 派生——消费入口：
     ① engine/provenance 面（run 元数据按 cfg 派生，L3 接线）；
     ② UI 跨深度卡/系统详情（cfg 在手时调用，L7 接线；无 cfg 的静态卡继续读 level 字段）。
     off（或缺省/未知 cfg）时两函数返回与 level/summary 字段相同的现值——off 域零变化。
     FLCAP-G2b-04 扩展（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §1.6 UI 变体，CHG-20261114-01
     批准链；FC001.levelFor 先例同构——cfg 感知派生）：capacity_model=on 轨显示 level_on/
     summary_on 变体（模型级 capacity 子对象批准冻结文本）——组合守卫保证 on_cap 蕴含
     thermal_model=on，容量变体判定前置（双轨文案不叠加）。off/(on,off) 域返回值逐字不变。 */
  FL001.levelFor = function (cfg) {
    if (cfg && cfg.capacity_model === 'on') return FL001.model.capacity.level_on;
    return (cfg && cfg.thermal_model === 'on')
      ? 'L1 · 单节点集总热模型（数值仿真级）'
      : FL001.level;
  };
  FL001.summaryFor = function (cfg) {
    if (cfg && cfg.capacity_model === 'on') return FL001.summary + FL001.model.capacity.summary_on;
    return (cfg && cfg.thermal_model === 'on')
      ? FL001.summary + '电池按单节点集总热容升温，热损耗由发电机补偿（模型记账口径）。'
      : FL001.summary;
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
      /* FC-001 L1 电化学轨开关（FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §1.1，CHG-20261113-01
         批准链；FLTH thermal_model 单键先例同构）：electrochem_model: off|on，默认 off——
         off 轨（L0/fc001_v1）为验收轨与 fc001_v1 冻结锚点承载面，on 轨（L1/fc001_v2）经显式
         选择到达。B-1(a) 定案：场景缺省轨解析只在 engine normalizeConfig 盖章层发生；
         engine validate 侧枚举守卫同构（engine.js electrochem_model 分支）。 */
      electrochem_model: 'off',
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
      /* FC-001 L1 电化学轨（FCECH-G2b-04，CHG-20261113-01；GT-001 thermal 类目先例同构）：
         三新信号（T_st_K/V_stack_V/P_loss_stack_kW）类目——additive，既有类目零变化。 */
      { id: 'thermal', label: '热力' },
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
      sig({ id: 'valve_meas_pct', label: '阀门实际开度', shortLabel: 'valve_meas', unit: '%', category: 'actuator', sourceKind: 'OBSERVATION', definition: '氢气阀实际开度测量；卡涩场景为 magnitude%。', formula: 'valve_meas = 100%（卡涩：magnitude%）', precision: 0, chart: { style: 'dashed', colorToken: 'obs', axis: 'right', step: true }, blindVisible: true }),
      /* FC-001 L1 电化学轨三新信号（FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §1.3，
         CHG-20261113-01 批准链；GTL1 尾插先例；全非盲显、不设 blindVisible——盲包语义
         零变化）。onTrackOnly = FCECH-G2b-04 任务5裁定（registry.runHashInput signals
         哈希面为整 signals 对象、null 列改变 off 轨 run_hash ⇒ §3.1 off 轨零变化为最高
         判据，列仅 electrochem_model=on 轨构建；GT/FL 全程 null 列先例为宽容期落地面，
         八面冻结后不可复制）。单位字典零新增（K——GT C-3 既有、V/kW 既有）。 */
      sig({ id: 'T_st_K', label: '电堆温度', shortLabel: 'T_st', unit: 'K', category: 'thermal', sourceKind: 'MODEL_STATE', definition: '电堆单节点集总温度（L1 新动态状态，RK4 状态向量 y=[T_st]；EQ-FCEC-3，T_st(0) = T_amb = 298.15 K 冷启动；off 轨无热面，结构性缺席）。', formula: 'C_st·dT_st/dt = P_loss_W − h_st·(T_st − T_amb), C_st = 1500 J/K, h_st = 120 W/K', precision: 3, chart: { style: 'solid', colorToken: 'warm', axis: 'left' }, onTrackOnly: true }),
      sig({ id: 'V_stack_V', label: '电堆端电压', shortLabel: 'V_stack', unit: 'V', category: 'thermal', sourceKind: 'MODEL_STATE', definition: '电堆集总等效端电压（代数量，EQ-FCEC-1 三损失项极化链；非单池——A-fcec-polarization；off 轨 A-const-v 恒压口径，结构性缺席）。', formula: 'V_stack = E0(T_st) − c_act·ln(1+I/I_0) − R_ohm(T_st)·I − c_conc·ln(I_lim/(I_lim−I))', precision: 3, chart: { style: 'solid', colorToken: 'warm', axis: 'left' }, onTrackOnly: true }),
      sig({ id: 'P_loss_stack_kW', label: '电堆热损失功率（模型记账项）', shortLabel: 'P_loss,st', unit: 'kW', category: 'thermal', sourceKind: 'DERIVED', definition: '电堆热损失功率（模型记账项）：P_loss_W = (E0 − V_stack)·I，信号面 kW 基（EQ-FCEC-4，W 记账——A-3 定案）；热损失是模型记账项，不是能量损失。', formula: 'P_loss_W = (E0(T_st) − V_stack)·I；P_loss_stack_kW = P_loss_W/1000', precision: 6, chart: { style: 'solid', colorToken: 'warm', axis: 'left' }, onTrackOnly: true })
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
      ],
      /* FC-001 L1 电化学轨声明面（B-2 定案 additive 子对象——FC001_ELECTROCHEM_G2B_SPEC_APPROVED
         v1.0 §3.1 项 3/§8 FCECH-G2b-04，CHG-20261113-01 批准链）：on 轨全部声明面挂本模型级
         additive 字段，置于 model_hash 九字段哈希域之外（engine.js modelManifest hashObject
         具名九键输入清单零变化 ⇒ model_hash/run_hash 既有输入零变化）；上方 assumptions/
         limitations/equations/claims/unit_system/equation_ids 五数组与字段逐字节不动，
         UI 按轨条件渲染（on 显示本子对象，off 显示上方原文——诚实性由变体渲染承载）。
         文本 = 批准文本 §1.4/§1.6 冻结原文迁入（copy-guard 预检 §6.3 + 终检）。 */
      electrochem: {
        assumptions: [
          { id: 'A-fcec-polarization', text: '【仅 electrochem_model=on 适用】电堆端电压按三损失项极化链（EQ-FCEC-1）计算，为电堆集总等效（非单池、无水管理/气体扩散/双电层动态）。' },
          { id: 'A-fcec-params', text: '【仅 electrochem_model=on 适用】全部极化/热参数为教学整定值（非实测参数）：按参考工作点复现铭牌（V_stack(50 A, T_st(0)) = 400 V）、60 s 窗内温度轨可见性与 healthy 工作点温度不变性（k_E = 50·α_ohm·R_ohm0）整定，不对应任何真实 PEMFC 电堆参数辨识；温度面符号为教学叙事整定（k_E>0、α_ohm≥0），不代表 PEMFC 物性方向（真实 dE_rev/dT<0）。' },
          { id: 'A-fcec-heat', text: '【仅 electrochem_model=on 适用】电堆热为内部记账：P_loss_W = (E0 − V_stack)·I【W】进 T_st ODE（EQ-FCEC-3/4，W 记账——A-3 定案）；母线恒等式 P_fc + P_bat ≡ P_load 按构造维持；热损失是模型记账项，不是能量损失。' },
          { id: 'A-fcec-dispatch', text: '【仅 electrochem_model=on 适用】功率分配器换算维持 0.4 kV 名义电压（EQ-6 原样——控制器不感知 V_stack，行为级控制器口径）；分配目标与电堆实际功率之差由电池缓冲吸收（理想平衡源口径不变）。' },
          { id: 'A-fcec-meas', text: '【仅 electrochem_model=on 适用】测量换算维持铭牌恒压口径（P_fc,meas = 0.4·I_meas）；r_meas 定义恒等扩展含恒压口径偏差项（Q5）——口径偏差项在参考工作点 (I=50 A, T_st(0)) 处为零（healthy 全轨 I≡50 + 整定依据④ ⇒ 全轨为零）；偏离工作点显非零口径偏差——口径偏差是模型已知结构项，不是测量故障。' },
          { id: 'A-fcec-l1', text: '【仅 electrochem_model=on 适用】电化学-热模型为教学尺度单节点集总示意（L1-lite），不是经过验证的设备控制器或电堆电化学模型。' }
        ],
        limitations: [
          '【electrochem_model=on 轨】水管理/气体扩散/双电层/寿命衰减未建模（off 轨既有 limitation 第 1 条原文保留——分域化改写挂本子对象，B-2 定案）。',
          '【electrochem_model=on 轨】浓差域外（I ≥ I_lim = 150 A）行为未定义——域守卫/钳位为实现轮裁定面（登记不静默；注册域最大电流 137.5 A < I_lim，裕度 12.5 A）。',
          '【electrochem_model=on 轨】无热保护（高温降额/热失控——FLTH §6.1 项 7 同款）。',
          '【electrochem_model=on 轨】单节点集总热（无堆内温度分布）。'
        ],
        equations: [
          { id: 'EQ-FCEC-1', latex_text: 'V_stack(I, T_st) = E0(T_st) − c_act·ln(1 + I/I_0) − R_ohm(T_st)·I − c_conc·ln(I_lim/(I_lim − I))', note: 'V-I 极化链（三损失项）：活化对数近似 + 欧姆 + 浓差（Q4 定案 (a) 对数式）；I < I_lim 值域硬条件（§3.3）；V_stack 为电堆集总等效端电压（非单池——A-fcec-polarization）【仅 electrochem_model=on 适用】' },
          { id: 'EQ-FCEC-2', latex_text: 'on 域：P_fc,true = V_stack·I_fc/1000（kW）；off 域：P_fc = 0.4·I_fc 原样', note: '电堆功率换算（on 域替换 EQ-3 前半 A-const-v 电堆半边；EQ-3 off 域逐字保留）' },
          { id: 'EQ-FCEC-3', latex_text: 'C_st·dT_st/dt = P_loss_W − h_st·(T_st − T_amb)，T_st(0) = T_amb = 298.15 K，C_st = 1500 J/K，h_st = 120 W/K', note: '电堆单节点集总热平衡 ODE（W 记账——A-3 定案；牛顿冷却、冷启动假设；EQ-FLTH-4 形态复用）【仅 electrochem_model=on 适用】' },
          { id: 'EQ-FCEC-4', latex_text: 'P_loss_W = (E0(T_st) − V_stack)·I【W】；信号面 P_loss_stack_kW = P_loss_W/1000', note: '热损失口径（Q3 定案 (a)——W 基，A-3）：按构造 = 三损失项×电流（E0 在差分中相消、零新增常数）【仅 electrochem_model=on 适用】' },
          { id: 'EQ-FCEC-5', latex_text: 'E0(T_st) = E0_ref + k_E·(T_st − T_ref)，T_ref = 298.15 K；k_E = 50·α_ohm·R_ohm0 = 0.1 V/K', note: 'E0 温度面（线性；k_E ≥ 0 由恒等式承载——A-2(i) 定案）；两温度面均线性 ⇒ healthy 全轨 V_stack(50,·) ≡ 400 V 精确恒等（E0_ref 由整定依据①锚点闭式派生：400 + c_act·ln6 + 50·R_ohm0 + c_conc·ln1.5）【仅 electrochem_model=on 适用】' },
          { id: 'EQ-FCEC-6', latex_text: 'R_ohm(T_st) = R_ohm0·(1 + α_ohm·(T_st − T_ref))，R_ohm0 = 0.5 Ω，α_ohm = 0.004 1/K', note: '欧姆电阻温度面（线性式；正温度反馈项——稳定性条件 h_st > α_ohm·R_ohm0·I²【W/K】，137.5 A 角点裕度 +82.1875 W/K）【仅 electrochem_model=on 适用】' },
          { id: 'EQ-FCEC-7', latex_text: 'r_true := P_fc,true + P_bat,true − P_load ≡ 0；r_meas := 0.4·b + (0.4 − V_stack/1000)·I_fc；on 域 SOC_true/E_bat/P_bat 按 P_fc,true 重算（真实功率基），SOC_est（测量链 0.4·I_meas 未动）与 L0 逐位同', note: '电气面保留 EQ-1/2/5/6 原样（测量链/控制面零升级）；r_meas 第二项为恒压测量口径偏差项——参考工作点 (I=50 A, T_st(0)) 处为零、偏离工作点显非零（模型已知结构项、非测量故障——A-1/Q5 定案）；记账基 A-5 定案；分配器 EQ-6 原样（A-fcec-dispatch）' }
        ],
        /* UI 变体（§1.6 冻结文案；FLTH levelFor/summaryFor 派生先例同构——FL001.levelFor） */
        level_on: 'L1 · 电堆极化与单节点热（数值仿真级）',
        summary_on: '电堆按极化曲线出力、损耗热加热电堆（模型记账口径）。',
        notes: '教学尺度电化学-热集总示意（L1-lite），非机组/电网动态验证。'
      }
    },
    acceptance: {
      reference: '契约 §5.2',
      exactness: 'FC-001 为验收范围（非逐位）；真实守恒、无 NaN',
      /* A-3② 分域登记（FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §4 项 10②，CHG-20261113-01；
         FLTH A-3② 注释登记先例同构）：以下 keyValues 为 off 轨（L0 / fc001_v1）专用冻结锚点
         ——现状值零改动；electrochem_model=on 轨验收 keyValues 由 fc001_v2 golden 承载
         （FCECH-G2b-03 emit），本键面不引用 off 轨锚点作 on 轨通过判据；cfg→golden 分派
         off→fc001_v1 / on→fc001_v2（两门禁面，轨区分由 golden_id 承载——Q1 定案 B）。 */
      keyValues: {
        I_fc_true_start_A: 50, I_fc_true_end_A: 40, P_fc_true_kW: [20, 16], P_bat_true_kW: [10, 14],
        E_load_kWh: 0.5, E_fc_plus_E_bat_kWh: 0.5, r_meas_peak_kW: 4.0,
        SOC_true_end_pct: 59.4755556, SOC_est_end_pct: 59.5866667, SOC_err_pp: 0.1111111
      }
    }
  };

  /* FC-001 电化学轨层级/摘要派生（FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §1.6 UI 变体，
     CHG-20261113-01 批准链；FL001.levelFor/summaryFor 派生先例同构——FLTH-IMP-Q2 实现方式
     选择登记适用）：FC 默认 off，level/summary 保持 off 默认静态字符串（home/list/signals/
     causal 等全部静态消费入口零变化），on 轨层级经 levelFor(cfg)/summaryFor(cfg) 派生
     （变体文案 = model.electrochem.level_on/summary_on 批准冻结文本）。
     off（或缺省/未知 cfg）时两函数返回与 level/summary 字段相同的现值——off 域零变化。 */
  FC001.levelFor = function (cfg) {
    return (cfg && cfg.electrochem_model === 'on')
      ? FC001.model.electrochem.level_on
      : FC001.level;
  };
  FC001.summaryFor = function (cfg) {
    return (cfg && cfg.electrochem_model === 'on')
      ? FC001.summary + FC001.model.electrochem.summary_on
      : FC001.summary;
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
  /* WT-001 风电机组（WT001_G2B_SPEC_APPROVED v1.0 批准 CHG-20261107-01；实现 =
     WT-G2b-04 systems.js 面 / V080_WAVE_DESIGN §2 L4。§1 全量：拓扑 7 组件 9 边 /
     22 信号 / EQ-WT-1..9 / 3 故障族 / A-wt-* 11 条 / limitations 10 项。
     scope：WT-001 全场景 extension_preview（scope.js classify fall-through 零改动）；
     Arena：ARENA_EXCLUDED 增 'WT-001' 为 WT-G2b-04 显式工作面（arena.js，L7）。 */
  /* ================================================================== */
  var WT001 = {
    id: 'WT-001',
    title: '风电并网等效系统',
    shortTitle: '风电并网',
    experimentCode: 'WT-001',
    experimentName: '风速传感器偏置',
    tagline: '在 20 秒注入 1.0 m/s 风速测量低估，看可用功率保护如何把测量偏差变成真实出力下降。风电 L0b 机械动态演示，不含尾流/湍流/气弹模型。',
    level: 'L0b · 机械动态行为级演示（G2b 已批准）',
    summary: '风轮经全功率变流器接入 400 V 等效母线，与理想平衡馈线共同为 30 kW 恒定负载供电；变流器按转速最优增益律给目标功率（额定 15 kW 封顶、可用风功率保护钳位），桨距执行器一阶跟踪转速调节指令，风轮转速由气动扭矩与电功率之差驱动。',
    questions: [
      '风速测量被低估时，为什么真实出力会跟着下降？高估时为什么零真实效应？',
      'd_wt 为零、为负、为正分别对应什么运行状态（最优、偏离最优、测量伪影）？',
      '同样的偏置，闭环与仅监测为什么一个被吸收进自洽、一个持续暴露？'
    ],
    duration_s: 60,
    dt_s: 0.1,
    topologyViewBox: [0, 0, 1000, 620],
    defaults: {
      feedback_mode: 'closed_loop',
      /* WT-001 无储能：initial 无 SOC 键（与 FL/FC/GT 的键面差异点，规格 §1.1，PV-001 同款）；
         v0_ms 为 WT 自有配置量（有意封顶于 v_rated = 10.302 m/s 之下——额定区初值需数值
         平衡求解，规格 §1.1）；无 inertia_model 键（单轨 L0b，GT-001 三轨键不适用）。
         engine validate 按 bounds.v0_ms 校验（engine.js v0_ms 分支）；schema 导出面
         initial_v0_ms 键为 WT-G2b-03 工作面（schema.js R-8 同构，L6）。 */
      initial: { load_kW: 30, v0_ms: 9 },
      noise: { enabled: false, seed: 12345, level: 0 }
    },
    bounds: {
      load_kW: { min: 10, max: 45 },
      v0_ms: { min: 6, max: 10 }
    },
    components: [
      comp({
        id: 'rotor', label: '风轮（含传动链单质量等效）', kind: 'rotor', role: '气动功率 → 转速惯性',
        description: '风轮气动功率 P_aero = Cp(λ,β)·½ρA·v³ 经传动链单质量惯量驱动转速（J·dω/dt = (P_aero − P_wt)/ω）；gust_step 场景有效真实风速阶跃上升。',
        x: 60, y: 60, w: 190, h: 96, faultable: true,
        inspector: [
          { id: 'P_aero_kW', source: 'MODEL_STATE' },
          { id: 'n_rotor_rpm', source: 'MODEL_STATE' },
          { id: 'lambda_tip', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'anemometer', label: '风速传感器', kind: 'sensor', role: '风速测量 · 故障注入点',
        description: '风速测量通道（与风轮同位置等效采样）；v_sensor_bias 场景注入低估方向阶跃偏置，可用功率保护钳位按错误风速收紧。',
        x: 60, y: 250, w: 180, h: 88, faultable: true,
        inspector: [
          { id: 'v_true_ms', source: 'MODEL_STATE' },
          { id: 'bias_ms', source: 'FAULT_EVENT' },
          { id: 'v_meas_ms', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'pitch_act', label: '变桨执行器', kind: 'actuator', role: '桨距角一阶跟踪 · 转速调节',
        description: '变桨执行器一阶跟踪（τ=0.5 s）：按转速偏差比例给出桨距指令；卡涩场景钉扎于偏转位置。',
        x: 310, y: 250, w: 170, h: 96, faultable: true,
        inspector: [
          { id: 'beta_pitch_deg', source: 'MODEL_STATE' },
          { id: 'beta_cmd_deg', source: 'CONTROLLER' },
          { id: 'beta_stuck_deg', source: 'FAULT_EVENT' }
        ]
      }),
      comp({
        id: 'converter', label: '全功率变流器（含 MPPT 与保护）', kind: 'converter', role: '最优增益律 + 额定封顶 + 可用功率保护',
        description: '全功率变流器（含 MPPT 与保护）：按转速最优增益律与可用风功率保护钳位给目标功率，一阶跟随；不是经过验证的设备控制器。',
        x: 310, y: 60, w: 170, h: 96, faultable: false,
        inspector: [
          { id: 'P_wt_ref_kW', source: 'CONTROLLER' },
          { id: 'P_wt_true_kW', source: 'MODEL_STATE' },
          { id: 'v_meas_ms', source: 'OBSERVATION' }
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
        description: '恒定功率负载；WT-001 无 load_step 族（负载恒定是结构设定，不可调度电源的教学对照面）。',
        x: 760, y: 250, w: 190, h: 96, faultable: false,
        inspector: [
          { id: 'P_load_demand_kW', source: 'CONFIG' },
          { id: 'P_load_served_kW', source: 'MODEL_STATE' }
        ]
      })
    ],
    edges: [
      { id: 'rotor->converter_power', from: 'rotor', to: 'converter', kind: 'power', label: '机械功率' },
      { id: 'converter->bus', from: 'converter', to: 'bus', kind: 'power', label: '电功率馈入' },
      { id: 'grid->bus', from: 'grid', to: 'bus', kind: 'power', label: '补偿功率' },
      { id: 'bus->load', from: 'bus', to: 'load', kind: 'power', label: '30 kW 需求' },
      { id: 'rotor->anemometer', from: 'rotor', to: 'anemometer', kind: 'measurement', label: '风速采样（与风轮同位置）' },
      { id: 'anemometer->converter', from: 'anemometer', to: 'converter', kind: 'measurement', label: 'v_meas' },
      { id: 'rotor->converter_speed', from: 'rotor', to: 'converter', kind: 'measurement', label: '转速反馈 n_rotor' },
      { id: 'converter->pitch_act', from: 'converter', to: 'pitch_act', kind: 'signal', label: '桨距指令' },
      { id: 'pitch_act->rotor', from: 'pitch_act', to: 'rotor', kind: 'signal', label: '桨距角' }
      /* 刻意无 load→converter 边：不可调度电源的结构声明（规格 §1.1，PV-001 无 load→mppt 边同构）。
         规格草表 rotor→converter 两行（power/measurement）按登记的实现细节去重为
         rotor->converter_power / rotor->converter_speed 两条。 */
    ],
    faultAnchors: { sensor_drift: 'anemometer', actuator_fault: 'pitch_act', gust_step: 'rotor' },
    signalCategories: [
      { id: 'wind', label: '风速' },
      { id: 'mechanical', label: '机械' },
      { id: 'power', label: '功率' },
      { id: 'residual', label: '残差' }
      /* 无 soc（无储能）、无 actuator 残差类（执行器状态由 mechanical 类 β 信号承载）——规格 §1.1 */
    ],
    signals: [
      /* 22 信号按 WT001_G2B_SPEC_APPROVED v1.0 §1.2 表逐行；exposure 落点沿 PV-001 体例：
         blind 信号显式声明 exposure: 'blind_observable'（sourceKind 默认映射为 public_demo 的
         CONTROLLER/DERIVED/CONFIG/MODEL_ASSUMPTION 必须显式声明才会落 blind）、public 信号
         不声明（默认映射 public_demo）；blindVisible 不独立设置（由 exposure 派生）——
         §1.2 B-3 三值映射核对表工作面以本落地为准逐信号核对。 */
      sig({ id: 'v_true_ms', label: '有效真实风速', shortLabel: 'v_true', unit: 'm/s', category: 'wind', sourceKind: 'MODEL_STATE', definition: '风轮平面有效真实风速（单点等效输入，与风轮同位置）。', formula: 'v_true = v0 + Δv·1(t≥t0)（gust）', precision: 1, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'v_meas_ms', label: '风速测量（控制面读数）', shortLabel: 'v_meas', unit: 'm/s', category: 'wind', sourceKind: 'OBSERVATION', definition: '风速传感器输出（控制面读数）：monitor 模式偏置故障时保护钳位通道改读真实风速。', formula: 'v_ctrl = monitor∧bias 故障 ? v_true : v_true + b(t)', precision: 1, chart: { style: 'dashed', colorToken: 'obs', axis: 'left', step: true }, exposure: 'blind_observable', noiseSigma: 0.15 }),
      sig({ id: 'bias_ms', label: '风速传感器偏置', shortLabel: 'b(t)', unit: 'm/s', category: 'wind', sourceKind: 'FAULT_EVENT', definition: '故障注入的风速测量偏置（低估方向），阶跃信号。', formula: 'b(t) = −B·1(t≥t0)（B≥0 低估幅值，仅 v_sensor_bias）', precision: 1, chart: { style: 'dashed', colorToken: 'fault', axis: 'right', step: true } }),
      sig({ id: 'n_rotor_rpm', label: '风轮转速', shortLabel: 'n_rotor', unit: 'rpm', category: 'mechanical', sourceKind: 'MODEL_STATE', definition: '风轮转速（ω 为 ODE 状态，传动链单质量等效）。', formula: 'n = ω·30/π（ω 为 ODE 状态）', precision: 1, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'lambda_tip', label: '叶尖速比', shortLabel: 'λ', unit: '-', category: 'mechanical', sourceKind: 'MODEL_STATE', definition: '叶尖速比（无量纲）。', formula: 'λ = ωR/v_true', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'cp_coeff', label: '风能利用系数', shortLabel: 'Cp', unit: '-', category: 'mechanical', sourceKind: 'MODEL_STATE', definition: '风能利用系数（无量纲；EQ-WT-2 经验解析式——教学惯例参数组，非实测、非设备辨识）。', formula: 'Cp(λ, β)（EQ-WT-2 经验式）', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'beta_pitch_deg', label: '桨距角（实际）', shortLabel: 'β', unit: '°', category: 'mechanical', sourceKind: 'MODEL_STATE', definition: '桨距角实际状态（一阶跟随指令；pitch_stuck 执行器激活窗内 = β_stuck 钉扎）。', formula: 'β 状态（执行器窗内 = β_stuck）', precision: 2, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'beta_cmd_deg', label: '桨距指令', shortLabel: 'β_cmd', unit: '°', category: 'mechanical', sourceKind: 'CONTROLLER', definition: '桨距比例转速调节指令（亚额定 ω<ω_N 时为 0 自动退出）。', formula: 'β_ref = clamp(K_β·(ω−ω_N), 0, 30°)', precision: 2, chart: { style: 'dashdot', colorToken: 'warm', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'beta_stuck_deg', label: '卡涩桨距角', shortLabel: 'β_stuck', unit: '°', category: 'mechanical', sourceKind: 'FAULT_EVENT', definition: 'pitch_stuck 场景的位置强制钉扎值（位置强制语义，Q2 定案）；其他场景不可用（null）。', formula: 'β_stuck = 30°·magnitude%（仅 pitch_stuck，其余场景 null）', precision: 2, chart: { style: 'dashed', colorToken: 'fault', axis: 'left', step: true } }),
      sig({ id: 'P_aero_kW', label: '气动功率', shortLabel: 'P_aero', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '风轮气动功率（Cp 经验式 × 可用风功率）。', formula: 'P_aero = Cp(λ,β)·½ρA·v_true³', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_wt_ref_kW', label: '变流器功率目标', shortLabel: 'P_ref', unit: 'kW', category: 'power', sourceKind: 'CONTROLLER', definition: '变流器目标功率（三支路取小：MPPT 最优增益律 + 额定封顶 + 可用风功率保护钳位）。', formula: 'P_ref = min(k_opt·ω³, P_rated, k_v·v_ctrl³)', precision: 3, chart: { style: 'dashdot', colorToken: 'warm', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'P_wt_true_kW', label: '风电真实出力', shortLabel: 'P_wt,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '风电机组真实出力（受控功率源以 τ_e = 1.0 s 一阶跟随目标）。', formula: 'τ_e·dP_wt/dt + P_wt = P_ref（P_wt 为 ODE 状态）', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_wt_meas_kW', label: '风电测量功率', shortLabel: 'P_wt,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '风电功率测量（健康通道）。', formula: 'P_wt,meas = P_wt,true（健康通道）', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable', noiseSigma: 0.15 }),
      sig({ id: 'P_wt_est_kW', label: 'EMS 风速折算估计', shortLabel: 'P_wt,est', unit: 'kW', category: 'power', sourceKind: 'DERIVED', definition: 'EMS 按测量风速折算的风电功率估计；恒用测量风速，不随运行模式切换。', formula: 'P_wt,est = k_v·v_est³，v_est = v_true + b(t)（恒用测量，不随模式切换——A-wt-est-channel）', precision: 3, chart: { style: 'dotted', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'd_wt_kW', label: '最优曲线一致性残差', shortLabel: 'd_wt', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '风电测量功率与 EMS 估计之差（代数恒等，不是能量损失）；健康测量下 d_wt ≤ 0 恒成立，传感器偏置破坏该界（测量伪影特征），封顶工况稳态 d_wt < 0 为合法残差（设计性偏离最优，非故障）。', formula: 'd_wt = P_wt,meas − P_wt,est = P_wt,true − k_v·v_est³', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'P_grid_true_kW', label: '馈线真实功率', shortLabel: 'P_grid,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '电网馈线真实功率（受电为正；理想双向补差，倒送为负且不建模约束）。', formula: 'P_grid = P_load − P_wt,true（受电为正）', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_grid_meas_kW', label: '馈线测量功率', shortLabel: 'P_grid,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '馈线功率测量（健康通道）。', formula: 'P_grid,meas = P_grid,true（健康通道）', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable', noiseSigma: 0.15 }),
      sig({ id: 'P_load_demand_kW', label: '负载需求功率', shortLabel: 'P_load', unit: 'kW', category: 'power', sourceKind: 'CONFIG', definition: '恒定功率负载；WT-001 无 load_step 族（负载恒定是结构设定，不可调度电源的教学对照面）。', formula: 'P_load = 30 kW（恒定，无 load_step 族）', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'P_load_served_kW', label: '负载实际获得功率', shortLabel: 'P_served', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '负载实际获得的功率（理想母线即需求功率）。', formula: 'P_load,served = P_load,demand', precision: 2, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'V_bus_V', label: '等效母线电压', shortLabel: 'V_bus', unit: 'V', category: 'power', sourceKind: 'MODEL_ASSUMPTION', definition: '400 V 等效母线电压（功率平衡抽象的模型假设，不是仿真状态）。', formula: 'V_bus = 400 V（模型假设，非仿真状态）', precision: 0, chart: { style: 'solid', colorToken: 'ink', axis: 'left', defaultVisible: false }, exposure: 'blind_observable', tableOnly: true }),
      sig({ id: 'r_true_kW', label: '真实功率平衡残差', shortLabel: 'r_true', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '真实功率守恒残差，理想模型下恒为 0。', formula: 'r_true = P_wt,true + P_grid,true − P_load,served ≡ 0', precision: 6, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'r_meas_kW', label: '测量一致性残差', shortLabel: 'r_meas', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '由测量构造的功率平衡残差；全部功率测量通道健康，恒为 0（与 FL-001 传感器偏置的 +4 kW 测量残差形成教学对照）。', formula: 'r_meas = P_wt,meas + P_grid,meas − P_load,served ≡ 0（全功率通道健康——与 FL-001 的 r_meas = 0.4·b 教学对照）', precision: 2, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable' })
    ],
    faults: [
      fault({
        id: 'v_sensor_bias', family: 'sensor_drift', label: '风速传感器偏置（低估）', shortLabel: '传感器漂移',
        target: 'anemometer',
        description: '风速测量通道注入低估方向阶跃偏置，可用功率保护钳位按错误风速收紧，真实出力被压低；高估方向零真实效应（保护松开，仅估计通道暴露）。',
        params: [{ key: 'magnitude', label: '低估幅值', unit: 'm/s', min: 0.5, max: 3.0, step: 0.5, default: 1.0, precision: 1, help: '低估偏置使测量风速低于真实 |b| m/s：可用功率保护钳位收紧，真实出力被压低；高估方向零真实效应（保护松开，仅估计通道暴露——见角点声明）' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '可用功率上限由 k_v·9³ = 10.00 kW 收紧至 k_v·8³ = 7.02 kW（默认 B=1.0），P_wt τ=1.0 s 跟随下行，转速上升 180.6→224.3 rpm（桨距随即介入 β→5.51°），λ 8.10→10.06 右支偏移，馈线 20→22.98 kW；d_wt 瞬态 +2.98 kW 后归零（估计先跳下行、真实滞后——闭环把低估故障吸收进自洽：保护钳位使真实出力恒等于被低估的估计值）',
        monitorEffect: '真实出力不变（10.00 kW 恒定）；保护钳位改读真实风速；P_wt,est 仍按低估测量折算，d_wt ≡ +2.98 kW 持续暴露（健康测量下 d_wt ≤ 0 的界被测量伪影破坏——特征本身），ΔE_wt = −0.0331 kWh（估计偏少）',
        causalTemplateId: 'wt-sensor-drift'
      }),
      fault({
        id: 'pitch_stuck', family: 'actuator_fault', label: '变桨卡涩（位置强制）', shortLabel: '执行器异常',
        target: 'pitch_act',
        description: '变桨执行器卡涩于 β_stuck = 30° × magnitude% 偏转位置（位置强制语义，执行器窗内桨距角被钉扎）；与 FL/FC/GT 指令限幅模式不同——亚额定桨距指令为零，限幅式卡涩将是 no-op。',
        params: [{ key: 'magnitude', label: '卡涩偏转比例', unit: '%', min: 20, max: 85, step: 5, default: 55, precision: 0, help: '变桨执行器卡涩于 β_stuck = 30° × magnitude%（55% → 16.5°）偏转位置；与 FL/FC/GT 指令限幅模式不同——亚额定桨距指令为零，限幅式将是 no-op，故本族采用位置强制语义' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '两模式同生效（物理执行器）：β 0→16.5° 钉扎，Cp 骤降 0.480→0.167（λ 平衡点 5.69 左支），P_wt 10.00→3.47 kW、转速 180.6→127.0 rpm（MPPT 曲线跟随下行），馈线 20→26.53 kW；d_wt 持续 −6.53 kW（运行点偏离最优曲线的故障特征，不归零——与 sensor_drift 闭环归零对照）',
        monitorEffect: '同闭环（物理执行器故障，与控制模式无关——FL monitorEffect「限幅作用在物理执行器上」同款措辞）',
        causalTemplateId: 'wt-pitch-stuck'
      }),
      fault({
        id: 'gust_step', family: 'gust_step', label: '阵风阶跃（风速增幅）', shortLabel: '阵风阶跃',
        target: 'rotor',
        description: '有效真实风速阶跃上升（物理输入，与控制模式无关）；默认参数跨额定区——功率封顶、转速锚定、桨距吸收。',
        params: [{ key: 'magnitude', label: '阵风增幅', unit: 'm/s', min: 1.0, max: 3.0, step: 0.5, default: 2.0, precision: 1, help: '有效真实风速阶跃上升，两模式同生效；默认参数跨额定区——功率封顶 15 kW、转速锚定、桨距吸收（β 0→1.73°）' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '物理输入，与控制模式无关：亚额定段（gust +1.0，v=10 < v_rated）MPPT 新最优点 P_wt→13.72 kW、β 恒 0、d_wt 归零；跨额定段（默认 +2.0，v=11）P_ref 封顶 15 kW、转速锚定 212.3 rpm（ω_N 邻域）、桨距吸收 β 0→1.73°、d_wt 稳态 −3.26 kW（封顶工况合法残差）',
        monitorEffect: '同闭环（物理输入，逐位同解——WT001_G2B_SPEC_APPROVED §3.3 复算实证）',
        causalTemplateId: 'wt-gust-step'
      })
    ],
    model: {
      model_id: 'wt.aero.l0b',
      model_version: '1.0.0',
      assumptions: [
        { id: 'A-wt-ideal-bus', text: '母线 400 V 等效理想，无电压/频率动态、无功与网损；等效母线是功率平衡抽象，不是电网模型。' },
        { id: 'A-wt-cp-empirical', text: 'Cp 为经验解析式（c₁…c₆ 教学惯例参数组），非实测、非设备辨识；λ_opt/Cp_max 由数值最大化求得，按 15 位有效数字作登记可达精度登记（非闭式可复现值）。' },
        { id: 'A-wt-single-mass', text: '传动链为单质量刚性轴集总（直驱教学等效，无变速箱、无轴系扭转模态）；J = 300 kg·m² 为教学整定等效值（假设非实测参数）。' },
        { id: 'A-wt-mppt-omega', text: 'MPPT 为最优增益律 P_ref = k_opt·ω³（转速反馈，真实机组惯例的教学化）；不建模 I-V/工作点类约束面（变流器按受控功率源建模，可用功率保护钳位见 A-wt-guard）。' },
        { id: 'A-wt-guard', text: '可用风功率保护钳位 P_v_cap = k_v·v_ctrl³（k_v 即理论最优曲线系数，γ ≡ 1）为防失速守卫：仅在转速低于最优点（λ < λ_opt）时绑定；风速传感器偏置经该钳位进入闭环（低估收紧、高估松开——单向性见规格 §3.5 角点）。' },
        { id: 'A-wt-pitch-pro', text: '桨距为比例转速调节（β_ref = K_β·(ω−ω_N)，K_β = 3.0 °/(rad/s) 教学整定）+ 执行器一阶跟踪（τ_β = 0.5 s）；无积分抗饱和、无死区、无独立变桨（统一桨距角）。' },
        { id: 'A-wt-ideal-converter', text: '全功率变流器理想：P_wt 以 τ_e = 1.0 s 一阶跟随目标，无开关动态、无效率曲线、无无功/穿越控制；额定封顶 P_rated = 15 kW 为模型结构设定。' },
        { id: 'A-wt-ideal-feeder', text: '电网馈线为理想双向平衡源：P_grid = P_load − P_wt，瞬时补差，无爬坡限制、无额定约束、无倒送约束。' },
        { id: 'A-wt-const-load', text: '负载恒定 30 kW；WT-001 无 load_step 族（不可调度电源的教学对照面，A-pv-const-load 同构）。' },
        { id: 'A-wt-est-channel', text: 'P_wt,est 为 EMS 级风速折算估计，恒用测量风速 v_est = v_true + b(t)（不随运行模式切换）；d_wt 是测量链一致性的代数恒等，不是能量损失。' },
        { id: 'A-wt-l0b', text: '变桨与功率控制为行为级闭环，不是经过验证的设备控制器。' }
      ],
      limitations: [
        '尾流与塔影效应、风剪切与空间平均未建模（风速为单点等效输入，anemometer 与风轮同位置等效）；湍流场与随机风未建模（仅阶跃阵风，无连续气象动态）。',
        '气弹耦合与疲劳载荷未建模（叶片柔性、振动模态、寿命面）。',
        '传动链柔性（单质量刚性轴集总）、变速箱（直驱教学等效）、轴承摩擦与效率未建模（无独立机械效率项——气动→电功率链无集总 η，P_wt 由扭矩平衡直接给出）。',
        '偏航系统与对风误差、机舱动态未建模。',
        '发电机电磁暂态、变流器开关动态与效率曲线、无功/电压控制、故障穿越（LVRT/HVRT）未建模。',
        '保护系统未建模：超速保护、桨距限速保护、cut-in/cut-out 切入切出（注册域 v ∈ [3,13] m/s 内不触发，未建模）、结冰与气象保护。',
        '转速传感器通道理想化（ω 反馈无偏置族——转速传感器偏置教学点由 GT-001 承载，WT-001 不重复，scope 纪律）。',
        '倒送域（load < P_wt 时 P_grid < 0）为理想双向馈线的合法工作区，不建模倒送约束（PV-001 同款）。',
        'normalizeConfig 无跨参数校验（FL-001 同款先例），手拼配置可致 v_ctrl < 0 或 ω 越有效性域下界（负 λ/停机发散）——钳位方案为实现期决策点 WT-IMP-Q1（engine 侧钳位 or UI 联动校验，二选一须记录，PV-IMP-Q1 先例）。',
        'L0b 行为级演示模型；非实测、非 Simulink、无实测对比；本模型为机械动态行为级并网演示（L0b），非机组/电网动态验证。'
      ],
      equations: [
        { id: 'EQ-WT-1', latex_text: 'v_true(t) = v0 + Δv·1(t ≥ t0)（仅 gust_step）; b(t) = −B·1(t ≥ t0)（仅 v_sensor_bias，B ≥ 0 低估幅值）; v_ctrl = (monitor ∧ bias 故障) ? v_true : v_true + b(t); v_est = v_true + b(t)', note: '输入与测量/估计通道（t0 处右极限，post 采样行语义）；monitor 语义 = 偏置不进入物理回路（保护钳位改读真实风速），估计通道恒用测量' },
        { id: 'EQ-WT-2', latex_text: 'Cp(λ,β) = c₁(c₂/λᵢ − c₃β − c₄)·e^(−c₅/λᵢ) + c₆λ; λᵢ = 1/(1/(λ+0.08β) − 0.035/(β³+1)); c₁…c₆ = 0.5176/116/0.4/5/21/0.0068; λ_opt = 8.100117280602777、Cp_max = 0.480011902827875（登记可达精度）', note: 'Cp 经验解析式（Heier/Slootweg 教学惯例参数组）——非实测、非设备辨识；λ_opt/Cp_max 由 golden-section 数值最大化求得，按 15 位有效数字作登记可达精度登记（非闭式可复现值）' },
        { id: 'EQ-WT-3', latex_text: 'P_aero = Cp(λ,β)·½ρA·v_true³; λ = ωR/v_true', note: '风轮气动功率（ρ = 1.225 kg/m³、R、A 登记常量，规格 §1.3-a）' },
        { id: 'EQ-WT-4', latex_text: 'P_ref = min(k_opt·ω³, P_rated, k_v·v_ctrl³); k_v = 13.717421124828531 W/(m/s)³（= 10000/729）; k_opt = 1.477220410253986 W/(rad/s)³; P_rated = 15 kW', note: '变流器目标三支路：MPPT 最优增益律（转速反馈）+ 额定封顶 + 可用风功率保护钳位（防失速守卫——亚额定左支 λ<λ_opt 时绑定）；设计点闭合 k_v·v0³ = k_opt·ω_opt³ = 10.000 kW（v0=9）；γ ≡ k_v/(Cp_max·½ρA) = 1' },
        { id: 'EQ-WT-5', latex_text: 'β_ref = clamp(K_β·(ω − ω_N), 0, β_max); K_β = 3.0 °/(rad/s); β_max = 30°; ω_N = 21.654524572087702 rad/s（n_N = 206.785477557160 rpm）', note: '桨距比例转速调节（额定以上桨距吸收风速、转速锚定 ω_N 邻域；亚额定 ω<ω_N 时 β_ref = 0 自动退出——「桨距调转速」惯例的教学化）' },
        { id: 'EQ-WT-6', latex_text: 'τ_e·dP_wt/dt + P_wt = P_ref, τ_e = 1.0 s, P_wt(0) = k_v·v0³; τ_β·dβ/dt + β = β_ref, τ_β = 0.5 s, β(0) = 0; 执行器激活窗内 β ≡ β_stuck（钉扎，跳过一阶跟随）', note: '变流器功率与桨距角一阶跟随（分段常值/缓变目标）；t0 后 P_wt 段内闭式精确指数（EQ-PV-4 同构）' },
        { id: 'EQ-WT-7', latex_text: 'J·dω/dt = (P_aero − P_wt)/ω, J = 300 kg·m², ω(0) = λ_opt·v0/R', note: '传动链单质量一阶转速动态（非线性 RHS：Cp 耦合 + 1/ω 扭矩，不可手解——L0b 判据核心）；有效性域 ω ≥ 0.5·ω_opt(v0)（n ≥ 90.3 rpm）：停机/盘车工况未建模，注册域内不可达' },
        { id: 'EQ-WT-8', latex_text: 'P_grid = P_load − P_wt,true; P_load = 30 kW; r_true ≡ 0; r_meas ≡ 0（定义恒等）; d_wt = P_wt,meas − P_wt,est = P_wt,true − k_v·v_est³', note: '理想瞬时平衡（馈线补差）与残差通道；健康测量下 d_wt ≤ 0 恒成立（Cp ≤ Cp_max），传感器偏置破坏该界（测量伪影特征）；封顶工况稳态 d_wt < 0 为合法残差（设计性偏离最优，非故障）' },
        { id: 'EQ-WT-9', latex_text: 'E_x = ∫P_x dt（kW·s，÷3600 → kWh）; E_wt,est = ∫k_v·v_est³ dt（事件感知解析积分——v_est 分段常值）; ΔE_wt = E_wt,est − E_wt,true', note: '能量口径（本系统无 SOC——SOC_est 通道的功能位由 P_wt,est/ΔE_wt 承担，PV EQ-PV-7 同构）' }
      ]
    },
    /* WT-001 无 P0 验收面（extension_preview：scope.js classify fall-through，规格 §5；
       assertApprovedP0 对 WT 配置抛 SCOPE-E01）。acceptance 键仅登记锚点来源与
     extension_preview 状态；验收锚点由 wt001_v1 golden 承载（WT-G2b-03 emit 冻结），
     本键面不预填 keyValues（emit 前不落任何通过判据）。 */
    acceptance: {
      reference: 'WT001_G2B_SPEC_APPROVED v1.0 §3（锚点预填，终值由 wt001_v1 oracle emit 冻结，WT-G2b-03）；WT-001 为 extension_preview，无 P0 验收面',
      exactness: 'WT-001 为扩展预览演示面：本节锚点数值仅作教学对照，不进入 P0 验收/golden 比对路径；验收锚点由 wt001_v1 golden 承载（WT-G2b-03 emit）'
    }
  };

  /* ================================================================== */
  /* MG-001 微电网多源聚合系统（MG001_G2B_SPEC_APPROVED v1.0 批准 CHG-20261110-01；
     实现 = MG-G2b-04 systems.js 面 / V110_WAVE_DESIGN §2 W5。§1 全量：拓扑 8 组件 7 边 /
     19 信号（§1.3 表序）/ EQ-MG-1..9 / 4 故障族（island_event 零参数族——Q2 定案，
     params:[] 库内首例）/ A-mg-* 10 条 / limitations 10 项。
     scope：MG-001 全场景 extension_preview（scope.js classify fall-through 零改动，规格 §2.5）；
     Arena：ARENA_EXCLUDED 增 'MG-001' 为 MG-G2b-04 显式工作面（arena.js，L7——本波 UI 路）。 */
  /* ================================================================== */
  var MG001 = {
    id: 'MG-001',
    title: '微电网多源聚合系统',
    shortTitle: '微电网聚合',
    experimentCode: 'MG-001',
    experimentName: '主馈线分断（功率平衡重整）',
    tagline: '在 20 秒分断主馈线，看母线功率平衡如何重整：储能从计划跟踪切换为平衡填补，缺口负荷卸载、重连后恢复。多源聚合 L0 演示，不含潮流/保护/频率电压模型。',
    level: '聚合层 L0 · 多源聚合行为级演示（G2b 已批准）',
    summary: '光伏与风电子轨、储能（电池能量面）与聚合负荷接入单母线：并网时理想馈线补差，脱离主馈线后储能按平衡填补并受 ±8 kW 钳位——功率平衡重整演示。各源物理复用既有系统轨，聚合层零新增动态方程。',
    questions: [
      '并网时馈线为什么是唯一的平衡者，脱离主馈线后平衡者如何切换？',
      '储能从计划跟踪切换为平衡填补后，钳位、卸载与倾卸分别在什么时候出现？',
      'PV 下行遮挡与 WT 上行阵风在同一母线上叠加时，零导入角点如何判读？'
    ],
    duration_s: 60,
    dt_s: 0.1,
    topologyViewBox: [0, 0, 1000, 620],
    defaults: {
      feedback_mode: 'closed_loop',
      /* initial 三键面（规格 §1.1 / Q5 定案）：p_sched_kW 为 MG 自有配置量（BESS 调度计划，
         默认 +5 kW 放电）；SOC_pct 沿 FL-001 initial 键面同构（聚合层 SOC0 = 账本初值）；
         无 inertia_model / thermal_model 键（单轨聚合层无新轨——scenario.js 事件级键守卫
         对未声明系统自动拒绝，现状即正确语义）。 */
      initial: { load_kW: 30, p_sched_kW: 5, SOC_pct: 60 },
      noise: { enabled: false, seed: 12345, level: 0 }
    },
    bounds: {
      load_kW: { min: 10, max: 45 },
      p_sched_kW: { min: -8, max: 8 }
      /* bounds 键面刻意不含 SOC_pct（规格 §1.1 域 [0,100] 仍有效）：checks.js soc-bounds /
         energy-balance 按 bounds.SOC_pct 派生分派——MG 聚合层无 E_source/E_bat 通用指标面
         （metrics.js 通用面），声明将致 energy-balance 恒 fail 误报；SOC0 ∈ [0,100] 域校验
         走 engine.validateConfig MG 专属分支（reject 纪律，MG-G2b-04），SOC0=0 角点负账本值
         = 域外声明（规格 §3.5 A-2 / MG-IMP-Q1 定案登记于 limitations）。 */
    },
    components: [
      comp({
        id: 'pv_unit', label: '光伏子轨（PV-001）', kind: 'pv_array', role: '不可调度源 · G0=1000 固定',
        description: 'PV-001 子轨原样复用（G0=1000 固定面）：出力由辐照度与 MPPT 决定；pv_shading_link 场景遮挡阶跃联动注入子轨。',
        x: 60, y: 60, w: 190, h: 96, faultable: true,
        inspector: [
          { id: 'P_pv_kW', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'wt_unit', label: '风电子轨（WT-001）', kind: 'rotor', role: '不可调度源 · v0=9 固定',
        description: 'WT-001 子轨原样复用（v0=9 固定面）：出力由风速与变流器决定；wt_gust_link 场景阵风阶跃联动注入子轨。',
        x: 60, y: 220, w: 190, h: 96, faultable: true,
        inspector: [
          { id: 'P_wt_kW', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'bess', label: '储能（FL-001 电池面）', kind: 'battery', role: '40 kWh / 400 V · 调度计划 / 孤岛平衡填补',
        description: '储能（电池能量面复用 FL-001：40 kWh / 400 V）：并网按调度计划恒功率跟踪，孤岛按平衡填补并受功率域钳位；SOC 仅账本通道。',
        x: 60, y: 380, w: 190, h: 96, faultable: false,
        inspector: [
          { id: 'P_bess_kW', source: 'MODEL_STATE' },
          { id: 'SOC_true_pct', source: 'MODEL_STATE' },
          { id: 'SOC_est_pct', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'ems', label: 'MG 调度（EMS）', kind: 'controller', role: '计划跟踪 ⇄ 孤岛平衡填补的角色切换',
        description: 'MG 调度（行为级）：并网按计划跟踪储能出力，脱离后切换为平衡填补；不是经过验证的设备控制器。',
        x: 340, y: 380, w: 170, h: 96, faultable: false,
        inspector: [
          { id: 'P_sched_kW', source: 'CONTROLLER' },
          { id: 'P_bess_chase_kW', source: 'CONTROLLER' }
        ]
      }),
      comp({
        id: 'bus', label: '聚合母线', kind: 'bus', role: '400 V 等效（功率平衡抽象）',
        description: '400 V 等效母线：功率平衡的抽象等效，不是电网模型；无电压/频率动态、无功与网损。',
        x: 420, y: 60, w: 160, h: 96, faultable: false,
        inspector: [
          { id: 'V_bus_V', source: 'MODEL_ASSUMPTION' },
          { id: 'r_true_kW', source: 'DERIVED' },
          { id: 'r_meas_kW', source: 'DERIVED' }
        ]
      }),
      comp({
        id: 'switch', label: '主馈线分断开关', kind: 'switch', role: '理想通断抽象 · island_event 注入点',
        description: '主馈线分断开关（理想通断抽象）：分断后母线脱离馈线，功率平衡由储能与负荷卸载重整；无检同期与保护逻辑。',
        x: 600, y: 220, w: 170, h: 84, faultable: true,
        inspector: [
          { id: 'island_state', source: 'MODEL_STATE' },
          { id: 'P_grid_true_kW', source: 'MODEL_STATE' }
        ]
      }),
      comp({
        id: 'feeder', label: '主馈线（理想平衡源）', kind: 'grid', role: '理想双向补差源 · 初始 5 kW 展示',
        description: '理想平衡功率馈线，瞬时吸收/补齐母线剩余功率；初始 5 kW 仅用于展示，不代表真实电网侧动态。',
        x: 790, y: 60, w: 190, h: 96, faultable: false,
        inspector: [
          { id: 'P_grid_true_kW', source: 'MODEL_STATE' },
          { id: 'P_grid_meas_kW', source: 'OBSERVATION' }
        ]
      }),
      comp({
        id: 'load', label: '聚合负荷', kind: 'load', role: '恒定 30 kW（load_step 为聚合输入阶跃）',
        description: '聚合负荷（恒功率阶跃面）：MG 层负荷是聚合输入，与 FL-001 已删除的 load_step（O-13）无语义继承——并网面由馈线瞬时补差吸收、孤岛面由钳位卸载重整吸收。',
        x: 790, y: 220, w: 190, h: 96, faultable: true,
        inspector: [
          { id: 'P_load_demand_kW', source: 'CONFIG' },
          { id: 'P_load_served_kW', source: 'MODEL_STATE' }
        ]
      })
    ],
    edges: [
      { id: 'pv_unit->bus', from: 'pv_unit', to: 'bus', kind: 'power', label: '光伏馈入' },
      { id: 'wt_unit->bus', from: 'wt_unit', to: 'bus', kind: 'power', label: '风电馈入' },
      { id: 'bess->bus', from: 'bess', to: 'bus', kind: 'power', label: '储能馈入（放电为正）' },
      { id: 'feeder->switch', from: 'feeder', to: 'switch', kind: 'power', label: '馈线侧连接' },
      { id: 'switch->bus', from: 'switch', to: 'bus', kind: 'power', label: '母线侧连接（分断时 0）' },
      { id: 'bus->load', from: 'bus', to: 'load', kind: 'power', label: '聚合负荷需求' },
      /* 刻意无 load→ems 边（规格 §1.1）：MG 负荷是聚合输入、EMS 按计划/孤岛平衡运行，
         平衡填补按真实功率值计算（A-mg-ems-true），无测量链边——与 PV/WT「无 load→控制器边」
         的不可调度声明同款结构手法。 */
      { id: 'ems->bess', from: 'ems', to: 'bess', kind: 'signal', label: '调度计划 / 填补指令' }
    ],
    faultAnchors: { load_step: 'load', shading_link: 'pv_unit', gust_link: 'wt_unit', island_event: 'switch' },
    signalCategories: [
      { id: 'power', label: '功率' },
      { id: 'soc', label: 'SOC' },
      { id: 'residual', label: '残差' },
      { id: 'island', label: '孤岛面' }
    ],
    signals: [
      /* 19 信号按 MG001_G2B_SPEC_APPROVED v1.0 §1.3 表逐行（表序 = SERIES_IDS 序，t 列由
         golden 惯例承载）；exposure 落点沿 PV/WT 体例：blind 信号显式声明
         exposure: 'blind_observable'（sourceKind 默认映射为 public_demo 的 CONTROLLER/
         DERIVED/CONFIG/MODEL_ASSUMPTION 必须显式声明才会落 blind），public 信号不声明
         （默认映射 public_demo）；blindVisible 不独立设置（由 exposure 派生）——
         §1.3 三值映射核对表工作面以本落地为准逐信号核对。单位 '-'（island_state）沿
         WT lambda_tip/cp_coeff 先例（schema.js UNIT_DICT 已入表，checks units 检查源
         UNITS 缺该值 = WT 同款并发落地面，本波零扩展——规格 §1.3 单位字典缺口核查）。 */
      sig({ id: 'island_state', label: '孤岛状态', shortLabel: 'island', unit: '-', category: 'island', sourceKind: 'MODEL_STATE', definition: '孤岛状态量（状态量非检测量）：0=并网 / 1=脱离主馈线（1(t≥t_start)·1(t<t_clear 或窗末)，EQ-MG-1）。', formula: 'island(t) = 1(t≥t_start)·1(t<t_clear 或窗末)', precision: 0, chart: { style: 'solid', colorToken: 'fault', axis: 'left', step: true } }),
      sig({ id: 'P_pv_kW', label: '光伏子轨馈入', shortLabel: 'P_pv', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: 'PV-001 子轨真实出力（G0=1000 固定面复用，EQ-MG-2）。', formula: 'P_pv(t) = PV-001 轨 P_pv,true', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_wt_kW', label: '风电子轨馈入', shortLabel: 'P_wt', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: 'WT-001 子轨真实出力（v0=9 固定面复用，EQ-MG-2）。', formula: 'P_wt(t) = WT-001 轨 P_wt,true', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_bess_kW', label: '储能出力', shortLabel: 'P_bess', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '储能真实出力（放电为正）：并网 = 调度计划；孤岛 = clamp(平衡填补目标, −8, +8)（EQ-MG-3/4/5）。', formula: '并网 P_bess = p_sched；孤岛 P_bess = clamp(chase, −8, +8)', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_sched_kW', label: '调度计划目标', shortLabel: 'P_sched', unit: 'kW', category: 'power', sourceKind: 'CONTROLLER', definition: 'BESS 调度计划（p_sched_kW 配置值，恒显示配置值——孤岛窗内计划挂起仍显示）。', formula: 'P_sched = p_sched_kW（配置值）', precision: 3, chart: { style: 'dashdot', colorToken: 'warm', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'P_bess_chase_kW', label: '平衡填补目标', shortLabel: 'chase', unit: 'kW', category: 'power', sourceKind: 'CONTROLLER', definition: '孤岛窗内平衡填补目标 = P_load − P_pv − P_wt（钳位前显式暴露）；其余时刻不可用（null）——事件域 null 列第二先例（I_bat_cap_A/beta_stuck_deg 同款）。', formula: '孤岛窗内 chase = P_load − P_pv − P_wt；窗外 null', precision: 3, chart: { style: 'dashdot', colorToken: 'warm', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'P_load_demand_kW', label: '聚合负荷需求', shortLabel: 'P_load', unit: 'kW', category: 'power', sourceKind: 'CONFIG', definition: '聚合负荷需求功率：load_kW + ΔP·1(t≥t0)（load_step 为聚合输入阶跃——与 FL-001 已删除的内部电气面 load_step（O-13）无语义继承）。', formula: 'P_load = load_kW + ΔP·1(t≥t0)', precision: 2, chart: { style: 'solid', colorToken: 'warm', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'P_load_served_kW', label: '负荷实际获得功率', shortLabel: 'P_served', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '负荷实际获得的功率：P_load − P_shed（并网面 ≡ P_load）。', formula: 'P_served = P_load − P_shed', precision: 2, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_grid_true_kW', label: '馈线真实功率', shortLabel: 'P_grid,true', unit: 'kW', category: 'power', sourceKind: 'MODEL_STATE', definition: '主馈线真实功率（受电为正；理想双向补差，倒送为负且不建模约束）；孤岛窗内恒为 0。', formula: '并网 P_grid = P_load − P_pv − P_wt − P_bess；孤岛 ≡ 0', precision: 3, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'P_grid_meas_kW', label: '馈线测量功率', shortLabel: 'P_grid,meas', unit: 'kW', category: 'power', sourceKind: 'OBSERVATION', definition: '馈线功率测量（健康通道）。', formula: 'P_grid,meas = P_grid,true（健康通道）', precision: 3, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable', noiseSigma: 0.15 }),
      sig({ id: 'P_shed_kW', label: '缺口卸载功率', shortLabel: 'P_shed', unit: 'kW', category: 'island', sourceKind: 'MODEL_STATE', definition: '孤岛面缺口卸载功率 = max(0, chase − P_bess)（并网面恒为 0）——功率平衡重整的缺口重整项。', formula: 'P_shed = max(0, chase − P_bess)', precision: 3, chart: { style: 'dashed', colorToken: 'fault', axis: 'left', step: true } }),
      sig({ id: 'P_dump_kW', label: '盈余倾卸功率', shortLabel: 'P_dump', unit: 'kW', category: 'island', sourceKind: 'MODEL_STATE', definition: '孤岛面盈余倾卸功率 = max(0, P_bess − chase)（并网面恒为 0；默认岛窗 chase=10 > −8 恒为 0，仅低负荷角点非零）——理想倾卸元件的抽象记账项，不是能量损失。', formula: 'P_dump = max(0, P_bess − chase)', precision: 3, chart: { style: 'dashed', colorToken: 'fault', axis: 'left', step: true } }),
      sig({ id: 'V_bus_V', label: '聚合母线电压', shortLabel: 'V_bus', unit: 'V', category: 'power', sourceKind: 'MODEL_ASSUMPTION', definition: '400 V 等效母线电压（功率平衡抽象的模型假设，不是仿真状态）。', formula: 'V_bus = 400 V（模型假设，非仿真状态）', precision: 0, chart: { style: 'solid', colorToken: 'ink', axis: 'left', defaultVisible: false }, exposure: 'blind_observable', tableOnly: true }),
      sig({ id: 'SOC_true_pct', label: '真实 SOC', shortLabel: 'SOC_true', unit: '%', category: 'soc', sourceKind: 'MODEL_STATE', definition: '由储能真实功率分段解析积分得到的荷电状态账本（FL EQ-6 形式复用，EQ-MG-7）。', formula: 'SOC_true = SOC0 − 100·∫P_bess dt/(3600·40)（分段解析）', precision: 5, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'SOC_est_pct', label: '估计 SOC', shortLabel: 'SOC_est', unit: '%', category: 'soc', sourceKind: 'OBSERVATION', definition: '由测量通道同式积分的 SOC 估计（全通道健康 ⇒ 与真实账本同值）。', formula: 'SOC_est = SOC0 − 100·∫P_bess,meas dt/(3600·40)', precision: 5, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'SOC_err_pp', label: 'SOC 估计误差', shortLabel: 'SOC_err', unit: 'pp', category: 'soc', sourceKind: 'DERIVED', definition: 'SOC_est − SOC_true 恒为 0（无偏置——与 FL-001 传感器偏置致 SOC_err≠0 的教学对照）。', formula: 'SOC_err = SOC_est − SOC_true ≡ 0', precision: 5, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable' }),
      sig({ id: 'r_true_kW', label: '真实功率平衡残差', shortLabel: 'r_true', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '真实功率平衡残差，定义恒等式（EQ-MG-6）：r_true ≡ P_pv + P_wt + P_bess + P_grid − P_served − P_dump ≡ 0（两模式同式）。', formula: 'r_true = P_pv + P_wt + P_bess + P_grid − P_served − P_dump ≡ 0', precision: 6, chart: { style: 'solid', colorToken: 'acc', axis: 'left' } }),
      sig({ id: 'r_meas_kW', label: '测量一致性残差', shortLabel: 'r_meas', unit: 'kW', category: 'residual', sourceKind: 'DERIVED', definition: '由测量构造的功率平衡残差；全部功率测量通道健康，恒为 0（与 FL-001 的 r_meas = 0.4·b 教学对照）。', formula: 'r_meas = P_pv + P_wt + P_bess + P_grid,meas − P_served − P_dump ≡ 0', precision: 2, chart: { style: 'dashed', colorToken: 'obs', axis: 'left' }, exposure: 'blind_observable' })
    ],
    faults: [
      fault({
        id: 'load_step', family: 'load_step', label: '聚合负荷阶跃', shortLabel: '负荷阶跃',
        target: 'load',
        description: '聚合输入阶跃（瞬时）：并网面由理想馈线瞬时补差/倒送吸收，孤岛面由钳位 + 卸载重整吸收；MG 层负荷是聚合输入，与 FL-001 已删除的 load_step（O-13）无语义继承。',
        params: [{ key: 'magnitude', label: '负荷阶跃幅值', unit: 'kW', min: -10, max: 20, step: 5, default: 10, precision: 0, help: '聚合负荷瞬时阶跃（可升可降）：并网面由理想馈线瞬时补差/倒送吸收；MG 层负荷是聚合输入，与 FL-001 已删除的 load_step（O-13）无语义继承' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: 'load 30→40（默认 +10）：P_grid 5→15 kW 瞬时（馈线补差），P_bess/SOC 不受影响（计划跟踪），r ≡ 0 维持；下行角点 load 30→20 → P_grid 5→−5 kW（倒送域，理想双向合法工作区）',
        monitorEffect: '同闭环（物理输入，两模式逐位同解）',
        causalTemplateId: 'mg-load-step'
      }),
      fault({
        id: 'shading_link', family: 'shading_link', label: 'PV 子轨遮挡联动', shortLabel: '遮挡联动',
        target: 'pv_unit',
        description: '遮挡阶跃联动注入 PV 子轨（子轨物理输入透传，源域原样 [50,300] W/m²）：聚合面看光伏出力下降、馈线补差上升；源轨物理与 PV-001 完全一致。',
        params: [{ key: 'magnitude', label: '遮挡降幅', unit: 'W/m²', min: 50, max: 300, step: 25, default: 300, precision: 0, help: '遮挡阶跃联动注入 PV 子轨：聚合面看光伏出力下降、馈线补差上升；源轨物理与 PV-001 完全一致' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '物理输入，与控制模式无关：P_pv 10→7 kW（τ=1.0 s 一阶跟随，(21.0)=8.103638），P_grid 5→8 kW，r ≡ 0 维持',
        monitorEffect: '同闭环（物理输入，两模式逐位同解）',
        causalTemplateId: 'mg-pv-shading-link'
      }),
      fault({
        id: 'gust_link', family: 'gust_link', label: 'WT 子轨阵风联动', shortLabel: '阵风联动',
        target: 'wt_unit',
        description: '阵风阶跃联动注入 WT 子轨（子轨物理输入透传，源域原样 [1.0,3.0] m/s）：默认参数跨额定区——风电出力爬升至额定封顶 15 kW。',
        params: [{ key: 'magnitude', label: '阵风增幅', unit: 'm/s', min: 1.0, max: 3.0, step: 0.5, default: 2.0, precision: 1, help: '阵风阶跃联动注入 WT 子轨：默认参数跨额定区——风电出力爬升至额定封顶 15 kW，馈线补差降至零导入角点' }],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '物理输入，与控制模式无关：P_wt 10→15.000000 kW（WT L0b 动态爬升封顶），P_grid 5→0.000000 kW（零导入角点，|·| ≤ 1e-9 容差声明——PV 10 + WT 15 + BESS 5 = load 30 恰平），r ≡ 0 维持',
        monitorEffect: '同闭环（物理输入，两模式逐位同解）',
        causalTemplateId: 'mg-wt-gust-link'
      }),
      fault({
        /* island_event 零参数族（Q2 定案——库内首例，params:[]）：脱离/重连语义由
           t_start_s（脱离）与 t_clear_s（重连，缺省 = 窗末持续脱离）完整承载，无幅值语义；
           挂空 magnitude 为伪参数不采。单故障/Run 模型下不可与其他族同时注入——
           「间歇性叠加改变卸载量」以场景级有序 Run 对比承载（规格 §2.4）。 */
        id: 'island_event', family: 'island_event', label: '主馈线分断（脱离/重连）', shortLabel: '主馈线分断',
        target: 'switch',
        description: '脱离主馈线：功率平衡重整演示——BESS 从计划跟踪切换为平衡填补（钳位 ±8 kW），缺口负荷卸载、盈余倾卸；重连后恢复馈线补差与计划跟踪。重连时刻由 t_clear_s 承载（缺省 = 窗末持续脱离）。',
        params: [],
        defaultTime_s: 20, timeRange: [2, 55],
        closedLoopEffect: '脱离（t_start）：P_grid ≡ 0、P_bess 5→8 kW（chase=10 超上限钳位）、P_shed=2 kW 持续、island_state 0→1；重连（t_clear）：P_grid→5、P_bess→5（计划恢复）、P_shed→0；r ≡ 0 全程维持（重整前后恒等式同式，EQ-MG-6）',
        monitorEffect: '同闭环（拓扑事件，两模式逐位同解）',
        causalTemplateId: 'mg-island-event'
      })
    ],
    model: {
      model_id: 'MG-001',
      model_version: '1.0.0',
      assumptions: [
        { id: 'A-mg-ideal-bus', text: '聚合母线 400 V 等效理想，无电压/频率动态、无功与网损；等效母线是功率平衡抽象，不是电网模型。' },
        { id: 'A-mg-reuse-tracks', text: 'PV/WT 源轨物理原样复用（PV-001 L0 / WT-001 L0b，G0=1000、v0=9 固定面），MG 聚合层不修改、不包裹、不重写任何源方程；联动开放须显式 CHG。' },
        { id: 'A-mg-bess-energy-face', text: 'BESS 复用 FL-001 电池能量面（P=0.4·I 换算、40 kWh、SOC 账本）：复用的是能量面公式形式，非 FL 反馈控制器面（传感器/限幅/τ 跟随面不进入聚合层）；FL thermal 轨不进入 MG。' },
        { id: 'A-mg-bess-structural-limit', text: 'BESS 功率域 [−8, +8] kW 为模型结构设定（非故障、非设备辨识）；钳位为理想硬钳位（无恢复动态、无 t_clear 概念——island_event 的重连由 t_clear_s 承载）。' },
        { id: 'A-mg-island-ideal-balance', text: '孤岛面 BESS 为理想瞬时平衡填补源（无滞后面）：恒等式按构造成立，不引入母线缓冲状态；「滞后源追逐失衡需缓冲」的反例证据 = FL-001 load_step O-13 删除记录（SCOPE_SPLIT_MEMO §5.2）。' },
        { id: 'A-mg-ems-true', text: 'EMS 平衡填补按真实功率值计算（load/P_pv/P_wt 真值，无测量链、无估计通道）；全功率测量通道健康 ⇒ r_meas ≡ 0、两模式逐位同解。' },
        { id: 'A-mg-const-sched', text: '并网面 BESS 按调度计划恒功率跟踪（p_sched_kW 无日内曲线/无 SOC 反演调度——SOC 仅账本通道，60 s 教学窗内 SOC 摆幅 ≤0.34 pp 永不绑定功率面）。' },
        { id: 'A-mg-load-step-instant', text: '聚合负荷阶跃为瞬时阶跃（无爬坡）；并网面由馈线瞬时补差吸收（恒负荷系统同构面），孤岛面由钳位 + 卸载重整吸收——两模式恒等式按构造成立（O-13 语义差异声明）。' },
        { id: 'A-mg-island-abstract', text: '分断开关为理想通断抽象：分断即馈线功率恒为 0、重连即恢复补差；无检同期、无过渡过程、无保护逻辑——本演示为脱离主馈线的功率平衡重整演示，不代表真实电网侧动态。' },
        { id: 'A-mg-l0', text: 'MG 调度与平衡填补为行为级聚合逻辑，不是经过验证的设备控制器。' }
      ],
      limitations: [
        '潮流与网络方程未建模（单母线聚合，无线路阻抗/潮流分布/多母线拓扑——TL-001 远期候选）。',
        '频率/电压/无功概念全平面未建模（含一次调频、AVR、电压稳定——GT-001 承载频率行为级面，MG 不重复）。',
        '孤岛保护与重整控制逻辑未建模：检同期、防孤岛、低电压/频率穿越、重整后的二次调频/调压——均未建模（无频率/电压概念；命名仅出现在本清单，不进入教学文案）。',
        'BESS 深物理未建模：内阻/温度面（FL thermal 轨不进入聚合）、变流器效率曲线、SOC 对功率域的反演绑定（SOC 仅账本——SOC0=0 角点 SOC 可为负，域外声明）。',
        '源轨内部未建模面整体继承（PV I-V 工作点/温度动态/局部遮挡；WT 尾流/湍流/气弹/停机——各源规格 limitations 原样适用，MG 不新增不减轻）。',
        '计划调度面未建模：p_sched 无日内曲线、无 SOC 反演、无多时段优化（储能调峰教学点以「计划跟踪 ⇄ 孤岛填补」角色切换承载，非调度算法演示）。',
        '负荷模型：聚合负荷为恒功率阶跃面，无 ZIP/动态负荷/负荷恢复动态。',
        '倒送域与倾卸域：并网 P_grid < 0（倒送）为理想双向馈线合法工作区（PV/WT 同款声明）；孤岛盈余倾卸 P_dump 为理想倾卸元件（抽象记账项，不是能量损失）。',
        'normalizeConfig 无跨参数校验（FL-001 同款先例），手拼配置可致 SOC0 极低角点（负账本值，域外声明）；MG-IMP-Q1 定案（MG-G2b-04）：engine validateConfig 对 initial 三键出域 reject（FL/PV/WT 同款 reject 纪律），不做引擎侧数值钳位（FL-001 退化域声明先例——负账本值如实输出并在此登记）。',
        'L0 聚合行为级演示模型；非实测、非 Simulink、无实测对比。本模型为多源聚合行为级并网演示（L0），非机组/电网动态验证。'
      ],
      equations: [
        { id: 'EQ-MG-1', latex_text: 'load(t) = load_kW + ΔP·1(t ≥ t0)（仅 load_step）; island(t) = 1(t ≥ t_start)·1(t < t_clear)（t_clear 缺省 = 窗末 60 s，仅 island_event）; 子轨事件透传：ΔG/Δv 于各自 t0 生效', note: '聚合输入面（事件感知，断点全部落在 0.1 s 网格与事件边界；t0 处右极限 post 采样行语义）' },
        { id: 'EQ-MG-2', latex_text: 'P_pv(t) = PV-001 轨输出（G0=1000 固定面）; P_wt(t) = WT-001 轨输出（v0=9 固定面）', note: '源轨复用声明（EQ-MG-2：engine 侧 = simulatePV001/simulateWT001 内部组合复用调用，不重写物理；oracle 侧 = pv001_oracle/wt001_oracle 参数化序列函数复用）' },
        { id: 'EQ-MG-3', latex_text: '并网面：P_bess = p_sched; P_grid = load − P_pv − P_wt − P_bess（受电为正，理想双向）; P_served = load; P_shed = P_dump = 0', note: '并网功率平衡（馈线补差——FL/PV/WT 馈线同构，无爬坡/额定/倒送约束）' },
        { id: 'EQ-MG-4', latex_text: '孤岛面：P_grid ≡ 0; chase = load − P_pv − P_wt; P_bess = clamp(chase, −8, +8); P_shed = max(0, chase − P_bess); P_dump = max(0, P_bess − chase); P_served = load − P_shed', note: '脱离主馈线的功率平衡重整（BESS 理想瞬时填补 + 钳位 + 卸载/倾卸，Q4 已定案——恒等式按构造成立，无缓冲状态）' },
        { id: 'EQ-MG-5', latex_text: '调度面：并网 P_bess 目标 = p_sched（计划跟踪）; 孤岛计划挂起、切换为平衡填补; 重连恢复计划跟踪', note: 'BESS 角色切换 = 重整教学点（计划跟踪 ⇄ 孤岛填补）' },
        { id: 'EQ-MG-6', latex_text: 'r_true ≡ P_pv + P_wt + P_bess + P_grid − P_served − P_dump ≡ 0（定义恒等，两模式同式）; r_meas ≡ 0（全功率测量通道健康）; 孤岛面恒等：ΣP_source = P_served + P_dump = load − P_shed + P_dump', note: '母线恒等式（并网 ΣP_source + P_grid = P_load、孤岛 ΣP_source = 重整后服务负荷 + 倾卸；r_meas ≡ 0 与 FL-001 r_meas = 0.4·b 教学对照）' },
        { id: 'EQ-MG-7', latex_text: 'SOC_true(t) = SOC0 − 100·∫[0,t] P_bess dt/(3600·40)（%）; SOC_est 同式用测量通道; SOC_err ≡ 0', note: 'FL EQ-6 形式复用；积分 = 事件感知分段解析（Q1(b) 定案结构推论：island Run 源恒健康 ⇒ chase 分段常值 ⇒ clamp 分段常值 ⇒ P_bess 分段常值，断点 = 事件边界）' },
        { id: 'EQ-MG-8', latex_text: 'E_x = 事件感知精确积分（kW·s，÷3600 → kWh）：分段常值信号按段解析; 时变源段（E_pv/E_wt）复用源轨积分; E_grid := E_served + E_dump − E_pv − E_wt − E_bess（恒等导出）', note: '能量口径（EQ-PV-7 事件感知先例；采样网格右端点和 ≠ 解析积分的边界伪差显式排除；E_grid 恒等导出避免对时变 P_grid 序列做数值积分）' },
        { id: 'EQ-MG-9', latex_text: 'V_bus = 400 V（模型假设，tableOnly，非仿真状态）', note: '母线抽象（PV/WT 同款）' }
      ]
    },
    /* MG-001 无 P0 验收面（extension_preview：scope.js classify fall-through，规格 §2.5/§5；
       assertApprovedP0 对 MG 配置抛 SCOPE-E01）。acceptance 键仅登记锚点来源与
       extension_preview 状态；验收锚点由 mg001_v1 golden 承载（MG-G2b-03 emit 冻结），
       本键面不预填 keyValues（WT-001 先例同构）。 */
    acceptance: {
      reference: 'MG001_G2B_SPEC_APPROVED v1.0 §3（锚点包络，终值由 mg001_v1 oracle emit 冻结，MG-G2b-03）；MG-001 为 extension_preview，无 P0 验收面',
      exactness: 'MG-001 为扩展预览演示面：本规格锚点数值仅作教学对照，不进入 P0 验收/golden 比对路径；验收锚点由 mg001_v1 golden 承载（MG-G2b-03 emit）'
    }
  };

  /* ================================================================== */
  /* 因果模板（engine 用数值证据填充；页面只渲染 run.causal）              */
  /* ================================================================== */
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
    },
    /* FL-001 thermal 轨叙事卡（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §6.4；V072 DEC-1 项 6
       GT thermo_track 静态叙事卡先例同构，模板键名 thermal_track 沿「轨名_track」同构）。
       定位声明：本卡是静态教学叙事面（跨深度对比卡），不是运行期故障因果模板——
       engine.buildCausal 按 fault.family 分派模板（system.causalTemplates[family]），
       既有 sensor_drift / actuator_fault 两模板零改动、运行期行为零变更；
       本卡经 FL.systems.causalTemplate('FL-001', 'thermal_track') 供教学/对比面引用，
       节点数值为 FLTH 规格 §3.1/§3.2 v1.0 口径复算预填值（终值由 fl001_v2 oracle emit
       冻结，FLTH-G2b-03），不是经过验证的设备热学特性数字。 */
    thermal_track: {
      id: 'fl-thermal-compensation',
      headline: '同一故障、两种模型深度：FL-001 L0（thermal_model=off）↔ L1-thermal（on）跨深度叙事卡（thermal_model=on 轨）',
      mechanismSummary: '偏置 → 真实电流下降 → 焦耳热下降 → 热平衡左移：+10 A 偏置使闭环真实电流 25→15 A，热损耗 P_loss = I_true²·R_int(T_bat) 由 125 W 量级降至 45 W 量级，电池温度在短暂惯性过冲后转入降温恢复轨；热损耗由发电机补偿（模型记账口径，P_gen = P_load − P_bat + P_loss）。电气面（I/SOC/E_bat/r_meas）与 off 轨逐位同——跨深度分歧全部位于热面与损耗补偿面，是模型深度导致的表达力差异，不是精度优劣声明。',
      nodes: [
        {
          id: 'n1', order: 1, title: '偏置注入（两深度同一配置事实）', short: '电流通道 +10 A @ t=20 s',
          layer: 'config', componentId: 'sensor', signalIds: ['bias_A'],
          detail: '偏置写进电流测量通道（I_meas = I_true + b(t)）。这一步是配置事实，与 thermal_model 无关——off 轨与 on 轨的注入配置完全相同，电气面更新序也逐字相同（thermal on 不回写电气面），分歧从热面与损耗补偿面开始。'
        },
        {
          id: 'n2', order: 2, title: '真实电流下降与损耗坍缩（电气面两深度同源）', short: 'I_true 25 → 15 A；焦耳热 125 → 45 W',
          layer: 'observation', componentId: 'battery', signalIds: ['I_bat_true_A', 'P_loss_kW'],
          detail: '闭环把真实电流从 25 A 拉向 I_ref − b = 15 A（与 off 轨逐位同）；on 轨新增的热面按 P_loss = I_true²·R_int(T_bat) 重算：t=20.0 为 0.132892 kW → 故障衰减后 t=60 为 0.047371 kW（I² 律 + 温度反馈）。off 轨无热力面（T_bat_K/P_loss_kW 全程 null）。'
        },
        {
          id: 'n3', order: 3, title: '温升 → 过冲 → 降温恢复（L1 独有观测）', short: 'T_bat 304.463784 → 峰 304.639878 @22.1 s → 303.419884 K（t=60）',
          layer: 'observation', componentId: 'battery', signalIds: ['T_bat_K'],
          detail: 't=20.0 前健康温升轨达 304.463784 K（T 连续、事件行无跳变）；故障后电流衰减期损耗仍大于散热，温度惯性过冲至峰值 304.639878 K（t=22.1 s，+0.176 K），随后转入降温恢复：T(60) = 303.419884 K（渐近 302.862042 K）。这一整条温升/降温路径在 L0 轨完全不可见——模型深度导致的表达力差异。'
        },
        {
          id: 'n4', order: 4, title: '热损耗由发电机补偿（模型记账口径）', short: 'P_gen(60) 24.000000 → 24.047371 kW',
          layer: 'observation', componentId: 'generator', signalIds: ['P_gen_true_kW'],
          detail: '守恒面 (a)（Q1 定案，CHG-20261107-01）：P_gen = P_load − P_bat + P_loss——损耗使电池包净馈入下降 P_loss，理想平衡源即时补齐（模型记账口径）；同故障 P_gen(60) 由 off 轨 24.000000 kW 变为 24.047371 kW，差值 = P_loss(60)。损耗同时加热电池包（EQ-FLTH-4）——「损耗不免费、有源可查、有温可测」。'
        },
        {
          id: 'n5', order: 5, title: '能量账本与口径声明', short: 'E_source 0.3761111 → 0.3773898 kWh；电气面两深度逐位同',
          layer: 'observation', componentId: 'bus', signalIds: ['r_true_kW', 'r_meas_kW'],
          detail: 'E_loss(60) = 0.0012787 kWh、E_source = 0.3761111 → 0.3773898 kWh，恒等式 E_source + E_bat = E_load + E_loss（EQ-FLTH-9 检查式）。口径声明：①电气面（I/SOC/E_bat/r_meas）与 off 轨逐位同（热面对电气面零反馈，A-flth-no-feedback）；②max|r_meas| = 4.0 kW 是测量偏差，不是能量损失——r_meas 恒等式扩展含 −P_loss 项后 0.4·b 教学锚点在两深度保持纯净（Q3 定案）；③R0/α/C_bat/h 为教学整定值（非实测参数）。'
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '进入闭环反馈' },
        { from: 'n2', to: 'n3', label: '热平衡左移' },
        { from: 'n2', to: 'n4', label: '损耗补偿', dashed: true },
        { from: 'n4', to: 'n5', label: '能量账本' },
        { from: 'n3', to: 'n5', label: '口径与边界' }
      ],
      monitorNodes: [
        {
          id: 'm1', order: 1, title: '偏置注入（仅监测）', short: '偏置不进入物理回路',
          layer: 'config', componentId: 'sensor', signalIds: ['bias_A'],
          detail: '仅监测模式下偏置只污染测量通道，真实电流保持 25 A——热面与健康局（thermal on 无故障轨）逐点恒等：T_bat(60) = 309.953229 K（max|ΔT| = 0，偏置不进入物理回路的结构判据）。'
        },
        {
          id: 'm2', order: 2, title: '测量面照常偏移', short: 'r_meas = +4.0 kW；P_gen(60) = 20.139754 kW',
          layer: 'observation', componentId: 'bus', signalIds: ['r_meas_kW', 'P_gen_true_kW'],
          detail: '测量偏差不进入物理回路，但测量面照常暴露：r_meas = +4.0 kW（0.4·b，是测量偏差，不是能量损失）；on 轨发电机出力含损耗补偿 P_gen(60) = 20.139754 kW（= 20.000 + 0.139754）。'
        }
      ],
      monitorEdges: [
        { from: 'm1', to: 'm2', label: '测量与真实分离' }
      ],
      assumptions: ['A-ideal-bus', 'A-ideal-gen', 'A-const-v', 'A-soc-linear', 'A-l0', 'A-fl-clamp', 'A-flth-lump', 'A-flth-params', 'A-flth-loss', 'A-flth-no-feedback', 'A-flth-stability', 'A-flth-l1'],
      limitations: [
        '本卡为 thermal_model=on 轨静态叙事面，不是运行期故障因果模板——运行期因果链仍按 fault.family 由既有模板分派。',
        '引用数值为 FLTH 规格 §3.1/§3.2 v1.0 口径复算预填值（终值由 fl001_v2 oracle emit 冻结，FLTH-G2b-03）；R0/α/C_bat/h 为教学整定值，不对应任何真实电池包热特性。',
        'thermal_model=off 轨无热力面（T_bat_K/P_loss_kW 全程 null）；跨深度对比只在 on 轨有 T_bat/P_loss 观测。',
        '无热保护建模：load0=45 角点渐近 655.29 K 为合法演示值（thermal on 局限条目）。'
      ],
      alternatives: [{ title: '若切回 thermal_model=off 轨', text: '同故障电气面逐位不变（I/SOC/E_bat/r_meas 与 on 轨一致），热力面全程不可见（T_bat/P_loss null）、P_gen 无损耗补偿项（24.000000 kW）——「模型深度导致的表达力差异」，非精度优劣声明。' }]
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
       定位声明（V090 DEC-5 运行期自动挂载落地后更新）：本卡是跨深度对比教学卡，
       非主链分派键——GT thermo 轨 Run（inertia_model=thermo ∧ family≠none）经
       engine.buildCausal 自动挂载为 causal.thermoTrackCard 附加字段（与主链同一
       构建机制产出，字段面同构，engine.js DEC-5 挂载块；run_hash 不含 causal），
       主链仍按 fault.family 由既有 sensor_drift / load_step / actuator_fault 三模板
       分派；本卡另经 FL.systems.causalTemplate('GT-001', 'thermo_track') 供静态
       教学/对比面引用，节点数值为 §3.2 v1.0 口径（与 tests/engine-gt.test.js 跨深度
       分歧断言同源：gt001_v2 冻结锚点 + thermo 轨 T-B 容差断言），不是经过验证的
       设备特性数字。 */
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
        '本卡为 thermo 轨跨深度叙事卡，非主链分派键——GT thermo 轨 Run 经 buildCausal 自动挂载为 causal.thermoTrackCard 附加字段（主链仍按 fault.family 分派）。',
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

  /* WT-001 因果模板三件（WT001_G2B_SPEC_APPROVED v1.0 §6.4；engine.buildCausal 按
     fault.family 分派——键面 = family 名，id = causalTemplateId）。
     占位符契约（engine.buildCausalFacts WT-001 分支，L3 接线）：{t0} {mag} {unit} {sign}
     {faultLabel} {targetComponent} 为通用事实；WT 专属 = v_true_pre/v_true_post、
     v_meas_pre/v_meas_post、P_ref_pre/P_ref_post、P_wt_pre/P_wt_60、P_grid_pre/P_grid_60、
     P_load_pre/P_load_post/P_load_60、n_rotor_pre/n_rotor_60、beta_pre/beta_60、beta_stuck、
     lambda_60、cp_60、d_wt_peak、d_wt_60、r_true_max、r_meas_max、E_wt、E_wt_est、E_wt_err
     （PV-001 分支同构取数：series 采样 + metrics，见交接注记）。 */
  WT001.causalTemplates = {
    sensor_drift: {
      id: 'wt-sensor-drift',
      headline: 't={t0} s，{faultLabel}：{mag} {unit} 低估注入风速测量通道',
      /* 核心教学点（§6.4）：闭环把低估故障吸收进自洽——保护钳位使真实出力恒等于被低估的
         估计值，d_wt 瞬态后归零；r_meas ≡ 0（全功率通道健康）与 FL-001 的 +4 kW 对照；
         转速上升 + 桨距介入为机械动态环节（PV 无此环节）。 */
      mechanismSummary: '偏置污染风速测量通道 → 可用功率保护钳位按低估风速收紧 → 变流器目标功率被压低 → 真实出力 τ=1.0 s 跟随下行 → 转速上升、桨距介入（机械动态环节，PV 无此环节）→ 馈线补差增加。闭环把低估故障吸收进自洽：一致性残差 d_wt 瞬态 +{d_wt_peak} kW 后稳态归零（真实出力恒等于被低估的估计值）；r_meas ≡ 0 与 FL-001 传感器偏置的 +4 kW 测量残差形成教学对照。',
      nodes: [
        {
          id: 'n1', order: 1, title: '低估偏置注入', short: '风速偏置 −{mag} {unit}',
          layer: 'config', componentId: 'anemometer', signalIds: ['bias_ms'],
          detail: '因为 {t0} s 在{targetComponent}的测量通道注入了 {mag} {unit} 低估阶跃偏置（b(t) = −{mag}，{t0} s 前为 0），所以测量风速的生成规则变为 v_ctrl = v_true + b(t)。这是配置定义的故障事实，不是测量噪声，也不是模型推断。',
          evidence: [{ varId: 'bias_ms', tStartOffset: -0.1, tEndOffset: 0.1, note: '事件前 b(t)=0，{t0} s 起 b(t)=−{mag} {unit}' }]
        },
        {
          id: 'n2', order: 2, title: '测量风速下降', short: 'v_meas {v_meas_pre} → {v_meas_post} m/s',
          layer: 'observation', componentId: 'anemometer', signalIds: ['v_meas_ms', 'v_true_ms'],
          detail: '因为偏置直接叠加在测量通道上，所以控制面读数在 {t0} s 由 {v_meas_pre} m/s 跳到 {v_meas_post} m/s；真实风速 v_true 仍为 {v_true_post} m/s。EMS 估计通道恒用被低估的测量值（v_est = v_true + b(t)，不随运行模式切换）。',
          evidence: [{ varId: 'v_meas_ms', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {v_meas_pre} m/s → 20.0 s {v_meas_post} m/s' }]
        },
        {
          id: 'n3', order: 3, title: '可用功率保护钳位收紧', short: 'P_v_cap 10.00 → {P_ref_post} kW',
          layer: 'mechanism', componentId: 'converter', signalIds: ['P_wt_ref_kW'],
          detail: '因为可用功率保护钳位 P_v_cap = k_v·v_ctrl³ 为防失速守卫（EQ-WT-4 第三支路），低估使钳位由 k_v·9³ = 10.00 kW 收紧到 {P_ref_post} kW，变流器目标功率 P_ref = min(k_opt·ω³, P_rated, k_v·v_ctrl³) 改由钳位支路绑定。',
          evidence: [{ varId: 'P_wt_ref_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '目标功率保持 {P_ref_post} kW（钳位支路绑定），被污染的是风速输入通道' }]
        },
        {
          id: 'n4', order: 4, title: '真实出力跟随下行', short: 'P_wt {P_wt_pre} → {P_wt_60} kW',
          layer: 'observation', componentId: 'converter', signalIds: ['P_wt_true_kW'],
          detail: '因为 P_wt 按受控功率源以 τ_e = 1.0 s 一阶跟随被压低的目标，所以真实出力从 {P_wt_pre} kW 降到 {P_wt_60} kW——恰等于被低估的估计值（闭环把测量故障吸收进自洽）。',
          evidence: [{ varId: 'P_wt_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障时刻后真实出力一阶下行：20.0 s {P_wt_pre} kW → 60.0 s {P_wt_60} kW' }]
        },
        {
          id: 'n5', order: 5, title: '转速上升、桨距介入（机械动态节点）', short: 'n {n_rotor_pre} → {n_rotor_60} rpm，β → {beta_60}°',
          layer: 'observation', componentId: 'rotor', signalIds: ['n_rotor_rpm', 'beta_pitch_deg', 'lambda_tip'],
          detail: '因为气动功率未变而出力被压低，净扭矩转正、转速由 {n_rotor_pre} rpm 升至 {n_rotor_60} rpm；ω 越过 ω_N 后桨距比例调节介入（β → {beta_60}°），λ 右支偏移至 {lambda_60}。环境变化在 PV 是解析映射，在 WT 要经过惯性与工作点漂移。',
          evidence: [{ varId: 'n_rotor_rpm', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s {n_rotor_pre} rpm → 60.0 s {n_rotor_60} rpm（桨距随即介入）' }]
        },
        {
          id: 'n6', order: 6, title: '馈线补差增加', short: 'P_grid {P_grid_pre} → {P_grid_60} kW',
          layer: 'observation', componentId: 'grid', signalIds: ['P_grid_true_kW'],
          detail: '因为负载恒定 {P_load_60} kW 且风电机组少发了功率，所以理想馈线的补差功率由 {P_grid_pre} kW 升到 {P_grid_60} kW（受电为正，瞬时补差）。',
          evidence: [{ varId: 'P_grid_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s {P_grid_pre} kW → 60.0 s {P_grid_60} kW' }]
        },
        {
          /* ⑦ 一致性残差：代数恒等（§6.4 / UI_COPY_GUARDRAILS 口径）。
             d_wt 是测量链一致性的代数恒等，不是能量损失，也不是 ⑥ 的结果。 */
          id: 'n7', order: 7, title: '最优曲线一致性残差', short: 'd_wt 瞬态 +{d_wt_peak} kW → 稳态 {d_wt_60} kW；r_meas = {r_meas_max}',
          layer: 'observation', componentId: 'bus', signalIds: ['d_wt_kW', 'r_true_kW', 'r_meas_kW'],
          kind: 'algebraic_identity',
          epistemic: '代数恒等',
          detail: 'd_wt = P_wt,meas − P_wt,est = P_wt,true − k_v·v_est³（代数恒等，不是能量损失）。估计通道按瞬时跳变、真实出力按 τ = 1.0 s 滞后，故 {t0} s 处 d_wt = +{d_wt_peak} kW，随后随真实出力压低到被低估的估计值而稳态归零（{d_wt_60} kW）——闭环把测量故障吸收进自洽。r_meas ≡ {r_meas_max}：全部功率测量通道健康，与 FL-001 传感器偏置的 +4 kW 测量残差形成教学对照；r_true ≡ {r_true_max}。能量账本：E_wt = {E_wt} kWh、E_wt,est = {E_wt_est} kWh、ΔE_wt = {E_wt_err} kWh（估计偏少）。',
          evidence: [{ varId: 'd_wt_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障后 d_wt 从 +{d_wt_peak} kW 指数回归 0（稳态自洽）' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '注入测量通道' },
        { from: 'n2', to: 'n3', label: '进入保护钳位' },
        { from: 'n3', to: 'n4', label: '目标功率压低' },
        { from: 'n4', to: 'n5', label: '净扭矩转正' },
        { from: 'n5', to: 'n6', label: '馈线补差变化' },
        { from: 'n2', to: 'n7', label: '测量通道偏差的代数当量', dashed: true }
      ],
      monitorNodes: [
        {
          id: 'm1', order: 1, title: '低估偏置注入（仅监测）', short: '风速偏置 −{mag} {unit}',
          layer: 'config', componentId: 'anemometer', signalIds: ['bias_ms'],
          detail: '因为 {t0} s 在{targetComponent}的测量通道注入了 {mag} {unit} 低估阶跃偏置，所以测量风速跳低 {mag} {unit}。本次运行是仅监测模式：偏置不进入物理回路，保护钳位改读真实风速。',
          evidence: [{ varId: 'bias_ms', tStartOffset: -0.1, tEndOffset: 0.1, note: '事件前 b(t)=0，{t0} s 起 b(t)=−{mag} {unit}' }]
        },
        {
          id: 'm2', order: 2, title: '真实出力不变', short: 'P_wt ≡ {P_wt_pre} kW（钳位松开）',
          layer: 'mechanism', componentId: 'converter', signalIds: ['P_wt_true_kW'],
          detail: '因为仅监测模式下保护钳位改读真实风速（钳位松开），所以真实出力保持 {P_wt_pre} kW、转速保持 {n_rotor_pre} rpm；故障只改变测量与估计，不改变物理状态。',
          evidence: [{ varId: 'P_wt_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障期间真实出力保持 {P_wt_pre} kW' }]
        },
        {
          id: 'm3', order: 3, title: '一致性残差持续暴露', short: 'd_wt ≡ +{d_wt_peak} kW',
          layer: 'observation', componentId: 'bus', signalIds: ['d_wt_kW'],
          detail: '因为估计通道恒用测量风速（不随运行模式切换），所以 d_wt = P_wt,true − k_v·v_est³ 在故障期间恒为 +{d_wt_peak} kW（界破坏特征，不归零）——健康测量下 d_wt ≤ 0 的界被测量伪影破坏，特征本身即检出依据；与闭环稳态归零形成对照。',
          evidence: [{ varId: 'd_wt_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障期间 d_wt 恒为 +{d_wt_peak} kW' }]
        },
        {
          id: 'm4', order: 4, title: '估计电能偏少', short: 'ΔE_wt = {E_wt_err} kWh',
          layer: 'observation', componentId: 'converter', signalIds: ['P_wt_est_kW'],
          detail: '因为估计按被低估的测量风速折算，所以 E_wt,est = {E_wt_est} kWh 低于真实 E_wt = {E_wt} kWh，ΔE_wt = {E_wt_err} kWh（估计偏少）；本系统无 SOC，SOC_est 通道的功能位由 P_wt,est/ΔE_wt 承担，真实电能与无故障基准相同。',
          evidence: [{ varId: 'P_wt_est_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '估计功率阶跃后保持低位，与真实出力分离' }]
        },
        {
          id: 'm5', order: 5, title: '馈线不变', short: 'P_grid ≡ {P_grid_pre} kW',
          layer: 'observation', componentId: 'grid', signalIds: ['P_grid_true_kW'],
          detail: '因为真实出力不变，所以馈线补差保持 {P_grid_pre} kW；测量面（v_meas、P_wt,est、d_wt）持续暴露低估偏置。',
          evidence: [{ varId: 'P_grid_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障期间馈线功率保持 {P_grid_pre} kW' }]
        }
      ],
      monitorEdges: [
        { from: 'm1', to: 'm2', label: '不进入物理回路' },
        { from: 'm1', to: 'm3', label: '估计通道读测量值' },
        { from: 'm2', to: 'm4', label: '真实能量不变，仅估计偏移' },
        { from: 'm1', to: 'm5', label: '测量与真实分离' }
      ],
      assumptions: ['A-wt-ideal-bus', 'A-wt-guard', 'A-wt-mppt-omega', 'A-wt-est-channel', 'A-wt-ideal-feeder', 'A-wt-const-load', 'A-wt-l0b'],
      limitations: ['τ_e = 1.0 s 为行为级等效时间常数，非实测参数。', '风速传感器偏置经保护钳位与估计通道进入闭环（单向性：低估压低真实出力、高估零真实效应）。', 'L0b 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若为仅监测模式', text: '偏置不进入物理回路（保护钳位改读真实风速），真实出力保持 10 kW，只有测量风速、估计功率与 d_wt ≡ +2.98 kW 持续暴露（界破坏特征）；ΔE_wt = −0.0331 kWh（估计偏少）。' }]
    },
    actuator_fault: {
      id: 'wt-pitch-stuck',
      headline: 't={t0} s，{faultLabel}：变桨卡涩钉扎于 β_stuck = {beta_stuck}°',
      mechanismSummary: '变桨执行器位置强制钉扎（物理执行器故障，两模式同生效）→ 桨距角 β 0→{beta_stuck}° → Cp(λ,β) 骤降 → 气动功率坍缩 → 净扭矩为负、转速沿 MPPT 曲线下行 → 真实出力降至左支平衡 → 馈线补差上升。d_wt 持续 {d_wt_60} kW 不归零（运行点偏离最优曲线的故障特征——与 sensor_drift 闭环归零对照）。',
      nodes: [
        {
          id: 'n1', order: 1, title: '卡涩注入（位置强制）', short: 'β_stuck = {beta_stuck}°',
          layer: 'config', componentId: 'pitch_act', signalIds: ['beta_stuck_deg'],
          detail: '因为 {t0} s 变桨执行器卡涩于 β_stuck = 30° × {mag}% = {beta_stuck}° 偏转位置（位置强制语义），所以执行器激活窗内实际桨距角被钉扎：β ≡ β_stuck（跳过一阶跟随）。这是配置定义的故障事实；事件域信号自 t_start 生效，状态行取子步起点 pre 值。',
          evidence: [{ varId: 'beta_stuck_deg', tStartOffset: -0.1, tEndOffset: 0.1, note: '{t0} s 前无钉扎值（null），之后 β_stuck = {beta_stuck}°' }]
        },
        {
          id: 'n2', order: 2, title: '两模式同生效', short: '物理执行器故障：闭环与仅监测同',
          layer: 'mechanism', componentId: 'pitch_act', signalIds: ['beta_pitch_deg', 'beta_cmd_deg'],
          detail: '因为卡涩作用于物理执行器而非测量或指令通道，所以两种运行模式下物理过程相同；亚额定工况桨距指令 β_ref = 0，限幅式卡涩将是 no-op——本族因此采用位置强制语义（Q2 定案）。',
          evidence: [{ varId: 'beta_pitch_deg', tStartOffset: -0.1, tEndOffset: 0.1, note: '实际桨距角钉扎于 {beta_stuck}°（与指令无关）' }]
        },
        {
          id: 'n3', order: 3, title: 'Cp 骤降（气动效率坍缩）', short: 'cp 0.480 → {cp_60}（λ 左支 {lambda_60}）',
          layer: 'mechanism', componentId: 'rotor', signalIds: ['cp_coeff', 'lambda_tip'],
          detail: '因为桨距角 β = {beta_stuck}° 进入 Cp(λ,β) 经验式（EQ-WT-2/3），所以风能利用系数由最优值 0.480 骤降至 {cp_60}，气动功率沿 λ 左支坍缩。',
          evidence: [{ varId: 'cp_coeff', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障后 Cp 骤降并稳定在左支平衡值附近' }]
        },
        {
          id: 'n4', order: 4, title: '净扭矩为负、转速下行', short: 'n {n_rotor_pre} → {n_rotor_60} rpm',
          layer: 'observation', componentId: 'rotor', signalIds: ['n_rotor_rpm', 'P_aero_kW'],
          detail: '因为气动功率坍缩而电功率尚未跟上，净扭矩为负（J·dω/dt = (P_aero − P_wt)/ω），所以转速由 {n_rotor_pre} rpm 下行至 {n_rotor_60} rpm。',
          evidence: [{ varId: 'n_rotor_rpm', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s {n_rotor_pre} rpm → 60.0 s {n_rotor_60} rpm' }]
        },
        {
          id: 'n5', order: 5, title: 'MPPT 曲线跟随', short: 'P_wt {P_wt_pre} → {P_wt_60} kW',
          layer: 'observation', componentId: 'converter', signalIds: ['P_wt_true_kW'],
          detail: '因为转速沿 MPPT 最优曲线下行（k_opt·ω³ 支路绑定），所以真实出力从 {P_wt_pre} kW 降至 {P_wt_60} kW（左支平衡）。',
          evidence: [{ varId: 'P_wt_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障时刻后真实出力一阶下行：20.0 s {P_wt_pre} kW → 60.0 s {P_wt_60} kW' }]
        },
        {
          id: 'n6', order: 6, title: '馈线补差上升', short: 'P_grid {P_grid_pre} → {P_grid_60} kW',
          layer: 'observation', componentId: 'grid', signalIds: ['P_grid_true_kW'],
          detail: '因为负载恒定 {P_load_60} kW 且风电机组少发了功率，所以理想馈线的补差功率由 {P_grid_pre} kW 升到 {P_grid_60} kW（受电为正，瞬时补差）。',
          evidence: [{ varId: 'P_grid_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s {P_grid_pre} kW → 60.0 s {P_grid_60} kW' }]
        },
        {
          id: 'n7', order: 7, title: '偏离最优曲线的故障特征', short: 'd_wt 持续 {d_wt_60} kW；r_true/r_meas ≡ 0',
          layer: 'observation', componentId: 'bus', signalIds: ['d_wt_kW', 'r_true_kW', 'r_meas_kW'],
          kind: 'algebraic_identity',
          epistemic: '代数恒等',
          detail: 'd_wt = P_wt,true − k_v·v_est³（代数恒等，不是能量损失）：卡涩使运行点持续偏离最优曲线，d_wt 稳态 {d_wt_60} kW 不归零——与 sensor_drift 闭环归零（被吸收进自洽）形成对照。r_true ≡ {r_true_max}、r_meas ≡ {r_meas_max}（全功率测量通道健康）。',
          evidence: [{ varId: 'd_wt_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障后 d_wt 持续为 {d_wt_60} kW（不归零）' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '位置强制' },
        { from: 'n2', to: 'n3', label: '桨距角钉扎' },
        { from: 'n3', to: 'n4', label: '气动功率坍缩' },
        { from: 'n4', to: 'n5', label: 'MPPT 曲线跟随' },
        { from: 'n5', to: 'n6', label: '馈线补差变化' },
        { from: 'n3', to: 'n7', label: '偏离最优曲线', dashed: true }
      ],
      assumptions: ['A-wt-pitch-pro', 'A-wt-cp-empirical', 'A-wt-single-mass', 'A-wt-mppt-omega', 'A-wt-ideal-feeder', 'A-wt-l0b'],
      limitations: ['卡涩为位置强制钉扎（非指令限幅）：执行器激活窗内 β ≡ β_stuck。', 'τ_β = 0.5 s 为行为级等效时间常数，非实测参数。', 'L0b 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若为指令限幅式卡涩', text: '亚额定工况桨距指令为零，限幅式卡涩将是 no-op（故障零效果）——本族因此采用位置强制语义（WT-DRAFT-Q2 定案）。' }]
    },
    gust_step: {
      id: 'wt-gust-step',
      headline: 't={t0} s，{faultLabel}：有效真实风速阶跃 +{mag} {unit}',
      mechanismSummary: '阵风是物理输入阶跃，与控制模式无关（两模式同解）：有效风速 v0 → v0+{mag} → MPPT 支路爬升或额定封顶 → 转速锚定 ω_N 邻域（跨额定区）→ 桨距吸收 → 馈线补差下降。d_wt 稳态 {d_wt_60} kW 为封顶工况合法残差——设计性偏离最优与故障性偏离的判读教学点。',
      nodes: [
        {
          id: 'n1', order: 1, title: '阵风注入', short: 'v_true {v_true_pre} → {v_true_post} m/s',
          layer: 'config', componentId: 'rotor', signalIds: ['v_true_ms'],
          detail: '因为 {t0} s 有效真实风速从 {v_true_pre} m/s 阶跃上升 {mag} {unit} 到 {v_true_post} m/s（物理输入，与控制模式无关），所以风轮的气动输入发生阶跃。这是配置定义的物理输入事实。',
          evidence: [{ varId: 'v_true_ms', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {v_true_pre} m/s → 20.0 s {v_true_post} m/s' }]
        },
        {
          id: 'n2', order: 2, title: '两模式同解', short: '物理输入：闭环与仅监测同解',
          layer: 'mechanism', componentId: 'rotor', signalIds: ['P_aero_kW'],
          detail: '因为阵风作用于物理输入而非测量通道，所以两种运行模式下物理过程完全相同（复算实证全序列最大差 0）；气动功率随 v³ 抬升。',
          evidence: [{ varId: 'P_aero_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '气动功率随有效风速同步阶跃' }]
        },
        {
          id: 'n3', order: 3, title: 'MPPT 爬升与额定封顶', short: 'P_ref → {P_ref_post} kW（封顶支路）',
          layer: 'mechanism', componentId: 'converter', signalIds: ['P_wt_ref_kW'],
          detail: '因为 P_ref = min(k_opt·ω³, P_rated, k_v·v_ctrl³)（EQ-WT-4），所以亚额定段（gust +1.0）按 MPPT 支路爬向新最优点、跨额定段（默认 +2.0，v=11）由 P_rated = 15 kW 支路封顶。',
          evidence: [{ varId: 'P_wt_ref_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '目标功率爬升后封顶（跨额定段）' }]
        },
        {
          id: 'n4', order: 4, title: '转速锚定', short: 'n {n_rotor_pre} → {n_rotor_60} rpm',
          layer: 'observation', componentId: 'rotor', signalIds: ['n_rotor_rpm'],
          detail: '因为额定区桨距调节把转速锚定在 ω_N 邻域（「桨距调转速」惯例的教学化），所以转速由 {n_rotor_pre} rpm 收敛到 {n_rotor_60} rpm。',
          evidence: [{ varId: 'n_rotor_rpm', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s {n_rotor_pre} rpm → 60.0 s {n_rotor_60} rpm（ω_N 邻域）' }]
        },
        {
          id: 'n5', order: 5, title: '桨距吸收', short: 'β 0 → {beta_60}°',
          layer: 'observation', componentId: 'pitch_act', signalIds: ['beta_pitch_deg'],
          detail: '因为额定以上功率过剩须由桨距吸收（β_ref = K_β·(ω − ω_N)），所以桨距角由 0° 一阶升至 {beta_60}°（β_max = 30° 内，钳位不活跃）。',
          evidence: [{ varId: 'beta_pitch_deg', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障后桨距角一阶上升至 {beta_60}°' }]
        },
        {
          id: 'n6', order: 6, title: '馈线补差下降', short: 'P_grid {P_grid_pre} → {P_grid_60} kW',
          layer: 'observation', componentId: 'grid', signalIds: ['P_grid_true_kW'],
          detail: '因为负载恒定 {P_load_60} kW 且风电机组多发了功率，所以理想馈线的补差功率由 {P_grid_pre} kW 降到 {P_grid_60} kW（受电为正，瞬时补差）。',
          evidence: [{ varId: 'P_grid_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s {P_grid_pre} kW → 60.0 s {P_grid_60} kW' }]
        },
        {
          id: 'n7', order: 7, title: '封顶工况合法残差', short: 'd_wt 稳态 {d_wt_60} kW；r_true ≡ {r_true_max}',
          layer: 'observation', componentId: 'bus', signalIds: ['d_wt_kW', 'r_true_kW', 'r_meas_kW'],
          kind: 'algebraic_identity',
          epistemic: '代数恒等',
          detail: 'd_wt = P_wt,true − k_v·v_est³（代数恒等，不是能量损失）：封顶工况稳态 {d_wt_60} kW 为设计性偏离最优的合法残差（非故障）——残差判读三分法：d_wt = 0（最优）/ 负（偏离最优：故障或封顶）/ 正（测量伪影）。r_true ≡ {r_true_max}、r_meas ≡ {r_meas_max}。',
          evidence: [{ varId: 'd_wt_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '故障后 d_wt 瞬态 {d_wt_peak} kW 后稳定在 {d_wt_60} kW（封顶合法残差）' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '物理输入阶跃' },
        { from: 'n2', to: 'n3', label: '目标支路切换' },
        { from: 'n3', to: 'n4', label: '转速锚定' },
        { from: 'n4', to: 'n5', label: '桨距吸收' },
        { from: 'n5', to: 'n6', label: '馈线补差变化' },
        { from: 'n3', to: 'n7', label: '封顶工况残差', dashed: true }
      ],
      assumptions: ['A-wt-mppt-omega', 'A-wt-guard', 'A-wt-pitch-pro', 'A-wt-ideal-converter', 'A-wt-single-mass', 'A-wt-const-load', 'A-wt-l0b'],
      limitations: ['阵风为有效真实风速阶跃（无湍流场与连续气象动态）。', '注册域内 cut-in/cut-out 与超速保护不触发、未建模。', 'L0b 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若阵风仅进入测量通道', text: '那将成为 v_sensor_bias 类故障：低估压低真实出力、高估零真实效应（保护钳位通道单向性）——与本物理输入阶跃（两模式同解）形成教学对照。' }]
    }
  };

  /* MG-001 因果模板四件（MG001_G2B_SPEC_APPROVED v1.0 §6.4；MG-G2b-04 systems.js 面）。
     四族全为物理/拓扑输入（两模式逐位同解，MS-5）——monitorNodes 不单设（buildCardFromTemplate
     无 monitorNodes 时回落 nodes，两模式同卡 = 「monitorNodes：与闭环同解」的模板面承载）。
     mg-island-event 含重连段 n8…n10（t_clear 时刻证据以 tStartOffset=+15 表达 golden 锚定
     t_clear=35；general t_clear 由 facts.tc 文案承载）。 */
  MG001.causalTemplates = {
    load_step: {
      id: 'mg-load-step',
      headline: 't={t0} s，{faultLabel}：聚合负荷 {P_load_pre} → {P_load_post} kW',
      mechanismSummary: '聚合负荷阶跃 → 并网面由理想馈线瞬时补差吸收（EQ-MG-3）：P_grid 随阶跃瞬时上抬，储能保持计划跟踪、SOC 账本不受影响，全服务维持。MG 层负荷是聚合输入，与 FL-001 已删除的 load_step（O-13）无语义继承——恒等式按构造成立，无「滞后源追逐失衡」结构。',
      nodes: [
        {
          id: 'n1', order: 1, title: '聚合负荷阶跃注入', short: 'P_load {P_load_pre} → {P_load_post} kW',
          layer: 'config', componentId: 'load', signalIds: ['P_load_demand_kW'],
          detail: '因为 {t0} s 聚合负荷从 {P_load_pre} kW 阶跃到 {P_load_post} kW，所以母线功率需求发生阶跃变化。这是配置定义的聚合输入事实（瞬时阶跃，无爬坡——A-mg-load-step-instant）。',
          evidence: [{ varId: 'P_load_demand_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '19.9 s {P_load_pre} kW → 20.0 s {P_load_post} kW' }]
        },
        {
          id: 'n2', order: 2, title: '馈线瞬时补差', short: 'P_grid {P_grid_pre} → {P_grid_post} kW',
          layer: 'observation', componentId: 'feeder', signalIds: ['P_grid_true_kW'],
          detail: '因为并网面由理想馈线瞬时补差（EQ-MG-3：P_grid = P_load − P_pv − P_wt − P_bess，受电为正），所以馈线功率由 {P_grid_pre} kW 瞬时升至 {P_grid_post} kW；下行角点可倒送为负（理想双向合法工作区）。',
          evidence: [{ varId: 'P_grid_true_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '20.0 s {P_grid_pre} kW → {P_grid_post} kW（瞬时补差）' }]
        },
        {
          id: 'n3', order: 3, title: '储能保持计划跟踪', short: 'P_bess ≡ {P_sched} kW（计划面不受影响）',
          layer: 'observation', componentId: 'bess', signalIds: ['P_bess_kW', 'P_sched_kW', 'SOC_true_pct'],
          detail: '因为并网面 BESS 按调度计划恒功率跟踪（EQ-MG-5），所以储能出力保持 {P_sched} kW、SOC 账本沿计划斜率继续（负荷阶跃不影响计划面——SOC 仅账本通道，A-mg-const-sched）。',
          evidence: [{ varId: 'P_bess_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: 'P_bess 恒 {P_sched} kW（计划跟踪不受聚合输入阶跃影响）' }]
        },
        {
          id: 'n4', order: 4, title: '全服务维持', short: 'P_served {P_served_60} kW（并网面无卸载）',
          layer: 'observation', componentId: 'load', signalIds: ['P_load_served_kW'],
          detail: '因为并网面 P_shed = P_dump = 0（EQ-MG-3），所以负荷实际获得功率始终等于需求 {P_served_60} kW。',
          evidence: [{ varId: 'P_load_served_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '并网面 P_served ≡ P_load（全服务）' }]
        },
        {
          id: 'n5', order: 5, title: '恒等式维持', short: 'r_true ≡ {r_true_max} kW（定义恒等）',
          layer: 'observation', componentId: 'bus', signalIds: ['r_true_kW', 'r_meas_kW'],
          kind: 'algebraic_identity',
          epistemic: '代数恒等',
          detail: '因为母线恒等式 r_true ≡ P_pv + P_wt + P_bess + P_grid − P_served − P_dump 为定义恒等（EQ-MG-6），所以 r_true = {r_true_max} kW、r_meas = {r_meas_max} kW（全功率测量通道健康）——平衡重整由馈线承担，与 FL-001 O-13 删除族的失衡对照为负例教学面。',
          evidence: [{ varId: 'r_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: 'r_true 恒为 0（定义恒等式回归）' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '需求阶跃' },
        { from: 'n2', to: 'n3', label: '计划面不受影响' },
        { from: 'n2', to: 'n4', label: '补差即服务' },
        { from: 'n4', to: 'n5', label: '恒等式闭合', dashed: true }
      ],
      assumptions: ['A-mg-ideal-bus', 'A-mg-load-step-instant', 'A-mg-const-sched', 'A-mg-l0'],
      limitations: ['并网面馈线为理想瞬时平衡源（无爬坡/额定约束）。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若同一阶跃发生在孤岛窗内', text: '单故障/Run 模型下不可组合（island_event 为独立族）——「间歇性叠加改变卸载量」以场景级有序 Run 对比承载（规格 §2.4 教学面限制）。' }]
    },
    shading_link: {
      id: 'mg-pv-shading-link',
      headline: 't={t0} s，{faultLabel}：PV 子轨出力 {P_pv_pre} → {P_pv_60} kW',
      mechanismSummary: '遮挡联动注入 PV 子轨 → 子轨出力 τ=1.0 s 一阶跟随下行 → 母线余额上缺口由馈线瞬时补差（EQ-MG-3）。源轨物理与 PV-001 完全一致（EQ-MG-2 复用声明），聚合层只转发结果不改写物理。',
      nodes: [
        {
          id: 'n1', order: 1, title: '遮挡联动注入', short: 'PV 子轨遮挡降幅 {mag} W/m² @ {t0} s',
          layer: 'config', componentId: 'pv_unit', signalIds: ['P_pv_kW'],
          detail: '因为 {t0} s 遮挡阶跃联动注入 PV 子轨（降幅 {mag} W/m²，源域 [50,300] 原样透传），所以子轨 MPPT 重算目标功率。这是配置定义的物理输入事实（两模式同生效）。',
          evidence: [{ varId: 'P_pv_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '联动注入时刻子轨出力开始下行' }]
        },
        {
          id: 'n2', order: 2, title: 'PV 子轨出力下行', short: 'P_pv {P_pv_pre} → {P_pv_60} kW（τ=1.0 s 跟随）',
          layer: 'observation', componentId: 'pv_unit', signalIds: ['P_pv_kW'],
          detail: '因为 PV-001 子轨按 τ_mppt = 1.0 s 一阶跟随新目标（EQ-PV-4 闭式复用，健康局 10 kW → 7 kW），所以聚合面光伏馈入由 {P_pv_pre} kW 降到 {P_pv_60} kW。',
          evidence: [{ varId: 'P_pv_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 10.00 kW → 60.0 s {P_pv_60} kW（一阶跟随）' }]
        },
        {
          id: 'n3', order: 3, title: '馈线补差上升', short: 'P_grid → {P_grid_60} kW',
          layer: 'observation', componentId: 'feeder', signalIds: ['P_grid_true_kW'],
          detail: '因为母线余额 = ΣP_source − P_load 的光伏项下降（EQ-MG-3），所以理想馈线补差升至 {P_grid_60} kW（受电为正）。',
          evidence: [{ varId: 'P_grid_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '馈线补差 5→{P_grid_60} kW' }]
        },
        {
          id: 'n4', order: 4, title: '间歇性下行叠加', short: '聚合余额 = ΣP_source − load 的间歇项变动',
          layer: 'mechanism', componentId: 'bus', signalIds: ['P_bess_kW', 'P_sched_kW'],
          detail: '因为 MG 聚合层的间歇性来自源轨物理事件（遮挡/阵风），所以聚合余额的间歇项变动 = 子轨出力变动，储能计划面不受影响（计划跟踪，A-mg-const-sched）——多源聚合 vs 单源系统的教学对照面。',
          evidence: [{ varId: 'P_bess_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: 'P_bess 恒 {P_sched} kW（计划跟踪）' }]
        },
        {
          id: 'n5', order: 5, title: '恒等式维持', short: 'r_true ≡ {r_true_max} kW',
          layer: 'observation', componentId: 'bus', signalIds: ['r_true_kW', 'r_meas_kW'],
          kind: 'algebraic_identity',
          epistemic: '代数恒等',
          detail: 'r_true = {r_true_max} kW、r_meas = {r_meas_max} kW（EQ-MG-6 定义恒等）——并网面平衡重整由馈线承担，恒等式按构造成立。',
          evidence: [{ varId: 'r_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: 'r_true 恒为 0（定义恒等式回归）' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '子轨一阶跟随' },
        { from: 'n2', to: 'n3', label: '母线缺口' },
        { from: 'n3', to: 'n4', label: '间歇项变动' },
        { from: 'n4', to: 'n5', label: '恒等式闭合', dashed: true }
      ],
      assumptions: ['A-mg-ideal-bus', 'A-mg-reuse-tracks', 'A-mg-const-sched', 'A-mg-l0'],
      limitations: ['子轨物理与 PV-001 完全一致（源轨 limitations 原样适用——MG 不新增不减轻）。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若与 wt_gust_link 同时注入', text: '单故障/Run 模型下不可组合——间歇性叠加以场景级有序 Run 对比承载（规格 §2.4 教学面限制）。' }]
    },
    gust_link: {
      id: 'mg-wt-gust-link',
      headline: 't={t0} s，{faultLabel}：WT 子轨出力 {P_wt_pre} → {P_wt_60} kW',
      mechanismSummary: '阵风联动注入 WT 子轨 → 子轨 L0b 动态爬升至额定封顶 15 kW（v0=9+Δv=11 跨额定区）→ 馈线补差降至零导入角点（PV 10 + WT 15 + BESS 5 = load 30 恰平，|P_grid| ≤ 1e-9 合法角点非缺陷）。',
      nodes: [
        {
          id: 'n1', order: 1, title: '阵风联动注入', short: 'WT 子轨阵风 +{mag} m/s @ {t0} s',
          layer: 'config', componentId: 'wt_unit', signalIds: ['P_wt_kW'],
          detail: '因为 {t0} s 阵风阶跃联动注入 WT 子轨（+{mag} m/s，源域 [1.0,3.0] 原样透传，v 9→11 跨额定区），所以子轨变流器目标功率切换支路。这是配置定义的物理输入事实（两模式同生效）。',
          evidence: [{ varId: 'P_wt_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '联动注入时刻子轨出力开始爬升' }]
        },
        {
          id: 'n2', order: 2, title: 'WT 子轨爬升封顶', short: 'P_wt {P_wt_pre} → {P_wt_60} kW（额定封顶）',
          layer: 'observation', componentId: 'wt_unit', signalIds: ['P_wt_kW'],
          detail: '因为 WT-001 子轨 L0b 动态爬升（EQ-WT-4/6 复用：P_ref 三支路封顶 15 kW、桨距吸收），所以聚合面风电馈入由 {P_wt_pre} kW 爬升至 {P_wt_60} kW。',
          evidence: [{ varId: 'P_wt_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '20.0 s 10.00 kW → 60.0 s {P_wt_60} kW（L0b 动态封顶）' }]
        },
        {
          id: 'n3', order: 3, title: '零导入角点', short: 'P_grid → {P_grid_60} kW（恰平）',
          layer: 'observation', componentId: 'feeder', signalIds: ['P_grid_true_kW'],
          detail: '因为 PV 10 + WT 15 + BESS 5 = load 30 恰平（EQ-MG-3），所以馈线补差降至 {P_grid_60} kW——|P_grid| ≤ 1e-9 kW 为零导入合法角点（间歇性恰好覆盖负荷的判读练习，非缺陷）。',
          evidence: [{ varId: 'P_grid_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '馈线补差 5→{P_grid_60} kW（零导入角点）' }]
        },
        {
          id: 'n4', order: 4, title: '间歇性上行叠加恰平', short: '聚合余额间歇项 +5 kW 恰被吸收',
          layer: 'mechanism', componentId: 'bus', signalIds: ['P_bess_kW', 'P_sched_kW'],
          detail: '因为间歇性上行叠加（WT +5 kW）恰好等于并网面原馈线补差（5 kW），所以母线余额归零而储能计划面不变（计划跟踪，A-mg-const-sched）——多源间歇性叠加的教学点。',
          evidence: [{ varId: 'P_bess_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: 'P_bess 恒 {P_sched} kW（计划跟踪）' }]
        },
        {
          id: 'n5', order: 5, title: '倒送预判', short: 'load 下行角点 P_grid < 0（理想双向）',
          layer: 'mechanism', componentId: 'bus', signalIds: ['P_load_demand_kW', 'P_grid_true_kW'],
          detail: '若同一时刻聚合负荷下行（load_step min −10 与 load_kW min 10 组合域内 load_eff ≥ 0，Q6 域设计），ΣP_source > load 时 P_grid < 0 为倒送域合法工作区（理想双向馈线，不建模倒送约束——PV/WT 同款声明）。',
          evidence: [{ varId: 'P_grid_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: '倒送域为合法工作区（非缺陷）' }]
        },
        {
          id: 'n6', order: 6, title: '恒等式维持', short: 'r_true ≡ {r_true_max} kW',
          layer: 'observation', componentId: 'bus', signalIds: ['r_true_kW', 'r_meas_kW'],
          kind: 'algebraic_identity',
          epistemic: '代数恒等',
          detail: 'r_true = {r_true_max} kW、r_meas = {r_meas_max} kW（EQ-MG-6 定义恒等）——零导入角点上恒等式按构造成立。',
          evidence: [{ varId: 'r_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: 'r_true 恒为 0（定义恒等式回归）' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '子轨 L0b 动态' },
        { from: 'n2', to: 'n3', label: '补差归零' },
        { from: 'n3', to: 'n4', label: '间歇项恰平' },
        { from: 'n4', to: 'n5', label: '倒送预判', dashed: true },
        { from: 'n5', to: 'n6', label: '恒等式闭合', dashed: true }
      ],
      assumptions: ['A-mg-ideal-bus', 'A-mg-reuse-tracks', 'A-mg-const-sched', 'A-mg-l0'],
      limitations: ['子轨物理与 WT-001 完全一致（源轨 limitations 原样适用——MG 不新增不减轻）。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若阵风幅值限于亚额定段', text: 'gust +1.0（v=10 < v_rated）时 MPPT 支路爬向新最优点、无封顶——零导入角点不可达，馈线补差为正（源域教学对照）。' }]
    },
    island_event: {
      id: 'mg-island-event',
      headline: 't={t0} s，{faultLabel}：脱离主馈线的功率平衡重整（重连 @ {tc} s）',
      mechanismSummary: '分断主馈线 → 馈线功率恒为 0 → EMS 角色切换：计划挂起、平衡填补 chase = load − P_pv − P_wt → 钳位 ±8 kW → 缺口卸载 P_shed、盈余倾卸 P_dump → 重连恢复馈线补差与计划跟踪。恒等式跨相位同式（EQ-MG-6）——「脱离主馈线的功率平衡重整演示」，不代表真实电网侧动态。',
      nodes: [
        {
          id: 'n1', order: 1, title: '分断注入', short: '主馈线分断 @ {t0} s（零参数族）',
          layer: 'config', componentId: 'switch', signalIds: ['island_state'],
          detail: '因为 {t0} s 主馈线分断开关动作（island_event 零参数族——脱离/重连语义由 t_start_s/t_clear_s 承载，无幅值语义），所以母线脱离馈线。这是配置定义的拓扑事件事实。',
          evidence: [{ varId: 'island_state', tStartOffset: -0.1, tEndOffset: 0.1, note: 'island_state 0→1（脱离）' }]
        },
        {
          id: 'n2', order: 2, title: '馈线功率归零', short: 'P_grid {P_grid_pre} → {P_grid_post} kW（孤岛 ≡ 0）',
          layer: 'observation', componentId: 'switch', signalIds: ['P_grid_true_kW', 'island_state'],
          detail: '因为分断即馈线功率恒为 0（EQ-MG-4：理想通断抽象——A-mg-island-abstract），所以 P_grid 由 {P_grid_pre} kW 归零并持续到重连。',
          evidence: [{ varId: 'P_grid_true_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '20.0 s {P_grid_pre} kW → {P_grid_post} kW（孤岛窗恒 0）' }]
        },
        {
          id: 'n3', order: 3, title: 'EMS 角色切换', short: '计划挂起 → 平衡填补 chase = {chase_post} kW',
          layer: 'mechanism', componentId: 'ems', signalIds: ['P_bess_chase_kW', 'P_sched_kW'],
          detail: '因为孤岛窗内计划挂起、EMS 切换为平衡填补（EQ-MG-5，填补目标按真实功率值计算——A-mg-ems-true），所以 chase = P_load − P_pv − P_wt = {chase_post} kW（钳位前显式暴露；P_sched 仍显示配置值 {P_sched} kW）。',
          evidence: [{ varId: 'P_bess_chase_kW', tStartOffset: 0.0, tEndOffset: 14.9, note: '岛窗内 chase = {chase_post} kW（填补目标，钳位前）' }]
        },
        {
          id: 'n4', order: 4, title: '功率域钳位', short: 'P_bess {P_bess_pre} → {P_bess_post} kW（clamp ±8）',
          layer: 'mechanism', componentId: 'bess', signalIds: ['P_bess_kW'],
          detail: '因为 BESS 功率域 [−8, +8] kW 为模型结构设定（A-mg-bess-structural-limit，理想硬钳位），所以 chase = {chase_post} kW 超上限被钳位：P_bess 由计划值 {P_bess_pre} kW 切换为 {P_bess_post} kW。',
          evidence: [{ varId: 'P_bess_kW', tStartOffset: -0.1, tEndOffset: 0.1, note: '{P_bess_pre} kW（计划）→ {P_bess_post} kW（钳位填补）' }]
        },
        {
          id: 'n5', order: 5, title: '缺口卸载', short: 'P_shed = {P_shed_post} kW 持续（P_served {P_load_post} → {P_served_post} kW）',
          layer: 'observation', componentId: 'load', signalIds: ['P_shed_kW', 'P_load_served_kW'],
          detail: '因为 chase {chase_post} kW > 钳位上限 8 kW，缺口部分由负荷卸载重整吸收（P_shed = chase − P_bess = {P_shed_post} kW 持续），所以负荷实际获得功率降为 {P_served_post} kW（P_served = P_load − P_shed）。',
          evidence: [{ varId: 'P_shed_kW', tStartOffset: 0.0, tEndOffset: 14.9, note: '岛窗内 P_shed 恒 {P_shed_post} kW（缺口卸载）' }]
        },
        {
          id: 'n6', order: 6, title: 'SOC 账本加速', short: '放电加速：SOC → {SOC_60} %（分段解析账本）',
          layer: 'observation', componentId: 'bess', signalIds: ['SOC_true_pct', 'SOC_est_pct'],
          detail: '因为 SOC 为账本通道（EQ-MG-7 分段解析积分，SOC 仅账本永不绑定功率面——A-mg-const-sched），所以岛窗 8 kW 段放电斜率大于计划段：SOC 末值 {SOC_60} %（SOC_est 与 SOC_true 同值，SOC_err ≡ 0）。',
          evidence: [{ varId: 'SOC_true_pct', tStartOffset: 0.0, tEndOffset: 40.0, note: '三段解析账本：5×20 + 8×15 + 5×25 kW·s' }]
        },
        {
          id: 'n7', order: 7, title: '重整后恒等式维持', short: 'ΣP_source = P_served + P_dump（r ≡ 0）',
          layer: 'observation', componentId: 'bus', signalIds: ['r_true_kW', 'r_meas_kW', 'P_dump_kW'],
          kind: 'algebraic_identity',
          epistemic: '代数恒等',
          detail: '孤岛面恒等式 ΣP_source = P_served + P_dump = load − P_shed + P_dump（EQ-MG-6）：r_true = {r_true_max} kW 全程维持——重整前后恒等式同式，P_dump 为理想倾卸记账项（不是能量损失）。',
          evidence: [{ varId: 'r_true_kW', tStartOffset: 0.0, tEndOffset: 40.0, note: 'r_true 恒为 0（重整前后同式）' }]
        },
        {
          id: 'n8', order: 8, title: '重连恢复', short: '重连 @ {tc} s（t_clear_s 承载）',
          layer: 'config', componentId: 'switch', signalIds: ['island_state'],
          detail: '因为重连时刻由 t_clear_s 承载（{tc} s，GT-001 actuator_fault t_clear 先例同构），所以母线恢复馈线补差、island_state 1→0。',
          evidence: [{ varId: 'island_state', tStartOffset: 14.9, tEndOffset: 15.1, note: '{tc} s 重连：island_state 1→0' }]
        },
        {
          id: 'n9', order: 9, title: '馈线与计划恢复', short: 'P_grid → {P_grid_tc} kW、P_bess → {P_bess_tc} kW、P_shed → {P_shed_tc} kW',
          layer: 'observation', componentId: 'feeder', signalIds: ['P_grid_true_kW', 'P_bess_kW', 'P_shed_kW', 'P_load_served_kW'],
          detail: '因为重连即恢复补差与计划跟踪（EQ-MG-3/5），所以馈线功率恢复 {P_grid_tc} kW、储能回计划 {P_bess_tc} kW、卸载归零（P_served 恢复 {P_served_tc} kW）。',
          evidence: [{ varId: 'P_bess_kW', tStartOffset: 14.9, tEndOffset: 15.1, note: '{tc} s：钳位 8 kW → 计划 {P_bess_tc} kW' }]
        },
        {
          id: 'n10', order: 10, title: '恒等式跨相位同式', short: 'r ≡ 0（脱离/重整/重连三相位同式）',
          layer: 'observation', componentId: 'bus', signalIds: ['r_true_kW'],
          kind: 'algebraic_identity',
          epistemic: '代数恒等',
          detail: '脱离（并网式）→ 重整（孤岛式）→ 重连（并网式）三相位的恒等式同族（EQ-MG-6），r_true 全程为 0——功率平衡重整演示的教学闭环。',
          evidence: [{ varId: 'r_true_kW', tStartOffset: 14.9, tEndOffset: 40.0, note: '重连后 r_true 恒为 0（跨相位同式）' }]
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: '分断' },
        { from: 'n2', to: 'n3', label: '角色切换' },
        { from: 'n3', to: 'n4', label: '钳位' },
        { from: 'n4', to: 'n5', label: '缺口卸载' },
        { from: 'n4', to: 'n6', label: '放电加速' },
        { from: 'n5', to: 'n7', label: '恒等式重整', dashed: true },
        { from: 'n7', to: 'n8', label: '重连' },
        { from: 'n8', to: 'n9', label: '恢复' },
        { from: 'n9', to: 'n10', label: '恒等式闭合', dashed: true }
      ],
      assumptions: ['A-mg-ideal-bus', 'A-mg-island-ideal-balance', 'A-mg-bess-structural-limit', 'A-mg-island-abstract', 'A-mg-ems-true', 'A-mg-l0'],
      limitations: ['本演示为脱离主馈线的功率平衡重整演示，不代表真实电网侧动态（无检同期、无保护逻辑、无过渡过程）。', '单故障/Run 模型下 island_event 不可与负荷阶跃/子轨联动族同时注入——场景级有序 Run 对比承载叠加教学面。', 'L0 演示模型：结论只在上述假设下成立。'],
      alternatives: [{ title: '若 t_clear_s 缺省（窗末持续脱离）', text: '脱离持续到 60 s 窗末：无重连事件，SOC 账本沿 8 kW 段斜率到窗末——重连恢复面以显式 t_clear_s 承载（GT-001 t_clear 先例同构）。' }]
    }
  };

  var ALL = [FL001, FC001, GT001, PV001, WT001, MG001];
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
    /* FLTH-G2b-04（FLTH §2.0）：声明了 thermal_model 的系统（FL-001，默认 off）同构盖章；
       未声明的系统不产生该字段。engine validate 侧枚举守卫同构（engine.js thermal_model 分支）。 */
    if (s.defaults.thermal_model) cfg.thermal_model = s.defaults.thermal_model;
    /* FC-001 电化学轨（FCECH-G2b-04 / B-7 双盖章落点之二——FC001_ELECTROCHEM_G2B_SPEC_APPROVED
       v1.0 §1.1/§8，CHG-20261113-01 批准链）：声明了 electrochem_model 的系统（FC-001，默认
       off）同构盖章；未声明的系统不产生该字段。engine validate 侧枚举守卫同构
       （engine.js electrochem_model 分支）；cfg 值不进 scenarioView 投影/哈希（B-3(a)）。 */
    if (s.defaults.electrochem_model) cfg.electrochem_model = s.defaults.electrochem_model;
    /* FL-001 容量/内阻二阶效应轨（FLCAP-G2b-04 / B-7 双盖章落点之二——FL001_CAPACITY_G2B_
       SPEC_APPROVED v1.0 §1.1/§8，CHG-20261114-01 批准链；electrochem_model 盖章行同构）：
       声明了 capacity_model 的系统（FL-001，默认 off）同构盖章；未声明的系统不产生该字段。
       engine validate 侧枚举 + 组合守卫同构（engine.js capacity_model 分支——(off,on) 结构化
       拒绝）；cfg 值不进 scenarioView 投影/哈希（B-3(a)）。 */
    if (s.defaults.capacity_model) cfg.capacity_model = s.defaults.capacity_model;
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
