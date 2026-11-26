/* owner: core-engine | module: tests/engine-pv | contract: PV001_G2B_SPEC_APPROVED v1.0 §3/§4/§5
   + V070_WAVE_DESIGN（CHG-20261104-10）/ R-4 守卫 + Arena 盲测池守卫（v1.3.0 入池后
     池形态镜像——原「DEC-2 Arena 排除」守卫随 V130 DEC-2 验证轮入池镜像更新，§6）
   PV-001 引擎 ↔ golden 一致性（oracle 只读生成，engine 只读比对，G0-DEC-16）。
   运行：node tests/engine-pv.test.js；失败非零退出。
   覆盖：
     1. golden 4 Run 全序列逐点（gate T-A 容差分类映射）+ 25 scalars 全量复算对 golden
        （golden metrics 块 id 面为 oracle 独立子集 `_60s`/`_end_kW` 惯例，其值与
        scalars 面逐位同源——先做 golden 内一致锚定，再以引擎侧 scalars 对比对）；
     2. A/B/C 锚点断言（规格 §3.1/§3.2 表列值与容差）+ r_true/r_meas ≡ 0（§3.3）；
     3. shading 闭环 vs 仅监测逐位等价（series + events + snapshots + metrics，
        排除 label/role/effective_mode——两者由反馈模式派生、本就不同，排除是承重面）；
     4. GT 轨区分守卫（R-4）：PV 配置走 PV 轨（P_pv 信号面 + 分派元数据 + PV 锚点），
        三系统既有轨 sanity（FL/FC/GT 各自信号面在、PV 信号不在）；
     5. 健康局 P_pv ≡ 10 恒等（逐位；§3.3 健康局不变量 PS-6 面）；
     6. Arena 盲测池守卫（源级）：ARENA_EXCLUDED 收缩 [] + 过滤结构在场 + 历史排除链
        注释保留（V130 DEC-2 验证轮入池镜像更新——CHG-20261113-05）。
   PV Run quality：soc-bounds/energy-balance 按 system.bounds 派生（PV bounds 无 SOC_pct 声明
   → 不派发；CHG-20261105-01 清算项 1 解除 CHG-20261104-10 锁定态）；PV 专属 PHY 检查
   pv-energy-consistency（E_pv_true + E_grid = E_load，EQ-PV-5/EQ-PV-7；容差 pv001_v1
   gate T-A E_kWh=1e-9 kWh）pass，见第 4 节断言。 */
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

/* ================================================================== */
/* golden 装载与 Run 配置（键面按 golden.runs 遍历，同 engine-gt 先例）  */
/* ================================================================== */
const GOLDEN_PATH = path.join(__dirname, '..', 'data', 'golden', 'pv001_v1.json');
const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
const tol = golden.tolerances.gate;
eq(golden.golden_id, 'pv001_v1', 'golden id=pv001_v1');
eq(golden.tolerances.gate.tier, 'T-A', 'gate tier=T-A（§4 项 6）');

const RUNS_CFG = {
  healthy: { fault: { family: 'none' }, feedback_mode: 'closed_loop' },
  closed_loop_fault: { fault: { family: 'sensor_drift' }, feedback_mode: 'closed_loop' },
  monitor_only: { fault: { family: 'sensor_drift' }, feedback_mode: 'monitor' },
  shading_closed_loop: { fault: { family: 'shading_step' }, feedback_mode: 'closed_loop' }
};

/* gate T-A 容差分类映射（序列）：gate 无 G/V 专属键，W/m² 与 V 通道借 P 相对类按点幅值 */
function seriesLimit(sid, gref) {
  if (sid === 't') return tol.t_s;
  if (sid === 'd_pv_kW') return tol.d_pv_atol;
  if (sid === 'r_true_kW' || sid === 'r_meas_kW') return tol.r_true_kW; /* r_meas 与 r_true 同为定义恒等 0 */
  return Math.max(tol.P_kW_atol, tol.P_kW_rtol * Math.abs(gref)); /* kW / W_m2 / V：T-A 相对类 */
}
/* gate T-A 容差分类映射（scalars）：kW·s 积分借 E 类 ×3600（同测度换算） */
function scalarLimit(key, gval) {
  if (key.indexOf('_kWh') !== -1) return tol.E_kWh;
  if (key.indexOf('int_') === 0) return tol.E_kWh * 3600;
  if (key.indexOf('d_pv') !== -1) return tol.d_pv_atol;
  if (key.indexOf('max_abs_r') === 0) return tol.r_true_kW;
  if (key.indexOf('t_') === 0) return tol.t_s;
  return Math.max(tol.P_kW_atol, tol.P_kW_rtol * Math.abs(gval));
}

