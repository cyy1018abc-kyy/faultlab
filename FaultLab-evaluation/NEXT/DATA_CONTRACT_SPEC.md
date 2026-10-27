# DATA_CONTRACT_SPEC — FaultLab V0.2 数据契约 v1（P0 基线）

> **状态**：`G0-APPROVED`（用户 2026-10-27T20:35 指令批准"产出文档并对齐 docs 到本次决策"）。
> **权威顺序**：`DECISIONS/DECISIONS.md` → 本文件 → `docs/CONTRACT.md`（实现契约）→ 既有实现。
> 本文件与 DECISIONS 冲突时以 DECISIONS 为准；本文件未定义字段前，实现不得自行发明公共字段。
> **适用范围**：P0 基线 = `FL-001` × 3 固定 Run（`baseline` / `closed_loop_fault` / `monitor_only`）×
> 5 逻辑视图 × 事件 pre/post × 导出/重载。FC/GT/Arena 的字段可复用本契约，但须另行评审。
> **被替代/补充的对象**：`docs/CONTRACT.md` §4 的字段定义以本文件为准；不一致时以本文件为准，
> 并在 `docs/CONTRACT.md` 的「附录 G0 对齐记录」登记。
> **版本**：`contract_version = "v1"`；`schema_version = "1.0.0"`；生成 2026-10-27。
> **依据**：G0-DEC-05/06/07/08/09/10/11，REVIEW_DIFF B01/B02/B05/B06/B07/B08/B14，CODEX_REVIEW §5，
> NUMERIC_ORACLE §6，CLAUDE_REVIEW §7；数值口径见 `MODEL_VALIDATION_SPEC.md`。

---

## 0. 阅读须知

1. 本契约定义**对象 → 字段 → 不变式 → 校验/错误码 → 序列化/哈希 → 导入/导出**全链路。
2. 所有字段名区分大小写；单位一律显式（不依赖字段名暗示，但字段名保留 `_A/_kW/_pct/_pp/_s` 后缀）。
3. "必须"= P0 验收项；"建议"= 可后置；"禁止"= 违反即 FAIL。
4. 任何对象都**不得**把真值（`MODEL_STATE`/`FAULT_EVENT`）与观测（`OBSERVATION`）合并到同一无标注字段；
   `source_kind` 与 `exposure` 是必填元数据（G0-DEC-11）。
5. 本文件不定义产品物理（见 `MODEL_VALIDATION_SPEC.md`），不定义 UI 文案（见 `UI_COPY_GUARDRAILS.md`）。

---

## 1. 通用约定

### 1.1 版本三元组

| 字段 | 语义 | 变更规则 |
|---|---|---|
| `schema_version` | 数据对象结构版本（本文件 `1.0.0`） | 字段增删/语义变更 → 升 minor/major |
| `model_version` | 物理模型定义版本（FL-001 `fl001.1`） | 方程/参数/事件语义任一变更 → 升版并重建 golden |
| `engine_version` | 实现版本（`0.1.0`） | 代码行为变化 → 升版；数值变化须同时升 `model_version` |
| `bundle_schema_version` | 证据包格式版本（`v1`） | 导出/导入格式变化 → 升版并保证 `n-1→n` 迁移 |

运行结果必须与三元组同时绑定：`RunManifest.engine_version / model_version / schema_version`；
对比页的"模型/时钟/初始条件一致"检查必须比较三元组，而非只比 `model_version`。

### 1.2 单位字典（量纲注册表）

| unit | 量纲 | 说明 | 显示精度（建议） |
|---|---|---|---|
| `A` | 电流 | 放电为正 | 4 dp |
| `kW` | 功率 | 瞬时 | 4 dp |
| `kWh` | 电能 | 积分 | 6 dp |
| `V` | 电压 | 理想母线 | 1 dp |
| `s` | 时间 | 仿真秒 | 1 dp |
| `%` | 百分比 | SOC 绝对量 | 5–6 dp |
| `pp` | 百分点 | **差值**（如 SOC_est−SOC_true） | 5–6 dp |
| `Hz` / `rpm` / `pct` | 扩展（GT） | 非 P0 | — |

**禁止**：`pp` 与 `%` 混用；`kW` 与 `kWh` 混用；无单位数值进入导出包；用字符串"%"作为单位值。
**校验**：`unit ∈ 字典` 且与字段映射表一致（见 §8 字段级验收）。量纲检查拒绝 `A`↔`kW` 等不兼容运算。

### 1.3 ID 与命名

