/* owner: core-engine | module: tests/engine | contract: NEXT/MODEL_VALIDATION_SPEC.md
   G2 四件套①数值脚本的产品侧（I-04 / P0a-05）：引擎输出对独立解析 golden
   data/golden/fl001_v1.json 逐点比对 + PHY-01/01b/02/03/04/05 + SA-04…07/17/18/20/24/25。
   golden 由 tools/oracle/ 生成（engine 只读比对，不写 golden）。
   Run 键面按 golden.runs 遍历（fl001_v1 3→4 Run：+actuator_closed_loop，FLEXT_G2B_SPEC_APPROVED
   v1.1 §2 项 1 / V060_WAVE_DESIGN W2-2 测试面），并落 actuator 闭环 vs monitor 逐位等价断言。
   §13–19（FLCAP-G2b-04 / CHG-20261114-01，V140 波 W4 追加节，既有 §0–§12 断言零改动）：
   FL capacity on 轨四轨引擎 ↔ fl001_v3 golden（gate T-B 分派容差全序列/23 标量/11 指标/事件）
   + A-2 healthy 位级锚点 + load0=45 角点锚点（§3.2/§3.3 批准值）+ 三元路由两门禁面②
   + off/(on,off) 逐位不变量 + R-10 容量分派守卫 + capacity_model 校验负例。
   运行：node tests/engine.test.js；失败非零退出。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { bootstrap } = require('./core-load');
const FL = bootstrap();
const core = FL.core;

const GOLDEN_PATH = path.join(__dirname, '..', 'data', 'golden', 'fl001_v1.json');
const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));

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
    'expected ' + b + ' ±' + tol + '，actual ' + a + (typeof a === 'number' ? '（diff ' + (a - b).toExponential(2) + '）' : ''));
}
function closeRel(a, b, rtol, atol, name) {
  const good = typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= Math.max(atol, rtol * Math.abs(b));
  ok(good, name, 'expected ' + b + '（rtol ' + rtol + '），actual ' + a + '，diff ' + (typeof a === 'number' ? (a - b).toExponential(2) : a));
}
function metricOf(run, id) { return core.getMetric(run, id); }

/* Run 键面按 golden.runs 遍历（消除硬编码）：每个 golden Run 的配置由其元数据派生。
   oracle 参数名（bias_A / magnitude_kW / magnitude_pct）→ 引擎统一参数 magnitude。 */
function magnitudeOfGoldenFault(gFault) {
  if (gFault.bias_A != null) return gFault.bias_A;
  if (gFault.magnitude_kW != null) return gFault.magnitude_kW;
  return gFault.magnitude_pct;
}
function configForGoldenRun(g, feedbackModeOverride) {
  const mode = feedbackModeOverride || g.feedback_mode;
  return g.fault
    ? core.createConfig('FL-001', {
      feedback_mode: mode,
      fault: { family: g.fault.family, faultId: g.fault.fault_id, t_start_s: g.fault.t_start_s, params: { magnitude: magnitudeOfGoldenFault(g.fault) } }
    })
    : core.createConfig('FL-001', { feedback_mode: mode, fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } });
}
const CONFIGS = {};
Object.keys(golden.runs).forEach((key) => {
  CONFIGS[key] = configForGoldenRun(golden.runs[key]);
});
const RUNS = {};
Object.keys(CONFIGS).forEach((key) => {
  RUNS[key] = core.simulate(CONFIGS[key], { runId: 'GOLDEN-' + key });
});

/* ------------------------------------------------------------------ *
 * 1. SA-26 / T-01：全部 golden Run（4 个）601 点逐点对 golden
 * ------------------------------------------------------------------ */
const TOL = golden.tolerances.gate;
const SERIES_TOL = {
  t: { abs: TOL.t_s },
  I_bat_true_A: { rel: TOL.I_A_rtol, abs: TOL.I_A_atol },
  I_bat_meas_A: { rel: TOL.I_A_rtol, abs: TOL.I_A_atol },
  bias_A: { rel: TOL.I_A_rtol, abs: TOL.I_A_atol },
  I_bat_cap_A: { rel: TOL.I_A_rtol, abs: TOL.I_A_atol },
  P_bat_true_kW: { rel: TOL.P_kW_rtol, abs: TOL.P_kW_atol },
  P_bat_meas_kW: { rel: TOL.P_kW_rtol, abs: TOL.P_kW_atol },
  P_gen_true_kW: { rel: TOL.P_kW_rtol, abs: TOL.P_kW_atol },
  P_load_demand_kW: { rel: TOL.P_kW_rtol, abs: TOL.P_kW_atol },
  P_load_served_kW: { rel: TOL.P_kW_rtol, abs: TOL.P_kW_atol },
  SOC_true_pct: { abs: TOL.SOC_pp },
  SOC_est_pct: { abs: TOL.SOC_pp },
  r_true_kW: { abs: TOL.r_true_kW },
  r_meas_kW: { abs: TOL.r_meas_kW_atol }
};

Object.keys(RUNS).forEach((key) => {
  const run = RUNS[key];
  const g = golden.runs[key];
  eq(run.timeseries.t.length, golden.sampling.n, key + '：601 点（SA-01）');
  Object.keys(SERIES_TOL).forEach((sid) => {
    const tol = SERIES_TOL[sid];
    const a = sid === 't' ? run.timeseries.t : run.timeseries.signals[sid];
    const b = g.series[sid];
    ok(Array.isArray(a) && Array.isArray(b) && a.length === b.length, key + ' 序列长度一致：' + sid);
    let worst = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === null || b[i] === null) {
        /* 空值严格一致（I_bat_cap_A 前置窗=null；禁止 null→0 隐式 coerce 掩盖不一致） */
        if (a[i] !== b[i]) {
          failures.push({ name: key + ' ' + sid + '@' + i, detail: 'null 不一致：engine=' + a[i] + ' golden=' + b[i] });
          fail++;
          return;
        }
        continue;
      }
      const d = Math.abs(a[i] - b[i]);
      if (d > worst) worst = d;
      const lim = tol.abs != null && tol.rel != null ? Math.max(tol.abs, tol.rel * Math.abs(b[i]))
        : tol.abs != null ? tol.abs : tol.rel * Math.abs(b[i]);
      if (!(d <= lim)) {
        failures.push({ name: key + ' ' + sid + '@' + i, detail: 'diff ' + d + ' > ' + lim });
        fail++;
        return;
      }
    }
    pass++;
    ok(true, key + ' 601 点逐点匹配 golden：' + sid + '（max diff ' + worst.toExponential(2) + '）');
  });
  /* off 轨热信号两列全程 null（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §3.3 项 3：makeSeries
     按 SystemDef.signals 建列、null 初始化维持——thermal off 轨无热力面，GT 热信号先例；
     L4 信号目录 +2 的序列面结构断言，并入步 1）。 */
  ['T_bat_K', 'P_loss_kW'].forEach((tid) => {
    const col = run.timeseries.signals[tid];
    ok(Array.isArray(col) && col.length === golden.sampling.n && col.every((v) => v === null),
      key + '：off 轨 ' + tid + ' 全列 null（' + golden.sampling.n + ' 点，thermal off 结构缺席）');
  });
});

/* ------------------------------------------------------------------ *
 * 1b. FL thermal on 四轨引擎 ↔ fl001_v2 golden（gate T-B）——并入步 1
 *     （ALINE §2 步数纪律；FLTH-G2b-03/04，CHG-20261107-01）。golden 由
 *     tools/oracle/fl001_l1_oracle.py 发射（engine 只读比对，不写 golden）；
 *     比对按 golden.series 键集迭代，引擎侧额外列（I_ref_A/P_gen_meas_kW/V_bus_V）
 *     不进比对（engine-pv 体例）。四轨 = healthy/closed_loop_fault/monitor_only/
 *     actuator_closed_loop，全部 thermal_model=on。
 * ------------------------------------------------------------------ */
const GOLDEN2_PATH = path.join(__dirname, '..', 'data', 'golden', 'fl001_v2.json');
const golden2 = JSON.parse(fs.readFileSync(GOLDEN2_PATH, 'utf8'));
const TOL2 = golden2.tolerances.gate;
eq(golden2.golden_id, 'fl001_v2', 'fl001_v2：golden id');
eq(TOL2.tier, 'T-B', 'fl001_v2：gate tier=T-B（FL 规格 §4 项 6，同法 RK4 独立双实现）');
eq(golden2.method_id, 'fl001_thermal_rk4_dt0.01', 'fl001_v2：method_id（RK4 dt=0.01 数值轨）');
eq(golden2.model_version, '1.1.0', 'fl001_v2：model_version=1.1.0（B-1 三段式 v2 归一样式）');
eq(golden2.thermal_model, 'on', 'fl001_v2：thermal_model=on（cfg 键入 config 块，gt001_v3 先例）');
ok(String(golden2.supersedes).indexOf('fl001_v1') === 0,
  'fl001_v2：supersedes=fl001_v1（off 轨字节冻结留档，存档场次继续引用 v1）');
ok(typeof golden2.approval.approved_golden_sha256 === 'string' && golden2.approval.approved_golden_sha256.length === 64,
  'fl001_v2：approval 已回填（approved_golden_sha256 64 hex）');

const RUNS2_CFG = {
  healthy: { fault: { family: 'none' }, feedback_mode: 'closed_loop' },
  closed_loop_fault: { fault: { family: 'sensor_drift' }, feedback_mode: 'closed_loop' },
  monitor_only: { fault: { family: 'sensor_drift' }, feedback_mode: 'monitor' },
  actuator_closed_loop: { fault: { family: 'actuator_fault' }, feedback_mode: 'closed_loop' }
};
const RUNS2 = {};
Object.keys(golden2.runs).forEach((key) => {
  const cfg2 = core.createConfig('FL-001', Object.assign({ thermal_model: 'on' },
    JSON.parse(JSON.stringify(RUNS2_CFG[key]))));
  RUNS2[key] = core.simulate(cfg2, { runId: 'GOLDEN2-' + key });
});

/* gate T-B 容差分类映射（序列；scripts/verify_golden.py series_limit T-B 分支同构：
   _A→I、_K→T、r_true/r_meas 专键、SOC→pp、其余 kW 类按点幅值） */
function seriesLimit2(sid, gref) {
  if (sid === 't') return TOL2.t_s;
  if (sid === 'T_bat_K') return TOL2.T_K_atol;
  if (sid === 'r_true_kW') return TOL2.r_true_kW;
  if (sid === 'r_meas_kW') return TOL2.r_meas_kW_atol;
  if (sid.slice(-2) === '_A') return Math.max(TOL2.I_A_atol, TOL2.I_A_rtol * Math.max(1, Math.abs(gref)));
  if (sid.indexOf('SOC') === 0 || sid.slice(-4) === '_pct') return TOL2.SOC_pp;
  return Math.max(TOL2.P_kW_atol, TOL2.P_kW_rtol * Math.max(1, Math.abs(gref)));
}
/* gate T-B 容差分类映射（scalars）：kWh→E、K→T、A·s 由 SOC 账本恒等派生（×3600 同测度）、
   A→I、kW→P、r 专键；t→t_s（L8 注册「kWh 5 项走 E_kWh，其余走 SOC_pp」同域口径的
   量纲化细化） */
