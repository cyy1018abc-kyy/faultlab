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

  /* FL-001 契约指标 ID（DATA_CONTRACT_SPEC §2.6）与旧 ID 的别名解析（与 engine.js 一致） */
  var METRIC_ALIAS = {
    E_bat_kWh: ['E_bat_true_60s'],
    E_source_kWh: ['E_gen_true_60s'],
    E_load_served_kWh: ['E_load_served_60s'],
    SOC_err_pp: ['SOC_err_end_pp'],
    focal_change: ['focal_change_A']
  };

  function findMetricAny(metrics, id) {
    var m = findMetric(metrics, id);
    if (m) return m;
    var alts = METRIC_ALIAS[id] || [];
    for (var i = 0; i < alts.length; i++) {
      m = findMetric(metrics, alts[i]);
      if (m) return m;
    }
    return null;
  }

  function metricValue(metrics, id) {
    var m = findMetricAny(metrics, id);
    return (m && !m.unavailable && isNum(m.value)) ? m.value : null;
  }

  /* QualityChecks（契约 §2.7）：observed/expected/tolerance/reason/owner 为契约字段；
     label/computed_value/message 为 UI 兼容别名（导出时由 FL.contract.toContractCheck 投影）。 */
  function check(id, label, status, tolerance, computedValue, message, expected, owner) {
    var observed = (computedValue === null || computedValue === undefined) ? null : computedValue;
    return {
      check_id: id,
      label: label,
      status: status,
      observed: observed,
      computed_value: observed,
      expected: expected === undefined ? null : expected,
      tolerance: tolerance,
      reason: message,
      message: message,
      owner: owner || 'numeric'
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

    /* ---- conservation-true（PHY-01 定义自洽：G0-DEC-12 冻结 FL-001 容差 ≤1e-12 kW）----
       注意：这是定义恒等式的代数一致性回归（P_gen := P_load − P_bat），
       不是"物理守恒验证"，更不能表述为模型验证（MODEL_VALIDATION_SPEC §4.3）。 */
    var tolTrue = system.id === 'GT-001' ? 1e-9 : (system.id === 'FC-001' ? 1e-6 : 1e-12);
    var maxRt = maxAbs(series.r_true_kW);
    var trueOk = maxRt !== null && maxRt <= tolTrue;
    quality.push(check(
      'conservation-true', '定义自洽（代数一致性）',
      trueOk ? 'pass' : 'fail',
      '≤ ' + tolTrue + ' kW' + (system.id === 'GT-001' ? '（含 P_rotor 项）' : ''),
      maxRt,
      trueOk
        ? ('定义自洽检查通过：max|r_true| = ' + maxRt.toExponential(2) + ' kW，在容差内' +
          '（定义恒等式回归，不是物理守恒验证）' +
          (system.id === 'GT-001' ? '；含转子惯量项 P_rotor' : ''))
        : ('定义自洽检查未通过：P_gen ≠ P_load − P_bat，max|r_true| = ' + maxRt + ' kW > ' + tolTrue + ' kW'),
      0, 'numeric'
    ));

    /* ---- conservation-meas ---- */
    if (system.id === 'GT-001') {
      /* GT：r_meas 已废除（G2b v1.1 条件 2）——改为频率通道冗余一致性检查。
         无噪声 golden 口径 max|f_channel_diff| ≤ 1e-9 Hz；故障期 = b(t) 属预期检测信号（warn）。 */
      var maxFd = maxAbs(series.f_channel_diff_Hz);
      var fdStatus;
      if (maxFd === null) fdStatus = 'fail';
      else if (maxFd <= 1e-9) fdStatus = 'pass';
      else if (faulted) fdStatus = 'warn';
      else if (noiseEnabled) fdStatus = 'warn';
      else fdStatus = 'fail';
      var fdMsg;
      if (fdStatus === 'pass') fdMsg = '频率通道冗余不一致最大 ' + maxFd.toExponential(2) + ' Hz（健康口径 ≤1e-9）';
      else if (fdStatus === 'warn' && faulted) fdMsg = '故障期间通道不一致 ' + maxFd.toFixed(3) + ' Hz：这是测量偏差（检测信号），不是能量损失';
      else if (fdStatus === 'warn') fdMsg = '观测噪声开启，通道不一致 ' + maxFd.toFixed(4) + ' Hz 非零（演示用噪声，允许 warn）';
      else fdMsg = '无故障且无噪声时通道不一致应≤1e-9 Hz，实际 ' + maxFd + ' Hz';
      quality.push(check(
        'conservation-meas', '频率通道冗余一致性',
        fdStatus,
        faulted ? '故障期等于偏置量（检测信号，warn 允许）' : '≤ 1e-9 Hz',
        maxFd,
        fdMsg
      ));
    } else {
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
      measMsg = '故障期间测量一致性残差为 ' + maxRm.toFixed(2) + ' kW：这是测量偏差，不是能量损失（真实口径由 conservation-true 单独校验）';
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
    }

    /* ---- GT 专属 PHY（G2b v1.1 §3/§5；CHG-20261030-06 批准口径）---- */
    if (system.id === 'GT-001') {
      /* gt-energy-consistency：线性化能量离散自洽（代数恒等，非物理验证）。
         ∫P_rotor 取子步左矩形（与 f 更新同式，= K_J·Δf 精确 telescoping，经 E_rotor 指标承载）；
         二次型 ΔE_kin 与线性化能量之差 = 线性化截断残差 K_J·Δf²/(2f₀)（恒正）。 */
      var fArrGt = series.f_true_Hz;
      var fEndGt = fArrGt && fArrGt.length ? fArrGt[fArrGt.length - 1] : null;
      if (fEndGt !== null) {
        var dfGt = fEndGt - 50;
        var dEkGt = (5.0 * 50 / 2) * ((fEndGt / 50) * (fEndGt / 50) - 1); /* kW·s */
        var eLinGt = null;
        (metrics || []).forEach(function (m) {
          if (m.metric_id === 'E_rotor_kWh' && m.value != null) eLinGt = m.value * 3600;
        });
        var truncGt = 5.0 * dfGt * dfGt / (2 * 50);
        var eResid = (eLinGt !== null && !isNaN(eLinGt)) ? Math.abs(dEkGt - eLinGt - truncGt) : null;
        var eOk = eResid !== null && eResid <= 1e-6;
        quality.push(check(
          'gt-energy-consistency', '线性化能量离散自洽（含截断残差项）',
          eOk ? 'pass' : 'fail', 'numeric',
          eResid,
          'ΔE_kin − ∫P_rotor − K_J·Δf²/(2f₀) = ' + (eResid === null ? '不可用' : eResid.toExponential(2)) +
            ' kW·s（代数恒等回归：验证离散自洽与线性化截断项量级，不是物理验证）'
        ));
      }
      /* gt-bat-envelope：变流器物理包络 ±25 kW（合法参数域内恒过；±15 kW 短时额定为假设/UI 警示） */
      var maxPbatGt = maxAbs(series.P_bat_true_kW);
      var envOk = maxPbatGt !== null && maxPbatGt <= 25;
      quality.push(check(
        'gt-bat-envelope', '电池功率在变流器包络内（±25 kW）',
        envOk ? 'pass' : 'fail', 'numeric',
        maxPbatGt,
        'max|P_bat| = ' + (maxPbatGt === null ? '不可用' : maxPbatGt.toFixed(3)) + ' kW；工作点超 ±15 kW 时依赖短时过载假设（长时运行须降额）'
      ));
    }

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

    /* ---- event-window（G0-DEC-05：pre = t_f 左极限，t_s 恒为 t_f；19.9 不是 pre）---- */
    var eventOk;
    var eventMsg;
    if (!faulted) {
      eventOk = true;
      eventMsg = '健康基准运行无故障事件（events 为空属预期）';
    } else {
      var tStart = cfg.fault.t_start_s;
      var gridAligned = Math.abs(tStart / dt - Math.round(tStart / dt)) < 1e-9;
      var ev = events[0];
      var evAligned = !!ev && Math.abs(ev.trigger_s - tStart) < 1e-9;
      var pre = snapshots.length >= 2 ? snapshots.filter(function (s) { return s.phase === 'pre'; })[0] : null;
      var post = snapshots.length >= 2 ? snapshots.filter(function (s) { return s.phase === 'post'; })[0] : null;
      var preOk = !!pre && Math.abs(pre.t_s - tStart) < 1e-9 && pre.derivation === 'left_limit';
      var postOk = !!post && Math.abs(post.t_s - tStart) < 1e-9 && post.derivation === 'post_sample';
      var varsOk = !!(pre && pre.variables && Object.keys(pre.variables).length);
      eventOk = gridAligned && evAligned && preOk && postOk && varsOk;
      eventMsg = eventOk
        ? ('事件 t=' + tStart.toFixed(1) + ' s 对齐 0.1 s 网格；pre/post 快照 t_s 均为 ' + tStart.toFixed(1) +
          ' s（pre=左极限 left_limit，post=右采样行 post_sample），含 ' + Object.keys(pre.variables).length + ' 个变量；19.9 s 只是上一常规采样点')
        : ('事件窗口检查失败：网格' + (gridAligned ? 'OK' : '异常') + '，事件' + (evAligned ? 'OK' : '异常') +
          '，pre 快照' + (preOk ? 'OK' : '异常') + '（t_s 必须为 ' + tStart.toFixed(1) + ' 且 derivation=left_limit）' +
          '，post 快照' + (postOk ? 'OK' : '异常'));
    }
    quality.push(check(
      'event-window', '事件与快照相位',
      eventOk ? 'pass' : 'fail',
      'pre.t_s = post.t_s = t_f（20.0），derivation = left_limit / post_sample',
      faulted ? cfg.fault.t_start_s : 0,
      eventMsg,
      faulted ? cfg.fault.t_start_s : null, 'numeric'
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
