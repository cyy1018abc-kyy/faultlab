# FC001_ELECTROCHEM_G2B_SPEC_APPROVED — FC-001 电化学 V-I 极化 + 电堆温度 G2b 物理规格（APPROVED v1.0）

> **任务**：A-5 P1 FC 电化学 G2b 批准轮收口（V120_WAVE_DESIGN §2 阶段一 W1c；FCECH-G2b-02；
> 承接 V110 波 W2 草案 FCECH-G2b-01 / A5_MULTIPHYSICS_EXPLORATION §4 提案三）。
> **授权**：V120_WAVE_DESIGN v1（CHG-20261113-01，2026-11-13 批准，DEC-1…8 全采推荐项）§1
> DEC-1/DEC-2/DEC-3：FC P1 批准轮收口 + 实现轮。**FC P1 批准经用户 2026-11-13「统一采用推荐
> 决策」指令链登记（GTL1-G2b-02 先例：用户指令链即书面批准记录，WT-001/MG-001 同例）**。
> **状态**：`APPROVED v1.0（2026-11-13，FCECH-G2b-02 收口）——批准记录：CHG-20261113-01（用户
> 2026-11-13「统一采用推荐决策」指令链，GTL1-G2b-02 先例）`。
> 双路独立评审：评审 A（物理/数值）**PASS_WITH_CONDITIONS(7)** / 评审 B（治理/口径）**
> PASS_WITH_CONDITIONS(7)**（2026-11-13）；条件 A-1…A-7 / B-1…B-7 **全部按推荐处置落正文**
> （逐条落点见 §10.2）；Q1…Q9 定案（§11，含新增 Q9）；参数面十常量批准轮定案 + 域扫描证据
> （§1.5 / §3.3）。
> **冻结效力**：自本版起 EQ-FCEC 方程 / 常量 / 更新序 / 锚点数值**冻结**——本文为 oracle/引擎
> 唯一权威文本（FLTH §2 v1.0 定案句式）；实现路径 = FCECH-G2b-03/04（§8，用户逐版本指令
> 派发）；验收路径仍两门禁（§4 项 10）：fc001_v2 emit verify 通过前 on 轨不进 approved_fc。
> **前置与先例**：FC-001 现为纯 L0（systems.js:401-619——A-const-v 线性 `P_fc = 0.4×I`
> :583、电堆一阶跟随 EQ-2 :603、分配器 EQ-6 :607、tagline 自述「不含电化学/效率/健康模型」
> :406；golden fc001_v1：v1 面、5 Run、T-解析、在验——V1_FACES 面② 实测表）；L1 深化制度
> 先例 = FL001_THERMAL_G2B_SPEC_APPROVED v1.0（thermal_model 单键 / RK4 dt0.01 / T-B /
> oracle_base 出生接入 / 新段自检 / 01…04 排期）与 GTL1_G2B_SPEC_APPROVED v1.0；G2b 结构
> 体例先例 = MG001_G2B_SPEC_APPROVED v1.0（§0-§11）；治理依据 = SCOPE_SPLIT_MEMO §8.2。
> **A-4c 沿袭声明（V072_WAVE_DESIGN §1 DEC-3，:52-60）**：自写 ODE（stdlib）为 FC 电化学
> 主路径；PyBaMM 不引入（含后端侧）——**含可撤销条款**（:60「用户可随时撤销改采 PyBaMM
> 后端侧」，撤销则 P1 地位重评，登记不预设）；本轨无对照轨（FLTH §5「无对照轨」声明形态）。
> **Q-4 三守卫适用**：新方程集（EQ-FCEC）入引擎须走 G2b（即本文档流程，已走毕）；许可证
> 自研零依赖（RK4/foStep stdlib 自写，无 PyBaMM/TESPy 类依赖）；验收路径禁入直至批准
> （已获）+ emit verify 通过（维持）。
> **本批准轮纪律符合性（V120 §0 / V110 §0 延续）**：golden 零变更（既有 golden 字节冻结——
> 本版只引用不 emit；fc001_v2 = FCECH-G2b-03 产出）；零新仿真轨（本批准轮零触碰
> engine.js/systems.js/scenario.js/scope.js/tools/oracle/**/data/golden/**）；零第三方依赖
> （I-1）；文案红线自查（本文在 FaultLab-evaluation/**，不在 copy-guard 扫描域
> tools/copy-guard.mjs:15 `SCOPES=['src']` 内，实现轮文案迁入 src/** 前按 §6.3 预检 + 终检）。
> **行号基准说明**：本文行号引用为**批准轮时点（2026-11-13）实读值**（关键复核点：
> engine.js:519-529 model_hash 哈希域 / :195-197 normalizeConfig 盖章块、registry.js:46-58
> runHashInput、checks.js:233-258 conservation-meas FC 域、verify_golden.py:101-102
> MODELS["fc001"] / :173 DEFAULT_MODELS / :207-227 T-B 分派、scenario.js:43-52
> EVENT_KEYS/枚举 / :452-479 hashProjection、systems.js:142 defaults 声明 / :401-619 FC
> SystemDef / :3075-3078 defaultConfig 盖章、schema.js:129-144 投影）；起草时点（2026-11-11）
> 行号与本版行号间的漂移按 A-7 处置**不改引文只加注**（§2 注）；实现轮（FCECH-G2b-03/04）
> 以**语义锚点**（信号 id/检查 id/函数名/键名/族 id）为准定位，行号仅作快速索引。

---

## 0. 本规格边界（做/不做）

- **做（本规格 = 批准权威文本面）**：模型形态（`electrochem_model: "off" | "on"` 单键）、
  EQ-FCEC-1…7 方程集（**本版冻结**）、参数面（符号/单位/域/整定依据 + **十常量定案值** +
  域扫描证据 §1.5/§3.3）、场景/哈希涟漪登记（B-1/B-2/B-3 定案形态 §2/§3.1）、锚点与分歧
  预填数值（§3.2，emit 复算冻结）、oracle/golden 计划（Q2…Q8 定案 §4）、scope.js:44-45
  classify 裁定（Q1 定案 B）、排期 FCECH-G2b-01…04（§8）、风险表（§9）、Q 点 Q1…Q9（§11
  定案）。
- **不做（本规格显式排除）**：
  1. **L2 不做**：CFD/FEA/多体动力学维持不做（V05_ROADMAP §6 :169 / V06_ROADMAP §6 :116 /
     ALINE §12 :300 三处原文引用维持——A5 §6 全量确认，本轨不重引不放松）；
  2. **PyBaMM 不做**：不引入（含后端侧）——V072 DEC-3（:54/:57）沿袭 + 可撤销条款（:60）
     引用维持；无对照轨（A-4c 已裁；旁证算例轨如未来需要另立规格——FLTH §5 句式）；
  3. **本批准轮不定实现**：本批准轮零代码/golden/oracle 触碰（维持 §0 不动清单）；EQ-FCEC
     于本版冻结，FCECH-G2b-03/04 按本文实现（I-4 纪律：实现须用户逐版本指令派发）；
  4. 不定 P2/P3 时点（A5 §5 优先级为相对工作量与治理成本排序、非工期承诺——G0-DEC-15
     句式）；不动任何既有裁定（A-4c/SOC 定义不动/SA-24/APPROVED 常量语义零触碰——Q1 已
     按推荐定案 B，cfg 键分域、scope.js 结构零改动）；
  5. **本轮不动清单**：`tools/oracle/**` 全部零触碰（新 oracle 于 FCECH-G2b-03 才创建）；
     `data/golden/` 既有文件字节冻结零变更；engine.js/systems.js/scenario.js/scope.js
     零改动（均为实现轮显式工作面）；不引入第三方依赖（I-1）。
- **FC-001 现状基线（2026-11-11 实读登记，批准轮复核维持）**：纯 L0 单轨——恒压等效
  （A-const-v :583）+ 电堆电流一阶跟随（τ_fc=1.2 s，EQ-2）+ 功率分配器一阶跟随（τ_ref=2.5 s，
  EQ-6）+ SOC 积分（EQ-5）+ 残差定义恒等（EQ-4）；无热面、无电化学面；oracle 自检 SC-1…SC-10
  （fc001_oracle.py 实读：SC-8 load_step 锚点 / SC-9 actuator 锚点 / SC-10 级联尾差域声明
  ≤6e-6）；fc001_v1 5 Run = healthy / closed_loop_fault / monitor_only / load_step_closed_loop /
  actuator_closed_loop（fc001_oracle.py:126-138 实读）；FC-001 在 approved_fc 验收路径
  （scope.js:44-51 四族条件）与 Arena 盲测池（arena.js:99 实读——MG-001 入列为本波 W7 面，
  FC 入池现状不变）；verify_golden `MODELS["fc001"]` 注册行（scripts/verify_golden.py:101-102
  实读）；run-g2 现状 35 步全量（V110 DEC-5 批准 33→35，MG 两步已落地——V120 DEC-5 本轨
  0 新步预期，§8 FCECH-G2b-04）。

## 1. 模型形态

### 1.1 配置键形态与默认轨（沿 thermal_model / inertia_model additive 单键先例）

- **单键枚举 `electrochem_model: "off" | "on"`，默认 off**：FC-001 defaults 新键
  （systems.js:417-421 defaults 面新增；盖章沿 **engine.js normalizeConfig `thermal_model`
  盖章块先例（engine.js:195-197）同构新行**——systems.js:142 为 FL defaults 声明面
  `thermal_model: 'off'`，**非 normalizeConfig**；草案 v0.1 曾混同表述，本版订正（B-7），
  FCECH-G2b-04 双盖章落点登记见 §8）；engine 分派 = simulateFC001 顶部 early-return
  （engine.js FLTH/GT thermo 分支先例同构——FLTH §2.0），**off 路径现状全量代码逐字不动**。
- **默认 off 理由（FLTH §2.0 四理由逐条适用）**：① approved_fc 验收链与 fc001_v1 冻结
  锚点保持解析精度口径；② T-解析（off）/ T-B（on）容差制度分轨；③ 跨深度对比经 scenario
  显式钉轨达成，不依赖默认翻转；④ FC 在 Arena 盲测池，默认 off ⇒ 盲包 config 指纹/观测
  语义零变化。未来翻转（off→on）须显式 CHG（FLTH-IMP-Q3 同款登记不预设）。
- **层级表达与 golden 映射**：off ⇔ L0（现 level 标签零改动）；on ⇔ L1（变体提案 §1.6）；
  cfg 单值与 golden id 一一映射：off→fc001_v1、on→fc001_v2（FLTH §2.0 同构；两门禁面
  §4 项 10）。

### 1.2 层级判定（ALINE §1.1 判据对照）与 L1-lite 诚实注

| ALINE §1.1 L1 判据 | 本提案对应 | 满足声明 |
|---|---|---|
| 新物理状态变量 | 电堆温度 **T_st** 新动态状态（单节点集总热容 ODE，EQ-FCEC-3） | ✔ 1 个动态温度状态 |
| 方程不可手解 | 极化链为非线性代数（对数项）+ T_st RHS 经 P_loss_W(T_st) 温度反馈——全局无闭式 | ✔ **on 域替换线性恒压口径**（P=0.4×I → V_stack·I/1000）为本轨「新物理」主面 |
| 需专用积分器 | RK4 固定步长 dt0.01（stdlib 自写），与 L0 精确指数/级联 foStep 积分面实质区别 | ✔ 沿 GT-L1/FLTH 制度 |
| golden 由独立数值 oracle 生成 | 新文件独立 RK4 oracle（**Q2 定案：fc001_l1_oracle.py**，§4 项 2） | ✔ 非「逐算子闭式复刻」路线 |

**L1-lite 诚实注**（FLTH §1.1 句式）：单状态、非高维/刚性——但三判据成立且含非线性
代数链新物理，按 ALINE §1.2 第三行走完整 G2b（**已走毕——本版即批准文本**）；水管理/
气体扩散/双电层/老化衰减等扩展登记不做（§1.6，A5 §7 定位维持）。

### 1.3 状态向量与新物理量表（诚实区分 ODE 状态与代数量——I-2）

RK4 状态向量 **y_rk4 = [T_st]**（1 维新增）；I_fc/I_fc_ref **保留 L0 更新序**（精确指数
foStep / load_step·actuator 级联子步递推——fc001_oracle.py 数值口径逐字保留，非 RK4 状态，
不依赖 T_st——§3.2 电气面逐位同的结构原因）。

| 量 | 类型 | 信号 id 提案 | 单位 | 定义 | sourceKind/exposure 提案 |
|---|---|---|---|---|---|
| I_fc | L0 状态（保留） | I_fc_true_A（复用） | A | EQ-1/EQ-2 原样 | L0 既有不变 |
| **T_st** | **ODE 状态（新）** | T_st_K | K | EQ-FCEC-3；T_st(0)=T_amb=298.15 K | MODEL_STATE → public_demo |
| **V_stack** | 代数（新） | V_stack_V | V | EQ-FCEC-1 | MODEL_STATE → public_demo |
| **P_loss,stack** | 代数（新） | P_loss_stack_kW | kW | **P_loss_W/1000（A-3 W 记账定案——EQ-FCEC-4）** | DERIVED → public_demo |
| P_fc | 定义式 on 域替换 | P_fc_true_kW（复用） | kW | EQ-FCEC-2 | L0 既有不变 |
| r_true / r_meas | 残差（定义恒等扩展） | 复用 | kW | EQ-FCEC-7 | L0 既有不变 |

**盲包面裁定（GTL1 §1.2 B-1 先例）**：三个新信号全非盲显、不设 blindVisible；**off 轨
全程 null**（makeSeries 按 SystemDef.signals 建列——GT/FL null 列先例）；不入 blind 投影。
单位字典零缺口（K 已入表 GT C-3、V 既有 V_bus_V——批准轮 emit 核对 ⇒ FCECH-G2b-03 核对面）。

### 1.4 方程登记（EQ-FCEC-1…7，**本版冻结——oracle/引擎唯一权威文本**）

| id | 方程（冻结） | 说明 |
|---|---|---|
| EQ-FCEC-1 | V_stack(I, T_st) = E0(T_st) − c_act·ln(1 + I/I_0) − R_ohm(T_st)·I − c_conc·ln(I_lim/(I_lim − I)) | **V-I 极化链（三损失项）**：活化对数近似 + 欧姆 + 浓差（**Q4 定案 (a)** 对数式）；常量定案值 §1.5（域扫描证据 §3.3）；I < I_lim 值域硬条件（§3.3）；V_stack 为电堆集总等效端电压（非单池——A-fcec-polarization） |
| EQ-FCEC-2 | on 域：P_fc,true = V_stack·I_fc/1000（kW）；off 域：P_fc = 0.4·I_fc 原样 | 电堆功率换算（on 域**替换** EQ-3 前半 A-const-v 电堆半边；EQ-3 off 域逐字保留） |
| EQ-FCEC-3 | **C_st·dT_st/dt = P_loss_W − h_st·(T_st − T_amb)**【W 记账——A-3 定案】，T_st(0) = T_amb = 298.15 K | 电堆单节点集总热平衡 ODE（复用 FLTH EQ-FLTH-4 形态，**记账基按 FLTH oracle 权威口径以 W 记**）；牛顿冷却、冷启动假设 |
| EQ-FCEC-4 | **P_loss_W = (E0(T_st) − V_stack)·I【W】**；信号面 P_loss_stack_kW = P_loss_W/1000 | **热损失口径（Q3 定案 (a)——W 基，A-3）**：按构造 = 三损失项×电流（E0 在差分中相消、零新增常数）；草案 v0.1「/1000 kW 基」形态废止 |
| EQ-FCEC-5 | E0(T_st) = E0_ref + k_E·(T_st − T_ref)，T_ref = 298.15 K；**k_E = 50·α_ohm·R_ohm0（整定依据④——A-2(i) 定案恒等式）** | E0 温度面（线性；**符号域钉正：k_E ≥ 0 由恒等式承载**（α_ohm ≥ 0 ∧ R_ohm0 > 0））。**两温度面均线性 ⇒ healthy 全轨 V_stack(50,·) ≡ 400 V 精确恒等**（k_E 项与 R_ohm 温度项在 I=50 处逐项相消——§3.2/§3.3 ⑤ 实测残差 0） |
| EQ-FCEC-6 | R_ohm(T_st) = R_ohm0·(1 + α_ohm·(T_st − T_ref)) | 欧姆电阻温度面（FLTH EQ-FLTH-2 同构线性式；正温度反馈项——稳定性条件 §3.3，W 口径 h_st > α_ohm·R_ohm0·I²） |
| EQ-FCEC-7 | 电气面保留：EQ-1/EQ-2/EQ-5/EQ-6 原样（测量链/控制面零升级）；r_true := P_fc,true + P_bat,true − P_load ≡ 0；**r_meas := 0.4·b + (0.4 − V_stack/1000)·I_fc**（Q5 定案 (a)）；off 域退化 r_meas = 0.4·b。**记账基（A-5 定案）**：on 域 SOC_true/E_bat/P_bat 按 P_fc,true 重算（**真实功率基**）；SOC_est（测量链 0.4·I_meas 未动）与 L0 逐位同；SOC_err_pp 签名面随之变化 | r_true 按构造恒等（P_bat = P_load − P_fc,true 理想平衡源口径不变）；r_meas 第二项为**恒压测量口径偏差项**——**在参考工作点 (I=50 A, T_st(0)) 处为零；偏离工作点显非零**（模型已知结构项、非测量故障——Q5/A-1 定案）；healthy 局 I≡50 + 整定依据④ ⇒ 口径偏差项全轨为零（§3.2 ⑤ 实测） |

**守恒面声明（零 FLTH-Q1 类裁定需求——登记为结构差异）**：热损失为电堆**内部记账**
（化学能未单独入母线账），母线恒等式 P_fc + P_bat ≡ P_load 按构造维持、E_fc + E_bat ≡
E_load 维持——与 FLTH Q1 的结构性差异：FL 侧损耗发生在「登记功率 0.4·I 已入母线账」的
支路须裁定补偿去向（方案 (a) 发电机补偿）；FC 侧 P_fc 本身即极化后端电压功率，无缺口项、
无补偿裁定面。**A-const-v 假设分域**：电池半边（P_bat 换算 0.4 kV）on 域保留、电堆半边
on 域被极化链替代——assumption 文本分域登记沿 FLTH「【仅 …适用】」句式（§1.6）。

### 1.5 参数面（**十常量批准轮定案——域扫描证据 §3.3；全部教学整定值、非实测**）

| 常量 | 单位 | **定案值（FCECH-G2b-02，2026-11-13）** | 域（登记） | 整定依据（一句） |
|---|---|---|---|---|
| E0_ref | V | **425.130134484272**（闭式：400 + c_act·ln 6 + 50·R_ohm0 + c_conc·ln 1.5） | > 0 | 参考可逆电势——由整定依据①锚点闭式**派生**（非自由度）：V_stack(50, T_st(0)) = 400.000000 V 精确（扫描残差 0.0，§3.3 ①） |
| k_E | V/K | **0.1**（= 50·α_ohm·R_ohm0 恒等式） | ≥ 0（恒等式承载，符号域钉正） | 整定依据④（A-2(i)）：两温度面线性 ⇒ healthy 全轨 V_stack(50,·) ≡ 400 V、SOC/E_bat/r_meas 与 L0 逐位同恢复 |
| I_0 | A | **10** | > 0 | 活化损失特征电流——教学量级（I=50 A 处活化损失 0.0896 V） |
| c_act | V | **0.05** | > 0 | 活化过电位尺度——教学量级，与对数形态（Q4 (a)）联合保证单调性域（§3.3 ②） |
| R_ohm0 | Ω | **0.5** | > 0 | 参考欧姆电阻——决定极化主斜率（dV/dI ≈ −0.5 V/A 量级）与三故障分歧裕度（§3.3 ⑥） |
| α_ohm | 1/K | **0.004** | ≥ 0（负值即负温度反馈，登记不采） | 欧姆电阻温度系数——k_E 恒等式配对（0.1 = 50×0.004×0.5）+ 稳定性界（§3.3 ③） |
| c_conc | V | **0.1** | > 0 | 浓差损失尺度（Q4 定案 (a)）——I_lim 附近极化链下弯可见、单调性域保持 |
| I_lim | A | **150** | **> 137.5 A 域硬条件**（注册域最大电流——FCEXT §1.4 极端角点实读） | 浓差极限电流（EQ-FCEC-1 值域）——150 > 137.5（裕度 12.5 A）+ 对数域安全 |
| C_st | J/K | **1500** | > 0 | 电堆集总热容——整定依据②：healthy 有效时间常数 τ_eff = C_st/(h_st−α_ohm·R_ohm0·50²) = 13.04 s，60 s 窗内温升 +10.82 K 轨可见 |
| h_st | W/K | **120** | > 0；**h_st > α_ohm·R_ohm0·I²【W/K】（A-3 W 口径定案——草案「/1000」宽松形态废止）** | 牛顿冷却系数——于注册域最大 I = 137.5 A 处复扫：120 > 37.8125，裕度 +82.1875 W/K（3.17 倍，§3.3 ③） |
| T_amb | K | 298.15 | 登记常量 | 环境温度常数，T_st(0) = T_amb（不动） |
| DT_INT | s | 0.01 | 库口径 | RK4 子步步长（6000 子步/60 s）（不动） |

**整定依据四声明（本版冻结依据）**：① **参考工作点复现铭牌**——V_stack(50 A, T_st(0)) =
400.000000 V 精确（≤1e-9；扫描实测残差 0.0）（Q5 定案 (a)：healthy 局 P_fc(50)=20 kW 复现
L0 基准 + **r_meas 口径偏差项在参考工作点 (I=50 A, T_st(0)) 处为零**——A-1 修正表述）；
② **60 s 窗内 T_st 轨可见性**（healthy +10.82 K / load_step +24.72 K——FLTH A-flth-params
「60 s 演示窗内温升路径可见」句式）；③ **单调性域 dV/dI < 0 于注册域全域**（防非物理多解
——二维扫描实测 max dV/dI = −0.5018 V/A < 0，§3.3 ②）；④ **healthy 工作点温度不变性
∂V_stack/∂T|_{I=50} = 0，即 k_E = 50·α_ohm·R_ohm0**（A-2(i) 定案新增强制整定依据——两温度面
均线性 ⇒ healthy 全轨 V_stack(50,·) ≡ 400 V 精确成立、healthy 局 P_fc≡20 kW、P_bat≡10 kW、
SOC/E_bat/r_meas 与 L0 **精确逐位同**；§3.3 ⑤ 实测：V 残差 0.0、dSOC_true = +0.0 pp、
dE_bat = +2.8e-17 kWh 求和簿记级）。非设备参数辨识声明（A-fcec-params，含 A-7① 温度面
符号半句）。

### 1.6 assumptions / limitations / UI 措辞（本版冻结——实现轮迁入 src/** 前 §6.3 预检 + copy-guard 终检）

| id | text（冻结） |
|---|---|
| A-fcec-polarization | 【仅 electrochem_model=on 适用】电堆端电压按三损失项极化链（EQ-FCEC-1）计算，为电堆集总等效（非单池、无水管理/气体扩散/双电层动态）。 |
| A-fcec-params | 【仅 electrochem_model=on 适用】全部极化/热参数为教学整定值（非实测参数）：按参考工作点复现铭牌（V_stack(50 A, T_st(0)) = 400 V）、60 s 窗内温度轨可见性与 healthy 工作点温度不变性（k_E = 50·α_ohm·R_ohm0）整定，不对应任何真实 PEMFC 电堆参数辨识；**温度面符号为教学叙事整定（k_E>0、α_ohm≥0），不代表 PEMFC 物性方向（真实 dE_rev/dT<0）**（A-7① 新增半句）。 |
| A-fcec-heat | 【仅 electrochem_model=on 适用】电堆热为内部记账：P_loss_W = (E0 − V_stack)·I【W】进 T_st ODE（EQ-FCEC-3/4，W 记账——A-3 定案）；母线恒等式 P_fc + P_bat ≡ P_load 按构造维持；热损失是模型记账项，不是能量损失。 |
| A-fcec-dispatch | 【仅 electrochem_model=on 适用】功率分配器换算维持 0.4 kV 名义电压（EQ-6 原样——控制器不感知 V_stack，行为级控制器口径）；分配目标与电堆实际功率之差由电池缓冲吸收（理想平衡源口径不变）。 |
| A-fcec-meas | 【仅 electrochem_model=on 适用】测量换算维持铭牌恒压口径（P_fc,meas = 0.4·I_meas）；r_meas 定义恒等扩展含恒压口径偏差项（Q5）——**口径偏差项在参考工作点 (I=50 A, T_st(0)) 处为零（healthy 全轨 I≡50 + 整定依据④ ⇒ 全轨为零）；偏离工作点显非零口径偏差**——口径偏差是模型已知结构项，不是测量故障（A-1 修正表述）。 |
| A-fcec-l1 | 【仅 electrochem_model=on 适用】电化学-热模型为教学尺度单节点集总示意（L1-lite），不是经过验证的设备控制器或电堆电化学模型。 |

limitations 追加（on 域，4 项）：① 水管理/气体扩散/双电层/寿命衰减未建模（现 limitation
第 1 条「不含电堆热管理、水管理、气体扩散与寿命衰减」分域化改写——off 域原文保留；
**B-2 定案：分域化改写挂模型级 additive 子对象，既有五数组逐字节不动**，§3.1）；② 浓差
域外（I ≥ I_lim）行为未定义——域守卫/钳位为实现轮裁定面（登记不静默）；③ 无热保护（高温
降额/热失控——FLTH §6.1 项 7 同款）；④ 单节点集总热（无堆内温度分布）。
UI 变体提案：on = 「L1 · 电堆极化与单节点热（数值仿真级）」；summary 追加「电堆按极化
曲线出力、损耗热加热电堆（模型记账口径）」；定位句「教学尺度电化学-热集总示意（L1-lite），
非机组/电网动态验证」——全部预检见 §6.3。

## 2. 场景/事件族影响面（零新事件族预期 + scenario 新键 additive 登记）

| 面 | 登记内容 |
|---|---|
| 事件族 | **零新事件族**：sensor_drift / load_step / actuator_fault 三族定义、参数域、defaultTime、因果模板全部零变更——on 轨仅物理响应面变化（同故障 L0↔L1 跨深度对比 = 教学点，ALINE §6.4 固定句式） |
| scenario 新键 | EVENT_KEYS（scenario.js:41——本版时点实读 :43）additive 新键 `electrochem_model` + 枚举常量 ELECTROCHEM_MODELS = ['off','on']（:45 INERTIA_MODELS / :49 THERMAL_MODELS 同构新增——本版时点 :50/:52）+ 系统守卫 declaresElectrochem 派生（:362 declaresInertia / :382 declaresThermal 同构）；缺省解析为系统默认轨（= off）；**schema v1 白名单扩展须显式 CHG**（FLTH §2.4 / GTL1 B-2 先例——面③ additive）。**行号漂移注（A-7）**：括号内起草时点行号按草案行号基准政策保留原文，本版实读值见头部行号基准说明——实现轮以语义锚点定位 |
| **哈希形态（B-1 定案采 (a)——偏离 thermal/inertia 先例）** | `electrochem_model` **仅在场景输入显式提供时**才写入归一化事件与 hashProjection（scenario.js hashProjection :452-479 同构点——inertia_model/thermal_model 为无条件解析轨入哈希， electrochem 为**显式键条件式**入哈希）；缺省轨解析只在引擎 normalizeConfig 盖章层发生（engine.js:195-197 同构新行）。**偏离先例及理由**：face③ 冻结边界原文「新可选事件键……新键只影响使用它的输入，既有场景解析与哈希不变」（V1_FACES:184-186 实读）禁止缺省轨入哈希形态——热/惯量先例的既有场景哈希变化发生在 v0.x 宽容期（登记预期失效面 + 显式 CHG：CHG-20261104-12 ③ / CHG-20261107-01），八面冻结后不可复制；采 (a) 保「**既有 FC 场景 scenarioHash 零变化**」。偏离登记入本节与 Q9（§11 定案） |
| config_hash 投影（B-3 定案采 (a)） | scenarioView（config_hash 投影，schema.js）**不入 electrochem_model**——thermal_model 先例（schema.js 现状即不含 thermal_model——本版实读 :129-144 确认，投影显式列键仅 inertia_model/G0_W_m2 等）；**显式登记已知局限：FC on/off 两轨 config_hash 同值（FL 现状同款），轨区分由 run_hash/序列内容承载——不静默** |
| 事件快照 | 零扩展（T_st/V_stack 不入事件快照——FLTH §3.6 最小集声明同款） |
| 盲包 | FC 在盲测池；默认 off ⇒ 盲包语义零变化；新信号不入池显式声明；未来盲包钉 on 须同轮 Arena 锁定面裁定（登记不预设——FLTH R-9 同款） |
| 契约面 additive 通道（V1_FACES 八面冻结下核对） | 面① defaults/信号/assumptions additive（**assumptions 走模型级 additive 子对象——B-2 定案，§3.1**）；面② 新 golden 新 id；面③ 新事件键 additive（显式键条件式哈希形态——B-1）；面⑥ Q1 联动白名单扩张声明（Q1 定案 B——classify 结构零改动）；面⑦ 步数账实现轮申报（0 新步预期）；面⑧ 词表如需增词 additive——**零 breaking 预期**（既有 golden 零触碰 / 既有哈希零变化 / 既有 run-g2 步判据零翻转，§3.4 三条逐一对照） |

## 3. 锚点与包络预填（off 轨硬条件逐位；on 轨本版冻结数值 = 批准轮域扫描值，emit 复算冻结）

### 3.1 off 轨零变化硬条件（三层佐证体例沿 FLTH §3.3；项 3/项 4 按 B-2 定案合并重述）

1. **代码结构佐证**（起草时点实读，批准轮复核维持）：src/** 无任何 electrochem 入口（本轨
   未触代码）；FC 分派链现状即 off 轨全量代码路径；
2. **数值佐证**：fc001_v1 5 Run 冻结 golden 在验（V-07 逐点比对随 run-g2 fc001 步）；
   fc001_oracle SC-1…10 全过为 emit 现状；
3. **实现轮零变化判据（FCECH-G2b-04 验收项——B-2 定案合并重述）**：**B-2 第一步实读裁定**
   （engine.js:519-529 / registry.js:46-58，2026-11-13）：model_hash 为**具名字段固定清单
   哈希**——`core.hashObject({model_id, model_version, assumptions, limitations, equations,
   units, claims, unit_system, equation_ids})` 九键定名清单，**非整 model 对象哈希**；
   run_hashInput = `{bundle_schema_version, config_hash, model_hash, engine_version, t,
   signals, events, metrics, checks}`（model_hash 于 :50 直接入 run_hash）。**裁定：采新
   additive 子对象方案（首选方案成立）**——on 轨全部声明面（A-fcec-* 六条 assumptions、
   on 域 limitations 分域化 4 项、EQ-FCEC-1…7 equations、level_on/summary_on 变体文案）
   **不触碰既有五数组（assumptions/limitations/equations/units/equation_ids 逐字节不动）**，
   改挂 SystemDef 模型级 additive 字段（形态：`electrochem: { assumptions:[…],
   limitations:[…], equations:[…], level_on, summary_on }`——置于 model_hash 哈希域之外，
   即**不加入 engine.js:519-529 hashObject 输入清单**；manifest body 如需展示字段为 additive
   面、哈希值零变化）；UI 按轨条件渲染（on 时显示子对象 limitations/assumptions，off 显示
   原文——诚实性由变体渲染承载，既有「不含电堆热管理」limitation 在 off 域保持为真）。
   **此方案下 model_hash / run_hash / config_hash / scenarioHash 既有输入全部零变化**：
   off 轨 run_hash 逐位不变；T_st_K / V_stack_V / P_loss_stack_kW 三列 off 轨全程 null；
   既有引擎/FC 测试断言零改动通过；tests/registry.test.js per-Run 哈希面既有断言零变化
   （仅 additive 新断言——on 轨 Run 哈希为新值，既有 FC 场景哈希零变化由 B-1 (a) 保证）。
   **回退案（登记不启用）**：若实现轮证明 additive 子对象不可承载（如 manifest 深冻结
   结构冲突），回退 B 原案——off 轨数值面逐位不变（t/signals/metrics/checks/config_hash +
   fc001_v1 golden 比对零变化）+ run_hash 变化仅源于 model_hash 声明面，走显式 CHG 登记
   并附 §3.2 窄化论证（保护目的 = 输入映射确定性与归档证据完整性——后者由 golden 字节
   冻结 + 数值逐位守护；否则 face① additive 通道对既有系统不可用，内部矛盾）；
4. **预期失效面（非「变化」，登记——B-2 定案后修订）**：SystemDef.signals +3 ⇒ 信号目录
   更新（**manifest model_hash 零变化**——B-2 定案：signals 不在 :519-529 哈希域、manifest
   body 无 signals 字段，本版实读确认）；tests/registry.test.js 哈希面**既有断言零变化**
   （草案 v0.1「model_hash 更新」预期失效面表述废止——其前提是声明面进既有五数组）；
   fc001_v1 golden 比对面零变化（golden 无新列，额外 null 列不进比对）；UI 层级徽章变体
   （off 视图零变化，on 视图 additive）。

### 3.2 on 轨锚点（**本版冻结数值 = 批准轮域扫描值（§3.3，RK4 dt0.01 耦合仿真）；emit 复算冻结**）

健康局结构表：

| 锚点 | 口径 | 值（冻结） | 判据形态 |
|---|---|---|---|
| T_st(0) | = T_amb（冷启动） | 298.15 K（登记常量） | 精确值 |
| T_st(60) | 健康局温升轨终值 | **308.966317609 K**（+10.816 K / 60 s——整定依据②） | 单调升 + 60 s 可见性 |
| T_ss 渐近 | EQ-FCEC-3 令 dT/dt=0 | **309.076 K**（= T_amb + 1256.507 W / 115 W/K） | 稳态闭式抽查 |
| V_stack(50, T_st(0)) | 参考工作点 | **400.000000 V（残差 0.0）** | 铭牌复现（整定依据①） |
| P_fc(50) | 健康局 | **20.000 kW（逐位）** | 与 fc001_v1 healthy 相容（0.4·50 与 400·50/1000 双路径 IEEE-754 同轮入） |
| P_loss_stack(0) | 健康局 | **1.256507 kW**（P_loss_W = 1256.507 W，EQ-FCEC-4 W 基） | = 三损失项×50 A |
| I_fc | — | **与 L0 逐位同** | 精确恒等（结构推论：I_fc 更新序不依赖 T_st——FLTH §3.2 同款） |
| SOC_true / E_bat / P_bat | **on 域按 P_fc,true 重算（A-5 记账基）** | healthy 局**与 L0 逐位同**（实测 dSOC_true = +0.0 pp、dE_bat = +2.8e-17 kWh 求和簿记级——整定依据④生效证明） | A-2(i) 结构推论 + §3.3 ⑤ 实测 |
| r_meas | Q5 口径 | healthy 局 **r_meas ≡ 0.4·b = 0 全轨精确**（口径偏差项参考工作点为零 + I≡50 恒值） | A-1 定案；checks.js 判据 ≤1e-6 裕度 10⁶ 倍 |

同故障分歧预期表（L0 值 = fc001_v1 冻结锚点 I_fc(60) = 40/75/27.5 A × 0.4 kW/A 算术换算
——**引用面订正（A-7）**：40 A 载体 = G0-DEC-15 修复清单（SOC_true_end=59.4755556% 含
τ_fc 过渡尾项，隐含 40 A 尾轨）+ systems.js acceptance.keyValues `I_fc_true_end_A: 40`（
本版实读 :615-617）；FCEXT §1.3/§2.3 仅覆盖 75/27.5（fc001_oracle.py:55-60 G2b 验收锚点
实读）——草案 v0.1 引用面订正。L1 on 数值 = 批准轮域扫描耦合仿真预填（emit 复算冻结）；
方向为 Q5 整定 + 单调性域下的**无条件结构推论**（推导注见下）：

| 场景 | 量 | L0 off（fc001_v1 冻结） | L1 on（预填） | 分歧机理 → 教学点 |
|---|---|---|---|---|
| sensor_drift +10 | P_fc(60) | 16.000 kW | **16.206329 kW（> 16 ✓，裕度 +0.206）** | I 降 → V_stack 沿极化链回升 → P_fc 跌幅小于线性——L0 线性不可见的非线性格点 |
| 同 | r_meas | max 4.0（= 0.4·b） | 0.4·b + (0.4 − V_stack/1000)·I 口径偏差项（healthy 局为零——A-1 定案；故障局非零=结构项） | 「测量偏差 + 恒压口径偏差」双成分残差——「+4 kW 是测量偏差，不是能量损失」教学点的 FC on 域变体 |
| 同 | T_st 轨 | —（无热面） | 降温恢复轨：T_st(60) = 305.129 K（t=20 峰值 308.966 后向 T_ss(40 A)=304.7 K 恢复） | 热惯性过冲方向/量级冻结（FLTH §3.2 形态同构） |
| 同 | **SOC_true(60)**（A-5 新增行） | 59.4755556 % | 59.481147 %（**dSOC_true = +5.59e-3 pp**） | 真实功率基记账：P_fc,true > 0.4·I ⇒ 电池放电少 ⇒ SOC_true 偏高（SOC_est 未动 ⇒ SOC_err 签名面变化） |
| 同 | **E_bat(60)**（A-5 新增行） | 0.209777778 kWh | 0.207541 kWh（**dE_bat = −2.24e-3 kWh**） | 同上机理 |
| load_step +10 | P_fc(60) | 30.000 kW（级联尾差 29.999998） | **28.966331 kW（< 30 ✓，裕度 −1.034）** | I 升 → 极化压降增大——非线性爬升 |
| 同 | SOC_true(60) / E_bat(60) | 59.5576736 % / 0.176930563 kWh | 59.532403 % / 0.187039 kWh（**dSOC = −2.53e-2 pp / dE_bat = +1.01e-2 kWh**） | P_fc,true < 0.4·I ⇒ 电池放电多 |
| actuator 55% | P_fc(60) | 11.000 kW | **11.314880 kW（> 11 ✓，裕度 +0.315）** | 钳位点沿极化链电压回升 |
| 同 | SOC_true(60) / E_bat(60) | 59.3427083 % / 0.262916667 kWh | 59.351312 % / 0.259475 kWh（**dSOC = +8.60e-3 pp / dE_bat = −3.44e-3 kWh**） | 同 sensor 机理 |
| monitor 轨 | T_st 全序列 | — | 与 healthy 轨**逐点恒等**（实测 max\|ΔT\| = 0.0 K——b 不进物理回路） | FLTH FL-6 同构判据（FEC 自检预案） |
| monitor/healthy | SOC_true(60) / E_bat(60) | 59.5833333 % / 0.166666667 kWh | **逐位同**（dSOC = +0.0 pp / dE_bat = +2.8e-17 kWh——I≡50 ⇒ 口径偏差项恒零） | A-5 分歧行只对故障局登记（A-2(i) 下 healthy/monitor 恒等恢复） |

**方向声明推导注（A-2(i)/A-4 定案——三行方向声明升级为无条件结构推论）**：dV/dI < 0
（单调性域全域，§3.3 ②）∧ V_stack(50,·) ≡ 400（整定依据④）⇒ sign(V_stack(I*) − 400) =
sign(50 − I*)（第一项，单调性项）；dV/dT_st|_I = k_E − α_ohm·R_ohm0·I = α_ohm·R_ohm0·(50 − I)
⇒ 漂移项 (50 − I*)·α_ohm·R_ohm0·ΔT60 与第一项**同号**（ΔT60 > 0 全场景实测）——两温度面
均线性下该项为恒等式推论、无需数值复算即成立（α_ohm = 0 时漂移项恒零、第一项独立承载
——A-4 附注）。三故障角点实测：I*=40（dV/dT = +0.020 V/K，V(40)−400 = +5.02 V，同正）、
I*=75（−0.050 V/K，−12.55 V，同负）、I*=27.5（+0.045 V/K，+11.29 V，同正）✓。

### 3.3 包络与角点（**域扫描证据节——FCECH-G2b-02 批准轮实测（2026-11-13，python -I 独立
扫描）；emit 时由 fc001_l1_oracle 复算冻结（FEC-3/FEC-5/FEC-8 硬条件）**）

**域扫描证据（参数组 = §1.5 十常量定案值；判据数值逐项）**：

| # | 判据 | 扫描结果 |
|---|---|---|
| ① | 锚点复算 V_stack(50, T_st(0)) = 400 V ≤1e-9 | **残差 0.0 V（精确）**；V_stack(50, T_st(60)) 残差 0.0 V（整定依据④温度不变性浮点实现面成立） |
| ② | 单调性 dV/dI < 0 全域 | 二维网格 2751×1016（I ∈ (0, 137.5] 步长 0.05 A × T_st ∈ [298.15, 550] K 步长 0.248 K）：**max dV/dI = −5.018214e-01 V/A** @ (56.28 A, 298.15 K)；min = −1.012039 V/A @ (137.5 A, 550 K)；I→0⁺ 极限 −0.505667 V/A。**全域严格 < 0**（闭式结构：三项皆负——−c_act/(I_0+I) − R_ohm(T_st) − c_conc/(I_lim−I)，对数浓差式 Q4 (a) 下无内点变号可能） |
| ③ | 稳定性裕度（W 口径，A-3） | α_ohm·R_ohm0·137.5² = **37.8125 W/K** < h_st = 120 W/K ⇒ **裕度 +82.1875 W/K（3.1736 倍）**；(0, 137.5] 步长 0.1 全域最小裕度 = 82.1875 W/K（@137.5 A，I² 单调） |
| ④ | RK4 自收敛 + 子步解析交叉（FEC-7 预演） | 五 Run 耦合仿真（T_st RK4、RHS 内 I_fc 冻结子步起点——§4 项 3 口径）max 散差：\|RK4(0.01)−RK4(0.005)\| = 1.82e-12 / 2.33e-12 / 2.05e-12 / 1.82e-12 K（healthy/sensor/load/act）；RK4(0.01)−子步解析 = 1.137e-13 K（全 Run 同——浮点累积噪声级；RK4 截断 ~1e-17 K 不可见）；**A-6 稳定域：dt·(h_st − α_ohm·R_ohm0·I²)/C_st 最大 = 0.01×0.0548 = 5.479e-4 ≪ 2.78**（dt=0.01；教学量级裕度 ~10⁴ 倍，FEC-7 半步自收敛兜底） |
| ⑤ | healthy 400 V 核验（整定依据④生效证明） | T_st(60) = 308.966317609 K；V_stack(50, T_st(60)) = 400 V **残差 0.0**；P_fc,true ≡ 20.0 kW 逐位（0.4·50 与 V·50/1000 双路径同轮入）；**dSOC_true = +0.0 pp（逐位）/ dE_bat = +2.8e-17 kWh（Simpson 求和簿记级）**——A-2(i)「与 L0 精确逐位同」实测成立 |
| ⑥ | 三故障角点方向声明 + 分歧值预填 | sensor（I*→40.000000 A）：P_fc,true(60) = **16.206329 kW > 16 ✓**；load（I*→74.999995 A）：**28.966331 kW < 30 ✓**；actuator（I*→27.500000 A）：**11.314880 kW > 11 ✓**；漂移项同号复核（dV/dT|_I = +0.020/−0.050/+0.045 V/K）✓；分歧预填值见 §3.2 表（A-5 行） |

| 项 | 声明 |
|---|---|
| I_lim 域硬条件 | I_lim = **150 A** > 137.5 A（load0=45 + load_step +20 极端角点电流——FCEXT §1.4 实读；裕度 12.5 A）；I ≥ I_lim 时 EQ-FCEC-1 浓差对数域破坏（NaN/非物理）——域守卫/钳位为实现轮裁定面（FC-IMP 登记，不静默——MG-IMP-Q1 同款） |
| 稳定性条件形态（A-3 冻结） | **h_st > ∂P_loss_W/∂T_st = α_ohm·R_ohm0·I²【W/K】**（W 记账口径——草案「/1000」宽松形态废止）；唯一温度依赖项为 R_ohm 线性项（闭式）；**批准轮复扫：137.5 A 角点裕度 +82.1875 W/K（3.17 倍）**（③）；FEC-8 裕度断言同口径（§4 项 4） |
| RK4 显式步长稳定域（A-6 新增登记） | dt·(h_st − α_ohm·R_ohm0·I²)/C_st ≲ 2.78（RK4 实稳定域）；dt = 0.01、域内最大 5.479e-4（④）——教学量级裕度大；FEC-7 半步自收敛兜底（实测散差 ≤2.4e-12 K） |
| **可行角点证据（A-7②）** | (α_ohm, R_ohm0, h_st) = (0.004, 0.5, 120) 于 137.5 A 角点：稳定性裕度 +82.1875 W/K > 0 ✓（③）+ 单调性 @ (137.5, 550 K) dV/dI = −1.012 V/A < 0 ✓（②）+ I_lim = 150 > 137.5 ✓——**角点可行三证齐** |
| 极端角点（load0=45 + step20 → I→137.5 A）复算 | I_fc(60) = 137.499989 A；T_st(60) = 401.669 K、T_ss(137.5 A) = 413.810 K（< 550 K 扫描上限——②域覆盖稳态渐近）；V_stack(137.5, T_st(60)) = 337.881 V；P_fc,true(60) = 46.459 kW；dSOC_true = −0.2272 pp / dE_bat = +0.0909 kWh（分歧值留 emit 复算冻结） |
| ±25 kW 包络重推 | 注册 5 Run 全量复扫：max\|P_bat,L1\| = healthy 10.000 / sensor 13.794 / monitor 10.000 / load_step **20.000（t0+ 网格点，= L0 冻结锚点——I≡50 ⇒ 口径偏差项零）** / actuator 18.685 kW——**全部 ≤ 25 ✓**；手拼角点（45+20）瞬态 31.828 kW 超包络——**L0 同角点 30 kW 亦超**（双侧同超实证）⇒ FCEXT §1.4「不得实现为全域硬检查」裁定在 on 域**适用性维持**（批准轮复核结论）；「不得实现为全域硬检查」为包络断言域 = 注册场景域 |
| load0=45 角点 | I→87.5 A 工作点稳态：V_stack(87.5, T_ss) = 378.424 V、P_fc,true = 33.112 kW、T_ss = 334.886 K（批准轮复算冻结）；无热保护动作局限沿袭（§1.6 ③） |
| 手拼配置 | normalizeConfig 不新增钳位（最小集预期——批准轮确认维持）；越域后果经 limitations 声明 |

## 4. golden 计划（fc001_v2 · 独立 oracle · oracle_base 出生接入 · 旧 golden 留档；本批准轮零改动——emit = FCECH-G2b-03）

| # | 项 | 内容 |
|---|---|---|
| 1 | 新 id 判据 | golden_id = **fc001_v2**——方程集扩展超出已批 FCEXT §1/§2 与 CONTRACT §5.2 面（ALINE §1.2 第三行）→ 模型/方法变更 → 新 id（ORACLE_INTERFACE_D2 §3.1）；保 id 重出不适用（非引擎行为零变更原地扩容）；supersedes 链 v2→v1 |
| 2 | 独立 oracle | 新文件——**Q2 定案：`tools/oracle/fc001_l1_oracle.py`**。独立性声明（fl001_l1/gt001_l1 先例）：不 import src/**、不 import fc001_oracle、方程与常量唯一权威文本 = 本规格批准文本（§1.4/§1.5 冻结值，含 E0_ref 闭式与十常量全精度硬编码）、Python stdlib（`python -I`）、自含硬编码；**出生即 oracle_base 接入**（六成员 + resolve_run_spec + write_golden_with_sidecar LF 钉死 + approval_block 三字段非 null 方可落盘 + SERIES_IDS 模块常量含 "t" 列）；golden 由本 oracle 只读生成、engine 只读比对（G0-DEC-16） |
| 3 | 数值方法 | **T_st**：经典 RK4 dt0.01（沿 GT-L1/FLTH 制度；**RHS 内 I_fc 冻结于子步起点值**——FLTH Q2 定案口径同构推荐，备选登记）；**I_fc/I_fc_ref**：保留 fc001_oracle 子步递推级联复刻（foStep 逐字——fc001_oracle.py 头注「按子步递推复刻引擎级联更新序」口径同源，engine.js:780-790 级联结构）；**I 冻结口径下 T_st ODE 子步内为线性常系数 ODE**（P_loss_W 对 T_st 线性——EQ-FCEC-4/6 结构推论）⇒ RK4 vs 子步解析交叉证据面成立（FLTH FL-7 同构；**批准轮预演实测 RK4−解析 = 1.137e-13 K、半步散差 ≤2.4e-12 K——§3.3 ④**） |
| 4 | 自检预案 | 新段 **FEC-1…n（Q8 定案 (a)）**：FEC-1 环境校验（fc001_v1 5 Run 标量逐位复现 ≤1e-9）；FEC-2 恒等式（r_true ≡ 0 / E_fc + E_bat ≡ E_load on 域逐点）；FEC-3 极化链单调性域抽查（dV/dI < 0 注册域全域——判据面以批准轮扫描复核：max −0.5018 V/A）；FEC-4 网格与事件相位（601 点、t[i]=i·dt、pre/post 语义）；FEC-5 锚点全表复算（§3.2 冻结值）；FEC-6 monitor 热面恒等（T_st 与 healthy 逐点同——预演 max\|ΔT\| = 0.0）；FEC-7 半步长自收敛登记 + RK4 vs 子步内解析指数交叉（判据按双实现实测散差 ×≥10 且下限 ≥1e-9 冻结制——FLTH A-2 同款；预演散差 ≤2.4e-12 K ⇒ 冻结点落 1e-9 下限）；FEC-8 无 NaN/Inf + 包络抽查（I_lim 域 + **稳定性裕度断言（W 口径——A-3 定案）：h_st − α_ohm·R_ohm0·I_max² > 0，I_max = 137.5 A 处 82.1875 W/K**） |
| 5 | Run 集（**Q6 定案 (a)**） | **镜像 fc001_v1 全集 5 Run、全部 electrochem_model=on**：healthy / closed_loop_fault / monitor_only / load_step_closed_loop / actuator_closed_loop（fc001_oracle.py RUNS :126-138 实读）；镜像判据（FLTH §4 项 4 / GT v3 镜像 6 Run 先例：新 id golden 镜像基线全集）；备选最小集不推荐 |
| 6 | 元数据（schema v2） | golden_schema_version="v2"；golden_id="fc001_v2"；model_id="fc.pem.l0"；**model_version = '1.1.0' 维持仅登记（Q1 定案 B——golden 语义由 golden_id 承载）**；method_id 提案 "fc001_l1_polarization_rk4_dt0.01"（fl001_thermal_rk4_dt0.01 句式先例）；engine_baseline=null；backend=null（留位）；electrochem_model:"on" 入 config 块（fl001_v2 thermal_model 先例）；supersedes="fc001_v1（L0 轨 electrochem_model=off，字节冻结留档）"；units 零新增预期；approval 三字段非 null 首签引批准 CHG-20261113-01；**SERIES_IDS 终值以 fc001_v1 golden series 键集实读 + 3 新信号核对为准（FCECH-G2b-03 核对面，不预断）**。另登记：fc001_v1 工件元数据失同步遗留**已闭合**（2026-11-04 9d8adba 重出闭环，工件实测 model_version=1.1.0——B-6 定案，删除草案开放表述） |
| 7 | 容差 tier（**Q7 定案 T-B**） | **T-B**（同法 RK4、独立双实现——ALINE §3；T_st 温度反馈非线性 ODE 无全局闭式 + 跨语言 bit-exact 无依据）；gate 块键面预案（T_K_atol / P_kW / I_A / E_kWh / SOC_pp / r_true_kW / **r_meas_kW_atol（B-4 定案补）** / t_s / **V 类键（V_stack_atol/V_stack_rtol——命名随 emit 实测冻结）**——量级预案非终值，按双实现实测散差 × 安全系数 ≥10 于 emit 冻结）；**B-4 定案（已实测）：verify_golden T-B 分派（verify_golden.py:207-227 实读）分支序 = _A/_Hz/_rpm/_K/_kPa/r_true/r_meas/_kW/SOC/_pct/兜底 `tol["f_Hz_atol"]`——无 `_V` 支：V_stack_V 序列键将落 f_Hz_atol 兜底（量纲错配 + KeyError 风险——T-B gate 块如无 f_Hz_atol 键则直接 KeyError）⇒ FCECH-G2b-03 新增 `_V` 分支 = 显式硬项（additive）**；标量面 K/V 单位（T_st_end_K/V_stack_end_V）走 metric_within T-B 末位兜底 `close_within(fv, gv, 1e-12, tol["SOC_pp"])` 支（fl001_l1 T_bat_end_K 现行先例——知悉即可）；超限降 T-C 并必附 convergence 块（双向预案） |
| 8 | verify_golden | 注册面为硬编码表（verify_golden.py MODELS dict）：新增 `import fc001_l1_oracle` + `MODELS["fc001_l1"]` 注册行（fl001_l1/gt001_l1 双 golden 并验结构镜像——V1_FACES 面②）；提案 i_true="I_fc_true_A" / i_meas="I_fc_meas_A"（沿 MODELS["fc001"] 现行映射）；scalars 面增 T_st_end_K / V_stack_end_V / P_loss_stack_end_kW 等；**B-5 定案：fc001_l1 验证并入载体 = DEFAULT_MODELS 追加**（verify_golden.py:173 `DEFAULT_MODELS = ["fl001", "fl001_l1"]` 实读——FL 先例形态）⇒ `DEFAULT_MODELS` 尾追加 "fc001_l1"，**步① 无参调用三 golden 顺序验证**（fl001 → fl001_l1 → fc001_l1）；**label 滞后说明**：现步① label「verify_golden fl001」自 V080 起已滞后于 fl001_l1 并入（先例在案沿用，不修——V120 DEC-5 同款维持登记），FC golden 挂载位置 = 同一步①无参调用序列尾；**MODELS["fc001"] 继续验 fc001_v1 零改动**（默认 off ⇒ 不重指向——FLTH §4 项 7 同构） |
| 9 | 预期失效面 | 新增 `data/golden/fc001_v2.json`(+`.sha256`)；既有 golden（9 份）**字节零变更**；engine-fc.test.js on 轨变体**并入现有步**；registry.test.js 哈希面**既有断言零变化 + additive 新断言**（B-1/B-2 定案形态）；FAULT_CATALOG §5 注记行（FC 电化学轨）；信号目录；UI 层级徽章变体 |
| 10 | 两门禁面（FLTH B-2 同构） | ① engine↔fc001_v2 T-B 比对面 = verify_golden fc001_l1 全轨 + engine-fc.test.js on 轨关键值断言；② **on 轨 approved_fc 验收路由：cfg.electrochem_model→golden 分派 off→fc001_v1 / on→fc001_v2**——fc001_v2 emit verify 通过前 on 轨不进 approved_fc 验收路径（不静默）；acceptance.keyValues 现值显式声明为 off 轨（fc001_v1）专用冻结锚点，on 轨 keyValues 由 fc001_v2 golden 承载、systems.js acceptance 面按 cfg 分域（FLTH A-3② 同构） |

## 5. G2b 排期与串行节奏（三阶段；与 P2/P3 串行引用）

1. **三阶段**：FCECH-G2b-01 本草案（V110 波 W2，2026-11-11）→ **FCECH-G2b-02 双路独立评审 +
   批准收口（已完成——本版：A:PASS_WITH_CONDITIONS(7)/B:PASS_WITH_CONDITIONS(7)，条件全按
   推荐落正文，批准经 CHG-20261113-01 指令链登记，GTL1-G2b-02 先例；规格更名 APPROVED
   v1.0）** → FCECH-G2b-03（oracle + fc001_v2 emit）/ 04（实现）随用户逐版本指令派发（工作面
   分解 §8）。
2. **与 P2/P3 串行节奏（V110 DEC-3 / A5 §5 引用，登记为跨轨排期约束、非工期承诺）**：
   **P2 FL（fl001_v3）排 P1 落地一个发布周期后**，且须显式重开「SOC 定义不动」裁定
   （A5 §2.2——批准留待用户）；**P3 GT（gt001_v4）草案可与 P1/P2 并行起草、实现严格串行**；
   本轨（P1）实现 = 串行链首环——P1 未落地前 P2 不启动批准、P3 不启动实现。
3. **实现时点**：用户逐版本指令派发（V120 DEC-1 采纳「本波两轮全做」——FCECH-G2b-03/04
   属本波 V120 工作面，I-4 纪律维持）。

## 6. 红线自查

### 6.1 I-1…I-5 逐条

| # | 红线 | 自查结论 |
|---|---|---|
| I-1 | 零第三方依赖 | PyBaMM 不引入（含后端侧——V072 DEC-3 :54 沿袭；**可撤销条款** :60 登记：撤销则 P1 地位重评，不预设）；RK4/foStep stdlib 自写；oracle stdlib（python -I） |
| I-2 | 数据诚实性 | 代数量不冒称 ODE 状态（V_stack/R_ohm/P_loss,stack 代数、I_fc 保留 L0 更新序——§1.3）；参数全表「教学整定值非实测」+ 十常量定案值 + 温度面符号教学叙事声明（A-7①）；L1-lite 诚实注（§1.2）；分歧方向为无条件结构推论（A-4 推导注）+ 预填值 emit 复算冻结（§3.2） |
| I-3 | 证据链 | 独立 oracle 新文件（不 import src/** / fc001_oracle）+ golden 只读生成（G0-DEC-16）+ off 轨逐位硬条件（§3.1——B-2 定案形态）+ **域扫描证据已入 §3.3**（单调性/稳定性/I_lim/锚点/自收敛/角点六项实测） |
| I-4 | 批准纪律 | 本规格已获批准（CHG-20261113-01 指令链，GTL1-G2b-02 先例）；验收路径仍两门禁（§4 项 10）：fc001_v2 emit verify 通过前 on 轨不进 approved_fc；实现须用户逐版本指令派发 |
| I-5 | 措辞红线 | 「模型深度导致的表达力差异」固定句式（ALINE §6.4——禁「更准确/更真实/工业级」）；P_loss_stack 叙事固定「是模型记账项，不是能量损失」句式（ALLOW 串）；定位句带「非机组/电网动态验证」；极化/热叙事全部带「教学整定/行为级」限定语（§6.3 预检表） |

### 6.2 classify 裁定点（scope.js:44-45）——**Q1 定案 B（cfg 键分域，2026-11-13）**

**现状实读（维持）**：scope.js:44-45 FC 分支硬校验 `modelId === 'fc.pem.l0' ∧ modelVersion ===
'1.1.0'`——与 FL 相反（FL classify 不消费 modelVersion，scope.js:20 `'fl001.1'` 维持
「不校验、仅登记」，FLTH §4 项 5 B-1 已评审核实）。

**定案：候选 B**——cfg 键分域（FL 先例形态）：modelId 'fc.pem.l0' + modelVersion '1.1.0'
维持（仅登记）；轨语义由 cfg 键 electrochem_model 承载；cfg→golden 分派 off→fc001_v1 /
on→fc001_v2（§4 项 10 两门禁面）；**classify 结构零改动**（现 FC 分支不检查 cfg 键——on/off
配置同过既有四族条件）；fc001_v2 元数据 model_version='1.1.0' 同值。定案理由（§6.2 对照表
四理由维持）：① 制度复用成本最低（FLTH B-1/B-2 双先例直接套用）；② 面⑥冻结面零触碰、
校验形态零新增；③ SystemDef 单 model_version 字段静态性使候选 A 须引擎派生（涟漪升级 +
哈希面波及）；④ golden 语义由 golden_id 承载。**显式 CHG 面（随本批准 CHG 登记）**：
① scenario EVENT_KEYS 新键 + declaresElectrochem 守卫（面③ additive——B-1 (a) 显式键
条件式哈希形态）；② on 轨配置进 approved_fc 条件面 = 白名单扩张声明（面⑥ additive——
「既有 Run 的分类永不静默改判」确认）；③ cfg→golden 分派两门禁面（§4 项 10）；④ scope.js
零触碰（定案 B 预期——若实现中证明必须触碰则停下显式 CHG，V120 §0 不做条款）。

（草案 v0.1 候选 A/B 对照表归档保留于 git 历史——本版按定案 B 收口，表体不重复。）

### 6.3 copy-guard 预查（实现期 `node tools/copy-guard.mjs` 终检；体例沿 FLTH §6.3）

| 提案串 | 高危子串核查 | 结论 |
|---|---|---|
| on 层级标签「L1 · 电堆极化与单节点热（数值仿真级）」 | 无禁词命中预期 | 0 命中预期 |
| A-fcec-params「教学整定值（非实测参数）」+「不代表 PEMFC 物性方向（A-7① 新增半句）」 | 「非实测」为 ALLOW 串（先剔 ALLOW 再匹配——copy-guard 次序纪律）；新增半句无禁词子串 | 0 命中预期 |
| P_loss_stack 定义「热损失功率（模型记账项）」+「不是能量损失」 | 「不是能量损失」为 ALLOW 串（G0-DEC-13 口径） | 0 命中预期 |
| 定位句「教学尺度电化学-热集总示意（L1-lite），非机组/电网动态验证」 | 「非机组/电网动态验证」为 ALLOW 串 | 0 命中预期 |
| 跨深度对比卡「模型深度导致的表达力差异」 | ALINE §6.4 固定句式 | 0 命中预期 |
| A-fcec-l1「不是经过验证的设备控制器或电堆电化学模型」 | 「经过验证」不含禁词「已验证」子串（FLEXT §1.2 F5 先例句式） | 0 命中预期 |

（本文在 FaultLab-evaluation/** 不扫描；实现轮文案迁入 src/** 前逐句预检 + copy-guard
终检双保险。）

## 7. G2b 进入条件五项自查表（SCOPE_SPLIT_MEMO §8.2）

| # | 进入条件 | 状态 |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：FC 无遗留缺陷清单（FCEXT G2b 已闭合 load_step/actuator 冻结解除；SCOPE §2 处置表无 FC 未关闭项）；本轨触发项 = A5 §4 提案 + V110 §1 DEC-3（FCECH-G2b-01 已交付） |
| ② | 独立 golden | **计划就绪（未产出）**：§4 fc001_v2 / fc001_l1_oracle（Q2 定案）/ 5 Run（Q6 定案）/ schema v2 / T-B（Q7 定案）。golden 后置系 V110 §0「只到草案+双路评审」授权的字面偏离**显式登记**（GTL1 §7.1 ② / FLTH §7.1 ② / MG001 §7 ② 先例同款）；emit = FCECH-G2b-03，落地并 verify 通过后本项闭合 |
| ③ | UI 措辞与未建模物理清单 | **就绪（本版冻结）**：§1.6 assumptions 6 条（含 A-7① 半句 / A-1 修正 A-fcec-meas）+ limitations 追加 4 项 + §6.3 预检表（实现轮迁入 src/** + 终检） |
| ④ | 用户书面批准 | **已闭合（2026-11-13）**：批准记录 = CHG-20261113-01（用户「统一采用推荐决策」指令链——GTL1-G2b-02 先例：用户指令链即书面批准记录）；双路评审 A/B 均 PASS_WITH_CONDITIONS，条件已全落正文（§10） |
| ⑤ | CHG 登记 | 起草授权 CHG-20261110-01（V110 §2 W2）已登记；**批准 CHG-20261113-01（V120 波）已登记** |

## 8. 实现排期提案（FCECH-G2b-01…04——MG-G2b 同构四步）

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| FCECH-G2b-01 | 键面/EQ-FCEC 草案级结构/参数面/涟漪登记/锚点结构预填/classify 二选一裁定点 + 草案 v0.1 | M | **已完成**（V110 波 W2，2026-11-11） |
| FCECH-G2b-02 | 双路独立评审（A 物理 7 条件 / B 治理 7 条件，均 PASS_WITH_CONDITIONS）+ 批准（CHG-20261113-01 指令链，GTL1-G2b-02 先例）+ 条件落正文 + Q1…Q9 定案 + 参数面十常量定案（域扫描证据 §3.3）+ 更名 APPROVED v1.0（本版） | M | **已完成**（V120 波 W1c，2026-11-13） |
| FCECH-G2b-03 | oracle 编写（fc001_l1_oracle.py——Q2 定案命名：oracle_base 出生接入 + RK4/级联复刻 + FEC 自检 + T-B 容差实测冻结/降 T-C 预案 + **域扫描 emit 硬条件复算（§3.3 六项判据面）**）+ fc001_v2 emit（Run 集 Q6 定案、schema v2、approval 首签引 CHG-20261113-01、sidecar LF 钉死）+ verify_golden `MODELS["fc001_l1"]` 注册行 + **DEFAULT_MODELS 追加（B-5 定案——步① 无参调用三 golden 顺序验证 + label 滞后说明沿用）** + **T-B 分派 `_V` 分支新增（B-4 定案显式硬项——additive）** + gate 键面实测冻结（V_stack_atol/V_stack_rtol 命名随 emit；r_meas_kW_atol 已入预案）+ FAULT_CATALOG §5 注记行 | M | **已完成**（V120 波 W2，2026-11-13：oracle + fc001_v2 emit + verify_golden 注册行 + `_V` 分支 + DEFAULT_MODELS 三 golden；证据 `evidence/g8/v120-release.md` §1/§4；CHG-20261113-02） |
| FCECH-G2b-04 | 实现：engine simulateFC001 电化学分支（early-return 先例同构，off 路径逐字不动）+ systems.js（defaults 键 + 3 新信号 + **A-fcec-* 6 条与 on 域 limitations/EQ 挂模型级 additive 子对象（B-2 定案——既有五数组逐字节不动）** + level/summary 变体 + model_version 维持（Q1 定案 B）+ **normalizeConfig 盖章行**）+ scenario EVENT_KEYS/declaresElectrochem 守卫（显式 CHG；**B-1 (a)：显式键才入归一化事件与 hashProjection，缺省轨只在 normalizeConfig 盖章**）+ checks.js FC 分支 on 域适配（**A-1 定案核验结论：conservation-meas 无需适配——checks.js:233-258 实读判据域：非故障无噪声局 ≤1e-6（healthy 局 r_meas ≡ 0.4·b = 0 经整定依据④核验全轨成立、实测裕度 10⁶ 倍）；故障局 warn 支既有承载口径偏差项**）+ acceptance.keyValues 分域（FLTH A-3② 同构）+ 两门禁面（cfg→golden 分派，§4 项 10）+ UI（inspector/跨深度对比卡/因果模板变体——零新事件族，模板为既有三族变体节点）+ tests engine-fc 变体并入现有步 + off 轨 run_hash 逐位验收（§3.1 项 3 B-2 形态）+ copy-guard 终检 + **步数账 CHG 申报（I-7：0 新步预期——并入现有步；确需新增按彼时步账显式申报）** + **盖章双落点（B-7 定案）：engine.js normalizeConfig 盖章行（:195-197 thermal_model 块后同构新行）+ systems.js defaultConfig 公共 API 盖章行（:3075-3078 `if (s.defaults.thermal_model)` 行后同构新行——两处都新增 electrochem_model 行；systems.js:142 为 defaults 声明面、非 normalizeConfig——草案 §1.1 混同表述已订正）** | L | **已完成**（V120 波 W3–W5，2026-11-13：引擎 on 轨 + scenario/schema/UI + tests（+246）+ **0 新步**（35 维持）+ off 轨 run_hash 逐位验收（发布轮探针 6ac0ae17… 两版同值，v120-release §5）；CHG-20261113-02） |

## 9. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | 极化链常量整定失当（注册域非单调 / 工作点偏离铭牌过大 / 分歧方向与教学叙事不符） | **已消除（批准轮）**：十常量定案 + 域扫描六项证据入 §3.3（单调性 max −0.5018 V/A / 锚点残差 0.0 / 三角点方向裕度 +0.206/−1.034/+0.315 kW）；emit 时 FEC-3/FEC-5 复算兜底 |
| R-2 | 浓差域越界（I ≥ I_lim → 对数域破坏 NaN/非物理） | I_lim = 150 A > 137.5 A 域硬条件（裕度 12.5 A）+ 域守卫/钳位实现轮裁定面（登记不静默）+ FEC-8 包络抽查 |
| R-3 | classify 二选一未决阻塞批准轮 | **已闭合（批准轮）**：Q1 定案 B（§6.2）——scope.js 结构零改动 |
| R-4 | fc001_v1 / fc001_oracle.py 字节被实现轮误触（V-03 哈希失配 → 冻结锚点报废）——**B-2 定案改写** | §0 不动清单 + FCECH-G2b-03/04 工作面不含既有文件 + **off 轨零变化验收面重述（§3.1 项 3）**：model_hash 具名九字段哈希域（engine.js:519-529）+ run_hashInput（registry.js:46-58）实读裁定 ⇒ additive 子对象方案下既有输入全部零变化，off 轨 run_hash 逐位不变可实现（判据 = t/signals/metrics/checks/config_hash + fc001_v1 golden 比对零变化 + run_hash 逐位同）；**additive 子对象落点纪律：on 轨声明面不触碰既有五数组、不加入 :519-529 hashObject 输入清单**（回退案见 §3.1 项 3）+ 全量回归兜底 |
| R-5 | T-B 双实现散差超预案（libm ln/exp 差异——极化链对数项密集，散差可能大于 FLTH 幂/指数面） | 容差按双实现实测散差 × 安全系数 ≥10 冻结（FEC-7；预演散差 ≤2.4e-12 K——§3.3 ④）+ 超限降 T-C + convergence 块（双向预案）+ 禁 ULP 级承诺 |
| R-6 | 教学参数被误读为 PEMFC 设备参数辨识 | A-fcec-params 非实测声明 + **温度面符号教学叙事半句（A-7①——真实 dE_rev/dT<0）** + §1.5 四整定依据 + I-5 自查（FLTH R-11 同款） |
| R-7 | r_meas 口径扩展被误读为「测量链升级 / 守恒破缺 / 残差失效」 | A-fcec-meas 显式声明（**A-1 修正表述：口径偏差项参考工作点为零、healthy 全轨 I≡50 + ④ ⇒ 全轨为零；偏离工作点显非零——模型已知结构项、非测量故障**）+ 恒等式扩展登记（EQ-FCEC-7）+ 守恒面声明（§1.4——零 FLTH-Q1 类裁定需求）+ conservation-meas 无需适配核验结论（§8 FCECH-G2b-04） |
| R-8 | 步数账超支（I-7） | 0 新步预期（变体并入现有步）+ FCECH-G2b-04 归口 CHG 显式申报；批准轮零接线（§0 不动清单延续至实现轮前） |
| R-9 | scenario 键/盲包指纹语义漂移（默认轨歧义、Arena 钉轨） | 默认 off ⇒ 盲包语义零变化（§1.1 ④）+ **B-1 (a) 显式键条件式哈希形态 ⇒ 既有 FC 场景 scenarioHash 零变化** + 新信号不入池显式声明 + EVENT_KEYS additive 显式 CHG + Arena 锁定面登记不预设 |

## 10. 评审记录与条件处置（FCECH-G2b-02 收口回填——体例沿 PV001 §11 / MG001 §10）

### 10.1 评审记录

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | EQ-FCEC 自洽与量纲、单调性域、守恒面与热记账、r_meas 扩展口径、稳定性条件推导、锚点复算、L1 判据对照 | **PASS_WITH_CONDITIONS(7)**（A-1…A-7） | 记账基 W 口径修正（A-3）；r_meas healthy 局表述修正（A-1）；新增强制整定依据④ k_E = 50·α_ohm·R_ohm0（A-2(i)）；方向声明升级无条件结构推论（A-4）；记账基登记（A-5）；RK4 稳定域登记（A-6）；教学叙事符号声明 + 可行角点 + 两处勘误（A-7） |
| 评审人 B（治理/口径/回归面） | 五项进入条件、Q1…Q8 裁定点、classify 二选一、copy-guard、golden 治理与 verify_golden 注册面、不动清单、步数账、契约面 additive 核对 | **PASS_WITH_CONDITIONS(7)**（B-1…B-7） | 场景哈希形态偏离先例采 (a)（B-1）；run_hash 声明面承载形态两步裁定——实读采 additive 子对象方案（B-2）；config_hash 投影不入 + 已知局限登记（B-3）；T-B `_V` 分支缺失实测 + gate 键面补全（B-4）；DEFAULT_MODELS 并入载体（B-5）；遗留闭合（B-6）；盖章双落点（B-7） |
| 用户批准 | 批准与实现排期（V120 DEC-1：本波批准+实现两轮全做） | **批准（2026-11-13）** | **批准记录：CHG-20261113-01（用户 2026-11-13「统一采用推荐决策」指令链——GTL1-G2b-02 先例：用户指令链即书面批准记录，WT-001/MG-001 同例）**；DEC-1…8 全采推荐项；实现 FCECH-G2b-03/04 随本波用户逐版本指令派发 |

### 10.2 条件处置追记（A-1…A-7 / B-1…B-7 逐项——条件 → 处置（全按推荐）→ 落点）

| 条件 | 处置 | 落点（节号） |
|---|---|---|
| A-1（P1）r_meas healthy 局表述修正 | 采推荐（含 A-2(i) 注意分支）：全文改「口径偏差项在参考工作点 (I=50 A, T_st(0)) 处为零；偏离工作点显非零口径偏差——模型已知结构项、非测量故障」；因 A-2(i) 采纳，healthy 局 r_meas ≡ 0.4·b = 0 全轨精确成立（I≡50 恒值 + ④）——conservation-meas 适配面改为核验结论（checks.js:233-258 实读：非故障无噪声局 ≤1e-6 判据、healthy 实测裕度 10⁶ 倍；故障局 warn 支既有承载）并写入 §8 | §1.5 整定依据① / §1.6 A-fcec-meas / §3.2 r_meas 行 / §3.2 分歧表 r_meas 行 / §11 Q5 理由 / §8 FCECH-G2b-04 / §9 R-7 |
| A-2（P1）采 (i)：新增强制整定依据④ k_E = 50·α_ohm·R_ohm0 | 采推荐：④ 入整定依据声明列；k_E 行符号域钉正（≥0 恒等式承载）；healthy 全轨 V_stack(50,·) ≡ 400 V 精确恒等 + P_fc≡20 kW / P_bat≡10 kW / SOC/E_bat/r_meas 与 L0 逐位同（实测 +0.0 pp / 2.8e-17 kWh）写入 | §1.5（④声明 + k_E/E0_ref 行）/ §1.4 EQ-FCEC-5 说明列 / §3.2 健康表 + 推导注 / §3.3 ①⑤ |
| A-3（P1）单位链修正——ODE 侧 W 记账 | 采推荐：EQ-FCEC-3 改 C_st·dT/dt = P_loss_W − h_st·(T−T_amb)；EQ-FCEC-4 改 P_loss_W = (E0−V_stack)·I【W】、信号面 P_loss_stack_kW = P_loss_W/1000；稳定性界冻结 h_st > α_ohm·R_ohm0·I²【W/K】、137.5 A 处复扫（120 > 37.8125，裕度 82.1875 W/K）——草案「/1000」宽松形态废止 | §1.4 EQ-FCEC-3/4 / §1.3 P_loss 行 / §1.5 h_st 行 / §3.3 稳定性条件形态行 / §4 项 4 FEC-8 |
| A-4（P2）§3.2 三行方向声明按 A-2(i) 改写 + 推导注 | 采推荐：升级为无条件结构推论（单调性项 + 同号漂移项；α_ohm=0 时第一项独立承载），推导注随表 | §3.2 方向声明推导注 |
| A-5（P2）记账基登记 | 采推荐：EQ-FCEC-7 补「on 域 SOC_true/E_bat/P_bat 按 P_fc,true 重算（真实功率基）；SOC_est 与 L0 逐位同；SOC_err_pp 签名面随之变化」；分歧预期表补 SOC_true(60)/E_bat(60) 行（预填值——**A-2(i) 下 healthy/monitor 局逐位同恢复，分歧行只对故障局登记**） | §1.4 EQ-FCEC-7 / §3.2 分歧表 A-5 行 |
| A-6（P3）RK4 显式步长稳定域登记 | 采推荐：§3.3 新增行——dt·(h_st − α_ohm·R_ohm0·I²)/C_st ≲ 2.78；实测 5.479e-4（dt=0.01）；FEC-7 半步自收敛兜底 | §3.3 RK4 稳定域行 / §4 项 7 |
| A-7（P3）教学符号声明 + 可行角点 + 勘误 | 采推荐：① A-fcec-params 加温度面符号半句；② 137.5 A 角点可行证据（稳定裕度/单调性/I_lim 三证）入 §3.3；勘误两处——§3.2 I_fc(60)=40 A 引用面改指 G0-DEC-15/systems.js keyValues（FCEXT 仅覆盖 75/27.5）、行号漂移按语义锚点加注不改引文 | §1.6 A-fcec-params / §3.3 可行角点证据行 / §3.2 引用面订正 + §2 行号漂移注 / 头部行号基准说明 |
| B-1（P1）采 (a)：偏离 thermal/inertia 先例——显式键才入哈希 | 采推荐：electrochem_model 仅在场景输入显式提供时写入归一化事件与 hashProjection（scenario.js hashProjection :452-479 同构点）；缺省轨解析只在引擎 normalizeConfig 盖章层发生；理由 = face③ 冻结边界原文（V1_FACES:184-186）禁止缺省轨入哈希形态（热/惯量哈希变化发生在 v0.x 宽容期）⇒ 既有 FC 场景 scenarioHash 零变化；偏离先例及理由登记入 §2 与 Q9 | §2 哈希形态行 / §11 Q9 / §9 R-9 |
| B-2（P1）run_hash 声明面承载形态（两步裁定） | 采推荐：第一步实读裁定——model_hash 为具名九字段固定清单哈希（engine.js:519-529 实读：model_id/model_version/assumptions/limitations/equations/units/claims/unit_system/equation_ids；非整对象哈希）+ runHashInput（registry.js:46-58 实读）⇒ **采新 additive 子对象方案（首选成立）**：on 轨声明面挂 SystemDef 模型级 additive 字段（electrochem 子对象，置于哈希域外），既有五数组逐字节不动，UI 按轨条件渲染；model_hash/run_hash/config_hash/scenarioHash 既有输入全部零变化、§3.2 零涉；回退案登记不启用；裁定过程与结论入项 3/项 4 合并重述 + R-4 改写 | §3.1 项 3/项 4（合并重述）/ §2 契约面行 / §9 R-4 / §8 FCECH-G2b-04 |
| B-3（P2）采 (a)：scenarioView 不入 electrochem_model | 采推荐：config_hash 投影不入（thermal_model 先例——schema.js 现状即不含，:129-144 实读）；显式登记已知局限「FC on/off 两轨 config_hash 同值（FL 现状同款），轨区分由 run_hash/序列内容承载——不静默」 | §2 config_hash 投影行 / §3.1 项 3 |
| B-4（P2）T-B gate 键面裁定升级 | 采推荐：升级为「已实测」——verify_golden T-B 分派（:207-227）无 `_V` 支、_V 键落 f_Hz_atol 兜底（量纲错配/KeyError 风险）⇒ FCECH-G2b-03 新增 `_V` 分支 = 显式硬项（additive）；gate 键面预案补 r_meas_kW_atol 与 V 类键（命名随 emit 实测冻结）；标量 K/V 走 metric_within T-B 末位 SOC_pp 兜底支为 fl001_l1 现行先例（知悉即可） | §4 项 7 / §8 FCECH-G2b-03 |
| B-5（P2）fc001_l1 验证并入载体显式登记 | 采推荐：DEFAULT_MODELS 追加（verify_golden.py:173 实读——FL 先例形态）⇒ 步① 无参调用三 golden 顺序验证 + 步① label 滞后说明（「verify_golden fl001」自 V080 起滞后于 fl001_l1 并入，先例在案沿用，FC golden 挂载位置 = 步① 序列尾） | §4 项 8 / §8 FCECH-G2b-03 |
| B-6（P3）fc001_v1 工件元数据遗留改判 | 采推荐：改为「已闭合遗留（2026-11-04 9d8adba 重出闭环，工件实测 model_version=1.1.0）」，删除开放表述 | §4 项 6 |
| B-7（P3）FCECH-G2b-04 盖章双落点补全 | 采推荐：§8 FCECH-G2b-04 补 engine.js normalizeConfig 盖章行（:195-197 附近）+ systems.js defaultConfig 公共 API 盖章行（:3075-3078 附近）——两处都新增 electrochem_model 行；§1.1「systems.js:142 normalizeConfig」混同表述订正（:142 为 defaults 声明面） | §8 FCECH-G2b-04 / §1.1 |

## 11. Q 点清单（**Q1…Q9 已定案（2026-11-13，FCECH-G2b-02）**——MG-DRAFT-Q 体例 + MG001 §11 定案记录体例）

| # | 问题 | 候选 | **定案 + 一句话理由** |
|---|---|---|---|
| Q1 | scope.js:44-45 classify 硬校验二选一（核心裁定点） | (A) model_version 升位 + 域校验；(B) cfg 键分域、scope 零改动 | **定案 B**（CHG-20261113-01 指令链全采推荐）——FLTH B-1/B-2 双先例制度复用成本最低 + SystemDef 单 model_version 字段无按轨静态落点（§6.2 四理由维持；scope.js 零触碰） |
| Q2 | oracle 文件命名 | fc001_l1_oracle.py（深度层命名）；fc001_echem_oracle.py（物理面命名） | **定案 fc001_l1_oracle.py**——fl001_l1/gt001_l1 命名与 MODELS 键镜像先例；FC 当前唯一登记深化轨即本轨、无歧义；若未来第二深化轨出现再立命名裁定（登记不预设） |
| Q3 | P_loss,stack 记账口径 | (a) (E0 − V_stack)·I 按构造自洽、零新增常数；(b) 独立热力学电势 E_th(T_st) 拆分 | **定案 (a)**（W 基——A-3 联动）——与 EQ-FCEC-1 三损失项按构造自洽（「三损失全部转化为热」教学叙事强）、零新增常数；(b) 加常数 + 拆分口径裁定面 |
| Q4 | 浓差项形态与 I_lim | (a) 对数式 c_conc·ln(I_lim/(I_lim−I))；(b) 线性近似（最小集） | **定案 (a)**——与活化项对数形态同族、浓差常规形、I_lim 同时承载域硬条件（150 > 137.5）；(b) 损失 I_lim 域语义、单调性域声明弱化 |
| Q5 | 测量换算与 r_meas 口径（含 V_stack 参考工作点整定） | (a) 铭牌恒压换算 + r_meas 扩展恒等含口径偏差项 + V_stack(50 A, T_st(0))=400 V 整定；(b) 测量链升级 V_stack 口径（r_meas = 0.4·b 纯净维持） | **定案 (a)**——测量/控制链零升级（行为级口径）；**healthy 局口径偏差项全轨为零（A-1 修正表述：参考工作点 (I=50, T_st(0)) 为零 + I≡50 恒值 + 整定依据④温度不变性 ⇒ 全轨为零——r_meas ≡ 0.4·b = 0 锚点纯净维持）、故障局新增「恒压口径偏差」教学点**；(b) 要求测量链知晓 V_stack 非物理、涟漪大 |
| Q6 | golden Run 集 | (a) 镜像 fc001_v1 全集 5 Run 全 on；(b) 最小集 2 Run（healthy + load_step） | **定案 (a)**——新 id golden 镜像基线全集先例（FLTH v2 镜像 4 Run / GT v3 镜像 6 Run）+ sensor_drift 跨深度对比主教学点 + monitor 不变量判据面 |
| Q7 | 容差 tier | T-B（RK4 双实现方法等价）；T-A（不承诺理由登记）；超限降 T-C + convergence | **定案 T-B**——T_st 温度反馈非线性 ODE 无全局闭式 + 跨语言 bit-exact 无依据（FLTH/GTL1 同制）；gate 键面终值 emit 实测冻结（B-4 定案形态） |
| Q8 | oracle 自检编号段 | (a) 新段 FEC-1…n；(b) SC-11… 续编 | **定案 (a)**——新文件新段先例（fl001_l1 FL-1…8 / gt001_l1 GL-1…8）；SC-x 为 fc001_oracle.py 专属证据链，续编混淆两文件 V-03 追溯面 |
| **Q9**（B-1 新增） | scenario 新键哈希形态（是否沿 thermal/inertia「缺省轨解析入哈希」先例） | (a) 显式键才入归一化事件与 hashProjection、缺省轨只在 normalizeConfig 盖章；(b) 沿热/惯量先例缺省轨入哈希 | **定案 (a)**——face③ 冻结边界原文「新键只影响使用它的输入，既有场景解析与哈希不变」（V1_FACES:184-186）禁止缺省轨入哈希形态（热/惯量先例的既有场景哈希变化发生在 v0.x 宽容期、属登记预期失效面——八面冻结后不可复制）；采 (a) 保「既有 FC 场景 scenarioHash 零变化」；代价 = 缺省轨不入 scenarioHash（轨区分由引擎盖章层 cfg 与 run_hash/序列内容承载——§2 已知局限登记不静默） |

**定案记录（2026-11-13，FCECH-G2b-02）**：Q1…Q9 全部按推荐项定案（批准授权 = CHG-20261113-01
用户指令链「统一采用推荐决策」，GTL1-G2b-02 先例——MG-DRAFT-Q1…Q7 定案同款体例）。定案
落点：Q1 → §6.2（classify 零改动）+ §4 项 6/项 10（model_version 维持 + cfg→golden 分派）；
Q2 → §4 项 2/§8；Q3 → §1.4 EQ-FCEC-4（W 基——A-3 联动）；Q4 → §1.4 EQ-FCEC-1 + §1.5；
Q5 → §1.4 EQ-FCEC-7 + §1.5 整定依据①/④ + §1.6 A-fcec-meas（A-1 修正表述）；Q6 → §4 项 5；
Q7 → §4 项 7（B-4 升级形态）；Q8 → §4 项 4；Q9 → §2 哈希形态行（B-1）。全部定案随本版
冻结；实现轮（FCECH-G2b-03/04）不再重开（如实现中证明不可行，停下显式 CHG——V120 §0 条款）。

---

**修订记录**：
- v0.1（2026-11-11 初稿，A-5 P1 FC 规格起草人，V110_WAVE_DESIGN §2 W2 / CHG-20261110-01
  授权链）：现状基线实读（§0：FC 纯 L0 / fc001_v1 5 Run / SC-1…10 / scope.js:44-45 /
  MODELS["fc001"] / 33 步）；键面 electrochem_model 单键默认 off（§1.1）；L1 判据对照与
  L1-lite 诚实注（§1.2）；状态向量与新物理量表（§1.3）；EQ-FCEC-1…7 草案级（§1.4，含守恒
  面声明）；参数面 12 项（§1.5，数值一律批准轮定案 + 三整定依据）；assumptions 6 条 /
  limitations 4 项 / UI 变体（§1.6）；场景/哈希/盲包/契约面 additive 核对（§2）；off 轨
  零变化硬条件三层佐证 + on 轨锚点结构（数值留批准轮——§3.1/3.2）+ 包络角点（§3.3）；
  golden 计划十项（§4）；排期三阶段与 P2/P3 串行引用（§5）；红线自查 I-1…I-5 + classify
  二选一对照表（推荐候选 B——§6.1/6.2）+ copy-guard 预查（§6.3）；五项进入条件（§7）；
  FCECH-G2b-01…04（§8）；风险 R-1…R-9（§9）；评审记录留空结构（§10）；Q1…Q8 不定案（§11）。
- **v1.0（2026-11-13 批准轮收口，FCECH-G2b-02，CHG-20261113-01 授权链——A/B 两路 14 条件
  全按推荐落正文）**：头部更名 APPROVED v1.0 + 冻结效力声明 + 批准记录（GTL1-G2b-02 先例）
  + 行号基准说明更新（批准轮实读复核点列明）；§0 边界改批准权威文本面（不动清单维持）；
  §1.1 盖章先例表述订正（B-7——engine.js:195-197 为 normalizeConfig、systems.js:142 为
  defaults 声明面）；§1.3 P_loss_stack_kW 改 P_loss_W/1000（A-3）；§1.4 EQ-FCEC-3/4 改 W
  记账（A-3）+ EQ-FCEC-5 补 k_E = 50·α_ohm·R_ohm0 恒等式（A-2(i)）+ EQ-FCEC-7 补记账基
  （A-5）与 r_meas 修正表述（A-1）；§1.5 十常量定案值 + 整定依据④ + h_st 行 W 口径稳定性
  界（A-2/A-3）；§1.6 A-fcec-params 温度面符号半句（A-7①）+ A-fcec-meas 修正（A-1）+
  A-fcec-heat W 口径；§2 哈希形态行改 B-1 (a) 显式键条件式（偏离热/惯量先例及理由）+
  config_hash 投影不入（B-3）+ 行号漂移注（A-7）；§3.1 项 3/项 4 按 B-2 定案合并重述
  （model_hash 具名九字段哈希域实读裁定 + additive 子对象方案 + 回退案登记 + 既有断言零
  变化）；§3.2 健康表冻结值 + 分歧表预填值（含 A-5 SOC_true/E_bat 行、monitor/healthy 逐位
  同行）+ r_meas 行修正（A-1）+ I_fc(60)=40 A 引用面订正（A-7）+ 方向声明推导注（A-2/A-4）；
  §3.3 域扫描证据节（六项判据数值）+ RK4 稳定域行（A-6）+ 可行角点证据行（A-7②）+ 稳定性
  条件 W 口径冻结 + 包络复扫 + 手拼角点复算；§4 项 3 预演数值、项 4 FEC-8 W 口径裕度断言、
  项 6 model_version 维持 + B-6 遗留闭合、项 7 T-B 定案 + B-4 `_V` 分支显式硬项 + gate 键面
  补全、项 8 B-5 DEFAULT_MODELS 追加 + label 滞后说明、项 10 两门禁维持；§5 FCECH-G2b-02
  已完成回填；§6.1 I-2/I-3/I-4 更新、§6.2 Q1 定案 B 收口（对照表归档 git 历史）、§6.3 新增
  半句预检行；§7 ④⑤ 闭合；§8 FCECH-G2b-02 已完成 + 03/04 工作面更新（B-4/B-5/A-1 核验
  结论/B-7 双盖章落点）；§9 R-1/R-3 已消除 + R-4 按 B-2 改写 + R-7 A-1 表述 + R-9 B-1 形态；
  §10 评审记录回填（A/B verdict + 用户批准行）+ §10.2 条件处置表（A-1…A-7/B-1…B-7 逐条
  条件→处置→落点）；§11 Q1…Q9 定案（新增 Q9）+ 定案记录段；文件尾状态行同步。

**状态 `APPROVED v1.0`**：双路独立评审 A:PASS_WITH_CONDITIONS(7) / B:PASS_WITH_CONDITIONS(7)
+ 用户批准（CHG-20261113-01 指令链，GTL1-G2b-02 先例）已于 2026-11-13 闭合；条件 A-1…A-7 /
B-1…B-7 全部落正文（§10.2）；Q1…Q9 定案（§11）；实现随 FCECH-G2b-03/04（用户逐版本指令
派发——V110 DEC-3：P2 排 P1 落地一个发布周期后，P3 实现严格串行）。

**文件结束**。FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0（2026-11-13，FCECH-G2b-02 收口，
批准记录 CHG-20261113-01）。本规格为 oracle/引擎唯一权威文本（EQ-FCEC/常量/锚点数值已
冻结）；golden/代码工件零触碰（emit = FCECH-G2b-03）；Q1…Q9 已定案（§11）；本规格批准
不自动打开任何验收路径（§4 项 10 两门禁面）。
