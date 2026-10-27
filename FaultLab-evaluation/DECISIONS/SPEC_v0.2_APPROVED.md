# SPEC_v0.2_APPROVED — FaultLab V0.2 批准规格冻结索引

> **状态**：`FROZEN / APPROVED`（2026-10-27T20:35 用户指令批准；索引生成 2026-10-27T20:58）
> **批准人**：用户（产品与范围最终裁定者）。**记录者**：Team Lead（`lead`）。
> **性质**：本文件是 **G0 通过的官方索引**，不重复规格内容；它声明"哪些文件是已批准的规格"、
> "各自哈希是什么"、"G0/G1/G2/G3 门禁处于什么状态"。V0.2 §16 要求：冻结本文件后才向实现
> Agent 下发建仓/编码任务——**本文件即为该冻结凭证**。
> **变更控制**：任何对下列文件的修改必须先按 `DECISIONS.md` G0-DEC-17 记录 `CHG-YYYYMMDD-NN`，
> 然后更新本文件附录 A 的哈希；重大范围变更（O-02/O-03 翻转）必须重开 G0。

---

## 1. 批准记录

| 项目 | 内容 |
|---|---|
| **批准指令** | 2026-10-27T20:35（Asia/Shanghai）：「产出文档并且对齐 docs 文档到本次决策」 |
| **批准范围** | `DECISIONS/DECISIONS.md` 的 D-01…D-08、G0-DEC-01…17；O-01…O-06 按 Lead 建议（全 A）执行 |
| **G0 判定** | 评审侧 CONDITIONAL GO；决策侧 **APPROVED**；**G0 门禁 = 通过（文档类阻断关闭，进入 G2 执行）** |
| **合并评分** | 3.4 / 5（Codex 3.5、Claude 3.4；逐维取严合并，见 `REVIEWS/REVIEW_DIFF.md` §3） |
| **证据基础** | 两份独立上下文评审 + 独立数值预言机（`REVIEWS/*`），oracle 可执行且 `exit 0` |

---

## 2. 已批准规格文件（本 SPEC 的组成部分）

### 2.1 决策与评审（约束层）

| 文件 | 作用 | 权威级别 |
|---|---|---|
| `DECISIONS/DECISIONS.md` | 决策记录（D/G0-DEC/O 裁定、理由、替代、后悔成本、撤回条件） | **最高**（冲突以此为准） |
| `REVIEWS/REVIEW_DIFF.md` | 合并评审、B01–B15 阻断清单、分歧裁定 | 评审证据（问题追溯） |
| `REVIEWS/CODEX_REVIEW.md`、`REVIEWS/CLAUDE_REVIEW.md` | 双独立评审原文 | 评审证据 |
| `REVIEWS/NUMERIC_ORACLE.md` + `tools/verify_fl001.py` | 独立数值预言机（金标准复核） | 数值证据 |
| `INPUT/V0.1_SPEC.md`、`INPUT/V0.2_PLAN.md` | 上游输入（冻结快照） | 输入事实 |

### 2.2 规格（执行层，G2 唯一依据）

| 文件 | 覆盖范围 | 关联阻断 |
|---|---|---|
| `NEXT/DATA_CONTRACT_SPEC.md` | 数据对象/字段/事件编码/哈希/导入导出/投影/错误码 | B01/B02/B05/B06/B07/B08/B14 |
| `NEXT/MODEL_VALIDATION_SPEC.md` | FL-001 模型定义/golden/PHY/SA 矩阵/oracle 结构/G2 四件套 | B02/B03/B04/B14 |
| `NEXT/UI_COPY_GUARDRAILS.md` | 文案标签/因果护栏/+4 kW 教学卡/禁止词/状态文案 | B13 |
| `NEXT/BACKLOG_APPROVED.md` | P0a/P0b/P1/P2 任务与 DoD、依赖、既有实现映射 | B09 |
| `NEXT/SCOPE_SPLIT_MEMO.md` | FC/GT/Arena/load_step 处置与 G2b 条件 | B11/B12/B15 |