function scalarLimit2(key, gval) {
  if (key.indexOf('_kWh') !== -1) return TOL2.E_kWh;
  if (key === 'T_bat_end_K') return TOL2.T_K_atol;
  if (key === 't_19p9_s') return TOL2.t_s;
  if (key === 'max_abs_r_true_kW') return TOL2.r_true_kW;
  if (key === 'max_abs_r_meas_kW') return TOL2.r_meas_kW_atol;
  if (key.indexOf('int_') === 0) return TOL2.SOC_pp * 3600;
  if (key.indexOf('SOC') !== -1 || key.indexOf('_pp') !== -1) return TOL2.SOC_pp;
  if (key.slice(-2) === '_A') return Math.max(TOL2.I_A_atol, TOL2.I_A_rtol * Math.max(1, Math.abs(gval)));
  return Math.max(TOL2.P_kW_atol, TOL2.P_kW_rtol * Math.abs(gval));
}

let thermalTSpread = 0; /* 引擎↔oracle T_bat 序列散差（四轨最大；见汇总行裕度证据） */

Object.keys(RUNS2).forEach((key) => {
  const run2 = RUNS2[key];
  const g2 = golden2.runs[key];
  const n2 = golden2.sampling.n;
  eq(run2.timeseries.t.length, n2, key + '（thermal on）：601 点');
  eq(run2.config.thermal_model, golden2.config.thermal_model, key + '（thermal on）：config.thermal_model 与 golden 同轨');

  /* 全序列逐点（golden 16 序列键集；null 严格一致——I_bat_cap_A 前置窗禁止 null→0 coerce） */
  let over2 = 0;
  let worst2 = 0;
  const missing2 = [];
  Object.keys(g2.series).forEach((sid) => {
    const mine = sid === 't' ? run2.timeseries.t : run2.timeseries.signals[sid];
    if (!mine || mine.length !== n2) { missing2.push(sid); return; }
    if (sid === 'T_bat_K') {
      for (let i = 0; i < n2; i++) thermalTSpread = Math.max(thermalTSpread, Math.abs(g2.series[sid][i] - mine[i]));
    }
    for (let i = 0; i < n2; i++) {
      const gv = g2.series[sid][i];
      const av = mine[i];
      if (gv === null || av === null) {
        if (gv !== av) {
          failures.push({ name: key + '（thermal on）' + sid + '@' + i, detail: 'null 不一致：engine=' + av + ' golden=' + gv });
          fail++;
          return;
        }
        continue;
      }
      const d = Math.abs(gv - av);
      if (d > worst2) worst2 = d;
      if (d > seriesLimit2(sid, gv)) over2++;
    }
  });
  eq(missing2.length, 0, key + '（thermal on）：golden ' + Object.keys(g2.series).length +
    ' 序列在引擎中齐备（含 t 列）', missing2.join(','));
  ok(over2 === 0, key + '（thermal on）：序列逐点 ≤ gate T-B 容差（超差 0 点；最大绝对偏差 ' +
    worst2.toExponential(2) + '）');

  /* scalars 全量（22 项）：引擎复算 vs golden。E_bat_meas/int_I 无独立引擎指标——
     由 SOC 账本恒等派生（∫I、∫b 与 SOC 同一积分内核，EQ-FLTH-7：SOC=SOC0−100·∫P_bat/(40·3600)，
     V=0.4 kW/A ⇒ E_bat_meas = E_bat_true + 0.4·(SOC_true_end−SOC_est_end)、
     int_I = (SOC0−SOC_true_end)·3600 A·s）；healthy 的 I_meas_20post 沿 fl001_v1 §3b 先例
     取序列值（golden 亦为序列推导值，engine 对 family=none 记不可用 null）。 */
  const sig2 = run2.timeseries.signals;
  const met2 = {};
  run2.metrics.forEach((m) => { met2[m.metric_id] = m.value; });
  const socT2 = met2.SOC_true_end_pct;
  const socE2 = met2.SOC_est_end_pct;
  const soc02 = run2.config.initial.SOC_pct;
  const D2 = {
    E_bat_true_kWh: met2.E_bat_true_60s,
    E_bat_meas_kWh: met2.E_bat_true_60s + 0.4 * (socT2 - socE2),
    E_gen_true_kWh: met2.E_gen_true_60s,
    E_load_served_kWh: met2.E_load_served_60s,
    E_loss_kWh: met2.E_loss_kWh,
    SOC_true_end_pct: socT2,
    SOC_est_end_pct: socE2,
    SOC_err_end_pp: met2.SOC_err_end_pp,
    I_true_19p9_A: sig2.I_bat_true_A[199],
    I_meas_19p9_A: sig2.I_bat_meas_A[199],
    t_19p9_s: run2.timeseries.t[199],
    I_true_20post_A: sig2.I_bat_true_A[200],
    I_meas_20post_A: key === 'healthy' ? sig2.I_bat_meas_A[200] : met2.I_meas_20post_A,
    I_true_21p5_A: sig2.I_bat_true_A[215],
    I_true_26_A: sig2.I_bat_true_A[260],
    I_true_60_A: sig2.I_bat_true_A[600],
    P_bat_true_21p5_kW: sig2.P_bat_true_kW[215],
    P_gen_true_21p5_kW: sig2.P_gen_true_kW[215],
    max_abs_r_true_kW: met2.max_abs_r_true_kW,
    max_abs_r_meas_kW: met2.max_abs_r_meas_kW,
    int_I_true_60s_As: (soc02 - socT2) * 3600,
    T_bat_end_K: met2.T_bat_end_K
  };
  const S2 = g2.scalars;
  const badS2 = [];
  Object.keys(S2).forEach((k) => {
    if (!(k in D2)) { badS2.push(k + ' 未复算'); return; }
    const d = Math.abs(D2[k] - S2[k]);
    if (!(d <= scalarLimit2(k, S2[k]))) badS2.push(k + ' ' + D2[k] + ' vs ' + S2[k]);
  });
  eq(Object.keys(S2).length, 22, key + '（thermal on）：golden scalars 面 22 项');
  eq(badS2.length, 0, key + '（thermal on）：scalars 全量对 golden（gate T-B 分类容差）', badS2.join(' | '));

  /* golden metrics 块（11 项镜像面）对引擎指标；healthy 跳过 I_meas_20post_A
     （fl001_v1 §3b 同款：引擎 family=none 记不可用 null，golden 记序列推导值 25——
     既有可用性语义不动，healthy 已由序列逐点 + scalars 面覆盖） */
  const gmBad2 = [];
  Object.keys(g2.metrics).forEach((mid) => {
    if (key === 'healthy' && mid === 'I_meas_20post_A') return;
    const em = run2.metrics.filter((x) => x.metric_id === mid)[0];
    if (!em) { gmBad2.push(mid + ' 缺'); return; }
    const gv2 = g2.metrics[mid].value;
    if (gv2 === null || em.value === null) { if (em.value !== gv2) gmBad2.push(mid + ' null 不一致'); return; }
    const lim = mid.indexOf('kWh') !== -1 ? TOL2.E_kWh
      : mid === 'max_abs_r_meas_kW' ? TOL2.r_meas_kW_atol
      : mid === 'max_abs_r_true_kW' ? TOL2.r_true_kW
      : mid.indexOf('SOC') !== -1 || mid.indexOf('_pp') !== -1 ? TOL2.SOC_pp
      : Math.max(TOL2.I_A_atol, TOL2.I_A_rtol * Math.max(1, Math.abs(gv2))); /* focal_change_A / I 类 → I 口径 */
    if (!(Math.abs(em.value - gv2) <= lim)) gmBad2.push(mid);
  });
  eq(gmBad2.length, 0, key + '（thermal on）：golden metrics 块（11 项镜像面）对引擎指标', gmBad2.join(','));

  /* thermal on 专属指标在场（metrics.js cfg.thermal_model==='on' 分支；off 轨不产生） */
  ok(met2.E_loss_kWh !== undefined && met2.T_bat_end_K !== undefined,
    key + '（thermal on）：E_loss_kWh/T_bat_end_K 指标在场');

  /* 事件面（故障局）：1 事件 + pre/post 快照相位值对 golden 变量集逐位一致
     （golden 变量集 = L0 最小集 §3.6；引擎侧快照变量随信号目录机械增长，
     golden 未钉的额外键不进比对——engine-pv 体例） */
  if ((g2.events || []).length) {
    eq(run2.events.length, 1, key + '（thermal on）：1 事件');
    const ge2 = g2.events[0];
    const fe2 = run2.events[0];
    eq(fe2.trigger_s, ge2.trigger_s, key + '（thermal on）：事件时刻 20 s');
    eq(fe2.event_type, ge2.event_type, key + '（thermal on）：event_type');
    eq(fe2.faultId, ge2.fault_id, key + '（thermal on）：faultId 与 golden 同源（目录 id）');
    const fp2 = run2.snapshots.find((x) => x.snapshot_id === fe2.preSnapshotId);
    const fq2 = run2.snapshots.find((x) => x.snapshot_id === fe2.postSnapshotId);
    ok(!!fp2 && !!fq2, key + '（thermal on）：pre/post 快照经引用可达');
    const preBad2 = [];
    const postBad2 = [];
    Object.keys(ge2.snapshots[0].variables).forEach((vid) => {
      if (fp2.variables[vid] !== ge2.snapshots[0].variables[vid]) preBad2.push(vid);
      if (fq2.variables[vid] !== ge2.snapshots[1].variables[vid]) postBad2.push(vid);
    });
    eq(preBad2.length + postBad2.length, 0, key + '（thermal on）：pre/post 快照相位值与 golden 逐位一致',
      preBad2.concat(postBad2).join(','));
  } else {
    eq(run2.events.length, 0, key + '（thermal on）：健康局无事件');
  }
});

/* FL-6 监控轨热面恒等（oracle self-check FL-6 同构判据落引擎层，FL 规格 §3.2 行 5）：
   monitor T_bat ≡ healthy T_bat、P_loss ≡ healthy P_loss（601 点逐位 —— 偏置不进入
   物理回路的结构判据；I ≡ 25 A 同热轨 ⇒ P_loss 亦恒等） */
(function monitorThermalIdentity() {
  const mon = RUNS2.monitor_only.timeseries.signals;
  const base = RUNS2.healthy.timeseries.signals;
  let tBreak = -1;
  let pBreak = -1;
  for (let i = 0; i < RUNS2.monitor_only.timeseries.t.length; i++) {
    if (tBreak === -1 && mon.T_bat_K[i] !== base.T_bat_K[i]) tBreak = i;
    if (pBreak === -1 && mon.P_loss_kW[i] !== base.P_loss_kW[i]) pBreak = i;
  }
  eq(tBreak, -1, 'FL-6：monitor T_bat ≡ healthy T_bat（601 点逐位，热面恒等结构判据）', '首个破坏点 @' + tBreak);
  eq(pBreak, -1, 'FL-6：monitor P_loss ≡ healthy P_loss（601 点逐位，I≡25 同热轨）', '首个破坏点 @' + pBreak);
})();

