# V170_WAVE_DESIGN — v1.7.0 实现波设计（G9/G10 启动波：I-11 S3 收口实现 + G9 FC-001 FMU G2b 草案轮；G10 顺延 v1.8.0）

> **性质**：阶段设计文档（Lead 起草，2026-11-15）——V160 波（v1.6.0，commit 3d8eb18）后首波：
> **G9/G10 启动波**（CHG-20261114-06 双裁定承接——排程裁定「v1.5.0+ 候选」已满足、FC 物理处置
> 裁定「降级 DRAFT 走 G2b」兑现）。**八面冻结下第七个 additive 波（MINOR）**。
> **授权记录（CHG-20261115-04）**：用户 2026-11-15 指令「下一步」——承接 V160 收口汇报的下一轮
> 首项与既定授权句式（CHG-20261114-07 同款链），**DEC-1…5 全采推荐项**。
> **推送状态**：用户裁定暂缓延续（v0.7.1 起至 v1.6.0 同批）——本波产出并入同批。
> **输入**：G9_G10_ARCH_GATE_SPEC_DRAFT.md（外部 spec 落档，CHG-20261114-06——G9 §2 三层夹心
> 架构/5 态物理/6 Run 矩阵/6 节因果、G10 §3 双层遥测/预算账本/N-B18..20+V-11、§4 变更矩阵与
> R-G9/R-G10 验收、勘误头七项契约面预裁定）、RFC_MODEL_INTERFACE_I11_APPROVED.md §9（S3 移植
> 附录——fl001/fc001 适配器先例、verify-i11-bitidentity.mjs 验收工具）、V160 全链。

---

## 0. 本波边界

**做**（三条线）：
1. **I-11 S3 收口（实现）**：GT-001 Plant/Sensor/Controller/Fault 适配器移植（`src/core/plants/
   gt001.js`——fl001/fc001 先例同构）+ GT 四轨（swing/linear/thermo/thermo_comb）消费面接线 +
   **位级验收**（既有 GT Run run_hash/序列逐位不变——verify-i11-bitidentity.mjs 扩展）；
   **S3 范围扩裁定（本波 DEC-2）**：S3 = FL/FC/GT（原文口径 + actuator_fault 纳入）；PV/WT/MG
   内联分支**登记 out-of-S3-scope 顺延**（MG 聚合层无 plant 语义可统一；PV/WT 顺延避险——
   显式边界登记不静默）；
2. **G9 FC-001 FMU G2b 草案轮**（本波唯一 G2b 名额）：`FC001_FMU_G2B_SPEC_DRAFT.md` v0.1
   （5 态物理三层夹心架构 + FMU 2.0 接口契约 + 白名单 5 Run 矩阵 + 6 节因果 + 跨保真比对白名单
   `cross_fidelity_l0_vs_l1_fmu` + 七项契约面预裁定承接）+ 双路独立评审——只到草案+评审，
   **批准与实现 v1.8.0**（实现含 C99 FMU 编译——外部工具链，批准轮裁定编译环境）；
3. **G10 顺延登记 + 小清算**：G10 Arena L2（双层遥测/预算账本/MCP server/N-B18..20/V-11）
   **顺延 v1.8.0**（基础设施自包含、与本波文件面不相交；R-G10-02 外部 Agent 会话待备——
   顺延理由登记）；C3 真 TESPy 挂起维持；步①/步 31/步 32 标签固化随下次 tools 触碰。

**不做**（沿袭 + 本波显式）：
- G9 FMU **实现**（C99 内核/fmu_runner/HTTP bridge/fc001_fmu_oracle——v1.8.0，批准轮后）；
  G10 全部（v1.8.0）；PV/WT/MG 内联分支迁移（out-of-S3-scope 顺延登记）；C3（挂起维持）；
  L2（永久）、插件化、云/账户/实测/HIL/npm/打包器（沿袭）；golden backend 信息块（留位）；
