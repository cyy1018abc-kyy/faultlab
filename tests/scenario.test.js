/* owner: core-scenario | module: tests/scenario | contract: FaultLab-evaluation/NEXT/V06_ROADMAP.md §7 S1（C-2 骨架，CHG-20261104-08）
   场景编排核心测试：负例（≥10 类）/ roundtrip（键序不敏感）/ 执行等价（场景 Run vs 单独 Run，
   序列逐点一致 + config_hash/run_hash 全等）/ 校验器错误信息字段完整性 / 场景共享信封
   （C-5，DEC-3 / CHG-20261108-01：导出确定性 roundtrip 同哈希 / 校验和篡改拒绝 /
   裸 JSON back-compat / 信封 version 错误拒绝）。
   §10（FCECH-G2b-04 / CHG-20261113-01，V120 波 W4 追加节，既有 §0–§9 断言零改动）：
   事件级 electrochem_model 键（B-1(a) 显式键条件式——合法两值保留 / 缺省全链 absent /
   非法值与未声明轨系统拒绝 / 三值哈希互异 + 既有 FC 场景哈希=改前基线字面量锚定 /
   execute 透传与 off 等价 / 信封 roundtrip checksum 稳定 / 源级白名单机检）。
   运行：node tests/scenario.test.js；失败非零退出。
   装载：src/core/scenario.js 已并入 tests/core-load.js CORE_FILES（V072 残留清单 5，
   S1 临时 (0,eval) 自装载退役）——bootstrap() 直接就绪 FL.core.scenario，浏览器序
   registry.js → scenario.js 与 index.html <script> 序一致。 */
'use strict';

const { bootstrap } = require('./core-load');

const FL = bootstrap();

const SC = FL.core.scenario;
const TS = '2026-11-04T00:00:00Z';

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }

/* ------------------------------------------------------------------ *
 * 0. 模块形态
 * ------------------------------------------------------------------ */
ok(SC && typeof SC.parseScenario === 'function' && typeof SC.scenarioHash === 'function' &&
  typeof SC.executeScenario === 'function', 'FL.core.scenario API 就绪（parse/scenarioHash/execute）');
eq(SC.SCHEMA_VERSION, 1, 'SCHEMA_VERSION=1');
eq(SC.MAX_EVENTS, 12, 'MAX_EVENTS=12');
eq(JSON.stringify(SC.FEEDBACK_MODES), JSON.stringify(['closed_loop', 'monitor']), 'FEEDBACK_MODES 封闭集合');

/* ------------------------------------------------------------------ *
 * 1. 正例：解析 + 归一化形态
 * ------------------------------------------------------------------ */
