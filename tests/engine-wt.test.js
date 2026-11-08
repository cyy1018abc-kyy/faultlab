/* owner: core-engine | module: tests/engine-wt | contract: WT001_G2B_SPEC_APPROVED v1.0 §3/§4
   + V080_WAVE_DESIGN（CHG-20261107-01 批准链）/ R-7 守卫 / DEC-6 run-g2 第 30 步
   WT-001 引擎 ↔ golden 一致性（oracle 只读生成，engine 只读比对，G0-DEC-16）。
   运行：node tests/engine-wt.test.js；失败非零退出。
   覆盖：
     1. golden 5 Run 全序列逐点（gate T-A 容差分类映射）+ 29 scalars 全量复算对 golden
        （golden metrics 块 id 面为 oracle 独立子集 `_60s`/`_end_kW` 惯例，其值与
        scalars 面逐位同源——先做 golden 内一致锚定，再以引擎侧 scalars 对比对）；
     2. A/A'/B/C 锚点断言（规格 §3.1–§3.3 表列值与容差）+ 健康局恒等不变量（§3.4）
        + r_true/r_meas ≡ 0 逐点（§3.3 判别性恒等 WS-4）；
     3. gust 闭环 vs 仅监测逐位等价（物理输入，§3.3「两模式同解」复算实证面——
        WS-7；monitor Run 不重复入 golden，§4 项 2）；
     4. WT 轨区分守卫（R-7）：WT 配置走 WT 轨（healthy P_wt(60)=10.000000 即守卫——
        GT 物理给出不同值；分派点 engine.js simulate 分派链显式分支置于 else→GT001
        兜底之前）+ GT 专属信号不在场 + 无 GT 兜底渗入。
   事件面口径（§1.3-b / A-1 修订）：t=20.0 状态行 = 状态 pre + 输入 post 右值——
   B 场景 beta_pitch_deg(20.0)=0.0（pre）、beta_stuck_deg(20.0)=16.5（事件域信号行）。
   快照相位值比较为容差面（非逐位）：oracle（Python）与引擎（V8）n_rotor_rpm /
   P_wt_ref_kW 存在 1 ulp 末位差（≤5.7e-14，与本测试第 1 节序列面同源），逐位断言
   会旗标平台级 ulp 尘点——逐点 ≤ gate T-A 分类容差。
   WT Run quality：conservation-true/conservation-meas（r_true/r_meas ≡ 0，EQ-WT-8）、
   wt-energy-identity（E_wt + E_grid = E_load，容差 = wt001_v1 gate T-A E_kWh）、
   event-window 本测试断言 pass；units/sampling 两检查为并发落地面（units 待
   systems.js UNITS 表补 wind/angle/dimensionless 声明；sampling 待 beta_stuck_deg
   事件域豁免入 checks.js nullOptional 机制——I_bat_cap_A 先例），本测试不对二者
   断言，落地面由 check 侧回归承载。 */
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
/* golden 装载与 Run 配置（键面按 golden.runs 遍历，同 engine-pv 先例）  */
/* ================================================================== */
const GOLDEN_PATH = path.join(__dirname, '..', 'data', 'golden', 'wt001_v1.json');
const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
const tol = golden.tolerances.gate;
eq(golden.golden_id, 'wt001_v1', 'golden id=wt001_v1');
eq(golden.tolerances.gate.tier, 'T-A', 'gate tier=T-A（§4 项 6：同更新序逐算子复刻，非 T-B）');
eq(golden.model_id, 'WT-001', 'golden model_id=WT-001');
eq(golden.model_version, '1.0.0', 'golden model_version=1.0.0（三段式 v2 归一样式）');
eq(golden.method_id, 'wt001_l0b_euler_dt0.01', 'golden method_id（L0b Euler h=0.01）');
/* 冻结更新序子步面（§1.3-b 唯一权威：h=0.01、6000 子步/60 s） */
eq(golden.config.h_sub_s, 0.01, 'golden 子步 h=0.01（§1.3-b 冻结更新序）');
eq(golden.config.n_substeps, 6000, 'golden 6000 子步/60 s（§1.3-b 冻结更新序）');

const RUNS_CFG = {
  healthy: { fault: { family: 'none' }, feedback_mode: 'closed_loop' },
  closed_loop_fault: { fault: { family: 'sensor_drift' }, feedback_mode: 'closed_loop' },
  monitor_only: { fault: { family: 'sensor_drift' }, feedback_mode: 'monitor' },
  pitch_stuck_closed_loop: { fault: { family: 'actuator_fault' }, feedback_mode: 'closed_loop' },
  gust_closed_loop: { fault: { family: 'gust_step' }, feedback_mode: 'closed_loop' }
};

