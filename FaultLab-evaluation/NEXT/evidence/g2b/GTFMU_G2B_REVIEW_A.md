# GTFMU_G2B_REVIEW_A — GT-001 L1-FMU 规格草案独立评审 A（物理/数值面）

- **评审人身份**：独立评审 A——物理/数值面（V1120 波 W2a；与 W2b 治理/契约评审互不可见，独立形成结论）
- **评审日期**：2026-11-18
- **评审对象版本**：`GT001_FMU_G2B_SPEC_DRAFT.md` **DRAFT v0.1**（2026-11-18，560 行 wc -l 实测；起草授权 CHG-20261118-08）
- **评审性质**：只读审计 + 仅写本报告文件；未修改仓库任何其他文件
- **评审范围（七项）**：① EQ-GTFMU 冻结表草案转写保真与量纲（对照 GTL1 §2.2/§2.1 + GTCMB §1.3）；② Q1 控制积分器归属裁定草案的两案论证严密性（host h=0.01 子步驱动 doStep(n=1) 与 gt001_v3/v4 oracle 逐步对应性；候选 A 架构违反论证）；③ RK4 δt=0.01/Δt 承载与通信步语义自洽性（n=1 子步模式 vs fc001 n=10 模式）；④ 标称稳态点/锚点表独立复算；⑤ Run 矩阵/白名单与 gt001_v3/v4 golden 对齐性、t_clear 事件承载；⑥ parity 制度（R-GTFMU 沿 fc001 先例 1e-9 + ×≥10 冻结、-ffp-contract=off 纪律转写）；⑦ §11 Q1…Q12 独立意见。

## 实读文件清单（全部为评审期内直接打开核验，非转述）

