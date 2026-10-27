# MODEL_VALIDATION_SPEC — FL-001 模型验证、数值 golden 与 G2 验收规格

```yaml
doc_id: FL-G2-MODEL-VALIDATION-SPEC
doc_version: v1.0
status: G0-APPROVED
approval: "2026-10-27T20:35 用户指令：『产出文档并且对齐 docs 文档到本次决策』（经 Team Lead 转述）"
author_id: spec-model（G2 规格 Agent A）
reviewer_id: lead（G0 合并与裁定记录者；本文件由 Lead 复核后并入 G2 证据包，复核结论以 evidence 记录为准）
created_at: "2026-10-27T20:37+08:00"
scope: FL-001 × 3 固定 Run × 解析/行为级（L0）数值语义、golden v1、PHY/SA 验收矩阵、G2 关闭条件
related_task: task-4（G2 规格文档 A；并行文档 B = BACKLOG_APPROVED.md + SCOPE_SPLIT_MEMO.md）
baseline_decisions: FaultLab-evaluation/DECISIONS/DECISIONS.md（G0-DEC-04/05/06/08/09/11/12/13/15/16；D-01…D-08；O-05）
complements: FaultLab-evaluation/NEXT/DATA_CONTRACT_SPEC.md（同批 G2 交付；对象/字段/事件/哈希/导入/投影/指标）
```

**权威关系（冲突处理顺序）**

1. **`DECISIONS.md` > 本文件 > `INPUT/V0.1_SPEC.md` / `INPUT/V0.2_PLAN.md`**。本文件是 G0-DEC-12/16 的落地规格；与 DECISIONS 冲突时以 DECISIONS 为准，并须按 G0-DEC-17 登记 `CHG-YYYYMMDD-NN`。
2. 本文件与 `NEXT/DATA_CONTRACT_SPEC.md` **互补、不重叠**：字段/编码/Schema/导入/导出/哈希规范化归 DATA_CONTRACT_SPEC；**方程、数值、容差、PHY/SA 判定与 golden 归属本文件**。两者冲突时：数值口径以本文件为准，数据编码以 DATA_CONTRACT_SPEC 为准，范围以 DECISIONS 为准。
3. 用户可见措辞不在本文件规定，见 `NEXT/UI_COPY_GUARDRAILS.md`；本文件 §9.3 只给出**证据措辞边界**（禁止把一致性检查说成物理验证）。
4. 本文件的 `G0-APPROVED` 指**决策已批准**，不表示任何数值检查、浏览器测试或模型验证已经执行。`DECISIONS.md` 已由 Lead 回写为 `APPROVED`（状态行与 §1.0 批准记录，2026-10-27T20:43），冻结索引见 `DECISIONS/SPEC_v0.2_APPROVED.md`；本文件批准依据是 2026-10-27T20:35 用户指令。

**基线快照（本文件只对以下 SHA-256 负责；批准版实测，与 `SPEC_v0.2_APPROVED.md` 附录 A 一致）**

| 文件 | SHA-256 | 用途 |
|---|---|---|
| `DECISIONS/DECISIONS.md` | `5498DB817F1CC28681F1A9A3A31E96CE2DE5366AA78E28B184CF6DFF593BD805` | 决策基线（APPROVED） |
| `REVIEWS/REVIEW_DIFF.md` | `37CB2D32BA563E04FF59BD796B7CA137860F7DB5A3D690E845516254AEC934A4` | B01–B15 与裁定 |
| `REVIEWS/CLAUDE_REVIEW.md` | `CFA9F82D57C7EE4452AA8A16F60BD05615520EEC1699B07E5B9DCE4759DE86FB` | PHY/SA/W/U 来源 |
| `REVIEWS/NUMERIC_ORACLE.md` | `CDA98EF5637B6F7419B3808A00EE8AB3EDC6D07F2D1FE5D8ADEC7B55F939064D` | 全精度 golden 来源（附录 B） |
| `tools/verify_fl001.py` | `B60C825C390C5098E27F84101673C64B55EDCC14468C52FF3A1CCFCAAA8CFA37` | 现有独立 oracle 证据（1550 行，Lead 实跑 exit 0） |
| `INPUT/V0.1_SPEC.md` / `INPUT/V0.2_PLAN.md` | `5378D5EA…4568` / `2123E436…6FA2` | 上游原文 |
| `docs/CONTRACT.md`（只读参照） | `AE93D913A3101237B392BF97DF65344B2FB823245173A2E50C04D94F47F35260` | 现状实现契约；已知需修项见 `UI_COPY_GUARDRAILS.md` §8.4 与本文 §10.3 第 7 条，**本文件不修改它** |

**编号约定**：`PHY-*` 数值/物理检查；`SA-*` G2 验收矩阵；`B01…B15` 评审阻断；`G0-DEC-*`/`D-*` 决策；`N-*` 数值口径缺口；`W-*`/`U-*` 措辞与 UX（在 UI 文档中定义）。

---

## 1. 模型范围与定义

### 1.1 模型身份与适用等级

- **模型**：FL-001「电池电流传感器 +10 A 正偏置」；**等级 L0 解析/行为级演示**（`model_provenance=analytical_demo`）。
- **不是** Simulink/数值仿真、不是实测、不是硬件验证；**不含**任何未在 §1.2 列出的物理方程。
- **唯一数值源**：`§1.2` 的六条解析式 + 一个理想功率平衡（`P_gen,true := P_load,served − P_bat,true`）。

### 1.2 FL-001 固定参数（P0 冻结，G0-DEC-04）

| 参数 | 符号/字段 | 值 | 单位 | 冻结说明 |
|---|---|---:|---|---|
| 仿真时长 | `duration_s` | 60 | s | P0 冻结 |
| 采样步长 | `sample_dt_s` | 0.1 | s | P0 冻结；输出点数由参数派生（`n = duration_s/dt_s + 1`，见 DATA_CONTRACT_SPEC §1.4，禁止硬编码） |
| 故障时刻 | `fault_time_s` | 20.0 | s | P0 冻结；必须为 0.1 s 整数倍 |
| 传感器偏置 | `bias_A` | +10.0 | A | P0 冻结；符号=测量通道加性偏置 |
| 母线电压 | `Vdc_V` | 400 | V | 理想恒压，不求解电压动态 |
| 控制器电流目标 | `Iref_A` | 25 | A | 放电为正 |
| 闭环时间常数 | `tau_s` | 1.5 | s | 行为级一阶等效 |
| 负载需求/已服务 | `Pload_demand_kW` / `Pload_served_kW` | 30 / 30 | kW | 恒功率；本例二者相同 |
| 电池额定能量 | `Ebat_nominal_kWh` | 40 | kWh | 理想库仑计数 |
| 初始 SOC | `SOC0_pct` | 60 | % | — |
| 反馈模式 | `feedback_mode` | `closed_loop` / `monitor` | — | 唯一允许的运行间差异字段 |