| 对象 | 规则 | 示例 |
|---|---|---|
| `run_id` | `RUN-<6位base36>-<config_hash 前8位>`；全局唯一、只增 | `RUN-8K2M1A-1f3c9d20` |
| `event_id` | `EV-<序号>`，每 Run 内唯一 | `EV-001` |
| `signal_id` | 大写下划线，含单位后缀；一次定义永久稳定 | `I_bat_true_A` |
| `metric_id` | 大写下划线 | `E_bat_true_60s` |
| `check_id` | `PHY-xx` / `SOC-xx` / `UNIT-xx` / `CONS-xx` | `PHY-01` |
| `role` | `baseline` / `fault` / `monitor` / `imported` | `baseline` |

### 1.4 时间基准（B01/N-02）

- `t[i] = i * dt_s`（`i=0..600`，`dt_s=0.1`）；**禁止**用累加生成（浮点累加会得到 20.000000000000014）。
- 固定 `duration_s=60`、`dt_s=0.1`、`n_samples = duration_s/dt_s + 1 = 601`（由参数派生，**禁止硬编码 601**）。
- 事件时刻 `t_f=20.0`；`i_f = round(t_f/dt_s) = 200`；`t[i_f]` 为 **post** 语义。
- `pre` 相位不是采样行：它是 `t→t_f` 的**左极限**（见 §2.5）。
- P1 若允许改 `dt_s`：必须由参数派生 `n_samples`、`i_f`，重建 golden，并升 `model_version`。

### 1.5 数值、精度与舍入

- 存储：IEEE-754 double，全精度；导出 CSV 用**最短往返表示**（ECMAScript `Number::toString` 语义，
  禁止固定 15 位截断造成往返误差）。
- 显示：按字段 `precision` 四舍五入（`round-half-up`），不得截断；`-0` 显示为 `0`；`NaN/±Infinity` 禁止出现。
- 积分：能量/SOC 以解析（事件感知）积分作为 golden；数值求积仅敏感性，`method_id` 必填（见 §2.6）。
- 显示与存储分离：**不得**把显示值写回数据/证据包。

### 1.6 `source_kind` 与 `exposure`

`source_kind`（沿用 V0.1 §9）：`CONFIG` | `MODEL_STATE` | `OBSERVATION` | `CONTROLLER` | `FAULT_EVENT` | `DERIVED` | `MODEL_ASSUMPTION`。

`exposure`（G0-DEC-11 新增）：

| exposure | 演示 UI | blind 投影 | demo 证据包 | 默认映射 |
|---|---|---|---|---|
| `blind_observable` | 可见 | **包含** | 包含 | `OBSERVATION` 默认；被 Agent 可观测的 `CONFIG`/`CONTROLLER` |
| `public_demo` | 可见 | 排除 | 包含 | `MODEL_STATE`/`FAULT_EVENT`/`DERIVED`/`MODEL_ASSUMPTION` 默认 |
| `truth_only` | 仅内部/审计（UI 不直接展示） | 排除 | 排除 | `run.truth.*`、`config.fault.*` 等真值载荷 |

**规则**：`exposure` 由 ModelManifest 声明、engine 复制进 Run，UI **不得**自行改值；所有"真值→页面"
访问必须经过 `project()`（§6）。

---

## 2. 对象定义

> 通用格式：用途 / 生成者 / 消费者 / 字段 / 不变式 / 示例。P0 对象以 `*` 标注。

### 2.1 `ScenarioConfig` *（生成者：配置/默认；消费者：ModelEngine）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `schema_version` | string | `"1.0.0"` | |
| `model_id` | string | `"fl001"` | P0 固定 |
| `model_version` | string | `"fl001.1"` | |
| `duration_s` | number | 60（P0） | |
| `dt_s` | number | 0.1（P0） | |
| `fault_time_s` | number | 20.0；`round(t_f/dt)` 必须精确对齐 | |
| `bias_A` | number | P0 固定 `+10`；P1 范围见 MODEL_VALIDATION_SPEC | |
| `feedback_mode` | enum | `closed_loop` / `monitor` | |
| `initial_SOC_pct` | number | 60 | |
| `initial_load_kW` | number | 30 | `P_load_demand` |
| `noise` | object\|null | P0 为 `null` | `{seed, level}` 仅扩展 |

**不变式**：`t_f < duration_s` 且 `(t_f/dt_s)` 为整数；值域合法；`P0 固定参数`不允许被 UI 静默钳位
（非法即 `invalid_config`）。**规范化**后（键排序、默认值填充、数值最短往返）计算 `config_hash`。

### 2.2 `ModelManifest` *（模型资源；消费者：首页/解释/校验）

