# FL001_CAPACITY_G2B_SPEC_APPROVED — FL-001 电池容量/内阻二阶效应（η_cap 温度-容量折算 + R_int 二次项）G2b 物理规格（APPROVED v1.0；曾用名 FL001_CAPACITY_G2B_SPEC_DRAFT）

> **状态**：`APPROVED v1.0（2026-11-14，FLCAP-G2b-02 收口）——批准记录：CHG-20261114-01（用户 2026-11-14「下一步」指令链——两裁定点裁定+条件全按推荐处置，GTL1-G2b-02 先例）`。
> **任务**：A-5 P2 FL 容量/内阻二阶效应 G2b 批准轮收口（V140_WAVE_DESIGN §2 阶段一 W1；承
> A5_MULTIPHYSICS_EXPLORATION §2 提案一、V130_WAVE_DESIGN §0 做面 1 / §2 阶段一 W1 草案轮）。
> **授权链**：起草授权 V130_WAVE_DESIGN v1（CHG-20261113-04，2026-11-13，DEC-1…7 全采推荐项，
> 本波唯一 G2b 草案名额）→ 双路独立评审（V130 W2a/W2b，2026-11-13，A:PASS_WITH_CONDITIONS(9)
> / B:PASS_WITH_CONDITIONS(6)，§10）→ **用户书面批准（2026-11-14「下一步」指令链，CHG-20261114-01
> 登记，V140_WAVE_DESIGN DEC-1…7 全采推荐项——GTL1-G2b-02 先例：用户指令链即书面批准记录）**
> → 本 v1.0（15 条件落正文 + 两裁定点裁定 + 四常量定案 + Q1…Q11 定案 + 更名 APPROVED）。
> **排期条件确认**：P1 FC 已于 v1.2.0 落地（FCECH-G2b-03/04，CHG-20261113-02，fc001_v2 在验）
> ⇒ 「P1 落地一个发布周期后」条件满足；FLTH-G2b-03/04 早已闭合（fl001_v2 于 v0.8.0 emit 在验）
> ⇒ A5 §2.4 ① 观察窗条件满足。
> **主源**：A5_MULTIPHYSICS_EXPLORATION §2 全文（P2 提案原文——本规格的形态与治理成本评估源，
> 含 §2.2 SOC 裁定突破专项评估）；体例模板 = FL001_THERMAL_G2B_SPEC_APPROVED v1.0（EQ-FLTH-1…9
> 现行文本 + §3.4 稳定性/48.2843 边界 + fl001_v2 golden 计划 + FL-1…8 自检 + A-flth-* assumptions）
> 与 FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0（**冻结后哈希先例全套**：B-1a 显式键/sub-object/
> onTrackOnly/B-3a/两门禁面——V120 落地证实机制直接套用）；§10/§11 体例补充 = MG001_G2B_SPEC_APPROVED
> v1.0；治理依据 = SCOPE_SPLIT_MEMO §8.2。
> **裁定效力声明（v1.0）**：两个核心裁定点（一：「SOC 定义不动」裁定重开——V072 DEC-2 链；
> 二：键形态三选一）已于批准轮裁定（§6.2/§6.3：重开采纳（仅 capacity_model=on 域）/ 组合键
> capacity_model），Q1…Q11 已定案（§11）；本批准不自动打开实现验收路径（§4 项 10 两门禁面
> 维持），实现须 FLCAP-G2b-03/04 按批准文本执行、零代码/golden/oracle 触碰（§0 不动清单）。
> **本波纪律符合性（V140 §0 延续）**：golden 零变更（既有 10 golden 字节冻结——本稿只引用不
> emit）；零新仿真轨（engine.js/systems.js/scenario.js/scope.js/tools/oracle/**/data/golden/**
> 全链只读引用、零触碰）；零第三方依赖（I-1）；文案红线自查（本稿在 FaultLab-evaluation/**，
> 不在 copy-guard 扫描域 tools/copy-guard.mjs:15 `SCOPES=['src']` 内；本波实跑
> `node tools/copy-guard.mjs` → PASS（39 模式 0 命中）基线绿，§6.4 预检同轮登记）。
> **数值定案纪律**：β/k_cap/T_cap0/η_floor 四常量与 §3.3 域扫描证据由临时复算脚本独立计算
> （Python stdlib，`python -I`，TEMP 目录、不落仓库、用后已删——环境校验 = fl001_v2 冻结
> golden healthy 全序列位级复刻（T_bat/SOC_true/P_loss worst diff = 0.0），记录见 §3.3）。
> **行号基准说明**：本文档行号引用为**起草时点（2026-11-13，v1.2.0 收口后干净树）实读值**——
> 本波 W2…W5 并发落地后 src/** 与 scripts/** 行号会漂移；实现轮（FLCAP-G2b-03…04）
> 以**语义锚点**（信号 id/检查 id/函数名/键名/方程 id）为准定位，行号仅作快速索引
> （FLTH/FC 两轮头部同款说明沿用）。关键复核点实读（起草时点）：verify_golden.py:206
> `DEFAULT_MODELS = ["fl001","fl001_l1","fc001_l1"]`、:228-268 T-B 分派分支（`_kW` 后缀支 +
> f_Hz_atol 兜底 + FC `_V` 分支）；scenario.js:48 EVENT_KEYS、:56 THERMAL_MODELS、:64
> ELECTROCHEM_MODELS、:404-440 电化学键 B-1(a) 显式键条件式解析、:485-511 hashProjection；
> engine.js:195-204 normalizeConfig 盖章块（thermal/electrochem 两行先例）、:319-330 validate
> 枚举守卫、:530-546 model_hash 具名九字段 hashObject、:672-676 simulateFL001 顶部 early-return、
> :779-924 simulateFL001Thermal（R0/α/C_bat/h/T_amb 常量 :786-791 实读）、:586 onTrackOnly
> 门控；systems.js:142-155 FL defaults/bounds（load_kW [10,45] :153 实读）、:273-296 faults
> （sensor bias [2,30] :278、actuator [20,85]% :290、load_step 已删 :284-285）、:640 FC
> `model.electrochem` additive 子对象、:566-568 FC 三信号 onTrackOnly、:690-699 level/summary
> 变体派生；checks.js:186-260 conservation-true/meas、:422-445 soc-bounds、:485-545
> energy-balance FL thermal on 分支；arena.js:105 `ARENA_EXCLUDED = ['PV-001','WT-001','MG-001']`
> （FL/FC 在池现状）。

---

## 0. 定位摘要、边界与不动清单

- **FL-001 capacity 轨（L1 扩展 · 容量/内阻二阶效应最小集）**：在 FL-001 既有双轨（off=L0 /
  thermal on=L1-thermal）**之外**新增第三轨——**批准定案键面** `capacity_model: "off"|"on"`（默认
  off，形态=核心裁定点二已定案，§1.1/§6.3；前置条件 thermal_model=on）。on 时为电池新增两件
  **代数面**：① η_cap(T_bat) 温度-容量折算进 SOC 积分（EQ-FLTH-11 的分母由 40 kWh 改为
  E_cap(T_bat) = η_cap(T_bat)·E_nom——**本版冻结**：η_cap(T) = max(η_floor, 1 − k_cap·max(0, T −
  T_cap0))，四常量定案 §1.5/§3.3）；② R_int 二次项（EQ-FLTH-10：R0·(1+α·θ+β·θ²)，θ =
  T_bat − 298.15；β = 5×10⁻⁷ 1/K² 定案、教学参数非实测）。P_loss（EQ-FLTH-3）与 T_bat 轨随之
  变化；**P_bat,true = 0.4·I_true 口径不动**——功率链零反馈，反馈仅经 SOC 折算面进入（A5 §2.1
  原文口径）。
- **做（本规格 = 批准权威文本面）**：键面三候选对照与定案（§1.1）、状态向量与
  新物理量诚实区分（§1.2）、EQ-FLTH-10…12 冻结文本与编号定案（§1.3）、SOC_est/SOC_err 面
  登记（§1.4）、参数面定案与整定依据（§1.5）、assumptions/limitations/UI 措辞冻结（§1.6）、
  场景/哈希/盲包涟漪登记（§2）、锚点与零变化硬条件（§3）、golden 计划（§4）、排期（§5）、
  红线自查与两裁定点定案（§6）、Q 点定案记录（§11）。
- **不做（本规格显式排除）**：
  1. **L2 不做**：CFD/FEA/多体动力学维持不做（V05_ROADMAP §6 :169 / V06_ROADMAP §6 :116 /
     ALINE §12 :300 三处原文引用维持——A5 §6 全量确认，本轨不重引不放松）；
  2. **本批准不定实现**：零代码/golden/oracle 触碰；方程/常量/更新序/锚点数值已由本 v1.0
     冻结（批准轮域扫描值——emit 由 FLCAP-G2b-03 复算冻结）；实现须 FLCAP-G2b-03/04 按批准
     文本执行（I-4：用户逐版本指令派发）；
  3. **域外不动 V072 DEC-2**：裁定一已裁定「重开采纳」但**仅 capacity_model=on 域内生效**——
     EQ-FLTH-7 原式在 off 与 thermal on 无 capacity 轨域**逐字不动**（V072 DEC-2/FLTH Q1/
     A-flth-loss/A-flth-no-feedback 既有轨域文本零触碰，§6.2）；
  4. **fl001_v1/v2 字节冻结零涉**：既有 off 轨（fl001_v1）与 thermal on 轨（fl001_v2）语义
     **字节级冻结维持**（A5 §1「emit 过的轨语义不得原地变更」；ORACLE_INTERFACE_D2 §3.1 :127
     「模型/方法变更 → 新 id」）——深化以新轨形态出生，fl001_v2 由新 golden fl001_v3 顺位承接，
     fl001_l1_oracle.py 物理零触碰；
  5. **老化轴不做**：ALINE §7「热-电-老化三元」中的老化轴（R₀/SOC 容量慢漂移——时间慢漂移/
     循环退化）不在本轨范围（本轨两件均为温度代数面、非时间慢漂移），另立轨留位（§1.6
     A-flcap-lump 声明；键名候选 aging_model 已随 §11 Q1 定案否决——I-2 诚实性）。
- **本轮不动清单（批准轮与起草轮均适用；实现轮按 §8 排期执行其点名工作面时不受相应条目约束）**：
  ① `tools/oracle/**` 全部零触碰（B-5 计数勘正：A5 §1「10 件」计数口径以目录通配取代——
  含 oracle_base/emit_golden/properties/ 与 fl001_l1_oracle.py 等全部既有文件，fl001_l1_oracle.py
  物理零触碰——V-03 字节语义）；
  ② `data/golden/` 既有 10 golden（含 fl001_v1/v2 + .sha256 sidecar）字节冻结留档；
  ③ engine.js/plants/fl001.js/scenario.js/systems.js/scope.js/scripts/verify_golden.py 零改动
  （均为实现轮显式工作面）；④ 不引入第三方依赖（I-1）；⑤ run-g2 35 步判据零翻转（0 新步
  预期——§4 项 9）。
- 时间尺度沿库口径：duration 60 s、输出网格 dt=0.1（601 点）、积分子步 0.01、默认注入
  t=20 s（FAULT_CATALOG §0——thermal 轨现状沿用，本轨零变更）。

## 1. 模型形态

### 1.1 配置键形态（**核心裁定点二——已定案（2026-11-14，CHG-20261114-01）：采 (a) 组合键**；三候选对照保留备查）

| 候选 | 形态 | fl001_v2 冻结涉面 | 哈希先例套用 | 组合拒绝成本 | golden 路由面 | 判定倾向 |
|---|---|---|---|---|---|---|
| **(a) 组合键 `capacity_model: "off"\|"on"`（**定案**）** | 新正交事件级键（沿 thermal_model/electrochem_model additive 键先例），默认 off；**前置条件：thermal_model=on 才可 on**——非法组合结构化错误拒绝（不静默钳位） | **零涉**——thermal 轨（off/on 两值语义、EQ-FLTH-1…9、fl001_l1_oracle、fl001_v2 golden）全链不动，容量面以独立键独立 golden（fl001_v3）出生 | FC B-1a 显式键条件式哈希形态（scenario.js:419-436 先例同构）+ capacity additive 子对象（systems.js:640 FC `model.electrochem` 先例同构）+ onTrackOnly 列门控（systems.js:566-568 先例同构）——**V120 落地证实机制全套直接套用** | validate 枚举守卫（engine.js:319-330 同构新行）+ scenario 守卫 + 事件级/盖章级组合校验一行——S 级，A5 §3.2 已预登记的成本面 | (thermal_model, capacity_model) → golden 三元分派表（§4 项 10）——显式、可枚举 | **定案（采推荐）**（理由见下） |
| (b) thermal_model 枚举扩值（'on_cap' 类第三值） | thermal_model 单键加值，capacity 语义钉在热轨枚举轴 | 值面 additive（off/on 旧值解析零变化）——但 golden 一一映射（off→v1、on→v2，FLTH §2.0）被扩为三值，fl001_l1_oracle 的 RUNS/golden 关联面与 verify 分派需按枚举值分流 | 枚举扩值**不涉新键**（B-2 订正：face③ 冻结边界 V1_FACES:184-186「新键只影响使用它的输入」对枚举扩值不构成张力——原表述撤销）；其真实成本在 golden 关联面（下两列）；缺省轨解析入哈希形态对既有场景哈希的波及为另一独立面（thermal_model 现行先例——八面冻结后不可复制） | 单键无组合规则——但「开关轴上塞第二开关」语义混合（off/on=开关语义 vs inertia 三值=互斥轨语义），GT linear/swing/thermo 先例不可平移 | 单值→golden 映射改为枚举分流——fl001_v2 关联面被触碰（管理成本 M） | 未采（GTL1 Q2「单键最小涟漪」理由在此被 golden 关联面成本抵消） |
| (c) thermal_model='on' 语义原地升级 | capacity 效应并入既有 on 值 | **breaking 排除**——fl001_v2 语义面变更（emit 过的轨语义不得原地变更 + golden 语义级变更 = breaking，V1_FACES §3.2） | — | — | — | **排除**（硬伤：fl001_v2 冻结锚点对新引擎失配——A5 §3.2 被排除形态同款登记） |

**定案 (a) 的理由（四条）**：① fl001_v2 字节冻结零涉——thermal 轨全链（方程/常量/oracle/golden/
verify 注册行）逐字节不动，容量面以独立键+独立 golden 出生（新轨自始携带修订口径，G2b 批准即其
裁定依据——A5 §2.2 结论 3）；② FC 冻结后先例全套直接套用（B-1a 显式键/sub-object/onTrackOnly/
B-3a scenarioView 零投影/两门禁面——V120 五机制落地证实，制度复用成本最低）；③ golden 路由面
显式（三元分派表可枚举、两门禁面沿 FC §4 项 10 形态）；④ 未来扩展轴干净（容量面/热面/老化轴
各自独立键，ALINE §7 三元方向互不挤压）。组合拒绝规则成本 S 级显式登记（A5 §3.2 形态 b 同款
预登记口径）。**键名定案 = `capacity_model`（§11 Q1——键形态与键名两裁定分离，Q1 同轮定案）。**

### 1.2 层级判定与状态向量（诚实区分——I-2）

**无新增 ODE 状态：T_bat 仍唯一热 ODE 状态（y = [T_bat]，1 维；RK4 dt0.01 分区更新序沿 FLTH
§2.3 冻结骨架）**。新物理量的 honest 区分（沿 GTL1 §1.2 / FLTH §1.2 体例；A5 §2.1 同款）：

| 量 | 类型 | 信号 id 提案 | 单位 | 定义 | sourceKind 提案 | exposure 提案 | 备注 |
|---|---|---|---|---|---|---|---|
| T_bat | ODE 状态（保留，唯一热状态） | T_bat_K（复用） | K | EQ-FLTH-4 原样（C_bat·dT/dt = P_loss − h·θ）；RHS 内 R_int 换用 EQ-FLTH-10 修订式 | MODEL_STATE（fl001_v2 既有） | public_demo（既有派生） | ODE 结构不变、RHS 表达式扩展 |
| **E_cap** | **代数（新）** | E_cap_kWh | kWh | E_cap(T_bat) = η_cap(T_bat)·E_nom | **DERIVED → public_demo（B-3 定案——algebraic 折算面与 P_loss_kW DERIVED 同构；不设 blindVisible、不显式声明 exposure——FC 三信号先例 systems.js:566-568 同构，兼容字段由 exposure 派生、禁止独立设置）** | public_demo | 可用容量折算面（SOC 积分分母）；E_nom = 40 kWh 冻结值不动；onTrackOnly 门控（Q10）；signalCategories 归属提案 = `soc` 类目（实现轮 FLCAP-G2b-04 工作面——纯增项，既有六类目零改动） |
| **η_cap** | 代数（新，不出信号候选——Q10 定案不设） | （由 E_cap 承载） | 无量纲 | 折损函数形态已冻结（Q2 定案 + A-1 机制）：η_cap(T) = max(η_floor, 1 − k_cap·max(0, T − T_cap0))，η_cap ∈ (0,1] | —（不出信号） | —（不出信号） | 阈值线性 + 正性下限定案（§1.5）；单独出信号会扩盲包/序列面，最小集不设 |
| R_int | 代数（修订式，不出信号） | （由 P_loss 承载） | Ω | EQ-FLTH-10：R0·(1 + α·θ + β·θ²) | —（不出信号） | —（不出信号） | β = 5×10⁻⁷ 1/K² 教学参数非实测（定案 §1.5）；R0/α 冻结值原样 |
| P_loss | 代数（保留信号，定义式随 R_int 变） | P_loss_kW（复用） | kW | EQ-FLTH-3 原式（I_true²·R_int） | DERIVED（fl001_v2 既有） | public_demo（既有派生） | on_cap 域数值随之变化；记账面 EQ-FLTH-5/8 不动 |
| SOC_true / SOC_est | 积分面（保留信号，分母分域） | 复用 | % | EQ-FLTH-11（§1.3） | MODEL_STATE / OBSERVATION（既有） | public_demo / public_demo + blindVisible（既有） | SOC_est 与 L0/fl001_v2 **逐位同**（测量链不动）；SOC_true 分母分域（§1.4）；healthy 局 SOC 面与 fl001_v2 逐位同（A-2 机制——位级实测 §3.2） |

**层级判定**：无新增 ODE 状态，但**SOC 定义式结构变更 = 新物理面**——层级判定走 ALINE §1.2
第三行（:53）「新增状态变量/新物理（方程集扩展）→ 完整 G2b」：EQ-FLTH-2/7 修改即方程集扩展，
与是否增状态无关（A5 §2.1 同款声明）。GTL1 §1.1 表「新物理状态变量」判据列在本提案由
「SOC 定义式结构变更 + R_int 非线性化（RHS 由 θ 线性变为 θ 二次——Riccati 型）」两个新物理面
满足；L1-lite 诚实注沿 FLTH §1.1 句式（单状态集总、非高维/刚性，按第三行走完整 G2b——本规格
即该流程）；对照表已于批准轮填写（§10）。**方程不可手解判据复核**：β·θ² 使 T-ODE 子步内在 I 冻结
口径下不再是线性常系数 ODE，而是常系数 Riccati 方程（θ′ = a·θ² + b·θ + c）——存在闭式解
（tanh/arctan 形态）但非 FLTH FL-7 的线性指数形态；子步解析交叉面形态已定案（§4 项 3——Riccati
闭式交叉，FCAP-7 实测冻结制）。

### 1.3 方程修订（**本版冻结（CHG-20261114-01）——oracle/引擎唯一权威文本**；编号定案见 Q9：EQ-FLTH-10…12 新 id 集，既有 EQ-FLTH-1…9 文本零触碰）

| id | 方程（**冻结文本**） | 对应既有方程与说明 |
|---|---|---|
| EQ-FLTH-10 | **R_int(T_bat) = R0·(1 + α·θ + β·θ²)**，θ = T_bat − 298.15（K 制；T_bat 单位 K）；**β = 5×10⁻⁷ 1/K²（批准轮定案，CHG-20261114-01）**；**符号域（A-5 定案）：β ≥ 0、α > 0**（√β 实值、抛物线开口向上、小根稳定性全部以 β ≥ 0 为前提——FCAP-8 断言面） | ≡ EQ-FLTH-2（FLTH :215）域内修订——β>0 时 R_int 随温升加速增大（正温度反馈增强）；β = 0 时精确退化为现行线性式（退化为 fl001_v2 轨的结构自洽面）；R0/α 冻结值原样（0.2 Ω / 0.01 1/K——engine.js:786-791 实读核对）；β 教学参数非实测（A-flcap-params） |
| EQ-FLTH-11 | **SOC_true(t) = SOC0 − 100·∫₀ᵗ [P_bat,true(t′)/3600] / E_cap(T_bat(t′)) dt′**（**/3600 位置（A-7 定案）：kW·s→kWh 换算因子作用于积分元内——换算 kWh 后再除 E_cap（kWh）分母**，oracle EQ-FLTH-7 现行实现形态同构：fl001_l1_oracle `SOC0 − 100·(V·intI)/(E_nom·3600)`）；**SOC_est = SOC0 − ∫P_bat,meas dt/(40 kWh)×100% 原式逐字不动**；**E_cap(T_bat) = η_cap(T_bat)·E_nom，η_cap(T) = max(η_floor, 1 − k_cap·max(0, T − T_cap0))**（A-1 定案机制，四常量 §1.5）。**离散口径（冻结）**：子步 E_cap 冻结于子步起点右值（分区结构同构——FLTH Q2 I 冻结先例）；实现形态 = **名义单除项（与 EQ-FLTH-7 原式同源同序：SOC0 − 100·(V·intI)/(E_nom·3600)，intI/intB 同源电气面 L0 序）+ 容量修正累积器（每子步 (V·∫I dt′/3600)·(1/E_cap(T_start) − 1/40)）**——恒等改写 1/E_cap = 1/40 + (1/E_cap − 1/40)（修正项与 E_cap ≤ 40 同向、无相消）；**T_bat < T_cap0 域内修正累积器恒精确 0.0（IEEE：max(0, T−T_cap0) ≡ 0 ⇒ η_cap ≡ 1.0 精确 ⇒ 1/E_cap − 1/40 ≡ 0.0）⇒ healthy 局 SOC_true/SOC_est/SOC_err 与 fl001_v2 逐位同（位级——扫描实测修正项 = 0.0、SOC_true(60) = 59.583333333333336 位级同，§3.2）**。P_bat 符号域：放电段下降加快、充电段上升加快（|ΔSOC| 放大——η_cap ≤ 1 构造推论，方向声明 §1.4） | ≡ EQ-FLTH-7（FLTH :220）**capacity_model=on 域内**修订——SOC_true 分母由 E_nom 改为时变 E_cap(T_bat)（裁定点一定案：仅 on 域生效，off 与 thermal on 无 capacity 轨 EQ-FLTH-7 原式逐字不动，§6.2）；**SOC_est 维持 E_nom 测量记账口径**（测量链零升级——与 FC Q5 定案「测量/控制链零升级」同构） |
| EQ-FLTH-12 | **稳态：β·I_true²·R0·θ_ss² + (α·I_true²·R0 − h)·θ_ss + I_true²·R0 = 0**（β>0 时二次代数方程，物理根 = 小根 θ₋）；**数值稳定小根形态（冻结——Q3/A-3 定案）：θ₋ = 2·I_true²·R0 / [(h − α·I_true²·R0) + √Δ]**（有理化式——Δ→0 无相消、β→0 无 0/0；naive 求根式 [(h−αI²R0) − √Δ]/(2βI²R0) 仅作展示不作求解式——β=0 时 0/0 未定义、小 β 段大数相消，扫描实测 β=1e-12 时相对差 2.25e-7，§3.3 ⑦）；**局部稳定性条件：h > I_true²·R0·(α + 2β·θ)**（轨内全程成立——θ(t) ≤ θ₋ 单调结构性推论，轨内最小裕度 = √Δ）；**全轨失稳边界：h = I_true²·R0·(α + 2√β)**（⟺ Δ = 0 双重根；**注册域要求严格大于**——扫描实测 62.5 A 角点裕度 +1.0826 W/K，§3.3 ②）；判别式 Δ = (h − α·I_true²·R0)² − 4β·(I_true²·R0)²：**Δ < 0 ⟺ h < I_true²·R0·(α + 2√β)（h > αI²R0 侧精确成立——A-6 定案措辞；边界 h = I²R0(α+2√β) 为 Δ=0 双重根临界、非 Δ<0 等价点）**；补记（h ≤ αI²R0 段）：Δ 可为正但两根皆负、同属无正实稳态域（复根段精确范围 I²R0(α−2√β) < h < I²R0(α+2√β)——dθ/dt > 0 全域、解有限时间发散，A-9/§1.6 ⑤）；β = 0 退化：θ₋ → I_true²·R0/(h − I_true²·R0·α)（EQ-FLTH-9 现行式精确还原——扫描实测 0.0 ulp 逐位一致，§3.3 ⑦）；推导注：稳定根处 I_true²·R0·(α + 2β·θ₋) = h − √Δ < h 恒成立（√β 单位 1/K 自洽） | ≡ EQ-FLTH-9（FLTH :222）域内重推——θ_ss 不再是线性闭式而取二次小根稳定形态；β = 0 时判别式退化为 Δ = (h−αI²R0)²、稳定性条件退化为 h > I²R0α（现行式精确还原）；**闭式保留定案（Q3）**：FLTH EQ-FLTH-9 闭式先例 + oracle 自检交叉面 + 教学可见（失稳边界 h = I²R0(α+2√β) 闭式直接进 limitations/域声明）；数值求解仅在闭式数值病态时兜底（登记不静默） |

