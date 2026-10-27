/* owner: arena-agents | module: agents-builtin | contract: docs/CONTRACT.md */
/* =========================================================================
   FaultLab — 内置确定性诊断演示 Agent 套件（合成场景扩展预览）
   盲测接口：create(meta) -> {reset(), observe(sample, meta), diagnose()}
   sample 只包含 blindVisible 观测通道；本文件不访问 run / config / 真值。
   所有算法均为确定性规则/统计式实现，不使用 Math.random，不是 LLM。
   ========================================================================= */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};
  const AGENTS = FL.agents = FL.agents || {};

  const AGENTS_VERSION = '0.1';
  const BUILTINS = [];

  const FAMILY_LABELS = {
    sensor_drift: '传感器漂移',
    load_step: '负载冲击',
    actuator_fault: '执行器异常',
    none: '健康'
  };

  /* 阈值（观测口径，非真值口径）。单位随通道单位。 */
  const T = {
    residual_kW: 0.9,        // 测量一致性残差
    load_kW: 2.5,            // 负荷需求阶跃（catalog 最小幅值 5 kW）
    speed_Hz: 0.06,          // 转速折算频率 vs 电气频率交叉校验（偏置默认 0.3 Hz）
    valve_pct: 8,            // 阀位指令 vs 实际
    command_norm: 0.15,      // 指令-反馈相对差（0..1）
    persist: { load: 1, residual: 2, speed: 2, valve: 2, command: 3 }
  };

  /* 部件推断：静态系统结构知识，不是真值。 */
  const SYSTEM_COMPONENT_PREF = {
    'FL-001': {
      sensor_drift: ['sensor', 'current_sensor'],
      load_step: ['load'],
      actuator_fault: ['converter', 'dc_dc_converter']
    },
    'FC-001': {
      sensor_drift: ['sensor', 'current_sensor'],
      load_step: ['load'],
      actuator_fault: ['valve', 'fuel_valve', 'fc_converter']
    },
    'GT-001': {
      sensor_drift: ['speed_sensor', 'sensor'],
      load_step: ['load'],
      actuator_fault: ['valve', 'fuel_valve', 'turbine']
    }
  };

  const COMPONENT_PATTERNS = {
    sensor_drift: [/speed[_-]?sensor/i, /sensor/i, /转速/, /传感器/],
    load_step: [/load/i, /demand/i, /负载/, /负荷/],
    actuator_fault: [/valve/i, /阀/, /converter/i, /变换/, /turbine/i, /涡轮/, /actuator/i, /执行/]
  };

  /* ---------------------------------------------------------------- util */
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function round(v, d) {
    if (!isNum(v)) return v;
    const p = Math.pow(10, d == null ? 2 : d);
    return Math.round(v * p) / p;
  }
  function abs(v) { return v < 0 ? -v : v; }

  function buildContext(meta) {
    const m = meta || {};
    const observables = (m.observables || []).filter((o) => o && typeof o.id === 'string');
    const byId = {};
    observables.forEach((o) => { byId[o.id] = o; });
    const ids = Object.keys(byId);
    const has = (id) => Object.prototype.hasOwnProperty.call(byId, id);
    const components = (m.components || []).filter((c) => c && c.id);
    return {
      systemId: m.systemId || 'FL-001',
      duration: isNum(m.duration_s) && m.duration_s > 0 ? m.duration_s : 60,
      dt: isNum(m.dt_s) && m.dt_s > 0 ? m.dt_s : 0.1,
      observables,
      ids,
      byId,
      has,
      components,
      faultFamilies: (m.faultFamilies && m.faultFamilies.length ? m.faultFamilies : [
        { id: 'sensor_drift', label: FAMILY_LABELS.sensor_drift },
        { id: 'load_step', label: FAMILY_LABELS.load_step },
        { id: 'actuator_fault', label: FAMILY_LABELS.actuator_fault }
      ])
    };
  }

  function resolveComponent(ctx, family) {
    if (!family || family === 'none') return 'none';
    const comps = ctx.components || [];
    if (!comps.length) return 'none';
    const pref = (SYSTEM_COMPONENT_PREF[ctx.systemId] || {})[family] || [];
    // 1) 系统静态结构中的首选 id
    for (let i = 0; i < pref.length; i++) {
      for (let j = 0; j < comps.length; j++) {
        if (comps[j].id === pref[i]) return comps[j].id;
      }
    }
    // 2) 语义匹配
    const patterns = COMPONENT_PATTERNS[family] || [];
    for (let p = 0; p < patterns.length; p++) {
      for (let j = 0; j < comps.length; j++) {
        const id = String(comps[j].id || '');
        const label = String(comps[j].label || '');
        if (patterns[p].test(id) || patterns[p].test(label)) return comps[j].id;
      }
    }
    // 3) 最后回退到非电源/母线/负载的首个部件
    for (let j = 0; j < comps.length; j++) {
      if (!/battery|bus|load|generator|grid/i.test(comps[j].id)) return comps[j].id;
    }
    return comps[0].id;
  }

  /* ------------------------------------------------------- feature engine */
  /* 共享特征提取：基线、平滑、通道交叉校验。只读 sample.s 中的盲观测。 */
  function createFeatureExtractor(ctx) {
    const has = ctx.has;
    const dt = ctx.dt;
    const duration = ctx.duration;
    const baseEnd = Math.min(1.0, Math.max(0.4, duration * 0.04));
    const alpha = 0.35;
    const sums = {}, counts = {}, bases = {};
    let ready = false;
    let cursor = 0;

    const powerChannel = pickCommandChannel(ctx);
    const hasValve = has('valve_cmd_pct') && has('valve_meas_pct');
    const hasSpeed = has('n_meas_rpm') && has('f_meas_Hz');
    const hasResidual = has('r_meas_kW');

    const fx = {
      t: 0, index: 0, ready: false,
      residual: 0, residualEma: 0,
      loadDelta: 0, loadDeltaEma: 0,
      speedGap: 0, speedGapEma: 0,
      valveGap: 0, valveGapEma: 0,
      commandGap: 0, commandNorm: 0, commandNormEma: 0,
      commandRef: 0, commandAct: 0, commandRefEma: 0, commandActEma: 0,
      valveCmd: 0, valveMeas: 0, valveMeasEma: 0,
      freqDev: 0,
      peak: { residual: 0, load: 0, speed: 0, valve: 0, command: 0 }
    };

    function seedEma(key, raw) {
      fx[key] = isNum(raw) ? raw : 0;
    }
    function smooth(key, raw) {
      const v = isNum(raw) ? raw : 0;
      if (!ready) { fx[key] = v; return; }
      fx[key] = alpha * v + (1 - alpha) * fx[key];
    }
    function trackPeak(key, raw) {
      const a = abs(isNum(raw) ? raw : 0);
      if (a > fx.peak[key]) fx.peak[key] = a;
    }

    function observe(sample) {
      if (!sample || typeof sample !== 'object') return;
      cursor += 1;
      const t = isNum(sample.t) ? sample.t : (cursor - 1) * dt;
      fx.t = t;
      fx.index = cursor - 1;
      const s = sample.s && typeof sample.s === 'object' ? sample.s : {};

      // 初始基线：只取故障目录最早可能注入时刻之前的窗口
      if (t <= baseEnd + 1e-9) {
        ctx.ids.forEach((id) => {
          const v = s[id];
          if (!isNum(v)) return;
          sums[id] = (sums[id] || 0) + v;
          counts[id] = (counts[id] || 0) + 1;
          bases[id] = sums[id] / counts[id];
        });
      }
      if (!ready && t > baseEnd + 1e-9) {
        ready = true;
        fx.ready = true;
        seedEma('residualEma', 0);
        seedEma('loadDeltaEma', 0);
        seedEma('speedGapEma', 0);
        seedEma('valveGapEma', 0);
        seedEma('commandNormEma', 0);
        seedEma('commandRefEma', powerChannel ? bases[powerChannel.refId] : 0);
        seedEma('commandActEma', powerChannel ? bases[powerChannel.actId] : 0);
        seedEma('valveMeasEma', bases.valve_meas_pct || 0);
      }

      const baseLoad = isNum(bases.P_load_demand_kW) ? bases.P_load_demand_kW : null;
      const baseFreq = isNum(bases.f_meas_Hz) ? bases.f_meas_Hz : null;

      const residualRaw = hasResidual && isNum(s.r_meas_kW) ? s.r_meas_kW : 0;
      const loadRaw = has('P_load_demand_kW') && isNum(s.P_load_demand_kW) && baseLoad != null
        ? s.P_load_demand_kW - baseLoad : 0;
      const speedRaw = hasSpeed && isNum(s.n_meas_rpm) && isNum(s.f_meas_Hz)
        ? s.n_meas_rpm / 60 - s.f_meas_Hz : 0;
      const valveRaw = hasValve && isNum(s.valve_cmd_pct) && isNum(s.valve_meas_pct)
        ? s.valve_cmd_pct - s.valve_meas_pct : 0;
      const freqRaw = has('f_meas_Hz') && isNum(s.f_meas_Hz) && baseFreq != null
        ? s.f_meas_Hz - baseFreq : 0;

      let cmdGapRaw = 0;
      let cmdNormRaw = 0;
      let refRaw = 0;
      let actRaw = 0;
      if (powerChannel && isNum(s[powerChannel.refId]) && isNum(s[powerChannel.actId])) {
        refRaw = s[powerChannel.refId];
        actRaw = s[powerChannel.actId];
        cmdGapRaw = refRaw - actRaw;
        const refBase = bases[powerChannel.refId];
        const denom = Math.max(abs(isNum(refBase) ? refBase : (powerChannel.unit === 'A' ? 25 : 20)), 1);
        cmdNormRaw = cmdGapRaw / denom;
      }

      const valveMeasRaw = has('valve_meas_pct') && isNum(s.valve_meas_pct) ? s.valve_meas_pct : 0;

      fx.residual = residualRaw;
      fx.loadDelta = loadRaw;
      fx.speedGap = speedRaw;
      fx.valveGap = valveRaw;
      fx.commandGap = cmdGapRaw;
      fx.commandNorm = cmdNormRaw;
      fx.commandRef = refRaw;
      fx.commandAct = actRaw;
      fx.valveCmd = hasValve && isNum(s.valve_cmd_pct) ? s.valve_cmd_pct : 0;
      fx.valveMeas = valveMeasRaw;
      fx.freqDev = freqRaw;

      if (ready) {
        smooth('residualEma', residualRaw);
        smooth('loadDeltaEma', loadRaw);
        smooth('speedGapEma', speedRaw);
        smooth('valveGapEma', valveRaw);
        smooth('commandNormEma', cmdNormRaw);
        smooth('commandRefEma', refRaw);
        smooth('commandActEma', actRaw);
        smooth('valveMeasEma', valveMeasRaw);
        trackPeak('residual', residualRaw);
        trackPeak('load', loadRaw);
        trackPeak('speed', speedRaw);
        trackPeak('valve', valveRaw);
        trackPeak('command', cmdNormRaw);
      }
    }

    return {
      observe,
      fx,
      ctx,
      baseOf(id) { return isNum(bases[id]) ? bases[id] : null; },
      get ready() { return ready; }
    };
  }

  function pickCommandChannel(ctx) {
    if (ctx.has('I_ref_A') && ctx.has('I_bat_meas_A')) {
      return { refId: 'I_ref_A', actId: 'I_bat_meas_A', unit: 'A' };
    }
    if (ctx.has('I_fc_ref_A') && ctx.has('I_fc_meas_A')) {
      return { refId: 'I_fc_ref_A', actId: 'I_fc_meas_A', unit: 'A' };
    }
    if (ctx.has('P_gen_cmd_kW') && ctx.has('P_gen_meas_kW')) {
      return { refId: 'P_gen_cmd_kW', actId: 'P_gen_meas_kW', unit: 'kW' };
    }
    return null;
  }

  /* ---------------------------------------------------- magnitude helpers */
  function estimateSensorMagnitude(fx, ctx) {
    if (ctx.has('n_meas_rpm') && ctx.has('f_meas_Hz')) {
      return { value: round(fx.speedGapEma, 3), unit: 'Hz' };
    }
    if (ctx.has('r_meas_kW')) {
      // 三个系统的等效系数均为 P_kW = 0.4 * I_A
      return { value: round(fx.residualEma / 0.4, 1), unit: 'A' };
    }
    return null;
  }

  function estimateLoadMagnitude(fx) {
    return { value: round(abs(fx.loadDeltaEma), 1), unit: 'kW' };
  }

  function estimateActuatorMagnitude(fx, ctx) {
    if (ctx.has('valve_meas_pct')) {
      return { value: round(fx.valveMeasEma, 1), unit: '%' };
    }
    if (ctx.has('I_ref_A') && ctx.has('I_bat_meas_A') && fx.commandRefEma > 1) {
      return { value: round(clamp(fx.commandActEma / fx.commandRefEma * 100, 0, 100), 1), unit: '%' };
    }
    if (ctx.has('I_fc_ref_A') && ctx.has('I_fc_meas_A') && fx.commandRefEma > 1) {
      return { value: round(clamp(fx.commandActEma / fx.commandRefEma * 100, 0, 100), 1), unit: '%' };
    }
    return null;
  }

  function magnitudeFor(family, fx, ctx) {
    if (family === 'sensor_drift') return estimateSensorMagnitude(fx, ctx);
    if (family === 'load_step') return estimateLoadMagnitude(fx);
    if (family === 'actuator_fault') return estimateActuatorMagnitude(fx, ctx);
    return null;
  }

  /* ------------------------------------------------------- explanation */
  function explain(ctx, family, fx, magnitude) {
    const magTxt = magnitude ? (round(magnitude.value, 2) + ' ' + magnitude.unit) : '—';
    if (family === 'sensor_drift') {
      if (ctx.has('n_meas_rpm') && ctx.has('f_meas_Hz')) {
        return '转速测量折算频率 n_meas/60 与电气频率 f_meas 持续相差 ' +
          round(fx.speedGapEma, 3) + ' Hz（阈值 ' + T.speed_Hz +
          ' Hz），而功率/负荷通道保持一致 → 转速传感器测量通道漂移，估计 ' + magTxt + '。';
      }
      return '测量一致性残差 r_meas 持续约 ' + round(fx.residualEma, 2) + ' kW（阈值 ' +
        T.residual_kW + ' kW），负荷需求未发生阶跃 → 测量通道内部不一致，判定传感器漂移；' +
        '按 P=0.4·I 换算，估计通道偏置 ' + magTxt + '。';
    }
    if (family === 'load_step') {
      return '负荷需求功率相对基线阶跃 ' + round(fx.loadDeltaEma, 2) + ' kW（阈值 ' +
        T.load_kW + ' kW），而测量一致性残差与指令跟踪未持续异常 → 负载冲击，幅值 ' + magTxt + '。';
    }
    if (family === 'actuator_fault') {
      const valve = ctx.has('valve_cmd_pct') && ctx.has('valve_meas_pct');
      if (valve) {
        return '阀位指令与阀位反馈持续相差 ' + round(fx.valveGapEma, 2) + ' 个百分点（阈值 ' +
          T.valve_pct + '），且测量一致性残差接近 0 → 执行器（阀门）异常，受限开度约 ' + magTxt + '。';
      }
      return '指令与反馈持续不匹配：相对偏差 ' + round(fx.commandNormEma * 100, 1) + '%（阈值 ' +
        round(T.command_norm * 100, 1) + '%），而测量一致性残差接近 0 → 执行器异常，估计输出受限 ' +
        magTxt + '。';
    }
    return '全部盲观测特征在阈值内：测量一致性残差≈0、负荷需求无阶跃、指令-反馈跟踪正常、' +
      '转速/电气频率交叉校验一致 → 未发现故障，判定为健康局。';
  }

  function healthyDiagnosis(ctx, fx, confidence, firstAlarmT) {
    return {
      faultDetected: false,
      faultType: 'none',
      component: 'none',
      magnitude: null,
      detectTime_s: null,
      confidence: clamp(confidence, 0, 1),
      explanation: explain(ctx, 'none', fx, null),
      firstAlarmT: firstAlarmT == null ? null : round(firstAlarmT, 1)
    };
  }

  function faultDiagnosis(ctx, fx, family, magnitude, detectTime, confidence, firstAlarmT) {
    return {
      faultDetected: true,
      faultType: family,
      component: resolveComponent(ctx, family),
      magnitude: magnitude,
      detectTime_s: detectTime == null ? null : round(detectTime, 1),
      confidence: clamp(confidence, 0, 1),
      explanation: explain(ctx, family, fx, magnitude),
      firstAlarmT: firstAlarmT == null ? null : round(firstAlarmT, 1)
    };
  }

  /* ------------------------------------------------------------- agents */

  /* 1) sensor-limit：固定阈值越限报警（最简基线）。
     只监视测量一致性残差、转速交叉校验与负荷需求；不分析指令-反馈偏差；
     幅值直接报告越限通道读数（不做物理量换算）——这是它的公开弱项。 */
  function buildSensorLimit(ctx) {
    const ext = createFeatureExtractor(ctx);
    let firstAlarmT = null;
    let latchedFamily = null;

    function detect(fx) {
      if (!fx.ready) return null;
      if (abs(fx.residualEma) > T.residual_kW) return 'sensor_drift';
      if (ctx.has('n_meas_rpm') && ctx.has('f_meas_Hz') && abs(fx.speedGapEma) > T.speed_Hz) return 'sensor_drift';
      if (abs(fx.loadDeltaEma) > T.load_kW) return 'load_step';
      return null;
    }

    return {
      getFirstAlarmT() { return firstAlarmT; },
      observe(sample) {
        ext.observe(sample);
        const fx = ext.fx;
        if (!fx.ready || firstAlarmT != null) return;
        const family = detect(fx);
        if (!family) return;
        firstAlarmT = fx.t;
        latchedFamily = family;
      },
      diagnose() {
        const fx = ext.fx;
        if (!latchedFamily) {
          // 健康局：可信分随特征峰值缓慢上升，但保持低位
          const peak = Math.max(abs(fx.peak.residual) / 5, abs(fx.peak.load) / 15,
            ctx.has('n_meas_rpm') ? abs(fx.peak.speed) / 0.5 : 0);
          return healthyDiagnosis(ctx, fx, 0.05 + 0.2 * clamp(peak, 0, 1), null);
        }
        // 阈值型 Agent 的幅值口径：直接报告越限通道当前读数
        let magnitude = null;
        if (latchedFamily === 'load_step') {
          magnitude = { value: round(abs(fx.loadDeltaEma), 1), unit: 'kW' };
        } else if (ctx.has('n_meas_rpm') && ctx.has('f_meas_Hz')) {
          magnitude = { value: round(abs(fx.speedGapEma), 3), unit: 'Hz' };
        } else {
          magnitude = { value: round(abs(fx.residualEma), 2), unit: 'kW' };
        }
        return faultDiagnosis(ctx, fx, latchedFamily, magnitude, firstAlarmT, 0.9, firstAlarmT);
      }
    };
  }

  /* 2) residual：模型残差 + 指令跟随差。
     强项：残差与指令跟踪两路证据；弱项：无转速/电气频率交叉校验，首报家族会被
     暂态残差锁定（负载阶跃瞬态可能误判为传感器）。 */
  function buildResidual(ctx) {
    const ext = createFeatureExtractor(ctx);
    let firstAlarmT = null;
    let latchedFamily = null;
    const streak = { residual: 0, command: 0, valve: 0, load: 0 };

    function tickStreak(key, above) {
      streak[key] = above ? streak[key] + 1 : 0;
      return streak[key];
    }

    return {
      getFirstAlarmT() { return firstAlarmT; },
      observe(sample) {
        ext.observe(sample);
        const fx = ext.fx;
        if (!fx.ready) return;
        const r = tickStreak('residual', abs(fx.residualEma) > T.residual_kW);
        const c = tickStreak('command', abs(fx.commandNormEma) > T.command_norm);
        const v = ctx.has('valve_cmd_pct') && ctx.has('valve_meas_pct')
          ? tickStreak('valve', abs(fx.valveGapEma) > T.valve_pct) : 0;
        const l = tickStreak('load', abs(fx.loadDeltaEma) > T.load_kW);
        if (firstAlarmT != null) return;
        let family = null;
        if (r >= 2) family = 'sensor_drift';
        else if (v >= 2 || c >= 3) family = 'actuator_fault';
        else if (l >= 3) family = 'load_step';
        if (family) { firstAlarmT = fx.t; latchedFamily = family; }
      },
      diagnose() {
        const fx = ext.fx;
        if (firstAlarmT == null) {
          const strength = Math.min(1, abs(fx.peak.residual) / 5 + abs(fx.peak.command) / 0.5 +
            abs(fx.peak.load) / 20);
          return healthyDiagnosis(ctx, fx, 0.04 + 0.12 * clamp(strength, 0, 1), null);
        }
        const magnitude = magnitudeFor(latchedFamily, fx, ctx);
        return faultDiagnosis(ctx, fx, latchedFamily, magnitude, firstAlarmT, 0.9, firstAlarmT);
      }
    };
  }

  /* 3) cusum：累积和变点检测。对同一特征的持续偏移敏感，检测略慢。 */
  function buildCusum(ctx) {
    const ext = createFeatureExtractor(ctx);
    let firstAlarmT = null;
    const cusum = { sensor: 0, load: 0, actuator: 0 };
    const maxCusum = { sensor: 0, load: 0, actuator: 0 };
    let crossedFamily = null;
    const H = 5;

    function add(name, amount) {
      cusum[name] = Math.max(0, cusum[name] + amount);
      if (cusum[name] > maxCusum[name]) maxCusum[name] = cusum[name];
    }

    return {
      getFirstAlarmT() { return firstAlarmT; },
      observe(sample) {
        ext.observe(sample);
        const fx = ext.fx;
        if (!fx.ready) return;
        const zr = Math.max(0, abs(fx.residualEma) / T.residual_kW - 0.6);
        const zs = ctx.has('n_meas_rpm') && ctx.has('f_meas_Hz')
          ? Math.max(0, abs(fx.speedGapEma) / T.speed_Hz - 0.6) : 0;
        const zl = Math.max(0, abs(fx.loadDeltaEma) / T.load_kW - 0.6);
        const zv = ctx.has('valve_cmd_pct') && ctx.has('valve_meas_pct')
          ? Math.max(0, abs(fx.valveGapEma) / T.valve_pct - 0.6) : 0;
        const zc = Math.max(0, abs(fx.commandNormEma) / T.command_norm - 0.6);
        add('sensor', zr + zs - 0.35);
        add('load', zl - 0.35);
        add('actuator', zv + zc - 0.35);
        if (firstAlarmT != null) return;
        let best = null;
        let bestVal = H;
        ['load', 'sensor', 'actuator'].forEach((k) => {
          if (cusum[k] > bestVal) { bestVal = cusum[k]; best = k; }
        });
        if (best) {
          firstAlarmT = fx.t;
          crossedFamily = best === 'load' ? 'load_step' : best === 'sensor' ? 'sensor_drift' : 'actuator_fault';
        }
      },
      diagnose() {
        const fx = ext.fx;
        if (firstAlarmT == null) {
          const peak = Math.max(maxCusum.sensor, maxCusum.load, maxCusum.actuator);
          return healthyDiagnosis(ctx, fx, 0.05 + 0.25 * clamp(peak / H, 0, 1), null);
        }
        // 最终家族取累积和最大的方向；若最大方向已衰减则回退首报方向
        let family = crossedFamily;
        let bestVal = -1;
        ['load', 'sensor', 'actuator'].forEach((k) => {
          if (maxCusum[k] > bestVal) {
            bestVal = maxCusum[k];
            family = k === 'load' ? 'load_step' : k === 'sensor' ? 'sensor_drift' : 'actuator_fault';
          }
        });
        const magnitude = magnitudeFor(family, fx, ctx);
        const conf = clamp(0.55 + 0.4 * clamp(bestVal / (H * 2), 0, 1), 0.5, 0.96);
        return faultDiagnosis(ctx, fx, family, magnitude, firstAlarmT, conf, firstAlarmT);
      }
    };
  }

  /* 4) bayes：手工特征的高斯朴素贝叶斯后验。 */
  function buildBayes(ctx) {
    const ext = createFeatureExtractor(ctx);
    let firstAlarmT = null;
    let posteriorEma = null;
    let peakPosterior = 0;

    const CLASSES = [
      { id: 'none', prior: 0.22, mean: [0, 0, 0, 0, 0], sd: [0.12, 0.07, 0.05, 0.08, 0.03] },
      { id: 'sensor_drift', prior: 0.26, mean: [0.95, 0.02, 0.02, 0.35, 0.95], sd: [0.3, 0.08, 0.05, 0.45, 0.3] },
      { id: 'load_step', prior: 0.26, mean: [0.02, 1.0, 0.02, 0.08, 0.02], sd: [0.1, 0.2, 0.05, 0.2, 0.06] },
      { id: 'actuator_fault', prior: 0.26, mean: [0.03, 0.05, 0.35, 0.85, 0.03], sd: [0.15, 0.1, 0.5, 0.35, 0.1] }
    ];

    function gauss(x, mu, sd) {
      const z = (x - mu) / sd;
      return -0.5 * z * z - Math.log(sd);
    }

    function features(fx) {
      return [
        clamp(abs(fx.residualEma) / 4, 0, 1.6),
        clamp(abs(fx.loadDeltaEma) / 10, 0, 1.6),
        clamp(abs(fx.valveGapEma) / 50, 0, 1.6),
        clamp(abs(fx.commandNormEma) / 0.45, 0, 1.6),
        clamp(abs(fx.speedGapEma) / 0.3, 0, 1.6)
      ];
    }

    function posterior(fx) {
      const x = features(fx);
      let best = -Infinity;
      const logs = CLASSES.map((c) => {
        let ll = Math.log(c.prior);
        for (let i = 0; i < x.length; i++) ll += gauss(x[i], c.mean[i], c.sd[i]);
        if (ll > best) best = ll;
        return ll;
      });
      const exps = logs.map((ll) => Math.exp(ll - best));
      const sum = exps.reduce((a, b) => a + b, 0) || 1;
      const byId = {};
      CLASSES.forEach((c, i) => { byId[c.id] = exps[i] / sum; });
      return byId;
    }

    return {
      getFirstAlarmT() { return firstAlarmT; },
      observe(sample) {
        ext.observe(sample);
        const fx = ext.fx;
        if (!fx.ready) return;
        const p = posterior(fx);
        const pFault = 1 - p.none;
        posteriorEma = posteriorEma == null ? pFault : 0.3 * pFault + 0.7 * posteriorEma;
        if (posteriorEma > peakPosterior) peakPosterior = posteriorEma;
        if (firstAlarmT == null && posteriorEma > 0.65) firstAlarmT = fx.t;
      },
      diagnose() {
        const fx = ext.fx;
        if (firstAlarmT == null) {
          return healthyDiagnosis(ctx, fx, 0.03 + 0.35 * clamp(peakPosterior, 0, 1), null);
        }
        const p = posterior(fx);
        let family = 'sensor_drift';
        let best = -1;
        ['sensor_drift', 'load_step', 'actuator_fault'].forEach((id) => {
          if (p[id] > best) { best = p[id]; family = id; }
        });
        const magnitude = magnitudeFor(family, fx, ctx);
        const conf = clamp(1 - p.none, 0.5, 0.97);
        return faultDiagnosis(ctx, fx, family, magnitude, firstAlarmT, conf, firstAlarmT);
      }
    };
  }

  /* 5) fusion：多信号融合 + 交叉校验 + 持续性判据 + 单位换算，综合最强。 */
  function buildFusion(ctx) {
    const ext = createFeatureExtractor(ctx);
    let firstAlarmT = null;
    let alarmFamily = null;
    const streak = { load: 0, residual: 0, speed: 0, valve: 0, command: 0 };

    function inc(key, above) {
      streak[key] = above ? streak[key] + 1 : 0;
      return streak[key];
    }

    function currentFamily(fx) {
      if (streak.load >= T.persist.load) return 'load_step';
      if (streak.valve >= T.persist.valve) return 'actuator_fault';
      if (streak.speed >= T.persist.speed) return 'sensor_drift';
      if (streak.residual >= T.persist.residual) return 'sensor_drift';
      if (streak.command >= T.persist.command) return 'actuator_fault';
      // 回退：按峰值证据强度选择
      const e = {
        sensor_drift: Math.max(abs(fx.peak.residual) / 4, abs(fx.peak.speed) / 0.3),
        load_step: abs(fx.peak.load) / 10,
        actuator_fault: Math.max(abs(fx.peak.valve) / 50, abs(fx.peak.command) / 0.45)
      };
      let family = 'sensor_drift';
      let best = -1;
      Object.keys(e).forEach((k) => { if (e[k] > best) { best = e[k]; family = k; } });
      return best > 0.5 ? family : null;
    }

    function evidenceStrength(fx) {
      return Math.max(
        abs(fx.residualEma) / T.residual_kW,
        abs(fx.loadDeltaEma) / T.load_kW,
        abs(fx.speedGapEma) / T.speed_Hz,
        ctx.has('valve_cmd_pct') ? abs(fx.valveGapEma) / T.valve_pct : 0,
        abs(fx.commandNormEma) / T.command_norm
      );
    }

    return {
      getFirstAlarmT() { return firstAlarmT; },
      observe(sample) {
        ext.observe(sample);
        const fx = ext.fx;
        if (!fx.ready) return;
        inc('load', abs(fx.loadDeltaEma) > T.load_kW);
        inc('residual', abs(fx.residualEma) > T.residual_kW);
        inc('speed', ctx.has('n_meas_rpm') && ctx.has('f_meas_Hz') && abs(fx.speedGapEma) > T.speed_Hz);
        inc('valve', ctx.has('valve_cmd_pct') && ctx.has('valve_meas_pct') && abs(fx.valveGapEma) > T.valve_pct);
        inc('command', abs(fx.commandNormEma) > T.command_norm);
        const detected = streak.load >= T.persist.load || streak.residual >= T.persist.residual ||
          streak.speed >= T.persist.speed || streak.valve >= T.persist.valve ||
          streak.command >= T.persist.command;
        if (detected && firstAlarmT == null) {
          firstAlarmT = fx.t;
          alarmFamily = currentFamily(fx);
        }
        if (firstAlarmT != null) {
          const refined = currentFamily(fx);
          if (refined) alarmFamily = refined;
        }
      },
      diagnose() {
        const fx = ext.fx;
        if (firstAlarmT == null) {
          const ratio = evidenceStrength(fx);
          return healthyDiagnosis(ctx, fx, 0.02 + 0.16 * clamp(ratio / 2, 0, 1), null);
        }
        const family = alarmFamily || currentFamily(fx) || 'sensor_drift';
        const magnitude = magnitudeFor(family, fx, ctx);
        const ratio = evidenceStrength(fx);
        const sustained = (streak.load >= 2 ? 0.02 : 0) + (streak.valve >= 2 ? 0.02 : 0) +
          (streak.residual >= 3 || streak.speed >= 3 ? 0.02 : 0) + (streak.command >= 3 ? 0.02 : 0);
        const confidence = clamp(0.52 + 0.44 * clamp(ratio / 1.5, 0, 1) + sustained, 0.52, 0.988);
        return faultDiagnosis(ctx, fx, family, magnitude, firstAlarmT, confidence, firstAlarmT);
      }
    };
  }

  /* ------------------------------------------------------------ registry */
  function defineBuiltin(def) {
    if (!def || typeof def !== 'object' || !def.id || typeof def.build !== 'function') {
      throw new Error('FL.agents.defineBuiltin: 需要 {id, name, build(meta)}');
    }
    const entry = {
      id: def.id,
      name: def.name || def.id,
      family: def.family || 'rule-based',
      description: def.description || '',
      strengths: def.strengths || '',
      weaknesses: def.weaknesses || '',
      build: def.build
    };
    const existing = BUILTINS.filter((b) => b.id === entry.id)[0];
    // 契约要求每个内置定义暴露 create(meta) -> agent；未提供时用 build + 统一实例包装。
    if (typeof def.create === 'function') {
      entry.create = def.create;
    } else {
      entry.create = function (meta) { return makeInstance(entry, meta || {}); };
    }
    if (existing) BUILTINS[BUILTINS.indexOf(existing)] = entry;
    else BUILTINS.push(entry);
    return entry;
  }

  function makeInstance(def, meta) {
    let impl = def.build(buildContext(meta || {}));
    const instance = {
      id: def.id,
      name: def.name,
      firstAlarmT: null,
      reset() {
        impl = def.build(buildContext(meta || {}));
        instance.firstAlarmT = impl.getFirstAlarmT();
        return instance;
      },
      observe(sample, m) {
        impl.observe(sample, m || meta);
        instance.firstAlarmT = impl.getFirstAlarmT();
        return instance;
      },
      diagnose() {
        const d = impl.diagnose();
        instance.firstAlarmT = impl.getFirstAlarmT();
        if (d && typeof d === 'object') d.firstAlarmT = instance.firstAlarmT;
        return d;
      }
    };
    return instance;
  }

  function create(id, meta) {
    const def = BUILTINS.filter((b) => b.id === id)[0];
    if (!def) throw new Error('FL.agents.create: 未知 Agent ' + id);
    return def.create(meta || {});
  }

  function list() {
    return BUILTINS.map((b) => ({
      id: b.id,
      name: b.name,
      family: b.family,
      description: b.description,
      strengths: b.strengths,
      weaknesses: b.weaknesses
    }));
  }

  FL.agents = AGENTS;
  AGENTS.version = AGENTS_VERSION;
  AGENTS.familyLabels = FAMILY_LABELS;
  AGENTS.thresholds = T;
  AGENTS.defineBuiltin = defineBuiltin;
  AGENTS.list = list;
  AGENTS.create = create;
  AGENTS.get = function (id) { return BUILTINS.filter((b) => b.id === id)[0] || null; };

  /* ---------------- 内置 Agent 注册 ---------------- */
  defineBuiltin({
    id: 'sensor-limit',
    name: '固定阈值报警',
    family: 'threshold',
    description: '对测量一致性残差、转速交叉校验差与负荷需求做固定阈值越限报警，最简基线。',
    strengths: '实现简单、报警快；对明显的传感器漂移与负荷阶跃有效。',
    weaknesses: '不做指令-反馈偏差分析（漏掉执行器异常）；幅值直接报越限通道读数、单位口径与真值不一致；无持续性检验。',
    build: buildSensorLimit
  });

  defineBuiltin({
    id: 'residual',
    name: '残差检验',
    family: 'model-based',
    description: '用测量一致性残差与指令-反馈跟随差做模型残差检验，并按首个越限证据锁定故障家族。',
    strengths: '对测量通道不一致与执行器指令偏差敏感；能给出物理量换算后的幅值。',
    weaknesses: '缺少转速/电气频率交叉校验；首报家族可能被暂态残差锁定，负载阶跃瞬态存在误判风险。',
    build: buildResidual
  });

  defineBuiltin({
    id: 'cusum',
    name: '累积和变点',
    family: 'statistical',
    description: '对多路观测特征做方向性累积和（CUSUM）变点检测，按累积证据最大的方向判定家族。',
    strengths: '对缓慢漂移和小幅持续偏移敏感，抗单点噪声。',
    weaknesses: '需要累积证据，报警延迟略高；负载阶跃与执行器偏差同时出现时家族判别不稳定。',
    build: buildCusum
  });

  defineBuiltin({
    id: 'bayes',
    name: '特征贝叶斯',
    family: 'probabilistic',
    description: '把残差、负荷、阀位、指令跟随、转速交叉五类手工特征送入高斯朴素贝叶斯，输出故障家族后验。',
    strengths: '输出标定后的概率与家族后验；对三类故障有多假设竞争，误报倾向低。',
    weaknesses: '依赖人工设定的类条件分布与先验；暂态特征可能拉低后验可信分。',
    build: buildBayes
  });

  defineBuiltin({
    id: 'fusion',
    name: '多信号融合',
    family: 'fusion',
    description: '融合测量残差、指令跟随、阀位、负荷阶跃与转速/电气频率交叉校验，配合持续性判据与单位换算。',
    strengths: '三系统三类故障全覆盖；交叉校验抑制误报；幅值按物理口径换算；可信分按证据强度标定。',
    weaknesses: '规则与阈值仍由人工设定；对未建模的新型故障不具备泛化能力。',
    build: buildFusion
  });
})();