| 字段 | 类型 | 说明 |
|---|---|---|
| `model_id` / `model_version` | string | `fl001` / `fl001.1` |
| `equation_id` | string[] | `["I_true_closed","I_true_monitor","I_meas_bias","P_bat","P_gen_balance","SOC_coulomb"]` |
| `unit_system` | string | `"SI-derived: A,kW,kWh,V,s,%,pp"` |
| `assumptions` | `{id,text}[]` | 例：`A-ideal-bus`、`A-ideal-gen`、`A-no-noise`、`A-coulomb-soc` |
| `limits` | string[] | 未建模物理清单（见 MODEL_VALIDATION_SPEC §2） |
| `claims` | object | `{model_provenance:"analytical_demo", model_validation:"not_performed", hardware_verification:"not_performed"}` |
| `default_exposure` | `{source_kind: exposure}` | §1.6 默认映射 |
| `engine_compatibility` | string[] | `["0.1.x"]` |

### 2.3 `SignalCatalog` / `SignalDescriptor` *（模型资源；消费者：图表/检查器/导出）

| 字段 | 类型 | 说明 |
|---|---|---|
| `signal_id` | string | 唯一、稳定 |
| `label` | string | 中文 UI 名 |
| `unit` | string | §1.2 字典内 |
| `source_kind` | enum | §1.6 |
| `exposure` | enum | `blind_observable`/`public_demo`/`truth_only` |
| `category` | enum | `current`/`power`/`soc`/`residual`/`actuator`/`frequency` |
| `definition` | string | 公式或口径（可直接引用 equation_id） |
| `precision` | number | 显示小数位 |
| `chart` | object | `{axis:'left'|'right', step:boolean, style:'solid'|'dashed'|'dashdot'}` |
| `tableOnly` | boolean | 仅表格模式展示 |
| `blindVisible` | boolean | **兼容字段**（= exposure 是否为 blind_observable；由 exposure 派生，禁止独立设置） |

**不变式**：`source_kind=MODEL_STATE|FAULT_EVENT` 默认 `public_demo`（演示可公开，blind 排除）；
`source_kind=OBSERVATION` 默认 `blind_observable`；信号一旦发布，`signal_id` 不得重命名（只能新增）。

### 2.4 `TimeSeries` *（ModelEngine；消费者：所有页面/导出）

```text
TimeSeries {
  schema_version: "1.0.0",
  t: number[601],                          // t[i] = i*dt_s
  signals: { [signal_id]: number[601] },   // 全部有限值；无 NaN/Inf
  meta: { dt_s, duration_s, n_samples, unit_ref: "unit_dictionary.v1" }
}
```

**不变式**：`t.length === n_samples`；每个信号同长；`t` 严格递增；`t[i]=i*dt_s`（1e-9 容差）；
`i_f=round(t_f/dt)` 行的值按 **post** 解释；**20− 不在 TimeSeries 内**，只在 `EventSnapshot.pre`。

### 2.5 `EventSnapshot` *（EventEngine；消费者：事件回放/图表/导出）— B01

| 字段 | 类型 | 约束 |
|---|---|---|
| `schema_version` | string | `"1.0.0"` |
| `snapshot_id` | string | `${event_id}-${phase}` |
| `event_id` | string | |
| `phase` | enum | `"pre"` / `"post"` |
| `t_s` | number | **恒为事件时刻 20.0**（不是 19.9） |
| `derivation` | enum | `"left_limit"`（pre）/ `"post_sample"`（post） |
| `variables` | `{[signal_id]: number}` | 该相位全部信号值（含 `I_bat_true_A`、`I_bat_meas_A`、`bias_A`） |
| `units` | `{[signal_id]: unit}` | 与 SignalCatalog 一致 |
| `fault_id` | string | 引用 `config.fault.faultId` |

**预置值（FL-001 默认）**：`pre → {I_bat_true_A:25, I_bat_meas_A:25, bias_A:0}`；
`post → {I_bat_true_A:25, I_bat_meas_A:35, bias_A:10}`。
**不变式**：主键 `(event_id, phase)`；同一 event 必须 pre+post 成对；`pre` 不得写成 19.9；
**导出**：`timeseries.csv` 的 `t=20.0` 行 = post；`events.json` 同时含 pre/post；冲突时以 events 为准，
`manifest.event_encoding_version = 1`。

### 2.6 `DerivedMetric` *（Metrics；消费者：对比页/报告/导出）— B07

