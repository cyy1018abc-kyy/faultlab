# FCEXT_G2B_SPEC_APPROVED — FC-001 load_step / actuator_fault G2b 物理规格（已批准）

> **任务**：FC 扩展故障族 G2b（V0.3 规划 V3-04 后续 / V05_RELEASE_PLAN §2.5 范围外候选）。
> **授权**：用户 2026-10-31 指令「V0.3 规划的 V3-04 后续」起草；**2026-11-04 /goal 四步指令
> 第 2 步「A-2 FC 扩展 G2b 双路评审 + 批准」**（CHG-20261104-02）。
> **前置**：FC-001 已升正式验收（CHG-20261030-12，model_version=1.1.0，scope=approved_fc）；
> FC 的 load_step/actuator_fault 已在目录/引擎/因果模板中存在（未评审冻结→本 G2b 解除冻结）。
> **状态**：`APPROVED`（v1.1，2026-11-04）——双路独立评审 PASS_WITH_CONDITIONS，条件已全部
> 修订进本版（§8 评审记录）；实现仍走 FC-G2b-04（v0.6.0 队列，另行指令派发）。
> 曾用名：`FCEXT_G2B_SPEC_DRAFT.md`（v1，2026-10-31）。
> **Q-4 三守卫适用**：方程集扩展须走 G2b；许可证自研零依赖（无新第三方）；验收路径禁入直至 G2b 通过。
> **记录**：实现 Agent 起草（2026-10-31）；Lead 修订 v1.1（2026-11-04）。

---

## 1. FC-001 load_step（负载功率阶跃）— G2b 规格

### 1.1 机制定案（v1.1 修订：级联两段，非阶跃）

引擎实现为**级联两段一阶**（engine.js:780–790，实机复算三法交叉确认）：

1. **功率分配器级（参考电流）**：I_fc_ref 以 τ_ref = 2.5 s 一阶跟随
   `(P_load(t) − P_bat_ref)/V = (P_load(t) − 10)/0.4`（P_bat_ref = 10 kW 恒偏移）。
   I_fc_ref **不是阶跃**——原 v1 草案「I_fc_ref 阶跃」为错误叙述，本版修正；
2. **电堆级**：I_fc 以 τ_fc = 1.2 s 一阶跟随 target = I_fc_ref（load_step 轨无偏置、无钳位）。

稳态 I_fc_ref = (P_load − 10)/0.4 自适应（**I_fc_ref 歧义定案维持**：随负载自适应，非固定 50 A）；
load_step +10 kW 时 I_fc_ref 从 50 A 升至 75 A（稳态），I_fc 同值。

原 v1 §1.1「矛盾不在物理而在措辞」结论**维持且强化**：电池是理想平衡源（A-ideal-balance），
物理自洽；但 v1「爬坡是隐喻」的前提为假——分配器 2.5 s 爬坡恰是引擎真实行为，
closedLoopEffect 措辞按级联结构修正（FC-G2b-04）。

### 1.2 方程登记（补全）

| id | 方程 | 说明 |
|---|---|---|
| EQ-2（保留） | τ_fc·dI_fc/dt + I_fc = target, τ_fc = 1.2 s（sensor/load 轨） | 电堆级一阶跟随 |
| **EQ-6（新增登记）** | τ_ref·dI_fc_ref/dt + I_fc_ref = (P_load(t) − 10)/0.4, τ_ref = 2.5 s（仅 load_step 轨激活；其余轨 I_fc_ref = (P_load − 10)/0.4 恒值） | 功率分配器级（engine.js:781 现状） |
| EQ-3/4/5（不变） | P/P_bat/SOC/残差定义 | 同 fc001 既有口径 |

**assumptions 增补（FC-G2b-04）**：`A-fc-dispatcher`——I_fc_ref 由功率分配器一阶跟随
( P_load − 10)/0.4（τ_ref = 2.5 s），非阶跃设定值。

### 1.3 验收锚点（oracle 复算后冻结；评审人 A 三法交叉复算确认）

