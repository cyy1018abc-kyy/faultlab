# TL001_V2_G2B_SPEC_DRAFT — TL 联合轨 v2 规格草案（C-4 联合模式下垂调速器 + C-5 line_trip 新族）

> **性质**：G2b 规格草案 **v0.1**（Lead 起草，2026-11-28）——V1200_WAVE_DESIGN v1 第一批 B1-1。
> **授权**：CHG-20261128-03（V1200 R1-1…R1-5）；方向已由用户第一轮裁定，**参数值与 Q 点留批准轮**。
> **上游**：TL001_FMU_G2B_SPEC_APPROVED v1.0（下称「v1 规格」）——本草案只写**与 v1 的差异**；未提及之处沿用 v1 原文。
> **性质声明**：行为与数值集总参数演示模型（未经实验/硬件验证）；本草案零实现承诺（I-4 先文档后代码）。
> **锚点来源**：§3 全部数值为 **scratchpad 原型预演实测**（v1 oracle 复制件 + 本草案 §1/§2 改动，不入库），
> emit 轮以正式 oracle 复算为准。

---

## 0. 边界

**做**：
1. **C-4**：联合模式调速器按线路状态切换——线路接通用下垂、`line_open` 保持积分（§1）；撤销 v1 的 F-1 域外角点；
2. **C-5**：新故障族 `line_trip`（双回线单回跳闸）+ 1 个 Run（§2）；
3. 新 golden `gt_tl_joint_v2`（9 Run）+ 新 oracle 文件；v1 golden / oracle / verify 注册冻结保留（§4）。

**不做**：C 内核 / FMU 包改动（调速器归 host——I-3；line_trip 由现有 `p_elec_scale` 表达）；阻尼项 D（实测电池下垂已提供
阻尼——§3.3）；线路热模型 / 保护逻辑；GT-001 独立系统的调速器（零触碰）；C-3 升 approved 与教学路径（第二批，另行验收）。

## 1. C-4 调速器切换形态（EQ-GTL1-9/10 联合修订）

### 1.1 F-1 成因（实读）

v1 联合模式沿用积分调速器 `u ← clamp(u + K_i·(50 − f_gov)·h, 0, 40)`。并网时同步功率把 f 钳在 ≈50 Hz，`(50 − f_gov)` 只剩
传感偏置 −b，积分持续累加：v1 golden `joint_sensor_drift` 末值 u = 1.205、P_gen = −5.123 kW、T3_min = 631.7 K（F-1）。
v1 规格精确恒等式 `u_end = 25 − (δ_end − δ₀)/π` 表明联合模式下积分调速器**等价于功角反馈**——物理上不成立。

### 1.2 形态（Q1——方向已裁定 R1-1）

| 线路状态 | 调速器（host 子步 ①） | 说明 |
|---|---|---|
| 接通（`line_open` = false——含 line_fault / line_trip 期间） | **下垂**：`u_next = clamp(u_ref − K_D·(f_gov − 50), 0, 40)` | 并网机组标准形态；瞬时（与电池下垂 P_bat = P_ref − K_bat·Δf 建模口径一致——Q3） |
| 断开（`line_open` = true——joint_gt_standalone） | **积分（v1 原式）**：`u_next = clamp(u + K_i·(50 − f_gov)·h, 0, 40)` | 等时孤网；GLJ-5「standalone ≡ gt001_v3」守卫不变 |

`f_gov` 定义不变（`monitor ∧ sensor_drift ⇒ f；否则 f + b`）；`u_eff = min(u_next, u_cap)`（actuator 族）不变；子步更新序 ①→④ 不变。

### 1.3 参数（Q2/Q4）

| 参数 | 推荐值 | 依据 |
|---|---|---|
| K_D | **10 kW/Hz** | 调差率 R = 5%，基准 = 设计点 P_gen0 = 25 kW：K_D = P_gen0/(R·f₀) = 25/(0.05×50) |
| u_ref | **25 kW_eq**（设计点指令，常数） | EQ-GTL1-11 设计点闭合：u = 25 ⇒ P_gen = 25 kW（f = 50） |
| K_i | 2.0（v1 原值，仅 line_open 使用） | 不变 |

## 2. C-5 `line_trip` 新族（Q5/Q6）

