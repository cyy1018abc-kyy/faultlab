/* owner: eval-track | module: tests/leaderboard | contract: FaultLab-evaluation/NEXT/V06_ROADMAP.md §7 C-4 行
           + FaultLab-evaluation/NEXT/V070_WAVE_DESIGN.md DEC-6（CHG-20261104-10）
   本地排行榜 CLI 测试：临时目录合成 3 场次 × 2 参与者 fixture（含坏 JSON / 缺字段 / 参与者
   不可解析文件），验证聚合（场均均值/场次数/轮次数/单轮最佳最差）、排序（avg_score 降序 →
   并列按场次数）、跳过计数登记、参与者 id 三层解析（内嵌/配对提交）、exit 码（0/1）。
   运行：node tests/leaderboard.test.js；失败非零退出；fixture 用后即清。
   装载：tools/leaderboard.mjs 为 ESM——CJS 侧经动态 import() 装载导出的纯函数做单元断言，
   CLI 行为用 spawnSync 子进程实跑（含 cwd 独立于仓库根）。 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'tools', 'leaderboard.mjs');

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push({ name, detail: detail || '条件为假' }); }
}
function eq(a, b, name) { ok(a === b, name, 'expected ' + JSON.stringify(b) + '，actual ' + JSON.stringify(a)); }

/* ---- fixture 造件：与 arena-protocol.js scoreV2 产物同构（round_score 十进制串） ---- */
let seq = 0;
function mkReport(scores, avg, extra) {
  seq++;
  return Object.assign({
    schema: 'faultlab.arena.score.v2',
    bundle_kind: 'arena_blind',
    testset_id: 'arena2-FL001-6-test' + seq,
    match_id: 'match-' + seq,
    scoring_rules: 'v2',
    notice: '合成故障评测游戏，非真实诊断性能',
    rounds: scores.map((s, i) => ({
      index: i + 1,
      detection: s > 0 ? '1.0000' : '0.0000',
      family: s > 0 ? '1.0000' : '0.0000',
      component: s > 0 ? '1.0000' : '0.0000',
      magnitude: s > 0 ? '1.0000' : '0.0000',
      latency: s > 0 ? '1.0000' : '0.0000',
      calibration: '0.9900',
      falseAlarm: 0,
      round_score: s.toFixed(1)
    })),
    avg_score: avg,
    score_hash: 'hash-' + seq
  }, extra || {});
}
function mkSubmission(agentName) {
  return { protocol: 'v2', agent: { name: agentName }, testset_id: 't', match_id: 'm', results: [] };
}
function write(dir, name, obj) {
  fs.writeFileSync(path.join(dir, name), typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) + '\n');
}

