/* owner: core-engine | module: tests/engine-tl | contract: NEXT/TL001_FMU_G2B_SPEC_APPROVED.md v1.0
   （CHG-20261125-01 批准；轻量实现轮 CHG-20261125-02）
   TL-001 GT+TL 联合轨引擎 ↔ gt_tl_joint_v1 golden 一致性（oracle 只读生成，engine 只读比对）。
   运行：node tests/engine-tl.test.js；失败非零退出。
   覆盖：golden 身份面（Q7/Q12/Q13）+ 7 Run × 30 列逐点（T-B gate，`_rad`/`_rad_s` 键与
   verify_golden 分派同口径）+ 能量指标/标量 + 事件（line_fault/line_clear/actuator_clear）+
   质量检查零 fail + scope=extension_preview + run_hash 可重算且确定 + validateConfig 守卫
   （line_fault 仅 TL、持续时间网格/窗内）+ 分派守卫（TL 分支先于 GT 兜底，源级）+ Arena 排除 +
   F-1 域外角点登记面（sensor_drift 负净功）。
   joint_gt_standalone（线路断路器开断 P_elec≡0）为 oracle 侧守卫 Run（GLJ-5 ↔ gt001_v3 healthy
   逐位 0.0），引擎无「线路开断」配置面——不在本文件引擎映射内（Q8=(i) 载体 = oracle 自检）。 */
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

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'golden', 'gt_tl_joint_v1.json'), 'utf8'));
const tol = golden.tolerances.gate;

/* verify_golden.py series_limit T-B 分派同口径（含 `_rad_s`/`_rad` 条件支） */
function amax(arr) { let m = 0; arr.forEach((v) => { if (v !== null && Math.abs(v) > m) m = Math.abs(v); }); return m; }
function seriesLimit(sid, arr) {
  if (sid === 't') return tol.t_s;
  if (sid.endsWith('_Hz')) return tol.f_Hz_atol;
  if (sid.endsWith('_rpm')) return tol.n_rpm_atol;
  if (sid.endsWith('_K')) return tol.T_K_atol;
  if (sid.endsWith('_kPa')) return tol.p_kPa_atol;
  if (sid.endsWith('_rad_s')) return tol.omega_rad_s_atol;
  if (sid.endsWith('_rad')) return tol.delta_rad_atol;
  if (sid.indexOf('r_true') !== -1) return tol.r_true_kW;
  if (sid.endsWith('_kW')) return Math.max(tol.P_kW_atol, tol.P_kW_rtol * Math.max(1, amax(arr)));
  if (sid.startsWith('SOC') || sid.endsWith('_pct')) return tol.SOC_pp;
  return tol.f_Hz_atol;
}

/* ---------------- golden 身份面 ---------------- */
eq(golden.golden_id, 'gt_tl_joint_v1', 'golden_id = gt_tl_joint_v1（R-CS-04）');
eq(golden.model_id, 'gt.sync.tl.l0', 'golden model_id = gt.sync.tl.l0（Q12=(a)）');
eq(golden.model_provenance, 'fmu_l1_lumped_unvalidated', 'golden model_provenance（Q13=(b)）');
eq(golden.inertia_model, 'thermo', 'golden inertia_model = thermo（Q12 (i)）');
eq(golden.tolerances.gate.tier, 'T-B', 'gate tier T-B');
eq(Object.keys(golden.runs).length, 8, 'golden 8 Run（Q11=(a)）');
eq(Object.keys(golden.runs.joint_healthy.series).length, 30, 'golden 30 列（Q7=(a)）');
ok(typeof tol.delta_rad_atol === 'number' && typeof tol.omega_rad_s_atol === 'number', 'gate 声明 delta_rad_atol / omega_rad_s_atol（Q10）');