**换算常数**：`P_kW = Vdc·I_A / 1000 = 0.4·I_A`；时间单位 s；`∫P dt` 单位 kW·s，`kWh = ∫P dt / 3600`。

### 1.3 核心方程（六条；本文件唯一公式来源）

**EQ-1 偏置（阶跃事件，不连续）**

```text
b(t) = 0 A          (t < t_f = 20.0 s)
b(t) = +10 A        (t ≥ t_f)
```

**EQ-2 测量（定义）**：`I_meas(t) = I_true(t) + b(t)`，仅此一条测量通道；无噪声/漂移/量化/延迟。

**EQ-3 真实电流动力学（闭环模式；仅监测为分支）**

```text
闭环:  tau·dI_true/dt + I_true = I_ref − b(t)，  I_true(0)=25 A，I_ref=25 A，tau=1.5 s
       t<t_f : I_true = 25 A
       t≥t_f : I_true(t) = 15 + 10·exp(−(t−t_f)/tau) A        （= I_ref − b + b·exp(−u/tau)，u=t−t_f）
仅监测: I_true(t) ≡ 25 A（b 不进入物理回路）
无故障: b(t)≡0 的闭环特例 ⇒ I_true(t) ≡ 25 A
```

**EQ-4 功率（定义）**：`P_bat,true = 0.4·I_true`；`P_bat,meas = 0.4·I_meas`；`P_load,demand = P_load,served = 30 kW`；`P_gen,true := P_load,served − P_bat,true`（**理想瞬时平衡源**，无惯量/调频/AVR/保护）。

**EQ-5 残差（定义，恒等式）**：`r_true = P_gen,true + P_bat,true − P_load,served ≡ 0`；`r_meas = P_gen,true + P_bat,meas − P_load,served ≡ 0.4·b(t)`（故障期恒 +4 kW）。

**EQ-6 SOC（定义；V0.1 §1 的 ×100 缺失在此修正，B04/G0-DEC-12）**

```text
SOC_true(t) = 60 − 100·(1/40)·∫[0,t] P_bat,true(s)/3600 ds    单位 %
SOC_est(t)  = 60 − 100·(1/40)·∫[0,t] P_bat,meas(s)/3600 ds    单位 %（naive_coulomb_counting）
SOC_err_pp(t) = SOC_est(t) − SOC_true(t)                       单位百分点 pp（不得写成 %）
```

### 1.4 事件 pre/post（冻结，G0-DEC-05 / B01）

| 项 | 冻结规则 |
|---|---|
| 事件索引 | `i_f = round(t_f / dt) = 200`；断言 `t[i_f] == t_f`（`t_i = i·dt`，容差 1e-12 s） |
| `pre` | `t_s = 20.0` 的**左极限**（`b=0`、`I_true=25 A`、`I_meas=25 A`），`derivation='left_limit'`；**不是** 19.9 s 采样行 |
| `post` | `t_s = 20.0` 的右极限/采样行（`b=10 A`、`I_true=25 A`、`I_meas=35 A`），`derivation='post_sample'` |
| 19.9 s | 仅上一**常规采样点** `t[199] = 19.900000000000002 s`（`199×0.1` 的 IEEE-754 值），`I_meas=25 A`；可在曲线标注为“事件前最后采样”，但字段不得进入 `pre` |
| 20.0 s 常规行 | `timeseries.csv` 第 200 行 = post（`I_meas=35 A`） |
| 存储位置 | `events.json` 必须同时含 `(event_id,'pre')` 与 `(event_id,'post')`；主键 `(event_id, phase)`；两处冲突以 events 相位为准；`manifest.json` 记 `event_encoding_version = 1`（数值枚举，见 DATA_CONTRACT_SPEC §2.5） |
| 图表 | 20.0 s 处测量序列必须呈现两个不同 y 点（阶跃）；**禁止跨事件样条/平滑插值** |

### 1.5 单位与符号约定

| 约定 | 规则 |
|---|---|
| 电流符号 | **放电为正**；`I_true`、`I_meas`、`bias` 均以 A 计；负值仅在未来 P1 扩展出现（P0 不出现） |
| 功率符号 | 电池侧放电为正；`P_gen` 恒 ≥0（P0 参数域内） |
| 能量符号 | `E_bat` 放电为正；本场景 `E_gen + E_bat = 0.5 kWh` 是**定义恒等**（见 §3.4） |
| SOC / 误差 | `SOC_*` 单位 `%`；`SOC_err_pp` 单位 `pp`（百分点），**禁止**把误差写成 `%` |
| 时间 | 十进制秒，1 位小数展示；存储 `i·dt` 全精度 |
| 数值 | 全链路 IEEE-754 double；golden 存储全精度；禁止 float32 |

### 1.6 三组固定 Run（G0-DEC-01 / D-04）

| run_id | role | feedback_mode | 故障 | 说明 |
|---|---|---|---|---|
| `healthy` | baseline | `closed_loop` | 无 | 无故障对照 |
| `closed_loop_fault` | fault | `closed_loop` | `sensor_drift`，`b=+10 A @20 s` | 关键反事实之一：闭环 |
| `monitor_only` | monitor | `monitor` | 同上 | 关键反事实之二：仅监测（P0，覆盖 V0.1 §12 的 P1；`role` 枚举见 DATA_CONTRACT_SPEC §1.3） |

三组 Run 全部固定配置、独立 `run_id`、内容不可变；`compare` 兼容白名单必须允许“仅 `feedback_mode` 不同”（D-04 附加条件）。

---

## 2. 适用边界

### 2.1 模型只包含

**“本模型只有 6 条解析式 + 1 个理想功率平衡；不含电池电化学、开关器件、机组与电网动态。”**（与 UI_COPY_GUARDRAILS §1 模型假设卡同一句）

### 2.2 未建模物理清单（UI 不得暗示已建模）

| 对象 | 模型包含 | **明确不含** |
|---|---|---|
| 电池 | 库仑计数、恒压 400 V 下功率换算 | 电化学/OCV-SOC 非线性/内阻/温度/老化/充放电效率/限幅 |
| 电流传感器 | 加性阶跃偏置 `b(t)` | 噪声、漂移、量化、延迟、冗余通道 |
| 控制器 | 行为级一阶等效（把测量电流调节到 `I_ref`） | PI/PID 参数、限幅/抗饱和、采样延迟、离散实现细节 |
| 变换器 | 无损理想受控电流源（0.4 kW/A） | 开关动态、效率、限流、母线电容 |
| 发电机 | `P_gen := P_load − P_bat` 理想瞬时平衡 | 惯量、调频、AVR、保护、机组滞后（**禁止画滞后曲线/频率波动**，V0.2 R-02） |
| 直流母线 | 理想 400 V | 电压跌落、纹波、电容储能 |
| 负载 | 恒功率 30 kW（配置值） | 电压/频率相关负载特性、投切动态 |
| 积分/事件 | 解析闭式解 + 0.1 s 输出网格 | 求解器误差、事件定位策略（L0 解析无）、子步物理 |

