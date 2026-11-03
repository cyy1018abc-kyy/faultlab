/* owner: core-engine | module: tests/engine-fc | contract: G0-DEC-15 FC-001 修复清单 / P1-06 G2b-lite
   FC-001 引擎对独立解析 golden data/golden/fc001_v1.json 逐点比对（P1-06 前置条件闭环）。
   golden 由 tools/oracle/fc001_oracle.py 生成（不 import 产品代码；engine 只读比对）。
   Run 键面按 golden.runs 遍历（fc001_v1 3→5 Run：+load_step_closed_loop / +actuator_closed_loop，
   FCEXT_G2B_SPEC_APPROVED v1.1 §2 / V060_WAVE_DESIGN W1-3 测试面），配置由 golden Run 元数据派生。
   运行：node tests/engine-fc.test.js；失败非零退出。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { bootstrap } = require('./core-load');
const FL = bootstrap();
const core = FL.core;

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'golden', 'fc001_v1.json'), 'utf8'));

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

const TOL = golden.tolerances.gate;

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
    ? core.createConfig('FC-001', {
      feedback_mode: mode,
      fault: { family: g.fault.family, faultId: g.fault.fault_id, t_start_s: g.fault.t_start_s, params: { magnitude: magnitudeOfGoldenFault(g.fault) } }
    })
    : core.createConfig('FC-001', { feedback_mode: mode, fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } });
}
const RUNS = {};
Object.keys(golden.runs).forEach((key) => {
  RUNS[key] = configForGoldenRun(golden.runs[key]);
});
const OUT = {};
Object.keys(RUNS).forEach((key) => {
  OUT[key] = core.simulate(RUNS[key], { runId: 'FC-GOLDEN-' + key });
});

/* 1. 全部 golden Run（5 个）601 点逐点对 golden（rtol 1e-12 / SOC ±1e-5 pp；
   空值严格一致——覆盖 actuator Run 的 I_fc_cap_A 前置窗 null） */
Object.keys(OUT).forEach((key) => {
  const run = OUT[key];
  const g = golden.runs[key];
  eq(run.timeseries.t.length, golden.sampling.n, key + '：601 点');
  Object.keys(g.series).forEach((sid) => {
    if (sid === 't') return;
    const a = run.timeseries.signals[sid];
    const b = g.series[sid];
    ok(Array.isArray(a) && a.length === b.length, key + ' 序列在场且等长：' + sid);
    if (!a || a.length !== b.length) return;
    let worst = 0;
    let worstAt = -1;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === null || b[i] === null) {
        /* 单侧空值记为最大偏离（禁止 null→0 隐式 coerce 掩盖不一致） */
        if (a[i] !== b[i]) { worst = Infinity; worstAt = i; break; }
        continue;
      }
      const d = Math.abs(a[i] - b[i]);
      if (d > worst) { worst = d; worstAt = i; }
    }
    const lim = TOL.SOC_pp; /* 默认 SOC 门槛；收紧到各类的最小可判定值 */
    const isI = sid.startsWith('I_') || sid.startsWith('bias');
    const isP = sid.endsWith('_kW');
    const effLim = isI ? Math.max(TOL.I_A_atol, TOL.I_A_rtol * Math.max(1, Math.abs(b[worstAt] || 1)))
      : isP ? Math.max(TOL.P_kW_atol, TOL.P_kW_rtol * Math.max(1, Math.abs(b[worstAt] || 1)))
        : (sid === 'r_true_kW' ? TOL.r_true_kW : TOL.SOC_pp);
    void lim;
    ok(worst <= effLim, key + ' 601 点对 golden：' + sid + '（max diff ' + worst.toExponential(2) + '）',
      'worst@' + worstAt);
  });
});

/* 2. 修复清单数值（G0-DEC-15：SOC 末值含 τ_fc 过渡尾项；W-10 方向与 FL-001 相反） */
const cl = OUT.closed_loop_fault;
const m = (run, id) => (run.metrics.filter((x) => x.metric_id === id)[0] || {});
close(m(cl, 'SOC_true_end_pct').value, 59.4755556, 1e-5, 'FC SOC_true_end=59.4755556 %（修复清单）');
close(m(cl, 'SOC_est_end_pct').value, 59.5866667, 1e-5, 'FC SOC_est_end=59.5866667 %（修复清单）');
close(m(cl, 'SOC_err_pp').value, 0.1111111, 1e-5, 'FC SOC_err=+0.11111 pp（正号，W-10）');
ok(m(cl, 'SOC_err_pp').value > 0, 'FC SOC_err 为正号（与 FL-001 方向相反，禁止"同 FL-001 结构"）');
eq(m(cl, 'SOC_err_pp').unit, 'pp', 'FC SOC_err 单位=pp');
close(m(cl, 'max_abs_r_meas_kW').value, 4.0, 1e-9, 'FC r_meas=+4 kW');

/* 3. ODE 残差（τ_fc=1.2 闭式导数 vs 引擎值，全 601 点 ≤1e-9 A） */
let worstOde = 0;
for (let i = 0; i < 601; i++) {
  const t = cl.timeseries.t[i];
  const I = cl.timeseries.signals.I_fc_true_A[i];
  const b = t >= 20 ? 10 : 0;
  const dI = t < 20 ? 0 : -(10 / 1.2) * Math.exp(-(t - 20) / 1.2);
  worstOde = Math.max(worstOde, Math.abs(1.2 * dI + I - (50 - b)));
}
ok(worstOde <= 1e-9, 'FC 闭环 ODE 残差 max ≤1e-9 A（τ_fc=1.2）', String(worstOde));

