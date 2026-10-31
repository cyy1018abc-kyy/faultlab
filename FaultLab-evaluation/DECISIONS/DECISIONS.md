# DECISIONS — FaultLab V0.2 G0 决策登记（已批准）

> **状态**：`APPROVED`（2026-10-27T20:35 用户指令批准，批准记录见 §1.0）。
> **生效范围**：本文件的 D-01…D-08、G0-DEC-01…17 与 §5 的 O-01…O-06 裁定同时生效；
> 配套规格位于 `NEXT/*.md`；冻结索引与快照哈希见 `DECISIONS/SPEC_v0.2_APPROVED.md`。
> **执行原则**：批准后，代码与文档不得反向定义本文件；任何变更按 G0-DEC-17 记录 `CHG-*`。
> **决策者**：用户（产品与范围最终裁定者）。**记录者**：Team Lead（`lead`）。
> **证据来源**：`REVIEWS/CODEX_REVIEW.md`、`REVIEWS/CLAUDE_REVIEW.md`、`REVIEWS/NUMERIC_ORACLE.md`、
> `REVIEWS/REVIEW_DIFF.md`（问题编号 B01–B15 均指后者 §6）。
> **生成时间**：2026-10-27T19:34+08:00；**批准时间**：2026-10-27T20:35+08:00。
> **效力声明**：本文件覆盖对象是 V0.1/V0.2 文档与评审结论；对工作区并行实现按 G0-DEC-14
> 定性为"并行原型/技术债"，按批准规格重基线，不追认其完成度声明。

---

## 0. 使用规则

1. 每条决策包含四要素：**决定 / 理由 / 替代选项 / 后悔成本与撤回条件**（V0.2 §15.2 要求）。
2. 决策分为两级：
   - **D-01…D-08**：V0.2 §0.2 原有的 8 个产品问题，本次给出终裁建议；
   - **G0-DEC-01…17**：本次评审新增/细化的工程决策（数据契约、验收、范围、治理）。
3. 任何与 V0.1 原文冲突的决策，均以本文件为准（V0.2 §15.2：冻结批准版后覆盖上游）。
4. **不得**在未批准前把本文件当作编码依据；批准后，代码与文档不得反向定义本文件。

---

## 1.0 批准记录（2026-10-27）

| 项目 | 内容 |
|---|---|
| **批准人** | 用户（产品/范围最终裁定者） |
| **批准指令** | 2026-10-27T20:35（Asia/Shanghai）：「产出文档并且对齐 docs 文档到本次决策」 |
| **批准范围** | 本文件 D-01…D-08 与 G0-DEC-01…17 按建议执行；O-01…O-06 按 Lead 建议裁定（见下表） |
| **O-01** | **A**：可核查教学工具（B01–B15 文档类关闭后进入 G1/G2；G3 需 G2 四件套通过） |
| **O-02** | **A**：接受 FL-001-only P0；三系统/三故障族/Arena 移入 P1/P2 扩展预览 |
| **O-03** | **A**：零构建 ES2020 + Canvas（P0 静态目录 / P1 单文件）；如日后改选 Vite+TS，按 G0-DEC-17 记变更 |
| **O-04** | **A**：既有实现定性为"并行原型/技术债 + 冻结快照"，按批准规格重基线，不追认其完成度声明 |
| **O-05** | **A**：事件/积分/哈希/指标四份契约按 G0-DEC-05/06/07/09 冻结（已落为 `NEXT/DATA_CONTRACT_SPEC.md` 与 `MODEL_VALIDATION_SPEC.md`） |
| **O-06** | **A**：先修文档契约 → 独立 oracle 重出 golden → 再实现契约代码；G2 四件套为放行条件 |
| **本次执行** | 产出 `NEXT/DATA_CONTRACT_SPEC.md`、`MODEL_VALIDATION_SPEC.md`、`UI_COPY_GUARDRAILS.md`、`BACKLOG_APPROVED.md`、`SCOPE_SPLIT_MEMO.md`；对齐 `docs/CONTRACT.md`、`docs/SCOPE.md`、`docs/AGENT_PROTOCOL.md`、根 `README.md`；生成 `DECISIONS/SPEC_v0.2_APPROVED.md` |
| **保留观察** | 既有并行实现的"测试 PASS / 全部实现"声明仍属原型自评，需在 G2 重基线后复测；G0-DEC-14 的治理条款继续有效 |

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
- **评审侧：CONDITIONAL GO（建议）**；**决策侧：APPROVED（用户 2026-10-27T20:35 批准）**。
- **G0 状态：已通过（文档类阻断进入 G2 执行）**。B01–B15 的**文档类修订**已随本批准落为规格与 docs 对齐；
  G2 的数值/四件套验收仍待执行（golden 重出、E2E、registry、schema 校验）。
- **允许动作**：G1 高保真原型（数值标 `PRESET/未验证`）、G2 契约/golden/四件套建设、按 `BACKLOG_APPROVED.md` 的 P0a 开工。
- **仍禁止**：G3 集成与公开 Demo / 开源 Beta 直到 G2 四件套通过；任何"模型验证/硬件验证"表述；
  以 `docs/SCOPE.md` 的原型自评替代 G2 验收。

---

## 5. 开放问题（O-01…O-06）— 已裁定

> **裁定记录（2026-10-27T20:35）**：按 Lead 建议全部执行：**O-01=A、O-02=A、O-03=A、O-04=A、O-05=A、O-06=A**。
> 下表保留为裁定前的选项讨论；若需翻转任一决策，须按 G0-DEC-17 记录 `CHG-*` 并重开 G0（尤其 O-02/O-03）。

| ID | 问题 | 选项 | Lead 建议 |
|---|---|---|---|
| **O-01** | 产品定位与验收强度：**"快速可演示原型"** 还是 **"可核查教学工具"**？ | A. 可核查教学工具（B01–B15 全关闭后才进 G3）；B. 快速演示（允许带技术债，B 类可降级） | **A**。V0.2 的核心卖点是"可核查"，选 B 会重蹈"好看 UI 误导"风险（RISK-01） |
| **O-02** | 是否接受 **FL-001-only P0**（3 系统/3 故障族/Arena 移出 V0.1）？ | A. 接受（按本文件）；B. 不接受，V0.1 交付 3 系统 + Arena（需重开 G0、工期 ×2.5、GT/FC 先修） | **A**。理由：一个故障讲透的教育价值 > 多个未验证模型的堆叠；扩展可作 P1/P2 |
| **O-03** | 技术栈/交付形态：**零构建 ES2020 + Canvas**（双击单文件友好、免 npm） 还是 **React+TS+Vite+ECharts**（工程化/类型安全/测试生态）？ | A. 零构建（P0 静态目录 + P1 单文件）；B. Vite+TS（P0 静态 dist，无单文件承诺）；C. 零构建为主 + P1 渐进 TS | **A**。与 V0.2 "本地可运行、无外部依赖"最契合，且既有原型即此路线；B 需放弃"双击单文件"并引入 npm/许可证管理；C 折中但延长双栈期 |
| **O-04** | 既有实现（CONTRACT.md/src/SCOPE.md/artifacts）如何处置？ | A. 定性为并行原型/技术债 + 冻结快照（按 G0-DEC-14）；B. 追认为正式规格（需重写 V0.2 范围并修 B12）；C. 暂停并封存 | **A**。既保留用户并行产出，又不让它反向定义契约；C 与用户工作方式冲突 |
| **O-05** | 事件/积分/哈希/指标四份契约是否按 G0-DEC-05/06/07/09 冻结？ | A. 全部按建议冻结；B. 部分冻结（先 B01/B02）；C. 待 G2 再定 | **A**（或至少 B）。这四份是 G2 可验收的前提，晚冻结=返工指数上升 |
| **O-06** | 是否同意"先修文档契约（B01/B02/B04/B05/B07），再由独立 oracle 重出 golden，然后才允许实现契约代码"？ | A. 同意；B. 允许先实现后补契约（风险自担） | **A**。这是成本最低顺序（V0.2 §3 自身结论） |

