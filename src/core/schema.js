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
    'Hz': 'frequency', 'rpm': 'speed'
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
      noise: (cfg.noise && cfg.noise.enabled) ? { seed: cfg.noise.seed, level: cfg.noise.level } : null
    };
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
    } else if (Math.abs(sc.bias_A) > 20) {
      bad('bias_A', 'bias_A 幅值超出模型物理范围（|b| ≤ 20 A）', '修改参数后重试');
    }
    if (sc.feedback_mode !== 'closed_loop' && sc.feedback_mode !== 'monitor') {
      bad('feedback_mode', 'feedback_mode 必须为 closed_loop 或 monitor', '检查配置');
    }
    if (!isNum(sc.initial_SOC_pct) || sc.initial_SOC_pct < 0 || sc.initial_SOC_pct > 100) {
      bad('initial_SOC_pct', 'initial_SOC_pct 必须在 0–100 之间', '检查配置');
    }
    if (!isNum(sc.initial_load_kW) || sc.initial_load_kW <= 0) {
      bad('initial_load_kW', 'initial_load_kW 必须是正数', '检查配置');
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
