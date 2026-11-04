# V072_WAVE_DESIGN — v0.7.2 实现波设计（残留清算 + A-4b/A-4c/B-2 草案轮）

> **性质**：阶段设计文档（Lead 起草，2026-11-05）——V06_ROADMAP 框架内的下一实现波：
> ① v0.7.x 残留清算全清单（v0.7.2 patch 发布）；② A-4b FL-001 热模型 G2b 草案轮；
> ③ A-4c FC 电化学裁定落地；④ B-2 WT-001 G2b 草案轮。
> **授权记录（CHG-20261105-01）**：用户指令「先不推送；设计下一轮的长期方案，统一采用推荐
> 决策，采用并发多个子智能体来加速任务」——**DEC-1…7 全采推荐项**；A-4c 裁定按推荐落地
> （可撤销）；A-4b/B-2 只到草案+双路评审（**批准留待用户**，沿 GT-L1/PV-001 两波节奏）。
> **推送状态**：用户裁定暂缓——v0.7.1（4963e6a + tag）留本地，本波基线同样只提交不推送
> （任何推送都会携带 v0.7.1，两者同批）。
> **输入**：V06_ROADMAP §2/§3 ｜ v070/v071 双 G8 证据 §3 残留清单 ｜ GTL1 APPROVED v1.0
> （L1 制度先例）｜ PV001 APPROVED v1.0（新系统 G2b 先例）｜ ALINE §1/§3（层级/容差）。

---

## 0. 本波边界

- **golden 零变更**：既有 6 golden（gt001_v1/v2/v3、fl001_v1、fc001_v1、pv001_v1）字节冻结；
  A-4b/B-2 只出草案不 emit（沿两波节奏，批准后才进 oracle/golden 轮）；
- **engine.js 改动面**：仅限清算项（PV quality 检查适配所需零 engine 改动——checks.js 面；
  scenario.js 已有 inertia_model 键；本波无新仿真轨）；
- **不做**：D-3 FMU（等样本）、A-5/B-3/C-5/D-5（v0.8.0 原行不动）、云/账户（I-1）。

## 1. 决策点（已按用户指令全采推荐项）

### DEC-1：残留清算范围 = 全清单九项一次清零（推荐采纳）

v0.7.0/v0.7.1 证据 §3 登记的残留全部纳入 v0.7.2（均为小项，一次清零进入 v0.8 干净基线）：

| # | 项 | 面 |
|---|---|---|
| 1 | PV quality 检查适配：checks.js soc-bounds/energy-balance 系统分支（bounds 派生）+ **PV 专属 PHY 检查**（E_pv+E_grid=E_load 恒等）+ engine-pv.test 锁定态断言更新 | checks.js |
| 2 | schema 导出面 R-8：validateScenarioConfig initial 键面按 system.bounds 派生（PV 无 SOC_pct、有 G0_W_m2），bundle/protocol 校验路径贯通 | schema.js |
| 3 | 静态文案与指标组：home.js（四系统标题/PV 卡 L0 徽章/故障原理图通用化）、compare.js PV 指标组、scenario 页 METRIC_PICK PV-001 键 | UI |
| 4 | signals.js display:block 残留缺陷修复（CSS 特异性）+ e2e 深链残留面覆盖 | UI/e2e |
| 5 | CORE_FILES 并入 scenario.js/teaching.js（tests 统一装载，解除 (0,eval) 自装载遗留） | tests |
| 6 | causalTemplates thermo 扩展（GT-L1 因果叙事卡）+ causal.js RESIDUAL_CANDIDATES PV/GT-thermo 键 | systems/UI |
| 7 | UI 跨深度对比卡（GT 同故障 L0b swing ↔ L1 thermo 对比，teaching/compare 面复用） | UI |
| 8 | FaultLab.html 单文件重打包（tools/build.py）+ file:// 冒烟 | 构建 |
| 9 | TESPy 对照独立算例（GT-L1 稳态自洽旁证，evidence 文档，GPL 隔离不引依赖） | evidence |

### DEC-2：A-4b FL-001 热模型最小集形态（草案轮，批准留待用户）

- **推荐形态**：电池单节点集总热容 ODE——`C_bat·dT_bat/dt = I²·R_int(T_bat) − h·(T_bat − T_amb)`，
  `R_int(T) = R0·(1+α·(T−25))`；SOC 定义不动（I-2：能量口径零涟漪）；**thermal 轨为 cfg 显式
  开关（thermal_model: off|on，默认 off）**——FL-001 是 P0 旗舰，默认翻转影响面大于 GT（GT-L1
  Q4 先例不可直接平移，理由登记）；数值轨 RK4 dt0.01、oracle fl001_l1_oracle（出生即
  oracle_base）、golden fl001_v2（新 id——模型变更判据）、tier T-B；