---

## 6. G0 关闭行动清单（执行状态：2026-10-27T20:50）

- [x] 用户裁定 O-01…O-06（`STATUS: APPROVED`，见 §1.0）。
- [x] 产出 `NEXT/DATA_CONTRACT_SPEC.md`（含 B01/B02/B05/B06/B07/B08 字段与验收）。
- [x] 产出 `NEXT/MODEL_VALIDATION_SPEC.md` + `NEXT/UI_COPY_GUARDRAILS.md`（PHY 语义、措辞替换表、SA 矩阵）。
- [ ] 修订 V0.1/V0.2 上游文档正文（SOC ×100、措辞、PHY 语义）——**待办**：本目录只发布规格与对齐记录，上游原文修订需另立任务，避免改动用户原始输入。
- [x] 修订 `docs/CONTRACT.md`：范围降级 + 事件 pre@20.0 左极限 + SOC 公式 + load_step/FC/GT 处置（见该文件「附录 G0 对齐记录」）。
- [x] 对齐 `docs/SCOPE.md`、`docs/AGENT_PROTOCOL.md`、根 `README.md`（G0 状态/范围/真实性标签）。
- [x] 冻结基线快照（SHA-256 清单）并写入 `DECISIONS/SPEC_v0.2_APPROVED.md` 附录（2026-10-27T20:55 完成）。
- [ ] 由 oracle 重新生成 `data/golden/fl001_v1.json`（G0-DEC-16）并跑通四件套空壳——**G2 执行项**。
- [x] 创建 `DECISIONS/SPEC_v0.2_APPROVED.md`（含批准记录与哈希清单，符合 V0.2 §16 流程）。

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
- `CHG-20261027-02`：**批准生效**。用户 2026-10-27T20:35 指令批准全部决策（O-01…O-06=A）；
  同步产出 `NEXT/*` 五份规格、`DECISIONS/SPEC_v0.2_APPROVED.md`，并对齐 `docs/CONTRACT.md`、
  `docs/SCOPE.md`、`docs/AGENT_PROTOCOL.md`、`README.md`。批准人：用户；记录人：Lead。
- 观察记录（不改决策）：评审期间 `docs/CONTRACT.md` 由 53950 字节（1040 行）变为 54666 字节（1048 行）；
  工作区非 `.git` 文件由 43 个增至 58 个；另有并行会话持续写入 `src/**`、`artifacts/**`。
  → 证据支持 G0-DEC-14 的"冻结快照"要求。
- `CHG-20261028-01`：**G2 数值门禁关闭 + golden v1 批准**。用户 2026-10-28 指令「批准」。
  依据：`NEXT/evidence/g2/`（四件套 13/13、verify_golden exit 0、oracle 独立性自检 SC-1…6）；
  golden approval 三字段已由 oracle（`emit_golden --approve`）回填，`approved_golden_sha256`
  为去除 generated_by/approval 的内容摘要。同时追认实施偏差 D-1…D-12
  （`evidence/g2/deviations.md`、`evidence/g4/README.md`），其中语义级为 D-2（run_hash 剥离
  source_run_ids，消解 §4.2 与 G0-DEC-07 的表面冲突）、D-5（FL-001 模型身份按契约改为
  fl001/fl001.1，旧本地存档按 §4.2 拒绝恢复属预期行为）、D-10/D-11（文案扫描允许串扩充）。
  批准人：用户；记录人：实现 Agent。
- `CHG-20261028-02`：**G3（P0a 集成）关闭**。用户 2026-10-28 指令「批准」。主旅程验收点 1–5
  由 `tools/e2e.mjs`（40 断言）+ 用户走查委托覆盖；G0-DEC-03 的「`dist/` 静态目录」口径裁定为
  「仓库根目录即静态目录」（本仓库无构建步骤，`python -m http.server` 直接服务根目录；
  单文件交付仍属 P1-05）。批准人：用户；记录人：实现 Agent。
- `CHG-20261028-03`：**G4（P0b 质量）关闭**。用户 2026-10-28 指令「听你的」（委托记录者按推荐
  方案执行走查）。P0b-01/02 走查以自动化走查 + 截图记录完成（`evidence/g4/walkthrough-p0b01-02.md`
  与 `artifacts/` 截图）；遗留的主观审美判断由用户本条指令委托记录者判定，无阻断项。
  批准人：用户；记录人：实现 Agent。
- `CHG-20261028-04`：**P1 开工批准（最小方案）+ P2 维持冻结**。用户 2026-10-28 指令「听你的；开」：
  批准 P1-02（HTML 报告正式验收：`tests/report.test.js` + §1.5 页脚落地）与 P1-06（FC-001 修复清单：
  假设补齐 + 独立 oracle/golden + G2b-lite 记录）；P1-01/03/04/05 挂起（未批准不实施）；
  P2（FL-19/FL-20/GT-001 G2b/load_step）维持冻结与 NO-GO 不变。批准人：用户；记录人：实现 Agent。
- `CHG-20261028-06`：**G5 关闭（GO）+ 版本 v0.2.0 + 许可证 MIT**。用户 2026-10-28 指令授权：
  「定许可证……协助跑双浏览器走查。这两项闭环后 G5 即可关闭，正式版本号（建议 v0.2.0）随关闭一并定」。
  闭环记录：F-1 许可证 = **MIT**（`LICENSE` + README §11；选择由用户委托记录者作出，理由：教学演示
  工具惯例许可、运行期零第三方依赖、五个对标项目仅参考未复制源码故无传染义务；如需改约可在任何
  后续版本变更）；F-4 双浏览器走查 = Chrome 156.0.8078.48 / Edge 156.0.4314.42 各 E2E 40/40
  （`evidence/g5/walkthrough-dual-browser.md`；期间修复 e2e 工具对 Edge 首个 target 会话失效的
  兼容——浏览器级 WS + createTarget + flatten 会话路由 + 自愈重试，属测试工具修复，非产品变更）。
  G5 门禁关闭；版本 **v0.2.0**（标签 `v0.2.0`；README/UI 品牌串同步）。F-3（单文件不发布）、
  F-5（性能阈值未冻结）、F-6（单路评审）作为非阻断项保留记录。P2 的"G5 beta 后"进入条件自此
  满足，但各项仍需独立 RFC/评测协议方可实施。批准人：用户；记录人：实现 Agent。
