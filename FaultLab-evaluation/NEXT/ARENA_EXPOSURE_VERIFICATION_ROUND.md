# ARENA_EXPOSURE_VERIFICATION_ROUND — Arena exposure 三值映射验证轮（v1）

> 文档版本：`v1`（2026-11-13，V130 W3 工作路交付物）
> 授权链：V130_WAVE_DESIGN DEC-2（CHG-20261113-04 批准「下一步」指令链）
> 工作面：PV-001 / WT-001 / MG-001 逐信号「核对表 × 盲包程序化验证」→ 入池裁定（逐系统，互不阻塞）
> 体例依据：PV001_G2B_SPEC_APPROVED §5 C-6（v1.0 修订）＋ WT001_G2B_SPEC_APPROVED §1.2 注记 B-3（v1.0，CHG-20261107-01）＋ MG001_G2B_SPEC_APPROVED §1.3 注记（WT001 B-3 体例延用，CHG-20261110-01 批准链；V110 DEC-4 Arena 排除）
> 消费面：`src/ui/pages/arena.js` `ARENA_EXCLUDED` 守卫注释链（本验证轮终值裁定落点）、`tests/arena.test.js` §8、`tools/e2e.mjs` E-12

---

## 0. 权威映射面（验证基准）

### 0.1 DATA_CONTRACT_SPEC §1.6 三值映射表（原文）

| exposure | 演示 UI | blind 投影 | demo 证据包 | 默认映射 |
|---|---|---|---|---|
| `blind_observable` | 可见 | **包含** | 包含 | `OBSERVATION` 默认；被 Agent 可观测的 `CONFIG`/`CONTROLLER` |
| `public_demo` | 可见 | 排除 | 包含 | `MODEL_STATE`/`FAULT_EVENT`/`DERIVED`/`MODEL_ASSUMPTION` 默认 |
| `truth_only` | 仅内部/审计（UI 不直接展示） | 排除 | 排除 | `run.truth.*`、`config.fault.*` 等真值载荷 |

**规则（原文）**：`exposure` 由 ModelManifest 声明、engine 复制进 Run，UI **不得**自行改值；所有"真值→页面"访问必须经过 `project()`。

代码权威（`src/core/schema.js:35-43` `DEFAULT_EXPOSURE`——机读事实源）：`CONFIG/MODEL_STATE/CONTROLLER/FAULT_EVENT/DERIVED/MODEL_ASSUMPTION → public_demo`，`OBSERVATION → blind_observable`。与 §1.6 表逐 kind 一致（程序化断言 A 全过）。

派生纪律（`src/core/systems.js:42-68` `sig()`）：`exposure = 显式声明 || blindVisible 历史标记 || EXPOSURE_BY_SOURCE[sourceKind]`；`blindVisible = (exposure === 'blind_observable')` 纯派生、不独立设置——三系统 57 信号逐个断言（§5.1）。

### 0.2 盲包通道裁定机制（三重过滤）

`src/core/arena-protocol.js` `blindObservables(run)`（协议 §5.3，v1 页面轨与 v2 评测轨共用单源）：

1. `sig.blindVisible === true`（= exposure 为 blind_observable）；
2. `sig.sourceKind !== 'FAULT_EVENT' && sig.sourceKind !== 'MODEL_STATE'`；
3. `!BLIND_ID_RE.test(sig.id)`，其中 `BLIND_ID_RE = /(^|_)(true|bias|cap)(_|$)/i`（观测通道 id 值级禁词）。

v2 盲包侧 `validateBundleV2` V-05 用同一判据派生 `allowedObs` 白名单（closed-world 越权拒收）；v2 键名面 `BLIND_KEY_RE = /(^|_)(true|truth|bias|cap|fault)(_|$)|^config$/i` ＋ `BLIND_EXACT = ['bias_A','faultFamily','faultId','faultActiveFrom_s','peakMagnitude']` ＋ 语义禁项（seed/noise→AE-E03，events/trigger_s/t_start_s/t_fault→AE-E04）。

v1 页面轨（`src/agents/arena.js:550` `FORBIDDEN_KEY` + `assertSealed`）：键名 `/^(^|_)(truth|true|bias|cap)(_|$)|^config$|(^|_)fault($|_)config$/i`（truth_sealed 豁免）＋ 通道 id `FORBIDDEN_ID`（同 BLIND_ID_RE）。

