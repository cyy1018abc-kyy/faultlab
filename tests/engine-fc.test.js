/* owner: core-engine | module: tests/engine-fc | contract: G0-DEC-15 FC-001 修复清单 / P1-06 G2b-lite
   + FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §4 项 10（FCECH-G2b-04 / CHG-20261113-01 批准链，
   V120 波 W4——0 新步，on 轨变体并入本步⑥）
   FC-001 引擎对独立解析 golden data/golden/fc001_v1.json 逐点比对（P1-06 前置条件闭环）。
   golden 由 tools/oracle/fc001_oracle.py 生成（不 import 产品代码；engine 只读比对）。
   Run 键面按 golden.runs 遍历（fc001_v1 3→5 Run：+load_step_closed_loop / +actuator_closed_loop，
   FCEXT_G2B_SPEC_APPROVED v1.1 §2 / V060_WAVE_DESIGN W1-3 测试面），配置由 golden Run 元数据派生。
   §9–§15（FCECH-G2b-04 追加节，既有 §1–§8 断言零改动）：两门禁面① = 引擎 ↔ fc001_v2
   T-B 比对面（5 Run 全序列 21 列逐点 + scalars 17 项 + metrics 镜像 + 事件相位）+
   §3.2 批准锚点（healthy T_st(60)/V_stack(50,·)≡400/P_fc≡20/r_meas≡0/P_loss(0)/
   monitor≡healthy 四面/三故障角点方向）+ §3.1 off 轨不变量（21 列无三新列 + 盖章/哈希面）+
   两门禁面② = cfg→golden 分派（acceptance.keyValues off 域锚定 + on 轨 fc001_v2 承载 +
   classify Q1 定案 B）+ R-6 电化学分派守卫（R-5…R-7 区间唯一空闲号，grep 登记）+
   electrochem_model 校验负例。新增断言 190 条（断言计数 = 运行时 PASS 总数：
   294 → 484）。
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

/* ================================================================== *
 * 9. FC-001 电化学 on 轨——golden fc001_v2 身份面（FCECH-G2b-04 / V120 W4；
 *    两门禁面①）。golden 由 tools/oracle/fc001_l1_oracle.py 发射（engine 只读
 *    比对，G0-DEC-16）；verify 层面由 verify_golden fc001_l1 并行承载
 *    （DEFAULT_MODELS 步①三 golden 顺序验证——B-5 定案），此处为引擎侧关键值
 *    断言面（FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §4 项 10①）。
 * ================================================================== */
const golden2 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'golden', 'fc001_v2.json'), 'utf8'));
const TOL2 = golden2.tolerances.gate;
eq(golden2.golden_id, 'fc001_v2', 'fc001_v2：golden id（cfg→golden 分派 on→fc001_v2，§13）');
eq(TOL2.tier, 'T-B', 'fc001_v2：gate tier=T-B（§4 项 7 Q7 定案：同法 RK4 独立双实现，不承诺跨语言逐位）');
eq(golden2.method_id, 'fc001_l1_polarization_rk4_dt0.01', 'fc001_v2：method_id（RK4 dt=0.01 数值轨）');
eq(golden2.model_id, 'fc.pem.l0', 'fc001_v2：model_id（Q1 定案 B——golden 语义由 golden_id 承载）');
eq(golden2.model_version, '1.1.0', 'fc001_v2：model_version=1.1.0 维持（Q1 定案 B）');
eq(golden2.electrochem_model, 'on', 'fc001_v2：顶层 electrochem_model=on（schema v2 golden）');
eq(golden2.config.electrochem_model, 'on', 'fc001_v2：config 块 electrochem_model=on（fl001_v2 thermal_model 先例）');
ok(String(golden2.supersedes).indexOf('fc001_v1') === 0,
  'fc001_v2：supersedes=fc001_v1（L0 轨字节冻结留档，既有比对面继续引用 v1）');
ok(typeof golden2.approval.approved_golden_sha256 === 'string' && golden2.approval.approved_golden_sha256.length === 64,
  'fc001_v2：approval 已回填（approved_golden_sha256 64 hex）');
ok(String(golden2.approval.approved_by).indexOf('CHG-20261113-01') !== -1,
  'fc001_v2：批准记录指向 CHG-20261113-01（首签批准链）');
eq(golden2.sampling.n, 601, 'fc001_v2：601 点（与 fc001_v1 同网格）');
eq(golden2.config.dt_int_s, 0.01, 'fc001_v2：RK4 子步冻结更新序 dt_int=0.01（§4 项 3——6000 子步/60 s）');
eq(golden2.config.sub_int, 10, 'fc001_v2：RK4 子步冻结更新序 sub_int=10（每采样行 10 子步）');
eq(JSON.stringify(Object.keys(golden2.runs).sort()), JSON.stringify(Object.keys(golden.runs).sort()),
  'fc001_v2 Run 集 = fc001_v1 全集镜像（Q6 定案 (a)：healthy/closed_loop_fault/monitor_only/load_step/actuator 全 on）');

