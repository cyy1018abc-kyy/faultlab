# BACKLOG_APPROVED — FaultLab V0.1（G0 批准版）任务清单与 P0 范围

> **状态**：`G0-APPROVED`
> **批准时间**：2026-10-27T20:35+08:00（Asia/Shanghai）
> **批准范围**：`FaultLab-evaluation/DECISIONS/DECISIONS.md` 全部决策（D-01…D-08、G0-DEC-01…17）；O-01…O-06 按 DECISIONS §1.0 批准记录（全 A）生效，若需翻转按 G0-DEC-17 记 `CHG`。
> **权威关系**：本文件是 G0 决策在任务层的展开；与 `DECISIONS.md` 冲突时**以 DECISIONS 为准**；与 V0.1/V0.2/`docs/CONTRACT.md`/`docs/SCOPE.md`/`README.md` 冲突时以 DECISIONS 为准（V0.2 §15.2）。本文件**不追认**任何既有实现为已批准规格（G0-DEC-14）。
> **生效依据**：用户 2026-10-27T20:35 批准指令；`DECISIONS.md` 已于 2026-10-27T20:43 同步 `STATUS: APPROVED`（批准记录见其 §1.0）；配套规格 `NEXT/DATA_CONTRACT_SPEC.md`、`NEXT/MODEL_VALIDATION_SPEC.md`、`NEXT/UI_COPY_GUARDRAILS.md` 已交付；冻结索引目标为 `DECISIONS/SPEC_v0.2_APPROVED.md`。
> **生成**：spec-backlog，2026-10-27T20:46+08:00（含 DECISIONS §1.0 批准记录同步）。输入：`DECISIONS.md`（337 行）、`REVIEW_DIFF.md` §6/§7/§8、`CODEX_REVIEW.md` §7/§8/§10、`CLAUDE_REVIEW.md` §9/§10、V0.2 §3/§8/§12、`NEXT/*.md` 三份规格、`docs/CONTRACT.md`/`docs/SCOPE.md`/`README.md`（只读）。
> **真实性声明**：除注明「已交付 / 已存在」者外，本清单任务**均未开始**；本文件不包含「已完成 / 已验证」结论。验收命令标注「计划新建」的，在对应工具存在并跑通前**不得记为通过**。

## 0. 使用规则

| # | 规则 |
|---|---|
| 1 | 任务 ID 沿用 V0.2 §8 的 `FL-xx`；V0.2 未定义的拆分/新增任务用 `G2-xx`（如 `P0a-06 = FL-04m + FL-08` 中的 `m` 表示最小子集）。 |
| 2 | 优先级只有四档：**P0a**（G3 必需，≤8 个工作包）/ **P0b**（G4 质量，可与 P0a 并行）/ **P1**（P0a 关闭 + 用户书面确认后）/ **P2**（G5 后或独立 RFC/G2b）。 |
| 3 | 每个任务四要素必填：DoD（可判定）、验收命令、关联 B-ID/决策、规模 S-M-L。DoD 不写「体验良好」这类主观词。 |
| 4 | 规模 `S/M/L/XL` 是相对工作量，不是工期承诺（同 V0.2 §8 口径）。 |
| 5 | 任何任务不得扩大 G0 批准范围；发现需要扩范围时停在任务边界、提交 CHG（G0-DEC-17），不在实现中悄悄加入。 |

## 1. 范围定义（G0-DEC-01 / REVIEW_DIFF §6 B09）

### 1.1 P0 垂直切片：批准的唯一交付物

`1 系统（FL-001） × 3 固定 Run × 5 逻辑视图 × 单一时钟 × 事件 pre/post × 因果证据跳转 × 对比兼容检查 × 导出/重载证据包 × golden 校验`

| 组成 | 批准定义 | 验收锚点 |
|---|---|---|
| 1 系统 | 仅 `FL-001` 电池储能（BESS）解析模型 | 参数表冻结见 §1.2/§5.3；扩展入口默认关闭（P0b-07） |
| 3 固定 Run | `baseline` / `closed_loop_fault` / `monitor_only_fault` 三组独立不可变 Run（G0-DEC-01 / D-04） | §1.2 golden 表 |
| 5 逻辑视图 | 首页 / 系统交互图 / 实时曲线 / 因果解释 / 结果对比（D-03） | P0a-06 最小只读骨架 + P0b 增强 |
| 单一时钟 | 一个 PlaybackClock 驱动跨页游标；播放/暂停/倍速/刷新不改变 Run 数据 | PHY-08 浏览器 E2E（G0-DEC-16 四件套②） |
| 事件 pre/post | `t_s=20.0` 左极限 `pre` 与右极限 `post`；19.9 s 只是普通采样 | G0-DEC-05 / B01 |
| 因果证据跳转 | 六节点链路至少 1 条 `rule_id + evidence(run_id+signal+time_window)` 可跳转并锁定窗口 | P0a-06 最小版；P0b-03 全量 |
| 对比兼容检查 | 仅允许 `feedback_mode` 差异（白名单）；模型/参数/时钟不一致时禁用「仅故障造成」断言 | D-04；P0b-04 |
| 导出/重载证据包 | `EvidenceBundle v1` 7 文件 + 导入校验/重算/比对 + ≥8 负例 | G0-DEC-10；P0a-08 |
| golden 校验 | 解析金标准由独立 oracle 生成，engine 只读比对；trapz 不得作 golden | G0-DEC-06/16；P0a-03/05 |

