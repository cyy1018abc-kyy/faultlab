/* owner: arena-protocol | module: tools/arena2-session | contract: NEXT/ARENA_EVAL_PROTOCOL_APPROVED.md §3-§7
   arena2-session — 评测轨首场次端到端脚本：盲包 → builtin Agent 盲测（只见盲观测流，不见真值）→
   提交 JSON → arena2-verify 评分落章。产出全部归档到指定目录（evidence 用）。

   用法：node tools/arena2-session.mjs --rounds 6 --seed 20261027 --agents a1,a2 --out evidence/g8/eval-session-001
   流程：① arena2-gen 逻辑内联（buildScenarioSet + simulate + 盲观测流，组织方侧）；② reveal 保管；
   ③ 参赛提交 = builtin Agent 只读盲观测流的诊断（不读 truth）；④ Verifier 校验+评分+score_hash。 */
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
const agentIds = (opt('agents', '')).split(',').map((s) => s.trim()).filter(Boolean);
const outDir = path.resolve(ROOT, opt('out', 'out/arena2-session'));

const FL = bootstrap();
(0, eval)(fs.readFileSync(path.join(ROOT, 'src', 'core', 'golden-compare.js'), 'utf8'));
(0, eval)(fs.readFileSync(path.join(ROOT, 'src', 'agents', 'builtin-agents.js'), 'utf8'));
(0, eval)(fs.readFileSync(path.join(ROOT, 'src', 'agents', 'arena.js'), 'utf8'));
const AP = FL.arenaProtocol;
const ARENA = FL.arena;

/* ① 组织方侧：场景流 + 仿真 + 盲包（零真值） */
const setup = { systemId, rounds, seed, noise, agentIds: [] };
const rng = FL.rng.mulberry32(seed);
const scenarios = AP.buildScenarioSet(systemId, setup, rng);
const bundleRounds = [];
const mapping = [];
scenarios.forEach((sc, i) => {
  const run = FL.core.simulate(sc.config);
  const observables = AP.blindObservables(run);
  const samples = AP.buildSamples(run, observables);
  bundleRounds.push({ index: i + 1, observables, samples });
  mapping.push({ round: i + 1, truth: AP.deriveTruth(sc, run) });
});
const bundle = AP.buildBundleV2({ systemId, rounds: bundleRounds });
bundle.rounds ? bundle.rounds.forEach((r) => { mapping[r.index - 1].match_id = bundle.match_id; })
  : mapping[bundle.round.index - 1].match_id = bundle.match_id;
const reveal = AP.buildRevealV2({ testsetId: bundle.testset_id, matchId: bundle.match_id,
  seed, systemId, mapping });
AP.validateBundleV2(bundle, { approvedTestsetIds: [bundle.testset_id] });

/* ② 参赛侧：builtin Agent 只读盲观测流 → 诊断（不接触 truth） */
const sys = FL.systems.get(systemId);
const components = (sys.components || []).map((c) => ({ id: c.id, label: c.label || c.id }));
const famMap = {};
(sys.faults || []).forEach((f) => { if (f && f.family) famMap[f.family] = f.shortLabel || f.family; });
const faultFamilies = ['sensor_drift', 'load_step', 'actuator_fault']
  .map((id) => ({ id, label: famMap[id] || id }));
const catalog = ARENA.listAgents();
const chosen = agentIds.length
  ? catalog.filter((a) => agentIds.indexOf(a.id) >= 0)
  : catalog.slice(0, 3);
if (!chosen.length) throw new Error('没有可用参赛 Agent');

const roundsOfBundle = bundle.rounds || [bundle.round];
const submissions = chosen.map((a) => ({
  protocol: 'v2',
  agent: { name: 'builtin/' + a.id },
  testset_id: bundle.testset_id,
  match_id: bundle.match_id,
  results: roundsOfBundle.map((r) => {
    /* 每轮：Agent 全新实例 + 盲观测流（对象形态 {t, s:{id:v}}，与页面同构） */
    const observables = r.observables;
    const meta = {
      systemId, duration_s: r.duration_s, dt_s: r.dt_s,
      observables, components, faultFamilies
    };
    const agent = FL.agents.create(a.id, meta);
    r.samples.forEach((row) => {
      const sObj = { t: row[0] };
      observables.forEach((o, j) => { sObj[o.id] = row[j + 1]; });
      agent.observe({ t: row[0], s: sObj }, meta);
    });
    return { round: r.index, diagnosis: agent.diagnose() };
  })
}));

/* ③ Verifier 侧：校验 + 评分落章（reveal 含真值，仅评测器持用） */
const blindSha = FL.core.hashString(JSON.stringify(bundle));
const reports = submissions.map((sub) => {
  const subSha = FL.core.hashString(JSON.stringify(sub));
  try {
    return {
      agent: sub.agent.name,
      report: AP.scoreV2({ bundle, submission: sub, reveal, blindSha256: blindSha, submissionSha256: subSha })
    };
  } catch (e) {
    console.error('[DEBUG] scoreV2 fail:', e.code, e.field, e.message);
    console.error('[DEBUG] reveal.testset_id=', reveal.testset_id, 'bundle.testset_id=', bundle.testset_id);
    console.error('[DEBUG] reveal.match_id=', reveal.match_id, 'bundle.match_id=', bundle.match_id);
    throw e;
  }
});

/* ④ 归档 */
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'bundle-match.json'), JSON.stringify(bundle, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'reveal.json'), JSON.stringify(reveal, null, 2) + '\n');
submissions.forEach((sub, i) => {
  fs.writeFileSync(path.join(outDir, 'submission-' + String(i + 1).padStart(2, '0') + '-' +
    sub.agent.name.replace(/[^A-Za-z0-9]/g, '_') + '.json'), JSON.stringify(sub, null, 2) + '\n');
});
reports.forEach((r, i) => {
  fs.writeFileSync(path.join(outDir, 'score-report-' + String(i + 1).padStart(2, '0') + '.json'),
    JSON.stringify(r.report, null, 2) + '\n');
});

console.log('[OK] 评测场次 testset=' + bundle.testset_id + ' match=' + bundle.match_id +
  '（' + rounds + ' 轮，含噪=' + noise + '）');
reports.forEach((r, i) => {
  console.log('  参赛 ' + (i + 1) + ' ' + r.agent + '：场均 ' + r.report.avg_score +
    ' 分（score_hash ' + r.report.score_hash.slice(0, 12) + '…）');
});
console.log('  归档 → ' + path.relative(ROOT, outDir));
console.log('  注意：评分=合成故障评测游戏，非真实诊断性能；reveal 含真值，赛后公布。');
