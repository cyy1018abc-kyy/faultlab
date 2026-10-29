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
  const baseCfg = { duration_s: 60.0, dt_s: 0.1, fault_time_s: 20.0, bias_A: 10.0,
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
