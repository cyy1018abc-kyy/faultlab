# PV001_G2B_SPEC_APPROVED — PV-001 光伏逆变器 G2b 物理规格（APPROVED v1.0；曾用名 PV001_G2B_SPEC_DRAFT）

> **任务**：B-1 PV-001 G2b 规格起草（V06_ROADMAP §2 主线 B-1 行 / §4 DEC-2 / §7 S3）。
> **授权**：V06_ROADMAP v1（CHG-20261104-08，2026-11-04 批准）v0.6.1 波 §7「S3 B-1 PV-001
> G2b 规格草案（锚点解析预填）」。**DEC-2：本波只出草案+双路评审，实现入 v0.7，批准留待用户**。
> **前置**：PV-001 为全新系统（无遗留契约、无遗留实现、无遗留 golden）；三系统 SystemDef
> 解剖以 FL-001 为模板（src/core/systems.js:114-312）；G2b 结构先例 = FCEXT_G2B_SPEC_APPROVED
> v1.1 / FLEXT_G2B_SPEC_APPROVED v1.1；治理依据 = SCOPE_SPLIT_MEMO §8.2。
> **状态**：`APPROVED`（v1.0，2026-11-04，CHG-20261104-10：V070_WAVE_DESIGN 批准登记，
> 用户「统一采用推荐决策」授权链，PV-G2b-02 闭合）。**v1.0 修订**：曾用名
> PV001_G2B_SPEC_DRAFT（v0.1 起草 / v0.2 双路评审+条件追记，时点状态见 §10/§11 历史记录）；
> 本版将 v0.2 追记 C-1…C-7 定案逐条落入正文（各处注明「v1.0 修订」）。本规格批准
> 不自动打开任何验收路径（§5 末条口径不变）。
> **Q-4 三守卫适用**：新方程集入引擎须走 G2b（即本文档流程）；许可证自研零依赖
> （Python stdlib oracle / 浏览器原生 JS，无新第三方）；验收路径禁入直至批准
> （scope.js 对 PV-001 全场景现返回 extension_preview，见 §5）。
> **记录**：B-1 规格起草人起草（2026-11-04）；锚点数值由临时复算脚本独立计算
> （Python stdlib，闭式解 vs 逐步精确指数双口径交叉，记录见 §3.3，脚本已按纪律删除）；
> v1.0 修订（PV-G2b-01 条件修订，2026-11-04，CHG-20261104-10）：C-1…C-7 定案落正文，
> 文件由 PV001_G2B_SPEC_DRAFT 更名 PV001_G2B_SPEC_APPROVED（普通 mv）。

---

## 0. 定位摘要与红线声明

- **PV-001 光伏逆变器（L0 · 行为级演示模型，单机并网等效）**：DC 侧光伏阵列（辐照度
  G→最大功率点，L0 解析 `P_mpp = k·G·φ_T` + MPPT 一阶跟随 τ_mppt）→ 理想逆变器 →
  400 V 等效母线 → 恒定负载；电网馈线为**理想平衡源补差**（与 FL-001 发电机同位）。
  PV 为**不可调度电源**：出力由环境（辐照度）与 MPPT 决定，不响应负载指令——拓扑上
  **无 load→MPPT 信号边**（与 FL/FC/GT 的 load→controller 边刻意不同，§1.1）。
- **I-5 措辞红线**：无旋转惯量、无频率动态、无电压/无功概念；母线是功率平衡的抽象
  等效，不是电网模型。全部 UI 文案不得暗示并网点稳定类行为（自查表见 §6.3）；
  「电网馈线」组件仅指补差功率源（FL-001「理想发电机」的同构物），描述文案显式声明。
- **与 FL-001 的同构与互补**（教学定位，§6.1）：同为直流侧 + 理想平衡源补差 + 400 V
  等效母线；差异 = FL-001 电池是**可调度**储能（SOC 能量通道、控制器直接调节电流），
  PV 是**不可调度**电源（无储能、无 SOC，出力由环境与测量链决定）。sensor_drift 教学
  对照：FL-001 故障在**功率测量通道**（r_meas = 0.4·b ≠ 0），PV-001 故障在**输入估计
  通道**（辐照度）→ 全部功率测量通道健康 ⇒ r_meas ≡ 0，测量冗余特征转移到一致性残差
  d_pv（闭环稳态 0 / 仅监测 −0.01·b，§1.3 EQ-PV-6）——「闭环把测量故障藏进自洽」
  是本系统的核心教学点。
- 时间尺度沿库口径：duration 60 s、dt 0.1 s、601 点网格、默认注入 t=20 s（FAULT_CATALOG §0）。

## 1. PV-001 系统定义提案

### 1.1 拓扑与组件提案

SystemDef 字段面对照 FL-001 模板（id/level/summary/signals/components/edges/categories/
faults/model/acceptance；实现字段名为 `edges`——任务书「links」的对应物，FL-001 先例
src/core/systems.js:212-221）。defaults：`feedback_mode='closed_loop'`、
`initial={load_kW:30, G0_W_m2:1000}`（**无 SOC 键**——PV 无储能，initial 键面与
FL/FC/GT 的差异点）、`noise={enabled:false, seed:12345, level:0}`；
bounds：`load_kW ∈ [10,45]`（沿 FL-001 systems.js:137）、`G0_W_m2 ∈ [300,1000]`；
`topologyViewBox=[0,0,1000,620]`、`duration_s=60`、`dt_s=0.1`。

| 组件 id | label | kind | role | faultable | 关键 inspector 信号 |
|---|---|---|---|---|---|
| `pv_array` | 光伏阵列 | pv_array | 10 kW 基准（STC）· 解析 P_mpp | **是**（shading_step） | P_pv_true_kW / P_mpp_true_kW / G_true_W_m2 |
| `mppt` | MPPT 控制器 | controller | 测量辐照度→目标功率→一阶跟随 | 否 | P_mpp_ref_kW / G_meas_W_m2 |
| `inverter` | 逆变器 | converter | 理想 DC→AC 功率传递 | 否 | P_ac_kW / P_pv_true_kW |
| `bus` | 等效母线 | bus | 400 V 等效（功率平衡抽象） | 否 | V_bus_V / r_true_kW / r_meas_kW |
| `grid` | 电网馈线（理想平衡源） | grid | 理想双向补差源 · 初始 20 kW 展示 | 否 | P_grid_true_kW / P_grid_meas_kW |
| `load` | 负载 | load | 恒定 30 kW | 否 | P_load_demand_kW / P_load_served_kW |
| `sensor` | 辐照度传感器 | sensor | 辐照度测量 · 故障注入点 | **是**（sensor_drift） | G_true_W_m2 / bias_W_m2 / G_meas_W_m2 |

edges 提案（7 条；**刻意无 load→mppt 边**）：