/* 4. 事件相位（pre=20.0 左极限 50 A；post 60 A） */
const pre = cl.snapshots.filter((s) => s.phase === 'pre')[0];
const post = cl.snapshots.filter((s) => s.phase === 'post')[0];
close(pre.t_s, 20, 0, 'FC pre.t_s=20.0（left_limit）');
eq(pre.derivation, 'left_limit', 'FC pre derivation');
close(pre.variables.I_fc_meas_A, 50, 1e-12, 'FC pre I_fc,meas=50 A');
close(post.variables.I_fc_meas_A, 60, 1e-12, 'FC post I_fc,meas=60 A');
close(post.variables.I_fc_true_A, 50, 1e-12, 'FC post I_fc,true=50 A（连续）');

/* 5. monitor / healthy 常量行为 */
const mon = OUT.monitor_only;
let monConst = true;
for (let i = 0; i < 601; i++) if (mon.timeseries.signals.I_fc_true_A[i] !== 50) monConst = false;
ok(monConst, 'FC monitor I_fc ≡ 50 A（601 点精确）');
close(m(mon, 'SOC_err_pp').value, golden.runs.monitor_only.scalars.SOC_err_end_pp, 1e-5, 'FC monitor SOC_err 对 golden');
const base = OUT.healthy;
close(m(base, 'E_source_kWh').value, golden.runs.healthy.scalars.E_fc_true_kWh, TOL.E_kWh, 'FC 基准 E_fc 对 golden');
close(m(base, 'SOC_err_pp').value, 0, 1e-9, 'FC 基准 SOC_err=0（电池传感器健康）');

/* 5b. 全 Run 指标对 golden（按 golden.runs[key].metrics 遍历；W1-3 键面扩展的数值锁定）。
   E_bat_est_kWh 为 oracle 侧 EMS 平衡估算电能（FCEXT v1.1 §2），引擎无对应 metric_id
   （series 层 P_bat_est_kW 已在 §1 逐点比对覆盖），跳过。 */
Object.keys(golden.runs).forEach((key) => {
  const run = OUT[key];
  const gm = golden.runs[key].metrics;
  Object.keys(gm).forEach((mid) => {
    if (mid === 'E_bat_est_kWh') return;
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
      : Math.max(TOL.I_A_atol, TOL.I_A_rtol * Math.max(1, Math.abs(gv))); /* focal_change 等 A 类 → I 口径 */
    close(em.value, gv, lim, key + ' 指标对 golden：' + mid);
  });
});

/* 5c. 新增 Run（load_step_closed_loop / actuator_closed_loop）标量锚点：golden.scalars
   的 20post/26/60 采样行值经 sampleAt 复核（±1e-9 数值面由 §1 全点比对承载） */
['load_step_closed_loop', 'actuator_closed_loop'].forEach((key) => {
  const run = OUT[key];
  const gs = golden.runs[key].scalars;
  [['I_fc_true_20post_A', 20], ['I_fc_true_26_A', 26], ['I_fc_true_60_A', 60]].forEach((anchor) => {
    const gv = gs[anchor[0]];
    close(core.sampleAt(run, 'I_fc_true_A', anchor[1]).value, gv,
      Math.max(TOL.I_A_atol, TOL.I_A_rtol * Math.max(1, Math.abs(gv))), key + ' 标量锚点 ' + anchor[0] + ' 对 golden.scalars');
  });
});

/* 6. 能量定义恒等（E_fc + E_bat = 0.5 kWh；仅作定义自洽展示，不是守恒验证） */
close(m(cl, 'E_source_kWh').value + m(cl, 'E_bat_kWh').value, 0.5, 1e-9, 'FC E_fc+E_bat=0.5 kWh（定义恒等）');

/* 7. 范围守卫：FC-001 为 extension_preview（不进入 P0 验收） */
eq(FL.scope.classify(RUNS.closed_loop_fault), 'approved_fc', 'FC-001 scope=approved_fc（V3-04 升正式，CHG-20261030-12）');

/* 8. golden 身份与批准 */
eq(golden.golden_id, 'fc001_v1', 'golden_id=fc001_v1');
eq(golden.method_id, 'analytic_flux', 'FC golden method=analytic_flux（含 τ_fc 过渡尾项，非稳态近似）');
eq(golden.method_version, 'analytic_flux.2', 'FC golden method_version=analytic_flux.2（W1-2 级联子步递推重出）');
ok(typeof golden.approval.approved_golden_sha256 === 'string' && golden.approval.approved_golden_sha256.length === 64,
  'FC golden 已批准（approved_golden_sha256 在场）');
ok(String(golden.approval.approved_by).indexOf('CHG-20261104-06') !== -1,
  'FC golden 批准记录指向 CHG-20261104-06（V060_WAVE_DESIGN 波次预分配重签）');

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('FC-001 引擎对解析 golden 全点比对通过（5 Run × 601 点：P1-06 修复清单 + FCEXT v1.1 扩展闭环）。');
