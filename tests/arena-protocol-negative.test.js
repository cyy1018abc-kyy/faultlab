/* owner: arena-protocol | module: tests/arena-protocol-negative | contract: NEXT/ARENA_EVAL_PROTOCOL_APPROVED.md 附录 A/§8
   盲评测协议 v2 负例矩阵（N-B1…N-B17，冻结后不得删减只可增补）+ MVP smoke（gen→verify→score_hash）
   + deriveChangePoints 健康局假候选率实测（QP-4 首发前置，协议 §6.3）。
   运行：node tests/arena-protocol-negative.test.js；失败非零退出。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { bootstrap } = require('./core-load');

const FL = bootstrap();
(0, eval)(fs.readFileSync(path.join(__dirname, '..', 'src', 'agents', 'arena.js'), 'utf8'));
const AP = FL.arenaProtocol;
const core = FL.core;

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, detail) {
  if (cond) pass++;
  else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); }
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
function clone(o) { return JSON.parse(JSON.stringify(o)); }

/* ---- 有效基座：真实仿真产生的 2 轮盲包 + reveal + 完美提交 ---- */
function makeBase(seed) {
  const s = seed == null ? 777 : seed;
  const setup = { systemId: 'FL-001', rounds: 2, seed: s, noise: true, agentIds: [] };
  const scenarios = AP.buildScenarioSet('FL-001', setup, FL.rng.mulberry32(s));
  const rounds = [];
  const mapping = [];
  scenarios.forEach((sc, i) => {
    const run = core.simulate(sc.config);
    const observables = AP.blindObservables(run);
    const samples = AP.buildSamples(run, observables);
    rounds.push({ index: i + 1, observables, samples });
    mapping.push({ round: i + 1, truth: AP.deriveTruth(sc, run) });
  });
  const bundle = AP.buildBundleV2({ systemId: 'FL-001', rounds });
  mapping.forEach((m) => { m.match_id = bundle.match_id; });
  const reveal = AP.buildRevealV2({
    testsetId: bundle.testset_id, matchId: bundle.match_id, seed: s, systemId: 'FL-001', mapping
  });
  return { bundle, reveal, scenarios };
}
function perfectSubmission(bundle, reveal) {
  return {
    protocol: 'v2',
    agent: { name: '协议测试·完美基线' },
    testset_id: bundle.testset_id,
    match_id: bundle.match_id,
    results: reveal.mapping.map((m) => ({
      round: m.round,
      diagnosis: {
        faultDetected: !m.truth.healthy,
        faultType: m.truth.faultFamily,
        component: m.truth.component,
        magnitude: m.truth.magnitude ? { value: m.truth.magnitude.value, unit: m.truth.magnitude.unit } : null,
        detectTime_s: m.truth.t_fault,
        confidence: m.truth.healthy ? 0 : 1
      }
    }))
  };
}
const BASE = makeBase();

/* =========================================================
 * 附录 A：17 条负例（冻结）
 * ========================================================= */
