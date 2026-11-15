/* owner: core-engine | module: tests/engine-gt | contract: NEXT/GT001_G2B_SPEC_APPROVED.md §8 / V3-31
   + NEXT/ALINE_MODEL_DEPTH_DESIGN.md §4（A-1 swing 双轨，CHG-20261102-01）
   + NEXT/GTL1_G2B_SPEC_APPROVED.md §3/§4（L1 thermo 轨 + gt001_v3 T-B，CHG-20261104-12 批准）
   GT-001 引擎 ↔ golden 一致性（oracle 只读生成，engine 只读比对）。
   运行：node tests/engine-gt.test.js；失败非零退出。
   三轨结构（D-1/D-2 定案 + GTL1 v1.0 §2.4 Q2/Q4 定案）：
     gt001_v1（linear 遗留轨，字节冻结）：cfg.inertia_model='linear'，锚点为 G2b §4/§9 定案值；
     gt001_v2（swing 遗留轨，字节冻结）：cfg.inertia_model='swing'，锚点为 A-1 oracle 重冻结值；
     gt001_v3（thermo 默认轨，L1）：cfg.inertia_model='thermo'，tier T-B（RK4 双实现方法等价，
     不承诺跨语言逐位——GTL1 §4 项 6），锚点为 gt001_l1_oracle emit 冻结值。
   覆盖：3 golden × 6 Run × 序列逐点（v1/v2 gate：f ±1e-9 / rpm ±1e-9 / kW rtol 1e-12 /
         SOC pp ±1e-5 / r_true ±1e-9；v3 T-B gate：f ±1e-4 / K ±1e-2 / kPa ±1e-9 / kW rtol
         1e-6 / SOC·pct ±1e-5 / r_true ±1e-9）+ 指标子集 + scalars（v3，verify_golden V-06 同口径）+
         事件 pre/post + scope=extension_preview + GT 专属 PHY 检查（gt-energy-consistency 按轨
         分派 / gt-bat-envelope）+ run_hash 可重算 + 双轨/跨深度分歧断言（§3.2 v1.0 口径标注：
         稳态跨深度同、暂态路径分歧、增益 1.3321 vs 1.0）+ sensor_drift mag=1.0 角点（§3.3.1
         域扫描冻结）+ 遗留轨显式钉轨回归（Q4 默认翻转）+ GT 分派守卫（R-8 源级）+
         B-1 盲面守卫（thermal 八信号 blindVisible 不设置，源级）。 */
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

/* ================================================================== */
/* v3 thermo 轨（GTL1_G2B_SPEC_APPROVED v1.0 §4 项 9：thermo→gt001_v3 新增比对面；      */
/* tier T-B——同法 RK4 独立双实现，方法等价容差，不承诺跨语言逐位（§4 项 6 / ALINE §3）  */
/* ================================================================== */

/* T-B gate 序列容差分类（镜像 scripts/verify_golden.py series_limit T-B 分支键序） */
function amax(arr) {
  let m = 0;
  for (const v of arr) { if (v !== null && v !== undefined && Math.abs(v) > m) m = Math.abs(v); }
  return m;
}
function seriesLimitTB(tol, sid, gArr) {
  if (sid === 't') return tol.t_s;
  if (sid.endsWith('_Hz')) return tol.f_Hz_atol;
  if (sid.endsWith('_rpm')) return tol.n_rpm_atol;
  if (sid.endsWith('_K')) return tol.T_K_atol;
  if (sid.endsWith('_kPa')) return tol.p_kPa_atol;
  if (sid.endsWith('_kW')) return Math.max(tol.P_kW_atol, tol.P_kW_rtol * Math.max(1.0, amax(gArr)));
  if (sid.startsWith('SOC')) return tol.SOC_pp;
  if (sid.endsWith('_pct')) return tol.SOC_pp;
  if (sid.indexOf('r_true') !== -1) return tol.r_true_kW;
  return tol.f_Hz_atol;
}
/* T-B 指标容差（镜像 scripts/verify_golden.py metric_within T-B 分支：mid 优先序 + 量纲族） */
function metricWithinTB(tol, mid, unit, fv, gv) {
  if (unit === 'kWh') return Math.abs(fv - gv) <= Math.max(tol.E_kWh, 1e-12 * Math.abs(gv));
  if (unit === 'pp' || unit === '%') return Math.abs(fv - gv) <= Math.max(tol.SOC_pp, 1e-12 * Math.abs(gv));
  if (mid.indexOf('max_abs_r_true') === 0) return Math.abs(fv - gv) <= tol.r_true_kW;
  if (mid.indexOf('max_abs_f_channel_diff') === 0) return Math.abs(fv - gv) <= tol.f_Hz_atol;
  if (unit === 'Hz') return Math.abs(fv - gv) <= tol.f_Hz_atol;
  if (unit === 'rpm') return Math.abs(fv - gv) <= tol.n_rpm_atol;
  if (unit === 'kW') return Math.abs(fv - gv) <= Math.max(tol.P_kW_atol, tol.P_kW_rtol * Math.abs(gv));
  return Math.abs(fv - gv) <= Math.max(tol.SOC_pp, 1e-12 * Math.abs(gv));
}
/* golden scalars（oracle 标量面）→ 引擎指标映射（verify_golden gt001 V-06 注册名同源；
   引擎侧 SOC_err_pp 与 scalars SOC_err_end_pp 命名差异由本表承接，engine-fc 先例同构） */
const SCALAR_TO_METRIC = {
  E_source_kWh: 'E_source_kWh',
  E_bat_kWh: 'E_bat_kWh',
  E_load_kWh: 'E_load_kWh',
  E_rotor_kWh: 'E_rotor_kWh',
  E_fuel_kWh: 'E_fuel_kWh',
  SOC_true_end_pct: 'SOC_true_end_pct',
  SOC_est_end_pct: 'SOC_est_end_pct',
  SOC_err_end_pp: 'SOC_err_pp',
  eta_cycle_end_pct: 'eta_cycle_end_pct'
};