/* gate T-A 容差分类映射（序列）：
   - r_true/r_meas：定义恒等 ≡ 0（EQ-WT-8），沿 engine-pv.test.js:53 先例路由 r_true 专键
     1e-12——golden 序列含 ±3.55e-15 复算尘点，逐点 _kW 限 1e-15 会误旗（L3 交接注记）；
   - _rpm → n_rpm_atol（verify_golden T-A endswith('_rpm') 分支同构）；
   - bias* → I_A 键承载（verify_golden T-A startswith('bias') 分支同构，WT 规格 §4 项 6）；
   - 其余（kW 及 v/beta/lambda/cp/V 无后缀类）→ P 相对类按点幅值；d_wt_kW 经 _kW 后缀
     路由至 P_kW_atol（d_wt 专键已按 §4 项 6 B-2 修订删除，无路由消费）。 */
function seriesLimit(sid, gref) {
  if (sid === 't') return tol.t_s;
  if (sid === 'r_true_kW' || sid === 'r_meas_kW') return tol.r_true_kW;
  if (sid.slice(-4) === '_rpm') return tol.n_rpm_atol;
  if (sid.indexOf('bias') === 0) return Math.max(tol.I_A_atol, tol.I_A_rtol * Math.abs(gref));
  return Math.max(tol.P_kW_atol, tol.P_kW_rtol * Math.abs(gref));
}
/* gate T-A 容差分类映射（scalars）：kW·s 积分借 E 类 ×3600（同测度换算） */
function scalarLimit(key, gval) {
  if (key.indexOf('_kWh') !== -1) return tol.E_kWh;
  if (key.indexOf('int_') === 0) return tol.E_kWh * 3600;
  if (key.indexOf('max_abs_r') === 0) return tol.r_true_kW;
  if (key.indexOf('n_rotor') !== -1) return tol.n_rpm_atol;
  if (key.indexOf('beta') !== -1 || key.indexOf('lambda') !== -1 || key.indexOf('cp_coeff') !== -1) {
    return 1e-9; /* v/beta/lambda/cp 类无后缀分支 fall-through 1e-9（§4 项 6 核对注记） */
  }
  if (key.indexOf('t_') === 0) return tol.t_s;
  return Math.max(tol.P_kW_atol, tol.P_kW_rtol * Math.abs(gval)); /* kW/d_wt 类（d_wt 走 _kW 支路 → P_kW_atol，B-2 定案） */
}

/* golden metrics 块 id → scalars id（oracle 独立子集与标量面同源的锚定表） */
const GOLDEN_METRIC_TO_SCALAR = {
  E_wt_true_60s: 'E_wt_true_kWh',
  E_wt_est_60s: 'E_wt_est_kWh',
  E_wt_err_60s: 'E_wt_err_kWh',
  E_grid_60s: 'E_grid_kWh',
  E_load_60s: 'E_load_kWh',
  P_wt_true_end_kW: 'P_wt_true_60_kW',
  P_grid_true_end_kW: 'P_grid_true_60_kW',
  d_wt_end_kW: 'd_wt_60_kW',
  max_abs_d_wt_kW: 'max_abs_d_wt_kW',
  max_abs_r_true_kW: 'max_abs_r_true_kW'
};

/* 引擎侧复算 golden scalars（29 项：能量账本取指标、采样点取序列、极值取遍历） */
function deriveScalars(run) {
  const sig = run.timeseries.signals;
  const t = run.timeseries.t;
  const met = {};
  run.metrics.forEach((m) => { met[m.metric_id] = m.value; });
  let maxAbs = 0;
  let tAt = t[0];
  for (let i = 0; i < sig.d_wt_kW.length; i++) {
    const a = Math.abs(sig.d_wt_kW[i]);
    if (a > maxAbs) { maxAbs = a; tAt = t[i]; } /* 严格 >：并列取首点（golden 同口径） */
  }
  return {
    E_wt_true_kWh: met.E_wt_true_kWh,
    E_wt_est_kWh: met.E_wt_est_kWh,
    E_wt_err_kWh: met.E_wt_err_kWh,
    E_grid_kWh: met.E_grid_kWh,
    E_load_kWh: met.E_load_kWh,
    int_P_wt_true_60s_kWs: met.E_wt_true_kWh * 3600,
    int_P_wt_est_60s_kWs: met.E_wt_est_kWh * 3600,
    int_P_grid_60s_kWs: met.E_grid_kWh * 3600,
    int_P_load_60s_kWs: met.E_load_kWh * 3600,
    P_wt_true_19p9_kW: sig.P_wt_true_kW[199],
    P_wt_meas_19p9_kW: sig.P_wt_meas_kW[199],
    t_19p9_s: t[199],
    P_wt_true_20post_kW: sig.P_wt_true_kW[200],
    P_wt_meas_20post_kW: sig.P_wt_meas_kW[200],
    d_wt_20post_kW: sig.d_wt_kW[200],
    P_wt_true_21_kW: sig.P_wt_true_kW[210],
    P_wt_true_26_kW: sig.P_wt_true_kW[260],
    P_wt_est_60_kW: sig.P_wt_est_kW[600],
    P_wt_true_60_kW: sig.P_wt_true_kW[600],
    P_grid_true_60_kW: sig.P_grid_true_kW[600],
    n_rotor_60_rpm: sig.n_rotor_rpm[600],
    beta_pitch_60_deg: sig.beta_pitch_deg[600],
    lambda_tip_60: sig.lambda_tip[600],
    cp_coeff_60: sig.cp_coeff[600],
    d_wt_60_kW: sig.d_wt_kW[600],
    max_abs_d_wt_kW: maxAbs,
    t_at_max_abs_d_wt_s: tAt,
    max_abs_r_true_kW: met.max_abs_r_true_kW,
    max_abs_r_meas_kW: met.max_abs_r_meas_kW
  };
}

