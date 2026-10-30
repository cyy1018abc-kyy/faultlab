/* owner: core-engine | module: plants/fc001 | contract: RFC_MODEL_INTERFACE_I11_APPROVED.md §2/§9（I-11 S2 原始批准 CHG-20261028-01/02；移植 CHG-20261030-07） */
/* FC-001 Plant / Sensor / Controller / Fault 适配器（I-11 S2 移植）。
   职责边界（与 plants/fl001.js 同构，RFC §2/§7）：
   - Plant 只承载真实状态方程（EQ-3 一阶行为级，数值子步离散）与子步积分通量；
   - monitor 语义由 Controller 裁决：Plant 对外暴露"进入回路的偏置"视图（loopBiasAt，
     monitor 恒 0）与对应目标 targetAt；测量链路偏置 bAt 独立于回路视图（EQ-1/EQ-2）；
   - 事件左/右极限归事件层（ADR-002），本文件不含事件编码。
   适用家族：none / sensor_drift（fc001PlantCapable）。load_step / actuator_fault 为暂缓家族，
   保留 engine 内联数值路径（RFC §3 S2 验收边界），不进入本适配器。
   数值纪律：子步步进公式与 engine.foStep 逐字一致（同一操作数顺序），移植验收要求
   FC Run 的 run_hash 与 series 逐位不变（快照工具 tools/verify-i11-bitidentity.mjs，
   锚点见 CHG-20261030-07 记录）。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};
  FL.core.plants = FL.core.plants || {};

  function createFc001Plant(cfg) {
    var V = 0.4;               /* 0.4 kW/A（Vdc=400 V 换算常数，docs/CONTRACT.md §5.2） */
    var P_BAT_REF = 10;        /* 电池缓冲基准功率 10 kW（FC-001 冻结参数） */
    var TAU = 1.2;             /* 电堆一阶时间常数（暂缓家族 actuator 为 1.5，不进本适配器） */
    var family = cfg.fault.family;
    var faulted = family === 'sensor_drift';
    var tStart = faulted ? cfg.fault.t_start_s : null;
    var bias = faulted ? cfg.fault.params.magnitude : 0;
    var monitor = cfg.feedback_mode === 'monitor';
    var load0 = cfg.initial.load_kW;
    var soc0 = cfg.initial.SOC_pct;
    var I_fc_ref = (load0 - P_BAT_REF) / V;   /* 电堆电流参考 = t=0 稳态（无 load_step 时恒定） */

    /* EQ-1/EQ-2：测量链路偏置（I_meas = I_fc + b），monitor 下仍存在于测量通道 */
    function bAt(time) { return (faulted && time >= tStart - 1e-9) ? bias : 0; }

    /* Controller 裁决视图：进入物理回路的偏置（monitor = IdentityController ⇒ 恒 0）。
       与 engine 原分支 (isSensor && !monitor ? I_fc_ref - b : I_fc_ref) 逐位等价。 */
    function loopBiasAt(time) {
      return (faulted && !monitor && time >= tStart - 1e-9) ? bias : 0;
    }

    /* EQ-3 回路目标：I_fc → I_fc_ref − loopBias（一阶行为级，τ=1.2 s） */
    function targetAt(time) {
      var lb = loopBiasAt(time);
      return lb === 0 ? I_fc_ref : I_fc_ref - lb;
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

    /* 测量通道（Sensor 角色）：I_meas = I_fc + bAt(t) */
    function iMeasAt(iFc, time) {
      return iFc + bAt(time);
    }

    return {
      method: 'substep',   /* 数值子步口径；FC 的解析 golden 比对走 atol 1e-9 交叉检验层（T-17 纪律） */
      modelRoles: { plant: 'fc001-fuelcell', sensor: 'i-fc-sensor', controller: monitor ? 'monitor-identity' : 'closed-loop-first-order', fault: family },
      faulted: faulted,
      monitor: monitor,
      tStart: tStart,
      V: V,
      TAU: TAU,
      P_BAT_REF: P_BAT_REF,
      load0: load0,
      soc0: soc0,
      I_fc_ref: I_fc_ref,
      bAt: bAt,
      loopBiasAt: loopBiasAt,
      targetAt: targetAt,
      stepOf: stepOf,
      iMeasAt: iMeasAt
    };
  }

  FL.core.plants.createFc001Plant = createFc001Plant;
})();