### 2.3 实现契约与项目文档（已按 G0 对齐）

| 文件 | 说明 |
|---|---|
| `docs/CONTRACT.md` | 实现契约；文末「附录 G0 对齐记录」列出 14 条对齐项 |
| `docs/SCOPE.md` | 实现范围与状态（G0 对齐版；完成度声明降级为"原型自评"） |
| `docs/AGENT_PROTOCOL.md` | Arena 协议（P2 扩展预览注记） |
| `README.md` | 项目说明（G0 状态/范围/真实性标签已对齐） |

---

## 3. 范围与门禁状态

### 3.1 批准的 P0 范围（唯一验收路径）

`FL-001` × 3 固定 Run（`baseline` / `closed_loop_fault` / `monitor_only`）× 5 逻辑视图 ×
单一时钟 × 事件 pre/post × 因果证据跳转 × 对比兼容检查 × CSV/证据包导出与重载 × golden 校验。

**不在 P0**：3 系统全量、三类故障族全量、Agent Arena、HTML 报告、参数自由编辑、移动端专项、
FMU、LLM、账号/云/排行榜。FC/GT/Arena/load_step 的处置见 `NEXT/SCOPE_SPLIT_MEMO.md`。

### 3.2 门禁

| 门禁 | 状态 | 说明 |
|---|---|---|
| **G0 评审+决策** | ✅ **通过** | 双评审 + oracle + 合并 + 决策批准 + 规格冻结（本文件） |
| **G1 高保真原型** | 🟡 允许开工 | 所有数值必须标 `PRESET · 未验证`；不得作为 G3 数据源 |
| **G2 物理/数值契约** | 🟡 执行中 | 规格已冻结；待执行：golden 重出（oracle）+ 四件套（数值/E2E/registry/schema） |
| **G3 MVP 集成** | ⛔ 禁止 | 直到 G2 四件套全部通过（`MODEL_VALIDATION_SPEC.md` §10） |
| **G4/G5 发布** | ⛔ 禁止 | 待 G3 后再评 |

### 3.3 已知未完成项（G2 执行清单，不改变规格效力）

1. `data/golden/fl001_v1.json` 尚未生成（由 oracle 按 `MODEL_VALIDATION_SPEC.md` §6 生成；
   **禁止**由浏览器 engine 生成）。
2. `tools/oracle/` 正式目录与 `scripts/verify_golden` 尚未建立（当前临时 oracle 为
   `tools/verify_fl001.py`，可直接运行，`exit 0`）。
3. G2 四件套中 E2E / RunRegistry / Schema 校验器尚未接入；`PHY-08/09` 必须由它们判定。
4. 既有实现（`src/**`）尚未按本 SPEC 重基线：事件 pre 语义、SOC 公式、积分口径、证据包/哈希、
   `exposure` 投影五项为已知差异（见 `NEXT/BACKLOG_APPROVED.md` §4 与 `docs/CONTRACT.md` 附录）。
5. FC-001 SOC 末值、GT-001 G2b、FL-001 `load_step` 重写均未开始（P1/P2）。

---

## 4. 效力与免责

1. **本 SPEC 生效后**：实现 Agent 可按 `NEXT/BACKLOG_APPROVED.md` 的 P0a 开工（先 Schema → golden →
   engine，再 UI 集成）；任何实现不得反向定义本 SPEC。
2. **不构成物理有效性声明**：本 SPEC 冻结的是"教学演示模型 L0 的内部一致性与可核查性"；
   `model_validation=not_performed`、`hardware_verification=not_performed` 保持不变。
3. **既有实现不追认**：工作区并行实现仍定性为"原型/技术债"（G0-DEC-14）；其 README/SCOPE 中的
   测试数字是原型自评，G2 重基线后须复测。