| 场景 | 锚点（60 s 网格） | 容差 | 复算 |
|---|---|---|---|
| `load_step` +10 kW | `I_fc(60)` = **75.00 A**（I_fc_ref 自适应：(P_load−10)/0.4 = 75 A） | ±0.5 A | 实机 74.999995 ✓ |
| 同上 | `P_bat(60)` = **10.00 kW** | ±0.5 kW | 实机 10.000002 ✓ |
| 同上 | 瞬态 max \|P_bat\| = **20.00 kW**（t0+ 网格点；在包络 ±25 kW 内） | 记录值 | 实机 20.000000 ✓ |
| 同上 | `SOC_est(60)` − `SOC_true(60)` = 0（intB=0 同式） | ±1e-5 pp | 精确 0 ✓ |
| 同上 | `r_true` ≡ 0（定义恒等） | ≤1e-12 kW | 浮点精确 0 ✓ |

### 1.4 包络适用域（v1.1 新增，评审条件 A-2）

±25 kW 包络声明**仅限锚点场景**；合法参数域内存在确定越界（解析：load_step 轨
max\|P_bat\|(t0+) = magnitude + 10 kW，与 load0 无关）：

- load_step：magnitude > 15 kW 即越界（**+20 kW（域上限）→ max\|P_bat\| = 30 kW**）；
- actuator：magnitude < 25% 越界（load0=30 时 20% → 26.00 kW）；55% 且 load0 > 43.33 kW 越界；
- 极端角点（load0=45 + magnitude=20）：需求 65 kW、I_fc_ref→137.5 A、P_fc=55 kW
  （电堆无功率上限建模，为「20 kW 基准」的 2.75 倍）。

**裁定**：不得实现为全域硬检查（不同于 GT001_G2B_SPEC 的 ±25 kW 全域检查）；
处置 = FC `limitations` 增补上述越界域声明（FC-G2b-04）+ 极端角点作为限制项登记。

---

## 2. FC-001 actuator_fault（氢气阀卡涩）— G2b 规格

### 2.1 实现定案（v1.1 修订：钳位语义与双轨 τ 显式声明）

- `I_fc_cap = I_fc_base × magnitude/100`，其中 **I_fc_base = (load0 − 10)/0.4**
  （一般式；默认 load0=30 时 I_fc_base = 50 A，55% → 27.5 A）；
- 电堆电流钳位：target = **min(I_fc_ref, I_fc_cap)**（自 t_start 起）——**钳位式**，
  无恢复动态、无抗饱和补偿（A-ideal-limiter 已登记，语义扩展声明见 §2.2）；
- **actuator 轨电堆跟随 τ = 1.5 s**（engine.js:788 `isAct ? 1.5 : 1.2`；sensor/load 轨 1.2 s）。
  v1 草案与 systems.js EQ-2/A-fc-first-order 均只写 1.2 s，本版如实声明双轨 τ，
  FC-G2b-04 同步 assumptions（**裁定：声明现状，不改方程**——golden 既有 Run 全部为
  sensor/healthy 轨，τ=1.2 s 口径不受影响）；
- `valve_meas_pct = magnitude%`、`valve_cmd_pct` 持续 100%（指令与实际阀位背离可观测）。

### 2.2 需修正的项（对标 GT-001 G2b 条件映射）

| # | 项 | 内容 |
|---|---|---|
| 1 | 钳位语义声明 | min(I_fc_ref, I_fc_cap) 钳位式 + 双轨 τ（1.2/1.5 s）写入 assumption（A-ideal-limiter 扩展或新增 A-fc-clamp） |
| 2 | 电池限幅 | FC-001 电池是理想平衡源，限幅不适用；包络越界域按 §1.4 声明 |
| 3 | 恢复定义 | actuator 清除场景（t_clear_s）可选；清除后 I_fc_cap 释放、I_fc 回 I_ref；**当前实现与 golden 计划均不含清除 Run**（V-09 单事件边界声明见 §7 R-4） |
| 4 | UI 标签 | 「电堆阀门卡涩示意（**L0**），非电堆物理验证」——FC 层级为 L0（v1 误标 L0b，系 GT 专属，本版订正）；全部 33 模式禁词对 FC 文案同库适用（见 §5） |
| 5 | 独立 golden | actuator 场景 golden（复用 fc001 同一 oracle，增 Run，见 §4） |

