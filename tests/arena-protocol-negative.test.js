/* owner: arena-protocol | module: tests/arena-protocol-negative | contract: NEXT/ARENA_EVAL_PROTOCOL_APPROVED.md 附录 A/§8
   盲评测协议 v2 负例矩阵（N-B1…N-B17 冻结 + N-B18/N-B19 增补——V150 O-1 CHG-20261114-05，
   面⑤「不得删减只可增补」）+ MVP smoke（gen→verify→score_hash）
   + 新族提交→评分可达 smoke（O-1：诊断族枚举 additive 扩展，评分消费点=等值匹配自动可达）
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
 * 附录 A 增补（V150 O-1：CHG-20261114-05，面⑤「不得删减只可增补」——
 * 冻结 N-B1…N-B17 零改动，增补 N-B18/N-B19 与新族可达 smoke）
 * ========================================================= */
/* N-B18 新族合法提交正例（V150 O-1 增补）：诊断提交族枚举 additive 扩展
   （+shading_step/gust_step/shading_link/gust_link/island_event——入池六系统目录活跃族
   全集 + none；枚举=族名全集非按系统，MG load_step 与既有 load_step 同名共用） */
(() => {
  ['shading_step', 'gust_step', 'shading_link', 'gust_link', 'island_event'].forEach((fam, i) => {
    const s = perfectSubmission(BASE.bundle, BASE.reveal);
    s.results[0].diagnosis.faultType = fam;
    let err = null;
    try { AP.validateSubmissionV2(s, BASE.bundle); } catch (e) { err = e; }
    ok(!err, 'N-B18.' + (i + 1) + ' 新族合法提交通过 V-07（' + fam + '）', err ? String(err.message) : '');
  });
})();
/* N-B19 提交族枚举越界负例（V150 O-1 增补）：目录项 id 非族名（pv_shading_link/wt_gust_link
   为 FAULT_CATALOG v1.7 目录项 id、族名为 shading_link/gust_link——枚举收族名不收 id）
   与空族仍拒收 */
(() => {
  const s = perfectSubmission(BASE.bundle, BASE.reveal);
  s.results[0].diagnosis.faultType = 'pv_shading_link';
  expectCode(() => AP.validateSubmissionV2(s, BASE.bundle), 'AE-E11', 'N-B19a 目录项 id pv_shading_link 非族名（仍拒收）');
  const s2 = perfectSubmission(BASE.bundle, BASE.reveal);
  s2.results[0].diagnosis.faultType = 'wt_gust_link';
  expectCode(() => AP.validateSubmissionV2(s2, BASE.bundle), 'AE-E11', 'N-B19b 目录项 id wt_gust_link 非族名（仍拒收）');
  const s3 = perfectSubmission(BASE.bundle, BASE.reveal);
  s3.results[0].diagnosis.faultType = '';
  expectCode(() => AP.validateSubmissionV2(s3, BASE.bundle), 'AE-E11', 'N-B19c 空族名（仍拒收）');
})();

/* =========================================================
 * O-1 增补 smoke：新族提交→评分可达（CHG-20261114-05）。评分消费点=等值匹配
 * （scoreDiagnosis faultType===faultFamily / component===component——ARENA_EVAL_PROTOCOL
 * _APPROVED §6.4），提交过 V-07 后 family/component 评分项自动可达。
 * island_event 为零参数族：真值幅值 {value,unit:''} 不满足既有提交侧非空 unit 规则，
 * 按「缺失幅值记 0」冻结口径提交 null → round_score=85.0（幅值边为既有观察项，不在
 * 本增补面内——真值构造面零触碰）。
 * ========================================================= */