### 2.3 三级证据必须分开（D-01/D-07/G0-DEC-08）

| 等级 | 本项目取值 | 允许说法 | 禁止说法 |
|---|---|---|---|
| `consistency_checks`（内部一致性检查） | `pass` / `fail` / `skipped` | “内部一致性检查通过：定义恒等式 + 金标准数值比对” | “物理守恒验证通过 / 模型验证通过” |
| `model_validation`（模型验证） | **`not_performed`** | “未进行模型验证（无实测/FMU/Simulink 对比）” | “已验证 / 与实测一致 / 物理正确” |
| `hardware_verification`（硬件验证） | **`not_performed`** | “未做硬件验证” | “实测 / 已部署 / 已在真实设备上运行” |

> “一致性检查 ≠ 模型验证 ≠ 硬件验证”三级必须同时出现在 `RunManifest` 与导出页脚（UI_COPY_GUARDRAILS §1.2）。

---

## 3. Golden v1（解析金标准）

### 3.1 生成来源与状态

- **来源**：`REVIEWS/NUMERIC_ORACLE.md` §2/§3/§4/§6 与**附录 B 全精度速查**（三路独立计算一致；`verify_fl001.py` exit 0 记录见 `REVIEW_DIFF.md` §1.3）。本文件**只转录** oracle 值，未新增任何独立数值计算。
- **状态**：Golden v1 = **待固化为 `data/golden/fl001_v1.json`**（本文件定义其字段与容差；生成由独立 oracle 完成，见 §6）。**不得**把显示舍入值（如 0.123889）当作全精度 golden 使用。
- **方法**：`method_id = analytic_flux`（事件感知解析闭式积分）；`method_version = 'analytic_flux.1'`；`model_version='fl001.1'`、`schema_version='1.0.0'`（与 DATA_CONTRACT_SPEC §1.1 版本三元组一致）。
- **与 DATA_CONTRACT_SPEC 附录 A 的关系**：该处 15 位打印值（如 `0.123888888888885`）与本文附录 B 全精度值（`0.12388888888888452`）在 rtol 1e-12 内一致；**判定以本文 golden 层全精度为准**，附录 A 属展示级转录。

### 3.2 关键逐点值（`closed_loop_fault`；全精度）

| 时刻 | phase / 行 | `I_true` / A | `I_meas` / A | `P_bat,true` / kW | `P_gen,true` / kW | `r_true` / kW | `r_meas` / kW |
|---|---|---|---:|---:|---:|---:|---:|
| 19.9 s | 常规 `t[199]=19.900000000000002` | 25.0 | 25.0 | 10.0 | 20.0 | 0.0 | 0.0 |
| 20.0 s | pre（左极限） | 25.0 | 25.0 | 10.0 | 20.0 | 0.0 | 0.0 |
| 20.0 s | post（`t[200]`） | 25.0 | 35.0 | 10.0 | 20.0 | 0.0 | +4.0 |
| 21.5 s | 常规 | 18.678794411714424 | 28.678794411714424 | 7.47151776468577 | 22.52848223531423 | 0.0 | +4.0 |
| 26.0 s | 常规 | 15.183156388887342 | 25.18315638888734 | 6.073262555554937 | 23.926737444445063 | 0.0 | +4.0 |
| 60.0 s | 常规 | 15.000000000026231 | 25.000000000026233 | 6.00000000001049 | 23.99999999998951 | 0.0 | +4.0 |

**读表规则**

- `I_meas = I_true + 10 A`、`P_gen = 30 − P_bat` 为定义关系；表中数值由附录 B / oracle §2 全精度值按定义代数导出，末位可差 1 ulp。
- **`I_true(60) ≠ 15`**：它是 `15 + 10·e^(−40/1.5) = 15.000000000026231 A`；任何“精确 15”或 1e-12 A 绝对相等断言都会误判（N-08）。
- `P_bat,meas = P_bat,true + 4.000000000000 kW`（定义恒等）；`r_true/r_meas` 为定义恒等，精确 `0 / +4`（双精度逐点 0.0）。
- 全部 601 点 `r_true = 0.0 kW`（三组 Run；oracle 实测）；`r_meas` 在故障期全为 +4.0，故障前为 0.0。

**其余两组 Run 的关键点（补充完整三组对照；数值为常量/精确值）**

| run | 19.9 s（`I_true/I_meas`） | 20.0 s post（`I_true/I_meas`） | 60 s（`I_true/I_meas`） | `P_bat,true` / `P_gen,true` @60 s | `r_meas` |
|---|---|---|---|---|---|
| `healthy` | 25 / 25 A | 25 / 25 A | 25 / 25 A | 10 / 20 kW | 0（全程） |
| `monitor_only` | 25 / 25 A | 25 / 35 A | 25 / 35 A | 10 / 20 kW | 0（故障前）→ +4（故障期） |

### 3.3 能量与 SOC 标量（三组 Run；全精度）

| 量 / 单位 | `healthy` | `closed_loop_fault` | `monitor_only` |
|---|---:|---:|---:|
| `E_bat,true` / kWh | 0.16666666666666666 | 0.12388888888888452 | 0.16666666666666666 |
| `E_gen,true` / kWh | 0.33333333333333337 | 0.3761111111111155 | 0.33333333333333337 |
| `E_bat,meas` / kWh | 0.16666666666666666 | 0.16833333333332898 | 0.2111111111111111 |
| `E_load,served` / kWh | 0.5 | 0.5 | 0.5 |
| `SOC_true(60)` / % | 59.583333333333336 | 59.69027777777779 | 59.583333333333336 |
| `SOC_est(60)` / % | 59.583333333333336 | 59.57916666666668 | 59.47222222222222 |
| `SOC_err_pp(60)` / pp | 0.0 | −0.11111111111110716 | −0.11111111111111427 |

- `healthy` 的 `E_bat,meas`、`SOC_est` 与真值口径相同（`b≡0`），由定义导出。
- `E_load,served = 30×60/3600 = 0.5 kWh` 精确。
- **`SOC_err_pp` 必须逐 run 记录**（PHY-07 / N-04）：closed 与 monitor 恰好同值，但 `run_id` 不能省；单位字符串必须是 `pp`。

### 3.4 恒等式清单（**不可**作为物理验证，仅作回归）

