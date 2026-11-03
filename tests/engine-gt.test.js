/* owner: core-engine | module: tests/engine-gt | contract: NEXT/GT001_G2B_SPEC_APPROVED.md §8 / V3-31
   + NEXT/ALINE_MODEL_DEPTH_DESIGN.md §4（A-1 swing 双轨，CHG-20261102-01）
   GT-001 引擎 ↔ golden 一致性（oracle 只读生成，engine 只读比对）。
   运行：node tests/engine-gt.test.js；失败非零退出。
   双轨结构（D-1/D-2 定案）：
     gt001_v1（linear 遗留轨，字节冻结）：cfg.inertia_model='linear'，锚点为 G2b §4/§9 定案值；
     gt001_v2（swing 默认轨）：cfg.inertia_model='swing'，锚点为 A-1 oracle 重冻结值。
   覆盖：6 Run × 序列逐点（gate 容差：f ±1e-9 / rpm ±1e-9 / kW rtol 1e-12 / SOC pp ±1e-5 /
         r_true ±1e-9）+ 指标子集 + 事件 pre/post + scope=extension_preview +
         GT 专属 PHY 检查（gt-energy-consistency 按轨分派 / gt-bat-envelope）+ run_hash 可重算 +
         双轨分歧断言（swing nadir 更深；健康局两轨逐位一致）。 */
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
function close(a, b, tol, name) { ok(Math.abs(a - b) <= tol, name, 'expected ' + b + ' ±' + tol + '，actual ' + a); }

/* golden 容差类（与 verify_golden.py series_limit 同口径） */
function seriesLimit(tol, sid) {
  if (sid === 't') return tol.t_s;
  if (sid.endsWith('_Hz')) return tol.f_Hz_atol;
  if (sid.endsWith('_rpm')) return tol.n_rpm_atol;
  if (sid.endsWith('_kW')) return Math.max(tol.P_kW_atol, tol.P_kW_rtol * 1.0);
  if (sid.startsWith('SOC')) return tol.SOC_pp;
  if (sid.indexOf('r_true') !== -1) return tol.r_true_kW;
  return tol.f_Hz_atol;
}
function metricTol(tol, mid, unit) {
  if (unit === 'Hz') return tol.f_Hz_atol;
  if (unit === 'kWh') return tol.E_kWh;
  if (unit === 'pp' || unit === '%') return tol.SOC_pp;
  if (mid.indexOf('max_abs_r_true') !== -1) return tol.r_true_kW;
  if (mid.indexOf('max_abs_f_channel_diff') !== -1) return tol.f_Hz_atol;
  return tol.E_kWh;
}

const RUNS_CFG = {
  healthy: { fault: { family: 'none' }, feedback_mode: 'closed_loop' },
  closed_loop_fault: { fault: { family: 'sensor_drift' }, feedback_mode: 'closed_loop' },
  monitor_only: { fault: { family: 'sensor_drift' }, feedback_mode: 'monitor' },
  load_step: { fault: { family: 'load_step' }, feedback_mode: 'closed_loop' },
  actuator_fault: { fault: { family: 'actuator_fault' }, feedback_mode: 'closed_loop' },
  actuator_clear: { fault: { family: 'actuator_fault', t_clear_s: 35.0 }, feedback_mode: 'closed_loop' }
};

