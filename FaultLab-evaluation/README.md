# FaultLab-evaluation — G0 双独立评审证据包

> **状态**：评审交付完成；**G0 门禁 = CONDITIONAL GO（建议），尚未正式通过**（待决策者批准 `DECISIONS/DECISIONS.md` 的 O-01…O-06）。
> **生成时间**：2026-10-27T19:35+08:00（Asia/Shanghai）。
> **性质**：本目录是**评审证据**，不是产品代码、不是已批准规格、不是基准实现。`SPEC_v0.2_APPROVED.md` 尚**未**创建（V0.2 §16 要求评审通过后才创建）。

---

## 一分钟结论

- **评审对象**：V0.1 页面原型规格（350 行）+ V0.2 下一阶段评估与实施方案（590 行）。
- **三路独立证据**：两名独立上下文评审（工程视角 / 物理视角，互不可见）+ 一个从方程独立实现的数值预言机。
- **一致结论**：`CONDITIONAL GO`。V0.2 §5.3 金标准的数值**没有错误**（三路独立复算一致）；静态 L0 演示可行；但**数据契约、事件语义、积分口径、证据分级、最小 P0** 五类问题使"可追溯、可复核"尚无法客观判定。
- **合并评分**：**3.4 / 5**（物理 3.5、数据 3.5、UX 3.5、可行性 3.0、自动化 3.5、开源 3.5、演进 3.5）。
- **范围建议**：只批准 **FL-001 × 3 组 Run × 5 视图 × 导出/重载**；FC-001/GT-001/三类故障族/Agent Arena 移出 V0.1 P0；**GT-001 当前形态 NO-GO**。
- **合并后 P0 阻断**：**B01–B15**（见 `REVIEWS/REVIEW_DIFF.md` §6）。

---

## 目录

```text
FaultLab-evaluation/
  INPUT/
    V0.1_SPEC.md               # = F:\FaultLab_V0.1_页面原型与交互规格.md（副本）
    V0.2_PLAN.md               # = F:\FaultLab_V0.2_下一阶段评估与实施方案.md（副本）
    FaultLab_V0.1_页面原型与交互规格.md   # 原始文件名副本（与 V0.1_SPEC.md 同内容）
    FaultLab_V0.2_下一阶段评估与实施方案.md
  REVIEWS/
    CODEX_REVIEW.md            # 独立评审 A：工程/数据契约/前端架构（按 V0.2 §13 任务书）
    CLAUDE_REVIEW.md           # 独立评审 B：物理可信性/科研复现/UX（按 V0.2 §14 任务书）
    NUMERIC_ORACLE.md          # 独立数值预言机报告（从方程独立实现，未读评审）
    REVIEW_DIFF.md             # Lead 合并：共识矩阵、分歧裁定、B01–B15
  DECISIONS/
    DECISIONS.md               # 决策建议稿：D-01…D-08、G0-DEC-01…17、O-01…O-06
  tools/
    verify_fl001.py            # 独立数值预言机（纯标准库，可直接运行）
```

---

## 文件清单与 SHA-256

| 文件 | 字节 | 行数 | SHA-256 |
|---|---:|---:|---|
| `INPUT/V0.1_SPEC.md` | 25,778 | 350 | `5378D5EAEE82F52FB3E00023004309948362FADA90DD78F5F8DD6757078B4568` |
| `INPUT/V0.2_PLAN.md` | 40,925 | 590 | `2123E4360B578EB9D76DDC987DF63128759F44B010701631F96120EBF9D21A18` |
| `REVIEWS/CODEX_REVIEW.md` | 84,943 | 599 | `2A7C7CD73BAAFAAF0E0CB40A37B77669FB351FC7F1FF92C832E02761AE3947B2` |
| `REVIEWS/CLAUDE_REVIEW.md` | 68,912 | 541 | `CFA9F82D57C7EE4452AA8A16F60BD05615520EEC1699B07E5B9DCE4759DE86FB` |
| `REVIEWS/NUMERIC_ORACLE.md` | 44,938 | 533 | `CDA98EF5637B6F7419B3808A00EE8AB3EDC6D07F2D1FE5D8ADEC7B55F939064D` |
| `REVIEWS/REVIEW_DIFF.md` | 29,632 | 250 | `37CB2D32BA563E04FF59BD796B7CA137860F7DB5A3D690E845516254AEC934A4` |
| `DECISIONS/DECISIONS.md` | 32,308 | 305 | `71447900AC9D155B63E1C5F18DF07C83E2D081440FE8A808521557402B0A0511` |
| `tools/verify_fl001.py` | 71,067 | 1,550 | `B60C825C390C5098E27F84101673C64B55EDCC14468C52FF3A1CCFCAAA8CFA37` |

