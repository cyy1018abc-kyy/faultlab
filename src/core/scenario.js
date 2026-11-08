/* owner: core-scenario | module: scenario | contract: FaultLab-evaluation/NEXT/V06_ROADMAP.md §7 S1（C-2 骨架，CHG-20261104-08） */
/* 场景编排核心（V06_ROADMAP 主线 C，DEC-1 最小闭环 / DEC-6 场景=有序 Run 配置封闭白名单序列）：
   - I-6：本模块只做 解析 / 封闭白名单校验 / 确定性哈希 / 编排执行；逐事件构造标准 Run 配置后
     交 FL.core.createConfig → FL.registry.createRun（内部走 FL.core.simulate 既有入口），
     不引入新执行语义、不触碰三系统物理方程；
   - schema v1 契约：
       { scenario_id?: string, version: 1, label?: string, system: 'FL-001'|'FC-001'|'GT-001',
         events: [ { key: string(唯一), label?: string, family: string, params: object,
                     t_start_s: number, t_clear_s?: number|null(仅 GT-001×actuator_fault),
                     inertia_model?: 'swing'|'linear'|'thermo'(仅 GT-001，缺省解析为系统默认轨),
                     thermal_model?: 'off'|'on'(仅 FL-001，缺省解析为系统默认轨),
                     feedback_mode: 'closed_loop'|'monitor' } ] }；
   - 事实源：src/core/systems.js（faults 目录 = family/params min-max-step/timeRange/defaultTime_s）
     + docs/FAULT_CATALOG.md（授权状态：非「已删除」方可准入）；
   - 场景共享信封（C-5，DEC-3 / CHG-20261108-01；exportTeachingPath 先例）：
       { kind: 'faultlab.scenario', version: 1, content_checksum: <scenarioHash>, scenario: <归一化场景> }
     确定性（无时间戳/无随机）、可复核（校验和=scenarioHash）；导入双格式接受
     （信封 + 裸场景 JSON back-compat），校验和不符 = 结构化错误，不静默重算放行；
     指南见 docs/SCENARIO_SHARING.md；
   - 零依赖经典脚本 IIFE（零构建 ES2020，O-03）：浏览器 <script> 直挂，Node 经 tests/core-load.js
     bootstrap() 装载核心后再 eval 本文件（FL.systems / FL.core(hash) / FL.registry 须先就绪）。
   运行：node tests/scenario.test.js */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};

  var SCHEMA_VERSION = 1;
  var MAX_EVENTS = 12;
  var FEEDBACK_MODES = ['closed_loop', 'monitor'];
  /* schema v1 固定运行网格（60 s / 0.1 s）：engine.validateConfig 会把 duration_s/dt_s 钉扎为
     系统基准（engine.js:266-268），三系统均为 60/0.1；此处显式声明并在解析时守卫，
     防止未来新系统静默漂移出 schema v1 运行面。 */
  var FIXED_DURATION_S = 60;
  var FIXED_DT_S = 0.1;

  var TOP_KEYS = ['scenario_id', 'version', 'label', 'system', 'events'];
  /* thermal_model 显式 CHG 随 CHG-20261107-01 登记（FL001_THERMAL_G2B_SPEC_APPROVED v1.0
     §2.0 / V080_WAVE_DESIGN DEC-2） */
  var EVENT_KEYS = ['key', 'label', 'family', 'params', 't_start_s', 't_clear_s', 'inertia_model', 'thermal_model', 'feedback_mode'];
  /* 事件级模型深度轨（B-2 定案，CHG-20261104-12 ③）：枚举三值；缺省解析为系统默认轨
     （defaults.inertia_model，GT-001 = thermo，Q4 定案）；scenarioHash 含解析后的轨。
     跨深度对比场景（A 线教学 payoff）经该键显式钉轨。 */
  var INERTIA_MODELS = ['swing', 'linear', 'thermo'];
  /* 事件级热模型轨（FLTH-G2b-04 / CHG-20261107-01）：枚举两值；缺省解析为系统默认轨
     （defaults.thermal_model，FL-001 = off，FLTH-IMP-Q3 定案维持）；scenarioHash 含
     解析后的轨（既有 FL 场景哈希变化属预期失效面，见 hashProjection 注）。 */
  var THERMAL_MODELS = ['off', 'on'];

  /* 授权状态守卫（准入条件：非「已删除」）：事实源 docs/FAULT_CATALOG.md §1/§4。
     FL-001 load_step 已按 O-13（CHG-20261030-06）删除——systems.js 目录已不含该族，
     此处显式登记用于给出可读错误信息（与目录成员校验互为双保险）。 */
  var DELETED_FAMILIES = {
    'FL-001': { load_step: 'O-13（CHG-20261030-06）删除，登记于 docs/FAULT_CATALOG.md §1' }
  };

  /* ================================================================== */
  /* 工具                                                               */
  /* ================================================================== */
  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function isFiniteNumber(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function typeName(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }

  function makeScenarioError(errors) {
    var msg = '场景无效：' + errors.map(function (it) { return it.field + ' ' + it.message; }).join('；');
    var err = new Error(msg);
    err.name = 'ScenarioError';
    err.field = errors[0] ? errors[0].field : 'scenario';
    err.errors = errors;
    return err;
  }

  /* systems.js 注册目录（封闭白名单事实源）；_raw 为零开销引用，get 为克隆副本，二者均只读使用 */
  function getSystem(systemId) {
    if (!FL.systems) return null;
    if (FL.systems._raw && typeof FL.systems._raw.get === 'function') return FL.systems._raw.get(systemId);
    return FL.systems.get(systemId);
  }

  /* 可用系统清单（错误文案面动态派生，teaching.js knownSystemIds 先例同构）：
     自 systems.js 注册目录生成，与成员闸门（getSystem）同源——MG-001 等未注册
     系统不出现，未来注册自动跟上（D5 评估 §3.1-①-d 实证滞后清算：静态清单
     现缺 WT-001，而成员检查本就动态放行，滞后的只有文案）。FL.systems 缺席
     （bootstrap 顺序错误）时回退三系统字面串，仅兜底、不参与正常路径。 */
  function knownSystemIds() {
    if (FL.systems && typeof FL.systems.list === 'function') {
      return FL.systems.list().map(function (s) { return s.id; }).join(' / ');
    }
    return 'FL-001 / FC-001 / GT-001';
  }

  function getFaultDef(system, family) {
    if (!system || !system.faults) return null;
    for (var i = 0; i < system.faults.length; i++) {
      if (system.faults[i].family === family) return system.faults[i];
    }
    return null;
  }

  /* 0.1 s 采样网格判定（与 engine.validateConfig fault.t_start_s 口径一致：engine.js:312） */
  function onTimeGrid(v) {
    return Math.abs(v * 10 - Math.round(v * 10)) <= 1e-9;
  }

  /* 参数步长域判定：值须可由 min + k·step 到达（浮点容差 1e-6，覆盖 GT 0.05 Hz 步长累差） */
  function onStepGrid(v, p) {
    if (!(p.step > 0)) return true;
    var k = (v - p.min) / p.step;
    return Math.abs(k - Math.round(k)) <= 1e-6;
  }

  /* ================================================================== */
  /* 解析 + 封闭白名单校验                                              */
  /* ================================================================== */

  /* normalizeScenario(json) -> { ok, errors, warnings, value }
     value 为归一化场景（params 以目录默认值补齐、可选字段缺省省略），
     满足再解析幂等（parse(parse(s).scenario) 与 parse(s) 等价）。 */
  function normalizeScenario(json) {
    var errors = [];
    var warnings = [];

    var input = json;
    if (typeof json === 'string') {
      try { input = JSON.parse(json); }
      catch (e) {
        return { ok: false, errors: [{ field: 'scenario', message: 'JSON 解析失败：' + String(e.message) }], warnings: warnings, value: null };
      }
    }
    if (!isPlainObject(input)) {
      return { ok: false, errors: [{ field: 'scenario', message: '场景必须是 JSON 对象（收到 ' + typeName(input) + '）' }], warnings: warnings, value: null };
    }

    /* 顶层封闭白名单 */
    Object.keys(input).forEach(function (k) {
      if (TOP_KEYS.indexOf(k) === -1) {
        errors.push({ field: k, message: '未知顶层字段（schema v1 封闭白名单：' + TOP_KEYS.join(' / ') + '）' });
      }
    });

    /* version：必须为 1 */
    if (input.version === undefined) {
      errors.push({ field: 'version', message: '缺少 version（必须为 ' + SCHEMA_VERSION + '）' });
    } else if (input.version !== SCHEMA_VERSION) {
      errors.push({ field: 'version', message: '只支持 version = ' + SCHEMA_VERSION + '（当前 ' + String(input.version) + '）' });
    }

    /* system：systems.js 注册目录 + schema v1 固定运行网格守卫 */
    var system = null;
    if (input.system === undefined) {
      errors.push({ field: 'system', message: '缺少 system（' + knownSystemIds() + '）' });
    } else if (typeof input.system !== 'string') {
      errors.push({ field: 'system', message: '必须是字符串（收到 ' + typeName(input.system) + '）' });
    } else {
      system = getSystem(input.system);
      if (!system) {
        /* 可用系统清单动态派生（knownSystemIds，teaching.js 先例同构；v0.7 静态补列
           PV-001 的旧文案面被派生取代——注册即出现，不再随新系统滞后） */
        errors.push({ field: 'system', message: '未知系统 ' + input.system + '（可用：' + knownSystemIds() + '）' });
      } else if (system.duration_s !== FIXED_DURATION_S || system.dt_s !== FIXED_DT_S) {
        errors.push({ field: 'system', message: '系统运行网格必须为 ' + FIXED_DURATION_S + ' s / ' + FIXED_DT_S + ' s（当前 ' + system.duration_s + ' s / ' + system.dt_s + ' s）' });
      }
    }

    /* 可选元数据 */
    var scenarioId = null;
    var label = null;
    if (input.scenario_id !== undefined) {
      if (typeof input.scenario_id !== 'string' || input.scenario_id.length === 0) {
        errors.push({ field: 'scenario_id', message: '若存在必须为非空字符串（收到 ' + typeName(input.scenario_id) + '）' });
      } else {
        scenarioId = input.scenario_id;
      }
    }
    if (input.label !== undefined) {
      if (typeof input.label !== 'string') {
        errors.push({ field: 'label', message: '若存在必须为字符串（收到 ' + typeName(input.label) + '）' });
      } else {
        label = input.label;
      }
    }

    /* events：非空数组、≤ MAX_EVENTS、逐事件封闭校验 */
    var events = [];
    if (input.events === undefined) {
      errors.push({ field: 'events', message: '缺少 events（至少 1 个事件）' });
    } else if (!Array.isArray(input.events)) {
      errors.push({ field: 'events', message: '必须是事件数组（收到 ' + typeName(input.events) + '）' });
    } else if (input.events.length === 0) {
      errors.push({ field: 'events', message: '至少需要 1 个事件' });
    } else if (input.events.length > MAX_EVENTS) {
      errors.push({ field: 'events', message: '事件数量不能超过 ' + MAX_EVENTS + '（收到 ' + input.events.length + '）' });
    } else {
      var seenKeys = Object.create(null);
      for (var i = 0; i < input.events.length; i++) {
        var norm = validateEvent(input.events[i], i, system, seenKeys, errors, warnings);
        if (norm) events.push(norm);
      }
    }

    if (errors.length) return { ok: false, errors: errors, warnings: warnings, value: null };

    var value = { version: SCHEMA_VERSION, system: system.id, events: events };
    if (scenarioId !== null) value.scenario_id = scenarioId;
    if (label !== null) value.label = label;
    return { ok: true, errors: [], warnings: warnings, value: value };
  }

  /* 单事件封闭校验；通过时返回归一化事件，失败时把结构化错误压入 errors（返回 null） */
  function validateEvent(ev, idx, system, seenKeys, errors, warnings) {
    var at = 'events[' + idx + ']';

    if (!isPlainObject(ev)) {
      errors.push({ field: at, message: '必须是事件对象（收到 ' + typeName(ev) + '）' });
      return null;
    }

    /* 事件级封闭白名单 */
    Object.keys(ev).forEach(function (k) {
      if (EVENT_KEYS.indexOf(k) === -1) {
        errors.push({ field: at + '.' + k, message: '未知事件字段（schema v1 封闭白名单：' + EVENT_KEYS.join(' / ') + '）' });
      }
    });

    /* key：非空字符串且全场景唯一 */
    var key = null;
    if (ev.key === undefined) {
      errors.push({ field: at + '.key', message: '缺少 key（事件唯一标识）' });
    } else if (typeof ev.key !== 'string' || ev.key.length === 0) {
      errors.push({ field: at + '.key', message: '必须为非空字符串（收到 ' + typeName(ev.key) + '）' });
    } else if (seenKeys[ev.key] !== undefined) {
      errors.push({ field: at + '.key', message: '事件 key 重复：' + ev.key + '（与 events[' + seenKeys[ev.key] + '] 冲突）' });
    } else {
      seenKeys[ev.key] = idx;
      key = ev.key;
    }

    var label = null;
    if (ev.label !== undefined) {
      if (typeof ev.label !== 'string') {
        errors.push({ field: at + '.label', message: '若存在必须为字符串（收到 ' + typeName(ev.label) + '）' });
      } else {
        label = ev.label;
      }
    }

    /* family：systems.js 故障目录成员 且 授权状态非「已删除」 */
    var def = null;
    if (ev.family === undefined) {
      errors.push({ field: at + '.family', message: '缺少 family（故障族）' });
    } else if (typeof ev.family !== 'string') {
      errors.push({ field: at + '.family', message: '必须是字符串（收到 ' + typeName(ev.family) + '）' });
    } else if (system) {
      var deletedNote = DELETED_FAMILIES[system.id] ? DELETED_FAMILIES[system.id][ev.family] : null;
      if (deletedNote) {
        errors.push({ field: at + '.family', message: '故障族 ' + ev.family + ' 在系统 ' + system.id + ' 已删除（' + deletedNote + '）' });
      } else {
        def = getFaultDef(system, ev.family);
        if (!def) {
          var known = system.faults.map(function (f) { return f.family; }).join(' / ');
          errors.push({ field: at + '.family', message: '系统 ' + system.id + ' 故障目录不含 ' + ev.family + '（可用：' + known + '）' });
        }
      }
    }

    /* params：逐键在目录参数 min/max/step 域内；缺省键由目录默认值补齐（createConfig 同口径） */
    var params = null;
    if (ev.params === undefined) {
      errors.push({ field: at + '.params', message: '缺少 params 对象（可用 {} 取目录全默认值）' });
    } else if (!isPlainObject(ev.params)) {
      errors.push({ field: at + '.params', message: '必须是参数对象（收到 ' + typeName(ev.params) + '）' });
    } else if (def) {
      params = {};
      def.params.forEach(function (p) { params[p.key] = p.default; });
      Object.keys(ev.params).forEach(function (k) {
        var p = null;
        for (var i = 0; i < def.params.length; i++) {
          if (def.params[i].key === k) { p = def.params[i]; break; }
        }
        if (!p) {
          errors.push({ field: at + '.params.' + k, message: '不是故障族 ' + def.label + ' 的已知参数（可用：' + def.params.map(function (pp) { return pp.key; }).join(' / ') + '）' });
          return;
        }
        var v = ev.params[k];
        if (!isFiniteNumber(v)) {
          errors.push({ field: at + '.params.' + k, message: '必须是有限数字（' + p.label + '，单位 ' + p.unit + '）' });
          return;
        }
        if (v < p.min - 1e-9 || v > p.max + 1e-9) {
          errors.push({ field: at + '.params.' + k, message: '必须在 ' + p.min + '–' + p.max + ' ' + p.unit + ' 之间（收到 ' + v + '）' });
          return;
        }
        if (!onStepGrid(v, p)) {
          errors.push({ field: at + '.params.' + k, message: '必须与参数步长对齐：自 ' + p.min + ' ' + p.unit + ' 起、步长 ' + p.step + '（收到 ' + v + '）' });
          return;
        }
        params[k] = v;
      });
    }

    /* t_start_s：有限数字 → 0.1 s 网格 → 0 ≤ t < duration → 故障族 timeRange 域 */
    var tStart = null;
    var tStartOk = false;
    if (ev.t_start_s === undefined) {
      errors.push({ field: at + '.t_start_s', message: '缺少 t_start_s（注入时刻，单位 s）' });
    } else if (!isFiniteNumber(ev.t_start_s)) {
      errors.push({ field: at + '.t_start_s', message: '必须是数字（单位 s，收到 ' + String(ev.t_start_s) + '）' });
    } else if (!onTimeGrid(ev.t_start_s)) {
      errors.push({ field: at + '.t_start_s', message: '必须落在 0.1 s 采样网格上（收到 ' + ev.t_start_s + '）' });
    } else if (system && def) {
      var tr = def.timeRange || [2, 55];
      if (ev.t_start_s < 0 || ev.t_start_s >= system.duration_s) {
        errors.push({ field: at + '.t_start_s', message: '必须满足 0 ≤ t_start_s < duration_s（' + system.duration_s + ' s），收到 ' + ev.t_start_s });
      } else if (ev.t_start_s < tr[0] || ev.t_start_s > tr[1]) {
        errors.push({ field: at + '.t_start_s', message: '必须在故障族时刻域 ' + tr[0] + '–' + tr[1] + ' s 内（收到 ' + ev.t_start_s + '）' });
      } else {
        tStart = ev.t_start_s;
        tStartOk = true;
      }
    }

    /* t_clear_s：仅 GT-001 × actuator_fault 允许（schema v1 契约）；字段一旦出现即视为
       「提供了该键」——非 GT-执行器事件即使显式 null 也拒绝（null 语义由缺省承担）。
       GT-执行器上 null = 无清除；数字须满足 0.1 s 网格、晚于 t_start_s、早于 duration。 */
    var tClear = null;
    var isGtActuator = !!(system && def && system.id === 'GT-001' && def.family === 'actuator_fault');
    if (ev.t_clear_s !== undefined) {
      if (!isGtActuator) {
        errors.push({ field: at + '.t_clear_s', message: '仅 GT-001 × actuator_fault 事件允许 t_clear_s（当前 ' + (system ? system.id : '?') + (def ? ' × ' + def.family : '') + '，无清除支持）' });
      } else if (ev.t_clear_s === null) {
        tClear = null; /* 显式无清除：归一化后省略该键 */
      } else if (!isFiniteNumber(ev.t_clear_s)) {
        errors.push({ field: at + '.t_clear_s', message: '必须是数字或 null（收到 ' + typeName(ev.t_clear_s) + '）' });
      } else if (!onTimeGrid(ev.t_clear_s)) {
        errors.push({ field: at + '.t_clear_s', message: '必须落在 0.1 s 采样网格上（收到 ' + ev.t_clear_s + '）' });
      } else if (tStartOk && ev.t_clear_s <= tStart) {
        errors.push({ field: at + '.t_clear_s', message: '必须晚于 t_start_s（' + tStart + ' s），收到 ' + ev.t_clear_s });
      } else if (tStartOk && system && ev.t_clear_s >= system.duration_s) {
        errors.push({ field: at + '.t_clear_s', message: '必须早于 duration_s（' + system.duration_s + ' s），收到 ' + ev.t_clear_s });
      } else if (tStartOk) {
        tClear = ev.t_clear_s;
      }
    }

    /* inertia_model（B-2 定案，CHG-20261104-12 ③；可选事件级模型深度轨）：
       语义 = 「模型深度轨」而非字面惯量形式（swing|linear|thermo）。缺省（不提供）解析为
       系统默认轨（defaults.inertia_model，GT-001 = thermo，Q4 定案）；未知值拒绝入结构化
       错误；未声明该轨的系统（FL/FC/PV）上出现即拒绝（封闭白名单，t_clear_s 先例同构）。
       解析结果写入归一化事件并进入 scenarioHash（既有 GT 场景哈希变化 = 预期失效面）。 */
    var inertia = null;
    var declaresInertia = !!(system && system.defaults && system.defaults.inertia_model);
    if (ev.inertia_model !== undefined) {
      if (!declaresInertia) {
        errors.push({ field: at + '.inertia_model', message: '系统 ' + (system ? system.id : '?') + ' 未声明模型深度轨（inertia_model 仅适用于声明该轨的系统）' });
      } else if (INERTIA_MODELS.indexOf(ev.inertia_model) === -1) {
        errors.push({ field: at + '.inertia_model', message: '必须为 swing / linear / thermo（收到 ' + String(ev.inertia_model) + '）' });
      } else {
        inertia = ev.inertia_model;
      }
    } else if (declaresInertia) {
      inertia = system.defaults.inertia_model;
    }

    /* thermal_model（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §2.0；显式 CHG 随
       CHG-20261107-01 登记；可选事件级热模型轨，inertia_model 先例同构）：
       枚举 off|on。缺省（不提供）解析为系统默认轨（defaults.thermal_model，FL-001 = off，
       FLTH-IMP-Q3 定案维持）；未知值拒绝入结构化错误（既有闭合校验负例路径）；
       未声明该轨的系统（FC/GT/PV/WT）上出现即拒绝（封闭白名单，t_clear_s/inertia_model
       先例同构）。解析结果写入归一化事件并进入 scenarioHash。 */
    var thermal = null;
    var declaresThermal = !!(system && system.defaults && system.defaults.thermal_model);
    if (ev.thermal_model !== undefined) {
      if (!declaresThermal) {
        errors.push({ field: at + '.thermal_model', message: '系统 ' + (system ? system.id : '?') + ' 未声明热模型轨（thermal_model 仅适用于声明该轨的系统）' });
      } else if (THERMAL_MODELS.indexOf(ev.thermal_model) === -1) {
        errors.push({ field: at + '.thermal_model', message: '必须为 off / on（收到 ' + String(ev.thermal_model) + '）' });
      } else {
        thermal = ev.thermal_model;
      }
    } else if (declaresThermal) {
      thermal = system.defaults.thermal_model;
    }

    /* feedback_mode */
    var mode = null;
    if (ev.feedback_mode === undefined) {
      errors.push({ field: at + '.feedback_mode', message: '缺少 feedback_mode（closed_loop / monitor）' });
    } else if (FEEDBACK_MODES.indexOf(ev.feedback_mode) === -1) {
      errors.push({ field: at + '.feedback_mode', message: '必须为 closed_loop 或 monitor（收到 ' + String(ev.feedback_mode) + '）' });
    } else {
      mode = ev.feedback_mode;
    }

    if (errors.length) return null;

    var out = { key: key, family: ev.family, params: params, t_start_s: tStart, feedback_mode: mode };
    if (label !== null) out.label = label;
    if (tClear !== null) out.t_clear_s = tClear;
    if (inertia !== null) out.inertia_model = inertia; /* 解析后的轨（缺省 = 系统默认轨）入归一化面与哈希 */
    if (thermal !== null) out.thermal_model = thermal; /* 解析后的轨（缺省 = 系统默认轨）入归一化面与哈希 */
    return out;
  }

  /* ================================================================== */
  /* 公共 API：parseScenario / scenarioHash / executeScenario           */
  /* ================================================================== */

  /* 解析 + 封闭白名单校验；失败返回结构化错误列表（field + message），不抛裸异常。
     入参支持已解析对象或 JSON 字符串（导入面）。 */
  function parseScenario(json) {
    var n = normalizeScenario(json);
    return n.ok
      ? { ok: true, scenario: n.value, warnings: n.warnings }
      : { ok: false, errors: n.errors, warnings: n.warnings };
  }

  /* 哈希投影：只含执行相关内容（version/system/事件序/key/family/已补齐 params/
     t_start_s/t_clear_s/inertia_model(解析后的轨)/thermal_model(解析后的轨)/feedback_mode）；
     scenario_id 与 label 为元数据不入哈希。经 FL.core.hashObjectStrict（canonicalize v1
     严格模式：对象键排序、数组保序、数字最短往返）→ 键序不敏感、无随机、确定性
     （registry.js:3 canonical 口径）。
     inertia_model 缺省（FL/FC/PV 事件）为 undefined，canonicalize 按不存在处理——
     既有 FL/FC/PV 场景哈希不变；GT 事件解析轨入哈希（B-2 定案的预期失效面）。
     thermal_model：未声明轨的系统为 undefined（哈希不变）；FL 事件解析轨（缺省 = off）
     入哈希——既有 FL 场景哈希变化属预期失效面（CHG-20261107-01 显式 CHG 登记，
     V080_WAVE_DESIGN §3「tests/registry.test.js per-Run config 哈希面随 scenario
     thermal_model 键更新（预期失效，逐项登记）」）。 */
  function hashProjection(s) {
    return {
      version: s.version,
      system: s.system,
      events: s.events.map(function (e) {
        return {
          key: e.key,
          family: e.family,
          params: e.params,
          t_start_s: e.t_start_s,
          t_clear_s: e.t_clear_s, /* 缺省/无清除为 undefined，canonicalize 按不存在处理 */
          inertia_model: e.inertia_model, /* 解析后的模型深度轨（缺省系统为 undefined） */
          thermal_model: e.thermal_model, /* 解析后的热模型轨（未声明系统为 undefined；FL 场景哈希变化 = 预期失效面） */
          feedback_mode: e.feedback_mode
        };
      })
    };
  }

  /* 确定性内容哈希；入参同 parseScenario（对象或 JSON 字符串）。
     非法输入抛 ScenarioError（携带结构化 .errors），不是裸异常。 */
  function scenarioHash(json) {
    if (!FL.core || typeof FL.core.hashObjectStrict !== 'function') {
      throw new Error('FL.core.scenario.scenarioHash：hash.js 未装载（检查 core 装载顺序）');
    }
    var n = normalizeScenario(json);
    if (!n.ok) throw makeScenarioError(n.errors);
    return FL.core.hashObjectStrict(hashProjection(n.value));
  }

  /* 标准运行配置（I-6：复用既有语义）：
     initial 用系统默认（createConfig 缺省合并）、duration/dt 为系统基准（60 s / 0.1 s，
     validateConfig 钉扎）、noise 关闭；fault 面由事件给出（faultId/缺省参数由
     normalizeConfig 按目录补齐，t_clear_s 仅数字时透传给引擎）。
     不在此层新增任何执行语义。 */
  function buildRunConfig(systemId, ev) {
    var fault = { family: ev.family, t_start_s: ev.t_start_s, params: ev.params };
    if (typeof ev.t_clear_s === 'number') fault.t_clear_s = ev.t_clear_s;
    var patch = {
      feedback_mode: ev.feedback_mode,
      fault: fault,
      noise: { enabled: false }
    };
    /* 解析后的模型深度轨透传（B-2）：缺省轨已由 normalizeConfig 盖章，显式值仅覆盖时传入 */
    if (ev.inertia_model) patch.inertia_model = ev.inertia_model;
    /* 解析后的热模型轨透传（FLTH-G2b-04，CHG-20261107-01）：缺省轨已由 normalizeConfig
       盖章（engine normalizeConfig thermal_model 行），解析值（off/on）传给 Run cfg；
       引擎 validateConfig 枚举守卫 + simulateFL001Thermal 分派承接口。 */
    if (ev.thermal_model) patch.thermal_model = ev.thermal_model;
    return FL.core.createConfig(systemId, patch);
  }

  /* 编排执行：按 events 顺序逐事件构造标准 Run 配置，经 FL.registry.createRun
     （validateConfig → FL.core.simulate → 冻结 + run_hash）执行；
     返回 { runs, scenarioHash }。非法输入抛 ScenarioError（结构化 .errors）；
     调用方可先经 parseScenario 做无副作用校验。opts：{ runIdPrefix?, createdAt? }。 */
  function executeScenario(json, opts) {
    var o = opts || {};
    if (!FL.core || typeof FL.core.createConfig !== 'function') {
      throw new Error('FL.core.scenario.executeScenario：engine.js 未装载（检查 core 装载顺序）');
    }
    if (!FL.registry || typeof FL.registry.createRun !== 'function') {
      throw new Error('FL.core.scenario.executeScenario：registry.js 未装载（检查 core 装载顺序）');
    }
    var n = normalizeScenario(json);
    if (!n.ok) throw makeScenarioError(n.errors);
    var s = n.value;

    var runs = s.events.map(function (ev, idx) {
      var runLabel = [s.label, ev.label || ev.key].filter(Boolean).join(' · ');
      var prefix = (typeof o.runIdPrefix === 'string' && o.runIdPrefix.length > 0) ? o.runIdPrefix : 'Run';
      return FL.registry.createRun({
        config: buildRunConfig(s.system, ev),
        runId: prefix + '-' + String(idx + 1).padStart(2, '0'),
        label: runLabel,
        createdAt: o.createdAt
      });
    });
    return { runs: runs, scenarioHash: scenarioHash(s) };
  }

/* ================================================================== */
/* 场景共享信封（C-5，DEC-3 / CHG-20261108-01；exportTeachingPath 先例） */
/* ================================================================== */

/* 信封契约（与教学路径信封同构，kind 采用点分命名空间）：
     { kind: 'faultlab.scenario', version: 1, content_checksum: <scenarioHash>, scenario: <归一化场景> }
   - 确定性：无时间戳、无随机——同场景两次导出逐字节同 JSON；
   - content_checksum 为场景本体的内容哈希（scenarioHash，canonical v1 严格模式；
     scenario_id 与 label 为元数据不入哈希，与 scenarioHash 口径一致）；
   - 内容校验和仅证明内容一致性，不代表签名/来源/第三方认证（UI_COPY_GUARDRAILS §6.1）。 */
var ENVELOPE_KIND = 'faultlab.scenario';
var ENVELOPE_VERSION = 1;
/* 信封顶层封闭字段（closed-world 白名单，与 TOP_KEYS 同纪律） */
var ENVELOPE_KEYS = ['kind', 'version', 'content_checksum', 'scenario'];

/* 导出信封：入参同 parseScenario（对象或 JSON 字符串）。
   嵌入信封的场景为归一化形态（params 目录补齐、解析轨盖章）——再解析幂等，
   roundtrip 内容哈希一致。非法场景抛 ScenarioError（结构化 .errors），不返回部分信封。 */
function exportScenarioEnvelope(scenario) {
  var n = normalizeScenario(scenario);
  if (!n.ok) throw makeScenarioError(n.errors);
  return {
    kind: ENVELOPE_KIND,
    version: ENVELOPE_VERSION,
    content_checksum: scenarioHash(n.value),
    scenario: n.value
  };
}

/* 导入信封 / 裸场景（双格式接受，back-compat）：返回形态与 parseScenario 同构
   （{ ok, scenario|errors, warnings }），另附 via（'envelope'|'bare'）与
   content_checksum（信封路径声明值，成功时与重算一致）。所有错误结构化
   （field/message），不抛裸异常、不静默重算放行。
   - 信封（对象含 kind 键）：kind/version/未知字段封闭校验 → content_checksum 格式校验
     → 嵌入场景全量解析（错误前缀 'scenario.'）→ 校验和比对；不符 = 结构化错误
     （field=content_checksum），不静默重算接受；
   - 裸场景（无 kind 键）：normalizeScenario 既有语义零变化（既有导入面 back-compat）。
   字符串入参 JSON.parse 一次后分派（与 parseScenario 字符串入口同口径）。 */
function importScenarioEnvelope(payload) {
  var warnings = [];
  var input = payload;
  if (typeof payload === 'string') {
    try { input = JSON.parse(payload); }
    catch (e) {
      return { ok: false, errors: [{ field: 'scenario', message: 'JSON 解析失败：' + String(e.message) }], warnings: warnings, via: null };
    }
  }
  if (!isPlainObject(input)) {
    return { ok: false, errors: [{ field: 'scenario', message: '输入必须是 JSON 对象（收到 ' + typeName(input) + '）' }], warnings: warnings, via: null };
  }

  /* 裸场景路径（back-compat：信封引入前的既有导出文件与教学草稿均走此路径） */
  if (input.kind === undefined) {
    var bare = normalizeScenario(input);
    return bare.ok
      ? { ok: true, scenario: bare.value, warnings: bare.warnings, via: 'bare' }
      : { ok: false, errors: bare.errors, warnings: bare.warnings, via: 'bare' };
  }

  /* 信封路径：kind 门（带 kind 键即按信封解析，kind 错值不回退裸场景——避免错信封
     被误读为场景后给出成片「未知顶层字段」噪音） */
  if (input.kind !== ENVELOPE_KIND) {
    return { ok: false, errors: [{ field: 'kind', message: '未知信封 kind ' + JSON.stringify(input.kind) + '（只接受 ' + ENVELOPE_KIND + '）' }], warnings: warnings, via: 'envelope' };
  }

  var errors = [];
  Object.keys(input).forEach(function (k) {
    if (ENVELOPE_KEYS.indexOf(k) === -1) {
      errors.push({ field: k, message: '未知信封字段（信封封闭字段：' + ENVELOPE_KEYS.join(' / ') + '）' });
    }
  });
  if (input.version === undefined) {
    errors.push({ field: 'version', message: '缺少信封 version（必须为 ' + ENVELOPE_VERSION + '）' });
  } else if (input.version !== ENVELOPE_VERSION) {
    errors.push({ field: 'version', message: '只支持信封 version = ' + ENVELOPE_VERSION + '（当前 ' + String(input.version) + '；可能来自更新版本的导出）' });
  }
  var declaredChecksum = input.content_checksum;
  if (declaredChecksum === undefined) {
    errors.push({ field: 'content_checksum', message: '缺少 content_checksum（信封完整性字段；裸场景流转请直接用裸 JSON，不带校验和的信封不接受）' });
  } else if (typeof declaredChecksum !== 'string' || !/^[0-9a-f]{64}$/.test(declaredChecksum)) {
    errors.push({ field: 'content_checksum', message: '必须是 64 位十六进制内容校验和（收到 ' + typeName(declaredChecksum) + (typeof declaredChecksum === 'string' ? '：' + declaredChecksum : '') + '）' });
  }
  if (input.scenario === undefined) {
    errors.push({ field: 'scenario', message: '缺少 scenario（场景本体）' });
  } else if (!isPlainObject(input.scenario)) {
    errors.push({ field: 'scenario', message: '必须是场景 JSON 对象（收到 ' + typeName(input.scenario) + '）' });
  }
  if (errors.length) return { ok: false, errors: errors, warnings: warnings, via: 'envelope' };

  /* 嵌入场景全量校验（错误前缀 'scenario.'，与教学路径 scenarioSpec 前缀先例同构） */
  var inner = normalizeScenario(input.scenario);
  if (!inner.ok) {
    return {
      ok: false,
      errors: inner.errors.map(function (e) { return { field: 'scenario.' + e.field, message: '信封内场景解析失败：' + e.message }; }),
      warnings: warnings,
      via: 'envelope'
    };
  }

  /* 校验和比对（最后一步）：重算与声明不符 = 结构化错误，不静默重算放行 */
  var recomputed = scenarioHash(inner.value);
  if (declaredChecksum !== recomputed) {
    return {
      ok: false,
      errors: [{ field: 'content_checksum', message: '内容校验和不符：信封声明 ' + declaredChecksum + '，实际重算 ' + recomputed + '（场景内容与校验和不一致：文件可能在流转中被改动，或校验和与场景不配套）' }],
      warnings: warnings,
      via: 'envelope'
    };
  }
  return { ok: true, scenario: inner.value, warnings: warnings, via: 'envelope', content_checksum: declaredChecksum };
}

/* ================================================================== */
/* 可执行事件样例（FL/FC/GT 各一；供导入模板与测试直接执行）           */
/* ================================================================== */
  var SAMPLE_SCENARIOS = {
    'FL-001': {
      scenario_id: 'sample-fl001-sensor-drift',
      version: 1,
      label: 'FL-001 传感器偏置样例（闭环，+10 A @ 20 s）',
      system: 'FL-001',
      events: [
        { key: 'ev1', label: '传感器偏置', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' }
      ]
    },
    'FC-001': {
      scenario_id: 'sample-fc001-sensor-drift',
      version: 1,
      label: 'FC-001 电堆传感器偏置样例（闭环，+10 A @ 20 s）',
      system: 'FC-001',
      events: [
        { key: 'ev1', label: '电堆传感器偏置', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' }
      ]
    },
    'GT-001': {
      scenario_id: 'sample-gt001-actuator-clear',
      version: 1,
      label: 'GT-001 燃料阀卡涩样例（闭环，50% @ 20 s，35 s 清除）',
      system: 'GT-001',
      events: [
        { key: 'ev1', label: '燃料阀卡涩', family: 'actuator_fault', params: { magnitude: 50 }, t_start_s: 20, t_clear_s: 35, feedback_mode: 'closed_loop' }
      ]
    }
  };

  FL.core.scenario = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    MAX_EVENTS: MAX_EVENTS,
    FEEDBACK_MODES: FEEDBACK_MODES.slice(),
    ENVELOPE_KIND: ENVELOPE_KIND,
    ENVELOPE_VERSION: ENVELOPE_VERSION,
    parseScenario: parseScenario,
    scenarioHash: scenarioHash,
    executeScenario: executeScenario,
    exportScenarioEnvelope: exportScenarioEnvelope,
    importScenarioEnvelope: importScenarioEnvelope,
    samples: function () {
      var out = {};
      Object.keys(SAMPLE_SCENARIOS).forEach(function (k) {
        out[k] = JSON.parse(JSON.stringify(SAMPLE_SCENARIOS[k]));
      });
      return out;
    }
  };
})();