/* golden Run 配置派生（§0 configForGoldenRun 同构 + electrochem_model:'on' 显式钉轨） */
function configForGoldenRunV2(g, feedbackModeOverride) {
  const mode = feedbackModeOverride || g.feedback_mode;
  return g.fault
    ? core.createConfig('FC-001', {
      electrochem_model: 'on',
      feedback_mode: mode,
      fault: { family: g.fault.family, faultId: g.fault.fault_id, t_start_s: g.fault.t_start_s, params: { magnitude: magnitudeOfGoldenFault(g.fault) } }
    })
    : core.createConfig('FC-001', { electrochem_model: 'on', feedback_mode: mode, fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } });
}
const RUNS2 = {};
Object.keys(golden2.runs).forEach((key) => {
  RUNS2[key] = configForGoldenRunV2(golden2.runs[key]);
});
const OUT2 = {};
Object.keys(RUNS2).forEach((key) => {
  OUT2[key] = core.simulate(RUNS2[key], { runId: 'FC-GOLDEN2-' + key });
});
/* registry 冻结面（manifest/run_hash 由 registry 添加——core.simulate 原始输出不含 manifest，
   schema.test.js §5 契约面；哈希/守卫断言走 REG2，序列/指标面走 OUT2） */
const REG2 = {};
Object.keys(RUNS2).forEach((key) => {
  REG2[key] = FL.registry.createRun({ config: RUNS2[key], runId: 'FC-ON-REG-' + key });
});

/* ================================================================== *
 * 10. on 轨 5 Run：全序列 21 列逐点（gate T-B 分派容差）+ scalars 17 项
 *     + metrics 镜像 + 事件相位（两门禁面①主体）
 * ================================================================== */
/* gate T-B 容差分类映射（序列；scripts/verify_golden.py T-B 分派 + B-4 `_V` 分支同构：
   t→t_s、_K→T_K_atol、V_stack_V→V 类（V_stack_atol/rtol）、r_true/r_meas 专键、
   SOC→pp、_A/bias→I 类、其余 kW/pct 类按点幅值相对） */
function seriesLimitV2(sid, gref) {
  if (sid === 't') return TOL2.t_s;
  if (sid === 'T_st_K') return TOL2.T_K_atol;
  if (sid === 'V_stack_V') return Math.max(TOL2.V_stack_atol, TOL2.V_stack_rtol * Math.max(1, Math.abs(gref)));
  if (sid === 'r_true_kW') return TOL2.r_true_kW;
  if (sid === 'r_meas_kW') return TOL2.r_meas_kW_atol;
  if (sid.indexOf('SOC') === 0) return TOL2.SOC_pp;
  if (sid.slice(-2) === '_A' || sid.indexOf('bias') === 0) return Math.max(TOL2.I_A_atol, TOL2.I_A_rtol * Math.max(1, Math.abs(gref)));
  return Math.max(TOL2.P_kW_atol, TOL2.P_kW_rtol * Math.max(1, Math.abs(gref)));
}
/* gate T-B 容差分类映射（scalars）：kWh→E、T_st_end_K→T、V_stack_end_V→V 类、
   r 专键、int_I→SOC_pp×3600（A·s 由 SOC 账本同测度派生——engine.test.js D2 先例）、
   SOC/_pp→pp、_A→I 类、其余 kW 类按幅值相对 */
function scalarLimitV2(key, gval) {
  if (key.indexOf('_kWh') !== -1) return TOL2.E_kWh;
  if (key === 'T_st_end_K') return TOL2.T_K_atol;
  if (key === 'V_stack_end_V') return Math.max(TOL2.V_stack_atol, TOL2.V_stack_rtol * Math.max(1, Math.abs(gval)));
  if (key === 'max_abs_r_true_kW') return TOL2.r_true_kW;
  if (key === 'max_abs_r_meas_kW') return TOL2.r_meas_kW_atol;
  if (key.indexOf('int_') === 0) return TOL2.SOC_pp * 3600;
  if (key.indexOf('SOC') !== -1 || key.indexOf('_pp') !== -1) return TOL2.SOC_pp;
  if (key.slice(-2) === '_A') return Math.max(TOL2.I_A_atol, TOL2.I_A_rtol * Math.max(1, Math.abs(gval)));
  return Math.max(TOL2.P_kW_atol, TOL2.P_kW_rtol * Math.abs(gval));
}
/* 引擎侧复算 golden scalars（17 项 = fc001_v1 镜像 14 + T_st/V_stack/P_loss_stack 三新）：
   能量账本取指标（E_fc_true = E_source 指标——A-5 真实功率基镜像，golden metrics_note 登记）、
   采样点取序列、SOC_est 账本派生 E_bat_est/int_I（∫I 与 SOC 同一积分内核）。 */