| 字段 | 类型 | 说明 |
|---|---|---|
| `metric_id` | string | 如 `E_bat_true_60s`、`SOC_err_end_pp` |
| `label` / `unit` | string | 中文名 / §1.2 单位 |
| `value` | number\|null | `null` 表示不可用 |
| `precision` | number | 显示位 |
| `time_window_s` | `[number, number]` | 必须显式（如 `[0,60]`、`[20,60]`） |
| `method` | enum | `analytic_flux`（P0 golden）/ `trapezoid` / `substep` |
| `method_version` | string | 如 `analytic_flux.1` |
| `source_signal_ids` / `source_run_ids` | string[] | 可追溯 |
| `unavailable_reason` | string\|null | 当 `value=null` 必填 |
| `blindSafe` | boolean | 盲测投影是否允许包含（真值类指标为 `false`） |
| `definition` | string | 公式/口径文本 |

**P0 指标集**：`E_bat_true_60s`、`E_gen_true_60s`、`E_load_served_60s`、`SOC_true_end_pct`、
`SOC_est_end_pct`、`SOC_err_end_pp`、`max_abs_r_true_kW`、`max_abs_r_meas_kW`、`focal_change_A`
（时间窗 `[20,60]`）、`I_true_26s_A`、`I_meas_20post_A`。
**不变式**：不可用必须 `value:null + unavailable_reason`，**禁止填 0**；`pp` 指标单位必须 `pp`；
golden 断言用 `analytic_flux`；`trapezoid` 结果只允许标注为敏感性，不得与 golden 混用。

### 2.7 `QualityChecks` *（Validators；消费者：导出/质量标签）

| 字段 | 类型 | 说明 |
|---|---|---|
| `check_id` | string | `PHY-01`…；见 MODEL_VALIDATION_SPEC |
| `status` | enum | `pass` / `fail` / `skipped` |
| `observed` | number\|object | 实测值（全精度） |
| `expected` | number\|object | 期望值/区间 |
| `tolerance` | number\|string | 容差（数值或规则 id） |
| `reason` | string | 失败/跳过的中文原因与下一步动作 |
| `owner` | enum | `numeric` / `e2e` / `registry` / `schema` |

**不变式**：任一 `fail` → Run 状态 `validation_failed`；导出报告/证据包必须带 FAIL 标签，
**禁止**输出"验证通过/可信仿真"字样；`skipped` 必须有原因。

### 2.8 `EvidenceLink` *（Causal rules；消费者：因果面板/报告）

| 字段 | 类型 | 说明 |
|---|---|---|
| `run_id` | string | |
| `signal_id` | string | |
| `event_id` / `time_window_s` | string\|[number,number] | 二选一或并存 |
| `rule_id` | string | 因果规则 ID（版本化） |
| `layer` | enum | `CONFIG_FACT` / `MODEL_MECHANISM` / `OBSERVED_NUMERIC` |

**不变式**：每条因果断言必须绑定 `rule_id + 数据证据`；无模型支撑时 UI 显示"本模型无法推导该现象"；
`layer` 三层必须分开呈现。

### 2.9 `RunManifest` *（RunRegistry；消费者：所有页面/导出）— B05/B08

| 字段 | 类型 | 说明 |
|---|---|---|
| `run_id` | string | §1.3 |
| `role` | enum | `baseline` / `fault` / `monitor` / `imported` |
| `config_hash` / `model_hash` / `engine_version` / `model_version` / `schema_version` | string | 身份 |
| `run_hash` | string | **内容哈希**（§3.2） |
| `created_at` | ISO string | **不入哈希** |
| `status` | enum | `completed` / `failed` / `validation_failed` |
| `provenance` | object | `{model_provenance:"analytical_demo"}` |
| `verification` | object | `{consistency_checks:'pass'|'fail'|'skipped', model_validation:'not_performed', hardware_verification:'not_performed'}` |
| `integrity` | object | `{run_hash, checks_status}` |
| `event_encoding_version` | number | `1` |
| `bundle_schema_version` | string | `"v1"` |

### 2.10 `Run`（聚合根；不可变）

```text
Run {
  manifest: RunManifest,
  config: ScenarioConfig,                 // 深拷贝冻结
  model: ModelManifest,
  signals: SignalDescriptor[],            // 含 exposure
  timeseries: TimeSeries,
  events: Event[],                        // {event_id,event_type,trigger_s,target_signal,magnitude,unit,phase,label}
  snapshots: EventSnapshot[2],
  metrics: DerivedMetric[],
  quality: QualityChecks[],
  causal: { rule_version, nodes:[{node_id, up:[], down:[], layer, rule_id, text}], links:EvidenceLink[] },
  truth: { faultFamily, faultId, faultActiveFrom_s, peakMagnitude, unit, affectedComponent }   // exposure=truth_only
}
```

**不变式**：创建后**深度冻结**（`Object.freeze` 递归或无副本）；回放/页面/导出只读；任何参数改动只改
`draft`，不污染既有 Run；`run_hash` 覆盖除 `created_at` 外的全部内容。

### 2.11 `ComparisonResult` *（CompareEngine；消费者：对比页）