- **任何既有 golden 重出**（12 golden 字节冻结）、**任何 breaking 变更**、任何物理方程变更
  （S3 为纯组织方式重构——I-11 :165「只改变实现组织方式，不新增模型能力、不改变既有验收结论」）。

**版本与语义**：v1.7.0（MINOR——plants/gt001.js 新适配器 + 评审面文档；**零新 golden、零新信号、
零行为变化**——S3 位级验收承载）；additive 三不承诺沿袭（DEC-5）。

## 1. 决策点（全采推荐项）

### DEC-1：G9 FC-001 FMU G2b 草案轮

**采纳（推荐，CHG-20261114-06 ④ 裁定兑现）**：本波草案+双路评审（唯一 G2b 名额），批准与实现
v1.8.0。范围按 G9 spec §2：5 态物理（p_O2/p_N2/p_H2/V_water/T_stack——微重力分离器水容量
guardrail G0-V05-DEC-03：只用水体积与容量比，禁水位/液位词面）、三层夹心架构（C99 FMU 内核/
Python ctypes host + I-11 壳/HTTP bridge + 预烘焙兜底）、白名单 5 Run 矩阵（FC-Run-1..5——
baseline/sensor 闭环/sensor 监测/sensor 水位/actuator α_drain）、6 节因果规则、跨保真比对白名单
`cross_fidelity_l0_vs_l1_fmu`（L0 analytical_demo vs L1 fmu_l1_lumped_unvalidated——model_provenance
新值登记面）；七项契约面预裁定承接（勘误头：fmu_sha256 additive 五哈希零变化、V312 FROZEN 钉
hash 须 CHG、run-g2 步预算扩账 I-7、feedback_mode 等新键 B-1a 显式键纪律、copy-guard 词面
MG=microgrid≠microgravity、arena L2 预算常量协议附记、601/602 行契约面）。

### DEC-2：I-11 S3 收口范围扩裁定（本波裁定）

**采纳（推荐）**：S3 范围 = **FL/FC/GT**（原文口径 + actuator_fault 纳入——G0-V05-DEC-05）；
GT-001 适配器 = `src/core/plants/gt001.js`（传感器偏置 bAt/负荷 demandAt/调速器积分步
govStep/执行器钳位 cappedAt 四角色接口——GT 四轨共享消费）；**PV/WT/MG 内联分支登记
out-of-S3-scope 顺延**（PV/WT：单轨无组合风险；MG：聚合层非机组物理——显式边界登记，
未来 FC-FMU 绑定不涉它们）；位级验收 = 既有全部 GT Run（四轨 × 六 Run + 角点）run_hash/
序列逐位不变（verify-i11-bitidentity.mjs GT 扩展）。

### DEC-3：G10 顺延登记

**采纳（推荐）**：G10 Arena L2 顺延 v1.8.0——理由：① 本波已承载 S3 实现 + G9 草案双评审
（波次容量）；② G10 基础设施（arena2 two-tier/MCP server/N-B18..20/V-11）自包含、与 S3/G9
文件面不相交，顺延零耦合成本；③ R-G10-02（外部 MCP Agent 会话存档）需外部 Agent 备战——
基础设施与外部会话备战可并行推进后一次收口。gate id G10 以启动波 CHG 登记（本 CHG 预登记）。

### DEC-4：步数账（I-7）

**采纳（推荐）**：run-g2 **35 → 35（0 新步）**——S3 为纯组织方式重构（I-11 :165 口径），测试
并入既有步（plants.test.js 步 7 / engine-gt 步 21 扩展）；预算维持 ≤35 申报 0 增步；FIRST-35
机检既有 35 步零改动。

### DEC-5：additive 三不承诺 + push 状态

**采纳（推荐）**：① 五类哈希既有合法输入零变化（S3 位级验收 = 全 GT Run run_hash/序列逐位
不变 + 全系统回归）；② 既有 12 golden 字节零触碰；③ 既有 35 步判据零翻转。push 五批同批暂缓
延续（v0.7.1–v1.6.0），本波产出并入同批；v1.7.0 发布本地提交随 CHG-20261115-05 同口径。

