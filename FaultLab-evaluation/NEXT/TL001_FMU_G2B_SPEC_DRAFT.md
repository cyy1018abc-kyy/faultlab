# TL001_FMU_G2B_SPEC_DRAFT — TL-001 跨系统联合（GT+TL 功角摇摆）G2b 物理规格草案（DRAFT v0.3）

> **状态**：`DRAFT v0.3（2026-11-22，重审轮条件落正文——v0.2 双重审 PASS-WITH-CONDITIONS(2)+(2)，条件 A2-1/A2-2/B2-1/B2-2 全落正文 + B2-3 台账注记；零实现承诺；批准留待用户）`。
> **任务**：V08_ROADMAP 主线 A **A-10 行**「TL-001 G2b 草案轮」——**跨系统联合 Run 首例**
> （方案 (A) TL 独立 SystemDef + GT 联合耦合面——TL001_CROSS_SYSTEM_RFC.md 已批准
> R-CS-01..04）。
> **授权**：CHG-20261120-01（DECISIONS.md:1936-1938 台账实读——① RFC 批准 R-CS-01..04：
> R-CS-01 方案 (A)/R-CS-02 = TL-b 物理域方程候选 TL-EQ-1..5「**G2b 草案轮定案细则**」/
> R-CS-03 排程 v1.17.0 实现轮/R-CS-04 联合 golden naming gt_tl_joint_v1 确认；② G2b 草案轮
> 授权 A-10（EQ-TL 冻结表草案 + Run 矩阵 + **键面** + **三层夹心** + Q 点全候选 → 双评审 →
> 用户批准 → 实现轮 A-11）；③ v1.17.0 实现轮预授权（A-11 oracle/golden/C99/parity/adapter
> 全链 + D-12 linux64——随批准 CHG 派发））。
> **物理权威**：GTL1_G2B_SPEC_APPROVED v1.0 §2（GT 侧物理唯一权威——EQ-GTL1-1..12 +
> §2.1 常量表 15 位有效数字 + §2.3 更新序骨架）+ TL001_CROSS_SYSTEM_RFC.md §3
> （RFC TL-EQ-1..5 原编号候选——本 v0.2 定案细则轮）。
> **体例**：GT001_FMU_G2B_SPEC_APPROVED v1.0 体例同构（589 行批准先例——联合 Run 语境
> 改写面逐处注记）；本 v0.2 章节结构与该体例同构（R-B-01 处置——v0.1 缺失的键面/三层夹心/
> 身份面/参数面/哈希面/事件面/比对面/锚点包络/红线自查/进入条件/工作面/风险/评审记录/
> 门禁序列结构位全部补齐）。
> **v0.2 重稿说明**：v0.1（2026-11-20，85 行）经双评审一致 `FAIL`——评审 A
> （`evidence/g2b/TLFMU_G2B_REVIEW_A.md`，R-A-01..10：BLOCKER 2/MAJOR 5/MINOR 2/INFO 1）+
> 评审 B（`evidence/g2b/TLFMU_G2B_REVIEW_B.md`，R-B-01..13：BLOCKER 2/MAJOR 6/MINOR 3/
> INFO 2）。处置路径 = A-10 轮内 v0.2 扩容重稿后重新双评审（评审 B「v0.2 重稿工作清单」
> 八项全数承接）。本 v0.2 为**纯文档面**——零代码、零 golden、零 oracle、零脚本改动
> （只写本文件）；所有物理方程/参数数值/gate 键名/分派链行为以实读文件为据
> （`scripts/verify_golden.py` / `tools/oracle/gt001_fmu_oracle.py` / `tools/backend/fmu/
> gt001_l1.c` / `data/golden/`——行号基准 2026-11-22 实读）。

## 上游 → v0.2 逐条处置映射表

| 上游 | 内容 | 本草案落点 | 转写/处置注记 |
|---|---|---|---|
| RFC §3 TL-EQ-1..5 | 方程候选原编号（R-CS-02 批准对象） | §1.3 | **同号同义**对齐（R-B-04）；v0.1 EQ-TL-3/4/5 同号异义废弃映射处置表随章 |
| RFC §3 参数候选 | X_line 0.5–1.0 p.u./M(H) 3–8 s/D 0.02–0.05/V_rated 400 V | §1.4 | 单转子形下 M 溶解（K_J 承载）、D 不启用（Q2）；其余落值 |
| RFC §4 golden 行 | gt_tl_joint_v1/27+3 列/T-B/pow ~2.5e-4 | §4 | 30 列与 RFC 预填对齐（v0.1 31 列偏差勘正——R-B-12③） |
| RFC §5 八面 | 逐面判定表 | §5 | 逐面落点章 + additive 声明（R-B-02） |
| RFC §7 Q1..Q7 | RFC 侧七问 | §12 | 承接表（Q1/Q2 已由 R-CS-01/04 定案；Q3/Q4 候选化承接；Q5 = 本 §1.3/§1.6；Q7 = §13 R-TLFMU-03） |
| GTL1 §2 | EQ-GTL1-1..12 + 常量表 + §2.3 更新序 | §1.3/§1.4/§1.5 | GT 侧逐字沿袭（值零改动）；唯一 GT 侧修订 = EQ-GTL1-7 新增出口项（§1.3） |
| GT001_FMU §1.5 Q1(B) | 控制积分器 u 归 host 定案 | §1.5 | 联合内核下逐字继承（对照 gt001_fmu_oracle.py/gt001_l1.c 实写——R-A-04） |
| 双评审 R-A-01..10 / R-B-01..13 | 23 条发现 | 全文 + 文末处置对照表 | 逐条处置（已落实/部分/转 Q 三态登记） |

---

## 0. 本规格边界（做/不做）

- **做（本 v0.2 = A-10 轮内重稿——纯文档面）**：TL-001 独立 SystemDef 定义（`TL-001`，
  model_id=`tl.transmission.l0`）+ 联合 RK4 冻结表草案（**单转子形**——[f,T3,δ] 三维联合
  RK4 首例；EQ 编号与 RFC TL-EQ-1..5 同号同义）+ 单位制与 TL 参数字典（全 SI + 基值表 +
  IC 表）+ host 调速器积分器与联合内核分区章（Q1(B) 继承）+ 键面章 + 三层夹心章 +
  Run 矩阵（8 Run 提案——含 TL 侧三相短路故障面 + GT 族镜像补全）+ joint_gt_standalone
  守卫章 + GT 27 列联合语义审计与 r_true 门重定义 + golden 计划（gt_tl_joint_v1——列
  schema/容差键/verify_golden 注册计划/parity 计划/oracle 出生接入/元数据面）+ 八面影响
  逐面承载 + 锚点与包络 + 红线自查（I-1…I-10 + copy-guard 预查）+ 进入条件 + 工作面 +
  风险 + 评审记录留空结构 + Q 点清单（§12 Q1..Q12 全候选 + 推荐）+ 用户裁定留白章；
- **不做**：TL-c 跨系统耦合扩展（远期）；TL-001 独立 golden（联合 golden 承载——gt_tl_*
  命名域核对 `ls data/golden/` 无撞名，2026-11-22 实读）；linux64 D-12 实施（**随 v1.17.0
  批准 CHG 与 A-11 同波派发——与本规格实现轮并行隔离**——措辞对齐 CHG-20261120-01 ③
  台账原文「随批准 CHG 派发」，R-B-10 处置）；C3（挂起维持）；TL **线路过载**故障族
  （RFC 面④ 候选之二——本规格不立项、显式缓做登记，R-B-09 处置；**三相短路立项**见
  §2.1/§2.5）；零实现（oracle/golden/C99/parity/adapter/引擎全部为 A-11 实现轮面——
  I-4 批准后才实现）。
- **现状基线（2026-11-22 实读登记）**：`data/golden/` 现值 **16 golden**（gt001_v1…v4、
  gt001_fmu_v1、gt001_fmu_comb_v1、fc001_v1/v2、fc001_fmu_v1、fl001_v1/v2/v3、mg001_v1/v2、
  pv001_v1、wt001_v1——各含 .sha256 sidecar）；verify_golden.py DEFAULT_MODELS 九成员
  （:375-376 实读）；GT 轨既有 golden 链（gt001_v3 thermo 默认轨/gt001_fmu_v1 FMU 镜像轨）
  全部冻结零触碰；联合 golden 为 **第 17 golden 目标态**（emit = A-11 实现轮）。

## §1 联合模型形态

### §1.1 三层夹心架构与认知分离（I-8 模式复刻——联合语境；R-B-01 必交付章之一）

保真原则（gt001_l1.c:5-10 头注口径逐字承接到联合语境）：在不把事件相位分裂逻辑/控制反馈/
记账复制进编译 C 二进制的前提下，维持 true/measured/derived 三层信号严格分离。联合轨三层
夹心（fc001/gt001 两先例同构；工件名均为提案——A-11 实现轮 Create/Update）：

| 层 | 工件（A-11 实现轮面） | 职责（认知分离边界——I-3） |
|---|---|---|
| **内层——联合纯物理内核** | `tools/backend/fmu/gt_tl_joint_l1.c`（提案命名）+ modelDescription.xml：C99 标准、零外部依赖；内联固定步长经典 RK4 积分联合物理微分态 **y = [f, T3, δ]**（内部子步 δt=0.01 s）；**只暴露 input 变量（demand_kW / u_eff_kW / p_elec_scale——§2.5）与 true 物理状态/代数输出（含 delta_rad/P_elec_kW/omega_rad_s——VR 编号实现轮钉死）** | 调速器积分 EQ-GTL1-9/10（控制反馈层）/传感污染 b/测量列/事件 pre-post 左极限分裂/能量记账**全部归 host**（Q4 推荐——§1.5）；P_elec(δ) 为内核 RHS 内代数（逐 stage 现算——非子步冻结，结构差异 §1.5 显式登记）；b/monitor 标志永不入内核 |
| **中层——Python host 与联合 oracle** | `tools/oracle/gt_tl_joint_oracle.py`（提案命名——§4 项 2）+ fmu_runner 联合 shell（提案 run_gt_tl_joint_shell——A-11 面）：承载**控制反馈**（EQ-GTL1-9/10 host 侧子步推进）/传感污染/能量记账（GT 冻结口径子步复刻）/事件分裂（EV 面——§2.5）/**线路状态事件域**（p_elec_scale 子步设置）；run_hash = Run 内容规范 JSON SHA-256（零墙钟） | 联合 oracle 独立性声明（§4 项 2）：不 import src/**、不 import 任何既有 oracle（仅 oracle_base 机制层）；oracle 镜像面 = **联合全系统更新序**（host 控制粒度/事件分裂/记账全镜像——gt001_fmu_oracle 先例模式） |
| **外层——引擎联合 dispatch 与教学面** | 引擎 `simulateJoint` 联合分派面（R-CS-01 已批——RFC §2 方案 (A) 原文「GT RK4 → TL 代数面 → 交互变量逐子步交换」的更新序落地 = §1.3 冻结表 + §1.5 分区）+ TL-001 SystemDef + adapter/bridge 教学接线（A-11 面） | config.systems = ["GT-001","TL-001"] 联合配置（§1.7 键面）；file:// 离线模式静态预烘焙兜底沿袭（前端零依赖维持——I-1） |

**联合 golden 生成链（I-8 五段）**：oracle（`gt_tl_joint_oracle.py`）→ golden（`gt_tl_joint_v1.json`
+ sidecar）→ C99 联合内核（`gt_tl_joint_l1.c`）→ parity（`gt_tl_joint_parity.py`——§4 项 7）→
adapter/bridge（教学面）——全链为 A-11 实现轮工作面（§9）；本草案只冻结方程/参数/更新序/
Run 白名单/容差键面/自检与 parity 制度（零实现承诺）。

### §1.2 工件与模型身份面（R-B-11 处置——身份惯例归属 + V312 关系 + scope + l0 注记）

- **命名同构性**：`gt.sync.l0`（GT-001 SystemDef model_id，systems.js:977）→
  `gt.sync.fmu_l1`（FMU 镜像轨 golden 自述 id，gt001_fmu_v1 实读）→ **`gt.sync.tl.l0`**
  （联合轨——sync=GT 同步机机械接口面 + tl=输电线路面）为同族点分命名，**非撞名**
  （与 SystemDef id「GT-001」/engine 轨 golden model_id「GT-001」惯例均不同域）；golden_id
  `gt_tl_joint_v1` 落实 R-CS-04（用户已确认——CHG-20261120-01 ①）。
- **golden.model_id 惯例归属（声明）**：现行两惯例 = engine 轨 golden.model_id = systemId
  （"GT-001"/"MG-001"/"FL-001"——gt001_v3/mg001_v2/fl001_v3 实读）与 FMU 轨 = 自述点分 id
  （fc.pem.fmu_l1/gt.sync.fmu_l1——V312 A-3 自述口径）；联合轨为**第三形态：非 FMU 的联合轨
  自述点分 id**——本轨无 FMU 工件、fmu_admission.py 八字段机检面**不适用**（如实登记：
  准入承载 = golden 层面 verify_golden V-01…V-09 全链 + §4 项 2 oracle 独立性声明 +
  approval 三字段首签；无 V312 B-4 钉 hash 面——零 FMU 包）；model_id 定案 = Q12。
- **scope 归属（登记）**：scope.js modelId 门禁为单 systemId 精确匹配形态（:19/:44/:54/:73
  ——评审 B 实读）；联合 Run 归 **extension_preview 档推定**（新轨未入 approved 白名单——
  scope.js:16-17 无 TL 分支实读口径沿袭；联合 dispatch 面实现轮显式登记，不静默）。
- **level「l0」层级语义注记**：联合轨标 `l0` 指**新增 TL 面的深度档**（输电线路 = L0
  代数-一阶受驱面——TL-EQ-1/3/5 无独立转子态），**非联合整体深度**——GT 侧物理为 GTL1
  **L1** 热力链（K_J 转子 + T3 燃烧室）逐字承载；注记写明防「l0 = 整轨降级」误读。
- **model_version = '1.0.0'**（联合轨首版——fc001_fmu_v1/gt001_fmu_v1 '1.0.0' 实读先例；
  与引擎 SystemDef model_version 分属两 id 域零冲突）。

### §1.3 联合 RK4 冻结表草案（**单转子形**——EQ 编号与 RFC TL-EQ-1..5 同号同义；R-A-02/R-B-04 处置）

**联合微分态 y = [f, T3, δ]（三维——GT [f,T3] + TL 受驱角态 δ；v0.1 四维 [f,T3,δ,ω] 废弃：
同一物理转子双建模（K_J 与 M 双惯量）+ P_elec 符号相反逐项对消（幻影耦合——评审 A 复算
R-A-02））**。单位制声明：**全 SI**——f [Hz]、δ [电弧度 rad]、功率 [kW]、时间 [s]；
**ω₀ ≡ f₀ = 50 Hz**（额定频率——GT 侧 K_J/f₀ 冻结值同源，GTL1 §2.1）；2π = rad/Hz 换算因子
（dδ/dt = 2π·(f−f₀)：rad/s = (rad/Hz)·Hz 量纲闭合——v0.1 ω_s = 2π·f₀ = 314.159 的 p.u. 制
字面与 golden 列名 ω_rad_s 的 rad/s 制相差 314 倍的三义问题随单转子形消除）。

冻结表（GT 侧 = GTL1 §2.2 逐字沿袭值零改动；TL 侧 = RFC TL-EQ 原编号定案细则；FMU 化标注
列 = 层归属——Q4 裁定点）：

| id | 方程（v0.2 冻结草案） | 说明 | FMU 化标注 |
|---|---|---|---|
| EQ-GTL1-1…6 / 8 | π_c = π_c0·(f/f₀)²…P_gen = η_m·(P_turb−P_comp)；P_bat = P_bat_ref − K_bat·(f−50) | GT 热力链 + 电池下垂**逐字沿袭（值零改动——GTL1 §2.2 原文）** | **内核**（代数链 + T3 微分态） |
| **EQ-GTL1-7（联合修订行）** | **df/dt = (P_rotor/K_J)·(f₀/f)；P_rotor = P_gen + P_bat − P_load − P_elec(δ)** | **联合 Run 唯一 GT 侧修订点**——GT 独立口径 P_rotor = P_gen + P_bat − P_load（Q1 定案恒等式）的**单一新增出口项 −P_elec(δ)**；独立退化条件 = P_elec ≡ 0（线路断路器开断——§2.2）；EQ-GTL1-7 恒等结构保留（涟漪 = 单一新增项） | **内核**（f 微分态） |
| EQ-GTL1-9 / 10 | f_gov = (monitor ∧ sensor_drift) ? f : f + b；u_next = clamp(u + Ki·(50−f_gov)·h, 0, 40)；u_eff = min(u, u_cap) 指令域钳位 | 调速器积分原样 | **host**（Q4——§1.5） |
| EQ-GTL1-11 / 12 | 设计点闭合（u=25 ∧ f=50 ⇒ P_gen=25 kW ∧ T3=1173 K）；能量恒等式 | 标定依据 / oracle 自检面 | oracle 自检 + host 记账 |
| **TL-EQ-1（修订形）** | **dδ/dt = 2π·(f − f₀)** | 功角-频率关系（单转子形修订——RFC 原式 ω_s·(ω−ω₀) 的 ω 态删除、ω_s 因子以 2π rad/Hz 显式化）；δ 为受驱角态（非独立转子态） | **内核**（δ 微分态） |
| **TL-EQ-2（溶解登记）** | ——（无独立方程） | 转子动力学**由 EQ-GTL1-7 承载**：RFC 原式 M·dω/dt = P_mech − P_elec − D·(ω−ω₀) 三项逐一溶解——M 由 K_J = 5.0 kW·s/Hz 承载（同值量级复算 M ≈ 2H·S_base/f₀ = 5 kW·s/Hz，双惯量冗余消除）、P_mech 由 P_rotor 组成承载（TL-EQ-4）、D 首版不启用（Q2——阻尼由调速器积分 + 同步力矩承载；如启用 = P_rotor 增 −D·(f−f₀) 项，显式 CHG） | —（溶解） |
| **TL-EQ-3（保留·钉单位）** | **P_elec(δ) = (V_gen·V_inf/X_line)·sin(δ) / 1000** | 线路功率传输（SMIB 单机-无穷母线）：V_gen/V_inf [V]、X_line [Ω] → 商 [W] → **/1000 → kW 口径与 GT 侧 P_gen 一致**（基值换算 §1.4：S_base=25 kW/V_base=400 V/Z_base=6.4 Ω 下 X_line=0.5 p.u.=3.2 Ω → P_max = 400·400/3.2/1000 = **50 kW**）；sin() 跨 libm 散差**预登记**（R-1 沿袭——§4 项 7） | **内核**（代数输出） |
| **TL-EQ-4（溶解登记）** | ——（无独立方程） | RFC 原式 P_mech(t) = P_gen_GT(t) 溶解：P_gen 经 EQ-GTL1-6 直接进入 P_rotor 组成（耦合机制零丢失——「替代」改为「加项进 P_rotor」） | —（溶解） |
| **TL-EQ-5（恢复承接）** | **V_gen = (f/f₀)·V_rated** | GT 频率→电压幅值映射（RFC 原式恢复——**不静默弃用**，R-A-01(5)/R-B-04②）：V_rated = 400 V；f 耦合经 P_elec 幅值进入（f=49 → V_gen=392 V → P_max=49 kW——2% 幅值调制，§3.2 登记） | **内核**（代数） |