### 0.3 AGENT_PROTOCOL §2 真值隔离禁词精确口径（:36-47）

> 严禁出现：`truth`/`run.truth`/真值对象；`*_true_*` 通道（如 `P_gen_true_kW`、`I_bat_true_A`、`f_true_Hz`）；`bias_A` 等故障注入通道；`*_cap_*` 等执行器限制通道（如 `P_gen_cap_kW`）；故障配置（`config.fault`、故障家族、注入时刻、幅值）与 `FAULT_EVENT` 类通道。导出包中 `truth_sealed: true` 是封存声明字段，本身不携带真值。导出前会递归扫描对象键名与观测通道 id；发现 `truth`/`_true_`/`bias`/`cap`/故障配置字段会直接抛错，不生成文件。

**通道 id 与故障参数 id 严格区分核验（本验证轮核心）**：

- `bias` 作为**通道 id 段**：PV-001 `bias_W_m2`、WT-001 `bias_ms` 均为 `FAULT_EVENT` sourceKind（public_demo 默认）——三重过滤第 2/3 条双重排除，永不出现在盲包；
- `bias` 作为**故障参数名**：PV `G_sensor_bias` / WT `v_sensor_bias` 故障目录参数键均为 `magnitude`（单位 W/m²、m/s），全库无 `bias_A` 参数名（`bias_A` 仅存在于 FL-001 ScenarioConfig 契约键面，MG/PV/WT 盲包不含任何 config 对象）；
- OBSERVATION 测量通道 id 全集（三系统 27 条盲包通道）`BLIND_ID_RE` 零命中——`G_meas_W_m2`/`P_pv_meas_kW`/`v_meas_ms` 等测量通道**合法**（meas 类命名，无 bias/cap/true 段）；
- `cap`：三系统无 `_cap_` 通道（MG `P_bess` 钳位语义承载于 `P_bess_kW` 值域与 `P_bess_chase_kW` 目标暴露，无 cap 命名通道）；FL `I_bat_cap_A` 先例的 null 列模式在 MG 对应物为 `P_bess_chase_kW`（§3）。

---

## 1. PV-001 核对表（17 信号）

依据：PV001_G2B_SPEC_APPROVED §1.2 表（17 信号行，C-6 体例）× `src/core/systems.js:1105-1123` 实读。落点与起草轮提案**逐信号一致（零提案偏差）**；「偏差」列登记相对 §1.6 kind 默认映射的显式声明（spec 提案即如此设计，非提案 vs 代码分歧）。

| # | id | sourceKind | §1.6 默认 | 三值落点 | 盲包通道裁定 | 偏差登记 |
|---|---|---|---|---|---|---|
| 1 | G_true_W_m2 | MODEL_STATE | public_demo | public_demo | 不入盲包（真实辐照度=真值载荷） | — |
| 2 | G_meas_W_m2 | OBSERVATION | blind_observable | blind_observable | **入盲包**（测量辐照度，noiseSigma 2.0） | — |
| 3 | bias_W_m2 | FAULT_EVENT | public_demo | public_demo | 不入盲包（故障注入通道；id 命中 BLIND_ID_RE 双保险） | — |
| 4 | P_mpp_true_kW | MODEL_STATE | public_demo | public_demo | 不入盲包（理论最大功率=真值；id 含 `true` 段双保险） | — |
| 5 | P_mpp_ref_kW | CONTROLLER | public_demo | **blind_observable** | **入盲包**（MPPT 目标功率——被 Agent 可观测的 CONTROLLER，§1.6 映射表许可支路） | D-PV-1：kind 默认 public_demo→显式声明 blind_observable |
| 6 | P_pv_true_kW | MODEL_STATE | public_demo | public_demo | 不入盲包（阵列真实出力） | — |
| 7 | P_pv_meas_kW | OBSERVATION | blind_observable | blind_observable | **入盲包**（测量功率，noiseSigma 0.15） | — |
| 8 | P_pv_est_kW | DERIVED | public_demo | **blind_observable** | **入盲包**（EMS 辐照度折算估计——测量链派生量，诊断 d_pv 的构成项） | D-PV-2：同 D-PV-1 |
| 9 | d_pv_kW | DERIVED | public_demo | **blind_observable** | **入盲包**（MPPT 一致性残差——测量伪影特征通道） | D-PV-3：同 D-PV-1 |
| 10 | P_ac_kW | MODEL_STATE | public_demo | public_demo | 不入盲包 | — |
| 11 | P_grid_true_kW | MODEL_STATE | public_demo | public_demo | 不入盲包（馈线真实功率） | — |
| 12 | P_grid_meas_kW | OBSERVATION | blind_observable | blind_observable | **入盲包**（馈线测量功率，noiseSigma 0.15） | — |
| 13 | P_load_demand_kW | CONFIG | public_demo | **blind_observable** | **入盲包**（负载需求——被 Agent 可观测的 CONFIG） | D-PV-4：同 D-PV-1 |
| 14 | P_load_served_kW | MODEL_STATE | public_demo | public_demo | 不入盲包 | — |
| 15 | V_bus_V | MODEL_ASSUMPTION | public_demo | **blind_observable** | **入盲包**（恒 400 V，tableOnly） | D-PV-5：同 D-PV-1 |
| 16 | r_true_kW | DERIVED | public_demo | public_demo | 不入盲包（真实守恒残差；id 含 `true` 段双保险） | — |
| 17 | r_meas_kW | DERIVED | public_demo | **blind_observable** | **入盲包**（测量一致性残差） | D-PV-6：同 D-PV-1 |