/* ---------------- Run 映射（7 Run；standalone 见文件头） ---------------- */
const RUNS = {
  joint_healthy: { load: 30, fault: { family: 'none' } },
  joint_load_step: { load: 30, fault: { family: 'load_step', params: { magnitude: 10 }, t_start_s: 20 } },
  joint_sensor_drift: { load: 30, fault: { family: 'sensor_drift', params: { magnitude: 0.3 }, t_start_s: 20 } },
  joint_actuator_fault: { load: 30, fault: { family: 'actuator_fault', params: { magnitude: 50 }, t_start_s: 20 } },
  joint_actuator_clear: { load: 30, fault: { family: 'actuator_fault', params: { magnitude: 50 }, t_start_s: 20, t_clear_s: 35 } },
  joint_monitor_only: { load: 30, fault: { family: 'sensor_drift', params: { magnitude: 0.3 }, t_start_s: 20 }, fb: 'monitor' },
  joint_line_fault: { load: 20, fault: { family: 'line_fault', params: { magnitude: 0.5 }, t_start_s: 20 } }
};
function mkCfg(rc) {
  return FL.core.createConfig('TL-001', { initial: { load_kW: rc.load }, fault: rc.fault, feedback_mode: rc.fb || 'closed_loop' });
}
const METRIC_MAP = ['E_load_kWh', 'E_source_kWh', 'E_bat_kWh', 'E_line_kWh', 'E_rotor_kWh', 'E_rotor_int_kWh',
  'E_fuel_kWh', 'eta_cycle_end_pct', 'max_abs_r_true_kW', 'max_abs_f_channel_diff_Hz', 'P_elec_end_kW'];

const runs = {};
let worstRel = 0;
Object.keys(RUNS).forEach((key) => {
  const rc = RUNS[key];
  const g = golden.runs[key];
  const run = FL.registry.createRun({ config: mkCfg(rc), runId: 'TL-GOLDEN-' + key });
  runs[key] = run;
  eq(run.systemId, 'TL-001', key + '：run.systemId = TL-001');
  eq(run.timeseries.t.length, golden.sampling.n, key + '：601 点');
  /* 序列逐点（30 列） */
  Object.keys(g.series).forEach((sid) => {
    const gs = g.series[sid];
    const es = sid === 't' ? run.timeseries.t : run.timeseries.signals[sid];
    if (!es) { ok(false, key + '：引擎缺列 ' + sid); return; }
    const lim = seriesLimit(sid, gs);
    let worst = 0;
    let at = -1;
    for (let i = 0; i < gs.length; i++) {
      const d = Math.abs(es[i] - gs[i]);
      if (!(d <= worst)) { worst = d; at = i; }
    }
    ok(worst <= lim, key + '：' + sid + ' ≤ ' + lim, 'max|diff| = ' + worst + ' @ i=' + at);
    worstRel = Math.max(worstRel, worst / Math.max(1, amax(gs)));
  });
  /* 能量指标（golden metrics 同名同口径） */
  METRIC_MAP.forEach((mid) => {
    const gm = g.metrics[mid];
    if (!gm) return;
    const m = run.metrics.find((x) => x.metric_id === mid);
    ok(!!m && m.value !== null, key + '：引擎指标 ' + mid + ' 可用');
    if (!m || m.value === null) return;
    const lim = gm.unit === 'kWh' ? tol.E_kWh : gm.unit === '%' ? tol.SOC_pp
      : gm.unit === 'Hz' ? tol.f_Hz_atol : Math.max(tol.P_kW_atol, tol.P_kW_rtol * Math.abs(gm.value));
    ok(Math.abs(m.value - gm.value) <= (mid === 'max_abs_r_true_kW' ? tol.r_true_kW : lim),
      key + '：指标 ' + mid, 'engine ' + m.value + ' vs golden ' + gm.value);
  });
  /* SOC 末值（scalars 面） */
  const socEnd = run.timeseries.signals.SOC_true_pct[golden.sampling.n - 1];
  ok(Math.abs(socEnd - g.scalars.SOC_true_end_pct) <= tol.SOC_pp, key + '：SOC_true_end_pct');
  /* 事件（类型/时刻/pre-post n_meas_rpm 与 golden 同） */
  eq(run.events.length, g.events.length, key + '：事件数');
  g.events.forEach((ge, i) => {
    const ee = run.events[i];
    if (!ee) return;
    eq(ee.event_type, ge.event_type, key + '：事件 ' + ge.event_id + ' 类型');
    eq(ee.trigger_s, ge.trigger_s, key + '：事件 ' + ge.event_id + ' 时刻');
    const snaps = run.snapshots.filter((s) => s.event_id === ee.event_id);
    eq(snaps.length, 2, key + '：事件 ' + ge.event_id + ' pre/post 两快照');
    ['pre', 'post'].forEach((ph, j) => {
      const sn = snaps.find((s) => s.phase === ph);
      const gv = ge.snapshots[j].variables;
      ok(sn && Math.abs(sn.variables.n_meas_rpm - gv.n_meas_rpm) <= tol.n_rpm_atol,
        key + '：' + ge.event_id + '-' + ph + ' n_meas_rpm');
      ok(sn && Math.abs(sn.variables.delta_rad - gv.delta_rad) <= tol.delta_rad_atol,
        key + '：' + ge.event_id + '-' + ph + ' delta_rad');
      ok(sn && Math.abs(sn.variables.P_elec_kW - gv.P_elec_kW) <= tol.P_kW_atol,
        key + '：' + ge.event_id + '-' + ph + ' P_elec_kW');
    });
  });
  /* 质量检查零 fail + scope + run_hash */
  const fails = run.quality.filter((q) => q.status === 'fail');
  ok(fails.length === 0, key + '：质量检查零 fail', fails.map((q) => q.check_id + ':' + q.message).join(' | '));
  ok(run.quality.some((q) => q.check_id === 'energy-balance' && q.status === 'pass'), key + '：energy-balance（含 E_line 项）pass');
  eq(run.manifest.scope, 'extension_preview', key + '：scope = extension_preview（§1.2）');
  eq(FL.registry.verifyRunHash(run), true, key + '：run_hash 可重算');
});
ok(worstRel <= 1e-9, '引擎↔oracle 全序列最大相对散差 ≤ 1e-9（实测登记）', String(worstRel));

