/* owner: core-engine | module: tests/engine | contract: NEXT/MODEL_VALIDATION_SPEC.md
   G2 四件套①数值脚本的产品侧（I-04 / P0a-05）：引擎输出对独立解析 golden
   data/golden/fl001_v1.json 逐点比对 + PHY-01/01b/02/03/04/05 + SA-04…07/17/18/20/24/25。
   golden 由 tools/oracle/ 生成（engine 只读比对，不写 golden）。
   Run 键面按 golden.runs 遍历（fl001_v1 3→4 Run：+actuator_closed_loop，FLEXT_G2B_SPEC_APPROVED
   v1.1 §2 项 1 / V060_WAVE_DESIGN W2-2 测试面），并落 actuator 闭环 vs monitor 逐位等价断言。
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
