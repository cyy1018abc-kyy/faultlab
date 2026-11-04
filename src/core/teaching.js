/* owner: core-teaching | module: teaching | contract: FaultLab-evaluation/NEXT/V06_ROADMAP.md 主线 C「C-3」行
   + FaultLab-evaluation/NEXT/V070_WAVE_DESIGN.md DEC-5（CHG-20261104-10 批准，按推荐执行） */
/* 教学路径核心（C-3 最小形态，DEC-5）：
   - 3 条预设教学路径（FL-001 / FC-001 / GT-001 各 1 条），每条固定 5 步：
     ① 传感器故障注入 → ② 闭环响应观察 → ③ 仅监测对照 → ④ 因果解释 → ⑤ 评测入口；
   - 每步 = { id, title, narrative（教学叙述卡文案）, view: { page, focus（焦点说明） },
              compare?（对照视角 { label, text }）, scenarioSpec?（第⑤步场景 JSON，schema v1） }；
     路径元数据 = { pathId, title, system, goal（目标）, prerequisites（前置）, steps }；
   - I-6：纯静态预设 + 校验 / 导出原语，零新执行语义——场景执行一律复用 S1 产出
     FL.core.scenario（parseScenario / executeScenario，src/core/scenario.js）；
     本模块不触碰 engine.js / scenario.js / 三系统物理面；
   - view.page 校验表为硬编码镜像：src/ui/shell.js PAGES 键（v0.7.0 UI 接线路
     CHG-20261104-10 增补 teaching/leaderboard 后共 9 键）；页面键变更时须同步此表
     （引导页 / 步骤卡 / 视图深链已由 UI 接线路落在 src/ui/pages/teaching.js）；
   - narrative 文案遵守 UI_COPY_GUARDRAILS §6（copy-guard 禁词零命中；合成演示定位口径：
     L0 行为级演示 / 解析方程 / 合成示例数据（synthetic）），tests/teaching.test.js 做
     33 模式子串自检；
   - 零依赖经典脚本 IIFE（零构建 ES2020，O-03）：浏览器 <script> 直挂，Node 经
     tests/core-load.js bootstrap() 后按 scenario.test.js 同一机制 eval 装载；
     装载顺序：systems.js 先于本模块；scenario.js 须在本模块 validateTeachingPath /
     exportTeachingPath 首次调用前就绪（browser 建议顺序 scenario.js → teaching.js，
     由后续 UI 接线路写进 index.html）。
   运行：node tests/teaching.test.js */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};

  var PATH_SCHEMA_VERSION = 1;

  /* view.page 合法键集合：硬编码镜像 src/ui/shell.js PAGES（home/system/signals/causal/
     compare/arena/scenario/teaching/leaderboard，UI 接线路 CHG-20261104-10 增补后 9 键）；
     tests/teaching.test.js 会与 shell.js 源码交叉核对同步性。
     UI 接线路若增删页面，须先改 shell.js 再同步此处。 */
  var SHELL_PAGE_KEYS = ['home', 'system', 'signals', 'causal', 'compare', 'arena', 'scenario', 'teaching', 'leaderboard'];

  /* DEC-5 固定 5 步模板（预设路径按此序；校验器只查结构，测试对预设断言此序） */
  var STEP_TEMPLATE = [
    { id: 'inject', title: '传感器故障注入' },
    { id: 'closed-loop', title: '闭环响应观察' },
    { id: 'monitor-compare', title: '仅监测对照' },
    { id: 'causal', title: '因果解释' },
    { id: 'eval', title: '评测入口' }
  ];

  /* ================================================================== */
  /* 工具                                                               */
  /* ================================================================== */
  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function typeName(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }

  function cloneJson(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function cloneTeachingPaths() {
    return PATHS.map(function (p) { return cloneJson(p); });
  }

  /* systems.js 注册目录（只读）；_raw.get 零开销且未知系统返回 null */
  function getSystemRaw(systemId) {
    if (!FL.systems) return null;
    if (FL.systems._raw && typeof FL.systems._raw.get === 'function') {
      return FL.systems._raw.get(systemId);
    }
    try { return FL.systems.get(systemId); } catch (e) { return null; }
  }

  function knownSystemIds() {
    if (FL.systems && typeof FL.systems.list === 'function') {
      return FL.systems.list().map(function (s) { return s.id; }).join(' / ');
    }
    return 'FL-001 / FC-001 / GT-001';
  }

  function faultDefOf(system, family) {
    if (!system || !system.faults) return null;
    for (var i = 0; i < system.faults.length; i++) {
      if (system.faults[i].family === family) return system.faults[i];
    }
    return null;
  }

  /* 参数步长域判定（与 scenario.js onStepGrid 同口径：浮点容差 1e-6） */
  function onStepGrid(v, p) {
    if (!(p.step > 0)) return true;
    var k = (v - p.min) / p.step;
    return Math.abs(k - Math.round(k)) <= 1e-6;
  }

  function requireString(obj, key, at, errors) {
    var v = obj ? obj[key] : undefined;
    if (typeof v !== 'string' || v.length === 0) {
      errors.push({ field: at + '.' + key, message: '必须为非空字符串（收到 ' + typeName(v) + '）' });
      return false;
    }
    return true;
  }

  /* ================================================================== */
  /* validateTeachingPath                                               */
  /* ================================================================== */
  /* 校验面（V070 DEC-5 / 任务契约）：
     1) 步数 = 5 + 步骤结构（id 唯一 / title / narrative / view.page ∈ SHELL_PAGE_KEYS / focus）；
     2) system 存在于 systems.js 目录；scenarioSpec 事件 family 存在于该系统故障目录；
     3) scenarioSpec 事件 params 在目录 min/max/step 域内（直接对目录判定）；
     4) scenarioSpec 整体可过 FL.core.scenario.parseScenario（schema v1 封闭白名单）；
     5) 可选字段 compare（对照视角 {label,text}）结构；
     附：第⑤步缺 scenarioSpec / 非⑤步携带 scenarioSpec → warnings（不挡通过）。 */
  function validateTeachingPath(p) {
    var errors = [];
    var warnings = [];

    if (!isPlainObject(p)) {
      return { ok: false, errors: [{ field: 'path', message: '教学路径必须是对象（收到 ' + typeName(p) + '）' }], warnings: warnings };
    }

    requireString(p, 'pathId', 'path', errors);
    requireString(p, 'title', 'path', errors);
    requireString(p, 'system', 'path', errors);
    requireString(p, 'goal', 'path', errors);
    requireString(p, 'prerequisites', 'path', errors);

    /* system：systems.js 注册目录成员 */
    var system = null;
    if (typeof p.system === 'string' && p.system.length) {
      system = getSystemRaw(p.system);
      if (!system) {
        errors.push({ field: 'path.system', message: '未知系统 ' + p.system + '（目录：' + knownSystemIds() + '）' });
      }
    }

    if (!Array.isArray(p.steps)) {
      errors.push({ field: 'path.steps', message: '缺少 steps 数组（必须为 5 步）' });
    } else if (p.steps.length !== 5) {
      errors.push({ field: 'path.steps', message: '教学路径必须为 5 步（DEC-5：注入→闭环观察→仅监测对照→因果→评测），收到 ' + p.steps.length });
    } else {
      var seenIds = Object.create(null);
      for (var i = 0; i < p.steps.length; i++) {
        validateStep(p.steps[i], i, system, seenIds, errors, warnings);
      }
      /* 第⑤步（评测入口）期望携带 scenarioSpec；缺失仅告警（字段为可选） */
      if (p.steps[4] && isPlainObject(p.steps[4]) && p.steps[4].scenarioSpec === undefined) {
        warnings.push({ field: 'path.steps[4].scenarioSpec', message: '第⑤步（评测入口）未携带 scenarioSpec：评测入口将无预置场景可生成' });
      }
    }

    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  function validateStep(s, idx, system, seenIds, errors, warnings) {
    var at = 'path.steps[' + idx + ']';

    if (!isPlainObject(s)) {
      errors.push({ field: at, message: '必须是步骤对象（收到 ' + typeName(s) + '）' });
      return;
    }

    /* id：非空 + 全路径唯一 */
    if (typeof s.id !== 'string' || s.id.length === 0) {
      errors.push({ field: at + '.id', message: '必须为非空字符串（收到 ' + typeName(s.id) + '）' });
    } else if (seenIds[s.id] !== undefined) {
      errors.push({ field: at + '.id', message: '步骤 id 重复：' + s.id + '（与 steps[' + seenIds[s.id] + '] 冲突）' });
    } else {
      seenIds[s.id] = idx;
    }

    requireString(s, 'title', at, errors);
    requireString(s, 'narrative', at, errors);

    /* view：{ page, focus }；page ∈ 硬编码页面键校验表 */
    if (!isPlainObject(s.view)) {
      errors.push({ field: at + '.view', message: '必须为视图对象 { page, focus }（收到 ' + typeName(s.view) + '）' });
    } else {
      if (SHELL_PAGE_KEYS.indexOf(s.view.page) === -1) {
        errors.push({ field: at + '.view.page', message: '必须是既有页面键之一（' + SHELL_PAGE_KEYS.join(' / ') + '），收到 ' + typeName(s.view.page) + ' ' + String(s.view.page) });
      }
      requireString(s.view, 'focus', at + '.view', errors);
    }

    /* compare（可选对照视角）：出现即须为 { label, text } 非空字符串 */
    if (s.compare !== undefined) {
      if (!isPlainObject(s.compare)) {
        errors.push({ field: at + '.compare', message: '若存在必须为对照视角对象 { label, text }（收到 ' + typeName(s.compare) + '）' });
      } else {
        requireString(s.compare, 'label', at + '.compare', errors);
        requireString(s.compare, 'text', at + '.compare', errors);
      }
    }

    /* scenarioSpec（第⑤步评测入口用）：出现即校验；非⑤步携带仅告警 */
    if (s.scenarioSpec !== undefined) {
      if (idx !== 4) {
        warnings.push({ field: at + '.scenarioSpec', message: 'scenarioSpec 约定仅用于第⑤步（评测入口），第 ' + (idx + 1) + ' 步携带将不被引导页使用' });
      }
      validateScenarioSpec(s.scenarioSpec, system, errors, at + '.scenarioSpec');
    }
  }

  /* scenarioSpec 双重校验：
     (a) 直查 systems.js 目录——family 成员 + params 逐键 min/max/step 域（独立于 scenario.js）；
     (b) FL.core.scenario.parseScenario（schema v1 封闭白名单 + 时刻域 + 反馈模式全集）。 */
  function validateScenarioSpec(spec, system, errors, at) {
    if (!isPlainObject(spec)) {
      errors.push({ field: at, message: '必须是场景 JSON 对象（scenario schema v1），收到 ' + typeName(spec) });
      return;
    }
    if (system && typeof spec.system === 'string' && spec.system !== system.id) {
      errors.push({ field: at + '.system', message: '场景系统 ' + spec.system + ' 与路径系统 ' + system.id + ' 不一致' });
    }

    /* (a) family / params 直查目录 */
    if (system && Array.isArray(spec.events)) {
      for (var i = 0; i < spec.events.length; i++) {
        var ev = spec.events[i];
        var eat = at + '.events[' + i + ']';
        if (!isPlainObject(ev)) continue;
        var def = faultDefOf(system, ev.family);
        if (!def) {
          var known = system.faults.map(function (f) { return f.family; }).join(' / ');
          errors.push({ field: eat + '.family', message: '系统 ' + system.id + ' 故障目录不含 ' + String(ev.family) + '（可用：' + known + '）' });
          continue;
        }
        if (isPlainObject(ev.params)) {
          var keys = Object.keys(ev.params);
          for (var j = 0; j < keys.length; j++) {
            var k = keys[j];
            var pd = null;
            for (var m = 0; m < def.params.length; m++) {
              if (def.params[m].key === k) { pd = def.params[m]; break; }
            }
            if (!pd) {
              errors.push({ field: eat + '.params.' + k, message: '不是故障族 ' + def.family + ' 的已知参数（可用：' + def.params.map(function (pp) { return pp.key; }).join(' / ') + '）' });
              continue;
            }
            var v = ev.params[k];
            if (typeof v !== 'number' || !isFinite(v)) {
              errors.push({ field: eat + '.params.' + k, message: '必须是有限数字（' + pd.label + '，单位 ' + pd.unit + '）' });
              continue;
            }
            if (v < pd.min - 1e-9 || v > pd.max + 1e-9) {
              errors.push({ field: eat + '.params.' + k, message: '必须在 ' + pd.min + '–' + pd.max + ' ' + pd.unit + ' 之间（收到 ' + v + '）' });
              continue;
            }
            if (!onStepGrid(v, pd)) {
              errors.push({ field: eat + '.params.' + k, message: '必须与参数步长对齐：自 ' + pd.min + ' ' + pd.unit + ' 起、步长 ' + pd.step + '（收到 ' + v + '）' });
            }
          }
        }
      }
    }

    /* (b) parseScenario 门（schema v1 全量封闭校验） */
    if (FL.core && FL.core.scenario && typeof FL.core.scenario.parseScenario === 'function') {
      var pr = FL.core.scenario.parseScenario(spec);
      if (!pr.ok) {
        for (var n = 0; n < pr.errors.length; n++) {
          errors.push({ field: at + '.' + pr.errors[n].field, message: 'scenarioSpec 解析失败：' + pr.errors[n].message });
        }
      }
    } else {
      errors.push({ field: at, message: 'scenario.js 未装载（FL.core.scenario.parseScenario 不可用）：无法校验 scenarioSpec（装载顺序见模块头注释）' });
    }
  }

  /* ================================================================== */
  /* getTeachingPaths / exportTeachingPath                              */
  /* ================================================================== */
  /* 返回 3 条预设路径的深克隆副本（外部改动不内渗；与 scenario.samples() 同口径） */
  function getTeachingPaths() {
    return cloneTeachingPaths();
  }

  /* UI 导出原语（供后续引导页「导出路径 JSON」）：确定性信封——无时间戳、无随机；
     content_checksum 为路径本体的内容哈希（FL.core.hashObjectStrict，canonical v1），
     仅作内容一致性核对用，不代表签名/来源/第三方认证（UI_COPY_GUARDRAILS §6.1 口径）。
     未知 pathId 抛中文错误（与 scenario.scenarioHash 同风格），不返回裸 null。 */
  function exportTeachingPath(pathId) {
    var found = null;
    for (var i = 0; i < PATHS.length; i++) {
      if (PATHS[i].pathId === pathId) { found = PATHS[i]; break; }
    }
    if (!found) {
      throw new Error('FL.core.teaching.exportTeachingPath：未知教学路径 ' + String(pathId) + '（可用：' + PATHS.map(function (p) { return p.pathId; }).join(' / ') + '）');
    }
    var body = cloneJson(found);
    var out = { kind: 'faultlab-teaching-path', version: PATH_SCHEMA_VERSION, path: body };
    if (FL.core && typeof FL.core.hashObjectStrict === 'function') {
      out.content_checksum = FL.core.hashObjectStrict(body);
    }
    return out;
  }

  /* ================================================================== */
  /* 预设路径数据（3 系统 × 5 步；事实源：systems.js + docs/FAULT_CATALOG.md）  */
  /* 文案口径：合成演示定位（L0 行为级演示 / 合成示例数据 synthetic）、解释已知故障 */
  /* 的传播路径、不做检测/定位/诊断声明；禁词零命中（tests/teaching.test.js 自查）。 */
  /* ================================================================== */

  function stepInject(narrative, focus) {
    return { id: STEP_TEMPLATE[0].id, title: STEP_TEMPLATE[0].title, narrative: narrative, view: { page: 'system', focus: focus } };
  }
  function stepClosedLoop(narrative, focus, compare) {
    var s = { id: STEP_TEMPLATE[1].id, title: STEP_TEMPLATE[1].title, narrative: narrative, view: { page: 'signals', focus: focus }, compare: compare };
    return s;
  }
  function stepMonitorCompare(narrative, focus, compare) {
    return { id: STEP_TEMPLATE[2].id, title: STEP_TEMPLATE[2].title, narrative: narrative, view: { page: 'compare', focus: focus }, compare: compare };
  }
  function stepCausal(narrative, focus) {
    return { id: STEP_TEMPLATE[3].id, title: STEP_TEMPLATE[3].title, narrative: narrative, view: { page: 'causal', focus: focus } };
  }
  function stepEval(narrative, focus, scenarioSpec) {
    return { id: STEP_TEMPLATE[4].id, title: STEP_TEMPLATE[4].title, narrative: narrative, view: { page: 'scenario', focus: focus }, scenarioSpec: scenarioSpec };
  }

  /* ---- FL-001：电池储能（sensor_drift 主线；scope=approved_p0 锚点参数） ---- */
  var FL_SPEC = {
    scenario_id: 'path-fl-001-eval',
    version: 1,
    label: 'FL-001 教学路径评测：传感器偏置（闭环 / 仅监测）+ 执行器限幅',
    system: 'FL-001',
    events: [
      { key: 'ev-sensor-cl', label: '传感器偏置 闭环', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' },
      { key: 'ev-sensor-mon', label: '传感器偏置 仅监测', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'monitor' },
      { key: 'ev-actuator-cl', label: '执行器限幅 闭环', family: 'actuator_fault', params: { magnitude: 55 }, t_start_s: 20, feedback_mode: 'closed_loop' }
    ]
  };

  var FL_PATH = {
    pathId: 'path-fl-001',
    title: '电池储能：传感器偏置与闭环反馈',
    system: 'FL-001',
    goal: '看清 +10 A 电流测量偏置如何经闭环反馈把真实电池电流从 25 A 拉到 15 A，并区分「测量侧偏差」与「真实物理变化」。',
    prerequisites: '无需控制理论背景；建议先在系统页浏览 FL-001 拓扑（40 kWh 电池 → 双向 DC/DC → 400 V 理想母线，30 kW 恒定负载）。',
    steps: [
      stepInject(
        'FL-001 电池储能是 L0 行为级演示模型：解析方程 + 合成示例数据（synthetic），页面结论只在本演示假设内成立。第一步在电池电流测量通道注入 +10 A 阶跃偏置（t = 20 s）——这是运行前写进配置的已知故障事实，不是运行中冒出来的异常。请在系统页拓扑里找到电流传感器组件与测量链路（电池 → 传感器 → 功率控制器），确认注入点位置。',
        '系统页 · 拓扑与组件卡：电流传感器（故障注入点）与「电池 → 传感器 → 控制器」测量链路。'
      ),
      stepClosedLoop(
        '闭环模式下控制器按测量电流反馈：τ·dI_true/dt + I_true = I_ref − b(t)（τ = 1.5 s，行为级一阶等效）。20 s 注入后测量电流从 25 A 跳到 35 A，控制器据此认为放电电流偏大，把真实电流目标压到 I_ref − b = 15 A；真实电流按一阶指数衰减，发电机功率由 20 kW 升向 24 kW 补偿缺口。信号页把 I_true（实线）与 I_meas（虚线）放进同一张图，观察两条线在 20 s 后的分离。',
        '信号页 · 双通道对照：I_bat_true_A（实线）与 I_bat_meas_A（虚线）在 20 s 后分离；辅看 P_gen_true_kW 抬升。',
        { label: '仅监测视角', text: '同一偏置在仅监测模式下不进入反馈回路：真实电流保持 25 A 不动，只有测量值跳变——第③步切换对照后可并排核对。' }
      ),
      stepMonitorCompare(
        '把「闭环 + 传感器偏置」与「仅监测 + 传感器偏置」两条 Run 并排：仅监测模式下偏置不进入物理回路，真实电流恒为 25 A；闭环模式下真实电流被反馈拉到 15 A。两种模式下测量功率残差 r_meas 都是 +4 kW——它是测量通道误差的功率当量（代数恒等 0.4·b），与反馈模式无关；真实残差 r_true 恒为 0。',
        '对比页 · 同族 Run 对照：闭环 vs 仅监测的 I_true / I_meas / r_meas 三组曲线。',
        { label: '闭环视角回看', text: '闭环下缺口由发电机补偿（P_gen 20 → 24 kW），真实电流被拉到 15 A——偏差经反馈变成了物理事实。' }
      ),
      stepCausal(
        '因果页按「配置事实 → 机制 → 数值观测」三层解释已知故障的传播路径：偏置注入 → 测量电流偏高 → 控制器按错误测量反馈 → 真实电流下降 → 发电机补偿。注意节点⑥的口径：+4 kW 测量残差是代数恒等（0.4·b），不是能量转移的结果。本页只解释运行前注入的已知故障，不做检测、定位或诊断。',
        '因果页 · sensor-drift-feedback 因果链节点 ①→⑥；⑥ 为代数恒等节点（自测量通道虚线接入，不挂在补偿下游）。'
      ),
      stepEval(
        '评测入口：本路径预置 3 事件场景（闭环传感器偏置 / 仅监测传感器偏置 / 闭环执行器限幅，均 @20 s，参数取目录锚点值）。把场景 JSON 导入场景页执行，得到 3 条标准 Run，然后对照第②③④步的结论逐条核对每条 Run 的响应形态与指标。',
        '场景页 · 导入第⑤步场景 JSON → 校验 → 按事件序执行 3 Run；结果行只读展示关键指标，「载入查看」回到曲线与因果页。',
        FL_SPEC
      )
    ]
  };

  /* ---- FC-001：燃料电池（sensor_drift 主线；scope=approved_fc 锚定条件） ---- */
  var FC_SPEC = {
    scenario_id: 'path-fc-001-eval',
    version: 1,
    label: 'FC-001 教学路径评测：电堆传感器偏置（闭环 / 仅监测）+ 负载阶跃 + 阀卡涩',
    system: 'FC-001',
    events: [
      { key: 'ev-sensor-cl', label: '电堆传感器偏置 闭环', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' },
      { key: 'ev-sensor-mon', label: '电堆传感器偏置 仅监测', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'monitor' },
      { key: 'ev-load-cl', label: '负载阶跃 闭环', family: 'load_step', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' },
      { key: 'ev-actuator-cl', label: '氢气阀卡涩 闭环', family: 'actuator_fault', params: { magnitude: 55 }, t_start_s: 20, feedback_mode: 'closed_loop' }
    ]
  };

  var FC_PATH = {
    pathId: 'path-fc-001',
    title: '燃料电池：电堆测量偏置与功率分配',
    system: 'FC-001',
    goal: '看清电堆电流测量偏置如何经功率分配闭环改变「电堆 20 kW × 电池缓冲 10 kW」的分工，并理解 EMS 级 SOC 估计为何随测量偏差移动。',
    prerequisites: '建议先完成 FL-001 路径（闭环反馈概念）；认识 FC-001 拓扑：20 kW 电堆经 DC/DC 接 400 V 母线，电池缓冲承担剩余功率，负载 30 kW。',
    steps: [
      stepInject(
        'FC-001 燃料电池是 L0 行为级演示模型（不含电化学、热管理、水管理；解析方程 + 合成示例数据 synthetic）。第一步在电堆电流测量通道注入 +10 A 阶跃偏置（t = 20 s，运行前配置的已知故障）。系统页里注意：只有电堆侧测量通道被污染，电池缓冲通道保持健康——这是本路径与 FL-001 路径最大的差别。',
        '系统页 · 电堆电流传感器（注入点）与「电堆 → 传感器 → 控制器 → 氢气阀」回路；对照健康的电池缓冲通道。'
      ),
      stepClosedLoop(
        '闭环下控制器按错误测量反馈，电堆真实电流目标从 50 A 压向 40 A（τ_fc = 1.2 s 一阶跟随），电池缓冲从 10 kW 升到 14 kW 补足缺口，30 kW 负载始终被满足。信号页同时看三条线：I_fc_true_A 下降、P_bat_true_kW 抬升、r_meas_kW 稳在 +4 kW。',
        '信号页 · 三线同看：I_fc_true_A（50→40 A）、P_bat_true_kW（10→14 kW）、r_meas_kW（+4 kW 平台）。',
        { label: '仅监测视角', text: '仅监测模式下电堆真实电流保持 50 A、电池缓冲维持 10 kW；移动的只有测量值与 EMS 估计。' }
      ),
      stepMonitorCompare(
        '并排两条同故障 Run：仅监测模式下偏置只在测量侧，物理分工不变；闭环模式下电池长期多承担 4 kW。再注意 SOC 估计的来源差别：SOC_est 由功率管理器按 P_load − P_fc,meas 平衡估算（EMS 级），不是电池电流的库仑积分——测量偏差会直接进入这个估计量，两种模式下都会偏移。',
        '对比页 · 闭环 vs 仅监测：电堆电流 / 电池功率 / SOC_true 与 SOC_est 的分离形态。',
        { label: '闭环视角回看', text: '闭环下缺口由电池缓冲补足（P_bat 10 → 14 kW），电堆真实电流被拉到 40 A。' }
      ),
      stepCausal(
        '因果页分层解释已知故障的传播路径：偏置注入 → 电堆测量偏高 → 控制器误认为电堆出力偏高 → 电堆真实电流下降 → 电池缓冲补足缺口；残差节点保持 +4 kW 的代数恒等口径（0.4·b）。本页解释对象是运行前注入的已知故障，不做检测、定位或诊断。',
        '因果页 · fc-sensor-drift 因果链；对照「电池测量通道」与「EMS 平衡估算」两条估计链的分歧点。'
      ),
      stepEval(
        '评测入口：预置 4 事件场景（闭环 / 仅监测电堆传感器偏置、负载阶跃 +10 kW、氢气阀卡涩 55%，均 @20 s，初始 30 kW / 60%）。执行后重点核对负载阶跃轨的级联响应（功率分配器 τ_ref = 2.5 s → 电堆 τ_fc = 1.2 s）与卡涩轨的限幅形态，并与第②③步结论对照。',
        '场景页 · 导入 4 事件场景 → 执行 → 每行一个 Run，核对 family / 模式 / 关键指标。',
        FC_SPEC
      )
    ]
  };

  /* ---- GT-001：燃气涡轮（sensor_drift 主线 + t_clear 演示；scope=extension_preview） ---- */
  var GT_SPEC = {
    scenario_id: 'path-gt-001-eval',
    version: 1,
    label: 'GT-001 教学路径评测：转速偏置（闭环 / 仅监测）+ 负载阶跃 + 燃料阀卡涩清除',
    system: 'GT-001',
    events: [
      { key: 'ev-sensor-cl', label: '转速偏置 闭环', family: 'sensor_drift', params: { magnitude: 0.3 }, t_start_s: 20, feedback_mode: 'closed_loop' },
      { key: 'ev-sensor-mon', label: '转速偏置 仅监测', family: 'sensor_drift', params: { magnitude: 0.3 }, t_start_s: 20, feedback_mode: 'monitor' },
      { key: 'ev-load-cl', label: '负载阶跃 闭环', family: 'load_step', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' },
      { key: 'ev-actuator-clear', label: '燃料阀卡涩 闭环 35 s 清除', family: 'actuator_fault', params: { magnitude: 50 }, t_start_s: 20, t_clear_s: 35, feedback_mode: 'closed_loop' }
    ]
  };

  var GT_PATH = {
    pathId: 'path-gt-001',
    title: '燃气涡轮：转速偏置与双通道冗余',
    system: 'GT-001',
    goal: '理解 +0.3 Hz 转速测量偏置如何经积分调速器把真实频率拉到 49.7 Hz，并认识「故障转速通道 × 健康电气频率量测」双通道冗余的对照价值。',
    prerequisites: '理解反馈控制基本概念（建议先完成 FL-001 路径）；知道 GT-001 为单机等效频率响应示意（L0b），非机组/电网动态验证。',
    steps: [
      stepInject(
        'GT-001 是单机等效频率响应示意（L0b，解析方程 + 合成示例数据 synthetic）。第一步在转速测量通道注入 +0.3 Hz 等效频率偏置（n_meas = 60 × (f + b)，即 +18 rpm；t = 20 s，运行前配置的已知故障）。系统页里有两个频率通道：被污染的转速通道 n_meas 与健康的电气频率量测 f_meas——二者互为冗余，是本路径的主角。',
        '系统页 · 转速传感器（注入点）与「传感器 → 调速器 → 燃料阀」通道；对照健康的电气频率量测通道。'
      ),
      stepClosedLoop(
        '闭环下调速器按被污染的转速通道积分：dP_gen_cmd/dt = 2.0 × (50 − n_meas/60)。它以为频率偏高 0.3 Hz，于是把发电机出力从 25 kW 压到约 17.8 kW，真实频率稳态跌到约 49.7 Hz；电池一次调频从 5 kW 升到约 12.2 kW 补缺。通道差 f_diff = n_meas/60 − f_meas 稳在 +0.3 Hz，直接暴露测量偏差。',
        '信号页 · f_true_Hz 向 49.7 Hz 漂移而 f_meas_Hz 被调速器拉回 50 Hz；辅看 P_gen_true_kW、P_bat_true_kW 与 f_channel_diff_Hz。',
        { label: '仅监测视角', text: '仅监测模式下偏置不进入调速回路：真实频率恒 50 Hz，只有 n_meas 显示偏移。' }
      ),
      stepMonitorCompare(
        '并排两条 Run：闭环模式真实频率 49.7 Hz，仅监测模式恒 50 Hz。关键不变量是通道差 f_diff：两种模式下都等于 +0.3 Hz——它是测量通道偏差的直接体现，与控制模式无关；差别只在于偏差有没有进入调速回路。',
        '对比页 · 闭环 vs 仅监测：f_true 曲线分叉而 f_channel_diff 重合；对照 P_gen / P_bat 的分工差异。',
        { label: '闭环视角回看', text: '闭环下偏差经调速器变成真实频率下跌（49.7 Hz）与电池一次调频补缺（约 12.2 kW）。' }
      ),
      stepCausal(
        '因果页分层解释已知故障的传播路径：偏置注入 → 调速器误认为频率偏高 → 发电机出力下调 → 真实频率下降 → 电池一次调频补缺；冗余节点指出 f_diff = +0.3 Hz 是双通道不一致的直接特征，可作为人工核对测量通道的起点。清除偏置后调速器积分会把频率拉回 50 Hz（指令钳位 [0, 40] kW 内）。本页不做检测、定位或诊断。',
        '因果页 · gt-sensor-drift 因果链；f_channel_diff 冗余节点 + 调速器积分钳位 [0, 40] kW 的机制说明。'
      ),
      stepEval(
        '评测入口：预置 4 事件场景（闭环 / 仅监测转速偏置、负载阶跃 +10 kW、燃料阀卡涩 50% @20 s 并在 35 s 清除）。执行后重点核对：偏置轨的稳态频率、负载阶跃轨的频率最低点与恢复、卡涩清除轨的指令回置与频率形态（t_clear 为 GT-001 执行器事件专属能力）。',
        '场景页 · 导入 4 事件场景 → 执行 → 核对 family / 模式 / t_clear / 关键指标（f_nadir_Hz 等）。',
        GT_SPEC
      )
    ]
  };

  var PATHS = [FL_PATH, FC_PATH, GT_PATH];

  /* ================================================================== */
  /* 挂载                                                               */
  /* ================================================================== */
  FL.core.teaching = {
    PATH_SCHEMA_VERSION: PATH_SCHEMA_VERSION,
    STEP_TEMPLATE: cloneJson(STEP_TEMPLATE),
    SHELL_PAGE_KEYS: SHELL_PAGE_KEYS.slice(),
    validateTeachingPath: validateTeachingPath,
    getTeachingPaths: getTeachingPaths,
    exportTeachingPath: exportTeachingPath
  };
})();
