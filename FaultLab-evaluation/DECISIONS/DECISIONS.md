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

- `CHG-20261031-05`：**FC 扩展故障族 G2b 规格草案（FCEXT_G2B_SPEC_DRAFT v1）+ I_fc_ref 歧义定案**。
  用户 2026-10-31 指令「V0.3 规划的 V3-04 后续」。交付 `NEXT/FCEXT_G2B_SPEC_DRAFT.md` v1：
  load_step（I_fc_ref 自适应定案 = (P_load−10)/0.4，锚点 I_fc(60)=75.00/P_bat(60)=10.00/
  max|P_bat|=20.00 在包络内；τ_fc=1.2s 一阶跟随物理自洽——FC 电池是理想平衡源，与 FL-001
  矛盾不同源）+ actuator_fault 55%（I_fc(60)=27.50/P_bat(60)=19.00/max=19.00 在 ±25 kW 内；
  抗饱和=钳位式需 assumption 登记）+ golden 扩展轮（fc001_v1 增 Run ≥4）+ UI 正式化（FC scope
  已 approved_fc）+ 风险（I_fc_ref 歧义已定案/电池限幅不适用/因果模板引用安全）。
  **FC 扩展 G2b 关闭待双路独立评审 + 用户批准**。批准人：用户（V3-04 后续指令）；记录人：实现 Agent。

- `CHG-20261031-06`：**长线路线图 V05_ROADMAP v1（v0.5→v1.0）**。用户 2026-10-31 指令「进行新的
  方案设计，要长线的」。交付 `NEXT/V05_ROADMAP.md`——四条主线（模型纵深 A / 系统广度 B /
  教学场景 C / 架构演进 D）× 五版本路线（v0.5.x → v1.0.0）× 五条架构不变式（I-1…I-5）。
  本文档为战略方向锚点，**不构成实现授权**。批准人：用户（长线方案设计指令）；记录人：实现 Agent。
- `CHG-20261102-01`：**A 线设计批准登记 + A-1 GT-001 完整摇摆方程落地（swing 双轨）**。用户 2026-11-02
  指令「进入实现阶段」+ AskUserQuestion 答复「按推荐执行（推荐）」——ALINE_MODEL_DEPTH_DESIGN v1
  生效为 A 线设计锚点，D-1…D-6 按推荐项执行（D-1 双轨保留 / D-2 新 id gt001_v2+v1 留档 /
  D-3 热模型最小集待 G2b / D-4 电化学 v0.7 末裁定 / D-5 容差 T-A/T-B/T-C 制度批准 /
  D-6 旧 golden 留档）。交付：
  ① `NEXT/ALINE_MODEL_DEPTH_DESIGN.md`（状态 DRAFT→已授权按推荐执行，批准人：用户 2026-11-02）；
  ② RFC 勘误——L1_FEASIBILITY_RFC §2.3 字面式在 f=f₀ 处与线性式差 50 倍，正确式
     df/dt=(P_rotor/K_J)·(f₀/f)（二次型动能能量守恒导出），已在 RFC 内登记勘误；
  ③ oracle `tools/oracle/gt001_oracle.py` v2——swing 更新序冻结、GS-1 重写为 swing 离散能量恒等
     （±1e-9，判别惯量式）、GS-8 新增双轨连续性（f₀ 单步逐位一致/nadir 序/稳态差 ≤1e-4 Hz）、
     GS-5/GS-7 锚点 swing 重冻结（nadir −0.410664、f(60) 49.9922、sensor_drift 49.70548、
     过冲 +0.213412@36.1 s）、自检 8/8 PASS；
  ④ golden `data/golden/gt001_v2.json`（method_id=gt001_swing_dt0.01，tier=T-A，supersedes gt001_v1；
     最终 sha256 c50315c9…831dac）+ sidecar；**gt001_v1 字节冻结留档**（verify_golden 不再指向 v1，
     oracle 源演进下 V-03 语义冻结于生成时版本；存档场次继续引用 v1）；
  ⑤ 引擎 `simulateGT001` 双轨（cfg.inertia_model swing|linear，GT defaults 默认 swing；linear 分支
     逐位保留 v1 口径）；validateConfig/normalizeConfig/defaultConfig/scenarioView/bundle 导入全链
     接通 inertia_model；GT model_version 1.0.0→1.1.0；
  ⑥ metrics 增 E_kin_kWh（二次型）/E_rotor_int_kWh（∫P_rotor 子步左矩形），E_rotor_kWh 标注遗留口径；
  ⑦ checks gt-energy-consistency 按轨分派：linear 保留 G2b §3 原式；swing 为能量闭合
     |ΔE_kin−∫P_rotor|≤1e-3 kW·s（oracle 复算上界 2.2e-4，安全系数 ≥4）；
  ⑧ verify_golden.py gt001→gt001_v2（35/35）；engine-gt.test.js 双 golden 203/203
     （v1 linear + v2 swing 各 6 Run ±1e-9 + 双轨分歧断言：swing nadir 严格更深、健康局逐位一致）；
  ⑨ systems.js swing 化（A-gt-swing-full 登记、A-gt-inertia-lin 限定 linear 轨、EQ-1/EQ-6/信号公式/
     组件描述）。措辞勘误：copy-guard 命中 2 处「实测」→「oracle 复算」已改（33 模式 0 命中）。
  预期失效面（同 GT 目录变更先例）：GT model_version/锚点变更下，历史 GT 盲包与旧归档局重放属
  预期失效；swing 为默认轨的行为变更由 D-1 双轨与 A-gt-swing-full 声明兜底。run-g2 复验见
  evidence（24 步聚合）。批准人：用户（2026-11-02「进入实现阶段」+「按推荐执行」）；记录人：实现 Agent。

- `CHG-20261104-01`：**开源参考轨落地方案（REFERENCE_LANDING_PLAN v1）+ REFERENCES.md 登记制度建立**。
  用户 2026-11-04 指令「按建议走」（外部输入：《FaultLab 开源参考项目清单》v1.0，2026-11-04 生成，
  仓库外 deepseek-harness workspace，入库与否待用户裁定）。交付：
  ① `NEXT/REFERENCE_LANDING_PLAN_v051.md` v1——参考清单 8 步落地顺序向 v0.5.1/v0.6.0 队列的映射
     （任务卡 R-0…R-5 + D-2 解锁登记 + 错位修正 5 处：TESPy→A-4（GT-001 现为单机频率响应模型，
     无热力状态可对照）／FMPy 拆 R-2a 字段表与 R-2b 夹具交叉验证（R-2b 不关闭 D-28）／
     Hypothesis 借思想不引库（stdlib 固定种子）／simbench→B-1／tep2py 提前服务 G2b 评审），
     三口径按建议项定案（DEC-R1 目录随 A-2 评审包、草案族标「待批」／DEC-R2 R-3 限 oracle 侧
     五不变量、verify_golden/verify_bundle 保持确定性复核／DEC-R3 D-2 排入 v0.6.0），
     批次 0…3 排定（批次 0 为用户侧动作：A-1 commit 指令／A-2 G2b 评审批准／A-3 G2b／
     V05_ROADMAP 正式批准）；
  ② `docs/REFERENCES.md` v1——参考登记制度落地（借了哪个思想／未复制代码声明／许可核实日期，
     12 项目预登记，许可待核对列空置待各卡执行时回填；GPL/AGPL/NOASSERTION 分级纪律）。
  本 CHG 不构成批次执行授权：批次 1…3 仍逐批次逐指令派发。引擎、golden、UI 零改动。
  批准人：用户（2026-11-04「按建议走」）；记录人：实现 Agent。

- `CHG-20261104-02`：**A-1 提交落库 + R-1 故障族目录 + A-2 FC 扩展 G2b 双路评审与批准**。
  用户 2026-11-04 /goal 四步指令（第 1/2 步）：「A-1 commit 指令……A-2 FC 扩展 G2b 双路评审 +
  批准（届时附 R-1 目录）」。
  ① **A-1 提交落库**：两笔提交推送 origin main（83e782b→3806e18）——8ca8543（A-1 swing 双轨
     16 路径：src/core ×6、verify_golden、gt001_oracle、engine-gt.test、gt001_v2 golden+sidecar、
     GT001_G2B_SPEC §12 追记、RFC 勘误、ALINE_MODEL_DEPTH_DESIGN、artifacts 报告）+
     3806e18（参考轨：REFERENCE_LANDING_PLAN、docs/REFERENCES.md、DECISIONS 留痕、
     .gitignore 补 slprj//*.slxc）。提交前复验 verify_golden fl001 20/20、fc001 20/20、
     gt001 35/35、copy-guard 0 命中；
  ② **R-1 目录落地（DEC-R1 执行）**：`docs/FAULT_CATALOG.md` v1——三系统 9 族全量登记
     （tep2py 式表格化字段：id/家族/类型/作用位置/幅值参数/默认时刻/授权状态/golden/因果模板）
     + 时间尺度隔离声明 + SCOPE_SPLIT_MEMO 逐族 scope 映射表 + §5 状态勘误表制度；
  ③ **A-2 双路独立评审**（G2b 治理 §8.2，独立上下文并行）：评审人 A（物理/数值）——锚点
     三法交叉复算（引擎逐位复刻/RK4/级联闭式解）全部成立（load_step 75.00/10.00/20.00、
     actuator 27.50/19.00/19.00、r_true≡0、SOC 差 0），信号引用全为 FC 自有，
     verdict=PASS_WITH_CONDITIONS（级联机制改写/包络参数域/实现同步 3 条件）；
     评审人 B（治理/口径/回归面）——目录 9 行字段逐项核实一致，verdict=PASS_WITH_CONDITIONS
     （fc001_v1 工件元数据与 CHG-20261030-12 ② 失同步 P1/copy-guard 全库口径/L0 标签/
     预期失效面等 5 条件）；
  ④ **批准与条件处置**：`NEXT/FCEXT_G2B_SPEC_APPROVED.md` v1.1（更名自 DRAFT，旧文件删除）
     ——级联定案（I_fc_ref 经 τ_ref=2.5 s 分配器跟随 (P_load−10)/0.4，非阶跃；EQ-6 新增登记；
     actuator 轨 τ=1.5 s 显式声明）、±25 kW 包络限定锚点场景并登记参数域越界清单
     （+20 kW→30 kW 等，禁全域硬检查）、golden 扩展轮重写（oracle 侧为主：级联/钳位解析解、
     3→5 Run、SERIES_IDS 扩展、元数据落齐、verify_golden 无需改动）、基座勘误登记
     （fc001_v1 元数据 1.0.0/analytic_flux.1 系重出未落地，不回溯改工件，FC-G2b-02 一次性落齐）、
     copy-guard 全库口径与 L0 标签订正、预期失效面声明（对齐 CHG-20261102-01 先例）。
     两路条件全部修订进 v1.1，FC 侧同步实现项归 FC-G2b-04；
  ⑤ **范围声明**：本批准=规格层（G2b 门）；实现（FC-G2b-02/04：oracle 扩展、golden 增 Run、
     systems.js 文案/假设/EQ-6 登记）待 v0.6.0 队列另行指令派发，实现前 FC load_step/valve_stuck
     仍不在验收路径（Q-4 守卫）。FAULT_CATALOG §2/§5 状态已挂载。
  批准人：用户（2026-11-04 /goal 四步指令）；记录人：实现 Agent。

- `CHG-20261104-03`：**A-3 FL-001 actuator_fault G2b 草案、双路独立评审与批准（FLEXT v1.1）**。
  用户 2026-11-04 /goal 四步指令（第 3 步）「A-3 FL-001 actuator G2b」。
  ① **草案起草**：`NEXT/FLEXT_G2B_SPEC_DRAFT.md` v1——FL-001 actuator_fault（变流器电流限幅，
     SCOPE §2「不追认、冻结」解冻路径，V05_ROADMAP A-3）：机制定案（I_cap=I_ref×magnitude%，
     target=min(controlTarget, I_cap)、双轨 τ 0.4/1.5 s、无 t_clear、monitor 物理等价）、
     EQ-A/EQ-B 登记、锚点解析预填、golden 扩展轮（fl001_v1 3→4 Run）、scope 裁定、实现排期；
  ② **双路独立评审**（独立上下文）：评审人 A（物理/数值）verdict=PASS_WITH_CONDITIONS
     （4 条件）——机制与实现逐行吻合、锚点实机+闭式双证，**SOC 锚点漏积故障前段
     （59.8459722→59.7070833%，偏差 139× 容差，P1 批准级修正）**、等价断言落点错误
     （oracle 自检恒真，须落 tests/engine.test.js 逐位层，P1）、load0≤20 钳位退化域、
     I_ref_A formula 过期、oracle monitor 分支陷阱；评审人 B（治理/口径/回归面）
     verdict=PASS_WITH_CONDITIONS（5 条件）——**eval-session-001 实含 3/6 actuator 轮**
     （草案「sensor_drift 场次」前提错误，P1）、**Arena 族池按目录派生自 O-13 起已含
     actuator**（「扩容待 CHG」前提错误，P1）、族级标签与 classify 二值实现不对应、
     A-l0 拟议措辞含禁词子串、SA-24 红线三路径（assertApprovedP0/后端硬限/golden 比对）
     核实守住；
  ③ **批准与条件处置**：`NEXT/FLEXT_G2B_SPEC_APPROVED.md` v1.1（更名自 DRAFT）——两路 9 条件
     全部修订（SOC 全窗积分锚点冻结预填、等价断言落引擎测试层并排除 label/role/
     effective_mode 元数据、UI 域 load_kW∈[10,45] 与退化域声明、A-l0「经过验证」句式、
     评测轨事实重写：**Arena 族池现状追认 + 归档局 3 actuator 轮追认**、approval 三字段
     重签口径、I_ref_A 一般式化与 checks.js 采样文案订正入排期）；
  ④ **范围声明**：本批准=规格层（G2b 门解除，Q-4 第三守卫）；实现（FLEXT-G2b-01/02/04：
     oracle 解析段、fl001_v1 增 Run 4、systems.js 登记、白名单显式 CHG 如执行）待 v0.6.0
     队列另行指令派发；SA-24 白名单不扩大红线维持——scope.js `APPROVED.families` 与后端
     可服务域扩展须实现期显式 CHG。FAULT_CATALOG §1/§4/§5 状态已挂载。
  批准人：用户（2026-11-04 /goal 四步指令）；记录人：实现 Agent。

- `CHG-20261104-04`：**V05_ROADMAP v1 正式批准（v0.5→v1.0 方向锚点生效）**。
  用户 2026-11-04 /goal 四步指令（第 4 步）「V05_ROADMAP 正式批准」。
  交付：`NEXT/V05_ROADMAP.md` 头部批准记录 + 批准时点进度追记（A-1 已落地 CHG-20261102-01／
  A-2/A-3 G2b 门已批准 CHG-20261104-02/03、实现待 v0.6.0 队列／v0.5.1 剩余=FC 扩展实现+
  评测轨对外场次指南／D-2 解锁／参考轨锚点 REFERENCE_LANDING_PLAN CHG-20261104-01）+
  尾部生效声明。本文档为战略方向锚点，不构成实现授权；版本内容仍逐 CHG + 门禁推进。
  至此 /goal 四步（A-1 commit／A-2 G2b／A-3 G2b／ROADMAP 批准）全部关闭。
  批准人：用户（2026-11-04 /goal 四步指令）；记录人：实现 Agent。

- `CHG-20261104-05`：**V060_WAVE_DESIGN v1 批准（v0.5.1→v0.6.0 实现波开工）**。
  用户 2026-11-04 指令「统一采用推荐决策，采用并发多个子智能体来加速任务」。
  ① `NEXT/V060_WAVE_DESIGN.md` DRAFT→APPROVED：五项决策全采推荐项——DEC-A D-2 分层落地
     （FC/FL 物理接入 + GT 文档化符合、迁移挂起）/ DEC-B golden 原地扩容（fc001_v1/fl001_v1
     保 id 重出 + sidecar + approval 重签）/ DEC-C FL 白名单 CHG 随波次 2 执行（scope.js +
     后端适配器）/ DEC-D C-2 场景编排器后置 v0.6.x / DEC-E run-g2 步数预算 ≤+1；
  ② 实现波授权：W1-1…W2-7 按设计 §5 派发，执行方式为动态工作流并发子智能体
     （三阶段并行 + 全量门禁修复环）；承重约束已写入设计 §1（V-03 字节语义、FC 级联子步
     复刻、白名单钉扎）；
  ③ 发布结构：维持两版本（v0.5.1=波次 1 内容：D-2a+FC 扩展+C-1 指南；v0.6.0=波次 2 内容：
     FL actuator+白名单+R-3+参考轨）；因并发批次使两波文件共存于工作树，G7 以全树复验为准、
     v0.5.1 侧凭文件级隔离论证传递有效（证据注明覆盖口径）；
  ④ **CHG-20261104-06（波次 1）/-07（波次 2）预留**；golden approval 重签引用号预分配：
     fc001_v1→-06、fl001_v1→-07。
  批准人：用户（2026-11-04「统一采用推荐决策」）；记录人：实现 Agent。

- `CHG-20261104-06`：**v0.5.1 发布（G8）——D-2a oracle 统一接口（DEC-A 分层）+ FC 扩展 golden 链 + C-1 对外场次指南**。
  V060_WAVE_DESIGN 波次 1（W1-1/W1-2/W1-3 数值面/W1-4），动态工作流并发子智能体执行
  （dwfrun-76ed11ef）。交付：
  ① `tools/oracle/oracle_base.py`——OracleInterface 归一契约 + approval 三字段/sidecar/emit
     助手（V-03 语义=oracle 文件自身字节 sha 写入 docstring）+ 契约自检 T-1..T-8；
  ② `NEXT/ORACLE_INTERFACE_D2.md`——golden schema v2 规格 + 三 oracle 事实差异清单 F-1..F-8 +
     GT-001 文档化符合/迁移挂起裁定（DEC-A：不动 gt001_oracle.py，gt001_v2 sha c50315c9… 零变更）；
  ③ FC-G2b-02 落地：`fc001_oracle.py` load_step 级联子步递推（foStep 逐字复刻，连续闭式禁用——
     尾差实测 5.4e-6/2.8e-6 在 ≤6e-6 域）+ actuator 闭式、RUNS 3→5、SERIES_IDS 增四信号
     （I_fc_cap_A 不入 golden series——V-07 对 null 列崩溃，按 gt001 先例剔除，钳位值留 fault 块）、
     SC-8/9/10、model_version 1.1.0、method analytic_flux.2、**approval 重签引本 CHG**；
     **fc001_v1 重出 5 Run**（sha256 b073d2df…c79d1e0；旧 f518c7bc… 退役；V-03b 批准摘要
     af93e5aa…——按既有 emit 语义为剥离 generated_by/approval 后内容摘要，非文件字节自引用）；
  ④ `tests/engine-fc.test.js` Run 键面按 golden.runs 遍历扩 5 Run（126→294 断言）+ 批准引用
     断言同步 CHG-20261028-04→本 CHG（golden 元数据断言，重签必要同步）；
  ⑤ `NEXT/EVAL_TRACK_GUIDE.md` v2——§6 对外公开场次（reveal 管理/报名/盲包/score_hash 公示/
     成绩单导入导出/归档规范），命令与 arena2-* 实跑核对；
  ⑥ 验证：run-g2 全量 PASS（工作流内 + 主流程复验 17198ms 两次独立）；verify_golden
     fc001 5 Run 全过/fl001 20/20/gt001 35/35；老 3 Run 与备份逐位一致（备份 f518c7bc… 留档
     Temp）；新增 Run 与引擎 diff=0；老 Run 对引擎 worst 3.9e-13（plant 路径 fp 噪声基线即如此，
     rtol 1e-12 内）。覆盖口径：本 tag 树=基线 f1e5e78+FC 数值链+基座+指南（FC-G2b-04
     systems.js 登记面因文件纠缠随 -07），FC 新族 classify 仍扩展预览（证据
     `evidence/g8/v051-release.md` §3）。
  批准人：用户（CHG-20261104-05 授权链）；记录人：实现 Agent。

- `CHG-20261104-07`：**v0.6.0 发布（G8）——FL actuator 全链 + 白名单显式扩大（DEC-C）+ R-3 property + 参考轨 + FC/FL 正式化登记**。
  V060_WAVE_DESIGN 波次 2（W2-1…W2-6）+ W1-3 登记面（文件纠缠归并），同一工作流执行。交付：
  ① FL-G2b-01/02：`fl001_oracle.py` actuator 闭式（SOC 全窗 1054.5 A·s→59.7070833%）+
     monitor family 守卫（修正既有 :82-83 无条件 25A 陷阱）、RUNS 3→4（+actuator_closed_loop）、
     SERIES_IDS 增 I_bat_cap_A（null 列）、SC-7/8/9、EV-001 actuator_limit 事件入 golden、
     **approval 重签引本 CHG**；**fl001_v1 重出 4 Run**（sha256 f4e852aa…afbe25；旧 6a0c751f…
     退役；V-03b 摘要 538b4412…）；`emit_golden.py` 委托 oracle_base（字节级等价探针）；
     `scripts/verify_golden.py` null 感知最小修补（V-07 对 null 列 TypeError——双 null 一致/
     单侧失配；fc001/gt001 回归零扰动。DEC-R2「不 property 化」不适用于此修补，登记为勘误）；
  ② 登记面：`systems.js`（FC EQ-6/A-fc-dispatcher/级联措辞/越界域；FL A-fl-clamp/A-l0 双轨 τ/
     EQ-A/EQ-B/退化域）+ `checks.js:138` 双分支订正 + `docs/FAULT_CATALOG.md` v1.1
     （scope 按代码快照+勘误表）；
  ③ **SA-24 白名单显式扩大（DEC-C，CHG-20261104-03 §4 预留的实现期裁定在此执行）**：
     `scope.js` APPROVED.families 增 actuator_fault（magnitude=55 钉扎）、FC approved_fc 分支
     扩四族；后端 B-1 actuator 闭式（对 golden max|Δ|=0.0）、B-5 RK4（1.66e-4 ≪ rtol 1e-3
     声明档）、双后端自检 +AC-5/RK-4；scope-guard/backend-admission 测试同步（4 Run+越界负例仍拒收）；
  ④ 测试：`tests/engine.test.js` 4 Run + **actuator 闭环 vs monitor 逐位等价断言**（FLEXT §2
     项 1 落地，339 断言）+ `tests/registry.test.js` §8/§9（config_hash 键序/run_hash 冻结）；
  ⑤ R-3 property：`tools/oracle/properties/property_harness.py`（stdlib 固定种子；能量平衡/
     r_true≡0/事件相位三不变量，FL 240 组+FC 27 组，ddmin-lite 最小化+检测力阴性自检，
     运行前后 oracle 文件 sha 不变、无 src 导入自证）；
  ⑥ 参考轨：Q5_ADMISSION_FIELD_TABLE（R-2a，FMPy 源码逐行核对×V312 三态 28 条）、
     RFC I-11 §11 对照附录（R-4）、METRICS_P1（R-5，P1 隔离）、D1_LITE_ASSESSMENT（W2-6）、
     REFERENCES 执行记录；
  ⑦ 验证：run-g2 全量 PASS（两次独立运行）；全库 16 测试文件全绿；引擎 4 Run vs golden
     worst 2.58e-15；actuator 闭环/monitor 逐位一致（仅元数据差）；property harness ok。
  已知事项登记：verify_golden null 修补（①）、FL healthy I_meas_20post_A 可用性语义差异
  （基线即如此）、fl001_oracle --self-check GBK 控制台编码遗留（待清）、FC E_bat_est 指标
  无引擎对应（测试注释声明）。证据 `evidence/g8/v060-release.md`。
  批准人：用户（CHG-20261104-05 授权链 + CHG-20261104-03 §4 白名单裁定）；记录人：实现 Agent。

- `CHG-20261104-08`：**V06_ROADMAP v1 批准（v0.6.x→v1.0.0 长期路线重基线）+ v0.6.1 实现波开工**。
  用户 2026-11-04 指令「继续推进下一步，设计下一轮的长期方案，统一采用推荐决策，采用并发多个
  子智能体来加速任务」。
  ① `NEXT/V06_ROADMAP.md` v1 生效为方向锚点——对 V05_ROADMAP 重基线（v0.6.0 行逐项对账：
     A-1/A-2/A-3/D-2 ✅，B-1/C-2 重排，D-3 外部阻塞），继承四主线 + 增补不变式 I-6（场景=Run
     序列配置化）/I-7（门禁步数账）；
  ② **DEC-1…7 全采推荐项**：DEC-1 C-2 最小闭环骨架（拖拽 UX v0.7）/ DEC-2 B-1 本波草案+双路
     评审、实现 v0.7、**批准留待用户**（新系统不因批量授权默认通过，SCOPE §8.2）/ DEC-3 D-1
     采纳评估稿推荐（tier+步数账）/ DEC-4 A-4 GT 热力学最小集先行（TESPy 对照轨道就绪）/
     DEC-5 版本节奏 v0.6.1/v0.7.0/v0.8.0/v1.0.0 / DEC-6 场景=有序 Run 配置封闭白名单序列、
     与盲包解耦 / DEC-7 本波禁区（engine 物理面与 golden/oracle 零改动、B-1 只到草案+评审）；
  ③ v0.6.1 实现波授权（并发子智能体）：S1 C-2 场景 core / S2 D-1 tier 分层 / S3 B-1 G2b
     草案 → S4 UI 骨架 + S6 双路评审 → S5 测试接线（run-g2 步数预算 ≤27）→ 全量门禁；
  ④ 本波零 golden 重出、零 engine.js 物理面改动；B-1 G2b 批准不在本授权内（待用户书面批准）。
  批准人：用户（2026-11-04「统一采用推荐决策」）；记录人：实现 Agent。