/* N-B1 seed 重建攻击（LEAK-1） */
(() => {
  const b = clone(BASE.bundle); b.seed = 20261027;
  expectCode(() => AP.validateBundleV2(b), 'AE-E03', 'N-B1 盲包携带 seed 字段');
})();
/* N-B2 noise 标志 */
(() => {
  const b = clone(BASE.bundle); b.noise = { enabled: true, seed: 1, level: 1 };
  expectCode(() => AP.validateBundleV2(b), 'AE-E03', 'N-B2 盲包携带 noise 字段');
})();
/* N-B3 事件字段（LEAK-2） */
(() => {
  const b = clone(BASE.bundle); b.events = [{ trigger_s: 20 }];
  expectCode(() => AP.validateBundleV2(b), 'AE-E04', 'N-B3 盲包携带 events/trigger_s');
})();
/* N-B4 config/fault 配置（裸键 fault 由并集规则命中） */
(() => {
  const b = clone(BASE.bundle); b.fault = { family: 'sensor_drift' };
  expectCode(() => AP.validateBundleV2(b), 'AE-E02', 'N-B4a 裸键 fault（并集含 schema 组）');
  const b2 = clone(BASE.bundle); b2.config = { duration_s: 60 };
  expectCode(() => AP.validateBundleV2(b2), 'AE-E02', 'N-B4b 键 config');
})();
/* N-B5 truth 键名 / 观测通道禁词 id（值级） */
(() => {
  const b = clone(BASE.bundle); b.truth = { healthy: false };
  expectCode(() => AP.validateBundleV2(b), 'AE-E02', 'N-B5a 键 truth');
  const b2 = clone(BASE.bundle);
  b2.rounds[0].observables.push({ id: 'I_bat_true_A', label: 'x', unit: 'A' });
  expectCode(() => AP.validateBundleV2(b2), 'AE-E02', 'N-B5b 观测 id 含 _true_');
})();
/* N-B6 通道越权（MODEL_STATE 通道 / 未注册 id） */
(() => {
  const b = clone(BASE.bundle);
  b.rounds[0].observables.push({ id: 'P_load_served_kW', label: 'x', unit: 'kW' }); /* MODEL_STATE */
  expectCode(() => AP.validateBundleV2(b), 'AE-E06', 'N-B6a MODEL_STATE 通道越权');
  const b2 = clone(BASE.bundle);
  b2.rounds[0].observables.push({ id: 'made_up_channel', label: 'x', unit: '' });
  expectCode(() => AP.validateBundleV2(b2), 'AE-E06', 'N-B6b 未注册通道');
})();
/* N-B7 网格违规 */
(() => {
  const b = clone(BASE.bundle); b.rounds[0].samples.pop();
  expectCode(() => AP.validateBundleV2(b), 'AE-E07', 'N-B7a 点数 600≠601');
  const b2 = clone(BASE.bundle); b2.rounds[1].samples[5][0] = 0.6; /* 应为 0.5 */
  expectCode(() => AP.validateBundleV2(b2), 'AE-E07', 'N-B7b t[5]≠0.5（1e-9 容差）');
  const b3 = clone(BASE.bundle); b3.rounds[0].dt_s = 0.2;
  expectCode(() => AP.validateBundleV2(b3), 'AE-E07', 'N-B7c dt=0.2 违反 sr1');
})();
/* N-B8 未知字段（closed-world） */
(() => {
  const b = clone(BASE.bundle); b.metadata = 'x';
  expectCode(() => AP.validateBundleV2(b), 'AE-E08', 'N-B8 白名单外顶层字段');
})();
/* N-B9 版本/缺失（v2 轨一律拒收） */
(() => {
  const b = clone(BASE.bundle); b.schema = 'faultlab.arena.round.v1';
  expectCode(() => AP.validateBundleV2(b), 'AE-E01', 'N-B9a v1 schema 拒收');
  const b2 = clone(BASE.bundle); delete b2.bundle_kind;
  expectCode(() => AP.validateBundleV2(b2), 'AE-E01', 'N-B9b 缺 bundle_kind');
})();
/* N-B10 互斥违规（EvidenceBundle 成员键） */
(() => {
  const b = clone(BASE.bundle); b.run_manifest = {};
  expectCode(() => AP.validateBundleV2(b), 'AE-E09', 'N-B10 arena_blind 内嵌证据包成员');
})();
/* N-B11 数值完整性（null 允许；NaN/Infinity/字符串/超阈拒收） */
(() => {
  const b = clone(BASE.bundle); b.rounds[0].samples[10][1] = NaN;
  expectCode(() => AP.validateBundleV2(b), 'AE-E10', 'N-B11a NaN');
  const b2 = clone(BASE.bundle); b2.rounds[0].samples[10][1] = Infinity;
  expectCode(() => AP.validateBundleV2(b2), 'AE-E10', 'N-B11b Infinity');
  const b3 = clone(BASE.bundle); b3.rounds[0].samples[10][1] = '12.5';
  expectCode(() => AP.validateBundleV2(b3), 'AE-E10', 'N-B11c 字符串数字');
  const b4 = clone(BASE.bundle); b4.rounds[0].samples[10][1] = 1e10;
  expectCode(() => AP.validateBundleV2(b4), 'AE-E10', 'N-B11d 超阈 1e9');
  const b5 = clone(BASE.bundle); b5.rounds[0].samples[10][1] = null;
  eq(AP.validateBundleV2(b5).ok, true, 'N-B11e null（可选通道缺失）允许');
})();
/* N-B12 提交侧越界 */
(() => {
  const s = perfectSubmission(BASE.bundle, BASE.reveal);
  s.results[0].diagnosis.confidence = 1.5;
  expectCode(() => AP.validateSubmissionV2(s, BASE.bundle), 'AE-E11', 'N-B12a confidence 越界');
  const s2 = perfectSubmission(BASE.bundle, BASE.reveal);
  s2.results[0].diagnosis.faultType = 'bluetooth';
  expectCode(() => AP.validateSubmissionV2(s2, BASE.bundle), 'AE-E11', 'N-B12b 未知故障家族');
})();
/* N-B13 测试集标识夹带种子材料 */
(() => {
  const b = clone(BASE.bundle); b.testset_id = 'arena2-FL001-2-20261027'; /* 十进制种子形 */
  expectCode(() => AP.validateBundleV2(b, { approvedTestsetIds: [BASE.bundle.testset_id] }),
    'AE-E13', 'N-B13a testset_id 不在批准清单');
  const b2 = clone(BASE.bundle); b2.testset_id = 'arena2-FL001-2-XYZAB'; /* 非 hex */
  expectCode(() => AP.validateBundleV2(b2), 'AE-E13', 'N-B13b testset_id 非法格式');
})();
/* N-B14 match_id 值内嵌种子（v1 式格式） */
(() => {
  const b = clone(BASE.bundle); b.match_id = 'Arena-FL-001-S20261027-R6';
  expectCode(() => AP.validateBundleV2(b), 'AE-E14', 'N-B14 match_id 非 opaque UUIDv4');
})();
/* N-B15 跨包重放提交（绑定缺失/不一致） */
(() => {
  const s = perfectSubmission(BASE.bundle, BASE.reveal); delete s.match_id;
  expectCode(() => AP.validateSubmissionV2(s, BASE.bundle), 'AE-E14', 'N-B15a 绑定缺失');
  const s2 = perfectSubmission(BASE.bundle, BASE.reveal); s2.testset_id = 'arena2-FL001-2-deadbeef';
  expectCode(() => AP.validateSubmissionV2(s2, BASE.bundle), 'AE-E14', 'N-B15b 绑定不一致');
})();
/* N-B16 深度/体积炸弹 */
(() => {
  const b = clone(BASE.bundle);
  let deep = { leaf: 1 };
  for (let i = 0; i < 70; i++) deep = { a: deep };
  b.deepBomb = deep;
  expectCode(() => AP.validateBundleV2(b), 'AE-E15', 'N-B16a 嵌套深度 >64');
  const b2 = clone(BASE.bundle);
  expectCode(() => AP.validateBundleV2(b2, { rawBytes: 2 * 1048576 }), 'AE-E15', 'N-B16b 包体 >1MB');
})();
/* N-B17 open_seed 混入计分轨 */
(() => {
  const b = clone(BASE.bundle); b.bundle_kind = 'arena_blind_open_seed';
  expectCode(() => AP.validateBundleV2(b), 'AE-E03', 'N-B17 open_seed 计分轨硬拒收');
})();