- `CHG-20261028-05`：**G5（对外发布）评审启动**。用户 2026-10-28 指令「对 G5（对外发布）启动评审」。
  记录者单路评审完成（`NEXT/evidence/g5/README.md`）：就绪检查单 R-01…R-10（8✅/1 部分/1✅）、
  发现项 F-1…F-6；评审侧建议 **CONDITIONAL GO**，关闭前置条件 = F-1 许可证决定（用户决策，
  仓库当前无 LICENSE）+ F-4 双浏览器人工走查留档；发布候选基线标签 `g5-rc1`。
  决策侧（G5 关闭/驳回）待用户裁决；关闭前不得对外发布。批准人：用户（启动）；记录人：实现 Agent。
- `CHG-20261029-01`：**V0.3 阶段规划批准（按推荐裁定）+ 暂不开工**。用户 2026-10-29 指令「先按推荐，
  不开工」。批准 `NEXT/V0.3_PLAN_APPROVED.md`（由 V0.3_PLAN_DRAFT.md 批准后更名）为 V0.3 阶段权威规划；
  O-07…O-12 按其 §7 推荐裁定生效：O-07=A（WS-A 收尾 + WS-C FL-19 RFC + WS-D Arena 评测协议 +
  WS-E/F 的 G2b 文档阶段全面铺开，实现按 G6/G2b 门禁逐个放行）、O-08=部分重启**优先序**（P1-05、
  P1-03 优先；重启实施仍待用户开工指令 + 各自 CHG）、O-09=FC-001 升正式验收（实施待开工指令；
  须 CHG + model_version 升版 + golden 重建；SA-24 白名单仍不含 FC）、O-10=a（上游修订以新文件承载，
  INPUT/ 冻结快照不动）、O-11=a（性能阈值 E2E 实测后冻结入门禁）、O-12=发布版本 **v0.3.0**。
  本次批准为**规划采纳，不含开工授权**：所有 V3-xx 与重启的 P1 任务实施前须用户逐次开工指令；
  G6/G2b/G7/G8 门禁与规划 §5 红线照常约束。`BACKLOG_APPROVED.md` 为 G0 冻结件不做改动，
  其 §5.2 引用关系以本条为准。批准人：用户；记录人：实现 Agent。
- `CHG-20261030-01`：**V0.3 开工队列前三项交付（V3-20 / V3-10 / V3-01）**。用户 2026-10-30 指令
  「进入实现阶段」。① **V3-20 Arena 真值隔离评估**：判定**可守（有条件）**、无需架构 B 重评——
  威胁模型内数据路径（内置 Agent 输入/观测过滤/评分隔离/Run 快照/导出包/持久化/路由封存）逐项查证
  干净；两项协议级发现 **LEAK-1**（盲测导出包携带原始 seed，`mulberry32` 确定性抽样 + MIT 源码公开
  ⇒ 可离线重建全部轮次真值，现行 `assertSealed` 键名扫描不可拦截）与 **LEAK-2**（`schema.project('blind')`
  事件脱敏保留 `trigger_s`，可泄漏注入时刻；现无生产调用方，属潜伏缺陷）；守卫清单六条移交 V3-21/V3-22；
  触发架构 B 重评的条件（对外排位/竞争性评测/评分宣称诊断能力）写入评估记录
  （`NEXT/evidence/g6/v3-20-truth-isolation-assessment.md`）。② **V3-10 FL-19 后端适配 RFC**：
  `NEXT/FL19_BACKEND_RFC_DRAFT.md` v1 交付（B-1…B-5 候选与许可初判、BackendAdapter 接口只增不改、
  进程外/回环/零安装隔离规则、EvidenceBundle v1 兼容与跨后端 incomparable 口径、golden 唯一 +
  tolerance_profile 声明制、BK-E01…05 错误码、开放问题 Q-1…Q-5），待 V3-11 双路独立评审，
  过 G6 前不写产品代码。③ **V3-01 G4 人工走查补课**：`qa.mjs ux` 14/14 + `misc` 9/9（本轮实测，
  控制台 0 错误）+ 六页截图人工复核（归档 `evidence/g6/screenshots/`）+ UX-T01…T13 子集映射
  （两项豁免留痕：T10 引擎失败态复演、T12 reduced-motion 断言）；根 README §9 该遗留项关闭
  （`evidence/g6/walkthrough-v3-01.md`）。全程零产品代码改动；`run-g2.mjs` 开工前后均 16/16。
  本条为执行记录，不关闭任何门禁：G6/G2b 未动。
  批准人：用户（开工指令）；记录人：实现 Agent。
