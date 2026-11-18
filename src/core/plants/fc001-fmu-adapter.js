/* owner: core-engine | module: plants/fc001-fmu-adapter | contract: FC001_FMU_G2B_SPEC_APPROVED
   v1.0 §1.1（G9 §2.1 外层——HTTP bridge + 预烘焙兜底；G0-V05-DEC-01——浏览器零依赖维持）；
   FCFMU-G2b-04（CHG-20261118-01）。fl001/fc001/gt001 适配器先例同构。
   职责边界（三层夹心外层——APPROVED §1.1）：
   - 预烘焙兜底（file:// 离线模式）：装载**经验证的静态 golden run 档案**
     （data/golden/fc001_fmu_v1.json——与 golden 字节同源；装载由调用方注入 payload：
     浏览器 file 输入 / 构建内嵌 / 测试 harness——core 层零 fetch 零 fs，I-1 纪律）；
   - bridge 客户端（开发/评审模式）：对 tools/backend/py/bridge.py（127.0.0.1 回环 +
     Origin 白名单 + token——既有安全边界）探针；fetch 由调用方注入（core 层零网络
     API 直调——经典脚本纪律静态扫描 + I-1 零依赖）；产物缺位/探针失败 ⇒ 显式降级
     兜底（capability 面如实暴露，不静默）；
   - I-3 认知分离：FMU 内核只出真值层输出；传感污染/控制/残差/事件相位分裂归 host
     （fmu_runner.py）——本适配器零壳职责、零事件编码（ADR-002）。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};
  FL.core.plants = FL.core.plants || {};

  function validateGolden(g) {
    if (!g || typeof g !== 'object') return 'golden payload 非对象';
    if (g.golden_id !== 'fc001_fmu_v1') return 'golden_id 非 fc001_fmu_v1（轨锚定校验失败）';
    if (g.golden_schema_version !== 'v2') return 'golden_schema_version 非 v2';
    if (!g.runs || typeof g.runs !== 'object') return 'runs 缺失';
    if (!g.approval || !g.approval.approved_by) return 'approval 三字段缺失（未批准档案不装载）';
    if (g.model_provenance !== 'fmu_l1_lumped_unvalidated') return 'model_provenance 非 FMU 轨档位';
    return null;
  }

  function createFc001FmuAdapter(options) {
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

    /* bridge 探针：dev/评审模式能力探测（GET /capability，回环 + token——bridge.py 契约）。
       fetchImpl 由调用方注入（core 层零网络 API 直调）；探针失败（离线/产物缺位/拒绝/
       未注入）⇒ 显式降级：调用方回预烘焙路径（initPrebaked）。 */
    function probeBridge(fetchImpl) {
      if (!bridgeOpts || typeof fetchImpl !== 'function') {
        mode = 'bridge-unavailable';
        lastError = 'bridge 未配置或调用方未注入 fetchImpl（file:// 离线面）';
        return Promise.resolve(false);
      }
      var url = bridgeOpts.url + '/capability';
      return fetchImpl(url, { headers: bridgeOpts.token ? { 'Authorization': 'Bearer ' + bridgeOpts.token } : {} })
        .then(function (r) {
          if (!r.ok) throw new Error('bridge capability HTTP ' + r.status);
          return r.json();
        })
        .then(function (cap) {
          if (!cap || cap.model_id !== 'fc.pem.fmu_l1') throw new Error('bridge capability model_id 不符');
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
          return { key: key, role: r.role, feedback_mode: r.feedback_mode };
        });
      },
      getRun: function (key) {
        if (mode !== 'prebaked' || !golden) return null;
        var r = golden.runs[key];
        if (!r) return null;
        return {
          key: key,
          role: r.role,
          feedback_mode: r.feedback_mode,
          series: r.series,
          scalars: r.scalars,
          metrics: r.metrics,
          events: r.events
        };
      },
      meta: function () {
        if (mode !== 'prebaked' || !golden) return null;
        return {
          golden_id: golden.golden_id,
          golden_sha256_source: 'data/golden/fc001_fmu_v1.json（sidecar 校验由装载方执行）',
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

  FL.core.plants.createFc001FmuAdapter = createFc001FmuAdapter;
})();
