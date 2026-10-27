/**
 * run-g2.mjs — G2 验收四件套聚合器（P0b-05 / G0-DEC-16）。
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
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const skipE2e = args.indexOf('--skip-e2e') !== -1;

const STEPS = [
  { id: '① verify_golden fl001（独立 oracle → golden 容差比对）', cmd: 'python', args: ['scripts/verify_golden.py'] },
  { id: '① verify_golden fc001（P1-06 / G2b-lite）', cmd: 'python', args: ['scripts/verify_golden.py', 'fc001'] },
  { id: '① engine.test.js（FL-001 601 点对 golden + PHY/SA）', cmd: 'node', args: ['tests/engine.test.js'] },
  { id: '① engine-fc.test.js（FC-001 601 点对 golden，P1-06）', cmd: 'node', args: ['tests/engine-fc.test.js'] },
  { id: '② e2e.mjs（浏览器 E2E，PHY-08/SA-22）', cmd: 'node', args: ['tools/e2e.mjs'], skip: skipE2e },
  { id: '③ registry.test.js（RunRegistry/规范哈希/不可变）', cmd: 'node', args: ['tests/registry.test.js'] },
  { id: '④ schema.test.js（Schema/单位字典/exposure/投影）', cmd: 'node', args: ['tests/schema.test.js'] },
  { id: '④ bundle.test.js（EvidenceBundle v1 + N-1…N-10 负例）', cmd: 'node', args: ['tests/bundle.test.js'] },
  { id: '+ event-phase.test.js（事件相位 G0-DEC-05）', cmd: 'node', args: ['tests/event-phase.test.js'] },
  { id: 'G4 scope-guard.test.js（SA-24 范围守卫）', cmd: 'node', args: ['tests/scope-guard.test.js'] },
  { id: 'G4 compare.test.js（对比白名单 T-15）', cmd: 'node', args: ['tests/compare.test.js'] },
  { id: 'G4 causal-rules.test.js（因果规则/证据链/教学卡）', cmd: 'node', args: ['tests/causal-rules.test.js'] },
  { id: 'G4 copy-guard.mjs（禁止词扫描 §6.3）', cmd: 'node', args: ['tools/copy-guard.mjs'] },
  { id: 'P1 report.test.js（HTML 报告验收）', cmd: 'node', args: ['tests/report.test.js'] },
  { id: '+ core.test.js（既有回归，适配新语义）', cmd: 'node', args: ['tests/core.test.js'] },
  { id: '+ arena.test.js（既有回归）', cmd: 'node', args: ['tests/arena.test.js'] }
];

const results = [];
let failed = 0;
for (const step of STEPS) {
  if (step.skip) {
    results.push({ id: step.id, status: 'skipped', reason: '--skip-e2e' });
    console.log('[SKIP] ' + step.id);
    continue;
  }
  const res = spawnSync(step.cmd, step.args, { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
  const ok = res.status === 0;
  if (!ok) failed++;
  results.push({
    id: step.id, cmd: step.cmd + ' ' + step.args.join(' '),
    status: ok ? 'pass' : 'fail', exit_code: res.status
  });
  console.log('[' + (ok ? 'PASS' : 'FAIL') + '] ' + step.id);
  if (!ok) {
    const tail = (res.stdout || '').split('\n').slice(-14).join('\n');
    console.log('---- stdout 末尾 ----\n' + tail);
    if (res.stderr) console.log('---- stderr 末尾 ----\n' + res.stderr.split('\n').slice(-8).join('\n'));
  }
}

const report = {
  gate: 'G2 四件套',
  ok: failed === 0,
  failed_count: failed,
  results,
  node: process.version,
  generated_at: new Date().toISOString()
};
fs.writeFileSync(path.join(ROOT, 'artifacts', 'run-g2-report.json'), JSON.stringify(report, null, 2));
console.log('\n================================================');
if (failed) {
  console.log('G2 聚合：' + failed + ' 项失败（详见 artifacts/run-g2-report.json）——相应门禁不得声称关闭。');
  process.exit(1);
}
console.log('G2 四件套聚合：全部通过（artifacts/run-g2-report.json）。');
console.log('注意：通过项为内部一致性/可复核性证据，不构成模型验证或硬件验证。');