/* 2. §3.2 关键点（SA-04/05/06/10 + 19.9/pre/post） */
const cl = RUNS.closed_loop_fault;
const gcl = golden.runs.closed_loop_fault;
function at(run, sig, t) { return core.sampleAt(run, sig, t).value; }
close(at(cl, 'I_bat_true_A', 21.5), gcl.scalars.I_true_21p5_A, 1e-9, 'SA-04：I_true(21.5)=18.678794411714424 A（±1e-9）');
close(at(cl, 'I_bat_true_A', 26), gcl.scalars.I_true_26_A, 1e-9, 'SA-05：I_true(26)=15.183156388887342 A');
close(at(cl, 'I_bat_meas_A', 26), 25.18315638888734, 1e-9, 'SA-05：I_meas(26)=25.18315638888734 A');
close(at(cl, 'I_bat_true_A', 60), gcl.scalars.I_true_60_A, 1e-9, 'SA-06：I_true(60)=15.000000000026231 A（不是精确 15）');
ok(Math.abs(at(cl, 'I_bat_true_A', 60) - 15) <= 1e-9, 'PHY-04：|I_true(60)−15| ≤1e-9 A');
close(at(cl, 'P_bat_true_kW', 21.5), 7.47151776468577, 1e-9, 'SA-10：P_bat(21.5)=7.47151776468577 kW');
close(at(cl, 'P_gen_true_kW', 21.5), 22.52848223531423, 1e-9, 'SA-10：P_gen(21.5)=22.52848223531423 kW');
close(at(cl, 'I_bat_meas_A', 19.9), 25, 1e-12, 'SA-02：19.9 s I_meas=25 A');
close(at(cl, 'I_bat_meas_A', 20), 35, 1e-12, 'SA-03：20.0 s post I_meas=35 A');

/* 3. 标量（T-04/T-05 / SA-11…16 / PHY-06/07 gate 容差） */
close(metricOf(cl, 'E_bat_true_60s').value, gcl.scalars.E_bat_true_kWh, TOL.E_kWh, 'SA-11：E_bat=446/3600 kWh（±1e-6）');
close(metricOf(cl, 'E_gen_true_60s').value, gcl.scalars.E_gen_true_kWh, TOL.E_kWh, 'SA-12：E_gen=1354/3600 kWh（±1e-6）');
close(metricOf(cl, 'E_load_served_60s').value, 0.5, 1e-9, 'SA-13：E_load=0.5 kWh');
close(metricOf(cl, 'SOC_true_end_pct').value, gcl.scalars.SOC_true_end_pct, TOL.SOC_pp, 'SA-14：SOC_true(60)=59.69027777777779 %');
close(metricOf(cl, 'SOC_est_end_pct').value, gcl.scalars.SOC_est_end_pct, TOL.SOC_pp, 'SA-15：SOC_est(60)=59.57916666666668 %');
close(metricOf(cl, 'SOC_err_end_pp').value, gcl.scalars.SOC_err_end_pp, TOL.SOC_pp, 'SA-16：闭环 SOC_err=−0.11111111111110716 pp');
eq(metricOf(cl, 'SOC_err_end_pp').unit, 'pp', 'SOC_err 单位=pp（不得写成 %）');
const mo = RUNS.monitor_only;
close(metricOf(mo, 'SOC_est_end_pct').value, 59.47222222222222, TOL.SOC_pp, 'SA-15：monitor SOC_est(60)=59.47222222222222 %');
close(metricOf(mo, 'SOC_err_end_pp').value, golden.runs.monitor_only.scalars.SOC_err_end_pp, TOL.SOC_pp, 'SA-16：monitor SOC_err');
close(metricOf(RUNS.healthy, 'E_bat_true_60s').value, golden.runs.healthy.scalars.E_bat_true_kWh, TOL.E_kWh, 'SA-17：基准 E_bat=0.16666666666666666 kWh');
close(metricOf(RUNS.healthy, 'SOC_true_end_pct').value, 59.583333333333336, TOL.SOC_pp, 'SA-17：基准 SOC_true=59.583333333333336 %');

/* 3b. 全故障 Run 指标对 golden（按 golden.runs[key].metrics 遍历；W2-2 actuator Run 数值锁定）。
   healthy 跳过：引擎对 family=none 将 I_meas_20post_A 记为不可用（src/core/metrics.js
   `faulted ? valueAt(...) : null`），golden 记录序列推导值 25——既有可用性语义不动，
   healthy 已由 §1 全序列逐点 + SA-17 标量覆盖。 */
['closed_loop_fault', 'monitor_only', 'actuator_closed_loop'].forEach((key) => {
  const run = RUNS[key];
  const gm = golden.runs[key].metrics;
  Object.keys(gm).forEach((mid) => {
    const em = run.metrics.filter((x) => x.metric_id === mid)[0];
    ok(em, key + ' 引擎指标在场：' + mid, 'engine 未产生 metric_id ' + mid);
    if (!em) return;
    const gv = gm[mid].value;
    if (gv === null || em.value === null) { eq(em.value, gv, key + ' 指标 null 一致：' + mid); return; }
    if (typeof gv !== 'number') { eq(em.value, gv, key + ' 指标一致：' + mid); return; }
    const isSoc = mid.indexOf('SOC') !== -1 || mid.indexOf('_pp') !== -1;
    const lim = mid.indexOf('kWh') !== -1 ? TOL.E_kWh
      : mid === 'max_abs_r_meas_kW' ? TOL.r_meas_kW_atol
      : mid === 'max_abs_r_true_kW' ? TOL.r_true_kW
      : isSoc ? TOL.SOC_pp
      : Math.max(TOL.I_A_atol, TOL.I_A_rtol * Math.max(1, Math.abs(gv))); /* focal_change_A / I 类 → I 口径 */
    close(em.value, gv, lim, key + ' 指标对 golden：' + mid);
  });
});

/* 4. PHY-01 定义自洽 + PHY-01b ODE 残差（SA-25） */
let maxRt = 0;
for (let i = 0; i < 601; i++) maxRt = Math.max(maxRt, Math.abs(cl.timeseries.signals.r_true_kW[i]));
ok(maxRt <= 1e-12, 'PHY-01：max|r_true| ≤1e-12 kW（定义自洽，非物理验证）', String(maxRt));
let worstOde = 0;
for (let i = 0; i < 601; i++) {
  const t = cl.timeseries.t[i];
  const I = cl.timeseries.signals.I_bat_true_A[i];
  const b = t >= 20 ? 10 : 0;
  const dI = t < 20 ? 0 : -(10 / 1.5) * Math.exp(-(t - 20) / 1.5);
  worstOde = Math.max(worstOde, Math.abs(1.5 * dI + I - (25 - b)));
}
ok(worstOde <= 1e-9, 'PHY-01b/SA-25：闭环 ODE 残差 max ≤1e-9 A（全 601 点）', String(worstOde));

/* 5. PHY-03：C0 连续 + C1 不连续（禁止跨事件平滑） */
close(at(cl, 'I_bat_true_A', 20), 25, 1e-12, 'PHY-03 C0：|I(20−)−I(20+)|=0');
const rightDeriv = (15 - at(cl, 'I_bat_true_A', 20)) / 1.5;
close(rightDeriv, -6.666666666666667, 1e-6, 'PHY-03 C1：右导数 = −6.666666666666667 A/s');
close((at(cl, 'I_bat_true_A', 20) - at(cl, 'I_bat_true_A', 19.9)) / 0.1, 0, 1e-6, 'PHY-03 C1：左导数 = 0');

/* 6. PHY-04：post 相邻样本严格递减 + 边界 */
let monotoneOk = true;
for (let i = 201; i < 601; i++) {
  if (!(cl.timeseries.signals.I_bat_true_A[i] < cl.timeseries.signals.I_bat_true_A[i - 1])) monotoneOk = false;
}
ok(monotoneOk, 'PHY-04：post 相邻样本严格递减（趋向 15 A）');
let boundsOk = true;
for (let i = 0; i < 601; i++) {
  const I = cl.timeseries.signals.I_bat_true_A[i];
  if (!(I >= 0 && I <= 25 + 1e-12)) boundsOk = false;
  if (!(cl.timeseries.signals.P_gen_true_kW[i] >= 0)) boundsOk = false;
}
ok(boundsOk, 'PHY-04：边界 0 ≤ I_true ≤ 25 A、P_gen ≥ 0');

/* 7. PHY-05：仅监测 */
let monConst = true;
for (let i = 0; i < 601; i++) if (mo.timeseries.signals.I_bat_true_A[i] !== 25) monConst = false;
ok(monConst, 'PHY-05：monitor I_true ≡ 25 A（601 点精确）');
let monMeasOk = true;
for (let i = 0; i < 601; i++) {
  const expect = i < 200 ? 25 : 35;
  if (mo.timeseries.signals.I_bat_meas_A[i] !== expect) monMeasOk = false;
}
ok(monMeasOk, 'PHY-05：monitor I_meas 前 200 点=25、后 401 点=35（精确）');
close(metricOf(mo, 'max_abs_r_meas_kW').value, 4.0, 1e-9, 'PHY-05：monitor post r_meas=+4 kW');

/* 7b. FLEXT_G2B_SPEC v1.1 §2 项 1（风险 R-2 守卫）：actuator 闭环 vs monitor 逐位等价。
   oracle self_check 内两模式共享同一解析式属恒真，检不出引擎侧非等价——等价守卫必须落在本
   引擎测试层。actuator 无测量偏置（b≡0，钳位作用在物理执行器上），feedback_mode 不进入
   FL-001 actuator 数值路径：两 Run 配置仅 feedback_mode 不同（monitor-actuator 不重复入
   golden），series 全信号 + t + metrics 数值须逐位（===）一致，仅排除 run.label / run.role /
   metrics 中 effective_mode 元数据。 */
