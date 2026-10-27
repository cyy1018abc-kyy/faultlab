/* owner: arena-agents | module: tests-arena | contract: docs/CONTRACT.md */
/* =========================================================================
   Agent Arena 自测（Node 直接运行，无第三方依赖）：
     node tests/arena.test.js
   覆盖：确定性、盲观测隔离、默认 seed 下 fusion > sensor-limit、健康局误报、
         导出包真值扫描、外部诊断 bundle round-trip、三系统可跑、Agent 接口。
   ========================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
globalThis.window = globalThis;

function load(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) throw new Error('缺少文件：' + rel);
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: rel });
}

const CORE_FILES = [
  'src/core/hash.js',
  'src/core/rng.js',
  'src/core/protocol.js',
  'src/core/systems.js',
  'src/core/engine.js',
  'src/core/metrics.js',
  'src/core/checks.js'
];
const AGENT_FILES = [
  'src/agents/builtin-agents.js',
  'src/agents/arena.js'
];

const missingCore = CORE_FILES.filter((f) => !fs.existsSync(path.join(ROOT, f)));
if (missingCore.length) {
  console.log('[SKIP] 核心文件尚未就绪，跳过 Arena 测试：' + missingCore.join(', '));
  console.log('（core-engine 交付后重新运行 node tests/arena.test.js）');
  process.exit(0);
}

CORE_FILES.forEach(load);
const missingAgents = AGENT_FILES.filter((f) => !fs.existsSync(path.join(ROOT, f)));
if (missingAgents.length) {
  console.error('FAIL: 缺少 Agent 文件：' + missingAgents.join(', '));
  process.exit(1);
}
AGENT_FILES.forEach(load);

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) {
    pass += 1;
  } else {
    fail += 1;
    failures.push(name + (detail ? ' — ' + detail : ''));
    console.log('FAIL  ' + name + (detail ? ' — ' + detail : ''));
  }
}
function section(title) { console.log('\n== ' + title + ' =='); }
function isNum(v) { return typeof v === 'number' && isFinite(v); }

/* ------------------------------------------------------------ 0. 加载 */
section('0. 模块加载与 API 形状');
ok(!!FL.core && typeof FL.core.simulate === 'function', 'FL.core.simulate 可用');
ok(!!FL.systems && typeof FL.systems.defaultConfig === 'function', 'FL.systems.defaultConfig 可用');
ok(!!FL.agents && typeof FL.agents.defineBuiltin === 'function', 'FL.agents.defineBuiltin 存在');
ok(!!FL.arena && typeof FL.arena.createMatch === 'function', 'FL.arena.createMatch 存在');
['listAgents', 'createMatch', 'scoreExternalDiagnosis', 'exportRoundBundle', 'exportMatchBundle', 'parseExternalBundle']
  .forEach((fn) => ok(typeof FL.arena[fn] === 'function', 'FL.arena.' + fn + ' 是函数'));

const listed = FL.agents.list();
const ids = listed.map((a) => a.id);
ok(listed.length >= 5, '内置 Agent ≥5 个', '当前 ' + listed.length);
['sensor-limit', 'residual', 'cusum', 'bayes', 'fusion'].forEach((id) => {
  ok(ids.indexOf(id) >= 0, '内置 Agent 包含 ' + id);
});
listed.forEach((a) => {
  ok(!!a.name && !!a.description && !!a.strengths && !!a.weaknesses, 'Agent ' + a.id + ' 元信息完整');
});

/* --------------------------------------------------------- 1. 确定性 */
section('1. 同 seed 结果完全一致');
const SETUP = { systemId: 'FL-001', rounds: 6, seed: 20261027, noise: false, agentIds: [] };
const matchA = FL.arena.createMatch(SETUP);
const matchB = FL.arena.createMatch(SETUP);
ok(JSON.stringify(matchA) === JSON.stringify(matchB), '同 setup+seed 两次 createMatch 的 JSON 逐字节一致');
ok(matchA.id === matchB.id && matchA.rounds.length === 6, 'match id 与轮数正确');
ok(matchA.leaderboard.every((r) => isNum(r.avgScore)), '排行榜平均分均为数值');

