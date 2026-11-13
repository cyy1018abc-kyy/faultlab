/* owner: core-engine | module: tests/engine-mg | contract: MG001_G2B_SPEC_APPROVED v1.0 §3/§4
   + V110_WAVE_DESIGN（CHG-20261110-01 批准链）/ R-5 守卫 / V110 DEC-5 run-g2 第 35 步
   MG-001 引擎 ↔ golden 一致性（oracle 只读生成，engine 只读比对，G0-DEC-16）。
   运行：node tests/engine-mg.test.js；失败非零退出。
   覆盖：
     1. golden 5 Run 全序列逐点（gate T-A 容差分类映射——verify_golden.py T-A series_limit
        支路同构）+ scalars 全量复算对 golden（37/44 键：能量账本八键取 MG 指标补全块、
        SOC 三键取通用指标、采样点键取序列、35pre 相位键取 EV-002-pre 快照）
        + golden metrics 块 V-08 同构核对（14 项锚定——oracle 独立子集 `_60s`/`_end_kW`
        惯例，其值与 scalars/引擎指标面同源）；
     2. P_bess_chase_kW 事件域 null 布局（唯一事件域 null 列——岛窗外 null：四并网 Run
        全程 601 null、island 岛窗 200..349 有值/其余 451 null，逐位核对）；
     3. A(healthy)/B(load_step)/C(shading)/D(gust)/E(island) 锚点断言（规格 §3.1–§3.3 表列
        值与容差）+ 健康局恒等不变量（§3.4）+ 判别性恒等 r_true/r_meas ≡ 0 逐点（§3.3）
        + MS-2 二次恒等式（能量账本两式 ≤1e-9 kWh）+ 分段常值断言（MS-7/EQ-MG-7 前提——
        相位内 P_bess/P_shed/P_dump 漂移 ≡ 0）；
     4. 四族闭环 vs 仅监测逐位等价（MS-5：load_step/shading_link/gust_link/island_event
        ——物理输入两模式同解；monitor Run 不重复入 golden，§4 项 2）；
     5. MG-IMP-Q1 reject 断言（load_kW/p_sched_kW/SOC_pct 越域各一负例，结构化 ConfigError）
        + island_event 零参数族 params:{} 合法（Q2 定案）+ t_clear_s 缺省窗末持续脱离单事件面；
     6. MG 分派守卫（R-5）：MG 配置走 MG 轨（EQ-MG-3 聚合代数数值面 + 分派元数据）+
        无 GT/FL/PV/WT 专属信号渗入。守卫号登记（grep 结论，沿 R-7 先例惯例）：
        R-4=PV 分派（engine-pv）/ R-5=MG 分派（MG001 规格 §9 风险表 R-5 行 + engine.js
        simulate 分派链 MG 分支注释，W5 已登记）/ R-7=WT 分派（engine-wt）/
        R-8=schema bounds 投影 + GT thermo 源级分派（engine-gt）——MG 沿规格已登记的
        R-5，engine-mg 断言即其测试面（「下一个空闲号」让位于规格在先登记号）。
   事件面口径（§2.4/V-09）：island Run 双事件快照（脱离 EV-001 @20 + 重连 EV-002 @35，
   各 pre/post 一对——gt001 actuator_clear 先例）；快照相位值逐位比较（引擎与 oracle 在
   全部快照变量上实测逐位一致——healthy/load_step 全序列亦逐位，shading/gust 仅 P_pv/P_wt
   源轨通道存在 ≤4e-14 ulp 级末位差，快照聚合面无源轨通道）；golden 快照 14 变量集
   ⊂ 引擎 18 变量集（引擎另含 V_bus_V/SOC_est_pct/SOC_err_pp/r_meas_kW 四通道）。
   MG Run quality：sampling（P_bess_chase_kW 事件域 null 列豁免——checks.js MG 键控分支，
   I_bat_cap_A/beta_stuck_deg 先例同构）/conservation-true/conservation-meas（r ≡ 0，
   EQ-MG-6）/units（'-' 声明面——checks.js MG 键控补充，复用既有字典零新增）/event-window
   全部 pass；soc-bounds/energy-balance 不派发（MG bounds 刻意无 SOC_pct 键——SystemDef
   登记面，bounds 派生分派既有机制自动覆盖，PV/WT 同款口径）。 */
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
/* golden 装载与 Run 配置（键面按 golden.runs 遍历，同 engine-pv/wt 先例）*/
/* ================================================================== */
const GOLDEN_PATH = path.join(__dirname, '..', 'data', 'golden', 'mg001_v1.json');
const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
const tol = golden.tolerances.gate;
eq(golden.golden_id, 'mg001_v1', 'golden id=mg001_v1');
eq(golden.tolerances.gate.tier, 'T-A', 'gate tier=T-A（§4 项 6：聚合层全闭式 + 源轨复用同权）');
eq(golden.model_id, 'MG-001', 'golden model_id=MG-001');
eq(golden.model_version, '1.0.0', 'golden model_version=1.0.0（三段式 v2 归一样式）');
eq(golden.method_id, 'mg001_aggregate_analytic', 'golden method_id（聚合全闭式 + 源轨复用）');
/* 冻结参数面（§1.2 固定面：PV G0=1000、WT v0=9、load 30、p_sched +5、SOC0 60） */
eq(golden.config.duration_s, 60, 'golden duration 60 s');
eq(golden.config.dt_s, 0.1, 'golden dt 0.1 s');
eq(golden.config.fault_time_s, 20, 'golden 故障时刻 20 s');
eq(golden.config.t_clear_s, 35, 'golden 重连时刻 t_clear=35 s（island Run）');
eq(golden.config.load_kW, 30, 'golden load_kW=30');
eq(golden.config.p_sched_kW, 5, 'golden p_sched_kW=+5（Q5 定案默认）');
eq(golden.config.soc0_pct, 60, 'golden soc0_pct=60');
eq(golden.sampling.n, 601, 'golden 601 点（n=duration/dt+1）');

/* 五 Run 故障面（§4 项 2：monitor Run 不重复入 golden——第 4 节 MS-5 面承载） */
const RUNS_CFG = {
  healthy: null,
  load_step_closed_loop: { family: 'load_step', params: { magnitude: 10 } },
  pv_shading_closed_loop: { family: 'shading_link', params: { magnitude: 300 } },
  wt_gust_closed_loop: { family: 'gust_link', params: { magnitude: 2 } },
  island_reconnect: { family: 'island_event', params: {} }
};
function mkFault(f) {
  if (!f) return { family: 'none' };
  return Object.assign({ t_start_s: 20 }, f,
    f.family === 'island_event' ? { t_clear_s: golden.config.t_clear_s } : {});
}

/* gate T-A 容差分类映射（序列）——scripts/verify_golden.py T-A series_limit 支路同构：
   - r_true/r_meas：定义恒等 ≡ 0（EQ-MG-6），沿 engine-pv.test.js r_true 专键 1e-12 先例
     路由（golden 序列恒 0.00e+00，实测逐位，容差仅作对齐声明）；
   - SOC_*（pct/pp）→ SOC_pp（verify_golden T-A startswith('SOC') 支路同构）；
   - _kW → P 相对类按点幅值（max(P_kW_atol, P_kW_rtol·|gref|)）；
   - island_state/V_bus_V 无后缀类 → 缺省 1e-9（verify_golden T-A fall-through 同构；
     两列均为整值网格精确列，实测逐位）。 */
