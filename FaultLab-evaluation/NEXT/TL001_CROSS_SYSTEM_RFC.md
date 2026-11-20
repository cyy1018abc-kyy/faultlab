# TL001_CROSS_SYSTEM_RFC — TL-001 跨系统联合 golden 架构 RFC（A-9 / V1150 / CHG-20261119-09）

> **状态**：`RFC v0.1（2026-11-20，V1150 波阶段一 S1——零实现承诺；方案全候选 + 推荐
> 不定案；用户裁定留白 §9）`。
> **任务**：V08_ROADMAP 主线 A **A-9 行**「TL-001 跨系统联合 golden 架构 RFC（GT+TL 联合
> Run/golden 的合法性/格式/哈希面/parity 制度/八面影响面——架构突破面专项 RFC）」。
> **授权**：V1150_WAVE_DESIGN v1（CHG-20261119-09，S1 名额——CHG-20261119-08 ② 授权链）。
> **上游裁定**：TL001_TRANSMISSION_PRE_RESEARCH.md R-TL-01..04（CHG-20261119-07——条件立项
> TL-b 功角摇摆 + R-TL-03 跨系统 RFC 前置）。
> **体例声明**：本文件为**架构 RFC**（非 G2b 规格）——方案全候选 + 推荐，**不定实现**；
> RFC 批准后方走 TL-001 G2b 草案轮（A-10）。
> **不变式张力声明**：八面冻结 §2「每个 golden 属于单一系统 model_id」为既有纪律——
> 联合 golden 突破此隔离纪律，须独立 RFC + 用户裁定（I-10 新增不变式原文）。

---

## §1 架构问题定义

### §1.1 八面隔离纪律张力逐面分析

| 面 | 现有纪律 | TL-b 跨系统联合 Run 的张力 |
|---|---|---|
| 面① model registry | 每个 SystemDef 独立 model_id/model_version | GT+TL 联合 Run 归属哪个 model_id？GT-001？新 TL-001？新 gt_tl？ |
| 面② golden | 每个 golden 属于单一 golden_id/model_id | 联合 golden 归属？gt001_fmu_v2？tl001_v1？新命名域？ |
| 面③ scenario/config | 每个 config 属于单一 systemId | 联合 Run 的 config 含 GT-001 + TL-001 两组参数——systemId 如何承载？ |
| 面④ fault catalog | 每系统独立故障族 | TL-001 新故障族（线路过载/短路）与 GT 族如何共存？ |
| 面⑤ provenance | 两枚举 + fmu_l1_lumped_unvalidated | TL-001 物理为解析/数值——沿用 analytical_demo？ |
| 面⑥ compare | 同系统内 Run 比对 | GT Run vs TL Run 的比对是**跨系统**——cross_fidelity 谓词需扩展 |
| 面⑦ run-g2 | 每步独立 verify_golden | 联合 golden 的 verify_golden 注册行（新增 1 行 + DEFAULT_MODELS 扩张） |
| 面⑧ copy-guard | 43 patterns | TL-001 语境词面预检（线路/潮流——预期零增词） |

### §1.2 核心架构问题（3 问）

1. **联合 Run 合法性**：GT+TL 联合 Run（GT 发电机 + TL 线路功率传输——物理耦合）是否可作为单一 Run 仿真？
2. **联合 golden 归属**：联合 golden 的 golden_id/model_id 应为何？
3. **TL-001 SystemDef 独立性**：TL-001 是否需要独立 SystemDef（TL-001 路线 (a)）还是作为 GT-001 的扩展轨（路线 (c)）？

## §2 候选架构方案

### 方案 (A) TL 独立 SystemDef + GT 联合耦合面（松耦合推荐）

**形态**：TL-001 独立 SystemDef（model_id=tl.transmission.l0）；GT-001 保持独立 SystemDef。
联合 Run = 配置中同时引用两个 systemId（config.systems = ["GT-001", "TL-001"]）——引擎层
新增 **联合 dispatch**（GT RK4 → TL 代数面 → 交互变量 f/P_gen/P_line 逐子步交换）。

| 维度 | 评估 |
|---|---|
| 八面影响 | 面① 新增 SystemDef（additive）；面② 新增联合 golden（新 id）；面③ 新增 systems 数组键（additive——B-1a 同构）；面④ TL 新族（additive）；面⑤ 沿袭；面⑥ cross_system 谓词（additive）；面⑦ run-g2 新步；面⑧ 零增词 |
| parity | 单内核联合 RK4（GT [f,T3] + TL 代数链——RK4 状态合并积分）or 双内核接口（复杂——不推荐首版） |
| golden 命名 | `gt_tl_joint_v1`（联合域新命名——golden_id 从不撞名） |
| 哈希面 | runHashInput 扩展（systems 数组进入 hash 输入——additive） |
| 实现成本 | **高**——引擎联合 dispatch 面新建（simulateJoint 函数 + registry 扩展 + TL-001 SystemDef 全套 + 联合 golden emit） |
| 教学价值 | **最高**——跨系统耦合/潮流-频率/功角摇摆全链 |

