# DECISIONS — FaultLab V0.2 G0 决策登记（Lead 建议稿，待决策者批准）

> **状态**：`DRAFT-AWAITING-RATIFICATION`。本文件是 G0 的**决策建议稿**，不是已生效规格。
> **生效条件**：用户在 §5 的 O-01…O-06 上确认（或改写）后，本文件转为 `APPROVED`；届时才允许冻结 `SPEC_v0.2_APPROVED.md` 并向实现 Agent 下发建仓/编码任务（V0.2 §15.2）。
> **决策者**：用户（产品与范围最终裁定者）。**记录者**：Team Lead（`lead`）。**证据来源**：`REVIEWS/CODEX_REVIEW.md`、`REVIEWS/CLAUDE_REVIEW.md`、`REVIEWS/NUMERIC_ORACLE.md`、`REVIEWS/REVIEW_DIFF.md`（问题编号 B01–B15 均指后者 §6）。
> **生成时间**：2026-10-27T19:34+08:00（Asia/Shanghai）。
> **效力声明**：本文件覆盖对象仅限于 V0.1/V0.2 文档与评审结论；**不追认**工作区并行实现（`docs/CONTRACT.md`、`src/**`、`docs/SCOPE.md`）为已批准规格。理由见 G0-DEC-14 与 REVIEW_DIFF §1.2/§7。

---

## 0. 使用规则

1. 每条决策包含四要素：**决定 / 理由 / 替代选项 / 后悔成本与撤回条件**（V0.2 §15.2 要求）。
2. 决策分为两级：
   - **D-01…D-08**：V0.2 §0.2 原有的 8 个产品问题，本次给出终裁建议；
   - **G0-DEC-01…17**：本次评审新增/细化的工程决策（数据契约、验收、范围、治理）。
3. 任何与 V0.1 原文冲突的决策，均以本文件为准（V0.2 §15.2：冻结批准版后覆盖上游）。
4. **不得**在未批准前把本文件当作编码依据；批准后，代码与文档不得反向定义本文件。

---

## 1. 决策总览

| ID | 决策摘要 | 关联阻断 | 建议状态 |
|---|---|---|---|
| D-01 | L0 教学演示（保留 L1 标准接口），不宣称工程验证 | B03 | 同意 |
| D-02 | 首版纯浏览器本地运行 + 外置独立数值预言机 | B05/B08 | 同意 |
| D-03 | 五逻辑页面 + 主工作台；hash 路由；单一时钟 | B09 | 同意 |
| D-04 | 「仅监测」提升为 P0（三组 Run 之一） | B09 | 同意（覆盖 V0.1 §12 P1） |
| D-05 | P0 固定 `+10 A / 20.0 s`；P1 开放受限修改 | B15 | 同意（P1 范围需修正） |
| D-06 | 因果解释不接 LLM，规则 + 证据 | B13 | 同意 |
| D-07 | 可信度分层表达，且由元数据字段生成 | B08 | 同意（需补字段） |
| D-08 | 无云端/账户/排行榜；分享仅导出文件 | B08 | 同意 |
| G0-DEC-01 | 最小 P0 = FL-001 垂直切片；P0a/P0b 切割 | B09 | 建议批准 |
| G0-DEC-02 | 架构 A 主选、B 后备；oracle 外置 | B05 | 建议批准 |
| G0-DEC-03 | 交付形态：P0 静态目录（http）/ P1 单文件（file://） | B10 | 建议批准 |
| G0-DEC-04 | 数值参数约束：P0 冻结；P1 限幅/网格对齐 | B15 | 建议批准 |
| G0-DEC-05 | 事件 pre/post 编码冻结 | B01 | 建议批准 |
| G0-DEC-06 | 积分规则/容差/舍入冻结 | B02 | 建议批准 |
| G0-DEC-07 | Canonicalization v1 + run_hash + 文件校验和 | B05 | 建议批准 |
| G0-DEC-08 | 证据三级字段化（model/verification/integrity） | B03/B08 | 建议批准 |
| G0-DEC-09 | DerivedMetric 对象与 metrics schema | B07 | 建议批准 |
| G0-DEC-10 | EvidenceBundle v1 与导入契约 | B06 | 建议批准 |
| G0-DEC-11 | 真值暴露分级 + demo/blind 投影函数 | B08 | 建议批准 |
| G0-DEC-12 | PHY 语义整改 + SOC 公式修订 | B03/B04 | 建议批准 |
| G0-DEC-13 | 因果/措辞护栏（采纳 W-01…W-12） | B13 | 建议批准 |
| G0-DEC-14 | 范围覆盖与既有契约降级（含并行编码治理） | B11/C-07 | 建议批准 |
| G0-DEC-15 | 扩展模型处置：GT NO-GO；FC 修复；load_step 删除/重写 | B12 | 建议批准 |
| G0-DEC-16 | G2 验收四件套与 golden 结构 | B14 | 建议批准 |
| G0-DEC-17 | 决策变更流程与冻结快照 | 治理 | 建议批准 |