/* gt001_v3 全量比对（6 Run × 序列/指标/scalars/事件/scope/PHY/哈希；T-B 容差逐点） */
function verifyGoldenThermo(goldenFile, tag) {
  const golden = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'golden', goldenFile), 'utf8'));
  const tol = golden.tolerances.gate;
  const n = golden.sampling.n;
  const trackRuns = {};

  /* golden 元数据面（schema v2 / T-B / supersedes 链 / UNIT_DICT L1 扩展 / approval 首签） */
  eq(golden.golden_id, 'gt001_v3', tag + '：golden_id=gt001_v3');
  eq(tol.tier, 'T-B', tag + '：gate tier=T-B（§4 项 6）');
  eq(golden.inertia_model, 'thermo', tag + '：inertia_model=thermo');
  eq(golden.model_version, '1.2.0', tag + '：model_version=1.2.0（L1 批准版）');
  eq(golden.method_id, 'gt001_l1_rk4_dt0.01', tag + '：method_id=gt001_l1_rk4_dt0.01');
  ok(String(golden.supersedes).indexOf('gt001_v2') !== -1, tag + '：supersedes 链指向 gt001_v2（v3→v2→v1 留档）');
  eq(golden.units.T, 'K', tag + '：units 增 T=K');
  eq(golden.units.p, 'kPa', tag + '：units 增 p=kPa');
  ok(!!(golden.approval && golden.approval.approved_golden_sha256), tag + '：approval 三字段首签在场');

  Object.keys(golden.runs).forEach((runKey) => {
    const g = golden.runs[runKey];
    const cfg = FL.core.createConfig('GT-001', Object.assign(
      JSON.parse(JSON.stringify(RUNS_CFG[runKey])), { inertia_model: 'thermo' }));
    eq(cfg.inertia_model, 'thermo', tag + ' ' + runKey + '：cfg.inertia_model=thermo（钉轨）');
    const run = FL.registry.createRun({ config: cfg, runId: 'GT-GOLDEN-' + tag + '-' + runKey });
    trackRuns[runKey] = run;

    /* 序列逐点（T-B gate；'t' 列比对引擎 timeseries.t——v3 golden SERIES_IDS 含 t，
       gt001_v2 缺常量为已登记豁免、v1/v2 比对面不受影响；事件域双 null 记一致、
       单侧 null 记相位不一致——verify_golden V-07 W2-1 同口径） */
    const missing = [];
    const nullPhase = [];
    let badCount = 0;
    let worst = 0;
    let worstSid = '';
    Object.keys(g.series).forEach((sid) => {
      const mine = sid === 't' ? run.timeseries.t : run.timeseries.signals[sid];
      if (!mine || mine.length !== n) { missing.push(sid); return; }
      const lim = seriesLimitTB(tol, sid, g.series[sid]);
      for (let i = 0; i < n; i++) {
        const gv = g.series[sid][i];
        const mv = mine[i];
        if (gv === null && mv === null) continue;
        if (gv === null || mv === null) { nullPhase.push(sid + '[' + i + ']'); continue; }
        const d = Math.abs(gv - mv);
        if (d > lim) {
          badCount++;
          const rel = gv !== 0 ? d / Math.abs(gv) : d;
          if (rel > worst) { worst = rel; worstSid = sid + '[' + i + ']'; }
        }
      }
    });
    eq(missing.length, 0, tag + ' ' + runKey + '：golden 序列在引擎中齐备（含 t 列与八热力信号）', missing.join(','));
    eq(nullPhase.length, 0, tag + ' ' + runKey + '：事件域信号无单侧 null（相位一致）', nullPhase.slice(0, 3).join(','));
    eq(badCount, 0, tag + ' ' + runKey + '：序列逐点 ≤ T-B gate 容差',
      badCount > 0 ? badCount + ' 点超差（最差相对 ' + worst.toExponential(2) + ' @ ' + worstSid + '）' : '');

    /* 指标子集（T-B） */
    const mBad = [];
    Object.keys(g.metrics).forEach((mid) => {
      const gm = g.metrics[mid];
      const mm = run.metrics.find((m) => m.metric_id === mid);
      if (!mm) { mBad.push(mid + ' 缺失'); return; }
      if (gm.value === null || mm.value === null) {
        if ((gm.value === null) !== (mm.value === null)) mBad.push(mid + ' null 位形不一致');
        return;
      }
      if (!metricWithinTB(tol, mid, gm.unit, mm.value, gm.value)) mBad.push(mid + ' ' + mm.value + ' vs ' + gm.value);
    });
    eq(mBad.length, 0, tag + ' ' + runKey + '：指标子集一致（T-B，' + Object.keys(g.metrics).length + ' 项）', mBad.join(' | '));

    /* scalars（verify_golden V-06 同口径：E 类 ±E_kWh / SOC·η 类 ±SOC_pp，rtol 1e-12） */
    const scBad = [];
    Object.keys(g.scalars).forEach((sk) => {
      const mid = SCALAR_TO_METRIC[sk];
      if (!mid) { scBad.push(sk + ' 无引擎指标映射'); return; }
      const mm = run.metrics.find((m) => m.metric_id === mid);
      if (!mm || mm.value === null) { scBad.push(sk + '（' + mid + '）缺失'); return; }
      const lim = Math.max(sk.indexOf('_kWh') !== -1 ? tol.E_kWh : tol.SOC_pp, 1e-12 * Math.abs(g.scalars[sk]));
      if (Math.abs(mm.value - g.scalars[sk]) > lim) scBad.push(sk + ' ' + mm.value + ' vs ' + g.scalars[sk]);
    });
    eq(scBad.length, 0, tag + ' ' + runKey + '：scalars 对引擎指标一致（' + Object.keys(g.scalars).length + ' 项）', scBad.join(' | '));

    /* 事件 pre/post（故障局；n_rpm_atol 同 v1/v2 口径——事件快照相位变量 = n_meas_rpm） */
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
        tag + ' ' + runKey + '：pre/post n_meas 相位值 ±n_rpm_atol', dPre + '/' + dPost);
    } else {
      eq(run.events.length, 0, tag + ' ' + runKey + '：健康局无事件');
    }

    /* scope + GT 专属 PHY 检查（thermo 分派分支）+ 哈希 */
    eq(run.manifest.scope, 'extension_preview', tag + ' ' + runKey + '：GT Run scope=extension_preview');
    const energyChk = run.quality.find((q) => q.check_id === 'gt-energy-consistency');
    ok(!!energyChk && energyChk.status === 'pass' && energyChk.label.indexOf('thermo') !== -1,
      tag + ' ' + runKey + '：gt-energy-consistency pass（thermo 轨：燃烧室能量恒等闭合，EQ-GTL1-12）',
      energyChk && energyChk.label);
    ok(run.quality.some((q) => q.check_id === 'gt-bat-envelope' && q.status === 'pass'),
      tag + ' ' + runKey + '：gt-bat-envelope pass（±25 kW 包络）');
    ok(run.quality.some((q) => q.check_id === 'conservation-meas' &&
      (runKey === 'closed_loop_fault' || runKey === 'monitor_only' ? q.status === 'warn' : q.status === 'pass')),
      tag + ' ' + runKey + '：频率通道冗余一致性检查（健康 pass / 故障 warn）');
    eq(FL.registry.verifyRunHash(run), true, tag + ' ' + runKey + '：run_hash 可重算');

    /* 清除局（thermo 锚点：§3.2 actuator_clear 行 v1.0 口径 + Q5 指令域声明） */
    if (runKey === 'actuator_clear') {
      eq(run.events.length, 2, tag + ' ' + runKey + '：EV-001 + EV-002（清除）');
      const ev2 = run.events[1];
      eq(ev2.event_type, 'actuator_clear', tag + ' ' + runKey + '：EV-002 event_type');
      eq(ev2.trigger_s, 35.0, tag + ' ' + runKey + '：EV-002 t_clear=35 s');
      eq(run.timeseries.signals.P_gen_cap_kW[351], null, tag + ' ' + runKey + '：t=35.1 起钳位释放（P_gen_cap=null）');
      const pGen36 = run.timeseries.signals.P_gen_true_kW[360];
      ok(pGen36 > 22 && pGen36 < 40, tag + ' ' + runKey + '：清除后 P_gen 回升（t=36 s：' + pGen36.toFixed(2) + ' kW，链上值）');
      const fArrC = run.timeseries.signals.f_true_Hz.slice(350);
      const over = Math.max.apply(null, fArrC) - 50;
      close(over, 0.3221, 0.005, tag + ' ' + runKey + '：清除过冲 +0.3221 Hz（§3.2 v1.0 口径）');
      const tb = fArrC.findIndex((v) => Math.abs(v - 50) <= 0.05);
      ok(tb >= 0 && 350 + tb === 360, tag + ' ' + runKey + '：回 |Δf|≤0.05 @ 36.0 s（thermo，§3.2）',
        't_back05=' + (350 + tb) / 10 + ' s');
      const t3pk = Math.max.apply(null, run.timeseries.signals.T3_out_K.slice(350));
      close(t3pk, 1309.6, 0.5, tag + ' ' + runKey + '：T3 峰值 1309.6 K（§3.2；超温保护未建模声明 §6 项 8）');
    }
  });
  return trackRuns;
}

