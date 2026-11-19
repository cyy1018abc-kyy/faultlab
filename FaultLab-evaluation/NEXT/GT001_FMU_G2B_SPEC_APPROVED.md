# GT001_FMU_G2B_SPEC_APPROVED — GT-001 L1-FMU（第二例三层夹心）G2b 物理规格（APPROVED v1.0）

> **状态**：`APPROVED v1.0（2026-11-19，GTFMU-G2b-02 批准轮收口，CHG-20261119-01）——
> 双路独立评审（A:PASS_WITH_CONDITIONS(2) / B:PASS_WITH_CONDITIONS(3)）+ 用户书面批准
> （2026-11-19「批准」指令链——Q1…Q12 全按推荐定案）+ 条件 A-1/A-2/B-1/B-2/B-3 落正文
> （§10.2）+ 更名 APPROVED v1.0（FCFMU-G2b-02 先例同款 git mv）。实现（GTFMU-G2b-03
> oracle emit / G2b-04 C99 编译）= v1.12.0 实现轮随批开工；Q7 = 平台矩阵 (a) 本轮裁定
> win64 先行（linux64/.dylib 后补重钉须 CHG）。`
> **任务**：V07_ROADMAP §1 主线 A **A-6 行**「GT-001 L1-FMU（第二例三层夹心）：热力链内核
> （EQ-GTL1-1..12/EQ-GTL2 域，gt001_v3/v4 oracle 为 Python 侧权威）——GTFMU-x 自检 + parity +
> adapter/bridge 复用；fc001_fmu 全套先例同构」的 G2b 草案轮兑现（v1.11.x 治理波——零代码
> 零版本，V07 §7 波行）。
> **授权**：V1120_WAVE_DESIGN v1（CHG-20261118-08，2026-11-18 批准——并发子智能体 S1 名额，
> CHG-20261118-07 ② 授权开工链；DECISIONS.md:1856-1858 台账实读）。上游授权 = V07_ROADMAP
> A-6 行（草案 v1.11 / 批准+实现 v1.12）。
> **物理权威与逐字保留声明（2'）**：GT-001 热力链物理内容（方程/参数/稳态点/Run 矩阵/因果/
> 白名单/验收判据）以**已批准的 GT 规格为唯一权威**——`GTL1_G2B_SPEC_APPROVED v1.0 §2`
> （EQ-GTL1-1…12 + §2.1 常量表 15 位有效数字登记值 + §2.3 更新序骨架）与
> `GT001_COMBUSTION_G2B_SPEC_APPROVED v1.0 §1.3`（EQ-GTL2-1…12 冻结表 + τ_comb = 0.5 s +
> x_comb(0) = k_f·u(0) 定案）；Python 侧数值权威 = `tools/oracle/gt001_l1_oracle.py`（gt001_v3）
> 与 `tools/oracle/gt001_comb_oracle.py`（gt001_v4）实读（RK4 更新序/常量/Run 定义从实读提取，
> 值零改动）。本草案为该物理的**仓内 G2b 化 FMU 轨转写草案**——物理内容逐字转写不改值；
> 命名/结构/层归属差异一律登记 Q 点（§11）或映射表注记，不静默改写。逐条映射表见下。
> **体例模板**：`FC001_FMU_G2B_SPEC_APPROVED v1.0`（FCFMU-G2b-02 批准轮收口，CHG-20261115-10
> ——fc001 FMU 草案→批准全程先例；本草案逐节同构其 §0–§11 结构）。
> **本波边界**：本草案只到「草案 + 双路独立评审」（W2a 物理/数值 + W2b 治理/契约面，互不可见，
> 结论由 W4 代录 §10）+ 用户书面批准（v1.12.0 批准轮）；不定实现、零代码/golden/oracle 触碰
> （I-4/I-8——V1120 治理波零代码授权字面维持）。
> **前置与先例**：三层夹心在位面全链实读（2026-11-18）——`tools/backend/fmu/fc001_l1.c`
> （344 行，I-3 边界头注 :5-9、构建命令钉死 :19-21）+ `tools/backend/fmu/modelDescription.xml`
> （99 行）+ `tools/backend/py/fmu_runner.py`（run_fc001_shell :183-324——D-27 已关闭）+
> `tools/oracle/fc001_fmu_parity.py`（147 行——R-G9-02 parity 实测散差 0.0 先例）+
> `tools/oracle/fc001_fmu_oracle.py`（687 行——FMU 轨 oracle 镜像模式先例）+
> `src/core/plants/fc001-fmu-adapter.js`（外层 adapter/兜底先例）+ bridge.py；
> 数据面：`data/golden/` 现值 **13 golden** 实读（13 .json + 13 .sha256——B-1 计数注记）（gt001_v1…v4、fc001_fmu_v1 等）+
> `data/fmu/fc001_l1_v1.fmu`（18117 字节实读）。
> **行号基准说明**：本文行号为起草时点（2026-11-18，V1120 波 S1 树）实读值。关键复核点：
> V07_ROADMAP.md:21（I-8）/ :44-50（主线 A A-6/A-7/A-8 行）/ :77-78（v1.11.x/v1.12.0 波行）；
> V1120_WAVE_DESIGN.md:5（CHG-20261118-08 授权记录）；gt001_l1_oracle.py:122-158（冻结常量
> ——K_F :145 / MDOT_A :146 / C_3 :147 / MDOT_G0 :148）/ :178-188（SERIES_IDS 27 列）/
> :191-210（RUNS 6 Run）/ :231-256（chain_algebra）/ :262-438（_simulate_core 分区更新序）/
> :522-720（GL-1…8）/ :748-762（TOLERANCES gate 十键）；gt001_comb_oracle.py:173（TAU_COMB
> = 0.5）/ :215-225（SERIES_IDS 同集 27 列）/ :228-247（RUNS 6 Run）/ :268-298（chain_algebra
> 三维）/ :1223-1237（TOLERANCES）/ :1246-1253（包络冻结界 + X_CROSS_TOL）；
> scripts/verify_golden.py:105-296（MODELS 表——gt001 :222-238 / gt001_comb :239-257 /
> fc001_fmu :199-221）/ :311（DEFAULT_MODELS 六成员现值）/ :313（KEY_POINTS）/:333-418
> （series_limit T-B 分派链——_A :345/_Hz :347/_rpm :349/_K :351/_kPa :353/_mL :364 条件支/
> r_true :366/r_meas :368/_kW :370/SOC :372/_pct :374/_V :382 条件支/_kWh :392 条件支/
> dim :402 条件支/f_Hz_atol 兜底 :405）/ :421-449（metric_within）；tools/run-g2.mjs:4
> （36 步全量现值）/:102（STEPS）/:138（fc001 parity 第 36 步 extended + skipFmu SKIP 语义）；
> docs/CONTRACT.md:391（「时间数组严格 601 点」冻结面）；src/core/registry.js:111/:253-254
> （provenance 两枚举现值）；src/core/scope.js:16-17（APPROVED 白名单——无 GT 分支）；
> tools/copy-guard.mjs:15（SCOPES=['src']）/:30-59（BANNED 现值 43 模式——:37「FMU」禁词行、
> 四词已随 FCFMU-G2b-04 入表）/ tests/teaching.test.js:264（BANNED.length===43 镜像断言）；
> tools/backend/py/fmu_admission.py:8-16（A-1…A-5）/:30-31（PLATFORM_DIRS 五平台）。
> 实现轮以语义锚点定位；批准轮实读复核后加注不改引文（FC 体例 A-7 同款）。

## 上游 → 本草案逐条映射表（2' 承诺面）

| 上游（批准规格/oracle 实读） | 内容 | 本草案落点 | 转写注记 |
|---|---|---|---|
| GTL1 §2.1 常量表 | 登记常量 + 设计点导出量（15 位） | §1.4 | 逐字转写（值零改动；ṁ_g0 展示值同源） |
| GTL1 §2.2 EQ-GTL1-1…12 | 方程集（thermo 基准轨） | §1.3 EQ-GTFMU-1…12 | 方程列逐字转写；FMU 化标注列为本草案新增结构面（层归属 = Q1 裁定点） |
| GTL1 §2.3 更新序骨架 | RK4 分区伪代码（oracle/引擎唯一权威） | §1.3 数值方法段 / §1.5 | 骨架逐字承接；FMU 语境层归属映射 = Q1（GTL1 §2.3 文本对 FMU 轨的层归属无规定——缺口显式登记，非静默） |
| GTCMB §1.3 EQ-GTL2-1…12 | comb 深化轨冻结表 + τ_comb=0.5 + x_comb(0) | §1.3 comb 变体行 / §3.2 | 修订式（-3/-4/-12）逐字转写；≡ 原样式（-1/-2/-5…-11）对应关系沿 GTCMB 冻结表说明列 |
| GTL1 §3.1 设计点 + oracle GL-1 | 标称稳态解析值 | §3.1 | 逐字转写（显示位冻结值零改动；oracle 复核容差面如实登记） |
| GTCMB §3.2/§3.3（五） | 稳态不变性与三点核验 | §3.2 | 结构声明 + 登记值转写 |
| GTL1 §3.2/§3.3.1 + GTCMB §3.3（一）（二）（三） | 锚点/域扫描/包络 | §3.3 | 数值一律批准轮 emit 冻结（FMU golden 自有锚点由本轨 oracle 复算——上游登记值仅作结构预填对照，如实区分） |
| gt001_l1_oracle.py RUNS（:191-210） | 6 Run 定义（thermo） | §2.1 | 逐字转写（key/role/feedback_mode/family/magnitude/unit/inertia_model） |
| gt001_comb_oracle.py RUNS（:228-247） | 6 Run 定义（thermo_comb） | §2.1 | 同上；t_clear_s=35.0 事件承载 |
| oracle 事件面（EV-001/EV-002） | 事件编码 v1 六场景对齐 | §2.3 | 零扩展转写（oracle :450-515/:571-636 实读） |
| FC001_FMU_G2B_SPEC_APPROVED §0–§11 | 体例模板 | 全文 | 逐节同构（GT 语境改写面逐处注记；§2.4 六节因果在 GT 无对应上游内容——零转写登记） |
| V07_ROADMAP A-6 行 | 轨内容域面 | 头部 / §1 / §11 Q2/Q11 | 「EQ-GTL1-1..12/EQ-GTL2 域」「GTFMU-x 自检」原文承载 |

---

## 0. 本规格边界（做/不做）

- **做（本草案 = GT-001 热力链 FMU 轨的 G2b 转写草案面）**：三层夹心架构与工件面（§1.1/§1.2）、
  EQ-GTFMU 冻结表草案（§1.3——EQ-GTL1-1…12 逐字转写 + FMU 化标注列 + comb 变体修订式；
  层归属 = Q1 不定案）、常量字典转写（§1.4）、两核心裁定点（控制积分器 u 归属 §1.5/Q1、
  模型变体面 §1.6/Q2——候选对照 + 推荐，**不定案**）、键面登记（§1.7——零新 scenario 键）、
  epistemic declaration 转写与 provenance 档位裁定点（§1.8/Q8）、Run 矩阵转写（§2.1——12 Run
  白名单提案/Q5）、白名单与哈希面（§2.2）、事件编码面（§2.3）、跨载体比对面（§2.4）、
  锚点与包络（§3——动态数值一律批准轮 emit 冻结）、golden 计划（§4）、排期（§5）、红线自查
  （§6——I-1…I-9，I-8/I-9 为 V07 新增两条）、五项进入条件（§7）、工作面分解（§8）、风险（§9）、
  评审记录留空结构（§10）、Q 点清单（§11——Q1…Q12 全候选 + 推荐，**不定案**）。