/* golden metrics 块 id → scalars id（oracle 独立子集与标量面同源的锚定表） */
const GOLDEN_METRIC_TO_SCALAR = {
  E_pv_true_60s: 'E_pv_true_kWh',
  E_pv_est_60s: 'E_pv_est_kWh',
  E_pv_err_60s: 'E_pv_err_kWh',
  E_grid_60s: 'E_grid_kWh',
  E_load_60s: 'E_load_kWh',
  P_pv_true_end_kW: 'P_pv_true_60_kW',
  P_grid_true_end_kW: 'P_grid_true_60_kW',
  d_pv_end_kW: 'd_pv_60_kW',
  max_abs_d_pv_kW: 'max_abs_d_pv_kW',
  max_abs_r_true_kW: 'max_abs_r_true_kW'
};

/* 引擎侧复算 golden scalars（25 项：能量账本取指标、采样点取序列、极值取遍历） */
function deriveScalars(run) {
  const sig = run.timeseries.signals;
  const t = run.timeseries.t;
  const met = {};
  run.metrics.forEach((m) => { met[m.metric_id] = m.value; });
  let maxAbs = 0;
  let tAt = t[0];
  for (let i = 0; i < sig.d_pv_kW.length; i++) {
    const a = Math.abs(sig.d_pv_kW[i]);
    if (a > maxAbs) { maxAbs = a; tAt = t[i]; } /* 严格 >：并列取首点（golden 同口径） */
  }
  return {
    E_pv_true_kWh: met.E_pv_true_kWh,
    E_pv_est_kWh: met.E_pv_est_kWh,
    E_pv_err_kWh: met.E_pv_err_kWh,
    E_grid_kWh: met.E_grid_kWh,
    E_load_kWh: met.E_load_kWh,
    int_P_pv_true_60s_kWs: met.E_pv_true_kWh * 3600,
    int_P_grid_60s_kWs: met.E_grid_kWh * 3600,
    int_P_load_60s_kWs: met.E_load_kWh * 3600,
    P_pv_true_19p9_kW: sig.P_pv_true_kW[199],
    P_pv_meas_19p9_kW: sig.P_pv_meas_kW[199],
    t_19p9_s: t[199],
    P_pv_true_20post_kW: sig.P_pv_true_kW[200],
    P_pv_meas_20post_kW: sig.P_pv_meas_kW[200],
    d_pv_20post_kW: sig.d_pv_kW[200],
    P_pv_true_21_kW: sig.P_pv_true_kW[210],
    P_pv_true_26_kW: sig.P_pv_true_kW[260],
    P_pv_true_60_kW: sig.P_pv_true_kW[600],
    P_grid_true_60_kW: sig.P_grid_true_kW[600],
    P_mpp_true_60_kW: sig.P_mpp_true_kW[600],
    P_mpp_ref_60_kW: sig.P_mpp_ref_kW[600],
    d_pv_60_kW: sig.d_pv_kW[600],
    max_abs_d_pv_kW: maxAbs,
    t_at_max_abs_d_pv_s: tAt,
    max_abs_r_true_kW: met.max_abs_r_true_kW,
    max_abs_r_meas_kW: met.max_abs_r_meas_kW
  };
}