function deriveScalarsV2(run, key) {
  const sig = run.timeseries.signals;
  const met = {};
  run.metrics.forEach((x) => { met[x.metric_id] = x.value; });
  const soc0 = run.config.initial.SOC_pct;
  const E_bat_est = (soc0 - met.SOC_est_end_pct) * 40 / 100; /* SOC_est = soc0 − E_bat_est·100/40（40 kWh = Ebat_kWh，测量链 EMS 平衡口径未动） */
  const f = run.config.fault;
  const intB = f.family === 'sensor_drift' ? f.params.magnitude * (60 - f.t_start_s) : 0; /* ∫b dt：sensor 家族 b 自 t=20 起常值（monitor 同——bAt 不随反馈模式门控） */
  return {
    E_fc_true_kWh: met.E_source_kWh,
    E_bat_true_kWh: met.E_bat_kWh,
    E_bat_est_kWh: E_bat_est,
    E_load_kWh: met.E_load_kWh,
    SOC_true_end_pct: met.SOC_true_end_pct,
    SOC_est_end_pct: met.SOC_est_end_pct,
    SOC_err_end_pp: met.SOC_err_pp,
    I_fc_true_20post_A: sig.I_fc_true_A[200],
    I_fc_meas_20post_A: sig.I_fc_meas_A[200],
    I_fc_true_60_A: sig.I_fc_true_A[600],
    I_fc_true_26_A: sig.I_fc_true_A[260],
    max_abs_r_true_kW: met.max_abs_r_true_kW,
    max_abs_r_meas_kW: met.max_abs_r_meas_kW,
    int_I_fc_60s_As: (met.E_load_kWh - E_bat_est) * 9000 - intB, /* ∫I_fc dt = (E_load−E_bat_est)·3600/0.4 − ∫b（0.4 kV 名义电压换算口径） */
    T_st_end_K: sig.T_st_K[600],
    V_stack_end_V: sig.V_stack_V[600],
    P_loss_stack_end_kW: sig.P_loss_stack_kW[600]
  };
}

Object.keys(golden2.runs).forEach((key) => {
  const run = OUT2[key];
  const g2 = golden2.runs[key];
  const n2 = golden2.sampling.n;
  eq(run.config.electrochem_model, 'on', key + '（electrochem on）：cfg 显式 electrochem_model=on 保留（normalizeConfig 不覆盖显式值）');
  eq(run.timeseries.t.length, n2, key + '（electrochem on）：601 点');

  /* 全序列逐点（golden 21 列键集 = t + 20 信号，SERIES_IDS 面；null 严格一致——
     禁止 null→0 隐式 coerce 掩盖不一致，§1 同体例） */
  let over2 = 0;
  let worst2 = 0;
  const missing2 = [];
  Object.keys(g2.series).forEach((sid) => {
    const mine = sid === 't' ? run.timeseries.t : run.timeseries.signals[sid];
    if (!mine || mine.length !== n2) { missing2.push(sid); return; }
    for (let i = 0; i < n2; i++) {
      const gv = g2.series[sid][i];
      const av = mine[i];
      if (gv === null || av === null) {
        if (gv !== av) { over2++; continue; }
        continue;
      }
      const d = Math.abs(gv - av);
      if (d > worst2) worst2 = d;
      if (d > seriesLimitV2(sid, gv)) over2++;
    }
  });
  eq(Object.keys(g2.series).length, 21, key + '（electrochem on）：golden 序列面 21 列（t + 20 信号，§4 项 6 SERIES_IDS）');
  eq(missing2.length, 0, key + '（electrochem on）：golden 21 列在引擎中齐备（含 t 列）', missing2.join(','));
  ok(over2 === 0, key + '（electrochem on）：序列逐点 ≤ gate T-B 分派容差（超差 0 点；最大绝对偏差 ' +
    worst2.toExponential(2) + '）', '超差点数 ' + over2);

  /* scalars 全量（17 项）：引擎复算 vs golden（gate T-B 分类容差） */
  const S2 = g2.scalars;
  const D2 = deriveScalarsV2(run, key);
  const badS2 = [];
  Object.keys(S2).forEach((k) => {
    if (!(k in D2)) { badS2.push(k + ' 未复算'); return; }
    const d = Math.abs(D2[k] - S2[k]);
    if (!(d <= scalarLimitV2(k, S2[k]))) badS2.push(k + ' ' + D2[k] + ' vs ' + S2[k]);
  });
  eq(Object.keys(S2).length, 17, key + '（electrochem on）：golden scalars 面 17 项（镜像 14 + 三新锚点）');
  eq(badS2.length, 0, key + '（electrochem on）：scalars 全量对 golden（gate T-B 分类容差）', badS2.join(' | '));

  /* golden metrics 块（10 项镜像面）对引擎指标；E_bat_est_kWh 跳过——引擎无独立
     metric_id（fc001_v1 §5b 同款），由 SOC_est 账本派生承载（deriveScalarsV2 已锚定） */
  const gmBad2 = [];
  Object.keys(g2.metrics).forEach((mid) => {
    if (mid === 'E_bat_est_kWh') return;
    const em = run.metrics.filter((x) => x.metric_id === mid)[0];
    if (!em) { gmBad2.push(mid + ' 缺'); return; }
    const gv2 = g2.metrics[mid].value;
    if (gv2 === null || em.value === null) { if (em.value !== gv2) gmBad2.push(mid + ' null 不一致'); return; }
    const lim = mid.indexOf('kWh') !== -1 ? TOL2.E_kWh
      : mid === 'max_abs_r_meas_kW' ? TOL2.r_meas_kW_atol
      : mid === 'max_abs_r_true_kW' ? TOL2.r_true_kW
      : mid.indexOf('SOC') !== -1 || mid.indexOf('_pp') !== -1 ? TOL2.SOC_pp
      : Math.max(TOL2.I_A_atol, TOL2.I_A_rtol * Math.max(1, Math.abs(gv2))); /* focal_change（A 口径）→ I 类 */
    if (!(Math.abs(em.value - gv2) <= lim)) gmBad2.push(mid);
  });
  eq(Object.keys(g2.metrics).length, 10, key + '（electrochem on）：golden metrics 块 10 项（fc001_v1 指标面镜像）');
  eq(gmBad2.length, 0, key + '（electrochem on）：golden metrics 块对引擎指标（E_bat_est 由 SOC 账本派生承载）', gmBad2.join(','));

  /* 事件面（§4 项 4 pre/post 语义；healthy 无事件）：
     event_type 不作断言面——FC actuator 引擎通道口径 = 指令限幅语义 actuator_limit，
     golden 事件行记 family 名 actuator_fault（WT 规格 §2/Q2 注记同源，fc001_v1 §4 同不比较）；
     快照相位值逐位（golden 变量集 = L0 最小集，全为精确有理值；引擎侧快照变量随
     信号目录机械增长、golden 未钉的额外键不进比对——engine.test.js thermal 先例体例） */
  if ((g2.events || []).length) {
    eq(run.events.length, 1, key + '（electrochem on）：1 事件');
    const ge2 = g2.events[0];
    const fe2 = run.events[0];
    eq(fe2.trigger_s, ge2.trigger_s, key + '（electrochem on）：事件时刻 20 s');
    eq(fe2.target_signal, ge2.target_signal, key + '（electrochem on）：target_signal=' + ge2.target_signal + '（注入点通道）');
    eq(fe2.magnitude, ge2.magnitude, key + '（electrochem on）：事件幅值与 golden 同源');
    eq(fe2.unit, ge2.unit, key + '（electrochem on）：事件单位与 golden 同源');
    eq(RUNS2[key].fault.faultId, ge2.snapshots[0].fault_id, key + '（electrochem on）：目录 faultId 与 golden 同源（' + ge2.snapshots[0].fault_id + '）');
    const fp2 = run.snapshots.find((x) => x.snapshot_id === fe2.preSnapshotId);
    const fq2 = run.snapshots.find((x) => x.snapshot_id === fe2.postSnapshotId);
    ok(!!fp2 && !!fq2, key + '（electrochem on）：pre/post 快照经引用可达');
    eq(fp2.derivation, 'left_limit', key + '（electrochem on）：pre=left_limit');
    eq(fq2.derivation, 'post_sample', key + '（electrochem on）：post=post_sample');
    const preBad2 = [];
    const postBad2 = [];
    Object.keys(ge2.snapshots[0].variables).forEach((vid) => {
      if (fp2.variables[vid] !== ge2.snapshots[0].variables[vid]) preBad2.push(vid);
      if (fq2.variables[vid] !== ge2.snapshots[1].variables[vid]) postBad2.push(vid);
    });
    eq(preBad2.length + postBad2.length, 0, key + '（electrochem on）：pre/post 快照相位值与 golden 逐位一致（相位变量：数/trigger/target 之外的状态行）',
      preBad2.concat(postBad2).join(','));
  } else {
    eq(run.events.length, 0, key + '（electrochem on）：健康局无事件');
  }
});