### 方案 (B) GT+TL 合并 SystemDef（紧耦合——不推荐）

**形态**：GT-001 SystemDef 扩展 inertia_model 或新增 transmission_mode 枚举——TL 面作为
GT 的第 N+1 轨（类比 GT thermo_comb 之于 thermo）。

| 维度 | 评估 |
|---|---|
| 八面影响 | 面① SystemDef 扩张（inertia_model 枚举再增——violates GT-001 模型边界语义）；面③ TL 参数面进 GT config；其余同 (A) |
| parity | 联合 RK4（同 (A)） |
| golden | gt001_v5（GT 域内新 golden——gt001 命名空间拥挤） |
| 实现成本 | **最高**——GT-001 SystemDef 全套重排 + TL 物理域硬塞进 GT 架构 |
| 教学价值 | 同 (A) 但系统边界语义失真（TL 非 GT 子系统） |
| **不推荐理由** | TL-001 是独立物理域（输电线路 ≠ 发电机），硬塞进 GT SystemDef 违反系统边界语义 + GT-001 已有四轨拥挤 |

### 方案 (C) 分离 golden + 交叉引用（无联合 Run——最保守）

**形态**：TL-001 独立 SystemDef + TL golden；GT golden 不变；比对面新增 **cross_system
谓词**（GT Run vs TL Run 的 L2 评测面比对——不联合仿真）。

| 维度 | 评估 |
|---|---|
| 八面影响 | 面① 新增 SystemDef（同 (A)）；面② 新增 TL golden；面⑥ 新增 cross_system 谓词 |
| parity | TL 独立 parity（不涉及 GT 耦合） |
| golden | tl001_v1（独立命名域） |
| 实现成本 | **最低**——TL 独立仿真 + 交叉比对面（无联合 dispatch） |
| 教学价值 | **有限**——无联合仿真 = 无真正的跨系统耦合教学面（与 TL-b 功角摇摆目标不符） |
| **不推荐理由** | TL-b 功角摇摆的物理本质 = GT 发电机与 TL 线路的**实时耦合**（df/dt 依赖 P_rotor 依赖 P_elec(δ) 依赖线路阻抗）——分离 golden 无法承载 |

### 推荐一句话

采 **(A) TL 独立 SystemDef + GT 联合耦合面**——架构语义正确（TL 是独立物理域）+ 联合
dispatch 为最小架构突破（引擎新增 simulateJoint 面）+ 教学价值最高（真正的跨系统耦合）。

## §3 TL-b 物理域草案候选（方程草案——不定实现）

### TL-b 功角摇摆核心方程候选

| 式 | 方程（草案——批准轮定案） | 说明 |
|---|---|---|
| TL-EQ-1 | δ_dot = ω_s·(ω − ω₀) | 功角-角速度关系（ω_s = 2π·f₀ = 314.159 rad/s） |
| TL-EQ-2 | M·dω/dt = P_mech − P_elec(δ) − D·(ω−ω₀) | 发电机转子动力学（M = 惯量常数；D = 阻尼系数） |
| TL-EQ-3 | P_elec(δ) = (V_gen·V_inf/X_line)·sin(δ) | 线路功率传输（单机-无穷母线模型） |
| TL-EQ-4 | P_mech(t) = P_gen_GT(t)（GT-001 耦合） | GT-001 发电功率 = TL-001 机械功率输入 |
| TL-EQ-5 | V_gen ≈ f_GT/f₀·V_rated | GT 频率→电压幅值映射（简化线性耦合） |

### 参数候选

| 参数 | 候选值 | 说明 |
|---|---|---|
| X_line | 0.5–1.0 p.u. | 线路电抗（教学整定值） |
| M（H） | 3–8 s | 惯量常数（同步发电机典型 3-8 s） |
| D | 0.02–0.05 p.u./p.u. | 阻尼系数 |
| V_rated | 400 V（V_bus 沿袭） | 额定电压 |

### GT 耦合面候选

