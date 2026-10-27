/* owner: core-evidence | module: tests/bundle | contract: NEXT/DATA_CONTRACT_SPEC.md §2.12/§5
   G2 证据包测试（I-06 / T-10/T-11 / 负例矩阵 N-1…N-10）。
   运行：node tests/bundle.test.js；失败非零退出。
   另以子进程调用 python tools/verify_bundle.py 对目录形态做交叉验证（N-2 负例）。 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { bootstrap } = require('./core-load');
const FL = bootstrap();
const core = FL.core;
const bundle = FL.bundle;

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }
function expectCode(fn, codeExpected, name) {
  try {
    fn();
    ok(false, name, 'expected 抛 ' + codeExpected + '，实际未抛');
  } catch (e) {
    ok(e && e.code === codeExpected, name,
      'expected ' + codeExpected + '，actual ' + (e && e.code) + '（' + (e && e.message) + '）');
  }
}

const run = FL.registry.createRun({
  config: core.createConfig('FL-001', {}),
  runId: 'RUN-BUNDLE1',
  createdAt: '2026-10-28T00:00:00Z'
});
const GOOD = bundle.buildBundleFiles(run);

/* ------------------------------------------------------------------ *
 * 1. 包结构（T-10）：7 数据文件 + SHA256SUMS.txt
 * ------------------------------------------------------------------ */
eq(Object.keys(GOOD).sort().join(','),
  ['SHA256SUMS.txt', 'checks.json', 'config.json', 'events.json', 'manifest.json',
    'metrics.json', 'model_manifest.json', 'timeseries.csv'].sort().join(','),
  'EvidenceBundle v1 文件集齐全（8 文件）');
const manifest = JSON.parse(GOOD['manifest.json']);
eq(manifest.bundle_schema_version, 'v1', 'bundle_schema_version=v1');
eq(manifest.event_encoding_version, 1, 'event_encoding_version=1');
ok(manifest.files.length === 6, 'manifest.files 列出 6 个数据文件（不含 manifest 自身/SHA256SUMS）');
const sumsLines = GOOD['SHA256SUMS.txt'].trim().split('\n');
eq(sumsLines.length, 7, 'SHA256SUMS.txt 含 7 条记录');
const fl = core;
const runHashInSums = sumsLines.some((l) => l.endsWith('manifest.json'));
ok(runHashInSums, 'SHA256SUMS 覆盖 manifest.json');
ok(manifest.integrity.run_hash === run.manifest.run_hash, 'manifest 记录 run_hash');
ok(manifest.created_at !== undefined && manifest.integrity.run_hash,
  'created_at 在场但不参与 run_hash（由 registry 测试覆盖确定性）');