| id | from→to | kind | label |
|---|---|---|---|
| `pv_array->inverter` | pv_array→inverter | power | 直流功率 |
| `inverter->bus` | inverter→bus | power | 交流馈入 |
| `grid->bus` | grid→bus | power | 补偿功率 |
| `bus->load` | bus→load | power | 30 kW 需求 |
| `pv_array->sensor` | pv_array→sensor | measurement | 辐照度采样（与阵列同平面） |
| `sensor->mppt` | sensor→mppt | measurement | G_meas |
| `mppt->pv_array` | mppt→pv_array | signal | MPPT 目标功率 |

signalCategories 提案：`irradiance`（辐照度）/ `power`（功率）/ `residual`（残差）
——无 `soc`（无储能）、无 `actuator`（本波无执行器族，§2.3）。

### 1.2 信号提案表（17 项）

| id | label | unit | category | sourceKind | exposure 说明 | formula / 定义 |
|---|---|---|---|---|---|---|
| `G_true_W_m2` | 有效真实辐照度 | W/m² | irradiance | MODEL_STATE | public | G_true = G0 − ΔG·1(t≥t0)（shading） |
| `G_meas_W_m2` | 辐照度测量 | W/m² | irradiance | OBSERVATION | blind，noiseSigma 2.0 | G_meas = G_true + b(t) |
| `bias_W_m2` | 辐照度传感器偏置 | W/m² | irradiance | FAULT_EVENT | public | b(t)=0 (t<20 s)，b(t)=+mag (t≥20 s) |
| `P_mpp_true_kW` | 理论最大功率 | kW | power | MODEL_STATE | public | P_mpp_true = k·G_true·φ_T |
| `P_mpp_ref_kW` | MPPT 目标功率 | kW | power | CONTROLLER | blind | P_mpp_ref = k·G_loop·φ_T；G_loop = G_meas（闭环）/ G_true（仅监测） |
| `P_pv_true_kW` | 阵列真实出力 | kW | power | MODEL_STATE | public | τ_mppt·dP_pv/dt + P_pv = P_mpp_ref |
| `P_pv_meas_kW` | 阵列测量功率 | kW | power | OBSERVATION | blind，noiseSigma 0.15 | P_pv,meas = P_pv,true（健康通道） |
| `P_pv_est_kW` | EMS 辐照度折算估计 | kW | power | DERIVED | blind | P_pv,est = k·G_meas·φ_T（恒用测量辐照度，不随模式切换） |
| `d_pv_kW` | MPPT 一致性残差 | kW | residual | DERIVED | blind | d_pv = P_pv,meas − P_pv,est（代数恒等，不是能量损失） |
| `P_ac_kW` | 逆变器交流出力 | kW | power | MODEL_STATE | public | P_ac = P_pv,true（理想逆变） |
| `P_grid_true_kW` | 馈线真实功率 | kW | power | MODEL_STATE | public | P_grid = P_load − P_pv,true（受电为正） |
| `P_grid_meas_kW` | 馈线测量功率 | kW | power | OBSERVATION | blind，noiseSigma 0.15 | P_grid,meas = P_grid,true（健康通道） |
| `P_load_demand_kW` | 负载需求功率 | kW | power | CONFIG | blind | P_load = 30 kW（恒定，无 load_step 族） |
| `P_load_served_kW` | 负载实际获得功率 | kW | power | MODEL_STATE | public | P_load,served = P_load,demand |
| `V_bus_V` | 等效母线电压 | V | power | MODEL_ASSUMPTION | blind，tableOnly | V_bus = 400 V（模型假设，非仿真状态） |
| `r_true_kW` | 真实功率平衡残差 | kW | residual | DERIVED | public | r_true = P_pv,true + P_grid,true − P_load,served ≡ 0 |
| `r_meas_kW` | 测量一致性残差 | kW | residual | DERIVED | blind | r_meas = P_pv,meas + P_grid,meas − P_load,served ≡ 0（全功率通道健康） |

无事件域 null 信号（对照 FL 的 I_bat_cap_A：本波两族均无 FAULT_EVENT 域限幅类信号；
bias_W_m2 全程有值 0/mag）。

**v1.0 修订（C-7）**：d_pv 定义注记原「（代数恒等，非能量损失）」改为「（代数恒等，
不是能量损失）」——「不是能量损失」为 copy-guard ALLOW 串（tools/copy-guard.mjs:33）；
「非能量损失」含禁词「能量损失」子串且不在 ALLOW 语境（§6.3 口径）。

### 1.3 方程登记（解析可算，全部闭式）

| id | 方程 | 说明 |
|---|---|---|
| EQ-PV-1 | G_true(t) = G0 − ΔG·1(t ≥ t0)；G_meas(t) = G_true(t) + b(t)，b(t) = b0·1(t ≥ t0)（仅 sensor_drift） | 输入与测量通道（t0 处右极限，post 采样行语义，同 fl001_oracle.py:103-108 口径） |
| EQ-PV-2 | P_mpp_true(t) = k·G_true(t)·φ_T；k = P_STC/G_STC = 10/1000 = **0.01 kW/(W/m²)**；φ_T = 1 + γ_T·(T_cell − 25)，T_cell ≡ 25 °C，γ_T = −0.004 /°C（登记常量，常温下 φ_T = 1 不激活） | 解析最大功率（L0 简化：无 I-V 曲线） |
| EQ-PV-3 | P_mpp_ref(t) = k·G_loop(t)·φ_T；G_loop = G_meas（closed_loop）/ G_true（monitor） | MPPT 目标；monitor 语义与 FL-001 同构（偏置不进入物理回路） |
| EQ-PV-4 | τ_mppt·dP_pv/dt + P_pv = P_mpp_ref，**τ_mppt = 1.0 s**，P_pv(0) = k·G0·φ_T（**v1.0 修订**，PV-DRAFT-Q2 定案/C-2：G0 取 EQ-PV-1 初始有效辐照度，W/m²、域 [300,1000]；G0=1000 时 P_pv(0)=10 kW，全部锚点不变——评审复算确认；G0<1000 时健康局启动瞬态消除）。t0 后闭式 P_pv(t) = P_ref(t0+) + (P_pv(t0−) − P_ref(t0+))·e^(−(t−t0)/τ) | MPPT 一阶跟随（分段常值目标，精确指数无离散误差——引擎 foStep 同构，gt001_oracle.py:97-101 先例；初值随 G0 配置见左列 v1.0 注） |
| EQ-PV-5 | P_ac = P_pv,true；P_grid = P_load − P_pv,true；P_load = 30 kW | 理想逆变与理想瞬时平衡（馈线补差，A-pv-ideal-feeder） |
| EQ-PV-6 | r_true ≡ 0；r_meas ≡ 0（定义恒等）；d_pv = P_pv,meas − P_pv,est = P_pv,true − k·G_meas·φ_T | 残差与一致性通道；sensor_drift 闭环稳态 d_pv → 0（故障被闭环吸收）、仅监测 d_pv ≡ −0.01·b；shading d_pv 瞬态 = (P_pv(t0−) − P_ref(t0+))·e^(−(t−t0)/τ) → 0 |
| EQ-PV-7 | E_x = ∫P_x dt（kW·s，÷3600 → kWh）；E_pv,est = ∫P_pv,est dt（事件感知解析积分）；ΔE_pv = E_pv,est − E_pv,true | 能量口径（本系统无 SOC——「SOC_est 通道」的功能位由 P_pv,est/ΔE_pv 承担，见 §3） |