const actMon = core.simulate(configForGoldenRun(golden.runs.actuator_closed_loop, 'monitor'), { runId: 'GOLDEN-actuator_monitor' });
const actCl = RUNS.actuator_closed_loop;
function configWithoutMode(cfg) { const c = JSON.parse(JSON.stringify(cfg)); delete c.feedback_mode; return JSON.stringify(c); }
eq(actCl.config.feedback_mode, 'closed_loop', '等价前提：actuator 闭环 Run feedback_mode=closed_loop');
eq(actMon.config.feedback_mode, 'monitor', '等价前提：actuator monitor Run feedback_mode=monitor');
eq(configWithoutMode(actCl.config), configWithoutMode(actMon.config), '等价前提：两配置除 feedback_mode 外逐字段一致');
ok(actCl.label !== actMon.label && actCl.role !== actMon.role, '等价前提：两 Run 元数据确属不同模式（label/role 不同，为排除项）');
let eqT = true;
for (let i = 0; i < actCl.timeseries.t.length; i++) if (actCl.timeseries.t[i] !== actMon.timeseries.t[i]) eqT = false;
ok(eqT && actCl.timeseries.t.length === actMon.timeseries.t.length, '等价：t ' + actCl.timeseries.t.length + ' 点逐位一致');
Object.keys(actCl.timeseries.signals).forEach((sid) => {
  const a = actCl.timeseries.signals[sid];
  const b = actMon.timeseries.signals[sid];
  ok(Array.isArray(b) && a.length === b.length, '等价 序列在场且等长：' + sid);
  if (!Array.isArray(b) || a.length !== b.length) return;
  let same = true;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { same = false; break; }
  ok(same, '等价 全信号逐位（===，含前置窗 null）：' + sid);
});
const actMonById = {};
actMon.metrics.forEach((mm) => { actMonById[mm.metric_id] = mm; });
ok(actMon.metrics.length === actCl.metrics.length, '等价：metric 数量一致（' + actCl.metrics.length + ' 条）');
actCl.metrics.forEach((mm) => {
  if (mm.metric_id === 'effective_mode') return; /* 元数据排除项 */
  const other = actMonById[mm.metric_id];
  ok(other && mm.value === other.value, '等价 metric 数值逐位：' + mm.metric_id,
    other ? 'closed=' + JSON.stringify(mm.value) + ' monitor=' + JSON.stringify(other.value) : 'monitor 缺 metric ' + mm.metric_id);
});
const actEffCl = actCl.metrics.filter((x) => x.metric_id === 'effective_mode')[0];
eq(actEffCl ? actEffCl.value : null, 'closed_loop', '等价排除项：闭环 Run effective_mode=closed_loop');
eq(actMonById.effective_mode ? actMonById.effective_mode.value : null, 'monitor', '等价排除项：monitor Run effective_mode=monitor');

/* 8. SA-18：focal_change（时间窗 [20,60]） */
const focal = metricOf(cl, 'focal_change_A');
close(focal.value, -9.999999999973769, 1e-6, 'SA-18：focal_change_A=−9.999999999973769（±1e-6）');
eq(JSON.stringify(focal.time_window_s), JSON.stringify([20, 60]), 'SA-18：focal_change 时间窗 [20,60]');

/* 9. SA-20：显示舍入（round-half-up；存储/显示分离） */
function roundHalfUp(x, dp) {
  const p = Math.pow(10, dp);
  return (Math.sign(x) * Math.floor(Math.abs(x) * p + 0.5) / p).toFixed(dp);
}
eq(roundHalfUp(446 / 3600, 6), '0.123889', 'SA-20：E 显示 0.123889 kWh（6 dp）');
eq(roundHalfUp(59.69027777777779, 6), '59.690278', 'SA-20：SOC 显示 59.690278 %');
eq(roundHalfUp(-0.11111111111110716, 5), '-0.11111', 'SA-20：SOC_err 显示 −0.11111 pp');
eq(roundHalfUp(18.678794411714424, 4), '18.6788', 'SA-20：21.5 s I 显示 18.6788 A');
eq(roundHalfUp(15.183156388887342, 4), '15.1832', 'SA-20：26 s I 显示 15.1832 A');

/* 10. SA-24：P0 范围守卫（批准白名单） */
ok(CONFIGS.closed_loop_fault.systemId === 'FL-001'
  && CONFIGS.closed_loop_fault.fault.family === 'sensor_drift'
  && CONFIGS.closed_loop_fault.fault.params.magnitude === 10
  && CONFIGS.closed_loop_fault.fault.t_start_s === 20, 'SA-24：P0 白名单 FL-001/sensor_drift/10A/20s');

/* 10b. FL thermal 分派守卫（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §2.0/§2.4；并入步 10）：
   缺省→off 轨（run_hash 口径与 golden fl001_v1 一致）、'on'→thermal 轨、非法值被 validate 拒。
   run_hash 输入含 config_hash/model_hash/signals/events/metrics/checks（registry.js
   runHashInput）——off 轨 config_hash 走 contract scenarioView 投影（不投影 off 轨键，
   engine.js:180-183 注释），与 fl001_v1 时代口径一致；on/off 轨区分由 run_hash 的
   序列内容（T_bat_K/P_loss_kW null↔数值）承载。 */
(function thermalDispatchGuard() {
  /* 缺省 → off 轨：normalizeConfig 盖章（engine.js thermal_model 分支） */
  const cfgDefault = core.createConfig('FL-001', {});
  eq(cfgDefault.thermal_model, 'off', '分派守卫：cfg.thermal_model 缺省盖章 = off（normalizeConfig）');
  const cfgExplicitOff = core.createConfig('FL-001', { thermal_model: 'off' });
  eq(cfgExplicitOff.thermal_model, 'off', '分派守卫：显式 off 配置盖章一致');
  const runDefault = FL.registry.createRun({ config: cfgDefault, runId: 'DISPATCH-OFF-DEFAULT' });
  const runExplicitOff = FL.registry.createRun({ config: cfgExplicitOff, runId: 'DISPATCH-OFF-EXPLICIT' });
  eq(runDefault.configHash, runExplicitOff.configHash, '分派守卫：缺省与显式 off configHash 同值（盖章幂等）');
  eq(FL.registry.verifyRunHash(runDefault), true, '分派守卫：off 轨 run_hash 可重算');
  eq(FL.registry.verifyRunHash(runExplicitOff), true, '分派守卫：显式 off run_hash 可重算');
  ok(runDefault.timeseries.signals.T_bat_K.every((v) => v === null) &&
    runDefault.timeseries.signals.P_loss_kW.every((v) => v === null),
  '分派守卫：缺省轨 T_bat_K/P_loss_kW 全列 null（= off 轨）');
  eq(runDefault.metrics.filter((m) => m.metric_id === 'E_loss_kWh' || m.metric_id === 'T_bat_end_K').length, 0,
    '分派守卫：off 轨无 E_loss/T_bat_end 指标（metrics 面 off 零漂移）');

  /* 'on' → thermal 轨：热状态面 + thermal 专属指标在场，run_hash 与 off 不同 */
  const runOn = FL.registry.createRun({
    config: core.createConfig('FL-001', { thermal_model: 'on' }), runId: 'DISPATCH-ON'
  });
  eq(runOn.config.thermal_model, 'on', '分派守卫：on 配置盖章');
  ok(runOn.timeseries.signals.T_bat_K[0] === 298.15 && isFinite(runOn.timeseries.signals.T_bat_K[600]),
    '分派守卫：on 轨热状态面在场（T_bat(0)=298.15 冷启动、T_bat(60) 有限值）');
  ok(runOn.metrics.some((m) => m.metric_id === 'E_loss_kWh') &&
    runOn.metrics.some((m) => m.metric_id === 'T_bat_end_K'),
  '分派守卫：on 轨 E_loss/T_bat_end 指标在场');
  ok(runOn.runHash !== runDefault.runHash, '分派守卫：on/off run_hash 不同（序列内容承载轨区分）');
  eq(FL.registry.verifyRunHash(runOn), true, '分派守卫：on 轨 run_hash 可重算');

  /* 非法值被 validateConfig 拒（枚举 off|on；engine.js validateConfig thermal_model 分支） */
  const vBad = core.validateConfig(core.createConfig('FL-001', { thermal_model: 'auto' }));
  eq(vBad.ok, false, '分派守卫：thermal_model 非法值被 validateConfig 拒');
  eq(vBad.errors[0].field, 'thermal_model', '分派守卫：拒绝字段 = thermal_model');

  /* 仅声明 defaults.thermal_model 的系统（FL-001）携带该键；其余系统 undefined
     （scenario 键哈希零漂移面——L5 检查编排交接） */
  ['FC-001', 'GT-001', 'PV-001'].forEach((sid) => {
    eq(core.createConfig(sid, {}).thermal_model, undefined, '分派守卫：' + sid + ' 无 thermal_model 键（未声明轨）');
  });
})();

/* 11. method 标注（G0-DEC-06：golden 断言用 analytic_flux；导出契约字段） */
eq(metricOf(cl, 'E_bat_true_60s').method, 'analytic_flux', 'E 指标 method=analytic_flux');
eq(metricOf(cl, 'E_bat_true_60s').method_version, 'analytic_flux.1', 'method_version=analytic_flux.1');
eq(metricOf(cl, 'max_abs_r_meas_kW').method, 'algebraic', 'r_meas method=algebraic');
const contractMetric = FL.contract.toContractMetric(metricOf(cl, 'E_bat_true_60s'));
eq(contractMetric.value, metricOf(cl, 'E_bat_true_60s').value, '契约投影保持全精度 value');
ok(Array.isArray(contractMetric.time_window_s) && contractMetric.blindSafe === false, '契约投影含 time_window_s/blindSafe');

/* 12. golden 完整性自证（SA-26：golden 由 oracle 生成且来源哈希在场） */
ok(golden.method_id === 'analytic_flux' && golden.method_version === 'analytic_flux.1',
  'SA-26：golden method_id=analytic_flux');
ok(typeof golden.generated_by.oracle_source_sha256 === 'string' && golden.generated_by.oracle_source_sha256.length === 64,
  'SA-26：golden 记录 oracle 源码 SHA-256');
ok(typeof golden.approval.approved_by === 'string' && golden.approval.approved_by.length > 0
  && typeof golden.approval.approved_golden_sha256 === 'string' && golden.approval.approved_golden_sha256.length === 64,
  'golden approval 已回填（approved_by=' + String(golden.approval.approved_by).slice(0, 20) + '…，摘要 64 hex）');

/* ------------------------------------------------------------------ *
 * 13. FL capacity on 轨四轨引擎 ↔ fl001_v3 golden（gate T-B 分派容差）——
 *     FLCAP-G2b-04 测试面（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §4 项 10① 两门禁面
 *     之一 + §3.2 锚点表，CHG-20261114-01；V140 波 W4 追加节，既有断言零改动）。
 *     golden 由 tools/oracle/fl001_cap_oracle.py 发射（engine 只读比对，不写 golden）；
 *     4 Run = healthy/closed_loop_fault/monitor_only/actuator_closed_loop，全部
 *     thermal_model=on + capacity_model=on（§4 项 5 Q7 定案——镜像 fl001_v2 全集）。
 * ------------------------------------------------------------------ */
const GOLDEN3_PATH = path.join(__dirname, '..', 'data', 'golden', 'fl001_v3.json');
const golden3 = JSON.parse(fs.readFileSync(GOLDEN3_PATH, 'utf8'));
const TOL3 = golden3.tolerances.gate;
eq(golden3.golden_id, 'fl001_v3', 'fl001_v3：golden id');
eq(TOL3.tier, 'T-B', 'fl001_v3：gate tier=T-B（FLCAP 规格 §4 项 7 Q8 定案——RK4 独立双实现，FLTH/FC 同制）');
eq(golden3.method_id, 'fl001_capacity_rk4_dt0.01', 'fl001_v3：method_id（RK4 dt=0.01 容量轨数值方法）');
eq(golden3.model_version, '1.1.0', 'fl001_v3：model_version=1.1.0（维持仅登记——golden 语义由 golden_id 承载，FC Q1 定案 B 同构）');
eq(golden3.thermal_model, 'on', 'fl001_v3：thermal_model=on（双键入 config 块——fl001_v2 thermal_model 先例扩双键）');
eq(golden3.capacity_model, 'on', 'fl001_v3：capacity_model=on（FLCAP 规格 §4 项 6 元数据定案）');
ok(String(golden3.supersedes).indexOf('fl001_v2') === 0,
  'fl001_v3：supersedes=fl001_v2（thermal 轨 capacity_model=off 字节冻结留档，存档场次继续引用 v2）');