**盲包通道集（9）**：`G_meas_W_m2 / P_mpp_ref_kW / P_pv_meas_kW / P_pv_est_kW / d_pv_kW / P_grid_meas_kW / P_load_demand_kW / V_bus_V / r_meas_kW`。与 FL-001 盲包（8 通道）同构：测量+指令+残差面，零真值/零故障配置。

---

## 2. WT-001 核对表（22 信号）

依据：WT001_G2B_SPEC_APPROVED §1.2 表（22 信号行，B-3 注记）× `src/core/systems.js:1334-1362` 实读（实读注记：22 信号 exposure 落点沿 PV-001 体例逐信号显式/默认分流）。落点与起草轮提案逐信号一致（零提案偏差）。

| # | id | sourceKind | §1.6 默认 | 三值落点 | 盲包通道裁定 | 偏差登记 |
|---|---|---|---|---|---|---|
| 1 | v_true_ms | MODEL_STATE | public_demo | public_demo | 不入盲包（真实风速=真值） | — |
| 2 | v_meas_ms | OBSERVATION | blind_observable | blind_observable | **入盲包**（测量风速/控制面读数，noiseSigma 0.15） | — |
| 3 | bias_ms | FAULT_EVENT | public_demo | public_demo | 不入盲包（故障注入通道；id 命中 BLIND_ID_RE 双保险） | — |
| 4 | n_rotor_rpm | MODEL_STATE | public_demo | public_demo | 不入盲包 | — |
| 5 | lambda_tip | MODEL_STATE | public_demo | public_demo | 不入盲包 | — |
| 6 | cp_coeff | MODEL_STATE | public_demo | public_demo | 不入盲包 | — |
| 7 | beta_pitch_deg | MODEL_STATE | public_demo | public_demo | 不入盲包（桨距实际状态） | — |
| 8 | beta_cmd_deg | CONTROLLER | public_demo | **blind_observable** | **入盲包**（桨距指令——被 Agent 可观测的 CONTROLLER） | D-WT-1 |
| 9 | beta_stuck_deg | FAULT_EVENT | public_demo | public_demo | 不入盲包（卡涩钉扎值——事件域 null 列通道，仅 pitch_stuck 有值；FL I_bat_cap_A 同款排除逻辑） | — |
| 10 | P_aero_kW | MODEL_STATE | public_demo | public_demo | 不入盲包 | — |
| 11 | P_wt_ref_kW | CONTROLLER | public_demo | **blind_observable** | **入盲包**（变流器功率目标） | D-WT-2 |
| 12 | P_wt_true_kW | MODEL_STATE | public_demo | public_demo | 不入盲包（真实出力） | — |
| 13 | P_wt_meas_kW | OBSERVATION | blind_observable | blind_observable | **入盲包**（测量功率，noiseSigma 0.15） | — |
| 14 | P_wt_est_kW | DERIVED | public_demo | **blind_observable** | **入盲包**（EMS 风速折算估计） | D-WT-3 |
| 15 | d_wt_kW | DERIVED | public_demo | **blind_observable** | **入盲包**（最优曲线一致性残差） | D-WT-4 |
| 16 | P_grid_true_kW | MODEL_STATE | public_demo | public_demo | 不入盲包 | — |
| 17 | P_grid_meas_kW | OBSERVATION | blind_observable | blind_observable | **入盲包**（馈线测量功率，noiseSigma 0.15） | — |
| 18 | P_load_demand_kW | CONFIG | public_demo | **blind_observable** | **入盲包**（负载需求） | D-WT-5 |
| 19 | P_load_served_kW | MODEL_STATE | public_demo | public_demo | 不入盲包 | — |
| 20 | V_bus_V | MODEL_ASSUMPTION | public_demo | **blind_observable** | **入盲包**（恒 400 V，tableOnly） | D-WT-6 |
| 21 | r_true_kW | DERIVED | public_demo | public_demo | 不入盲包（id 含 `true` 段双保险） | — |
| 22 | r_meas_kW | DERIVED | public_demo | **blind_observable** | **入盲包**（测量一致性残差） | D-WT-7 |