/* ================================================================== *
 * 11. §3.2 批准锚点（冻结值）+ monitor 恒等 + 跨深度分歧方向（A-4 结构推论）
 * ================================================================== */
(function electrochemAnchors() {
  const sig2 = (k) => OUT2[k].timeseries.signals;
  const met2 = (k, id) => OUT2[k].metrics.filter((x) => x.metric_id === id)[0].value;
  const h = sig2('healthy');

  /* 健康局结构表（§3.2 冻结；V_stack/P_fc/r_meas 断言 ≤ gate 对应容差——批准值
     400/20/0 为精确有理目标，实测残差 = libm ln 尘点 ±5.7e-14 / ±4e-15 级） */
  close(h.T_st_K[600], 308.966317609, 1e-9, '健康局 T_st(60)=308.966317609 K（§3.2 冻结值——+10.816 K/60 s，整定依据②可见性）');
  let vDev = 0;
  let pDev = 0;
  let maxRm = 0;
  for (let i = 0; i < 601; i++) {
    vDev = Math.max(vDev, Math.abs(h.V_stack_V[i] - 400));
    pDev = Math.max(pDev, Math.abs(h.P_fc_true_kW[i] - 20));
    maxRm = Math.max(maxRm, Math.abs(h.r_meas_kW[i]));
  }
  ok(vDev <= TOL2.V_stack_atol, '健康局 V_stack(50,·) ≡ 400 V 全轨（≤1e-9——整定依据④温度不变性：k_E 与 R_ohm 温度项 I=50 处逐项相消）',
    'max|V−400|=' + vDev.toExponential(2));
  ok(pDev <= Math.max(TOL2.P_kW_atol, TOL2.P_kW_rtol * 20), '健康局 P_fc_true ≡ 20 kW 全轨（gate P 容差内——0.4·50 与 V_stack·50/1000 双路径同轮入）',
    'max|P−20|=' + pDev.toExponential(2));
  ok(maxRm <= TOL2.r_meas_kW_atol, '健康局 r_meas ≡ 0 全轨（≤1e-9——A-1 定案：口径偏差项参考工作点为零 + I≡50 恒值 + ④ ⇒ 全轨为零）',
    'max|r_meas|=' + maxRm.toExponential(2));
  let maxRt = 0;
  h.r_true_kW.forEach((v) => { if (Math.abs(v) > maxRt) maxRt = Math.abs(v); });
  eq(maxRt, 0, '健康局 r_true 逐位 ≡ 0（定义恒等按构造——P_bat = P_load − P_fc,true 理想平衡源口径）');
  close(h.P_loss_stack_kW[0], 1.256507, 1e-6, '健康局 P_loss_stack(0)=1.256507 kW（§3.2 冻结值——P_loss_W=1256.507 W = 三损失项×50 A，EQ-FCEC-4 W 记账）');
  close(met2('healthy', 'SOC_true_end_pct'), 59.583333333333336, TOL2.SOC_pp, '健康局 SOC_true(60)=59.583333333333336 %（A-2(i)：与 L0 精确同恢复）');

  /* healthy 局 SOC_true/E_bat 与 L0 逐位同恢复（整定依据④生效证明——§3.3 ⑤：
     oracle 实测 dSOC_true=+0.0 pp / dE_bat=+2.8e-17 kWh 求和簿记级；引擎侧为
     子步梯形 vs L0 积分内核的簿记级差异，容差面断言） */
  close(met2('healthy', 'SOC_true_end_pct'), m(OUT.healthy, 'SOC_true_end_pct').value, 1e-9, '健康局 SOC_true on ↔ off 逐位同恢复（±1e-9 pp 簿记级——A-2(i)）');
  close(met2('healthy', 'E_bat_kWh') - m(OUT.healthy, 'E_bat_kWh').value, 0, 1e-12, '健康局 E_bat on ↔ off 差 ≤1e-12 kWh（dE_bat 簿记级——§3.3 ⑤）');

  /* monitor 恒等（FEC-6 镜像——b 不进物理回路的结构判据；四面 = 电化学物理面
     T_st/V_stack/P_loss_stack + on 域功率面 P_fc_true，601 点逐位 ===） */
  const mo2 = sig2('monitor_only');
  ['T_st_K', 'V_stack_V', 'P_loss_stack_kW', 'P_fc_true_kW'].forEach((sid) => {
    let brk = -1;
    for (let i = 0; i < 601; i++) { if (mo2[sid][i] !== h[sid][i]) { brk = i; break; } }
    eq(brk, -1, 'FEC-6 镜像：monitor ' + sid + ' ≡ healthy（601 点逐位——偏置不进物理回路）', '首个破坏点 @' + brk);
  });
  let gdT = 0;
  const gMon = golden2.runs.monitor_only.series;
  const gHea = golden2.runs.healthy.series;
  for (let i = 0; i < 601; i++) gdT = Math.max(gdT, Math.abs(gMon.T_st_K[i] - gHea.T_st_K[i]));
  eq(gdT, 0, 'golden 侧 monitor T_st 与 healthy 逐点恒等（FEC-6 max|ΔT|=0.0——§3.2 monitor 轨冻结判据）');

  /* 三故障角点（§3.2 分歧预填冻结值 + 方向 = Q5 整定/单调性域下的无条件结构推论，
     A-4 推导注：单调性项与漂移项同号——sign(V(I*)−400)=sign(50−I*)） */
  const sn = sig2('closed_loop_fault');
  const ld = sig2('load_step_closed_loop');
  const ac = sig2('actuator_closed_loop');
  close(sn.P_fc_true_kW[600], 16.206329, 1e-6, 'sensor 角点 P_fc(60)=16.206329 kW（§3.2 冻结预填——I→40 沿极化链回升，L0 线性不可见格点）');
  ok(sn.P_fc_true_kW[600] > 16, 'sensor 方向：on P_fc(60) > 16 kW（>16 ✓——裕度 +0.206，A-4 结构推论）');
  close(ld.P_fc_true_kW[600], 28.966331, 1e-6, 'load_step 角点 P_fc(60)=28.966331 kW（§3.2 冻结预填——I→75 极化压降增大，非线性爬升）');
  ok(ld.P_fc_true_kW[600] < 30, 'load 方向：on P_fc(60) < 30 kW（<30 ✓——裕度 −1.034，A-4 结构推论）');
  close(ac.P_fc_true_kW[600], 11.314880, 1e-6, 'actuator 角点 P_fc(60)=11.314880 kW（§3.2 冻结预填——钳位点沿极化链电压回升）');
  ok(ac.P_fc_true_kW[600] > 11, 'actuator 方向：on P_fc(60) > 11 kW（>11 ✓——裕度 +0.315，A-4 结构推论）');
  close(sn.T_st_K[600], 305.129, 1e-3, 'sensor T_st(60)=305.129 K（§3.2 冻结——降温恢复轨：T_ss(40 A)=304.7 K 渐近；印刷 3 位小数，容差 1e-3）');

  /* 跨深度分歧方向（L0 值 = OUT 既有 off 轨——同故障 L0↔L1 对比 = 教学点，ALINE §6.4）：
     sensor/actuator on > off（电压回升），load on < off（极化压降） */
  ok(sn.P_fc_true_kW[600] > OUT.closed_loop_fault.timeseries.signals.P_fc_true_kW[600],
    '跨深度 sensor：on P_fc(60) > L0 16 kW（极化回升方向，与 L0 线性外推分异）');
  ok(ld.P_fc_true_kW[600] < OUT.load_step_closed_loop.timeseries.signals.P_fc_true_kW[600],
    '跨深度 load_step：on P_fc(60) < L0 30 kW（级联尾 29.999998——极化压降方向）');
  ok(ac.P_fc_true_kW[600] > OUT.actuator_closed_loop.timeseries.signals.P_fc_true_kW[600],
    '跨深度 actuator：on P_fc(60) > L0 11 kW（钳位点电压回升方向）');

  /* A-5 记账基分歧（on 域 SOC_true/E_bat 按真实功率基重算——分歧行只对故障局登记，
     §3.2 A-5 行冻结预填：dSOC_true = +5.59e-3 pp / dE_bat = −2.24e-3 kWh） */
  close(met2('closed_loop_fault', 'SOC_true_end_pct'), 59.481147, 1e-6, 'A-5：sensor SOC_true(60)=59.481147 %（真实功率基——P_fc,true > 0.4·I ⇒ 放电少 ⇒ 偏高）');
  ok(met2('closed_loop_fault', 'SOC_true_end_pct') > m(OUT.closed_loop_fault, 'SOC_true_end_pct').value,
    'A-5 方向：sensor dSOC_true = +（on > off——+5.59e-3 pp 结构面）');
  ok(met2('closed_loop_fault', 'E_bat_kWh') < m(OUT.closed_loop_fault, 'E_bat_kWh').value,
    'A-5 方向：sensor dE_bat = −（on < off——−2.24e-3 kWh 同机理）');
})();