**守恒面声明（与 FLTH Q1 性质不同的诚实登记——A5 §2.2 结论 1 照录；裁定点一定案维持）**：P_bat,true = 0.4·I_true
口径不动 ⇒ **EQ-FLTH-5（P_gen = P_load − P_bat + P_loss）/EQ-FLTH-6（r_true/r_meas）/EQ-FLTH-8
（E 恒等式与子步梯形）/EQ-FLTH-9 检查式（E_source + E_bat − E_load − E_loss ≡ 0）全部不动**——
η_cap 只改 SOC 折算分母（记账面），无第二缺口项、无「补偿去向」裁定面（FLTH Q1 性质差异成立——
裁定点一定案原文见 §6.2），守恒面零涟漪维持；checks.js energy-balance FL 分支零改动预期（判据域
核验见 §1.4 末行）。突破面**被限定在 SOC 折算面一项**（FLTH Q1 方案 (a)
定案文本零触碰）。A-flth-loss/A-flth-no-feedback 假设在 capacity on 域的变体条款见 §1.6。

### 1.4 SOC_est / SOC_err 面（测量链不动 ⇒ 双因化登记——FC A-5 同构；A-2 已定案）

| 面 | capacity on 域行为 | 判据/声明 |
|---|---|---|
| SOC_est | 与 L0/fl001_v2 **逐位同**（测量链 P_bat,meas = 0.4·(I_true+b) 不动、分母 E_nom 不动） | 结构判据（FC §3.2「I_fc 与 L0 逐位同」同构）；oracle 自检硬条件（§4 项 4） |
| SOC_true | E_cap(T_bat) ≤ E_nom ⇒ 放电段下降加快、充电段上升加快（|ΔSOC| 放大——结构性方向声明）；**healthy 局（默认参数 Run）：T_bat < T_cap0 ⇒ η_cap ≡ 1 精确、E_cap ≡ 40 kWh 精确 ⇒ SOC_true 与 fl001_v2 healthy 逐位同（位级——修正累积器机制，扫描实测 59.583333333333336 位级同，§3.2）** | 方向为 η_cap ≤ 1 的构造推论；折算幅度随 T_cap0 阈值机制定案（Q2 定案阈值线性——healthy 温升域内 η_cap ≡ 1） |
| **SOC_err**（A-2 定案） | 分歧机理从「测量链偏差」**单因扩展为「测量链偏差 + 容量折算」双因**（A5 §2.2 结论 4）——签名面变化；**healthy 局 SOC_err ≡ 0（位级——T_cap0 = 313.15 K 高于 healthy 轨最高温 309.953757 K ⇒ 容量因子在 healthy 局不激活；扫描实测 healthy/monitor SOC_err = 0.0 位级、sensor_drift Run SOC_err = −0.111111 pp 与 fl001_v2 位级同）**；**SOC_err 非零（容量因子）仅出现在 capacity on 域高温段（load0 ≳ 31.15 kW 激活阈，§3.3 ⑥）——模型已知结构项、非测量故障/非能量损失** | FC A-5 记账基登记同构 + FC A-1 修正表述同构（「偏离工作点显非零结构项——模型已知结构项、非测量故障」句式）；questions/SOC_err 指标解释卡双因化文案归实现轮文案面（§6.4 预检同轮）；**FLTH Q3 教学锚点「max\|r_meas\| = 4.0 是测量偏差，不是能量损失」维持纯净**（r_meas 面 EQ-FLTH-6 无容量项——r 面与 SOC_err 面分离，登记不混同） |