function seriesLimit(sid, gref) {
  if (sid === 't') return tol.t_s;
  if (sid === 'r_true_kW' || sid === 'r_meas_kW') return tol.r_true_kW;
  if (sid.indexOf('SOC') === 0) return tol.SOC_pp;
  if (sid.slice(-3) === '_kW') return Math.max(tol.P_kW_atol, tol.P_kW_rtol * Math.abs(gref));
  return 1e-9;
}
/* gate T-A 容差分类映射（scalars）：kW·s 类同测度并入对应键（同 engine-wt 先例形态） */
function scalarLimit(key, gval) {
  if (key.indexOf('_kWh') !== -1) return tol.E_kWh;
  if (key.indexOf('SOC') === 0) return tol.SOC_pp;
  if (key.indexOf('t_') === 0) return tol.t_s;
  if (key.indexOf('max_abs_r') === 0) return tol.r_true_kW;
  if (key.indexOf('island_state') === 0) return 1e-9;
  return Math.max(tol.P_kW_atol, tol.P_kW_rtol * Math.abs(gval));
}

/* golden metrics 块 id → 引擎值源（oracle 独立子集 `_60s`/`_end_kW` 惯例与引擎指标/序列
   面同源的锚定表——能量八键取 MG 指标补全块、端点四键取序列末采样、残差极值取指标） */
const GOLDEN_METRIC_TO_SOURCE = {
  E_pv_60s: { kind: 'metric', id: 'E_pv_kWh' },
  E_wt_60s: { kind: 'metric', id: 'E_wt_kWh' },
  E_bess_60s: { kind: 'metric', id: 'E_bess_kWh' },
  E_grid_60s: { kind: 'metric', id: 'E_grid_kWh' },
  E_load_served_60s: { kind: 'metric', id: 'E_load_served_kWh' },
  E_load_demand_60s: { kind: 'metric', id: 'E_load_demand_kWh' },
  E_shed_60s: { kind: 'metric', id: 'E_shed_kWh' },
  E_dump_60s: { kind: 'metric', id: 'E_dump_kWh' },
  P_pv_end_kW: { kind: 'series', id: 'P_pv_kW' },
  P_wt_end_kW: { kind: 'series', id: 'P_wt_kW' },
  P_bess_end_kW: { kind: 'series', id: 'P_bess_kW' },
  P_grid_true_end_kW: { kind: 'series', id: 'P_grid_true_kW' },
  P_load_served_end_kW: { kind: 'series', id: 'P_load_served_kW' },
  max_abs_r_true_kW: { kind: 'metric', id: 'max_abs_r_true_kW' }
};

/* 引擎侧复算 golden scalars（并网 Run 37 项 / island 44 项）：
   能量账本八键 + SOC 三键 + 残差极值两键取指标；采样点键取序列（后缀=采样时刻，
   P_pv_true／P_wt_true 系键基信号 = 聚合面 P_pv_kW/P_wt_kW 复用列，EQ-MG-2）；
   island 35pre 三键取 EV-002-pre 快照（left_limit 相位值不落常规采样行）。 */
function deriveScalars(run) {
  const sig = run.timeseries.signals;
  const t = run.timeseries.t;
  const met = {};
  run.metrics.forEach((m) => { met[m.metric_id] = m.value; });
  const islPre = run.snapshots.find((s) => s.snapshot_id === 'EV-002-pre');
  return {
    E_pv_kWh: met.E_pv_kWh,
    E_wt_kWh: met.E_wt_kWh,
    E_bess_kWh: met.E_bess_kWh,
    E_grid_kWh: met.E_grid_kWh,
    E_load_served_kWh: met.E_load_served_kWh,
    E_shed_kWh: met.E_shed_kWh,
    E_dump_kWh: met.E_dump_kWh,
    E_load_demand_kWh: met.E_load_demand_kWh,
    SOC_true_end_pct: met.SOC_true_end_pct,
    SOC_est_end_pct: met.SOC_est_end_pct,
    SOC_err_end_pp: met.SOC_err_pp,
    max_abs_r_true_kW: met.max_abs_r_true_kW,
    max_abs_r_meas_kW: met.max_abs_r_meas_kW,
    t_19p9_s: t[199],
    P_grid_true_19p9_kW: sig.P_grid_true_kW[199],
    P_bess_19p9_kW: sig.P_bess_kW[199],
    P_grid_true_20post_kW: sig.P_grid_true_kW[200],
    P_bess_20post_kW: sig.P_bess_kW[200],
    P_bess_chase_20post_kW: sig.P_bess_chase_kW[200],
    P_shed_20post_kW: sig.P_shed_kW[200],
    P_load_demand_20post_kW: sig.P_load_demand_kW[200],
    P_load_served_20post_kW: sig.P_load_served_kW[200],
    island_state_20post: sig.island_state[200],
    P_grid_true_21p5_kW: sig.P_grid_true_kW[215],
    P_load_served_21p5_kW: sig.P_load_served_kW[215],
    P_grid_true_26_kW: sig.P_grid_true_kW[260],
    P_pv_true_20post_kW: sig.P_pv_kW[200],
    P_pv_true_20p1_kW: sig.P_pv_kW[201],
    P_pv_true_21_kW: sig.P_pv_kW[210],
    P_pv_true_60_kW: sig.P_pv_kW[600],
    P_wt_true_20post_kW: sig.P_wt_kW[200],
    P_wt_true_21_kW: sig.P_wt_kW[210],
    P_wt_true_26_kW: sig.P_wt_kW[260],
    P_wt_true_60_kW: sig.P_wt_kW[600],
    P_grid_true_60_kW: sig.P_grid_true_kW[600],
    P_bess_60_kW: sig.P_bess_kW[600],
    P_load_served_60_kW: sig.P_load_served_kW[600],
    /* island 44 项追加（35pre = EV-002-pre 快照相位值；35post = i350 采样行） */
    island_state_35pre: islPre ? islPre.variables.island_state : undefined,
    island_state_35post: sig.island_state[350],
    P_grid_true_35post_kW: sig.P_grid_true_kW[350],
    P_bess_35post_kW: sig.P_bess_kW[350],
    P_bess_chase_35pre_kW: islPre ? islPre.variables.P_bess_chase_kW : undefined,
    P_bess_chase_35post_kW: sig.P_bess_chase_kW[350],
    P_shed_35pre_kW: islPre ? islPre.variables.P_shed_kW : undefined
  };
}

