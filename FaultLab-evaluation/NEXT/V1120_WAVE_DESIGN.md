# V1120_WAVE_DESIGN — v1.11.0 治理波设计（并发子智能体：GT-001 FMU 草案 + PV/WT/MG 评估 + D-5v2 评估 + L2 runbook）

> **性质**：阶段设计文档（Lead 起草，2026-11-18）——V07_ROADMAP v3（CHG-20261118-07）
> 首波。**治理面并发波——零代码零 golden 零版本**（v1.7.0 先例）。
> **授权记录（CHG-20261118-08）**：用户 2026-11-18 指令链（CHG-20261118-07 ② 授权开工，
> **并发子智能体**）——**DEC-1…4 全采推荐项**。
> **输入**：FC001_FMU_G2B_SPEC_APPROVED v1.0（草案模板 + G2b 体例先例）、GTL1/GTCMB
> APPROVED v1.0（GT 物理权威文本）、gt001_v3/v4 oracle、fc001_fmu 全链实现（C99/parity/
> bridge 先例）、D5_PLUGIN_ARCHITECTURE_ASSESSMENT.md（v1 评估稿）、EVAL_TRACK_GUIDE §6。

---

## 0. 本波边界

**做**：
1. **S1（子代理）**：A-6 GT-001 L1-FMU **G2b 草案**——`NEXT/GT001_FMU_G2B_SPEC_DRAFT.md`
   （fc001_fmu APPROVED 先例同构：三层夹心/EQ-GTFMU 冻结表草案/19 参数字典转写/标称稳态
   表/Run 矩阵/键面/因果与比对面/golden 计划/Q 点全候选——物理内容自 GTL1/GTCMB APPROVED
   逐字转写，值零改动）；
2. **S2（子代理）**：C-6 PV/WT/MG **L1 深度评估报告**——
   `NEXT/PV_WT_MG_L1_DEPTH_ASSESSMENT.md`（逐系统教学增量/物理域适配/G2b 成本/推荐裁定
   ——只读评估，零代码触碰）；
3. **S3（子代理）**：D-5v2 **插件架构评估报告**——
   `NEXT/D5_PLUGIN_ARCHITECTURE_ASSESSMENT_V2.md`（八面冻结 + 1.0 API 承诺 + FMU backend
   时代重评估——SystemDef/ScenarioTemplate/EvalAgent/FmuProvider 可注册化边界，仅评估）；
4. **S4（主线）**：B-5 **L2 运营 runbook**——`NEXT/L2_SESSION_OPERATIONS_RUNBOOK.md`
   （组织方视角全流程：盲包生成/令牌分发/提交回收/verify 落章/归档——eval-session-003
   就绪面）；
5. **S5（子代理 ×2，S1 落地后）**：GT-001 FMU 草案**双路独立评审**（W2a 物理/数值 +
   W2b 治理/契约——互不可见，fc001 体例）；
6. **S6（主线收口）**：评审结论代录 + 条件落正文（采纳推荐项）+ 台账/证据/commit/push。

**不做**：GT-001 FMU 实现（待用户批准——DEC-2）；TL-001 前研（v1.13）；C3（挂起维持）；
任何代码面/golden/版本变更。

**版本面**：零代码面变更 ⇒ **不切版本发布**（v1.7.0 先例）；v1.12.0 = GT-001 FMU 批准+
实现轮（用户批准后另行派发）。

## 1. 决策点（全采推荐项）

### DEC-1：GT-001 FMU 物理域 = thermo 轨（EQ-GTL1）为基准、comb（EQ-GTL2）为深化变体
**采纳（推荐）**：gt001_v3（thermo，T-B）为 FMU 内核基准轨——双 oracle（gt001_l1/
gt001_comb）在位 ⇒ 草案面定义 thermo 基准 + comb 深化轨两案并列（v1.12 实现裁定）。

### DEC-2：批准纪律
**采纳（推荐）**：草案+双评审落档后，**批准留待用户**（V312 B-4——不因路线图默认通过）。

### DEC-3：并发派发拓扑
**采纳（推荐）**：S1/S2/S3 三子代理并发（文件面互斥）+ S4 主线并行 + S5 双评审在 S1
落地后串行派发（互不可见——V170 W2a/W2b 体例）。

### DEC-4：步数账 + 三不承诺
**采纳（推荐）**：run-g2 36→36 零增步（治理波零代码）；既有 13 golden 字节零触碰；
五类哈希既有输入零变化。

## 2. 波次派发

```text
S1/S2/S3（并发子代理，同时派发）→ S4（主线并行）→ S1 落地 → S5 双评审（子代理 ×2）
→ S6 收口（条件落正文 + 台账 + 证据 + commit + push）
```

## 3. 预期失效面

| 面 | 变化 |
|---|---|
| NEXT/ | +4 文档（草案/两评估/runbook）+ 评审记录（evidence/g2b/） |
| 代码/golden/版本 | **零变化**（治理波） |
| 台账 | CHG-20261118-08（本波批准）+ -09（收口） |

## 4. 风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | GT 物理域 FMU 化的方程面设计歧义（comb 两案并列） | 草案 Q 点全候选 + 双评审 + 用户批准裁定 |
| 2 | 子代理产出与 G2b 体例偏差 | fc001 APPROVED 全文为模板输入 + 评审 A/B 双路兜底 |
| 3 | 评估报告结论越权（替用户裁定） | 报告仅评估+推荐，裁定面显式留用户 |

**文件结束**。V1120_WAVE_DESIGN v1（2026-11-18，CHG-20261118-08 批准，并发派发）。