### 1.4 assumptions 清单（提案，进 model.assumptions）

| id | text |
|---|---|
| A-pv-ideal-bus | 母线 400 V 等效理想，无电压/频率动态、无功与网损；等效母线是功率平衡抽象，不是电网模型。 |
| A-pv-ideal-inv | 逆变器理想功率传递（P_ac = P_dc），无开关动态、无效率曲线、无无功控制。 |
| A-pv-mppt-firstorder | MPPT 为行为级一阶跟随（τ_mppt = 1.0 s，教学尺度等效常数，非实测参数）。 |
| A-pv-mppt-est | MPPT 目标功率由辐照度测量通道解析计算（P_mpp_ref = k·G_meas·φ_T）；阵列按行为级受控功率源建模，不建模 I-V 工作点对目标超出理论最大功率的限制（正偏置闭环的真实出力可高于同辐照理论最大功率——该结构的直接推论，见 limitations）。 |
| A-pv-temp-const | 电池温度 T_cell ≡ 25 °C（STC 常温口径）；温度系数 γ_T = −0.004 /°C 登记为常量、常温下不激活；不建模温度动态与热平衡。 |
| A-pv-ideal-feeder | 电网馈线为理想双向平衡源：P_grid = P_load − P_pv，瞬时补差，无爬坡限制、无额定约束、无倒送约束。 |
| A-pv-const-load | 负载恒定 30 kW；PV-001 无 load_step 族（负载恒定是结构设定，不可调度电源的教学对照面）。 |
| A-pv-est-channel | P_pv,est 为 EMS 级辐照度折算估计，恒用测量辐照度 G_meas（不随运行模式切换）；d_pv 是测量链一致性残差（代数恒等），不是能量损失。 |
| A-pv-l0 | MPPT 控制为行为级闭环，不是经过验证的设备控制器。 |

### 1.5 未建模物理清单（进 model.limitations + UI 可查）

1. MPPT 扫描/扰动观察动态、追踪效率损失、多峰与**部分遮挡**空间分布（本模型遮挡为
   全平面均匀辐照度阶跃，非阵列局部遮挡）；
2. **温度系数激活**（T_cell 恒 25 °C，γ_T 不激活）、温度动态与热平衡；
3. **逆变器效率曲线**与开关动态、无功/电压控制、直流母线电容动态；
4. **I-V 曲线工作点约束**（阵列输出可高于同辐照理论最大功率——A-pv-mppt-est 声明的
   结构推论，见角点声明 §3.4）；
5. **孤岛保护**、低电压穿越、频率/电压穿越、防雷接地等并网保护面（无频率/电压概念）；
6. 云层/天气连续动态（仅阶跃输入）、季节与日出日落轨迹；
7. L0 行为级演示模型；非实测、非 Simulink、无实测对比（复用 FL-001 逐字句，
   systems.js:288，ALLOW 覆盖实证）。

### 1.6 机制定案与备选机制（评审裁定点 PV-DRAFT-Q1，已终裁）

**定案（终裁）**：MPPT 目标 = k·G_meas·φ_T（EQ-PV-3），阵列按受控源一阶跟随。**v1.0 修订**：
本机制经双路评审与用户批准确认为终裁（CHG-20261104-10：Q1=EQ-PV-3 机制，用户「统一采用
推荐决策」授权链），不再是「本草案提案」。推论：正偏置闭环下真实出力**高于**同辐照理论
最大功率（角点 2×，§3.4）——与 FL-001「控制器按错误测量反馈 → 真实电流偏移」同构，
教学链路最短。

**备选机制（评审记录：未采纳；v1.0 修订——以下为 v0.2 时点供评审裁定的历史记录，保留备查，
不实现、不再开放裁定）**：target = min(k·G_meas·φ_T, k·G_true·φ_T)——
正偏置被物理上限吸收（正偏置零真实效应、仅估计错），负偏置产生真实欠发。物理上更
保守（永不超 MPP），但：① 引入分段 min 非线性（仍解析）；② 正偏置场景闭环=仅监测
逐位同，失去「闭环吸收测量故障」教学点；③ 与 FL-001 的同构性减弱。v0.2 草案推荐
定案机制（即上文终裁机制），理由：L0 定位 + 假设/局限双声明 + 角点显式登记（FCEXT §1.4「电堆无功率
上限建模，2.75×基准」已批准先例）。v0.2 原文「评审若裁/min-cap 变体，§3 锚点须按 EQ-PV-3'
重推（复算脚本改一行分支，工作量 S）」——该重推条款随备选未采纳一并失效。

## 2. 故障族提案（2 族 + 1 登记不做候选，全部封闭参数域）

### 2.1 `G_sensor_bias`（family=sensor_drift，辐照度传感器偏置）

| 字段 | 提案 |
|---|---|
| 类型/作用位置 | 测量阶跃偏置 → sensor（辐照度传感器） |
| params | magnitude：偏置幅值，W/m²，min 20 / max 300 / step 10 / default **+100**，precision 0；help：「正偏置使 MPPT 高估辐照度，闭环下真实出力跟随测量值上升」 |
| defaultTime_s / timeRange | 20 / [2,55]（库口径） |
| closedLoopEffect | MPPT 目标由 10 kW 升至 k·(G0+b)（默认 11.00 kW），阵列 τ=1.0 s 跟随，馈线 20→19 kW；d_pv 瞬态 −1.00 kW 后归零（稳态自洽，测量冗余失效） |
| monitorEffect | 真实出力不变；G_meas 与 P_pv,est 跳变，d_pv ≡ −0.01·b = −1.00 kW，ΔE_pv = +0.0111 kWh（估计偏多） |
| causalTemplateId | pv-sensor-drift（§6.4） |

### 2.2 `shading_step`（family=shading_step，遮挡阶跃——load_step 类物理输入）