const thermoRuns = verifyGoldenThermo('gt001_v3.json', 'v3-thermo');
function gtSig(run, id) { return run.timeseries.signals[id]; }

/* ---------- (c) sensor_drift mag=1.0 角点暂态（§3.3.1 oracle 域扫描冻结；A-2/B-4 emit 硬条件） ---------- */
(function sensorCornerMag1() {
  const run = FL.registry.createRun({
    config: FL.core.createConfig('GT-001', {
      inertia_model: 'thermo',
      fault: { family: 'sensor_drift', params: { magnitude: 1.0 } },
      feedback_mode: 'closed_loop'
    }),
    runId: 'GT-L1-CORNER-MAG1'
  });
  const fArr = gtSig(run, 'f_true_Hz');
  let fMin = Infinity;
  let maxDf = 0;
  for (const v of fArr) {
    if (v < fMin) fMin = v;
    if (Math.abs(v - 50) > maxDf) maxDf = Math.abs(v - 50);
  }
  close(fMin, 49.002004, 1e-4, 'mag=1.0 角点：暂态最小 f = 49.002004（§3.3.1 域扫描冻结，响应单调、f_min=f(60) 未收敛位）');
  close(maxDf, 0.997996, 1e-4, 'mag=1.0 角点：窗口 max|Δf| = 0.997996（§3.3.1 冻结）');
  ok(fMin > 49.0, 'mag=1.0 角点：min f > 49.0——|Δf| ≤ 1 Hz 有效性域未越界（GL-8 emit 硬条件方向，A-gtl1-speed-coupling）');
  ok(maxDf < 1.0, 'mag=1.0 角点：max|Δf| < 1.0（角点渐近极限恰在边界、60 s 窗口内不可达）');
  const t360 = gtSig(run, 'T3_out_K')[600];
  ok(t360 > 734 && t360 < 738, 'mag=1.0 角点：T3(60)=' + t360.toFixed(2) + ' K 下探至 §3.3 T3 域下端 735.2 K 邻域');
  const u60 = gtSig(run, 'P_gen_cmd_kW')[600];
  ok(u60 > 6.9 && u60 < 7.1, 'mag=1.0 角点：u(60)=' + u60.toFixed(3) + ' → 注册域 u_min 6.98 邻域（§3.3；u=0 伪影不可达）');
})();

/* ---------- (d) L0b↔L1 分歧断言（§3.2 表方向，v1.0 口径标注取值：
             稳态跨深度同 / 暂态路径分歧 / 增益 1.3321 vs 1.0） ---------- */