> 评审者身份说明：`CODEX_REVIEW.md` / `CLAUDE_REVIEW.md` 由**独立上下文的 Agent** 按 V0.2 §13/§14 任务书执行，**不是** OpenAI Codex 或 Anthropic Claude 产品；文件名沿用文档 §16 的建议命名。

---

## 如何复现

```powershell
# 1) 校验输入哈希
Get-FileHash FaultLab-evaluation\INPUT\V0.1_SPEC.md -Algorithm SHA256
Get-FileHash FaultLab-evaluation\INPUT\V0.2_PLAN.md -Algorithm SHA256

# 2) 运行独立数值预言机（应输出全部 PASS 并 exit 0）
python FaultLab-evaluation\tools\verify_fl001.py

# 3) 机器可读结果
python FaultLab-evaluation\tools\verify_fl001.py --print-json
```

**依赖**：Python 3（本机已用 `C:\Users\LOVEkyy\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe` 验证；仅标准库 `math`/`json`/`argparse`）。

---

## 关键评审结论（按主题）

| 主题 | 结论 | 详见 |
|---|---|---|
| 物理/数值 | §5.3 全部数值三路独立复算一致，**无算错**；但 PHY-01/PHY-06 是定义恒等式，不能称"物理验证"；V0.1 §1 SOC 公式缺 ×100 | CLAUDE_REVIEW §1；NUMERIC_ORACLE §2/§5；B03/B04 |
| 事件语义 | 20−/20+ 必须是同一时刻的两个相位，`pre@19.9s` 的契约写法与 V0.2 冲突 | CLAUDE §1.5；REVIEW_DIFF B01 |
| 积分/容差 | 0.1 s 梯形与解析差 6.17e-7 kWh；0.1 s 左矩形差 5.6e-5（远超 1e-6）；规则未冻结则 golden 会分裂 | CODEX E-06；CLAUDE §1.4；Oracle N-03；B02 |
| 数据契约 | 缺 `DerivedMetric`、`exposure/盲投影`、`run_hash/规范化`、`EvidenceBundle/导入` | CODEX E-01/E-03/E-06/E-07；B05–B08 |
| 页面/状态 | 五逻辑页需 hash 路由；已给出 UX-T01…T13 与错误态矩阵 | CODEX §6；B09/B10 |
| 范围/治理 | 3 系统 + Arena 属未评审扩展；既有 `docs/CONTRACT.md` 是并行原型，不得反推契约；GT-001 当前形态 NO-GO | CODEX §8；CLAUDE §10；B11/B12 |
| 因果与措辞 | `r_meas≡0.4·b=+4 kW` 与发电机补偿无因果；+4 kW ≠ 能量损失；须替换 12 处误导文案 | CLAUDE §3/§5；B13 |
| 验收 | G2 必须"数值脚本 + 浏览器 E2E + RunRegistry/哈希 + Schema"四件套；采纳 SA-01…SA-24 | CLAUDE §7；Oracle N-12；B14 |

---

## 下一步（批准后）

1. 用户裁定 `DECISIONS/DECISIONS.md` §5 的 **O-01…O-06**（产品定位、范围、技术栈、既有实现处置、契约冻结、修复顺序）。
2. 按 B01–B15 产出 G2 文档：`DATA_CONTRACT_SPEC.md`、`MODEL_VALIDATION_SPEC.md`、`UI_COPY_GUARDRAILS.md`、`BACKLOG_APPROVED.md`、`SCOPE_SPLIT_MEMO.md`。
3. 由 oracle 重出 `data/golden/fl001_v1.json`，再进入 G1/G2 实现性工作。
4. G0 批准后**才**创建 `DECISIONS/SPEC_v0.2_APPROVED.md`。

---

## 边界与免责

- 本证据包**未运行**产品代码、**未验证**页面渲染、**未做**模型验证/实测/硬件验证、**未**核验第三方许可证原文。
- 评审期间工作区存在并行的编码会话（`src/**`、`docs/CONTRACT.md`、`artifacts/**` 持续变化）；本目录结论只对上述哈希快照负责，不追认任何并行实现为已批准规格。
- 引用外部文档时以 INPUT 副本哈希为准；若上游文件被修改，本目录结论需重新生成。
