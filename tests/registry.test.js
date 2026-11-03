/* owner: core-registry | module: tests/registry | contract: NEXT/DATA_CONTRACT_SPEC.md §3/§4
   G2 四件套③ RunRegistry/规范哈希（I-05 / PHY-09 / SA-21 / T-08/T-09）。
   运行：node tests/registry.test.js；失败非零退出。 */
'use strict';

const { bootstrap } = require('./core-load');
const FL = bootstrap();
const core = FL.core;
const reg = FL.registry;

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }

/* ------------------------------------------------------------------ *
 * 1. Canonicalization v1（T-08 / G0-DEC-07）
 * ------------------------------------------------------------------ */
const h = core.hashObject;
eq(h({ b: 1, a: 2 }), h({ a: 2, b: 1 }), '对象键序不影响哈希（Unicode 码点升序）');
ok(h({ arr: [1, 2] }) !== h({ arr: [2, 1] }), '数组保序（重排改变哈希）');
eq(h({ x: -0 }), h({ x: 0 }), '−0 归一化为 0');
eq(h({ x: 0.1 }), h({ x: 0.1 }), '数值最短往返确定性');
eq(h({ s: '中文↔mix' }), h({ s: '中文↔mix' }), '字符串不做 Unicode 归一化、保留原字符');
let threw = false;
try { core.hashObjectStrict({ x: NaN }); } catch (e) { threw = true; }
ok(threw, 'Canonicalization v1 严格模式拒绝 NaN');
threw = false;
try { core.hashObjectStrict({ x: Infinity }); } catch (e) { threw = true; }
ok(threw, '严格模式拒绝 Infinity');
eq(h({ x: undefined, y: 1 }), h({ y: 1 }), 'undefined 字段不参与哈希');

/* ------------------------------------------------------------------ *
 * 2. Run 创建与深冻结（T-09 / SA-21）
 * ------------------------------------------------------------------ */
const runA = reg.createRun({ config: core.createConfig('FL-001', {}), runId: 'RUN-A1', createdAt: '2026-10-28T00:00:00Z' });
ok(Object.isFrozen(runA), 'Run 顶层冻结');
ok(Object.isFrozen(runA.timeseries), 'TimeSeries 冻结');
ok(Object.isFrozen(runA.timeseries.signals.I_bat_true_A), '序列数组冻结');
ok(Object.isFrozen(runA.snapshots[0].variables), '快照 variables 冻结');
ok(Object.isFrozen(runA.manifest), 'manifest 冻结');

/* 严格模式尝试改写：抛错或静默失效，内容不变 */
const snapshotBefore = JSON.stringify(runA);
let mutateThrew = false;
try { runA.runId = 'HACKED'; } catch (e) { mutateThrew = true; }
ok((mutateThrew || runA.runId !== 'HACKED') && JSON.stringify(runA) === snapshotBefore,
  'Run 不可变：改写被拒绝且内容逐字节不变（PHY-09）');
mutateThrew = false;
try { runA.timeseries.signals.I_bat_true_A[0] = 999; } catch (e) { mutateThrew = true; }
ok((mutateThrew || runA.timeseries.signals.I_bat_true_A[0] !== 999), '序列数据不可改写');

/* ------------------------------------------------------------------ *
 * 3. run_hash 确定性：同内容同哈希；created_at/run_id 不入哈希（T-08）
 * ------------------------------------------------------------------ */
const runB = reg.createRun({ config: core.createConfig('FL-001', {}), runId: 'RUN-B2', createdAt: '1999-01-01T00:00:00Z' });
eq(runA.manifest.run_hash, runB.manifest.run_hash, '同配置两次运行 run_hash 相同（run_id/created_at 差异不改变哈希）');
ok(runA.manifest.run_id !== runB.manifest.run_id, 'run_id 独立（新实例）');
eq(runA.manifest.config_hash, runB.manifest.config_hash, 'config_hash 相同');
eq(reg.verifyRunHash(runA), true, 'verifyRunHash 通过');
eq(reg.verifyRunHash(runB), true, 'verifyRunHash（第二个实例）通过');