### 1.2 三组固定 Run（P0 冻结配置）

冻结参数（G0-DEC-04）：`duration_s=60, sample_dt_s=0.1, fault_time_s=20.0, bias_A=+10, Vdc=400, Iref=25, tau=1.5, Pload=30, Ebat=40, SOC0=60`；601 点（含 t=60）。

| run_id（建议值） | feedback_mode | 故障配置 | 关键 golden（解析口径，G0-DEC-06） |
|---|---|---|---|
| `fl001-baseline-v1` | closed_loop（b=0） | 无故障 | `E_bat=0.1666667 kWh`、`SOC_true(60)=59.5833333%`、`SOC_err=0`、`max r_meas=0` |
| `fl001-closed-loop-fault-v1` | closed_loop | `sensor_drift` +10 A @20.0 s | `E_bat=0.123888888889 kWh`、`E_gen=0.376111111111 kWh`、`SOC_true=59.6902777778%`、`SOC_est=59.5791666667%`、`SOC_err=-0.1111111111 pp`、`max r_meas=+4.0 kW` |
| `fl001-monitor-only-fault-v1` | monitor_only | 同故障、同参数 | `I_true≡25 A`；`SOC_true=59.5833333%`、`SOC_est=59.4722222222%`、`SOC_err=-0.1111111111 pp` |

> 事件编码（G0-DEC-05）：`pre` 恒 `t_s=20.0` 左极限（`b=0, I_meas=25 A`）；`post` 为右极限/采样行（`b=10 A, I_meas=35 A`）；`timeseries.csv` 的 20.0 s 行 = post；两处冲突以 `events.json` 的 `phase` 为准。

### 1.3 五逻辑视图的 P0 最小内容

| 视图 | P0 最小（P0a / G3） | P0b 增强（G4 质量） |
|---|---|---|
| 首页 Home | 系统说明、FL-001 参数摘要、三问题、模型假设抽屉、清晰「开始实验」入口；标「L0 行为级演示」 | 视觉设计令牌、空/错态与恢复路径、键盘焦点顺序 |
| 系统图 System | 只读 SVG 拓扑 + 能量流；点选部件显示字段与 `source_kind`；不展示未建模物理 | 故障编排（P0 仍只读固定配置）、检查器字段全集、运行中锁定 |
| 曲线 Signals | 真/测/派生三线；20.0 阶跃不平滑；事件竖线、游标、当前值快照、CSV（从 Run 取数） | 缩放窗口、基准叠加、SOC 纵轴量程、表格模式、键盘播放 |
| 因果 Causal | 六节点只读链路 + 1 条证据跳转（锁定 `time_window`）；页头「已知故障传播解释，非诊断算法」 | 三层分离（配置/机制/观测）、替代解释与局限、仅监测 vs 闭环反事实、+4 kW 教学卡 |
| 对比 Compare | 选 Run、叠加图、`DerivedMetric` 指标卡、兼容检查三项、不可用显示「不可用」 | 三运行矩阵、事件分叉线、双屏/差值（P1）、HTML 报告（P1） |

### 1.4 明确「不在 P0」清单（G0-DEC-14 / 15）

参数编辑（幅值/时刻可编辑）· HTML 报告 · 双屏/差值视图 · 移动端专项 · **FC-001** · **GT-001** · 三类故障族中 `sensor_drift` 之外的两类（`load_step`、`actuator_fault`）· Agent Arena/盲诊断/Benchmark · Python/Simulink/FMU 后端 · LLM 因果生成 · 账户/云/排行榜 · 服务端分享链接 · 单文件 `FaultLab.html` 作为主交付物。

> 注：`load_step` 当前文本**删除或重写**（G0-DEC-15，详见 `SCOPE_SPLIT_MEMO.md` §5），不在 P0 交付；`actuator_fault` 未评审，P0 不交付。

### 1.5 批准范围守卫（SA-24）

P0 允许的场景白名单：`systemId='FL-001'` 且 `fault.family='sensor_drift'` 且 `magnitude=10` 且 `t_start_s=20.0` 且 `feedback_mode ∈ {closed_loop, monitor_only}`。UI 不提供白名单外的配置入口；若为复用既有代码保留扩展入口，必须默认关闭并标「扩展预览·未评审」，且导出/证据包拒绝白名单外 Run 进入 P0 验收。任务：P0b-07（G2-01）。

## 2. 任务表

### 2.0 字段说明与「验收命令」图例

- **验收命令**为可执行接口；标注「计划新建」的命令由对应任务交付，未交付前该任务**不能**判定通过。
- 已存在可用的命令只有：`python FaultLab-evaluation\tools\verify_fl001.py`（独立数值预言机，应 exit 0）。
- `PHY-xx` = V0.2 §5.5 物理校验；`SA-xx` = CLAUDE_REVIEW §7 验收矩阵；`UX-Txx` = CODEX_REVIEW §6.5 状态测试。