| 字段 | 类型 | 说明 |
|---|---|---|
| `baseline_run_id` / `trial_run_id` | string | |
| `compatibility` | object | `{model_version, schema_version, engine_version, dt_s, duration_s, initial_conditions}` 逐项 `ok`/`diff` |
| `allowed_diffs` | string[] | 白名单：`baseline↔fault` 允许 `bias/fault`；`closed↔monitor` 允许 `feedback_mode`；其余必须一致 |
| `aligned_signals` | string[] | 同语义同单位信号 |
| `differences` | `{signal_id, value, unit, window}[]` | 仅同语义同单位；缺失 → `unavailable` |
| `verdict` | enum | `comparable` / `restricted` / `incomparable` |

**不变式**：不兼容时禁止差值图与"仅由故障造成"表述；`restricted` 必须给出具体原因与建议。

### 2.12 `EvidenceBundle` v1 *（EvidenceExporter；导入导出）— B06

```text
FL-001-RUN-xxxx/
  manifest.json        # bundle_schema_version, run_hash, event_encoding_version, supported_versions,
                       # files:[{path,sha256,bytes}], created_at（不入哈希）, verification, provenance
  config.json          # ScenarioConfig（规范化）
  model_manifest.json  # ModelManifest
  timeseries.csv       # 601 行 + `#` 元数据头；20.0 行=post；全精度
  events.json          # [{event_id, ..., snapshots:[pre,post]}]
  metrics.json         # {metric_schema_version, metrics: DerivedMetric[]}
  checks.json          # QualityChecks[] + 汇总状态
  SHA256SUMS.txt       # 每文件 SHA-256（内容校验和，非签名）
  report.html          # P1 可选，不作为唯一证据
```

### 2.13 `project()`（纯函数；真值投影）— B08

```text
project(run, level) -> ProjectedRun
  level='demo'  : 全部信号（含真值/故障配置），带 source_kind 标签；用于演示页面与 demo 证据包
  level='blind' : 仅 exposure=blind_observable 的信号 + sanitized events + blindSafe metrics；
                  禁止 config.fault、bias_A、*_true_*、*_cap*、truth.*
```

**不变式**：`project()` 不得读 `run.truth` 写回投影；blind 投影必须通过**递归扫描**断言无真值字段；
`run` 本身不因投影被修改。

---

## 3. 序列化与哈希（B05）

### 3.1 Canonicalization v1

| 规则 | 规定 |
|---|---|
| 对象键序 | Unicode 码点升序 |
| 数字 | ECMAScript `Number::toString` 最短往返；禁止 `+0.0`/`-0` 区分（`-0 → 0`） |
| NaN/±Inf | 禁止出现（校验失败） |
| 字符串 | 不做 Unicode 归一化；保留原字符 |
| 时间 | 十进制秒，最多 3 位小数 |
| 数组 | 保序 |
| 排除字段 | `created_at`、UI 显示设置、回放状态 |

### 3.2 哈希语义

| 哈希 | 对象 | 用途 | 不得用于 |
|---|---|---|---|
| `config_hash` | 规范化 `ScenarioConfig` + `model_id/version` | 对比兼容/去重/`run_id` | 证明输出一致 |
| `model_hash` | 规范化 `ModelManifest` + `equation_id` 列表 + `model_version` | 模型身份 | 证明内容一致 |
| `run_hash` | `SHA256(canonical_json({bundle_schema_version, config_hash, model_hash, engine_version, t, signals, events, metrics, checks}))` | 导出/导入内容核验 | **签名/来源/公证** |
| file checksum | 文件字节 | 下载完整性 | 内容语义 |

**文案硬规则**：任何 UI/报告写"哈希"必须同时写"内容校验和，不代表签名、来源或第三方认证"；
**禁止** `sealed` / `防篡改` / `公证` / `第三方认证` 表述。

### 3.3 CSV 规范（`timeseries.csv`）

- 编码 UTF-8（带 BOM 供 Excel）；换行 `\n`（在 `manifest` 中声明）。
- 前 6 行为 `#` 注释：`# schema_version=1.0.0`、`# run_id=…`、`# run_hash=…`、
  `# event_encoding_version=1`、`# units={"signal_id":"unit",…}`、`# note=…`。
- 表头：`t_s,<signal_id 按 SignalCatalog 顺序>`。
- 数据 601 行；`t_s` 用最短往返；数值全精度；`20.0` 行=post。
- 禁止千分位、禁止本地化小数点、禁止显示精度截断。

### 3.4 JSON 规范