/* =========================================================
 * MVP smoke：gen（共享模块）→ validate → 提交 → score_hash
 * ========================================================= */
(() => {
  const { bundle, reveal } = makeBase(424242);
  eq(AP.validateBundleV2(bundle, { approvedTestsetIds: [bundle.testset_id] }).ok, true, 'smoke: 有效盲包通过全量校验');
  /* 零墙钟字段 */
  ok(!/exported_at|created_at|generated_at/.test(JSON.stringify(bundle)), 'smoke: 盲包零墙钟字段');
  /* 标识符与种子无确定性函数关系：同 seed 两次生成 → 样本一致、标识符必不同 */
  const again = makeBase(424242);
  eq(JSON.stringify(again.bundle.rounds[0].samples), JSON.stringify(bundle.rounds[0].samples),
    'smoke: 同 seed 场景流逐位一致（确定性）');
  ok(again.bundle.testset_id !== bundle.testset_id && again.bundle.match_id !== bundle.match_id,
    'smoke: 标识符为 CSPRNG（同 seed 不复用）');
  /* 完美对局 → 场均 100 */
  const sub = perfectSubmission(bundle, reveal);
  const report = AP.scoreV2({
    bundle, submission: sub, reveal,
    blindSha256: core.hashString(JSON.stringify(bundle)),
    submissionSha256: core.hashString(JSON.stringify(sub))
  });
  eq(report.avg_score, 100, 'smoke: 完美对局场均 100 分');
  ok(/^合成故障评测游戏/.test(report.notice), 'smoke: 成绩单携带游戏定位声明');
  /* score_hash 确定性 + 敏感性 */
  const report2 = AP.scoreV2({
    bundle, submission: sub, reveal,
    blindSha256: core.hashString(JSON.stringify(bundle)),
    submissionSha256: core.hashString(JSON.stringify(sub))
  });
  eq(report.score_hash, report2.score_hash, 'smoke: score_hash 确定性');
  const subTampered = clone(sub); subTampered.results[0].diagnosis.confidence = 0.9;
  const report3 = AP.scoreV2({
    bundle, submission: subTampered, reveal,
    blindSha256: core.hashString(JSON.stringify(bundle)),
    submissionSha256: core.hashString(JSON.stringify(subTampered))
  });
  ok(report3.score_hash !== report.score_hash && report3.avg_score < 100,
    'smoke: 提交被篡改 → 哈希改变且分数下降');
  /* 评分规格哈希（reveal/落章共用同一冻结文本） */
  eq(AP.scoringRulesSpecHash(), core.hashString(AP.SCORING_SPEC_TEXT), 'smoke: scoring_rules_spec_hash 单源');
})();