### 2.1 P0a — G3 必需（8 个工作包，覆盖 FL-01/02/03/04m/06/07/08/10/13）

| ID | 名称 / 工作包 | 优先级 | 依赖 | DoD（可判定） | 验收命令 | 关联 B / 决策 | 规模 |
|---|---|---|---|---|---|---|---|
| **P0a-01** | **FL-01** 模型与事件语义说明：复核并冻结 `NEXT/MODEL_VALIDATION_SPEC.md`（Lead T-G2-02 已交付） | P0a | 无（文档基线） | 逐条覆盖：§5.2 方程与初值、单位/量纲、事件相位与时间语义、SOC 公式（含 ×100 修订）、适用边界与未建模物理清单、非验证措辞；与 `DATA_CONTRACT_SPEC` 无口径冲突；FL-001 参数表与 §1.2 逐项一致；为 P0a-03 提供公式来源与验收值表 | 文档评审记录 + `Test-Path FaultLab-evaluation\NEXT\MODEL_VALIDATION_SPEC.md` + 与 G0-DEC-06 数值对照表签字 | B01/B03/B04；G0-DEC-12/13 | S |
| **P0a-02** | **FL-02** 信号字典 + Schema v0.1：复核并冻结 `NEXT/DATA_CONTRACT_SPEC.md`（Lead T-G2-01 已交付） | P0a | P0a-01 | 字段落文且运行时可校验：`SignalCatalog`（含 `exposure`/`precision`）、`RunManifest`（`model_provenance` + `verification` + `integrity`）、`EventSnapshot`、`DerivedMetric`、`EvidenceBundle v1`、`Canonicalization v1`；601 点由 `duration_s/dt_s` 计算而非硬编码；中文可读错误；模型/契约版本字段 | `python tools\validate_schema.py --bundle data\golden\fl001_v1.json`（计划新建）+ 文档评审记录 | B01/B02/B05/B06/B07/B08；G0-DEC-05/06/07/09/10/11 | M |
| **P0a-03** | **FL-03** 独立 oracle 复核 + golden v1（T-G2-03） | P0a | P0a-01/02 | oracle 不 import 产品 engine、不共享公式常量；生成/批准 `data/golden/fl001_v1.json`（三组 Run 全精度值、`method_id='analytic_flux'`、容差、生成命令、oracle 源码 SHA-256）；`created_at` 不入哈希；golden 只读、engine 只读比对；Lead 完成独立复核记录 | `python FaultLab-evaluation\tools\verify_fl001.py`（已存在，应 exit 0）+ `python tools\verify_golden.py`（计划新建） | B02/B14；G0-DEC-16 | M |
| **P0a-04** | **FL-06** RunRegistry / 不可变 Run / `run_hash` | P0a | P0a-02/03 | 同 config 两次运行 `run_hash` 相同；改 `b` 或 `t_fault` 生成新 Run 且旧 Run 不被改写（深冻结）；draft 与 activeRun 分离；Canonicalization v1 + 每文件 SHA-256；PHY-09 通过 | `node tests\registry.test.js`（计划新建）+ E2E 深比较 | B05/B14；G0-DEC-07 | M |
| **P0a-05** | **FL-07** L0 解析 ModelEngine（仅 FL-001） | P0a | P0a-03 | `simulate(config)` 纯函数、确定性、无 DOM/网络/store；601 点；三组 Run 逐点匹配 golden（解析容差：E ±1e-6 kWh、SOC ±1e-5 pp）；`max abs(r_true) ≤1e-12 kW`（定义自洽，非物理验证）；`r_meas=0.4·b`；`engine_version` 入 manifest | `node tests\engine.test.js`（计划新建）+ `python tools\verify_golden.py`（计划新建） | B02/B03；G0-DEC-06/12 | M |
| **P0a-06** | **FL-04m + FL-08** 五视图最小只读骨架 + 单一时钟 / 事件回放 | P0a | P0a-05 | hash 路由五页可深链（刷新/证据跳转保持）；每页只读同一 Run；共享游标/选中/Run 跨页状态；20.0 s pre/post 可定位；播放/暂停/倍速/拖拽前后 Run 数据与哈希不变（PHY-08）；因果页六节点 + 1 条证据跳转 | `node tools\e2e.mjs --journey fl001-min`（计划新建） | B09/B14；D-03/D-04；G0-DEC-16 | L |
| **P0a-07** | **FL-10** 曲线页（真/测/派生、事件阶跃、游标、基准叠加） | P0a | P0a-06 | 20.0 s 处测量序列呈现两个不同 y 点（不跨事件样条/平滑）；实线/虚线/点划线语义与 `SignalCatalog` 一致；游标/缩放不重算；表格模式最小可用；SOC 纵轴明确量程；CSV 全部从 Run 取数 | E2E + SA-19/SA-20 显示字符串断言 | B01/B02/B13 | M |
| **P0a-08** | **FL-13** EvidenceBundle v1 导出/重载 + 最小运行说明 | P0a | P0a-04/05/06 | 导出 7 文件（manifest/config/model_manifest/timeseries/events/metrics/checks）；导入流程 = schema→文件哈希→反序列化→**重算 metrics/checks**→比对 `run_hash`→标 `role:'imported'`、不覆盖现有 Run；≥8 负例（缺文件/坏哈希/旧新 schema/未知字段/超大/注入/NaN/时间非单调）；渲染统一 `textContent`；附最小运行说明（完整 README 由 P0b-06） | `python tools\verify_bundle.py <bundle_dir>`（计划新建）+ 8 负例 fixtures | B06/B14；G0-DEC-10 | L |