| 文件 | 核验面 |
|---|---|
| `FaultLab-evaluation/NEXT/GT001_FMU_G2B_SPEC_DRAFT.md` | 评审主对象（全文 560 行） |
| `FaultLab-evaluation/NEXT/GTL1_G2B_SPEC_APPROVED.md` | 上游权威文本（EQ-GTL1-1…12/§2.1 常量/§2.3 更新序/§3.1 设计点/§3.3.1 域扫描，全文） |
| `FaultLab-evaluation/NEXT/GT001_COMBUSTION_G2B_SPEC_APPROVED.md` | comb 深化轨权威文本（EQ-GTL2 冻结表/τ_comb=0.5/§3.3（三）两口径表/Q1…Q13 定案，全文 713 行） |
| `FaultLab-evaluation/NEXT/evidence/g2b/FCFMU_G2B_REVIEW_B.md` | 报告体例模板（结构对照基准，全文） |
| `tools/oracle/gt001_l1_oracle.py`（全文 932 行） | gt001_v3 权威：常量 :122-158（K_F :145/MDOT_A :146/C_3 :147/MDOT_G0 :148）、SERIES_IDS :178-188、RUNS :191-210、chain_algebra :231-256、_simulate_core 分区更新序 :262-438（子步冻结 :350-363、记账 :366-376、record 面 :313-348）、GL-1…8 :522-720、TOLERANCES :748-762、事件编码 :450-515 |
| `tools/oracle/gt001_comb_oracle.py`（全文 1417 行节读） | gt001_v4 权威：TAU_COMB :173、SERIES_IDS :215-225、RUNS :228-247、chain_algebra 三维 :268-298、_simulate_core :345-559（x_comb 初值 :398、q_f 冻结 :458、dl_left_rect :488）、GCMB-4 快照比对面 :910-925、TOLERANCES :1223-1237、包络冻结界 :1246-1253、GCMB-1 只读交叉声明 :16-17/:1205-1207 |
| `tools/backend/fmu/fc001_l1.c`（全文 344 行 wc -l） | 三层夹心先例：I-3 硬边界头注 :5-9、构建命令钉死 :19-21（-ffp-contract=off -fno-fast-math）、输入 ZOH 语义 :73、doStep n=round(step/DT_INT) :208、GetReal 逐次重算代数链 :171-200 |
| `tools/backend/fmu/modelDescription.xml`（99 行） | FMI 2.0 CS 形制先例：canHandleVariableCommunicationStepSize="false" :16、DefaultExperiment stepSize="0.1" :25 |
| `tools/backend/py/fmu_runner.py`（头部 :1-40 + grep 定位） | D-27 关闭 :5/:382-385、FC_FMU_SHA256_PINNED :136、run_fc001_shell :183、run_hash 零墙钟 :302-309 |
| `tools/oracle/fc001_fmu_parity.py`（全文 147 行） | R-G9-02 parity 先例：PARITY_RTLIM=1e-9 :31、exit 3 SKIP :64-72、×≥10 冻结记录 :135-139 |
| `tools/oracle/fc001_fmu_oracle.py` | 687 行 wc -l 实测（镜像模式先例行数核对） |
| `scripts/verify_golden.py`（:100-459 节读） | MODELS 表（gt001 :222-238/gt001_comb :239-249+/fc001_fmu :199-221）、DEFAULT_MODELS :311 六成员、KEY_POINTS :313、series_limit T-B 分派链 :333-418（_A :345/_Hz :347/_rpm :349/_K :351/_kPa :353/_mL :364/r_true :366/r_meas :368/_kW :370/SOC :372/_pct :374/_V :382/_kWh :392/dim :402/兜底 :405）、metric_within :421-449 |
| `tools/run-g2.mjs`（:1-10/:95-145） | :4「36 步全量」现值、STEPS :102 起 36 条目、第 36 步 fc001 parity（extended tier + skipFmu SKIP 语义） |
| `tools/copy-guard.mjs`（:15/:30-37） | SCOPES=['src'] :15、BANNED 含「FMU 结果」:37 |
| `tests/teaching.test.js` :264 | BANNED.length===43 镜像断言 |
| `tools/backend/py/fmu_admission.py`（:8-16/:30-31） | A-1…A-5 准入面、A-4 CHG-20261118-01 ④ 例外文本、PLATFORM_DIRS 五平台 |
| `src/core/plants/fc001-fmu-adapter.js`（:1-13/:23/:27/:64/:128） | 外层 adapter 先例：轨锚定校验三面（golden_id :23/model_provenance :27/model_id :64）、预烘焙兜底 :6/:128 |
| `tools/backend/py/bridge.py`（grep 定位 :6-10/:116-127） | 127.0.0.1 回环 + Origin 白名单 + token 安全边界 |
| `data/golden/` 目录 ls + gt001_v3/gt001_v4/fc001_fmu_v1 逐文件 python -I 读取 | 14 golden 实存（gt001_v1…v4/fc001_v1/v2/fc001_fmu_v1/fl001_v1-v3/mg001_v1/pv001_v1/wt001_v1）；gt001_v3 gate 十键/tier=T-B/27 列/6 Run；gt001_v3↔v4 healthy 位级 0.0 交叉实测；fc001_fmu_v1 元数据先例（model_id='fc.pem.fmu_l1'/model_version='1.0.0'/model_provenance 顶层+run 级双落位/supersedes=null/backend=null） |
| `data/fmu/` ls -l | fc001_l1_v1.fmu 18117 字节实读 |
| `docs/CONTRACT.md` :391 | 「时间数组严格 601 点」冻结面 |
| `FaultLab-evaluation/NEXT/V07_ROADMAP.md`（:21/:44-50/:77-78） | I-8 原文、A-6 行（「EQ-GTL1-1..12/EQ-GTL2 域……GTFMU-x 自检」原文）/A-7 行/A-8 行、v1.11.x/v1.12.0 波行 |
| `FaultLab-evaluation/NEXT/V1120_WAVE_DESIGN.md` :5 | CHG-20261118-08 授权记录 |
| `FaultLab-evaluation/DECISIONS/DECISIONS.md`（:1856-1858） | CHG-20261118-08 台账行 |

**实跑命令（摘录）**：`python -I` 独立复算三组——(a) 设计点/派生常量（ṁ_g0 = ṁ_a+k_f·25/LHV、C_3 = τ_3·ṁ_g0·cp_g、x_comb(0)=k_f·25、π_c/p2/T2/π_t/T4/P_comp/P_turb/P_gen/平衡残差/η_cycle 全链）；(b) 三点稳态角点二分求根（sensor f=49.7 的 u_ss、u=40 钳位角点、actuator 钳位角点）；(c) golden 结构读取（gt001_v3/v4 全 Run 27 列互差、fc001_fmu_v1 元数据、inertia_model 金级别均一性）；`wc -l` 四文件；`ls data/golden data/fmu`；`sed/grep` 锚点行核对（copy-guard/teaching.test/fmu_admission/bridge/adapter/V07/V1120/DECISIONS）。

---

## verdict