(() => {
  function makeBaseFamily(systemId, family) {
    const seed = 9024;
    const setup = { systemId, rounds: 1, seed, noise: true, agentIds: [] };
    const config = FL.systems.defaultConfig(systemId);
    config.feedback_mode = 'closed_loop';
    config.initial = clone(config.initial || {});
    config.noise = { enabled: true, seed: (seed + 0 * 7919) >>> 0, level: 1 };
    const faultDef = FL.systems.fault(systemId, family);
    const magnitude = AP.magnitudeFromRoll(0.5, faultDef);
    config.fault = { family, faultId: faultDef.id, t_start_s: 20, params: { magnitude } };
    const run = core.simulate(config);
    const observables = AP.blindObservables(run);
    const samples = AP.buildSamples(run, observables);
    const sc = {
      config, healthy: false, family, faultDef, faultId: faultDef.id, magnitude,
      unit: faultDef.params && faultDef.params[0] ? faultDef.params[0].unit : '',
      tStart: 20, feedbackMode: 'closed_loop',
      expectedComponent: (FL.systems.get(systemId).faultAnchors || {})[family] || 'none'
    };
    const truth = AP.deriveTruth(sc, run);
    const bundle = AP.buildBundleV2({ systemId, rounds: [{ index: 1, observables, samples }] });
    const mapping = [{ round: 1, truth, match_id: bundle.match_id }];
    const reveal = AP.buildRevealV2({ testsetId: bundle.testset_id, matchId: bundle.match_id, seed, systemId, mapping });
    return { bundle, reveal, truth };
  }
  const cases = [
    ['PV-001', 'shading_step', 100], ['WT-001', 'gust_step', 100],
    ['MG-001', 'shading_link', 100], ['MG-001', 'gust_link', 100],
    ['MG-001', 'island_event', 85]
  ];
  cases.forEach((c, i) => {
    const systemId = c[0], family = c[1], expectScore = c[2];
    let ctx = null;
    let err = null;
    try { ctx = makeBaseFamily(systemId, family); } catch (e) { err = e; }
    ok(!err && ctx, 'O1-smoke.' + (i + 1) + 'a ' + systemId + '×' + family + ' 盲包+reveal 构造不抛错', err ? String(err.message) : '');
    if (!ctx) return;
    let vErr = null;
    try { AP.validateBundleV2(ctx.bundle, { approvedTestsetIds: [ctx.bundle.testset_id] }); } catch (e) { vErr = e; }
    ok(!vErr, 'O1-smoke.' + (i + 1) + 'b ' + family + ' 盲包 V-01…V-06b 通过', vErr ? String(vErr.message) : '');
    const sub = {
      protocol: 'v2', agent: { name: 'O-1 增补 smoke' },
      testset_id: ctx.bundle.testset_id, match_id: ctx.bundle.match_id,
      results: [{ round: 1, diagnosis: {
        faultDetected: true, faultType: family, component: ctx.truth.component,
        magnitude: (ctx.truth.magnitude && ctx.truth.magnitude.unit)
          ? { value: ctx.truth.magnitude.value, unit: ctx.truth.magnitude.unit } : null,
        detectTime_s: ctx.truth.t_fault, confidence: 1
      } }]
    };
    let sErr = null;
    try { AP.validateSubmissionV2(sub, ctx.bundle); } catch (e) { sErr = e; }
    ok(!sErr, 'O1-smoke.' + (i + 1) + 'c ' + family + ' 新族提交通过 V-07', sErr ? String(sErr.message) : '');
    if (sErr) return;
    const report = AP.scoreV2({
      bundle: ctx.bundle, submission: sub, reveal: ctx.reveal,
      blindSha256: core.hashString(JSON.stringify(ctx.bundle)),
      submissionSha256: core.hashString(JSON.stringify(sub))
    });
    eq(report.rounds[0].family, '1.0000', 'O1-smoke.' + (i + 1) + 'd ' + family + ' family 评分可达');
    eq(report.rounds[0].component, '1.0000', 'O1-smoke.' + (i + 1) + 'e ' + family + ' component 评分可达（' + ctx.truth.component + '）');
    eq(report.rounds[0].round_score, expectScore.toFixed(1), 'O1-smoke.' + (i + 1) + 'f ' + family + ' round_score=' + expectScore);
  });
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

/* =========================================================
 * G10 Arena L2 增补（V190 CHG-20261115-09/-10；编号重基线——G10 原文 N-B18..N-B20
 * 与 V150 O-1 已占用的 N-B18/N-B19 撞号 ⇒ 仓内 N-B20..N-B23；原文 N-B13+ 词面
 * → N-B23 提交侧 + copy-guard src/** 面。tools/arena-l2-core.mjs 共享核心单源。）
 * ========================================================= */
(() => {
  const L2 = require('../tools/arena-l2-core.mjs');
  const { createHash } = require('crypto');
  const reseal = (sub) => {
    const body = clone(sub);
    delete body.submission_sha256;
    body.submission_sha256 = createHash('sha256').update(JSON.stringify(body), 'utf8').digest('hex');
    return body;
  };

  /* L2 夹具：FL-001 sensor_drift 单 episode（t_fault=20） */
  const seed = 31415;
  const config = FL.systems.defaultConfig('FL-001');
  config.feedback_mode = 'closed_loop';
  config.initial = clone(config.initial || {});
  config.noise = { enabled: false, seed: seed >>> 0, level: 0 };
  const faultDef = FL.systems.fault('FL-001', 'sensor_drift');
  const magnitude = AP.magnitudeFromRoll(0.5, faultDef);
  config.fault = { family: 'sensor_drift', faultId: faultDef.id, t_start_s: 20, params: { magnitude } };
  const run = core.simulate(config);
  const obs = AP.blindObservables(run);
  const episode = L2.buildL2Episode(1, run, obs);
  const sc = { config, healthy: false, family: 'sensor_drift', faultDef, faultId: faultDef.id,
    magnitude, unit: faultDef.params && faultDef.params[0] ? faultDef.params[0].unit : '',
    tStart: 20, feedbackMode: 'closed_loop',
    expectedComponent: (FL.systems.get('FL-001').faultAnchors || {}).sensor_drift || 'none' };
  const truth = AP.deriveTruth(sc, run);
  truth.rule_id_onset = 'n1';
  truth.rule_id_propagation = 'n3';
  const pack = { schema: L2.L2_SCHEMA, bundle_kind: 'arena_blind_l2', arena_version: '2.0',
    systemId: 'FL-001', testset_id: AP.newTestsetId('FL-001', 1), match_id: AP.newMatchId(),
    episodes: [episode],
    query_budget: { b_max_points: 180, b_min_points: 45, cost_rule: 'k_variables_x_m_rows' } };
  const reveal = { schema: 'faultlab.arena.reveal.v1', testset_id: pack.testset_id,
    match_id: pack.match_id, mapping: [{ round: 1, truth }] };
  const obsIds = obs.map((o) => o.id);

  eq(L2.validateL2Pack(pack).ok, true, 'L2-fix: 盲包结构 + closed-white + 预算常量钉通过');
  ok(episode.high_res_store.rows.length === 602
    && episode.high_res_store.boundary_rows.length === 2
    && episode.coarse_beacon.rows.length === 31,
    'L2-fix: 602 行（601 网格 + pre 边界行）+ 边界行成对 + 31 行 2.0 s 粗网格');
  const b0 = episode.high_res_store.boundary_rows[0];
  const b1 = episode.high_res_store.boundary_rows[1];
  ok(b0.phase === 'pre' && b0.derivation === 'left_limit' && b1.phase === 'post'
    && b1.derivation === 'post_sample',
    'L2-fix: 边界行 pre=left_limit / post=post_sample（G10 §3.1②）');

  /* 正常会话：边界行永不跳过 + 代价公式 + 预算硬帽（原文 N-B19 → 仓内 N-B21 面） */
  const session = L2.createL2Session(pack);
  const trig = 20.0;
  const s1 = session.sliceTelemetry(episode.episode_id, obsIds.slice(0, 4), trig - 0.4, trig + 0.4, 5);
  ok(s1.boundary.length === 2, 'L2: 边界行永不跳过（stride=5 仍返回 2 边界行）');
  eq(s1.cost_points, 4 * s1.rows.length, 'L2: cost_points = K×M');
  let e19 = null;
  try {
    const s3 = L2.createL2Session(pack);
    while (true) s3.sliceTelemetry(episode.episode_id, obsIds.slice(0, 4), 0, 0.1, 1000000);
  } catch (e) { e19 = e; }
  ok(e19 && e19.code === 'L2-E19', 'N-B21 预算硬帽拒收（B_max=180，L2-E19）');

  /* 正例：真实账本 + 接地锚点 → V-11a/b + S_diag=50 */
  const s2 = session.sliceTelemetry(episode.episode_id, obsIds.slice(0, 2), trig + 1, trig + 11, 10);
  const sub = session.exportSubmission({ agent: { name: 'neg-suite-l2' }, episodes: [{
    episode_id: episode.episode_id,
    diagnosis: { faultDetected: true, faultType: 'sensor_drift', component: truth.component,
      magnitude: { value: truth.magnitude.value, unit: truth.magnitude.unit },
      detectTime_s: truth.t_fault, confidence: 1, explanation: 'onset 阶跃与传播斜率对齐盲观测。' },
    evidence_anchors: [
      { kind: 'onset', variable: obsIds[0], t_start: trig - 0.4, t_end: trig + 0.4,
        rule_id: 'n1', backed_by_query_seq: 1, note: 'onset 窗' },
      { kind: 'propagation', variable: obsIds[1], t_start: trig + 1, t_end: trig + 11,
        rule_id: 'n3', backed_by_query_seq: 2, note: '传播窗' },
    ] }] });
  const report = L2.scoreL2Submission({ pack, submission: sub, reveal });
  eq(report.episodes[0].s_diag, 50, 'L2 正例：S_diag=50（家族/幅值/时刻全对）');
  ok(report.episodes[0].v11a && report.episodes[0].v11b && report.episodes[0].s_anchor === 30,
    'V-11a/b 锚点接地 +30（onset ≤2.0s 含边界行 + propagation ≥5.0s）');
  ok(report.avg_score > 90, 'L2 正例高分（S_eff 账本效率加权）');
  const report2 = L2.scoreL2Submission({ pack, submission: sub, reveal });
  eq(report.score_hash, report2.score_hash, 'L2: score_hash 确定性');

  /* N-B20（原文 N-B18）无据锚点：时窗重叠 <80% 拒收 */
  const bad20 = clone(sub);
  bad20.episodes[0].evidence_anchors[0].t_start = 10;
  bad20.episodes[0].evidence_anchors[0].t_end = 12;
  expectCode(() => L2.scoreL2Submission({ pack, submission: reseal(bad20), reveal }),
    'L2-E20', 'N-B20 无据锚点拒收（时窗重叠 <80%）');
  /* N-B21a（原文 N-B19）代价公式违约：cost_points ≠ K×M */
  const bad21a = clone(sub);
  bad21a.query_ledger[0].cost_points = 1;
  expectCode(() => L2.scoreL2Submission({ pack, submission: reseal(bad21a), reveal }),
    'L2-E21', 'N-B21a cost_points ≠ K×M 拒收');
  /* N-B21b 累计超支：单条可承受的真实切片（2 通道 × 61 行 = 122 点）伪造双条
     → 累计 244 > 180。条目逐条自洽（重放哈希一致、K×M 相等）但累计超帽——
     正是 N-B21b 面的攻击形态（单条真实、双条超支）。 */
  const probeSession = L2.createL2Session(pack);
  probeSession.sliceTelemetry(episode.episode_id, obsIds.slice(0, 2), 0, 6.0, 1);
  const bigEntry = probeSession.ledger()[0];
  const bad21b = clone(sub);
  bad21b.query_ledger = [Object.assign({}, bigEntry, { seq: 1 }),
    Object.assign({}, bigEntry, { seq: 2 })];
  bad21b.episodes[0].evidence_anchors = [
    { kind: 'onset', variable: obsIds[0], t_start: trig - 0.4, t_end: trig + 0.4,
      rule_id: 'n1', backed_by_query_seq: 1, note: 'onset 窗' },
  ];
  expectCode(() => L2.scoreL2Submission({ pack, submission: reseal(bad21b), reveal }),
    'L2-E21', 'N-B21b 累计预算超支拒收（244 > 180）');
  /* N-B22（原文 N-B20）账本重放哈希不符：伪造 slice_sha256 */
  const bad22 = clone(sub);
  bad22.query_ledger[0].slice_sha256 = '0'.repeat(64);
  expectCode(() => L2.scoreL2Submission({ pack, submission: reseal(bad22), reveal }),
    'L2-E22', 'N-B22 账本重放哈希不符拒收');
  /* N-B23 观测词面禁词（原文 N-B13+ L2 提交侧；词面 = 水位/液位/water level/
     liquid level/验证通过/硬件已验证） */
  const bad23 = clone(sub);
  bad23.episodes[0].diagnosis.explanation = '检测到水位上升信号。';
  expectCode(() => L2.scoreL2Submission({ pack, submission: reseal(bad23), reveal }),
    'L2-E23', 'N-B23a 观测词面禁词命中（水位）');
  const bad23b = clone(sub);
  bad23b.episodes[0].evidence_anchors[0].note = 'result 验证通过';
  expectCode(() => L2.scoreL2Submission({ pack, submission: reseal(bad23b), reveal }),
    'L2-E23', 'N-B23b 观测词面禁词命中（验证通过）');
  /* 封章篡改（不经 reseal 的裸篡改 → L2-E22） */
  const badSeal = clone(sub);
  badSeal.episodes[0].diagnosis.confidence = 0.5;
  expectCode(() => L2.scoreL2Submission({ pack, submission: badSeal, reveal }),
    'L2-E22', 'L2 封章篡改拒收（submission_sha256 不符）');
})();

/* ========================================================= */
console.log('\n== 盲评测协议 v2 负例矩阵 + MVP smoke ==');
if (fail) {
  console.log('FAIL ' + fail + ' / PASS ' + pass);
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('PASS ' + pass + ' / FAIL 0 ✓（N-B1…N-B17 冻结负例 + N-B18/N-B19 增补 + MVP smoke + O-1 新族可达 smoke + QP-4 假候选率实测 + G10 L2 N-B20…N-B23）');
