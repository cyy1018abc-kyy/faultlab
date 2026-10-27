/* owner: core-engine | module: engine | contract: docs/CONTRACT.md */
/* 仿真引擎：纯函数、确定性；输出 run 对象严格符合契约 §4.6。
   依赖顺序：hash.js → rng.js → systems.js → engine.js → metrics.js → checks.js
   metrics.js / checks.js 在 simulate 调用时才被访问（加载顺序允许延迟绑定）。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  var core = FL.core = FL.core || {};

  var ENGINE_VERSION = '0.1.0';
  var DT_INT = 0.01;        // 内部积分子步（契约 §5）
  var CAP_KWH = 40;         // 统一电池容量
  var SUB = 10;             // 0.1 s 输出步长内的子步数
  var _runSeq = 0;
  var _manifestCache = {};

  /* ================================================================== */
  /* 通用工具                                                           */
  /* ================================================================== */
  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function deepClone(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) {
      var arr = new Array(v.length);
      for (var i = 0; i < v.length; i++) arr[i] = deepClone(v[i]);
      return arr;
    }
    var out = {};
    for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) out[k] = deepClone(v[k]);
    return out;
  }

  function deepMerge(base, patch) {
    if (!isPlainObject(patch)) return deepClone(patch);
    var out = isPlainObject(base) ? deepClone(base) : {};
    Object.keys(patch).forEach(function (k) {
      var pv = patch[k];
      var bv = out[k];
      if (isPlainObject(pv) && isPlainObject(bv)) out[k] = deepMerge(bv, pv);
      else if (pv !== undefined) out[k] = deepClone(pv);
    });
    return out;
  }

  function clamp(v, lo, hi) {
    if (!isFinite(v)) return lo;
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function roundTo(x, digits) {
    var p = Math.pow(10, digits);
    return Math.round(x * p) / p;
  }

  function roundTime(x) {
    return Math.round(x * 1e6) / 1e6;
  }

  function fmtVal(value, precision) {
    if (value === null || value === undefined || typeof value !== 'number' || !isFinite(value)) return '—';
    var p = precision == null ? 2 : precision;
    var s = value.toFixed(p);
    if (s === '-0' || /^-0\.0+$/.test(s)) s = s.substring(1);
    return s;
  }

  function formatMagnitude(value, precision) {
    var p = precision == null ? 0 : precision;
    var r = roundTo(value, p);
    return String(r);
  }

  /* 幅值展示：+10 A / +55% / +0.3 Hz */
  function formatAmount(value, param) {
    var p = param || { unit: '', precision: 0 };
    var sign = value >= 0 ? '+' : '';
    var num = formatMagnitude(value, p.precision);
    var unit = p.unit || '';
    if (unit === '%') return sign + num + '%';
    return sign + num + (unit ? ' ' + unit : '');
  }

  function makeConfigError(errors) {
    var msg = '配置无效：' + errors.map(function (it) { return it.field + ' ' + it.message; }).join('；');
    var err = new Error(msg);
    err.name = 'ConfigError';
    err.field = errors[0] ? errors[0].field : 'config';
    err.errors = errors;
    return err;
  }

  function rawSystem(systemId) {
    if (!FL.systems || !FL.systems._raw) return null;
    return FL.systems._raw.get(systemId);
  }

  function isoLocalNow() {
    var d = new Date();
    function p2(n) { return String(n).padStart(2, '0'); }
    var off = -d.getTimezoneOffset();
    var sgn = off >= 0 ? '+' : '-';
    var ah = Math.floor(Math.abs(off) / 60);
    var am = Math.abs(off) % 60;
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) +
      'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) +
      sgn + p2(ah) + ':' + p2(am);
  }

  function findFaultDef(system, family) {
    if (!system || !system.faults) return null;
    for (var i = 0; i < system.faults.length; i++) if (system.faults[i].family === family) return system.faults[i];
    return null;
  }

  function findComponent(system, componentId) {
    if (!system || !system.components) return null;
    for (var i = 0; i < system.components.length; i++) if (system.components[i].id === componentId) return system.components[i];
    return null;
  }

  function signalMeta(system, signalId) {
    if (!system || !system.signals) return null;
    for (var i = 0; i < system.signals.length; i++) if (system.signals[i].id === signalId) return system.signals[i];
    return null;
  }

  function findMetric(metrics, metricId) {
    if (!metrics) return null;
    for (var i = 0; i < metrics.length; i++) if (metrics[i].metric_id === metricId) return metrics[i];
    return null;
  }

  /* FL-001 契约指标 ID（DATA_CONTRACT_SPEC §2.6 P0 指标集）与旧实现 ID 的别名解析。
     FL-001 的 metrics 已改用契约 ID；FC/GT 冻结预览沿用旧 ID，页面/检查经此兼容。 */
  var METRIC_ALIAS = {
    E_bat_kWh: ['E_bat_true_60s'],
    E_source_kWh: ['E_gen_true_60s'],
    E_load_served_kWh: ['E_load_served_60s'],
    SOC_err_pp: ['SOC_err_end_pp'],
    focal_change: ['focal_change_A']
  };

  function findMetricAny(metrics, metricId) {
    var m = findMetric(metrics, metricId);
    if (m) return m;
    var alts = METRIC_ALIAS[metricId] || [];
    for (var i = 0; i < alts.length; i++) {
      m = findMetric(metrics, alts[i]);
      if (m) return m;
    }
    return null;
  }

  /* ================================================================== */
  /* 配置：default / create / normalize / validate                       */
  /* ================================================================== */
  function defaultConfigFor(system) {
    return FL.systems.defaultConfig(system.id);
  }

  function normalizeConfig(system, cfg) {
    var out = deepClone(cfg);

    if (!out.schemaVersion) out.schemaVersion = 1;
    if (!out.systemId) out.systemId = system.id;
    if (!out.modelId) out.modelId = system.model.model_id;
    if (!out.modelVersion) out.modelVersion = system.model.model_version;
    if (out.duration_s === undefined || out.duration_s === null) out.duration_s = system.duration_s;
    if (out.dt_s === undefined || out.dt_s === null) out.dt_s = system.dt_s;
    if (!out.feedback_mode) out.feedback_mode = system.defaults.feedback_mode;

    var dInitial = deepClone(system.defaults.initial);
    out.initial = deepMerge(dInitial, isPlainObject(out.initial) ? out.initial : {});

    var dNoise = deepClone(system.defaults.noise);
    out.noise = deepMerge(dNoise, isPlainObject(out.noise) ? out.noise : {});

    var fcfg = isPlainObject(out.fault) ? out.fault : {};
    var family = fcfg.family || (system.faults[0] && system.faults[0].family) || 'none';
    if (family === 'none') {
      out.fault = { family: 'none', faultId: null, t_start_s: null, params: {} };
    } else {
      var def = findFaultDef(system, family);
      if (!def) {
        out.fault = {
          family: family,
          faultId: fcfg.faultId == null ? null : fcfg.faultId,
          t_start_s: fcfg.t_start_s == null ? null : fcfg.t_start_s,
          params: isPlainObject(fcfg.params) ? deepClone(fcfg.params) : {}
        };
      } else {
        var params = {};
        def.params.forEach(function (p) { params[p.key] = p.default; });
        if (isPlainObject(fcfg.params)) {
          Object.keys(fcfg.params).forEach(function (k) { params[k] = fcfg.params[k]; });
        }
        /* 切换故障家族时自动纠正上一家族的 faultId；未知 id 保留交给 validateConfig 报错 */
        var knownIds = system.faults.map(function (f) { return f.id; });
        var faultId = fcfg.faultId;
        if (faultId === undefined || faultId === null || (faultId !== def.id && knownIds.indexOf(faultId) !== -1)) {
          faultId = def.id;
        }
        out.fault = {
          family: family,
          faultId: faultId,
          t_start_s: fcfg.t_start_s == null ? def.defaultTime_s : fcfg.t_start_s,
          params: params
        };
      }
    }
    return out;
  }

  function createConfig(systemId, overrides) {
    var system = rawSystem(systemId);
    if (!system) {
      var err = new Error('FL.core.createConfig：未知系统 ' + systemId);
      err.field = 'systemId';
      throw err;
    }
    var base = defaultConfigFor(system);
    var patch = isPlainObject(overrides) ? deepClone(overrides) : {};
    var merged = deepMerge(base, patch);
    /* 切换故障家族时，丢弃上一家族遗留的 params（例如 sensor 的 magnitude=10 对 actuator 越界），
       由 normalizeConfig 用新家族的参数默认值补齐。 */
    if (isPlainObject(patch.fault) && patch.fault.family && patch.fault.family !== 'none' &&
      base.fault && patch.fault.family !== base.fault.family) {
      merged.fault = merged.fault || {};
      merged.fault.params = isPlainObject(patch.fault.params) ? deepClone(patch.fault.params) : {};
      if (patch.fault.t_start_s === undefined) merged.fault.t_start_s = null;
    }
    return normalizeConfig(system, merged);
  }

  function validateConfig(config) {
    var errors = [];
    var warnings = [];
    if (!isPlainObject(config)) {
      return { ok: false, errors: [{ field: 'config', message: '配置必须是一个对象' }], warnings: warnings };
    }
    var system = rawSystem(config.systemId);
    if (!system) {
      return { ok: false, errors: [{ field: 'systemId', message: '未知系统 ' + String(config.systemId) + '（可用：FL-001 / FC-001 / GT-001）' }], warnings: warnings };
    }
    function push(field, message) { errors.push({ field: field, message: message }); }

    /* schema / model */
    if (config.schemaVersion !== 1) push('schemaVersion', '只支持 schemaVersion = 1（当前 ' + String(config.schemaVersion) + '）');
    if (config.modelId !== system.model.model_id) push('modelId', '必须为 ' + system.model.model_id + '（当前 ' + String(config.modelId) + '）');
    if (config.modelVersion !== system.model.model_version) push('modelVersion', '必须为 ' + system.model.model_version + '（当前 ' + String(config.modelVersion) + '）');

    /* 时间基准 */
    var duration = config.duration_s;
    var dt = config.dt_s;
    if (typeof duration !== 'number' || !isFinite(duration)) push('duration_s', '必须是数字');
    else if (!(Math.abs(duration - system.duration_s) < 1e-9)) push('duration_s', '当前模型固定为 ' + system.duration_s + ' s（收到 ' + duration + '）');
    if (typeof dt !== 'number' || !isFinite(dt)) push('dt_s', '必须是数字');
    else if (!(Math.abs(dt - system.dt_s) < 1e-9)) push('dt_s', '当前模型固定为 ' + system.dt_s + ' s（收到 ' + dt + '）');
    if (typeof duration === 'number' && isFinite(duration) && typeof dt === 'number' && isFinite(dt) && dt > 0) {
      var steps = duration / dt;
      if (Math.abs(steps - Math.round(steps)) > 1e-9) push('duration_s', 'duration_s 必须是 dt_s 的整数倍（duration/dt = ' + steps + '）');
      else if (Math.round(steps) !== Math.round(system.duration_s / system.dt_s)) push('duration_s', '采样点数必须为 ' + (Math.round(system.duration_s / system.dt_s) + 1) + '（含 t=60）');
    }

    /* 控制模式 */
    if (config.feedback_mode !== 'closed_loop' && config.feedback_mode !== 'monitor') {
      push('feedback_mode', '必须为 closed_loop 或 monitor（当前 ' + String(config.feedback_mode) + '）');
    }

    var durForFault = (typeof duration === 'number' && isFinite(duration)) ? duration : system.duration_s;

    /* 故障 */
    var fcfg = config.fault;
    if (!isPlainObject(fcfg)) {
      push('fault', '缺少 fault 配置对象');
    } else if (fcfg.family === 'none') {
      /* 健康基准运行：无需故障参数 */
    } else {
      var allowed = ['sensor_drift', 'load_step', 'actuator_fault'];
      if (allowed.indexOf(fcfg.family) === -1) {
        push('fault.family', '必须为 none / sensor_drift / load_step / actuator_fault（当前 ' + String(fcfg.family) + '）');
      } else {
        var def = findFaultDef(system, fcfg.family);
        if (!def) {
          push('fault.family', '系统 ' + system.id + ' 不支持故障家族 ' + fcfg.family);
        } else {
          if (fcfg.faultId != null && fcfg.faultId !== def.id) {
            push('fault.faultId', '与故障家族 ' + fcfg.family + ' 不匹配（期望 ' + def.id + '）');
          }
          var tStart = fcfg.t_start_s;
          if (typeof tStart !== 'number' || !isFinite(tStart)) {
            push('fault.t_start_s', '必须是数字（单位 s）');
          } else if (tStart < 0 || tStart >= durForFault) {
            push('fault.t_start_s', '必须满足 0 ≤ t_start_s < duration_s（' + durForFault + ' s），收到 ' + tStart);
          } else if (Math.abs(tStart * 10 - Math.round(tStart * 10)) > 1e-9) {
            push('fault.t_start_s', '必须落在 0.1 s 采样网格上（收到 ' + tStart + '）');
          } else if (tStart < def.timeRange[0] || tStart > def.timeRange[1]) {
            push('fault.t_start_s', '必须在 ' + def.timeRange[0] + '–' + def.timeRange[1] + ' s 范围内（收到 ' + tStart + '）');
          }
          var params = fcfg.params;
          if (!isPlainObject(params)) {
            push('fault.params', '必须是参数对象');
          } else {
            def.params.forEach(function (p) {
              var v = params[p.key];
              if (typeof v !== 'number' || !isFinite(v)) {
                push('fault.params.' + p.key, '必须是数字（' + p.label + '，单位 ' + p.unit + '）');
                return;
              }
              if (v < p.min - 1e-9 || v > p.max + 1e-9) {
                push('fault.params.' + p.key, '必须在 ' + p.min + '–' + p.max + ' ' + p.unit + ' 之间（收到 ' + v + '）');
              }
            });
            Object.keys(params).forEach(function (k) {
              var known = def.params.some(function (p) { return p.key === k; });
              if (!known) warnings.push('fault.params.' + k + ' 不是 ' + def.label + ' 的已知参数，计算时忽略');
            });
          }
        }
      }
    }

    /* 初始条件 */
    var init = config.initial;
    if (!isPlainObject(init)) {
      push('initial', '缺少 initial 配置对象');
    } else {
      var bounds = system.bounds || { load_kW: { min: 10, max: 45 }, SOC_pct: { min: 0, max: 100 } };
      var load = init.load_kW;
      if (typeof load !== 'number' || !isFinite(load)) push('initial.load_kW', '必须是数字（单位 kW）');
      else if (load < bounds.load_kW.min - 1e-9 || load > bounds.load_kW.max + 1e-9) {
        push('initial.load_kW', '必须在 ' + bounds.load_kW.min + '–' + bounds.load_kW.max + ' kW 之间（收到 ' + load + '）');
      }
      var soc = init.SOC_pct;
      if (typeof soc !== 'number' || !isFinite(soc)) push('initial.SOC_pct', '必须是数字（单位 %）');
      else if (soc < bounds.SOC_pct.min - 1e-9 || soc > bounds.SOC_pct.max + 1e-9) {
        push('initial.SOC_pct', '必须在 ' + bounds.SOC_pct.min + '–' + bounds.SOC_pct.max + ' % 之间（收到 ' + soc + '）');
      }
      Object.keys(init).forEach(function (k) {
        if (k !== 'load_kW' && k !== 'SOC_pct') warnings.push('initial.' + k + ' 不是已知初始条件，计算时忽略');
      });
      if (isPlainObject(config.fault) && config.fault.family === 'load_step' && isPlainObject(config.fault.params) &&
        typeof load === 'number' && typeof config.fault.params.magnitude === 'number' && load + config.fault.params.magnitude > 55) {
        warnings.push('负载需求 ' + (load + config.fault.params.magnitude) + ' kW 超过模型推荐上限 55 kW，结果仅供参考');
      }
    }

    /* 噪声 */
    var noise = config.noise;
    if (!isPlainObject(noise)) {
      push('noise', '缺少 noise 配置对象');
    } else {
      if (typeof noise.enabled !== 'boolean') push('noise.enabled', '必须是布尔值');
      if (typeof noise.seed !== 'number' || !isFinite(noise.seed) || Math.round(noise.seed) !== noise.seed) push('noise.seed', '必须是整数');
      if (typeof noise.level !== 'number' || !isFinite(noise.level)) push('noise.level', '必须是数字');
      else if (noise.level < 0 || noise.level > 2) push('noise.level', '必须在 0–2 之间（收到 ' + noise.level + '）');
      else if (noise.level > 1) warnings.push('noise.level > 1，观测噪声将明显偏离物理量，仅建议演示使用');
    }

    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  /* ================================================================== */
  /* 模型清单                                                           */
  /* ================================================================== */
  function modelManifest(systemId) {
    var system = rawSystem(systemId);
    if (!system) {
      var err = new Error('FL.core.modelManifest：未知系统 ' + systemId);
      err.field = 'systemId';
      throw err;
    }
    if (_manifestCache[systemId]) return deepClone(_manifestCache[systemId]);
    var units = (FL.systems._raw && FL.systems._raw.units) ? deepClone(FL.systems._raw.units) : {};
    var body = {
      model_id: system.model.model_id,
      model_version: system.model.model_version,
      systemId: system.id,
      assumptions: deepClone(system.model.assumptions || []),
      limitations: deepClone(system.model.limitations || []),
      equations: deepClone(system.model.equations || []),
      units: units,
      /* 契约 §2.2 扩展字段：证据三级、单位制、方程清单、默认 exposure 映射 */
      claims: {
        model_provenance: 'analytical_demo',
        model_validation: 'not_performed',
        hardware_verification: 'not_performed'
      },
      unit_system: 'SI-derived: A,kW,kWh,V,s,%,pp',
      equation_ids: (system.model.equations || []).map(function (e) { return e.id; }),
      default_exposure: deepClone(FL.contract ? FL.contract.DEFAULT_EXPOSURE : {})
    };
    body.model_hash = core.hashObject({
      model_id: body.model_id,
      model_version: body.model_version,
      assumptions: body.assumptions,
      limitations: body.limitations,
      equations: body.equations,
      units: body.units,
      claims: body.claims,
      unit_system: body.unit_system,
      equation_ids: body.equation_ids
    });
    _manifestCache[systemId] = body;
    return deepClone(body);
  }

  /* ================================================================== */
  /* 物理积分辅助                                                       */
  /* ================================================================== */
  /* 一阶环节精确离散 + 区间内解析积分：y' = target + (y-target)*exp(-dt/tau) */
  function foStep(y, target, tau, dt) {
    var ratio = dt / tau;
    var a = ratio > 40 ? 0 : Math.exp(-ratio);
    return {
      y: target + (y - target) * a,
      integral: target * dt + (y - target) * tau * (1 - a)
    };
  }

  function buildTimeGrid(cfg) {
    /* t[i] = i·dt（MODEL_VALIDATION_SPEC §1.4 / DATA_CONTRACT_SPEC §1.4）：
       直接取 IEEE-754 乘积（如 t[199]=19.900000000000002），禁止累加、禁止舍入到 1e-6。 */
    var n = Math.round(cfg.duration_s / cfg.dt_s);
    var t = new Array(n + 1);
    for (var k = 0; k <= n; k++) t[k] = k * cfg.dt_s;
    return t;
  }

  function makeSeries(system, n) {
    var series = {};
    system.signals.forEach(function (sg) {
      var arr = new Array(n + 1);
      for (var i = 0; i <= n; i++) arr[i] = null;
      series[sg.id] = arr;
    });
    return series;
  }

  /* ---------------- FL-001 电池储能 ---------------- */
  function simulateFL001(system, cfg, t) {
    var n = t.length - 1;
    var dt = cfg.dt_s;
    var V = 0.4;
    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var magnitude = faulted ? cfg.fault.params.magnitude : 0;
    var monitor = cfg.feedback_mode === 'monitor';
    var load0 = cfg.initial.load_kW;
    var soc0 = cfg.initial.SOC_pct;
    var I_ref = (load0 - 20) / V;
    var isSensor = family === 'sensor_drift';
    var isLoad = family === 'load_step';
    var isAct = family === 'actuator_fault';
    var I_cap = isAct ? I_ref * magnitude / 100 : null;

    function bAt(time) { return (isSensor && tStart != null && time >= tStart - 1e-9) ? magnitude : 0; }
    function demandAt(time) { return (isLoad && tStart != null && time >= tStart - 1e-9) ? load0 + magnitude : load0; }

    var series = makeSeries(system, n);
    var I_true = I_ref;
    var P_gen = load0 - V * I_ref;
    var intI = 0;
    var intB = 0;
    var intDemand = 0;
    var intPgen = 0;

    function record(k) {
      var time = t[k];
      var b = bAt(time);
      var demand = demandAt(time);
      var iTrue = isLoad ? (demand - P_gen) / V : I_true;
      var iMeas = iTrue + b;
      var pBat = V * iTrue;
      var pBatMeas = V * iMeas;
      var pGen = demand - pBat;
      series.I_bat_true_A[k] = iTrue;
      series.I_bat_meas_A[k] = iMeas;
      series.I_ref_A[k] = I_ref;
      series.bias_A[k] = b;
      series.I_bat_cap_A[k] = (isAct && time >= tStart - 1e-9) ? I_cap : null;
      series.P_bat_true_kW[k] = pBat;
      series.P_bat_meas_kW[k] = pBatMeas;
      series.P_gen_true_kW[k] = pGen;
      series.P_gen_meas_kW[k] = pGen;
      series.P_load_demand_kW[k] = demand;
      series.P_load_served_kW[k] = demand;
      series.V_bus_V[k] = 400;
      series.SOC_true_pct[k] = soc0 - (V * intI) / (CAP_KWH * 3600) * 100;
      series.SOC_est_pct[k] = soc0 - (V * intI + V * intB) / (CAP_KWH * 3600) * 100;
      series.r_true_kW[k] = pGen + pBat - demand;
      series.r_meas_kW[k] = pGen + pBatMeas - demand;
    }

    record(0);
    for (var k = 1; k <= n; k++) {
      for (var j = 0; j < SUB; j++) {
        var time = (k - 1) * SUB * DT_INT + j * DT_INT;
        var b = bAt(time);
        var demand = demandAt(time);
        intDemand += demand * DT_INT;
        intB += b * DT_INT;
        if (isLoad) {
          var genStep = foStep(P_gen, demand - V * I_ref, 2.0, DT_INT);
          P_gen = genStep.y;
          intPgen += genStep.integral;
        } else {
          var controlTarget = I_ref - (monitor ? 0 : b);
          var target = controlTarget;
          if (isAct && time >= tStart - 1e-9) target = Math.min(controlTarget, I_cap);
          var step = foStep(I_true, target, isAct ? 0.4 : 1.5, DT_INT);
          I_true = step.y;
          intI += step.integral;
        }
      }
      if (isLoad) intI = (intDemand - intPgen) / V;
      record(k);
    }
    var intPbat = isLoad ? (intDemand - intPgen) : V * intI;
    return {
      series: series,
      integrals: {
        E_load: intDemand,
        E_source: intDemand - intPbat,
        E_bat: intPbat,
        E_bat_meas: intPbat + V * intB,
        intI: intI,
        intB: intB
      }
    };
  }

  /* ---------------- FC-001 燃料电池 ---------------- */
  function simulateFC001(system, cfg, t) {
    var n = t.length - 1;
    var dt = cfg.dt_s;
    var V = 0.4;
    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var magnitude = faulted ? cfg.fault.params.magnitude : 0;
    var monitor = cfg.feedback_mode === 'monitor';
    var load0 = cfg.initial.load_kW;
    var soc0 = cfg.initial.SOC_pct;
    var P_bat_ref = 10;
    var I_fc_base = (load0 - P_bat_ref) / V;
    var isSensor = family === 'sensor_drift';
    var isLoad = family === 'load_step';
    var isAct = family === 'actuator_fault';
    var I_fc_cap = isAct ? I_fc_base * magnitude / 100 : null;

    function bAt(time) { return (isSensor && tStart != null && time >= tStart - 1e-9) ? magnitude : 0; }
    function demandAt(time) { return (isLoad && tStart != null && time >= tStart - 1e-9) ? load0 + magnitude : load0; }

    var series = makeSeries(system, n);
    var I_fc = I_fc_base;
    var I_fc_ref = I_fc_base;
    var intIfc = 0;
    var intB = 0;
    var intDemand = 0;

    function record(k) {
      var time = t[k];
      var b = bAt(time);
      var demand = demandAt(time);
      var iMeas = I_fc + b;
      var pFc = V * I_fc;
      var pFcMeas = V * iMeas;
      var pBat = demand - pFc;
      var pBatEst = demand - pFcMeas;
      series.I_fc_true_A[k] = I_fc;
      series.I_fc_meas_A[k] = iMeas;
      series.I_fc_ref_A[k] = I_fc_ref;
      series.bias_A[k] = b;
      series.I_fc_cap_A[k] = (isAct && time >= tStart - 1e-9) ? I_fc_cap : null;
      series.P_fc_true_kW[k] = pFc;
      series.P_fc_meas_kW[k] = pFcMeas;
      series.I_bat_true_A[k] = pBat / V;
      series.I_bat_meas_A[k] = pBat / V;
      series.P_bat_true_kW[k] = pBat;
      series.P_bat_meas_kW[k] = pBat;
      series.P_bat_est_kW[k] = pBatEst;
      series.P_load_demand_kW[k] = demand;
      series.P_load_served_kW[k] = demand;
      series.V_bus_V[k] = 400;
      series.SOC_true_pct[k] = soc0 - (intDemand - V * intIfc) / (CAP_KWH * 3600) * 100;
      series.SOC_est_pct[k] = soc0 - (intDemand - V * intIfc - V * intB) / (CAP_KWH * 3600) * 100;
      series.r_true_kW[k] = pFc + pBat - demand;
      series.r_meas_kW[k] = pFcMeas + pBat - demand;
      series.valve_cmd_pct[k] = 100;
      series.valve_meas_pct[k] = (isAct && time >= tStart - 1e-9) ? magnitude : 100;
    }

    record(0);
    for (var k = 1; k <= n; k++) {
      for (var j = 0; j < SUB; j++) {
        var time = (k - 1) * SUB * DT_INT + j * DT_INT;
        var b = bAt(time);
        var demand = demandAt(time);
        intDemand += demand * DT_INT;
        intB += b * DT_INT;
        if (isLoad) {
          var refStep = foStep(I_fc_ref, (demand - P_bat_ref) / V, 2.5, DT_INT);
          I_fc_ref = refStep.y;
        }
        var target;
        if (isAct) target = (tStart != null && time >= tStart - 1e-9) ? Math.min(I_fc_ref, I_fc_cap) : I_fc_ref;
        else if (isSensor && !monitor) target = I_fc_ref - b;
        else target = I_fc_ref;
        var step = foStep(I_fc, target, isAct ? 1.5 : 1.2, DT_INT);
        I_fc = step.y;
        intIfc += step.integral;
      }
      record(k);
    }
    return {
      series: series,
      integrals: {
        E_load: intDemand,
        E_source: V * intIfc,
        E_bat: intDemand - V * intIfc,
        E_bat_est: intDemand - V * (intIfc + intB),
        intB: intB
      }
    };
  }

  /* ---------------- GT-001 燃气涡轮 ---------------- */
  function simulateGT001(system, cfg, t) {
    var n = t.length - 1;
    var dt = cfg.dt_s;
    var KJ = 5.0;
    var K_bat = 24;
    var P_bat_ref = 5;
    var Ki = 2.0;
    var tau_g = 2.0;
    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var magnitude = faulted ? cfg.fault.params.magnitude : 0;
    var monitor = cfg.feedback_mode === 'monitor';
    var load0 = cfg.initial.load_kW;
    var soc0 = cfg.initial.SOC_pct;
    var isSensor = family === 'sensor_drift';
    var isLoad = family === 'load_step';
    var isAct = family === 'actuator_fault';
    var P_gen_cap = isAct ? 40 * magnitude / 100 : null;

    function bAt(time) { return (isSensor && tStart != null && time >= tStart - 1e-9) ? magnitude : 0; }
    function demandAt(time) { return (isLoad && tStart != null && time >= tStart - 1e-9) ? load0 + magnitude : load0; }

    var series = makeSeries(system, n);
    var f = 50;
    var P_gen = 25;
    var P_gen_cmd = 25;
    var intPbat = 0;
    var intPgen = 0;
    var intDemand = 0;
    var intResidual = 0;

    function record(k) {
      var time = t[k];
      var b = bAt(time);
      var demand = demandAt(time);
      var pBat = P_bat_ref - K_bat * (f - 50);
      var pRotor = P_gen + pBat - demand;
      series.f_true_Hz[k] = f;
      series.f_meas_Hz[k] = f;
      series.n_meas_rpm[k] = 60 * (f + b);
      series.P_gen_true_kW[k] = P_gen;
      series.P_gen_meas_kW[k] = P_gen;
      series.P_gen_cmd_kW[k] = P_gen_cmd;
      series.P_bat_true_kW[k] = pBat;
      series.P_bat_meas_kW[k] = pBat;
      series.P_load_demand_kW[k] = demand;
      series.P_load_served_kW[k] = demand;
      series.P_rotor_kW[k] = pRotor;
      series.V_bus_V[k] = 400;
      series.SOC_true_pct[k] = soc0 - intPbat / (CAP_KWH * 3600) * 100;
      series.SOC_est_pct[k] = soc0 - intPbat / (CAP_KWH * 3600) * 100;
      series.r_true_kW[k] = P_gen + pBat - demand - pRotor;
      series.r_meas_kW[k] = P_gen + pBat - demand - pRotor;
      series.valve_cmd_pct[k] = clamp(P_gen_cmd / 40 * 100, 0, 100);
      series.valve_meas_pct[k] = (isAct && time >= tStart - 1e-9) ? magnitude : series.valve_cmd_pct[k];
      series.P_gen_cap_kW[k] = (isAct && time >= tStart - 1e-9) ? P_gen_cap : null;
    }

    record(0);
    for (var k = 1; k <= n; k++) {
      for (var j = 0; j < SUB; j++) {
        var time = (k - 1) * SUB * DT_INT + j * DT_INT;
        var b = bAt(time);
        var demand = demandAt(time);
        var pBat = P_bat_ref - K_bat * (f - 50);
        var residual = P_gen + pBat - demand;

        var fGov = (monitor && isSensor) ? f : f + b;
        var cmdNext = clamp(P_gen_cmd + Ki * (50 - fGov) * DT_INT, 0, 40);
        var genStep = foStep(P_gen, cmdNext, tau_g, DT_INT);
        var genBefore = P_gen;
        P_gen = genStep.y;
        if (isAct && tStart != null && time >= tStart - 1e-9) P_gen = Math.min(P_gen, P_gen_cap);

        f += residual / KJ * DT_INT;

        var pbatEnd = P_bat_ref - K_bat * (f - 50);
        intPgen += 0.5 * (genBefore + P_gen) * DT_INT;
        intPbat += 0.5 * (pBat + pbatEnd) * DT_INT;
        intDemand += demand * DT_INT;
        intResidual += residual * DT_INT;
        P_gen_cmd = cmdNext;
      }
      record(k);
    }
    return {
      series: series,
      integrals: {
        E_load: intDemand,
        E_source: intPgen,
        E_bat: intPbat,
        E_rotor: KJ * (f - 50),
        intResidual: intResidual
      }
    };
  }

  /* ================================================================== */
  /* 观测噪声（仅 OBSERVATION 通道，确定性；默认关闭）                     */
  /* ================================================================== */
  function applyNoise(system, cfg, series) {
    var noise = cfg.noise;
    if (!noise || !noise.enabled || !(noise.level > 0)) return;
    var seed = noise.seed;
    var level = noise.level;

    system.signals.forEach(function (sg) {
      if (sg.sourceKind !== 'OBSERVATION') return;
      if (!(sg.noiseSigma > 0)) return;
      var arr = series[sg.id];
      if (!arr) return;
      for (var k = 0; k < arr.length; k++) {
        if (arr[k] === null) continue;
        arr[k] = arr[k] + level * sg.noiseSigma * FL.rng.noiseAt(seed, sg.id, k);
      }
    });

    var k;
    if (system.id === 'FL-001') {
      for (k = 0; k < series.I_bat_meas_A.length; k++) {
        series.P_bat_meas_kW[k] = 0.4 * series.I_bat_meas_A[k];
        series.r_meas_kW[k] = series.P_gen_true_kW[k] + series.P_bat_meas_kW[k] - series.P_load_served_kW[k];
      }
    } else if (system.id === 'FC-001') {
      for (k = 0; k < series.I_fc_meas_A.length; k++) {
        series.P_fc_meas_kW[k] = 0.4 * series.I_fc_meas_A[k];
        series.P_bat_meas_kW[k] = 0.4 * series.I_bat_meas_A[k];
        series.P_bat_est_kW[k] = series.P_load_demand_kW[k] - series.P_fc_meas_kW[k];
        series.r_meas_kW[k] = series.P_fc_meas_kW[k] + series.P_bat_meas_kW[k] - series.P_load_served_kW[k];
      }
    } else if (system.id === 'GT-001') {
      for (k = 0; k < series.f_meas_Hz.length; k++) {
        series.r_meas_kW[k] = series.P_gen_meas_kW[k] + series.P_bat_meas_kW[k] - series.P_load_served_kW[k] - series.P_rotor_kW[k];
      }
    }
  }

  /* ================================================================== */
  /* 事件 / 快照 / 真值                                                  */
  /* ================================================================== */
  var EVENT_TYPE = { sensor_drift: 'sensor_bias', load_step: 'load_step', actuator_fault: 'actuator_limit' };
  var TARGET_SIGNAL = {
    'FL-001': { sensor_drift: 'bias_A', load_step: 'P_load_demand_kW', actuator_fault: 'I_bat_cap_A' },
    'FC-001': { sensor_drift: 'bias_A', load_step: 'P_load_demand_kW', actuator_fault: 'I_fc_cap_A' },
    'GT-001': { sensor_drift: 'n_meas_rpm', load_step: 'P_load_demand_kW', actuator_fault: 'P_gen_cap_kW' }
  };

  function buildLabel(system, cfg) {
    var mode = cfg.feedback_mode === 'monitor' ? '仅监测' : '闭环';
    if (cfg.fault.family === 'none') return mode + ' · 无故障基准';
    var def = findFaultDef(system, cfg.fault.family);
    var p = def && def.params[0] ? def.params[0] : { unit: '', precision: 0 };
    return mode + ' · ' + (def ? def.shortLabel : '故障') + ' ' + formatAmount(cfg.fault.params.magnitude, p) +
      ' @' + Number(cfg.fault.t_start_s).toFixed(1) + 's';
  }

  function buildRole(cfg) {
    if (cfg.fault.family === 'none') return 'baseline';
    if (cfg.feedback_mode === 'monitor') return 'contrast';
    return 'fault';
  }

  function buildEvents(system, cfg, t, series) {
    var family = cfg.fault.family;
    if (family === 'none') return [];
    var def = findFaultDef(system, family);
    var p = def && def.params[0] ? def.params[0] : { unit: '', precision: 0 };
    var target = def ? def.target : 'none';
    var comp = findComponent(system, target);
    var tStart = cfg.fault.t_start_s;
    var magText = formatAmount(cfg.fault.params.magnitude, p);
    var targetSignal = (TARGET_SIGNAL[system.id] && TARGET_SIGNAL[system.id][family]) || 'P_load_demand_kW';
    var label = (def ? def.label : '故障') + ' ' + magText + ' @ ' + tStart.toFixed(1) + ' s';
    return [{
      event_id: 'EV-001',
      event_type: EVENT_TYPE[family] || 'fault',
      trigger_s: tStart,
      target_signal: targetSignal,
      target_component: target,
      magnitude: cfg.fault.params.magnitude,
      unit: p.unit,
      phase: 'onset',
      label: label,
      description: def ? def.description : '',
      target_component_label: comp ? comp.label : target,
      preSnapshotId: 'EV-001-pre',
      postSnapshotId: 'EV-001-post'
    }];
  }

  /* 事件快照（DATA_CONTRACT_SPEC §2.5 / G0-DEC-05 / B01）：
     pre = 事件时刻 t_f 的左极限（t_s 恒为 t_f=20.0，derivation='left_limit'），
     post = t_f 的右极限/采样行（derivation='post_sample'）。19.9 只是上一常规采样点，
     其值不得写入 pre.t_s。对 FL-001 三个故障族，事件前区间 [t_f−dt, t_f) 内信号恒定，
     左极限值等于上一采样行值，故 pre.variables 取自 iPre 行、t_s 仍为 t_f。 */
  function buildSnapshots(system, cfg, t, series, events) {
    if (!events.length) return [];
    var ev = events[0];
    var dt = cfg.dt_s;
    var tF = ev.trigger_s;
    var iPre = clamp(Math.round((tF - dt) / dt), 0, t.length - 1);
    var iPost = clamp(Math.round(tF / dt), 0, t.length - 1);
    var units = {};
    system.signals.forEach(function (sg) { units[sg.id] = sg.unit || ''; });
    function varsAt(idx) {
      var out = {};
      system.signals.forEach(function (sg) { out[sg.id] = series[sg.id] ? series[sg.id][idx] : null; });
      return out;
    }
    function preSnapshot() {
      var snap = {
        snapshot_id: ev.preSnapshotId,
        snapshotId: ev.preSnapshotId,
        event_id: ev.event_id,
        phase: 'pre',
        t_s: tF,
        derivation: 'left_limit',
        variables: varsAt(iPre),
        units: deepClone(units),
        fault_id: cfg.fault.faultId || null
      };
      return snap;
    }
    function postSnapshot() {
      return {
        snapshot_id: ev.postSnapshotId,
        snapshotId: ev.postSnapshotId,
        event_id: ev.event_id,
        phase: 'post',
        t_s: tF,
        derivation: 'post_sample',
        variables: varsAt(iPost),
        units: deepClone(units),
        fault_id: cfg.fault.faultId || null
      };
    }
    return [preSnapshot(), postSnapshot()];
  }

  function buildTruth(system, cfg) {
    var family = cfg.fault.family;
    if (family === 'none') {
      return {
        faultFamily: 'none', faultId: null, faultActiveFrom_s: null, faultDuration_s: 0,
        peakMagnitude: 0, unit: '', effectiveFeedbackMode: 'healthy', affectedComponent: 'none'
      };
    }
    var def = findFaultDef(system, family);
    var p = def && def.params[0] ? def.params[0] : { unit: '' };
    return {
      faultFamily: family,
      faultId: cfg.fault.faultId,
      faultActiveFrom_s: cfg.fault.t_start_s,
      faultDuration_s: roundTo(cfg.duration_s - cfg.fault.t_start_s, 6),
      peakMagnitude: cfg.fault.params.magnitude,
      unit: p.unit,
      effectiveFeedbackMode: cfg.feedback_mode,
      affectedComponent: def ? def.target : 'none'
    };
  }

  /* ================================================================== */
  /* 因果链生成（模板来自 systems.js，数值证据来自 run）                    */
  /* 每条因果断言绑定 rule_id + 证据（D-06 / DATA_CONTRACT_SPEC §2.8）。    */
  /* ================================================================== */
  var CAUSAL_RULE_VERSION = 'cr.fl001.v1';

  function interpolate(template, facts) {
    if (typeof template !== 'string') return '';
    return template.replace(/\{([A-Za-z0-9_]+)\}/g, function (m, key) {
      var v = facts[key];
      return v === undefined || v === null ? '—' : String(v);
    });
  }

  function buildCausalFacts(ctx) {
    var system = ctx.system;
    var cfg = ctx.config;
    var series = ctx.series;
    var t = ctx.t;
    var metrics = ctx.metrics;
    var dt = cfg.dt_s;
    var dur = cfg.duration_s;
    var tStart = cfg.fault.t_start_s;
    var family = cfg.fault.family;
    var def = findFaultDef(system, family);
    var param = def && def.params[0] ? def.params[0] : { unit: '', precision: 0 };
    var mag = cfg.fault.params.magnitude;
    var comp = findComponent(system, def ? def.target : '');

    function idxAt(time) { return clamp(Math.round(time / dt), 0, t.length - 1); }
    function at(id, time, precision) {
      var arr = series[id];
      if (!arr) return '—';
      return fmtVal(arr[idxAt(time)], precision);
    }
    function rangeValues(id, fromTime, toTime) {
      var arr = series[id];
      if (!arr) return null;
      var i0 = idxAt(fromTime);
      var i1 = idxAt(toTime);
      var min = Infinity;
      var max = -Infinity;
      for (var i = i0; i <= i1; i++) {
        var v = arr[i];
        if (v === null || !isFinite(v)) continue;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (!isFinite(min) || !isFinite(max)) return null;
      return { min: min, max: max };
    }
    function metricVal(id) {
      var m = findMetricAny(metrics, id);
      if (!m || m.unavailable || m.value === null || m.value === undefined) return null;
      return m.value;
    }
    function metricFmt(id, precision) {
      var v = metricVal(id);
      return v === null ? '—' : fmtVal(v, precision);
    }
    function maxAbsFrom(id, fromTime) {
      var r = rangeValues(id, fromTime, dur);
      return r ? Math.max(Math.abs(r.min), Math.abs(r.max)) : null;
    }

    var facts = {
      t0: Number(tStart).toFixed(1),
      mag: formatMagnitude(mag, param.precision),
      unit: param.unit || '',
      sign: mag >= 0 ? '+' : '',
      faultLabel: def ? def.label : '故障',
      targetComponent: comp ? comp.label : (def ? def.target : '—')
    };

    if (system.id === 'FL-001') {
      var P_cap = Math.max(0, cfg.initial.load_kW);
      facts.I_meas_pre = at('I_bat_meas_A', tStart - 0.1, 2);
      facts.I_meas_post = at('I_bat_meas_A', tStart, 2);
      facts.I_true_post = at('I_bat_true_A', tStart, 2);
      facts.I_meas_26 = at('I_bat_meas_A', tStart + 6, 2);
      facts.I_true_26 = at('I_bat_true_A', tStart + 6, 2);
      facts.I_true_60 = at('I_bat_true_A', dur, 2);
      facts.I_ref = at('I_ref_A', tStart + 1, 2);
      facts.I_target = family === 'sensor_drift' ? fmtVal((P_cap - 20) / 0.4 - mag, 2) : at('I_ref_A', tStart + 1, 2);
      facts.P_bat_20 = at('P_bat_true_kW', tStart, 2);
      facts.P_bat_60 = at('P_bat_true_kW', dur, 2);
      facts.P_gen_20 = at('P_gen_true_kW', tStart, 2);
      facts.P_gen_60 = at('P_gen_true_kW', dur, 2);
      facts.P_load_60 = at('P_load_demand_kW', dur, 2);
      facts.P_load_pre = at('P_load_demand_kW', tStart - 0.1, 2);
      facts.P_load_post = at('P_load_demand_kW', tStart, 2);
      facts.r_meas_peak = fmtVal(maxAbsFrom('r_meas_kW', tStart), 2);
      facts.r_true_max = fmtVal(maxAbsFrom('r_true_kW', 0), 2);
      facts.E_bat = metricFmt('E_bat_kWh', 5);
      facts.E_gen = metricFmt('E_source_kWh', 5);
      facts.E_load = metricFmt('E_load_kWh', 5);
      facts.SOC_err = metricFmt('SOC_err_pp', 5);
      var iPk = rangeValues('I_bat_true_A', tStart, dur);
      facts.I_peak = iPk ? fmtVal(iPk.max, 2) : '—';
      var capVal = family === 'actuator_fault' ? null : null;
      facts.I_cap = at('I_bat_cap_A', dur, 2);
      if (facts.I_cap === '—' && family === 'actuator_fault') facts.I_cap = fmtVal(((P_cap - 20) / 0.4) * mag / 100, 2);
      void capVal;
      void facts.P_gen_20;
    } else if (system.id === 'FC-001') {
      facts.I_fc_meas_pre = at('I_fc_meas_A', tStart - 0.1, 2);
      facts.I_fc_meas_post = at('I_fc_meas_A', tStart, 2);
      facts.I_fc_pre = at('I_fc_true_A', tStart, 2);
      facts.I_fc_ref = at('I_fc_ref_A', tStart + 1, 2);
      facts.I_fc_target = fmtVal(Number(facts.I_fc_ref) - mag, 2);
      facts.I_fc_true_60 = at('I_fc_true_A', dur, 2);
      facts.P_fc_60 = at('P_fc_true_kW', dur, 2);
      facts.P_bat_60 = at('P_bat_true_kW', dur, 2);
      facts.I_bat_60 = at('I_bat_true_A', dur, 2);
      facts.I_fc_ref_60 = at('I_fc_ref_A', dur, 2);
      facts.I_fc_cap = at('I_fc_cap_A', Math.max(tStart + 0.1, 0), 2);
      if (facts.I_fc_cap === '—' && family === 'actuator_fault') facts.I_fc_cap = fmtVal(50 * mag / 100, 2);
      facts.r_meas_peak = fmtVal(maxAbsFrom('r_meas_kW', tStart), 2);
      facts.r_true_max = fmtVal(maxAbsFrom('r_true_kW', 0), 2);
      facts.E_load = metricFmt('E_load_kWh', 5);
      facts.E_fc = metricFmt('E_source_kWh', 5);
      facts.E_bat = metricFmt('E_bat_kWh', 5);
      facts.SOC_err = metricFmt('SOC_err_pp', 5);
      facts.valve_cmd = at('valve_cmd_pct', dur, 0);
      facts.valve_meas = at('valve_meas_pct', dur, 0);
      facts.valve_meas_pre = at('valve_meas_pct', tStart - 0.1, 0);
      facts.P_load_pre = at('P_load_demand_kW', tStart - 0.1, 2);
      facts.P_load_post = at('P_load_demand_kW', tStart, 2);
    } else if (system.id === 'GT-001') {
      facts.n_rpm = formatMagnitude(mag * 60, 1);
      facts.f_gov_post = fmtVal(50 + mag, 1);
      facts.f_meas_pre = at('f_meas_Hz', tStart - 0.1, 1);
      facts.f_true_60 = at('f_true_Hz', dur, 2);
      facts.P_bat_60 = at('P_bat_true_kW', dur, 2);
      facts.P_gen_60 = at('P_gen_true_kW', dur, 2);
      facts.P_load_60 = at('P_load_demand_kW', dur, 2);
      facts.P_load_pre = at('P_load_demand_kW', tStart - 0.1, 2);
      facts.P_load_post = at('P_load_demand_kW', tStart, 2);
      facts.r_meas_peak = fmtVal(maxAbsFrom('r_meas_kW', 0), 2);
      facts.r_true_max = fmtVal(maxAbsFrom('r_true_kW', 0), 2);
      var fRange = rangeValues('f_true_Hz', tStart, dur);
      facts.f_nadir = fRange ? fmtVal(fRange.min, 2) : '—';
      facts.f_nadir_dev = fRange ? fmtVal(fRange.min - 50, 2) : '—';
      var pbatRange = rangeValues('P_bat_true_kW', tStart, dur);
      facts.P_bat_peak = pbatRange ? fmtVal(pbatRange.max, 2) : '—';
      facts.f_recovery = metricFmt('f_recovery_s', 1);
      facts.valve_cmd = at('valve_cmd_pct', dur, 1);
      facts.valve_meas = at('valve_meas_pct', dur, 0);
      facts.P_gen_cap = family === 'actuator_fault' ? fmtVal(40 * mag / 100, 1) : '—';
      facts.E_load = metricFmt('E_load_kWh', 5);
      facts.E_gen = metricFmt('E_source_kWh', 5);
      facts.E_bat = metricFmt('E_bat_kWh', 5);
      facts.E_rotor = metricFmt('E_rotor_kWh', 5);
    }
    return facts;
  }

  function resolveAssumptions(system, ids) {
    var list = [];
    (ids || []).forEach(function (idOrText) {
      var found = null;
      (system.model.assumptions || []).forEach(function (a) { if (a.id === idOrText) found = a; });
      list.push(found ? (found.id + '：' + found.text) : String(idOrText));
    });
    return list;
  }

  function buildMonitorContrast(system, cfg, facts) {
    if (cfg.fault.family !== 'sensor_drift') return null;
    if (cfg.feedback_mode === 'monitor') {
      return { description: '本次为仅监测运行：偏置不进入物理回路，真实状态保持基准值，只有测量通道与基于测量的估计偏移。' };
    }
    var map = {
      'FL-001': '仅监测模式下真实电池电流保持 25 A，测量电流仍从 20.0 s 起偏高 {mag} {unit}，SOC 估计偏差与闭环故障相同，但没有真实电流下降。',
      'FC-001': '仅监测模式下电堆真实电流保持 50 A、电池功率保持 10 kW，测量电流仍偏高 {mag} {unit}，SOC 估计偏差不变。',
      'GT-001': '仅监测模式下真实频率保持 50 Hz，转速通道读数仍偏高 {mag} {unit}（{n_rpm} rpm），但调速器使用健康频率，因此真实状态不变。'
    };
    return { description: interpolate(map[system.id] || '仅监测模式下真实状态保持不变，只有测量通道偏移。', facts) };
  }

  function buildCausal(ctx) {
    var system = ctx.system;
    var cfg = ctx.config;
    var family = cfg.fault.family;
    var assumptionsAll = (system.model.assumptions || []).map(function (a) { return a.id + '：' + a.text; });
    var limitationsAll = (system.model.limitations || []).slice();
    if (family === 'none') {
      return {
        rule_version: CAUSAL_RULE_VERSION,
        focusEventId: null,
        headline: '本次运行未注入故障（健康基准）',
        mechanismSummary: '健康运行没有故障事件，因此不存在可推导的故障因果链；此处只列出适用假设与限制。',
        nodes: [],
        edges: [],
        assumptions: assumptionsAll,
        limitations: limitationsAll,
        alternatives: [],
        monitorContrast: null
      };
    }
    var tpl = system.causalTemplates && system.causalTemplates[family];
    if (!tpl) {
      return {
        rule_version: CAUSAL_RULE_VERSION,
        focusEventId: ctx.events.length ? ctx.events[0].event_id : null,
        headline: 't=' + Number(cfg.fault.t_start_s).toFixed(1) + ' s，' + (findFaultDef(system, family) || {}).label,
        mechanismSummary: '该故障家族尚未定义模型因果模板，本模型无法推导该现象。',
        nodes: [], edges: [], assumptions: assumptionsAll, limitations: limitationsAll,
        alternatives: [], monitorContrast: null
      };
    }
    var facts = buildCausalFacts(ctx);
    var useMonitor = cfg.feedback_mode === 'monitor' && Array.isArray(tpl.monitorNodes) && tpl.monitorNodes.length > 0;
    var nodeSpecs = useMonitor ? tpl.monitorNodes : tpl.nodes;
    var edgeSpecs = useMonitor ? (tpl.monitorEdges || []) : (tpl.edges || []);
    var dt = cfg.dt_s;
    var dur = cfg.duration_s;
    var tStart = cfg.fault.t_start_s;

    function idxAt(time) { return clamp(Math.round(time / dt), 0, ctx.t.length - 1); }

    var nodes = nodeSpecs.map(function (spec) {
      var ruleId = 'CR-' + system.id.replace(/-/g, '') + '-' + family + '-' + (tpl.id || 'rule') + '-' + spec.id;
      var evidence = (spec.evidence || []).map(function (ev) {
        var meta = signalMeta(system, ev.varId);
        var precision = meta ? meta.precision : 3;
        var unit = meta ? meta.unit : '';
        var t0 = clamp(tStart + (ev.tStartOffset || 0), 0, dur);
        var t1 = clamp(tStart + (ev.tEndOffset || 0), 0, dur);
        var arr = ctx.series[ev.varId];
        var v0 = arr ? arr[idxAt(t0)] : null;
        var v1 = arr ? arr[idxAt(t1)] : null;
        var note = interpolate(ev.note, facts);
        note += '（实测 ' + fmtVal(v0, precision) + ' → ' + fmtVal(v1, precision) + (unit ? ' ' + unit : '') + '）';
        return {
          runId: ctx.runId,
          run_id: ctx.runId,
          varId: ev.varId,
          signal_id: ev.varId,
          t0: roundTime(t0),
          t1: roundTime(t1),
          time_window_s: [roundTime(t0), roundTime(t1)],
          rule_id: ruleId,
          layer: spec.layer === 'config' ? 'CONFIG_FACT' : (spec.layer === 'mechanism' ? 'MODEL_MECHANISM' : 'OBSERVED_NUMERIC'),
          note: note,
          values: { t0: v0, t1: v1 }
        };
      });
      return {
        id: spec.id,
        node_id: spec.id,
        order: spec.order,
        rule_id: ruleId,
        title: interpolate(spec.title, facts),
        short: interpolate(spec.short, facts),
        detail: interpolate(spec.detail, facts),
        layer: spec.layer,
        componentId: spec.componentId,
        signalIds: (spec.signalIds || []).slice(),
        evidence: evidence
      };
    });

    var edges = edgeSpecs.map(function (e) {
      return { from: e.from, to: e.to, label: interpolate(e.label, facts) };
    });

    var alternatives = (tpl.alternatives || []).map(function (a) {
      return { title: interpolate(a.title, facts), text: interpolate(a.text, facts) };
    });

    return {
      rule_version: CAUSAL_RULE_VERSION,
      focusEventId: ctx.events.length ? ctx.events[0].event_id : null,
      headline: interpolate(tpl.headline, facts),
      mechanismSummary: interpolate(tpl.mechanismSummary, facts),
      nodes: nodes,
      edges: edges,
      assumptions: resolveAssumptions(system, tpl.assumptions),
      limitations: (tpl.limitations || []).slice(),
      alternatives: alternatives,
      monitorContrast: buildMonitorContrast(system, cfg, facts)
    };
  }

  /* ================================================================== */
  /* 公共 API：simulate                                                  */
  /* ================================================================== */
  function simulate(config, opts) {
    opts = opts || {};
    if (!isPlainObject(config) || !config.systemId) {
      throw makeConfigError([{ field: 'systemId', message: '缺少 systemId' }]);
    }
    var system = rawSystem(config.systemId);
    if (!system) {
      throw makeConfigError([{ field: 'systemId', message: '未知系统 ' + String(config.systemId) }]);
    }
    var cfg = normalizeConfig(system, deepMerge(defaultConfigFor(system), config));
    var validation = validateConfig(cfg);
    if (!validation.ok) throw makeConfigError(validation.errors);

    /* config_hash 按契约 §2.1 的 ScenarioConfig 投影计算（键排序、默认值填充、最短往返） */
    var configHash = (FL.contract && FL.contract.scenarioView)
      ? core.hashObject(FL.contract.scenarioView(cfg))
      : core.hashObject(cfg);
    var manifest = modelManifest(system.id);
    var modelHash = manifest.model_hash;

    var t = buildTimeGrid(cfg);
    var sim;
    if (system.id === 'FL-001') sim = simulateFL001(system, cfg, t);
    else if (system.id === 'FC-001') sim = simulateFC001(system, cfg, t);
    else sim = simulateGT001(system, cfg, t);

    var series = sim.series;
    applyNoise(system, cfg, series);

    var runId = opts.runId || ('Run-' + String(++_runSeq).padStart(3, '0'));
    var role = opts.role || buildRole(cfg);
    var label = opts.label || buildLabel(system, cfg);
    var createdAt = opts.createdAt || isoLocalNow();

    var events = buildEvents(system, cfg, t, series);
    var snapshots = buildSnapshots(system, cfg, t, series, events);
    var truth = buildTruth(system, cfg);

    var metrics = FL.core.metrics.compute({
      system: system,
      systemId: system.id,
      config: cfg,
      t: t,
      series: series,
      integrals: sim.integrals || null,
      runId: runId
    });

    var quality = FL.core.checks.evaluate({
      system: system,
      systemId: system.id,
      config: cfg,
      t: t,
      series: series,
      metrics: metrics,
      events: events,
      snapshots: snapshots,
      truth: truth,
      runId: runId
    });

    var causal = buildCausal({
      system: system,
      config: cfg,
      t: t,
      series: series,
      metrics: metrics,
      events: events,
      runId: runId
    });

    return {
      runId: runId,
      runShortHash: configHash.slice(0, 8),
      systemId: system.id,
      label: label,
      role: role,
      createdAt: createdAt,
      status: 'completed',
      config: deepClone(cfg),
      configHash: configHash,
      modelHash: modelHash,
      engineVersion: ENGINE_VERSION,
      modelManifest: deepClone(manifest),
      signals: deepClone(system.signals),
      timeseries: { t: t, signals: series },
      events: events,
      snapshots: snapshots,
      metrics: metrics,
      quality: quality,
      causal: causal,
      truth: truth
    };
  }

  /* ================================================================== */
  /* 采样 / 切片 / 指标读取                                              */
  /* ================================================================== */
  function sampleAt(run, signalId, time) {
    if (!run || !run.timeseries || !run.timeseries.signals) throw new Error('FL.core.sampleAt：无效 run');
    var arr = run.timeseries.signals[signalId];
    if (!arr) throw new Error('FL.core.sampleAt：未知信号 ' + signalId);
    var ts = run.timeseries.t;
    var dt = run.config.dt_s;
    var idx = clamp(Math.round(time / dt), 0, arr.length - 1);
    return { value: arr[idx], index: idx, t: ts[idx] };
  }

  function sampleAll(run, time, options) {
    options = options || {};
    var out = {};
    if (!run || !run.timeseries) return out;
    var categories = options.categories || null;
    var visible = options.visible || null;
    var dt = run.config.dt_s;
    var idx = clamp(Math.round(time / dt), 0, run.timeseries.t.length - 1);
    (run.signals || []).forEach(function (sg) {
      if (categories && categories.indexOf(sg.category) === -1) return;
      if (visible && visible[sg.id] === false) return;
      var arr = run.timeseries.signals[sg.id];
      out[sg.id] = arr ? arr[idx] : null;
    });
    return out;
  }

  function slice(run, signalId, t0, t1, options) {
    options = options || {};
    if (!run || !run.timeseries || !run.timeseries.signals[signalId]) {
      throw new Error('FL.core.slice：未知信号 ' + signalId);
    }
    var ts = run.timeseries.t;
    var arr = run.timeseries.signals[signalId];
    var dt = run.config.dt_s;
    var i0 = clamp(Math.round(t0 / dt), 0, ts.length - 1);
    var i1 = clamp(Math.round(t1 / dt), 0, ts.length - 1);
    var step = Math.max(1, Math.round(options.step || 1));
    var out = [];
    if (i0 <= i1) {
      for (var i = i0; i <= i1; i += step) out.push([ts[i], arr[i]]);
    } else {
      for (var j = i0; j >= i1; j -= step) out.push([ts[j], arr[j]]);
    }
    return out;
  }

  function getMetric(run, metricId) {
    if (!run || !run.metrics) return null;
    return findMetric(run.metrics, metricId) || null;
  }

  function findEventAt(run, time) {
    if (!run || !run.events) return null;
    var dt = (run.config && run.config.dt_s) ? run.config.dt_s : 0.1;
    var tol = dt / 2 + 1e-9;
    for (var i = 0; i < run.events.length; i++) {
      if (Math.abs(run.events[i].trigger_s - time) <= tol) return run.events[i];
    }
    return null;
  }

  function makeRunId(seq) {
    return 'Run-' + String(seq).padStart(3, '0');
  }

  /* 盲测辅助：只暴露 blindVisible 信号，供 Arena / 外部 Agent 使用 */
  function blindSignals(run) {
    return (run && run.signals ? run.signals : []).filter(function (s) { return s.blindVisible === true; });
  }

  function blindSample(run, index) {
    if (!run || !run.timeseries) return { t: 0, s: {} };
    var list = blindSignals(run);
    var idx = clamp(index, 0, run.timeseries.t.length - 1);
    var out = {};
    list.forEach(function (sg) {
      var arr = run.timeseries.signals[sg.id];
      if (arr) out[sg.id] = arr[idx];
    });
    return { t: run.timeseries.t[idx], s: out };
  }

  /* ================================================================== */
  /* compareRuns                                                         */
  /* ================================================================== */
  function allEqualNumbers(a, b, tol) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      var x = a[i];
      var y = b[i];
      if (x === null || y === null || x === undefined || y === undefined) {
        if (x !== y) return false;
        continue;
      }
      if (Math.abs(x - y) > tol) return false;
    }
    return true;
  }

  function observationSignature(run) {
    return (run.signals || []).map(function (sg) {
      return sg.id + '|' + sg.unit + '|' + sg.sourceKind + '|' + sg.category;
    }).sort().join(';');
  }

  function compareRuns(baselineRun, trialRun) {
    var checks = [];
    if (!baselineRun || !trialRun) {
      return {
        valid: false,
        diffAllowed: false,
        checks: [{ id: 'runs-present', label: '运行对象完整', status: 'fail', message: '缺少 baseline 或 trial Run' }],
        pairs: [],
        findings: [],
        warnings: ['缺少 baseline 或 trial Run，无法对比']
      };
    }
    function addCheck(id, label, pass, message) {
      checks.push({ id: id, label: label, status: pass ? 'pass' : 'fail', message: message });
    }

    var sameModel = baselineRun.modelHash === trialRun.modelHash;
    addCheck('model-hash', '模型版本一致', sameModel,
      sameModel ? ('model_hash 一致（' + String(baselineRun.modelHash).slice(0, 8) + '）') : 'model_hash 不一致，禁止因果表述');
    var sameEngine = baselineRun.engineVersion === trialRun.engineVersion;
    addCheck('engine-version', '引擎版本一致', sameEngine,
      sameEngine ? ('engineVersion ' + baselineRun.engineVersion) : ('engineVersion 不一致（' + baselineRun.engineVersion + ' vs ' + trialRun.engineVersion + '）'));
    var bc = baselineRun.config || {};
    var tc = trialRun.config || {};
    var sameClock = (bc.duration_s === tc.duration_s) && (bc.dt_s === tc.dt_s) &&
      baselineRun.timeseries.t.length === trialRun.timeseries.t.length;
    addCheck('duration-dt', '时长与采样一致', sameClock,
      sameClock ? ((bc.duration_s + ' s / dt ' + bc.dt_s + ' s / ' + baselineRun.timeseries.t.length + ' 点')) : '时长、采样或点数不一致，禁止差值图');

    var sameInitial = core.canonicalize(bc.initial) === core.canonicalize(tc.initial);
    addCheck('initial-conditions', '初始条件一致', sameInitial,
      sameInitial ? ('初始条件一致（load ' + (bc.initial && bc.initial.load_kW) + ' kW, SOC ' + (bc.initial && bc.initial.SOC_pct) + '%）') : '初始条件不一致，禁止归因于故障');

    var bLoad = baselineRun.timeseries.signals.P_load_demand_kW;
    var tLoad = trialRun.timeseries.signals.P_load_demand_kW;
    var sameLoad = allEqualNumbers(bLoad, tLoad, 1e-9);
    addCheck('load-profile', '负载需求曲线一致', sameLoad,
      sameLoad ? '两个运行的负载需求曲线一致' : '负载需求曲线不一致（如 load_step），不能把差异归因于传感器/执行器故障');

    var sameObs = observationSignature(baselineRun) === observationSignature(trialRun);
    addCheck('observations', '观测定义一致', sameObs,
      sameObs ? ((baselineRun.signals || []).length + ' 个信号定义一致') : '观测信号定义（id/单位/来源）不一致，禁止差值图');

    var failed = checks.some(function (c) { return c.status === 'fail'; });
    var diffAllowed = sameClock && sameObs;

    /* 指标配对 */
    var pairs = [];
    (trialRun.metrics || []).forEach(function (tm) {
      var bm = findMetricAny(baselineRun.metrics, tm.metric_id);
      if (!bm) return;
      var delta = null;
      if (bm.value !== null && bm.value !== undefined && tm.value !== null && tm.value !== undefined &&
        typeof bm.value === 'number' && typeof tm.value === 'number') {
        delta = tm.value - bm.value;
      }
      pairs.push({ metric_id: tm.metric_id, baseline: bm, trial: tm, delta: delta, deltaUnit: tm.unit });
    });

    var findings = [];
    var warnings = [];
    checks.forEach(function (c) { if (c.status === 'fail') warnings.push(c.label + '：' + c.message); });
    if (!diffAllowed) warnings.push('单位/时间基准不兼容，已禁用差值视图。');

    function pairOf(id) {
      var ids = [id].concat(METRIC_ALIAS[id] || []);
      for (var i = 0; i < pairs.length; i++) if (ids.indexOf(pairs[i].metric_id) !== -1) return pairs[i];
      return null;
    }
    function signed(v, precision) {
      if (v === null || v === undefined) return '不可用';
      var s = fmtVal(Math.abs(v), precision);
      return (v > 0 ? '+' : (v < 0 ? '-' : '')) + s;
    }

    var pBat = pairOf('E_bat_kWh');
    if (pBat && pBat.delta !== null) {
      findings.push({
        id: 'F1',
        title: '电池真实电能变化',
        text: '试验组电池真实电能（带符号）相对基准变化 ' + signed(pBat.delta, 5) + ' kWh' +
          (pBat.delta < 0 ? '：电池真实放电减少，这部分需求由电源侧补足，不是能量损失。' : '。'),
        metric_ids: [pBat.metric_id],
        severity: 'info'
      });
    }
    var pSrc = pairOf('E_source_kWh');
    if (pSrc && pSrc.delta !== null) {
      findings.push({
        id: 'F2',
        title: '电源真实电能变化',
        text: '试验组电源真实电能相对基准变化 ' + signed(pSrc.delta, 5) + ' kWh，用于补偿电池侧的变化；总负载需求仍由两侧共同满足。',
        metric_ids: [pSrc.metric_id],
        severity: 'info'
      });
    }
    var pFocal = pairOf('focal_change');
    if (pFocal && pFocal.trial && pFocal.trial.value !== null && typeof pFocal.trial.value === 'number') {
      findings.push({
        id: 'F3',
        title: '焦点信号实际变化量',
        text: '从故障时刻起，' + (pFocal.trial.signal_label || pFocal.trial.signal_id || '焦点信号') +
          ' 的实际变化量为 ' + signed(pFocal.trial.value, 2) + ' ' + pFocal.deltaUnit + '（focal_change，可用于替代"诊断延迟"表述）。',
        metric_ids: [pFocal.trial.metric_id],
        severity: 'info'
      });
    }
    var pSocErr = pairOf('SOC_err_pp');
    if (pSocErr && pSocErr.trial && pSocErr.trial.value !== null && typeof pSocErr.trial.value === 'number' && Math.abs(pSocErr.trial.value) > 1e-6) {
      findings.push({
        id: 'F4',
        title: 'SOC 估计误差',
        text: '试验组 SOC 估计误差（估计−真实）为 ' + signed(pSocErr.trial.value, 5) + ' pp，来自测量/估计口径偏差，不代表真实能量差异。',
        metric_ids: [pSocErr.trial.metric_id],
        severity: 'info'
      });
    }
    var pRmeas = pairOf('max_abs_r_meas_kW');
    if (pRmeas && pRmeas.trial && pRmeas.trial.value !== null && typeof pRmeas.trial.value === 'number' && pRmeas.trial.value > 1e-6) {
      findings.push({
        id: 'F5',
        title: '测量一致性残差峰值',
        text: '试验组最大测量一致性残差为 ' + fmtVal(pRmeas.trial.value, 2) + ' kW，而真实守恒残差为 ' +
          fmtVal((findMetric(trialRun.metrics, 'max_abs_r_true_kW') || {}).value, 6) + ' kW；前者是测量偏差，不是实际能量损失。',
        metric_ids: [pRmeas.trial.metric_id, (findMetric(trialRun.metrics, 'max_abs_r_true_kW') || findMetric(trialRun.metrics, 'max_abs_r_true_kW') || {}).metric_id].filter(Boolean),
        severity: 'info'
      });
    }

    return {
      valid: !failed,
      diffAllowed: diffAllowed,
      checks: checks,
      pairs: pairs,
      findings: findings,
      warnings: warnings,
      baselineRunId: baselineRun.runId,
      trialRunId: trialRun.runId
    };
  }

  /* ================================================================== */
  /* fmt：优先委托 FL.protocol.fmt（Lead 提供），否则本地兜底              */
  /* ================================================================== */
  function longFmt(value, options) {
    if (FL.protocol && typeof FL.protocol.fmt === 'function') {
      try { return FL.protocol.fmt(value, options); } catch (e) { /* fall through */ }
    }
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') {
      if (!isFinite(value)) return '—';
      var precision = 2;
      if (typeof options === 'number') precision = options;
      else if (options && typeof options === 'object' && options.precision != null) precision = options.precision;
      return fmtVal(value, precision);
    }
    return String(value);
  }

  /* ================================================================== */
  /* 导出 FL.core                                                        */
  /* ================================================================== */
  core.ENGINE_VERSION = ENGINE_VERSION;
  core.simulate = simulate;
  core.createConfig = createConfig;
  core.validateConfig = validateConfig;
  core.modelManifest = modelManifest;
  core.sampleAt = sampleAt;
  core.sampleAll = sampleAll;
  core.slice = slice;
  core.getMetric = getMetric;
  core.compareRuns = compareRuns;
  core.makeRunId = makeRunId;
  core.findEventAt = findEventAt;
  core.clamp = clamp;
  core.fmt = longFmt;
  core.blindSignals = blindSignals;
  core.blindSample = blindSample;
  core.findFaultDef = function (systemId, family) {
    var s = rawSystem(systemId);
    return s ? deepClone(findFaultDef(s, family)) : null;
  };

  /* core.canonicalize / core.hashObject 由 hash.js 提供；此处兜底保证已定义 */
  if (typeof core.canonicalize !== 'function') throw new Error('FL.core.hash.js 必须先于 engine.js 加载');
})();