const matchC = FL.arena.createMatch({ systemId: 'FL-001', rounds: 3, seed: 20261028, noise: false, agentIds: [] });
ok(matchC.id !== matchA.id, '不同 seed 的 match id 不同');
ok(JSON.stringify(matchA.rounds[0].samples) === JSON.stringify(matchB.rounds[0].samples), '同 seed 盲观测样本逐字节一致');

/* -------------------------------------------------- 2. 盲观测字段隔离 */
section('2. 盲观测流只含 blindVisible 信号，无真值/故障通道');
const FORBIDDEN_ID = /(^|_)(true|bias|cap)(_|$)/i;
let blindOk = true;
let sampleShapeOk = true;
let runSignalMetaOk = true;
matchA.rounds.forEach((round) => {
  const sigMap = {};
  ((round.run && round.run.signals) || []).forEach((s) => { sigMap[s.id] = s; });
  round.observables.forEach((o) => {
    const meta = sigMap[o.id];
    if (!meta) { runSignalMetaOk = false; return; }
    if (meta.blindVisible !== true) blindOk = false;
    if (FORBIDDEN_ID.test(o.id)) blindOk = false;
    if (meta.sourceKind === 'FAULT_EVENT' || meta.sourceKind === 'MODEL_STATE') blindOk = false;
  });
  round.samples.forEach((row) => {
    if (row.length !== round.observables.length + 1) sampleShapeOk = false;
    for (let i = 0; i < row.length; i++) {
      if (i === 0) { if (!isNum(row[i])) sampleShapeOk = false; } else if (row[i] !== null && !isNum(row[i])) sampleShapeOk = false;
    }
  });
});
ok(blindOk, '每轮 observables 均为 blindVisible 且非 FAULT_EVENT/MODEL_STATE');
ok(runSignalMetaOk, 'observables 的通道在运行元数据中存在');
ok(sampleShapeOk, 'samples 为 [t, v1…vn] 数值矩阵');
ok(matchA.rounds.every((r) => r.samples.length === 601), '每轮盲观测样本 601 点');
ok(matchA.rounds.every((r) => Math.abs(r.samples[600][0] - 60) < 1e-9), '样本时间轴到 60.0 s');
ok(!JSON.stringify(matchA.rounds.map((r) => ({ obs: r.observables, samples: r.samples }))).match(/_true_|bias_A|_cap_/),
  '盲观测 JSON 中不含 _true_ / bias_A / _cap_ 通道');

/* ------------------------------------------------------- 3. 评分与排行榜 */
section('3. 评分分解与排行榜');
const firstRound = matchA.rounds[0];
ok(firstRound.results.length === listed.length, '每轮结果覆盖全部内置 Agent');
ok(firstRound.results.every((r) => r.source === 'builtin'), '内置结果来源标记为 builtin');
firstRound.results.forEach((r) => {
  ok(isNum(r.score.total) && r.score.total >= 0 && r.score.total <= 100, 'Agent ' + r.agentId + ' 单轮总分 0–100');
  ['detection', 'family', 'component', 'magnitude', 'latency', 'calibration'].forEach((k) => {
    ok(isNum(r.score[k]) && r.score[k] >= 0 && r.score[k] <= 1, 'Agent ' + r.agentId + ' 评分分量 ' + k + ' ∈[0,1]');
  });
  ok(r.diagnosis && typeof r.diagnosis.faultDetected === 'boolean', 'Agent ' + r.agentId + ' 输出 faultDetected');
  ok(isNum(r.diagnosis.confidence) && r.diagnosis.confidence >= 0 && r.diagnosis.confidence <= 1, 'Agent ' + r.agentId + ' 置信度 ∈[0,1]');
  ok(typeof r.diagnosis.explanation === 'string' && r.diagnosis.explanation.length > 0, 'Agent ' + r.agentId + ' 有中文解释');
});
ok(matchA.leaderboard.some((r) => r.agentId === 'fusion'), '排行榜含 fusion');