- `CHG-20261030-02`：**V0.3 第二批开工交付（V3-11 / V3-21 / V3-22）——RFC 与评测协议双双通过
  双路独立评审并修订至 v1.1；G6-WS-C/WS-D 关闭待用户批准**。用户 2026-10-30 指令「进入 V3-11
  （RFC 双路独立评审）、V3-21/V3-22（Arena 评测协议起草与评审）」。① **V3-21**：起草
  `NEXT/ARENA_EVAL_PROTOCOL_DRAFT.md`（独立盲评测协议 v2：双轨制、固定测试集与
  testset_id、Verifier 模型与成绩单哈希链、盲包 v2 closed-world 白名单、评分数值规格、
  负例 17 条与 AE 错误码），逐条落位 V3-20 六条守卫。② **V3-22**：双路独立上下文对抗评审
  （评审 C 真值隔离视角 / 评审 D 工程视角，互不可见，均 **CONDITIONAL GO**）——C 发现
  F-1 [BLK]（v1 的 testset_id 末段含 set_seed 材料，8 hex 即 32 位种子全部空间，LEAK-1 前门复活）、
  F-2…F-5 [MAJ]（红线过度承诺、deriveChangePoints 实为软事件表、open_seed 种子空间共用与
  提交无绑定、组织方零约束）；D 发现 F-01 [BLK]（scoring_rules 仅指针，权重/窗口/舍入未入协议文本，
  第三方复算不可能）、F-02 [BLK]（score_hash 序列化未定义）、F-03…F-06 [MAJ]。协议修订至 **v1.1**
  吸收全部「G6 前必须改」（testset_id 独立随机串化、红线二分改写、禁项按可派生性定义、提交绑定、
  组织方约束、N-B13…17 增补；评分数值冻结、canonical_json 沿用 Canonicalization v1、1-based
  更正、sealedProjection 显式并集、负例映射表、生成器 MVP 与 2–52 s 更正）。
  合并记录：`NEXT/evidence/g6/v3-22-protocol-review.md`。③ **V3-11**：RFC v1 双路独立上下文评审
  （评审 A 物理/数值视角 / 评审 B 工程/契约视角，互不可见，均 **CONDITIONAL GO**）——A 发现
  F-1 [BLK]（scope 机制自相矛盾：registry 按 classify 重算，白名单配置的后端 Run 会判 approved_p0
  进入 P0 验收面）、F-2…F-6 [MAJ]；B 发现 F-01 [BLK]（「逐字节兼容 v1」与「backend 入哈希」互斥，
  run_hash 输入面系 G0-DEC-07 冻结项）、F-02…F-06 [MAJ]（engine_version 语义、两级接口现实、
  provenance 硬编码、回环 HTTP CORS/CSRF、verify_bundle 网格硬约束）。多项发现双路交叉印证。
  RFC 修订至 **v1.1**（scope 受控扩展明文化+CHG+断言、role 复原+两级接口 produce/assembleRun/
  createFromParts、复核分工如实化、容差判定层感知 tolerance_profile+B-1 按 rtol 1e-12、
  B-4 措辞触发器、backend 不入 run_hash、engine_version=产生数值的实现版本+compareRuns 零改动、
  条件化 provenance、I-2 安全条款、网格锁定、BK-E01a/b 拆分）；Q-1…Q-5 裁定记录待用户批准生效
  （Q-3 否决 numerical_demo、Q-4 三守卫、Q-5 FMU 强制 model_manifest）。
  合并记录：`NEXT/evidence/g6/v3-11-rfc-review.md`。全程零产品代码改动（run-g2 基线不适用重跑）；
  两项评审侧结论均为「修订后放行」，**G6-WS-C/WS-D 关闭待用户批准**（批准时随 CHG 落 QP-1…5、
  Q-1…5 裁定与 DATA_CONTRACT_SPEC 措辞 CHG 条目）；实现（V3-12 后端准入、Arena 评测轨 MVP）
  仍属 G6 后另批。批准人：用户（开工指令）；记录人：实现 Agent。
- `CHG-20261030-03`：**G6-WS-C 与 G6-WS-D 关闭（用户批准）+ 开放问题裁定生效**。用户 2026-10-30
  指令「批准」。批准对象：① `NEXT/FL19_BACKEND_RFC_APPROVED.md`（由 FL19_BACKEND_RFC_DRAFT.md
  批准后更名，v1.1）——FL-19 后端适配方案 + Q-1…Q-5 裁定生效（Q-1 回环 HTTP、stdio 仅限 Node
  工具链、I-2 安全条款 CORS 收窄 + Origin/Sec-Fetch-Site + 会话 token；Q-2 B-1 独立性四边界
  （独立编写/自检独立/「跨实现一致性检查」措辞/解析口径按 rtol 1e-12）；Q-3 否决 `numerical_demo`
  新档位，B-1=analytical_demo、B-5/B-4=numerical_simulation，后端 Run 三字段恒 `not_performed`；
  Q-4 B-2/B-3 登记三守卫（准入门绑定 FL-001 方程集/许可核实为前置/验收路径禁入直至各自 RFC+G2b）；
  Q-5 FMU 强制附 machine-readable model_manifest 方准入，拒绝者仅「黑盒预览」禁入对比结论）；
  ② `NEXT/ARENA_EVAL_PROTOCOL_APPROVED.md`（由 ARENA_EVAL_PROTOCOL_DRAFT.md 批准后更名，v1.1）
  ——独立盲评测协议 v2 + QP-1…QP-5 裁定生效（QP-1 Node 单实现首发、Python 仅赛后复算脚本；
  QP-2 场次独立 + 入库共享基准集；QP-3 取最高 + 全次留痕、哈希链绑提交序号；QP-4
  deriveChangePoints 首发前置 = sr1 健康局假候选率测量并公布；QP-5 允许 post-reveal 调试赛、
  成绩单永久标「post-reveal·不计分」且种子空间受 §4 隔离约束）。G6-WS-C/WS-D 关闭 = RFC/协议门
  通过；**实现仍待用户逐次开工指令**：下一队列 V3-12（后端适配准入清单冻结：Q-4 三守卫、
  tolerance_profile 逐字段档位、BK-E03 页面侧 vs-golden 校验器、noise 页面侧施加、method 双口径
  显示规则、scope-guard 断言增补——评审 B F-12 归属表）与评测轨 MVP（协议 §8 五件套）。
  随实现另需落：DATA_CONTRACT_SPEC §1.1 engine_version 措辞 CHG（「实现版本」）、BK/AE 错误码
  入契约错误码表、copy-guard 允许串扩充（deviations 留痕）。批准人：用户；记录人：实现 Agent。
- `CHG-20261030-04`：**V0.3 第三批开工交付（V3-12 冻结 + 评测轨 MVP 实现过 G7 + WS-E/WS-F G2b 文档）**。
  用户 2026-10-30 指令（/goal）「V3-12 后端适配准入清单冻结、评测轨 MVP 实现（协议 §8 五件套）完成后走
  G7、WS-E/WS-F 的 G2b 文档阶段同一批次实现」。① **V3-12**：`NEXT/V312_BACKEND_ADMISSION_CHECKLIST.md`
  **FROZEN**——Q-4 三守卫机检化（G-1 准入门绑定/G-2 依赖冻结/G-3 验收路径禁入，机检形式定义）、
  tolerance_profile 逐字段档位（`fl001-analytic-crosscheck` rtol 1e-12 / `fl001-rk4-dt0.1` 上限值，
  量化依据强制）、BK-E03 归属页面侧 vs-golden 校验器（`src/core/golden-compare.js` 计划新建）、
  noise 页面侧施加并声明、method 双口径并排显示、scope-guard 四断言（backend ⇒ 强制 extension_preview，
  classify 不改）、engine_version/model_manifest/复核链落地与 C-1…C-5 CHG 条目清单、评审 B F-12
  归属总表。② **评测轨 MVP（第一批产品代码）+ G7 集成验收通过**：`src/core/arena-protocol.js`
  （sealedProjection 键名禁词并集 + 语义禁项；场景流/deriveTruth/blindObservables/buildSamples 自
  arena.js 抽出共享，arena.js 反向调用逐位等价；盲包 v2 closed-world 构造 + V-00…V-06b 校验 +
  CSPRNG 标识符 + sr1 冻结常量 + SCORING_SPEC_TEXT 冻结文本；提交绑定 + score_hash 落章）、
  `tools/arena2-gen.mjs`（盲包 + reveal 生成器）、`tools/arena2-verify.mjs`（Verifier V-00…V-10）、
  `tests/arena-protocol-negative.test.js`（N-B1…N-B17 冻结 fixtures + MVP smoke）、`run-g2.mjs`
  挂步（16→17 步）。验证：负例+smoke **42/42**、arena 回归 **155/155**（重构逐位等价）、
  copy-guard **exit 0**（无允许串扩充）、run-g2 **17/17**（E2E 40 断言基线不回退、双 golden verify
  通过；`artifacts/run-g2-report.json`）、CLI 端到端双形态（单轮/4 轮含噪）通过；**QP-4 前置满足**：
  deriveChangePoints（sr1）健康局假候选率实测 **0/30**、可测幅值（≥5 A）阶跃邻近检出 **7/7**（随
  测试发布）。偏差 D-13…D-16 登记（`evidence/g7/README.md` §4）。页面演示轨 UI 零改动（index.html
  仅增 arena-protocol.js 加载项）。③ **V3-30**：`NEXT/GT001_G2B_SPEC_DRAFT.md` v1 交付——恢复条件
  1–7 逐条落文（r_true 定义恒等、r_meas 废除改 `f_channel_diff_Hz` 通道差、惯量线性化声明
  E_kin=125·(f/50)² kW·s + 能量校核、验收锚点重写含 60 s 未收敛声明、电池短时额定 ±15 kW +
  限幅检查、GT 未建模物理清单、UI 标签「单机等效频率响应示意（L0b）」+ 禁止措辞）；条件 8（独立
  oracle/golden）→ V3-31、条件 9（抗饱和/恢复定义）随 V3-32 评审裁定。**G2b 未关闭，GT-001 实现
  仍禁止**（G0-DEC-15）。④ **V3-40**：`NEXT/LOAD_STEP_RULING_MEMO.md` v1 交付——删除/重写两选项
  全量代价收益 + Arena 涟漪分析；记录人**推荐删除**（风险不对称/教学边际价值低/GT 语境更自洽）；
  **裁定权在用户（O-13）**，裁定前现文本维持禁止实现。批准人：用户（开工指令）；记录人：实现 Agent。