/* ================================================================== */
/* 1. golden 4 Run：全序列（gate T-A）+ scalars 全量                    */
/* ================================================================== */
const trackRuns = {};
Object.keys(golden.runs).forEach((runKey) => {
  const g = golden.runs[runKey];
  const cfg = FL.core.createConfig('PV-001', JSON.parse(JSON.stringify(RUNS_CFG[runKey])));
  const run = FL.registry.createRun({ config: cfg, runId: 'PV-GOLDEN-' + runKey });
  trackRuns[runKey] = run;
  const n = golden.sampling.n;

  /* 配置面：引擎配置与 golden config 键面同源（duration/dt/故障时刻/参数幅值/初值） */
  eq(run.systemId, 'PV-001', runKey + '：run.systemId=PV-001');
  eq(cfg.duration_s, golden.config.duration_s, runKey + '：duration 60 s');
  eq(cfg.dt_s, golden.config.dt_s, runKey + '：dt 0.1 s');
  eq(run.timeseries.t.length, n, runKey + '：601 点（n=duration/dt+1）');
  if (runKey !== 'healthy') {
    eq(cfg.fault.t_start_s, golden.config.fault_time_s, runKey + '：故障时刻 20 s');
  } else {
    eq(cfg.fault.family, 'none', runKey + '：健康局无故障族');
  }
  eq(run.timeseries.signals.P_pv_true_kW[0], golden.config.P_pv_init_kW,
    runKey + '：P_pv(0) = k·G0·φ_T = ' + golden.config.P_pv_init_kW + ' kW（EQ-PV-4 / Q2 定案）');
  if (runKey === 'closed_loop_fault' || runKey === 'monitor_only') {
    eq(cfg.fault.params.magnitude, golden.config.bias_W_m2, runKey + '：偏置幅值 +100 W/m²');
  }
  if (runKey === 'shading_closed_loop') {
    eq(cfg.fault.params.magnitude, golden.config.shading_dg_W_m2, runKey + '：遮挡降幅 −300 W/m²');
  }

  /* 全序列逐点（golden 子集 ∩ 引擎序列；t 列取 run.timeseries.t）。
     注：故障局 P_pv 通道为引擎子步精确指数 vs oracle 段长闭式的浮点差（≤8.9e-14，
     规格 §3.3 复算记录同量级），非逐位相等；断言面 = 逐点 ≤ gate T-A 分类容差。 */
  let over = 0;
  let worstAbs = 0;
  let worstRel = 0;
  let worstAt = '';
  const missing = [];
  Object.keys(g.series).forEach((sid) => {
    const mine = sid === 't' ? run.timeseries.t : run.timeseries.signals[sid];
    if (!mine || mine.length !== n) { missing.push(sid); return; }
    for (let i = 0; i < n; i++) {
      const gref = g.series[sid][i] || 0;
      const d = Math.abs(gref - (mine[i] || 0));
      if (d > worstAbs) { worstAbs = d; }
      const rel = gref !== 0 ? d / Math.abs(gref) : d;
      if (rel > worstRel) { worstRel = rel; worstAt = sid + '[' + i + '] Δ=' + d.toExponential(2); }
      if (d > seriesLimit(sid, gref)) { over++; }
    }
  });
  eq(missing.length, 0, runKey + '：golden 18 序列在引擎中齐备（含 t 列）', missing.join(','));
  ok(over === 0, runKey + '：序列逐点 ≤ gate T-A 容差（超差 0 点；最大绝对偏差 ' +
    worstAbs.toExponential(2) + '，最差相对 ' + worstRel.toExponential(2) + ' @ ' + worstAt + '）');

  /* scalars 全量（25 项）：引擎复算 vs golden */
  const S = g.scalars;
  const D = deriveScalars(run);
  const badS = [];
  Object.keys(S).forEach((key) => {
    if (!(key in D)) { badS.push(key + ' 未复算'); return; }
    const d = Math.abs(D[key] - S[key]);
    if (!(d <= scalarLimit(key, S[key]))) badS.push(key + ' ' + D[key] + ' vs ' + S[key]);
  });
  eq(Object.keys(S).length, 25, runKey + '：golden scalars 面 25 项');
  eq(badS.length, 0, runKey + '：scalars 全量对 golden（gate T-A 分类容差）', badS.join(' | '));

  /* golden metrics 块 ↔ scalars 面同源锚定（oracle 独立子集 id 惯例的值面校验） */
  const gmBad = [];
  Object.keys(g.metrics).forEach((mid) => {
    const scalarKey = GOLDEN_METRIC_TO_SCALAR[mid];
    if (!scalarKey || S[scalarKey] === undefined || g.metrics[mid].value !== S[scalarKey]) {
      gmBad.push(mid);
    }
  });
  eq(gmBad.length, 0, runKey + '：golden metrics 块与 scalars 面逐位同源（10 项锚定）', gmBad.join(','));

  /* 事件面：故障局 1 事件 + pre/post 相位（healthy 无事件） */
  if ((g.events || []).length) {
    eq(run.events.length, 1, runKey + '：1 事件');
    const ge = g.events[0];
    const fe = run.events[0];
    eq(fe.trigger_s, ge.trigger_s, runKey + '：事件时刻 20 s');
    eq(fe.event_type, ge.event_type, runKey + '：event_type=' + ge.event_type);
    eq(fe.faultId, ge.fault_id, runKey + '：faultId 与 golden 同源（目录 id）');
    const fp = run.snapshots.find((x) => x.snapshot_id === fe.preSnapshotId);
    const fq = run.snapshots.find((x) => x.snapshot_id === fe.postSnapshotId);
    ok(!!fp && !!fq, runKey + '：pre/post 快照经引用可达');
    eq(fp.derivation, 'left_limit', runKey + '：pre=left_limit');
    eq(fq.derivation, 'post_sample', runKey + '：post=post_sample');
    const preBad = [];
    const postBad = [];
    Object.keys(ge.snapshots[0].variables).forEach((vid) => {
      if (fp.variables[vid] !== ge.snapshots[0].variables[vid]) preBad.push(vid);
      if (fq.variables[vid] !== ge.snapshots[1].variables[vid]) postBad.push(vid);
    });
    eq(preBad.length + postBad.length, 0, runKey + '：pre/post 快照相位值与 golden 逐位一致', preBad.concat(postBad).join(','));
  } else {
    eq(run.events.length, 0, runKey + '：健康局无事件');
  }
});

