# MG001_G2B_SPEC_DRAFT — MG-001 微电网多源聚合系统 G2b 物理规格（DRAFT v0.1）

> **任务**：B-3 MG-001 微电网系统 G2b 规格起草（V06_ROADMAP §2 主线 B B-3 行 / V090_WAVE_DESIGN
> §1 DEC-1 / §2 阶段一 T1）。
> **授权**：V090_WAVE_DESIGN v1（CHG-20261108-01，2026-11-08 批准，用户「设计下一轮的长期方案，
> 统一采用推荐决策，采用并发多个子智能体来加速任务」授权链）阶段一 T1「B-3 MG-001 草案」。
> **DEC-1：本波只到草案 + 双路评审；批准与实现随用户裁定（推荐：批准早则 v1.0 收敛前实现，
> 否则 v1.0.x 首项）——本草案不构成批准、不触发实现、不触碰任何代码/golden/oracle**。
> **前置**：MG-001 为全新系统（无遗留契约、无遗留实现、无遗留 golden）；但与 PV/WT 不同，
> 其物理面**复用既有系统轨**（DEC-1 推荐采纳为草案基线：聚合/编排层组合 PV-001 + WT-001 +
> BESS（FL-001 电池面）+ 负荷到母线功率平衡，**不建第四套物理栈**；备选=新物理栈，涟漪登记
> §1.7/§11 Q1）。结构先例 = PV001_G2B_SPEC_APPROVED v1.0 / WT001_G2B_SPEC_APPROVED v1.0
> （新系统 G2b 结构 + 不可调度源/理想馈线同构）；L1 制度先例 = GTL1_G2B_SPEC_APPROVED v1.0
> （更新序冻结/域扫描 emit 硬条件——本草案聚合层无新 ODE，仅引用其纪律形制）；编排语义先例 =
> src/core/scenario.js（I-6：场景=有序 Run 配置封闭序列，不引入新执行语义——MG 聚合层为
> 「Run 内组合复用」，与 I-6 的关系显式声明见 §1.2）；SystemDef 解剖模板 =
> src/core/systems.js:119-312（FL-001）/ :912-1040（PV-001）/ :1129-1243（WT-001）；
> 治理依据 = SCOPE_SPLIT_MEMO §8.2；故障目录 = docs/FAULT_CATALOG.md（§8 节为 MG-G2b-03 面）。
> **状态**：`DRAFT v0.1`（2026-11-08，B-3 规格起草人起草）——**待双路独立评审 + 用户书面批准**
> （批准与实现随用户裁定：批准早则 v1.0 收敛前实现，否则 v1.0.x 首项；V090 DEC-1 口径）。
> 批准后：MG-G2b-01（条件修订落正文）→ MG-G2b-02（批准登记）→ MG-G2b-03（oracle+golden，
> 批准后轮）→ MG-G2b-04（实现，同轮）——§8。
> **Q-4 三守卫适用**：新方程集（EQ-MG-1…9）入引擎须走 G2b（即本文档流程）；许可证自研零依赖
> （Python stdlib oracle / 浏览器原生 JS，无新第三方）；验收路径禁入直至批准。
> **本波不动清单（V090 §0，起草轮适用；批准后至实现轮前同样维持）**：
> ① 既有 8 golden（gt001_v1/v2/v3、fl001_v1、fl001_v2、fc001_v1、pv001_v1、wt001_v1）字节冻结，
> 零重出；② tools/oracle/** 全部零触碰（MG-G2b-03 才新建 mg001_oracle.py）；③ engine.js 零改动
> （MG 轨为实现轮显式分支面）；④ scope.js classify 零改动（fall-through 现状即正确语义，
> src/core/scope.js:82）；⑤ 不引入第三方依赖（I-1）；⑥ scenario schema v1 零新键
> （island_event 为 MG 故障族、t_clear_s 既有键——守卫扩展为实现轮显式 CHG 面，§2.4/§8）。
> **记录**：B-3 规格起草人起草（2026-11-08）；锚点数值由临时复算脚本独立计算（Python stdlib，
> `python -I`，源轨物理直接调用冻结 oracle pv001_oracle/wt001_oracle（复用不重推）+ MG 聚合
> 代数独立计算 + 两模式逐位对照 + 分段常值断言 + 包络扫描，记录见 §3.4，脚本已按任务纪律删除）。
> **行号基准说明**：本文档行号引用为**起草时点（2026-11-08）实读值**——V090 阶段一 T2…T6
> 与本草案**并发执行**（V090 §2），相关文件行号可能漂移；实现轮（MG-G2b-03/04）以**语义锚点**
> （信号 id / 检查 id / 函数名 / 族 id）为准定位，行号仅作评审快速索引。
> **相邻残留登记（本波实读核实）**：src/core/scenario.js:152「可用系统」错误文案现列
> FL/FC/GT/PV 而缺 WT-001（WT-001 校验本身经 systems.js 注册表正常工作，纯文案缺口）——
> 不属本规格工作面，登记为 MG-G2b-03 同文件顺带修复面（补 WT-001 + 增 MG-001）。

---

## 0. 定位摘要与红线声明

- **MG-001 微电网多源聚合系统（L0 · 多源聚合行为级演示，单母线并网等效）**：PV-001 子轨
  （G0=1000 固定）+ WT-001 子轨（v0=9 固定）+ BESS（FL-001 电池能量面：40 kWh / 400 V、
  P=0.4·I 换算、SOC 账本）+ 聚合负荷 → **单母线功率平衡聚合层**；主馈线为**理想平衡源补差**
  （与 FL/PV/WT 的馈线同位同构），经**主馈线分断开关**接入（island_event 注入点）。
  MG-001 的聚合层自身**零新增 ODE 状态**——全部新方程为代数（母线恒等式、调度/填补钳位、
  卸载/倾卸、SOC 账本积分）；各源物理**原样复用既有轨**（PV L0 / WT L0b / FL 电池能量面），
  不建第四套物理栈（DEC-1 推荐，备选与涟漪见 §1.7）。
- **层级提案（MG-DRAFT-Q3，§11）**：**聚合层 L0**（ALINE_MODEL_DEPTH_DESIGN §1.1 L0 判据逐条
  对照见 §1.7：聚合面方程全部可手解、输出确定、golden 由解析复算 oracle 生成）；**各源维持
  既有层级**（PV-001 L0 / WT-001 L0b / BESS 电池能量面 = FL-001 L0 电气面）；组合输出的模型
  深度以各源为准——**聚合不升级 provenance**（I-2：UI 层级标签声明「聚合层 L0 · 各源维持
  既有层级」，不宣称组合输出为更高深度）。
- **I-5 措辞红线（本系统专项强化）**：孤岛教学点**只能表述为「脱离主馈线的功率平衡重整演示」**
  （V090 DEC-1 显式裁定口径）；**禁**电网保护/稳定/孤岛保护/防孤岛/并离网切换验证/低电压穿越
  等语义与措辞邻接（自查表 §6.3 第二张表）；「主馈线」「分断开关」仅指补差功率源的理想通断
  抽象，描述文案显式声明「不代表真实电网侧动态」；母线是功率平衡的抽象等效，不是电网模型；
  无频率/电压/无功概念（PV001 §0 / WT001 §0 同款红线延用）。
- **BESS 角色两面（教学核心）**：并网面 = **调度计划跟踪**（p_sched_kW 配置，默认 +5 kW 放电；
  储能调峰教学点）；孤岛面 = **平衡填补 + 钳位卸载**（脱离后 BESS 切换为理想瞬时平衡填补源，
  功率域 [−8, +8] kW 钳位，缺口 → 负荷卸载 P_shed、盈余 → 倾卸 P_dump——「功率平衡重整」的
  具体机制，MG-DRAFT-Q4 定案推荐，备选与 O-13 证据链见 §1.7）。
- **与 FL-001 load_step 的语义差异（显式声明，防 O-13 误读）**：FL-001 load_step 已按 O-13
  删除（SCOPE §5：滞后发电机 + 恒电流电池的守恒破缺，最大失衡 10 kW）。MG 层 load_step 是
  **聚合输入阶跃**（非 FL 内部电气面阶跃）：并网面由理想馈线瞬时补差吸收（PV/WT 恒负荷同构）、
  孤岛面由 BESS 钳位 + 卸载重整吸收——两种模式恒等式均**按构造成立**（EQ-MG-3/4/6），无
  「滞后源追逐失衡」结构，O-13 缺陷模式在 MG 聚合层不复活。族名 load_step 沿跨系统同名族
  惯例（FL/FC/GT 均有 load_step 族），语义差异登记于 FAULT_CATALOG §8 行（MG-G2b-03 面）。
- 时间尺度沿库口径：duration 60 s、dt 0.1 s、601 点网格、默认注入 t=20 s（FAULT_CATALOG §0）；
  MG 聚合层自身无子步积分器（源轨子步在复用轨内：WT h=0.01 原样），SOC/能量为事件感知
  分段解析积分（EQ-MG-7/8）。

## 1. MG-001 系统定义提案

### 1.1 拓扑与组件提案

SystemDef 字段面对照 FL-001/PV-001/WT-001 模板（id/level/summary/signals/components/edges/
categories/faults/model/acceptance；实现字段名为 `edges`）。defaults：
`feedback_mode='closed_loop'`、`initial={load_kW:30, p_sched_kW:5, SOC_pct:60}`
（`p_sched_kW` 为 MG 自有配置量——BESS 调度计划，Q5 定案推荐暴露；`SOC_pct` 沿 FL-001
initial 键面同构（systems.js:144），聚合层 SOC0=60 为账本初值）；**无 inertia_model /
thermal_model 键**（单轨聚合层无新轨；scenario.js 事件级键守卫对未声明系统自动拒绝——
scenario.js:344/364 declaresInertia/declaresThermal 现状即正确语义，零改动）；
`noise={enabled:false, seed:12345, level:0}`；bounds：`load_kW ∈ [10,45]`（沿库口径
systems.js:140）、`p_sched_kW ∈ [−8, 8]`（BESS 结构功率域内）、`SOC_pct ∈ [0,100]`
（FL-001 同款，systems.js:146）；`topologyViewBox=[0,0,1000,620]`、`duration_s=60`、`dt_s=0.1`。

| 组件 id | label | kind | role | faultable | 关键 inspector 信号 |
|---|---|---|---|---|---|
| `pv_unit` | 光伏子轨（PV-001） | pv_array | 不可调度源 · G0=1000 固定 | **是**（pv_shading_link） | P_pv_kW |
| `wt_unit` | 风电子轨（WT-001） | rotor | 不可调度源 · v0=9 固定 | **是**（wt_gust_link） | P_wt_kW |
| `bess` | 储能（FL-001 电池面） | battery | 40 kWh / 400 V · 调度计划 / 孤岛平衡填补 | 否 | P_bess_kW / SOC_true_pct / SOC_est_pct |
| `ems` | MG 调度（EMS） | controller | 计划跟踪 ⇄ 孤岛平衡填补的角色切换 | 否 | P_sched_kW / P_bess_chase_kW |
| `bus` | 聚合母线 | bus | 400 V 等效（功率平衡抽象） | 否 | V_bus_V / r_true_kW / r_meas_kW |
| `switch` | 主馈线分断开关 | switch | 理想通断抽象 · island_event 注入点 | **是**（island_event） | island_state / P_grid_true_kW |
| `feeder` | 主馈线（理想平衡源） | grid | 理想双向补差源 · 初始 5 kW 展示 | 否 | P_grid_true_kW / P_grid_meas_kW |
| `load` | 聚合负荷 | load | 恒定 30 kW（load_step 为聚合输入阶跃） | **是**（load_step） | P_load_demand_kW / P_load_served_kW |

edges 提案（7 条；**刻意无 load→ems 边**——MG 负荷是聚合输入、EMS 按计划/孤岛平衡运行，
平衡填补按真实功率值计算（A-mg-ems-true），无测量链边；与 PV/WT「无 load→控制器边」的
不可调度声明同款结构手法，见 §1.5 注）：

| id | from→to | kind | label |
|---|---|---|---|
| `pv_unit->bus` | pv_unit→bus | power | 光伏馈入 |
| `wt_unit->bus` | wt_unit→bus | power | 风电馈入 |
| `bess->bus` | bess→bus | power | 储能馈入（放电为正） |
| `feeder->switch` | feeder→switch | power | 馈线侧连接 |
| `switch->bus` | switch→bus | power | 母线侧连接（分断时 0） |
| `bus->load` | bus→load | power | 聚合负荷需求 |
| `ems->bess` | ems→bess | signal | 调度计划 / 填补指令 |

signalCategories 提案：`power`（功率）/ `soc`（SOC 账本）/ `residual`（残差）/
`island`（孤岛面：island_state / P_shed_kW / P_dump_kW）。
faultAnchors 提案：`{load_step:'load', shading_link:'pv_unit', gust_link:'wt_unit',
island_event:'switch'}`。

### 1.2 聚合语义与源子轨配置固定面（复用声明的可执行形态）

聚合层语义：**Run 内组合复用**——simulateMG001 内部按子轨固定面构造标准子配置（FL.core
.createConfig 产物），调用既有 simulatePV001 / simulateWT001 获取源轨序列，再在**输出采样
网格（601 点）上逐点执行聚合代数**（EQ-MG-3/4）；MG 层自身无子步循环、无新 ODE。
与 I-6 的关系：scenario.js 的「场景=有序 Run 配置封闭序列，不引入新执行语义」约束的是
**场景编排面**；MG 的组合发生在**单 Run 的系统轨内部**（引擎分派新分支），其全部新语义
= 聚合代数方程集（§1.4，G2b 评审对象）——两层面不混淆，显式声明。

| 子轨 | 来源系统 | 复用面 | MG 域内固定配置 | MG 域内变化源 |
|---|---|---|---|---|
| PV | PV-001（L0） | EQ-PV-1…7 物理 + pv001_oracle 复用接入 | G0=1000、T_cell=25（φ_T=1）、无 sensor 偏置（bias≡0）、feedback_mode 透传 | pv_shading_link 幅值 ΔG ∈ [50,300] W/m² |
| WT | WT-001（L0b） | EQ-WT-1…9 物理 + wt001_oracle 复用接入 | v0=9（WT 默认）、子步 h=0.01 原样、无 pitch/gust 外故障、feedback_mode 透传 | wt_gust_link 幅值 Δv ∈ [1.0,3.0] m/s |
| BESS | FL-001 电池能量面 | **公式形式复用**（EQ-1/EQ-4/EQ-6 电气面：P=0.4·I、SOC 积分式；权威文本 = fl001_oracle.py:1-10 独立性声明的同一权威 MODEL_VALIDATION_SPEC §1.2/§1.3） | E_bat=40 kWh、SOC0=60、I = P/0.4 换算、无传感器面、无执行器限幅面、**thermal 轨不入聚合**（FL thermal_model=on 轨不进入 MG） | p_sched_kW ∈ [−8,8]（并网面）；孤岛面平衡填补（EQ-MG-4） |
| 负荷 | ——（聚合输入） | —— | load_kW=30 | load_step 幅值 ∈ [−10,+20] kW |

**固定面声明（Q7）**：MG 不暴露 G0 / v0 / 子轨故障族白名单外事件（无 FL sensor_bias 联动、
无 WT pitch_stuck 联动、无 FC 面）——联动开放须未来显式 CHG 并重推锚点面与包络（§11 Q7）。
**两模式声明**：MG 四族均为物理输入类（负荷阶跃/子轨物理事件/拓扑分断），与 feedback_mode
无关——**全五 Run 两模式逐位同解**（复算实证 d_pv=d_wt=0.00e+00 + MG 代数无测量反馈回路，
§3.4；monitor Run 不重复入 golden，§4 项 2，PV shading/WT gust 先例延用）。

### 1.3 信号提案表（18 项）

| id | label | unit | category | sourceKind | exposure 说明 | formula / 定义 |
|---|---|---|---|---|---|---|
| `island_state` | 孤岛状态 | -（无量纲） | island | MODEL_STATE | public | 0=并网 / 1=脱离（1(t≥t_start)·1(t<t_clear 或窗末)，EQ-MG-1） |
| `P_pv_kW` | 光伏子轨馈入 | kW | power | MODEL_STATE | public | PV-001 轨 P_pv,true（G0=1000 固定面复用） |
| `P_wt_kW` | 风电子轨馈入 | kW | power | MODEL_STATE | public | WT-001 轨 P_wt,true（v0=9 固定面复用） |
| `P_bess_kW` | 储能出力 | kW | power | MODEL_STATE | public | 并网 = p_sched；孤岛 = clamp(chase, −8, +8)（EQ-MG-3/4/5） |
| `P_sched_kW` | 调度计划目标 | kW | power | CONTROLLER | blind | p_sched_kW 配置值（孤岛窗内计划挂起仍显示配置值） |
| `P_bess_chase_kW` | 平衡填补目标 | kW | power | CONTROLLER | blind | 孤岛窗内 = P_load − P_pv − P_wt（钳位前）；**其余时刻 null**（事件域 null 列第二先例，I_bat_cap_A/beta_stuck_deg 同款） |
| `P_load_demand_kW` | 聚合负荷需求 | kW | power | CONFIG | blind | load_kW + ΔP·1(t≥t0)（load_step） |
| `P_load_served_kW` | 负荷实际获得功率 | kW | power | MODEL_STATE | public | P_load − P_shed（并网面 ≡ P_load） |
| `P_grid_true_kW` | 馈线真实功率 | kW | power | MODEL_STATE | public | 并网 = P_load − P_pv − P_wt − P_bess（受电为正，理想双向）；**孤岛 ≡ 0** |
| `P_grid_meas_kW` | 馈线测量功率 | kW | power | OBSERVATION | blind，noiseSigma 0.15 | P_grid,meas = P_grid,true（健康通道） |
| `P_shed_kW` | 缺口卸载功率 | kW | island | MODEL_STATE | public | max(0, chase − P_bess)（并网面 ≡ 0） |
| `P_dump_kW` | 盈余倾卸功率 | kW | island | MODEL_STATE | public | max(0, P_bess − chase)（并网面 ≡ 0；全五 golden Run ≡ 0，仅低负荷角点非零） |
| `V_bus_V` | 聚合母线电压 | V | power | MODEL_ASSUMPTION | blind，tableOnly | V_bus = 400 V（模型假设，非仿真状态） |
| `SOC_true_pct` | 真实 SOC | % | soc | MODEL_STATE | public | SOC0 − 100·∫P_bess dt/(3600·40)（FL EQ-6 形式，分段解析 EQ-MG-7） |
| `SOC_est_pct` | 估计 SOC | % | soc | OBSERVATION | blind | 同式用测量通道（全通道健康 ⇒ ≡ SOC_true） |
| `SOC_err_pp` | SOC 估计误差 | pp | soc | DERIVED | blind | SOC_est − SOC_true ≡ 0（无偏置——与 FL-001 传感器偏置致 SOC_err≠0 的教学对照） |
| `r_true_kW` | 真实功率平衡残差 | kW | residual | DERIVED | public | r_true ≡ P_pv + P_wt + P_bess + P_grid − P_served − P_dump ≡ 0（定义恒等，EQ-MG-6） |
| `r_meas_kW` | 测量一致性残差 | kW | residual | DERIVED | blind | r_meas ≡ 0（全功率测量通道健康——与 FL-001 r_meas = 0.4·b 教学对照） |

事件域 null 信号仅 `P_bess_chase_kW` 一项（孤岛窗外 null）；`island_state` 全程有值。
**单位字典缺口核查：MG 零缺口**——kW/%/pp/V 既有（schema.js:19-23 UNIT_DICT），`-`（无量纲）
已由 WT 轨入表（'m/s':'wind','°':'angle','-':'dimensionless'，schema.js:27）——
`island_state` 用 `-` 即可，UNIT_DICT/UNITS 纯零扩展（WT-G2b-03/PV C-3 增项先例不重演）。

**exposure 三值映射工作面注记（WT001 B-3 体例延用）**：MG-G2b-04 实现时须产出上表 18 信号的
exposure 三值映射核对表（sourceKind→默认 exposure 映射（DATA_CONTRACT_SPEC §1.6）× SystemDef
显式声明 × blindVisible 不独立设置纪律，逐信号落点 public/blind/blind_observable 并登记偏差；
上表 exposure 列为起草轮提案值，终值以核对表为准）。MG 全 Run 两模式逐位同解（§1.2）使
blind_observable 通道语义与 PV/WT 物理输入族同构；Arena 盲包语义依赖该核对表（§5 Arena
显式排除与此同源——入池延后至三值映射验证轮，届时须显式 CHG）。

### 1.4 方程登记（EQ-MG-1…9；全部代数，无新 ODE——G2b 评审对象）

| id | 方程 | 说明 |
|---|---|---|
| EQ-MG-1 | load(t) = load_kW + ΔP·1(t ≥ t0)（仅 load_step）；island(t) = 1(t ≥ t_start)·1(t < t_clear)（t_clear 缺省 = 窗末 60 s，仅 island_event）；子轨事件透传：ΔG/Δv 于各自 t0 生效（EQ-PV-1/EQ-WT-1 右极限 post 行语义同构） | 聚合输入面（事件感知，断点全部落在 0.1 s 网格与事件边界） |
| EQ-MG-2 | P_pv(t) = PV-001 轨输出（G0=1000 固定面）；P_wt(t) = WT-001 轨输出（v0=9 固定面）——oracle 侧 = pv001_oracle/wt001_oracle 参数化序列函数复用调用；engine 侧 = simulatePV001/simulateWT001 内部组合 | 源轨复用声明（不重写物理；oracle 复用面 = 模块导入 + RUNS 参数化入口，§4 项 1） |
| EQ-MG-3 | 并网面：P_bess = p_sched；P_grid = load − P_pv − P_wt − P_bess（受电为正，理想双向，无爬坡/额定/倒送约束）；P_served = load；P_shed = P_dump = 0 | 并网功率平衡（馈线补差——FL/PV/WT 馈线同构） |
| EQ-MG-4 | 孤岛面：P_grid ≡ 0；chase = load − P_pv − P_wt；P_bess = clamp(chase, −8, +8)；P_shed = max(0, chase − P_bess)；P_dump = max(0, P_bess − chase)；P_served = load − P_shed | 脱离主馈线的功率平衡重整（BESS 理想瞬时填补 + 钳位 + 卸载/倾卸；Q4 定案推荐——恒等按构造成立，无缓冲状态需求） |
| EQ-MG-5 | 调度面：并网 P_bess 目标 = p_sched（计划跟踪）；孤岛计划挂起、切换为平衡填补；重连恢复计划跟踪 | BESS 角色切换 = 重整教学点（§6.1） |
| EQ-MG-6 | r_true ≡ P_pv + P_wt + P_bess + P_grid − P_served − P_dump ≡ 0（定义恒等，两模式同式）；r_meas ≡ 0（全功率测量通道健康）；孤岛面恒等：ΣP_source = P_served + P_dump = load − P_shed + P_dump | 母线恒等式（任务书口径：并网 ΣP_source + P_grid = P_load、孤岛 ΣP_source = 重整后服务负荷 + 倾卸——P_load_shed 语义 = P_served，信号面以 P_shed/P_dump 显式承载） |
| EQ-MG-7 | SOC_true(t) = SOC0 − 100·∫[0,t] P_bess dt / (3600·40)（%）；SOC_est 同式用测量通道；SOC_err ≡ 0 | FL EQ-6 形式复用；**积分 = 事件感知分段解析**——P_bess 在本规格域内可证分段常值（并网 = p_sched 常值；孤岛源恒健康 ⇒ chase = load − 20 常值 ⇒ clamp 分段常值；断点 = 事件边界，§3.4 复算断言 0.00e+00），该前提为 (b) 形态的结构推论，Q1 涟漪注记：若未来 island 可与源联动组合（Q1 备选 (a)/(c)），P_bess 时变 ⇒ SOC 需数值积分 ⇒ 本节闭式性/T-A 论证须重审 |
| EQ-MG-8 | E_x = 事件感知精确积分（kW·s，÷3600 → kWh）：分段常值信号（load/served/shed/dump/bess/grid-并网段）按段解析；时变源段（E_pv/E_wt）**复用源 oracle 积分**（pv001_oracle 闭式 / wt001_oracle 子步解析 int_wt）；E_grid := E_served + E_dump − E_pv − E_wt − E_bess（恒等导出，避免对时变 P_grid 序列做数值积分） | 能量口径（PV EQ-PV-7 事件感知先例；采样网格右端点和 ≠ 解析积分的边界伪差显式排除——复算实证 load_step 单事件伪差 +1.0 kW·s，§3.4） |
| EQ-MG-9 | V_bus = 400 V（模型假设，tableOnly，非仿真状态） | 母线抽象（PV/WT 同款） |

### 1.5 assumptions 清单（提案，进 model.assumptions）

| id | text |
|---|---|
| A-mg-ideal-bus | 聚合母线 400 V 等效理想，无电压/频率动态、无功与网损；等效母线是功率平衡抽象，不是电网模型。 |
| A-mg-reuse-tracks | PV/WT 源轨物理原样复用（PV-001 L0 / WT-001 L0b，G0=1000、v0=9 固定面），MG 聚合层不修改、不包裹、不重写任何源方程；联动开放须显式 CHG。 |
| A-mg-bess-energy-face | BESS 复用 FL-001 电池能量面（P=0.4·I 换算、40 kWh、SOC 账本）：复用的是能量面公式形式，非 FL 反馈控制器面（传感器/限幅/τ 跟随面不进入聚合层）；FL thermal 轨不进入 MG。 |
| A-mg-bess-structural-limit | BESS 功率域 [−8, +8] kW 为模型结构设定（非故障、非设备辨识）；钳位为理想硬钳位（无恢复动态、无 t_clear 概念——island_event 的重连由 t_clear_s 承载）。 |
| A-mg-island-ideal-balance | 孤岛面 BESS 为理想瞬时平衡填补源（无滞后面）：恒等式按构造成立，不引入母线缓冲状态；「滞后源追逐失衡需缓冲」的反例证据 = FL-001 load_step O-13 删除记录（SCOPE_SPLIT_MEMO §5.2）。 |
| A-mg-ems-true | EMS 平衡填补按真实功率值计算（load/P_pv/P_wt 真值，无测量链、无估计通道）；全功率测量通道健康 ⇒ r_meas ≡ 0、两模式逐位同解。 |
| A-mg-const-sched | 并网面 BESS 按调度计划恒功率跟踪（p_sched_kW 无日内曲线/无 SOC 反演调度——SOC 仅账本通道，60 s 教学窗内 SOC 摆幅 ≤0.34 pp 永不绑定功率面）。 |
| A-mg-load-step-instant | 聚合负荷阶跃为瞬时阶跃（无爬坡）；并网面由馈线瞬时补差吸收（恒负荷系统同构面），孤岛面由钳位 + 卸载重整吸收——两模式恒等式按构造成立（O-13 语义差异声明，§0）。 |
| A-mg-island-abstract | 分断开关为理想通断抽象：分断即馈线功率恒为 0、重连即恢复补差；无检同期、无过渡过程、无保护逻辑——本演示为脱离主馈线的功率平衡重整演示，不代表真实电网侧动态。 |
| A-mg-l0 | MG 调度与平衡填补为行为级聚合逻辑，不是经过验证的设备控制器。 |

### 1.6 未建模物理清单（进 model.limitations + UI 可查）

1. **潮流与网络方程**（单母线聚合，无线路阻抗/潮流分布/多母线拓扑——B-4 TL-001 远期候选）；
2. **频率/电压/无功概念全平面**（含一次调频、AVR、电压稳定——GT-001 承载频率行为级面，
   MG 不重复；I-5 红线延用）；
3. **孤岛保护与重整控制逻辑**：检同期、防孤岛、低电压/频率穿越、重整后的二次调频/调压——
   均未建模（无频率/电压概念；PV001 §1.5 项 5 同款未建模清单声明，命名仅出现在
   limitations 不进入 UI 文案）；
4. **BESS 深物理**：内阻/温度面（FL thermal 轨不进入聚合）、变流器效率曲线、SOC 对功率域的
   反演绑定（SOC 仅账本——SOC0=0 手拼角点 SOC 可为负，域外声明 + MG-IMP-Q1 钳位裁定面）；
5. **源轨内部未建模面整体继承**（PV I-V 工作点/温度动态/局部遮挡；WT 尾流/湍流/气弹/停机
   ——各源规格 limitations 原样适用，MG 不新增不减轻）；
6. **计划调度面**：p_sched 无日内曲线、无 SOC 反演、无多时段优化（储能调峰教学点以
   「计划跟踪 ⇄ 孤岛填补」角色切换承载，非调度算法演示）；
7. **负荷模型**：聚合负荷为恒功率阶跃面，无 ZIP/动态负荷/负荷恢复动态；
8. **倒送域与倾卸域**：并网 P_grid < 0（倒送）为理想双向馈线合法工作区（PV/WT 同款声明）；
   孤岛盈余倾卸 P_dump 为理想倾卸元件（抽象记账项，不是能量损失——残差类文案口径）；
9. normalizeConfig 无跨参数校验（FL-001 同款先例 systems.js:325——2026-11-08 实读；WT-001
   :1338 同款），手拼配置可致 load_eff 越界或 SOC0 极低角点（负 SOC 账本值）——**钳位方案为
   实现期决策点 MG-IMP-Q1**（engine 侧钳位 or UI 联动校验，二选一须记录，PV-IMP-Q1/WT-IMP-Q1
   先例；负荷非负由参数域设计保证——load_step min −10 与 load_kW min 10 组合域内
   load_eff ≥ 0，Q6）；
10. L0 聚合行为级演示模型；非实测、非 Simulink、无实测对比（FL-001 逐字句复用，
    systems.js:323，ALLOW 覆盖实证）；定位句：本模型为多源聚合行为级并网演示（L0），
    非机组/电网动态验证（ALLOW 串「非机组/电网动态验证」）。

### 1.7 层级判定与机制定案（评审裁定点索引）

**层级判定（MG-DRAFT-Q3 推荐：聚合层 L0）**，ALINE_MODEL_DEPTH_DESIGN §1.1 判据逐条对照：

| ALINE §1.1 判据 | 本提案对应 | 满足声明 |
|---|---|---|
| L0：方程可手解、输出确定 | 聚合面 EQ-MG-3/4/5/6 全部为逐点代数（clamp/max/恒等式），无 ODE、无非线性耦合待解 | ✔ 采样网格逐点确定性可复算；复算实证全恒等 0.00e+00（§3.4） |
| L0：golden 由解析 oracle 复算 | mg001_oracle = 聚合代数 + 源轨复用调用（PV 闭式 / WT 子步解析积分复用）；MG 层自身全闭式 | ✔ §4 项 1/6（T-A 论证） |
| L0b/L1：非线性 ODE / 新物理状态变量 | **无**——MG 不新增任何状态变量；SOC 为账本积分（FL EQ-6 形式的代数复用） | ✘ 不满足 L0b/L1（如未来岛内时变填补 + 数值 SOC，另立 G2b 增补，Q1 涟漪注记） |
| 组合输出的层级归属 | 组合输出含 WT L0b 数值特征——层级标签只描述 MG 层自身方程集，各源维持既有层级，provenance 不升级（I-2） | ✔ 显式声明（§0/§6.1） |

**机制定案（本草案推荐，评审裁定后落入正文——批准轮体例沿 PV-DRAFT-Q1/WT-DRAFT-Q1）**：

- **Q1（孤岛机制形态）推荐 (b)：island_event 作为故障族**——单故障/Run 库模型零破坏
  （engine cfg.fault 单族，scenario buildRunConfig 单事件构造，scenario.js:456-471），
  故障卡片/目录/引擎分派面零新语义（I-6）；重连由 t_clear_s 承载（GT-001 actuator_fault
  t_clear 先例，scenario.js:319 守卫扩展为实现轮显式 CHG 面）。**技术性收益（决定性论据）**：
  (b) 下 island Run 的源恒健康 ⇒ chase 分段常值 ⇒ P_bess 分段常值 ⇒ SOC 分段解析（EQ-MG-7
  前提成立）⇒ **聚合 oracle 全闭式、T-A 按构造成立**。备选：(a) 事件级模式切换键
  （inertia_model/thermal_model 事件级键同构，island 可与任一族独立时刻组合——教学面最富，
  但涟漪 = cfg 新键 + validateConfig + fault-lab UI 新控件面 + 岛内时变填补 ⇒ SOC 数值化
  ⇒ oracle/tier 重设计）；(c) island_event 捆绑联动参数族（单时刻组合可达，但族语义混杂、
  且同样破坏 SOC 闭式前提）。三案涟漪对比与教学面差异全登记于 §11 Q1。
- **Q4（BESS 孤岛面语义）推荐：理想瞬时平衡填补 + 钳位卸载**——恒等按构造成立（EQ-MG-4/6），
  无缓冲状态需求；备选「一阶滞后跟随 + 母线缓冲状态 E_bus」= 第四物理栈 + 复活 O-13 缺陷
  模式（SCOPE §5.2 方案 B 的失败证据链），不推荐（§1.5 A-mg-island-ideal-balance）。
- **Q6（load_step 域）推荐：有符号域 [−10, +20] kW**——下行域使倒送角点（load_eff < ΣP_source
  ⇒ P_grid < 0）域内可达（PV/WT 倒送域声明同构）；域设计保证 load_eff ≥ 0（负荷非负域内
  成立，负负荷域外化，MG-IMP-Q1 减负）；备选正域 [5,20]（FC/GT 字面先例）——倒送角点不可达，
  教学面弱（§11 Q6）。

## 2. 故障族提案（4 族，全部封闭参数域）

### 2.1 `load_step`（family=load_step，MG 聚合负荷阶跃——与 FL O-13 删除族的语义差异显式登记）

| 字段 | 提案 |
|---|---|
| 类型/作用位置 | 聚合输入阶跃（瞬时）→ load（聚合负荷） |
| params | magnitude：负荷阶跃幅值，kW，min **−10** / max 20 / step 5 / default **+10**，precision 0；help：「聚合负荷瞬时阶跃（可升可降）：并网面由理想馈线瞬时补差/倒送吸收；MG 层负荷是聚合输入，与 FL-001 已删除的 load_step（O-13）无语义继承」 |
| defaultTime_s / timeRange | 20 / [2,55]（库口径） |
| closedLoopEffect | 并网面：load 30→40（默认 +10），P_grid 5→15 kW 瞬时（馈线补差），P_bess/SOC 不受影响（计划跟踪），r ≡ 0 维持；下行角点 load 30→20 → P_grid 5→−5 kW（倒送域，理想双向合法工作区） |
| monitorEffect | 同闭环（物理输入，两模式逐位同解——MS-5） |
| causalTemplateId | mg-load-step（§6.4） |

**O-13 语义差异声明（§0 详述）**：FL load_step 缺陷模式 = 滞后发电机 + 恒电流电池 → 失衡无
去处（最大 10 kW，7 个数量级破缺，SCOPE §5.2 复算证据）；MG load_step 的两模式恒等式均按
构造成立（馈线补差 / 钳位重整），无失衡残留。FAULT_CATALOG §8 行将载明该差异。

### 2.2 `pv_shading_link`（family=shading_link，MG→PV 子轨遮挡联动——新族名）

| 字段 | 提案 |
|---|---|
| 类型/作用位置 | 子轨物理输入联动注入 → pv_unit（PV 子轨 shading_step 透传） |
| params | magnitude：遮挡降幅，W/m²，min 50 / max 300 / step 25 / default **300**（G0 1000→700，源域原样），precision 0；help：「遮挡阶跃联动注入 PV 子轨：聚合面看光伏出力下降、馈线补差上升；源轨物理与 PV-001 完全一致」 |
| defaultTime_s / timeRange | 20 / [2,55] |
| closedLoopEffect | P_pv 10→7 kW（τ=1.0 s 一阶跟随，P_pv(20.0)=10.000000 连续、(21.0)=8.103638），P_grid 5→8 kW，r ≡ 0 维持；两模式同解 |
| monitorEffect | 同闭环（物理输入，逐位同解——复算实证 d_pv=0.00e+00，§3.4） |
| causalTemplateId | mg-pv-shading-link（§6.4） |

**族名裁定说明**：新族名 `shading_link`（不复用 PV 的 `shading_step`）——作用位置与因果
方向不同（MG 聚合层的子轨联动转发 vs PV 本地物理输入），沿 WT §2.3「gust_step 独立族名」
裁定先例；目录登记时注明与 PV-001 shading_step 的透传关系（源域原样 [50,300]）。

### 2.3 `wt_gust_link`（family=gust_link，MG→WT 子轨阵风联动——新族名）

| 字段 | 提案 |
|---|---|
| 类型/作用位置 | 子轨物理输入联动注入 → wt_unit（WT 子轨 gust_step 透传） |
| params | magnitude：阵风增幅，m/s，min 1.0 / max 3.0 / step 0.5 / default **+2.0**（v 9→11 跨额定区，源域原样），precision 1；help：「阵风阶跃联动注入 WT 子轨：默认参数跨额定区——风电出力爬升至额定封顶 15 kW，馈线补差降至零导入角点」 |
| defaultTime_s / timeRange | 20 / [2,55] |
| closedLoopEffect | P_wt 10→15.000000 kW（WT L0b 动态爬升封顶，P_wt(21.0)=10.676732/(26.0)=14.935791），P_grid 5→**0.000000 kW（零导入角点，\|·\| ≤ 1e-9 容差声明——PV 10 + WT 15 + BESS 5 = load 30 恰平）**，r ≡ 0 维持；两模式同解 |
| monitorEffect | 同闭环（物理输入，逐位同解——复算实证 d_wt=0.00e+00，§3.4） |
| causalTemplateId | mg-wt-gust-link（§6.4） |

### 2.4 `island_event`（family=island_event，脱离/重连——零参数族提案）

| 字段 | 提案 |
|---|---|
| 类型/作用位置 | 拓扑分断事件（理想通断）→ switch（主馈线分断开关） |
| params | **params: []（零参数族提案，Q2）**——脱离/重连语义由 t_start_s（脱离）与 t_clear_s（重连，缺省 = 窗末持续脱离）完整承载，无幅值语义；挂空 magnitude 为伪参数（I-2 不采）；help：「脱离主馈线：功率平衡重整演示——BESS 从计划跟踪切换为平衡填补（钳位 ±8 kW），缺口负荷卸载、盈余倾卸；重连后恢复馈线补差与计划跟踪」 |
| defaultTime_s / timeRange | 20 / [2,55]；**t_clear_s 提案域**：t_start < t_clear < 60、0.1 s 网格（GT-001 actuator_fault t_clear 域同构）；**golden 锚定 t_clear=35** |
| closedLoopEffect | 脱离（t_start）：P_grid ≡ 0、P_bess 5→8 kW（chase=10 超上限钳位）、P_shed=2 kW 持续、island_state 0→1；重连（t_clear）：P_grid→5、P_bess→5（计划恢复）、P_shed→0；r ≡ 0 全程维持（重整前后恒等式同式，EQ-MG-6） |
| monitorEffect | 同闭环（拓扑事件，两模式逐位同解） |
| causalTemplateId | mg-island-event（§6.4） |

**实现面登记**：① 零参数族为库内首例——fault.params 空目录的引擎 validateConfig /
UI 故障卡片渲染行为须核查（**MG-IMP-Q2 核查面**，不可静默）；② t_clear_s 守卫扩展：
scenario.js:319 isGtActuator 现仅放行 GT-001×actuator_fault——扩展为
`(GT-001×actuator_fault) ∨ (MG-001×island_event)`，**显式 CHG 面**（MG-G2b-03/04；
EVENT_KEYS 已含 t_clear_s、hashProjection 已投影（scenario.js:36/:421-438），既有场景哈希
零变化——缺省系统守卫拒绝语义维持）；③ island_event 产生**双事件快照**（脱离 EV + 重连
EV，pre/post 各一对）——verify_golden V-09 事件面与 golden events 编码对 gt001
actuator_clear 先例的核对列为 MG-IMP-Q2。

**教学面限制显式登记**：单故障/Run 模型下，island_event 不可与 2.2/2.3/2.1 同时注入——
「间歇性叠加改变卸载量」（如岛内阵风使 shed 2→0）不可达为单 Run 效应；教学承载 =
场景级有序 Run 对比（scenario 面既有能力）+ §11 Q1 备选 (a)/(c) 若被裁定采纳则可达
（涟漪同步登记）。

### 2.5 scope 提案

四族全部 **extension_preview**（新系统，SCOPE §8.2 治理）：scope.js `classify` 现状
（src/core/scope.js:42-83）对 systemId ≠ 'FL-001'/'FC-001' 的配置 fall-through 至
`return ok ? 'approved_p0' : 'extension_preview'`（scope.js:82）——**MG-001 全场景零改动即为
extension_preview**，SA-24 白名单（APPROVED.systemId='FL-001'，scope.js:17-30）不动，
assertApprovedP0 对 MG 配置抛 SCOPE-E01（scope.js:103-109）。系统级白名单/升正式须未来
显式 CHG（FC-001 升 approved_fc 的 CHG-20261030-12 先例；PV/WT 同位声明延用）。

## 3. 验收锚点（解析预填，数值由 §3.4 复算独立计算；oracle emit 时冻结）

默认参数：load_kW=30、p_sched_kW=+5、SOC0=60、PV（G0=1000 健康=10 kW）、WT（v0=9 健康=10 kW）、
t0=20 s、t_clear=35 s（Run I）、60 s 网格、BESS 域 [−8,+8] kW。容差提案列对标 PV001 §3 形制。
**E_pv/E_wt 为源轨复用值**（权威 = 源规格锚点/源 golden，MG 不重推源物理）。

### 3.1 场景 A：healthy（baseline，并网）／场景 B：load_step +10 @20（并网）

| 场景 | 锚点（60 s） | 值 | 容差 | 复算依据 |
|---|---|---|---|---|
| A | `P_pv(60)` / `P_wt(60)` / `P_bess(60)` | 10.000000 / 10.000000 / 5.000000 | ±0.05 kW | 源轨健康值（PV/WT 健康局锚点复用）+ EQ-MG-3 |
| A | `P_grid_true(60)` | **5.000000 kW** | ±0.05 kW | 30 − 10 − 10 − 5 |
| A | `P_served(60)` / `P_shed` / `P_dump` | 30.000000 / ≡0 / ≡0 | ±0.05 / ≡0 / ≡0 | EQ-MG-3（并网面无卸载/倾卸） |
| A | `r_true` / `r_meas` | ≡ 0 | ≤1e-12 kW | 定义恒等，复算逐点 0.00e+00 |
| A | `SOC_true(60)` | **59.7916667 %** | ±1e-4 pp | 60 − 100·(5×60)/(3600×40) = 60 − 0.2083333（分段解析） |
| A | `SOC_err` | ≡ 0 | ≤1e-9 pp | 全通道健康 |
| A | `E_pv` / `E_wt` / `E_bess` / `E_grid` / `E_served` | 0.1666667 / 0.1666667 / 0.0833333 / 0.0833333 / 0.5000000 | ±0.0005 kWh | 600/600/300/300/1800 kW·s（恒等：600+600+300+300=1800 ✓） |
| B | `P_grid(19.9)` / `(20.0)` / `(60)` | 5.000000 / **15.000000** / 15.000000 | ±0.05 kW | 事件 post 行 = 15（馈线瞬时补差，EQ-MG-3） |
| B | `P_served(60)` | **40.000000 kW** | ±0.05 kW | load 40 全服务（并网面无卸载） |
| B | `E_grid(60)` / `E_served(60)` / `E_demand(60)` | 0.1944444 / 0.6111111 / 0.6111111 | ±0.0005 kWh | (5×20+15×40)/3600；(30×20+40×40)/3600（事件感知解析——采样右端点和的 +1.0 kW·s 边界伪差显式排除，§3.4） |
| B | `SOC(60)` | **59.7916667 %** | ±1e-4 pp | P_bess 计划跟踪不受 load_step 影响（= 场景 A） |

### 3.2 场景 C：pv_shading_link −300 @20（并网）／场景 D：wt_gust_link +2 @20（并网）

| 场景 | 锚点（60 s） | 值 | 容差 | 复算依据 |
|---|---|---|---|---|
| C | `P_pv(20.0)` / `(20.1)` / `(21.0)` / `(60)` | 10.000000 / 9.714512 / 8.103638 / 7.000000 | ±0.001 kW | 状态连续（20.0）+ τ=1.0 s 精确指数 7+3·e^(−(t−20))（源轨 EQ-PV-4 闭式复用；PV001 §3.2 C 行同源） |
| C | `P_grid(21.0)` / `(26.0)` / `(60)` | 6.896362 / 7.992564 / **8.000000** | ±0.05 kW | 15 − P_pv（EQ-MG-3） |
| C | `E_pv(60)` | **0.1341667 kWh**（= 483/3600） | ±0.0005 kWh | **源 golden 复用锚点：逐位等于 pv001_v1 shading run E_pv_true**（MS-3） |
| C | `E_grid(60)` | **0.1158333 kWh**（= 417/3600） | ±0.0005 kWh | E_grid = E_served + E_dump − E_pv − E_wt − E_bess = (1800+0−483−600−300)/3600（EQ-MG-8 恒等导出） |
| C | `SOC(60)` | 59.7916667 % | ±1e-4 pp | 计划跟踪不受子轨事件影响 |
| D | `P_wt(20.0)` / `(21.0)` / `(26.0)` / `(60)` | 10.000000 / 10.676732 / 14.935791 / **15.000000** | ±0.05 kW | 源轨 L0b 动态（WT001 §3.3 C 行锚点复用——无闭式，oracle 复用子步积分） |
| D | `P_grid(60)` | **0.000000 kW（零导入角点）** | \|·\| ≤ 1e-9 kW | 30 − 10 − 15 − 5 = 0；复算 \|P_grid(60)\| = 9.1e-14（P_wt 封顶支路 15.0 精确 + 指数尾差 ≤1e-13——非刀锋，声明角点） |
| D | `E_wt(60)` | **0.218959 kWh** | ±0.0005 kWh | **源 golden 复用锚点：逐位等于 wt001_v1 gust run E_wt_true**（MS-3） |
| D | `E_grid(60)` | **0.031041 kWh**（= 111.7476/3600） | ±0.0005 kWh | (1800−600−788.2524−300)/3600（E_wt 复用值代入 EQ-MG-8；容差继承 WT E_wt ±0.0005） |
| C/D | 闭环 vs 仅监测 | **逐位同解** | 全序列最大差 0.00e+00 | 物理输入（复算实证 d_pv=d_wt=0.00e+00，§3.4）；monitor Run 不重复入 golden（§4） |

### 3.3 场景 E：island_event @20（t_clear=35）——脱离/重连三相

| 锚点 | 值 | 容差 | 复算依据 |
|---|---|---|---|
| `island_state` @ 19.9 / 20.0 / 34.9 / 35.0 | 0 / **1** / 1 / **0** | 精确值 | 事件行 post 语义（t=20.0 起脱离、t=35.0 起重连恢复） |
| `P_grid` @ 19.9 / 20.0 / 34.9 / 35.0 | 5.000000 / **0.000000** / 0.000000 / 5.000000 | ±0.05 kW | 孤岛窗 P_grid ≡ 0（EQ-MG-4）；重连恢复 |
| `P_bess` @ 19.9 / 20.0 / 34.9 / 35.0 | 5.000000 / **8.000000** / 8.000000 / 5.000000 | ±0.05 kW | 计划→填补切换：chase = 30−20 = 10 > 8 → 钳位 8（EQ-MG-4/5）；重连恢复计划 |
| `P_bess_chase` @ 20.0（/ 岛窗外） | **10.000000**（/ null） | ±0.05 / 精确 null | 填补目标 = load − P_pv − P_wt（钳位前显式暴露） |
| `P_shed` @ 20.0 / 岛窗内 | **2.000000**（持续） | ±0.05 kW | chase 10 − 钳位 8 = 2（缺口卸载持续） |
| `P_served(21.5)` | 28.000000 | ±0.05 kW | 30 − 2 |
| `r_true` / `r_meas` | ≡ 0（全程） | ≤1e-12 kW | 重整前后恒等式同式（EQ-MG-6），复算逐点 0.00e+00 |
| `SOC(60)` | **59.7604167 %** | ±1e-4 pp | 60 − 100·(5×20+8×15+5×25)/(3600×40)（三段解析） |
| `E_bess` / `E_grid` / `E_served` / `E_shed` / `E_demand` | 0.0958333 / 0.0625000 / 0.4916667 / 0.0083333 / 0.5000000 | ±0.0005 kWh | (100+120+125)/(225)/(600+420+750)/(2×15)/(1800) kW·s；恒等：E_pv+E_wt+E_bess+E_grid = 600+600+345+225 = 1770 = E_served ✓；E_served+E_shed = 1800 = E_demand ✓ |
| `P_dump` | ≡ 0（全程） | ≡0 | 默认岛窗 chase=10 > −8（倾卸仅低负荷角点，§3.5） |

### 3.4 恒等式、健康局与复算记录

- 健康局（H）：P_pv ≡ 10.000000、P_wt ≡ 10.000000、P_bess ≡ 5.000000、P_grid ≡ 5.000000、
  P_served ≡ 30、P_shed = P_dump ≡ 0、island_state ≡ 0、SOC 线性 60→59.7916667、
  SOC_err ≡ 0、r_true = r_meas ≡ 0（复算 601 点全序列）。
- 判别性恒等：r_true ≡ 0、r_meas ≡ 0（全部场景逐点精确 0.00e+00——与 FL-001 的
  r_meas = 0.4·b 教学对照，PV/WT 同款延用）；二次恒等：E_served + E_shed ≡ E_demand
  （五 Run 复算最大差 1.9e-15 kWh）、E_pv + E_wt + E_bess + E_grid ≡ E_served + E_dump
  （按构造）。
- **分段常值断言（EQ-MG-7 前提）**：全五 Run 相位内 P_bess 逐点最大漂移 0.00e+00
  （并网 = 计划常值；孤岛 = clamp(常值 chase)——(b) 形态结构推论，Q1 涟漪注记）。
- **能量积分口径实证**：采样网格右端点和与事件感知解析积分的边界伪差被显式排除——
  load_step 单事件 P_grid 伪差 +1.0 kW·s（[19.9,20.0] 区间取 post 值 15 而非真值 5）、
  时变序列右端和偏差 ~0.15 kW·s（Run S 的 E_grid：右端和 0.1158743 vs 解析 0.1158333）——
  EQ-MG-8 采事件感知精确积分（FL EQ-6/PV EQ-PV-7 先例），E_grid 由恒等导出。
- **复算记录**：锚点数值由临时脚本（Python stdlib，`python -I`）独立计算——①源轨复用
  交叉核对（P_pv/E_pv、P_wt/E_wt 直接调用冻结 oracle pv001_oracle/wt001_oracle 参数化入口，
  与 pv001_v1/wt001_v1 golden 标量逐位一致：E_pv=0.1341667、E_wt=0.218959）；②两模式逐位
  对照（源轨物理输入族 monitor vs closed_loop 全序列最大差 0.00e+00）；③五 Run 全序列
  601 点聚合代数（恒等式/钳位/卸载/倾卸/SOC 三段解析）；④分段常值断言（0.00e+00）；
  ⑤能量积分口径对照（右端和 vs 解析）；⑥包络扫描（§3.5）。脚本已按任务纪律删除，
  本节数值即其输出摘录；评审可按 §1.4 方程独立重推（源轨值引源规格 §3 锚点，
  MG 代数闭式显式列出）。
- **复算范围声明（诚实边界）**：MG 层代数与源轨复用面已复算；**engine 侧 simulateMG001
  组合实现与 mg001_oracle 的逐位等价性属 MG-G2b-03/04 验证面**（本草案不预写引擎数值——
  golden emit 时冻结；T-A 依据 = 同一源轨复用 + 同一聚合代数，非引擎实测）。

### 3.5 包络与角点声明（UI 全域，注册域内复算）

| 项 | 声明 | 依据 |
|---|---|---|
| 源轨域（MG 域内） | P_pv ∈ [7, 10] kW（shading 域 [50,300]）；P_wt ∈ [10, 15] kW（gust 域 [1,3]，v≥v_rated=10.302 后封顶 15） | 源规格包络 + MG 固定面 |
| load_eff 域 | **[0, 65] kW**（load0 ∈ [10,45] ∧ step ∈ [−10,20] 组合域内恒非负——Q6 域设计） | 域设计声明 |
| P_grid 域（并网面） | **[−33, +56] kW**（下端 = load 0 ∧ PV 10 ∧ WT 15 ∧ BESS +8 倒送角点；上端 = load 65 ∧ PV 7 ∧ WT 10 ∧ BESS −8）；倒送为理想双向合法工作区，不建模倒送约束（PV/WT 同款） | 复算包络扫描 |
| 孤岛面域 | chase ∈ [−20, +45] kW（load_eff 0..65、源恒健康）；**P_shed ∈ [0, 37] kW**（上端 = load 65 角点）、**P_dump ∈ [0, 12] kW**（上端 = load 0 角点）——默认岛窗 shed = 2 kW | 复算包络扫描（孤岛 Run 源恒健康——单故障/Run 模型结构推论） |
| SOC 摆幅 | 60 s 窗内最大下摆 **0.3333 pp**（并网 sched +8 全窗）——SOC 永不绑定功率面（A-mg-const-sched）；SOC0 ∈ [0,100] 全域 ⇒ SOC(60) ∈ [−0.34, 99.9] pp（SOC0=0 角点负账本值 = 域外声明，MG-IMP-Q1） | 复算 |
| 零导入角点 | Run D 的 P_grid(60) ≈ 0（\|·\| ≤ 1e-9）——PV+WT+BESS 恰平负荷，合法角点非缺陷 | 复算（9.1e-14） |
| 手拼配置 | normalizeConfig 无跨参数校验（FL-001 同款先例），手拼可致 SOC0 极低负账本值（无物理意义）——**钳位方案为实现期决策点 MG-IMP-Q1**（load_eff 负值已由域设计排除，Q6） | scope/engine 现状核实 |

## 4. golden 计划（独立 oracle MG001_ORACLE（复用接入）；本波零改动，emit 入批准后轮）

| # | 项 | 内容 |
|---|---|---|
| 1 | 独立 oracle | 新文件 `tools/oracle/mg001_oracle.py`（**本波与批准前不创建**——V090 §0 本波禁区不动 tools/oracle/**；MG-G2b-03 执行）。**复用接入声明（本草案核心架构决定）**：① `import pv001_oracle` + `import wt001_oracle`——源轨物理唯一权威 = 既有冻结 oracle 模块（参数化入口：pv001_oracle._pv_stepped_series/pv_energy_integrals、wt001_oracle._simulate，2026-11-08 实读核实均存在），**MG 不重写任何源方程**（不重算各源物理）；② BESS 能量面 3 行内联（P=0.4·I、SOC 积分式、钳位代数）——权威文本 = FL-001 已批规格电气面（MODEL_VALIDATION_SPEC §1.2/§1.3），显式声明非 fl001_oracle 导入（其反馈/传感器面不属聚合面）；③ 出生即 oracle_base 接入（无 V-03 历史字节负担，gt001_l1/wt001 先例）：`import oracle_base` + `resolve_run_spec` + `write_golden_with_sidecar`（LF 钉死）+ `approval_block/apply_approval`（三字段非 null 方可落盘）+ `SERIES_IDS` 模块常量（含 "t" 列）。golden 由本 oracle 只读生成、engine 只读比对（G0-DEC-16） |
| 2 | Run 数提案 | **5 Run**：`healthy`（baseline 并网）/ `load_step_closed_loop`（+10 @20 并网）/ `pv_shading_closed_loop`（−300 @20 并网）/ `wt_gust_closed_loop`（+2 @20 并网）/ `island_reconnect`（island_event @20、t_clear=35）。**monitor Run 不重复入 golden**：MG 四族全为物理输入、两模式逐位同解（复算实证 + MS-5，PV shading/WT gust monitor-物理输入不重复先例延用） |
| 3 | self_check 提案 | MS-1 网格（601 点、t[i]=i·dt、单调）；MS-2 恒等式面（r_true/r_meas 逐点 ≡ 0 ≤1e-12；E_pv+E_wt+E_bess+E_grid ≡ E_served+E_dump ≤1e-9 kWh；E_served+E_shed ≡ E_demand ≤1e-9）；MS-3 **复用一致性（emit 硬条件）**：golden 锚定源配置下 E_pv/E_wt/源序列与 pv001_v1/wt001_v1 golden 标量逐位核对（≤1e-12）——源 oracle 文件变更 → 源 golden 重出 → 本项失配 → emit/verify 拒绝（R-6 传递耦合的结构守卫）；MS-4 健康局不变量（P_pv≡10/P_wt≡10/P_bess≡5/P_grid≡5/SOC 线性/shed=dump≡0）；MS-5 两模式逐位等价（全五 Run closed_loop vs monitor ≤1e-15）；MS-6 孤岛相位不变量（岛窗 P_grid≡0、P_bess=clamp(chase)、shed/dump 非负、重连恢复计划值）；MS-7 锚点全表复算（§3.1–3.3）+ **分段常值断言**（P_bess 相位内漂移 ≡0——EQ-MG-7 前提）；MS-8 无 NaN/Inf + 包络抽查（P_grid ∈ [−33,56]、shed ∈ [0,37]、dump ∈ [0,12]）+ **分段常值前提失效守卫**（若未来形态变更致 P_bess 时变，MS-7 断言 fail → emit 拒绝写盘——WT WS-8 域扫描硬条件同款纪律） |
| 4 | SERIES_IDS | **['t'] + §1.3 表 18 信号 = 19 项**（golden series 惯例含 t 列，golden-compare.js 读 goldenRun.series.t 做网格校验；唯一事件域 null 列 `P_bess_chase_kW` 按 I_bat_cap_A/beta_stuck_deg 入 golden 前可空列处理先例，ORACLE_INTERFACE_D2 §5.2 F-4 行） |
| 5 | 元数据（schema v2） | `golden_schema_version="v2"`（新 golden 默认 v2，ORACLE_INTERFACE_D2 §3.5）；`golden_id="mg001_v1"`；`model_id="MG-001"`；`model_version="1.0.0"`（三段式）；`method_id="mg001_aggregate_analytic"`（聚合全闭式 + 源轨复用——EQ-MG-7 分段常值前提下的闭式口径；若 Q1 裁定 (a)/(c) 使 SOC 数值化，method_id/tier 随批准轮重审）；`engine_baseline=null`；`backend=null`；`generated_by` 一段式；units 复用既有字典（kW/%/pp/V/'-'——零新增）；**approval 三字段非 null 方可落盘**——首签引本规格批准 CHG（批准轮 CHG 号，MG-G2b-03 emit 时填） |
| 6 | 容差 tier | **T-A**（聚合层全闭式 + 源轨复用同权——engine 与 oracle 对源物理走**同一既证等价对**（engine simulatePV001↔pv001_oracle / engine simulateWT001↔wt001_oracle 已由 pv001_v1/wt001_v1 T-A golden 证明 ≤1e-15），MG 代数双侧同一算式）。gate 块提案：`{tier:"T-A", E_kWh:1e-9, P_kW_rtol:1e-12, P_kW_atol:1e-15, SOC_pp:1e-9, r_true_kW:1e-12, t_s:1e-9}`。**死键规避（WT B-2 先例）**：无 I_A 两键（MG 无 I_/bias 序列——标量单位面全为 kWh/pp，T-A metric fallback 支路不可达）；`r_true_kW` 键由 metrics.max_abs_r_true_kW 消费（非死键）；`SOC_pp` 键必须存在（T-A series_limit 对 SOC_*_pct 系列走 `tol["SOC_pp"]` 支路——PV gate 无 SOC 系列故无此键，MG 有 SOC 系列故必须带，scripts/verify_golden.py:214-215 T-A 支路——2026-11-08 实读核实）。量级预案非终值，终值 emit 冻结；若跨实现散差超限 → 降 T-B 并附 convergence 块（双向预案登记） |
| 7 | verify_golden | **注册面为硬编码表**（scripts/verify_golden.py:67 MODELS dict；PV001 §4 项 7 勘正先例维持）：MG-G2b-03 新增 `import mg001_oracle` + `MODELS["mg001"]` 注册行——提案：`i_true="P_grid_true_kW"` / `i_meas="P_grid_meas_kW"`、`event_tol="P_kW_atol"`（PV/WT 同款，verify_golden.py:135-141 行注）；scalars 提案 11 键：E_pv_kWh / E_wt_kWh / E_bess_kWh / E_grid_kWh / E_load_served_kWh / E_shed_kWh / E_dump_kWh / E_load_demand_kWh / SOC_true_end_pct / SOC_est_end_pct / SOC_err_end_pp。注册行追加不改参数化逻辑；T-A 路径零改动。**同时登记相邻文案修复面**：verify_golden 头注/用法注与 scenario.js:152「可用系统」文案补 WT-001（现缺）+ 增 MG-001（§头部残留登记） |
| 8 | 预期失效面 | 新增 `data/golden/mg001_v1.json`(+`.sha256`)；**既有 8 golden 字节零变更**（V090 §0 冻结延续至批准后轮；MG 新增不触既有文件）；verify_golden --all 路径覆盖 mg001；tests/registry.test.js 哈希为 per-Run config，不因新增系统破坏（PV/WT 同款核对）；**scenario schema v1 零新键**（island_event 为族非键；t_clear_s 既有键——守卫扩展不改 EVENT_KEYS/hashProjection，既有场景哈希零变化）；UI 枚举点（home.js 系统卡/compare/scenario/teaching 页）为 MG-G2b-04 实现面；FAULT_CATALOG 新增 §8 节（MG-G2b-03 面：四族行 + O-13 语义差异注 + 零参数族/t_clear 扩展注） |

## 5. scope 与治理登记

- 系统级：MG-001 = **extension_preview**（新系统，§2.5；PV-001/WT-001/GT-001 同位先例，
  FAULT_CATALOG §3/§6/§7）。
- 族级：四族均 extension_preview，无白名单挂载；SA-24（scope.js APPROVED）零改动；
  classify 零改动（fall-through 现状即正确语义，scope.js:82）。
- Arena 盲测池：**PV-001 C-1 勘正 + WT §5 显式排除先例适用**——MG-001 注册进 systems.js 后
  默认进入 Arena 系统清单（src/ui/pages/arena.js:99 `ARENA_EXCLUDED = ['PV-001', 'WT-001']`
  过滤——2026-11-08 实读核实）；`familyPool` 按目录派生
  （src/core/arena-protocol.js:180-186，gust_link/shading_link/island_event 不在 FAMILY_ORDER
  全局序但 familyPool 直读目录——WT gust_step 同款注记）。**显式排除**：ARENA_EXCLUDED 增
  `'MG-001'` + 守卫注释，列为 **MG-G2b-04 显式工作面**（PV/WT 同款裁定）——Arena 盲包语义
  依赖 blind_observable 三值映射验证（§1.3 注记），MG 入池须显式 CHG 并同步通道面裁定，
  此前过滤。
- 验收路径：P0 验收（assertApprovedP0）、approved_fc 分支、golden 比对三路径对 MG-001
  均关闭（scope.js:94-111 抛 SCOPE-E01）；本规格批准不自动打开任何验收路径——
  打开须 schema v2 approval 首签 + verify_golden 注册 + 显式 CHG（§4 项 5/7）。
- v1.0 冻结清单落点（docs/V1_FACES.md，V090 DEC-6 T6 同波交付物）：MG-001 批准与否影响
  「SystemDef schema 实例五/六系统」「scenario schema v1（island_event 族 + t_clear 守卫
  扩展）」两面的冻结归类——T6 口径登记为本草案与 T6 的对齐点（若 MG 批准晚于 v1.0，
  两面按「演进中」登记，MG 实现入 v1.0.x）。

## 6. 教学定位与 UI 措辞提案

### 6.1 层级标签与互补性

- 层级标签：`L0 · 多源聚合行为级演示（G2b 草案）`（批准徽章随批准轮追加，PV/WT 先例）；
  层级语义显式：聚合层自身 L0，**各源维持既有层级**（PV L0 / WT L0b / BESS 能量面 L0），
  组合输出 provenance 不升级（I-2；UI 系统卡/假设清单可查）。
- 与单源系统互补性话术（系统卡/首页）：「PV-001 与 WT-001 演示单一不可调度源接入理想馈线；
  MG-001 演示多个源在同一母线上的功率平衡——并网时馈线补差、脱离主馈线后由储能与负荷
  卸载重整平衡」。互补点四则：① 单源平衡 vs 多源聚合（恒等式从两源式扩为四源式 + 拓扑
  开关）；② 馈线唯一平衡者 vs 平衡者切换（并网馈线补差 ⇄ 孤岛 BESS 填补——角色切换 =
  重整教学点）；③ 间歇性叠加（PV 下行遮挡 + WT 上行阵风在同一母线余额上叠加，零导入
  角点 = 间歇性恰好覆盖的判读练习）；④ 储能调峰（计划跟踪 ⇄ 平衡填补 + 钳位卸载——
  V06_ROADMAP B-3 行「多源协调 + 间歇性 + 储能」三教学点的本系统落点）。
- 残差判读对照链（r_meas 教学）：FL r_meas = 0.4·b（测量通道故障暴露）→ PV/WT r_meas ≡ 0
  （全功率通道健康、特征转移到 d_pv/d_wt 一致性残差）→ MG r_meas ≡ 0 且**聚合面无新测量
  通道**（平衡特征由 P_shed/P_dump/island_state 拓扑信号承载）——三段式对照进教学卡。

### 6.2 文案提案（实现期入 systems.js，逐句禁词预检见 §6.3）

| 字段 | 提案文案 |
|---|---|
| tagline | 「在 20 秒分断主馈线，看母线功率平衡如何重整：储能从计划跟踪切换为平衡填补，缺口负荷卸载、重连后恢复。多源聚合 L0 演示，不含潮流/保护/频率电压模型。」 |
| summary | 「光伏与风电子轨、储能（电池能量面）与聚合负荷接入单母线：并网时理想馈线补差，脱离主馈线后储能按平衡填补并受 ±8 kW 钳位——功率平衡重整演示。各源物理复用既有系统轨，聚合层零新增动态方程。」 |
| feeder 组件 description | 「理想平衡功率馈线，瞬时吸收/补齐母线剩余功率；初始 5 kW 仅用于展示，不代表真实电网侧动态。」 |
| switch 组件 description | 「主馈线分断开关（理想通断抽象）：分断后母线脱离馈线，功率平衡由储能与负荷卸载重整；无检同期与保护逻辑。」 |
| ems 组件 description | 「MG 调度（行为级）：并网按计划跟踪储能出力，脱离后切换为平衡填补；不是经过验证的设备控制器。」 |
| bess 组件 description | 「储能（电池能量面复用 FL-001：40 kWh / 400 V）：并网按调度计划恒功率跟踪，孤岛按平衡填补并受功率域钳位；SOC 仅账本通道。」 |
| limitations 追加 | 「L0 行为级演示模型；非实测、非 Simulink、无实测对比。」（FL-001 逐字句复用）+「非机组/电网动态验证」（ALLOW 串） |

### 6.3 三禁词/全库 33 模式自查表 + 孤岛表述红线专项自查表（实现期 node tools/copy-guard.mjs 终检）

copy-guard 33 模式为全库禁词、扫 src/**（tools/copy-guard.mjs:15 SCOPES=['src']），对 MG
文案同库适用（PV001 §6.3 口径）。本草案在 FaultLab-evaluation/**（不扫描），实现轮文案
迁入 src/** 前按先例预检：

| 提案串 | 高危子串核查 | 结论 |
|---|---|---|
| §6.2 全部 7 串 | 无「机组动态验证/电网稳定验证/一次调频验证/惯量验证/实测/已验证/校准/能量损失/检出率/误报率/诊断算法/置信度/逐位一致/第三方认证/防篡改/公证/sealed/工业级/工业真实/已证明/验证通过/…」命中；「不是经过验证的设备控制器」为 FLEXT §1.2 F5 先例句式（「经过验证」不含禁词「已验证」子串）；「非实测、非 Simulink、无实测对比」三项均 ALLOW 串且该句已在库（systems.js:323——2026-11-08 实读）基线 PASS | 0 命中 |
| A-mg-*（§1.4/§1.5 全部 10 条） | 「理想钳位（无恢复动态…）」「账本通道」「不是能量损失」类措辞逐条核对：「不是能量损失」为 ALLOW 串（copy-guard.mjs:33——2026-11-08 实读；残差/倾卸类文案一律此句式，G0-DEC-13/UI_COPY_GUARDRAILS 口径） | 0 命中 |
| 残差类文案（r_meas/SOC_err/P_dump 定义） | 一律用「是测量通道误差/一致性的代数恒等/理想记账项，**不是能量损失**」句式（ALLOW 串） | 0 命中 |

**I-5 孤岛表述红线专项自查表（V090 DEC-1 裁定口径，实现期逐条走查 + copy-guard 终检双保险）**：

| # | 红线 | 自查结论 |
|---|---|---|
| 1 | 孤岛教学点只能表述为「脱离主馈线的功率平衡重整演示」 | §0/§6.2 tagline/summary/switch description 全部采用该句式或其直接展开（「脱离主馈线：功率平衡重整演示」） |
| 2 | 禁电网保护/稳定/验证类语义 | 全部文案无「保护」「稳定」「穿越」「防孤岛」「检同期」类词（「保护」仅出现在 §1.6 未建模清单与 copy-guard 禁词引用，不进入 src/** 用户可见文案——PV001 §1.5 项 5 limitations 命名先例边界维持：limitations 属 model 元数据面、走 UI 可查面板，实现轮终检确认） |
| 3 | 禁「孤岛检测」教学语义（检测=诊断类措辞邻接） | 系统卡/卡片/教学卡用「脱离/重连」「分断/恢复」动词面；「island_state」信号 label 为「孤岛状态」（状态量非检测量）；无「检测/诊断/识别」措辞 |
| 4 | 「并网/馈线/母线」不与「稳定/验证」邻接组合 | §6.2 全表逐句核对 0 邻接；PV001 §6.3 I-5 专项同款口径 |
| 5 | 「不代表真实电网侧动态」显式声明 | feeder/switch description 显式声明（PV001 grid description 同款句式） |

### 6.4 因果模板提案（实现期入 MG001.causalTemplates 同层）

- `mg-load-step`（闭环链 n1…n5）：n1 聚合负荷阶跃 30→40 kW（config）→ n2 馈线瞬时补差
  5→15 kW（observation，EQ-MG-3）→ n3 储能出力与 SOC 不变（observation，计划跟踪）→
  n4 全服务维持 P_served=40（observation）→ n5 恒等式 r ≡ 0（kind='algebraic_identity'：
  平衡重整由馈线承担——与 FL O-13 删除族的失衡对照为负例教学面，不实现 FL 侧旧族）。
- `mg-pv-shading-link`（n1…n5）：n1 遮挡联动注入（config，ΔG=−300）→ n2 PV 子轨出力
  10→7 kW（τ=1.0 s 跟随，observation）→ n3 馈线补差 5→8 kW（observation）→ n4 间歇性
  下行叠加（mechanism：聚合余额 = ΣP_source − load 的间歇项变动）→ n5 r ≡ 0
  （algebraic_identity）。
- `mg-wt-gust-link`（n1…n6）：n1 阵风联动注入（config，Δv=+2）→ n2 WT 子轨爬升封顶
  10→15 kW（observation，源轨 L0b 动态）→ n3 馈线补差 5→0 kW——**零导入角点**
  （observation）→ n4 间歇性上行叠加恰平（mechanism）→ n5 倒送预判（load 下行角点
  P_grid < 0，理想双向）→ n6 r ≡ 0（algebraic_identity）。
- `mg-island-event`（闭环链 n1…n7 + 重连 n8…n10）：n1 分断注入（config）→ n2 馈线功率
  →0（observation，EQ-MG-4）→ n3 EMS 角色切换：计划挂起、平衡填补 chase=10 kW
  （mechanism，EQ-MG-4/5）→ n4 钳位 8 kW（mechanism，A-mg-bess-structural-limit）→
  n5 缺口卸载 P_shed=2 kW（observation）→ n6 SOC 放电加速（observation，账本通道）→
  n7 恒等式重整后维持 r ≡ 0（algebraic_identity：ΣP_source = P_served——重整教学点）→
  n8 重连恢复（t_clear，config）→ n9 馈线 0→5、储能回计划 8→5、卸载→0（observation）→
  n10 r ≡ 0（恒等式跨相位同式）。monitorNodes：与闭环同解（物理/拓扑事件，两模式逐位同）。

## 7. G2b 进入条件五项自查表（SCOPE_SPLIT_MEMO §8.2）

| # | 进入条件 | 状态 |
|---|---|---|
| ① | 触发项清单全部关闭 | **适用即闭合**：MG-001 为新系统，无 GT/FC 式遗留缺陷清单（SCOPE §2 处置表不含 MG）；触发项 = V06_ROADMAP §2 B-3 行 + V090 §1 DEC-1（本草案即交付物）。无未关闭遗留项 |
| ② | 独立 golden | **计划就绪（未产出）**：golden 后置系 V090 §0「golden 零变更、B-3 只出草案」授权的对 ② 字面顺序的**显式偏离**（PV001 C-5 / WT001 ② 同款登记）；§4 独立 MG001_ORACLE（复用接入）计划就绪（源物理权威 = 既有冻结 oracle 模块，MS-1…8 自检含复用一致性 emit 硬条件），5 Run，schema v2，T-A，emit 于批准后轮 MG-G2b-03 执行，落地并 verify 通过后本项闭合 |
| ③ | UI 措辞与未建模物理清单 | **就绪**：§1.6 未建模物理 10 项 + §6.2 文案提案 + §6.3 双自查表（33 模式预检 0 命中 + I-5 孤岛红线专项 5 条） |
| ④ | 用户书面批准 | **未闭合（本草案即待批状态）**：待双路评审 + 用户书面批准（批准与实现随用户裁定：批准早则 v1.0 收敛前实现，否则 v1.0.x 首项——V090 DEC-1）；PV-G2b-02/WT-G2b-02 用户批准链先例 |
| ⑤ | CHG 登记 | **部分闭合**：起草授权 CHG-20261108-01（V090_WAVE_DESIGN）已登记；批准 CHG 待批准轮登记（④ 随批准闭合） |

## 8. 实现排期提案（MG-G2b-01…04）

> 与 PV001 §8/WT001 §8 同构的顺序说明：MG-001 为全新系统，且 V090 §0 本波禁区不动
> tools/oracle/** 与 data/golden/**——故双路评审（MG-G2b-02，批准轮）先行；oracle/golden
> 与实现同为批准后轮（v1.0 收敛前或 v1.0.x，随用户裁定）。

| 步骤 | 内容 | 规模 | 波次 |
|---|---|---|---|
| MG-G2b-01 | 聚合语义/EQ-MG 方程集/源轨复用固定面/锚点预填 + 独立复算（§1/§2/§3；源轨调用冻结 oracle 复用 + 聚合代数闭式 + 分段常值断言 + 包络扫描；临时脚本已删除）+ 本草案 v0.1 | M | **已完成**（本波，2026-11-08） |
| MG-G2b-02 | 双路独立评审（物理 A：EQ-MG 自洽与量纲/恒等式构造性/分段常值前提/锚点复算/包络角点/L0 判据对照/复用面正确性（源轨零改动核实）；治理 B：五项条件/scope 落地路径/O-13 语义差异/33 模式 + I-5 孤岛红线双自查/golden 治理与 verify_golden 注册面/t_clear 守卫扩展涟漪/不动清单/步数账/Q1…Q7 裁定）+ **用户书面批准（DEC-1）** + 批准 CHG（规格更名 APPROVED、条件修订进正文、Q 点定案落正文）+ 条件处置追记（PV001 §11 体例） | M | **待用户裁定**（批准时点决定实现波次：v1.0 收敛前 或 v1.0.x 首项） |
| MG-G2b-03 | oracle 编写（mg001_oracle.py：pv001/wt001 oracle 复用导入 + BESS 能量面内联 + oracle_base 出生接入 + MS-1…8 含 MS-3 复用一致性 emit 硬条件）+ mg001_v1 emit（5 Run，schema v2，T-A，approval 首签）+ verify_golden MODELS["mg001"] 注册行 + **scenario.js t_clear 守卫扩展（MG-001×island_event）+ :152 可用系统文案补 WT-001/增 MG-001**（显式 CHG 面）+ FAULT_CATALOG 新增 §8 节（四族行 + O-13 语义差异注 + 零参数族注）+ schema 测试适配（MG 零单位缺口核查确认） | M | 批准后轮（依赖 02 批准） |
| MG-G2b-04 | 实现：systems.js MG001 SystemDef（§1 全量：18 信号含 exposure/sourceKind、A-mg-* 10 条、limitations 10 项、EQ-MG-1…9、initial 三键面）+ **exposure 三值映射核对表（18 信号逐信号落点）** + engine simulateMG001 组合轨（**engine.js:2131-2140 分派链现 FL→FC→PV→WT→else GT001 兜底，必须显式插 MG 分支于 else 之前**——R-5 守卫；内部 = 子轨固定面构造标准子配置 + simulatePV001/simulateWT001 复用调用 + 601 点聚合代数；三/四/五系统既有分支零触碰）+ 因果模板四件（§6.4）+ UI 接线（home/compare/scenario/teaching 页系统卡与指标组 + 零参数族卡片核查 MG-IMP-Q2）+ tests/engine-mg.test.js（五 Run 锚点断言 + 两模式逐位等价断言 + 恒等式断言 + R-5 守卫断言）+ **Arena ARENA_EXCLUDED 增 'MG-001' + 守卫注释**（§5）+ scope 零改动核对 + normalizeConfig 钳位裁定（MG-IMP-Q1）+ **步数账申报（I-7）**：31→33（verify_golden mg001 挂第 32 步、engine-mg.test.js 挂第 33 步，均 core 层，单波 +2——WT 波 +2 显式申报先例 CHG-20261107-01；预算 32→34 显式申报） | L | 批准后轮（依赖 03） |

## 9. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R-1 | 聚合层滑向第四物理栈（组合面偷偷加动态/包裹源轨） | §1.2 复用声明可执行化（子轨固定面表 + EQ-MG-2 复用方程）+ MS-3 复用一致性 emit 硬条件（源序列逐位 = 源 golden）+ engine-mg 测试锚点断言（源通道值 = 源系统锚点） |
| R-2 | I-5 红线：孤岛文案滑向电网保护/稳定/检测语义 | §6.3 第二张专项自查表（5 条）+ 实现期 copy-guard 终检（run-g2 步兜底）+ limitations 命名边界维持（PV001 §1.5 项 5 先例） |
| R-3 | MG load_step 被误读为 FL O-13 删除族复活 | §0/§2.1 显式语义差异声明（聚合输入 vs FL 内部电气面 + 失衡机制对照）+ FAULT_CATALOG §8 行载明 + scenario.js DELETED_FAMILIES 仅 FL-001 键（零改动核实） |
| R-4 | 「新系统零改动 verify_golden」误读导致 MG-G2b-03 漏注册 | §4 项 7 勘正：注册面硬编码（verify_golden.py:67），注册行列显式工作面（PV R-3 同款） |
| R-5 | engine 分派 else 兜底吞掉 MG-001（静默走 GT 物理） | §8 MG-G2b-04 点名 engine.js:2131-2140 显式分支 + tests/engine-mg.test.js 锚点断言（GT 轨数值与 MG 锚点不同，断言即守卫，PV R-4/WT R-7 同款） |
| R-6 | oracle 复用导入的传递耦合：pv001/wt001 oracle 文件变更 → mg001 数值漂移而 V-03（只校验 mg001_oracle.py 自身 sha）不报警 | MS-3 复用一致性自检 = emit/verify 双面硬条件（源 golden 标量逐位核对，源侧变更即失配拒绝）+ 源 golden 字节冻结纪律延续 + V-03 覆盖面局限显式登记（§4 项 1/3） |
| R-7 | 零参数族（island_event）在引擎/卡片/场景三面的行为未验证 | MG-IMP-Q2 显式核查面（validateConfig 空参数、fault 卡片渲染、双事件快照 V-09 面对.gt001 actuator_clear 先例核对），不可静默 |
| R-8 | SOC 分段常值前提被未来形态变更破坏（Q1 备选 (a)/(c) 致岛内时变） | EQ-MG-7 前提显式登记 + MS-7 断言 fail → emit 拒绝（WS-8 同款硬条件）+ Q1 涟漪注记（method_id/tier 随批准轮重审） |
| R-9 | 手拼配置越域（SOC0 极低负账本值） | §3.5 域声明 + MG-IMP-Q1 钳位裁定（不静默）；load_eff 负值已由 Q6 域设计排除 |
| R-10 | 步数账膨胀（I-7）：MG 测试/golden 步入 run-g2 | §8 MG-G2b-04 归口：31→33 +2 步显式申报、预算 32→34（WT 波 +2 先例）；本波零接线（V090 §0） |
| R-11 | t_clear_s 守卫扩展波及既有场景语义 | 扩展面显式 CHG + EVENT_KEYS/hashProjection 零变化论证（t_clear_s 既有键）+ scenario.test.js 全量回归（既有负例路径零变化断言） |

## 10. 评审记录（**预留表——待双路评审回填**）

| 路 | 范围 | verdict | 关键结论 |
|---|---|---|---|
| 评审人 A（物理/数值） | EQ-MG-1…9 自洽与量纲、恒等式构造性核查、分段常值前提证明、锚点独立复算（源轨复用面 + 聚合代数）、包络角点、L0 判据对照、复用面正确性（源轨零改动核实） | 待 | — |
| 评审人 B（治理/口径/回归面） | §7 五项进入条件、scope 落地路径、O-13 语义差异、33 模式 + I-5 孤岛红线双自查、golden 治理与 verify_golden 注册面、t_clear 守卫扩展涟漪、不动清单、Q1…Q7 裁定点、步数账、预期失效面 | 待 | — |
| 用户批准（DEC-1） | 批准与实现排期（v1.0 收敛前 或 v1.0.x 首项） | 待 | 本表为用户裁定输入 |

## 11. 决策点汇总（评审裁定点；批准轮定案后落正文——PV-DRAFT-Q1/WT-DRAFT-Q1 体例）

| # | 决策 | 推荐 | 备选 |
|---|---|---|---|
| MG-DRAFT-Q1 | 孤岛机制形态 | **(b) island_event 作为故障族**（t_start=脱离 / t_clear=重连；单故障/Run 零破坏 + 故障卡片/目录/引擎分派零新语义 + **聚合 oracle 全闭式、T-A 按构造**（岛内源恒健康 ⇒ chase 分段常值 ⇒ SOC 分段解析））；「间歇性叠加改变卸载量」以场景级 Run 对比承载 | (a) 事件级模式切换键（inertia_model/thermal_model 先例同构；教学面最富——独立时刻组合可达；涟漪 = cfg 新键 + validateConfig + fault-lab UI 新控件 + 岛内时变 ⇒ SOC 数值化 ⇒ oracle/tier 重设计）；(c) island_event 捆绑联动参数族（单时刻组合可达；族语义混杂 + 同样破坏 SOC 闭式前提）——均登记涟漪未采 |
| MG-DRAFT-Q2 | island_event 参数形态 | **零参数族（params: []）**——脱离/重连语义由 t_start_s/t_clear_s 完整承载，无幅值语义；挂空 magnitude 为伪参数（I-2 不采）；库内首例，MG-IMP-Q2 三面核查 | 挂空 magnitude（默认值 0、无效应）——数据不诚实，不推荐 |
| MG-DRAFT-Q3 | 系统层级标签 | **聚合层 L0 · 多源聚合行为级演示**（ALINE §1.1 对照 §1.7：聚合面全代数可手解、无新 ODE、golden 解析复算；各源维持既有层级、provenance 不升级） | L0b（无非线性 ODE，判据不满足）；L1（无新物理状态变量，判据不满足）——均未采纳 |
| MG-DRAFT-Q4 | BESS 孤岛面语义 | **理想瞬时平衡填补 + 钳位卸载**（恒等按构造成立、无缓冲状态；「滞后填补」会复活 O-13 失衡模式——SCOPE §5.2 证据链） | 一阶滞后填补 + 母线缓冲状态 E_bus（第四物理栈 + O-13 缺陷模式复活）——不推荐 |
| MG-DRAFT-Q5 | BESS 调度面配置暴露 | **initial 增 p_sched_kW ∈ [−8,8]（默认 +5）**——储能调峰教学点可玩（计划面充/放电可调） | 固定 +5 kW（调峰面不可玩，教学定位弱）——不推荐 |
| MG-DRAFT-Q6 | load_step 参数域 | **有符号域 [−10, +20] kW**——倒送角点域内可达 + load_eff ≥ 0 由域设计保证（负负荷域外化，MG-IMP-Q1 减负） | 正域 [5,20]（FC/GT 字面先例）——倒送角点不可达；[−15,20]——负负荷角点需钳位裁定，域内出现无物理意义值——均次优 |
| MG-DRAFT-Q7 | 源子轨配置固定面 | **G0/v0/子轨故障面固定（PV G0=1000、WT v0=9、无 sensor/actuator 联动）**——锚点面/包络面/复算面最小，联动开放须未来显式 CHG | 暴露 G0/v0 联动或 FL sensor_bias 联动——MG initial 键面膨胀 + 包络翻倍 + 复算面重推，首版不采 |
| MG-IMP-Q1 | 手拼配置钳位 + 步数账细节 | **保持实现轮裁定**（不预裁）：engine 侧钳位 or UI 联动校验二选一须记录（PV/WT-IMP-Q1 先例）；新断言优先并入现有步 | — |
| MG-IMP-Q2 | 零参数族 + t_clear 守卫扩展 + 双事件快照核查 | **保持实现轮裁定**（不预裁）：validateConfig 空参数行为、fault 卡片渲染、V-09 双快照对 gt001 actuator_clear 先例核对——三面核查须记录 | — |

---

**文件结束**。MG001_G2B_SPEC_DRAFT v0.1（2026-11-08，B-3 规格起草人起草，CHG-20261108-01 授权链）。
**状态 `DRAFT`**：待双路独立评审（MG-G2b-02）+ 用户书面批准（V090 DEC-1——批准与实现随用户裁定：
批准早则 v1.0 收敛前实现，否则 v1.0.x 首项）。本草案零代码/golden/oracle 触碰（V090 §0 不动清单；
锚点数值为复算预填，§3.4/§3.5，临时脚本已按纪律删除），终值以 mg001_oracle emit 冻结为准；
本规格批准（若下达）不自动打开任何验收路径（§5）。