- UTF-8、无 BOM、2 空格缩进（仅人读；哈希用 canonical 形式另算）。
- 所有数值 full precision；所有对象带 `schema_version`（或在 manifest 统一声明）。
- 禁止未知字段静默丢弃：导入时未知字段按版本策略处理（§5.2）。

---

## 4. 生命周期与不可变性

### 4.1 运行状态机

`empty → draft_valid → computing → completed | failed | validation_failed`；
配置修改产生 `draft_dirty`，但不改既有 `completed` Run。回放状态 `stopped → playing → paused → ended`
独立于 Run 数据；播放速度/暂停/拖拽/切页**不得**改变 Run 任何字段与哈希。

### 4.2 RunRegistry

- `createRun(config) -> run`：纯函数式生成 + 深冻结；同一 `config_hash+model_hash+engine_version` 可复用或生成新实例
  （新 `run_id`，相同 `run_hash` 若排除 `created_at`），UI 提示"同内容不同实例"。
- `loadRun(run_id)`：只读载入；`deleteRun(run_id)`：被对比/证据包引用的 Run 不可删；删除需二次确认。
- baseline/monitor 派生：**必须从目标 Run 的 config 派生**（除故障/模式外全同），不得从 dirty 草稿派生。
- 刷新恢复：校验 `run_hash`；丢失时提示"未保存的实验已丢失"，**不得伪造历史 Run**。

### 4.3 浏览器存储

- `localStorage` 只存 session 索引（`run_id`、页面、时间、选中对象），Run 体积大时用 IndexedDB 或重算。
- 配额满：明确提示导出并清理历史，保留当前 Run；**禁止静默丢 Run**。
- **导出优先**：浏览器存储不是科学归档（V0.2 §6.2 #6）；README 与 UI 必须写明。

---

## 5. 导入契约（B06）

### 5.1 导入流程（`loadEvidenceBundle(bytes)`）

1. 解析 `manifest.json` → 校验 `bundle_schema_version` 是否受支持（§5.2）。
2. 校验每文件 `sha256` 与字节数 → 不一致则 `import_invalid`（不覆盖现有 Run）。
3. Schema 校验（config/model/timeseries/events/metrics/checks）。
4. 反序列化 → 重建 TimeSeries（校验 601/同长/时间单调/有限值）。
5. **重算** metrics/checks（用导入的 config+model）→ 与 `metrics.json`/`checks.json` 比对（容差同 golden）。
6. 重算 `run_hash` → 与 `manifest.run_hash` 比对；不一致 → `import_invalid`（带哪个文件/哪个字段的差异）。
7. 标注 `role:'imported'`、`provenance` 保留；**不覆盖**现有 Run；成功提示"已导入（角色=imported）"。
8. 失败给出中文可读错误 + 下一步动作（重新导出/检查版本/联系分享者）。

### 5.2 版本兼容矩阵

| 场景 | 处理 |
|---|---|
| 同 `bundle v1`、同 major schema | 正常导入 |
| schema minor 更高（新字段） | 警告 + 忽略未知字段（记录 `unknown_fields`） |
| schema major 不同 | 拒绝，提示需要升级应用 |
| `bundle_schema_version` 未知 | 拒绝，提示版本不支持 |
| `model_version` 与本地不同 | 允许导入但标 `incomparable`，禁止与本地 Run 做差值对比 |

### 5.3 负例矩阵（≥8，必须全部有中文错误）

| # | 负例 | 期望 |
|---|---|---|
| N-1 | 缺 `timeseries.csv` | `import_invalid`：缺文件清单 |
| N-2 | 改 CSV 一行（哈希不符） | 失败并指出文件 |
| N-3 | 改 `metrics.json` 数值 | 重算比对失败 |
| N-4 | `t` 非单调/缺行 | schema 校验失败 |
| N-5 | NaN/Infinity | 校验失败 |
| N-6 | 旧/新 major schema | 明确拒绝原因 |
| N-7 | 未知字段（minor 更高） | 警告 + 保留原运行 |
| N-8 | 超大文件/超长字段 | 防护拒绝（大小/深度上限） |
| N-9 | 注入字符串（`<script>`） | 仅作为文本渲染，不执行 |
| N-10 | 损坏 JSON | 错误码 + 行号 |

---

## 6. 真值暴露与投影（B08）

1. `SignalCatalog.exposure` 三值（§1.6）；`blindVisible` 为派生兼容字段。
2. `project(run,'demo')`：演示公开真值（V0.1 允许），但每个数字仍带 `source_kind`/`layer` 标签。
3. `project(run,'blind')`：只含 `blind_observable`；`events` 只保留脱敏标记（时间+通道有无变化），
   不含 `faultFamily/bias/magnitude`；`metrics` 仅 `blindSafe=true`。