4. **哈希即身份**：附录 A 的 SHA-256 是本批准版的基线；任何文件变更须按 §5 更新。

---

## 5. 变更流程

```text
1) 提出 CHG（G0-DEC-17 模板）：影响文件 / 理由 / 关联问题 ID / 替代方案。
2) 判断级别：
   - 文档措辞/字段补充（不改变语义）→ Lead 批准 + 更新附录 A。
   - 字段语义/golden/容差变更 → 用户批准 + 升 model_version/schema_version + 重建 golden。
   - 范围/架构变更（O-02/O-03）→ 重开 G0。
3) 更新本文件附录 A 与 `DECISIONS.md` §8 变更记录。
```

---

## 附录 A：批准基线哈希清单（2026-10-27T20:58 快照）

> 复核命令：`Get-FileHash <path> -Algorithm SHA256`（Windows PowerShell）。
> 行数为物理行数；字节为 UTF-8 文件大小。

| 文件 | 字节 | 行数 | SHA-256 |
|---|---:|---:|---|
| `FaultLab-evaluation/INPUT/V0.1_SPEC.md` | 25,778 | 350 | `5378D5EAEE82F52FB3E00023004309948362FADA90DD78F5F8DD6757078B4568` |
| `FaultLab-evaluation/INPUT/V0.2_PLAN.md` | 40,925 | 590 | `2123E4360B578EB9D76DDC987DF63128759F44B010701631F96120EBF9D21A18` |
| `FaultLab-evaluation/REVIEWS/CODEX_REVIEW.md` | 84,943 | 599 | `2A7C7CD73BAAFAAF0E0CB40A37B77669FB351FC7F1FF92C832E02761AE3947B2` |
| `FaultLab-evaluation/REVIEWS/CLAUDE_REVIEW.md` | 68,912 | 541 | `CFA9F82D57C7EE4452AA8A16F60BD05615520EEC1699B07E5B9DCE4759DE86FB` |
| `FaultLab-evaluation/REVIEWS/NUMERIC_ORACLE.md` | 44,938 | 533 | `CDA98EF5637B6F7419B3808A00EE8AB3EDC6D07F2D1FE5D8ADEC7B55F939064D` |
| `FaultLab-evaluation/REVIEWS/REVIEW_DIFF.md` | 29,632 | 250 | `37CB2D32BA563E04FF59BD796B7CA137860F7DB5A3D690E845516254AEC934A4` |
| `FaultLab-evaluation/DECISIONS/DECISIONS.md` | 34,920 | 337 | `5498DB817F1CC28681F1A9A3A31E96CE2DE5366AA78E28B184CF6DFF593BD805` |
| `FaultLab-evaluation/NEXT/DATA_CONTRACT_SPEC.md` | 30,879 | 547 | `7C2909A27219215A9BC3A6169C7C9B8D034612C66C6158FDA8CD66D46CE76554` |
| `FaultLab-evaluation/NEXT/MODEL_VALIDATION_SPEC.md` | 43,092 | 511 | `C411AD8DCF9661926F3761D008330485CD2800B55E64380F7028C816463CA3E8` |
| `FaultLab-evaluation/NEXT/UI_COPY_GUARDRAILS.md` | 40,187 | 435 | `28E15D5891906E0D4AEE2024127BD409587707502B693996745136DBFD1F23EF` |
| `FaultLab-evaluation/NEXT/BACKLOG_APPROVED.md` | 32,552 | 264 | `BCBAF5D51003AED23DEB0723F53AB21790CD1FC32132CF27C9705ACF50D1C27D` |
| `FaultLab-evaluation/NEXT/SCOPE_SPLIT_MEMO.md` | 24,273 | 232 | `7EBC27B78BD70579FA5A7D9E7039E7331DB7CFB4E35A39B97DDA0A39B8A287BA` |
| `FaultLab-evaluation/tools/verify_fl001.py` | 71,067 | 1,550 | `B60C825C390C5098E27F84101673C64B55EDCC14468C52FF3A1CCFCAAA8CFA37` |
| `docs/CONTRACT.md` | 63,994 | 1,152 | `AE93D913A3101237B392BF97DF65344B2FB823245173A2E50C04D94F47F35260` |
| `docs/SCOPE.md` | 9,464 | 129 | `6C4A44415ED67F93EE3E2E6CBBDD19F3D68DCD3829BB54D53B9CCEE07180E0F2` |
| `docs/AGENT_PROTOCOL.md` | 18,467 | 426 | `BAF97E562F8C43FD62A657809939162CA96E23A52AE9F379EB741B5439E2091A` |
| `README.md` | 14,400 | 222 | `0EA63340F41D395266BAA8887DB6B888502EA7EBDBCC5D37A0876A4480647523` |

