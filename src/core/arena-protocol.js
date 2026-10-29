/* owner: arena-protocol | module: arena-protocol | contract: NEXT/ARENA_EVAL_PROTOCOL_APPROVED.md (v1.1, CHG-20261030-03)
   =========================================================================
   独立盲评测协议 v2 —— 共享模块（零 DOM、Node 可加载、零第三方依赖）。
   职责（协议 §8 MVP-1）：
     ① sealedProjection 键名禁词并集（§6.1a：arena FORBIDDEN_KEY ∪ FORBIDDEN_ID
        ∪ schema BLIND_BANNED_KEY ∪ BLIND_BANNED_EXACT ∪ 语义禁项）；
     ② 场景流 + 健康局覆盖保护（从 arena.js createMatch 抽出，arena.js 反向调用，
        组织方生成器与页面共用同一实现，杜绝双实现漂移）；
     ③ 盲包 v2 构造（closed-world 白名单、零墙钟字段）与 V-01…V-06b 校验；
     ④ 提交绑定校验（testset_id/match_id）与评分落章（score_hash）。
   红线：盲包零真值（键名禁词 + 语义禁项 + closed-world 三查合一）；确定性复算禁止、
   观测派生估计允许（协议 §1.3-4 二分边界）。所有随机性：场景流用 FL.rng.mulberry32；
   标识符（testset_id 末段 / match_id）用 CSPRNG，与 set_seed 无任何确定性函数关系。
   ========================================================================= */