ok(typeof golden3.approval.approved_golden_sha256 === 'string' && golden3.approval.approved_golden_sha256.length === 64,
  'fl001_v3：approval 已回填（approved_golden_sha256 64 hex）');

/* gate T-B 容差分类映射（序列；scripts/verify_golden.py T-B 分派同构 + `_kWh` 专支——
   FLCAP §4 项 7 硬项承载面：E_cap_kWh → E_kWh 键（置于 kW 兜底支之前，FC `_V` 分支
   先例同构；A-4/B-1 定案勘正——_kWh 不命中 _kW 后缀，无该支即落兜底键缺口） */
function seriesLimit3(sid, gref) {
  if (sid === 't') return TOL3.t_s;
  if (sid === 'T_bat_K') return TOL3.T_K_atol;
  if (sid === 'r_true_kW') return TOL3.r_true_kW;
  if (sid === 'r_meas_kW') return TOL3.r_meas_kW_atol;
  if (sid.slice(-4) === '_kWh') return TOL3.E_kWh; /* E_cap_kWh T-B 分派专支（§4 项 7） */
  if (sid.slice(-2) === '_A') return Math.max(TOL3.I_A_atol, TOL3.I_A_rtol * Math.max(1, Math.abs(gref)));
  if (sid.indexOf('SOC') === 0 || sid.slice(-4) === '_pct') return TOL3.SOC_pp;
  return Math.max(TOL3.P_kW_atol, TOL3.P_kW_rtol * Math.max(1, Math.abs(gref)));
}
/* gate T-B 容差分类映射（scalars；scalarLimit2 同构 + E_cap_end_kWh 经 _kWh 路由 E_kWh） */
function scalarLimit3(key, gval) {
  if (key.indexOf('_kWh') !== -1) return TOL3.E_kWh;
  if (key === 'T_bat_end_K') return TOL3.T_K_atol;
  if (key === 't_19p9_s') return TOL3.t_s;
  if (key === 'max_abs_r_true_kW') return TOL3.r_true_kW;
  if (key === 'max_abs_r_meas_kW') return TOL3.r_meas_kW_atol;
  if (key.indexOf('int_') === 0) return TOL3.SOC_pp * 3600;
  if (key.indexOf('SOC') !== -1 || key.indexOf('_pp') !== -1) return TOL3.SOC_pp;
  if (key.slice(-2) === '_A') return Math.max(TOL3.I_A_atol, TOL3.I_A_rtol * Math.max(1, Math.abs(gval)));
  return Math.max(TOL3.P_kW_atol, TOL3.P_kW_rtol * Math.abs(gval));
}

const RUNS3 = {};
Object.keys(golden3.runs).forEach((key) => {
  const cfg3 = core.createConfig('FL-001', Object.assign({ thermal_model: 'on', capacity_model: 'on' },
    JSON.parse(JSON.stringify(RUNS2_CFG[key]))));
  RUNS3[key] = core.simulate(cfg3, { runId: 'GOLDEN3-' + key });
});

let capacityTSpread = 0; /* 引擎↔oracle T_bat 序列散差（四轨最大；见汇总行裕度证据） */

Object.keys(RUNS3).forEach((key) => {
  const run3 = RUNS3[key];
  const g3 = golden3.runs[key];
  const n3 = golden3.sampling.n;
  eq(run3.timeseries.t.length, n3, key + '（capacity on）：601 点');
  eq(run3.config.thermal_model, golden3.config.thermal_model, key + '（capacity on）：config.thermal_model 与 golden 同轨');
  eq(run3.config.capacity_model, golden3.config.capacity_model, key + '（capacity on）：config.capacity_model 与 golden 同轨');

  /* 全序列逐点（golden 17 序列键集 = fl001_v2 全 16 列 + E_cap_kWh 新列；null 严格一致
     ——I_bat_cap_A 前置窗禁止 null→0 coerce） */
  let over3 = 0;
  let worst3 = 0;
  const missing3 = [];
  Object.keys(g3.series).forEach((sid) => {
    const mine = sid === 't' ? run3.timeseries.t : run3.timeseries.signals[sid];
    if (!mine || mine.length !== n3) { missing3.push(sid); return; }
    if (sid === 'T_bat_K') {
      for (let i = 0; i < n3; i++) capacityTSpread = Math.max(capacityTSpread, Math.abs(g3.series[sid][i] - mine[i]));
    }
    for (let i = 0; i < n3; i++) {
      const gv = g3.series[sid][i];
      const av = mine[i];
      if (gv === null || av === null) {
        if (gv !== av) {
          failures.push({ name: key + '（capacity on）' + sid + '@' + i, detail: 'null 不一致：engine=' + av + ' golden=' + gv });
          fail++;
          return;
        }
        continue;
      }
      const d = Math.abs(gv - av);
      if (d > worst3) worst3 = d;
      if (d > seriesLimit3(sid, gv)) over3++;
    }
  });
  eq(missing3.length, 0, key + '（capacity on）：golden ' + Object.keys(g3.series).length +
    ' 序列在引擎中齐备（含 t 列）', missing3.join(','));
  ok(over3 === 0, key + '（capacity on）：序列逐点 ≤ gate T-B 容差（超差 0 点；最大绝对偏差 ' +
    worst3.toExponential(2) + '）');

  /* scalars 全量（23 项 = fl001_v2 22 项 + E_cap_end_kWh）：引擎复算 vs golden。
     派生口径沿 §1b D2（SOC 账本恒等 + 序列采样行）；E_cap_end_kWh 为序列末采样行值
     （metrics.js 无 E_cap 注册物——golden metrics 11 项镜像面不含该键，scalars 面由
     序列派生承载，零引擎侧注册需求——W4 实读登记）。 */
  const sig3 = run3.timeseries.signals;
  const met3 = {};
  run3.metrics.forEach((m) => { met3[m.metric_id] = m.value; });
  const socT3 = met3.SOC_true_end_pct;
  const socE3 = met3.SOC_est_end_pct;
  const soc03 = run3.config.initial.SOC_pct;
  const D3 = {
    E_bat_true_kWh: met3.E_bat_true_60s,
    E_bat_meas_kWh: met3.E_bat_true_60s + 0.4 * (socT3 - socE3),
    E_gen_true_kWh: met3.E_gen_true_60s,
    E_load_served_kWh: met3.E_load_served_60s,
    E_loss_kWh: met3.E_loss_kWh,
    SOC_true_end_pct: socT3,
    SOC_est_end_pct: socE3,
    SOC_err_end_pp: met3.SOC_err_end_pp,
    I_true_19p9_A: sig3.I_bat_true_A[199],
    I_meas_19p9_A: sig3.I_bat_meas_A[199],
    t_19p9_s: run3.timeseries.t[199],
    I_true_20post_A: sig3.I_bat_true_A[200],
    I_meas_20post_A: key === 'healthy' ? sig3.I_bat_meas_A[200] : met3.I_meas_20post_A,
    I_true_21p5_A: sig3.I_bat_true_A[215],
    I_true_26_A: sig3.I_bat_true_A[260],
    I_true_60_A: sig3.I_bat_true_A[600],
    P_bat_true_21p5_kW: sig3.P_bat_true_kW[215],
    P_gen_true_21p5_kW: sig3.P_gen_true_kW[215],
    max_abs_r_true_kW: met3.max_abs_r_true_kW,
    max_abs_r_meas_kW: met3.max_abs_r_meas_kW,
    int_I_true_60s_As: (soc03 - socT3) * 3600,
    T_bat_end_K: met3.T_bat_end_K,
    E_cap_end_kWh: sig3.E_cap_kWh[600]
  };
  const S3 = g3.scalars;
  const badS3 = [];
  Object.keys(S3).forEach((k) => {
    if (!(k in D3)) { badS3.push(k + ' 未复算'); return; }
    const d = Math.abs(D3[k] - S3[k]);
    if (!(d <= scalarLimit3(k, S3[k]))) badS3.push(k + ' ' + D3[k] + ' vs ' + S3[k]);
  });
  eq(Object.keys(S3).length, 23, key + '（capacity on）：golden scalars 面 23 项');
  eq(badS3.length, 0, key + '（capacity on）：scalars 全量对 golden（gate T-B 分类容差）', badS3.join(' | '));

  /* golden metrics 块（11 项镜像面）对引擎指标；healthy 跳过 I_meas_20post_A
     （fl001_v1 §3b 同款——引擎 family=none 记不可用 null，golden 记序列推导值）。
     metrics.js 无 E_cap 注册物：golden 11 项 metrics 与 fl001_v2 同键面（E_cap_end_kWh
     仅入 scalars 面）——零引擎侧注册需求（W4 实读登记）。 */
  const gmBad3 = [];
  Object.keys(g3.metrics).forEach((mid) => {
    if (key === 'healthy' && mid === 'I_meas_20post_A') return;
    const em = run3.metrics.filter((x) => x.metric_id === mid)[0];
    if (!em) { gmBad3.push(mid + ' 缺'); return; }
    const gv3 = g3.metrics[mid].value;
    if (gv3 === null || em.value === null) { if (em.value !== gv3) gmBad3.push(mid + ' null 不一致'); return; }
    const lim = mid.indexOf('kWh') !== -1 ? TOL3.E_kWh
      : mid === 'max_abs_r_meas_kW' ? TOL3.r_meas_kW_atol
      : mid === 'max_abs_r_true_kW' ? TOL3.r_true_kW
      : mid.indexOf('SOC') !== -1 || mid.indexOf('_pp') !== -1 ? TOL3.SOC_pp
      : Math.max(TOL3.I_A_atol, TOL3.I_A_rtol * Math.max(1, Math.abs(gv3))); /* focal_change_A / I 类 → I 口径 */
    if (!(Math.abs(em.value - gv3) <= lim)) gmBad3.push(mid);
  });
  eq(gmBad3.length, 0, key + '（capacity on）：golden metrics 块（11 项镜像面）对引擎指标', gmBad3.join(','));

  /* thermal/capacity on 专属指标在场（metrics.js cfg.thermal_model==='on' 分支——
     capacity on 蕴含 thermal on，E_loss/T_bat_end 指标面沿用，零新注册物） */
  ok(met3.E_loss_kWh !== undefined && met3.T_bat_end_K !== undefined,
    key + '（capacity on）：E_loss_kWh/T_bat_end_K 指标在场（metrics.js thermal on 分支容量轨沿用）');

  /* E_cap_kWh 新列 A-2 面：全列 ≡ 40 精确（四 golden Run 窗内最高温 309.953757 K <
     T_cap0 = 313.15 K ⇒ η_cap ≡ 1.0 精确——§3.3 ③ 位级实测 min = 40.0） */
  let ecapBreak = -1;
  for (let i = 0; i < n3; i++) { if (sig3.E_cap_kWh[i] !== 40) { ecapBreak = i; break; } }
  eq(ecapBreak, -1, key + '（capacity on）：E_cap_kWh 全列 ≡ 40 精确（A-2——四 Run 窗内最高温 < T_cap0=313.15 K，η_cap ≡ 1.0）',
    '首个破坏点 @' + ecapBreak + ' 值 ' + (ecapBreak === -1 ? '' : sig3.E_cap_kWh[ecapBreak]));

  /* 事件面（故障局）：1 事件 + pre/post 快照相位值对 golden 变量集逐位一致
     （E_cap 不入事件快照——§2 事件快照行零扩展；快照变量集随列在场机械增长、
     golden 未钉的额外键不进比对——FC 先例体例） */
  if ((g3.events || []).length) {
    eq(run3.events.length, 1, key + '（capacity on）：1 事件');
    const ge3 = g3.events[0];
    const fe3 = run3.events[0];
    eq(fe3.trigger_s, ge3.trigger_s, key + '（capacity on）：事件时刻 20 s');
    eq(fe3.event_type, ge3.event_type, key + '（capacity on）：event_type');
    eq(fe3.faultId, ge3.fault_id, key + '（capacity on）：faultId 与 golden 同源（目录 id）');
    const fp3 = run3.snapshots.find((x) => x.snapshot_id === fe3.preSnapshotId);
    const fq3 = run3.snapshots.find((x) => x.snapshot_id === fe3.postSnapshotId);
    ok(!!fp3 && !!fq3, key + '（capacity on）：pre/post 快照经引用可达');
    const preBad3 = [];
    const postBad3 = [];
    Object.keys(ge3.snapshots[0].variables).forEach((vid) => {
      if (fp3.variables[vid] !== ge3.snapshots[0].variables[vid]) preBad3.push(vid);
      if (fq3.variables[vid] !== ge3.snapshots[1].variables[vid]) postBad3.push(vid);
    });
    eq(preBad3.length + postBad3.length, 0, key + '（capacity on）：pre/post 快照相位值与 golden 逐位一致',
      preBad3.concat(postBad3).join(','));
  } else {
    eq(run3.events.length, 0, key + '（capacity on）：健康局无事件');
  }
});