---

## 2. D-01…D-08 终裁建议

> 两份独立评审对 8 项均为"同意"，差异仅在附加条件；下表为合并后的终裁建议（条件不可省）。

| ID | 问题 | 终裁 | 附加条件（合并自两份评审） |
|---|---|---|---|
| **D-01** | 教学演示 vs 工程验证工具 | **同意：L0 教学演示**，保留 L1 标准接口 | ①`ModelManifest.claims` 写死"L0 解析/行为级演示"；②全链路禁止"验证/实测/工业真实"措辞；③"consistency_check / model_validation / hardware_verification"三者分开（见 D-07/G0-DEC-08） |
| **D-02** | 纯浏览器 vs 前后端 | **同意：纯浏览器本地运行** | ①必须同时存在**外置独立数值预言机**（Python/Node，不 import 产品 engine）；②`project()` 真值投影进 P0 契约（即使 Arena 缓做）；③若未来盲诊断升 P0，自动触发架构 B 重评 |
| **D-03** | 五页面 vs 一屏到底 | **同意：主工作台 + 4 个可访问视图（五逻辑页面）** | ①用 **hash 路由**实现深链（证据跳转/刷新保持）；②单一时钟与跨页状态（游标/选中/Run）必须有 E2E 断言；③不引入完整路由框架 |
| **D-04** | 「仅监测」是否首发 | **同意：提升为 P0** | ①三组 Run 都是固定配置、独立 `run_id`；②`compare` 兼容规则必须允许"仅 feedback_mode 不同"（白名单）；③UI 标"同一故障的两种控制配置对照" |
| **D-05** | 偏置参数是否开放 | **同意 P0 固定 `+10 A / 20.0 s`**；P1 开放受限修改 | P1 范围修正为 `0<|b|≤20 A`（`b>25 A` 会出现反向电流/充电，`b=30 A` 已在契约越界）、`t_fault` 必须为 0.1 s 整数倍；负偏置若开放须重写因果模板并重建 golden（B15） |
| **D-06** | 因果解释是否接 LLM | **同意：不接入** | ①规则模板版本化（`causal_rule_version`）；②每条解释绑定 `rule_id + evidence(run_id+signal+time_window)`；③页头常驻"已知故障传播解释，非诊断算法" |
| **D-07** | 可信度如何表达 | **同意分层表达，但必须字段化** | `RunManifest` 拆为 `model_provenance=analytical_demo` + `verification{consistency_checks, model_validation:'not_performed', hardware_verification:'not_performed'}` + `integrity{run_hash, checks}`；UI 三处分开展示，禁止合并成单一"可信度"徽章 |
| **D-08** | 云端/账户/排行榜 | **同意：V0.1 不做** | 无遥测/登录/云；分享只导出文件；未来 Arena 的本地排行榜必须标"扩展预览·合成场景·非真实诊断性能" |

---

## 3. G0-DEC 详细记录

> 格式：**决定 → 理由 → 替代选项 → 后悔成本与撤回条件**。关联阻断编号见 `REVIEW_DIFF.md` §6。

### G0-DEC-01 最小 P0 = FL-001 垂直切片；P0a/P0b 切割
- **决定**：V0.1 P0 定义为一条垂直切片：**`1 系统（FL-001） × 3 固定 Run（基准 / 闭环故障 / 仅监测故障） × 5 逻辑视图 × 单一时钟 × 事件 pre/post × 因果证据跳转 × 对比兼容检查 × 导出/重载证据包 × 数值 golden 校验`**。任务拆为两组：
  - **P0a（G3 必需，≤8 项）**：模型说明、Schema v0.1、golden + 独立 oracle、RunRegistry、ModelEngine、单时钟/事件、曲线页、导出/重载；加五视图最小只读骨架。
  - **P0b（G4 质量，可与 P0a 并行）**：设计系统/键盘焦点/表格模式、拓扑检查器、因果证据、三组对照、测试矩阵子集、README。
  - **P1**：参数编辑、HTML 报告、双屏/差值、移动端专项；**P2**：其它系统/故障、FMU/Python 后端、Arena、Benchmark。
- **理由**：两份评审一致指出"16 项全 P0"使 G0/G3 无法验收；垂直切片能在最小范围证明"展示→解释→对照→导出"闭环。
- **替代**：保持 16 项全 P0（不可验收）；或只做"曲线+导出"（丢失因果价值，产品定位不成立）。
- **后悔成本/撤回**：若用户坚持交付 3 系统（O-02），则 P0a 需扩为 3×3 Run，工作量约 ×2.5，且 B12 的全部物理缺陷必须先修——此时应重开 G0 重评，而不是在本决策上打补丁。

