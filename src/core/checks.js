/* owner: core-engine | module: checks | contract: docs/CONTRACT.md */
/* quality_checks：契约 §4.8 必含检查（sampling / conservation-true / conservation-meas /
   units / soc-bounds / event-window / energy-balance）。不通过时页面必须显示"验证未通过"。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  function maxAbs(arr) {
    if (!arr) return null;
    var m = 0;
    var found = false;
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (!isNum(v)) continue;
      found = true;
      var a = v < 0 ? -v : v;
      if (a > m) m = a;
    }
    return found ? m : null;
  }

  function minMaxNonEmpty(arr) {
    var min = Infinity;
    var max = -Infinity;
    var found = false;
    if (!arr) return null;
    for (var i = 0; i < arr.length; i++) {
      if (!isNum(arr[i])) continue;
      found = true;
      if (arr[i] < min) min = arr[i];
      if (arr[i] > max) max = arr[i];
    }
    return found ? { min: min, max: max } : null;
  }

  function findMetric(metrics, id) {
    if (!metrics) return null;
    for (var i = 0; i < metrics.length; i++) if (metrics[i].metric_id === id) return metrics[i];
    return null;
  }

  function metricValue(metrics, id) {
    var m = findMetric(metrics, id);
    return (m && !m.unavailable && isNum(m.value)) ? m.value : null;
  }

  function check(id, label, status, tolerance, computedValue, message) {
    return {
      check_id: id,
      label: label,
      status: status,
      tolerance: tolerance,
      computed_value: (computedValue === null || computedValue === undefined) ? null : computedValue,
      message: message
    };
  }

  function evaluate(ctx) {
    var system = ctx.system;
    var cfg = ctx.config;
    var t = ctx.t;
    var series = ctx.series;
    var metrics = ctx.metrics || [];
    var events = ctx.events || [];
    var snapshots = ctx.snapshots || [];
    var duration = cfg.duration_s;
    var dt = cfg.dt_s;
    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var noiseEnabled = !!(cfg.noise && cfg.noise.enabled);
    var quality = [];

    /* ---- sampling ---- */
    var expectedPoints = Math.round(duration / dt) + 1;
    var n = t.length;
    var lengthsOk = true;
    var badSignal = null;
    Object.keys(series).forEach(function (id) {
      if (!series[id] || series[id].length !== n) { lengthsOk = false; badSignal = id; }
    });
    var gridOk = n === expectedPoints &&
      Math.abs(t[0]) < 1e-9 &&
      Math.abs(t[n - 1] - duration) < 1e-9 &&
      Math.abs((t[1] - t[0]) - dt) < 1e-9;
    var nanCount = 0;
    var nullOptionalCount = 0;
    Object.keys(series).forEach(function (id) {
      var isOptional = /(_cap_A|_cap_kW)$/.test(id);
      var arr = series[id] || [];
      for (var i = 0; i < arr.length; i++) {
        var v = arr[i];
        if (v === null) {
          if (isOptional) nullOptionalCount++;
          else nanCount++;
        } else if (!isNum(v)) {
          nanCount++;
        }
      }
    });
    quality.push(check(
      'sampling', '采样与序列完整性',
      (lengthsOk && gridOk && nanCount === 0) ? 'pass' : 'fail',
      expectedPoints + ' 点 / dt ' + dt + ' s / 全部序列等长 / 无 NaN',
      n,
      (lengthsOk && gridOk && nanCount === 0)
        ? ('601 点采样网格一致，' + Object.keys(series).length + ' 个信号等长，无 NaN/Inf' +
          (nullOptionalCount ? ('；' + nullOptionalCount + ' 个可选限值点位为 null（非执行器故障场景）') : ''))
        : ('采样检查失败：长度' + (lengthsOk ? '一致' : '不一致(' + badSignal + ')') +
          '，网格' + (gridOk ? '正确' : '错误') + '，非法数值 ' + nanCount + ' 个')
    ));

    /* ---- conservation-true ---- */
    var tolTrue = system.id === 'GT-001' ? 1e-3 : 1e-6;
    var maxRt = maxAbs(series.r_true_kW);
    var trueOk = maxRt !== null && maxRt <= tolTrue;
    quality.push(check(
      'conservation-true', '真实功率守恒',
      trueOk ? 'pass' : 'fail',
      '≤ ' + tolTrue + ' kW' + (system.id === 'GT-001' ? '（含 P_rotor 项）' : ''),
      maxRt,
      trueOk
        ? ('真实功率平衡残差最大值 ' + maxRt.toExponential(2) + ' kW，在容差内' +
          (system.id === 'GT-001' ? '（含转子惯量项 P_rotor）' : ''))
        : ('真实功率守恒超差：max|r_true| = ' + maxRt + ' kW > ' + tolTrue + ' kW')
    ));

    /* ---- conservation-meas ---- */
    var maxRm = maxAbs(series.r_meas_kW);
    var measStatus;
    if (maxRm === null) measStatus = 'fail';
    else if (maxRm <= 1e-6) measStatus = 'pass';
    else if (faulted) measStatus = 'warn';
    else if (noiseEnabled) measStatus = 'warn';
    else measStatus = 'fail';
    var measMsg;
    if (measStatus === 'pass') {
      measMsg = '测量一致性残差最大 ' + maxRm.toExponential(2) + ' kW（无故障或无测量偏置）';
    } else if (measStatus === 'warn' && faulted) {
      measMsg = '故障期间测量一致性残差为 ' + maxRm.toFixed(2) + ' kW：这是测量偏差，不是实际能量损失（真实守恒由 conservation-true 单独校验）';
    } else if (measStatus === 'warn') {
      measMsg = '观测噪声开启，测量一致性残差 ' + maxRm.toFixed(3) + ' kW 非零（演示用噪声，允许 warn）';
    } else {
      measMsg = '无故障且无噪声时测量一致性残差应≈0，实际 ' + maxRm + ' kW';
    }
    quality.push(check(
      'conservation-meas', '测量一致性残差',
      measStatus,
      faulted ? '故障期允许非零（测量偏差，warn 允许）' : '≤ 1e-6 kW',
      maxRm,
      measMsg
    ));

    /* ---- units ---- */
    var unitIssues = [];
    var declaredUnits = (system.model && FL.systems && FL.systems._raw && FL.systems._raw.units) ? FL.systems._raw.units : {};
    var allowedUnits = Object.keys(declaredUnits).map(function (k) { return declaredUnits[k]; });
    allowedUnits.push('rpm'); /* 转速展示单位 */
    allowedUnits.push('pp');  /* SOC 误差百分点的展示单位 */
    (system.signals || []).forEach(function (sg) {
      if (!sg.unit || typeof sg.unit !== 'string') unitIssues.push(sg.id + ' 缺单位');
      else if (allowedUnits.indexOf(sg.unit) === -1) unitIssues.push(sg.id + ' 单位未声明：' + sg.unit);
    });
    quality.push(check(
      'units', '单位与量纲声明',
      unitIssues.length === 0 ? 'pass' : 'fail',
      '全部信号单位在 modelManifest.units 中声明',
      unitIssues.length,
      unitIssues.length === 0
        ? ((system.signals || []).length + ' 个信号单位齐备（' + allowedUnits.join('/') + '；rpm/pp 为展示单位）')
        : ('单位问题：' + unitIssues.join('；'))
    ));

    /* ---- soc-bounds ---- */
    var socTrueRange = minMaxNonEmpty(series.SOC_true_pct);
    var socEstRange = minMaxNonEmpty(series.SOC_est_pct);
    var socViolation = 0;
    var socOk = !!(socTrueRange && socEstRange);
    if (socTrueRange) {
      if (socTrueRange.min < -1e-6) { socOk = false; socViolation = Math.max(socViolation, -socTrueRange.min); }
      if (socTrueRange.max > 100 + 1e-6) { socOk = false; socViolation = Math.max(socViolation, socTrueRange.max - 100); }
    }
    if (socEstRange) {
      if (socEstRange.min < -1e-6) { socOk = false; socViolation = Math.max(socViolation, -socEstRange.min); }
      if (socEstRange.max > 100 + 1e-6) { socOk = false; socViolation = Math.max(socViolation, socEstRange.max - 100); }
    }
    quality.push(check(
      'soc-bounds', 'SOC 物理边界',
      socOk ? 'pass' : 'fail',
      'SOC_true 与 SOC_est ∈ [0, 100] %',
      socViolation,
      socOk
        ? ('SOC_true ∈ [' + socTrueRange.min.toFixed(5) + ', ' + socTrueRange.max.toFixed(5) + '] %；SOC_est ∈ [' +
          socEstRange.min.toFixed(5) + ', ' + socEstRange.max.toFixed(5) + '] %')
        : ('SOC 越界，最大越界量 ' + socViolation.toFixed(6) + ' pp')
    ));

    /* ---- event-window ---- */
    var eventOk;
    var eventMsg;
    if (!faulted) {
      eventOk = true;
      eventMsg = '健康基准运行无故障事件（events 为空属预期）';
    } else {
      var tStart = cfg.fault.t_start_s;
      var gridAligned = Math.abs(tStart * 10 - Math.round(tStart * 10)) < 1e-9;
      var ev = events[0];
      var evAligned = !!ev && Math.abs(ev.trigger_s - tStart) < 1e-9;
      var preOk = snapshots.length >= 2 && Math.abs(snapshots[0].t_s - (tStart - dt)) < 1e-9 && snapshots[0].phase === 'pre';
      var postOk = snapshots.length >= 2 && Math.abs(snapshots[1].t_s - tStart) < 1e-9 && snapshots[1].phase === 'post';
      var varsOk = !!(snapshots[0] && snapshots[0].variables && Object.keys(snapshots[0].variables).length);
      eventOk = gridAligned && evAligned && preOk && postOk && varsOk;
      eventMsg = eventOk
        ? ('事件 t=' + tStart.toFixed(1) + ' s 对齐 0.1 s 网格；pre@' + snapshots[0].t_s.toFixed(1) +
          ' s / post@' + snapshots[1].t_s.toFixed(1) + ' s 快照含 ' + Object.keys(snapshots[0].variables).length + ' 个变量')
        : ('事件窗口检查失败：网格' + (gridAligned ? 'OK' : '异常') + '，事件' + (evAligned ? 'OK' : '异常') +
          '，pre 快照' + (preOk ? 'OK' : '异常') + '，post 快照' + (postOk ? 'OK' : '异常'));
    }
    quality.push(check(
      'event-window', '事件与快照窗口',
      eventOk ? 'pass' : 'fail',
      '故障时刻在 0.1 s 网格；pre = t_start−0.1 s，post = t_start',
      faulted ? cfg.fault.t_start_s : 0,
      eventMsg
    ));

    /* ---- energy-balance ---- */
    var eSource = metricValue(metrics, 'E_source_kWh');
    var eBat = metricValue(metrics, 'E_bat_kWh');
    var eServed = metricValue(metrics, 'E_load_served_kWh');
    var balanceTol = system.id === 'GT-001' ? 1e-3 : (system.id === 'FC-001' ? 1e-3 : 1e-6);
    var residual = null;
    var balanceMsg;
    if (eSource === null || eBat === null || eServed === null) {
      balanceMsg = '能量指标不可用，无法校验能量平衡';
    } else if (system.id === 'GT-001') {
      var fArr = series.f_true_Hz;
      var fFirst = fArr && isNum(fArr[0]) ? fArr[0] : null;
      var fLast = fArr && isNum(fArr[fArr.length - 1]) ? fArr[fArr.length - 1] : null;
      if (fFirst === null || fLast === null) {
        balanceMsg = '频率信号不可用，无法校验含转子项的能量平衡';
      } else {
        var eRotor = (5.0 * (fLast - fFirst)) / 3600;
        residual = Math.abs(eSource + eBat - eServed - eRotor);
        balanceMsg = '|E_gen + E_bat − E_load − E_rotor| = ' + residual.toExponential(3) +
          ' kWh（E_rotor = K_J·Δf/3600 = ' + eRotor.toExponential(3) + ' kWh）';
      }
    } else {
      residual = Math.abs(eSource + eBat - eServed);
      balanceMsg = '|E_source + E_bat − E_load_served| = ' + residual.toExponential(3) + ' kWh';
    }
    var balanceOk = residual !== null && residual <= balanceTol;
    quality.push(check(
      'energy-balance', '电能平衡',
      balanceOk ? 'pass' : 'fail',
      '≤ ' + balanceTol + ' kWh' + (system.id === 'GT-001' ? '（含转子动能变化项）' : ''),
      residual,
      balanceOk ? balanceMsg : ('电能平衡超差：' + balanceMsg)
    ));

    return quality;
  }

  FL.core.checks = { evaluate: evaluate };
})();