- 教学点：同故障 L0 ↔ L1-thermal 对比（温升路径/内阻反馈的跨深度分歧）；
- **本波只到草案+双路评审；批准与实现（fl001_v2 + 轨实现）待用户裁定后入 v0.8.0**。

### DEC-3：A-4c FC-001 电化学裁定（按推荐落地，可撤销）

- **裁定：自写 ODE（stdlib）为 FC 电化学主路径；PyBaMM 不引入（含后端侧）**。
- 理由：① I-1 纯度延续（PyBaMM 依赖 scipy/numpy，即使后端侧也引入安装面）；② L1 制度
  （RK4+T-B+oracle_base）已在 GT-L1 全链验证，FC-001 信号面小（极化曲线 V-I + 温度项即达
  L1-lite，复用制度成本最低）；③ PyBaMM 高保真价值留在**旁证算例轨道**（对标 TESPy R 行，
  只对照不引依赖，D-3 后端生态成熟后再评估）；
- 落地：本裁定随 CHG-20261105-01 登记；FC 电化学 G2b 草案排 v0.8.0 队列（不占本波）；
  用户可随时撤销改采 PyBaMM 后端侧（撤销成本：G2b 流程照走，无沉淀损失）。

### DEC-4：B-2 WT-001 草案轮（批准留待用户）

- 风电系统（AC + 机械动态 + 变桨）：L0/L1 混合形态提案——风轮气动 `P=Cp(λ,β)·½ρAv³`
  （L0 解析 Cp 简化）+ 传动链/变桨执行器一阶动态 + 并网馈线结构（与 PV-001 同构）；
- 故障族提案 ≥3（风速传感器偏置/变桨卡涩/阵风阶跃）；golden wt001_v1 计划；scope
  extension_preview；**本波只到草案+双路评审，批准与实现 v0.8.0**。

### DEC-5：版本节奏

v0.7.2（本波：清算九项发布，草案三份登记）→ v0.8.0（A-4b 实现 + B-2 实现〔若批准〕+ A-5 探路
+ C-5/D-5 评估）→ v1.0.0 收敛（V06_ROADMAP §3 原样）。

### DEC-6：步数账（I-7）

run-g2 28 步不变（清算并入既有测试步：engine-pv/causal-rules/scenario/schema/teaching 各自
扩展；TESPy 算例为 evidence 文档非门禁步）；预算 ≤29 维持。

### DEC-7：push 状态

用户裁定暂缓推送——本波基线与产出**只提交本地**；v0.7.1 与本波产出将来同批推送（用户指令触发）。

## 2. 波次派发（并发子智能体）

```text
阶段一（并行 8）：
  清算六路：T1 checks PV 适配 ｜ T2 schema 导出面 ｜ T3 文案+指标组 ｜ T4 signals.js+e2e
          ｜ T5 CORE_FILES+重打包 ｜ T6 thermo 模板+跨深度卡+TESPy 算例
  草案两路：T7 A-4b FL 热模型 G2b 草案 ｜ T8 B-2 WT-001 G2b 草案
阶段二（并行 4）：T9/T10 A-4b 双路评审 ｜ T11/T12 B-2 双路评审
阶段三：全量门禁 run-g2（28 步）+ ≤3 修复环
```

**清算文件面分配**（防冲突）：T1=checks.js｜T2=schema.js｜T3=home/scenario 页/compare.js｜
T4=signals.js+e2e.mjs｜T5=tests/core-load.js+build.py 产物｜T6=causal.js+systems.js 模板+
teaching 预设+evidence 文档——互不相交；T7/T8 各自新文件。

## 3. 预期失效面

清算面均为**缺陷修复/适配**：PV quality 检查从锁定态 fail 转 pass（engine-pv §4 断言同步翻转）；
schema 导出面放开 PV Run 校验（负例面同步）；signals.js 修复后 SPA 深链行为变化（e2e 新覆盖）；
FaultLab.html 字节变化（构建产物）；causalTemplates 扩展（新增模板 id，既有模板零改动）；
**零 golden 变更、零仿真轨变更**。

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | 清算项互相作用（checks↔schema↔engine-pv 断言链） | 文件面互斥分配 + T1/T2 各自带回归 + 全量门禁收口 |
| 2 | A-4b 草案的「thermal 默认 off」与 GT-L1「thermo 默认 on」先例表面矛盾 | 草案显式登记差异理由（P0 旗舰保守性 vs GT L1 曝光目标）；批准轮用户裁定 |
| 3 | B-2 草案规模（新系统 L 级）超本波消化 | 只到草案+评审，实现另轮；AC 面物理简化显式登记 |
| 4 | FaultLab.html 重打包破坏 file:// 冒烟 | build.py 既有链 + 冒烟步在 T5 内 |
| 5 | 双路评审并发四路限额 | 工作流运行时自适应；失败即重派 |

**文件结束**。V072_WAVE_DESIGN v1（2026-11-05，CHG-20261105-01 批准，按推荐执行）。