| ID | 恒等式 | 依据 | 允许用途 |
|---|---|---|---|
| ID-1 | `r_true(t) ≡ 0` | `P_gen := P_load − P_bat` | 代数/浮点路径一致性回归（PHY-01） |
| ID-2 | `r_meas(t) ≡ 0.4·b(t)` | 同上 + `I_meas=I_true+b` | 测量通道误差功率当量回归（PHY-05/09） |
| ID-3 | `E_gen + E_bat ≡ 0.5 kWh` | 线性求积下逐点 `P_gen+P_bat≡30` | **仅**“定义恒等”展示（SA-23），**不得作为唯一数值门禁** |
| ID-4 | `SOC_est − SOC_true ≡ −100·0.4·b·Δt_f/(40·3600) = −0.1111111 pp` | `b` 的积分 | 单位/符号回归（PHY-07），与 τ/模式无关 |
| ID-5 | `I_true(20−) = I_true(20+) = 25 A` | EQ-3 解在事件点连续 | C0 连续回归（PHY-03） |
| ID-6 | `I_true` 右导数 `= (15−25)/1.5 = −6.666666666666667 A/s`，左导数 `= 0` | EQ-3 | C1 不连续回归（PHY-03） |

### 3.5 存储、显示与舍入规则（G0-DEC-06）

| 层 | 规则 |
|---|---|
| **存储/golden 层** | 全精度 double（17 位有效往返）；不得存显示舍入值；`I_true(60)` 存 `15.000000000026231` |
| **显示层** | 按字段 `precision`：`t` 1 dp；`I`/`P` 4 dp；`E` 6 dp；`SOC_true`/`SOC_est` 6 dp；`SOC_err_pp` 5 dp（最终以 DATA_CONTRACT_SPEC 的 `SignalCatalog.precision` 为准） |
| **舍入模式** | `round-half-up`（远离零方向取整：`sign(x)·floor(\|x\|·10ⁿ+0.5)/10ⁿ`）。注：Oracle §6.4 曾建议 round-half-even，**未被采纳**（与 G0-DEC-06 冻结项冲突）；如变更须走 CHG |
| **“≈”规则** | 任何文档/UI 中的“≈”必须写明容差（例：`≈15 A（容差 ±1e-9 A）`）；golden 文档禁用无容差“≈” |
| **判定分层** | `golden_consistency`（解析口径，rtol 1e-12 / atol 见 §3.6）与 `display_rounding`（字符串精确）**分开判定，不得混用** |
| 禁止 | 用显示值反推 golden；用截断代替四舍五入；把 `pp` 与 `%` 混写 |

### 3.6 golden 容差（§4/§5 引用）

| 字段 | G2 门禁容差（DECISIONS G0-DEC-06） | 解析交叉严格容差（实现宣称“解析口径”时） |
|---|---|---|
| `E_bat`/`E_gen`/`E_bat,meas` | **±1e-6 kWh** | rtol 1e-12（atol 1e-15 kWh） |
| `SOC_true`/`SOC_est` | **±1e-5 pp**（百分点数值） | atol 1e-9 pp |
| `SOC_err_pp` | **±1e-5 pp** | atol 1e-9 pp |
| `I_true`/`I_meas`/`P_bat`/`P_gen` | rtol 1e-12 + atol 1e-15（A/kW） | 同左 |
| `r_true` | **≤1e-12 kW**（全链路 double；见 PHY-01） | — |
| `r_meas` | atol 1e-9 kW（精确 0/+4） | — |
| `t` | 1e-9 s | — |
| 显示字符串 | 精确相等（按 §3.5 舍入后） | — |

> 若实现采用数值求积（trapz/矩形）而非解析积分，**不得**按 ±1e-6 kWh 断言，须按 §7.2 声明 `method_id` 并放宽到 ≥1e-5 kWh / 5e-4 pp；解析 golden 不可被求积结果替代。

---

## 4. PHY-01…PHY-10 修订版（G0-DEC-12 / B03）

### 4.1 修订总则

- **改名**：`PHY-01` → “定义自洽（代数一致性）”；`PHY-06` → “对解析 golden 的比对”。**任何报告/UI 不得写“物理守恒验证通过 / 模型验证通过”**（可用“内部一致性检查通过”）。
- **判据必须可计算**：给出字段、时间窗、容差、`run_id`；禁止“浮点误差容限”“一致积分规则/容差”这类循环表述。
- **归属四类**：`数值脚本`（PHY-01/01b/02/03/04/05/06/07）、`浏览器 E2E`（PHY-08）、`RunRegistry/规范哈希`（PHY-09）、`Schema/单位字典`（PHY-10 完整项）。**PHY-08/09 不能由数值脚本判定**（N-12/B14）。
- **容差分档**：`T-ident`=定义恒等 1e-12；`T-analytic`=对闭式解 1e-6（golden 门禁）；`T-ui`=显示字符串/交互断言精确。

### 4.2 修订表

