/* owner: core-engine | module: tests/event-phase | contract: MODEL_VALIDATION_SPEC §1.4 / DATA_CONTRACT_SPEC §2.5
   G2 事件相位测试（I-02 / T-02 / SA-19 / PHY-02 子集 / G0-DEC-05）。
   运行：node tests/event-phase.test.js；失败非零退出。 */
'use strict';

const { bootstrap } = require('./core-load');
const FL = bootstrap();
const core = FL.core;

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }
function close(a, b, tol, name) {
  ok(typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= tol, name,
    'expected ' + b + ' ±' + tol + '，actual ' + a);
}

function makeRun(patch) {
  return core.simulate(core.createConfig('FL-001', patch || {}), { runId: 'EVT-TEST' });
}

/* ------------------------------------------------------------------ *
 * 1. 时间网格：t[i] = i·dt（禁止累加；N-02）
 * ------------------------------------------------------------------ */
const run = makeRun();
const t = run.timeseries.t;
eq(t.length, 601, '601 点（60/0.1+1）');
let gridOk = true;
for (let i = 0; i < t.length; i++) if (Math.abs(t[i] - i * 0.1) > 1e-12) gridOk = false;
ok(gridOk, 't[i] = i·dt 逐点精确（1e-12）');
ok(t[199] === 199 * 0.1 && Math.abs(t[199] - 19.900000000000002) < 1e-18,
  't[199] 为 199·0.1 的 IEEE-754 值 19.900000000000002（规格 §1.4）', String(t[199]));
ok(t[200] === 20, 't[200] === 20（精确）', String(t[200]));
ok(t[600] === 60, 't[600]=60');

/* ------------------------------------------------------------------ *
 * 2. 事件快照：pre=20.0 左极限 / post=20.0 右采样行（T-02 / SA-19）
 * ------------------------------------------------------------------ */
const pre = run.snapshots.filter((s) => s.phase === 'pre')[0];
const post = run.snapshots.filter((s) => s.phase === 'post')[0];
ok(!!pre && !!post, 'pre+post 成对');
close(pre.t_s, 20.0, 0, 'pre.t_s = 20.0（左极限；不是 19.9）');
close(post.t_s, 20.0, 0, 'post.t_s = 20.0');
eq(pre.derivation, 'left_limit', 'pre.derivation=left_limit');
eq(post.derivation, 'post_sample', 'post.derivation=post_sample');
eq(pre.snapshot_id, 'EV-001-pre', 'snapshot_id 契约字段');
eq(pre.event_id, 'EV-001', 'event_id');
eq(post.fault_id, 'I_bat_sensor_bias', 'fault_id 引用 config.fault.faultId');
close(pre.variables.I_bat_true_A, 25, 1e-12, 'pre I_true=25 A');
close(pre.variables.I_bat_meas_A, 25, 1e-12, 'pre I_meas=25 A（T-02）');
close(pre.variables.bias_A, 0, 1e-12, 'pre bias=0');
close(post.variables.I_bat_true_A, 25, 1e-12, 'post I_true=25 A（C0 连续）');
close(post.variables.I_bat_meas_A, 35, 1e-12, 'post I_meas=35 A（T-02）');
close(post.variables.bias_A, 10, 1e-12, 'post bias=+10');
ok(pre.units && pre.units.I_bat_meas_A === 'A' && pre.units.r_true_kW === 'kW', '快照 units 与 SignalCatalog 一致');

/* 19.9 只是上一常规采样点：值与 pre 相同（FL-001 事件前恒定），但不得写入 pre.t_s */
close(core.sampleAt(run, 'I_bat_meas_A', 19.9).value, 25, 1e-12, '19.9 s 常规采样 I_meas=25');
ok(!run.snapshots.some((s) => Math.abs(s.t_s - 19.9) < 1e-9), '任何快照 t_s 都不是 19.9');

/* 索引语义（PHY-02）：i_f=round(t_f/dt)=200；t[i_f] 行为 post */
const iF = Math.round(20 / 0.1);
close(run.timeseries.signals.I_bat_meas_A[iF], 35, 1e-12, 't[i_f=200] 行 I_meas=35（post）');
close(run.timeseries.signals.I_meas_alias_check || run.timeseries.signals.I_bat_meas_A[iF - 1], 25, 1e-12, 't[199] 行 I_meas=25');
eq(run.timeseries.signals.bias_A[iF], 10, 't[i_f] 行 bias=10');
eq(run.timeseries.signals.bias_A[iF - 1], 0, 't[199] 行 bias=0');
/* 偏置约束逐点：I_meas − I_true − b(t) ≈ 0（≤3.55e-15，PHY-02 口径 ≤1e-9） */
let maxBiasResid = 0;
for (let i = 0; i < 601; i++) {
  maxBiasResid = Math.max(maxBiasResid,
    Math.abs(run.timeseries.signals.I_bat_meas_A[i] - run.timeseries.signals.I_bat_true_A[i] - run.timeseries.signals.bias_A[i]));
}
ok(maxBiasResid <= 1e-9, 'I_meas−I_true−b(t) ≡ 0（max ≤1e-9 A）', String(maxBiasResid));