/* ================================================================== */
/* 1. golden 5 Run：全序列（gate T-A）+ null 布局 + scalars 全量 + 事件面 */
/* ================================================================== */
const trackRuns = {};
Object.keys(golden.runs).forEach((runKey) => {
  const g = golden.runs[runKey];
  const cfg = FL.core.createConfig('MG-001', { fault: mkFault(RUNS_CFG[runKey]), feedback_mode: 'closed_loop' });
  const run = FL.registry.createRun({ config: cfg, runId: 'MG-GOLDEN-' + runKey });
  trackRuns[runKey] = run;
  const n = golden.sampling.n;
  const isIsland = runKey === 'island_reconnect';

  /* 配置面：引擎配置与 golden config 键面同源（duration/dt/故障时刻/初值/幅值/t_clear） */
  eq(run.systemId, 'MG-001', runKey + '：run.systemId=MG-001');
  eq(cfg.duration_s, golden.config.duration_s, runKey + '：duration 60 s');
  eq(cfg.dt_s, golden.config.dt_s, runKey + '：dt 0.1 s');
  eq(run.timeseries.t.length, n, runKey + '：601 点（n=duration/dt+1）');
  eq(cfg.initial.load_kW, golden.config.load_kW, runKey + '：load_kW=30');
  eq(cfg.initial.p_sched_kW, golden.config.p_sched_kW, runKey + '：p_sched_kW=+5（Q5 定案默认）');
  eq(cfg.initial.SOC_pct, golden.config.soc0_pct, runKey + '：SOC0=60');
  if (runKey !== 'healthy') {
    eq(cfg.fault.t_start_s, golden.config.fault_time_s, runKey + '：故障时刻 20 s');
    eq(cfg.fault.family, RUNS_CFG[runKey].family, runKey + '：故障族=' + RUNS_CFG[runKey].family);
  } else {
    eq(cfg.fault.family, 'none', runKey + '：健康局无故障族');
  }
  if (runKey === 'load_step_closed_loop') {
    eq(cfg.fault.params.magnitude, golden.config.load_step_dP_kW, runKey + '：负荷阶跃幅值 +10 kW');
  }
  if (runKey === 'pv_shading_closed_loop') {
    eq(cfg.fault.params.magnitude, golden.config.shading_dg_W_m2, runKey + '：遮挡降幅 300 W/m²（注入子轨）');
  }
  if (runKey === 'wt_gust_closed_loop') {
    eq(cfg.fault.params.magnitude, golden.config.gust_dv_ms, runKey + '：阵风增幅 +2 m/s（注入子轨）');
  }
  if (isIsland) {
    eq(cfg.fault.t_clear_s, golden.config.t_clear_s, runKey + '：t_clear_s=35 s（重连时刻）');
  }

  /* 全序列逐点（golden 19 序列 ∩ 引擎序列；t 列取 run.timeseries.t）。
     注：healthy/load_step 全序列与 golden 逐位一致；shading/gust 仅 P_pv_kW/P_wt_kW
     源轨通道存在引擎子步精确指数 vs oracle 段长闭式的浮点差（实测 ≤4.0e-14，PV/WT
     源 golden 同源量级），断言面 = 逐点 ≤ gate T-A 分类容差（§4 项 6）。 */
  let over = 0;
  let worstAbs = 0;
  let worstRel = 0;
  let worstAt = '';
  const missing = [];
  Object.keys(g.series).forEach((sid) => {
    const mine = sid === 't' ? run.timeseries.t : run.timeseries.signals[sid];
    if (!mine || mine.length !== n) { missing.push(sid); return; }
    for (let i = 0; i < n; i++) {
      const gref = g.series[sid][i];
      if (gref === null || mine[i] === null) {
        if (gref !== mine[i]) over++; /* null 布局逐位（P_bess_chase_kW 事件域列） */
        continue;
      }
      const d = Math.abs(gref - mine[i]);
      if (d > worstAbs) { worstAbs = d; }
      const rel = gref !== 0 ? d / Math.abs(gref) : d;
      if (rel > worstRel) { worstRel = rel; worstAt = sid + '[' + i + '] Δ=' + d.toExponential(2); }
      if (d > seriesLimit(sid, gref)) { over++; }
    }
  });
  eq(missing.length, 0, runKey + '：golden 19 序列在引擎中齐备（含 t 列，§4 项 4 SERIES_IDS）', missing.join(','));
  ok(over === 0, runKey + '：序列逐点 ≤ gate T-A 容差（超差 0 点；最大绝对偏差 ' +
    worstAbs.toExponential(2) + '，最差相对 ' + worstRel.toExponential(2) + ' @ ' + worstAt + '）');

  /* P_bess_chase_kW null 布局（唯一事件域 null 列——岛窗外 null，I_bat_cap_A/
     beta_stuck_deg 事件域 null 先例）：并网 Run 全程 601 null；island Run 岛窗
     [20.0, 35.0) 采样行 i200..i349 有值（chase = load − P_pv − P_wt）、其余 451 null。 */
  const chase = run.timeseries.signals.P_bess_chase_kW;
  let nullCount = 0;
  let nonNullMin = -1;
  let nonNullMax = -1;
  chase.forEach((v, i) => {
    if (v === null) nullCount++;
    else { if (nonNullMin === -1) nonNullMin = i; nonNullMax = i; }
  });
  if (isIsland) {
    eq(nullCount, 451, runKey + '：chase null 布局 451（岛窗外）');
    eq(nonNullMin, 200, runKey + '：chase 首个非 null @i200（t=20.0 起脱离）');
    eq(nonNullMax, 349, runKey + '：chase 末个非 null @i349（t=35.0 右开边界——i350 恢复 null）');
  } else {
    eq(nullCount, 601, runKey + '：chase 全程 601 null（并网面无填补目标暴露）');
    eq(nonNullMin, -1, runKey + '：chase 无非 null 点');
  }

  /* scalars 全量（37/44 项）：引擎复算 vs golden（null 键要求引擎侧 null 逐位） */
  const S = g.scalars;
  const D = deriveScalars(run);
  const badS = [];
  Object.keys(S).forEach((key) => {
    if (!(key in D)) { badS.push(key + ' 未复算'); return; }
    if (S[key] === null || D[key] === null) {
      if (S[key] !== D[key]) badS.push(key + ' null 布局不一致：golden ' + S[key] + ' vs engine ' + D[key]);
      return;
    }
    const d = Math.abs(D[key] - S[key]);
    if (!(d <= scalarLimit(key, S[key]))) badS.push(key + ' ' + D[key] + ' vs ' + S[key]);
  });
  eq(Object.keys(S).length, isIsland ? 44 : 37, runKey + '：golden scalars 面 ' + (isIsland ? 44 : 37) + ' 项');
  eq(badS.length, 0, runKey + '：scalars 全量对 golden（gate T-A 分类容差 + null 逐位）', badS.join(' | '));

  /* golden metrics 块 V-08 同构核对（14 项锚定）：
     容差镜像 verify_golden T-A metric_within——kWh 类 close_within(rtol 1e-12, atol
     E_kWh)、kW 类 P 相对类、max_abs_r_true 专键 r_true_kW。 */
  const met = {};
  run.metrics.forEach((m) => { met[m.metric_id] = m.value; });
  const gmBad = [];
  Object.keys(g.metrics).forEach((mid) => {
    const src = GOLDEN_METRIC_TO_SOURCE[mid];
    if (!src) { gmBad.push(mid + ' 无映射'); return; }
    const fv = src.kind === 'series' ? run.timeseries.signals[src.id][600] : met[src.id];
    if (fv === undefined || fv === null) { gmBad.push(mid + ' 引擎值缺失'); return; }
    const gv = g.metrics[mid].value;
    const lim = (g.metrics[mid].unit === 'kWh') ? Math.max(tol.E_kWh, 1e-12 * Math.abs(gv))
      : (mid.indexOf('max_abs_r_true') === 0) ? tol.r_true_kW
        : Math.max(tol.P_kW_atol, tol.P_kW_rtol * Math.abs(gv));
    if (!(Math.abs(fv - gv) <= lim)) gmBad.push(mid + ' ' + fv + ' vs ' + gv);
  });
  eq(Object.keys(g.metrics).length, 14, runKey + '：golden metrics 块 14 项');
  eq(gmBad.length, 0, runKey + '：golden metrics 块 V-08 同构核对（14 项锚定）', gmBad.join(','));

  /* 事件面：healthy 无事件；并网故障局 1 事件；island 双事件（EV-001 @20 脱离 +
     EV-002 @35 重连——各 pre/post 一对，gt001 actuator_clear 349/350 先例）。
     golden 快照 14 变量集逐位（含 P_bess_chase_kW null 相位；fault_id 承载于快照行）。 */
  const gEvents = g.events || [];
  if (runKey === 'healthy') {
    eq(run.events.length, 0, runKey + '：健康局无事件');
  } else if (!isIsland) {
    eq(run.events.length, 1, runKey + '：1 事件');
    const ge = gEvents[0];
    const fe = run.events[0];
    eq(fe.trigger_s, ge.trigger_s, runKey + '：事件时刻 20 s');
    eq(fe.event_type, ge.event_type, runKey + '：event_type=' + ge.event_type + '（MG 族名）');
    eq(fe.target_signal, ge.target_signal, runKey + '：target_signal=' + ge.target_signal + '（注入点通道）');
    eq(fe.magnitude, ge.magnitude, runKey + '：事件幅值与 golden 同源');
    eq(fe.unit, ge.unit, runKey + '：事件单位与 golden 同源');
    eq(cfg.fault.faultId, ge.snapshots[0].fault_id, runKey + '：目录 faultId 与 golden 同源（' + ge.snapshots[0].fault_id + '）');
  } else {
    eq(run.events.length, 2, runKey + '：双事件（脱离 + 重连）');
    eq(gEvents[0].event_id, 'EV-001', runKey + '：golden EV-001 事件 id');
    eq(gEvents[1].event_id, 'EV-002', runKey + '：golden EV-002 事件 id');
    const fe1 = run.events[0];
    const fe2 = run.events[1];
    eq(fe1.event_id, 'EV-001', runKey + '：引擎 EV-001 事件 id');
    eq(fe2.event_id, 'EV-002', runKey + '：引擎 EV-002 事件 id');
    eq(fe1.trigger_s, 20, runKey + '：脱离时刻 20 s');
    eq(fe2.trigger_s, golden.config.t_clear_s, runKey + '：重连时刻 35 s（=t_clear_s）');
    eq(fe1.event_type, gEvents[0].event_type, runKey + '：EV-001 event_type=' + gEvents[0].event_type);
    eq(fe2.event_type, gEvents[1].event_type, runKey + '：EV-002 event_type=' + gEvents[1].event_type + '（重连域事件）');
    eq(fe1.target_signal, 'island_state', runKey + '：注入点 = island_state（拓扑信号）');
    eq(fe2.target_signal, 'island_state', runKey + '：重连注入点 = island_state');
  }
  if (gEvents.length) {
    const snapBad = [];
    const varCountBad = [];
    gEvents.forEach((ge) => {
      eq(ge.snapshots.length, 2, runKey + '：' + ge.event_id + ' pre/post 快照成对');
      ge.snapshots.forEach((gs) => {
        const es = run.snapshots.find((s) => s.snapshot_id === gs.snapshot_id);
        if (!es) { snapBad.push(gs.snapshot_id + ' 不可达'); return; }
        eq(es.t_s, gs.t_s, runKey + '：' + gs.snapshot_id + ' t_s=' + gs.t_s + '（行位=t_f）');
        eq(es.derivation, gs.derivation, runKey + '：' + gs.snapshot_id + ' derivation=' + gs.derivation);
        eq(es.fault_id, gs.fault_id, runKey + '：' + gs.snapshot_id + ' fault_id=' + gs.fault_id + '（目录 id）');
        if (Object.keys(gs.variables).length !== 14) varCountBad.push(gs.snapshot_id);
        Object.keys(gs.variables).forEach((vid) => {
          const gv = gs.variables[vid];
          const mv = es.variables[vid];
          /* 快照相位值逐位（实测引擎与 oracle 全快照变量逐位一致——聚合面无源轨通道；
             null 通道（P_bess_chase_kW 岛窗外）同样逐位） */
          if (gv === null || mv === null) { if (gv !== mv) snapBad.push(gs.snapshot_id + '.' + vid + ' null 相位不一致'); return; }
          if (gv !== mv) snapBad.push(gs.snapshot_id + '.' + vid + ' ' + mv + ' vs ' + gv);
        });
      });
    });
    eq(varCountBad.length, 0, runKey + '：golden 快照 14 变量集（V-09 首事件面）', varCountBad.join(','));
    eq(snapBad.length, 0, runKey + '：pre/post 快照相位值与 golden 逐位一致（含 null 相位）', snapBad.join(','));
  }
});