- **定义**：双回线单回跳闸。v1 的 X_line = 3.2 Ω **重新解释**为两回 6.4 Ω 线路的并联等值（**数值不变**——仅语义登记）；
  t_start = 20 s 一回永久跳开 ⇒ X_eq 3.2 → 6.4 Ω ⇒ P_max 减半 ⇒ 以**现有输入** `p_elec_scale = 0.5` 表达（[t_start, ∞)）。
- **事件**：EV-001 `line_trip`（target_signal `P_elec_kW`，magnitude = 跳闸后剩余容量比 0.5，unit `p.u.`——Q5）；无清除事件。
- **fault_id**：`tl_single_circuit_trip`；fault 块 `{family, fault_id, t_start_s, p_elec_scale: 0.5}`。
- **Run**：1 个 `joint_line_trip`（fault / closed_loop / 出口基线 demand0 = 20——Q6）。
- **键面**：`line_trip` 为族值（非事件字段键）——EVENT_KEYS 零变化（v1 line_fault 同款）；SystemDef 故障目录 + FAULT_CATALOG §9 增行（第二批）。

## 3. 锚点与包络（原型预演实测，K_D = 10）

### 3.1 逐 Run 终值与包络

| Run | v2 u_end | P_gen_end | P_elec_end | δ_end | f 区间 | T3 区间（K） | 与 v1 序列逐位相同？ |
|---|---|---|---|---|---|---|---|
| joint_healthy | 25.000 | 25.000 | 0.000 | 0.00° | [50, 50] | [1173.0, 1173.0] | **是** |
| joint_load_step | 25.000 | 25.000 | **−10.000** | **−11.54°** | [49.8385, 50.0600] | [1173.0, 1177.4] | 否 |
| joint_sensor_drift | **22.000** | 21.004 | −3.996 | −4.58° | [49.9922, 50.0000] | **[1101.9, 1173.0]** | 否 |
| joint_actuator_fault | 25.000 | 18.339 | −6.661 | −7.66° | [49.9867, 50.0000] | [1054.4, 1173.0] | 否 |
| joint_actuator_clear | 25.000 | 25.000 | −0.000 | −0.00° | [49.9867, 50.0130] | [1054.5, 1173.0] | 否 |
| joint_monitor_only | 25.000 | 25.000 | 0.000 | 0.00° | [50, 50] | [1173.0, 1173.0] | **是** |
| joint_line_fault | 25.000 | 25.000 | 10.000 | 11.54° | [49.3789, 50.3577] | [1160.1, 1179.9] | 否 |
| **joint_line_trip**（新） | 25.000 | 25.000 | 10.000 | **23.58°**（首摆峰 25.54°） | [49.9797, 50.1025] | [1169.2, 1173.0] | —（新 Run） |
| joint_gt_standalone | 25.000 | 25.000 | 0.000 | 0.00° | [50, 50] | [1173.0, 1173.0] | **是**（积分支路不变） |

**解读**：
- **F-1 撤销**：sensor_drift 终值 u = u_ref − K_D·b = 25 − 10×0.3 = 22（精确恒等），T3_min 1101.9 K 回到注册域；
- **load_step 终点更干净**：新增 10 kW 全部由线路进口承担（P_elec = −10.000、δ_end = −asin(10/50) = −11.54°），u 回到 u_ref；
- **line_trip 解析闭合**：δ_end = asin(P_export / (P_max0/2)) = asin(10/25) = 23.578°（emit 轮以 ±1e-6 rad 断言——GLJ-8）；
- 全部 Run |Δf| ≤ 0.63 Hz——v1 标准域（|Δf| ≤ 1 Hz）内，无须滑差域分域断言。

### 3.2 K_D 敏感性（供 Q2）

| K_D（kW/Hz） | R | sensor_drift u_end / P_gen / T3_min | load_step f_min | line_fault δ 首摆峰 | line_trip δ 首摆峰 |
|---|---|---|---|---|---|
| 5 | 10% | 23.5 / 23.00 / 1137.5 K | 49.8373 | 57.57° | 25.79° |
| **10** | **5%** | **22.0 / 21.00 / 1101.9 K** | **49.8385** | **56.75°** | **25.54°** |
| 20 | 2.5% | 19.0 / 17.01 / 1030.6 K | 49.8409 | 55.51° | 25.07° |

K_D 对暂态影响小（同步功率主导）、对偏置稳态影响线性（Δu = −K_D·b）；三值均在注册域内。