| 编号 | 新名称 | 可计算判据 | 容差 | 归属 | 失败文案（UI/证据） | 关联 |
|---|---|---|---|---|---|---|
| **PHY-01** | 定义自洽（代数一致性） | 三组 Run × 601 点 `max_t \|r_true(t)\|`；`P_bat=0.4·I_true` 单位换算抽检 | **≤1e-12 kW**（全精度 double 引擎内计算）；若只能保证 1e-9（如导出后重算）须记 `check_tier='loose'` 并在证据包说明；float32 禁止 | 数值脚本 | “定义自洽检查未通过：`P_gen ≠ P_load − P_bat`” | B03/N-01 |
| **PHY-01b**（新增） | 解析式 ODE 残差 | 闭环解在 601 点满足 `τ·I′ + I − (I_ref − b)`；`I′` 用闭式导数 | **≤1e-9 A**（oracle 实测 max 3.55271e-15 A） | 数值脚本 | “ODE 残差超限：闭式解不满足行为级方程或积分实现漂移” | B03 |
| **PHY-02** | 偏置约束（索引化 pre/post） | `i_f=round(t_f/dt)`；`pre = 索引<t_f` 且事件左极限；`post = 索引≥i_f`；断言 `I_meas−I_true−b(t)=0`；`b` 由 `config.bias_A` 派生（含符号） | ≤1e-9 A（实测 ≤3.55e-15 A） | 数值脚本（+E2E 断言快照展示） | “偏置约束不成立：pre/post 索引或 `bias` 派生错误（检查 `i_f` 与 `config.bias_A`）” | B01/N-02 |
| **PHY-03** | 连续状态 + C1 不连续 | C0：`\|I_true(20−)−I_true(20+)\|`；C1：右导数 `−6.666666666666667 A/s`、左导数 `0`（只用 C0 抓不到“错误平滑”） | C0 ≤1e-12 A；C1 ≤1e-6 A/s | 数值脚本 | “事件连续性/斜率错误：疑似跨事件平滑或相位错位” | B01/N-09 |
| **PHY-04** | 闭环趋势与边界 | post 相邻样本严格递减（事件区间 19.9→20.0 差分=0 允许）；`\|I_true(60)−15\|`；边界 `0≤I_true≤25 A`、`P_gen≥0`；P1 负偏置改为“递增趋向 `25−b`” | `\|I_true(60)−15\|≤1e-9 A`（实测 2.62e-11）；边界精确 | 数值脚本 | “闭环趋势/边界错误：未单调趋向 15 A 或越界” | N-08/C-2 |
| **PHY-05** | 仅监测 | `I_true≡25`（601 点精确）；`I_meas` 前 200 点 25、后 401 点 35；post `r_meas=4`；`SOC_est(60)=59.47222222222222`；`SOC_err=−0.11111111111111427 pp` | 常量精确；`r_meas` ≤1e-9 kW；SOC ±1e-5 pp（门禁） | 数值脚本 | “仅监测运行错误：真实电流被反馈影响或偏置缺失” | D-04 |
| **PHY-06** | **对解析 golden 的比对** | ①`\|E_bat − 446/3600\|`；②`\|E_gen − 1354/3600\|`；③`E_load` 由配置 `30×60/3600` 独立算；④`E_gen+E_bat=0.5` **仅作定义恒等演示**（ID-3），不得作为唯一门禁 | ①±1e-6 kWh；②±1e-6 kWh；③1e-9 kWh；④仅展示 | 数值脚本 + golden | “对解析金标准比对失败：电能积分偏差超容差（检查 `method_id`/求积规则）” | B02/B03 |
| **PHY-07** | SOC 与单位 | EQ-6（×100、/3600）；逐 run 记录 `SOC_true/SOC_est/SOC_err_pp`（closed/monitor/healthy）；断言单位字符串 `pp` | SOC ±1e-5 pp（门禁；解析交叉 1e-9）；单位精确 | 数值脚本 + Schema | “SOC 计算或单位错误：检查 ×100 换算与 `pp`/`%` 字段类型” | B02/B04/N-04 |
| **PHY-08** | 非回归（回放不变性） | 播放速度/页面/游标变化前后 Run 数据逐字节不变、`run_hash` 不变；`configHash` 不含回放状态 | 字节/哈希精确相等 | **浏览器 E2E（Playwright）**；数值脚本不可判定 | “回放改变了运行数据或哈希（PHY-08 需 E2E 判定）” | B14/N-12 |
| **PHY-09** | 配置变化与 Run 不可变 | 同 config 两次 `configHash` 相同；改 `bias_A` 后 `configHash` 不同；旧 Run 内容与 `run_id` 不变；改参数只改草稿 | 精确 | **RunRegistry/规范哈希测试** | “配置哈希或 Run 不可变性错误：历史 Run 被改写” | B14/B05 |
| **PHY-10** | 数据完整性 | 量纲注册表校验（A 与 kW 不可互换）、601 点、`t[k]=k·0.1`、严格递增、有限值、事件快照引用存在、数组同长、`event_encoding_version` 存在 | 精确（子集可在数值脚本判定） | **Schema/单位字典校验器** | “数据结构/单位校验失败：`<field>`（详见 `checks.json`）” | B14 |

### 4.3 PHY-01 为什么必须改名（给实现者的解释，避免再次“自证”）

- `P_gen := P_load − P_bat` ⇒ `r_true = (30−P)+P−30`，双精度下逐点精确 0（oracle 三组 × 601 点实测 0.0）。
- 换错 τ、bias 符号，甚至把 `P_bat` 写成 `0.5·I`，`r_true` **仍然恒 0** ⇒ 它只能抓代数/浮点路径错误，**不能检测物理建模错误**。
- 真正的公式级门禁是 **PHY-01b（ODE 残差）** 与 **PHY-06（对解析 golden 比对）**；PHY-01 保留为廉价回归。

---

## 5. SA-01…SA-24 验收矩阵（G2 基线；含 2 条新增）

> 容差代号：`T-ident`=1e-12；`T-analytic`=1e-6（门禁）；`T-quad`=求积规则相关（§7.2）；`T-ui`=精确字符串/交互。独立校核一律用独立脚本闭式解重算，**禁止调用被测引擎自证**。

| ID | 期望结果 | 容差 | 独立校核方式 | 失败文案 |
|---|---|---|---|---|
| SA-01 | 601 点 `t[k]=k·0.1`，`t[600]=60` | 1e-9 s | 独立生成 `k·0.1` 对比 | “采样网格不一致：期望 601 点 / 0.1 s” |
| SA-02 | 19.9 s：`I_true=I_meas=25 A` | T-ident | 闭式式 | “事件前状态错误：19.9 s 测量≠25 A” |
| SA-03 | 20.0 s post：`I_true=25`、`I_meas=35` | T-ident | 闭式式 + 事件快照 | “20 s 事件 post 值错误” |
| SA-04 | `I_true(21.5)=18.678794411714424 A` | T-analytic（交叉 rtol 1e-12） | 闭式式 | “黄金时刻 21.5 s 不匹配，结果不可发布” |
| SA-05 | `I_true(26)=15.183156388887342`；`I_meas=25.18315638888734 A` | T-analytic | 闭式式 | “黄金时刻 26 s 不匹配” |
| SA-06 | `I_true(60)=15.000000000026231`；`\|I_true(60)−15\|≤1e-9` | 1e-9 A | 闭式式 | “60 s 未收敛到解析稳态（注意：不是精确 15）” |
| SA-07 | C0：`I_true(20−)=I_true(20+)`；C1：右导数 −6.666666666666667 A/s | T-ident / 1e-6 A/s | 闭式式求导 | “事件连续性/斜率错误（可能被平滑）” |
| SA-08 | `r_true(t)=0` 全 601 点（定义自洽） | T-ident | 代数恒等（**不作为物理验证**） | “定义自洽失败：`P_gen≠P_load−P_bat`” |
| SA-09 | `r_meas=0.4·b`：故障前 0、故障期 +4 | T-ident | 代数恒等 | “测量残差与偏置不匹配” |
| SA-10 | `P_bat(21.5)=7.47151776468577`；`P_gen=22.52848223531423 kW` | T-analytic | 闭式式 | “黄金时刻功率不匹配” |
| SA-11 | 闭环 `E_bat=0.12388888888888452 kWh` | ±1e-6 kWh（解析交叉 rtol 1e-12） | 闭式积分 | “电池电能积分偏差超容差（检查求积规则）” |
| SA-12 | 闭环 `E_gen=0.3761111111111155 kWh` | ±1e-6 kWh | 闭式积分 | “发电机电能积分偏差” |
| SA-13 | `E_load=E_load,served=0.5 kWh` | 1e-9 kWh | `30×60/3600` 独立算 | “负载电能计算错误” |
| SA-14 | 闭环 `SOC_true(60)=59.69027777777779%` | ±1e-5 pp（门禁） | 闭式积分 | “真实 SOC 末值错误” |
| SA-15 | 闭环 `SOC_est(60)=59.57916666666668%`；监测 `=59.47222222222222%` | ±1e-5 pp | 闭式积分 | “估计 SOC 末值错误” |
| SA-16 | `SOC_err_pp`：闭环 `−0.11111111111110716`、监测 `−0.11111111111111427`、基准 `0` | ±1e-5 pp（门禁；交叉 1e-9） | 恒等式 + 闭式积分 | “SOC 误差单位/符号错误（应为 pp）” |
| SA-17 | 基准 `E_bat=0.16666666666666666 kWh`、`SOC_true=59.583333333333336%`；监测 `I_true≡25`、`I_meas(30)=35` | T-analytic / 精确 | 闭式式 + 闭式积分 | “基准/监测运行错误” |
| SA-18 | `focal_change=I_true(60)−I_true(20)=−9.999999999973769 A`（时间窗 **[20,60]**，显示 −10.000 A） | ±1e-6 A（实测偏差 2.62e-11） | 闭式式 | “焦点变化量时间窗未定义/数值错误” |
| SA-19 | 事件快照：pre(`t=20.0−`)`I_meas=25`、post(`t=20.0+`)`I_meas=35`；pre 不得写成 19.9 | T-ui（精确） | 闭式式（左/右极限） | “事件快照相位错误” |
| SA-20 | 显示舍入：`0.123889 kWh` / `59.690278%` / `−0.11111 pp` / 21.5 s `18.6788 A` / 26 s `15.1832 A`；round-half-up，禁止截断 | T-ui（字符串精确） | 独立舍入表 | “数值显示精度/舍入规则错误” |
| SA-21 | 同 config 两次 `configHash` 同；改 `bias_A` 后不同；旧 Run 内容不变 | T-ui（精确） | E2E + 深比较 | “Run 不可变性/哈希错误” |
| SA-22 | 播放速度/页面/游标变化前后 Run 数据逐字节不变 | T-ui（精确） | Playwright + 数据快照 | “回放改变了运行数据” |
| SA-23 | `E_gen+E_bat−0.5=0` 标注“定义恒等”；**不得**作为唯一数值门禁 | T-ident | 代数恒等（展示标签断言） | 不适用（展示标签） |
| SA-24 | 范围守卫：`systemId='FL-001'`、`fault.family='sensor_drift'`、`magnitude=10`、`t_start=20` | T-ui（精确） | 独立配置校验 | “该场景超出 G0 批准范围（扩展预览）” |
| **SA-25**（新增） | 闭环解 ODE 残差 max ≤1e-9 A（全 601 点） | 1e-9 A | 独立解析导数重算 | “ODE 残差超限：闭式解与方程不一致” |
| **SA-26**（新增） | golden v1 全字段比对：`method_id='analytic_flux'`、三个 run 的 §3.2/§3.3 值均在 §3.6 容差内、golden 的 oracle 源码哈希可复算 | §3.6 | `scripts/verify_golden` 重跑 oracle | “与解析 golden 不一致（详见差异报告）” |