/* ================================================================== */
/* 2. A/B/C 锚点（规格 §3.1/§3.2 表列值与容差）+ r ≡ 0（§3.3）           */
/* ================================================================== */
(function anchors() {
  const sig = (k) => trackRuns[k].timeseries.signals;
  const met = (k, id) => trackRuns[k].metrics.find((m) => m.metric_id === id).value;
  const specP = 0.05;   /* P 锚点容差 ±0.05 kW */
  const specE = 0.0005; /* E 锚点容差 ±0.0005 kWh */
  const specT = 0.001;  /* 瞬态采样锚点容差 ±0.001 kW */
  const specD = 1e-9;   /* d_pv(60) ≤1e-9 kW */
  const specR = 1e-12;  /* r ≤1e-12 kW（§3.3 判别性恒等） */

  /* 场景 A：sensor_drift 闭环 +100 W/m² */
  close(sig('closed_loop_fault').P_pv_true_kW[600], 11.00, specP, 'A：P_pv_true(60)=11.00 kW');
  close(sig('closed_loop_fault').P_grid_true_kW[600], 19.00, specP, 'A：P_grid_true(60)=19.00 kW');
  close(met('closed_loop_fault', 'E_pv_true_kWh'), 0.1775, specE, 'A：E_pv_true=0.1775 kWh');
  close(met('closed_loop_fault', 'E_pv_est_kWh'), 0.1777778, specE, 'A：E_pv_est=0.1777778 kWh');
  close(met('closed_loop_fault', 'E_pv_err_kWh'), 0.0002778, specE, 'A：ΔE_pv=+0.0002778 kWh');
  close(sig('closed_loop_fault').P_pv_true_kW[210], 10.632121, specT, 'A：P_pv(21.0)=10.632121（11−e⁻¹）');
  close(sig('closed_loop_fault').P_pv_true_kW[260], 10.997521, specT, 'A：P_pv(26.0)=10.997521（11−e⁻⁶）');
  ok(Math.abs(sig('closed_loop_fault').d_pv_kW[600]) <= specD, 'A：d_pv(60) ≤1e-9（闭环稳态自洽）',
    String(sig('closed_loop_fault').d_pv_kW[600]));

  /* 场景 B：sensor_drift 仅监测 +100 W/m² */
  close(sig('monitor_only').P_pv_true_kW[600], 10.00, specP, 'B：P_pv_true(60)=10.00 kW（偏置不进入物理回路）');
  close(sig('monitor_only').P_grid_true_kW[600], 20.00, specP, 'B：P_grid_true(60)=20.00 kW');
  close(sig('monitor_only').d_pv_kW[600], -1.00, specP, 'B：d_pv(60)=−1.00 kW（估计通道仍读测量辐照度）');
  close(met('monitor_only', 'E_pv_err_kWh'), 0.0111111, specE, 'B：ΔE_pv=+0.0111111 kWh');
  close(met('monitor_only', 'E_pv_true_kWh'), 0.1666667, specE, 'B：E_pv_true=0.1666667 kWh');
  close(met('monitor_only', 'E_pv_est_kWh'), 0.1777778, specE, 'B：E_pv_est=0.1777778 kWh');

  /* 场景 C：shading_step −300 W/m² 闭环 */
  close(sig('shading_closed_loop').P_pv_true_kW[600], 7.00, specP, 'C：P_pv_true(60)=7.00 kW');
  close(sig('shading_closed_loop').P_grid_true_kW[600], 23.00, specP, 'C：P_grid_true(60)=23.00 kW');
  close(met('shading_closed_loop', 'E_pv_err_kWh'), -0.0008333, specE, 'C：ΔE_pv=−0.0008333 kWh');
  close(sig('shading_closed_loop').P_pv_true_kW[210], 8.103638, specT, 'C：P_pv(21.0)=8.103638（7+3·e⁻¹）');
  ok(Math.abs(sig('shading_closed_loop').d_pv_kW[600]) <= specD, 'C：d_pv(60) ≤1e-9',
    String(sig('shading_closed_loop').d_pv_kW[600]));
  /* max|d_pv| 峰值锚点：A=1.00@20.0 / C=3.00@20.0（估计先跳、真实滞后） */
  close(sig('closed_loop_fault').d_pv_kW[200], -1.00, specP, 'A：d_pv(20.0⁺)=−1.00 kW');
  close(sig('shading_closed_loop').d_pv_kW[200], 3.00, specP, 'C：d_pv(20.0⁺)=+3.00 kW');

  /* 判别性恒等：r_true ≡ 0、r_meas ≡ 0（全部 4 Run × 601 点，≤1e-12；§3.3 与 FL-001 对照） */
  ['healthy', 'closed_loop_fault', 'monitor_only', 'shading_closed_loop'].forEach((k) => {
    let maxRt = 0;
    let maxRm = 0;
    sig(k).r_true_kW.forEach((v) => { if (Math.abs(v) > maxRt) maxRt = Math.abs(v); });
    sig(k).r_meas_kW.forEach((v) => { if (Math.abs(v) > maxRm) maxRm = Math.abs(v); });
    ok(maxRt <= specR && maxRm <= specR, k + '：r_true/r_meas 逐点 ≡ 0（≤1e-12 kW）',
      'max|r_true|=' + maxRt + ' max|r_meas|=' + maxRm);
  });
})();