**`PASS_WITH_CONDITIONS(2)`** —— 物理/数值面主线断言经实读与独立复算全面相符（EQ-GTFMU-1…12 与 comb 修订式对 GTL1 §2.2/GTCMB §1.3 逐字转写零改动成立、量纲全链闭合；设计点与三点稳态角点独立复算逐值命中（残差 4.26e-14 ≈ 登记 4.3e-14、u_ss=19.65281249/f=49.999214979/f=49.719396217·P_gen=18.265509 全中）；Q1 推荐 (B) 的更新序逐步对应论证经 oracle :350-380 逐行对照成立，候选 (A) 的 I-3 违反论证以 fc001_l1.c:5-9 原文为锚成立；12 Run 白名单/事件编码/gate 路由/parity 制度转写逐项核实无误），但存在 2 项应修不一致（12 Run 计数在单 golden 入口口径与两 golden 结构间自相矛盾；GTFMU-5 镜像恒等交叉收窄至 healthy/monitor 使更新序转写保真失去唯一非循环守卫），须在批准轮（GTFMU-G2b-02）收口前按条件 A-1…A-2 修正后方可冻结。无 P1。

---

## 发现清单

### P1（阻断级）

**无**——未发现断言与实现不符的阻断项。全部载荷性数值断言（常量 15 位登记值、设计点表、稳态角点、动态锚点、Run 矩阵、事件编码、gate 路由、oracle 行号锚）经实读/实算/实读 golden 三路核验逐项命中。

### P2（应修）

**P2-1 §4 项 11 / §5 GTFMU-G2b-03 / §2.1 Run 集把「12 Run」计到 gt001_fmu 单 golden 入口，与 §4 项 1/9/12 的两 golden 结构（gt001_fmu_v1 = thermo 镜像 6 Run + gt001_fmu_comb_v1 = comb 镜像 6 Run）自相矛盾；若按现文冻结，批准文本将内嵌一个不可执行的验收计数。**

- 草案原文三处：
  - §4 项 11（:418）：「`python scripts/verify_golden.py gt001_fmu`（**12 Run 全过**——Q2(b) 下 6 Run……）」；
  - §5 GTFMU-G2b-03（:485）：「gt001_fmu_v1 emit（**12 Run**（Q2(b) 下 6）、schema v2……；Q2(a) 另含 gt001_fmu_comb_v1 emit）」；
  - §2.1 Run 集（:296-298）：「**FMU golden Run 集** = 镜像基线全集——thermo 镜像轨 6 Run……+ comb 镜像轨 6 Run……= **12 Run 全集**（Q2(a) 承载；Q2(b) 下缩为 6 Run）」。
- 与草案自身结构的矛盾（实读）：§4 项 1（:408）「golden_id = gt001_fmu_v1……**Q2(a) 另含 golden_id = gt001_fmu_comb_v1**（同判据）」+ §4 项 9（:416）「MODELS["gt001_fmu"] 注册行（golden_file="gt001_fmu_v1.json"……）+ Q2(a) 另含 MODELS["gt001_fmu_comb"]（同构）」+ §4 项 12（:419）「新增 data/golden/gt001_fmu_v1.json(+.sha256)（Q2(a) 另含 gt001_fmu_comb_v1）」——Q2(a) 定形为**两 golden 各 6 Run**；且 §4 项 6 元数据行（:413）「inertia_model="thermo"（镜像轨……；comb 组="thermo_comb"）」只有在新 golden 单文件单 inertia_model 时才可成立。
- 上游惯例佐证（实读 golden）：gt001_v3.json 全部 6 Run 的 run 级 inertia_model 均一为 "thermo"（oracle :794/:812 硬编码）、gt001_v4.json 均一为 "thermo_comb"——单 golden 混装 thermo+thermo_comb 各 6 Run 将破坏该金级别均一惯例，无先例承载。
- 影响面：实现轮若按项 11 字面执行，`verify_golden.py gt001_fmu` 入口只有 6 Run，「12 Run 全过」不可满足；反之若实现按「单 golden 12 Run」执行，则与项 1/9/12 两 golden 结构及元数据行冲突。三处口径必须在冻结前统一。
- 落点：条件 A-1。

**P2-2 §4 项 5 GTFMU-5 镜像恒等交叉收窄至 healthy/monitor 两局，使 gt001_fmu_oracle 的「FMU+host 全系统更新序镜像」保真失去唯一非循环守卫——在 Q1(B) 自身「逐步精确对应」主张下，故障局同断言既可行又必要。**