(function l0bVsL1Divergence() {
  const th = thermoRuns, sw = swingRuns;

  /* 行 1-2：sensor +0.3 闭环——稳态跨深度同（渐近 49.7=50−b），暂态路径分歧（t=60 未收敛位） */
  const fTh60 = gtSig(th.closed_loop_fault, 'f_true_Hz')[600];
  const fSw60 = gtSig(sw.closed_loop_fault, 'f_true_Hz')[600];
  ok(Math.abs(fTh60 - 49.7) <= 0.01 && Math.abs(fSw60 - 49.7) <= 0.01,
    '跨深度分歧：sensor +0.3 稳态跨深度同——两轨 f(60) 均收敛于 49.7（调速器积分结构不变）');
  close(fTh60, 49.70050, 1e-4, '跨深度分歧：thermo f(60)=49.70050（§3.2 t=60 采样口径）');
  close(fSw60, 49.70548, 1e-4, '跨深度分歧：swing f(60)=49.70548（gt001_v2 冻结）');
  ok(fTh60 < fSw60, '跨深度分歧：暂态路径分歧——thermo 更接近稳态（回路增益 1.332 vs 1.0 → 恢复更快）');

  /* 行 3：指令域稳态——同稳态、异指令（功率域 vs 燃料域，不可直比） */
  const uTh60 = gtSig(th.closed_loop_fault, 'P_gen_cmd_kW')[600];
  const cmdSw60 = gtSig(sw.closed_loop_fault, 'P_gen_cmd_kW')[600];
  close(uTh60, 19.65, 0.05, '跨深度分歧：thermo u → 19.65 kW_eq（燃料指令域，§3.2 渐近稳态口径）');
  close(cmdSw60, 17.80, 0.15, '跨深度分歧：swing P_gen_cmd → 17.80 kW（功率域，§3.2 渐近稳态口径）');
  ok(Math.abs(uTh60 - cmdSw60) > 1.5, '跨深度分歧：指令域不同不可直比（Δ=' + (uTh60 - cmdSw60).toFixed(3) + ' kW_eq）');

  /* 行 4：L1 独有观测（T3/T4）——t=60 采样口径（v1.0 勘正 A-3）+ 渐近方向 + L0b 无热力面 */
  const t3Arr = gtSig(th.closed_loop_fault, 'T3_out_K');
  const t360 = t3Arr[600], t460 = gtSig(th.closed_loop_fault, 'T4_out_K')[600];
  close(t360, 1044.16, 0.02, '跨深度分歧：thermo T3(60)=1044.16 K（§3.2 t=60 采样口径）');
  close(t460, 687.22, 0.02, '跨深度分歧：thermo T4(60)=687.22 K（§3.2 t=60 采样口径）');
  ok(t360 < t3Arr[550] && t3Arr[550] < t3Arr[500], '跨深度分歧：T3 尾段单调回落（燃料回落 → EGT 下探，趋向渐近稳态 1043.95 K）');
  ok(Math.abs(t360 - 1043.95) <= 0.3, '跨深度分歧：T3(60) 与渐近稳态 1043.95 K 差 ≤ 0.3 K（A-3 两口径 ±0.2 K 级分离）');
  ok(gtSig(sw.closed_loop_fault, 'T3_out_K').every((v) => v === null),
    '跨深度分歧：L0b swing 无热力面（模型深度导致的表达力差异——T3/T4 对遗留轨不可见）');

  /* 行 5：sensor 仅监测——f ≡ 50 ∧ T3 ≡ 1173 逐位（偏置不进入物理回路，两深度一致） */
  let moF = true, moT3 = true;
  for (let i = 0; i < 601; i++) {
    if (gtSig(th.monitor_only, 'f_true_Hz')[i] !== 50) moF = false;
    if (gtSig(th.monitor_only, 'T3_out_K')[i] !== 1173) moT3 = false;
  }
  ok(moF && moT3, '跨深度分歧：sensor 仅监测两深度一致——f ≡ 50 ∧ T3 ≡ 1173 逐位（§3.2 全序列逐点口径）');

  /* 行 6-7：load_step +10——nadir 几乎同（初瞬摇摆主导，thermo 浅 8.4e-4）；f(60) thermo 快 7.1e-3 */
  const nadTh = Math.min.apply(null, gtSig(th.load_step, 'f_true_Hz').slice(200));
  const nadSw = Math.min.apply(null, gtSig(sw.load_step, 'f_true_Hz').slice(200));
  close(nadTh, 49.590174, 1e-4, '跨深度分歧：load_step thermo nadir=49.590174（§3.2 暂态极值口径）');
  close(nadSw, 49.589336, 1e-4, '跨深度分歧：load_step swing nadir=49.589336（gt001_v2 冻结）');
  ok(nadTh > nadSw, '跨深度分歧：nadir thermo 浅 ' + (nadTh - nadSw).toFixed(6) + ' Hz（§3.2 预填 8.4e-4，初瞬由摇摆方程主导）');
  close(gtSig(th.load_step, 'f_true_Hz')[600], 49.999347, 1e-4, '跨深度分歧：load_step thermo f(60)=49.999347（§3.2 t=60 采样口径）');
  close(gtSig(sw.load_step, 'f_true_Hz')[600], 49.992213, 1e-4, '跨深度分歧：load_step swing f(60)=49.992213（gt001_v2 冻结）');
  ok(gtSig(th.load_step, 'f_true_Hz')[600] > gtSig(sw.load_step, 'f_true_Hz')[600], '跨深度分歧：积分恢复 thermo 更快（回路增益 1.332×）');
  close(gtSig(th.load_step, 'P_gen_cmd_kW')[600], 32.5, 0.05, '跨深度分歧：load_step thermo u(60)→32.5 kW_eq（L1 新观测，§3.2）');
  close(gtSig(th.load_step, 'T3_out_K')[600], 1349.6, 0.5, '跨深度分歧：load_step thermo T3(60)→1349.6 K（L1 新观测，§3.2）');

  /* 行 8-9：actuator 50%——钳位语义域差异显性化（Q5）：swing 功率域恰 20.000 / thermo 燃料域链上 18.266 */
  const pGenTh = gtSig(th.actuator_fault, 'P_gen_true_kW')[600];
  const pGenSw = gtSig(sw.actuator_fault, 'P_gen_true_kW')[600];
  close(pGenTh, 18.266, 0.005, '跨深度分歧：thermo actuator P_gen 稳态 18.266 kW（燃料域钳位 → 链上值，§3.2）');
  eq(pGenSw, 20, '跨深度分歧：swing actuator P_gen 稳态恰 = 20.000 kW（功率域钳位，L0b 原值）');
  ok(Math.abs(pGenTh - pGenSw) > 1.5, '跨深度分歧：同为 50%，ΔP_gen=' + (pGenTh - pGenSw).toFixed(3) + ' kW（钳位语义域差异，Q5）');
  close(gtSig(th.actuator_fault, 'f_true_Hz')[600], 49.719396, 1e-4, '跨深度分歧：thermo actuator f 稳态 49.719396（§3.2）');
  close(gtSig(sw.actuator_fault, 'f_true_Hz')[600], 49.791667, 1e-4, '跨深度分歧：swing actuator f 稳态 49.791667（gt001_v2 冻结）');

  /* 行 10：actuator_clear——过冲（暂态极值采样）/ 回差（过阈值时刻）thermo 更深 */
  const overTh = Math.max.apply(null, gtSig(th.actuator_clear, 'f_true_Hz').slice(350)) - 50;
  const overSw = Math.max.apply(null, gtSig(sw.actuator_clear, 'f_true_Hz').slice(350)) - 50;
  close(overTh, 0.3221, 0.005, '跨深度分歧：thermo 清除过冲 +0.3221 Hz（§3.2 暂态极值采样口径）');
  close(overSw, 0.213412, 0.005, '跨深度分歧：swing 清除过冲 +0.213412 Hz（gt001_v2 冻结）');
  ok(overTh > overSw, '跨深度分歧：清除过冲 thermo 更深（§3.2 方向）');

  /* 行 11 + §1.2 增益：load +20 域角点——thermo 近完全恢复（u 钳 40 → 链上 44.98），
     secant 增益 (P_gen(u=40)−25)/15 = 1.3321（f=50 固定下链输出对 u 精确线性，§1.2 实测值）；
     swing 功率域钳 40 → P_gen 跟随指令（增益恒等 1.0）、f 稳态 49.791667——包络差异最大点 */
  const l20Th = FL.registry.createRun({ config: FL.core.createConfig('GT-001', { inertia_model: 'thermo', fault: { family: 'load_step', params: { magnitude: 20 } }, feedback_mode: 'closed_loop' }), runId: 'GT-L1-CORNER-LOAD20' });
  const l20Sw = FL.registry.createRun({ config: FL.core.createConfig('GT-001', { inertia_model: 'swing', fault: { family: 'load_step', params: { magnitude: 20 } }, feedback_mode: 'closed_loop' }), runId: 'GT-L0B-CORNER-LOAD20' });
  const pTh20 = gtSig(l20Th, 'P_gen_true_kW')[600];
  close(pTh20, 44.98, 0.03, '跨深度分歧：load +20 thermo P_gen(60) → 44.98 kW（u 钳 40，§3.2 P_gen 包络上端）');
  close((pTh20 - 25) / 15, 1.3321, 0.005, '跨深度分歧：thermo 稳态增益 (P_gen(40)−P_gen(25))/15 = 1.3321 kW/单位指令（§1.2 实测；vs L0b 恒 1.0）');
  close(gtSig(l20Th, 'f_true_Hz')[600], 49.999215, 0.002, '跨深度分歧：load +20 thermo f(60) → 49.999215（近完全恢复，§3.2 渐近口径）');
  ok(Math.abs(gtSig(l20Sw, 'P_gen_true_kW')[600] - gtSig(l20Sw, 'P_gen_cmd_kW')[600]) <= 1e-3,
    '跨深度分歧：swing 增益恒等 1.0——P_gen(60) 跟随指令 40 kW（差 ' +
    Math.abs(gtSig(l20Sw, 'P_gen_true_kW')[600] - gtSig(l20Sw, 'P_gen_cmd_kW')[600]).toExponential(2) + '）');
  close(gtSig(l20Sw, 'f_true_Hz')[600], 49.791667, 1e-4, '跨深度分歧：load +20 swing f 稳态 49.791667（P_gen 钳 40，§3.2）');
  ok(pTh20 - gtSig(l20Sw, 'P_gen_true_kW')[600] > 4.5, '跨深度分歧：包络差异最大点——thermo 44.97 vs swing 40.00 kW（模型深度改变系统能力包络）');

  /* GL-3（v1.0 措辞一致化）：健康局共享信号面与 L0b ±1e-9 内逐点恒等（不做跨语言逐位承诺） */
  const SHARED = ['f_true_Hz', 'f_meas_Hz', 'n_meas_rpm', 'P_gen_true_kW', 'P_bat_true_kW',
    'SOC_true_pct', 'SOC_est_pct', 'r_true_kW', 'f_channel_diff_Hz'];
  let worstH = 0, worstHid = '';
  SHARED.forEach((id) => {
    for (let i = 0; i < 601; i++) {
      const d = Math.abs(gtSig(th.healthy, id)[i] - gtSig(sw.healthy, id)[i]);
      if (d > worstH) { worstH = d; worstHid = id + '[' + i + ']'; }
    }
  });
  ok(worstH <= 1e-9, '跨深度分歧：健康局共享信号面 ±1e-9 内逐点恒等（GL-3；最差 ' + worstH.toExponential(2) + ' @ ' + worstHid + '）');
})();