/* ================================================================== */
/* 2. A–E 锚点（§3.1–§3.3）+ 健康局恒等 + 恒等式 + 分段常值（§3.3/§3.4） */
/* ================================================================== */
(function anchors() {
  const sig = (k) => trackRuns[k].timeseries.signals;
  const met = (k, id) => trackRuns[k].metrics.find((m) => m.metric_id === id).value;
  const specP = 0.05;   /* P 锚点容差 ±0.05 kW（§3.1–§3.3） */
  const specT = 0.001;  /* 瞬态采样锚点容差 ±0.001 kW */
  const specE = 0.0005; /* E 锚点容差 ±0.0005 kWh */
  const specS = 1e-4;   /* SOC 锚点容差 ±1e-4 pp */
  const specR = 1e-12;  /* r ≤1e-12 kW（§3.3 判别性恒等） */
  const specId = 1e-9;  /* 恒等式/零导入角点 ≤1e-9（§3.2 D 行声明 / §3.4 二次恒等） */
  const n = golden.sampling.n;

  /* 健康局（H）恒等不变量（§3.4）：P_pv≡10 / P_wt≡10 / P_bess≡5 / P_grid≡5 /
     P_served≡30 / P_shed=P_dump≡0 / island_state≡0 / SOC 线性 / SOC_err≡0 / r≡0 */
  (function healthyIdentity() {
    const h = sig('healthy');
    let pvBreak = -1;
    let wtBreak = -1;
    let bessBreak = -1;
    let gridBreak = -1;
    let servedBreak = -1;
    let shedBreak = -1;
    let dumpBreak = -1;
    let islBreak = -1;
    let socErrBreak = -1;
    let socLinMax = 0;
    for (let i = 0; i < n; i++) {
      if (h.P_pv_kW[i] !== 10 && pvBreak === -1) pvBreak = i;
      if (h.P_wt_kW[i] !== 10 && wtBreak === -1) wtBreak = i;
      if (h.P_bess_kW[i] !== 5 && bessBreak === -1) bessBreak = i;
      if (h.P_grid_true_kW[i] !== 5 && gridBreak === -1) gridBreak = i;
      if (h.P_load_served_kW[i] !== 30 && servedBreak === -1) servedBreak = i;
      if (h.P_shed_kW[i] !== 0 && shedBreak === -1) shedBreak = i;
      if (h.P_dump_kW[i] !== 0 && dumpBreak === -1) dumpBreak = i;
      if (h.island_state[i] !== 0 && islBreak === -1) islBreak = i;
      if (h.SOC_err_pp[i] !== 0 && socErrBreak === -1) socErrBreak = i;
      /* SOC 线性：闭式 SOC(t) = 60 − 100·(5·t)/(3600·40)（逐点 ≤1e-9 pp——采样行逐点
         独立解析积分承载 fp 尘点，斜率不做逐位断言） */
      const dev = Math.abs(h.SOC_true_pct[i] - (60 - (100 * 5 * trackRuns.healthy.timeseries.t[i]) / (3600 * 40)));
      if (dev > socLinMax) socLinMax = dev;
    }
    eq(pvBreak, -1, '健康局 P_pv ≡ 10 kW 全 601 点逐位恒等（PV-001 健康局复用）', '首个破坏点 @' + pvBreak);
    eq(wtBreak, -1, '健康局 P_wt ≡ 10 kW 全 601 点逐位恒等（WT-001 健康局复用）', '首个破坏点 @' + wtBreak);
    eq(bessBreak, -1, '健康局 P_bess ≡ 5 kW 全 601 点逐位恒等（计划跟踪 EQ-MG-5）', '首个破坏点 @' + bessBreak);
    eq(gridBreak, -1, '健康局 P_grid ≡ 5 kW 全 601 点逐位恒等（30−10−10−5）', '首个破坏点 @' + gridBreak);
    eq(servedBreak, -1, '健康局 P_served ≡ 30 kW 全 601 点逐位恒等', '首个破坏点 @' + servedBreak);
    eq(shedBreak, -1, '健康局 P_shed ≡ 0 全 601 点逐位恒等（并网面无卸载）', '首个破坏点 @' + shedBreak);
    eq(dumpBreak, -1, '健康局 P_dump ≡ 0 全 601 点逐位恒等', '首个破坏点 @' + dumpBreak);
    eq(islBreak, -1, '健康局 island_state ≡ 0 全 601 点逐位恒等', '首个破坏点 @' + islBreak);
    eq(socErrBreak, -1, '健康局 SOC_err ≡ 0 全 601 点逐位恒等（全通道健康）', '首个破坏点 @' + socErrBreak);
    ok(socLinMax <= 1e-9, '健康局 SOC 线性（逐点 ≤1e-9 pp 于闭式 60−100·(5·t)/(3600·40)：60→59.7916667，§3.4）',
      'max|偏差|=' + socLinMax.toExponential(2));
    close(h.SOC_true_pct[600], 59.7916667, specS, '健康局 SOC(60)=59.7916667 %（60−100·(5×60)/(3600×40)）');
    eq(h.P_bess_chase_kW[0], null, '健康局 chase(0)=null（并网面无填补目标暴露）');
  })();

  /* 场景 B：load_step +10 @20 并网（§3.1）——馈线瞬时补差，事件 post 行 = 15 */
  close(sig('load_step_closed_loop').P_grid_true_kW[199], 5, specP, 'B：P_grid(19.9)=5.000000 kW');
  close(sig('load_step_closed_loop').P_grid_true_kW[200], 15, specP, 'B：P_grid(20.0)=15.000000 kW（事件 post 行=15，EQ-MG-3 瞬时补差）');
  close(sig('load_step_closed_loop').P_grid_true_kW[600], 15, specP, 'B：P_grid(60)=15.000000 kW');
  close(sig('load_step_closed_loop').P_load_served_kW[600], 40, specP, 'B：P_served(60)=40.000000 kW（并网面全服务）');
  close(sig('load_step_closed_loop').P_load_demand_kW[200], 40, specP, 'B：P_load_demand(20.0)=40 kW（聚合输入阶跃）');
  close(met('load_step_closed_loop', 'E_grid_kWh'), 0.1944444, specE, 'B：E_grid=0.1944444 kWh（(5×20+15×40)/3600，事件感知解析）');
  close(met('load_step_closed_loop', 'E_load_served_kWh'), 0.6111111, specE, 'B：E_served=0.6111111 kWh');
  close(met('load_step_closed_loop', 'E_load_demand_kWh'), 0.6111111, specE, 'B：E_demand=0.6111111 kWh');
  close(met('load_step_closed_loop', 'SOC_true_end_pct'), 59.7916667, specS, 'B：SOC(60)=59.7916667 %（计划跟踪不受 load_step 影响）');

  /* 场景 C：pv_shading_link −300 @20 并网（§3.2）——源轨 τ=1.0 s 一阶跟随复用 */
  close(sig('pv_shading_closed_loop').P_pv_kW[200], 10, specT, 'C：P_pv(20.0)=10.000000（状态连续，EQ-MG-2）');
  close(sig('pv_shading_closed_loop').P_pv_kW[201], 9.714512, specT, 'C：P_pv(20.1)=9.714512（τ=1.0 s 精确指数）');
  close(sig('pv_shading_closed_loop').P_pv_kW[210], 8.103638, specT, 'C：P_pv(21.0)=8.103638（7+3·e⁻¹，PV001 §3.2 C 行同源）');
  close(sig('pv_shading_closed_loop').P_pv_kW[600], 7, specP, 'C：P_pv(60)=7.000000 kW');
  close(sig('pv_shading_closed_loop').P_grid_true_kW[210], 6.896362, specP, 'C：P_grid(21.0)=6.896362（15−P_pv）');
  close(sig('pv_shading_closed_loop').P_grid_true_kW[260], 7.992564, specP, 'C：P_grid(26.0)=7.992564');
  close(sig('pv_shading_closed_loop').P_grid_true_kW[600], 8, specP, 'C：P_grid(60)=8.000000 kW');
  close(met('pv_shading_closed_loop', 'E_pv_kWh'), 0.1341667, specE, 'C：E_pv=0.1341667 kWh（=483/3600，源 golden 复用锚点 MS-3）');
  close(met('pv_shading_closed_loop', 'E_grid_kWh'), 0.1158333, specE, 'C：E_grid=0.1158333 kWh（=417/3600，EQ-MG-8 恒等导出）');
  close(met('pv_shading_closed_loop', 'SOC_true_end_pct'), 59.7916667, specS, 'C：SOC(60)=59.7916667 %（计划跟踪不受子轨事件影响）');

  /* 场景 D：wt_gust_link +2 @20 并网（§3.2）——源轨 L0b 动态爬升封顶 + 零导入角点 */
  close(sig('wt_gust_closed_loop').P_wt_kW[200], 10, specT, 'D：P_wt(20.0)=10.000000');
  close(sig('wt_gust_closed_loop').P_wt_kW[210], 10.676732, specT, 'D：P_wt(21.0)=10.676732（WT001 §3.3 C 行锚点复用）');
  close(sig('wt_gust_closed_loop').P_wt_kW[260], 14.935791, specT, 'D：P_wt(26.0)=14.935791');
  close(sig('wt_gust_closed_loop').P_wt_kW[600], 15, specP, 'D：P_wt(60)=15.000000 kW（额定封顶）');
  ok(Math.abs(sig('wt_gust_closed_loop').P_grid_true_kW[600]) <= specId,
    'D：P_grid(60) 零导入角点 |·|≤1e-9 kW（30−10−15−5 恰平，声明角点非缺陷——复算 9.1e-14）',
    String(sig('wt_gust_closed_loop').P_grid_true_kW[600]));
  close(met('wt_gust_closed_loop', 'E_wt_kWh'), 0.218959, specE, 'D：E_wt=0.218959 kWh（源 golden 复用锚点 MS-3）');
  close(met('wt_gust_closed_loop', 'E_grid_kWh'), 0.031041, specE, 'D：E_grid=0.031041 kWh（EQ-MG-8 恒等导出）');

  /* 场景 E：island_event @20 / t_clear=35 三相（§3.3）——脱离/重整/重连 */
  eq(sig('island_reconnect').island_state[199], 0, 'E：island_state(19.9)=0');
  eq(sig('island_reconnect').island_state[200], 1, 'E：island_state(20.0)=1（脱离，事件行 post 语义）');
  eq(sig('island_reconnect').island_state[349], 1, 'E：island_state(34.9)=1');
  eq(sig('island_reconnect').island_state[350], 0, 'E：island_state(35.0)=0（重连恢复）');
  close(sig('island_reconnect').P_grid_true_kW[199], 5, specP, 'E：P_grid(19.9)=5.000000 kW');
  close(sig('island_reconnect').P_grid_true_kW[200], 0, specP, 'E：P_grid(20.0)=0.000000（孤岛窗 P_grid ≡0，EQ-MG-4）');
  close(sig('island_reconnect').P_grid_true_kW[349], 0, specP, 'E：P_grid(34.9)=0.000000');
  close(sig('island_reconnect').P_grid_true_kW[350], 5, specP, 'E：P_grid(35.0)=5.000000（重连恢复补差）');
  close(sig('island_reconnect').P_bess_kW[199], 5, specP, 'E：P_bess(19.9)=5.000000（计划跟踪）');
  close(sig('island_reconnect').P_bess_kW[200], 8, specP, 'E：P_bess(20.0)=8.000000（chase 10 > 钳位 8，EQ-MG-4/5）');
  close(sig('island_reconnect').P_bess_kW[349], 8, specP, 'E：P_bess(34.9)=8.000000');
  close(sig('island_reconnect').P_bess_kW[350], 5, specP, 'E：P_bess(35.0)=5.000000（重连恢复计划）');
  eq(sig('island_reconnect').P_bess_chase_kW[199], null, 'E：chase(19.9)=null（岛窗外）');
  close(sig('island_reconnect').P_bess_chase_kW[200], 10, specP, 'E：chase(20.0)=10.000000（填补目标钳位前显式暴露）');
  eq(sig('island_reconnect').P_bess_chase_kW[350], null, 'E：chase(35.0)=null（重连后回事件域外）');
  close(sig('island_reconnect').P_shed_kW[200], 2, specP, 'E：P_shed(20.0)=2.000000（chase 10 − 钳位 8，缺口卸载持续）');
  close(sig('island_reconnect').P_load_served_kW[215], 28, specP, 'E：P_served(21.5)=28.000000（30−2）');
  close(met('island_reconnect', 'SOC_true_end_pct'), 59.7604167, specS, 'E：SOC(60)=59.7604167 %（三段解析 5×20+8×15+5×25）');
  close(met('island_reconnect', 'E_bess_kWh'), 0.0958333, specE, 'E：E_bess=0.0958333 kWh（(100+120+125)/3600）');
  close(met('island_reconnect', 'E_grid_kWh'), 0.0625, specE, 'E：E_grid=0.0625000 kWh（225/3600）');
  close(met('island_reconnect', 'E_load_served_kWh'), 0.4916667, specE, 'E：E_served=0.4916667 kWh');
  close(met('island_reconnect', 'E_shed_kWh'), 0.0083333, specE, 'E：E_shed=0.0083333 kWh（2×15/3600）');
  close(met('island_reconnect', 'E_load_demand_kWh'), 0.5, specE, 'E：E_demand=0.5000000 kWh');

  /* 判别性恒等：r_true ≡ 0、r_meas ≡ 0（全部 5 Run × 601 点，≤1e-12；§3.3——与 FL-001 的
     r_meas = 0.4·b 形成教学对照；引擎侧为定义式逐点精确 0） */
  ['healthy', 'load_step_closed_loop', 'pv_shading_closed_loop', 'wt_gust_closed_loop', 'island_reconnect'].forEach((k) => {
    let maxRt = 0;
    let maxRm = 0;
    sig(k).r_true_kW.forEach((v) => { if (Math.abs(v) > maxRt) maxRt = Math.abs(v); });
    sig(k).r_meas_kW.forEach((v) => { if (Math.abs(v) > maxRm) maxRm = Math.abs(v); });
    ok(maxRt <= specR && maxRm <= specR, k + '：r_true/r_meas 逐点 ≡ 0（≤1e-12 kW，EQ-MG-6）',
      'max|r_true|=' + maxRt + ' max|r_meas|=' + maxRm);
  });

  /* MS-2 二次恒等式（能量账本，5 Run）：E_pv + E_wt + E_bess + E_grid ≡ E_served + E_dump
     ≤1e-9 kWh；E_served + E_shed ≡ E_demand ≤1e-9 kWh（§3.4 复算记录同款口径） */
  ['healthy', 'load_step_closed_loop', 'pv_shading_closed_loop', 'wt_gust_closed_loop', 'island_reconnect'].forEach((k) => {
    const m = (id) => met(k, id);
    const resid1 = Math.abs(m('E_pv_kWh') + m('E_wt_kWh') + m('E_bess_kWh') + m('E_grid_kWh') -
      m('E_load_served_kWh') - m('E_dump_kWh'));
    const resid2 = Math.abs(m('E_load_served_kWh') + m('E_shed_kWh') - m('E_load_demand_kWh'));
    ok(resid1 <= specId, k + '：E_pv+E_wt+E_bess+E_grid ≡ E_served+E_dump（≤1e-9 kWh，EQ-MG-8）', String(resid1));
    ok(resid2 <= specId, k + '：E_served+E_shed ≡ E_demand（≤1e-9 kWh，EQ-MG-8）', String(resid2));
  });

  /* 分段常值断言（MS-7 / EQ-MG-7 前提）：全五 Run 相位内 P_bess/P_shed/P_dump 漂移 ≡ 0
     （并网 = 计划常值；孤岛 = clamp(常值 chase)——Q1(b) 形态结构推论）。
     相位边界 = 采样行（t=20.0 起 post 行、t=35.0 起恢复行）。 */
  ['healthy', 'load_step_closed_loop', 'pv_shading_closed_loop', 'wt_gust_closed_loop', 'island_reconnect'].forEach((k) => {
    const s = sig(k);
    const phases = (k === 'island_reconnect')
      ? [[0, 199], [200, 349], [350, 600]]
      : [[0, 600]];
    let drift = '';
    phases.forEach((ph, pi) => {
      [['P_bess_kW'], ['P_shed_kW'], ['P_dump_kW']].forEach(([sid]) => {
        const lo = s[sid][ph[0]];
        for (let i = ph[0]; i <= ph[1]; i++) {
          if (s[sid][i] !== lo) { drift += sid + '@相位' + pi + ' i' + i; break; }
        }
      });
    });
    eq(drift, '', k + '：相位内 P_bess/P_shed/P_dump 逐位分段常值（MS-7/EQ-MG-7 前提）', drift);
  });
})();

