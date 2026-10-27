# FaultLab V0.1 — 实现范围与状态说明（SCOPE）

> **状态**：`G0-ALIGNED`（2026-10-27T20:35 用户指令批准"产出文档并对齐 docs 到本次决策"）。
> **权威顺序**：`FaultLab-evaluation/DECISIONS/DECISIONS.md` → `FaultLab-evaluation/NEXT/*.md`（规格）
> → `docs/CONTRACT.md`（实现契约）→ 既有实现。
> **重要声明**：本文件描述的是**既有并行实现的完成度（自评）**。其中任何 ✔/✅ 均为**原型自检结果**，
> **未经 G0 评审验证**，不构成科学验收、模型验证或硬件验证。判定通过与否只认
> `NEXT/MODEL_VALIDATION_SPEC.md` 的 PHY/SA 矩阵与 `NEXT/DATA_CONTRACT_SPEC.md` 的字段校验。

---

## 1. 范围裁决（G0）

| 层级 | 内容 | 依据 |
|---|---|---|
| **P0 基线（唯一验收路径）** | `FL-001` × 3 组固定 Run（baseline / closed_loop_fault / monitor_only）× 5 逻辑视图 × 单一时钟 × 事件 pre/post × 因果证据跳转 × 对比兼容检查 × CSV/证据包导出与重载 × golden 校验 | D-01..D-08、G0-DEC-01/16 |
| **P1 扩展** | FC-001（修复后）、受限参数编辑、HTML 报告、双屏/差值视图、移动端专项、单文件交付能力 | G0-DEC-01/15 |
| **P2 扩展预览** | GT-001（G2b 之后）、Agent Arena / 盲诊断（合成场景评测游戏）、Python/Simulink/FMU 适配、Benchmark | G0-DEC-14/15、FL-19/20 |

**明确不在 V0.1 P0**：3 系统全量、三类故障族全量、Agent Arena、HTML 报告、参数自由编辑、移动端专项、
FMU、LLM、账号/云/排行榜。

**旧口径覆盖声明**：`docs/CONTRACT.md` §1 原先把"3 系统 + 3 故障族 + Agent Arena"列为 V0.1 必须交付；
G0-DEC-14 已将其降为扩展预览。本文件与 `NEXT/SCOPE_SPLIT_MEMO.md` 为该裁决的对齐记录。

---

## 2. 规格要求 → 实现状态（原型自评，非验收）

### 2.1 V0.1 规格 §12 P0 子集（FL-001 基线）

| 规格条目 | 实现位置 | 原型状态（自评） | G0 备注 |
|---|---|---|---|
| 五页面（首页/系统/曲线/因果/对比） | `src/ui/pages/*`、shell hash 路由 | 已实现 | 需按 `BACKLOG_APPROVED.md` P0a 重基线验收 |
| FL-001 默认闭环、20 s +10 A | `src/core/systems.js`、`src/core/engine.js` | 已实现 | 数值以 `MODEL_VALIDATION_SPEC.md` golden 为准；"逐位一致"表述已改为 1e-6 容差 |
| 真值/观测分离（source_kind） | 信号元数据 + 全站来源标签 | 已实现 | 需补 `exposure` 字段（DATA_CONTRACT_SPEC §4.4） |
| 实时曲线（真/测/派生、事件、游标、缩放） | `src/ui/chart.js`、`pages/signals.js` | 已实现 | 事件 pre/post 需改为左极限语义（B01） |
| 基准对照（无故障 vs 故障） | `ensureBaseline` + `pages/compare.js` | 已实现 | 兼容规则需允许 feedback_mode 白名单（B13/C-10） |
| 确定性因果解释 | `run.causal`（engine 生成） | 已实现 | **⑤→⑥ 过度因果需改画**；页头需加"非诊断"横幅（B13） |
| CSV / 配置导出 | `src/ui/export.js` | 已实现 | 证据包格式需对齐 `EvidenceBundle v1`（B06）；hash 语义需补 run_hash（B05） |
| 校验提示与异常态 | `run.quality` + UI 状态 | 已实现 | PHY-01/06 需改名"定义自洽"（B03） |
| 响应式桌面体验 | `css/theme.css` 断点 | 已实现 | 深度无障碍/移动端为 P1 |

