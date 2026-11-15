# FC001_FMU_G2B_SPEC_APPROVED — FC-001 5 态 L1-FMU G2b 物理规格（APPROVED v1.0）

> **状态**：`APPROVED v1.0（2026-11-15，FCFMU-G2b-02 批准轮收口，CHG-20261115-10）——
> 双路独立评审（A:PASS_WITH_CONDITIONS(7) / B:PASS_WITH_CONDITIONS(3)）+ 用户书面批准
> （2026-11-15 v1.9.0 承接清单 + G9 emit 前置 AskUserQuestion 裁定「收口批准轮后 emit」
> 指令链）+ 条件 A-1…A-7/B-1…B-3 落正文（§10.2）+ Q1…Q18 定案（§11）。
> 由 DRAFT v0.1 批准收口更名（原 FC001_FMU_G2B_SPEC_DRAFT.md——git mv 更名先例
> GT001_COMBUSTION_G2B_SPEC_APPROVED 同款）。实现（FCFMU-G2b-03 oracle emit /
> G2b-04 C99 编译）随用户逐版本指令派发；C99 编译环境裁定 = Q10（本波复测阻塞维持）。
> **任务**：V170 波阶段一 W1（G9 FC-001 5 态 FMU G2b 草案——本波唯一 G2b 名额）。
> **授权**：V170_WAVE_DESIGN v1（CHG-20261115-04，2026-11-15，DEC-1…5 全采推荐项）DEC-1；
> 上游授权 = G9_G10_ARCH_GATE_SPEC_DRAFT.md 落档（CHG-20261114-06：用户双裁定——① FC 物理
> 处置「降级 DRAFT 走 G2b 草案 + 双路评审，批准轮收口后方可实现」；② golden 走新 id
> `fc001_fmu_v1`，不撞既有 12 golden 字节冻结）。**原文自带 APPROVED 状态已降级 DRAFT**
>（落档头声明——外部 spec 的 APPROVED 在本仓治理链不自动生效；本草案即该降级处置的
> G2b 化兑现，批准记录待 FCFMU-G2b-02）。
> **外部 spec 与逐字保留声明（2'）**：`SPEC-V0.5-G9-G10-APPROVED` 原文（G9 §2 全部）以落档
> 文件 `FaultLab-evaluation/NEXT/G9_G10_ARCH_GATE_SPEC_DRAFT.md`「原文（逐字保留，未修订）」
> 节为附录引用——本草案为 G9 原文的仓内 G2b 化转写，原文正文不复制全文、以落档文件为唯一
> 原文载体；物理内容（方程/参数/稳态点/Run 矩阵/因果/白名单/验收判据）逐字转写不改值；
> 命名/结构/行数差异一律登记 Q 点（§11）或勘误（映射表注记列），不静默改写。逐条映射表见下。
> **本波边界**：本草案只到「草案 + 双路独立评审」（W2a 物理/数值 + W2b 治理/契约面，互不可见，
> 结论由 W4 代录 §10）；不定实现、零代码/golden/oracle 触碰（I-4）。
> **前置与先例**：G2b 体例 = FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0（§0-§11）；键面先例 =
> B-1a 显式键（FC Q9 定案 / scenario.js:419-436）+ 组合键 capacity_model（FLCAP——前置键 +
> onTrackOnly + additive 子对象）；准入先例 = V312（FROZEN——B-4「FMU 各自另批」、Q-5
> manifest 准入）；FMU 在位面 = tools/backend/py/{fmu_runner.py 骨架（D-27）,
> fmu_admission.py（A-1…A-5）, bridge.py（回环+token）}——2026-11-15 实读。
> **行号基准说明**：本文行号为起草时点（2026-11-15）实读值（关键复核点：copy-guard.mjs:15
> SCOPES=['src'] / :30-45 BANNED 39 模式**不含**水位/液位/water level/liquid level / :48-61
> ALLOW 14 条；scenario.js:40 FEEDBACK_MODES=['closed_loop','monitor'] / :52 EVENT_KEYS 已含
> feedback_mode；verify_golden.py:278 DEFAULT_MODELS 五成员 / :320-321 `_kPa` 支既有、T-B
> 分派链**无 `_mL` 支与无量纲支** / V-09 事件比对；registry.js:111/:254 provenance；
> engine.js:551 model_provenance='analytical_demo'；scope.js:44-52 FC 族四条件；CONTRACT.md
> §4.6「严格 601 点」冻结面；data/golden/ 12 .json 实读；fc001_v2 结构实测 n=601、EV-*-pre
>（left_limit）/EV-*-post（post_sample）；fmu_admission.py manifest 八字段）。实现轮以语义
> 锚点定位；批准轮实读复核后加注不改引文（FC 体例 A-7 同款）。

## 原文 → 本草案逐条映射表（2' 承诺面）

| G9 原文节（落档文件） | 内容 | 本草案落点 | 转写注记 |
|---|---|---|---|
| §1 表 G0-V05-DEC-01…05 | 五项架构裁定 | §0 / §1.1 / §6.1（I-1/I-3） | 全采承接；DEC-03 禁词增补 = Q11 |
| §2.1 三层夹心架构 | C99 内核 / ctypes host / bridge+兜底 | §1.1 / §1.2 | 「602 rows」表述 = Q1 裁定点 |
| §2.2.1 五状态方程 | State 1…5 | §1.3 EQ-FCFMU-1…5 | 逐字转写；nom 常量缺口 = Q16 |
| §2.2.2 代数输出 | p_vap…η_sys 八式 | §1.3 EQ-FCFMU-6…13 | 逐字转写 |
| §2.2.3 传感/控制/残差 | 测量四式/控制两式/观测两式/残差两式 | §1.3 EQ-FCFMU-14…23 | u_an 缺口 + 残差两口径 = Q16（编号归并面零——23 条独立编号） |
| §2.2.4 参数字典 | 19 参数冻结值 | §1.4 | 逐字转写（值零改动） |
| §2.3 标称稳态点 | 19 变量解析精确值 | §3.1 | 逐字转写（值零改动） |
| §2.4 5 Run 矩阵 | FC-Run-1..5 | §2.1 | 族名/键值映射 = §2.1 映射列 |
| §2.5.1 6 节因果 | FC_RULE_01..06 | §2.4 | 逐字转写（causal-rules.js 注册面） |
| §2.5.2 跨保真白名单 | cross_fidelity_l0_vs_l1_fmu | §2.5 | provenance 新值 = Q2 裁定点 |
| §3（G10 全部） | Arena L2 / MCP / N-B18..20 / V-11 | **不在本草案** | 顺延 v1.8.0（V170 DEC-3）；勘误⑦ 预算常量协议附记随 G10 面 |
| §4.1 变更矩阵 G9 行 | 7 工件 Create/Update | §1.2 / §8 | fmu_runner 路径映射（原文 tools/backend/ vs 仓内 tools/backend/py/）已登记 |
| §4.2 验证命令 | G9 命令面 | §4 项 11 / §8 | 逐字承接 |
| §4.3 R-G9-01…04 | 门禁验收判据 | §4 项 10-11 / §7 | R-G9-01 = S3 位级面（V170 W3 主线承载）——非本规格工作面 |
| epistemic declaration（§2 头引言块） | 诚实性与数据来源声明 | §1.8 / §6.1（I-2） | 逐字转写为冻结表草案 |
| 勘误头七项契约面预裁定 | ①…⑦ | §0 承接表 + §11 | 逐项承接，见 §0.1 表 |

---

## 0. 本规格边界（做/不做）

- **做（本草案 = G9 §2 的仓内 G2b 化转写草案面）**：三层夹心架构与工件面（§1.1/§1.2）、
  EQ-FCFMU-1…23 方程冻结表草案（§1.3——Q4 编号不定案）、19 参数字典转写（§1.4）、两核心
  裁定点（601/602 行 §1.5、model_provenance 新值 §1.6——候选对照 + 推荐，**不定案**）、
  键面登记（§1.7）、epistemic declaration 转写（§1.8）、5 Run 矩阵转写与 actuator 语义
  裁定点（§2.1/§2.2——Q3 不定案）、白名单与哈希面登记（§2.3）、6 节因果与跨保真白名单
  转写（§2.4/§2.5）、标称稳态 19 变量表转写（§3.1——全部解析精确值）、动态轨迹结构预填
  （§3.2——数值一律批准轮 emit 冻结）、golden 计划（§4）、排期（§5）、红线自查（§6）、
  五项进入条件（§7）、工作面分解（§8）、风险（§9）、评审记录留空结构（§10）、Q 点清单
  （§11——全候选 + 推荐，**不定案**）。
- **不做（本草案显式排除）**：
  1. **本波只到草案 + 双路评审**：实现 v1.8.0（C99 内核编译 / fmu_runner 扩展 / bridge 接线 /
     adapter / oracle / emit）全部留批准轮后（§8 FCFMU-G2b-03/04）；编译环境（工具链/平台
     矩阵）批准轮裁定（Q10）——本草案不定实现。
  2. **golden 零触碰**：fc001_fmu_v1 为新 id（用户裁定 CHG-20261114-06），emit = 批准轮后
     FCFMU-G2b-03；既有 12 golden（fc001_v1/v2、fl001_v1/v2/v3、gt001_v1…v4、mg001_v1、
     pv001_v1、wt001_v1——2026-11-15 实读；计数偏差注记 B-2④：台账裁定原文无计数、落档
     勘误三写「11 golden」（2026-11-14 时点准确）、v1.6.0 gt001_v4 入库后 2026-11-15 实读
     现值 12）字节冻结零变更。
  3. **G10 不做**：Arena L2 / MCP server / N-B18..20 / V-11 全部不在本草案（顺延 v1.8.0——
     V170 DEC-3；勘误⑦ 预算常量协议附记随 G10 面登记）。
  4. **L2 不做沿袭**：CFD/FEA/多体动力学维持不做（FC §0 项 1 沿袭——三处原文引用维持，
     本轨不重引不放松）；L3+ 不设。
  5. **I-1 零依赖定位**：C99 FMU 内核为 **backend 工件**（tools/backend/fmu/——开发/评审
     环境编译产物），**非产品依赖**；浏览器前端零依赖维持（G0-V05-DEC-01——file:// 离线
     模式走静态预烘焙 golden run 兜底，零编译依赖零构建步骤）；oracle stdlib（python -I）；
     fmu_runner/bridge 仅标准库（实读）；编译工具链 = 环境工具非运行时依赖（Q10 登记）。
  6. **本轮不动清单**：tools/backend/** / tools/oracle/** / src/** / data/** / scripts/**
     全部零触碰（均为批准轮后显式工作面）；不引入第三方依赖（I-1）；S3 收口（V170 W3
     主线）与本草案文件面互不相交。
- **FC-001 FMU 轨现状基线（2026-11-15 实读登记）**：FC-001 现有 L0（fc001_v1——纯解析轨）
  + L1 电化学-热轨（fc001_v2——electrochem_model=on，RK4 dt0.01），均非 FMU；FMU 5 态空间
  PEMFC（52 V/100 A/80 cell、微重力膜分离器、N₂ 累积）为**第三轨新物理**（勘误三口径）；
  fmu_runner.py 为最小 ctypes 加载器骨架（FMI 2.0 CS 接口已定义——D-27：doStep 路径待实际
  FMU 样本验证；V140 不做清单 D-3「FMU 样本未到」由本 spec 解锁）。

### 0.1 勘误头七项契约面预裁定承接表（落档头「契约面预裁定待办」逐项）

| # | 预裁定（原文） | 本草案落点 |
|---|---|---|
| ① | 602 行（20.0⁻/20.0⁺ 双边界行）vs CONTRACT.md 冻结「严格 601 点」须裁定 | **核心裁定点一** §1.5 / Q1（推荐 601 点 + 事件快照相位承载） |
| ② | EvidenceBundle v1.1 fmu_sha256 additive 五哈希零变化证明 | §2.3 哈希面 + §8 FCFMU-G2b-04（随实现交付证明） |
| ③ | V312 FROZEN 清单钉 hash 须 CHG | §2.3 + Q17（fmu_sha256 钉 hash = 批准轮 CHG 项） |
| ④ | run-g2 步预算 ≤35 扩账（I-7） | §2.3 / Q17（parity 步新增显式申报——批准轮裁定步账） |
| ⑤ | feedback_mode 等新 scenario 键走 B-1a 显式键 + 零投影纪律 | §1.7 键面 / §2.3（B-1a 显式键条件式 + config_hash 零投影） |
| ⑥ | copy-guard 新词（水位/液位/water level/liquid level）作用域限 FC-001 L1 域；本仓 MG=microgrid≠microgravity | §6.3 预查表 / Q11（增词 = additive——实读 BANNED 39 模式不含四词、src/** 0 命中） |
| ⑦ | arena L2 预算常量（B_max=180/B_min=45）协议附记 | 不在本草案（G10 面——V170 DEC-3 顺延；映射表已登记） |

## 1. 模型形态

### 1.1 三层夹心架构与认知分离（G9 §2.1 逐字转写 + I-3 认知分离登记）

保真原则（原文）：在不把事件相位分裂逻辑复制进编译 C 二进制的前提下，维持 true/measured/
derived 三层信号严格分离——G9 强制三层夹心架构：

| 层 | 工件（G9 §4.1 原文路径） | 职责（认知分离边界） |
|---|---|---|
| **内层——纯物理装置 FMU** | `tools/backend/fmu/fc001_l1.c`（Create）+ `tools/backend/fmu/modelDescription.xml`（Create——FMI 2.0 变量字典与 VR 契约）；编译为平台共享库（.dll/.so/.dylib）并打包 FMI 2.0 Co-Simulation 档案 `data/fmu/fc001_l1_v1.fmu` | C99 标准编写、零外部依赖；内联固定步长 RK4 积分 5 个物理微分状态（内部子步 δt=0.01 s、通信步 Δt=0.1 s）；**只暴露 input 变量（负载电流/阀指令/执行器健康因子）与 true 物理状态/代数输出（exposure="sealed"）**——只出 sealed 真值 |
| **中层——Python ctypes host 与 I-11 壳** | `tools/backend/fmu_runner.py`（Update——仓内实位 tools/backend/py/fmu_runner.py，原文路径映射登记；骨架现状 D-27） | 加载 FMU 二进制前校验 SHA-256（对 V312 清单）；承载**传感污染**（t=20.0 s 阶跃偏置 b 注入）、**控制反馈模式**（closed_loop/monitor_only/baseline）、**代数一致性残差**（r_meas_p_kPa/r_meas_water_mL）；执行精确**事件 pre/post 左极限分裂**：0→20.0 s 无扰推进记录 pre 行（phase="pre", derivation="left_limit"）；20.0 s 施加故障参数突变、零步长（dt=0）求代数输出（微分状态 C⁰ 连续、传感测量/比例控制指令/测量残差显精确阶跃）记录 post；此后 Δt=0.1 s 定步积分至 60.0 s（原文：每 Run 恰 602 行——**行数契约面 = Q1 裁定点**） |
| **外层——HTTP bridge 与预烘焙兜底** | `src/core/plants/fc001-fmu-adapter.js`（Create——I-11 plant adapter 形态） | 开发/评审模式连接本地 Python HTTP bridge（bridge.py 既有安全边界：127.0.0.1 回环 + Origin 白名单 + token——实读）；file:// 离线模式加载**经验证的静态 golden run 档案**（预烘焙兜底——前端零依赖维持）；承载协议面（请求/响应/schema） |

**认知分离声明（I-3）**：FMU 内核只承载物理真值（sealed 标识）；传感污染/控制反馈/残差/
协议分属 host 与 bridge——任何一层不得越层承载（如 C 内核内嵌事件分裂或传感偏置 = 违反
本架构，实现轮评审硬项）。

### 1.2 工件与模型身份面（V312 B-4/Q-5 准入承接）

- **FMU 各自另批（V312 B-4 适用）**：本规格即 FC-001 FMU 的「各自另批」批准载体——批准轮收口
  （FCFMU-G2b-02）方得实现；V312 准入机检面（fmu_admission.py A-1…A-5 实读）沿用：zip 结构 + modelDescription.xml + binaries/<platform>/ + model_manifest.json 八字段齐备 + model_id 自述（禁借用既有系统 id——A-3 禁令对 FC-001 同构适用）。
- **模型身份（Q13 复合）**：FMU 轨 model_id 须自述新值（候选 `fc.pem.fmu_l1` / `fc.pem.l1_fmu`——推荐前者；不用 fc.pem.l0——model_hash 自述一致性检查防失真；行号时点注记 B-2②：原引 engine.js:1407 系 V312 §7 / fmu_admission A-3 沿承的陈旧快照（7aed9f6 时点 :1395-1397），现行位 engine.js:3386-3388——语义锚 = model-hash 比对检查，推荐结论不受影响，独立依据为 fmu_admission.py A-3 自述禁令）；model_version 批准轮定（**定案 = '1.0.0'**——FMU 轨首版新 id，model_version 面先例：fc001_v2 1.1.0 系既有轨演进位、新轨首版取 1.0.0；见 §11 Q13）。
- **provenance 准入面张力登记**：fmu_admission.py A-4 现行要求 manifest provenance 标 `numerical_simulation` + self_declared=true（Q-5——未批样本黑盒准入语境）；G9 为已批 FC-001 L1-FMU 轨设专用新值——两轨关系 = 核心裁定点二（§1.6/Q2）。
- **D-27 解锁声明**：fmu_runner.py 骨架自评 FR-3 明载「doStep 路径待实际 FMU 样本验证」——本轨实现（FCFMU-G2b-04）即 D-27 的解锁兑现面；实现轮须以本轨 FMU 实测关闭 D-27（不虚设）。

### 1.3 方程登记（EQ-FCFMU-1…23 冻结表**草案**——编号方案 = Q4 不定案；物理内容 = 原文逐字转写）

5 态集总参数 ODE（5.0 kW 净输出空间 PEMFC 电堆、N_cell=80、名义 I_load=100.0 A）：

| id | 方程（转写自 G9 §2.2.1/2.2.2/2.2.3——值与结构零改动） | 说明 |
|---|---|---|
| EQ-FCFMU-1 | dp_O2_ca/dt = G_O2_in·α_o2·u_o2 − k_O2_react·I_load − (p_O2_ca − p_O2_nom)/τ_ca | State 1 阴极氧分压（kPa） |
| EQ-FCFMU-2 | dp_N2_ca/dt = k_N2_accum·(u_o2_nom − α_o2·u_o2) − (p_N2_ca − p_N2_nom)/τ_N2 | State 2 阴极氮分压（kPa） |
| EQ-FCFMU-3 | dp_H2_an/dt = G_H2_in·u_an − k_H2_react·I_load − (p_H2_an − p_H2_nom)/τ_an | State 3 阳极氢分压（kPa，喷射器微循环） |
| EQ-FCFMU-4 | dV_water_store/dt = q_cond·I_load − q_drain_max·α_drain·u_drain | State 4 微重力被动膜分离器储水体积（mL）——G0-V05-DEC-03：只用水体积与容量比 |
| EQ-FCFMU-5 | dT_stack/dt = (1/C_th)·(((N_cell·E_LHV − V_stack_true)·I_load)/1000 − h_cool·(T_stack − T_cool_in)) | State 5 电堆集总温度（K） |
| EQ-FCFMU-6 | p_vap_ca = 30.0 + 1.2·(T_stack − 343.15) | 阴极单相水蒸气分压（kPa） |
| EQ-FCFMU-7 | p_ca_true = p_O2_ca + p_N2_ca + p_vap_ca | 阴极总压（kPa，true） |
| EQ-FCFMU-8 | y_O2_true = p_O2_ca / p_ca_true | 阴极氧摩尔分数（无量纲，true） |
| EQ-FCFMU-9 | θ_cap_true = V_water_store / V_cap_max | 分离器储水容量比（无量纲，true） |
| EQ-FCFMU-10 | V_stack_true = 52.0 + 40.0·(y_O2_true − 0.60) − 10.0·max(0, θ_cap_true − 0.40) − 35.0·(max(0, θ_cap_true − 0.60))² + 0.08·(T_stack − 343.15) | 电堆端电压（V）——氧稀释线性项 + 容量比分段饱和项（一次/二次）+ 温度项 |
| EQ-FCFMU-11 | P_gross_kW = V_stack_true·I_load/1000 | 电堆毛功率（kW） |
| EQ-FCFMU-12 | P_net_kW = P_gross_kW − P_aux_kW | 净功率（kW） |
| EQ-FCFMU-13 | η_sys_true = 100.0·P_net_kW / P_H2_LHV_kW | 系统净效率（%） |
| EQ-FCFMU-14 | p_ca_meas = p_ca_true + b_p_ca·𝕀(t ≥ t_fault ∧ phase ≠ pre) | 传感测量（source_kind="measured"，exposure="blind_observable"） |
| EQ-FCFMU-15 | V_water_meas = V_water_store + b_V_water·𝕀(t ≥ t_fault ∧ phase ≠ pre) | 同上（mL） |
| EQ-FCFMU-16 | V_stack_meas = V_stack_true | 电压通道无偏置（原文） |
| EQ-FCFMU-17 | T_stack_meas = T_stack | 温度通道无偏置（原文） |
| EQ-FCFMU-18 | baseline / monitor_only 域：u_o2 = u_drain = u_an = 0.50 | 控制律（source_kind="derived"，blind_observable）——恒定标称指令 |
| EQ-FCFMU-19 | closed_loop 域：u_o2 = min(0.95, max(0.05, 0.50 − 0.01·(p_ca_meas − 200.0)))；u_drain = min(0.95, max(0.05, 0.50 + 0.002·(V_water_meas − 200.0))) | 比例反馈（对受染测量）；**u_an 于 closed_loop 域原文未显式——草案按「维持 0.50」转写并登记，批准轮裁定（Q16）** |
| EQ-FCFMU-20 | p_N2_est = 50.0 + (200.0 − p_ca_meas)·(−0.35) | 阀指令积分亏空估计的阴极氮累积指数（kPa）——标称点 = 50.0（原文恒等） |
| EQ-FCFMU-21 | θ_cap_est = V_water_meas / V_cap_max | 估计储水容量比（无量纲） |
| EQ-FCFMU-22 | r_meas_p = p_ca_meas − p_ca_true = b_p_ca·𝕀(t ≥ t_fault) | 测量一致性残差（kPa）——原文注「经开环流量平衡」；FC_RULE_06 口径 = x_meas − x_ref（标称点两口径等价、故障局水平分歧——Q16 登记） |
| EQ-FCFMU-23 | r_meas_water = V_water_meas − V_water_true = b_V_water·𝕀(t ≥ t_fault) | 同上（mL）——原文注「经开环冷凝平衡」 |

**数值方法（原文 §2.1）**：内联固定步长经典 RK4；内部子步 δt=0.01 s、通信步 Δt=0.1 s；
oracle 与 C99 内核**同算法同步长**（跨实现 parity 前提——§4 项 7）。

**残差定义 pre 相位矛盾裁定（评审 A P2-1 原文缺陷转写保真 → 批准轮裁定落定）**：EQ-14/15
右端含 `phase ≠ pre` 门而 EQ-22/23 右端为 `𝕀(t ≥ t_fault)` 无相位门——两式在 pre 行字面矛盾
（原文内部缺陷，逐字转写维持于上表）。**裁定**：pre 行 = 左极限（t = t_fault⁻，Q1(A) 相位
承载语义），指示函数一律按**行相位时点**求值——pre 行 t = 20.0⁻ < t_fault ⇒ 𝕀 = 0，EQ-22/23
在 pre 行给出 r = 0，与 EQ-14/15 的 `phase ≠ pre` 门**数值一致**；矛盾仅在把 pre 行时点读作
t = 20.0（≥ t_fault）时出现——该读法被 Q1(A) 排除。实现口径：r 在 pre 行恒 0、post 行恒 +b
（FMU-2 恒等式自检按此复算）。

### 1.4 参数面（19 参数字典——原文 §2.2.4 冻结值逐字转写，值零改动）

| 参数 | 符号 | 值（原文冻结） | 单位 | 物理描述（转写） |
|---|---|---|---|---|
| N_cell | N_cell | 80 | cells | PEMFC 电堆串联单体数 |
| I_load_nom | I_load | 100.0 | A | 名义电堆负载电流 |
| G_O2_in | G_O2_in | 20.0 | kPa/s | 阴极 O₂/N₂ 供给阀氧压增益 |
| k_O2_react | k_O2_react | 0.10 | kPa/(A·s) | 电化学氧消耗系数 |
| tau_ca | τ_ca | 5.0 | s | 阴极歧管压力松弛时间常数 |
| k_N2_accum | k_N2_accum | 12.0 | kPa/s | 供给缩减/吹扫下阴极氮累积增益 |
| tau_N2 | τ_N2 | 10.0 | s | 氮缓冲松弛时间常数 |
| G_H2_in | G_H2_in | 40.0 | kPa/s | 阳极喷射器氢供给增益（化学计量比 1:0.65） |
| k_H2_react | k_H2_react | 0.20 | kPa/(A·s) | 阳极电化学氢消耗系数 |
| tau_an | τ_an | 2.5 | s | 阳极再循环回路松弛时间常数 |
| q_cond | q_cond | 0.08 | mL/(A·s) | 生成水冷凝速率系数 |
| q_drain_max | q_drain_max | 16.0 | mL/s | 被动膜分离器最大排水速率 |
| V_cap_max | V_cap_max | 500.0 | mL | 分离器最大储水容量 |
| E_LHV | E_LHV | 1.254 | V | 低热值热中性单体参考电压 |
| P_H2_LHV | P_H2_LHV,kW | 10.032 | kW | 100.0 A 下总氢 LHV 功率输入 |
| P_aux | P_aux,kW | 0.20 | kW | 寄生平衡厂用电功耗 |
| T_cool_in | T_cool_in | 323.15 | K | 冷却剂入口温度（50.0 °C） |
| h_cool | h_cool | 0.2416 | kW/K | 电堆-冷却剂集总换热导纳 |
| C_th | C_th | 2.416 | kJ/K | 电堆集总热容 |

**字典缺口登记（Q16）**：原文方程引用 p_O2_nom/p_N2_nom/p_H2_nom/u_o2_nom 四常量未入
§2.2.4 十九参数字典——由 §2.3 标称平衡点解析派生（p_O2_nom=120.0 kPa、p_N2_nom=50.0 kPa、
p_H2_nom=180.0 kPa、u_o2_nom=0.50——推导依据：标称点五导数恒零 + 参考项在标称点归零）；
批准轮裁定补入字典（推荐）或登记为派生常量。零编造声明：上述四值非新增物理设定，系原文给定
稳态点的代数推论；u_an 输出变量未入 §2.3 十九变量表（同 Q16 登记）。

### 1.5 核心裁定点一：601/602 行契约面（Q1——两候选对照，推荐不定案）

| 候选 | 形态 | 契约面影响 |
|---|---|---|
| **(A) 仓内 601 点 pre/post 相位行约定承载（推荐）** | 序列维持 601 点网格（t[k]=k·0.1，[0.0,60.0]）；t=20.0 单网格行（series 载 post 采样值），pre 左极限值由**既有事件快照机制**承载（EV-*-pre phase="pre" derivation="left_limit" / EV-*-post phase="post" derivation="post_sample"——fc001_v2 golden 实测结构；MG 双事件快照同构 additive——勘误① 同款句式）；G10 盲包 high_res_store 如需携带双边界行属 G10 面另行裁定 | CONTRACT.md §4.6「时间数组严格 601 点」冻结面零触碰；golden 管线 / verify_golden V-09 事件 pre/post 比对全链既有；R-G9-02 原文「602 rows × 5」验收表述仓内化为「601 点 × 5 + 事件快照 pre/post」（映射表注记 = 勘误登记，非物理变更）；零 breaking |
| (B) 602 行双列扩展 | 20.0⁻/20.0⁺ 双行入序列（602 行/Run） | CONTRACT §4.6 冻结面变更 = breaking（V1_FACES §3.2）⇒ major + §3.3 五件迁移义务（迁移指南/旧输入处置声明/逐 golden 重出评估/门禁全量绿/受影响面清单）+ 全库 12 golden 逐文件重出评估——涟漪覆盖八面；pre 值既由事件快照承载，教学增量近零 |

**推荐一句话**：采 (A)——601 点网格 + 事件快照相位承载与既有 golden 管线、V-09 事件比对、
MG 双事件快照先例全链兼容、零 breaking；候选 B 触发 major 五件套涟漪且无对应教学增量。

### 1.6 核心裁定点二：model_provenance 新值 `fmu_l1_lumped_unvalidated`（Q2——摘要，不定案）

- **原文面**：epistemic declaration（§2 头）+ §2.5.2 跨保真判别均以 `model_provenance="fmu_l1_lumped_unvalidated"` 标记 L1-FMU 轨（L0 侧 = 既有 `analytical_demo`——engine.js:551 实读）。
- **仓内现状**：provenance 现值两枚举——引擎轨 `analytical_demo`、后端轨 `numerical_simulation`（registry.js:254）；V312 §7/A-4 现行「FMU manifest provenance 标 numerical_simulation + self_declared=true、**不新增 provenance 档位**」（Q-5——未批样本黑盒准入语境）；V312 为 FROZEN 文件，修订须 CHG。
- **候选**：(A) additive 新增专用档位（face② additive——枚举扩张不改变既有两值语义；UI 诚实标签「行为与数值集总演示模型（未经实验/硬件验证）」；V312「不新增档位」按黑盒准入轨作用域限缩解释、FC-001 批准轨显式 CHG 例外登记）；(B) 复用 numerical_simulation + self_declared + backend.method_id 承载（零档位新增——但 §2.5.2 跨保真白名单以 model_provenance 判别 L0/L1，(B) 下谓词无法成立，功能性阻塞）。
- **推荐**：(A)——功能必需 + additive 面（MINOR）；V312 例外 CHG 随批准轮打包（Q17）。

### 1.7 键面（B-1a 显式键纪律承接——勘误⑤）

| 键面 | 登记 |
|---|---|
| feedback_mode 枚举 | EVENT_KEYS 已含 feedback_mode（scenario.js:52——既有事件键）；枚举现值 ['closed_loop','monitor']（:40）⇒ **additive 新值 `baseline`**（G9 FC-Run-1 none+baseline 组合承载——控制律 = EQ-FCFMU-18 恒定标称指令）；G9 `monitor_only` → 仓内既有 `monitor` 映射（EQ-FCFMU-18 同式覆盖——语义等价，名称差异映射登记，Q12） |
| sensor_drift 参数面 | 双偏置目标通道：b_p_ca（kPa，p_ca 链）/ b_V_water（mL，储水链）——additive 可选参数（既有 FC sensor_drift 偏置目标为 I_fc/bias_A，缺省轨逐位不变）（Q14） |
| actuator_fault 参数面 | target 选择 + α_drain（0…1 健康因子）——additive 可选参数，缺省 = 既有「氢气供给阀卡涩 magnitude%」语义逐位不变（Q3——核心裁定点见 §2.2） |
| B-1a 显式键纪律 | 全部新键/新值**仅在场景输入显式提供时**写入归一化事件与 hashProjection（scenario.js 电化学键先例同构——行号时点注记 B-2③：原引 :419-436，电化学块实际 :430-447，:419-426 为 thermal 块尾部；语义锚 = 「仅在场景输入显式提供时校验并写入」:432-436）；缺省轨解析只在引擎 normalizeConfig 盖章层 ⇒ **既有全部场景 scenarioHash 零变化**（face③ 冻结边界原文锚点校正 B-2①：V1_FACES:197-198「新可选事件键 additive——新键只影响使用它的输入，既有场景解析与哈希不变」+ §9 v1.2.0 修订记录「B-1(a) 显式键条件式形态即对该边界的兑现」——原引 :184-186 实读为缺省解析入哈希形态描述、语义方向相反，FC Q9 定案先例逐字适用） |
| 零投影纪律（勘误⑤后半） | config_hash 投影（scenarioView）不入新键（FC B-3 定案先例同构）；已知局限显式登记：轨区分由 run_hash/序列内容/provenance 承载——不静默 |
| FMU 轨选择键面 | **Q13**：推荐 plant adapter 层绑定（fc001-fmu-adapter.js——G9 §2.1 外层原文；场景零新键；跨保真对比由同场景双 provenance Run 承载）；备选 = scenario 显式新键（如 fmu_model: "off"\|"on"——B-1a 同构）——若实现证明跨保真对比需场景级钉轨，停下显式 CHG |

### 1.8 Epistemic Declaration 转写（诚实性声明冻结表草案——原文逐字转写，I-2）

| 声明面 | 冻结表草案（转写） |
|---|---|
| 模型来源 | 5 态集总参数 FMU 为**行为与数值集总参数演示模型**（model_provenance="fmu_l1_lumped_unvalidated"）；全部仿真输出保持 synthetic |
| 硬件/实证 | 非硬件台架遥测推导（hardware_verification="not_performed"）；未对经验电堆极化/热数据验证（model_validation="not_performed"） |
| 自洽性边界 | 通过内部一致性检查（verification.consistency_checks="pass"）、run_hash 位级复现、独立 oracle golden 比对（rtol ≤ 1e-9）仅确立**数值与实现自洽**——不得表述为物理守恒验证或硬件认证（I-5 措辞红线联动——「数值自洽」固定句式，禁「验证通过」类词面） |

## 2. 场景/事件族影响面

### 2.1 5 Run 矩阵转写（G9 §2.4 白名单——t_fault_s=20.0、duration_s=60.0、dt_s=0.1；与仓内族名映射）

| Run | fault_family（G9） | feedback_mode（G9） | 20.0 s 故障参数 | 20.0 s pre→post 阶跃不连续（原文精确值转写） | 20.0→60.0 s 动态轨迹（结构转写——**数值一律批准轮 emit 冻结**） | 仓内映射注记 |
|---|---|---|---|---|---|---|
| FC-Run-1 | none | baseline | 无 | 无（全信号平直） | 60.0 s 全程维持精确标称平衡点 | **none+baseline 新组合**（feedback_mode 新值 Q12；role=baseline 先例——fc001_v2 healthy 同名 role 实读） |
| FC-Run-2 | sensor_drift | closed_loop | b_p_ca = +15.0 kPa | p_ca_meas_kPa: 200.0→215.0；u_o2_valve_cmd: 0.50→0.35；r_meas_p_kPa: 0.0→+15.0 | O₂/N₂ 供给缩减 → N₂ 累积、y_O2 稀释、电堆电压衰减轨 | 族名同既有 sensor_drift；偏置目标 = 新参数面（Q14） |
| FC-Run-3 | sensor_drift | monitor_only | b_p_ca = +15.0 kPa | p_ca_meas_kPa: 200.0→215.0；r_meas_p_kPa: 0.0→+15.0；u_o2_valve_cmd 保持 0.50 | 真实压力/氮分数/电堆电压完全不受扰、维持 52.0 V | monitor_only → 仓内 monitor 映射（Q12） |
| FC-Run-4 | sensor_drift | closed_loop | b_V_water = −80.0 mL | V_water_store_meas_mL: 200.0→120.0；u_drain_valve_cmd: 0.50→0.34；r_meas_water_mL: 0.0→−80.0 | **闭环平衡 V_water = 280.0 mL（θ_cap_true = 0.56）**——闭环反馈使排水指令随受染测量回升，t = 60.0 s 瞬态峰值 θ_max ≈ 0.516（RK4 全耦合计），**二次饱和项（θ > 0.60）全程零触发**（行为声明修正——评审 A P1：原文「储水超 300.0 mL 触发非线性极化下降」被自身方程证伪，该叙事属 FC-Run-5 t ≈ 47 s 穿越） | 偏置目标 = 储水链新参数面（Q14） |
| FC-Run-5 | actuator_fault | closed_loop | α_drain: 1.00→0.45 | **零不连续**（全通道 pre=post、C⁰ 连续） | 分离器储水体积持续上升，控制器增大 u_drain_valve_cmd 趋向饱和（0.95） | **actuator 语义裁定点 = Q3（§2.2）**——作用于 u_drain 而非既有 FC 族语义 |

**Run 集（Q8 确认项）**：golden Run 集 = G9 §2.4 白名单全集 5 Run（原文直接定义——非镜像
判据；备选裁剪无依据）。**白名单面零变化声明**：approved_fc 既有白名单（scope.js:44-52
四族条件）零改动——FMU 轨为新 golden 新 id 新轨，白名单扩张（如 FMU 轨入 approved 路径）
留两门禁面（§4 项 10）。

### 2.2 actuator 语义裁定点（Q3——作用于 u_drain 而非既有 FC 族语义）

既有 FC actuator_fault = 氢气供给阀卡涩于 magnitude% 开度（systems.js:592 faultAnchors 'valve' / :506 实读）；G9 FC-Run-5 的 α_drain 作用于**排水阀执行器**（u_drain 健康因子）——物理执行器不同。两候选：

| 候选 | 形态 | 影响 |
|---|---|---|
| **(a) 族参数扩展（推荐）** | actuator_fault 增 additive 可选参数（执行器目标选择 target，缺省 = 既有 valve 语义**逐位不变** + B-1a 显式键）；FC-Run-5 显式 target='drain_valve'、α_drain=0.45 | family id 与 G9 原文一致（跨保真 family 判别兼容 + 原文映射零偏离）；scope.js FC 族条件零改动（family 串不变——面⑥ 零触碰）；缺省轨逐位不变由显式键纪律保证 |
| (b) 新族（如 actuator_drain_fault） | 独立 family id | closed-world 最干净、既有族面零触碰；但 family id 与 G9 原文不一致（映射偏离登记）+ 新族须扩 scope.js 白名单族条件（面⑥ additive 但波及更大）+ FAULT_CATALOG 新族登记 |

**推荐一句话**：采 (a)——族 id 保持原文一致、缺省语义逐位不变由 B-1a 显式键保证；同时登记：FC-Run-5（α_drain）与既有 actuator（valve）执行器不同 ⇒ 跨保真比对白名单对 actuator 局**结构性不可比**（L0 无排水阀对应物 + fault_magnitude 单位/尺度不同——§2.5 谓词天然排除，登记为设计属性非遗漏）。

### 2.3 白名单与哈希面（勘误②③④⑤ 承接）

- **白名单面零变化**：approved_fc 既有四族条件、approved_p0、extension_preview 三档语义零
  改动（scope.js 结构零触碰——FMU 轨经 plant adapter/backend 路径，V312 §6 scope-guard 先例：
  backend Run 强制 extension_preview 且不改 classify 本身——FMU 轨同构适用，登记）。
- **哈希形态**：FMU 轨 Run 走既有 runHashInput 清单（registry.js:46-58）零新增输入键；
  fmu_sha256 入 EvidenceBundle v1.1 为 **additive 字段不入 run_hash**（V312 C-2 先例同构）
  ⇒ **五哈希（scenarioHash/run_hash/config_hash/model_hash/content_checksum）既有合法输入
  零变化**（勘误②——证明随实现交付）。
- **V312 FROZEN 钉 hash（勘误③）**：fmu_sha256 钉入 V312 清单须 CHG——批准轮 CHG 打包项
  （Q17）。**run-g2 步数账（勘误④/I-7）**：parity/黑盒验收步新增须显式申报扩账（35 → 35+n）
  ——批准轮裁定步账（Q17）；本草案 0 步承诺不预设。
- **盲包面**：FC-001 FMU 轨不入 Arena 盲测池（G10 顺延——钉轨裁定随 G10 面登记不预设）；
  新信号（§3.1 变量表）不入既有盲包投影（默认轨语义零变化——FC §2 先例同款）。

### 2.4 6 节因果规则登记（G9 §2.5.1 逐字转写——src/core/causal-rules.js 注册面，实现轮 FCFMU-G2b-04）

| Rule ID | 节点槽位 | 认知层 | 绑定变量 | 机理陈述（转写） |
|---|---|---|---|---|
| FC_RULE_01_MEAS_STEP | 节点 1 传感链 | measured | p_ca_meas_kPa、V_water_store_meas_mL | 加性传感偏置 b 在 20.0 s pre（left_limit）与 post 间产生瞬时阶跃，物理状态保持连续 |
| FC_RULE_02_CTRL_REACTION | 节点 2 控制律 | derived | u_o2_valve_cmd、u_drain_valve_cmd | closed_loop 反馈下比例控制对受染测量反应（缩减 O₂/N₂ 供给或排水指令）；monitor_only 下指令恒 0.50 |
| FC_RULE_03_N2_ACCUM | 节点 3 阴极气体 | true/derived | p_N2_ca_true_kPa、y_O2_ca_true | 100.0 A 持续消耗下供给缩减抬升阴极氮分压、稀释氧摩尔分数 |
| FC_RULE_04_WTMS_VOL | 节点 4 分离器体积 | true/measured | V_water_store_true_mL、cap_water_ratio_est | 排水不足使储水体积向 500.0 mL 容量上限累积（θ_cap 超 0.60；批准轮注记——评审 A P1 联动：该「超 0.60」穿越叙事在白名单 5 Run 中**仅 FC-Run-5 兑现**（t ≈ 47 s），FC-Run-4 闭环平衡 280 mL / θ_max ≈ 0.516 零触发——机理陈述为一般式，Run 级兑现面以 §2.1 修正后口径为准） |
| FC_RULE_05_STACK_POLAR | 节点 5 电堆极化 | true/measured | V_stack_meas_V、eta_sys_true_pct | 氧稀释（y_O2<0.60）与储水饱和（θ_cap 超 0.40/0.60）增大浓差过电位、降低端电压 |
| FC_RULE_06_ALGEBRAIC_RES | 节点 6 代数支 | derived | r_meas_p_kPa、r_meas_water_mL | 代数恒等支：测量一致性残差按定义在 20.0 s post 精确跳 +b（r ≡ x_meas − x_ref）——传感通道偏移，非物理气体泄漏或水损失 |

**转写注记（Q16 联动）**：FC_RULE_06 的 r ≡ x_meas − x_ref 与 §2.2.3 的 r = x_meas − x_true
为两口径（标称点等价；故障局「跳变量 +b」两口径均成立、「全轨水平」分歧）——本草案按原文
逐字双保留，裁定留批准轮。

### 2.5 跨保真比对白名单（G9 §2.5.2 逐字转写——src/core/compare.js 注册面）

`cross_fidelity_l0_vs_l1_fmu`：两 Run 标记 comparable（comparison_kind="cross_fidelity"）当且仅当共享相同 system_id="FC-001"、fault_family、feedback_mode、t_fault_s、fault_magnitude、duration_s，且 Run A model_provenance="analytical_demo"（L0）、Run B model_provenance="fmu_l1_lumped_unvalidated"（L1-FMU）。**登记**：① 谓词依赖 provenance 新值（Q2 联动——候选 B 下不可成立）；② actuator 局结构性不可比（§2.2 登记）；③ 既有 P0 比对白名单（fault_vs_baseline / closed_loop_vs_monitor_only）零变化（additive 第三关系）；④ 既有 Run 的比对结论永不静默改判（面⑥ additive 确认句式）；⑤ **跨保真可比性三缺口登记（评审 A P2-2——设计属性非遗漏）**：(a) 幅值单位错型——L0 sensor_drift 真值口径为 bias_A（A）而 FMU 轨为 b_p_ca（kPa）/b_V_water（mL），fault_magnitude 相等谓词在跨轨天然不可满足 ⇒ sensor_drift 局跨保真比对结构性排除（与 actuator 局同款设计属性）；(b) 零共享观测通道——L0 盲通道（I_fc_meas_A 等）与 FMU 轨新通道（p_ca_meas_kPa 等）无交集 ⇒ comparable 标记承载**族级可解释性对齐**而非序列级数值比对（教学面经因果规则卡承载，不虚设序列对比）；(c) 注册面路径勘误——原文 `src/core/compare.js` 于本仓无此文件，比对关系实位 `src/ui/pages/compare.js`（注册面实现轮以实位为准，映射登记）。

## 3. 锚点与包络

### 3.1 标称稳态平衡点（G9 §2.3 逐字转写——t ∈ [0.0, 20.0⁻] s；名义输入 I_load=100.0 A、u_o2=u_drain=u_an=0.50、α_o2=α_drain=1.0；五导数恒零；**全部解析精确值——原文冻结值零改动**）

| 变量 id（schema_id 提案） | 符号 | source_kind | exposure | 标称稳态值 | 单位 |
|---|---|---|---|---|---|
| p_O2_ca_true_kPa | p_O2_ca | true | sealed | 120.000000 | kPa |
| p_N2_ca_true_kPa | p_N2_ca | true | sealed | 50.000000 | kPa |
| p_H2_an_true_kPa | p_H2_an | true | sealed | 180.000000 | kPa |
| V_water_store_true_mL | V_water_store | true | sealed | 200.000000 | mL |
| T_stack_true_K | T_stack | true | sealed | 343.150000 | K |
| p_ca_true_kPa | p_ca_true | true | sealed | 200.000000 | kPa |
| y_O2_ca_true | y_O2_true | true | sealed | 0.600000 | − |
| cap_water_ratio_true | θ_cap_true | true | sealed | 0.400000 | − |
| V_stack_true_V | V_stack_true | true | sealed | 52.000000 | V |
| eta_sys_true_pct | η_sys_true | true | sealed | 49.840510 | % |
| p_ca_meas_kPa | p_ca_meas | measured | blind_observable | 200.000000 | kPa |
| V_water_store_meas_mL | V_water_meas | measured | blind_observable | 200.000000 | mL |
| V_stack_meas_V | V_stack_meas | measured | blind_observable | 52.000000 | V |
| T_stack_meas_K | T_stack_meas | measured | blind_observable | 343.150000 | K |
| u_o2_valve_cmd | u_o2 | derived | blind_observable | 0.500000 | − |
| u_drain_valve_cmd | u_drain | derived | blind_observable | 0.500000 | − |
| cap_water_ratio_est | θ_cap_est | derived | blind_observable | 0.400000 | − |
| r_meas_p_kPa | r_meas_p | derived | blind_observable | 0.000000 | kPa |
| r_meas_water_mL | r_meas_water | derived | blind_observable | 0.000000 | mL |

（u_an 输出未入原文表——Q16 登记；sealed/blind_observable 为代码标识符语境——copy-guard
D-11 剥离纪律适用，§6.3。）

### 3.2 5 Run 动态轨迹结构预填（**数值一律批准轮 emit 冻结**——零编造纪律）

| Run | 轨迹结构（原文 §2.4 定性转写） | 数值面 |
|---|---|---|
| FC-Run-1 | 全轨恒 = §3.1 标称点（解析恒等——非数值仿真产物） | 解析精确值（§3.1 表） |
| FC-Run-2 | N₂ 累积 → y_O2 稀释 → 电压衰减（单调结构） | 批准轮 emit 冻结 |
| FC-Run-3 | true 通道与 FC-Run-1 标称轨恒等（b 不进物理回路——monitor 不变量） | 批准轮 emit 冻结（预判 max\|Δ\|=0 结构判据——emit 复算） |
| FC-Run-4 | 闭环平衡趋近 V_water = 280.0 mL（θ_cap = 0.56）；t = 60.0 s 内 θ_max ≈ 0.516——二次饱和项零触发（P1 修正后口径；emit 复算核验） | 批准轮 emit 冻结 |
| FC-Run-5 | 储水体积持续上升 + u_drain 趋向饱和 0.95（全通道 20.0 s 零跳变） | 批准轮 emit 冻结 |

包络登记：θ_cap ∈ [0,1] 值域由 EQ-FCFMU-9 结构承载（V_water_store > V_cap_max 行为未定义
——域守卫/钳位为实现轮裁定面，登记不静默——FC R-2 同款）；u 指令域 [0.05,0.95]（钳位式）。

## 4. golden 计划（fc001_fmu_v1 · 独立 oracle · 本批准轮零改动——emit = FCFMU-G2b-03）

| # | 项 | 内容 |
|---|---|---|
| 1 | 新 id 判据 | golden_id = **fc001_fmu_v1**（用户裁定 CHG-20261114-06——第三轨新物理 → 新 id，ORACLE_INTERFACE_D2 §3.1 判据同构；命名空间 fc001_fmu_ 与既有 fc001_v1/v2 不撞）；supersedes = null（并列第三轨——非 fc001_v2 之取代；轨关系由 provenance/层级标签承载） |
| 2 | 独立 oracle | `tools/oracle/fc001_fmu_oracle.py`（**G9 §4.1 原文 Create——命名已定，Q5 确认项**）。独立性声明（fl001_l1/gt001_l1/fc001_l1 先例）：不 import src/**、不 import 既有 oracle、方程与参数唯一权威文本 = 本规格批准文本（§1.3/§1.4 冻结表）、Python stdlib（python -I）、自含硬编码；**出生即 oracle_base 接入**（六成员 + resolve_run_spec + write_golden_with_sidecar LF 钉死 + approval 三字段非 null 方可落盘 + SERIES_IDS 模块常量含 "t" 列）；golden 由 oracle 只读生成——**C99 FMU 不参与 emit**（golden 独立性 G0-DEC-16 同构；C-Python parity 为验收面非生成依赖） |
| 3 | 数值方法 | 经典 RK4——内部子步 δt=0.01 s、通信步 Δt=0.1 s（原文 §2.1 口径）；oracle 与 C99 内核同算法同步长同运算序（parity 前提——位级一致不承诺，见项 7） |
| 4 | 行数契约面 | 601 vs 602 = Q1（§1.5——推荐 601 点 + 事件快照相位承载）；原文「602 rows per run」唯一行数出处登记；golden JSON 物理行数为 emit 后非契约面（草案未见其他行数依据——如实登记） |
| 5 | 自检预案 | 新段 **FMU-1…n（Q6 不定案——候选 FMU-x / FCFMU-x）**：FMU-1 环境校验（标称点解析恒等复算）；FMU-2 恒等式（r_meas ≡ b·𝕀 逐点 / 分压和恒等 / θ_cap 定义恒等）；FMU-3 网格与事件相位（601 点、t[i]=i·0.1、pre=left_limit/post=post_sample 语义——Q1 联动）；FMU-4 锚点全表复算（§3.1 十九值）；FMU-5 monitor 不变量（Run-3 true 通道 ≡ 标称轨）；FMU-6 半步自收敛登记（δt=0.01 vs 0.005——判据按实测 ×≥10 冻结制）；FMU-7 无 NaN/Inf + 值域抽查（θ_cap∈[0,1]、u∈[0.05,0.95]） |
| 6 | 元数据（schema v2） | golden_schema_version="v2"；golden_id="fc001_fmu_v1"；model_id = 自述新值（Q13）；method_id 提案 "fc001_fmu_l1_rk4_dt0.01"；engine_baseline=null；backend 留位；**SERIES_IDS 终值以 emit 实测核对为准（§3.1 十九变量 + t + u_an 若裁定补入——不预断）**；approval 三字段首签引批准 CHG（首签时点 = FCFMU-G2b-03 emit） |
| 7 | 容差 tier（Q9 不定案） | **推荐 T-B**（同法 RK4、跨语言双实现 C99/Python——FLTH/FC/GTL1 同制；跨语言位级承诺禁令维持）。**R-G9-02「rtol ≤1e-9」张力登记**：1e-9 为数值容差承诺（非位级——与禁令不冲突），但须 emit 轮以双实现实测散差 × 安全系数 ≥10 冻结实际 gate 值；若实测散差 >1e-9 ⇒ 停下显式 CHG 重议 R-G9-02 口径（原文硬值与实测制度冲突处置预案——双向登记）；parity 归属：verify_golden Python-Python 部分走既有 T-B 链 + **C-Python parity 为独立机检**（oracle --parity 子命令或 fmu_runner 探针步——Q17 归属裁定；编译产物缺位环境 SKIP 语义显式裁定——V312 §9 ⑥ 可选步先例） |
| 8 | gate 键面缺口预登记（Q15——显式硬项；**B-1 三分支精确口径（评审 B P1 修正）**） | fc001_fmu_v1 序列含 *_mL（V_water_store_true_mL / V_water_store_meas_mL / r_meas_water_mL）与无量纲键（y_O2_ca_true / cap_water_ratio_true / cap_water_ratio_est / u_o2_valve_cmd / u_drain_valve_cmd）——T-B 分派链逐键路由**三分支实况**（评审 B python -I 逐键复刻）：① V_water_store_true_mL / V_water_store_meas_mL + 五个无量纲键 ⇒ **无 `_mL` 支、无无量纲支 → f_Hz_atol 兜底 → gate 块无 f_Hz_atol 键 ⇒ KeyError（fail-loud——FLCAP A-4/B-1 兜底键缺失形态）**；② **r_meas_water_mL 命中 `r_meas` 子串判别支（verify_golden.py:324-325——先于兜底）⇒ 走 r_meas_kW_atol（kW 容差用于 mL 的静默量纲错型）——非 KeyError**（fc001_v2 gate 实测含 r_meas_kW_atol 键——沿其风格将无任何报错地错型路由；该形态较 fail-loud 更需显式排除）；③ 六个 `_kPa` 键走既有 `_kPa` 支（:320-321）**无条件读取 p_kPa_atol——新 gate 块须显式声明该键**（P3-3：fc001_v2 gate 实测不含 p_kPa_atol，缺声明 = 同形态 KeyError）。实现轮 additive：**新增 `_mL` 分支（gate 键 V_mL_atol 条件激活）插入点显式钉死 = 置于 `_kPa` 支后、`r_true`/`r_meas` 子串判别之前**（同时正确路由三分支之①②——②的错型路由一并修复）+ 无量纲键专用 gate 支（**定案：尾缀判别 `endswith("_true") ∨ endswith("_est") ∨ endswith("_cmd")` + 专用 gate 键 dim_atol 显式声明支**，置于 `_kWh` 支后、f_Hz_atol 兜底前；仅当 gate 声明 dim_atol 时激活——覆盖 y_O2_ca_true / cap_water_ratio_true / cap_water_ratio_est / u_o2_valve_cmd / u_drain_valve_cmd 五键，且既有 golden 无此三尾缀 id、gate 无 dim_atol 键 ⇒ 既有键路由逐字节不变——FCECH `_V` / FLCAP `_kWh` 条件支先例同构）；既有键路由零变化证明随实现提交 |
| 9 | verify_golden 注册 | MODELS["fc001_fmu"] 注册行（键名 = R-G9-02 命令原文 `python scripts/verify_golden.py fc001_fmu` 给定——确认项）+ **DEFAULT_MODELS 追加（Q7）**（verify_golden.py:278 现值五成员——FL/FC 先例形态：步① 无参调用序列尾追加 + 步① label 滞后说明沿用——FC §4 项 8 B-5 同款）；MODELS["fc001"]/["fc001_l1"] 继续验 fc001_v1/v2 零改动（FLTH §4 项 7 同构——条目重指向不适用） |
| 10 | 两门禁面（FLTH B-2 同构） | ① golden↔oracle verify（V-01…V-09 全链——601 点逐点 + V-09 事件 pre/post 快照比对）+ C-Python parity（R-G9-02——**数值与实现自洽声明 only**，§1.8 措辞边界）；② FMU 轨验收路由：fc001_fmu_v1 emit verify 通过前 FMU 轨不进任何 approved 路径/跨保真比对 enable（I-4 批准纪律——不静默）；预烘焙兜底 bundle 与 golden 字节同源（adapter file:// 模式只读） |
| 11 | 验收命令承接（R-G9-02/03/04——G9 §4.2 逐字；**R-G9-04 口径仓内化注记 B-3**） | `python tools/oracle/fc001_fmu_oracle.py --self-check`；`python scripts/verify_golden.py fc001_fmu`（5 Run 全过、C-Python max rtol ≤1e-9——Q9 张力登记）；R-G9-03 三次执行 run_hash/EvidenceBundle 校验和恒等（fmu_sha256 钉 V312——CHG 项）；R-G9-04 copy-guard exit 0（Q11 增词联动；**Q18 定案口径**：原文「四域零出现」vs copy-guard SCOPES=['src'] 缺口——仓内化 = src/** 域 copy-guard 机检 + tools/docs 域 grep 抽检（当前零命中实读）+ FaultLab-evaluation 域禁词定义性引用豁免（3 文件含四词字样——本规格/G9 落档/V170_WAVE_DESIGN，属证据引用域），见 §11 Q18）；R-G9-01（I-11 S3 位级——12 基线配置逐位）= V170 W3 主线承载面，非本规格工作面 |
| 12 | 预期失效面 | 新增 data/golden/fc001_fmu_v1.json(+.sha256) + data/fmu/fc001_l1_v1.fmu（打包档案）；既有 12 golden 字节零变更；EvidenceBundle v1.1 fmu_sha256 additive；V312 钉 hash CHG；run-g2 步账 CHG；copy-guard 增词（**连带 tests/teaching.test.js:264 BANNED.length===39 镜像断言同步 39→43——P3-4 交付要件**）；**fc001_fmu_v1 gate 块显式声明 p_kPa_atol（P3-3——`_kPa` 支无条件读取）+ dim_atol（Q15 定案）+ V_mL_atol（Q15 定案）**；FAULT_CATALOG §5 注记行（FC FMU 第三轨）；causal-rules 注册（实位 src/core/causal-rules.js）与比对注册（实位 src/ui/pages/compare.js——路径勘误见 §2.5⑤(c)） |

## 5. G2b 排期与串行节奏

1. **四步**：FCFMU-G2b-01 本草案（V170 波 W1，2026-11-15——已完成）→ **FCFMU-G2b-02 双路
   独立评审（W2a 物理/数值 + W2b 治理/契约面，互不可见；结论 W4 代录 §10）+ 用户书面批准
   （v1.8.0 批准轮——Q1…Q17 定案 + C99 编译环境裁定（Q10）+ 容差/步账冻结；批准记录 =
   用户指令链 CHG，GTL1-G2b-02 先例体例）+ 条件落正文 + 更名 APPROVED v1.0** →
   FCFMU-G2b-03（oracle + fc001_fmu_v1 emit + verify_golden 注册 + gate 键面 additive）→
   FCFMU-G2b-04（C99 内核编译实现 + fmu_runner 扩展 + adapter + 因果/比对注册 + parity
   验收——§8）随用户逐版本指令派发（I-4 纪律）。
2. **与 v1.7.0（S3 收口）关系**：S3 位级验收（R-G9-01 面）为本波 W3 主线先行；FMU 实现绑定
   FmuPlantAdapter 于 S3 收口之后（G0-V05-DEC-05 原文序）；两工作面文件互不相交（V170 §2）。
3. **实现时点**：v1.8.0（V170 DEC-1——批准与实现同轮派发由用户逐版本指令裁定；本草案不排
   实现工期——G0-DEC-15 句式）。

## 6. 红线自查

### 6.1 I-1…I-5 逐条

| # | 红线 | 自查结论 |
|---|---|---|
| I-1 | 零第三方依赖 | **C99 FMU 内核 = backend 工件非产品依赖**（tools/backend/fmu/——编译产物；浏览器前端零依赖维持：file:// 模式走静态预烘焙 golden 兜底——G0-V05-DEC-01 原文）；fmu_runner/bridge/oracle 仅标准库（现状实读）；编译工具链 = 开发环境工具（Q10 裁定其构成，非运行时依赖登记）；无 PyBaMM/TESPy 类依赖沿袭 |
| I-2 | 数据诚实性 | 三层认知分离（§1.1）；epistemic declaration 逐字转写（§1.8——fmu_l1_lumped_unvalidated/synthetic/not_performed×2/≤1e-9 = 数值与实现自洽 only）；19 参数与 19 稳态值全部原文冻结值零改动；动态轨迹数值零预填（§3.2——批准轮 emit 冻结）；字典缺口显式登记不静默（Q16） |
| I-3 | 认知分离架构 | §1.1 三层职责表 = 硬边界（C 内核内嵌事件分裂/传感偏置 = 违反架构——实现轮评审硬项）；exposure 分域（sealed 真值 / blind_observable 测量与派生）随 §3.1 表承载 |
| I-4 | 批准纪律 | 本草案 DRAFT v0.1 不定实现；批准轮收口（用户书面批准）后方可实现（v1.8.0）；验收路径禁入直至 fc001_fmu_v1 emit verify 通过（§4 项 10 两门禁）；V312 B-4「FMU 各自另批」由本规格承载 |
| I-5 | 措辞红线 | 「数值与实现自洽」固定句式（禁「验证通过」类）；「行为与数值集总演示模型」定位句；微重力语境声明（本仓 MG=microgrid≠microgravity）；水位/液位词面预查（§6.3）；UI 文案预检表（§6.3——实现轮迁入 src/** 前逐句预检 + copy-guard 终检双保险） |

### 6.3 copy-guard 预查（实读 tools/copy-guard.mjs 现值——BANNED 39 模式 / ALLOW 14 条；实现期 `node tools/copy-guard.mjs` 终检；体例沿 FC §6.3）

| 提案串/词面 | 核查结论 |
|---|---|
| **水位/液位/water level/liquid level**（G0-V05-DEC-03 新增禁词候选） | **现 BANNED 39 模式不含四词（实读 :30-45）+ src/** 现状 0 命中（grep 实跑）**⇒ 入表 = additive 增词（面⑧ 词表单调不减纪律——增词=MINOR），零既有命中风险；**本草案转写一律用「储水体积/储水容量比」词面规避**；入表时点推荐 = FCFMU-G2b-04（随 FMU 文案落地同轮 + deviations.md 记录——D-27 体例）＝ **Q11（禁词增补 Q 点）**；作用域：copy-guard 无分域机制——全局入表（本仓 MG=microgrid 与微重力无关、语义不冲突；0 命中实证） |
| 既有禁词 **「FMU 结果」**（BANNED :37） | FMU UI/文档文案须规避「FMU 结果」词面（改用「FMU 轨 / L1-FMU 模型输出」句式）——实现轮文案预检硬项（本草案标题/正文已规避） |
| 既有禁词 **(?i)sealed（散文）** + D-11 标识符剥离 | exposure="sealed" / truthSealed 类为代码标识符 token——剥离后放行（D-11 纪律）；**散文中裸用「sealed」会命中**——src/** 文案一律以标识符语境（exposure 字段值）承载，不写散文「sealed 真值」（改「真值层（exposure=sealed 标识）」句式）——实现轮预检硬项 |
| 「数值与实现自洽，不是物理守恒验证或硬件认证」 | 禁词「验证通过/已验证/物理守恒验证通过」均以否定式承载——「不是物理守恒验证」不含「物理守恒验证通过」全串；预检 0 命中预期（emit 后 ALLOW 若需扩充走 deviations.md 记录） |
| 「行为与数值集总参数演示模型」「未经实验/硬件验证」 | 「未…验证」否定式（「经过验证」不含「已验证」子串——FLEXT F5 先例句式）；0 命中预期 |

（本草案在 FaultLab-evaluation/** 不扫描（SCOPES=['src']——:15 实读）；实现轮文案迁入
src/** 前逐句预检 + copy-guard 终检双保险。）

## 7. G2b 进入条件五项自查表（SCOPE_SPLIT_MEMO §8.2）

| # | 进入条件 | 状态 |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：触发项 = G9 落档（CHG-20261114-06 双裁定）+ V170 DEC-1（本草案即交付）；FC-001 无未关闭缺陷清单项（FCEXT/SCOPE 处置表无 FMU 相关未关闭项） |
| ② | 独立 golden | **计划就绪（未产出）**：§4 fc001_fmu_v1 / fc001_fmu_oracle.py / 5 Run 白名单 / schema v2 / tier 推荐 T-B（Q9 不定案）。golden 后置系 V170 §0「只到草案+双路评审」授权的字面偏离**显式登记**（FC §7 ② 先例同款）；emit = FCFMU-G2b-03，落地并 verify 通过后本项闭合 |
| ③ | UI 措辞与未建模物理清单 | **就绪（草案级）**：§1.8 epistemic declaration 冻结表 + §2.4 因果六节 + §3.1 变量表（assumptions/limitations 全文冻结文本留批准轮定稿——本草案登记要素面）+ §6.3 预查表 |
| ④ | 用户书面批准 | **未闭合（本波边界内）**：批准 = v1.8.0 批准轮 FCFMU-G2b-02（用户指令链 CHG——GTL1-G2b-02 先例体例）；本状态行即 DRAFT 依据 |
| ⑤ | CHG 登记 | 起草授权 CHG-20261115-04（V170 DEC-1）已登记；批准 CHG 待 v1.8.0 批准轮（随批打包：V312 例外 CHG/钉 hash CHG/步账 CHG——Q17） |

## 8. 工作面分解（FCFMU-G2b-01…04）

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| FCFMU-G2b-01 | 本草案：三层架构转写 / EQ-FCFMU 冻结表草案 / 19 参数字典 / 两核心裁定点（601/602、provenance）/ 键面 / 5 Run 矩阵 + actuator 语义裁定点 / 因果六节与跨保真白名单转写 / 19 变量稳态表 / golden 计划 / Q1…Q17 全候选 | M | **已完成**（V170 波 W1，2026-11-15） |
| FCFMU-G2b-02 | 双路独立评审（W2a 物理/数值——方程自洽/量纲/数值方法/稳态点复算/parity 制度；W2b 治理/契约面——八面 additive 核对/B-1a 键面/golden 治理/准入面/步数账）+ 用户书面批准（Q 点定案 + C99 编译环境裁定 + 容差冻结）+ 条件落正文 + 更名 APPROVED v1.0 | M | v1.8.0 批准轮（V170 W2a/W2b 评审 + W4 代录） |
| FCFMU-G2b-03 | oracle 编写（fc001_fmu_oracle.py——oracle_base 出生接入 + RK4 δt0.01/Δt0.1 + FMU-x 自检 + T-B 容差实测冻结/降 T-C 预案 + `_mL`/无量纲 gate 分支 additive）+ fc001_fmu_v1 emit（5 Run、schema v2、approval 首签引批准 CHG、sidecar LF 钉死）+ verify_golden MODELS["fc001_fmu"] 注册行 + DEFAULT_MODELS 追加（Q7）+ FAULT_CATALOG §5 注记行 | M | v1.8.0 实现轮 |
| FCFMU-G2b-04 | 实现：C99 内核 fc001_l1.c + modelDescription.xml（FMI 2.0 CS、VR 契约）+ 编译环境落地（Q10）+ data/fmu/fc001_l1_v1.fmu 打包 + fmu_runner.py 扩展（SHA-256 对 V312 校验、20.0⁻/20.0⁺ 左极限分裂、传感污染/控制反馈/残差 host、D-27 关闭）+ src/core/plants/fc001-fmu-adapter.js（bridge 接线 + 预烘焙兜底）+ causal-rules FC_RULE_01..06 + compare cross_fidelity 谓词 + copy-guard 增词（Q11）+ parity 验收（R-G9-02/03）+ run-g2 步账 CHG（Q17）+ EvidenceBundle fmu_sha256 additive 五哈希零变化证明 + V312 钉 hash CHG + UI 文案（§6.3 终检） | L | v1.8.0 实现轮 |

## 9. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | C99/Python 双实现散差超 1e-9（libm/运算序差异） | 同算法同子步同运算序转写 + emit 实测散差 ×≥10 冻结 gate 值 + 超限停下显式 CHG 重议 R-G9-02（Q9 双向预案）+ 禁 ULP 级承诺 |
| R-2 | 601/602 裁定翻转为 602 行（breaking 涟漪） | Q1 推荐 (A) 三层佐证（冻结面原文/golden 管线既有/MG 先例）；如批准轮采 (B) ⇒ major 五件套义务全量启动（§1.5 登记） |
| R-3 | actuator/sensor 族参数扩展被误读为既有族语义变更 | B-1a 显式键 + 缺省轨逐位不变验收（既有 FC 场景 scenarioHash/run_hash 零变化——§1.7/§2.3）+ 既有 golden 比对面零变化 |
| R-4 | 微重力词面触碰 copy-guard（R-G9-04 门禁失败） | G0-V05-DEC-03 禁词预检（§6.3）+ 转写全程「储水体积/储水容量比」词面 + Q11 入表与文案同轮落地 + 终检兜底 |
| R-5 | gate 键面缺口（_mL/无量纲）emit 时路由异常 | Q15 已预登记为显式硬项 + **B-1 三分支精确口径（评审 B P1 修正）：两个 V_water `_mL` 键 + 五个无量纲键 = f_Hz_atol 兜底 KeyError（fail-loud）；r_meas_water_mL = `r_meas` 子串支 kW 容差静默错型（非 KeyError——比 fail-loud 更需显式排除）** + 实现轮 additive 分支（`_mL` 支插于子串判别前 + dim_atol 支）双修复 + 既有键路由零变化证明 |
| R-6 | V312 FROZEN 与 provenance 新值冲突阻塞 | Q2 候选 (A) 附显式 CHG 例外登记路径（作用域限缩解释 + 批准轮打包）——不静默绕过 FROZEN 纪律 |
| R-7 | 编译环境不可用/平台矩阵缺位阻塞实现 | Q10 批准轮先行裁定（本草案不定）+ fmu_admission PLATFORM_DIRS 五平台面既有 + 预烘焙兜底使浏览器面不依赖编译产物 |
| R-8 | 步数账超支（I-7） | parity 步环境依赖显式登记（SKIP 语义裁定——V312 §9 ⑥ 先例）+ 批准轮 CHG 申报归口（Q17）——不静默扩账 |

## 10. 评审记录与条件处置（FCFMU-G2b-02 收口回填——结构留空，体例沿 FC §10）

### 10.1 评审记录

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | EQ-FCFMU 自洽与量纲、稳态点复算、RK4 制度、parity 制度、5 Run 结构、包络值域 | **PASS_WITH_CONDITIONS(7)（2026-11-15 W2a 已回填——见 10.2）** | 稳态点解析闭合精确成立（19 值独立代入全闭合）；转写保真度全面核实（23 方程/19 参数/19 稳态值/Run 步进值/因果六节/epistemic declaration 逐字）；**1 P1：Run-4 行为声明被自身方程证伪**（闭环平衡 280 mL、θ_max≈0.516、二次项零触发——θ>0.60 叙事实属 Run-5 t≈47 s；G9 原文内部不一致被草案逐字承袭）；2 P2（残差定义式 pre 相位矛盾——原文缺陷转写保真；跨保真可比性三缺口：单位错型/零共享信号/路径勘误）；4 P3 |
| 评审人 B（治理/契约面） | 八面 additive 核对、B-1a 键面、golden 治理与 verify_golden 注册面、V312 准入、步数账、copy-guard | **PASS_WITH_CONDITIONS(3)（2026-11-15 独立评审 B 补位——W2b 子代理，与评审 A 互不可见；报告 = evidence/g2b/FCFMU_G2B_REVIEW_B.md）** | 八面 additive/B-1a 键面/V312 准入/步数账/copy-guard 预查五项实读全过；**1 P1**：§4 项 8 分派链追踪对 r_meas_water_mL 失实——该键实命中 `r_meas` 子串支走 r_meas_kW_atol（kW 容差静默量纲错型），非草案所述 f_Hz_atol 兜底 KeyError（python -I 逐键复刻；V_water 两 `_mL` 键 + 五无量纲键兜底 KeyError 断言实跑确认成立）；2 P2（V1_FACES:184-186 锚点指向语义相反文本段、R-G9-04 四域口径与 copy-guard SCOPES=['src'] 缺口未登记）；6 P3；条件 B-1…B-3 全部落正文（§10.2）；Q 意见表：Q1/Q3/Q7/Q13/Q17 同意推荐、Q2/Q9/Q11/Q15 有条件同意（条件均已兑现） |
| 用户批准 | Q1…Q18 定案 + C99 编译环境 + 容差/步账冻结 | **批准（2026-11-15，CHG-20261115-10）** | 用户 2026-11-15 v1.9.0 承接清单（六项待办）+ G9 emit 前置 **AskUserQuestion 裁定「收口批准轮后 emit」**（裁定记录于 V190_WAVE_DESIGN DEC-2 / CHG-20261115-09）——Q1…Q18 全按推荐定案（§11；Q12 键面机制部分经评审 B 实读佐证）；C99 编译环境 = Q10 定案「按用户环境实况裁定」（本波复测 gcc/cc/cl 均不可用——阻塞维持，工具链到位后按 Q10 候选面裁定）；容差 = Q9(a) T-B + emit 轮实测 ×≥10 冻结；步账 = Q17(a) |

### 10.2 条件处置追记（FCFMU-G2b-02 收口回填——体例沿 FC §10.2）

| 条件 | 内容 | 处置 | 落点 |
|---|---|---|---|
| A-1（评审 A P1） | Run-4 行为声明被自身方程证伪——闭环平衡 280 mL / θ_max≈0.516 / 二次项零触发；θ>0.60 叙事属 Run-5 t≈47 s | **采纳落正文** | §2.1 Run-4 行修正 + §3.2 Run-4 行修正 + §2.4 FC_RULE_04 注记 |
| A-2（评审 A P2-1） | 残差定义 pre 相位矛盾——EQ-14 `phase≠pre` 门 vs EQ-22/23 RHS 无条件（原文缺陷逐字承袭） | **裁定落定**：pre 行 = 左极限时点求值 ⇒ 𝕀=0，两式数值一致；矛盾读法（pre 行 t=20.0≥t_fault）被 Q1(A) 排除 | §1.3 裁定注记段（FMU-2 自检按此复算） |
| A-3（评审 A P2-2） | 跨保真可比性三缺口：幅值单位错型 bias_A vs kPa/mL + 零共享观测通道 + compare.js 路径勘误 | **采纳登记为设计属性** | §2.5⑤(a)(b)(c)（compare 实位 = src/ui/pages/compare.js） |
| A-4（评审 A P3-1） | ZOH 语义显式化 | **采纳**：Δt=0.1 通信步内控制指令/故障参数零阶保持（ZOH）语义于数值方法段显式 | §1.3 数值方法注记（emit 轮实现对齐） |
| A-5（评审 A P3-2） | 事件快照变量覆盖钉（pre/post 快照 19 变量覆盖面） | **采纳**：快照变量覆盖 = §3.1 十九变量全集（u_an 裁定补入后二十键——Q16） | §3.1 表 + §4 项 6 |
| A-6（评审 A P3-3） | 教学尺度注记 | **采纳**：教学面经 sealed/blind 分域 + 因果六节承载；标注为集总参数演示尺度 | §1.8（epistemic declaration 既有承载） |
| A-7（评审 A P3-4） | θ_cap 值域措辞（V_water > V_cap_max 行为未定义） | **采纳落正文** | §3.2 包络登记段（域守卫为实现轮裁定面——原文既有） |
| B-1（评审 B P1） | §4 项 8 分派链三分支精确改写（r_meas_water_mL 静默错型形态）+ `_mL` 支插入点钉死 + dim 支定案 | **采纳落正文** | §4 项 8 + §9 R-5 + Q15 定案 |
| B-2（评审 B P2-1+P3-1/2/5） | 引用锚点校正四处（V1_FACES:197-198、engine.js 陈旧锚注记、scenario.js :430-447 注记、12 golden 计数偏差注记） | **采纳落正文** | §1.7 + §1.2 + §0 不做清单项 2 |
| B-3（评审 B P2-2） | R-G9-04 四域口径缺口显式登记 + 仓内化裁定 | **采纳落正文**（新 Q18 + 定案：src/** 机检 + tools/docs grep 抽检 + FaultLab-evaluation 定义性引用豁免） | §4 项 11 + §11 Q18 |

（评审 A 条件 A-1…A-7 系其 7 项发现的条件化编号——1 P1 + 2 P2 + 4 P3，与 §10.1 评审 A 行及
CHG-20261115-04 波次记录（71056ae 提交信息存档）一致；评审 A 无独立报告文件，以其 §10.1
回填行 + 波次记录为原始载体，本表即其条件处置的首次逐项落点登记。）

## 11. Q 点清单（**全候选 + 推荐——不定案**；定案于 FCFMU-G2b-02 批准轮，MG-DRAFT-Q 体例）

| # | 问题 | 候选 | 推荐（一句话，不定案） |
|---|---|---|---|
| Q1 | **601/602 行契约面（核心裁定点一）** | (A) 601 点 + 事件快照相位承载；(B) 602 行双列扩展 | **(A)**——冻结面零触碰 + golden 管线/V-09/MG 先例全链兼容零 breaking；(B) 触发 major 五件套且无教学增量 |
| Q2 | **model_provenance 新值（核心裁定点二）** | (A) additive 档位 fmu_l1_lumped_unvalidated + V312 显式 CHG 例外；(B) 复用 numerical_simulation+self_declared | **(A)**——§2.5.2 跨保真谓词功能必需；(B) 谓词无法成立 |
| Q3 | **actuator_fault 语义（新族 vs 参数扩展）** | (a) 族参数扩展（target 缺省逐位不变）；(b) 新族 actuator_drain_fault | **(a)**——family id 与原文一致 + scope.js 零触碰 + B-1a 保缺省逐位不变 |
| Q4 | EQ 编号方案 | (a) EQ-FCFMU-1…23 顺序编号（本草案）；(b) 沿原文无编号（State 1…5 口头引用） | **(a)**——冻结表可引用性（FLTH/FC EQ-id 先例）；23 条独立编号逐字对齐原文式数 |
| Q5 | oracle 命名 | `fc001_fmu_oracle.py`（G9 §4.1 原文给定） | **确认项**——沿原文命名（非开放裁定） |
| Q6 | oracle 自检段名 | (a) FMU-1…n；(b) FCFMU-1…n | **(a)**——唯一 FMU 轨无歧义、新文件新段先例（FL-x/GL-x/FEC-x 同构）；(b) 与未来第二 FMU 轨冲突时再议 |
| Q7 | DEFAULT_MODELS 追加 | (a) 尾追加 "fc001_fmu"（步① 无参调用六 golden）；(b) 不追加（parity 步独立承载） | **(a)**——FL/FC 先例形态 + 全注册行走步① 制度一致 |
| Q8 | golden Run 集 | G9 §2.4 白名单全集 5 Run；裁剪集 | **5 Run 全集**——原文白名单直接定义，裁剪无依据 |
| Q9 | 容差 tier 与 R-G9-02 ≤1e-9 张力 | (a) T-B + parity 独立机检（gate 值 emit 实测 ×≥10 冻结）；(b) T-A（仅 Python-Python）；超限降 T-C+convergence | **(a)**——跨语言双实现同制；1e-9 为数值容差承诺与位级禁令不冲突，实测超限则显式 CHG 重议原文口径 |
| Q10 | **C99 编译环境（批准轮裁定）** | (a) MinGW-w64/gcc + linux64 gcc 双平台；(b) MSVC（win64 先行）；(c) 单平台先行 + 其余登记后补 | **按用户环境实况裁定**（本草案不预设工具链；fmu_sha256 钉 hash 须固定二进制——R-G9-03 联动） |
| Q11 | **禁词增补（水位/液位/water level/liquid level 入 BANNED）** | (a) FCFMU-G2b-04 全局入表 + deviations 记录；(b) 不入表（仅文档纪律） | **(a)**——G9 R-G9-04 机检要求 + additive 增词零既有命中（实读 39 模式不含 + src/** 0 命中）；(b) 违反 G0-V05-DEC-03「enforced via copy-guard」原文 |
| Q12 | feedback_mode 枚举 | (a) additive 单新值 baseline + monitor_only→monitor 映射；(b) additive 双新值 baseline/monitor_only | **(a)**——最小 additive；EQ-FCFMU-18 两模式语义等价承载；名称差异映射表登记 |
| Q13 | FMU 轨选择键面 + model_id | (a) plant adapter 层绑定（场景零新键）+ model_id 自述 fc.pem.fmu_l1；(b) scenario 显式新键 | **(a)**——G9 外层原文无场景键面定义、涟漪最小；实现证明需场景钉轨则停下显式 CHG |
| Q14 | sensor_drift 双偏置目标参数面 | (a) additive 可选参数（target 通道 + 单位随目标）；(b) 拆分新族 | **(a)**——族 id 与原文一致（同 Q3 理由）；缺省轨逐位不变 |
| Q15 | gate 键面缺口（_mL/无量纲键） | (a) verify_golden additive 新增 `_mL` 分支 + 无量纲专用 gate 键；(b) 信号尾缀改名规避 | **(a)**——schema_id 与原文 §2.3 逐字一致优先（跨保真/文档对齐）；分派支 additive 既有键路由零变化证明随实现提交 |
| Q16 | 方程转写缺口三件（u_an closed_loop 取值 / nom 四常量字典归属 / 残差两口径） | 逐件：补字典 + 显式裁定（推荐）vs 留派生常量登记 + 按原文双保留 | **补字典 + 裁定**——u_an 按「维持 0.50」转写待批；nom 四值按标称点解析派生补入；残差以 §2.2.3 为准、FC_RULE_06 括注登记 |
| Q17 | run-g2 步账（I-7）+ fmu_sha256 钉 hash + parity 归属 | (a) parity 独立步（SKIP 语义显式）+ 钉 hash CHG + 步账扩账申报；(b) parity 并入 verify_golden | **(a)**——parity 依赖编译产物（环境依赖显式化）；V312 FROZEN 修订纪律 + 勘误②③④ 一次打包 |
| Q18（B-3 增设——批准轮新增） | R-G9-04 四域口径 vs copy-guard SCOPES=['src'] 缺口仓内化 | (a) exit 0 = src/** 域机检 + tools/docs 域 grep 抽检登记 + FaultLab-evaluation 定义性引用豁免；(b) 扫描域 additive 扩张（SCOPES 扩四域）；(c) 原文四域表述勘误化 | **(a)**——面⑧「当前实现只扫 src/**——边界即承诺」原文实读；扫描域扩张波及全库词面审计（涟漪不成比例）；FaultLab-evaluation 三文件（本规格/G9 落档/V170_WAVE_DESIGN）含四词字样系禁词定义性引用（转写义务），豁免登记如实 |

**定案记录（FCFMU-G2b-02 批准轮，2026-11-15，CHG-20261115-10——全部按推荐定案；实现轮不再重开，如实现中证明不可行停下显式 CHG）**：
- **Q1 = (A)**：601 点 + 事件快照相位承载（pre=left_limit / post=post_sample）——CONTRACT §4.6 冻结面零触碰；golden 管线/V-09/MG 双快照先例全链兼容；零 breaking。
- **Q2 = (A)**：additive 档位 `fmu_l1_lumped_unvalidated` + V312 显式 CHG 例外打包（Q17）——条件兑现：P3-6 差异（A-4 docstring 纪律 vs admit() 未机检）随 CHG 一并处置（A-4 纪律文本同步修订登记）。
- **Q3 = (a)**：actuator_fault 族参数扩展（target 显式可选键缺省 = 既有 valve 语义逐位不变 + B-1a 纪律）；FC-Run-5 显式 target='drain_valve'、α_drain=0.45。
- **Q4 = (a)**：EQ-FCFMU-1…23 顺序编号冻结表（23 条独立编号逐字对齐原文式数）。
- **Q5 = 确认**：oracle 命名 `tools/oracle/fc001_fmu_oracle.py`（原文给定）。
- **Q6 = (a)**：自检段名 FMU-1…n。
- **Q7 = (a)**：DEFAULT_MODELS 尾追加 "fc001_fmu"（步① 无参调用六 golden 顺序验证；label 滞后说明沿 V120 DEC-5 先例维持登记）。
- **Q8 = 5 Run 全集**（原文白名单直接定义）。
- **Q9 = (a)**：T-B 容差 tier + parity 独立机检；1e-9 为数值容差承诺（非位级）——gate 实际值以 emit 轮双实现（Python↔Python 先行）实测散差 × 安全系数 ≥10 冻结；C-Python parity 待编译产物（Q10 解锁后），实测超限停下显式 CHG 重议 R-G9-02 口径。
- **Q10 = 按用户环境实况裁定**：2026-11-15 本波复测 gcc/cc/cl 均不可用——C99 编译/parity/FMU 打包阻塞维持；预烘焙 JSON bundle 兜底路径 = G0-V05-DEC-01（file:// 模式 golden 档案只读）已裁定采行；工具链到位后按候选面（MinGW-w64 双平台 / MSVC win64 先行 / 单平台先行）裁定补做。
- **Q11 = (a)**：禁词四词（水位/液位/water level/liquid level）入 BANNED（全局入表 39→43）+ deviations.md 记录 + tests/teaching.test.js:264 镜像断言同步（P3-4）；时点 = FCFMU-G2b-04（随 FMU 文案落地同轮）。
- **Q12 = (a)**：feedback_mode 枚举 additive 单新值 `baseline` + G9 `monitor_only` → 仓内既有 `monitor` 映射（EQ-FCFMU-18 两模式语义等价承载；名称差异映射登记）。
- **Q13 = (a)**：FMU 轨选择 = plant adapter 层绑定（场景零新键）；model_id 自述 **fc.pem.fmu_l1**；model_version **'1.0.0'**（新轨首版——fc.pem.l0 先例 1.0.0 同构；golden 元数据同值，轨语义由 golden_id/model_id 承载）。
- **Q14 = (a)**：sensor_drift 双偏置目标 additive 可选参数（target 通道 + 单位随目标；缺省轨逐位不变）。
- **Q15 = (a)**：verify_golden additive 新增 `_mL` 分支（gate 键 V_mL_atol；插入点 = `_kPa` 后、`r_true`/`r_meas` 子串判别前——B-1 钉死）+ 无量纲 dim_atol 条件支（尾缀 `_true`/`_est`/`_cmd`；置于 `_kWh` 后、兜底前）；schema_id 与原文 §2.3 逐字一致优先；既有键路由零变化证明随实现提交。
- **Q16 = 补字典 + 裁定**：u_an 于 closed_loop 域按「维持 0.50」转写定案；p_O2_nom=120.0 / p_N2_nom=50.0 / p_H2_nom=180.0 / u_o2_nom=0.50 四常量按标称点解析派生补入字典；残差以 §2.2.3 为准、FC_RULE_06 括注登记（§1.3 裁定注记段）。
- **Q17 = (a)**：parity 独立机检步（SKIP 语义显式——V312 §9⑥ 先例）+ fmu_sha256 钉 V312 须 CHG + 步账扩账显式申报；勘误②③④ 一次打包。
- **Q18 = (a)**：R-G9-04 仓内化 = src/** copy-guard 机检 + tools/docs grep 抽检 + FaultLab-evaluation 定义性引用豁免（B-3）。

---

**修订记录**：
- v0.1（2026-11-15 初稿，V170 波阶段一 W1 / CHG-20261115-04 授权链）：全文初稿——G9 原文
  逐字保留声明 + 逐条映射表；§0 边界 + 勘误头七项承接表（§0.1）；§1 模型形态（三层架构 /
  工件身份 / EQ-FCFMU 冻结表草案 / 19 参数字典 / 两核心裁定点对照 / B-1a 键面 /
  epistemic declaration 转写）；§2 影响面（5 Run 矩阵 + actuator 裁定点 / 白名单与哈希 /
  因果六节 / 跨保真白名单）；§3 锚点与包络（19 变量稳态表解析精确值 / 轨迹结构——数值留
  批准轮）；§4 golden 计划十二项（gate 键面缺口预登记 / R-G9-02 张力登记）；§5 排期；
  §6 红线自查 + copy-guard 预查（BANNED 39 现值实读——四词入表 Q11）；§7 进入条件；
  §8 工作面 FCFMU-G2b-01…04；§9 风险 R-1…R-8；§10 评审记录留空；§11 Q1…Q17 不定案。
- **v1.0（2026-11-15 批准轮收口，FCFMU-G2b-02 / CHG-20261115-10）**：双路独立评审 A
  （PASS_WITH_CONDITIONS(7)）+ B（PASS_WITH_CONDITIONS(3)——evidence/g2b/FCFMU_G2B_REVIEW_B.md）
  + 用户书面批准（AskUserQuestion 裁定链）；条件 A-1…A-7/B-1…B-3 全部落正文（§10.2）；
  Q1…Q18 全按推荐定案（§11 定案记录——Q18 = B-3 增设）；评审 A P1 修正（Run-4 行为声明
  ——§2.1/§3.2/§2.4）；残差 pre 相位矛盾裁定（§1.3 注记段）；跨保真可比性三缺口登记
  （§2.5⑤——compare 实位路径勘误）；gate 键面三分支精确口径 + `_mL`/dim 支插入点钉死
  （§4 项 8/§9 R-5）；锚点四处校正（B-2）；R-G9-04 仓内化口径（Q18）；头部/状态由 DRAFT
  v0.1 升 APPROVED v1.0（git mv 更名——GT001_COMBUSTION_G2B_SPEC_APPROVED 先例同款）。

**状态 `APPROVED v1.0`**：FCFMU-G2b-02 批准轮收口（2026-11-15，CHG-20261115-10——双路
独立评审 + 用户书面批准 + 条件落正文 + Q 定案）。实现面（FCFMU-G2b-03 oracle emit /
G2b-04 C99 编译）随用户逐版本指令派发；验收路径两门禁面（§4 项 10）自 fc001_fmu_v1 emit
verify 通过起开放；C99 编译/parity/FMU 打包按 Q10 定案阻塞维持（工具链或预烘焙路径裁定
已采 G0-V05-DEC-01）。

**文件结束**。FC001_FMU_G2B_SPEC_APPROVED v1.0（2026-11-15，FCFMU-G2b-02 批准轮收口，
CHG-20261115-10；原 FC001_FMU_G2B_SPEC_DRAFT v0.1 由本批准升格更名）。本规格为 G9 原文
（§2 全部）的仓内 G2b 化转写——原文以落档文件为唯一载体逐字保留；Q1…Q18 已定案冻结，
实现轮不再重开（如实现中证明不可行，停下显式 CHG）。