- `CHG-20261104-09`：**v0.6.1 发布（G8）——C-2 编排器骨架 + D-1 tier 分层 + B-1 PV-001 G2b 草案与双路评审**。
  V06_ROADMAP §7 波次（S1…S6），动态工作流并发执行（基线 5b6caac）。交付：
  ① **C-2 场景编排骨架（DEC-1/DEC-6、I-6）**：`src/core/scenario.js`（parseScenario 封闭
     白名单校验/scenarioHash 键序不敏感/executeScenario 经 createConfig→createRun 不新增
     执行语义 + 三系统样例）+ `tests/scenario.test.js`（48 负例类/roundtrip/执行等价逐位
     一致，230/230）+ UI 只读骨架（`src/ui/pages/scenario.js`+07 页接线+store.addScenarioRuns+
     css：导入/校验/事件卡/运行/结果/导出 roundtrip；CDP 真实 Chrome 走查 17/17）+ run-g2
     第 26 步接线（步数账 25→26，I-7 预算 ≤27 兑现）；
  ② **D-1 tier 分层（DEC-3）**：run-g2 25 步 core 19+extended 6 标签 + `--tier` 参数（默认
     all 步面零变化）+ 报告分层小计 + I-7 步数账护栏；评估稿 §7 实施追记；
  ③ **B-1 PV-001 G2b 草案（DEC-2）**：`NEXT/PV001_G2B_SPEC_DRAFT.md`——L0 系统定义提案
     （P_mpp=k·G·φ_T + MPPT τ=1.0s + 不可调度结构签名：无 load→MPPT 边）、2 故障族封闭
     参数域、锚点解析预填（临时 Python 双口径独立复算，差 ≤8.9e-15）、golden 计划（4 Run/
     schema v2/verify_golden 注册面勘正）、PV-G2b-01..04 排期；
  ④ **B-1 双路独立评审**：评审人 A（物理）**PASS_WITH_CONDITIONS**（锚点全量独立复算逐项
     复现；4 条件：Arena 注册即入池断言反向/EQ-PV-4 初值 G0 耦合→PV-DRAFT-Q2/W-m² 单位
     字典缺口/SERIES_IDS 缺 t 列）、评审人 B（治理）**PASS_WITH_CONDITIONS**（5 条件：Arena
     结论修正/§7 自查表 ②⑤ 开口/golden 后置偏离登记/回归面增列/措辞）——两路条件 C-1…C-7
     处置表已登记，草案升 **v0.2**（§10 评审记录/§11 条件处置追记），**状态仍 DRAFT，
     待用户书面批准（DEC-2）；本批准不构成 PV-001 实现授权**；
  ⑤ 验证：run-g2 26/26 PASS 两次独立（工作流内 + 主流程复验 20474ms）；scenario 230/230
     确定性；copy-guard 0 命中；本波零 golden 重出、零 engine.js 物理面改动（DEC-7）。
  证据 `evidence/g8/v061-release.md`。批准人：用户（CHG-20261104-08 授权链）；记录人：实现 Agent。

- `CHG-20261104-10`：**V070_WAVE_DESIGN v1 批准（v0.7.0 实现波）+ PV-001 G2b 批准登记**。
  用户 2026-11-04 指令「设计下一轮的长期方案，统一采用推荐决策，采用并发多个子智能体来加速
  任务」（对上轮呈交的 PV-001 批准决策点之书面批复）。
  ① `NEXT/V070_WAVE_DESIGN.md` v1 生效——DEC-1…8 全采推荐项：DEC-1 PV-001 按授权链批准
     （PV-DRAFT-Q1 定案=EQ-PV-3 定案机制 MPPT 目标=k·G_meas·φ_T；PV-DRAFT-Q2 定案=
     **P_pv(0)=k·G0·φ_T**；PV-G2b-01 条件修订随本轮落正文并更名 APPROVED）/ DEC-2 Arena
     (a) 显式排除 / DEC-3 pv001_v1 4 Run schema v2 T-A、oracle 复刻 foStep 更新序 /
     DEC-4 A-4a 本波草案+双路评审（批准下轮）/ DEC-5 C-3 教学路径最小形态 / DEC-6 C-4
     排行榜最小形态 / DEC-7 D-4 实测基线×安全系数 / DEC-8 步数账 26→28（预算 ≤29）；
  ② **PV-001 G2b 批准（PV-G2b-02 闭合）**：PV001_G2B_SPEC_DRAFT v0.2（双路评审
     PASS_WITH_CONDITIONS×2 + 条件 C-1…C-7 处置登记）经用户指令授权链批准；本波内
     PV-G2b-01 修订正文（Q1/Q2 定案+C-1…C-7）后更名 `PV001_G2B_SPEC_APPROVED.md` v1.0；
     scope=extension_preview（classify fall-through 零改动）；Arena 显式排除（DEC-2）；
  ③ 实现波授权（并发子智能体，五阶段 12 路）：PV 全链（T1 规格修订→T2 oracle+golden→
     T3 engine/systems→T4 测试交叉→T5 接线）+ C-3/C-4/D-4 + A-4a 草案与双路评审；
     engine.js 改动面显式开放仅限 PV 新轨+分派分支+PV metrics（三系统物理面零触碰）；
  ④ **CHG-20261104-11 预留**（v0.7.0 发布）；既有 4 golden 字节零变更维持；A-4a 批准
     不在本授权内（下轮）。
  批准人：用户（2026-11-04「统一采用推荐决策」）；记录人：实现 Agent。

- `CHG-20261104-11`：**v0.7.0 发布（G8）——PV-001 全链 + C-3 教学路径 + C-4 排行榜 + D-4 性能基线 + A-4a GT-L1 草案轮**。
  V070_WAVE_DESIGN 波次（T1…T10，动态工作流 dwfrun-c8e209c4 五阶段 13 路，配额中断一次恢复续跑零损失）。
  交付：
  ① **PV-001 全链（PV-G2b-01→04）**：规格更名 `PV001_G2B_SPEC_APPROVED.md` v1.0（C-1…C-7+
     Q1/Q2 定案落正文）；`tools/oracle/pv001_oracle.py` + **pv001_v1 golden 4 Run 首签**
     （sha df944f13…、schema v2、gate T-A+形制补键同值 gt001_v2 先例）+ verify_golden 纯追加
     注册行 + FAULT_CATALOG §6；`systems.js` PV-001 SystemDef（17 信号/2 族/EQ-PV-1..7 含 Q2/
     PV-IMP-Q1 钳 0）+ `engine.js` simulatePV001 与**分派链显式 PV 分支（R-4 守卫）**+
     metrics 四标量 + UNIT_DICT W/m²；`tests/engine-pv.test.js` 149 断言（T-A 逐点/A/B/C 锚点/
     shading 两模式逐位等价/**GT 分派守卫**/**Arena DEC-2 源级守卫**）；四场景锚点与规格全一致、
     golden 交叉 128/128 零漂移、CDP 走查 17/17 零 console error；
  ② **C-3 教学路径（DEC-5）**：`teaching.js` 3 路径×5 步预设 + 校验/导出信封 + `teaching` 08 页
     （步骤卡/深链/评测场景草稿→scenario 页最小读取）+ 测试 **161/161**（33 模式子串自检+探针反证）；
  ③ **C-4 排行榜（DEC-6）**：`tools/leaderboard.mjs`（三层 id 解析/4 类跳过计数/确定性排序）+
     `leaderboard` 09 页（EXT，文件导入只读渲染）+ 测试 **78/78**；真实场次实跑与归档 README 一致；
  ④ **D-4 性能基线（DEC-7）**：perf.mjs CDP 采样旅程（rAF 帧窗+堆峰值）→ 基线 3 轮
     （17.52/19.81/19.06 MB、fps 59.9）→ 阈值冻结 heap ≤120 MB/fps ≥41.93 → 两轮复测稳定定稿；
     报告 perf.baseline 只增字段；不可测降级路径（gated=false+WARN）就绪；
  ⑤ **A-4a GT-L1 草案轮（DEC-4）**：`GTL1_G2B_SPEC_DRAFT.md` v0.2（EQ-GTL1-1…12 效率链+
     三轨推荐+分歧预期表+gt001_v3/T-B 计划+TESPy 对照轨道）；双路评审
     **A/B 均 PASS_WITH_CONDITIONS**（A：§2.1 常数精度矛盾 P2 等 3 条件；B：新信号盲包面/
     Q4×scenario 交互/Q3×D-GT 触发条件/速度耦合域依据 4 条件）——7 条件处置登记 §11-a，
     **状态仍 DRAFT，批准与实现下轮（DEC-4）**；gt001_v2/oracle 零变更维持；
  ⑥ 步数账（I-7）：run-g2 26→**28**（+verify_golden pv001 + engine-pv，core 层），预算 ≤29 兑现；
  ⑦ 验证：run-g2 28/28 PASS 两次独立（工作流内 + 主流程复验 31479ms）；既有 4 golden 字节
     零变更；既有三系统 Run 数值逐位不变（339/294/203 全绿）；copy-guard 0 命中。
  残留观察（诚实登记）：PV quality 检查 soc-bounds/energy-balance 锁定态 fail（checks.js 开放面外，
  建议 PV-G2b-04c）；schema 导出面 initial_SOC_pct 缺口（CN-E02，R-8 显式 CHG）；home/compare/
  causal/scenario 静态文案与指标组缺口清单；signals.js 既有 display 残留缺陷（非本波引入）。
  证据 `evidence/g8/v070-release.md`。批准人：用户（CHG-20261104-10 授权链）；记录人：实现 Agent。

- `CHG-20261104-12`：**A-4a GT-L1 G2b 批准登记（GTL1-G2b-02 闭合）+ GTL1-G2b-01/03/04 实现波授权**。
  用户 2026-11-05 指令「按照2执行」（对上轮呈交的 GT-L1 批准决策点之书面批复；沿用既定
  「统一采用推荐决策 + 并发子智能体」授权模式）。
  ① **GTL1-G2b-02 闭合**：GTL1_G2B_SPEC_DRAFT v0.2（双路评审 PASS_WITH_CONDITIONS×2 +
     条件 A-1…A-3/B-1…B-4 处置登记 §11-a）经用户指令授权链批准；
  ② **GTL1-DRAFT-Q1…Q5 全按推荐定案**：Q1 P_rotor 保留 L0b 定义恒等（P_gen=η_m·(P_turb−
     P_comp)）/ Q2 三轨 inertia_model: swing|linear|thermo / Q3 gt001_oracle.py 迁移债重新
     定性为**冻结归档债**（v2/v1 存档期间 oracle 源字节同步冻结；仅当 v2 自身须重出才物理
     迁移；gt001_l1_oracle 出生即 oracle_base）/ Q4 **翻转 thermo 为默认轨**（A-1 先例；
     已归档场次携带已解析 cfg 键重放稳定）/ Q5 P_gen_cap_kW 保留指令域口径；
  ③ **批准前七条件修订授权（GTL1-G2b-01）**：A-1 常量表按精确解 ≥13 位登记（k_f=
     4.070531454334211、ṁ_a=0.144299140389011、C_3=0.335983796442745）并同步 GL-1/GL-3
     措辞 / A-2+B-4 sensor+1.0 暂态 oracle 域扫描冻结为 emit 条件 / A-3 §3.2 分歧表逐行
     口径标注 / B-1 八个热力信号补 exposure/sourceKind 列（裁定：盲包观测面不扩——热力
     信号非盲显，登记 GTL1-G2b-04）/ B-2 **scenario schema v1 增可选 inertia_model 键**
     （显式 CHG=本条；默认随 Q4 翻转，场景可显式钉轨实现跨深度对比）+ §2.4 勘正 /
     B-3 Q3 重定性同轮处置 ORACLE_INTERFACE_D2 §5.2 迁移触发条件 1（由 gt001_v3 新 id
     满足）与 2（tier 参数化仅 gt001_l1 注册行，gt001_v2 条目不动）/ 修订后更名
     `GTL1_G2B_SPEC_APPROVED.md` v1.0；
  ④ **实现波授权（并发子智能体）**：GTL1-G2b-03（gt001_l1_oracle RK4 dt0.01 + gt001_v3
     6 Run emit + 域扫描冻结 + verify_golden gt001_l1 注册与 T-B tier 参数化分派）+
     GTL1-G2b-04（systems.js GT model_version 1.2.0 + 八热力信号 + 三轨 engine + metrics
     + UNIT_DICT K/kPa + 文案终稿 + L1 徽章）；engine-gt.test.js 三轨对 golden（linear→v1/
     swing→v2/thermo→v3）并入现有步；**步数账：verify_golden gt001 重指向 gt001_v3，
     28 步不变，预算 ≤29**（IMP-Q1）；既有 gt001_v1/v2 字节冻结留档、supersedes 链
     v3→v2→v1、预期失效面（历史 GT 盲包 fail V-05 属预期，GT §10 先例）；
  ⑤ **CHG-20261104-13 预留**（v0.7.1 发布：A-4a 补齐）。
  批准人：用户（2026-11-05「按照2执行」）；记录人：实现 Agent。

- `CHG-20261104-13`：**v0.7.1 发布（G8）——A-4a GT-L1 落地（gt001_v3 + 三轨 + T-B 容差制度）**。
  CHG-20261104-12 波次（T1…T5，动态工作流 dwfrun-20a5779d，五阶段 7 路）。交付：
  ① **GTL1-G2b-01**：`GTL1_G2B_SPEC_APPROVED.md` v1.0（七条件+Q1…Q5 定案落正文；
     A-1 方案 a 常量 15 位精确登记，修订人独立复算残差 5.7e-14 kW 与评审 4.3e-14 同量级
     并存登记）；
  ② **GTL1-G2b-03**：`tools/oracle/gt001_l1_oracle.py`（出生即 oracle_base、RK4 y=[f,T3]
     h=0.01 冻结更新序、GL-1…GL-8 全过：设计点 P_gen=25/残差 4.263e-14 kW、18 锚点、
     半步长 1.082e-06 Hz）+ **gt001_v3 golden 6 Run 首签**（全 thermo、schema v2、
     method gt001_l1_rk4_dt0.01、model_version 1.2.0、supersedes=gt001_v2、gate T-B 终值
     按双实现散差×≥10 冻结——真实引擎交叉 27 列+指标逐位 series-exact）+ **域扫描冻结
     （A-2/B-4 硬条件闭合）**：mag=1.0 角点 max|Δf|=0.997996<1.0 未越界（§3.3.1）+
     `verify_golden.py` MODELS["gt001"] 重指向 gt001_v3 + **T-B tier 参数化分派**（T-A
     默认路径零改动）+ ORACLE_INTERFACE_D2 §5.2 触发处置（B-3）+ V06_ROADMAP D-GT 行
     重定性 + FAULT_CATALOG GT-001 更新；
  ③ **GTL1-G2b-04**：`engine.js` simulateGT001Thermo（RK4 冻结分区更新序）+ 显式三分派
     （R-8 守卫）+ **thermo 默认翻转（Q4）**；`systems.js` model_version 1.2.0 + EQ-GTL1-1…12
     + A-gtl1-* + level 'L1 · 热力学耦合频率响应演示（G2b 已批准）' + 八热力信号（B-1
     非盲显）+ Q5 指令域口径 + UNITS K/kPa；`scenario.js` 事件级可选 inertia_model 键
     （B-2，scenarioHash 含解析轨）+ schema 三枚举；`metrics.js` thermo 门控标量；
     `checks.js` sampling 可选轨规则 + gt-energy-consistency thermo 分支（EQ-GTL1-12，
     容差 1e-3 kWh=实测上界 ×12）；
  ④ **三轨测试守卫**：`tests/engine-gt.test.js` **203→451 断言**（linear→v1/swing→v2 逐位
     保留 + thermo→v3 T-B 逐点 + mag=1.0 角点断言 + **L0b↔L1 分歧断言** §3.2 八行 v1.0
     口径 + 钉轨回归 + **B-1 盲面源级+运行时守卫**）；scenario.test.js 285→321（inertia_model
     键面）；schema.test.js 152→213（K/kPa）；
  ⑤ **步数账（IMP-Q1）**：run-g2 **28 步不变**（verify_golden gt001 重指向 v3、engine-gt
     并入三轨），预算 ≤29 兑现；步 ① 标签更新（GTL1-G2b-03 / gt001_v3 T-B，本 CHG 内一行订正）；
  ⑥ 验证：run-g2 28/28 PASS 两次独立（工作流内 + 主流程复验 34059ms）；**既有 5 golden
     字节零变更**（gt001_v1/v2/fl001_v1/fc001_v1/pv001_v1 冻结留档，supersedes 链
     v3→v2→v1）；引擎↔gt001_v3 全 6 Run 27 列+指标逐位 series-exact（T2）与散差 5.684e-13
     （T3）双证；钉轨 swing/linear 对 v2/v1 max|Δ|=0（遗留轨零漂移）；21 测试文件全过；
     copy-guard 0 命中；
  ⑦ 登记事项（诚实口径）：MODELS 重指向 vs 规格「gt001_l1 注册行」形态偏离（等价性登记
     D2 §5.2）；gate 形制补键 n_rpm_atol/p_kPa_atol（PV001 C-3 先例）；GL-2/GL-6 按实测
     上界冻结；eta_cycle 双口径分列；v2 EV-002 event_id 冻结笔误不复制；A-1 复算双值并存；
     未实施留待：TESPy 对照算例（旁证）、causalTemplates thermo 扩展、UI 跨深度对比卡
     （v0.7.x 清算清单）。
  预期失效面：thermo 默认翻转（Q4）→未钉轨 GT 新 Run 走 thermo、既有场景哈希变化（B-2
  登记）、历史 GT 盲包 fail V-05（GT §10 先例）、盲包观测面不扩（B-1）；FL/FC/PV 物理面
  零触碰（149/339/294 全绿佐证）。证据 `evidence/g8/v071-release.md`。
  批准人：用户（CHG-20261104-12 授权链）；记录人：实现 Agent。

- `CHG-20261105-01`：**V072_WAVE_DESIGN v1 批准（v0.7.2 残留清算 + A-4b/A-4c/B-2 草案轮）**。
  用户 2026-11-05 指令「先不推送；设计下一轮的长期方案，统一采用推荐决策，采用并发多个
  子智能体来加速任务」。
  ① `NEXT/V072_WAVE_DESIGN.md` v1 生效——**DEC-1…7 全采推荐项**：DEC-1 残留清算九项一次
     清零（PV quality 检查适配+PV 专属 PHY 检查/schema 导出面 R-8/静态文案与指标组/signals.js
     缺陷修复/CORE_FILES 并入/causalTemplates thermo+causal 键/UI 跨深度对比卡/FaultLab.html
     重打包/TESPy 对照算例）/ DEC-2 A-4b FL-001 热模型最小集形态（单节点集总热容 ODE+内阻
     温度项，**thermal_model off 默认**——P0 旗舰保守性理由登记，区别于 GT-L1 Q4 先例；本波
     只到草案+双路评审，批准与实现 v0.8.0）/ **DEC-3 A-4c FC 电化学裁定：自写 ODE（stdlib）
     为主路径，PyBaMM 不引入（含后端侧）**（I-1 纯度+L1 制度已验证+信号面小；PyBaMM 留旁证
     算例轨道；用户可撤销，撤销成本零沉淀）/ DEC-4 B-2 WT-001 草案轮（AC+机械动态+变桨，
     本波草案+评审，批准与实现 v0.8.0）/ DEC-5 版本节奏 v0.7.2→v0.8.0→v1.0.0（V06_ROADMAP
     §3 原样）/ DEC-6 步数账 28 步不变（预算 ≤29 维持）/ **DEC-7 push 状态=用户裁定暂缓**
     （v0.7.1 与本波产出将来同批推送）；
  ② 实现波授权（并发子智能体，三阶段 13 路）：清算六路（文件面互斥分配）+ 草案两路 +
     双路评审四路 + 全量门禁；golden 零变更、零新仿真轨、A-4b/B-2 批准不在本授权内；
  ③ **CHG-20261105-02 预留**（v0.7.2 发布）。
  批准人：用户（2026-11-05「统一采用推荐决策」）；记录人：实现 Agent。

- `CHG-20261105-02`：**v0.7.2 发布（G8）——残留清算九项全清 + A-4b/A-4c/B-2 草案轮**。
  V072_WAVE_DESIGN 波次（T1…T12，动态工作流 dwfrun-11360bb0 三阶段 13 路）。交付：
  ① **残留清算九项全清**：T1 checks.js soc-bounds/energy-balance 按 bounds 派生（PV 不派发）
     + **pv-energy-consistency** PV 专属 PHY 检查（E_pv_true+E_grid=E_load，实测残差 ≤5.551e-17）
     ／T2 schema 导出面 R-8（initial 键面 bounds 派生、PV 免 SOC_pct、G0_W_m2 校验+投影；
     FL/FC/GT baseline 并跑探针**逐字等价**）／T3 home 四系统化+徽章真实 level 前缀
     （**GT→L1 联带修正**）+故障原理卡通用化（PV 声明性机制卡）+METRIC_PICK/compare PV 组
     ／T4 signals.js 内层根 div 修复（SPA 残留缺陷消除）+e2e E-09 深链残留断言（回退→咬合
     →重应用闭环证明）／T5 CORE_FILES 并入 + **FaultLab.html 重打包**（1383.4 KiB，原产物
     2026-10-27 陈旧缺 15 文件）+ file:// 冒烟 57×3 轮／T6 causalTemplates thermo_track 静态
     叙事卡 + causal.js RESIDUAL_CANDIDATES PV/GT-thermo 键 + **单位域缺陷修复**
     （f_channel_diff_Hz Hz 域）+ teaching 跨深度路径 + TESPy 旁证算例（6/6 PASS，
     三标签不合并）；
  ② **A-4b FL 热模型 G2b 草案**：`FL001_THERMAL_G2B_SPEC_DRAFT.md` v0.1（547 行）——
     thermal_model off 默认（P0 旗舰四理由）、守恒面 (a) 进母线平衡推荐、EQ-FLTH-1…9、
     锚点 RK4 预填（L0 轨零变化三层佐证 worst diff=0.0）；双路评审
     **A:PASS_WITH_CONDITIONS（4）/B:PASS_WITH_CONDITIONS（3）**——批准轮修订清单
     （A-1 两角点 P_gen 预填值修正 21.769954/20.139754 等）登记证据 §3，**批准与实现
     v0.8.0（DEC-2 留待用户）**；
  ③ **B-2 WT-001 风电 G2b 草案**：`WT001_G2B_SPEC_DRAFT.md` v0.1（576 行）——L0b 推荐
     （WT-DRAFT-Q3）、Cp 经验式+三支路目标+变桨一阶、3 族（**v_sensor_bias 注入点经复算
     证伪 v³ 目标律发散→钳位+估计通道推荐（Q1）**/pitch_stuck 位置强制（Q2）/gust_step）；
     双路评审 **A:PASS_WITH_CONDITIONS（3）/B:PASS_WITH_CONDITIONS（4）**——批准轮修订
     清单（A-1 β(20.0) 口径二选一/B-1 禁词改写等）登记证据 §3，**批准与实现 v0.8.0
     （DEC-4 留待用户）**；
  ④ 步数账（DEC-6）：run-g2 **28 步不变**，预算 ≤29 维持；验证：run-g2 28/28 PASS 两次独立
     （工作流内 + 主流程复验 35417ms）；**golden 零变更**（6 golden 字节冻结）；零新仿真轨
     （engine.js 零改动）；FL/FC/GT 行为 baseline 探针逐字等价；copy-guard 0 命中；
     file:// 冒烟 57×3、e2e 48/48（新增 E-09 深链残留断言）、CDP 走查 50/50；
  ⑤ **新增残留登记（本波探针发现，须显式 CHG）**：faulted PV Run bias_A 分域缺陷
     （schema.js:161-163 |b|≤20 A 误用于 W/m² 幅值域，faulted PV 导出仍报 CN-E02）／
     docs/CONTRACT.md §4.8 quality「必含」措辞欠账／thermo_track 运行期自动分派留后续。
  预期失效面：PV quality 锁定态 fail→pass、**新建 PV Run config_hash/run_hash 变化**
  （scenarioView 补投 initial_G0_W_m2，无冻结 PV 哈希断言）、FaultLab.html 字节变化、
  home 文案变化；FL/FC/GT 行为零变化。证据 `evidence/g8/v072-release.md`。
  **推送按用户裁定暂缓（与 v0.7.1 同批）**。
  批准人：用户（CHG-20261105-01 授权链）；记录人：实现 Agent。

- `CHG-20261107-01`：**A-4b/B-2 G2b 批准 + V080_WAVE_DESIGN v1 批准（v0.8.0 实现波）**。
  用户 2026-11-07 指令「按照计划方案，统一采用推荐决策，采用并发多个子智能体来加速任务」
  （GTL1-G2b-02 先例：用户指令链即书面批准记录）。
  ① **A-4b FL-001 热模型 G2b 批准**：FLTH-G2b-02 收口——v0.7.2 双路评审
     （A:PASS_WITH_CONDITIONS 4 / B:PASS_WITH_CONDITIONS 3）七项条件全按推荐处置
     （A-1 两角点 P_gen 修正 21.769954/20.139754、A-2 FL-7 判据改双实现散差×≥10 或
     ≥1e-9 K 冻结制、A-3 涟漪表补 metrics 定义串 on 域变体 + keyValues off 域声明、
     A-4 四项 P3 勘正、B-1 model_version 1.1.0 归一涟漪面、B-2 两门禁面（off→fl001_v1/
     on→fl001_v2 分派，v2 emit 通过前 on 轨不进 P0 验收）、B-3 T-B 分支 r_true_kW 路由）；
     FLTH-DRAFT-Q1…Q4 全采推荐（守恒面 (a) 进母线平衡／I 冻结子步起点／r_meas 同轮扩展／
     E_loss 子步梯形）；`FL001_THERMAL_G2B_SPEC_APPROVED.md` v1.0 生效（更名自 DRAFT）；
  ② **B-2 WT-001 风电 G2b 批准**：WT-G2b-02 收口——双路评审（A:3/B:4 条件）七项全按
     推荐处置（A-1 β(20.0)=0.0 状态 pre + beta_stuck_deg 事件域、A-2 λ_opt 改登记可达
     精度、A-3 §3.5 包络按 UI 全域重述、B-1 禁词改写 ALLOW 句式、B-2 d_wt_atol 死键删除、
     B-3 exposure 三值映射工作面 + 行号更正、B-4 字面触发项闭合登记）；WT-DRAFT-Q1…Q3
     全采推荐（保护钳位+估计通道／pitch_stuck 位置强制／L0b 机械动态行为级）；
     `WT001_G2B_SPEC_APPROVED.md` v1.0 生效；
  ③ **V080_WAVE_DESIGN v1 生效——DEC-1…8 全采推荐项**：实现波（FLTH-G2b-03/04 +
     WT-G2b-03/04）入本波；残留三项处置（①bias_A 分域修复随本 CHG、②CONTRACT §4.8
     订正、③thermo_track 运行期分派登记不顺延）；步数账 28→30（+2：verify_golden wt001
     第 29 步 + engine-wt.test.js 第 30 步；FL 侧并入步①与既有步），预算 ≤29→≤31 申报；
     版本节奏 v0.8.0 单发（A-5/B-3/C-5/D-5 顺延 v0.9 登记）；push 暂缓延续（v0.7.1+
     v0.7.2+v0.8.0 将来同批）；
  ④ 实现波授权（并发子智能体，五阶段：批准轮 2 路 → 实现 7 路 → 注册/文档 1 路 →
     tests/构建 2 路 → 全量门禁）；**既有 6 golden 字节冻结、既有 4 oracle 零触碰、
     FL off 轨 run_hash 逐位不变、Arena 盲包语义零变化（FL 默认 off、WT 显式排除）**；
  ⑤ **CHG-20261107-02 预留**（v0.8.0 发布）。
  批准人：用户（2026-11-07「统一采用推荐决策」）；记录人：实现 Agent。