### 2.2 规格 P1（既有实现覆盖，原型级）

- 仅监测对照：`createMonitorContrast`；**G0 已将其提升为 P0 三组 Run 之一**（D-04）。
- 参数编辑（幅值/时刻）：**G0 降级为 P1**，且范围受限（`0<|b|≤20 A`、`t_f` 为 0.1 s 整数倍；B15）。
- 差值曲线、HTML 报告、数据源检查器、无障碍：P1；其中"差值"G0 建议 P1（叠加+兼容检查保 P0）。

### 2.3 扩展预览（P1/P2，非验收）

- **FC-001**：结构同构 FL-001；**待修 SOC 末值**为 `59.4755556% / 59.5866667%`（含 τ_fc 过渡；旧值偏 0.00334 pp），
  补假设清单，方可作 P1 的 L0b 候选（B12）。
- **GT-001**：**当前形态 NO-GO**（G0-DEC-15）。已知缺陷 5 项（恢复时间、`r_meas` 无定义、`r_true/P_rotor`
  冲突、惯量线性化未声明、电池额定矛盾）。仅保留为扩展规格草案，不得写入 golden 或对外结论。
- **三类故障族**：`sensor_drift` 保留；**FL-001 `load_step` 暂停实现**（文本自相矛盾且违反 V0.2 R-02，B12）；
  `actuator_fault` 为扩展预览。
- **Agent Arena**：P2 扩展预览（第六页）。`truthSealed` 是 UI 开关、**不是安全边界**；
  契约级真值隔离以 `DATA_CONTRACT_SPEC.md` 的 `exposure` / `project('blind')` 为准（B08）。
- **单文件构建**：`FaultLab.html` 属 P1 交付能力（G0-DEC-03），不改变 P0 静态目录验收路径。

---

## 3. 必须修正的已知偏差（对齐 G0，按优先级）

| # | 项目 | 现状 | G0 要求 | 关联 | 归属 |
|---|---|---|---|---|---|
| A-1 | 事件 pre 相位 | 实现/文档按"pre=19.9 s 采样" | `t_s=20.0` 左极限 + `derivation:'left_limit'`；19.9 只是普通采样 | B01 | engine + 文档 |
| A-2 | SOC 公式 | `docs/CONTRACT.md` 旧式缺 ×100（实现值已对，需复核代码公式） | `SOC% = 60 − 100·(1/40)·∫P dt/3600` | B04 | engine + 文档 |
| A-3 | 积分规则 | 未冻结（解析 vs trapz 混用会让金标准分裂） | 解析积分为 golden；数值求积仅敏感性并声明 method_id | B02 | metrics + 文档 |
| A-4 | 因果图 ⑤→⑥ | 提示"发电机补偿导致测量残差" | ⑥ 为代数恒等 `r_meas≡0.4b`；改画/弱化箭头；+4 kW 教学卡 | B13 | causal 页 |
| A-5 | 证据包/哈希 | 只有 config/model hash，无 run_hash/规范化/导入契约 | `EvidenceBundle v1` + Canonicalization v1 + 导入流程与负例 | B05/B06 | export + 文档 |
| A-6 | 真值暴露 | `blindVisible` 仅在实现中，文档无 `exposure`/投影 | SignalCatalog 增 `exposure`；`project('demo'/'blind')` 纯函数 | B08 | 协议 + 文档 |
| A-7 | PHY-01/06 命名 | 称"真实功率平衡/守恒验证" | 改名"定义自洽"；物理级门禁改为 golden 比对 + ODE 残差 | B03 | checks + 报告 |
| A-8 | GT/FC/load_step | 作为 V0.1 功能交付 | GT NO-GO；FC 修正；load_step 暂停 | B12 | 范围 + 文档 |
| A-9 | 完成度声明 | 本文件旧版称"规格 P0 全部实现 ✅" | 降级为"原型自评，未经 G0 验证" | B11/C-07 | 本文件 |