(function () {
  'use strict';
  var FL = window.FL = window.FL || {};

  var PROTOCOL_VERSION = '2.0';
  var SCHEMA_ROUND = 'faultlab.arena.round.v2';
  var SCHEMA_MATCH = 'faultlab.arena.match.v2';
  var SCHEMA_REVEAL = 'faultlab.arena.reveal.v1';
  var SCHEMA_SCORE = 'faultlab.arena.score.v2';

  /* sr1 冻结常量（协议 §3/§5.1）：网格锁定 golden 形状 */
  var SR1 = { scenario_rules: 'sr1', dt_s: 0.1, duration_s: 60, n_samples: 601, t_lo_s: 2, t_hi_s: 52 };

  /* ---- 工具（与 arena.js 同实现，保证场景流结果完全一致） ---- */
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function round(v, d) {
    if (!isNum(v)) return v;
    var p = Math.pow(10, d == null ? 2 : d);
    return Math.round(v * p) / p;
  }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function isPlainObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  /* AE 错误（协议附录 B）：contractError 同构（code/field/next），零依赖自含 */
  function aeError(code, field, message, next) {
    var err = new Error('[' + code + '] ' + message);
    err.name = 'ArenaProtocolError';
    err.code = code;
    err.field = field || '$';
    err.next = next || '按盲评测协议 v2 修正该字段';
    return err;
  }

  /* ---- §6.1a 密封投影禁词并集（单一来源） ----
     arena FORBIDDEN_KEY 不含裸键 fault，schema BLIND_BANNED_KEY 含 —— 取最严并集。 */
  var BLIND_KEY_RE = /(^|_)(true|truth|bias|cap|fault)(_|$)|^config$/i;
  var BLIND_EXACT = ['bias_A', 'faultFamily', 'faultId', 'faultActiveFrom_s', 'peakMagnitude'];
  var BLIND_SEMANTIC_SEED = /(^|_)(seed|set_seed|noise)(_|$)/i;      /* AE-E03（LEAK-1） */
  var BLIND_SEMANTIC_EVENT = /(^|_)(events|trigger_s|t_start_s|t_fault)(_|$)/i; /* AE-E04（LEAK-2） */
  var BLIND_ID_RE = /(^|_)(true|bias|cap)(_|$)/i;                    /* 观测通道 id（值级） */
  var BUNDLE_MEMBER_RE = /^(run_manifest|timeseries|timeseries\.csv|config\.json|metrics\.json|checks\.json|events\.json|model_manifest\.json|SHA256SUMS\.txt)$/;

  var TOP_WHITELIST = ['schema', 'bundle_kind', 'arena_version', 'systemId', 'testset_id',
    'match_id', 'scenario_rules', 'round', 'rounds', 'scoring_rules'];
  var ROUND_WHITELIST = ['index', 'dt_s', 'duration_s', 'observables', 'samples'];
  var OBS_WHITELIST = ['id', 'label', 'unit'];

  var TESTSET_ID_RE = /^arena2-[A-Za-z0-9]+-[0-9]{1,2}-[0-9a-f]{8}$/;
  var UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  var MAX_DEPTH = 64;
  var MAX_BYTES = 1048576;

  /* ---- 标识符（CSPRNG；与 set_seed 无任何确定性函数关系，协议 §3/§5.6） ---- */
  function randomHex(byteLen) {
    var c = (typeof globalThis !== 'undefined' && globalThis.crypto) ||
      (typeof window !== 'undefined' && window.crypto);
    if (!c || typeof c.getRandomValues !== 'function') {
      throw aeError('AE-E13', 'testset_id', '环境缺少 crypto.getRandomValues，无法生成与种子无关的 opaque 标识符',
        '在 Node ≥18 或现代浏览器中运行');
    }
    var b = new Uint8Array(byteLen);
    c.getRandomValues(b);
    var h = '';
    for (var i = 0; i < b.length; i++) h += (b[i] + 0x100).toString(16).slice(1);
    return h;
  }
  function newTestsetId(systemId, rounds) {
    return 'arena2-' + String(systemId).replace(/[^A-Za-z0-9]/g, '') + '-' + rounds + '-' + randomHex(4);
  }
  function newMatchId() { return uuidV4(); }
  function uuidV4() {
    var h = randomHex(16);
    /* 设置 version=4（第 13 个 hex 位）与 variant（第 17 位） */
    h = h.slice(0, 12) + '4' + h.slice(13, 16) + (['8', '9', 'a', 'b'][parseInt(h.slice(16, 17), 16) % 4]) + h.slice(17);
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20, 32);
  }

  /* ---- 深度测量（V-00 防递归扫描栈溢出） ---- */
  function measureDepth(obj) {
    var max = 0;
    function walk(v, d) {
      if (v === null || typeof v !== 'object') { if (d > max) max = d; return; }
      if (d + 1 > MAX_DEPTH) throw aeError('AE-E15', '$', '结构嵌套深度超过上限 ' + MAX_DEPTH, '移除多余嵌套（防深度炸弹）');
      if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) walk(v[i], d + 1); return; }
      var ks = Object.keys(v);
      for (var k = 0; k < ks.length; k++) walk(v[ks[k]], d + 1);
      if (d > max) max = d;
    }
    walk(obj, 0);
    return max;
  }

  /* ---- 键名禁词扫描（键精确匹配、不做大小写/Unicode 归一化；§5.1） ---- */
  function scanSealedKeys(obj, path, hits, depth) {
    if (obj === null || typeof obj !== 'object') return hits;
    if (depth > MAX_DEPTH) throw aeError('AE-E15', path, '结构嵌套深度超过上限 ' + MAX_DEPTH, '防深度炸弹');
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) scanSealedKeys(obj[i], path + '[' + i + ']', hits, depth + 1);
      return hits;
    }
    var keys = Object.keys(obj);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (BLIND_EXACT.indexOf(key) !== -1 || BLIND_KEY_RE.test(key)) hits.push(path + '.' + key);
      scanSealedKeys(obj[key], path + '.' + key, hits, depth + 1);
    }
    return hits;
  }
  function scanSemanticKeys(obj, path, hits, depth) {
    if (obj === null || typeof obj !== 'object') return hits;
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) scanSemanticKeys(obj[i], path + '[' + i + ']', hits, depth + 1);
      return hits;
    }
    var keys = Object.keys(obj);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (BLIND_SEMANTIC_SEED.test(key)) hits.push({ path: path + '.' + key, code: 'AE-E03' });
      else if (BLIND_SEMANTIC_EVENT.test(key)) hits.push({ path: path + '.' + key, code: 'AE-E04' });
      scanSemanticKeys(obj[key], path + '.' + key, hits, depth + 1);
    }
    return hits;
  }
  function scanBundleMembers(obj, path, hits, depth) {
    if (obj === null || typeof obj !== 'object') return hits;
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) scanBundleMembers(obj[i], path + '[' + i + ']', hits, depth + 1);
      return hits;
    }
    var keys = Object.keys(obj);
    for (var k = 0; k < keys.length; k++) {
      if (BUNDLE_MEMBER_RE.test(keys[k])) hits.push(path + '.' + keys[k]);
      scanBundleMembers(obj[keys[k]], path + '.' + keys[k], hits, depth + 1);
    }
    return hits;
  }

  /* ===================================================================
   * ② 场景流共享模块（自 arena.js createMatch 抽出；逻辑完全一致）
   * =================================================================== */
  var FAMILY_ORDER = ['sensor_drift', 'load_step', 'actuator_fault'];
  var FAMILY_LABELS = {
    sensor_drift: '传感器漂移',
    load_step: '负载冲击',
    actuator_fault: '执行器异常',
    none: '健康'
  };
  var HEALTHY_RATIO = 0.2;

  /* 用已抽取的 [0,1) 直接完成幅值离散化（保持一次抽取的顺序） */
  function magnitudeFromRoll(roll, faultDef) {
    var p = faultDef && faultDef.params && faultDef.params[0] ? faultDef.params[0] : null;
    if (!p) return 10;
    var step = isNum(p.step) && p.step > 0 ? p.step : 1;
    var min = isNum(p.min) ? p.min : 0;
    var max = isNum(p.max) ? p.max : min + 10 * step;
    var count = Math.max(1, Math.floor((max - min) / step) + 1);
    var idx = Math.min(count - 1, Math.floor(roll * count));
    return round(min + idx * step, 6);
  }

  /* 场景族池：随系统故障目录派生（单一来源）——FL-001 的 load_step 已按 O-13 删除，
     其盲测池自动收缩为 sensor_drift/actuator_fault；GT-001/FC-001 目录不变。 */
  function familyPool(systemId) {
    try {
      var fams = (FL.systems.get(systemId).faults || []).map(function (f) { return f.family; });
      if (fams.length) return fams;
    } catch (e) { /* 目录不可用时回退全局序 */ }
    return FAMILY_ORDER;
  }

  function buildScenario(systemId, setup, rng, roundNo) {
    var base = clone(FL.systems.defaultConfig(systemId));
    var duration = base.duration_s || 60;
    /* 固定抽样顺序，保证同 seed 的随机流稳定 */
    var healthRoll = rng();
    var familyRoll = rng();
    var feedbackRoll = rng();
    var timeRoll = rng();
    var magnitudeRoll = rng();

    var healthy = healthRoll < HEALTHY_RATIO;
    var pool = familyPool(systemId);
    var family = healthy ? 'none' : pool[Math.min(pool.length - 1, Math.floor(familyRoll * pool.length))];
    var feedbackMode = feedbackRoll < 0.5 ? 'closed_loop' : 'monitor';
    var faultDef = null;
    var faultId = null;
    var magnitude = 0;
    var unit = '';
    var tStart = null;
    if (!healthy) {
      try { faultDef = FL.systems.fault(systemId, family); } catch (e) { faultDef = null; }
      if (!faultDef) throw new Error('系统 ' + systemId + ' 缺少故障家族 ' + family);
      faultId = faultDef.id;
      magnitude = magnitudeFromRoll(magnitudeRoll, faultDef);
      unit = faultDef.params && faultDef.params[0] ? faultDef.params[0].unit : '';
      var range = Array.isArray(faultDef.timeRange) ? faultDef.timeRange : [2, 55];
      var lo = Math.max(0.1, isNum(range[0]) ? range[0] : 2);
      var hi = Math.min(isNum(range[1]) ? range[1] : 55, Math.max(lo, duration - 8));
      tStart = round(lo + timeRoll * Math.max(0, hi - lo), 1);
    }

    var config = base;
    config.feedback_mode = feedbackMode;
    config.initial = clone(config.initial || { load_kW: 30, SOC_pct: 60 });
    config.noise = {
      enabled: !!setup.noise,
      seed: (setup.seed + roundNo * 7919) >>> 0,
      level: setup.noise ? 1 : 0
    };
    if (healthy) {
      config.fault = { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } };
    } else {
      config.fault = { family: family, faultId: faultId, t_start_s: tStart, params: { magnitude: magnitude } };
    }
    return {
      config: config,
      healthy: healthy,
      family: family,
      faultDef: faultDef,
      faultId: faultId,
      magnitude: healthy ? null : magnitude,
      unit: unit,
      tStart: tStart,
      feedbackMode: feedbackMode,
      expectedComponent: healthy ? 'none' : ((FL.systems.get(systemId).faultAnchors || {})[family] || 'none')
    };
  }

  /* 小样本覆盖保护：rounds>=3 时若随机结果没有任何健康局，把中间一轮替换为健康局，
     让「误报计数」在演示与自测中有数据可查；不改变其余轮次的随机流。 */
  function makeHealthyScenario(systemId, setup, roundNo, feedbackMode) {
    var base = clone(FL.systems.defaultConfig(systemId));
    base.feedback_mode = feedbackMode || 'closed_loop';
    base.noise = {
      enabled: !!setup.noise,
      seed: (setup.seed + roundNo * 7919) >>> 0,
      level: setup.noise ? 1 : 0
    };
    base.fault = { family: 'none', faultId: null, t_start_s: 20, params: { magnitude: 0 } };
    return {
      config: base,
      healthy: true,
      family: 'none',
      faultDef: null,
      faultId: null,
      magnitude: null,
      unit: '',
      tStart: null,
      feedbackMode: base.feedback_mode,
      expectedComponent: 'none'
    };
  }

  /* 场景集合生成（含覆盖保护；rng 消耗顺序与 arena.js 原实现一致） */
  function buildScenarioSet(systemId, setup, rng) {
    var scenarios = [];
    var i;
    for (i = 0; i < setup.rounds; i++) scenarios.push(buildScenario(systemId, setup, rng, i));
    if (setup.rounds >= 3 && scenarios.every(function (s) { return !s.healthy; })) {
      var target = Math.floor(setup.rounds / 2);
      scenarios[target] = makeHealthyScenario(systemId, setup, target, scenarios[target].feedbackMode);
    }
    return scenarios;
  }

  /* 评分用真值由「本轮隐藏场景」直接构造；不读取运行对象中的真值字段，
     也不把任何真值写进盲观测流或导出包。 */
  function deriveTruth(scenario, run) {
    var healthy = scenario.healthy;
    var family = healthy ? 'none' : scenario.family;
    var component = healthy ? 'none' : scenario.expectedComponent;
    var magnitude = null;
    if (!healthy && isNum(scenario.magnitude)) {
      magnitude = { value: round(scenario.magnitude, 6), unit: scenario.unit || '' };
    }
    var sys = (function () { try { return FL.systems.get(scenario.config.systemId); } catch (e) { return null; } })();
    var comps = sys && sys.components ? sys.components : [];
    var componentLabel = component;
    comps.forEach(function (c) { if (c.id === component) componentLabel = c.label || c.id; });
    return {
      faultFamily: family,
      faultFamilyLabel: healthy ? '健康局' : (FAMILY_LABELS[family] || family),
      faultId: healthy ? null : scenario.faultId,
      component: component,
      componentLabel: healthy ? '无' : componentLabel,
      magnitude: magnitude,
      t_fault: healthy ? null : scenario.tStart,
      healthy: healthy,
      none: healthy,
      feedbackMode: healthy ? 'healthy' : scenario.feedbackMode,
      active_s: healthy ? 0 : round(((run.config && run.config.duration_s) || 60) - (scenario.tStart || 0), 1),
      detectedAt: null
    };
  }

  /* ---- 盲观测流（三重过滤，协议 §5.3；arena.js 与生成器共用） ---- */
  function blindObservables(run) {
    var out = [];
    (run && run.signals ? run.signals : []).forEach(function (sig) {
      if (!sig || typeof sig.id !== 'string') return;
      if (sig.blindVisible !== true) return;
      if (sig.sourceKind === 'FAULT_EVENT' || sig.sourceKind === 'MODEL_STATE') return;
      if (BLIND_ID_RE.test(sig.id)) return;
      out.push({ id: sig.id, label: sig.label || sig.id, unit: sig.unit || '' });
    });
    return out;
  }

  function buildSamples(run, observables) {
    var series = run && run.timeseries && run.timeseries.t ? run.timeseries.t : [];
    var signals = run && run.timeseries ? run.timeseries.signals || {} : {};
    var rows = [];
    for (var i = 0; i < series.length; i++) {
      var row = [series[i]];
      for (var j = 0; j < observables.length; j++) {
        var arr = signals[observables[j].id];
        row.push(arr && isNum(arr[i]) ? arr[i] : null);
      }
      rows.push(row);
    }
    return rows;
  }

  /* ---- §6.3 变化点候选（观测派生等价物；sr1 冻结算法） ----
     逐通道：一阶差分 d_i，取中位数 med；稳健 σ=1.4826·MAD(|d−med|)；
     候选=|d_i−med|>5σ 且 >1e-9（对差分中位数的偏离——平滑斜坡/SOC 类通道的
     MAD 不会坍缩为把缓变误报为突变）；相邻候选合并取首个。
     健康局假候选率必须经测量并公布后 deriveChangePoints 才可用于对外口径（QP-4，
     测量程序见 tests/arena-protocol-negative.test.js 尾段）。 */
  function deriveChangePoints(samples, observables) {
    var out = [];
    if (!Array.isArray(samples) || samples.length < 3) return out;
    for (var j = 0; j < observables.length; j++) {
      var id = observables[j].id;
      var diffs = [];
      var i;
      for (i = 0; i < samples.length - 1; i++) {
        var a = samples[i][j + 1], b = samples[i + 1][j + 1];
        diffs.push(isNum(a) && isNum(b) ? b - a : 0);
      }
      var sorted = diffs.slice().sort(function (x, y) { return x - y; });
      var med = sorted[Math.floor(sorted.length / 2)];
      var absd = diffs.map(function (x) { return Math.abs(x - med); }).sort(function (x, y) { return x - y; });
      var sigma = 1.4826 * absd[Math.floor(absd.length / 2)];
      var thr = Math.max(5 * sigma, 1e-9);
      var lastIdx = -3;
      for (i = 0; i < diffs.length; i++) {
        if (Math.abs(diffs[i] - med) > thr) {
          if (i - lastIdx > 1) {
            out.push({ t: round(SR1.dt_s * (i + 1), 1), observableId: id, delta: round(diffs[i], 6) });
          }
          lastIdx = i;
        }
      }
    }
    out.sort(function (x, y) { return x.t - y.t; });
    return out;
  }

  /* ===================================================================
   * ③ 盲包 v2 构造（closed-world 白名单；零墙钟字段）
   * =================================================================== */
  function roundPart(index, observables, samples) {
    return {
      index: index,                       /* 1-based（协议 §5.1） */
      dt_s: SR1.dt_s,
      duration_s: SR1.duration_s,
      observables: observables.map(function (o) { return { id: o.id, label: o.label, unit: o.unit }; }),
      samples: samples
    };
  }

  function buildBundleV2(opts) {
    var o = opts || {};
    if (!Array.isArray(o.rounds) || !o.rounds.length) {
      throw aeError('AE-E11', 'rounds', '至少需要一轮', '检查生成器输入');
    }
    var rounds = o.rounds.map(function (r) {
      if (!isNum(r.index) || r.index < 1 || Math.floor(r.index) !== r.index) {
        throw aeError('AE-E07', 'rounds.index', 'round.index 必须是从 1 开始的整数', '检查生成器输入');
      }
      return roundPart(r.index, r.observables, r.samples);
    });
    var bundle = {
      schema: rounds.length === 1 ? SCHEMA_ROUND : SCHEMA_MATCH,
      bundle_kind: 'arena_blind',
      arena_version: PROTOCOL_VERSION,
      systemId: String(o.systemId || 'FL-001'),
      testset_id: o.testsetId || newTestsetId(o.systemId || 'FL-001', rounds.length),
      match_id: o.matchId || newMatchId(),
      scenario_rules: o.scenarioRules || SR1.scenario_rules,
      scoring_rules: 'v2'
    };
    if (rounds.length === 1) bundle.round = rounds[0];
    else bundle.rounds = rounds;
    return bundle;
  }

  /* reveal（组织方保管件；赛后公布。含真值，绝不入盲包） */
  function buildRevealV2(opts) {
    return {
      schema: SCHEMA_REVEAL,
      testset_id: opts.testsetId,
      match_id: opts.matchId,
      set_seed: opts.seed,
      mapping: opts.mapping,             /* [{match_id, round, truth}] */
      scenario_rules: SR1.scenario_rules,
      scoring_rules_spec: 'v2',
      engine_version: (FL.core && FL.core.ENGINE_VERSION) || null,
      model_version: (function () { try { return FL.systems.get(opts.systemId).model.model_version; } catch (e) { return null; } })(),
      generated_at: new Date().toISOString()   /* reveal 非计分哈希输入，允许墙钟 */
    };
  }

  /* ===================================================================
   * 校验链 V-01…V-06b（V-00 先行；判定顺序见协议 §6.2 表）
   * =================================================================== */
  function roundsOf(bundle) {
    if (bundle.round) return [bundle.round];
    if (Array.isArray(bundle.rounds)) return bundle.rounds;
    return null;
  }

  function validateBundleV2(bundle, opts) {
    var o = opts || {};
    if (!isPlainObj(bundle)) throw aeError('AE-E01', '$', '盲包必须是 JSON 对象', '检查分发文件');
    /* V-00 结构上限 */
    if (o.rawBytes != null && o.rawBytes > MAX_BYTES) {
      throw aeError('AE-E15', '$', '包体超过上限 ' + MAX_BYTES + ' 字节', '防体积炸弹');
    }
    measureDepth(bundle);
    /* V-01 schema/bundle_kind/版本 */
    if (bundle.schema !== SCHEMA_ROUND && bundle.schema !== SCHEMA_MATCH) {
      throw aeError('AE-E01', 'schema', '盲包 schema 必须是 ' + SCHEMA_ROUND + ' 或 ' + SCHEMA_MATCH +
        '，收到 ' + JSON.stringify(bundle.schema), 'v2 专用校验；v1 演示包不属本协议管辖');
    }
    if (bundle.arena_version !== PROTOCOL_VERSION) {
      throw aeError('AE-E01', 'arena_version', 'arena_version 必须是 "' + PROTOCOL_VERSION + '"', '检查分发文件');
    }
    if (bundle.bundle_kind === 'arena_blind_open_seed') {
      throw aeError('AE-E03', 'bundle_kind', 'open_seed 包不得进入计分轨（种子公开=真值可复算，LEAK-1）',
        'open_seed 仅限演示并标注不计分');
    }
    if (bundle.bundle_kind !== 'arena_blind') {
      throw aeError('AE-E01', 'bundle_kind', 'bundle_kind 必须是 "arena_blind"', '检查分发文件');
    }
    if (bundle.scoring_rules !== 'v2') throw aeError('AE-E01', 'scoring_rules', 'scoring_rules 必须是 "v2"', '检查分发文件');
    if (typeof bundle.systemId !== 'string' || !bundle.systemId) throw aeError('AE-E01', 'systemId', '缺少 systemId', '检查分发文件');
    /* V-01/§5.6 标识符纪律 */
    if (typeof bundle.testset_id !== 'string' || !TESTSET_ID_RE.test(bundle.testset_id)) {
      throw aeError('AE-E13', 'testset_id', 'testset_id 非法（须 arena2-<系统>-<轮数>-<8位独立随机串>）：' +
        JSON.stringify(bundle.testset_id), '末段不得含可枚举种子材料（LEAK-1）');
    }
    if (Array.isArray(o.approvedTestsetIds) && o.approvedTestsetIds.indexOf(bundle.testset_id) < 0) {
      throw aeError('AE-E13', 'testset_id', 'testset_id 不在本场批准清单内：' + bundle.testset_id,
        '测试集标识须与组织方 reveal 一致');
    }
    if (typeof bundle.match_id !== 'string' || !UUID_V4_RE.test(bundle.match_id)) {
      throw aeError('AE-E14', 'match_id', 'match_id 必须是 opaque UUIDv4（禁 v1 式内嵌种子值格式）', '检查分发文件');
    }
    /* V-02 键名禁词（并集） */
    var hits = scanSealedKeys(bundle, '$', [], 0);
    if (hits.length) throw aeError('AE-E02', hits[0], '键名禁词命中：' + hits.slice(0, 5).join('、'), '盲包零真值（键名扫描）');
    /* V-03 语义禁项 */
    var sem = scanSemanticKeys(bundle, '$', [], 0);
    if (sem.length) {
      throw aeError(sem[0].code, sem[0].path,
        sem[0].code === 'AE-E03' ? '盲包携带种子/噪声类字段（LEAK-1：真值可确定性复算）'
          : '盲包携带事件/注入时刻类字段（LEAK-2）',
        '盲包零真值（语义禁项）');
    }
    /* 轮次结构 */
    var rounds = roundsOf(bundle);
    if (!rounds || !rounds.length || rounds.length > 12) {
      throw aeError('AE-E07', 'round(s)', '轮次数须为 1–12', '检查分发文件');
    }
    var seenIdx = {};
    var allowedObs = null;
    if (FL.systems) {
      var sysKnown = null;
      try { sysKnown = FL.systems.get(bundle.systemId); } catch (e) { sysKnown = null; }
      if (!sysKnown) {
        throw aeError('AE-E01', 'systemId', '未知系统：' + bundle.systemId, '系统目录（scenario_rules 冻结）内不存在');
      }
      allowedObs = {};
      (sysKnown.signals || []).forEach(function (sg) {
        if (sg.exposure === 'blind_observable' && sg.sourceKind !== 'FAULT_EVENT' && sg.sourceKind !== 'MODEL_STATE'
          && !BLIND_ID_RE.test(sg.id)) allowedObs[sg.id] = true;
      });
      if (!Object.keys(allowedObs).length) {
        throw aeError('AE-E06', 'observables', '系统 ' + bundle.systemId + ' 无可用盲观测通道', '检查系统目录');
      }
    }
    for (var r = 0; r < rounds.length; r++) {
      var rd = rounds[r];
      /* V-06b 前置说明：round 内键的白名单在 V-06b 统一查；此处先做网格/数值/观测 */
      if (!isNum(rd.index) || rd.index < 1 || Math.floor(rd.index) !== rd.index || seenIdx[rd.index]) {
        throw aeError('AE-E07', 'rounds[' + r + '].index', 'round.index 必须是从 1 开始且不重复的整数', '协议 §5.1（1-based）');
      }
      seenIdx[rd.index] = true;
      /* V-04a 网格与点数（sr1 冻结常量；t[i]≈i·dt 带 1e-9 容差） */
      if (rd.dt_s !== SR1.dt_s || rd.duration_s !== SR1.duration_s) {
        throw aeError('AE-E07', 'rounds[' + r + ']', 'sr1 冻结 dt_s=' + SR1.dt_s + ' ∧ duration_s=' + SR1.duration_s, '协议 §3');
      }
      if (!Array.isArray(rd.samples) || rd.samples.length !== SR1.n_samples) {
        throw aeError('AE-E07', 'rounds[' + r + '].samples', '采样点应为 ' + SR1.n_samples + '（sr1：60 s / 0.1 s）',
          '点数由 duration/dt 派生');
      }
      if (!Array.isArray(rd.observables) || !rd.observables.length || rd.observables.length > 32) {
        throw aeError('AE-E06', 'rounds[' + r + '].observables', '观测通道须为 1–32 条', '协议 §5.3');
      }
      /* V-05 观测白名单（值级 id） */
      var seenObs = {};
      for (var q = 0; q < rd.observables.length; q++) {
        var ob = rd.observables[q];
        if (!isPlainObj(ob) || typeof ob.id !== 'string' || !ob.id) {
          throw aeError('AE-E06', 'rounds[' + r + '].observables[' + q + ']', '观测通道必须是 {id,label,unit}', '协议 §5.1');
        }
        if (BLIND_ID_RE.test(ob.id)) {
          throw aeError('AE-E02', 'rounds[' + r + '].observables[' + q + '].id', '观测通道 id 命中禁词：' + ob.id, '盲包零真值');
        }
        if (seenObs[ob.id]) throw aeError('AE-E06', 'rounds[' + r + '].observables[' + q + '].id', '观测通道重复：' + ob.id, '协议 §5.3');
        seenObs[ob.id] = true;
        if (allowedObs && !allowedObs[ob.id]) {
          throw aeError('AE-E06', 'rounds[' + r + '].observables[' + q + '].id',
            '观测通道越权（非白名单盲观测通道）：' + ob.id, '通道目录随 scenario_rules 冻结');
        }
      }
      /* V-04a 时间网格 + V-04b 数值完整性（null 允许：可选通道缺失） */
      for (var i = 0; i < rd.samples.length; i++) {
        var row = rd.samples[i];
        if (!Array.isArray(row) || row.length !== rd.observables.length + 1) {
          throw aeError('AE-E07', 'rounds[' + r + '].samples[' + i + ']', '行长度须为 observables+1', '列序=observables 顺序');
        }
        var t = row[0];
        if (!isNum(t)) throw aeError('AE-E07', 'rounds[' + r + '].samples[' + i + '][0]', '时间必须为数值', 'V-04a');
        if (i > 0 && !(t > rd.samples[i - 1][0])) {
          throw aeError('AE-E07', 'rounds[' + r + '].samples[' + i + '][0]', '时间必须严格单调递增', 'V-04a');
        }
        if (Math.abs(t - i * SR1.dt_s) > 1e-9) {
          throw aeError('AE-E07', 'rounds[' + r + '].samples[' + i + '][0]', '时间网格须 t[i]≈i·dt（容差 1e-9）', 'V-04a');
        }
        for (var j = 1; j < row.length; j++) {
          var v = row[j];
          if (v === null) continue;
          if (!isNum(v)) throw aeError('AE-E10', 'rounds[' + r + '].samples[' + i + '][' + j + ']', '样本须为有限数值或 null（禁字符串/NaN/Infinity）', 'V-04b');
          if (Math.abs(v) > 1e9) throw aeError('AE-E10', 'rounds[' + r + '].samples[' + i + '][' + j + ']', '样本超阈值 1e9', 'V-04b');
        }
      }
    }
    /* V-06 包类型互斥（先于 closed-world 兜底） */
    var memberHits = scanBundleMembers(bundle, '$', [], 0);
    if (memberHits.length) {
      throw aeError('AE-E09', memberHits[0], '盲包携带证据包 v1 成员字段（包类型互斥，§5.5）', 'demo 包与 blind 包互斥');
    }
    /* V-06b closed-world（键精确匹配） */
    Object.keys(bundle).forEach(function (k) {
      if (TOP_WHITELIST.indexOf(k) < 0) throw aeError('AE-E08', '$.' + k, '未知字段（closed-world 白名单外）', '未注册字段一律拒收');
    });
    rounds.forEach(function (rd, ri) {
      Object.keys(rd).forEach(function (k) {
        if (ROUND_WHITELIST.indexOf(k) < 0) throw aeError('AE-E08', 'rounds[' + ri + '].' + k, '未知字段（closed-world）', '未注册字段一律拒收');
      });
      rd.observables.forEach(function (ob, qi) {
        Object.keys(ob).forEach(function (k) {
          if (OBS_WHITELIST.indexOf(k) < 0) throw aeError('AE-E08', 'rounds[' + ri + '].observables[' + qi + '].' + k, '未知字段（closed-world）', '未注册字段一律拒收');
        });
      });
    });
    return { ok: true, rounds: rounds.length };
  }

  /* ===================================================================
   * ④ 提交绑定校验 + 评分落章（V-07…V-10；评分复用 FL.arena.scoreDiagnosis）
   * =================================================================== */
  function validateSubmissionV2(sub, bundle) {
    if (!isPlainObj(sub)) throw aeError('AE-E11', '$', '提交必须是 JSON 对象', '检查提交文件');
    if (sub.protocol !== 'v2') throw aeError('AE-E11', 'protocol', '提交必须锚定 protocol:"v2"', '协议 §6.1');
    if (sub.testset_id !== bundle.testset_id || sub.match_id !== bundle.match_id) {
      throw aeError('AE-E14', 'testset_id/match_id', '提交与盲包绑定不一致（防跨包重放）', '提交须携带所附盲包的 testset_id/match_id');
    }
    if (!FL.arena || typeof FL.arena.parseExternalBundle !== 'function') {
      throw aeError('AE-E11', '$', '评测器环境缺少 FL.arena（请先加载 src/agents/arena.js）', '检查加载顺序');
    }
    var parsed = FL.arena.parseExternalBundle(sub);
    if (!parsed.ok) {
      var e0 = parsed.errors[0] || { path: '$', message: '提交格式无效' };
      throw aeError('AE-E11', e0.path, e0.message, '按 AGENT_PROTOCOL §4 校验规则修正');
    }
    var parsedRounds = parsed.data.rounds;
    for (var i = 0; i < parsedRounds.length; i++) {
      if (parsedRounds[i].round > (roundsOf(bundle) || []).length) {
        throw aeError('AE-E14', 'results[' + i + '].round', '提交轮次越界：' + parsedRounds[i].round, 'V-08');
      }
    }
    return parsed.data;
  }

  /* §6.4 评分数值规格（冻结文本；reveal 内嵌、spec 哈希入 score_hash） */
  var SCORING_SPEC_TEXT = [
    'FaultLab 盲评测协议 v2 · 评分数值规格（sr1/v2，冻结 2026-10-30）',
    'scale=100；weights: detection=0.20, family=0.25, component=0.10, magnitude=0.15, latency=0.15, calibration=0.15（Σ=1.00）',
    'falseAlarmPenalty=10；latencyWindow_s=12；healthyRatio=0.2',
    'detection：二值（报警=1/未报警=0；健康局见 healthy_policy）',
    'family/component：二值匹配（faultType===faultFamily；component===component）',
    'magnitude=max(0,1-|估计-真值|/|真值|)，单位一致，缺失记 0',
    'latency=1-max(0,detectTime_s-t_fault)/12（未报警记 0）——度量栅格级变更点检测，不代表超出观测数据的信息',
    'calibration=1-(confidence-是否故障)^2（Brier 分量）',
    'healthy_policy：健康局未报警时 detection/family/component/magnitude/latency 记 1（calibration 照常）；误报扣 10',
    'round_score=round(100*Σ(weights*分项)-10*falseAlarm,1)，下限 0；场总分=各轮平均 round(…,1)；十进制半向上；分项 4 位小数十进制串入哈希',
    '展示名：报警/家族/部件/幅值/时刻/calibration（Brier 分项）；本评分为合成故障评测游戏，非真实诊断性能'
  ].join('\n');

  function scoringRulesSpecHash() {
    requireCore();
    return FL.core.hashString(SCORING_SPEC_TEXT);
  }
  function requireCore() {
    if (!FL.core || typeof FL.core.hashObjectStrict !== 'function') {
      throw aeError('AE-E12', '$', '评测器环境缺少 FL.core 规范化哈希（请先加载 src/core/hash.js）', '检查加载顺序');
    }
  }

  /* V-09/V-10：评分 + 成绩单落章。reveal.mapping 提供 match_id+round → truth。 */
  function scoreV2(parts) {
    requireCore();
    var p = parts || {};
    var bundle = p.bundle, submission = p.submission, reveal = p.reveal;
    var subData = validateSubmissionV2(submission, bundle);
    if (!isPlainObj(reveal) || reveal.schema !== SCHEMA_REVEAL || reveal.testset_id !== bundle.testset_id) {
      throw aeError('AE-E12', 'reveal', 'reveal 包缺失/不匹配（评分需要组织方映射）', 'Verifier 持有 reveal（协议 §7）');
    }
    var rounds = roundsOf(bundle);
    var outRounds = [];
    var sum = 0;
    for (var i = 0; i < subData.rounds.length; i++) {
      var item = subData.rounds[i];
      var rd = null;
      for (var k = 0; k < rounds.length; k++) if (rounds[k].index === item.round) rd = rounds[k];
      if (!rd) throw aeError('AE-E14', 'results[' + i + '].round', '提交轮次 ' + item.round + ' 不在盲包内', 'V-08');
      var mapHit = null;
      (reveal.mapping || []).forEach(function (m) {
        if (m.match_id === bundle.match_id && m.round === item.round) mapHit = m;
      });
      if (!mapHit || !isPlainObj(mapHit.truth)) {
        throw aeError('AE-E12', 'reveal.mapping', '缺少第 ' + item.round + ' 轮真值映射', '组织方 reveal 数据不全');
      }
      var score = FL.arena.scoreDiagnosis(mapHit.truth, item.diagnosis);
      sum += score.total;
      outRounds.push({
        index: item.round,
        detection: score.detection.toFixed(4),
        family: score.family.toFixed(4),
        component: score.component.toFixed(4),
        magnitude: score.magnitude.toFixed(4),
        latency: score.latency.toFixed(4),
        calibration: score.calibration.toFixed(4),
        falseAlarm: score.falseAlarm,
        round_score: score.total.toFixed(1)
      });
    }
    var avg = round(sum / outRounds.length, 1);
    var hashInput = {
      blind_sha256: String(p.blindSha256 || ''),
      submission_sha256: String(p.submissionSha256 || ''),
      scoring_rules_spec_hash: scoringRulesSpecHash(),
      rounds: outRounds
    };
    return {
      schema: SCHEMA_SCORE,
      bundle_kind: bundle.bundle_kind,
      testset_id: bundle.testset_id,
      match_id: bundle.match_id,
      scoring_rules: 'v2',
      notice: '合成故障评测游戏，非真实诊断性能',
      rounds: outRounds,
      avg_score: avg,
      score_hash: FL.core.hashObjectStrict(hashInput)
    };
  }

  FL.arenaProtocol = {
    PROTOCOL_VERSION: PROTOCOL_VERSION,
    SR1: SR1,
    FAMILY_ORDER: FAMILY_ORDER,
    FAMILY_LABELS: FAMILY_LABELS,
    HEALTHY_RATIO: HEALTHY_RATIO,
    SCORING_SPEC_TEXT: SCORING_SPEC_TEXT,
    scoringRulesSpecHash: scoringRulesSpecHash,
    BLIND_KEY_RE: BLIND_KEY_RE,
    BLIND_ID_RE: BLIND_ID_RE,
    aeError: aeError,
    newTestsetId: newTestsetId,
    newMatchId: newMatchId,
    buildScenario: buildScenario,
    buildScenarioSet: buildScenarioSet,
    makeHealthyScenario: makeHealthyScenario,
    magnitudeFromRoll: magnitudeFromRoll,
    deriveTruth: deriveTruth,
    blindObservables: blindObservables,
    buildSamples: buildSamples,
    deriveChangePoints: deriveChangePoints,
    buildBundleV2: buildBundleV2,
    buildRevealV2: buildRevealV2,
    validateBundleV2: validateBundleV2,
    validateSubmissionV2: validateSubmissionV2,
    scoreV2: scoreV2
  };
})();