/* 篡改检测：复制后改数据 → 哈希校验失败 */
const tampered = JSON.parse(JSON.stringify(runA));
tampered.timeseries.signals.I_bat_true_A[300] += 0.001;
eq(reg.verifyRunHash(tampered), false, '内容被篡改 → run_hash 校验失败');

/* ------------------------------------------------------------------ *
 * 4. 配置变更 → 新 Run、旧 Run 不被改写（PHY-09 / SA-21）
 * ------------------------------------------------------------------ */
const cfgMag12 = core.createConfig('FL-001', { fault: { family: 'sensor_drift', faultId: 'I_bat_sensor_bias', t_start_s: 20, params: { magnitude: 12 } } });
const runMag12 = reg.createRun({ config: cfgMag12, runId: 'RUN-C3', createdAt: '2026-10-28T00:00:00Z' });
ok(runMag12.manifest.config_hash !== runA.manifest.config_hash, '改 bias_A → config_hash 不同');
ok(runMag12.manifest.run_hash !== runA.manifest.run_hash, '改 bias_A → run_hash 不同');
eq(JSON.stringify(runA), snapshotBefore, '新 Run 创建后旧 Run 内容不变');
const baselineRun = reg.createRun({
  config: core.createConfig('FL-001', { fault: { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } } }),
  runId: 'RUN-D4', createdAt: '2026-10-28T00:00:00Z'
});
eq(JSON.parse(JSON.stringify(baselineRun.manifest.verification)).model_validation, 'not_performed', 'manifest 三级证据字段在场');
eq(baselineRun.manifest.event_encoding_version, 1, 'manifest event_encoding_version=1');
eq(baselineRun.manifest.bundle_schema_version, 'v1', 'manifest bundle_schema_version=v1');
ok(baselineRun.manifest.created_at !== undefined, 'created_at 保留在 manifest（但不入哈希）');

/* ------------------------------------------------------------------ *
 * 5. 草稿分离：创建后修改 draft 不影响 Run（DATA_CONTRACT_SPEC §4.2）
 * ------------------------------------------------------------------ */
const draft = core.createConfig('FL-001', {});
const runFromDraft = reg.createRun({ config: draft, runId: 'RUN-E5', createdAt: '2026-10-28T00:00:00Z' });
draft.fault.params.magnitude = 30;      /* 之后污染草稿 */
draft.initial.load_kW = 45;
eq(runFromDraft.config.fault.params.magnitude, 10, '创建后改 draft：Run.config 不受影响');
eq(runFromDraft.config.initial.load_kW, 30, 'Run 初始条件不受 draft 污染');
eq(reg.verifyRunHash(runFromDraft), true, '被污染 draft 不影响已建 Run 哈希');

/* ------------------------------------------------------------------ *
 * 6. ScenarioConfig §2.1 投影哈希对键序/无关字段不敏感
 * ------------------------------------------------------------------ */
const cfgAlt = JSON.parse(JSON.stringify(core.createConfig('FL-001', {})));
cfgAlt.initial = { SOC_pct: 60, load_kW: 30 }; /* 键序对调 */
const runAlt = reg.createRun({ config: cfgAlt, runId: 'RUN-F6', createdAt: '2026-10-28T00:00:00Z' });
eq(runAlt.manifest.config_hash, runA.manifest.config_hash, 'config_hash 对内部键序不敏感（规范化投影）');

/* ------------------------------------------------------------------ *
 * 7. 非法配置拒绝（invalid_config 不建 Run）
 * ------------------------------------------------------------------ */
let rejected = null;
try {
  reg.createRun({ config: Object.assign(core.createConfig('FL-001', {}), { duration_s: 12 }), runId: 'RUN-X' });
} catch (e) { rejected = e; }
ok(!!rejected && rejected.code === 'CN-E02', '越界配置拒绝创建 Run（CN-E02 中文错误）', rejected && rejected.message);

/* ------------------------------------------------------------------ *
 * 8. config_hash 键序不敏感：同一配置、不同键插入顺序 → 同 hash
 *    （R-3 不变量④ / W2-4 / DEC-R2；canonicalize 递归键排序，hash.js:44-57）
 * ------------------------------------------------------------------ */
