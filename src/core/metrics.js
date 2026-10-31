/* owner: core-engine | module: metrics | contract: NEXT/DATA_CONTRACT_SPEC.md §2.6 */
/* DerivedMetric：G0-DEC-09 契约字段（time_window_s / method / method_version /
   source_signal_ids / unavailable_reason / blindSafe / definition）+ 少量实现内部辅助字段
   （unavailable / focal / signal_id / signal_label —— 供 UI 使用，导出时由
   FL.contract.toContractMetric 投影为契约字段面）。
   FL-001 使用契约 P0 指标集 ID；FC/GT 冻结预览沿用旧 ID。
   方法标注（G0-DEC-06）：引擎解析积分 = analytic_flux（method_version analytic_flux.1）；
   仅有序列梯形回退（导入复核路径）= trapezoid（trapezoid_dt0.1），不得与 golden 混用。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};

  var CAP_KWH = 40;
  var FOCAL_SIGNAL = { 'FL-001': 'I_bat_true_A', 'FC-001': 'I_fc_true_A', 'GT-001': 'P_gen_true_kW' };
  var SOURCE_SIGNAL = { 'FL-001': 'P_gen_true_kW', 'FC-001': 'P_fc_true_kW', 'GT-001': 'P_gen_true_kW' };
  var P0_ANALYTIC = 'analytic_flux';
  var P0_ANALYTIC_VERSION = 'analytic_flux.1';
  var TRAP_VERSION = 'trapezoid_dt0.1';

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* 梯形积分（跳过 null；null 视为数据空洞并断开积分段） */
  function integrate(t, arr) {
    if (!arr) return null;
    var sum = 0;
    var prev = null;
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (!isNum(v)) { prev = null; continue; }
      if (prev !== null) sum += 0.5 * (prev + v) * (t[i] - t[i - 1]);
      prev = v;
    }
    return sum;
  }

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

  function lastValue(arr) {
    if (!arr) return null;
    for (var i = arr.length - 1; i >= 0; i--) if (isNum(arr[i])) return arr[i];
    return null;
  }

  function minValue(arr, fromIndex) {
    if (!arr) return null;
    var m = Infinity;
    var found = false;
    for (var i = fromIndex || 0; i < arr.length; i++) {
      if (!isNum(arr[i])) continue;
      found = true;
      if (arr[i] < m) m = arr[i];
    }
    return found ? m : null;
  }

  function indexAt(t, time) {
    var dt = t.length > 1 ? (t[t.length - 1] - t[0]) / (t.length - 1) : 0.1;
    var idx = Math.round(time / dt);
    if (idx < 0) idx = 0;
    if (idx > t.length - 1) idx = t.length - 1;
    return idx;
  }

  function valueAt(t, arr, time) {
    if (!arr) return null;
    var v = arr[indexAt(t, time)];
    return isNum(v) ? v : null;
  }

  /* 频率恢复时间：故障后最后一个 |f-50| > tol 的采样之后（s）；永不完全恢复 => null
     （GT load_step 旧「8–20 s 恢复」口径已废除——G2b v1.1 §4；f_recovery 为参考值，未收敛返回 null） */
  var FREQ_RECOVERY_TOL = 0.1;

  function recoveryTime(t, arr, tStart, tol) {
    if (!arr) return null;
    var startIdx = indexAt(t, tStart);
    var lastBad = -1;
    for (var i = startIdx; i < arr.length; i++) {
      if (!isNum(arr[i])) continue;
      if (Math.abs(arr[i] - 50) > tol) lastBad = i;
    }
    if (lastBad === -1) return 0;
    if (lastBad >= arr.length - 1) return null;
    return t[lastBad + 1] - tStart;
  }

  function findFaultDef(system, family) {
    if (!system || !system.faults) return null;
    for (var i = 0; i < system.faults.length; i++) if (system.faults[i].family === family) return system.faults[i];
    return null;
  }

  function compute(ctx) {
    var system = ctx.system;
    var cfg = ctx.config;
    var t = ctx.t;
    var series = ctx.series;
    var runId = ctx.runId;
    var duration = cfg.duration_s;
    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var def = findFaultDef(system, family);
    var param = def && def.params[0] ? def.params[0] : { unit: '', precision: 2 };
    var magnitude = faulted ? cfg.fault.params.magnitude : null;
    var noiseEnabled = !!(cfg.noise && cfg.noise.enabled);
    var isFL = system.id === 'FL-001';

    /* 能量/SOC 方法标注：有引擎解析积分为 analytic_flux；只有序列时回退 trapezoid（导入复核） */
    var eMethod = ctx.integrals ? P0_ANALYTIC : 'trapezoid';
    var eVersion = ctx.integrals ? P0_ANALYTIC_VERSION : TRAP_VERSION;

    var metrics = [];
    function mk(id, label, value, unit, precision, method, extra) {
      var available = isNum(value);
      var m = {
        metric_id: id,
        label: label,
        value: available ? value : null,
        unit: unit || '',
        precision: precision == null ? 3 : precision,
        time_window_s: [0, duration],
        time_window: [0, duration],
        method: method || eMethod,
        method_version: (method === P0_ANALYTIC || (!method && eMethod === P0_ANALYTIC)) ? P0_ANALYTIC_VERSION
          : (method === 'trapezoid' || (!method && eMethod === 'trapezoid')) ? TRAP_VERSION : '1',
        source_signal_ids: [],
        source_run_ids: [runId],
        unavailable_reason: available ? null : '不可用（数据缺失或场景不适用，禁止填 0）',
        blindSafe: false,
        definition: '',
        source_kind: 'DERIVED',
        focal: false,
        unavailable: !available
      };
      if (extra) {
        Object.keys(extra).forEach(function (k) { m[k] = extra[k]; });
        if (extra.time_window_s) m.time_window = extra.time_window_s.slice();
      }
      metrics.push(m);
      return m;
    }

    /* ---- 能量指标：优先使用引擎内部解析积分（analytic_flux），否则回退到序列梯形积分 ---- */
    var integrals = ctx.integrals || null;
    var eLoad = integrate(t, series.P_load_demand_kW);
    var eServed = integrate(t, series.P_load_served_kW);
    var srcSig = SOURCE_SIGNAL[system.id];
    var eSource = srcSig ? integrate(t, series[srcSig]) : null;
    var eBat = integrate(t, series.P_bat_true_kW);
    if (integrals) {
      if (isNum(integrals.E_load)) eLoad = integrals.E_load;
      if (isNum(integrals.E_load)) eServed = integrals.E_load;
      if (isNum(integrals.E_source)) eSource = integrals.E_source;
      if (isNum(integrals.E_bat)) eBat = integrals.E_bat;
    }
    var srcLabel = system.id === 'FC-001' ? '电堆真实电能' : '发电机真实电能';

    mk('E_load_kWh', '负载需求电能', eLoad === null ? null : eLoad / 3600, 'kWh', 5,
      null, {
        source_signal_ids: ['P_load_demand_kW'],
        blindSafe: true,
        definition: '∫ P_load,demand dt / 3600（需求，非实际服务）'
      });
    mk(isFL ? 'E_load_served_60s' : 'E_load_served_kWh', '负载实际服务电能',
      eServed === null ? null : eServed / 3600, 'kWh', 5,
      null, {
        source_signal_ids: ['P_load_served_kW'],
        blindSafe: true,
        definition: '∫ P_load,served dt / 3600'
      });
    mk(isFL ? 'E_gen_true_60s' : 'E_source_kWh', srcLabel,
      eSource === null ? null : eSource / 3600, 'kWh', 5,
      null, {
        source_signal_ids: [srcSig],
        blindSafe: false,
        definition: '∫ ' + srcSig + ' dt / 3600（' + srcLabel + '）；P_gen := P_load − P_bat 为定义'
      });
    mk(isFL ? 'E_bat_true_60s' : 'E_bat_kWh', '电池真实电能（带符号）',
      eBat === null ? null : eBat / 3600, 'kWh', 5,
      null, {
        source_signal_ids: ['P_bat_true_kW'],
        blindSafe: false,
        definition: '∫ P_bat,true dt / 3600；放电为正；数值为解析模型口径，未与实测校准'
      });

    /* ---- SOC ---- */
    var socTrueEnd = lastValue(series.SOC_true_pct);
    var socEstEnd = lastValue(series.SOC_est_pct);
    mk('SOC_true_end_pct', '真实 SOC 末值', socTrueEnd, '%', 5,
      null, {
        source_signal_ids: ['SOC_true_pct'],
        blindSafe: false,
        definition: 'SOC% = SOC0 − 100·(1/40)·∫P_bat,true dt/3600（末采样值）'
      });
    mk('SOC_est_end_pct', '估计 SOC 末值', socEstEnd, '%', 5,
      null, {
        source_signal_ids: ['SOC_est_pct'],
        blindSafe: true,
        definition: 'SOC% = SOC0 − 100·(1/40)·∫P_bat,meas dt/3600（naive_coulomb_counting，末采样值）'
      });
    var socErr = (isNum(socTrueEnd) && isNum(socEstEnd)) ? (socEstEnd - socTrueEnd) : null;
    mk(isFL ? 'SOC_err_end_pp' : 'SOC_err_pp', 'SOC 估计误差（估计−真实）', socErr, 'pp', 5,
      null, {
        source_signal_ids: ['SOC_est_pct', 'SOC_true_pct'],
        blindSafe: false,
        definition: 'SOC_est − SOC_true，单位百分点 pp（不得写成 %）'
      });

    /* ---- 残差 ---- */
    mk('max_abs_r_true_kW', '最大真实功率平衡残差', maxAbs(series.r_true_kW), 'kW', 6,
      'algebraic', {
        method_version: '1',
        source_signal_ids: ['r_true_kW'],
        blindSafe: false,
        definition: 'max |r_true|；定义恒等式（P_gen := P_load − P_bat），仅作代数一致性回归，不是物理验证'
      });
    mk(system.id === 'GT-001' ? 'max_abs_f_channel_diff_Hz' : 'max_abs_r_meas_kW',
      system.id === 'GT-001' ? '最大频率通道不一致' : '最大测量一致性残差',
      maxAbs(system.id === 'GT-001' ? series.f_channel_diff_Hz : series.r_meas_kW),
      system.id === 'GT-001' ? 'Hz' : 'kW', 4,
      'algebraic', {
        method_version: '1',
        source_signal_ids: [system.id === 'GT-001' ? 'f_channel_diff_Hz' : 'r_meas_kW'],
        time_window_s: faulted ? [tStart, duration] : [0, duration],
        blindSafe: true,
        definition: 'max |r_meas| = 0.4·|b(t)|；故障期非零来自测量偏差，不是能量损失'
      });

    /* ---- FL-001 P0 契约附加点值指标（DATA_CONTRACT_SPEC §2.6） ---- */
    if (isFL) {
      var iTrue26 = valueAt(t, series.I_bat_true_A, 26.0);
      mk('I_true_26s_A', '真实电流 @26 s', iTrue26, 'A', 4,
        'analytic', {
          method_version: '1',
          source_signal_ids: ['I_bat_true_A'],
          time_window_s: [26, 26],
          blindSafe: false,
          definition: 'I_true(26 s) 采样行值；golden 断言以 MODEL_VALIDATION_SPEC §3.2 为准'
        });
      var iMeasPost = faulted ? valueAt(t, series.I_bat_meas_A, tStart) : null;
      mk('I_meas_20post_A', '测量电流事件 post 值', iMeasPost, 'A', 4,
        'analytic', {
          method_version: '1',
          source_signal_ids: ['I_bat_meas_A'],
          time_window_s: faulted ? [tStart, tStart] : [0, 0],
          blindSafe: true,
          definition: 't_f=20.0 s post 采样行的 I_meas（= I_true + b）'
        });
    }

    /* ---- 故障元数据 ---- */
    mk('fault_active_s', '故障激活时刻', faulted ? tStart : null, 's', 1,
      null, {
        source_signal_ids: [],
        blindSafe: false,
        definition: faulted ? '故障事件 onset 时刻' : '无故障运行'
      });
    mk('fault_duration_s', '故障持续时长', faulted ? (duration - tStart) : 0, 's', 1,
      null, {
        source_signal_ids: [],
        blindSafe: false,
        definition: faulted ? 'duration_s − t_start_s（故障持续到仿真结束）' : '无故障运行，时长为 0'
      });
    mk('fault_peak_magnitude', '故障峰值幅值', faulted ? magnitude : null, param.unit || '', 2,
      null, {
        source_signal_ids: [],
        blindSafe: false,
        definition: faulted ? ('故障参数 magnitude，单位 ' + (param.unit || '—')) : '无故障运行'
      });

    var modeValue = faulted ? cfg.feedback_mode : 'healthy';
    metrics.push({
      metric_id: 'effective_mode',
      label: '实际生效的控制模式',
      value: modeValue,
      unit: '',
      precision: 0,
      time_window_s: [0, duration],
      time_window: [0, duration],
      method: 'algebraic',
      method_version: '1',
      source_signal_ids: [],
      source_run_ids: [runId],
      unavailable_reason: null,
      blindSafe: true,
      definition: '配置的 feedback_mode；无故障时记为 healthy',
      source_kind: 'CONFIG',
      focal: false,
      unavailable: false
    });

    /* ---- focal_change：从故障时刻起的实际焦点信号变化量 ---- */
    var focalSig = FOCAL_SIGNAL[system.id];
    var focalMeta = null;
    if (system.signals) {
      for (var i = 0; i < system.signals.length; i++) if (system.signals[i].id === focalSig) focalMeta = system.signals[i];
    }
    var focalValue = null;
    if (faulted && focalSig) {
      var fEnd = valueAt(t, series[focalSig], duration);
      var fStart = valueAt(t, series[focalSig], tStart);
      if (isNum(fEnd) && isNum(fStart)) focalValue = fEnd - fStart;
    }
    mk(isFL ? 'focal_change_A' : 'focal_change', '焦点信号实际变化量（故障时刻→结束）', focalValue,
      focalMeta ? focalMeta.unit : '', 2,
      'analytic', {
        method_version: '1',
        source_signal_ids: [focalSig],
        time_window_s: faulted ? [tStart, duration] : [0, duration],
        blindSafe: false,
        definition: faulted ? ('从 t_start_s 到 duration_s 的 ' + focalSig + ' 变化量（末值−故障时刻值）') : '无故障运行，不适用',
        focal: true,
        signal_id: focalSig,
        signal_label: focalMeta ? focalMeta.label : focalSig
      });

    /* ---- GT-001 专属：频率最低点 / 恢复时间 / 转子动能 ---- */
    if (system.id === 'GT-001') {
      var fArr = series.f_true_Hz;
      var fMin = minValue(fArr, 0);
      var fStartIdx = faulted ? indexAt(t, tStart) : 0;
      var fMinAfter = minValue(fArr, fStartIdx);
      mk('f_nadir_Hz', '真实频率最低点', fMinAfter, 'Hz', 3,
        null, {
          source_signal_ids: ['f_true_Hz'],
          blindSafe: false,
          definition: '故障后真实频率的最小值（转子惯量响应）'
        });
      var recovery = faulted ? recoveryTime(t, fArr, tStart, FREQ_RECOVERY_TOL) : null;
      mk('f_recovery_s', '频率恢复时间（|Δf| ≤ 0.1 Hz）', recovery, 's', 1,
        null, {
          source_signal_ids: ['f_true_Hz'],
          blindSafe: false,
          definition: '故障后最后一次 |f−50| > 0.1 Hz 之后的时间；未完全恢复记为不可用'
        });
      var fFirst = valueAt(t, fArr, 0);
      var fLast = valueAt(t, fArr, duration);
      var eRotor = (isNum(fFirst) && isNum(fLast)) ? (5.0 * (fLast - fFirst)) / 3600 : null;
      mk('E_rotor_kWh', '转子动能变化（电能当量）', eRotor, 'kWh', 6,
        null, {
          source_signal_ids: ['f_true_Hz'],
          blindSafe: false,
          definition: 'K_J × (f_end − f_start) / 3600，K_J = 5.0 kW·s/Hz'
        });
      void fMin;
      void noiseEnabled;
    }

    return metrics;
  }

  FL.core.metrics = { compute: compute };
})();