- 草案原文：§4 项 5 GTFMU-5（:412）：「GTFMU-5 镜像恒等（**healthy/monitor** 与 gt001_v3 只读交叉 ±1e-9 内逐点恒定（GCMB-1 只读环境校验先例同构……）；comb 组与 gt001_v4 同构）」；§1.5 (B) 行（:244）：「（host 子步循环 + 内核单子步 = oracle 分区结构逐步对应——**healthy/monitor 恒等结构判据**全链沿用，§4 项 5）」。
- 先例对照（实读）：GCMB-1 先例的交叉面是**全 6 Run 全序列**——gt001_comb_oracle.py:16-17（「data/golden/gt001_v3.json 在 GCMB-1 中只读读取作 thermo 退化交叉参照」）+ :1205-1207 实测记录（「GCMB-1 双 oracle 退化交叉……**6 Run x 27 列 x 601 点 = 97495 值** + 标量 + 指标）：worst|diff| = **0.0**」。
- 守卫缺口分析（评审独立论证）：
  - healthy/monitor 是解析不动点（f≡50/T3≡1173——GL-3/GCMB-6），对更新序转写错误**不敏感**（u 不动、dx/dt≡0 结构下多种错误更新序同样给出恒等轨）；
  - GTFMU-4 锚点全表复算的对象是「§3.1/§3.3 **emit 冻结值**」（:412）——emit 值出自 gt001_fmu_oracle 本身，对该 oracle 更新序转写保真为**循环校验**（§3.3 上行「上游登记值结构对照」仅在显示位精度 ~5e-3 级、且非 GTFMU-4 判据对象）；
  - C-Python parity（项 7/Q6）的 Python 参照面 = 同一 gt001_fmu_oracle——它守卫 C 内核 vs oracle 一致，不守卫 oracle vs 权威轨（gt001_v3/v4）一致；
  - 因此故障局（closed_loop_fault/load_step/actuator_fault/actuator_clear——对更新序敏感的暂态面）与 gt001_v3/v4 冻结 golden 的逐点交叉，是整个链条中**唯一非循环**的更新序转写保真守卫；现草案把它排除在 GTFMU-5 之外。
- 可行性：Q1(B) 下 FMU+host 复合更新序与 gt001_l1_oracle/gt001_comb_oracle 分区结构逐步同构（本评审 §1.5 逐行对照确认），两 Python 实现同常量同运算序的交叉与 GCMB-1 同形态——±1e-9 断言与上游 A-2 措辞口径一致、无超限风险理由；只读文件交叉不触碰 V-03 冻结面（gt001_comb_oracle.py:16-17 先例）。
- 落点：条件 A-2（扩展为全 6 Run × 双组交叉，或在草案显式登记收窄理由——二选一，不静默）。

### P3（建议）

**P3-1 §1.5 (B) 的 host 子步循环未钉死 record 面语义——输出行 u_eff 由提交态 u + cap_active(t_k) 重算（oracle :317），与相邻子步面的 u_eff 在事件行（t=20.0/t=35.0）原理性不同，run_gt001_shell 仅按 §1.5 序列实现将在快照行欠规格。**

- 实读证据：oracle :317 `u_eff = min(u, u_cap) if cap_active(time) else u    # record 域 u_eff（§2.3）`——record 域 u_eff 用**提交态 u**（= 上一区间末子步 u_next）在**输出时刻 t_k** 重评 cap_active；与末子步 al_b 面（cap_active(t_k−0.01)）在 cap_active 翻转行不相等：actuator 局 t=20.0 行 record 面 = min(25,20)=20（钳位生效）而 19.99 末子步面 = 25（未钳）；t=35.0 行 record 面 = 提交态 u（解除钳位）而 34.99 末子步面 = min(u,u_cap)=20。golden 第 200/350 行的 Q_fuel_kW/eta_cycle_pct/valve_meas_pct 等列按 record 面取值——写错即 golden 失真且 EV 快照（快照变量 = 采样行，§2.3）连带失真。
- 草案现状：§1.5 (B) 序列只列「读子步起点代数值（k1 面）→ doStep → 读子步终点代数值（al_b 面）→ 记账累计」；§1.1 中层职责列举「测量列」未点名 record 面重算规则；oracle record 块 :313-348（含 :337-338 valve 列）与子步时钟闭式 :352 `time = (k-1)*sub*h + j*h` 均未进入草案引用面（现引 :350-363/:366-376/:461-514）。
- 建议：GTFMU-G2b-04 run_gt001_shell 工作面（§8）与 §1.5 (B) 行补钉「record 面 = oracle :313-348 逐条复刻（u_eff(t_k) 由提交态 u + cap_active(t_k) 重算；事件行需以 record 口径输入重取一次代数面）」，并把子步时钟闭式纳入同运算序清单。

