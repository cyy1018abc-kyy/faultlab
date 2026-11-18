/* owner: core-contract | module: causal-rules | contract: FC001_FMU_G2B_SPEC_APPROVED v1.0 §2.4
   （G9 §2.5.1 逐字转写；FCFMU-G2b-04，CHG-20261118-01）。
   FC-001 5 态 L1-FMU 第三轨 6 节因果规则声明注册（数据面——引擎既有 causalTemplates
   零触碰；FMU 轨 Run 经 adapter/backend 路径承载，非 engine 仿真轨——规则供教学/对比面
   消费：ui/pages/compare.js 跨保真警示与后续 FMU 轨教学卡）。 */
(function () {
  'use strict';

  var FL = window.FL = window.FL || {};
  FL.core = FL.core || {};
  FL.core.causalRules = FL.core.causalRules || {};

  var FC_FMU_RULES = [
    {
      rule_id: 'FC_RULE_01_MEAS_STEP',
      node_slot: '节点 1 传感链',
      epistemic_layer: 'measured',
      bound_variables: ['p_ca_meas_kPa', 'V_water_store_meas_mL'],
      statement: '加性传感偏置 b 在 20.0 s pre（left_limit）与 post 间产生瞬时阶跃，物理状态保持连续。'
    },
    {
      rule_id: 'FC_RULE_02_CTRL_REACTION',
      node_slot: '节点 2 控制律',
      epistemic_layer: 'derived',
      bound_variables: ['u_o2_valve_cmd', 'u_drain_valve_cmd'],
      statement: 'closed_loop 反馈下比例控制对受染测量反应（缩减 O₂/N₂ 供给或排水指令）；monitor_only 下指令恒 0.50。'
    },
    {
      rule_id: 'FC_RULE_03_N2_ACCUM',
      node_slot: '节点 3 阴极气体',
      epistemic_layer: 'true/derived',
      bound_variables: ['p_N2_ca_true_kPa', 'y_O2_ca_true'],
      statement: '100.0 A 持续消耗下供给缩减抬升阴极氮分压、稀释氧摩尔分数 y_O2。'
    },
    {
      rule_id: 'FC_RULE_04_WTMS_VOL',
      node_slot: '节点 4 分离器体积',
      epistemic_layer: 'true/measured',
      bound_variables: ['V_water_store_true_mL', 'cap_water_ratio_est'],
      statement: '排水不足使储水体积向 500.0 mL 容量上限累积（θ_cap 超 0.60——Run 级兑现面以批准规格 §2.1 修正后口径为准：穿越叙事仅 FC-Run-5 兑现 t≈47 s，FC-Run-4 闭环平衡 280 mL 零触发）。'
    },
    {
      rule_id: 'FC_RULE_05_STACK_POLAR',
      node_slot: '节点 5 电堆极化',
      epistemic_layer: 'true/measured',
      bound_variables: ['V_stack_meas_V', 'eta_sys_true_pct'],
      statement: '氧稀释（y_O2<0.60）与储水饱和（θ_cap 超 0.40/0.60）增大浓差过电位、降低端电压。'
    },
    {
      rule_id: 'FC_RULE_06_ALGEBRAIC_RES',
      node_slot: '节点 6 代数支',
      epistemic_layer: 'derived',
      bound_variables: ['r_meas_p_kPa', 'r_meas_water_mL'],
      statement: '代数恒等支：测量一致性残差按定义在 20.0 s post 精确跳 +b（r ≡ x_meas − x_ref——标称点两口径等价；全轨口径以批准规格 §1.3 裁定注记为准：pre 行 0 / post 行 +b）——传感通道偏移，非物理气体泄漏或水损失。'
    }
  ];

  FL.core.causalRules.fc001_fmu = FC_FMU_RULES;
})();