/* ================================================================== */
/* 1. golden 5 Run：全序列（gate T-A）+ scalars 全量 + 事件/配置面      */
/* ================================================================== */
const trackRuns = {};
Object.keys(golden.runs).forEach((runKey) => {
  const g = golden.runs[runKey];
  const cfg = FL.core.createConfig('WT-001', JSON.parse(JSON.stringify(RUNS_CFG[runKey])));
  const run = FL.registry.createRun({ config: cfg, runId: 'WT-GOLDEN-' + runKey });
  trackRuns[runKey] = run;
  const n = golden.sampling.n;

  /* 配置面：引擎配置与 golden config 键面同源（duration/dt/故障时刻/初值/幅值） */
  eq(run.systemId, 'WT-001', runKey + '：run.systemId=WT-001');
  eq(cfg.modelId, 'wt.aero.l0b', runKey + '：cfg.modelId=wt.aero.l0b（模型清单对齐面）');
  eq(cfg.duration_s, golden.config.duration_s, runKey + '：duration 60 s');
  eq(cfg.dt_s, golden.config.dt_s, runKey + '：dt 0.1 s');
  eq(cfg.initial.v0_ms, golden.config.v0_ms, runKey + '：v0 = ' + golden.config.v0_ms + ' m/s（设计点初值）');
  eq(run.timeseries.t.length, n, runKey + '：601 点（n=duration/dt+1）');
  if (runKey !== 'healthy') {
    eq(cfg.fault.t_start_s, golden.config.fault_time_s, runKey + '：故障时刻 20 s');
  } else {
    eq(cfg.fault.family, 'none', runKey + '：健康局无故障族');
  }
  /* 幅值面：v_sensor_bias 注入 B=1.0（b=−B 低估）、pitch_stuck=55%、gust Δv=+2.0 */
  if (runKey === 'closed_loop_fault' || runKey === 'monitor_only') {
    eq(cfg.fault.params.magnitude, golden.config.bias_B_ms, runKey + '：偏置幅值 B=1.0 m/s（低估方向 b=−B）');
  }
  if (runKey === 'pitch_stuck_closed_loop') {
    eq(cfg.fault.params.magnitude, golden.config.pitch_stuck_pct, runKey + '：卡涩满度 55%（β_stuck = 30°×55% = 16.5°）');
  }
  if (runKey === 'gust_closed_loop') {
    eq(cfg.fault.params.magnitude, golden.config.gust_dv_ms, runKey + '：阵风幅值 Δv=+2.0 m/s');
  }

  /* 全序列逐点（golden 子集 ∩ 引擎序列；t 列取 run.timeseries.t）。
     注：oracle（Python libm）与引擎（V8）在 n_rotor_rpm/λ/cp/β/P_aero/P_ref 通道存在
     1 ulp 级末位差（实测 ≤5.68e-14），其余通道逐位一致；断言面 = 逐点 ≤ gate T-A 分类
     容差（§4 项 6：同更新序逐算子复刻，容差吸收平台 ulp 尘点）。 */
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
  eq(missing.length, 0, runKey + '：golden 23 序列在引擎中齐备（含 t 列，§4 项 4 SERIES_IDS）', missing.join(','));
  ok(over === 0, runKey + '：序列逐点 ≤ gate T-A 容差（超差 0 点；最大绝对偏差 ' +
    worstAbs.toExponential(2) + '，最差相对 ' + worstRel.toExponential(2) + ' @ ' + worstAt + '）');

  /* scalars 全量（29 项）：引擎复算 vs golden */
  const S = g.scalars;
  const D = deriveScalars(run);
  const badS = [];
  Object.keys(S).forEach((key) => {
    if (!(key in D)) { badS.push(key + ' 未复算'); return; }
    const d = Math.abs(D[key] - S[key]);
    if (!(d <= scalarLimit(key, S[key]))) badS.push(key + ' ' + D[key] + ' vs ' + S[key]);
  });
  eq(Object.keys(S).length, 29, runKey + '：golden scalars 面 29 项');
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

  /* 事件面：故障局 1 事件 + pre/post 相位（healthy 无事件）；
     WT 事件通道口径（§2/Q2）：pitch_stuck event_type=actuator_fault（位置强制，
     非 FL/FC/GT 指令限幅语义 actuator_limit）、幅值重铸 β_stuck=30°·55%=16.5°/单位 °、
     v_sensor_bias 幅值 b=−B、gust 幅值即通道量 v_true_ms/m·s⁻¹ */
  if ((g.events || []).length) {
    eq(run.events.length, 1, runKey + '：1 事件');
    const ge = g.events[0];
    const fe = run.events[0];
    eq(fe.trigger_s, ge.trigger_s, runKey + '：事件时刻 20 s');
    eq(fe.event_type, ge.event_type, runKey + '：event_type=' + ge.event_type + '（WT 通道口径）');
    eq(fe.target_signal, ge.target_signal, runKey + '：target_signal=' + ge.target_signal + '（注入点通道）');
    eq(fe.magnitude, ge.magnitude, runKey + '：事件幅值与 golden 同源');
    eq(fe.unit, ge.unit, runKey + '：事件单位与 golden 同源');
    eq(cfg.fault.faultId, ge.snapshots[0].fault_id, runKey + '：目录 faultId 与 golden 同源（' + ge.snapshots[0].fault_id + '；golden fault_id 承载于快照行）');
    const fp = run.snapshots.find((x) => x.snapshot_id === fe.preSnapshotId);
    const fq = run.snapshots.find((x) => x.snapshot_id === fe.postSnapshotId);
    ok(!!fp && !!fq, runKey + '：pre/post 快照经引用可达');
    eq(fp.derivation, 'left_limit', runKey + '：pre=left_limit');
    eq(fq.derivation, 'post_sample', runKey + '：post=post_sample');
    /* 相位值容差比较（见头注：oracle/引擎 1 ulp 平台差，n_rotor_rpm/P_wt_ref_kW 实证） */
    const preBad = [];
    const postBad = [];
    Object.keys(ge.snapshots[0].variables).forEach((vid) => {
      const gvPre = ge.snapshots[0].variables[vid];
      const gvPost = ge.snapshots[1].variables[vid];
      if (gvPre === null || gvPost === null) {
        if (fp.variables[vid] !== gvPre) preBad.push(vid);
        if (fq.variables[vid] !== gvPost) postBad.push(vid);
        return;
      }
      const lim = seriesLimit(vid, gvPre);
      if (!(Math.abs(fp.variables[vid] - gvPre) <= lim)) preBad.push(vid + ':' + fp.variables[vid] + ' vs ' + gvPre);
      if (!(Math.abs(fq.variables[vid] - gvPost) <= lim)) postBad.push(vid + ':' + fq.variables[vid] + ' vs ' + gvPost);
    });
    eq(preBad.length + postBad.length, 0, runKey + '：pre/post 快照相位值 ≤ gate T-A 分类容差', preBad.concat(postBad).join(','));
  } else {
    eq(run.events.length, 0, runKey + '：健康局无事件');
  }
});

