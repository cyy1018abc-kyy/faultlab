/**
 * run-g2.mjs — G2 验收四件套聚合器（P0b-05 / G0-DEC-16；V0.3.0 T1 追溯增强）。
 *
 *   node tools/run-g2.mjs            # 全部四件套
 *   node tools/run-g2.mjs --skip-e2e # 跳过浏览器 E2E（CI 无 Chrome 时）
 *
 * 四件套（缺一不可，任一失败 => 非零退出）：
 *   ① 数值脚本：python scripts/verify_golden.py（exit 0）+ node tests/engine.test.js
 *   ② 浏览器 E2E：node tools/e2e.mjs（PHY-08/SA-22 + 五视图 + 离线）
 *   ③ RunRegistry/规范哈希：node tests/registry.test.js
 *   ④ Schema/单位字典：node tests/schema.test.js（含导入负例 tests/bundle.test.js）
 *   附加回归：tests/event-phase.test.js、tests/core.test.js、tests/arena.test.js
 *
 * V0.3.0 追溯增强（不改变 19 步测试、执行顺序与 PASS/FAIL 判据）：
 *   - 代码版本：commit_sha / branch / worktree_dirty（含脏文件清单）
 *   - 运行环境：platform / arch / node / python
 *   - 执行信息：command / started_at / generated_at / duration_ms
 *   - 单项测试：duration_ms；失败时保留简短错误输出（error 字段）
 *   工作区不干净只作标记，不阻止测试。原有报告字段保留。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const skipE2e = args.indexOf('--skip-e2e') !== -1;
const STARTED_MS = Date.now();
const STARTED_AT = new Date().toISOString();
const COMMAND = 'node tools/run-g2.mjs' + (skipE2e ? ' --skip-e2e' : '');

/* ------------------------------------------------------- 追溯信息（T1） */
function git(argsArr) {
  const res = spawnSync('git', argsArr, { cwd: ROOT, encoding: 'utf8' });
  if (res.error || res.status !== 0) return null;
  return (res.stdout || '').trim();
}

function pythonVersion() {
  for (const cmd of ['python', 'python3']) {
    const res = spawnSync(cmd, ['--version'], { cwd: ROOT, encoding: 'utf8' });
    if (!res.error && res.status === 0) {
      return ((res.stdout || '') + (res.stderr || '')).trim() || null;
    }
  }
  return null;
}

const COMMIT_SHA = git(['rev-parse', 'HEAD']);
const BRANCH = git(['rev-parse', '--abbrev-ref', 'HEAD']);
const STATUS_TRACKED = git(['status', '--porcelain', '--untracked-files=no']);
const WORKTREE_DIRTY = STATUS_TRACKED === null ? null : STATUS_TRACKED.length > 0;
const DIRTY_PATHS = STATUS_TRACKED ? STATUS_TRACKED.split(/\r?\n/).filter(Boolean).slice(0, 20) : [];
const PYTHON_VERSION = pythonVersion();

const STEPS = [
  { id: '① verify_golden fl001（独立 oracle → golden 容差比对）', cmd: 'python', args: ['scripts/verify_golden.py'] },
  { id: '① verify_golden fc001（P1-06 / G2b-lite）', cmd: 'python', args: ['scripts/verify_golden.py', 'fc001'] },
  { id: '① verify_golden gt001（V3-31 / G2b v1.1）', cmd: 'python', args: ['scripts/verify_golden.py', 'gt001'] },
  { id: '① engine.test.js（FL-001 601 点对 golden + PHY/SA）', cmd: 'node', args: ['tests/engine.test.js'] },
  { id: '① engine-fc.test.js（FC-001 601 点对 golden，P1-06）', cmd: 'node', args: ['tests/engine-fc.test.js'] },
  { id: '+ plants.test.js（I-11 plant 接口护栏，CHG-20261030-07）', cmd: 'node', args: ['tests/plants.test.js'] },
  { id: '② e2e.mjs（浏览器 E2E，PHY-08/SA-22）', cmd: 'node', args: ['tools/e2e.mjs'], skip: skipE2e },
  { id: 'V3-03 perf.mjs（E2E 主旅程时长阈值，F-5 收尾）', cmd: 'node', args: ['tools/perf.mjs'], skip: skipE2e },
  { id: '③ registry.test.js（RunRegistry/规范哈希/不可变）', cmd: 'node', args: ['tests/registry.test.js'] },
  { id: '④ schema.test.js（Schema/单位字典/exposure/投影）', cmd: 'node', args: ['tests/schema.test.js'] },
  { id: '④ bundle.test.js（EvidenceBundle v1 + N-1…N-10 负例）', cmd: 'node', args: ['tests/bundle.test.js'] },
  { id: '+ event-phase.test.js（事件相位 G0-DEC-05）', cmd: 'node', args: ['tests/event-phase.test.js'] },
  { id: 'G4 scope-guard.test.js（SA-24 范围守卫）', cmd: 'node', args: ['tests/scope-guard.test.js'] },
  { id: 'G4 compare.test.js（对比白名单 T-15）', cmd: 'node', args: ['tests/compare.test.js'] },
  { id: 'G4 causal-rules.test.js（因果规则/证据链/教学卡）', cmd: 'node', args: ['tests/causal-rules.test.js'] },
  { id: 'G4 copy-guard.mjs（禁止词扫描 §6.3）', cmd: 'node', args: ['tools/copy-guard.mjs'] },
  { id: 'P1 report.test.js（HTML 报告验收）', cmd: 'node', args: ['tests/report.test.js'] },
  { id: 'G6 arena-protocol-negative.test.js（盲评测协议 v2 + N-B1…B17 负例 + MVP smoke + QP-4 假候选率）', cmd: 'node', args: ['tests/arena-protocol-negative.test.js'] },
  { id: 'FL-19 backend-admission.test.js（B-1/B-5 vs golden + 准入机检 G-1/G-2）', cmd: 'node', args: ['tests/backend-admission.test.js'] },
  { id: 'V3-33 engine-gt.test.js（GT-001 引擎 ↔ golden ±1e-9 + GT PHY 检查）', cmd: 'node', args: ['tests/engine-gt.test.js'] },
  { id: 'FL-19 backend-bridge.test.js（后端对照 HTTP 桥安全边界+端点）', cmd: 'node', args: ['tests/backend-bridge.test.js'] },
  { id: 'V3-34 fmu-admission（Q-5：model_manifest 强制 + zip 结构 + 拒绝路径）', cmd: 'python', args: ['tools/backend/py/fmu_admission.py', '--self-check'] },
  { id: '+ core.test.js（既有回归，适配新语义）', cmd: 'node', args: ['tests/core.test.js'] },
  { id: '+ arena.test.js（既有回归）', cmd: 'node', args: ['tests/arena.test.js'] }
];