4. blind 包/导出递归断言：JSON key/value 扫描 `truth`、`*_true_*`、`bias_A`、`*_cap*`、`faultFamily` → 零命中。
5. UI 盲测期间禁用真值页与深链；`truthSealed` 只是 UI 开关，**不是安全边界**（A 架构限制，见 DECISIONS）。
6. 路由守卫：`#/causal`、`#/compare` 在 blind 态拦截并给出说明。

---

## 7. 校验器与错误码

### 7.1 入口

- 运行时：`FL.contract.validate(kind, obj)`（浏览器/Node 共用，零依赖或手写校验）。
- CLI：`node tests/contract.test.js`；导入/导出负例走 `tests/fixtures/`。
- 错误对象：`{code:'CN-E09', field:'timeseries.t', message:'时间序列非单调', next:'重新导出或联系分享者'}`。

### 7.2 中文错误码表

| 码 | 条件 | 文案（标题/说明/下一步） |
|---|---|---|
| CN-E01 | 缺必需字段 | 「数据不完整：缺少 <field>」/「该字段是证据包必需项」/「重新导出完整证据包」 |
| CN-E02 | 单位不在字典/不匹配 | 「单位不合法：<field>=<unit>」/「允许值见单位字典」/「修正配置或报告问题」 |
| CN-E03 | `t` 非单调/长度不符 | 「时间序列无效」/「661 点/长度不一致/非递增」/「重新导出」 |
| CN-E04 | NaN/Infinity | 「数值无效：<field>」/「不允许 NaN/Infinity」/「重新计算或导出」 |
| CN-E05 | 事件相位缺失/非法 | 「事件快照不完整」/「pre 与 post 必须成对，t_s 应等于事件时刻」/「检查事件编码版本」 |
| CN-E06 | schema 版本不支持 | 「版本不支持：v<x>」/「当前应用支持 v1」/「升级应用或重新导出」 |
| CN-E07 | 哈希/文件校验失败 | 「内容校验失败：<file>」/「文件被修改或损坏」/「重新获取原始证据包」 |
| CN-E08 | 重算指标不一致 | 「指标复核不一致：<metric_id>」/「与证据包记录不符」/「标记为未验证并保留原运行」 |
| CN-E09 | Run 不存在/已删除 | 「运行不存在」/「可能已被清理或未保存」/「重新创建或导入证据包」 |
| CN-E10 | 对比不兼容 | 「不可比较：<reason>」/「模型/单位/时钟/初始条件不一致」/「改用兼容运行或仅查看」 |
| CN-E11 | 计算失败 | 「计算失败：<stage>」/「错误类型已记录」/「修改参数后重试」 |
| CN-E12 | 质量检查失败 | 「内部一致性检查未通过：<check_id>」/「该运行不可作为可靠结果」/「查看检查详情或导出排障包」 |
| CN-E13 | 导入被拒绝（版本/格式） | 「无法导入：<reason>」/「现有运行未被覆盖」/「检查版本或文件完整性」 |
| CN-E14 | 存储空间不足 | 「本地存储已满」/「浏览器存储不是科学归档」/「导出后清理历史」 |
| CN-E15 | 导出失败 | 「导出失败」/「下载被阻止或序列化失败」/「重试；现有运行未受影响」 |

---

## 8. 与既有实现的字段映射（迁移指引）

| 既有（`docs/CONTRACT.md` / `protocol.js`） | 目标（本契约） | 动作 |
|---|---|---|
| `run.timeseries.t` / `run.timeseries.signals` | `TimeSeries.t` / `.signals` | 保留；校验由参数派生 601（不再硬编码） |
| `run.signals`（元数据数组） | `SignalCatalog` | 增 `exposure`、`precision`、`definition` |
| `run.snapshots`（`t_s=19.9` pre） | `EventSnapshot`（pre `t_s=20.0` + `derivation`） | **必改**（B01） |
| `run.metrics` | `DerivedMetric[]` | 增 `method/method_version/time_window/blindSafe/unavailable_reason` |
| `run.quality` | `QualityChecks[]` | 增 `expected/owner/reason`，PHY 改名 |
| `run.truth` | `truth`（`exposure=truth_only`） | 从导出包/投影中移除；仅 demo 页内部用 |
| `run.configHash` / `run.modelHash` | `config_hash` / `model_hash` | 保留；增 `run_hash`、`verification`、`integrity` |
| `run.config.fault.*` | 同 | 标 `truth_only`；blind 投影严禁 |
| `FL.protocol.nearestIndex/sampleAt` | 采样工具 | 保留；文档注明"20.0 取 post，pre 只能来自 snapshots" |
| `validateRun` 硬编码 601 | `n_samples = duration/dt+1` | 改为派生（兼容 P1 dt） |
| `export.csv/configManifest` | `EvidenceBundle` 各文件 | 增 manifest/checksums/run_hash/import |
| `arena` 的 `blindVisible` | `exposure=blind_observable` | 由 exposure 派生，禁止独立配置 |