- `CHG-20261030-05`：**V0.3 第四批（FL-19 开工增量一过 G7 + V3-32 GT-001 双路评审完成 → 规格 v1.1）+ 入库**。
  用户 2026-10-30 四指令（O-13 裁定路径询问 / V3-32 派发 / FL-19 开工 / 入库）。① **FL-19 开工增量一
  （第一批后端代码，过 G7）**：B-1 Python 解析后端（`tools/backend/py/fl001_analytic.py`，按
  MODEL_VALIDATION_SPEC §1.3/§5.2 独立编写，vs golden 逐点最差 **1.19e-16**、metrics 全部 ≤1e-12，
  解析交叉层）+ B-5 RK4 后端（3.49e-8，声明档 fl001-rk4-dt0.1；步左沿目标消除跨阶跃 stage 混值）+
  `tools/backend/fl001-adapter.mjs`（stdio 工具链形态，BK-E02 形状校验）+ `src/core/golden-compare.js`
  （**BK-E03 判定载体**，analytic 档直接采用 golden.tolerances.analytic_crosscheck 单一来源）+
  `tests/backend-admission.test.js`（G-1a/c 准入门绑定、G-2 依赖冻结、三场景×双后端、确定性、
  两条负例，**51/51**）+ run-g2 挂步 17→**18/18 全绿**（E2E 40 基线不回退）；
  copy-guard exit 0；偏差 D-17…D-19（`evidence/g7/backend-increment1.md`）。增量二
  （createFromParts 组装层/UI 桥/scope 断言 1·3·4）另批。② **V3-32 完成（评审侧）**：GT-001 规格
  双路独立上下文评审（互不可见，均含实机复算）——物理路 **CONDITIONAL GO**（F1 [BLK] 能量校核
  判据线性化截断残差 4.3e-3~8.4e-3 超 1e-6 三四个数量级；F2 缺 f(60)=49.992 锚点；F3 ±15 kW 与
  参数域冲突；F4 恢复数未经验证；F5 容差阶梯失准）；工程路 **CONDITIONAL GO**（F-01 [BLK] checks.js
  漏列破门禁·实机验证；F-02/F-03 与物理路交叉印证；F-04…F-09 更新序/字段面/run 集；20 文件涟漪
  清单）。规格修订 **v1.1** 吸收全部「批准前必改」（能量校核残差项显式化、锚点补全、限幅重裁定
  包络 25 kW + 15 kW 降声明、§9 清除瞬态如实化 + 抗饱和 (a)/(b) 待用户定案、oracle 更新序冻结、
  golden run 集 ≥5、checks/因果模板/测试涟漪补全）。合并记录：`evidence/g2b/gt001-v3-32-review.md`。
  **G2b 关闭待用户批准**（批准时定案 §9 (a)/(b) 与 §4 网格决策）；GT-001 实现仍禁止。③ **O-13**：
  裁定路径已答复用户（两选项动作清单 + 记录人推荐删除；一词裁定即执行）。④ **入库**：本批连同
  CHG-20261029-01…本条全部 V0.3 工作以单提交入库并推送远端（提交哈希见 git log；推送重试机制
  应对 github 直连抖动）。批准人：用户（开工/入库指令）；记录人：实现 Agent。
- `CHG-20261030-06`：**O-13 裁定执行（FL-001 load_step 删除）+ G2b 关闭（GT-001 规格批准）+
  FL-19 增量二（组装层）+ 入库**。用户 2026-10-30 三指令（「裁定；批准；实现后续后端的批准」）。
  ① **O-13 = 选项 A 删除**（按 `LOAD_STEP_RULING_MEMO` 推荐；用户指令「裁定」采纳记录人推荐）：
  `docs/CONTRACT.md` 四处更新（§5.1 扩展段改为删除注记、验收行、头部与范围节）；删除前原文归档
  `NEXT/evidence/g2b/load_step-removed-contract-text.md`；`systems.js` FL-001 移除 load_step 故障
  定义/faultAnchors 条目/P_load_demand 文案；`engine.js` simulateFL001 移除 isLoad 分支（FC/GT
  分支不动）；`arena-protocol.js` 场景族池改为**按系统故障目录派生**（familyPool——FL-001 盲测池
  自动收缩为 sensor_drift/actuator_fault，GT/FC 目录不变）；测试同步：core.test（家族覆盖按系统
  期望、systems.fault 查询、FL-001 load_step 场景块 → 校验拒绝断言、家族切换改 FC-001 验证、
  场景矩阵删 FL-001 load_step 行、load-profile 白名单 fixture 改 FC-001 对）、compare.test（同上
  FC-001 对）。**裁定边界**：仅 FL-001 的 load_step；actuator_fault（三系统）与 FC/GT 的
  load_step 不在本裁定范围。golden 不受影响（白名单本就仅 sensor_drift/none）。
  ② **G2b 关闭（GT-001 规格 v1.1 批准）**：`NEXT/GT001_G2B_SPEC_DRAFT.md` 更名
  `GT001_G2B_SPEC_APPROVED.md`；批准时定案：**§9 抗饱和 = 方案 (a)**（现状钳位 + 清除瞬态如实
  声明，不改方程，恢复锚点降暂定待增补轮 oracle 复算冻结）、**§4 网格 = 保留 60 s / dt=0.1
  输出网格**（Euler 0.01 为积分子步）。合并记录：`evidence/g2b/gt001-v3-32-review.md`。
  **V3-31（独立 oracle + gt001_v1 golden）与 V3-33（实现：§10 涟漪清单 20 文件）待逐次开工
  指令**；实现完成前 GT-001 演示仍为扩展预览、不进入任何验收。③ **FL-19 增量二（组装层）过 G7**：
  `registry.createFromParts`（结构骨架取自 JS 引擎同 config simulate、timeseries 替换为后端序列、
  metrics/checks 页面侧重算、golden-compare 注入式附加 vs_golden_tolerance 检查（BK-E03 载体生效）、
  engine_version=`backend.id@version`（跨后端对比天然 incomparable）、manifest.backend 不入
  run_hash、**scope 受控扩展执行点**：强制 extension_preview + `scope.assertApprovedP0` 对后端
  Run 抛 SCOPE-E01（classify 零改动——V312 §6 断言 1/2/3 全落地））、python 后端补 provenance
  字段（B-1=analytical_demo/B-5=numerical_simulation，Q-3）、准入测试 51→**66/66**（scope 断言
  1–4、bundle 导出断言、BK-E02 原子性、跨后端闸门、B-5 组装）、`DATA_CONTRACT_SPEC` 附录 A
  （C-1 engine_version 语义 / C-2 manifest.backend / C-3 BK 错误码登记）。全量验证：
  `run-g2.mjs` **18/18**（compare.test 修复后）、copy-guard exit 0。
  ④ **入库**：随批提交推送（哈希见 git log）。批准人：用户（裁定/批准/开工指令）；记录人：实现 Agent。