function reverseKeysDeep(o) {
  if (Array.isArray(o)) return o.map(reverseKeysDeep);
  if (o && typeof o === 'object') {
    const out = {};
    Object.keys(o).reverse().forEach((k) => { out[k] = reverseKeysDeep(o[k]); });
    return out;
  }
  return o;
}
const cfgKoA = core.createConfig('FL-001', { fault: { family: 'sensor_drift', faultId: 'I_bat_sensor_bias', t_start_s: 20, params: { magnitude: 12 } } });
const cfgKoB = core.createConfig('FL-001', { fault: { params: { magnitude: 12 }, t_start_s: 20, faultId: 'I_bat_sensor_bias', family: 'sensor_drift' } });
const cfgKoC = reverseKeysDeep(JSON.parse(JSON.stringify(cfgKoA))); /* 全层级键序倒置副本 */
const runKoA = reg.createRun({ config: cfgKoA, runId: 'RUN-G7', createdAt: '2026-10-28T00:00:00Z' });
const runKoB = reg.createRun({ config: cfgKoB, runId: 'RUN-H8', createdAt: '2026-10-28T00:00:00Z' });
const runKoC = reg.createRun({ config: cfgKoC, runId: 'RUN-I9', createdAt: '2026-10-28T00:00:00Z' });
eq(runKoA.manifest.config_hash, runKoB.manifest.config_hash, '不同 override 字面量键序 → 同 config_hash');
eq(runKoA.manifest.config_hash, runKoC.manifest.config_hash, '全层级键序倒置副本 → 同 config_hash');
eq(runKoA.manifest.run_hash, runKoC.manifest.run_hash, '同内容不同键序 → run_hash 相同');
eq(reg.verifyRunHash(runKoC), true, '键序倒置 Run 的哈希校验通过');

/* ------------------------------------------------------------------ *
 * 9. run_hash 冻结：Run 创建后修改 config 对象属性 → run_hash 不变
 *    （R-3 不变量⑤ / W2-4 / DATA_CONTRACT_SPEC §4.2：改参只产生新 Run）
 * ------------------------------------------------------------------ */
const cfgFrozen = core.createConfig('FL-001', { fault: { family: 'sensor_drift', faultId: 'I_bat_sensor_bias', t_start_s: 20, params: { magnitude: 12 } } });
const runFrozen = reg.createRun({ config: cfgFrozen, runId: 'RUN-J10', createdAt: '2026-10-28T00:00:00Z' });
const frozenHash = runFrozen.manifest.run_hash;
cfgFrozen.fault.params.magnitude = 18;      /* 创建后污染外部 config 草稿对象（多层属性） */
cfgFrozen.fault.t_start_s = 30;
cfgFrozen.initial.load_kW = 45;
cfgFrozen.initial.SOC_pct = 70;
cfgFrozen.feedback_mode = 'monitor';
eq(runFrozen.manifest.run_hash, frozenHash, '创建后改 config 对象：run_hash 不变');
eq(reg.verifyRunHash(runFrozen), true, '外部改参后 verifyRunHash 仍通过');
eq(reg.computeRunHash(runFrozen), frozenHash, 'run_hash 由（冻结）内容重算不变');
eq(runFrozen.config.fault.params.magnitude, 12, 'Run.config 不受外部污染（magnitude 保持 12）');
eq(runFrozen.config.initial.load_kW, 30, 'Run.config.initial 不受外部污染');
const runAfterMutate = reg.createRun({ config: cfgFrozen, runId: 'RUN-K11', createdAt: '2026-10-28T00:00:00Z' });
ok(runAfterMutate.manifest.run_hash !== frozenHash, '污染后参数创建新 Run → run_hash 不同（改参只产生新 Run）');
eq(runFrozen.manifest.run_hash, frozenHash, '新 Run 创建后旧 Run 哈希仍不变');

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('RunRegistry/规范哈希/不可变性测试全部通过（PHY-09 / SA-21）。');