---

## 9. 字段级验收清单（P0 DoD）

| 对象 | 必须字段 | 不变式 | 验收方式 |
|---|---|---|---|
| ScenarioConfig | 全部 §2.1 | 参数合法、t_f 对齐、P0 冻结 | `contract.test` + `validateConfig` |
| ModelManifest | §2.2 | assumptions/limits/claims 非空 | 文本断言 |
| SignalCatalog | §2.3 | 每个 signal 有 unit/source_kind/exposure；无重名 | schema 校验 |
| TimeSeries | §2.4 | 601 点、同长、单调、有限 | SA-01 |
| EventSnapshot | §2.5 | pre/post 成对、t_s=20.0、derivation | SA-19/SA-04 |
| DerivedMetric | §2.6 | 9 个 P0 指标、method、window、pp 单位 | SA-11..SA-18 |
| QualityChecks | §2.7 | 每项有 status/observed/tolerance | PHY 矩阵 |
| RunManifest | §2.9 | run_hash/verification/integrity | SA-21..SA-22 |
| EvidenceBundle | §2.12 | 文件齐全、哈希可核、导入负例全过 | §5.3 十例 |
| project() | §2.13 | blind 零真值；demo 带标签 | 递归扫描断言 |
| CSV | §3.3 | 601 行、20.0=post、BOM/换行声明 | 往返一致 |
| 校验器 | §7 | 15 条错误码可触发 | 单测 |

---

## 10. 附录 A：FL-001 三运行关键片段

```jsonc
// config.baseline
{"schema_version":"1.0.0","model_id":"fl001","model_version":"fl001.1","duration_s":60,"dt_s":0.1,
 "bias_A":0,"fault_time_s":20.0,"feedback_mode":"closed_loop","initial_SOC_pct":60,"initial_load_kW":30,"noise":null}

// events.json（closed_loop_fault / monitor_only 相同事件，配置值不同）
{"event_id":"EV-001","event_type":"sensor_bias","trigger_s":20.0,"target_signal":"bias_A",
 "magnitude":10,"unit":"A","snapshots":[
   {"snapshot_id":"EV-001-pre","phase":"pre","t_s":20.0,"derivation":"left_limit",
    "variables":{"I_bat_true_A":25,"I_bat_meas_A":25,"bias_A":0}},
   {"snapshot_id":"EV-001-post","phase":"post","t_s":20.0,"derivation":"post_sample",
    "variables":{"I_bat_true_A":25,"I_bat_meas_A":35,"bias_A":10}}]}
```

| 指标（closed_loop_fault） | value（全精度） | unit | window | method |
|---|---:|---|---|---|
| `E_bat_true_60s` | 0.123888888888885 | kWh | [0,60] | analytic_flux |
| `E_gen_true_60s` | 0.376111111111116 | kWh | [0,60] | analytic_flux |
| `SOC_true_end_pct` | 59.6902777778 | % | [0,60] | analytic_flux |
| `SOC_est_end_pct` | 59.5791666667 | % | [0,60] | analytic_flux |
| `SOC_err_end_pp` | −0.1111111111 | pp | [0,60] | analytic_flux |
| `max_abs_r_true_kW` | 0.0（定义恒等） | kW | [0,60] | algebraic |
| `max_abs_r_meas_kW` | 4.0 | kW | [20,60] | algebraic |
| `focal_change_A` | −10.0000000000 | A | [20,60] | analytic |

> 注：`I_true(60)=15.0000000000262 A` 不是精确 15；golden 断言容差见 `MODEL_VALIDATION_SPEC.md`。

---

## 11. 变更记录与效力

| 日期 | 版本 | 变更 | 批准 |
|---|---|---|---|
| 2026-10-27 | v1 | 初始 G0 批准版：对象/哈希/事件/投影/导入/错误码 | 用户指令 2026-10-27T20:35 |

**效力**：本文件自签署起作为 P0 实现的字段事实源；任何字段增删须按 G0-DEC-17 记录 `CHG-*`，
并同步 `docs/CONTRACT.md` 与 `NEXT/BACKLOG_APPROVED.md` 中受影响任务。
**不覆盖**：模型物理与容差（→ MODEL_VALIDATION_SPEC）、UI 文案（→ UI_COPY_GUARDRAILS）、
范围与任务（→ BACKLOG_APPROVED / SCOPE_SPLIT_MEMO）。
