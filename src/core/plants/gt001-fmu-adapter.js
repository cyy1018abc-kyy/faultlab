/* owner: core-engine | module: plants/gt001-fmu-adapter | contract: GT001_FMU_G2B_SPEC_APPROVED
   v1.0 §1.1（GTFMU-G2b-04 / CHG-20261119-01）。fc001-fmu-adapter.js :1-13 先例同构。
   职责边界（三层夹心外层——Q12=(a) plant adapter 层绑定；场景零新键）：
   - 预烘焙兜底（file:// 离线模式）：装载经验证的静态 golden run 档案
     （gt001_fmu_v1 / gt001_fmu_comb_v1——golden_id/model_provenance/model_id 三面轨锚定）；
   - bridge 探针（dev/评审模式）：fetch 由调用方注入（core 零网络 API 直调——
     fc001-fmu-adapter fetch 注入先例）；探针失败 ⇒ 显式降级兜底。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};
  FL.core.plants = FL.core.plants || {};

  var EXPECTED_GOLDEN_IDS = ['gt001_fmu_v1', 'gt001_fmu_comb_v1'];

  function validateGolden(g) {
    if (!g || typeof g !== 'object') return 'golden payload 非对象';
    if (EXPECTED_GOLDEN_IDS.indexOf(g.golden_id) < 0) return 'golden_id 非 GT FMU 轨（轨锚定校验失败）';
    if (g.golden_schema_version !== 'v2') return 'golden_schema_version 非 v2';
    if (!g.runs || typeof g.runs !== 'object') return 'runs 缺失';
    if (!g.approval || !g.approval.approved_by) return 'approval 三字段缺失';
    if (g.model_provenance !== 'fmu_l1_lumped_unvalidated') return 'model_provenance 非 FMU 轨档位';
    if (g.model_id !== 'gt.sync.fmu_l1') return 'model_id 非 gt.sync.fmu_l1';
    return null;
  }

  function createGt001FmuAdapter(options) {
    var opts = options || {};
    var golden = opts.golden || null;
    var bridgeOpts = opts.bridge || null;
    var mode = 'uninitialized';
    var lastError = null;

    function initPrebaked(payload) {
      var err = validateGolden(payload);
      if (err) { mode = 'prebaked-invalid'; lastError = err; return false; }
      golden = payload;
      mode = 'prebaked';
      lastError = null;
      return true;
    }

    function probeBridge(fetchImpl) {
      if (!bridgeOpts || typeof fetchImpl !== 'function') {
        mode = 'bridge-unavailable';
        lastError = 'bridge 未配置或调用方未注入 fetchImpl';
        return Promise.resolve(false);
      }
      var url = bridgeOpts.url + '/capability';
      return fetchImpl(url, { headers: bridgeOpts.token ? { 'X-Bridge-Token': bridgeOpts.token } : {} })
        .then(function (r) {
          if (!r.ok) throw new Error('bridge capability HTTP ' + r.status);
          return r.json();
        })
        .then(function (cap) {
          var c = cap && (cap.capability || cap);
          if (!c || c.model_id !== 'gt.sync.fmu_l1') throw new Error('bridge capability model_id 不符');
          mode = 'bridge';
          lastError = null;
          return true;
        })
        .catch(function (e) {
          mode = 'bridge-unavailable';
          lastError = String(e && e.message || e);
          return false;
        });
    }

    return {
      initPrebaked: initPrebaked,
      probeBridge: probeBridge,
      get mode() { return mode; },
      get lastError() { return lastError; },
      listRuns: function () {
        if (mode !== 'prebaked' || !golden) return [];
        return Object.keys(golden.runs).map(function (key) {
          var r = golden.runs[key];
          return { key: key, role: r.role, feedback_mode: r.feedback_mode, inertia_model: r.inertia_model };
        });
      },
      getRun: function (key) {
        if (mode !== 'prebaked' || !golden) return null;
        var r = golden.runs[key];
        if (!r) return null;
        return {
          key: key, role: r.role, feedback_mode: r.feedback_mode,
          inertia_model: r.inertia_model, series: r.series, scalars: r.scalars,
          metrics: r.metrics, events: r.events
        };
      },
      meta: function () {
        if (mode !== 'prebaked' || !golden) return null;
        return {
          golden_id: golden.golden_id,
          model_id: golden.model_id,
          model_version: golden.model_version,
          model_provenance: golden.model_provenance,
          method_id: golden.method_id,
          approved_by: golden.approval ? golden.approval.approved_by : null,
          note: '行为与数值集总参数演示模型（未经实验/硬件验证）——数值与实现自洽 only'
        };
      }
    };
  }

  FL.core.plants.createGt001FmuAdapter = createGt001FmuAdapter;
})();
