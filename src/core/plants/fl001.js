/* owner: core-engine | module: plants/fl001 | contract: RFC_MODEL_INTERFACE_I11.md §2（移植 CHG-20261030-07） */
/* FL-001 Plant / Sensor / Controller / Fault 适配器（I-11 S1 移植）。
   职责边界（RFC §2/§7）：
   - Plant 只承载真实状态方程（EQ-3 一阶行为级，数值子步离散）与子步积分通量；
   - monitor 语义由 Controller 裁决：Plant 只暴露"进入回路的偏置"视图（targetAt，monitor 恒 I_ref）；
     测量链路偏置 bAt 独立于回路视图（EQ-1/EQ-2：monitor 下测量通道仍计 b）；
   - 事件左/右极限归事件层（ADR-002），本文件不含事件编码。
   适用家族：none / sensor_drift（fl001PlantCapable）。actuator_fault 为未评审扩展预览家族，
   保留 engine 内联数值路径（O-13 归档 + RFC §3 暂缓边界），不进入本适配器；
   FL-001 的 load_step 已按 O-13 删除（CHG-20261030-06）。
   数值纪律：子步步进公式与 engine.foStep 逐字一致（同一操作数顺序，τ=1.5 s），
   S1 移植验收 = plant 家族 run_hash 与 series 逐位不变
   （快照工具 tools/verify-i11-bitidentity.mjs，锚点见 CHG-20261030-07 记录）。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};
  FL.core.plants = FL.core.plants || {};

  function createFl001Plant(cfg) {
    var V = 0.4;               /* 0.4 kW/A（Vdc=400 V，MODEL_VALIDATION_SPEC §1.2 换算常数） */
    var TAU = 1.5;             /* 闭环时间常数（§1.2 冻结；暂缓家族 actuator 为 0.4，不进本适配器） */
    var family = cfg.fault.family;
    var faulted = family === 'sensor_drift';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var bias = faulted ? cfg.fault.params.magnitude : 0;
    var monitor = cfg.feedback_mode === 'monitor';
    var load0 = cfg.initial.load_kW;
    var soc0 = cfg.initial.SOC_pct;
    var I_ref = (load0 - 20) / V;   /* EQ-3：P0 冻结参数下 = 25 A */

    /* EQ-1：测量链路偏置（EQ-2 I_meas = I_true + b），monitor 下仍存在于测量通道 */
    function bAt(time) { return (faulted && time >= tStart - 1e-9) ? bias : 0; }

    /* Controller 裁决视图：回路目标 I_ref − (monitor ? 0 : b)（monitor = IdentityController ⇒ I_ref）。
       与 engine 原分支 controlTarget = I_ref - (monitor ? 0 : b) 逐位等价。 */
    function targetAt(time) {
      var b = bAt(time);
      return I_ref - (monitor ? 0 : b);
    }

    /* EQ-3 数值子步精确离散（与 engine.foStep 逐字一致；S3 去重时再上移公共模块）：
       y' = target + (y − target)·e^(−dt/τ)，区间解析积分 target·dt + (y − target)·τ·(1 − e^(−dt/τ)) */
    function stepOf(y, time, dt) {
      var ratio = dt / TAU;
      var a = ratio > 40 ? 0 : Math.exp(-ratio);
      var target = targetAt(time);
      return {
        y: target + (y - target) * a,
        integral: target * dt + (y - target) * TAU * (1 - a)
      };
    }

    /* 测量通道（Sensor 角色）：I_meas = I_true + bAt(t) */
    function iMeasAt(iTrue, time) {
      return iTrue + bAt(time);
    }

    return {
      method: 'substep',   /* 数值子步口径；与解析 golden 的比对走 rtol 1e-12 容差层（golden 校验） */
      modelRoles: { plant: 'fl001-battery', sensor: 'i-bat-sensor', controller: monitor ? 'monitor-identity' : 'closed-loop-first-order', fault: family },
      faulted: faulted,
      monitor: monitor,
      tStart: tStart,
      V: V,
      TAU: TAU,
      load0: load0,
      soc0: soc0,
      I_ref: I_ref,
      bAt: bAt,
      targetAt: targetAt,
      stepOf: stepOf,
      iMeasAt: iMeasAt
    };
  }

  FL.core.plants.createFl001Plant = createFl001Plant;
})();