**P3-2 §1.4 常量表把 Ki 的单位注为「−」——EQ-GTL1-9 量纲闭合要求 kW_eq/(Hz·s)（oracle :141 注记明示），建议按 oracle 注记补全（单位注记面，非值改动）。**

- 实读证据：草案 :220 单位列「kW·s/Hz / Hz / **−** / kW/Hz / kW」；oracle :141 `KI = 2.0  # 调速器积分增益（kW_eq/(Hz*s)）`；量纲链 Ki·(50−f_gov)·h = kW_eq/(Hz·s)·Hz·s = kW_eq（与钳位域 [0,40] kW_eq 一致）。上游 GTL1 §2.1 该格本就未注单位——建议本草案作为 FMU 化新增结构面补全注记（kW_eq/(Hz·s)），与其新增的「单位」列自洽。

**P3-3 §1.4/§3.1 引「oracle :156-158 实读」承载 LOAD0/SOC0/V_bus/CAP 四值——CAP_KWH 实定义于 oracle :144，:156-158 仅覆盖 LOAD0_KW/SOC0_PCT/V_BUS 三值；按草案自定行号基准纪律补注。**

- 实读证据：oracle :144 `CAP_KWH = 40.0`、:156-158 LOAD0_KW/SOC0_PCT/V_BUS。数值四值本身无误（30.0/60.0/400.0/40.0 逐值命中），纯锚点精度面。

**P3-4 §4 项 5 GTFMU-7 未显式点名 sensor_drift mag=1.0 角点 emit 硬条件（GL-8/GCMB-8 均以具名硬条件内嵌 min f > 49.0 断言）——「GL-8/GCMB-8 先例同构」的概括性援引建议改为显式登记。**

- 实读证据：gt001_l1_oracle.py :707-712（「A-2 emit 硬条件：sensor_drift mag=1.0 暂态最小 f……`ok8 = ok8 and min_f_10 > 49.0`」）+ GTL1 §3.3.1/§11-a A-2「越界即 emit 拒绝写盘」+ GTCMB §4 项 4 GCMB-8「mag=1.0 角点 min f > 49.0 断言……内嵌」。FMU 镜像轨 emit 同属新 golden emit 面，域扫描冻结硬条件应同款显式内嵌（角点值沿袭 49.002004/49.000360 双轨登记值，FMU 轨 emit 复算为准）。

**P3-5 §9 R-3 的调用开销量级预估只计 doStep（6000/Run）——Q1(B) 序列每子步约 6 次 ctypes 往返（读状态 f + 设 u_eff + 设 demand + 读 k1 面 + doStep + 读 al_b 面）≈ 3.6e4 次/Run、12 Run ≈ 4.3e5 次，风险登记量级建议如实化。**

- 实读证据：§1.5 (B) 行序列（:244）含 6 类调用；fc001 先例 run_fc001_shell 为 Δt=0.1 单 doStep + 通信步级读设（600/Run）。R-3 已含「实现轮实测登记」缓解项，本条仅建议把预判量级从「×10」修正为「×10（doStep）且总往返 ×60」量级，避免 emit 轮实测对照失准。

---

## 条件清单（A-1…A-2——批准轮 GTFMU-G2b-02 收口前落正文）

**A-1 统一「12 Run」计数口径为两 golden 结构（对应 P2-1）**
- 条件：① §4 项 11 验收命令改为「`python scripts/verify_golden.py gt001_fmu`（6 Run 全过）+ Q2(a) 另含 `python scripts/verify_golden.py gt001_fmu_comb`（6 Run 全过）——轨合计 12 Run」；② §5 GTFMU-G2b-03 行改为「gt001_fmu_v1 emit（6 Run……）+ Q2(a) 另含 gt001_fmu_comb_v1 emit（6 Run）」；③ §2.1 Run 集段改述为「FMU 轨 Run 白名单 = 两 golden 各镜像基线全集 6 Run（金级 inertia_model 均一惯例沿 gt001_v3/v4 实读）——轨合计 12 Run」。若批准轮实际意图为单 golden 12 Run 混装，则须反向改 §4 项 1/9/12/项 6 并新立金级混装惯例先例——两结构二选一，全文名点同步，不静默。
- 为什么：P2-1 所述三处与三处矛盾；验收计数是 emit 轮的硬预期面，冻结文本内嵌不可执行计数将直接传导为实现轮验收歧义。
- 落点建议：§2.1/§4 项 11/§5（如采两 golden 结构，三处改述即可；§4 项 1/9/12/项 6 不动）。

