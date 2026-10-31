/* owner: core-contract | module: tests/scope-guard | contract: BACKLOG_APPROVED §1.5 / SA-24 / G0-DEC-14
   G4 批准范围守卫（I-10 / P0b-07）：P0 白名单之外的配置一律 scope='extension_preview'，
   不得进入 P0 验收/golden 比对；manifest 与证据包携带 scope 标注。
   运行：node tests/scope-guard.test.js；失败非零退出。 */
'use strict';

const { bootstrap } = require('./core-load');
const FL = bootstrap();
const core = FL.core;
const scope = FL.scope;

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }

/* ------------------------------------------------------------------ *
 * 1. 白名单内场景（SA-24）：FL-001 × {none, sensor_drift +10@20} × 双模式
 * ------------------------------------------------------------------ */
const cfgFault = core.createConfig('FL-001', {});
const cfgBase = core.createConfig('FL-001', { fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } });
const cfgMon = core.createConfig('FL-001', { feedback_mode: 'monitor' });
eq(scope.classify(cfgFault), 'approved_p0', '白名单：FL-001 closed_loop sensor_drift +10@20');
eq(scope.classify(cfgBase), 'approved_p0', '白名单：FL-001 无故障基准');
eq(scope.classify(cfgMon), 'approved_p0', '白名单：FL-001 monitor');
ok(scope.isApprovedP0(cfgFault), 'isApprovedP0 通过');

/* ------------------------------------------------------------------ *
 * 2. 白名单外场景：全部 extension_preview
 * ------------------------------------------------------------------ */
function mk(patch) { return core.createConfig('FL-001', patch); }
eq(scope.classify(mk({ fault: { family: 'sensor_drift', faultId: 'I_bat_sensor_bias', t_start_s: 20, params: { magnitude: 12 } } })),
  'extension_preview', '幅值 12 A 超白名单（P0 冻结 +10）');
eq(scope.classify(mk({ fault: { family: 'sensor_drift', faultId: 'I_bat_sensor_bias', t_start_s: 30, params: { magnitude: 10 } } })),
  'extension_preview', '故障时刻 30 s 超白名单（P0 冻结 20.0）');
eq(scope.classify(mk({ fault: { family: 'load_step', faultId: 'load_step_10kW', t_start_s: 20, params: { magnitude: 10 } } })),
  'extension_preview', 'load_step 族不在 P0（G0-DEC-15：删除或重写）');
eq(scope.classify(mk({ fault: { family: 'actuator_fault', faultId: 'converter_current_limit', t_start_s: 20, params: { magnitude: 55 } } })),
  'extension_preview', 'actuator_fault 族不在 P0（未评审）');
eq(scope.classify(mk({ initial: { load_kW: 35, SOC_pct: 60 } })), 'extension_preview', '负载 35 kW 超白名单');
eq(scope.classify(mk({ initial: { load_kW: 30, SOC_pct: 60 }, noise: { enabled: true, seed: 1, level: 0.5 } })),
  'extension_preview', '开启噪声超白名单（P0 noise=null）');
eq(scope.classify(Object.assign({}, cfgFault, { duration_s: 30, dt_s: 0.1 })), 'extension_preview', '改 duration 超白名单');
eq(scope.classify({ systemId: 'FC-001', modelId: 'fc.pem.l0', modelVersion: '1.1.0', duration_s: 60, dt_s: 0.1, feedback_mode: 'closed_loop', fault: { family: 'sensor_drift', faultId: 'I_fc_sensor_bias', t_start_s: 20, params: { magnitude: 10 } }, initial: { load_kW: 30, SOC_pct: 60 }, noise: { enabled: false, seed: 12345, level: 0 } }),
  'approved_fc', 'FC-001 scope=approved_fc（V3-04 升正式，SA-24 白名单仍不含 FC-001）');
eq(scope.classify({ systemId: 'GT-001', modelId: 'gt.sync.l0', modelVersion: '1.0.0', duration_s: 60, dt_s: 0.1, feedback_mode: 'closed_loop', fault: { family: 'sensor_drift', faultId: 'speed_sensor_bias', t_start_s: 20, params: { magnitude: 0.3 } }, initial: { load_kW: 30, SOC_pct: 60 }, noise: { enabled: false, seed: 12345, level: 0 } }),
  'extension_preview', 'GT-001 整体为扩展预览（G2b 规格已批准，实现待开工 V3-31/33）');
eq(scope.classify(null), 'extension_preview', '空配置 extension_preview');

/* ------------------------------------------------------------------ *
 * 3. 验收门禁：assertApprovedP0 拒绝白名单外（中文错误）
 * ------------------------------------------------------------------ */
ok(scope.assertApprovedP0(cfgFault) === true, 'assertApprovedP0 白名单内通过');
let threw = null;
try { scope.assertApprovedP0(mk({ fault: { family: 'sensor_drift', faultId: 'I_bat_sensor_bias', t_start_s: 20, params: { magnitude: 12 } } })); } catch (e) { threw = e; }
ok(!!threw && threw.code === 'SCOPE-E01' && threw.message.indexOf('超出 G0 批准范围') !== -1,
  'assertApprovedP0 白名单外抛 SCOPE-E01（中文）', threw && threw.message);

/* ------------------------------------------------------------------ *
 * 4. manifest / 证据包携带 scope
 * ------------------------------------------------------------------ */
const runApproved = FL.registry.createRun({ config: cfgFault, runId: 'RUN-SCOPE-A', createdAt: '2026-10-28T00:00:00Z' });
eq(runApproved.manifest.scope, 'approved_p0', 'manifest.scope=approved_p0');
const runExt = FL.registry.createRun({ config: mk({ fault: { family: 'sensor_drift', faultId: 'I_bat_sensor_bias', t_start_s: 20, params: { magnitude: 12 } } }), runId: 'RUN-SCOPE-B', createdAt: '2026-10-28T00:00:00Z' });
eq(runExt.manifest.scope, 'extension_preview', 'manifest.scope=extension_preview（幅值 12）');

const files = FL.bundle.buildBundleFiles(runExt);
ok(files['manifest.json'].indexOf('"scope": "extension_preview"') !== -1, '证据包 manifest 携带 scope=extension_preview');
const imp = FL.bundle.importBundle(Object.assign({}, files));
eq(imp.manifest.scope, 'extension_preview', '导入后保留 scope 标注');
const filesA = FL.bundle.buildBundleFiles(runApproved);
ok(filesA['manifest.json'].indexOf('"scope": "approved_p0"') !== -1, 'approved Run 证据包 scope=approved_p0');

/* ------------------------------------------------------------------ *
 * 5. golden 比对路径仅覆盖 approved Run（engine.test 已仅用白名单配置；
 *    此处验证三组固定 Run 的 scope 全为 approved_p0，防止白名单漂移）
 * ------------------------------------------------------------------ */
[cfgBase, cfgFault, cfgMon].forEach((c, i) => {
  ok(scope.isApprovedP0(c), '三组固定 Run 配置 ' + (i + 1) + ' 在 P0 白名单内（防止白名单漂移）');
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
console.log('批准范围守卫测试全部通过（SA-24 / P0b-07）。');
