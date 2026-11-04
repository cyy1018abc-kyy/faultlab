# WT001_G2B_SPEC_DRAFT — WT-001 风电机组 G2b 物理规格（DRAFT v0.1，待双路评审 + 用户批准）

> **任务**：B-2 WT-001 风电系统 G2b 规格起草（V06_ROADMAP §2 主线 B B-2 行 / V072_WAVE_DESIGN
> §1 DEC-4 / §2 T8）。
> **授权**：V072_WAVE_DESIGN v1（CHG-20261105-01，2026-11-05，用户「统一采用推荐决策 + 并发
> 子智能体」授权链）阶段一 T8「B-2 WT-001 G2b 草案」。**DEC-4：本波只到草案 + 双路评审；
> 批准与实现 v0.8.0（批准留待用户）**。
> **前置**：WT-001 为全新系统（无遗留契约、无遗留实现、无遗留 golden）；结构先例 =
> PV001_G2B_SPEC_APPROVED v1.0（新系统 G2b 结构 + 并网馈线/不可调度同构——WT-001 并网馈线
> 与 PV-001 同构）；制度先例 = GTL1_G2B_SPEC_APPROVED v1.0（L 层级判定/更新序冻结/域扫描
> emit 硬条件）；SystemDef 解剖模板 = src/core/systems.js:117-315（FL-001）与 :832-1040（PV-001）；
> 治理依据 = SCOPE_SPLIT_MEMO §8.2；故障目录 = docs/FAULT_CATALOG.md。
> **状态**：`DRAFT`（v0.1，2026-11-05，B-2 规格起草人起草）——**待双路评审（WT-G2b-02：物理 A /
> 治理 B）+ 用户书面批准（DEC-4，批准与实现 v0.8.0）**。本草案不自动打开任何验收路径
> （scope.js 对 WT-001 全场景 fall-through 返回 extension_preview，§5）。
> **Q-4 三守卫适用**：新方程集入引擎须走 G2b（即本文档流程）；许可证自研零依赖（Python
> stdlib oracle / 浏览器原生 JS，无新第三方）；验收路径禁入直至批准。
> **本波不动清单（V072 §0，起草轮适用）**：① 既有 6 golden（gt001_v1/v2/v3、fl001_v1、
> fc001_v1、pv001_v1）与 4 既有 oracle 物理文件零触碰（V-03 字节语义）；② engine.js 本波
> 零改动（V072 §0「本波无新仿真轨」；WT 轨为实现轮显式分支面）；③ scope.js classify 零
> 改动（fall-through 现状即正确语义，scope.js:82）；④ tools/oracle/** 零触碰；⑤ 不引入
> 第三方依赖（I-1）；⑥ scenario schema v1 零新键（inertia_model 为 GT-001 三轨专用键，
> WT-001 单轨 L0b 无此需求，src/core/scenario.js:31-38 现状核对）。
> **记录**：B-2 规格起草人起草（2026-11-05）；锚点数值由临时复算脚本独立计算（Python
> stdlib，`python -I`，设计点闭合 + v³ 目标律失速对照 + pitch_stuck 全域扫描 + 半步长
> 收敛 + 两模式逐位对照 + 包络扫描，记录见 §3.4，脚本已按任务纪律删除）；§1.3-b 冻结更新
> 序为实现轮 oracle/引擎双侧复刻的唯一权威文本（GTL1 §2.3 先例）。

---

## 0. 定位摘要与红线声明

- **WT-001 风电机组（L0b · 机械动态行为级演示，单机并网等效）**：风轮气动
  `P_aero = Cp(λ,β)·½ρAv³`（λ = ωR/v；Cp 为经验解析式，**显著声明：教学惯例参数组，
  非本机组实测**，§1.3 EQ-WT-2）+ 传动链单质量一阶转速动态（J·dω/dt）+ 变桨执行器一阶
  β 跟踪 + 全功率变流器（理想，MPPT 最优增益律 + 额定封顶 + 可用风功率保护钳位）→
  400 V 等效母线 → 恒定负载；电网馈线为**理想平衡源补差**（与 PV-001 同位同构）。
  WT 为**不可调度电源**：出力由风（环境）与机械状态决定，不响应负载指令——拓扑上
  **无 load→converter 信号边**（与 PV-001 无 load→mppt 边同构，systems.js:934 先例）。
- **层级推荐（WT-DRAFT-Q3，评审裁定点）**：**L0b**（非线性行为级）——「DEC-4 L0/L1 混合
  形态」在 ALINE §1.1 分类学下的诚实落点（判据逐条对照见 §1.6）：解析气动代数子链
  （Cp 幂律 + MPPT/保护/桨距三函数，闭式可算——L0 性质）嵌入低维非线性 ODE 动态框架
  （(ω, β, P_wt) 三状态，Cp 耦合不可手解——L0b 性质）+ 理想馈线（PV-001 同构）。
  **不满足 L1 判据**（无温度/浓度/压力类新物理状态变量、非高维/刚性/耦合场、无需专用
  积分器——固定步长 Euler + 精确指数 foStep 即可，与 GT-001 L0b swing 同积分面级别）。
- **I-5 措辞红线（同 PV）**：并网馈线为理想平衡源，**无频率动态、无电压/无功概念**；
  母线是功率平衡的抽象等效，不是电网模型。全部 UI 文案不得暗示并网点稳定类行为
  （自查表 §6.3）；「电网馈线」组件仅指补差功率源，描述文案显式声明
  （PV001_G2B_SPEC_APPROVED §0 同款）。
- **与 PV-001 的同构与互补**（教学定位，§6.1）：同为不可调度电源 + 理想平衡馈线 +
  400 V 等效母线 + 恒定 30 kW 负载；差异 = PV 是**静态 DC**（无旋转部件，环境→功率
  解析映射 + 一阶跟随），WT 是**机械动态**（环境→气动扭矩→转速惯性→工作点漂移→功率，
  暂态经机械通道传导）。测量偏置的注入通道差异是核心对照：PV 的传感器在**目标计算
  通道**（双向真实效应），WT 的风速传感器在**保护钳位 + 估计通道**（单向：低估压低
  真实出力、高估零真实效应仅估计暴露——§3.5 角点声明）。
- 时间尺度沿库口径：duration 60 s、dt 0.1 s、601 点网格、默认注入 t=20 s、积分子步
  h = 0.01（FAULT_CATALOG §0；GT-001 L0b 同款子步）。

## 1. WT-001 系统定义提案

### 1.1 拓扑与组件提案

SystemDef 字段面对照 FL-001/PV-001 模板（id/level/summary/signals/components/edges/
categories/faults/model/acceptance；实现字段名为 `edges`）。defaults：
`feedback_mode='closed_loop'`、`initial={load_kW:30, v0_ms:9}`（**无 SOC 键**——WT 无储能，
与 PV-001 的 initial 键面差异点同款；新增 `v0_ms` 键为 WT 自有配置量）、**无 inertia_model
键**（单轨 L0b，GT-001 三轨键不适用）；`noise={enabled:false, seed:12345, level:0}`；
bounds：`load_kW ∈ [10,45]`（沿库口径 systems.js:140）、`v0_ms ∈ [6,10]`（**有意封顶在
v_rated = 10.302 m/s 之下**——健康初值全域解析：ω(0) = λ_opt·v0/R、β(0)=0、
P_wt(0) = k_v·v0³；额定区初值需数值平衡求解，不纳入首版 UI 域，未来开放须先立初值
求解面并显式 CHG）；`topologyViewBox=[0,0,1000,620]`、`duration_s=60`、`dt_s=0.1`。

| 组件 id | label | kind | role | faultable | 关键 inspector 信号 |
|---|---|---|---|---|---|
| `rotor` | 风轮（含传动链单质量等效） | rotor | 气动功率 → 转速惯性 | **是**（gust_step） | P_aero_kW / n_rotor_rpm / lambda_tip |
| `pitch_act` | 变桨执行器 | actuator | 桨距角一阶跟踪 · 转速调节 | **是**（pitch_stuck） | beta_pitch_deg / beta_cmd_deg / beta_stuck_deg |
| `converter` | 全功率变流器（含 MPPT 与保护） | converter | 最优增益律 + 额定封顶 + 可用功率保护 | 否 | P_wt_ref_kW / P_wt_true_kW / v_meas_ms |
| `bus` | 等效母线 | bus | 400 V 等效（功率平衡抽象） | 否 | V_bus_V / r_true_kW / r_meas_kW |
| `grid` | 电网馈线（理想平衡源） | grid | 理想双向补差源 · 初始 20 kW 展示 | 否 | P_grid_true_kW / P_grid_meas_kW |
| `load` | 负载 | load | 恒定 30 kW | 否 | P_load_demand_kW / P_load_served_kW |
| `anemometer` | 风速传感器 | sensor | 风速测量 · 故障注入点 | **是**（v_sensor_bias） | v_true_ms / bias_ms / v_meas_ms |

edges 提案（9 条；**刻意无 load→converter 边**——不可调度电源的结构声明）：

| id | from→to | kind | label |
|---|---|---|---|
| `rotor->converter` | rotor→converter | power | 机械功率 |
| `converter->bus` | converter→bus | power | 电功率馈入 |
| `grid->bus` | grid→bus | power | 补偿功率 |
| `bus->load` | bus→load | power | 30 kW 需求 |
| `rotor->anemometer` | rotor→anemometer | measurement | 风速采样（与风轮同位置） |
| `anemometer->converter` | anemometer→converter | measurement | v_meas |
| `rotor->converter` | rotor→converter | measurement | 转速反馈 n_rotor |
| `converter->pitch_act` | converter→pitch_act | signal | 桨距指令 |
| `pitch_act->rotor` | pitch_act→rotor | signal | 桨距角 |

（上表 `rotor->converter` 出现两行系 power/measurement 两种 kind 各一条，实现期 id 须
去重为 `rotor->converter_power` / `rotor->converter_speed`——登记为 WT-G2b-04 实现细节。）

signalCategories 提案：`wind`（风速）/ `mechanical`（机械：转速/叶尖速比/Cp/桨距）/
`power`（功率）/ `residual`（残差）——无 `soc`（无储能）、无 `actuator` 残差类
（执行器状态由 mechanical 类 β 信号承载）。

### 1.2 信号提案表（22 项）

| id | label | unit | category | sourceKind | exposure 说明 | formula / 定义 |
|---|---|---|---|---|---|---|
| `v_true_ms` | 有效真实风速 | m/s | wind | MODEL_STATE | public | v_true = v0 + Δv·1(t≥t0)（gust） |
| `v_meas_ms` | 风速测量（控制面读数） | m/s | wind | OBSERVATION | blind，noiseSigma 0.15 | v_ctrl = monitor∧bias ? v_true : v_true + b(t) |
| `bias_ms` | 风速传感器偏置 | m/s | wind | FAULT_EVENT | public | b(t) = −B·1(t≥t0)（B≥0 低估幅值，仅 v_sensor_bias） |
| `n_rotor_rpm` | 风轮转速 | rpm | mechanical | MODEL_STATE | public | n = ω·30/π（ω 为 ODE 状态） |
| `lambda_tip` | 叶尖速比 | -（无量纲） | mechanical | MODEL_STATE | public | λ = ωR/v_true |
| `cp_coeff` | 风能利用系数 | -（无量纲） | mechanical | MODEL_STATE | public | Cp(λ, β)（EQ-WT-2 经验式） |
| `beta_pitch_deg` | 桨距角（实际） | ° | mechanical | MODEL_STATE | public | β 状态（执行器窗内 = β_stuck） |
| `beta_cmd_deg` | 桨距指令 | ° | mechanical | CONTROLLER | blind | β_ref = clamp(K_β·(ω−ω_N), 0, 30°) |
| `beta_stuck_deg` | 卡涩桨距角 | ° | mechanical | FAULT_EVENT | public | β_stuck = 30°·magnitude%（仅 pitch_stuck，其余场景 null——I_bat_cap_A 先例 systems.js:238） |
| `P_aero_kW` | 气动功率 | kW | power | MODEL_STATE | public | P_aero = Cp(λ,β)·½ρA·v_true³ |
| `P_wt_ref_kW` | 变流器功率目标 | kW | power | CONTROLLER | blind | P_ref = min(k_opt·ω³, P_rated, k_v·v_ctrl³) |
| `P_wt_true_kW` | 风电真实出力 | kW | power | MODEL_STATE | public | τ_e·dP_wt/dt + P_wt = P_ref（P_wt 为 ODE 状态） |
| `P_wt_meas_kW` | 风电测量功率 | kW | power | OBSERVATION | blind，noiseSigma 0.15 | P_wt,meas = P_wt,true（健康通道） |
| `P_wt_est_kW` | EMS 风速折算估计 | kW | power | DERIVED | blind | P_wt,est = k_v·v_est³，v_est = v_true + b(t)（恒用测量，不随模式切换——A-pv-est-channel 同构） |
| `d_wt_kW` | 最优曲线一致性残差 | kW | residual | DERIVED | blind | d_wt = P_wt,meas − P_wt,est = P_wt,true − k_v·v_est³（代数恒等，不是能量损失） |
| `P_grid_true_kW` | 馈线真实功率 | kW | power | MODEL_STATE | public | P_grid = P_load − P_wt,true（受电为正） |
| `P_grid_meas_kW` | 馈线测量功率 | kW | power | OBSERVATION | blind，noiseSigma 0.15 | P_grid,meas = P_grid,true（健康通道） |
| `P_load_demand_kW` | 负载需求功率 | kW | power | CONFIG | blind | P_load = 30 kW（恒定，无 load_step 族） |
| `P_load_served_kW` | 负载实际获得功率 | kW | power | MODEL_STATE | public | P_load,served = P_load,demand |
| `V_bus_V` | 等效母线电压 | V | power | MODEL_ASSUMPTION | blind，tableOnly | V_bus = 400 V（模型假设，非仿真状态） |
| `r_true_kW` | 真实功率平衡残差 | kW | residual | DERIVED | public | r_true = P_wt,true + P_grid,true − P_load,served ≡ 0 |
| `r_meas_kW` | 测量一致性残差 | kW | residual | DERIVED | blind | r_meas = P_wt,meas + P_grid,meas − P_load,served ≡ 0（全功率通道健康——与 FL-001 的 r_meas = 0.4·b 教学对照） |

无事件域 null 信号仅 `beta_stuck_deg` 一项（对照 FL 的 I_bat_cap_A 先例）；`bias_ms`
全程有值 0/−B。**单位字典缺口（登记为实现面）**：UNIT_DICT（src/core/schema.js:18-24）
现无 `m/s`、`°` 与无量纲项——WT 信号含 m/s（风速）、°（桨距角）与 `-`（λ/Cp 无量纲）
三类新单位，实现轮 UNIT_DICT/UNITS 扩展为 **WT-G2b-03 显式工作面**（PV001 C-3
W/m²、GTL1-IMP-Q2 K/kPa 同款先例，纯增项）。

### 1.3 方程登记（EQ-WT-1…9；**批准后本节为 oracle/引擎唯一权威文本**）

| id | 方程 | 说明 |
|---|---|---|
| EQ-WT-1 | v_true(t) = v0 + Δv·1(t ≥ t0)（仅 gust_step）；b(t) = −B·1(t ≥ t0)（仅 v_sensor_bias，B ≥ 0 低估幅值）；v_ctrl = monitor∧bias 故障 ? v_true : v_true + b(t)；v_est = v_true + b(t) | 输入与测量/估计通道（t0 处右极限，post 采样行语义，fl001_oracle.py:103-108 口径同构）；monitor 语义 = 偏置不进入物理回路（保护钳位改读真实风速），估计通道恒用测量 |
| EQ-WT-2 | Cp(λ,β) = c₁(c₂/λᵢ − c₃β − c₄)·e^(−c₅/λᵢ) + c₆λ；λᵢ = 1/(1/(λ+0.08β) − 0.035/(β³+1))；c₁…c₆ = 0.5176/116/0.4/5/21/0.0068；**λ_opt = 8.100117280602777、Cp_max = 0.480011902827875（数值求导登记，§1.3-a）** | **Cp 经验解析式（Heier/Slootweg 教学惯例参数组）——显著声明：非本机组实测、非设备辨识，参数组为教学惯例值**；λ_opt/Cp_max 由 golden-section 数值最大化求得并按 15 位有效数字登记 |
| EQ-WT-3 | P_aero = Cp(λ,β)·½ρA·v_true³；λ = ωR/v_true | 风轮气动功率（ρ = 1.225 kg/m³、R、A 登记常量 §1.3-a） |
| EQ-WT-4 | P_ref = min(k_opt·ω³, P_rated, k_v·v_ctrl³)；k_v = 10000/729 = 13.717421124828531 W/(m/s)³；k_opt = k_v·R³/λ_opt³ = 1.477220410253986 W/(rad/s)³；P_rated = 15 kW | 变流器目标三支路：MPPT 最优增益律（转速反馈，真实机组惯例）+ 额定封顶 + **可用风功率保护钳位**（防失速守卫——亚额定左支 λ<λ_opt 时绑定，见 §1.6 机制定案）；**设计点闭合**：k_v·v0³ = k_opt·ω_opt³ = 10.000 kW（v0=9，残差 1.8e-12 W = 10000 的 1 ulp 量级，§3.4）；γ ≡ k_v/(Cp_max·½ρA) = 1（R 由该闭合导出，§1.3-a） |
| EQ-WT-5 | β_ref = clamp(K_β·(ω − ω_N), 0, β_max)；K_β = 3.0 °/(rad/s)；β_max = 30°；ω_N = λ_opt·v_rated/R = 21.654524572087702 rad/s（n_N = 206.785477557160 rpm） | 桨距比例转速调节（额定以上桨距吸收风速、转速锚定 ω_N 邻域；亚额定 ω<ω_N 时 β_ref = 0 自动退出——真实机组「桨距调转速」惯例的教学化） |
| EQ-WT-6 | τ_e·dP_wt/dt + P_wt = P_ref，τ_e = 1.0 s，P_wt(0) = k_v·v0³；τ_β·dβ/dt + β = β_ref，τ_β = 0.5 s，β(0) = 0；**执行器激活窗内 β ≡ β_stuck（钉扎，foStep 跳过）** | 变流器功率与桨距角一阶跟随（分段常值/缓变目标）；t0 后 P_wt 段内闭式 P_wt(t) = P_ref + (P_wt(t0) − P_ref)·e^(−(t−t0)/τ_e)（目标恒定段精确指数，EQ-PV-4 同构） |
| EQ-WT-7 | **J·dω/dt = (P_aero − P_wt)/ω**，J = 300 kg·m²，ω(0) = λ_opt·v0/R | 传动链单质量一阶转速动态（刚性轴集总、直驱教学等效、无变速箱）；非线性 RHS（Cp 耦合 + 1/ω 扭矩）——**不可手解，L0b 判据核心**；有效性域 ω ≥ 0.5·ω_opt(v0)（n ≥ 90.3 rpm）：停机/盘车工况未建模，注册域内不可达（§3.5 域扫描） |
| EQ-WT-8 | P_grid = P_load − P_wt,true；P_load = 30 kW；r_true ≡ 0；r_meas ≡ 0（定义恒等）；d_wt = P_wt,meas − P_wt,est = P_wt,true − k_v·v_est³ | 理想瞬时平衡（馈线补差）与残差通道；**健康测量下 d_wt ≤ 0 恒成立**（= (Cp(λ,β) − Cp_max)·½ρA·v_true³ ≤ 0，Cp 不超过理论最大）；传感器偏置破坏该界（监测轨 d_wt = +2.98 kW @默认——测量伪影特征，教学点）；封顶工况稳态 d_wt = −3.26 kW（默认 gust+2）为**合法残差**（设计性偏离最优，非故障——残差判读教学点 §6.1） |
| EQ-WT-9 | E_x = ∫P_x dt（kW·s，÷3600 → kWh）；E_wt,est = ∫k_v·v_est³ dt（事件感知解析积分——v_est 分段常值）；ΔE_wt = E_wt,est − E_wt,true | 能量口径（本系统无 SOC——SOC_est 通道的功能位由 P_wt,est/ΔE_wt 承担，PV EQ-PV-7 同构） |

### 1.3-a 常量表（登记常量 + 设计点导出量）

| 常量 | 值 | 含义 | 性质 |
|---|---|---|---|
| ρ | 1.225 kg/m³ | 空气密度（ISO 常温教学口径，无环境动态） | 登记常量 |
| c₁…c₆ | 0.5176 / 116 / 0.4 / 5 / 21 / 0.0068 | Cp 经验式系数组（教学惯例值，非实测） | 登记常量 |
| λ_opt | **8.100117280602777** | 最优叶尖速比（Cp 峰值点，golden-section 数值求导） | 设计点导出（15 位登记） |
| Cp_max | **0.480011902827875** | Cp 峰值（同上） | 设计点导出（15 位登记） |
| k_v | **13.717421124828531** W/(m/s)³（= 10000/729 精确有理数） | 最优功率曲线系数 ≡ 可用功率钳位系数（设计点标定 v0=9 ⇔ P_opt = 10 kW，非设备辨识） | 设计点标定（有理数精确） |
| A | **46.656738009239717** m² | 风轮扫掠面积（由可用功率一致性闭合 k_v = Cp_max·½ρA 导出） | 设计点导出（15 位登记） |
| R | **3.853738569938033** m | 风轮半径（R = √(A/π)） | 设计点导出（15 位登记） |
| k_opt | **1.477220410253986** W/(rad/s)³ | MPPT 最优增益（k_opt = k_v·R³/λ_opt³） | 设计点导出（15 位登记） |
| P_rated | 15 kW | 额定功率封顶（模型结构设定） | 登记常量 |
| τ_e / τ_β | 1.0 s / 0.5 s | 变流器/变桨执行器一阶时间常数（教学整定；τ_e 与 PV τ_mppt 同值为**有意的同尺度对照设计**） | 登记常量（假设非实测参数） |
| J | 300 kg·m² | 传动链单质量等效惯量（教学整定） | 登记常量（假设非实测参数） |
| K_β / β_max / β_full | 3.0 °/(rad/s) / 30° / 30° | 桨距比例增益（教学整定）/ 桨距上限 / 卡涩满度 | 登记常量（假设非实测参数） |
| v_rated | **10.302428182979986** m/s | 额定风速（v_rated = (P_rated/k_v)^⅓） | 设计点导出（15 位登记） |
| ω_N | **21.654524572087702** rad/s（n_N = 206.785477557160 rpm） | 桨距调节转速参考（ω_N = λ_opt·v_rated/R） | 设计点导出（15 位登记） |
| ω_opt(v0) | **18.916969639327981** rad/s（n_opt = 180.643753585101 rpm） | 健康初值转速（ω(0) = λ_opt·v0/R） | 设计点导出（15 位登记） |
| V_bus / P_load / v0 | 400 V / 30 kW / 9 m/s | 沿库口径（FL/FC/GT/PV 同构面） | 既有口径 |

闭合判据：γ ≡ k_v/(Cp_max·½ρA) = **1.000000000000000**（可用功率一致性，R/A 由该闭合
导出）；k_opt·ω_opt³ vs k_v·v0³ 差 1.8e-12 W（10000 的 1 ulp 量级，§3.4）。
**精度登记注**：λ_opt/Cp_max/A/R/k_opt/v_rated/ω_N/ω_opt 八项按复算独立解以 15 位有效
数字登记（GTL1 A-1 方案 a 先例）；oracle/引擎实现须硬编码本表登记值，不得在实现内
重新求导（重导路径尾数差会破坏 T-A）。

### 1.3-b 冻结更新序骨架（分区伪代码——oracle/引擎双侧复刻的唯一权威文本，GTL1 §2.3 先例）

```text
每子步 h = 0.01（k = 1..6000）；事件输入（b/Δv）冻结于子步起点右值（t=20 落在子步边界）：
① 输入与控制面（全部用子步起点右值）：
   v_true = v0 + Δv·1(t≥t0)；b = −B·1(t≥t0)
   v_ctrl = (monitor ∧ bias 故障) ? v_true : v_true + b；v_est = v_true + b（恒测量）
   β_ref  = clamp(K_β·(ω − ω_N), 0, β_max)                       # EQ-WT-5
   P_ref  = min(k_opt·ω³, P_rated, k_v·v_ctrl³)                  # EQ-WT-4 三支路
② P_wt 精确指数（EQ-WT-6 前段）：
   P_wt ← P_ref + (P_wt − P_ref)·e^(−h/τ_e)
   E_wt += P_ref·h + (P_wt_old − P_ref)·τ_e·(1 − e^(−h/τ_e))     # 子步解析积分
③ β 精确指数（EQ-WT-6 后段）：执行器激活窗（t ≥ t0 ∧ pitch_stuck）内 β ≡ β_stuck（钉扎，跳过）；
   否则 β ← β_ref + (β − β_ref)·e^(−h/τ_β)
④ ω 前向 Euler（EQ-WT-7；RHS 用②③后的 P_wt/β 与子步起点的 ω、冻结的 v_true）：
   λ = ω·R/v_true；P_aero = Cp(λ, β_eff)·½ρA·v_true³
   ω ← ω + h·(P_aero − P_wt)/(J·ω)
输出网格 record(k)（601 点，t[i] = i·0.1）：状态行取子步起点值（t=20.0 行 = 状态 pre +
输入 post 右值——PV001 锚点口径 P_pv(20.1) = 11 − e^(−0.1) 同款）；代数量（λ/cp/P_aero/
P_ref/β_ref/β_stuck/P_est/d_wt/r_true/r_meas）由 (ω, β, P_wt, v_true, v_ctrl, v_est) 重算；
E_wt,est 事件感知解析积分（v_est 分段常值，EQ-WT-9）。
```

**审查注记（评审 A 请重点核）**：① 健康局 min() 平局位——k_opt·ω_opt³ 与 k_v·v0³
在设计点数学相等（≤2 ulp，§3.4/§3.5），两支路值行为等价、无刀锋；② ω=0 为 EQ-WT-7
分母奇点——有效性域 ω ≥ 0.5·ω_opt(v0) 守卫（注册域内不可达，§3.5）+ 手拼配置钳位
WT-IMP-Q1；③ E_est 恒用 v_est（monitor 模式也不切换——A-wt-est-channel）；④ 事件边界
（t=20.0）恰在子步边界，无子步内间断——若实现轮调整 h 须保持该性质（登记为实现约束）。

### 1.4 assumptions 清单（提案，进 model.assumptions）

| id | text |
|---|---|
| A-wt-ideal-bus | 母线 400 V 等效理想，无电压/频率动态、无功与网损；等效母线是功率平衡抽象，不是电网模型。 |
| A-wt-cp-empirical | Cp 为经验解析式（c₁…c₆ 教学惯例参数组），非本机组实测、非设备辨识；λ_opt/Cp_max 由数值最大化求得并按 15 位有效数字登记。 |
| A-wt-single-mass | 传动链为单质量刚性轴集总（直驱教学等效，无变速箱、无轴系扭转模态）；J = 300 kg·m² 为教学整定等效值（假设非实测参数）。 |
| A-wt-mppt-omega | MPPT 为最优增益律 P_ref = k_opt·ω³（转速反馈，真实机组惯例的教学化）；不建模 I-V/工作点类约束面（变流器按受控功率源建模，可用功率保护钳位见 A-wt-guard）。 |
| A-wt-guard | 可用风功率保护钳位 P_v_cap = k_v·v_ctrl³（k_v 即理论最优曲线系数，γ ≡ 1）为防失速守卫：仅在转速低于最优点（λ < λ_opt）时绑定；风速传感器偏置经该钳位进入闭环（低估收紧、高估松开——单向性见 §3.5 角点）。 |
| A-wt-pitch-pro | 桨距为比例转速调节（β_ref = K_β·(ω−ω_N)，K_β = 3.0 °/(rad/s) 教学整定）+ 执行器一阶跟踪（τ_β = 0.5 s）；无积分抗饱和、无死区、无独立变桨（统一桨距角）。 |
| A-wt-ideal-converter | 全功率变流器理想：P_wt 以 τ_e = 1.0 s 一阶跟随目标，无开关动态、无效率曲线、无无功/穿越控制；额定封顶 P_rated = 15 kW 为模型结构设定。 |
| A-wt-ideal-feeder | 电网馈线为理想双向平衡源：P_grid = P_load − P_wt，瞬时补差，无爬坡限制、无额定约束、无倒送约束。 |
| A-wt-const-load | 负载恒定 30 kW；WT-001 无 load_step 族（不可调度电源的教学对照面，A-pv-const-load 同构）。 |
| A-wt-est-channel | P_wt,est 为 EMS 级风速折算估计，恒用测量风速 v_est = v_true + b(t)（不随运行模式切换）；d_wt 是测量链一致性的代数恒等，不是能量损失。 |
| A-wt-l0b | 变桨与功率控制为行为级闭环，不是经过验证的设备控制器。 |

### 1.5 未建模物理清单（进 model.limitations + UI 可查）

1. **尾流与塔影效应、风剪切与空间平均**（风速为单点等效输入，anemometer 与风轮同位置
   等效）；**湍流场与随机风**（仅阶跃阵风，无连续气象动态）；
2. **气弹耦合与疲劳载荷**（叶片柔性、振动模态、寿命面）；
3. 传动链柔性（单质量刚性轴集总）、变速箱（直驱教学等效）、轴承摩擦与效率（无独立
   机械效率项——气动→电功率链无集总 η，P_wt 由扭矩平衡直接给出）；
4. **偏航系统**与对风误差、机舱动态；
5. 发电机电磁暂态、变流器开关动态与效率曲线、无功/电压控制、故障穿越（LVRT/HVRT）；
6. **保护系统**：超速保护、桨距限速保护、cut-in/cut-out 切入切出（注册域 v ∈
   [3,13] m/s 内不触发，未建模）、结冰与气象保护；
7. **转速传感器通道理想化**（ω 反馈无偏置族——转速传感器偏置教学点由 GT-001 承载，
   WT-001 不重复，scope 纪律）；
8. 倒送域（load < P_wt 时 P_grid < 0）为理想双向馈线的合法工作区，不建模倒送约束
   （PV001 §1.5 项 6 同款）；
9. normalizeConfig 无跨参数校验（FL-001 同款先例 systems.js:290），手拼配置可致
   v_ctrl < 0 或 ω 越有效性域下界（负 λ/停机发散）——**钳位方案为实现期决策点
   WT-IMP-Q1**（engine 侧钳位 or UI 联动校验，二选一须记录，PV-IMP-Q1 先例）；
10. L0b 行为级演示模型；非实测、非 Simulink、无实测对比（FL-001 逐字句复用，
    systems.js:291，ALLOW 覆盖实证）；定位句：本模型为机械动态行为级并网演示（L0b），
    非机组/电网动态验证。

### 1.6 层级判定与机制定案（评审裁定点索引）

**层级判定（WT-DRAFT-Q3 推荐 L0b）**，ALINE_MODEL_DEPTH_DESIGN §1.1 判据逐条对照：

| ALINE §1.1 判据 | 本提案对应 | 满足声明 |
|---|---|---|
| L0b：方程含非线性项但结构仍是低阶 ODE | (ω, β, P_wt) 三状态；ω 的 RHS 经 Cp(λ(ω),β) 与 1/ω 扭矩非线性耦合，无闭式解 | ✔ 低维状态 + 光滑 RHS + 数值解稳定（§3.4 收敛证据） |
| L0b：数值积分可高精度复算 | 固定步长 h=0.01 分区更新序（Euler for ω + 精确指数 foStep for P_wt/β，§1.3-b）；oracle 逐算子复刻 | ✔ 与 GT-001 L0b swing 同积分面级别 |
| L1：新物理状态变量（温度/浓度/压力等） | **无**——三状态均为机械/功率量，无热力学类新物理 | ✘ 不满足 L1（如未来引入塔架/叶片热或气弹状态，另立 G2b） |
| L1：高维/刚性/耦合场 + 专用积分器 | 三维非刚性、时间尺度同量级（τ_e=1.0/τ_β=0.5/τ_J≈3.6 s）、固定网格可复算 | ✘ 不满足 L1 |
| L0：方程可手解、输出确定 | Cp 耦合 + 1/ω 项不可手解（仅 P_wt/β 在分段常值目标段有精确指数——解析子链嵌入） | ✘ 纯 L0 不成立（须砍转速状态，教学定位不符） |

**机制定案（推荐项，评审裁定点 WT-DRAFT-Q1/Q2）**：

- **Q1（风速传感器偏置注入点）推荐定案**：风速测量进入**可用功率保护钳位
  k_v·v_ctrl³（EQ-WT-4 第三支路）+ EMS 估计通道（EQ-WT-8）**。**复算证伪记录**：
  若按直觉把 v_meas 直接作目标律（P_ref = k_v·v_meas³，无转速反馈），阵风上行后
  转速单调坠落穿越 0、数值发散（复算 ω(60) ~ 1.9e19 rad/s，无平衡点）——v³ 目标律
  物理不可行，登记为本草案对 DEC-4 字面形态的实质细化依据（§3.4 失速对照）。备选
  「转速传感器偏置」不采（与 GT-001 speed_sensor_bias 教学点重复，FAULT_CATALOG §3）；
  备选「纯估计通道（monitor-only）」不采（闭环零效应，教学弱）。
- **Q2（pitch_stuck 语义）推荐定案**：**位置强制**（执行器窗内 β ≡ β_stuck = 30°·magnitude%）
  ——与 FL/FC/GT 的「指令限幅」先例模式不同：亚额定工况桨距指令为零（β_ref = 0），
  限幅式卡涩将是 no-op；位置强制语义在默认工况立即生效。差异显式登记，不静默。

## 2. 故障族提案（3 族，全部封闭参数域）

### 2.1 `v_sensor_bias`（family=sensor_drift，风速传感器偏置——低估方向）

| 字段 | 提案 |
|---|---|
| 类型/作用位置 | 测量阶跃偏置（低估）→ anemometer（风速传感器） |
| params | magnitude：低估幅值，m/s，min 0.5 / max 3.0 / step 0.5 / default **1.0**，precision 1；help：「低估偏置使测量风速低于真实 |b| m/s：可用功率保护钳位收紧，真实出力被压低；高估方向零真实效应（保护松开，仅估计通道暴露——见角点声明）」 |
| defaultTime_s / timeRange | 20 / [2,55]（库口径） |
| closedLoopEffect | 可用功率上限由 k_v·9³ = 10.00 kW 收紧至 k_v·8³ = 7.02 kW（默认 B=1.0），P_wt τ=1.0 s 跟随下行，转速上升 180.6→224.3 rpm（桨距随即介入 β→5.51°），λ 8.10→10.06 右支偏移，馈线 20→22.98 kW；d_wt 瞬态 +2.98 kW 后归零（估计先跳下行、真实滞后——闭环把低估故障吸收进自洽：保护钳位使真实出力恒等于被低估的估计值） |
| monitorEffect | 真实出力不变（10.00 kW 恒定）；保护钳位改读真实风速；P_wt,est 仍按低估测量折算，d_wt ≡ +2.98 kW 持续暴露（健康测量下 d_wt ≤ 0 的界被测量伪影破坏——特征本身），ΔE_wt = −0.0331 kWh（估计偏少） |
| causalTemplateId | wt-sensor-drift（§6.4） |

### 2.2 `pitch_stuck`（family=actuator_fault，变桨卡涩——位置强制）

| 字段 | 提案 |
|---|---|
| 类型/作用位置 | 执行器位置强制 → pitch_act（变桨执行器） |
| params | magnitude：卡涩偏转比例，%，min 20 / max 85 / step 5 / default **55**，precision 0；help：「变桨执行器卡涩于 β_stuck = 30° × magnitude%（55% → 16.5°）偏转位置；与 FL/FC/GT 指令限幅模式不同——亚额定桨距指令为零，限幅式将是 no-op，故本族采用位置强制语义」 |
| defaultTime_s / timeRange | 20 / [2,55] |
| closedLoopEffect | 两模式同生效（物理执行器）：β 0→16.5° 钉扎，Cp 骤降 0.480→0.167（λ 平衡点 5.69 左支），P_wt 10.00→3.47 kW、转速 180.6→127.0 rpm（MPPT 曲线跟随下行），馈线 20→26.53 kW；d_wt 持续 −6.53 kW（运行点偏离最优曲线的故障特征，不归零——与 sensor_drift 闭环归零对照） |
| monitorEffect | 同闭环（物理执行器故障，与控制模式无关——FL monitorEffect「限幅作用在物理执行器上」同款措辞 systems.js:271） |
| causalTemplateId | wt-pitch-stuck（§6.4） |

全域稳定性（复算实证，§3.4）：mag 20…85%（步 5）全部存在稳定左支平衡，P_wt(60) 从
6.20 单调降至 1.73 kW、λ_eq 从 6.91 降至 4.52（有效性域下界 0.5·λ_opt = 4.05 之上，
最小裕度 11%）、无失速发散——**域扫描冻结仍列为 WT-G2b-03 emit 硬条件**（GTL1 §3.3.1
A-2 同款纪律：越界则回改参数域上限或登记失速区为域外）。

### 2.3 `gust_step`（family=gust_step，阵风阶跃——物理输入）

| 字段 | 提案 |
|---|---|
| 类型/作用位置 | 物理输入阶跃（风速增幅）→ rotor（有效真实风速 v0→v0+Δv） |
| params | magnitude：阵风增幅，m/s，min 1.0 / max 3.0 / step 0.5 / default **2.0**（v 9→11，跨额定区 v_rated = 10.302），precision 1；help：「有效真实风速阶跃上升，两模式同生效；默认参数跨额定区——功率封顶 15 kW、转速锚定、桨距吸收（β 0→1.73°）」 |
| defaultTime_s / timeRange | 20 / [2,55] |
| closedLoopEffect | 物理输入，与控制模式无关：亚额定段（gust +1.0，v=10 < v_rated）MPPT 新最优点 P_wt→13.72 kW、β 恒 0、d_wt 归零；跨额定段（默认 +2.0，v=11）P_ref 封顶 15 kW、转速锚定 212.3 rpm（ω_N 邻域）、桨距吸收 β 0→1.73°、d_wt 稳态 −3.26 kW（封顶工况合法残差） |
| monitorEffect | 同闭环（物理输入，逐位同解——复算实证全序列最大差 0.00e+00，§3.4；monitor Run 不重复入 golden，§4） |
| causalTemplateId | wt-gust-step（§6.4） |

**family 名裁定说明**：提案 `gust_step`（不复用 `shading_step`/`load_step`）——作用
位置与因果方向不同（环境输入侧的**上行**气象阶跃 vs PV 遮挡的下行/负载侧需求）；
目录登记独立族名；引擎实现按「物理输入阶跃」同一模式复用 PV shading 轨语义。

### 2.4 scope 提案

三族全部 **extension_preview**（新系统，SCOPE §8.2 治理）：scope.js `classify` 现状
（src/core/scope.js:42-83）对 systemId ≠ 'FL-001'/'FC-001' 的配置 fall-through 至
`return ok ? 'approved_p0' : 'extension_preview'`（scope.js:82）——**WT-001 全场景
零改动即为 extension_preview**，SA-24 白名单（APPROVED.systemId='FL-001'，
scope.js:17-30）不动，assertApprovedP0 对 WT 配置抛 SCOPE-E01（scope.js:103-109）。
系统级白名单/升正式须未来显式 CHG（FC-001 升 approved_fc 的 CHG-20261030-12 先例）。

## 3. 验收锚点（数值预填，由 §3.4 复算独立计算；oracle emit 时冻结）

默认参数：v0 = 9 m/s、load = 30 kW、P_rated = 15 kW、τ_e = 1.0 s、τ_β = 0.5 s、
J = 300 kg·m²、K_β = 3.0 °/(rad/s)、t0 = 20 s、60 s 网格、子步 h = 0.01。
容差提案列对标 PV001 §3 形制。

### 3.1 场景 A：v_sensor_bias 闭环（B = 1.0 m/s 低估，v_ctrl = 8）

| 锚点（60 s） | 值 | 容差 | 复算依据 |
|---|---|---|---|
| `P_wt_true(20.0)` | **10.000000 kW** | ±0.05 kW | 事件行 = 状态 pre 值（post 采样行语义） |
| `P_wt_true(20.1)` / `(21.0)` / `(26.0)` | 9.716731 / 8.118379 / 7.030698 | ±0.001 kW | 目标恒定段精确指数 7.023320 + 2.976680·e^(−(t−20))（复算与解析逐位吻合至 9 位小数） |
| `P_wt_true(60)` | **7.023320 kW** | ±0.05 kW | = k_v·8³/1000（保护钳位值，逐位） |
| `P_grid_true(60)` | **22.976680 kW** | ±0.05 kW | 30 − 7.023320 |
| `n_rotor(60)` | **224.324628 rpm** | ±0.5 rpm | 右支平衡（转速上升、桨距介入） |
| `beta_pitch(60)` | **5.5101°** | ±0.1° | β_ref = 3.0·(ω−ω_N) 平衡 |
| `lambda_tip(60)` / `cp_coeff(60)` | 10.058780 / 0.337132 | ±0.01 | Cp 右支下移 |
| `d_wt(60)` | **0** | ≤1e-9 kW | 复算 4.5e-14（闭环吸收：真实出力 = 被低估的估计值） |
| max\|d_wt\| | **2.976680 kW @ t=20.0** | ±0.05 kW | \|P_wt(20.0) − P_wt,est(20.0)\| = \|10 − 7.0233\|（估计先跳、真实滞后） |
| `r_true` / `r_meas` | ≡ 0 | ≤1e-12 kW | 定义恒等，复算逐点 0.00e+00 |
| `E_wt_true(60)` | **0.134419 kWh** | ±0.0005 kWh | 200 + 280.933 + 2.977（τ_e 滞后超额）= 483.910 kW·s |
| `E_wt_est(60)` | **0.133592 kWh** | ±0.0005 kWh | (10·20 + 7.0233·40) = 480.933 kW·s ÷ 3600（事件感知解析） |
| `ΔE_wt(60)` | **−0.000827 kWh** | ±0.0005 kWh | 估计偏少（低估方向） |
| `E_grid(60)` / `E_load(60)` | 0.365581 / 0.500000 | ±0.0005 kWh | E_grid = E_load − E_wt,true（定义恒等） |

### 3.2 场景 A'：v_sensor_bias 仅监测 ／ 场景 B：pitch_stuck 闭环（55%，两模式同）

| 场景 | 锚点（60 s） | 值 | 容差 | 复算依据 |
|---|---|---|---|---|
| A' | `P_wt_true(60)` | **10.000000 kW**（全程恒定） | ±0.05 kW | monitor 偏置不进入物理回路（保护钳位改读真实风速，钳位松开） |
| A' | `d_wt(60)` | **+2.976680 kW** | ±0.05 kW | 10 − 7.0233（估计通道恒用测量——界破坏特征） |
| A' | `E_wt_true` / `E_wt_est` / `ΔE_wt` | 0.166667 / 0.133592 / **−0.033074 kWh** | ±0.0005 kWh | 600 / 480.933 / −119.067 kW·s（估计偏少） |
| B | `beta_pitch(20.0)` | **16.5000°**（钉扎） | ±0.1° | 位置强制，事件行即 β_stuck（I_cap 自 t_start 生效先例） |
| B | `P_wt_true(21.0)` / `(26.0)` / `(60)` | 9.242988 / 4.584997 / **3.473779 kW** | ±0.05 kW | Cp(λ,16.5°) 坍缩 → 左支平衡（复算 601 点全程） |
| B | `n_rotor(60)` | **126.986056 rpm** | ±0.5 rpm | MPPT 曲线跟随下行（k_opt·ω³ 支路） |
| B | `lambda_tip(60)` / `cp_coeff(60)` | 5.694091 / 0.166741 | ±0.01 | 左支平衡 λ_eq（二分根 5.6941 与仿真逐位吻合） |
| B | `d_wt(60)` | **−6.526221 kW** | ±0.05 kW | 3.4738 − 10（恒用测量估计 vs 偏离最优的真实出力——故障特征不归零） |
| B | max\|d_wt\| | 6.526221 @ t=60.0 | ±0.05 kW | 单调衰减无超调（Pmin = P(60)） |
| B | `E_wt_true` / `E_wt_est` / `ΔE_wt` | 0.100984 / 0.166667 / **+0.065682 kWh** | ±0.0005 kWh | 估计偏多（卡涩使真实出力掉、估计不变） |

### 3.3 场景 C：gust_step 闭环（Δv = +2.0 m/s，v 9→11，跨额定区；两模式同解）

| 锚点（60 s） | 值 | 容差 | 复算依据 |
|---|---|---|---|
| `P_wt_true(60)` | **15.000000 kW** | ±0.05 kW | 额定封顶（k_opt·ω³ > 15 后 P_rated 支路绑定） |
| `P_wt_true(21.0)` / `(26.0)` | 10.676732 / 14.935791 | ±0.001 kW | 动目标段（k_opt·ω³ 随转速爬升后封顶），无闭式——oracle emit 冻结 |
| `n_rotor(60)` | **212.304228 rpm** | ±0.5 rpm | 与解析二分平衡 212.3042 逐位吻合（ω_eq = 22.232447 rad/s） |
| `beta_pitch(60)` | **1.733766°** | ±0.1° | 桨距吸收（β_eq 解析二分 1.7338° 一致） |
| `lambda_tip(60)` / `cp_coeff(60)` | 7.788912 / 0.394360 | ±0.01 | 额定区运行点（λ 略左于 λ_opt） |
| `d_wt(60)` | **−3.257888 kW** | ±0.05 kW | 15 − k_v·11³/1000（封顶工况合法残差，非故障） |
| max\|d_wt\| | 8.257888 @ t=20.0 | ±0.05 kW | \|10 − 18.2579\|（估计按瞬时跳变、真实滞后爬升） |
| 亚额定对照（gust +1.0，v=10） | P(60) = **13.717421** = k_v·10³、β ≡ 0、λ = 8.1019、cp = 0.480012、d_wt(60) = 0 | ±0.05 kW / ±0.01 | MPPT 区新最优点（复算实证） |
| 域上角点（gust +3.0，v=12） | P = 15.000、β = 7.2095°、λ = 7.7260、cp = 0.303758、d_wt(60) = −8.703704 | 同上 | β_max = 30° 内（复算实证） |
| 闭环 vs 仅监测 | **逐位同解** | 全序列最大差 0.00e+00 | 物理输入（复算实证，§3.4）；monitor Run 不重复入 golden（§4） |
| `E_wt_true` / `E_wt_est` / `ΔE_wt` | 0.218959 / 0.258421 / **+0.039462 kWh** | ±0.0005 kWh | E_est = (10·20 + 18.2579·40) = 930.316 kW·s ÷ 3600（解析与仿真逐位吻合）；ΔE 估计偏多 |

### 3.4 恒等式、健康局与复算记录

- 健康局（H）：P_wt ≡ 10.000000、P_grid ≡ 20.000000、n ≡ 180.643754 rpm、β ≡ 0、
  λ ≡ 8.100117、cp ≡ 0.480012、d_wt ≡ 0、E_wt,true = E_wt,est = 0.1666667 kWh（= 1/6，
  精确有理数）、E_grid = 0.3333333 kWh、E_load = 0.5 kWh（复算 60 s 全序列转速漂移
  0.000e+00）。
- 判别性恒等：r_true ≡ 0、r_meas ≡ 0（全部场景逐点精确 0.00e+00——与 FL-001 的
  r_meas = 0.4·b 形成教学对照，§0）；健康测量下 d_wt ≤ 0 恒成立（Cp ≤ Cp_max），
  监测轨偏置破坏该界（+2.98）为测量伪影特征。
- **设计点闭合**：k_v·v0³ = 10.000000000000 kW（有理数精确）；k_opt·ω_opt³ =
  9999.999999999998 W（差 1.8e-12 W = 10000 的 1 ulp 量级；独立路径复算可见 2 ulp
  末位差，路径相关——健康局 min() 平局的浮点位差，两支路值差 ≤2 ulp，行为等价，
  T-A 容差覆盖）；γ ≡ k_v/(Cp_max·½ρA) = 1.000000000000000（R 由该闭合导出）。
- **复算记录**：锚点数值由临时脚本（Python stdlib，`python -I`）独立计算——①设计点
  闭合（golden-section 求 λ_opt/Cp_max + 闭式常量导出）；②v³ 目标律失速对照（Q1 证据，
  ω 穿越 0 数值发散）；③三场景全序列 601 点仿真（冻结更新序复刻）+ pitch_stuck 全域
  14 点扫描（20…85% 全部稳定平衡，λ_eq ∈ [4.52, 6.91]，无失速）；④半步长自收敛
  （h=0.01 vs h=0.005：max\|Δn\| ≤ 1.29e-2 rpm、max\|ΔP\| ≤ 4.6e-3 kW、max\|Δβ\| ≤
  3.9e-3°，最大差在 t=20 阶跃邻域——Euler 一阶局部阶，信息性登记；T-A 依据是同更新序
  逐算子复刻而非收敛阶）；⑤gust 两模式逐位对照（全 22 通道 × 601 点最大差 0.00e+00）；
  ⑥包络扫描（§3.5）。脚本已按任务纪律删除，本节数值即其输出摘录；评审可按 §1.3
  方程独立重推（常量 15 位显式列出，平衡点二分可复现）。

### 3.5 包络与角点声明（UI 全域，注册域内复算）

| 项 | 声明 | 依据 |
|---|---|---|
| P_wt,true 域 | [1.73, 15.00] kW（下端 = stuck 85% 角点 1.7325；上端 = 额定封顶） | 复算包络扫描 |
| P_grid 域 | **[−5.00, 43.2675] kW**（load ∈ [10,45] ∧ P_wt ∈ [1.73,15]）；倒送域 load < P_wt 时 P_grid < 0（load=10、P_wt=15 → −5 kW），馈线理想双向、倒送不建模约束 | 复算包络扫描 |
| n_rotor 域 | [100.70, 240.06] rpm（下端 stuck 85%、上端 bias −3 角点）——有效性域 ω ≥ 0.5·ω_opt(v0)（n ≥ 90.3 rpm）**域内**，最小裕度 11%（stuck 85% 角点 λ_eq = 4.52 vs 下界 4.05） | 复算包络扫描 |
| β 域 | [0, 10.45°]（注册域内最大 = bias −3 角点 10.45°）≪ β_max = 30°（钳位不活跃——与 GT u_cap 钳位活跃的对照） | 复算包络扫描 |
| v_sensor_bias 高估方向角点 | b > 0（高估）时保护钳位松开（k_v·(9+b)³ > 10 kW）、健康亚额定工况**零真实效应**，仅估计通道暴露（d_wt = 10 − k_v(9+b)³ < 0）——**单向性为本族结构设定**（传感器在保护/估计通道 vs PV 目标通道的差异，§6.1），登记角点非缺陷 | min() 结构推论 + 复算抽查 |
| 健康局 min() 平局 | k_opt·ω_opt³ 与 k_v·v0³ 在设计点数学相等（浮点差 1.8e-12 W = 10000 的 1 ulp 量级，独立路径复算可见 2 ulp 末位差——路径相关）——两支路值差 ≤2 ulp，行为等价无刀锋（不同于会产生不同值的阈值切换） | 复算（§3.4） |
| 手拼配置 | normalizeConfig 无跨参数校验（FL-001 同款先例 systems.js:290），手拼可致 v_ctrl < 0（k_v·v_ctrl³ 负值支路）或 ω 越有效性域下界（停机发散）——无物理意义；**钳位方案为实现期决策点 WT-IMP-Q1**（engine 侧钳位 or UI 联动校验，二选一须记录，PV-IMP-Q1 先例） | scope/engine 现状核实 |
| v0 域封顶理由 | v0_ms ∈ [6,10] 有意封顶于 v_rated = 10.302 之下——健康初值全域解析（ω(0) = λ_opt·v0/R、β(0)=0）；额定区初值需数值平衡求解，未来开放须先立初值求解面并显式 CHG | 结构声明 |

## 4. golden 计划（独立 oracle WT001_ORACLE；本波零改动，emit 入 v0.8.0 轮）

| # | 项 | 内容 |
|---|---|---|
| 1 | 独立 oracle | 新文件 `tools/oracle/wt001_oracle.py`（**本波不创建**——V072 §0 本波禁区不动 tools/oracle/**；v0.8.0 WT-G2b-03 执行）。独立性声明对标 fl001_oracle.py:1-10 / pv001_oracle.py：不 import src/**、方程与常量唯一权威文本 = 本文档 §1.3（含常量表 §1.3-a 与冻结更新序 §1.3-b，批准后），自含硬编码；自带自检 WS-1…WS-8；golden 由本 oracle 只读生成、engine 只读比对（G0-DEC-16）。**出生即 oracle_base 接入**（无 V-03 历史字节负担，gt001_l1_oracle 先例）：`import oracle_base` + `resolve_run_spec` + `write_golden_with_sidecar`（LF 钉死）+ `approval_block/apply_approval`（三字段非 null 方可落盘）+ `SERIES_IDS` 模块常量（含 "t" 列） |
| 2 | Run 数提案 | **5 Run**：`healthy`（baseline）/ `closed_loop_fault`（v_sensor_bias 1.0 低估闭环）/ `monitor_only`（同偏置仅监测）/ `pitch_stuck_closed_loop`（55% 位置强制）/ `gust_closed_loop`（+2.0 阵风）。**gust monitor 不重复入 golden**：两模式逐位同解已复算实证（§3.3；FLEXT §2 项 1 / PV001 §4 项 2 monitor-物理输入不重复先例） |
| 3 | self_check 提案 | WS-1 网格（601 点、t[i]=i·dt、单调）；WS-2 设计点闭合（k_opt·ω_opt³ vs k_v·v0³ 差 ≤1e-9 W、γ = 1 ± 1e-12）；WS-3 能量恒等 E_wt + E_grid = E_load（同测度 ≤1e-9 kW·s）；WS-4 r_true/r_meas 逐点 ≡ 0（≤1e-12）；WS-5 健康局不变量（P_wt ≡ 10.000±1e-9、n ≡ 180.643754±1e-6、d_wt ≡ 0、β ≡ 0）；WS-6 锚点全表复算（§3.1–3.3）；WS-7 gust 两模式逐位等价（≤1e-15）；WS-8 无 NaN/Inf + **pitch_stuck 域扫描 emit 硬条件**（mag 20…85% 步 5，λ_eq > 0.5·λ_opt 恒成立、ω 不越下界——GTL1 §3.3.1 A-2 同款，越界即自检 fail → emit 拒绝写盘）+ UI 域包络抽查（P_wt ∈ [1.7,15.0]、v0 ∈ [6,10] 端点抽查） |
| 4 | SERIES_IDS | **['t'] + §1.2 表 22 信号 = 23 项**（golden series 惯例含 t 列，golden-compare.js:61-63 网格校验；唯一事件域 null 列 beta_stuck_deg 按 I_bat_cap_A 入 golden 前可空列处理先例，ORACLE_INTERFACE_D2 §5.2 F-4 行） |
| 5 | 元数据（schema v2） | `golden_schema_version="v2"`（新 golden 默认 v2，ORACLE_INTERFACE_D2 §3.5）；`golden_id="wt001_v1"`；`model_id="WT-001"`；`model_version="1.0.0"`（三段式 v2 归一样式）；`method_id="wt001_l0b_euler_dt0.01"`；`engine_baseline=null`；`backend=null`；`generated_by` 一段式；units 増 `"wind":"m/s","angle":"°"`（λ/cp 无量纲不入单位表）；**approval 三字段非 null 方可落盘**——首签引本规格批准 CHG（WT-G2b-02 批准后、WT-G2b-03 emit 时填） |
| 6 | 容差 tier | **T-A**（同更新序逐算子复刻 oracle——GT-001 v1/v2 先例；非 RK4 双实现，不做 T-B 方法等价承诺路线）。gate 块提案：`{tier:"T-A", E_kWh:1e-9, P_kW_rtol:1e-12, P_kW_atol:1e-15, n_rpm_atol:1e-9, d_wt_atol:1e-9, r_true_kW:1e-12, I_A_rtol:1e-12, I_A_atol:1e-15, t_s:1e-9}`（形制对标 pv001_v1 tolerances.gate——**I_A 两键必带**：bias_ms 命中 verify_golden series_limit `startswith("bias")` 分支（scripts/verify_golden.py:133-134），PV 的 bias_W_m2 同款；n_rpm_atol 1e-9 走 `endswith("_rpm")` 分支 :127-128；v/beta/lambda/cp 类无后缀分支，走默认 fall-through 1e-9 :139——现状零改动即够用，登记核对项非工作面）。量级预案非终值，终值 emit 冻结；若跨实现散差超限 → 降 T-B 并附 convergence 块（双向预案登记） |
| 7 | verify_golden | **注册面为硬编码表**（scripts/verify_golden.py:51-96 MODELS dict；PV001 §4 项 7 勘正先例维持）：WT-G2b-03 新增 `import wt001_oracle` + `MODELS["wt001"]` 注册行——提案：`i_true="P_wt_true_kW"` / `i_meas="P_wt_meas_kW"`、`event_tol="P_kW_atol"`（WT gate 无电流相位量，PV 同款 :89）、scalars：E_wt_true_kWh / E_wt_est_kWh / E_wt_err_kWh / E_grid_kWh / E_load_kWh（PV 能量账本同构）。注册行追加不改参数化逻辑；T-A 路径零改动 |
| 8 | 预期失效面 | 新增 `data/golden/wt001_v1.json`(+`.sha256`)；**既有 6 golden 字节零变更**；verify_golden --all 路径覆盖 wt001；tests/registry.test.js 哈希为 per-Run config，不因新增系统破坏（PV001 §4 项 8 同款核对）；UI 枚举点（home.js 系统卡/compare/scenario 页，home.js:22/307 现状）为 WT-G2b-04 实现面 |

## 5. scope 与治理登记

- 系统级：WT-001 = **extension_preview**（新系统，§2.4；PV-001/GT-001 同位先例，
  FAULT_CATALOG §3/§6）。
- 族级：三族均 extension_preview，无白名单挂载；SA-24（scope.js APPROVED）零改动；
  classify 零改动（fall-through 现状即正确语义，scope.js:82）。
- Arena 盲测池：**PV-001 C-1 勘正先例适用**——WT-001 注册进 systems.js 后**默认进入
  Arena 系统清单**（src/ui/pages/arena.js:93-107 `systemList()` 首选 `api.systems.list()`
  全注册表、`ARENA_EXCLUDED = ['PV-001']` 过滤；`familyPool` 按目录派生
  src/core/arena-protocol.js:180-186，gust_step 族不在 FAMILY_ORDER 全局序但 familyPool
  直读目录）。**显式排除**：ARENA_EXCLUDED 增 `'WT-001'` + 守卫注释，列为 **WT-G2b-04
  显式工作面**（DEC-2 PV 同款裁定）——Arena 盲包语义依赖 blind_observable 三值映射验证，
  d_wt/P_wt,est 等盲包可见性入池须显式 CHG 并同步通道面裁定，此前过滤。
- 验收路径：P0 验收（assertApprovedP0）、approved_fc 分支、golden 比对三路径对 WT-001
  均关闭（scope.js:94-111 抛 SCOPE-E01）；本规格批准不自动打开任何验收路径——
  打开须 schema v2 approval 首签 + verify_golden 注册 + 显式 CHG（§4 项 5/7）。

## 6. 教学定位与 UI 措辞提案

### 6.1 层级标签与互补性

- 层级标签：`L0b · 机械动态行为级演示`（GT-001 L0b 标签同字面——含机械动态状态，
  非 PV 的纯 L0 静态面；「G2b 已批准」徽章措辞随批准轮追加，PV001 §6.1 先例）。
- 与 PV-001 互补性话术（系统卡/首页）：「PV-001 演示静态直流面的输入估计通道；
  WT-001 演示旋转机械面的转速-气动耦合——环境变化在 PV 是解析映射，在 WT 要经过
  惯性与工作点漂移」。互补点五则：① 静态 DC vs 机械动态（转速状态 + 惯性 + 桨距
  执行器）；② MPPT 目标 = 辐照度线性映射（k·G）vs 转速三次最优增益律（k_opt·ω³）
  + 可用功率保护面；③ 传感器偏置注入通道：目标计算（PV，双向真实效应）vs 保护钳位
  （WT，单向——低估压出力、高估仅估计暴露）；④ 残差判读三分法：d_wt = 0（最优）/
  负（偏离最优：故障**或**封顶工况——设计性偏离与故障性偏离的判读）/ 正（测量伪影）；
  ⑤ 间歇性输入形态：遮挡下行阶跃（PV）vs 阵风上行阶跃跨额定区（WT）。

### 6.2 文案提案（实现期入 systems.js，逐句禁词预检见 §6.3）

| 字段 | 提案文案 |
|---|---|
| tagline | 「在 20 秒注入 1.0 m/s 风速测量低估，看可用功率保护如何把测量偏差变成真实出力下降。风电 L0b 机械动态演示，不含尾流/湍流/气弹模型。」 |
| summary | 「风轮经全功率变流器接入 400 V 等效母线，与理想平衡馈线共同为 30 kW 恒定负载供电；变流器按转速最优增益律给目标功率（额定 15 kW 封顶、可用风功率保护钳位），桨距执行器一阶跟踪转速调节指令，风轮转速由气动扭矩与电功率之差驱动。」 |
| grid 组件 description | 「理想平衡功率馈线，瞬时吸收/补齐母线剩余功率；初始 20 kW 仅用于展示，不代表真实电网侧动态。」 |
| converter 组件 description | 「全功率变流器（含 MPPT 与保护）：按转速最优增益律与可用风功率保护钳位给目标功率，一阶跟随；不是经过验证的设备控制器。」 |
| pitch_act 组件 description | 「变桨执行器一阶跟踪（τ=0.5 s）：按转速偏差比例给出桨距指令；卡涩场景钉扎于偏转位置。」 |
| limitations 追加 | 「L0b 行为级演示模型；非实测、非 Simulink、无实测对比。」（FL-001 逐字句复用） |

### 6.3 三禁词/全库 33 模式自查表（实现期 node tools/copy-guard.mjs 终检）

copy-guard 33 模式为全库禁词、扫 src/**（tools/copy-guard.mjs:15 SCOPES=['src']），
对 WT 文案同库适用（PV001 §6.3 口径）。本草案在 FaultLab-evaluation/**（不扫描），
实现轮文案迁入 src/** 前按先例预检：

| 提案串 | 高危子串核查 | 结论 |
|---|---|---|
| §6.2 全部 6 串 | 无「机组动态验证/电网稳定验证/一次调频验证/惯量验证/实测/已验证/校准/能量损失/检出率/误报率/诊断算法/置信度/逐位一致/第三方认证/防篡改/公证/sealed/工业级/工业真实/已证明/验证通过/…」命中；「不是经过验证的设备控制器」为 FLEXT §1.2 F5 先例句式（「经过验证」不含禁词「已验证」子串） | 0 命中 |
| A-wt-cp-empirical / single-mass / mppt-omega / guard / pitch-pro / l0b（§1.4） | 同上；「假设非实测参数」含 ALLOW 串「非实测」（copy-guard 先剔除 ALLOW 再匹配，tools/copy-guard.mjs:47） | 0 命中 |
| limitations §1.5 项 10 | 「非实测、非 Simulink、无实测对比」三项均 ALLOW 串（'非实测'/'无实测对比'），该句已在库（systems.js:291）基线 PASS；「非机组/电网动态验证」为 ALLOW 串（copy-guard.mjs:30） | 0 命中 |
| 残差类文案（d_wt/r_meas 定义） | 一律用「是测量通道误差/一致性的代数恒等，**不是能量损失**」句式（ALLOW 串「不是能量损失」；G0-DEC-13/UI_COPY_GUARDRAILS 口径） | 0 命中 |
| 「保护钳位收紧/松开」「封顶工况合法残差」 | 不含禁词；「合法」措辞不邻接「验证」 | 0 命中 |

I-5 专项：全部文案不含「并网/母线/馈线」与「稳定/验证」的邻接组合；「电网馈线」
组件 label 与 §6.2 description 已显式声明「不代表真实电网侧动态」；WT 含旋转机械与
桨距，措辞禁「机组动态验证/惯量验证」（GT-001 §3.3 项 7 同款禁令延用）。

### 6.4 因果模板提案（实现期入 WT001.causalTemplates 同层）

- `wt-sensor-drift`（闭环链 n1…n7）：n1 低估偏置注入（config，bias_ms = −B）→
  n2 测量风速下降 9→8 m/s（observation）→ n3 可用功率保护钳位收紧 P_v_cap 10.00→7.02 kW
  （mechanism，EQ-WT-4 第三支路）→ n4 真实出力 τ=1.0 s 跟随下行 10→7.02 kW
  （observation）→ n5 **净扭矩转正、转速上升 180.6→224.3 rpm、桨距介入 β→5.51°、λ 右支
  偏移**（observation——机械动态节点，PV 无此环节）→ n6 馈线补差 20→22.98 kW
  （observation）→ n7 一致性残差 d_wt（kind='algebraic_identity'：瞬态 +2.98 kW 后
  归零——估计通道先跳下行、真实出力滞后，保护钳位使真实出力恒等于被低估的估计值，
  闭环把测量故障吸收进自洽；r_meas ≡ 0 与 FL-001 的 +4 kW 对照）。monitorNodes
  m1…m5：真实出力不变、d_wt ≡ +2.98（界破坏特征，不归零）、ΔE_wt = −0.0331 kWh
  （估计偏少）。
- `wt-pitch-stuck`（n1…n7）：n1 卡涩注入 β 0→16.5° 钉扎（config）→ n2 两模式同生效
  （mechanism，物理执行器）→ n3 Cp 骤降 0.480→0.167（mechanism，EQ-WT-2/3）→
  n4 净扭矩为负、转速下行 180.6→127.0 rpm（observation）→ n5 MPPT 曲线跟随 P_wt→3.47 kW
  （observation）→ n6 馈线 20→26.53 kW（observation）→ n7 d_wt 持续 −6.53 kW
  （algebraic_identity：运行点偏离最优曲线的故障特征，不归零——与 sensor_drift 闭环
  归零对照）。
- `wt-gust-step`（n1…n7）：n1 阵风注入 v 9→11（config，物理输入）→ n2 两模式同解
  （mechanism）→ n3 MPPT 支路爬升与额定封顶 15 kW（mechanism，EQ-WT-4）→ n4 转速锚定
  ω_N 邻域 212.3 rpm（observation）→ n5 桨距吸收 β 0→1.73°（observation）→ n6 馈线
  20→15 kW（observation）→ n7 d_wt 稳态 −3.26 kW（algebraic_identity：**封顶工况合法
  残差**——设计性偏离最优与故障性偏离的判读教学点，§6.1 ④）。

## 7. G2b 进入条件五项自查表（SCOPE_SPLIT_MEMO §8.2）

| # | 进入条件 | 状态 |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：WT-001 为新系统，无 GT/FC 式遗留缺陷清单（SCOPE §2 处置表不含 WT）；触发项 = V06_ROADMAP §2 B-2 行 + V072 §1 DEC-4（本草案即交付物）。无未关闭遗留项 |
| ② | 独立 golden | **计划就绪（未产出）**：golden 后置系 V072 §0「A-4b/B-2 只出草案不 emit」授权的对 ② 字面顺序的**显式偏离**（PV001 C-5 / GTL1 ② 同款登记）；§4 独立 WT001_ORACLE 计划就绪（不复用 FL/FC/GT/PV 公式常量，独立自检 WS-1…8），5 Run，schema v2，T-A，emit 于 v0.8.0 WT-G2b-03 执行，落地并 verify 通过后本项闭合 |
| ③ | UI 措辞与未建模物理清单 | **就绪**：§1.5 未建模物理 10 项 + §6.2 文案提案与 33 模式预检 0 命中 + I-5 专项声明 |
| ④ | 用户书面批准 | **开口**：本波只到草案 + 双路评审（DEC-4：批准与实现 v0.8.0）；批准轮用户裁定后闭合 |
| ⑤ | CHG 登记 | **部分闭合**：起草授权 CHG-20261105-01（V072_WAVE_DESIGN）已登记；批准 CHG 待批准轮登记（开口随 ④） |

## 8. 实现排期提案（WT-G2b-01…04）

> 与 PV001 §8 同构的顺序说明：WT-001 为全新系统，且 V072 §0 本波禁区不动 tools/oracle/**
> 与 data/golden/**——故评审（WT-G2b-02，批准轮）先行，oracle/golden 与实现同为
> v0.8.0 轮。

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| WT-G2b-01 | 方程集/常量表/冻结更新序/锚点预填 + 独立复算（§1.3/§1.3-a/§1.3-b/§3；设计点闭合 + 失速对照 + 全域扫描 + 收敛证据；临时脚本已删除）+ 本草案 v0.1 | S | **已完成**（本波，2026-11-05） |
| WT-G2b-02 | 双路独立评审（物理 A：EQ-WT 自洽/§1.3-b 更新序/锚点复算/失速对照复核/L0b 判据对照/包络角点；治理 B：五项条件/scope 落地/33 模式文案/golden 治理/不动清单/步数账/Q1…Q3 裁定）+ **用户书面批准（DEC-4）** + 批准 CHG（规格更名 APPROVED、条件修订进正文）+ 条件处置追记（PV001 §11 体例） | M | 批准轮（v0.8.0 前置；依赖本草案） |
| WT-G2b-03 | oracle 编写（wt001_oracle.py，oracle_base 出生接入，WS-1…8，T-A 实测冻结/降 T-B 预案）+ wt001_v1 emit（5 Run，schema v2，approval 首签）+ verify_golden MODELS["wt001"] 注册行 + UNIT_DICT/UNITS 增 m/s、°（及无量纲项如需，schema.js:18-24 + systems.js:107-112 纯增项）+ FAULT_CATALOG 增 WT-001 节（§0 时间尺度声明沿用）+ **pitch_stuck 域扫描 emit 硬条件执行**（WS-8）+ schema 测试适配 | M | v0.8.0（依赖 02 批准） |
| WT-G2b-04 | 实现：systems.js WT001 SystemDef（§1 全量：22 信号含 exposure/sourceKind、A-wt-* 11 条、limitations 10 项、EQ-WT-1…9、model_version 1.0.0、initial v0_ms 键面核对 schema 导出面 R-8 同款）+ engine simulateWT001 新轨（**engine.js:1759-1764 分派链现为 FL→FC→PV→else GT001 兜底，必须显式插 WT 分支于 else 之前**，PV001 R-4/GTL1 R-8 同款守卫）+ checks.js WT 分支（能量恒等 PHY 检查 + r 恒等；SOC/energy-balance 系统分支对 WT 不派发——无 SOC/E_bat 面，PV 清算项 1 同款口径，checks.js:314 先例）+ 因果模板三件（§6.4）+ UI 接线（home/compare/scenario/teaching 页系统卡与指标组）+ tests/engine-wt.test.js（A/A'/B/C 锚点断言 + gust 两模式逐位等价断言 + 失速守卫断言）+ **Arena ARENA_EXCLUDED 增 'WT-001' + 守卫注释**（§5）+ scope 零改动核对 + normalizeConfig 钳位裁定（WT-IMP-Q1）+ 步数账裁定（I-7：新断言优先并入现有步，确需新增步按单波 ≤ +1 申报） | L | v0.8.0（依赖 03） |

## 9. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | λ < λ_opt 左支（低转速侧）失速行为被手拼配置或未来参数域开放触达 | 可用功率保护钳位（EQ-WT-4 第三支路）即结构守卫 + 有效性域声明（ω ≥ 0.5·ω_opt）+ WS-8 域扫描 emit 硬条件 + WT-IMP-Q1 钳位裁定——注册域内 stuck 全域扫描实证稳定（§3.4） |
| R-2 | Cp 经验式被误读为实测/辨识参数（GT §3 教训） | A-wt-cp-empirical 双声明（assumptions + limitations）+「教学惯例参数组」显著标注（§1.3 EQ-WT-2）+ 复算记录显式「非设备辨识」 |
| R-3 | I-5 措辞红线：并网/馈线文案滑向电网稳定类表述；机械动态滑向「机组动态验证」 | §6.3 全库 33 模式预检 0 命中 + I-5 专项声明（§0）+ 实现期 copy-guard 终检（run-g2 步兜底） |
| R-4 | v_sensor_bias 单向性（高估零真实效应）被误读为模型缺陷 | §3.5 角点显式登记 + §6.1 ③教学定位（保护/估计通道 vs 目标通道）+ closedLoopEffect/monitorEffect 措辞（§2.1） |
| R-5 | pitch_stuck 位置强制语义与 FL/FC/GT 指令限幅先例的差异被误读为不一致 | Q2 显式裁定 + fault help 文案声明差异理由（亚额定限幅 no-op 不可用，§2.2） |
| R-6 | 「新系统零改动 verify_golden」误读导致 WT-G2b-03 漏注册 | §4 项 7 勘正：注册面硬编码（verify_golden.py:51-96），注册行列为显式工作面（PV001 R-3 同款） |
| R-7 | engine 分派 else 兜底吞掉 WT-001（静默走 GT 物理） | §8 WT-G2b-04 点名 engine.js:1759-1764 显式分支 + tests/engine-wt.test.js 锚点断言（GT 轨数值与 WT 锚点不同，断言即守卫，PV001 R-4 同款） |
| R-8 | 健康局 min() 浮点平局（1–2 ulp）被误读为数值脆弱 | §3.5 声明：两支路值差 ≤2 ulp 行为等价（非产生不同值的阈值切换）+ T-A 同序复刻覆盖 + 复算健康局漂移 0.000e+00 证据 |
| R-9 | Arena 默认入池（systems.list() 全注册表） | ARENA_EXCLUDED 增 'WT-001' 列为 WT-G2b-04 显式工作面 + 守卫注释（PV-001 C-1/DEC-2 先例，§5） |
| R-10 | 步数账膨胀（I-7）：WT 测试/golden 步入 run-g2 | §8 WT-G2b-04 归口：新断言并入现有步，确需新增步按单波 ≤ +1 申报预算（GTL1 §7.3 同款）；本波零接线（V072 §0） |
| R-11 | 单位字典缺口（m/s、°、无量纲）在实现期被 schema 校验拒绝（CN-E02） | §1.2 显式登记 WT-G2b-03 UNIT_DICT/UNITS 扩展工作面（PV001 C-3 / GTL1-IMP-Q2 同款先例，纯增项） |

## 10. 评审记录（预留表——WT-G2b-02 双路独立评审后回填）

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | EQ-WT-1…9 自洽与量纲、§1.3-a 常量与设计点闭合、§1.3-b 更新序、§3 锚点独立复算（失速对照/域扫描/收敛）、L0b 判据对照、包络角点 | 待 | — |
| 评审人 B（治理/口径/回归面） | §7 五项进入条件、scope 落地路径、33 模式文案、golden 治理与 verify_golden 注册面、不动清单、Q1…Q3 裁定点、步数账、预期失效面 | 待 | — |
| 用户批准（DEC-4） | 批准与实现排期（v0.8.0） | 待 | 本表为用户裁定输入 |

## 11. 决策点汇总（评审裁定点，全部待裁；推荐项已标注）

| # | 决策 | 推荐 | 备选 |
|---|---|---|---|
| WT-DRAFT-Q1 | 风速传感器偏置的闭环注入点 | **可用功率保护钳位 k_v·v_ctrl³ + EMS 估计通道**（EQ-WT-4 第三支路 + EQ-WT-8）——复算证伪 v³ 目标律（失速发散，§3.4）；单向性为结构特征 | (a) 转速传感器偏置（与 GT-001 speed_sensor_bias 教学点重复）；(b) 纯估计通道（闭环零效应，monitor-only 教学弱）；(c) v³ 目标律（物理不可行，复算证伪） |
| WT-DRAFT-Q2 | pitch_stuck 故障语义 | **位置强制 β ≡ β_stuck**（亚额定桨距指令为零，限幅式 no-op 不可用；差异显式登记） | 指令限幅式（FL/FC/GT 先例模式——本系统默认工况下 no-op，不可用） |
| WT-DRAFT-Q3 | 系统层级标签 | **L0b · 机械动态行为级演示**（ALINE §1.1 判据对照表 §1.6；「DEC-4 L0/L1 混合」落点 = 解析气动子链（L0 性质）+ 低维非线性 ODE（L0b 性质）） | L0 纯解析（须砍转速状态与机械动态——教学定位不符）；L1（无温度/浓度/压力类新物理状态，判据不满足） |
| WT-IMP-Q1 | 手拼配置钳位 + 步数账 | 实现轮裁定（engine 侧钳位 or UI 联动校验二选一须记录；新断言优先并入现有步） | — |
| WT-IMP-Q2 | UNIT_DICT/UNITS 扩展与文案终稿 | 实现轮按 §1.2/§6.3 预检执行（m/s、°、无量纲项纯增项） | — |

---

**文件结束**。WT001_G2B_SPEC_DRAFT v0.1（2026-11-05，B-2 规格起草人起草，CHG-20261105-01
授权链）。**状态 `DRAFT`：待双路评审（WT-G2b-02）+ 用户书面批准（DEC-4，批准与实现
v0.8.0）**。本草案零代码/golden/oracle 触碰（§0 本波不动清单）；锚点数值为临时复算
预填（§3.4，脚本已删除），终值以 wt001_oracle emit 冻结为准；本规格批准不自动打开
任何验收路径（§5）。
