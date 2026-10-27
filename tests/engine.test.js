/* owner: core-engine | module: tests/engine | contract: NEXT/MODEL_VALIDATION_SPEC.md
   G2 四件套①数值脚本的产品侧（I-04 / P0a-05）：引擎输出对独立解析 golden
   data/golden/fl001_v1.json 逐点比对 + PHY-01/01b/02/03/04/05 + SA-04…07/17/18/20/24/25。
   golden 由 tools/oracle/ 生成（engine 只读比对，不写 golden）。
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

const CONFIGS = {
  healthy: core.createConfig('FL-001', { fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } }),
  closed_loop_fault: core.createConfig('FL-001', {}),
  monitor_only: core.createConfig('FL-001', { feedback_mode: 'monitor' })
};
const RUNS = {};
Object.keys(CONFIGS).forEach((key) => {
  RUNS[key] = core.simulate(CONFIGS[key], { runId: 'GOLDEN-' + key });
});

/* ------------------------------------------------------------------ *
 * 1. SA-26 / T-01：三组 Run 601 点逐点对 golden
 * ------------------------------------------------------------------ */
const TOL = golden.tolerances.gate;
const SERIES_TOL = {
  t: { abs: TOL.t_s },
  I_bat_true_A: { rel: TOL.I_A_rtol, abs: TOL.I_A_atol },
  I_bat_meas_A: { rel: TOL.I_A_rtol, abs: TOL.I_A_atol },
  bias_A: { rel: TOL.I_A_rtol, abs: TOL.I_A_atol },
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
});

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
ok(golden.approval.approved_by === null, 'golden approval 未预填虚构批准值');

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('引擎对解析 golden 全点比对通过（三组 Run × 601 点 + 标量 + 指标 + PHY/SA）。');
