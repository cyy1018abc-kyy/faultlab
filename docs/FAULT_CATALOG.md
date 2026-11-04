# FAULT_CATALOG — 故障族目录

> **性质**：全量故障族登记目录（REFERENCE_LANDING_PLAN_v051 §2 R-1，CHG-20261104-01 授权；
> 随 A-2 评审包提交，DEC-R1）。表格化字段借鉴 TEP 故障目录格式（仅格式，数值/时间尺度不迁移，
> 见 §0 声明）。
> **事实源**：`src/core/systems.js`（faults/model 定义）＋ `src/core/engine.js`（实现）＋
> `FaultLab-evaluation/DECISIONS/DECISIONS.md`（授权记录）。若本目录与代码/DECISIONS 冲突，
> 以代码快照与 DECISIONS 为准并登记 CHG。
> **冻结时点**：2026-11-04（A-2/A-3 评审包提交时点）；后续状态变化记入 §5 勘误表。
> **记录**：实现 Agent，2026-11-04。

---

## 0. 时间尺度与定位声明（必读）

- 本目录所有数值为 **FaultLab 教学尺度**：采样 0.1 s、仿真窗 60 s、故障注入默认 t=20 s。
  TEP 等外部基准的分钟级采样/小时级仿真/中段注入惯例**不适用、不引用、不换算**；
- 定位：合成演示（I-5）。检出/定位均为教学游戏；本目录只登记**注入侧规格**，
  不含检出率/误报类评测口径（后者属 P1 隔离的 METRICS_P1 草案）；
- 每族「授权状态」回答 SCOPE_SPLIT_MEMO 的范围问题：该族属于 approved_p0 /
  approved_fc / extension_preview / 未评审冻结 / 已删除。

---

## 1. FL-001 电池储能（L0，scope=approved_p0）

| fault id | 家族 | 类型 | 作用位置 | 幅值参数 | 默认时刻 | 授权状态 | golden | 因果模板 |
|---|---|---|---|---|---|---|---|---|
| `I_bat_sensor_bias` | sensor_drift | 测量阶跃偏置 | sensor（电流传感器） | +2…30 A，默认 +10 A | t=20 s（域 [2,55]） | **approved_p0**（P0 冻结参数，G0-DEC-04） | fl001_v1（4 Run：healthy + closed_loop_fault + monitor_only + actuator_closed_loop，2026-11-04 重出） | sensor-drift-feedback |
| `load_step`（原 load_step_10kW） | load_step | 功率阶跃 | load | （曾 +5…20 kW） | — | **已删除**（O-13，CHG-20261030-06；归档 `NEXT/evidence/g2b/load_step-removed-contract-text.md`） | — | — |
| `converter_current_limit` | actuator_fault | 执行器限幅（比例钳位） | converter（双向 DC/DC） | I_cap = I_ref × magnitude%，20…85%，默认 55%（→13.75 A） | t=20 s（域 [2,55]） | **G2b 已批准（CHG-20261104-03）→ 实现已落地（2026-11-04，FLEXT-G2b-01/02/04）**；系统 scope 维持 approved_p0；族级白名单已按 FLEXT §4 显式 CHG 面扩展（scope.js `APPROVED.families` 增 actuator_fault，锚定 55% @20.0 s → classify=approved_p0，非锚定参数仍 extension_preview） | fl001_v1（4 Run，2026-11-04 重出，含 actuator_closed_loop；approval CHG-20261104-07） | actuator-limit |

