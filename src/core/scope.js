/* owner: core-contract | module: scope | contract: BACKLOG_APPROVED §1.5 / MODEL_VALIDATION_SPEC SA-24 / G0-DEC-14
   批准范围守卫（P0b-07 / I-10）：P0 验收只认 FL-001 × 固定白名单场景；
   白名单外的 Run/导出一律标 scope='extension_preview'（扩展预览·未评审），
   不得进入 P0 验收或 golden 比对。纯函数、零 DOM。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};

  /* SA-24 白名单：P0 唯一允许的场景集合 */
  var APPROVED = {
    systemId: 'FL-001',
    modelId: 'fl001',
    modelVersion: 'fl001.1',
    duration_s: 60,
    dt_s: 0.1,
    fault_time_s: 20.0,
    bias_A: 10,
    families: ['none', 'sensor_drift'],
    feedback_modes: ['closed_loop', 'monitor'],
    initial_load_kW: 30,
    initial_SOC_pct: 60
  };

  function isNumEq(a, b, tol) {
    return typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= (tol || 1e-9);
  }

  /* classify(config) -> 'approved_p0' | 'extension_preview'
     config 为实现配置（systemId/fault/initial/noise...）或已 ScenarioConfig 化对象均可。 */
  function classify(config) {
    if (!config || typeof config !== 'object') return 'extension_preview';
    var systemId = config.systemId || null;
    var modelId = config.modelId || config.model_id || null;
    var family = config.fault && config.fault.family ? config.fault.family
      : (config.bias_A > 0 ? 'sensor_drift' : (config.fault_time_s != null ? 'none' : null));
    var faulted = family && family !== 'none';
    var magnitude = faulted
      ? (config.fault && config.fault.params && config.fault.params.magnitude)
      : (config.bias_A != null ? config.bias_A : 0);
    var tStart = faulted
      ? (config.fault && config.fault.t_start_s)
      : (config.fault_time_s != null ? config.fault_time_s : null);
    var mode = config.feedback_mode || null;
    var load = config.initial ? config.initial.load_kW : config.initial_load_kW;
    var soc = config.initial ? config.initial.SOC_pct : config.initial_SOC_pct;
    var noiseOn = !!(config.noise && (config.noise.enabled === true || (config.noise.seed != null && config.noise.level > 0)));

    var ok = systemId === APPROVED.systemId
      && modelId === APPROVED.modelId
      && APPROVED.families.indexOf(family) !== -1
      && APPROVED.feedback_modes.indexOf(mode) !== -1
      && isNumEq(load, APPROVED.initial_load_kW)
      && isNumEq(soc, APPROVED.initial_SOC_pct)
      && isNumEq(config.duration_s, APPROVED.duration_s)
      && isNumEq(config.dt_s, APPROVED.dt_s)
      && !noiseOn
      && (!faulted || (isNumEq(Number(tStart), APPROVED.fault_time_s) && isNumEq(Number(magnitude), APPROVED.bias_A)));
    return ok ? 'approved_p0' : 'extension_preview';
  }

  function isApprovedP0(configOrRun) {
    var config = configOrRun && configOrRun.config ? configOrRun.config : configOrRun;
    return classify(config) === 'approved_p0';
  }

  /* 验收门禁：P0 验收/golden 比对路径必须先通过；不通过抛中文错误 */
  function assertApprovedP0(configOrRun) {
    if (!isApprovedP0(configOrRun)) {
      var err = new Error('[SCOPE] 该场景超出 G0 批准范围（扩展预览·未评审）：P0 验收仅接受 FL-001 × sensor_drift/无故障 × +10 A @20.0 s × 30 kW/60% × 60 s/0.1 s。');
      err.name = 'ScopeError';
      err.code = 'SCOPE-E01';
      err.next = '改用批准白名单内的配置，或将该 Run 标注为扩展预览且不进入 P0 验收';
      throw err;
    }
    return true;
  }

  FL.scope = {
    APPROVED: APPROVED,
    classify: classify,
    isApprovedP0: isApprovedP0,
    assertApprovedP0: assertApprovedP0
  };
})();
