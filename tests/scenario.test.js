/* owner: core-scenario | module: tests/scenario | contract: FaultLab-evaluation/NEXT/V06_ROADMAP.md §7 S1（C-2 骨架，CHG-20261104-08）
   场景编排核心测试：负例（≥10 类）/ roundtrip（键序不敏感）/ 执行等价（场景 Run vs 单独 Run，
   序列逐点一致 + config_hash/run_hash 全等）/ 校验器错误信息字段完整性。
   运行：node tests/scenario.test.js；失败非零退出。
   装载：本波 S1 独立交付，不改动 tests/core-load.js 的 CORE_FILES（并发路隔离）——
   bootstrap() 后按同一 eval 机制补装 src/core/scenario.js；S5（run-g2 第 26 步接线）
   落地时可将其并入 CORE_FILES 装载清单。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { bootstrap, CORE_DIR } = require('./core-load');

const FL = bootstrap();
(0, eval)(fs.readFileSync(path.join(CORE_DIR, 'scenario.js'), 'utf8'));

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


console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('场景编排核心（C-2 S1）测试全部通过：负例 ' + negResults.length + ' 类 / roundtrip / 执行等价 / 字段完整性。');