**盲包通道集（10）**：`v_meas_ms / beta_cmd_deg / P_wt_ref_kW / P_wt_meas_kW / P_wt_est_kW / d_wt_kW / P_grid_meas_kW / P_load_demand_kW / V_bus_V / r_meas_kW`。

---

## 3. MG-001 核对表（18 信号）

依据：MG001_G2B_SPEC_APPROVED §1.3 表（18 信号行）× `src/core/systems.js:1581-1608` 实读。落点与起草轮提案逐信号一致（零提案偏差）。

| # | id | sourceKind | §1.6 默认 | 三值落点 | 盲包通道裁定 | 偏差登记 |
|---|---|---|---|---|---|---|
| 1 | island_state | MODEL_STATE | public_demo | public_demo | 不入盲包（孤岛状态量=事件窗承载信号，MODEL_STATE 三重过滤第 2 条排除——注入/重连时刻语义不入盲包） | — |
| 2 | P_pv_kW | MODEL_STATE | public_demo | public_demo | 不入盲包（PV 子轨真实馈入） | — |
| 3 | P_wt_kW | MODEL_STATE | public_demo | public_demo | 不入盲包（WT 子轨真实馈入） | — |
| 4 | P_bess_kW | MODEL_STATE | public_demo | public_demo | 不入盲包（储能真实出力） | — |
| 5 | P_sched_kW | CONTROLLER | public_demo | **blind_observable** | **入盲包**（调度计划目标=配置值恒显） | D-MG-1 |
| 6 | P_bess_chase_kW | CONTROLLER | public_demo | **blind_observable** | **入盲包**（平衡填补目标，钳位前显式暴露；事件域 null 列——岛窗外 null/岛窗内有值，null 布局为冻结引擎语义，见 §5.3） | D-MG-2 |
| 7 | P_load_demand_kW | CONFIG | public_demo | **blind_observable** | **入盲包**（聚合负荷需求） | D-MG-3 |
| 8 | P_load_served_kW | MODEL_STATE | public_demo | public_demo | 不入盲包 | — |
| 9 | P_grid_true_kW | MODEL_STATE | public_demo | public_demo | 不入盲包（馈线真实功率） | — |
| 10 | P_grid_meas_kW | OBSERVATION | blind_observable | blind_observable | **入盲包**（馈线测量功率，noiseSigma 0.15） | — |
| 11 | P_shed_kW | MODEL_STATE | public_demo | public_demo | 不入盲包（缺口卸载功率） | — |
| 12 | P_dump_kW | MODEL_STATE | public_demo | public_demo | 不入盲包（盈余倾卸功率） | — |
| 13 | V_bus_V | MODEL_ASSUMPTION | public_demo | **blind_observable** | **入盲包**（恒 400 V，tableOnly） | D-MG-4 |
| 14 | SOC_true_pct | MODEL_STATE | public_demo | public_demo | 不入盲包（真实 SOC 账本） | — |
| 15 | SOC_est_pct | OBSERVATION | blind_observable | blind_observable | **入盲包**（估计 SOC——测量链积分账本，合法测量通道） | — |
| 16 | SOC_err_pp | DERIVED | public_demo | **blind_observable** | **入盲包**（SOC 估计误差——测量链派生，无偏置恒 0） | D-MG-5 |
| 17 | r_true_kW | DERIVED | public_demo | public_demo | 不入盲包（定义恒等真值残差；id 含 `true` 段双保险） | — |
| 18 | r_meas_kW | DERIVED | public_demo | **blind_observable** | **入盲包**（测量一致性残差） | D-MG-6 |