**checks 判据域核验（A-2 定案附带——conservation/energy 类对 FL 的派发现状实读登记，2026-11-14）**：
checks.js 实读（起草时点行号）——① conservation-true（:186-209）：FL 容差 ≤1e-12 kW、判据对象
r_true 定义恒等式回归（engine 已扩展 −P_loss 项）——capacity 面零触碰 ⇒ **判据/分派零变化**；
② conservation-meas（:210-260 else 支）：≤1e-6 pass / faulted warn / noise warn——r_meas ≡ 0.4·b
零触碰 ⇒ **零变化**；③ soc-bounds（:422-445）：bounds.SOC_pct 派生分派、SOC_true/SOC_est ∈
[0,100]+1e-6——capacity 面只改 SOC_true 数值面（下降/上升加快方向），默认 SOC0=60 注册域 60 s
窗无越界（角点 load0=45 SOC_true(60) = 58.63 pp）；手拼低 SOC0 越界面为既有行为的域内放大——
**判据零变化**；④ energy-balance（:485-545）：FL thermal_model=on 分支 |E_source + E_bat −
E_load − E_loss| ≤ 1e-6 kWh——恒等式按构造闭合（E_source 同源自 P_loss），P_loss 数值面随
EQ-FLTH-10 修订式变化、判据零变化。**四检查零改动预期维持（FLCAP-G2b-04 核对项）**。

### 1.5 参数面（**本版定案（CHG-20261114-01）——域扫描证据 §3.3；全部教学整定值、非实测**）

| 参数 | 单位 | 定案值 | 整定依据（一句话——七项判据全过，§3.3） |
|---|---|---|---|
| **β** | 1/K² | **5×10⁻⁷**（2026-11-14 批准轮定案；教学参数非实测——A-flcap-params） | ① 60 s 窗可见性：load0=45 角点 ΔT_bat(60) = +0.416 K（425.120 K 轨上 0.098%）、P_loss β 项 +0.0095 kW（第 3 位小数可见）、渐近 θ₋ +26.25 K——「高电流角点放大」教学点可见不过度；healthy 局 ΔT(60) = +5.3e-4 K 低于 0.01 K 显示精度、healthy 锚点面零扰动；② 稳定性裕度：h − I²R0(α+2√β) 于 I_max = 62.5 A 角点 = +1.0826 W/K > 0（比值 1.1214×；轨内局部裕度下界 √Δ = 1.888 W/K）；③ 注册域单调（α + 2β·θ ≥ 0 全域——β ≥ 0 符号域 A-5）；④ 判别式 Δ > 0 全域（min 3.564453 @ 角点）；⑤ RK4 裕度 dt·|λ| = 7.29e-5 ≪ 2.78；⑥ 与 η_cap 联合耦合复扫（全部扫描为 (β, η_cap) 联合模型 RK4 耦合仿真）；⑦ β=0 退化逐位（0.0 ulp，§3.3 ⑦） |
| **k_cap** | 1/K | **0.004**（A-5 符号域：k_cap ≥ 0——单调不增前提） | load0=45 角点 60 s 末 η_cap = 0.5521 / E_cap = 22.08 kWh（−45% 折算教学可见、不过度）；窗内 min η_cap = 0.5521 > η_floor=0.5（floor 窗内不结合、可见折算不被下限截断）；60 s 窗内与 T_cap0 联合激活阈 load0* ≈ 31.15 kW（域内近半段可见——§3.3 ⑥） |
| **T_cap0** | K | **313.15（= 40 °C）** | 高于 healthy 轨最高温 309.953757 K（裕度 3.196 K——A-2 机制：healthy 局 η_cap ≡ 1 精确/E_cap ≡ 40 精确/SOC_err ≡ 0 位级，§3.2/§3.3 ③）；四 golden Run 窗内最高温 = 309.953757 K（sensor 304.639941 / actuator 304.505390）全部低于 T_cap0 ⇒ fl001_v3 全 4 Run E_cap ≡ 40 精确 |
| **η_floor** | 无量纲 | **0.5**（A-1 定案 (a) 形态内正性下限） | η_cap ∈ (0,1] 全域构造保证（E_cap ≥ 20 kWh、SOC 积分良定义——无下限形态零点 T_cap0+1/k_cap = 563.15 K < load0=45 渐近 T_ss = 681.5 K，floor 承接渐近域 + 越域 limitations 登记 §1.6 ⑤）；60 s 窗内不结合（窗内 min η = 0.5521）；η_floor > 0 符号域（A-5） |
| R0 / α / C_bat / h / T_amb / E_nom / DT_INT | — | **冻结值原样**（FLTH §2.1：0.2 Ω / 0.01 1/K / 300 J/K / 10 W/K / 298.15 K / 40 kWh / 0.01 s——engine.js:786-791 实读逐值核对） | 零变更（本轨不触碰 thermal 轨常量——fl001_v2 字节冻结零涉的结构保证） |

### 1.6 assumptions / limitations / UI 措辞（**本版冻结**；实现轮迁入 src/** 前 §6.4 预检 + copy-guard 终检）

| id | text（**冻结文本**） |
|---|---|
| A-flcap-cap | 【仅 capacity_model=on 适用】可用容量按温度折算：E_cap(T_bat) = η_cap(T_bat)·E_nom，η_cap(T) = max(η_floor, 1 − k_cap·max(0, T − T_cap0))（η_floor = 0.5 > 0 正性下限——η_cap ∈ (0,1] 全域构造保证、E_cap ≥ 20 kWh、SOC 积分良定义；T_cap0 = 313.15 K、k_cap = 0.004 1/K）；为教学尺度折算面（教学示意），容量慢漂移与循环老化未建模。 |
| A-flcap-params | 【仅 capacity_model=on 适用】β = 5×10⁻⁷ 1/K² 与 η_cap 折损形态参数（k_cap = 0.004 1/K、T_cap0 = 313.15 K、η_floor = 0.5）均为教学整定值（非实测参数）：按 60 s 演示窗内二阶效应可见、注册域单调与稳定性裕度整定（§3.3 域扫描证据），不对应任何真实电池包容量-温度特性或参数辨识；符号域 β ≥ 0、k_cap ≥ 0、η_floor > 0。 |
| A-flcap-soc | 【仅 capacity_model=on 适用】SOC 折算口径：SOC_true 以 E_cap(T_bat) 为分母（记账面）；P_bat,true = 0.4·I_true 口径不动，功率链零反馈；SOC_est 维持铭牌容量测量记账口径与 thermal_model=on 轨逐位同；healthy 局 T_bat < T_cap0 ⇒ E_cap ≡ 40 kWh 精确 ⇒ SOC_true/SOC_est/SOC_err 与 fl001_v2 healthy 逐位同；SOC_err 为测量链偏差 + 容量折算双因——容量因子非零仅现于高温段（模型已知结构项、非测量故障/非能量损失）。 |
| A-flcap-stability | 【仅 capacity_model=on 适用】热平衡稳定性条件 h > I_true²·R0·(α + 2β·θ) 与稳态存在条件（判别式 ≥ 0）在注册参数域内成立（β 定案后角点复扫：I_max = 62.5 A 角点裕度 +1.0826 W/K、Δ = 3.564453、全域网格 min Δ > 0——§3.3）；手拼配置越域可破（无热保护，见局限）。 |
| A-flcap-l1 | 【仅 capacity_model=on 适用】容量-内阻二阶效应模型为教学尺度单状态集总示意（L1 扩展），不是经过验证的设备控制器或电池容量模型。 |

（A-flth-lump/A-flth-params/A-flth-loss/A-flth-no-feedback/A-flth-stability/A-flth-l1 六条既有
assumptions **零触碰**——capacity on 域变体以上表新条承载，挂 capacity additive 子对象（§2
契约面行）；A-flth-no-feedback 的「温度对容量折算不做」半句在 capacity on 域由 A-flcap-cap/A-flcap-soc
显式取代——域内取代关系随本版冻结。）limitations 追加（capacity on 域，5 项）：① 容量慢漂移/
循环老化未建模（教学示意折算面——ALINE §7 老化轴另立轨留位）；② β 二次项为教学参数（真实电池
R(T) 高温段形态未建模——FLTH §6.1 项 2 扩域）；③ 稳定性域边界移动（FLTH §3.4 登记的 load_kW >
48.2843 kW 越界边界在 capacity on 域失效——**新界 load_kW > 46.4741 kW（I_b = 66.1854 A，β 定案
重推：I_b = √(h/(R0(α+2√β)))、load0 界 = 0.4·I_b + 20，FLTH §3.4 推导形态同构）**，注册域全量复扫
已随本轮完成（§3.3 ④）、emit 复算维持硬条件）；④ 沿袭 thermal 轨全部局限（单节点集总/无热管理/
环境常数/无热保护等）；⑤ **β>0 且判别式 < 0（或 h ≤ αI²R0）越域手拼段解为有限时间发散
（Riccati a > 0——A-9 定案：扫描实测 load0=150 kW 手拼 t≈7.8 s 窗内非有限、load0=48 kW 越界段
窗内未发散而渐近发散；发散时窗与越域深度相关）**——FCAP-8 无 NaN/Inf 断言限定注册域。UI 变体
提案：on =
「L1 · 单节点热-容量折算模型（数值仿真级）」；summary 追加「电池按温度折算可用容量、内阻随温升
非线性增大（教学折算面）」；定位句「教学尺度容量-内阻二阶效应示意（L1 扩展），非机组/电网动态
验证」——全部预检见 §6.4。

## 2. 场景/事件族影响面（零新事件族 + scenario 新键 additive 显式 CHG）