/* ------------------------------------------------ 4. fusion vs sensor-limit */
section('4. 默认 seed 下 fusion 综合分显著高于 sensor-limit');
const fusionRow = matchA.leaderboard.filter((r) => r.agentId === 'fusion')[0];
const limitRow = matchA.leaderboard.filter((r) => r.agentId === 'sensor-limit')[0];
ok(!!fusionRow && !!limitRow, '排行榜同时含 fusion 与 sensor-limit');
const gap = (fusionRow && limitRow) ? fusionRow.avgScore - limitRow.avgScore : 0;
ok(gap >= 8, 'fusion 平均分至少比 sensor-limit 高 8 分', '实际差值 ' + gap.toFixed(1) +
  '（fusion ' + (fusionRow ? fusionRow.avgScore : '—') + ' / sensor-limit ' + (limitRow ? limitRow.avgScore : '—') + '）');
ok(fusionRow && matchA.leaderboard[0].agentId === fusionRow.agentId, 'fusion 位列排行榜第一（综合最强）');

/* ------------------------------------------------------- 5. 健康局误报 */
section('5. 健康局误报约束');
const healthyRounds = matchA.rounds.filter((r) => r.truth.healthy);
ok(healthyRounds.length >= 1, '默认 seed 匹配中包含健康局（20% 设计 + 小样本覆盖保护）');
let totalFalseAlarms = 0;
healthyRounds.forEach((r) => {
  const fp = r.results.filter((x) => x.diagnosis.faultDetected);
  totalFalseAlarms += fp.length;
  ok(fp.length <= 1, '健康局 R' + r.index + ' 误报 Agent 数 ≤1', '实际 ' + fp.length);
  ok(r.results.every((x) => !x.diagnosis.faultDetected || x.score.falseAlarm === 1), '健康局误报会计入 falseAlarm');
});
ok(totalFalseAlarms <= 1, '全部健康局累计误报 Agent 数 ≤1', '实际 ' + totalFalseAlarms);
healthyRounds.forEach((r) => {
  r.results.forEach((x) => {
    if (!x.diagnosis.faultDetected) {
      ok(x.score.total >= 99, '健康局未报警时 ' + x.agentId + ' 得分接近满分', '实际 ' + x.score.total);
    }
  });
});

/* -------------------------------------------------- 6. 导出包真值扫描 */
section('6. 盲测导出包（truth_sealed）不含真值字段');
function scanForbiddenKeys(obj, pathStr, hits) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => scanForbiddenKeys(v, pathStr + '[' + i + ']', hits));
    return;
  }
  Object.keys(obj).forEach((k) => {
    const low = k.toLowerCase();
    if (low !== 'truth_sealed' && /(^|_)(truth|true|bias|cap)(_|$)|^config$|(^|_)fault($|_)/i.test(low)) {
      hits.push(pathStr + '.' + k);
    }
    scanForbiddenKeys(obj[k], pathStr + '.' + k, hits);
  });
}
function bundleScan(bundle, label) {
  const hits = [];
  scanForbiddenKeys(bundle, '$', hits);
  ok(hits.length === 0, label + ' 递归扫描无真值字段', hits.slice(0, 5).join(', '));
  ok(bundle.truth_sealed === true, label + ' truth_sealed === true');
  ok(typeof bundle.arena_version === 'string' && bundle.arena_version === '0.1', label + ' arena_version=0.1');
  const text = JSON.stringify(bundle);
  ok(!/_true_|bias_A|_cap_|"truth"\s*:|P_gen_cap/.test(text), label + ' 序列化文本无 _true_/bias_A/_cap_/truth 数据字段');
  ok(!/"run"\s*:/.test(text), label + ' 不包含 run 对象');
  return text;
}
const roundBundle = FL.arena.exportRoundBundle(matchA, 1);
const matchBundle = FL.arena.exportMatchBundle(matchA);
bundleScan(roundBundle, '单轮数据包');
bundleScan(matchBundle, '整场比赛数据包');
ok(roundBundle.round && roundBundle.round.index === 1, '单轮数据包 round.index=1');
ok(roundBundle.round.samples.length === 601 && roundBundle.round.observables.length === roundBundle.round.samples[0].length - 1,
  '单轮数据包 samples/observables 对齐');