**v0.1 废弃编号映射处置表（R-B-04③——旧号→RFC 原号→处置）**：

| v0.1 编号 | v0.1 内容 | RFC 原号 | v0.2 处置 |
|---|---|---|---|
| v0.1 EQ-TL-1 | df/dt = (P_rotor/K_J)·(f₀/f)（GT 沿袭） | —（GT 侧式，RFC 无 TL 号） | **改引 EQ-GTL1-7（联合修订行）**——不再占用 TL 编号（消除同号异义） |
| v0.1 EQ-TL-2 | C_3·dT3/dt = …（GT 沿袭） | — | **改引 EQ-GTL1-4** |
| v0.1 EQ-TL-3 | dδ/dt = ω_s·(ω−ω₀) | TL-EQ-1 | **修订形**（单转子形 dδ/dt = 2π(f−f₀)——ω_s 三义消除、ω 态删除） |
| v0.1 EQ-TL-4 | M·dω/dt = P_mech − P_elec − D·(ω−ω₀) | TL-EQ-2 | **溶解**（同号同义登记——物理由 EQ-GTL1-7 承载，非弃用） |
| v0.1 EQ-TL-5 | P_elec = (V_gen·V_inf/X_line)·sin(δ) | TL-EQ-3 | **保留同义**（编号对齐 + kW 口径 /1000 钉死） |
| —（v0.1 缺失） | — | TL-EQ-4（P_mech = P_gen_GT） | **溶解登记**（耦合机制由 P_rotor 组成承载） |
| —（v0.1 缺失） | — | TL-EQ-5（V_gen 映射） | **恢复承接**（v0.1 静默弃用勘正） |

**联合耦合面（GT↔TL 双向——单转子形）**：

| 方向 | GT → TL | TL → GT |
|---|---|---|
| 变量 | P_gen_GT（EQ-GTL1-6 输出——机械面）+ f（TL-EQ-5 电压映射 + TL-EQ-1 受驱源） | P_elec(δ)（TL-EQ-3 输出——线路出口功率） |
| 机制 | P_gen 进入 P_rotor 组成（加项非替代）；f 驱动 dδ/dt 与 V_gen | −P_elec(δ) 进入 P_rotor（线路出口负荷） |
| 独立退化 | P_elec ≡ 0 → P_rotor 逐级同 GT 独立式（精确退化——§2.2 守卫基座） | δ ≡ δ₀（f≡f₀ 时 dδ/dt≡0） |

**教学语义（单转子形物理闭环）**：线路出口加重/系统受扰 → δ 偏离平衡 → P_elec = P_max·sin δ
变化（稳定域内 dP_elec/dδ > 0 同步力矩）→ P_rotor 失衡 → GT 转子加/减速 → f 变化 →
调速器积分响应 + δ 继续受驱——**SMIB「出力失衡→转子摇摆→同步力矩回拉→调速器恢复」核心
物理在联合模型中真实成立**（对照：v0.1 替代形下 P_elec 在两式求和逐项对消、机制不存在）。
具体教学面：load_step 暂态中线路经 δ<0 瞬时**输入**支撑孤岛频率（nadir 浅于独立轨）；
sensor_drift 滑差（f=49.7 vs f₀=50）→ δ 线性漂移 → P_elec 周期摆（滑差拍频 0.3 Hz——
失步为合法教学输出，§3.2）；line_fault 出口塌陷 → 转子加速 → 清除后等面积再同步/失步
（§2.1）。**TL-b 面自身无独立负荷注入**（P_elec 由 δ 代数决定）——线路负荷语义经联合配置
（Run 级 demand 基值——Q3）与 δ 动态承载，如实登记。

**数值方法**：联合 RK4——[f,T3,δ] 三维联合积分（内核子步 δt=0.01 s × 输出网格 Δt=0.1 s
601 点——fc001/gt001 模式复刻）；**P_elec(δ) 在每个 RK4 stage 由该 stage 的 (f_stage, δ_stage)
现算**（内核代数——与 u_eff/demand 的「子步起点冻结」语义结构不同，§1.5 显式登记）；
V_gen 同为 stage 现算；事件域 p_elec_scale 为子步冻结输入（§2.5）。sin() 为跨 libm 散差
**预登记**源（R-1 ×≥10 冻结制——措辞按 R-A-09(1) 勘正：sin 联合链实测待 parity 轮，
不预称实测）。

### §1.4 TL 参数与单位制字典（全 SI；R-A-01/R-B-05 处置——逐参数 值+单位+依据）

**基值表（单位制锚）**：

| 基值 | 值 | 单位 | 依据 |
|---|---|---|---|
| S_base | 25 | kW | GT 设计点 P_gen（GTL1 EQ-GTL1-11——u=25 ⇔ P_gen=25 kW） |
| V_base | 400 | V | V_bus 沿袭（gt001 oracle V_BUS=400.0 :158 实读——B2-1 勘正；systems.js V_rated 同值） |
| Z_base | 6.4 | Ω | Z_base = V_base²/S_base = 400²/25000 |
| f₀ / ω₀ | 50 / 2π·50 = 314.159265… | Hz / rad/s（电气角频率） | GTL1 §2.1 冻结值沿袭；ω₀ 仅作派生口径（ω = 2π·f 列），非独立参数 |

**TL 参数字典（教学整定值口径——I-5 句式：「演示用整定值、未经实验/硬件验证」；RFC §3
参数候选区间内取值）**：

| 参数 | 值 | 单位 | 依据 | 有效性域/角点 |
|---|---|---|---|---|
| X_line | **0.5 p.u. = 3.2 Ω** | Ω（SI 主口径）/ p.u.（基值换算口径） | RFC 候选区间 0.5–1.0 下端——P_max = 50 kW = 2·P_gen 设计裕度；p.u. 值 = 3.2/6.4 | X=1.0 p.u. 角点见下 |
| V_rated | 400 | V | V_bus 沿袭（RFC 参数候选原文） | — |
| V_inf | 400 | V | 无穷母线电压 = V_base 同值口径（SMIB 等效——常数，无环境动态） | 常数声明 |
| V_gen | (f/f₀)·V_rated | V | **TL-EQ-5 恢复承接**（非常数——f 映射；f=50 时 = 400 V） | \|Δf\|≤1 Hz 域内 392–408 V |
| δ₀ | **0 rad（0°）**（联合基线 Run） | rad | 单转子形基线 = 零出口平衡点（P_elec=P_gen+P_bat−P_load=0 ⇔ δ_eq=arcsin(0)=0°——设计点自洽）；joint_line_fault Run 用出口基线 δ₀ = δ_eq(demand=20) = **arcsin(0.2) = 0.2013579 rad（11.5370°）**（Q3） | 稳定域 \|δ_eq\| < π/2 |
| D | **不启用（首版 D ≡ 0）** | — | 单转子形下阻尼由调速器积分（Ki=2.0）+ 同步力矩承载；RFC 候选 0.02–0.05 p.u./p.u. 留作可选扩展（启用 = P_rotor 增 −D·(f−f₀) 项——显式 CHG，Q2） | — |
| P_max | **50 kW**（X=0.5 p.u. 时） | kW | 导出量：V_gen·V_inf/X_line = 400·400/3.2/1000（f=50） | 角点表 |
| δ_eq | 0°（基线）/ 11.5370°（demand=20） | rad | 导出量：arcsin(P_elec_eq/P_max)；P_elec_eq = P_gen + P_bat − P_load（f=50、u=25 设计点） | X=1.0 角点 23.5782° |
| K_J / Ki / K_bat / P_bat_ref | 5.0 kW·s/Hz / 2.0 / 24 kW/Hz / 5 kW | — | GT 侧冻结值沿袭（GTL1 §2.1——联合不改值） | — |

**角点登记（单转子形口径——勘正声明）**：评审 A R-A-01(4)/(6) 引导的 δ_eq=30°
（arcsin(25/50)）与「X=1.0 → δ_eq=90° 恰在静态稳定边界」两数字系**替换形**口径
（P_elec 替代 P_gen → P_elec_eq = P_load − P_bat = 25 kW）——**单转子形下基线为零出口
（δ_eq=0°）**；30° 出口点需 P_elec_eq = 25 kW（demand = 5 kW 教学角点——非基线、不采）；
X=1.0 p.u. 角点在 demand=20 出口基线（P_elec_eq=10 kW、P_max=25 kW）下 δ_eq =
arcsin(0.4) = **23.5782°**（裕度收窄、非边界）。**单转子形的失步教学可达面 = 暂态**
（line_fault 清除过迟等面积逸出 / sensor_drift 滑差 δ 漂移）——非稳态运行点贴边，如实
登记（§3.2）。

**初值表（IC——healthy 非定点风险消除，R-A-01(6)）**：

| 初值 | 值 | 自洽判据 |
|---|---|---|
| f(0) | 50.0 Hz | EQ-GTL1-11 设计点 |
| T3(0) | 1173.0 K | EQ-GTL1-11 设计点 |
| δ(0) | δ₀（基线 Run = 0 rad；line_fault Run = 0.2013579 rad） | dδ/dt(0) = 2π·(f(0)−f₀) = 0 ✓ |
| u(0) | 25.0 kW_eq（指令域） | EQ-GTL1-11 设计点 |
| demand 基值 | 30 kW（GT 基线 Run——LOAD0_KW 沿袭）/ 20 kW（joint_line_fault Run——Q3 出口基线） | P_rotor(0) = 25+5−demand−P_elec(δ₀) = 0 ✓（基线：25+5−30−0=0；line_fault：25+5−20−10=0） |

**字典完整性声明**：无 fc001 式 nom 缺口——上表自含（X_line/V_rated/V_inf/δ₀/D + 基值表 +
IC 表）；执行器/传感/故障窗参数（magnitude/u_cap/t_clear/t_start/p_elec_scale）为 Run
矩阵注入面（§2.1），非模型常量；GT 侧常量字典（k_f/ṁ_a/C_3 等 15 位）以 GTL1 §2.1 为唯一
权威——本表不重复登记（§1.3 逐字沿袭声明）。

### §1.5 host 调速器积分器与联合内核分区（Q4 裁定点——R-A-04/R-B-06 处置；对照实写）

**Q1(B) 继承面（现行实现实读）**：GT-001 FMU 轨现行实现为 Q1(B) 定案（GT001_FMU §1.5/§11
Q1 定案记录）——调速器积分 EQ-GTL1-9/10 与传感污染/测量列/能量记账/事件分裂全部归 host、
内核纯物理 RK4、host 以 h=0.01 子步驱动 doStep（**n = round(step/DT_INT) = 1**——
gt001_l1.c:198 实读；I-3 认知分离硬边界头注 gt001_l1.c:5-10「调速器积分 EQ-GTL1-9/10
（控制反馈层）……全部归 host」原文）。host 子步循环四段（gt001_fmu_oracle.py:371-406
实写）：① 指令更新（:376-379——f_gov = (monitor ∧ sensor_drift) ? f : f + b；
u_next = js_clamp(u + KI·(50−f_gov)·h, 0.0, 40.0)；u_eff = min(u_next, u_cap) if
cap_active）；② 内核 RK4（:380-385——_kernel_step_thermo，输入 u_eff/demand 于调用前设置
= 子步起点右值冻结语义）；③ 能量累计（:386-399——E_gen/E_bat 梯形、E_fuel/E_load/E_rotor
左矩形冻结口径）；④ 提交（:400-405——f/T3 为内核输出、u 为 host 状态）。**控制量 u_eff
在 RK4 四 stage 内分段常数**（_kernel_step_thermo :250-259——四 stage 共用同一冻结 u_eff/
demand 实写）。

