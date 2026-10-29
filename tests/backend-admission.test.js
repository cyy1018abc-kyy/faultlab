/* owner: backend-adapter | module: tests/backend-admission | contract: V312_BACKEND_ADMISSION_CHECKLIST §1/§2/§4 + FL19 RFC §5
   FL-19 后端适配准入机检（G-1 准入门绑定 / G-2 依赖冻结 / golden 容差档校验）。
   运行：node tests/backend-admission.test.js；失败非零退出。
   注：V312 §6 的 scope-guard 四断言随增补二（createFromParts 组装层）交付——本文件先固化
   classify 语义零改动断言（断言 2 的纯函数面）。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');
const { bootstrap } = require('./core-load');

const ROOT = path.join(__dirname, '..');
const FL = bootstrap();
(0, eval)(fs.readFileSync(path.join(ROOT, 'src', 'core', 'golden-compare.js'), 'utf8'));
const adapterUrl = pathToFileURL(path.join(ROOT, 'tools', 'backend', 'fl001-adapter.mjs')).href;

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }

const golden = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'golden', 'fl001_v1.json'), 'utf8'));
const catalogIds = new Set(FL.systems.get('FL-001').signals.map((s) => s.id));

/* 增量加载 ESM 适配器（Node 20+ 支持 sync import） */
let adapter = null;
(async () => {
  adapter = await import(adapterUrl);

  /* ---------- G-1a：准入门绑定 ---------- */
  const caps = adapter.list();
  eq(caps.length, 2, 'G-1a 首批注册适配器数 = 2（B-1/B-5）');
  for (const c of caps) {
    eq(JSON.stringify(c.capabilities.systems), JSON.stringify(['FL-001']), 'G-1a ' + c.backend.id + ' 仅承载 FL-001');
    for (const sid of c.backend.signals) {
      ok(catalogIds.has(sid), 'G-1c ' + c.backend.id + ' 信号 ∈ FL-001 目录：' + sid);
    }
    ok(catalogIds.has('I_bat_true_A'), 'G-1c 目录基线就绪');
    ok(typeof c.backend.equations_source === 'string' && c.backend.equations_source.length > 0,
      'G-1c ' + c.backend.id + ' 声明方程出处');
    ok(!['analytic_flux', 'trapezoid', 'substep'].includes(c.backend.method_id),
      'G-1c ' + c.backend.id + ' method_id 不占用冻结枚举（V312 §5）');
  }

  /* ---------- G-2：依赖冻结（仅标准库） ---------- */
  const allow = new Set(['json', 'math', 'sys', 'argparse']);
  for (const f of adapter.sourceFiles()) {
    const src = fs.readFileSync(f, 'utf8');
    const imports = [...src.matchAll(/^\s*(?:import|from)\s+([A-Za-z_][\w.]*)/gm)].map((m) => m[1].split('.')[0]);
    const bad = imports.filter((m) => !allow.has(m));
    ok(bad.length === 0, 'G-2 ' + path.basename(f) + ' 仅标准库 import', bad.join(','));
    ok(/license_verified["']?\s*:\s*True/.test(src), 'G-2 ' + path.basename(f) + ' 许可证已核实（原文路径登记于 RFC §2）');
  }

  /* ---------- 自检 ---------- */
  for (const id of Object.keys(adapter.ADAPTERS)) {
    const sc = adapter.selfCheck(id);
    ok(sc.ok, '自检 ' + id, sc.stderr);
  }

  /* ---------- 三场景 × 双后端 golden 校验 ---------- */
  const runs = [
    ['healthy', { feedback_mode: 'closed_loop', family: 'none' }],
    ['closed_loop_fault', { feedback_mode: 'closed_loop', family: 'sensor_drift' }],
    ['monitor_only', { feedback_mode: 'monitor', family: 'sensor_drift' }]
  ];
  const baseCfg = { systemId: 'FL-001', duration_s: 60.0, dt_s: 0.1, fault_time_s: 20.0, bias_A: 10.0,
    Pload_demand_kW: 30.0, SOC0_pct: 60.0, tau_s: 1.5 };
  for (const [runId, patch] of runs) {
    const cfg = Object.assign({}, baseCfg, patch);
    const grun = golden.runs[runId];

    const b1 = adapter.produce('py-analytic-fl001', cfg);
    const cmp1 = FL.core.goldenCompare(b1, grun, 'fl001-analytic-crosscheck', golden.tolerances.analytic_crosscheck);
    ok(cmp1.ok, 'B-1 × ' + runId + ' 解析交叉层（golden.tolerances.analytic_crosscheck）',
      cmp1.violations.slice(0, 2).map((v) => v.key + ' ' + v.detail).join(' | '));

    const b5 = adapter.produce('py-rk4-fl001', cfg);
    const cmp5 = FL.core.goldenCompare(b5, grun, 'fl001-rk4-dt0.1');
    ok(cmp5.ok, 'B-5 × ' + runId + ' 声明档 rk4（E ±5e-4 / SOC ±5e-3 / 逐点 rtol 1e-3）',
      cmp5.violations.slice(0, 2).map((v) => v.key + ' ' + v.detail).join(' | '));

    /* 确定性：同 config 两次 produce 逐字节一致 */
    const b1again = adapter.produce('py-analytic-fl001', cfg);
    eq(JSON.stringify(b1again), JSON.stringify(b1), '确定性 ' + runId + '（B-1 两次 produce 一致）');
  }

  /* 负例：B-5 不得套用解析交叉层档（rtol 1e-12）——容差档声明制 */
  const cfgF = Object.assign({}, baseCfg, { feedback_mode: 'closed_loop', family: 'sensor_drift' });
  const b5f = adapter.produce('py-rk4-fl001', cfgF);
  const cmpBad = FL.core.goldenCompare(b5f, golden.runs.closed_loop_fault,
    'fl001-analytic-crosscheck', golden.tolerances.analytic_crosscheck);
  ok(cmpBad.ok === false, '负例：B-5 套用 analytic-crosscheck 档被拒（档位声明制）');

  /* 超差检出：篡改后端序列须被 golden-compare 捕获（BK-E03 载体自证） */
  const b1f = adapter.produce('py-analytic-fl001', cfgF);
  b1f.signals.I_bat_meas_A[300] += 0.5;
  const cmpTamper = FL.core.goldenCompare(b1f, golden.runs.closed_loop_fault,
    'fl001-analytic-crosscheck', golden.tolerances.analytic_crosscheck);
  ok(cmpTamper.ok === false && cmpTamper.violations.some((v) => v.kind === 'series'),
    '负例：篡改序列被检出（BK-E03 载体自证）');

  /* ---------- V312 §6 断言 2（纯函数面）：classify 语义零改动 ---------- */
  const wl = { systemId: 'FL-001', modelId: 'fl001', modelVersion: 'fl001.1', duration_s: 60, dt_s: 0.1,
    fault_time_s: 20.0, bias_A: 10, feedback_mode: 'closed_loop', initial: { load_kW: 30, SOC_pct: 60 },
    fault: { family: 'sensor_drift', params: { magnitude: 10 }, t_start_s: 20.0 } };
  eq(FL.scope.classify(wl), 'approved_p0', 'V312 §6 断言 2：classify 对白名单场景仍判 approved_p0（组装层强制发生在增补二）');

  /* ---------- 增量二：createFromParts 组装层（scope 断言 1/3/4 + 对比闸门 + BK-E02） ---------- */
  const cfgEngine = FL.core.createConfig('FL-001', { fault: { family: 'sensor_drift' }, feedback_mode: 'closed_loop' });
  const producedB1 = adapter.produce('py-analytic-fl001', cfgF);
  const backendDecl = {
    id: producedB1.backend.id, version: producedB1.backend.version,
    method_id: producedB1.backend.method_id,
    tolerance_profile_id: producedB1.backend.tolerance_profile_id,
    provenance: producedB1.backend.provenance
  };
  const backendRun = FL.registry.createFromParts({
    config: cfgEngine, produced: producedB1, backend: backendDecl, golden
  });
  /* 断言 1：backend Run 强制 extension_preview（即使 config 落在白名单内） */
  eq(backendRun.manifest.scope, 'extension_preview', '断言 1：backend Run scope 强制 extension_preview');
  /* 断言 2（复核）：classify 对同 config 仍判 approved_p0（强制发生在组装层） */
  eq(FL.scope.classify(backendRun.config), 'approved_p0', '断言 2：classify 语义零改动');
  /* 断言 3：后端 Run 不得进入应用内 approved 验收路径 */
  let scopeErr = null;
  try { FL.scope.assertApprovedP0(backendRun); } catch (e) { scopeErr = e; }
  ok(scopeErr && scopeErr.code === 'SCOPE-E01', '断言 3：assertApprovedP0 对后端 Run 抛 SCOPE-E01');
  /* engine_version = 产生数值的实现版本（≠ JS '0.1.0'） */
  ok(backendRun.engineVersion.indexOf('py-analytic-fl001@') === 0 && backendRun.engineVersion !== '0.1.0',
    'engine_version = 实现版本（' + backendRun.engineVersion + '）');
  ok(backendRun.manifest.backend && backendRun.manifest.backend.method_id === 'py_analytic',
    'manifest.backend 携带适配器身份与容差档');
  ok(backendRun.manifest.provenance.model_provenance === 'analytical_demo',
    'B-1 provenance = analytical_demo（Q-3 裁定）');
  /* golden 附加检查（BK-E03 载体在组装层生效） */
  ok(backendRun.quality.some((q) => q.id === 'vs_golden_tolerance' && q.status === 'pass'),
    'vs_golden_tolerance 检查 pass（B-1 解析交叉层）');
  /* 哈希可重算（backend 字段不入 run_hash，RFC §5.2） */
  eq(FL.registry.verifyRunHash(backendRun), true, '后端 Run run_hash 可重算一致');
  /* 跨后端对比闸门：JS Run vs 后端 Run 引擎版本不一致 → incomparable */
  const jsRun = FL.registry.createRun({ config: cfgEngine, runId: 'RUN-JS-CMP' });
  const cmpBE = FL.core.compareRuns(jsRun, backendRun);
  eq(cmpBE.valid, false, '跨后端对比 valid=false（engineVersion 闸门）');
  ok(cmpBE.checks.some((c) => c.id === 'engine-version' && c.status === 'fail'), 'engine-version check=fail');
  /* 断言 4：证据包导出 → scope 落 manifest，结构层校验通过 */
  const bundleFiles = FL.bundle.buildBundleFiles(backendRun);
  const bm = JSON.parse(bundleFiles['manifest.json']);
  eq(bm.scope, 'extension_preview', '断言 4：证据包 manifest.scope=extension_preview');
  eq(bm.integrity.run_hash, backendRun.manifest.run_hash, '断言 4：包内 run_hash 与 Run 一致');
  /* BK-E02 原子性：信号缺失 → 抛错且无半成品 */
  const broken = JSON.parse(JSON.stringify(producedB1)); broken.signals.made_up_extra = producedB1.signals.I_bat_true_A.slice();
  let bk02 = null;
  try { FL.registry.createFromParts({ config: cfgEngine, produced: broken, backend: backendDecl, golden }); }
  catch (e) { bk02 = e; }
  ok(bk02 && bk02.code === 'BK-E02', 'BK-E02：信号集不一致拒绝（不部分采纳）');
  /* B-5 组装 + 声明档 golden 检查 */
  const producedB5 = adapter.produce('py-rk4-fl001', cfgF);
  const b5Run = FL.registry.createFromParts({
    config: cfgEngine, produced: producedB5,
    backend: { id: producedB5.backend.id, version: producedB5.backend.version,
      method_id: producedB5.backend.method_id,
      tolerance_profile_id: producedB5.backend.tolerance_profile_id,
      provenance: producedB5.backend.provenance },
    golden
  });
  ok(b5Run.quality.some((q) => q.id === 'vs_golden_tolerance' && q.status === 'pass'),
    'B-5 vs_golden_tolerance pass（rk4 声明档）');
  eq(b5Run.manifest.provenance.model_provenance, 'numerical_simulation', 'B-5 provenance = numerical_simulation（Q-3 裁定）');

  /* ---------- 汇总 ---------- */
  console.log('\n== FL-19 后端适配准入机检（G-1/G-2 + golden 容差档） ==');
  if (fail) {
    console.log('FAIL ' + fail + ' / PASS ' + pass);
    failures.forEach((f) => console.log('  ✗ ' + f));
    process.exit(1);
  }
  console.log('PASS ' + pass + ' / FAIL 0 ✓（B-1 解析交叉层 / B-5 声明档 / G-1a·c / G-2 / 确定性 / 负例）');
  process.exit(0);
})().catch((e) => { console.error('[FAIL] ' + e.message); process.exit(1); });
