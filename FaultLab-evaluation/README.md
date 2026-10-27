# FaultLab-evaluation — G0 评审证据包 + 批准规格索引

> **状态（2026-10-27T20:58 起）**：**G0 已通过**。决策已由用户批准（2026-10-27T20:35 指令），
> G2 规格已产出并冻结于 `DECISIONS/SPEC_v0.2_APPROVED.md`。
> **门禁**：G1/G2 允许开工；**G3 集成与公开发布仍禁止**，直到 G2 四件套（数值 + E2E +
> RunRegistry/哈希 + Schema/单位字典）全部通过。
> **性质**：本目录是**评审证据 + 批准规格**，不是产品代码、不是实机验证、不对既有并行实现作质量背书。
> **冻结哈希**：见 `DECISIONS/SPEC_v0.2_APPROVED.md` 附录 A（17 个文件的 SHA-256 基线）。

---

## 一分钟结论

| 项目 | 结果 |
|---|---|
| **评审对象** | V0.1 页面原型规格（350 行）+ V0.2 下一阶段评估与实施方案（590 行） |
| **证据** | 2 名独立上下文评审（工程视角 / 物理视角，互不可见）+ 1 个从方程独立实现的数值预言机 |
| **评审判定** | **CONDITIONAL GO**；决策侧 **APPROVED**；**G0 = 通过** |
| **合并评分** | **3.4 / 5**（物理 3.5、数据 3.5、UX 3.5、可行性 3.0、自动化 3.5、开源 3.5、演进 3.5） |
| **数值结论** | V0.2 §5.3 金标准经三路独立复算**无算错**；问题在口径与语义（PHY 恒等式、SOC 公式 ×100、积分规则、事件 pre/post） |
| **P0 范围** | **FL-001 × 3 固定 Run × 5 视图 × 单时钟 × 事件 pre/post × 导出/重载 × golden** |
| **扩展处置** | FC=P1 条件候选；**GT-001 当前形态 NO-GO（G2b 后恢复）**；Arena=P2；`load_step` 暂停/重写 |
| **P0 阻断** | B01–B15：文档类已全部关闭（对应规格已冻结）；G2 执行类待办见 §6 |

---

## 目录

```text
FaultLab-evaluation/
  INPUT/                                # 上游输入冻结快照
    V0.1_SPEC.md / V0.2_PLAN.md         # 规范文件名副本
    FaultLab_V0.1_页面原型与交互规格.md  # 原始文件名副本
    FaultLab_V0.2_下一阶段评估与实施方案.md
  REVIEWS/                              # 评审证据
    CODEX_REVIEW.md                     # 评审 A：工程/数据契约/前端架构（v0.2 §13 任务书）
    CLAUDE_REVIEW.md                    # 评审 B：物理可信性/科研复现/UX（v0.2 §14 任务书）
    NUMERIC_ORACLE.md                   # 独立数值预言机报告
    REVIEW_DIFF.md                      # 合并：共识矩阵、分歧裁定、B01–B15
  DECISIONS/                            # 决策与冻结
    DECISIONS.md                        # 已批准决策（D-01…D-08、G0-DEC-01…17、O-01…O-06）
    SPEC_v0.2_APPROVED.md               # ★ 批准规格冻结索引 + 基线哈希清单
  NEXT/                                 # G2 执行规格（本版权威）
    DATA_CONTRACT_SPEC.md               # 数据对象/事件/哈希/导入/投影/错误码
    MODEL_VALIDATION_SPEC.md            # 模型定义/golden/PHY/SA/oracle/G2 四件套
    UI_COPY_GUARDRAILS.md               # 文案标签/因果护栏/+4 kW 教学卡/禁止词
    BACKLOG_APPROVED.md                 # P0a/P0b/P1/P2 任务与 DoD
    SCOPE_SPLIT_MEMO.md                 # FC/GT/Arena/load_step 处置与 G2b
  tools/
    verify_fl001.py                     # 可执行独立数值预言机（stdlib，exit 0）
  README.md                             # 本文件
```