### 3.3 阻尼（不做 D 的依据）

v1 与 v2 原型中 `joint_line_fault` / `joint_line_trip` 末 10 s δ 峰峰 ≤ 1.5e-9 rad——电池下垂 `P_bat = 5 − 24·(f − 50)`
对转子提供等效阻尼（24 kW/Hz），下垂调速器再叠加 10 kW/Hz。v1 规格 §3.3「零特征值平衡流形」在接通态由下垂打破
（稳态唯一：f = 50、u = u_ref、δ 由功率平衡决定）；断开态（standalone）维持 v1 原文。

## 4. golden 与 oracle 计划

| # | 项 | 内容 |
|---|---|---|
| 1 | golden id | **`gt_tl_joint_v2`**；supersedes = `gt_tl_joint_v1`；model_id `gt.sync.tl.l0`（不变）；model_version **`2.0.0`**（Q7）；method_id `gt_tl_joint_rk4_dt0.01`（不变） |
| 2 | oracle | **新文件** `tools/oracle/gt_tl_joint_v2_oracle.py`（Q8）——v1 oracle 受 golden V-03 源哈希锚定，零改动；独立性声明沿 v1 §4 项 2 |
| 3 | Run 集 | 9 Run = v1 八局（按 §1 调速器重出）+ joint_line_trip；flat RUNS |
| 4 | 列 | 30 列不变（v1 Q7） |
| 5 | gate 键 | v1 十二键原值沿用（含 delta_rad_atol 1e-6 / omega_rad_s_atol 6e-4）——emit 轮引擎↔oracle 双实现实测复核 |
| 6 | 自检 | GLJ-1…6 沿用（GLJ-5 standalone 交叉 gt001_v3 不变）；**GLJ-7 删除 F-1 角点豁免**（ENVELOPE_CORNERS 置空）；**新增 GLJ-8**（line_trip δ_end = asin(10/25) ±1e-6 rad、P_elec_end = 10 ±1e-6 kW）、**GLJ-9**（sensor_drift u_end = u_ref − K_D·b 精确 ±1e-12；load_step P_elec_end = −10 ±1e-6）、**GLJ-10**（v1↔v2 不变局逐位相同：healthy / monitor_only / joint_gt_standalone 读 v1 golden 只读交叉） |
| 7 | verify 注册 | verify_golden 新行 `gt_tl_joint_v2`（DEFAULT_MODELS **尾追加**——v1 行与默认位置零变化，Q9） |
| 8 | v1 处置 | gt_tl_joint_v1 golden / oracle / verify 注册**冻结保留**（mg001_v1→v2 先例） |
| 9 | 切换面（第二批） | 引擎 simulateTL001 调速器切换 + line_trip；engine-tl.test 参照 v2；fmu_runner TL 壳调速器切换 + 9 Run；gt_tl_joint_parity 参照 v2——**FMU 包不重钉**（内核零改动），期望 linux64 仍逐位一致 |

## 5. 八面影响

| 面 | 影响 | additive |
|---|---|---|
| ① SystemDef | TL-001 故障目录增 `line_trip`；limitations 删 F-1 句、改写因果模板 `tl-sensor-drift` 为下垂语义；新增 Run 预设 | 是（TL 仍 extension_preview） |
| ② golden | 17 → 18（gt_tl_joint_v2）；既有 17 字节零触碰 | 是 |
| ③ scenario | 族值增 `line_trip`；EVENT_KEYS 零变化 | 是 |
| ④ oracle_base | 新 oracle 出生接入；MODELS 15 → 16、DEFAULT_MODELS 十 → 十一 | 是 |
| ⑤ eval protocol | 零（TL 不入盲测池） | — |
| ⑥ scope | 零（C-3 第二批另行验收） | — |
| ⑦ run-g2 | 零增步：engine-tl 步与 parity 步改参照 v2（判据同构）；golden↔oracle 并入步①默认组 | 是 |
| ⑧ copy-guard | 新文案须过 43 patterns | — |
| 哈希 | TL-001 既有 v1 Run 的 run_hash **会随引擎调速器切换而变化**（同 config 新 model_hash——见 Q10）；其余系统零变化 | **需裁定**（Q10） |

## 6. 排期与门禁序列