| 耦合方向 | GT-001 → TL-001 | TL-001 → GT-001 |
|---|---|---|
| 变量 | P_gen_GT（GT-001 EQ-GTL1-6 输出）| P_load_TL（TL-001 线路功率需求） |
| 机制 | GT 的 P_gen 进入 TL 的 P_mech（TL-EQ-4） | TL 的 P_elec(δ) 反馈进 GT 的 P_rotor（P_bat−P_load 面） |

## §4 parity/golden/哈希面候选

| 面 | 方案 (A) 候选 |
|---|---|
| parity | 联合 RK4 单内核（GT [f,T3] + TL [δ,ω] 联合积分——RK4 状态 [f,T3,δ,ω] 四维）；C99 内核 + Python oracle 同算法同步长（fc001/gt001 模式复刻——pow 同源 R-1 预期） |
| golden | gt_tl_joint_v1（联合域）；27+3 列（GT 27 列 + δ + ω + P_elec——零新热力列）；T-B tier（跨实现 pow 预期 ~2.5e-4——R-1 同源） |
| runHash | config.systems = ["GT-001","TL-001"] 数组进入 hash 输入（additive）；联合 cfg 参数面全量 |

## §5 八面影响面

| 面 | 判定 | 变更 |
|---|---|---|
| 面① model registry | **additive** | 新增 TL-001 SystemDef + 联合 dispatch 面 |
| 面② golden | **additive** | 新增 gt_tl_joint_v1（联合域） |
| 面③ scenario/config | **additive** | systems 数组键新增（B-1a 显式键纪律——零投影） |
| 面④ fault catalog | **additive** | TL 新族（线路过载/三相短路——候选面） |
| 面⑤ provenance | **零变化** | analytical_demo 沿袭（TL 解析/数值轨） |
| 面⑥ compare | **additive** | cross_system 谓词新增（第三比对关系——GT↔TL 联合） |
| 面⑦ run-g2 | **additive** | 联合 golden verify 注册行 + DEFAULT_MODELS 追加 + 联合 parity 步 |
| 面⑧ copy-guard | **零增词** | TL 语境词面预检（线路/潮流——预期零增词） |

## §6 推荐 + 理由

| 方案 | 教学价值 | 架构正确性 | 实现成本 | parity 可达 | **推荐** |
|---|---|---|---|---|---|
| (A) 联合 dispatch | **最高** | ✅ TL 独立物理域 | 高（引擎联合面新建） | ✅（联合 RK4） | **✓ 推荐** |
| (B) 紧耦合 | 高 | ✗ GT 边界语义失真 | 最高 | ✅ | ✗ |
| (C) 分离 golden | 有限 | ✅ 最保守 | 最低 | ✅ | ✗（与 TL-b 目标不符） |

## §7 Q 点清单

| # | 问题 | 候选 | 推荐 |
|---|---|---|---|
| Q1 | 联合 Run 合法性 | (a) 允许（架构 RFC 批准后）；(b) 不允许（维持隔离） | (a)——RFC 裁定后合法化 |
| Q2 | golden 命名 | (a) gt_tl_joint_v1；(b) tl001_v1；(c) 其他 | (a)——联合域命名 |
| Q3 | runHash 面 | (a) systems 数组进 hash（additive）；(b) 联合 cfg 独立 hash 域 | (a)——additive |
| Q4 | parity 制度 | (a) 联合 RK4 单内核（C99 [f,T3,δ,ω] 四维）；(b) 双内核接口 | (a)——首版单内核 |
| Q5 | TL-b 物理域 | 方程候选 TL-EQ-1..5（§3） | 批准轮定案 |
| Q6 | 八面影响 | (a) 全 additive；(b) 任一 breaking | (a)——全 additive 预期 |
| Q7 | 实现排程 | RFC 批准 → TL-001 G2b 草案 → 批准 → 实现（A-10/A-11） | 批准轮逐裁定 |

## §8 评审计划

双路评审（S5）：架构面（联合 dispatch/八面影响）+ 治理面（golden 治理/哈希面/准入/步数账/copy-guard）——互不可见。

## §9 用户裁定留白章

| # | 裁定项 | 用户裁定 |
|---|---|---|
| R-CS-01 | RFC 方案选择（A/B/C） | （待填） |
| R-CS-02 | TL-b 物理域方程定案 | （待填） |
| R-CS-03 | 实现排程 | （待填） |
| R-CS-04 | 联合 golden naming 确认 | （待填） |

**文件结束**。TL001_CROSS_SYSTEM_RFC v0.1（2026-11-20，V1150 波 S1，CHG-20261119-09）。
本 RFC 为架构层突破面专项提案——方案全候选 + 推荐不定案；RFC 批准（用户裁定 §9）后方走
TL-001 G2b 草案轮（A-10）。
