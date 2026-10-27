/* owner: core-contract | module: tests/schema | contract: NEXT/DATA_CONTRACT_SPEC.md
   G2 四件套④ Schema/单位字典（PHY-10 / SA-24 子集 / I-01）。
   运行：node tests/schema.test.js；失败非零退出。 */
'use strict';

const { bootstrap } = require('./core-load');
const FL = bootstrap();
const contract = FL.contract;
const core = FL.core;

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }
function code(problems, expected, name) {
  const got = (problems || []).map((p) => p.code);
  ok(got.indexOf(expected) !== -1, name, 'expected 含 ' + expected + '，actual ' + JSON.stringify(got));
}

/* ------------------------------------------------------------------ *
 * 1. SignalCatalog（契约 §2.3 / §9）
 * ------------------------------------------------------------------ */
const sys = FL.systems._raw.get('FL-001');
const cat = sys.signals.map((s) => Object.assign({}, s));
eq(contract.validateSignalCatalog(cat).length, 0, 'FL-001 SignalCatalog 校验通过');
cat.forEach((s) => {
  ok(contract.UNIT_DICT[s.unit] !== undefined, '信号 ' + s.id + ' 单位在字典内（' + s.unit + '）');
  ok(contract.EXPOSURES.indexOf(s.exposure) !== -1, '信号 ' + s.id + ' exposure 合法（' + s.exposure + '）');
  ok(s.blindVisible === (s.exposure === 'blind_observable'), '信号 ' + s.id + ' blindVisible 由 exposure 派生');
});
eq(cat.filter((s) => s.id === 'I_bat_true_A')[0].exposure, 'public_demo', 'I_bat_true_A(MODEL_STATE)=public_demo');
eq(cat.filter((s) => s.id === 'I_bat_meas_A')[0].exposure, 'blind_observable', 'I_bat_meas_A(OBSERVATION)=blind_observable');
eq(cat.filter((s) => s.id === 'bias_A')[0].exposure, 'public_demo', 'bias_A(FAULT_EVENT)=public_demo');
eq(new Set(cat.map((s) => s.id)).size, cat.length, 'signal_id 无重复');

code(contract.validateSignalCatalog([Object.assign({}, cat[0], { unit: 'furlong' })]), 'CN-E02', '未知单位拒绝（CN-E02）');
code(contract.validateSignalCatalog([cat[0], Object.assign({}, cat[0])]), 'CN-E02', '重复信号 id 拒绝');
code(contract.validateSignalCatalog([Object.assign({}, cat[0], { exposure: 'everyone' })]), 'CN-E02', '未知 exposure 拒绝');
code(contract.validateSignalCatalog([Object.assign({}, cat[0], { exposure: 'blind_observable', blindVisible: false })]), 'CN-E02',
  'blindVisible 与 exposure 不一致拒绝（派生字段禁止独立设置）');

/* ------------------------------------------------------------------ *
 * 2. ScenarioConfig §2.1 视图与校验（T-07 负例子集）
 * ------------------------------------------------------------------ */
const cfgFault = core.createConfig('FL-001', {});
const scFault = contract.scenarioView(cfgFault);
eq(scFault.model_id, 'fl001', 'scenarioView.model_id=fl001（契约 §1.1）');
eq(scFault.model_version, 'fl001.1', 'scenarioView.model_version=fl001.1');
eq(scFault.bias_A, 10, 'scenarioView.bias_A=+10');
eq(scFault.fault_time_s, 20, 'scenarioView.fault_time_s=20.0');
eq(scFault.feedback_mode, 'closed_loop', 'scenarioView.feedback_mode');
eq(scFault.initial_load_kW, 30, 'scenarioView.initial_load_kW=30');
eq(scFault.initial_SOC_pct, 60, 'scenarioView.initial_SOC_pct=60');
eq(scFault.noise, null, 'scenarioView.noise=null（P0）');
const cfgBase = core.createConfig('FL-001', { fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } });
eq(contract.scenarioView(cfgBase).bias_A, 0, '基准 bias_A=0');