| 字段 | 提案 |
|---|---|
| 类型/作用位置 | 物理输入阶跃 → pv_array（辐照度骤降 ΔG） |
| params | magnitude：遮挡降幅，W/m²，min 50 / max 300 / step 25 / default **300**（G0 1000→700），precision 0；help：「有效辐照度阶跃下降，MPPT 重算目标，阵列一阶跟随；两模式同生效」 |
| defaultTime_s / timeRange | 20 / [2,55] |
| closedLoopEffect | 物理输入，与控制模式无关：P_mpp_ref 10→7 kW，阵列跟随，馈线 20→23 kW；d_pv 瞬态 +3.00 kW（估计先跳、真实滞后）后归零 |
| monitorEffect | 同闭环（物理输入，逐位同解——复算实证全序列最大差 0.00e+00，§3.3） |
| causalTemplateId | pv-shading-step（§6.4） |

**family 名裁定说明**：提案 `shading_step`（不复用 `load_step`）——作用位置与因果
方向不同（输入侧环境量 vs 负载侧需求量），目录登记独立族名避免 FL load_step（O-13
已删除）的字段混淆；引擎实现按「物理输入阶跃」同一模式复用 FC/GT load_step 轨语义。

### 2.3 登记不做的候选族（本波不提案、不实现）

`mppt_ref_offset`（MPPT 基准漂移，actuator 类）：P_mpp_ref = k·G_meas·φ_T × (1 + mag/100)，
域 [10,50]%，default 25%。**不做理由**：① 与 sensor_drift 的因果链重叠（同为测量→
目标→跟随，仅注入点在控制器内），教学增量低；② 本波两族已覆盖「测量通道故障」与
「物理输入故障」两个教学象限；③ 每增一族即增 oracle 解析段/自检/golden Run/UI 文案
面（FCEXT §4 工作量先例）。如 v0.7 后需补执行器类象限，另立 G2b 增补规格。

### 2.4 scope 提案

两族全部 **extension_preview**（新系统，SCOPE §8.2 治理）：scope.js `classify` 现状
（src/core/scope.js:42-83）对 systemId ≠ 'FL-001' 的配置 fall-through 至
`return ok ? 'approved_p0' : 'extension_preview'`（scope.js:82）——**PV-001 全场景
零改动即为 extension_preview**，SA-24 白名单（APPROVED.systemId='FL-001'，
scope.js:17-30）不动，assertApprovedP0 对 PV 配置抛 SCOPE-E01（scope.js:103-109）。
系统级白名单/升正式须未来显式 CHG（FC-001 升 approved_fc 的 CHG-20261030-12 先例）。

## 3. 验收锚点（解析预填，数值由 §3.3 复算独立计算；oracle emit 时冻结）

默认参数：G0=1000 W/m²、load=30 kW、T_cell=25 °C（φ_T=1）、k=0.01、τ_mppt=1.0 s、
t0=20 s、60 s 网格。容差提案列对标 FLEXT §1.3 形制。

### 3.1 场景 A：sensor_drift 闭环（b=+100 W/m²）

| 锚点（60 s） | 值 | 容差 | 复算依据 |
|---|---|---|---|
| `P_pv_true(60)` | **11.00 kW** | ±0.05 kW | 闭式 11 − 1·e^(−40)，e^(−40)=4.25e−18 低于 double 相对精度（≈2.4e−15），浮点恰为 11.0；逐步精确指数 10.999999999999991（差 8.9e−15） |
| `P_grid_true(60)` | **19.00 kW** | ±0.05 kW | 30 − 11 |
| `P_mpp_true(60)` | **10.00 kW** | ±0.05 kW | k·G0 = 10（真实辐照度未变） |
| `P_mpp_ref(60)` | **11.00 kW** | ±0.05 kW | k·(G0+b) = 11 |
| `d_pv(60)` | **0** | ≤1e-9 kW | 复算 −8.9e−15（闭环稳态自洽） |
| max\|d_pv\| | **1.00 kW @ t=20.0** | ±0.05 kW | \|P_pv(20.0) − P_pv,est(20.0)\| = \|10 − 11\|（估计先跳、真实滞后） |
| `r_true` / `r_meas` | ≡ 0 | ≤1e-12 kW | 复算逐点 max = 0.00e+00 |
| `E_pv_true(60)` | **0.1775 kWh** | ±0.0005 kWh | 10×20 + 11×40 − 1×1.0×(1−e^−40) = 639 kW·s = 639/3600（精确有理数） |
| `E_pv_est(60)` | **0.1777778 kWh** | ±0.0005 kWh | 10×20 + 11×40 = 640/3600 |
| `ΔE_pv(60)` | **+0.0002778 kWh** | ±0.0005 kWh | MPPT 滞后缺口 1 kW·s（估计按瞬时跳变、真实滞后 τ=1 s） |
| `E_grid(60)` | **0.3225 kWh** | ±0.0005 kWh | 1161/3600 = E_load − E_pv,true（定义恒等） |
| `E_load(60)` | **0.5 kWh** | ±0.0005 kWh | 30×60/3600 |
| `P_pv(20.1)` / `P_pv(21.0)` / `P_pv(26.0)` | 10.095163 / 10.632121 / 10.997521 | ±0.001 kW | 11 − e^(−0.1) / 11 − e^(−1.0) / 11 − e^(−6.0) |

### 3.2 场景 B：sensor_drift 仅监测（b=+100 W/m²）／场景 C：shading_step（ΔG=−300 W/m²，闭环=仅监测）

| 场景 | 锚点（60 s） | 值 | 容差 | 复算依据 |
|---|---|---|---|---|
| B | `P_pv_true(60)` | **10.00 kW**（全程恒定） | ±0.05 kW | monitor 偏置不进入物理回路 |
| B | `P_grid_true(60)` | **20.00 kW**（全程恒定） | ±0.05 kW | 30 − 10 |
| B | `d_pv(60)` | **−1.00 kW** | ±0.05 kW | 10 − 11（估计通道仍读测量辐照度） |
| B | `E_pv_true(60)` / `E_pv_est(60)` / `ΔE_pv` | 0.1666667 / 0.1777778 / **+0.0111111 kWh** | ±0.0005 kWh | 600 / 640 / 40 kW·s |
| C | `P_pv_true(60)` | **7.00 kW** | ±0.05 kW | 7 + 3·e^(−40) ≈ 7.0（复算 7.000000000000004） |
| C | `P_grid_true(60)` | **23.00 kW** | ±0.05 kW | 30 − 7 |
| C | max\|d_pv\| | **3.00 kW @ t=20.0** | ±0.05 kW | \|10 − 7\| |
| C | `d_pv(60)` | **0** | ≤1e-9 kW | 复算 4.4e−15 |
| C | `E_pv_true(60)` / `E_pv_est(60)` / `ΔE_pv` | 0.1341667 / 0.1333333 / **−0.0008333 kWh** | ±0.0005 kWh | 483 / 480 / −3 kW·s |
| C | `P_pv(21.0)` | 8.103638 | ±0.001 kW | 7 + 3·e^(−1.0) |
| C | 闭环 vs 仅监测 | **逐位同解** | 全序列最大差 0.00e+00 | 物理输入（复算实证，§3.3）；monitor Run 不重复入 golden（§4） |