async function main() {
  const lb = await import(pathToFileURL(CLI).href);

  /* --------------------------------------------------------------- *
   * 0. 导出面与常量
   * --------------------------------------------------------------- */
  ok(typeof lb.discoverSessions === 'function' && typeof lb.parseScoreReport === 'function' &&
    typeof lb.resolveParticipant === 'function' && typeof lb.aggregate === 'function' &&
    typeof lb.sortEntries === 'function' && typeof lb.globToRegExp === 'function' &&
    typeof lb.runCli === 'function', '导出面就绪（discover/parse/resolve/aggregate/sort/glob/runCli）');
  eq(lb.SCHEMA_LEADERBOARD, 'faultlab.leaderboard.v1', 'leaderboard schema 常量');
  eq(lb.NOTICE, '合成场景评测游戏，非真实诊断性能', '固定措辞常量逐字一致');

  /* --------------------------------------------------------------- *
   * 1. 纯函数单元：glob / 排序并列 / 成绩单校验拒绝面
   * --------------------------------------------------------------- */
  const g = lb.globToRegExp('a/**/eval-*');
  eq(g.test('a/eval-x'), true, 'glob ** 含零段：a/eval-x 命中');
  eq(g.test('a/b/c/eval-2'), true, 'glob ** 跨多段：a/b/c/eval-2 命中');
  eq(g.test('ab/c/eval-x'), false, 'glob 首段字面量不前缀扩张：ab/... 不命中');
  eq(g.test('a/b/eval-x/extra'), false, 'glob 全串锚定：多余尾段不命中');
  eq(lb.globToRegExp('eval-session-00?').test('eval-session-001'), true, 'glob ? 段内单字符命中');
  eq(lb.globToRegExp('eval-session-00?').test('eval-session-01'), false, 'glob ? 不跨字符');
  eq(lb.globToRegExp('x/**').test('x/y/z'), true, 'glob 尾段 ** 吞余段');

  const ranked = lb.sortEntries([
    { participant: 'x', avg_score: 50, sessions: 1, rounds: 2, best_round_score: 60, worst_round_score: 40, participant_source: 'report', session_dirs: [], per_session: [] },
    { participant: 'y', avg_score: 50, sessions: 3, rounds: 6, best_round_score: 70, worst_round_score: 30, participant_source: 'report', session_dirs: [], per_session: [] },
    { participant: 'z', avg_score: 60, sessions: 1, rounds: 2, best_round_score: 60, worst_round_score: 60, participant_source: 'report', session_dirs: [], per_session: [] }
  ]);
  eq(ranked.map((e) => e.participant).join(','), 'z,y,x', '排序：avg 降序 → 并列按场次数（多者优先）');
  eq(ranked[0].rank, 1, 'rank 自 1 连续');
  eq(ranked[2].rank, 3, 'rank 末位 3');

  for (const [bad, why] of [
    ['[]', '顶层非对象'],
    [{ schema: 'other' }, 'schema 不符'],
    [{ schema: 'faultlab.arena.score.v2' }, 'rounds 缺失'],
    [{ schema: 'faultlab.arena.score.v2', rounds: [] }, 'rounds 空'],
    [{ schema: 'faultlab.arena.score.v2', rounds: [{ round_score: 'x' }] }, 'round_score 不可解析'],
    [{ schema: 'faultlab.arena.score.v2', rounds: [{ round_score: '84.9' }] }, 'avg_score 缺失'],
    [{ schema: 'faultlab.arena.score.v2', rounds: [{ round_score: '84.9' }], avg_score: 'n/a' }, 'avg_score 不可解析']
  ]) {
    const r = lb.parseScoreReport(bad);
    eq(r.ok, false, '校验拒绝：' + why);
    eq(r.reason, 'missing_field', '拒绝原因登记为 missing_field：' + why);
  }
  const good = lb.parseScoreReport(mkReport([84.9, 2.0], 43.5));
  eq(good.ok && good.rounds.length === 2 && good.avg_score === 43.5, true, '合法成绩单解析通过（十进制串轮分入账）');

  /* --------------------------------------------------------------- *
   * 2. CLI 端到端：临时目录 3 场次 × 2 参与者 + 4 份坏文件
   * --------------------------------------------------------------- */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'faultlab-leaderboard-test-'));
  try {
    /* 说明：mkReport 造件内 undefined 字段经 JSON.stringify 自然剔除（如无 avg_score 造件） */
    const s1 = path.join(tmp, 's1');
    const s2 = path.join(tmp, 's2');
    const s3 = path.join(tmp, 's3');
    [s1, s2, s3].forEach((d) => fs.mkdirSync(d, { recursive: true }));

    /* s1：alpha 经序号前缀配对（score-report-01 ↔ submission-01-alpha），beta 精确同名配对 */
    write(s1, 'score-report-01.json', mkReport([90, 70], 80));
    write(s1, 'submission-01-alpha.json', mkSubmission('alpha'));
    write(s1, 'score-report-beta.json', mkReport([60, 60], 60));
    write(s1, 'submission-beta.json', mkSubmission('beta'));

    /* s2：alpha 精确同名配对，beta 序号前缀配对 */
    write(s2, 'score-report-alpha.json', mkReport([100, 80], 90));
    write(s2, 'submission-alpha.json', mkSubmission('alpha'));
    write(s2, 'score-report-02.json', mkReport([50, 70], 60));
    write(s2, 'submission-02-beta.json', mkSubmission('beta'));

    /* s3：双参与者 id 内嵌于成绩单 + 4 份坏文件（bad_json ×1 / missing_field ×2 / missing_participant ×1） */
    write(s3, 'score-report-alpha.json', mkReport([65, 75], 70, { agent: { name: 'alpha' } }));
    write(s3, 'score-report-02.json', mkReport([30, 50], 40, { agent: { name: 'beta' } }));
    write(s3, 'score-report-broken.json', '{"schema": "faultlab.arena.score.v2", "rounds": [');
    write(s3, 'score-report-noschema.json', { notice: '缺 schema' });
    write(s3, 'score-report-noavg.json', mkReport([10, 20], undefined)); /* avg_score: undefined → 落盘即缺 */
    write(s3, 'score-report-unknown.json', mkReport([1, 2], 1.5));
    write(s3, 'reveal.json', { note: '非成绩单文件，不参与扫描' });

    const outDir = path.join(tmp, 'out');
    const r1 = spawnSync(process.execPath, [CLI, '--sessions', s1 + ',' + s2 + ',' + s3, '--out', outDir],
      { encoding: 'utf8', cwd: os.tmpdir() });
    eq(r1.status, 0, 'CLI exit 0（有效输入）', 'stderr=' + r1.stderr);
    ok(r1.stdout.indexOf('排行榜生成') >= 0, 'stdout 含生成摘要', r1.stdout);

    const json = JSON.parse(fs.readFileSync(path.join(outDir, 'leaderboard.json'), 'utf8'));
    const md = fs.readFileSync(path.join(outDir, 'leaderboard.md'), 'utf8');

    eq(json.schema, 'faultlab.leaderboard.v1', 'JSON schema=faultlab.leaderboard.v1');
    eq(json.notice, '合成场景评测游戏，非真实诊断性能', 'JSON 固定措辞逐字一致');
    eq(json.input_sessions.length, 3, '输入场次清单 3 条');
    ok(typeof json.generated_at === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(json.generated_at), '生成时间 ISO 形态');
    eq(json.totals.sessions_scanned, 3, 'totals 场次=3');
    eq(json.totals.reports_found, 10, 'totals 成绩单发现=10');
    eq(json.totals.reports_valid, 6, 'totals 有效=6');
    eq(json.totals.reports_skipped, 4, 'totals 跳过=4');
    eq(json.totals.participants, 2, 'totals 参与者=2');
    eq(json.skipped.total, 4, 'skipped.total=4');
    eq(json.skipped.by_reason.bad_json, 1, '跳过计数 bad_json=1');
    eq(json.skipped.by_reason.missing_field, 2, '跳过计数 missing_field=2');
    eq(json.skipped.by_reason.missing_participant, 1, '跳过计数 missing_participant=1');
    eq(json.skipped.by_reason.ambiguous_participant, 0, '跳过计数 ambiguous_participant=0');
    ok(json.skipped.files.some((f) => f.file === 'score-report-broken.json' && f.reason === 'bad_json'),
      '跳过明细：broken → bad_json');
    ok(json.skipped.files.some((f) => f.file === 'score-report-unknown.json' && f.reason === 'missing_participant'),
      '跳过明细：unknown → missing_participant');

    eq(json.entries.length, 2, '条目数=2');
    const a = json.entries[0];
    const b = json.entries[1];
    eq(a.participant, 'alpha', '第一名 alpha');
    eq(a.rank, 1, 'rank 1');
    eq(a.avg_score, 80, 'alpha 场均均值 (80+90+70)/3=80');
    eq(a.sessions, 3, 'alpha 场次数=3');
    eq(a.rounds, 6, 'alpha 轮次数=6');
    eq(a.best_round_score, 100, 'alpha 单轮最佳=100');
    eq(a.worst_round_score, 65, 'alpha 单轮最差=65');
    eq(a.session_dirs.length, 3, 'alpha 关联 3 个场次目录');
    eq(a.participant_source, 'report+submission', 'alpha id 来源含配对提交与内嵌两层');
    eq(b.participant, 'beta', '第二名 beta');
    eq(b.rank, 2, 'rank 2');
    eq(b.avg_score, 53.3, 'beta 场均均值 (60+60+40)/3=53.3（半上一位）');
    eq(b.sessions, 3, 'beta 场次数=3');
    eq(b.rounds, 6, 'beta 轮次数=6');
    eq(b.best_round_score, 70, 'beta 单轮最佳=70');
    eq(b.worst_round_score, 30, 'beta 单轮最差=30');
    ok(a.per_session.length === 3 && a.per_session.every((p) => p.rounds === 2), 'alpha 逐场明细 3×2 轮');

    /* MD：必含列 + 生成时间 + 场次清单 + 跳过登记 + 固定措辞 */
    ok(md.indexOf('| 排名 | 参与者 | 平均分 | 场次 | 轮次 | 单轮最佳 | 单轮最差 | 备注 |') >= 0,
      'MD 表头含排名/参与者/平均分/场次/轮次/备注（外加单轮最佳/最差）');
    ok(md.indexOf('生成时间') >= 0, 'MD 含生成时间');
    ok(md.indexOf('输入场次（3 个）') >= 0, 'MD 含输入场次清单');
    ok(md.indexOf('## 跳过文件（4 份）') >= 0, 'MD 含跳过登记（4 份）');
    ok(md.indexOf('score-report-broken.json') >= 0 && md.indexOf('bad_json') >= 0, 'MD 跳过明细列出坏文件');
    ok(md.indexOf('合成场景评测游戏，非真实诊断性能') >= 0, 'MD 固定措辞逐字一致');
    ok(md.indexOf('alpha') < md.indexOf('beta'), 'MD 行序 alpha 在 beta 前（降序结果）');

    /* --------------------------------------------------------------- *
     * 3. exit 码负例：空场次 / 目录不存在 / --help
     * --------------------------------------------------------------- */
    const empty = path.join(tmp, 'empty');
    fs.mkdirSync(empty, { recursive: true });
    const r2 = spawnSync(process.execPath, [CLI, '--sessions', empty, '--out', path.join(tmp, 'o2')],
      { encoding: 'utf8', cwd: os.tmpdir() });
    eq(r2.status, 1, '空场次目录 → exit 1');
    ok(r2.stderr.indexOf('无任何有效成绩单输入') >= 0, '空输入 stderr 带说明');

    const r3 = spawnSync(process.execPath, [CLI, '--sessions', path.join(tmp, 'nope')],
      { encoding: 'utf8', cwd: os.tmpdir() });
    eq(r3.status, 1, '场次目录不存在 → exit 1');
    ok(r3.stderr.indexOf('不存在') >= 0, '不存在目录 stderr 带说明');

    const r4 = spawnSync(process.execPath, [CLI, '--help'], { encoding: 'utf8', cwd: os.tmpdir() });
    eq(r4.status, 0, '--help → exit 0');
    ok(r4.stdout.indexOf('用法') >= 0, '--help 打印用法');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  ok(!fs.existsSync(tmp), 'fixture 清理完成（临时目录已删除）');

  /* ---- 汇总 ---- */
  console.log('leaderboard.test：pass ' + pass + ' / fail ' + fail);
  failures.forEach((f) => console.error('  [FAIL] ' + f.name + ' — ' + f.detail));
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error('[FAIL] 测试装载/运行异常：' + (e && e.stack || e));
  process.exit(1);
});