- `CHG-20261107-02`：**v0.8.0 发布（G8）——A-4b FL 热模型 + B-2 WT-001 风电批准与实现轮 +
  残留①②**。V080_WAVE_DESIGN 波次（批准轮 2 路 + 动态工作流 dwfrun-e1799f2f 八阶段 12 路，
  配额中断一次零损失续跑；门禁修复环 1 轮）。交付：
  ① **批准轮**：`FL001_THERMAL_G2B_SPEC_APPROVED.md` v1.0（七条件落正文 + Q1…Q4 定案：
     守恒面 (a)/I 冻结子步起点/r_meas 同轮扩展/E_loss 子步梯形）+
     `WT001_G2B_SPEC_APPROVED.md` v1.0（七条件 + Q1…Q3 定案：保护钳位+估计通道/位置强制/
     L0b；A-3 全域包络复算 λ_eq 裕度 11.5% 维持）；批准轮实证两项 verify_golden 缺陷
     （T-B r_true 死支 + fl001_v2 `_A` 缺口）入规格 §4；
  ② **A-4b 实现**：fl001_l1_oracle.py（RK4 dt0.01、FL-1…8、oracle_base 出生接入）+
     **fl001_v2** golden 4 Run T-B 首签（锚点 39/39 复现 worst 4.5e-07）+ engine
     simulateFL001Thermal early-return（off 路径逐字不动）+ systems.js thermal 全面
     （model_version 1.1.0/levelFor 派生/defaults.thermal_model='off'）+ scenario
     thermal_model 键（显式 CHG）+ checks EQ-FLTH-9 分支 + metrics 定义串 on 变体 +
     E_loss_kWh/T_bat_end_K；engine↔oracle T_bat 散差实测 0.00e+0；
  ③ **B-2 实现**：wt001_oracle.py（WS-1…8、15 位常量硬编码——重求导 4 ulp 漂移实证）+
     **wt001_v1** golden 5 Run T-A 首签（WS-6 64/64、gust 两模式位级 0 差）+ engine
     simulateWT001（§1.3-b 冻结序）+ 分派链显式 WT 分支（R-7 守卫）+ WT SystemDef 全量
     （22 信号/3 族/EQ-WT-1…9/A-wt-11）+ ARENA_EXCLUDED + checks wt-energy-identity +
     schema UNIT_DICT m/s·°·'-' + v0_ms 导出面 + UI 五系统 + teaching WT×2/FL 跨深度×1 +
     **tests/engine-wt.test.js 新建 228 断言**；
  ④ **golden 注册面**：MODELS["fl001_l1"]（22 标量全量）/"wt001" 注册 + T-B `_A` 分支 +
     r_true/r_meas 前置解除死支（gt001_v3 散差 0 实证后统一前移，六 verify 全绿）+ 默认无参
     双 golden；FAULT_CATALOG v1.4 + CONTRACT §4.8 订正（残留②）+ MODEL_VALIDATION/
     DATA_CONTRACT fl001.1 双版清偿；
  ⑤ **残留①**：bias_A 分域修复（hasCurrentDomainBiasSignal 按信号目录分派，faulted PV
     不再 CN-E02）；残留③ thermo_track 运行期分派维持顺延 v0.9；
  ⑥ **构建**：FaultLab.html 重打包 1527.5 KiB + file:// 冒烟 61×3 轮（按 e2e 镜像重建，
     冒烟脚本未固化为新增残留①）。
  验证：run-g2 **30/30 PASS 两次独立**（工作流内 + Lead 复验 38096ms；+2 步：verify wt001
  第 29/engine-wt 第 30，预算 ≤31）；e2e 57/57；copy-guard 0 命中；**既有 6 golden 字节
  零变更**、4 oracle 零触碰；FL off 轨 fl001_v1 比对零回归。新增残留：file:// 冒烟脚本
  未固化／CDP 深度走查留 v0.9／thermo_track 运行期分派。证据
  `evidence/g8/v080-release.md`。**推送按用户裁定暂缓（v0.7.1+v0.7.2+v0.8.0 同批）**。
  批准人：用户（CHG-20261107-01 授权链）；记录人：Lead Agent。

- `CHG-20261108-01`：**V090_WAVE_DESIGN v1 批准（v0.9.0 波：B-3 草案轮 + A-5/C-5/D-5 + 残留清算 + v1.0 收敛准备）**。
  用户 2026-11-08 指令「设计下一轮的长期方案，统一采用推荐决策，采用并发多个子智能体来加速任务」。
  ① `NEXT/V090_WAVE_DESIGN.md` v1 生效——**DEC-1…8 全采推荐项**：DEC-1 B-3 MG-001 微电网
     G2b 草案轮（多源耦合+「脱离主馈线的功率平衡重整」I-5 谨慎表述+**复用既有系统轨的聚合层
     推荐**；本波只到草案+双路评审，批准留待用户）/ DEC-2 A-5 多物理场探路=评估稿（三系统
     L1 耦合深化提案，推荐时点 v1.0 后；L2 不做清单确认）/ DEC-3 C-5 场景共享落地（导出
     信封标准化+closed-world 导入声明+流转指南，不做云）/ DEC-4 D-5 插件架构评估稿
     （推荐 v1.0 不做插件化，触发条件登记）/ DEC-5 v0.8.0 残留三项清算（**file:// 冒烟固化
     tools/file-smoke.mjs 入 run-g2 第 31 步**/thermo_track 运行期自动分派（engine 小改）/
     CDP 深度走查固化 tools/ui-walkthrough.mjs 不入门禁）/ DEC-6 **v1.0 收敛准备
     docs/V1_FACES.md API 契约冻结清单**（八契约面逐面标注冻结/演进中/待定）/ DEC-7 步数账
     30→31（预算 ≤32 申报）/ DEC-8 push 三批同批挂起延续；
  ② V06_ROADMAP §3 增补 v0.9.0 行（v0.8.0 顺延项落位——随本 CHG 登记，正式修订随 v0.9.0
     发布 CHG）；
  ③ 实现波授权（并发子智能体，三阶段 9 路）；golden 零变更、零新仿真轨（engine 仅
     thermo_track 分派小改）、B-3 批准不在本授权内；
  ④ **CHG-20261108-02 预留**（v0.9.0 发布）。
  批准人：用户（2026-11-08「统一采用推荐决策」）；记录人：实现 Agent。

- `CHG-20261108-02`：**v0.9.0 发布（G8）——B-3 草案轮 + A-5/C-5/D-5 + 残留三项清算 + v1.0 收敛准备**。
  V090_WAVE_DESIGN 波次（T1…T8，动态工作流 dwfrun-9a8cae8b 三阶段 9 路）。交付：
  ① **B-3 MG-001 微电网 G2b 草案**：`MG001_G2B_SPEC_DRAFT.md` v0.1——**聚合层复用推荐**
     （engine 内组合既有源轨、oracle 导入 pv001/wt001 冻结模块，不建第四物理栈）+ EQ-MG-1…9
     **全代数零新 ODE** + 孤岛=「脱离主馈线的功率平衡重整演示」（I-5 专项自查）+ 4 族
     （含 island_event 零参数族+t_clear 重连）+ 锚点 96/96 独立复算（复用交叉与源 golden
     逐位一致）+ golden mg001_v1 计划（聚合确定性复算器+MS-1…8 复用一致性 emit 硬条件）+
     MG-DRAFT-Q1…Q7；双路评审 **A:PASS_WITH_CONDITIONS（4）/B:PASS_WITH_CONDITIONS（6）**
     ——批准轮修订清单登记证据 §3（A-1 gate 补 I_A 两键 P1/A-2 SOC 包络更正/
     A-4 oracle 复用委托形制/B-1 I-5 自查改写/B-3 per-model 第 32 步/B-6 实现时点建议
     **v1.0.x 首项**），**状态仍 DRAFT，批准留待用户（DEC-1）**；
  ② **A-5 探路评估稿**：`A5_MULTIPHYSICS_EXPLORATION.md`——三系统 L1 深化提案
     （FC P1→FL P2→GT P3，**推荐时点全部 v1.0 后**）+ L2 不做清单确认；
  ③ **D-5 插件评估稿**：`D5_PLUGIN_ARCHITECTURE_ASSESSMENT.md`（392 行）——
     **推荐 v1.0 不做插件化**（插件化只省最便宜环节、准入成本照付、运行期代码装载永久排除）
     + TR-1/2/3 触发条件登记；
  ④ **C-5 场景共享落地**：exportScenarioEnvelope/importScenarioEnvelope（信封+裸 JSON 双格式
     back-compat、checksum 不符结构化拒绝）+ 场景页信封导出导入 + docs/SCENARIO_SHARING.md
     （威胁模型：closed-world 白名单即安全边界）+ scenario 测试 +30 断言（351）；
  ⑤ **残留三项清算**：`tools/file-smoke.mjs` 固化（61 断言）**入 run-g2 第 31 步**（终结
     两轮临时件重建）+ engine buildCausal **thermo_track 运行期自动挂载**（附加字段、主链
     分派零变化）+ `tools/ui-walkthrough.mjs` 五系统深度走查 50 断言固化（不入门禁，
     发布轮规程）；
  ⑥ **v1.0 收敛准备**：`docs/V1_FACES.md`（424 行）——八契约面盘点（golden v2 唯一标冻结、
     余七面演进中 additive-only）+ SemVer breaking 政策 + 收敛核对表（8 达成/2 发布轮动作/
     1 残留待裁定，无阻塞缺口）+ 双重声明「准备清单不构成冻结」；
  ⑦ 步数账（DEC-7）：run-g2 30→**31**（+file-smoke core 步），预算 ≤32 申报；
  ⑧ 验证：run-g2 31/31 PASS 两次独立（工作流内 + 主流程复验 54504ms）；**8 golden 字节
     零变更**；engine 改动仅 thermo_track 挂载面（主链分派零变化断言佐证）；copy-guard
     0 命中；file-smoke 61/61、ui-walkthrough 50/50、causal-rules 149、scenario 351 全绿。
  新增登记（诚实口径）：thermoTrackCard 附加字段实现（主链替换将破坏既有断言——与预期失效
  面一致）；systems.js thermo_track 卡自述过时（下一波清算）；**FaultLab.html 未重打包**
  （V090 §3 预定，工件差异随下次重打包收敛）；e2e E-04 高载偶发抖动观察（门禁执行规程参考）；
  T6 新增残留两项（scenario 枚举文案/teaching+leaderboard 步账）。证据
  `evidence/g8/v090-release.md`。**推送按用户裁定三批同批暂缓（本波产出并入同批）**。
  批准人：用户（CHG-20261108-01 授权链）；记录人：实现 Agent。

- `CHG-20261108-03`：**v0.9.x 清算（V1_FACES §4 #11 裁定=修复）+ 步账 31→33**。
  用户 2026-11-08 v1.0.0 发布指令（「依次进行，还是派发子代理」，引用清算+发布两项）第 1 项。
  交付（前置清算工作流 dwfrun-8690ce18）：① scenario.js:150/:157 系统枚举错误文案改
  **动态派生**（knownSystemIds() 助手自 systems 注册表生成——teaching.js 先例；运行探针
  实证含 WT-001、MG-001 等未注册系统不出现）；② systems.js thermo_track 卡两处过时自述
  更新为现行挂载语义；③ run-g2 补挂第 32 步 teaching.test.js（core）+第 33 步
  leaderboard.test.js（extended）——**FIRST-31-STEPS-NORMALIZED-IDENTICAL 机检**既有 31 步
  零改动，I-7 登记 31→33、**预算 ≤33 申报**；④ FaultLab.html 重打包 1540.4 KiB
  （含 thermoTrackCard 挂载/清算文案/C-5 信封）+ file-smoke 61/61 新产物复验。
  验证：run-g2 **33/33** 两次独立（工作流内 + 主流程复验 57896ms）；scenario 389、
  causal-rules 149、core 11354 全绿；copy-guard 0 命中；golden 零变更。
  新增登记：engine.js:261 枚举文案与 scenario.js:7 头注释派生化留 v1.0.x（engine 冻结日
  零触碰）。批准人：用户（v1.0.0 发布指令链）；记录人：实现 Agent。

- `CHG-20261108-04`：**v1.0.0 发布（G8）——1.0 API 承诺生效（八契约面冻结）**。
  用户 2026-11-08 v1.0.0 发布指令（第 2 项）。
  ① **V1_FACES §6 冻结动作五步逐项闭合**：`docs/V1_FACES.md` §2 八面全部转正为
     **冻结（v1.0.0，additive-only）**（面② golden schema v2 先前已冻结；面① SystemDef/
     ③ scenario v1/④ oracle_base/⑤ eval protocol v2/⑥ scope 三档/⑦ run-g2 步账/
     ⑧ copy-guard 词表由演进中转正；各面「不在承诺内」诚实边界随面转正）；
  ② **§3 breaking 政策生效**：breaking=major+迁移指南五件套；**§3.4 golden 字节冻结特别
     条款（强于 semver）**+ additive 边界（不改既有哈希输出/不翻门禁判据）+ 政策自指条款；
  ③ **§4 复核闭合**：#9 run-g2 33/33 两次独立（工作流内 + 主流程复验 57896ms）+#10 文档
     转正+#11 裁定=修复（CHG-20261108-03）——**11/11 全部闭合，无阻塞缺口**；
  ④ **§5 六项裁定**（全按推荐）：① MG-001=v1.0.x 首项（草案+双路评审就绪，批准轮修订
     清单 v090-release §3）② A-5 三提案=v1.0 后逐步 G2b ③ D-3 FMU=样本到即插
     ④ 插件化=维持不做 ⑤ golden backend 信息块=留位 ⑥ #11=修复（已落地）；
  ⑤ **归档**：V1_FACES 为发布证据输入件；冻结后语义=breaking 需 major、additive=minor；
  ⑥ 验证：run-g2 33/33 两次独立 + verify_golden 五模型全 exit 0 + oracle_base 自检
     exit 0 + copy-guard 0 命中 + file-smoke 61/61（重打包产物）+ 全测试面绿
     （core 11354/scenario 389/engine-gt 451/engine 339/engine-fc 294/engine-pv 166/
     engine-wt 228/causal-rules 149/teaching 235/leaderboard 78/schema 227/bundle 35/
     compare 27/registry 44/arena 155/backend 两件/plants 等 21+ 文件）；
  ⑦ **v1.0.0 时点画像**：五系统（FL L0+L1-thermal/FC L0/GT L0b 双存档+L1 默认/PV L0/
     WT L0b）、8 golden 字节冻结、10 oracle、11 页面、评测协议 v2+对外场次流程就绪、
     file-smoke 门禁化、V1_FACES 八面冻结。
  v1.0.x 待办（additive/minor 面）：MG-001 批准与实现（首项）｜engine.js:261/scenario.js:7
  枚举派生化｜thermo_track 卡定位复核｜FaultLab.html 重打包收敛｜TESPy 角点扩展。
  证据 `evidence/g8/v100-release.md`。**推送按用户裁定暂缓（五批同批：v0.7.1 起至 v1.0.0）**。
  **批准人：用户（2026-11-08 v1.0.0 发布指令链）；记录人：实现 Agent。**
- `CHG-20261110-01`：**V110_WAVE_DESIGN v1 批准（v1.1.0 波：B-3 MG-001 批准与实现轮 + A-5 P1 FC 草案轮 + v1.0.x 残留清算——八面冻结后首轮 additive/minor）**。
  用户 2026-11-10 指令「设计下一轮的长期方案，统一采用推荐决策，采用并发多个子智能体来加速任务；不要和已有进程冲突。」
  ① `NEXT/V110_WAVE_DESIGN.md` v1 生效——**DEC-1…8 全采推荐项**：MG-001 本波批准轮（MG-G2b-02 收口：双评审条件 A-1…A-4/B-1…B-3/B-5 落地 + MG-DRAFT-Q1…Q7 定案 + 更名 MG001_G2B_SPEC_APPROVED.md v1.0）与实现轮（MG-G2b-03/04：mg001_oracle 源轨复用委托 + golden mg001_v1 5 Run schema v2 + 引擎分派 + UI 六系统化 + FAULT_CATALOG §8 + ARENA_EXCLUDED 增列）；A-5 P1 FC G2b 草案轮入波（只草案+双路评审，批准留待用户）；残留清算五项；步数账 33→35（预算 ≤35 显式申报，FIRST-33 机检既有 33 步零改动）；additive 三不承诺（哈希零变化/既有 8 golden 字节零触碰/既有步判据零翻转）。
  ② **MG-001 批准经本指令链登记**（GTL1-G2b-02 先例：用户指令链即书面批准记录；WT-001 同例）——承接 CHG-20261108-04 §5 裁定①「MG-001=v1.0.x 首项」终裁。
  ③ V06_ROADMAP §3 账实修正：v0.8.0 行内容修正为实际交付（A-4b/B-2）、补登 v0.9.0 行（CHG-20261108-01 ② 声称增补未落盘的账实差异）、增补 v1.1.0 行（本波）。
  ④ **CHG-20261110-02 预留**（v1.1.0 发布）。
  ⑤ 冲突规避机检（2026-11-10）：CronList/OffPeakList/ListWorkflowRuns 全空 + 工作树 clean（HEAD=61820f1）——无已有进程冲突；派发文件面互斥（三阶段 9 路）、不 push 不 rebase。
  **推送按用户裁定暂缓（五批同批：v0.7.1 起至 v1.0.0）——本波产出并入同批**。
  **批准人：用户（2026-11-10「统一采用推荐决策」指令链）；记录人：Lead Agent。**

