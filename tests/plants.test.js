/* owner: core-engine | module: tests/plants | contract: RFC_MODEL_INTERFACE_I11_APPROVED.md §2/§9（移植 CHG-20261030-07） */
/* I-11 Plant 适配器接口护栏：node tests/plants.test.js（不依赖任何第三方库）
   覆盖：Plant/Sensor/Controller/Fault 职责边界（monitor 语义归 Controller、测量偏置独立于回路）、
        stepOf 与 engine.foStep 数值口径一致性、派发边界（plant 家族 vs 暂缓家族内联路径）、
        经典脚本纪律静态扫描（无 fetch/document/ESM）。
   逐位一致性（run_hash 不变）由 tools/verify-i11-bitidentity.mjs 与 golden 回归（engine/engine-fc）承担，
   本测试不重复数值比对。输出 PASS n / FAIL m；失败非零退出。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { bootstrap } = require('./core-load');

const FL = bootstrap();
const core = FL.core;
const plants = FL.core.plants;

let pass = 0;
let fail = 0;
const failures = [];

function ok(cond, name, detail) {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push({ name: name, detail: detail || '条件为假' });
  }
}
function close(a, b, tol) {
  return Math.abs(a - b) <= tol;
}

/* ------------------------------------------------------------------ */
/* 1. 挂载与工厂                                                       */
/* ------------------------------------------------------------------ */
ok(plants && typeof plants.createFl001Plant === 'function', 'FL.core.plants.createFl001Plant 存在');
ok(plants && typeof plants.createFc001Plant === 'function', 'FL.core.plants.createFc001Plant 存在');

const flCfgClosed = core.createConfig('FL-001', { fault: { family: 'sensor_drift' } });
const flCfgMonitor = core.createConfig('FL-001', { fault: { family: 'sensor_drift' }, feedback_mode: 'monitor' });
const flCfgNone = core.createConfig('FL-001', { fault: { family: 'none' } });
const fcCfgClosed = core.createConfig('FC-001', { fault: { family: 'sensor_drift' } });
const fcCfgMonitor = core.createConfig('FC-001', { fault: { family: 'sensor_drift' }, feedback_mode: 'monitor' });

const flClosed = plants.createFl001Plant(flCfgClosed);
const flMonitor = plants.createFl001Plant(flCfgMonitor);
const flNone = plants.createFl001Plant(flCfgNone);
const fcClosed = plants.createFc001Plant(fcCfgClosed);
const fcMonitor = plants.createFc001Plant(fcCfgMonitor);

/* ------------------------------------------------------------------ */
/* 2. FL-001：monitor 语义归 Controller，测量偏置独立于回路              */
/* ------------------------------------------------------------------ */
const tStart = flCfgClosed.fault.t_start_s;
const bias = flCfgClosed.fault.params.magnitude;
ok(close(flClosed.I_ref, 25, 0), 'FL-001 I_ref = 25 A（P0 冻结参数，§1.2）', String(flClosed.I_ref));
ok(flClosed.bAt(tStart) === bias && flClosed.bAt(tStart - 1) === 0, 'FL-001 bAt 左/右极限（t_f 起 +bias）');
ok(flMonitor.bAt(tStart) === bias, 'FL-001 monitor 下测量通道仍计 b（EQ-2）');
ok(close(flClosed.targetAt(tStart), flClosed.I_ref - bias, 0), 'FL-001 闭环回路目标 I_ref − b（t ≥ t_f）');
ok(flClosed.targetAt(tStart - 1) === flClosed.I_ref, 'FL-001 闭环回路目标 t < t_f 恒 I_ref');
ok(flMonitor.targetAt(tStart + 100) === flMonitor.I_ref, 'FL-001 monitor = IdentityController ⇒ 回路目标恒 I_ref');
ok(flNone.faulted === false && flNone.bAt(60) === 0, 'FL-001 none 家族无偏置');

/* Sensor 角色：iMeasAt = iTrue + bAt（monitor 下测量仍含偏置） */
ok(flMonitor.iMeasAt(25, tStart + 1) === 25 + bias, 'FL-001 monitor iMeasAt = iTrue + b');
ok(flNone.iMeasAt(25, 30) === 25, 'FL-001 none iMeasAt = iTrue');

/* ------------------------------------------------------------------ */
/* 3. FC-001：loopBias 视图与 I_fc_ref                                  */
/* ------------------------------------------------------------------ */
const fcTstart = fcCfgClosed.fault.t_start_s;
const fcBias = fcCfgClosed.fault.params.magnitude;
ok(fcClosed.loopBiasAt(fcTstart) === fcBias, 'FC-001 闭环 loopBiasAt(t ≥ t_f) = bias');
ok(fcClosed.loopBiasAt(fcTstart - 1) === 0, 'FC-001 loopBiasAt(t < t_f) = 0');
ok(fcMonitor.loopBiasAt(fcTstart + 100) === 0, 'FC-001 monitor loopBiasAt 恒 0（IdentityController）');
ok(close(fcClosed.targetAt(fcTstart), fcClosed.I_fc_ref - fcBias, 0), 'FC-001 闭环 targetAt = I_fc_ref − loopBias');
ok(fcMonitor.targetAt(fcTstart + 100) === fcMonitor.I_fc_ref, 'FC-001 monitor targetAt 恒 I_fc_ref');
ok(fcMonitor.bAt(fcTstart) === fcBias, 'FC-001 monitor 测量通道仍计 b');
ok(fcClosed.modelRoles.controller === 'closed-loop-first-order' && fcMonitor.modelRoles.controller === 'monitor-identity',
  'modelRoles.controller 随模式切换');