**实现事实（A-3 评审输入；2026-11-04 实现落地已补齐）**：引擎 `simulateFL001`（engine.js:549–619）——健康/传感器轨
一阶闭环 τ=1.5 s 跟踪 I_ref=25 A；actuator 轨 target = min(controlTarget, I_cap)、
**τ=0.4 s**（engine.js:610–611）；I_bat_cap_A 信号自 t_start 起有效、其余场景 null；
无 t_clear 清除支持（GT 专属）。systems.js 登记现状（FLEXT_G2B_SPEC_APPROVED §1.2）：
assumption `A-l0` 已修订为双轨 τ 口径（健康/传感器轨 1.5 s、执行器限幅轨 0.4 s）、
`A-fl-clamp`（理想钳位 min 语义、无恢复动态、无保护动作、无 t_clear）已登记；
EQ-A（限幅一般式 I_ref=(P_load−20)/0.4）与 EQ-B（双轨 τ）已登记；I_ref_A formula
已一般式化；limitations 增退化域（load0 ≤ 20 钳位 no-op）与 normalizeConfig 不钳位
load_kW（手拼配置可破 ±25 kW）声明。

## 2. FC-001 燃料电池（L0，scope=approved_fc）

| fault id | 家族 | 类型 | 作用位置 | 幅值参数 | 默认时刻 | 授权状态 | golden | 因果模板 |
|---|---|---|---|---|---|---|---|---|
| `I_fc_sensor_bias` | sensor_drift | 测量阶跃偏置 | sensor（电堆电流传感器） | +2…30 A，默认 +10 A | t=20 s（域 [2,55]） | **approved_fc**（V3-04，CHG-20261030-12） | fc001_v1（5 Run：healthy + closed_loop_fault + monitor_only + load_step_closed_loop + actuator_closed_loop，2026-11-04 重出） | fc-sensor-drift |
| `load_step_10kW` | load_step | 功率阶跃 | load | +5…20 kW，默认 +10 kW | t=20 s（域 [2,55]） | **G2b 已批准（CHG-20261104-02）→ 实现已落地（2026-11-04，FC-G2b-02/04）**；系统 scope 维持 approved_fc；FC 族条件已扩为 none/sensor_drift/load_step/actuator_fault（FCEXT §5，scope 路落地），锚定条件（fc.pem.l0/1.1.0、30 kW/60%、无噪声）classify=approved_fc | fc001_v1（5 Run，2026-11-04 重出，含 load_step_closed_loop；approval CHG-20261104-06） | fc-load-step |
| `valve_stuck` | actuator_fault | 执行器卡涩（比例钳位） | valve（氢气供给阀） | I_fc,cap = I_fc_base × magnitude%（I_fc_base=(P_load−10)/0.4；默认 55% → 27.5 A），20…85% | t=20 s（域 [2,55]） | **G2b 已批准（CHG-20261104-02）→ 实现已落地（2026-11-04，FC-G2b-02/04，同上）** | fc001_v1（5 Run，2026-11-04 重出，含 actuator_closed_loop；approval CHG-20261104-06） | fc-valve-stuck |

**实现事实（A-2 评审输入；2026-11-04 实现落地已补齐）**：引擎 `simulateFC001`（engine.js:711–804）——
I_fc_ref 基线 = (P_load − 10)/0.4 = 50 A（P_bat_ref=10 kW 恒偏移）；**load_step 轨
I_fc_ref 经功率分配器一阶跟随 (demand − 10)/0.4、τ_ref=2.5 s（engine.js:781），电堆再以
τ_fc=1.2 s 跟随 I_fc_ref**（级联两段，非草案 v1 所述「I_fc_ref 阶跃」——已按级联定案，
FCEXT_G2B_SPEC_APPROVED §1.1/EQ-6）；
actuator 轨 target = min(I_fc_ref, I_fc_cap)、**τ=1.5 s（engine.js:788，区别于 sensor/load 的 1.2 s）**；
钳位式（无恢复动态，A-ideal-limiter 已登记）；无 t_clear。
systems.js 登记现状（FCEXT_G2B_SPEC_APPROVED §1.2/§1.4）：assumption `A-fc-dispatcher`
（分配器 τ_ref=2.5 s 一阶跟随，非阶跃设定值）与 EQ-6 已登记；I_fc_ref_A formula 已一般式化
（(P_load − 10)/0.4）；load_step closedLoopEffect 已改级联措辞；limitations 增包络越界域
声明（load_step 幅值 > 15 kW 越界、actuator 开度 < 25% 或 load0 > 43.33 kW 越界、极端角点
电堆无功率上限建模）。
**分派路径**：`fc001PlantCapable`（engine.js:636–638）使 none/sensor_drift 轨走
`src/core/plants/fc001.js` 数值子步路径（I-11 S2 移植），load_step/actuator 走内联路径——
扩展轮新 Run 走内联路径，存量 Run 走 plant 路径（口径一致性由 oracle 对照兜底）。