/* ================================================================== *
 * 12. off 轨不变量（§3.1 零变化硬条件——引擎面列集；fc001_v1 比对路径数值面
 *     由既有 §1 逐点承载，verify 层面已保，此处断言引擎面零漂移机检）
 * ================================================================== */
/* registry 冻结面（off 轨：既有 §0 RUNS 配置经 registry.createRun——run_hash 可重算零变化验收面） */
const REG1 = {};
Object.keys(RUNS).forEach((key) => {
  REG1[key] = FL.registry.createRun({ config: RUNS[key], runId: 'FC-OFF-REG-' + key });
});
Object.keys(OUT).forEach((key) => {
  const sigs = OUT[key].timeseries.signals;
  eq(Object.keys(sigs).length, 21, 'off 轨 ' + key + '：信号列集 21 列（SystemDef 既有面，无增长）');
  ok(sigs.T_st_K === undefined && sigs.V_stack_V === undefined && sigs.P_loss_stack_kW === undefined,
    'off 轨 ' + key + '：三新电化学列结构性缺席（makeSeries onTrackOnly 门控——timeseries.signals 逐字节不变 ⇒ off 轨 run_hash 零变化）');
  eq(RUNS[key].electrochem_model, 'off', 'off 轨 ' + key + '：cfg 缺省盖章 electrochem_model=off（normalizeConfig 补轨行——B-7 盖章双落点之一）');
  eq(FL.registry.verifyRunHash(REG1[key]), true, 'off 轨 ' + key + '：run_hash 可重算（零变化验收面）');
});
['FL-001', 'GT-001', 'PV-001', 'WT-001', 'MG-001'].forEach((sid) => {
  eq(core.createConfig(sid, {}).electrochem_model, undefined, sid + '：cfg 无 electrochem_model 键（未声明轨系统不盖章——scenario 键哈希零漂移面）');
});
close(OUT.closed_loop_fault.timeseries.signals.P_fc_true_kW[600], 16, 1e-9,
  'off 轨 sensor P_fc(60)=16 kW（L0 恒压口径 0.4·I——on 域极化链替换不渗入 off 轨数值面）');

