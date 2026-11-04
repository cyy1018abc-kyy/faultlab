# V070_WAVE_DESIGN — v0.7.0 实现波设计（PV-001 批准轮 + 教学生态 + A-4a 草案轮）

> **性质**：阶段设计文档（Lead 起草，2026-11-04）——V06_ROADMAP §3 v0.7.0 行的实现波：
> B-1 PV-001 批准并全链实现 ＋ A-4a GT L1 草案轮 ＋ C-3/C-4/D-4 交付。
> **授权记录（CHG-20261104-10）**：用户指令「设计下一轮的长期方案，统一采用推荐决策，采用
> 并发多个子智能体来加速任务」——**DEC-1…8 全采推荐项**；PV-001 批准决策点（上轮呈交：
> PV001 v0.2 双路评审通过 + PV-DRAFT-Q1/Q2 裁定点）经本指令采纳批复，**PV-G2b 批准登记于
> CHG-20261104-10**（用户书面指令授权链）；A-4a 仅草案+评审（批准下轮，DEC-4）。
> **输入**：V06_ROADMAP §2/§3/§4 ｜ PV001_G2B_SPEC_DRAFT v0.2（§1 方程/§3 锚点/§4 golden
> 计划/§8 排期/§11 条件 C-1…C-7）｜ D1_LITE_ASSESSMENT §7 ｜ ORACLE_INTERFACE_D2（schema
> v2/oracle_base 契约）。
> **状态**：`APPROVED`（按推荐执行）。**步数账（I-7）**：run-g2 26 → **28**（+verify_golden
> pv001 + engine-pv.test），预算 ≤29。

---

## 0. 本波边界

- **engine.js 改动面（对本波显式开放）**：仅限 simulatePV001 新轨 + 分派链显式 PV 分支
  （engine.js:1421-1423 现 else→GT001 兜底，必须先插 PV 分支）+ PV 所需 metrics 口径；
  三系统既有物理面/双轨**零触碰**，既有 Run 数值逐位不变（T4 断言兜底）；
- **golden**：仅新增 pv001_v1（新文件）；既有 4 golden 字节零变更（gt001_v2 维持，A-4a 不实现）；
- **禁区维持**：tools/oracle/ 既有四 oracle、gt001_v2、FY 评测协议语义、I-1 零依赖、I-5 措辞。

## 1. 决策点（已按用户指令全采推荐项）

| # | 决策 | 采纳（推荐） |
|---|---|---|
| DEC-1 | PV-001 批准处置 | **按授权链批准**（PV-G2b-02 闭合于 CHG-20261104-10）：PV-DRAFT-Q1 定案=EQ-PV-3 定案机制（MPPT 目标=k·G_meas·φ_T）；PV-DRAFT-Q2 定案=**P_pv(0)=k·G0·φ_T**（G0=1000 时锚点全部不变，评审复算确认）；PV-G2b-01 条件修订（C-1…C-7）随本轮落进规格正文并更名 `PV001_G2B_SPEC_APPROVED.md` v1.0 |
| DEC-2 | Arena 处置 | **(a) 显式排除**：arena.js systemList 过滤 PV-001 + 守卫注释（批准 CHG 登记）；入池延后至 exposure 映射验证轮 |
| DEC-3 | PV golden | pv001_v1 **4 Run**（healthy/closed_loop_fault/monitor_only/shading_closed_loop；shading monitor 不重复——两模式逐位同解已实证）；schema v2 全量元数据 + gate T-A；oracle **复刻 foStep 更新序**保证与引擎逐位（PV 各轨事件后目标恒定→精确指数，FC 级联陷阱不适用但仍按同构纪律） |
| DEC-4 | A-4a 范围 | 本波 **GT L1 热力学最小集 G2b 草案 + 双路评审**；批准与实现下轮（GT golden/oracle 零变更维持） |
| DEC-5 | C-3 最小形态 | 教学路径=预设 JSON 模块（3 系统×5 步：传感器故障→闭环响应→仅监测对照→因果解释→评测入口）+ 引导页 UI（步骤卡+视图深链+「生成场景」复用 scenario 原语）；无新执行语义 |
| DEC-6 | C-4 最小形态 | `tools/leaderboard.mjs`（聚合归档场次 score-report → 按参与者排序表 JSON+Markdown）+ 只读 UI 视图；纯本地文件（I-1） |
| DEC-7 | D-4 阈值 | 实测基线×安全系数定阈值（JS 堆上限 + 交互帧率下限），进 perf 门禁扩展；阈值登记 + 两轮复测稳定后才生效 |
| DEC-8 | 步数账 | run-g2 26 → 28（+`verify_golden pv001` + `engine-pv.test.js`，均 core 层）；预算 ≤29 |

## 2. 波次派发（并发子智能体）

```text
阶段一（并行 5）：T1 PV 规格批准修订 ｜ T6 C-3 教学路径 ｜ T7 C-4 排行榜 ｜ T8 D-4 性能基线 ｜ T9 A-4a GT L1 草案
阶段二（并行 4）：T2 pv001_oracle+golden（PV-G2b-03）｜ T3 systems.js+engine PV 轨（PV-G2b-04a）｜ T10a/T10b A-4a 双路评审
阶段三：T4 schema 单位+engine-pv 测试+Arena 排除+交叉验证（PV-G2b-04b）
阶段四：T5 run-g2 接线（28 步）
阶段五：全量门禁 + ≤3 修复环
```

**PV 三方一致性纪律**：T1（规格）、T2（oracle）、T3（engine）同源 EQ-PV-1…7（Q2 修订版）；
T4 以「engine vs golden 逐位/容差内 + 锚点断言 + GT 轨区分守卫」收口。

## 3. 预期失效面

新增 pv001_v1(+sidecar)；既有 4 golden 零变更；engine.js 分派链插入分支（既有三系统路径
逐位不变由 engine-pv 守卫断言+全量回归兜底）；schema UNIT_DICT 增 W/m²（纯增项）；UI 新增
教学/排行两页 + PV 系统卡自动注册；Arena PV 排除为守卫式过滤（协议面零改动）。

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | engine 分派 else 兜底吞 PV（草案 R-4） | T3 显式分支 + T4 GT 轨区分守卫断言 |
| 2 | oracle/engine 双实现漂移 | 同源规格 + foStep 同构纪律 + T4 逐位/容差收口 |
| 3 | D-4 阈值环境抖动致门禁不稳 | 基线×安全系数 + 两轮复测稳定才生效 + 失败仅告警首轮（登记） |
| 4 | UI 新页面接线破坏 e2e | 各路触碰页面即跑 e2e；门禁兜底 |
| 5 | A-4a 草案与 GT golden 演进冲突 | 草案明确「不动 gt001_v2/oracle」，实现轮才立 golden 计划 |

**文件结束**。V070_WAVE_DESIGN v1（2026-11-04，CHG-20261104-10 批准，按推荐执行）。