### 2.2 P0b — G4 质量（可与 P0a 并行；含新增 G2-01）

| ID | 名称 / 工作包 | 优先级 | 依赖 | DoD（可判定） | 验收命令 | 关联 B / 决策 | 规模 |
|---|---|---|---|---|---|---|---|
| **P0b-01** | **FL-04 完整态 + FL-05** 设计系统 / 键盘焦点 / 表格模式 / 异常态 | P0b | P0a-06 | 设计令牌统一；键盘可完成播放/切页/游标；焦点顺序可走查；图表表格替代；空/加载/失败/无 Run 态均有下一步动作文案；动效可关；不宣称完整 WCAG | UX-T01…T13 子集走查记录 + 截图 | B09/B14 | M |
| **P0b-02** | **FL-09** 系统拓扑与设备数据检查器 | P0b | P0a-06 | SVG 拓扑点选部件 → 检查器字段带 `source_kind`/单位；所有显示值可追溯到 `signal_id`；不展示未建模物理（母线尖峰/转速跌落/保护动作） | 走查记录 + `node tools\qa.mjs ux`（计划迁移，不沿用旧实现断言） | B09/B13 | M |
| **P0b-03** | **FL-11** 因果规则、证据链与说明边界（按 `NEXT/UI_COPY_GUARDRAILS.md`，Lead T-G2-04 已交付） | P0b | P0a-06/07 | 每条解释绑定 `rule_id + causal_rule_version + evidence(run_id+signal+time_window)`；证据跳转锁定窗口；落实 UI_COPY_GUARDRAILS 的 W 表替换与因果图改画（`r_meas` 不再画成由发电机补偿导致）；`+4 kW` 并排「非能量损失」教学卡；无模型支撑显示「本模型无法推导该现象」 | 规则表单测 + E2E 跳转断言 + 措辞替换表走查 | B13；G0-DEC-13 | M |
| **P0b-04** | **FL-12** 三组对照（基准 / 闭环 / 仅监测） | P0b | P0a-05/07 | `compare` 白名单仅允许 `feedback_mode` 差异；模型/参数/时钟不一致给黄色警告并禁用因果断言；指标卡来自 `DerivedMetric`；缺失数据「不可用」不填 0；对比需要 baseline 时给创建入口 | `node tests\compare.test.js`（计划新建）+ E2E | B07；D-04；G0-DEC-09 | M |
| **P0b-05** | **FL-14** 测试矩阵子集（G2 四件套 + SA 子集 + 主旅程 E2E） | P0b | P0a-03/04/05/06/08 | 四件套全部可跑：数值脚本 exit 0、浏览器 E2E、RunRegistry/哈希、Schema/单位字典；SA-01…SA-24 中适用 P0 的条目映射到具体测试；5 条主旅程 E2E；失败时不得写「验证通过」 | `node tools\run-g2.mjs`（计划新建；四件套聚合，失败非零退出） | B14；G0-DEC-16 | L |
| **P0b-06** | **FL-15** README / 模型局限 / 运行与复核说明 | P0b | P0a-08 | 无 MATLAB、无网络、Windows 10/11 + Chrome/Edge 步骤；模型假设与未建模物理；证据包第三方复核命令（哈希→重算→比对）；已知限制与「不等于模型验证」声明；不引用未验证的既有测试结果 | 文档评审 + 逐步骤在干净目录走查记录 | B10；D-01；G0-DEC-08 | M |
| **P0b-07** | **G2-01** 批准范围守卫 + 扩展预览隔离（新增） | P0b | P0a-02 | 场景白名单（SA-24）；白名单外配置 UI 不可达；若存在扩展代码入口默认关闭并标「扩展预览·未评审」；导出/证据包标注 `scope='approved_p0'` 或拒绝；防止 P0 验收被 3 系统/Arena 代码污染 | `node tests\scope-guard.test.js`（计划新建） | B11/B12；G0-DEC-14；SA-24 | S |

> G3 关闭额外要求：P0a 全部 + **P0b-03 的最小证据跳转**（六节点与跳转可演示）须具备；其余 P0b 可留到 G4。

### 2.3 P1 — P0a 关闭 + 用户书面确认后（含新增 G2-02/G2-03）