/* ================================================================== */
/* 3. 四族闭环 vs 仅监测逐位等价（MS-5：物理输入，与控制模式无关）        */
/* ================================================================== */
(function twoModeEquivalence() {
  const FAM = {
    load_step: { family: 'load_step', params: { magnitude: 10 }, t_start_s: 20 },
    shading_link: { family: 'shading_link', params: { magnitude: 300 }, t_start_s: 20 },
    gust_link: { family: 'gust_link', params: { magnitude: 2 }, t_start_s: 20 },
    island_event: { family: 'island_event', params: {}, t_start_s: 20, t_clear_s: golden.config.t_clear_s }
  };
  Object.keys(FAM).forEach((fam) => {
    const mkCfg = (mode) => FL.core.createConfig('MG-001',
      { fault: JSON.parse(JSON.stringify(FAM[fam])), feedback_mode: mode });
    const cl = FL.registry.createRun({ config: mkCfg('closed_loop'), runId: 'MG-MS5-' + fam + '-CL' });
    const mo = FL.registry.createRun({ config: mkCfg('monitor'), runId: 'MG-MS5-' + fam + '-MO' });

    /* 排除是承重面：label/role/effective_mode 由反馈模式派生，本就不同 */
    ok(cl.label !== mo.label, fam + '：两模式 label 不同（闭环/仅监测，排除项为承重面）', cl.label + ' vs ' + mo.label);
    ok(cl.role !== mo.role, fam + '：两模式 role 不同（fault/contrast）', cl.role + ' vs ' + mo.role);
    eq(cl.truth.effectiveFeedbackMode, 'closed_loop', fam + '：闭环 truth 模式');
    eq(mo.truth.effectiveFeedbackMode, 'monitor', fam + '：仅监测 truth 模式');

    /* t + 18 信号全序列逐位（===）一致——MG 四族全为物理输入/拓扑事件，monitor 分支
       只对 FL/FC 传感器偏置切换控制面（§2 复用声明：两模式逐位同解，MS-5 面） */
    eq(JSON.stringify(cl.timeseries.t), JSON.stringify(mo.timeseries.t), fam + '：两模式 t 序列逐位一致');
    const sigIds = Object.keys(cl.timeseries.signals);
    eq(sigIds.length, 18, 'MG 信号面 18 项（§1.3 信号表）');
    let sigDiff = '';
    sigIds.forEach((sid) => {
      if (JSON.stringify(cl.timeseries.signals[sid]) !== JSON.stringify(mo.timeseries.signals[sid])) {
        sigDiff += (sigDiff ? ',' : '') + sid;
      }
    });
    eq(sigDiff, '', fam + '：两模式 18 信号全序列逐位一致（MS-5 面）', sigDiff);

    /* 事件与快照逐位一致（物理/拓扑输入在两模式同生效） */
    eq(JSON.stringify(cl.events), JSON.stringify(mo.events), fam + '：两模式 events 逐位一致');
    eq(JSON.stringify(cl.snapshots), JSON.stringify(mo.snapshots), fam + '：两模式 snapshots 逐位一致');

    /* metrics：id 序一致；除 effective_mode 外逐位一致（value/unit/precision 面——
       source_run_ids 承载 runId 属元数据排除项） */
    eq(cl.metrics.length, mo.metrics.length, fam + '：两模式 metrics 数量一致');
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
    eq(metDiff, '', fam + '：两模式 metrics 逐位一致（排除 effective_mode）', metDiff);
  });
})();