/* ------------------------------------------------------------------ *
 * 14. A-2 healthy 位级锚点 + FCAP-6 monitor 热面恒等（§3.2 锚点表冻结值）
 * ------------------------------------------------------------------ */
(function capacityHealthyAnchors() {
  const onH = RUNS3.healthy.timeseries.signals;
  const v2H = golden2.runs.healthy.series;
  let socTBreak = -1;
  let socEBreak = -1;
  for (let i = 0; i < 601; i++) {
    if (socTBreak === -1 && onH.SOC_true_pct[i] !== v2H.SOC_true_pct[i]) socTBreak = i;
    if (socEBreak === -1 && onH.SOC_est_pct[i] !== v2H.SOC_est_pct[i]) socEBreak = i;
  }
  eq(socTBreak, -1, 'A-2：healthy(on_cap) SOC_true 601 点与 fl001_v2 位级逐位同（修正累积器恒精确 0.0——T<T_cap0 域 η_cap≡1.0 IEEE 精确）',
    '首个破坏点 @' + socTBreak);
  eq(socEBreak, -1, 'A-2：healthy(on_cap) SOC_est 601 点与 fl001_v2 位级逐位同（测量链零升级——§1.4）',
    '首个破坏点 @' + socEBreak);
  const metH = {};
  RUNS3.healthy.metrics.forEach((m) => { metH[m.metric_id] = m.value; });
  eq(metH.SOC_err_end_pp, 0, 'A-2：healthy(on_cap) SOC_err ≡ 0 位级（容量因子不激活——模型已知结构项、非测量故障/非能量损失）');
  ok(onH.T_bat_K[600] === golden3.runs.healthy.scalars.T_bat_end_K && golden3.runs.healthy.scalars.T_bat_end_K === 309.953756517313,
    'A-2：healthy(on_cap) T(60) = 309.953756517313 K 位级（§3.2 锚点表冻结值；fl001_v2 同 I 轨 309.953229379282，Δ=+5.3e-4 K 低于 0.01 K 显示精度——healthy 锚点面零扰动）');

  /* FCAP-6：monitor 热面恒等（b 不进物理回路——T_bat/P_loss 与 healthy 601 点逐位；
     FL-6 判据在 capacity on 域的同构承载面） */
  const mon3 = RUNS3.monitor_only.timeseries.signals;
  let tB6 = -1;
  let pB6 = -1;
  for (let i = 0; i < 601; i++) {
    if (tB6 === -1 && mon3.T_bat_K[i] !== onH.T_bat_K[i]) tB6 = i;
    if (pB6 === -1 && mon3.P_loss_kW[i] !== onH.P_loss_kW[i]) pB6 = i;
  }
  eq(tB6, -1, 'FCAP-6：capacity on monitor T_bat ≡ healthy T_bat（601 点逐位，热面恒等结构判据）', '首个破坏点 @' + tB6);
  eq(pB6, -1, 'FCAP-6：capacity on monitor P_loss ≡ healthy P_loss（601 点逐位，I≡25 同热轨）', '首个破坏点 @' + pB6);

  /* r 面锚点纯净维持（FLTH Q3——r 面与 SOC_err 面分离，EQ-FLTH-6 无容量项） */
  close(metricOf(RUNS3.monitor_only, 'max_abs_r_meas_kW').value, 4.0, 1e-9,
    'FLTH Q3 锚点：capacity on monitor max|r_meas| = 4.0 精确（测量偏差，不是能量损失——r 面容量项零涉）');
  ok(onH.r_true_kW.every((v) => Math.abs(v) <= 1e-12), 'capacity on：r_true 定义恒等 ≤1e-12 kW 全 601 点（EQ-FLTH-6 不动域——守恒面零涟漪维持）');
})();

/* ------------------------------------------------------------------ *
 * 15. load0=45 角点锚点（§3.3 ⑥ 域扫描值——批准轮 RK4 (β, η_cap) 联合耦合仿真
 *     冻结；大电流角点由 initial.load_kW 域上端承载——FL 无 load_step 族（O-13 已删），
 *     cfgForRun 同参 = healthy/closed_loop/SOC0=60 手拼 initial.load_kW=45）
 * ------------------------------------------------------------------ */
(function capacityCornerAnchors() {
  const cfgCornerOn = core.createConfig('FL-001', {
    thermal_model: 'on', capacity_model: 'on', initial: { load_kW: 45 },
    fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } }
  });
  const cfgCornerTh = core.createConfig('FL-001', {
    thermal_model: 'on', initial: { load_kW: 45 },
    fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } }
  });
  const runCornerOn = core.simulate(cfgCornerOn, { runId: 'CORNER-ON45' });
  const runCornerTh = core.simulate(cfgCornerTh, { runId: 'CORNER-TH45' });
  const sOn = runCornerOn.timeseries.signals;
  const sTh = runCornerTh.timeseries.signals;
  close(sOn.T_bat_K[600], 425.120236, 1e-3, '角点：capacity on load0=45 T(60)=425.120236 K（§3.3 ⑥——I_max=62.5 A 角点）');
  close(sOn.T_bat_K[600] - sTh.T_bat_K[600], 0.416, 1e-3,
    '角点：ΔT(60) = +0.416 K（on_cap vs fl001_v2 同 I 轨——β 项 0.098% 教学可见不过度，§3.3 ①）');
  close(sOn.E_cap_kWh[600], 22.0848, 1e-3, '角点：E_cap(60) = 22.0848 kWh（−45% 折算教学可见，§3.3 ⑥）');
  close(sOn.E_cap_kWh[600] / 40, 0.552119, 1e-6, '角点：η_cap(60) = 0.552119（窗内 min η > η_floor=0.5——floor 窗内不结合，A-1）');
  const metOn = {};
  runCornerOn.metrics.forEach((m) => { metOn[m.metric_id] = m.value; });
  const metTh = {};
  runCornerTh.metrics.forEach((m) => { metTh[m.metric_id] = m.value; });
  close(metOn.SOC_true_end_pct - metTh.SOC_true_end_pct, -0.3303, 1e-4,
    '角点：SOC 折算加速 ≈ −0.3303 pp（on_cap 58.628071 vs 同 I v2 轨 58.958333——容量因子主教学面，§3.3 ⑥）');
  ok(metTh.SOC_true_end_pct - metOn.SOC_true_end_pct > 0,
    '角点方向：放电段 |ΔSOC| 放大（η_cap ≤ 1 构造推论——§1.4 方向声明实测）');

  /* EQ-FLTH-12 稳定小根 θ₋ 锚点（spec 值交叉）。登记：引擎 integrals.theta_ss_K 为
     W3 锚点消费面但不外露于 Run 对象（W4 实读——core.simulate 返回面不含 integrals，
     registry runHashInput 亦不含），本测试经冻结闭式（有理化小根形态——Q3/A-3 定案，
     与引擎 thetaSsSmallRoot 同式同序、常量同源 FLTH §2.1 + FLCAP §1.5 四常量）复算
     锚点值交叉；oracle↔golden 侧锚点全表由 verify_golden fl001_cap（FCAP-5）独立承载。 */
  function thetaSsSmallRoot(I) {
    var R0 = 0.2;
    var ALPHA = 0.01;
    var BETA = 5e-7;
    var H = 10;
    var p = I * I * R0;
    var q = H - ALPHA * p;
    var delta = q * q - 4 * BETA * p * p;
    return { theta_K: 2 * p / (q + Math.sqrt(delta)), delta_W2: delta };
  }
  close(298.15 + thetaSsSmallRoot(25).theta_K, 312.437172, 1e-6,
    'EQ-FLTH-12：θ₋(25 A) → T_ss = 312.437172 K（healthy 参考电流稳态——§3.2 锚点表；β=0 线性式 312.435714 对照）');
  close(298.15 + thetaSsSmallRoot(62.5).theta_K, 681.540805, 1e-6,
    'EQ-FLTH-12：θ₋(62.5 A) = 383.390805 K（I_max 角点渐近稳态——§3.3 ①；β=0 357.142857 → +26.25 K）');
  close(thetaSsSmallRoot(62.5).delta_W2, 3.564453, 1e-4,
    'EQ-FLTH-12：判别式 Δ = 3.564453 @ 62.5 A 角点（全域 min Δ > 0——§3.3 ②④）');
  close(10 - 62.5 * 62.5 * 0.2 * (0.01 + 2 * Math.sqrt(5e-7)), 1.0826, 1e-4,
    'EQ-FLTH-12：失稳边界裕度 h − I²R0(α+2√β) = +1.0826 W/K @ 62.5 A（新界 load_kW > 46.4741 kW 推导锚——§3.3 ②④）');
})();

/* ------------------------------------------------------------------ *
 * 16. 三元路由断言（两门禁面②——FLCAP §4 项 10②；FLTH B-2 / FC §4 项 10 同构）：
 *     (thermal_model, capacity_model) → golden 分派表 (off,·)→fl001_v1 /
 *     (on,off)→fl001_v2 / (on,on)→fl001_v3 / (off,on)=非法组合结构化拒绝（不静默）。
 *     acceptance 分域：off 轨 keyValues 为 fl001_v1 域专用冻结锚点（systems.js
 *     acceptance.keyValues 原样零变化），on_cap 轨 keyValues 由 fl001_v3 golden 承载。
 * ------------------------------------------------------------------ */
