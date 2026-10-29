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
      scope: (FL.scope && FL.scope.classify) ? FL.scope.classify(run.config) : 'extension_preview',
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

  /* ================================================================== *
   * createFromParts（FL19_BACKEND_RFC_APPROVED §3.1 v1.1 / V312 §3·§6）
   * 后端 Run 组装：结构骨架取自 JS 引擎同 config 的 simulate（事件/快照/因果/
   * 信号目录与数值后端无关），timeseries 替换为后端序列；metrics/checks 在替换后
   * 序列上由页面侧模块重算（V312 §4：信任计算，不信任声明）。
   *   parts: { config, produced, backend, label?, golden? }
   *     produced: 适配器输出 {t, signals, integrals, metrics}
   *     backend:  {id, version, method_id, tolerance_profile_id, provenance?}
   *     golden:   注入的 golden 对象（可选；提供时追加 vs_golden_tolerance 检查，
   *               即 BK-E03 判定载体——V312 §3）
   * 纪律：
   *   - engine_version = 产生数值的实现版本（backend.id@version，≠ JS 引擎版本）
   *     ——既有 compareRuns 闸门据此天然拦截跨后端对比（RFC §5.2 v1.1）；
   *   - manifest.backend 记录适配器身份与容差档，**不入 run_hash**（RFC §5.2）；
   *   - scope 受控扩展：凡 manifest.backend 存在 → 强制 extension_preview（优先级
   *     高于 classify；classify 本身零改动——V312 §6 断言 1/2）；
   *   - 原子性（BK-E02）：任何校验失败在冻结前抛出，无半成品 Run。
   * ================================================================== */
  function createFromParts(parts) {
    var p = parts || {};
    if (!p.config) throw FL.contract.error('CN-E01', 'config', '缺少运行配置', '提供 ScenarioConfig');
    if (!p.produced || !p.produced.t || !p.produced.signals) {
      throw FL.contract.error('BK-E02', 'produced', '缺少后端产出（t/signals）', '检查适配器 produce 输出');
    }
    if (!p.backend || !p.backend.id || !p.backend.version || !p.backend.method_id || !p.backend.tolerance_profile_id) {
      throw FL.contract.error('BK-E02', 'backend', 'backend 声明不完整（id/version/method_id/tolerance_profile_id）', '检查适配器清单');
    }
    var validation = FL.core.validateConfig(p.config);
    if (!validation.ok) {
      var first = validation.errors[0] || { field: 'config', message: '配置无效' };
      throw FL.contract.error('CN-E02', 'config.' + first.field, '配置无效：' + first.message, '修改参数后重试');
    }

    /* 结构骨架：JS 引擎同 config（事件/快照/因果/信号目录/manifest 骨架） */
    var run = FL.core.simulate(p.config, { label: p.label });

    /* 序列替换：后端须产出数值模型输出信号；目录中的常量/派生配置信号
       （I_ref_A/V_bus_V/I_bat_cap_A 等，由 config 决定、与数值后端无关）从骨架合并；
       后端多出的未知 id 拒绝（BK-E02）。 */
    var produced = p.produced;
    var baseSignals = run.timeseries.signals;
    var merged = {};
    Object.keys(baseSignals).forEach(function (id) {
      merged[id] = (produced.signals[id] !== undefined) ? produced.signals[id] : baseSignals[id];
    });
    Object.keys(produced.signals).forEach(function (id) {
      if (id === 't') return; /* 后端以 signals.t 同构 golden.series.t；t 由 produced.t 承担 */
      if (!baseSignals[id]) {
        throw FL.contract.error('BK-E02', 'produced.signals.' + id, '后端产出了系统目录之外的信号', '信号集须 ⊆ 系统目录');
      }
    });
    if (produced.t.length !== run.timeseries.t.length) {
      throw FL.contract.error('BK-E02', 'produced.t', '后端点数 ' + produced.t.length + ' ≠ 目录派生 ' + run.timeseries.t.length, '网格锁定 60 s/0.1 s/601 点');
    }
    run.timeseries = { t: produced.t, signals: merged };

    /* metrics/checks 页面侧重算（含后端 integrals——RK4 求积口径随 produced 传入） */
    var system = FL.systems.get(run.systemId);
    run.metrics = FL.core.metrics.compute({
      system: system, systemId: run.systemId, config: run.config,
      t: run.timeseries.t, series: run.timeseries.signals,
      integrals: produced.integrals || null, runId: run.runId
    });
    run.quality = FL.core.checks.evaluate({
      system: system, systemId: run.systemId, config: run.config,
      t: run.timeseries.t, series: run.timeseries.signals,
      metrics: run.metrics, events: run.events, snapshots: run.snapshots,
      truth: run.truth, runId: run.runId
    });

    /* golden 容差档比对（BK-E03 载体；V312 §3）——golden 由调用方注入 */
    if (p.golden && p.golden.runs) {
      var cmp = FL.core.goldenCompare(
        { t: produced.t, signals: produced.signals, metrics: produced.metrics || {} },
        p.golden.runs[run.role === 'baseline' ? 'healthy' : (run.config.feedback_mode === 'monitor' ? 'monitor_only' : 'closed_loop_fault')],
        p.backend.tolerance_profile_id, p.golden.tolerances);
      run.quality.push({
        id: 'vs_golden_tolerance', label: '后端 vs golden（' + p.backend.tolerance_profile_id + '）',
        status: cmp.ok ? 'pass' : 'fail',
        message: cmp.ok ? '跨实现一致性检查通过（' + p.backend.method_id + '）'
          : '超差 ' + cmp.violations.length + ' 项：' + cmp.violations.slice(0, 2).map(function (v) { return v.key; }).join('、')
      });
    }

    /* engine_version = 产生数值的实现版本（≠ JS 引擎版本 → 跨后端对比天然 incomparable） */
    run.engineVersion = p.backend.id + '@' + p.backend.version;

    /* quality 汇总（含 vs_golden）→ manifest verification/integrity */
    var failed = (run.quality || []).some(function (q) { return q.status === 'fail'; });
    var manifest = {
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
      /* scope 受控扩展：backend Run 强制 extension_preview（V312 §6 断言 1；classify 零改动） */
      scope: 'extension_preview',
      backend: { id: p.backend.id, version: p.backend.version, method_id: p.backend.method_id,
        tolerance_profile_id: p.backend.tolerance_profile_id,
        provenance: p.backend.provenance || 'numerical_simulation' },
      provenance: { model_provenance: p.backend.provenance || 'numerical_simulation' },
      verification: {
        consistency_checks: failed ? 'fail' : 'pass',
        model_validation: 'not_performed',
        hardware_verification: 'not_performed'
      },
      integrity: { run_hash: '', checks_status: failed ? 'fail' : 'pass' },
      event_encoding_version: FL.contract.EVENT_ENCODING_VERSION,
      bundle_schema_version: FL.contract.BUNDLE_SCHEMA_VERSION
    };
    manifest.run_hash = computeRunHash(run);
    manifest.integrity.run_hash = manifest.run_hash;
    run.manifest = manifest;
    run.runHash = manifest.run_hash;
    run.run_hash = manifest.run_hash;
    return deepFreeze(run);
  }

  FL.registry = {
    createRun: createRun,
    createFromParts: createFromParts,
    computeRunHash: computeRunHash,
    computeRunHashFromParts: computeRunHashFromParts,
    verifyRunHash: verifyRunHash,
    validateRestored: validateRestored,
    deepFreeze: deepFreeze,
    contractMetrics: contractMetrics,
    contractChecks: contractChecks
  };
})();