/* ================================================================== */
/* 3. shading 闭环 vs 仅监测逐位等价（物理输入，与控制模式无关）          */
/* ================================================================== */
(function shadingEquivalence() {
  const mkCfg = (mode) => FL.core.createConfig('PV-001', {
    fault: { family: 'shading_step', params: { magnitude: 300 }, t_start_s: 20 },
    feedback_mode: mode
  });
  const cl = FL.registry.createRun({ config: mkCfg('closed_loop'), runId: 'PV-SHADING-CL' });
  const mo = FL.registry.createRun({ config: mkCfg('monitor'), runId: 'PV-SHADING-MO' });

  /* 排除是承重面：label/role/effective_mode 由反馈模式派生，本就不同 */
  ok(cl.label !== mo.label, 'shading 两模式 label 不同（闭环/仅监测，排除项为承重面）', cl.label + ' vs ' + mo.label);
  ok(cl.role !== mo.role, 'shading 两模式 role 不同（fault/contrast）', cl.role + ' vs ' + mo.role);
  eq(cl.truth.effectiveFeedbackMode, 'closed_loop', 'shading 闭环 truth 模式');
  eq(mo.truth.effectiveFeedbackMode, 'monitor', 'shading 仅监测 truth 模式');

  /* t + 17 信号全序列逐位（===）一致 */
  eq(JSON.stringify(cl.timeseries.t), JSON.stringify(mo.timeseries.t), 'shading 两模式 t 序列逐位一致');
  const sigIds = Object.keys(cl.timeseries.signals);
  eq(sigIds.length, 17, 'PV 信号面 17 项');
  let sigDiff = '';
  sigIds.forEach((sid) => {
    if (JSON.stringify(cl.timeseries.signals[sid]) !== JSON.stringify(mo.timeseries.signals[sid])) {
      sigDiff += (sigDiff ? ',' : '') + sid;
    }
  });
  eq(sigDiff, '', 'shading 两模式 17 信号全序列逐位一致（PS-5 面）', sigDiff);

  /* 事件与快照逐位一致（物理输入在两模式同生效） */
  eq(JSON.stringify(cl.events), JSON.stringify(mo.events), 'shading 两模式 events 逐位一致');
  eq(JSON.stringify(cl.snapshots), JSON.stringify(mo.snapshots), 'shading 两模式 snapshots 逐位一致');

  /* metrics：id 序一致；除 effective_mode 外逐位一致 */
  eq(cl.metrics.length, mo.metrics.length, 'shading 两模式 metrics 数量一致');
  let metDiff = '';
  for (let i = 0; i < cl.metrics.length; i++) {
    const a = cl.metrics[i];
    const b = mo.metrics[i];
    if (a.metric_id !== b.metric_id) { metDiff += (metDiff ? ',' : '') + 'id@' + i; continue; }
    if (a.metric_id === 'effective_mode') continue; /* 反馈模式派生，排除 */
    if (a.value !== b.value || a.unit !== b.unit || a.precision !== b.precision) {
      metDiff += (metDiff ? ',' : '') + a.metric_id;
    }
  }
  eq(metDiff, '', 'shading 两模式 metrics 逐位一致（排除 effective_mode）', metDiff);
})();

