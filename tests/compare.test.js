/* owner: causal-compare | module: tests/compare | contract: DATA_CONTRACT_SPEC §2.11 / D-04 / T-15
   G4 三组对照与对比白名单（I-09 / P0b-04）：
   baseline↔fault 允许 fault/bias；closed↔monitor 允许 feedback_mode；
   其余配置差异 → verdict='incomparable'，禁用差值图与因果发现。
   运行：node tests/compare.test.js；失败非零退出。 */
'use strict';

const { bootstrap } = require('./core-load');
const FL = bootstrap();
const core = FL.core;

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }

function runOf(patch, id) {
  return core.simulate(core.createConfig('FL-001', patch || {}), { runId: id });
}
const healthy = runOf({ fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } }, 'CMP-BASE');
const fault = runOf({}, 'CMP-FAULT');
const monitor = runOf({ feedback_mode: 'monitor' }, 'CMP-MON');
const faultMag12 = runOf({ fault: { family: 'sensor_drift', faultId: 'I_bat_sensor_bias', t_start_s: 20, params: { magnitude: 12 } } }, 'CMP-MAG12');
const fc = FL.core.simulate(FL.core.createConfig('FC-001', {}), { runId: 'CMP-FC' });
const loadStep = runOf({ fault: { family: 'load_step', faultId: 'load_step_10kW', t_start_s: 20, params: { magnitude: 10 } } }, 'CMP-LOAD');

/* 1. baseline ↔ fault：白名单内（fault/bias 差异） */
let cmp = core.compareRuns(healthy, fault);
eq(cmp.verdict, 'comparable', 'baseline↔fault verdict=comparable');
eq(JSON.stringify(cmp.allowed_diffs), JSON.stringify(['fault']), 'allowed_diffs=["fault"]');
eq(cmp.diffAllowed, true, '差值图允许');
eq(cmp.valid, true, '一致性检查通过');
ok(cmp.findings.length >= 3, '白名单内对比给出发现');

/* 2. closed ↔ monitor：白名单内（feedback_mode 差异，D-04） */
cmp = core.compareRuns(fault, monitor);
eq(cmp.verdict, 'comparable', 'closed↔monitor verdict=comparable');
eq(JSON.stringify(cmp.allowed_diffs), JSON.stringify(['feedback_mode']), 'allowed_diffs=["feedback_mode"]');
eq(cmp.diffAllowed, true, 'D-04：仅监测对照允许对比');

/* 3. 两故障 Run 幅值不同（10 vs 12）：不在白名单 → incomparable（T-15） */
cmp = core.compareRuns(fault, faultMag12);
eq(cmp.verdict, 'incomparable', '两故障 Run 幅值不同 verdict=incomparable');
eq(cmp.diffAllowed, false, '差值图禁用');
eq(cmp.findings.length, 0, '不可比时清空发现（不给出"仅由故障造成"类结论）');
ok(cmp.warnings.some((w) => w.indexOf('白名单') !== -1), '警告说明白名单原因');

/* 4. healthy ↔ monitor-fault：模式与故障同时不同 → incomparable */
cmp = core.compareRuns(healthy, monitor);
eq(cmp.verdict, 'incomparable', '基准↔仅监测故障（双差异）incomparable');
eq(cmp.findings.length, 0, '发现清空');

/* 5. 跨系统：incomparable（既有行为保持） */
cmp = core.compareRuns(healthy, fc);
eq(cmp.verdict, 'incomparable', 'FL-001 ↔ FC-001 incomparable');
eq(cmp.diffAllowed, false, '跨系统禁用差值图');

/* 6. 负载曲线不同（load_step）：incomparable（负载不一致不能归因传感器故障） */
cmp = core.compareRuns(healthy, loadStep);
eq(cmp.verdict, 'incomparable', 'load_step 对比 incomparable（load-profile fail）');
ok(cmp.checks.some((c) => c.id === 'load-profile' && c.status === 'fail'), 'load-profile 检查 fail');

/* 7. compatibility 对象逐项在场（契约 §2.11） */
cmp = core.compareRuns(healthy, fault);
['model_version', 'engine_version', 'dt_s', 'duration_s', 'initial_conditions', 'load_profile', 'observation_definitions']
  .forEach((k) => ok(cmp.compatibility && typeof cmp.compatibility[k] === 'object' && typeof cmp.compatibility[k].ok === 'boolean',
    'compatibility.' + k + ' 在场且为 {ok:bool}'));

/* 8. 同配置自比：comparable 无差异 */
cmp = core.compareRuns(fault, fault);
eq(cmp.verdict, 'comparable', '同配置自比 comparable');
eq(cmp.allowed_diffs.length, 0, '无允许差异清单');

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('对比白名单测试全部通过（T-15 / D-04 / 契约 §2.11）。');
