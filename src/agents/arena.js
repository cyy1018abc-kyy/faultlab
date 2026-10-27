/* owner: arena-agents | module: arena | contract: docs/CONTRACT.md */
/* =========================================================================
   FaultLab — Agent Arena 引擎
   隐藏场景生成（seeded）→ FL.core.simulate → 盲观测流回放 → 逐 Agent 诊断 → 评分
   真值只用于比赛结束后的揭晓与评分；盲观测流与导出包不含任何真值/故障通道。
   所有随机性来自 FL.rng.mulberry32(seed)：同 setup + seed 结果逐字节可复现。
   ========================================================================= */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const ARENA_VERSION = '0.1';
  const ARENA = FL.arena = FL.arena || {};

  const FAMILY_ORDER = ['sensor_drift', 'load_step', 'actuator_fault'];
  const FAMILY_LABELS = {
    sensor_drift: '传感器漂移',
    load_step: '负载冲击',
    actuator_fault: '执行器异常',
    none: '健康'
  };
  const HEALTHY_RATIO = 0.2;

  const WEIGHTS = {
    detection: 0.20,
    family: 0.25,
    component: 0.10,
    magnitude: 0.15,
    latency: 0.15,
    calibration: 0.15
  };
  const FALSE_ALARM_PENALTY = 10;
  const LATENCY_WINDOW_S = 12;

  const SCORING_SPEC = {
    arena_version: ARENA_VERSION,
    scale: 100,
    weights: WEIGHTS,
    falseAlarmPenalty: FALSE_ALARM_PENALTY,
    latencyWindow_s: LATENCY_WINDOW_S,
    healthyRatio: HEALTHY_RATIO,
    magnitude_rule: 'max(0, 1 − |估计值 − 真值| / |真值|)，单位必须一致；缺失幅值记 0',
    calibration_rule: '1 − (confidence − 是否故障)²，即 1 − Brier 分量',
    healthy_policy: '健康局：未报警时 detection/family/component/magnitude/latency 均记 1；误报记 falseAlarm=1 并扣 10 分',
    round_score: '0–100，最低 0；赛内排行榜取各轮平均分'
  };

  /* ---------------------------------------------------------------- util */
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function round(v, d) {
    if (!isNum(v)) return v;
    const p = Math.pow(10, d == null ? 2 : d);
    return Math.round(v * p) / p;
  }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function deepFreeze(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    Object.keys(obj).forEach((k) => deepFreeze(obj[k]));
    return Object.freeze(obj);
  }
  function nowIso() { try { return new Date().toISOString(); } catch (e) { return null; } }

  function requireAPIs() {
    if (!FL.core || typeof FL.core.simulate !== 'function') {
      throw new Error('核心引擎 FL.core.simulate 尚未就绪，无法开始盲测。');
    }
    if (!FL.systems || typeof FL.systems.get !== 'function' || typeof FL.systems.defaultConfig !== 'function') {
      throw new Error('系统模型 FL.systems 尚未就绪，无法开始盲测。');
    }
    if (!FL.agents || typeof FL.agents.list !== 'function' || typeof FL.agents.create !== 'function') {
      throw new Error('诊断 Agent 套件 FL.agents 尚未就绪。');
    }
    if (FL.rng && typeof FL.rng.mulberry32 !== 'function') {
      throw new Error('确定性随机数 FL.rng.mulberry32 尚未就绪。');
    }
  }

  function agentCatalog() {
    try { return FL.agents.list() || []; } catch (e) { return []; }
  }

  function listAgents() {
    return agentCatalog().map((a) => ({
      id: a.id, name: a.name, family: a.family,
      description: a.description, strengths: a.strengths, weaknesses: a.weaknesses
    }));
  }

  function normalizeSetup(setup) {
    const s = setup || {};
    const systemId = s.systemId || 'FL-001';
    let sys = null;
    try { sys = FL.systems.get(systemId); } catch (e) { sys = null; }
    if (!sys) throw new Error('未知系统：' + systemId);
    const roundsRaw = s.rounds == null ? 6 : parseInt(s.rounds, 10);
    const rounds = clamp(isFinite(roundsRaw) ? roundsRaw : 6, 1, 12);
    let seed = s.seed == null ? 20261027 : parseInt(s.seed, 10);
    if (!isFinite(seed)) seed = 20261027;
    if (seed < 0) seed = -seed;
    const noise = !!s.noise;
    const available = agentCatalog().map((a) => a.id);
    let agentIds = Array.isArray(s.agentIds) ? s.agentIds.slice() : [];
    agentIds = agentIds.filter((id) => available.indexOf(id) >= 0);
    if (!agentIds.length) agentIds = available.slice();
    if (!agentIds.length) throw new Error('没有可用的诊断 Agent。');
    return { systemId, rounds, seed, noise, agentIds };
  }

  /* ------------------------------------------------------------- scenario */
  function pickFamily(rng) {
    const i = Math.min(2, Math.floor(rng() * 3));
    return FAMILY_ORDER[i];
  }

  /* 用已抽取的 [0,1) 直接完成幅值离散化（保持一次抽取的顺序） */
  function magnitudeFromRoll(roll, faultDef) {
    const p = faultDef && faultDef.params && faultDef.params[0] ? faultDef.params[0] : null;
    if (!p) return 10;
    const step = isNum(p.step) && p.step > 0 ? p.step : 1;
    const min = isNum(p.min) ? p.min : 0;
    const max = isNum(p.max) ? p.max : min + 10 * step;
    const count = Math.max(1, Math.floor((max - min) / step) + 1);
    const idx = Math.min(count - 1, Math.floor(roll * count));
    return round(min + idx * step, 6);
  }

  function buildScenario(systemId, setup, rng, roundNo) {
    const base = clone(FL.systems.defaultConfig(systemId));
    const duration = base.duration_s || 60;
    // 固定抽样顺序，保证同 seed 的随机流稳定
    const healthRoll = rng();
    const familyRoll = rng();
    const feedbackRoll = rng();
    const timeRoll = rng();
    const magnitudeRoll = rng();

    const healthy = healthRoll < HEALTHY_RATIO;
    const family = healthy ? 'none' : FAMILY_ORDER[Math.min(2, Math.floor(familyRoll * 3))];
    const feedbackMode = feedbackRoll < 0.5 ? 'closed_loop' : 'monitor';
    let faultDef = null;
    let faultId = null;
    let magnitude = 0;
    let unit = '';
    let tStart = null;
    if (!healthy) {
      try { faultDef = FL.systems.fault(systemId, family); } catch (e) { faultDef = null; }
      if (!faultDef) throw new Error('系统 ' + systemId + ' 缺少故障家族 ' + family);
      faultId = faultDef.id;
      magnitude = magnitudeFromRoll(magnitudeRoll, faultDef);
      unit = faultDef.params && faultDef.params[0] ? faultDef.params[0].unit : '';
      const range = Array.isArray(faultDef.timeRange) ? faultDef.timeRange : [2, 55];
      const lo = Math.max(0.1, isNum(range[0]) ? range[0] : 2);
      const hi = Math.min(isNum(range[1]) ? range[1] : 55, Math.max(lo, duration - 8));
      tStart = round(lo + timeRoll * Math.max(0, hi - lo), 1);
    }

    const config = base;
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

  /* ---------------------------------------------------------- blind flow */
  const FORBIDDEN_ID = /(^|_)(true|bias|cap)(_|$)/i;

  function blindObservables(run) {
    const out = [];
    (run && run.signals ? run.signals : []).forEach((sig) => {
      if (!sig || typeof sig.id !== 'string') return;
      if (sig.blindVisible !== true) return;
      if (sig.sourceKind === 'FAULT_EVENT' || sig.sourceKind === 'MODEL_STATE') return;
      if (FORBIDDEN_ID.test(sig.id)) return;
      out.push({ id: sig.id, label: sig.label || sig.id, unit: sig.unit || '' });
    });
    return out;
  }

  function buildSamples(run, observables) {
    const series = run && run.timeseries && run.timeseries.t ? run.timeseries.t : [];
    const signals = run && run.timeseries ? run.timeseries.signals || {} : {};
    const rows = [];
    for (let i = 0; i < series.length; i++) {
      const row = [series[i]];
      for (let j = 0; j < observables.length; j++) {
        const arr = signals[observables[j].id];
        row.push(arr && isNum(arr[i]) ? arr[i] : null);
      }
      rows.push(row);
    }
    return rows;
  }

  function buildMeta(systemId, run, observables) {
    const sys = FL.systems.get(systemId);
    const components = (sys.components || []).map((c) => ({ id: c.id, label: c.label || c.id }));
    const famMap = {};
    (sys.faults || []).forEach((f) => {
      if (!f || !f.family) return;
      if (!famMap[f.family]) famMap[f.family] = f.shortLabel || FAMILY_LABELS[f.family] || f.family;
    });
    const faultFamilies = FAMILY_ORDER.map((id) => ({ id: id, label: famMap[id] || FAMILY_LABELS[id] }));
    return {
      systemId: systemId,
      duration_s: (run.config && run.config.duration_s) || sys.duration_s || 60,
      dt_s: (run.config && run.config.dt_s) || sys.dt_s || 0.1,
      observables: observables,
      components: components,
      faultFamilies: faultFamilies
    };
  }

  function sampleObjects(round, observables) {
    const ids = observables.map((o) => o.id);
    return round.samples.map((row) => {
      const s = {};
      for (let j = 0; j < ids.length; j++) s[ids[j]] = row[j + 1];
      return { t: row[0], s: s };
    });
  }

  /* --------------------------------------------------------------- truth */
  /* 评分用的真值由「本轮隐藏场景」直接构造；不读取运行对象中的真值字段，
     也不把任何真值写进盲观测流或导出包。 */
  function deriveTruth(scenario, run) {
    const healthy = scenario.healthy;
    const family = healthy ? 'none' : scenario.family;
    const component = healthy ? 'none' : scenario.expectedComponent;
    let magnitude = null;
    if (!healthy && isNum(scenario.magnitude)) {
      magnitude = { value: round(scenario.magnitude, 6), unit: scenario.unit || '' };
    }
    const sys = (function () { try { return FL.systems.get(scenario.config.systemId); } catch (e) { return null; } })();
    const comps = sys && sys.components ? sys.components : [];
    let componentLabel = component;
    comps.forEach((c) => { if (c.id === component) componentLabel = c.label || c.id; });
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

  /* -------------------------------------------------------------- scoring */
  function normalizeDiagnosis(input) {
    const d = input && typeof input === 'object' ? input : {};
    const family = typeof d.faultType === 'string' ? d.faultType : 'none';
    let magnitude = null;
    if (d.magnitude && typeof d.magnitude === 'object' && isNum(d.magnitude.value) && d.magnitude.unit != null) {
      magnitude = { value: d.magnitude.value, unit: String(d.magnitude.unit) };
    }
    return {
      faultDetected: d.faultDetected === true,
      faultType: family,
      component: typeof d.component === 'string' ? d.component : 'none',
      magnitude: magnitude,
      detectTime_s: isNum(d.detectTime_s) ? d.detectTime_s : null,
      confidence: clamp(isNum(d.confidence) ? d.confidence : 0, 0, 1),
      explanation: typeof d.explanation === 'string' ? d.explanation : '',
      firstAlarmT: isNum(d.firstAlarmT) ? d.firstAlarmT : (isNum(d.detectTime_s) ? d.detectTime_s : null)
    };
  }

  function scoreDiagnosis(truth, diagnosis) {
    const d = normalizeDiagnosis(diagnosis);
    const isFault = !truth.healthy;
    const detected = d.faultDetected === true;
    const conf = clamp(d.confidence, 0, 1);
    const scores = {
      detection: 0, family: 0, component: 0, magnitude: 0, latency: 0,
      calibration: round(1 - Math.pow(conf - (isFault ? 1 : 0), 2), 4),
      falseAlarm: 0
    };
    if (isFault) {
      if (detected) {
        scores.detection = 1;
        scores.family = d.faultType === truth.faultFamily ? 1 : 0;
        scores.component = d.component === truth.component ? 1 : 0;
        const tm = truth.magnitude;
        const em = d.magnitude;
        if (tm && isNum(tm.value) && tm.value > 0 && em && typeof em.unit === 'string' &&
          em.unit === tm.unit && isNum(em.value)) {
          scores.magnitude = round(clamp(1 - Math.abs(em.value - tm.value) / Math.abs(tm.value), 0, 1), 4);
        } else {
          scores.magnitude = 0;
        }
        const ft = isNum(truth.t_fault) ? truth.t_fault : 0;
        if (isNum(d.detectTime_s)) {
          scores.latency = round(clamp(1 - Math.max(0, d.detectTime_s - ft) / LATENCY_WINDOW_S, 0, 1), 4);
        } else {
          scores.latency = 0;
        }
      }
    } else {
      if (!detected) {
        scores.detection = 1;
        scores.family = 1;
        scores.component = 1;
        scores.magnitude = 1;
        scores.latency = 1;
      } else {
        scores.falseAlarm = 1;
      }
    }
    let raw = 0;
    raw += WEIGHTS.detection * scores.detection;
    raw += WEIGHTS.family * scores.family;
    raw += WEIGHTS.component * scores.component;
    raw += WEIGHTS.magnitude * scores.magnitude;
    raw += WEIGHTS.latency * scores.latency;
    raw += WEIGHTS.calibration * scores.calibration;
    const total = clamp(100 * raw - FALSE_ALARM_PENALTY * scores.falseAlarm, 0, 100);
    return {
      total: round(total, 1),
      detection: round(scores.detection, 4),
      family: round(scores.family, 4),
      component: round(scores.component, 4),
      magnitude: round(scores.magnitude, 4),
      latency: round(scores.latency, 4),
      calibration: round(scores.calibration, 4),
      falseAlarm: scores.falseAlarm,
      raw: round(raw, 4)
    };
  }

  /* ----------------------------------------------------------- leaderboard */
  function aggregateLeaderboard(agentEntries, rounds) {
    const faultRounds = rounds.filter((r) => !r.truth.healthy);
    const healthyRounds = rounds.filter((r) => r.truth.healthy);
    return agentEntries.map((entry) => {
      const results = rounds.map((r) => r.results.filter((x) => x.agentId === entry.id)[0]).filter(Boolean);
      const avgScore = results.length
        ? round(results.reduce((a, b) => a + b.score.total, 0) / results.length, 1) : 0;
      let detectedFaults = 0;
      let latencySum = 0;
      let latencyN = 0;
      let familyCorrect = 0;
      faultRounds.forEach((r) => {
        const res = r.results.filter((x) => x.agentId === entry.id)[0];
        if (!res) return;
        if (res.diagnosis.faultDetected) {
          detectedFaults += 1;
          if (isNum(res.diagnosis.detectTime_s) && isNum(r.truth.t_fault)) {
            latencySum += Math.max(0, res.diagnosis.detectTime_s - r.truth.t_fault);
            latencyN += 1;
          }
          if (res.diagnosis.faultType === r.truth.faultFamily) familyCorrect += 1;
        }
      });
      let falseAlarms = 0;
      healthyRounds.forEach((r) => {
        const res = r.results.filter((x) => x.agentId === entry.id)[0];
        if (res && res.diagnosis.faultDetected) falseAlarms += 1;
      });
      return {
        agentId: entry.id,
        name: entry.name,
        family: entry.family || 'rule-based',
        source: 'builtin',
        avgScore: avgScore,
        detectionRate: faultRounds.length ? round(detectedFaults / faultRounds.length, 4) : null,
        avgLatency: latencyN ? round(latencySum / latencyN, 2) : null,
        falseAlarmRate: healthyRounds.length ? round(falseAlarms / healthyRounds.length, 4) : null,
        familyAcc: faultRounds.length ? round(familyCorrect / faultRounds.length, 4) : null,
        rounds: results.length,
        totalScore: round(results.reduce((a, b) => a + b.score.total, 0), 1)
      };
    });
  }

  /* -------------------------------------------------- deterministic run */
  function deterministicRun(run, roundIndex) {
    let copy;
    try { copy = clone(run); } catch (e) { copy = null; }
    if (!copy) return null;
    const oldId = copy.runId;
    const newId = 'Arena-R' + String(roundIndex + 1).padStart(2, '0');
    // 去掉墙钟相关字段，并把引擎内部递增的 runId 引用统一替换为确定性 id，
    // 保证同 seed 的两场比赛 JSON 完全一致。
    delete copy.createdAt;
    delete copy.startedAt;
    delete copy.durationMs;
    delete copy.truth; // 真值只在 round.truth 中保留一份，run 快照不携带
    copy.runId = newId;
    copy.role = 'arena';
    if (oldId) {
      const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
          for (let i = 0; i < node.length; i++) {
            if (typeof node[i] === 'string' && node[i] === oldId) node[i] = newId;
            else walk(node[i]);
          }
          return;
        }
        Object.keys(node).forEach((k) => {
          if (typeof node[k] === 'string' && node[k] === oldId) node[k] = newId;
          else walk(node[k]);
        });
      };
      walk(copy);
    }
    return copy;
  }

  /* 小样本覆盖保护：rounds>=3 时若随机结果没有任何健康局，把中间一轮替换为健康局，
     让「误报率」在演示与自测中有数据可查；不改变其余轮次的随机流。 */
  function makeHealthyScenario(systemId, setup, roundNo, feedbackMode) {
    const base = clone(FL.systems.defaultConfig(systemId));
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

  /* ------------------------------------------------------------ createMatch */
  function createMatch(setup, opts) {
    requireAPIs();
    const optsObj = opts || {};
    const norm = normalizeSetup(setup);
    const catalog = agentCatalog();
    const entries = catalog.filter((a) => norm.agentIds.indexOf(a.id) >= 0)
      .map((a) => ({ id: a.id, name: a.name, family: a.family }));
    const rng = FL.rng.mulberry32(norm.seed);
    const started = Date.now();
    const startedIso = nowIso();
    const rounds = [];

    // 先生成全部隐藏场景（固定随机流），再做小样本健康局覆盖保护
    const scenarios = [];
    for (let i = 0; i < norm.rounds; i++) scenarios.push(buildScenario(norm.systemId, norm, rng, i));
    if (norm.rounds >= 3 && scenarios.every((s) => !s.healthy)) {
      const target = Math.floor(norm.rounds / 2);
      scenarios[target] = makeHealthyScenario(norm.systemId, norm, target, scenarios[target].feedbackMode);
    }

    for (let i = 0; i < norm.rounds; i++) {
      const scenario = scenarios[i];
      let run;
      try {
        run = FL.core.simulate(scenario.config);
      } catch (e) {
        throw new Error('第 ' + (i + 1) + ' 轮仿真失败：' + (e && e.message ? e.message : e));
      }
      const observables = blindObservables(run);
      if (!observables.length) {
        throw new Error('第 ' + (i + 1) + ' 轮没有可用的盲观测通道，请检查运行信号的 blindVisible 标记。');
      }
      const samples = buildSamples(run, observables);
      if (!samples.length) throw new Error('第 ' + (i + 1) + ' 轮盲观测流为空。');
      const meta = buildMeta(norm.systemId, run, observables);
      const truth = deriveTruth(scenario, run);
      const sampleList = sampleObjects({ samples: samples }, observables);
      const results = entries.map((entry) => {
        let agent = null;
        try {
          agent = FL.agents.create(entry.id, meta);
        } catch (e) {
          throw new Error('Agent ' + entry.id + ' 初始化失败：' + (e && e.message ? e.message : e));
        }
        for (let k = 0; k < sampleList.length; k++) {
          agent.observe(sampleList[k], meta);
        }
        const diagnosis = normalizeDiagnosis(agent.diagnose());
        const score = scoreDiagnosis(truth, diagnosis);
        return {
          agentId: entry.id,
          name: entry.name,
          source: 'builtin',
          diagnosis: diagnosis,
          score: score,
          firstAlarmT: isNum(agent.firstAlarmT) ? round(agent.firstAlarmT, 1) : diagnosis.detectTime_s
        };
      });
      // 本轮最早报警时刻（供揭晓时显示，不属于盲测输入）
      const detectedTimes = results
        .filter((r) => r.diagnosis.faultDetected && isNum(r.diagnosis.detectTime_s))
        .map((r) => r.diagnosis.detectTime_s);
      truth.detectedAt = detectedTimes.length ? round(Math.min.apply(null, detectedTimes), 1) : null;

      rounds.push({
        index: i + 1,
        configHash: run.configHash || null,
        run: deterministicRun(run, i),
        observables: observables,
        samples: samples,
        truth: truth,
        results: results
      });
      if (typeof optsObj.onProgress === 'function') {
        try { optsObj.onProgress({ index: i + 1, rounds: norm.rounds }); } catch (e) { /* ignore */ }
      }
    }

    const leaderboard = aggregateLeaderboard(entries, rounds);
    leaderboard.sort((a, b) => (b.avgScore - a.avgScore) || String(a.agentId).localeCompare(String(b.agentId)));

    const match = {
      arena_version: ARENA_VERSION,
      id: 'Arena-' + norm.systemId + '-S' + norm.seed + '-R' + norm.rounds,
      systemId: norm.systemId,
      setup: clone(norm),
      rounds: rounds,
      leaderboard: leaderboard,
      scoring_spec: SCORING_SPEC
    };
    // 墙钟信息放在不可枚举属性上：可展示，但不参与 JSON 序列化，保证同 seed 逐字节一致
    try {
      Object.defineProperty(match, 'startedAt', { value: startedIso, enumerable: false, configurable: true });
      Object.defineProperty(match, 'durationMs', { value: Math.max(0, Date.now() - started), enumerable: false, configurable: true });
    } catch (e) { /* ignore */ }
    return match;
  }

  /* ------------------------------------------------------------ external */
  function resolveRound(match, roundIndex) {
    if (!match || !Array.isArray(match.rounds)) throw new Error('比赛对象无效。');
    const idx = Number(roundIndex);
    if (!isFinite(idx)) throw new Error('轮次索引无效：' + roundIndex);
    let round = match.rounds.filter((r) => r.index === idx)[0];
    if (!round && idx >= 0 && idx < match.rounds.length) round = match.rounds[idx];
    if (!round) throw new Error('轮次 ' + roundIndex + ' 不存在（共 ' + match.rounds.length + ' 轮）。');
    return round;
  }

  function isPlainObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function validateDiagnosis(raw, path, errors) {
    const d = isPlainObj(raw) ? raw : null;
    if (!d) { errors.push({ path, message: 'diagnosis 必须是对象' }); return null; }
    if (typeof d.faultDetected !== 'boolean') {
      errors.push({ path: path + '.faultDetected', message: '必须是布尔值 true/false' });
    }
    const families = ['sensor_drift', 'load_step', 'actuator_fault', 'none'];
    if (typeof d.faultType !== 'string' || families.indexOf(d.faultType) < 0) {
      errors.push({ path: path + '.faultType', message: '必须是 sensor_drift / load_step / actuator_fault / none 之一' });
    }
    if (d.component != null && typeof d.component !== 'string') {
      errors.push({ path: path + '.component', message: '必须是字符串（部件 id 或 none）' });
    }
    if (d.magnitude != null) {
      if (!isPlainObj(d.magnitude) || !isNum(d.magnitude.value) || typeof d.magnitude.unit !== 'string' || !d.magnitude.unit) {
        errors.push({ path: path + '.magnitude', message: '必须是 { value:number, unit:string } 或 null' });
      }
    }
    if (d.detectTime_s != null && (!isNum(d.detectTime_s) || d.detectTime_s < 0)) {
      errors.push({ path: path + '.detectTime_s', message: '必须是 ≥0 的秒数或 null' });
    }
    if (!isNum(d.confidence) || d.confidence < 0 || d.confidence > 1) {
      errors.push({ path: path + '.confidence', message: '必须是 0–1 之间的数字' });
    }
    if (d.explanation != null && typeof d.explanation !== 'string') {
      errors.push({ path: path + '.explanation', message: '必须是字符串' });
    }
    if (errors.length && errors.some((e) => e.path.indexOf(path) === 0)) return null;
    return {
      faultDetected: d.faultDetected === true,
      faultType: typeof d.faultType === 'string' ? d.faultType : 'none',
      component: typeof d.component === 'string' ? d.component : 'none',
      magnitude: isPlainObj(d.magnitude) && isNum(d.magnitude.value)
        ? { value: d.magnitude.value, unit: String(d.magnitude.unit || '') } : null,
      detectTime_s: isNum(d.detectTime_s) ? d.detectTime_s : null,
      confidence: isNum(d.confidence) ? clamp(d.confidence, 0, 1) : 0,
      explanation: typeof d.explanation === 'string' ? d.explanation : '',
      firstAlarmT: isNum(d.firstAlarmT) ? d.firstAlarmT : (isNum(d.detectTime_s) ? d.detectTime_s : null)
    };
  }

  function parseExternalBundle(input) {
    const errors = [];
    let data = input;
    if (typeof input === 'string') {
      try { data = JSON.parse(input); } catch (e) {
        return { ok: false, errors: [{ path: '$', message: 'JSON 解析失败：' + (e && e.message ? e.message : e) }], data: null };
      }
    }
    let items = null;
    let containerAgentName = null;
    if (Array.isArray(data)) {
      items = data;
    } else if (isPlainObj(data)) {
      if (isPlainObj(data.agent) && (data.agent.name || data.agent.id)) {
        containerAgentName = data.agent.name || data.agent.id;
      } else if (typeof data.agent_name === 'string') {
        containerAgentName = data.agent_name;
      }
      if (Array.isArray(data.results)) items = data.results;
      else if (Array.isArray(data.rounds)) items = data.rounds;
      else items = [data];
    } else {
      return { ok: false, errors: [{ path: '$', message: '需要 JSON 对象或对象数组' }], data: null };
    }
    if (!items.length) {
      return { ok: false, errors: [{ path: '$', message: '没有任何诊断结果' }], data: null };
    }
    const rounds = [];
    const names = [];
    const seen = {};
    items.forEach((item, i) => {
      const path = '$[' + i + ']';
      if (!isPlainObj(item)) { errors.push({ path, message: '每项必须是对象' }); return; }
      if (item.arena_version && item.arena_version !== ARENA_VERSION) {
        errors.push({ path: path + '.arena_version', message: '协议版本不匹配：需要 "' + ARENA_VERSION + '"，收到 "' + item.arena_version + '"' });
        return;
      }
      let roundNo = item.round;
      if (roundNo == null && isPlainObj(item.round) && isNum(item.round.index)) roundNo = item.round.index;
      if (roundNo == null) roundNo = i + 1;
      roundNo = Number(roundNo);
      if (!isFinite(roundNo) || roundNo < 1 || Math.floor(roundNo) !== roundNo) {
        errors.push({ path: path + '.round', message: 'round 必须是从 1 开始的整数' });
        return;
      }
      if (seen[roundNo]) { errors.push({ path: path + '.round', message: '第 ' + roundNo + ' 轮重复提交' }); return; }
      seen[roundNo] = true;
      const agentName = (isPlainObj(item.agent) && (item.agent.name || item.agent.id)) || item.agent_name || containerAgentName || null;
      let diagRaw = item.diagnosis;
      if (!isPlainObj(diagRaw) && typeof item.faultDetected === 'boolean') diagRaw = item;
      const diag = validateDiagnosis(diagRaw, path + '.diagnosis', errors);
      if (!diag) return;
      rounds.push({ round: roundNo, diagnosis: diag, agentName: agentName });
      if (agentName) names.push(agentName);
    });
    if (errors.length) return { ok: false, errors: errors, data: null };
    const uniqueNames = names.filter((v, i) => names.indexOf(v) === i);
    if (uniqueNames.length > 1) {
      return {
        ok: false,
        errors: [{ path: '$[].agent.name', message: '同一文件中的 Agent 名称不一致：' + uniqueNames.join(' / ') }],
        data: null
      };
    }
    rounds.sort((a, b) => a.round - b.round);
    return {
      ok: true,
      errors: [],
      data: {
        arena_version: ARENA_VERSION,
        agentName: uniqueNames[0] || '外部 Agent',
        rounds: rounds
      }
    };
  }

  function scoreExternalDiagnosis(match, roundIndex, diagnosis) {
    const round = resolveRound(match, roundIndex);
    const errors = [];
    const diag = validateDiagnosis(diagnosis, 'diagnosis', errors);
    if (!diag) {
      const err = new Error('外部诊断格式无效：' + errors.map((e) => e.path + ' ' + e.message).join('；'));
      err.errors = errors;
      throw err;
    }
    return scoreDiagnosis(round.truth, diag);
  }

  /* --------------------------------------------------------------- export */
  const FORBIDDEN_KEY = /(^|_)(truth|true|bias|cap)(_|$)|^config$|(^|_)fault($|_)config$/i;

  function scanForbidden(obj, path, hits) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) scanForbidden(obj[i], path + '[' + i + ']', hits);
      return;
    }
    Object.keys(obj).forEach((key) => {
      const low = String(key).toLowerCase();
      if (low !== 'truth_sealed' && FORBIDDEN_KEY.test(low)) {
        hits.push(path + '.' + key);
      }
      scanForbidden(obj[key], path + '.' + key, hits);
    });
  }

  function assertSealed(bundle) {
    const hits = [];
    scanForbidden(bundle, '$', hits);
    if (hits.length) {
      throw new Error('盲测数据包泄漏检查失败，包含可疑字段：' + hits.slice(0, 8).join(', '));
    }
    // 再检查观测 id 本身
    const rounds = bundle.rounds || (bundle.round ? [bundle.round] : []);
    rounds.forEach((r, i) => {
      (r.observables || []).forEach((o) => {
        if (FORBIDDEN_ID.test(o.id)) {
          hits.push('rounds[' + i + '].observables.' + o.id);
        }
      });
    });
    if (hits.length) throw new Error('盲测数据包泄漏检查失败：' + hits.join(', '));
    return true;
  }

  function exportMatchMeta(match) {
    return {
      id: match.id,
      systemId: match.systemId,
      modelVersion: (function () {
        try { return FL.systems.get(match.systemId).model.model_version; } catch (e) { return null; }
      })(),
      seed: match.setup.seed,
      rounds: match.setup.rounds,
      noise: !!match.setup.noise
    };
  }

  function roundBundlePart(round) {
    return {
      index: round.index,
      dt_s: (function (r) {
        const sys = r.run && r.run.config ? r.run.config : null;
        return sys ? sys.dt_s : 0.1;
      })(round),
      duration_s: (function (r) {
        const sys = r.run && r.run.config ? r.run.config : null;
        return sys ? sys.duration_s : 60;
      })(round),
      observables: round.observables.map((o) => ({ id: o.id, label: o.label, unit: o.unit })),
      samples: round.samples
    };
  }

  function exportRoundBundle(match, roundIndex) {
    if (!match || !Array.isArray(match.rounds)) throw new Error('exportRoundBundle: match 无效');
    const round = resolveRound(match, roundIndex);
    const bundle = {
      arena_version: ARENA_VERSION,
      schema: 'faultlab.arena.round.v1',
      truth_sealed: true,
      exported_at: nowIso(),
      match: exportMatchMeta(match),
      round: roundBundlePart(round),
      scoring_spec: SCORING_SPEC
    };
    assertSealed(bundle);
    return bundle;
  }

  function exportMatchBundle(match) {
    if (!match || !Array.isArray(match.rounds)) throw new Error('exportMatchBundle: match 无效');
    const bundle = {
      arena_version: ARENA_VERSION,
      schema: 'faultlab.arena.match.v1',
      truth_sealed: true,
      exported_at: nowIso(),
      match: exportMatchMeta(match),
      rounds: match.rounds.map(roundBundlePart),
      scoring_spec: SCORING_SPEC
    };
    assertSealed(bundle);
    return bundle;
  }

  /* 便捷：完整诊断结果文件（外部 Agent 提交格式） */
  function buildSubmission(agentName, rounds) {
    return {
      arena_version: ARENA_VERSION,
      agent: { name: agentName || '外部 Agent' },
      results: (rounds || []).map((r) => ({
        round: r.round,
        diagnosis: normalizeDiagnosis(r.diagnosis)
      }))
    };
  }

  ARENA.ARENA_VERSION = ARENA_VERSION;
  ARENA.HEALTHY_RATIO = HEALTHY_RATIO;
  ARENA.SCORING_SPEC = SCORING_SPEC;
  ARENA.listAgents = listAgents;
  ARENA.createMatch = createMatch;
  ARENA.scoreExternalDiagnosis = scoreExternalDiagnosis;
  ARENA.parseExternalBundle = parseExternalBundle;
  ARENA.exportRoundBundle = exportRoundBundle;
  ARENA.exportMatchBundle = exportMatchBundle;
  ARENA.buildSubmission = buildSubmission;
  ARENA.normalizeSetup = normalizeSetup;
  ARENA.scoreDiagnosis = scoreDiagnosis;
  ARENA._internals = {
    blindObservables: blindObservables,
    buildScenario: buildScenario,
    scoreDiagnosis: scoreDiagnosis,
    assertSealed: assertSealed,
    FORBIDDEN_ID: FORBIDDEN_ID
  };
})();