> SA-20 相对 Claude SA-20 的修订：旧矩阵按 5 dp 写 `0.12389/59.69028`；G0-DEC-06 冻结 E 6 dp、SOC 5–6 dp（本文取 6 dp），故以本条为准，并在 §10.3 记录差异。SA-25/26 为 G0-DEC-12“新增 ODE 残差检查 + golden 比对”的落地条目。

---

## 6. 独立 oracle 与 golden 结构（G0-DEC-02/16）

### 6.1 目标目录（G2 交付时创建；当前不存在）

```text
tools/oracle/                    # Python 3 标准库；独立于产品运行时
  fl001_oracle.py                # 从 §1.3 方程独立实现 3 组 601 点 + 事件 + 解析积分
  emit_golden.py                 # 生成 data/golden/fl001_v1.json（唯一写 golden 的入口）
  README.md                      # 独立性声明、方法、复算命令
data/golden/
  fl001_v1.json                  # 唯一 golden（全精度 + method_id + 容差 + 生成命令 + oracle 源码哈希）
  fl001_v1.sha256                # golden 文件自身校验和
scripts/
  verify_golden.py               # 一键：重跑 oracle → 比对 golden → exit 0/1/2
```

**现状与迁移**：现有独立证据脚本 `FaultLab-evaluation/tools/verify_fl001.py`（SHA-256 `B60C825C…CFA37`，1550 行）是 Golden v1 的**来源实现与审计证据**。G2 必须在产品树内重建 `tools/oracle/`（算法可移植，但**不得** import 产品 engine），并在 golden 中记录新 oracle 源码哈希与旧脚本哈希作为 provenance 链。

### 6.2 `data/golden/fl001_v1.json` 必含字段

| 组 | 字段 |
|---|---|
| 身份 | `golden_schema_version:'v1'`、`golden_id:'fl001_v1'`、`model_id:'FL-001'`、`model_version:'fl001.1'`、`schema_version:'1.0.0'`、`engine_baseline`（可为空，oracle 不依赖 engine） |
| 方法 | `method_id:'analytic_flux'`、`method_version:'analytic_flux.1'`、`units`（A/kW/kWh/s/%/pp） |
| 配置 | §1.2 全部冻结参数 + `feedback_mode` 枚举 |
| 采样/事件 | `n=601`、`dt_s=0.1`、`i_f=200`、`t_0/t_end`、`event_encoding_version:1`、`events[pre/post]` |
| 数据 | 三个 run 的 §3.2 关键点 + §3.3 标量 + 601 点全精度序列（或由 oracle 可确定性重算的引用） |
| 容差 | §3.6 字段级容差（含 `gate` 与 `analytic_crosscheck` 两层） |
| 生成 | `generated_by:{tool, python_version, command, oracle_source_sha256, generated_at（不入 run_hash）}` |
| 批准 | `approval:{approved_by:'numeric-oracle/lead', approved_at, approved_golden_sha256}`（由 G2 执行时填写，不得预填虚构值） |

### 6.3 独立性规则（违反即 golden 无效）

1. oracle **不得** `import` 或复制 `src/**` 任何模块/常量；方程常量在 oracle 内独立硬编码，其唯一权威文本是本文 §1.3。
2. **禁止 oracle 与 engine 共享公式常量模块**（共享 ⇒ golden 变成“engine 自证”，独立校核失效）。
3. golden **只能**由 oracle 生成/批准；engine 对 golden **只读比对**，不得写入或“按实现调 golden”。
4. `created_at` 不入 `run_hash`；时间统一十进制秒（≤3 位小数）；导出与哈希规范化按 DATA_CONTRACT_SPEC（Canonicalization v1）。
5. 任何公式/参数/`method_version`/`sample_dt_s` 变更 ⇒ 重建 golden 并升 `method_version`（如 `analytic_flux.1`→`analytic_flux.2`），旧 golden 只读保留并标注“历史口径不可比”；变更走 `CHG-YYYYMMDD-NN`。
6. oracle 必须自带自检（如 §7.2 的 Simpson/细网格交叉、RK4 ODE 对比），自检失败 `exit 2`。

### 6.4 一键验证与退出码

```powershell
python tools/oracle/emit_golden.py --check   # 重算并与 data/golden/fl001_v1.json 比对
python scripts/verify_golden.py              # 退出码：0=全部通过；1=数值/容差不通过；2=oracle 内部自检失败
```