- `CHG-20261030-07`：**I-11 模型接口实现还原（S1/S2 移植回 V0.3 主线）+ 文档补齐 + 入库**。用户
  2026-10-30 两指令（16:21「还原远端同步 github 仓库的进度」、17:37「补齐缺失部分」）。① **背景**：
  2026-10-30 16:17 工作区被重置到 `origin/main`（7aed9f6），并行备份线
  （`backup/local-parallel-p1-20261028`，tip 373859f）上的 I-11 S1/S2 实现与 RFC 未随主线保留，
  按用户指令从备份分支还原。② **还原内容（提交 311d0f0，12 文件 +558/−7）**：
  `src/core/plants/fl001.js`（S1）与 `src/core/plants/fc001.js`（S2）适配器、`engine.js` 家族门
  （`fl001PlantCapable`/`fc001PlantCapable`）+ `simulateFL001Plant`/`simulateFC001Plant` 委托
  （内联数值路径保留）、`index.html` 与 `tests/core-load.js`/`tests/arena.test.js` 装载清单、
  `tests/plants.test.js`（**83 断言**接口护栏）、`tools/verify-i11-bitidentity.mjs`（12 配置逐位
  快照）、`run-g2` 挂步 18→**19**、证据刷新（`artifacts/run-g2-report.json` 19/19、
  `e2e-report.json` 40/0）。**边界**：FL-001 适配器只覆盖 `none`/`sensor_drift`（`load_step` 已按
  O-13 删除；`actuator_fault` 保留内联扩展预览路径）；FC-001 `none`/`sensor_drift` 走适配器，
  `load_step`/`actuator_fault` 暂缓家族保留内联（RFC S2 验收边界）；GT-001 未接入（S3 未排期）；
  registry/bundle/backend/scope/UI 零改动；单文件 `FaultLab.html` 不重建（P1-05 未批准）。③ **验证**：
  `run-g2` **19/19**（plants 83/83、arena 155/155、E2E 40/0、backend-admission 66/66、双 golden
  verify、copy-guard exit 0）；逐位一致性 **12/12 配置 0 mismatch**（`run_hash`/`signals_sha256`/
  `metrics_sha256`，基线 7aed9f6 对照还原后；`engine_version` 维持 0.1.0）。④ **文档补齐**：归档
  `NEXT/RFC_MODEL_INTERFACE_I11_APPROVED.md`（含 §9 移植附录、12 配置快照、复现步骤与未包含项；
  主线代码注释引用统一为该文件名）；本记录；README 目录/工具/验证命令/文末索引对齐。⑤ **批准与
  编号说明**：并行线 CHG-20261028-01/02（I-11 RFC 批准 + S1/S2 记录）与主线同号 CHG（G2 数值
  门禁关闭 + golden 批准）内容不同，故并行线 CHG 文件不迁入主线，其批准事实与摘要见
  RFC §9.4；备份分支保留可随时调阅。⑥ **入库**：实现提交 311d0f0 已合并 `main` 并推送远端；本补齐
  随下一次提交推送（哈希见 git log）。批准人：用户（还原/补齐指令及合并推送确认）；记录人：实现 Agent。