/* ================================================================== *
 * 13. cfg→golden 分派断言（两门禁面②——acceptance.keyValues 分域，A-3② 定案：
 *     keyValues 现值 = off 轨（fc001_v1）专用冻结锚点；on 轨验收 keyValues 由
 *     fc001_v2 golden 承载，本键面不引用 off 轨锚点作 on 轨通过判据）
 * ================================================================== */
(function dispatchGolden() {
  const kv = FL.systems._raw.get('FC-001').acceptance.keyValues;
  /* off 轨域锚定：keyValues ↔ fc001_v1 冻结锚点（既有 §2 修复清单数值同源） */
  eq(kv.I_fc_true_end_A, 40, 'keyValues.I_fc_true_end_A=40（off 轨 fc001_v1 专用冻结锚点——G0-DEC-15 修复清单）');
  close(OUT.closed_loop_fault.timeseries.signals.I_fc_true_A[600], kv.I_fc_true_end_A, 1e-9,
    'keyValues I_fc_true_end_A ↔ off 轨 I(60) 锚定（±1e-9——τ_fc 过渡尾项收敛）');
  close(kv.SOC_true_end_pct, m(OUT.closed_loop_fault, 'SOC_true_end_pct').value, 1e-6,
    'keyValues SOC_true_end_pct ↔ off 轨（fc001_v1）锚定');
  eq(kv.r_meas_peak_kW, 4, 'keyValues.r_meas_peak_kW=4.0（off 轨 0.4·b 教学锚点）');
  close(kv.r_meas_peak_kW, m(OUT.closed_loop_fault, 'max_abs_r_meas_kW').value, 1e-9, 'keyValues r_meas_peak ↔ off 轨 max|r_meas| 锚定');
  eq(kv.P_fc_true_kW[0], 20, 'keyValues.P_fc_true_kW[0]=20（L0 线性 0.4·50——healthy 锚点）');
  eq(kv.P_fc_true_kW[1], 16, 'keyValues.P_fc_true_kW[1]=16（L0 线性 0.4·40——sensor 锚点）');
  eq(kv.E_load_kWh, 0.5, 'keyValues.E_load_kWh=0.5');
  eq(kv.E_fc_plus_E_bat_kWh, 0.5, 'keyValues.E_fc_plus_E_bat_kWh=0.5（定义恒等）');
  /* 分域生效数值面：on 轨不引用 off 轨 keyValues 作通过判据（on 轨验收由 fc001_v2
     golden 承载——on sensor P_fc=16.206 ≠ 16、SOC_true=59.481147 ≠ 59.4755556） */
  ok(Math.abs(OUT2.closed_loop_fault.timeseries.signals.P_fc_true_kW[600] - kv.P_fc_true_kW[1]) > 1e-6,
    '分域生效：on 轨 sensor P_fc(60)=16.206 ≠ keyValues 16（off 域锚点不作 on 轨判据——轨区分由 golden_id 承载）');
  ok(Math.abs(m(OUT2.closed_loop_fault, 'SOC_true_end_pct').value - kv.SOC_true_end_pct) > TOL2.SOC_pp,
    '分域生效：on 轨 sensor SOC_true ≠ keyValues 59.4755556（dSOC=+5.59e-3 pp ≫ SOC_pp 1e-5）');

  /* classify 分派面（Q1 定案 B——cfg 键分域、scope.js 结构零改动：on/off 配置同过
     既有四族条件，白名单扩张声明=「既有 Run 的分类永不静默改判」确认面） */
  eq(FL.scope.classify(RUNS2.closed_loop_fault), 'approved_fc', 'classify：on 轨配置 approved_fc（cfg 键分域——electrochem_model 不入 classify 校验）');
  eq(FL.scope.classify(RUNS.closed_loop_fault), 'approved_fc', 'classify：off 轨配置 approved_fc（既有分类零改判）');

  /* 轨区分承载面（B-3(a) 已知局限登记不静默：FC on/off 两轨 config_hash 同值，
     轨区分由 run_hash/序列内容承载；B-2 定案：model_hash 九键具名清单域外——
     electrochem additive 子对象不进 hashObject 输入 ⇒ model_hash 零变化；
     manifest/run_hash 走 registry 冻结面 REG2/REG1——core.simulate 输出不含 manifest） */
  ok(REG2.closed_loop_fault.manifest.run_hash !== REG1.closed_loop_fault.manifest.run_hash,
    '轨区分承载：on/off run_hash 互异（序列内容面——三新列 null↔数值）');
  eq(REG2.closed_loop_fault.manifest.model_hash, REG1.closed_loop_fault.manifest.model_hash,
    'B-2 定案：model_hash on == off（electrochem additive 子对象在九键哈希域外——既有输入零变化）');
  eq(REG2.closed_loop_fault.manifest.config_hash, REG1.closed_loop_fault.manifest.config_hash,
    'B-3(a) 已知局限登记：config_hash on == off（scenarioView 不投影 electrochem_model——schema.test.js 断言面）');
})();