/* 失败时保留简短错误输出（T1）：stdout/stderr 各取末尾若干行，总长受限 */
function shortError(res) {
  const tail = (text, lines) => {
    const all = String(text || '').split(/\r?\n/).filter((line) => line.trim().length > 0);
    return all.slice(-lines).join('\n');
  };
  const out = [];
  if (res.error) out.push('spawn error: ' + (res.error.message || String(res.error)));
  const so = tail(res.stdout, 12);
  const se = tail(res.stderr, 8);
  if (so) out.push('---- stdout 末尾 ----\n' + so);
  if (se) out.push('---- stderr 末尾 ----\n' + se);
  const text = out.join('\n');
  return text.length > 1600 ? text.slice(0, 1600) + '\n…(截断)' : text;
}
const __t0 = Date.now();
const results = [];
let failed = 0;
for (const step of STEPS) {
  if (step.skip) {
    results.push({ id: step.id, status: 'skipped', reason: '--skip-e2e' });
    console.log('[SKIP] ' + step.id);
    continue;
  }
  const stepStartedMs = Date.now();
  const res = spawnSync(step.cmd, step.args, { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
  const durationMs = Date.now() - stepStartedMs;
  const ok = res.status === 0;
  if (!ok) failed++;
  const entry = {
    id: step.id, cmd: step.cmd + ' ' + step.args.join(' '),
    status: ok ? 'pass' : 'fail', exit_code: res.status, duration_ms: durationMs
  };
  if (!ok) entry.error = shortError(res);
  results.push(entry);
  console.log('[' + (ok ? 'PASS' : 'FAIL') + '] ' + step.id + '（' + durationMs + ' ms）');
  if (!ok) {
    const tail = (res.stdout || '').split('\n').slice(-14).join('\n');
    console.log('---- stdout 末尾 ----\n' + tail);
    if (res.stderr) console.log('---- stderr 末尾 ----\n' + res.stderr.split('\n').slice(-8).join('\n'));
  }
}

const generatedAt = new Date().toISOString();
const report = {
  /* 原有字段（读取兼容） */
  gate: 'G2 四件套',
  duration_ms: Date.now() - __t0,
  ok: failed === 0,
  failed_count: failed,
  results,
  node: process.version,
  generated_at: generatedAt,
  /* T1 代码版本 */
  code: {
    commit_sha: COMMIT_SHA,
    branch: BRANCH,
    worktree_dirty: WORKTREE_DIRTY,
    dirty_paths: DIRTY_PATHS
  },
  /* T1 运行环境 */
  environment: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    python: PYTHON_VERSION
  },
  /* T1 执行信息 */
  execution: {
    command: COMMAND,
    started_at: STARTED_AT,
    generated_at: generatedAt,
    duration_ms: Date.now() - STARTED_MS
  }
};
fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'artifacts', 'run-g2-report.json'), JSON.stringify(report, null, 2));
console.log('\n================================================');
console.log('追溯：commit=' + (COMMIT_SHA || 'n/a').slice(0, 12) + ' branch=' + (BRANCH || 'n/a') +
  ' dirty=' + WORKTREE_DIRTY + ' node=' + process.version + ' python=' + PYTHON_VERSION +
  ' 用时 ' + report.execution.duration_ms + ' ms');
if (failed) {
  console.log('G2 聚合：' + failed + ' 项失败（详见 artifacts/run-g2-report.json）——相应门禁不得声称关闭。');
  process.exit(1);
}
console.log('G2 四件套聚合：全部通过（artifacts/run-g2-report.json）。');
console.log('注意：通过项为内部一致性/可复核性证据，不构成模型验证或硬件验证。');