- `CHG-20261030-08`：**V0.3.0 发布交付（T1–T5）+ G8（发布门 v0.3.0）关闭 + 版本 V0.3.0 + 标签 `v0.3.0`**。
  用户 2026-10-30 批准 **V0.3.0 最终实施计划**（稳定性 / 可复现性 / 可追溯性发布：不新增产品功能、
  不改架构、不新增物理模型、不做 FC-001 升级、不重建单文件 `FaultLab.html`）。① **T1 G2 报告追溯**：
  `tools/run-g2.mjs` 报告新增代码版本元数据（`code.commit_sha` / `branch` / `worktree_dirty` /
  `dirty_paths`）、环境元数据（platform / arch / node / python）与执行元数据（command / started_at /
  generated_at / duration_ms，单项测试 duration_ms），19 步测试集合、执行顺序与 PASS/FAIL 判据不变；
  候选提交 `1a8c1aee4f95d9e1d867fd318bc5114ee4330443`（`main`，`worktree_dirty=false`）上
  **19/19 PASS**（ok=true / failed=0；`2026-10-30T10:49:10.226Z`，duration 25828 ms；
  环境 win32 / x64 / Node v24.14.0 / Python 3.14.4；报告 `artifacts/run-g2-report.json`，发布证据
  归档 `evidence/g8/`）；G2 内 ② 浏览器 E2E 同提交 Chrome 40/40（`artifacts/e2e-report.json` 已刷新，
  commit 一致、`worktree_dirty=false`）。② **T2 I-11 逐位复验**：
  `tools/verify-i11-bitidentity.mjs` **增量**新增 `--baseline <f>` 对照模式（默认快照行为与位置参数
  向后兼容），在候选提交上重新生成 `evidence/g8/i11-bitidentity/{baseline-7aed9f6,current,comparison}.json`
  + README：对基线 `7aed9f6e12408aed2a163255d03d029ad8030a50` **12/12 配置 · 36/36 字段**
  （`run_hash` / `signals_sha256` / `metrics_sha256`）逐位一致、比对 exit 0；RFC §9.6 的 12 个
  `run_hash` 逐位交叉核对通过；比对器负例自检（篡改快照）exit 1、35/36 并精确列出差异，证明非恒真
  通过；`engine_version` 维持 **0.1.0**（数值实现未变，不升版）。③ **T3 双浏览器 E2E**：
  `tools/e2e.mjs` **增量**新增 CDP `Browser.getVersion` 浏览器身份与代码版本 / 执行元数据，既有
  40 断言、旅程（fl001-min）与退出码不变；在**同一候选提交**、`worktree_dirty=false` 下：
  Chrome **155.0.8059.85** 40/40（`evidence/g8/chrome/e2e-report.json` + `e2e-fl001-min.png`，
  `2026-10-30T10:49:28.407Z`，base :4319）、Edge **155.0.4283.62** 40/40
  （`evidence/g8/edge/e2e-report.json` + `e2e-fl001-min.png`，`2026-10-30T10:49:44.847Z`，
  base :4322，msedge 路径已核实）；双浏览器走查记录 `evidence/g8/walkthrough-dual-browser.md`
  （仅当前稳定大版本实测，无旧版本 / 其它 OS 矩阵）。④ **T4 G8 关闭**：复用 G5 就绪检查单 R-01…R-10
  （全部 ✅）+ 双浏览器走查 + 版本号 / 标签 / README / 页脚同步 + CHG；证据索引
  `evidence/g8/README.md`、检查单 `evidence/g8/g8-release-checklist.md`；支撑计数：Copy Guard PASS
  （29 模式，exit 0）、scope-guard 24/24、bundle 35/35（含 `verify_bundle.py` 正常 / 篡改交叉验证）、
  plants 83/83、双 golden `verify_golden` exit 0。⑤ **T5 版本与文档同步**：README /
  `V0.3_PLAN_APPROVED.md` / 本条 CHG 统一对外版本 **V0.3.0**（发布日期 2026-10-30）；产品侧仅品牌串
  同步（`index.html` meta description、`src/ui/pages/home.js`、`src/ui/shell.js`），
  **`engine_version` 保持 0.1.0**（数值实现未变，不升版）；发布标签 **`v0.3.0`**（发布提交 = tag
  `v0.3.0` 所指提交，哈希见 git log）。
  **边界声明（持续有效）**：G8 关闭仅为**内部一致性与可复现性**证据，不构成模型验证、物理验证、
  实测或硬件验证；`model_provenance=analytical_demo`、`model_validation=not_performed`、
  `hardware_verification=not_performed` 不变；FC-001 维持 `extension_preview`（未升级）；
  GT-001 实现仍禁止（V3-31/V3-33 待开工）；Arena 维持扩展预览；单文件 `FaultLab.html` 不重建、
  不发布（P1-05 未批准）。批准人：用户（最终实施计划）；记录人：实现 Agent。
- `CHG-20261030-09`：**V0.3 收尾批（V3-31 oracle/golden + V3-33 GT-001 实现 + V3-02 上游勘误 +
  V3-03 性能阈值冻结）+ 入库**。用户 2026-10-30 指令「V3-31/V3-33 开工指令以及 V0.3 收尾项」。
  ① **V3-31 完成**：`tools/oracle/gt001_oracle.py`（按 G2b v1.1 §8 冻结更新序逐算子独立实现；
  自检 GS-1…GS-6 全过——线性化能量恒等 2.6e-15、抗饱和钳位、通道差≡b 9.9e-15、锚点
  nadir 49.5894/f60 49.9922/49.7055）；`data/golden/gt001_v1.json`（5 Run 含 monitor 语义覆盖、
  method_id=gt001_euler_dt0.01、gate 增 f_Hz_atol/n_rpm_atol=1e-9、approval 三字段）；
  `verify_golden.py` 参数化 gt001（exit 0；fl001/fc001 不受影响）。
  ② **V3-33 完成（§10 涟漪 20 项对照）**：信号目录（r_meas_kW→f_channel_diff_Hz，DERIVED 显式
  exposure='blind_observable'；r_true 定义恒等注记；tagline L0b；assumptions A-gt-inertia-lin/
  A-gt-bat-rating/A-gt-antiwindup-clamp；limitations 条件 6 全清单+执行器死区；因果模板 n6/m4
  通道冗余叙事；bus inspector）；引擎（record/applyNoise 通道差）；checks（GT r_true 1e-9、
  conservation-meas GT=频率通道冗余一致性、新 gt-energy-consistency 含截断残差项 + gt-bat-envelope
  ±25 kW，仅新 Run）；metrics（max_abs_f_channel_diff_Hz 置换）；UI（causal/export GT 分支）；
  builtin-agents 零改动（155/155 复跑佐证）；新建 engine-gt.test.js **69/69**（5 Run 序列逐点
  ±1e-9/指标/事件/scope/GT PHY/哈希）；core.test 10080/0；**引擎↔oracle ±1e-9 一致——§8
  「逐算子复刻」定案成立，无需启用方法等价预案**。③ **V3-02 完成（O-10=a）**：
  `NEXT/V02_UPSTREAM_ERRATA.md` v1（V0.1 四条+V0.2 三条勘误+引用规则；INPUT 冻结不动）——
  DECISIONS §6 上游修订未完成项关闭。④ **V3-03 完成（O-11=a）**：e2e/run-g2 报告增 duration_ms、
  `tools/perf.mjs` 门禁步；实测 7372/7556/7454 ms → **冻结阈值 E2E 主旅程 ≤15000 ms**；
  内存/帧率无稳定载体不虚设；G5 F-5 关闭。⑤ 验证：**run-g2 21/21**（20→21 步；duration 13846 ms）、
  copy-guard 0、qa shots 全页渲染无错（GT 信号页复核）。偏差 D-20…D-23 登记
  （`evidence/g7/v03-closeout.md`）。CONTRACT §5.3 头注更新为 G2b 批准状态（实现完成前仍扩展预览）。
  ⑥ 入库随批提交推送。**V0.3 剩余待批**：FL-19 增量三（HTTP 桥+UI 入口）、GT UI 正式化增补
  （W-11+四禁词登记 D-23）、G8 发布 v0.3.0。批准人：用户（开工指令）；记录人：实现 Agent。