## 3. GT-001 燃气涡轮（L0b，scope=extension_preview）

| fault id | 家族 | 类型 | 作用位置 | 幅值参数 | 默认时刻 | 授权状态 | golden | 因果模板 |
|---|---|---|---|---|---|---|---|---|
| `speed_sensor_bias` | sensor_drift | 测量阶跃偏置（等效频率） | speed_sensor（转速传感器） | +0.05…1.0 Hz，默认 +0.3 Hz | t=20 s（域 [2,55]） | **extension_preview**（GT G2b 已批准，`GT001_G2B_SPEC_APPROVED.md`） | gt001_v1/v2（6 Run） | gt-sensor-drift |
| `load_step_10kW` | load_step | 功率阶跃 | load | +5…20 kW，默认 +10 kW | t=20 s（域 [2,55]） | **extension_preview**（同上） | gt001_v1/v2（同上） | gt-load-step |
| `fuel_valve_stuck` | actuator_fault | 执行器卡涩（比例钳位） | valve（燃料阀） | P_gen,cap = 40 kW × magnitude%，20…85%，默认 50%（→20 kW） | t=20 s（域 [2,55]） | **extension_preview**（同上） | gt001_v1/v2（含 actuator_clear t_clear=35） | gt-valve-stuck |

**实现事实**：swing 双轨默认（CHG-20261102-01，cfg.inertia_model=swing；linear 遗留轨逐位保留）；
执行器死区边界：magnitude ≥62.5% 时钳位不生效（GT001_G2B_SPEC 限制项）；
t_clear 清除支持已实现（actuator_clear 场景）。

## 4. scope 映射表（逐族回答 SCOPE_SPLIT_MEMO）

| 故障族 | SCOPE 依据 | 归属 | 白名单/守卫挂载 |
|---|---|---|---|
| FL sensor_drift | §2 处置表「保留为唯一 P0 故障」（G0-DEC-04/B15） | approved_p0 | SA-24 白名单含 FL-001 sensor_drift |
| FL load_step | §5 处置「删除」（O-13） | 已删除 | classify 拒绝；因果模板下线 |
| FL actuator_fault | §2 处置表「不追认、冻结」（B12/B11）→ G2b 解冻（2026-11-04） | G2b 已批准并实现落地（CHG-20261104-03，2026-11-04） | scope.js 白名单扩展（FLEXT §4 显式 CHG 面①）：锚定场景（55% @20.0 s）classify=approved_p0、非锚定参数 extension_preview；assertApprovedP0 同步接受白名单内 actuator 场景；Arena 族池含 actuator 系现状追认（FLEXT §4） |
| FC sensor_drift | §4 修复清单关闭 + G2b-lite（V3-04） | approved_fc | FC-001 分支前置返回（classify） |
| FC load_step | §4 条目 6「扩展故障族未评审→冻结」→ G2b 解冻并实现落地（2026-11-04） | G2b 已批准并实现落地（CHG-20261104-02） | FC 族条件扩为 none/sensor_drift/load_step/actuator_fault（FCEXT §5）：锚定条件 classify=approved_fc，白名单外仍 extension_preview |
| FC actuator_fault | 同上 | G2b 已批准并实现落地（同上） | 同上 |
| GT sensor_drift / load_step / actuator_fault | §3.3 恢复条件清单 9 项全闭（GT G2b） | extension_preview | GT001_G2B_SPEC_APPROVED + golden gt001_v2 |
| PV `G_sensor_bias` / `shading_step` | §8.2 新系统 G2b（PV001_G2B_SPEC_APPROVED，CHG-20261104-10 批准链） | extension_preview | PV001_G2B_SPEC_APPROVED + golden pv001_v1；SA-24 不动（scope.js 对 PV-001 全场景 fall-through 返回 extension_preview 即正确语义，classify/assertApprovedP0 零改动） |