**联合内核下的继承（推荐口径——Q4）**：

| 面 | 联合处置（推荐） | 依据 |
|---|---|---|
| 调速器积分 EQ-GTL1-9/10 | **仍归 host**（逐字沿袭 Q1(B)——联合 Run 的 governor 循环与 gt001_fmu_oracle :376-379 同序） | I-3 硬边界（gt001_l1.c:5-10 原文对联合 dispatch 新建时**最易被静默突破**——R-A-04 预警面）；GTL1 §2.3 分区冻结文本 |
| 联合内核 | **纯物理 RK4 [f,T3,δ]**：EQ-GTL1-1..6/8 代数链 + EQ-GTL1-7 修订行 + TL-EQ-1/3/5；**P_elec(δ) 与 V_gen 为内核 RHS 内代数——逐 stage 由 (f_stage, δ_stage) 现算**（非子步冻结——与 u_eff/demand 冻结语义的结构差异显式登记；stage 内现算是 §2.2 逐位恒等守卫「逐 stage 耦合取值口径」钉死的基础） | 方案 (A) 联合 RK4 单内核（R-CS-01/RFC Q4 候选 (a)——Q6） |
| doStep 粒度 | **h=0.01、n=1**（host 每次调用恰 1 个 RK4 子步——gt001_l1.c:198 同款；DefaultExperiment stepSize=0.01 + canHandleVariableCommunicationStepSize=false 钉死形态沿袭） | Q1(B) 先例逐字 |
| VR 契约 | 输入面 demand_kW / u_eff_kW **+ p_elec_scale（新——线路状态事件域标量，§2.5）**；输出面 f/T3/代数链 **+ delta_rad / P_elec_kW / omega_rad_s**（VR 编号实现轮钉死——modelDescription.xml additive 面） | 单转子形三态输出面 |
| u_eff 分段常数 | **沿袭**（RK4 四 stage 共用子步冻结 u_eff——GT 先例逐字；P_elec 不冻结、stage 现算——两类量的冻结语义差异为本联合轨新增结构面，逐字写明） | _kernel_step_thermo 实写 |
| 事件域 | 故障窗（t_start/t_clear）/p_elec_scale 设置 = host 事件 pre-post 分裂面（故障窗恰落子步边界纪律沿袭——GTL1 §2.3 注记③ 同款：t=20.0/t_clear 落 0.01 子步边界，无子步内间断） | GT 事件面先例 |

**层归属裁定 = Q4**（§12）：推荐 (a) 逐字沿袭 Q1(B)（governor 归 host、内核纯物理、
doStep n=1、u_eff 子步冻结）；备选 (b) governor 入联合内核（I-3 架构偏差——须显式登记 +
VR/manifest 重排，不推荐——fc001_l1.c:7-8「内核内嵌壳职责 = 违反架构」硬边界同款）。

### §1.6 核心裁定点：联合耦合构造（Q1——三候选对照，推荐不定案；R-A-02 处置）

| 候选 | 形态 | 物理自洽面 | 恒等守卫面 | 涟漪面 |
|---|---|---|---|---|
| (a) 替代形（v0.1 现文——废弃） | GT P_rotor = P_elec + P_bat − P_load（P_elec 替代 P_gen）；TL 保留 ω 二阶转子（EQ-TL-4） | **不自洽**——同一物理转子双建模（K_J 与 M 双惯量、无轴耦合、可无限背离；复算 M ≈ 5 kW·s/Hz 与 K_J 同值量级）；P_elec 在两式符号相反、求和逐项抵消（幻影耦合——无穷母线交换功率对联合总平衡净效应为零）；SMIB 核心物理不存在 | 退化条件 = P_elec ≡ P_gen（替代式）——可行但语义扭曲（线路「出口」恒等于发电） | 已批架构骨架可保留，但冻结错误物理（R-A-02 BLOCKER） |
| (b) 加项形 | 保留 v0.1 双态 TL 面（δ, ω）；GT P_rotor 改加项 P_gen + P_bat − P_load − P_elec(δ) | **仍不自洽**——双转子冗余保留；P_elec 同时出现在 P_rotor（−）与 TL ω 式（−P_elec）——对消形态恶化（求和出现 −2·P_elec 假项） | 同 (a) 双转子退化 | 不推荐 |
| **(c) 单转子形（推荐）** | **转子动力学唯一由 GT EQ-GTL1-7 承载（f 单一转速态）；δ 降为受驱角态 dδ/dt = 2π(f−f₀)；ω 态删除（omega_rad_s 代数派生列 ω=2π·f）；P_rotor = P_gen + P_bat − P_load − P_elec(δ)；联合态 [f,T3,δ] 三维** | **自洽**——单转子单惯量（K_J）；P_elec 单一出现于 P_rotor（真实线路出口负荷）；SMIB 同步力矩/摇摆/调速器恢复全链真实成立 | **退化条件 = P_elec ≡ 0（线路断路器开断）——比替代形 P_elec ≡ P_gen 更物理**（断路器开断 = 线路物理退出；δ 仍照常积分 ∫2π(f−f₀) 记录真实漂移、列非空可核对） | EQ-GTL1-7 恒等结构保留（涟漪 = 单一新增项）；EQ 编号对齐 RFC（§1.3）；联合态四维→三维 |

**推荐一句话**：采 (c) 单转子形——物理自洽（单转子 + 真实出口项）+ 恒等守卫基座更干净
（P_elec≡0 精确退化）+ EQ-GTL1-7 结构涟漪最小（单一新增项）；权限依据 = R-CS-02 明载
TL-EQ-1..5「G2b 草案轮定案细则」（CHG-20261120-01 ①）——本草案轮即方程定案轮，单转子形
在授权范围内且不与 R-CS-01 架构（方案 A 松耦合/联合 RK4 单内核/命名）冲突。**本构造作为
候选提交 R-TLFMU-02 用户裁定（Q1）——不定案**。

### §1.7 键面（R-B-01 必交付章之二——B-1a 显式键纪律承接）

| 键面 | 登记 |
|---|---|
| config.systems 数组键 | **新增**（面③ additive——R-CS-01 方案 (A) 原文 config.systems = ["GT-001","TL-001"]）：B-1a 显式键纪律承接——新键显式登记 + **config_hash 投影零变化承诺**（RFC 面③「零投影」判定承接）；runHashInput 增 systems 数组 = additive（RFC Q3——Q5） |
| TL-001 SystemDef defaults 键 | X_line_pu / V_rated_V / V_inf_V / delta0_rad（提案键名——实现轮钉死）；TL 参数挂 TL-001 SystemDef（非 GT config——R-B-06「P_bat/P_load 挂载侧」问题的答案：GT 侧参数沿 GT-001 defaults 原样，TL 侧新增 TL-001 defaults，联合 Run 挂载两侧） |
| GT 参数面 | **零新增**（GT-001 defaults/inertia_model 枚举原样——联合不改 GT 配置面） |
| 事件键 | **line_fault +1**（additive——EVENT_KEYS 封闭集 scenario.js:52 扩 1 键 + docs/FAULT_CATALOG.md §9 TL-001 章 + scenario.js:79-83 FAULT_CATALOG 授权守卫 TL 行——§2.5 登记计划） |
| inertia_model 枚举 | **零新增**（既有 ['swing','linear','thermo','thermo_comb'] 不动；联合 golden 元数据字段取值 = Q12；scenario schema v1 不扩） |
| B-1a 纪律面 | 本轨新增键 = systems 数组 + line_fault 事件键 + TL-001 defaults 四键——全部显式登记；既有场景哈希零变化承诺（零投影 + 既有键路由不变——§4 项 5 同构义务） |

### §1.8 Epistemic Declaration 与 provenance 档位（面⑤承接——R-B-02 落点）

| 声明面 | 冻结草案（联合轨语境） |
|---|---|
| 模型来源 | TL-001 联合轨为**行为与数值集总参数演示模型**（SMIB 单机-无穷母线等效 + 教学尺度降阶热力链沿袭）；全部仿真输出保持 synthetic；定位句：**教学尺度降阶输电耦合示意（GT L1 + TL L0），非机组/电网动态验证**（I-5 句式族） |
| 硬件/实证 | 非硬件台架遥测推导（hardware_verification="not_performed"）；**未经实验/硬件验证**（model_validation="not_performed"——I-5 句式：「演示用整定值、未经实验/硬件验证」）；TL 参数为教学整定值（§1.4 逐行 I-5 口径） |
| 自洽性边界 | 通过内部一致性检查（r_true ≡ 0 定义恒等 / δ 积分恒等 / EQ-GTL1-12 能量恒等——GLJ 自检 §4 项 6）、run_hash 确定性复现、独立 oracle golden 比对（T-B 容差）仅确立**数值与实现自洽**——不得表述为物理守恒验证或硬件认证（I-5 措辞红线） |
| provenance 档位 | **analytical_demo（RFC 面⑤「零变化——analytical_demo 沿袭」判定的承接值）**；registry.js 两枚举现值 = analytical_demo（:111）/ numerical_simulation（:253-254 backend 默认——2026-11-22 实读）；实现轮以枚举实读复核，如判定联合数值轨语义更贴切需换值/扩枚举则停下显式 CHG（不静默）；**B2-2 条件注记（golden 字段层先例实读 2026-11-22）**：model_provenance 在 golden 字段层无 analytical_demo 先例——三先例 mg001_v2 / gt001_fmu_v1 / fc001_fmu_v1 实测均为 fmu_l1_lumped_unvalidated（golden 与 registry 两层枚举域不同源）；档位终值转 **TLJ-Q13 三选一显式裁定**（§12），本行值为 RFC 承接候选非定案 |

**TL-001 assumptions 提案（进 model.assumptions——实现轮）**：A-tl-smib（单机-无穷母线
等效——V_inf/f₀ 常数、无穷母线刚度无穷大）；A-tl-line（线路纯电抗——无电阻/电容/损耗，
单回路）；A-tl-vgen（V_gen = f/f₀·V_rated 线性映射——无励磁/AVR 动态）；A-tl-fault
（三相短路 = p_elec_scale 塌陷语义——金属性短路 scale=0 / 电压塌陷系数 scale=k 候选；
非电磁暂态）；A-tl-tuning（演示用整定值、未经实验/硬件验证——I-5）；A-tl-nodamping
（D 首版不启用——阻尼由调速器 + 同步力矩承载）。
**TL-001 limitations 提案**：电磁暂态/故障穿越细节、励磁与 AVR、线路电阻与损耗、变压器、
多机与网络拓扑、保护连锁与重合闸、次同步振荡、频率/电压稳定低频振荡精细分析均未建模；
**δ 无界增长（失步）为合法教学输出、非保护动作**（无失步保护/解列——§3.2）。定位句沿
house 句式：本模型为教学尺度降阶输电耦合示意（L0 面），非电网动态验证。

## §2 场景/事件族影响面

### §2.1 Run 矩阵（8 Run 提案——R-A-06 扩容；范围 = Q11）

| Run（key 提案） | 耦合面 | role/feedback_mode | family | magnitude（unit） | demand 基值 | 事件键 | 教学点 / 守卫面 |
|---|---|---|---|---|---|---|---|
| joint_healthy | GT+TL 联合 | baseline / closed_loop | none | 0.0 | 30 kW | 无事件 | **零出口平衡点**（P_elec≡0、δ≡δ₀≡0——GT 轨与独立 healthy 解析恒等：P_elec(δ=0)=0 精确 → P_rotor 同独立式——恒等性为结构性质非守卫承诺，如实登记） |
| joint_load_step | GT+TL 联合 | fault / closed_loop | load_step（GT 族） | +10.0（kW） | 30→40 kW | load_step（GT 既有键） | 暂态中线路经 δ<0 **输入支撑**（nadir 浅于独立轨 49.590174）；终点落平衡流形（§3.3——**A2-2 勘正：δ_ss ≈ −11.4°（线路进口域）、u_ss ≈ 25.06（governor 近冻结）、P_elec_ss ≈ −9.9 kW——精确恒等式 u_end = 25 − (δ_end−δ₀)/π 联立解；v0.2 预填 δ_ss∈(0°,11.5°)/u_ss>32.5 方向倒置废弃；精确值 emit 冻结纪律不变**）——**联合轨 ≠ 独立轨教学声明成立** |
| joint_sensor_drift | GT+TL 联合 | fault / closed_loop | sensor_drift（GT 族） | +0.3（Hz） | 30 kW | sensor_drift（GT 既有键 speed_sensor_bias） | f→49.7 滑差 → **δ 线性漂移 → P_elec 周期摆**（滑差拍频 0.3 Hz）——失步为合法教学输出（§3.2）；**无 gt001_v3 同名轨**（GT 侧同名 Run key = closed_loop_fault——§2.2 守卫范围修正声明） |
| joint_actuator_fault | GT+TL 联合 | fault / closed_loop | actuator_fault（GT 族） | 50.0（%） | 30 kW | actuator_fault（GT 既有键 fuel_valve_stuck） | P_mech 塌陷（u_cap=20 kW_eq）→ f 深降 → δ 漂移 → 线路交换功率重平衡——**P_mech 塌陷→δ 大摆**天然功角场景（评审 A R-A-06 建议纳入） |
| joint_actuator_clear | GT+TL 联合 | fault / closed_loop | actuator_fault（GT 族） | 50.0（%）+ t_clear_s=35.0 | 30 kW | actuator_fault（t_clear=35——GT EV-002 同构） | 清除瞬间 u_eff 解钳 → 过冲 → δ 回摆/再同步——过冲与回差锚点面（GT 口径沿袭） |
| joint_monitor_only | GT+TL 联合 | monitor / monitor | sensor_drift（GT 族） | +0.3（Hz） | 30 kW | sensor_drift（monitor——b 不进物理回路） | **负控**：f≡50 → δ≡δ₀ → P_elec≡0——联合轨与 GT monitor_only 结构恒等（守卫扩展候选——GLJ-5 范围 Q8/Q11） |
| **joint_line_fault** | GT+TL 联合 | fault / closed_loop | **line_fault（TL 新族）** | 三相短路（金属性——p_elec_scale=0）+ t_clear_s（提案 20.5） | **20 kW（出口基线——Q3）** | **line_fault（TL 新键——EVENT_KEYS +1）** | **功角摇摆最经典教学场景**：故障窗 [t_start=20.0, t_clear] 内 P_elec 塌陷（10 kW→0）→ **转子加速（P_rotor=+10 kW）→ δ 加速摆** → 清除后经同步力矩再同步/失步（**等面积判据教学点**）；t_clear 提案 20.5 s（0.5 s = 25 工频周期）——emit 轮按 \|Δf\|≤1 Hz 约束核定（§3.2；越界则缩短窗口或显式域外角点登记） |
| **joint_gt_standalone** | GT 独立（TL 解耦——**P_elec ≡ 0，线路断路器开断**） | baseline / closed_loop | none | 0.0 | 30 kW（=GT healthy 同构） | 无事件 | **逐位恒等守卫对照 Run**（↔ gt001_v3.json healthy——§2.2 守卫章） |