eq(contract.validateScenarioConfig(scFault).length, 0, 'faulted ScenarioConfig 校验通过');
eq(contract.validateScenarioConfig(contract.scenarioView(cfgBase)).length, 0, 'baseline ScenarioConfig 校验通过');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { fault_time_s: 20.05 })), 'CN-E02', '故障时刻未对齐 dt 网格拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { bias_A: 30 })), 'CN-E02', 'bias 超出 |b|≤20 拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { feedback_mode: 'open_loop' })), 'CN-E02', '未知 feedback_mode 拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { duration_s: 60.55 })), 'CN-E02', 'duration 非 dt 整数倍拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { schema_version: '2.0.0' })), 'CN-E02', 'schema_version 不符拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { bias_A: NaN })), 'CN-E02', 'NaN 参数拒绝');
code(contract.validateScenarioConfig(Object.assign({}, scFault, { initial_load_kW: Infinity })), 'CN-E02', 'Infinity 参数拒绝');

/* ------------------------------------------------------------------ *
 * 3. TimeSeries §2.4（n 由参数派生，禁止硬编码 601；T-07 / SA-01）
 * ------------------------------------------------------------------ */
const run = core.simulate(cfgFault, { runId: 'SCHEMA-TEST' });
const ts = run.timeseries;
eq(contract.deriveNSamples(60, 0.1), 601, 'n = duration/dt + 1 = 601（派生）');
eq(contract.deriveNSamples(30, 0.1), 301, 'P1 变 duration 时 n 随参数派生（非硬编码）');
eq(contract.validateTimeSeries(ts, { duration_s: 60, dt_s: 0.1 }).length, 0, '引擎 TimeSeries 校验通过');
ok(Math.abs(ts.t[199] - 19.900000000000002) < 1e-18, 't[199] 为 199·0.1 的 IEEE-754 值');
ok(ts.t[200] === 20, 't[200]=20（post 行）');
code(contract.validateTimeSeries({ t: ts.t.slice(0, 600), signals: {} }, { duration_s: 60, dt_s: 0.1 }), 'CN-E03', '点数不足拒绝');
code(contract.validateTimeSeries({ t: [0, 0.2, 0.1].concat(ts.t.slice(3)), signals: {} }, { duration_s: 60, dt_s: 0.1 }), 'CN-E03', '时间非单调拒绝');
code(contract.validateTimeSeries({ t: ts.t.map((v) => v + 0.05), signals: {} }, { duration_s: 60, dt_s: 0.1 }), 'CN-E03', '网格偏移拒绝（t[i]≠i·dt）');
const badT = ts.t.slice(); badT[5] = NaN;
code(contract.validateTimeSeries({ t: badT, signals: {} }, { duration_s: 60, dt_s: 0.1 }), 'CN-E03', 'NaN 时间拒绝');
const badSig = JSON.parse(JSON.stringify(ts.signals)); badSig.I_bat_true_A[7] = Infinity;
code(contract.validateTimeSeries({ t: ts.t, signals: badSig }, { duration_s: 60, dt_s: 0.1 }), 'CN-E04', '信号含 Infinity 拒绝（CN-E04）');

/* ------------------------------------------------------------------ *
 * 4. EventSnapshot §2.5（CN-E05）
 * ------------------------------------------------------------------ */
eq(contract.validateEventSnapshots(run.events, run.snapshots, scFault).length, 0, '事件快照契约校验通过');
code(contract.validateEventSnapshots(run.events, [run.snapshots[0]], scFault), 'CN-E05', '缺 post 快照拒绝（成对）');
code(contract.validateEventSnapshots(run.events,
  [Object.assign({}, run.snapshots[0], { t_s: 19.9 }), run.snapshots[1]], scFault), 'CN-E05', 'pre.t_s=19.9 拒绝（必须为 20.0）');
code(contract.validateEventSnapshots(run.events,
  [Object.assign({}, run.snapshots[0], { derivation: 'post_sample' }), run.snapshots[1]], scFault), 'CN-E05', 'pre.derivation 错误拒绝');

/* ------------------------------------------------------------------ *
 * 5. DerivedMetric / QualityChecks / RunManifest（CN-E01/E02/E04）
 * ------------------------------------------------------------------ */
const contractMetrics = FL.registry.contractMetrics(run.metrics);
eq(contract.validateMetrics(contractMetrics).length, 0, '契约指标投影校验通过');
code(contract.validateMetrics(contractMetrics.map((m) => m.unit === 'pp' ? Object.assign({}, m, { unit: '%' }) : m)), 'CN-E02',
  'SOC_err 单位为 % 拒绝（必须 pp）');