/* ================================================================== */
/* 4. GT 轨区分守卫（R-4）+ 三系统既有轨 sanity                          */
/* ================================================================== */
(function dispatchGuard() {
  const pvRun = trackRuns.closed_loop_fault;

  /* PV 分派生效的元数据面：scope / 目录 faultId / 模型版本 / run_hash 可重算 */
  eq(pvRun.manifest.scope, 'extension_preview', 'PV Run scope=extension_preview（规格 §2.4/§5）');
  eq(pvRun.config.fault.faultId, 'G_sensor_bias', 'PV faultId=目录 id G_sensor_bias');
  eq(pvRun.modelManifest.model_version, '1.0.0', 'PV model_version=1.0.0');
  eq(FL.registry.verifyRunHash(pvRun), true, 'PV run_hash 可重算');

  /* PV 信号面：P_pv 信号在场（PV 物理量纲），GT 专属信号不在场——
     若分派链 PV 分支被绕过（静默落入 GT 物理），信号面直接缺失/换轨 */
  ok(!!pvRun.timeseries.signals.P_pv_true_kW && pvRun.timeseries.signals.P_pv_true_kW.length === 601,
    'P_pv_true_kW 在场（601 点，PV 信号面）');
  const gtOnly = ['f_true_Hz', 'n_meas_rpm', 'P_gen_true_kW', 'f_channel_diff_Hz'];
  const leaked = gtOnly.filter((sid) => pvRun.timeseries.signals[sid] !== undefined);
  eq(leaked.length, 0, 'PV Run 无 GT 专属信号（分派未落入 GT 物理）', leaked.join(','));

  /* PV 锚点在 P_pv 通道上成立（GT 物理不会给出 10→11 kW 一阶跟随面） */
  const pv = pvRun.timeseries.signals.P_pv_true_kW;
  eq(pv[0], 10, 'P_pv(0)=10 kW');
  close(pv[600], 11.00, 0.05, 'P_pv(60)=11.00 kW（PV 锚点，非 GT 轨数值面）');

  /* PV Run quality（CHG-20261105-01 清算项 1 落地态）：通用检查 pass；
     soc-bounds/energy-balance 按 system.bounds 派生——PV bounds 无 SOC_pct 声明 → 不派发
     （解除 CHG-20261104-10 锁定态 fail）；PV 专属 PHY 恒等检查 pv-energy-consistency pass */
  const q = {};
  pvRun.quality.forEach((c) => { q[c.check_id] = c.status; });
  ['sampling', 'conservation-true', 'conservation-meas', 'units', 'event-window'].forEach((id) => {
    eq(q[id], 'pass', 'PV quality ' + id + '=pass');
  });
  eq(q['soc-bounds'], undefined, 'PV quality soc-bounds 不派发（bounds 无 SOC_pct 声明，bounds 派生分派）');
  eq(q['energy-balance'], undefined, 'PV quality energy-balance 不派发（bounds 无 SOC_pct 声明，bounds 派生分派）');

  /* PV 专属 PHY 检查 pv-energy-consistency：4 Run 全部在场且 pass，
     残差 |E_pv_true + E_grid − E_load| ≤1e-9 kWh（pv001_v1 gate T-A E_kWh） */
  ['healthy', 'closed_loop_fault', 'monitor_only', 'shading_closed_loop'].forEach((k) => {
    const pc = trackRuns[k].quality.find((c) => c.check_id === 'pv-energy-consistency');
    ok(!!pc, k + '：pv-energy-consistency 在场（PV 专属 PHY 按系统分派）');
    eq(pc && pc.status, 'pass', k + '：pv-energy-consistency=pass（E_pv + E_grid = E_load 恒等闭合）');
    ok(pc && typeof pc.observed === 'number' && pc.observed <= 1e-9,
      k + '：pv-energy-consistency 残差 ≤1e-9 kWh（gate T-A E_kWh）', String(pc && pc.observed));
    ok(pc && pc.tolerance.indexOf('1e-9') !== -1, k + '：pv-energy-consistency 容差声明含 1e-9 kWh');
  });
  /* PV quality 面无 fail（锁定态解除的整面断言） */
  eq(pvRun.quality.filter((c) => c.status === 'fail').length, 0,
    'PV quality 无 fail（锁定态 fail → pass 翻转完成）');

  /* 三系统既有轨 sanity：各自信号面在场、PV 信号不在场、run_hash 可重算
     （engine.test.js 不改而在验证清单跑绿；此处为引擎面轻量回归） */
  const focal = { 'FL-001': 'I_bat_true_A', 'FC-001': 'I_fc_true_A', 'GT-001': 'f_true_Hz' };
  Object.keys(focal).forEach((sid) => {
    const run = FL.registry.createRun({ config: FL.core.createConfig(sid, {}), runId: 'PV-SANITY-' + sid });
    eq(run.systemId, sid, sid + ' sanity：systemId');
    ok(!!run.timeseries.signals[focal[sid]] && run.timeseries.signals[focal[sid]].length === 601,
      sid + ' sanity：焦点信号 ' + focal[sid] + ' 在场（601 点）');
    ok(run.timeseries.signals.P_pv_true_kW === undefined, sid + ' sanity：无 PV 信号渗入');
    eq(FL.registry.verifyRunHash(run), true, sid + ' sanity：run_hash 可重算');
    const fails = run.quality.filter((c) => c.status === 'fail');
    eq(fails.length, 0, sid + ' sanity：quality 无 fail（三系统既有面零触碰）',
      fails.map((c) => c.check_id).join(','));
  });
})();