/* ================================================================== */
/* 4. MG-IMP-Q1 reject 断言 + island_event 零参数族（Q2 定案）            */
/* ================================================================== */
(function impQ1AndZeroParam() {
  /* 越域配置结构化拒绝（MG-IMP-Q1 定案：reject 纪律——出域即结构化错误，不做引擎侧
     数值钳位；FL/PV/WT initial 校验同款 reject 先例）。registry.createRun 校验入口抛
     ContractError（code CN-E02，field='config.'+首错字段——registry.js 校验入口面）。 */
  function expectReject(patch, field, name) {
    let threw = null;
    try {
      FL.registry.createRun({ config: FL.core.createConfig('MG-001', patch), runId: 'MG-Q1-REJ' });
    } catch (e) { threw = e; }
    ok(!!threw, name + '：越域配置结构化拒绝（抛错）');
    eq(threw && threw.name, 'ContractError', name + '：ContractError 类型（registry 校验入口）');
    eq(threw && threw.code, 'CN-E02', name + '：错误码 CN-E02');
    eq(threw && threw.field, 'config.' + field, name + '：错误字段 config.' + field + '（结构化定位）');
  }
  expectReject({ initial: { load_kW: 50 } }, 'initial.load_kW',
    'Q1-load50（load_kW=50 > bounds 上域 45）');
  expectReject({ initial: { p_sched_kW: 9 } }, 'initial.p_sched_kW',
    'Q1-psched9（p_sched_kW=9 > bounds 上域 8）');
  expectReject({ initial: { SOC_pct: -1 } }, 'initial.SOC_pct',
    'Q1-soc-1（SOC0=−1 < 域下界 0——负账本值域外声明，MG-IMP-Q1）');

  /* island_event 零参数族 params:{} 合法（Q2 定案——库内首例零参数族） */
  const zpCfg = FL.core.createConfig('MG-001',
    { fault: { family: 'island_event', params: {}, t_start_s: 20, t_clear_s: 35 }, feedback_mode: 'closed_loop' });
  eq(zpCfg.fault.family, 'island_event', 'island_event 零参数族 params:{} 配置合法（Q2 定案）');
  eq(zpCfg.fault.faultId, 'island_event', '零参数族 faultId=目录 id');
  const zpRun = FL.registry.createRun({ config: zpCfg, runId: 'MG-ZEROPARAM' });
  eq(zpRun.timeseries.t.length, 601, '零参数族 Run 可创建（601 点）');
  eq(zpRun.events.length, 2, '零参数族 Run 双事件（脱离/重连——语义由 t_start_s/t_clear_s 承载）');

  /* t_clear_s 缺省 = 窗末持续脱离（EQ-MG-1 缺省支路）：单事件、岛窗持续至 60 s、
     SOC 沿 8 kW 段斜率到窗末（island_event alternatives 登记面） */
  const ncRun = FL.registry.createRun({ config: FL.core.createConfig('MG-001',
    { fault: { family: 'island_event', params: {}, t_start_s: 20 }, feedback_mode: 'closed_loop' }), runId: 'MG-NOCLR' });
  eq(ncRun.events.length, 1, 't_clear 缺省 → 单事件（无重连事件）');
  eq(ncRun.timeseries.signals.island_state[599], 1, 't_clear 缺省：island_state(59.9)=1（持续脱离至窗末）');
  eq(ncRun.timeseries.signals.island_state[600], 0, 't_clear 缺省：island_state(60.0)=0（[t_start, t_clear) 右开边界）');
  close(ncRun.timeseries.signals.SOC_true_pct[600], 59.7083333, 1e-4,
    't_clear 缺省：SOC(60)=59.7083333 %（60−100·(5×20+8×40)/(3600×40)——无重连恢复段）');
})();