code(contract.validateMetrics([Object.assign({}, contractMetrics[0], { method: 'magic' })]), 'CN-E02', '未知 method 拒绝');
code(contract.validateMetrics([Object.assign({}, contractMetrics[0], { value: null, unavailable_reason: null })]), 'CN-E01',
  'value=null 缺 unavailable_reason 拒绝');
eq(contract.validateChecks(FL.registry.contractChecks(run.quality)).length, 0, '契约检查投影校验通过');
code(contract.validateChecks([{ check_id: 'X', status: 'maybe', owner: 'numeric' }]), 'CN-E02', '未知 status 拒绝');
code(contract.validateChecks([{ check_id: 'X', status: 'pass', owner: 'nobody' }]), 'CN-E02', '未知 owner 拒绝');

const manifest = run.manifest || null;
ok(manifest === null, 'engine.simulate 原始输出不含 manifest（由 registry 添加）');
const frozenRun = FL.registry.createRun({ config: core.createConfig('FL-001', {}), runId: 'SCHEMA-R2', createdAt: '2026-10-28T00:00:00Z' });
eq(contract.validateRunManifest(frozenRun.manifest).length, 0, 'RunManifest 契约校验通过');
const badManifest = JSON.parse(JSON.stringify(frozenRun.manifest));
badManifest.verification.model_validation = 'passed';
code(contract.validateRunManifest(badManifest), 'CN-E02', 'model_validation≠not_performed 拒绝（L0 无实测验证）');
code(contract.validateRunManifest(Object.assign({}, badManifest, {
  verification: frozenRun.manifest.verification, integrity: { run_hash: 'deadbeef', checks_status: 'pass' }
})), 'CN-E01', 'integrity.run_hash 与 run_hash 不一致拒绝');

/* ------------------------------------------------------------------ *
 * 6. project(run,'demo'|'blind')（契约 §2.13 / G0-DEC-11 / T-16 子集）
 * ------------------------------------------------------------------ */
const demo = contract.project(frozenRun, 'demo');
ok(demo.truth !== null && demo.truth.faultFamily === 'sensor_drift', 'demo 投影含 truth（演示公开）');
eq(demo.timeseries.t.length, 601, 'demo 投影保留完整 TimeSeries');
const before = JSON.stringify(frozenRun);
contract.project(frozenRun, 'blind');
eq(JSON.stringify(frozenRun), before, 'project 不修改原 Run（纯函数）');

const blind = contract.project(frozenRun, 'blind');
const blindIds = blind.signals.map((s) => s.id);
ok(blindIds.indexOf('I_bat_true_A') === -1, 'blind 不含 *_true_* 信号');
ok(blindIds.indexOf('bias_A') === -1, 'blind 不含 bias_A');
ok(blind.signals.every((s) => s.exposure === 'blind_observable'), 'blind 仅含 exposure=blind_observable');
eq(blind.events[0].magnitude, undefined, 'blind 事件不含幅值（脱敏）');
eq(blind.events[0].trigger_s, 20, 'blind 事件保留时间');
ok(blind.metrics.every((m) => m.metric_id.indexOf('true') === -1), 'blind 指标不含真值口径');
ok(blind.config.fault === undefined, 'blind config 无 fault');
ok(blind.truth === undefined, 'blind 无 truth');

/* 递归泄露断言：注入真值键后 blindScan 必须命中 */
const leakHits = contract.blindScan({ a: { SOC_true_pct: [1] }, b: [{ bias_A: 1 }], truth: { x: 1 } }, '$', []);
ok(leakHits.length >= 3, 'blindScan 递归捕获泄露键', JSON.stringify(leakHits));
ok(contract.looksBlindBanned('I_bat_true_A') && contract.looksBlindBanned('bias_A') && contract.looksBlindBanned('I_bat_cap_A'),
  'blindScan 命中 _true_/bias_A/_cap_');

/* ------------------------------------------------------------------ *
 * 7. 错误对象形态（契约 §7.1）
 * ------------------------------------------------------------------ */
const e = contract.validateSignalCatalog([{ id: 'x', unit: 'bad', sourceKind: 'OBSERVATION', exposure: 'public_demo', precision: 2 }])[0];
ok(e && e.code === 'CN-E02' && typeof e.message === 'string' && typeof e.next === 'string',
  '契约错误含 code/message/next（中文可读）', JSON.stringify(e));

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('Schema/契约测试全部通过。');