**Run 集 = 8 Run 提案**（Q11：actuator/monitor_only 镜像纳入与否——推荐纳入 (a) 8 Run；
评审 A R-A-06 明示 actuator 恰为 GT 端 P_mech 塌陷→δ 大摆的天然功角场景、monitor_only
为负控惯例）；duration 60 s / dt=0.1 / 601 点 / t_start=20.0 库口径沿袭。
**FAULT_CATALOG TL 新事件键登记计划**：docs/FAULT_CATALOG.md 新增 §9 TL-001 章
（additive——现结构 §1..§8 无 TL 章，评审 B 实读）；fault_id 提案 `tl_line_3ph_short`；
fault_block 扩展计划（t_start_s/t_clear_s/p_elec_scale 三参数——事件参数面沿 EVENT_KEYS
11 键 schema 形态 additive）；故障窗恰落子步边界纪律沿袭（20.0/20.5 均 0.01 整除 ✓）。
**线路过载族 = 显式缓做**（§0 不做清单——R-B-09 处置：既立项三相短路、又登记过载缓做，
RFC 面④ 候选双向落定）。

### §2.2 joint_gt_standalone 守卫章（R-A-03/R-B-07 处置——三钉条件 + 对照映射 + 恒等口径）

**解耦语义（单转子形定案）**：P_elec ≡ 0（**线路断路器开断**）——单转子形下 GT 方程
**精确退化**为独立式：P_rotor = P_gen + P_bat − P_load − 0 ≡ GT 独立口径逐算子同式；
比 v0.1 替代形（P_elec := P_gen）更干净（无替代语义扭曲；δ 仍照常积分 ∫2π(f−f₀)dt
记录真实漂移——f≠50 时 δ 真实漂移、f≡50 时 δ≡δ₀，列非空、可核对）。

**逐位恒等守卫三钉条件（评审 A R-A-03 三项前提逐条钉死——emit/实现轮验收硬条件）**：

| # | 钉死条件 | 内容 |
|---|---|---|
| (i) | **逐 RK4 stage 耦合取值口径** | P_elec 逐 stage 由该 stage (f_stage, δ_stage) 现算（§1.5）；解耦 Run 下 P_elec ≡ 0 逐 stage 置零 → P_rotor 逐 stage 与独立版逐算子同序（p_rotor = p_gen + p_bat − demand——gt001_fmu_oracle.py:211 形态）→ k1..k4 逐位同 → [f,T3] 轨逐位恒等；**禁止按子步边界冻结耦合值的 ZOH 式实现**（stage k2..k4 将偏离——守卫失效通道，显式排除） |
| (ii) | **P_gen 复用内核本级浮点** | 解耦 Run 的 P_gen 取内核本级 chain_algebra 输出原值（同一浮点对象进 P_rotor 与 record 列），不得另立重算路径；运算序同构（同操作数顺序——gt001_l1.c alg_chain 表达式树纪律沿袭） |
| (iii) | **host 调速器循环逐字镜像** | host 子步循环 ①②③④ 与 gt001_fmu_oracle :371-406 逐字同序（§1.5）——u_eff/demand 序列逐位同 → governor 对 [f,T3] 的反馈序列逐位同 |

**对照对象与恒等口径**：

| 项 | 定案（推荐——Q8） |
|---|---|
| 对照映射表 | **joint_gt_standalone ↔ gt001_v3.json healthy**（同构 config：demand=30、无故障、u₀=25——只读交叉；gt001_v3 六 Run 实测键面 healthy/closed_loop_fault/monitor_only/load_step/actuator_fault/actuator_clear）；扩展对照（守卫扩面候选）：joint_monitor_only ↔ gt001_v3 monitor_only（b 不进物理回路 → 结构恒等同款）、joint_gt_standalone 的故障构型变体（若 Q11/Q8 裁定扩 standalone 集：load_step/actuator 构型 ↔ 同名 Run） |
| **守卫范围修正声明（R-B-07③——sensor_drift 缺口处置）** | v0.1 将 joint_sensor_drift 与守卫声明并列、但 gt001_v3 **无同名 sensor_drift Run**（sensor 族 Run key = closed_loop_fault）——v0.2 修正：守卫域 = **joint_gt_standalone（+负控 joint_monitor_only 扩面候选）**；**joint_sensor_drift（耦合闭环）不在守卫域**（其物理本就应偏离独立轨——滑差 δ 漂移），run 矩阵注记同步修正 |
| 恒等口径 | **同实现（Python↔Python 同序镜像）主张 worst\|diff\| = 0.0**（GCMB-1 全 Run 97495 值 worst\|diff\|=0.0 / GTFMU-5 ±1e-9 全 Run 交叉先例同构）；**跨语言（C99↔Python）不做逐位承诺**（GTL1 §4 项 6 纪律——pow/sin 散差 R-1 制度）；措辞 = 「逐位恒等（条件：同语言同序镜像 + 三钉条件成立）」——条件显式化（R-B-07③ 措辞降级要求承接） |
| TL 列语义 | 三候选（Q8）：(a) **退化积分口径（推荐）**——delta_rad = δ₀ + 2π∫(f−f₀)dt 照常积分（不回馈）、P_elec_kW ≡ 0.0、omega_rad_s = 2π·f 照常派生——列非空、可核对、verify 容差路径与常态 Run 同构；(b) null 整列 + V-07 双 null 路径（verify_golden.py:647-668 W2-1 先例——评审 B 推荐；**null 列为库内 golden 首例**——gt001/fc001/fl001/mg001 系列无 null golden 列先例）；(c) 0 填充——**排除**（违反 I-2 数据诚实性——δ 真实漂移被抹平） |
| 守卫载体（三选一——Q8） | (i) **oracle 自检 GLJ-5（只读交叉）+ 实现轮一次性验收证据（推荐）**——零新校验步、零 verify_golden 改动；(ii) verify_golden 新校验步（additive——V-01..V-09 外新步须显式登记）；(iii) run-g2 parity 步承载（步账 +1） |

### §2.3 GT 27 列联合语义审计与 r_true 门重定义（R-A-05 处置）

**联合 Run GT 列语义审计表**（27 列 = gt001_fmu_oracle SERIES_IDS :101-111 逐列——含 "t"）：

| 列 | 联合语义 | 处置 |
|---|---|---|
| P_rotor_kW | **改写式**：P_rotor = P_gen + P_bat − P_load − P_elec(δ)（§1.3 EQ-GTL1-7 联合修订行——独立口径 + 单一出口项） | 冻结表承载 |
| r_true_kW | **门重定义**（下表） | Q9 |
| 其余 25 列 | **不变**（t/f_true_Hz/f_meas_Hz/n_meas_rpm/P_gen_true_kW/P_gen_meas_kW/P_gen_cmd_kW/P_bat_true_kW/P_bat_meas_kW/P_load_demand_kW/P_load_served_kW/V_bus_V/SOC_true_pct/SOC_est_pct/f_channel_diff_Hz/valve_cmd_pct/valve_meas_pct/T3_out_K/T2_out_K/p2_out_kPa/T4_out_K/Q_fuel_kW/P_comp_kW/P_turb_kW/eta_cycle_pct——GT 侧物理/记账/传感面零改动） | 逐字沿袭 |
| （TL 新列 3） | delta_rad（微分态）/ P_elec_kW（代数）/ omega_rad_s（派生 = 2π·f） | §4 项 4（Q7） |

**TL 新列 _true/_meas 配对语义声明（R-B-12②）**：TL 三列**无 _true/_meas 配对**——TL 侧
无传感/测量面为**有意设计**（TL-b 无传感器故障族注入；GT 侧传感面原样承载全部测量语义），
显式登记非遗漏。

**r_true 门重定义（二选一 + 残差门——Q9；R-A-05 核心处置）**：

| 候选 | 定义 | gate 面 |
|---|---|---|
| (a) **恒等换底（推荐）** | r_true := P_gen + P_bat − P_load − P_elec(δ) − P_rotor **≡ 0**（定义恒等换底——联合口径下仍逐点为零） | **r_true_kW: 1e-9 gate 零涟漪**（gate 键面/series_limit r_true 子串分派 :431/verify 链全部不变）；「产-出失配」教学面由 P_rotor_kW 列（含 −P_elec 项）+ P_elec_kW 列承载，无新列 |
| (b) 失配信号改性 | r_true := P_gen − P_elec（ω 式失衡的 kW 表达——暂态失配量，有教学价值） | 需**新容差键**（暂态失配量级未知——emit 实测冻结）+ 现行 r_true 子串分派/1e-9 门语义重议；涟漪 M |
| 残差门候选 | **r_line := P_elec − (V_gen·V_inf/X_line)·sin(δ) ≡ 0**（P_elec 列与 δ 列的跨列解析一致性——f_channel_diff/r_true 同构的检查式；任务书候选口径承接） | **推荐作 oracle 自检面（GLJ-2）非 golden 新列**（零列/gate 涟漪；golden 内建交叉守卫）；立 golden 新列 = 候选 (c)（Q9） |

### §2.4 白名单与哈希面（runHash——RFC Q3 承接；R-B-02 面③落点）

- **runHash**：runHashInput 增 **config.systems 数组**（additive——RFC Q3 候选 (a) 推荐 =
  Q5）；联合 cfg 参数面全量进 run_hash（GT defaults + TL defaults + Run 级事件参数）；
  备选 (b) 联合 cfg 独立 hash 域（不推荐——hash 域分裂无语义增量）。
- **config_hash 零变化承诺**：systems 为新键、**不进既有 config_hash 投影**（RFC 面③
  「零投影」判定承接——B-1a 显式键 + 零投影纪律）；既有场景 scenarioHash/config_hash
  逐字节不变（承诺 + 实现轮证明义务——§4 项 5 同构）。
- **run_hash 确定性**：Run 内容规范 JSON SHA-256、零墙钟（fmu_runner.py:425-434 先例机制——B2-1 勘正
  沿袭——fmu_sha256 类钉 hash 面**不适用**（本轨无 FMU 包——§1.2））。
- **白名单面零变化**：approved 白名单（scope.js:16-17）零改动；联合 Run 走
  **extension_preview 档**（§1.2 scope 归属推定——实现轮显式登记）。
- **盲包面**：联合轨**不入 Arena 盲测池**（新轨首版——L2 盲包入池为后续独立裁定面，登记
  不预设）；TL 三列无传感对（§2.3）→ 盲包投影面零新增语义负担。

### §2.5 事件编码与快照面（R-B-09 处置——joint_line_fault 事件面 + FAULT_CATALOG 登记计划）

- **GT 族事件（5 Run）**：沿 GT 事件编码 v1 同构——EV-001（sensor_bias/load_step/
  actuator_limit，trigger=20.0，pre=左极限 i=199 / post=采样行 i=200）+ actuator_clear 局
  EV-002（trigger=35.0）；快照变量面 = GT 四键 + TL 列按需扩展（emit 轮冻结）；事件分列
  执行属 host（I-3/I-11 沿袭）。
- **joint_line_fault 双快照 EV 提案**：EV-J1（t_start=20.0——p_elec_scale 1.0→0.0 金属性
  三相短路语义；pre=199/post=200）+ EV-J2（t_clear——p_elec_scale 0.0→1.0；pre/post 同构）；
  快照变量提案 = delta_rad / P_elec_kW / f_true_Hz（emit 轮冻结）；**p_elec_scale = 线路
  状态事件域标量输入**（金属性短路 scale=0；电压塌陷系数语义 scale=k∈[0,1) 候选——
  A-tl-fault 两语义统一为一个标量输入，内核 P_elec = p_elec_scale·(V_gen·V_inf/X_line)·sin(δ)/1000）。
- **事件键登记计划（additive 三件套）**：① EVENT_KEYS 封闭集扩 1（scenario.js:52——
  line_fault 键，key/label/family/params/t_start_s/t_clear_s/… schema 形态沿袭）；
  ② docs/FAULT_CATALOG.md 新增 §9 TL-001 章（fault_id=tl_line_3ph_short、magnitude 语义 =
  短路类型枚举提案）；③ scenario.js:79-83 FAULT_CATALOG 授权守卫 TL-001 行；实现轮
  additive、既有 11 键/8 章零变化证明义务。
- **V-09 事件相位变量**：GT 对 i_meas = n_meas_rpm（event_tol = n_rpm_atol 沿袭）；
  TL 侧事件相位变量（delta_rad？）**不单列**——V-09 以 GT 对承载（联合 Run 事件相位以
  转速/功角双侧可查，golden 事件快照变量面 emit 冻结；TL 相位变量进快照 variables 面）。

### §2.6 跨载体比对面（面⑥承接——cross_system 谓词；R-B-02 落点）

- **比对关系三形态**：本联合 golden 使 compare 面出现**第三比对关系**（RFC 面⑥「cross_system
  谓词新增」承接）：① 同系统内 Run 比对（既有）；② 实现载体比对（engine vs FMU 镜像——
  GTFMU 先例）；③ **跨系统联合轨比对（GT↔TL 联合 Run vs GT 独立 Run——本轨新增）**。
- **谓词形态**：cross_system 谓词注册 = 实现轮工作面（谓词名/shared-key 面/容差映射留实现轮
  登记不预断——GT001_FMU §2.4 句式同构）；本草案冻结面 = 比对语义边界：联合 Run vs
  独立 Run 的差异 = **耦合物理差异**（非模型深度差异、非实现载体差异）——教学表述纪律：
  不写「更准确/更真实/工业级」（I-5）；差异解释固定句式提案「线路耦合改变转子功率平衡」。
- **既有 Run 比对结论永不静默改判**（面⑥ additive 确认句式沿袭——GT 独立轨全部既有比对
  结论冻结不变）。

## §3 锚点与包络

### §3.1 联合稳态设计点（解析值——零出口平衡点 + 出口基线；§1.4 换算闭合）

| 变量 | 联合基线（demand=30） | 出口基线（demand=20——joint_line_fault） | 自洽判据 |
|---|---|---|---|
| f / T3 / u | 50.0 Hz / 1173.0 K / 25.0 kW_eq | 同左（GT 设计点不变） | EQ-GTL1-11 ✓ |
| P_gen / P_bat / P_load | 25.0 / 5.0 / 30.0 kW | 25.0 / 5.0 / 20.0 kW | 设计点链 ✓ |
| **P_elec_eq** | **0.0 kW** | **10.0 kW** | P_elec_eq = P_gen + P_bat − P_load（P_rotor=0 定义）✓ |
| **δ_eq** | **0 rad（0°）** | **0.2013579 rad（11.5370°）** | arcsin(P_elec_eq/50)（X=0.5 p.u.、P_max=50 kW）✓ |
| P_rotor / dδ/dt | 0 / 0 | 0 / 0 | 摇摆平衡 + δ 平衡 ✓ |
| V_gen / P_max | 400 V / 50 kW | 同左 | TL-EQ-5 + 基值换算 ✓ |
| X=1.0 p.u. 角点 | δ_eq = 0° | δ_eq = **0.4115168 rad（23.5782°）** | arcsin(10/25)——裕度收窄非边界（§1.4 角点登记） |

（替换形 30°/90° 数字勘正见 §1.4 角点登记——诚实区分两构造口径。动态锚点
（nadir/δ_ss/再同步判据/失步分支）**一律 A-11 emit 轮冻结**——本草案数值纪律 =
零编造（体例 §3.3 同款：本节冻结方程/常量/结构预填，oracle 复算为准）。）

### §3.2 动态结构预填与联合包络（数值 emit 冻结；R-A-10 处置）