**盲包通道集（8）**：`P_sched_kW / P_bess_chase_kW / P_load_demand_kW / P_grid_meas_kW / V_bus_V / SOC_est_pct / SOC_err_pp / r_meas_kW`。

**信号计数登记**：实读 SystemDef 目录 = **18**（与 MG001 spec §1.3 表 18 行一致）；V130_WAVE_DESIGN 头注「MG（19）」与 MG-G2b-04 完成注记「19 信号」为计数漂移（19 信号口径无实读支撑），核对表以 spec §1.3 表 + 代码实读 **18** 为准。

---

## 4. 特殊信号裁定汇总（跨系统）

| 类别 | 通道 | 裁定 |
|---|---|---|
| 故障注入通道（id 含 bias） | PV `bias_W_m2`、WT `bias_ms` | 不入盲包。FAULT_EVENT sourceKind（三重过滤第 2 条）＋ id 命中 `BLIND_ID_RE`（第 3 条）——双重排除。故障参数键面均为 `magnitude`，无 `bias_A` 参数名；「bias 子串出现在测量通道名」情形三系统**不存在**（测量通道全部为 meas/est/cmd/ref 命名）——AGENT_PROTOCOL :36-47 禁词口径零冲突 |
| `_true_` 类 MODEL_STATE | PV `G_true/P_mpp_true/P_pv_true/P_grid_true/r_true`、WT `v_true/P_wt_true/P_grid_true/r_true`、MG `P_pv/P_wt/P_bess/P_grid_true/P_shed/P_dump/SOC_true/r_true`、`island_state` | 不入盲包（MODEL_STATE 三重过滤第 2 条；其中 id 含 `true` 段者另有第 3 条双保险） |
| CONTROLLER 显式 blind | PV `P_mpp_ref_kW`、WT `beta_cmd_deg/P_wt_ref_kW`、MG `P_sched_kW/P_bess_chase_kW` | 入盲包（§1.6「被 Agent 可观测的 CONFIG/CONTROLLER」许可支路；指令/目标面=Agent 合法观测信息，非真值） |
| DERIVED 显式 blind（测量链派生） | PV `P_pv_est_kW/d_pv_kW/r_meas_kW`、WT `P_wt_est_kW/d_wt_kW/r_meas_kW`、MG `SOC_err_pp/r_meas_kW` | 入盲包（恒用测量通道构造，非真值派生；`*_true_` 派生对（`r_true`）不入） |
| CONFIG 显式 blind | 三系统 `P_load_demand_kW` | 入盲包（负载需求=Agent 可观测配置量） |
| MODEL_ASSUMPTION 显式 blind | 三系统 `V_bus_V`（tableOnly，恒 400 V） | 入盲包（常量模型假设，无信息泄漏面） |
| 事件域 null 列 | MG `P_bess_chase_kW`（岛窗外 null）；WT `beta_stuck_deg`（非 pitch_stuck 场景 null，但 FAULT_EVENT 不入盲包） | `P_bess_chase_kW` 入盲包且 null 值经 v2 V-04b/N-B11e「null 允许（可选通道缺失）」面合法（§5.2 逐场景断言通过）；null 布局本身为**冻结引擎语义**（engine-mg.test.js：岛窗 `[t_start, t_clear)` 右开——缺省 t_clear=窗末时 i599 有值、i600 回 null） |
| MG 孤岛面状态 | `island_state` | 不入盲包（MODEL_STATE）。孤岛事件对 Agent 的可见性完全经由 blind 通道**值面**呈现（`P_grid_meas_kW→0`、`P_bess_chase_kW` null→有值）——事件时刻可由观测推断（盲诊断固有属性，非泄漏；键名/通道面零禁词命中） |

---

## 5. 程序化验证记录（真实执行）