ok(Array.isArray(matchBundle.rounds) && matchBundle.rounds.length === 6, '整场数据包含全部 6 轮');
ok(roundBundle.match.seed === 20261027 && roundBundle.match.systemId === 'FL-001', '数据包携带 match 元信息');
ok(typeof roundBundle.scoring_spec === 'object' && roundBundle.scoring_spec.weights.detection === 0.2,
  '数据包携带评分口径（detection 权重 0.2）');

/* --------------------------------------------- 7. 外部诊断 bundle round-trip */
section('7. 外部诊断导入 / 评分 round-trip');
function perfectDiagnosis(round) {
  if (round.truth.healthy) {
    return {
      faultDetected: false, faultType: 'none', component: 'none', magnitude: null,
      detectTime_s: null, confidence: 0.05, explanation: '未发现异常（外部测试）'
    };
  }
  return {
    faultDetected: true,
    faultType: round.truth.faultFamily,
    component: round.truth.component,
    magnitude: { value: round.truth.magnitude.value, unit: round.truth.magnitude.unit },
    detectTime_s: round.truth.t_fault + 0.2,
    confidence: 0.95,
    explanation: '外部测试 Agent：按盲观测特征判定。'
  };
}
const submission = FL.arena.buildSubmission('外部测试 Agent', matchA.rounds.slice(0, 2).map((r) => ({
  round: r.index,
  diagnosis: perfectDiagnosis(r)
})));
const parsed = FL.arena.parseExternalBundle(JSON.stringify(submission));
ok(parsed.ok === true && parsed.errors.length === 0, '外部诊断 JSON 解析通过', parsed.errors.map((e) => e.message).join('; '));
ok(parsed.data && parsed.data.agentName === '外部测试 Agent', '解析出 Agent 名称');
ok(parsed.data && parsed.data.rounds.length === 2, '解析出多轮诊断结果');
const extScore = FL.arena.scoreExternalDiagnosis(matchA, matchA.rounds[0].index, perfectDiagnosis(matchA.rounds[0]));
ok(isNum(extScore.total) && extScore.total >= 0 && extScore.total <= 100, '外部诊断评分在 0–100', String(extScore.total));
if (!matchA.rounds[0].truth.healthy) {
  ok(extScore.total >= 90, '完美外部诊断单轮得分 ≥90', String(extScore.total));
  ok(extScore.family === 1 && extScore.component === 1 && extScore.magnitude === 1,
    '完美外部诊断 family/component/magnitude 满分');
}
const extScoreZero = FL.arena.scoreExternalDiagnosis(matchA, 0, perfectDiagnosis(matchA.rounds[0]));
ok(isNum(extScoreZero.total), 'scoreExternalDiagnosis 兼容 0 基索引');
const badParsed = FL.arena.parseExternalBundle(JSON.stringify({
  round: 1, diagnosis: { faultDetected: 'yes', faultType: 'boom', confidence: 3 }
}));
ok(badParsed.ok === false && badParsed.errors.length >= 2, '非法外部诊断返回 errors', badParsed.errors.map((e) => e.path).join(','));
const arrParsed = FL.arena.parseExternalBundle('[{"round":1,"diagnosis":' + JSON.stringify(perfectDiagnosis(matchA.rounds[0])) + '}]');
ok(arrParsed.ok === true && arrParsed.data.rounds.length === 1, '支持顶层数组形式');
const badVersion = FL.arena.parseExternalBundle(JSON.stringify({
  arena_version: '9.9', round: 1, diagnosis: perfectDiagnosis(matchA.rounds[0])
}));
ok(badVersion.ok === false, '协议版本不匹配被拒绝');