/* ================================================================== */
/* 5. MG 分派守卫（R-5）+ quality 绿面（checks.js MG 落地面联动）          */
/* ================================================================== */
(function dispatchGuard() {
  const mgRun = trackRuns.load_step_closed_loop;

  /* MG 分派生效的元数据面：scope / 模型版本 / run_hash 可重算 */
  eq(mgRun.manifest.scope, 'extension_preview', 'MG Run scope=extension_preview（规格 §2.5/§5）');
  eq(mgRun.modelManifest.model_version, '1.0.0', 'MG model_version=1.0.0');
  eq(FL.registry.verifyRunHash(mgRun), true, 'MG run_hash 可重算');

  /* MG 信号面：聚合代数信号在场（EQ-MG-3 面量纲），GT/FL/PV/WT 专属信号不在场——
     若分派链 MG 分支被绕过（静默落入 else→GT001 兜底），信号面直接缺失/换轨
     （R-5 守卫：engine.js simulate 分派链显式 MG 分支置于 else→GT001 兜底之前） */
  ok(!!mgRun.timeseries.signals.P_grid_true_kW && mgRun.timeseries.signals.P_grid_true_kW.length === 601,
    'P_grid_true_kW 在场（601 点，MG 聚合信号面）');
  ok(mgRun.timeseries.signals.P_bess_chase_kW !== undefined,
    'P_bess_chase_kW 事件域列在场（MG 专属信号面）');
  const foreign = [
    'f_true_Hz', 'n_meas_rpm', 'P_gen_true_kW', 'f_channel_diff_Hz', 'T3_out_K', /* GT 专属 */
    'I_bat_true_A', 'I_bat_meas_A', 'P_bat_meas_kW', 'T_bat_K', /* FL 专属 */
    'P_pv_true_kW', 'G_meas_W_m2', 'P_mpp_true_kW', 'd_pv_kW', /* PV 专属 */
    'P_wt_true_kW', 'v_true_ms', 'beta_stuck_deg', 'd_wt_kW', 'n_rotor_rpm' /* WT 专属 */
  ];
  const leaked = foreign.filter((sid) => mgRun.timeseries.signals[sid] !== undefined);
  eq(leaked.length, 0, 'MG Run 无 GT/FL/PV/WT 专属信号渗入（分派未落入 GT 兜底物理）', leaked.join(','));

  /* R-5 守卫数值面：healthy P_grid(60)=5.000000（EQ-MG-3 聚合代数——GT 兜底物理给出
     频率/转速面而非该值，分派守卫数值面） */
  eq(trackRuns.healthy.timeseries.signals.P_grid_true_kW[600], 5,
    'MG healthy P_grid(60)=5.000000 kW（EQ-MG-3 聚合代数，非 GT 轨数值面）');
  close(mgRun.timeseries.signals.P_grid_true_kW[600], 15, 0.05,
    'MG B 场景 P_grid(60)=15.000000 kW（MG 锚点，非 GT 轨数值面）');

  /* quality 绿面（5 Run 全场）：sampling（P_bess_chase_kW 事件域 null 豁免——checks.js
     MG_EVENT_DOMAIN_SIGNALS MG 键控分支）/conservation-true/conservation-meas（r ≡ 0，
     EQ-MG-6，通用 else 面 tolTrue 1e-12）/units（'-' 声明面——MG 键控补充）/event-window
     全部 pass；soc-bounds/energy-balance 不派发（MG bounds 刻意无 SOC_pct 键，
     bounds 派生分派既有机制自动覆盖——PV/WT 同款口径）。 */
  ['healthy', 'load_step_closed_loop', 'pv_shading_closed_loop', 'wt_gust_closed_loop', 'island_reconnect'].forEach((k) => {
    const q = {};
    trackRuns[k].quality.forEach((c) => { q[c.check_id] = c.status; });
    ['sampling', 'conservation-true', 'conservation-meas', 'units', 'event-window'].forEach((id) => {
      eq(q[id], 'pass', k + '：quality ' + id + '=pass');
    });
    eq(q['soc-bounds'], undefined, k + '：quality soc-bounds 不派发（MG bounds 无 SOC_pct 键——bounds 派生分派）');
    eq(q['energy-balance'], undefined, k + '：quality energy-balance 不派发（MG 无 E_source/E_bat 通用指标面）');
  });

  /* sampling 事件域豁免说明面（checks.js MG 键控落地面）：healthy 全窗 601 null、
     island 岛窗外 451 null，均为事件域结构性缺席而非 NaN 违规 */
  const samHealthy = trackRuns.healthy.quality.find((c) => c.check_id === 'sampling');
  const samIsland = trackRuns.island_reconnect.quality.find((c) => c.check_id === 'sampling');
  ok(samHealthy.reason.indexOf('601 个可选点位为 null') !== -1 && samHealthy.reason.indexOf('P_bess_chase_kW') !== -1,
    'healthy sampling 说明面：601 null = P_bess_chase_kW 事件域列（MG 键控豁免注记）');
  ok(samIsland.reason.indexOf('451 个可选点位为 null') !== -1 && samIsland.reason.indexOf('island_event') !== -1,
    'island sampling 说明面：451 null 岛窗外事件域豁免注记');
  /* units '-' 声明面（checks.js MG 键控补充——复用既有字典零新增） */
  const unitsMg = trackRuns.healthy.quality.find((c) => c.check_id === 'units');
  ok(unitsMg.reason.indexOf('-') !== -1, 'units 说明面含 - 单位（island_state 无量纲列，allowedUnits MG 键控补充）');
  /* conservation-meas 恒等面：max|r_meas| = 0（全功率通道健康——与 FL r_meas=0.4·b 对照） */
  const cm = trackRuns.island_reconnect.quality.find((c) => c.check_id === 'conservation-meas');
  eq(cm.observed, 0, 'island conservation-meas observed=0（r_meas 定义恒等，EQ-MG-6）');
})();