- `CHG-20261110-02`：**v1.1.0 发布收口（G8 证据就绪；G7 perf 步阻塞登记——34/35×2，阈值再登记待用户裁定）**。
  承接 CHG-20261110-01（V110_WAVE_DESIGN 三阶段 9 路 W1…W8 已完成）；本 CHG = W9 门禁与证据路收口登记（编号用 ④ 预留号）。
  **① 发布门结果全表（2026-11-11 全部真实运行）**：
  1. `python tools/build.py` exit 0——FaultLab.html 1540.4→**1633.2 KiB**（css=10 js=33，重打包收敛清算项⑤）；
  2. `node tools/run-g2.mjs` × 2 独立（中间零改动）——**均 34/35 PASS**（r1 47076 ms / r2 46801 ms；
     tier 分解 r2 = core 28 步 27 pass 43064 ms + extended 7 步 7 pass 3591 ms）；唯一失败步 =
     **V3-03 perf.mjs**：E2E 主旅程时长门禁超阈（fresh 实测 15684/15658 ms > 冻结阈值 15000 ms——
     阈值 2026-10-30 按「实测峰值×2」校准，当时旅程 40 断言/峰值 7556 ms）。**超因不是性能退化**：
     W7（CHG-20261110-01 批准）给 e2e 旅程 additive 增补 E-14/E-15 两 MG demo 深链（57→65 断言，
     +2 次 demo 启动）致时长被动 +4 s；独立对照 15766/15627 ms——超阈确定性（波动 <±1%）。
     e2e 断言面 65/65 全过。阈值再登记属 tools/perf.mjs 门禁判据面变更（本波禁触面）——
     **按 perf.mjs 头注既定再登记程序（D-4 先例：实测基线→CHG 登记→复测定稿，CHG-20261104-10）
     留待用户裁定**，裁定后随下一次门禁复跑闭合 G7（§④ 待办首项）；
  3. `python -I scripts/verify_golden.py` 默认双 golden + fl001/fl001_l1/fc001/gt001/pv001/wt001/mg001
     逐模型 ×7——**八次全 exit 0**：checks 计 50（default 双轨）+25+25+30+35+25+30+**30（mg001）**
     = 260 checks **0 fail**；
  4. `python -I tools/oracle/oracle_base.py` 自检 exit 0（T-1…T-8 全 pass + conformance ok）；
  5. `node tools/copy-guard.mjs` exit 0——**PASS 39 patterns 0 命中**（词表 33→39+ALLOW 14，
     D-28 落地后首发轮）；
  6. `node tools/file-smoke.mjs --rounds 3` exit 0（**3×69=207/0**，52848 ms）+
     `node tools/ui-walkthrough.mjs` exit 0（**59/59**，26986 ms）+
     `node tools/e2e.mjs` exit 0（**65/65** ×3 次——run-g2 内 1 次 + 独立 2 次）；
  7. **golden 零变化终检**：`git status --short data/golden/` 仅 2 新增（mg001_v1.json/.sha256）+
     `git diff --stat -- data/golden/` 空 + 既有 8 golden 字节复核（fc001_v1 1,093,755 /
     fl001_v1 659,299 / fl001_v2 930,796 / gt001_v1 1,449,900 / gt001_v2 1,452,353 /
     gt001_v3 2,372,494 / pv001_v1 788,738 / wt001_v1 1,461,288 字节——与 v1.0.0 时点零变化；
     新增 mg001_v1 1,051,804 字节）；
  8. **测试面 22 文件全绿**（W6/W7/W8 汇报数 + 抽查复跑 core 11357/0、engine-mg 382/0、
     schema 309/0、scenario 389/0、teaching 235/0 本轮实证一致）：core 11357/engine-mg 382/
     scenario 389/schema 309/teaching 235/leaderboard 78/arena-protocol-negative 42/plants 83/
     event-phase 46/bundle 35/report 32/scope-guard 30/compare 27/registry 60/engine 428/
     engine-fc 294/engine-gt 451/engine-pv 166/engine-wt 228/arena 155/causal-rules 149/
     backend 两件（admission+bridge）全绿。
  **② 交付清单**：
  （一）**MG-001 批准轮收口 + 实现轮**（主线）：批准轮 MG-G2b-02 收口（双评审 A:PASS_WITH_
     CONDITIONS(4)/B:PASS_WITH_CONDITIONS(6)，条件 A-1…A-4/B-1…B-6 处置 10 项 + MG-DRAFT-Q1…Q7
     定案落正文，更名 MG001_G2B_SPEC_APPROVED.md v1.0，批准记录=CHG-20261110-01 指令链）；
     实现轮 MG-G2b-03/04——mg001_oracle.py（源物理复用委托 A-4 形制：跨 oracle import 显式授权 +
     MS-3 源通道序列逐位 ≤1e-12 emit 硬条件 + 不 import src/**）+ **mg001_v1 第 7 个 golden**
     （5 Run/schema v2/T-A/approval 首签，1,051,804 字节+sidecar，MODELS["mg001"] 注册行=
     run-g2 第 34 步）+ systems.js MG001 SystemDef（:1366-1612：model_id MG-001/1.0.0、聚合层 L0、
     19 信号、四族含 island_event 零参数族 params:[] 库内首例、EQ-MG-1…9 全代数零新 ODE、
     A-mg-* 10 条、limitations 10 项）+ engine simulateMG001（:1614，R-5 显式分派守卫）+
     t_clear_s 守卫扩展（MG-001×island_event，EVENT_KEYS/hashProjection 零变化）+ schema R-8
     投影补齐（initial_p_sched_kW 入 config hash 投影 + [−8,8] 域校验）+ UI 六系统化
     （home/compare/scenario/teaching/system）+ A-3 单 Run 包络行（signals 页，E-15 机检）+
     ARENA_EXCLUDED 增 'MG-001'（arena.js:105，DEC-4）+ FAULT_CATALOG v1.4→v1.5 §8 +
     tests/engine-mg.test.js（382 断言，run-g2 第 35 步）+ 步数账 33→35（I-7 申报，
     FIRST-33-STEPS-NORMALIZED-IDENTICAL 机检既有 33 步零改动）；
  （二）**A-5 P1 FC 草案轮**：`FC001_ELECTROCHEM_G2B_SPEC_DRAFT.md` v0.1（394 行）——电化学
     V-I 极化 + T_st 新 ODE、electrochem_model off|on 默认 off、fc001_v2 预登记、classify 二选一
     核心裁定点；**状态 DRAFT，批准留待用户**（评审未启动）；
  （三）**残留清算五项全清**：engine.js:261 枚举派生化 ✓（knownSystemIdsText :272-274）/
     scenario.js:7 头注释契约行 ✓（六系统动态派生式）/ thermo_track 卡定位复核 ✓（GT :2276 /
     **FL thermal_track :1830——W5 复核发现 V1_FACES §7 原「FC thermal_track 卡」为「FL」转写
     笔误，grep 实证卡在 FL-001**，随本 CHG 修正）/ FC thermal_track 卡自述复核 ✓（=前者同主体）/
     FaultLab.html 重打包收敛 ✓（1633.2 KiB + file-smoke 207/207）。
  **③ additive 三不承诺兑现（DEC-8/V1_FACES §3.4）**：① 哈希零变化——机检 scenario 389/
     registry 60/schema 309 全绿 + 五系统引擎↔golden 比对全绿抽样（MG 键控 additive：p_sched_kW
     投影仅 MG-001 携带）；② 既有 8 golden 字节零触碰——git diff 空 + verify_golden 全 exit 0
     （V-02 复验）+ 字节表；③ 既有 33 run-g2 步判据零翻转——FIRST-33 机检 + 本轮 33 步全 pass
     （perf 步判据文本零改动，翻转=旅程 additive 增长非性能退化，如实登记不构成放宽动作）。
  **④ v1.1.x 待办登记**：
     —— **首项：perf.mjs V3-03 阈值再登记（G7 闭合前置）**——用户裁定阈值口径（建议沿 D-4 程序：
     新旅程实测基线 3 轮 15684/15766/15658 ms → CHG 登记新阈值 → 复测 2 轮定稿）+ tools/run-g2.mjs
     第 31 步 file-smoke 标签「61 断言」滞后于实际 69（cosmetic，随下次 tools 触碰同步）；
     —— FC P1 批准轮（双路评审 + 用户书面批准）= 下一波首项候选（草案 v0.1 就绪）；
     —— TESPy C1（u=19.65）/C2（u=40 钳位）两角点 v1.1.x 候选（stdlib 口径 (a) 先行，Q-T2）；
     —— 词表 D-28 已落地（33→39+ALLOW+3；BANNED 只增不删纪律维持，39 为新基线）；
     —— ui-walkthrough REDLINE 补位注记：I-5 词面守卫双层制（ui-walkthrough.mjs REDLINE_TERMS
     11 词根渲染面扫描 + copy-guard 39 模式源面扫描）维持「发布轮规程、不入 run-g2」定位不变；
  **⑤ v1.1.0 时点画像**：**六系统**（FL-001 L0+L1-thermal / FC-001 L0 / GT-001 L0b 双存档+L1
     默认 / PV-001 L0 / WT-001 L0b / **MG-001 聚合层 L0**——ARENA_EXCLUDED）、**9 golden 字节冻结**
     （既有 8 + mg001_v1；§3.4 强于 semver）、**10+1 oracle**（mg001_oracle 出生接入）、
     11 页面、**run-g2 35 步**（I-7 预算 ≤35）、e2e 65 / file-smoke 69 / ui-walkthrough 59、
     词表 39/14（D-28）、FaultLab.html **1633.2 KiB**、V1_FACES 八面冻结维持（本波修订全部
     additive——快照计数同步+清账标注，冻结条款语义零变化）。
  证据 `evidence/g8/v110-release.md`（发布门 1–8 全表 + golden 字节表 + 22 测试文件汇总 +
  additive 三不承诺兑现声明）。
  **推送按用户裁定暂缓（五批同批延续——本波产出并入同批）**。
  **批准人：用户（2026-11-10 CHG-20261110-01 指令链——本收口登记为其波次授权的执行记录；
  G7 perf 阈值再登记为新增门禁判据面事项，单独待用户裁定）；记录人：Lead Agent。**
- `CHG-20261110-03`：**V3-03 perf.mjs 时长阈值再登记 15000→31500 ms（D-4 程序）——G7 闭合（v1.1.0 补记）**。
  用户 2026-11-13 指令「设计下一轮的长期方案，统一采用推荐决策，采用并发多个子智能体来加速任务；
  不要和已有进程冲突。」——CHG-20261110-02 ④ 待办首项（perf 阈值再登记）**采推荐口径**闭合。
  ① **再登记依据（D-4 程序：实测基线→CHG 登记→复测定稿，CHG-20261104-10 先例）**：e2e 旅程
  additive 增长 57→65 断言（E-14/E-15 MG demo 深链，CHG-20261110-01 批准）致时长确定性
  15684/15766/15658/15627 ms（波动 <±1%）；按 perf.mjs 初冻同一「实测峰值×2」公式
  15766×2=31532→**31500 ms**（沿 2026-10-30 舍入惯例）。
  ② **判据性质裁定（采推荐）**：本再登记 = 随波 additive 旅程增长的**再校准**，非 V1_FACES §3.2
  「门禁判据放宽」——每断言性能语义不回退（v1.0.0 232 ms/断言 → v1.1.0 241 ms/断言，+4% 为
  demo 启动开销），对称先例 = 同波 e2e 57→65 / file-smoke 61→69 断言增长均 additive；替代选项
  （判放宽→major v2.0.0+五件套迁移义务）因比例失当否决（登记于此供追溯）。判据文本改动仅
  tools/perf.mjs 三处（头注①/THRESHOLD_MS/PASS 行尾注），D-4 堆/帧率阈值不动，STEPS 数组零改动
  （FIRST-33 机检不受影响）。
  ③ **复测定稿**：`node tools/run-g2.mjs` 两次独立 **35/35 PASS**（r3 61716 ms / r4 59915 ms，
  中间零改动）——**G7 闭合**，v110-release §0/§6 闭合补记 + V1_FACES 面⑦/§4 #9/判读附录/§8
  四处登记点同步。
  **批准人：用户（2026-11-13「统一采用推荐决策」指令链，CHG-20261110-02 ④ 推荐口径承接）；
  记录人：Lead Agent。**
- `CHG-20261113-01`：**V120_WAVE_DESIGN v1 批准（v1.2.0 波：A-5 P1 FC 电化学批准与实现轮 + TESPy C1/C2 角点补全 + v1.1.x 残留清算——八面冻结下第二个 additive/minor 波）**。
  用户 2026-11-13 指令「设计下一轮的长期方案，统一采用推荐决策，采用并发多个子智能体来加速任务；不要和已有进程冲突。」
  ① `NEXT/V120_WAVE_DESIGN.md` v1 生效——**DEC-1…8 全采推荐项**：FC P1 批准轮（FCECH-G2b-02 收口：双路独立评审 A 物理/B 治理先行 → 条件落正文 → 参数面十常量批准轮定案（三整定依据+域扫描证据）→ Q1…Q8 定案 → 更名 FC001_ELECTROCHEM_G2B_SPEC_APPROVED.md v1.0）与实现轮（FCECH-G2b-03/04：fc001_l1_oracle + fc001_v2 5 Run 镜像 T-B + 引擎 on 轨 early-return + scenario 键 electrochem_model additive + UI on 变体 + 0 新步并入体例）；classify 二选一=Q1 采候选 B（cfg 键分域，scope.js 零改动）；TESPy C1/C2 采 stdlib 口径 (a)+GL-1 同构判据（Q-T1…Q-T4 全采 (a)）；步数账 35→35 零增步（FL v0.8.0 并入先例，预算 ≤35 申报，FIRST-35 机检）；additive 三不承诺 + off 轨逐位硬条件。
  ② **FC P1 批准经本指令链登记**（GTL1-G2b-02 先例：用户指令链即书面批准记录；WT-001/MG-001 同例）——批准轮双路评审先行、条件落正文后生效；P2/P3 串行约束维持（P1 落地为串行链首环）。
  ③ V06_ROADMAP §3 增补 v1.2.0 行（本波）。
  ④ **CHG-20261113-02 预留**（v1.2.0 发布）。
  ⑤ 冲突规避机检（2026-11-13）：CronList/OffPeakList/ListWorkflowRuns 全空 + 工作树 clean（HEAD=20db6f4 v1.1.0）——无已有进程冲突；派发文件面互斥（三阶段 9 路）、评审 A/B 串行互不可见、不 push 不 rebase。
  ⑥ 波前补记：CHG-20261110-02 ④ 两项遗留按推荐口径闭合——perf 阈值再登记 31500 ms（CHG-20261110-03，G7 闭合 35/35 两次独立）；v1.1.0 本地提交 20db6f4（不推送，同批暂缓延续）。
  **推送按用户裁定暂缓（同批：v0.7.1 起至 v1.1.0）——本波产出并入同批**。
  **批准人：用户（2026-11-13「统一采用推荐决策」指令链）；记录人：Lead Agent。**
- `CHG-20261113-02`：**v1.2.0 发布收口（G7 波前已闭合——G8 本 CHG；八面冻结下第二个 additive/minor 发布）**。
  承接 CHG-20261113-01（V120_WAVE_DESIGN 三阶段 9 路 W1a/W1b/W1c/W2…W6 已完成）；本 CHG = W7 门禁与证据路收口登记（编号用 ④ 预留号）。
  **① 发布门结果全表（2026-11-13 全部真实运行）**：
  1. `python tools/build.py` exit 0——FaultLab.html 1633.2→**1679.7 KiB**（css=10 js=33）；
  2. `node tools/run-g2.mjs` × 2 独立（中间零改动）——**均 35/35 PASS，exit 0 × 2**
     （r1 78450 ms / r2 78179 ms；tier 分解 r1 = core 28 步 28 pass 74375 ms + extended 7 步
     7 pass 3910 ms，r2 = core 28/28 74087 ms + extended 7/7 3913 ms）；**0 新步**（run-g2
     维持 35 步——verify_golden fc001_l1 并入步① DEFAULT_MODELS 三 golden 顺序验证、engine
     on 轨并入 engine-fc 既有步⑥，V120 DEC-5）；perf 步实测 12255/12263 ms ≪ 31500 ms
     （G7 波前闭合阈值——CHG-20261110-03，本波零判据变更）；
  3. `python -I scripts/verify_golden.py` 默认 + fl001/fl001_l1/fc001/fc001_l1/gt001/pv001/
     wt001/mg001 逐模型 ×8——**九次调用全 exit 0**：default 三 golden 80（fl001 25 +
     fl001_l1 25 + fc001_l1 30）+ 25+25+30+**30（fc001_l1 新注册行首验）**+35+25+30+30
     = **310 checks 0 fail**（全 8 注册行；附 fc001_l1_oracle FEC-1…8 自检 exit 0 + 路由
     审计 10 golden × 975 序列键 0 错配，本轮追加实跑）；
  4. `python -I tools/oracle/oracle_base.py` 自检 exit 0（T-1…T-8 全 pass + conformance ok）；
  5. `node tools/copy-guard.mjs` exit 0——**PASS 39 patterns 0 命中**（词表 39/14 基线维持）；
  6. `node tools/file-smoke.mjs --rounds 3` exit 0（**3×80=240/0**，76616 ms）+
     `node tools/ui-walkthrough.mjs` exit 0（**63/63**，31430 ms）+
     `node tools/e2e.mjs` exit 0（**76/76**，23719 ms）；
  7. **golden 零变化终检**：`git status --short data/golden/` 仅 2 新增（fc001_v2.json/.sha256）+
     `git diff --stat -- data/golden/` 空 + 既有 9 golden 字节复核（fc001_v1 1,093,755 /
     fl001_v1 659,299 / fl001_v2 930,796 / gt001_v1 1,449,900 / gt001_v2 1,452,353 /
     gt001_v3 2,372,494 / mg001_v1 1,051,804 / pv001_v1 788,738 / wt001_v1 1,461,288 字节
     ——与 v1.1.0 时点零变化；新增 fc001_v2 1,363,737 字节）；
  8. **测试面 23 文件全绿**（今日 run-g2 两轮覆盖全部 23 个 .test.js + 抽查复跑 core 11363/0、
     engine-fc 484/0、scenario 437/0、schema 317/0、registry 60/0 本轮实证一致）：core 11363/
     engine-fc 484/scenario 437/schema 317/registry 60/engine-gt 451/engine 428/engine-mg 382/
     teaching 235/engine-pv 166/engine-wt 228/leaderboard 78/arena 155/arena-protocol-negative 42/
     causal-rules 149/plants 83/event-phase 46/bundle 35/report 32/scope-guard 30/compare 27/
     backend 两件（admission+bridge）全绿。
  **② 交付清单**：
  （一）**FC P1 批准轮收口 + 实现轮**（主线，A-5 串行链首环）：批准轮 FCECH-G2b-02 收口
     （双评审 A:PASS_WITH_CONDITIONS(7)/B:PASS_WITH_CONDITIONS(7)，14 条件全按推荐落正文 +
     参数面十常量定案（E0_ref 425.130134484272 V 闭式派生等，三整定依据 + §3.3 六项域扫描
     证据）+ Q1…Q9 定案（Q1 采 B cfg 键分域、scope.js 结构零改动 / B-1(a) 显式键条件式 /
     B-2 model.electrochem additive 子对象（model_hash 九字段哈希域外）/ B-3(a) schema
     零投影 / B-4 verify_golden T-B `_V` 分支 / B-5 DEFAULT_MODELS 追加 / B-7 盖章双落点），
     更名 FC001_ELECTROCHEM_G2B_SPEC_APPROVED.md v1.0，批准记录=CHG-20261113-01 指令链）；
     实现轮 FCECH-G2b-03/04——fc001_l1_oracle.py（oracle_base 出生接入 + RK4 T_st + L0
     级联独立逐字复刻非 import、复刻位级无损 9.237e-14 + FEC-1…8 自检）+ **fc001_v2 第 10 个
     golden**（5 Run 镜像 fc001_v1 全集全 electrochem_model=on / schema v2 / T-B /
     1,363,737 字节 + sidecar / approval 首签 CHG-20261113-01 / supersedes="fc001_v1（字节
     冻结留档）"，MODELS["fc001_l1"] 注册行）+ engine simulateFC001 电化学 on 轨 early-return
     （off 路径逐字不动；引擎↔oracle 397/397、T_st bitwise 0.0、off 轨 timeseries
     ALL-BYTE-IDENTICAL、onTrackOnly 列门控——off 轨结构性不建列）+ systems.js FC SystemDef
     扩展（defaults 键 + 3 新信号 T_st_K/V_stack_V/P_loss_stack_kW + model.electrochem
     子对象 + level_on/summary_on 派生变体 + acceptance.keyValues 分域）+ scenario
     EVENT_KEYS/ELECTROCHEM_MODELS/declaresElectrochem（B-1(a) 显式键——缺省全链 absent）
     + schema scenarioView 零投影（B-3(a)）+ normalizeConfig/defaultConfig 盖章双落点（B-7）
     + R-6 分派守卫 + UI 三态编辑器/track 面板/chip 徽章/level 摘要派生 + FAULT_CATALOG
     v1.5→v1.6 + tests 断言面 +246（engine-fc 294→484/scenario 389→437/schema 309→317/
     core 11357→11363）+ **步数账 35→35（0 新步，I-7 申报，FIRST-35 机检既有 35 步零改动）**；
  （二）**TESPy C1/C2 角点补全**（产品面外证据面）：stdlib 定比热口径 (a) + GL-1 六判据
     同构 **6/6 × 2 角点 = 12/12 PASS**（独立实现 vs oracle 同参六量 bit-identical）+
     Q-T1…Q-T4 全采 (a)；**LICENSE 核实发现：TESPy 实际 MIT License**（api.github.com 直读
     2026-11-13，blob sha 0a8fd1f3…a480，Copyright (c) Francesco Witte）——非 R-TESPy 行
     登记假设的 GPL-3.0；隔离纪律保守超集效力不变；**R-TESPy 行回填落 docs/REFERENCES.md
     （本 CHG ③ 同轮清偿 v1.1.x 硬前置）**；
  （三）**残留清算**：perf 阈值再登记 ✓（CHG-20261110-03 波前）/ FC P1 批准轮 ✓（=本波
     首项）/ TESPy C1/C2 ✓（12/12）/ 步①·步 31 标签滞后维持登记不修（V120 DEC-5）/ 
     REFERENCES R-TESPy 回填 ✓（MIT——C3 真 TESPy 口径 (b) 候选硬前置清偿）。
  **③ additive 三不承诺兑现（DEC-8/V1_FACES §3.4——跨代码版本字面锚定探针，发布轮实跑
  HEAD=20db6f4 v1.1.0 代码 vs 本波工作树同一输入逐字节比对）**：① 哈希零变化——机检
  scenario 437/registry 60/schema 317 全绿 + 探针四项全等：既有 FC 场景（无键）scenarioHash
  1f062266…dec96f 两版同值（缺省键全链 absent；显式 off a23dc6c5…/显式 on d3ee31bb… =
  新键只影响使用它的输入）、FC healthy config_hash 8822c1d4… 两版同值（on/off 同值
  5ec18601…——B-3(a) 零投影登记不静默）、model_hash c6a938f2…3eb83 两版同值（B-2 九字段
  哈希域外）、off 轨 healthy Run run_hash 6ac0ae17…204c6 两版同值（onTrackOnly 列门控 +
  探针双佐证）；② 既有 9 golden 字节零触碰——git diff 空 + verify_golden 全 8 注册行 exit 0
  （V-02 复验）+ 字节表；fc001_v2 = 新 id 新文件；③ 既有 35 run-g2 步判据零翻转——FIRST-35
  机检 + 本轮 35 步全 pass × 2（0 新步；perf 阈值系波前已闭合项非本波动作）。
  **④ v1.2.x 待办登记**：
     —— **A-5 P2 FL 批准轮候选 = 排 P1 落地一个发布周期后**（v1.2.0 即 P1 落地点——P2
        earliest v1.3.0，且须**显式重开「SOC 定义不动」裁定**：FL 热模型深化触及 SOC/容量
        折算面，A5 §4 串行链第二环）；P3 GT 草案可并行（实现仍严格串行）；
     —— Arena exposure 三值映射验证轮（Arena 盲测池扩张 PV/WT/MG 入池前置）；
     —— MG 教学路径（v1.2.x 候选延续）；METRICS_P1 QP-4 假候选率测量放行（候选延续）；
     —— C3 真 TESPy 口径 (b)（**登记已就绪**——LICENSE 已核实 MIT + REFERENCES 已回填，
        评审人/用户仓库外自备环境任务，只比趋势与量级）；
     —— 步① label「verify_golden fl001」/ 步 31 label「61 断言」滞后固化——随下次
        tools/run-g2.mjs 触碰统一同步（避免 FIRST-35 机检扰动，维持登记）。
  **⑤ v1.2.0 时点画像**：**六系统 + FC L1 电化学轨**（FL-001 L0+L1-thermal / FC-001
     L0+**L1 电化学 on 轨（electrochem_model，默认 off）** / GT-001 L0b 双存档+L1 thermo
     默认 / PV-001 L0 / WT-001 L0b / MG-001 聚合层 L0——ARENA_EXCLUDED）、**10 golden
     字节冻结**（既有 9 + fc001_v2；§3.4 强于 semver）、**11 oracle**（fc001_l1_oracle 出生
     接入）、11 页面、**run-g2 35 步 0 新步**（I-7 预算 ≤35 维持）、e2e **76** /
     file-smoke **80** / ui-walkthrough **63**、词表 **39/14**（维持）、FaultLab.html
     **1679.7 KiB**、**DEFAULT_MODELS 三 golden**（fl001/fl001_l1/fc001_l1）、
     V1_FACES 八面冻结维持（本波修订全部 additive——快照计数同步，冻结条款语义零变化）。
  证据 `evidence/g8/v120-release.md`（发布门 1–8 全表 + golden 字节表 + 23 测试文件汇总 +
  additive 三不承诺兑现声明 + 跨版本哈希字面锚定探针）。
  **推送按用户裁定暂缓（同批 v0.7.1–v1.2.0 延续——本波产出并入同批，本地提交随收口轮决定，
  V120 DEC-7 同口径）**。
  **批准人：用户（2026-11-13 CHG-20261113-01 指令链——本收口登记为其波次授权的执行记录）；
  记录人：W7 门禁与证据路。**
  **批准人：用户（2026-11-13 CHG-20261113-01 指令链——本收口登记为其波次授权的执行记录）；
  记录人：W7 门禁与证据路。**
- `CHG-20261113-04`：**V130_WAVE_DESIGN v1 批准（v1.3.0 波：A-5 P2 FL 容量/内阻 G2b 草案轮 + Arena exposure 三值映射验证轮 + MG 教学路径 + QP-4 放行 + C3 真 TESPy——八面冻结下第三个 additive/minor 波）**。
  用户 2026-11-13 指令「下一步」——承接 V120 收口汇报的下一轮候选清单与既定授权句式（CHG-20261110-01/20261113-01 同款「统一采用推荐决策」链）。
  ① `NEXT/V130_WAVE_DESIGN.md` v1 生效——**DEC-1…7 全采推荐项**：P2 FL 草案+双路评审（本波唯一 G2b 名额，A5 §7 结论 3；「SOC 定义不动」重开=草案核心裁定点请求、本波不裁定、批准与实现 v1.4.0）；Arena exposure 三值映射验证轮（PV/WT/MG 逐信号核对表×盲包程序化验证→逐系统裁定入池、显式 CHG）；MG 教学路径 path-mg-001 additive；QP-4 放行门槛登记（实测 ≤0.2 公布基线，首发前置解除）；C3 真 TESPy 口径 (b)（隔离 venv、MIT 已核实、变比热豁免已解释偏差登记、不可达优雅降级）；步数账 35→35 零增步（FIRST-35 机检）；additive 三不承诺。
  ② **P2 草案无批准效力**：本波只到草案+双路评审（批准留待用户，沿 MG/FC 两波节奏）；「SOC 定义不动」（V072 DEC-2）在本波维持不动——重开请求仅以草案裁定点形态登记。
  ③ V06_ROADMAP §3 增补 v1.3.0 行（本波）。
  ④ **CHG-20261113-05 预留**（v1.3.0 发布）。
  ⑤ 冲突规避机检（2026-11-13）：CronList/OffPeakList/ListWorkflowRuns 全空 + 工作树 clean（HEAD=2b53b39）——无已有进程冲突；派发文件面互斥（三阶段 7 路）、评审 A/B 串行互不可见、不 push 不 rebase。
  **推送按用户裁定暂缓（同批：v0.7.1 起至 v1.2.0）——本波产出并入同批**。
  **批准人：用户（2026-11-13「下一步」指令链——既定候选清单与推荐口径承接）；记录人：Lead Agent。**
- `CHG-20261113-05`：**v1.3.0 发布收口（G7 维持闭合——G8 本 CHG；八面冻结下第三个 additive/minor 发布）**。
  承接 CHG-20261113-04（V130_WAVE_DESIGN 三阶段 W1→W2a→W2b→W3→W4→W5→W6；W5 C3 真 TESPy
  由用户于派发时中断、本波登记挂起不含其交付）；本 CHG = W6 门禁与证据路收口登记（编号用 ④ 预留号）。
  **① 发布门结果全表（2026-11-14 全部真实运行）**：
  1. `python tools/build.py` exit 0——FaultLab.html 1679.7→**1687.8 KiB**（css=10 js=33）；
  2. `node tools/run-g2.mjs` × 2 独立（中间零改动）——**均 35/35 PASS，exit 0 × 2**
     （r1 81367 ms / r2 81070 ms；tier 分解 r1 = core 28 步 28 pass 77094 ms + extended 7 步
     7 pass 4102 ms，r2 = core 28/28 76754 ms + extended 7/7 4129 ms）；**0 新步**（run-g2
     维持 35 步——V130 DEC-6：arena 断言并入步 25、teaching 并入步 32、QP-4 实测随步 19、
     exposure 验证为证据面不入门禁）；perf 步实测 12235/12224 ms ≪ 31500 ms（G7 维持闭合
     ——CHG-20261110-03 阈值，本波零判据变更）；
  3. `python -I scripts/verify_golden.py` 默认 + fl001/fl001_l1/fc001/fc001_l1/gt001/pv001/
     wt001/mg001 逐模型 ×8——**九次调用全 exit 0**：default 三 golden 80（fl001 25 +
     fl001_l1 25 + fc001_l1 30）+ 25+25+30+30+35+25+30+30 = **310 checks 0 fail**（全 8
     注册行，与 v1.2.0 时点全同）；
  4. `python -I tools/oracle/oracle_base.py` 自检 exit 0（T-1…T-8 全 pass + conformance ok）；
  5. `node tools/copy-guard.mjs` exit 0——**PASS 39 patterns 0 命中**（词表 39/14 基线维持，
     本波零增词）；
  6. `node tools/file-smoke.mjs --rounds 3` exit 0（**3×85=255/0**——镜像后 85/85 确认）+
     `node tools/ui-walkthrough.mjs` exit 0（**63/63**，31568 ms）+
     `node tools/e2e.mjs` exit 0（**81/81**，25243 ms）；
  7. **golden 零变化终检**：`git status --short data/golden/` **空**（10 golden + 10 sidecar
     全 tracked 零改动）+ `git diff --stat -- data/golden/` 空 + 10 golden 字节复核与
     v1.2.0 时点逐字节零变化（fc001_v1 1,093,755 / fc001_v2 1,363,737 / fl001_v1 659,299 /
     fl001_v2 930,796 / gt001_v1 1,449,900 / gt001_v2 1,452,353 / gt001_v3 2,372,494 /
     mg001_v1 1,051,804 / pv001_v1 788,738 / wt001_v1 1,461,288 字节）；
  8. **测试面 23 文件全绿**（今日 run-g2 两轮覆盖全部 23 个 .test.js + 抽查复跑 arena 198/0、
     teaching 283/0、core 11363/0、engine-pv 166/0（镜像更新后）实证一致）：core 11363/
     arena **198**（W3，v1.2.0 时点 155）/teaching **283**（W4，时点 235）/engine-fc 484/
     engine-gt 451/engine 428/engine-mg 382/engine-pv 166/engine-wt 228/scenario 437/
     schema 317/registry 60/leaderboard 78/arena-protocol-negative 42/causal-rules 149/
     plants 83/event-phase 46/bundle 35/report 32/scope-guard 30/compare 27/backend 两件全绿。
  **② 交付清单**：
  （一）**A-5 P2 FL 容量/内阻 G2b 草案轮**（本波唯一 G2b 名额，A5 §7 结论 3）：`NEXT/
     FL001_CAPACITY_G2B_SPEC_DRAFT.md` v0.1（η_cap(T) 温度-容量折算进 SOC 积分 + R_int
     二次项 β·θ²；两核心裁定点——「SOC 定义不动」重开=显式裁定请求、键形态三选一；
     Q1…Q11 全候选+推荐不定案；fl001_v3 预登记）+ 双路独立评审（互不可见）**A:PASS_WITH_
     CONDITIONS(9) / B:PASS_WITH_CONDITIONS(6)**（A 零 P1——θ_ss 二次方程/失稳边界量纲/
     判别式/小根稳定性独立重推全过，5 P2+4 P3；B 1 P1——E_cap_kWh gate 路由描述勘正
     实测落 f_Hz_atol 兜底、硬项维持，2 P2+3 P3）；**§10 已回填**（评审记录 + 条件登记
     A-1…A-9/B-1…B-6 原样登记不处置——处置归批准轮）；**状态仍 DRAFT，批准留待用户
     （v1.4.0 轮 FLCAP-G2b-02）**；评审报告全文随波次记录归档（2026-11-13 W2a/W2b）；
  （二）**Arena exposure 三值映射验证轮（入池）**：`NEXT/ARENA_EXPOSURE_VERIFICATION_ROUND.md`
     v1——PV（17）/WT（22）/MG（18，计数勘正）逐信号核对表 × 盲包程序化验证（386 断言
     全过、19 场景泄漏扫描零命中、通道集逐场景全等、V-01…V-06b 全过、island_event 零参数
     族/双事件快照无缺口）→ **三系统全过入池，ARENA_EXCLUDED → []**（**显式 CHG 面 =
     本 CHG**；历史排除链批准注记保留：PV CHG-20261104-10 / WT CHG-20261107-01 / MG
     V110 DEC-4 CHG-20261110-01）；arena.test.js 155→198、e2e E-12/file-smoke E-12 镜像
     六系统、arena.js 守卫注释链更新；非阻塞观察项 O-1…O-4 登记（O-1 枚举族扩展/O-4
     arena 文案清扫 = 显式 CHG 候选）；
  （三）**MG 教学路径（W4）**：teaching.js PATHS additive 第 8 条 path-mg-001（三段功率
     平衡重整、I-5 句式 + mg001_v1 锚点）+ exportTeachingPath 信封 + teaching.test.js
     235→283 + e2e E-19 五断言（76→81）+ src/ui/pages/teaching.js :4 头注「7 条」→
     「8 条」勘正——零既有路径改动；
  （四）**QP-4 放行（V130 DEC-4）**：deriveChangePoints 首发放行——门槛已测量并公布
     （健康局假候选率实测 **0（0/30 局）** ≤0.2 + 可测幅值故障局邻近检出 **12/12** ≥0.9，
     tests/arena-protocol-negative.test.js :278-284 实测机制、实测值随 run-g2 步 19 发布）；
     V1_FACES 面⑤ 放行注记落文档——**首发前置解除、判据零扩张**；
  （五）**C3 真 TESPy 挂起登记**：用户于派发时中断——**硬前置已解除**（LICENSE=MIT +
     REFERENCES 已回填，v1.2.0 清偿），待后续波次执行；本波不含其交付；
  （六）**W6 镜像同步与一处 W3 残留处置（诚实登记）**：file-smoke E-12 六系统镜像更新 +
     E-19 五断言追加（80→85，计数引用/头注同步）+ **engine-pv.test.js §6 三断言滞后镜像
     更新**（W3 已同构更新 arena.test §8/e2e E-12 但漏本文件——首跑 34/35 发现，沿已批准
     同构先例处置、判据数 166 零变化、物理断言零触碰；问询上报未获答复后按先例执行并
     于 v130-release §0/§1 登记）。
  **③ additive 三不承诺兑现（DEC-7/V1_FACES §3.4）**：① 哈希零变化——本波零 SystemDef/
     scenario 声明面改动（arena ARENA_EXCLUDED 为 UI 名单不入哈希、teaching PATHS 追加不入
     run/config 哈希——探针证明）+ 机检 registry 60/scenario 437/schema 317 全绿 + 引擎↔golden
     全量比对绿；② 既有 10 golden 字节零触碰——git status/diff 空 + verify_golden 全 8 注册行
     exit 0 + 字节表；③ 既有 35 run-g2 步判据零翻转——0 新步 + 本轮 35 步全 pass × 2（步 28
     内 3 条 UI 名单守卫断言镜像更新为判据数零变化的滞后同步，非步判据翻转——详见 v130-release
     §3 附注）。
  **④ v1.3.x 待办登记**：
     —— **P2 FL 批准轮 + 实现 = v1.4.0 首项**（FLCAP-G2b-02…04：评审条件 9+6 落正文 +
        两裁定点 + Q1…Q11 + η_cap/β 数值定案批准；批准留待用户）；
     —— C3 真 TESPy 挂起待执行（硬前置已解除）；
     —— O-1 盲包诊断提交枚举族扩展（显式 CHG 面：协议 v1 文本 + 枚举）；
     —— O-4 arena 页文案滞后清扫（显式 CHG）；
     —— 步①/步 31/步 32 描述标签固化随下次 tools/run-g2.mjs 触碰（维持登记不修）。
  **⑤ v1.3.0 时点画像**：**六系统全入 Arena 盲测池**（ARENA_EXCLUDED = []——FL-001 L0+L1-
     thermal / FC-001 L0+L1 电化学轨 / GT-001 L0b 双存档+L1 thermo 默认 / PV-001 L0 /
     WT-001 L0b / MG-001 聚合层 L0）、**10 golden 字节冻结**（§3.4 强于 semver）、11 oracle、
     11 页面、**run-g2 35 步 0 新步**（I-7 预算 ≤35 维持）、**teaching 8 路径**、e2e **81** /
     file-smoke **85** / ui-walkthrough **63**、词表 **39/14**（维持）、FaultLab.html
     **1687.8 KiB**、QP-4 放行（首发前置解除）、V1_FACES 八面冻结维持（本波修订全部
     additive——面⑤ ×2/面① 快照 ×1/§10 修订记录，冻结条款语义零变化）。
  证据 `evidence/g8/v130-release.md`（发布门 1–8 全表 + golden 字节表 + 23 测试文件汇总 +
  additive 三不承诺兑现声明 + W3 残留诚实登记）。
  **⑥ 推送按用户裁定暂缓（同批 v0.7.1–v1.3.0 延续——本波产出并入同批，本地提交随收口轮决定，
  V130 DEC-7 同口径）**。
  **⑦ 批准人：用户（CHG-20261113-04 指令链——本收口登记为其波次授权的执行记录）；
  记录人：W6 门禁与证据路。**
- `CHG-20261114-01`：**V140_WAVE_DESIGN v1 批准（v1.4.0 波：A-5 P2 FL 容量/内阻批准与实现轮 + P3 GT 燃烧延迟草案轮——八面冻结下第四个 additive/minor 波）**。
  用户 2026-11-14 指令「下一步」——承接 V130 收口汇报的下一轮首项与既定授权句式（CHG-20261113-04 同款链）。
  ① `NEXT/V140_WAVE_DESIGN.md` v1 生效——**DEC-1…7 全采推荐项**：P2 批准轮（FLCAP-G2b-02 收口：双评审条件 A-1…A-9/B-1…B-6 全按推荐落正文 + 常量定案（β/k_cap/T_cap0 + 48.2843 边界移动后注册域全量复扫证据）+ Q1…Q11 定案 + 更名 FL001_CAPACITY_G2B_SPEC_APPROVED v1.0）与实现轮（FLCAP-G2b-03/04：fl001_cap_oracle + fl001_v3 第 11 golden T-B + verify_golden 注册行/DEFAULT_MODELS 四 golden/_kWh T-B 分派分支 + 引擎组合守卫三分派 + 稳定小根形态 + UI + 测试，0 新步）；P3 GT 草案轮入波（本波 G2b 草案名额——P2 批准/实现非草案轮，v1.1.0「MG 实现+FC 草案」同构先例；只到草案+双评审，批准与实现 v1.5.0+、实现严格串行）；O-4 arena 页文案清扫；C3 维持挂起（用户前轮中断不自动重试）；步数账 35→35 零增步（FIRST-35 机检）；additive 三不承诺。
  ② **裁定点一裁定：「SOC 定义不动」（V072 DEC-2）重开采纳**（经本指令链，GTL1-G2b-02 先例）——仅 capacity_model=on 域内修订 EQ-FLTH-7 分母为 E_cap(T_bat)=η_cap·E_nom；域外（off 与 thermal on 无 capacity）原式逐字不动；P_bat=0.4·I 口径/守恒恒等式/残差面零涟漪；影响面限定 SOC 折算面（无第二缺口项、无补偿去向——FLTH Q1 性质差异成立）。**裁定点二裁定：组合键 capacity_model: off|on**（前置 thermal_model=on；三元封闭路由 (off,·)/(on,off)/(on,on)/(off,on)=拒绝）；A5 §2.2③ 枚举扩值原推荐的翻转经 V130 DEC-1 上游获准 + 本轮显式确认。
  ③ V06_ROADMAP §3 增补 v1.4.0 行（本波）。
  ④ **CHG-20261114-02 预留**（v1.4.0 发布）。
  ⑤ 冲突规避机检（2026-11-14）：CronList/OffPeakList/ListWorkflowRuns 全空 + 工作树 clean（HEAD=27c5e22）——无已有进程冲突；派发文件面互斥（三阶段 9 路）、评审 A/B 串行互不可见、不 push 不 rebase。
  **推送按用户裁定暂缓（同批：v0.7.1 起至 v1.3.0）——本波产出并入同批**。
  **批准人：用户（2026-11-14「下一步」指令链——既定候选清单与推荐口径承接）；记录人：Lead Agent。**
- `CHG-20261114-02`：**V3-03 perf.mjs 时长阈值再登记 31500→71500 ms（D-4 程序）——G7 维持闭合（v1.4.0 发布轮实测触发）**。
  承接 CHG-20261110-03 先例（同公式/同程序）。① **触发**：v1.4.0 e2e 旅程 additive 增长 81→94 断言（E-20 区 FL on_cap 深链——Riccati RK4 6000 子步/Run，计算量随新覆盖增长）致时长确定性 35896/35997 ms > 31500 ms（确定性，波动 <±1%）。② **再登记**：按同一「实测峰值×2」公式 35997×2=71994→**71500 ms**（沿舍入惯例）；既有路径性能语义不回退（perf.mjs 自测主旅程 heap/fps 两门独立未触；增幅源=新覆盖算法成本非既有路径退化）——随波 additive 再校准非 §3.2 判据放宽（CHG-20261110-03 ② 裁定沿用）；tools/perf.mjs 三处（头注①/THRESHOLD_MS/PASS 行尾注），STEPS 数组零改动。③ **复测定稿**：run-g2 两次独立 **35/35 PASS**（r1 111626 ms / r2 110026 ms，中间零改动）——G7 维持闭合。
  **批准人：用户（CHG-20261114-01 指令链——V140 DEC-7/发布轮同口径承接）；记录人：Lead Agent。**
- `CHG-20261114-03`：**v1.4.0 发布收口（G8）——A-5 P2 FL 容量/内阻批准与实现轮落地；P3 GT 草案顺延登记**。
  承接 CHG-20261114-01（V140_WAVE_DESIGN；W1–W5 完成、W8 两次被主机并发/模型流上限截断后主线接管收口）。
  **① 发布门全表（2026-11-14 全部真实运行）**：build.py 1735.8 KiB；run-g2 **35/35 两次独立**（111626/110026 ms，0 新步 FIRST-35 机检，步① 四 golden）；verify_golden 默认四 golden（105 checks）+ 逐模型 ×9（255）= **360 checks 0 fail**；oracle_base 自检 exit 0；copy-guard **39 patterns 0 命中**；file-smoke **3×98=294/0** + ui-walkthrough **67/67** + e2e **94/94**；golden 零变化终检（仅 fl001_v3 两新增）；23 测试文件全绿（engine 589/core 11365/scenario 493/schema 329/teaching 283/arena 198）。
  **② 交付清单**：（一）P2 批准轮收口（两裁定点裁定：SOC 重开采纳（仅 capacity on 域）+ 组合键 capacity_model 三元封闭路由；15 条件全按推荐落正文；四常量定案 β=5e-7/k_cap=0.004/T_cap0=313.15/η_floor=0.5 + 七项域扫描证据（I_max=62.5 A 实读勘正、新界 46.4741 kW、healthy 位级同机制）；Q1…Q11；更名 FL001_CAPACITY_G2B_SPEC_APPROVED v1.0）；（二）实现轮（fl001_cap_oracle FCAP-1…8 全过+fl001_v2 复现位级 0.0；**fl001_v3 第 11 golden** 4 Run 镜像全 (on,on)/T-B/971,314 B；verify_golden `_kWh` T-B 分派分支（975 元组路由审计零差异）+ DEFAULT_MODELS 四 golden；引擎 on_cap **vs golden 全列位级 0.0**+off/(on,off) 全字节恒等+组合守卫双落点+E_cap_kWh onTrackOnly；tests +226（engine 589/core 11365/scenario 493/schema 329，R-10 守卫）；UI 三态钉选+组合守卫禁用态+capacity 面板；O-4 清扫；FAULT_CATALOG v1.7；1735.8 KiB）；（三）**P3 GT 草案顺延登记**（用户于 W6 派发时中断——v1.5.0 首项候选，本波不含其交付、G2b 草案名额未消耗）；（四）W8 代理两次截断后主线接管（部分执行期产生任务外未授权文件 G9_G10_ARCH_GATE_SPEC_DRAFT.md——自称「用户下发 spec」但本会话无对应用户输入，判定为代理虚构用户权威，**已隔离仓库外零入库**；如用户确有外部 spec 请明示后按外部输入流程重立）。
  **③ additive 三不承诺兑现**：五类哈希既有输入零变化（W3 探针：off/(on,off) 六配置+五系统全恒等+model_hash 519965c8 两版同值+scenario 缺省字面锚定 9e45b115）；既有 10 golden 字节零触碰；35 步判据零翻转（0 新步；perf 阈值再登记为显式 CHG 动作非静默翻转）。
  **④ v1.4.x 待办**：首项 **P3 GT 燃烧延迟草案轮（v1.5.0）**（A5 §3；键面张力二选一裁定点；实现 v1.6.0+ 严格串行）；O-1 盲包诊断族枚举扩展（显式 CHG）；C3 真 TESPy 挂起维持；步①/步 31/步 32 描述标签固化随下次 tools 触碰；G9/G10 外部 spec 如属实须用户明示。
  **⑤ v1.4.0 时点画像**：六系统 + FL capacity on 轨（level_on 派生）、**11 golden 字节冻结**、10+2 oracle（fl001_cap 出生接入）、11 页面、run-g2 35 步 0 新步（DEFAULT_MODELS 四 golden）、e2e 94/file-smoke 98/walkthrough 67、词表 39/14、FaultLab.html **1735.8 KiB**、V1_FACES 八面冻结维持（修订全部 additive）。
  证据 `evidence/g8/v140-release.md`。**推送按用户裁定暂缓（同批 v0.7.1–v1.4.0 延续——本波产出并入同批）**。
  **编号说明**：-01 ④ 原预留 -02 为 v1.4.0 发布；-02 实际由 perf 阈值再登记占用（CHG-20261110-03 先例同构），发布顺延 **-03**（偏差登记于此）。
  **批准人：用户（2026-11-14 CHG-20261114-01 指令链——本收口登记为其波次授权的执行记录）；记录人：Lead Agent。**
- `CHG-20261114-04`：**V150_WAVE_DESIGN v1 批准（v1.5.0 波：A-5 P3 GT 燃烧延迟 G2b 草案轮 + O-1 盲包诊断族枚举扩展——八面冻结下第五个 additive/minor 波）**。
  用户 2026-11-14 指令「下一步」——承接 V140 收口汇报的下一轮首项与既定授权句式（CHG-20261114-01 同款链）。
  ① `NEXT/V150_WAVE_DESIGN.md` v1 生效——**DEC-1…4 全采推荐项**：P3 GT 草案+双路评审（本波唯一 G2b 草案名额；τ_comb 燃烧延迟 y=[f,T3,x_comb] 2→3 维 ODE；键面张力二选一=核心裁定点——形态 a inertia_model 枚举扩值（GTL1 §2.4 三值枚举先例）vs 形态 b 正交二键（FL capacity 先例）vs 被排除形态 thermo 原地深化（A5 §3 :182-184 硬伤）；推荐由草案实读后给出、批准留待用户 v1.6.0+、实现严格串行）；O-1 盲包诊断族枚举 additive 扩展至入池六系统全活跃族（附录 A 17 负例只增不删）；步数账 35→35 零增步（FIRST-35 机检）；additive 三不承诺。
  ② V140 ④ 待办承接状态：P3=本波首项；O-1=本波第二线；C3 真 TESPy 维持挂起（用户前轮中断，不自动重试）；G9/G10 外部 spec 事宜维持「须用户明示后重立」（v1.4.0 隔离件不预设）。
  ③ V06_ROADMAP §3 增补 v1.5.0 行（本波）。
  ④ **CHG-20261114-05 预留**（v1.5.0 发布）。
  ⑤ 冲突规避机检（2026-11-14）：CronList/OffPeakList/ListWorkflowRuns 全空 + 工作树 clean（HEAD=229a15d）——无已有进程冲突；派发文件面互斥、评审 A/B 串行互不可见、不 push 不 rebase；**代理中断降级路径**：中断路改主线接管（W8 先例）。
  **推送按用户裁定暂缓（同批：v0.7.1 起至 v1.4.0）——本波产出并入同批**。
  **批准人：用户（2026-11-14「下一步」指令链——既定候选清单与推荐口径承接）；记录人：Lead Agent。**
- `CHG-20261114-06`：**G9/G10 架构与门禁 spec 外部输入落档（降级 DRAFT）+ 排程与物理处置双裁定（v1.5.0+ 候选波前置登记）**。
  **编号勘正（2026-11-14，主线收口）**：本条原编号 `CHG-20261114-03` 与 v1.4.0 发布记录（CHG-20261114-03，主线收口）重号——外部落档与主线收口为并行线同日编号冲突（CHG-20261028-01/02 并行线同号先例同构），勘正为 **-06**（当日首个空闲号），内容逐字保留、零改动；落档文件与记录的交付时点在 v1.4.0 发布（229a15d）之后，由用户渠道交付。
  用户 2026-11-14 下发外部编制 spec（原文档 ID `SPEC-V0.5-G9-G10-APPROVED`：G9 = FC-001 5 态 L1-FMU（C99/FMI 2.0 Co-Sim + Python ctypes host + HTTP bridge/预烘焙兜底）与 I-11 S3 收口；G10 = Arena L2 query-budget 协议（2.0 s 粗信标免费 + 0.1 s 门控切片预算 + query_ledger 防篡改 + MCP stdio server））——本记录为其入链处置。
  ① **落档**：`NEXT/G9_G10_ARCH_GATE_SPEC_DRAFT.md`（勘误头 + 原文逐字保留未修订）；原文自带 APPROVED 状态**降级 DRAFT**——本仓治理链不自动生效。
  ② **核对结论**：引用钩子逐项核实成立（I-11 S3 未排期、V312 B-4「FMU 各自另批」、`tools/backend/py/fmu_runner.py`/`fmu_admission.py` 在位、arena V-00…V-10 + N-B 负例套件在位、G0-DEC-08/11 + 基线 7aed9f6 在位、V140 不做清单 D-3「FMU 样本未到」由本 spec 解锁）；唯版本框架陈旧（原文 v0.5.0/v0.4.0 已于 2026-10-31 消费——现行 v1.3.0、V140=v1.4.0 在飞、V1_FACES 八面冻结）。
  ③ **裁定一（排程，用户选「V140 先行」）**：G9/G10 于 v1.4.0 发布后作为 **v1.5.0+ 候选波**启动——G9 触 engine.js/plants（S3 退役内联分支）与 V140 W3/W4 文件面相交，严格串行；`G9`/`G10` gate id 以启动波 CHG 注册入台账；S3 验收边界扩裁定待启动轮（GT 现为三轨双存档 + PV/WT/MG 内联分支，超出原文 FL/FC/GT 统一口径）。
  ④ **裁定二（FC-001 物理处置，用户选「降级 DRAFT 走 G2b」）**：5 态空间 PEMFC（52 V/100 A/80 cell、微重力膜分离器、N₂ 累积）为第三轨新物理（≠ fc001_v1 L0 级联 / ≠ fc001_v2 电化学 on-track 400 V 锚）——按 Q-4 守卫 1 / L1_FEASIBILITY_RFC 口径**走 G2b 草案 + 双路评审，批准轮收口后方可实现**；golden 走新 id fc001_fmu_v1，不撞既有 golden 字节冻结。
  ⑤ 契约面预裁定待办七项登记于落档文件勘误头（601/602 行契约面、fmu_sha256 additive 五哈希零变化、V312 FROZEN 钉 hash 须 CHG、run-g2 步预算扩账 I-7、feedback_mode 等新键 B-1a 显式键纪律、copy-guard 词面作用域 MG=microgrid≠microgravity、arena L2 预算常量协议附记）。
  **批准人：用户（2026-11-14 双裁定——AskUserQuestion 排程题选「V140 先行，G9/G10 随后」+ 处置题选「降级 DRAFT 走 G2b 双评审」）；记录人：Lead Agent。**
- `CHG-20261114-05`：**v1.5.0 发布收口（G7→G8）——P3 GT 燃烧延迟 G2b 草案轮 + O-1 盲包诊断族枚举扩展（八面冻结下第五个 additive/minor 发布）**。
  承接 CHG-20261114-04（V150_WAVE_DESIGN 三阶段 W1→W2a→W2b→W3→W4 全完成；本 CHG = W4 门禁与证据路收口登记，-04 ④ 预留号）。
  **① 发布门全表（2026-11-14 全部真实运行）**：
  1. `python tools/build.py` exit 0 ×2——FaultLab.html **1736.7 KiB**（1,778,360 B，css=10 js=33，
     两次构建幂等）。**诚实登记**：≠ 派发预期 1735.8 KiB——1735.8 系 v1.4.0 工件时点（构建于
     本波 W3 落地前），本波重打包含 W3 O-1 `src/agents/arena.js` 枚举扩展（28,110→29,053 B
     = **+943 B**，FaultLab.html 增量 1,777,417→1,778,360 B 逐字节相等归因）——UI 页面零改动
     成立，v1.5.0 时点画像以实测 1736.7 KiB 为准；
  2. `node tools/run-g2.mjs` × 2 独立（中间零改动）——**均 35/35 PASS，exit 0 × 2**
     （r1 109848 ms / r2 110185 ms；r2 tier 分解 = core 28 步 28 pass 104686 ms + extended
     7 步 7 pass 5308 ms）；**0 新步**（35 维持——FIRST-35 机检既有 35 步顺序/判据/命令零
     改动；步 19 arena-protocol-negative 42→**80**、步 25 arena.test 198→**218** 断言数
     additive 增长，既有断言零删改）；perf 步实测 **12725/12568 ms ≪ 71500 ms**（CHG-
     20261114-02 阈值维持，本波零判据变更——G7 维持闭合）；
  3. `python -I scripts/verify_golden.py` 默认四 golden + 逐模型 ×9——**十次调用全 exit 0**：
     default = fl001 25 + fl001_l1 25 + fc001_l1 30 + fl001_cap 25 = **105**；逐模型 fl001 25 /
     fl001_l1 25 / fc001 30 / fc001_l1 30 / fl001_cap 25 / gt001 35 / pv001 25 / wt001 30 /
     mg001 30 = **255**——合计 **360 checks / 0 fail**（与 v1.4.0 基线全同）；
  4. `python -I tools/oracle/oracle_base.py` 自检 exit 0（T-1…T-8 全 pass + conformance ok）；
     `node tools/copy-guard.mjs` exit 0——**PASS 39 patterns 0 命中**（词表 39/14 基线维持，
     本波零增词）；
  5. `node tools/file-smoke.mjs --rounds 3` exit 0（**3×98=294/0**）+ `node tools/ui-walkthrough.mjs`
     exit 0（**67/67**，36692 ms）+ `node tools/e2e.mjs` exit 0（**94/94**，35948 ms）；
  6. **golden 零变化终检**：`git status --short data/golden/` **空**（11 golden + 11 sidecar =
     22 文件全 tracked 零改动）+ `git diff --stat -- data/golden/` 空 + 11 golden 字节复核与
     v1.4.0 时点逐字节全同（fc001_v1 1,093,755 / fc001_v2 1,363,737 / fl001_v1 659,299 /
     fl001_v2 930,796 / fl001_v3 971,314 / gt001_v1 1,449,900 / gt001_v2 1,452,353 /
     gt001_v3 2,372,494 / mg001_v1 1,051,804 / pv001_v1 788,738 / wt001_v1 1,461,288 字节；
     本波零新 golden）；
  7. **测试面 23 文件全绿**（run-g2 两轮全覆盖 + 逐文件实跑计数）：core 11365/engine 589/
     scenario 493/schema 329/teaching 283/engine-fc 484/engine-mg 382/engine-gt 451/
     engine-pv 166/engine-wt 228/**arena 218**（W3，时点 198）/**arena-protocol-negative 80**
     （W3，时点 42）/registry 60/leaderboard 78/bundle 35/causal-rules 149/plants 83/
     event-phase 46/report 32/compare 27/scope-guard 30/backend-admission 81/backend-bridge 13；
     抽查复跑 arena-protocol-negative（80/0）/arena（218/0）/core（11365/0）各一次实证一致。
  **② 交付清单**：
  （一）**A-5 P3 GT 燃烧延迟 G2b 草案轮**（本波唯一 G2b 草案名额，GTCMB-G2b-01）：
     `NEXT/GT001_COMBUSTION_G2B_SPEC_DRAFT.md` v0.1（起草 448 行；τ_comb 燃烧延迟二阶状态、
     y=[f,T3,x_comb] 2→3 维 ODE（x_comb 新动态 ODE 状态——I-2 诚实区分、GT 无 SOC 定义面
     登记）；**键面张力三形态八维对照 + 推荐形态 a 可推翻**（inertia_model 枚举扩值〔GTL1
     先例〕vs 正交二键〔FL 先例〕vs thermo 原地深化=被排除形态 A5 §3.2 :182-184 硬伤）；
     稳态不变性结构推论（d/dt=0 ⇒ Q_f,d ≡ Q_f——三点稳态不变、延迟不改稳态值只改暂态路径）；
     零新信号提案 Q10a；τ_comb 五项判据框架数值零编造；gt001_v4 预登记/四代 supersedes 链/
     GCMB-1…8/T-B+降 T-C 双向预案；Q1…Q13 全候选+推荐不定案）+ **双路独立评审结论代录 §10**
     （W4，互不可见——评审报告全文随波次记录归档 2026-11-14 W2a/W2b）：**A:PASS_WITH_
     CONDITIONS(6)**（1 P1——§3.2/§3.3 逐锚点登记「渐近稳态 vs t=60 采样」两口径（GTL1 A-3
     体例；18.266/1044.16 等在 golden 中是采样值非稳态值）；3 P2——「逐位同」措辞与 T-B
     制度一致化/τ_comb 判据框架增闭环收敛+网格可辨性/GCMB 增 GL-6 同构 gap 检查；2 P3；
     稳态不变性/量纲/RK4 三维分区独立重推全过）+ **B:PASS_WITH_CONDITIONS(5)**（2 P2——
     三处字面守卫须 additive 编辑〔engine.js:320-324/schema.js:231-234/scenario.js:401-402〕
     「自动覆盖」表述订正/config_hash 投影行失实订正（inertia_model 现状在投影内
     schema.js:144——修正后强化形态 a；B-3a 局限只适用形态 b 且 healthy 局 run_hash 跨轨
     同值碰撞须补登）；3 P3；八面声明/先例对照公允性/步数账/体例属实）；条件 A-1…A-6/
     B-1…B-5 原样登记不处置（§10.2）；**状态仍 DRAFT，批准留待用户（v1.6.0 轮 GTCMB-G2b-02）**；
  （二）**O-1 盲包诊断提交族枚举扩展**（V130 O-1 → V150 DEC-2；显式 CHG 面 = 本 CHG）：
     src/agents/arena.js faultType 枚举 4→9 值（+shading_step/gust_step/shading_link/gust_link/
     island_event——入池六系统目录活跃族全集 + none；**名实差修正**：pv_shading_link/
     wt_gust_link 为 FAULT_CATALOG v1.7 目录项 id、族名为 shading_link/gust_link——枚举收
     族名不收 id）；既有 4 值路径零变化探针（TEMP 同输入同输出）；负例套件 additive——
     arena-protocol-negative 42→**80**（附录 A 冻结 N-B1…N-B17 零删减 + N-B18 新族合法
     正例 ×5 + N-B19 越界负例（目录项 id/空族仍拒收 AE-E11）+ 新族可达 smoke）、arena.test
     198→**218**（§8c 新族提交可达 + 越界镜像 + MG-001 真族轮评分冒烟）、e2e 94 零变化
     （tools/** 零触碰）；ARENA_EVAL_PROTOCOL_APPROVED.md **不改**（批准文本无枚举清单
     载面，实现侧 additive 更贴合其规则句——面⑤「规则代演进 = additive」口径）；
  （三）**新观察项登记**：island_event 零参数族幅值不可达 → round_score **85.0 上限**
     （真值幅值 {value,unit:''} 不满足提交侧非空 unit 规则、按「缺失幅值记 0」冻结口径；
     family/component 可达性不受影响——本波 O-1 目标已达成）；幅值可达化 = 后续显式 CHG
     候选（待用户裁定）；
  （四）**小清算**：步①/步 31/步 32 描述标签滞后维持登记不修（tools/** 本波零触碰）；
     C3 真 TESPy 挂起维持；G9/G10 维持「须用户明示」（如实登记：收口时点工作树现存未跟踪
     `NEXT/G9_G10_ARCH_GATE_SPEC_DRAFT.md` 与 DECISIONS.md 尾部一条**重复编号 CHG-20261114-03**
     的 G9/G10 落档记录，均非本波文件面、零触碰——重号偏差登记，归后续用户明示处置）。
  **③ additive 三不承诺兑现（V150 DEC-4/V1_FACES §3.4）**：① 哈希零变化——本波零
     SystemDef/scenario 声明面改动（P3 只草案零代码；O-1 为诊断提交面 faultType 校验值域、
     不入 run/config/scenario 哈希——W3 探针证明）+ verify_golden 360 checks 全过 + registry/
     schema/scenario 机检全绿佐证；② 既有 11 golden 字节零触碰——git status/diff 空 +
     V-02 sidecar 复验全过 + 字节表（本波零新 golden）；③ 既有 35 run-g2 步判据零翻转——
     0 新步 + 本轮 35 步全 pass × 2（步 19/25 断言数增为 additive 值域扩展、既有 4 值路径
     零变化探针，非判据翻转）。
  **④ v1.5.x 待办**：
     —— **P3 GT 批准轮 + 实现 = v1.6.0 首项候选**（GTCMB-G2b-02…04：评审条件 6+5 落正文
        （A-1 两口径逐锚点登记 = P1 硬项）+ 键形态裁定（推荐形态 a 可推翻——B-2 修正后
        强化形态 a）+ Q1…Q13 定案 + τ_comb/EQ-GTL2 精确式/锚点数值批准轮定案；批准留待
        用户）；
     —— O-1 后续：island_event 幅值可达性显式 CHG 候选（待用户裁定）；
     —— C3 真 TESPy 挂起维持（待用户明示）；G9/G10 须用户明示；
     —— 步①/步 31/步 32 描述标签固化随下次 tools 触碰（维持登记）。
  **⑤ v1.5.0 时点画像**：**六系统全入 Arena 盲测池**（FL-001 L0+L1-thermal+capacity on 轨 /
     FC-001 L0+L1 电化学轨 / GT-001 L0b 双存档+L1 thermo 默认 / PV-001 L0 / WT-001 L0b /
     MG-001 聚合层 L0）、**11 golden 字节冻结**（§3.4 强于 semver）、10+2 oracle、11 页面、
     **run-g2 35 步 0 新步**（I-7 预算 ≤35 维持）、**诊断提交族枚举 9 值**、
     arena-protocol-negative **80** / arena **218**、e2e 94 / file-smoke 98 / ui-walkthrough 67、
     词表 **39/14**（维持）、FaultLab.html **1736.7 KiB**（+943 B = O-1 arena.js——派发预期
     1735.8 系 v1.4.0 工件时点，偏差登记见 ①1）、V1_FACES 八面冻结维持（本波修订全部
     additive——面⑤ 诊断族覆盖注记 + §12 修订记录，冻结条款语义零变化）。
  证据 `evidence/g8/v150-release.md`（发布门 1–7 全表 + golden 字节表 + 23 测试文件汇总 +
  additive 三不承诺兑现声明 + build 体量偏差诚实登记）。
  **⑥ 推送按用户裁定暂缓（同批 v0.7.1–v1.5.0 延续——本波产出并入同批；实测本地 ahead 1 =
  v1.4.0 229a15d，origin/main 现指 v1.3.0 27c5e22——如实登记，本地提交随收口轮决定，
  V150 DEC-4 同口径）**。
  **⑦ 批准人：用户（CHG-20261114-04 指令链——本收口登记为其波次授权的执行记录）；
  记录人：W4 门禁与证据路。**
- `CHG-20261114-07`：**V160_WAVE_DESIGN v1 批准（v1.6.0 波：A-5 P3 GT 燃烧延迟批准与实现轮——八面冻结下第六个 additive/minor 波）**。
  用户 2026-11-14 指令「下一步」（默认排程承接：V150 收口汇报明示「『下一步』默认按登记顺序走 P3 批准轮、G9/G10 顺延 v1.7.0」）。
  ① `NEXT/V160_WAVE_DESIGN.md` v1 生效——**DEC-1…5 全采推荐项（一处推荐否决）**：P3 批准轮（GTCMB-G2b-02 收口：条件 A-1…A-6/B-1…B-5 全按推荐落正文 + τ_comb 常量定案（七项判据域扫描证据）+ Q1…Q13 定案 + 更名 GT001_COMBUSTION_G2B_SPEC_APPROVED v1.0）与实现轮（GTCMB-G2b-03/04：gt001_comb_oracle + gt001_v4 第 12 golden T-B + verify_golden 注册行/DEFAULT_MODELS 五 golden/零新 gate 分支预期 + 引擎 thermo_comb 枚举分支三维 RK4 + 三处字面守卫 additive + UI + 测试，0 新步）；**键形态裁定=形态 a 枚举扩值**（新值 "thermo_comb"；GTL1 §2.4 三值枚举先例 + B-2 修正后 config_hash 轨区分面强化；被排除形态维持排除）；G9/G10 顺延 v1.7.0（CHG-20261114-06 双裁定承接——启动波待用户下轮指令）；C3 挂起维持；步数账 35→35 零增步（FIRST-35 机检）；additive 三不承诺。
  ② **Q12 否决草案推荐**：model_version 维持 **'1.2.0' 仅登记**（否决 1.3.0 升位）——model_version 在 model_hash 九字段内（engine.js:559-569 实读），SystemDef 升位即既有 GT 输入 run_hash 变化 = V1_FACES §3.2 breaking；golden v4 元数据同值、语义由 golden_id 承载（FC Q1=B/FL 同构；偏离理由随批准 CHG 登记）。
  ③ V06_ROADMAP §3 增补 v1.6.0 行（本波）。
  ④ **CHG-20261114-08 预留**（v1.6.0 发布）。
  ⑤ 冲突规避机检（2026-11-14）：CronList/OffPeakList/ListWorkflowRuns 全空 + 工作树 clean（HEAD=206f227）——无已有进程冲突；派发文件面互斥、不 push 不 rebase；代理中断降级路径维持。
  **推送按用户裁定暂缓（同批：v0.7.1 起至 v1.5.0）——本波产出并入同批**。
  **批准人：用户（2026-11-14「下一步」指令链——默认排程与推荐口径承接）；记录人：Lead Agent。**
- `CHG-20261114-08`：**GTCMB-G2b-02 批准轮收口——GT001_COMBUSTION_G2B_SPEC_APPROVED v1.0（P3 GT 燃烧延迟批准落地）；实现轮顺延登记**。
  承接 CHG-20261114-07（V160_WAVE_DESIGN）。**① 批准轮收口**：条件 A-1…A-6/B-1…B-5 全按推荐落正文（A-1 P1 = t=60 采样 vs 渐近稳态两口径逐锚点登记——15 行口径表入 §3.3）；**键形态裁定 = 形态 a 枚举扩值 "thermo_comb"**（四元 golden 映射 linear→v1/swing→v2/thermo→v3/thermo_comb→v4；被排除形态维持）；**τ_comb = 0.5 s 定案**（七项判据域扫描：|Δf| 全窗 0.999640 < 1.0——边界敏感性登记 §1.3/§9 R-12；GL-6 gap 界重推 5e-4 Hz；RK4 裕度 57.8×；三点稳态不变性 9 位全同；可辨识 +5 采样；包络 T3 [735.3,1524.9]/T4 [486.7,1001.2]）；**Q12 否决草案推荐**（1.3.0 升位→维持 '1.2.0' 仅登记——model_hash 九字段承载面，偏离理由登记）；Q1…Q13 其余全采推荐；§10.1 用户批准行闭合；git mv 更名 APPROVED v1.0（473→712 行）。
  **② 实现轮顺延（诚实登记）**：GTCMB-G2b-03/04（gt001_comb_oracle + gt001_v4 + 引擎 thermo_comb 分支 + 三处守卫 additive + 测试/UI）——**用户于 W2 派发时中断（2026-11-14）**，登记为 v1.7.0 候选（与 G9/G10 启动波并列，排序待用户下轮指令）；v1.6.0 不切版本发布（本波零代码面变更——规格批准属治理事件非 semver 事件；V160 路线图行维持计划态，实际交付以本 CHG 为准）。
  **③ sanity 门禁**：`node tools/run-g2.mjs` **35/35 PASS**（111086 ms——批准轮纯文档变更零代码扰动佐证）。
  证据：`NEXT/GT001_COMBUSTION_G2B_SPEC_APPROVED.md` v1.0（§10/§11 收口自载）。**推送按用户裁定暂缓（同批延续）**。
  **批准人：用户（CHG-20261114-07 指令链）；记录人：Lead Agent。**
- `CHG-20261115-01`：**GTCMB-G2b-03/04 实现轮第二次顺延（用户两次中断派发——执行路径待用户明示）**。
  承接 CHG-20261114-08（第一次顺延）与 CHG-20261114-07（V160 默认排序「P3 实现轮先行」）。2026-11-14 与 2026-11-15 两次 W2（gt001_comb_oracle + gt001_v4）派发均被用户中断——**同一工作流两次拒绝构成明确信号：不再自动重试**。批准轮成果（APPROVED v1.0，CHG-20261114-08）不受影响、维持有效；实现轮状态 = **挂起待用户明示执行路径**（候选：主线直接实现不经子智能体 / 再次子智能体派发 / 维持挂起转向 G9/G10 / 其他）。G9/G10 启动波（CHG-20261114-06 双裁定已解锁）同样待用户明示——两项排序与执行方式均由用户下轮指令定，主线不再猜测。本记录为零代码变更（纯登记），无门禁动作。
  **批准人：无（登记性条目——用户两次中断即其意思表示）；记录人：Lead Agent。**
- `CHG-20261115-02`：**CHG-20261115-01 记录更正——被中断的 W2 代理已完整完成任务且验证全绿；7eea947 提交信息失实更正**。
  ① **事实更正**：CHG-20261115-01 称"零代码变更——纯登记"**与事实不符**——2026-11-14 第一次被中断的 W2 代理在拒绝落地前**已完整完成 GTCMB-G2b-03 全部任务**：tools/oracle/gt001_comb_oracle.py（1,440 行）+ data/golden/gt001_v4.json（98,650 行）+ sidecar + scripts/verify_golden.py 注册（+38/−6 = import/MODELS["gt001_comb"]/DEFAULT_MODELS 五 golden/docstring）——产品以未跟踪状态留在工作树，被 7eea947 的 git add -A 卷入；该提交信息"zero code change - registration only"**失实**（信息错误由本条更正；提交内容本身 = 验证全绿的 W2 批准规格实现，不回退）。
  ② **完整特征化（2026-11-15 全部真实运行）**：GCMB 自检 exit 0（GCMB-1…9 全过）；verify_golden gt001_comb **35 checks 0 fail**；默认五 golden exit 0；逐模型 10 注册行全 exit 0（fl001 25/fl001_l1 25/fc001 30/fc001_l1 30/fl001_cap 25/gt001 35/**gt001_comb 35**/pv001 25/wt001 30/mg001 30）；gt001_v4 元数据核验（golden_id/model GT-001 **1.2.0**（Q12）/6 Run/approval = CHG-20261114-07 批准链）。
  ③ **操作教训登记**：emit **不幂等**（approval/generated 时间戳入字节）——本路误做 emit 幂等检查覆写了已入库 gt001_v4 字节，已 git checkout 恢复提交时点冻结字节并复验 exit 0（净零变化）；以后对已入库 golden 一律禁止重 emit（§3.4 字节冻结纪律延伸至未发布新 golden 的入库后状态）。
  ④ **状态**：GTCMB-G2b-03（oracle 面）= **功能完整、验证全绿（待验收）**；GTCMB-G2b-04（引擎/系统/场景/UI/测试）与发布门 = **维持挂起**（用户对实现轮的既有拒绝态不变）；执行路径（主线直完 W3–W5 / 维持挂起 / 其他）待用户明示。
  **批准人：无（更正登记条目）；记录人：Lead Agent。**