/* 单 golden 全量比对（6 Run × 序列/指标/事件/scope/PHY/哈希） */
function verifyGolden(goldenFile, inertiaModel, tag) {
  const golden = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'golden', goldenFile), 'utf8'));
  const tol = golden.tolerances.gate;
  const n = golden.sampling.n;
  const trackRuns = {};

  Object.keys(golden.runs).forEach((runKey) => {
    const g = golden.runs[runKey];
    const cfg = FL.core.createConfig('GT-001', Object.assign(
      JSON.parse(JSON.stringify(RUNS_CFG[runKey])), { inertia_model: inertiaModel }));
    eq(cfg.inertia_model, inertiaModel, tag + ' ' + runKey + '：cfg.inertia_model 生效');
    const run = FL.registry.createRun({ config: cfg, runId: 'GT-GOLDEN-' + tag + '-' + runKey });
    trackRuns[runKey] = run;

    /* 序列逐点（golden 子集 ∩ 引擎序列） */
    let worst = 0;
    let worstSid = '';
    const missing = [];
    Object.keys(g.series).forEach((sid) => {
      const mine = run.timeseries.signals[sid];
      if (!mine || mine.length !== n) { missing.push(sid); return; }
      const lim = seriesLimit(tol, sid);
      for (let i = 0; i < n; i++) {
        const d = Math.abs((g.series[sid][i] || 0) - (mine[i] || 0));
        if (d > lim) {
          const rel = g.series[sid][i] !== 0 ? d / Math.abs(g.series[sid][i]) : d;
          if (rel > worst) { worst = rel; worstSid = sid + '[' + i + ']'; }
        }
      }
    });
    eq(missing.length, 0, tag + ' ' + runKey + '：golden 序列在引擎中齐备');
    ok(worst <= 1e-9, tag + ' ' + runKey + '：序列逐点 ≤ gate 容差（最差相对 ' + worst.toExponential(2) + ' @ ' + worstSid + '）');

    /* 指标子集 */
    const mBad = [];
    Object.keys(g.metrics).forEach((mid) => {
      const gm = g.metrics[mid];
      const mm = run.metrics.find((m) => m.metric_id === mid);
      if (!mm) { mBad.push(mid + ' 缺失'); return; }
      const lim = metricTol(tol, mid, gm.unit);
      if (gm.value === null || mm.value === null) {
        if ((gm.value === null) !== (mm.value === null)) mBad.push(mid + ' null 位形不一致');
        return;
      }
      if (Math.abs(mm.value - gm.value) > lim) mBad.push(mid + ' ' + mm.value + ' vs ' + gm.value);
    });
    eq(mBad.length, 0, tag + ' ' + runKey + '：指标子集一致（' + Object.keys(g.metrics).length + ' 项）', mBad.join(' | '));

    /* 事件 pre/post（故障局） */
    if ((g.events || []).length) {
      const ge = g.events[0], fe = run.events[0];
      eq(fe.trigger_s, ge.trigger_s, tag + ' ' + runKey + '：事件时刻');
      eq(fe.event_type, ge.event_type, tag + ' ' + runKey + '：event_type');
      const gp = ge.snapshots[0];
      const fp = run.snapshots.find((x) => x.snapshot_id === fe.preSnapshotId);
      const gq = ge.snapshots[1];
      const fq = run.snapshots.find((x) => x.snapshot_id === fe.postSnapshotId);
      ok(!!fp && !!fq, tag + ' ' + runKey + '：引擎快照经 preSnapshotId/postSnapshotId 引用可达');
      eq(fp.t_s, gp.t_s, tag + ' ' + runKey + '：pre t_s=事件时刻');
      eq(fp.derivation, 'left_limit', tag + ' ' + runKey + '：pre derivation');
      eq(fq.derivation, 'post_sample', tag + ' ' + runKey + '：post derivation');
      const dPre = Math.abs(fp.variables.n_meas_rpm - gp.variables.n_meas_rpm);
      const dPost = Math.abs(fq.variables.n_meas_rpm - gq.variables.n_meas_rpm);
      ok(dPre <= tol.n_rpm_atol && dPost <= tol.n_rpm_atol,
        tag + ' ' + runKey + '：pre/post n_meas 相位值 ±1e-9 rpm', dPre + '/' + dPost);
    } else {
      eq(run.events.length, 0, tag + ' ' + runKey + '：健康局无事件');
    }

    /* scope + GT 专属 PHY 检查 + 哈希 */
    eq(run.manifest.scope, 'extension_preview', tag + ' ' + runKey + '：GT Run scope=extension_preview');
    ok(run.quality.some((q) => q.check_id === 'gt-energy-consistency' && q.status === 'pass'),
      tag + ' ' + runKey + '：gt-energy-consistency pass（' + (inertiaModel === 'linear' ? 'linear 轨：线性化能量离散自洽' : 'swing 轨：摇摆方程能量闭合') + '）');
    ok(run.quality.some((q) => q.check_id === 'gt-bat-envelope' && q.status === 'pass'),
      tag + ' ' + runKey + '：gt-bat-envelope pass（±25 kW 包络）');
    ok(run.quality.some((q) => q.check_id === 'conservation-meas' &&
      (runKey === 'closed_loop_fault' || runKey === 'monitor_only' ? q.status === 'warn' : q.status === 'pass')),
      tag + ' ' + runKey + '：频率通道冗余一致性检查（健康 pass / 故障 warn）');
    eq(FL.registry.verifyRunHash(run), true, tag + ' ' + runKey + '：run_hash 可重算');

    /* 清除局（G2b v1.1 §9 扩展轮）：钳位释放 + EV-002 + 恢复锚点 */
    if (runKey === 'actuator_clear') {
      eq(run.events.length, 2, tag + ' ' + runKey + '：EV-001 + EV-002（清除）');
      const ev2 = run.events[1];
      eq(ev2.event_type, 'actuator_clear', tag + ' ' + runKey + '：EV-002 event_type');
      eq(ev2.trigger_s, 35.0, tag + ' ' + runKey + '：EV-002 t_clear=35 s');
      eq(run.timeseries.signals.P_gen_cap_kW[351], null, tag + ' ' + runKey + '：t=35.1 起钳位释放（P_gen_cap=null）');
      const pGen36 = run.timeseries.signals.P_gen_true_kW[360];
      ok(pGen36 > 22 && pGen36 < 40, tag + ' ' + runKey + '：清除后 P_gen 回升（t=36 s：' + pGen36.toFixed(2) + ' kW）');
      const fArrC = run.timeseries.signals.f_true_Hz.slice(350);
      const over = Math.max.apply(null, fArrC) - 50;
      /* 过冲锚点：linear 定案 +0.213 / swing 重冻结 +0.213412 —— 同一 ±0.01 容差带 */
      close(over, 0.213, 0.01, tag + ' ' + runKey + '：清除过冲 +0.213 Hz（§9 定案 / swing 重冻结）');
      const tb = fArrC.findIndex((v) => Math.abs(v - 50) <= 0.05);
      ok(tb >= 0 && 350 + tb === 361, tag + ' ' + runKey + '：回 |Δf|≤0.05 @ 36.1 s（两轨同点）',
        't_back05=' + (350 + tb) / 10 + ' s');
    }
  });
  return trackRuns;
}