/* ---------- (e) 遗留轨显式钉轨回归（Q4 定案：默认轨已翻转 thermo——不钉轨走默认轨；
             翻转前的 L0b 原值经显式钉 inertia_model 后可达并断言，防默认翻转静默改写遗留语义） ---------- */
(function legacyPinRegression() {
  /* 不钉轨：cfg 解析为默认轨 thermo（normalizeConfig 盖章机制，systems.js defaults.inertia_model） */
  eq(FL.core.createConfig('GT-001', { fault: { family: 'actuator_fault' } }).inertia_model, 'thermo',
    '钉轨回归：未钉轨 GT 配置解析为默认轨 thermo（Q4 翻转定案生效守卫）');
  const unRun = FL.registry.createRun({ config: FL.core.createConfig('GT-001', { fault: { family: 'actuator_fault' } }), runId: 'GT-PIN-DEFAULT' });
  close(gtSig(unRun, 'P_gen_true_kW')[600], 18.266, 0.01, '钉轨回归：默认轨（thermo）actuator P_gen 稳态 18.266 kW（Q5 链上值）');

  /* 显式钉 swing：断言翻转前默认轨原值（功率域钳位——core.test.js 该断言意图的钉轨承载面） */
  const swRun = FL.registry.createRun({ config: FL.core.createConfig('GT-001', { inertia_model: 'swing', fault: { family: 'actuator_fault' } }), runId: 'GT-PIN-SWING' });
  eq(gtSig(swRun, 'P_gen_true_kW')[600], 20, '钉轨回归：钉 swing 后 actuator P_gen 稳态原值恰 = 20.000 kW（功率域钳位）');
  const swLoad = FL.registry.createRun({ config: FL.core.createConfig('GT-001', { inertia_model: 'swing', fault: { family: 'load_step' } }), runId: 'GT-PIN-SWING-LOAD' });
  const nadSw = Math.min.apply(null, gtSig(swLoad, 'f_true_Hz').slice(200));
  close(nadSw, 49.589336, 1e-4, '钉轨回归：钉 swing 后 load nadir 原值 49.589336（gt001_v2 冻结锚）');

  /* 显式钉 linear：原值同断言（gt001_v1 口径）；swing 更深分歧方向在钉轨面保持 */
  const linRun = FL.registry.createRun({ config: FL.core.createConfig('GT-001', { inertia_model: 'linear', fault: { family: 'actuator_fault' } }), runId: 'GT-PIN-LINEAR' });
  eq(gtSig(linRun, 'P_gen_true_kW')[600], 20, '钉轨回归：钉 linear 后 actuator P_gen 稳态原值恰 = 20.000 kW（功率域钳位）');
  const linLoad = FL.registry.createRun({ config: FL.core.createConfig('GT-001', { inertia_model: 'linear', fault: { family: 'load_step' } }), runId: 'GT-PIN-LINEAR-LOAD' });
  const nadLin = Math.min.apply(null, gtSig(linLoad, 'f_true_Hz').slice(200));
  close(nadLin, 49.589386, 1e-4, '钉轨回归：钉 linear 后 load nadir 原值 49.589386（gt001_v1 口径）');
  ok(nadSw < nadLin, '钉轨回归：swing nadir ' + nadSw.toFixed(6) + ' < linear nadir ' + nadLin.toFixed(6) + '（A-1 双轨分歧方向，钉轨后保持）');
})();