/* ------------------------------------------------------------------ *
 * 3. monitor 模式同语义（事件两相位值一致）
 * ------------------------------------------------------------------ */
const mon = makeRun({ feedback_mode: 'monitor' });
const mpre = mon.snapshots.filter((s) => s.phase === 'pre')[0];
const mpost = mon.snapshots.filter((s) => s.phase === 'post')[0];
close(mpre.variables.I_bat_meas_A, 25, 1e-12, 'monitor pre I_meas=25');
close(mpost.variables.I_bat_meas_A, 35, 1e-12, 'monitor post I_meas=35');
close(mpost.variables.I_bat_true_A, 25, 1e-12, 'monitor post I_true=25（不进入物理回路）');

/* ------------------------------------------------------------------ *
 * 4. 基准运行无事件/快照
 * ------------------------------------------------------------------ */
const base = makeRun({ fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } });
eq(base.events.length, 0, '基准无事件');
eq(base.snapshots.length, 0, '基准无快照');

/* ------------------------------------------------------------------ *
 * 5. 质量检查 event-window 通过（新语义）
 * ------------------------------------------------------------------ */
const evCheck = run.quality.filter((q) => q.check_id === 'event-window')[0];
eq(evCheck.status, 'pass', 'event-window 检查 pass');
ok(evCheck.reason.indexOf('left_limit') !== -1 && evCheck.reason.indexOf('19.9') !== -1,
  'event-window 说明含 left_limit 与 19.9 语义', evCheck.reason);

/* ------------------------------------------------------------------ *
 * 6. 导出编码：timeseries.csv 20.0 行 = post；events.json 含 pre/post
 *    （DATA_CONTRACT_SPEC §2.5/§3.3；冲突以 events 相位为准）
 * ------------------------------------------------------------------ */
const csvText = FL.bundle.timeseriesCsv(run);
ok(csvText.charCodeAt(0) === 0xFEFF, 'CSV 带 BOM（契约 §3.3）');
const lines = csvText.replace(/^\uFEFF/, '').split('\n').filter((l) => l.trim());
const header = lines.filter((l) => l.charAt(0) !== '#')[0];
const cols = header.split(',');
const iMeasCol = cols.indexOf('I_bat_meas_A');
const dataRows = lines.slice(lines.indexOf(header) + 1);
eq(dataRows.length, 601, 'CSV 数据 601 行');
let csvPostRow = null;
let csvRowCountWithT20 = 0;
dataRows.forEach((row) => {
  const cells = row.split(',');
  if (Number(cells[0]) === 20) { csvPostRow = cells; csvRowCountWithT20++; }
});
eq(csvRowCountWithT20, 1, 't=20.0 恰好一行（即 post 采样行）');
close(Number(csvPostRow[iMeasCol]), 35, 1e-12, 'CSV 20.0 行 I_meas=35（= post）');
const csvLine19 = dataRows.map((r) => r.split(',')).filter((c) => Math.abs(Number(c[0]) - 19.9) < 1e-9)[0];
close(Number(csvLine19[iMeasCol]), 25, 1e-12, 'CSV 19.9 行 I_meas=25（常规采样）');

const bundleFiles = FL.bundle.buildBundleFiles(FL.registry.createRun({
  config: core.createConfig('FL-001', {}), runId: 'EVT-BUNDLE', createdAt: '2026-10-28T00:00:00Z'
}));
const eventsWrap = JSON.parse(bundleFiles['events.json']);
eq(eventsWrap.events.length, 1, 'events.json 含事件');
const snaps = eventsWrap.events[0].snapshots;
eq(snaps.length, 2, 'events.json 同时含 pre/post');
eq(snaps[0].phase, 'pre', 'events.json phases 含 pre');
eq(snaps[1].phase, 'post', 'events.json phases 含 post');
close(snaps[0].t_s, 20, 0, 'events.json pre.t_s=20.0');
close(snaps[1].t_s, 20, 0, 'events.json post.t_s=20.0');
ok(bundleFiles['manifest.json'].indexOf('"event_encoding_version": 1') !== -1, 'manifest 记 event_encoding_version=1');

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('事件相位测试全部通过（pre=20.0−，post=20.0+，19.9 只是普通采样）。');
