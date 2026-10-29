/* owner: arena-protocol | module: tools/arena2-verify | contract: NEXT/ARENA_EVAL_PROTOCOL_APPROVED.md §8 MVP-3
   arena2-verify — 可信评测器 Verifier（评测轨，CLI，零第三方依赖；协议 §4/§6.2）。

   用法：
     node tools/arena2-verify.mjs --bundle out/arena2-demo/bundle-match.json \
          --submission submission.json --reveal out/arena2-demo/reveal.json [--out score-report.json]
   校验链：V-00 结构上限 → V-01 schema/版本 → V-02 键名禁词（并集）→ V-03 语义禁项（LEAK-1/2）
           → V-04a 网格 → V-04b 数值 → V-05 观测白名单 → V-06 互斥 → V-06b closed-world
           → V-07 提交+绑定 → V-08 轮次匹配 → V-09 评分 → V-10 score_hash 落章。
   信任模型：Verifier 唯一同时持有盲包、提交与真值映射（reveal）；与被评 Agent 无共享代码路径。
   退出码：0 = 通过并落章；1 = 拒收（AE-* 错误）。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require2 = createRequire(import.meta.url);
const { bootstrap } = require2(path.join(ROOT, 'tests', 'core-load.js'));

const args = process.argv.slice(2);
function opt(name, dflt) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
function need(name) {
  const v = opt(name, null);
  if (!v) {
    console.error('[FAIL] 缺少 --' + name);
    process.exit(1);
  }
  return v;
}
const bundlePath = path.resolve(ROOT, need('bundle'));
const subPath = path.resolve(ROOT, need('submission'));
const revealPath = path.resolve(ROOT, need('reveal'));
const outPath = opt('out', path.join(path.dirname(bundlePath), 'score-report.json'));

/* 加载核心 + arena（评分复用 FL.arena.scoreDiagnosis——单源，禁止双实现漂移） */
const FL = bootstrap();
(0, eval)(fs.readFileSync(path.join(ROOT, 'src', 'agents', 'arena.js'), 'utf8'));
const AP = FL.arenaProtocol;

function readJson(p) {
  let raw;
  try { raw = fs.readFileSync(p, 'utf8'); } catch (e) {
    console.error('[FAIL] 无法读取 ' + p + '：' + e.message);
    process.exit(1);
  }
  try { return { raw, data: JSON.parse(raw) }; } catch (e) {
    console.error('[FAIL] JSON 解析失败 ' + p + '：' + e.message);
    process.exit(1);
  }
}

try {
  const bundleFile = readJson(bundlePath);
  const subFile = readJson(subPath);
  const revealFile = readJson(revealPath);

  const report = AP.scoreV2({
    bundle: bundleFile.data,
    submission: subFile.data,
    reveal: revealFile.data,
    /* 文件原始字节（经 utf8 读入重编码一致）的 SHA-256 */
    blindSha256: FL.core.hashString(bundleFile.raw),
    submissionSha256: FL.core.hashString(subFile.raw)
  });

  fs.writeFileSync(path.resolve(ROOT, outPath), JSON.stringify(report, null, 2) + '\n');
  console.log('[OK] 盲包校验通过（V-00…V-06b）· 提交校验通过（V-07/V-08）· 评分完成（V-09）');
  console.log('     testset ' + report.testset_id + ' · match ' + report.match_id);
  report.rounds.forEach((r) => {
    console.log('     第 ' + r.index + ' 轮：' + r.round_score + ' 分（报警 ' + r.detection
      + ' · 家族 ' + r.family + ' · 部件 ' + r.component + ' · 幅值 ' + r.magnitude
      + ' · 时刻 ' + r.latency + ' · calibration ' + r.calibration + (r.falseAlarm ? ' · 误报' : '') + '）');
  });
  console.log('     场均 ' + report.avg_score + ' 分 · score_hash ' + report.score_hash.slice(0, 16) + '…');
  console.log('     成绩单 → ' + path.relative(ROOT, path.resolve(ROOT, outPath)));
  console.log('     ' + report.notice);
  process.exit(0);
} catch (e) {
  console.error('[FAIL] ' + (e && e.code ? e.code + ' ' : '') + e.message);
  if (e && e.field) console.error('       字段：' + e.field);
  if (e && e.next) console.error('       修复建议：' + e.next);
  process.exit(1);
}