/* ================================================================== *
 * 14. R-6 FC 电化学分派守卫（沿 R-5/R-7 先例命名——守卫号 grep 登记
 *     2026-11-13：R-2=FL actuator 逐位等价（engine.test FLEXT §2 项 1）/
 *     R-3=registry 不变量（registry.test）/ R-4=PV 分派（engine-pv）/
 *     R-5=MG 分派（engine-mg）/ R-6=FC 电化学分派（本文件——R-5…R-7 区间唯一
 *     空闲号）/ R-7=WT 分派（engine-wt）/ R-8=schema bounds 投影 + GT thermo
 *     源级分派（engine-gt）/ R-9=registry thermal 哈希面（registry.test）。
 *     FC001 规格 §9 风险表 R-1…R-9 为波次风险编号、非分派守卫号（engine-mg
 *     「规格在先登记号让位」体例——本轨规格未预登记分派号 ⇒ 取下一空闲号）。
 * ================================================================== */
(function electrochemDispatchGuard() {
  /* 源级守卫（engine-gt R-8 体例）：engine.js simulateFC001 顶部显式 early-return
     分派行在位——on 轨显式分派不被 plant/内联 L0 兜底吞掉 */
  const engineSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'engine.js'), 'utf8');
  ok(engineSrc.indexOf("if (cfg.electrochem_model === 'on') return simulateFC001Electrochem") !== -1,
    'R-6 源级：engine.js FC on 轨显式分派行在位（early-return 先于 plant/L0 路径，off 路径全量代码逐字不动）');
  ok(engineSrc.indexOf('FC001_ELECTROCHEM_G2B_SPEC_APPROVED') !== -1,
    'R-6 源级：分派链注释登记规格依据（FCECH-G2b-04 / CHG-20261113-01）');

  /* 数值面守卫（engine-wt R-7 体例——兜底物理不可能给出该值）：on 轨 healthy
     T_st(60)=308.966…（L0 无热状态列/无热物理，兜底分支给不出）+ 同故障跨深度
     轨区分数值面（off 线性 16.000 vs on 极化 16.206） */
  close(OUT2.healthy.timeseries.signals.T_st_K[600], 308.966317609, 1e-9,
    'R-6 数值面：on healthy T_st(60)=308.966317609 K（L0 兜底物理给不出——显式分派生效）');
  ok(Math.abs(OUT2.closed_loop_fault.timeseries.signals.P_fc_true_kW[600] -
    OUT.closed_loop_fault.timeseries.signals.P_fc_true_kW[600]) > 1e-3,
    'R-6 数值面：同故障 on/off P_fc(60) 分异 >1e-3 kW（16.206 vs 16.000——分派链路可判别）');
  eq(core.createConfig('FC-001', {}).electrochem_model, 'off',
    'R-6：cfg 缺省盖章 electrochem_model=off（normalizeConfig——缺省轨走 off 全量既有路径）');
  eq(FL.registry.verifyRunHash(REG2.healthy), true, 'R-6：on 轨 run_hash 可重算（冻结 + 完整性面）');

  /* 无外系统信号渗入（R-5「无 GT/FL/PV/WT 专属信号渗入」同构）：外系统信号目录
     中非 FC 既有目录成员的信号不在 on 轨 timeseries.signals 中——若分派链被绕过
     （静默落入他系统物理），信号面直接换轨 */
  const fcIds = {};
  FL.systems._raw.get('FC-001').signals.forEach((s) => { fcIds[s.id] = true; });
  const foreignIds = [];
  FL.systems._raw.all().forEach((s) => {
    if (s.id !== 'FC-001') s.signals.forEach((sg) => { if (!fcIds[sg.id]) foreignIds.push(sg.id); });
  });
  ok(foreignIds.length > 0, 'R-6：外系统信号清单非空（守卫面非平凡——' + foreignIds.length + ' 个外系统专属信号）');
  const leaked = foreignIds.filter((sid) => OUT2.healthy.timeseries.signals[sid] !== undefined);
  eq(leaked.length, 0, 'R-6：on 轨无 GT/FL/PV/WT/MG 专属信号渗入（分派未落入他系统兜底物理）', leaked.join(','));

  /* 盲面 + onTrackOnly 门控面（§1.3 盲包裁定：三新信号全非盲显、不入 blind 投影；
     makeSeries 门控 = off 轨零变化最高判据承载面） */
  const fcSigs = FL.systems._raw.get('FC-001').signals;
  eq(fcSigs.filter((s) => s.onTrackOnly).map((s) => s.id).join(','), 'T_st_K,V_stack_V,P_loss_stack_kW',
    'R-6：onTrackOnly 标记恰为三新信号（§1.3 三新信号 onTrackOnly——makeSeries 门控）');
  ['T_st_K', 'V_stack_V', 'P_loss_stack_kW'].forEach((sid) => {
    const sg = fcSigs.filter((s) => s.id === sid)[0];
    ok(!!sg && sg.exposure === 'public_demo' && sg.blindVisible === false,
      'R-6 盲面：' + sid + ' 全非盲显（public_demo / blindVisible=false——FC 在盲测池，默认 off ⇒ 盲包语义零变化）');
  });
})();