/* ---------------- 确定性：同配置两次运行 run_hash 相同 ---------------- */
const lfA = FL.registry.createRun({ config: mkCfg(RUNS.joint_line_fault), runId: 'TL-DET-A' });
const lfB = FL.registry.createRun({ config: mkCfg(RUNS.joint_line_fault), runId: 'TL-DET-B' });
eq(lfA.manifest.run_hash, lfB.manifest.run_hash, 'line_fault 同配置两次 run_hash 相同（零墙钟）');

/* ---------------- 物理锚点（§3.1/§3.2） ---------------- */
const lf = runs.joint_line_fault.timeseries.signals;
ok(Math.abs(lf.delta_rad[0] - Math.asin(0.2)) <= 1e-15, 'line_fault δ₀ = arcsin(0.2)（Q3 出口基线）');
ok(Math.abs(lf.P_elec_kW[0] - 10) <= 1e-9, 'line_fault 初值 P_elec = 10 kW');
eq(lf.P_elec_kW[200], 0, 'line_fault 故障窗 post 行 P_elec = 0（p_elec_scale = 0）');
ok(lf.P_elec_kW[205] > 10, 'line_fault 清除后 P_elec 冲高（同步功率回拉）');
ok(Math.max.apply(null, lf.f_true_Hz) - 50 <= 1.0, 'line_fault |Δf| ≤ 1 Hz（故障窗域）');
const hl = runs.joint_healthy.timeseries.signals;
ok(hl.delta_rad.every((v) => v === 0) && hl.P_elec_kW.every((v) => v === 0), 'joint_healthy 零出口基线 δ ≡ 0、P_elec ≡ 0');
const ls = runs.joint_load_step.timeseries.signals;
ok(Math.abs(ls.delta_rad[600] * 180 / Math.PI - (-11.4)) < 0.1, 'load_step 终点 δ ≈ −11.4°（A2-2 精确恒等式预填）');
/* F-1 域外角点：无穷母线下 sensor_drift 频率被钳、调速器持续减燃料至负净功区 */
const sd = runs.joint_sensor_drift.timeseries.signals;
ok(Math.min.apply(null, sd.f_true_Hz) > 49.99, 'F-1：sensor_drift 真实频率被电网钳在 ≈50 Hz（无 49.7 Hz 滑差）');
ok(sd.P_gen_true_kW[600] < 0, 'F-1：sensor_drift 末值 P_gen < 0（负净功外推区——登记角点）');
const tlDef = FL.systems.get('TL-001');
ok(tlDef.model.limitations.some((s) => s.indexOf('F-1') !== -1), 'F-1 已写入 TL-001 limitations（诚实登记）');