工具面：TEMP 脚本（`faultlab-w3-exposure-verify.mjs`，验证后已删）经 `tests/core-load.js` bootstrap 调 `FL.core.simulate` / `FL.arenaProtocol.*` / `FL.arena.*` 单源实现；另跑仓库 CLI `tools/arena2-gen.mjs`（评测轨生成器）与 `tools/arena2-session.mjs`（整场评测轨）三系统各一场。**零改动 src/core/**（协议/投影机制只读）。

### 5.1 信号盘点与映射断言（57 信号）

- `DEFAULT_EXPOSURE`（schema.js）逐 kind 与 §1.6 表一致（断言 A 全过）；
- 三系统 `sig()` 派生纪律逐信号断言：`blindVisible === (exposure==='blind_observable')` 57/57 全过；FAULT_EVENT 信号零 blind 落点（PV bias_W_m2 / WT bias_ms / WT beta_stuck_deg）；
- 偏差登记合计 19 条（PV 6 / WT 7 / MG 6，全部为「kind 默认 public_demo→显式声明 blind_observable」方向，与三规格提案列逐条对应，零提案 vs 代码分歧）；
- 三重过滤盲观测集 == 核对表落点集：PV 9/9、WT 10/10、MG 8/8 全等。

### 5.2 盲包生成 × 泄漏扫描 × 通道集核对（逐系统逐场景）

场景矩阵（healthy + 各故障族代表 + monitor 模式 + noise + MG t_clear 特例）：

| 系统 | 场景数 | 场景 | 结果 |
|---|---|---|---|
| PV-001 | 5 | none@cl、sensor_drift@cl、shading_step@cl、sensor_drift@monitor、none@cl+noise | 全过 |
| WT-001 | 6 | none@cl、sensor_drift@cl、actuator_fault@cl、gust_step@cl、sensor_drift@monitor、none@cl+noise | 全过 |
| MG-001 | 8 | none@cl、load_step@cl、shading_link@cl、gust_link@cl、island_event@cl、load_step@monitor、none@cl+noise、island_event@cl+t_clear=40 | 全过 |

每场景断言（合计 5 组 × 19 场景，全过）：
1. `simulate` 成功、盲观测非空、样本 601 点、有限值或 null；
2. **实际通道集 == 核对表 blind_observable 落点集**（逐场景集合全等）；
3. v2 盲包（`buildBundleV2` 单轮 round.v2）`validateBundleV2` **V-01…V-06b 全量校验**通过（closed-world 白名单、schema/bundle_kind/arena_version=2.0、sr1 网格、观测白名单、数值完整性）；
4. **递归泄漏扫描零命中**：键名禁词并集（BLIND_KEY_RE ∪ BLIND_EXACT，truth_sealed 豁免同 v1 口径）＋ 语义禁项（seed/noise/events/trigger_s/t_start_s/t_fault）＋ 通道 id 全集 `BLIND_ID_RE` ＋ 序列化文本禁词（`_true_`/`bias_A`/`_cap_`/`"truth":`/`faultFamily`/`faultId`/`t_start_s`/`t_clear_s`/`"seed"`/`"noise"`/`"events"`/`"params"`/`"family"`）；
5. v1 页面轨同构验证：`FL.arena.createMatch`（3 轮×内置 5 Agent）→ `exportRoundBundle`/`exportMatchBundle`（内嵌 `assertSealed`）通过，导出通道集 == 核对表落点集，序列化文本无 `_true_`/`bias_A`/`_cap_`/truth/run 对象。

### 5.3 MG-001 island_event 零参数族特例（DEC-2 指定核查面）

- `params:[]` 零参数族确认；随机场景流抽取路径（`buildScenarioSet` 共享模块）`magnitudeFromRoll` 返回伪幅值 10/unit ''，引擎对 `fault.params.magnitude` 按「未知参数，计算时忽略」**警告不拒收**——simulate 成功；
- 缺省 `t_clear_s`：岛窗 `[20, 60)` 右开（`P_bess_chase_kW` i200–i599 有值、i600 回 null；`P_grid_meas` 岛窗恒 0；`island_state` 仅 truth/演示面）——engine-mg.test.js 冻结语义，非缺口；
- 显式 `t_clear_s=40` 双事件快照：脱离+重连两事件窗数据齐备，**盲包通道集不变**（8 通道全等）、V-01…V-06b 全过、泄漏扫描零命中——盲包生成路径对零参数族/双事件快照**无需任何特殊处理**，无协议缺口；
- 24 轮随机场景流（seed 42）逐轮通道集一致（含 island_event 抽中轮）；族分布 `{none:5, load_step:7, shading_link:3, gust_link:6, island_event:3}`。

### 5.4 场景流与评测轨观察（familyPool 目录派生）

`familyPool(systemId)` 直读系统故障目录（arena-protocol.js 设计行为）：PV 24 轮（seed 7）`{sensor_drift:10, shading_step:13, none:1}`；WT `{sensor_drift:6, actuator_fault:10, gust_step:7, none:1}`；MG `{load_step:5, shading_link:5, gust_link:6, island_event:7, none:1}`。三系统盲包生成/校验对全部族均通过。

`tools/arena2-session.mjs` 整场评测轨三系统各一场（seed 20261113，3 轮，全 Agent）：盲包→builtin Agent 盲测（只见盲观测流）→提交→scoreV2 落章全链通过（PV/WT 均分约 34、MG 约 67——PV shading_step/WT gust_step/MG 联动族轮次的 family/component 项受 v1 诊断提交枚举面限制，见 §6 观察项 O-2）。

---

## 6. 入池裁定（逐系统）

| 系统 | 核对表 | 盲包程序化验证 | 裁定 |
|---|---|---|---|
| PV-001 | 17 信号全落点核对（§1），偏差 6 条全登记 | 5 场景全过：泄漏零命中、通道集全等、V-01…V-06b 全过、v1 导出面全过 | **入池** |
| WT-001 | 22 信号全落点核对（§2），偏差 7 条全登记 | 6 场景全过（同上口径） | **入池** |
| MG-001 | 18 信号全落点核对（§3），偏差 6 条全登记 | 8 场景全过（同上口径）＋ island_event 零参数族/双事件快照无缺口（§5.3） | **入池** |

**ARENA_EXCLUDED 终值**（`src/ui/pages/arena.js`，V130 DEC-2 / 本文档 v1）：`['PV-001','WT-001','MG-001'] → []`（守卫注释更新为「三值映射验证轮已过（v1.3.0，CHG-20261113-05），当前无排除系统」；逐系统批准链注释保留）。三系统全过、逐系统裁定互不阻塞的分支未触发。

**协议面⑤冻结核对**：附录 A 17 负例（N-B1…N-B17）/字段白名单/语义禁项零触碰（`tests/arena-protocol-negative.test.js` 本轮回归全绿）；本验证轮零协议放宽、零 `src/core/**` 改动。

### 非阻塞观察项登记（不构成排除理由，均为后续工作面候选）

- **O-1 诊断提交枚举面**：v1 协议 `faultType` 枚举（AGENT_PROTOCOL §3.4：sensor_drift/load_step/actuator_fault/none）不含 PV `shading_step`、WT `gust_step`、MG `shading_link/gust_link/island_event`；`buildMeta.faultFamilies` 元数据亦仅列全局三族。对目录派生族轮次，family/component 评分项不可达（detection/latency/calibration 不受影响，无崩溃面）。扩展须显式 CHG（协议 v1 文本+枚举面），本验证轮不放宽。
- **O-2 island_event 伪幅值面**：`deriveTruth` 对零参数族产出 `magnitude={value:10, unit:''}`（truth 揭晓/评分面，不入盲包）——幅值语义缺失的登记项，评分 magnitude 项对 island_event 轮无意义；后续 CHG 可议「零参数族 truth.magnitude=null」口径。
- **O-3 信号计数漂移**：V130 头注/MG-G2b-04 完成注记「MG 19 信号」vs 实读 18（spec §1.3 表 18 行为准）——文档面勘正候选，不改代码。
- **O-4 UI 文案滞后**：arena 页 hint「三系统均有独立故障目录与盲观测通道」「三系统可用」两串在六系统池下语义滞后——arena.js 本轮仅许触碰 ARENA_EXCLUDED 与注释，文案勘正留后续 CHG（copy-guard 词表无涉）。

---

## 7. 证据与落地面

- 程序化验证：TEMP 脚本 386 断言全过（PASS 386 / FAIL 0，脚本用后已删）＋ `tools/arena2-gen.mjs` 三系统（PV 9/WT 10/MG 8 通道，自检 validateBundleV2 全过）＋ `tools/arena2-session.mjs` 三系统整场落章（score_hash 产出）；
- 回归面：`node tests/arena.test.js`（扩池断言 additive）、`node tests/arena-protocol-negative.test.js`（N-B1…N-B17 冻结负例）、`node tests/core.test.js`、`node tools/copy-guard.mjs`（0 命中）；
- e2e：`tools/e2e.mjs` E-12 断言区同构更新（arena 系统选择器含六系统）；
- 测试集文件：本轮 CLI 证据产物（bundle/reveal/session）落系统 TEMP、不入仓。