**A-2 GTFMU-5 镜像恒等交叉扩展为全 6 Run × 双组（或显式登记收窄理由）（对应 P2-2）**
- 条件：§4 项 5 GTFMU-5 改为「**全 6 Run 全序列**与 gt001_v3.json 只读交叉 ±1e-9 内逐点恒定（thermo 镜像组）/与 gt001_v4.json 只读交叉（comb 镜像组）——GCMB-1 全 Run 97495 值 worst|diff|=0.0 先例同构（只读文件交叉不触碰 V-03）」；或保持 healthy/monitor 收窄并在草案登记收窄理由与故障局更新序保真的替代守卫（现无——GTFMU-4 循环、parity 参照同源，见 P2-2 分析）。建议前者（判据词「±1e-9 内逐点恒定」与上游 A-2 口径一致，无新增承诺面）。
- 为什么：故障局交叉是 gt001_fmu_oracle 更新序转写保真的唯一非循环守卫；healthy/monitor 不动点对更新序错误不敏感，现 GTFMU-5 面在故障局存在静默失真通道。
- 落点建议：§4 项 5 GTFMU-5 行（同步复核 §1.5 (B) 行「healthy/monitor 恒等结构判据全链沿用」句的指称范围）。

---

## Q 点独立意见表（Q1…Q12 逐条——独立形成，未参照评审 B 结论）