### 2.3 验收锚点（评审人 A 复算确认）

| 场景 | 锚点 | 容差 | 复算 |
|---|---|---|---|
| `actuator_fault` 55% | `I_fc(60)` = **27.50 A**（钳位） | ±0.1 A | 实机 27.500000 ✓ |
| 同上 | `P_bat(60)` = **19.00 kW** | ±0.3 kW | 实机 19.000000 ✓ |
| 同上 | max \|P_bat\| = **19.00 kW**（在 ±25 kW 内） | 记录值 | ✓ |
| 全场景 | `r_true` ≡ 0（定义恒等） | ≤1e-12 kW | ✓ |
| 全场景 | 无 NaN/Inf；SOC ∈ [0,100] | 硬判据 | ✓ |

---

## 3. 因果模板与信号引用复核（评审人 A 结论：成立）

`fc-load-step`（systems.js:1059–1105）与 `fc-valve-stuck`（systems.js:1113–1137）signalIds
全部 ∈ FC001.signals（systems.js:435–457）；O-13 仅删 FL-001 load_step 故障与 FL 信号口径，
未波及 FC 自有信号。FC-G2b-04 需同步项：
fc-load-step n1/n2 文案按 §1.1 级联结构修正（保留 τ_ref=2.5 s 事实，模板 n2 已如实）；
`I_fc_ref_A` 信号 formula「I_fc_ref = 50 A」（systems.js:438）更新为一般式
`(P_load − 10)/0.4`（load_step 稳态 75/100/137.5 A 域内自适应）。

---

## 4. golden 扩展轮（v1.1 重写：oracle 侧扩展为工作量主体）

**基座勘误（评审人 B P1，随本批准登记 CHG-20261104-02）**：现 `fc001_v1.json` 工件元数据
（model_version=1.0.0、method_version=analytic_flux.1、approval 引用 CHG-20261028-04、
generated_at=2026-10-27）与 CHG-20261030-12 ②「oracle --emit 重出、analytic_flux.2、
model_version 1.1.0、approval 三字段重签」的记录**不符**——重出未落地（systems.js 已 1.1.0）。
工件本身数值自洽（verify_golden fc001 exit 0 实测）。**裁定**：登记勘误，不回溯改工件；
扩展轮重发时按 CHG-20261030-12 ② 口径一次性落齐。

扩展轮工作面（FC-G2b-02，M）：

| # | 项 | 内容 |
|---|---|---|
| 1 | oracle 物理扩展 | `fc001_oracle.py` 现 RUNS 仅 3 个 sensor_drift 规格、`b_at/i_fc_at` 仅偏置物理、self_check SC-1…7 偏置专属——需增 load_step 级联解析解（I_fc(u) = 75 − 48.0769·e^(−u/2.5) + 23.0769·e^(−u/1.2) 形式）与 actuator 钳位分段解 |
| 2 | Run 扩容 | 3 Run → **5 Run**：healthy、sensor_drift 闭环、sensor_drift monitor、load_step、actuator_fault（v1 草案「≥4」且漏计 healthy，本版订正） |
| 3 | SERIES_IDS 扩展 | 增 I_fc_ref_A / I_fc_cap_A / valve_cmd_pct / valve_meas_pct |
| 4 | 元数据落齐 | model_version 1.0.0→1.1.0、method_version→analytic_flux.2、approval 三字段重签（引本批准 CHG） |
| 5 | self_check 扩展 | 级联/钳位场景自检项（SC-8+，含 §1.3/§2.3 锚点复算） |

**verify_golden.py 无需改动**：按 `golden.runs` 遍历并回查 `oracle.RUNS`（scripts/verify_golden.py:195–196），
无硬编码 Run 清单（v1 草案「参数化同步」指向错位，本版订正）。

---

## 5. UI 与措辞（v1.1 订正）