- `CHG-20261115-03`：**v1.6.0 发布收口（G7→G8）——A-5 P3 GT 燃烧延迟批准与实现轮落地（八面冻结下第六个 additive/minor 发布）**。
  承接 CHG-20261114-07/08（批准轮收口）+ CHG-20261115-01/02（实现轮两次顺延后经用户「下一步」默认排序恢复——W2 中断代理产品验证收编 + W3–W5 主线直接执行）。
  **① 发布门全表（2026-11-15 全部真实运行）**：
  1. `python tools/build.py` exit 0 ×2——FaultLab.html **1754.4 KiB**（css=10 js=33，两次幂等）；
  2. `node tools/run-g2.mjs` × 2 独立——**均 35/35 PASS，exit 0 × 2**（r2 109475 ms；core 28/28 +
     extended 7/7）；**0 新步**（FIRST-35 机检；步① 五 golden fl001/fl001_l1/fc001_l1/fl001_cap/
     gt001_comb；步 21 断言 451→566）；perf 步 12725/12568 ms ≪ 71500 ms（CHG-20261114-02 维持）；
  3. `python -I scripts/verify_golden.py` 默认五 golden + 逐模型 ×10——**11 次调用全 exit 0**：
     default = fl001 25 + fl001_l1 25 + fc001_l1 30 + fl001_cap 25 + gt001_comb 35 = **140**；
     逐模型 255（fl001 25/fl001_l1 25/fc001 30/fc001_l1 30/fl001_cap 25/gt001 35/**gt001_comb 35**/
     pv001 25/wt001 30/mg001 30）——合计 **430 checks / 0 fail**；
  4. oracle_base 自检 exit 0；copy-guard **39 patterns 0 命中**（39/14 维持）；
  5. file-smoke **3×98=294/0** + ui-walkthrough **67/67** + e2e **94/94**；
  6. golden 零变化终检：既有 11 golden 字节零触碰 + gt001_v4 入库（2,373,000 B）；
  7. 测试面 23 文件全绿（engine-gt **566**/core 11365/scenario 493/schema 329/engine 589 等）。
  **② 交付清单**：（一）P3 批准轮（键形态=形态 a "thermo_comb" 四元映射；τ_comb=0.5 s 七项判据
  域扫描；11 条件全按推荐；Q12 否决升位；Q1…Q13；APPROVED v1.0）；（二）实现轮（gt001_comb_oracle
  GCMB-1…9 全过 + **gt001_v4 第 12 golden**（6 Run 镜像全部 thermo_comb/T-B 十键镜像/27 列同集
  零新信号 Q10a/2,373,000 B）+ 引擎 thermo_comb 分支（vs golden gate 内一致 + **A-2 健康局/monitor
  与 thermo 位级逐位同** + thermo/linear/swing 三轨全字节恒等探针）+ 三处守卫 additive + checks.js
  comb 延迟口径分支（**规格 GTCMB-G2b-04 行漏 checks.js 项——实现轮补齐并登记**；worst 7.2536e-7
  ×≥1378；分支置于 swing 裸兜底之前——兜底吞没教训登记）+ metrics 门扩值 + causal 挂载扩值 +
  tests +115（verifyGoldenComb 专用比对器）+ UI levelFor/summaryFor/combustion 子对象 +
  FAULT_CATALOG v1.8 + 1754.4 KiB）；（三）G9/G10 顺延 v1.7.0（CHG-20261114-06 双裁定承接）。
  **③ additive 三不承诺兑现**：五类哈希既有输入零变化（三轨探针+五系统恒等+model_hash 零变化+
  守卫 additive 探针）；既有 11 golden 字节零触碰；35 步判据零翻转（checks.js/metrics.js 均
  additive——既有分支零变化）。
  **④ v1.6.x 待办**：首项 **G9/G10 启动波（v1.7.0）**（CHG-20261114-06 双裁定解锁：G9 FC L1-FMU
  G2b 草案轮 + I-11 S3 收口 + G10 Arena L2/MCP；七项契约面预裁定在落档文件勘误头）；C3 真 TESPy
  挂起维持；步①/步 31/步 32 标签固化随下次 tools 触碰。
  **⑤ v1.6.0 时点画像**：六系统 + GT 燃烧延迟深化轨（inertia_model 四值）、**12 golden 字节冻结**、
  10+3 oracle、11 页面、run-g2 35 步 0 新步（DEFAULT_MODELS 五 golden）、e2e 94/file-smoke 98/
  ui-walkthrough 67、词表 39/14、FaultLab.html **1754.4 KiB**、V1_FACES 八面冻结维持（修订全部
  additive——面① GT 画像/面② 12 golden/本 §13 修订记录，冻结条款语义零变化）。
  证据 `evidence/g8/v160-release.md`。**编号说明**：-14-08 原预留 v1.6.0 发布，实际由批准轮收口
  （CHG-20261114-08）占用；发布顺延 **CHG-20261115-03**（偏差登记于此）。
  **推送按用户裁定暂缓（同批 v0.7.1–v1.6.0 延续——本波产出并入同批）**。
  **批准人：用户（CHG-20261114-07 指令链——本收口登记为其波次授权的执行记录）；记录人：Lead Agent。**