### 3.3 恒等式、健康局与复算记录

- 健康局（H）：P_pv ≡ 10.00、P_grid ≡ 20.00、d_pv ≡ 0、E_pv,true = E_pv,est =
  0.1666667 kWh、E_grid = 0.3333333 kWh（复算逐点精确）。
- 判别性恒等：r_true ≡ 0、r_meas ≡ 0（全部场景逐点精确 0.00e+00——与 FL-001 的
  r_meas = 0.4·b 形成教学对照，§0）。
- **复算记录**：锚点数值由临时脚本 `pv001_recompute_tmp.py`（Python stdlib，
  `python -I` 运行）独立计算——事件感知闭式解与逐步精确指数（引擎 foStep 同构，
  400 步）双口径：P 通道最大差 8.9e−15、E 通道最大差 4.6e−13 kW·s（=1.3e−16 kWh）；
  shading 两模式全序列（10 通道 × 601 点）最大差 0.00e+00。脚本已按任务纪律删除，
  本节数值即其输出摘录；评审可按 §1.3 方程独立重推（闭式全部显式列出）。
  **v1.0 修订（C-2）**：EQ-PV-4 初值改为 P_pv(0)=k·G0·φ_T 后锚点面重冻结——默认
  G0=1000 下全部锚点数值不变（双路评审复算确认，§10 评审人 A 条件 2 处置），本节
  摘录数值继续有效。

### 3.4 包络与角点声明（UI 全域）

| 项 | 声明 | 依据 |
|---|---|---|
| P_pv,true 域 | [0, 13] kW（闭环偏置角点 k·(1000+300)=13.00） | 复算包络扫描 |
| P_grid 域 | **[−3, 45] kW**；倒送域 load < P_pv 时 P_grid < 0（load=10、G0=1000、b=+300 → −3 kW），馈线理想双向、倒送不建模约束 | 复算包络扫描 |
| 全遮断角点 | G0=300 ∧ ΔG=300 → G_true=0、P_pv=0、P_grid=P_load（≤45 kW）——合法角点，非越界 | UI 域 G0∈[300,1000] ∧ ΔG∈[50,300] ⇒ G_true ≥ 0 恒成立 |
| 正偏置超 MPP 角点 | G0=300、b=+300 → P_pv=6.00 kW = 同辐照理论最大功率 3.00 kW 的 **2 倍**——A-pv-mppt-est 结构推论，登记 limitations（§1.5 项 4） | 复算 |
| 手拼配置 | normalizeConfig 无跨参数校验（FL-001 同款先例 systems.js:290），手拼可致 G_true < 0 → 负出力（无物理意义）；**钳位方案为实现期决策点 PV-IMP-Q1**（engine 侧钳位 or UI 联动校验，二选一须记录） | scope/engine 现状核实 |

## 4. golden 计划（独立 oracle PV001_ORACLE；本波零改动，emit 入 v0.7 轮）