| Q | 草案推荐 | 评审 A 意见 | 依据（实读） |
|---|---|---|---|
| Q1（控制积分器 u 层归属——核心裁定） | (B) u 归 host（host 以 h=0.01 子步粒度驱动 doStep n=1）+ ZOH 降级变体排除 | **同意推荐 (B)**，论证严密成立。① 两案对照的判别面选择正确：(A)/(B) 均可达 parity（草案如实承认——更新序在 (A) 下内核内 ①②③ 同构复刻），故判据落在 I-3 架构而非数值，与 fc001_l1.c:5-9 硬边界原文（「传感污染/控制反馈/……全部归 host——内核内嵌任何壳职责 = 违反架构」实读）逐字对位——GT 调速器 EQ-GTL1-9 就是「控制反馈」本面，(A) 无解释空间；② (B) 的更新序逐步对应性经实读成立：oracle :350-380 每子步序（b/demand 冻结 → f_gov → u_next → u_eff → k1..k4 → al_b → 记账 → 提交 u）与草案 (B) host 序列（读 f → 控制律 → 设输入 → 读 k1 面 → doStep(0.01) → 读 al_b 面 → 记账）一一对应，且 GetReal 无历史态（fc001_l1.c :171-200 逐次重算代数链）保证 k1/al_b 两面无别名污染；③ (B) 的关键架构优点草案已点中：b_Hz/monitor/u_cap/激活窗全部不进内核——内核输入面恰为 demand_kW/u_eff_kW 两个，b 的「测量层↔控制层双域渗透」被结构性切断；④ ZOH 降级变体排除正确：调速器积分步幅 0.1≠0.01 是离散语义实质变更（Ki·(50−f_gov)·h 步幅 10 倍），与 gt001_v3/v4 镜像恒等不可兼得，草案「非映射差异而是物理转写偏离」定性准确。**附条件指向**：P2-2（GTFMU-5 全 Run 交叉）与 P3-1（record 面钉死）是 (B) 成立的收尾要件，随条件清单落正文 | oracle :350-380/:313-348/:366-376 逐行实读；fc001_l1.c:5-9/:73/:208；GTL1 §2.3 冻结骨架 |
| Q2（模型变体面） | (a) thermo 基准 + comb 深化双轨并列 | **同意推荐 (a)**——V07_ROADMAP A-6 行原文实读「热力链内核（**EQ-GTL1-1..12/EQ-GTL2 域**，gt001_v3/v4 oracle 为 Python 侧权威）」双轨域面逐字点名；comb 内核增量 = 单态（x_comb）+ 单 RHS 项（EQ-GTL2-3/4，gt001_comb_oracle :293-294 实读形态）；**附**：双轨并列的 Run/验收计数口径须先按条件 A-1 统一（P2-1） | V07_ROADMAP A-6 行；gt001_comb_oracle.py:268-298；GTCMB §1.3 |
| Q3（model_id/model_version/包命名） | gt.sync.fmu_l1 + '1.0.0' | **同意推荐**——fc001_fmu_v1.json 实读先例（model_id='fc.pem.fmu_l1'/model_version='1.0.0'）；「gt.sync.fmu_l1」不撞引擎 SystemDef id「GT-001」；句式同构（域.物理面.轨）自洽。注：fmu_admission.py A-3 字面为 FC 语境措辞（「禁借用 FL-001 目录清单」:12 实读），草案「A-3 禁借用既有系统 id」为意图化转读——语义成立， literal 差异归治理路面核对 | fc001_fmu_v1.json 元数据实读；fmu_admission.py:12 |
| Q4（golden id + oracle 命名） | gt001_fmu_v1 + gt001_fmu_oracle.py（单文件双 Run 组） | **同意推荐**——`ls data/golden/` 实读 14 golden 无 gt001_fmu_* 前缀，命名空间不撞；supersedes=null 并列轨沿 fc001_fmu_v1（supersedes=None 实读）；单 oracle 双 Run 组沿 gt001_l1_oracle 单文件承载单轨的体例扩展。**附**：「双 Run 组」与 P2-1 的两 golden 结构需在 Q4 表述里与 Q2(a) 联动对齐（单 oracle 文件可同时服务两 golden 的 build——fc001_fmu_oracle 单文件单 golden 形态的自然扩展） | data/golden ls；fc001_fmu_v1.json；oracle_base 机制 |
| Q5（Run 白名单范围） | (a) 12 Run 全集 | **同意 (a) 的轨级范围、附口径修正**——两轨 oracle RUNS 实读各 6 Run 逐字（key/role/feedback_mode/family/magnitude/unit/t_clear_s 全同），镜像全集先例（GTL1 §4 项 4/GTCMB §4 项 5）成立；但「12 Run」是**轨合计**（6+6 两 golden），草案三处把 12 记到单 golden 入口——按条件 A-1 统一（P2-1） | gt001_l1_oracle.py:191-210；gt001_comb_oracle.py:228-247；golden 实读 |
| Q6（parity 制度沿用） | (a) fc001_fmu_parity.py 同构独立机检 | **同意推荐 (a)**——fc001_fmu_parity.py 实读全链对位：PARITY_RTLIM=1e-9 :31（「规模相对误差 ≤1e-9——非位级承诺」）、exit 3 SKIP 双缺位分支 :64-72、gate_freeze_record「实测散差 × 安全系数 >=10」:135-139；草案 Q6/§4 项 7/项 11 的判据句式转写零失真；verify_golden（Python-Python T-B 链）与 parity（C↔Python 独立机检）分工正确。R-1 的 pow 散差主源判断成立：fc001 derivs 全线性零 pow（fc001_l1.c:100-108 实读）故实测 0.0，GT 链每子步 4 次 RHS × 2 个 pow（π_c^a_c/π_t^(−a_t)）为真实新增散差面——×≥10 冻结制 + 超限停下显式 CHG 的双向预案是对的制度承载 | fc001_fmu_parity.py:31/:64-72/:135-139；fc001_l1.c:100-108；draft R-1 |
| Q7（平台矩阵） | (a) 批准轮同轮裁定 + win64 先行 | **同意推荐**——V07 A-7 行实读「随 A-6 裁定……重钉须 CHG」同轮面已预登记；-ffp-contract=off -fno-fast-math 构建钉死句式沿 fc001_l1.c:19-21 实读；对 GT 链该纪律比 fc001 更载荷（pow 密度——见 Q6/R-1），禁 FMA 收缩是 parity 制度的组成部分而非可选优化 | fc001_l1.c:19-21；V07_ROADMAP A-7 行 |
| Q8（provenance 档位） | (a) 复用 fmu_l1_lumped_unvalidated | **有条件同意 (a)**——fc001_fmu_v1.json 实读顶层 + run 级双落位在案（model_provenance='fmu_l1_lumped_unvalidated' 两处实读），GT FMU 轨物理同为「数值集总未经实验/硬件验证」档、语义同档复用无失真；**条件**：fmu_admission.py A-4 例外文本现为 FC 专名（「已批 FC-001 FMU 轨 manifest provenance = fmu_l1_lumped_unvalidated」:14-15 实读，admit() 未机检 provenance）——GT 复用时批准 CHG 应同步扩 A-4 注记点名（或登记「docstring 专名扩名」为零机检面改动），避免「例外文本只名 FC、实现放行 GT」的静默漂移（FC 评审 B P3-6 同款面沿袭） | fc001_fmu_v1.json；fmu_admission.py:12-15 |
| Q9（DEFAULT_MODELS 追加） | (a) 尾追加 gt001_fmu（+gt001_fmu_comb） | **同意推荐 (a)**——verify_golden.py:311 现值六成员实读（["fl001","fl001_l1","fc001_l1","fl001_cap","gt001_comb","fc001_fmu"]）；尾追加先例（:300-310 注记链 v1.4.0 四 golden → v1.6.0 五 → v1.9.0 六）成立；「步① 无参调用 7/8 golden」计数与两 golden 结构一致（本条无 P2-1 矛盾——该条已按两入口表述） | verify_golden.py:300-311 |
| Q10（run-g2 步账 + parity 步形态） | (a) 新增独立 gt001_fmu_parity 步（第 37 步） | **同意推荐 (a)**——run-g2.mjs:4「36 步全量」实读 + 第 36 步 fc001 parity 条目实读（extended tier + skipFmu SKIP 语义 + skipReason 结构化）；I-9「伴生工具一律独立成文」原文直指 (a)；(b) 通用化改既有步的步语义变更张力评估准确；SKIP 语义显式化沿 V312 §9⑥ 先例 | run-g2.mjs:4/:102-138；fc001_fmu_parity.py exit 3 |
| Q11（oracle 自检段名） | (a) GTFMU-1…n | **同意推荐 (a)**——V07 A-6 行原文实读点名「**GTFMU-x 自检**」（非开放裁定面）；(c) FMU-1…n 复用与 fc001_fmu_oracle 的 FMU-x 段跨文件同名混淆理由成立（V-04 报告/审计追溯面） | V07_ROADMAP A-6 行原文 |
| Q12（FMU 轨选择键面） | (a) plant adapter 层绑定 | **同意推荐 (a)**——fc001-fmu-adapter.js 实读三面轨锚定校验在位（golden_id :23/model_provenance :27/model_id :64）+ 预烘焙兜底 :6/:128 + bridge 安全边界（bridge.py :6-10 回环/Origin/token 实读）；场景零新键 ⇒ B-1a 无触发面、涟漪最小；「实现证明需场景钉轨则停下显式 CHG」退出路径完备。**附结构性登记确认**：FMU 轨复用 inertia_model 既有值（thermo/thermo_comb）后，引擎轨单值四元 golden 映射被 (inertia_model + model_provenance + backend) 三元取代——草案 §1.7/§2.4 已如实登记该结构差异；run_hash 输入清单是否天然区分两轨（model_provenance/backend 是否在 runHashInput 内）为治理面核对项，评审 A 不预断 | fc001-fmu-adapter.js:6/:23/:27/:64/:128；bridge.py:6-10；draft §1.7/§2.4 |

