# FL001_THERMAL_G2B_SPEC_DRAFT — FL-001 电池单节点集总热模型 G2b 物理规格（DRAFT v0.1）

> **任务**：A-4b FL-001 热模型 G2b 规格起草（V06_ROADMAP §2 主线 A A-4b 行；V072_WAVE_DESIGN
> §1 DEC-2 / §2 T7）。
> **授权**：V072_WAVE_DESIGN v1（CHG-20261105-01，2026-11-05 批准，按推荐执行）阶段一
> T7「A-4b FL 热模型 G2b 草案」。**DEC-2：本波只到草案 + 双路评审（批准留待用户）；
> 批准与实现（fl001_v2 + 轨实现）待用户裁定后入 v0.8.0**（V072 §1 DEC-2/DEC-5）。
> **前置**：FL-001 现为 L0 解析双故障族基准系统（systems.js:117-315 EQ-1…EQ-6/EQ-A/EQ-B；
> P=0.4×I 恒压等效、理想母线、r_true/r_meas 定义恒等）；L1 制度先例 = GTL1_G2B_SPEC_APPROVED
> v1.0（RK4/T-B/oracle_base 出生接入/分歧预期表体例）；G2b 结构先例 = PV001_G2B_SPEC_APPROVED
> v1.0；治理依据 = SCOPE_SPLIT_MEMO §8.2。**本草案为新增状态变量/新物理（方程集扩展）**，
> 按 ALINE_MODEL_DEPTH_DESIGN §1.2 第三行 → **完整 G2b**（双路评审 + 用户批准）。
> **状态**：`DRAFT`（v0.1，2026-11-05，A-4b 规格起草人起草）——待双路独立评审
> （FLTH-G2b-02：物理 A / 治理 B）+ 用户书面批准；**批准与实现 v0.8.0**。
> **本波纪律符合性**：golden 零变更（既有 6 golden 字节冻结，本文档只提案不 emit）、
> engine.js 零改动、tools/oracle/** 零触碰、零第三方依赖、零新仿真轨（本草案为
> v0.8.0 实现轮的规格输入）；数值预填由临时复算脚本独立计算（Python stdlib，`python -I`，
> L0 冻结锚点 3 轨环境校验 + thermal on 四轨 RK4 + 半步长自收敛，记录见 §3.5，
> **脚本已按任务纪律删除**）。
> **Q-4 三守卫适用**：新方程集入引擎须走 G2b（即本文档流程）；许可证自研零依赖
> （RK4 stdlib 自写 / 浏览器原生 JS，无 TESPy/PyBaMM 类对照轨本波提案）；验收路径禁入
> 直至批准（本波 golden/oracle/引擎全链零触碰，§0 不动清单）。
> **行号基准说明**：本文档行号引用为**起草时点（2026-11-05）实读值**——本波 v0.7.2 残留
> 清算（V072 §2 T1…T6：checks.js/schema.js/systems.js/scenario.js 等）与本草案**并发执行**，
> 上述文件行号在清算落地后会漂移；实现轮（FLTH-G2b-03/04）以**语义锚点**（信号 id/检查 id/
> 函数名/登记注释）为准定位，行号仅作评审快速索引。

---

## 0. 定位摘要与红线声明

- **FL-001 thermal 轨（L1 · 单节点集总热最小集）**：在 FL-001 既有 L0 行为级轨**之外**新增
  `thermal_model: off|on` 配置开关（默认 **off**）——on 时为电池新增**单节点集总热容状态
  T_bat**（ODE，EQ-FLTH-4）与内阻温度面 R_int(T_bat)（EQ-FLTH-2）及热损耗功率
  P_loss = I_true²·R_int（EQ-FLTH-3）；**电气面（I_true 一阶闭环、P_bat=0.4·I_true、SOC 定义、
  测量链、故障族注入面、60 s/dt=0.1/601 点库口径）全部原样**（§2.2 EQ-FLTH-1；
  plants/fl001.js stepOf 序列逐字保留）。thermal 轨的教学点 = 同故障 L0 ↔ L1-thermal 跨深度
  对比（温升路径 / 损耗补偿的跨深度分歧，V072 DEC-2「教学点」行；分歧预期表 §3.2）。
- **层级关系**：thermal on 与 off 并存、不替换（ALINE §12「L1 替换 L0 不做」同款；L0 轨
  永久保留为对比轨与 P0 验收轨）。**措辞红线**：跨深度差异解释只说「模型深度导致的表达力
  差异」，禁「更准确/更真实/工业级」（ALINE §6.4 / copy-guard 词表，预检 §6.3）。
- **守恒面声明（草案核心难点，Q1 裁定点）**：P_loss = I_true²·R_int 的能量去向是本草案
  最大的结构裁定——**推荐方案 (a) 进母线平衡**（P_gen = P_load − P_bat + P_loss，
  r_true/r_meas 定义恒等扩展含 −P_loss 项，教学叙事「热损耗由发电机补偿」）；备选
  (b) 损耗离场破坏 E 恒等式、涟漪大（全案对照与推荐理由见 §2.2 守恒面裁定节 +
  §11 FLTH-DRAFT-Q1）。
- **不动清单（本草案与批准轮均适用，直至实现轮显式 CHG）**：
  ① `tools/oracle/fl001_oracle.py` 及全部 5 个既有 oracle 零改动（V-03 字节语义，
  ORACLE_INTERFACE_D2 §5.2）；fl001_v2 由**新文件** fl001_l1_oracle.py 承接（出生即
  oracle_base，§4 项 2），fl001_oracle.py 物理零触碰；
  ② `data/golden/` 既有 6 golden（含 fl001_v1 + .sha256 sidecar）**字节冻结留档**（V072 §0）；
  ③ engine.js FL-001 既有物理面逐字不动：`simulateFL001Plant`（engine.js:502-568）、
  `simulateFL001` 内联 actuator 路径（engine.js:570-639）、`fl001PlantCapable`（engine.js:498-500）、
  plants/fl001.js 全文件（I-11 S1 移植字节纪律，plants/fl001.js:11-13）——thermal 分支为
  simulateFL001 **顶部新增 early-return**（engine.js:832 GT thermo 分支先例同构，§2.0）；
  ④ 不引入第三方依赖（I-1）；⑤ 不触碰 tools/oracle/**（V072 §0 本波禁区）。
- 时间尺度沿库口径：duration 60 s、输出网格 dt=0.1（601 点）、积分子步 0.01、默认注入
  t=20 s（FAULT_CATALOG §0；GT001_G2B_SPEC_APPROVED §4 网格决策）。

## 1. L1 定义符合性（对标 ALINE §1.1 判据）

### 1.1 层级判定

ALINE §1.2 转换判定第三行：**新增状态变量/新物理（方程集扩展）→ 完整 G2b**——本草案即该
判定实例（FL-001 已批范围 = MODEL_VALIDATION_SPEC §1.2/§1.3 八条解析式 + 理想功率平衡，
systems.js:295-304 EQ-1…EQ-6/EQ-A/EQ-B；热状态超出该范围）。ALINE §1.1 L1 定义
（:37-39）：「方程不可手解，需专用积分器，golden 由独立数值 oracle 生成」，判据列
「新物理状态变量（温度/浓度/压力等）」。逐条对照：

| ALINE §1.1 L1 判据 | 本提案对应 | 满足声明 |
|---|---|---|
| 新物理状态变量 | 电池温度 **T_bat** 为新动态状态（单节点集总热容 ODE，EQ-FLTH-4） | ✔ 1 个动态温度状态（诚实声明：单状态、非高维/刚性——L1-lite 形态，见下行豁免注） |
| 方程不可手解 | T_bat 的 RHS 经 R_int(T_bat) 依赖 T_bat 本身（温度反馈）；RHS 分段连续非闭式可解 | ✔ 全局无闭式解（分段事件 + 温度反馈）；**子步内**在 I 冻结口径下退化为线性常系数 ODE（解析交叉检查成立，§3.5/C——此为自检增强面，非「可手解」豁免依据：全轨解仍须数值积分器） |
| 需专用积分器 | **RK4 固定步长**（h=0.01，stdlib 自写；DEC-2 指定），与 L0 的精确指数一阶跟随（foStep）积分面有实质区别 | ✔ 沿 GT-L1 RK4 制度（GTL1 §1.3） |
| golden 由独立数值 oracle 生成 | 新文件 `tools/oracle/fl001_l1_oracle.py`（非闭式、RK4 独立实现、自检 FL-1…FL-8 预案，§4 项 2/3） | ✔ 非「逐算子闭式复刻」路线；容差走 T-B 方法等价（§4 项 6） |

**L1-lite 诚实注**：本模型为**单状态**集总热 ODE（对比 GT-L1 的二维 (f,T3) 耦合），非
ALINE §1.1 「高维/刚性/耦合场」的强形态——但「新物理状态变量（温度）+ 专用积分器 +
独立数值 oracle」三判据成立，且 DEC-2 已定形态（单节点集总热容最小集），按 ALINE §1.2
第三行走完整 G2b；温度对容量折算、双节点热网络等扩展登记不做（§6.1 项 6，A-5 方向
ALINE §7 留位）。

### 1.2 新物理量与状态向量提案

状态向量 **y = [T_bat]**（1 维 ODE 新增）；电气状态 I_true 沿 L0 既有更新序（非 RK4 状态，
精确指数子步——分区结构 §2.3）。**不把代数量冒称 ODE 状态**（I-2 数据诚实性）。

| 量 | 类型 | 提案信号 id | 单位 | 定义式 | sourceKind 提案 | exposure 提案 | 备注 |
|---|---|---|---|---|---|---|---|
| I_true | ODE 状态（保留，L0 更新序） | I_bat_true_A | A | EQ-FLTH-1（沿 systems.js EQ-2/EQ-B） | —（L0 既有不变） | —（L0 既有不变） | 精确指数子步、plant 序列逐字保留；**thermal on 不回写电气面**（§3.2 复算实证 I/SOC/E_bat 与 L0 一致，fp 噪声级差异 ≤1e-13） |
| **T_bat** | **ODE 状态（新）** | T_bat_K | K | EQ-FLTH-4 | MODEL_STATE | public_demo | 电池单节点集总温度；T_bat(0)=T_amb=298.15 K |
| **P_loss** | 代数（新） | P_loss_kW | kW | EQ-FLTH-3 | DERIVED | public_demo | 热损耗功率 = I_true²·R_int(T_bat)；是模型记账项，不是能量损失（措辞注 §6.3） |
| R_int | 代数（新，不出信号） | （由 P_loss 承载） | Ω | EQ-FLTH-2 | —（不出信号） | —（不出信号） | R0·(1+α·(T_bat−298.15))；单独出信号会扩盲包/序列面，最小集不设 |
| P_gen | 代数（保留信号，定义式扩） | P_gen_true_kW（复用） | kW | EQ-FLTH-5 | —（L0 既有不变） | —（L0 既有不变） | thermal on：P_gen = P_load − P_bat + P_loss（守恒面 (a)，Q1）；off：原式 P_gen = P_load − P_bat 零变化 |
| r_true / r_meas | 残差（保留信号，定义恒等扩展） | r_true_kW / r_meas_kW（复用） | kW | EQ-FLTH-6 | —（L0 既有不变） | —（L0 既有不变） | 定义恒等扩展含 −P_loss 项；off 时 P_loss≡0 退化为原恒等式零变化；r_meas 教学锚点 0.4·b 保持（Q3） |

**盲包面裁定（沿 GTL1 B-1 先例）**：两个新热信号（T_bat_K / P_loss_kW）**全部非盲显**——
sourceKind 提案 MODEL_STATE / DERIVED（DATA_CONTRACT_SPEC §1.6 默认映射两值均落
`public_demo`，systems.js:17-21 EXPOSURE_BY_SOURCE 同构）；**不设置 blindVisible**（兼容
字段由 exposure 派生、禁止独立设置——systems.js:18/54 纪律），亦不显式声明 exposure 覆盖。
**盲包观测面不扩**：FL-001 在 Arena 盲测池（P0），thermal 信号不入 blind 投影——GTL1 §1.2
「不入池的显式声明」同款；且 **thermal_model 默认 off ⇒ 新生成盲包语义零变化**（§2.0 差异
理由④）。FLTH-G2b-04 工作面保留「如需扩盲面另行裁定」。

### 1.3 专用数值积分器提案（RK4 固定步长，stdlib；电气面保留精确指数）

- **T_bat**：经典 RK4，固定步长 h = DT_INT = 0.01 s（6000 子步/60 s；每子步 4 次 RHS 求值
  ≈ 24 000 次——浏览器预算充裕；**DEC-2 指定 RK4 dt0.01**，沿 GT-L1 制度）；
- **I_true**：**保留 L0 精确指数子步**（plants/fl001.js:45-53 stepOf 逐字）——τ·dI/dt+I=target
  为线性 ODE、子步内 target 分段常值，精确指数即精确解，改 RK4 无精度收益且破坏
  I-11 字节纪律与 fl001_v1 T-A 复现性（分区结构 §2.3：RK4 只积分 T_bat）；
- **分区（partitioned）结构**：控制/事件输入（b、target、I_cap）在子步内**冻结于子步起点
  右值**（L0 bAt 同口径，t=20 阶跃落在子步边界上，无子步内间断——plants/fl001.js:34
  `time >= tStart - 1e-9` 逐字）；**T_bat 的 RHS 内 I_true 冻结于子步起点值**（FLTH-DRAFT-Q2
  推荐口径，误差量级分析 §2.3 注记②）；
- **豁免声明**：不采用自适应步长/刚性积分器（教学面保持固定网格与可复算性）；热时间常数
  τ_th = C_bat/(h − I²R0α) ≈ 31–34 s（§2.1 教学参数）与电气 τ=1.5 s/0.4 s 相差一个量级以上，
  无刚性耦合源。

### 1.4 数值 oracle 提案（非闭式）

新文件 `tools/oracle/fl001_l1_oracle.py`（FLTH-G2b-03 执行；**本波不创建**——V072 §0 禁区
不动 tools/oracle/**）。Python stdlib 独立 RK4 实现；**不 import src/**、不 import
fl001_oracle**、方程与常量唯一权威文本 = 本规格 §2（批准后）；自带自检 FL-1…FL-8（§4 项 3）；
golden 由该 oracle 只读生成、engine 只读比对（G0-DEC-16）。与 fl001_oracle.py 的
「解析闭式 + T-A ±1e-12」路线不同：RK4 双实现跨语言不承诺 bit-exact，容差走 **T-B 方法
等价**（同一离散方法、独立实现——ALINE §3 T-B 定义行；ALINE :91「A-4 热模型起步即 T-B」），
实测散差证据见 §3.5（半步长 max|ΔT| = 6.16e-04 K）。

## 2. 方程集（EQ-FLTH-1…9，全部显式；**批准后本节为 oracle/引擎唯一权威文本**）

### 2.0 配置开关形态与默认轨：`thermal_model: "off" | "on"`，默认 **off**（DEC-2 定案）

- **单键枚举**（DEC-2 推荐采纳）：FL-001 `defaults.thermal_model = 'off'`（systems.js:134-138
  defaults 面新增键；normalizeConfig 盖章沿 systems.js:1935 `if (s.defaults.inertia_model)
  cfg.inertia_model = ...` 同构新行——另见 engine.js:176-178 validate 面同构盖章）；engine
  分派 = simulateFL001 顶部
  `if (cfg.thermal_model === 'on') return simulateFL001Thermal(system, cfg, t)`（engine.js:832
  GT thermo early-return 先例同构），**off 路径（plant 家族 + 内联 actuator 路径）逐字不动**。
- **与 GT-L1 Q4「thermo 默认」的差异理由（显式登记，V072 §4 风险 2）**：GT-L1 Q4 定案翻转
  thermo 为默认（GTL1 §2.4），本草案**不平移**该裁定——① **P0 旗舰与 SA-24 白名单核心**：
  FL-001 是 scope.js APPROVED.systemId 唯一系统（scope.js:17-30），sensor_drift 锚定场景
  classify=approved_p0，默认翻转立即改写全部 P0 锚定场景的验收语义与 golden 派发面
  （fl001_v1 是 P0 验收 golden，run-g2.mjs:83 步①）；GT 为 extension_preview 曝光目标、
  翻转无 P0 验收链重组成本；② **T-A/T-B 容差制度**：fl001_v1 为 T-A 解析 golden、thermal 轨
  为 T-B 数值 golden——默认轨=T-A 轨使 P0 验收链（G 门禁）保持解析精度口径，thermal 曝光
  走显式选择；③ **教学编排**：跨深度对比（§3.2）经 scenario 显式钉轨达成（§2.4），不依赖
  默认翻转（GT 需翻转才可达 C-2/C-3 场景的约束在 FL 不存在——FL 的 off 轨本身即教学主角）；
  ④ **Arena 盲包**：FL 在盲测池（P0），默认 off ⇒ 盲包 config 指纹/观测语义零变化
  （GT Q4 需「必要时 Arena 盲包锁定 inertia_model」对冲——FL 侧天然免除）。
  默认翻转（off→on）如批准轮用户裁定，须显式 CHG 并同轮处置 ①②④（可撤销，登记不预设）。
- **层级表达**：off ⇔ L0（现有 level 标签不变）；on ⇔ L1（level/summary 变体提案 §6.2；
  provenance 派生 FLTH-IMP-Q2）。cfg 单值与 golden id 一一映射：off→fl001_v1、on→fl001_v2
  （§4 项 1；GTL1 §2.4 理由 3 同构）。

### 2.1 常量表（**教学参数提案——显著标注非实测**）

| 常量 | 值 | 含义 | 性质 |
|---|---|---|---|
| V / I_ref / τ / τ_act / I_cap / P_load / E_bat / SOC0 | 0.4 kW/A / 25 A（load0=30）/ 1.5 s / 0.4 s / 13.75 A（55%）/ 30 kW / 40 kWh / 60 % | L0 冻结参数原样（MODEL_VALIDATION_SPEC §1.2） | 既有冻结值 |
| **R0** | **0.2 Ω** | 25 °C 参考内阻（教学整定值） | **教学参数，非实测**（100 Ah 等效包真实 DC 内阻量级为几十 mΩ，本值放大数倍换取 60 s 窗内可见热响应——教学可见性优先的显式声明） |
| **α** | **0.01 1/K** | 内阻温度系数（给定线性式 R_int(T)=R0·(1+α·(T−25)) 下 1%/K 量级） | **教学参数，非实测**（真实电池 R(T) 非线性且低温侧显著，线性式为教学近似） |
| **C_bat** | **300 J/K** | 电池单节点集总热容 | **教学参数，非实测**（真实 40 kWh 包热容为 1e5 J/K 量级、时间常数小时级——教学尺度缩放使 60 s 窗内温升可见，A-flth-params 声明） |
| **h** | **10 W/K** | 牛顿冷却系数（集总散热） | **教学参数，非实测** |
| **T_amb** | **298.15 K（25 °C）** | 环境温度常数，T_bat(0) = T_amb | 登记常量；无环境动态/昼夜（§6.1 项 5） |
| DT_INT | 0.01 s | RK4/子步步长（6000 子步/60 s） | 库口径（engine SUB×DT_INT=0.1 s 输出步） |

**教学参数整定依据（非标定声明）**：四参数使健康局（I=25 A）稳态温升 ΔT_ss = I²R0/(h−I²R0α)
= 14.29 K、热时间常数 τ_th = 34.29 s——60 s 演示窗内温升路径完整可见（t=60 达稳态温升的
82.6%）；故障后（I=15 A）新稳态 4.71 K 形成可观测的降温恢复轨。**非设备参数辨识**：不对应
任何真实电池包热特性（A-flth-params + I-5 自查 §6.3）。

### 2.2 方程登记（含**守恒面裁定**——草案核心难点，Q1 裁定点）

#### 2.2.0 守恒面裁定：P_loss 的去向——二选一（推荐 (a)）

P_loss = I_true²·R_int(T_bat) 在热 on 时是新增的真实功率项，必须裁定其记账去向。
L0 既有能量恒等式为 **E_source + E_bat ≡ E_load**（E_source = ∫P_gen dt = ∫(P_load − P_bat)dt，
engine.js:561 同构；checks.js:415-445 energy-balance 判据（起草时点行号）|E_source + E_bat −
E_served| ≤ 1e-6 kWh，FL 走非 GT/FC 的 else 分支）。两个候选：

| 方案 | 记账式 | 恒等式后果 | 涟漪面 | 教学叙事 |
|---|---|---|---|---|
| **(a) 进母线平衡（推荐）** | **P_gen = P_load − P_bat + P_loss**；r_true/r_meas 定义恒等扩展含 −P_loss 项（EQ-FLTH-5/6）；E_source = E_load − E_bat + E_loss | **E_source + E_bat ≡ E_load + E_loss**（全局能量守恒闭合：发电+电池化学 = 负载+热）；checks.js 分支扩展一项（−E_loss）；SOC 定义零涟漪（P_bat=true=0.4·I 口径不动） | P_gen 信号定义式（thermal on 域内）、r_true/r_meas 恒等式、checks.js energy-balance FL 分支、E_source 指标——**全部为 on 域内扩展，off 域零变化** | 「热损耗由发电机补偿」：损耗使电池包净馈入下降 P_loss，理想平衡源即时补齐；损耗同时加热电池包（EQ-FLTH-4）——「损耗不免费、有源可查、有温可测」三重可见 |
| (b) 损耗离场（不推荐） | P_gen = P_load − P_bat（原式不动）；P_loss 只进热 ODE | **E_source + E_bat ≡ E_load − 0 的恒等式破坏**：账面出现无源能量缺口 E_loss（损耗能量既不来自母线也不来自记账的电池储能——SOC 按 P_bat=0.4·I 积分不含损耗） | 须重新设计能量口径：或 SOC 改按 (P_bat+P_loss) 积分（破坏「SOC 定义不动」DEC-2 约束与全部 SOC 锚点）、或恒等式永久带缺口项（checks/r_true 语义降级为「含未解释缺口」）——涟漪 M 级 | 「损耗凭空消失」——与 I-2 能量诚实性直接冲突 |

**推荐 (a) 的理由**：① 能量守恒闭合（E 恒等式有界、checks 面单项扩展即闭环）；②
DEC-2 约束「SOC 定义不动（I-2 能量口径零涟漪）」字面满足（P_bat,true 口径不变）；
③ 物理可解读：等价于「电池 = 0.4 kV 理想源（A-const-v 口径保留）+ 串联内阻 R_int(T)」的
串联阻模型——理想源功率 0.4·I（=P_bat,true 登记值不变），内阻耗散 I²R 由母线侧平衡源补齐，
包净馈入 = P_bat,true − P_loss；④ 教学叙事强（损耗在 P_gen、E_source、T_bat 三处可见）；
⑤ r_meas 恒等扩展后 0.4·b 教学锚点保持纯净（Q3）。**方案 (a) 为本草案全部锚点/方程/
golden 计划的基准**；评审若裁 (b)，§2/§3 全量重推（复算脚本分支改动 + 能量口径重设计，
工作量 M，登记 FLTH-DRAFT-Q1 备选路径）。

#### 2.2.1 方程登记表

| id | 方程 | 说明 |
|---|---|---|
| EQ-FLTH-1 | I_meas = I_true + b(t)；τ·dI_true/dt + I_true = target（healthy/sensor 轨 target = I_ref − b，monitor 轨 target = I_ref；actuator 轨 target = min(I_ref, I_cap)、τ_act=0.4 s）；**P_bat,true = 0.4·I_true** | 电气面原样（systems.js EQ-1/2/A/B 逐字沿用；A-const-v 恒压等效口径保留）；thermal on 不回写该面 |
| EQ-FLTH-2 | **R_int(T_bat) = R0·(1 + α·(T_bat − 298.15))**（T_bat 单位 K） | 内阻温度面（任务书 °C 制 R0·(1+α·(T−25)) 的 K 制等价式：T_bat − 298.15 ≡ T_°C − 25；两式数值逐位同）；α>0 为正温度反馈（内阻随温升增大） |
| EQ-FLTH-3 | **P_loss = I_true²·R_int(T_bat)**（W；信号面 P_loss_kW = P_loss/1000） | 焦耳热；I² 对充放电符号对称（充电同样发热——load0≤20 退化域教学点 §3.6） |
| EQ-FLTH-4 | **C_bat·dT_bat/dt = P_loss − h·(T_bat − T_amb)**，T_bat(0) = T_amb = 298.15 K | 单节点集总热平衡（新动态状态）；牛顿冷却；冷启动假设（T_bat(0)=环境温度） |
| EQ-FLTH-5 | **P_gen,true = P_load − P_bat,true + P_loss**（守恒面 (a)，Q1 推荐） | 热损耗由发电机补偿；off 轨原式 P_gen = P_load − P_bat（P_loss≡0 退化，零变化） |
| EQ-FLTH-6 | **r_true := P_gen,true + P_bat,true − P_load,served − P_loss ≡ 0**；**r_meas := P_gen,true + P_bat,meas − P_load,served − P_loss ≡ 0.4·b(t)**（Q3 推荐同轮扩展） | 定义恒等扩展（损耗为模型已知结构项、非测量偏差/缺口，从一致性残差中扣除）；off 轨 P_loss≡0 退化为原恒等式；r_meas 教学锚点 max\|r_meas\| = 0.4·b = 4.0 kW 保持（§3.2 复算实证） |
| EQ-FLTH-7 | SOC_true = SOC0 − ∫P_bat,true dt/(40 kWh)×100%；SOC_est = SOC0 − ∫P_bat,meas dt/(40 kWh)×100% | **SOC 定义不动**（DEC-2 约束；P_bat,true 口径 = 0.4·I_true 不变 ⇒ SOC/∫I 面与 L0 逐位同，§3.2） |
| EQ-FLTH-8 | E_loss = ∫P_loss dt（**子步梯形**：每子步 P_loss(子步起点 I,T) 与 P_loss(子步终点 I,T) 各评一次取均值×h——Q4 推荐，GTL1 E_gen 梯形纪律同构）；E_source = E_load − E_bat + E_loss | 损耗能量账本（kW·s ÷3600 → kWh）；E 恒等式 E_source + E_bat ≡ E_load + E_loss（方案 (a) 后果） |
| EQ-FLTH-9 | 检查式：**E_source + E_bat − E_load − E_loss ≡ 0**（离散自洽，checks.js thermal on 分支判据）；渐近闭式 **θ_ss = I²·R0/(h − I²R0α)**（θ = T_bat − T_amb；稳态解，稳定性条件 h > I²R0α） | oracle 自检 FL-2/FL-7 与 checks 分支的判据式；θ_ss 闭式同时是包络角点声明的依据（§3.6） |

**变比热/非线性豁免声明**：R_int(T) 线性式为教学近似（真实电池 R(T) 非线性、低温侧显著，
登记 §6.1 项 2）；C_bat/h 集总常数（无温度依赖）；无热管理/冷却控制动态（h 常数）。

### 2.3 更新序骨架（分区伪代码——oracle/引擎双侧复刻的唯一权威文本）

```text
每输出步 k = 1..600（0.1 s），每输出步内子步 h = 0.01（j = 0..9）：
  输入冻结于子步起点右值：b = bAt(t_sub)（plants/fl001.js:34 同口径；t=20 阶跃落在子步边界）
① 电气面（L0 序保留，逐字不动）：I_start = I_true（子步起点值，同时是②的冻结输入）
   st = plant.stepOf(I_start, t_sub, h)                    # 精确指数（plants/fl001.js:45-53）
   I_end = st.y；intI += st.integral；intB += b·h           # SOC/E_bat 面零变化
② RK4（热状态 T_bat；RHS 内 I 冻结于 I_start——FLTH-DRAFT-Q2 推荐口径）：
   RHS(T)：θ = T − 298.15；P_loss(I_start, T) = I_start²·R0·(1+α·θ)
           ⇒ dT/dt = (P_loss − h·θ)/C_bat
   k1 = RHS(T)；k2 = RHS(T+h/2·k1)；k3 = RHS(T+h/2·k2)；k4 = RHS(T+h·k3)
   T_end = T + h/6·(k1 + 2k2 + 2k3 + k4)
③ E_loss 累计（子步梯形，Q4）：e_loss += ½·(P_loss(I_start,T_start) + P_loss(I_end,T_end))·h
   子步末提交：I_true = I_end；T_bat = T_end
输出网格 record(k)（601 点）：由 (I_true(t_k), T_bat(t_k), b(t_k)) 重算全部代数量——
   P_loss_kW = I_true²·R0·(1+α·(T_bat−298.15))/1000（当前状态值，非累计值）
   P_gen = P_load − 0.4·I_true + P_loss_kW（EQ-FLTH-5）
   r_true = P_gen + 0.4·I_true − P_load − P_loss_kW（≡0）；r_meas = P_gen + 0.4·(I_true+b) − P_load − P_loss_kW（≡0.4·b）
   SOC/SOC_est/E_bat 面与 L0 record() 逐字同（intI/intB 同源）
```

**审查注记（评审 A 请重点核）**：① RHS 内 I 用子步起点冻结值而非 RK4 阶段值——冻结误差
量级 = |dI/dt|·h ≈ 6.67 A/s×0.01 s = 0.067 A（故障后电流衰减段最大），单子步 P_loss 偏差
≤ 2·I·R0·ΔI ≈ 2 W，对 T 的单子步贡献 ≤ 2.2e-05 K、不累积（半步长实测 6.16e-04 K 全窗上界，
§3.5）——备选口径（RK4 阶段值用子步内精确指数 I(s)）登记为 FLTH-DRAFT-Q2 备选；
② record() 的 P_loss 用当前状态重算而 E_loss 用子步梯形累计——两口径的差 = 梯形离散偏差
（E_loss 实测 ΔE = 2.2e-09 kWh/半步长，§3.5），信号面与账本面分离声明；
③ 事件边界 t=20.0 恰在子步边界（(k−1)·0.1 + j·0.01 网格），无子步内间断——若实现轮调整
h 须保持该性质（登记为实现约束，GTL1 §2.3 注记③同款）；④ T 事件行语义：t=20.0 行
T_bat = 故障前连续值 304.463784 K（T 连续、无跳变；与 I_true post 行语义一致——偏置阶跃
只作用于测量通道与 target）。

### 2.4 scenario 编排键（沿 GT-L1 B-2 定案同构）

scenario.js schema v1 **EVENT_KEYS 已含 `inertia_model`**（scenario.js:33，CHG-20261104-12 ③
先例；B-2 解析处理在 scenario.js:331）；本提案**同构新增事件级可选键 `thermal_model`**：枚举
`off|on`；缺省（不提供）解析为
系统默认轨（= off，§2.0）；**scenarioHash 含解析后的轨**——既有场景哈希变化属**预期失效面**
（tests/registry.test.js per-Run config 哈希核查随 FLTH-G2b-04 更新登记）；跨深度对比场景
（§3.2 教学 payoff）经该键**显式钉轨**（同一 scenario 可显式指定 off/on 双 Run 对）。
schema v1 为闭合白名单制，新键随 FLTH-G2b-04 入 EVENT_KEYS 白名单并同步闭合校验；
**schema 扩展须显式 CHG**（GT B-2 定案先例：CHG-20261104-12 ③）。

## 3. 验收锚点提案（数值口径·预填；终值由 FLTH-G2b-03 oracle 冻结）

> 本节全部 thermal on 数值为**预填**（临时脚本复算，§3.5）——thermal 轨无全局闭式解，锚点
> 终值以 fl001_l1_oracle 的 emit 输出为准冻结（gt001 §4「验收锚点由 oracle 复核冻结」先例）；
> 本草案冻结的是**方程集、常量表、更新序与分歧方向/量级**。L0（off）对照值引自 fl001_v1
> 冻结 golden（data/golden/fl001_v1.json，本波复算 3 轨 7 行 worst diff = **0.0** 逐项复现，
> §3.5 环境校验）。预填口径：h=0.01 RK4、601 点输出网格、EQ-FLTH-5/6（a) 方案式、
> §2.1 教学参数。

### 3.1 健康局（thermal on，closed_loop 无故障）

| 量 | 值 | 自洽判据 | 复算结果 |
|---|---|---|---|
| T_bat(0) | **298.15 K** | = T_amb（冷启动） | ✔ |
| **T_bat(60)** | **309.953229 K**（θ = 11.803 K，达稳态 82.6%） | 单调升（t_at_max = 60.0） | ✔ |
| 渐近 T_ss | **312.435714 K**（θ_ss = 125/8.75 = 14.285714 K） | EQ-FLTH-9 闭式 | ✔ |
| τ_th（healthy） | 34.285714 s | C_bat/(h−I²R0α) = 300/8.75 | ✔ |
| P_loss(0) / P_loss(60) | **0.125 / 0.139754 kW** | I²R0 = 125 W（θ(0)=0）；60 s 含温度反馈 ×1.118 | ✔ |
| **P_gen(0) / P_gen(60)** | **20.125 / 20.139754 kW** | L0 轨恒 20.000 → thermal on 轨含损耗补偿（跨深度分歧点 §3.2） | ✔ |
| E_loss(60) | **0.0022404 kWh** | ≈ 0.45% × E_load（0.5 kWh） | ✔ |
| 电气面 | I≡25、P_bat≡10、SOC_end = 59.5833333、E_bat = 0.1666667 | 与 L0 healthy **逐位同**（复算 max diff = 0.0） | ✔ |
| r_true / r_meas | ≡ 0 | 复算逐点 max = 1.78e-15（fp 路径噪声） | ✔ |

### 3.2 L0（off）↔ thermal on 同故障分歧预期表（「同一系统、不同模型深度可对比」教学点）

| 场景（默认参数） | 量 | 取值口径 | L0 off（fl001_v1 冻结） | thermal on（预填） | 分歧机理 → 教学点 |
|---|---|---|---|---|---|
| sensor_drift +10 闭环 | T_bat 轨 | 全序列 | —（无热面） | **T(20.0)=304.463784 → 峰 304.639878 @ t=22.1 → T(60)=303.419884 K**（渐近 302.862042） | 偏置 → 真实电流 25→15 A → 损耗 125→45 W → **降温恢复轨**（故障后短暂续升 +0.176 K 系电流衰减期损耗仍大于散热、热惯性过冲）——L0 完全不可见，模型深度的表达力差异 |
| 同上 | **P_gen(60)** | t=60 采样 | 24.000000 kW | **24.047371 kW**（P_gen(21.5) = 22.602784） | +0.047371 kW = 损耗补偿量（EQ-FLTH-5）——「热损耗由发电机补偿」的可见锚点 |
| 同上 | P_loss(20.0) / P_loss(60) | t 采样 | — | **0.132892 / 0.047371 kW** | I² 律 + 温度反馈 |
| 同上 | E_loss(60) / E_source(60) | 60 s 账本 | 0 / **0.3761111 kWh** | **0.0012787 / 0.3773898 kWh** | E_source + E_bat = E_load + E_loss（守恒面 (a)）；L0 账本无损耗项 |
| 同上 | 电气面（I/SOC/E_bat/r_meas） | 全序列/60s | I(26)=15.183156388、SOC_true_end = 59.6902778、SOC_est_end = 59.5791667、SOC_err = −0.1111111、E_bat = 0.1238889、max\|r_meas\| = **4.0** | **与 L0 一致（fp 路径噪声级）**：I(60) 与 L0 闭式差 ~3e-15 A（子步复合噪声）、E_bat 差 1.2e-13 kWh、SOC 逐位同、max\|r_meas\| = 4.000000 | **thermal 不回写电气面**（§2.3 分区结构）+ r_meas 扩展恒等保持 0.4·b 纯净（Q3）——「+4 kW 是测量偏差，不是能量损失」教学点在两深度一致成立 |
| sensor_drift 仅监测 | T_bat(60) | t=60 采样 | — | **309.953229 K（与 healthy 轨 max\|ΔT\| = 0.0 逐点同）** | 偏置不进入物理回路 → 热面与健康局恒等；r_meas = 4.0 kW、SOC_est_end = 59.4722222（测量面照常偏） |
| actuator_fault 55% | T_bat 峰 / T_bat(60) | 暂态极值 / t=60 | — | **304.505333 @ t=20.5 / 302.770820 K**（渐近 302.079847） | 限幅 → I 13.75 A → 损耗 37.8 W → 更深降温；τ_act=0.4 s 电流快速收敛 ⇒ 峰值过冲仅 +0.042 K |
| 同上 | P_gen(60) | t=60 采样 | 24.500000 kW | **24.539560 kW** | 同 P_gen 补偿机理 |

### 3.3 L0 轨（off）零变化声明（经引擎现状佐证）

1. **代码结构佐证**（本波实读）：src/** 全库 grep `thermal_model` = **0 命中**（本波
   `grep -rn "thermal" src/ | grep -v thermo` 仅命中 GT-001 thermal 类目与 GT 热信号定义，
   无任何 FL 热面）；engine.js `simulateFL001Plant`/`simulateFL001`/`fl001PlantCapable`
   （engine.js:498-639）与 plants/fl001.js 均无热状态/温度入口——off 轨即现状全量代码路径；
2. **数值佐证**（本波复算）：L0 闭式复刻对 fl001_v1 冻结 golden 三轨（healthy/
   closed_loop_fault/actuator_closed_loop）× 7 行标量 **worst diff = 0.0 逐位复现**（§3.5）；
   `python -I scripts/verify_golden.py fl001` → **exit 0、ok:True**（run-g2 步①同款，本波实跑）；
3. **实现轮零变化判据（FLTH-G2b-04 验收项）**：off 轨 run_hash 与 14 既有序列列**逐位不变**
   （I-11 快照工具纪律）；thermal 信号列（T_bat_K/P_loss_kW）在 off 轨**全程 null**
   （makeSeries 按 SystemDef.signals 建列——GT 先例：GT 热信号在 swing/linear 遗留轨全程
   null，systems.js:708-711 定义注记原样）；既有引擎/plants 测试断言零改动通过
   （tests/engine.test.js / tests/plants.test.js）；
4. **预期失效面（非「变化」，登记）**：SystemDef.signals 增 2 项 ⇒ 信号目录/manifest
   model_hash/tests/registry.test.js per-Run 哈希面更新（GT §4 项 8 同款先例）；
   fl001_v1 golden 比对面零变化（golden 无新列，V-07 逐点比对不受额外 null 列影响——GT
   gt001_v1/v2 同构现状，acddba2 门禁全绿佐证）。

### 3.4 包络与角点声明（UI 全域，注册故障域内复算）

| 项 | 声明 | 复算依据 |
|---|---|---|
| T_bat 域（默认参数 60 s 窗） | [298.15, 309.953229] K（healthy 上端 = t=60 未收敛位；渐近 312.435714） | §3.5 |
| **load0=45 角点** | I=62.5 A：T(60) = **424.704098 K**、P_loss(60) = 1.769954 kW、P_gen(60) = 6.769954 kW、E_loss = 0.0218589 kWh；**渐近 T_ss = 655.292857 K**（≈382 °C）——合法角点、无热保护动作（沿袭 L0「无保护动作」局限并显式扩到热面，§6.1 项 7）；教学演示建议默认 load0=30 | 域角点复算 |
| load0=10 角点（充电） | I_ref = −25 A：T(60) = **309.953229 K（与 +25 A 放电逐位同——I² 律对充放符号对称）**、P_gen(60) = 40.139754 kW；充电发热为 EQ-FLTH-3 结构推论（教学点） | 域角点复算 |
| **稳定性条件** | h > I_true²·R0·α（EQ-FLTH-9）：注册域内最大 I²R0α = **7.8125 W/K（load0=45 角点）< 10**（裕度 1.28×）；**手拼配置 load_kW > 48.3 kW（越界）可破稳定性条件** → 正温度反馈失控（无热保护），登记 limitations（§6.1 项 8）+ 未来开放热参数配置须先立钳位的前置声明 | 闭式 + 域扫描 |
| 渐近稳态表 | θ_ss：I=25 A → 14.2857 K（T_ss 312.4357）；I=15 A → 4.7120 K（302.8620）；I=13.75 A → 3.9298 K（302.0798）；I=62.5 A → 357.14 K（655.2929） | EQ-FLTH-9 闭式 |
| 手拼配置 | normalizeConfig 不钳位 load_kW（L0 既有 limitations 原样）；thermal on 不新增钳位（最小集），越域后果经 §6.1 项 8 声明 | 现状核实 |

### 3.5 复算记录（临时脚本，已按纪律删除）

- **环境校验**：脚本先按 MODEL_VALIDATION_SPEC §1.2/fl001_oracle.py EQ-1…EQ-6 闭式独立
  复刻 L0 三轨，对 fl001_v1 冻结 golden 标量 **3 轨 × 7 行全部逐位复现（worst diff = 0.0）**；
  systems.js:312 acceptance.keyValues 同步复核（I_true_26s = 15.183156388887 ✓、
  max|r_meas| = 4.0 ✓、SOC_err = −0.1111111 ✓）——复算环境可信；
- **thermal on 复算**：`python -I` 运行（stdlib，无第三方）；内容 = §3.1/§3.2 四轨全序列
  RK4（h=0.01，601 点）+ §3.4 域角点 + §3.5 自收敛/交叉；
- **自收敛证据（T-B 容差预案输入）**：sensor_drift 闭环半步长（h=0.01 vs h=0.005）
  **max\|ΔT\| = 6.159e-04 K**（最大差位于 t=24.4 s 故障后电流衰减段——I 冻结口径的 O(h)
  误差在 |dI/dt| 峰值邻域主导，§2.3 注记①）、**max\|ΔI\| = 8.2e-14 A**（I 轨步长无关——精确
  指数的可复合性：线性 ODE + 子步内常值 target 的两半步精确解 ≡ 全步精确解）、
  **ΔE_loss = 2.2e-09 kWh**（vs E_kWh 容差预案 1e-6，裕度 ×450）；
- **RK4 vs 子步解析交叉（FL-7 自检预案输入）**：I 冻结口径下 T-ODE 在子步内为**线性常系数
  ODE**（θ′ = λθ + c，λ = (I²R0α − h)/C_bat），存在子步内精确指数解——RK4 全轨与之逐点比较
  **max\|ΔT\| = 5.68e-14 K**（双精度路径噪声级，6000 子步无可见累积）——RK4 实现正确性的
  强交叉证据，冻结为 oracle 自检 FL-7 判据预案；
- 脚本已删除，本节数值即其输出摘录；评审可按 §2 方程独立重推（θ_ss 渐近闭式可手推，
  暂态按 §2.3 伪代码复刻）。

### 3.6 golden 比对面增量

新增序列 2 项（T_bat_K / P_loss_kW）入 golden 比对面；容差 tier = **T-B**（§4 项 6）——
T_K 容差档沿 gt001_v3 已冻结档位（T_K_atol = 1e-2 K，data/golden/gt001_v3.json gate 块实读），
I_A/P_kW/E/SOC/r 面沿 fl001_v1 gate 键面外推。事件快照面**零扩展**（sensor_bias/actuator_limit
事件变量维持 L0 变量集 I_bat_true_A/I_bat_meas_A/bias_A/I_bat_cap_A；T_bat 不入事件快照——
最小集声明，如需扩面另行裁定）。

## 4. golden 计划（fl001_v2 · tier T-B · oracle_base 出生接入 · 旧 golden 留档；**起草波零改动维持**——批准与 emit 入 v0.8.0，FLTH-G2b-03；既有 6 golden 与 fl001_oracle.py 零触碰）

| # | 项 | 内容 |
|---|---|---|
| 1 | **新 id 判据** | golden_id = **fl001_v2**——方程集扩展超出已批 MODEL_VALIDATION_SPEC §1.2/§1.3（ALINE §1.2 第三行）→ 模型/方法变更 → 新 id（ORACLE_INTERFACE_D2 §3.1「模型/方法变更 → 新 id」；gt001_v3 先例 supersedes 字段 data/golden/gt001_v3.json 实读）。**保 id 重出不适用**（DEC-B 口径仅限引擎行为零变更的原地扩容） |
| 2 | 独立 oracle | `tools/oracle/fl001_l1_oracle.py`（v0.8.0 执行；本波不创建）。独立性声明对标 fl001_oracle.py:1-10 / gt001_l1_oracle.py:4-20 先例：不 import src/**、不 import fl001_oracle、方程与常量唯一权威文本 = 本规格 §2 批准文本、自含硬编码；自带自检 FL-1…FL-8。**出生即 oracle_base 接入**（新文件无 V-03 历史字节负担；GT 先例 GTL1 §4 项 2）：`import oracle_base` + `resolve_run_spec` + `write_golden_with_sidecar`（LF 钉死，ORACLE_INTERFACE_D2 §6）+ `approval_block/apply_approval`（三字段非 null 方可落盘，§3.3）+ `SERIES_IDS` 模块常量（含
  "t" 列——fl001_v1 实测惯例 + golden-compare.js:66-71 网格校验（起草时点行号；该比对循环
  按 **golden series 键集**迭代，引擎侧额外 null 列不进比对——§3.3 项 4 的实现面佐证）） |
| 3 | self_check 预案 | **FL-1** L0 冻结锚点环境校验（fl001_v1 三轨标量闭式复现，判据 ≤1e-9——本波实测 0.0）；**FL-2** 热能量恒等（EQ-FLTH-9 离散自洽：E_source+E_bat−E_load−E_loss ≡ 0，判据 ≤1e-9 kWh）+ θ_ss 渐近闭式抽查；**FL-3 电气面跨轨恒等**——thermal on 的 I/SOC/E_bat/r_meas 面与 L0 闭式 **±1e-9 内逐点恒等**（§3.3 零变化声明的 oracle 侧固化；不做跨语言逐位承诺——T-B 制度）；**FL-4** 网格（601 点、t[i]=i·dt、单调、事件域 null 豁免同 fl001 SC-6 口径）；**FL-5** 锚点全表复算（§3.1/§3.2 终值）；**FL-6** monitor 热面恒等（monitor 轨 T_bat 与 healthy 轨 max\|ΔT\| = 0——偏置不进入物理回路的结构判据）；**FL-7** 半步长自收敛登记（6.16e-04 K 证据 → T_K_atol 取 ×16 裕度）+ RK4 vs 子步内解析指数交叉（5.68e-14 K）；**FL-8** 无 NaN/Inf + 包络抽查（§3.4：load0=45 角点 + 稳定性裕度断言 I²R0α < h） |
| 4 | Run 集 | **4 Run**（镜像 fl001_v1 全集，全部 thermal_model=on）：healthy / closed_loop_fault（sensor +10）/ monitor_only / actuator_closed_loop（55%）。镜像判据：gt001_v3 镜像 gt001_v2 全集（6 Run）同构——fl001_v1 为 4 Run ⇒ fl001_v2 镜像 4 Run（任务书「6 Run 或沿 fl001_v1+thermal 变体」二选一的采后者理由：新 id golden 镜像基线 golden 全集的 GT 先例） |
| 5 | 元数据（schema v2） | `golden_schema_version="v2"`（新 golden 默认 v2，ORACLE_INTERFACE_D2 §3.5）；`golden_id="fl001_v2"`；`model_id="FL-001"`；`model_version="1.1.0"`（提案；三段式 v2 归一样式——fl001.1 遗留样式在 v2 新 id 轮归一，ORACLE_INTERFACE_D2 §3.1；深度轨类比 GT 1.1.0→1.2.0 为 minor 增位）；`method_id="fl001_thermal_rk4_dt0.01"`（gt001_l1_rk4_dt0.01 先例）；`engine_baseline=null`；`backend=null`（§3.4 留位）；`thermal_model="on"`（cfg 键入 config 块，沿 gt001_v3 inertia_model 先例）；`supersedes="fl001_v1（L0 轨 thermal_model=off，字节冻结留档；存档场次继续引用 v1）"`；units 増 `"T":"K"`（schema.js:23 UNIT_DICT 已含 K——GT 波 C-3 同款已落地，本轨零 schema 工作，已核实）；generated_by 一段式 + approval 三字段首签引本规格批准 CHG |
| 6 | 容差 tier | **T-B**（同法 RK4、独立双实现——ALINE §3 T-B 定义行；ALINE :91「A-4 热模型起步即 T-B」）。gate 块预案：`{tier:"T-B", I_A_rtol:1e-12, I_A_atol:1e-15, T_K_atol:1e-2, P_kW_rtol:1e-6, P_kW_atol:1e-3, E_kWh:1e-6, SOC_pp:1e-5, r_true_kW:1e-9, r_meas_kW_atol:1e-9, t_s:1e-9}`——**量级预案非终值**：终值按双实现实测散差 × 安全系数 ≥10 冻结（半步长证据 §3.5：6.16e-04 K → T_K_atol 1e-2 为 ×16；gt001_v3 gate 冻结先例同纪律）；I_A 面沿 v1（精确指数闭式跨语言散差在 rtol 1e-12 实证域内，fl001_v1 gate 键面）；若实测超限 → 降 **T-C** 并必附 `convergence` 块（ORACLE_INTERFACE_D2 §3.2）——双向预案登记（T-A 不承诺：RK4 双语言 bit-exact 无依据） |
| 7 | verify_golden | **注册面为硬编码表**（scripts/verify_golden.py:51-95 MODELS dict；**PV001 §4 项 7 勘正先例引用**——「新系统/新轨零改动 verify_golden」不成立，注册行是显式工作面）：新增 `import fl001_l1_oracle` + `MODELS["fl001_l1"]` 注册行（golden_file="fl001_v2.json"、i_true="I_bat_true_A" / i_meas="I_bat_meas_A"、event_tol 缺省 "I_A_atol"（verify_golden.py:363 默认键，事件相位变量 A 域适用）、scalars 面增 E_loss_kWh/T_bat_end_K 等）。**T-B series_limit `_A` 分支为显式工作面**：现 T-B 分派按信号 id 后缀路由（verify_golden.py:118-140：`_Hz/_rpm/_K/_kPa/_kW/SOC/_pct/r_true`），**无 `_A` 分支**（I_bat_true_A 落入缺省 f_Hz_atol 键）——fl001_v2 为库内首个含 A 类序列的 T-B golden，须增 `_A` → I_A_atol/rtol 路由分支（GTL1 §4 项 7「参数化与注册行同轮落地」同款，FLTH-G2b-03）。**「fl001 条目重指向」不适用声明**：gt001 条目已重指向 gt001_v3（verify_golden.py:70-76，GT Q4 默认翻转的伴生动作）——FL 默认 off ⇒ `MODELS["fl001"]` **继续验 fl001_v1（off 默认轨）零改动**，thermal 轨走新增 fl001_l1 条目（与 GT 的结构性差异随 §2.0 差异理由②登记） |
| 8 | 预期失效面 | 新增 `data/golden/fl001_v2.json`(+`.sha256`)；**既有 6 golden 字节零变更**（V072 §0 维持）；engine.test.js/plants.test.js 增 thermal 变体断言（**并入现有步**，ALINE §2 步数管理约束）；tests/registry.test.js per-Run config 哈希面核查（§2.4 scenario 键）；信号目录/manifest model_hash 面（§3.3 项 4）；FAULT_CATALOG §1 增 thermal 轨注记行（FLTH-G2b-03，PV-G2b-03 增节先例）；UI 层级徽章/level 变体为 FLTH-G2b-04 面 |
| 9 | 旧 golden 留档 | fl001_v1 文件不删不改不重出（V-03 字节语义；supersedes 链 v2→v1）；已归档评测场次继续引用既有 golden；run-g2 步①（verify_golden fl001 → fl001_v1）零改动。**FL 侧无迁移债声明**：fl001_oracle.py 已于 v1 重出轮（CHG-20261104-07）接入 oracle_base（fl001_oracle.py:59-61 实读）——不存在 GT 式 gt001_oracle.py 冻结归档债；ORACLE_INTERFACE_D2 §5.2 触发条件 1（模型/方法变更 → 新 golden_id，与重出同轮）由 **fl001_v2 新 id + 新文件**承接、fl001_oracle.py 物理零触碰（GTL1 §4 项 9 同构处置） |

## 5. 对照轨（无）

本波**不提案** TESPy/PyBaMM 类旁证对照轨：FL 热模型为单节点集总 ODE、解析交叉已内嵌于
oracle 自检（FL-7 子步精确指数——比外部工具对照更强的同构证据）；外部工具引入违背本波
I-1 纯度与 V072 §0 边界（DEC-3 已裁 PyBaMM 不引入含后端侧）。如未来需设备级热模型旁证
（A-5 多场耦合方向），另立规格。

## 6. 未建模物理清单、assumptions 与 UI 措辞提案

### 6.1 未建模物理清单（进 model.limitations + UI 模型抽屉；thermal 轨新增 8 项 + 沿袭 L0 项）

1. 电池内部温度分布/双节点热网络（单节点集总等效——C_bat 为集总等效热容）；
2. **R_int(T) 非线性**（线性温度系数为教学近似；真实电池低温侧 R 显著增大、高温侧 SEI/析锂
   效应未建模）；
3. 热管理/冷却控制动态（h 为常数牛顿冷却；无风扇/液冷回路建模）；
4. 与电气面的双向耦合（温度对电流/电压/SOC 的反馈不做——**温度对容量折算登记不做**
   （DEC-2 最小集），I_true 面零反馈是 §3.2「电气面逐位同」的结构原因，A-flth-lump 声明）；
5. 环境动态（T_amb = 25 °C 常数；昼夜/季节/通风变化未建模）；
6. **温度对容量/OCV/老化耦合**（A-5 热-电-老化方向，ALINE §7；本波登记不做）；
7. **热保护未建模**（高温降额/热失控保护/熔断——§3.4 load0=45 角点 655 K 渐近为合法演示值）；
8. **稳定性域边界**（手拼配置 load_kW > 48.3 kW 越界可破 h > I²R0α 稳定性条件 → 正反馈
   失控；normalizeConfig 不钳位沿袭 L0 声明）；
9. 沿袭 L0 全部未建模项（systems.js:288-294：单一恒定负载、理想母线、变换器开关动态、
   电网交互、电池老化、退化域与手拼配置声明）。
   定位句（沿 house 句式）：本模型为教学尺度单节点集总热模型示意（L1），非机组/电网动态验证。

### 6.2 assumptions 提案（进 model.assumptions；thermal on 轨适用——沿 A-gt-swing-full「【仅 …适用】」作用域句式先例 systems.js:763-764）

| id | text |
|---|---|
| A-flth-lump | 【仅 thermal_model=on 适用】电池为单节点集总热容模型：C_bat·dT_bat/dt = I_true²·R_int(T_bat) − h·(T_bat − T_amb)，T_bat(0) = T_amb = 298.15 K（冷启动）；内部温度分布与热管理动态未建模。 |
| A-flth-params | 【仅 thermal_model=on 适用】R0 = 0.2 Ω、α = 0.01 1/K、C_bat = 300 J/K、h = 10 W/K 均为教学整定值（非实测参数）：量级按「60 s 演示窗内温升路径可见」整定（健康局稳态温升 14.3 K、时间常数 34.3 s），不对应任何真实电池包热特性或设备参数辨识。 |
| A-flth-loss | 【仅 thermal_model=on 适用】热损耗记账口径：P_loss = I_true²·R_int(T_bat) 自电池支路扣除、由理想发电机补偿（P_gen = P_load − P_bat + P_loss）；能量恒等式为 E_source + E_bat = E_load + E_loss；r_true/r_meas 定义恒等含 −P_loss 项（损耗为模型已知结构项，不进一致性残差）；SOC 定义不动（P_bat,true = 0.4·I_true 口径不变）。 |
| A-flth-no-feedback | 【仅 thermal_model=on 适用】热面对电气面零反馈：I_true/P_bat/SOC/测量链与 thermal_model=off 轨逐位同（温度对容量折算、内阻对电流的反馈不做）；跨深度对比的分歧全部位于热面与损耗补偿面。 |
| A-flth-stability | 【仅 thermal_model=on 适用】热平衡稳定性条件 h > I_true²·R0·α 在注册参数域内成立（load_kW=45 角点 I²R0α = 7.81 < 10 W/K）；手拼配置越域可破该条件（无热保护，见局限）。 |
| A-flth-l1 | 【仅 thermal_model=on 适用】热模型为教学尺度单节点集总示意（L1），不是经过验证的设备控制器或电池热学模型。 |

（A-ideal-bus / A-ideal-gen / A-const-v / A-soc-linear / A-l0 / A-fl-clamp 沿用零改动——
其中 A-const-v「P_kW = 0.4 × I_A」的口径在 thermal on 下保持（P_bat,true = 0.4·I_true 为
恒压等效功率登记值），损耗记账独立由 A-flth-loss 声明，不触碰 A-const-v 原文。）

### 6.3 文案提案与 33 模式预检（实现期入 systems.js；node tools/copy-guard.mjs 终检）

copy-guard 33 模式扫 src/**（tools/copy-guard.mjs:15 SCOPES=['src']）；本草案在
FaultLab-evaluation/**（不扫描），但实现轮文案迁入 src/** 前按 GTL1 §6.3/PV001 §6.3 先例
预检（本波已实跑 `node tools/copy-guard.mjs` → PASS 0 命中，基线绿）：

| 提案串 | 高危子串核查 | 结论 |
|---|---|---|
| thermal on 层级标签「L1 · 单节点集总热模型（数值仿真级）」 | 无禁词命中 | 0 命中 |
| A-flth-l1「不是经过验证的设备控制器或电池热学模型」 | 「经过验证」不含禁词「已验证」子串（FLEXT §1.2 F5 先例句式，现库 systems.js:284 同款基线 PASS） | 0 命中 |
| 定位句「教学尺度单节点集总热模型示意（L1），非机组/电网动态验证」 | 「非机组/电网动态验证」为 ALLOW 串（copy-guard.mjs:30） | 0 命中 |
| A-flth-params「教学整定值（非实测参数）」 | 「非实测」为 ALLOW 串（copy-guard.mjs:32，先剔除 ALLOW 再匹配 copy-guard.mjs:47） | 0 命中 |
| P_loss 定义「热损耗功率（模型记账项）」；残差类沿用「是测量偏差，不是能量损失」句式（systems.js:249 现库原句） | 「热损耗」不含禁词「能量损失」子串；「不是能量损失」为 ALLOW 串（copy-guard.mjs:33；PV001 C-7 勘正先例——禁用「非能量损失」形） | 0 命中 |
| summary 变体「电池按单节点集总热容升温，热损耗由发电机补偿（模型记账口径）」 | 无「实测/校准/工业级/已验证」命中；「模型记账口径」显式声明非物理断言（I-5 自查见下） | 0 命中 |
| 跨深度对比卡「模型深度导致的表达力差异」 | ALINE §6.4 措辞红线固定句式 | 0 命中 |

**I-5 专项自查（「损耗热被补偿」措辞）**：① 全部损耗叙事固定「模型记账口径/教学整定」
限定语，不出现「真实损耗/精确热模型/设备级」类外推措辞；② 「热损耗由发电机补偿」仅描述
方案 (a) 记账结构，不声称物理必然（备选记账 (b) 的存在本身即声明这是建模选择——A-flth-loss
显式声明口径）；③ 损耗可见性叙事（P_gen/E_source/T_bat 三处）不使用「守恒验证通过」类
禁词组合；④ θ_ss/T_ss 等渐近值仅作教学演示值呈现，附「无热保护」局限（§6.1 项 7）。

### 6.4 UI 措辞与接线提案（FLTH-G2b-04 面）

- **level 变体**：off = 「L0 · 行为级演示模型」（现值 systems.js:124 零改动）；on =
  「L1 · 单节点集总热模型（数值仿真级）」（§6.3 预检串）；UI 按 cfg.thermal_model 派生
  （GTL1 §2.4 层级派生同构；provenance 派生归 FLTH-IMP-Q2）。
- **summary 变体**：on 时在现 summary（systems.js:125）后追加「电池按单节点集总热容升温，
  热损耗由发电机补偿（模型记账口径）」（§6.3 预检串）。
- **组件/信号面**：battery 组件 description 增热角色注（on 域）；T_bat_K/P_loss_kW 入
  battery 组件 inspector 提案（off 轨全程 null——§3.3 null 列先例）；signalCategories 增
  {id:'thermal', label:'热力'}（GT 先例 systems.js:679 同字面；FL 侧为纯增项）。
- **跨深度对比卡**：复用 v0.7.2 清算项 7 的 GT 跨深度卡机制（V072 DEC-1 项 7）——同故障
  L0（off）↔ L1-thermal 双列 + ΔT_bat(t)/ΔP_gen(t) 差异带 + 因果解释卡；措辞固定句式
  「模型深度导致的表达力差异」。
- **因果模板**：sensor-drift-feedback 模板增 thermal 变体节点（T_bat 温升/降温路径 +
  P_gen 补偿节点），沿 V072 DEC-1 项 6 causalTemplates thermo 扩展先例；模板 id 提案
  `fl-thermal-compensation`；off 轨既有模板零改动。
- **questions 追加（可选，IMP-Q2）**：on 域追加「电流下降后电池温度如何恢复？」类问题项。

## 7. scope 与治理登记（G2b 进入条件五项自查表 + 门禁路径 + 步数账）

### 7.1 五项自查表（SCOPE_SPLIT_MEMO §8.2）

| # | 进入条件 | 本草案状态 |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：FL-001 无 GT/FC 式遗留缺陷清单（SCOPE §2 处置表不含 FL 未关闭项；load_step O-13 已闭合归档）；本轨触发项 = V06_ROADMAP §2 A-4b 行 + V072 §1 DEC-2（本草案即交付物）。无未关闭遗留项 |
| ② | 独立 golden | **计划就绪（未产出）**：§4 fl001_v2 / fl001_l1_oracle（独立 RK4、FL-1…8、4 Run、schema v2、T-B）。golden 后置系 V072 §0「golden 零变更、A-4b 只出草案不 emit」驱动的对 ② 字面顺序的偏离，**经 V072 批准（CHG-20261105-01）登记维持**（GTL1 §7.1 ② / PV001 §11 C-5 同款偏离登记）；emit 于 FLTH-G2b-03（v0.8.0），落地并 verify 通过后本项闭合 |
| ③ | UI 措辞与未建模物理清单 | **就绪**：§6.1 未建模 9 项 + §6.2 assumptions 6 条 + §6.3 文案预检（基线 copy-guard 实跑 PASS）+ I-5 专项声明 |
| ④ | 用户书面批准 | **待定（本轮）**：双路评审（FLTH-G2b-02）后留待用户裁定；批准与实现 v0.8.0（V072 DEC-2/DEC-5） |
| ⑤ | CHG 登记 | **部分闭合**：起草授权 CHG-20261105-01（V072 T7）已登记；批准 CHG 待批准轮登记（占位：批准 CHG 号批准时分配） |

### 7.2 门禁路径（G2b → G7）

```text
本草案（DRAFT v0.1）→ FLTH-G2b-02 双路独立评审（物理 A / 治理 B）→ 用户书面批准（v0.8.0 轮）
→ 批准 CHG（规格更名 APPROVED、条件修订进正文）→ FLTH-G2b-03 oracle + fl001_v2 emit
→ FLTH-G2b-04 实现（engine thermal 分支/systems.js 信号·假设·局限·level 变体/
  scenario thermal_model 键/checks.js energy-balance thermal 分支/UI 跨深度卡/测试涟漪）
→ G7 全链验收（golden 比对 + e2e + run-g2 --tier all 全绿 + copy-guard 终检）→ G8 发版（v0.8.0）。
〔进度标注：本草案 = FLTH-G2b-01（本波，CHG-20261105-01）；FLTH-G2b-02 起下轮。〕
```

scope 面：FL-001 系统级 approved_p0 与两族族级状态**不变**（FAULT_CATALOG §1；SA-24 白名单
零改动）；thermal 为 FL-001 系统内模型深度轨（新 cfg 键），不新增系统/族白名单面。
Arena：FL 在盲测池（P0）——**默认 off ⇒ 盲包语义零变化**（§2.0 差异理由④）；如批准轮翻转
默认或盲包显式钉 on，须同轮处置 Arena 配置锁定面（登记不预设，R-9）。

### 7.3 步数账（I-7）

现状 28 步（run-g2 28/28，acddba2 基线；预算 ≤29，V072 DEC-6 本波维持）。thermal 实现轮
（v0.8.0）的步数需求（verify_golden fl001_l1 注册步 + engine thermal 接线断言步归属）
**归实现轮 CHG 裁定**，本草案只登记纪律：新断言优先并入现有步（verify_golden 步①旁增
fl001_l1 校验、engine.test.js/plants.test.js 变体用例——ALINE §2 步数管理约束），确需新增步
时按 DEC-E 单波 ≤ +1 口径申报预算（FLTH-IMP-Q1）。

## 8. 实现排期提案（FLTH-G2b-01…04）

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| FLTH-G2b-01 | 方程集/常量表/更新序/锚点预填 + 独立复算（§2/§3；L0 冻结锚点 3 轨环境校验 worst 0.0 + thermal 四轨 RK4 + 半步长自收敛 6.16e-04 K + RK4 vs 子步解析交叉 5.68e-14 K；临时脚本已删除） | S | **已完成**（本草案 v0.1，2026-11-05，CHG-20261105-01） |
| FLTH-G2b-02 | 双路独立评审（物理 A：EQ-FLTH 自洽与量纲、§2.3 更新序四注记、锚点复算、守恒面 (a)/(b) 裁定复核、L1 判据对照；治理 B：五项条件/T-B 容差制度与 `_A` 分派缺口/golden 治理与不动清单/默认 off×GT Q4 差异理由/scenario 键 CHG 面/步数账）+ 用户书面批准 + 批准 CHG；条件处置追记（PV001 §11 体例） | M | 下轮（v0.8.0 准备） |
| FLTH-G2b-03 | fl001_l1_oracle.py 编写（oracle_base 出生接入、RK4、FL-1…8、T-B 容差实测冻结/降 T-C 预案）+ fl001_v2 emit（4 Run、schema v2、approval 首签）+ verify_golden `MODELS["fl001_l1"]` 注册行 + T-B series_limit `_A` 分支 + FAULT_CATALOG §1 thermal 注记行 + 域扫描含 §3.2 口径统一重推 | M | v0.8.0（依赖 02 批准） |
| FLTH-G2b-04 | 实现：engine simulateFL001Thermal 分支（§2.3 冻结序；simulateFL001 顶部 early-return——engine.js:832 GT 先例）+ systems.js（2 新信号含 exposure/sourceKind 落地（全非盲显、blindVisible 不设置；如需扩盲面另行裁定）/A-flth-* 6 条/limitations 9 项/EQ-FLTH-1…9/model_version 1.1.0/defaults.thermal_model='off' + normalizeConfig 盖章行/level·summary 变体）+ scenario EVENT_KEYS thermal_model（显式 CHG）+ checks.js energy-balance thermal 分支（EQ-FLTH-9）+ 指标面（E_source 热域扩展 + E_loss/T_bat 指标注册）+ UI（inspector/跨深度卡/因果模板变体）+ tests engine/plants thermal 变体（并入现有步）+ off 轨逐位不变验收（run_hash 快照）+ copy-guard 终检 + 步数账裁定（FLTH-IMP-Q1）+ provenance 派生裁定（FLTH-IMP-Q2） | L | v0.8.0（依赖 03） |

## 9. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | RK4 双实现（JS/Python）跨平台散差超 T-B 预案（libm 幂/指数差异） | 容差按实测散差 × 安全系数 ≥10 冻结（§4 项 6；半步长 6.16e-04 K → ×16 裕度）；超限降 T-C + convergence 块（双向预案）；禁 ULP 级承诺（ALINE R-5 同款） |
| R-2 | 「thermal 默认 off」与 GT-L1「thermo 默认 on」先例表面矛盾被误读为制度倒退 | §2.0 差异理由四条显式登记（P0 旗舰保守性 / T-A 验收链 / 教学编排不依赖默认翻转 / Arena 盲包零变化）；批准轮用户裁定（V072 §4 风险 2 同款） |
| R-3 | 守恒面 (a)「热损耗由发电机补偿」被误读为「损耗不存在/凭空补偿」 | §2.2.0 二选一显式对照 + A-flth-loss 记账口径声明 + r_meas 扩展恒等保持「+4 kW 是测量偏差，不是能量损失」教学点（§3.2 实证）+ I-5 自查（§6.3）+ 实现轮 copy-guard 终检兜底 |
| R-4 | load0=45 角点高温（T(60)=424.7 K、渐近 655 K）被误读为模型缺陷 | §3.4 域声明「合法角点、无热保护」+ §6.1 项 7 limitations + 教学演示建议默认 load0=30 |
| R-5 | 手拼配置 load_kW > 48.3 kW 破稳定性条件（正反馈失控） | §3.4/§6.1 项 8 声明 + 未来开放热参数配置须先立钳位的前置登记（L0 退化域声明同款纪律） |
| R-6 | fl001_v1/oracle 字节语义被实现轮误触（V-03 哈希失配 → 冻结锚点报废） | §0 不动清单 ①②③ + FLTH-G2b-03/04 工作面不含既有 oracle/golden 文件 + off 轨 run_hash 逐位不变验收（§3.3 项 3）+ 全量回归兜底 |
| R-7 | 信号目录增列（null 列面）破坏 off 轨比对/UI | §3.3 项 3/4：GT null 列先例（systems.js:708-711）+ 预期失效面登记 + golden 比对不受额外 null 列影响（gt001_v1/v2 现状佐证）+ tests/registry 哈希面同步更新 |
| R-8 | verify_golden T-B 分派无 `_A` 后缀分支（I 类序列落入缺省 f_Hz_atol 键）被漏改 | §4 项 7 显式工作面（FLTH-G2b-03）+ gt001_v3 T-B 参数化先例引用（verify_golden.py:106-125 实读） |
| R-9 | thermal_model 进 scenario/盲包指纹后语义漂移（既有场景哈希变化、Arena 钉轨歧义） | §2.4 显式 CHG + scenarioHash 含解析轨登记 + 默认 off ⇒ 盲包零变化（§2.0④）+ Arena 锁定面登记不预设 |
| R-10 | 盲包观测面误扩（热信号入 blind 投影） | §1.2 不入池显式声明（GTL1 B-1 先例）+ FLTH-G2b-04 保留「如需扩盲面另行裁定」开口 |
| R-11 | 教学参数（R0/C_bat/h 量级缩放）被误读为设备参数辨识 | A-flth-params「教学整定值非实测参数」+ §2.1 整定依据声明 + I-5 自查（§6.3）——GTL1 R-9 同款 |

## 10. 评审记录（预留表——FLTH-G2b-02 填写）

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | EQ-FLTH-1…9 自洽与量纲、§2.1 教学参数合理性、§2.3 更新序四注记、§3 锚点独立复算、§2.2.0 守恒面裁定复核、L1 判据对照、RK4 散差 | 待评 | — |
| 评审人 B（治理/口径/回归面） | §7 五项进入条件、T-B 容差制度与 `_A` 分派缺口、golden 治理（新 id/不动清单/旧 golden 留档）、默认 off×GT Q4 差异理由、scenario 键 CHG 面、步数账、预期失效面 | 待评 | — |
| 用户批准 | 批准与实现排期（v0.8.0） | 待定 | 本表为用户裁定输入 |

## 11. 决策点汇总（本草案裁定点；推荐项已经 V072「全采推荐」授权链预登记，批准轮确认）

| # | 决策 | 推荐 | 备选 |
|---|---|---|---|
| FLTH-DRAFT-Q1 | **守恒面：P_loss 去向**（§2.2.0，草案核心难点） | **(a) 进母线平衡**：P_gen = P_load − P_bat + P_loss，r_true/r_meas 定义恒等扩展含 −P_loss，E 恒等式闭合为 E_source + E_bat = E_load + E_loss，SOC 零涟漪（§2.2.0 五理由） | (b) 损耗离场：E 恒等式破坏、须重设计能量口径（SOC 改按 P_bat+P_loss 积分或恒等式带永久缺口项）——涟漪 M，与 DEC-2「SOC 定义不动」约束冲突 |
| FLTH-DRAFT-Q2 | T_bat RHS 的电流口径 | **I 冻结于子步起点**（§2.3 注记①；半步长实测 6.16e-04 K 上界，L0 序保留最简） | RK4 阶段值用子步内精确指数 I(s)（精度增益 <1e-7 K 量级、伪代码复杂化、oracle/引擎双侧复刻面变大） |
| FLTH-DRAFT-Q3 | r_meas 是否同轮扩展 | **同轮扩展含 −P_loss 项**（0.4·b 教学锚点在两深度逐位一致，§3.2 实证；「测量偏差 vs 真实损耗」教学区分保持纯净） | 不扩展（r_meas = 0.4·b + P_loss 混叠——max\|r_meas\| 变 4.13 kW 级、破坏 4.0 kW 冻结锚点与 questions[1] 教学问答） |
| FLTH-DRAFT-Q4 | E_loss 积分口径 | **子步梯形**（GTL1 E_gen/E_bat 梯形纪律同构；ΔE 半步长 2.2e-09 kWh） | 左矩形（engine intB 同构；离散偏差 ~1e-6 kWh 级，仍可冻结但精度冗余损失） |
| FLTH-IMP-Q1 | 步数账 | 实现轮 CHG 申报（verify_golden fl001_l1 + engine thermal 断言，优先并入现有步） | — |
| FLTH-IMP-Q2 | 文案终稿 / provenance 派生 / questions 追加 | 实现轮按 §6.3/§6.4 预检执行；provenance 派生（thermal on ⇔ L1 表达）与 GT 同位先例核对后定 | — |
| FLTH-IMP-Q3 | 默认轨翻转（off→on）如批准轮用户提出 | 保持 off（§2.0 四理由）；翻转须显式 CHG + 同轮处置 P0 验收链/Arena/文档面 | 用户裁定翻转（可撤销，涟漪 M） |

---

**修订记录**：v0.1（2026-11-05 初稿，A-4b 规格起草人，CHG-20261105-01）：L1 判据对照与
状态向量提案（T_bat 单动态状态 + P_loss/R_int 代数量——诚实区分）、thermal_model off|on
开关形态与默认 off×GT-L1 Q4 差异理由四条（§2.0）、守恒面 (a)/(b) 二选一裁定与推荐
（§2.2.0，Q1）、EQ-FLTH-1…9（K 制温度面 + r_true/r_meas 扩展恒等 + SOC 不动 + E 恒等
扩展）、RK4 分区更新序与伪代码（§2.3 四审查注记）、教学参数表（R0/α/C_bat/h 非实测
标注 + 整定依据）、L0↔L1-thermal 分歧预期表（§3.2 六行教学点）、L0 轨零变化声明
（§3.3 代码/数值/实现判据三层佐证）、包络与角点（load45 655 K 渐近/稳定性裕度/充电对称
教学点）、golden 计划（fl001_v2/T-B/oracle_base 出生接入/`_A` 分派缺口/旧 golden 留档/
无迁移债声明）、无对照轨声明（§5）、未建模 9 项 + assumptions 6 条 + 文案预检 + I-5 专项、
五项进入条件自查表、门禁路径与步数账、排期 FLTH-G2b-01…04、风险 R-1…R-11、评审预留表、
决策点 Q1…Q4 + IMP-Q1…Q3。

**状态**：`DRAFT`（v0.1，2026-11-05）——待 FLTH-G2b-02 双路独立评审 + 用户书面批准；
**批准与实现（fl001_v2 + 轨实现）v0.8.0**。本草案零代码/golden/oracle 触碰
（§0 不动清单）；数值预填以 fl001_l1_oracle emit 终值冻结为准（§3）。

**文件结束**。FL001_THERMAL_G2B_SPEC_DRAFT v0.1（2026-11-05，CHG-20261105-01 授权起草）。