/* ------------------------------------------------------------------ */
/* 4. stepOf 数值口径 = engine.foStep 公式（同一操作数顺序）             */
/* ------------------------------------------------------------------ */
function foStepRef(y, target, tau, dt) {
  var ratio = dt / tau;
  var a = ratio > 40 ? 0 : Math.exp(-ratio);
  return {
    y: target + (y - target) * a,
    integral: target * dt + (y - target) * tau * (1 - a)
  };
}
[[flClosed, 1.5], [fcClosed, 1.2]].forEach(function (pair) {
  const plant = pair[0];
  const tau = pair[1];
  for (let y of [25, 24.9, 15.3, 49.99]) {
    for (let time of [0, 10, 19.95, 20, 20.05, 40]) {
      const st = plant.stepOf(y, time, 0.01);
      const ref = foStepRef(y, plant.targetAt(time), tau, 0.01);
      ok(st.y === ref.y && st.integral === ref.integral,
        plant.modelRoles.plant + ' stepOf ≡ foStep 公式（y=' + y + ', t=' + time + '）',
        'got ' + st.y + '/' + st.integral + ' want ' + ref.y + '/' + ref.integral);
    }
  }
});
ok(flClosed.TAU === 1.5 && fcClosed.TAU === 1.2, 'τ 冻结值（FL=1.5 s / FC=1.2 s）');

/* ------------------------------------------------------------------ */
/* 5. 派发边界：plant 家族走适配器，暂缓家族不经过 plants                */
/* ------------------------------------------------------------------ */
/* 闭环 sensor_drift 端到端行为（契约 §5.1 精确数值表的 plant 路径复验，容差 1e-9） */
const runClosed = core.simulate(flCfgClosed, { runId: 'Run-PLANTS-CL' });
const tEnd = runClosed.timeseries.t[runClosed.timeseries.t.length - 1];
const expectedIEnd = (flClosed.I_ref - bias) + bias * Math.exp(-(tEnd - tStart) / 1.5);
ok(close(runClosed.timeseries.signals.I_bat_true_A[runClosed.timeseries.t.length - 1], expectedIEnd, 1e-9),
  'FL-001 闭环 sensor_drift 终值 = (I_ref−b)+b·e^(−Δt/τ)（plant 路径）',
  String(runClosed.timeseries.signals.I_bat_true_A[runClosed.timeseries.t.length - 1]));
const runMonitor = core.simulate(flCfgMonitor, { runId: 'Run-PLANTS-MO' });
ok(runMonitor.timeseries.signals.I_bat_true_A.every(function (v) { return v === 25; }),
  'FL-001 monitor 下真实电流恒 25 A（物理回路无偏置）');
ok(runMonitor.timeseries.signals.I_bat_meas_A[600] === 25 + bias, 'FL-001 monitor 测量电流 t_end = 35 A（+10 A 偏置）');

/* FL-001 actuator_fault（暂缓家族）不经 plants：适配器拒绝构造之外的家族由派发函数保证；
   这里验证派发后仍走内联路径产出合法 Run（含 I_bat_cap 生效）。 */
const flCfgAct = core.createConfig('FL-001', { fault: { family: 'actuator_fault' } });
const runAct = core.simulate(flCfgAct, { runId: 'Run-PLANTS-ACT' });
ok(runAct.timeseries.signals.I_bat_cap_A[600] !== null, 'FL-001 actuator_fault 走内联路径（I_bat_cap 生效，未经 plant）');

/* ------------------------------------------------------------------ */
/* 5.5 GT-001 适配器挂载与壳面等价探针（S3 track wiring，V190 CHG-20261115-09） */
/* ------------------------------------------------------------------ */
ok(plants && typeof plants.createGt001Plant === 'function', 'FL.core.plants.createGt001Plant 存在');
/* 壳面等价探针：govStep/cappedAt/bAt 与 EQ-GTL2-9/GTL2-10 冻结式逐位核对（有限域）。 */
const gtCfg = core.createConfig('GT-001', { fault: { family: 'actuator_fault' }, inertia_model: 'thermo' });
const gtPlant = plants.createGt001Plant(gtCfg);
const gtU = 25.3, gtF = 49.87, gtT = 20.1, gtH = 0.01;
const gtFGov = gtPlant.fGovAt(gtF, gtT);
ok(gtPlant.govStep(gtU, gtF, gtT, gtH) === Math.max(0, Math.min(40, gtU + 2.0 * (50 - gtFGov) * gtH)),
  'GT-001 govStep = clamp(u + Ki·(50−f_gov)·h, 0, 40) 逐位等价');
