/* owner: arena-protocol | module: tools/arena2-gen | contract: NEXT/ARENA_EVAL_PROTOCOL_APPROVED.md §8 MVP-2
   arena2-gen — 组织方测试集/盲包/reveal 生成器（评测轨，CLI，零第三方依赖）。

   用法：
     node tools/arena2-gen.mjs --system FL-001 --rounds 6 --seed 20261027 --out out/arena2-demo
   产出：
     bundle-match.json      盲包（match.v2，closed-world，零墙钟字段，零真值）
     bundle-round-XX.json   单轮盲包（round.v2）
     reveal.json            组织方保管件（set_seed + match_id→truth 映射；赛后公布，绝不入盲包）
   纪律：盲包标识符（testset_id 末段/match_id）由 CSPRNG 生成，与 set_seed 无任何确定性函数关系；
        生成器不进参赛工具链分发（含真值构造逻辑）。 */
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
const systemId = opt('system', 'FL-001');
const rounds = Math.max(1, Math.min(12, parseInt(opt('rounds', '6'), 10) || 6));
let seed = parseInt(opt('seed', '20261027'), 10);
if (!isFinite(seed)) seed = 20261027;
if (seed < 0) seed = -seed;
const noise = args.indexOf('--noise') >= 0;
const outDir = path.resolve(ROOT, opt('out', 'out/arena2-' + Date.now()));

/* 加载核心 + arena（评分/解析函数被 verify 复用；gen 本身只用 core） */
const FL = bootstrap();
const arenaFile = path.join(ROOT, 'src', 'agents', 'arena.js');
(0, eval)(fs.readFileSync(arenaFile, 'utf8'));
const AP = FL.arenaProtocol;

/* 场景流（共享模块；rng 消耗顺序与页面 Arena 完全一致） */
const setup = { systemId, rounds, seed, noise, agentIds: [] };
const rng = FL.rng.mulberry32(seed);
const scenarios = AP.buildScenarioSet(systemId, setup, rng);

/* 逐轮仿真 → 盲观测流（零真值） */
const bundleRounds = [];
const mapping = [];
for (let i = 0; i < scenarios.length; i++) {
  const sc = scenarios[i];
  const run = FL.core.simulate(sc.config);
  const observables = AP.blindObservables(run);
  if (!observables.length) {
    console.error('[FAIL] 第 ' + (i + 1) + ' 轮没有可用盲观测通道');
    process.exit(1);
  }
  const samples = AP.buildSamples(run, observables);
  bundleRounds.push({ index: i + 1, observables, samples });
  mapping.push({ match_id: null, round: i + 1, truth: AP.deriveTruth(sc, run) }); /* match_id 落盘前回填 */
}

/* v2 盲包（closed-world）+ reveal（组织方件） */
const bundle = AP.buildBundleV2({ systemId, rounds: bundleRounds });
const bundleRoundsOut = bundle.rounds || [bundle.round];
bundleRoundsOut.forEach((r) => { mapping[r.index - 1].match_id = bundle.match_id; });
const reveal = AP.buildRevealV2({
  testsetId: bundle.testset_id,
  matchId: bundle.match_id,
  seed,
  systemId,
  mapping
});

/* 分发前自检：盲包过 V-01…V-06b 全量校验 */
try {
  AP.validateBundleV2(bundle, { approvedTestsetIds: [bundle.testset_id] });
} catch (e) {
  console.error('[FAIL] 生成器自检未过：' + e.message);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'bundle-match.json'), JSON.stringify(bundle, null, 2) + '\n');
bundleRoundsOut.forEach((r) => {
  const one = Object.assign({}, bundle, { schema: 'faultlab.arena.round.v2', round: r });
  delete one.rounds;
  fs.writeFileSync(path.join(outDir, 'bundle-round-' + String(r.index).padStart(2, '0') + '.json'),
    JSON.stringify(one, null, 2) + '\n');
});
fs.writeFileSync(path.join(outDir, 'reveal.json'), JSON.stringify(reveal, null, 2) + '\n');

const healthyCount = scenarios.filter((s) => s.healthy).length;
console.log('[OK] 测试集 ' + bundle.testset_id + ' · match ' + bundle.match_id);
console.log('     轮数 ' + rounds + '（健康局 ' + healthyCount + '）· 观测通道 ' + bundleRoundsOut[0].observables.length);
console.log('     盲包 → ' + path.relative(ROOT, path.join(outDir, 'bundle-match.json')));
console.log('     reveal（组织方保管，赛后公布）→ ' + path.relative(ROOT, path.join(outDir, 'reveal.json')));
console.log('     自检：validateBundleV2 通过（零墙钟字段、零真值、closed-world）');