- **不做（本草案显式排除）**：
  1. **本波只到草案 + 双路评审**：实现（C99 内核编译 / run_gt001_shell 扩展 / parity /
     adapter / bridge 接线 / oracle emit）全部留 v1.12.0 批准轮后（§8 GTFMU-G2b-03/04）；
     平台矩阵批准轮裁定（Q7）——本草案不定实现。
  2. **golden 零触碰**：gt001_fmu_v1（Q2(a) 另含 gt001_fmu_comb_v1）为新 id 并列轨（§4 项 1），
     emit = v1.12.0 批准轮后 GTFMU-G2b-03；既有 **13 golden**（gt001_v1…v4、fc001_v1/v2、
     fc001_fmu_v1、fl001_v1/v2/v3、mg001_v1、pv001_v1、wt001_v1——2026-11-18 实读 `ls
     data/golden/`）字节冻结零变更；gt001_l1_oracle.py / gt001_comb_oracle.py 物理零触碰
     （V-03 字节语义 + **I-9 自冻结**——V07_ROADMAP:23「golden 入库后其 oracle 源文件字节
     不可变更」）。
  3. **引擎轨/既有轨零涉**：thermo/swing/linear/thermo_comb 四轨的引擎分派链、systems.js
     声明面、gt001_v1…v4 全链冻结不动——FMU 轨为**并列实现载体轨**（轨关系由 provenance/
     model_id/golden_id 承载——非任何既有轨之取代，supersedes=null）；L2 盲包 FMU 轨入池 =
     V07 A-8（v1.13.0 G10 裁定面）不在本草案。
  4. **L2 不做沿袭**：CFD/FEA/多体动力学维持不做（GT001/GTL1/GTCMB 三轮原文引用维持，
     本轨不重引不放松）；L3+ 不设。
  5. **I-1 零依赖定位**：C99 FMU 内核为 **backend 工件**（tools/backend/fmu/——开发/评审
     环境编译产物），**非产品依赖**；浏览器前端零依赖维持（file:// 离线模式走静态预烘焙
     golden run 兜底——fc001-fmu-adapter.js 先例同构）；oracle/fmu_runner/bridge 仅标准库
     （实读）；编译工具链 = 环境工具非运行时依赖（Q7 登记）。
  6. **本轮不动清单**：tools/backend/** / tools/oracle/** / src/** / data/** / scripts/** /
     tests/** 全部零触碰（均为 v1.12.0 批准轮后显式工作面）；不引入第三方依赖（I-1）；
     V1120 治理波零代码授权字面维持。
- **GT-001 FMU 轨现状基线（2026-11-18 实读登记）**：GT-001 现有 L0b linear/swing 双轨
  （gt001_v1/v2）+ L1 thermo 轨（gt001_v3，默认轨）+ L1 深化 thermo_comb 轨（gt001_v4），
  均为引擎/Python 侧实现，均非 FMU；FMU 轨为**第五轨（实现载体轨）**——物理与 thermo 基准
  （Q2(a) 另含 comb 深化镜像）逐字同源，实现形态 = 三层夹心第二例（fc001 模式复刻——I-8）；
  fmu_runner.py 的 FC-001 壳（run_fc001_shell）为在位先例，GT 壳（run_gt001_shell）为
  GTFMU-G2b-04 新工作面。

### 0.1 上游契约面预裁定承接表（fc001 勘误头七项在 GT 语境的逐项承接）

| # | 预裁定（FC001_FMU 先例） | 本草案落点（GT 语境） |
|---|---|---|
| ① | 602 行（20.0⁻/20.0⁺ 双边界行）vs 冻结「严格 601 点」须裁定 | **GT：602 行问题不存在，登记沿用**——GT 库口径原生 601 点（GTL1 §0「60 s/dt=0.1/601 点库口径全部不变」；gt001_l1_oracle.py:152 N_SAMPLES=601 实读；docs/CONTRACT.md:391 冻结面）；GT oracle 无 G9 式「602 rows」表述（实读确认）——fc001 Q1(A) 定案口径（601 点 + 事件快照相位承载 pre=left_limit/post=post_sample）在 GT 为**既有原生结构**（i_pre=199/i_post=200、EV-002 349/350——oracle :79-80 实读），零裁定余量、零 breaking |
| ② | EvidenceBundle v1.1 fmu_sha256 additive 五哈希零变化证明 | §2.2 + §8 GTFMU-G2b-04（随实现交付证明——fc001 先例同构） |
| ③ | V312 FROZEN 清单钉 hash 须 CHG | §2.2（GT FMU 包 sha256 钉 hash = 批准轮 CHG 项——fmu_runner.py:136 FC_FMU_SHA256_PINNED 先例同构） |
| ④ | run-g2 步预算扩账（I-7） | §2.2 / Q10（现值 36 步实读——parity 步新增显式申报，批准轮裁定步账） |
| ⑤ | 新 scenario 键走 B-1a 显式键 + 零投影纪律 | **GT：本面收窄**——零新 scenario 键（inertia_model 既有枚举承载 thermo/thermo_comb 双值）；FMU 轨选择 = plant adapter 层绑定（Q12——fc001 Q13 先例） |
| ⑥ | copy-guard 新词（微重力域四词）作用域 | **GT 不适用（词面无涉）**——微重力域四词（水位/液位/water level/liquid level）与 GT 热力链无语义交涉，已随 FCFMU-G2b-04 全局入表（copy-guard.mjs:30-59 现值 43 模式 + teaching.test.js:264 镜像断言 43 实读）；转写纪律仍适用：本草案全程规避该四词词面（GT 链本无该词面需求——0 增词预期，Q 无需登记）；「FMU 结果」禁词（:37 现值）沿用规避（§6.3） |
| ⑦ | arena L2 预算常量协议附记 | 不在本草案（G10 面——V07 A-8 v1.13.0 顺延；映射表已登记） |

## 1. 模型形态

### 1.1 三层夹心架构与认知分离（FC001_FMU §1.1 模式复刻——I-8；GT 语境改写面逐处注记）

保真原则（fc001_l1.c:5-9 头注逐字承接）：在不把事件相位分裂逻辑复制进编译 C 二进制的前提下，
维持 true/measured/derived 三层信号严格分离——三层夹心架构（GT-001 版）：

| 层 | 工件（本轨工作面——GTFMU-G2b-04 Create/Update） | 职责（认知分离边界） |
|---|---|---|
| **内层——纯物理装置 FMU** | `tools/backend/fmu/gt001_l1.c`（Create，thermo 基准轨 2 微分态）+ Q2(a) 另含 `gt001_comb_l1.c`（comb 深化轨 3 微分态）+ 各自 `modelDescription.xml`（FMI 2.0 变量字典与 VR 契约）；编译为平台共享库并打包 FMI 2.0 Co-Simulation 档案 `data/fmu/gt001_l1_v1.fmu`（Q2(a) 另含 `gt001_comb_l1_v1.fmu`）——**V312 B-4 各自另批**（包级钉 hash 各自登记，Q2/Q3 联动） | C99 标准编写、零外部依赖；内联固定步长经典 RK4 积分物理微分状态（thermo：y=[f, T3]；comb：y=[f, T3, x_comb]；内部子步 δt=0.01 s）；**只暴露 input 变量（负荷指令 demand_kW / 燃料指令 u_eff_kW）与 true 物理状态/代数输出（真值面——exposure=sealed 标识语境）**——只出真值；传感污染（b_Hz）/控制反馈（调速器积分 EQ-GTL1-9/10）/测量列/事件 pre-post 左极限分裂全部归 host（Q1 裁定点——推荐 host，见 §1.5） |
| **中层——Python ctypes host 与 I-11 壳** | `tools/backend/py/fmu_runner.py`（Update——新增 run_gt001_shell；run_fc001_shell :183-324 先例同构） | 加载 FMU 二进制前校验 SHA-256（对 V312 钉值）+ fmu_admission 准入；承载**传感污染**（n_meas_rpm = 60·(f + b) 等测量列）、**控制反馈**（调速器积分 EQ-GTL1-9 + 指令域钳位 EQ-GTL1-10——Q1 推荐 host 承载）、**能量记账**（E_gen/E_bat 梯形、E_fuel/E_load/E_rotor 左矩形——oracle :366-376 冻结口径的 host 侧子步复刻）、**事件 pre/post 左极限分裂**（EV-001 t=20.0 / EV-002 t_clear=35.0——快照变量 = 采样行，oracle :461-514 同构）；run_hash = Run 内容规范 JSON SHA-256（零墙钟——:302-309 先例机制） |
| **外层——HTTP bridge 与预烘焙兜底** | `src/core/plants/gt001-fmu-adapter.js`（Create——fc001-fmu-adapter.js :1-13 先例同构；轨锚定校验 golden_id/model_provenance/model_id 三面——:23/:27/:64 先例句式） | 开发/评审模式连接本地 Python HTTP bridge（bridge.py 既有安全边界：127.0.0.1 回环 + Origin 白名单 + token——实读；simulate 端点 GT 路由为实现轮面）；file:// 离线模式加载**经验证的静态 golden run 档案**（预烘焙兜底——前端零依赖维持）；承载协议面（请求/响应/schema） |

**认知分离声明（I-3）**：FMU 内核只承载物理真值（sealed 标识面）；传感污染/控制反馈/记账/
协议分属 host 与 bridge——任何一层不得越层承载（如 C 内核内嵌调速器积分或传感偏置 = 违反
本架构，实现轮评审硬项——fc001_l1.c:7-8 原文口径逐字适用）。**GT 特有张力 = Q1**：GT 调速器
为**积分器**（EQ-GTL1-9，每子步显式推进——GTL1 §2.3「u 不是 RK4 状态——分区结构」冻结文本），
与 fc001 的代数比例控制（EQ-FCFMU-19）结构不同——层归属须裁定，见 §1.5（本草案最关键 Q 点）。

### 1.2 工件与模型身份面（V312 B-4/Q-5 准入承接——fc001 §1.2 先例同构）

- **FMU 各自另批（V312 B-4 适用 + V07 I-8「各自另批 + 模式复刻」原文）**：本规格即 GT-001
  FMU 的「各自另批」批准载体——批准轮收口（GTFMU-G2b-02，v1.12.0）方得实现；V312 准入机检面
  （fmu_admission.py A-1…A-5 :8-16 实读）沿用：zip 结构 + modelDescription.xml +
  binaries/<platform>/（PLATFORM_DIRS 五平台 :30-31 实读）+ model_manifest.json 字段齐备 +
  model_id 自述（**A-3 校准（B-3）：机检现值仅拒 fl001/FL-001（fmu_admission.py:11/:68-70）——「禁借用既有系统 id」的一般化表述超出机检实况；GT 防失真依赖 = 规格自选自述 id（gt.sync.fmu_l1 不撞 systemId/model_id 两域）+ engine.js model-hash 比对检查（现行位 :3356 附近）；A-3 机检扩集为实现轮 additive 收紧可选项（§8 登记）**——「gt.sync.fmu_l1」不撞引擎 SystemDef id「GT-001」，
  fc001_fmu MODEL_ID="fc.pem.fmu_l1" 先例同构）。
- **模型身份（Q3 复合）**：FMU 轨 model_id 须自述新值——候选 `gt.sync.fmu_l1`（推荐；
  fc.pem.fmu_l1 命名句式同构：域.物理面.轨——sync = 同步发电机机械接口面，摇摆方程 f 为
  机械接口锚点）/ `gt.gt.fmu_l1`（叠字弃形）/ `gt.turb.fmu_l1`（热机面直指）；不用
  `GT-001`（引擎 SystemDef id——A-3 自述禁令 + model_hash 自述一致性检查防失真，
  fc001 §1.2 登记句式同构）。model_version = **'1.0.0'**（FMU 轨首版新 id——
  fc001_fmu_v1 model_version='1.0.0' 实读先例；与引擎 SystemDef model_version '1.2.0'
  分属两 id 域，零冲突面）；见 §11 Q3。
- **provenance 准入面张力登记（沿袭）**：fmu_admission.py A-4 现行要求 manifest provenance
  标 `numerical_simulation` + self_declared=true；FMU 轨专用档位面 = §1.8/Q8（fc001 Q2(A)
  定案 + V312 显式 CHG 例外先例——GT 复用同值则**零新档位、零新 CHG 例外面**，登记）。
- **D-27 状态**：fmu_runner.py D-27 已随 fc001 FMU 关闭（:5/:383-385 实读）——GT 壳复用
  同一加载/doStep 机制面（_define_fmi2 :74-104 共用），无 D-27 类开口。

### 1.3 方程登记（EQ-GTFMU 冻结表**草案**——方程列 = GTL1 §2.2 逐字转写值零改动；
FMU 化标注列 = 本草案新增结构面，层归属 = Q1 裁定点）

thermo 基准轨（2 维 ODE + 代数链——GTL1 §2.2 原文转写；oracle/引擎唯一权威文本 = GTL1 §2
批准文本，本表为 FMU 轨转写面）：

| id | 方程（转写自 GTL1 §2.2——值与结构零改动） | GTL1 说明列要旨（节选——全文以 GTL1 原文为唯一载体） | FMU 化标注（层归属——Q1 推荐 (B) 口径；Q1(A) 下见 §1.5） |
|---|---|---|---|
| EQ-GTFMU-1（≡EQ-GTL1-1） | π_c = π_c0·(f/f₀)²；p2 = π_c·p1 | 压比-转速耦合（二次线性化；\|Δf\| ≤ 1 Hz 有效性域为承袭性假设声明——B-4 定案） | **内核**（RHS 内评值 + 代数输出 p2） |
| EQ-GTFMU-2（≡EQ-GTL1-2） | T2 = T1·(1 + (π_c^a_c − 1)/ε_c) | 压气机效率链 | **内核**（代数输出 T2） |
| EQ-GTFMU-3（≡EQ-GTL1-3） | Q_f = k_f·u_eff；ṁ_f = Q_f/LHV；ṁ_g = ṁ_a + ṁ_f | 燃料映射与燃气流量 | **内核**（u_eff 为 host 输入；Q_f 为代数输出——ṁ_f/ṁ_g 内核中间量） |
| EQ-GTFMU-4（≡EQ-GTL1-4） | **C_3·dT3/dt = η_b·Q_f − ṁ_g·cp_g·(T3 − T2)** | 燃烧室能量平衡 + 集总热容（**新动态状态 T3**） | **内核**（微分态 T3——RK4 面） |
| EQ-GTFMU-5（≡EQ-GTL1-5） | p3 = (1−β_b)·p2；π_t = p3/p1；T4 = T3·(1 − ε_t·(1 − π_t^(−a_t))) | 透平效率链 | **内核**（代数输出 T4） |
| EQ-GTFMU-6（≡EQ-GTL1-6） | P_comp = ṁ_a·cp_a·(T2−T1)；P_turb = ṁ_g·cp_g·(T3−T4)；**P_gen = η_m·(P_turb − P_comp)** | 功率链 | **内核**（代数输出 P_comp/P_turb/P_gen） |
| EQ-GTFMU-7（≡EQ-GTL1-7） | **df/dt = (P_rotor/K_J)·(f₀/f)**；P_rotor = P_gen + P_bat − P_load | 摇摆方程保留为机械接口（Q1 定案恒等式——r_true ≡ 0 检查面零涟漪） | **内核**（微分态 f——RK4 面） |
| EQ-GTFMU-8（≡EQ-GTL1-8） | P_bat = P_bat_ref − K_bat·(f − 50)（真值 f） | 电池下垂原样 | **内核**（代数输出 P_bat——真值口径） |
| EQ-GTFMU-9（≡EQ-GTL1-9） | f_gov = (monitor ∧ sensor_drift) ? f : f + b；u_next = clamp(u + Ki·(50 − f_gov)·h, 0, 40) | 调速器积分原样（仅输出语义改为燃料指令域）——**每子步显式推进（GTL1 §2.3 分区结构：u 不是 RK4 状态）** | **host（Q1 推荐 (B)）**——控制反馈层；Q1(A) 下入内核（b/monitor 标志成为内核输入——架构偏差面 §1.5） |
| EQ-GTFMU-10（≡EQ-GTL1-10） | 执行器激活窗内 u_eff = min(u, u_cap)，u_cap = 40·magnitude%；清除（t_clear）后 u_eff = u | 指令域钳位（Q5 定案：P_gen_cap_kW 保留指令域口径） | **host（Q1 推荐 (B)）**——故障窗/控制域；Q1(A) 下以 u_cap+激活窗标志输入入内核（min(u_next,40)≡u_next 精确映射注记——Q1 联动登记） |
| EQ-GTFMU-11（≡EQ-GTL1-11） | 设计点闭合：u=25 ∧ f=50 ∧ 稳态 ⇒ **P_gen = 25.000000 kW ∧ T3 = 1173.000 K**（双条件联立导出 k_f 与 ṁ_a） | 设计点标定条件（15 位常量下燃烧室平衡残差 4.3e-14 kW、P_gen 误差 0——A-1 定案） | **权威文本面**（常量标定依据——非运行时方程；内核初值 = 标称稳态点 §3.1） |
| EQ-GTFMU-12（≡EQ-GTL1-12） | C_3·(T3(t)−T3(0)) ≡ ∫₀ᵗ(η_b·Q_f − ṁ_g·cp_g·(T3−T2))dt（检查式，RK4 离散自洽）；E_fuel = ∫Q_f dt；η_cycle = E_gen/E_fuel | 能量恒等检查与新指标（设计点 η_cycle = 24.5668 %） | **oracle 自检面（GTFMU-2）+ host 记账面**（E_fuel/E_gen/E_bat/E_load/E_rotor 子步累计——oracle :366-376 冻结口径 host 复刻；η_cycle_pct 列 = 100·P_gen/Q_f 瞬时比，内核代数输出可承载，Q1 无涉） |

comb 深化轨变体（Q2(a) 并立案承载——修订式 = GTCMB §1.3 冻结表逐字转写；≡ 原样式对应
关系沿 GTCMB 冻结表说明列，零改动）：

| id | 冻结式（转写自 GTCMB §1.3） | FMU 化标注 |
|---|---|---|
| EQ-GTL2-3 | **Q_f = k_f·u_eff（指令映射口径维持）；τ_comb·dQ_f,d/dt + Q_f,d = Q_f；ṁ_f,d = Q_f,d/LHV；ṁ_g = ṁ_a + ṁ_f,d** | **内核**——x_comb 第三微分态（延迟状态，量纲 kW；不出信号——GTCMB Q10 定案零新信号沿袭）；ṁ_g 延迟同源（Q13 定案 (i)） |
| EQ-GTL2-4 | **C_3·dT3/dt = η_b·Q_f,d − ṁ_g·cp_g·(T3 − T2)** | **内核**（EQ-GTL1-4 修订式——η_b·Q_f 项改经 Q_f,d 进入） |
| EQ-GTL2-12 | C_3·(T3(t)−T3(0)) = ∫(η_b·Q_f,d − ṁ_g·cp_g·(T3−T2))dt′；E_fuel = ∫Q_f dt（**指令面**——Q13 定案 (ii)）；eta_cycle = E_gen/E_fuel | oracle 自检（GTFMU-2 comb 面）+ host 记账（E_fuel 指令面与 gt001_v4 记账口径连续） |

其余 EQ-GTL2-1/-2/-5/-6/-7/-8/-9/-10/-11 ≡ EQ-GTL1 同号式原样（GTCMB 冻结表对应关系逐字
沿袭——内核/host 层归属同 EQ-GTFMU 表，零重复登记）。

**数值方法（GTL1 §2.3 冻结骨架 + fc001 §1.3 数值段体例）**：经典固定步长 RK4；内核内部子步
δt=0.01 s；**输入冻结语义 = 子步起点右值**（GT oracle 逐子步冻结 b/demand/u_eff——oracle :350-363
实读；与 fc001 Δt=0.1 通信步 ZOH 形态的结构差异 = Q1 粒度面，§1.5 登记）；oracle 与 C99
内核+host **同算法同步长同运算序**（跨实现 parity 前提——§4 项 7）。**本轨更新序唯一权威
文本 = GTL1 §2.3 / GTCMB §1.3 冻结骨架 + §1.5 Q1 裁定的层归属映射合成**（FMU oracle 硬编码
= 该合成文本——fc001_fmu_oracle.py 头注模式先例）。

### 1.4 参数面（GTL1 §2.1 常量表逐字转写，值零改动；L0b 冻结值沿袭 + comb τ_comb）

| 参数 | 符号 | 值（批准规格冻结） | 单位 | 含义（转写） |
|---|---|---|---|---|
| T1 / p1 | T1 / p1 | 288.15 / 101.325 | K / kPa | ISO 参考大气（进口状态，常数，无环境动态） |
| cp_a / γ_a | cp_a / γ_a | 1.005 / 1.4 | kJ/(kg·K) / − | 空气定压比热 / 比热比；a_c = (γ_a−1)/γ_a = 2/7 |
| cp_g / γ_g | cp_g / γ_g | 1.148 / 4/3 | kJ/(kg·K) / − | 燃气定压比热 / 比热比；a_t = 1/4 |
| π_c0 | π_c0 | 8.0 | − | 设计压比（f=f₀ 时） |
| ε_c / ε_t | ε_c / ε_t | 0.82 / 0.86 | − | 压气机/透平 isentropic 效率（拟稳态常数效率） |
| β_b | β_b | 0.04 | − | 燃烧室压损系数（p3 = (1−β_b)·p2；排气 p4 = p1 无损失豁免） |
| LHV / η_b | LHV / η_b | 50 000 / 0.99 | kJ/kg / − | 燃料低位热值 / 燃烧效率 |
| η_m | η_m | 0.95 | − | 机械+发电机集总效率 |
| T3D | T3D | 1173.0 | K | 设计燃烧室出口温度（透平进口温度，900 ℃ 级教学口径） |
| τ_3 | τ_3 | 2.0 | s | 燃烧室集总热惯性时间常数（教学整定；与 L0b τ_g 同值——有意同尺度对照设计） |
| K_J / f₀ / Ki / K_bat / P_bat_ref | — | 5.0 / 50 / 2.0 / 24 / 5 | kW·s/Hz / Hz / − / kW/Hz / kW | 沿 L0b 冻结值原样 |
| **k_f** | k_f | **4.070531454334211** | kW_eq/单位指令 | 燃料增益：Q_f = k_f·u（设计点导出——EQ-GTL1-11；15 位有效数字，A-1 方案 a） |
| **ṁ_a** | ṁ_a | **0.144299140389011** | kg/s | 压气机空气流量（常数，流量-转速耦合豁免；精度同 k_f 行） |
| **C_3** | C_3 | **0.335983796442745** | kJ/K | 燃烧室集总热容（C_3 = τ_3·ṁ_g0·cp_g；精度同 k_f 行） |
| ṁ_g0 | ṁ_g0 | 0.146334406116178 | kg/s | 设计燃气流量（= ṁ_a + k_f·25/LHV 派生——展示值，GT L1 §2.1 精度登记注同源） |
| τ_comb（comb 变体） | τ_comb | 0.5 | s | 燃烧/能量转换一阶滞后时间常数（GTCMB §1.3 定案——教学整定值非实测；七项判据承载） |
| LOAD0 / SOC0 / V_bus / CAP | — | 30.0 / 60.0 / 400.0 / 40.0 | kW / % / V / kWh | L0b 冻结值沿袭（oracle :156-158 实读——demand 基值/SOC 初值/直流母线/电池容量记账面） |

**字典完整性声明**：无 fc001 式 nom 缺口（GT 常量表自含——k_f/ṁ_a/C_3 三设计点导出常量已
入 GTL1 §2.1 冻结表；ṁ_g0 为展示值派生量——oracle :148 注记如实转写）；执行器/传感参数
（magnitude/u_cap/t_clear）为 Run 矩阵注入面（§2.1），非模型常量——与 fc001 §1.4 十九参数
字典的结构差异如实登记（GT 无「19 参数」对应物，映射表注记）。

### 1.5 核心裁定点一：控制积分器 u 的层归属（Q1——两候选对照，推荐不定案；**本草案最关键 Q 点**）

GT 调速器（EQ-GTL1-9）为**离散积分器状态**：u_next = clamp(u + Ki·(50 − f_gov)·h, 0, 40)，
每子步 h=0.01 显式推进、子步末提交（GTL1 §2.3 冻结分区结构「u 不是 RK4 状态——每子步按
L0b 更新序显式推进」）；u 经 EQ-GTL1-10 钳位为 u_eff 进入内核 RHS。与 fc001 的代数比例控制
（EQ-FCFMU-19——无状态、按测量即时计值）结构不同：**u 是控制回路的状态的一部分**，其层归属
（内核 vs host）直接决定通信步形态与 I-3 边界面。

| 候选 | 形态 | I-3/架构面 | parity/更新序面 | 代价面 |
|---|---|---|---|---|
| **(A) u 进内核** | 调速器积分 EQ-GTL1-9/10 入 C99 内核（u 为内核内部离散积分状态——分区结构在内核内复刻：每子步 ①u 更新 ②RK4 ③提交）；输入面扩为 b_Hz（传感偏置——governor 读取路径）、monitor 标志（governor 读真值/受染值选择）、demand_kW、u_cap+激活窗标志；E_gen/E_bat/E_fuel/E_load/E_rotor 记账累计器入内核（子步粒度仅内核可见）；通信步维持 Δt=0.1 + 内部 10 子步（fc001 doStep 形态同构——fc001_l1.c:208 n=round(step/DT_INT)） | **I-3 张力**：内核内嵌控制反馈（调速器）+ 传感偏置 b 进入内核（同一污染参数跨测量层与控制层双域渗透）+ 故障窗参数入内核——与 fc001_l1.c:7-8「内核内嵌任何壳职责 = 违反架构」硬边界直接冲突，须显式架构偏差登记 + 实现轮评审硬项重议；EQ-GTL1-9/10 层归属自 GTL1 冻结文本的「控制面」漂移入内核 | 更新序可精确复刻（内核逐子步 ①②③ = oracle 同构）；parity 可达 | 输入面 +4（b/monitor/u_cap/窗标志）+ 内核职责扩张（记账累计器）——VR 契约与 manifest 方程面重排 |
| **(B) u 归 host（推荐）** | 调速器积分 EQ-GTL1-9/10 归 host（控制反馈层——fc001 壳职责先例同构）；host 以**子步粒度 h=0.01 驱动 doStep**（内核每次 doStep 恰 1 个 RK4 子步——n=1；输入 u_eff/demand 于每次调用前设置 = 子步冻结语义，与 oracle 逐子步冻结精确同构）；host 子步循环：读内核真值 f（sealed 输出）→ f_gov = (monitor ∧ sensor_drift) ? f : f+b → u_next → u_eff → 设输入 → 读子步起点代数值（k1 面）→ doStep(0.01) → 读子步终点代数值（al_b 面——输入未变）→ 记账累计（E_gen/E_bat 梯形、E_fuel/E_load/E_rotor 左矩形——oracle :366-376 口径逐条复刻）；内核 = 纯物理真值（RK4 + 代数链），与 fc001_l1.c 结构孪生 | **I-3 逐字维持**：内核零控制零污染零记账扩张（fc001_l1.c:5-9 硬边界原文全链适用）；EQ-GTL1-9/10 层归属与 GTL1 冻结文本的引擎侧控制面同位（host 扮演引擎控制面角色——GT001 §2.3「分区结构」的 FMU 语境映射） | 更新序可精确复刻（host 子步循环 + 内核单子步 = oracle 分区结构逐步对应——healthy/monitor 恒等结构判据全链沿用，§4 项 5）；parity 可达 | **通信步粒度偏离 fc001 Δt=0.1 形态**（doStep@0.01——6000 调用/Run vs fc001 600；FMI CS 合法：固定 0.01 粒度、canHandleVariableCommunicationStepSize=false 同款钉死）；host 更厚（子步级控制/记账循环）——**接口排程差异非架构违反，显式登记（映射表注记 + DefaultExperiment stepSize=0.01）** |

**推荐一句话**：采 (B)——I-3 架构硬边界（fc001_l1.c 头注原文）与 GTL1 §2.3 分区冻结文本
双层佐证：调速器属控制反馈层非物理装置，u 进内核 = 内核内嵌壳职责（违反架构）；(B) 使
FMU+host 系统更新序与 gt001_v3/v4 oracle 逐步精确对应（镜像轨恒等判据/parity 制度全链沿用）；
代价仅为通信步粒度 0.01（FMI CS 合法形态、显式登记）。**ZOH 降级变体（u 归 host 但按 Δt=0.1
通信步计值——fc001 A-4 形态字面套用）排除登记**：调速器积分步长 0.1≠0.01 为离散语义实质
变更（积分步幅 10 倍），FMU 轨将失去与 gt001_v3/v4 的同构镜像面（教学/比对 payoff 归零）且
偏离 GTL1 §2.3「每子步显式推进」冻结文本——非映射差异而是物理转写偏离，不采（如批准轮坚持
该形态须按「离散语义变更」重走裁定并放弃镜像恒等判据——显式登记不静默）。

### 1.6 核心裁定点二：模型变体面（Q2——thermo 基准 + comb 并列 vs 单轨，推荐不定案）

| 候选 | 形态 | 影响 |
|---|---|---|
| **(a) thermo 基准 + comb 深化双轨并列（推荐）** | 两 C99 内核（gt001_l1.c 2 态 / gt001_comb_l1.c 3 态）+ 两 .fmu 包（各自 V312 B-4 钉 hash）+ 两 golden（gt001_fmu_v1 / gt001_fmu_comb_v1——各自 supersedes=null）+ 单 oracle 双 Run 组（或双 oracle——Q4 联动） | V07 A-6 行原文域面「EQ-GTL1-1..12/**EQ-GTL2 域**，gt001_v3/**v4** oracle 为 Python 侧权威」逐字承载——GT 现行双轨物理完整 FMU 化；内核增量 = 单态（x_comb）+ 单 RHS 项（EQ-GTL2-3/4），夹心/host/parity/adapter 机制全复用；教学面/比对面全覆盖；代价 = 双包双 golden 双钉 hash（批准轮 CHG 打包面 +1） |
| (b) thermo 基准单轨 | 仅 gt001_l1.c / gt001_fmu_v1；comb 变体留后续独立轮（各自另批再议） | 最小第二例（fc001 = 单物理单包先例字面同构）；comb 轨 FMU 化缺位——GT 最新深化物理无实现载体面，V07 A-6 域面EQ-GTL2 半程兑现 |

**推荐一句话**：采 (a)——V07 A-6 行域面原文双轨点名 + comb 内核增量微小 + 机制全复用；
双包各自钉 hash 与 B-4「各自另批」纪律兼容（批准轮 CHG 一次打包两包钉值——Q2/Q10 联动）。

### 1.7 键面（零新 scenario 键——B-1a 显式键纪律在本轨的收窄登记）

| 键面 | 登记 |
|---|---|
| inertia_model 枚举 | **零新增**——既有枚举 ['swing','linear','thermo','thermo_comb']（scenario.js:56 GTCMB 登记口径沿袭）已承载 FMU 镜像轨双值（thermo/thermo_comb）；FMU 轨 Run 的轨语义由 inertia_model + model_provenance（Q8）+ backend 路径三元承载，scenario 输入面零新键 |
| 传感/故障参数面 | 零新增——GT 三故障族（sensor_drift/load_step/actuator_fault 含 clear 局）参数域原样（magnitude/unit/t_clear_s——oracle RUNS 逐字，§2.1）；FMU 轨不扩故障族 |
| B-1a 显式键纪律 | 本轨无新键 ⇒ 该纪律无触发面（fc001 §1.7 的 feedback_mode/sensor_drift 参数面扩张在 GT 无对应物——如实登记收窄）；config_hash 投影面零变化（inertia_model 既有投影成员——GTCMB B-2 定案 schema.js:144 口径沿袭，FMU 轨不改投影面） |
| FMU 轨选择键面 | **Q12**：推荐 plant adapter 层绑定（gt001-fmu-adapter.js——fc001-fmu-adapter.js :1-13 先例同构；场景零新键；轨锚定校验 = golden_id/model_provenance/model_id 三面）；备选 = scenario 显式新键（B-1a 同构）——若实现证明需场景级钉轨，停下显式 CHG |

### 1.8 Epistemic Declaration 转写与 provenance 档位（Q8——fc001 §1.8 体例同构）

| 声明面 | 冻结表草案（转写 + GT 语境） |
|---|---|
| 模型来源 | GT-001 L1-FMU 轨为**行为与数值集总参数演示模型**（model_provenance 档位 = Q8）；全部仿真输出保持 synthetic；热力链为教学尺度降阶循环模型（GTL1 §6.1 定位句沿袭——非机组/电网动态验证） |
| 硬件/实证 | 非硬件台架遥测推导（hardware_verification="not_performed"）；未对经验机组热力数据验证（model_validation="not_performed"）——「教学尺度降阶循环」定位句式（GTL1 A-gtl1-l1 沿袭） |
| 自洽性边界 | 通过内部一致性检查（verification.consistency_checks="pass"）、run_hash 确定性复现、独立 oracle golden 比对（T-B 容差——实测散差 ×≥10 冻结制）仅确立**数值与实现自洽**——不得表述为物理守恒验证或硬件认证（I-5 措辞红线联动——「数值自洽」固定句式） |
| **Q8 provenance 档位** | **候选 (a) 复用 `fmu_l1_lumped_unvalidated`（推荐）**——fc001 Q2(A) 定案已立的 additive 档位，跨系统共享（枚举零新增；registry.js:111/:253-254 两枚举现值之外唯一 FMU 档位——fc001_fmu_v1 golden 顶层 + run 级 model_provenance 字段实读先例 :12/:91）；GT FMU 轨物理同为「数值集总未经实验/硬件验证」档，语义同档复用无失真；候选 (b) gt 前缀新值（gt_fmu_l1_lumped_unvalidated）——系统自述性更强但枚举扩张无语义增量 + 跨载体比对谓词分裂；(b) 不推荐。fc001 Q2 张力面（fmu_admission A-4 vs 专用档位）随复用沿袭——**B-2 校准：枚举零新增，但 V312 §7 例外行 + fmu_admission A-4 docstring 的适用面现值限定 FC-001 ⇒ GT 复用的扩域（FC-001 限定 → 已批 FMU 轨通用或增列 GT-001）随批准轮 CHG 打包（与 §10 钉 hash CHG 同文件同轮）——「零新增例外面」不成立，如实登记** |

## 2. 场景/事件族影响面

### 2.1 Run 矩阵转写（白名单提案——oracle RUNS 逐字转写，值零改动；t_fault_s=20.0、duration_s=60.0、dt_s=0.1、601 点）

| Run（key 逐字） | 镜像源 | role | feedback_mode | family | faulted | magnitude（unit） | 特有参数 | 20.0 s 事件不连续（GT 事件编码 v1 口径——oracle :450-515 实读） | 仓内映射注记 |
|---|---|---|---|---|---|---|---|---|---|
| healthy | gt001_v3 + v4 双镜像 | baseline | closed_loop | none | False | 0.0（""） | — | 无事件（全信号解析恒等轨——f≡50/T3≡1173） | Q11(a) 初值机制下 comb 镜像轨与 thermo 镜像轨 healthy 恒等（§3.2） |
| closed_loop_fault | 同上 | fault | closed_loop | sensor_drift | True | 0.3（Hz） | fault_id=speed_sensor_bias | EV-001 sensor_bias：n_meas_rpm 3000→3018（b=+0.3 进测量列与 governor 路径——Q1 层面承载）；pre=199（left_limit）/post=200（post_sample） | 监测面 = 60·(f+b)；f_true 不跳变（C⁰ 连续） |
| monitor_only | 同上 | monitor | monitor | sensor_drift | True | 0.3（Hz） | 同上 | EV-001 同上（测量面跳变、物理面零扰动——b 不进物理回路） | monitor 恒等判据（f≡50 全序列——GL-8/GCMB-6 先例） |
| load_step | 同上 | fault | closed_loop | load_step | True | 10.0（kW） | fault_id=load_step_10kW | EV-001 load_step：P_load_demand_kW 30→40（demand 进内核 RHS——P_rotor 面） | nadir 锚点面（§3.3） |
| actuator_fault | 同上 | fault | closed_loop | actuator_fault | True | 50.0（%） | fault_id=fuel_valve_stuck；u_cap=40·magnitude%=20 kW_eq（EQ-GTL1-10 指令域口径——Q5 定案沿袭） | EV-001 actuator_limit：u_eff 钳位 25→20（**零物理不连续**——指令域钳位，物理面 C⁰ 连续） | 钳位稳态 18.265509 kW（§3.3——渐近稳态两轨同） |
| actuator_clear | 同上 | fault | closed_loop | actuator_fault | True | 50.0（%） | 同上 + **t_clear_s=35.0** | EV-002 actuator_clear trigger=35.0：u_eff 解除钳位（20→u）；pre=349/post=350；快照变量增 P_gen_true_kW（oracle :494-514 逐字） | 清除过冲/回差锚点面（§3.3——过冲=暂态极值采样、回差=过阈值时刻口径沿袭） |

**Run 集（Q5）**：FMU golden Run 集 = 镜像基线全集——thermo 镜像轨 6 Run（inertia_model=
"thermo"，gt001_l1_oracle.py:191-210 逐字）+ comb 镜像轨 6 Run（inertia_model="thermo_comb"，
gt001_comb_oracle.py:228-247 逐字）= **12 Run 全集**（Q2(a) 承载；Q2(b) 下缩为 6 Run）。
新 id golden 镜像基线全集先例（GTL1 §4 项 4「镜像 gt001_v2 全集」/ GTCMB §4 项 5「镜像
gt001_v3 全集」/ FC Q8）。**白名单面零变化声明**：approved 白名单（scope.js:16-17——无 GT
分支）零改动；FMU 轨经 backend 路径（V312 §6 scope-guard：backend Run 强制 extension_preview
——fc001 §2.3 先例同构登记）。

### 2.2 白名单与哈希面（勘误②③④⑤ 承接——§0.1）

- **白名单面零变化**：approved 白名单结构零改动（GT 无族级分支——GTCMB B-4 实读沿袭）；
  FMU 轨 Run 走 backend 路径强制 extension_preview（fc001 §2.3 同款登记）。
- **哈希形态**：FMU 轨 Run 走既有 runHashInput 清单零新增输入键（fc001 §2.3 先例——
  registry.js runHashInput 面沿袭）；fmu_sha256 入 EvidenceBundle v1.1 为 **additive 字段
  不入 run_hash**（V312 C-2 先例同构）⇒ **五哈希（scenarioHash/run_hash/config_hash/
  model_hash/content_checksum）既有合法输入零变化**（勘误②——证明随实现交付）。
  run_hash 确定性 = Run 内容规范 JSON SHA-256 零墙钟（fmu_runner.py:302-309 先例机制）。
- **V312 FROZEN 钉 hash（勘误③）**：GT FMU 包 sha256 钉入 V312 清单须 CHG（Q2(a) 两包
  两钉值——批准轮 CHG 打包项）。**run-g2 步数账（勘误④/I-7）**：现值 36 步（run-g2.mjs:4
  实读——第 36 步 = fc001 parity，extended tier + skipFmu SKIP 语义 :138）；GT parity 步
  新增/通用化 = Q10 显式裁定（I-9 张力见 Q10——推荐独立成文）。
- **盲包面**：GT 在盲测池（ARENA_EXCLUDED=[]——arena.js:10 实读沿袭）；GT-001 FMU 轨不入
  Arena 盲测池（L2 盲包 FMU 轨入池 = V07 A-8 v1.13.0 裁定面——钉轨裁定随 G10 面登记不预设）；
  27 列同集（§4 项 8）⇒ 盲包观测面/投影零新增。

### 2.3 事件编码与快照面（零扩展——oracle 事件面逐字沿袭）

事件编码 v1（event_encoding_version=1）与 gt001_v3/v4 六场景对齐：EV-001（sensor_bias/
load_step/actuator_limit，trigger 20.0，pre=左极限 i=199 / post=采样行 i=200，快照变量
f_true_Hz/f_meas_Hz/n_meas_rpm/f_channel_diff_Hz 四键 + units 面）+ actuator_clear 局
EV-002（trigger 35.0，变量增 P_gen_true_kW；pre=349/post=350）——gt001_l1_oracle.py:450-515 /
gt001_comb_oracle.py:571-636 逐字转写，**编码/变量面零扩展**（GTCMB §2 事件快照行沿袭）。
快照语义 = 采样行值（GCMB-4「快照变量 = 采样行」口径——oracle :916-922 实读）；事件分列
执行属 host（I-11 壳——§1.1）。P_gen_cap_kW 事件域信号不入序列比对面（series_note——
oracle :69-71/:103 惯例沿袭）。

### 2.4 跨载体比对面与因果面登记（fc001 §2.4/§2.5 结构位的 GT 语境承载）

- **因果面零新增（结构性差异登记）**：FC001_FMU §2.4 的六节因果规则（FC_RULE_01..06）为
  G9 原文内容的转写面——GT 侧**无对应上游内容**（GTL1/GTCMB 均未定义 FMU 轨新因果链；
  GT 既有 causalTemplates 面——systems.js:2226 GT001.causalTemplates，GTCMB §1.4 登记口径
  ——已覆盖三故障族解释面）。本轨因果登记 = **零新事件族 + 零新信号（27 列同集）+ 因果
  模板零新增**（FMU 轨 Run 的因果解释面沿既有 GT 模板——实现轮核对登记）。映射表已注记
  该结构差异（非遗漏）。
- **跨载体比对（GT 语境）**：fc001 §2.5 的跨保真谓词（L0 analytical_demo vs L1-FMU）在 GT
  的对应面 = **同系统同物理的实现载体比对**（引擎 thermo/comb 轨 vs FMU 镜像轨——同方程
  同常量同更新序（Q1(B) 下），差异面 = 实现载体）。登记：① 实现载体比对的教学表述走
  「模型深度导致的表达力差异」句式族之外的**实现轨口径**（不写「更准确/更真实/工业级」
  ——I-5 句式纪律同款适用）；② 比对注册（compare 注册面）= 实现轮工作面，谓词形态
  （provenance 对 + shared-key 面——fc001 §2.5 句式同构）留实现轮登记不预断；
  ③ healthy/monitor 局的镜像恒等（§3.2/§4 项 5）为结构性可比面（±1e-9 内逐点恒定——
  GTCMB A-2 措辞口径沿袭）；④ 既有 Run 的比对结论永不静默改判（面⑥ additive 确认句式沿袭）。

## 3. 锚点与包络

### 3.1 设计点标称稳态表（EQ-GTL1-11 闭合——GTL1 §3.1 逐字转写，值零改动；u=25、f=50、
demand=30 kW；五导数恒零；oracle GL-1 复核容差面如实登记）

| 变量 | 值（批准规格冻结显示位） | 自洽判据（GTL1 §3.1/oracle GL-1 :536-547 转写） |
|---|---|---|
| f | 50.0 Hz | 设计条件（摇摆平衡——P_rotor=0） |
| T3 | 1173.000 K | 设计条件（T3D——EQ-GTL1-11） |
| u / u_eff | 25.0 / 25.0 kW_eq | 设计点指令（钳位不激活） |
| π_c / p2 | 8.000 / 810.6000 kPa | π_c = π_c0 精确（GL-1 判据 p2 ±1e-9） |
| T2 | 573.2946 K | GL-1 判据 ±1e-3 K |
| T4 | 770.1970 K | π_t = 7.68 精确（GL-1 判据 ±1e-3 K） |
| P_comp / P_turb | 41.351847 / 67.667636 kW | 效率链代数值 |
| **P_gen** | **25.0000000000 kW** | 设计条件(i)（15 位常量下双精度路径噪声 −7.1e-15 级——GTL1 §2.1 精度登记注；GL-1 判据 ±1e-9） |
| P_bat / P_rotor | 5.0 / 0（−0.0）kW | 下垂设计点 / 摇摆平衡（GL-1 判据 P_rotor ±1e-9） |
| 燃烧室平衡残差 | η_b·Q_f − ṁ_g·cp_g·(T3−T2) = **4.3e-14 kW** | ≤1e-9 kW（15 位常量承载——A-1 方案 a；9 位预填历史值 1.42e-14 为 GTL1 §3.1 保留记录，如实分列） |
| Q_f | k_f·25 = **101.7633 kW**（显示位） | EQ-GTL1-3（精确值由 15 位常量承载） |
| η_cycle | **24.5668 %** | P_gen/Q_f（EQ-GTL1-12 瞬时口径；积分比口径 eta_cycle_end_pct 分列——oracle :74-76 两口径分列惯例沿袭） |
| SOC0 / V_bus / CAP | 60.0 % / 400.0 V / 40.0 kWh | L0b 冻结记账面（oracle :156-158） |

（FMU golden 自有锚点 = 本轨 oracle emit 复算冻结——本表为 GTL1 冻结显示位转写 + 结构预填
对照，§3.3 数值纪律同款。）

### 3.2 comb 变体初值与稳态不变性（GTCMB §1.3/§3.2 逐字转写，值零改动）

- **初值（GTCMB Q11 定案 = (a)）**：x_comb(0) = k_f·u(0)（= k_f·25 = **101.7633 kW**，设计点
  稳态燃料功率，GTL1 §3.1 冻结值 Q_f ≡ 101.7633 kW 同源）⇒ 健康局/monitor 局全序列
  dx_comb/dt ≡ 0、x_comb ≡ Q_f ⇒ (f, T3) 轨与 gt001_v3 healthy/monitor **同实现逐位恒等
  （同运算序复刻）、跨实现 ±1e-9 内逐点恒定**（GTCMB A-2 措辞口径逐字沿袭）。
- **稳态不变性**：延迟环节在稳态（d/dt = 0）下 Q_f,d ≡ Q_f 精确成立 ⇒ 延迟不改变稳态值、
  只改变暂态路径——设计点（§3.1）+ sensor 稳态（u_ss=19.652812、T3=1043.951863、
  T4=687.0887）+ u=40 钳位角点（f=49.999214979、T3=1524.8766）+ actuator 钳位角点
  （f=49.719396217、P_gen=18.265509）四点稳态解两轨逐式相同（GTCMB §3.3（五）GCMB-3
  登记值转写——FMU 镜像轨 emit 复算冻结为准）。

### 3.3 动态轨迹结构预填与包络（**数值一律批准轮 emit 冻结**——零编造纪律；上行值 = 上游
登记值结构对照，FMU golden 锚点由本轨 oracle 复算冻结）

| Run | 轨迹结构（上游登记值结构转写） | 数值面 |
|---|---|---|
| healthy / monitor_only | 全轨恒 = §3.1 标称点（解析恒等——非数值仿真产物）；comb 镜像轨 x_comb ≡ Q_f 恒等机制（§3.2） | 解析精确值（§3.1/§3.2 表） |
| closed_loop_fault | f 渐近 50−b=49.7（调速器积分钉死稳态跨深度同）；t=60 采样：thermo 冻结 49.700495 / comb 域扫描 49.700048（GTL1 §3.2/GTCMB §3.3（三）登记值）；T3/T4 下探（EGT 教学面） | 批准轮 emit 冻结 |
| load_step | nadir=暂态极值（thermo 49.590174 / comb 49.586263）；f(60) 积分钉死回 50（thermo 49.999347 / comb 49.999964）；u_ss=32.506875/T3_ss=1349.8335 渐近 | 批准轮 emit 冻结 |
| actuator_fault | 钳位稳态 P_gen=18.265509（渐近两轨同）；t=60 采样 ≈ 稳态（GTCMB §3.3（三）如实登记差 <1e-8 级）；u_wound=40/Q_f=k_f·20 指令面精确同 | 批准轮 emit 冻结 |
| actuator_clear | 过冲（thermo +0.3221 / comb +0.3311）、回差（36.0/36.6 s）、T3peak（1309.61/1313.43 K）——过冲=暂态极值采样、回差=过阈值时刻口径（GL-5/GCMB-5 同款） | 批准轮 emit 冻结 |

包络登记（沿袭——FMU 镜像轨同域）：\|Δf\| ≤ 1 Hz 有效性域（thermo 域扫描 max 0.997996 /
comb 0.999640——GTL1 §3.3.1/GTCMB §3.3 冻结值转写；承袭性假设声明口径沿袭）；T3 域
thermo [735.2, 1524.9] K、comb [735.3, 1524.9] K；T4 域 thermo [486.6, 1001.2] K、comb
[486.68, 1001.25] K（gt001_comb_oracle.py:1246-1249 冻结界实读转写）；P_gen 抽查域
[−8.5, 45.0] kW（GL-8/GCMB-8 抽查键）；u ∈ [0, 40] 钳位域（EQ-GTL1-9/10）；保护系统未建模
（超温/超速——GTL1 §6.1 项 8 沿袭，T3 峰值/过冲为合法演示值）。u=0 角点负净功伪影声明沿袭
（GTL1 §3.3——注册域内不可达）。

## 4. golden 计划（gt001_fmu_v1 · 独立 oracle · 本批准轮零改动——emit = GTFMU-G2b-03）

| # | 项 | 内容 |
|---|---|---|
| 1 | 新 id 判据 | golden_id = **gt001_fmu_v1**（Q4——命名空间 gt001_fmu_ 与既有 gt001_v1…v4 不撞；ORACLE_INTERFACE_D2 §3.1 判据同构：新轨新实现载体 → 新 id，非引擎行为零变更原地扩容 ⇒ 保 id 重出不适用）；**supersedes = null**（并列实现载体轨——非 gt001_v3/v4 之取代；轨关系由 provenance/model_id/inertia_model 承载——fc001_fmu_v1 supersedes=null 实读先例 :9）；Q2(a) 另含 golden_id = gt001_fmu_comb_v1（同判据） |
| 2 | 独立 oracle | `tools/oracle/gt001_fmu_oracle.py`（提案命名——Q4 确认项；MODELS 键镜像 gt001_fmu）。独立性声明沿 gt001_l1_oracle.py:1-16 / fc001_fmu_oracle.py:1-29 体例：不 import src/**、不 import gt001_oracle / gt001_l1_oracle / gt001_comb_oracle / fc001_fmu_oracle（仅 oracle_base 机制层——无模型语义，D-2a 契约）；方程与常量唯一权威文本 = GTL1 §2 批准文本 + GTCMB §1.3（comb 变体）+ §1.5 Q1 裁定的层归属映射；Python stdlib（python -I）自含硬编码；**出生即 oracle_base 接入**（六成员 + resolve_run_spec + write_golden_with_sidecar LF 钉死 + approval 三字段非 null 方可落盘 + SERIES_IDS 模块常量含 "t" 列）；golden 由 oracle 只读生成——**C99 FMU 不参与 emit**（golden 独立性 G0-DEC-16 同构；C-Python parity 为验收面非生成依赖）；**oracle 镜像面 = FMU+host 全系统更新序**（host 控制粒度/事件分裂/记账全镜像——fc001_fmu_oracle 先例模式） |
| 3 | 数值方法 | 经典 RK4——内核子步 δt=0.01 s；Q1(B) 下 host 以 h=0.01 子步粒度驱动 doStep（n=1）+ 子步间 EQ-GTL1-9/10 推进 + 子步记账复刻；oracle 与 C99 内核+host 同算法同步长同运算序（parity 前提——位级一致不承诺，见项 7）；输入冻结语义 = 子步起点右值（GT oracle 同构——Q1 粒度面登记） |
| 4 | 行数契约面 | **601 点原生成立**（§0.1 承接①——GT 无 602 行问题）；事件快照相位承载 pre=199/post=200 + EV-002 349/350（oracle 既有结构——零裁定余量）；golden JSON 物理行数为 emit 后非契约面 |
| 5 | 自检预案 | 新段 **GTFMU-1…n（Q11——候选 (a) GTFMU-x（V07 A-6 行原文点名「GTFMU-x 自检」）/(b) GFMU-1…n/(c) FMU-1…n 复用）**：GTFMU-1 环境校验（§3.1 设计点解析恒等复算——EQ-GTL1-11 闭合 + 15 位常量承载，GL-1 判据同构）；GTFMU-2 恒等式（r_true ≡ 0 定义恒等逐点 / EQ-GTL1-12 能量恒等（左矩形 vs RK4 增量——GL-2 判据 ≤0.2 kJ 同构）/ comb：延迟环节积分恒等式 τ_comb·Δx = ∫(Q_f−x)dt（GCMB-2 同构））；GTFMU-3 网格与事件相位（601 点、t[i]=i·dt、EV-001/002 pre/post 语义 + 快照变量 = 采样行）；GTFMU-4 锚点全表复算（§3.1/§3.3 emit 冻结值）；GTFMU-5 镜像恒等（**全 6 Run 全序列**与 gt001_v3.json 只读交叉 ±1e-9 内逐点恒定（thermo 镜像组）/ comb 组与 gt001_v4.json 只读交叉同构——GCMB-1 全 Run 97495 值 worst|diff|=0.0 先例同构（只读文件交叉不触碰 V-03）——**A-2 扩面：healthy/monitor 收窄版失去故障局更新序保真的唯一非循环守卫，故扩全 Run**）；GTFMU-6 半步自收敛登记（δt=0.01 vs 0.005——实测散差 ×≥10 冻结制，GL-7/GCMB-7 先例）；GTFMU-7 无 NaN/Inf + 值域/包络抽查（\|Δf\|≤1 Hz、T3/T4 包络 §3.3、u∈[0,40]——GL-8/GCMB-8 先例同构） |
| 6 | 元数据（schema v2） | golden_schema_version="v2"；golden_id="gt001_fmu_v1"；model_id = gt.sync.fmu_l1（Q3）；model_version="1.0.0"（新轨首版——fc001_fmu_v1 实读先例）；method_id 提案 "gt001_fmu_l1_rk4_dt0.01"（comb：gt001_fmu_comb_rk4_dt0.01）；engine_baseline=null；backend=null（§3.4 留位——fc001_fmu_v1 backend=null 实读同构）；**model_provenance="fmu_l1_lumped_unvalidated"（Q8 推荐——顶层 + run 级双落位，fc001_fmu_v1 :12/:91 实读先例）**；inertia_model="thermo"（镜像轨——gt001_v3 三落位惯例；comb 组="thermo_comb"）；supersedes=null；units = gt001_v3 同面（I/P/E/t/SOC/f/n/T/p 十键）；approval 三字段首签引批准 CHG（首签时点 = GTFMU-G2b-03 emit）；SERIES_IDS 终值以 emit 实测核对（27 列同集——不预断列序差异） |
| 7 | 容差 tier（Q6 联动） | **T-B 沿用**（同法 RK4、跨语言双实现 C99/Python——GTL1/GTCMB/FLTH/FLCAP/FCECH/FCFMU 六轮同制；跨语言位级承诺禁令维持）。**R-G9-02「rtol ≤1e-9」张力登记**（fc001 §4 项 7 同款）：1e-9 为数值容差承诺（非位级——与禁令不冲突），emit 轮以双实现实测散差 × 安全系数 ≥10 冻结实际 gate 值；实测超限 ⇒ 停下显式 CHG 重议口径（双向登记）；parity 归属：verify_golden Python-Python 部分走既有 T-B 链 + **C-Python parity 为独立机检**（Q6/Q10——编译产物缺位环境 SKIP 语义显式裁定，fc001_fmu_parity.py:14-15/:64-72 exit 3 SKIP 先例） |
| 8 | gate 键面（**零新增 gate 分支预期**——显式硬项预登记反证） | gt001_fmu 序列 27 列与 gt001_v3 同集（Q10/GTCMB 零新信号沿袭）⇒ T-B 分派链（verify_golden.py:336-405 实读）逐键路由**全既有支零缺口**：t→t_s（:334）；f_true/f_meas/f_channel_diff_Hz→_Hz 支（:347）→f_Hz_atol；n_meas_rpm→_rpm 支（:349）；T3/T2/T4_out_K→_K 支（:351）；p2_out_kPa→_kPa 支（:353）；r_true_kW→r_true 子串支（:366）；P_gen/P_bat/P_load/P_rotor/Q_fuel/P_comp/P_turb/P_gen_cmd 等 _kW 列→_kW 支（:370）；SOC_true/SOC_est_pct→SOC 支（:372）；valve_cmd/valve_meas/eta_cycle_pct→_pct 支（:374）；**V_bus_V→f_Hz_atol 兜底（:405）**——_V 条件支（:382，仅当 gate 声明 V_stack_atol/V_stack_rtol）对 gt001 面不激活 ⇒ 既有 gt001_v3 同款既有行为沿袭（恒值 400、散差 0、量纲错配兜底为既有已登记形态——如实沿袭非新增，零修复义务随本轨登记）；_mL/_kWh/dim 条件支均不激活（gate 无该键）⇒ **零新增 gate 分支预期**（fc001 B-1 三分支教训在 GT 列面无触发物——如 emit 实读发现列面差异 ⇒ 新增分支 = 显式硬项不静默）。gate 块键面 = gt001_v3 gate 十键镜像（f_Hz_atol/n_rpm_atol/T_K_atol/p_kPa_atol/P_kW_rtol/P_kW_atol/E_kWh/SOC_pp/r_true_kW/t_s——oracle TOLERANCES :748-762 实读；量级预案非终值，项 7 实测冻结制） |
| 9 | verify_golden 注册 | 新增 `import gt001_fmu_oracle` + **MODELS["gt001_fmu"] 注册行**（golden_file="gt001_fmu_v1.json"；i_true="f_true_Hz"/i_meas="n_meas_rpm"/event_tol="n_rpm_atol"——gt001 现行映射 :230-231 镜像；scalars 九键镜像 :232-237）+ Q2(a) 另含 MODELS["gt001_fmu_comb"]（同构）；**DEFAULT_MODELS 追加（Q9）**（:311 现值六成员 ["fl001","fl001_l1","fc001_l1","fl001_cap","gt001_comb","fc001_fmu"] 实读——尾追加 gt001_fmu（+gt001_fmu_comb），步① 无参调用 7/8 golden；步① label 滞后说明沿 V120 DEC-5 先例维持登记）；MODELS["gt001"]/["gt001_comb"] 继续验 gt001_v3/v4 零改动（FLTH §4 项 7 同构——条目重指向不适用） |
| 10 | 两门禁面（FLTH B-2 / fc001 §4 项 10 同构） | ① golden↔oracle verify（V-01…V-09 全链——601 点逐点 + V-09 事件 pre/post 快照比对）+ C-Python parity（R-G9-02——**数值与实现自洽声明 only**，§1.8 措辞边界）；② FMU 轨验收路由：gt001_fmu_v1 emit verify 通过前 FMU 轨不进任何验收路径/比对 enable（I-4 批准纪律——不静默）；预烘焙兜底 bundle 与 golden 字节同源（adapter file:// 模式只读——fc001-fmu-adapter.js :6/:128 先例同构） |
| 11 | 验收命令承接（fc001 R-G9-02/03/04 句式同构） | `python -I tools/oracle/gt001_fmu_oracle.py --self-check`（GTFMU-1…n）；`python scripts/verify_golden.py gt001_fmu`（6 Run 全过）+ Q2(a) 另含 `python scripts/verify_golden.py gt001_fmu_comb`（6 Run 全过）——**轨合计 12 Run**（A-1 口径统一——两 golden 各镜像基线全集 6 Run，金级 inertia_model 均一惯例沿 gt001_v3/v4 实读）；容差 ≤1e-9 张力登记见项 7）；parity：`python -I tools/oracle/gt001_fmu_parity.py`（Q6 提案命名——fc001_fmu_parity.py 同构：64 位解释器定位/SUBPROCEED 面逐点散差/规模相对误差 ≤1e-9 判据/SKIP 语义 exit 3）；R-G9-03 句式：三次执行 run_hash/EvidenceBundle 校验和恒等（零墙钟——fmu_runner.py:302-309 机制 + FC_FMU_SHA256_PINNED :136 钉值校验先例）；copy-guard exit 0（词表现值 43 模式——零增词预期，§6.3） |
| 12 | 预期失效面 | 新增 data/golden/gt001_fmu_v1.json(+.sha256)（Q2(a) 另含 gt001_fmu_comb_v1）+ data/fmu/gt001_l1_v1.fmu（Q2(a) 另含 gt001_comb_l1_v1.fmu——包命名 Q3 联动）；既有 13 golden 字节零变更（Q2(a) 落地后 13→15——B-1 目标态注记）；EvidenceBundle v1.1 fmu_sha256 additive；V312 钉 hash CHG（Q2(a) 两钉值）+ **V312 §7 例外行/A-4 docstring 扩域行（B-2）**；run-g2 步账 CHG（Q10）；FAULT_CATALOG 注记行（GT FMU 轨——fc001 §4 项 12 先例同构）；GT causalTemplates 零新增（§2.4——零新事件族零新信号）；verify_golden MODELS 两注册行 + DEFAULT_MODELS 追加（Q9） |

## 5. G2b 排期与串行节奏

1. **四步**：GTFMU-G2b-01 本草案（V1120 波 S1，2026-11-18——本文件 v0.1）→ **GTFMU-G2b-02
   双路独立评审（W2a 物理/数值 + W2b 治理/契约面，互不可见；结论 W4 代录 §10）+ 用户书面
   批准（v1.12.0 批准轮——Q1…Q12 定案 + 平台矩阵裁定（Q7）+ 容差/步账冻结；批准记录 =
   用户指令链 CHG，GTL1-G2b-02/GTCMB-G2b-02/FCFMU-G2b-02 先例体例）+ 条件落正文 + 更名
   APPROVED v1.0** → GTFMU-G2b-03（oracle + gt001_fmu_v1 emit（Q2(a) 另含 comb golden）+
   verify_golden 注册 + DEFAULT_MODELS 追加）→ GTFMU-G2b-04（C99 内核编译实现 + run_gt001_shell
   扩展 + parity + adapter + bridge 接线 + V312 钉 hash CHG + 步账 CHG——§8）随用户逐版本
   指令派发（I-4 纪律）。
2. **与 fc001 实现面关系**：桥/adapter 机制复用（bridge.py 既有安全边界零改动 + 
   gt001-fmu-adapter.js 新文件——fc001-fmu-adapter.js 先例同构）；fmu_runner._define_fmi2
   加载面共用、run_gt001_shell 独立成文（Q1(B) 子步驱动形态与 run_fc001_shell Δt=0.1 形态
   分属两函数——不互改，I-9 伴生工具独立成文纪律同构适用）。
3. **实现时点**：v1.12.0（V07 §7 波行「A-6 GT-001 L1-FMU 批准轮 + 实现轮」——批准与实现
   同轮派发由用户逐版本指令裁定；本草案不排实现工期——G0-DEC-15 句式）。

## 6. 红线自查

### 6.1 I-1…I-9 逐条（V07_ROADMAP §0 沿袭 I-1…I-7 + 增补 I-8/I-9——:14-23 实读）

| # | 不变式 | 自查结论 |
|---|---|---|
| I-1 | 零安装零网络零构建（前端） | C99 FMU 内核 = backend 工件非产品依赖（浏览器前端零依赖维持：file:// 模式走静态预烘焙 golden 兜底——fc001-fmu-adapter.js 先例）；fmu_runner/bridge/oracle 仅标准库（实读）；编译工具链 = 开发环境工具（Q7 裁定其构成，非运行时依赖登记） |
| I-2 | 数据诚实性 | 三层认知分离（§1.1）；epistemic declaration 转写（§1.8）；常量/稳态/Run 全部批准规格冻结值零改动（§1.4/§3.1/§2.1——15 位常量逐字）；动态轨迹数值零预填（§3.3——批准轮 emit 冻结）；「不把代数量冒称 ODE 状态」诚实区分沿袭（x_comb 为唯一新增微分态——§1.3 comb 行） |
| I-3 | 证据链可复核 | 独立 oracle 新文件（不 import src/** / 既有 oracle）+ golden 只读生成 + GTFMU-1…7 自检预案（§4 项 5）+ 镜像恒等只读交叉（GCMB-1 先例同构）+ C-Python parity 独立机检（Q6）+ 实测冻结制 ×≥10（§4 项 7） |
| I-4 | 门禁纪律 | 本草案 DRAFT v0.1 不定实现；V1120 治理波零代码；批准轮收口（用户书面批准，v1.12.0）后方可实现；验收路径禁入直至 gt001_fmu_v1 emit verify 通过（§4 项 10 两门禁）；V312 B-4「FMU 各自另批」由本规格承载（Q2(a) 双包各自钉 hash） |
| I-5 | 合成演示定位 | 「数值与实现自洽」固定句式（禁「验证通过」类肯定式）；「行为与数值集总演示模型」定位句；「教学尺度降阶循环」沿袭（GTL1 §6.1）；η_cycle 教学口径句式（「模型内部能量折算比，不对应任何设备热耗率」——GTL1 §6.3 沿袭）；实现轨差异表述不写「更准确/更真实/工业级」（§2.4） |
| I-6 | 场景=Run 序列配置化 | 零新 scenario 键（§1.7——inertia_model 既有枚举承载）；Run 矩阵 = oracle RUNS 白名单逐字（§2.1）；故障族面零扩展 |
| I-7 | 门禁步数账 | run-g2 现值 36 步实读；GT parity 步归 Q10 显式裁定（独立成文 +1 步 vs 通用化改步——推荐独立）；本草案 0 步承诺不预设、不静默扩账（勘误④） |
| **I-8** | **FMU 轨「各自另批 + 模式复刻」（V07 新增）** | 本规格 = 各自另批批准载体（V07 A-6 行门禁链「G2b（草案+双评审→用户批准）→ R-GTFMU → G7 → G8」逐字承接）；实现复刻 fc001 三层夹心模式全链（oracle→golden→C99→parity→adapter→bridge——§8 工作面逐件点名）；**parity 0.0 纪律为模板约束**（fc001 R-G9-02 实测 0.0 先例——本轨以同判据制度承袭，实测值 emit 轮登记） |
| **I-9** | **已锚定 golden 的 oracle 文件 V-03 自冻结（V07 新增）** | gt001_l1_oracle.py / gt001_comb_oracle.py / fc001_fmu_oracle.py 物理零触碰（本轨不读改不重出——§0 不做 2）；本轨伴生工具（gt001_fmu_oracle.py / gt001_fmu_parity.py / run_gt001_shell）一律独立成文（CHG-20261118-02 教训制度化原文承接）；run_gt001_shell 于 fmu_runner.py 内新增函数体不改 run_fc001_shell 既有字节语义（Update 面为 additive——实现轮评审核对项） |

### 6.3 copy-guard 预查（实读 tools/copy-guard.mjs 现值——SCOPES=['src'] :15 / BANNED 43 模式
:30-59 / teaching.test.js:264 镜像断言 43；实现期 `node tools/copy-guard.mjs` 终检；体例沿 FC §6.3/GTCMB §6.3）

| 提案串/词面 | 核查结论 |
|---|---|
| 「FMU 结果」（BANNED :37 现值） | FMU UI/文档文案须规避该词面（改用「FMU 轨 / L1-FMU 模型输出」句式）——实现轮文案预检硬项（本草案标题/正文已规避） |
| (?i)sealed（散文）+ D-11 标识符剥离 | 真值面以标识符语境（exposure=sealed 标识）承载，不写散文「sealed 真值」（改「真值层（exposure=sealed 标识）」句式）——实现轮预检硬项 |
| 「数值与实现自洽，不是物理守恒验证或硬件认证」 | 禁词族以否定式承载——0 命中预期（emit 后 ALLOW 若需扩充走 deviations.md 记录） |
| 「行为与数值集总参数演示模型」「未经实验/硬件验证」 | 否定式句式（「经过验证」不含「已验证」子串——FLEXT F5 先例句式）；0 命中预期 |
| GT 热力链文案（「热力学最小集」「调速器积分」「燃烧延迟」「模型深度导致的表达力差异」「非机组/电网动态验证」——末串为 ALLOW 首条） | 「延迟/燃烧/滞后」均不在 43 禁词族（GTCMB §6.3 预查同款结论沿袭）；「非机组/电网动态验证」先剔后匹；0 命中预期 |
| 微重力域四词（已入表现值） | GT 链词面 0 命中需求（§0.1⑥——本草案全程规避，零增词） |

（本草案在 FaultLab-evaluation/** 不扫描（SCOPES=['src']——:15 实读）；实现轮文案迁入
src/** 前逐句预检 + copy-guard 终检双保险。）

## 7. G2b 进入条件五项自查表（SCOPE_SPLIT_MEMO §8.2）

| # | 进入条件 | 状态 |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：本轨触发项 = V07_ROADMAP A-6 行 + V1120_WAVE_DESIGN S1（CHG-20261118-08——本草案即交付物）；GT 侧无未关闭缺陷清单项（GTL1/GTCMB G2b 全闭合——GTCMB §7 ① 实读口径沿袭） |
| ② | 独立 golden | **计划就绪（未产出）**：§4 gt001_fmu_v1（Q2(a) 另含 gt001_fmu_comb_v1）/ gt001_fmu_oracle.py / 12 Run 白名单 / schema v2 / tier T-B（Q6 不定案面沿袭）。golden 后置系 V1120 治理波「零代码零版本」授权的字面偏离**显式登记**（GTL1 §7.1 ② / FC §7 ② 先例同款句式）；emit = GTFMU-G2b-03（v1.12.0），落地并 verify 通过后本项闭合 |
| ③ | UI 措辞与未建模物理清单 | **就绪（草案级）**：§1.8 epistemic declaration 冻结表 + 未建模物理沿袭（GTL1 §6.1 十项 + GTCMB §1.5 追加 3 项——FMU 轨零新物理，声明面沿袭）+ §6.3 预查表（assumptions/limitations 冻结文本沿 GTL1/GTCMB 批准文本——本轨不新增不改写） |
| ④ | 用户书面批准 | **未闭合（本波边界内）**：批准 = v1.12.0 批准轮 GTFMU-G2b-02（用户指令链 CHG——三先例体例）；本状态行即 DRAFT 依据 |
| ⑤ | CHG 登记 | 起草授权 CHG-20261118-08（V1120 S1）已登记（DECISIONS.md:1856-1858 台账实读）；批准 CHG 待 v1.12.0 批准轮（随批打包：V312 钉 hash CHG/步账 CHG——Q10；**Q8 复用档位 ⇒ V312 §7 例外行 + A-4 docstring 扩域行同轮打包（B-2——「零新增例外面」不成立）**） |

## 8. 工作面分解（GTFMU-G2b-01…04）

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| GTFMU-G2b-01 | 本草案：三层夹心 GT 语境转写 / EQ-GTFMU 冻结表草案（EQ-GTL1 逐字 + FMU 化标注 + comb 修订式）/ 常量字典 / 两核心裁定点（Q1 控制积分器归属、Q2 变体面）/ 键面收窄登记 / 12 Run 矩阵 / 事件编码与跨载体比对面 / 锚点与包络 / golden 计划 / Q1…Q12 全候选 | M | **已完成**（V1120 波 S1，2026-11-18） |
| GTFMU-G2b-02 | 双路独立评审（W2a 物理/数值——EQ 转写保真/Q1 更新序等价性/稳态复算/parity 制度/Run 结构；W2b 治理/契约面——I-8/I-9 核对/准入面/golden 治理/哈希面/步数账/copy-guard）+ 用户书面批准（Q 点定案 + 平台矩阵裁定（Q7）+ 容差/步账冻结）+ 条件落正文 + 更名 APPROVED v1.0 | M | v1.12.0 批准轮 |
| GTFMU-G2b-03 | oracle 编写（gt001_fmu_oracle.py——oracle_base 出生接入 + FMU+host 全系统镜像更新序（Q1 裁定口径）+ GTFMU-1…7 自检 + T-B 容差实测冻结/降 T-C 预案）+ gt001_fmu_v1 emit（6 Run、schema v2、approval 首签引批准 CHG、sidecar LF 钉死；Q2(a) 另含 gt001_fmu_comb_v1 emit（6 Run）——**轨合计 12 Run（A-1 口径统一）**）+ verify_golden MODELS 注册行 + DEFAULT_MODELS 追加（Q9）+ FAULT_CATALOG 注记行 | M | v1.12.0 实现轮 |
| GTFMU-G2b-04 | 实现：C99 内核 gt001_l1.c + modelDescription.xml（FMI 2.0 CS、VR 契约——fc001_l1.c 结构孪生；Q2(a) 另含 gt001_comb_l1.c）+ 编译环境落地（Q7——构建命令钉死句式沿 fc001_l1.c:19-21：gcc -std=c99 -O2 -Wall -Wextra -ffp-contract=off -fno-fast-math）+ data/fmu/gt001_l1_v1.fmu 打包（Q2(a) 另含 comb 包）+ fmu_runner.py 扩展 run_gt001_shell（SHA-256 对 V312 钉值校验 + admission 前置 + **Q1(B) 子步粒度 doStep 驱动**（h=0.01、n=1）+ 调速器/测量列/记账 host 侧复刻 + EV-001/002 事件分裂 + run_hash 确定性 + add-only 不改 run_fc001_shell 语义）+ gt001_fmu_parity.py（Q6——fc001_fmu_parity.py 同构：py64 定位/逐点散差/≤1e-9 判据/SKIP exit 3）+ run-g2 parity 步（Q10——I-9 独立成文）+ src/core/plants/gt001-fmu-adapter.js（轨锚定校验 + bridge 接线 + 预烘焙兜底）+ bridge.py GT simulate 路由 + EvidenceBundle fmu_sha256 additive 五哈希零变化证明 + V312 钉 hash CHG（Q2(a) 两钉值）+ 步账 CHG（Q10）+ copy-guard 终检（§6.3） | L | v1.12.0 实现轮 |

## 9. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | C99/Python 双实现散差超 1e-9（libm 幂运算差异——π_c^a_c / π_t^(−a_t) 为跨 libm 散差主源，GT 链幂运算密度高于 fc001） | 同算法同子步同运算序转写 + emit 实测散差 ×≥10 冻结 gate 值 + 超限停下显式 CHG（Q6 双向预案）+ 禁 ULP 级承诺；fc001 实测 0.0 先例为制度基线非承诺 |
| R-2 | Q1 裁定翻转（u 进内核）⇒ I-3 架构违反 + 层归属漂移 | Q1 推荐 (B) 三层佐证（fc001_l1.c:7-8 硬边界原文 / GTL1 §2.3 分区冻结文本 / b 跨层渗透面）；如批准轮采 (A) ⇒ 架构偏差显式登记 + VR 契约/manifest 方程面重排 + 评审硬项重议——不静默 |
| R-3 | 子步粒度 doStep 驱动（6000 调用/Run × 12 Run）运行时预算超支 | ctypes 调用开销实现轮实测登记（fc001 600 调用先例 ×10 量级预判）；parity 步 extended tier（非阻塞主门禁面——run-g2 分层语义沿袭）；超预算停下显式裁定不静默 |
| R-4 | 既有 golden/oracle 字节误触（V-03 哈希失配 → 冻结锚点报废） | §0 不做 2 + I-9 自冻结 + GTFMU-G2b-03/04 工作面不含既有文件 + 全量回归兜底（13 golden verify 全绿） |
| R-5 | Q2(a) 双包钉 hash/V312 CHG 打包遗漏 | 批准轮 CHG 打包清单点名两钉值（§4 项 12）+ run_gt001_shell 钉值校验硬失败路径（RuntimeError——fc001 :198-200 先例） |
| R-6 | gate 路由意外（emit 实读发现列面差异） | §4 项 8 零缺口预期 + 27 列逐键路由预登记 + 实读核对硬项 + 新增分支 = 显式硬项不静默（fc001 B-1 教训制度化） |
| R-7 | 编译环境不可用/平台矩阵缺位阻塞实现 | Q7 批准轮先行裁定（fc001 Q10 先例——win64 gcc 已实测可行路径在案）+ 预烘焙兜底使浏览器面不依赖编译产物 |
| R-8 | 步数账超支（I-7） | Q10 显式裁定（独立步 +1 申报 vs 通用化改步的 I-9 张力权衡——推荐独立）+ parity 步 SKIP 语义显式化（V312 §9⑥ 先例）——不静默扩账 |
| R-9 | 镜像轨恒等判据被误读为「FMU 轨无独立价值」或反向被误读为「FMU 轨 = 更高保真」 | §2.4 实现轨口径句式 + §1.8 epistemic declaration（同为集总演示档——Q8 复用档位语义承载）+ 「模型深度导致的表达力差异」句式纪律（I-5） |

## 10. 评审记录与条件处置（GTFMU-G2b-02 收口回填——结构留空，体例沿 FC §10）

### 10.1 评审记录

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | EQ-GTFMU 转写保真与量纲、Q1 更新序等价性、稳态点复算、RK4 制度、parity 制度、12 Run 结构、包络值域 | **PASS_WITH_CONDITIONS(2)（2026-11-18 S5a 子代理——报告 evidence/g2b/GTFMU_G2B_REVIEW_A.md）** | P1=0——载荷断言独立复算逐项命中（EQ-GTFMU-1..12 转写零改动/设计点残差 4.26e-14≈登记值/三点稳态角点全中/Q1(B) 更新序逐步对应成立/parity 制度转写零失真）；2 P2（Run 计数口径跨节矛盾→A-1；GTFMU-5 镜像守卫收窄→A-2）；5 P3（record 面语义/Ki 单位/行号注记/角点硬条件/ctypes 开销量级——均登记） |
| 评审人 B（治理/契约面） | I-1…I-9 核对、准入面、golden 治理与 verify_golden 注册面、V312 准入、步数账、copy-guard | **PASS_WITH_CONDITIONS(3)（2026-11-18 S5b 子代理——报告 evidence/g2b/GTFMU_G2B_REVIEW_B.md；与评审 A 互不可见）** | P1=0——T-B 分派链 GT 27 列逐键路由 python -I 复刻零缺口/36 步/43 patterns 实跑/scope 零 GT 分支/零新键全过；3 P2（基线计数 14→13 失实→B-1；V312 例外行 FC-001 限定缺口→B-2；A-3 一般化表述超出机检实况→B-3）；3 P3（行号偏移/词面自涉/历史锚点——均登记） |
| 用户批准 | Q1…Q12 定案 + 平台矩阵 + 容差/步账冻结 | **批准（2026-11-19，CHG-20261119-01）** | 用户 2026-11-19 指令「批准」（V1120 收口汇报的 v1.12.0 排程入口响应——GTFMU-G2b-02 批准链）；Q1…Q12 全按推荐定案（§11 定案记录）；Q7 = 平台矩阵 (a) 本轮裁定 win64 先行；Q10 = (a) parity 独立步 36→37 |

### 10.2 条件处置追记（S6 评审轮落正文——2026-11-18，CHG-20261118-09；批准轮 GTFMU-G2b-02 复核）

| 条件 | 内容 | 处置 | 落点 |
|---|---|---|---|
| A-1 | Run 计数口径统一（12 Run = 两 golden 各 6——非单 golden 混装） | **采纳落正文** | §4 项 11 + §5 GTFMU-G2b-03 |
| A-2 | GTFMU-5 镜像恒等扩全 6 Run 双 golden 只读交叉 | **采纳落正文**（推荐案——故障局保真唯一非循环守卫） | §4 项 5 |
| B-1 | 基线计数 14→13 修正（四处）+ Q2(a) 目标态 13→15 | **采纳落正文** | 头部/§0/§4 项 12/§9 R-4 |
| B-2 | V312 §7 例外行 + A-4 docstring 扩域随批准轮 CHG 打包 | **采纳落正文**（「零新增例外面」不成立——如实登记） | §11 Q8 + §7⑤ + §4 项 12 |
| B-3 | A-3 表述校准 + GT 防失真依赖面 + 机检扩集可选项 | **采纳落正文** | §1.2 + §8（可选项登记） |
| A-P3-1..5 / B-P3-1..3 | record 面语义/Ki 单位/行号注记/角点硬条件/ctypes 开销量级/词面自涉/历史锚点等 8 项建议 | **登记采纳**（实现轮 GTFMU-G2b-03/04 工作面要件——逐条见两报告） | 对应节 |

（评审 A 条件 A-1…A-2 + 5 P3 / 评审 B 条件 B-1…B-3 + 3 P3——报告为原始载体，本表即条件处置登记；批准轮 GTFMU-G2b-02 复核后随批准 CHG 冻结。）

## 11. Q 点清单（**全候选 + 推荐——不定案**；定案于 GTFMU-G2b-02 批准轮，MG-DRAFT-Q 体例）

| # | 问题 | 候选 | 推荐（一句话，不定案） |
|---|---|---|---|
| Q1 | **控制积分器 u 的层归属（核心裁定点一——本草案最关键 Q 点）** | (A) u 进内核（EQ-GTL1-9/10 入 C99 内核；输入面扩 b/monitor/u_cap/窗标志；记账累计器入内核；通信步维持 Δt=0.1 + 内部 10 子步）；(B) u 归 host（内核纯物理真值；host 以 h=0.01 子步粒度驱动 doStep——n=1；子步间 EQ-GTL1-9/10 推进 + 记账复刻）；附：ZOH 降级变体（host 按 Δt=0.1 计值） | **(B)**——I-3 架构硬边界（fc001_l1.c:7-8 原文：内核内嵌壳职责 = 违反架构）+ GTL1 §2.3 分区冻结文本双佐证；u 属控制反馈层非物理装置；(B) 使 FMU+host 更新序与 gt001_v3/v4 oracle 逐步精确对应（镜像恒等判据/parity 全链沿用）；代价 = 通信步粒度 0.01（FMI CS 合法、显式登记）；ZOH 降级变体 = 离散语义实质变更（积分步幅 10 倍）排除 |
| Q2 | **模型变体面（核心裁定点二）** | (a) thermo 基准 + comb 深化双轨并列（两内核两包两 golden）；(b) thermo 单轨（comb 留后续轮） | **(a)**——V07 A-6 行域面原文「EQ-GTL1-1..12/EQ-GTL2 域」双轨点名；内核增量微小（单态 + 单 RHS 项）、夹心/host/parity 机制全复用；双包各自钉 hash 与 B-4 兼容（批准轮一次打包） |
| Q3 | model_id + model_version + FMU 包命名 | model_id：(a) gt.sync.fmu_l1（fc.pem.fmu_l1 句式同构）；(b) gt.turb.fmu_l1；model_version：'1.0.0'（新轨首版先例）；包命名 gt001_l1_v1.fmu / gt001_comb_l1_v1.fmu（Q2(a)） | **gt.sync.fmu_l1 + '1.0.0'**——A-3 自述禁令下不撞 GT-001；sync = 同步机机械接口面（摇摆方程锚点）；1.0.0 = fc001_fmu_v1 实读先例 |
| Q4 | golden id + oracle 命名 | golden_id：(a) gt001_fmu_v1（+ Q2(a) gt001_fmu_comb_v1）；oracle：(a) gt001_fmu_oracle.py（单文件双 Run 组）；(b) 双 oracle 分文件 | **gt001_fmu_v1 + gt001_fmu_oracle.py**——命名空间不撞 gt001_v1…v4；supersedes=null 并列轨；单 oracle 双 Run 组沿 gt001_l1_oracle 体例（comb 组面随 Q2 联动） |
| Q5 | Run 白名单范围 | (a) 12 Run 全集（thermo 镜像 6 + comb 镜像 6——Q2(a) 承载）；(b) 6 Run（thermo 镜像） | **(a)**——oracle RUNS 白名单逐字全集（GTL1 §4 项 4/GTCMB §4 项 5 镜像全集先例）；裁剪无依据（随 Q2 联动） |
| Q6 | parity 制度沿用 | (a) fc001_fmu_parity.py 同构独立机检（gt001_fmu_parity.py 新文件——I-9 独立成文；≤1e-9 规模相对误差判据 + SKIP exit 3 先例逐条沿用）；(b) parity 并入 verify_golden | **(a)**——I-9 伴生工具独立成文 + fc001 先例机制全复用；R-G9-02 句式判据沿用；verify_golden Python-Python 走既有 T-B 链分工不变 |
| Q7 | 平台矩阵（同轮 vs 后补） | (a) 批准轮同轮裁定（V07 A-7 行挂「随 A-6 裁定」）；(b) win64 先行、linux64/.dylib 后补独立 CHG | **(a) 裁定时点同轮 + 构成推荐 win64 先行**（gcc -std=c99 -O2 -ffp-contract=off -fno-fast-math 钉死——fc001_l1.c:19-21 先例；linux64/.dylib 后补重钉须 CHG——A-7 行原文）——与 fc001 Q10 不同：本波 A-7 行已预登记同轮面，无单独波次缺口 |
| Q8 | provenance 档位 | (a) 复用 fmu_l1_lumped_unvalidated（跨系统共享档位——枚举零新增）；(b) gt 前缀新值 | **(a)**——fc001 Q2(A) 定案已立值、语义同档（数值集总未经实验/硬件验证）；枚举零新增 + V312 CHG 例外零新增面；golden 顶层 + run 级双落位沿 fc001_fmu_v1 实读先例 |
| Q9 | DEFAULT_MODELS 追加 | (a) 尾追加 gt001_fmu（Q2(a) 另含 gt001_fmu_comb——步① 无参调用 7/8 golden）；(b) 不追加 | **(a)**——FL/FC/GT 先例形态（:311 现值六成员尾追加）+ 全注册行走步① 制度一致；label 滞后说明沿先例维持登记 |
| Q10 | run-g2 步账（I-7）+ parity 步形态 | (a) 新增独立 gt001_fmu_parity 步（第 37 步——I-9 独立成文；CHG 扩账申报 36→37）；(b) fc001_fmu_parity.py 通用化扩为多 FMU 机检（改既有步——步数零增但步语义变更 + fc001 侧伴生面改动张力） | **(a)**——I-9「伴生工具一律独立成文」原文直指；既有 36 步判据零翻转（fc001 FIRST-33-STEPS-NORMALIZED-IDENTICAL 纪律同构沿袭）；SKIP 语义显式（编译产物/64 位解释器缺位——fc001 :138 skipFmu 先例） |
| Q11 | oracle 自检段名 | (a) GTFMU-1…n（V07 A-6 行原文点名「GTFMU-x 自检」）；(b) GFMU-1…n；(c) FMU-1…n 复用 | **(a)**——上游授权文本原文命名（非开放裁定面）；(c) 与 fc001_fmu_oracle FMU-x 段跨文件同名混淆 V-04 报告/审计面（GTCMB Q6 (c) 不推荐理由同构） |
| Q12 | FMU 轨选择键面 | (a) plant adapter 层绑定（gt001-fmu-adapter.js——场景零新键；fc001 Q13 先例）；(b) scenario 显式新键（B-1a 同构） | **(a)**——fc001-fmu-adapter.js 轨锚定校验三面先例（golden_id/model_provenance/model_id）；涟漪最小；实现证明需场景钉轨则停下显式 CHG |

**定案记录（GTFMU-G2b-02 批准轮，2026-11-19，CHG-20261119-01——全部按推荐定案；实现轮不再重开，如实现中证明不可行，停下显式 CHG）**：
- **Q1 = (B)**：控制积分器 u 归 host——内核纯物理真值（[f,T3]/[f,T3,x_comb] RK4 面）；host 以 h=0.01 子步粒度驱动 doStep（n=1）+ 子步间 EQ-GTL1-9/10 推进 + 记账复刻；通信步粒度 0.01 显式登记（DefaultExperiment stepSize=0.01 + canHandleVariableCommunicationStepSize=false）；ZOH 降级变体排除。
- **Q2 = (a)**：thermo 基准 + comb 深化双轨并列——两 C99 内核（gt001_l1.c 2 态 / gt001_comb_l1.c 3 态）+ 两 .fmu 包（各自 V312 B-4 钉 hash）+ 两 golden（gt001_fmu_v1 / gt001_fmu_comb_v1，均 supersedes=null）。
- **Q3 = gt.sync.fmu_l1 + '1.0.0'**；包命名 gt001_l1_v1.fmu / gt001_comb_l1_v1.fmu。
- **Q4 = gt001_fmu_v1 + gt001_fmu_comb_v1**；单 oracle `gt001_fmu_oracle.py`（双 Run 组——thermo 组/comb 组）。
- **Q5 = (a) 12 Run 全集**（thermo 镜像 6 + comb 镜像 6——oracle RUNS 逐字）。
- **Q6 = (a)**：gt001_fmu_parity.py 独立机检（I-9 独立成文；≤1e-9 规模相对误差判据 + SKIP exit 3 沿 fc001 先例）。
- **Q7 = (a) 平台矩阵本轮裁定：win64 先行**（gcc -std=c99 -O2 -ffp-contract=off -fno-fast-math 钉死；linux64/.dylib 后补重钉须 CHG——A-7）。
- **Q8 = (a) 复用 fmu_l1_lumped_unvalidated**（枚举零新增；**B-2：V312 §7 例外行 + A-4 docstring 扩域随批准轮 CHG 打包**——已落 CHG-20261119-01 ④）；golden 顶层 + run 级双落位。
- **Q9 = (a)**：DEFAULT_MODELS 尾追加 gt001_fmu + gt001_fmu_comb（步① 无参调用 8 golden）。
- **Q10 = (a)**：新增独立 gt001_fmu_parity 步（第 37 步——36→37 显式申报；I-9 独立成文；SKIP 语义沿 fc001 先例）。
- **Q11 = (a) GTFMU-1…n**；**Q12 = (a) plant adapter 层绑定**（gt001-fmu-adapter.js——场景零新键）。

---

**修订记录**：
- **v1.0（2026-11-19 批准轮收口，GTFMU-G2b-02 / CHG-20261119-01）**：双路独立评审 A
  （PASS_WITH_CONDITIONS(2)）+ B（PASS_WITH_CONDITIONS(3)——evidence/g2b/GTFMU_G2B_REVIEW_B.md）
  + 用户书面批准（「批准」指令链）；条件 A-1/A-2/B-1/B-2/B-3 落正文（§10.2）；Q1…Q12 全按
  推荐定案（§11 定案记录）；§10.1 双评审 + 用户批准行回填；头部/状态由 DRAFT v0.1 升
  APPROVED v1.0（git mv 更名——FCFMU-G2b-02 先例同款）。
- v0.1（2026-11-18 初稿，V1120 波阶段一 S1 / CHG-20261118-08 授权链）：全文初稿——GT 批准
  规格（GTL1 §2/GTCMB §1.3）逐字保留声明 + 逐条映射表；§0 边界 + 勘误头七项承接表（§0.1
  ——601 点原生沿用 fc001 Q1(A)）；§1 模型形态（三层夹心 GT 语境 / 工件身份 / EQ-GTFMU
  冻结表草案（EQ-GTL1-1…12 逐字 + FMU 化标注 + comb 修订式）/ 常量字典（15 位逐字）/
  两核心裁定点（Q1 控制积分器归属——内核 vs host 对照 + 推荐 host / Q2 变体面）/ 键面
  收窄登记 / epistemic declaration + provenance 档位裁定点）；§2 影响面（12 Run 矩阵
  逐字转写 / 白名单与哈希 / 事件编码零扩展 / 跨载体比对面 + 因果面零新增结构性差异登记）；
  §3 锚点与包络（设计点稳态表 / comb 初值与稳态不变性 / 动态结构预填——数值留批准轮）；
  §4 golden 计划十二项（gt001_fmu_v1 / GTFMU-1…7 / T-B / gate 键面零缺口逐键预登记 /
  verify 注册 / 两门禁面 / parity 独立机检）；§5 排期；§6 红线自查 I-1…I-9（I-8/I-9 新增
  两条逐条）+ copy-guard 预查（BANNED 43 现值实读——零增词预期）；§7 进入条件；§8 工作面
  GTFMU-G2b-01…04；§9 风险 R-1…R-9；§10 评审记录留空；§11 Q1…Q12 不定案。

**状态 `APPROVED v1.0`**：GTFMU-G2b-02 批准轮收口（2026-11-19，CHG-20261119-01——双路
独立评审 + 用户书面批准 + 条件落正文 + Q 定案）。实现面（GTFMU-G2b-03 oracle emit /
G2b-04 C99 编译）= v1.12.0 实现轮随批开工；验收路径两门禁面（§4 项 10）自 gt001_fmu_v1
emit verify 通过起开放。

**文件结束**。GT001_FMU_G2B_SPEC_APPROVED v1.0（2026-11-19，GTFMU-G2b-02 批准轮收口，
CHG-20261119-01；原 GT001_FMU_G2B_SPEC_DRAFT v0.1 由本批准升格更名）。本规格为 GT 批准
规格（GTL1_G2B_SPEC_APPROVED v1.0 §2 / GT001_COMBUSTION_G2B_SPEC_APPROVED v1.0 §1.3）
热力链物理的仓内 G2b 化 FMU 轨转写——上游批准文本为唯一物理载体逐字保留；Q1…Q12 已定案
冻结，实现轮不再重开（如实现中证明不可行，停下显式 CHG）。
