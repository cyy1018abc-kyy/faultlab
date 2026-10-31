/* owner: qa-tooling | module: tools/perf | contract: V0.3 V3-03（O-11=a，F-5 收尾）
   perf.mjs — 性能阈值门禁（实测后冻结，2026-10-30）。
   阈值（V03_CLOSEOUT.md §2）：E2E 主旅程 wall-time ≤ 15000 ms
   （实测 7372/7556/7454 ms，Chrome 156 @ 本机；阈值≈实测峰值的 2 倍，防退化不设性能炒作）。
   读取 artifacts/e2e-report.json.duration_ms（e2e 步 freshly 写入）；缺失/超限即 FAIL。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const THRESHOLD_MS = 15000;
const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'artifacts', 'e2e-report.json'), 'utf8'));
/* 兼容两种载体：发布版 execution.duration_ms（STARTED_MS）/ 旧顶层 duration_ms */
const dur = (report.execution && typeof report.execution.duration_ms === 'number')
  ? report.execution.duration_ms
  : report.duration_ms;
if (typeof dur !== 'number' || !isFinite(dur)) {
  console.error('[FAIL] e2e-report.json 缺少 duration_ms（perf 载体失效）');
  process.exit(1);
}
if (dur > THRESHOLD_MS) {
  console.error('[FAIL] E2E 主旅程 ' + dur + ' ms 超阈值 ' + THRESHOLD_MS + ' ms');
  process.exit(1);
}
console.log('[PASS] E2E 主旅程 ' + dur + ' ms ≤ 阈值 ' + THRESHOLD_MS + ' ms（V3-03 实测冻结 2026-10-30）');