| Run | 轨迹结构（定性预填——数值 emit 冻结） | 包络义务 |
|---|---|---|
| joint_healthy | 全轨恒 = §3.1 基线（解析恒等——非数值仿真产物） | — |
| joint_load_step | nadir 浅于独立轨冻结值 49.590174（线路 δ<0 瞬时输入支撑——方向性预填）；终点 = 平衡流形点（§3.3——**A2-2 勘正**）：P_gen_ss ≈ 30.08 kW（governor 近冻结——新增 10 kW 负荷由线路进口承担）、δ_ss ≈ −11.4°（线路进口域）、u_ss ≈ 25.063、P_elec_ss ≈ −9.9 kW | \|Δf\|≤1 Hz 联合重验（标准域——A2-1 分域） |
| joint_sensor_drift | f→49.7（调速器积分钉死稳态跨深度同——GTL1 §3.2 口径）→ **δ 线性漂移（斜率 2π·(−0.3) ≈ −1.885 rad/s）** → P_elec = 50·sin(δ(t)) 周期摆（拍频 0.3 Hz）——**60 s 窗口内 δ 漂移约 −113 rad（O(10²)）** | **δ_rad 无界增长为合法列值**；sin 大参数散差域登记（§4 项 7——R-A-09(2)） |
| joint_actuator_fault / clear | u_cap=20 kW_eq → P_gen 稳态 18.266 kW（GT 冻结值）→ P_elec_ss = 18.266+5−30 = **−6.734 kW（进口 6.7 kW）→ δ_eq = arcsin(−0.1347) = −7.74°**；清除后回摆（过冲/回差锚点面 GT 口径沿袭） | 同上 |
| joint_line_fault | 故障窗：P_elec 10 kW→0 → P_rotor=+10 kW → **df/dt 初值 = (10/5)·(50/50) = +2 Hz/s → 转子加速 → δ 加速摆**；清除后：等面积判据再同步（δ 回摆至新平衡）或失步（δ 单调逸出——清除过迟分支，合法教学输出） | **t_clear 提案 0.5 s 受 \|Δf\|≤1 Hz 约束**（0.5 s 全程加速理论上界 1 Hz——emit 轮核定；越界缩短窗口或显式域外角点登记）；δ_crit/再同步分支 emit 冻结 |
| joint_gt_standalone | GT 轨 ≡ gt001_v3 healthy（守卫——§2.2）；δ ≡ δ₀ = 0（f≡50 → dδ/dt≡0）；P_elec ≡ 0 | TL 列退化积分口径（Q8） |

**联合包络登记（R-A-10 逐项）**：
① **\|Δf\| ≤ 1 Hz 有效性域在联合 Run 全集重验**（GTL1 §3.3 承袭性假设——A-gtl1-speed-coupling
口径；GTFMU-7 抽查同款——**GLJ-7 内嵌断言按 Run 四域分域（A2-1 勘正——v0.2 全集硬断言与
joint_sensor_drift 闭环滑差物理冲突）**：(i) **结构恒等域** joint_gt_standalone / joint_monitor_only
——Δf ≡ 0 精确断言；(ii) **标准域** joint_healthy / joint_load_step / joint_actuator_fault /
joint_actuator_clear——max\|Δf\| ≤ 1.0 硬断言，越界即自检 fail → emit 拒绝写盘（GTL1 §3.3.1
GL-8 硬条件先例同构）；(iii) **滑差域** joint_sensor_drift——闭环偏置 → 调速器钉平均 f≈49.7 →
对 50 Hz 无穷母线持续滑差，Δf 激励 O(0.5–1.5 Hz) 合法越界——断言改判据 = 无 NaN/Inf +
f_avg 稳态 ≈ 49.7 ± 登记带宽 + \|Δf\| ≤ 1.5 域外角点显式登记（emit 轮实测冻结）；(iv) **故障窗域**
joint_line_fault——t_clear emit 轮核定与断言联动（越界缩短窗口或域外角点登记——R-6 预案））；
② **δ 功角域声明**：稳定摇摆域 \|δ_eq\| < π/2（静态稳定）；暂态 δ 摆动与失步（δ 单调无界）
为**合法教学输出**（无失步保护——§1.8 limitations）；sensor_drift δ 漂移 O(10²) rad 为
sin 大参数散差实测域（§4 项 7）；③ **V_gen 幅值调制**：\|Δf\|≤1 Hz 域内 P_max 49–51 kW
（±2%——f 耦合经 TL-EQ-5 进入 P_elec 幅值，登记量级）；④ **u=0 负净功伪影可达性重查**
（GTL1 §3.3——联合 Run 不改变 u 域 [0,40]；注册域 u_min=6.98 不可达结论重验义务沿袭）；
⑤ GT-001 未建模清单项 7「功率角稳定性」（GTL1 §6.1 :414）在 TL-001 语境由本联合面**承接**
（§1.8 limitations 成文——R-A-10 末项）。

### §3.3 零特征值平衡流形声明（诚实登记——教学表述纪律）

联合系统含两个同源积分器：governor ∫(50−f)dt（EQ-GTL1-9）与 δ ∫(f−f₀)dt（TL-EQ-1）——
二者对同一频率误差积分，线性化联合系统存在**零特征值**（平衡集 = 一维流形：P_gen(u) +
P_bat − P_load = P_elec(δ) 上 (u, δ) 连续族）。后果与纪律：① 联合基线（δ₀=0 零出口）为
流形上的**精确定点**（healthy 恒等成立）；② 受扰 Run 的终点为流形上**轨迹确定的一点**
（RK4 确定性——golden 可冻结），**非唯一解析稳态**——教学表述禁写「唯一稳态/精确回稳」，
写「收敛至功率平衡流形（终点由暂态轨迹确定）」；③ 该流形与真实电力系统 isochronous 调速器
+ 无穷母线的功率分配不定性问题同源——教学点如实呈现（A-tl-fault 语境注记），不入 copy-guard
词面（零增词）。

## §4 golden 计划（gt_tl_joint_v1 · 独立 oracle · 本批准轮零改动——emit = A-11 实现轮）

| # | 项 | 内容 |
|---|---|---|
| 1 | 新 id 判据 | golden_id = **gt_tl_joint_v1**（R-CS-04 用户确认——CHG-20261120-01 ①；`ls data/golden/` 无 gt_tl_* 撞名 2026-11-22 实读）；**supersedes = null**（联合域首例——非任何既有 golden 之取代；I-10 独立 RFC 已批 = 本规格上游）；ORACLE_INTERFACE_D2 §3.1「模型/方法变更 → 新 id」判据同构适用 |
| 2 | 独立 oracle + 出生接入 | `tools/oracle/gt_tl_joint_oracle.py`（提案命名——Q）；独立性声明沿 fc001_fmu_oracle/gt001_fmu_oracle 体例：**不 import src/\*\*、不 import 任何既有 oracle（gt001*/fc001*/fl001*/mg001*——仅 oracle_base 机制层）**、GT 侧方程/常量唯一权威 = GTL1 §2 批准文本逐字转写、TL 侧 = 本规格 §1.3/§1.4、Python stdlib（python -I）自含硬编码。**V-03/I-9 出生接入声明（R-B-08 处置）**：出生即 oracle_base 六成员接入（RUNS/SERIES_IDS/simulate_run/self_check/_oracle_source_sha256/build_golden——OracleInterface 冻结签名）+ resolve_run_spec + write_golden_with_sidecar（**LF 钉死**）+ approval 三字段非 null 方可落盘 + SERIES_IDS 模块常量（**含 "t" 列**——R-B-08⑤ 口径注记）；V-03 字节锚定口径：generated_by.oracle_source_sha256 = oracle 源文件自身字节 SHA-256（出生接入即无历史字节负担——verify_golden.py:556-559 实读语义）；V-03b approval 三字段面（:561-572 实读语义）；**I-9 伴生工具独立成文义务**：gt_tl_joint_parity.py / 联合 shell / adapter 一律独立成文、不得改写已锚定 oracle（V07_ROADMAP:22 I-9 原文承接）；golden 由 oracle 只读生成——C99 内核不参与 emit（parity 为验收面非生成依赖） |
| 3 | 数值方法 | 联合 RK4——内核子步 δt=0.01 s；Q4 推荐下 host 以 h=0.01 子步粒度驱动 doStep（n=1）+ 子步间 EQ-GTL1-9/10 推进 + 记账复刻；oracle 与 C99 联合内核+host **同算法同步长同运算序**（parity 前提——位级一致不承诺）；输入冻结语义 = u_eff/demand/p_elec_scale 子步起点右值；**P_elec/V_gen 为内核 stage 现算**（§1.5 结构差异——RHS 求值序冻结文本 = §1.3 冻结表 + §1.5 分区映射合成） |
| 4 | 列 schema（30 列） | **SERIES_IDS = GT 27 列（gt001_fmu_oracle :101-111 逐字，含 "t"）+ TL 新列 3**：`delta_rad`（微分态——电弧度）/ `P_elec_kW`（线路出口功率）/ `omega_rad_s`（**派生列 = 2π·f**——非独立微分态，Q7）= **30 列**；**ASCII 命名**（delta_rad/omega_rad_s——现行 27 列全 ASCII 命名域一致，R-B-12①；v0.1 希腊形 δ_rad/ω_rad_s 废弃）；**列数勘正注记（R-B-12③）**：RFC §4 预填 27+3=30 列——v0.1 的 31 列（+P_mech_kW）偏差随 P_mech_kW 弃列消除（P_mech_kW ≡ P_gen_true_kW 逐位冗余——评审 A Q4；留作恒等交叉守卫列 = Q7 备选 (b)）；TL 列无 _true/_meas 配对（有意设计——§2.3 声明）；golden units 字典增 "delta":"rad"、"omega":"rad/s"（提案——schema.js:19-23 UNIT_DICT additive，GTL1-G2b-03 K/kPa 先例同构） |
| 5 | 容差与 verify_golden 注册计划（R-B-03 处置——四件套全登记） | ① **gate 块键面** = gt001_fmu 十键镜像（tier:"T-B" / f_Hz_atol:1e-4 / n_rpm_atol:1e-2 / T_K_atol:1e-2 / p_kPa_atol:1e-9 / P_kW_rtol:1e-6 / P_kW_atol:1e-3 / E_kWh:1e-6 / SOC_pp:1e-5 / r_true_kW:1e-9 / t_s:1e-9——gt001_fmu_oracle TOLERANCES :163-177 实读镜像）**+ 新键 2**：`delta_rad_atol` / `omega_rad_s_atol`（量级预案非终值——emit 轮双实现实测散差 × 安全系数 ≥10 冻结；**禁止落 f_Hz_atol 兜底**）。② **分派支计划（additive 双条件支）**：`_rad_s` 支（omega_rad_s → omega_rad_s_atol）+ `_rad` 支（delta_rad → delta_rad_atol）——**插入点钉死：`_mL` 条件支（:429）后、r_true/r_meas 子串判别（:431-433）前**；**仅当 gate 声明对应键时激活**——既有 golden 无 `_rad`/`_rad_s` 后缀 id ⇒ 既有键路由行为逐字节不变（`_mL`/`_V`/`_kWh`/dim 条件支三重先例同构——fc001_fmu_v1 `_mL` 修复 P1-1 同款纪律）；**既有键路由零变化证明义务**随实现轮提交（fc001 先例同款）；现状证据：`delta_rad`/`omega_rad_s` 现行路由实测命中 :470 f_Hz_atol 兜底（rad ≠ Hz 量纲错型——FCFMU P1-1 同类形态；P_elec_kW 命中 :435 `_kW` 支路由正确）；metric_within 面：unit="rad"/"rad/s" 指标现落 T-B 兜底 SOC_pp（:503）——联合 metrics 面如含 rad 单位指标（f_nadir_Hz 类沿 Hz 面、max_abs_delta 类）须同轮增 rad 条件支或避免 rad 单位指标（推荐后者——rad 量只走序列面不走 metrics，Q10 附带裁定）；V-06 标量面：联合 scalars **不新增 rad 类标量**（推荐——delta_end 类标量若立将落 SOC_pp 支 :630——fl001_l1 T_bat_end_K 先例形态「可用须显式登记」，本轨推荐规避 + 登记规避决定）。③ **MODELS["gt_tl_joint"] 注册行四件套**：golden_file="gt_tl_joint_v1.json" / i_true="f_true_Hz" / i_meas="n_meas_rpm" / event_tol="n_rpm_atol"（GT 对沿袭——gt001_fmu 注册行 :271-287 镜像形态）/ scalars = GT 九键镜像（E_source/E_bat/E_load/E_rotor/E_fuel/SOC_true_end/SOC_est_end/SOC_err_end/eta_cycle_end——rad 类规避如上）。④ **DEFAULT_MODELS 九→十尾追加**（:375-376 现值九成员实测——尾追加 "gt_tl_joint"；步① 无参调用 10 golden；label 滞后说明沿先例维持登记）。⑤ **RUNS_GROUPS 复用声明**：联合 oracle **不设 RUNS_GROUPS 属性**——flat RUNS 承载全部 Run 解析（verify_golden.py:597-598 既有 flat fallback 行为零变化；getattr 返回 None → flat 路径——:592-598 实读）；golden.inertia_model 字段取值 = Q12（推荐 "thermo"——GT 侧 L1 物理语义承载 + flat 路径下字段不参与分派） |
| 6 | 自检清单计划（GLJ-1…7——段名避撞 GL/GCMB/GTFMU/FMU 现值段） | GLJ-1 设计点/出口基线闭合（§3.1 双基线解析值复算——P_rotor=0 ∧ dδ/dt=0 判据 ±1e-9）；GLJ-2 联合恒等式（r_true ≡ 0 定义恒等逐点 / **δ 积分恒等 δ(t)−δ₀ ≡ 2π∫(f−f₀)dt 离散自洽**（RK4 累计 vs 逐点 δ 差——判据按实测上界冻结）/ EQ-GTL1-12 能量恒等沿袭 / **r_line := P_elec − (V_gen·V_inf/X_line)·sin(δ) ≡ 0 残差门**（Q9 推荐——oracle 自检面非 golden 新列））；GLJ-3 网格与事件相位（601 点、t[i]=i·dt、EV-001/EV-J1/J2 pre/post 语义 + 快照变量 = 采样行口径）；GLJ-4 锚点全表复算（§3.1/§3.2 emit 冻结值）；GLJ-5 **standalone 只读交叉守卫**（joint_gt_standalone 全序列 vs gt001_v3.json healthy 只读交叉——同实现 worst\|diff\|=0.0 目标 / 跨实现 ±1e-9 口径——GTFMU-5 先例同构；monitor_only 扩面随 Q8/Q11）；GLJ-6 半步自收敛登记（δt=0.01 vs 0.005——实测散差 ×≥10 冻结制，GL-7 先例）；GLJ-7 无 NaN/Inf + 包络抽查（**Δf 断言按 Run 四域分域（A2-1——§3.2①）**：结构恒等域 Δf≡0 / 标准域 max\|Δf\| ≤ 1.0 越界 emit 拒绝写盘（GTL1 §3.3.1 GL-8 硬条件先例）/ 滑差域 joint_sensor_drift 独立判据（f_avg≈49.7±登记带宽 + \|Δf\|≤1.5 域外角点登记）/ 故障窗域随 t_clear 核定 + δ 域声明核对 + u∈[0,40] + SOC 包络） |
| 7 | parity 计划（R-A-09/R-B-10 处置） | `tools/oracle/gt_tl_joint_parity.py`（提案命名——独立成文 I-9）：C99 联合内核 vs Python oracle 同算法同步长同运算序；**sin() 跨 libm 散差预登记**（措辞按 R-A-09(1) 勘正——「预登记（emit/parity 轮实测冻结）」，不预称实测；R-1 ×≥10 冻结制沿袭）；**大参数域义务（R-A-09(2)）**：sensor_drift δ→O(10²) rad 与 line_fault 失步分支的 sin 大参数减幅路径分叉（Payne–Hanek vs 多项式）——**冻结门须在注册 Run 的实际 δ 域上实测**（GTL1 \|Δf\|≤1 Hz 域声明同款纪律）；**pow 双源并行预登记（R-B-10）**：GT 侧 (f/f₀)²、π_c^a_c、π_t^(−a_t)（gt001_l1.c alg_chain :83/:85/:91 pow 三处实读）——RFC §4 :121 跨实现 pow 预期 ~2.5e-4 承接；**先例门值勘正义务（R-A-09(3)）**：gt001_fmu_parity.py PARITY_RTLIM=1e-3 与其注释「实测 2.55e-4 × 10 = 2.55e-3」字面不符——联合 parity 轮按「实测 × ≥10」规则字面执行，并同轮勘正先例注释或显式登记豁免理由（归治理面核对）；SKIP 语义（编译产物/64 位解释器缺位 exit 3——fc001_fmu_parity.py:14-15/:64-72 先例）；parity 结论 = **数值与实现自洽声明 only**（I-5 措辞边界） |
| 8 | 元数据面（schema v2——R-B-08/R-B-02 面②⑤落点） | golden_schema_version="v2"；golden_id="gt_tl_joint_v1"；model_id="gt.sync.tl.l0"（Q12）；model_version="1.0.0"；method_id="gt_tl_joint_rk4_dt0.01"；engine_baseline=null；backend=null（留位）；**model_provenance = TLJ-Q13 裁定值（三候选 (a) analytical_demo RFC 承接——golden 层无先例 / (b) fmu_l1_lumped_unvalidated golden 层三先例同构——推荐 / (c) numerical_simulation registry 枚举）——B2-2 显式裁定承接**；inertia_model="thermo"（Q12）；supersedes=null；units = GT 十键面 + delta/rad + omega/rad/s（项 4）；generated_by 一段式（**oracle_source_sha256 = 源自身字节 SHA——出生接入**）+ approval 三字段首签引批准 CHG；**「每个 golden 单一 model_id」张力实锚（R-B-12④）**：RFC :12 引文为 paraphrase（全仓无逐字原文——评审 B grep 实证）——本 golden 的张力实锚 = **face② 惯例面**（golden.model_id 两惯例——§1.2）：联合 golden 自述**单一** model_id（gt.sync.tl.l0），不混载多 model_id——突破面 = 惯例扩展（第三形态自述 id），非单 golden 多 id 混载 |
| 9 | 两门禁面 | ① golden↔oracle verify（V-01…V-09 全链——30 列逐点 + V-09 事件 pre/post）+ C-Python parity（项 7——数值与实现自洽 only）；② 联合轨验收路由：gt_tl_joint_v1 emit verify 通过前联合轨不进任何验收路径/比对 enable（I-4 批准纪律——不静默）；既有 16 golden 全链零触碰并全绿回归兜底 |
| 10 | 验收命令承接 | `python -I tools/oracle/gt_tl_joint_oracle.py --self-check`（GLJ-1…7）；`python scripts/verify_golden.py gt_tl_joint`（8 Run 全过）；`python -I tools/oracle/gt_tl_joint_parity.py`（SKIP 语义沿先例）；三次执行 run_hash 恒等（零墙钟）；copy-guard exit 0（§7.2） |
| 11 | 预期失效面 | 新增 data/golden/gt_tl_joint_v1.json(+.sha256)（16→17 目标态）；verify_golden MODELS 新注册行 + DEFAULT_MODELS 尾追加（步① 无参 9→10）；T-B 分派链 `_rad_s`/`_rad` 条件支新增（additive——既有路由零变化证明）；EVENT_KEYS/FAULT_CATALOG/scope 登记面（§2.5/§1.2）；run-g2 步账申报（37→38 显式——面⑦，随批准 CHG 打包）；UI 联合教学面（A-11） |
| 12 | 旧 golden/oracle 零触碰 | 既有 16 golden（含 .sha256）字节冻结零变更；gt001*/fc001*/fl001*/mg001*/pv001*/wt001* 全部 oracle 物理文件零触碰（V-03 字节语义 + I-9 自冻结）；gt001_v3/gt001_fmu_v1 的 verify_golden 注册行零改动（新增行不重指向——FLTH §4 项 7 同构纪律）；engine 既有分派链零改动（simulateJoint 为新增面——GT 分支内部不动） |