/* ================================================================== */
/* 2. A/A'/B/C 锚点（§3.1–§3.3）+ 健康局恒等 + r ≡ 0（§3.3/§3.4）        */
/* ================================================================== */
(function anchors() {
  const sig = (k) => trackRuns[k].timeseries.signals;
  const met = (k, id) => trackRuns[k].metrics.find((m) => m.metric_id === id).value;
  const specP = 0.05;   /* P/d_wt 锚点容差 ±0.05 kW */
  const specT = 0.001;  /* 瞬态采样锚点容差 ±0.001 kW */
  const specE = 0.0005; /* E 锚点容差 ±0.0005 kWh */
  const specN = 0.5;    /* n 锚点容差 ±0.5 rpm */
  const specB = 0.1;    /* β 锚点容差 ±0.1° */
  const specLC = 0.01;  /* λ/cp 锚点容差 ±0.01 */
  const specD = 1e-9;   /* d_wt(60) ≤1e-9 kW（闭环吸收，§3.1） */
  const specR = 1e-12;  /* r ≤1e-12 kW（§3.3 判别性恒等 WS-4） */

  /* 健康局（H）：恒等不变量（§3.4）——P_wt ≡ 10.000000（设计点 k_v·v0³ 有理精确）、
     n ≡ 180.643754、β ≡ 0、d_wt ≡ 0、E_wt,true = E_wt,est = 1/6 */
  (function healthyIdentity() {
    const h = sig('healthy');
    const n = golden.sampling.n;
    let pBreak = -1;
    let gridBreak = -1;
    let dBreak = -1;
    let betaBreak = -1;
    let nDrift = false;
    for (let i = 0; i < n; i++) {
      if (h.P_wt_true_kW[i] !== 10 && pBreak === -1) pBreak = i;
      if (h.P_grid_true_kW[i] !== 20 && gridBreak === -1) gridBreak = i;
      if (h.d_wt_kW[i] !== 0 && dBreak === -1) dBreak = i;
      if (h.beta_pitch_deg[i] !== 0 && betaBreak === -1) betaBreak = i;
      if (h.n_rotor_rpm[i] !== h.n_rotor_rpm[0]) nDrift = true;
    }
    eq(pBreak, -1, '健康局 P_wt_true ≡ 10 kW 全 601 点逐位恒等（k_v·v0³ 设计点闭合）', '首个破坏点 @' + pBreak);
    eq(gridBreak, -1, '健康局 P_grid_true ≡ 20 kW 全 601 点逐位恒等', '首个破坏点 @' + gridBreak);
    eq(dBreak, -1, '健康局 d_wt ≡ 0 全 601 点逐位恒等', '首个破坏点 @' + dBreak);
    eq(betaBreak, -1, '健康局 β ≡ 0 全 601 点逐位恒等（MPPT 区桨距不介入）', '首个破坏点 @' + betaBreak);
    eq(nDrift, false, '健康局 n 全 601 点恒定（60 s 转速漂移 0，§3.4 复算记录）');
    close(h.n_rotor_rpm[0], 180.643754, 1e-6, '健康局 n = 180.643754 rpm（WS-5 口径 ±1e-6）');
    ok(Math.abs(met('healthy', 'E_wt_true_kWh') - 1 / 6) <= 1e-9 &&
      Math.abs(met('healthy', 'E_wt_est_kWh') - 1 / 6) <= 1e-9,
      '健康局 E_wt,true = E_wt,est = 1/6 kWh（精确有理数，§3.4）');
    ok(Math.abs(met('healthy', 'E_grid_kWh') - 1 / 3) <= 1e-9 &&
      Math.abs(met('healthy', 'E_load_kWh') - 0.5) <= 1e-9,
      '健康局 E_grid = 1/3、E_load = 0.5 kWh（§3.4）');
    eq(h.lambda_tip[0], 8.100117280602777, '健康局 λ = λ_opt 登记值（§1.3-a 常量表）');
  })();

  /* 场景 A：v_sensor_bias 闭环（B=1.0 低估，v_ctrl=8，保护钳位 k_v·8³）§3.1 */
  close(sig('closed_loop_fault').P_wt_true_kW[600], 7.023320, specP, 'A：P_wt_true(60)=7.023320 kW（=k_v·8³/1000 保护钳位）');
  close(sig('closed_loop_fault').P_grid_true_kW[600], 22.976680, specP, 'A：P_grid_true(60)=22.976680 kW');
  close(sig('closed_loop_fault').P_wt_true_kW[201], 9.716731, specT, 'A：P_wt(20.1)=9.716731（钳位值+2.976680·e^(−0.1)）');
  close(sig('closed_loop_fault').P_wt_true_kW[210], 8.118379, specT, 'A：P_wt(21.0)=8.118379（钳位值+2.976680·e^(−1)）');
  close(sig('closed_loop_fault').P_wt_true_kW[260], 7.030698, specT, 'A：P_wt(26.0)=7.030698（钳位值+2.976680·e^(−6)）');
  close(sig('closed_loop_fault').n_rotor_rpm[600], 224.324628, specN, 'A：n(60)=224.324628 rpm（右支平衡）');
  close(sig('closed_loop_fault').beta_pitch_deg[600], 5.510062, specB, 'A：β(60)=5.5101°（β_ref=3.0·(ω−ω_N) 平衡）');
  close(sig('closed_loop_fault').lambda_tip[600], 10.058780, specLC, 'A：λ(60)=10.058780（Cp 右支下移）');
  close(sig('closed_loop_fault').cp_coeff[600], 0.337132, specLC, 'A：cp(60)=0.337132');
  ok(Math.abs(sig('closed_loop_fault').d_wt_kW[600]) <= specD, 'A：d_wt(60) ≤1e-9（闭环吸收：真实出力=被低估的估计值）',
    String(sig('closed_loop_fault').d_wt_kW[600]));
  close(sig('closed_loop_fault').d_wt_kW[200], 2.976680, specP, 'A：d_wt(20.0⁺)=+2.976680 kW（估计先跳、真实滞后）');
  close(met('closed_loop_fault', 'E_wt_true_kWh'), 0.134419, specE, 'A：E_wt_true=0.134419 kWh');
  close(met('closed_loop_fault', 'E_wt_est_kWh'), 0.133592, specE, 'A：E_wt_est=0.133592 kWh（事件感知解析）');
  close(met('closed_loop_fault', 'E_wt_err_kWh'), -0.000827, specE, 'A：ΔE_wt=−0.000827 kWh（估计偏少，低估方向）');

  /* 场景 A'：v_sensor_bias 仅监测——偏置不进入物理回路（保护钳位改读真实风速）§3.2 */
  let moBreak = -1;
  for (let i = 0; i < golden.sampling.n; i++) {
    if (sig('monitor_only').P_wt_true_kW[i] !== 10) { moBreak = i; break; }
  }
  eq(moBreak, -1, "A'：P_wt_true ≡ 10 kW 全 601 点逐位恒等（monitor 偏置不进入物理回路）", '首个破坏点 @' + moBreak);
  close(sig('monitor_only').P_grid_true_kW[600], 20.0, specP, "A'：P_grid_true(60)=20.00 kW（物理面与健康局同）");
  close(sig('monitor_only').d_wt_kW[600], 2.976680, specP, "A'：d_wt(60)=+2.976680 kW（估计通道恒用测量——界破坏特征）");
  eq(sig('monitor_only').d_wt_kW[600], sig('monitor_only').d_wt_kW[200],
    "A'：d_wt 自 t=20.0⁺ 起逐位恒定 +2.976680（估计先跳后不再回归）");
  close(met('monitor_only', 'E_wt_err_kWh'), -0.033074, specE, "A'：ΔE_wt=−0.033074 kWh（600−480.933 kW·s，估计偏少）");
  ok(Math.abs(met('monitor_only', 'E_wt_true_kWh') - 1 / 6) <= 1e-9,
    "A'：E_wt_true = 1/6 kWh（物理面恒等于健康局）");

  /* 场景 B：pitch_stuck 闭环（55% 位置强制）§3.2——事件行口径：状态行 = pre 值
     beta_pitch(20.0)=0.0，钉扎值由事件域信号行承载 beta_stuck_deg(20.0)=16.5（A-1 修订） */
  eq(sig('pitch_stuck_closed_loop').beta_pitch_deg[200], 0, 'B：β(20.0)=0.0°（状态行 = 子步起点 pre 值，A-1 定案）');
  eq(sig('pitch_stuck_closed_loop').beta_stuck_deg[200], 16.5, 'B：beta_stuck_deg(20.0)=16.5°（事件域信号行 = 钉扎值，30°×55% 有理精确）');
  eq(sig('pitch_stuck_closed_loop').beta_stuck_deg[199], null, 'B：beta_stuck_deg(19.9)=null（事件域信号自 t_start 生效，I_bat_cap_A 先例）');
  eq(sig('pitch_stuck_closed_loop').beta_pitch_deg[201], 16.5, 'B：β(20.1)=16.5°（激活窗内位置强制钉扎）');
  close(sig('pitch_stuck_closed_loop').P_wt_true_kW[600], 3.473779, specP, 'B：P_wt_true(60)=3.473779 kW（Cp(λ,16.5°) 坍缩 → 左支平衡）');
  close(sig('pitch_stuck_closed_loop').P_wt_true_kW[210], 9.242988, specT, 'B：P_wt(21.0)=9.242988');
  close(sig('pitch_stuck_closed_loop').P_wt_true_kW[260], 4.584997, specT, 'B：P_wt(26.0)=4.584997');
  close(sig('pitch_stuck_closed_loop').n_rotor_rpm[600], 126.986056, specN, 'B：n(60)=126.986056 rpm（MPPT 曲线跟随下行）');
  close(sig('pitch_stuck_closed_loop').lambda_tip[600], 5.694091, specLC, 'B：λ_eq(60)=5.694091（左支平衡二分根）');
  close(sig('pitch_stuck_closed_loop').cp_coeff[600], 0.166741, specLC, 'B：cp(60)=0.166741');
  close(sig('pitch_stuck_closed_loop').d_wt_kW[600], -6.526221, specP, 'B：d_wt(60)=−6.526221 kW（恒用测量估计 vs 偏离最优的真实出力）');
  /* max|d_wt| 无引擎指标 id（golden scalars 面极值已由 §1 deriveScalars 遍历承载）——
     此处按同口径（严格 > 取首点）在序列上直取 */
  (function bPeak() {
    let maxAbs = 0;
    let tAt = trackRuns.pitch_stuck_closed_loop.timeseries.t[0];
    const t = trackRuns.pitch_stuck_closed_loop.timeseries.t;
    sig('pitch_stuck_closed_loop').d_wt_kW.forEach((v, i) => {
      if (Math.abs(v) > maxAbs) { maxAbs = Math.abs(v); tAt = t[i]; }
    });
    close(maxAbs, 6.526221, specP, 'B：max|d_wt|=6.526221 kW（单调衰减无超调，Pmin=P(60)）');
    eq(tAt, 60, 'B：max|d_wt| 出现在 t=60.0（无超调）');
  })();
  eq(sig('pitch_stuck_closed_loop').beta_cmd_deg[600], 0, 'B：β_cmd(60)=0（卡涩冻结指令面——β 钉扎与指令无关）');
  close(met('pitch_stuck_closed_loop', 'E_wt_err_kWh'), 0.065682, specE, 'B：ΔE_wt=+0.065682 kWh（估计偏多：卡涩使真实出力掉、估计不变）');

  /* 场景 C：gust_step 闭环（Δv=+2.0，v 9→11 跨额定区）§3.3 */
  close(sig('gust_closed_loop').P_wt_true_kW[600], 15.0, specP, 'C：P_wt_true(60)=15.000000 kW（额定封顶 P_rated 支路绑定）');
  close(sig('gust_closed_loop').P_wt_true_kW[210], 10.676732, specT, 'C：P_wt(21.0)=10.676732（动目标段，oracle emit 冻结）');
  close(sig('gust_closed_loop').P_wt_true_kW[260], 14.935791, specT, 'C：P_wt(26.0)=14.935791');
  close(sig('gust_closed_loop').n_rotor_rpm[600], 212.304228, specN, 'C：n(60)=212.304228 rpm（解析二分平衡 ω_eq=22.232447 rad/s）');
  close(sig('gust_closed_loop').beta_pitch_deg[600], 1.733766, specB, 'C：β(60)=1.733766°（桨距吸收，β_eq 二分一致）');
  close(sig('gust_closed_loop').lambda_tip[600], 7.788912, specLC, 'C：λ(60)=7.788912（额定区运行点）');
  close(sig('gust_closed_loop').cp_coeff[600], 0.394360, specLC, 'C：cp(60)=0.394360');
  close(sig('gust_closed_loop').d_wt_kW[600], -3.257888, specP, 'C：d_wt(60)=−3.257888 kW（15−k_v·11³/1000 封顶工况合法残差）');
  close(sig('gust_closed_loop').d_wt_kW[200], -8.257888, specP, 'C：d_wt(20.0⁺)=−8.257888 kW（估计按瞬时跳变、真实滞后爬升）');
  close(met('gust_closed_loop', 'E_wt_err_kWh'), 0.039462, specE, 'C：ΔE_wt=+0.039462 kWh（估计偏多）');

  /* 判别性恒等：r_true ≡ 0、r_meas ≡ 0（全部 5 Run × 601 点，≤1e-12；§3.3 WS-4——
     与 FL-001 的 r_meas = 0.4·b 形成教学对照；golden 序列含 ±3.55e-15 复算尘点，
     引擎侧为定义式逐点精确 0） */
  ['healthy', 'closed_loop_fault', 'monitor_only', 'pitch_stuck_closed_loop', 'gust_closed_loop'].forEach((k) => {
    let maxRt = 0;
    let maxRm = 0;
    sig(k).r_true_kW.forEach((v) => { if (Math.abs(v) > maxRt) maxRt = Math.abs(v); });
    sig(k).r_meas_kW.forEach((v) => { if (Math.abs(v) > maxRm) maxRm = Math.abs(v); });
    ok(maxRt <= specR && maxRm <= specR, k + '：r_true/r_meas 逐点 ≡ 0（≤1e-12 kW，WS-4）',
      'max|r_true|=' + maxRt + ' max|r_meas|=' + maxRm);
  });
})();