## 2. 波次派发（并发子智能体 + 主线）

**派发前置机检（2026-11-15 已执行）**：CronList/OffPeakList/ListWorkflowRuns 全空；工作树
clean（HEAD=3d8eb18）——无已有进程冲突。全程不 push、不触碰 data/golden/ 既有 12 文件字节、
文件面互斥；**代理中断降级路径**：中断路改主线接管（W8/CHG-20261115-01 先例）。

```text
阶段一（G9 草案轮——本波 G2b 名额）
  W1 G9 草案起草    → 新建 NEXT/FC001_FMU_G2B_SPEC_DRAFT.md v0.1（G9 spec §2 兑现 + 七项契约面承接）
  W2a 评审 A 物理   → 只读独立评审（互不可见）
  W2b 评审 B 治理   → 只读独立评审（互不可见）——结论 W4 代录 §10（批准 v1.8.0）
阶段二（S3 收口实现——主线直接执行，CHG-20261115-01/02 登记路径）
  W3 S3 实现        → src/core/plants/gt001.js 新建 + GT 四轨消费面接线 + 位级探针 + plants.test.js 扩展
阶段三（收尾与发布门）
  W4 门禁与证据    → run-g2 35/35 两次独立 + verify_golden 全注册行 + copy-guard + file-smoke/
                      walkthrough/e2e + P3 草案 §10 代录（如 W2 未代录）+ evidence/g8/v170-release.md
                      + DECISIONS.md CHG-20261115-05 + V1_FACES §14 + G9/G10 台账登记
```

**文件面互不相交声明**：W1 独占 G9 草案新文件；W2a/W2b 只读；W3（主线）独占 src/core/plants/
gt001.js + engine.js GT 消费区 + tests/plants.test.js + tools/verify-i11-bitidentity.mjs；W4 独占
V1_FACES/DECISIONS/evidence/FaultLab.html+G9 草案 §10 状态面——**互不相交**。

**并发度说明**：主机并发额度=1（实测）；依赖序串行（W1→W2a→W2b→W3→W4）；中断路改主线接管。

## 3. 预期失效面

| 面 | 变化 |
|---|---|
| run-g2 | 35 步不变（0 新步）；plants.test.js 断言数增 |
| GT 四轨 | **全字节恒等**（S3 位级验收——run_hash/序列/events/checks 逐位） |
| plants.test.js | 83→N（GT 适配器断言——R-G9-01 的 GT 90 断言面按实读规模落地） |
| V1_FACES | §14 v1.7.0 additive 修订记录（面① plants 组织注记——model_hash 零变化）；面② 12 golden 不变 |
| 契约存档 | G9 草案 + 双评审结论（文档面）；G9/G10 台账登记（CHG） |
| 哈希面 | 零变化（组织方式重构零行为变化——I-11 :165 口径） |

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | S3 迁移破坏位级恒等（GT 四轨 × 组合） | fl001/fc001 先例逐字同构 + verify-i11-bitidentity GT 扩展 + 全 GT Run 改前/改后探针 + 全量回归兜底 |
| 2 | S3 范围蔓延（PV/WT/MG 被牵入） | DEC-2 显式边界登记 + out-of-scope 顺延 |
| 3 | G9 草案与外部 spec 原文偏差 | 原文逐字保留为附录引用 + 草案映射表逐条对照 + 勘误头七项预裁定承接 |
| 4 | 微重力词面触碰 copy-guard | G0-V05-DEC-03 禁词（水位/液位/water level/liquid level）预检 + §6.3 表 |
| 5 | 主机并发额度/代理中断 | 主线接管降级路径（既定） |
| 6 | push 批次累积 | 用户裁定同批暂缓延续 |

**文件结束**。V170_WAVE_DESIGN v1（2026-11-15，CHG-20261115-04 批准，按推荐执行）。
