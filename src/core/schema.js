/* owner: core-contract | module: schema | contract: NEXT/DATA_CONTRACT_SPEC.md */
/* FL.contract — 数据契约 v1 校验器 + 真值投影（G0-DEC-05/06/07/09/10/11 落地）。
   纯函数、零 DOM、浏览器/Node 共用；错误码 CN-E01…CN-E15（契约 §7.2）。
   依赖：hash.js（FL.core.sha256 / canonicalizeStrict）。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};

  var SCHEMA_VERSION = '1.0.0';
  var BUNDLE_SCHEMA_VERSION = 'v1';
  var EVENT_ENCODING_VERSION = 1;

  /* ------------------------------------------------------------------ *
   * 单位字典（契约 §1.2）：unit → 量纲类；A↔kW 等跨量纲运算在校验层拒绝
   * ------------------------------------------------------------------ */
  var UNIT_DICT = {
    'A': 'current', 'kW': 'power', 'kWh': 'energy', 'V': 'voltage',
    's': 'time', '%': 'percent', 'pp': 'percent_point',
    'Hz': 'frequency', 'rpm': 'speed',
    'W/m²': 'irradiance', /* PV-001 新轨（PV001_G2B_SPEC_APPROVED v1.0 §8 C-3/C-6）：纯增项 */
    'K': 'temperature', 'kPa': 'pressure', /* GT-001 L1 thermo 轨（GTL1-IMP-Q2，CHG-20261104-12）：纯增项 */
    /* WT-001 L0b 轨（WT001_G2B_SPEC_APPROVED v1.0 §1.2/§4 项 5/§8 WT-G2b-03，CHG-20261107-01）：
       纯增项——'m/s'（风速 3 信号）/'°'（桨距角 3 信号）/'-'（λ/Cp 无量纲 2 信号，§1.2 信号表）；
       量纲类名沿 golden units 表命名（§4 项 5 "wind":"m/s","angle":"°"）。 */
    'm/s': 'wind', '°': 'angle', '-': 'dimensionless'
  };
  var P0_UNITS = ['A', 'kW', 'kWh', 'V', 's', '%', 'pp'];

  /* ------------------------------------------------------------------ *
   * exposure（契约 §1.6 / G0-DEC-11）
   * ------------------------------------------------------------------ */
  var EXPOSURES = ['blind_observable', 'public_demo', 'truth_only'];
  var DEFAULT_EXPOSURE = {
    'CONFIG': 'public_demo',
    'MODEL_STATE': 'public_demo',
    'OBSERVATION': 'blind_observable',
    'CONTROLLER': 'public_demo',
    'FAULT_EVENT': 'public_demo',
    'DERIVED': 'public_demo',
    'MODEL_ASSUMPTION': 'public_demo'
  };
  var SOURCE_KINDS = ['CONFIG', 'MODEL_STATE', 'OBSERVATION', 'CONTROLLER', 'FAULT_EVENT', 'DERIVED', 'MODEL_ASSUMPTION'];
  var METRIC_METHODS = ['analytic_flux', 'trapezoid', 'substep', 'algebraic', 'analytic'];
  var CHECK_OWNERS = ['numeric', 'e2e', 'registry', 'schema'];
  var CHECK_STATUSES = ['pass', 'fail', 'skipped', 'warn'];

  /* ------------------------------------------------------------------ *
   * 错误对象：{code, field, message, next}（契约 §7.1/§7.2）
   * ------------------------------------------------------------------ */
  function contractError(code, field, message, next) {
    var err = new Error('[' + code + '] ' + message);
    err.name = 'ContractError';
    err.code = code;
    err.field = field || '';
    err.next = next || '';
    return err;
  }

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* ------------------------------------------------------------------ *
   * SignalCatalog（契约 §2.3/§9）
   * ------------------------------------------------------------------ */
  function validateSignalCatalog(signals, opts) {
    opts = opts || {};
    var problems = [];
    var seen = {};
    if (!Array.isArray(signals) || !signals.length) {
      return [contractError('CN-E01', 'signals', '信号目录为空', '检查模型信号定义')];
    }
    signals.forEach(function (s) {
      if (!s || typeof s.id !== 'string' || !s.id) {
        problems.push(contractError('CN-E01', 'signals.id', '信号缺少 id', '检查 SignalCatalog'));
        return;
      }
      if (seen[s.id]) {
        problems.push(contractError('CN-E02', 'signals.' + s.id, '重复信号 id：' + s.id, '信号 id 必须唯一'));
      }
      seen[s.id] = true;
      if (opts.p0 && !/^[A-Za-z][A-Za-z0-9_]*$/.test(s.id)) {
        problems.push(contractError('CN-E02', 'signals.' + s.id, 'signal_id 必须为大写下划线风格的稳定标识', '检查 SignalCatalog'));
      }
      if (!UNIT_DICT[s.unit]) {
        problems.push(contractError('CN-E02', 'signals.' + s.id + '.unit', '单位不在字典：' + String(s.unit), '允许值：' + P0_UNITS.join('/')));
      }
      if (SOURCE_KINDS.indexOf(s.sourceKind) === -1) {
        problems.push(contractError('CN-E02', 'signals.' + s.id + '.sourceKind', '未知 source_kind：' + String(s.sourceKind), '允许值：' + SOURCE_KINDS.join('/')));
      }
      if (EXPOSURES.indexOf(s.exposure) === -1) {
        problems.push(contractError('CN-E02', 'signals.' + s.id + '.exposure', '未知 exposure：' + String(s.exposure), '允许值：' + EXPOSURES.join('/')));
      }
      /* blindVisible 是派生兼容字段，禁止独立设置（契约 §2.3） */
      var derived = s.exposure === 'blind_observable';
      if (s.blindVisible !== undefined && s.blindVisible !== derived) {
        problems.push(contractError('CN-E02', 'signals.' + s.id + '.blindVisible',
          'blindVisible 与 exposure 不一致（应由 exposure 派生）', '移除独立 blindVisible 设置'));
      }
      if (!isNum(s.precision) || s.precision < 0 || s.precision > 12) {
        problems.push(contractError('CN-E02', 'signals.' + s.id + '.precision', 'precision 必须是 0–12 的数字', '检查 SignalCatalog'));
      }
    });
    return problems;
  }

  /* ------------------------------------------------------------------ *
   * ScenarioConfig（契约 §2.1）——契约视图与校验
   * ------------------------------------------------------------------ */
  function scenarioView(cfg) {
    /* 把实现配置（systemId/modelId/fault/initial/noise）投影为契约 §2.1 字段面。
       键序、默认值填充、最短往返数字由 canonicalize 处理；本函数只负责字段映射。 */
    if (!cfg || typeof cfg !== 'object') return null;
    var faulted = !!(cfg.fault && cfg.fault.family && cfg.fault.family !== 'none');
    var fault = cfg.fault || {};
    return {
      schema_version: SCHEMA_VERSION,
      model_id: cfg.modelId || '',
      model_version: cfg.modelVersion || '',
      duration_s: cfg.duration_s,
      dt_s: cfg.dt_s,
      fault_time_s: faulted ? fault.t_start_s : (fault.t_start_s == null ? 20.0 : fault.t_start_s),
      bias_A: faulted ? (fault.params && fault.params.magnitude) : 0,
      feedback_mode: cfg.feedback_mode,
      initial_SOC_pct: cfg.initial && cfg.initial.SOC_pct,
      initial_load_kW: cfg.initial && cfg.initial.load_kW,
      /* R-8（CHG-20261105-01 清算项 2）：PV-001 initial 无 SOC_pct、有 G0_W_m2
         （PV001_G2B_SPEC_APPROVED v1.0 §1.1）——initial 键面按 system.bounds 派生。
         G0_W_m2 仅 PV-001 声明：其他系统 undefined → 不进入投影/哈希（inertia_model 同款先例，
         GTL1_G2B_SPEC_APPROVED v1.0 §2.4）。 */
      initial_G0_W_m2: cfg.initial && cfg.initial.G0_W_m2,
      /* B-2 WT-001（WT001_G2B_SPEC_APPROVED v1.0 §1.1，WT-G2b-03，CHG-20261107-01）：
         initial v0_ms 键面按 system.bounds 派生（R-8 同款）——WT-001 声明 v0_ms ∈ [6,10]；
         其他系统 undefined → 不进入投影/哈希（G0_W_m2 / inertia_model 同款先例）。 */
      initial_v0_ms: cfg.initial && cfg.initial.v0_ms,
      /* MG-001（MG001_G2B_SPEC_APPROVED v1.0 §1.1/Q5 定案；W6 投影缺口补齐，CHG-20261110-01
         批准链）：initial p_sched_kW 为 MG 自有配置量（BESS 调度计划，bounds 声明 [−8,8] kW）
         ——W5 未投影致 MG config_hash 对 p_sched_kW 零敏感（同配置改 p_sched_kW → hash 不变，
         改参不产生新 Run 面）。键面按 R-8 显式键列本制追加（G0_W_m2/v0_ms 同款）：
         其他系统 undefined → 不进入投影/哈希，既有五系统 config_hash 输出零变化。 */
      initial_p_sched_kW: cfg.initial && cfg.initial.p_sched_kW,
      /* A-1 惯性双轨 → L1 三轨（GTL1_G2B_SPEC_APPROVED v1.0 §2.4；GT-001 声明；
         其他系统 undefined → 不进入投影/哈希） */
      inertia_model: cfg.inertia_model,
      /* B-3(a) 零投影（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §2 config_hash 投影行，
         FLCAP-G2b-04，CHG-20261114-01 批准链；electrochem_model/thermal_model 现状均不入
         ——本函数零新增键先例维持）：capacity_model 刻意不入投影 ⇒ FL capacity on/off 两轨
         config_hash 同值（FL/FC 现状同款已知局限——轨区分由 run_hash/序列内容承载，
         显式登记不静默，见 validateScenarioConfig capacity_model 守卫注）。 */
      noise: (cfg.noise && cfg.noise.enabled) ? { seed: cfg.noise.seed, level: cfg.noise.level } : null
    };
  }

  /* R-8（CHG-20261105-01 清算项 2）：按 model_id 反查 SystemDef 原始引用。
     systems 未装载 / 未知 model_id → null（调用方回退既有行为，行为逐字等价）。 */
  function resolveSystemDef(modelId) {
    if (!FL.systems || !FL.systems._raw || typeof FL.systems._raw.all !== 'function') return null;
    var all = FL.systems._raw.all();
    if (!Array.isArray(all)) return null;
    for (var i = 0; i < all.length; i++) {
      var s = all[i];
      if (s && s.model && s.model.model_id === modelId) return s;
    }
    return null;
  }

  function resolveInitialBounds(modelId) {
    var sys = resolveSystemDef(modelId);
    return (sys && sys.bounds) ? sys.bounds : null;
  }

  /* 残留①（CHG-20261107-01 ③；v072-release §4 项 1）：bias_A 契约键在投影面统一承载
     fault.params.magnitude（scenarioView 键名沿契约 §2.1 历史面——哈希输入零变化），
     但 |b|≤20 A 是电流域物理界，只对偏置信号为电流域 bias_A 的系统适用。
     分派口径（选型登记）：按系统信号目录是否存在 id='bias_A' 的信号——契约键与信号
     目录同名同域，最诚实且免维护系统清单（新系统落地即自动取得正确域语义）。
     FL-001/FC-001 信号目录声明 bias_A（单位 A）→ 检查适用（既有行为逐字保持）；
     PV-001 偏置信号为 bias_W_m2（W/m² 域）、GT-001 为转速偏置（Hz 域）、WT-001 为
     bias_ms（m/s 域）→ 其 faulted Run 幅值不属电流域，A 域检查不适用（旧实现按 A 域
     误校 → faulted PV Run 导出/导入误报 CN-E02，v072-release §4 项 1 登记在案）。
     反查失败（systems 未装载/未知 model_id）回退既有行为（检查生效）。 */
  function hasCurrentDomainBiasSignal(modelId) {
    var sys = resolveSystemDef(modelId);
    if (!sys) return true; /* 回退：既有行为 */
    var signals = sys.signals || [];
    for (var i = 0; i < signals.length; i++) {
      if (signals[i] && signals[i].id === 'bias_A') return true;
    }
    return false;
  }

  function validateScenarioConfig(sc, opts) {
    opts = opts || {};
    var problems = [];
    function bad(field, message, next) { problems.push(contractError('CN-E02', field, message, next)); }

    if (!sc || typeof sc !== 'object') {
      return [contractError('CN-E01', 'config', '配置不是对象', '提供合法 ScenarioConfig')];
    }
    if (sc.schema_version !== SCHEMA_VERSION) {
      bad('schema_version', 'schema_version 必须为 ' + SCHEMA_VERSION + '（当前 ' + String(sc.schema_version) + '）', '升级应用或重新导出');
    }
    if (typeof sc.model_id !== 'string' || !sc.model_id) bad('model_id', '缺少 model_id', '检查配置');
    if (typeof sc.model_version !== 'string' || !sc.model_version) bad('model_version', '缺少 model_version', '检查配置');
    if (!isNum(sc.duration_s) || sc.duration_s <= 0) bad('duration_s', 'duration_s 必须是正数', '检查配置');
    if (!isNum(sc.dt_s) || sc.dt_s <= 0) bad('dt_s', 'dt_s 必须是正数', '检查配置');
    if (isNum(sc.duration_s) && isNum(sc.dt_s)) {
      var steps = sc.duration_s / sc.dt_s;
      if (Math.abs(steps - Math.round(steps)) > 1e-9) {
        bad('duration_s', 'duration_s 必须是 dt_s 的整数倍', '检查采样网格');
      }
    }
    if (!isNum(sc.fault_time_s)) {
      bad('fault_time_s', 'fault_time_s 必须是数字', '检查配置');
    } else if (isNum(sc.duration_s) && (sc.fault_time_s < 0 || sc.fault_time_s >= sc.duration_s)) {
      bad('fault_time_s', 'fault_time_s 必须满足 0 ≤ t_f < duration_s', '检查配置');
    } else if (Math.abs(sc.fault_time_s / sc.dt_s - Math.round(sc.fault_time_s / sc.dt_s)) > 1e-9) {
      bad('fault_time_s', '故障时刻必须对齐 dt_s 网格', '检查配置');
    }
    if (!isNum(sc.bias_A)) bad('bias_A', 'bias_A 必须是数字', '检查配置');
    else if (opts.p0frozen && Math.abs(sc.bias_A) > 0 && Math.abs(sc.bias_A - 10) > 1e-12) {
      bad('bias_A', 'P0 冻结 bias_A=+10（当前 ' + String(sc.bias_A) + '）', '参数编辑属 P1 范围');
    } else if (hasCurrentDomainBiasSignal(sc.model_id) && Math.abs(sc.bias_A) > 20) {
      bad('bias_A', 'bias_A 幅值超出模型物理范围（|b| ≤ 20 A）', '修改参数后重试');
    }
    if (sc.feedback_mode !== 'closed_loop' && sc.feedback_mode !== 'monitor') {
      bad('feedback_mode', 'feedback_mode 必须为 closed_loop 或 monitor', '检查配置');
    }
    /* A-1 惯性双轨 → L1 三轨（GTL1_G2B_SPEC_APPROVED v1.0 §2.4 Q2 定案，CHG-20261104-12）：
       可缺省（GT-001 之外的系统/旧导出包无此字段），出现时必须合法 */
    if (sc.inertia_model !== undefined && sc.inertia_model !== null &&
        sc.inertia_model !== 'swing' && sc.inertia_model !== 'linear' && sc.inertia_model !== 'thermo') {
      bad('inertia_model', 'inertia_model 必须为 swing / linear / thermo', '检查配置');
    }
    /* FC-001 电化学轨（FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §2 B-3 定案采 (a)，CHG-20261113-01；
       thermal_model 先例同构——scenarioView 现状即不投影 thermal_model/electrochem_model）：
       scenarioView 不投影 electrochem_model ⇒ FC on/off 两轨 config_hash 同值（FL 现状同款），
       轨区分由 run_hash/序列内容承载——显式登记已知局限，不静默。本守卫仅对显式携带该键的
       契约视图生效（外部构造/异版本导出包——inertia_model 守卫同形态），枚举 off|on；
       scenarioView 产出的既有投影该键恒为 undefined ⇒ 全部既有输入零触发。 */
    if (sc.electrochem_model !== undefined && sc.electrochem_model !== null &&
        sc.electrochem_model !== 'off' && sc.electrochem_model !== 'on') {
      bad('electrochem_model', 'electrochem_model 必须为 off / on', '检查配置');
    }
    /* FL-001 容量/内阻二阶效应轨（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §2 config_hash
       投影行 B-3(a) 定案，FLCAP-G2b-04，CHG-20261114-01 批准链；electrochem_model 守卫
       同形态——scenarioView 现状即不投影 capacity_model，见上方零投影注）：scenarioView
       不投影 capacity_model ⇒ FL capacity on/off 两轨 config_hash 同值（FL/FC 现状同款），
       轨区分由 run_hash/序列内容承载——显式登记已知局限，不静默。本守卫仅对显式携带该键的
       契约视图生效（外部构造/异版本导出包——inertia_model 守卫同形态），枚举 off|on；
       scenarioView 产出的既有投影该键恒为 undefined ⇒ 全部既有输入零触发（改前/改后
       config_hash 逐位对比探针承载）。 */
    if (sc.capacity_model !== undefined && sc.capacity_model !== null &&
        sc.capacity_model !== 'off' && sc.capacity_model !== 'on') {
      bad('capacity_model', 'capacity_model 必须为 off / on', '检查配置');
    }
    /* R-8（CHG-20261105-01 清算项 2）：initial 键面按 system.bounds 派生——声明才要求
       （PV-001 bounds 无 SOC_pct，健康 PV Run 不再误报 CN-E02；FL/FC/GT bounds 均含 SOC_pct，
       键面与报文逐字不变）；PV-001 的 G0_W_m2 校验补入（域取 bounds.G0_W_m2，
       engine.js normalizeConfig 同口径，T3 v0.7.0 先例）。
       声明面之外的初值键处置保持不变：不要求、不新增拒绝；反查失败回退既有键面。 */
    var initBounds = resolveInitialBounds(sc.model_id);
    if (!initBounds || initBounds.SOC_pct) {
      if (!isNum(sc.initial_SOC_pct) || sc.initial_SOC_pct < 0 || sc.initial_SOC_pct > 100) {
        bad('initial_SOC_pct', 'initial_SOC_pct 必须在 0–100 之间', '检查配置');
      }
    }
    if (!initBounds || initBounds.load_kW) {
      if (!isNum(sc.initial_load_kW) || sc.initial_load_kW <= 0) {
        bad('initial_load_kW', 'initial_load_kW 必须是正数', '检查配置');
      }
    }
    if (initBounds && initBounds.G0_W_m2) {
      if (!isNum(sc.initial_G0_W_m2)) {
        bad('initial_G0_W_m2', 'initial_G0_W_m2 必须是数字（W/m²）', '检查配置');
      } else if (sc.initial_G0_W_m2 < initBounds.G0_W_m2.min - 1e-9 ||
                 sc.initial_G0_W_m2 > initBounds.G0_W_m2.max + 1e-9) {
        bad('initial_G0_W_m2', 'initial_G0_W_m2 必须在 ' + initBounds.G0_W_m2.min + '–' +
          initBounds.G0_W_m2.max + ' W/m² 之间', '检查配置');
      }
    }
    /* B-2 WT-001（WT001_G2B_SPEC_APPROVED v1.0 §1.1，WT-G2b-03，CHG-20261107-01）：
       initial_v0_ms 校验补入（域取 bounds.v0_ms，声明才要求——R-8 G0_W_m2 同款；
       WT-001 声明 [6,10] m/s，§1.1）。bounds 驱动、无系统清单硬编码：WT-001 SystemDef
       落地（WT-G2b-04）即自动纳入。声明面之外的初值键处置不变；反查失败回退既有键面。 */
    if (initBounds && initBounds.v0_ms) {
      if (!isNum(sc.initial_v0_ms)) {
        bad('initial_v0_ms', 'initial_v0_ms 必须是数字（m/s）', '检查配置');
      } else if (sc.initial_v0_ms < initBounds.v0_ms.min - 1e-9 ||
                 sc.initial_v0_ms > initBounds.v0_ms.max + 1e-9) {
        bad('initial_v0_ms', 'initial_v0_ms 必须在 ' + initBounds.v0_ms.min + '–' +
          initBounds.v0_ms.max + ' m/s 之间', '检查配置');
      }
    }
    /* MG-001（MG001_G2B_SPEC_APPROVED v1.0 §1.1/Q5；W6 投影缺口补齐，CHG-20261110-01）：
       initial_p_sched_kW 校验补入（域取 bounds.p_sched_kW [−8,8]，声明才要求——
       R-8 G0_W_m2/v0_ms 同款；与 engine.js validateConfig MG 分支 MG-IMP-Q1 reject
       纪律同域。bounds 驱动、无系统清单硬编码；声明面之外的初值键处置不变；
       反查失败回退既有键面。） */
    if (initBounds && initBounds.p_sched_kW) {
      if (!isNum(sc.initial_p_sched_kW)) {
        bad('initial_p_sched_kW', 'initial_p_sched_kW 必须是数字（kW）', '检查配置');
      } else if (sc.initial_p_sched_kW < initBounds.p_sched_kW.min - 1e-9 ||
                 sc.initial_p_sched_kW > initBounds.p_sched_kW.max + 1e-9) {
        bad('initial_p_sched_kW', 'initial_p_sched_kW 必须在 ' + initBounds.p_sched_kW.min + '–' +
          initBounds.p_sched_kW.max + ' kW 之间', '检查配置');
      }
    }
    if (sc.noise !== null && sc.noise !== undefined) {
      if (typeof sc.noise !== 'object' || !isNum(sc.noise.seed) || !isNum(sc.noise.level)) {
        bad('noise', 'noise 必须为 null 或 {seed, level}', '检查配置');
      }
    }
    return problems;
  }

  /* ------------------------------------------------------------------ *
   * TimeSeries（契约 §2.4）：n 由 duration/dt 派生（禁止硬编码 601）
   * ------------------------------------------------------------------ */
  function deriveNSamples(duration_s, dt_s) {
    return Math.round(duration_s / dt_s) + 1;
  }

  function validateTimeSeries(ts, cfg) {
    var problems = [];
    function bad(code, field, message, next) { problems.push(contractError(code, field, message, next)); }
    if (!ts || !Array.isArray(ts.t)) {
      return [contractError('CN-E01', 'timeseries.t', '缺少时间序列', '重新导出证据包')];
    }
    var n = deriveNSamples(cfg.duration_s, cfg.dt_s);
    var dt = cfg.dt_s;
    if (ts.t.length !== n) {
      bad('CN-E03', 'timeseries.t', '采样点应为 ' + n + '（duration/dt+1），实际 ' + ts.t.length, '重新导出');
    }
    for (var i = 0; i < ts.t.length; i++) {
      var expected = i * dt;
      if (Math.abs(ts.t[i] - expected) > 1e-9) {
        bad('CN-E03', 'timeseries.t', '时间网格必须 t[i]=i·dt（第 ' + i + ' 点）', '禁止累加生成时间轴');
        break;
      }
      if (i > 0 && !(ts.t[i] > ts.t[i - 1])) {
        bad('CN-E03', 'timeseries.t', '时间序列非单调递增（第 ' + i + ' 点）', '重新导出');
        break;
      }
    }
    var signals = ts.signals || {};
    Object.keys(signals).forEach(function (id) {
      var arr = signals[id];
      if (!Array.isArray(arr) || arr.length !== ts.t.length) {
        bad('CN-E03', 'timeseries.signals.' + id, '信号长度与时间轴不一致', '重新导出');
        return;
      }
      for (var k = 0; k < arr.length; k++) {
        var v = arr[k];
        if (v === null) continue; /* 可选通道（如限幅）允许 null */
        if (typeof v !== 'number' || !isFinite(v)) {
          bad('CN-E04', 'timeseries.signals.' + id, '第 ' + k + ' 点存在 NaN/Infinity/非数值', '重新计算或导出');
          break;
        }
      }
    });
    return problems;
  }

  /* ------------------------------------------------------------------ *
   * EventSnapshot（契约 §2.5）：pre/post 成对、t_s=事件时刻、derivation
   * ------------------------------------------------------------------ */
  function validateEventSnapshots(events, snapshots, cfg) {
    var problems = [];
    function bad(field, message, next) { problems.push(contractError('CN-E05', field, message, next)); }
    if (!Array.isArray(events) || !Array.isArray(snapshots)) {
      bad('events/snapshots', '缺少事件或快照数组', '重新导出');
      return problems;
    }
    if (!events.length) return problems; /* 健康运行无事件 */
    var tF = cfg.fault_time_s;
    var byKey = {};
    snapshots.forEach(function (s) {
      if (!s || typeof s.event_id !== 'string' || (s.phase !== 'pre' && s.phase !== 'post')) {
        bad('snapshots.phase', '快照 phase 必须为 pre/post', '检查事件编码版本');
        return;
      }
      var key = s.event_id + '|' + s.phase;
      if (byKey[key]) bad('snapshots', '主键 (event_id, phase) 重复：' + key, '检查事件编码版本');
      byKey[key] = true;
      if (Math.abs(s.t_s - tF) > 1e-9) {
        bad('snapshots.t_s', '快照 t_s 必须恒为事件时刻 ' + tF + '（当前 ' + s.t_s + '）；19.9 等上一采样不得充当 pre', '检查事件编码版本');
      }
      if (s.phase === 'pre' && s.derivation !== 'left_limit') {
        bad('snapshots.derivation', 'pre 快照 derivation 必须为 left_limit', '检查事件编码版本');
      }
      if (s.phase === 'post' && s.derivation !== 'post_sample') {
        bad('snapshots.derivation', 'post 快照 derivation 必须为 post_sample', '检查事件编码版本');
      }
      if (!s.variables || typeof s.variables !== 'object') {
        bad('snapshots.variables', '快照缺少 variables', '重新导出');
      }
    });
    events.forEach(function (ev) {
      if (!byKey[ev.event_id + '|pre']) bad('events', '事件 ' + ev.event_id + ' 缺 pre 快照', 'pre 与 post 必须成对');
      if (!byKey[ev.event_id + '|post']) bad('events', '事件 ' + ev.event_id + ' 缺 post 快照', 'pre 与 post 必须成对');
    });
    return problems;
  }

  /* ------------------------------------------------------------------ *
   * DerivedMetric（契约 §2.6）
   * ------------------------------------------------------------------ */
  function validateMetrics(metrics) {
    var problems = [];
    if (!Array.isArray(metrics) || !metrics.length) {
      return [contractError('CN-E01', 'metrics', '指标数组为空', '重新计算指标')];
    }
    metrics.forEach(function (m) {
      var id = (m && m.metric_id) || '?';
      /* unit 允许空字符串（无单位枚举指标，如 effective_mode）；量纲单位必须在字典内 */
      if (m.unit !== '' && UNIT_DICT[m.unit] === undefined) {
        problems.push(contractError('CN-E02', 'metrics.' + id + '.unit', '单位不在字典：' + String(m.unit), '允许值见单位字典'));
      }
      if (m.value === null || m.value === undefined) {
        if (!m.unavailable_reason) {
          problems.push(contractError('CN-E01', 'metrics.' + id + '.unavailable_reason', 'value=null 时必须给出 unavailable_reason', '禁止填 0 冒充'));
        }
      } else if (typeof m.value === 'string') {
        /* 无单位枚举指标（effective_mode）允许字符串值 */
        if (m.unit !== '') {
          problems.push(contractError('CN-E04', 'metrics.' + id + '.value', '指标值必须是有限数值或 null（字符串仅限无单位枚举指标）', '重新计算'));
        }
      } else if (!isNum(m.value)) {
        problems.push(contractError('CN-E04', 'metrics.' + id + '.value', '指标值必须是有限数值或 null', '重新计算'));
      }
      if (METRIC_METHODS.indexOf(m.method) === -1) {
        problems.push(contractError('CN-E02', 'metrics.' + id + '.method', '未知 method：' + String(m.method), '允许 analytic_flux/trapezoid/substep/algebraic/analytic'));
      }
      if (!Array.isArray(m.time_window_s) || m.time_window_s.length !== 2) {
        problems.push(contractError('CN-E01', 'metrics.' + id + '.time_window_s', '缺少 time_window_s [起,止]', '补充时间窗'));
      }
      if (/SOC_err/.test(id) && m.unit !== 'pp') {
        problems.push(contractError('CN-E02', 'metrics.' + id + '.unit', 'SOC 误差单位必须是 pp（百分点），不得写成 %', '检查指标定义'));
      }
    });
    return problems;
  }

  /* ------------------------------------------------------------------ *
   * QualityChecks（契约 §2.7）
   * ------------------------------------------------------------------ */
  function validateChecks(checks) {
    var problems = [];
    if (!Array.isArray(checks)) {
      return [contractError('CN-E01', 'checks', '缺少质量检查数组', '重新计算检查')];
    }
    checks.forEach(function (c) {
      var id = (c && c.check_id) || '?';
      if (CHECK_STATUSES.indexOf(c.status) === -1) {
        problems.push(contractError('CN-E02', 'checks.' + id + '.status', '未知 status：' + String(c.status), '允许 pass/fail/skipped/warn'));
      }
      if (c.status === 'skipped' && !c.reason) {
        problems.push(contractError('CN-E01', 'checks.' + id + '.reason', 'skipped 必须给出原因', '补充 reason'));
      }
      if (CHECK_OWNERS.indexOf(c.owner) === -1) {
        problems.push(contractError('CN-E02', 'checks.' + id + '.owner', '未知 owner：' + String(c.owner), '允许 numeric/e2e/registry/schema'));
      }
    });
    return problems;
  }

  /* ------------------------------------------------------------------ *
   * RunManifest（契约 §2.9）
   * ------------------------------------------------------------------ */
  function validateRunManifest(m) {
    var problems = [];
    function bad(field, message) { problems.push(contractError('CN-E01', field, message, '重新创建运行或导入证据包')); }
    if (!m || typeof m !== 'object') {
      return [contractError('CN-E01', 'manifest', '缺少 RunManifest', '重新创建运行')];
    }
    ['run_id', 'role', 'config_hash', 'model_hash', 'engine_version', 'model_version',
     'schema_version', 'run_hash'].forEach(function (k) {
      if (typeof m[k] !== 'string' || !m[k]) bad(k, '缺少 ' + k);
    });
    if (['baseline', 'fault', 'monitor', 'imported'].indexOf(m.role) === -1 &&
        ['baseline', 'fault', 'contrast'].indexOf(m.role) === -1) {
      bad('role', '未知 role：' + String(m.role));
    }
    if (m.event_encoding_version !== EVENT_ENCODING_VERSION) bad('event_encoding_version', 'event_encoding_version 必须为 1');
    if (m.bundle_schema_version !== BUNDLE_SCHEMA_VERSION) bad('bundle_schema_version', 'bundle_schema_version 必须为 v1');
    if (!m.verification || typeof m.verification !== 'object') bad('verification', '缺少 verification 三级证据');
    else if (m.verification.model_validation !== 'not_performed' || m.verification.hardware_verification !== 'not_performed') {
      problems.push(contractError('CN-E02', 'verification', 'model_validation / hardware_verification 必须为 not_performed（L0 演示，模型/硬件验证均未进行）', '检查证据三级字段'));
    }
    if (!m.integrity || m.integrity.run_hash !== m.run_hash) bad('integrity', 'integrity.run_hash 与 run_hash 不一致');
    return problems;
  }

  /* ------------------------------------------------------------------ *
   * 统一入口：FL.contract.validate(kind, obj)
   * ------------------------------------------------------------------ */
  function validate(kind, obj, opts) {
    opts = opts || {};
    switch (kind) {
      case 'signal_catalog': return validateSignalCatalog(obj, opts);
      case 'scenario_config': return validateScenarioConfig(obj, opts);
      case 'timeseries': return validateTimeSeries(obj, opts.config || { duration_s: 60, dt_s: 0.1 });
      case 'events': return validateEventSnapshots(obj.events || [], obj.snapshots || [], opts.config || { fault_time_s: 20 });
      case 'metrics': return validateMetrics(obj);
      case 'checks': return validateChecks(obj);
      case 'run_manifest': return validateRunManifest(obj);
      default:
        return [contractError('CN-E02', 'kind', '未知校验类型 ' + String(kind), '使用 signal_catalog/scenario_config/timeseries/events/metrics/checks/run_manifest')];
    }
  }

  /* ------------------------------------------------------------------ *
   * project(run, level)（契约 §2.13 / G0-DEC-11）——纯函数，不改 run
   * ------------------------------------------------------------------ */
  var BLIND_BANNED_KEY = /(^|_)(true|truth|bias|cap|fault)(_|$)/i;
  var BLIND_BANNED_EXACT = ['bias_A', 'faultFamily', 'faultId', 'faultActiveFrom_s', 'peakMagnitude'];

  function looksBlindBanned(key) {
    if (typeof key !== 'string') return false;
    if (BLIND_BANNED_EXACT.indexOf(key) !== -1) return true;
    return /_true_|^truth$|^truth\.|Truth|bias_A|_cap_|faultFamily|faultId/i.test(key);
  }

  function blindScan(obj, path, hits) {
    if (obj === null || typeof obj !== 'object') return hits;
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) blindScan(obj[i], path + '[' + i + ']', hits);
      return hits;
    }
    var keys = Object.keys(obj);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (looksBlindBanned(key)) hits.push(path + '.' + key);
      blindScan(obj[key], path + '.' + key, hits);
    }
    return hits;
  }

  function project(run, level) {
    if (!run || typeof run !== 'object') {
      throw contractError('CN-E09', 'run', '运行不存在', '重新创建或导入证据包');
    }
    if (level !== 'demo' && level !== 'blind') {
      throw contractError('CN-E02', 'level', '投影级别必须为 demo 或 blind', '检查调用方');
    }
    if (level === 'demo') {
      /* 演示公开：全部信号带 source_kind/exposure 标签，truth 保留（demo 页内部用） */
      return {
        level: 'demo',
        run_id: run.runId,
        manifest: run.manifest || null,
        config: run.config,
        model: run.modelManifest || null,
        signals: run.signals,
        timeseries: run.timeseries,
        events: run.events,
        snapshots: run.snapshots,
        metrics: run.metrics,
        quality: run.quality,
        causal: run.causal,
        truth: run.truth || null
      };
    }
    /* blind：仅 exposure=blind_observable 的信号；脱敏事件；blindSafe 指标；无 truth/fault/bias */
    var blindSignals = (run.signals || []).filter(function (s) { return s.exposure === 'blind_observable'; });
    var keep = {};
    blindSignals.forEach(function (s) { keep[s.id] = true; });
    var series = {};
    Object.keys(run.timeseries.signals).forEach(function (id) {
      if (keep[id]) series[id] = run.timeseries.signals[id];
    });
    var blindEvents = (run.events || []).map(function (ev) {
      return { event_id: ev.event_id, trigger_s: ev.trigger_s, channel_changed: true };
    });
    var blindMetrics = (run.metrics || []).filter(function (m) { return m.blindSafe === true; })
      .map(function (m) { return { metric_id: m.metric_id, value: m.value, unit: m.unit, label: m.label }; });
    var blindConfig = {
      schema_version: SCHEMA_VERSION,
      duration_s: run.config.duration_s,
      dt_s: run.config.dt_s,
      feedback_mode: run.config.feedback_mode,
      noise: null
    };
    var projected = {
      level: 'blind',
      run_id: run.runId,
      config: blindConfig,
      signals: blindSignals.map(function (s) {
        return { id: s.id, label: s.label, unit: s.unit, sourceKind: s.sourceKind, exposure: s.exposure, category: s.category };
      }),
      timeseries: { t: run.timeseries.t, signals: series },
      events: blindEvents,
      metrics: blindMetrics
    };
    /* 递归断言：blind 投影零真值字段（契约 §6 第 4 条） */
    var hits = blindScan(projected, '$', []);
    if (hits.length) {
      throw contractError('CN-E07', 'project.blind', '盲投影泄漏真值字段：' + hits.slice(0, 5).join('、'), '检查 exposure 声明');
    }
    return projected;
  }

  /* ------------------------------------------------------------------ *
   * 导出投影（去除实现内部辅助字段，仅保留契约 §2.6/§2.7 字段面）
   * ------------------------------------------------------------------ */
  function toContractMetric(m) {
    return {
      metric_id: m.metric_id,
      label: m.label,
      unit: m.unit,
      value: m.value === undefined ? null : m.value,
      precision: m.precision,
      time_window_s: m.time_window_s || m.time_window || [0, 0],
      method: m.method,
      method_version: m.method_version || '1',
      source_signal_ids: m.source_signal_ids || [],
      source_run_ids: m.source_run_ids || [],
      unavailable_reason: m.value == null ? (m.unavailable_reason || '不可用（数据缺失或场景不适用）') : null,
      blindSafe: m.blindSafe === true,
      definition: m.definition || m.method || ''
    };
  }

  function toContractCheck(c) {
    return {
      check_id: c.check_id,
      status: c.status === 'warn' ? 'warn' : c.status,
      observed: c.observed !== undefined ? c.observed : (c.computed_value !== undefined ? c.computed_value : null),
      expected: c.expected !== undefined ? c.expected : null,
      tolerance: c.tolerance !== undefined ? c.tolerance : null,
      reason: c.reason || c.message || '',
      owner: c.owner || 'numeric'
    };
  }

  FL.contract = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    BUNDLE_SCHEMA_VERSION: BUNDLE_SCHEMA_VERSION,
    EVENT_ENCODING_VERSION: EVENT_ENCODING_VERSION,
    UNIT_DICT: UNIT_DICT,
    P0_UNITS: P0_UNITS,
    EXPOSURES: EXPOSURES,
    DEFAULT_EXPOSURE: DEFAULT_EXPOSURE,
    SOURCE_KINDS: SOURCE_KINDS,
    error: contractError,
    isNum: isNum,
    scenarioView: scenarioView,
    deriveNSamples: deriveNSamples,
    validate: validate,
    validateSignalCatalog: validateSignalCatalog,
    validateScenarioConfig: validateScenarioConfig,
    validateTimeSeries: validateTimeSeries,
    validateEventSnapshots: validateEventSnapshots,
    validateMetrics: validateMetrics,
    validateChecks: validateChecks,
    validateRunManifest: validateRunManifest,
    project: project,
    blindScan: blindScan,
    looksBlindBanned: looksBlindBanned,
    toContractMetric: toContractMetric,
    toContractCheck: toContractCheck
  };
})();