| ID | 名称 / 工作包 | 优先级 | 依赖 | DoD（可判定） | 验收命令 | 关联 B / 决策 | 规模 |
|---|---|---|---|---|---|---|---|
| **P1-01** | **FL-16** 参数编辑（受限范围） | P1 | P0b-05 | 仅 `0<abs(b)≤20 A`、`t_fault` 为 0.1 s 整数倍；`τ` 变更必须重建 golden；负偏置不开放（若开放须重写因果模板 + 重建 golden）；越界给中文错误且不创建 Run；参数变更生成新 Run 并保留旧 Run | `node tests\param-bounds.test.js`（计划新建）+ 重建 golden 记录 | B15；D-05；G0-DEC-04 | M |
| **P1-02** | **FL-17** HTML 报告与扩展指标 | P1 | P0a-08 | 自包含、转义、所有图表来自 Run；失败态不写成功；报告带三组证据字段与页脚声明；`metrics.json` 增指标按 `DerivedMetric` 定义 | `node tests\report.test.js`（计划新建）+ 注入样例 | B06/B07/B13 | M |
| **P1-03** | **G2-02** 双屏 / 差值视图（新增） | P1 | P0b-04 | 双屏共享时钟；差值仅同单位/同时间基准可开；不可兼容时禁用并说明原因 | E2E 视图断言 | B09；REVIEW_DIFF §7 降级记录 | M |
| **P1-04** | **FL-18** 移动端优化、表格曲线替代 | P1 | P0b-01 | 390 px 断点可用；关键旅程可完成；表格替代完整；不承诺深度无障碍认证 | 移动端 E2E + 截图 | B10 | M |
| **P1-05** | **G2-03** 单文件 `FaultLab.html` 交付能力（新增） | P1 | P0a-08 | `file://` 双击可用；CSS/JS/数据全内联；与 `dist/` 同配置产出同一 Run 数据与 `run_hash`；README 两种打开方式各自步骤 | `python tools\build_singlefile.py`（计划新建）+ `file://` 冒烟 | B10；G0-DEC-03 | M |
| **P1-06** | **FC-001 L0b 扩展预览（条件项）** | P1（末位） | P0a 关闭 + FC 修复清单关闭 + 独立 golden | 进入编码前必须完成：`SOC_true_end=59.4755556%`、`SOC_est_end=59.5866667%`（或明示稳态近似 + 0.01 pp 容差）、补 4 项假设（恒压电堆/阀%→电流线性/电池与变流器限幅/SOC 估计器=EMS 平衡估算）、UI 标「燃料电池 L0 行为演示，不含电化学/效率/健康模型」、与 FL-001 等价的独立 golden；未关闭前**等价冻结**（不得编码）。**层级说明**：G0-DEC-15 将其定为「P1 的 L0b 候选」，任务派发口述的 P2 指实现排期；如需正式降为 P2，走 CHG。 | G2b-lite 评审记录 + oracle exit 0 + golden 复核 | B12；G0-DEC-15 | M |

### 2.4 P2 — G5 后 / 独立 RFC / G2b

| ID | 名称 / 工作包 | 优先级 | 依赖 | DoD（可判定） | 验收命令 | 关联 B / 决策 | 规模 |
|---|---|---|---|---|---|---|---|
| **P2-01** | **FL-19** Python/Simulink/FMU 后端适配评估 | P2 | G5 beta + 独立 RFC | RFC 覆盖许可证/部署/隔离/数据契约适配；不改变 P0 `simulate(config)` 纯函数接口与证据包格式；只做适配层 | RFC 评审记录 | B10/R-10；G0-DEC-02 | L |
| **P2-02** | **FL-20** 盲诊断 / Agent Arena / Benchmark | P2 | G5 beta + 独立评测协议 | 真值隔离按 G0-DEC-11 的 `project('blind')` 语义；评分与排行榜标「合成故障评测游戏，非真实诊断性能」；盲包不得含 `truth/*_true_*/bias`；A 架构下须先评估泄露风险（必要时触发架构 B 重评） | 独立评测协议评审 + 盲包负例 | B08；D-08；G0-DEC-11/15 | XL |
| **P2-03** | **GT-001 恢复（G2b）** | P2 | G2b 物理规格评审通过 | **当前形态 NO-GO、冻结不删除**；G2b 须关闭 `SCOPE_SPLIT_MEMO.md` §3.3 的恢复条件清单（`r_true`/`r_meas` 定义、线性化声明、验收修正、电池/变流器额定、未建模物理清单、UI 标签、独立 golden）；未通过 G2b 不得进入实现 | G2b 评审记录 + 独立 oracle 复核 | B12；G0-DEC-15 | L |
| **P2-04** | **FL-001 `load_step` 重写（若做）** | P2 | G2b | 删除或重写二选一：重写须引入母线储能状态 `E_bus/P_bus`、守恒式改为 `P_gen+P_bat+P_bus=P_load`、重写 PHY 检查与验收、重建 golden；当前文本禁止进入实现 | G2b 评审记录 + oracle | B12；G0-DEC-15 | M |
| **P2-05** | **FC/GT 的 `load_step`/`actuator_fault` 扩展（若做）** | P2 | FC/GT 通过各自 G2b | 每个家族独立规格与 golden；执行器饱和/限幅、电池额定与恢复条件必须声明；UI 标「扩展预览」 | 各系统 G2b 记录 | B12 | M |

### 2.5 任务计数