/* ================================================================== */
/* 6. schema/hash 面（R-8 投影缺口修复联动 + 导出校验）                    */
/* ================================================================== */
(function schemaHashFace() {
  /* MG config_hash 覆盖 p_sched_kW（W6 schema.js R-8 键列补齐——W5 缺口：
     同配置改 p_sched_kW → hash 不变的改参不产生新 Run 面） */
  const mgA = FL.core.createConfig('MG-001', {});
  const mgB = FL.core.createConfig('MG-001', { initial: { p_sched_kW: -3 } });
  eq(FL.contract.scenarioView(mgA).initial_p_sched_kW, 5, 'MG scenarioView.initial_p_sched_kW=5（R-8 投影补入）');
  eq(FL.contract.scenarioView(mgB).initial_p_sched_kW, -3, 'MG scenarioView.initial_p_sched_kW=−3');
  const runA = FL.registry.createRun({ config: mgA, runId: 'MG-HASH-A' });
  const runB = FL.registry.createRun({ config: mgB, runId: 'MG-HASH-B' });
  ok(runA.manifest.config_hash !== runB.manifest.config_hash,
    'MG p_sched_kW 5→−3 → config_hash 不同（per-Run config 哈希含 initial_p_sched_kW）');
  ok(runA.manifest.run_hash !== runB.manifest.run_hash,
    'MG p_sched_kW 5→−3 → run_hash 不同（改参只产生新 Run）');
  eq(FL.registry.verifyRunHash(runA), true, 'MG Run A run_hash 可重算');
  eq(FL.registry.verifyRunHash(runB), true, 'MG Run B run_hash 可重算');

  /* MG 键面零外溢：既有系统投影无 initial_p_sched_kW 值（undefined 不参与哈希，
     §1 canonicalization 不变量——MG 键列追加不改五系统 per-Run 哈希） */
  eq(FL.contract.scenarioView(FL.core.createConfig('FL-001', {})).initial_p_sched_kW, undefined,
    'FL 投影无 initial_p_sched_kW 值（undefined 不入哈希——MG 键面不外溢既有系统）');

  /* 导出校验面（R-8：声明才要求 + bounds.p_sched_kW [−8,8] 域校验） */
  const sc = FL.contract.scenarioView(runA.config);
  eq(FL.contract.validateScenarioConfig(sc).length, 0, 'MG Run 导出校验通过（R-8：声明才要求）');
  eq(FL.contract.validateScenarioConfig(Object.assign({}, sc, { initial_p_sched_kW: 9 })).length, 1,
    'MG p_sched=9 导出校验拒绝（bounds.p_sched_kW 上域 8，engine validateConfig 同域）');
  eq(FL.contract.validateScenarioConfig(Object.assign({}, sc, { initial_p_sched_kW: -9 })).length, 1,
    'MG p_sched=−9 导出校验拒绝（下域 −8）');
  eq(FL.contract.validateScenarioConfig(Object.assign({}, sc, { initial_p_sched_kW: -8 })).length, 0,
    'MG p_sched=−8（下界端点）通过');
  eq(FL.contract.validateScenarioConfig(Object.assign({}, sc, { initial_p_sched_kW: 8 })).length, 0,
    'MG p_sched=+8（上界端点）通过');
})();

/* ---------- 汇总 ---------- */
console.log('\n== MG-001 引擎 ↔ golden 一致性（mg001_v1 5 Run，gate T-A） ==');
if (fail) {
  console.log('FAIL ' + fail + ' / PASS ' + pass);
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('PASS ' + pass + ' / FAIL 0 ✓（5 Run 全序列/scalars + A–E 锚点 + 健康局恒等 + 恒等式两式 + 分段常值 + r≡0 + null 布局 + 四族逐位等价 + Q1 reject/零参数族 + R-5 分派守卫 + quality 绿面 + R-8 投影面）');