/* ================================================================== */
/* 5. 健康局恒等：P_pv ≡ 10（逐位；§3.3 健康局不变量 PS-6 面）           */
/* ================================================================== */
(function healthyIdentity() {
  const sig = trackRuns.healthy.timeseries.signals;
  const n = golden.sampling.n;
  let pvBreak = -1;
  let gridBreak = -1;
  let dBreak = -1;
  for (let i = 0; i < n; i++) {
    if (sig.P_pv_true_kW[i] !== 10 && pvBreak === -1) pvBreak = i;
    if (sig.P_grid_true_kW[i] !== 20 && gridBreak === -1) gridBreak = i;
    if (sig.d_pv_kW[i] !== 0 && dBreak === -1) dBreak = i;
  }
  eq(pvBreak, -1, '健康局 P_pv_true ≡ 10 kW 全 601 点逐位恒等', '首个破坏点 @' + pvBreak);
  eq(gridBreak, -1, '健康局 P_grid_true ≡ 20 kW 全 601 点逐位恒等', '首个破坏点 @' + gridBreak);
  eq(dBreak, -1, '健康局 d_pv ≡ 0 全 601 点逐位恒等', '首个破坏点 @' + dBreak);
  /* 估计通道恒等：P_pv_est ≡ k·G_meas·φ_T = 10、E_pv_err = 0（healthy） */
  eq(sig.P_pv_est_kW[600], 10, '健康局 P_pv_est(60)=10 kW');
  eq(trackRuns.healthy.metrics.find((m) => m.metric_id === 'E_pv_err_kWh').value, 0, '健康局 E_pv_err=0');
})();