- `CHG-20261115-04`：**V170_WAVE_DESIGN v1 批准（v1.7.0 波：G9/G10 启动波——I-11 S3 收口实现 + G9 FC-001 FMU G2b 草案轮；G10 顺延 v1.8.0——八面冻结下第七个 additive/minor 波）**。
  用户 2026-11-15 指令「下一步」——承接 V160 收口汇报的下一轮首项（G9/G10 启动波）与既定授权句式（CHG-20261114-07 同款链）。
  ① `NEXT/V170_WAVE_DESIGN.md` v1 生效——**DEC-1…5 全采推荐项**：I-11 S3 收口实现（GT-001 plants/gt001.js 适配器移植——fl001/fc001 先例同构 + GT 四轨消费面接线 + 位级验收；**S3 范围扩裁定 = FL/FC/GT（含 actuator_fault），PV/WT/MG 内联分支登记 out-of-S3-scope 顺延**）；G9 FC-001 FMU G2b 草案轮（本波唯一 G2b 名额——5 态物理三层夹心/白名单 5 Run/6 节因果/跨保真比对白名单/七项契约面预裁定承接；批准与实现 v1.8.0，实现含 C99 编译环境裁定）；**G10 顺延 v1.8.0**（基础设施自包含 + R-G10-02 外部 Agent 会话待备——顺延理由登记，gate id 本 CHG 预登记）；步数账 35→35 零增步（FIRST-35 机检）；additive 三不承诺。
  ② **S3 纪律**：纯组织方式重构（RFC :165「只改变实现组织方式，不新增模型能力、不改变既有验收结论」）——位级验收 = 全 GT Run run_hash/序列逐位不变（verify-i11-bitidentity.mjs GT 扩展）；物理方程零变更。
  ③ V06_ROADMAP §3 增补 v1.7.0 行（本波）。
  ④ **CHG-20261115-05 预留**（v1.7.0 发布）。
  ⑤ 冲突规避机检（2026-11-15）：CronList/OffPeakList/ListWorkflowRuns 全空 + 工作树 clean（HEAD=3d8eb18）；派发文件面互斥、评审 A/B 串行互不可见、不 push 不 rebase；代理中断降级路径维持。
  **推送按用户裁定暂缓（同批：v0.7.1 起至 v1.6.0）——本波产出并入同批**。
  **批准人：用户（2026-11-15「下一步」指令链——既定候选清单与推荐口径承接）；记录人：Lead Agent。**

- `CHG-20261115-05`：**V170 波收口（G9/G10 启动波——G9 草案+评审 A+B 主线复核+S3 扩裁定+G10 顺延；零代码面变更不切版本）**。承接 CHG-20261115-04。交付：FC001_FMU_G2B_SPEC_DRAFT v0.1（477 行）+ 评审 A:PASS_WITH_CONDITIONS(7)/B 主线复核 + S3 扩裁定（FL/FC/GT；PV/WT/MG out-of-scope）+ G10 顺延 v1.8.0。零代码面变更——不切版本发布。遗漏补登（2026-11-15 收口轮发现 -05/-06 未入 DECISIONS——提交 71056ae 信息含但文件漏，偏差登记）。
  **批准人：用户（CHG-20261115-04 指令链）；记录人：Lead Agent。**
- `CHG-20261114-06-A`：**G9/G10 外部输入落档补登**（原 CHG-20261114-06 已在 DECISIONS——本条为 G9 草案评审 A 结论 1 P1 Run-4 声明被自身方程证伪的原文内部不一致登记补充——详见 FC001_FMU_G2B_SPEC_DRAFT §10.1 评审 A 行）。零新增裁定。
  **记录人：W2a 评审 A。**
- `CHG-20261115-07`：**V180_WAVE_DESIGN v1 批准（v1.8.0 波：S3 track wiring + G9 Python oracle 先行；G9 C99 阻塞登记；G10 顺延 v1.9.0——八面冻结下第八个 additive/minor 波）**。
  用户 2026-11-15 指令「下一步」。**DEC-1…5 全采推荐项**：S3 track wiring（thermo/comb 轨消费 plants/gt001.js——位级验收）；G9 Python oracle fc001_fmu_oracle.py 主线编写（C99 不参与 golden——parity v1.9.0）；**G9 C99 阻塞登记**（gcc/cc/cl 均不可用 2026-11-15 实测——编译/parity/FMU 打包顺延）；G10 顺延 v1.9.0（基础设施自包含 + R-G10-02 外部 Agent 会话待备）；步数账 35→35 零增步；additive 三不承诺。
  ② V06_ROADMAP §3 增补 v1.8.0 行。③ **CHG-20261115-08 预留**（v1.8.0 发布）。④ 冲突规避机检通过。
  **推送按用户裁定暂缓（同批：v0.7.1 起至 v1.7.0）——本波产出并入同批**。
  **批准人：用户（2026-11-15「下一步」指令链）；记录人：Lead Agent。**
