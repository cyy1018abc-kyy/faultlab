/* owner: arena-protocol | module: tools/arena2-session | contract: NEXT/ARENA_EVAL_PROTOCOL_APPROVED.md §3-§7
   arena2-session — 评测轨场次端到端脚本：盲包 → builtin Agent 盲测（只见盲观测流，不见真值）→
   提交 JSON → scoreV2 评分落章。产出全部归档到指定目录（evidence 用）。
   支持多场次：--sessions N（N>1 时每场独立 seed/testset_id，输出到 <out>/session-XX/）。

   用法：
     node tools/arena2-session.mjs --rounds 6 --seed 20261027 --noise --out evidence/g8/eval-session-001
     node tools/arena2-session.mjs --rounds 3 --sessions 2 --agents all --out evidence/g8/multi
   流程：① buildScenarioSet + simulate + 盲观测流（组织方侧）；② reveal 保管；
   ③ 参赛提交 = builtin Agent 只读盲观测流的诊断（不读 truth）；④ scoreV2 校验+评分+score_hash。 */
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
const sessionCount = Math.max(1, Math.min(10, parseInt(opt('sessions', '1'), 10) || 1));
const agentIds = (opt('agents', '')).split(',').map((s) => s.trim()).filter(Boolean);
const outBase = path.resolve(ROOT, opt('out', 'out/arena2-session'));

const FL = bootstrap();
(0, eval)(fs.readFileSync(path.join(ROOT, 'src', 'core', 'golden-compare.js'), 'utf8'));
(0, eval)(fs.readFileSync(path.join(ROOT, 'src', 'agents', 'builtin-agents.js'), 'utf8'));
(0, eval)(fs.readFileSync(path.join(ROOT, 'src', 'agents', 'arena.js'), 'utf8'));
const AP = FL.arenaProtocol;
const ARENA = FL.arena;

function runSession(outDir, sessionIdx, sessionSeed) {
  const sSetup = { systemId, rounds, seed: sessionSeed, noise, agentIds: [] };
  const sRng = FL.rng.mulberry32(sessionSeed);
  const scenarios = AP.buildScenarioSet(systemId, sSetup, sRng);
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
  (bundle.rounds || [bundle.round]).forEach((r) => { mapping[r.index - 1].match_id = bundle.match_id; });
  const reveal = AP.buildRevealV2({ testsetId: bundle.testset_id, matchId: bundle.match_id,
    seed: sessionSeed, systemId, mapping });
  AP.validateBundleV2(bundle, { approvedTestsetIds: [bundle.testset_id] });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'bundle-match.json'), JSON.stringify(bundle, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'reveal.json'), JSON.stringify(reveal, null, 2) + '\n');

  const sys = FL.systems.get(systemId);
  const comps = (sys.components || []).map((c) => ({ id: c.id, label: c.label || c.id }));
  const famMap = {};
  (sys.faults || []).forEach((f) => { if (f && f.family) famMap[f.family] = f.shortLabel || f.family; });
  const ff = ['sensor_drift', 'load_step', 'actuator_fault'].map((id) => ({ id, label: famMap[id] || id }));
  const cat = ARENA.listAgents();
  const chosen = agentIds.length
    ? (agentIds[0] === 'all' ? cat : cat.filter((a) => agentIds.indexOf(a.id) >= 0))
    : cat.slice(0, 3);
  const roundsArr = bundle.rounds || [bundle.round];

  const submissions = chosen.map((a) => ({
    protocol: 'v2', agent: { name: 'builtin/' + a.id },
    testset_id: bundle.testset_id, match_id: bundle.match_id,
    results: roundsArr.map((r) => {
      const meta = { systemId, duration_s: r.duration_s, dt_s: r.dt_s,
        observables: r.observables, components: comps, faultFamilies: ff };
      const agent = FL.agents.create(a.id, meta);
      r.samples.forEach((row) => {
        const sObj = { t: row[0] };
        r.observables.forEach((o, j) => { sObj[o.id] = row[j + 1]; });
        agent.observe({ t: row[0], s: sObj }, meta);
      });
      return { round: r.index, diagnosis: agent.diagnose() };
    })
  }));

  const blindSha = FL.core.hashString(JSON.stringify(bundle));
  const reports = submissions.map((sub) => {
    const subSha = FL.core.hashString(JSON.stringify(sub));
    const rep = AP.scoreV2({ bundle, submission: sub, reveal, blindSha256: blindSha, submissionSha256: subSha });
    const safe = sub.agent.name.replace(/[^A-Za-z0-9]/g, '_');
    fs.writeFileSync(path.join(outDir, 'submission-' + safe + '.json'), JSON.stringify(sub, null, 2) + '\n');
    fs.writeFileSync(path.join(outDir, 'score-report-' + safe + '.json'), JSON.stringify(rep, null, 2) + '\n');
    return { agent: sub.agent.name, report: rep };
  });

  const tag = sessionIdx !== undefined ? 'session ' + (sessionIdx + 1) : 'session';
  console.log('[OK] ' + tag + ' testset=' + bundle.testset_id + ' match=' + bundle.match_id);
  reports.forEach((r) => console.log('  ' + r.agent + ': ' + r.report.avg_score + ' 分（' + r.report.score_hash.slice(0, 12) + '…）'));
  console.log('  → ' + path.relative(ROOT, outDir));
}

for (let si = 0; si < sessionCount; si++) {
  const sDir = sessionCount === 1 ? outBase : path.join(outBase, 'session-' + String(si + 1).padStart(2, '0'));
  runSession(sDir, si, seed + si * 7919);
}
if (sessionCount > 1) {
  console.log('\n[OK] ' + sessionCount + ' 场次完成（独立 seed/testset_id，reveal 赛后公布）');
}
console.log('评分=合成故障评测游戏，非真实诊断性能。');