### G0-DEC-02 架构 A 主选、B 后备；oracle 外置
- **决定**：V0.1 采用 **A 纯浏览器**；独立数值预言机以**外置脚本**存在（不进前端构建、不与 engine 共享公式常量）；B（Python API+Web）为后备。
  - 触发 B 重评的条件（任一）：盲诊断/Arena 升 P0；需接真实求解器/FMU；需可信审计/服务端签名/多人共享。
  - oracle 落点：`tools/oracle/`（Python stdlib）+ `data/golden/`（由 oracle 生成，engine 只读比对）+ `scripts/verify_golden` 一键比对。
- **理由**：方案规模小、无 MATLAB、静态部署门槛最低；A 架构下所有代码与真值在客户端，`truthSealed` 不是安全边界，因此 L1 盲测能力必须外置/后置。
- **替代**：B 直接用（运维成本与 L0 演示不匹配）；C 纯 Python UI（交互上限不足）。
- **后悔成本/撤回**：若未来 12 个月内确定做 Arena/真实设备，A 的客户端契约会成为迁移债；缓解=现在就把 `project('blind')` 与 `EvidenceBundle` 做成与 UI 解耦的纯函数。

### G0-DEC-03 交付形态：P0 静态目录 / P1 单文件
- **决定**：
  - **P0 交付物** = `dist/` 静态目录，通过任意静态服务器打开（含 `python -m http.server`）；README 给 Windows 步骤；支持矩阵 = Windows 10/11 + Chrome/Edge 最近两个大版本。
  - **P1 交付物** = `FaultLab.html` 单文件，`file://` 双击可用（CSS/JS/数据全内联；若走经典脚本路线可天然满足）。
  - §4.1 的"无外部依赖"改写为：**运行期**零网络、零后端、确定性；**开发期**允许受控依赖（Node LTS/npm 或零依赖 Python 脚本），以 O-03 的选择为准。
- **理由**：E-08/I-02 指出的"一键打开 vs 构建步骤"矛盾必须在 G0 定死，否则 G3 返工。
- **替代**：只承诺静态托管（失去"双击离线"卖点）；只承诺单文件（限制工程化与测试）。
- **后悔成本/撤回**：若选单文件为主交付，则图表/资源必须全部内联，构建脚本与测试链要围绕它设计；撤回=重写构建与部分测试，约 1 个迭代。

### G0-DEC-04 数值参数约束
- **决定**：P0 冻结 `duration_s=60, sample_dt_s=0.1, fault_time_s=20.0, bias_A=+10, Vdc=400, Iref=25, tau=1.5, Pload=30, Ebat=40, SOC0=60`；P1 开放修改时：`0<|b|≤20 A`、`t_fault` 为 0.1 s 整数倍、τ 变更必须重建 golden；`b>25 A` 禁止（否则 `I_true<0` 反向充电，模型无对应保护）。
- **理由**：Oracle 探针 N-10/N-11 证明越界/非网格会破坏金标准与因果叙事；Claude 反例 C-1/C-2 给出物理越界点。
- **替代**：完全开放参数（需新增反向功率/限幅/饱和物理与文案，超出 L0 范围）。
- **后悔成本/撤回**：若 P1 发现用户强烈需要扫参教学，放开范围需同步改 golden + 因果模板 + UI 校验，约 2–3 个任务点；可撤回（保持 P0 不变）。

### G0-DEC-05 事件 pre/post 编码冻结
- **决定**：
  - `EventSnapshot { schema_version, event_id, phase:'pre'|'post', t_s:20.0, derivation:'left_limit'|'post_sample', variables:{signal_id:value}, units:{signal_id:unit} }`，主键 `(event_id, phase)`。
  - `pre` 恒为 `t_s=20.0` 的**左极限**（`b=0`，`I_meas=25 A`）；`post` 为右极限/采样行（`b=10`，`I_meas=35 A`）。**19.9 s 只是上一常规采样点，不是 pre**。
  - `timeseries.csv` 的 20.0 s 行 = post；`events.json` 必须同时含 pre/post；两处冲突时以 events 的 phase 为准，`manifest.json` 记 `event_encoding_version`。
  - 图表：测量序列在 x=20.0 处必须呈现两个不同 y 点的阶跃；禁止跨事件样条/平滑插值。
- **理由**：B01 是两份评审 + oracle 三方一致的最强共识；契约"pre@19.9"与 V0.2 §5.4 直接冲突，且 oracle 探针显示按 19.9 当 pre 会改变 20.0 行数值。
- **替代**：用 19.9/20.0 两采样行代替相位（会丢失"同一物理时刻"语义，且与 V0.1 §5.2/UX-02 冲突）。
- **后悔成本/撤回**：若后续引入事件定位/子步求解，`derivation` 字段可扩展（前向兼容）；编码一旦被导出格式固化为 v1，撤回需升 `bundle_schema_version`。

