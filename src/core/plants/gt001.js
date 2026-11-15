/* owner: core-engine | module: plants/gt001 | contract: RFC_MODEL_INTERFACE_I11_APPROVED.md §9 S3
   （I-11 S3 收口——GTCMB-G2b-04 扩裁定 CHG-20261115-04/V170_WAVE_DESIGN DEC-2；
   fl001/fc001 适配器先例同构；位级验收 = 全 GT Run run_hash/序列逐位不变） */
/* GT-001 Plant / Sensor / Controller / Fault 适配器（I-11 S3 移植）。
   职责边界（与 plants/fl001.js/fc001.js 同构，RFC §2/§7）：
   - 传感器偏置 bAt / 负荷需求 demandAt / 执行器钳位 cappedAt 四轨共享；
   - 调速器积分步 govStep（EQ-GTL2-9 原样——thermo/thermo_comb 消费；swing/linear 遗留轨
     保留 engine 内联 foStep 序——S3 范围扩裁定 DEC-2：PV/WT/MG out-of-scope 顺延）；
   - 事件左/右极限归事件层（ADR-002），本文件不含事件编码。
   适用家族：none / sensor_drift / load_step / actuator_fault（GT-001 全四族）。
   数值纪律：子步公式与 engine 内联逐字一致（同一操作数顺序），移植验收要求
   GT Run 的 run_hash 与 series 逐位不变（verify-i11-bitidentity.mjs GT 扩展）。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};
  FL.core.plants = FL.core.plants || {};

  function createGt001Plant(cfg) {
    var KI = 2.0;              // 调速器积分增益（kW/(Hz·s)，L0b 冻结值）
    var F0 = 50;               // 额定频率（Hz）
    var K_BAT = 24;            // 电池一次调频下垂（kW/Hz）
    var P_BAT_REF = 5;         // 电池基准功率（kW）
    var family = cfg.fault.family;
    var faulted = family !== 'none';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var magnitude = faulted ? cfg.fault.params.magnitude : 0;
    var monitor = cfg.feedback_mode === 'monitor';
    var load0 = cfg.initial.load_kW;
    var isSensor = family === 'sensor_drift';
    var isLoad = family === 'load_step';
    var isAct = family === 'actuator_fault';
    var tClear = (isAct && cfg.fault && cfg.fault.t_clear_s != null) ? cfg.fault.t_clear_s : null;

    /* 传感器偏置（EQ-GTL2-9 b 通道——monitor 下仍存在于测量通道） */
    function bAt(time) { return (isSensor && tStart != null && time >= tStart - 1e-9) ? magnitude : 0; }

    /* 负荷需求（EQ-GTL2-9 load 通道——load_step 阶跃） */
    function demandAt(time) { return (isLoad && tStart != null && time >= tStart - 1e-9) ? load0 + magnitude : load0; }

    /* 调速器频率视图（EQ-GTL2-9 f_gov——monitor 且 sensor_drift 时用 f 而非 f+b） */
    function fGovAt(f, time) {
      var b = bAt(time);
      return (monitor && isSensor) ? f : f + b;
    }

    /* 调速器积分步（EQ-GTL2-9：u_next = clamp(u + Ki·(50 − f_gov)·h, 0, 40)——thermo/comb 消费） */
    function govStep(u, f, time, h) {
      var fGov = fGovAt(f, time);
      return Math.max(0, Math.min(40, u + KI * (F0 - fGov) * h));
    }

    /* 执行器钳位活跃（EQ-GTL2-10：t_start ≤ t < t_clear——comb/thermo 消费） */
    function cappedAt(time) {
      return isAct && tStart != null && time >= tStart - 1e-9 && !(tClear !== null && time >= tClear - 1e-9);
    }

    /* 执行器清除时刻（actuator_clear EV-002） */
    function tClearAt() { return tClear; }

    return {
      method: 'substep',
      modelRoles: { plant: 'gt001-turbine', sensor: 'speed-sensor', controller: monitor ? 'monitor-identity' : 'closed-loop-governor', fault: family },
      faulted: faulted,
      monitor: monitor,
      tStart: tStart,
      tClear: tClear,
      isSensor: isSensor,
      isLoad: isLoad,
      isAct: isAct,
      KI: KI,
      F0: F0,
      K_BAT: K_BAT,
      P_BAT_REF: P_BAT_REF,
      load0: load0,
      magnitude: magnitude,
      bAt: bAt,
      demandAt: demandAt,
      fGovAt: fGovAt,
      govStep: govStep,
      cappedAt: cappedAt,
      tClearAt: tClearAt
    };
  }

  FL.core.plants.createGt001Plant = createGt001Plant;
})();