/* ================================================================== *
 * 15. electrochem_model 校验负例（结构化拒绝；非 FC 系统显式提供的结构化拒绝
 *     = scenario 层 declaresElectrochem 守卫——FL.core.scenario.parseScenario
 *     承载，scenario.test.js §10 负例组并行覆盖，此处机检一条入口面）
 * ================================================================== */
['dual', 42, null].forEach((badVal) => {
  const cfgBad = core.createConfig('FC-001', {});
  cfgBad.electrochem_model = badVal;
  const vBad = core.validateConfig(cfgBad);
  eq(vBad.ok, false, '负例：electrochem_model=' + String(badVal) + ' 被 validateConfig 拒（枚举 off|on，engine.js 电化学分支）');
  eq(vBad.errors[0].field, 'electrochem_model', '负例：拒绝字段 = electrochem_model（' + String(badVal) + '）');
});
eq(core.createConfig('FC-001', { electrochem_model: 'on' }).electrochem_model, 'on',
  '盖章面：显式 electrochem_model=on 保留（normalizeConfig 只补缺省）');
eq(core.createConfig('FC-001', { electrochem_model: 'off' }).electrochem_model, 'off',
  '盖章面：显式 electrochem_model=off 一致（盖章幂等）');
const negNonFc = FL.core.scenario.parseScenario({
  version: 1, system: 'FL-001',
  events: [{ key: 'ev1', family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20, feedback_mode: 'closed_loop', electrochem_model: 'on' }]
});
ok(negNonFc.ok === false && (negNonFc.errors || []).some((e) => String(e.field).indexOf('electrochem_model') !== -1),
  '负例：FL-001（未声明电化学轨）事件显式 electrochem_model → scenario 层结构化拒绝（declaresElectrochem 守卫）');

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('FC-001 引擎对解析 golden 全点比对通过（5 Run × 601 点：P1-06 修复清单 + FCEXT v1.1 扩展闭环 + FCECH-G2b-04 电化学 on 轨节 §9–§15）。');