P0a 8 / P0b 7 / P1 6 / P2 5；规模分布见各任务表（P0a 关闭门禁 = G3，P0b = G4，P1 = P0a 关闭 + 用户确认 + CHG，P2 = G5 后/独立 RFC/G2b）。

## 3. 依赖路径与「G0 关闭后即可开工」的前 3 项

### 3.1 依赖路径（文字图）

```text
[文档基线] P0a-01（MODEL_VALIDATION_SPEC）+ P0a-02（DATA_CONTRACT_SPEC 冻结）
   └→ FL-03 oracle+golden（P0a-03）→ FL-07 ModelEngine（P0a-05）→ FL-04m 五视图 + FL-08 单时钟/事件（P0a-06）
        ├→ FL-06 RunRegistry/run_hash（P0a-04）──┐
        ├→ FL-10 曲线页（P0a-07）────────────────┼→ FL-13 导出/重载（P0a-08）→ G3
        └→ P0b-04 三组对照（并行）───────────────┘
P0b 并行：FL-05/FL-09/FL-11/FL-14/FL-15/G2-01 → G4
P1：FL-16/17、G2-02、FL-18、G2-03、FC-001（条件项）；P2：FL-19/20、GT-001（G2b）、load_step 重写
```

### 3.2 G0 关闭后即可开工的前 3 项（均为文档/oracle 工作，不写产品代码）

| # | 任务 | 为什么排第一 | 产出 | 约束 |
|---|---|---|---|---|
| 1 | **P0a-02** Schema 契约复核并冻结版本号 | 所有后续字段、哈希、导出格式的唯一事实源 | `NEXT/DATA_CONTRACT_SPEC.md` 复核记录 + `schema_version` 冻结 | 只改 `FaultLab-evaluation/NEXT/**` 文档；不改 `src/**`、`docs/**` |
| 2 | **P0a-03** 独立 oracle 复核并生成 `data/golden/fl001_v1.json` | golden 是 engine 与验收的锚点，必须在外置 oracle 出生 | golden JSON + oracle 源码哈希 + 生成命令 | oracle 不 import 产品 engine；trapz 不作 golden |
| 3 | **P0a-05 前置** ModelEngine 准入清单（不编码） | 先冻结「实现必须匹配哪些 golden/容差/事件语义」再允许编码 | engine 准入清单（输入/输出/容差/版本字段/禁止项）+ 与 P0a-01/02 对照签字 | 不写 `src/**`；由 P0a-05 在进入 G3 时才实现 |

> 顺序依据：G0-DEC-06 与 O-06（先修文档契约 → 独立 oracle 重出 golden → 才允许实现契约代码）；V0.2 §3「资源有限时先做 G0 → G2 可验证内核 → G1 关键交互 → G3」。

## 4. 与既有实现的映射（G0-DEC-14 / O-04=A）

> 定性：`docs/CONTRACT.md`、`src/**`、`docs/SCOPE.md`、`artifacts/**` = **并行原型 / 技术债**，不是已批准规格；可作参考，不得反向定义 DECISIONS、SPEC 或本清单。「已实现」= 文件存在 + 自述，不等于经 G0 验证。

### 4.1 可直接复用（重基线后；复用前必须通过对应 P0 验收）

| 资产 | 可复用部分 | 复用条件 | 关联 |
|---|---|---|---|
| `src/core/protocol.js` | `source_kind` 七枚举、`nearestIndex/sampleAt/slice`、格式化工具思路 | 按 `DATA_CONTRACT_SPEC` 重写为契约校验器；601 点硬编码改为按 `duration_s/dt_s` 计算 | B01/B02/B05 |
| `src/ui/chart.js` | Canvas 自绘、阶跃绘制、游标、表格模式能力 | 必须通过「20.0 不跨事件平滑」断言（SA-19） | B01/B13 |
| `src/ui/shell.js` / `store.js` | 静态壳、hash 路由、只读 Run 状态分离思路 | 必须通过 PHY-08（回放不改数据）与跨页状态断言 | B14/D-03 |
| `src/ui/export.js` | 下载/导入入口、CSV 组装思路 | 必须按 EvidenceBundle v1 + 校验和 + 导入流程重写 | B05/B06 |
| `tools/build.py`（单文件构建）/ `tools/qa.mjs`（走查截图） | 内联构建与 headless Chrome 走查手法 | 构建降级为 **P1-05** 能力；测试断言不得沿用旧口径，按新验收矩阵重写 | B10/B14；G0-DEC-03 |
| `FaultLab.html` / `index.html` | 参考 UI 结构 | 冻结为**未评审原型**；P0 验收不以其为准；P1 单文件承诺需重做构建链 | G0-DEC-03/14 |

### 4.2 必须按 `DATA_CONTRACT_SPEC` 重基线（旧实现口径不通过）