| # | 项 | 内容 |
|---|---|---|
| 1 | 独立 oracle | 新文件 `tools/oracle/pv001_oracle.py`（**本波不创建**——DEC-7 本波禁区不动 tools/oracle/**；v0.7 PV-G2b-03 执行）。独立性声明对标 fl001_oracle.py:1-10：不 import src/**、方程与常量唯一权威文本=本文档 §1.3（批准后），自含硬编码；自带自检 PS-1…PS-7；golden 由本 oracle 只读生成、engine 只读比对（G0-DEC-16）。机制层接入 oracle_base（resolve_run_spec / approval 三字段 / write_golden_with_sidecar——ORACLE_INTERFACE_D2 §2/§4，D-2a 契约） |
| 2 | Run 数提案 | **4 Run**：`healthy`（baseline）/ `closed_loop_fault`（sensor_drift +100 闭环）/ `monitor_only`（sensor_drift +100 仅监测）/ `shading_closed_loop`（shading −300 闭环）。**shading monitor 不重复入 golden**：两模式逐位同解已复算实证（§3.2/C 行；FLEXT §2 项 1 monitor-actuator 不重复先例） |
| 3 | self_check 提案 | PS-1 网格（601 点、t[i]=i·dt、单调）；PS-2 能量恒等 E_pv+E_grid=E_load（同测度 ≤1e-9 kW·s）；PS-3 r_true/r_meas 逐点 ≡ 0（≤1e-12）；PS-4 锚点复算（§3.1/§3.2 全表）；PS-5 shading 两模式逐位等价（≤1e-15）；PS-6 健康局不变量（P_pv≡10、d_pv≡0）；PS-7 无 NaN/Inf + UI 域包络抽查（P_grid ∈ [−3,45]） |
| 4 | SERIES_IDS | **['t'] + §1.2 表 17 信号 = 18 项**（**v1.0 修订**，C-4：golden series 惯例含 t 列，golden-compare.js:61-63 读 goldenRun.series.t 做网格校验；无事件域 null 信号，V-07 无 null 列特例） |
| 5 | 元数据（schema v2） | `golden_schema_version="v2"`（**新 golden 默认 v2**，ORACLE_INTERFACE_D2 §3.5 采纳规则）；`golden_id="pv001_v1"`；`model_id="PV-001"`；`model_version="1.0.0"`（三段式 v2 归一样式，F-7 遗留样式不重演）；`method_id="pv001_analytic"`；`engine_baseline=null`；`backend=null`（§3.4 留位）；`generated_by` 一段式（v2 收紧：不得 null 占位，§3.1）；**approval 三字段非 null 方可落盘**（§3.3 v2 收紧项）——首签引本规格批准 CHG（PV-G2b-02 评审后、PV-G2b-03 emit 时填） |
| 6 | 容差 tier | **T-A**（解析闭式 oracle vs 引擎精确指数同构；复算证据：差 ≤8.9e−15/4.6e−13，§3.3）。gate 块提案：`{tier:"T-A", E_kWh:1e-9, P_kW_rtol:1e-12, P_kW_atol:1e-15, d_pv_atol:1e-9, r_true_kW:1e-12, t_s:1e-9}`（形制对标 gt001_v2 tolerances.gate，gt001_oracle.py:469-474；T-A 跨实现散差超限时降 T-B 并登记——gt001 先例） |
| 7 | verify_golden | **run 级参数化成立**：按 golden.runs 遍历回查 oracle.RUNS，无硬编码 Run 清单（FCEXT §4 先例维持）。**系统级注册面为硬编码表（本草案勘正点）**：scripts/verify_golden.py:36-38 模块 import + :40-69 `MODELS` dict 按 golden id 硬编码——PV-001 须新增 `import pv001_oracle` + `MODELS["pv001"]` 注册行（scalars 提案：E_pv_true_kWh / E_pv_est_kWh / E_pv_err_kWh / E_grid_kWh / E_load_kWh；i_true/i_meas 映射提案：P_pv_true_kW / P_pv_meas_kW）。该注册扩展是**显式工作面（PV-G2b-03）**，任何「新系统零改动 verify_golden」的表述不成立；改动限于注册表追加，不改参数化逻辑 |
| 8 | 预期失效面 | 新增 `data/golden/pv001_v1.json`(+`.sha256`)；**既有 4 golden 字节零变更**（本波零重出维持；v0.7 轮 PV-001 新增不触既有文件）；verify_golden 注册行新增后其 --all 路径覆盖 pv001；tests/registry.test.js 哈希为 per-Run config（:58-160），不因新增系统破坏；UI 枚举点 home.js:21/292/649、arena.js:96-97 为 v0.7 实现面（§8 步骤 4） |

## 5. scope 与治理登记

- 系统级：PV-001 = **extension_preview**（新系统，§2.4；GT-001 同位先例，FAULT_CATALOG §3）。
- 族级：两族均 extension_preview，无白名单挂载；SA-24（scope.js APPROVED）零改动；
  classify 零改动（fall-through 现状即正确语义，scope.js:82）。
- Arena 盲测池（**v1.0 修订**，C-1 勘正定案 + DEC-2 显式排除裁定）：勘正——PV-001 注册进
  systems.js 后**默认进入 Arena 系统清单与族池**（arena.js:88-99 `systemList()` 首选
  `api.systems.list()`——systems.js 全注册表，硬编码枚举仅 fallback；`familyPool` 按
  arena-protocol.js:180-186 故障目录派生）；v0.2 原文「Arena 页面系统清单为硬编码枚举、
  PV-001 默认不入池、入池须显式改动」与代码行为相反，据此订正（§11 C-1，A/B 双路同汇）。
  **裁定（DEC-2 采纳推荐 (a)）**：**显式排除**——arena.js `systemList()` 过滤 PV-001 +
  守卫注释，列为 PV-G2b-04 显式工作面（§8）；入池延后至 exposure 三值映射验证轮，
  届时须显式 CHG 并同步 blind_observable 通道面裁定。
- 验收路径：P0 验收（assertApprovedP0）、approved_fc 分支、golden 比对三路径对 PV-001
  均关闭（scope.js:94-111 抛 SCOPE-E01）；本规格批准不自动打开任何验收路径——
  打开须 schema v2 approval 首签 + verify_golden 注册 + 显式 CHG（§4 项 5/7）。

## 6. 教学定位与 UI 措辞提案

### 6.1 层级标签与互补性

- 层级标签：`L0 · 行为级演示模型`（与 FL/FC 同字面；非 L0b——无频率/惯量概念，
  GT-001 的 L0b 标签语义不适用）。
- 与 FL-001 互补性话术（系统卡/首页）：「FL-001 演示可调度储能的测量反馈回路；
  PV-001 演示不可调度电源的输入估计通道——同一个理想平衡源结构，故障藏在不同的
  通道里」。互补点三则：① 可调度 vs 不可调度（有无 load→controller 边）；② SOC
  能量通道 vs 能量账本通道（ΔE_pv 替代 SOC_est 功能位，§1.3 EQ-PV-7）；③ 故障在
  功率测量链（r_meas≠0）vs 输入估计链（r_meas≡0、d_pv 承载特征）。

### 6.2 文案提案（实现期入 systems.js，逐句禁词预检见 §6.3）

| 字段 | 提案文案 |
|---|---|
| tagline | 「在 20 秒注入 +100 W/m² 辐照度测量偏置，看 MPPT 如何把测量偏差变成真实出力偏移。光伏 L0 行为演示，不含电化学/气象/效率模型。」 |
| summary | 「光伏阵列经 MPPT 与理想逆变器接入 400 V 等效母线，与理想平衡馈线共同为 30 kW 恒定负载供电；MPPT 按辐照度测量通道解析计算目标功率，阵列一阶跟随。」 |
| grid 组件 description | 「理想平衡功率馈线，瞬时吸收/补齐母线剩余功率；初始 20 kW 仅用于展示，不代表真实电网侧动态。」 |
| mppt 组件 description | 「行为级一阶跟随（τ=1.0 s）：按测量辐照度解析计算目标功率；不是经过验证的设备控制器。」 |
| limitations 追加 | 「L0 行为级演示模型；非实测、非 Simulink、无实测对比。」（FL-001 逐字句复用） |

### 6.3 三禁词/全库 33 模式自查表（实现期 node tools/copy-guard.mjs 终检）

copy-guard 33 模式为**全库禁词**、扫 src/**（tools/copy-guard.mjs:15 SCOPES=['src']），
对 PV 文案同库适用（FCEXT §5 口径）。提案文案逐句预检结果：

| 提案串 | 高危子串核查 | 结论 |
|---|---|---|
| §6.2 全部 5 串 | 无「机组动态验证/电网稳定验证/一次调频验证/惯量验证/实测/已验证/校准/能量损失/检出率/误报率/诊断算法/置信度/逐位一致/第三方认证/防篡改/公证/sealed/工业级/工业真实/已证明/验证通过/已通过验证/…」命中；「不是经过验证的设备控制器」为 FLEXT §1.2 评审人 B F5 先例句式（「经过验证」不含禁词「已验证」子串） | 0 命中 |
| A-pv-mppt-firstorder/est/l0（§1.4） | 同上；「非实测参数」含 ALLOW 串「非实测」（copy-guard 先剔除 ALLOW 再匹配，tools/copy-guard.mjs:47） | 0 命中 |
| limitations §1.5 项 7 | 「非实测、非 Simulink、无实测对比」三项均 ALLOW 串（'非实测'/'无实测对比'），且该句现已在库（systems.js:288）基线 PASS | 0 命中 |
| 残差类文案（d_pv/r_meas 定义） | 一律用「是测量通道误差/一致性的代数恒等，**不是能量损失**」句式（ALLOW 串「不是能量损失」；G0-DEC-13/UI_COPY_GUARDRAILS §3.3 口径） | 0 命中 |

I-5 专项：全部文案不含「并网/母线/馈线」与「稳定/验证」的邻接组合；「电网馈线」
组件 label 与 §6.2 description 已显式声明「不代表真实电网侧动态」。

**v1.0 修订（C-7）**：§1.2 d_pv 定义注记已按上表「残差类文案」行口径落改
（「非能量损失」→「不是能量损失」，ALLOW 串）；本节预检口径在 v1.0 无变化。

### 6.4 因果模板提案（实现期入 FL001.causalTemplates 同层）

- `pv-sensor-drift`（闭环链 n1…n6）：n1 偏置注入（config，bias_W_m2）→ n2 G_meas
  跳变 1000→1100（observation）→ n3 MPPT 目标按测量值重算 P_mpp_ref 10→11 kW
  （mechanism，EQ-PV-3）→ n4 阵列真实出力 10→11 kW、τ=1.0 s 跟随（observation）→
  n5 馈线补偿 20→19 kW（observation）→ n6 一致性残差 d_pv（kind='algebraic_identity'：
  闭环瞬态 −1.00 kW 后归零、稳态 0——测量冗余在稳态对被闭环吸收的偏置不敏感；
  r_meas ≡ 0 与 FL-001 的 +4 kW 对照）。monitorNodes m1…m5：真实出力不变、
  d_pv ≡ −0.01·b、ΔE_pv = +0.0111 kWh（估计偏多）。
- `pv-shading-step`（n1…n6）：n1 物理输入阶跃 G_true 1000→700（config）→ n2 两模式
  同生效（mechanism）→ n3 MPPT 目标 10→7 kW → n4 阵列跟随 → n5 馈线 20→23 kW →
  n6 d_pv 瞬态 +3.00→0（估计先跳、真实滞后，代数恒等口径同 n6 上）。

## 7. G2b 进入条件五项自查表（SCOPE_SPLIT_MEMO §8.2）

| # | 进入条件 | 状态（**v1.0 修订**，C-5：开口项订正为 ②与④，现随批准全部闭合） |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：PV-001 为新系统，无 GT/FC 式遗留缺陷清单（SCOPE §2 处置表不含 PV）；触发项 = V06_ROADMAP §2 B-1 行 + DEC-2（本波草案即交付物）。无未关闭遗留项 |
| ② | 独立 golden | **已闭合（偏离授权闭合）**：**v1.0 修订（C-5）**——golden 后置系 V070 DEC-3 授权的显式偏离，本轮（CHG-20261104-10）闭合；§4 独立 PV001_ORACLE 计划就绪（不复用 FL/FC/GT 公式常量，独立自检 PS-1…7），4 Run，schema v2，T-A，emit 于 v0.7 PV-G2b-03 执行 |
| ③ | UI 措辞与未建模物理清单 | **就绪**：§1.5 未建模物理 7 项 + §6 措辞提案与 33 模式预检 + I-5 专项声明 |
| ④ | 用户书面批准 | **已闭合**：**v1.0 修订（C-5）**——用户书面批准随 CHG-20261104-10（V070_WAVE_DESIGN，用户「统一采用推荐决策」授权链）于 2026-11-04 登记，PV-G2b-02 闭合 |
| ⑤ | CHG 登记 | **已闭合**：**v1.0 修订（C-5，随 ④ 闭合）**——起草授权 CHG-20261104-08（V06_ROADMAP v1）+ 批准 CHG-20261104-10 均已登记 |

## 8. 实现排期提案（PV-G2b-01…04）

> 与 FLEXT §6 编号语义的差异说明：FLEXT 先例中「oracle 编写+golden emit」先于评审轮
> （其 golden 已存在仅扩 Run）；PV-001 为全新系统，且 DEC-7 本波禁区不动 tools/oracle/**
> 与 data/golden/**——故评审（S6，本波 v0.6.1）先行，oracle/golden 与实现同为 v0.7 轮。

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| PV-G2b-01 | 锚点解析预填 + 独立复算冻结（§3；临时脚本双口径交叉，评审可独立重推）+ **v1.0 修订**：条件修订 C-1…C-7 落正文（PV-DRAFT-Q1/Q2 定案、更名 APPROVED） | S | **已完成**（本草案 v0.1/v0.2 + v1.0 条件修订，2026-11-04） |
| PV-G2b-02 | 双路独立评审（物理 A：机制/锚点/包络复算核对；治理 B：SCOPE §8.2 五项/copy-guard 口径/预期失效面/排期）+ 结论登记 §10 + **用户书面批准（DEC-2）**；批准 CHG 登记 | M | **已完成**（**v1.0 修订**：2026-11-04，PASS_WITH_CONDITIONS ×2（§10）+ 用户批准登记 CHG-20261104-10） |
| PV-G2b-03 | oracle 编写（pv001_oracle.py，oracle_base 接入，PS-1…7）+ pv001_v1 emit（4 Run，schema v2，approval 首签）+ verify_golden MODELS 注册行 + FAULT_CATALOG 增 PV-001 节（§0 时间尺度声明沿用）+ UNIT_DICT 增 W/m²（**v1.0 修订**，C-3/C-6：schema.js:19-23 字典，消费点 bundle.js:329-332/protocol.js:206——已由本波 T3 执行） | M | v0.7（依赖 02 批准——**已满足**，CHG-20261104-10） |
| PV-G2b-04 | 实现：systems.js PV001 SystemDef（§1 全量）+ engine simulatePV001 新轨（**engine.js:1421-1423 分派链现为 else→GT001 兜底，必须显式插 PV 分支**，三系统物理面零触碰）+ 因果模板 + UI 接线（home.js:21/292/649 系统卡、六页适配）+ tests/engine-pv.test.js（含 A/B/C 锚点断言 + shading 两模式逐位等价断言）+ scope 零改动核对 + **回归面增列（v1.0 修订，C-1/C-6）**：Arena systemList 显式排除过滤 + 守卫注释（§5 裁定）、scenario.js 编排白名单自动派生核对（PV 族随 systems.js 目录入编排，DEC-6）、exposure 三值映射裁定（d_pv 等信号盲包可见性——Arena 入池延后至此轮验证）+ PV-IMP-Q1 钳位裁定 + run-g2 步数账裁定（I-7：新增步数须入预算，v0.7 预算另定） | L | v0.7（依赖 03） |

## 9. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | 正偏置闭环「真实出力超理论最大功率」被误读为物理错误（GT §3 教训） | A-pv-mppt-est + limitations 双声明 + 角点 2× 显式登记（§3.4）+ 备选机制裁定点 PV-DRAFT-Q1（§1.6）——FCEXT §1.4「电堆无功率上限建模 2.75×」已批准先例 |
| R-2 | I-5 措辞红线：并网/馈线文案滑向电网稳定类表述 | §6.3 全库 33 模式预检 0 命中 + I-5 专项声明（§0）+ 实现期 copy-guard 终检（run-g2 步兜底） |
| R-3 | 「新系统零改动 verify_golden」误读导致 PV-G2b-03 漏注册 | §4 项 7 勘正：注册面硬编码（verify_golden.py:36-69），注册行列为显式工作面 |
| R-4 | engine 分派 else 兜底吞掉 PV-001（静默走 GT 物理） | §8 PV-G2b-04 点名 engine.js:1421-1423 显式分支 + tests/engine-pv.test.js 锚点断言（GT 轨数值与 PV 锚点不同，断言即守卫） |
| R-5 | 手拼配置 G_true < 0 负出力 | §3.4 声明 + PV-IMP-Q1 钳位裁定（实现期决策点，不静默） |
| R-6 | 倒送域（P_grid < 0）被误读为模型缺陷 | §3.4 域声明「理想双向、倒送不建模约束」+ limitations 登记 |
| R-7 | 步数账膨胀（I-7）：PV 测试/golden 步入 run-g2 | §8 PV-G2b-04 归口 v0.7 预算裁定；本波零接线（DEC-7） |
| R-8 | 初值键面差异（initial 无 SOC_pct）破坏共享校验/UI 假设 | PV-G2b-04 核对 schema.js/normalizeConfig 对 initial 键面的容错；如需系统级键面分支，登记实现决策点 |

## 10. 评审记录（**v0.2 时点记录**，2026-11-04，双路独立上下文；v1.0 修订：本节保留为历史记录，条件结论已按 §11 处置落入正文）

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | 锚点全量独立复算（三场景+健康局+包络+角点，闭式/逐步双口径）、方程自洽、族差异化、golden 计划 | **PASS_WITH_CONDITIONS** | 锚点逐项复现（含闭式 11.0、逐步 10.999999999999991、两模式 0 差、闭式差 ≤8.9e-15）；4 条件：Arena 断言反向、EQ-PV-4 初值 G0 耦合、W/m² 单位缺字典、SERIES_IDS 缺 t 列 |
| 评审人 B（治理/口径/回归面） | G2b 进入条件、scope 落地路径、33 模式文案、golden 治理、DEC-2/7 一致性 | **PASS_WITH_CONDITIONS** | scope/classify/批准流程/文案/golden 治理属实；5 条件：Arena 结论修正、§7 自查表 ②⑤ 开口、PV-G2b-03/04 回归面增列、「非能量损失」措辞、golden 后置偏离显式登记 |
| 用户批准（DEC-2） | 待 | — | 本表为用户裁定输入 |

## 11. 条件处置追记（**v0.2 时点记录**，2026-11-04；v1.0 修订：C-1…C-7 已全部落入正文——
落点 C-1→§5/§8、C-2→§1.3/§3.3、C-3→§8、C-4→§4 项 4、C-5→§7、C-6→§8、C-7→§1.2/§6.3；本节保留为历史记录）

| # | 条件（来源） | 处置 |
|---|---|---|
| C-1 | **Arena 断言勘正（A/B 同汇）**：arena.js:88-99 systemList() 首选 api.systems.list()（systems.js 全注册表），硬编码仅 fallback；familyPool（arena-protocol.js:180-186）按目录派生——**PV-001 注册进 systems.js 后默认进入 Arena 系统清单与族池**，草案原文「默认不入池、入池须显式改动」与代码行为相反，本追记订正 | 处置二选一登记为 PV-G2b-04 显式工作面：(a) 显式排除（UI 过滤或协议守卫）+ CHG；(b) 经用户裁定接受入池并同步 blind_observable 通道面。推荐 (a)——新系统入池宜与 G2b 批准同轮显式裁定 |
| C-2 | **EQ-PV-4 初值与 G0 域耦合（A）**：P_pv(0)=10 kW 固定而 G0∈[300,1000] 可配，G0<1000 时健康局出现未声明启动瞬态（复算：G0=300 时 P_pv 衰减至 3 kW，t=5s 仍 3.047 kW）；推荐 P_pv(0)=k·G0·φ_T（G0=1000 时全部锚点不变，已复算确认） | 登记 **PV-DRAFT-Q2** 决策点，推荐采 P_pv(0)=k·G0·φ_T；批准前修订进规格 §1.3/§3.3 并重冻结锚点面（锚点值本身不变） |
| C-3 | **单位字典缺口（A）**：schema.js:19-23 UNIT_DICT 不含 W/m²，validateSignalCatalog（schema.js:79-81）抛 CN-E02，消费点 bundle.js:329-332/protocol.js:206——§1.2 三个 W/m² 信号实现期将被拒 | 登记 PV-G2b-03 实现面：UNIT_DICT 扩展 W/m² + schema 测试适配（schema.js 不在 DEC-7 禁区） |
| C-4 | **SERIES_IDS 须含 t 列（A）**：golden series 惯例含 t（fl001_v1 实测），golden-compare.js:61-63 读 goldenRun.series.t 做网格校验 | 本追记订正 §4 项 4 口径：SERIES_IDS = ['t'] + 17 信号（18 项） |
| C-5 | **§7 自查表修正（B）**：② 独立 golden 与 ⑤ CHG 登记同为开口（golden 后置系 DEC-7 驱动的对 SCOPE §8.2 ② 字面顺序的偏离），④ 非唯一开口 | 本追记订正：开口项=②（golden 后置，显式偏离登记于此）与④（用户批准）；⑤ 随批准轮 CHG 闭合 |
| C-6 | **PV-G2b-03/04 回归面增列（B）**：scenario.js 编排白名单裁定（PV-001 族入编排目录，DEC-6）、UNIT_DICT/UNITS 增 W/m²、§1.2 exposure 契约三值映射（含 d_pv 等信号盲包可见性裁定） | 追记进 PV-G2b-03/04 工作面（§8 排期随 v0.2 生效） |
| C-7 | **措辞（B）**：§1.2:87「非能量损失」不在 copy-guard ALLOW 语境，改为「不是能量损失」（ALLOW 串）或登记落地换算规则 | 登记 PV-G2b-01 修订项（批准前随 C-2 一并修订） |

**v0.2 状态（v0.2 时点记录，v1.0 修订标注）**：仍为 `DRAFT`——双路评审通过（含条件），条件处置已登记；**待用户书面批准（DEC-2）**。
批准后：PV-G2b-01（条件修订进规格正文）→ PV-G2b-02（批准登记）→ PV-G2b-03（oracle+golden，v0.7）→
PV-G2b-04（实现，v0.7）。〔**v1.0 修订**：此链已执行至 PV-G2b-02——条件修订即本 v1.0，批准=CHG-20261104-10（2026-11-04）；PV-G2b-03/04 入 v0.7。〕

---

**文件结束**。PV001_G2B_SPEC_APPROVED v1.0（2026-11-04，CHG-20261104-10；曾用名 PV001_G2B_SPEC_DRAFT——
B-1 起草人起草 v0.1 + 双路评审记录与条件处置追记 v0.2，时点待用户书面批准（DEC-2），见 §10/§11 历史记录）。
**v1.0 修订**：C-1…C-7 定案落正文，状态 `APPROVED`，PV-G2b-01（含条件修订）/PV-G2b-02 闭合，
PV-G2b-03/04 入 v0.7。本规格批准不自动打开验收路径（§5）；golden/代码工件仍按 §8 排期产出。