输出必须为机器可读 JSON（`--json out.json`）并回显：每个检查项 `check_id/status/observed/tolerance/reason`、golden 哈希、oracle 源码哈希、python 版本。

---

## 7. 积分、事件与舍入规则摘要（与 DATA_CONTRACT_SPEC 交叉引用）

### 7.1 解析积分（首选；`analytic_flux`）

```text
∫[0,x] I_true dt：
  x ≤ t_f            : 25·x
  闭环 x > t_f       : 25·t_f + (I_ref − b)·u + b·τ·(1 − e^(−u/τ))，u = x − t_f
  （b=+10、τ=1.5 时：500 + 15u + 15(1 − e^(−u/1.5))，x=60 → 1114.9999999999607 A·s）
∫[0,x] b dt（x>t_f） : b·(x − t_f)   （阶跃点测度为零；事件感知）
E_bat,true = 0.4·∫I_true dt / 3600；E_bat,meas = 0.4·∫I_meas dt / 3600
```

### 7.2 数值求积仅作敏感性（0.1 s 网格实测差，oracle §3.1）

| 规则 | `E_bat,true` 差 / kWh | `E_bat,meas` 差 / kWh | `SOC_err` 差 / pp | 结论 |
|---|---:|---:|---:|---|
| 0.1 s 梯形 | +6.17238e-07 | +5.61728e-05 | −1.38889e-04 | 不得作 golden；若采用须声明 `method_id='trapezoid_dt0.1'` |
| 0.1 s 左矩形 | +5.617e-05 | — | — | 超 1e-6 容差 56 倍，禁止 |
| 0.01 s 梯形 | +6.17e-09 | — | — | 可满足 1e-6，须声明 `method_id='trapezoid_dt0.01'` |
| 解析（事件感知） | 0（基准） | 0 | 0 | **唯一 golden 口径** |

采用求积实现时：容差放宽到 **≥1e-5 kWh / 5e-4 pp**，且不得声称与解析 golden“一致”；`method_id` 必须写入 `RunManifest`/`metrics`（G0-DEC-06/09）。

### 7.3 事件与时间编码

- 事件主键 `(event_id, phase)`；`phase ∈ {pre, post}`；`derivation ∈ {left_limit, post_sample}`；`event_encoding_version = 1` 入 manifest（DATA_CONTRACT_SPEC §2.5）。
- 时间必须用 `t_i = i·dt` 计算（**禁止累加 `t += dt`**：累加 200 次得 `20.000000000000014`，会破坏 pre/post 索引归类，N-02）。
- 图表：阶跃绘制，禁止跨 20.0 s 平滑/样条；`pre` 与 `post` 以两个不同 y 点渲染。

### 7.4 舍入

见 §3.5；显示层与存储层分离；所有显示数值由 `SignalCatalog.precision` + `round-half-up` 生成。

---

## 8. 参数约束（P0/P1，G0-DEC-04 / B15）

### 8.1 P0（冻结，任何变更须重开 G0 或按 G0-DEC-17 走 CHG）

`duration_s=60`、`sample_dt_s=0.1`、`fault_time_s=20.0`、`bias_A=+10.0`、`Vdc_V=400`、`Iref_A=25`、`tau_s=1.5`、`Pload=30`、`Ebat=40`、`SOC0=60`、三组 Run 固定。

### 8.2 P1（开放受限修改时的前置条件）

| 参数 | 允许范围/条件 | 不满足时 |
|---|---|---|
| `bias_A` | **`0 < \|b\| ≤ 20 A`**；符号进入判据（`b` 由 config 派生） | `invalid_config`，拒绝创建 Run |
| `fault_time_s` | 必须为 **0.1 s 整数倍**，且 `t[i_f]==t_f`（1e-12）；`0 ≤ t_f < duration` | `invalid_config`（“故障时刻必须对齐 0.1 s 网格”） |
| `tau_s` / `sample_dt_s` | 允许修改，但**必须重建 golden** 并升 `method_version` | 未重建 golden ⇒ 检查整体 `skipped`，不得显示 pass |
| 负偏置 `b<0` | **需重写因果模板**（方向反转、`SOC_err` 变正）并重建 golden；不得复用正偏置文案 | 仅允许在完成上述重建后开放 |
| `b > 25 A` | **禁止**（`I_true,ss = 25−b < 0`，电池反向/充电；模型无反向功率与保护物理） | `invalid_config`（“幅值超出模型物理范围”） |
| 其它（V/load/E_bat/SOC0） | P1 不开放 | — |

**边界依据（oracle §8.2 稳态扫描）**：`I_true,ss = I_ref − b`、`P_gen,ss = 20 + 0.4b`；`b=+25` 时 `I_true,ss=0` 边界；`b=+30` 时 `I_true,ss=−5`（充电）；`b=−60` 时 `P_gen<0`（不可支持）。`|b|≤20` 保证 `I_true,ss∈[5,45]`、`P_gen≥12 kW`，叙事与物理边界安全。

### 8.3 扩展模型（不在本规格范围，G0-DEC-15）

- **GT-001：当前形态 NO-GO**，不得进入实现；恢复须 G2b 物理规格评审（见 REVIEW_DIFF §7 / DECISIONS G0-DEC-15）。
- **FC-001**：P1 的 L0b 候选；进入实现前须修 `SOC_true_end=59.4755556%` / `SOC_est_end=59.5866667%`（含 τ_fc 过渡尾项）或声明稳态近似+容差，并补假设清单与独立 golden。
- **FL-001 `load_step`**：删除或重写（当前文本自相矛盾且违反 V0.2 R-02；若保留须引入母线储能 `E_bus/P_bus` 并走 G2b）。

---

## 9. 能证明 / 不能证明与证据措辞边界

### 9.1 本规格+oracle 能证明（限于内部一致性）

1. EQ-3 闭式解确实是 §1.1 行为级 ODE 的精确解（RK4 独立解差 2.56e-13 A；ODE 残差 3.55e-15 A 量级）。
2. §3.2/§3.3 的 golden 值在 oracle 独立实现中可复现，且与 V0.1/V0.2 文档显示精度一致（未发现算错）。
3. 事件 pre/post 语义可被精确实现（`I_true` 连续、`I_meas` 跳变 +10 A）。
4. 解析积分与 SOC 换算（秒→小时、kWh→pp）自洽，且被 Simpson/细网格数值积分交叉验证。
5. 文档数值来源可解释：解析积分 + 显示舍入；求积规则差异可量化（§7.2）。

### 9.2 不能证明

