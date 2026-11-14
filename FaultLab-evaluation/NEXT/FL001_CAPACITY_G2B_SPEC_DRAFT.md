# FL001_CAPACITY_G2B_SPEC_DRAFT — FL-001 电池容量/内阻二阶效应（η_cap 温度-容量折算 + R_int 二次项）G2b 物理规格（DRAFT v0.1）

> **状态**：`DRAFT v0.1（2026-11-13）——待双路独立评审 + 用户书面批准；「SOC 定义不动」重开=核心裁定点请求、本草案无裁定效力`。
> **任务**：A-5 P2 FL 容量/内阻二阶效应 G2b 草案轮（V130_WAVE_DESIGN §0 做面 1 / §2 阶段一 W1；承
> A5_MULTIPHYSICS_EXPLORATION §2 提案一、FC001_ELECTROCHEM_G2B_SPEC_APPROVED §5「P1 落地一个
> 发布周期后」排期条件）。**授权**：V130_WAVE_DESIGN v1（CHG-20261113-04，2026-11-13 批准，
> DEC-1…7 全采推荐项）——P2 本波只到草案+双路评审（本波唯一 G2b 草案名额，A5 §7 结论 3）；
> **批准与实现 v1.4.0（两波节奏——GTL1/FLTH/MG/FC 四轮先例）**。
> **排期条件确认**：P1 FC 已于 v1.2.0 落地（FCECH-G2b-03/04，CHG-20261113-02，fc001_v2 在验）
> ⇒ 「P1 落地一个发布周期后」条件满足；FLTH-G2b-03/04 早已闭合（fl001_v2 于 v0.8.0 emit 在验）
> ⇒ A5 §2.4 ① 观察窗条件满足。
> **主源**：A5_MULTIPHYSICS_EXPLORATION §2 全文（P2 提案原文——本草案的形态与治理成本评估源，
> 含 §2.2 SOC 裁定突破专项评估）；体例模板 = FL001_THERMAL_G2B_SPEC_APPROVED v1.0（EQ-FLTH-1…9
> 现行文本 + §3.4 稳定性/48.2843 边界 + fl001_v2 golden 计划 + FL-1…8 自检 + A-flth-* assumptions）
> 与 FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0（**冻结后哈希先例全套**：B-1a 显式键/sub-object/
> onTrackOnly/B-3a/两门禁面——V120 落地证实机制直接套用）；§10/§11 体例补充 = MG001_G2B_SPEC_APPROVED
> v1.0；治理依据 = SCOPE_SPLIT_MEMO §8.2。
> **本草案无裁定效力声明**：两个核心裁定点（一：「SOC 定义不动」裁定重开——V072 DEC-2 链；
> 二：键形态三选一）+ 全部 Q 点（§11）均只给**候选+推荐+理由**，定案权在双路评审与用户批准轮
> （v1.4.0）；本草案不定实现、零代码/golden/oracle 触碰、不动任何既有裁定。
> **本波纪律符合性（V130 §0 延续）**：golden 零变更（既有 10 golden 字节冻结——本稿只引用不
> emit）；零新仿真轨（本稿为草案，engine.js/systems.js/scenario.js/scope.js/tools/oracle/**/
> data/golden/** 全链只读引用、零触碰）；零第三方依赖（I-1）；文案红线自查（本稿在
> FaultLab-evaluation/**，不在 copy-guard 扫描域 tools/copy-guard.mjs:15 `SCOPES=['src']` 内；
> 本波实跑 `node tools/copy-guard.mjs` → PASS（39 模式 0 命中）基线绿，§6.4 预检同轮登记）。
> **行号基准说明**：本文档行号引用为**起草时点（2026-11-13，v1.2.0 收口后干净树）实读值**——
> 本波 W3/W4/W5/W6 并发落地后 src/** 与 scripts/** 行号会漂移；后续评审轮与实现轮（FLCAP-G2b-02…04）
> 以**语义锚点**（信号 id/检查 id/函数名/键名/方程 id）为准定位，行号仅作评审快速索引
> （FLTH/FC 两轮头部同款说明沿用）。关键复核点实读：verify_golden.py:206 `DEFAULT_MODELS =
> ["fl001","fl001_l1","fc001_l1"]`、:207 起 T-B 分派分支；scenario.js:48 EVENT_KEYS、:56
> THERMAL_MODELS、:64 ELECTROCHEM_MODELS、:419-436 电化学键 B-1(a) 显式键条件式解析、:485-511
> hashProjection；engine.js:195-204 normalizeConfig 盖章块（thermal/electrochem 两行先例）、
> :319-330 validate 枚举守卫、:536 起 model_hash 具名九字段 hashObject、:672-676 simulateFL001
> 顶部 early-return、:586/:1177/:2821 onTrackOnly 三处门控；systems.js:640 FC `model.electrochem`
> additive 子对象、:566-568 FC 三信号 onTrackOnly、:690-699 level/summary 变体派生；arena.js:105
> `ARENA_EXCLUDED = ['PV-001','WT-001','MG-001']`（FL/FC 在池现状）。

---

## 0. 定位摘要、边界与不动清单

- **FL-001 capacity 轨（L1 扩展 · 容量/内阻二阶效应最小集）**：在 FL-001 既有双轨（off=L0 /
  thermal on=L1-thermal）**之外**新增第三轨——草案级键面 `capacity_model: "off"|"on"`（默认
  off，形态=核心裁定点二，§1.1）。on 时为电池新增两件**代数面**：① η_cap(T_bat) 温度-容量
  折算进 SOC 积分（EQ-FLTH-7 的分母由 40 kWh 改为 E_cap(T_bat) = η_cap(T_bat)·E_nom——精确式
  与折损函数形态 G2b 冻结）；② R_int 二次项（EQ-FLTH-2 线性式扩为 R0·(1+α·θ+β·θ²)，θ =
  T_bat − 298.15；β 新教学参数非实测）。P_loss（EQ-FLTH-3）与 T_bat 轨随之变化；**P_bat,true =
  0.4·I_true 口径不动**——功率链零反馈，反馈仅经 SOC 折算面进入（A5 §2.1 原文口径）。
- **做（本草案 = 评审与批准轮的规格输入面）**：键面三候选对照与推荐（§1.1）、状态向量与
  新物理量诚实区分（§1.2）、EQ-FLTH-2/7/9 修订草案级与编号提案（§1.3）、SOC_est/SOC_err 面
  登记（§1.4）、参数面与整定依据框架（§1.5，数值零编造）、assumptions/limitations/UI 措辞
  提案（§1.6）、场景/哈希/盲包涟漪登记（§2）、锚点结构与零变化硬条件预填（§3）、golden 计划
  提案（§4）、排期（§5）、红线自查与两裁定点对照表（§6）、Q 点清单（§11）。
- **不做（本草案显式排除）**：
  1. **L2 不做**：CFD/FEA/多体动力学维持不做（V05_ROADMAP §6 :169 / V06_ROADMAP §6 :116 /
     ALINE §12 :300 三处原文引用维持——A5 §6 全量确认，本轨不重引不放松）；
  2. **本草案不定实现**：零代码/golden/oracle 触碰；方程/常量/更新序/锚点数值一律未冻结
     （冻结权在批准轮——A5 §7 结论 1 同款）；实现须 FLCAP-G2b-03/04 按批准文本执行
     （I-4：用户逐版本指令派发）；
  3. **不动 V072 DEC-2**：本草案只把「SOC 定义不动」重开写成**显式裁定请求**（§6.2 对照表），
     不构成修订授权——批准留待用户书面声明；评审轮亦不得以本草案为据预先执行（A5 §8 R-4 同款）；
  4. **fl001_v1/v2 字节冻结零涉**：既有 off 轨（fl001_v1）与 thermal on 轨（fl001_v2）语义
     **字节级冻结维持**（A5 §1「emit 过的轨语义不得原地变更」；ORACLE_INTERFACE_D2 §3.1 :127
     「模型/方法变更 → 新 id」）——深化以新轨形态出生，fl001_v2 由新 golden fl001_v3 顺位承接，
     fl001_l1_oracle.py 物理零触碰；
  5. **老化轴不做**：ALINE §7「热-电-老化三元」中的老化轴（R₀/SOC 容量慢漂移——时间慢漂移/
     循环退化）不在本轨范围（本轨两件均为温度代数面、非时间慢漂移），另立轨留位（§1.6
     A-flcap-lump 声明；键名候选 aging_model 的误名风险随 §11 Q1 登记）。
- **本轮不动清单（起草轮；实现轮按 §8 排期执行其点名工作面时不受相应条目约束）**：
  ① `tools/oracle/` 全部 10 件零改动（fl001_l1_oracle.py 物理零触碰——V-03 字节语义）；
  ② `data/golden/` 既有 10 golden（含 fl001_v1/v2 + .sha256 sidecar）字节冻结留档；
  ③ engine.js/plants/fl001.js/scenario.js/systems.js/scope.js/scripts/verify_golden.py 零改动
  （均为实现轮显式工作面）；④ 不引入第三方依赖（I-1）；⑤ run-g2 35 步判据零翻转（0 新步
  预期——§4 项 9）。
- 时间尺度沿库口径：duration 60 s、输出网格 dt=0.1（601 点）、积分子步 0.01、默认注入
  t=20 s（FAULT_CATALOG §0——thermal 轨现状沿用，本轨零变更）。

## 1. 模型形态

### 1.1 配置键形态（**核心裁定点二**——三候选对照，推荐 (a)；不定案）

| 候选 | 形态 | fl001_v2 冻结涉面 | 哈希先例套用 | 组合拒绝成本 | golden 路由面 | 判定倾向 |
|---|---|---|---|---|---|---|
| **(a) 组合键 `capacity_model: "off"\|"on"`（推荐）** | 新正交事件级键（沿 thermal_model/electrochem_model additive 键先例），默认 off；**前置条件：thermal_model=on 才可 on**——非法组合结构化错误拒绝（不静默钳位） | **零涉**——thermal 轨（off/on 两值语义、EQ-FLTH-1…9、fl001_l1_oracle、fl001_v2 golden）全链不动，容量面以独立键独立 golden（fl001_v3）出生 | FC B-1a 显式键条件式哈希形态（scenario.js:419-436 先例同构）+ capacity additive 子对象（systems.js:640 FC `model.electrochem` 先例同构）+ onTrackOnly 列门控（systems.js:566-568 先例同构）——**V120 落地证实机制全套直接套用** | validate 枚举守卫（engine.js:319-330 同构新行）+ scenario 守卫 + 事件级/盖章级组合校验一行——S 级，A5 §3.2 已预登记的成本面 | (thermal_model, capacity_model) → golden 三元分派表（§4 项 10）——显式、可枚举 | **推荐**（理由见下） |
| (b) thermal_model 枚举扩值（'on_cap' 类第三值） | thermal_model 单键加值，capacity 语义钉在热轨枚举轴 | 值面 additive（off/on 旧值解析零变化）——但 golden 一一映射（off→v1、on→v2，FLTH §2.0）被扩为三值，fl001_l1_oracle 的 RUNS/golden 关联面与 verify 分派需按枚举值分流 | 枚举扩值不入既有场景哈希（off/on 解析不变）——但缺省轨解析入哈希形态（thermal_model 现行先例）与 face③ 冻结边界（V1_FACES:184-186「新键只影响使用它的输入」）张力需逐字复核 | 单键无组合规则——但「开关轴上塞第二开关」语义混合（off/on=开关语义 vs inertia 三值=互斥轨语义），GT linear/swing/thermo 先例不可平移 | 单值→golden 映射改为枚举分流——fl001_v2 关联面被触碰（管理成本 M） | 备选（GTL1 Q2「单键最小涟漪」理由在此被 golden 关联面成本抵消） |
| (c) thermal_model='on' 语义原地升级 | capacity 效应并入既有 on 值 | **breaking 排除**——fl001_v2 语义面变更（emit 过的轨语义不得原地变更 + golden 语义级变更 = breaking，V1_FACES §3.2） | — | — | — | **排除**（硬伤：fl001_v2 冻结锚点对新引擎失配——A5 §3.2 被排除形态同款登记） |

**推荐 (a) 的理由（四条）**：① fl001_v2 字节冻结零涉——thermal 轨全链（方程/常量/oracle/golden/
verify 注册行）逐字节不动，容量面以独立键+独立 golden 出生（新轨自始携带修订口径，G2b 批准即其
裁定依据——A5 §2.2 结论 3）；② FC 冻结后先例全套直接套用（B-1a 显式键/sub-object/onTrackOnly/
B-3a scenarioView 零投影/两门禁面——V120 五机制落地证实，制度复用成本最低）；③ golden 路由面
显式（三元分派表可枚举、两门禁面沿 FC §4 项 10 形态）；④ 未来扩展轴干净（容量面/热面/老化轴
各自独立键，ALINE §7 三元方向互不挤压）。组合拒绝规则成本 S 级显式登记（A5 §3.2 形态 b 同款
预登记口径）。

### 1.2 层级判定与状态向量（诚实区分——I-2）

**无新增 ODE 状态：T_bat 仍唯一热 ODE 状态（y = [T_bat]，1 维；RK4 dt0.01 分区更新序沿 FLTH
§2.3 冻结骨架）**。新物理量的 honest 区分（沿 GTL1 §1.2 / FLTH §1.2 体例；A5 §2.1 同款）：

| 量 | 类型 | 信号 id 提案 | 单位 | 定义 | 备注 |
|---|---|---|---|---|---|
| T_bat | ODE 状态（保留，唯一热状态） | T_bat_K（复用） | K | EQ-FLTH-4 原样（C_bat·dT/dt = P_loss − h·θ）；RHS 内 R_int 换用 EQ-FLTH-10 修订式 | ODE 结构不变、RHS 表达式扩展 |
| **E_cap** | **代数（新）** | E_cap_kWh | kWh | E_cap(T_bat) = η_cap(T_bat)·E_nom | 可用容量折算面（SOC 积分分母）；E_nom = 40 kWh 冻结值不动 |
| **η_cap** | 代数（新，不出信号候选——Q10） | （由 E_cap 承载） | 无量纲 | 折损函数形态 G2b 冻结（Q2）；η_cap ∈ (0,1] | 高温段线性折损草案示意（A5 §2.1）；单独出信号会扩盲包/序列面，最小集不设 |
| R_int | 代数（修订式，不出信号） | （由 P_loss 承载） | Ω | EQ-FLTH-10：R0·(1 + α·θ + β·θ²) | β 教学参数非实测；R0/α 冻结值原样 |
| P_loss | 代数（保留信号，定义式随 R_int 变） | P_loss_kW（复用） | kW | EQ-FLTH-3 原式（I_true²·R_int） | on_cap 域数值随之变化；记账面 EQ-FLTH-5/8 不动 |
| SOC_true / SOC_est | 积分面（保留信号，分母分域） | 复用 | % | EQ-FLTH-11（§1.3） | SOC_est 与 L0/fl001_v2 **逐位同**（测量链不动）；SOC_err 签名面变化（§1.4） |

**层级判定**：无新增 ODE 状态，但**SOC 定义式结构变更 = 新物理面**——层级判定走 ALINE §1.2
第三行（:53）「新增状态变量/新物理（方程集扩展）→ 完整 G2b」：EQ-FLTH-2/7 修改即方程集扩展，
与是否增状态无关（A5 §2.1 同款声明）。GTL1 §1.1 表「新物理状态变量」判据列在本提案由
「SOC 定义式结构变更 + R_int 非线性化（RHS 由 θ 线性变为 θ 二次——Riccati 型）」两个新物理面
满足；L1-lite 诚实注沿 FLTH §1.1 句式（单状态集总、非高维/刚性，按第三行走完整 G2b——本草案
即该流程）；对照表由批准轮正式填写。**方程不可手解判据复核**：β·θ² 使 T-ODE 子步内在 I 冻结
口径下不再是线性常系数 ODE，而是常系数 Riccati 方程（θ′ = a·θ² + b·θ + c）——存在闭式解
（tanh/arctan 形态）但非 FLTH FL-7 的线性指数形态；子步解析交叉面形态归批准轮冻结（§4 项 3）。

### 1.3 方程修订草案级（**非权威文本——批准轮冻结**；编号提案见 Q9）

| id 提案 | 方程（草案级） | 对应既有方程与说明 |
|---|---|---|
| EQ-FLTH-10 | **R_int(T_bat) = R0·(1 + α·θ + β·θ²)**，θ = T_bat − 298.15（K 制；T_bat 单位 K） | ≡ EQ-FLTH-2（FLTH :215）域内修订——β>0 时 R_int 随温升加速增大（正温度反馈增强）；β = 0 时精确退化为现行线性式（退化为 fl001_v2 轨的结构自洽面）；R0/α 冻结值原样；β 教学参数非实测（A-flth-params 句式沿袭） |
| EQ-FLTH-11 | **SOC_true = SOC0 − 100·∫₀ᵗ P_bat,true(t′)/E_cap(T_bat(t′)) dt′/3600**（kW·s→kWh 同基）；**SOC_est = SOC0 − ∫P_bat,meas dt/(40 kWh)×100% 原式不动**；E_cap(T_bat) = η_cap(T_bat)·E_nom | ≡ EQ-FLTH-7（FLTH :220）域内修订——SOC_true 分母由 E_nom 改为时变 E_cap(T_bat)（积分内时变分母的离散口径——子步内 E_cap 冻结于子步起点 vs 梯形，批准轮冻结面）；**SOC_est 维持 E_nom 测量记账口径**（测量链零升级——与 FC Q5 定案「测量/控制链零升级」同构）；积分对分母时变性的数值口径与 P_bat 符号域（充/放电）行为归批准轮冻结 |
| EQ-FLTH-12 | **稳态：β·I²R0·θ_ss² + (α·I²R0 − h)·θ_ss + I²R0 = 0**（二次代数方程，物理根 = 小根 θ₋）；**局部稳定性条件：h > I_true²·R0·(α + 2β·θ)**；全轨失稳（无实稳态）边界：判别式 Δ = (h − α·I²R0)² − 4β·(I²R0)² < 0 ⟺ **h = I²R0·(α + 2√β)**（闭式，√β 单位 1/K 自洽——推导注：稳定根处 I²R0(α+2βθ₋) = h − √Δ < h 恒成立） | ≡ EQ-FLTH-9（FLTH :222）域内重推——θ_ss 不再是线性闭式；β = 0 时判别式退化为 Δ = (h−αI²R0)²、稳定性条件退化为 h > I²R0α（现行式精确还原）；**闭式保留 vs 数值求解 = 裁定点**（§11 Q3——推荐闭式保留：FLTH EQ-FLTH-9 闭式先例 + oracle 自检交叉面 + 教学可见；本行推导可由评审独立重推，精确文本批准轮冻结） |

**守恒面声明（与 FLTH Q1 性质不同的诚实登记——A5 §2.2 结论 1 照录）**：P_bat,true = 0.4·I_true
口径不动 ⇒ **EQ-FLTH-5（P_gen = P_load − P_bat + P_loss）/EQ-FLTH-6（r_true/r_meas）/EQ-FLTH-8
（E 恒等式与子步梯形）/EQ-FLTH-9 检查式（E_source + E_bat − E_load − E_loss ≡ 0）全部不动**——
η_cap 只改 SOC 折算分母（记账面），无第二缺口项、无「补偿去向」裁定面，守恒面零涟漪维持；
checks.js energy-balance FL 分支零改动预期。突破面**被限定在 SOC 折算面一项**（FLTH Q1 方案 (a)
定案文本零触碰）。A-flth-loss/A-flth-no-feedback 假设在 capacity on 域的变体条款见 §1.6。

### 1.4 SOC_est / SOC_err 面（测量链不动 ⇒ 双因化登记——FC A-5 同构）

| 面 | capacity on 域行为 | 判据/声明 |
|---|---|---|
| SOC_est | 与 L0/fl001_v2 **逐位同**（测量链 P_bat,meas = 0.4·(I_true+b) 不动、分母 E_nom 不动） | 结构判据（FC §3.2「I_fc 与 L0 逐位同」同构）；oracle 自检硬条件（§4 项 4） |
| SOC_true | E_cap(T_bat) ≤ E_nom ⇒ 放电段下降加快、充电段上升加快（|ΔSOC| 放大——结构性方向声明；数值批准轮定案） | 方向为 η_cap ≤ 1 的构造推论；healthy/monitor 轨的折算幅度随 η_cap 形态（Q2 阈值 vs 全域）定案 |
| **SOC_err** | 分歧机理从「测量链偏差」**单因扩展为「测量链偏差 + 容量折算」双因**（A5 §2.2 结论 4）——签名面变化 | FC A-5 记账基登记同构；questions/SOC_err 指标解释卡双因化文案归 G2b 文案面（§6.4 预检同轮）；**FLTH Q3 教学锚点「max\|r_meas\| = 4.0 是测量偏差，不是能量损失」维持纯净**（r_meas 面 EQ-FLTH-6 无容量项——r 面与 SOC_err 面分离，登记不混同） |

### 1.5 参数面（**数值一律「批准轮定案」零编造**；整定依据框架四条）

| 参数 | 单位 | 状态 | 整定依据框架（批准轮据此定案并全量复扫） |
|---|---|---|---|
| **β** | 1/K² | 教学参数，**数值批准轮定案**（非实测——A-flcap-params 声明） | ① 60 s 窗可见性：β·θ² 项对 P_loss 的贡献在 60 s 演示窗内可见且与 α 线性项可区分（教学可辨识性——GTL1 R-7「同值误读」反向运用：有意取异值）；② 注册域单调：P_loss 对 T 单调增（α + 2β·θ ≥ 0 于注册 θ 域全域）；③ 稳定性裕度：h > I²R0(α+2βθ) 于注册域最大 I 与注册 θ 域全域成立（角点复扫）；④ 稳态存在域：Δ ≥ 0 于注册域全域（失稳边界 h = I²R0(α+2√β) 定案后重推 48.2843 kW 类手拼越界声明） |
| **η_cap 折损形态参数**（k_cap、T_cap0 或等效参数集） | 1/K、K | 形态=Q2 裁定点、数值=**批准轮定案**（非实测） | ① η_cap ∈ (0,1] 域硬条件；② 60 s 窗内 SOC 折算可见性（healthy 温升域内可见 vs 阈值上方可见——两候选的教学差异随 Q2 对照）；③ 注册域内 η_cap 单调不增；④ 与 β 联合域扫描（T_bat 轨加深 ⇒ η_cap 折算面随之变化——双向耦合面全量复扫） |
| R0 / α / C_bat / h / T_amb / E_nom / DT_INT | — | **冻结值原样**（FLTH §2.1：0.2 Ω / 0.01 1/K / 300 J/K / 10 W/K / 298.15 K / 40 kWh / 0.01 s） | 零变更（本轨不触碰 thermal 轨常量——fl001_v2 字节冻结零涉的结构保证） |

### 1.6 assumptions / limitations / UI 措辞提案（批准轮冻结；实现轮迁入 src/** 前 §6.4 预检 + copy-guard 终检）

| id | text（草案级） |
|---|---|
| A-flcap-cap | 【仅 capacity_model=on 适用】可用容量按温度折算：E_cap(T_bat) = η_cap(T_bat)·E_nom（η_cap ∈ (0,1]，折损形态批准轮冻结）；为教学尺度折算面（教学示意），容量慢漂移与循环老化未建模。 |
| A-flcap-params | 【仅 capacity_model=on 适用】β 与 η_cap 折损形态参数均为教学整定值（非实测参数）：按 60 s 演示窗内二阶效应可见、注册域单调与稳定性裕度整定，不对应任何真实电池包容量-温度特性或参数辨识。 |
| A-flcap-soc | 【仅 capacity_model=on 适用】SOC 折算口径：SOC_true 以 E_cap(T_bat) 为分母（记账面）；P_bat,true = 0.4·I_true 口径不动，功率链零反馈；SOC_est 维持铭牌容量测量记账口径与 thermal_model=on 轨逐位同；SOC_err 为测量链偏差 + 容量折算双因（模型已知结构面）。 |
| A-flcap-stability | 【仅 capacity_model=on 适用】热平衡稳定性条件 h > I_true²·R0·(α + 2β·θ) 与稳态存在条件（判别式 ≥ 0）在注册参数域内成立（β 定案后角点复扫）；手拼配置越域可破（无热保护，见局限）。 |
| A-flcap-l1 | 【仅 capacity_model=on 适用】容量-内阻二阶效应模型为教学尺度单状态集总示意（L1 扩展），不是经过验证的设备控制器或电池容量模型。 |

（A-flth-lump/A-flth-params/A-flth-loss/A-flth-no-feedback/A-flth-stability/A-flth-l1 六条既有
assumptions **零触碰**——capacity on 域变体以上表新条承载，挂 capacity additive 子对象（§2
契约面行）；A-flth-no-feedback 的「温度对容量折算不做」半句在 capacity on 域由 A-flcap-cap/A-flcap-soc
显式取代——域内取代关系批准轮冻结。）limitations 追加（capacity on 域，4 项）：① 容量慢漂移/
循环老化未建模（教学示意折算面——ALINE §7 老化轴另立轨留位）；② β 二次项为教学参数（真实电池
R(T) 高温段形态未建模——FLTH §6.1 项 2 扩域）；③ 稳定性域边界移动（FLTH §3.4 登记的 load_kW >
48.2843 kW 越界边界在 capacity on 域失效——新界 β 定案后重推，注册域全量复扫为 emit 硬条件）；
④ 沿袭 thermal 轨全部局限（单节点集总/无热管理/环境常数/无热保护等）。UI 变体提案：on =
「L1 · 单节点热-容量折算模型（数值仿真级）」；summary 追加「电池按温度折算可用容量、内阻随温升
非线性增大（教学折算面）」；定位句「教学尺度容量-内阻二阶效应示意（L1 扩展），非机组/电网动态
验证」——全部预检见 §6.4。

## 2. 场景/事件族影响面（零新事件族 + scenario 新键 additive 显式 CHG）

| 面 | 登记内容 |
|---|---|
| 事件族 | **零新事件族**：sensor_drift / load_step / actuator_fault 三族定义、参数域、defaultTime、因果模板零变更——on_cap 轨仅物理响应面变化（同故障跨深度对比 = 教学点，ALINE §6.4 固定句式「模型深度导致的表达力差异」） |
| scenario 新键 | EVENT_KEYS（scenario.js:48）additive 新键 `capacity_model` + 枚举常量 CAPACITY_MODELS = ['off','on']（:56 THERMAL_MODELS / :64 ELECTROCHEM_MODELS 同构新增）+ 系统守卫 declaresCapacity 派生（:404/:425 同构；**守卫含前置：declaresCapacity 要求 defaults.thermal_model 已声明**——组合前置的结构承载）；缺省（不提供）解析为系统默认轨（= off）；**schema v1 白名单扩展须显式 CHG**（FLTH §2.4 / FC 面③ 先例——additive） |
| **哈希形态（沿 FC B-1a 定案）** | `capacity_model` **仅在场景输入显式提供时**才写入归一化事件与 hashProjection（scenario.js:419-436 电化学键先例同构），**缺省轨解析只在引擎 normalizeConfig 盖章层发生**（engine.js:199-204 同构新行）⇒ **既有 FL/全库场景 scenarioHash 零变化**（face③ 冻结边界原文 V1_FACES:184-186「新键只影响使用它的输入，既有场景解析与哈希不变」；FC Q9 定案先例照录） |
| **模型哈希面（沿 FC B-2 定案）** | on_cap 轨全部声明面（A-flcap-* 五条、on 域 limitations 4 项、EQ-FLTH-10…12 equations、level_on/summary_on 变体）**挂 SystemDef 模型级 additive 子对象 `model.capacity`（systems.js:640 FC `model.electrochem` 先例同构）——置于 model_hash 具名九字段哈希域之外**（engine.js:536 hashObject 输入清单：model_id/model_version/assumptions/limitations/equations/units/claims/unit_system/equation_ids——**不加入**）⇒ model_hash/run_hash/config_hash 既有输入全部零变化；既有五数组逐字节不动 |
| **新信号列门控（沿 FC onTrackOnly 定案）** | 新信号（E_cap_kWh；η_cap 不出信号候选——Q10）**带 onTrackOnly 标记**（systems.js:566-568 FC 三信号先例同构）——off 轨与 thermal on 无 capacity 轨**结构性缺席不建列**（engine.js:586 makeSeries 门控）⇒ run_hash 的 signals 面零变化（**W3 探针已证：普通 null 列会改 run_hash、onTrackOnly 门控规避**——V120 落地证实机制）；on_cap 轨由引擎 on 轨补建行承载（engine.js:1177 先例） |
| config_hash 投影（沿 FC B-3a 定案） | scenarioView 投影**不入 capacity_model**（thermal_model/electrochem_model 现状均不入——schema.js 同构）；**显式登记已知局限：capacity on/off 两轨 config_hash 同值（FL/FC 现状同款），轨区分由 run_hash/序列内容承载——不静默** |
| 事件快照 | 零扩展（E_cap 不入事件快照——FLTH §3.6 最小集声明同款） |
| 盲包 | FL 在盲测池（arena.js:105 ARENA_EXCLUDED 现值不含 FL-001——实读）；默认 off + 显式键条件式 ⇒ 盲包 config 指纹/观测语义零变化；**新信号不入盲投影显式声明**（GTL1 §1.2 B-1 先例）；未来盲包钉 on_cap 须同轮 Arena 锁定面裁定（登记不预设——FLTH R-9 同款） |
| 契约面 additive 通道（V1_FACES 八面冻结下核对） | 面① defaults/信号 additive（assumptions 走模型级 additive 子对象——B-2 形态）；面② 新 golden 新 id；面③ 新事件键 additive（B-1a 显式键条件式）；面⑥ scope 零改动预期（**FL classify 不消费 cfg 键与 modelVersion——FLTH §4 项 5 B-1 已评审核实「不校验、仅登记」，本轨零新增校验**）；面⑦ 步数账 0 新步预期（实现轮 CHG 申报）；面⑧ 词表零增预期——**零 breaking 预期**（既有 golden 零触碰/既有哈希零变化/既有 run-g2 步判据零翻转，V1_FACES §3.4 additive 边界三条逐一对照） |

## 3. 锚点与包络预填（off/thermal-only 轨逐位硬条件；on_cap 轨数值留批准轮——零编造）

### 3.1 off 轨与 thermal on 无 capacity 轨零变化硬条件（三层佐证体例沿 FLTH §3.3 / FC §3.1）

1. **代码结构佐证**（本草案轮实读）：`grep -rn "capacity_model" src/` = **0 命中**（2026-11-13
   实跑）——本轨未触任何代码；FL 分派链现状（engine.js:672-676 thermal early-return + off 路径）
   即全部既有轨代码路径；
2. **数值佐证**：fl001_v1（4 Run）与 fl001_v2（4 Run）冻结 golden 在验（run-g2 verify 步①
   无参调用三 golden——DEFAULT_MODELS 实读 :206 现状）；fl001_l1_oracle FL-1…8 自检 exit 0 为
   emit 现状；copy-guard PASS（39 模式 0 命中，本波实跑基线绿）；
3. **实现轮零变化判据（FLCAP-G2b-04 验收项——FC §3.1 项 3 B-2 形态合并重述）**：
   **关键句式：capacity_model=off 时全链与既有轨逐位同——off 轨与 fl001_v1 逐位同、thermal on
   无 capacity 轨与 fl001_v2 逐位同**。判据 = t/signals/metrics/checks/config_hash + 对应 golden
   比对零变化 + run_hash 逐位同；承载机制三件（§2 哈希面三行）：B-1a 显式键条件式（既有场景
   scenarioHash 零变化）+ capacity 子对象于 model_hash 九字段域外（既有五数组逐字节不动）+
   onTrackOnly 列门控（新信号列在既有轨结构性缺席）；tests/registry.test.js 哈希面既有断言零
   变化（仅 additive 新断言——on_cap 轨 Run 哈希为新值）；既有引擎/FL 测试断言零改动通过；
4. **预期失效面（非「变化」，登记）**：SystemDef.signals +1~2 ⇒ 信号目录 additive（**manifest
   model_hash 零变化——signals 不在 :536 哈希域，FC §3.1 项 4 B-2 定案同款实读维持**）；
   tests/registry.test.js additive 新断言；FAULT_CATALOG §1 注记行；UI 层级徽章变体（off 视图
   零变化，on_cap 视图 additive）。

### 3.2 on_cap 轨锚点结构（**数值一律批准轮域扫描定案——零编造**；本节冻结方向声明与判据形态）

健康局结构表（数值列留批准轮）：

| 锚点 | 口径 | 值 | 判据形态 |
|---|---|---|---|
| T_bat(0) | = T_amb（冷启动） | 298.15 K（登记常量） | 精确值 |
| T_bat 轨 | β·θ² 项使温升加深 | **方向声明（结构性）：β > 0 ⇒ R_int(T) ≥ 线性式 ⇒ P_loss ≥ 线性轨 ⇒ T_bat(t) ≥ fl001_v2 同 I 轨逐点**（同 I_true 轨下——I 面零反馈的结构推论） | 方向无条件；数值批准轮 |
| θ_ss | EQ-FLTH-12 二次小根 | 批准轮定案（Δ ≥ 0 域内） | 闭式（Q3 推荐）复算抽查 |
| SOC_true(60) | EQ-FLTH-11 折算 | 批准轮定案 | 放电段下降加快（方向声明 §1.4） |
| SOC_est(60) / E_bat | 测量链不动 | **与 fl001_v2 逐位同** | 结构判据（oracle 自检硬条件） |
| E_loss / P_loss 轨 | 随 R_int 修订式 | 批准轮定案 | ≥ 线性轨（方向声明） |
| monitor 轨热面 | b 不进物理回路 | **T_bat 与 healthy 轨逐点恒等**（max\|ΔT\| = 0） | FLTH FL-6 同构判据（FCAP-6） |
| r_true / r_meas | EQ-FLTH-5/6 不动域 | r_true ≡ 0；r_meas ≡ 0.4·b（max = 4.0 kW 锚点保持） | FLTH Q3 锚点纯净维持 |

同故障分歧预期表（结构预登记，数值列批准轮）：sensor_drift（教学链五段延伸：测量偏差→电流→
损耗→温度→**容量→SOC**——A5 §2.2 结论 4；SOC_err 双因化的主教学 Run）；monitor_only（热面恒等
+ SOC_est 偏、SOC_true 折算的双因对照）；load_step（大电流角点——I² 项放大 + 折算面联合域扫描
主角点）；actuator_fault（限幅深降温——容量折算面回摆方向声明）。三 Run 对照轨 = fl001_v2
同 Run（跨深度对比：L1-thermal ↔ L1-capacity 双列差异带）。

### 3.3 包络与角点预登记（域扫描 = emit 硬条件——GTL1 A-2 域扫描冻结先例）

| 项 | 声明 |
|---|---|
| **稳定性边界移动（预登记）** | FLTH §3.4 登记的 load_kW > 48.2843 kW 越界边界（h > I²R0α ⟺ I < √(h/(R0α))）在 capacity on 域**失效**——新边界 h > I²R0(α + 2√β)（EQ-FLTH-12 闭式）：**结构性方向声明——α + 2√β > α ⇒ 新边界严格下移**（数值 β 定案后重推）；**注册域全量复扫 = emit 硬条件**（--domain-scan 扩展面：load0 角点 × 稳定性裕度列 × 判别式 Δ 列——fl001_l1_oracle --domain-scan 先例同构扩展）；手拼越域 limitations 声明更新（§1.6 ③） |
| 局部稳定性条件 | h > I²R0(α + 2β·θ)（升温段 θ > 0 时比 β = 0 条件更紧）；RK4 显式步长稳定域 dt·(h − I²R0(α+2βθ))/C_bat ≲ 2.78（FC A-6 登记同款——dt = 0.01、批准轮域扫描复测） |
| 稳态存在域 | 判别式 Δ = (h − α·I²R0)² − 4β·(I²R0)² ≥ 0 于注册域全域（FCAP-8 断言面）；Δ < 0 域 = 全轨失稳域（无热保护局限沿袭 + 越域声明） |
| η_cap 域 | η_cap ∈ (0,1] 于注册 θ 域全域（FCAP-8 断言面）；折损起始域外 η_cap ≡ 1（形态候选 Q2——阈值形态下低温域与 thermal on 轨兼容面） |
| load0=45 角点 / load0=10 充电角点 | 高温合法角点（无热保护局限沿袭——FLTH §3.4 声明形态）；充电 I² 律符号对称性在 β·θ² 下维持（θ 依赖 T_bat 轨、与 I 符号无关——结构推论）；数值批准轮复算冻结 |
| 手拼配置 | normalizeConfig 不新增钳位（最小集预期——FLTH/FC 现状维持）；越域后果经 limitations 声明 |

## 4. golden 计划（fl001_v3 · 新 id · 独立 oracle · oracle_base 出生接入 · 旧 golden 留档；本草案轮零改动——emit = FLCAP-G2b-03）

| # | 项 | 内容 |
|---|---|---|
| 1 | 新 id 判据 | golden_id = **fl001_v3**——SOC 定义式结构变更（EQ-FLTH-11）= 模型/方法变更 → 新 id（ORACLE_INTERFACE_D2 §3.1 :127）；保 id 重出不适用（非引擎行为零变更原地扩容）；**supersedes 链 v3→v2→v1** |
| 2 | 独立 oracle | 新文件（**命名 Q4**——推荐 `tools/oracle/fl001_cap_oracle.py`，MODELS 键镜像 `fl001_cap`）：独立性声明沿 fl001_l1_oracle.py:5-19 体例——不 import src/**、不 import fl001_oracle/fl001_l1_oracle、方程与常量唯一权威文本 = 本规格批准文本、stdlib（python -I）自含硬编码；**出生即 oracle_base 接入**（六成员 + resolve_run_spec + write_golden_with_sidecar LF 钉死 + approval 三字段非 null 方可落盘 + SERIES_IDS 含 "t" 列）；golden 由本 oracle 只读生成、engine 只读比对（G0-DEC-16）；**fl001_l1_oracle.py 物理零触碰**（V-03） |
| 3 | 数值方法 | **T_bat**：经典 RK4 dt0.01（沿 GT-L1/FLTH/FC 制度；RHS 内 I_true 冻结子步起点——FLTH Q2 定案口径同构推荐）；**I_true**：保留 L0 精确指数子步（plants/fl001.js stepOf 语义——分区结构 §1.2）；**SOC 折算积分**的时变分母离散口径（子步冻结 vs 梯形——批准轮冻结面）；**子步解析交叉形态**：β = 0 退化为 FLTH FL-7 线性指数交叉；β > 0 子步内为常系数 Riccati 方程（闭式存在）——交叉面采 Riccati 闭式 or 降级为半步长自收敛为主判据，批准轮冻结（登记不静默） |
| 4 | 自检预案 | 新段 **FCAP-1…n（Q5 定案候选——推荐新段编号，FL-x 为 fl001_l1_oracle.py 专属证据链、续编混淆 V-03 追溯面——FC Q8 同款理由）**：FCAP-1 环境校验（**fl001_v1 闭式复现 + fl001_v2 4 Run 全序列复现**——capacity off 与 fl001_v2 逐位同的 oracle 侧固化，判据 ≤1e-9）；FCAP-2 恒等式（r_true ≡ 0 / EQ-FLTH-9 检查式不动域 / E 恒等式）；FCAP-3 **电气面与测量面跨轨恒等**（I/SOC_est/E_bat/r_meas 与 fl001_v2 ±1e-9 逐点恒等——§1.4 结构判据的 oracle 侧固化）；FCAP-4 网格与事件相位（601 点、t[i]=i·dt、pre/post 语义、事件快照零扩展）；FCAP-5 锚点全表复算（§3.2 批准轮冻结值）；FCAP-6 monitor 热面恒等（T_bat 与 healthy 逐点同）；FCAP-7 半步长自收敛登记 + 解析交叉（判据按双实现复算散差 ×≥10 且下限 ≥1e-9 冻结制——FLTH A-2 同款）；FCAP-8 无 NaN/Inf + 包络抽查（**稳定性裕度断言 h − I²R0(α+2√β)·(角点) > 0 + 判别式 Δ ≥ 0 + η_cap ∈ (0,1] 三断言**——§3.3 域硬条件） |
| 5 | Run 集（**Q7**） | **镜像 fl001_v2 全集 4 Run、全部 thermal_model=on + capacity_model=on**：healthy / closed_loop_fault（sensor +10）/ monitor_only / actuator_closed_loop（55%）——新 id golden 镜像基线全集先例（FLTH §4 项 4 镜像 4 Run / FC Q6 (a) 镜像 5 Run）；monitor 不变量判据面保留 |
| 6 | 元数据（schema v2） | golden_schema_version="v2"；golden_id="fl001_v3"；model_id="FL-001"；**model_version = '1.1.0' 维持仅登记（推荐——FC Q1 定案 B 同构：golden 语义由 golden_id 承载；FL classify 本就不消费 modelVersion——FLTH B-1 核实维持）**；method_id 提案 "fl001_capacity_rk4_dt0.01"（fl001_thermal_rk4_dt0.01 句式）；engine_baseline=null；backend=null；**thermal_model:"on" + capacity_model:"on" 双键入 config 块**（fl001_v2 thermal_model 先例扩双键）；supersedes="fl001_v2（thermal 轨 capacity_model=off，字节冻结留档；存档场次继续引用 v2）"；units 零新增预期（kWh 既有——若 η_cap 出信号则无量纲单位面随 Q10）；approval 三字段非 null 首签引批准 CHG（v1.4.0 轮）；SERIES_IDS = fl001_v2 全 16 列 + 新信号列（onTrackOnly 门控不删列、仅 on_cap 轨有值——终值以 fl001_v2 series 键集实读 + 新信号核对为准，FCECH-G2b-03 同款核对面） |
| 7 | 容差 tier（**Q8**） | **T-B 预期**（RK4 双实现、T_bat 温度反馈 ODE 无全局闭式——FLTH/FC 同制）；gate 块键面预案 = fl001_v2 gate 全键面（I_A/T_K/P_kW/E_kWh/SOC_pp/r_true_kW/r_meas_kW_atol/t_s）+ 新键面随信号集 Q10；**gate 键面缺口预登记（B-4 形态显式硬项）**：E_cap_kWh 序列键将命中 `_kW` 后缀支（kWh/kW 量纲错配风险）——FCECH-G2b-03 `_V` 分支新增先例同款：FLCAP-G2b-03 视信号命名落点**新增分支或调整命名** = 显式硬项（additive，不静默）；超限降 T-C 并必附 convergence 块（双向预案） |
| 8 | verify_golden | 注册面为硬编码表：新增 `import fl001_cap_oracle` + `MODELS["fl001_cap"]` 注册行（fl001_l1 注册行结构镜像——:91-110 实读；i_true="I_bat_true_A"/i_meas="I_bat_meas_A"、event_tol 缺省 I_A_atol、scalars 按 fl001_v3 实际键面全量注册）；**DEFAULT_MODELS 追加与否（Q6——推荐追加 "fl001_cap"：verify_golden.py:206 现值 ["fl001","fl001_l1","fc001_l1"]，FC B-5 定案先例形态** ⇒ 步① 无参调用四 golden 顺序验证；步① label 滞后说明沿 V120 DEC-5 处置维持登记不修）；**MODELS["fl001"]/["fl001_l1"] 零改动维持验 v1/v2**（默认轨不重指向——FLTH §4 项 7 同构） |
| 9 | 预期失效面 | 新增 `data/golden/fl001_v3.json`(+`.sha256`)；**既有 10 golden 字节零变更**；engine.test.js/plants.test.js capacity 变体**并入现有步**；registry.test.js 哈希面既有断言零变化 + additive 新断言（B-1a/B-2 形态）；FAULT_CATALOG §1 注记行；信号目录；UI 层级徽章变体；**步数账 0 新步预期**（run-g2 35 维持——DEC-6 本波 0 新步先例；归实现轮 CHG 申报，I-7） |
| 10 | 两门禁面（FLTH B-2 / FC §4 项 10 同构） | ① **engine↔fl001_v3 T-B 比对面** = verify_golden fl001_cap 全轨 + engine.test.js capacity 变体对 fl001_v3 关键值断言；② **on_cap 轨 P0 验收路由**：(thermal_model, capacity_model) → golden **三元分派表：(off, ·)→fl001_v1 / (on, off)→fl001_v2 / (on, on)→fl001_v3 / (off, on)=非法组合拒绝**——fl001_v3 emit verify 通过前 capacity on 轨不进 P0 验收路径（不静默）；acceptance.keyValues 现值显式声明为既有轨专用冻结锚点，on_cap 轨 keyValues 由 fl001_v3 golden 承载、acceptance 面按 cfg 分域（FLTH A-3② 同构） |

## 5. G2b 排期（FLCAP-G2b-01…04；两波节奏）

1. **FLCAP-G2b-01（本草案，已完成）**：V130 波阶段一 W1（2026-11-13，CHG-20261113-04 授权）——
   本文件 v0.1；
2. **FLCAP-G2b-02（双路独立评审 + 用户批准，v1.4.0）**：评审 A（物理/数值：EQ-FLTH-10…12 自洽
   与量纲、Riccati 子步形态、η_cap 形态域、稳定性二次代数重推、锚点复算、L1 判据对照）+
   评审 B（治理/口径：五项条件、两裁定点对照表复核、哈希先例套用核对、golden 治理与 verify
   注册面、scenario 键 CHG 面、copy-guard、步数账）→ **用户书面批准（核心裁定点一/二与 Q1…Q11
   定案权在此）** → 批准 CHG 登记 + 条件落正文 + 更名 APPROVED（MG/FC 体例）；
3. **FLCAP-G2b-03/04（实现，v1.4.0 随批准轮用户逐版本指令派发）**：03 = oracle 编写 + fl001_v3
   emit + verify_golden 注册行 + DEFAULT_MODELS 处置 + gate 键面复算冻结 + FAULT_CATALOG 注记；
   04 = engine capacity 分支 + systems.js（defaults 键 + 新信号 onTrackOnly + capacity 子对象 +
   变体文案）+ scenario EVENT_KEYS/守卫（显式 CHG）+ validate 组合守卫 + checks 零改动核对 +
   两门禁面 + UI + tests 变体并入现有步 + off/thermal-only 轨逐位验收（run_hash 快照）+
   copy-guard 终检 + 步数账 CHG 申报；
4. **P3 GT 顺延登记**：P3 GT 草案（gt001_v4）本波名额已占（V130 §0 不做清单）——顺延 v1.4.0
   候选；A5 §5「P3 草案可与 P1/P2 并行起草、实现严格串行」——P2 未落地前 P3 不启动实现
   （跨轨排期约束、非工期承诺——G0-DEC-15 句式）。

## 6. 红线自查

### 6.1 I-1…I-5 逐条

| # | 红线 | 自查结论 |
|---|---|---|
| I-1 | 零第三方依赖 | RK4/指数子步 stdlib 自写；oracle stdlib（python -I）；无 PyBaMM/TESPy 类对照轨（本轨无对照轨需求——FLTH §5「无对照轨」声明形态：单状态集总 + 域扫描内嵌证据） |
| I-2 | 数据诚实性 | 无新增 ODE 状态诚实区分（§1.2——η_cap/E_cap 代数面、β·θ² 代数项）；参数全表「教学整定值非实测」+ 数值零编造（批准轮定案）；SOC_err 双因化显式登记不混同 r 面（§1.4）；老化轴不做声明（§0/§1.6——「容量慢漂移/教学示意」限定语）；L1-lite 诚实注 |
| I-3 | 证据链 | 独立 oracle 新文件（不 import src/** / 既有 oracle）+ golden 只读生成 + off/thermal-only 轨逐位硬条件三层佐证（§3.1）+ 注册域全量复扫 emit 硬条件（§3.3）+ 稳定性/判别式/η_cap 三断言（FCAP-8） |
| I-4 | 批准纪律 | 本草案无裁定效力——两裁定点与 Q 点批准留待用户（v1.4.0）；验收路径禁入直至批准 + emit verify 通过（§4 项 10 两门禁面）；实现须用户逐版本指令派发 |
| I-5 | 措辞红线 | 「模型深度导致的表达力差异」固定句式（ALINE §6.4）；「不是能量损失」ALLOW 句式照用（r/P_loss 叙事不变域）；定位句带「非机组/电网动态验证」；折算/二阶效应叙事全部带「教学示意/教学折算面」限定语（§6.4 预检表） |

### 6.2 **核心裁定点一：「SOC 定义不动」裁定重开——显式裁定请求（候选/影响面/撤回条件；批准留待用户）**

**裁定链逐字引用（实读，文档内行号为该文档自身行号）**：

1. V072_WAVE_DESIGN §1 DEC-2（:44-45）：「`R_int(T) = R0·(1+α·(T−25))`；**SOC 定义不动（I-2：
   能量口径零涟漪）**；**thermal 轨为 cfg 显式开关（thermal_model: off|on，默认 off）**……」；
2. FL001_THERMAL_G2B_SPEC_APPROVED §2.2.0（:201，Q1 方案 (a) 五理由之二）：「② DEC-2 约束
   『SOC 定义不动（I-2 能量口径零涟漪）』字面满足（P_bat,true 口径不变）」；
3. 同上 EQ-FLTH-7（:220）：「SOC_true = SOC0 − ∫P_bat,true dt/(40 kWh)×100%；……**SOC 定义
   不动**（DEC-2 约束；P_bat,true 口径 = 0.4·I_true 不变 ⇒ SOC/∫I 面与 L0 逐位同，§3.2）」；
4. 同上 A-flth-loss（:426）：「……SOC 定义不动（P_bat,true = 0.4·I_true 口径不变）。」；
5. 同上 A-flth-no-feedback（:427）：「热面对电气面零反馈：I_true/P_bat/SOC/测量链与
   thermal_model=off 轨逐位同（**温度对容量折算**、内阻对电流的反馈不做）；……」。

**显式裁定请求**：请求在 capacity on 轨域内修订 EQ-FLTH-7 的 SOC_true 分母（E_nom →
E_cap(T_bat)）——即 V072 DEC-2「SOC 定义不动」约束与 FLTH Q1/A-flth-loss/A-flth-no-feedback
在**新轨域内**不再字面成立（既有轨域文本零触碰）。

**为何不能静默**：A5 §2.2 结论 2 原文「突破不得以实现细节名义静默发生（I-2/I-3）」；V1_FACES
§3.2「golden 语义级变更 = breaking」——SOC 定义式结构变更若以实现细节名义静默发生，即无 CHG
的 breaking；face① additive 通道对定义式结构变更不可用（additive 边界三条不允许定义面改写）。
故必须走新 G2b + 显式 CHG + 用户批准（本节即该显式化）。

**诚实登记（与 FLTH Q1 性质不同——无第二缺口项）**：η_cap 只改 SOC 折算分母（记账面），
P_bat,true = 0.4·I_true 口径不动 ⇒ 守恒面（EQ-FLTH-5/8/9 检查式）与 r 面（EQ-FLTH-6）**零涟漪
维持**——FLTH Q1 方案 (b) 的「无源能量缺口/补偿去向」问题在本轨**不存在**（无第二缺口项）；
本请求是记账面定义修订请求，不是能量口径重设计请求。

| 候选 | 内容与影响面 | 后果 |
|---|---|---|
| **A 重开（推荐）** | capacity on 域内 EQ-FLTH-7 分母改 E_cap(T_bat)：影响面 = SOC_true 数值面 + SOC_err 双因化 + questions/指标解释卡文案面（G2b 文案面）；守恒面/r 面/功率链/fl001_v1/v2 字节冻结零涟漪维持 | 教学链「温度→可用容量→SOC」可见（A5 §2.2 结论 4）；FLTH §6.1 项 4（:409「温度对容量折算登记不做」）与项 6（:411「温度对容量/OCV/老化耦合——本波登记不做」）两处登记不做的顺延兑现；新轨自始携带修订口径（G2b 批准即裁定依据） |
| **B 不重开（维护现状）** | η_cap 面撤回、本轨降级为仅 R_int 二次项（β·θ² 不触 SOC 定义——EQ-FLTH-7 分母不动），或 P2 草案整体退回 | FLTH §6.1 项 4/6 登记不做维持；温度→容量教学链不可见（A5 §2.2 结论 4 教学增量落空）；本波唯一 G2b 草案名额产出降级；**零代码后果**（草案轮零触碰——天然满足） |

**撤回条件**：双路评审任一路对该面给出否决级条件、或用户批准轮不批准 ⇒ 本请求自动落候选 B
（η_cap 面撤回或整体退回），规格按降级形态修订后收口；撤回零代码后果、零 golden 后果。

### 6.3 **核心裁定点二：键形态三选一——对照表（推荐 (a)；定案归批准轮）**

对照表全文见 §1.1（六维对照：fl001_v2 冻结涉面/哈希先例套用/组合拒绝成本/golden 路由面/未来
扩展轴/判定倾向）。**推荐 (a) 组合键 `capacity_model: "off"|"on"`**（前置 thermal_model=on）——
四理由见 §1.1；候选 (b) 枚举扩值登记为备选（golden 一一映射扩三值的关联面成本）；候选 (c)
原地升级 **breaking 排除**（fl001_v2 语义面变更 + golden 语义级变更 = breaking——V1_FACES §3.2）。
键名候选（capacity_model / aging_model / 第三名）独立为 Q1（§11——键形态与键名两裁定分离）。

### 6.4 copy-guard 预查（39 模式；实现期 `node tools/copy-guard.mjs` 终检；体例沿 FLTH §6.3 / FC §6.3）

| 提案串 | 高危子串核查 | 结论 |
|---|---|---|
| on_cap 层级标签「L1 · 单节点热-容量折算模型（数值仿真级）」 | 无禁词命中 | 0 命中预期 |
| A-flcap-params「教学整定值（非实测参数）」 | 「非实测」为 ALLOW 串（先剔 ALLOW 再匹配——copy-guard 次序纪律） | 0 命中预期 |
| A-flcap-cap「容量慢漂移与循环老化未建模」「教学示意折算面」 | 「老化」不在 39 禁词族（tools/copy-guard.mjs BANNED 数组实读——孤岛/保护/检测/量测/验证类族不含「老化」）；叙事固定「慢漂移/教学示意」限定语（本轨非老化模型的否定式声明） | 0 命中预期 |
| P_loss/r 面叙事「是测量偏差，不是能量损失」照用（EQ-FLTH-6 不动域） | 「不是能量损失」为 ALLOW 串（G0-DEC-13 口径） | 0 命中预期 |
| 定位句「教学尺度容量-内阻二阶效应示意（L1 扩展），非机组/电网动态验证」 | 「非机组/电网动态验证」为 ALLOW 串 | 0 命中预期 |
| SOC_err 解释卡双因化文案「测量链偏差 + 容量折算（教学折算面）双因」 | 无禁词子串；不使用守恒类肯定性验证表述组合（I-5 ③ 句式纪律） | 0 命中预期 |
| A-flcap-l1「不是经过验证的设备控制器或电池容量模型」 | 「经过验证」不含禁词子串（FLEXT §1.2 F5 先例句式——实现轮 copy-guard 终检承载判定） | 0 命中预期 |

（本稿在 FaultLab-evaluation/** 不扫描；本波基线实跑 copy-guard PASS；实现轮文案迁入 src/**
前逐句预检 + copy-guard 终检双保险。）

## 7. G2b 进入条件五项自查表（SCOPE_SPLIT_MEMO §8.2）

| # | 进入条件 | 状态 |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：FL 无遗留缺陷清单（SCOPE §2 处置表无 FL 未关闭项；FLTH-G2b-01…04 全闭合）；本轨触发项 = A5 §2 提案 + V130 §1 DEC-1（本草案即交付物） |
| ② | 独立 golden | **计划就绪（未产出）**：§4 fl001_v3 / fl001_cap_oracle（Q4）/ 4 Run（Q7）/ schema v2 / T-B 预期（Q8）。**golden 后置系 V130 §0「只到草案+双路评审、批准与实现 v1.4.0」授权的字面偏离显式登记**（GTL1 §7.1 ② / FLTH §7.1 ② / MG001 §7 ② / FC §7 ② 同款句式）；emit = FLCAP-G2b-03，落地并 verify 通过后本项闭合 |
| ③ | UI 措辞与未建模物理清单 | **就绪（草案级）**：§1.6 assumptions 5 条 + limitations 追加 4 项 + §6.4 预检表（批准轮冻结文本；实现轮迁入 src/** + 终检） |
| ④ | 用户书面批准 | **未闭合（本草案轮预期状态）**：批准留待用户（v1.4.0 轮）——两裁定点（§6.2/§6.3）与 Q1…Q11 定案权在用户；本草案无裁定效力 |
| ⑤ | CHG 登记 | 起草授权 CHG-20261113-04（V130_WAVE_DESIGN，2026-11-13）已登记；批准 CHG 未登记（v1.4.0 轮随批准登记） |

## 8. 工作面分解（FLCAP-G2b-01…04）

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| FLCAP-G2b-01 | 键面三候选对照/EQ-FLTH-10…12 草案级/参数面框架/涟漪登记/锚点结构预填/golden 计划/两裁定点显式化 + 草案 v0.1 | M | **已完成**（V130 波 W1，2026-11-13，CHG-20261113-04） |
| FLCAP-G2b-02 | 双路独立评审（互不可见——V130 §2 串行纪律）+ 用户书面批准（两裁定点 + Q1…Q11 定案 + η_cap/β 数值定案 + 域扫描证据）+ 条件落正文 + 更名 APPROVED（MG/FC 体例） | M | v1.4.0 |
| FLCAP-G2b-03 | oracle 编写（fl001_cap_oracle.py——Q4 命名；oracle_base 出生接入 + RK4/Riccati 交叉形态 + FCAP 自检 + T-B 容差复算冻结/降 T-C 预案 + **注册域全量复扫 emit 硬条件（§3.3）**）+ fl001_v3 emit（Run 集 Q7、schema v2、approval 首签引批准 CHG、sidecar LF 钉死）+ verify_golden `MODELS["fl001_cap"]` 注册行 + DEFAULT_MODELS 处置（Q6）+ gate 键面复算冻结（B-4 形态缺口面——§4 项 7）+ FAULT_CATALOG §1 注记行 | M | v1.4.0（依赖 02 批准） |
| FLCAP-G2b-04 | 实现：engine capacity 分支（simulateFL001Thermal 内扩展或同构 early-return——§1.1 键形态定案后落位）+ systems.js（defaults.capacity_model='off' + normalizeConfig/defaultConfig 双落点盖章行——FC B-7 定案同构 + 新信号 onTrackOnly + model.capacity 子对象 + level/summary 变体）+ scenario EVENT_KEYS/declaresCapacity 守卫（显式 CHG；B-1a 显式键条件式哈希形态）+ validate 组合守卫（capacity_model=on 须 thermal_model=on——结构化错误拒绝）+ 两门禁面（三元分派表，§4 项 10）+ acceptance.keyValues 分域 + UI（inspector/跨深度对比卡三列/SOC_err 解释卡双因化）+ tests engine/plants capacity 变体（并入现有步）+ off/thermal-only 轨逐位验收（run_hash 快照——§3.1 项 3）+ copy-guard 终检 + 步数账 CHG 申报（0 新步预期——I-7） | L | v1.4.0（依赖 03） |

## 9. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | 「SOC 重开」被误读为既成裁定（草案被当作修订授权预先执行） | §6.2 三重声明（显式裁定请求/批准留待用户/本草案无裁定效力）+ §0 不做清单 ③ + A5 §8 R-4 同款；评审路 B 专项核对 |
| R-2 | β/η_cap 整定失当（教学不可辨识/稳态判别式域破坏/η_cap 域越界） | §1.5 整定依据四条框架 + 批准轮域扫描全量复扫（§3.3 emit 硬条件）+ FCAP-8 三断言（稳定性/判别式/η_cap 域）兜底 |
| R-3 | 键形态/键名裁定摇摆导致实现面返工 | §1.1 六维对照 + §6.3 对照表 + Q1/Q 键名分离；批准轮一次定案，实现轮不再重开（FC §11 定案纪律同款） |
| R-4 | fl001_v1/v2 或 fl001_l1_oracle.py 字节被实现轮误触（V-03 哈希失配） | §0 不动清单 ①② + FLCAP-G2b-03/04 工作面不含既有文件 + §3.1 项 3 三机制承载（B-1a/子对象/onTrackOnly）+ off/thermal-only 轨 run_hash 逐位验收 + 全量回归兜底 |
| R-5 | T-B 双实现散差超预案（β 项使温度反馈非线性增强——Riccati 面散差可能大于 FLTH 线性面） | 容差按双实现复算散差 ×≥10 且下限 ≥1e-9 冻结制（FLTH A-2 同款）+ 超限降 T-C + convergence 块（双向预案）+ 禁 ULP 级承诺 |
| R-6 | verify_golden gate 键面缺口（E_cap_kWh 命中 `_kW` 支量纲错配/η_cap 无量纲无分支） | §4 项 7 B-4 形态显式硬项预登记（FCECH-G2b-03 `_V` 分支新增先例同构）+ FLCAP-G2b-03 复算冻结面 + 不静默 |
| R-7 | SOC_err 双因化被误读为「测量链升级/残差失效/守恒破缺」 | §1.4 三行分离声明（SOC_est 逐位同/r 面不动/双因=模型已知结构面）+ A-flcap-soc 显式声明 + Q3 教学锚点纯净维持（r 面与 SOC_err 面分离）+ checks 能量分支零改动预期 |
| R-8 | 步数账超支（I-7） | 0 新步预期（变体并入现有步 + DEFAULT_MODELS 追加形态）+ FLCAP-G2b-04 归口 CHG 显式申报 |
| R-9 | scenario 键/盲包指纹语义漂移（既有场景哈希变化、Arena 钉轨歧义） | B-1a 显式键条件式 ⇒ 既有场景 scenarioHash 零变化 + 默认 off ⇒ 盲包语义零变化 + 新信号不入池显式声明 + EVENT_KEYS additive 显式 CHG + Arena 锁定面登记不预设 |
| R-10 | 教学参数（β/η_cap 缩放）被误读为设备参数辨识 | A-flcap-params 非实测声明 + §1.5 整定依据 + I-5 自查——FLTH R-11 同款 |

## 10. 评审记录与条件登记（**W2a/W2b 回填（2026-11-13，V130 波）——状态仍 DRAFT v0.1**；
     体例沿 FC §10 / MG §10；**批准留待用户（v1.4.0 轮 FLCAP-G2b-02）**——本节条件
     **原样登记、不处置**，处置归批准轮）

### 10.1 评审记录（双路独立评审、互不可见——V130 §2 串行纪律；评审报告全文随波次记录
     归档（2026-11-13 W2a/W2b），本节按归档结论摘要转写）

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | EQ-FLTH-10…12 自洽与量纲、Riccati 子步形态与解析交叉面、η_cap 形态域与 SOC 折算离散口径、稳定性二次代数重推复核、锚点复算、L1 判据对照 | **PASS_WITH_CONDITIONS(9)**（A-1…A-9） | 零 P1——θ_ss 二次方程系数/失稳边界量纲（√β 单位 1/K 自洽）/判别式/小根稳定性**独立重推全部通过**；条件 = 5×P2（η_cap 正性机制 / healthy SOC_err 结构定案 / 数值稳定小根形态 / gate `_kWh` 缺口实测 / β·k_cap 符号域）+ 4×P3（⟺ 措辞 / /3600 位置 / A5 翻转确认 / Riccati 有限时间发散 limitations） |
| 评审人 B（治理/口径/回归面） | 五项进入条件、两裁定点对照表复核（§6.2/§6.3）、哈希先例套用核对（B-1a/子对象/onTrackOnly/B-3a）、golden 治理与 verify 注册面、scenario 键 CHG 面、copy-guard、步数账、不动清单 | **PASS_WITH_CONDITIONS(6)**（B-1…B-6） | 1×P1——E_cap_kWh gate 路由机制描述勘正（**实测落 f_Hz_atol 兜底、实害 KeyError；硬项本身维持**）；2×P2（A5 枚举扩值推荐翻转偏离链显式登记 / §1.2 补 sourceKind·exposure 列）；3×P3（全文以归档报告为准） |
| 用户批准 | 两裁定点 + Q1…Q11 定案 + η_cap/β 数值定案 + 批准与实现排期（v1.4.0） | **待批准（留待用户，v1.4.0 轮 FLCAP-G2b-02）** | 批准 CHG 号 + §10.2 登记条件逐项处置（FC §10.2/MG §10.2/PV001 §11 体例）——本波不裁定（V130 CHG-20261113-04 ②） |

### 10.2 条件登记追记（A-1…A-9 / B-1…B-6 逐项——条件 → 级别 → 一句内容 → 建议落点；
     **原样登记、不处置——处置归 v1.4.0 批准轮**。编号顺序按本回填摘要所列（P1/P2 前置），
     如与归档报告编号有出入以归档报告为准；评审报告全文随波次记录归档（2026-11-13
     W2a/W2b））

| 条件 | 级别 | 一句内容（按评审报告归档摘要忠实转写） | 建议落点（批准轮确认） |
|---|---|---|---|
| A-1 | P2 | η_cap 正性机制：η_cap ∈ (0,1] 的构造保证机制需批准轮定案（折损形态参数域与 η_cap 恒正的承载式） | §1.5 η_cap 参数行 / §1.6 A-flcap-cap / §11 Q2 |
| A-2 | P2 | healthy SOC_err 结构定案：healthy 局 SOC_err 双因结构（容量折算项在 healthy 局的取值/符号面）需定案 | §1.4 SOC_err 行 / §3.2 健康表 |
| A-3 | P2 | 数值稳定小根形态：θ_ss 二次方程数值求解（非闭式路径）的稳定小根选取形态需冻结（Q3 (b) 兜底面） | §1.3 EQ-FLTH-12 / §11 Q3 |
| A-4 | P2 | gate `_kWh` 缺口实测：E_cap_kWh 序列键落 `_kW` 后缀支的量纲错配缺口按 FC B-4 同款实测登记 | §4 项 7 / §9 R-6 |
| A-5 | P2 | β·k_cap 符号域：β 与 η_cap 折损率 k_cap 的符号域/耦合域约束（注册域单调与稳定性联合域扫描）需定案 | §1.5 β/k_cap 行 / §3.3 域扫描面 |
| A-6 | P3 | ⟺ 措辞：EQ-FLTH-12 失稳边界行「⟺」等价措辞需改为严格单向推导表述（与推导注对齐） | §1.3 EQ-FLTH-12 |
| A-7 | P3 | /3600 位置：EQ-FLTH-11 的 kWh 换算 /3600 因子归属位置需在积分式/分母间明确 | §1.3 EQ-FLTH-11 |
| A-8 | P3 | A5 翻转确认：对 A5 评估稿枚举扩值候选判定的翻转（本草案推荐组合键 (a)）需显式确认登记 | §6.3 / §1.1 |
| A-9 | P3 | Riccati 有限时间发散 limitations：β·θ² Riccati 面在判别式 < 0 域的有限时间发散行为需入 limitations 声明 | §1.6 limitations ③ / §3.3 稳态存在域 |
| B-1 | **P1** | E_cap_kWh gate 路由机制描述勘正：§4 项 7 对 gate 路由机制的描述与 verify_golden 实测不符——E_cap_kWh 实际落 f_Hz_atol 兜底支、实害 KeyError 类错误；**硬项本身（FLCAP-G2b-03 显式处置为显式硬项）维持** | §4 项 7（描述勘正）/ §9 R-6 |
| B-2 | P2 | A5 枚举扩值推荐翻转偏离链显式登记：推荐自 A5 评估稿候选倾向翻转的偏离链需显式登记（批准轮追溯面） | §6.3 / §11 Q1 |
| B-3 | P2 | §1.2 补 sourceKind·exposure 列：状态向量表建议补 sourceKind/exposure 列（与 exposure 三值映射核对表体例对齐——新信号 E_cap_kWh 盲包面预登记） | §1.2 状态向量表 |
| B-4…B-6 | P3 | 3 条 P3 条件：内容全文随评审报告归档（2026-11-13 W2b）——本回填未随派发携带逐条摘要，批准轮回填时以归档报告为准补全本表 | 批准轮确认 |

## 11. Q 点清单（**全部候选+推荐不定案**——定案权归双路评审与用户批准轮 v1.4.0；体例沿 FC §11/MG §11 草案轮形态）

| # | 问题 | 候选 | 推荐 + 一句话理由 |
|---|---|---|---|
| Q1 | 新键命名（键形态=裁定点二已推荐组合键；键名独立裁定） | (a) `capacity_model`；(b) `aging_model`（ALINE §7「热-电-老化三元（老化 = R₀/SOC 容量慢漂移）」轴名）；(c) `ecap_model`/`second_order_model` 类泛化名 | **推荐 (a) capacity_model**——A5 §2 提案标题「T_bat → 容量/内阻二阶效应」主面命名、与电化学 electrochem_model 命名句式同构；**aging_model 不推荐（I-2 诚实性）**：本轨两件均为温度代数面（折算+二次项）、非时间慢漂移/循环退化——aging 轴属 ALINE §7 留位另立轨，误名即数据不诚实 |
| Q2 | η_cap 折损函数形态 | (a) 阈值线性 η_cap = min(1, 1 − k_cap·max(0, T − T_cap0))（两参数）；(b) 全域线性 1 − k_cap·θ（单参数）；(c) 二次/非线性形态 | **推荐 (a) 阈值线性**——与 A5 §2.1「高温段线性折损」原文最贴 + 参数可解释（折损起始温度/折损率）+ 阈值下方 η_cap ≡ 1 与 thermal 轨兼容性好；全域线性 (b) 教学面更直接但低温域即折算（物理面失真风险） |
| Q3 | θ_ss 渐近稳态：闭式 vs 数值求解 | (a) 闭式保留（二次方程求根 + 判别式域声明——§1.3 EQ-FLTH-12 推导）；(b) 数值求解（求根器） | **推荐 (a) 闭式保留**——FLTH EQ-FLTH-9 闭式先例 + oracle 自检交叉面（FL-2 θ_ss 抽查同构）+ 教学可见（失稳边界 h = I²R0(α+2√β) 闭式可直接进 limitations/域声明）；数值求解仅在闭式数值病态时兜底 |
| Q4 | oracle 文件命名 | (a) `fl001_cap_oracle.py`（物理面命名）；(b) `fl001_l1b_oracle.py`（深度序命名）；(c) `fl001_thermal_cap_oracle.py`（复合命名） | **推荐 (a) fl001_cap_oracle.py**——物理面直接命名（容量面为本轨唯一新增物理面）、MODELS 键镜像 `fl001_cap`；FC Q2 定案 fc001_l1_oracle.py 的深度命名在本轨易与 fl001_l1 混淆（同系统第二深化轨） |
| Q5 | oracle 自检段名 | (a) 新段 FCAP-1…n；(b) FL-9… 续编 | **推荐 (a) FCAP-1…n**——新文件新段先例（FL-1…8 / FEC-1…8）；FL-x 为 fl001_l1_oracle.py 专属证据链，续编混淆两文件 V-03 追溯面（FC Q8 同款理由） |
| Q6 | verify_golden DEFAULT_MODELS 是否追加 | (a) 追加 "fl001_cap"（步① 无参调用四 golden）；(b) 不追加、显式 per-model 调用 | **推荐 (a) 追加**——verify_golden.py:206 现值 ["fl001","fl001_l1","fc001_l1"]，FC B-5 定案先例形态直接套用；步① label 滞后说明沿 V120 DEC-5 维持登记不修 |
| Q7 | golden Run 集 | (a) 镜像 fl001_v2 全集 4 Run 全 on；(b) 最小集 2 Run（healthy + sensor_drift） | **推荐 (a) 镜像 4 Run**——新 id golden 镜像基线全集先例（FLTH v2 镜像 4 Run / FC Q6 镜像 5 Run）+ monitor 不变量判据面（FCAP-6）+ actuator 角点覆盖 |
| Q8 | 容差 tier | T-B（RK4 双实现方法等价）；T-A（不承诺——Riccati 面跨语言 bit-exact 无依据）；超限降 T-C + convergence | **推荐 T-B**——T_bat 温度反馈 + β 非线性 ODE 无全局闭式（FLTH/FC 同制）；gate 键面终值 emit 复算冻结（×≥10 冻结制） |
| Q9 | 方程 id 编号策略 | (a) 新编号 EQ-FLTH-10…12（子对象 equations 承载、既有 EQ-FLTH-1…9 文本零触碰）；(b) 沿用 EQ-FLTH-2/7/9 编号 + 轨域标注 | **推荐 (a) 新编号**——FC EQ-FCEC 新 id 集先例（新轨域新 id、避免同 id 双文本歧义）+ model_hash 五数组逐字节不动的承载面（子对象 equations 引新 id）；对应关系（EQ-FLTH-10 ≡ EQ-FLTH-2 修订等）在说明列显式登记 |
| Q10 | 新信号集与 gate 键面 | (a) 仅 E_cap_kWh 出信号（η_cap 由 E_cap 承载）；(b) E_cap_kWh + η_cap 双信号（无量纲单位面新增）；(c) 零新信号（SOC 数值面承载全部教学面） | **推荐 (a) 仅 E_cap_kWh**——最小集（FLTH §1.2 R_int 不出信号先例同构）+ onTrackOnly 门控 + gate 键面缺口面最小（E_cap_kWh 命中 `_kW` 支的量纲错配随 FLCAP-G2b-03 显式硬项处置——B-4 形态）；(b) 需无量纲单位/gate 分支双新增、涟漪 +1 级 |
| Q11 | 组合拒绝规则落点 | (a) 双面（engine validate 枚举守卫 + scenario 守卫双落点——FC B-7 盖章双落点同构）；(b) 仅 engine validate；(c) 仅 scenario 守卫 | **推荐 (a) 双面**——非法组合在场景解析与引擎配置两侧均结构化拒绝（MG-IMP-Q1 validate reject 纪律先例 + FC B-7 双落点先例）；单面落点留静默组合风险 |

---

**文件结束（草案正文）**。修订记录：

- **v0.1（2026-11-13 初稿，A-5 P2 FL 规格起草人，V130_WAVE_DESIGN §2 W1 / CHG-20261113-04 授权链）**：
  排期条件确认（P1 FC v1.2.0 落地 + FLTH 链闭合）；§0 边界与不动清单（fl001_v1/v2 字节冻结零涉、
  V072 DEC-2 不动、老化轴不做）；§1.1 键面三候选对照（裁定点二——推荐组合键）+ §1.2 状态向量
  诚实区分（无新增 ODE 状态/Riccati 子步形态）+ §1.3 EQ-FLTH-10…12 草案级（守恒面不动域声明 +
  稳定性二次代数闭式推导注）+ §1.4 SOC_est/SOC_err 双因化 + §1.5 参数面（数值零编造 + 整定依据
  四条框架）+ §1.6 assumptions 5 条/limitations 4 项/UI 变体；§2 影响面（B-1a/子对象/onTrackOnly/
  B-3a 四先例套用 + 盲包零变化）；§3.1 零变化硬条件三层佐证（capacity_model=off 全链逐位同关键
  句式）+ §3.2 on_cap 锚点结构（方向声明、数值留批准轮）+ §3.3 稳定性边界移动与域扫描 emit 硬
  条件；§4 golden 计划十项（fl001_v3/FCAP 自检/三元路由两门禁面）；§5 排期（v1.4.0 两波节奏 +
  P3 顺延）；§6 红线自查（I-1…I-5 + **裁定点一 SOC 重开对照表**（候选 A/B + 影响面 + 撤回条件 +
  为何不能静默 + 无第二缺口项诚实登记）+ 裁定点二对照表 + copy-guard 预查）；§7 五项进入条件
  （golden 后置显式登记）；§8 FLCAP-G2b-01…04；§9 风险 R-1…R-10；§10 评审记录留空结构；
  §11 Q1…Q11（键名/η_cap 形态/θ_ss 闭式/oracle 命名/自检段名/DEFAULT_MODELS/Run 集/tier/方程
  编号/信号集/组合守卫——全带候选+推荐不定案）。

**状态**：`DRAFT v0.1（2026-11-13）`。本草案无裁定效力——两核心裁定点（「SOC 定义不动」重开 =
核心裁定点请求、键形态三选一）与 Q1…Q11 均为候选+推荐形态，批准留待用户书面批准（v1.4.0 轮，
FLCAP-G2b-02）；双路独立评审（V130 §2 W2a/W2b）结论随报告留档、收口回填 §10（FC/MG 体例）；
本草案轮零代码/golden/oracle 触碰（§0 不动清单）；锚点数值以 fl001_cap_oracle emit 终值冻结为准
（批准轮域扫描定案）。

**文件结束**。FL001_CAPACITY_G2B_SPEC_DRAFT v0.1（2026-11-13，CHG-20261113-04 授权起草）。