## §5 八面影响逐面承载表（R-B-02 处置——RFC §5 逐面 × 落点 × additive 声明）

| 面 | RFC 判定 | 本草案落点章 | 具体承载与 additive 声明 |
|---|---|---|---|
| 面① model registry | additive | §0 / §1.2 / §1.5 | TL-001 SystemDef（model_id=tl.transmission.l0——TL 侧 L0 面）+ 引擎联合 dispatch 面（simulateJoint——R-CS-01 已批）；**联合 config scope 归属 = extension_preview 推定**（§1.2——scope.js 单 systemId 形态下联合形态落档显式登记）；registry 扩展 = 实现轮 additive，既有 SystemDef 零改动 |
| 面② golden | additive | §4 项 1/8 / §1.2 | gt_tl_joint_v1（第 17 golden 目标态）+ schema v2 字段面（approval 三字段非 null 方可写盘/V-03/V-03b/supersedes=null/model_provenance）；**单一 model_id 惯例张力实锚 = face② 惯例面**（第三形态自述 id——§4 项 8；非多 id 混载）；既有 16 golden 字节零变更 |
| 面③ scenario/config | additive | §1.7 / §2.4 | config.systems 数组键新增（B-1a 显式键——**config_hash 零投影**）+ TL-001 defaults 四键 + runHashInput systems 数组（Q5）；既有 scenarioHash/config_hash 逐字节不变承诺 + 实现轮证明义务；EVENT_KEYS 面 → 面④ |
| 面④ fault catalog | additive | §2.1 / §2.5 | **line_fault 新族立项**（EVENT_KEYS +1 + docs/FAULT_CATALOG.md §9 TL-001 章 + scenario.js:79-83 授权守卫 TL 行——三件套 additive 登记）；**线路过载族显式缓做**（§0——双向落定，R-B-09）；GT 三族既有键/章零变化 |
| 面⑤ provenance | 零变化 | §1.8 / §4 项 8 | analytical_demo 沿袭（RFC 面⑤ 判定承接——registry.js 两枚举现值实读 :111/:253-254）；**golden 字段层终值 TLJ-Q13 显式裁定（B2-2——golden 层三先例 fmu_l1_lumped_unvalidated 2026-11-22 实读）**；Epistemic Declaration 成文（§1.8）；枚举零新增（换值/扩枚举须显式 CHG） |
| 面⑥ compare | additive | §2.6 | cross_system 谓词新增（第三比对关系——GT↔TL 联合 vs GT 独立）；谓词形态实现轮登记不预断；既有 Run 比对结论永不静默改判 |
| 面⑦ run-g2 | additive | §4 项 5/11 / §6 | verify_golden MODELS 注册行 + DEFAULT_MODELS 九→十尾追加 + `_rad_s`/`_rad` 条件支 + 联合 parity 步（**步账 37→38 显式申报——I-7 增删步须 CHG 登记步数账**，随批准 CHG 打包；现行 37 步 = GTFMU Q10 定案值——评审 B 实读口径） |
| 面⑧ copy-guard | 零增词 | §7.2 | TL 语境词面预检（线路/潮流/功角/短路/再同步——43 patterns 现值预期零命中；零增词判定承接 + §7.2 预查表） |

**additive 总声明**：八面全部 additive/零变化——**无任一 breaking**（RFC Q6 判定 (a) 的
逐面证据支撑在案）；残余用户裁定（Q5 runHash 形态/Q10 容差键/Q12 身份面）均为**新 golden
内部内容面**，不波及既有 golden 字节——additive 判定维持（评审 A Q6 意见承接）。

## §6 G2b 排期与门禁序列（R-B-13 处置——序列声明 + A-11 边界 + linux64 D-12 隔离）

**门禁序列（I-4 纪律——本草案零实现承诺的序列依据）**：本草案（DRAFT v0.3）→
**重新双评审**（评审线 A 物理/架构 + 评审线 B 治理/八面——互不可见；v0.1 双评审 FAIL 后
的处置路径轮）→ **用户书面批准**（R-TLFMU-01..03——§13）→ **A-11 实现轮**（CHG-20261120-01
③ v1.17.0 预授权——oracle/golden/C99/parity/adapter 全链随批准 CHG 派发）——**I-4
先文档后代码（批准后才实现）**。

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| GTLJ-G2b-01 | 本规格草案（v0.1 起草 → v0.2 轮内重稿（双评审逐条处置）→ **v0.3 重审条件落正文 2026-11-22——本文件**） | M | **已完成**（A-10——CHG-20261120-01 ②） |
| GTLJ-G2b-02 | 双路独立评审（物理 A：单转子形自洽/量纲/守卫三钉/锚点复算/包络；治理 B：八面/golden 治理/verify 注册面/键面/哈希面/步数账/copy-guard——**v0.2 重审已完成 2026-11-22：双线 PASS-WITH-CONDITIONS(2)+(2)，条件已 v0.3 落正文**）+ 用户书面批准（Q1..Q13 定案 + R-TLFMU-01..03）+ 更名 APPROVED | M | v1.17.0 批准轮 |
| GTLJ-G2b-03 | oracle 编写（gt_tl_joint_oracle.py——出生接入 + GLJ-1…7 + 容差实测冻结）+ gt_tl_joint_v1 emit（8 Run、30 列、schema v2、approval 首签）+ verify_golden 注册行 + DEFAULT_MODELS 尾追加 + `_rad_s`/`_rad` 条件支 + FAULT_CATALOG/EVENT_KEYS/scope 登记面 | L | v1.17.0 实现轮（A-11——CHG-20261120-01 ③） |
| GTLJ-G2b-04 | 实现：C99 联合内核 gt_tl_joint_l1.c（[f,T3,δ] RK4——Q6/Q4 裁定口径）+ 引擎 simulateJoint 联合 dispatch + TL-001 SystemDef + 联合 shell（host 子步循环——§1.5）+ gt_tl_joint_parity.py + run-g2 parity 步（步账 37→38 CHG）+ adapter/bridge 教学接线 + runHash systems 数组（Q5）+ copy-guard 终检 + linux64 D-12（**随批准 CHG 同波派发——与本轨并行隔离声明：D-12 为平台面独立工作流，不阻塞不依赖本轨验收链；「另行 CHG」v0.1 措辞勘正为台账口径「随批准 CHG 派发」**——R-B-10 两读法差异显式登记） | L | v1.17.0 实现轮（A-11） |

## §7 红线自查

### §7.1 I-1…I-10 逐条（V05/V07/V08_ROADMAP §0 沿袭——I-8/I-9/I-10 为新增三条）

| # | 不变式 | 自查结论 |
|---|---|---|
| I-1 | 零安装零网络零构建（前端） | C99 联合内核 = backend 工件非产品依赖；file:// 离线兜底沿袭；oracle/parity 仅标准库；引擎 simulateJoint 为 JS 内增量（无新依赖） |
| I-2 | 数据诚实性 | 三层认知分离（§1.1）；代数量不冒称 ODE 态（**omega_rad_s 显式登记为派生列**——Q7；δ 为唯一新增微分态诚实区分）；standalone TL 列 0 填充候选**排除**（§2.2——I-2）；参数值全部 I-5 教学整定口径（§1.4）；动态数值零预填（§3.2 emit 冻结） |
| I-3 | 认知分离（本轨硬边界） | 内核纯物理 [f,T3,δ]（§1.5——Q4 推荐）；governor/传感/记账/事件分裂归 host；**b/monitor 永不入内核**；联合 dispatch 新建面为最易静默突破点——§1.5 为实现轮评审硬项（R-A-04 预警承接） |
| I-4 | 门禁纪律 | DRAFT v0.3 零实现；双评审→用户批准→A-11 序列（§6）；验收路径禁入直至 emit verify 通过（§4 项 9）；V1120/V1160 治理波零代码授权字面维持 |
| I-5 | 合成演示定位 | 「数值与实现自洽」固定句式；「演示用整定值、未经实验/硬件验证」（§1.4/§1.8）；「教学尺度降阶输电耦合示意，非机组/电网动态验证」；δ 失步为合法教学输出非保护动作（§3.2）；比对差异表述不写「更准确/更真实/工业级」（§2.6） |
| I-6 | 场景=Run 序列配置化 | Run 矩阵 = oracle RUNS 白名单提案（§2.1）；联合 config 键显式登记（§1.7）；故障面 = line_fault 立项 + 过载缓做（双向登记） |
| I-7 | 门禁步数账 | run-g2 现值 37 步（GTFMU Q10 定案——评审 B 实读）；联合 parity 步 + 注册面 → **37→38 显式申报**（§5 面⑦——随批准 CHG）；不静默扩账 |
| I-8 | 三层夹心模式复刻（V07） | §1.1 全链（oracle→golden→C99→parity→adapter→bridge）+ I-8 各自另批纪律 = 本规格即批准载体；parity ×≥10 冻结制为模板约束（fc001/gt001 实测先例为基线非承诺） |
| I-9 | 已锚定 golden 的 oracle 自冻结（V07） | gt001_l1_oracle/gt001_comb_oracle/gt001_fmu_oracle/fc001_fmu_oracle 等全部既有 oracle 零触碰；本轨伴生工具一律独立成文（§4 项 2）；联合 shell 于 fmu_runner 新增函数体不改既有 shell 字节语义（additive——实现轮评审核对项） |
| **I-10** | **跨系统联合 golden 须独立 RFC（V08_ROADMAP:21）** | 已满足——TL001_CROSS_SYSTEM_RFC.md 独立 RFC 已批准（R-CS-01..04——CHG-20261120-01 ①）；本规格 = 该 RFC 的 G2b 落实文本（§5 八面逐面承载 = RFC §5 分析的规格继承） |

### §7.2 copy-guard 预查（tools/copy-guard.mjs SCOPES=['src'] :15 / BANNED 43 模式 :30-52/:56——B2-1 勘正
现值——实现期 `node tools/copy-guard.mjs` 终检；面⑧零增词判定）

| 提案串/词面 | 核查结论 |
|---|---|
| TL 教学文案（「功角摇摆」「三相短路」「再同步」「线路出口功率」「同步力矩」） | 43 禁词族（更准确/更真实/工业级/已验证/FMU 结果等）零命中预期——面⑧「预期零增词」承接 |
| 「演示用整定值、未经实验/硬件验证」 | 否定式句式（「经过验证」不含「已验证」子串——FLEXT F5 先例句式）0 命中预期 |
| 「数值与实现自洽，不是物理守恒验证或硬件认证」 | 禁词族否定式承载 0 命中预期 |
| 「教学尺度降阶输电耦合示意，非机组/电网动态验证」 | 「非机组/电网动态验证」为 ALLOW 串首条（copy-guard.mjs:30 现值）0 命中预期 |
| 平衡流形句（§3.3） | 纯物理表述、无禁词子串；不入 BANNED（零增词） |

