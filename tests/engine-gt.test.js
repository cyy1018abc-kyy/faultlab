/* owner: core-engine | module: tests/engine-gt | contract: NEXT/GT001_G2B_SPEC_APPROVED.md §8 / V3-31
   GT-001 引擎 ↔ golden 一致性（V3-33 验收；oracle 只读生成，engine 只读比对）。
   运行：node tests/engine-gt.test.js；失败非零退出。
   覆盖：5 Run × 序列逐点（gate 容差：f ±1e-9 / rpm ±1e-9 / kW rtol 1e-12 / SOC pp ±1e-5 /
         r_true ±1e-9）+ 指标子集 + 事件 pre/post + scope=extension_preview +
         GT 专属 PHY 检查（gt-energy-consistency / gt-bat-envelope）+ run_hash 可重算。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { bootstrap } = require('./core-load');

const FL = bootstrap();

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'golden', 'gt001_v1.json'), 'utf8'));
const tol = golden.tolerances.gate;
const n = golden.sampling.n;

/* golden 容差类（与 verify_golden.py series_limit 同口径） */
function seriesLimit(sid) {
  if (sid === 't') return tol.t_s;
  if (sid.endsWith('_Hz')) return tol.f_Hz_atol;
  if (sid.endsWith('_rpm')) return tol.n_rpm_atol;
  if (sid.endsWith('_kW')) return Math.max(tol.P_kW_atol, tol.P_kW_rtol * 1.0);
  if (sid.startsWith('SOC')) return tol.SOC_pp;
  if (sid.indexOf('r_true') !== -1) return tol.r_true_kW;
  return tol.f_Hz_atol;
}
function metricTol(mid, unit) {
  if (unit === 'Hz') return tol.f_Hz_atol;
  if (unit === 'kWh') return tol.E_kWh;
  if (unit === 'pp' || unit === '%') return tol.SOC_pp;
  if (mid.indexOf('max_abs_r_true') !== -1) return tol.r_true_kW;
  if (mid.indexOf('max_abs_f_channel_diff') !== -1) return tol.f_Hz_atol;
  return tol.E_kWh;
}

const RUN_CFG = {
  healthy: { fault: { family: 'none' }, feedback_mode: 'closed_loop' },
  closed_loop_fault: { fault: { family: 'sensor_drift' }, feedback_mode: 'closed_loop' },
  monitor_only: { fault: { family: 'sensor_drift' }, feedback_mode: 'monitor' },
  load_step: { fault: { family: 'load_step' }, feedback_mode: 'closed_loop' },
  actuator_fault: { fault: { family: 'actuator_fault' }, feedback_mode: 'closed_loop' }
};

Object.keys(golden.runs).forEach((runKey) => {
  const g = golden.runs[runKey];
  const cfg = FL.core.createConfig('GT-001', JSON.parse(JSON.stringify(RUN_CFG[runKey])));
  const run = FL.registry.createRun({ config: cfg, runId: 'GT-GOLDEN-' + runKey });

  /* 序列逐点（golden 子集 ∩ 引擎序列） */
  let worst = 0;
  let worstSid = '';
  const missing = [];
  Object.keys(g.series).forEach((sid) => {
    const mine = run.timeseries.signals[sid];
    if (!mine || mine.length !== n) { missing.push(sid); return; }
    const lim = seriesLimit(sid);
    for (let i = 0; i < n; i++) {
      const d = Math.abs((g.series[sid][i] || 0) - (mine[i] || 0));
      if (d > lim) {
        const rel = g.series[sid][i] !== 0 ? d / Math.abs(g.series[sid][i]) : d;
        if (rel > worst) { worst = rel; worstSid = sid + '[' + i + ']'; }
      }
    }
  });
  eq(missing.length, 0, runKey + '：golden 序列在引擎中齐备');
  ok(worst <= 1e-9, runKey + '：序列逐点 ≤ gate 容差（最差相对 ' + worst.toExponential(2) + ' @ ' + worstSid + '）');

  /* 指标子集 */
  const mBad = [];
  Object.keys(g.metrics).forEach((mid) => {
    const gm = g.metrics[mid];
    const mm = run.metrics.find((m) => m.metric_id === mid);
    if (!mm) { mBad.push(mid + ' 缺失'); return; }
    const lim = metricTol(mid, gm.unit);
    if (gm.value === null || mm.value === null) {
      if ((gm.value === null) !== (mm.value === null)) mBad.push(mid + ' null 位形不一致');
      return;
    }
    if (Math.abs(mm.value - gm.value) > lim) mBad.push(mid + ' ' + mm.value + ' vs ' + gm.value);
  });
  eq(mBad.length, 0, runKey + '：指标子集一致（' + Object.keys(g.metrics).length + ' 项）', mBad.join(' | '));

  /* 事件 pre/post（故障局） */
  if ((g.events || []).length) {
    const ge = g.events[0], fe = run.events[0];
    eq(fe.trigger_s, ge.trigger_s, runKey + '：事件时刻');
    eq(fe.event_type, ge.event_type, runKey + '：event_type');
    const gp = ge.snapshots[0];
    const fp = run.snapshots.find((x) => x.snapshot_id === fe.preSnapshotId);
    const gq = ge.snapshots[1];
    const fq = run.snapshots.find((x) => x.snapshot_id === fe.postSnapshotId);
    ok(!!fp && !!fq, runKey + '：引擎快照经 preSnapshotId/postSnapshotId 引用可达');
    eq(fp.t_s, gp.t_s, runKey + '：pre t_s=事件时刻');
    eq(fp.derivation, 'left_limit', runKey + '：pre derivation');
    eq(fq.derivation, 'post_sample', runKey + '：post derivation');
    const dPre = Math.abs(fp.variables.n_meas_rpm - gp.variables.n_meas_rpm);
    const dPost = Math.abs(fq.variables.n_meas_rpm - gq.variables.n_meas_rpm);
    ok(dPre <= tol.n_rpm_atol && dPost <= tol.n_rpm_atol,
      runKey + '：pre/post n_meas 相位值 ±1e-9 rpm', dPre + '/' + dPost);
  } else {
    eq(run.events.length, 0, runKey + '：健康局无事件');
  }

  /* scope + GT 专属 PHY 检查 + 哈希 */
  eq(run.manifest.scope, 'extension_preview', runKey + '：GT Run scope=extension_preview');
  ok(run.quality.some((q) => q.check_id === 'gt-energy-consistency' && q.status === 'pass'),
    runKey + '：gt-energy-consistency pass（线性化能量离散自洽）');
  ok(run.quality.some((q) => q.check_id === 'gt-bat-envelope' && q.status === 'pass'),
    runKey + '：gt-bat-envelope pass（±25 kW 包络）');
  ok(run.quality.some((q) => q.check_id === 'conservation-meas' &&
    (runKey === 'closed_loop_fault' || runKey === 'monitor_only' ? q.status === 'warn' : q.status === 'pass')),
    runKey + '：频率通道冗余一致性检查（健康 pass / 故障 warn）');
  eq(FL.registry.verifyRunHash(run), true, runKey + '：run_hash 可重算');
});

/* ---------- 汇总 ---------- */
console.log('\n== GT-001 引擎 ↔ golden 一致性（V3-31/V3-33） ==');
if (fail) {
  console.log('FAIL ' + fail + ' / PASS ' + pass);
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('PASS ' + pass + ' / FAIL 0 ✓（5 Run × 序列/指标/事件/scope/GT PHY 检查/哈希）');
