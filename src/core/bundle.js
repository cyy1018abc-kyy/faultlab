/* owner: core-evidence | module: bundle | contract: NEXT/DATA_CONTRACT_SPEC.md §2.12/§3.3/§5 */
/* EvidenceBundle v1（G0-DEC-10 / P0a-08）：
   7 个主数据文件（manifest/config/model_manifest/timeseries/events/metrics/checks）+ SHA256SUMS.txt。
   导入流程（§5.1）：manifest 版本 → 文件哈希 → Schema 校验 → 反序列化重建 TimeSeries
   → 用导入数据重算 metrics/checks 并与记录值比对（容差 §7.2 求积口径）
   → 重算 run_hash 与 manifest 比对 → role='imported'，不覆盖现有 Run。
   负例防护（§5.3）：缺文件/坏校验和/未知版本/NaN/时间非单调/JSON 损坏/字段缺失/超大/注入内容。
   纯数据模块：零 DOM，浏览器/Node 共用。依赖 schema.js/registry.js/engine/metrics/checks。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};

  var BUNDLE_VERSION = 'v1';
  var SUPPORTED_BUNDLE = ['v1'];
  var SUPPORTED_SCHEMA_MAJOR = 1;
  var REQUIRED_FILES = ['config.json', 'model_manifest.json', 'timeseries.csv', 'events.json', 'metrics.json', 'checks.json'];
  var ALL_FILES = ['manifest.json'].concat(REQUIRED_FILES).concat(['SHA256SUMS.txt']);
  var MAX_FILE_BYTES = 8 * 1024 * 1024;
  var MAX_TOTAL_BYTES = 24 * 1024 * 1024;
  var MAX_SIGNALS = 64;
  var CSV_BOM = '\uFEFF';

  function sha256(str) { return FL.core.sha256(str); }
  function bytesOf(str) {
    /* UTF-8 字节数（与 DataEncoder 一致的近似实现，覆盖 BMP + 代理对） */
    var s = String(str);
    var b = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) b += 1;
      else if (c < 0x800) b += 2;
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) { b += 4; i++; }
      else b += 3;
    }
    return b;
  }
  function err(code, field, message, next) { return FL.contract.error(code, field, message, next); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* ================================================================== *
   * 构建（导出方向）
   * ================================================================== */
  function timeseriesCsv(run) {
    var sigs = run.signals || [];
    var units = {};
    sigs.forEach(function (s) { units[s.id] = s.unit || ''; });
    var lines = [];
    lines.push('# schema_version=' + FL.contract.SCHEMA_VERSION);
    lines.push('# run_id=' + run.runId);
    lines.push('# run_hash=' + (run.manifest ? run.manifest.run_hash : (run.runHash || '')));
    lines.push('# event_encoding_version=' + FL.contract.EVENT_ENCODING_VERSION);
    lines.push('# units=' + JSON.stringify(units));
    lines.push('# note=解析/行为级演示数据（synthetic），非实测；t=20.0 行为事件 post 采样；数值为最短往返全精度');
    lines.push(['t_s'].concat(sigs.map(function (s) { return s.id; })).join(','));
    var t = run.timeseries.t;
    var series = run.timeseries.signals;
    for (var i = 0; i < t.length; i++) {
      var row = [String(t[i])];
      for (var j = 0; j < sigs.length; j++) {
        var arr = series[sigs[j].id];
        var v = arr ? arr[i] : null;
        row.push(v === null || v === undefined ? '' : String(v));
      }
      lines.push(row.join(','));
    }
    return CSV_BOM + lines.join('\n') + '\n';
  }

  function bundleConfig(run) {
    /* config.json：契约 §2.1 字段面 + 实现字段（fault/initial/noise，fault 标 truth_only）。
       run_hash 只覆盖契约投影（config_hash），实现字段变更不影响身份。 */
    var cfg = run.config;
    var sc = FL.contract.scenarioView(cfg);
    sc.systemId = cfg.systemId;
    sc.fault = JSON.parse(JSON.stringify(cfg.fault || null));
    sc.initial = { load_kW: cfg.initial.load_kW, SOC_pct: cfg.initial.SOC_pct };
    sc.noise = cfg.noise ? { enabled: cfg.noise.enabled, seed: cfg.noise.seed, level: cfg.noise.level } : null;
    sc.__exposure_note = 'fault 为 truth_only 载荷；blind 投影严禁包含';
    return sc;
  }

  function buildBundleFiles(run) {
    if (!run || !run.manifest) throw err('CN-E09', 'run', '运行不存在或缺少 manifest', '先创建运行');
    var contract = FL.contract;
    var metricsContract = FL.registry.contractMetrics(run.metrics);
    var checksContract = FL.registry.contractChecks(run.quality);
    var failedIds = checksContract.filter(function (c) { return c.status === 'fail'; }).map(function (c) { return c.check_id; });

    var eventsWithSnaps = (run.events || []).map(function (ev) {
      var copy = JSON.parse(JSON.stringify(ev));
      copy.snapshots = (run.snapshots || []).filter(function (s) { return s.event_id === ev.event_id; })
        .map(function (s) { return JSON.parse(JSON.stringify(s)); });
      return copy;
    });

    var modelManifest = JSON.parse(JSON.stringify(run.modelManifest || {}));
    modelManifest.signals = JSON.parse(JSON.stringify(run.signals || []));

    var contents = {
      'manifest.json': null, /* 最后生成（含其他文件哈希） */
      'config.json': JSON.stringify(bundleConfig(run), null, 2),
      'model_manifest.json': JSON.stringify(modelManifest, null, 2),
      'timeseries.csv': timeseriesCsv(run),
      'events.json': JSON.stringify({ event_schema_version: contract.SCHEMA_VERSION, events: eventsWithSnaps }, null, 2),
      'metrics.json': JSON.stringify({ metric_schema_version: contract.SCHEMA_VERSION, metrics: metricsContract }, null, 2),
      'checks.json': JSON.stringify({
        checks_schema_version: contract.SCHEMA_VERSION,
        checks: checksContract,
        summary: { status: failedIds.length ? 'fail' : 'pass', failed_ids: failedIds }
      }, null, 2)
    };

    var fileList = [];
    REQUIRED_FILES.forEach(function (name) {
      fileList.push({ path: name, sha256: sha256(contents[name]), bytes: bytesOf(contents[name]) });
    });
    var manifest = {
      bundle_schema_version: BUNDLE_VERSION,
      schema_version: contract.SCHEMA_VERSION,
      model_version: run.config.modelVersion,
      engine_version: run.engineVersion,
      run_id: run.runId,
      role: run.role,
      label: run.label || '',
      status: run.status || 'completed',
      created_at: run.createdAt || null,
      event_encoding_version: contract.EVENT_ENCODING_VERSION,
      supported_versions: { bundle: SUPPORTED_BUNDLE, schema: ['1.0.0'] },
      verification: run.manifest.verification,
      provenance: {
        model_provenance: 'analytical_demo',
        data_kind: '解析/行为级演示数据（synthetic），非 Simulink、非实测',
        hash_semantics: 'run_hash 与文件 SHA-256 为内容校验和，不代表签名、来源或第三方认证'
      },
      integrity: run.manifest.integrity,
      config_hash: run.configHash,
      model_hash: run.modelHash,
      files: fileList,
      csv: { encoding: 'utf-8-sig(BOM)', newline: '\n' },
      note: 'EvidenceBundle v1：导入时执行 哈希→Schema→重算 metrics/checks→run_hash 比对；本包不包含盲投影。'
    };
    contents['manifest.json'] = JSON.stringify(manifest, null, 2);

    var sums = ALL_FILES.filter(function (n) { return n !== 'SHA256SUMS.txt'; })
      .map(function (name) { return sha256(contents[name]) + '  ' + name; })
      .join('\n') + '\n';
    contents['SHA256SUMS.txt'] = sums;
    return contents;
  }

  /* ================================================================== *
   * 解析与防护
   * ================================================================== */
  function parseJson(name, text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      var pos = '';
      var m = /position (\d+)/.exec(String(e.message));
      if (m) pos = '（位置 ' + m[1] + '）';
      throw err('CN-E13', name, 'JSON 损坏无法解析：' + name + pos, '重新导出完整证据包');
    }
  }

  function checkVersions(manifest) {
    var v = manifest.bundle_schema_version;
    if (SUPPORTED_BUNDLE.indexOf(v) === -1) {
      throw err('CN-E06', 'manifest.bundle_schema_version', '版本不支持：' + String(v) + '（当前应用支持 v1）', '升级应用或让分享者重新导出');
    }
    var sv = String(manifest.schema_version || '1.0.0');
    var major = parseInt(sv.split('.')[0], 10);
    if (major !== SUPPORTED_SCHEMA_MAJOR) {
      throw err('CN-E06', 'manifest.schema_version', 'schema 主版本不支持：' + sv, '升级应用后重试');
    }
    return { minor: parseInt(sv.split('.')[1] || '0', 10), unknown_fields: [] };
  }

  function verifyChecksums(manifest, files) {
    var byPath = {};
    (manifest.files || []).forEach(function (f) { byPath[f.path] = f; });
    REQUIRED_FILES.forEach(function (name) {
      var rec = byPath[name];
      if (!rec) throw err('CN-E07', name, 'manifest.files 缺少 ' + name + ' 的校验记录', '重新导出');
      var actual = sha256(files[name]);
      if (String(rec.sha256).toLowerCase() !== actual) {
        throw err('CN-E07', name, '内容校验失败：' + name + '（文件被修改或损坏）', '重新获取原始证据包');
      }
      var actualBytes = bytesOf(files[name]);
      if (isNum(rec.bytes) && rec.bytes !== actualBytes) {
        throw err('CN-E07', name, '字节数不一致：' + name, '重新获取原始证据包');
      }
    });
    /* SHA256SUMS.txt 交叉核验（含 manifest.json 自身） */
    var sums = String(files['SHA256SUMS.txt'] || '').replace(/^\uFEFF/, '');
    var lines = sums.split('\n').filter(function (l) { return l.trim(); });
    var map = {};
    lines.forEach(function (l) {
      var m = /^([0-9a-fA-F]{64})\s+\*?(.+)$/.exec(l.trim());
      if (m) map[m[2].trim()] = m[1].toLowerCase();
    });
    ALL_FILES.forEach(function (name) {
      if (name === 'SHA256SUMS.txt') return;
      if (!map[name]) throw err('CN-E07', 'SHA256SUMS.txt', '校验和清单缺少 ' + name, '重新导出');
      if (map[name] !== sha256(files[name])) {
        throw err('CN-E07', name, '内容校验失败：' + name + '（SHA256SUMS 不符）', '重新获取原始证据包');
      }
    });
  }

  function parseCsv(text) {
    var s = String(text).replace(/^\uFEFF/, '');
    var lines = s.split('\n');
    var header = null;
    var t = [];
    var columns = {};
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/\r$/, '');
      if (!line) continue;
      if (line.charAt(0) === '#') continue;
      var cells = line.split(',');
      if (header === null) { header = cells; continue; }
      var ti = Number(cells[0]);
      if (!isFinite(ti)) throw err('CN-E03', 'timeseries.t', '时间列存在非数值（第 ' + (t.length + 1) + ' 行）', '重新导出');
      t.push(ti);
      for (var c = 1; c < header.length; c++) {
        var id = header[c];
        if (!columns[id]) columns[id] = [];
        var raw = cells[c];
        if (raw === '' || raw === undefined) { columns[id].push(null); continue; }
        var v = Number(raw);
        if (!isFinite(v)) {
          if (/nan|infinity/i.test(raw)) {
            throw err('CN-E04', 'timeseries.' + id, '存在 NaN/Infinity（第 ' + t.length + ' 行）', '重新计算或导出');
          }
          throw err('CN-E04', 'timeseries.' + id, '存在非数值（第 ' + t.length + ' 行）', '重新导出');
        }
        columns[id].push(v);
      }
    }
    if (!header) throw err('CN-E01', 'timeseries.csv', '缺少表头', '重新导出');
    return { header: header, t: t, signals: columns };
  }

  function compareRecomputed(imported, recordedMetrics, recordedChecks, problems) {
    /* 用导入序列重算（trapezoid 口径）并与记录值比对；容差按 §7.2 求积规则放宽 */
    var system = FL.systems && FL.systems._raw ? FL.systems._raw.get(imported.config.systemId) : null;
    if (!system) return;
    var recomputed = FL.core.metrics.compute({
      system: system, systemId: system.id, config: imported.config,
      t: imported.timeseries.t, series: imported.timeseries.signals,
      integrals: null, runId: imported.runId
    });
    function tolFor(unit) {
      if (unit === 'kWh') return 1e-5;        /* §7.2：求积复核放宽（解析 golden 门禁仍为 1e-6） */
      if (unit === 'pp' || unit === '%') return 5e-4;
      return 1e-9;
    }
    recordedMetrics.forEach(function (rm) {
      if (rm.value === null || rm.value === undefined) return;
      var match = null;
      for (var i = 0; i < recomputed.length; i++) if (recomputed[i].metric_id === rm.metric_id) { match = recomputed[i]; break; }
      if (!match || match.value === null || match.value === undefined) return;
      var tol = tolFor(rm.unit);
      if (Math.abs(match.value - rm.value) > tol) {
        problems.push(err('CN-E08', 'metrics.' + rm.metric_id,
          '指标复核不一致：' + rm.metric_id + '（记录 ' + rm.value + '，重算 ' + match.value + '）',
          '标记为未验证并保留原运行'));
      }
    });
    var recomputedChecks = FL.core.checks.evaluate({
      system: system, systemId: system.id, config: imported.config,
      t: imported.timeseries.t, series: imported.timeseries.signals,
      metrics: recomputed, events: imported.events, snapshots: imported.snapshots, runId: imported.runId
    });
    recordedChecks.forEach(function (rc) {
      for (var i = 0; i < recomputedChecks.length; i++) {
        if (recomputedChecks[i].check_id === rc.check_id) {
          var a = rc.status === 'warn' ? 'warn' : rc.status;
          var b = recomputedChecks[i].status;
          var norm = function (x) { return x === 'warn' ? 'warn' : x; };
          if (norm(a) !== norm(b)) {
            problems.push(err('CN-E08', 'checks.' + rc.check_id,
              '检查复核不一致：' + rc.check_id + '（记录 ' + rc.status + '，重算 ' + recomputedChecks[i].status + '）',
              '查看检查详情或重新导出'));
          }
          break;
        }
      }
    });
  }

  /* ================================================================== *
   * 导入（§5.1 全流程）——返回未冻结的原始 Run，由调用方决定冻结/入库
   * ================================================================== */
  function importBundle(files, opts) {
    opts = opts || {};
    if (!files || typeof files !== 'object') {
      throw err('CN-E01', 'files', '未提供证据包文件', '选择导出的证据包目录内全部文件');
    }
    /* N-8 大小防护 */
    var total = 0;
    Object.keys(files).forEach(function (name) {
      var b = bytesOf(String(files[name]));
      total += b;
      if (b > MAX_FILE_BYTES) throw err('CN-E13', name, '文件过大：' + name + '（' + b + ' 字节）', '检查文件完整性');
    });
    if (total > MAX_TOTAL_BYTES) throw err('CN-E13', 'bundle', '证据包总体积超限', '检查文件完整性');

    /* N-1 缺文件 */
    var missing = REQUIRED_FILES.filter(function (name) { return files[name] === undefined || files[name] === null; });
    if (!files['manifest.json']) missing.unshift('manifest.json');
    if (missing.length) {
      throw err('CN-E01', 'files', '缺少必需文件：' + missing.join('、'), '重新导出完整证据包（7 个数据文件 + SHA256SUMS.txt）');
    }

    var manifest = parseJson('manifest.json', files['manifest.json']);
    var ver = checkVersions(manifest);

    /* N-2 坏校验和 */
    verifyChecksums(manifest, files);

    /* Schema 校验 */
    var sc = parseJson('config.json', files['config.json']);
    FL.contract.validateScenarioConfig(sc, { p0frozen: false }).forEach(function (e) { throw e; });
    var modelManifest = parseJson('model_manifest.json', files['model_manifest.json']);
    if (Array.isArray(modelManifest.signals)) {
      FL.contract.validateSignalCatalog(modelManifest.signals).forEach(function (e) { throw e; });
    }
    var eventsWrap = parseJson('events.json', files['events.json']);
    var metricsWrap = parseJson('metrics.json', files['metrics.json']);
    var checksWrap = parseJson('checks.json', files['checks.json']);
    var recordedMetrics = metricsWrap.metrics || [];
    var recordedChecks = checksWrap.checks || [];
    FL.contract.validateMetrics(recordedMetrics).forEach(function (e) { throw e; });
    FL.contract.validateChecks(recordedChecks).forEach(function (e) { throw e; });

    /* 反序列化重建 TimeSeries（N-4/N-5 在此暴露） */
    var csv = parseCsv(files['timeseries.csv']);
    var cfg = {
      schemaVersion: 1,
      systemId: sc.systemId || (modelManifest.systemId || 'FL-001'),
      modelId: sc.model_id,
      modelVersion: sc.model_version,
      duration_s: sc.duration_s,
      dt_s: sc.dt_s,
      feedback_mode: sc.feedback_mode,
      fault: sc.fault || { family: 'none', faultId: null, t_start_s: null, params: {} },
      initial: sc.initial || { load_kW: sc.initial_load_kW, SOC_pct: sc.initial_SOC_pct },
      noise: sc.noise ? { enabled: true, seed: sc.noise.seed, level: sc.noise.level }
        : { enabled: false, seed: 12345, level: 0 }
    };
    var ts = { t: csv.t, signals: csv.signals };
    FL.contract.validateTimeSeries(ts, cfg).forEach(function (e) { throw e; });

    /* 事件拆分：events.json 的 snapshots 还原为 run.events + run.snapshots。
       run_hash 的输入 events 不含 snapshots（与创建时 run.events 形态一致），需剥离。 */
    var eventsFull = eventsWrap.events || [];
    var snapshots = [];
    var events = eventsFull.map(function (ev) {
      var copy = JSON.parse(JSON.stringify(ev));
      delete copy.snapshots;
      return copy;
    });
    eventsFull.forEach(function (ev) {
      (ev.snapshots || []).forEach(function (s) { snapshots.push(s); });
    });
    var scForEvents = FL.contract.scenarioView(cfg);
    FL.contract.validateEventSnapshots(events, snapshots, scForEvents).forEach(function (e) { throw e; });

    /* 组装 Run（role=imported；UI 兼容字段从记录值派生） */
    var signals = (modelManifest.signals || []).map(function (s) {
      var copy = JSON.parse(JSON.stringify(s));
      copy.blindVisible = copy.exposure === 'blind_observable';
      copy.unavailable = false;
      return copy;
    });
    var metrics = recordedMetrics.map(function (m) {
      var copy = JSON.parse(JSON.stringify(m));
      copy.time_window = (m.time_window_s || [0, cfg.duration_s]).slice();
      copy.unavailable = m.value === null || m.value === undefined;
      return copy;
    });
    var quality = recordedChecks.map(function (c) {
      var copy = JSON.parse(JSON.stringify(c));
      copy.computed_value = c.observed;
      copy.message = c.reason;
      copy.label = c.label || c.check_id;
      return copy;
    });
    var run = {
      runId: manifest.run_id,
      runShortHash: String(manifest.config_hash || '').slice(0, 8),
      systemId: cfg.systemId,
      label: manifest.label || '导入运行',
      role: 'imported',
      createdAt: manifest.created_at || null,
      status: manifest.status || 'completed',
      config: cfg,
      configHash: manifest.config_hash,
      modelHash: manifest.model_hash,
      engineVersion: manifest.engine_version,
      modelManifest: modelManifest,
      signals: signals,
      timeseries: ts,
      events: events,
      snapshots: snapshots,
      metrics: metrics,
      quality: quality,
      causal: null,
      truth: null,
      manifest: {
        run_id: manifest.run_id,
        role: 'imported',
        config_hash: manifest.config_hash,
        model_hash: manifest.model_hash,
        engine_version: manifest.engine_version,
        model_version: manifest.model_version,
        schema_version: manifest.schema_version,
        run_hash: manifest.integrity ? manifest.integrity.run_hash : '',
        created_at: manifest.created_at,
        status: manifest.status || 'completed',
        provenance: manifest.provenance || { model_provenance: 'analytical_demo' },
        verification: manifest.verification || {
          consistency_checks: 'pass', model_validation: 'not_performed', hardware_verification: 'not_performed'
        },
        integrity: manifest.integrity || { run_hash: '', checks_status: 'pass' },
        event_encoding_version: manifest.event_encoding_version,
        bundle_schema_version: manifest.bundle_schema_version
      }
    };
    run.runHash = run.manifest.run_hash;
    run.run_hash = run.manifest.run_hash;

    /* 重算 run_hash 与 manifest 比对（用记录的 metrics/checks 契约面） */
    var recomputedHash = FL.registry.computeRunHashFromParts({
      config_hash: manifest.config_hash,
      model_hash: manifest.model_hash,
      engine_version: manifest.engine_version,
      t: ts.t,
      signals: ts.signals,
      events: events,
      metrics: recordedMetrics,
      checks: recordedChecks
    });
    if (!run.manifest.run_hash || recomputedHash !== run.manifest.run_hash) {
      throw err('CN-E07', 'manifest.integrity.run_hash',
        'run_hash 复核不一致（期望 ' + String(run.manifest.run_hash).slice(0, 12) + '…，重算 ' + recomputedHash.slice(0, 12) + '…）',
        '重新获取原始证据包');
    }

    /* 用导入数据重算 metrics/checks 并比对（N-3 在此暴露） */
    var problems = [];
    compareRecomputed(run, recordedMetrics, recordedChecks, problems);
    if (problems.length) throw problems[0];

    /* N-7：schema minor 更高 → 警告 + 忽略未知字段（记录） */
    if (ver.minor > 0) {
      run.importWarnings = ['证据包 schema minor 版本较高（' + manifest.schema_version + '），未知字段已忽略'];
    }
    if (ver.unknown_fields.length) run.importWarnings = ver.unknown_fields;
    run.importedFrom = { bundle_schema_version: manifest.bundle_schema_version, at: manifest.created_at };
    if (opts.freeze !== false) FL.registry.deepFreeze(run);
    return run;
  }

  FL.bundle = {
    BUNDLE_VERSION: BUNDLE_VERSION,
    REQUIRED_FILES: REQUIRED_FILES,
    ALL_FILES: ALL_FILES,
    buildBundleFiles: buildBundleFiles,
    importBundle: importBundle,
    timeseriesCsv: timeseriesCsv,
    parseCsv: parseCsv,
    _bytesOf: bytesOf
  };
})();