## 5. 状态勘误表（冻结时点后的授权状态变化登记于此）

| 日期 | 故障族 | 状态变化 | 依据 |
|---|---|---|---|
| 2026-11-04 | FC-001 load_step_10kW / valve_stuck | 未评审冻结 → **G2b 已批准**（实现待 FC-G2b-02/04，v0.6.0 队列） | FCEXT_G2B_SPEC_APPROVED v1.1（CHG-20261104-02） |
| 2026-11-04 | FL-001 converter_current_limit | 未评审冻结 → **G2b 已批准**（实现待 FLEXT-G2b-01/02/04，v0.6.0 队列） | FLEXT_G2B_SPEC_APPROVED v1.1（CHG-20261104-03） |
| 2026-11-04 | FL-001 converter_current_limit | G2b 已批准 → **实现已落地**（FLEXT-G2b-01/02/04：A-fl-clamp 登记 + A-l0 双轨 τ 修订、EQ-A/EQ-B 登记、I_ref_A formula 一般式化、limitations 退化域与手拼配置声明、checks.js 前置窗 null 文案订正；golden fl001_v1 4 Run 重出，approval CHG-20261104-07；系统 scope 维持 approved_p0、族级白名单按 FLEXT §4 显式 CHG 扩展——锚定场景 classify=approved_p0） | FLEXT_G2B_SPEC_APPROVED v1.1 §1.2/§3/§4 + V060_WAVE_DESIGN（CHG-20261104-05） |
| 2026-11-04 | FC-001 load_step_10kW / valve_stuck | G2b 已批准 → **实现已落地**（FC-G2b-02/04：A-fc-dispatcher + EQ-6 登记、I_fc_ref_A formula 一般式化、closedLoopEffect 级联措辞、limitations 包络越界域声明；golden fc001_v1 5 Run 重出（method_version analytic_flux.2、model_version 1.1.0），approval CHG-20261104-06；系统 scope 维持 approved_fc、FC 族条件扩为四族——锚定条件 classify=approved_fc） | FCEXT_G2B_SPEC_APPROVED v1.1 §1.2/§1.4/§3/§5 + V060_WAVE_DESIGN（CHG-20261104-05） |
| 2026-11-04 | PV-001 `G_sensor_bias` / `shading_step` | **新系统登记（新增 §6 节）→ extension_preview**（PV G2b 批准 CHG-20261104-10；oracle `tools/oracle/pv001_oracle.py` + golden pv001_v1 4 Run 首签（schema v2、method pv001_analytic、gate T-A，approval=CHG-20261104-10 批准链）+ verify_golden 注册行落地，PV-G2b-03；引擎 PV 轨/systems.js 由 PV-G2b-04 同波接入） | PV001_G2B_SPEC_APPROVED v1.0 §2/§4 + V070_WAVE_DESIGN DEC-1/DEC-3（CHG-20261104-10） |

## 6. PV-001 光伏逆变器（L0，scope=extension_preview）

> 新增节（2026-11-04，PV-G2b-03，V070_WAVE_DESIGN T2）。规格权威文本 =
> `NEXT/PV001_G2B_SPEC_APPROVED.md` v1.0（CHG-20261104-10 批准链，PV-DRAFT-Q1/Q2 定案
> 已落正文）。时间尺度沿用 §0（采样 0.1 s、仿真窗 60 s、默认注入 t=20 s、601 点网格）。
> PV-001 为**不可调度电源**（无 load→MPPT 信号边、无储能/无 SOC 键），负载恒定 30 kW、
> 无 load_step 族（A-pv-const-load）；测量冗余特征由一致性残差 d_pv 承载
> （r_meas ≡ 0，与 FL-001 的 r_meas = 0.4·b 教学对照）。