/* ---------- (f) GT 分派守卫（R-8：GT 分支内部显式三分派——thermo 配置走 thermo 轨） ---------- */
(function gtDispatchGuard() {
  const THERMAL8 = ['T3_out_K', 'T2_out_K', 'p2_out_kPa', 'T4_out_K', 'Q_fuel_kW', 'P_comp_kW', 'P_turb_kW', 'eta_cycle_pct'];
  /* 元数据面：cfg 钉轨 + quality 检查按轨分派（checks.js gt-energy-consistency 三分支标签） */
  eq(thermoRuns.healthy.config.inertia_model, 'thermo', '分派守卫：thermo Run cfg.inertia_model=thermo');
  ok(gtSig(thermoRuns.healthy, 'T3_out_K') !== undefined, '分派守卫：thermo Run 八热力信号面在场');
  ['swing', 'linear'].forEach((track) => {
    const r = track === 'swing' ? swingRuns.healthy : linearRuns.healthy;
    const chk = r.quality.find((q) => q.check_id === 'gt-energy-consistency');
    ok(!!chk && chk.label.indexOf(track) !== -1, '分派守卫：' + track + ' Run gt-energy-consistency 走 ' + track + ' 分支标签', chk && chk.label);
  });
  /* 信号面互斥：八热力信号仅 thermo 填充（601 点非 null），swing/linear 遗留轨全程 null */
  THERMAL8.forEach((id) => {
    ok(gtSig(thermoRuns.healthy, id).every((v) => v !== null), '分派守卫：thermo 填充 ' + id + '（601 点非 null）');
    ok(gtSig(swingRuns.healthy, id).every((v) => v === null), '分派守卫：swing 遗留轨 ' + id + ' 全程 null');
    ok(gtSig(linearRuns.healthy, id).every((v) => v === null), '分派守卫：linear 遗留轨 ' + id + ' 全程 null');
  });
  /* R-8 源级守卫：engine.js GT 分支内部显式三分派（thermo 分派先于 L0b 更新序，不依赖兜底语义） */
  const engSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'engine.js'), 'utf8');
  ok(engSrc.indexOf("if (cfg.inertia_model === 'thermo') return simulateGT001Thermo") !== -1,
    '分派守卫（源级）：engine.js GT 分支 thermo 显式分派在位（R-8）');
  ok(engSrc.indexOf("cfg.inertia_model === 'linear' ? 'linear' : 'swing'") !== -1,
    '分派守卫（源级）：engine.js 遗留双轨显式分派在位（linear/swing 更新序逐字不动）');
})();

/* ---------- B-1 盲面守卫（源级）：thermal 八信号 blindVisible 不设置、无 exposure 覆盖
   （GTL1_G2B_SPEC_APPROVED v1.0 §1.2 B-1 定案：全非盲显，盲包观测面不扩） ---------- */
(function blindSurfaceGuard() {
  const THERMAL8 = ['T3_out_K', 'T2_out_K', 'p2_out_kPa', 'T4_out_K', 'Q_fuel_kW', 'P_comp_kW', 'P_turb_kW', 'eta_cycle_pct'];
  const sysSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'systems.js'), 'utf8');
  const gtStart = sysSrc.indexOf("id: 'GT-001'");
  const gtEnd = sysSrc.indexOf('var PV001', gtStart);
  ok(gtStart !== -1 && gtEnd > gtStart, '盲面守卫（源级）：systems.js GT-001 段定位');
  const gtSection = sysSrc.slice(gtStart, gtEnd);
  THERMAL8.forEach((id) => {
    const i0 = gtSection.indexOf("sig({ id: '" + id + "'");
    ok(i0 !== -1, '盲面守卫（源级）：thermal 信号 ' + id + ' 定义定位');
    if (i0 === -1) return;
    const iNext = gtSection.indexOf('sig({', i0 + 1);
    const frag = gtSection.slice(i0, iNext > i0 ? iNext : undefined);
    ok(frag.indexOf('blindVisible') === -1, '盲面守卫（源级）：' + id + ' 不设置 blindVisible（B-1：全非盲显）');
    ok(frag.indexOf('exposure:') === -1, '盲面守卫（源级）：' + id + ' 无 exposure 覆盖（默认映射 public_demo，禁独立设置）');
  });
  /* 运行时交叉核对：sourceKind 四 MODEL_STATE + 四 DERIVED（B-1 落地面）、exposure 派生非盲 */
  const gtSys = FL.systems._raw.get('GT-001');
  const ms4 = ['T3_out_K', 'T2_out_K', 'p2_out_kPa', 'T4_out_K'];
  const dv4 = ['Q_fuel_kW', 'P_comp_kW', 'P_turb_kW', 'eta_cycle_pct'];
  THERMAL8.forEach((id) => {
    const s = gtSys.signals.find((x) => x.id === id);
    ok(!!s, '盲面守卫（运行时）：GT 目录含 ' + id);
    if (!s) return;
    ok(s.blindVisible === false && s.exposure === 'public_demo', '盲面守卫（运行时）：' + id + ' exposure=public_demo（非盲显）');
    ok(ms4.indexOf(id) !== -1 ? s.sourceKind === 'MODEL_STATE' : s.sourceKind === 'DERIVED', '盲面守卫（运行时）：' + id + ' sourceKind=' + s.sourceKind + '（B-1 登记面）');
  });
  /* 盲包观测面不扩：GT blind 投影不含八热力信号 */
  const blindIds = FL.contract.project(thermoRuns.healthy, 'blind').signals.map((s) => s.id);
  ok(THERMAL8.every((id) => blindIds.indexOf(id) === -1), '盲面守卫：GT blind 投影不含八热力信号（盲包观测面不扩）');
})();