| 面 | 登记内容 |
|---|---|
| 事件族 | **零新事件族**：sensor_drift / actuator_fault 两族（FL 的 load_step 已按 O-13 删除——§3.3 ⓪ 实读；本行 v0.1 「三族」表述按实读勘正）定义、参数域、defaultTime、因果模板零变更——on_cap 轨仅物理响应面变化（同故障跨深度对比 = 教学点，ALINE §6.4 固定句式「模型深度导致的表达力差异」） |
| scenario 新键 | EVENT_KEYS（scenario.js:48）additive 新键 `capacity_model` + 枚举常量 CAPACITY_MODELS = ['off','on']（:56 THERMAL_MODELS / :64 ELECTROCHEM_MODELS 同构新增）+ 系统守卫 declaresCapacity 派生（:404/:425 同构；**守卫含前置：declaresCapacity 要求 defaults.thermal_model 已声明**——组合前置的结构承载）；缺省（不提供）解析为系统默认轨（= off）；**schema v1 白名单扩展须显式 CHG**（FLTH §2.4 / FC 面③ 先例——additive） |
| **哈希形态（沿 FC B-1a 定案）** | `capacity_model` **仅在场景输入显式提供时**才写入归一化事件与 hashProjection（scenario.js:419-436 电化学键先例同构），**缺省轨解析只在引擎 normalizeConfig 盖章层发生**（engine.js:199-204 同构新行）⇒ **既有 FL/全库场景 scenarioHash 零变化**（face③ 冻结边界原文 V1_FACES:184-186「新键只影响使用它的输入，既有场景解析与哈希不变」；FC Q9 定案先例照录） |
| **模型哈希面（沿 FC B-2 定案）** | on_cap 轨全部声明面（A-flcap-* 五条、on 域 limitations 5 项——A-9 新增 ⑤、EQ-FLTH-10…12 equations、level_on/summary_on 变体）**挂 SystemDef 模型级 additive 子对象 `model.capacity`（systems.js:640 FC `model.electrochem` 先例同构）——置于 model_hash 具名九字段哈希域之外**（engine.js:536 hashObject 输入清单：model_id/model_version/assumptions/limitations/equations/units/claims/unit_system/equation_ids——**不加入**）⇒ model_hash/run_hash/config_hash 既有输入全部零变化；既有五数组逐字节不动 |
| **新信号列门控（沿 FC onTrackOnly 定案）** | 新信号（E_cap_kWh；η_cap 不出信号候选——Q10）**带 onTrackOnly 标记**（systems.js:566-568 FC 三信号先例同构）——off 轨与 thermal on 无 capacity 轨**结构性缺席不建列**（engine.js:586 makeSeries 门控）⇒ run_hash 的 signals 面零变化（**W3 探针已证：普通 null 列会改 run_hash、onTrackOnly 门控规避**——V120 落地证实机制）；on_cap 轨由引擎 on 轨补建行承载（engine.js:1177 先例） |
| config_hash 投影（沿 FC B-3a 定案） | scenarioView 投影**不入 capacity_model**（thermal_model/electrochem_model 现状均不入——schema.js 同构）；**显式登记已知局限：capacity on/off 两轨 config_hash 同值（FL/FC 现状同款），轨区分由 run_hash/序列内容承载——不静默** |
| 事件快照 | 零扩展（E_cap 不入事件快照——FLTH §3.6 最小集声明同款） |
| 盲包 | FL 在盲测池（arena.js:105 ARENA_EXCLUDED 现值不含 FL-001——实读）；默认 off + 显式键条件式 ⇒ 盲包 config 指纹/观测语义零变化；**新信号不入盲投影显式声明**（GTL1 §1.2 B-1 先例）；未来盲包钉 on_cap 须同轮 Arena 锁定面裁定（登记不预设——FLTH R-9 同款） |
| 契约面 additive 通道（V1_FACES 八面冻结下核对） | 面① defaults/信号 additive（assumptions 走模型级 additive 子对象——B-2 形态）；面② 新 golden 新 id；面③ 新事件键 additive（B-1a 显式键条件式）；面⑥ scope 零改动预期（**FL classify 不消费 cfg 键与 modelVersion——FLTH §4 项 5 B-1 已评审核实「不校验、仅登记」，本轨零新增校验**）；面⑦ 步数账 0 新步预期（实现轮 CHG 申报）；面⑧ 词表零增预期——**零 breaking 预期**（既有 golden 零触碰/既有哈希零变化/既有 run-g2 步判据零翻转，V1_FACES §3.4 additive 边界三条逐一对照） |

## 3. 锚点与包络（off/thermal-only 轨逐位硬条件；on_cap 轨数值 = 批准轮域扫描值（§3.3，RK4 dt0.01 (β, η_cap) 联合耦合仿真，2026-11-14）——emit 由 FLCAP-G2b-03 复算冻结）

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

### 3.2 on_cap 轨锚点（**数值 = 批准轮域扫描值（§3.3）——本版冻结，emit 复算冻结**；健康局结构表 + A-2 SOC_err 行）

健康局锚点表（默认参数 Run：load0=30 / SOC0=60 / healthy / closed_loop，capacity_model=on）：

| 锚点 | 口径 | 值（域扫描复算） | 判据形态 |
|---|---|---|---|
| T_bat(0) | = T_amb（冷启动） | 298.15 K（登记常量） | 精确值 |
| T_bat 轨 | β·θ² 项使温升加深 | **方向声明（结构性）：β > 0 ⇒ R_int(T) ≥ 线性式 ⇒ P_loss ≥ 线性轨 ⇒ T_bat(t) ≥ fl001_v2 同 I 轨逐点**（同 I_true 轨下——I 面零反馈的结构推论）；扫描实测四 Run 全轨 0 违例点（§3.3 ①） | 方向无条件；数值 = 域扫描值 |
| **T_bat(60)** | 60 s 末（窗内 max——单调升） | **309.953757 K**（fl001_v2 同 I 轨 309.953229 K，Δ = +5.3×10⁻⁴ K——低于 0.01 K 显示精度，healthy 锚点面零扰动） | 域扫描复算（§3.3 ①③）；emit 冻结 |
| θ_ss | EQ-FLTH-12 二次小根 | **θ₋(25 A) = 14.287172 K（T_ss = 312.437172 K；β=0 线性式 14.285714 K）** | 闭式（Q3 定案）复算抽查（FCAP-5） |
| SOC_true(60) | EQ-FLTH-11 折算 | **59.583333333333336 pp（与 fl001_v2 healthy 位级同——E_cap ≡ 40 kWh 精确，修正累积器恒 0.0）** | A-2 机制（位级实测 §3.3 ③） |
| SOC_est(60) / E_bat | 测量链不动 | **59.583333333333336 pp / 0.166666666666667 kWh——与 fl001_v2 逐位同** | 结构判据（oracle 自检硬条件 FCAP-3） |
| **SOC_err（healthy 局——A-2 新增行）** | SOC_est − SOC_true | **≡ 0（位级）——T_cap0 = 313.15 K > healthy 轨最高温 309.953757 K ⇒ 容量因子不激活**；SOC_err 非零（容量因子）仅现于 capacity on 域高温段（load0 ≳ 31.15 kW）——模型已知结构项、非测量故障/非能量损失 | A-2 定案机制；判据域核验（§1.4 末） |
| E_loss / P_loss 轨 | 随 R_int 修订式 | **P_loss(0)/P_loss(60) = 0.125 / 0.139763404 kW；E_loss(60) = 0.002240512336 kWh**（fl001_v2：0.139754037 / 0.002240437744——β 项 fp 级可见于 golden 比对面） | ≥ 线性轨（方向声明实测） |
| E_cap（新信号列） | η_cap(T_bat)·E_nom | **≡ 40 kWh 精确（全窗——四 golden Run 一致）** | A-2 机制证明（位级实测 min = 40.0） |
| monitor 轨热面 | b 不进物理回路 | **T_bat 与 healthy 轨逐点恒等**（max\|ΔT\| = 0——扫描实测 T(60) 位级同 309.953756517 K） | FLTH FL-6 同构判据（FCAP-6） |
| r_true / r_meas | EQ-FLTH-5/6 不动域 | r_true ≡ 0；r_meas ≡ 0.4·b（healthy 局 0；sensor Run max\|r_meas\| = **4.0 精确**——锚点保持） | FLTH Q3 锚点纯净维持（实测 4.000000000000000） |

同故障分歧预期表（结构预登记 + 域扫描复测确认）：sensor_drift（教学链五段延伸：测量偏差→电流→
损耗→温度→**容量→SOC**——A5 §2.2 结论 4；SOC_err 双因化的主教学 Run——扫描实测：默认参数下
SOC_est/SOC_true/SOC_err 与 fl001_v2 位级同（容量因子不激活），双因化的容量分支在高温段（load0 ≳
31.15 kW）显现）；monitor_only（热面恒等 + SOC_est 偏、SOC_true 折算的双因对照）；**高负载角点
（load0=45 手拼/场景角点——FL 无 load_step 族（O-13 已删），大电流角点由 initial.load_kW 域上端
承载——B-2/A-2 域扫描勘正）**：I² 项放大 + 折算面联合作用主角点（T(60) = 425.120 K、E_cap(60) =
22.085 kWh、SOC_true(60) 折算加速 −0.3303 pp）；actuator_fault（限幅深降温——容量折算面回摆方向
声明）。三 Run 对照轨 = fl001_v2 同 Run（跨深度对比：L1-thermal ↔ L1-capacity 双列差异带）。
**扫描复测注**：默认参数 4 Run（healthy/closed_loop_fault/monitor_only/actuator_closed_loop）
在 capacity on + β 定案下 T_bat/P_loss 仅 β 项 fp 级加深（ΔT_max ≤ 7.5e-5 K——故障 Run）、SOC 面
与 fl001_v2 位级同——fl001_v3 golden 数值面增量集中在 E_cap_kWh 新列（≡40）与 β 级热面差异。

### 3.3 包络与角点——**域扫描证据节（批准轮实测，2026-11-14，CHG-20261114-01）**（emit 复算 = 硬条件——GTL1 A-2 域扫描冻结先例；python -I 临时脚本 stdlib 独立计算、TEMP 用后删；环境校验 = fl001_v2 冻结 golden healthy 全序列位级复刻——T_bat/SOC_true/P_loss 序列 worst diff = 0.0、int_I = 1500.0 A·s 精确、E_loss 累积差 1.5e-17 kWh（fp 结合序，≪ E_kWh=1e-6 判据域））

| # | 项 | 域扫描结果（定案判据数值） |
|---|---|---|
| ⓪ | **注册域实读声明（扫描输入——以实读为准）** | FL 注册域 = initial.load_kW ∈ [10,45]（systems.js:153 bounds 实读）× sensor bias ∈ [2,30] A（:278——正偏、闭环只降目标）× monitor（target=I_ref）× actuator 限幅 [20,85]%（:290——min(·,I_cap) 只降）；**FL 无 load_step 族（O-13 已删，FAULT_CATALOG §1 :30 归档）**，库内口径 I_ref = (load0 − 20)/0.4（plants/fl001.js:31 实读）⇒ **注册域最大电流 I_max = 62.5 A（load0=45 角点，monitor/healthy 前段）**、充电角点最大 \|I\| = 55 A（load0=10 + b=30 闭环：−25−30）。〔勘误登记：批准指令载荷所引「load0∈[10,45]+step∈[−10,20] ⇒ I_max=162.5 A」为 MG-001 聚合负荷轴（step ∈ [−10,20] 为 MG load_step 族）与 FC I_fc 口径（I_fc = (P_load−10)/0.4、FC 有 load_step [5,20] ⇒ 137.5 A，FCECH §3.3 实读）的跨系统混入——FL 实读无 step、I_max = 62.5 A，以实读为准（V140 DEC-3 ②「域最大 I 角点」按本实读承载）〕 |
| ① | 60 s 窗 T_bat 轨可见性（β 项贡献——on_cap vs fl001_v2 同 I 轨） | healthy 默认（I=25 A）：ΔT_bat(60) = **+5.3×10⁻⁴ K**（低于 0.01 K 显示精度——healthy 锚点面零扰动）；load0=40（I=50 A）：**+0.065 K**；load0=45 角点（I=62.5 A）：**+0.416 K**（425.120 K 轨上 0.098%——教学可见不过度）；P_loss(60) β 项：+0.0000 / +0.0013 / **+0.0095 kW**（角点第 3 位小数可见）；渐近稳态 θ₋(62.5 A)：357.142857 → **383.390805 K（+26.25 K）**；方向声明实测：四 Run T_bat(on_cap) ≥ fl001_v2 逐点、**0 违例点** |
| ② | 稳定性/判别式全域（I_max 角点 + 全域网格） | **62.5 A 角点：I²R0(α+2√β) = 8.917354 W/K < h = 10 ⇒ 裕度 +1.0826 W/K（比值 1.1214×）**（β=0 现行面对照：7.8125 W/K、+2.1875、1.2800×——FLTH §3.4 登记值；β>0 的裕度代价显式登记）；充电角点 55 A：6.905599 W/K、裕度 +3.0944 W/K；**全域网格（load0 10…45 步 0.5 × 电流可达集 7 情形——healthy/闭环 b∈{2,10,30}/monitor/actuator {20,55,85}%）：min Δ = 3.564453 @ (45, 62.5 A) > 0**；轨内局部稳定裕度下界 = √Δ = **1.887976 W/K > 0**（θ ≤ θ₋ 单调结构性保证——EQ-FLTH-12 推导注） |
| ③ | T_cap0 vs healthy 轨最高温（A-2 机制） | **healthy(on_cap) T(60) = 309.953757 K（fl001_v2 同 I 轨 309.953229，Δ = +5.3e-4 K）< T_cap0 = 313.15 K（裕度 3.196 K）**；四 golden Run 窗内最高温 = 309.953757 K（closed_loop_fault 304.639941 @22.1 / monitor 309.953757 / actuator 304.505390 @20.5）全部 < T_cap0 ⇒ **全 4 Run η_cap ≡ 1 精确、E_cap ≡ 40 kWh 精确（位级实测 min = 40.0）**；healthy SOC_true 修正形态 = 59.583333333333336 位级同 golden（修正累积器 = 0.0 精确；直接子步分母形态 |diff| = 7.1e-14 pp——fp 结合序噪声级、≪ FCAP-3 ±1e-9 判据域，位级形态由修正累积器承载） |
| ④ | 48.2843 kW 边界移动：新界推导与注册域全量复扫 | 原界（β=0，FLTH §3.4 同构推导）：I_b = √(h/(R0α)) = 70.7107 A ⇒ load0 界 = 0.4·I_b + 20 = 48.2843 kW；**新界：I_b = √(h/(R0(α+2√β))) = 66.1854 A ⇒ load0 界 = 0.4·66.1854 + 20 = 46.4741 kW（下移 1.8101 kW）**；注册域 max load0 = 45 < 46.4741（**裕度 1.4741 kW / I 裕度 3.685 A**）；角点判别式 Δ = (h−αI²R0)² − 4β(I²R0)² = **3.564453 > 0**；①…⑥ 全部判据在 (β, η_cap) 联合耦合模型下复扫 |
| ⑤ | RK4 步长裕度（dt·λ ≲ 2.78） | \|λ\|max = (h − I²R0α)/C_bat @ (I=62.5 A, θ=0) = **7.2917×10⁻³ 1/s** ⇒ **dt·\|λ\| = 7.292×10⁻⁵ ≪ 2.78（裕度 ×38126）** |
| ⑥ | η_cap 机制生效核验 | **域内激活阈 load0* ≈ 31.15 kW**（T(60) 越过 313.15 K；healthy 默认 309.953757 K 不激活）；load0=45 角点：T(60) = 425.120236 K ⇒ **η_cap(60) = 0.552119、E_cap(60) = 22.084762 kWh**（< 40 可见——窗内 min η = 0.552119 > η_floor=0.5：floor 窗内不结合）；SOC_true(60) = 58.628071 pp（同 I fl001_v2 轨 58.958333——**容量折算加速 −0.3303 pp**）；充电角点（load0=10, b=30 闭环 \|I\|=55 A）：T(60) = 362.785314 K ⇒ E_cap(60) = 32.058350 kWh、SOC_true 上升加快 +0.0639 pp；无下限形态零点 T_cap0+1/k_cap = 563.15 K < load0=45 渐近 T_ss = 681.5 K ⇒ **floor 承接渐近域（E_cap ≥ 20 kWh 全域——A-1 正性保证）** |
| ⑦ | β=0 退化核验（θ₋ 稳定小根形态 → EQ-FLTH-9） | **有理化形态 @ β=0 与 EQ-FLTH-9 现行式逐位一致：0.0 ulp**（I = 13.75/15/25/32.5/50/62.5 A 六点全测——θ₋ = 3.929847353037 / 4.712041884817 / 14.285714285714 / 26.782884310618 / 100.000000000000 / 357.142857142857 K）；**naive 求根式 @ β=0：ZeroDivisionError（0/0——分母 2βI²R0，A-3 冻结有理化形态的直接动机）**；抵消演示 @ β=1e-12、I=25：naive 相对差 2.25×10⁻⁷（大数相消）vs 有理化精确 |
| ⑧ | A-9 有限时间发散演示（手拼越域佐证） | load0=48 kW（I=70 A，I²R0=980 W，αI²R0=9.8 < h=10 < 10.676=p(α+2√β)——Δ<0 复根段）：窗内未发散（T(60)=491.5 K、渐近发散）；load0=60 kW（h≤αp 段）：T(60)=1680.5 K；**load0=150 kW：t≈7.8 s 窗内非有限值（有限时间发散实证——Riccati a>0）**；发散时窗与越域深度相关（limitations ⑤ 措辞依据） |