/* ================================================================== */
/* 3. gust 闭环 vs 仅监测逐位等价（物理输入，与控制模式无关；§3.3/WS-7）  */
/* ================================================================== */
(function gustEquivalence() {
  const mkCfg = (mode) => FL.core.createConfig('WT-001', {
    fault: { family: 'gust_step', params: { magnitude: 2 }, t_start_s: 20 },
    feedback_mode: mode
  });
  const cl = FL.registry.createRun({ config: mkCfg('closed_loop'), runId: 'WT-GUST-CL' });
  const mo = FL.registry.createRun({ config: mkCfg('monitor'), runId: 'WT-GUST-MO' });

  /* 排除是承重面：label/role/effective_mode 由反馈模式派生，本就不同 */
  ok(cl.label !== mo.label, 'gust 两模式 label 不同（闭环/仅监测，排除项为承重面）', cl.label + ' vs ' + mo.label);
  ok(cl.role !== mo.role, 'gust 两模式 role 不同（fault/contrast）', cl.role + ' vs ' + mo.role);
  eq(cl.truth.effectiveFeedbackMode, 'closed_loop', 'gust 闭环 truth 模式');
  eq(mo.truth.effectiveFeedbackMode, 'monitor', 'gust 仅监测 truth 模式');

  /* t + 22 信号全序列逐位（===）一致——monitor 分支只对 sensor_drift 切换控制面，
     gust 物理输入与反馈模式无关（§3.3「两模式逐位同解」复算实证面） */
  eq(JSON.stringify(cl.timeseries.t), JSON.stringify(mo.timeseries.t), 'gust 两模式 t 序列逐位一致');
  const sigIds = Object.keys(cl.timeseries.signals);
  eq(sigIds.length, 22, 'WT 信号面 22 项（§1.2 信号表）');
  let sigDiff = '';
  sigIds.forEach((sid) => {
    if (JSON.stringify(cl.timeseries.signals[sid]) !== JSON.stringify(mo.timeseries.signals[sid])) {
      sigDiff += (sigDiff ? ',' : '') + sid;
    }
  });
  eq(sigDiff, '', 'gust 两模式 22 信号全序列逐位一致（WS-7 面）', sigDiff);

  /* 事件与快照逐位一致（物理输入在两模式同生效） */
  eq(JSON.stringify(cl.events), JSON.stringify(mo.events), 'gust 两模式 events 逐位一致');
  eq(JSON.stringify(cl.snapshots), JSON.stringify(mo.snapshots), 'gust 两模式 snapshots 逐位一致');

  /* metrics：id 序一致；除 effective_mode 外逐位一致 */
  eq(cl.metrics.length, mo.metrics.length, 'gust 两模式 metrics 数量一致');
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
  eq(metDiff, '', 'gust 两模式 metrics 逐位一致（排除 effective_mode）', metDiff);
})();