(function capacityTripleRouting() {
  /* (off,·) → fl001_v1 域：默认 off Run 关键标量 = acceptance.keyValues（fl001_v1 冻结锚点域） */
  const metOff = {};
  RUNS.closed_loop_fault.metrics.forEach((m) => { metOff[m.metric_id] = m.value; });
  const kv = FL.systems.get('FL-001').acceptance.keyValues;
  close(metOff.E_bat_true_60s, kv.E_bat_kWh, 1e-6, '路由 (off,·)：E_bat = fl001_v1 域 acceptance.keyValues 锚点（0.1238889）');
  close(metOff.E_gen_true_60s, kv.E_gen_kWh, 1e-6, '路由 (off,·)：E_gen = fl001_v1 域锚点（0.3761111）');
  close(metOff.SOC_true_end_pct, kv.SOC_true_end_pct, 1e-6, '路由 (off,·)：SOC_true = fl001_v1 域锚点');
  close(metOff.SOC_est_end_pct, kv.SOC_est_end_pct, 1e-6, '路由 (off,·)：SOC_est = fl001_v1 域锚点');
  close(metOff.SOC_err_end_pp, kv.SOC_err_pp, 1e-6, '路由 (off,·)：SOC_err = fl001_v1 域锚点（−0.1111111）');
  close(metOff.max_abs_r_meas_kW, kv.max_abs_r_meas_kW, 1e-6, '路由 (off,·)：max|r_meas| = fl001_v1 域锚点（4.0）');
  close(metOff.I_true_26s_A, kv.I_true_26s_A, 1e-6, '路由 (off,·)：I_true(26) = fl001_v1 域锚点');
  ok(RUNS.closed_loop_fault.timeseries.signals.T_bat_K.every((v) => v === null),
    '路由 (off,·)：T_bat 全列 null（fl001_v1 L0 轨——热面结构性缺席）');
  eq(RUNS.closed_loop_fault.timeseries.signals.E_cap_kWh, undefined, '路由 (off,·)：E_cap_kWh 列结构性缺席');

  /* (on,off) → fl001_v2 域：T_bat(60) 位级 = fl001_v2 golden healthy（热力链、无容量面） */
  const thH = RUNS2.healthy.timeseries.signals;
  ok(thH.T_bat_K[600] === golden2.runs.healthy.scalars.T_bat_end_K,
    '路由 (on,off)：T(60) = 309.953229379282 K 位级（fl001_v2 域——fl001_l1_oracle 位级复刻面）');
  eq(thH.E_cap_kWh, undefined, '路由 (on,off)：E_cap_kWh 列结构性缺席（thermal on 无 capacity 轨——EQ-FLTH-7 原式域）');

  /* (on,on) → fl001_v3 域：T_bat(60) 位级 = fl001_v3 golden healthy（容量链） */
  const capH = RUNS3.healthy.timeseries.signals;
  ok(capH.T_bat_K[600] === golden3.runs.healthy.scalars.T_bat_end_K,
    '路由 (on,on)：T(60) = 309.953756517313 K 位级（fl001_v3 域——fl001_cap_oracle 位级复刻面）');
  ok(capH.T_bat_K[600] !== golden2.runs.healthy.scalars.T_bat_end_K,
    '路由 (on,on)：T(60) ≠ fl001_v2 域值（EQ-FLTH-10 β 项 fp 级分异可判别——分派路由落到正确 golden 域）');
  ok(capH.E_cap_kWh[600] === 40, '路由 (on,on)：E_cap 列在场且 ≡ 40（fl001_v3 域承载——新轨独立 golden）');

  /* (off,on) = 非法组合拒绝：engine validate 结构化拒绝（Q11 落点一）+ registry CN-E02 */
  const cfgCombo = core.createConfig('FL-001', { capacity_model: 'on' });
  eq(cfgCombo.thermal_model, 'off', '组合前提：FL-001 thermal_model 缺省盖章 off（capacity on 前置不满足）');
  const vCombo = core.validateConfig(cfgCombo);
  eq(vCombo.ok, false, '路由 (off,on)：engine validateConfig 结构化拒绝（三元封闭路由——不静默钳位）');
  eq(vCombo.errors[0].field, 'capacity_model', '路由 (off,on)：拒绝字段 = capacity_model');
  ok(vCombo.errors[0].message.indexOf('thermal_model=on') !== -1,
    '路由 (off,on)：拒绝消息含前置条件说明（capacity 轨以 thermal 轨为承载前提）');
  let threwCombo = null;
  try { FL.registry.createRun({ config: cfgCombo, runId: 'COMBO-REJECT' }); } catch (e) { threwCombo = e; }
  ok(!!threwCombo && threwCombo.code === 'CN-E02', '路由 (off,on)：registry.createRun 抛 CN-E02（结构化错误，MG-IMP-Q1 reject 纪律）',
    threwCombo && threwCombo.message);
  eq(threwCombo && threwCombo.field, 'config.capacity_model', '路由 (off,on)：错误 field = config.capacity_model');

  /* 场景层拒绝负例（Q11 落点二——scenario declaresCapacity 组合守卫；§11 并行覆盖） */
  const pCombo = FL.core.scenario.parseScenario({
    version: 1, system: 'FL-001',
    events: [{ key: 'ev1', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop', capacity_model: 'on' }]
  });
  eq(pCombo.ok, false, '路由 (off,on)：场景层结构化拒绝（场景热轨缺省解析 off——declaresCapacity 组合守卫）');
  ok((pCombo.errors || []).some((e) => e.field === 'events[0].capacity_model' && e.message.indexOf('thermal_model=on') !== -1),
    '路由 (off,on)：场景层拒绝字段/消息（Q11 双落点之二）', JSON.stringify(pCombo.errors));
  /* 显式 (on,on) 场景解析通过（合法路由支对照） */
  const pOk = FL.core.scenario.parseScenario({
    version: 1, system: 'FL-001',
    events: [{ key: 'ev1', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop', thermal_model: 'on', capacity_model: 'on' }]
  });
  eq(pOk.ok && pOk.scenario.events[0].capacity_model, 'on', '路由 (on,on)：场景层解析通过并保留（合法三元支——显式双键入归一化面）', JSON.stringify(pOk.errors));
})();

/* ------------------------------------------------------------------ *
 * 17. off/(on,off) 逐位不变量节（FLCAP §3.1 项 3 零变化判据承载——capacity_model=off
 *     时全链与既有轨逐位同：off 轨与 fl001_v1 逐位同（gate 容差，§1 已承载）、thermal on
 *     无 capacity 轨与 fl001_v2 逐位同（16 列位级）、run_hash 可重算 + 盖章幂等 +
 *     model_hash/config_hash 域外零涉（B-2/B-3a——capacity 子对象在九字段哈希域外）
 * ------------------------------------------------------------------ */
(function capacityOffInvariants() {
  /* (on,off) 4 Run：golden2 全 16 列 601 点逐位 ===（比 §1b gate 容差比较更强的逐位
     不变量面——fl001_v2 字节冻结零涉的引擎侧承载；W3 落地实测 0 diff） */
  let bitBreak2 = '';
  Object.keys(golden2.runs).forEach((key) => {
    const run2b = RUNS2[key];
    const g2b = golden2.runs[key];
    Object.keys(g2b.series).forEach((sid) => {
      const mine = sid === 't' ? run2b.timeseries.t : run2b.timeseries.signals[sid];
      for (let i = 0; i < 601; i++) {
        if (mine[i] !== g2b.series[sid][i]) { bitBreak2 = key + '/' + sid + '@' + i; break; }
      }
    });
  });
  eq(bitBreak2, '', '(on,off) 逐位不变量：4 Run × golden2 全 16 列 601 点逐位 ===（capacity 面零涉——fl001_v2 字节冻结零涉的引擎侧承载）', bitBreak2);
  ok(Object.keys(RUNS2.healthy.timeseries.signals).indexOf('E_cap_kWh') === -1,
    '(on,off)：E_cap_kWh 列结构性缺席（onTrackOnly 门控——run_hash signals 面零变化，W3 探针证面）');

  /* off 5 配置（4 golden1 Run + actuator monitor 变体）：E_cap 缺席 + Run 目录不含 +
     run_hash 可重算（off 轨零漂移面） */
  const offRuns5 = Object.keys(CONFIGS).map((key) => ({ tag: 'off/' + key, run: FL.registry.createRun({ config: CONFIGS[key], runId: 'CAP-OFF-' + key }) }));
  offRuns5.push({ tag: 'off/actuator_monitor', run: FL.registry.createRun({ config: configForGoldenRun(golden.runs.actuator_closed_loop, 'monitor'), runId: 'CAP-OFF-ACTMON' }) });
  offRuns5.forEach((it) => {
    eq(it.run.timeseries.signals.E_cap_kWh, undefined, it.tag + '：E_cap_kWh 列结构性缺席（off 轨零漂移）');
    ok(!it.run.signals.some((s) => s.id === 'E_cap_kWh'), it.tag + '：Run 挂载信号目录不含 E_cap_kWh（run.signals 与 timeseries.signals 键面一致）');
    eq(FL.registry.verifyRunHash(it.run), true, it.tag + '：run_hash 可重算（冻结 + 完整性面）');
  });

  /* 盖章幂等（B-1a 缺省轨解析只在 normalizeConfig 盖章层——缺省与显式 off 全等） */
  const cfgCapDefault = core.createConfig('FL-001', {});
  eq(cfgCapDefault.capacity_model, 'off', '逐位不变量：cfg.capacity_model 缺省盖章 = off（normalizeConfig）');
  const cfgCapExplicitOff = core.createConfig('FL-001', { capacity_model: 'off' });
  eq(cfgCapExplicitOff.capacity_model, 'off', '逐位不变量：显式 off 配置盖章一致');
  const runCapDefault = FL.registry.createRun({ config: cfgCapDefault, runId: 'CAP-OFF-DEFAULT' });
  const runCapExplicit = FL.registry.createRun({ config: cfgCapExplicitOff, runId: 'CAP-OFF-EXPLICIT' });
  eq(runCapDefault.configHash, runCapExplicit.configHash, '逐位不变量：缺省与显式 off configHash 同值（盖章幂等）');
  eq(runCapDefault.runHash, runCapExplicit.runHash, '逐位不变量：缺省与显式 off run_hash 同值（off 路径零变化）');
  ok(JSON.stringify(runCapDefault.timeseries) === JSON.stringify(runCapExplicit.timeseries),
    '逐位不变量：缺省与显式 off 时间序列逐字节同');

  /* 三轨 run_hash 互异 + model_hash/config_hash 域外零涉（B-2/B-3a——capacity 子对象
     在 model_hash 具名九字段哈希域外、scenarioView 不投影 capacity_model） */
  const runThOff = FL.registry.createRun({ config: core.createConfig('FL-001', { thermal_model: 'on', fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } }), runId: 'CAP-ONOFF-H' });
  const runCapOn = FL.registry.createRun({ config: core.createConfig('FL-001', { thermal_model: 'on', capacity_model: 'on', fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } }), runId: 'CAP-ON-H' });
  ok(runThOff.runHash !== runCapDefault.runHash, '三轨 run_hash：off ≠ (on,off)（T_bat/P_loss 序列 null↔数值承载）');
  ok(runCapOn.runHash !== runThOff.runHash, '三轨 run_hash：(on,on) ≠ (on,off)（E_cap 列 + β 级热面差异承载）');
  ok(runCapOn.runHash !== runCapDefault.runHash, '三轨 run_hash：(on,on) ≠ off');
  eq(runCapOn.modelHash, runThOff.modelHash, 'B-2：model_hash (on,on) == (on,off)（capacity additive 子对象在九字段哈希域外——既有输入零变化）');
  eq(runCapOn.modelHash, runCapDefault.modelHash, 'B-2：model_hash (on,on) == off（三轨同值）');
  eq(runCapOn.configHash, runThOff.configHash, 'B-3(a)：config_hash (on,on) == (on,off)（scenarioView 不投影 capacity_model——已知局限登记不静默）');
  eq(FL.registry.verifyRunHash(runCapOn), true, '(on,on)：run_hash 可重算（冻结 + 完整性面）');
})();

/* ================================================================== *
 * 18. R-10 FL 容量分派守卫（沿 R-4…R-9 分派守卫先例命名——守卫号 grep 登记
 *     2026-11-14：R-2=FL actuator 逐位等价（本文件 §7b）/ R-3=registry 不变量
 *     （registry.test）/ R-4=PV 分派（engine-pv）/ R-5=MG 分派（engine-mg）/
 *     R-6=FC 电化学分派（engine-fc）/ R-7=WT 分派（engine-wt）/
 *     R-8=schema bounds 投影 + GT thermo 源级分派（engine-gt）/
 *     R-9=registry thermal 哈希面（registry.test）⇒ R-10 = FL 容量分派
 *     （本文件——R-2…R-9 区间唯一空闲号）。FLCAP 规格 §9 风险表 R-1…R-10 为
 *     波次风险编号、非分派守卫号（engine-mg「规格在先登记号让位」体例——本轨规格
 *     未预登记分派号 ⇒ 取下一空闲号）。
 * ================================================================== */
(function capacityDispatchGuard() {
  /* 源级守卫（R-6 体例）：engine.js simulateFL001 三分派显式行在位——on_cap 显式分派
     不被 thermal/plant/L0 兜底吞掉 */
  const engineSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'engine.js'), 'utf8');
  ok(engineSrc.indexOf("if (cfg.capacity_model === 'on') return simulateFL001Capacity") !== -1,
    'R-10 源级：engine.js capacity on 轨显式分派行在位（先于 simulateFL001Thermal/plant/L0 路径——显式分派不被兜底吞掉）');
  ok(engineSrc.indexOf('FL001_CAPACITY_G2B_SPEC_APPROVED') !== -1,
    'R-10 源级：分派链注释登记规格依据（FLCAP-G2b-04 / CHG-20261114-01）');

  /* 数值面守卫（R-6 体例——兜底物理给不出该值面）：on_cap healthy P_loss(60) 位级 =
     fl001_v3 golden 且 ≠ fl001_v2 golden（EQ-FLTH-10 β 二次项——分派链路可判别） */
  const capH = RUNS3.healthy.timeseries.signals;
  ok(capH.P_loss_kW[600] === golden3.runs.healthy.series.P_loss_kW[600] &&
    capH.P_loss_kW[600] !== golden2.runs.healthy.series.P_loss_kW[600],
    'R-10 数值面：on_cap healthy P_loss(60) = fl001_v3 域值且 ≠ fl001_v2 域值（EQ-FLTH-10 β 二次项 fp 级分异——分派链路可判别）');
  eq(core.createConfig('FL-001', {}).capacity_model, 'off', 'R-10：cfg 缺省盖章 capacity_model=off（normalizeConfig——缺省轨走 off 全量既有路径）');
  eq(FL.registry.verifyRunHash(FL.registry.createRun({ config: core.createConfig('FL-001', { thermal_model: 'on', capacity_model: 'on', fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } }), runId: 'R10-ON' })), true,
    'R-10：on_cap 轨 run_hash 可重算（冻结 + 完整性面）');

  /* 无外系统信号渗入（R-5「无 GT/FL/PV/WT 专属信号渗入」同构）：外系统信号目录中
     非 FL 既有目录成员的信号不在 on_cap 轨 timeseries.signals 中——若分派链被绕过
     （静默落入他系统物理），信号面直接换轨 */
  const flIds = {};
  FL.systems._raw.get('FL-001').signals.forEach((s) => { flIds[s.id] = true; });
  const foreignIds10 = [];
  FL.systems._raw.all().forEach((s) => {
    if (s.id !== 'FL-001') s.signals.forEach((sg) => { if (!flIds[sg.id]) foreignIds10.push(sg.id); });
  });
  ok(foreignIds10.length > 0, 'R-10：外系统信号清单非空（守卫面非平凡——' + foreignIds10.length + ' 个外系统专属信号）');
  const leaked10 = foreignIds10.filter((sid) => capH[sid] !== undefined);
  eq(leaked10.length, 0, 'R-10：on_cap 轨无 FC/GT/PV/WT/MG 专属信号渗入（分派未落入他系统兜底物理）', leaked10.join(','));

  /* onTrackOnly 门控面（Q10 定案最小集）：恰一列 E_cap_kWh + 非盲显（FL 在盲测池，
     默认 off ⇒ 盲包语义零变化；新信号不入盲投影显式声明——GTL1 §1.2 B-1 先例） */
  const flSigs = FL.systems._raw.get('FL-001').signals;
  eq(flSigs.filter((s) => s.onTrackOnly).map((s) => s.id).join(','), 'E_cap_kWh',
    'R-10：onTrackOnly 标记恰为一新信号 E_cap_kWh（Q10 最小集——makeSeries 门控承载面）');
  const ecapSg = flSigs.filter((s) => s.id === 'E_cap_kWh')[0];
  ok(!!ecapSg && ecapSg.exposure === 'public_demo' && ecapSg.blindVisible === false,
    'R-10 盲面：E_cap_kWh 非盲显（public_demo / blindVisible=false——FL 在盲测池）');
  eq(ecapSg.sourceKind, 'DERIVED', 'R-10：E_cap_kWh sourceKind=DERIVED（§1.2 B-3 列——algebraic 折算面与 P_loss_kW 同构）');
  const runR10On = FL.registry.createRun({ config: core.createConfig('FL-001', { thermal_model: 'on', capacity_model: 'on', fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } }), runId: 'R10-BLIND' });
  const blindR10 = FL.contract.project(runR10On, 'blind');
  ok(blindR10.signals.every((s) => s.id !== 'E_cap_kWh'),
    'R-10 盲面：blind 投影不含 E_cap_kWh（新信号不入盲投影显式声明——GTL1 §1.2 B-1 先例）');
})();

