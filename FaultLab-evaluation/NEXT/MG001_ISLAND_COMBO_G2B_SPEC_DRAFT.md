# MG001_ISLAND_COMBO_G2B_SPEC_DRAFT — MG-001 孤岛组合语义增补规格（B-9 / V1150 / CHG-20261119-09）

> **状态**：`DRAFT v0.1（2026-11-20，V1150 波阶段一 S3——零实现承诺；Q 点全候选 + 推荐
> 不定案；批准留待 v1.16.0 批准轮——本状态行即 DRAFT 依据）`。
> **任务**：V08_ROADMAP 主线 B **B-9 行**「MG-D1 孤岛组合语义 G2b 草案」（MG001_G2B_SPEC_
> APPROVED v1.0 增补规格——island 组合键 + EQ-MG-7 分段前提破缺处理 + T-A→T-B 制度切换评估
> ——PV_WT_MG_L1_DEPTH_ASSESSMENT MG-D1 兑现）。
> **物理权威**：`MG001_G2B_SPEC_APPROVED.md` v1.0（EQ-MG-1..10 冻结表 + 聚合层 L0 定位）+
> `tools/oracle/mg001_oracle.py`（mg001_v1 数值权威）。
> **体例**：MG001_G2B_SPEC_APPROVED v1.0 增补规格体例（非独立规格——MG001 已批准基座的
> additive 面）。

---

## 0. 本增补规格边界（做/不做）

- **做**：island 组合键 additive（island 事件可与源族/load_step 独立时刻组合）；EQ-MG-7
  分段常值前提破缺处理（P_bess 时变化 → SOC 数值积分 → T-A→T-B 制度切换评估）；
  validateConfig 新键面（B-1a 显式键纪律）；UI 控件面。
- **不做**：MG-D2 BESS 深物理面接入（FL thermal 复用——后续轮）；MG-D3 新系统归属（评估
  后另行裁定）；FMU 轨（MG 不预设——C-6 评估登记）；既有 golden 零触碰（mg001_v1 冻结）。

## 1. 组合语义核心裁定

### 1.1 现状：island_event 独立事件（不可组合）

MG001_G2B_SPEC_APPROVED §2.4 登记口径：island_event 为**独立事件**（非主链分派键）——
island 触发后 BESS 进入孤岛窗（P_bess = ±8 kW 钳位），但**源族（shading/gust/link）与
island 不可同时注入**——「岛内阵风使 shed 2→0」等组合场景不可达（MG 教学定位「间歇性
叠加④」的结构性限制——§2.4 已登记）。

### 1.2 增补：island 组合键（island_combo）

**候选键面（B-1a 显式键纪律）**：

| 键 | 类型 | 说明 |
|---|---|---|
| island_combo | 事件级模式切换键（EVENT_KEYS additive） | island 可与源族/load_step **独立时刻组合**——「岛内阵风」等单 Run 可达 |

**EQ-MG-7 分段常值前提破缺**：

| 面项 | 现行（EQ-MG-7 分段常值） | 组合后（P_bess 时变化） |
|---|---|---|
| P_bess | 分段常值（island 窗 ±8 kW 钳位——非孤岛窗馈线补差） | **时变化**——岛内 P_bess 随源波动 chase → 卸载量随源波动重整 |
| SOC | 闭式解（T-A 精确解析——分段常值 P_bess 的解析积分） | **数值积分**（P_bess 时变化 → T-A 闭式性破缺 → T-A→T-B 制度切换） |
| oracle | 闭式计算（mg001_oracle.py 全解析） | 数值积分（RK4 或分段求和——mg001_v2 oracle） |
| golden | mg001_v1（T-A 解析） | mg001_v2（T-B 数值——新 id 并列轨 supersedes=mg001_v1） |

### 1.3 T-A→T-B 制度切换评估（本草案核心影响面）

| 面项 | T-A（现行 mg001_v1） | T-B（组合后 mg001_v2） |
|---|---|---|
| SOC 解析 | 分段常值 P_bess → 解析精确 | P_bess 时变 → RK4 数值积分 |
| E_bess | 解析精确（分段常值 × 时长） | RK4 增量累计 |
| oracle 复杂度 | 全闭式（mg001_oracle.py 全解析） | 数值仿真（RK4 + chase 面） |
| gate 容差 | T-A 精确（rtol 1e-12） | T-B 数值（SOC_pp 1e-5 等——GTL1/gt001_v3 同制） |
| Parity 面 | Python↔Python rtol 1e-12 | C↔Python T-B（同 fc001/gt001 先例——如需 FMU 化） |

## 2. Run 矩阵增补

| Run | island_combo | 源族 | 教学面 |
|---|---|---|---|
| mg_combo_island_gust | island=20.0 + gust_step=30.0 | gust_step | **岛内阵风使 shed 2→0**（组合核心教学面） |
| mg_combo_island_shading | island=15.0 + shading_step=25.0 | shading_step | 岛内遮蔽 → 卸载重整 |
| mg_combo_island_load | island=20.0 + load_step=40.0 | load_step | 岛内负荷冲击 → BESS 域收缩 |

（Q 点：新增 3 Run 增补 vs 替换既有——推荐 additive 增补沿 PV/WT/MG 先例。）

## 3. Q 点清单

| # | 问题 | 候选 | 推荐 |
|---|---|---|---|
| Q1 | 键面 | (a) island_combo 事件级模式切换键（EVENT_KEYS additive）；(b) island 独立时刻参数化（island_start_s 显式键） | (a)——事件级组合 |
| Q2 | EQ-MG-7 处理 | (a) 数值积分（RK4——P_bess 时变化 chase）；(b) 分段解析（子段求和） | (a)——RK4 chase 面 |
| Q3 | golden id | (a) mg001_v2（新 id 并列轨 supersedes=mg001_v1）；(b) mg001_v1 原地扩容（违反字节冻结） | (a)——新 id |
| Q4 | 容差 tier | (a) T-B 数值（SOC_pp 1e-5——gt001_v3 同制）；(b) T-A 解析沿袭（不可行——P_bess 时变化） | (a)——T-B |
| Q5 | Run 集 | (a) additive 增补 3 Run（mg001_v2 = mg001_v1 5 Run + 3 combo Run = 8 Run）；(b) 替换 | (a)——additive |
| Q6 | MODELS 注册 | (a) mg001_fmu 不适用——mg001_combo 注册行 + DEFAULT_MODELS 追加 | (a) |
| Q7 | UI 面 | (a) MG-001 island_combo 控件 + causalTemplates 增补 | (a) |

## 4. 评审计划

双路评审（S5）：物理面（EQ-MG-7 破缺/数值积分/包络重推）+ 治理面（B-1a 键面/golden 治理/T-A→T-B 制度/步数账）。

## 5. 用户裁定留白章

| # | 裁定项 | 用户裁定 |
|---|---|---|
| R-MGD1-01 | MG-D1 是否批准 | （待填） |
| R-MGD1-02 | Q1..Q7 定案 | （待填） |
| R-MGD1-03 | 排程（v1.16.0 / 远期 / 不排程） | （待填） |

**文件结束**。MG001_ISLAND_COMBO_G2B_SPEC_DRAFT v0.1（2026-11-20，V1150 波 S3，
CHG-20261119-09）。本草案为零实现承诺文本；裁定留白章显式留用户。