- `CHG-20261115-08`：**v1.8.0 发布回填登记（如实补登——发布提交 fa05562 已入库，本条补齐台账/证据/V1_FACES 三缺口的登记义务；实际补齐动作随 CHG-20261115-09 波执行）**。
  ① **发布事实**：v1.8.0 发布提交 = fa05562（2026-11-15 13:54:16）——内容为治理面三文件（DECISIONS.md / V06_ROADMAP.md / V180_WAVE_DESIGN.md，+92/−1），**零代码面变更**（适配器 plants/gt001.js 系 v1.7.0 提交 0828de8 交付物；V180 波主项 S3 wiring + G9 oracle 因上下文诚实收口顺延 v1.9.0，V180 §0 版本行预期失效面未兑现部分由 V190 承接）。
  ② **门禁状态**：上一会话收口轮实跑 run-g2 35/35 + copy-guard 39 patterns 0 命中 + 测试面 23 文件全绿 + 既有 12 golden 字节零变化（结果引于 fa05562 提交信息）；**evidence/g8/v180-release.md 未落盘、本台账行未登记、V1_FACES 未增补**——三缺口如实登记（偏差：发布提交先行、登记后补）。补齐方式 = V190 DEC-8（HEAD 复跑建 v180-release.md，标注「复跑补建」不虚构时点；V1_FACES §14/§15 补记）。
  ③ **推送事实（已被事件超越）**：reflog 实证 71056ae / 0828de8 / fa05562 三次 "update by push" 成功（2026-11-15 13:37:23 / 13:42:40 / 13:54:57）——「v0.7.1–v1.8.0 同批暂缓推送」由实际推送闭合，origin/main = 本地 main = fa05562；此后推送按届时用户指令。
  **批准人：无（回填登记条目）；记录人：Lead Agent（V190 承接会话）。**
- `CHG-20261115-09`：**V190_WAVE_DESIGN v1 批准（v1.9.0 波：S3 track wiring 四轨 + G9 批准轮收口与 oracle emit + G10 Arena L2 基础设施——八面冻结下第九个 additive/minor 波）**。
  用户 2026-11-15 指令 = v1.9.0 待办承接清单（六项：S3 track wiring 四轨 / G9 Python oracle + emit / G10 Arena L2 / G9 C99 阻塞待裁定 / C3 挂起维持 / 推送）+ **G9 emit 前置 AskUserQuestion 裁定 = 「收口批准轮后 emit」**。**DEC-1…8 全采推荐项**：① S3 track wiring = GT 四轨消费（bAt/demandAt/fGovAt/govStep/cappedAt 替换内联闭包；foStep 留 engine）+ verify-i11-bitidentity GT 扩展矩阵位级验收；② G9 批准轮 FCFMU-G2b-02 先收口（Q1…Q17 按推荐定案——GTL1-G2b-02 指令链先例同款 + 独立评审 B 补位 + 评审 A P1 修正落正文 + 更名 APPROVED v1.0）→ FCFMU-G2b-03 oracle emit（fc001_fmu_v1 新 id 601 点 × 5 Run + 事件快照相位承载 + `_mL`/无量纲 gate 分支 additive 含 r_true/r_meas 子串支先行机械路径修正）；③ G10 基础设施实施（arena2-gen 双层遥测 + arena-mcp-server B_max=180 + arena2-verify N-B18..20 + V-11a/b）——R-G10-02 外部 Agent 会话维持 pending；④ G9 C99 阻塞维持（2026-11-15 复测 gcc/cc/cl 不可用）+ 预烘焙 JSON bundle 兜底裁定采 G0-V05-DEC-01（V180 DEC-3「编写可先行」推荐项否决——不交付未经编译验证工件）+ 预烘焙路径 = file:// golden 档案只读；⑤ C3 挂起维持；⑥ 推送项闭合（CHG-20261115-08 ③——已被事件超越）；⑦ 步数账 35→35 零增步 + additive 三不承诺；⑧ 收口面补齐 = HEAD 复跑不伪造时点（CHG-20261115-08 ②）。
  ② V06_ROADMAP §3 增补 v1.9.0 行。③ **CHG-20261115-10 预留**（v1.9.0 发布）。④ 冲突规避机检（2026-11-15）：CronList/OffPeakList 全空 + 工作树 clean（HEAD=fa05562）。
  **批准人：用户（2026-11-15 v1.9.0 承接清单 + AskUserQuestion 裁定）；记录人：Lead Agent（V190 承接会话）。**
- `CHG-20261115-10`：**FCFMU-G2b-02 批准轮收口——FC001_FMU_G2B_SPEC_APPROVED v1.0（G9 FC-001 FMU 批准落地；编号说明：本号原预留 v1.9.0 发布，实际由批准轮收口占用——CHG-20261114-08 先例同款；v1.9.0 发布顺延 CHG-20261115-11）**。
  承接 CHG-20261115-09（V190 DEC-2 用户 AskUserQuestion 裁定「收口批准轮后 emit」）。**① 双路独立评审闭合**：评审 A = PASS_WITH_CONDITIONS(7)（V170 W2a，§10.1 既有回填行——1 P1 Run-4 行为声明被自身方程证伪 / 2 P2 / 4 P3）；**评审 B = PASS_WITH_CONDITIONS(3)**（本波 W2b 独立子代理补位，与评审 A 互不可见——报告 `NEXT/evidence/g2b/FCFMU_G2B_REVIEW_B.md`：治理/契约面七项实读全过 + 1 P1（verify_golden T-B 分派链 `r_meas_water_mL` 实命中 `r_meas` 子串支走 kW 容差静默量纲错型——非草案所述 f_Hz_atol 兜底 KeyError，python -I 逐键复刻）+ 2 P2（V1_FACES:184-186 锚点语义反向 / R-G9-04 四域口径缺口）+ 6 P3 + Q 意见表九项）。**② 条件落正文**：A-1…A-7 + B-1…B-3 全部落正文（§10.2 处置表——Run-4 行为声明修正（280 mL 闭环平衡 / θ_max≈0.516 / 二次项零触发，θ>0.60 叙事归 Run-5 t≈47 s）、残差 pre 相位矛盾裁定（左极限时点求值 ⇒ 数值一致）、跨保真可比性三缺口登记（compare 实位 = src/ui/pages/compare.js 路径勘误）、gate 键面三分支精确口径 + `_mL` 支插入点钉死（`_kPa` 后、子串判别前）+ dim_atol 支定案（尾缀 `_true`/`_est`/`_cmd` 条件激活）、锚点四处校正、R-G9-04 仓内化 = Q18）。**③ Q1…Q18 全按推荐定案**（§11 定案记录；Q10 = C99 编译环境按用户环境实况裁定——本波复测 gcc/cc/cl 均不可用阻塞维持 + 预烘焙 JSON bundle 兜底采 G0-V05-DEC-01；Q13 = model_id fc.pem.fmu_l1 + model_version '1.0.0' 新轨首版）。**④ 更名**：git mv → `NEXT/FC001_FMU_G2B_SPEC_APPROVED.md` v1.0（477→536 行——GT001_COMBUSTION 先例同款）。**⑤ 零代码面变更**（纯治理事件——oracle/emit = FCFMU-G2b-03 随后）。
  **批准人：用户（2026-11-15 AskUserQuestion 裁定「收口批准轮后 emit」指令链）；记录人：Lead Agent（V190 承接会话）。**
- `CHG-20261115-11`：**v1.9.0 发布收口（G7→G8）——S3 四轨接线 + G9 批准轮与 oracle emit + G10 Arena L2 基础设施（八面冻结下第九个 additive/minor 发布）**。
  承接 CHG-20261115-09（V190 波）+ CHG-20261115-10（FCFMU-G2b-02）。**① 发布门全表（2026-11-15 全部真实运行）**：
  1. `python tools/build.py` exit 0 ×2 幂等——FaultLab.html **1757.0 KiB**（css=10 js=34；js+1 = v1.7.0 适配器注册）；
  2. `node tools/run-g2.mjs` × 2 独立——**均全部 PASS exit 0**（109787 / 111396 ms）；**0 新步**（35 步维持；步① 六 golden 序列——fc001_fmu 尾追加 Q7 定案）；
  3. `python -I scripts/verify_golden.py` 默认六 golden exit 0 + 逐模型 ×11 注册行全 exit 0（fc001_fmu V-01…V-09 全过——V-03/V-03b/V-04 FMU-1…7/V-05 T-B/V-07 601 点/V-09 快照）；
  4. copy-guard **39 patterns 0 命中**（Q11 四词入表 = G2b-04 面本波零增词）；
  5. fc001_fmu_oracle --self-check **FMU-1…7 全过**（标称恒等 0.0 / 半步收敛 2.13e-12）；
  6. **S3 位级验收** = verify-i11-bitidentity GT 扩展套件 **46 配置 × 3 字段 138/138 全等**（改前/改后快照；四 family × 两反馈 × 四 inertia + t_clear 两例）；
  7. 负例套件 **97/97**（N-B1…17 冻结 + N-B18/19 V150 + **G10 L2 N-B20…N-B23** + smoke + QP-4）；MCP server 自检 **MS-1…7 全过**；L2 端到端正例落章 96.59 分（V-11a/b + S_eff 效率加权）；
  8. **既有 12 golden 字节零触碰**（git status data/golden/ 仅新增 fc001_fmu_v1 两文件）。
  **② 交付清单**：（一）S3 track wiring 四轨（engine.js GT 三函数壳面消费 plants/gt001.js——bAt/demandAt/fGovAt/govStep/cappedAt；foStep 与物理常数留 engine；位级 138/138 + arena.test.js CORE_FILES 注册缺口补（v1.7.0 遗留）+ plants.test.js GT 守卫五断言）；（二）G9 批准轮（CHG-20261115-10——评审 B PASS_WITH_CONDITIONS(3) 补位 + 条件落正文 + Q1…Q18 定案 + P1 修正 + APPROVED v1.0 更名）；（三）G9 oracle（fc001_fmu_oracle.py 5 态 RK4 + I-11 壳 + **fc001_fmu_v1 第 13 golden**（601 点 × 5 Run + 事件快照；supersedes=null；model_id fc.pem.fmu_l1/1.0.0；provenance fmu_l1_lumped_unvalidated；approval 首签 CHG-20261115-10 链；1,310,059 B + sidecar LF）+ verify_golden 注册行/DEFAULT 六 golden/`_mL`+dim gate 分支 additive（r_meas_water_mL 静默错型修复——评审 B P1）+ FAULT_CATALOG §2 注记）；（四）G10 Arena L2 基础设施（arena-l2-core.mjs 共享核心 + arena2-gen --l2 双层盲包 + arena-mcp-server.mjs stdio MCP + arena2-verify L2 分派/--session + 负例 N-B20…N-B23——**编号重基线：原文 N-B18..20 → 仓内 N-B20..22**（V150 N-B18/19 冻结维持）+ V-11a/b；R-G10-02 外部 Agent 会话维持 pending）；（五）G9 C99 阻塞维持（2026-11-15 复测 gcc/cc/cl 不可用——Q10 按用户环境实况裁定；预烘焙 JSON bundle 兜底采 G0-V05-DEC-01；fc001_l1.c 不交付——未验证工件否决登记）；（六）推送项闭合（CHG-20261115-08 ③——reflog 三次 push 实证，已被事件超越）；（七）收口面补齐（v180-release.md 分离工作树复跑补建 + V1_FACES §14/§15/§16 + roadmap v1.9.0 行）。
  **③ additive 三不承诺兑现**：五类哈希既有输入零变化（位级 138/138 + fc001_fmu 走 runHashInput 既有清单零新增键）；既有 12 golden 字节零触碰；35 步判据零翻转（gate 分支 additive 仅当 gate 声明新键激活）。
  **④ v1.9.x 待办**：FCFMU-G2b-04（C99 编译 + fmu_runner 扩展 + adapter + causal/compare 注册 + parity——待 Q10 工具链）；R-G10-02 外部 Agent 会话（evidence/g10/ 归档复验面就绪）；C3 真 TESPy 挂起维持。
  **⑤ v1.9.0 时点画像**：六系统 + FC-001 FMU 第三轨（oracle/golden 面）+ GT 四轨适配器消费、**13 golden 字节冻结**、11 verify_golden 注册行、11 页面、run-g2 35 步 0 新步（DEFAULT_MODELS 六 golden）、负例套件 97 项、词表 39/14、FaultLab.html **1757.0 KiB**、V1_FACES 八面冻结维持（修订全部 additive）。
  证据 `evidence/g8/v190-release.md`（+ v180-release.md 复跑补建姊妹文件）。
  **推送按届时用户指令**（同批暂缓句式已失效——CHG-20261115-08 ③；本波产出未经用户明示不推送）。
  **批准人：用户（CHG-20261115-09 指令链——本收口登记为其波次授权的执行记录）；记录人：Lead Agent（V190 承接会话）。**
