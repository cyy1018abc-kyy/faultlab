# FC001_ELECTROCHEM_G2B_SPEC_DRAFT — FC-001 电化学 V-I 极化 + 电堆温度 G2b 物理规格（DRAFT v0.1）

> **任务**：A-5 P1 FC 电化学 G2b 草案起草（V110_WAVE_DESIGN §2 阶段一 W2；CHG-20261108-04
> §5②「A-5 三提案 v1.0 后逐步 G2b」承接；A5_MULTIPHYSICS_EXPLORATION §4 提案三的兑现评估）。
> **授权**：V110_WAVE_DESIGN v1（CHG-20261110-01，2026-11-10 批准，DEC-1…8 全采推荐项）
> §1 DEC-3：「P1 FC G2b 草案轮入本波（电化学 V-I 极化曲线 + T_st 新 ODE 状态；electrochem_model:
> off|on 默认 off；新 golden fc001_v2 预登记；A-4c 自写 ODE 主路径沿袭、PyBaMM 不引入）……
> 本波只到 P1 草案+双路评审」。
> **状态**：`DRAFT v0.1（2026-11-11）——待双路独立评审 + 用户书面批准`。批准与实现随用户
> 裁定（V110 DEC-3 框架；沿 PV/GT-L1/FLTH/MG 四轮「草案波 → 批准轮」节奏）。
> **本草案无批准效力**：EQ-FCEC 方程/常量/更新序/锚点数值一律**未冻结**（冻结权在批准轮
> FCECH-G2b-02 + 用户书面批准——ALINE_MODEL_DEPTH_DESIGN §1.2 第三行「新增状态变量/新物理
> （方程集扩展）→ 完整 G2b」）；验收路径禁入直至批准 + emit；本文全部为**草案级提案（非权威
> 文本）**，批准轮修订落正文后方为 oracle/引擎唯一权威文本（FLTH §2 v1.0 定案句式）。
> **前置与先例**：FC-001 现为纯 L0（systems.js:401-619——A-const-v 线性 `P_fc = 0.4×I`
> :583、电堆一阶跟随 EQ-2 :603、分配器 EQ-6 :607、tagline 自述「不含电化学/效率/健康模型」
> :406；golden fc001_v1：v1 面、5 Run、T-解析、在验——V1_FACES 面② 实测表）；L1 深化制度
> 先例 = FL001_THERMAL_G2B_SPEC_APPROVED v1.0（thermal_model 单键 / RK4 dt0.01 / T-B /
> oracle_base 出生接入 / 新段自检 / 01…04 排期）与 GTL1_G2B_SPEC_APPROVED v1.0；G2b 结构
> 体例先例 = MG001_G2B_SPEC_APPROVED v1.0（§0-§11）；治理依据 = SCOPE_SPLIT_MEMO §8.2。
> **A-4c 沿袭声明（V072_WAVE_DESIGN §1 DEC-3，:52-60）**：自写 ODE（stdlib）为 FC 电化学
> 主路径；PyBaMM 不引入（含后端侧）——**含可撤销条款**（:60「用户可随时撤销改采 PyBaMM
> 后端侧」，撤销则 P1 地位重评，登记不预设）；本轨无对照轨（FLTH §5「无对照轨」声明形态）。
> **Q-4 三守卫适用**：新方程集（EQ-FCEC）入引擎须走 G2b（即本文档流程）；许可证自研零依赖
> （RK4/foStep stdlib 自写，无 PyBaMM/TESPy 类依赖）；验收路径禁入直至批准。
> **本草案纪律符合性（V110 §0）**：golden 零变更（既有 golden 字节冻结——本稿只引用不
> emit）；零新仿真轨（engine.js/systems.js/scenario.js/scope.js/tools/oracle/**/data/golden/**
> 全链只读引用、零触碰）；零第三方依赖（I-1）；文案红线自查（本稿在 FaultLab-evaluation/**，
> 不在 copy-guard 扫描域 tools/copy-guard.mjs:15 `SCOPES=['src']` 内，提案文案仍按 §6.3 预检）。
> **行号基准说明**：本文档行号引用为**起草时点（2026-11-11，V110 并发波树上）实读值**——
> 本波 W1/W3…W9 并发落地后 src/** 与 tools/run-g2.mjs 行号会漂移；实现轮（FCECH-G2b-03/04）
> 以**语义锚点**（信号 id/检查 id/函数名/键名/族 id）为准定位，行号仅作评审快速索引
> （A5 头部「行号基准说明」同款）。

---

## 0. 本草案边界（做/不做）

- **做（本草案 = 规格提案面）**：模型形态（`electrochem_model: off|on` 单键）、EQ-FCEC-1…7
  方程集草案级结构、参数面（符号/单位/域/整定依据——数值精确值标「批准轮定案」）、
  场景/哈希涟漪登记、锚点与包络**结构**预填（数值留批准轮）、oracle/golden 计划、
  scope.js:44-45 classify 二选一核心裁定点（Q1）、排期 FCECH-G2b-01…04、风险表、Q 点 Q1…Q8。
- **不做（本草案显式排除）**：
  1. **L2 不做**：CFD/FEA/多体动力学维持不做（V05_ROADMAP §6 :169 / V06_ROADMAP §6 :116 /
     ALINE §12 :300 三处原文引用维持——A5 §6 全量确认，本轨不重引不放松）；
  2. **PyBaMM 不做**：不引入（含后端侧）——V072 DEC-3（:54/:57）沿袭 + 可撤销条款（:60）
     引用维持；无对照轨（A-4c 已裁；旁证算例轨如未来需要另立规格——FLTH §5 句式）；
  3. **不定实现**：本草案零代码/golden/oracle 触碰；EQ-FCEC 为草案级示意，批准轮冻结前
     不得作为实现依据（I-4）；
  4. 不定 P2/P3 时点（A5 §5 优先级为相对工作量与治理成本排序、非工期承诺——G0-DEC-15
     句式）；不动任何既有裁定（A-4c/SOC 定义不动/SA-24/APPROVED 常量语义零触碰——
     Q1 为显式裁定**请求**，非既成事实，批准留待用户）；
  5. **本轮不动清单**：`tools/oracle/**` 全部零触碰（新 oracle 于 FCECH-G2b-03 才创建）；
     `data/golden/` 既有文件字节冻结零变更；engine.js/systems.js/scenario.js/scope.js
     零改动（均为实现轮显式工作面）；不引入第三方依赖（I-1）。
- **FC-001 现状基线（2026-11-11 实读登记）**：纯 L0 单轨——恒压等效（A-const-v :583）+
  电堆电流一阶跟随（τ_fc=1.2 s，EQ-2）+ 功率分配器一阶跟随（τ_ref=2.5 s，EQ-6）+ SOC
  积分（EQ-5）+ 残差定义恒等（EQ-4）；无热面、无电化学面；oracle 自检 SC-1…SC-10
  （fc001_oracle.py 实读：SC-8 load_step 锚点 / SC-9 actuator 锚点 / SC-10 级联尾差域
  声明 ≤6e-6）；fc001_v1 5 Run = healthy / closed_loop_fault / monitor_only /
  load_step_closed_loop / actuator_closed_loop（fc001_oracle.py:126-138 实读）；FC-001 在
  approved_fc 验收路径（scope.js:44-51 四族条件）与 Arena 盲测池（arena.js:99 实读——
  MG-001 入列为本波 W7 面，FC 入池现状不变）；verify_golden `MODELS["fc001"]` 注册行
  （scripts/verify_golden.py:101-102 实读）；run-g2 现状 33 步全量（run-g2.mjs:4 实读；
  V110 DEC-5 批准本波 33→35，MG 两步落地后为 35）。

## 1. 模型形态

### 1.1 配置键形态与默认轨（沿 thermal_model / inertia_model additive 单键先例）

- **单键枚举 `electrochem_model: "off" | "on"`，默认 off**：FC-001 defaults 新键
  （systems.js:417-421 defaults 面新增；盖章沿 systems.js:142 `thermal_model: 'off'`
  normalizeConfig 先例同构新行）；engine 分派 = simulateFC001 顶部 early-return
  （engine.js FLTH/GT thermo 分支先例同构——FLTH §2.0），**off 路径现状全量代码逐字不动**。
- **默认 off 理由（FLTH §2.0 四理由逐条适用）**：① approved_fc 验收链与 fc001_v1 冻结
  锚点保持解析精度口径；② T-解析（off）/ T-B（on）容差制度分轨；③ 跨深度对比经 scenario
  显式钉轨达成，不依赖默认翻转；④ FC 在 Arena 盲测池，默认 off ⇒ 盲包 config 指纹/观测
  语义零变化。未来翻转（off→on）须显式 CHG（FLTH-IMP-Q3 同款登记不预设）。
- **层级表达与 golden 映射**：off ⇔ L0（现 level 标签零改动）；on ⇔ L1（变体提案 §1.6）；
  cfg 单值与 golden id 一一映射：off→fc001_v1、on→fc001_v2（FLTH §2.0 同构）。

### 1.2 层级判定（ALINE §1.1 判据对照）与 L1-lite 诚实注

| ALINE §1.1 L1 判据 | 本提案对应 | 满足声明 |
|---|---|---|
| 新物理状态变量 | 电堆温度 **T_st** 新动态状态（单节点集总热容 ODE，EQ-FCEC-3） | ✔ 1 个动态温度状态 |
| 方程不可手解 | 极化链为非线性代数（对数项）+ T_st RHS 经 P_loss,stack(T_st) 温度反馈——全局无闭式 | ✔ **on 域替换线性恒压口径**（P=0.4×I → V_stack·I）为本轨「新物理」主面 |
| 需专用积分器 | RK4 固定步长 dt0.01（stdlib 自写），与 L0 精确指数/级联 foStep 积分面实质区别 | ✔ 沿 GT-L1/FLTH 制度 |
| golden 由独立数值 oracle 生成 | 新文件独立 RK4 oracle（命名 Q2，§4 项 2） | ✔ 非「逐算子闭式复刻」路线 |

**L1-lite 诚实注**（FLTH §1.1 句式）：单状态、非高维/刚性——但三判据成立且含非线性
代数链新物理，按 ALINE §1.2 第三行走完整 G2b；水管理/气体扩散/双电层/老化衰减等扩展
登记不做（§1.6，A5 §7 定位维持）。

### 1.3 状态向量与新物理量表（诚实区分 ODE 状态与代数量——I-2）

RK4 状态向量 **y_rk4 = [T_st]**（1 维新增）；I_fc/I_fc_ref **保留 L0 更新序**（精确指数
foStep / load_step·actuator 级联子步递推——fc001_oracle.py 数值口径逐字保留，非 RK4 状态，
不依赖 T_st——§3.2 电气面逐位同的结构原因）。

| 量 | 类型 | 信号 id 提案 | 单位 | 定义 | sourceKind/exposure 提案 |
|---|---|---|---|---|---|
| I_fc | L0 状态（保留） | I_fc_true_A（复用） | A | EQ-1/EQ-2 原样 | L0 既有不变 |
| **T_st** | **ODE 状态（新）** | T_st_K | K | EQ-FCEC-3；T_st(0)=T_amb=298.15 K | MODEL_STATE → public_demo |
| **V_stack** | 代数（新） | V_stack_V | V | EQ-FCEC-1 | MODEL_STATE → public_demo |
| **P_loss,stack** | 代数（新） | P_loss_stack_kW | kW | EQ-FCEC-4 | DERIVED → public_demo |
| P_fc | 定义式 on 域替换 | P_fc_true_kW（复用） | kW | EQ-FCEC-2 | L0 既有不变 |
| r_true / r_meas | 残差（定义恒等扩展） | 复用 | kW | EQ-FCEC-7 | L0 既有不变 |

**盲包面裁定（GTL1 §1.2 B-1 先例）**：三个新信号全非盲显、不设 blindVisible；**off 轨
全程 null**（makeSeries 按 SystemDef.signals 建列——GT/FL null 列先例）；不入 blind 投影。
单位字典零缺口（K 已入表 GT C-3、V 既有 V_bus_V——批准轮 emit 核对）。

### 1.4 方程登记（EQ-FCEC-1…7，**草案级示意——非权威文本，批准轮冻结**）

| id | 方程（草案级） | 说明 |
|---|---|---|
| EQ-FCEC-1 | V_stack(I, T_st) = E0(T_st) − c_act·ln(1 + I/I_0) − R_ohm(T_st)·I − c_conc·ln(I_lim/(I_lim − I)) | **V-I 极化链（三损失项）**：活化对数近似 + 欧姆 + 浓差（A5 §4.1 草案示意扩浓差项——形态 Q4）；函数形态/常量/有效域/单调性域批准轮冻结；I < I_lim 值域硬条件（§3.3）；V_stack 为电堆集总等效端电压（非单池——A-fcec-polarization） |
| EQ-FCEC-2 | on 域：P_fc,true = V_stack·I_fc/1000（kW）；off 域：P_fc = 0.4·I_fc 原样 | 电堆功率换算（on 域**替换** EQ-3 前半 A-const-v 电堆半边；EQ-3 off 域逐字保留） |
| EQ-FCEC-3 | C_st·dT_st/dt = P_loss,stack − h_st·(T_st − T_amb)，T_st(0) = T_amb = 298.15 K | 电堆单节点集总热平衡 ODE（**复用 FLTH EQ-FLTH-4 形态**——A5 §4.1）；牛顿冷却、冷启动假设 |
| EQ-FCEC-4 | P_loss,stack = (E0(T_st) − V_stack)·I/1000 | **热损失口径（Q3）**：按构造 = 三损失项×电流（E0 在差分中相消、零新增常数）；备选独立热力学电势 E_th(T_st) 拆分——Q3 裁定 |
| EQ-FCEC-5 | E0(T_st) = E0_ref + k_E·(T_st − T_ref)，T_ref = 298.15 K | E0 温度面（线性示意；k_E 符号域批准轮登记） |
| EQ-FCEC-6 | R_ohm(T_st) = R_ohm0·(1 + α_ohm·(T_st − T_ref)) | 欧姆电阻温度面（FLTH EQ-FLTH-2 同构线性式示意；正温度反馈项——稳定性条件 §3.3） |
| EQ-FCEC-7 | 电气面保留：EQ-1/EQ-2/EQ-5/EQ-6 原样（测量链/控制面零升级）；r_true := P_fc,true + P_bat,true − P_load ≡ 0；**r_meas := 0.4·b + (0.4 − V_stack/1000)·I_fc**（Q5 口径）；off 域退化 r_meas = 0.4·b | r_true 按构造恒等（P_bat = P_load − P_fc,true 理想平衡源口径不变）；r_meas 扩展恒等的第二项为**恒压测量口径偏差项**（模型已知结构项、非测量故障——Q5） |

**守恒面声明（零 FLTH-Q1 类裁定需求——登记为结构差异）**：热损失为电堆**内部记账**
（化学能未单独入母线账），母线恒等式 P_fc + P_bat ≡ P_load 按构造维持、E_fc + E_bat ≡
E_load 维持——与 FLTH Q1 的结构性差异：FL 侧损耗发生在「登记功率 0.4·I 已入母线账」的
支路须裁定补偿去向（方案 (a) 发电机补偿）；FC 侧 P_fc 本身即极化后端电压功率，无缺口项、
无补偿裁定面。**A-const-v 假设分域**：电池半边（P_bat 换算 0.4 kV）on 域保留、电堆半边
on 域被极化链替代——assumption 文本分域登记沿 FLTH「【仅 …适用】」句式（§1.6）。

### 1.5 参数面（**教学整定值——数值精确常数一律「批准轮定案」，本稿零编造**）

| 常量 | 单位 | 域（登记） | 含义 / 整定依据 | 性质 |
|---|---|---|---|---|
| E0_ref | V | > 0；与工作点整定/单调性域联合定案（批准轮） | 参考可逆电势（电堆集总） | 教学整定值，非实测——批准轮定案 |
| k_E | V/K | 符号域批准轮登记 | E0 温度系数（EQ-FCEC-5） | 教学整定值——批准轮定案 |
| I_0 | A | > 0（批准轮） | 活化损失特征电流 | 教学整定值——批准轮定案 |
| c_act | V | > 0（批准轮） | 活化过电位尺度 | 教学整定值——批准轮定案 |
| R_ohm0 | Ω | > 0（批准轮） | 参考欧姆电阻 | 教学整定值——批准轮定案 |
| α_ohm | 1/K | ≥ 0（负值即负温度反馈，登记不采） | 欧姆电阻温度系数（稳定性条件面） | 教学整定值——批准轮定案 |
| c_conc | V | > 0（批准轮） | 浓差损失尺度（Q4） | 教学整定值——批准轮定案 |
| I_lim | A | **> 137.5 A 域硬条件**（注册域最大电流——FCEXT §1.4 极端角点实读） | 浓差极限电流（EQ-FCEC-1 值域） | 教学整定值——批准轮定案 |
| C_st | J/K | > 0；稳定性条件内（§3.3） | 电堆集总热容 | 教学整定值——批准轮定案 |
| h_st | W/K | > 0；h_st > α_ohm·R_ohm0·I²/1000（注册域，§3.3） | 牛顿冷却系数 | 教学整定值——批准轮定案 |
| T_amb | K | 298.15 | 环境温度常数，T_st(0) = T_amb | 登记常量（FLTH 同款） |
| DT_INT | s | 0.01 | RK4 子步步长（6000 子步/60 s） | 库口径 |

**整定依据三声明（批准轮整定时的冻结依据）**：① **参考工作点复现铭牌**——V_stack(50 A,
T_st(0)) = 400 V（Q5 推荐：healthy 局 P_fc(50)=20 kW 复现 L0 基准 + r_meas 口径偏差项归零）；
② **60 s 窗内 T_st 轨可见性**（FLTH A-flth-params「60 s 演示窗内温升路径可见」句式）；
③ **单调性域 dV/dI < 0 于注册域全域**（防非物理多解——A5 §4.4 ④，域扫描 emit 硬条件，
§3.3）。非设备参数辨识声明（A-fcec-params）。

### 1.6 assumptions / limitations / UI 措辞（草案级提案——批准轮正文落定）

| id | text（草案级） |
|---|---|
| A-fcec-polarization | 【仅 electrochem_model=on 适用】电堆端电压按三损失项极化链（EQ-FCEC-1）计算，为电堆集总等效（非单池、无水管理/气体扩散/双电层动态）。 |
| A-fcec-params | 【仅 electrochem_model=on 适用】全部极化/热参数为教学整定值（非实测参数）：按参考工作点复现铭牌（V_stack(50 A, T_st(0)) = 400 V）与 60 s 窗内温度轨可见性整定，不对应任何真实 PEMFC 电堆参数辨识。 |
| A-fcec-heat | 【仅 electrochem_model=on 适用】电堆热为内部记账：P_loss,stack = (E0 − V_stack)·I/1000 进 T_st ODE；母线恒等式 P_fc + P_bat ≡ P_load 按构造维持；热损失是模型记账项，不是能量损失。 |
| A-fcec-dispatch | 【仅 electrochem_model=on 适用】功率分配器换算维持 0.4 kV 名义电压（EQ-6 原样——控制器不感知 V_stack，行为级控制器口径）；分配目标与电堆实际功率之差由电池缓冲吸收（理想平衡源口径不变）。 |
| A-fcec-meas | 【仅 electrochem_model=on 适用】测量换算维持铭牌恒压口径（P_fc,meas = 0.4·I_meas）；r_meas 定义恒等扩展含恒压口径偏差项（Q5）——口径偏差是模型已知结构项，不是测量故障。 |
| A-fcec-l1 | 【仅 electrochem_model=on 适用】电化学-热模型为教学尺度单节点集总示意（L1-lite），不是经过验证的设备控制器或电堆电化学模型。 |

limitations 追加（on 域，4 项）：① 水管理/气体扩散/双电层/寿命衰减未建模（现 limitation
第 1 条「不含电堆热管理、水管理、气体扩散与寿命衰减」分域化改写——off 域原文保留）；
② 浓差域外（I ≥ I_lim）行为未定义——域守卫/钳位为实现轮裁定面（登记不静默）；③ 无热
保护（高温降额/热失控——FLTH §6.1 项 7 同款）；④ 单节点集总热（无堆内温度分布）。
UI 变体提案：on = 「L1 · 电堆极化与单节点热（数值仿真级）」；summary 追加「电堆按极化
曲线出力、损耗热加热电堆（模型记账口径）」；定位句「教学尺度电化学-热集总示意（L1-lite），
非机组/电网动态验证」——全部预检见 §6.3。

## 2. 场景/事件族影响面（零新事件族预期 + scenario 新键 additive 登记）

| 面 | 登记内容 |
|---|---|
| 事件族 | **零新事件族**：sensor_drift / load_step / actuator_fault 三族定义、参数域、defaultTime、因果模板全部零变更——on 轨仅物理响应面变化（同故障 L0↔L1 跨深度对比 = 教学点，ALINE §6.4 固定句式） |
| scenario 新键 | EVENT_KEYS（scenario.js:41）additive 新键 `electrochem_model` + 枚举常量 ELECTROCHEM_MODELS = ['off','on']（:45 INERTIA_MODELS / :49 THERMAL_MODELS 同构新增）+ 系统守卫 declaresElectrochem 派生（:362 declaresInertia / :382 declaresThermal 同构——2026-11-11 实读）；缺省解析为系统默认轨（= off）；**schema v1 白名单扩展须显式 CHG**（FLTH §2.4 / GTL1 B-2 先例——面③ additive） |
| 哈希面 | **既有合法输入零变化**——新键只影响使用它的输入（V1_FACES 面③「不在承诺内」条款 + §3.4 additive 边界）；使用该键的新输入 scenarioHash/run_hash 含解析轨值（registry.test.js per-Run 哈希核查 = 实现轮面） |
| 事件快照 | 零扩展（T_st/V_stack 不入事件快照——FLTH §3.6 最小集声明同款） |
| 盲包 | FC 在盲测池；默认 off ⇒ 盲包语义零变化；新信号不入池显式声明；未来盲包钉 on 须同轮 Arena 锁定面裁定（登记不预设——FLTH R-9 同款） |
| 契约面 additive 通道（V1_FACES 八面冻结下核对） | 面① defaults/信号/assumptions additive；面② 新 golden 新 id；面③ 新事件键 additive；面⑥ Q1 联动白名单扩张声明；面⑦ 步数账实现轮申报；面⑧ 词表如需增词 additive——**零 breaking 预期**（既有 golden 零触碰 / 既有哈希零变化 / 既有 run-g2 步判据零翻转，§3.4 三条逐一对照） |

## 3. 锚点与包络预填（off 轨硬条件逐位；on 轨给结构、数值留批准轮）

### 3.1 off 轨零变化硬条件（三层佐证体例沿 FLTH §3.3）

1. **代码结构佐证**（起草时点实读）：src/** 无任何 electrochem 入口（本稿起草未触代码）；
   FC 分派链现状即 off 轨全量代码路径；
2. **数值佐证**：fc001_v1 5 Run 冻结 golden 在验（V-07 逐点比对随 run-g2 fc001 步——33 步
   现状实读）；fc001_oracle SC-1…10 全过为 emit 现状；
3. **实现轮零变化判据（FCECH-G2b-04 验收项）**：off 轨 run_hash 逐位不变；T_st_K /
   V_stack_V / P_loss_stack_kW 三列 off 轨全程 null；既有引擎/FC 测试断言零改动通过；
4. **预期失效面（非「变化」，登记）**：SystemDef.signals +3 ⇒ 信号目录 / manifest
   model_hash / tests/registry.test.js per-Run 哈希面更新（GT/FL 先例同款）；fc001_v1
   golden 比对面零变化（golden 无新列，额外 null 列不进比对）。

### 3.2 on 轨锚点结构（**数值一律「批准轮复算 / emit 冻结」——本稿零数值预填声明**）

健康局结构表（字段预登记，值待批准轮）：

| 锚点 | 口径 | 值 | 判据形态 |
|---|---|---|---|
| T_st(0) | = T_amb（冷启动） | 298.15 K（登记常量） | 精确值 |
| T_st(60) | 健康局温升轨终值 | 批准轮复算 | 单调升 + 60 s 可见性整定（§1.5 ②） |
| T_ss 渐近 | EQ-FCEC-3 令 dT/dt=0 | 批准轮（闭式随 EQ-FCEC 冻结推导） | 稳态闭式抽查 |
| V_stack(50, T_st(0)) | 参考工作点 | **400 V（Q5 整定依据推荐）** | 铭牌复现 |
| P_fc(50) | 健康局 | 20.0 kW（V_stack(50)=400 V 时按构造复现 L0 基准） | 与 fc001_v1 healthy 相容 |
| P_loss_stack(0) | 健康局 | 批准轮 | = 三损失项×50 A/1000（EQ-FCEC-4） |
| 电气面（I_fc/SOC/E_bat） | — | **与 L0 逐位同** | 精确恒等（结构推论：I_fc 更新序不依赖 T_st——FLTH §3.2「电气面逐位同」同款） |

同故障分歧预期表（L0 值 = fc001_v1 冻结锚点 I_fc(60) = 40/75/27.5 A（FCEXT §1.3/§2.3）×
0.4 kW/A 算术换算——非新预填；L1 on 方向为 Q5 整定 + 单调性域下的**结构推论**，数值批准轮复算）：

| 场景 | 量 | L0 off（fc001_v1 冻结） | L1 on（方向登记） | 分歧机理 → 教学点 |
|---|---|---|---|---|
| sensor_drift +10 | P_fc(60) | 16.000 kW | **> 16 kW**（V_stack(40) > 400 V） | I 降 → V_stack 沿极化链回升 → P_fc 跌幅小于线性——L0 线性不可见的非线性格点 |
| 同 | r_meas | max 4.0（= 0.4·b） | 0.4·b + (0.4 − V_stack/1000)·I 口径偏差项（healthy 局为零——Q5） | 「测量偏差 + 恒压口径偏差」双成分残差——「+4 kW 是测量偏差，不是能量损失」教学点的 FC on 域变体 |
| 同 | T_st 轨 | —（无热面） | 降温恢复轨方向（损耗随 I 下降） | 热惯性过冲方向/量级批准轮复算（FLTH §3.2 形态同构） |
| load_step +10 | P_fc(60) | 30.000 kW | **< 30 kW**（V_stack(75) < 400 V） | I 升 → 极化压降增大——非线性爬升 |
| actuator 55% | P_fc(60) | 11.000 kW | **> 11 kW**（V_stack(27.5) > 400 V） | 钳位点沿极化链电压回升 |
| monitor 轨 | T_st 全序列 | — | 与 healthy 轨**逐点恒等**（b 不进物理回路） | FLTH FL-6 同构判据（FEC 自检预案） |

### 3.3 包络与角点（结构——数值批准轮域扫描；域扫描为 emit 硬条件）

| 项 | 声明 |
|---|---|
| I_lim 域硬条件 | I_lim > 137.5 A（load0=45 + load_step +20 极端角点电流——FCEXT §1.4 实读）；I ≥ I_lim 时 EQ-FCEC-1 浓差对数域破坏（NaN/非物理）——域守卫/钳位为实现轮裁定面（FC-IMP 登记，不静默——MG-IMP-Q1 同款） |
| 稳定性条件形态 | h_st > ∂P_loss,stack/∂T_st；草案级结构推论：P_loss,stack = [c_act·ln(1+I/I_0) + R_ohm(T_st)·I + c_conc·ln(I_lim/(I_lim−I))]·I/1000 中唯一温度依赖项为 R_ohm 线性项 ⇒ ∂/∂T_st = α_ohm·R_ohm0·I²/1000（FLTH「h > I²R0α」同构形态）——闭式与注册域全量复扫 = 批准轮推导 + emit 硬条件（A5 §4.4 ④） |
| ±25 kW 包络重推 | P_bat 包络声明在 on 域按极化链重推（P_fc 非线性——角点全量复扫 emit 硬条件，A5 §4.3 登记面兑现）；「不得实现为全域硬检查」裁定（FCEXT §1.4）在 on 域适用性批准轮复核 |
| load0=45 角点 | I→87.5 A 工作点的 V_stack/P_fc/T_st 稳态——批准轮复算；无热保护动作局限沿袭（§1.6 ③） |
| 手拼配置 | normalizeConfig 不新增钳位（最小集预期——批准轮确认）；越域后果经 limitations 声明 |

## 4. golden 计划（fc001_v2 · 独立 oracle · oracle_base 出生接入 · 旧 golden 留档；本草案轮零改动——emit = FCECH-G2b-03 批准后）

| # | 项 | 内容 |
|---|---|---|
| 1 | 新 id 判据 | golden_id = **fc001_v2**——方程集扩展超出已批 FCEXT §1/§2 与 CONTRACT §5.2 面（ALINE §1.2 第三行）→ 模型/方法变更 → 新 id（ORACLE_INTERFACE_D2 §3.1）；保 id 重出不适用（非引擎行为零变更原地扩容）；supersedes 链 v2→v1 |
| 2 | 独立 oracle | 新文件——命名 **Q2**（推荐 `tools/oracle/fc001_l1_oracle.py`，备选 fc001_echem_oracle.py——理由见 Q2）。独立性声明（fl001_l1/gt001_l1 先例）：不 import src/**、不 import fc001_oracle、方程与常量唯一权威文本 = 本规格批准文本、Python stdlib（`python -I`）、自含硬编码；**出生即 oracle_base 接入**（六成员 + resolve_run_spec + write_golden_with_sidecar LF 钉死 + approval_block 三字段非 null 方可落盘 + SERIES_IDS 模块常量含 "t" 列）；golden 由本 oracle 只读生成、engine 只读比对（G0-DEC-16） |
| 3 | 数值方法 | **T_st**：经典 RK4 dt0.01（沿 GT-L1/FLTH 制度；RHS 内 I_fc 冻结于子步起点值——FLTH Q2 定案口径同构推荐，备选登记）；**I_fc/I_fc_ref**：保留 fc001_oracle 子步递推级联复刻（foStep 逐字——fc001_oracle.py 头注「按子步递推复刻引擎级联更新序」口径同源，engine.js:780-790 级联结构）；**I 冻结口径下 T_st ODE 子步内为线性常系数 ODE**（P_loss,stack 对 T_st 线性——EQ-FCEC-4/6 结构推论）⇒ RK4 vs 子步解析交叉证据面成立（FLTH FL-7 同构） |
| 4 | 自检预案 | 新段 **FEC-1…n（Q8 推荐）**：FEC-1 环境校验（fc001_v1 5 Run 标量逐位复现 ≤1e-9）；FEC-2 恒等式（r_true ≡ 0 / E_fc + E_bat ≡ E_load on 域逐点）；FEC-3 极化链单调性域抽查（dV/dI < 0 注册域全域）；FEC-4 网格与事件相位（601 点、t[i]=i·dt、pre/post 语义）；FEC-5 锚点全表复算（§3.2 终值）；FEC-6 monitor 热面恒等（T_st 与 healthy 逐点同）；FEC-7 半步长自收敛登记 + RK4 vs 子步内解析指数交叉（判据按双实现实测散差 ×≥10 且下限 ≥1e-9 冻结制——FLTH A-2 同款）；FEC-8 无 NaN/Inf + 包络抽查（I_lim/稳定性裕度断言） |
| 5 | Run 集（Q6） | 推荐**镜像 fc001_v1 全集 5 Run、全部 electrochem_model=on**：healthy / closed_loop_fault / monitor_only / load_step_closed_loop / actuator_closed_loop（fc001_oracle.py RUNS :126-138 实读）；镜像判据（FLTH §4 项 4 / GT v3 镜像 6 Run 先例：新 id golden 镜像基线全集）；备选最小集不推荐——Q6 |
| 6 | 元数据（schema v2） | golden_schema_version="v2"；golden_id="fc001_v2"；model_id="fc.pem.l0"；**model_version = Q1 联动**（候选 B：'1.1.0' 维持仅登记；候选 A：'1.2.0'）；method_id 提案 "fc001_l1_polarization_rk4_dt0.01"（fl001_thermal_rk4_dt0.01 句式先例）；engine_baseline=null；backend=null（留位）；electrochem_model:"on" 入 config 块（fl001_v2 thermal_model 先例）；supersedes="fc001_v1（L0 轨 electrochem_model=off，字节冻结留档）"；units 零新增预期；approval 三字段非 null 首签引批准 CHG；**SERIES_IDS 终值以 fc001_v1 golden series 键集实读 + 3 新信号核对为准（FCECH-G2b-03 核对面，本稿不预断）**。另登记：fc001_v1 工件元数据失同步遗留（FCEXT §4 基座勘误——工件 model_version=1.0.0 vs CHG-20261030-12 记录 1.1.0）**不在本轨兑现面**（fc001_v1 字节冻结维持；如需落齐走独立重出 CHG，与本轨零关联声明） |
| 7 | 容差 tier（Q7） | **T-B 推荐**（同法 RK4、独立双实现——ALINE §3；T_st 温度反馈非线性 ODE 无全局闭式 + 跨语言 bit-exact 无依据）；gate 块键面预案（T_K_atol / P_kW / V 类新后缀 / I_A / E_kWh / SOC_pp / r_true_kW / t_s——量级预案非终值，按双实现实测散差 × 安全系数 ≥10 于 emit 冻结）；**gate 键面 × verify_golden T-B 分派分支对齐缺口清单 = FCECH-G2b-03 显式工作面**（_V 后缀路由现状须实测核对——FLTH A-4④/B-3 同构纪律，本稿不预断分支现状）；超限降 T-C 并必附 convergence 块（双向预案） |
| 8 | verify_golden | 注册面为硬编码表（verify_golden.py MODELS dict——MODELS["fc001"] :101-102 实读）：新增 `import fc001_l1_oracle` + `MODELS["fc001_l1"]` 注册行（fl001_l1/gt001_l1 双 golden 并验结构镜像——V1_FACES 面②）；提案 i_true="I_fc_true_A" / i_meas="I_fc_meas_A"（沿 MODELS["fc001"] 现行映射）；scalars 面增 T_st_end_K / V_stack_end_V / P_loss_stack_end_kW 等；**MODELS["fc001"] 继续验 fc001_v1 零改动**（默认 off ⇒ 不重指向——FLTH §4 项 7 同构） |
| 9 | 预期失效面 | 新增 `data/golden/fc001_v2.json`(+`.sha256`)；既有 golden（8 份；V110 波 mg001_v1 收口后 9 份）**字节零变更**；engine-fc.test.js on 轨变体**并入现有步**；registry.test.js 哈希面（scenario 键使用时）；FAULT_CATALOG §5 注记行（FC 电化学轨）；信号目录/manifest model_hash；UI 层级徽章变体 |
| 10 | 两门禁面（FLTH B-2 同构） | ① engine↔fc001_v2 T-B 比对面 = verify_golden fc001_l1 全轨 + engine-fc.test.js on 轨关键值断言；② **on 轨 approved_fc 验收路由：cfg.electrochem_model→golden 分派 off→fc001_v1 / on→fc001_v2**——fc001_v2 emit verify 通过前 on 轨不进 approved_fc 验收路径（不静默）；acceptance.keyValues 现值显式声明为 off 轨（fc001_v1）专用冻结锚点，on 轨 keyValues 由 fc001_v2 golden 承载、systems.js acceptance 面按 cfg 分域（FLTH A-3② 同构） |

## 5. G2b 排期与串行节奏（三阶段；与 P2/P3 串行引用）

1. **三阶段**：FCECH-G2b-01 本草案（V110 W2，2026-11-11）→ **FCECH-G2b-02 双路独立评审 +
   用户书面批准**（批准留待用户——沿 PV/GT-L1/FLTH/MG 四轮「草案波 → 批准轮」节奏；单波
   至多一项 G2b 草案轮——A5 §7 结论 3）→ FCECH-G2b-03（oracle + fc001_v2 emit）/ 04（实现）
   随批准轮裁定时点（工作面分解 §8）。
2. **与 P2/P3 串行节奏（V110 DEC-3 / A5 §5 引用，登记为跨轨排期约束、非工期承诺）**：
   **P2 FL（fl001_v3）排 P1 落地一个发布周期后**，且须显式重开「SOC 定义不动」裁定
   （A5 §2.2——批准留待用户）；**P3 GT（gt001_v4）草案可与 P1/P2 并行起草、实现严格串行**；
   本轨（P1）实现 = 串行链首环——P1 未落地前 P2 不启动批准、P3 不启动实现。
3. **实现时点**：随批准轮裁定（V110 DEC-3 未预裁——本草案登记候选时点面 = 批准后首个
   实现波，由用户逐版本指令派发，I-4）。

## 6. 红线自查

### 6.1 I-1…I-5 逐条

| # | 红线 | 自查结论 |
|---|---|---|
| I-1 | 零第三方依赖 | PyBaMM 不引入（含后端侧——V072 DEC-3 :54 沿袭；**可撤销条款** :60 登记：撤销则 P1 地位重评，不预设）；RK4/foStep stdlib 自写；oracle stdlib（python -I） |
| I-2 | 数据诚实性 | 代数量不冒称 ODE 状态（V_stack/R_ohm/P_loss,stack 代数、I_fc 保留 L0 更新序——§1.3）；参数全表「教学整定值非实测」+ 数值「批准轮定案」（§1.5——零编造物理常数）；L1-lite 诚实注（§1.2）；分歧方向仅定性结构推论、量级标「批准轮复算」（§3.2） |
| I-3 | 证据链 | 独立 oracle 新文件（不 import src/** / fc001_oracle）+ golden 只读生成（G0-DEC-16）+ off 轨逐位硬条件（§3.1）+ 域扫描 emit 硬条件（单调性/稳定性/I_lim——§3.3） |
| I-4 | 批准纪律 | 本草案无批准效力；验收路径禁入直至 FCECH-G2b-02 用户书面批准 + fc001_v2 emit verify 通过（两门禁面 §4 项 10）；实现须用户逐版本指令派发 |
| I-5 | 措辞红线 | 「模型深度导致的表达力差异」固定句式（ALINE §6.4——禁「更准确/更真实/工业级」）；P_loss_stack 叙事固定「是模型记账项，不是能量损失」句式（ALLOW 串）；定位句带「非机组/电网动态验证」；极化/热叙事全部带「教学整定/行为级」限定语（§6.3 预检表） |

### 6.2 核心裁定点：scope.js:44-45 classify 硬校验二选一（Q1——批准轮必答）

**现状实读**：scope.js:44-45 FC 分支硬校验 `modelId === 'fc.pem.l0' ∧ modelVersion ===
'1.1.0'`——与 FL 相反（FL classify 不消费 modelVersion，scope.js:20 `'fl001.1'` 维持
「不校验、仅登记」，FLTH §4 项 5 B-1 已评审核实）。若 on 轨走 model_version 升位，on 轨
归档场次将被 classify 判为 extension_preview（A5 §4.2 涟漪登记）——须二选一并显式 CHG：

| 项 | 候选 A：model_version 升位 + 硬校验放宽 | 候选 B：cfg 键分域（FL 先例形态） |
|---|---|---|
| 形态 | on 轨走新 model_version（如 1.2.0——GT 1.1.0→1.2.0 / FL B-1 归一先例）；scope.js:45 等式放宽为域校验（枚举 {'1.1.0','1.2.0'} 或版本域） | 同 modelId 'fc.pem.l0' + modelVersion 维持（仅登记）；轨语义由 cfg 键 electrochem_model 承载；cfg→golden 分派 off→fc001_v1 / on→fc001_v2（§4 项 10） |
| scope.js 面 | FC 分支修改——引入 FC 分支专属**第三种校验形态**（FL 逐值不校验 / FL 前缀白名单之外的新形态）+ 显式 CHG（面⑥白名单扩张声明） | **classify 结构零改动**（现 FC 分支不检查 cfg 键——on/off 配置同过既有四族条件）；CHG 仍须显式登记（见下行共同面） |
| SystemDef 落点 | SystemDef model_version 为**静态元数据、off/on 双轨共用单字段**——「on 轨 1.2.0」无静态落点，须引擎运行时派生（涟漪 M 级：manifest/哈希/存档元数据面波及） | 零落点需求（model_version 仅登记） |
| golden 元数据 | fc001_v2 model_version=1.2.0 与 fc001_v1 并存两版本 | fc001_v2 model_version='1.1.0' 同值——golden 语义由 golden_id 承载（ORACLE_INTERFACE_D2 §3.1 正交性） |
| 先例 | 无「同 SystemDef 双版本静态落点」先例；升位伴随 scope 白名单扩展为 GT 先例（但 GT 为新轨新 golden 并重指向） | **FLTH B-1（不校验仅登记）+ B-2（cfg→golden 分派两门禁面）双先例已评审核实** |

**推荐候选 B**，理由：① 制度复用成本最低（双先例直接套用）；② 面⑥冻结面零触碰、校验
形态零新增（候选 A 的新形态须专项评审）；③ SystemDef 单字段静态性使候选 A 须引擎派生
model_version（涟漪升级 + 哈希面波及，与 additive 边界紧张）；④ golden 语义由 golden_id
承载，model_version 双值并存反增追溯面。
**显式 CHG 面（两候选共同）**：① scenario EVENT_KEYS 新键 + declaresElectrochem 守卫
（面③ additive——FLTH §2.4 / GTL1 B-2 先例）；② on 轨配置进 approved_fc 条件面 = 白名单
扩张声明（面⑥ additive——「既有 Run 的分类永不静默改判」确认）；③ cfg→golden 分派两门禁
面（§4 项 10）；④ scope.js 若有任何触碰（候选 A 必然、候选 B 预期零触碰）逐行登记。

### 6.3 copy-guard 预查（实现期 `node tools/copy-guard.mjs` 终检；体例沿 FLTH §6.3）

| 提案串 | 高危子串核查 | 结论 |
|---|---|---|
| on 层级标签「L1 · 电堆极化与单节点热（数值仿真级）」 | 无禁词命中预期 | 0 命中预期 |
| A-fcec-params「教学整定值（非实测参数）」 | 「非实测」为 ALLOW 串（先剔 ALLOW 再匹配——copy-guard 次序纪律） | 0 命中预期 |
| P_loss_stack 定义「热损失功率（模型记账项）」+「不是能量损失」 | 「不是能量损失」为 ALLOW 串（残差/损耗类文案一律此句式——G0-DEC-13 口径） | 0 命中预期 |
| 定位句「教学尺度电化学-热集总示意（L1-lite），非机组/电网动态验证」 | 「非机组/电网动态验证」为 ALLOW 串 | 0 命中预期 |
| 跨深度对比卡「模型深度导致的表达力差异」 | ALINE §6.4 固定句式 | 0 命中预期 |
| A-fcec-l1「不是经过验证的设备控制器或电堆电化学模型」 | 「经过验证」不含禁词「已验证」子串（FLEXT §1.2 F5 先例句式） | 0 命中预期 |

（本稿在 FaultLab-evaluation/** 不扫描；实现轮文案迁入 src/** 前逐句预检 + copy-guard
终检双保险。）

## 7. G2b 进入条件五项自查表（SCOPE_SPLIT_MEMO §8.2）

| # | 进入条件 | 状态 |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：FC 无遗留缺陷清单（FCEXT G2b 已闭合 load_step/actuator 冻结解除；SCOPE §2 处置表无 FC 未关闭项）；本轨触发项 = A5 §4 提案 + V110 §1 DEC-3（本草案即交付物） |
| ② | 独立 golden | **计划就绪（未产出）**：§4 fc001_v2 / fc001_l1_oracle（命名 Q2）/ 5 Run（Q6）/ schema v2 / T-B（Q7）。golden 后置系 V110 §0「只到草案+双路评审」授权的字面偏离**显式登记**（GTL1 §7.1 ② / FLTH §7.1 ② / MG001 §7 ② 先例同款）；emit = FCECH-G2b-03（批准后），落地并 verify 通过后本项闭合 |
| ③ | UI 措辞与未建模物理清单 | **就绪（草案级）**：§1.6 assumptions 6 条 + limitations 追加 4 项 + §6.3 预检表（实现轮正文落定 + 终检） |
| ④ | 用户书面批准 | **未闭合**：待 FCECH-G2b-02 双路独立评审 + 用户书面批准（本草案不构成批准——V110 DEC-3 口径） |
| ⑤ | CHG 登记 | 起草授权 CHG-20261110-01（V110 §2 W2）已登记；批准 CHG 待批准轮登记（编号随彼时波次证据面预留） |

## 8. 实现排期提案（FCECH-G2b-01…04——MG-G2b 同构四步）

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| FCECH-G2b-01 | 键面/EQ-FCEC 草案级结构/参数面/涟漪登记/锚点结构预填/classify 二选一裁定点 + 本草案 v0.1 | M | **已完成**（V110 波 W2，2026-11-11） |
| FCECH-G2b-02 | 双路独立评审（物理 A：EQ-FCEC 自洽与量纲/极化链单调性域/热平衡与守恒面/r_meas 扩展口径/稳定性条件推导/锚点复算/L1 判据对照；治理 B：五项条件/Q1…Q8 裁定/classify 二选一/copy-guard/golden 治理与 verify_golden 注册面/不动清单/步数账/契约面 additive 核对）+ **用户书面批准** + 批准 CHG（规格更名 APPROVED、条件落正文、Q 点定案落正文——PV001 §11 体例） | M | 下一波（批准留待用户） |
| FCECH-G2b-03 | oracle 编写（fc001_l1_oracle.py——命名 Q2：oracle_base 出生接入 + RK4/级联复刻 + FEC 自检 + T-B 容差实测冻结/降 T-C 预案 + 域扫描 emit 硬条件）+ fc001_v2 emit（Run 集 Q6、schema v2、approval 首签、sidecar LF 钉死）+ verify_golden `MODELS["fc001_l1"]` 注册行 + T-B 分派分支对齐实测（gate 键面 × 后缀路由——FLTH A-4④/B-3 同构工作面）+ FAULT_CATALOG §5 注记行 | M | 批准后（时点随批准轮裁定） |
| FCECH-G2b-04 | 实现：engine simulateFC001 电化学分支（early-return 先例同构，off 路径逐字不动）+ systems.js（defaults 键 + 3 新信号 + A-fcec-* 6 条 + limitations 分域化 + level/summary 变体 + model_version Q1 联动落点 + normalizeConfig 盖章行）+ scenario EVENT_KEYS/守卫派生（显式 CHG）+ checks.js FC 分支 on 域适配 + acceptance.keyValues 分域（FLTH A-3② 同构）+ 两门禁面（cfg→golden 分派，§4 项 10）+ UI（inspector/跨深度对比卡/因果模板变体——零新事件族，模板为既有三族变体节点）+ tests engine-fc 变体并入现有步 + off 轨 run_hash 逐位验收 + copy-guard 终检 + **步数账 CHG 申报（I-7：0 新步预期——并入现有步；确需新增按彼时步账显式申报）** | L | 批准后（依赖 03；P2/P3 串行约束见 §5） |

## 9. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | 极化链常量整定失当（注册域非单调 / 工作点偏离铭牌过大 / 分歧方向与教学叙事不符） | 域扫描 emit 硬条件（单调性/稳定性/I_lim——§3.3）+ Q5 参考工作点整定依据 + FEC-3/FEC-5 自检；批准轮物理评审专项 |
| R-2 | 浓差域越界（I ≥ I_lim → 对数域破坏 NaN/非物理） | I_lim > 137.5 A 域硬条件（FCEXT §1.4 极端角点）+ 域守卫/钳位实现轮裁定面（登记不静默）+ FEC-8 包络抽查 |
| R-3 | classify 二选一未决阻塞批准轮 | Q1 列批准轮必答（V110 风险 6 同款）；两候选影响面已全登记（§6.2），批准轮可径直裁定；本草案轮不受阻 |
| R-4 | fc001_v1 / fc001_oracle.py 字节被实现轮误触（V-03 哈希失配 → 冻结锚点报废） | §0 不动清单 + FCECH-G2b-03/04 工作面不含既有文件 + off 轨 run_hash 逐位不变验收（§3.1 项 3）+ 全量回归兜底 |
| R-5 | T-B 双实现散差超预案（libm ln/exp 差异——极化链对数项密集，散差可能大于 FLTH 幂/指数面） | 容差按双实现实测散差 × 安全系数 ≥10 冻结（FEC-7）+ 超限降 T-C + convergence 块（双向预案）+ 禁 ULP 级承诺 |
| R-6 | 教学参数被误读为 PEMFC 设备参数辨识 | A-fcec-params 非实测声明 + §1.5 三整定依据 + I-5 自查（FLTH R-11 同款） |
| R-7 | r_meas 口径扩展被误读为「测量链升级 / 守恒破缺 / 残差失效」 | A-fcec-meas 显式声明（铭牌恒压换算的行为级口径、控制/测量链零升级）+ 恒等式扩展登记（EQ-FCEC-7）+「口径偏差是模型已知结构项，不是测量故障」句式 + 守恒面声明（§1.4——零 FLTH-Q1 类裁定需求） |
| R-8 | 步数账超支（I-7） | 0 新步预期（变体并入现有步）+ FCECH-G2b-04 归口 CHG 显式申报；批准轮零接线（§0 不动清单延续至实现轮前） |
| R-9 | scenario 键/盲包指纹语义漂移（默认轨歧义、Arena 钉轨） | 默认 off ⇒ 盲包语义零变化（§1.1 ④）+ 新信号不入池显式声明 + EVENT_KEYS additive 显式 CHG + Arena 锁定面登记不预设 |

## 10. 评审记录与条件处置（**预留结构——FCECH-G2b-02 收口回填**；体例沿 PV001 §11 / MG001 §10）

### 10.1 评审记录（双路独立评审回填）

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | （待评审——范围预填：EQ-FCEC 自洽与量纲、单调性域、守恒面与热记账、r_meas 扩展口径、稳定性条件推导、锚点复算、L1 判据对照） | 待回填 | 待回填 |
| 评审人 B（治理/口径/回归面） | （待评审——范围预填：五项进入条件、Q1…Q8 裁定点、classify 二选一、copy-guard、golden 治理与 verify_golden 注册面、不动清单、步数账、契约面 additive 核对） | 待回填 | 待回填 |
| 用户批准 | 批准与实现排期（V110 DEC-3 框架内——批准留待用户） | 待回填 | 待回填 |

### 10.2 条件处置追记（预留空结构——批准轮按 A-x/B-x 编号回填，落点列注明复算依据或工作面归属）

## 11. Q 点清单（草案期开放问题 Q1…Q8——**不定案**；每项带候选与推荐，批准轮逐项裁定后落正文，MG-DRAFT-Q 体例）

| # | 问题 | 候选 | 推荐 + 一句话理由 |
|---|---|---|---|
| Q1 | **scope.js:44-45 classify 硬校验二选一（核心裁定点）** | (A) model_version 升位 + 域校验；(B) cfg 键分域、scope 零改动 | **B**——FLTH B-1/B-2 双先例制度复用成本最低 + SystemDef 单 model_version 字段无按轨静态落点（§6.2 对照表四理由） |
| Q2 | oracle 文件命名 | fc001_l1_oracle.py（深度层命名）；fc001_echem_oracle.py（物理面命名） | **fc001_l1_oracle.py**——fl001_l1/gt001_l1 命名与 MODELS 键镜像先例；FC 当前唯一登记深化轨即本轨、无歧义；若未来第二深化轨出现再立命名裁定（登记不预设） |
| Q3 | P_loss,stack 记账口径 | (a) (E0 − V_stack)·I/1000 按构造自洽、零新增常数；(b) 独立热力学电势 E_th(T_st) 可逆/不可逆拆分 | **(a)**——与 EQ-FCEC-1 三损失项按构造自洽（「三损失全部转化为热」教学叙事强）、零新增常数；(b) 更细但加常数 + 拆分口径裁定面 |
| Q4 | 浓差项形态与 I_lim | (a) 对数式 c_conc·ln(I_lim/(I_lim−I))；(b) 线性近似（最小集） | **(a)**——与活化项对数形态同族、浓差常规形、I_lim 同时承载域硬条件（> 137.5 A）；(b) 损失 I_lim 域语义、单调性域声明弱化 |
| Q5 | 测量换算与 r_meas 口径（含 V_stack 参考工作点整定） | (a) 铭牌恒压换算 + r_meas 扩展恒等含口径偏差项 + V_stack(50 A, T_st(0))=400 V 整定；(b) 测量链升级 V_stack 口径（r_meas = 0.4·b 纯净维持） | **(a)**——测量/控制链零升级（行为级口径）、healthy 局 r_meas = 0.4·b 锚点纯净维持、故障局新增「恒压口径偏差」教学点；(b) 要求测量链知晓 V_stack 非物理、涟漪大 |
| Q6 | golden Run 集 | (a) 镜像 fc001_v1 全集 5 Run 全 on；(b) 最小集 2 Run（healthy + load_step） | **(a)**——新 id golden 镜像基线全集先例（FLTH v2 镜像 4 Run / GT v3 镜像 6 Run）+ sensor_drift 跨深度对比主教学点 + monitor 不变量判据面 |
| Q7 | 容差 tier | T-B（RK4 双实现方法等价）；T-A（不承诺理由登记）；超限降 T-C + convergence | **T-B**——T_st 温度反馈非线性 ODE 无全局闭式 + 跨语言 bit-exact 无依据（FLTH/GTL1 同制）；gate 键面终值 emit 实测冻结 |
| Q8 | oracle 自检编号段 | (a) 新段 FEC-1…n；(b) SC-11… 续编 | **(a)**——新文件新段先例（fl001_l1 FL-1…8 / gt001_l1 GL-1…8）；SC-x 为 fc001_oracle.py 专属证据链，续编混淆两文件 V-03 追溯面 |

---

**修订记录**：v0.1（2026-11-11 初稿，A-5 P1 FC 规格起草人，V110_WAVE_DESIGN §2 W2 /
CHG-20261110-01 授权链）：现状基线实读（§0：FC 纯 L0 / fc001_v1 5 Run / SC-1…10 /
scope.js:44-45 / MODELS["fc001"] / 33 步）；键面 electrochem_model 单键默认 off（§1.1）；
L1 判据对照与 L1-lite 诚实注（§1.2）；状态向量与新物理量表（§1.3）；EQ-FCEC-1…7 草案级
（§1.4，含守恒面声明——零 FLTH-Q1 类裁定需求的结构差异登记）；参数面 12 项（§1.5，
数值一律批准轮定案 + 三整定依据）；assumptions 6 条 / limitations 4 项 / UI 变体（§1.6）；
场景/哈希/盲包/契约面 additive 核对（§2）；off 轨零变化硬条件三层佐证 + on 轨锚点结构
（数值留批准轮——§3.1/3.2）+ 包络角点（I_lim 域硬条件 137.5 A / 稳定性条件形态——§3.3）；
golden 计划十项（§4：fc001_v2 / 独立 oracle / RK4+级联复刻 / FEC 自检 / Run 集 / 元数据 /
T-B / verify_golden 注册行 / 预期失效面 / 两门禁面）；排期三阶段与 P2/P3 串行引用（§5）；
红线自查 I-1…I-5 + classify 二选一对照表（推荐候选 B——§6.1/6.2）+ copy-guard 预查（§6.3）；
五项进入条件（§7）；FCECH-G2b-01…04（§8）；风险 R-1…R-9（§9）；评审记录留空结构（§10）；
Q1…Q8 不定案（§11）。

**状态 `DRAFT v0.1`**：待双路独立评审（FCECH-G2b-02）+ 用户书面批准；实现随批准轮裁定
（V110 DEC-3：P2 排 P1 落地一个发布周期后，P3 实现严格串行）。

**文件结束**。FC001_ELECTROCHEM_G2B_SPEC_DRAFT v0.1（2026-11-11，CHG-20261110-01 授权链）。
本草案为提案文档，无批准效力；golden/代码工件零触碰；EQ-FCEC/常量/锚点数值冻结权归批准轮
（FCECH-G2b-02 + 用户书面批准），Q1…Q8 不定案；本规格批准不自动打开任何验收路径（§4 项 10
两门禁面）。