（本草案在 FaultLab-evaluation/** 不扫描；实现轮文案迁入 src/** 前逐句预检 + 终检双保险。）

## §8 G2b 进入条件五项自查表（SCOPE_SPLIT_MEMO §8.2）

| # | 进入条件 | 状态 |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：本轨触发项 = V08_ROADMAP A-10 行 + CHG-20261120-01 ②（本 v0.2 即交付物）；TL-b 立项条件（R-TL-01..04）已随 RFC 批准闭合；无未关闭遗留项 |
| ② | 独立 golden | **计划就绪（未产出）**：§4 gt_tl_joint_v1 / gt_tl_joint_oracle.py / 8 Run 白名单 / 30 列 / schema v2 / T-B + 新键面。golden 后置系「零实现承诺」授权的字面偏离**显式登记**（GTL1 §7.1 ② / GT001_FMU §7 ② 先例同款句式）；emit = A-11（§9），落地并 verify 通过后本项闭合 |
| ③ | UI 措辞与未建模物理清单 | **就绪（草案级）**：§1.8 Epistemic Declaration + assumptions 6 条 + limitations 清单 + §7.2 copy-guard 预查（assumptions/limitations 冻结文本实现轮迁入 SystemDef） |
| ④ | 用户书面批准 | **未闭合（本波边界内）**：批准 = GTLJ-G2b-02（用户指令链 CHG——三先例体例）；本状态行即 DRAFT 依据 |
| ⑤ | CHG 登记 | 起草授权 CHG-20261120-01 ② 已登记（DECISIONS.md:1936-1938 实读）；批准 CHG 待 GTLJ-G2b-02（随批打包：步数账 37→38 CHG + runHash 面 CHG（Q5）+ EVENT_KEYS/FAULT_CATALOG 面——§5 面④⑦） |

## §9 工作面分解（GTLJ-G2b-01…04）

见 §6 表（四步——01 已完成/02 批准轮/03 oracle+emit+注册/04 实现+parity+adapter+D-12 隔离）。
**A-11 实现轮预授权边界重申（R-B-10 处置）**：CHG-20261120-01 ③ 原文「A-11 TL-001 实现轮
（oracle/golden/C99/parity/adapter 全链——TL-b 联合 RK4）+ D-12 linux64 实施（评估推荐
Docker 路线）——随批准 CHG 派发」——v0.1「linux64 另行 CHG」措辞与台账的口径差已按台账
原文勘正（§6 GTLJ-G2b-04 行 + §0 不做清单）；C99/parity/adapter 链的规格承载 = §1.1/§1.5/
§4 项 7/§6（v0.1 缺口收口）。

## §10 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | sin()/pow() 跨 libm 散差超容差预案（sin 大参数 δ→O(10²) rad 减幅路径分叉 + GT pow 三处） | §4 项 7 预登记 + 注册 δ 域实测冻结 ×≥10 + 超限停下显式 CHG + 禁 ULP 级承诺；先例门值勘正义务登记 |
| R-2 | Q1 裁定翻转（替代形/加项形复活）⇒ 冻结幻影耦合物理 | §1.6 三候选对照表物理复算在案（R-A-02 BLOCKER 论证）；如批准轮采 (a)/(b) ⇒ 架构偏差显式登记 + 评审硬项重议——不静默 |
| R-3 | 联合 dispatch 静默突破 I-3（governor 入内核） | §1.5 分区章实写 + Q4 推荐 + 实现轮评审硬项点名（R-A-04 预警）；gt001_l1.c 头注硬边界原文适用 |
| R-4 | standalone 恒等守卫失效（ZOH 式耦合冻结/stage 取值偏离） | §2.2 三钉条件 = emit/实现轮验收硬条件；ZOH 形态显式排除登记 |
| R-5 | rad 列落 f_Hz_atol 兜底（FCFMU P1-1 形态复刻） | §4 项 5 分派支计划（插入点钉死 + 条件激活 + 零变化证明义务）；emit 轮实读核对硬项 |
| R-6 | \|Δf\|≤1 Hz 域在联合 Run 越界（line_fault 加速段 + sensor_drift 滑差域——A2-1 分域后两域均显式登记） | §3.2① GLJ-7 四域分域断言（标准域越界 emit 拒绝写盘；滑差域独立判据）+ t_clear emit 轮核定 + 域外角点显式登记预案 |
| R-7 | 平衡流形被误读为「联合轨不稳/无稳态」或「唯一稳态」 | §3.3 诚实声明 + 教学表述纪律（「收敛至功率平衡流形」固定句式）+ copy-guard 预查 |
| R-8 | 既有 golden/oracle 字节误触（V-03 哈希失配） | §4 项 12 零触碰清单 + 全量回归兜底（16 golden verify 全绿） |
| R-9 | sensor_drift 滑差拍频被误读为数值不稳定（δ 线性漂移/P_elec 周期摆） | §3.2 物理机理登记（滑差 0.3 Hz 拍频——正确物理）；δ_rad 合法列值声明 |
| R-10 | 步数账/注册面 CHG 打包遗漏 | §5 面⑦ + §8 ⑤ 随批打包清单点名（步账/runHash/EVENT_KEYS/FAULT_CATALOG） |

## §11 评审记录（GTLJ-G2b-02 收口回填——结构留空，体例沿 GT001_FMU §10）

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审线 A（物理/架构面） | 单转子形物理自洽与量纲、EQ 编号对齐、守卫三钉、host 分区、锚点复算、包络、parity 制度 | （待填——v0.1 轮 = FAIL/R-A-01..10，报告 evidence/g2b/TLFMU_G2B_REVIEW_A.md；v0.2 重审待开） | （待填） |
| 评审线 B（治理/八面面） | 八面逐面、键面/夹心章、verify 注册面、golden 治理、哈希面、步数账、copy-guard、门禁序列 | （待填——v0.1 轮 = FAIL/R-B-01..13，报告 evidence/g2b/TLFMU_G2B_REVIEW_B.md；v0.2 重审待开） | （待填） |
| 用户批准 | Q1..Q12 定案 + R-TLFMU-01..03 | （待填） | （待填） |

## §12 Q 点清单（**全候选 + 推荐——不定案**；定案于 GTLJ-G2b-02 批准轮——R-B-06 处置重编）

**RFC Q1..Q7 承接表**：

| RFC Q | 内容 | v0.2 承接 |
|---|---|---|
| RFC Q1 | 联合 Run 合法性 | **已定案**（R-CS-01——方案 (A) 批准，CHG-20261120-01 ①）——不再列为开放 Q |
| RFC Q2 | golden 命名 | **已定案**（R-CS-04——gt_tl_joint_v1 确认）——不再列为开放 Q |
| RFC Q3 | runHash 面 | **Q5**（候选化承接——R-B-06② 缺口收口） |
| RFC Q4 | parity 制度 | **Q6**（v0.1 事实句降级候选化——R-B-06②） |
| RFC Q5 | TL-b 物理域方程 | **Q1/Q2**（本 §1.3/§1.4/§1.6——R-CS-02「G2b 草案轮定案细则」落点） |
| RFC Q6 | 八面影响 | §5 逐面表承载后随 R-TLFMU-02 确认（additive 逐面证据在案） |
| RFC Q7 | 实现排程 | **§13 R-TLFMU-03**（排程裁定项非 Q 点——RFC 原文「批准轮逐裁定」） |

**联合特有 Q 点（TLJ-Q1…Q12）**：

| # | 问题 | 候选 | 推荐（一句话，不定案） |
|---|---|---|---|
| Q1 | **联合耦合构造（核心裁定点——§1.6）** | (a) 单转子形（P_rotor = P_gen + P_bat − P_load − P_elec(δ) + dδ/dt = 2π(f−f₀)、[f,T3,δ] 三维）；(b) 替代形（v0.1 现文）；(c) 加项形 | **(a)**——物理自洽（单转子/真实出口项/SMIB 机制成立）+ 守卫基座更干净（P_elec≡0 精确退化）+ EQ-GTL1-7 涟漪最小；R-A-02 BLOCKER 修正方向；权限 = R-CS-02 草案轮定案细则 |
| Q2 | **TL 参数值与单位制定案（§1.4）** | §1.4 表值候选（S_base=25 kW/V_base=400 V/Z_base=6.4 Ω/X_line=0.5 p.u.=3.2 Ω/V_inf=400 V/δ₀=0/ D 不启用——教学整定 I-5）/ 用户改值（RFC 区间内任取） | **§1.4 推荐值**——P_max=50 kW 设计裕度 2×、基线零出口自洽；X=1.0 角点 23.58° 登记；教学整定声明非实测 |
| Q3 | **联合基线出口口径** | (a) joint_line_fault 用 demand=20 出口基线（δ₀=11.5370°）+ 余 Run demand=30 零出口基线（推荐）；(b) 全 Run 零出口（line_fault 改 load_step+故障复合场景）；(c) 全 Run demand=20 | **(a)**——三相短路功角摇摆需非零出口基线（P_elec 塌陷 10→0 才有加速摆）；零出口下 line_fault 为空操作（物理事实）；联合 oracle Run 级 demand 参数化为新 oracle 自有 spec（GT oracle 零触碰） |
| Q4 | **host 调速器积分器层归属与子步更新序（§1.5）** | (a) 逐字沿袭 Q1(B)——governor 归 host、内核 [f,T3,δ] 纯物理、doStep h=0.01 n=1、u_eff 子步冻结（P_elec stage 现算差异显式登记）；(b) governor 入联合内核 | **(a)**——I-3 硬边界（gt001_l1.c:5-10）+ GTL1 §2.3 分区冻结文本 + Q1(B) 定案先例三重佐证；(b) = 架构偏差须显式登记不推荐 |
| Q5 | **runHash 面（RFC Q3 承接）** | (a) config.systems 数组 additive 进 runHashInput + config_hash 零投影；(b) 联合 cfg 独立 hash 域 | **(a)**——RFC 面③ 判定原文承接；hash 域分裂无语义增量 |
| Q6 | **parity 制度（RFC Q4 承接）** | (a) 联合 RK4 单内核（C99 [f,T3,δ]）+ gt_tl_joint_parity.py 独立机检；(b) 双内核接口 | **(a)**——R-CS-01 方案 (A) 原文 + 三先例（fc001/gt001_fmu）机制全复用；双内核接口复杂无收益（RFC 原判） |
| Q7 | **TL 列集与派生列语义（§4 项 4）** | (a) 30 列：delta_rad/P_elec_kW/omega_rad_s（派生列 ω=2π·f）——P_mech_kW 弃列（≡P_gen_true_kW 冗余）；(b) 31 列：P_mech_kW 留作恒等交叉守卫列；(c) 29 列：omega_rad_s 删列（f 列可代数换算） | **(a)**——RFC §4 预填 30 列对齐（偏差勘正）；评审 A Q4 弃冗余列先例（GTL1 §1.2 π_c 不单独出信号同构）；omega_rad_s 教学可见性保留 |
| Q8 | **joint_gt_standalone 对照语义与守卫载体（§2.2）** | TL 列：(a) 退化积分（δ 照常积分/P_elec≡0 非空可核对）；(b) null 整列 + V-07 双 null；(c) 0 填充（排除 I-2）。守卫载体：(i) GLJ-5 + 实现轮一次性验收证据；(ii) verify_golden 新步 additive；(iii) run-g2 parity 步。恒等口径：同实现 worst\|diff\|=0.0 目标 / 跨语言不承诺 | **(a)+(i)**——退化积分为单转子形下的真实物理（断路器开断 δ 漂移如实记录）；null 列为库内 golden 首例不建议；GLJ-5 零步账涟漪；评审 A/B 两线分歧（A 推退化积分/B 推 null）显式留裁 |
| Q9 | **r_true 门重定义与联合残差门（§2.3）** | (a) 恒等换底 r_true ≡ 0 + r_line 残差作 oracle 自检面（GLJ-2）；(b) r_true 改性失配信号（新容差键）；(c) r_line 立 golden 新列 | **(a)**——r_true_kW 1e-9 gate/分派链零涟漪；失配教学面由 P_rotor_kW（含 −P_elec）+ P_elec_kW 承载；r_line 检查式入 GLJ-2（golden 内建交叉守卫零列开销） |
| Q10 | **容差键命名与 _rad 分派支（§4 项 5）** | 键名：(a) delta_rad_atol / omega_rad_s_atol（推荐——列名同构自明）；(b) 单键 delta_rad_atol 复用两列。分派支：(i) `_rad_s`+`_rad` 双条件支（推荐——插入点 _mL 后、r_true/r_meas 前）；(ii) 单 `_rad` 支 + omega 改名 omega_rad | **(a)+(i)**——量纲各自独立（rad 与 rad/s 不同量纲）；条件激活 + 既有路由零变化证明义务；rad 类指标/标量规避决定（metrics 不立 rad 单位指标、scalars 不立 rad 类标量）随本 Q 附带确认 |
| Q11 | **Run 集范围（§2.1）** | (a) 8 Run 全集（含 joint_actuator_fault/clear/monitor_only 镜像 + joint_line_fault）；(b) 6 Run（去 actuator 镜像）；(c) 5 Run（再去 monitor_only） | **(a)**——评审 A R-A-06：actuator = P_mech 塌陷→δ 大摆天然功角场景 + monitor_only 负控惯例；GT 族镜像补全（3 故障族 + 负控齐） |
| Q12 | **golden 身份面（model_id/inertia_model/RUNS_GROUPS——§1.2/§4 项 5）** | model_id：(a) gt.sync.tl.l0（同族点分——推荐）；(b) tl.transmission.l0（SystemDef id 复用——不推荐，两域混载）；inertia_model 字段：(i) "thermo"（GT 侧物理语义）/(ii) 新联合键；RUNS_GROUPS：(I) flat RUNS 不设组（推荐）/(II) 设联合组 | **(a)+(i)+(I)**——R-B-11 身份面 Q 点化承接；golden.model_id 与 SystemDef id 分域（A-3 自述纪律）；flat RUNS 走 verify_golden 既有 fallback（:597-598）零新分派面；l0 层级注记随 §1.2 落 |
| Q13 | **golden 字段层 model_provenance 档位（B2-2——§1.8/§4 项 8）** | (a) analytical_demo（RFC 面⑤ 承接——golden 字段层无先例，首例新值须显式登记）；(b) **fmu_l1_lumped_unvalidated（推荐）**（golden 层三先例同构——mg001_v2 / gt001_fmu_v1 / fc001_fmu_v1 2026-11-22 实读；联合 golden 骑 GT FMU L1 链——字段注册表同质化）；(c) numerical_simulation（registry.js 枚举——golden 层亦无先例） | **(b)**——golden 字段层与 FMU 轨 sibling 同构（mg001_v2 最近邻先例）；(a) 为 golden 层首例新值（登记负担）；两层枚举域分野注记（registry.js 枚举 ≠ golden 字段值域）随 Q13 附带确认 |

## §13 用户裁定留白章（R-B-06/R-B-13 处置——Q 引用对齐 §12 实际全集）

| # | 裁定项 | 用户裁定 |
|---|---|---|
| R-TLFMU-01 | 本规格 v0.2 是否批准（进入 A-11 实现轮） | （待填） |
| R-TLFMU-02 | **§12 Q1..Q13 定案**（联合特有 Q 全集——Q13 为 B2-2 golden 字段层 provenance 三选一；Q5/Q6 为 RFC Q3/Q4 候选化承接；RFC Q1/Q2 已由 R-CS-01/R-CS-04 定案不再重开；RFC Q7 → R-TLFMU-03） | （待填） |
| R-TLFMU-03 | 排程（**A-11 边界重申**：CHG-20261120-01 ③ v1.17.0 实现轮预授权——oracle/golden/C99/parity/adapter 全链随批准 CHG 派发；**linux64 D-12 隔离声明**：D-12 为平台面独立工作流、随同一批准 CHG 派发、与本轨验收链并行隔离互不阻塞——v0.1「另行 CHG」措辞已按台账勘正） | （待填） |

---

## v0.1→v0.2 处置对照表（双评审 R-A-01..10 / R-B-01..13 逐条处置登记）

| 发现 | 摘要 | v0.2 处置（章节定位） | 状态 |
|---|---|---|---|
| R-A-01 | δ/ω 单位制三义 + TL 参数表整体缺失（无值/无单位/无基值/V_gen 弃用/初值缺失） | §1.3 单位制声明（全 SI/ω₀≡f₀/2π 因子）+ §1.4 参数字典（基值表+逐参数值+IC 表+角点）+ TL-EQ-5 恢复（§1.3） | 已落实 |
| R-A-02 | 双转子 + P_elec 幻影对消（SMIB 核心物理缺失）——BLOCKER | §1.3/§1.6 单转子形重稿（[f,T3,δ] 三维/P_rotor 加项式/dδ/dt=2π(f−f₀)）——构造作为候选提交 Q1/R-TLFMU-02 | 已落实 |
| R-A-03 | 逐位恒等守卫欠规格（三钉/对照对象/口径未定） | §2.2 守卫章（三钉条件表 + 对照映射表 + 恒等口径 + ZOH 显式排除） | 已落实 |
| R-A-04 | host 调速器积分器面（Q1(B) 继承）零写明 | §1.5 分区章（对照 gt001_fmu_oracle.py:371-406 / gt001_l1.c:5-10,:192-225 实写）+ Q4 | 已落实 |
| R-A-05 | GT 27 列耦合语义审计缺失 + r_true ≡ 0 门崩 | §2.3 审计表（25 不变/1 改写/1 门重定义）+ r_true 二选一候选 + r_line 残差门 → Q9 | 部分（审计表落实；门重定义转 Q9——任务书明示设 Q 点） |
| R-A-06 | 缺 TL 侧故障面（三相短路缺位）+ GT 族镜像不全 | §2.1 Run 矩阵扩容（joint_line_fault 新族 + actuator/clear/monitor_only 镜像提案）+ 事件键登记计划（§2.5）+ Q11 | 已落实 |
| R-A-07 | golden 计划缺口（oracle 文件/容差键/units/事件编码/parity/元数据/命名注记） | §4 项 1–8 全承载（oracle 计划/键面/units 增 rad/事件面/parity/元数据/model_id l0 注记 §1.2） | 已落实 |
| R-A-08 | joint_gt_standalone TL 列内容未定（null/0/退化积分三选） | §2.2 TL 列语义三候选 + 推荐退化积分口径（δ 真实漂移非空可核对）→ Q8 | 部分（推荐写入；定案转 Q8） |
| R-A-09 | sin() 散差：措辞超前 + 大参数域义务 + 先例门值字面不符 | §4 项 7（「预登记」措辞勘正 + δ O(10²) rad 域实测义务 + PARITY_RTLIM 勘正/豁免登记义务） | 已落实 |
| R-A-10 | 联合 Run 有效域/包络重登记（\|Δf\|≤1 Hz 重验/δ 域/失步合法/u=0 重查/limitations 成文） | §3.2 包络登记五项 + §3.3 流形声明 + §1.8 assumptions/limitations + GLJ-7 内嵌断言（§4 项 6） | 已落实 |
| R-B-01 | 授权必交付章缺失（键面+三层夹心）+ 约 15 章结构缺口——BLOCKER | 全文 v0.2 扩容：§1.1 三层夹心 + §1.7 键面 + §1.2 身份面 + §1.4 参数面 + §1.8 Epistemic + §2.4 哈希面 + §2.5 事件面 + §2.6 比对面 + §3 锚点包络 + §7 红线自查（含 copy-guard 预查）+ §8 进入条件 + §9 工作面 + §10 风险 + §11 评审记录留空 + §6 门禁序列——章节结构与 GT001_FMU_G2B_SPEC_APPROVED 同构 | 已落实 |
| R-B-02 | 八面影响一句口号、六面零落实——BLOCKER | §5 八面逐面承载表（RFC §5 八面 × 落点章 × additive 声明 + 面③④⑤⑥⑦⑧各自落点/缓做登记） | 已落实 |
| R-B-03 | verify_golden 注册计划零声明 + δ_rad/ω_rad_s Hz 容差静默量纲错型 | §4 项 5 注册计划（`_rad_s`/`_rad` 条件支+插入点钉死+键名+MODELS 四件套+DEFAULT_MODELS 九→十+RUNS_GROUPS 声明+V-06/metric 登记面+零变化证明义务）+ Q10 | 已落实 |
| R-B-04 | EQ 编号同号异义（v0.1 EQ-TL-3/4/5 ≠ RFC TL-EQ-1/2/3）+ RFC TL-EQ-5 整体缺失 | §1.3 同号同义冻结表 + v0.1 废弃编号映射处置表 + TL-EQ-4/5 补全（溶解登记/恢复承接） | 已落实 |
| R-B-05 | TL 参数值缺失（Q2 仅 sourcing 声明、无值可裁） | §1.4 参数字典（逐参数值+单位+依据+I-5 句式+有效性域）+ §3.1 稳态设计点校核 + Q2 | 已落实 |
| R-B-06 | Q 清单/留白章双缺口（幻引 Q7/RFC Q3·Q4 未承接/调速器积分器未列 Q/事实句先行定案） | §12 Q 重编（承接表 + TLJ-Q1..Q12 全集——Q4/Q5/Q6 对应缺口收口）+ §1.3 数值方法句候选化（Q6 承接）+ §13 R-TLFMU-02 引用对齐实际全集 | 已落实 |
| R-B-07 | joint_gt_standalone 三缺口（TL 列语义/混载先例/守卫载体+sensor_drift 映射不成立） | §2.2 守卫章（列语义三候选→Q8 + 对照映射表 + 守卫范围修正声明（sensor_drift 缺口）+ 恒等口径条件化 + 守卫载体三选→Q8 + 混载先例豁免登记（扩展对照候选显式化）） | 已落实 |
| R-B-08 | V-03/I-9 出生接入声明缺失 | §4 项 2（oracle_base 六成员 + resolve_run_spec + LF 钉死 + approval 三字段 + V-03/V-03b 口径 + SERIES_IDS 含 "t" 注记 + I-9 独立成文义务） | 已落实 |
| R-B-09 | 事件面登记缺失（TL 故障族不立项不缓做 + 挂载面未定义） | §0 不做清单双向登记（三相短路立项/过载缓做）+ §2.5 事件面章（EVENT_KEYS +1 计划 + FAULT_CATALOG §9 + 授权守卫行 + 联合事件挂载口径） | 已落实 |
| R-B-10 | A-11 边界措辞冲突（linux64 同波 vs 另行 CHG）+ C99/parity 链无规格承载 + pow 散差未登记 | §0/§6/§9 措辞对齐台账（「随批准 CHG 派发」+ D-12 并行隔离声明）+ §1.1/§1.5/§4 项 7 C99/parity 承载 + pow 双源预登记 | 已落实 |
| R-B-11 | model_id 身份面未登记（惯例归属/V312 承接/scope/l0 语义/Q 点化） | §1.2 身份面章（命名同构/第三形态声明/准入承载/scope 推定/l0 注记）+ Q12 点化 | 已落实 |
| R-B-12 | 命名细项（希腊字母/配对语义/30 vs 31 列/不变式引文悬空） | §4 项 4（ASCII 化 + 配对语义声明（§2.3）+ 30 列对齐 RFC 勘正注记）+ §4 项 8（张力实锚 face② 惯例面） | 已落实 |
| R-B-13 | 门禁序列未在草案写明 | §6 门禁序列声明（双评审→用户批准→A-11 + I-4 纪律）+ §13 R-TLFMU-03 | 已落实 |

**处置统计**：23 条 = 已落实 21 / 部分 2（R-A-05、R-A-08——承载章落实、残余定案经 Q9/Q8）/ 
转 Q 点 0（全部 23 条均有章级承载；残余用户裁定统一经 §12 Q1..Q13 + §13 R-TLFMU-02 承载
——DRAFT 治理语义「Q 点全候选 + 推荐 不定案」）。

**重审轮处置对照（v0.2 双重审 R-A2-01..03 / R-B2-01..03 逐条——v0.3 落正文登记）**：

| 发现 | 摘要 | v0.3 处置（章节定位） | 状态 |
|---|---|---|---|
| R-A2-01 | GLJ-7 全 8 Run max\|Δf\|≤1.0 硬断言与 joint_sensor_drift 闭环滑差物理冲突（滑差域合法越界无 fallback）——MAJOR | §3.2① GLJ-7 四域分域断言（结构恒等域 Δf≡0 / 标准域 ≤1.0 硬断言 / 滑差域独立判据 f_avg≈49.7±登记带宽+\|Δf\|≤1.5 域外角点 / 故障窗域随 t_clear 核定）+ §4 项 6 GLJ-7 定义行同步 + 风险表 R-6 行同步 | 已落实 |
| R-A2-02 | load_step 终点预填方向倒置（精确恒等式 u_end = 25 − (δ_end−δ₀)/π 证明 v0.2 预填 δ_ss>0/u_ss>32.5 不可达）——MINOR | §2.1 joint_load_step 行 + §3.2 锚点预填行勘正（δ_ss≈−11.4° 线路进口域 / u_ss≈25.06 governor 近冻结 / P_elec_ss≈−9.9 kW——精确值 emit 冻结纪律不变） | 已落实 |
| R-A2-03 | INFO 项 | 随 A2-1/A2-2 落正文覆盖 | 已落实 |
| R-B2-01 | 三处实读锚点行号漂移（run_hash / V_BUS / copy-guard——语义主张全部成立）——MINOR | §1.4 V_BUS :89→:158 + §4 项 2 run_hash :302-309→:425-434 + §7.2 copy-guard :30-59→:30-52/:56（语义零改动） | 已落实 |
| R-B2-02 | model_provenance="analytical_demo" golden 字段层无先例（最近邻 sibling mg001_v2 实测 fmu_l1_lumped_unvalidated）——MINOR | §1.8 provenance 行 B2-2 注记 + §4 项 8 转三选一裁定 + §12 新增 TLJ-Q13（推荐 (b) fmu_l1_lumped_unvalidated）+ §13 R-TLFMU-02 全集 Q1..Q13 + §5 面⑤ 行同步 | 已落实 |
| R-B2-03 | v0.2 日期戳 2026-11-20 早于双评审报告日期（时间线倒挂）——INFO | 修订记录 v0.3 台账注记：v0.1/v0.2 成文随 CHG-20261120-01 授权日 2026-11-20 记，双评审与 v0.3 实际执行 2026-11-22——跨日执行链口径（非缺陷） | 已落实（注记口径） |

---

**修订记录**：
- **v0.3（2026-11-22，重审轮条件落正文——A-10 轮内，零实现承诺维持）**：v0.2 双重审
  PASS-WITH-CONDITIONS(2)+(2)（评审 A：R-A-01..10 全解决 + 新 R-A2-01..03；评审 B：
  R-B-01..13 全解决 + 新 R-B2-01..03）的四条件全落正文——① GLJ-7 Δf 断言四域分域
  （A2-1：结构恒等域 Δf≡0 / 标准域 ≤1.0 硬断言 / 滑差域 joint_sensor_drift 独立判据
  f_avg≈49.7±登记带宽 + \|Δf\|≤1.5 域外角点 / 故障窗域随 t_clear 核定）；② load_step 终点
  预填方向勘正（A2-2：精确恒等式 u_end = 25 − (δ_end−δ₀)/π → δ_ss≈−11.4° 线路进口域 /
  u_ss≈25.06 / P_elec_ss≈−9.9 kW——v0.2 δ_ss∈(0°,11.5°)/u_ss>32.5 方向倒置废弃）；③ 三处
  实读锚点行号校正（B2-1：:158 / :425-434 / :30-52/:56——语义零改动）；④ golden 字段层
  model_provenance 转 TLJ-Q13 三选一显式裁定（B2-2——推荐 fmu_l1_lumped_unvalidated 三先例
  同构）；⑤ 时间线台账注记（B2-3：v0.1/v0.2 随 CHG-20261120-01 授权日 2026-11-20 记、
  重审与 v0.3 实际执行 2026-11-22——跨日执行链口径）；⑥ Q 全集 Q1..Q12→Q1..Q13（§12/§13/
  §5/§6 同步）。零代码、零 golden、零 oracle、零脚本改动（纯文档面——只写本文件）。
- **v0.2（2026-11-20，A-10 轮内重稿——CHG-20261120-01 ② 授权链）**：v0.1 双评审一致 FAIL
  （R-A-01..10 / R-B-01..13）后的扩容重稿——① 单转子形重稿（R-A-02：废弃双转子/幻影耦合，
  [f,T3,δ] 三维 + P_rotor 加项式 + δ 受驱角态）；② 单位制与参数字典（R-A-01：全 SI + 基值表
  + IC 表 + 角点勘正 + TL-EQ-5 恢复）；③ EQ 编号对齐 RFC 同号同义 + 废弃映射处置表（R-B-04）；
  ④ host 调速器积分器分区章（R-A-04/B-06——对照实写 + Q4）；⑤ joint_gt_standalone 守卫章
  （R-A-03/B-07——P_elec≡0 解耦语义 + 三钉 + 映射表 + 列语义/载体 Q8）；⑥ Run 矩阵扩容
  8 Run（R-A-06——joint_line_fault 新族 + GT 族镜像补全 + 事件键计划）；⑦ r_true 门重定义
  候选 + 27 列审计表（R-A-05——Q9）；⑧ golden 计划扩容（R-A-07/B-03/B-08/B-12——30 列
  schema + delta_rad_atol/omega_rad_s_atol 键面 + `_rad_s`/`_rad` 分派支计划 + MODELS/
  DEFAULT_MODELS/RUNS_GROUPS + parity 计划（sin 预登记/pow 双源/先例勘正）+ V-03 出生接入
  + 元数据面）；⑨ 章节同构扩容 16 章（R-B-01——键面/三层夹心/身份面/哈希面/事件面/比对面/
  锚点包络/红线自查/进入条件/工作面/风险/评审记录/门禁序列全补齐）；⑩ 八面逐面承载表
  （R-B-02）；⑪ Q 点重编 Q1..Q12 + 留白章修正（R-B-06/B-13——幻引 Q7 勘正、RFC Q3/Q4
  候选化承接、linux64 D-12 措辞对齐台账 R-B-10、事件面双向登记 R-B-09、身份面章 R-B-11、
  命名细项 R-B-12）。零代码、零 golden、零 oracle、零脚本改动（纯文档面——只写本文件）。
- v0.1（2026-11-20 初稿，85 行）：联合 RK4 冻结表草案（双转子形 [f,T3,δ,ω]——后被 v0.2
  废弃）/ Run 矩阵 4 Run / golden 计划骨架（31 列）/ Q1..Q6 / 留白章。双评审 R-A/R-B
  一致 FAIL（处置路径 = 本 v0.2）。

**文件结束**。TL001_FMU_G2B_SPEC_DRAFT v0.3（2026-11-22，A-10 轮内重稿 + 重审条件落正文，
CHG-20261120-01 ②授权链——v0.1 双评审 FAIL → v0.2 扩容重稿 → v0.2 重审双线
PASS-WITH-CONDITIONS → v0.3 四条件全落正文；零实现承诺；批准留待用户——R-TLFMU-01..03 +
Q1..Q13 定案为 GTLJ-G2b-02 批准登记前置）。