---

## 文件清单与 SHA-256（与 SPEC 附录 A 一致）

| 文件 | 字节 | 行数 | SHA-256 |
|---|---:|---:|---|
| `INPUT/V0.1_SPEC.md` | 25,778 | 350 | `5378D5EAEE82F52FB3E00023004309948362FADA90DD78F5F8DD6757078B4568` |
| `INPUT/V0.2_PLAN.md` | 40,925 | 590 | `2123E4360B578EB9D76DDC987DF63128759F44B010701631F96120EBF9D21A18` |
| `REVIEWS/CODEX_REVIEW.md` | 84,943 | 599 | `2A7C7CD73BAAFAAF0E0CB40A37B77669FB351FC7F1FF92C832E02761AE3947B2` |
| `REVIEWS/CLAUDE_REVIEW.md` | 68,912 | 541 | `CFA9F82D57C7EE4452AA8A16F60BD05615520EEC1699B07E5B9DCE4759DE86FB` |
| `REVIEWS/NUMERIC_ORACLE.md` | 44,938 | 533 | `CDA98EF5637B6F7419B3808A00EE8AB3EDC6D07F2D1FE5D8ADEC7B55F939064D` |
| `REVIEWS/REVIEW_DIFF.md` | 29,632 | 250 | `37CB2D32BA563E04FF59BD796B7CA137860F7DB5A3D690E845516254AEC934A4` |
| `DECISIONS/DECISIONS.md` | 34,920 | 337 | `5498DB817F1CC28681F1A9A3A31E96CE2DE5366AA78E28B184CF6DFF593BD805` |
| `DECISIONS/SPEC_v0.2_APPROVED.md` | 10,898 | 170 | `9ADD2BDE383088BEAE9442DBC573DDE677E96C8777C263B9AF7E6420C7E84DC4` |
| `NEXT/DATA_CONTRACT_SPEC.md` | 30,879 | 547 | `7C2909A27219215A9BC3A6169C7C9B8D034612C66C6158FDA8CD66D46CE76554` |
| `NEXT/MODEL_VALIDATION_SPEC.md` | 43,092 | 511 | `C411AD8DCF9661926F3761D008330485CD2800B55E64380F7028C816463CA3E8` |
| `NEXT/UI_COPY_GUARDRAILS.md` | 40,187 | 435 | `28E15D5891906E0D4AEE2024127BD409587707502B693996745136DBFD1F23EF` |
| `NEXT/BACKLOG_APPROVED.md` | 32,552 | 264 | `BCBAF5D51003AED23DEB0723F53AB21790CD1FC32132CF27C9705ACF50D1C27D` |
| `NEXT/SCOPE_SPLIT_MEMO.md` | 24,273 | 232 | `7EBC27B78BD70579FA5A7D9E7039E7331DB7CFB4E35A39B97DDA0A39B8A287BA` |
| `tools/verify_fl001.py` | 71,067 | 1,550 | `B60C825C390C5098E27F84101673C64B55EDCC14468C52FF3A1CCFCAAA8CFA37` |

> 评审者身份：`CODEX_REVIEW.md` / `CLAUDE_REVIEW.md` 由**独立上下文的 Agent** 按 V0.2 §13/§14
> 任务书执行，**不是** OpenAI Codex 或 Anthropic Claude 产品；文件名沿用 V0.2 §16 建议命名。
> 项目侧被对齐的文档（`docs/CONTRACT.md`、`docs/SCOPE.md`、`docs/AGENT_PROTOCOL.md`、根 `README.md`）
> 的哈希见 `DECISIONS/SPEC_v0.2_APPROVED.md` 附录 A。

---

## 关键结论（按主题）