---

## 4. 扩展实现的边界（保留说明）

- **三系统共用**：五页面、同一 store/时间线/数据协议/导出；内容由 `SystemDef` 驱动，非写死
  （扩展预览，非 P0 验收）。
- **三类故障家族**：每系统各 3 个场景，支持闭环/仅监测；故障目录含幅值与时刻 bounds
  （FL-001 `load_step` 已暂停；其余为扩展预览）。
- **Agent Arena**：真值隔离靠 `blindVisible` 过滤 + 导出包递归断言（**UI 级**）；内置 5 个确定性
  Agent；评分 100 分制；外部协议见 `docs/AGENT_PROTOCOL.md`。**不得表述为真实诊断能力评测。**
- **可追溯性**：所有 Run 仍走同一不可变 Run 协议（configHash/modelHash、事件快照、质量检查）。

---

## 5. 验收命令（现状）

```powershell
# 既有原型的自检（仅证明实现行为，不构成模型验证）
node tests/core.test.js      # FL-001 数值表、monitor、扩展场景、FC/GT、哈希（原型级）
node tests/arena.test.js     # 盲测隔离、确定性、评分区分度（扩展预览级）
node tools/qa.mjs ux         # UX-01..UX-12 浏览器端自检
python tools/oracle.py       # 既有 Python 黄金样例（采用 0.1 s 梯形，非 G2 金标准）

# G2 的独立金标准（G0 后新增，权威）
python FaultLab-evaluation/tools/verify_fl001.py
```

> **注意**：`tools/oracle.py` 使用 0.1 s 梯形积分，与 G2 的解析金标准存在 ~6.17e-7 kWh 偏差
> （见 `REVIEWS/CODEX_REVIEW.md` C-05）；G2 起以 `FaultLab-evaluation/tools/verify_fl001.py`（解析积分）
> 为金标准来源。`tests/*.test.js` 的通过与否只代表原型行为，不代表 G2 通过。

---

## 6. 未验证 / 待确认（G0 遗留）

1. **模型有效性**：未做模型验证（`model_validation=not_performed`）、未做硬件验证
   （`hardware_verification=not_performed`）；`r_true≡0` 与 `E_gen+E_bat≡0.5` 是定义恒等式。
2. **GT-001**：验收数值、`r_meas/r_true` 定义、惯量线性化、电池额定均未通过 G2b。
3. **FC-001**：SOC 末值与假设清单待修；未设独立 golden。
4. **事件/积分/哈希/导入**：四项契约尚未冻结（B01/B02/B05/B06），实现与文档需同步重基线。
5. **Arena**：仅 UI 级真值隔离；打分口径未经独立评测协议验证。
6. **浏览器/环境**：视觉与性能仅在 Chrome/Edge（Windows）自测；localStorage ≈5 MB，超限自动裁剪历史 Run。
7. **外部 Agent 协议**：`arena_version = "0.1"` 草案，P2 范围。

---

## 7. 变更记录

| 日期 | 变更 | 依据 |
|---|---|---|
| 2026-10-27（初版） | 记录规格映射、主动偏差 D-1..D-5、扩展边界、验收命令 | 并行实现会话 |
| 2026-10-27T20:35（本版） | **G0 对齐**：范围降级（FL-001-only P0）；GT NO-GO；FC 修正清单；load_step 暂停；事件/SOC/积分/哈希/真值暴露偏差登记；完成度声明降级为"原型自评" | DECISIONS（用户批准）、REVIEW_DIFF B01–B15 |