---

## 独立性声明

1. 本评审仅以本报告头部「实读文件清单」所列仓库文件与实跑命令输出为输入；评审范围限定物理/数值面七项（EQ 转写保真与量纲/Q1 更新序等价性/数值方法与通信步语义/稳态与锚点独立复算/Run 矩阵与事件承载/parity 制度/Q 点意见）。
2. 草案 §10.1 中「评审人 B（治理/契约面）」回填行与 `FCFMU_G2B_REVIEW_B.md`（仅作**报告体例模板**打开，其 verdict/P/Q 结论内容未读取作为评审依据）**未被用于锚定本报告任何结论**；本报告全部 P/Q 结论由上列实读证据与独立复算得出。凡涉及治理/契约面的相邻问题（run_hash 输入清单、A-4 例外文本处置、白名单面）均显式标注「归治理路面」，不预断。
3. 数值复算全部以 `python -I`（stdlib、无第三方）独立实现方程链与二分求根完成，未调用任何仓库 oracle 函数；复算脚本未落仓库（命令行内联执行后即弃）。
4. 除本报告文件（`FaultLab-evaluation/NEXT/evidence/g2b/GTFMU_G2B_REVIEW_A.md`）外未写入/修改任何仓库文件。

---

**评审 A 签署**：独立评审 A（物理/数值面）· 2026-11-18 · verdict `PASS_WITH_CONDITIONS(2)`（P1=0 / P2=2 / P3=5；条件 A-1…A-2 见上）。

**文件结束**。