- `CHG-20261030-11`：**下一版本队列三线实现（用户「批准」三队列：FMU 路线 Q-5 / GT load_step·
  actuator golden 扩展轮 §9 定案 / 评测轨对外评测场次）**。① **GT 扩展轮**：`fault.t_clear_s`
  （清除时刻，可选参数：校验器网格/范围校验、GT 钳位释放门 record/子步双处、createConfig 保留
  扩展键）；oracle 镜像 + RUNS 增第 6 Run `actuator_clear`（t_clear=35 s）+ GS-7 清除恢复锚点
  （**过冲 +0.213 Hz、回 |Δf|≤0.05 @ 36.1 s = t_clear+1.1 s，与物理评审 F-04 推算 +0.21 精确
  印证**）；golden 重发（6 Run）+ EV-002 清除事件（oracle/engine 双侧，buildSnapshots 多事件
  循环化）；engine-gt 增清除断言（90/90）；规格 §9 追记定案数字。② **评测轨首场次**：
  `tools/arena2-session.mjs`（盲包→builtin Agent 盲测→提交→scoreV2 落章全链路；修复
  buildRevealV2 键名 testsetId→testset_id 笔误——AE-E12 排查记录）；首场次归档
  `evidence/g8/eval-session-001/`（bundle/reveal/3 参赛提交/score-report；
  builtin/sensor-limit 46 分、residual 99.2、cusum 98.8——合成游戏分，非真实诊断性能）。
  ③ **FMU 准入层（Q-5 落地）**：`tools/backend/py/fmu_admission.py`（A-1 zip 结构/A-2
  model_manifest 字段面/A-3 禁占 FL-001 身份/黑盒预览降级；自检 FS-1…3 全过）；真实 FMI 二进制
  执行（ctypes doStep）**待实际 FMU 样本**（D-27，不虚设）。④ 验证：run-g2 **24/24**（增 fmu-admission
  步）。⑤ 入库随批提交推送。批准人：用户（三队列批准指令）；记录人：实现 Agent。

**效力声明**：
1. 本文件自 2026-10-27T20:35 起具有实现约束力；任何实现不得反向定义本文件。
2. 本文件不构成对 V0.1/V0.2 上游原文的事实更正；上游原文修订由后续任务落地（见 §6 未完成项）。
3. 所有"已验证/已通过"表述均不适用于物理模型有效性；物理验收口径见 `NEXT/MODEL_VALIDATION_SPEC.md`。

**文件结束**。批准版生成于 2026-10-27T20:35+08:00，基线哈希见 `SPEC_v0.2_APPROVED.md`。

- `CHG-20261030-12`：**V3-04 FC-001 升正式验收（O-09 已裁定升）**。用户 2026-10-31 指令「V0.3 规划中的 V3-04」。
  ① `model_version` 由 `fc.pem.l0/1.0.0` 升版至 **`fc.pem.l0/1.1.0`**（正式验收身份，minor 升版：
  修复清单闭环 + 假设增补 + UI 标注均已在 G2b-lite/增量一闭环，无新物理）。② golden 重建：
  `data/golden/fc001_v1.json` 由 oracle `--emit` 重出（`method_version` 升 `analytic_flux.2`，
  model_version 同步 1.1.0；approval 三字段重签）。③ UI scope 标签由 `extension_preview` 升
  **`approved_fc`**（SA-24 白名单**仍不含 FC-001**——其验收口径独立成表，engine-gt 式逐点对 golden）；
  对比白名单维持仅 FL-001。④ `store.addBackendRun` 的 scope 逻辑不变（backend Run 强制
  extension_preview 与本条无交集——FC-001 是 JS 引擎内实现，非后端适配器）。⑤ 验证：
  `tests/engine-fc.test.js` 对新 golden 全绿（109 断言）、`verify_golden.py fc001` exit 0、
  `run-g2.mjs` 24/24 不回退。⑥ 入库随批提交推送。批准人：用户（V3-04 开工指令）；记录人：实现 Agent。

- `CHG-20261031-01`：**v0.4.0 发布规划批准（六工作项授权）**。用户 2026-10-31 指令「批准」。
  批准 `NEXT/V04_RELEASE_PLAN.md` v1 的六工作项（W-1 GT UI 深化 / W-2 FC UI 升正式 / W-3 FMU
  ctypes runner / W-4 评测轨场次扩容 / W-5 对比页后端面板深化 / W-6 文档发布同步）与门禁结构
  （G7 → G8 v0.4.0）。**明确不做**：FC 的 load_step/actuator 扩展（各自 G2b 未启动）、L1 数值
  模型（Q-4）、服务端/云/排行榜（永久）、B-2/B-3 依赖 import（许可证待核实）。
  批准人：用户；记录人：实现 Agent。

- `CHG-20261031-02`：**v0.4.0 发布（G8 关闭）**。用户 2026-10-31 指令「批准」（V04_RELEASE_PLAN.md
  六工作项全部授权）。交付：W-1 GT UI 三档标注 / W-2 FC UI 升正式标注（scope=approved_fc）/
  W-3 FMU ctypes runner 骨架（D-28：doStep 待实际 FMU 验证）/ W-4 评测轨 --agents all +
  接入指南 / W-5 对比页后端面板深化（run picker 后端标签 + incomparable 引导）/
  W-6 版本号 V0.4.0 三处同步。验证：**run-g2 25/25**（含 perf 步、E2E 40 断言）、copy-guard
  33 模式 exit 0、全测试套件 16 文件全绿。发布证据 `evidence/g7/v04-g7-evidence.md`（G7）+
  `evidence/g8/v040-release.md`（G8）。批准人：用户；记录人：实现 Agent。

- `CHG-20261031-03`：**GT-001 UI 正式化增补轮（W-11 解除）+ V0.5.0 发布规划**。用户 2026-10-31 指令
  「GT-001 UI 正式化增补轮（W-11 四禁词入正式 UI 文案）；V0.5.0 规划」。
  ① **GT UI 正式化**：GT `level` 升 `'L0b · 单机等效频率响应示意（G2b 已批准）'`、`summary` 增
  G2b 批准声明（"单机等效频率响应示意（L0b），非机组/电网动态验证"）——v0.4.0 的 W-11 过渡态解除。
  ② **V0.5.0 规划**：`NEXT/V05_RELEASE_PLAN.md` v1——FC-001 首次正式展示（F-1…3）/ L1 可行性 RFC
  （L-1，Q-4 守卫下）/ 评测轨深化（S-1…3）/ FMU 路线推进（M-1/M-2）/ GT UI 收尾（T-1/T-2）。
  批准人：用户；记录人：实现 Agent。

- `CHG-20261031-04`：**v0.5.0 发布（G8 关闭）**。用户 2026-10-31 指令（全队列执行）。
  交付：T-1/T-2 GT-001 UI 正式化收尾（level=L0b 已批 + inspector 走查 ✓）、F-1…F-3 FC-001
  首次正式展示（scope=approved_fc、compare/export round-trip）、S-1 多场次并行（--sessions N）、
  S-2 评测轨接入指南（EVAL_TRACK_GUIDE.md）、S-3 rank 排序（scoreV2 avg_score 内建）、
  L-1 L1 可行性 RFC（GT 非线性首选 M / PyBaMM 需 G2b XL / 热模型需 G2b XL）、
  M-1/M-2 FMU 路线状态声明（D-27/D-28：准入层已交付，ctypes doStep 待样本）。验证：
  **run-g2 24/24**（duration 17673 ms）、copy-guard 33 模式 0、全测试套件 16 文件全绿。
  发布证据 `evidence/g8/v050-release.md`。批准人：用户（全队列执行指令）；记录人：实现 Agent。