| 项 | 旧实现/旧契约口径 | 批准口径 | 依据 |
|---|---|---|---|
| 事件语义 | `pre@19.9 s`（上一样本） | `pre = t_s 20.0 左极限` + `previous_sample@19.9` 独立记录 | B01；G0-DEC-05 |
| SOC 公式 | 契约 §5.1 缺 ×100 | `SOC% = 60 − 100·(1/40)·∫P_bat dt/3600` | B04；G0-DEC-12 |
| 积分口径 | 实现可能用梯形；golden 为解析 | 金标准=解析（`method_id='analytic_flux'`）；trapz 仅敏感性且放宽容差 | B02；G0-DEC-06 |
| 哈希 | `configHash`，无 `run_hash`/规范化 | Canonicalization v1 + `run_hash` + 每文件 SHA-256；`created_at` 不入哈希 | B05；G0-DEC-07 |
| 证据包 | CSV/JSON 导出，无导入契约 | EvidenceBundle v1 + 导入校验/重算/比对 + ≥8 负例 | B06；G0-DEC-10 |
| 指标 | 指标塞在 Run 对象/无 schema | `DerivedMetric` + `metrics.json` 版本 + `value:null` 语义 | B07；G0-DEC-09 |
| 可信度 | 单一 `provenance_tier` | `model_provenance` + `verification` + `integrity` 三组字段分开展示 | B03/B08；G0-DEC-08 |
| 真值暴露 | `blindVisible` 仅实现内字段 | `exposure` 字段 + `project('demo'/'blind')` 纯函数 + 路由守卫 | B08；G0-DEC-11 |
| 因果图 | ⑥ `r_meas` 画成由 ⑤ 发电机补偿导致 | 改为「测量通道误差的功率当量」分支；+4 kW 教学卡 | B13；G0-DEC-13 |
| 对比兼容 | 允许任意 Run 对比 | 白名单仅 `feedback_mode` 差异 | D-04 |

### 4.3 必须按 `MODEL_VALIDATION_SPEC` 重基线（PHY 语义）

| 项 | 旧口径 | 批准口径 | 依据 |
|---|---|---|---|
| PHY-01 | 「物理守恒验证」 | 改名「定义自洽（代数一致性）」，判据 `max abs(r_true) ≤ 1e-12 kW` | B03；G0-DEC-12 |
| PHY-06 | 「能量总和匹配」当验证 | 改为「对闭式金标准的比对」：`E ±1e-6 kWh`、`SOC ±1e-5 pp` | B03/B02 |
| ODE/残差 | 无 | 数值实现时补 ODE 残差检查；定义恒等不得作为唯一门禁 | B03 |
| 措辞 | 允许「验证通过/实际电池功率/解释异常来源」 | 按 G0-DEC-13 替换表；报告/UI 只允许「内部一致性检查通过」 | B13；D-01/G0-DEC-08 |

### 4.4 冻结、不追认（不得作为验收依据或对外事实）

| 声明 | 位置 | 处置 | 依据 |
|---|---|---|---|
| 3 系统 + 3 故障族 + Arena 属 V0.1 P0 | `docs/CONTRACT.md` §1 | 冻结为「未评审扩展」，移入 P1/P2；见 P0b-07 与 SCOPE 拆分备忘录 | B11；G0-DEC-14 |
| `FL-001 load_step` 文本 | `CONTRACT.md` §5.1 扩展 | 删除或重写；当前文本禁止进入实现 | B12；G0-DEC-15 |
| FC-001 SOC 末值 59.47222/59.58333 与未声明假设 | `CONTRACT.md` §5.2 | 冻结；修复清单关闭前不实现 | B12；G0-DEC-15 |
| GT-001 物理与验收值 | `CONTRACT.md` §5.3 | **当前形态 NO-GO**；冻结、推迟不删除；须 G2b | B12；G0-DEC-15 |
| `docs/SCOPE.md`「P0 全部实现 ✅」与 README 的测试 PASS 数/截图声明 | `SCOPE.md` §1/§4、`README.md` §7 | 均降级为「原型完成度自评/未经验证的自述」；不得对外引用；只有纳入 P0b-05 四件套并复跑后才可作证据 | B11/B14；G0-DEC-14 |
| `docs/AGENT_PROTOCOL.md` / Arena 页面作 P0 依据 | `docs/AGENT_PROTOCOL.md`、`src/agents/**` | Arena=P2 扩展预览；非真实诊断性能 | B08；G0-DEC-15 |

## 5. 变更控制与进入条件

### 5.1 变更控制（G0-DEC-17）

| 变更类型 | 流程 | 影响 |
|---|---|---|
| 任务措辞/拆分/DoD 调整 | 本文件 + `CHG-YYYYMMDD-NN` 记录 | 不重开 G0 |
| 数值参数/事件编码/积分口径/Canonicalization/golden 变更 | CHG + 重建 golden + 升 `method_version`/`bundle_schema_version` | P0 验收基线变化；历史证据包标「不可比」 |
| 范围翻转（O-02/O-03 类）或新增 P0 资产 | **重开 G0**；不补丁式修改本清单 | 工期/风险需重估（G0-DEC-01 后悔成本） |
| 层级调整（如 FC-001 由 P1→P2） | CHG + Lead/用户确认 | 任务表同步；不改变 DECISIONS 分类时需注明 |

### 5.2 P1 / P2 进入条件