| 主题 | 结论 | 详见 |
|---|---|---|
| 物理/数值 | §5.3 全部数值三路独立复算一致、**无算错**；但 PHY-01/06 是定义恒等式（`r_true≡0`、`E_gen+E_bat≡0.5`），不能称"物理验证"；V0.1 §1 SOC 公式缺 ×100 | CLAUDE_REVIEW §1；NUMERIC_ORACLE §2/§5；MODEL_VALIDATION_SPEC |
| 事件语义 | `pre` = `t_s=20.0` 左极限（19.9 只是普通采样）；`post` = 20.0 采样行；导出 CSV 20.0 行=post | DATA_CONTRACT_SPEC §2.5；docs/CONTRACT.md §5.0 |
| 积分/容差 | 金标准=解析积分；0.1 s 梯形差 6.17e-7 kWh、左矩形差 5.6e-5（超 1e-6）；trapz 仅敏感性 | MODEL_VALIDATION_SPEC §7 |
| 数据契约 | 冻结对象/字段/Canonicalization v1/run_hash/EvidenceBundle/导入负例/`exposure` 投影/15 条错误码 | DATA_CONTRACT_SPEC |
| 因果/措辞 | `r_meas≡0.4·b=+4 kW` 与发电机补偿无因果；+4 kW×40 s=0.04444 kWh ≠ 实际少放电 0.04278 kWh；W-01…W-12 替换表 | UI_COPY_GUARDRAILS |
| 范围 | P0=FL-001-only；GT NO-GO；FC=P1 条件候选；Arena=P2；`load_step` 暂停/重写 | DECISIONS；SCOPE_SPLIT_MEMO；BACKLOG_APPROVED |
| 治理 | 既有并行实现=原型/技术债 + 冻结快照；不得反向定义 SPEC；变更走 CHG | DECISIONS G0-DEC-14/17；SPEC §5 |

---

## 如何复现

```powershell
# 1) 校验任一文件哈希（与 SPEC 附录 A 对比）
Get-FileHash FaultLab-evaluation\DECISIONS\SPEC_v0.2_APPROVED.md -Algorithm SHA256
Get-FileHash FaultLab-evaluation\INPUT\V0.1_SPEC.md -Algorithm SHA256

# 2) 运行独立数值预言机（应输出全部 PASS 并 exit 0）
python FaultLab-evaluation\tools\verify_fl001.py

# 3) 机器可读结果
python FaultLab-evaluation\tools\verify_fl001.py --print-json
```

**依赖**：Python 3（仅标准库）；本机已验证
`C:\Users\LOVEkyy\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe`。

---

## 下一步（G2 执行清单，按 `SPEC_v0.2_APPROVED.md` §3.3）

1. 由 oracle 生成 `data/golden/fl001_v1.json`（解析全精度 + method_id + 容差；**禁止**由浏览器 engine 生成）。
2. 建 `tools/oracle/` 正式目录与 `scripts/verify_golden`（exit 0/1/2）；把现有 `tools/verify_fl001.py` 纳入。
3. 建 G2 四件套：数值脚本（已有雏形）+ 浏览器 E2E（PHY-08）+ RunRegistry/规范哈希（PHY-09）+ Schema/单位字典（PHY-10）。
4. 按 `BACKLOG_APPROVED.md` P0a 的 8 个工作包开工（先 Schema → golden → engine，再 UI 集成）。
5. 既有实现按 SPEC 重基线五项：事件 pre 语义、SOC 公式、积分口径、证据包/哈希、`exposure` 投影。

---

## 边界与免责

- 本证据包**未运行**产品代码、**未验证**页面渲染、**未做**模型验证/实测/硬件验证、**未**核验第三方许可证原文。
- 所有"通过/一致"均限于**模型内部一致性**或**文档级复核**；`model_validation=not_performed`、
  `hardware_verification=not_performed` 不变。
- 评审期间工作区存在并行编码会话；本目录结论只对 SPEC 附录 A 的哈希快照负责，不追认并行实现
  完成度为已批准事实。
- 若上游输入文件被修改，本目录结论需重新生成（输入哈希见上表）。