### G0-DEC-06 积分规则/容差/舍入冻结
- **决定**：
  - **金标准能量/SOC = 解析（闭式、事件感知）积分**：`E_bat,cl=446/3600 kWh`、`E_gen,cl=1354/3600`、`SOC_true(60)=59.6902777778%`、`SOC_est,cl=59.5791666667%`、`monitor SOC_est=59.4722222222%`、`SOC_err=-0.1111111111 pp`。
  - 若实现为数值积分：必须声明 `method_id`（如 `trapz_dt0.01`），trapz 结果**不得**作为 golden；容差按规则放宽容差（建议：解析 golden 对比 `E ±1e-6 kWh`、`SOC ±1e-5 pp`；601 点 trapz 仅作敏感性，容差 ≥1e-5 kWh / 5e-4 pp）。
  - 显示：存储全精度；显示按字段 `precision`；`round-half-up`；电流/功率 4 dp，能量 6 dp，SOC/误差 5–6 dp 由 `SignalCatalog` 统一定义。
  - 补齐 §5.3 缺失绝对值（`SOC_est`、`E_bat,meas` 三组运行）与每行 `run_id`。
- **理由**：B02；Codex 发现 0.1 s 梯形与解析差 6.17e-7 kWh；Claude 发现左矩形差 5.6e-5；Oracle 给出四种求积与探针数据。
- **替代**：统一 0.01 s 梯形（可满足 1e-6，但引入求解器规则与性能成本，且 L0 本可解析）。
- **后悔成本/撤回**：若未来升级 L1 数值仿真，`method_id` 机制可平滑扩展；撤回=重建 golden 并升 `method_version`，历史证据包需标注不可比。

### G0-DEC-07 Canonicalization v1 + run_hash + 文件校验和
- **决定**：
  - 定义 `Canonicalization v1`：对象键按 Unicode 码点升序；数字用 ECMAScript `Number::toString` 最短往返；禁止 NaN/±Infinity；`-0`→`0`；字符串不做 NFC；时间统一十进制秒（≤3 位小数）；数组保序。
  - `run_hash = SHA256(canonical_json({bundle_schema_version, config_hash, model_hash, engine_version, t, signals, events, metrics, checks}))`；`created_at` **不**入哈希。
  - `model_hash` 对象 = `ModelManifest` 规范 JSON + `equation_id` 列表 + `engine_version`。
  - `manifest.json` 记录 `run_hash` 与每文件 SHA-256；UI 统一文案"内容校验和，不代表签名/来源/第三方认证"（替代表述见 G0-DEC-13）。
- **理由**：B05；V0.1 UX-10 的"哈希可核验来源"语义过度；§9.3 的"篡改一行应失败"依赖内容哈希。
- **替代**：只保留 config_hash（无法证明"导出的数字就是当时算出的数字"）。
- **后悔成本/撤回**：规范化规则一旦被公开证据包采用即成为兼容义务；撤回需 bundle v2 + 迁移说明。

### G0-DEC-08 证据三级字段化
- **决定**：`RunManifest.model_provenance ∈ {analytical_demo, numerical_simulation, hardware_experiment}`；`RunManifest.verification = { consistency_checks:'pass'|'fail'|'skipped', model_validation:'not_performed'|..., hardware_verification:'not_performed'|... }`；`RunManifest.integrity = { run_hash, checks_status }`。UI 分三处展示，导出页脚固定输出这三组值。
- **理由**：D-07 / B03 / B08；单一 `provenance_tier` 无法承载"检查通过 ≠ 模型验证 ≠ 硬件验证"。
- **替代**：只用文案（不可机检、不可审计）。
- **后悔成本/撤回**：字段只增不改，前向兼容；无实质后悔成本。

### G0-DEC-09 DerivedMetric 对象与 metrics schema
- **决定**：新增 `DerivedMetric { metric_id, label, value|null, unit, precision, time_window_s:[0,60], method:'analytic_flux'|'trapezoid'|'substep', method_version, source_signal_ids, source_run_ids, unavailable_reason }`；`metrics.json` 带 `metric_schema_version`；缺失数据用 `value:null + unavailable_reason`，UI 显示"不可用"不填 0；`SOC_err_pp` 字段名与单位必须带 `pp`。
- **理由**：B07；对比页六类指标与"可复查积分"承诺的核心载体。
- **替代**：把指标塞进 RunManifest（不可版本化、不可单测）。
- **后悔成本/撤回**：无；若指标口径变化升 `method_version` 并重建 golden。

