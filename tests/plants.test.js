/* owner: core-engine | module: tests/plants | contract: RFC_MODEL_INTERFACE_I11.md §2（移植 CHG-20261030-07） */
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
/* 6. 经典脚本纪律静态扫描（plants 两个文件）                           */
/* ------------------------------------------------------------------ */
['plants/fl001.js', 'plants/fc001.js'].forEach(function (rel) {
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