/* ---------- (h) v4 燃烧延迟深化轨（thermo_comb，GTCMB-G2b-03/04，CHG-20261114-07/09） ---------- */
/* GT001_COMBUSTION_G2B_SPEC_APPROVED v1.0（τ_comb=0.5s，键形态=形态 a 枚举扩值，Q12 维持
   1.2.0）：四元 golden 映射 linear→v1/swing→v2/thermo→v3/thermo_comb→v4。比对器沿
   verifyGoldenThermo 体例（t 列 = run.timeseries.t / seriesLimitTB / metrics .value 包装 /
   SCALAR_TO_METRIC）——v4 适配：零新信号 27 列同集（Q10a）、无 gt-energy-consistency 分派
   （checks.js 零改动——能量恒等由 GCMB-2/EQ-GTL2-12 oracle 侧承载，登记）、
   conservation-meas 行为断言。 */
function verifyGoldenComb(goldenFile, tag) {
  const golden = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'golden', goldenFile), 'utf8'));
  const tol = golden.tolerances.gate;
  const n = golden.sampling.n;
  const trackRuns = {};

  /* 元数据面（Q12 定案：model_version 维持 1.2.0 不升位——model_hash 九字段承载面） */
  eq(golden.golden_id, 'gt001_v4', tag + '：golden_id=gt001_v4');
  eq(golden.model_version, '1.2.0', tag + '：model_version=1.2.0（Q12 定案维持不升位）');
  eq(golden.inertia_model, 'thermo_comb', tag + '：inertia_model=thermo_comb（顶层面）');
  eq(tol.tier, 'T-B', tag + '：gate tier=T-B（Q9）');
  ok(String(golden.supersedes || '').indexOf('gt001_v3') !== -1, tag + '：supersedes=gt001_v3（四代链 v4→v3→v2→v1）');
  eq(golden.runs.healthy.inertia_model, 'thermo_comb', tag + '：run 项 inertia_model=thermo_comb');

  Object.keys(golden.runs).forEach((runKey) => {
    const g = golden.runs[runKey];
    const cfg = FL.core.createConfig('GT-001', Object.assign(
      JSON.parse(JSON.stringify(RUNS_CFG[runKey])), { inertia_model: 'thermo_comb' },
      g.fault && g.fault.family ? { fault: g.fault } : {}));
    eq(cfg.inertia_model, 'thermo_comb', tag + ' ' + runKey + '：cfg.inertia_model 生效');
    const run = FL.registry.createRun({ config: cfg, runId: 'GT-GOLDEN-' + tag + '-' + runKey });
    trackRuns[runKey] = run;

    /* 序列逐点（27 列同集零新信号；t 列 = run.timeseries.t——verifyGoldenThermo 同款） */
    const missing = [];
    const nullPhase = [];
    let badCount = 0;
    let worst = 0;
    let worstSid = '';
    Object.keys(g.series).forEach((sid) => {
      const mine = sid === 't' ? run.timeseries.t : run.timeseries.signals[sid];
      if (!mine || mine.length !== n) { missing.push(sid); return; }
      const lim = seriesLimitTB(tol, sid, g.series[sid]);
      for (let i = 0; i < n; i++) {
        const gv = g.series[sid][i];
        const mv = mine[i];
        if (gv === null && mv === null) continue;
        if (gv === null || mv === null) { nullPhase.push(sid + '[' + i + ']'); continue; }
        const d = Math.abs(gv - mv);
        if (d > lim) {
          badCount++;
          const rel = gv !== 0 ? d / Math.abs(gv) : d;
          if (rel > worst) { worst = rel; worstSid = sid + '[' + i + ']'; }
        }
      }
    });
    eq(missing.length, 0, tag + ' ' + runKey + '：golden 序列在引擎中齐备（含 t 列，27 列同集——Q10a）', missing.join(','));
    eq(nullPhase.length, 0, tag + ' ' + runKey + '：事件域信号无单侧 null（相位一致）', nullPhase.slice(0, 3).join(','));
    eq(badCount, 0, tag + ' ' + runKey + '：序列逐点 ≤ T-B gate 容差',
      badCount > 0 ? badCount + ' 点超差（最差相对 ' + worst.toExponential(2) + ' @ ' + worstSid + '）' : '');

    /* 指标子集（T-B——13 键镜像） */
    const mBad = [];
    Object.keys(g.metrics).forEach((mid) => {
      const gm = g.metrics[mid];
      const mm = run.metrics.find((m) => m.metric_id === mid);
      if (!mm) { mBad.push(mid + ' 缺失'); return; }
      if (gm.value === null || mm.value === null) {
        if ((gm.value === null) !== (mm.value === null)) mBad.push(mid + ' null 位形不一致');
        return;
      }
      if (!metricWithinTB(tol, mid, gm.unit, mm.value, gm.value)) mBad.push(mid + ' ' + mm.value + ' vs ' + gm.value);
    });
    eq(mBad.length, 0, tag + ' ' + runKey + '：指标子集一致（T-B，' + Object.keys(g.metrics).length + ' 项）', mBad.join(' | '));

    /* scalars（verify_golden V-06 同口径：SCALAR_TO_METRIC 映射 + E/SOC 容差） */
    const scBad = [];
    Object.keys(g.scalars).forEach((sk) => {
      const mid = SCALAR_TO_METRIC[sk];
      if (!mid) { scBad.push(sk + ' 无引擎指标映射'); return; }
      const mm = run.metrics.find((m) => m.metric_id === mid);
      if (!mm || mm.value === null) { scBad.push(sk + '（' + mid + '）缺失'); return; }
      const lim = Math.max(sk.indexOf('_kWh') !== -1 ? tol.E_kWh : tol.SOC_pp, 1e-12 * Math.abs(g.scalars[sk]));
      if (Math.abs(mm.value - g.scalars[sk]) > lim) scBad.push(sk + ' ' + mm.value + ' vs ' + g.scalars[sk]);
    });
    eq(scBad.length, 0, tag + ' ' + runKey + '：scalars 对引擎指标一致（' + Object.keys(g.scalars).length + ' 项）', scBad.join(' | '));

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
      const dPre = Math.abs(fp.variables.n_meas_rpm - gp.variables.n_meas_rpm);
      if (g.events.length > 1) {
        const ge2 = g.events[1], fe2 = run.events[1];
        eq(fe2.event_type, ge2.event_type, tag + ' ' + runKey + '：EV-002 event_type');
        eq(fe2.trigger_s, ge2.trigger_s, tag + ' ' + runKey + '：EV-002 t_clear=35 s');
      }
      ok(dPre <= tol.n_rpm_atol, tag + ' ' + runKey + '：pre n_meas 相位值 ±n_rpm_atol', dPre);
    } else {
      eq(run.events.length, 0, tag + ' ' + runKey + '：健康局无事件');
    }

    /* scope + PHY 面（comb 轨）+ 哈希 */
    eq(run.manifest.scope, 'extension_preview', tag + ' ' + runKey + '：GT Run scope=extension_preview');
    /* gt-energy-consistency 分派语义（checks.js 零改动）：comb 轨落 swing 分支闭合
       （∫P_rotor = K_J·Δf 左矩形离散恒等与燃料模型无关——轨无关成立、pass）；
       延迟口径检查式（EQ-GTL2-12）由 oracle 侧 GCMB-2 承载（规格登记）。 */
    const combEnergy = run.quality.find((q) => q.check_id === 'gt-energy-consistency');
    ok(!!combEnergy && combEnergy.status === 'pass' && combEnergy.label.indexOf('comb') !== -1,
      tag + ' ' + runKey + '：gt-energy-consistency pass（comb 轨落 swing 分支离散闭合——轨无关恒等）',
      combEnergy && combEnergy.label);
    ok(run.quality.some((q) => q.check_id === 'gt-bat-envelope' && q.status === 'pass'),
      tag + ' ' + runKey + '：gt-bat-envelope pass（±25 kW 包络——非 inertia 键控）');
    ok(run.quality.some((q) => q.check_id === 'conservation-meas' &&
      (runKey === 'closed_loop_fault' || runKey === 'monitor_only' ? q.status === 'warn' : q.status === 'pass')),
      tag + ' ' + runKey + '：频率通道冗余一致性检查（健康 pass / 故障 warn）');
    eq(FL.registry.verifyRunHash(run), true, tag + ' ' + runKey + '：run_hash 可重算');

    /* 清除局（comb 锚点：§3.3 过冲 0.3311 / 回差 36.6 s——深化轨暂态教学面） */
    if (runKey === 'actuator_clear') {
      eq(run.events.length, 2, tag + ' ' + runKey + '：EV-001 + EV-002（清除）');
      eq(run.timeseries.signals.P_gen_cap_kW[351], null, tag + ' ' + runKey + '：t=35.1 起钳位释放（P_gen_cap=null）');
      const fArrC = run.timeseries.signals.f_true_Hz.slice(350);
      const over = Math.max.apply(null, fArrC) - 50;
      close(over, 0.3311, 0.01, tag + ' ' + runKey + '：清除过冲 +0.3311 Hz（§3.3 域扫描冻结——深化轨滞后-超调形态）');
    }
  });
  return trackRuns;
}
const combRuns = verifyGoldenComb('gt001_v4.json', 'v4-comb');
(function () {
  /* A-2 健康局/monitor 位级恒等（x_comb(0)=k_f·u(0) 稳态初始化 ⇒ dx_comb/dt≡0——同实现逐位） */
  const IDKEYS = ['f_true_Hz', 'T3_out_K', 'T4_out_K', 'P_gen_true_kW', 'SOC_true_pct', 'Q_fuel_kW'];
  for (const sid of IDKEYS) {
    const a = gtSig(combRuns.healthy, sid);
    const b = gtSig(thermoRuns.healthy, sid);
    let same = Array.isArray(a) && Array.isArray(b) && a.length === b.length;
    if (same) for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { same = false; break; }
    ok(same, 'A-2 健康局位级恒等（comb vs thermo，同实现逐位）：' + sid);
  }
  ok(JSON.stringify(gtSig(combRuns.monitor_only, 'T3_out_K')) ===
     JSON.stringify(gtSig(thermoRuns.monitor_only, 'T3_out_K')),
    'A-2 monitor 位级恒等：T3_out_K 全序列');
  /* A-1 两口径：故障 Run t=60 采样随暂态路径变化（渐近稳态不变——深化轨独有暂态） */
  ok(gtSig(combRuns.load_step, 'T4_out_K')[600] !== gtSig(thermoRuns.load_step, 'T4_out_K')[600],
    'A-1 两口径：load_step t=60 采样随暂态路径变化（深化轨独有暂态）');
  ok(gtSig(combRuns.actuator_clear, 'P_gen_true_kW')[600] !== gtSig(thermoRuns.actuator_clear, 'P_gen_true_kW')[600],
    'A-1 两口径：actuator_clear t=60 采样值变化');
  /* A-3② 可辨识性：T4 暂态相位滞后（τ_comb=0.5s 教学面——t=50 采样对照） */
  ok(gtSig(combRuns.load_step, 'T4_out_K')[500] !== gtSig(thermoRuns.load_step, 'T4_out_K')[500],
    'A-3② 可辨识性：T4 暂态相位滞后（τ_comb=0.5s 教学面）');
  /* 盲面守卫：深化轨零新信号——blind 投影不含热力八信号（Q10a） */
  const THERMAL8C = ['T3_out_K', 'T2_out_K', 'p2_out_kPa', 'T4_out_K', 'Q_fuel_kW', 'P_comp_kW', 'P_turb_kW', 'eta_cycle_pct'];
  const blindIds4 = FL.contract.project(combRuns.healthy, 'blind').signals.map((s) => s.id);
  ok(THERMAL8C.every((id) => blindIds4.indexOf(id) === -1), '盲面守卫：comb 轨 blind 投影不含热力信号（Q10a 零新信号）');
  /* 三既有轨恒等回归：扩值后 swing 轨 run_hash 可重算（§3.1 项 3——run-g2 全量佐证） */
  const reSw = FL.registry.createRun({ config: FL.core.createConfig('GT-001', { inertia_model: 'swing', fault: { family: 'sensor_drift', params: { magnitude: 0.3 } }, feedback_mode: 'closed_loop' }), runId: 'GT-COMB-REG-SW' });
  eq(FL.registry.verifyRunHash(reSw), true, '扩值回归：swing 轨 run_hash 可重算（既有轨零扰动）');
})();

/* ---------- 汇总 ---------- */
console.log('\n== GT-001 引擎 ↔ golden 一致性（四轨：v1-linear + v2-swing + v3-thermo T-B + v4-comb T-B） ==');
if (fail) {
  console.log('FAIL ' + fail + ' / PASS ' + pass);
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('PASS ' + pass + ' / FAIL 0 ✓（3 golden × 6 Run × 序列/指标/scalars/事件/scope/GT PHY/哈希 + 角点/跨深度分歧/钉轨回归/分派守卫/盲面守卫）');