/* ================================================================== */
/* 4. WT 轨区分守卫（R-7）+ WT quality 绿面                              */
/* ================================================================== */
(function dispatchGuard() {
  const wtRun = trackRuns.closed_loop_fault;

  /* WT 分派生效的元数据面：scope / 模型版本 / run_hash 可重算 */
  eq(wtRun.manifest.scope, 'extension_preview', 'WT Run scope=extension_preview（规格 §2.4/§5）');
  eq(wtRun.modelManifest.model_version, '1.0.0', 'WT model_version=1.0.0');
  eq(FL.registry.verifyRunHash(wtRun), true, 'WT run_hash 可重算');

  /* WT 信号面：P_wt 信号在场（WT 物理量纲），GT 专属信号不在场——
     若分派链 WT 分支被绕过（静默落入 else→GT001 兜底），信号面直接缺失/换轨 */
  ok(!!wtRun.timeseries.signals.P_wt_true_kW && wtRun.timeseries.signals.P_wt_true_kW.length === 601,
    'P_wt_true_kW 在场（601 点，WT 信号面）');
  const gtOnly = ['f_true_Hz', 'n_meas_rpm', 'P_gen_true_kW', 'f_channel_diff_Hz', 'T3_out_K'];
  const leaked = gtOnly.filter((sid) => wtRun.timeseries.signals[sid] !== undefined);
  eq(leaked.length, 0, 'WT Run 无 GT 专属信号（分派未落入 GT 兜底物理）', leaked.join(','));

  /* WT 锚点在 P_wt 通道上成立（healthy P_wt(60)=10.000000 即守卫——GT 物理给出不同值）：
     R-7 守卫的数值面——engine.js simulate 分派链显式 WT 分支置于 else→GT001 兜底之前 */
  eq(trackRuns.healthy.timeseries.signals.P_wt_true_kW[600], 10,
    'WT healthy P_wt(60)=10.000000 kW（GT 兜底物理不会给出该值——分派守卫数值面）');
  close(wtRun.timeseries.signals.P_wt_true_kW[600], 7.023320, 0.05,
    'WT A 场景 P_wt(60)=7.023320 kW（WT 锚点，非 GT 轨数值面）');

  /* WT quality 绿面：conservation-true/conservation-meas（r_true/r_meas ≡ 0，EQ-WT-8，
     通用 else 面 tolTrue 1e-12 kW 与 WS-4 对齐）+ wt-energy-identity（E_wt + E_grid =
     E_load，≤1e-9 kWh = wt001_v1 gate T-A E_kWh）+ event-window；
     soc-bounds/energy-balance 不派发（bounds 无 SOC_pct/E_bat 键——WT 无储能，§1.1）；
     units/sampling 为并发落地面（见头注），本测试不断言。 */
  ['healthy', 'closed_loop_fault', 'monitor_only', 'pitch_stuck_closed_loop', 'gust_closed_loop'].forEach((k) => {
    const q = {};
    trackRuns[k].quality.forEach((c) => { q[c.check_id] = c.status; });
    ['conservation-true', 'conservation-meas', 'wt-energy-identity', 'event-window'].forEach((id) => {
      eq(q[id], 'pass', k + '：quality ' + id + '=pass');
    });
    eq(q['soc-bounds'], undefined, k + '：quality soc-bounds 不派发（WT bounds 无 SOC_pct 键，§1.1）');
    eq(q['energy-balance'], undefined, k + '：quality energy-balance 不派发（WT 无储能键面）');
  });
  /* wt-energy-identity 残差面：|E_wt_true + E_grid − E_load| ≤1e-9 kWh（5 Run 全场） */
  ['healthy', 'closed_loop_fault', 'monitor_only', 'pitch_stuck_closed_loop', 'gust_closed_loop'].forEach((k) => {
    const pc = trackRuns[k].quality.find((c) => c.check_id === 'wt-energy-identity');
    ok(!!pc && typeof pc.observed === 'number' && pc.observed <= 1e-9,
      k + '：wt-energy-identity 残差 ≤1e-9 kWh（gate T-A E_kWh）', String(pc && pc.observed));
  });
})();

/* ---------- 汇总 ---------- */
console.log('\n== WT-001 引擎 ↔ golden 一致性（wt001_v1 5 Run，gate T-A） ==');
if (fail) {
  console.log('FAIL ' + fail + ' / PASS ' + pass);
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('PASS ' + pass + ' / FAIL 0 ✓（5 Run 全序列/scalars + A/A\'/B/C 锚点 + 健康局恒等 + r≡0 + gust 逐位等价 + R-7 分派守卫 + quality 绿面）');