本草案 v0.1 → 双路独立评审（子 agent A 物理/架构、B 治理/八面——互不可见）→ 处置 v0.2 → 用户批准（Q1…Q11）→
更名 APPROVED v1.0（第一批终点）→ 第二批实现（V1200 §3）→ v1.20.0。

## 7. 红线自查

I-3（调速器归 host——内核零改动 ✓）；I-4（本草案零实现 ✓）；I-8/I-9（新 oracle 独立、v1 oracle 零触碰 ✓）；
I-10（联合 golden 新 id——RFC 方案 A 沿用 ✓）；golden 字节冻结（v1 保留 ✓）；copy-guard（第二批文案终检）。

## 8. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | v2 引擎改动后，同 config 的 TL-001 Run 产出新 run_hash，与 v1.17/v1.18 导出包不同 | **已实读**：证据包导入以包内字段重算 run_hash（bundle.js:447 `computeRunHashFromParts`），**不重跑仿真**——旧包照常复核通过；差异仅为「新跑 ≠ 旧包」，按 Q10 声明 |
| R-2 | 下垂瞬时形态与积分切换在 line_open 跨越时不连续 | line_open 为整局常量（无 Run 内切换）——显式登记；Run 内切换为远期 |
| R-3 | 「X_line = 两回并联等值」语义改写被误读为参数变更 | §2 明写数值不变；golden config 增 `X_line_circuit_ohm: 6.4, n_circuits: 2` 展示键 |
| R-4 | 原型锚点与正式 oracle 偏差 | emit 轮复算为准；§3 表标注「原型预演」 |

## 9. Q 点清单（全候选 + 推荐——批准轮定案）

| # | 问题 | 候选 | 推荐 |
|---|---|---|---|
| Q1 | 调速器形态 | (a) 按线路状态切换（接通下垂 / 断开积分）；(b) 下垂 + 慢积分回功率参考；(c) 积分 + 抬高下限钳位 | **(a)**（R1-1 已定方向） |
| Q2 | K_D | 5 / **10** / 20 kW/Hz（R = 10% / 5% / 2.5%） | **10**（§3.2） |
| Q3 | 下垂动态 | (i) 瞬时；(ii) 一阶滞后 T_g | **(i)**（与电池下垂口径一致；无新状态） |
| Q4 | u_ref | (a) 常数 25（设计点）；(b) 取 Run 初值 u | **(a)**（二者在现 Run 集等价；(a) 语义自明） |
| Q5 | line_trip 定义与 magnitude 语义 | (a) 双回线单回跳闸、magnitude = 剩余容量比 0.5（p.u.）；(b) 线路阻抗任意突变（magnitude = X_new/X_old） | **(a)** |
| Q6 | line_trip Run | (a) 1 Run 出口基线 demand0 = 20；(b) 再加重载送出 Run（逼近稳定极限） | **(a)**（R1-2） |
| Q7 | model_version | (a) 2.0.0；(b) 1.1.0 | **(a)**（调速器形态变更 = 模型行为变更） |
| Q8 | oracle 文件名 | (a) `gt_tl_joint_v2_oracle.py`；(b) `gt_tl_joint_oracle_v2.py` | **(a)** |
| Q9 | DEFAULT_MODELS | (a) 尾追加 v2，v1 保留；(b) v2 替换 v1 | **(a)**（既有默认组零变化） |
| Q10 | TL-001 既有 Run 哈希变化 | (a) 接受：TL-001 为 extension_preview，引擎调速器形态变更即模型变更，新 model_hash 声明 + 发布证据列差异（I-11 发布门「含批准模型面变更」路径）；(b) 引擎保留 v1 调速器为默认、v2 作为 inertia/governor 新键（additive 零哈希变化） | **(a)**（v1 形态有已知物理缺陷 F-1，保留为默认无教学价值；(b) 增加永久分支） |
| Q11 | GLJ-10 不变局集合 | (a) healthy / monitor_only / gt_standalone 三局逐位；(b) 仅 standalone | **(a)**（原型实测三局逐位相同） |

## 10. 用户裁定留白章

| # | 裁定项 | 用户裁定 |
|---|---|---|
| R-TLV2-01 | 本规格批准与否 | （留白） |
| R-TLV2-02 | Q1…Q11 | （留白） |
| R-TLV2-03 | 第二批排程 | （留白——V1200 §3 预定） |

**文件结束**。TL001_V2_G2B_SPEC_DRAFT v0.1（2026-11-28，V1200 B1-1）。