| fault id | 家族 | 类型 | 作用位置 | 幅值参数 | 默认时刻 | 授权状态 | golden | 因果模板 |
|---|---|---|---|---|---|---|---|---|
| `G_sensor_bias` | sensor_drift | 测量阶跃偏置（辐照度） | sensor（辐照度传感器） | +20…300 W/m²，step 10，默认 +100 W/m² | t=20 s（域 [2,55]） | **extension_preview**（PV G2b 已批准，`PV001_G2B_SPEC_APPROVED.md`） | pv001_v1（4 Run：healthy + closed_loop_fault + monitor_only + shading_closed_loop；schema v2、approval CHG-20261104-10 批准链首签） | pv-sensor-drift |
| `shading_step` | shading_step | 物理输入阶跃（有效辐照度全平面均匀骤降） | pv_array（非阵列局部遮挡） | 50…300 W/m²，step 25，默认 300 W/m²（G0 1000→700） | t=20 s（域 [2,55]） | **extension_preview**（同上） | pv001_v1（同上；shading 仅监测轨与闭环逐位同解（物理输入与控制模式无关，PS-5 实证 0 差），不重复入 golden） | pv-shading-step |

**实现事实（PV-G2b-03，2026-11-04 本波落地；引擎轨见下）**：独立 oracle
`tools/oracle/pv001_oracle.py`（方程唯一权威 = 规格 §1.3 EQ-PV-1…7；不 import src/**、
不与 FL/FC/GT oracle 共享公式常量；fo_step 与 engine.js:443-450 foStep 逐字同构、更新序
冻结，分段常值目标 → 段长一次闭式调用，双口径交叉差 ≤8.9e-15 kW / ≤2.7e-12 kW·s；
自检 PS-1…PS-7）；golden pv001_v1（schema v2：golden_schema_version="v2"、
model_version="1.0.0"、method_id="pv001_analytic"、engine_baseline/backend=null、
generated_by 一段式、approval 三字段非 null；gate T-A = E_kWh 1e-9 / P_kW
rtol 1e-12 atol 1e-15 / d_pv_atol 1e-9 / r_true_kW 1e-12 / t_s 1e-9；SERIES_IDS =
t + §1.2 全表 17 信号 = 18 项，无事件域 null 列）；verify_golden 注册行已追加
（scalars：E_pv_true/E_pv_est/E_pv_err/E_grid/E_load_kWh；i_true/i_meas =
P_pv_true_kW/P_pv_meas_kW；event_tol=P_kW_atol——verify_golden 参数化逻辑零改动）。
**引擎/systems.js**：simulatePV001 新轨 + systems.js PV001 SystemDef + UI 接线为
PV-G2b-04 显式工作面（engine.js 分派链 engine.js:1421-1423 现 else→GT001 兜底，
须显式插 PV 分支），本波 v0.7 内落地。
**scope 现状**：系统级与族级均 extension_preview——scope.js `classify` 对 systemId ≠
'FL-001' 配置 fall-through 返回 extension_preview（scope.js:82 现状即正确语义，零改动）；
assertApprovedP0 对 PV 配置抛 SCOPE-E01（验收路径关闭，规格 §5）。



---

**文件结束**。FAULT_CATALOG v1.2（2026-11-04：v1.1 实现落地更新见 §5；新增 §6 PV-001 节
（PV-G2b-03，CHG-20261104-10 批准链，系统级/族级 scope=extension_preview）；冻结时点 =
A-2/A-3 评审包提交时）。
维护规则：族增删/参数域变更/授权状态变化 → 先更本目录 §5 勘误表并登记 CHG，再动 systems.js。