> 本 SPEC 文件自身不在表中（自引用无意义）；`FaultLab-evaluation/README.md` 为索引视图，随本文件更新。

---

## 附录 B：与 G0 阻断项的对应（关闭状态）

| 阻断 | 关闭方式 | 状态 |
|---|---|---|
| B01 事件 pre/post | G0-DEC-05 + DATA_CONTRACT_SPEC §2.5 + CONTRACT §4.6/§5.1/§6 对齐 | ✅ 文档关闭 |
| B02 积分/容差/舍入 | G0-DEC-06 + MODEL_VALIDATION_SPEC §3.5/§7 + CONTRACT §5.0 | ✅ 文档关闭（golden 待重出） |
| B03 PHY 恒等式语义 | G0-DEC-12 + MODEL_VALIDATION_SPEC §4 | ✅ 文档关闭 |
| B04 SOC 公式 ×100 | G0-DEC-12 + CONTRACT §5.1 | ✅ 文档关闭 |
| B05 哈希/规范化 | G0-DEC-07 + DATA_CONTRACT_SPEC §3 | ✅ 文档关闭 |
| B06 导入/证据包 | G0-DEC-10 + DATA_CONTRACT_SPEC §5 | ✅ 文档关闭 |
| B07 DerivedMetric | G0-DEC-09 + DATA_CONTRACT_SPEC §2.6 | ✅ 文档关闭 |
| B08 真值暴露/投影 | G0-DEC-11 + DATA_CONTRACT_SPEC §6 | ✅ 文档关闭 |
| B09 最小 P0 | G0-DEC-01 + BACKLOG_APPROVED §1/§2 | ✅ 文档关闭 |
| B10 交付形态/工具链 | G0-DEC-03 + CONTRACT §1/§2 + O-03=A | ✅ 文档关闭 |
| B11 范围冲突 | G0-DEC-14 + SCOPE_SPLIT_MEMO §0/§2 + CONTRACT §1 | ✅ 文档关闭 |
| B12 既有契约物理缺陷 | G0-DEC-15 + SCOPE_SPLIT_MEMO §3–§5 + CONTRACT §5.1/§5.2/§5.3 | ✅ 文档关闭（GT G2b/FC 修复为 P1/P2 执行项） |
| B13 因果/措辞 | G0-DEC-13 + UI_COPY_GUARDRAILS §2–§6 | ✅ 文档关闭 |
| B14 G2 四件套 | G0-DEC-16 + MODEL_VALIDATION_SPEC §10 | ✅ 规格关闭（执行待 G2） |
| B15 参数约束 | G0-DEC-04 + MODEL_VALIDATION_SPEC §8 | ✅ 文档关闭 |

> "文档关闭"= 规格与契约文本已修正、可被实现遵循；不等于"实现已验证"。
> G2 的数值/四件套验收仍按 `MODEL_VALIDATION_SPEC.md` §10 执行。

---

**文件结束**。冻结于 2026-10-27T20:58+08:00，基于附录 A 哈希快照。