const gtT0 = gtCfg.fault.t_start_s;
ok(gtPlant.cappedAt(gtT0 - 0.05) === false && gtPlant.cappedAt(gtT0 + 0.05) === true,
  'GT-001 cappedAt 钳位窗 = [t_start, t_clear)（无 t_clear → 窗末持续）');
const gtCfgS = core.createConfig('GT-001', { fault: { family: 'sensor_drift' } });
const gtPlantS = plants.createGt001Plant(gtCfgS);
const gtTs = gtCfgS.fault.t_start_s;
ok(gtPlantS.bAt(gtTs - 0.05) === 0 && gtPlantS.bAt(gtTs + 0.05) === gtCfgS.fault.params.magnitude,
  'GT-001 bAt 传感偏置阶跃 = magnitude（t ≥ t_start − 1e-9）');
ok(gtPlantS.fGovAt(50, gtTs + 0.05) === 50 + gtCfgS.fault.params.magnitude,
  'GT-001 fGovAt closed_loop = f + b（monitor 恒等视图由 monitor 配置承载）');


/* ------------------------------------------------------------------ */
/* 5.6 FC-001 L1-FMU adapter 挂载与 golden 装载守卫 + 因果规则注册面
   （FCFMU-G2b-04，CHG-20261118-01——数据/装载面，零引擎仿真轨触碰） */
/* ------------------------------------------------------------------ */
ok(plants && typeof plants.createFc001FmuAdapter === 'function',
  'FL.core.plants.createFc001FmuAdapter 存在');
(() => {
  const golden = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'data', 'golden', 'fc001_fmu_v1.json'), 'utf8'));
  const adapter = plants.createFc001FmuAdapter({});
  ok(adapter.mode === 'uninitialized', 'FMU adapter 初始未初始化（显式装载纪律）');
  ok(adapter.initPrebaked(golden) === true && adapter.mode === 'prebaked',
    'FMU adapter initPrebaked（fc001_fmu_v1 真档案）= prebaked');
  const runs = adapter.listRuns();
  ok(runs.length === 5 && runs[0].key === 'baseline' && runs[4].key === 'actuator_drain_closed_loop',
    'FMU adapter listRuns = 5 Run 白名单全集');
  const run0 = adapter.getRun('sensor_p_ca_closed_loop');
  ok(run0 && run0.series && run0.series.t.length === 601 && run0.series.p_ca_meas_kPa.length === 601,
    'FMU adapter getRun 序列 601 点（21 列面）');
  const meta = adapter.meta();
  ok(meta && meta.model_provenance === 'fmu_l1_lumped_unvalidated'
    && meta.model_id === 'fc.pem.fmu_l1' && meta.approved_by,
    'FMU adapter meta = 批准档案身份（provenance/model_id/approval）');
  /* 拒绝面：非本轨 golden / 未批准档案 */
  const bad = plants.createFc001FmuAdapter({});
  bad.initPrebaked(Object.assign({}, golden, { golden_id: 'fc001_v2' }));
  ok(bad.mode === 'prebaked-invalid', 'FMU adapter 非 FMU golden 拒载（轨锚定校验）');
  const bad2 = plants.createFc001FmuAdapter({});
  const noApproval = JSON.parse(JSON.stringify(golden)); delete noApproval.approval;
  bad2.initPrebaked(noApproval);
  ok(bad2.mode === 'prebaked-invalid', 'FMU adapter 未批准档案拒载（approval 纪律）');
  /* 因果规则注册面（causal-rules.js——数据面） */
  const rules = core.causalRules && core.causalRules.fc001_fmu;
  ok(Array.isArray(rules) && rules.length === 6
    && rules[0].rule_id === 'FC_RULE_01_MEAS_STEP'
    && rules[5].rule_id === 'FC_RULE_06_ALGEBRAIC_RES',
    'causalRules.fc001_fmu = 6 节规则（FC_RULE_01..06 逐字注册）');
  ok(rules.every(function (r) { return r.node_slot && r.epistemic_layer && r.statement; }),
    'FMU 因果规则字段面齐备（node_slot/layer/statement）');
})();

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* 6. 经典脚本纪律静态扫描（plants 三个文件）                           */
/* ------------------------------------------------------------------ */
['plants/fl001.js', 'plants/fc001.js', 'plants/gt001.js', 'plants/fc001-fmu-adapter.js', 'causal-rules.js'].forEach(function (rel) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', rel), 'utf8');
  ['fetch(', 'document.', 'XMLHttpRequest', 'require(', 'import ', 'export '].forEach(function (tok) {
    ok(src.indexOf(tok) === -1, rel + ' 静态扫描无 ' + JSON.stringify(tok));
  });
});

/* ------------------------------------------------------------------ */
console.log('PASS ' + pass + ' / FAIL ' + fail);
if (fail > 0) {
  console.log(JSON.stringify(failures, null, 2));
  process.exit(1);
}
