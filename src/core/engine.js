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

  /* 可用系统清单（错误文案面动态派生，scenario.js knownSystemIds / teaching.js 先例同构）：
     自 systems.js 注册目录生成，与成员闸门（rawSystem）同源——注册目录演进自动跟上，
     不再维护硬编码系统名列表（V1_FACES v1.0.x 清算清单登记面；B-4 修复同款先例）。
     FL.systems 缺席（bootstrap 顺序异常）时回退三系统字面串，仅兜底、不参与正常路径。 */
  function knownSystemIdsText() {
    if (FL.systems && typeof FL.systems.list === 'function') {
      return FL.systems.list().map(function (s) { return s.id; }).join(' / ');
    }
    return 'FL-001 / FC-001 / GT-001';
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
    /* A-1 三轨扩展（GTL1_G2B_SPEC_APPROVED v1.0 §2.4 Q2/Q4 定案，CHG-20261104-12）：
       声明了 inertia_model 的系统补默认轨（GT-001 默认 = thermo，Q4 翻转定案） */
    if (system.defaults && system.defaults.inertia_model && !out.inertia_model) {
      out.inertia_model = system.defaults.inertia_model;
    }
    /* FL-001 thermal 双轨（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §2.0，CHG-20261107-01 批准）：
       声明了 thermal_model 的系统补默认轨（FL-001 默认 = off，FLTH-IMP-Q3 定案维持）；
       off 轨 cfg 值不进 scenarioView 投影/哈希（schema.js 同 inertia_model 先例），off 路径
       仿真行为零变化。 */
    if (system.defaults && system.defaults.thermal_model && !out.thermal_model) {
      out.thermal_model = system.defaults.thermal_model;
    }
    /* FC-001 电化学双轨（FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §1.1/§8 FCECH-G2b-04
       盖章双落点之一（B-7 定案），CHG-20261113-01 批准链；thermal_model 盖章块同构新行）：
       声明了 electrochem_model 的系统补默认轨（FC-001 默认 = off）。B-1(a)/B-3(a) 定案：
       缺省轨解析只在本盖章层发生（场景缺省轨不入 scenarioHash），cfg 值不进 scenarioView
       投影/哈希（schema.js 同 thermal_model 先例），off 路径仿真行为零变化。 */
    if (system.defaults && system.defaults.electrochem_model && out.electrochem_model === undefined) {
      out.electrochem_model = system.defaults.electrochem_model;
    }
    /* FL-001 容量/内阻二阶效应轨（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §1.1/§8 FLCAP-G2b-04
       盖章双落点之一（B-7 定案）——FC electrochem_model 盖章行同构新行，CHG-20261114-01 批准链）：
       声明了 capacity_model 的系统补默认轨（FL-001 默认 = off）。B-1(a) 定案：缺省轨解析只在
       本盖章层发生（场景缺省轨不入 scenarioHash），cfg 值不进 scenarioView 投影/哈希
       （schema.js 同 electrochem_model 先例——B-3(a)），off 路径仿真行为零变化。组合守卫
       （capacity_model=on 前置 thermal_model=on）在 validateConfig 枚举守卫承载（Q11 落点一）。 */
    if (system.defaults && system.defaults.capacity_model && out.capacity_model === undefined) {
      out.capacity_model = system.defaults.capacity_model;
    }

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
        /* 保留可选扩展键（如 G2b v1.1 §9 的 fault.t_clear_s——清除时刻） */
        if (fcfg.t_clear_s != null) out.fault.t_clear_s = fcfg.t_clear_s;
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
      /* 系统枚举文案动态派生（knownSystemIdsText——scenario.js:91/:168 knownSystemIds 先例复用，
         V1_FACES v1.0.x 清算项；硬编码系统名列表删除，注册目录演进自动跟上） */
      return { ok: false, errors: [{ field: 'systemId', message: '未知系统 ' + String(config.systemId) + '（可用：' + knownSystemIdsText() + '）' }], warnings: warnings };
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

    /* 惯性三轨（A-1 双轨 → L1 thermo 扩展，GTL1_G2B_SPEC_APPROVED v1.0 §2.4 Q2 定案；
       仅声明了 defaults.inertia_model 的系统） */
    if (system.defaults && system.defaults.inertia_model) {
      if (config.inertia_model !== 'swing' && config.inertia_model !== 'linear' && config.inertia_model !== 'thermo') {
        push('inertia_model', '必须为 swing / linear / thermo（当前 ' + String(config.inertia_model) + '）');
      }
    }

    /* FL-001 thermal 双轨（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §2.0，CHG-20261107-01 批准；
       仅声明了 defaults.thermal_model 的系统——FL-001，枚举 off|on，默认 off） */
    if (system.defaults && system.defaults.thermal_model) {
      if (config.thermal_model !== 'off' && config.thermal_model !== 'on') {
        push('thermal_model', '必须为 off / on（当前 ' + String(config.thermal_model) + '）');
      }
    }

    /* FC-001 电化学双轨（FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §1.1，CHG-20261113-01 批准；
       仅声明了 defaults.electrochem_model 的系统——FC-001，枚举 off|on，默认 off；
       thermal_model 分支同构） */
    if (system.defaults && system.defaults.electrochem_model) {
      if (config.electrochem_model !== 'off' && config.electrochem_model !== 'on') {
        push('electrochem_model', '必须为 off / on（当前 ' + String(config.electrochem_model) + '）');
      }
    }

    /* FL-001 容量/内阻二阶效应轨（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §1.1/§8 FLCAP-G2b-04
       Q11 落点一（双落点之一——scenario declaresCapacity 为落点二），CHG-20261114-01 批准链；
       electrochem_model 分支同构新行）：仅声明了 defaults.capacity_model 的系统——FL-001，
       枚举 off|on，默认 off。组合守卫（三元封闭路由 §4 项 10②）：capacity_model=on 前置
       thermal_model=on——(off,on) 非法组合结构化拒绝（不静默钳位，MG-IMP-Q1 reject 纪律）。 */
    if (system.defaults && system.defaults.capacity_model) {
      if (config.capacity_model !== 'off' && config.capacity_model !== 'on') {
        push('capacity_model', '必须为 off / on（当前 ' + String(config.capacity_model) + '）');
      } else if (config.capacity_model === 'on' && config.thermal_model !== 'on') {
        push('capacity_model', 'capacity_model=on 需要前置 thermal_model=on（当前 thermal_model=' +
          String(config.thermal_model) + '——(off,on) 非法组合拒绝，capacity 轨以 thermal 轨为承载前提）');
      }
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
      /* PV-001 新轨（PV001_G2B_SPEC_APPROVED v1.0 §2）：shading_step 为 PV 专属物理输入族，
         按系统显式追加；FL/FC/GT 的家族分派面零改动 */
      if (system.id === 'PV-001') allowed = allowed.concat(['shading_step']);
      /* WT-001 新轨（WT001_G2B_SPEC_APPROVED v1.0 §2.3，CHG-20261107-01 批准）：gust_step 为
         WT 专属物理输入族（阵风阶跃——环境输入侧上行阶跃，不复用 load_step/shading_step），
         按系统显式追加；FL/FC/GT/PV 的家族分派面零改动 */
      if (system.id === 'WT-001') allowed = allowed.concat(['gust_step']);
      /* MG-001 新轨（MG001_G2B_SPEC_APPROVED v1.0 §2，CHG-20261110-01 批准链）：load_step
         在基础面（MG 聚合输入阶跃——有符号域 [−10,+20] kW，Q6 定案；与 FL O-13 删除族的
         语义差异显式登记于 systems.js 目录行），shading_link/gust_link 为子轨物理联动族、
         island_event 为拓扑分断零参数族（Q2 定案，params:[] 无幅值语义），按系统显式追加；
         FL/FC/GT/PV/WT 的家族分派面零改动 */
      if (system.id === 'MG-001') allowed = allowed.concat(['shading_link', 'gust_link', 'island_event']);
      if (allowed.indexOf(fcfg.family) === -1) {
        /* 族面文案按系统派生（MG-001 四族；既有五系统消息逐字不变——PV/WT 显式追加
           不改消息面的现状 wart 沿袭，MG 新分支不扩大） */
        push('fault.family', system.id === 'MG-001'
          ? '必须为 none / load_step / shading_link / gust_link / island_event（当前 ' + String(fcfg.family) + '）'
          : '必须为 none / sensor_drift / load_step / actuator_fault（当前 ' + String(fcfg.family) + '）');
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
            /* fault.t_clear_s（可选，G2b v1.1 §9 扩展轮）：清除/重连时刻——GT-001×actuator_fault
               为执行器故障清除（清除后 P_gen_cap 释放、P_gen 回到指令跟随）；
               MG-001×island_event 为主馈线重连时刻（MG001_G2B_SPEC_APPROVED v1.0 §2.4 /
               Q1(b) 定案：脱离/重连语义由 t_start_s/t_clear_s 承载，缺省 = 窗末持续脱离）。
               域判据两族同构（晚于 t_start、早于 duration、0.1 s 网格）。 */
            var tClear = fcfg.t_clear_s;
            if (tClear !== undefined && tClear !== null) {
              if (typeof tClear !== 'number' || !isFinite(tClear)) {
                push('fault.t_clear_s', '必须是数字（单位 s）或省略');
              } else if (Math.abs(tClear * 10 - Math.round(tClear * 10)) > 1e-9) {
                push('fault.t_clear_s', '必须落在 0.1 s 采样网格上（收到 ' + tClear + '）');
              } else if (tClear <= tStart) {
                push('fault.t_clear_s', '必须晚于 fault.t_start_s（' + tStart + ' s）');
              } else if (tClear >= durForFault) {
                push('fault.t_clear_s', '必须早于 duration_s（' + durForFault + ' s）');
              }
            }
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
      /* SOC 初值仅对声明 bounds.SOC_pct 的系统校验（PV-001 无储能、initial 无 SOC 键，
         PV001_G2B_SPEC_APPROVED §1.1 / R-8 键面分支）；FL/FC/GT 的 bounds 均含 SOC_pct，
         键面与告警零改动。 */
      if (bounds.SOC_pct) {
        var soc = init.SOC_pct;
        if (typeof soc !== 'number' || !isFinite(soc)) push('initial.SOC_pct', '必须是数字（单位 %）');
        else if (soc < bounds.SOC_pct.min - 1e-9 || soc > bounds.SOC_pct.max + 1e-9) {
          push('initial.SOC_pct', '必须在 ' + bounds.SOC_pct.min + '–' + bounds.SOC_pct.max + ' % 之间（收到 ' + soc + '）');
        }
      }
      /* PV-001 新轨：G0_W_m2 初始有效辐照度（W/m²，域 [300,1000]，PV001_G2B_SPEC_APPROVED §1.1） */
      if (system.id === 'PV-001') {
        var g0Init = init.G0_W_m2;
        if (typeof g0Init !== 'number' || !isFinite(g0Init)) push('initial.G0_W_m2', '必须是数字（单位 W/m²）');
        else if (g0Init < bounds.G0_W_m2.min - 1e-9 || g0Init > bounds.G0_W_m2.max + 1e-9) {
          push('initial.G0_W_m2', '必须在 ' + bounds.G0_W_m2.min + '–' + bounds.G0_W_m2.max + ' W/m² 之间（收到 ' + g0Init + '）');
        }
      }
      /* WT-001 新轨：v0_ms 初始有效风速（m/s，域 [6,10]——有意封顶在 v_rated 之下，
         健康初值全域解析，WT001_G2B_SPEC_APPROVED v1.0 §1.1） */
      if (system.id === 'WT-001') {
        var v0Init = init.v0_ms;
        if (typeof v0Init !== 'number' || !isFinite(v0Init)) push('initial.v0_ms', '必须是数字（单位 m/s）');
        else if (v0Init < bounds.v0_ms.min - 1e-9 || v0Init > bounds.v0_ms.max + 1e-9) {
          push('initial.v0_ms', '必须在 ' + bounds.v0_ms.min + '–' + bounds.v0_ms.max + ' m/s 之间（收到 ' + v0Init + '）');
        }
      }
      /* MG-001 新轨（MG001_G2B_SPEC_APPROVED v1.0 §1.1 / MG-G2b-04）：p_sched_kW 为 MG 自有
         配置量（BESS 调度计划，域 [−8,8] kW 经 bounds.p_sched_kW，Q5 定案默认 +5）；SOC_pct
         为聚合账本初值（FL-001 同款域 [0,100]）——刻意不入 bounds（checks.js soc-bounds /
         energy-balance 按 bounds.SOC_pct 派生分派，聚合层无 E_source/E_bat 通用指标面，声明
         将致 energy-balance 恒 fail 误报），域校验走本分支（MG-IMP-Q1 定案：reject 纪律——
         出域即结构化错误，不做引擎侧数值钳位；FL/PV/WT initial 校验同款 reject 先例）。 */
      if (system.id === 'MG-001') {
        var psInit = init.p_sched_kW;
        if (typeof psInit !== 'number' || !isFinite(psInit)) push('initial.p_sched_kW', '必须是数字（单位 kW）');
        else if (psInit < bounds.p_sched_kW.min - 1e-9 || psInit > bounds.p_sched_kW.max + 1e-9) {
          push('initial.p_sched_kW', '必须在 ' + bounds.p_sched_kW.min + '–' + bounds.p_sched_kW.max + ' kW 之间（收到 ' + psInit + '）');
        }
        var socMgInit = init.SOC_pct;
        if (typeof socMgInit !== 'number' || !isFinite(socMgInit)) push('initial.SOC_pct', '必须是数字（单位 %）');
        else if (socMgInit < 0 - 1e-9 || socMgInit > 100 + 1e-9) {
          push('initial.SOC_pct', '必须在 0–100 % 之间（收到 ' + socMgInit + '）');
        }
      }
      /* 已知初始条件键面按 bounds 派生：FL/FC/GT 的 bounds = {load_kW, SOC_pct}，
         与原硬编码键面等价；PV-001 为 {load_kW, G0_W_m2}；MG-001 bounds 键面不含 SOC_pct
         （见上分支注释），SOC_pct 键在此登记为已知（仅 MG-001 生效，五系统零变化） */
      var knownInitKeys = Object.keys(bounds);
      if (system.id === 'MG-001' && knownInitKeys.indexOf('SOC_pct') === -1) knownInitKeys.push('SOC_pct');
      Object.keys(init).forEach(function (k) {
        if (knownInitKeys.indexOf(k) === -1) warnings.push('initial.' + k + ' 不是已知初始条件，计算时忽略');
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
      /* on 轨专属列门控（FCECH-G2b-04 任务5裁定——FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0
         §1.3/§3.1 张力裁定，CHG-20261113-01 批准链）：registry.runHashInput 的 signals 哈希面
         为整 timeseries.signals 对象（registry.js runHashInput 实读），canonicalize 对 null
         值键照序列化 ⇒ null 列改变 off 轨 run_hash。八面冻结后 off 轨 run_hash 逐位零变化为
         最高判据（§3.1）⇒ 带 onTrackOnly 标记的信号列不在此建列（off 轨结构性缺席、
         timeseries.signals 逐字节不变），on 轨由 simulateFC001Electrochem 补建三列。
         GT thermo 八信号 / FL thermal 两信号的全程 null 列先例为 v0.x 宽容期落地面
         （CHG-20261104-12/CHG-20261107-01 登记预期失效面），八面冻结后不可复制。
         既有系统全部信号定义无此标记 ⇒ 本门控对其零变化（改前探针实证：null 列
         6ac0ae17…→0dd7e9a1… 变哈希；undefined 键哈希中性但非 null 列形态）。 */
      if (sg.onTrackOnly) return;
      var arr = new Array(n + 1);
      for (var i = 0; i <= n; i++) arr[i] = null;
      series[sg.id] = arr;
    });
    return series;
  }

  /* ---------------- FL-001 电池储能 ---------------- */
  /* I-11 S1 移植（CHG-20261030-07，RFC_MODEL_INTERFACE_I11_APPROVED.md §3）：none / sensor_drift 家族走
     src/core/plants/fl001.js（Plant/Sensor/Controller/Fault 边界，数值子步口径）；actuator_fault
     为未评审扩展预览家族，保留下方内联数值路径（O-13 归档；FL-001 load_step 已按 O-13 删除）。
     数值表达式与抽取前逐字一致，移植验收 = plant 家族 run_hash 与 series 逐位不变
     （快照工具 tools/verify-i11-bitidentity.mjs）。 */
  function fl001PlantCapable(cfg) {
    return cfg.fault.family === 'none' || cfg.fault.family === 'sensor_drift';
  }

  function simulateFL001Plant(system, cfg, t) {
    var plant = FL.core.plants.createFl001Plant(cfg);
    var V = plant.V;
    var load0 = plant.load0;
    var soc0 = plant.soc0;
    var I_ref = plant.I_ref;
    var n = t.length - 1;

    var series = makeSeries(system, n);
    var I_true = plant.I_ref;
    var intI = 0;
    var intB = 0;
    var intDemand = 0;

    function record(k) {
      var time = t[k];
      var b = plant.bAt(time);
      var demand = load0;
      var iTrue = I_true;
      var iMeas = plant.iMeasAt(iTrue, time);
      var pBat = V * iTrue;
      var pBatMeas = V * iMeas;
      var pGen = demand - pBat;
      series.I_bat_true_A[k] = iTrue;
      series.I_bat_meas_A[k] = iMeas;
      series.I_ref_A[k] = I_ref;
      series.bias_A[k] = b;
      series.I_bat_cap_A[k] = null;
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
        var b = plant.bAt(time);
        intDemand += load0 * DT_INT;
        intB += b * DT_INT;
        var step = plant.stepOf(I_true, time, DT_INT);
        I_true = step.y;
        intI += step.integral;
      }
      record(k);
    }
    var intPbat = V * intI;
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

  function simulateFL001(system, cfg, t) {
    /* FL-001 thermal/capacity 三分派（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §1.1/§8 FLCAP-G2b-04，
       CHG-20261114-01 批准链；FLTH thermal early-return 分派先例同构，R-8 守卫）：
       thermal_model=on + capacity_model=on → RK4 容量链 simulateFL001Capacity（EQ-FLTH-10…12
       冻结更新序）；thermal_model=on + capacity off/缺省 → RK4 热力链 simulateFL001Thermal
       （§2.3 冻结更新序——既有 (on,off) 轨逐字不动）；off 路径（plant 家族 + 内联 actuator
       路径）逐字不动。组合守卫（(off,on) 拒绝）在 validateConfig/scenario 双落点承载——
       本分派对非法组合不做静默兜底。 */
    if (cfg.thermal_model === 'on') {
      if (cfg.capacity_model === 'on') return simulateFL001Capacity(system, cfg, t);
      return simulateFL001Thermal(system, cfg, t);
    }
    if (fl001PlantCapable(cfg)) return simulateFL001Plant(system, cfg, t);
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
    var isAct = family === 'actuator_fault';
    var I_cap = isAct ? I_ref * magnitude / 100 : null;

    function bAt(time) { return (isSensor && tStart != null && time >= tStart - 1e-9) ? magnitude : 0; }

    var series = makeSeries(system, n);
    var I_true = I_ref;
    var intI = 0;
    var intB = 0;
    var intDemand = 0;

    function record(k) {
      var time = t[k];
      var b = bAt(time);
      var demand = load0;
      var iTrue = I_true;
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
        intDemand += load0 * DT_INT;
        intB += b * DT_INT;
        var controlTarget = I_ref - (monitor ? 0 : b);
        var target = controlTarget;
        if (isAct && time >= tStart - 1e-9) target = Math.min(controlTarget, I_cap);
        var step = foStep(I_true, target, isAct ? 0.4 : 1.5, DT_INT);
        I_true = step.y;
        intI += step.integral;
      }
      record(k);
    }
    var intPbat = V * intI;
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

  /* ---------------- FL-001 L1 thermal 轨（电池单节点集总热模型） ----------------
     FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §2（方程/常量唯一权威文本，CHG-20261107-01 批准）
     + §2.3（分区更新序冻结，oracle/引擎双侧复刻）。数值口径：
     - 电气面 L0 序逐字保留（EQ-FLTH-1）：none/sensor_drift 家族走 plants/fl001.js 适配器
       （plant.stepOf/bAt/iMeasAt 与 simulateFL001Plant 同源）、actuator_fault 走内联 foStep
       路径（controlTarget/monitor/I_cap 语义与 simulateFL001 内联路径同构）——I 精确指数
       子步、intI/intB 同源，thermal on 不回写电气面（§3.2 复算实证）；
     - T_bat 经典 RK4 固定步长 h = DT_INT = 0.01（6000 子步/60 s，T-B 数值轨，不承诺跨语言
       逐位）；RHS 内 I 冻结于子步起点值（FLTH-DRAFT-Q2 定案）；R_int(T) = R0·(1+α·(T−T_amb))
       （EQ-FLTH-2）、P_loss = I²·R_int（EQ-FLTH-3）、C_bat·dT/dt = P_loss − h·(T−T_amb)
       （EQ-FLTH-4，T_bat(0) = T_amb 冷启动）；常量为 §2.1 教学整定值（非实测）；
     - E_loss 子步梯形累计（EQ-FLTH-8，FLTH-DRAFT-Q4 定案）；守恒面 (a)（FLTH-DRAFT-Q1 定案）：
       P_gen = P_load − P_bat + P_loss（EQ-FLTH-5）、r_true/r_meas 定义恒等扩展含 −P_loss 项
       （EQ-FLTH-6）；SOC/SOC_est/E_bat 面与 L0 record 逐字同（P_bat = 0.4·I 口径不动，
       EQ-FLTH-7）；
     - record(601 点)：由 (I_true, T_bat, b) 重算全部代数量；事件快照变量零扩展（维持 L0
       变量集——T_bat 不入事件快照，§3.6 最小集声明）；t=20.0 行 T_bat = 故障前连续值、
       I_true post 行语义与 L0 一致（§2.3 审查注记④——T 连续无跳变，偏置阶跃只作用于
       测量通道与 target）；
     - T_bat_K / P_loss_kW 两新信号（§1.2，全非盲显）仅 thermal on 轨填充；off 轨保持
       makeSeries 的 null 初始化（GT 热信号 null 列先例）——engine 侧不得为 off 轨填任何值。 */
  function simulateFL001Thermal(system, cfg, t) {
    var n = t.length - 1;
    var usePlant = fl001PlantCapable(cfg);
    var plant = usePlant ? FL.core.plants.createFl001Plant(cfg) : null;
    var V = 0.4;
    /* §2.1 教学参数（教学整定值，非实测——60 s 窗内温升路径可见的显式缩放） */
    var R0 = 0.2;         // 25 °C 参考内阻（Ω）
    var ALPHA_R = 0.01;   // 内阻温度系数（1/K，正温度反馈）
    var C_BAT = 300;      // 电池单节点集总热容（J/K）
    var H_COOL = 10;      // 牛顿冷却系数（W/K）
    var T_AMB = 298.15;   // 环境温度（K），T_bat(0) = T_amb
    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var magnitude = faulted ? cfg.fault.params.magnitude : 0;
    var monitor = cfg.feedback_mode === 'monitor';
    var load0 = cfg.initial.load_kW;
    var soc0 = cfg.initial.SOC_pct;
    var I_ref = (load0 - 20) / V;
    var isAct = family === 'actuator_fault';
    var I_cap = isAct ? I_ref * magnitude / 100 : null;

    /* EQ-FLTH-2/3：R_int(T) = R0·(1+α·(T−298.15))；P_loss = I²·R_int（W；kW 面 /1000） */
    function pLossW(iA, tK) { var theta = tK - T_AMB; return iA * iA * R0 * (1 + ALPHA_R * theta); }
    function pLossKw(iA, tK) { return pLossW(iA, tK) / 1000; }
    /* EQ-FLTH-4 RK4 右端：dT/dt = (P_loss − h·θ)/C_bat（I 冻结于子步起点——Q2 定案） */
    function rhsT(tK, iFroz) { return (pLossW(iFroz, tK) - H_COOL * (tK - T_AMB)) / C_BAT; }
    /* 内联路径测量链（actuator 家族；none/sensor 家族走 plant.iMeasAt） */
    function bAt(time) { return (family === 'sensor_drift' && tStart != null && time >= tStart - 1e-9) ? magnitude : 0; }

    var series = makeSeries(system, n);
    var I_true = usePlant ? plant.I_ref : I_ref;
    var T_bat = T_AMB;
    var intI = 0;
    var intB = 0;
    var intDemand = 0;
    var eLoss = 0;   // ∫P_loss dt（kW·s，子步梯形——EQ-FLTH-8）

    function record(k) {
      var time = t[k];
      var b = usePlant ? plant.bAt(time) : bAt(time);
      var demand = load0;
      var iTrue = I_true;
      var iMeas = usePlant ? plant.iMeasAt(iTrue, time) : iTrue + b;
      var pBat = V * iTrue;
      var pBatMeas = V * iMeas;
      var pLossKwNow = pLossKw(iTrue, T_bat);   /* 当前状态值（非累计值，§2.3 注记②） */
      var pGen = demand - pBat + pLossKwNow;    /* EQ-FLTH-5（守恒面 (a)，Q1 定案） */
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
      series.r_true_kW[k] = pGen + pBat - demand - pLossKwNow;     /* EQ-FLTH-6：定义恒等 ≡ 0 */
      series.r_meas_kW[k] = pGen + pBatMeas - demand - pLossKwNow; /* EQ-FLTH-6：≡ 0.4·b（Q3） */
      /* §1.2 两新热信号（仅 thermal on 轨填充；off 轨 null 列由 makeSeries 维持） */
      series.T_bat_K[k] = T_bat;
      series.P_loss_kW[k] = pLossKwNow;
    }

    record(0);
    for (var k = 1; k <= n; k++) {
      for (var j = 0; j < SUB; j++) {
        var time = (k - 1) * SUB * DT_INT + j * DT_INT;
        var b = usePlant ? plant.bAt(time) : bAt(time);
        intDemand += load0 * DT_INT;
        intB += b * DT_INT;
        /* ① 电气面（L0 序保留，EQ-FLTH-1）：I_start = 子步起点值（同时是②的冻结输入） */
        var iStart = I_true;
        var tBat0 = T_bat;
        var step;
        if (usePlant) {
          step = plant.stepOf(iStart, time, DT_INT);
        } else {
          var controlTarget = I_ref - (monitor ? 0 : b);
          var target = controlTarget;
          if (isAct && time >= tStart - 1e-9) target = Math.min(controlTarget, I_cap);
          step = foStep(iStart, target, isAct ? 0.4 : 1.5, DT_INT);
        }
        I_true = step.y;
        intI += step.integral;
        /* ② RK4（EQ-FLTH-4；RHS 内 I 冻结于子步起点 iStart——Q2 定案） */
        var k1 = rhsT(tBat0, iStart);
        var k2 = rhsT(tBat0 + DT_INT / 2 * k1, iStart);
        var k3 = rhsT(tBat0 + DT_INT / 2 * k2, iStart);
        var k4 = rhsT(tBat0 + DT_INT * k3, iStart);
        T_bat = tBat0 + DT_INT / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
        /* ③ E_loss 子步梯形（EQ-FLTH-8，Q4 定案）：½·(P_loss(I,T)_起点 + P_loss(I,T)_终点)·h */
        eLoss += 0.5 * (pLossKw(iStart, tBat0) + pLossKw(I_true, T_bat)) * DT_INT;
      }
      record(k);
    }
    var intPbat = V * intI;
    return {
      series: series,
      integrals: {
        E_load: intDemand,
        /* EQ-FLTH-8（守恒面 (a)）：E_source = E_load − E_bat + E_loss */
        E_source: intDemand - intPbat + eLoss,
        E_bat: intPbat,
        E_bat_meas: intPbat + V * intB,
        intI: intI,
        intB: intB,
        E_loss: eLoss   /* kW·s（EQ-FLTH-8 子步梯形损耗能量账本；E_loss 指标与 checks
                           EQ-FLTH-9 分支按 FLTH-G2b-04 工作面承载） */
      }
    };
  }

  /* ---------------- FL-001 L1 capacity 轨（容量/内阻二阶效应） ----------------
     FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §1.3/§1.5/§4 项 3（方程/常量唯一权威文本，
     CHG-20261114-01 批准链；FLCAP-G2b-04 引擎工作面）。FLTH 骨架同构（simulateFL001Thermal
     逐字复刻其 L0 电气面/RK4 结构/梯形记账），仅三处批准修订（§1.3）：
     - EQ-FLTH-10：R_int(T_bat) = R0·(1 + α·θ + β·θ²)，θ = T_bat − 298.15（β = 5×10⁻⁷ 1/K²
       批准轮定案；符号域 β ≥ 0、α > 0——A-5）；β = 0 时精确退化为现行线性式；
     - EQ-FLTH-4 RK4（RHS 内 I 冻结子步起点——Q2 口径；R_int 换用二次式后子步内为常系数
       Riccati 方程 θ′ = a·θ² + b·θ + c（a = I²R0β/C_bat、b = (I²R0α − h)/C_bat、c = I²R0/C_bat，
       I 冻结口径）——RK4 数值轨 T-B（oracle fl001_cap_oracle 同构同序，§4 项 3 定案；
       子步 Riccati 闭式交叉 = oracle FCAP-7 自检面，引擎不承载）；
     - EQ-FLTH-11：SOC_true 分母 E_cap(T_bat) = η_cap(T_bat)·E_nom（裁定点一定案：仅
       capacity_model=on 域内生效——off 与 (on,off) 轨 EQ-FLTH-7 原式逐字不动）。离散口径
       （冻结）：名义单除项（与 EQ-FLTH-7 原式同源同序——既有轨 SOC_true 表达式逐字同）
       + 容量修正累积器（每子步 (V·∫I dt′/3600)·(1/E_cap(T_start) − 1/40)，E_cap 冻结于
       子步起点右值 T_start——FLTH Q2 I 冻结先例同构）。T < T_cap0 域内修正累积器恒精确
       0.0（IEEE：max(0, T−T_cap0) ≡ 0 ⇒ η_cap ≡ 1.0 精确 ⇒ 1/E_cap − 1/40 ≡ 0.0）
       ⇒ healthy 局 SOC_true/SOC_est/SOC_err 与 fl001_v2 位级逐位同（A-2 机制）；
     - EQ-FLTH-12：θ_ss 稳定小根有理化形态 θ₋ = 2·I²·R0/[(h − α·I²·R0) + √Δ]（Q3/A-3 定案，
       锚点/自检消费面——不入序列/run_hash，oracle FCAP-2/FCAP-5 同式同序）。
     数值口径：
     - 电气面 L0 序逐字保留（EQ-FLTH-1）：none/sensor_drift 家族走 plants/fl001.js 适配器、
       actuator_fault 走内联 foStep 路径——与 simulateFL001Thermal 同构；P_bat = 0.4·I 口径
       不动、功率链零反馈（守恒面声明：反馈仅经 SOC 折算面进入——A5 §2.1 口径）；
     - E_loss 子步梯形累计（EQ-FLTH-8）表达式与既有轨逐字同；E_source = E_load − E_bat + E_loss
       （守恒面不动域——无第二缺口项、无补偿去向，裁定点一定案 §6.2.1）；
     - record(601 点)：由 (I_true, T_bat, b) 重算全部代数量（当前状态值——非累计值）；事件
       快照变量零扩展（E_cap 不入事件快照——§2 事件快照行；快照变量集随列在场机械增长、
       golden 未钉的额外键不进比对——FC 先例体例）；
     - E_cap_kWh 单新信号（Q10 定案最小集，η_cap 不出信号）：onTrackOnly 门控（makeSeries
       跳过——off/(on,off) 轨 timeseries.signals 逐字节不变 ⇒ run_hash 零变化），on_cap 轨
       由本函数补建列（simulateFC001Electrochem 补建先例同构）。 */
  function simulateFL001Capacity(system, cfg, t) {
    var n = t.length - 1;
    var usePlant = fl001PlantCapable(cfg);
    var plant = usePlant ? FL.core.plants.createFl001Plant(cfg) : null;
    var V = 0.4;
    /* FLTH §2.1 既有冻结常量原样（本轨不触碰 thermal 轨常量——fl001_v2 字节冻结零涉） */
    var R0 = 0.2;         // 25 °C 参考内阻（Ω）
    var ALPHA_R = 0.01;   // 内阻温度系数（1/K，正温度反馈；符号域 α > 0——A-5）
    var C_BAT = 300;      // 电池单节点集总热容（J/K）
    var H_COOL = 10;      // 牛顿冷却系数（W/K）
    var T_AMB = 298.15;   // 环境温度（K），T_bat(0) = T_amb
    /* capacity 轨四常量（批准轮定案 CHG-20261114-01，§1.5；教学整定值非实测——A-flcap-params） */
    var BETA_R = 5e-7;    // EQ-FLTH-10 二次项系数（1/K²；符号域 β ≥ 0——A-5）
    var K_CAP = 0.004;    // η_cap 折损率（1/K；符号域 k_cap ≥ 0——A-5）
    var T_CAP0 = 313.15;  // 折损起始温度（= 40 °C；高于 healthy 轨最高温 309.953757 K——A-2 机制）
    var ETA_FLOOR = 0.5;  // 正性下限（A-1 定案；η_floor > 0——A-5；E_cap ≥ 20 kWh 全域）

    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var magnitude = faulted ? cfg.fault.params.magnitude : 0;
    var monitor = cfg.feedback_mode === 'monitor';
    var load0 = cfg.initial.load_kW;
    var soc0 = cfg.initial.SOC_pct;
    var I_ref = (load0 - 20) / V;
    var isAct = family === 'actuator_fault';
    var I_cap = isAct ? I_ref * magnitude / 100 : null;

    /* EQ-FLTH-10/3：R_int(T) = R0·(1 + α·θ + β·θ²)（β·θ² 求值序 = 批准文本左结合序——
       oracle p_loss_w 同序复刻）；P_loss = I²·R_int（W；kW 面 /1000） */
    function pLossW(iA, tK) {
      var theta = tK - T_AMB;
      return iA * iA * R0 * (1 + ALPHA_R * theta + BETA_R * theta * theta);
    }
    function pLossKw(iA, tK) { return pLossW(iA, tK) / 1000; }
    /* EQ-FLTH-11：η_cap(T) = max(η_floor, 1 − k_cap·max(0, T − T_cap0))（T < T_cap0 域内
       max(0, 负) ≡ 0.0（IEEE 精确）⇒ η_cap ≡ 1.0 精确——A-2 机制）；E_cap = η_cap·E_nom */
    function etaCap(tK) { return Math.max(ETA_FLOOR, 1 - K_CAP * Math.max(0, tK - T_CAP0)); }
    function eCapKwh(tK) { return etaCap(tK) * CAP_KWH; }
    /* EQ-FLTH-4 RK4 右端：dT/dt = (P_loss − h·θ)/C_bat（I 冻结于子步起点——Q2 定案） */
    function rhsT(tK, iFroz) { return (pLossW(iFroz, tK) - H_COOL * (tK - T_AMB)) / C_BAT; }
    /* EQ-FLTH-12 数值稳定小根形态（冻结——Q3/A-3 定案）：θ₋ = 2·I²·R0 / [(h − α·I²·R0) + √Δ]，
       Δ = (h − α·I²·R0)² − 4β·(I²·R0)²（有理化式——Δ→0 无相消、β→0 无 0/0；naive 求根式
       仅作展示不作求解式）。锚点/自检消费面（oracle theta_ss_small_root 同式同序），
       不参与轨内积分。 */
    function thetaSsSmallRoot(iA) {
      var p = iA * iA * R0;
      var q = H_COOL - ALPHA_R * p;
      var delta = q * q - 4 * BETA_R * p * p;
      return { theta_K: 2 * p / (q + Math.sqrt(delta)), delta_W2: delta };
    }
    /* 内联路径测量链（actuator 家族；none/sensor 家族走 plant.iMeasAt） */
    function bAt(time) { return (family === 'sensor_drift' && tStart != null && time >= tStart - 1e-9) ? magnitude : 0; }

    var series = makeSeries(system, n);
    /* E_cap_kWh 为 on_cap 轨专属列（SystemDef.signals onTrackOnly——makeSeries 门控跳过），
       on_cap 轨此处补建；off 轨与 thermal on 无 capacity 轨 timeseries.signals 保持既有键面
       逐字节不变 ⇒ run_hash 零变化（simulateFC001Electrochem 补建先例同构）。 */
    system.signals.forEach(function (sg) {
      if (sg.onTrackOnly && !series[sg.id]) {
        var arrCap = new Array(n + 1);
        for (var i0 = 0; i0 <= n; i0++) arrCap[i0] = null;
        series[sg.id] = arrCap;
      }
    });

    var I_true = usePlant ? plant.I_ref : I_ref;
    var T_bat = T_AMB;
    var intI = 0;
    var intB = 0;
    var intDemand = 0;
    var eLoss = 0;      // ∫P_loss dt（kW·s，子步梯形——EQ-FLTH-8）
    var corrKwh = 0;    // 容量修正累积器（EQ-FLTH-11 离散口径；×100 → pp）

    function record(k) {
      var time = t[k];
      var b = usePlant ? plant.bAt(time) : bAt(time);
      var demand = load0;
      var iTrue = I_true;
      var iMeas = usePlant ? plant.iMeasAt(iTrue, time) : iTrue + b;
      var pBat = V * iTrue;
      var pBatMeas = V * iMeas;
      var pLossKwNow = pLossKw(iTrue, T_bat);   /* 当前状态值（非累计值，§2.3 注记②同款） */
      var pGen = demand - pBat + pLossKwNow;    /* EQ-FLTH-5（守恒面 (a)——不动域） */
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
      /* EQ-FLTH-11 离散口径：名义单除项（与 EQ-FLTH-7 原式同源同序——既有轨逐字同表达式）
         − 100·corr。T < T_cap0 域内 corr ≡ 0.0（IEEE 精确）⇒ healthy 局 SOC 面与 fl001_v2
         位级同（A-2 机制）；SOC_est 原式逐字不动（测量链零升级——§1.4）。 */
      series.SOC_true_pct[k] = soc0 - (V * intI) / (CAP_KWH * 3600) * 100 - 100 * corrKwh;
      series.SOC_est_pct[k] = soc0 - (V * intI + V * intB) / (CAP_KWH * 3600) * 100;
      series.r_true_kW[k] = pGen + pBat - demand - pLossKwNow;     /* EQ-FLTH-6：定义恒等 ≡ 0 */
      series.r_meas_kW[k] = pGen + pBatMeas - demand - pLossKwNow; /* EQ-FLTH-6：≡ 0.4·b（Q3） */
      /* 两新热信号（复用既有列；数值面随 EQ-FLTH-10 修订式变化）+ E_cap 新列 */
      series.T_bat_K[k] = T_bat;
      series.P_loss_kW[k] = pLossKwNow;
      series.E_cap_kWh[k] = eCapKwh(T_bat);
    }

    record(0);
    for (var k = 1; k <= n; k++) {
      for (var j = 0; j < SUB; j++) {
        var time = (k - 1) * SUB * DT_INT + j * DT_INT;
        var b = usePlant ? plant.bAt(time) : bAt(time);
        intDemand += load0 * DT_INT;
        intB += b * DT_INT;
        /* ① 电气面（L0 序保留，EQ-FLTH-1）：I_start = 子步起点值（同时是②的冻结输入）
           ——与 simulateFL001Thermal 逐字同构 */
        var iStart = I_true;
        var tBat0 = T_bat;
        var step;
        if (usePlant) {
          step = plant.stepOf(iStart, time, DT_INT);
        } else {
          var controlTarget = I_ref - (monitor ? 0 : b);
          var target = controlTarget;
          if (isAct && time >= tStart - 1e-9) target = Math.min(controlTarget, I_cap);
          step = foStep(iStart, target, isAct ? 0.4 : 1.5, DT_INT);
        }
        I_true = step.y;
        intI += step.integral;
        /* ①' 容量修正累积器（EQ-FLTH-11 离散口径；E_cap 冻结于子步起点右值 tBat0——
           FLTH Q2 I 冻结先例同构）：corr += (V·∫I_sub dt′/3600)·(1/E_cap(T_start) − 1/40)。
           恒等改写 1/E_cap = 1/40 + (1/E_cap − 1/40)（修正项与 E_cap ≤ 40 同向、无相消）；
           T < T_cap0 域内该项恒精确 0.0（A-2 机制）。 */
        corrKwh += (V * step.integral / 3600) * (1 / eCapKwh(tBat0) - 1 / CAP_KWH);
        /* ② RK4（EQ-FLTH-4；RHS 内 I 冻结于子步起点 iStart——Q2 定案口径；R_int 按
           EQ-FLTH-10 二次式——子步内常系数 Riccati 型，RK4 数值轨 T-B） */
        var k1 = rhsT(tBat0, iStart);
        var k2 = rhsT(tBat0 + DT_INT / 2 * k1, iStart);
        var k3 = rhsT(tBat0 + DT_INT / 2 * k2, iStart);
        var k4 = rhsT(tBat0 + DT_INT * k3, iStart);
        T_bat = tBat0 + DT_INT / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
        /* ③ E_loss 子步梯形（EQ-FLTH-8，Q4 定案）：½·(P_loss(I,T)_起点 + P_loss(I,T)_终点)·h
           ——表达式与既有轨逐字同 */
        eLoss += 0.5 * (pLossKw(iStart, tBat0) + pLossKw(I_true, T_bat)) * DT_INT;
      }
      record(k);
    }
    var intPbat = V * intI;
    var thetaSs = thetaSsSmallRoot(I_ref);
    return {
      series: series,
      integrals: {
        E_load: intDemand,
        /* EQ-FLTH-8（守恒面 (a)）：E_source = E_load − E_bat + E_loss */
        E_source: intDemand - intPbat + eLoss,
        E_bat: intPbat,
        E_bat_meas: intPbat + V * intB,
        intI: intI,
        intB: intB,
        E_loss: eLoss,  /* kW·s（EQ-FLTH-8 子步梯形损耗能量账本） */
        /* on_cap 轨锚点/自检消费面（不入序列/run_hash——registry runHashInput 不含
           integrals；oracle integrals.soc_corr_pp 同源）：容量修正累积器（pp）与
           EQ-FLTH-12 稳定小根 θ₋（I_ref 参考电流口径——healthy 锚点 θ₋(25 A) = 14.287172 K）、
           判别式 Δ。W4 测试面/锚点比对消费（spec §3.2 锚点表）。 */
        soc_corr_pp: 100 * corrKwh,
        theta_ss_K: T_AMB + thetaSs.theta_K,
        theta_ss_delta_W2: thetaSs.delta_W2
      }
    };
  }

  /* ---------------- FC-001 燃料电池 ---------------- */
  /* I-11 S2 移植（CHG-20261030-07，RFC_MODEL_INTERFACE_I11_APPROVED.md §3）：none / sensor_drift 家族走
     src/core/plants/fc001.js（数值子步口径，与 FC 解析 golden 的比对走既有 verify_golden fc001 层）；
     load_step / actuator_fault 为暂缓家族，保留下方内联数值路径（RFC §3 S2 验收边界）。
     数值表达式与抽取前逐字一致，移植验收 = FC Run run_hash 与 series 逐位不变。 */
  function fc001PlantCapable(cfg) {
    return cfg.fault.family === 'none' || cfg.fault.family === 'sensor_drift';
  }

  function simulateFC001Plant(system, cfg, t) {
    var plant = FL.core.plants.createFc001Plant(cfg);
    var V = plant.V;
    var load0 = plant.load0;
    var soc0 = plant.soc0;
    var n = t.length - 1;

    var series = makeSeries(system, n);
    var I_fc = plant.I_fc_ref;
    var intIfc = 0;
    var intB = 0;
    var intDemand = 0;

    function record(k) {
      var time = t[k];
      var b = plant.bAt(time);
      var demand = load0;
      var iMeas = plant.iMeasAt(I_fc, time);
      var pFc = V * I_fc;
      var pFcMeas = V * iMeas;
      var pBat = demand - pFc;
      var pBatEst = demand - pFcMeas;
      series.I_fc_true_A[k] = I_fc;
      series.I_fc_meas_A[k] = iMeas;
      series.I_fc_ref_A[k] = plant.I_fc_ref;
      series.bias_A[k] = b;
      series.I_fc_cap_A[k] = null;
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
      series.valve_meas_pct[k] = 100;
    }

    record(0);
    for (var k = 1; k <= n; k++) {
      for (var j = 0; j < SUB; j++) {
        var time = (k - 1) * SUB * DT_INT + j * DT_INT;
        var b = plant.bAt(time);
        var demand = load0;
        intDemand += demand * DT_INT;
        intB += b * DT_INT;
        var st = plant.stepOf(I_fc, time, DT_INT);
        I_fc = st.y;
        intIfc += st.integral;
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

  function simulateFC001(system, cfg, t) {
    /* FC-001 电化学轨分派（FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §1.1/§8 FCECH-G2b-04，
       CHG-20261113-01 批准；FLTH/GT thermo early-return 分派先例同构，R-守卫）：
       electrochem_model = on 走 RK4 极化链（simulateFC001Electrochem，§1.4 EQ-FCEC-1…7
       冻结更新序），off 路径（plant 家族 + 内联 load/actuator 路径）全量代码逐字不动。 */
    if (cfg.electrochem_model === 'on') return simulateFC001Electrochem(system, cfg, t);
    if (fc001PlantCapable(cfg)) return simulateFC001Plant(system, cfg, t);
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

  /* ---------------- FC-001 L1 电化学轨（V-I 极化链 + 电堆单节点热） ----------------
     FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §1.3/§1.4/§1.5（方程/常量/更新序唯一权威文本，
     CHG-20261113-01 批准链）+ §8 FCECH-G2b-04（实现轮）。数值口径（独立 oracle =
     tools/oracle/fc001_l1_oracle.py 同式同序复刻，T-B 双实现——不承诺跨语言逐位）：
     - 电气面 L0 序逐字保留（EQ-FCEC-7）：healthy/sensor/monitor 家族走 plants/fc001.js
       适配器（plant.stepOf/bAt/iMeasAt 与 simulateFC001Plant 同源——I_fc 精确指数子步、
       intIfc/intB 同源）、load_step/actuator_fault 走内联级联 foStep 子步递推（refStep 弃
       积分项仅取 .y/target/foStep 同序——EQ-6 分配器 0.4 kV 名义电压原样，A-fcec-dispatch）；
       I_fc/I_fc_ref 保留 L0 更新序——非 RK4 状态、不依赖 T_st（§1.3，电气面逐位同的结构原因）；
     - T_st 经典 RK4 固定步长 h = DT_INT = 0.01（6000 子步/60 s，T-B 数值轨）；RHS 内 I 冻结
       于子步起点值（§4 项 3 口径，FLTH Q2 同构）；RHS = (P_loss_W − h_st·(T_st − T_amb))/C_st
       （EQ-FCEC-3，W 记账——A-3 定案）；I 冻结口径下子步内为线性常系数 ODE（EQ-FCEC-4/6
       结构推论——oracle FEC-7 交叉证据面成立）；
     - EQ-FCEC-1/5/6 极化链：V_stack = E0(T_st) − c_act·ln(1+I/I_0) − R_ohm(T_st)·I
       − c_conc·ln(I_lim/(I_lim−I))；E0_ref 由整定依据①锚点闭式派生（非自由度：
       400 + c_act·ln6 + 50·R_ohm0 + c_conc·ln1.5，印刷值 425.130134484272 为其 15 位表示）；
       k_E = 50·α_ohm·R_ohm0（整定依据④恒等式——两温度面线性 ⇒ healthy 全轨
       V_stack(50,·) ≡ 400 V、P_fc ≡ 20 kW、SOC/E_bat/r_meas 与 L0 逐位同恢复）；
     - EQ-FCEC-2/4：P_fc,true = V_stack·I_fc/1000（on 域替换 EQ-3 前半 A-const-v 电堆半边）；
       P_loss_W = (E0 − V_stack)·I【W】（信号面 /1000——A-3 W 记账）；E_fc 账本子步梯形
       （FLTH Q4 同款 idiom）；
     - EQ-FCEC-7 记账基（A-5 定案）：SOC_true/E_bat/P_bat 按 P_fc,true 重算（真实功率基，
       P_bat = P_load − P_fc,true 理想平衡源口径不变 ⇒ r_true ≡ 0 按构造）；SOC_est/P_fc,meas
       测量链 0.4 kV 恒压口径未动与 L0 逐字（A-fcec-meas）；r_meas = P_fc,meas + P_bat − P_load
       （与 0.4·b + (0.4 − V_stack/1000)·I_fc 浮点等价——参考工作点 (I=50,T_st(0)) 处为零，
       healthy 全轨 I≡50 + 整定依据④ ⇒ 全轨为零，conservation-meas ≤1e-6 判据承载）；
     - record(601 点)：由 (I_fc, T_st, b) 重算全部代数量（当前状态值——非累计值）；事件
       快照面零扩展维持既有机制（buildSnapshots 按列在场构建）；三新信号（T_st_K/V_stack_V/
       P_loss_stack_kW，§1.3 全非盲显）仅 on 轨构建（任务5裁定：SystemDef.signals 带
       onTrackOnly 标记、makeSeries 门控跳过——off 轨 timeseries.signals 逐字节不变）。
     域守卫登记（§1.6 ②/§3.3）：I < I_lim = 150 A 为 EQ-FCEC-1 值域硬条件——注册域最大
     电流 137.5 A（load0=45 + step20 极端角点）< I_lim（裕度 12.5 A）；normalizeConfig 不
     新增钳位（批准轮确认维持），越域后果经 model.electrochem.limitations 声明。 */
  function simulateFC001Electrochem(system, cfg, t) {
    var n = t.length - 1;
    /* §1.5 十常量定案值（FCECH-G2b-02；教学整定值、非实测——A-fcec-params；
       表达式顺序 = 批准文本左结合序，oracle 同序复刻） */
    var V = 0.4;              // 电池半边 0.4 kV 名义电压（A-fcec-dispatch——分配器/电池半边原样）
    var E0_REF = 400 + 0.05 * Math.log(1 + 50 / 10) + 50 * 0.5 + 0.1 * Math.log(150 / (150 - 50));
                              // ^ EQ-FCEC-5 整定依据①闭式派生（非自由度）：400 + c_act·ln6 + 50·R_ohm0 + c_conc·ln1.5
    var K_E = 0.1;            // = 50·α_ohm·R_ohm0（整定依据④恒等式——A-2(i) 定案）
    var I_0 = 10;             // 活化损失特征电流（A）
    var C_ACT = 0.05;         // 活化过电位尺度（V）
    var R_OHM0 = 0.5;         // 参考欧姆电阻（Ω）
    var ALPHA_OHM = 0.004;    // 欧姆电阻温度系数（1/K）
    var C_CONC = 0.1;         // 浓差损失尺度（V）
    var I_LIM = 150;          // 浓差极限电流（A）——> 137.5 A 注册域硬条件（§3.3；登记不静默）
    var C_ST = 1500;          // 电堆集总热容（J/K）
    var H_ST = 120;           // 牛顿冷却系数（W/K）——h_st > α_ohm·R_ohm0·I²（A-3 W 口径稳定性界）
    var T_AMB = 298.15;       // 环境温度（K），T_st(0) = T_amb（冷启动）
    var T_REF = 298.15;       // 参考温度（K）

    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var magnitude = faulted ? cfg.fault.params.magnitude : 0;
    var load0 = cfg.initial.load_kW;
    var soc0 = cfg.initial.SOC_pct;
    var P_bat_ref = 10;
    var I_fc_base = (load0 - P_bat_ref) / V;
    var isLoad = family === 'load_step';
    var isAct = family === 'actuator_fault';
    var I_fc_cap = isAct ? I_fc_base * magnitude / 100 : null;

    /* EQ-FCEC-5/6/1/4（表达式顺序 = 批准文本左结合序——oracle e0_of/r_ohm_of/v_stack/p_loss_w 同构） */
    function e0Of(tK) { return E0_REF + K_E * (tK - T_REF); }
    function rOhmOf(tK) { return R_OHM0 * (1 + ALPHA_OHM * (tK - T_REF)); }
    function vStack(iA, tK) {
      return e0Of(tK)
        - C_ACT * Math.log(1 + iA / I_0)
        - rOhmOf(tK) * iA
        - C_CONC * Math.log(I_LIM / (I_LIM - iA));
    }
    function pLossW(iA, tK) { return (e0Of(tK) - vStack(iA, tK)) * iA; }
    function pFcTrueKw(iA, tK) { return vStack(iA, tK) * iA / 1000; }
    /* EQ-FCEC-3 RK4 右端：dT/dt = (P_loss_W − h_st·(T−T_amb))/C_st（I 冻结于子步起点——§4 项 3） */
    function rhsT(tK, iFroz) { return (pLossW(iFroz, tK) - H_ST * (tK - T_AMB)) / C_ST; }
    /* 一个 DT_INT 子步的 T_st 推进（经典 RK4；I 冻结 iFroz——FLTH/GT thermo RK4 结构同构） */
    function rk4Step(iFroz, t0) {
      var k1 = rhsT(t0, iFroz);
      var k2 = rhsT(t0 + DT_INT / 2 * k1, iFroz);
      var k3 = rhsT(t0 + DT_INT / 2 * k2, iFroz);
      var k4 = rhsT(t0 + DT_INT * k3, iFroz);
      return t0 + DT_INT / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
    }

    /* 电气面（EQ-FCEC-7 L0 序保留）：plant 家族（none/sensor_drift）走适配器，
       load_step/actuator_fault 走内联级联（RFC §3 S2 验收边界沿 L0——plant 不覆盖两族） */
    var usePlant = fc001PlantCapable(cfg);
    var plant = usePlant ? FL.core.plants.createFc001Plant(cfg) : null;
    /* 内联族（load/actuator）测量通道无偏置（engine bAt 的 isSensor 限定——oracle
       numeric core b = 0.0「非 sensor 轨测量通道无偏置」同口径） */
    function bAt() { return 0; }
    function demandAt(time) { return (isLoad && tStart != null && time >= tStart - 1e-9) ? load0 + magnitude : load0; }

    var series = makeSeries(system, n);
    /* 任务5裁定（§3.1 off 轨零变化最高判据）：三新信号为 on 轨专属列——SystemDef.signals
       带 onTrackOnly 标记（makeSeries 门控跳过），on 轨此处补建；off 轨 timeseries.signals
       保持既有 21 键逐字节不变 ⇒ off 轨 run_hash 零变化。 */
    system.signals.forEach(function (sg) {
      if (sg.onTrackOnly && !series[sg.id]) {
        var arr = new Array(n + 1);
        for (var i0 = 0; i0 <= n; i0++) arr[i0] = null;
        series[sg.id] = arr;
      }
    });

    var I_fc = usePlant ? plant.I_fc_ref : I_fc_base;
    var I_fc_ref = I_fc_base;
    var T_st = T_AMB;
    var intIfc = 0;
    var intB = 0;
    var intDemand = 0;
    var intPfcTrue = 0;   /* ∫P_fc,true dt（kW·s，子步梯形——E_fc 账本，FLTH Q4 idiom） */

    function record(k) {
      var time = t[k];
      var b = usePlant ? plant.bAt(time) : bAt();
      var demand = demandAt(time);
      var iFc = I_fc;
      var iMeas = usePlant ? plant.iMeasAt(iFc, time) : iFc + b;
      var e0v = e0Of(T_st);
      var vSt = vStack(iFc, T_st);
      var pFcTrue = vSt * iFc / 1000;   /* EQ-FCEC-2（on 域电堆半边替换） */
      var pFcMeas = V * iMeas;          /* 测量链 0.4 kV 恒压口径未动（A-fcec-meas/Q5 定案） */
      var pBat = demand - pFcTrue;      /* 理想平衡源口径（定义式记账——r_true ≡ 0 的构造基） */
      var pBatEst = demand - pFcMeas;
      series.I_fc_true_A[k] = iFc;
      series.I_fc_meas_A[k] = iMeas;
      series.I_fc_ref_A[k] = usePlant ? plant.I_fc_ref : I_fc_ref;
      series.bias_A[k] = b;
      series.I_fc_cap_A[k] = (isAct && time >= tStart - 1e-9) ? I_fc_cap : null;
      series.P_fc_true_kW[k] = pFcTrue;
      series.P_fc_meas_kW[k] = pFcMeas;
      series.I_bat_true_A[k] = pBat / V;
      series.I_bat_meas_A[k] = pBat / V;
      series.P_bat_true_kW[k] = pBat;
      series.P_bat_meas_kW[k] = pBat;
      series.P_bat_est_kW[k] = pBatEst;
      series.P_load_demand_kW[k] = demand;
      series.P_load_served_kW[k] = demand;
      series.V_bus_V[k] = 400;
      series.SOC_true_pct[k] = soc0 - (intDemand - intPfcTrue) / (CAP_KWH * 3600) * 100;            /* A-5 真实功率基 */
      series.SOC_est_pct[k] = soc0 - (intDemand - V * intIfc - V * intB) / (CAP_KWH * 3600) * 100;  /* 测量链 L0 逐字（EQ-FCEC-7） */
      series.r_true_kW[k] = pFcTrue + pBat - demand;   /* 定义恒等 ≡ 0（按构造） */
      series.r_meas_kW[k] = pFcMeas + pBat - demand;   /* EQ-FCEC-7：= 0.4·b + (0.4 − V_stack/1000)·I_fc */
      series.valve_cmd_pct[k] = 100;
      series.valve_meas_pct[k] = (isAct && time >= tStart - 1e-9) ? magnitude : 100;
      /* 三新电化学信号（当前状态值重算——非累计值，FLTH §2.3 注记②同款） */
      series.T_st_K[k] = T_st;
      series.V_stack_V[k] = vSt;
      series.P_loss_stack_kW[k] = (e0v - vSt) * iFc / 1000;   /* EQ-FCEC-4 信号面 = P_loss_W/1000 */
    }

    record(0);
    for (var k = 1; k <= n; k++) {
      for (var j = 0; j < SUB; j++) {
        var time = (k - 1) * SUB * DT_INT + j * DT_INT;
        var bSub = usePlant ? plant.bAt(time) : bAt();
        var demandSub = demandAt(time);
        intDemand += demandSub * DT_INT;
        intB += bSub * DT_INT;
        /* ① 电气面（L0 序保留，EQ-FCEC-7）：I_start = 子步起点值（同时是②③的冻结输入） */
        var iStart = I_fc;
        var tSt0 = T_st;
        if (usePlant) {
          var plantStep = plant.stepOf(iStart, time, DT_INT);
          I_fc = plantStep.y;
          intIfc += plantStep.integral;
        } else {
          if (isLoad) {
            /* EQ-6 功率分配器级（A-fcec-dispatch：0.4 kV 名义电压原样——目标每子步移动，
               refStep 弃积分项仅取 .y，L0 逐字） */
            var refStep = foStep(I_fc_ref, (demandSub - P_bat_ref) / V, 2.5, DT_INT);
            I_fc_ref = refStep.y;
          }
          var target;
          if (isAct) target = (tStart != null && time >= tStart - 1e-9) ? Math.min(I_fc_ref, I_fc_cap) : I_fc_ref;
          else target = I_fc_ref;
          var step = foStep(iStart, target, isAct ? 1.5 : 1.2, DT_INT);
          I_fc = step.y;
          intIfc += step.integral;
        }
        /* ② T_st RK4（EQ-FCEC-3；RHS 内 I 冻结于子步起点 iStart——§4 项 3 口径） */
        T_st = rk4Step(iStart, tSt0);
        /* ③ E_fc 账本子步梯形（EQ-FCEC-2 真实功率基，FLTH Q4 同款 idiom） */
        intPfcTrue += 0.5 * (pFcTrueKw(iStart, tSt0) + pFcTrueKw(I_fc, T_st)) * DT_INT;
      }
      record(k);
    }
    return {
      series: series,
      integrals: {
        E_load: intDemand,
        /* EQ-FCEC-2/7（A-5 真实功率基）：E_source = ∫P_fc,true dt；
           E_bat = ∫P_bat,true = ∫P_load − ∫P_fc,true（理想平衡源口径，恒等基组装）；
           E_bat_est 测量链 L0 逐字（0.4 kV 口径） */
        E_source: intPfcTrue,
        E_bat: intDemand - intPfcTrue,
        E_bat_est: intDemand - V * (intIfc + intB),
        intB: intB
      }
    };
  }

  /* ---------------- GT-001 燃气涡轮 ---------------- */
  function simulateGT001(system, cfg, t) {
    /* L1 thermo 轨分派（GTL1_G2B_SPEC_APPROVED v1.0 §2/§2.3，CHG-20261104-12 批准；R-8 守卫）：
       GT 分支内部显式三分派——thermo 走 RK4 热力链（simulateGT001Thermo），
       swing/linear 落入下方 L0b 更新序（既有物理面与 linear/swing 双轨更新序逐字不动）。 */
    if (cfg.inertia_model === 'thermo') return simulateGT001Thermo(system, cfg, t);
    var n = t.length - 1;
    var dt = cfg.dt_s;
    var KJ = 5.0;
    var K_bat = 24;
    var P_bat_ref = 5;
    var Ki = 2.0;
    var tau_g = 2.0;
    /* A-1 惯性双轨（ALINE_MODEL_DEPTH_DESIGN §4 / CHG-20261102-01；D-1 定案双轨）：
       swing（默认）= 完整摇摆方程 df/dt = (P_rotor/K_J)·(f₀/f)，由二次型动能
       E_kin(f) = (K_J·f₀/2)·(f/f₀)² 能量守恒导出，f=f₀ 处精确退化为线性式；
       linear = f≈f₀ 线性化（遗留轨，gt001_v1 golden 逐位口径）。 */
    var inertia = cfg.inertia_model === 'linear' ? 'linear' : 'swing';
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
    /* G2b v1.1 §9 扩展轮：t_clear 后钳位释放（P_gen 回到指令跟随；指令已 wound-up，
       清除瞬态如实呈现——过冲见 A-gt-antiwindup-clamp 与局限声明） */
    var tClear = (isAct && cfg.fault && cfg.fault.t_clear_s != null) ? cfg.fault.t_clear_s : null;

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
      series.f_channel_diff_Hz[k] = series.n_meas_rpm[k] / 60 - series.f_meas_Hz[k];
      series.valve_cmd_pct[k] = clamp(P_gen_cmd / 40 * 100, 0, 100);
      var capped = isAct && time >= tStart - 1e-9 && !(tClear !== null && time >= tClear - 1e-9);
      series.valve_meas_pct[k] = capped ? magnitude : series.valve_cmd_pct[k];
      series.P_gen_cap_kW[k] = capped ? P_gen_cap : null;
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
        if (isAct && tStart != null && time >= tStart - 1e-9 && !(tClear !== null && time >= tClear - 1e-9)) P_gen = Math.min(P_gen, P_gen_cap);

        /* 惯性双轨（A-1）：swing 因子用更新前 f；linear 分支逐位保留 gt001_v1 口径。
           oracle 对应实现：tools/oracle/gt001_oracle.py simulate_run（更新序冻结）。 */
        if (inertia === 'swing') {
          f += residual / KJ * (50 / f) * DT_INT;
        } else {
          f += residual / KJ * DT_INT;
        }

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
        /* E_rotor = K_J·Δf 为线性化能量口径（遗留定义，两种惯性轨同式可算）；
           swing 轨的二次型动能口径 E_kin 与 ∫P_rotor（intResidual）由 metrics.js 承载 */
        E_rotor: KJ * (f - 50),
        intResidual: intResidual
      }
    };
  }

  /* ---------------- GT-001 L1 thermo 轨（燃气涡轮热力链） ---------------- */
  /* GTL1_G2B_SPEC_APPROVED v1.0 §2（方程/常量唯一权威文本）+ §2.3（RK4 分区更新序冻结，
     oracle/引擎双侧复刻）；实现轮 = GTL1-G2b-04（CHG-20261104-12 批准）。数值口径：
     - 物理状态 y = [f, T3]，经典 RK4 固定步长 h = DT_INT = 0.01（6000 子步/60 s，T-B 数值轨，
       不承诺跨语言逐位）；控制指令 u 不进 RK4——每子步按 L0b 更新序显式推进（EQ-GTL1-9：
       cmdNext 先算、子步内立即生效、子步末提交），事件输入（demand/b/u_eff）冻结于子步起点
       右值（t=20/t_clear 阶跃落在子步边界，无子步内间断——§2.3 实现约束）；
     - EQ-GTL1-7 摇摆方程原样保留为机械接口（Q1 定案：P_rotor = P_gen + P_bat − P_load 恒等式，
       电池项进 P_rotor；r_true 定义恒等面零涟漪）；
     - EQ-GTL1-10 钳位在燃料指令域（u_eff = min(u, u_cap)，u_cap = 40·magnitude%；Q5 定案：
       P_gen_cap_kW 保留指令域口径，实际 P_gen 由热力链给出）；清除（t_clear）后 u_eff = u；
     - 手拼防御沿 GT 既有钳位面：u 钳位 [0,40]（EQ-GTL1-9）+ 指令域 u_cap（EQ-GTL1-10），
       inertia_model 由 validateConfig 三枚举守卫；thermo 无新增物理输入键（无 PV-IMP-Q1 类
       新钳位点；u=0 负净功伪影注册于 limitations，注册域内 u_min = 6.98 不可达，§3.3）；
     - 输出网格 record(k)（601 点）：由 (f, T3, u_eff(t_k), demand, b) 重算全部代数量——
       执行器激活窗内物理输出用 u_eff（不是 wound-up 的 u；u 仅作指令域信号展示）；
     - 八新热力信号（§1.2/B-1 定案：全非盲显）仅 thermo 轨填充，swing/linear 遗留轨保持
       makeSeries 的 null 初始化（与 golden gt001_v1/v2 SERIES_IDS 不含热力面对齐）。 */
  function simulateGT001Thermo(system, cfg, t) {
    var n = t.length - 1;
    /* A-1 精确常量（GTL1_G2B_SPEC_APPROVED v1.0 §2.1；k_f/ṁ_a/C_3 按评审 A 独立精确解
       15 位有效数字登记——A-1 方案 a，CHG-20261104-12） */
    var KJ = 5.0;             // 转子等效惯量（kW·s/Hz，L0b 冻结值）
    var K_bat = 24;           // 电池一次调频下垂（kW/Hz，L0b 冻结值）
    var P_bat_ref = 5;        // 电池基准功率（kW，L0b 冻结值）
    var Ki = 2.0;             // 调速器积分增益（kW/(Hz·s)，L0b 冻结值）
    var F0 = 50;              // 额定频率（Hz，L0b 冻结值）
    var T1 = 288.15;          // ISO 参考大气温度（K）
    var P1 = 101.325;         // ISO 参考大气压力（kPa）
    var CP_A = 1.005;         // 空气定压比热（kJ/(kg·K)）
    var A_C = 2 / 7;          // a_c = (γ_a−1)/γ_a，γ_a = 1.4（定比热豁免，§2.2）
    var CP_G = 1.148;         // 燃气定压比热（kJ/(kg·K)）
    var A_T = 1 / 4;          // a_t = (γ_g−1)/γ_g，γ_g = 4/3
    var PI_C0 = 8.0;          // 设计压比（f=f₀）
    var EPS_C = 0.82;         // 压气机 isen 效率（拟稳态常数）
    var EPS_T = 0.86;         // 透平 isen 效率（拟稳态常数）
    var BETA_B = 0.04;        // 燃烧室压损系数（p3 = (1−β_b)·p2）
    var LHV = 50000;          // 燃料低位热值（kJ/kg）
    var ETA_B = 0.99;         // 燃烧效率
    var ETA_M = 0.95;         // 机械+发电机集总效率
    var T3D = 1173.0;         // 设计燃烧室出口温度（K）——T3(0)
    var K_F = 4.070531454334211;      // 燃料增益（EQ-GTL1-11 设计点导出，kW_eq/单位指令）
    var MDOT_A = 0.144299140389011;   // 压气机空气流量（kg/s，常数——流量-转速耦合未建模）
    var C_3 = 0.335983796442745;      // 燃烧室集总热容（kJ/K，C_3 = τ_3·ṁ_g0·cp_g）
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
    var u_cap = isAct ? 40 * magnitude / 100 : null;
    var tClear = (isAct && cfg.fault && cfg.fault.t_clear_s != null) ? cfg.fault.t_clear_s : null;

    function bAt(time) { return (isSensor && tStart != null && time >= tStart - 1e-9) ? magnitude : 0; }
    function demandAt(time) { return (isLoad && tStart != null && time >= tStart - 1e-9) ? load0 + magnitude : load0; }

    var series = makeSeries(system, n);
    var f = 50;
    var T3 = T3D;
    var u = 25;               // 调速器燃料指令（等效功率指令域，钳位 [0,40]，u(0) = 25）
    var intPbat = 0;
    var intPgen = 0;
    var intDemand = 0;
    var intResidual = 0;
    var intEfuel = 0;         // ∫Q_f dt（kW·s，子步左矩形——EQ-GTL1-12）
    var intComb = 0;          // ∫(η_b·Q_f − ṁ_g·cp_g·(T3−T2)) dt（kW·s，左矩形——EQ-GTL1-12 检查式）

    /* 效率链代数输出（EQ-GTL1-1..6；uEff 由调用方按指令域钳位语义给出） */
    function chain(fv, t3v, uEff) {
      var piC = PI_C0 * (fv / F0) * (fv / F0);
      var p2 = piC * P1;
      var t2 = T1 * (1 + (Math.pow(piC, A_C) - 1) / EPS_C);
      var qF = K_F * uEff;
      var mF = qF / LHV;
      var mG = MDOT_A + mF;
      var p3 = (1 - BETA_B) * p2;
      var piT = p3 / P1;
      var t4 = t3v * (1 - EPS_T * (1 - Math.pow(piT, -A_T)));
      var pComp = MDOT_A * CP_A * (t2 - T1);
      var pTurb = mG * CP_G * (t3v - t4);
      var pGen = ETA_M * (pTurb - pComp);
      return { piC: piC, p2: p2, t2: t2, qF: qF, mG: mG, t4: t4, pComp: pComp, pTurb: pTurb, pGen: pGen };
    }

    /* RK4 右端（EQ-GTL1-7/4；p_bat 用阶段值 fv——RK4 一致性，§2.3 审查注记②） */
    function rhsOf(fv, t3v, uEff, demand) {
      var ch = chain(fv, t3v, uEff);
      var pBat = P_bat_ref - K_bat * (fv - 50);
      var pRotor = ch.pGen + pBat - demand;
      return {
        df: (pRotor / KJ) * (F0 / fv),
        dT3: (ETA_B * ch.qF - ch.mG * CP_G * (t3v - ch.t2)) / C_3,
        pGen: ch.pGen, pBat: pBat, pRotor: pRotor, qF: ch.qF
      };
    }

    function record(k) {
      var time = t[k];
      var b = bAt(time);
      var demand = demandAt(time);
      var capped = isAct && tStart != null && time >= tStart - 1e-9 && !(tClear !== null && time >= tClear - 1e-9);
      var uEff = capped ? Math.min(u, u_cap) : u;
      var ch = chain(f, T3, uEff);
      var pBat = P_bat_ref - K_bat * (f - 50);
      var pRotor = ch.pGen + pBat - demand;
      series.f_true_Hz[k] = f;
      series.f_meas_Hz[k] = f;
      series.n_meas_rpm[k] = 60 * (f + b);
      series.P_gen_true_kW[k] = ch.pGen;
      series.P_gen_meas_kW[k] = ch.pGen;
      series.P_gen_cmd_kW[k] = u;
      series.P_bat_true_kW[k] = pBat;
      series.P_bat_meas_kW[k] = pBat;
      series.P_load_demand_kW[k] = demand;
      series.P_load_served_kW[k] = demand;
      series.P_rotor_kW[k] = pRotor;
      series.V_bus_V[k] = 400;
      series.SOC_true_pct[k] = soc0 - intPbat / (CAP_KWH * 3600) * 100;
      series.SOC_est_pct[k] = soc0 - intPbat / (CAP_KWH * 3600) * 100;
      series.r_true_kW[k] = ch.pGen + pBat - demand - pRotor;
      series.f_channel_diff_Hz[k] = series.n_meas_rpm[k] / 60 - series.f_meas_Hz[k];
      series.valve_cmd_pct[k] = clamp(u / 40 * 100, 0, 100);
      series.valve_meas_pct[k] = capped ? magnitude : series.valve_cmd_pct[k];
      series.P_gen_cap_kW[k] = capped ? u_cap : null;
      /* L1 八新热力信号（§1.2 表；eta_cycle = P_gen/Q_f 瞬时功率折算比——§1.2 备注/§3.1 口径） */
      series.T3_out_K[k] = T3;
      series.T2_out_K[k] = ch.t2;
      series.p2_out_kPa[k] = ch.p2;
      series.T4_out_K[k] = ch.t4;
      series.Q_fuel_kW[k] = ch.qF;
      series.P_comp_kW[k] = ch.pComp;
      series.P_turb_kW[k] = ch.pTurb;
      series.eta_cycle_pct[k] = ch.qF > 0 ? ch.pGen / ch.qF * 100 : null;
    }

    record(0);
    for (var k = 1; k <= n; k++) {
      for (var j = 0; j < SUB; j++) {
        var time = (k - 1) * SUB * DT_INT + j * DT_INT;
        var b = bAt(time);
        var demand = demandAt(time);
        /* ① 指令更新（L0b 序保留，EQ-GTL1-9；u 为燃料指令域）+ 指令域钳位（EQ-GTL1-10） */
        var fGov = (monitor && isSensor) ? f : f + b;
        var uNext = clamp(u + Ki * (50 - fGov) * DT_INT, 0, 40);
        var cappedSub = isAct && tStart != null && time >= tStart - 1e-9 && !(tClear !== null && time >= tClear - 1e-9);
        var uEff = cappedSub ? Math.min(uNext, u_cap) : uNext;
        /* ② RK4（物理状态 y = [f, T3]；demand/b/u_eff 冻结于子步起点右值） */
        var k1 = rhsOf(f, T3, uEff, demand);
        var k2 = rhsOf(f + DT_INT / 2 * k1.df, T3 + DT_INT / 2 * k1.dT3, uEff, demand);
        var k3 = rhsOf(f + DT_INT / 2 * k2.df, T3 + DT_INT / 2 * k2.dT3, uEff, demand);
        var k4 = rhsOf(f + DT_INT * k3.df, T3 + DT_INT * k3.dT3, uEff, demand);
        var fNew = f + DT_INT / 6 * (k1.df + 2 * k2.df + 2 * k3.df + k4.df);
        var t3New = T3 + DT_INT / 6 * (k1.dT3 + 2 * k2.dT3 + 2 * k3.dT3 + k4.dT3);
        /* ③ 子步末提交：u = u_next；能量累计（E_fuel 左矩形 Q_f·h；E_gen/P_bat 梯形——L0b 面惯例） */
        var pGenEnd = chain(fNew, t3New, uEff).pGen;
        var pbatEnd = P_bat_ref - K_bat * (fNew - 50);
        intPgen += 0.5 * (k1.pGen + pGenEnd) * DT_INT;
        intPbat += 0.5 * (k1.pBat + pbatEnd) * DT_INT;
        intDemand += demand * DT_INT;
        intResidual += k1.pRotor * DT_INT;
        intEfuel += k1.qF * DT_INT;
        intComb += k1.dT3 * C_3 * DT_INT;
        u = uNext;
        f = fNew;
        T3 = t3New;
      }
      record(k);
    }
    return {
      series: series,
      integrals: {
        E_load: intDemand,
        E_source: intPgen,
        E_bat: intPbat,
        /* E_rotor = K_J·Δf 线性化能量口径（遗留定义沿袭，metrics.js 承载三口径换算） */
        E_rotor: KJ * (f - 50),
        intResidual: intResidual,
        E_fuel: intEfuel,     // kW·s（EQ-GTL1-12；metrics.js → E_fuel_kWh）
        intComb: intComb      // kW·s（EQ-GTL1-12 检查式；metrics.js → E_comb_net_kWh）
      }
    };
  }

  /* ---------------- PV-001 光伏并网等效 ---------------- */
  /* PV001_G2B_SPEC_APPROVED v1.0 §1.3 EQ-PV-1..7（PV-G2b-04a / CHG-20261104-10 批准）。
     数值口径：foStep 同构复刻（SUB×DT_INT 子步精确指数）——PV 各轨事件后目标恒定 →
     分段精确指数无离散误差；EQ-PV-4 初值 P_pv(0)=k·G0·φ_T（PV-DRAFT-Q2 定案）；
     EQ-PV-3 monitor 语义 = 偏置不进入物理回路（与 FL-001 同构）；
     PV-IMP-Q1：手拼配置有效辐照度 < 0 时引擎侧钳 0（批准域内为 no-op）。 */
  function simulatePV001(system, cfg, t) {
    var n = t.length - 1;
    var dt = cfg.dt_s;
    var K = 0.01;      // EQ-PV-2：k = P_STC/G_STC = 10/1000 kW/(W/m²)
    var PHI_T = 1.0;   // A-pv-temp-const：T_cell ≡ 25 °C → φ_T = 1（γ_T = −0.004 /°C 登记不激活）
    var TAU = 1.0;     // EQ-PV-4：τ_mppt
    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var magnitude = faulted ? cfg.fault.params.magnitude : 0;
    var monitor = cfg.feedback_mode === 'monitor';
    var load0 = cfg.initial.load_kW;
    var G0 = cfg.initial.G0_W_m2;
    var isSensor = family === 'sensor_drift';
    var isShading = family === 'shading_step';

    /* EQ-PV-1：输入与测量通道（t0 处右极限，post 采样行语义，同 FL/FC bAt 口径） */
    function bAt(time) { return (isSensor && tStart != null && time >= tStart - 1e-9) ? magnitude : 0; }
    function dgAt(time) { return (isShading && tStart != null && time >= tStart - 1e-9) ? magnitude : 0; }
    /* PV-IMP-Q1 钳位：G_true < 0 → 0（批准参数域 G0∈[300,1000]、ΔG≤300 内恒不触发） */
    function gTrueAt(time) { return Math.max(G0 - dgAt(time), 0); }
    function gMeasAt(time) { return gTrueAt(time) + bAt(time); }
    /* EQ-PV-3：G_loop = G_meas（closed_loop）/ G_true（monitor） */
    function gLoopAt(time) { return monitor ? gTrueAt(time) : gMeasAt(time); }

    var series = makeSeries(system, n);
    var P_pv = K * G0 * PHI_T;   /* EQ-PV-4（v1.0 Q2 定案）：P_pv(0) = k·G0·φ_T */
    var intPpv = 0;              /* ∫P_pv,true dt（kW·s，子步解析积分） */
    var intPpvEst = 0;           /* ∫P_pv,est dt（kW·s，分段常值左缘矩形 = 事件感知解析积分） */
    var intDemand = 0;           /* ∫P_load dt（kW·s） */

    function record(k) {
      var time = t[k];
      var gTrue = gTrueAt(time);
      var gMeas = gMeasAt(time);
      var b = bAt(time);
      var pPv = P_pv;
      var pAc = pPv;
      var pGrid = load0 - pPv;
      var pPvEst = K * gMeas * PHI_T;   /* A-pv-est-channel：恒用测量辐照度 */
      series.G_true_W_m2[k] = gTrue;
      series.G_meas_W_m2[k] = gMeas;
      series.bias_W_m2[k] = b;
      series.P_mpp_true_kW[k] = K * gTrue * PHI_T;
      series.P_mpp_ref_kW[k] = K * gLoopAt(time) * PHI_T;
      series.P_pv_true_kW[k] = pPv;
      series.P_pv_meas_kW[k] = pPv;     /* 健康通道 */
      series.P_pv_est_kW[k] = pPvEst;
      series.d_pv_kW[k] = pPv - pPvEst; /* EQ-PV-6：代数恒等 */
      series.P_ac_kW[k] = pAc;
      series.P_grid_true_kW[k] = pGrid;
      series.P_grid_meas_kW[k] = pGrid; /* 健康通道 */
      series.P_load_demand_kW[k] = load0;
      series.P_load_served_kW[k] = load0;
      series.V_bus_V[k] = 400;
      series.r_true_kW[k] = pPv + pGrid - load0;        /* ≡ 0（定义恒等） */
      series.r_meas_kW[k] = pPv + pGrid - load0;        /* ≡ 0（全功率通道健康） */
    }

    record(0);
    for (var k = 1; k <= n; k++) {
      for (var j = 0; j < SUB; j++) {
        var time = (k - 1) * SUB * DT_INT + j * DT_INT;
        intDemand += load0 * DT_INT;
        intPpvEst += K * gMeasAt(time) * PHI_T * DT_INT;
        var target = K * gLoopAt(time) * PHI_T;   /* EQ-PV-3：事件后目标恒定 → 精确指数 */
        var step = foStep(P_pv, target, TAU, DT_INT);   /* EQ-PV-4：一阶跟随 */
        P_pv = step.y;
        intPpv += step.integral;
      }
      record(k);
    }
    return {
      series: series,
      integrals: {
        E_load: intDemand,
        E_pv_true: intPpv,
        E_pv_est: intPpvEst,
        E_grid: intDemand - intPpv   /* EQ-PV-5/EQ-PV-7 定义恒等：E_pv + E_grid = E_load */
      }
    };
  }

  /* ---------------- WT-001 风电机组（L0b · 机械动态行为级演示，单机并网等效） ----------------
     WT001_G2B_SPEC_APPROVED v1.0 §1.3 EQ-WT-1..9（方程/常量唯一权威文本，CHG-20261107-01 批准）
     + §1.3-b（冻结更新序，oracle/引擎双侧复刻）。数值口径：
     - 状态 (ω, β, P_wt)；子步 h = DT_INT = 0.01（6000 子步/60 s）；事件输入（b/Δv）冻结于
       子步起点右值（t=20 阶跃落在子步边界，无子步内间断——§1.3-b 审查注记④实现约束）；
     - 冻结更新序（§1.3-b）：① 输入与控制面（v_true/v_ctrl/v_est/β_ref/P_ref 全用子步起点
       右值；P_ref = min(k_opt·ω³, P_rated, k_v·v_ctrl³) 三支路 EQ-WT-4/5；v_ctrl 的 monitor
       语义 = 偏置不进入物理回路、v_est 恒用测量 A-wt-est-channel）→ ② P_wt 精确指数 +
       E_wt 子步解析积分（EQ-WT-6 前段）→ ③ β 精确指数、pitch_stuck 激活窗 β ≡ β_stuck 钉扎
       （位置强制——WT-DRAFT-Q2 定案；EQ-WT-6 后段）→ ④ ω 前向 Euler（RHS 用②③后值与
       子步起点 ω、冻结 v_true；EQ-WT-7）；
     - 常量硬编码 §1.3-a 登记值（15 位；λ_opt/Cp_max 为数值最大化登记可达精度——不得运行内
       重求导，批准轮 A-2 定案）；Cp 经验解析式（EQ-WT-2，教学惯例参数组，非实测、非设备
       辨识）；运算序按方程文本，oracle 同序复刻；
     - ω 有效性域守卫（WT-IMP-Q1 裁定：engine 侧钳位）：每子步 ω 更新后钳位至
       ω ≥ 0.5·ω_opt(v0) = 0.5·λ_opt·v0/R——注册域内恒不触发（§3.5 最小裕度 11.5%）；手拼
       配置越下界（停机/发散域）时钳位防 ω=0 分母奇点（EQ-WT-7）；本注释即该裁定的
       run 元数据登记位（PV-IMP-Q1 引擎侧钳位 + 代码注释先例）；
     - record(601 点)：状态行取子步起点值（t=20.0 行 = 状态 pre + 输入 post 右值——PV001
       锚点口径 P_pv(20.1) = 11 − e^(−0.1) 同款）；代数量由 (ω, β, P_wt, v_true, v_ctrl,
       v_est) 重算；beta_stuck_deg 仅 pitch_stuck 场景自 t_start 起有值（30°·magnitude%，
       事件域信号——I_bat_cap_A 先例）；bias_ms 全程有值 0/−B；r_true/r_meas 定义恒等 ≡ 0
       （EQ-WT-8）；E_wt,est 事件感知解析积分（v_est 分段常值，EQ-WT-9）。 */
  function simulateWT001(system, cfg, t) {
    var n = t.length - 1;
    /* §1.3-a 常量表（登记值硬编码，15 位——不得运行内重求导，A-2 定案） */
    var RHO = 1.225;                    // 空气密度（kg/m³，ISO 常温教学口径）
    var C1 = 0.5176;                    // Cp 经验式系数组 c₁…c₆（教学惯例值，非实测）
    var C2 = 116;
    var C3 = 0.4;
    var C4 = 5;
    var C5 = 21;
    var C6 = 0.0068;
    var LAMBDA_OPT = 8.100117280602777; // 最优叶尖速比（数值最大化登记可达精度，非闭式可复现值）
    var K_V = 13.717421124828531;       // 最优功率曲线系数 ≡ 可用功率钳位系数（W/(m/s)³ = 10000/729）
    var A_ROT = 46.656738009239717;     // 风轮扫掠面积（m²，设计点导出）
    var R_ROT = 3.853738569938033;      // 风轮半径（m，设计点导出）
    var K_OPT = 1.477220410253986;      // MPPT 最优增益（W/(rad/s)³，设计点导出）
    var P_RATED = 15000;                // 额定功率封顶（W）
    var TAU_E = 1.0;                    // 变流器一阶时间常数（s）
    var TAU_B = 0.5;                    // 变桨执行器一阶时间常数（s）
    var J_WT = 300;                     // 传动链单质量等效惯量（kg·m²）
    var K_BETA = 3.0;                   // 桨距比例增益（°/(rad/s)）
    var BETA_MAX = 30;                  // 桨距上限（°，卡涩满度 β_full 同值）
    var OMEGA_N = 21.654524572087702;   // 桨距调节转速参考（rad/s，设计点导出）
    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var magnitude = faulted ? cfg.fault.params.magnitude : 0;
    var monitor = cfg.feedback_mode === 'monitor';
    var load0 = cfg.initial.load_kW;
    var v0 = cfg.initial.v0_ms;
    var isSensor = family === 'sensor_drift';       // v_sensor_bias（风速传感器偏置——低估方向）
    var isStuck = family === 'actuator_fault';      // pitch_stuck（变桨卡涩——位置强制）
    var isGust = family === 'gust_step';            // 阵风阶跃（物理输入）
    var betaStuck = isStuck ? BETA_MAX * magnitude / 100 : null;   // 30°·magnitude%

    /* EQ-WT-2：Cp(λ,β) = c₁(c₂/λᵢ − c₃β − c₄)·e^(−c₅/λᵢ) + c₆λ；
       λᵢ = 1/(1/(λ+0.08β) − 0.035/(β³+1))（运算序按方程文本，oracle 同序复刻） */
    function cpCoeff(lambda, beta) {
      var li = 1 / (1 / (lambda + 0.08 * beta) - 0.035 / (beta * beta * beta + 1));
      return C1 * (C2 / li - C3 * beta - C4) * Math.exp(-C5 / li) + C6 * lambda;
    }
    /* EQ-WT-1：输入通道（t0 处右极限，post 采样行语义，同 FL/FC/PV bAt 口径） */
    function vTrueAt(time) { return (isGust && tStart != null && time >= tStart - 1e-9) ? v0 + magnitude : v0; }
    function bWAt(time) { return (isSensor && tStart != null && time >= tStart - 1e-9) ? -magnitude : 0; }

    var series = makeSeries(system, n);
    var omega = LAMBDA_OPT * v0 / R_ROT;   /* EQ-WT-7：ω(0) = λ_opt·v0/R（登记值闭式，A-2②） */
    var beta = 0;                          /* EQ-WT-6：β(0) = 0 */
    var pWt = K_V * v0 * v0 * v0;          /* EQ-WT-6：P_wt(0) = k_v·v0³（W；v0=9 → 10 kW 设计点） */
    var eWt = 0;        /* ∫P_wt,true dt（kW·s，② 子步解析积分） */
    var eWtEst = 0;     /* ∫k_v·v_est³ dt（kW·s，事件感知解析积分——v_est 分段常值） */
    var intDemand = 0;  /* ∫P_load dt（kW·s） */
    /* ω 有效性域下界（WT-IMP-Q1）：0.5·ω_opt(v0) = 0.5·λ_opt·v0/R（登记值闭式） */
    var omegaMin = 0.5 * LAMBDA_OPT * v0 / R_ROT;

    function record(k) {
      var time = t[k];
      var vTrue = vTrueAt(time);
      var bW = bWAt(time);
      var vCtrl = (monitor && isSensor) ? vTrue : vTrue + bW;   /* EQ-WT-1 控制面 */
      var vEst = vTrue + bW;                                    /* A-wt-est-channel：恒用测量 */
      var lambda = omega * R_ROT / vTrue;
      var cp = cpCoeff(lambda, beta);
      var pWtKw = pWt / 1000;
      var pWtEstKw = K_V * vEst * vEst * vEst / 1000;
      var pGridKw = load0 - pWtKw;                              /* EQ-WT-8：馈线补差（受电为正） */
      series.v_true_ms[k] = vTrue;
      series.v_meas_ms[k] = vCtrl;      /* §1.2：v_meas_ms 承载控制面读数 v_ctrl */
      series.bias_ms[k] = bW;
      series.n_rotor_rpm[k] = omega * 30 / Math.PI;
      series.lambda_tip[k] = lambda;
      series.cp_coeff[k] = cp;
      series.beta_pitch_deg[k] = beta;
      series.beta_cmd_deg[k] = clamp(K_BETA * (omega - OMEGA_N), 0, BETA_MAX);   /* EQ-WT-5 */
      series.beta_stuck_deg[k] = (isStuck && time >= tStart - 1e-9) ? betaStuck : null;
      series.P_aero_kW[k] = cp * 0.5 * RHO * A_ROT * vTrue * vTrue * vTrue / 1000;   /* EQ-WT-3 */
      series.P_wt_ref_kW[k] = Math.min(K_OPT * omega * omega * omega, P_RATED, K_V * vCtrl * vCtrl * vCtrl) / 1000;  /* EQ-WT-4 三支路 */
      series.P_wt_true_kW[k] = pWtKw;
      series.P_wt_meas_kW[k] = pWtKw;   /* 健康通道 */
      series.P_wt_est_kW[k] = pWtEstKw;
      series.d_wt_kW[k] = pWtKw - pWtEstKw;   /* EQ-WT-8：代数恒等（测量链一致性，不是能量损失） */
      series.P_grid_true_kW[k] = pGridKw;
      series.P_grid_meas_kW[k] = pGridKw; /* 健康通道 */
      series.P_load_demand_kW[k] = load0;
      series.P_load_served_kW[k] = load0;
      series.V_bus_V[k] = 400;          /* MODEL_ASSUMPTION（A-wt-ideal-bus，非仿真状态） */
      series.r_true_kW[k] = pWtKw + pGridKw - load0;   /* EQ-WT-8：定义恒等 ≡ 0 */
      series.r_meas_kW[k] = pWtKw + pGridKw - load0;   /* EQ-WT-8：全功率通道健康 ≡ 0 */
    }

    record(0);
    for (var k = 1; k <= n; k++) {
      for (var j = 0; j < SUB; j++) {
        var time = (k - 1) * SUB * DT_INT + j * DT_INT;
        /* ① 输入与控制面（全部用子步起点右值；EQ-WT-1/4/5） */
        var vTrue = vTrueAt(time);
        var bW = bWAt(time);
        var vCtrl = (monitor && isSensor) ? vTrue : vTrue + bW;
        var vEst = vTrue + bW;
        var betaRef = clamp(K_BETA * (omega - OMEGA_N), 0, BETA_MAX);
        var pRef = Math.min(K_OPT * omega * omega * omega, P_RATED, K_V * vCtrl * vCtrl * vCtrl);
        intDemand += load0 * DT_INT;
        eWtEst += K_V * vEst * vEst * vEst * DT_INT / 1000;   /* E_wt,est（v_est 分段常值 → 精确） */
        /* ② P_wt 精确指数（EQ-WT-6 前段）+ E_wt 子步解析积分 */
        var pWtOld = pWt;
        var aE = Math.exp(-DT_INT / TAU_E);
        pWt = pRef + (pWtOld - pRef) * aE;
        eWt += (pRef * DT_INT + (pWtOld - pRef) * TAU_E * (1 - aE)) / 1000;
        /* ③ β 精确指数（EQ-WT-6 后段）；pitch_stuck 激活窗 β ≡ β_stuck（钉扎，位置强制——Q2） */
        if (isStuck && tStart != null && time >= tStart - 1e-9) {
          beta = betaStuck;
        } else {
          var aB = Math.exp(-DT_INT / TAU_B);
          beta = betaRef + (beta - betaRef) * aB;
        }
        /* ④ ω 前向 Euler（EQ-WT-7；RHS 用②③后的 P_wt/β 与子步起点 ω、冻结 v_true） */
        var lambda = omega * R_ROT / vTrue;
        var pAero = cpCoeff(lambda, beta) * 0.5 * RHO * A_ROT * vTrue * vTrue * vTrue;
        omega = omega + DT_INT * (pAero - pWt) / (J_WT * omega);
        /* ω 有效性域守卫（WT-IMP-Q1：engine 侧钳位；注册域内恒不触发） */
        if (omega < omegaMin) omega = omegaMin;
      }
      record(k);
    }
    return {
      series: series,
      integrals: {
        E_load: intDemand,
        E_wt_true: eWt,          /* kW·s（② 子步解析积分） */
        E_wt_est: eWtEst,        /* kW·s（事件感知解析积分；ΔE_wt = E_est − E_true） */
        E_grid: intDemand - eWt  /* EQ-WT-8/EQ-WT-9 定义恒等：E_wt + E_grid = E_load */
      }
    };
  }

  /* ---------------- MG-001 微电网多源聚合（聚合层 L0 · 单母线并网等效） ----------------
     MG001_G2B_SPEC_APPROVED v1.0 §1.4 EQ-MG-1..9（MG-G2b-04 / CHG-20261110-01 批准链；
     R-5 守卫：显式分派分支，禁止静默落入 GT 物理）。数值口径：
     - 聚合语义 = Run 内组合复用（§1.2）：内部按子轨固定面构造标准子配置
       （FL.core.createConfig 产物），调用既有 simulatePV001/simulateWT001 获取源轨序列
       （EQ-MG-2 复用声明——不重写任何源方程），再在输出采样网格（601 点）上逐点执行
       聚合代数（EQ-MG-3/4）；MG 层自身无子步循环、无新 ODE（feedback_mode 透传）；
     - 并网/孤岛两相（EQ-MG-3/4）+ BESS 角色相位段（EQ-MG-5：并网计划跟踪 / 孤岛平衡填补
       clamp(±8) / 重连恢复计划）；r_true/r_meas 定义恒等（EQ-MG-6）；
     - SOC = 事件感知分段解析积分（EQ-MG-7——Q1(b) 定案结构推论：island Run 源恒健康 ⇒
       chase 分段常值 ⇒ clamp 分段常值 ⇒ P_bess 分段常值；段面 = mg001_oracle run_structure
       同构段表，min() 端点钳位使端点积分逐位精确）；
     - 能量 = 事件感知分段解析积分（EQ-MG-8；E_pv/E_wt 复用源轨积分 integrals，
       E_grid := E_served + E_dump − E_pv − E_wt − E_bess 恒等导出——采样网格右端点和的
       边界伪差显式排除）；V_bus = 400 V 常列（EQ-MG-9 模型假设）；
     - P_bess_chase_kW 为唯一事件域 null 列（岛窗外 null——I_bat_cap_A/beta_stuck_deg
       事件域 null 先例；makeSeries null 初始化 + 岛窗行填充）；island_state 全程有值。 */
  function simulateMG001(system, cfg, t) {
    var n = t.length - 1;
    var duration = cfg.duration_s;
    var P_CLAMP_KW = 8;      // A-mg-bess-structural-limit：BESS 结构功率域 [−8, +8] kW
    var CAP_KWH_MG = 40;     // BESS 电池能量面（FL-001 电气面：40 kWh / 400 V、P=0.4·I 换算）
    var V_BUS_MG = 400;      // EQ-MG-9 母线电压（模型假设，非仿真状态）
    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var magnitude = faulted ? cfg.fault.params.magnitude : 0;
    /* EQ-MG-1：island(t) = 1(t≥t_start)·1(t<t_clear)；t_clear 缺省 = 窗末持续脱离 */
    var isIsland = faulted && family === 'island_event';
    var tClear = (isIsland && cfg.fault.t_clear_s != null) ? cfg.fault.t_clear_s : duration;
    var load0 = cfg.initial.load_kW;
    var pSched = cfg.initial.p_sched_kW;
    var soc0 = cfg.initial.SOC_pct;

    /* EQ-MG-2 源轨复用（Run 内组合复用——§1.2 固定面：PV G0=1000、WT v0=9、无 sensor/
       actuator 联动（Q7 定案）；feedback_mode 透传；shading/gust 幅值 = MG 族参数原样
       透传源域）。 */
    var pvSystem = rawSystem('PV-001');
    var pvCfg = FL.core.createConfig('PV-001', {
      feedback_mode: cfg.feedback_mode,
      fault: (faulted && family === 'shading_link')
        ? { family: 'shading_step', params: { magnitude: magnitude }, t_start_s: tStart }
        : { family: 'none' }
    });
    var pvTrack = simulatePV001(pvSystem, pvCfg, t);
    var wtSystem = rawSystem('WT-001');
    var wtCfg = FL.core.createConfig('WT-001', {
      feedback_mode: cfg.feedback_mode,
      fault: (faulted && family === 'gust_link')
        ? { family: 'gust_step', params: { magnitude: magnitude }, t_start_s: tStart }
        : { family: 'none' }
    });
    var wtTrack = simulateWT001(wtSystem, wtCfg, t);

    /* EQ-MG-1/3/4/5 相位段表（事件感知分段解析积分段面——mg001_oracle run_structure
       同构；段值 = 解析名义值：岛内 chase 名义 = load0 − 20（源固定面健康局 10+10，
       §1.2/§3.4；WT 健康轨 ±1e-9 wiggle 被 clamp 吸收，不影响分段常值前提））。 */
    var segs;
    if (isIsland) {
      var chaseNom = load0 - 10 - 10;
      var bessIsland = clamp(chaseNom, -P_CLAMP_KW, P_CLAMP_KW);
      var shedIsland = Math.max(0, chaseNom - bessIsland);
      var dumpIsland = Math.max(0, bessIsland - chaseNom);
      segs = {
        load: [[0, duration, load0]],
        bess: [[0, tStart, pSched], [tStart, tClear, bessIsland], [tClear, duration, pSched]],
        shed: [[0, tStart, 0], [tStart, tClear, shedIsland], [tClear, duration, 0]],
        dump: [[0, duration, dumpIsland]]
      };
    } else {
      var dpLoad = (faulted && family === 'load_step') ? magnitude : 0;
      segs = {
        load: dpLoad !== 0 ? [[0, tStart, load0], [tStart, duration, load0 + dpLoad]]
                           : [[0, duration, load0]],
        bess: [[0, duration, pSched]],   /* EQ-MG-5 计划跟踪不受聚合输入阶跃/子轨事件影响 */
        shed: [[0, duration, 0]],
        dump: [[0, duration, 0]]
      };
    }
    /* 分段解析积分 ∫[0, tEnd]（段值常值；事件边界处测度为零——右极限 post 语义，
       段值自其左端点起生效；min() 端点钳位使 t_end=60 端点积分逐位精确） */
    function segIntegral(list, tEnd) {
      var total = 0;
      for (var s = 0; s < list.length; s++) {
        var u = Math.min(tEnd, list[s][1]) - list[s][0];
        if (u > 0) total += list[s][2] * u;
      }
      return total;
    }

    var series = makeSeries(system, n);
    for (var i = 0; i <= n; i++) {
      var ti = t[i];
      var load = (faulted && family === 'load_step' && ti >= tStart) ? load0 + magnitude : load0;   /* EQ-MG-1 */
      var pPv = pvTrack.series.P_pv_true_kW[i];    /* EQ-MG-2（源轨复用） */
      var pWt = wtTrack.series.P_wt_true_kW[i];    /* EQ-MG-2（源轨复用） */
      var isl = isIsland && ti >= tStart && ti < tClear;   /* EQ-MG-1（事件边界 = 0.1 s 网格精确点） */
      var pBess, pShed, pDump, pServed, pGrid;
      if (isl) {                                   /* EQ-MG-4（孤岛面重整） */
        var chase = load - pPv - pWt;              /*   平衡填补目标（钳位前） */
        pBess = clamp(chase, -P_CLAMP_KW, P_CLAMP_KW);   /*   钳位 ±8（结构域） */
        pShed = Math.max(0, chase - pBess);        /*   缺口卸载 */
        pDump = Math.max(0, pBess - chase);        /*   盈余倾卸 */
        pServed = load - pShed;
        pGrid = 0;                                 /*   孤岛 P_grid ≡ 0 */
        series.P_bess_chase_kW[i] = chase;
      } else {                                     /* EQ-MG-3（并网面） */
        pBess = pSched;                            /* EQ-MG-5 计划跟踪 */
        pShed = 0;
        pDump = 0;
        pServed = load;
        pGrid = load - pPv - pWt - pBess;          /*   理想双向补差（受电为正） */
      }
      series.island_state[i] = isl ? 1 : 0;
      series.P_pv_kW[i] = pPv;
      series.P_wt_kW[i] = pWt;
      series.P_bess_kW[i] = pBess;
      series.P_sched_kW[i] = pSched;
      series.P_load_demand_kW[i] = load;
      series.P_load_served_kW[i] = pServed;
      series.P_grid_true_kW[i] = pGrid;
      series.P_grid_meas_kW[i] = pGrid;            /* 测量通道健康（§1.3） */
      series.P_shed_kW[i] = pShed;
      series.P_dump_kW[i] = pDump;
      series.V_bus_V[i] = V_BUS_MG;                /* EQ-MG-9（模型假设） */
      var soc = soc0 - 100 * segIntegral(segs.bess, ti) / (3600 * CAP_KWH_MG);
      series.SOC_true_pct[i] = soc;                /* EQ-MG-7 分段解析 */
      series.SOC_est_pct[i] = soc;                 /* 同式测量通道（全通道健康 ⇒ 逐位同值） */
      series.SOC_err_pp[i] = series.SOC_est_pct[i] - series.SOC_true_pct[i];
      var rTrue = pPv + pWt + pBess + pGrid - pServed - pDump;   /* EQ-MG-6 定义恒等 */
      var rMeas = pPv + pWt + pBess + series.P_grid_meas_kW[i] - pServed - pDump;
      series.r_true_kW[i] = rTrue;
      series.r_meas_kW[i] = rMeas;
    }

    /* EQ-MG-8 能量口径：分段常值信号按段解析；E_pv/E_wt 复用源轨积分；
       E_grid 由恒等导出（避免对时变 P_grid 序列做数值积分）。 */
    var ePv = pvTrack.integrals.E_pv_true / 3600;
    var eWt = wtTrack.integrals.E_wt_true / 3600;
    var eBess = segIntegral(segs.bess, duration) / 3600;
    var eDemand = segIntegral(segs.load, duration) / 3600;
    var eShed = segIntegral(segs.shed, duration) / 3600;
    var eDump = segIntegral(segs.dump, duration) / 3600;
    var eServed = eDemand - eShed;
    var eGrid = eServed + eDump - ePv - eWt - eBess;

    return {
      series: series,
      integrals: {
        E_load: segIntegral(segs.load, duration),      /* kW·s（metrics 通用面 E_load_kWh 同源） */
        /* EQ-MG-8 能量账本（kWh；mg001_v1 REGISTERED_SCALARS 键面同名——simulate 指标
           补全块经此承载，见 simulate() MG-001 分支注释） */
        E_pv_kWh: ePv,
        E_wt_kWh: eWt,
        E_bess_kWh: eBess,
        E_grid_kWh: eGrid,
        E_load_demand_kWh: eDemand,
        E_load_served_kWh: eServed,
        E_shed_kWh: eShed,
        E_dump_kWh: eDump
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
      /* FL-001 thermal on（EQ-FLTH-6 定义恒等扩展，Q3 定案）：P_loss 为模型已知结构项，
         测量链噪声 fixup 的 r_meas 同步扣 −P_loss——0.4·b 教学锚点在两深度一致；
         off 轨不进入该分支（原逐字路径零变化）。 */
      var thermalOn = cfg.thermal_model === 'on';
      for (k = 0; k < series.I_bat_meas_A.length; k++) {
        series.P_bat_meas_kW[k] = 0.4 * series.I_bat_meas_A[k];
        series.r_meas_kW[k] = series.P_gen_true_kW[k] + series.P_bat_meas_kW[k] - series.P_load_served_kW[k];
        if (thermalOn) series.r_meas_kW[k] -= series.P_loss_kW[k];
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
        series.f_channel_diff_Hz[k] = series.n_meas_rpm[k] / 60 - series.f_meas_Hz[k];
      }
    } else if (system.id === 'PV-001') {
      /* PV-001 新轨：EMS 估计恒用（含噪声的）测量辐照度，d_pv/r_meas 随测量通道重算
         （与 FL/FC 的测量链 fixup 同构；A-pv-est-channel） */
      var Kpv = 0.01;   /* EQ-PV-2 k（φ_T = 1，A-pv-temp-const） */
      for (k = 0; k < series.G_meas_W_m2.length; k++) {
        series.P_pv_est_kW[k] = Kpv * series.G_meas_W_m2[k];
        series.d_pv_kW[k] = series.P_pv_meas_kW[k] - series.P_pv_est_kW[k];
        series.r_meas_kW[k] = series.P_pv_meas_kW[k] + series.P_grid_meas_kW[k] - series.P_load_served_kW[k];
      }
    } else if (system.id === 'WT-001') {
      /* WT-001 新轨（WT001_G2B_SPEC_APPROVED v1.0 §1.2 / EQ-WT-8）：噪声开启时测量链派生量
         随含噪测量通道重算（与 PV-001 测量链 fixup 同构；A-wt-est-channel）。估计通道恒用
         测量风速（v_est = v_true + b，monitor 不切换）——v_meas_ms 列承载控制面读数
         （monitor 下不含偏置），故估计通道按同一噪声实现（seed/信号 id/index 与上方加噪
         循环一致）重算，而非读列。 */
      var KwNoise = 13.717421124828531 / 1000;   /* EQ-WT-4 k_v（W/(m/s)³ → kW/(m/s)³） */
      var sigmaV = (signalMeta(system, 'v_meas_ms') || {}).noiseSigma || 0;
      for (k = 0; k < series.v_meas_ms.length; k++) {
        var nV = sigmaV > 0 ? noise.level * sigmaV * FL.rng.noiseAt(seed, 'v_meas_ms', k) : 0;
        var vEstN = series.v_true_ms[k] + series.bias_ms[k] + nV;
        series.P_wt_est_kW[k] = KwNoise * vEstN * vEstN * vEstN;
        series.d_wt_kW[k] = series.P_wt_meas_kW[k] - series.P_wt_est_kW[k];
        series.r_meas_kW[k] = series.P_wt_meas_kW[k] + series.P_grid_meas_kW[k] - series.P_load_served_kW[k];
      }
    }
  }

  /* ================================================================== */
  /* 事件 / 快照 / 真值                                                  */
  /* ================================================================== */
  var EVENT_TYPE = { sensor_drift: 'sensor_bias', load_step: 'load_step', actuator_fault: 'actuator_limit', shading_step: 'shading_step', gust_step: 'gust_step',
    /* MG-001 四族（MG001_G2B_SPEC_APPROVED v1.0 §2；event_type = 族名——PV/WT 物理输入族
       同款约定；island_event 双事件面 EV-001=island_event/EV-002=island_reconnect，
       mg001_v1 golden 事件编码同源） */
    shading_link: 'shading_link', gust_link: 'gust_link', island_event: 'island_event' };
  var TARGET_SIGNAL = {
    'FL-001': { sensor_drift: 'bias_A', load_step: 'P_load_demand_kW', actuator_fault: 'I_bat_cap_A' },
    'FC-001': { sensor_drift: 'bias_A', load_step: 'P_load_demand_kW', actuator_fault: 'I_fc_cap_A' },
    'GT-001': { sensor_drift: 'n_meas_rpm', load_step: 'P_load_demand_kW', actuator_fault: 'P_gen_cap_kW' },
    /* PV-001 新轨（PV001_G2B_SPEC_APPROVED §2）：sensor_drift 注入点为辐照度偏置，
       shading_step 为物理输入阶跃（有效真实辐照度） */
    'PV-001': { sensor_drift: 'bias_W_m2', shading_step: 'G_true_W_m2' },
    /* WT-001 新轨（WT001_G2B_SPEC_APPROVED v1.0 §1.2/§2）：sensor_drift 注入点为风速测量
       偏置（低估方向，bias_ms = −B）；pitch_stuck（actuator_fault）事件域信号为卡涩桨距角
       （位置强制——Q2 定案，beta_stuck_deg 自 t_start 起有值）；gust_step 为物理输入阶跃
       （有效真实风速 v_true） */
    'WT-001': { sensor_drift: 'bias_ms', actuator_fault: 'beta_stuck_deg', gust_step: 'v_true_ms' },
    /* MG-001 新轨（MG001_G2B_SPEC_APPROVED v1.0 §2）：load_step 为聚合输入阶跃（P_load_demand_kW）；
       shading_link/gust_link 为子轨联动注入（目标信号 = 子轨馈入通道 P_pv_kW/P_wt_kW）；
       island_event 为拓扑分断（目标信号 = 孤岛状态量 island_state——mg001_v1 golden
       events target_signal 同源） */
    'MG-001': { load_step: 'P_load_demand_kW', shading_link: 'P_pv_kW', gust_link: 'P_wt_kW', island_event: 'island_state' }
  };

  function buildLabel(system, cfg) {
    var mode = cfg.feedback_mode === 'monitor' ? '仅监测' : '闭环';
    if (cfg.fault.family === 'none') return mode + ' · 无故障基准';
    var def = findFaultDef(system, cfg.fault.family);
    var p = def && def.params[0] ? def.params[0] : { unit: '', precision: 0 };
    /* 零参数族（MG-001 island_event——Q2 定案库内首例）：无幅值语义，label 不携带幅值段；
       既有五系统各族 params.length ≥ 1，本分支对其零变化 */
    if (def && def.params.length === 0) {
      return mode + ' · ' + (def ? def.shortLabel : '故障') + ' @' + Number(cfg.fault.t_start_s).toFixed(1) + 's';
    }
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
    /* WT-001 事件块按 wt001_v1 golden/oracle 通道口径（WT001_G2B_SPEC_APPROVED v1.0 §2，
       Q2 定案）：pitch_stuck 为位置强制——event_type 用家族名 actuator_fault（非 FL/FC/GT
       指令限幅语义 actuator_limit），幅值/单位随 target 通道量重铸 beta_stuck_deg =
       30°·magnitude%（β_full = 30°，§1.3-a）；v_sensor_bias 幅值按通道符号 b(t) = −B
       （低估为负）；gust_step 幅值/单位即通道量（v_true_ms，m/s）。其余系统事件面零变化
       （FL actuator 沿参数面 magnitude/unit——fl001_v1/v2 golden 同源）。 */
    var isWT = system.id === 'WT-001';
    /* MG-001 island_event 零参数族（Q2 定案）：脱离/重连语义由 t_start_s/t_clear_s 承载，
       无幅值语义——event magnitude/unit 为 null（诚实编码，不挂伪幅值；mg001_v1 golden
       events magnitude/unit=null 同源）。既有五系统各族 params.length ≥ 1，零变化。 */
    var isZeroParam = !def || def.params.length === 0;
    var evType = EVENT_TYPE[family] || 'fault';
    var evMagnitude = isZeroParam ? null : cfg.fault.params.magnitude;
    var evUnit = isZeroParam ? null : p.unit;
    if (isWT) {
      if (family === 'actuator_fault') {
        evType = 'actuator_fault';
        evMagnitude = 30 * evMagnitude / 100;
        evUnit = '°';
      } else if (family === 'sensor_drift') {
        evMagnitude = -evMagnitude;
      }
    }
    var label = (def ? def.label : '故障') + (isZeroParam ? '' : ' ' + magText) + ' @ ' + tStart.toFixed(1) + ' s';
    const out = [{
      event_id: 'EV-001',
      event_type: evType,
      trigger_s: tStart,
      target_signal: targetSignal,
      target_component: target,
      magnitude: evMagnitude,
      unit: evUnit,
      phase: 'onset',
      label: label,
      description: def ? def.description : '',
      target_component_label: comp ? comp.label : target,
      preSnapshotId: 'EV-001-pre',
      postSnapshotId: 'EV-001-post'
    }];
    /* G2b v1.1 §9 扩展轮：执行器清除事件（t_clear 后钳位释放） */
    if (system.id === 'GT-001' && family === 'actuator_fault' && cfg.fault.t_clear_s != null) {
      out.push({
        event_id: 'EV-002',
        event_type: 'actuator_clear',
        trigger_s: cfg.fault.t_clear_s,
        target_signal: 'P_gen_cap_kW',
        target_component: target,
        magnitude: 0,
        unit: 'kW',
        phase: 'clear',
        label: '执行器故障清除 @ ' + Number(cfg.fault.t_clear_s).toFixed(1) + ' s',
        description: '钳位释放：P_gen 回到指令跟随（清除瞬态见 A-gt-antiwindup-clamp）。',
        target_component_label: comp ? comp.label : target,
        preSnapshotId: 'EV-002-pre',
        postSnapshotId: 'EV-002-post'
      });
    }
    /* MG-001 island_event 双事件快照（MG001_G2B_SPEC_APPROVED v1.0 §2.4 实现面登记③ /
       MG-G2b-04；Q1(b) 定案）：脱离 EV-001（主事件，phase='onset'）+ 重连 EV-002
       （event_type='island_reconnect'，phase='clear'）——各 pre/post 一对快照由
       buildSnapshots 按 trigger_s 通用机制产出（重连 pre/post = t_clear 前后采样行，
       gt001 actuator_clear EV-002 349/350 采样行先例同构；mg001_v1 golden EV-001/EV-002
       事件编码同源）。t_clear_s 缺省 = 窗末持续脱离（EQ-MG-1）——无窗内重连即无 EV-002。 */
    if (system.id === 'MG-001' && family === 'island_event' && cfg.fault.t_clear_s != null) {
      out.push({
        event_id: 'EV-002',
        event_type: 'island_reconnect',
        trigger_s: cfg.fault.t_clear_s,
        target_signal: 'island_state',
        target_component: target,
        magnitude: null,
        unit: null,
        phase: 'clear',
        label: '主馈线重连 @ ' + Number(cfg.fault.t_clear_s).toFixed(1) + ' s',
        description: '重连恢复：馈线补差与计划跟踪恢复，卸载归零（功率平衡重整演示的重连相位）。',
        target_component_label: comp ? comp.label : target,
        preSnapshotId: 'EV-002-pre',
        postSnapshotId: 'EV-002-post'
      });
    }
    return out;
  }

  /* 事件快照（DATA_CONTRACT_SPEC §2.5 / G0-DEC-05 / B01）：
     pre = 事件时刻 t_f 的左极限（t_s 恒为 t_f=20.0，derivation='left_limit'），
     post = t_f 的右极限/采样行（derivation='post_sample'）。19.9 只是上一常规采样点，
     其值不得写入 pre.t_s。对 FL-001 三个故障族，事件前区间 [t_f−dt, t_f) 内信号恒定，
     左极限值等于上一采样行值，故 pre.variables 取自 iPre 行、t_s 仍为 t_f。 */
  function buildSnapshots(system, cfg, t, series, events) {
    if (!events.length) return [];
    var dt = cfg.dt_s;
    var units = {};
    /* on 轨专属列缺席即跳过（FCECH-G2b-04 任务5裁定配套——FC001_ELECTROCHEM_G2B_SPEC_APPROVED
       v1.0 §2「事件快照零扩展」+ §3.1 off 轨零变化最高判据，CHG-20261113-01）：off 轨
       timeseries.signals 不含 onTrackOnly 三列 ⇒ off 轨快照 units/variables 逐字节不变；
       on 轨列在场 ⇒ 按 makeSeries/varsAt 既有机制纳入（FL thermal 引擎侧快照同形态）。
       既有系统全列在场（makeSeries 为全部目录信号建列）⇒ 本门控对其零变化。 */
    system.signals.forEach(function (sg) { if (series[sg.id]) units[sg.id] = sg.unit || ''; });
    function varsAt(idx) {
      var out = {};
      system.signals.forEach(function (sg) {
        if (!series[sg.id]) return;   /* on 轨专属列结构性缺席（off 轨）——不产 null 键 */
        out[sg.id] = series[sg.id][idx];
      });
      return out;
    }
    var snapsOut = [];
    events.forEach(function (ev) {
      var tF = ev.trigger_s;
      var iPre = clamp(Math.round((tF - dt) / dt), 0, t.length - 1);
      var iPost = clamp(Math.round(tF / dt), 0, t.length - 1);
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
      snapsOut.push(preSnapshot());
      snapsOut.push(postSnapshot());
    });
    return snapsOut;
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
      /* 零参数族（MG-001 island_event——Q2 定案）：无幅值语义 → peakMagnitude null；
         既有五系统各族 params.length ≥ 1，本分支对其零变化 */
      peakMagnitude: (def && def.params.length) ? cfg.fault.params.magnitude : null,
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
      facts.f_diff_peak = fmtVal(maxAbsFrom('f_channel_diff_Hz', 0), 3);
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
    } else if (system.id === 'PV-001') {
      /* PV-001 新轨（PV001_G2B_SPEC_APPROVED §6.4 模板占位符面；信号全部 PV 自有） */
      facts.G_true_pre = at('G_true_W_m2', tStart - 0.1, 1);
      facts.G_true_post = at('G_true_W_m2', tStart, 1);
      facts.G_meas_pre = at('G_meas_W_m2', tStart - 0.1, 1);
      facts.G_meas_post = at('G_meas_W_m2', tStart, 1);
      facts.P_ref_pre = at('P_mpp_ref_kW', tStart - 0.1, 2);
      facts.P_ref_post = at('P_mpp_ref_kW', tStart, 2);
      facts.P_mpp_true_60 = at('P_mpp_true_kW', dur, 2);
      facts.P_pv_pre = at('P_pv_true_kW', tStart, 2);
      facts.P_pv_60 = at('P_pv_true_kW', dur, 2);
      facts.P_grid_pre = at('P_grid_true_kW', tStart - 0.1, 2);
      facts.P_grid_60 = at('P_grid_true_kW', dur, 2);
      facts.P_load_pre = at('P_load_demand_kW', tStart - 0.1, 2);
      facts.P_load_post = at('P_load_demand_kW', tStart, 2);
      facts.P_load_60 = at('P_load_demand_kW', dur, 2);
      facts.d_pv_peak = fmtVal(maxAbsFrom('d_pv_kW', tStart), 2);
      facts.d_pv_60 = at('d_pv_kW', dur, 2);
      facts.r_true_max = fmtVal(maxAbsFrom('r_true_kW', 0), 2);
      facts.r_meas_max = fmtVal(maxAbsFrom('r_meas_kW', 0), 2);
      facts.E_pv = metricFmt('E_pv_true_kWh', 7);
      facts.E_pv_est = metricFmt('E_pv_est_kWh', 7);
      facts.E_pv_err = metricFmt('E_pv_err_kWh', 7);
      facts.E_grid = metricFmt('E_grid_kWh', 7);
      facts.E_load = metricFmt('E_load_kWh', 5);
    } else if (system.id === 'MG-001') {
      /* MG-001 新轨（MG001_G2B_SPEC_APPROVED v1.0 §6.4 模板占位符面；信号全部 MG 自有）。
         注意：island_event 为零参数族（Q2 定案）——facts.mag 为 'NaN' 占位串（formatAmount
         无幅值可取），mg-island-event 模板不引用 {mag}（诚实编码，不挂伪幅值）。 */
      facts.P_load_pre = at('P_load_demand_kW', tStart - 0.1, 2);
      facts.P_load_post = at('P_load_demand_kW', tStart, 2);
      facts.P_load_60 = at('P_load_demand_kW', dur, 2);
      facts.P_grid_pre = at('P_grid_true_kW', tStart - 0.1, 2);
      facts.P_grid_post = at('P_grid_true_kW', tStart, 2);
      facts.P_grid_60 = at('P_grid_true_kW', dur, 2);
      facts.P_bess_pre = at('P_bess_kW', tStart - 0.1, 2);
      facts.P_bess_post = at('P_bess_kW', tStart, 2);
      facts.P_bess_60 = at('P_bess_kW', dur, 2);
      facts.P_sched = at('P_sched_kW', dur, 2);
      facts.chase_post = at('P_bess_chase_kW', tStart, 2);
      facts.P_shed_post = at('P_shed_kW', tStart, 2);
      facts.P_served_post = at('P_load_served_kW', tStart, 2);
      facts.P_served_60 = at('P_load_served_kW', dur, 2);
      facts.P_pv_pre = at('P_pv_kW', tStart - 0.1, 2);
      facts.P_pv_60 = at('P_pv_kW', dur, 2);
      facts.P_wt_pre = at('P_wt_kW', tStart - 0.1, 2);
      facts.P_wt_60 = at('P_wt_kW', dur, 2);
      facts.SOC_pre = at('SOC_true_pct', tStart - 0.1, 4);
      facts.SOC_60 = at('SOC_true_pct', dur, 4);
      facts.r_true_max = fmtVal(maxAbsFrom('r_true_kW', 0), 2);
      facts.r_meas_max = fmtVal(maxAbsFrom('r_meas_kW', 0), 2);
      if (cfg.fault.t_clear_s != null) {
        facts.tc = Number(cfg.fault.t_clear_s).toFixed(1);
        facts.P_bess_tc = at('P_bess_kW', cfg.fault.t_clear_s, 2);
        facts.P_grid_tc = at('P_grid_true_kW', cfg.fault.t_clear_s, 2);
        facts.P_shed_tc = at('P_shed_kW', cfg.fault.t_clear_s, 2);
        facts.P_served_tc = at('P_load_served_kW', cfg.fault.t_clear_s, 2);
      }
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

  /* 模板 → 因果卡构建（DEC-5 v0.9.0 残留清算②抽取：原 buildCausal 内联主体原样上移，
     主链与 thermo_track 挂载卡共用同一套节点/证据/边/机制构建代码——挂载卡与主链
     卡字段面完全同构（同 10 字段），挂载仅使 run.causal 新增 thermoTrackCard 一个
     附加字段，主链字段零增减。 */
  function buildCardFromTemplate(ctx, cfg, family, tpl, facts) {
    var system = ctx.system;
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
        note += '（运行数值 ' + fmtVal(v0, precision) + ' → ' + fmtVal(v1, precision) + (unit ? ' ' + unit : '') + '）';
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
        kind: spec.kind,
        epistemic: spec.epistemic,
        componentId: spec.componentId,
        signalIds: (spec.signalIds || []).slice(),
        evidence: evidence
      };
    });

    var edges = edgeSpecs.map(function (e) {
      return { from: e.from, to: e.to, label: interpolate(e.label, facts), dashed: e.dashed === true };
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
    var card = buildCardFromTemplate(ctx, cfg, family, tpl, facts);
    /* ---- DEC-5（V090_WAVE_DESIGN；v080-release §4 残留③ v0.9.0 清算）：
       thermo_track 运行期自动挂载 ----
       触发面：system.causalTemplates.thermo_track 已注册（当前仅 GT-001）
       ∧ cfg.inertia_model === 'thermo' ∧ family !== 'none'（健康基准无卡可挂）。
       主链分派零变化：nodes/edges/headline/mechanismSummary 仍按 fault.family 既有
       模板构建——thermo 主链与 swing/linear 同走既有三族模板，tests/core.test.js §6
       既有 GT causal 断言（默认轨 6 节点 / monitor 4 节点 / load_step 6 / actuator 5）
       即回归佐证。thermo_track 卡由「教学/对比面静态引用」变为自动挂载
       （causal.thermoTrackCard 附加字段，经同一构建机制产出，字段面与主链同构）；
       run_hash 不含 causal（registry.js runHashInput），golden 字节冻结不受影响。 */
    var thermoTpl = system.causalTemplates ? system.causalTemplates.thermo_track : null;
    if (thermoTpl && cfg.inertia_model === 'thermo' && thermoTpl !== tpl) {
      card.thermoTrackCard = buildCardFromTemplate(ctx, cfg, family, thermoTpl, facts);
    }
    return card;
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
    /* PV-001 新轨（PV001_G2B_SPEC_APPROVED §8 PV-G2b-04a / R-4 守卫）：显式分支必须置于
       else→GT001 兜底之前，禁止 PV-001 静默落入 GT 物理；三系统既有分支零改动。 */
    else if (system.id === 'PV-001') sim = simulatePV001(system, cfg, t);
    /* WT-001 新轨（WT001_G2B_SPEC_APPROVED v1.0 §8 WT-G2b-04 / R-7 守卫）：显式分支必须置于
       else→GT001 兜底之前——GT 轨数值与 WT 锚点不同，禁止 WT-001 静默落入 GT 物理；
       四系统既有分支零改动。 */
    else if (system.id === 'WT-001') sim = simulateWT001(system, cfg, t);
    /* MG-001 新轨（MG001_G2B_SPEC_APPROVED v1.0 §8 MG-G2b-04 / R-5 守卫）：显式分支必须置于
       else→GT001 兜底之前——GT 轨数值与 MG 锚点不同，禁止 MG-001 静默落入 GT 物理
       （PV/WT R-4/R-7 同款守卫）；五系统既有分支零改动。 */
    else if (system.id === 'MG-001') sim = simulateMG001(system, cfg, t);
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

    /* MG-001 能量账本指标补全（MG-G2b-04；EQ-MG-8 事件感知分段解析积分，mg001_v1
       REGISTERED_SCALARS / verify_golden MODELS["mg001"].scalars 键面同名——metrics.js
       通用面无 MG 分支，且通用 E_load_served 语义恒取需求侧（integrals.E_load 覆写），
       岛窗卸载 Run 须按 E_served = E_demand − E_shed 修正承载服务侧（EQ-MG-8）。
       本块仅 MG-001 生效（PV/WT 专属能量账本 metrics.js 专属分支先例同构），
       五系统既有指标面零变化。E_source/E_bat 通用指标保持不可用（聚合层无发电机/
       电池直测面——账本由本补全块八键承载）。 */
    if (system.id === 'MG-001' && sim.integrals) {
      var mgI = sim.integrals;
      for (var mgFix = 0; mgFix < metrics.length; mgFix++) {
        if (metrics[mgFix].metric_id === 'E_load_served_kWh') {
          metrics[mgFix].value = mgI.E_load_served_kWh;
          metrics[mgFix].definition = '∫ P_load,served dt / 3600（EQ-MG-8：E_served = E_demand − E_shed，事件感知分段解析——岛窗卸载面按服务侧承载）';
          metrics[mgFix].unavailable = false;
          metrics[mgFix].unavailable_reason = null;
        }
      }
      function mgMetric(id, label, value, unit, precision, definition, sourceIds) {
        metrics.push({
          metric_id: id,
          label: label,
          value: (typeof value === 'number' && isFinite(value)) ? value : null,
          unit: unit,
          precision: precision,
          time_window_s: [0, cfg.duration_s],
          time_window: [0, cfg.duration_s],
          method: 'analytic_flux',
          method_version: 'analytic_flux.1',
          source_signal_ids: sourceIds || [],
          source_run_ids: [runId],
          unavailable_reason: (typeof value === 'number' && isFinite(value)) ? null : '不可用（数据缺失或场景不适用，禁止填 0）',
          blindSafe: false,
          definition: definition,
          source_kind: 'DERIVED',
          focal: false,
          unavailable: !(typeof value === 'number' && isFinite(value))
        });
      }
      mgMetric('E_pv_kWh', '光伏子轨馈入电能', mgI.E_pv_kWh, 'kWh', 7,
        '∫ P_pv_kW dt / 3600（EQ-MG-2/8：PV-001 轨复用积分——源轨物理与 PV-001 完全一致）', ['P_pv_kW']);
      mgMetric('E_wt_kWh', '风电子轨馈入电能', mgI.E_wt_kWh, 'kWh', 7,
        '∫ P_wt_kW dt / 3600（EQ-MG-2/8：WT-001 轨复用积分——源轨物理与 WT-001 完全一致）', ['P_wt_kW']);
      mgMetric('E_bess_kWh', '储能馈入电能（带符号）', mgI.E_bess_kWh, 'kWh', 7,
        '∫ P_bess_kW dt / 3600（EQ-MG-8 分段解析；放电为正）', ['P_bess_kW']);
      mgMetric('E_grid_kWh', '馈线受电电能', mgI.E_grid_kWh, 'kWh', 7,
        'EQ-MG-8 恒等导出：E_grid = E_served + E_dump − E_pv − E_wt − E_bess（避免对时变 P_grid 序列做数值积分；受电为正，倒送为负）', ['P_grid_true_kW']);
      mgMetric('E_load_demand_kWh', '聚合负荷需求电能', mgI.E_load_demand_kWh, 'kWh', 7,
        '∫ P_load_demand_kW dt / 3600（EQ-MG-8 事件感知分段解析——load_step 单事件边界伪差显式排除）', ['P_load_demand_kW']);
      mgMetric('E_shed_kWh', '缺口卸载电能', mgI.E_shed_kWh, 'kWh', 7,
        '∫ P_shed_kW dt / 3600（EQ-MG-8 分段解析；并网面恒 0）', ['P_shed_kW']);
      mgMetric('E_dump_kWh', '盈余倾卸电能', mgI.E_dump_kWh, 'kWh', 7,
        '∫ P_dump_kW dt / 3600（EQ-MG-8 分段解析；理想倾卸元件的抽象记账项，不是能量损失）', ['P_dump_kW']);
    }

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
      /* Run 挂载信号目录（任务5裁定配套——FCECH-G2b-04，CHG-20261113-01）：on 轨专属信号
         在结构性缺席轨（onTrackOnly 且列未构建，FC off 轨三列）不挂入 Run 目录——
         run.signals 与 timeseries.signals 键面保持一致（core.test.js 序列/目录一致性
         不变量承载；bundle.timeseriesCsv 缺列容错面同口径）。既有系统全部信号有列
         ⇒ 本过滤对其零变化；SystemDef 目录（FL.systems.get().signals）仍含全量 24 信号
         （§3.1 项 4 信号目录更新为登记预期面；本字段不入 run_hash/五类哈希）。 */
      signals: deepClone(system.signals).filter(function (sg) {
        return !(sg.onTrackOnly && !series[sg.id]);
      }),
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

    /* 对比白名单裁决（DATA_CONTRACT_SPEC §2.11 / T-15 / D-04）：
       baseline↔fault 允许 fault/bias 差异；closed↔monitor 允许 feedback_mode 差异；
       其余配置差异（如两故障 Run 幅值不同）一律 incomparable，禁用差值图与因果断言。 */
    function sameFaultConfig(a, b) {
      var an = a || {};
      var bn = b || {};
      if ((an.family || 'none') !== (bn.family || 'none')) return false;
      if ((an.family || 'none') === 'none') return true;
      if (Number(an.t_start_s) !== Number(bn.t_start_s)) return false;
      var ap = an.params || {};
      var bp = bn.params || {};
      var keys = Object.keys(Object.assign({}, ap, bp));
      for (var i = 0; i < keys.length; i++) if (Number(ap[keys[i]]) !== Number(bp[keys[i]])) return false;
      return true;
    }
    var bBase = !bc.fault || bc.fault.family === 'none';
    var tBase = !tc.fault || tc.fault.family === 'none';
    var modeDiff = bc.feedback_mode !== tc.feedback_mode;
    var faultDiff = !sameFaultConfig(bc.fault, tc.fault);
    var allowedDiffs = [];
    var verdict;
    if (failed) {
      verdict = 'incomparable';
    } else if (modeDiff && faultDiff) {
      verdict = 'incomparable';
    } else if (faultDiff) {
      /* 仅故障配置不同：仅当一对为基准（无故障）、另一为故障 Run 时在白名单内 */
      if (bBase !== tBase) {
        verdict = 'comparable';
        allowedDiffs.push('fault');
      } else {
        verdict = 'incomparable';
      }
    } else if (modeDiff) {
      /* 仅反馈模式不同：closed↔monitor 白名单（D-04） */
      verdict = 'comparable';
      allowedDiffs.push('feedback_mode');
    } else {
      verdict = 'comparable';
    }
    var diffAllowed = verdict !== 'incomparable';

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
    if (!diffAllowed) warnings.push('两个 Run 的配置差异不在批准白名单内（baseline↔fault 允许 fault/bias；closed↔monitor 允许 feedback_mode），已禁用差值图与因果断言。');
    if (verdict === 'incomparable') {
      warnings.push('本对比不可比（incomparable）："仅由故障造成"类结论不可用；请改用兼容运行或仅查看。');
    }

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
          ' 的实际变化量为 ' + signed(pFocal.trial.value, 2) + ' ' + pFocal.deltaUnit + '（focal_change：实际变化量口径，本演示无诊断算法）。',
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
          fmtVal((findMetric(trialRun.metrics, 'max_abs_r_true_kW') || {}).value, 6) + ' kW；前者是测量偏差，不是能量损失。',
        metric_ids: [pRmeas.trial.metric_id, (findMetric(trialRun.metrics, 'max_abs_r_true_kW') || {}).metric_id].filter(Boolean),
        severity: 'info'
      });
    }

    /* 不可比时禁用全部发现（T-15/ST-07：不给出"仅由故障造成"类结论） */
    if (verdict === 'incomparable') findings.length = 0;

    return {
      valid: !failed,
      diffAllowed: diffAllowed,
      verdict: verdict,
      allowed_diffs: allowedDiffs,
      compatibility: {
        model_version: { ok: sameModel },
        engine_version: { ok: sameEngine },
        dt_s: { ok: bc.dt_s === tc.dt_s },
        duration_s: { ok: bc.duration_s === tc.duration_s },
        initial_conditions: { ok: sameInitial },
        load_profile: { ok: sameLoad },
        observation_definitions: { ok: sameObs }
      },
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