### G0-DEC-10 EvidenceBundle v1 与导入契约
- **决定**：
  - `EvidenceBundle v1 = { manifest.json(bundle_schema_version, run_hash, supported_versions, files:[{path,sha256,bytes}]), config.json, model_manifest.json, timeseries.csv, events.json, metrics.json, checks.json }`。
  - 导入流程：schema 校验 → 文件哈希 → 反序列化 → **重算 metrics/checks** → 与 `run_hash` 比对 → 标注 `role:'imported'`、不覆盖现有 Run；版本不支持给中文可读错误。
  - 输入防护：字段长度/行数/点数/JSON 深度上限；渲染统一 `textContent`；HTML 报告统一转义。
  - 负例 ≥8：缺文件、坏哈希、旧/新 schema、未知字段、超大文件、注入字符串、NaN、时间非单调。
- **理由**：B06；"可离线复核"是产品承诺，没有导入契约则第三方只能"看"不能"核"。
- **替代**：只导出不导入（弱化为"证据快照"，与 G4 验收冲突）。
- **后悔成本/撤回**：导入格式兼容成本随版本增长；缓解=只保证 `n-1→n` 自动迁移，更老版本给可读错误。

### G0-DEC-11 真值暴露分级 + demo/blind 投影
- **决定**：`SignalCatalog` 增 `exposure:'public_demo'|'blind_observable'|'truth_only'`；`source_kind=MODEL_STATE|FAULT_EVENT` 默认 `truth_only`；定义 `run.project('demo')` 与 `run.project('blind')` 纯函数；blind 投影只含 `blind_observable`，禁止 `config.fault/bias_A/*_true_*/*_cap*`；页面不得直接遍历 `run.truth`；盲测路由守卫（深链拦截）进契约。
- **理由**：B08；A 架构下 `truthSealed` 不是安全边界，但契约必须为未来 L1/Arena 预留可执行的隔离语义；成本很低。
- **替代**：等到实现 Arena 再补（会触发 Run/信号契约破坏性迁移）。
- **后悔成本/撤回**：无实质成本；若最终不做 Arena，该字段可作为"演示/技术演示"分层的冗余。

### G0-DEC-12 PHY 语义整改 + SOC 公式修订
- **决定**：
  - **V0.1 §1 与 CONTRACT §5.1 的 SOC 公式统一为**：`SOC% = 60 − 100·(1/40)·∫ P_bat dt / 3600`（`∫P dt` 单位 kW·s）；V0.1 §1 原文缺 ×100 必须修订。
  - **PHY-01 改名"定义自洽（代数一致性）"**，判据 `max|r_true| ≤ 1e-12 kW`（double 全链路；保留 1e-9 也可，但需注明 float32/低精度导出风险）；
  - **PHY-06 改为"对闭式金标准的比对"**：`|E_bat − 446/3600| ≤ 1e-6 kWh`（解析口径）、`E_load` 由配置独立算；`E_gen+E_bat=0.5` 仅保留"定义恒等"演示，不得作为唯一门禁；
  - 新增 **ODE 残差检查**（数值实现时）与"golden 比对"作为物理级门禁；
  - 报告/UI 禁止"物理守恒验证通过 / 模型验证通过"；允许"内部一致性检查通过"。
- **理由**：B03/B04；两处都是"用恒等式/公式缺陷冒充验证"的诚信问题，直接关系 D-07。
- **替代**：保留原措辞+加脚注（审计时仍会被读成验证通过，不可接受）。
- **后悔成本/撤回**：无；措辞整改成本极低。

### G0-DEC-13 因果/措辞护栏（采纳 W-01…W-12 与 U-01…U-12 的 P0 子集）
- **决定**：
  - 因果图：**⑥ `r_meas` 不再画成由 ⑤发电机补偿导致**；改为"测量通道误差的功率当量"分支（`r_meas=(P_gen+P_bat,true−P_load)+(P_bat,meas−P_bat,true)=0+0.4b`）。
  - 文案：`+4 kW` 必须并排说明"不是能量损失；故障期 40 s 的 +4 kW×40 s=0.04444 kWh ≠ 实际少放电 0.04278 kWh；测量口径电池电能甚至比基准多 +0.00167 kWh"。
  - 采纳替换文案：V0.1 §1"关键数据校准"→"解析金标准数值（未与实测校准）"；§0"实际电池功率"→"模型计算的真实电池功率（MODEL_STATE）"；因果页/按钮"解释异常来源"→"解释已知故障的传播路径"；§7.3 能量"总和匹配"→"定义自洽（非外部验证）"。
  - P0 采纳 UX 改进：U-01 预测题、U-02 三线图例卡、U-03 边 source_kind、U-04 传感器三数并列、U-05 唯一变量清单、U-07 pre/post 事件卡、U-08 残差小图、U-09 SOC 放大徽标、U-10 三层标签、U-12 三运行矩阵；U-06/U-11 为 P1。