/* ------------------------------------------------------------------ *
 * 19. capacity_model 校验负例（结构化拒绝；Q11 落点一 engine validate 枚举守卫 +
 *     组合守卫入口面；(off,on) 三元路由拒绝已由 §16 承载，此处补显式 thermal off
 *     组合与跨系统键面）
 * ------------------------------------------------------------------ */
['auto', 42, null].forEach((badVal) => {
  const cfgBad = core.createConfig('FL-001', {});
  cfgBad.capacity_model = badVal;
  const vBad = core.validateConfig(cfgBad);
  eq(vBad.ok, false, '负例：capacity_model=' + String(badVal) + ' 被 validateConfig 拒（枚举 off|on，engine.js 容量分支）');
  eq(vBad.errors[0].field, 'capacity_model', '负例：拒绝字段 = capacity_model（' + String(badVal) + '）');
});
eq(core.createConfig('FL-001', { capacity_model: 'on', thermal_model: 'on' }).capacity_model, 'on',
  '盖章面：显式 capacity_model=on 保留（normalizeConfig 只补缺省）');
eq(core.createConfig('FL-001', { capacity_model: 'off' }).capacity_model, 'off',
  '盖章面：显式 capacity_model=off 一致（盖章幂等）');
const vCombo2 = core.validateConfig(core.createConfig('FL-001', { thermal_model: 'off', capacity_model: 'on' }));
eq(vCombo2.ok, false, '负例：显式 (thermal off, capacity on) 组合拒绝（engine.js 组合守卫——§4 项 10② (off,on) 支）');
eq(vCombo2.errors[0].field, 'capacity_model', '负例：组合拒绝字段 = capacity_model');
/* 仅声明 defaults.capacity_model 的系统（FL-001）携带该键；其余系统 undefined
   （scenario 键哈希零漂移面——L5 检查编排交接） */
['FC-001', 'GT-001', 'PV-001'].forEach((sid) => {
  eq(core.createConfig(sid, {}).capacity_model, undefined, '分派守卫：' + sid + ' 无 capacity_model 键（未声明轨）');
});

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('引擎对解析 golden 全点比对通过（4 Run × 601 点 + actuator 闭环/monitor 逐位等价 + 标量 + 指标 + PHY/SA）。');
console.log('FL thermal on（fl001_v2 四轨，gate T-B）：全序列/22 标量/11 指标/事件比对通过；' +
  '引擎↔oracle T_bat 序列散差 max = ' + thermalTSpread.toExponential(2) + ' K' +
  (thermalTSpread > 0
    ? '（gate T_K_atol = 1e-2，裕度 ×' + (1e-2 / thermalTSpread).toExponential(1) + '，≥×10 达标——FL 规格 §4 项 6③）'
    : '（与 oracle 发射面逐位一致；gate T_K_atol = 1e-2 裕度 ≫×10 达标——FL 规格 §4 项 6③）') +
  '。oracle↔golden 新鲜度由 verify_golden fl001_l1（25/25 pass）独立承载。');
console.log('FL capacity on（fl001_v3 四轨，gate T-B）：全序列（17 列含 E_cap_kWh）/23 标量/11 指标/事件比对通过 + ' +
  'A-2 healthy 位级锚点（T(60)=309.953756517313/SOC 位级同 v2/E_cap≡40/SOC_err≡0）+ load0=45 角点锚点（ΔT +0.416/η 0.552119/E_cap 22.0848/折算加速 −0.3303 pp）+ ' +
  '三元路由两门禁面② + off/(on,off) 逐位不变量 + R-10 分派守卫；' +
  '引擎↔oracle T_bat 序列散差 max = ' + capacityTSpread.toExponential(2) + ' K' +
  (capacityTSpread > 0
    ? '（gate T_K_atol = 1e-2，裕度 ×' + (1e-2 / capacityTSpread).toExponential(1) + '，≥×10 达标——FLCAP 规格 §4 项 7 Q8）'
    : '（与 oracle 发射面逐位一致；gate T_K_atol = 1e-2 裕度 ≫×10 达标——FLCAP 规格 §4 项 7 Q8）') +
  '。oracle↔golden 新鲜度由 verify_golden fl001_cap（FCAP-1…8）独立承载。');