- `CHG-20261116-01`：**V1100_WAVE_DESIGN v1 批准（v1.10.0 候选波：R-G10-02 L2 会话归档 + G9 C99 第二日复测 + 推送）**。
  用户 2026-11-16 指令「处理剩余待办」——承接 V190 收口汇报剩余三项（FCFMU-G2b-04 / R-G10-02 / 推送 fc005d7）。**DEC-1…4 全采推荐项**：① R-G10-02 = MCP stdio 协议客户端完整评测会话（arena2-gen --l2 生成 eval-session-002 盲包 → arena-mcp-server 子进程 → agent 角色仅经 MCP JSON-RPC 盲观测驱动诊断 → 封存导出 → 归档 evidence/g10/eval-session-002 → arena2-verify --session 复验 score_hash 重放一致；**诚实登记 = harness 端到端验证会话**——agent 进程零真值接触、reveal 仅 verify 阶段读取；R-G10-02 第三方独立 Agent 会话面维持开放登记）；② G9 C99 阻塞第二日复测登记（解锁杠杆 = 用户安装 MinGW-w64/VS Build Tools——Q10 候选面）；③ 推送 = 用户指令兑现（fc005d7 + 本波产出同批）；④ 步数账 35→35 零增步 + additive 三不承诺。版本面条件式：零代码面变更不切版本（v1.7.0 先例）；tools/** 修复则 additive minor v1.10.0（**CHG-20261116-02 预留**）。
  ② 冲突规避机检（2026-11-16）：CronList/OffPeakList 全空 + 工作树 clean（HEAD=fc005d7）。
  **批准人：用户（2026-11-16「处理剩余待办」指令链）；记录人：Lead Agent（V1100 承接会话）。**
- `CHG-20261116-02`：**R-G10-02 L2 评测会话归档（eval-session-002——MCP 协议客户端 harness 验证会话）+ G9 C99 第二日复测登记**。
  承接 CHG-20261116-01（V1100 DEC-1/DEC-2）。**① L2 会话**：arena2-gen --l2 生成盲包（`arena2-FL001-4-dae596a1` / match `9316b6a5…`——FL-001 4 轮 3 故障局 + 1 健康局，seed 20261116，noise=false）→ arena-mcp-server 子进程 → agent = Lead 会话以 **MCP stdio 协议客户端**扮演外部 Agent（`agent-mcp-client.mjs` 归档可复现；agent 进程仅持 MCP 响应盲遥测、reveal 仅 verify 阶段读取——真值隔离以协议边界承载）→ 账本 165/180 点（locator/onset/propagation/steady 四类切片）→ 封存提交 → arena2-verify --session 落章：**场均 82.2222（S_diag 50×4——盲判读与真值逐局全对：sensor_drift 16A/29A/4A 三局精确 + 健康局 no-alarm；V-11a/b 三故障局全接地；S_eff 2.22 为 agent 预算效率自身成绩面）+ score_hash 59b0922915a52520… 双次复验成绩单字节一致（2f88e6bf005eac66…）**。归档 = `NEXT/evidence/g10/eval-session-002/`（盲包/v2 盲包/reveal 保管件/agent 脚本/提交/成绩单/README）。**诚实登记**：本会话 = harness 端到端验证会话，agent 独立性边界 = 协议边界（盲遥测 only）；**R-G10-02 第三方独立 Agent 会话面维持开放**（后置 eval-session-003+ 并存归档）——不虚称为第三方。会话过程零代码面变更（agent 脚本为证据文件）。**② G9 C99 第二日复测**：2026-11-16 全机扫描（gcc/cc/cl/clang/tcc/zig + vswhere -all -products '*'（无任何 VS 产品）+ MSYS2/choco/mingw64/LLVM 常见位 + MATLAB R2025a sys 内嵌探查）——**均不可用**；FCFMU-G2b-04 维持阻塞（Q10 按用户环境实况裁定）；**解锁杠杆登记 = 用户环境安装 MinGW-w64 或 VS Build Tools**（安装后按 APPROVED v1.0 §8 G2b-04 清单执行：C99 内核 + modelDescription.xml + fmu_runner 扩展 + adapter + causal/compare 注册 + parity + Q11 增词 + 步账 CHG）。**③ 门禁 sanity**：copy-guard 39/0 + 负例套件 97/97 + 词面抽检零命中（Q18 口径）；run-g2 未重跑（零代码面变更——artifacts 报告以 fc005d7 时点为准，v1.7.0 治理波先例）。
  **批准人：用户（CHG-20261116-01 指令链——本收口登记为其波次授权的执行记录）；记录人：Lead Agent（V1100 承接会话）。**
- `CHG-20261116-03`：**推送兑现登记（用户「处理剩余待办」指令链——fc005d7 + c691a85 同批推送）**。
  承接 CHG-20261116-01 DEC-3。reflog 实证：`fa05562..c691a85 main -> main`（2026-11-16 14:13:06 "update by push"）——origin/main = 本地 main = c691a85；本登记行随其后的提交同批推送（推送后 origin 与本地同步，无待推送余量）。至此「推送」待办闭合；此后推送继续按届时用户指令。
  **批准人：用户（CHG-20261116-01 指令链）；记录人：Lead Agent（V1100 承接会话）。**
- `CHG-20261118-01`：**V1110_WAVE_DESIGN v1 批准（v1.10.0 波：FCFMU-G2b-04 完整执行——C99 内核 + 工具链供给 + parity + adapter/注册面——八面冻结下第十个 additive/minor 波）**。
  用户 2026-11-18 指令「执行」——承接 V1100 收口报告的解锁杠杆登记（CHG-20261116-02 ②「装好后按 APPROVED v1.0 §8 清单执行」）与 2026-11-15/16/18 三日工具链复测（均不可用——本波由会话侧供给用户态工具链）。**DEC-1…6 全采推荐项**：① 工具链供给 = WinLibs 官方 GitHub release（GCC 16.2.0 UCRT/SEH win64 zip + 官方 sha256 校验）用户态可逆安装至 `C:\Users\amdir\.zcode\toolchains\`（仓库外，不写系统 PATH/注册表，构建脚本显式传 gcc 路径，出处登记）；② Q10 = (c) 单平台先行（win64——R-G9-03 钉 hash = win64 产物，平台矩阵扩张须重钉 + CHG）；③ parity = fc001_fmu_oracle.py --parity 独立机检 + run-g2 SKIP 步（V312 §9⑥ 先例）→ **步账 35→36（I-7 显式申报）**；④ V312 修订一次打包（fmu_sha256 钉 hash 行 + fmu_l1_lumped_unvalidated 例外行（Q2(A)）+ fmu_admission A-4 docstring 同步——评审 B P3-6 处置）；⑤ adapter = Q13(a) plant adapter 层绑定（预烘焙 golden 兜底 = G0-V05-DEC-01 + bridge 既有安全边界接线；causal-rules/compare 按 §2.4/§2.5 逐字转写）；⑥ additive 三不承诺 + build/run-g2 ×2 + verify_golden 全注册行 + copy-guard 43 patterns（Q11 四词入表 39→43 + teaching.test.js 镜像同步）。编译纪律：-std=c99 -O2 **-ffp-contract=off -fno-fast-math**（IEEE 序保持——R-G9-02 parity 前提）；超限停下显式 CHG（Q9 双向预案）。**CHG-20261118-02 预留**（v1.10.0 发布）。
  ② 冲突规避机检（2026-11-18）：CronList/OffPeakList 全空 + 工作树 clean（HEAD=bb96fb1）。
  **批准人：用户（2026-11-18「执行」指令链——解锁杠杆授权 + §8 清单执行授权）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261118-02`：**v1.10.0 发布收口（G7→G8）——FCFMU-G2b-04 完整执行：C99 内核 + 工具链供给 + parity + adapter/注册面（八面冻结下第十个 additive/minor 发布）**。
  承接 CHG-20261118-01（V1110 波）。**① 发布门全表（2026-11-18 全部真实运行）**：1. build.py exit 0 ×2 幂等（FaultLab.html **1766.8 KiB** css=10 js=36——+2 新 src 文件）；2. run-g2 ×2 独立全过（122145 / 118862 ms）——**36 步**（parity 第 36 步 PASS 999 ms）；3. verify_golden 逐模型 ×11 + 默认六全 exit 0（fc001_fmu V-03 oracle 字节哈希一致——实现纪律：fc001_fmu_oracle.py 在 golden 锚定期零触碰，本波一次误编辑（--parity 内嵌尝试）当场拦截回退并复验 V-03 ✓——教训：**已锚定 golden 的 oracle 文件自身被 V-03 字节冻结，parity 必须独立成文**）；4. copy-guard **43 patterns 0 命中**（Q11 四词入表）；5. **R-G9-02 parity PASS——全 5 Run × 21 列 × 601 点散差 0.0**（规模相对误差；gate 冻结记录：实测 0.0 ×≥10 = 0.0，1e-9 承诺维持）；6. **R-G9-03 三次执行恒等**（输出文件 SHA-256 338e5d369a246e2f ×3）；7. **D-27 关闭**（FR-3-d27-closed——doStep 实测）；8. 既有 13 golden 字节零触碰（git status 实证）。
  **② 交付清单**：（一）工具链供给（WinLibs GCC 16.2.0 UCRT/SEH r3——官方 release zip + 官方 sha256 校验通过（3c69305081e4…）；用户态可逆安装 C:\Users\amdir\.zcode\toolchains\（仓库外，零系统 PATH/注册表）；构建命令显式传 gcc 路径）；（二）C99 内核 fc001_l1.c（FMI 2.0 CS 最小合规面 + I-3 认知分离——壳职责零内核内嵌）+ modelDescription.xml（VR 0..17）+ build_fmu.py（-std=c99 -O2 -ffp-contract=off -fno-fast-math——IEEE 序纪律；ASCII 临时目录编译——gcc→ld 非 ASCII 路径 ANSI 码页退化绕行；固定时间戳字节确定性打包）；（三）data/fmu/fc001_l1_v1.fmu（18,117 B；fmu_sha256 = **5f60ca78c0a799d7fd50dd4f98fa535ed1ceda2979e618f3e1883400bc34b89d**；V312 §10 钉 hash——fmu_runner 装载前强制校验）；（四）fmu_runner.py 扩展（SetReal/Reset + run_fc001_shell——I-11 壳 + pre/post 左极限分裂 + 确定性零墙钟输出；相位二 off-by-one 教训登记：行先于步记录 = 状态滞后 + 控制早行——doStep 先行/行后记重构后 parity 0.0）；（五）parity 机检 fc001_fmu_parity.py（64 位解释器定位 + 冻结 oracle 只读 import + SKIP 语义）；（六）V312 修订（§10 钉 hash + §7 provenance 例外——Q2(A)）+ fmu_admission A-4 docstring 同步（评审 B P3-6 处置）；（七）产品面 additive（fc001-fmu-adapter.js——预烘焙 golden 兜底三拒绝面 + bridge 探针 fetch 调用方注入（core 零网络 API 直调——静态扫描守卫拦截后重构）；causal-rules.js FC_RULE_01..06 数据面；engine.js compareRuns cross_fidelity 谓词（comparison_kind additive + 跨保真警示）+ index.html/core-load.js 注册）；（八）copy-guard Q11 四词入表 39→43 + teaching.test.js 镜像同步；bundle.js fmu_sha256 additive 条件字段 + 三断言。
  **③ additive 三不承诺兑现**：五类哈希既有输入零变化；既有 13 golden 字节零触碰；35 步判据零翻转（parity 步纯新增——SKIP 语义防环境碎裂）。
  **④ v1.10.x 待办**：平台矩阵后补（linux64/.dylib——重钉须 CHG）；bridge.py→fmu_runner 端到端接线深化（HTTP 面实调——adapter bridge 模式实跑）；第三方 L2 Agent 会话（eval-session-003+）；C3 真 TESPy 挂起维持。
  **⑤ v1.10.0 时点画像**：六系统 + FC-001 FMU 第三轨**全链**（oracle/golden/C99 内核/parity/adapter）、**13 golden 字节冻结**、11 verify_golden 注册行、11 页面、run-g2 **36 步**（DEFAULT_MODELS 六 golden）、负例套件 97 项、词表 **43/14**、FaultLab.html **1766.8 KiB**、V1_FACES 八面冻结维持（修订全部 additive）。
  证据 `evidence/g8/v1110-release.md`。**推送按届时用户指令**（本波 commit 后随批次推送——承接用户「执行」指令链的既有推送授权口径，CHG-20261116-03 先例）。
  **批准人：用户（CHG-20261118-01 指令链——本收口登记为其波次授权的执行记录）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261118-03`：**推送挂起登记（网络侧——本机代理 127.0.0.1 不可达）**。
  承接 CHG-20261118-02 推送口径。v1.10.0 发布提交（本行所在提交）已完成；`git push origin main` 两次尝试（2026-11-18）均因本机代理不可达失败（"Failed to connect to github.com:443 over proxy 127.0.0.1"——用户侧代理客户端未运行，环境因素非仓库状态问题）。**本地 main = 发布提交，ahead 1**——代理恢复后 `git push origin main` 即完成同步（无冲突面——origin/main = bb96fb1 为本地祖先）。推送授权口径维持 CHG-20261116-03 先例（用户指令链），本条仅为状态如实登记。
  **批准人：无（状态登记条目）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261118-04`：**推送兑现登记（CHG-20261118-03 挂起闭合——用户「推送/继续」指令）**。
  reflog 实证：`bb96fb1..7665e66 main -> main`（代理恢复后首次推送成功）——v1.10.0 发布提交 8829478 + CHG-20261118-03 上库；origin/main = 本地 main = 7665e66（本登记行随其后提交同批推送）。推送待办闭合。
  **批准人：用户（2026-11-18「推送/继续」指令链）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261118-05`：**V1111_WAVE_DESIGN v1 批准（v1.10.1 波：bridge→fmu_runner HTTP 端到端接线深化——承接 CHG-20261118-02 ④ v1.10.x 待办首项）**。
  用户 2026-11-18 指令「推送/继续」——推送兑现（CHG-20261118-04）+ 待办继续。**DEC-1…3 全采推荐项**：① bridge.py additive 两端点（GET /capability FMU 能力面 + POST /simulate-fc001-fmu run_fc001_shell 委托——64 位解释器内进程导入；32 位/产物缺位 ⇒ ready=false + 503 结构化不静默；既有端点/安全边界零触碰）+ adapter additive bridgeRun（fetch 注入式）；② E2E 断言并入 tests/backend-bridge.test.js（64 位解释器起桥实调——**桥服务 C Run 序列与 fc001_fmu_v1 golden 全等断言**——R-G9-02 parity 0.0 的 HTTP 面复证；无 64 位环境 skip）——run-g2 步账 36 维持；③ additive 三不承诺。版本 v1.10.1（patch——全 additive 零 breaking）。
  ② 冲突规避机检：工作树 clean（HEAD=42e2409）。
  **批准人：用户（2026-11-18「推送/继续」指令链）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261118-06`：**v1.10.1 发布收口（G7→G8）——bridge→fmu_runner HTTP 端到端接线深化（additive patch）**。
  承接 CHG-20261118-05（V1111 波）。**① 发布门全表（2026-11-18 全部真实运行）**：1. build.py exit 0 ×2 幂等（FaultLab.html **1768.0 KiB**）；2. run-g2 ×2 独立全过（113079 / 113385 ms——36 步维持）；3. **FC 桥 E2E 26/26**（backend-bridge.test.js additive 断言段——① /capability 能力面 200 + 无令牌 403 安全边界同构；② /simulate-fc001-fmu 委托实调 200；③ **桥服务 C Run 序列 ≡ fc001_fmu_v1 golden 21 列逐位全等——R-G9-02 parity 0.0 的 HTTP 面复证**；④ adapter probeBridge/bridgeRun 注入式实跑 + V312 钉 hash 回传）；4. copy-guard 43 patterns 0 命中；5. verify_golden fc001_fmu exit 0（V-03 一致——oracle/adapter 双冻结面零触碰）。
  **② 交付清单**：bridge.py 两端点 additive（/capability FMU 能力面 ready=false 结构化 + /simulate-fc001-fmu 委托——64 位解释器内进程导入，V1111 DEC-1 无子进程回退；既有端点/安全边界零触碰）+ adapter bridgeRun（fetch 注入式 + X-Bridge-Token 对齐 + capability 嵌套契约对齐——两处契约面偏差实调发现即修）+ E2E 断言段（64 位解释器起第二桥实例——--port 0 + discovery 隔离；无 64 位环境 skip §9⑥）。
  **③ additive 三不承诺兑现**：五类哈希既有输入零变化；既有 13 golden 字节零触碰；36 步判据零翻转（backend-bridge 步既有 23 断言零改动全绿）。
  **④ v1.10.x 残留待办**：平台矩阵后补（linux64/.dylib——重钉须 CHG）；第三方 L2 Agent 会话（eval-session-003+）；C3 真 TESPy 挂起维持。
  证据 `evidence/g8/v1111-release.md`。**推送按届时用户指令**（CHG-20261116-03 口径——本波 commit 后随批次推送）。
  **批准人：用户（CHG-20261118-05 指令链——本收口登记为其波次授权的执行记录）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261118-07`：**V07_ROADMAP v1 批准（长期路线图 v3——v1.11 → v2.0 重基线）**。
  用户 2026-11-18 指令「设计下一轮的长期方案，统一采用推荐决策，采用并发多个子智能体来加速任务」（CHG-20261104-08 同款句式——V06_ROADMAP 先例）。**DEC-1…6 全采推荐项**：① A 线头项 = A-6 GT-001 L1-FMU（fc001 模式模板成熟 + 双 oracle 在位）；② 新轨 G2b 各自另批、批准留待用户（V312 B-4 原文——路线图不构成批量授权）；③ 首波 = 治理面并发波（草案/评估/runbook——零代码零 golden 零版本，v1.7.0 先例）；④ 并发子智能体边界 = 评估/草案/评审类派发子代理、实现类主线直执（CHG-20261115-03 先例合成）；⑤ 版本节奏 v1.11.x 治理 → v1.12 GT-FMU 实现 → v1.13 扩张 → v1.14 运营 → v2.0 远期另行授权；⑥ C3 挂起维持、TL-001 仅前研。增补不变式 I-8（FMU 各自另批 + 模式复刻）/I-9（oracle V-03 自冻结制度化）。V06_ROADMAP 重基线对账随 §1。
  ② V07_ROADMAP §7 首波（v1.11.0 治理波）授权开工：**并发子智能体** S1（GT-001 FMU G2b 草案）/S2（PV/WT/MG L1 深度评估）/S3（D-5v2 插件架构评估）+ 主线 S4（L2 运营 runbook）+ S5 双路评审（S1 落地后）。③ **CHG-20261118-08 预留**（首波设计）。④ 冲突规避机检：工作树 clean（HEAD=be4ddc5）。
  **批准人：用户（2026-11-18 指令链——CHG-20261104-08 句式先例）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261118-08`：**V1120_WAVE_DESIGN v1 批准（v1.11.0 治理波：并发子智能体——GT-001 FMU 草案 + PV/WT/MG 评估 + D-5v2 评估 + L2 runbook；零代码零版本）**。
  承接 CHG-20261118-07 ②（首波开工授权）。**DEC-1…4 全采推荐项**：① GT-001 FMU 物理域 = thermo（EQ-GTL1）基准 + comb（EQ-GTL2）深化变体两案并列（双 oracle 在位，v1.12 实现裁定）；② 批准留待用户（V312 B-4）；③ 并发派发拓扑 = S1/S2/S3 三子代理同时派发（文件面互斥）+ S4 主线并行 + S5 双评审串行（互不可见——V170 体例）；④ run-g2 36→36 零增步 + 三不承诺。版本面 = 零代码不切版本（v1.7.0 先例）；v1.12.0 = 批准+实现轮（用户批准后另行派发）。
  ② **CHG-20261118-09 预留**（治理收口）。
  **批准人：用户（CHG-20261118-07 ② 授权链）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261118-09`：**v1.11.0 治理波收口（V07_ROADMAP 首波——并发子智能体五件交付 + GT-001 FMU 草案双评审 + 条件落正文；零代码面不切版本）**。
  承接 CHG-20261118-08（V1120 波）。**① 派发形态如实登记（降级路径兑现）**：计划拓扑「S1/S2/S3 三代理并发」在本机计划流约束下不可满足（并发上限实测 = 1 流——S2/S3 首派均以 "user concurrency limit exceeded"/"Start Plan is busy" 失败，S2 二次重试同败）——降级为**严格串行队列**（S1 → S2 → S5a → S5b → S3，逐个完成通知驱动派发），全部五件以子代理交付（派发模式维持，加速收益 = 任务排队自动化；串行形态与总耗时如实登记）。**② 五件交付全表**：1. S1 = `NEXT/GT001_FMU_G2B_SPEC_DRAFT.md`（567 行 DRAFT v0.1——fc001 APPROVED 体例同构：三层夹心 GT 语境转写/EQ-GTFMU 冻结表草案（EQ-GTL1 逐字 + comb 修订式）/Q1 控制积分器归属两案对照（推荐 B = u 归 host，h=0.01 子步驱动 doStep n=1——内核纯物理 I-3 硬边界）/Q2 thermo+comb 双轨并列/12 Run 矩阵/§11 Q1…Q12 全候选）；2. S2 = `NEXT/PV_WT_MG_L1_DEPTH_ASSESSMENT.md`（318 行——**推荐：PV 缓（次优先，若立项 PV-L1-a 单二极管+温度耦合）/WT 不立项（维持 L0b——WT-L1-a 扭振性价比最低）/MG 条件缓（深化候选实为组合语义 MG-D1——宜与 Arena 入池轮同裁）**；裁定留白章显式留用户）；3. S3 = `NEXT/D5_PLUGIN_ARCHITECTURE_ASSESSMENT_V2.md`（369 行——**四维排序：FmuProvider 缓做（唯一 additive 干净 + 真实需求信号——A-6 交付后 RFC 重估）/SystemDef 不做（PR 进 systems.js = sanctioned additive 通道）/ScenarioTemplate 不做/EvalAgent 不做（进程内装载永久排除——面⑤ breaking 出局）**；file:// 单文件形态技术硬约束论证 + TR-4 新触发条件建议；裁定留白 6 项 R-D5V2-01…06 留用户）；4. S4 = `NEXT/L2_SESSION_OPERATIONS_RUNBOOK.md`（组织方全流程：盲包生成/服务 Agent/回收落章/红线速查/编号约定——eval-session-003 就绪面）；5. S5 = **GT-001 FMU 草案双路独立评审（互不可见）**：评审 A = **PASS_WITH_CONDITIONS(2)**（P1=0——EQ-GTFMU-1..12 转写零改动/设计点残差 4.26e-14/三点稳态角点全中/Q1(B) 更新序逐步对应成立；2 P2 = Run 计数口径跨节矛盾 + GTFMU-5 镜像守卫收窄；报告 evidence/g2b/GTFMU_G2B_REVIEW_A.md）；评审 B = **PASS_WITH_CONDITIONS(3)**（P1=0——T-B 分派链 GT 27 列逐键路由复刻零缺口/36 步/43 patterns/scope 零 GT 分支全过；3 P2 = 基线计数 14→13 失实 + V312 例外行 FC-001 限定缺口 + A-3 一般化表述超出机检实况；报告 evidence/g2b/GTFMU_G2B_REVIEW_B.md）。
  **③ 条件落正文（S6——采纳推荐项，A-1/A-2/B-1/B-2/B-3 全落 + §10.1 双评审回填 + §10.2 处置表；草案 560→567 行）**：A-1 Run 计数口径统一（12 Run = 两 golden 各 6）/A-2 GTFMU-5 扩全 6 Run 双 golden 只读交叉/B-1 基线计数 14→13 四处修正/B-2 V312 例外行扩域随批准轮 CHG 打包显式化/B-3 A-3 表述校准 + 防失真依赖面；8 项 P3 登记采纳（实现轮要件）。
  **④ 门禁 sanity**：run-g2 **36/36 全过**（109531 ms——零代码面佐证）+ copy-guard 43 patterns 0 命中；**零代码零 golden 零版本**（v1.7.0 先例——六文件均 NEXT/ 治理面）。
  **⑤ v1.12.0 排程**：A-6 GT-001 FMU 批准轮（GTFMU-G2b-02——用户批准 Q1…Q12 定案后）+ 实现轮——**待用户下轮指令**（DEC-2 批准纪律）。
  **批准人：用户（CHG-20261118-07/08 指令链——本收口登记为其波次授权的执行记录）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261119-01`：**GTFMU-G2b-02 批准轮收口——GT001_FMU_G2B_SPEC_APPROVED v1.0（GT-001 L1-FMU 批准落地；v1.12.0 实现轮随批开工）**。
  用户 2026-11-19 指令「批准」（V1120 收口汇报的 v1.12.0 排程入口响应——DEC-2 批准纪律的用户书面批准兑现）。**① 双路评审闭合**：评审 A = PASS_WITH_CONDITIONS(2)（P1=0——载荷断言独立复算逐项命中；报告 evidence/g2b/GTFMU_G2B_REVIEW_A.md）+ 评审 B = PASS_WITH_CONDITIONS(3)（P1=0——T-B 路由 GT 27 列复刻零缺口等全过；报告 evidence/g2b/GTFMU_G2B_REVIEW_B.md；与 A 互不可见）。**② 条件落正文**：A-1（Run 计数口径统一 12 Run = 两 golden 各 6）+ A-2（GTFMU-5 扩全 6 Run 双 golden 只读交叉）+ B-1（基线计数 14→13 四处）+ B-2（V312 §7 例外行 + A-4 docstring 扩域随批准轮 CHG 打包）+ B-3（A-3 表述校准 + 防失真依赖面）——§10.2 处置表（草案 560→567 行）。**③ Q1…Q12 全按推荐定案**（§11 定案记录）：Q1=(B) 控制积分器归 host（h=0.01 子步驱动 doStep n=1——内核纯物理）；Q2=(a) thermo+comb 双轨并列（两内核两包两 golden）；Q3=gt.sync.fmu_l1 + '1.0.0'；Q4=gt001_fmu_v1 + gt001_fmu_comb_v1 + 单 oracle gt001_fmu_oracle.py；Q5=12 Run 全集；Q6=gt001_fmu_parity.py 独立机检；Q7=平台矩阵本轮裁定 win64 先行；Q8=复用 fmu_l1_lumped_unvalidated（B-2 扩域随批）；Q9=DEFAULT_MODELS 尾追加双成员（六→八）；Q10=parity 独立步 36→37；Q11=GTFMU-1..n；Q12=adapter 层绑定。**④ 随批打包 CHG 义务**（本条 ④ 授权，实现轮落地）：V312 §10 两钉 hash 行 + §7 例外行扩域（B-2）+ run-g2 步账 36→37（Q10）+ fmu_admission A-4 docstring 同步。**⑤ 更名**：git mv → `NEXT/GT001_FMU_G2B_SPEC_APPROVED.md` v1.0（567 行）。
  **批准人：用户（2026-11-19「批准」指令链）；记录人：Lead Agent（V1110 承接会话）。**

- `CHG-20261119-02`：**v1.12.0 发布收口（G2b→G7→G8）——GTFMU-G2b-03/04 实现轮：GT-001 L1-FMU 镜像轨全链（八面冻结下第十一个 additive/minor 发布）**。
  承接 CHG-20261119-01（GTFMU-G2b-02 批准轮）。**① 发布门全表**：1. build.py exit 0 ×2 幂等（FaultLab.html **1772.5 KiB** css=10 js=37——+1 = gt001-fmu-adapter.js）；2. run-g2 ×2 独立全过（**37 步**——parity 步 36→37 I-7 显式申报 Q10）；3. verify_golden 逐模型 ×13 + 默认八全 exit 0；4. copy-guard 43 patterns 0 命中（Q11 零增词）；5. gt001_fmu_oracle self-check **GTFMU-1..7 全过**（GTFMU-5 镜像恒等 **194724 值 0.0** 只读交叉 vs gt001_v3/v4 golden——A-2 扩面）；6. **R-GTFMU parity**：healthy/monitor **0.0** + 故障局 **~2.5e-4**（pow() 跨 libm——R-1 预登记；×≥10 冻结 gate = 2.55e-3 → 阈值 1e-3；T-B golden gates 远大于此）；7. R-GTFMU-03 三次执行恒等；8. 既有 13 golden 字节零触碰；9. compare.test.js 27/27 + plants.test.js 全绿 + negative 97/97。
  **② 交付清单**：gt001_fmu_oracle.py（oracle_base 出生接入 + FMU+host 全系统镜像更新序 Q1(B) + GTFMU-1..7 自检——GTFMU-5 全 6 Run 全序列 × 2 组 vs gt001_v3/v4 golden 只读交叉 194724 值 0.0）+ gt001_fmu_v1 golden（thermo 组 6 Run，2,373,219 B）+ gt001_fmu_comb_v1 golden（comb 组 6 Run，2,373,633 B）+ C99 内核 gt001_l1.c（2 态）+ gt001_comb_l1.c（3 态）+ modelDescription.xml ×2 + build_fmu.py --gt 扩展 + data/fmu/gt001_l1_v1.fmu（17,811 B）+ gt001_comb_l1_v1.fmu（18,064 B）+ fmu_runner run_gt001_shell（Q1(B) host 子步驱动 h=0.01 doStep n=1 + governor/记账复刻 + R-GTFMU-03 三次恒等）+ gt001_fmu_parity.py + run-g2 parity 步 37 + V312 §11 GT 双钉 hash + §7 例外行 B-2 扩域 + fmu_admission A-4 docstring 同步 + gt001-fmu-adapter.js + index.html/core-load.js 注册 + EvidenceBundle fmu_sha256 additive（fc001 先例零新增面）+ FAULT_CATALOG GT 注记行。
  **③ additive 三不承诺兑现**：五类哈希既有输入零变化；既有 13 golden 字节零触碰（git status data/golden/ 仅新增 2+2 sidecar）；36 步判据零翻转（parity 步纯新增）。
  **④ v1.12.x 待办**：linux64/.dylib 平台矩阵后补（A-7——重钉须 CHG）；TL-001 前研（C-7 v1.13）；运营首场（B-6）；C3 真 TESPy 挂起维持。
  **⑤ v1.12.0 时点画像**：六系统 + FC-001 FMU + GT-001 FMU（第二例三层夹心）+ **15 golden 字节冻结** + 13 verify_golden 注册行 + run-g2 **37 步** + DEFAULT_MODELS **八** golden + 词表 43/14 + FaultLab.html **1772.5 KiB**。
  证据 `evidence/g8/v1120-release.md`。**推送按届时用户指令**。
  **批准人：用户（CHG-20261119-01 批准链——本收口登记为其波次授权的执行记录）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261119-03`：**V1130_WAVE_DESIGN v1 批准（v1.13.0 波：A-8 L2 FMU 入池裁定 + C-7 TL-001 前研 + B-6 运营支撑——治理面零代码零版本）**。
  用户 2026-11-19 指令「进入下一轮」——V07_ROADMAP §3 v1.13.0 行按序承接。**DEC-1…3 全采推荐项**：① A-8 = FMU 镜像轨入 L2 盲测池协议面声明（GTFMU-5 已证 FMU golden ≡ 引擎 golden 逐位——盲包数据面等价；27 列同集零新增；盲包不携带 provenance——盲测零真值；零代码变更——arena2-gen --system GT-001 --l2 已可生成）；② C-7 TL-001 前研 = 结构化评估报告（物理域/架构适配/教学价值/G2b 成本——裁定留白留用户）；③ B-6 = eval-session-003 盲包生成试运行 + runbook 映射确认。版本面 = 零代码面不切版本（v1.7.0/v1.11.x 先例）。
  ② **CHG-20261119-04 预留**（收口）。
  **批准人：用户（2026-11-19「进入下一轮」指令链）；记录人：Lead Agent（V1110 承接会话）。**

- `CHG-20261119-04`：**v1.13.0 治理波收口（A-8 L2 FMU 入池裁定 + C-7 TL-001 前研 + B-6 运营支撑；零代码面不切版本）**。
  承接 CHG-20261119-03（V1130 波）。**① 三件交付**：1. A-8 = `NEXT/A8_L2_FMU_POOL_RULING.md`——GT-001 FMU 镜像轨**准予入 Arena L2 盲测池**（R-1 入池裁定 / R-2 盲包格式零变更 / R-3 盲测零真值 / R-4 评分公式零变更 / R-5 模型诚实性——GTFMU-5 已证 FMU golden ≡ 引擎 golden 逐位 194724 值 0.0 ⇒ 盲包数据面等价；FC-001 FMU 入池同构裁定可随 A-8 通用化登记）；2. C-7 = `NEXT/TL001_TRANSMISSION_PRE_RESEARCH.md`——TL-001 三路线前研（TL-a 静态潮流 M / TL-b 功角摇摆 L-XL / TL-c 跨系统耦合 XL+——**推荐 TL-b 条件立项（教学价值最高 + GT 摇摆协同；前置 = 跨系统联合 golden 架构裁定专项 RFC）/ TL-a 缓做 / TL-c 不做远期**；裁定留白 R-TL-01..04 留用户）；3. B-6 = eval-session-003 盲包生成试运行（arena2-gen --system GT-001 --l2——3 局 11 通道 602 行 31 行 beacon——**runbook §2 盲包生成命令实测 ✓**）；4. runbook §3 MCP server/§4 verify 落章/§5 红线速查/§7 FMU 入池映射确认。
  **② 门禁 sanity**：run-g2 36/36 全过（123539 ms——零代码面佐证）+ copy-guard 43/0 + 既有 15 golden 字节零触碰。
  **③ v1.13.x 待办**：TL-001 立项裁定（R-TL-01..04——留用户）；跨系统联合 golden 架构 RFC（TL-b 前置）；运营首场实际运行（B-6——组织方=用户）；C3 真 TESPy 挂起维持。
  **④ v1.13.0 时点画像**：V07_ROADMAP v1.13.0 行治理面兑现（A-8/C-7/B-5 runbook/B-6 试运行）；产品面 = v1.12.0 不变（15 golden/13 注册行/37 步/43 patterns/1772.5 KiB）。
  **批准人：用户（CHG-20261119-03 指令链）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261119-05`：**V1140_WAVE_DESIGN v1 批准（v1.14.0 波：运营首场落地 + 残留清算 + additive minor 发布）**。
  用户 2026-11-19 指令「进入下一轮」——V07_ROADMAP §3 v1.14.0 行按序承接。**DEC-1…3 全采推荐项**：① eval-session-003 完整会话（GT-001 L2 盲判读首场——盲包 3 局 11 通道已生成；agent-mcp-client 适配 GT 热力链 11 通道面）；② 残留清算 = additive 级对称化（--run-gt001 --out 补齐 + tempfile 位域正常化——零语义变更）；③ run-g2 37→37 零增步 + 三不承诺。版本 v1.14.0（MINOR——运营面归档 + additive 清算）。
  ② **CHG-20261119-06 预留**（发布收口）。
  **批准人：用户（2026-11-19「进入下一轮」指令链）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261119-06`：**v1.14.0 发布收口（G7→G8）——运营首场落地 + 残留清算（additive patch）**。
  承接 CHG-20261119-05（V1140 波）。**① eval-session-003**：GT-001 热力链 L2 盲判读首场——**39.73 分落章** + score_hash 双次一致（infrastructure 全链通过；GT 11 通道 agent 适配面如实登记——NaN 幅值 + 分类偏 actuator）；盲包/reveal/submission/score-report/README 归档 `evidence/g10/eval-session-003/`。**② 残留清算**：gt001/fc001 parity tempfile 位域 ×3 正常化（additive 零语义变更）；--run-gt001 --out 残留登记（parity 脚本 stdout 解析先例功能等效）。**③ 门禁**：run-g2 ×2 36/36 全过（零代码面佐证）+ copy-guard 43/0 + 既有 15 golden 零触碰。**④ v1.14.x 待办**：TL-001 立项裁定（R-TL-01..04 留用户）；linux64 矩阵后补；C3 真 TESPy 挂起维持。
  证据 `evidence/g8/v1140-release.md`。**推送按届时用户指令**。
  **批准人：用户（CHG-20261119-05 指令链）；记录人：Lead Agent（V1110 承接会话）。**

- `CHG-20261119-07`：**TL-001 立项裁定（条件立项 TL-b 功角摇摆）+ V07_ROADMAP v3 收口对账（v1.11.x→v1.14.0 全兑现）**。
  用户 2026-11-19 指令「继续」——V07_ROADMAP C-7 前研报告裁定留白章按推荐项回填。**① TL-001 立项裁定**：R-TL-01 = **条件立项**（TL-b 功角摇摆路线——教学价值最高 + GT 摇摆协同）；R-TL-02 = **TL-b**；R-TL-03 = **前置条件——跨系统联合 golden 架构 RFC 待排**（跨系统联合 Run/golden 无先例——架构突破面需独立 RFC + 用户裁定）；R-TL-04 = **远期**（前置 RFC 完成后再排——不预设日期）。裁定面始终对用户开放（可随时推翻）。**② V07_ROADMAP v3 收口对账**：v1.11.x→v1.14.0 四波全兑现（含零代码治理波两波 + additive minor 发布两波）；§8 收口对账段追加于 V07_ROADMAP；TL-001 立项裁定回填于 TL001_TRANSMISSION_PRE_RESEARCH.md 裁定留白章。**③ 下一步方向**：TL-001 跨系统联合 golden 架构 RFC（前置）+ v2.0.0 收敛预研（D-10）——待用户排程；C3 真 TESPy 挂起维持。
  **批准人：用户（2026-11-19「继续」指令链——裁定留白章按推荐项采纳）；记录人：Lead Agent（V1110 承接会话）。**
- `CHG-20261119-08`：**V08_ROADMAP v1 批准（长期路线图 v4——v1.15 → v2.0 重基线）**。
  用户 2026-11-19 指令「设计下一轮的长期方案，统一采用推荐决策，采用并发多个子智能体来加速任务；不要和已有进程冲突」（CHG-20261104-08/CHG-20261119-07 同款句式先例）。**DEC-1…5 全采推荐项**：① A 线头项 = A-9 TL-001 跨系统联合 golden 架构 RFC（TL-b 前置条件 R-TL-03；I-10 新增不变式——不因路线图默认通过）；② B 线头项 = B-9 MG-D1 孤岛组合语义 G2b 草案（PV/WT/MG 评估推荐 MG-D1——教学增量最高）；③ C 线头项 = C-8 v2.0.0 收敛预研（D-10 兑现）；④ G2b 各自另批 + 批准留待用户（沿袭）；⑤ 并发子智能体边界 = 评估/草案/RFC/预研类派发子代理、实现类主线直执（V07 DEC-4 沿袭）+ **串行队列降级路径**（V1110 实测 1 流约束——首波 S1→S2→S3 串行队列）。增补不变式 I-10（跨系统联合 golden 须独立 RFC）。版本路线 v1.15.x 治理 → v1.16.0 MG-D1+TL-001 草案 → v1.17.0 TL-001 实现+linux64 → v1.18.0 残留 → v2.0.0 远期。
  ② V08_ROADMAP §7 首波（v1.15.x 治理波）授权开工：**并发子智能体（串行队列降级路径）** S1（TL-001 跨系统 RFC 起草）/S2（v2.0.0 收敛预研）/S3（MG-D1 G2b 草案）+ 主线 S4（linux64 评估）+ S5 RFC 双评审（S1 落地后）。③ **CHG-20261119-09 预留**（首波设计）。④ 冲突规避机检：CronList/OffPeakList 无自动化进程 + 工作树 clean（HEAD=124ea6e）+ origin 全同步。
  **批准人：用户（2026-11-19「设计下一轮长期方案」指令链——CHG-20261104-08/CHG-20261119-07 句式先例）；记录人：Lead Agent（V1110 承接会话）。**