- **理由**：B13 + RISK-07；初学者最容易把 +4 kW 当能量损失、把机理图当诊断算法。
- **替代**：只加免责声明（不能阻止误读，且与"教学价值"定位冲突）。
- **后悔成本/撤回**：若后续做教学实验证明某条改进无效，可单独撤回该条（逐条可追踪）。

### G0-DEC-14 范围覆盖与既有契约降级（含并行编码治理）
- **决定**：
  1. **范围**：V0.2 的 FL-001 P0 范围**覆盖** `docs/CONTRACT.md` §1 的扩展（3 系统 + 3 故障族 + Arena + 6 页）；扩展移入 P1/P2 并登记为"未评审扩展"。
  2. **既有实现定性**：`docs/CONTRACT.md`、`src/**`、`docs/SCOPE.md`、`artifacts/**` 定性为**并行原型/技术债**，不是已批准规格；`SCOPE.md` 的"全部实现 ✅"声明未经 G0 验证，不得对外引用。
  3. **治理**：立即冻结一份只读快照（文件名+字节+SHA-256 清单）作为评审/回归基准；并行编码可继续，但**不得反向定义**本 DECISIONS 与批准版 SPEC；G0 批准后按 SPEC 重基线。
  4. **记录**：将"评审期间继续编码"的风险与承担人写入 `DECISIONS.md` 变更记录（本会话已观察到 `CONTRACT.md` 53950→54666 字节、workspace 43→58 文件的变化）。
- **理由**：B11 / C-07；两份评审一致认为"实现先于评审"是最大治理风险。
- **替代**：强制暂停并行编码（会与用户工作方式冲突）；或追认既有契约为规格（会跳过 G0，直接继承其物理缺陷）。
- **后悔成本/撤回**：若用户选择"追认既有实现"，则 B12 的 GT/FC/load_step 缺陷必须先修，且 V0.2 的 P0/P1/P2 表需重写——这是本决策的撤回路径，代价是一次重评。

### G0-DEC-15 扩展模型处置
- **决定**：
  - **GT-001：当前形态 NO-GO**，不得进入实现。若未来恢复，须独立 **G2b 物理规格评审**并补齐：`r_true := P_gen+P_bat−P_load−P_rotor`；`r_meas` 改定义为明确通道差（如 `f_gov−f_meas`）；惯量模型声明为 f≈f₀ 线性化并给能量公式；验收改为 `nadir −0.41 Hz@21.1 s；|Δf|≤0.2 Hz@30.1 s；≤0.1 Hz@36.6 s；60 s≈49.99 Hz`（或延至 100 s 给稳态容差）；电池/变流器额定与限幅；GT 专属未建模物理清单；UI 标"单机等效频率响应示意（L0b），非机组/电网动态验证"。
  - **FC-001：可作为 P1 的 L0b 候选**，但进入实现前必须：修正 `SOC_true_end=59.4755556%`、`SOC_est_end=59.5866667%`（含 τ_fc 过渡尾项）或明示"稳态近似 + 0.01 pp 容差"；补假设清单（恒压电堆、阀%→电流线性映射、电池/变流器限幅、SOC 估计器=EMS 平衡估算）；UI 标"燃料电池 L0 行为演示，不含电化学/效率/健康模型"；提供独立 golden。
  - **FL-001 `load_step`：删除或重写**。当前文本"电池电流保持 I_ref"与"升到 50 A"自相矛盾（按文字起始失衡 10 kW，与"守恒 ≤1e-6"差 7 个数量级），且"发电机一阶惯性源"违反 V0.2 R-02；若保留，必须引入母线储能状态 `E_bus/P_bus`、守恒式改为 `P_gen+P_bat+P_bus=P_load`，并走 G2b。
  - **Agent Arena：P2**；若实现，评分/排行榜标"合成故障评测游戏，非真实诊断性能"；盲测导出严禁 `truth/*_true_*/bias`。
- **理由**：B12；Claude 给出逐项复算，Lead 独立复核关键三项一致。
- **替代**：只修数值不修语义（GT 的 `r_meas`/线性化仍是硬伤）；或整体放弃扩展（损失用户明确要求的功能）。
- **后悔成本/撤回**：GT 若日后被证明是用户核心诉求，需追加 G2b 与相应工期；撤回本决策=重开范围评审。

### G0-DEC-16 G2 验收四件套与 golden 结构
- **决定**：G2 证据包必须同时包含：
  1. **数值脚本**（`tools/verify_fl001.py` 可重放，exit 0）；
  2. **浏览器 E2E**（PHY-08：播放/页面/游标不改变 Run 数据与哈希）；
  3. **RunRegistry/规范哈希测试**（PHY-09：配置变更生成新 Run、旧 Run 不可变）；
  4. **Schema/单位字典校验**（PHY-10：量纲注册表、601 点、时间单调、事件引用、有限值）。
  另：`data/golden/fl001_v1.json` 必须由 oracle 生成/批准，含全精度值、`method_id`、容差、生成命令、oracle 源码哈希；engine 只读比对；`created_at` 不入哈希。采纳 Claude SA-01…SA-24 为 G2 验收矩阵基线。
