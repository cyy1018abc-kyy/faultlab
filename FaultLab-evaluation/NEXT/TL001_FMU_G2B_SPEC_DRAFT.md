# TL001_FMU_G2B_SPEC_DRAFT — TL-001 输电线路功角摇摆 G2b 物理规格草案（DRAFT v0.1）

> **状态**：`DRAFT v0.1（2026-11-20，V1150→V1160 波 A-10——零实现承诺；Q 点全候选 + 推荐
> 不定案；批准留待用户——本状态行即 DRAFT 依据）`。
> **任务**：V08_ROADMAP 主线 A **A-10 行**「TL-001 G2b 草案轮」——**跨系统联合 Run 首例**
> （方案 (A) TL 独立 SystemDef + GT 联合耦合面——TL001_CROSS_SYSTEM_RFC.md 已批准
> R-CS-01..04）。
> **授权**：CHG-20261120-01（TL-001 RFC 批准 + TL-001 G2b 草案轮授权 A-10）。
> **物理权威**：GTL1_G2B_SPEC_APPROVED v1.0 §2（GT 侧物理——EQ-GTL1-1..12 + 摇摆方程）+
> TL001_CROSS_SYSTEM_RFC.md §3（TL-b 功角摇摆方程草案候选——TL-EQ-1..5）。
> **体例**：GT001_FMU_G2B_SPEC_APPROVED v1.0 体例同构（联合 Run 语境改写面逐处注记）。

---

## 0. 本规格边界（做/不做）

- **做**：TL-001 独立 SystemDef 定义（`TL-001` model_id=`tl.transmission.l0`）+ 联合 RK4
  冻结表草案（EQ-TL-1..5 + GT 耦合面——[f,T3,δ,ω] 四维联合 RK4 首例）+ Run 矩阵 +
  golden 计划（gt_tl_joint_v1）+ Q 点全候选；
- **不做**：TL-c 跨系统耦合（远期）；TL-001 独立 golden（联合 golden 承载）；linux64
  实施（另行 CHG）；C3（挂起维持）。

## §1 联合 RK4 冻结表草案（EQ-TL 冻结表——GT 侧 EQ-GTL1 沿袭 + TL 侧 EQ-TL-1..5 新增）

**联合微分态 y = [f, T3, δ, ω]（四维——GT [f,T3] + TL [δ,ω] 联合积分首例）**：

| id | 方程 | FMU 化标注 |
|---|---|---|
| EQ-TL-1（GT 沿袭） | df/dt = (P_rotor/K_J)·(f₀/f) | **内核**（P_rotor 改用 TL P_elec——联合耦合改写） |
| EQ-TL-2（GT 沿袭） | C_3·dT3/dt = η_b·Q_f − ṁ_g·cp_g·(T3−T2) | **内核**（GT 燃烧室能量平衡——不变） |
| **EQ-TL-3（TL 新增）** | dδ/dt = ω_s·(ω − ω₀) | **内核**（功角-角速度关系——ω_s = 2π·f₀） |
| **EQ-TL-4（TL 新增）** | M·dω/dt = P_mech − P_elec(δ) − D·(ω−ω₀) | **内核**（转子动力学——P_mech = P_gen_GT） |
| **EQ-TL-5（TL 新增）** | P_elec(δ) = (V_gen·V_inf/X_line)·sin(δ) | **内核**（线路功率传输——sin 为跨 libm 散差源 R-1 预登记） |

**联合耦合面（GT↔TL 双向——方案 (A) 松耦合面）**：

| 方向 | GT → TL | TL → GT |
|---|---|---|
| 变量 | P_gen_GT（EQ-GTL1-6 输出） | P_elec(δ)（EQ-TL-5 输出） |
| 机制 | TL 的 P_mech = P_gen_GT | GT 的 P_rotor = P_elec + P_bat − P_load |
| 替代 | 原 GT P_rotor = P_gen + P_bat − P_load 改为 P_elec + P_bat − P_load | 原 P_gen = ETA_M·(P_turb − P_comp) 保留（GT 发电能力不变） |

**关键区别**：联合 Run 中 GT 的 P_rotor 不再直接等于 P_gen + P_bat − P_load（GT 独立轨
口径），而是由 TL 功角 P_elec 替代 P_gen 的角色——**联合 Run 的 GT 轨迹 ≠ 独立 GT 轨迹**
（这恰好是 TL-b 功角摇摆的教学面——TL 耦合改变了 GT 动态）。

**数值方法**：联合 RK4——[f,T3,δ,ω] 四维联合积分（δt=0.01 子步 × Δt=0.1 通信步——
fc001/gt001 模式复刻）；P_elec(δ) 中 sin() 为**跨 libm 散差源**（R-1 预登记——实测
×≥10 冻结制）。

## §2 Run 矩阵

| Run | 耦合面 | 说明 |
|---|---|---|
| joint_healthy | GT+TL 联合，无故障 | δ 稳态、ω 稳态——功角平衡 |
| joint_load_step | GT+TL 联合，load_step | P_load 阶跃 → GT P_gen 变化 → TL δ 摆动 |
| joint_sensor_drift | GT+TL 联合，sensor_drift | 传感偏置 → GT 调速器 → TL 功角响应 |
| joint_gt_standalone | GT 独立（TL 解耦——P_elec=P_gen 等价退化） | 对照面（TL 解耦时 GT 轨迹 ≡ gt001_v3 独立轨——**逐位恒等守卫**） |

## §3 golden 计划

golden_id = **gt_tl_joint_v1**（联合域——supersedes=null）；model_id = **gt.sync.tl.l0**（联合——
sync=GT 机械接口 + tl=输电线路面）；Run 集 4 Run（联合 healthy/load/sensor/gt_standalone 对照）；
tier **T-B**；SERIES_IDS = GT 27 列 + TL 新列（δ_rad / ω_rad_s / P_elec_kW / P_mech_kW = **31 列**）。

## §4 Q 点清单

| # | 问题 | 推荐 |
|---|---|---|
| Q1 | 联合 Run 中 GT P_rotor 改用 P_elec | (a) P_elec 替代 P_gen（真耦合） |
| Q2 | TL 参数（X_line/M/D） | 教学整定值（非实测——I-5 句式） |
| Q3 | sin() 跨 libm 散差 | ×≥10 冻结制（R-1 沿袭） |
| Q4 | TL 新列数 | 4 列（δ/ω/P_elec/P_mech） |
| Q5 | golden id | gt_tl_joint_v1 |
| Q6 | 八面影响 | 全 additive |

## §5 用户裁定留白章

| # | 裁定项 | 用户裁定 |
|---|---|---|
| R-TLFMU-01 | 本规格是否批准 | （待填） |
| R-TLFMU-02 | Q1..Q7 定案 | （待填） |
| R-TLFMU-03 | 排程 | （待填） |

**文件结束**。TL001_FMU_G2B_SPEC_DRAFT v0.1（2026-11-20，V1150 波 A-10，CHG-20261120-01）。