1. **不能证明模型对真实设备有效**（无实测/Simulink/FMU 对比；无电化学、变流器、机组动态）。
2. **不能证明 PHY-01/06 具备物理检验能力**（§4.3；恒等式只能抓实现/浮点错误）。
3. **不能证明 PHY-08/09/10 通过**（需浏览器 E2E、RunRegistry、Schema 校验器；数值脚本 N/A）。
4. **不能证明 `SOC_est` 的工程有效性**（只是 `naive_coulomb_counting` 示例，不是 BMS 估计器）。
5. **不能证明 L1 数值仿真器等价**（换积分器/步长后必须重建 golden 与容差）。
6. **不能证明 UI/导出/导入/哈希链路正确**（属 DATA_CONTRACT_SPEC 与 E2E 的验收范围）。

### 9.3 证据措辞边界（唯一措辞表见 UI_COPY_GUARDRAILS §6）

| 场景 | 允许 | 禁止 |
|---|---|---|
| 内部一致性 | “内部一致性检查通过：定义恒等式 + 金标准数值比对” | “物理守恒验证通过 / 模型验证通过 / 验证通过” |
| 数据来源 | “解析模型生成的合成示例数据（synthetic）” | “实测 / 现场数据 / 试验数据 / 工业真实” |
| 可复现性 | “同一配置可复现同一 Run（内容校验和可核对）” | “第三方认证 / 公证 / 防篡改 / sealed” |
| 故障解释 | “已知故障的传播解释（故障是配置事实）” | “诊断算法 / 检出率 / 误报率 / 诊断延迟” |
| 能量残差 | “`r_meas=0.4·b`：测量通道误差的功率当量” | “能量损失 / 多发 4 kW / 多发电” |
| golden | “全精度解析金标准；在 §3.6 容差内一致” | “逐位一致 / 与实测一致” |

---

## 10. G2 关闭条件与证据包

### 10.1 四件套（缺一不可，G0-DEC-16 / B14）

| # | 件套 | 交付物 | 通过判据 |
|---|---|---|---|
| 1 | **数值脚本** | `tools/oracle/` + `data/golden/fl001_v1.json` + `scripts/verify_golden.py` | `verify_golden` exit 0；覆盖 PHY-01/01b/02/03/04/05/06/07 + PHY-10 子集 + SA-01…20/25/26 |
| 2 | **浏览器 E2E** | Playwright（或既有 Chrome headless + 手测清单兜底，须在 G4 前恢复自动化） | PHY-08 pass + SA-22 + 跨页状态（游标/选中/Run）+ 20 s 阶跃渲染断言 |
| 3 | **RunRegistry/规范哈希** | `configHash` 规范化 v1 测试 + Run 不可变测试 | PHY-09 pass + SA-21 + `run_hash` 与文件级 SHA-256 一致 |
| 4 | **Schema/单位字典** | JSON Schema + `SignalCatalog` 量纲注册表 + 导入负例（≥8，G0-DEC-10） | PHY-10 完整项 pass + SA-24 范围守卫 |

### 10.2 证据包清单（G2 交付目录，建议 `FaultLab-evaluation/NEXT/evidence/g2/`）

| 文件 | 内容 | 完整性要求 |
|---|---|---|
| `MODEL_VALIDATION_SPEC.md` | 本文件 | 记录本文件 SHA-256 |
| `DATA_CONTRACT_SPEC.md` | 字段/事件/哈希/导入（同批 G2 交付） | 记录 SHA-256 |
| `golden/fl001_v1.json` | 全精度 golden + 容差 + 生成命令 + oracle 源码哈希 | 记录 golden SHA-256；与批准记录一致 |
| `oracle/fl001_oracle.py` + `emit_golden.py` | 独立 oracle 源码 | 记录源码 SHA-256；不含 engine import |
| `verify_golden.log.json` | 一键校验机器可读结果（含 python 版本、golden/oracle 哈希） | `exit 0`；FAIL 必须列明 |
| `e2e-report/` | Playwright trace/截图/文本断言日志（PHY-08/SA-22） | 通过项与时间戳；失败必须保留 |
| `registry-test.log` | PHY-09/SA-21 结果 | 通过项与哈希样本 |
| `schema-validation.log` | PHY-10/SA-24 + 导入负例结果 | ≥8 负例逐条记录 |
| `approval-record.md` | 用户 2026-10-27T20:35 指令转述 + DECISIONS 状态回写记录 + `CHG` 记录 | 无回写记录视为证据包不完整 |
| `deviations.md` | 与 DECISIONS/评审的偏差（至少 §10.3 各项） | 逐条可追溯 |

### 10.3 与 DECISIONS / 评审的偏差记录（供 Lead 复核）

| # | 本文件做法 | 依据/说明 | 是否构成偏差 |
|---|---|---|---|
| 1 | （已关闭）`DECISIONS.md` 状态回写：Lead 已于 2026-10-27T20:43 回写为 `APPROVED`（§1.0 批准记录） | 2026-10-27T20:35 用户指令；`SPEC_v0.2_APPROVED.md` 已冻结 | 无（已关闭） |
| 2 | SA-20 采用 E 6 dp / SOC 6 dp（Claude SA-20 原为 5 dp） | G0-DEC-06 冻结“能量 6 dp、SOC 5–6 dp 由 SignalCatalog 定义” | 对 Claude 矩阵的修订，已在 §5 注明 |
| 3 | PHY-04 用 `\|I_true(60)−15\|≤1e-9 A`（Claude 原 1e-6 A） | 实测偏差 2.62e-11 A；N-08 要求写死 | 更严，非冲突 |
| 4 | PHY-01 门禁 ≤1e-12 kW（契约旧值 1e-6 kW） | G0-DEC-12 冻结 1e-12；1e-9 仅作 `check_tier='loose'` | 对既有契约的修订（Lead 对齐 CONTRACT） |
| 5 | 新增 PHY-01b、SA-25、SA-26 | G0-DEC-12“新增 ODE 残差检查 + golden 比对”；G0-DEC-16“采纳 SA-01…24 为基线”（基线可扩展） | 扩展，不冲突 |
| 6 | 舍入用 round-half-up（oracle 建议 half-even） | G0-DEC-06 冻结 half-up | 已记录，按 DECISIONS |
| 7 | `docs/CONTRACT.md` 现状哈希 `AE93D913…` 与评审期 `4777DC44…` 不同 | 该文件已按 G0 对齐（附录 G0 对齐记录）；批准版哈希已在 `SPEC_v0.2_APPROVED.md` 附录 A 固化 | 无（已固化） |
| 8 | golden/`tools/oracle/` 路径按 DECISIONS 目标定义，**当前尚不存在** | G0-DEC-02/16；本文件不虚构“已生成” | 待 G2 执行 |

**G2 关闭裁决**：四件套全部通过且证据包完整 ⇒ G2 关闭，方可进入 G3 集成；任一项缺失或失败 ⇒ G2 不关闭，失败项以 `FAIL` 标签记录，**不得**用“部分通过/基本通过”表述。

**文件结束**。本文件不宣称任何测试已通过、golden 已生成或模型已验证；所有数值均转录自 `NUMERIC_ORACLE.md`（附录 B 优先）并注明推导关系。