- **理由**：B14；Oracle N-12 明确指出 PHY-08/09 不能由数值脚本判定，四件套缺一不可关闭 G2。
- **替代**：只跑数值脚本（会漏掉"回放改数据""配置污染历史"这类最致命缺陷）。
- **后悔成本/撤回**：E2E 维护成本；若 Playwright 安装受阻，可降级为既有 Chrome headless 脚本 + 手测清单（需在 G4 前恢复）。

### G0-DEC-17 决策变更流程与冻结快照
- **决定**：本文件一经批准即进入变更管理：任何修改新增 `CHG-YYYYMMDD-NN` 记录（原决策/新决定/理由/影响文件/关联问题 ID）；重大范围变更（O-02/O-03 翻转）必须重开 G0；冻结快照与 `REVIEWS/*` 一并纳入证据包。
- **理由**：V0.2 §15.2"不要以模型声量裁定真伪"；并行会话已证明文档会漂移。
- **替代**：无（治理最低要求）。
- **后悔成本/撤回**：流程成本小；撤回将导致决策不可追溯。

---

## 4. 评分合并与 G0 结论

**合并加权总分：3.4 / 5**（详见 `REVIEW_DIFF.md` §3；Codex 3.5、Claude 3.4，逐维取严合并）。

**G0 门禁结论**：
- **评审侧：CONDITIONAL GO（建议）**。
- **正式状态：未通过**。原因：B01–B15 全部为"待裁定"，其中 O-01…O-06 需用户裁定；且范围尚未冻结（并行契约仍含 3 系统/Arena）。
- **允许动作**：G1 高保真原型（所有数值标 `PRESET/未验证`）、G2 数值契约与 golden 建设（按 G0-DEC-05/06/16）。
- **禁止动作**：G3 集成、公开 Demo、开源 Beta、向实现 Agent 下发建仓任务、以 `SCOPE.md` 的 ✅ 对外宣称完成度。

---

## 5. 需用户裁定的开放问题（O-01…O-06）

> 其余 G0-DEC 可作为"批量确认项"一次批准；下列 6 项涉及产品方向或不可逆成本，必须由用户明确选择。

| ID | 问题 | 选项 | Lead 建议 |
|---|---|---|---|
| **O-01** | 产品定位与验收强度：**"快速可演示原型"** 还是 **"可核查教学工具"**？ | A. 可核查教学工具（B01–B15 全关闭后才进 G3）；B. 快速演示（允许带技术债，B 类可降级） | **A**。V0.2 的核心卖点是"可核查"，选 B 会重蹈"好看 UI 误导"风险（RISK-01） |
| **O-02** | 是否接受 **FL-001-only P0**（3 系统/3 故障族/Arena 移出 V0.1）？ | A. 接受（按本文件）；B. 不接受，V0.1 交付 3 系统 + Arena（需重开 G0、工期 ×2.5、GT/FC 先修） | **A**。理由：一个故障讲透的教育价值 > 多个未验证模型的堆叠；扩展可作 P1/P2 |
| **O-03** | 技术栈/交付形态：**零构建 ES2020 + Canvas**（双击单文件友好、免 npm） 还是 **React+TS+Vite+ECharts**（工程化/类型安全/测试生态）？ | A. 零构建（P0 静态目录 + P1 单文件）；B. Vite+TS（P0 静态 dist，无单文件承诺）；C. 零构建为主 + P1 渐进 TS | **A**。与 V0.2 "本地可运行、无外部依赖"最契合，且既有原型即此路线；B 需放弃"双击单文件"并引入 npm/许可证管理；C 折中但延长双栈期 |
| **O-04** | 既有实现（CONTRACT.md/src/SCOPE.md/artifacts）如何处置？ | A. 定性为并行原型/技术债 + 冻结快照（按 G0-DEC-14）；B. 追认为正式规格（需重写 V0.2 范围并修 B12）；C. 暂停并封存 | **A**。既保留用户并行产出，又不让它反向定义契约；C 与用户工作方式冲突 |
| **O-05** | 事件/积分/哈希/指标四份契约是否按 G0-DEC-05/06/07/09 冻结？ | A. 全部按建议冻结；B. 部分冻结（先 B01/B02）；C. 待 G2 再定 | **A**（或至少 B）。这四份是 G2 可验收的前提，晚冻结=返工指数上升 |
| **O-06** | 是否同意"先修文档契约（B01/B02/B04/B05/B07），再由独立 oracle 重出 golden，然后才允许实现契约代码"？ | A. 同意；B. 允许先实现后补契约（风险自担） | **A**。这是成本最低顺序（V0.2 §3 自身结论） |