## 4. golden 计划（fl001_v3 · 新 id · 独立 oracle · oracle_base 出生接入 · 旧 golden 留档；本批准轮零改动维持——emit = FLCAP-G2b-03）

| # | 项 | 内容 |
|---|---|---|
| 1 | 新 id 判据 | golden_id = **fl001_v3**——SOC 定义式结构变更（EQ-FLTH-11）= 模型/方法变更 → 新 id（ORACLE_INTERFACE_D2 §3.1 :127）；保 id 重出不适用（非引擎行为零变更原地扩容）；**supersedes 链 v3→v2→v1** |
| 2 | 独立 oracle | 新文件（**命名 Q4 定案**——`tools/oracle/fl001_cap_oracle.py`，MODELS 键镜像 `fl001_cap`）：独立性声明沿 fl001_l1_oracle.py:5-19 体例——不 import src/**、不 import fl001_oracle/fl001_l1_oracle、方程与常量唯一权威文本 = 本规格批准文本（§1.3/§1.5 冻结）、stdlib（python -I）自含硬编码；**出生即 oracle_base 接入**（六成员 + resolve_run_spec + write_golden_with_sidecar LF 钉死 + approval 三字段非 null 方可落盘 + SERIES_IDS 含 "t" 列）；golden 由本 oracle 只读生成、engine 只读比对（G0-DEC-16）；**fl001_l1_oracle.py 物理零触碰**（V-03） |
| 3 | 数值方法 | **T_bat**：经典 RK4 dt0.01（沿 GT-L1/FLTH/FC 制度；RHS 内 I_true 冻结子步起点——FLTH Q2 定案口径同构）；**I_true**：保留 L0 精确指数子步（plants/fl001.js stepOf 语义——分区结构 §1.2）；**SOC 折算积分离散口径（定案）**：子步 E_cap 冻结于子步起点右值 + **名义单除项 + 容量修正累积器双形态**（EQ-FLTH-11 冻结文本——梯形不采：与 P_loss 梯形记账面 EQ-FLTH-8 分离、起点冻结为 FLTH Q2 同构最简且 healthy 局位级逐位同的承载形态）；**子步解析交叉形态（定案——FCAP-7 自检增强面）**：β = 0 退化为 FLTH FL-7 线性指数交叉；β > 0 子步内为常系数 Riccati 方程（aθ²+bθ+c，I 冻结口径）——**采 Riccati 闭式交叉**（tanh/artanh 分域形态，随 EQ-FLTH-12 稳定小根同族闭式；判据挂 FCAP-7 实测冻结制 ×≥10 且下限 ≥1e-9——FLTH A-2 同款），不降级半步长为主判据 |
| 4 | 自检预案 | 新段 **FCAP-1…n（Q5 定案——新段编号，FL-x 为 fl001_l1_oracle.py 专属证据链、续编混淆 V-03 追溯面——FC Q8 同款理由）**：FCAP-1 环境校验（**fl001_v1 闭式复现（T-A 解析面 ≤1e-9）+ fl001_v2 4 Run 全序列复现——电气/测量面（I/SOC_est/E_bat/r_meas）±1e-9 逐点恒等（FL-3 精确指数先例）；热面（T_bat/P_loss/E_loss）判据挂 FCAP-7 实测冻结制（双实现散差 ×≥10 且下限 ≥1e-9，B-4 定案归一——不做跨语言/跨实现位级承诺）**）；FCAP-2 恒等式（r_true ≡ 0 / EQ-FLTH-9 检查式不动域 / E 恒等式）；FCAP-3 **电气面与测量面跨轨恒等**（I/SOC_est/E_bat/r_meas 与 fl001_v2 ±1e-9 逐点恒等——§1.4 结构判据的 oracle 侧固化；**healthy 局 SOC_true/SOC_err 与 fl001_v2 位级逐位同（A-2 机制——修正累积器恒 0.0）**）；FCAP-4 网格与事件相位（601 点、t[i]=i·dt、pre/post 语义、事件快照零扩展）；FCAP-5 锚点全表复算（§3.2 本版冻结值——healthy 表 + 分歧表 + E_cap 列）；FCAP-6 monitor 热面恒等（T_bat 与 healthy 逐点同）；FCAP-7 半步长自收敛登记 + Riccati 闭式解析交叉（判据按双实现复算散差 ×≥10 且下限 ≥1e-9 冻结制——FLTH A-2 同款）；FCAP-8 无 NaN/Inf（**断言限定注册域**——A-9 定案：越域手拼段有限时间发散属登记局限，不在断言域）+ 包络抽查（**稳定性裕度断言 h − I²R0(α+2√β) > 0 于注册域最大 I 角点（扫描值 +1.0826 W/K @ 62.5 A）+ 判别式 Δ ≥ 0（角点 3.564453）+ η_cap ∈ (0,1]（η_floor 下限承载）+ 符号域 β ≥ 0 / k_cap ≥ 0（A-5 定案）四断言**——§3.3 域硬条件） |
| 5 | Run 集（**Q7 定案**） | **镜像 fl001_v2 全集 4 Run、全部 thermal_model=on + capacity_model=on**：healthy / closed_loop_fault（sensor +10）/ monitor_only / actuator_closed_loop（55%）——新 id golden 镜像基线全集先例（FLTH §4 项 4 镜像 4 Run / FC Q6 (a) 镜像 5 Run）；monitor 不变量判据面保留；**扫描注（§3.2）：四 Run 在默认参数下 E_cap ≡ 40 精确、SOC 面与 fl001_v2 位级同、热面仅 β 级加深——golden 数值面增量 = E_cap_kWh 新列（恒 40）+ β 级 T/P_loss 差异** |
| 6 | 元数据（schema v2） | golden_schema_version="v2"；golden_id="fl001_v3"；model_id="FL-001"；**model_version = '1.1.0' 维持仅登记（定案——FC Q1 定案 B 同构：golden 语义由 golden_id 承载；FL classify 本就不消费 modelVersion——FLTH B-1 核实维持）**；method_id 提案 "fl001_capacity_rk4_dt0.01"（fl001_thermal_rk4_dt0.01 句式）；engine_baseline=null；backend=null；**thermal_model:"on" + capacity_model:"on" 双键入 config 块**（fl001_v2 thermal_model 先例扩双键）；supersedes="fl001_v2（thermal 轨 capacity_model=off，字节冻结留档；存档场次继续引用 v2）"；units 零新增预期（kWh 既有——η_cap 不出信号（Q10 定案）、无量纲单位面零新增）；approval 三字段非 null 首签引批准 CHG（**CHG-20261114-01**）；SERIES_IDS = fl001_v2 全 16 列 + E_cap_kWh 新列（onTrackOnly 门控不删列、仅 on_cap 轨有值——终值以 fl001_v2 series 键集实读 + 新信号核对为准，FCECH-G2b-03 同款核对面） |
| 7 | 容差 tier（**Q8 定案：T-B + 降 T-C 双向预案**） | **T-B**（RK4 双实现、T_bat 温度反馈 ODE 无全局闭式——FLTH/FC 同制）；gate 块键面预案 = fl001_v2 gate 全键面（I_A/T_K/P_kW/E_kWh/SOC_pp/r_true_kW/r_meas_kW_atol/t_s）+ 新键面随信号集 Q10（E_cap_kWh → E_kWh 键或 `_kWh` 专键，随 FLCAP-G2b-03 复算冻结）；**gate 键面缺口（A-4/B-1 定案——机制描述按实测勘正）**：verify_golden.py T-B 分派实读（:228-268）——`"E_cap_kWh".endswith("_kW")` = **False**（kWh 非 `_kW` 精确后缀；`_K`/`_kPa`/`r_true`/`r_meas`/`SOC`/`_pct`/`_V` 各支亦不命中）⇒ **实落 `f_Hz_atol` 兜底支，而 fl001_v2 gate 键面无 f_Hz_atol 键 ⇒ 实害 KeyError（fail-loud）**（原「命中 `_kW` 后缀支量纲错配」描述与实测不符——B-1 勘正：量纲错配不会发生，缺口形态是兜底键缺失的直接 KeyError）；**硬项维持且更紧迫：FLCAP-G2b-03 新增 `_kWh` T-B 分派分支（`endswith("_kWh")` → E_kWh 键，置于 `_kW` 后缀支之前、elif 链 additive 追加——既有键路由零变化证明随实现提交，FC `_V` 分支先例同构）或调整信号命名（二选一显式硬项，不静默）**；超限降 T-C 并必附 convergence 块（双向预案） |
| 8 | verify_golden | 注册面为硬编码表：新增 `import fl001_cap_oracle` + `MODELS["fl001_cap"]` 注册行（fl001_l1 注册行结构镜像——:91-110 实读；i_true="I_bat_true_A"/i_meas="I_bat_meas_A"、event_tol 缺省 I_A_atol、scalars 按 fl001_v3 实际键面全量注册）；**DEFAULT_MODELS 追加（Q6 定案——"fl001_cap"：verify_golden.py:206 现值 ["fl001","fl001_l1","fc001_l1"] 实读核验，FC B-5 定案先例形态** ⇒ 步① 无参调用四 golden 顺序验证 fl001 → fl001_l1 → fc001_l1 → fl001_cap；步① label 滞后说明沿 V120 DEC-5 处置维持登记不修）；**MODELS["fl001"]/["fl001_l1"] 零改动维持验 v1/v2**（默认轨不重指向——FLTH §4 项 7 同构） |
| 9 | 预期失效面 | 新增 `data/golden/fl001_v3.json`(+`.sha256`)；**既有 10 golden 字节零变更**；engine.test.js/plants.test.js capacity 变体**并入现有步**；registry.test.js 哈希面既有断言零变化 + additive 新断言（B-1a/B-2 形态）；FAULT_CATALOG §1 注记行；信号目录；UI 层级徽章变体；**步数账 0 新步预期**（run-g2 35 维持——V140 DEC-6 本波 0 新步定案：verify_golden fl001_cap 并入步①、引擎 on_cap 变体并入步⑤；归实现轮 CHG 申报，I-7） |
| 10 | 两门禁面（FLTH B-2 / FC §4 项 10 同构） | ① **engine↔fl001_v3 T-B 比对面** = verify_golden fl001_cap 全轨 + engine.test.js capacity 变体对 fl001_v3 关键值断言；② **on_cap 轨 P0 验收路由**：(thermal_model, capacity_model) → golden **三元分派表：(off, ·)→fl001_v1 / (on, off)→fl001_v2 / (on, on)→fl001_v3 / (off, on)=非法组合拒绝**——fl001_v3 emit verify 通过前 capacity on 轨不进 P0 验收路径（不静默）；acceptance.keyValues 现值显式声明为既有轨专用冻结锚点，on_cap 轨 keyValues 由 fl001_v3 golden 承载、acceptance 面按 cfg 分域（FLTH A-3② 同构） |

## 5. G2b 排期（FLCAP-G2b-01…04；两波节奏）

1. **FLCAP-G2b-01（本草案，已完成）**：V130 波阶段一 W1（2026-11-13，CHG-20261113-04 授权）——
   本文件 v0.1；
2. **FLCAP-G2b-02（双路独立评审 + 用户批准）**——**波次拆注（B-6 定案）**：双路独立评审 =
   V130 波 W2a/W2b **已完成（2026-11-13，结论回填 §10）**；用户批准 = **v1.4.0 本轮（2026-11-14，
   CHG-20261114-01 指令链）**——两裁定点裁定 + 15 条件全按推荐落正文 + 四常量定案（域扫描证据
   §3.3）+ Q1…Q11 定案 + 更名 APPROVED（本版 v1.0，MG/FC 体例）；
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
| I-2 | 数据诚实性 | 无新增 ODE 状态诚实区分（§1.2——η_cap/E_cap 代数面、β·θ² 代数项）；参数全表「教学整定值非实测」+ 四常量定案值域扫描证据（§1.5/§3.3）；SOC_err 双因化显式登记不混同 r 面（§1.4——healthy 局 ≡0 位级机制 + 高温段结构项声明）；老化轴不做声明（§0/§1.6——「容量慢漂移/教学示意」限定语；aging_model 键名 Q1 定案否决）；L1-lite 诚实注 |
| I-3 | 证据链 | 独立 oracle 新文件（不 import src/** / 既有 oracle）+ golden 只读生成 + off/thermal-only 轨逐位硬条件三层佐证（§3.1）+ 注册域全量复扫（§3.3 八项判据数值——批准轮实测）+ 稳定性/判别式/η_cap/符号域四断言（FCAP-8） |
| I-4 | 批准纪律 | **两裁定点与 Q1…Q11 已于批准轮定案（CHG-20261114-01，2026-11-14）**；本批准不自动打开验收路径——禁入直至 FLCAP-G2b-03 emit verify 通过（§4 项 10 两门禁面）；实现须用户逐版本指令派发 |
| I-5 | 措辞红线 | 「模型深度导致的表达力差异」固定句式（ALINE §6.4）；「不是能量损失」ALLOW 句式照用（r/P_loss 叙事不变域）；定位句带「非机组/电网动态验证」；折算/二阶效应叙事全部带「教学示意/教学折算面」限定语（§6.4 预检表） |

### 6.2 **核心裁定点一：「SOC 定义不动」裁定重开——显式裁定请求（候选/影响面/撤回条件；**已裁定（2026-11-14，CHG-20261114-01）：重开采纳（候选 A）——定案原文见 §6.2.1**）**

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
**——未触发（评审 A 零 P1 / 评审 B 的 P1 为 gate 描述勘正面、非本面否决；用户批准轮已裁定）**。

### 6.2.1 **裁定点一定案原文（2026-11-14，CHG-20261114-01——批准记录）**

**「SOC 定义不动」（V072 DEC-2）重开采纳（候选 A）**：仅在 **capacity_model=on 域内**修订
EQ-FLTH-7 的 SOC_true 分母为 E_cap(T_bat) = η_cap(T_bat)·E_nom（本规格 EQ-FLTH-11 冻结文本）；
**域外（capacity_model=off 与 thermal_model=on 无 capacity 轨）EQ-FLTH-7 原式逐字不动**——
V072 DEC-2 / FLTH Q1 / A-flth-loss / A-flth-no-feedback 在既有轨域的文本零触碰；**P_bat,true =
0.4·I_true 口径不动、守恒恒等式（EQ-FLTH-5/6/8/9 检查式）与残差面零涟漪维持；无第二缺口项、
无补偿去向裁定面（FLTH Q1 性质差异成立）**。教学链「温度→可用容量→SOC」经本裁定在新轨可见
（FLTH §6.1 项 4/6 两处登记不做的顺延兑现）；新轨自始携带修订口径，本批准即其裁定依据。

### 6.3 **核心裁定点二：键形态三选一——对照表（已定案 2026-11-14，CHG-20261114-01：采 (a)；对照保留备查）**

对照表全文见 §1.1（六维对照：fl001_v2 冻结涉面/哈希先例套用/组合拒绝成本/golden 路由面/未来
扩展轴/判定倾向）。**定案 (a) 组合键 `capacity_model: "off"|"on"`**（前置 thermal_model=on；
(off,·)/(on,off)/(on,on)/(off,on)=拒绝 三元封闭路由）——四理由见 §1.1；候选 (b) 枚举扩值
登记为未采（golden 一一映射扩三值的关联面成本）；候选 (c) 原地升级 **breaking 排除**
（fl001_v2 语义面变更 + golden 语义级变更 = breaking——V1_FACES §3.2）。
键名定案 = `capacity_model`（§11 Q1 同轮定案——键形态与键名两裁定分离）。

**A5 §2.2③ 原推荐翻转的偏离链显式确认（A-8/B-2 定案，2026-11-14）**：A5_MULTIPHYSICS_
EXPLORATION §2.2 结论 3（:117-119）原推荐 **thermal_model 枚举扩值**（「单键最小涟漪」——GTL1
Q2 理由 1 + FLTH §2.0 单键先例）→ **V130_WAVE_DESIGN DEC-1 采组合键**（CHG-20261113-04 全采
推荐项、用户批准——上游获准）→ 本规格 §1.1 推荐 (a) → **批准轮显式确认：翻转偏离链闭合，
组合键定案（本段即批准记录面）**。翻转依据 = golden 关联面治理成本（§1.1 (b) 行 B-2 订正后
口径：枚举扩值不涉新键、真实成本在 fl001_l1_oracle RUNS/golden 关联面与 verify 分派分流），
**物理面中立**（两形态的物理面完全同构——翻转不涉任何方程/常量/锚点数值变更）。

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

| # | 进入条件 | 状态（**v1.0 更新（CHG-20261114-01）：④⑤ 随批准闭合，② 转执行面**） |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：FL 无遗留缺陷清单（SCOPE §2 处置表无 FL 未关闭项；FLTH-G2b-01…04 全闭合）；本轨触发项 = A5 §2 提案 + V130 §1 DEC-1（本草案即交付物） |
| ② | 独立 golden | **计划就绪（未产出）**：§4 fl001_v3 / fl001_cap_oracle（Q4 定案）/ 4 Run（Q7 定案）/ schema v2 / T-B（Q8 定案）。**golden 后置系 V130 §0「只到草案+双路评审、批准与实现 v1.4.0」授权的字面偏离显式登记**（GTL1 §7.1 ② / FLTH §7.1 ② / MG001 §7 ② / FC §7 ② 同款句式）；emit = FLCAP-G2b-03，落地并 verify 通过后本项闭合 |
| ③ | UI 措辞与未建模物理清单 | **就绪（本版冻结）**：§1.6 assumptions 5 条 + limitations 追加 5 项 + §6.4 预检表（实现轮迁入 src/** + 终检） |
| ④ | 用户书面批准 | **已闭合（v1.0）**：用户书面批准已下（2026-11-14「下一步」指令链，CHG-20261114-01 登记——两裁定点裁定 + 15 条件全按推荐处置 + Q1…Q11 定案，§6.2.1/§6.3/§11） |
| ⑤ | CHG 登记 | **已闭合（v1.0）**：起草授权 CHG-20261113-04（V130_WAVE_DESIGN，2026-11-13）+ 批准 CHG-20261114-01（V140_WAVE_DESIGN，2026-11-14，含两裁定点裁定、15 条件处置、Q1…Q11 定案与四常量定案授权）均已登记 |

## 8. 工作面分解（FLCAP-G2b-01…04）

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| FLCAP-G2b-01 | 键面三候选对照/EQ-FLTH-10…12 草案级/参数面框架/涟漪登记/锚点结构预填/golden 计划/两裁定点显式化 + 草案 v0.1 | M | **已完成**（V130 波 W1，2026-11-13，CHG-20261113-04） |
| FLCAP-G2b-02 | 双路独立评审（互不可见——V130 §2 串行纪律；**已完成 2026-11-13，V130 W2a/W2b，§10**）+ 用户书面批准（两裁定点 + Q1…Q11 定案 + β/k_cap/T_cap0/η_floor 数值定案 + 域扫描证据——**已完成 2026-11-14，CHG-20261114-01**）+ 条件落正文 + 更名 APPROVED（MG/FC 体例——**本版 v1.0**） | M | **已完成**（评审 2026-11-13 + 批准 2026-11-14，CHG-20261114-01） |
| FLCAP-G2b-03 | oracle 编写（fl001_cap_oracle.py——Q4 定案命名；oracle_base 出生接入 + RK4/Riccati 闭式交叉 + SOC 名义+修正双累积器（§1.3 离散口径）+ FCAP 自检 + T-B 容差复算冻结/降 T-C 预案 + **注册域全量复扫 emit 硬条件（§3.3 复扫复测）**）+ fl001_v3 emit（Run 集 Q7、schema v2、approval 首签引 CHG-20261114-01、sidecar LF 钉死）+ verify_golden `MODELS["fl001_cap"]` 注册行 + DEFAULT_MODELS 追加（Q6 定案）+ **gate `_kWh` T-B 分派分支新增或信号命名调整（A-4/B-1 显式硬项——§4 项 7）** + FAULT_CATALOG §1 注记行 | M | **已完成**（V140 波 W2，2026-11-14：fl001_cap_oracle + fl001_v3 emit + verify_golden 注册行 + DEFAULT_MODELS 四 golden + `_kWh` T-B 分派分支（975 元组路由审计零差异）；证据 v140-release §1.2/§2；CHG-20261114-02/03） |
| FLCAP-G2b-04 | 实现：engine capacity 分支（simulateFL001Thermal 内扩展或同构 early-return——§1.1 键形态定案后落位；稳定小根 θ₋ 形态 + 组合守卫三分派）+ systems.js（defaults.capacity_model='off' + normalizeConfig/defaultConfig 双落点盖章行——FC B-7 定案同构 + E_cap_kWh 新信号 onTrackOnly + sourceKind DERIVED/exposure public_demo + signalCategories 'soc' 归属（B-3）+ model.capacity 子对象 + level/summary 变体）+ scenario EVENT_KEYS/declaresCapacity 守卫（显式 CHG；B-1a 显式键条件式哈希形态）+ validate 组合守卫（capacity_model=on 须 thermal_model=on——结构化错误拒绝）+ checks 判据域零改动核对（§1.4 核验结论）+ 两门禁面（三元分派表，§4 项 10）+ acceptance.keyValues 分域 + UI（inspector/跨深度对比卡三列/SOC_err 解释卡双因化）+ tests engine/plants capacity 变体（并入现有步）+ off/thermal-only 轨逐位验收（run_hash 快照——§3.1 项 3）+ copy-guard 终检 + 步数账 CHG 申报（0 新步预期——I-7） | L | **已完成**（V140 波 W3–W5，2026-11-14：引擎 on_cap（vs golden 全列位级 0.0）+ scenario/schema/UI + tests（+226）+ 0 新步（35 维持）+ off/(on,off) 双逐位验收（探针，v140-release §3）；CHG-20261114-02/03） |

## 9. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | 「SOC 重开」被误读为全域修订（域外被连带改动） | 裁定点一定案原文域限定句（§6.2.1「仅 capacity_model=on 域内」）+ §0 不做清单 ③（域外 EQ-FLTH-7 原式逐字不动）+ off/(on,off) 双逐位验收（§3.1 项 3）+ A5 §8 R-4 同款 |
| R-2 | β/η_cap 整定失当（教学不可辨识/稳态判别式域破坏/η_cap 域越界） | 四常量定案 + 七项判据域扫描证据（§1.5/§3.3）+ FCAP-8 四断言（稳定性/判别式/η_cap 域/符号域）兜底 + emit 复扫硬条件 |
| R-3 | 键形态/键名裁定摇摆导致实现面返工 | §1.1 六维对照 + §6.3 对照表定案 + Q1 定案；批准轮一次定案，实现轮不再重开（FC §11 定案纪律同款） |
| R-4 | fl001_v1/v2 或 fl001_l1_oracle.py 字节被实现轮误触（V-03 哈希失配） | §0 不动清单 ①② + FLCAP-G2b-03/04 工作面不含既有文件 + §3.1 项 3 三机制承载（B-1a/子对象/onTrackOnly）+ off/thermal-only 轨 run_hash 逐位验收 + 全量回归兜底 |
| R-5 | T-B 双实现散差超预案（β 项使温度反馈非线性增强——Riccati 面散差可能大于 FLTH 线性面） | 容差按双实现复算散差 ×≥10 且下限 ≥1e-9 冻结制（FLTH A-2 同款；B-4 归一 FCAP-1 热面判据同制）+ 超限降 T-C + convergence 块（双向预案）+ 禁 ULP 级承诺 |
| R-6 | verify_golden gate 键面缺口（E_cap_kWh 落 f_Hz_atol 兜底支——fl001_v2 gate 无该键 ⇒ 实害 KeyError；A-4/B-1 定案勘正：非「`_kW` 量纲错配」而是兜底键缺失） | §4 项 7 显式硬项（FLCAP-G2b-03 新增 `_kWh` T-B 分派分支或调整信号命名——不静默；既有键路由零变化证明随实现提交，FC `_V` 分支先例同构）+ 复算冻结面 |
| R-7 | SOC_err 双因化被误读为「测量链升级/残差失效/守恒破缺」 | §1.4 三行分离声明（SOC_est 逐位同/r 面不动/双因=模型已知结构面）+ healthy 局 ≡0 位级机制（A-2）+ A-flcap-soc 显式声明 + Q3 教学锚点纯净维持（r 面与 SOC_err 面分离）+ checks 判据域核验（§1.4 末——四检查零变化） |
| R-8 | 步数账超支（I-7） | 0 新步预期（变体并入现有步 + DEFAULT_MODELS 追加形态）+ FLCAP-G2b-04 归口 CHG 显式申报 |
| R-9 | scenario 键/盲包指纹语义漂移（既有场景哈希变化、Arena 钉轨歧义） | B-1a 显式键条件式 ⇒ 既有场景 scenarioHash 零变化 + 默认 off ⇒ 盲包语义零变化 + 新信号不入池显式声明 + EVENT_KEYS additive 显式 CHG + Arena 锁定面登记不预设 |
| R-10 | 教学参数（β/η_cap 缩放）被误读为设备参数辨识 | A-flcap-params 非实测声明 + §1.5 整定依据 + I-5 自查——FLTH R-11 同款 |

## 10. 评审记录与条件处置（**W2a/W2b 回填（2026-11-13，V130 波）+ 批准轮收口（2026-11-14，CHG-20261114-01）**；
     体例沿 FC §10 / MG §10；**批准已闭合**——本节 10.2 为「条件 → 处置 → 落点」处置追记）

### 10.1 评审记录（双路独立评审、互不可见——V130 §2 串行纪律；评审报告全文随波次记录
     归档（2026-11-13 W2a/W2b），本节按归档结论摘要转写）

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | EQ-FLTH-10…12 自洽与量纲、Riccati 子步形态与解析交叉面、η_cap 形态域与 SOC 折算离散口径、稳定性二次代数重推复核、锚点复算、L1 判据对照 | **PASS_WITH_CONDITIONS(9)**（A-1…A-9） | 零 P1——θ_ss 二次方程系数/失稳边界量纲（√β 单位 1/K 自洽）/判别式/小根稳定性**独立重推全部通过**；条件 = 5×P2（η_cap 正性机制 / healthy SOC_err 结构定案 / 数值稳定小根形态 / gate `_kWh` 缺口实测 / β·k_cap 符号域）+ 4×P3（⟺ 措辞 / /3600 位置 / A5 翻转确认 / Riccati 有限时间发散 limitations） |
| 评审人 B（治理/口径/回归面） | 五项进入条件、两裁定点对照表复核（§6.2/§6.3）、哈希先例套用核对（B-1a/子对象/onTrackOnly/B-3a）、golden 治理与 verify 注册面、scenario 键 CHG 面、copy-guard、步数账、不动清单 | **PASS_WITH_CONDITIONS(6)**（B-1…B-6） | 1×P1——E_cap_kWh gate 路由机制描述勘正（**实测落 f_Hz_atol 兜底、实害 KeyError；硬项本身维持**）；2×P2（A5 枚举扩值推荐翻转偏离链显式登记 / §1.2 补 sourceKind·exposure 列）；3×P3（全文以归档报告为准） |
| 用户批准 | 两裁定点裁定 + Q1…Q11 定案 + β/k_cap/T_cap0/η_floor 数值定案（域扫描证据）+ 批准与实现排期（v1.4.0） | **已批准（2026-11-14，CHG-20261114-01 指令链）** | 用户 2026-11-14「下一步」指令链（V140_WAVE_DESIGN v1，DEC-1…7 全采推荐项——GTL1-G2b-02 先例：用户指令链即书面批准记录）：**裁定点一 = 重开采纳（仅 capacity on 域）**、**裁定点二 = 组合键 capacity_model（三元封闭路由；A5 §2.2③ 原推荐枚举扩值的翻转经 V130 DEC-1 上游获准 + 本轮显式确认）**；15 条件全按推荐处置（§10.2）；Q1…Q11 全采草案推荐（§11）；实现 FLCAP-G2b-03/04 随本波用户逐版本指令派发 |

### 10.2 条件处置追记（A-1…A-9 / B-1…B-6 共 15 项——条件 → 处置（**全按推荐，批准轮完成**）→ 落点；
     编号顺序沿回填摘要（P1/P2 前置），如与归档报告编号有出入以归档报告为准；评审报告全文
     随波次记录归档（2026-11-13 W2a/W2b））

| 条件 | 处置（全按推荐，批准轮完成） | 落点 |
|---|---|---|
| A-1（P2） | **η_cap 正性机制定案**：采推荐 (a) 形态内加正性下限——η_cap(T) = max(η_floor, 1 − k_cap·max(0, T − T_cap0))，η_floor = 0.5 > 0（E_cap ≥ 20 kWh 全域、SOC 积分良定义）；越域行为（无下限形态零点 T_cap0+1/k_cap = 563.15 K < load0=45 渐近 T_ss = 681.5 K——floor 承接渐近域）limitations ⑤ 登记 + FCAP-8 域限定 | **§1.5 η_cap 三行定案 / §1.6 A-flcap-cap 冻结文本 + limitations ⑤ / §11 Q2 定案 / §3.3 ⑥** |
| A-2（P2） | **healthy 局 SOC_err 结构定案**：采 Q2 阈值形态 + T_cap0 = 313.15 K 高于 healthy 轨最高温 309.953757 K（裕度 3.196 K）⇒ healthy 局 η_cap ≡ 1 精确、E_cap ≡ 40 kWh 精确 ⇒ **SOC_err ≡ 0、SOC 面与 fl001_v2 healthy 逐位同**（FC 整定依据④同构机制；位级承载 = 名义单除 + 容量修正双累积器——修正项恒 0.0，扫描实测 SOC_true(60) = 59.583333333333336 位级同）；healthy 局测量因恒 0、容量因在 T_cap0 机制下不激活——SOC_err 非零仅现于 capacity on 域高温段（模型已知结构项、非测量故障/非能量损失）；checks 判据域核验结论登记（conservation-true/meas/soc-bounds/energy-balance 四检查零变化——checks.js :186-260/:422-445/:485-545 实读） | **§1.4 SOC_err 行改写 + checks 核验段 / §1.6 A-flcap-soc / §3.2 healthy 锚点表（SOC_err 新增行 + 全表冻结值）/ §8 FLCAP-G2b-04** |
| A-3（P2） | **数值稳定小根形态冻结**：θ₋ = 2I²R0/[(h−αI²R0)+√Δ]（有理化式——Δ→0 无相消、β→0 无 0/0）写死 EQ-FLTH-12；naive 求根式仅作展示（β=0 ZeroDivisionError 实测、β=1e-12 相对差 2.25e-7 相消演示）；§11 Q3 定案闭式保留 + 稳定小根形态；§4 项 3 Riccati 闭式交叉同族 | **§1.3 EQ-FLTH-12 冻结 / §11 Q3 定案 / §4 项 3 / §3.3 ⑦** |
| A-4（P2） | **gate 键面缺口按实测登记**：E_cap_kWh **实落 f_Hz_atol 兜底支**（`"E_cap_kWh".endswith("_kW")` = False 实测——量纲错配不会发生，缺口形态 = 兜底键缺失直接 KeyError）+ fl001_v2 gate 无 f_Hz_atol 键 ⇒ 实害 KeyError（fail-loud）；§4 项 7/R-6 硬项（FLCAP-G2b-03 新增 `_kWh` T-B 分派分支或调整命名，不静默）维持且更紧迫、诊断句按实际分支改写 | **§4 项 7（机制勘正 + 硬项）/ §9 R-6** |
| A-5（P2） | **β ≥ 0 与 k_cap ≥ 0 符号域定案**：写入 §1.5 β/k_cap/η_floor 行与 FCAP-8 断言（√β 实值/抛物线开口/小根稳定全部以 β ≥ 0 为前提；η_floor > 0 一并登记） | **§1.5 符号域 / §1.3 EQ-FLTH-10 / §1.6 A-flcap-params / §4 项 4 FCAP-8** |
| A-6（P3） | **⟺ 措辞勘正**：EQ-FLTH-12 冻结文本改「Δ < 0 ⟺ h < I²R0(α+2√β)（h > αI²R0 侧精确成立；边界 h = I²R0(α+2√β) 为 Δ=0 双重根临界；注册域要求严格大于）」+ h ≤ αI²R0 段补记（Δ 可为正、根全负、同属无正实稳态域——数学精确化） | **§1.3 EQ-FLTH-12** |
| A-7（P3） | **/3600 位置写死**：EQ-FLTH-11 冻结文本改 ∫[P dt′/3600]/E_cap——kW·s→kWh 后再除 kWh 分母（oracle EQ-FLTH-7 现行实现形态同构） | **§1.3 EQ-FLTH-11** |
| A-8（P3） | **A5 原推荐翻转的显式确认落 §6.3 + 批准记录**（物理面中立）：偏离链 A5 :117-119 枚举扩值 → V130 DEC-1 组合键（CHG-20261113-04 全采）→ 本规格推荐 (a) → 批准轮显式确认闭合 | **§6.3 确认段 / §6.2.1 / §10.1 用户批准行** |
| A-9（P3） | **Riccati 有限时间发散 limitations**：limitations 新增 ⑤「β>0 且 Δ<0（或 h ≤ αI²R0）域内解为有限时间发散（Riccati a>0，越域手拼段窗内可现非有限值——扫描 load0=150 kW t≈7.8 s 实证）」+ FCAP-8 无 NaN/Inf 断言限定注册域 | **§1.6 limitations ⑤ / §3.3 ⑧ / §4 项 4 FCAP-8** |
| B-1（**P1**） | **§4 项 7/§9 R-6 机制描述订正**（同 A-4 诊断——实测 `endswith("_kW")` = False → 落 f_Hz_atol 兜底 → KeyError）；硬项（FLCAP-G2b-03 新增 `_kWh` 分支或调整信号命名）维持且更紧迫；只修描述（批准文本 = FLCAP-G2b-03 唯一权威输入，机制错误不得带病冻结） | **§4 项 7 / §9 R-6** |
| B-2（P2） | **A5 §2.2③ 原推荐（枚举扩值）翻转偏离链显式登记**：A5 :117-119 原推荐枚举扩值 → V130 DEC-1 采组合键（CHG-20261113-04 全采、用户批准）→ 本规格推荐 (a)——批准轮显式确认（§6.3）；顺带订正 §1.1 (b) 行 face③「张力需逐字复核」对冲表述（枚举扩值不涉新键、真实成本在 golden 关联面） | **§6.3 确认段 / §1.1 (b) 行订正 / §3.3 ⓪ 域勘误** |
| B-3（P2） | **§1.2 补 sourceKind/exposure 提案列**：E_cap_kWh = DERIVED → public_demo、不设 blindVisible（FC 三信号先例——B-1 定案同构）+ signalCategories 归属登记（'soc' 类目提案——实现轮工作面） | **§1.2 状态向量表（B-3 列）+ §8 FLCAP-G2b-04** |
| B-4（P3） | **FCAP-1「fl001_v2 4 Run 全序列复现 ≤1e-9」挂 FCAP-7 实测冻结制归一**：热面（T_bat/P_loss/E_loss）跨实现判据 = 实测散差 ×≥10 且下限 ≥1e-9（FLTH A-2 同款）；电气/测量面 FCAP-3 ±1e-9 不变（FL-3 精确指数先例） | **§4 项 4 FCAP-1 / §9 R-5** |
| B-5（P3） | **§0 ① 口径勘正**：「tools/oracle/ 全部 10 件」→「tools/oracle/** 全部零触碰」（计数勘正——A5 §1 计数口径以目录通配取代） | **§0 不动清单 ①** |
| B-6（P3） | **§5 项 2 波次标注拆注**：双路评审 = V130 W2a/W2b 已完成 2026-11-13；用户批准 = v1.4.0 本轮 2026-11-14 | **§5 项 2** |

## 11. Q 点定案记录（**Q1…Q11 已定案（2026-11-14，CHG-20261114-01）——全部采草案推荐项**；候选与理由保留；体例沿 MG001 §11 / FC §11 定案记录形态）

| # | 问题 | 候选 | **定案（采推荐，CHG-20261114-01）+ 一句话理由** |
|---|---|---|---|
| Q1 | 新键命名（键形态=裁定点二已定案组合键；键名独立裁定） | (a) `capacity_model`；(b) `aging_model`（ALINE §7「热-电-老化三元（老化 = R₀/SOC 容量慢漂移）」轴名）；(c) `ecap_model`/`second_order_model` 类泛化名 | **定案 (a) capacity_model**——A5 §2 提案标题「T_bat → 容量/内阻二阶效应」主面命名、与电化学 electrochem_model 命名句式同构；**aging_model 否决（I-2 诚实性）**：本轨两件均为温度代数面（折算+二次项）、非时间慢漂移/循环退化——aging 轴属 ALINE §7 留位另立轨，误名即数据不诚实 |
| Q2 | η_cap 折损函数形态 | (a) 阈值线性 η_cap = min(1, 1 − k_cap·max(0, T − T_cap0))（两参数）；(b) 全域线性 1 − k_cap·θ（单参数）；(c) 二次/非线性形态 | **定案 (a) 阈值线性（+ A-1 η_floor 下限机制）**——与 A5 §2.1「高温段线性折损」原文最贴 + 参数可解释（折损起始温度/折损率）+ 阈值下方 η_cap ≡ 1 与 thermal 轨兼容性好（A-2 healthy ≡0 位级机制的结构前提）；全域线性 (b) 低温域即折算（healthy 面失真、A-2 机制不可达） |
| Q3 | θ_ss 渐近稳态：闭式 vs 数值求解 | (a) 闭式保留（二次方程求根 + 判别式域声明）；(b) 数值求解（求根器） | **定案 (a) 闭式保留 + 稳定小根形态（A-3）**——FLTH EQ-FLTH-9 闭式先例 + oracle 自检交叉面（β=0 退化 0.0 ulp 实测）+ 教学可见（失稳边界 h = I²R0(α+2√β) 闭式直接进 limitations/域声明）；数值求解仅在闭式数值病态时兜底 |
| Q4 | oracle 文件命名 | (a) `fl001_cap_oracle.py`（物理面命名）；(b) `fl001_l1b_oracle.py`（深度序命名）；(c) `fl001_thermal_cap_oracle.py`（复合命名） | **定案 (a) fl001_cap_oracle.py**——物理面直接命名（容量面为本轨唯一新增物理面）、MODELS 键镜像 `fl001_cap`；FC Q2 定案 fc001_l1_oracle.py 的深度命名在本轨易与 fl001_l1 混淆（同系统第二深化轨） |
| Q5 | oracle 自检段名 | (a) 新段 FCAP-1…n；(b) FL-9… 续编 | **定案 (a) FCAP-1…n**——新文件新段先例（FL-1…8 / FEC-1…8）；FL-x 为 fl001_l1_oracle.py 专属证据链，续编混淆两文件 V-03 追溯面（FC Q8 同款理由） |
| Q6 | verify_golden DEFAULT_MODELS 是否追加 | (a) 追加 "fl001_cap"（步① 无参调用四 golden）；(b) 不追加、显式 per-model 调用 | **定案 (a) 追加 "fl001_cap"**——verify_golden.py:206 现值 ["fl001","fl001_l1","fc001_l1"] 实读核验，FC B-5 定案先例形态直接套用；步① label 滞后说明沿 V120 DEC-5 维持登记不修 |
| Q7 | golden Run 集 | (a) 镜像 fl001_v2 全集 4 Run 全 (on,on)；(b) 最小集 2 Run（healthy + sensor_drift） | **定案 (a) 镜像 4 Run 全 (on,on)**——新 id golden 镜像基线全集先例（FLTH v2 镜像 4 Run / FC Q6 镜像 5 Run）+ monitor 不变量判据面（FCAP-6）+ actuator 角点覆盖 |
| Q8 | 容差 tier | T-B（RK4 双实现方法等价）；T-A（不承诺——Riccati 面跨语言 bit-exact 无依据）；超限降 T-C + convergence | **定案 T-B + 降 T-C 双向预案**——T_bat 温度反馈 + β 非线性 ODE 无全局闭式（FLTH/FC 同制）；gate 键面终值 emit 复算冻结（×≥10 冻结制——B-4 归一） |
| Q9 | 方程 id 编号策略 | (a) 新编号 EQ-FLTH-10…12（子对象 equations 承载、既有 EQ-FLTH-1…9 文本零触碰）；(b) 沿用 EQ-FLTH-2/7/9 编号 + 轨域标注 | **定案 (a) 新编号 EQ-FLTH-10…12**——FC EQ-FCEC 新 id 集先例（新轨域新 id、避免同 id 双文本歧义）+ model_hash 五数组逐字节不动的承载面（子对象 equations 引新 id）；对应关系（EQ-FLTH-10 ≡ EQ-FLTH-2 修订等）在说明列显式登记 |
| Q10 | 新信号集与 gate 键面 | (a) 仅 E_cap_kWh 出信号（η_cap 由 E_cap 承载）；(b) E_cap_kWh + η_cap 双信号（无量纲单位面新增）；(c) 零新信号（SOC 数值面承载全部教学面） | **定案 (a) 仅 E_cap_kWh（onTrackOnly 门控）**——最小集（FLTH §1.2 R_int 不出信号先例同构）+ onTrackOnly 门控 + gate 键面缺口面最小（`_kWh` 分支随 FLCAP-G2b-03 显式硬项处置——A-4/B-1 定案）；(b) 需无量纲单位/gate 分支双新增、涟漪 +1 级 |
| Q11 | 组合拒绝规则落点 | (a) 双面（engine validate 枚举守卫 + scenario 守卫双落点——FC B-7 盖章双落点同构）；(b) 仅 engine validate；(c) 仅 scenario 守卫 | **定案 (a) 双落点（engine validate + scenario declaresCapacity）**——非法组合在场景解析与引擎配置两侧均结构化拒绝（MG-IMP-Q1 validate reject 纪律先例 + FC B-7 双落点先例）；单面落点留静默组合风险 |

**定案记录（2026-11-14，FLCAP-G2b-02 收口）**：Q1…Q11 全部按推荐项定案（批准授权 =
CHG-20261114-01 用户指令链「下一步」，GTL1-G2b-02 先例——MG-DRAFT-Q1…Q7/FC Q1…Q9 定案同款
体例）。定案落点：Q1 → §1.1/§6.3（键名 capacity_model）；Q2 → §1.3 EQ-FLTH-11（η_cap 冻结式
+ A-1 下限机制）+ §1.5；Q3 → §1.3 EQ-FLTH-12（稳定小根形态——A-3）+ §4 项 3；Q4 → §4 项 2；
Q5 → §4 项 4；Q6 → §4 项 8；Q7 → §4 项 5；Q8 → §4 项 7；Q9 → §1.3 编号；Q10 → §1.2/§2/
§4 项 7；Q11 → §8 FLCAP-G2b-04（双落点）。全部定案随本版冻结；实现轮（FLCAP-G2b-03/04）
不再重开（如实现中证明不可行，停下显式 CHG——V140 §0 条款）。

---

**文件结束**。修订记录：

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

**v1.0（2026-11-14，CHG-20261114-01，批准轮条件修订——FLCAP-G2b-02 收口，V140_WAVE_DESIGN §2 W1）**：
① **两裁定点定案落正文**——裁定点一「SOC 定义不动」重开采纳（候选 A：仅 capacity_model=on 域内
修订 EQ-FLTH-7 分母为 E_cap(T_bat)=η_cap·E_nom；域外原式逐字不动；P_bat=0.4·I 口径/守恒恒等式/
残差面零涟漪；无第二缺口项——§6.2 定案标注 + 新增 §6.2.1 定案原文 + §0 ③ 域外不动改写）；
裁定点二采组合键 `capacity_model: "off"|"on"`（前置 thermal_model=on、三元封闭路由——§1.1/§6.3
定案标注；A5 §2.2③ 原推荐枚举扩值的翻转偏离链经 V130 DEC-1 上游获准 + 本轮显式确认（§6.3
确认段——A-8/B-2））；② **15 条件全按推荐落正文**——A-1（§1.5 η_floor=0.5 下限机制 + §1.6
A-flcap-cap 冻结 + limitations ⑤ + §3.3 ⑥ + FCAP-8 域限定）；A-2（§1.4 SOC_err 行改写 +
checks 判据域核验段 + §1.6 A-flcap-soc + §3.2 healthy 锚点表 SOC_err 新增行与全表冻结值）；A-3
（§1.3 EQ-FLTH-12 稳定小根有理化形态冻结 + naive 仅展示 + §4 项 3）；A-4（§4 项 7/§9 R-6 gate
缺口按实测勘正——`_kWh` 非命中 `_kW` 支、实落 f_Hz_atol 兜底 KeyError，硬项维持）；A-5（β≥0/
k_cap≥0/η_floor>0 符号域入 §1.5/EQ-FLTH-10/FCAP-8）；A-6（§1.3 EQ-FLTH-12 ⟺ 措辞勘正 + h≤αI²R0
段补记）；A-7（§1.3 EQ-FLTH-11 /3600 位置写死）；A-8（§6.3 翻转确认段 + §10.1 批准行）；A-9
（§1.6 limitations ⑤ 有限时间发散 + §3.3 ⑧ + FCAP-8 注册域限定）；B-1（§4 项 7/§9 R-6 机制
描述订正——P1）；B-2（§6.3 偏离链确认 + §1.1 (b) 行 face③ 表述订正 + §3.3 ⓪ 域勘误）；B-3
（§1.2 补 sourceKind/exposure 列——E_cap_kWh = DERIVED → public_demo + signalCategories 'soc'
归属）；B-4（§4 项 4 FCAP-1 热面判据挂 FCAP-7 实测冻结制、电气/测量面 ±1e-9 维持）；B-5（§0 ①
「tools/oracle/** 全部零触碰」计数勘正）；B-6（§5 项 2 双波次拆注）；③ **四常量定案（域扫描
证据）**——β = 5×10⁻⁷ 1/K²、k_cap = 0.004 1/K、T_cap0 = 313.15 K、η_floor = 0.5（§1.5 定案表 +
§3.3 域扫描证据节八项：① 可见性 ΔT 角点 +0.416 K/healthy +5.3e-4 K、② 稳定性角点裕度
+1.0826 W/K@62.5 A + 全域 min Δ = 3.564453、③ T_cap0 裕度 3.196 K + 四 Run E_cap ≡ 40 位级、
④ 新界 46.4741 kW（下移 1.8101）+ 复扫、⑤ RK4 7.29e-5 ≪ 2.78、⑥ 激活阈 31.15 kW + 机制核验、
⑦ β=0 退化 0.0 ulp、⑧ A-9 发散演示——临时脚本 python -I、环境校验 fl001_v2 位级复刻、已删）；
④ **Q1…Q11 定案**（§11 定案记录——全采推荐：Q1=capacity_model/Q2=阈值线性+下限/Q3=闭式保留+
稳定小根/Q4=fl001_cap_oracle.py/Q5=FCAP-1…n/Q6=DEFAULT_MODELS 追加 "fl001_cap"/Q7=镜像 4 Run
全 (on,on)/Q8=T-B+降 T-C/Q9=EQ-FLTH-10…12 新编号/Q10=仅 E_cap_kWh onTrackOnly/Q11=组合守卫
双落点）；⑤ **EQ-FLTH-10…11…12 冻结文本**（§1.3——/3600 位置、SOC 名义+修正双累积器离散口径、
稳定小根形态、A-6 措辞；守恒面声明维持）；⑥ **§1.2 B-3 列、§3.2 锚点冻结值（T_bat(60)=
309.953757 K、SOC_true=59.583333333333336 位级、SOC_err≡0、E_cap≡40、P_loss/E_loss θ 级差异）、
§4 FCAP/gate/DEFAULT_MODELS 定案面、§5/§7（④⑤ 闭合）/§8/§9 同步**；⑦ **§10 更新**（10.1 用户
批准行 → 已闭合 + 10.2 升级「条件→处置→落点」15 项——处置于批准轮完成）；**§11 定案记录**；
⑧ 头部状态 `APPROVED v1.0` + 批准记录（CHG-20261114-01，GTL1-G2b-02 先例）+ 数值定案纪律行 +
关键复核点实读更新（engine.js :786-791 常量、systems.js :153/:278/:290/:284-285 域、
verify_golden.py :228-268 分派、checks.js 判据域）+ 修订记录本行 + 文尾状态行；文件由
FL001_CAPACITY_G2B_SPEC_DRAFT 更名 FL001_CAPACITY_G2B_SPEC_APPROVED（git mv）；行号基准说明
保留（起草时点口径不变，实现轮以语义锚点为准）。

**状态**：`APPROVED`（v1.0，2026-11-14，FLCAP-G2b-02 收口，CHG-20261114-01）。本批准不自动
打开验收路径——golden/代码工件按 §8 排期产出（FLCAP-G2b-03 oracle + fl001_v3 emit / FLCAP-G2b-04
实现入 v1.4.0，V140_WAVE_DESIGN）；v0.1 起草轮与 v1.0 批准轮均零代码/golden/oracle 触碰
（§0 不动清单维持）；§3.2/§3.3 数值为批准轮域扫描值（临时脚本 python -I 已按纪律删除），
emit 终值由 fl001_cap_oracle 复算冻结为准（§3.3 emit 硬条件维持）。

**文件结束**。FL001_CAPACITY_G2B_SPEC_APPROVED v1.0（2026-11-14，FLCAP-G2b-02 收口，批准记录
CHG-20261114-01；曾用名 FL001_CAPACITY_G2B_SPEC_DRAFT——A-5 P2 规格起草人起草 v0.1
（2026-11-13，CHG-20261113-04 授权起草），双路评审（V130 W2a/W2b，2026-11-13）时点状态 DRAFT
的历史记录见 §10）。**v1.0 修订**：15 条件与两裁定点裁定、四常量定案、Q1…Q11 定案落正文，
状态 `APPROVED`，FLCAP-G2b-01/02 闭合，FLCAP-G2b-03/04 入 v1.4.0。本规格批准不自动打开
验收路径；golden/代码工件仍按 §8 排期产出。