/* =========================================================
 * QP-4 前置：deriveChangePoints 健康局假候选率实测（sr1，发布口径）
 * ========================================================= */
(() => {
  const total = 30;
  let healthyWithCandidate = 0;
  let faultWithCandidateNear = 0;
  let faultTotal = 0;
  let faultDetectable = 0;
  let faultDetectableHit = 0;
  for (let s = 1; s <= total; s++) {
    const setup = { systemId: 'FL-001', rounds: 1, seed: s * 101, noise: true, agentIds: [] };
    const sc = AP.makeHealthyScenario('FL-001', setup, 0, 'closed_loop');
    const run = core.simulate(sc.config);
    const obs = AP.blindObservables(run);
    const cps = AP.deriveChangePoints(AP.buildSamples(run, obs), obs);
    if (cps.length) healthyWithCandidate++;
    /* 故障局对照：sensor_drift 阶跃应被检出且邻近注入时刻；
       幅值 ≥5 A（信噪比充足）才计入「可测」口径——小幅值阶跃低于 5σ 噪声阈属数据受限，不计失败。 */
    const sc2 = AP.buildScenario('FL-001', setup, FL.rng.mulberry32(s * 101 + 1), 0);
    if (!sc2.healthy && sc2.family === 'sensor_drift') {
      faultTotal++;
      const run2 = core.simulate(sc2.config);
      const obs2 = AP.blindObservables(run2);
      const cps2 = AP.deriveChangePoints(AP.buildSamples(run2, obs2), obs2);
      if (cps2.some((c) => Math.abs(c.t - sc2.tStart) <= 0.3)) {
        faultWithCandidateNear++;
        if (sc2.magnitude >= 5) faultDetectableHit++;
      }
      if (sc2.magnitude >= 5) faultDetectable++;
    }
  }
  const rate = Math.round((healthyWithCandidate / total) * 100) / 100;
  ok(rate <= 0.2, 'QP-4 健康局假候选率 ≤0.2（实测 ' + rate + '，' + healthyWithCandidate + '/' + total + '）');
  if (faultDetectable >= 5) {
    const hit = faultDetectableHit / faultDetectable;
    ok(hit >= 0.9, 'QP-4 可测幅值（≥5 A）故障局阶跃邻近检出 ≥0.9（实测 '
      + Math.round(hit * 100) / 100 + '，' + faultDetectableHit + '/' + faultDetectable + '）');
  }
  console.log('[rate] deriveChangePoints sr1 健康局假候选率：' + rate
    + '（' + healthyWithCandidate + '/' + total + ' 局）；全部 sensor_drift 局邻近检出 '
    + faultWithCandidateNear + '/' + faultTotal + '（可测幅值 ≥5 A：' + faultDetectableHit + '/' + faultDetectable
    + '）。该实测值随本测试发布（协议 §6.3/QP-4）。');
})();

/* ========================================================= */
console.log('\n== 盲评测协议 v2 负例矩阵 + MVP smoke ==');
if (fail) {
  console.log('FAIL ' + fail + ' / PASS ' + pass);
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('PASS ' + pass + ' / FAIL 0 ✓（N-B1…N-B17 负例 + MVP smoke + QP-4 假候选率实测）');