- copy-guard 33 模式为**全库禁词**（tools/copy-guard.mjs 扫描 src/**，不按系统分域）；
  「四禁词为 GT 专属」论断作废——FC 文案继续受全部模式约束，GT 专属的只是 ALLOW 语境串
  「非机组/电网动态验证」；FC 拟议文案经实测无命中，run-g2 copy-guard 步兜底；
- FC 系统卡：scope=approved_fc 已生效（W-2）；层级标签 L0（非 L0b）；
- 因果模板修正项见 §3。

## 6. 实现排期（v0.6.0 队列，另行指令派发）

| 步骤 | 内容 | 规模 |
|---|---|---|
| FC-G2b-01 | ~~I_fc_ref 歧义定案 + 锚点复算~~ **已完成**（2026-10-31 实机复算 + 本批准评审三法交叉确认） | — |
| FC-G2b-02 | oracle 扩展（§4 表 1/3/5）+ golden 增 Run 5 + 元数据落齐（§4 表 4）+ t_clear_s（可选，暂不实现） | M |
| FC-G2b-03 | ~~双路独立评审 + 用户批准~~ **已完成**（2026-11-04，§8） | — |
| FC-G2b-04 | 实现：systems.js 文案/assumptions/EQ-6 登记/I_fc_ref_A formula/limitations 越界域/模板级联措辞/层级标签 + **FAULT_CATALOG §5 募误表挂载（DEC-R1）** + 预期失效面落地核对 | S |

## 7. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | ~~I_fc_ref 歧义~~ 已定案（§1.1） | — |
| R-2 | 电池限幅：参数域内确定越界（§1.4 清单） | 声明域限定 + limitations 登记；不实现全域硬检查 |
| R-3 | 因果模板信号引用（共用 id P_load_demand_kW） | FC 自有信号目录含之 ✓（§3 复核成立） |
| R-4 | t_clear_s 未来入 golden 时 V-09 单事件比对不足 | 边界声明：当前计划无清除 Run；若启用须先扩展 verify_golden 多事件（GT 先例 buildSnapshots 多事件循环化） |
| R-5 | fc001_v1 元数据失同步（§4 基座募误） | 本批准登记；FC-G2b-02 一次性落齐 |

## 8. 评审记录（2026-11-04）

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | 锚点三法交叉复算（引擎逐位复刻/RK4/级联闭式解）、边界情形、信号引用 | **PASS_WITH_CONDITIONS**（3 条件 10 findings） | 全部锚点逐位成立（74.999995/10.000002/20.000000、27.500000/19.000000）；级联机制、双轨 τ、包络越界域、I_fc_ref_A formula 过期、oracle 扩展缺口 |
| 评审人 B（治理/口径/回归面） | 目录字段全量核对、G2b 进入条件、copy-guard 口径、预期失效面、排期完成度 | **PASS_WITH_CONDITIONS**（5 条件 10 findings） | 目录 9 行字段全部一致；fc001_v1 工件与 CHG-20261030-12 失同步（P1）；机制错述（与 A 汇合）；copy-guard 全库口径；L0 标签订正；预期失效面声明 |

**条件处置**：两路条件已全部修订进本 v1.1（§1.1/§1.2 级联与 EQ-6、§1.4 包络域、§2.1 双轨 τ、
§4 基座勘误与 oracle 工作面、§5 口径订正、§6 排期出口补全）；FC 侧同步实现项归 FC-G2b-04。

**预期失效面（对齐 CHG-20261102-01 先例，FC-G2b-02/04 落地时生效）**：
fc001_v1 golden 字节/sha 变更 + sidecar 重签（现 sha f518c7bc… 退役）；tests/engine-fc.test.js
Run 键引用随之扩展（10 处硬编码）；既有 sensor_drift Run 数值不变；归档评测局
eval-session-001 为 FL-001 场次，零影响；当前无 FC 盲包/testset，盲包重放面为零。

---

**文件结束**。FCEXT_G2B_SPEC_APPROVED v1.1（2026-11-04，CHG-20261104-02 批准）。
实现排期 FC-G2b-02/04 待 v0.6.0 队列指令派发。
