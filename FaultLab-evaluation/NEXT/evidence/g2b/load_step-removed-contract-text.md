# O-13 归档：FL-001 `load_step` 契约文本（删除前原文快照，2026-10-30）

> **裁定**：CHG-20261030-06（用户 2026-10-30 指令「裁定」，按 LOAD_STEP_RULING_MEMO 推荐执行**选项 A：删除**）。
> 本文件归档 `docs/CONTRACT.md` §5.1 中随删除移除的 `load_step` 扩展文本原状（含其矛盾——
> 假设句与验收句对电池电流行为相反、守恒差 7 个数量级，详见 `NEXT/LOAD_STEP_RULING_MEMO.md` §1）。
> 归档文本**不得**作为实现/验收依据；FL-001 故障家族自本裁定起为 `sensor_drift` + `actuator_fault`
>（actuator 仍为未评审扩展预览，非本裁定范围）。

## 归档一：CONTRACT §5.1 扩展段（G0 暂停实现文本）

- **扩展 `load_step`：G0 暂停实现（B12）**。原因：现文本"发电机一阶惯性源（`tau_gen=2.0 s`）追踪
  `P_load_demand - P_bat_true`"与"电池电流保持 `I_ref` 反馈控制"自相矛盾（按文字起始失衡 −10 kW，
  与"守恒 ≤1e-6"相差 7 个数量级），且发电机滞后曲线违反 V0.2 §1.2 R-02。
  恢复条件：删除发电机滞后，或引入母线储能 `E_bus/P_bus` 并把守恒式改为
  `P_gen+P_bat+P_bus=P_load`，走独立 G2b 物理规格评审。**当前不得作为验收路径。**

## 归档二：CONTRACT §5.1 扩展场景验收范围行

- **load_step：暂停，不设验收。** 重写条件见 §5.1（母线储能状态 + G2b）。

## 归档三：systems.js FL-001 故障定义（实现侧，随删除移除）

```js
fault({
  id: 'load_step_10kW', family: 'load_step', label: '负载功率阶跃', shortLabel: '负载冲击',
  target: 'load',
  description: '负载需求在故障时刻阶跃 +magnitude kW；发电机为一阶惯性源，电池承担瞬态缺口。',
  params: [{ key: 'magnitude', label: '阶跃幅值', unit: 'kW', min: 5, max: 20, step: 1, default: 10, precision: 0, help: '负载需求 30 kW → 30+magnitude kW' }],
  defaultTime_s: 20, timeRange: [2, 55],
  closedLoopEffect: '电池短时增发，发电机一阶爬坡后电流回落',
  monitorEffect: '物理输入，与控制模式无关，两种模式均生效',
  causalTemplateId: 'load-step-bus-balance'
}),
```

（另有 load-step-bus-balance 因果模板、core.test.js FL-001 load_step 场景断言块、engine.js
simulateFL001 isLoad 分支——均随删除移除；GT-001/FC-001 的 load_step 不在本裁定范围。）