/* CSV 规范（§3.3） */
const csv = GOOD['timeseries.csv'];
ok(csv.charCodeAt(0) === 0xFEFF, 'CSV 带 BOM');
const csvBody = csv.replace(/^\uFEFF/, '');
ok((csvBody.match(/#/g) || []).length >= 6, 'CSV 前 6 行 # 元数据注释');
ok(csvBody.indexOf('# run_hash=' + run.manifest.run_hash) !== -1, 'CSV 注释含 run_hash');
ok(csvBody.split('\n').filter((l) => l.trim() && l[0] !== '#').length === 602, '表头 + 601 数据行');

/* ------------------------------------------------------------------ *
 * 2. 导入重载（T-10）：哈希→Schema→重算→run_hash 全通过
 * ------------------------------------------------------------------ */
const imp = bundle.importBundle(Object.assign({}, GOOD));
eq(imp.role, 'imported', '导入角色=imported');
eq(imp.manifest.run_hash, run.manifest.run_hash, '重载后 run_hash 一致');
eq(JSON.stringify(imp.timeseries.t), JSON.stringify(run.timeseries.t), '重载 TimeSeries.t 逐点一致');
eq(JSON.stringify(imp.timeseries.signals.I_bat_true_A), JSON.stringify(run.timeseries.signals.I_bat_true_A),
  '重载信号逐点一致（最短往返无损）');
eq(imp.metrics.length, run.metrics.length, '重载指标数量一致');
eq(imp.quality.length, run.quality.length, '重载检查数量一致');
eq(JSON.parse(JSON.stringify(imp.manifest.verification)).model_validation, 'not_performed', '导入保留三级证据声明');
const srcBefore = JSON.stringify(run);
bundle.importBundle(Object.assign({}, GOOD));
eq(JSON.stringify(run), srcBefore, '导入不污染存储中的原 Run（不覆盖，契约 §5.1）');

/* reseal 工具：篡改内容后同步更新 manifest.files 与 SHA256SUMS（模拟“语义一致但内容被改”） */
function reseal(files) {
  const manifestObj = JSON.parse(files['manifest.json']);
  manifestObj.files.forEach((f) => {
    f.sha256 = FL.core.sha256(files[f.path]);
    f.bytes = bundle._bytesOf(files[f.path]);
  });
  files['manifest.json'] = JSON.stringify(manifestObj, null, 2);
  const names = Object.keys(files).filter((n) => n !== 'SHA256SUMS.txt');
  files['SHA256SUMS.txt'] = names.map((n) => FL.core.sha256(files[n]) + '  ' + n).join('\n') + '\n';
  return files;
}

/* resealDeep：在 reseal 之上再重算 run_hash（模拟连内容哈希都重算的“完全一致”伪造，
   只能靠“用导入数据重算 metrics 并比对”这一层语义校验抓出——对应 N-3）。 */
function resealDeep(files) {
  const f = reseal(files);
  const m = JSON.parse(f['manifest.json']);
  const csvParsed = bundle.parseCsv(f['timeseries.csv']);
  const eventsFull = JSON.parse(f['events.json']).events || [];
  const events = eventsFull.map((ev) => {
    const copy = JSON.parse(JSON.stringify(ev));
    delete copy.snapshots;
    return copy;
  });
  const hash = FL.registry.computeRunHashFromParts({
    config_hash: m.config_hash,
    model_hash: m.model_hash,
    engine_version: m.engine_version,
    t: csvParsed.t,
    signals: csvParsed.signals,
    events: events,
    metrics: JSON.parse(f['metrics.json']).metrics || [],
    checks: JSON.parse(f['checks.json']).checks || []
  });
  m.integrity.run_hash = hash;
  f['manifest.json'] = JSON.stringify(m, null, 2);
  return reseal(f);
}

/* ------------------------------------------------------------------ *
 * 3. 负例矩阵（§5.3，≥8 例全过且中文错误）
 * ------------------------------------------------------------------ */
/* N-1 缺文件 */
expectCode(() => {
  const f = Object.assign({}, GOOD); delete f['timeseries.csv']; bundle.importBundle(f);
}, 'CN-E01', 'N-1 缺 timeseries.csv → CN-E01');

/* N-2 改 CSV 一行（哈希不符） */
expectCode(() => {
  const f = Object.assign({}, GOOD);
  f['timeseries.csv'] = f['timeseries.csv'].replace(/,25\b/, ',26');
  bundle.importBundle(f);
}, 'CN-E07', 'N-2 篡改 CSV → 内容校验失败 CN-E07（指出文件）');

/* N-3 改 metrics.json 数值（校验和与 run_hash 全部重封 → 仅剩“重算比对”能抓出） */
expectCode(() => {
  const f = Object.assign({}, GOOD);
  const m = JSON.parse(f['metrics.json']);
  m.metrics[0].value = 0.999;
  f['metrics.json'] = JSON.stringify(m, null, 2);
  bundle.importBundle(resealDeep(f));
}, 'CN-E08', 'N-3 篡改指标+深度重封 → 重算比对失败 CN-E08');

/* N-4 时间非单调（重写 CSV + 重封包） */
expectCode(() => {
  const f = Object.assign({}, GOOD);
  const body = f['timeseries.csv'].replace(/^\uFEFF/, '');
  const lines = body.split('\n');
  const hIdx = lines.findIndex((l) => l.startsWith('t_s,'));
  const r1 = lines[hIdx + 1].split(',');
  const r2 = lines[hIdx + 2].split(',');
  lines[hIdx + 2] = [r1[0]].concat(r2.slice(1)).join(','); /* 第二行时间复制第一行 → 非递增 */
  f['timeseries.csv'] = '\uFEFF' + lines.join('\n');
  bundle.importBundle(reseal(f));
}, 'CN-E03', 'N-4 时间非单调 → CN-E03');

/* N-5 NaN（写入 NaN 字面量 + 重封包） */
expectCode(() => {
  const f = Object.assign({}, GOOD);
  const lines = f['timeseries.csv'].replace(/^\uFEFF/, '').split('\n');
  const hIdx = lines.findIndex((l) => l.startsWith('t_s,'));
  const cells = lines[hIdx + 5].split(',');
  cells[1] = 'NaN';
  lines[hIdx + 5] = cells.join(',');
  f['timeseries.csv'] = '\uFEFF' + lines.join('\n');
  bundle.importBundle(reseal(f));
}, 'CN-E04', 'N-5 NaN → CN-E04');

/* N-6 schema 主版本不同 */
expectCode(() => {
  const f = Object.assign({}, GOOD);
  const m = JSON.parse(f['manifest.json']);
  m.schema_version = '2.0.0';
  f['manifest.json'] = JSON.stringify(m, null, 2);
  bundle.importBundle(f);
}, 'CN-E06', 'N-6 schema 主版本 2.0.0 → CN-E06 明确拒绝');
expectCode(() => {
  const f = Object.assign({}, GOOD);
  const m = JSON.parse(f['manifest.json']);
  m.bundle_schema_version = 'v9';
  f['manifest.json'] = JSON.stringify(m, null, 2);
  bundle.importBundle(f);
}, 'CN-E06', 'N-6b bundle 版本未知 → CN-E06');

/* N-7 schema minor 更高（1.1.0）→ 警告 + 接受（ reseal：仅版本声明变化，校验和需重封） */
(function () {
  const f = Object.assign({}, GOOD);
  const m = JSON.parse(f['manifest.json']);
  m.schema_version = '1.1.0';
  f['manifest.json'] = JSON.stringify(m, null, 2);
  const imported = bundle.importBundle(reseal(f));
  ok(Array.isArray(imported.importWarnings) && imported.importWarnings.length > 0,
    'N-7 minor 更高 → 警告并保留（unknown_fields 策略）', JSON.stringify(imported.importWarnings));
})();

/* N-8 超大文件 */
expectCode(() => {
  const f = Object.assign({}, GOOD);
  f['checks.json'] = '{"pad":"' + 'x'.repeat(9 * 1024 * 1024) + '"}';
  bundle.importBundle(f);
}, 'CN-E13', 'N-8 超大文件 → 防护拒绝 CN-E13');

/* N-9 注入字符串：仅作为文本渲染数据，不执行；导入保留原字符 */
(function () {
  const f = Object.assign({}, GOOD);
  const m = JSON.parse(f['manifest.json']);
  m.label = '<script>alert(1)</script>';
  f['manifest.json'] = JSON.stringify(m, null, 2);
  const imported = bundle.importBundle(reseal(f));
  eq(imported.label, '<script>alert(1)</script>', 'N-9 注入串仅作为数据保留（渲染层 textContent，不执行）');
})();

/* N-10 JSON 损坏 */
expectCode(() => {
  const f = Object.assign({}, GOOD);
  f['manifest.json'] = f['manifest.json'].slice(0, 40);
  bundle.importBundle(f);
}, 'CN-E13', 'N-10 JSON 损坏 → CN-E13（含定位）');

/* 缺 manifest.run_hash（N-2 变体：结构合法但身份缺失） */
expectCode(() => {
  const f = Object.assign({}, GOOD);
  const m = JSON.parse(f['manifest.json']);
  m.integrity.run_hash = '';
  f['manifest.json'] = JSON.stringify(m, null, 2);
  bundle.importBundle(reseal(f));
}, 'CN-E07', '缺 run_hash → CN-E07');

/* ------------------------------------------------------------------ *
 * 4. 目录形态交叉验证：python tools/verify_bundle.py（好包 exit 0 / 坏包非零）
 * ------------------------------------------------------------------ */
(function () {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'faultlab-bundle-'));
  const outDir = path.join(tmp, 'RUN-BUNDLE1');
  fs.mkdirSync(outDir);
  Object.keys(GOOD).forEach((name) => fs.writeFileSync(path.join(outDir, name), GOOD[name], 'utf8'));
  const py = spawnSync('python', ['tools/verify_bundle.py', outDir], { encoding: 'utf8' });
  ok(py.status === 0, 'verify_bundle.py 好包 exit 0', (py.stdout || '') + (py.stderr || ''));
  ok((py.stdout || '').indexOf('run_hash') !== -1 || (py.stdout || '').indexOf('"ok": true') !== -1,
    'verify_bundle.py 输出机器可读结果');

  const badDir = path.join(tmp, 'RUN-TAMPERED');
  fs.mkdirSync(badDir);
  const bad = Object.assign({}, GOOD);
  bad['timeseries.csv'] = bad['timeseries.csv'].replace(/,25\b/, ',26');
  Object.keys(bad).forEach((name) => fs.writeFileSync(path.join(badDir, name), bad[name], 'utf8'));
  const py2 = spawnSync('python', ['tools/verify_bundle.py', badDir], { encoding: 'utf8' });
  ok(py2.status !== 0, 'verify_bundle.py 篡改包非零退出');
  fs.rmSync(tmp, { recursive: true, force: true });
})();

/* ------------------------------------------------------------------ */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('---- 失败明细（前 30）----');
  failures.slice(0, 30).forEach((f, i) => console.log('  [' + i + '] ' + f.name + '\n      ' + f.detail));
  console.log('================================================');
  process.exit(1);
}
console.log('EvidenceBundle v1 导出/导入/负例测试全部通过。');
void fl;