| 目标层级 | 进入条件（全部满足） |
|---|---|
| P1 | ① P0a 关闭（§6 完成定义达成，四件套证据在档）；② P0b 四件套 + README 完成（G4）；③ 用户书面确认范围仍只 FL-001 或明确批准 P1 项；④ 涉及数值的 P1 项先重出 golden；⑤ CHG 记录 |
| P2（FL-19/FL-20） | ① G5 beta 后；② 独立 RFC（FL-19）或独立评测协议（FL-20）；③ 不改变 P0 数据契约接口；④ Arena 先过真值隔离评估（G0-DEC-11） |
| P2（FC-001 实现） | FC-001 修复清单关闭 + 独立 golden + G2b-lite 评审；未满足前冻结（P1-06 条件项） |
| P2（GT-001） | G2b 物理规格评审通过（条件清单见 `SCOPE_SPLIT_MEMO.md` §3.3）；未通过前禁止实现；**不删除** |

### 5.3 冻结项（任何改动须走 §5.1）

P0 数值参数（G0-DEC-04）· 事件 pre/post 编码（G0-DEC-05）· 积分/容差/舍入（G0-DEC-06）· Canonicalization v1 / run_hash（G0-DEC-07）· EvidenceBundle v1（G0-DEC-10）· DerivedMetric schema（G0-DEC-09）· 三组 Run 的 run_id 与 golden（G0-DEC-16）。

## 6. P0a 完成定义（G3 DoD）

### 6.1 定义

**在无 MATLAB、无网络的环境中，按 README 步骤以 `dist/` 静态目录（`python -m http.server`）在 Windows 10/11 + Chrome/Edge 最近两个大版本打开，走通 FL-001 主旅程：首页 → 系统 → 20.0 s 事件 → 曲线（真/测/派生）→ 因果 → 对比 → 导出；并导出可被第三方离线复核的证据包（重算 metrics/checks 与 `run_hash` 一致），且 P0a-01…P0a-08 全部 DoD 达成。**

主旅程验收点：
1. 五视图 hash 深链可达；跨页游标/选中/Run 不丢失；
2. 20.0 s 事件 pre/post 在曲线与事件卡上均可见，阶跃不平滑；
3. 三组 Run 的指标卡与 §1.2 golden 在容差内；
4. 证据包导出后，第三方按包内说明重算并通过 `run_hash` 校验；
5. 全程控制台无错误、无网络请求、无外部字体/库依赖。

### 6.2 G2 验收四件套（缺一不关闭，G0-DEC-16）

| # | 证据 | 判定 | 对应任务 |
|---|---|---|---|
| ① | 数值脚本 | `python FaultLab-evaluation\tools\verify_fl001.py` exit 0；`python tools\verify_golden.py` exit 0 | P0a-03 / P0a-05 |
| ② | 浏览器 E2E（PHY-08） | 播放/切页/游标不改变 Run 数据与哈希 | P0a-06；P0b-05 |
| ③ | RunRegistry / 规范哈希（PHY-09） | 配置变更生成新 Run；旧 Run 不可变 | P0a-04；P0b-05 |
| ④ | Schema / 单位字典（PHY-10） | 量纲注册表、601 点、时间单调、事件引用、有限值 | P0a-02；P0b-05 |

### 6.3 「完成」的边界（不得跨越）

- P0a 完成 = **内部一致性与可复核性通过**，**不是**模型验证、不是实测校准、不是硬件验证（`model_provenance='analytical_demo'`、`model_validation='not_performed'`、`hardware_verification='not_performed'`，G0-DEC-08）。
- UI/报告/导出页脚禁止「物理守恒验证通过 / 模型验证通过 / 实测」；只允许「内部一致性检查通过」。
- 若 §6.1/§6.2 任一不满足，G3 不关闭；不得以「UI 看起来对」或既有实现自述替代证据。
- 若发现 V0.2 §12 退出条件中的任一情形（无法说清真值/测量/推断来源、独立 golden 不能复核、只有 UI 动画、需依赖商业工具/私有资产、需 LLM 文本解释才能成立），**停止推进并回到 G2**。

## 7. 附：本文件与 DECISIONS 的偏差记录

| 项 | 说明 |
|---|---|
| 与 DECISIONS 的实质性偏差 | **无**。P0 切片、P0a/P0b 划分、数值 golden、四件套、GT NO-GO、FC 修复前置、load_step 删除/重写均照 DECISIONS 执行。 |
| 未决事项 | `DECISIONS.md` 已同步 `STATUS: APPROVED`（20:43）并登记 `CHG-20261027-02`；`DECISIONS/SPEC_v0.2_APPROVED.md` 为冻结索引目标（DECISIONS §6 标记已创建，本文件核对时目录内尚未见，待 Lead 确认）；`docs/*` 与根 `README.md` 已由 Lead 按 DECISIONS §6 对齐（20:39–20:41），其验收以 P0a-01/02 规格复核为准；本文件待 Lead 审阅签收。 |
| 与任务派发口述的差异 | FC-001 层级：DECISIONS G0-DEC-15 定为「P1 的 L0b 候选」，本文件据此列为 P1 条件项（P1-06、末位、修复未关闭前冻结）；口述的「P2」按实现排期理解。如需正式改为 P2，按 G0-DEC-17 记 CHG 即可，不影响其余任务。 |