/* -------------------------------------------------------- 8. 三系统可跑 */
section('8. 三系统 Arena 兼容性');
['FC-001', 'GT-001'].forEach((systemId) => {
  let m = null;
  let err = null;
  try {
    m = FL.arena.createMatch({ systemId: systemId, rounds: 3, seed: 7, noise: false, agentIds: [] });
  } catch (e) { err = e; }
  ok(!err, systemId + ' createMatch 不抛错', err ? String(err.message) : '');
  if (!m) return;
  ok(m.rounds.length === 3, systemId + ' 轮数正确');
  ok(m.rounds.every((r) => r.samples.length === 601), systemId + ' 每轮 601 点');
  ok(m.leaderboard.every((r) => isNum(r.avgScore)), systemId + ' 排行榜分数有效');
  const fusion = m.leaderboard.filter((r) => r.agentId === 'fusion')[0];
  const limit = m.leaderboard.filter((r) => r.agentId === 'sensor-limit')[0];
  ok(!!fusion && !!limit, systemId + ' 排行榜含 fusion / sensor-limit');
  ok(fusion && fusion.avgScore > limit.avgScore, systemId + ' fusion 平均分高于 sensor-limit',
    fusion && limit ? fusion.avgScore + ' vs ' + limit.avgScore : '');
  m.rounds.forEach((r) => {
    ok(r.observables.length > 0 && r.observables.every((o) => !FORBIDDEN_ID.test(o.id)),
      systemId + ' R' + r.index + ' 盲观测无真值通道');
    const nan = r.samples.some((row) => row.some((v) => v !== null && !isFinite(v)));
    ok(!nan, systemId + ' R' + r.index + ' 盲观测无 NaN/Inf');
  });
});

/* ----------------------------------------------------- 9. Agent 接口细节 */
section('9. Agent 统一接口与 firstAlarmT');
const metaRound = matchA.rounds.find((r) => !r.truth.healthy) || matchA.rounds[0];
const meta = {
  systemId: 'FL-001',
  duration_s: 60,
  dt_s: 0.1,
  observables: metaRound.observables,
  components: [
    { id: 'sensor', label: '电流传感器' }, { id: 'load', label: '负载' },
    { id: 'converter', label: '双向 DC/DC 变换器' }
  ],
  faultFamilies: [
    { id: 'sensor_drift', label: '传感器漂移' }, { id: 'load_step', label: '负载冲击' },
    { id: 'actuator_fault', label: '执行器异常' }
  ]
};
const fusionAgent = FL.agents.create('fusion', meta);
['reset', 'observe', 'diagnose'].forEach((m) => ok(typeof fusionAgent[m] === 'function', 'Agent 实例方法 ' + m + ' 存在'));
const early = fusionAgent.diagnose();
ok(early.faultDetected === false && early.faultType === 'none', '未观测时诊断为健康');
// 按列回放该轮的盲观测样本
const replay = metaRound.samples.map((row) => {
  const s = {};
  metaRound.observables.forEach((o, j) => { s[o.id] = row[j + 1]; });
  return { t: row[0], s: s };
});
replay.forEach((sample) => fusionAgent.observe(sample, meta));
const finalDiag = fusionAgent.diagnose();
ok(isNum(fusionAgent.firstAlarmT), 'fusion 观测故障流后 firstAlarmT 为数值', String(fusionAgent.firstAlarmT));
ok(finalDiag.faultDetected === true, 'fusion 在故障流上报警');
ok(finalDiag.detectTime_s === fusionAgent.firstAlarmT || Math.abs(finalDiag.detectTime_s - fusionAgent.firstAlarmT) < 1e-9,
  'diagnosis.detectTime_s 与 firstAlarmT 一致');
ok(isNum(finalDiag.confidence) && finalDiag.confidence > 0.5, 'fusion 报警置信度 >0.5');
const resetOk = (function () {
  fusionAgent.reset();
  return fusionAgent.firstAlarmT === null && fusionAgent.diagnose().faultDetected === false;
})();
ok(resetOk, 'Agent.reset() 清空状态并可重新诊断');

/* ------------------------------------------------------------- 结果汇总 */
console.log('\n================================================');
console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ✗' : '  ✓'));
if (fail) {
  console.log('\n失败项：');
  failures.forEach((f) => console.log(' - ' + f));
  process.exit(1);
}
console.log('Agent Arena 测试全部通过。');
process.exit(0);