/* ---------- 双轨 golden ---------- */
const linearRuns = verifyGolden('gt001_v1.json', 'linear', 'v1-linear');
const swingRuns = verifyGolden('gt001_v2.json', 'swing', 'v2-swing');

/* ---------- swing 轨 A-1 重冻结锚点（oracle GS-5/GS-7 同源） ---------- */
(function swingAnchors() {
  const load = swingRuns.load_step.timeseries.signals.f_true_Hz;
  const nadir = Math.min.apply(null, load.slice(200));
  close(nadir, 49.589336, 0.01, 'v2-swing load_step：nadir 49.589336（A-1 重冻结）');
  close(load[600], 49.9922, 0.01, 'v2-swing load_step：f(60)=49.9922');
  const sensor = swingRuns.closed_loop_fault.timeseries.signals.f_true_Hz;
  close(sensor[600], 49.70548, 0.005, 'v2-swing sensor_drift：f(60)=49.70548（未收敛声明）');
  const act = swingRuns.actuator_fault.timeseries.signals.f_true_Hz;
  close(act[600], 49.791667, 0.01, 'v2-swing actuator：f(60)=49.79167（稳态与惯量无关）');

  /* 双轨分歧断言（A-1 教学增量；D-1 双轨定案）：
     load_step 瞬态 swing 更深（nadir 严格更低）；健康局两轨逐位一致（f₀ 处退化连续性）。 */
  const nadirLin = Math.min.apply(null, linearRuns.load_step.timeseries.signals.f_true_Hz.slice(200));
  ok(nadir < nadirLin, '双轨分歧：swing nadir ' + nadir.toFixed(6) + ' < linear nadir ' + nadirLin.toFixed(6));
  const hLin = linearRuns.healthy.timeseries.signals.f_true_Hz;
  const hSw = swingRuns.healthy.timeseries.signals.f_true_Hz;
  let healthyBitwise = true;
  for (let i = 0; i < hLin.length; i++) if (hLin[i] !== hSw[i]) { healthyBitwise = false; break; }
  ok(healthyBitwise, '双轨退化连续性：健康局 f ≡ 50 两轨逐位一致');

  /* swing 新指标在场（E_kin_kWh 二次型 / E_rotor_int_kWh 左矩形）且能量闭合在复算冻结容差内 */
  const mKin = swingRuns.load_step.metrics.find((m) => m.metric_id === 'E_kin_kWh');
  const mInt = swingRuns.load_step.metrics.find((m) => m.metric_id === 'E_rotor_int_kWh');
  ok(!!mKin && mKin.value !== null, 'v2-swing：E_kin_kWh 指标在场');
  ok(!!mInt && mInt.value !== null, 'v2-swing：E_rotor_int_kWh 指标在场');
  const dEkWs = mKin.value * 3600, eIntWs = mInt.value * 3600;
  ok(Math.abs(dEkWs - eIntWs) <= 1e-3, 'v2-swing：|ΔE_kin − ∫P_rotor| ≤ 1e-3 kW·s（oracle 复算冻结 2.2e-4）',
    'gap=' + Math.abs(dEkWs - eIntWs).toExponential(2));
})();

/* ---------- 汇总 ---------- */
console.log('\n== GT-001 引擎 ↔ golden 一致性（双轨：v1-linear + v2-swing，A-1） ==');
if (fail) {
  console.log('FAIL ' + fail + ' / PASS ' + pass);
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('PASS ' + pass + ' / FAIL 0 ✓（2 golden × 6 Run × 序列/指标/事件/scope/GT PHY/哈希 + 双轨分歧）');
