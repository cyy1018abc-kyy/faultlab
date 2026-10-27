/* owner: core-registry | module: registry | contract: NEXT/DATA_CONTRACT_SPEC.md §3/§4 */
/* RunRegistry：不可变 Run 创建与内容哈希（G0-DEC-07 / P0a-04）。
   - config_hash = SHA256(canonical(ScenarioConfig §2.1 投影))（键排序、默认值填充、最短往返）；
   - run_hash    = SHA256(canonical({bundle_schema_version, config_hash, model_hash,
                     engine_version, t, signals, events, metrics, checks}))，
     其中 t/signals 取 TimeSeries，metrics/checks 取契约字段面投影——
     因此 run_hash 可由证据包内容完整重算（导入复核），created_at 不入哈希；
   - Run 创建后深度冻结（Object.freeze 递归）；任何参数改动只产生新 Run/draft。
   依赖：hash.js / schema.js / systems.js / engine.js / metrics.js / checks.js。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};

  function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Object.isFrozen(obj)) return obj;
    Object.keys(obj).forEach(function (k) { deepFreeze(obj[k]); });
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) deepFreeze(obj[i]);
    }
    return Object.freeze(obj);
  }

  function contractMetrics(metrics) {
    return (metrics || []).map(function (m) { return FL.contract.toContractMetric(m); });
  }

  function contractChecks(checks) {
    return (checks || []).map(function (c) { return FL.contract.toContractCheck(c); });
  }

  /* source_run_ids 不入 run_hash：run_hash 是内容校验和，同一内容两次运行必须同哈希
     （DATA_CONTRACT_SPEC §4.2）；运行的归属由 manifest / source_run_ids 承担。 */
  function hashableMetrics(metrics) {
    return contractMetrics(metrics).map(function (m) {
      var copy = {};
      Object.keys(m).forEach(function (k) { if (k !== 'source_run_ids') copy[k] = m[k]; });
      return copy;
    });
  }

  /* run_hash 的规范输入（G0-DEC-07）。signals = TimeSeries.signals（数值内容），
     metrics/checks = 契约字段面（与 EvidenceBundle 的 metrics.json/checks.json 一致）。 */
  function runHashInput(run) {
    return {
      bundle_schema_version: FL.contract.BUNDLE_SCHEMA_VERSION,
      config_hash: run.configHash,
      model_hash: run.modelHash,
      engine_version: run.engineVersion,
      t: run.timeseries.t,
      signals: run.timeseries.signals,
      events: run.events,
      metrics: hashableMetrics(run.metrics),
      checks: contractChecks(run.quality)
    };
  }

  function computeRunHash(run) {
    return FL.core.hashObjectStrict(runHashInput(run));
  }

  /* 由（导入的）证据包字段面重算 run_hash：与 bundle 中记录值比对用。
     metrics 的 source_run_ids 同样不入哈希（导入运行归属不同，内容不变）。 */
  function computeRunHashFromParts(parts) {
    return FL.core.hashObjectStrict({
      bundle_schema_version: FL.contract.BUNDLE_SCHEMA_VERSION,
      config_hash: parts.config_hash,
      model_hash: parts.model_hash,
      engine_version: parts.engine_version,
      t: parts.t,
      signals: parts.signals,
      events: parts.events,
      metrics: (parts.metrics || []).map(function (m) {
        var copy = {};
        Object.keys(m).forEach(function (k) { if (k !== 'source_run_ids') copy[k] = m[k]; });
        return copy;
      }),
      checks: parts.checks
    });
  }

  function createRun(opts) {
    var o = opts || {};
    if (!o.config) throw FL.contract.error('CN-E01', 'config', '缺少运行配置', '提供 ScenarioConfig');
    var validation = FL.core.validateConfig(o.config);
    if (!validation.ok) {
      var first = validation.errors[0] || { field: 'config', message: '配置无效' };
      throw FL.contract.error('CN-E02', 'config.' + first.field, '配置无效：' + first.message, '修改参数后重试');
    }
    var run = FL.core.simulate(o.config, {
      runId: o.runId,
      role: o.role,
      label: o.label,
      createdAt: o.createdAt
    });
    /* 身份与契约字段（在冻结前写完；created_at 不入 run_hash） */
    run.manifest = {
      run_id: run.runId,
      role: run.role,
      config_hash: run.configHash,
      model_hash: run.modelHash,
      engine_version: run.engineVersion,
      model_version: run.config.modelVersion,
      schema_version: FL.contract.SCHEMA_VERSION,
      run_hash: '',
      created_at: run.createdAt,
      status: run.status || 'completed',
      provenance: { model_provenance: 'analytical_demo' },
      verification: {
        consistency_checks: 'pass',
        model_validation: 'not_performed',
        hardware_verification: 'not_performed'
      },
      integrity: { run_hash: '', checks_status: 'pass' },
      event_encoding_version: FL.contract.EVENT_ENCODING_VERSION,
      bundle_schema_version: FL.contract.BUNDLE_SCHEMA_VERSION
    };
    var failed = (run.quality || []).some(function (q) { return q.status === 'fail'; });
    run.manifest.verification.consistency_checks = failed ? 'fail' : 'pass';
    run.manifest.integrity.checks_status = failed ? 'fail' : 'pass';
    run.manifest.run_hash = computeRunHash(run);
    run.manifest.integrity.run_hash = run.manifest.run_hash;
    run.runHash = run.manifest.run_hash;
    run.run_hash = run.manifest.run_hash;
    return deepFreeze(run);
  }

  function verifyRunHash(run) {
    if (!run || !run.manifest || !run.manifest.run_hash) return false;
    try {
      return computeRunHash(run) === run.manifest.run_hash;
    } catch (e) {
      return false;
    }
  }

  /* 从存储恢复时的哈希校验：不通过则丢弃（不得伪造历史 Run，DATA_CONTRACT_SPEC §4.2） */
  function validateRestored(run) {
    if (!run || typeof run !== 'object' || !run.manifest) return { ok: true, run: run };
    if (!verifyRunHash(run)) {
      return { ok: false, run: null, reason: '内容校验不一致：本地存储的运行 ' + (run.runId || '?') + ' 数据与哈希不符，已拒绝恢复' };
    }
    return { ok: true, run: run };
  }

  FL.registry = {
    createRun: createRun,
    computeRunHash: computeRunHash,
    computeRunHashFromParts: computeRunHashFromParts,
    verifyRunHash: verifyRunHash,
    validateRestored: validateRestored,
    deepFreeze: deepFreeze,
    contractMetrics: contractMetrics,
    contractChecks: contractChecks
  };
})();