const FL3 = {
  version: 1,
  system: 'FL-001',
  label: 'FL-001 三事件演示',
  events: [
    { key: 'ev-sensor-cl', label: '传感器偏置 闭环', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' },
    { key: 'ev-actuator-mon', label: '限幅 仅监测', family: 'actuator_fault', params: { magnitude: 55 }, t_start_s: 30, feedback_mode: 'monitor' },
    { key: 'ev-sensor-mon', family: 'sensor_drift', params: { magnitude: 5 }, t_start_s: 10, feedback_mode: 'monitor' }
  ]
};

function clone(j) { return JSON.parse(JSON.stringify(j)); }
function ev(over) {
  return Object.assign({ key: 'ev1', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' }, over || {});
}
function scen(system, events, over) {
  return Object.assign({ version: 1, system: system, events: events }, over || {});
}

const pFL = SC.parseScenario(FL3);
ok(pFL.ok === true && pFL.scenario && Array.isArray(pFL.scenario.events) && pFL.scenario.events.length === 3,
  'parseScenario(FL3) 成功形态', JSON.stringify(pFL));
eq(pFL.scenario.version, 1, '归一化 version=1');
eq(pFL.scenario.system, 'FL-001', '归一化 system 透传');
eq(pFL.scenario.events[0].params.magnitude, 10, '事件 1 params 显式值保留');
eq(pFL.scenario.events[1].params.magnitude, 55, '事件 2 params 显式值保留');
eq(JSON.stringify(Object.keys(pFL.scenario)), JSON.stringify(['version', 'system', 'events', 'label']),
  '归一化顶层只含 schema v1 白名单键（label 在场）');
ok(!('t_clear_s' in pFL.scenario.events[0]), 'FL 事件归一化后无 t_clear_s 键');
eq(pFL.warnings.length, 0, '无警告');

const pStr = SC.parseScenario(JSON.stringify(FL3));
ok(pStr.ok && JSON.stringify(pStr.scenario) === JSON.stringify(pFL.scenario),
  'JSON 字符串输入与对象输入等价');

const pEmpty = SC.parseScenario(scen('FC-001', [{ key: 'a', family: 'load_step', params: {}, t_start_s: 20, feedback_mode: 'closed_loop' }]));
ok(pEmpty.ok && pEmpty.scenario.events[0].params.magnitude === 10, 'params 置空 → 目录默认值补齐（FC load_step +10 kW）');

const gtNull = SC.parseScenario(scen('GT-001', [ev({ key: 'a', family: 'actuator_fault', params: {}, t_clear_s: null, feedback_mode: 'monitor' })]));
ok(gtNull.ok && !('t_clear_s' in gtNull.scenario.events[0]), 'GT actuator t_clear_s=null → 无清除（归一化省略）');

/* 边界：12 个事件（上限内）解析通过 */
const many = [];
for (let i = 0; i < 12; i++) {
  many.push({ key: 'ev' + String(i + 1).padStart(2, '0'), family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 2 + i * 4, feedback_mode: i % 2 ? 'monitor' : 'closed_loop' });
}
const p12 = SC.parseScenario(scen('FL-001', many));
ok(p12.ok && p12.scenario.events.length === 12, '边界：12 个事件解析通过（≤ MAX_EVENTS）', JSON.stringify(p12.errors));

/* ------------------------------------------------------------------ *
 * 2. 负例：封闭白名单校验（每类返回结构化错误列表，不抛裸异常）
 * ------------------------------------------------------------------ */
const negResults = [];
function neg(json, name, fieldHint, msgHint) {
  const res = SC.parseScenario(json);
  negResults.push({ name, res });
  ok(res && res.ok === false && Array.isArray(res.errors) && res.errors.length > 0,
    '负例 ' + name + ' → ok=false 且 errors 非空', JSON.stringify(res));
  if (fieldHint) {
    ok((res.errors || []).some((e) => String(e.field).indexOf(fieldHint) !== -1),
      '负例 ' + name + ' → 命中错误字段 ' + fieldHint, JSON.stringify(res.errors));
  }
  if (msgHint) {
    ok((res.errors || []).some((e) => String(e.message).indexOf(msgHint) !== -1),
      '负例 ' + name + ' → 命中错误原因「' + msgHint + '」', JSON.stringify(res.errors));
  }
  return res;
}

/* 非对象输入（4 类） */
neg(null, 'N01 输入 null', 'scenario', '必须是 JSON 对象');
neg(42, 'N02 输入数字', 'scenario');
neg([clone(FL3)], 'N03 输入数组', 'scenario');
neg('{bad', 'N04 损坏 JSON 字符串', 'scenario', 'JSON 解析失败');

/* version（3 类） */
const noVersion = scen('FL-001', [ev()]);
delete noVersion.version;
neg(noVersion, 'N05 缺 version', 'version', '缺少 version');
neg(scen('FL-001', [ev()], { version: 2 }), 'N06 version=2', 'version', '只支持 version = 1');
neg(scen('FL-001', [ev()], { version: '1' }), 'N07 version 类型错误（字符串）', 'version');

/* system（3 类） */
/* PV-001 已注册进 systems.js 目录（PV001_G2B_SPEC_APPROVED v1.0 / CHG-20261104-10；
   V070 §3 预期失效面：PV 族随 systems.js 目录入编排）——N08 负例改用未注册 id，
   保留「未知 system → 未知系统」断言意图 */
neg(scen('XX-999', [ev()]), 'N08 未知 system（XX-999 未注册）', 'system', '未知系统');
neg(scen(42, [ev()]), 'N09 system 非字符串', 'system');
const noSystem = { version: 1, events: [ev()] };
neg(noSystem, 'N10 缺 system', 'system');

/* family：未知 / 已删除（2 类） */
neg(scen('FL-001', [ev({ family: 'thermal_runaway' })]), 'N11 未知 family', 'events[0].family', '故障目录不含');
neg(scen('FL-001', [ev({ family: 'load_step' })]), 'N12 FL-001 load_step 已删除（O-13）', 'events[0].family', '已删除');

/* params：越上界 / 越下界 / 步长不对齐 / 未知键 / 非数字 / 非对象 / 缺失（7 类） */
neg(scen('FL-001', [ev({ params: { magnitude: 31 } })]), 'N13 参数越上界（31 > 30）', 'events[0].params.magnitude', '之间');
neg(scen('FL-001', [ev({ params: { magnitude: 1 } })]), 'N14 参数越下界（1 < 2）', 'events[0].params.magnitude');
neg(scen('FL-001', [ev({ params: { magnitude: 10.5 } })]), 'N15 参数步长不对齐（10.5，步长 1）', 'events[0].params.magnitude', '步长');
neg(scen('FL-001', [ev({ params: { bias_A: 10 } })]), 'N16 未知参数键', 'events[0].params.bias_A', '已知参数');
neg(scen('FL-001', [ev({ params: { magnitude: '10' } })]), 'N17 参数非数字', 'events[0].params.magnitude');
neg(scen('FL-001', [ev({ params: 10 })]), 'N18 params 非对象', 'events[0].params');
const noParams = scen('FL-001', [{ key: 'ev1', family: 'sensor_drift', t_start_s: 20, feedback_mode: 'closed_loop' }]);
neg(noParams, 'N19 缺 params', 'events[0].params', '缺少 params');

/* key：重复 / 空串 / 非字符串 / 缺失（4 类） */
neg(scen('FL-001', [ev({ key: 'dup' }), ev({ key: 'dup' })]), 'N20 key 重复', 'events[1].key', '重复');
neg(scen('FL-001', [ev({ key: '' })]), 'N21 key 空串', 'events[0].key');
neg(scen('FL-001', [ev({ key: 42 })]), 'N22 key 非字符串', 'events[0].key');
neg(scen('FL-001', [{ family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' }]), 'N23 缺 key', 'events[0].key');

/* events：空 / 缺失 / 非数组 / 超 12 / 事件非对象（5 类） */
neg(scen('FL-001', []), 'N24 空 events', 'events', '至少需要 1 个事件');
neg({ version: 1, system: 'FL-001' }, 'N25 缺 events', 'events');
neg(scen('FL-001', { key: 'ev1' }), 'N26 events 非数组', 'events');
neg(scen('FL-001', many.concat([ev({ key: 'ev13', t_start_s: 50 })])), 'N27 events 超 12（13 个）', 'events', '不能超过 12');
neg(scen('FL-001', ['ev1']), 'N28 事件非对象', 'events[0]', '事件对象');

/* t_start_s：越下界 / 越上界 / 非网格 / 负值 / 非数字 / 缺失（6 类） */
neg(scen('FL-001', [ev({ t_start_s: 1 })]), 'N29 t_start 越下界（1 < 2）', 'events[0].t_start_s', '时刻域');
neg(scen('FL-001', [ev({ t_start_s: 56 })]), 'N30 t_start 越上界（56 > 55）', 'events[0].t_start_s');
neg(scen('FL-001', [ev({ t_start_s: 20.05 })]), 'N31 t_start 非 0.1 s 网格', 'events[0].t_start_s', '采样网格');
neg(scen('FL-001', [ev({ t_start_s: -1 })]), 'N32 t_start 负值', 'events[0].t_start_s');
neg(scen('FL-001', [ev({ t_start_s: '20' })]), 'N33 t_start 非数字', 'events[0].t_start_s');
neg(scen('FL-001', [{ key: 'ev1', family: 'sensor_drift', params: { magnitude: 10 }, feedback_mode: 'closed_loop' }]), 'N34 缺 t_start_s', 'events[0].t_start_s');

/* t_clear_s：FL/FC 不允许（含显式 null）；GT 越域 4 类（7 类） */
neg(scen('FL-001', [ev({ t_clear_s: 35 })]), 'N35 FL 事件带 t_clear_s', 'events[0].t_clear_s', '仅 GT-001 × actuator_fault');
neg(scen('FC-001', [ev({ t_clear_s: 35 })]), 'N36 FC 事件带 t_clear_s', 'events[0].t_clear_s');
neg(scen('FL-001', [ev({ t_clear_s: null })]), 'N37 FL 事件带 t_clear_s=null（字段出现即拒绝）', 'events[0].t_clear_s');
neg(scen('GT-001', [ev({ key: 'a', family: 'sensor_drift', params: { magnitude: 0.3 }, t_clear_s: 35 })]), 'N38 GT sensor_drift 带 t_clear_s', 'events[0].t_clear_s');
neg(scen('GT-001', [ev({ key: 'a', family: 'actuator_fault', params: { magnitude: 50 }, t_clear_s: 35.05 })]), 'N39 GT t_clear 非网格', 'events[0].t_clear_s');
neg(scen('GT-001', [ev({ key: 'a', family: 'actuator_fault', params: { magnitude: 50 }, t_clear_s: 10 })]), 'N40 GT t_clear 早于 t_start', 'events[0].t_clear_s', '晚于');
neg(scen('GT-001', [ev({ key: 'a', family: 'actuator_fault', params: { magnitude: 50 }, t_clear_s: 60 })]), 'N41 GT t_clear ≥ duration', 'events[0].t_clear_s', '早于 duration_s');
neg(scen('GT-001', [ev({ key: 'a', family: 'actuator_fault', params: { magnitude: 50 }, t_clear_s: '35' })]), 'N42 GT t_clear 非数字', 'events[0].t_clear_s');

/* feedback_mode：非法值 / 缺失（2 类） */
neg(scen('FL-001', [ev({ feedback_mode: 'open_loop' })]), 'N43 非法 feedback_mode', 'events[0].feedback_mode', 'closed_loop 或 monitor');
neg(scen('FL-001', [{ key: 'ev1', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20 }]), 'N44 缺 feedback_mode', 'events[0].feedback_mode');

/* 封闭白名单：未知顶层字段 / 未知事件字段 / 元数据类型（4 类） */
neg(Object.assign(clone(FL3), { extra: true }), 'N45 未知顶层字段', 'extra', '封闭白名单');
const unknownEvField = scen('FL-001', [ev()]);
unknownEvField.events[0].cycle_s = 5;
neg(unknownEvField, 'N46 未知事件字段', 'events[0].cycle_s', '封闭白名单');
neg(scen('FL-001', [ev({ label: 42 })]), 'N47 事件 label 非字符串', 'events[0].label');
neg(scen('FL-001', [ev()], { scenario_id: '' }), 'N48 scenario_id 空串', 'scenario_id');

/* 负例规模与错误信息字段完整性（结构化契约面） */
ok(negResults.length >= 10, '负例数量 ≥ 10（实际 ' + negResults.length + ' 类）');
(function sweepFieldCompleteness() {
  let complete = true;
  let detail = '';
  negResults.forEach((r) => {
    (r.res.errors || []).forEach((e, i) => {
      if (typeof e.field !== 'string' || e.field.length === 0 ||
        typeof e.message !== 'string' || e.message.length === 0) {
        complete = false;
        detail = r.name + ' #' + i + ' ' + JSON.stringify(e);
      }
    });
  });
  ok(complete, '全部负例错误信息字段完整（field/message 均为非空字符串）', detail);
})();

/* ------------------------------------------------------------------ *
 * 3. roundtrip：键序不敏感 + 语义等价 + 差异敏感
 * ------------------------------------------------------------------ */
function reverseKeysDeep(o) {
  if (Array.isArray(o)) return o.map(reverseKeysDeep);
  if (o && typeof o === 'object') {
    const out = {};
    Object.keys(o).reverse().forEach((k) => { out[k] = reverseKeysDeep(o[k]); });
    return out;
  }
  return o;
}

const h1 = SC.scenarioHash(FL3);
ok(/^[0-9a-f]{64}$/.test(h1), 'scenarioHash 为 64 位十六进制（SHA-256）', h1);
eq(SC.scenarioHash(reverseKeysDeep(FL3)), h1, '全层级键序倒置 → 同 scenarioHash');
eq(SC.scenarioHash(JSON.stringify({
  events: FL3.events.map((e) => ({
    feedback_mode: e.feedback_mode, t_start_s: e.t_start_s, params: e.params, family: e.family, key: e.key, label: e.label
  })),
  system: 'FL-001', label: FL3.label, version: 1
})), h1, 'JSON 字符串输入 + 顶层/事件键序重排 → 同 scenarioHash');
eq(SC.scenarioHash(pFL.scenario), h1, '归一化场景再哈希 → 同 scenarioHash（幂等）');
const pAgain = SC.parseScenario(pFL.scenario);
ok(pAgain.ok && JSON.stringify(pAgain.scenario) === JSON.stringify(pFL.scenario), '归一化再解析结果逐字段一致（归一化幂等）');

const emptyParams = clone(FL3);
emptyParams.events[0].params = {};
eq(SC.scenarioHash(emptyParams), h1, 'params 置空（目录默认补齐）与显式默认 → 同 scenarioHash');

const sMag = clone(FL3);
sMag.events[0].params.magnitude = 12;
ok(SC.scenarioHash(sMag) !== h1, '参数不同 → 哈希不同');
const sMode = clone(FL3);
sMode.events[0].feedback_mode = 'monitor';
ok(SC.scenarioHash(sMode) !== h1, 'feedback_mode 不同 → 哈希不同');
const sKey = clone(FL3);
sKey.events[0].key = 'renamed';
ok(SC.scenarioHash(sKey) !== h1, '事件 key 不同 → 哈希不同');
const sOrder = clone(FL3);
const swap = sOrder.events[0];
sOrder.events[0] = sOrder.events[2];
sOrder.events[2] = swap;
ok(SC.scenarioHash(sOrder) !== h1, '事件顺序不同 → 哈希不同（有序 Run 序列，I-6）');

const gtBase = { version: 1, system: 'GT-001', events: [{ key: 'ev1', family: 'actuator_fault', params: { magnitude: 50 }, t_start_s: 20, t_clear_s: 35, feedback_mode: 'closed_loop' }] };
const gtNoClear = clone(gtBase);
delete gtNoClear.events[0].t_clear_s;
ok(SC.scenarioHash(gtBase) !== SC.scenarioHash(gtNoClear), 't_clear 有无不同 → 哈希不同');

/* 非法输入 → ScenarioError（结构化，非裸异常） */
let errHash = null;
try { SC.scenarioHash({ version: 2, system: 'FL-001', events: [ev()] }); } catch (e) { errHash = e; }
ok(errHash && errHash.name === 'ScenarioError' && Array.isArray(errHash.errors) && errHash.errors.length > 0,
  'scenarioHash 非法输入 → ScenarioError（携带结构化 errors）', errHash && errHash.message);
ok(errHash && typeof errHash.field === 'string' && errHash.field.length > 0, 'ScenarioError.field 在场');
let errExec = null;
try { SC.executeScenario(null); } catch (e) { errExec = e; }
ok(errExec && errExec.name === 'ScenarioError' && Array.isArray(errExec.errors), 'executeScenario 非法输入 → ScenarioError');

/* ------------------------------------------------------------------ *
 * 4. 执行等价：3 事件 FL 场景逐事件 Run 与单独模拟一致（复用既有语义，I-6）
 * ------------------------------------------------------------------ */
const fl3Before = JSON.stringify(FL3);
const res = SC.executeScenario(FL3, { runIdPrefix: 'SCEN-EQ', createdAt: TS });
eq(JSON.stringify(FL3), fl3Before, 'executeScenario 不改写输入 JSON（纯函数）');
ok(res && Array.isArray(res.runs) && res.runs.length === 3, 'executeScenario 返回 3 个 Run');
eq(res.scenarioHash, h1, 'executeScenario.scenarioHash 与独立计算一致');

res.runs.forEach((run, i) => {
  const evSpec = FL3.events[i];
  const tag = 'Run ' + (i + 1) + '（' + evSpec.key + '）';
  eq(run.runId, 'SCEN-EQ-' + String(i + 1).padStart(2, '0'), tag + ' runId 前缀生效');
  eq(run.status, 'completed', tag + ' status=completed');
  eq(run.systemId, 'FL-001', tag + ' systemId');
  eq(run.config.duration_s, 60, tag + ' duration 60 s');
  eq(run.config.dt_s, 0.1, tag + ' dt 0.1 s');
  eq(run.config.initial.load_kW, 30, tag + ' initial 用系统默认 load 30 kW');
  eq(run.config.initial.SOC_pct, 60, tag + ' initial 用系统默认 SOC 60%');
  eq(run.config.noise.enabled, false, tag + ' noise 关闭');
  eq(run.config.feedback_mode, evSpec.feedback_mode, tag + ' feedback_mode 透传');
  eq(run.config.fault.family, evSpec.family, tag + ' fault.family');
  eq(run.config.fault.t_start_s, evSpec.t_start_s, tag + ' fault.t_start_s');
  eq(run.config.fault.params.magnitude, evSpec.params.magnitude, tag + ' fault.params.magnitude');
  eq(FL.registry.verifyRunHash(run), true, tag + ' run_hash 自校验通过');

  /* 单独模拟对照：同事件手工构造标准配置 → createRun */
  const manual = FL.registry.createRun({
    config: FL.core.createConfig('FL-001', {
      feedback_mode: evSpec.feedback_mode,
      fault: { family: evSpec.family, t_start_s: evSpec.t_start_s, params: clone(evSpec.params) },
      noise: { enabled: false }
    }),
    runId: 'MAN-' + String(i + 1).padStart(2, '0'),
    createdAt: TS
  });
  eq(run.manifest.config_hash, manual.manifest.config_hash, tag + ' config_hash 一致');
  ok(JSON.stringify(run.timeseries) === JSON.stringify(manual.timeseries), tag + ' 时间序列逐点一致');
  eq(run.manifest.run_hash, manual.manifest.run_hash, tag + ' run_hash 一致（t/signals/events/metrics/checks 内容面全等）');
});
eq(res.runs[0].role, 'fault', '闭环轨 role=fault（engine buildRole 既有语义）');
eq(res.runs[1].role, 'contrast', '仅监测轨 role=contrast');
eq(res.runs[2].role, 'contrast', '仅监测轨 role=contrast（事件 2）');
eq(res.runs[0].label, 'FL-001 三事件演示 · 传感器偏置 闭环', 'Run 标签 = 场景 label · 事件 label');
eq(res.runs[2].label, 'FL-001 三事件演示 · ev-sensor-mon', '无 label 事件回退 key（可追溯）');

/* ------------------------------------------------------------------ *
 * 5. FC/GT 可执行样例 + 三系统内置样例
 * ------------------------------------------------------------------ */
const fcLoad = { version: 1, system: 'FC-001', events: [{ key: 'fc-load', family: 'load_step', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' }] };
const fcRes = SC.executeScenario(fcLoad, { runIdPrefix: 'FC-LOAD', createdAt: TS });
eq(fcRes.runs.length, 1, 'FC-001 load_step 样例执行 1 Run');
eq(fcRes.runs[0].config.fault.family, 'load_step', 'FC fault.family=load_step');
eq(fcRes.runs[0].config.fault.faultId, 'load_step_10kW', 'FC faultId 由目录补齐');
eq(FL.registry.verifyRunHash(fcRes.runs[0]), true, 'FC Run run_hash 自校验通过');

const gtClearRes = SC.executeScenario(gtBase, { runIdPrefix: 'GT-CLEAR', createdAt: TS });
const gtRun = gtClearRes.runs[0];
eq(gtRun.config.fault.t_clear_s, 35, 'GT t_clear_s 透传引擎配置');
const clearEv = (gtRun.events || []).filter((e) => e.event_type === 'actuator_clear')[0];
ok(clearEv && clearEv.trigger_s === 35, '清除事件登记（event_type=actuator_clear，trigger 35 s）',
  JSON.stringify(gtRun.events && gtRun.events.map((e) => e.event_type)));
eq(FL.registry.verifyRunHash(gtRun), true, 'GT 清除 Run run_hash 自校验通过');

const gtMon = { version: 1, system: 'GT-001', events: [{ key: 'gt-mon', family: 'sensor_drift', params: { magnitude: 0.3 }, t_start_s: 20, feedback_mode: 'monitor' }] };
const gtMonRes = SC.executeScenario(gtMon, { runIdPrefix: 'GT-MON', createdAt: TS });
eq(gtMonRes.runs[0].role, 'contrast', 'GT 仅监测样例 role=contrast');
eq(gtMonRes.runs[0].config.fault.params.magnitude, 0.3, 'GT 0.05 Hz 步长参数透传');

const samples = SC.samples();
eq(Object.keys(samples).length, 3, 'FL/FC/GT 三系统内置样例齐备');
eq(samples['GT-001'].events[0].t_clear_s, 35, 'GT 样例含 t_clear_s=35（GT 专属能力）');
['FL-001', 'FC-001', 'GT-001'].forEach((sid) => {
  const parsed = SC.parseScenario(samples[sid]);
  ok(parsed.ok, '内置样例 ' + sid + ' 解析通过', JSON.stringify(parsed.errors));
  const r = SC.executeScenario(samples[sid], { runIdPrefix: 'SAMPLE-' + sid, createdAt: TS });
  eq(r.runs.length, 1, '内置样例 ' + sid + ' 执行 1 Run');
  eq(r.runs[0].status, 'completed', '内置样例 ' + sid + ' status=completed');
  eq(FL.registry.verifyRunHash(r.runs[0]), true, '内置样例 ' + sid + ' run_hash 自校验通过');
});

/* ------------------------------------------------------------------ *
 * 6. PV-001 编排（DEC-6：族随 systems.js 目录自动入编排白名单；
 *    PV001_G2B_SPEC_APPROVED v1.0 / CHG-20261104-10，PV-G2b-04b 回归面）
 * ------------------------------------------------------------------ */
const pvSystem = FL.systems.get('PV-001');
eq(pvSystem.duration_s, 60, 'PV-001 运行网格 60 s（schema v1 固定面）');
eq(pvSystem.dt_s, 0.1, 'PV-001 运行网格 0.1 s');
eq(pvSystem.faults.map((f) => f.family).join(','), 'sensor_drift,shading_step',
  'PV-001 故障目录两族（DEC-6 白名单事实源 = systems.js 目录）');

const PV_SENSOR = {
  scenario_id: 'pv001-sensor-drift-cl',
  version: 1,
  label: 'PV-001 辐照度传感器偏置（闭环，+100 W/m² @ 20 s）',
  system: 'PV-001',
  events: [
    { key: 'pv-bias', label: '辐照度传感器偏置', family: 'sensor_drift', params: { magnitude: 100 }, t_start_s: 20, feedback_mode: 'closed_loop' }
  ]
};
const pPv = SC.parseScenario(PV_SENSOR);
ok(pPv.ok === true, 'PV sensor_drift 事件 parse 通过（族随目录自动入编排白名单，DEC-6）', JSON.stringify(pPv.errors));
eq(pPv.scenario && pPv.scenario.events[0].params.magnitude, 100, 'PV 事件 params 显式值保留');
ok(pPv.scenario && !('t_clear_s' in pPv.scenario.events[0]), 'PV 事件归一化后无 t_clear_s 键');

const pPvShade = SC.parseScenario(scen('PV-001', [{ key: 'pv-shade', family: 'shading_step', params: {}, t_start_s: 20, feedback_mode: 'monitor' }]));
ok(pPvShade.ok && pPvShade.scenario.events[0].params.magnitude === 300,
  'PV shading_step 事件 parse 通过（params 置空 → 目录默认 −300 W/m² 补齐）', JSON.stringify(pPvShade.errors));

/* PV 负例（目录面守卫）：未知族 / 越域 / t_clear_s 非 GT-执行器拒绝 */
neg(scen('PV-001', [ev({ key: 'a', family: 'load_step', params: {}, t_start_s: 20, feedback_mode: 'closed_loop' })]),
  'PV-001 目录不含 load_step', 'events[0].family', '故障目录不含');
neg(scen('PV-001', [{ key: 'a', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' }]),
  'PV sensor_drift 越下界（10 < 20 W/m²）', 'events[0].params.magnitude', '之间');
neg(scen('PV-001', [ev({ key: 'a', family: 'shading_step', params: { magnitude: 300 }, t_start_s: 20, t_clear_s: 35, feedback_mode: 'closed_loop' })]),
  'PV 事件带 t_clear_s（仅 GT-001 × actuator_fault）', 'events[0].t_clear_s', '仅 GT-001 × actuator_fault');

/* executeScenario 冒烟：PV 双事件场景（闭环 sensor_drift + 仅监测 shading） */
const PV2 = {
  version: 1,
  system: 'PV-001',
  label: 'PV-001 双事件',
  events: [
    { key: 'pv-cl', family: 'sensor_drift', params: { magnitude: 100 }, t_start_s: 20, feedback_mode: 'closed_loop' },
    { key: 'pv-mon', family: 'shading_step', params: { magnitude: 300 }, t_start_s: 20, feedback_mode: 'monitor' }
  ]
};
const pv2Before = JSON.stringify(PV2);
const pvRes = SC.executeScenario(PV2, { runIdPrefix: 'PV-SCEN', createdAt: TS });
eq(JSON.stringify(PV2), pv2Before, 'executeScenario 不改写输入 JSON（PV 纯函数面）');
eq(pvRes.runs.length, 2, 'PV 场景执行 2 Run');
eq(pvRes.scenarioHash, SC.scenarioHash(PV2), 'executeScenario.scenarioHash 与独立计算一致（PV）');
pvRes.runs.forEach((run, i) => {
  const evSpec = PV2.events[i];
  const tag = 'PV Run ' + (i + 1) + '（' + evSpec.key + '）';
  eq(run.runId, 'PV-SCEN-' + String(i + 1).padStart(2, '0'), tag + ' runId 前缀生效');
  eq(run.status, 'completed', tag + ' status=completed');
  eq(run.systemId, 'PV-001', tag + ' systemId');
  eq(run.config.duration_s, 60, tag + ' duration 60 s');
  eq(run.config.dt_s, 0.1, tag + ' dt 0.1 s');
  eq(run.config.initial.load_kW, 30, tag + ' initial 用系统默认 load 30 kW');
  ok(!('SOC_pct' in run.config.initial), tag + ' initial 无 SOC 键（PV 无储能键面，规格 §1.1）');
  eq(run.config.noise.enabled, false, tag + ' noise 关闭');
  eq(run.config.feedback_mode, evSpec.feedback_mode, tag + ' feedback_mode 透传');
  eq(run.config.fault.family, evSpec.family, tag + ' fault.family');
  eq(run.config.fault.t_start_s, 20, tag + ' fault.t_start_s');
  eq(run.config.fault.params.magnitude, evSpec.params.magnitude, tag + ' fault.params.magnitude');
  eq(FL.registry.verifyRunHash(run), true, tag + ' run_hash 自校验通过');
  ok(run.timeseries.signals.P_pv_true_kW && run.timeseries.signals.P_pv_true_kW.length === 601,
    tag + ' P_pv 信号面在场（PV 轨，601 点）');
});
eq(pvRes.runs[0].role, 'fault', 'PV 闭环轨 role=fault');
eq(pvRes.runs[1].role, 'contrast', 'PV 仅监测轨 role=contrast');
eq(pvRes.runs[0].label, 'PV-001 双事件 · pv-cl', 'PV 无 label 事件回退 key（可追溯）');
ok(Math.abs(pvRes.runs[0].timeseries.signals.P_pv_true_kW[600] - 11.0) <= 0.05,
  'PV Run1 P_pv(60)→11.00 kW（PV 物理，非 GT 兜底面）', String(pvRes.runs[0].timeseries.signals.P_pv_true_kW[600]));
ok(Math.abs(pvRes.runs[1].timeseries.signals.P_pv_true_kW[600] - 7.0) <= 0.05,
  'PV Run2 P_pv(60)→7.00 kW（shading 物理输入两模式同生效）', String(pvRes.runs[1].timeseries.signals.P_pv_true_kW[600]));
eq(pvRes.runs[0].manifest.scope, 'extension_preview', 'PV Run scope=extension_preview（规格 §2.4/§5）');

/* PV roundtrip：键序倒置 → 同 scenarioHash（与 FL/FC/GT 同保证） */
eq(SC.scenarioHash(reverseKeysDeep(PV_SENSOR)), SC.scenarioHash(PV_SENSOR), 'PV 场景键序倒置 → 同 scenarioHash');
const pvMag = clone(PV_SENSOR);
pvMag.events[0].params.magnitude = 200;
ok(SC.scenarioHash(pvMag) !== SC.scenarioHash(PV_SENSOR), 'PV 参数不同 → 哈希不同');

/* ------------------------------------------------------------------ *
 * 7. 事件级 inertia_model 键（B-2 定案，CHG-20261104-12 ③；GTL1_G2B_SPEC_APPROVED
 *    v1.0 §2.4：枚举三值 / 缺省解析为系统默认轨（GT-001=thermo，Q4）/ scenarioHash
 *    含解析后的轨——既有 GT 场景哈希变化属预期失效面；未声明该轨的系统出现即拒绝）
 * ------------------------------------------------------------------ */
const GT_TRACK_EV = { key: 'ev1', family: 'sensor_drift', params: { magnitude: 0.3 }, t_start_s: 20, feedback_mode: 'closed_loop' };

/* 合法三值：显式钉轨保留进归一化事件 */
['swing', 'linear', 'thermo'].forEach((track) => {
  const p = SC.parseScenario(scen('GT-001', [Object.assign(clone(GT_TRACK_EV), { inertia_model: track })]));
  ok(p.ok && p.scenario.events[0].inertia_model === track,
    'GT 事件 inertia_model=' + track + ' 解析通过并保留（合法三值枚举）', JSON.stringify(p.errors));
});

/* 缺省（不提供）解析为系统默认轨（GT-001 = thermo，Q4 定案） */
const pGtDefault = SC.parseScenario(scen('GT-001', [clone(GT_TRACK_EV)]));
ok(pGtDefault.ok && pGtDefault.scenario.events[0].inertia_model === 'thermo',
  'GT 事件缺省 inertia_model 解析为系统默认轨 thermo（Q4 定案）', JSON.stringify(pGtDefault.errors));

/* 未声明该轨的系统（FL/FC/PV）上出现即拒绝（封闭白名单，t_clear_s 先例同构） */
neg(scen('FL-001', [ev({ inertia_model: 'thermo' })]),
  'N49 FL 事件带 inertia_model（系统未声明模型深度轨）', 'events[0].inertia_model', '未声明模型深度轨');
neg(scen('FC-001', [ev({ inertia_model: 'swing' })]),
  'N50 FC 事件带 inertia_model', 'events[0].inertia_model', '未声明模型深度轨');
neg(scen('PV-001', [{ key: 'a', family: 'sensor_drift', params: { magnitude: 100 }, t_start_s: 20, feedback_mode: 'closed_loop', inertia_model: 'thermo' }]),
  'N51 PV 事件带 inertia_model', 'events[0].inertia_model', '未声明模型深度轨');

/* 非法值拒绝（枚举三值之外 / 非字符串） */
neg(scen('GT-001', [Object.assign(clone(GT_TRACK_EV), { inertia_model: 'dual_shaft' })]),
  'N52 GT inertia_model 非法值（枚举外）', 'events[0].inertia_model', 'swing / linear / thermo');
neg(scen('GT-001', [Object.assign(clone(GT_TRACK_EV), { inertia_model: 42 })]),
  'N53 GT inertia_model 非字符串', 'events[0].inertia_model', 'swing / linear / thermo');

/* scenarioHash 含解析后的轨：缺省解析轨与显式 thermo 同哈希；三轨互异 */
const hGtDefault = SC.scenarioHash(scen('GT-001', [clone(GT_TRACK_EV)]));
const hGtThermo = SC.scenarioHash(scen('GT-001', [Object.assign(clone(GT_TRACK_EV), { inertia_model: 'thermo' })]));
const hGtSwing = SC.scenarioHash(scen('GT-001', [Object.assign(clone(GT_TRACK_EV), { inertia_model: 'swing' })]));
const hGtLinear = SC.scenarioHash(scen('GT-001', [Object.assign(clone(GT_TRACK_EV), { inertia_model: 'linear' })]));
eq(hGtDefault, hGtThermo, 'scenarioHash：缺省解析轨与显式 thermo 同哈希（缺省=thermo 入哈希）');
ok(hGtThermo !== hGtSwing && hGtThermo !== hGtLinear && hGtSwing !== hGtLinear,
  'scenarioHash：解析轨入哈希——三轨互异（既有 GT 场景哈希变化=预期失效面，B-2）');
eq(SC.scenarioHash(reverseKeysDeep(scen('GT-001', [Object.assign(clone(GT_TRACK_EV), { inertia_model: 'swing' })]))), hGtSwing,
  'GT 钉轨场景键序倒置 → 同 scenarioHash');
const pGtIdem = SC.parseScenario(pGtDefault.scenario);
ok(pGtIdem.ok && SC.scenarioHash(pGtIdem.scenario) === hGtDefault, 'GT 归一化场景（缺省轨已解析）再哈希幂等');
ok(!('inertia_model' in pFL.scenario.events[0]),
  'FL 事件归一化后无 inertia_model 键（canonicalize 按不存在处理——既有 FL/FC/PV 场景哈希不变）');

/* executeScenario：解析轨透传引擎配置；跨深度对比场景经显式钉轨可达（A 线教学 payoff） */
const GT_TRACKS = scen('GT-001', [
  Object.assign(clone(GT_TRACK_EV), { key: 'ev-thermo' }),
  Object.assign(clone(GT_TRACK_EV), { key: 'ev-swing', inertia_model: 'swing' }),
  Object.assign(clone(GT_TRACK_EV), { key: 'ev-linear', inertia_model: 'linear' })
]);
const gtTrackRes = SC.executeScenario(GT_TRACKS, { runIdPrefix: 'GT-TRACK', createdAt: TS });
eq(gtTrackRes.runs.length, 3, 'GT 三轨场景执行 3 Run');
eq(gtTrackRes.runs[0].config.inertia_model, 'thermo', 'GT Run1（缺省）config.inertia_model=thermo（解析轨透传引擎）');
eq(gtTrackRes.runs[1].config.inertia_model, 'swing', 'GT Run2（显式钉轨）config.inertia_model=swing');
eq(gtTrackRes.runs[2].config.inertia_model, 'linear', 'GT Run3（显式钉轨）config.inertia_model=linear');
eq(gtTrackRes.scenarioHash, SC.scenarioHash(GT_TRACKS), 'GT 三轨场景 scenarioHash 与独立计算一致');
ok(gtTrackRes.runs[0].manifest.config_hash !== gtTrackRes.runs[1].manifest.config_hash &&
  gtTrackRes.runs[1].manifest.config_hash !== gtTrackRes.runs[2].manifest.config_hash,
  'GT 三 Run config_hash 互异（per-Run config 哈希含解析轨）');
gtTrackRes.runs.forEach((run, i) => {
  eq(FL.registry.verifyRunHash(run), true, 'GT 三轨 Run ' + (i + 1) + ' run_hash 自校验通过');
});
ok(gtTrackRes.runs[0].timeseries.signals.T3_out_K.every((v) => v !== null),
  'GT Run1（thermo）热力信号面填充');
ok(gtTrackRes.runs[1].timeseries.signals.T3_out_K.every((v) => v === null) &&
  gtTrackRes.runs[2].timeseries.signals.T3_out_K.every((v) => v === null),
  'GT Run2/3（swing/linear 钉轨）无热力面（跨深度对比经钉轨可达）');
eq(gtTrackRes.runs[1].role, 'fault', 'GT 钉轨 swing 闭环 Run role=fault（轨不影响 role 派生）');

/* ------------------------------------------------------------------ *
 * 8. 事件级 thermal_model 键（FLTH-G2b-04 / CHG-20261107-01；FL001_THERMAL_
 *    G2B_SPEC_APPROVED v1.0 §2.0：枚举 off|on / 缺省解析为系统默认轨
 *    （FL-001=off，FLTH-IMP-Q3 定案维持）/ 解析值入 scenarioHash——既有 FL
 *    场景哈希变化属预期失效面；未声明该轨的系统出现即拒绝）
 * ------------------------------------------------------------------ */
const FL_THERM_EV = { key: 'ev1', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' };

/* 合法两值：显式钉轨保留进归一化事件 */
['off', 'on'].forEach((track) => {
  const p = SC.parseScenario(scen('FL-001', [Object.assign(clone(FL_THERM_EV), { thermal_model: track })]));
  ok(p.ok && p.scenario.events[0].thermal_model === track,
    'FL 事件 thermal_model=' + track + ' 解析通过并保留（合法两值枚举）', JSON.stringify(p.errors));
});

/* 缺省（不提供）解析为系统默认轨（FL-001 = off，FLTH-IMP-Q3 定案维持） */
const pFlDefault = SC.parseScenario(scen('FL-001', [clone(FL_THERM_EV)]));
ok(pFlDefault.ok && pFlDefault.scenario.events[0].thermal_model === 'off',
  'FL 事件缺省 thermal_model 解析为系统默认轨 off（FLTH-IMP-Q3 定案维持）', JSON.stringify(pFlDefault.errors));

/* 未声明该轨的系统（FC/GT/PV/WT）上出现即拒绝（封闭白名单，t_clear_s/inertia_model 先例同构） */
neg(scen('FC-001', [ev({ thermal_model: 'on' })]),
  'N54 FC 事件带 thermal_model（系统未声明热模型轨）', 'events[0].thermal_model', '未声明热模型轨');
neg(scen('GT-001', [Object.assign(clone(GT_TRACK_EV), { thermal_model: 'off' })]),
  'N55 GT 事件带 thermal_model', 'events[0].thermal_model', '未声明热模型轨');
neg(scen('PV-001', [{ key: 'a', family: 'sensor_drift', params: { magnitude: 100 }, t_start_s: 20, feedback_mode: 'closed_loop', thermal_model: 'on' }]),
  'N56 PV 事件带 thermal_model', 'events[0].thermal_model', '未声明热模型轨');
neg(scen('WT-001', [{ key: 'a', family: 'sensor_drift', params: { magnitude: 1 }, t_start_s: 20, feedback_mode: 'closed_loop', thermal_model: 'on' }]),
  'N57 WT 事件带 thermal_model', 'events[0].thermal_model', '未声明热模型轨');

/* 非法值拒绝（枚举两值之外 / 非字符串） */
neg(scen('FL-001', [Object.assign(clone(FL_THERM_EV), { thermal_model: 'dual' })]),
  'N58 FL thermal_model 非法值（枚举外）', 'events[0].thermal_model', '必须为 off / on');
neg(scen('FL-001', [Object.assign(clone(FL_THERM_EV), { thermal_model: 42 })]),
  'N59 FL thermal_model 非字符串', 'events[0].thermal_model', '必须为 off / on');

/* scenarioHash 含解析后的轨：缺省解析轨与显式 off 同哈希；off/on 互异 */
const hFlDefault = SC.scenarioHash(scen('FL-001', [clone(FL_THERM_EV)]));
const hFlOff = SC.scenarioHash(scen('FL-001', [Object.assign(clone(FL_THERM_EV), { thermal_model: 'off' })]));
const hFlOn = SC.scenarioHash(scen('FL-001', [Object.assign(clone(FL_THERM_EV), { thermal_model: 'on' })]));
eq(hFlDefault, hFlOff, 'scenarioHash：缺省解析轨与显式 off 同哈希（缺省=off 入哈希）');
ok(hFlOff !== hFlOn, 'scenarioHash：解析轨入哈希——off/on 互异（既有 FL 场景哈希变化=预期失效面，FLTH §2.0）');
eq(SC.scenarioHash(reverseKeysDeep(scen('FL-001', [Object.assign(clone(FL_THERM_EV), { thermal_model: 'on' })]))), hFlOn,
  'FL 钉轨场景键序倒置 → 同 scenarioHash');
const pFlIdem = SC.parseScenario(pFlDefault.scenario);
ok(pFlIdem.ok && SC.scenarioHash(pFlIdem.scenario) === hFlDefault, 'FL 归一化场景（缺省轨已解析）再哈希幂等');
eq(pFL.scenario.events[0].thermal_model, 'off',
  'FL3 既有多事件场景（本文件 §1 FL3，无轨键）归一化后解析轨 thermal_model=off 在场——既有 FL 场景哈希变化属预期失效面（FLTH §2.0/§2.4，CHG-20261107-01 显式 CHG）');

/* executeScenario：解析轨透传引擎配置；跨深度对比场景经显式钉轨可达 */
const FL_TRACKS = scen('FL-001', [
  Object.assign(clone(FL_THERM_EV), { key: 'ev-off' }),
  Object.assign(clone(FL_THERM_EV), { key: 'ev-on', thermal_model: 'on' })
]);
const flTrackRes = SC.executeScenario(FL_TRACKS, { runIdPrefix: 'FL-TRACK', createdAt: TS });
eq(flTrackRes.runs.length, 2, 'FL 两轨场景执行 2 Run');
eq(flTrackRes.runs[0].config.thermal_model, 'off', 'FL Run1（缺省）config.thermal_model=off（解析轨透传引擎，normalizeConfig 盖章）');
eq(flTrackRes.runs[1].config.thermal_model, 'on', 'FL Run2（显式钉轨）config.thermal_model=on');
eq(flTrackRes.scenarioHash, SC.scenarioHash(FL_TRACKS), 'FL 两轨场景 scenarioHash 与独立计算一致');
eq(FL.registry.verifyRunHash(flTrackRes.runs[0]), true, 'FL Run1 run_hash 自校验通过');
eq(FL.registry.verifyRunHash(flTrackRes.runs[1]), true, 'FL Run2 run_hash 自校验通过');
ok(flTrackRes.runs[0].manifest.run_hash !== flTrackRes.runs[1].manifest.run_hash,
  'FL 两 Run run_hash 互异（热力序列面差异承载轨差——config_hash 面不投影 thermal_model，契约面哈希零变化）');
ok(flTrackRes.runs[1].timeseries.signals.T_bat_K.every((v) => v !== null),
  'FL Run2（on）热力信号面填充（T_bat_K 全程有值）');
ok(flTrackRes.runs[0].timeseries.signals.T_bat_K.every((v) => v === null),
  'FL Run1（off）无热力面（T_bat_K 全程 null——遗留轨结构性缺席，GT 八信号先例）');

/* execute off 等价：场景缺省轨 Run 与手工显式 off Run 逐位一致（off 路径仿真行为零变化，
   FLTH §2.0④） */
const manualOff = FL.registry.createRun({
  config: FL.core.createConfig('FL-001', {
    feedback_mode: 'closed_loop',
    fault: { family: 'sensor_drift', t_start_s: 20, params: { magnitude: 10 } },
    thermal_model: 'off',
    noise: { enabled: false }
  }),
  runId: 'MAN-OFF',
  createdAt: TS
});
eq(flTrackRes.runs[0].manifest.config_hash, manualOff.manifest.config_hash, 'FL 缺省轨 Run config_hash = 手工显式 off Run');
ok(JSON.stringify(flTrackRes.runs[0].timeseries) === JSON.stringify(manualOff.timeseries),
  'FL 缺省轨 Run 时间序列与手工显式 off Run 逐点一致（off 等价）');
eq(flTrackRes.runs[0].manifest.run_hash, manualOff.manifest.run_hash, 'FL 缺省轨 Run run_hash = 手工显式 off Run（t/signals/events/metrics/checks 内容面全等）');


/* ------------------------------------------------------------------ *
 * 9. 场景共享信封（C-5，DEC-3 / CHG-20261108-01；exportTeachingPath 先例）：
 *    导出标准化（确定性、可复核）+ 导入双格式（信封/裸 JSON back-compat）+
 *    checksum 门（不符 = 结构化错误，不静默重算放行）
 * ------------------------------------------------------------------ */
ok(typeof SC.exportScenarioEnvelope === 'function' && typeof SC.importScenarioEnvelope === 'function',
  'FL.core.scenario 信封 API 就绪（export/import）');
eq(SC.ENVELOPE_KIND, 'faultlab.scenario', 'ENVELOPE_KIND=faultlab.scenario');
eq(SC.ENVELOPE_VERSION, 1, 'ENVELOPE_VERSION=1');

/* 9.1 导出形态与确定性 */
const env = SC.exportScenarioEnvelope(FL3);
eq(env.kind, 'faultlab.scenario', '信封 kind=faultlab.scenario');
eq(env.version, 1, '信封 version=1');
eq(env.content_checksum, h1, '信封 content_checksum = scenarioHash(场景本体)');
eq(JSON.stringify(env.scenario), JSON.stringify(pFL.scenario), '信封嵌入场景为归一化形态（再解析幂等）');
ok(/^[0-9a-f]{64}$/.test(env.content_checksum), 'content_checksum 为 64 位十六进制（SHA-256）');
const envAgain = SC.exportScenarioEnvelope(JSON.stringify(FL3));
eq(JSON.stringify(envAgain), JSON.stringify(env), '同场景（对象/字符串入参）两次导出逐字节同 JSON（确定性，无时间戳/无随机）');
const envRev = SC.exportScenarioEnvelope(reverseKeysDeep(FL3));
eq(JSON.stringify(envRev), JSON.stringify(env), '键序倒置入参导出 → 同信封（哈希键序不敏感）');

/* 9.2 导出 → 导入 roundtrip（同哈希） */
const rt = SC.importScenarioEnvelope(clone(env));
ok(rt.ok === true && rt.via === 'envelope', '信封导入 ok（via=envelope）', JSON.stringify(rt.errors));
eq(rt.content_checksum, env.content_checksum, '信封导入回传声明校验和（与重算一致）');
eq(SC.scenarioHash(rt.scenario), h1, 'roundtrip：导出 → 导入 → 同 scenarioHash');
eq(JSON.stringify(rt.scenario), JSON.stringify(pFL.scenario), 'roundtrip 场景本体逐字段一致');
const rtStr = SC.importScenarioEnvelope(JSON.stringify(env));
ok(rtStr.ok && rtStr.via === 'envelope' && SC.scenarioHash(rtStr.scenario) === h1,
  '信封 JSON 字符串入参 → 同 roundtrip 结果（UI 粘贴文本入口）');

/* 9.3 元数据不入校验和（与 scenarioHash 口径一致：scenario_id/label 为元数据） */
const envLabeled = SC.exportScenarioEnvelope(Object.assign(clone(FL3), { label: '另一份拷贝' }));
eq(envLabeled.content_checksum, env.content_checksum, 'label 变化（元数据）→ 同 content_checksum');

/* 9.4 校验和篡改拒绝（结构化错误，不静默重算放行） */
const envTamper = clone(env);
envTamper.content_checksum = (envTamper.content_checksum[0] === '0' ? '1' : '0') + envTamper.content_checksum.slice(1);
const rtTamper = SC.importScenarioEnvelope(envTamper);
ok(rtTamper.ok === false && (rtTamper.errors || []).some((e) => e.field === 'content_checksum'),
  '校验和篡改 → 拒绝（field=content_checksum）', JSON.stringify(rtTamper.errors));
ok((rtTamper.errors || []).some((e) => e.message.indexOf(env.content_checksum) !== -1),
  '校验和错误信息含实际重算值（可复核）', JSON.stringify(rtTamper.errors));
/* 内容篡改（校验和保持原值）→ 同门拒绝 */
const envContent = clone(env);
envContent.scenario.events[0].params.magnitude = 12;
const rtContent = SC.importScenarioEnvelope(envContent);
ok(rtContent.ok === false && (rtContent.errors || []).some((e) => e.field === 'content_checksum' && e.message.indexOf('不符') !== -1),
  '场景内容篡改（校验和未同步）→ 校验和不符拒绝', JSON.stringify(rtContent.errors));

/* 9.5 裸场景 JSON back-compat（信封引入前既有导出文件/教学草稿导入面零变化） */
const rtBare = SC.importScenarioEnvelope(clone(FL3));
ok(rtBare.ok && rtBare.via === 'bare' && JSON.stringify(rtBare.scenario) === JSON.stringify(pFL.scenario),
  '裸场景对象导入（back-compat，via=bare）');
const rtBareStr = SC.importScenarioEnvelope(JSON.stringify(FL3));
ok(rtBareStr.ok && rtBareStr.via === 'bare' && SC.scenarioHash(rtBareStr.scenario) === h1,
  '裸场景 JSON 字符串导入（back-compat，同哈希）');
const rtBareBad = SC.importScenarioEnvelope(scen('FL-001', [ev()], { version: 2 }));
ok(rtBareBad.ok === false && (rtBareBad.errors || []).some((e) => e.field === 'version'),
  '裸场景非法输入仍走既有结构化错误路径（back-compat）');

/* 9.6 信封门负例：version / kind / 缺 checksum / 坏 checksum / 未知字段 / scenario 形态 / 内嵌非法场景 */
const envVer = clone(env); envVer.version = 2;
const rtVer = SC.importScenarioEnvelope(envVer);
ok(rtVer.ok === false && (rtVer.errors || []).some((e) => e.field === 'version' && e.message.indexOf('信封') !== -1),
  '信封 version=2 → 拒绝（field=version）', JSON.stringify(rtVer.errors));
const envKind = clone(env); envKind.kind = 'faultlab.other';
const rtKind = SC.importScenarioEnvelope(envKind);
ok(rtKind.ok === false && (rtKind.errors || []).some((e) => e.field === 'kind'),
  '未知信封 kind → 拒绝（不回退裸场景解析）', JSON.stringify(rtKind.errors));
const envNoCs = clone(env); delete envNoCs.content_checksum;
ok(SC.importScenarioEnvelope(envNoCs).ok === false, '缺 content_checksum → 拒绝（不带校验和的信封不接受，裸流转请用裸 JSON）');
const envBadCs = clone(env); envBadCs.content_checksum = 'deadbeef';
ok(SC.importScenarioEnvelope(envBadCs).ok === false, 'content_checksum 非 64 hex → 拒绝');
const envExtra = clone(env); envExtra.extra = true;
const rtExtra = SC.importScenarioEnvelope(envExtra);
ok(rtExtra.ok === false && (rtExtra.errors || []).some((e) => e.field === 'extra' && e.message.indexOf('封闭字段') !== -1),
  '未知信封字段 → 拒绝（信封封闭字段白名单，closed-world）', JSON.stringify(rtExtra.errors));
const envStrScn = clone(env); envStrScn.scenario = JSON.stringify(env.scenario);
ok(SC.importScenarioEnvelope(envStrScn).ok === false, '信封内 scenario 为字符串 → 拒绝（须为 JSON 对象）');
const envInner = clone(env); envInner.scenario = { version: 2, system: 'FL-001', events: [ev()] };
const rtInner = SC.importScenarioEnvelope(envInner);
ok(rtInner.ok === false && (rtInner.errors || []).some((e) => String(e.field).indexOf('scenario.') === 0),
  '信封内场景非法 → 结构化错误带 scenario. 前缀', JSON.stringify(rtInner.errors));

/* 9.7 导出非法输入 → ScenarioError（结构化，非裸异常） */
let errEnv = null;
try { SC.exportScenarioEnvelope({ version: 2, system: 'FL-001', events: [ev()] }); } catch (e) { errEnv = e; }
ok(errEnv && errEnv.name === 'ScenarioError' && Array.isArray(errEnv.errors) && errEnv.errors.length > 0,
  'exportScenarioEnvelope 非法输入 → ScenarioError（携带结构化 errors）', errEnv && errEnv.message);


/* ------------------------------------------------------------------ *
 * 10. 事件级 electrochem_model 键（FCECH-G2b-04 / CHG-20261113-01 批准链，
 *     V120 波 W4；FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §2 B-1 定案采 (a)
 *     ——偏离 thermal/inertia 先例（§7/§8）：仅在场景输入显式提供时写入归一化
 *     事件与 hashProjection，缺省（不提供）全链 absent、不解析为系统默认轨
 *     （缺省轨由引擎 normalizeConfig 盖章层承载——Q9 定案）⇒ 既有 FC 场景
 *     scenarioHash 零变化；未声明该轨的系统出现即拒绝）
 * ------------------------------------------------------------------ */

/* 10.0 源级白名单机检（EVENT_KEYS/ELECTROCHEM_MODELS 为模块内常量、非公共 API——
   engine-pv §6 arena 源级守卫体例） */
(function scenarioSourceWhitelist() {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'core', 'scenario.js'), 'utf8');
  const iKeys = src.indexOf('var EVENT_KEYS =');
  ok(iKeys !== -1 && src.slice(iKeys, src.indexOf(';', iKeys)).indexOf("'electrochem_model'") !== -1,
    '源级：scenario.js EVENT_KEYS 白名单含 electrochem_model（FCECH-G2b-04 显式 CHG，CHG-20261113-01）');
  const iEnum = src.indexOf('var ELECTROCHEM_MODELS =');
  ok(iEnum !== -1 && src.slice(iEnum, src.indexOf(';', iEnum)).indexOf("['off', 'on']") !== -1,
    "源级：ELECTROCHEM_MODELS = ['off', 'on']（枚举两值，thermal_model §8 同构）");
})();

/* 10.1 合法两值：显式提供保留进归一化事件（§7/§8 体例同构） */
const FC_ECHEM_EV = { key: 'ev1', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop' };
['off', 'on'].forEach((track) => {
  const p = SC.parseScenario(scen('FC-001', [Object.assign(clone(FC_ECHEM_EV), { electrochem_model: track })]));
  ok(p.ok && p.scenario.events[0].electrochem_model === track,
    'FC 事件 electrochem_model=' + track + ' 解析通过并保留（合法两值枚举，B-1(a) 显式键入归一化面）', JSON.stringify(p.errors));
});

/* 10.2 缺省（不提供）全链 absent——不解析为系统默认轨（B-1(a) 偏离 §8 thermal
   缺省解析先例：thermal 缺省解析轨 thermal_model=off 入归一化面，electrochem
   缺省轨只由引擎 normalizeConfig 盖章承载——Q9 定案） */
const pFcAbsent = SC.parseScenario(scen('FC-001', [clone(FC_ECHEM_EV)]));
ok(pFcAbsent.ok && !('electrochem_model' in pFcAbsent.scenario.events[0]),
  'FC 事件缺省 electrochem_model 全链 absent（不解析为系统默认轨——B-1(a)/Q9，缺省轨由引擎盖章层承载）', JSON.stringify(pFcAbsent.errors));
ok(!('electrochem_model' in pEmpty.scenario.events[0]),
  '既有 FC 场景（§1 FC load_step，无轨键）归一化后无 electrochem_model 键——既有场景解析面零变化（B-1(a)）');

/* 10.3 负例（目录面守卫）：非法值 / 非字符串 / 未声明该轨的系统出现即拒绝
   （封闭白名单，t_clear_s/inertia_model/thermal_model 先例同构） */
neg(scen('FC-001', [Object.assign(clone(FC_ECHEM_EV), { electrochem_model: 'dual' })]),
  'N60 FC electrochem_model 非法值（枚举外）', 'events[0].electrochem_model', 'off / on');
neg(scen('FC-001', [Object.assign(clone(FC_ECHEM_EV), { electrochem_model: 42 })]),
  'N61 FC electrochem_model 非字符串', 'events[0].electrochem_model', 'off / on');
neg(scen('FL-001', [ev({ electrochem_model: 'on' })]),
  'N62 FL 事件带 electrochem_model（系统未声明电化学模型轨）', 'events[0].electrochem_model', '未声明电化学模型轨');
neg(scen('GT-001', [Object.assign(clone(GT_TRACK_EV), { electrochem_model: 'off' })]),
  'N63 GT 事件带 electrochem_model（系统未声明电化学模型轨）', 'events[0].electrochem_model', '未声明电化学模型轨');
neg(scen('PV-001', [{ key: 'a', family: 'sensor_drift', params: { magnitude: 100 }, t_start_s: 20, feedback_mode: 'closed_loop', electrochem_model: 'on' }]),
  'N64 PV 事件带 electrochem_model（系统未声明电化学模型轨）', 'events[0].electrochem_model', '未声明电化学模型轨');
neg(scen('WT-001', [{ key: 'a', family: 'sensor_drift', params: { magnitude: 1 }, t_start_s: 20, feedback_mode: 'closed_loop', electrochem_model: 'on' }]),
  'N65 WT 事件带 electrochem_model（系统未声明电化学模型轨）', 'events[0].electrochem_model', '未声明电化学模型轨');

/* 10.4 哈希形态（B-1(a)/Q9 定案）：显式 on ≠ 显式 off ≠ 缺省（三者互异——
   与 §7/§8「缺省=显式默认值同哈希」相反：electrochem 缺省不入哈希）；
   缺省键场景哈希与改前基线值逐位同（字面量锚定——W3 探针：git HEAD 20db6f4
   v1.1.0 改前 src/core/scenario.js 对 §5 fcLoad 场景 scenarioHash 复算值，
   B-1(a) 显式键条件式 ⇒ 既有 FC 场景 scenarioHash 零变化） */
const FC_ECHEM_SCEN = scen('FC-001', [clone(FC_ECHEM_EV)]);
const hFcAbsent = SC.scenarioHash(FC_ECHEM_SCEN);
const hFcOff = SC.scenarioHash(scen('FC-001', [Object.assign(clone(FC_ECHEM_EV), { electrochem_model: 'off' })]));
const hFcOn = SC.scenarioHash(scen('FC-001', [Object.assign(clone(FC_ECHEM_EV), { electrochem_model: 'on' })]));
ok(hFcOn !== hFcOff, 'scenarioHash：显式 on ≠ 显式 off（解析轨入哈希——显式键条件式）');
ok(hFcOff !== hFcAbsent, 'scenarioHash：显式 off ≠ 缺省（缺省全链 absent 不入哈希——B-1(a) 偏离热/惯量先例，Q9）');
ok(hFcOn !== hFcAbsent, 'scenarioHash：显式 on ≠ 缺省（三值互异，无「缺省=显式默认值」合并面）');
const FC_PRECHANGE_HASH = '9dff3ee54a858bc2c71d7f335c7c06c8da13762dd33d5cd85ae608acd76b0de6';
eq(SC.scenarioHash(fcLoad), FC_PRECHANGE_HASH,
  '既有 FC 场景（§5 fcLoad）scenarioHash = 改前基线字面量（git HEAD 复算锚定——B-1(a)/Q9：键缺席场景哈希零变化）');
eq(SC.scenarioHash(reverseKeysDeep(FC_ECHEM_SCEN)), hFcAbsent, 'FC 缺省轨场景键序倒置 → 同 scenarioHash');
eq(SC.scenarioHash(reverseKeysDeep(scen('FC-001', [Object.assign(clone(FC_ECHEM_EV), { electrochem_model: 'on' })]))), hFcOn,
  'FC 钉轨场景键序倒置 → 同 scenarioHash（on）');
const pFcIdem = SC.parseScenario(pFcAbsent.scenario);
ok(pFcIdem.ok && SC.scenarioHash(pFcIdem.scenario) === hFcAbsent, 'FC 归一化场景（缺省轨 absent）再哈希幂等');

/* 10.5 executeScenario：显式键透传引擎配置（轨分派生效）；缺省轨 absent → 引擎
   normalizeConfig 盖章层承载（cfg=off、轨列结构性缺席——场景层全链 absent） */
const FC_ECHEM_EXEC = scen('FC-001', [
  Object.assign(clone(FC_ECHEM_EV), { key: 'ev-absent' }),
  Object.assign(clone(FC_ECHEM_EV), { key: 'ev-off', electrochem_model: 'off' }),
  Object.assign(clone(FC_ECHEM_EV), { key: 'ev-on', electrochem_model: 'on' })
]);
const fcEchemRes = SC.executeScenario(FC_ECHEM_EXEC, { runIdPrefix: 'FC-ECHEM', createdAt: TS });
eq(fcEchemRes.runs.length, 3, 'FC 三轨场景执行 3 Run');
eq(fcEchemRes.runs[0].config.electrochem_model, 'off', 'FC Run1（缺省）config.electrochem_model=off（引擎 normalizeConfig 盖章——场景层 absent）');
eq(fcEchemRes.runs[1].config.electrochem_model, 'off', 'FC Run2（显式 off）config.electrochem_model=off');
eq(fcEchemRes.runs[2].config.electrochem_model, 'on', 'FC Run3（显式 on）config.electrochem_model=on（解析值透传引擎）');
eq(fcEchemRes.scenarioHash, SC.scenarioHash(FC_ECHEM_EXEC), 'FC 三轨场景 scenarioHash 与独立计算一致');
ok(fcEchemRes.runs[2].timeseries.signals.T_st_K !== undefined &&
  fcEchemRes.runs[2].timeseries.signals.T_st_K.every((v) => v !== null),
  'FC Run3（on）电化学列面在场（T_st_K 全程有值——simulateFC001Electrochem 分派生效）');
ok(fcEchemRes.runs[0].timeseries.signals.T_st_K === undefined &&
  fcEchemRes.runs[1].timeseries.signals.T_st_K === undefined,
  'FC Run1/2（缺省/显式 off）无电化学列（off 轨结构性缺席——makeSeries onTrackOnly 门控）');
eq(FL.registry.verifyRunHash(fcEchemRes.runs[2]), true, 'FC Run3（on）run_hash 自校验通过');
ok(fcEchemRes.runs[0].manifest.run_hash !== fcEchemRes.runs[2].manifest.run_hash &&
  fcEchemRes.runs[1].manifest.run_hash !== fcEchemRes.runs[2].manifest.run_hash,
  'FC run_hash：缺省/off ↔ on 互异（序列内容承载轨区分）');
ok(fcEchemRes.runs[0].manifest.config_hash === fcEchemRes.runs[2].manifest.config_hash &&
  fcEchemRes.runs[1].manifest.config_hash === fcEchemRes.runs[2].manifest.config_hash,
  'B-3(a) 已知局限登记：FC on/off config_hash 同值（scenarioView 不投影 electrochem_model——轨区分由 run_hash/序列内容承载，不静默）');

/* execute off 等价：场景缺省轨 Run 与手工显式 off Run 逐位一致（off 路径仿真行为
   零变化——B-1(a) 缺省轨只在盖章层解析；FLTH §2.0④ 同款判据） */
const manualFcOff = FL.registry.createRun({
  config: FL.core.createConfig('FC-001', {
    feedback_mode: 'closed_loop',
    fault: { family: 'sensor_drift', t_start_s: 20, params: { magnitude: 10 } },
    electrochem_model: 'off',
    noise: { enabled: false }
  }),
  runId: 'MAN-FC-OFF',
  createdAt: TS
});
eq(fcEchemRes.runs[0].manifest.config_hash, manualFcOff.manifest.config_hash, 'FC 缺省轨 Run config_hash = 手工显式 off Run');
ok(JSON.stringify(fcEchemRes.runs[0].timeseries) === JSON.stringify(manualFcOff.timeseries),
  'FC 缺省轨 Run 时间序列与手工显式 off Run 逐点一致（off 等价）');
eq(fcEchemRes.runs[0].manifest.run_hash, manualFcOff.manifest.run_hash, 'FC 缺省轨 Run run_hash = 手工显式 off Run（t/signals/events/metrics/checks 内容面全等）');

/* 10.6 信封 roundtrip（含 electrochem_model 场景 checksum 稳定——§9 C-5 机制对新键面） */
const envFcOn = SC.exportScenarioEnvelope(scen('FC-001', [Object.assign(clone(FC_ECHEM_EV), { electrochem_model: 'on' })]));
eq(envFcOn.content_checksum, hFcOn, '信封 content_checksum = scenarioHash（含 electrochem_model 场景）');
eq(JSON.stringify(SC.exportScenarioEnvelope(JSON.stringify(scen('FC-001', [Object.assign(clone(FC_ECHEM_EV), { electrochem_model: 'on' })])))),
  JSON.stringify(envFcOn), '含 electrochem_model 场景两次导出逐字节同 JSON（确定性，无时间戳/无随机）');
const rtFcOn = SC.importScenarioEnvelope(JSON.parse(JSON.stringify(envFcOn)));
ok(rtFcOn.ok === true && rtFcOn.via === 'envelope', '含 electrochem_model 信封导入 ok（via=envelope）', JSON.stringify(rtFcOn.errors));
eq(SC.scenarioHash(rtFcOn.scenario), hFcOn, 'roundtrip：含 electrochem_model 场景导出 → 导入 → 同 scenarioHash（checksum 稳定）');


console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('场景编排核心（C-2 S1）测试全部通过：负例 ' + negResults.length + ' 类 / roundtrip / 执行等价 / 字段完整性 + electrochem_model 键节（§10，B-1(a)/Q9）。');