/* ---------------- 因果链 ---------------- */
const lfCausal = runs.joint_line_fault.causal;
eq(lfCausal.nodes.length, 5, 'line_fault 因果链 5 节点');
ok(lfCausal.headline.indexOf('功角') !== -1 && lfCausal.headline.indexOf('—') === -1, 'line_fault 因果 headline 占位符全部解析', lfCausal.headline);

/* ---------------- validateConfig 守卫 ---------------- */
function rejects(sid, patch, field, name) {
  const cfg = FL.core.createConfig(sid, patch);
  const v = FL.core.validateConfig(cfg);
  ok(!v.ok && v.errors.some((e) => e.field === field), name, JSON.stringify(v.errors));
}
rejects('GT-001', { fault: { family: 'line_fault', params: {}, t_start_s: 20 } }, 'fault.family', 'GT-001 拒绝 line_fault 族（TL 专属）');
rejects('TL-001', { fault: { family: 'line_fault', params: { magnitude: 0.15 }, t_start_s: 20 } }, 'fault.params.magnitude', 'line_fault 持续时间须落 0.1 s 网格');
rejects('TL-001', { fault: { family: 'line_fault', params: { magnitude: 1.0 }, t_start_s: 59 } }, 'fault.params.magnitude', 'line_fault 清除时刻须早于 duration（或 t_start 越界）');
const defCfg = FL.core.createConfig('TL-001', {});
eq(defCfg.fault.family, 'line_fault', 'TL-001 默认故障族 = line_fault（主实验）');
eq(defCfg.initial.load_kW, 20, 'TL-001 默认负载 20 kW（Q3 出口基线）');
eq(defCfg.inertia_model, undefined, 'TL-001 配置不携带 inertia_model（恒 thermo 热力链，无轨选择面）');

/* ---------------- 源级守卫 ---------------- */
const engineSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'engine.js'), 'utf8');
const iTl = engineSrc.indexOf("else if (system.id === 'TL-001') sim = simulateTL001(system, cfg, t);");
const iGt = engineSrc.indexOf('else sim = simulateGT001(system, cfg, t);');
ok(iTl !== -1 && iGt !== -1 && iTl < iGt, '分派守卫：TL-001 显式分支先于 GT 兜底（禁止静默落入 GT 独立物理）');
const arenaSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'pages', 'arena.js'), 'utf8');
ok(arenaSrc.indexOf("const ARENA_EXCLUDED = ['TL-001'];") !== -1, 'Arena 排除 TL-001（§2.4 不入盲测池）');
const systemsSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'systems.js'), 'utf8');
const unitsBlock = systemsSrc.slice(systemsSrc.indexOf('var UNITS = {'), systemsSrc.indexOf('};', systemsSrc.indexOf('var UNITS = {')));
ok(unitsBlock.indexOf("'rad'") === -1, 'systems.js UNITS 未增 rad（UNITS 进入 model_hash——改动会扰动全系统 run_hash）');

console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '' : '  ✓'));
if (fail) {
  console.log('FAILURES:');
  failures.slice(0, 40).forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('TL-001 联合轨引擎↔gt_tl_joint_v1 golden 一致性测试全部通过（7 Run × 30 列 T-B gate + 指标/事件/质量/scope/哈希 + 守卫 + F-1 登记面；引擎↔oracle 最大相对散差 ' + worstRel.toExponential(2) + '）。');