---

## 6. 批准后的 G0 关闭行动清单

- [ ] 用户裁定 O-01…O-06，并在本文件签字（`STATUS: APPROVED`）。
- [ ] 按 G0-DEC-05/06/07/09/10/11 产出 `NEXT/DATA_CONTRACT_SPEC.md`（含 B01/B02/B05/B06/B07/B08 字段与验收）。
- [ ] 按 G0-DEC-12/13 产出 `NEXT/MODEL_VALIDATION_SPEC.md` + `NEXT/UI_COPY_GUARDRAILS.md`（PHY 语义、措辞替换表、SA 矩阵）。
- [ ] 修订 V0.1 §1（SOC ×100）、V0.1 §5.3/§6.3/§7.3 措辞、V0.2 §5.5/§6.1/§6.3。
- [ ] 修订 `docs/CONTRACT.md`：范围降级声明 + pre@19.9 改 + SOC 公式 + FC/GT/load_step 处置（B11/B12）。
- [ ] 冻结基线快照（SHA-256 清单）并写入 `DECISIONS.md` 附录。
- [ ] 由 oracle 重新生成 `data/golden/fl001_v1.json`（G0-DEC-16）并跑通四件套空壳。
- [ ] 通过后创建 `DECISIONS/SPEC_v0.2_APPROVED.md`（**现在不创建**，符合 V0.2 §16 约束）。

**批准后的下一步任务映射（G1/G2 允许，不编码产品）**：

| 任务 | 内容 | 关联 |
|---|---|---|
| T-G2-01 | `DATA_CONTRACT_SPEC.md`（对象/字段/事件/哈希/导入/投影/指标） | B01/B02/B05/B06/B07/B08 |
| T-G2-02 | `MODEL_VALIDATION_SPEC.md`（PHY 语义整改、SA 矩阵、四件套、golden 结构） | B02/B03/B14 |
| T-G2-03 | golden v1 生成与 oracle 复核（重出全精度值） | B02/B04 |
| T-G2-04 | `UI_COPY_GUARDRAILS.md`（W 表替换、因果图改画、+4 kW 教学卡） | B13 |
| T-G2-05 | `BACKLOG_APPROVED.md`（P0a/P0b/P1/P2 与 DoD） | B09 |
| T-G2-06 | `SCOPE_SPLIT_MEMO.md`（FC/GT/Arena 的 P1/P2 与 G2b 条件） | B11/B12/B15 |
| T-G1-01 | 高保真原型规格（五页、状态切片、PRESET 标签） | B10（G1 可并行） |

---

## 7. 被否决/降级的评审建议（保留记录）

| 建议 | 来源 | 处置 | 理由 |
|---|---|---|---|
| "P0 只留叠加+指标卡，双屏/差值全 P1" | Codex §7.1 | **部分降级**：双屏/差值→P1；叠加+兼容检查保留 P0 | V0.1 §7.2 已把差值列为页面能力，完全删会削弱对照体验；成本可控 |
| "显示统一 6 dp" | Oracle N-05 | **调整为按字段 precision** | 与 V0.1 电流 4 dp 显示冲突；存储全精度即可 |
| "强制暂停并行编码" | Codex §8.3(5) 隐含 | **不采纳，改为治理条款** | 与用户并行工作方式冲突；改为快照+不反推契约（G0-DEC-14） |
| "GT-001 整体删除" | Claude §9 | **不删除，推迟 + G2b 条件** | 用户明确要求扩展；删除会丢失需求，保留恢复路径 |

---

## 8. 变更记录 / 效力声明

**变更记录（模板）**

```text
CHG-YYYYMMDD-NN | 决策 ID | 原决定 → 新决定 | 理由 | 影响文件 | 关联问题 ID | 批准人
```

**本次记录**：
- `CHG-20261027-01`：初始版本（Lead 建议稿），无前序决策。
- 观察记录（不改决策）：评审期间 `docs/CONTRACT.md` 由 53950 字节（1040 行）变为 54666 字节（1048 行）；工作区非 `.git` 文件由 43 个增至 58 个；另有并行会话持续写入 `src/**`、`artifacts/**`。→ 证据支持 G0-DEC-14 的"冻结快照"要求。

**效力声明**：
1. 本文件在用户批准前**不具有实现约束力**；任何基于本文件的编码都视为"未经 G0 通过的实验性实现"，不得对外声称已批准。
2. 本文件不构成对 V0.1 上游文档的事实更正；上游更正由 G0-DEC-12/13 落地后再发布新版本。
3. 所有"已验证/已通过"表述均不适用于物理模型有效性；本文件只记录**评审结论与决策建议**。

**文件结束**。生成于 2026-10-27T19:34+08:00，基于 `REVIEW_DIFF.md` 所列哈希快照。