/* ================================================================== */
/* 6. Arena 盲测池守卫（源级：systemList 过滤结构 + 排除链登记）——V130 DEC-2      */
/*    exposure 三值映射验证轮入池（ARENA_EXCLUDED 收缩 []，CHG-20261113-05）后，     */
/*    本节 3 条旧「DEC-2 显式排除」断言随之镜像更新（W6 镜像同步——W3 已同构更新      */
/*    arena.test.js §8 与 e2e E-12，本文件为同轮漏项；判据数零变化，物理断言零触碰）。 */
/* ================================================================== */
(function arenaPoolGuard() {
  const arenaPath = path.join(__dirname, '..', 'src', 'ui', 'pages', 'arena.js');
  const src = fs.readFileSync(arenaPath, 'utf8');
  const i0 = src.indexOf('function systemList');
  const i1 = src.indexOf('function systemTitle');
  ok(i0 !== -1 && i1 > i0, 'arena.js systemList 函数定位');
  const body = src.slice(i0, i1);
  /* TL-001 注册（CHG-20261125-02）：ARENA_EXCLUDED 由 [] 变为 ['TL-001']——联合轨不入盲测池
     （TL001_FMU_G2B_SPEC_APPROVED v1.0 §2.4）；六系统入池面不变（判据数零变化） */
  ok(body.indexOf("ARENA_EXCLUDED = ['TL-001']") !== -1,
    'Arena ARENA_EXCLUDED 仅排除 TL-001（六系统入池——V130 DEC-2 验证轮 CHG-20261113-05；TL-001 联合轨不入池 CHG-20261125-02）');
  ok(src.indexOf('CHG-20261104-10') !== -1, 'Arena 历史排除链批准注释保留登记 CHG-20261104-10');
  ok(body.indexOf('ARENA_EXCLUDED') !== -1 && src.indexOf('ARENA_EXPOSURE_VERIFICATION_ROUND') !== -1,
    'Arena 守卫过滤结构在场 + 验证轮依据登记（ARENA_EXPOSURE_VERIFICATION_ROUND.md）');
})();

/* ---------- 汇总 ---------- */
console.log('\n== PV-001 引擎 ↔ golden 一致性（pv001_v1 4 Run，gate T-A） ==');
if (fail) {
  console.log('FAIL ' + fail + ' / PASS ' + pass);
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('PASS ' + pass + ' / FAIL 0 ✓（4 Run 全序列/scalars + A/B/C 锚点 + shading 逐位等价 + GT 分派守卫 + 健康局恒等 + Arena 盲测池守卫）');
