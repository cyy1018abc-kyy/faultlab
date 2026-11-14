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

**thermal 轨注记（FLTH-G2b-03，2026-11-08 落地；`FL001_THERMAL_G2B_SPEC_APPROVED.md` v1.0，CHG-20261107-01 批准链）**：
FL-001 增 `thermal_model: "off"|"on"` 配置开关（默认 **off**——off 轨 = 上表 L0 物理面 +
fl001_v1 golden 零变化，本注记不改变上表任何故障族行）。on 域内电池新增单节点集总热容
温度状态 T_bat（EQ-FLTH-4：C_bat·dT_bat/dt = P_loss − h·(T_bat − T_amb)，T_bat(0)=T_amb=298.15 K
冷启动）与焦耳热损耗 P_loss = I_true²·R_int(T_bat)（EQ-FLTH-2/3，R_int(T)=R0·(1+α·(T−298.15))），
P_gen 定义式扩展为 P_load − P_bat + P_loss（EQ-FLTH-5，守恒面 (a) Q1 定案）、r_true/r_meas
定义恒等扩展含 −P_loss 项（EQ-FLTH-6，r_meas 教学锚点 0.4·b 保持）、E_loss 子步梯形账本
（EQ-FLTH-8，Q4 定案）、检查式 E_source + E_bat ≡ E_load + E_loss（EQ-FLTH-9，checks.js
thermal on 分支）——方程集 **EQ-FLTH-1…9**（故障族注入面与电气面 EQ-FLTH-1 原样，thermal
on 不回写电气面）。on 轨 golden = **fl001_v2**（4 Run 全部 thermal_model=on，镜像 fl001_v1
全集；schema v2、method_id=fl001_thermal_rk4_dt0.01、gate tier **T-B**、supersedes=fl001_v1
（off 轨字节冻结留档）、model_version 1.1.0、units 增 T:K；oracle
`tools/oracle/fl001_l1_oracle.py` 出生即 oracle_base 接入；verify_golden 注册行
`fl001_l1` 已追加、默认（无参）运行扩为 fl001 + fl001_l1 双 golden 顺序验证——V080
DEC-6 步①并入口径）。系统 scope 维持 **approved_p0**（thermal 轨为模型面扩展、非新故障族；
默认 off ⇒ P0/盲包语义零变化）。

**capacity 轨注记（FLCAP-G2b-03/04，2026-11-14 落地；`FL001_CAPACITY_G2B_SPEC_APPROVED.md` v1.0，CHG-20261114-01 批准链）**：
FL-001 增 `capacity_model: "off"|"on"` 配置开关（默认 **off**——off 轨与 thermal on 无
capacity 轨 = 上表两族既有物理面 + fl001_v1/fl001_v2 golden 零变化，本注记不改变上表任何
故障族行）。**组合前置与三元封闭路由**：capacity_model=on 前置 thermal_model=on——
(thermal_model, capacity_model) → golden 三元分派 (off,·)→fl001_v1 / (on,off)→fl001_v2 /
(on,on)→fl001_v3 / **(off,on)=非法组合结构化拒绝（不静默钳位）**（engine validate +
scenario 解析双落点守卫，Q11 定案）。on_cap 域内新增 R_int 温度二次项
（EQ-FLTH-10：R_int(T)=R0·(1+α·θ+β·θ²)，β=5×10⁻⁷ 1/K² 教学整定值）、SOC_true 分母改
时变可用容量 E_cap(T_bat)=η_cap(T_bat)·E_nom（EQ-FLTH-11，η_cap(T)=max(η_floor,
1−k_cap·max(0,T−T_cap0))，η_floor=0.5/k_cap=0.004 1/K/T_cap0=313.15 K；**≡ EQ-FLTH-7
capacity_model=on 域内修订——「SOC 定义不动」（V072 DEC-2）裁定重开采纳（仅 on 域生效），
域外 EQ-FLTH-7 原式逐字不动；SOC_est 维持铭牌容量测量记账口径，测量链/控制面零升级**）
与稳态二次代数方程数值稳定小根 θ₋（EQ-FLTH-12，闭式保留 + 稳定性条件 h > I²R0(α+2βθ)）——
方程集 **EQ-FLTH-10…12**（故障族注入面与电气面 EQ-FLTH-1 原样；healthy 局 T_bat <
T_cap0 ⇒ E_cap ≡ 40 kWh 精确 ⇒ SOC 面 fl001_v2 healthy 逐位同；SOC_err 为测量链偏差 +
容量折算双因——容量因子非零仅现于高温段，模型已知结构项、非测量故障）。on_cap 轨
golden = **fl001_v3**（4 Run 全部 thermal_model=on + capacity_model=on，镜像 fl001_v2
全集；schema v2、model_version 1.1.0 维持仅登记、method_id=`fl001_capacity_rk4_dt0.01`、
gate tier **T-B**、supersedes=fl001_v2（off 轨字节冻结留档，存档场次继续引用 v2）；
oracle `tools/oracle/fl001_cap_oracle.py` 出生即 oracle_base 接入；verify_golden 注册行
`fl001_cap` 已追加、默认（无参）运行扩为 fl001 + fl001_l1 + fc001_l1 + fl001_cap 四
golden——V080 DEC-6 步①并入口径沿袭）。场景面 **B-1(a) 显式键条件式**（偏离
thermal/inertia 先例——沿 FC electrochem Q9 定案同构）：`capacity_model` 仅在场景输入
显式提供时写入归一化事件与 scenarioHash（缺省全链 absent，缺省轨由引擎 normalizeConfig
盖章层承载 ⇒ 既有 FL 场景 scenarioHash 零变化）；cfg 值不进 scenarioView 投影/哈希
（B-3(a)，已知局限：capacity on/off 两轨 config_hash 同值——轨区分由 run_hash/序列内容
承载，不静默）。新信号 **E_cap_kWh**（可用容量（温度折算），kWh 既有单位零新增）带
**onTrackOnly** 标记（仅 on_cap 轨建列；off 轨与 thermal on 无 capacity 轨结构性缺席不建列
⇒ run_hash signals 面零变化；全非盲显不设 blindVisible——盲包语义零变化；run.signals
目录 18→19；η_cap 不出信号——Q10 定案最小集）。系统 scope 维持 **approved_p0**
（capacity 轨为**物理深度轨、非新故障族**——上表两族定义/参数域/授权状态/族白名单零变化，
本注记 = 族面零变化声明；fl001_v3 验收 = T-B 门禁，off 轨 acceptance.keyValues 冻结锚点
专用分域、不作 on_cap 轨通过判据——轨区分由 golden_id 承载）；默认 off ⇒ P0/盲包语义
零变化。UI 变体（规格 §1.6 冻结文案，CHG-20261114-01 批准链）：on_cap 轨层级
「L1 · 单节点热-容量折算模型（数值仿真级）」、定位句「教学尺度容量-内阻二阶效应示意
（L1 扩展），非机组/电网动态验证」；scenario 页 capacity_model 三态钉选编辑器
（缺省态不写键 + 组合守卫 UI 禁用态——thermal 未钉 on 时「钉 on」不可选，拒绝句式与
场景层对齐）。

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

**electrochem 轨注记（FCECH-G2b-03/04，2026-11-13 落地；`FC001_ELECTROCHEM_G2B_SPEC_APPROVED.md` v1.0，CHG-20261113-01 批准链）**：
FC-001 增 `electrochem_model: "off"|"on"` 配置开关（默认 **off**——off 轨 = 上表三族 L0 物理面 +
fc001_v1 golden 零变化，本注记不改变上表任何故障族行）。on 域内电堆新增单节点集总热容温度
状态 T_st（EQ-FCEC-3：C_st·dT_st/dt = P_loss_W − h_st·(T_st − T_amb)，T_st(0)=T_amb=298.15 K
冷启动）、V-I 极化链三损失项端电压 V_stack（EQ-FCEC-1，V_stack 为电堆集总等效端电压——
A-fcec-polarization）与热损失记账 P_loss_W = (E0 − V_stack)·I（EQ-FCEC-4，W 记账——A-3 定案；
**热损失是模型记账项，不是能量损失**）；on 域功率换算 P_fc,true = V_stack·I/1000
（EQ-FCEC-2，替换 EQ-3 前半 A-const-v 电堆半边——EQ-3 off 域逐字保留）、r_meas 定义恒等扩展
含恒压口径偏差项（EQ-FCEC-7，Q5/A-1 定案：口径偏差项在参考工作点 (I=50 A, T_st(0)) 处为零、
偏离工作点显非零——模型已知结构项、非测量故障）——方程集 **EQ-FCEC-1…7**（故障族注入面与
测量链/控制面零升级——EQ-1/2/5/6 原样，功率分配器 EQ-6 原样，A-fcec-dispatch 分域登记）。
on 轨 golden = **fc001_v2**（5 Run 全部 electrochem_model=on，镜像 fc001_v1 全集；schema v2、
model_version 1.1.0、method_id=`fc001_l1_polarization_rk4_dt0.01`、gate tier **T-B**、
supersedes=fc001_v1（off 轨字节冻结留档）；oracle `tools/oracle/fc001_l1_oracle.py` 出生即
oracle_base 接入；verify_golden 注册行 `fc001_l1` 已追加、默认（无参）运行扩为 fl001 +
fl001_l1 + fc001_l1 三 golden——V080 DEC-6 步①并入口径沿袭）。场景面 **B-1(a) 显式键条件式**
（偏离 thermal/inertia 先例——Q9 定案）：`electrochem_model` 仅在场景输入显式提供时写入
归一化事件与 scenarioHash（缺省全链 absent，缺省轨由引擎 normalizeConfig 盖章层承载 ⇒
既有 FC 场景 scenarioHash 零变化）；cfg 值不进 scenarioView 投影/哈希（B-3(a)，已知局限：
FC on/off 两轨 config_hash 同值——轨区分由 run_hash/序列内容承载，不静默）。三新信号
T_st_K / V_stack_V / P_loss_stack_kW 带 **onTrackOnly** 标记（仅 on 轨建列、off 轨全程 null、
全非盲显不设 blindVisible——盲包语义零变化；run.signals 目录 21→24）。系统 scope 维持
**approved_fc**（electrochem 轨为**物理深度轨、非新故障族**——上表三族定义/参数域/授权状态/
族白名单零变化，本注记 = 族面零变化声明；fc001_v2 验收 = T-B 门禁，fc001_v1 冻结锚点不作
on 轨通过判据——acceptance.keyValues off 轨专用分域登记）；默认 off ⇒ P0/盲包语义零变化。
UI 变体（规格 §1.6 冻结文案，CHG-20261113-01 批准链）：on 轨层级
「L1 · 电堆极化与单节点热（数值仿真级）」、定位句「教学尺度电化学-热集总示意（L1-lite），
非机组/电网动态验证」。

## 3. GT-001 燃气涡轮（L0b swing / linear + L1 thermo 三轨，scope=extension_preview）

| fault id | 家族 | 类型 | 作用位置 | 幅值参数 | 默认时刻 | 授权状态 | golden | 因果模板 |
|---|---|---|---|---|---|---|---|---|
| `speed_sensor_bias` | sensor_drift | 测量阶跃偏置（等效频率） | speed_sensor（转速传感器） | +0.05…1.0 Hz，默认 +0.3 Hz | t=20 s（域 [2,55]） | **extension_preview**（GT G2b 已批准，`GT001_G2B_SPEC_APPROVED.md`；L1 热力轨 G2b 已批准，`GTL1_G2B_SPEC_APPROVED.md`） | gt001_v1/v2/v3（各 6 Run；v3 = L1 thermo 轨，supersedes 链 v3→v2→v1） | gt-sensor-drift |
| `load_step_10kW` | load_step | 功率阶跃 | load | +5…20 kW，默认 +10 kW | t=20 s（域 [2,55]） | **extension_preview**（同上） | gt001_v1/v2/v3（同上） | gt-load-step |
| `fuel_valve_stuck` | actuator_fault | 执行器卡涩（比例钳位） | valve（燃料阀） | thermo 轨：u_cap = 40 kW_eq × magnitude%（燃料指令域钳位，Q5 定案；实际 P_gen 由热力链给出——50% 稳态 18.27 kW ≠ 20.00）；swing/linear 轨：P_gen,cap = 40 kW × magnitude%（功率域），20…85%，默认 50% | t=20 s（域 [2,55]） | **extension_preview**（同上） | gt001_v1/v2/v3（含 actuator_clear t_clear=35） | gt-valve-stuck |

**实现事实**：三轨 inertia_model = **thermo（默认**，Q4 翻转定案 CHG-20261104-12，
systems.js defaults 已随 GTL1-G2b-04 落地）**/ swing（遗留轨，gt001_v2 逐位口径，
CHG-20261102-01）/ linear（遗留轨，gt001_v1 逐位保留）；golden supersedes 链
gt001_v3（L1 thermo 轨：schema v2、method_id=gt001_l1_rk4_dt0.01、gate tier T-B、
oracle `tools/oracle/gt001_l1_oracle.py` 出生即 oracle_base 接入）→ gt001_v2（swing
L0b）→ gt001_v1（linear）；v1/v2 字节冻结留档、gt001_oracle.py **冻结归档债**零触碰
（CHG-20261104-12 Q3；ORACLE_INTERFACE_D2 §5.2 GTL1-G2b-03 触发处置登记）；引擎↔golden
比对面 thermo→v3 / swing→v2 / linear→v1。sensor_drift mag 全域 [0.05…1.0] 暂态
max|Δf| = 0.998 Hz（thermo 轨 oracle 域扫描冻结，GTL1_G2B_SPEC_APPROVED §3.3.1，
\|Δf\| ≤ 1 Hz 有效性域内）。
执行器死区边界：magnitude ≥62.5% 时钳位不生效（GT001_G2B_SPEC 限制项；thermo 轨为
指令域钳位语义，A-gtl1-actuator-cmd-domain）；
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
| GT sensor_drift / load_step / actuator_fault | §3.3 恢复条件清单 9 项全闭（GT G2b）+ L1 热力轨 G2b 批准（GTL1_G2B_SPEC_APPROVED v1.0，CHG-20261104-12） | extension_preview | GT001_G2B_SPEC_APPROVED + GTL1_G2B_SPEC_APPROVED + golden gt001_v2/v3（thermo 默认轨 → v3；swing/linear 遗留轨 → v2/v1 字节冻结留档） |
| PV `G_sensor_bias` / `shading_step` | §8.2 新系统 G2b（PV001_G2B_SPEC_APPROVED，CHG-20261104-10 批准链） | extension_preview | PV001_G2B_SPEC_APPROVED + golden pv001_v1；SA-24 不动（scope.js 对 PV-001 全场景 fall-through 返回 extension_preview 即正确语义，classify/assertApprovedP0 零改动） |
| WT `v_sensor_bias` / `pitch_stuck` / `gust_step` | §8.2 新系统 G2b（WT001_G2B_SPEC_APPROVED，CHG-20261107-01 批准链） | extension_preview | WT001_G2B_SPEC_APPROVED + golden wt001_v1；SA-24 不动（scope.js 对 WT-001 全场景 fall-through 返回 extension_preview 即正确语义，classify/assertApprovedP0 零改动，PV 同款）；gust_step 为新族名登记（§7 节） |
| MG `load_step` / `pv_shading_link` / `wt_gust_link` / `island_event` | §8.2 新系统 G2b（MG001_G2B_SPEC_APPROVED，CHG-20261110-01 批准链） | extension_preview | MG001_G2B_SPEC_APPROVED + golden mg001_v1；SA-24 不动（scope.js 对 MG-001 全场景 fall-through 返回 extension_preview 即正确语义，classify/assertApprovedP0 零改动，PV/WT 同款）；`shading_link`/`gust_link` 为新族名登记（不复用 PV `shading_step`/WT `gust_step`——MG 聚合层子轨联动转发，作用位置与因果方向不同，§8 节）；`island_event` 零参数族（params:[]，库内首例，Q2 定案）+ t_clear_s 守卫扩展为 (GT-001×actuator_fault) ∨ (MG-001×island_event)（scenario.js，EVENT_KEYS/hashProjection 零变化，既有场景哈希零变化）；MG `load_step` 为聚合输入阶跃——与 FL-001 已删除 load_step（O-13）无语义继承（O-13 语义差异声明，§0/§8）；ARENA_EXCLUDED 增 'MG-001'（exposure 三值映射验证轮未做前不入池，V110 DEC-4） |

## 5. 状态勘误表（冻结时点后的授权状态变化登记于此）

| 日期 | 故障族 | 状态变化 | 依据 |
|---|---|---|---|
| 2026-11-04 | FC-001 load_step_10kW / valve_stuck | 未评审冻结 → **G2b 已批准**（实现待 FC-G2b-02/04，v0.6.0 队列） | FCEXT_G2B_SPEC_APPROVED v1.1（CHG-20261104-02） |
| 2026-11-04 | FL-001 converter_current_limit | 未评审冻结 → **G2b 已批准**（实现待 FLEXT-G2b-01/02/04，v0.6.0 队列） | FLEXT_G2B_SPEC_APPROVED v1.1（CHG-20261104-03） |
| 2026-11-04 | FL-001 converter_current_limit | G2b 已批准 → **实现已落地**（FLEXT-G2b-01/02/04：A-fl-clamp 登记 + A-l0 双轨 τ 修订、EQ-A/EQ-B 登记、I_ref_A formula 一般式化、limitations 退化域与手拼配置声明、checks.js 前置窗 null 文案订正；golden fl001_v1 4 Run 重出，approval CHG-20261104-07；系统 scope 维持 approved_p0、族级白名单按 FLEXT §4 显式 CHG 扩展——锚定场景 classify=approved_p0） | FLEXT_G2B_SPEC_APPROVED v1.1 §1.2/§3/§4 + V060_WAVE_DESIGN（CHG-20261104-05） |
| 2026-11-04 | FC-001 load_step_10kW / valve_stuck | G2b 已批准 → **实现已落地**（FC-G2b-02/04：A-fc-dispatcher + EQ-6 登记、I_fc_ref_A formula 一般式化、closedLoopEffect 级联措辞、limitations 包络越界域声明；golden fc001_v1 5 Run 重出（method_version analytic_flux.2、model_version 1.1.0），approval CHG-20261104-06；系统 scope 维持 approved_fc、FC 族条件扩为四族——锚定条件 classify=approved_fc） | FCEXT_G2B_SPEC_APPROVED v1.1 §1.2/§1.4/§3/§5 + V060_WAVE_DESIGN（CHG-20261104-05） |
| 2026-11-04 | PV-001 `G_sensor_bias` / `shading_step` | **新系统登记（新增 §6 节）→ extension_preview**（PV G2b 批准 CHG-20261104-10；oracle `tools/oracle/pv001_oracle.py` + golden pv001_v1 4 Run 首签（schema v2、method pv001_analytic、gate T-A，approval=CHG-20261104-10 批准链）+ verify_golden 注册行落地，PV-G2b-03；引擎 PV 轨/systems.js 由 PV-G2b-04 同波接入） | PV001_G2B_SPEC_APPROVED v1.0 §2/§4 + V070_WAVE_DESIGN DEC-1/DEC-3（CHG-20261104-10） |
| 2026-11-05 | GT-001 sensor_drift / load_step / actuator_fault（三族） | **L1 热力轨（thermo）G2b 批准并实现落地 → 三轨制 + thermo 默认**（§3 节更新：golden 增 gt001_v3 6 Run——schema v2、method gt001_l1_rk4_dt0.01、gate tier T-B（库内首个）、oracle `tools/oracle/gt001_l1_oracle.py` 出生即 oracle_base 接入、approval=CHG-20261104-12 批准链首签；supersedes 链 v3→v2→v1，v1/v2 字节冻结留档、gt001_oracle.py 冻结归档债零触碰；verify_golden gt001 注册行重指向 gt001_v3 + T-B tier 参数化分派，fl001/fc001/pv001 T-A 路径零改动回归 exit 0；默认轨 swing→thermo 翻转（Q4 定案）；授权状态维持 extension_preview 不变、族白名单零改动） | GTL1_G2B_SPEC_APPROVED v1.0 §2/§3.3.1/§4 + ORACLE_INTERFACE_D2 §5.2 GTL1-G2b-03 触发处置登记 + CHG-20261104-12（Q1…Q5 定案） |
| 2026-11-08 | FL-001（三族不变，模型轨面） | **thermal 轨（thermal_model=on）G2b 批准并实现落地 → off/on 双轨制 + off 默认**（§1 节增 thermal 轨注记行：golden 增 fl001_v2 4 Run 全部 on——schema v2、method fl001_thermal_rk4_dt0.01、gate tier T-B、supersedes=fl001_v1、model_version 1.1.0、oracle `tools/oracle/fl001_l1_oracle.py` 出生即 oracle_base 接入、approval=CHG-20261107-01 批准链首签；EQ-FLTH-1…9 登记；verify_golden `fl001_l1` 注册行 + T-B series_limit 三分支补全（`_A`→I_A 键新分支、r_true/r_meas 判别前置于 `_kW` 解除遮蔽——gt001_v3 r_true_kW 六 Run 散差实测 0.0 后统一前移，B-3 裁定）+ 默认运行扩为 fl001+fl001_l1 双 golden；off 轨/fl001_v1 零变化；系统 scope 维持 approved_p0、族白名单零改动） | FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §2/§4（项 4/6/7/8）+ V080_WAVE_DESIGN DEC-2/DEC-6 + CHG-20261107-01 |
| 2026-11-08 | WT-001 `v_sensor_bias` / `pitch_stuck` / `gust_step` | **新系统登记（新增 §7 节）→ extension_preview**（WT G2b 批准 CHG-20261107-01；oracle `tools/oracle/wt001_oracle.py` + golden wt001_v1 5 Run 首签（schema v2、method wt001_l0b_euler_dt0.01、gate T-A，approval=CHG-20261107-01 批准链首签）+ verify_golden 注册行落地，WT-G2b-03；`gust_step` 为新族名（不复用 shading_step/load_step——环境输入侧上行气象阶跃，§2.3 族名裁定）；引擎 WT 轨/systems.js 由 WT-G2b-04 同波接入） | WT001_G2B_SPEC_APPROVED v1.0 §2/§4 + V080_WAVE_DESIGN DEC-4（CHG-20261107-01） |
| 2026-11-11 | MG-001 `load_step` / `pv_shading_link` / `wt_gust_link` / `island_event` | **新系统登记（新增 §8 节）→ extension_preview**（MG G2b 批准 CHG-20261110-01；oracle `tools/oracle/mg001_oracle.py` 源轨复用委托接入（pv001/wt001 oracle import 显式授权 + BESS 能量面内联 + MS-3 复用一致性 emit 硬条件）+ golden mg001_v1 5 Run 首签（schema v2、method mg001_aggregate_analytic、gate T-A（含 I_A 两键，A-1 修订）、approval=CHG-20261110-01 批准链首签）+ verify_golden `mg001` 注册行落地 + scenario.js t_clear_s 守卫扩展 (GT-001×actuator_fault) ∨ (MG-001×island_event)（EVENT_KEYS/hashProjection 零变化）——MG-G2b-03/04，V110_WAVE_DESIGN DEC-5 步数账 33→35；`island_event` 零参数族（params:[]，库内首例，Q2 定案）；`shading_link`/`gust_link` 新族名（MG 聚合层子轨联动转发，不复用 PV/WT 本地族名）；MG `load_step` 为聚合输入阶跃（与 FL-001 已删除 load_step（O-13）无语义继承——O-13 语义差异声明）；引擎 MG 轨/systems.js MG001 SystemDef/UI 六系统化 + ARENA_EXCLUDED 增 'MG-001' 同波接入（V110 W5/W6/W7）） | MG001_G2B_SPEC_APPROVED v1.0 §2/§4 + V110_WAVE_DESIGN DEC-1/DEC-4/DEC-5（CHG-20261110-01） |
| 2026-11-13 | FC-001（三族不变，模型轨面） | **electrochem 轨（electrochem_model=on）G2b 批准并实现落地 → off/on 双轨制 + off 默认**（§2 节增 electrochem 轨注记行：golden 增 fc001_v2 5 Run 全部 on——schema v2、method fc001_l1_polarization_rk4_dt0.01、gate tier T-B、supersedes=fc001_v1、model_version 1.1.0、oracle `tools/oracle/fc001_l1_oracle.py` 出生即 oracle_base 接入、approval=CHG-20261113-01 批准链首签；EQ-FCEC-1…7 登记；verify_golden `fc001_l1` 注册行 + 默认运行扩为 fl001+fl001_l1+fc001_l1 三 golden；scenario 面 B-1(a) 显式键条件式——EVENT_KEYS additive 新键 electrochem_model、缺省全链 absent、既有 FC 场景 scenarioHash 零变化（偏离 thermal/inertia 先例，Q9 定案）；三新信号 T_st_K/V_stack_V/P_loss_stack_kW 带 onTrackOnly（run.signals 21→24、off 轨 null、全非盲显——盲包语义零变化）；off 轨/fc001_v1 零变化；系统 scope 维持 approved_fc、族白名单零改动——**非新故障族，族面零变化声明**） | FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0 §2/§4（项 10/§1.1）/§8 FCECH-G2b-03/04 + V120_WAVE_DESIGN §2 W2/W3/W5 + CHG-20261113-01 |
| 2026-11-14 | FL-001（两族不变，模型轨面） | **capacity 轨（capacity_model=on，前置 thermal_model=on）G2b 批准并实现落地 → (off,·)/(on,off)/(on,on)/(off,on)=拒绝 三元封闭路由**（§1 节增 capacity 轨注记行：golden 增 fl001_v3 4 Run 全部 on_cap（thermal_model=on + capacity_model=on 双键入 config 块）——schema v2、method fl001_capacity_rk4_dt0.01、gate tier T-B、supersedes=fl001_v2（off 轨字节冻结留档）、model_version 1.1.0 维持仅登记、oracle `tools/oracle/fl001_cap_oracle.py` 出生即 oracle_base 接入、approval=CHG-20261114-01 批准链首签；EQ-FLTH-10…12 登记（EQ-FLTH-2/7/9 域内修订——「SOC 定义不动」V072 DEC-2 裁定重开采纳、仅 capacity_model=on 域内生效，域外 EQ-FLTH-7 原式逐字不动，SOC_est 维持铭牌容量测量记账口径）；verify_golden `fl001_cap` 注册行 + 默认运行扩为 fl001+fl001_l1+fc001_l1+fl001_cap 四 golden；scenario 面 B-1(a) 显式键条件式——EVENT_KEYS additive 新键 capacity_model、缺省全链 absent、既有 FL 场景 scenarioHash 零变化 + 组合守卫双落点（engine validate + scenario，(off,on) 结构化拒绝、三元封闭路由 Q11 定案）；新信号 E_cap_kWh 带 onTrackOnly（run.signals 18→19、off 轨与 thermal on 无 capacity 轨结构性缺席、全非盲显——盲包语义零变化；η_cap 不出信号 Q10 定案）；off/(on,off) 轨零变化（fl001_v1/v2 字节冻结）；系统 scope 维持 approved_p0、族白名单零改动——**物理深度轨非新故障族，族面零变化声明**） | FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §2/§4（项 9/10/§6.2.1）/§8 FLCAP-G2b-03/04 + V140_WAVE_DESIGN §2 W2/W3/W4/W5 + CHG-20261114-01 |

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

## 7. WT-001 风力发电机组（L0b，scope=extension_preview）

> 新增节（2026-11-08，WT-G2b-03，V080_WAVE_DESIGN DEC-4）。规格权威文本 =
> `NEXT/WT001_G2B_SPEC_APPROVED.md` v1.0（CHG-20261107-01 批准链，WT-DRAFT-Q1/Q2/Q3
> 定案已落正文）。时间尺度沿用 §0（采样 0.1 s、仿真窗 60 s、默认注入 t=20 s、601 点网格；
> 引擎/oracle 子步 h=0.01 s、6000 子步）。WT-001 定位 **L0b 机械动态行为级演示**
> （WT-DRAFT-Q3 定案）：风轮单质量惯性 + 变桨一阶跟踪 + 可用功率保护钳位；
> 不可调度电源（风机 × 电阻性馈线 20 kW 需求，无储能/无 SOC 键，load_step 族不适用）；
> 测量冗余特征由一致性残差 d_wt 承载（运行点偏离 MPPT 最优曲线的功率差；r_true/r_meas
> 逐点恒 ≡ 0（WS-4），与 FL-001 的 r_meas = 0.4·b 教学对照）。事件幅值符号口径：
> `v_sensor_bias` 序列列 `bias_ms` 与事件 magnitude 按**低估方向同号登记为 −B**
> （closed_loop_fault/monitor_only 的 fault.bias_ms=−1.0、event magnitude=−1.0 m/s；
> RUNS magnitude 参数保持正值 B=1.0 表低估幅值——L2 oracle 登记口径，L8/引擎侧对齐）。

| fault id | 家族 | 类型 | 作用位置 | 幅值参数 | 默认时刻 | 授权状态 | golden | 因果模板 |
|---|---|---|---|---|---|---|---|---|
| `v_sensor_bias` | sensor_drift | 测量阶跃偏置（风速，**低估方向单向族**：高估零真实效应、仅估计通道暴露） | sensor（风速计 anemometer——保护钳位与估计通道注入点） | 低估幅值 0.5…3.0 m/s，step 0.5，默认 1.0 m/s（b(t) = −B·1(t≥t0)，EQ-WT-1；闭环：保护钳位 10.00→7.02 kW 收紧、P_wt 下行、转速升、d_wt 瞬态 +2.98 kW 后归零——低估被闭环吸收进自洽；监测：真实出力不变、d_wt ≡ +2.98 kW 持续暴露） | t=20 s（域 [2,55]） | **extension_preview**（WT G2b 已批准，`WT001_G2B_SPEC_APPROVED.md`） | wt001_v1（5 Run：healthy + closed_loop_fault + monitor_only + pitch_stuck_closed_loop + gust_closed_loop；schema v2、approval CHG-20261107-01 批准链首签） | wt-sensor-drift |
| `pitch_stuck` | actuator_fault | 执行器**位置强制**（变桨卡涩——与 FL/FC/GT 指令限幅模式不同：亚额定桨距指令为零，限幅式将是 no-op，故采位置强制 β ≡ β_stuck，Q2 定案） | pitch_act（变桨执行器） | β_stuck = 30° × magnitude%，20…85%，step 5，默认 55%（→16.5°）（闭环与监测同生效——物理执行器故障：Cp 0.480→0.167、P_wt 10.00→3.47 kW、d_wt 持续 −6.53 kW 不归零） | t=20 s（域 [2,55]） | **extension_preview**（同上） | wt001_v1（同上；beta_stuck_deg 事件域信号，非 stuck 场景整列 null——I_bat_cap_A 先例） | wt-pitch-stuck |
| `gust_step` | gust_step（**新族**——环境输入侧上行气象阶跃，作用位置与因果方向不同于 PV shading 下行/负载侧需求，不复用族名） | 物理输入阶跃（有效真实风速 v0 → v0+Δv，EQ-WT-1） | rotor（风轮） | 阵风增幅 1.0…3.0 m/s，step 0.5，默认 +2.0 m/s（v 9→11，跨额定区 v_rated=10.302 m/s：P_ref 封顶 15 kW、转速锚定 212.3 rpm、桨距吸收 β 0→1.73°、d_wt 稳态 −3.26 kW 合法残差） | t=20 s（域 [2,55]） | **extension_preview**（同上） | wt001_v1（同上；**gust monitor 不重复入 golden**——物理输入与控制模式无关、两模式逐位同解 WS-7 实证 0 差，FLEXT §2 项 1 / PV shading 先例） | wt-gust-step |

**实现事实（WT-G2b-03，2026-11-08 本波落地；引擎轨见下）**：独立 oracle
`tools/oracle/wt001_oracle.py`（方程唯一权威 = 规格 §1.3 EQ-WT-1…9；不 import src/**、
不与 FL/FC/GT/PV oracle 共享公式常量；Cp 度制、HALF_RHO_A = 28.577252030659327 预乘、
λ_opt/cp_max/k_v/area 等常量按规格 15 位登记值、ω(0) = 18.916969639327981 登记值、
t≥t0 判定带 1e-9 守卫、状态行 = 子步起点值/代数量行内重算的冻结更新序；自检
WS-1…WS-8，含 **pitch_stuck 域扫描 emit 硬条件**（mag 20…85% 步 5，λ_eq > 0.5·λ_opt
恒成立、ω 不越下界，越界即 emit 拒绝写盘——GTL1 §3.3.1 A-2 同款纪律）+ **UI 全域
8 角点端点抽查**（v0∈{6,10} × {bias −3、stuck 85%、gust +3、健康局}：P_wt ∈ [0.37,15.0] kW、
n ∈ [67.17,242.58] rpm、β ≤ 25.5°、最小稳定裕度 11.5%，§3.5 v1.0 全域界逐位复现））；
golden wt001_v1（schema v2：golden_schema_version="v2"、model_version="1.0.0"、
method_id="wt001_l0b_euler_dt0.01"、engine_baseline/backend=null、units 增 wind:m/s 与
angle:°、generated_by 一段式、approval 三字段非 null；gate **T-A** = E_kWh 1e-9 /
P_kW rtol 1e-12 atol 1e-15 / n_rpm_atol 1e-9 / r_true_kW 1e-12 / I_A rtol 1e-12 atol 1e-15
（bias_ms 命中 startswith("bias") 分支所必需）/ t_s 1e-9——无 d_wt_atol 键（d_wt_kW 走
`_kW` 支路 → P_kW_atol，B-2 死键删除）；SERIES_IDS = t + §1.2 全表 22 信号 = 23 项，
beta_stuck_deg 为唯一事件域 null 列）；verify_golden 注册行已追加（scalars：
E_wt_true/E_wt_est/E_wt_err/E_grid/E_load_kWh 五能量键；i_true/i_meas =
P_wt_true_kW/P_wt_meas_kW；event_tol=P_kW_atol——verify_golden 参数化逻辑零改动，T-A 路径）。
**引擎/systems.js**：simulateWT001 新轨 + WT001 SystemDef（22 信号/A-wt-* 11 条/
limitations 10 项/EQ-WT-1…9/initial v0_ms）+ checks.js WT 能量恒等分支 + UI 接线
（home 五系统/compare/scenario/teaching/ARENA_EXCLUDED 增 'WT-001'）为 WT-G2b-04 面，
本波 v0.8 内落地。
**scope 现状**：系统级与族级均 extension_preview——scope.js `classify` 对 systemId ≠
'FL-001' 配置 fall-through 返回 extension_preview（PV 同款语义，零改动，无白名单挂载）；
assertApprovedP0 对 WT 配置抛 SCOPE-E01（验收路径关闭，规格 §5）。

## 8. MG-001 微电网多源聚合系统（聚合层 L0，scope=extension_preview）

> 新增节（2026-11-11，MG-G2b-03/04，V110_WAVE_DESIGN §2 W4/W7）。规格权威文本 =
> `NEXT/MG001_G2B_SPEC_APPROVED.md` v1.0（CHG-20261110-01 批准链，MG-DRAFT-Q1…Q7 定案
> 已落正文）。时间尺度沿用 §0（采样 0.1 s、仿真窗 60 s、默认注入 t=20 s、601 点网格）。
> MG-001 定位 **聚合层 L0 · 多源聚合行为级演示**（MG-DRAFT-Q3 定案；各源维持既有层级——
> PV L0 / WT L0b / BESS 电池能量面 = FL-001 L0 电气面，组合输出 provenance 不升级）：
> PV-001 子轨（G0=1000 固定）+ WT-001 子轨（v0=9 固定）+ BESS（FL-001 电池能量面：
> 40 kWh / 400 V、P=0.4·I 换算、SOC 账本）+ 聚合负荷 → 单母线功率平衡聚合层；
> 主馈线为理想平衡源补差（与 FL/PV/WT 的馈线同位同构），经主馈线分断开关接入；
> 聚合层零新增 ODE 状态（EQ-MG-1…9 全代数——不建第四套物理栈，源轨原样复用）。
> **I-5 措辞红线（本系统专项强化）**：孤岛教学点只能表述为「脱离主馈线的功率平衡重整
> 演示」；禁电网保护/稳定/孤岛保护/防孤岛/并离网切换验证/低电压穿越等语义与措辞邻接
> （B-1 口径：此类词面仅限 limitations 命名与否定式声明）；「主馈线」「分断开关」仅指
> 补差功率源的理想通断抽象，不代表真实电网侧动态；无频率/电压/无功概念。
> **O-13 语义差异声明**：MG `load_step` 是聚合输入阶跃（并网面由理想馈线瞬时补差吸收、
> 孤岛面由 BESS 钳位 ±8 kW + 卸载/倾卸重整吸收，两模式恒等式按构造成立，EQ-MG-3/4/6），
> 与 FL-001 已删除的 load_step（O-13：滞后发电机 + 恒电流电池守恒破缺）无语义继承——
> 族名沿跨系统同名族惯例（FL/FC/GT 均有 load_step 族）。
> **层级不升级（I-2）**：UI 层级标签「聚合层 L0 · 多源聚合行为级演示（G2b 已批准）」，
> 不宣称组合输出为更高深度。

| fault id | 家族 | 类型 | 作用位置 | 幅值参数 | 默认时刻 | 授权状态 | golden | 因果模板 |
|---|---|---|---|---|---|---|---|---|
| `load_step` | load_step（**与 FL-001 O-13 删除族无语义继承**——MG 聚合输入阶跃，见节首声明） | 聚合输入阶跃（瞬时，无爬坡） | load（聚合负荷） | 有符号域 −10…+20 kW，step 5，默认 +10 kW（Q6 定案：下行域使倒送角点 load_eff < ΣP_source ⇒ P_grid < 0 域内可达；load_eff ≥ 0 由域设计保证——load_kW min 10 + step min −10） | t=20 s（域 [2,55]） | **extension_preview**（MG G2b 已批准，`MG001_G2B_SPEC_APPROVED.md`） | mg001_v1（5 Run：healthy + load_step_closed_loop + pv_shading_closed_loop + wt_gust_closed_loop + island_reconnect；schema v2、approval CHG-20261110-01 批准链首签） | mg-load-step |
| `pv_shading_link` | shading_link（**新族名**——不复用 PV `shading_step`：MG 聚合层的子轨联动转发 vs PV 本地物理输入，作用位置与因果方向不同，WT §2.3 独立族名裁定先例） | 子轨物理输入联动注入（PV-001 子轨 shading_step 透传，源域原样） | pv_unit（光伏子轨） | 遮挡降幅 50…300 W/m²，step 25，默认 300 W/m²（G0 1000→700） | t=20 s（域 [2,55]） | **extension_preview**（同上） | mg001_v1（同上；monitor 轨不重复入 golden——物理输入与控制模式无关、两模式逐位同解（复算实证 d_pv=0.00e+00），PV shading 先例延用） | mg-pv-shading-link |
| `wt_gust_link` | gust_link（**新族名**——同上裁定：MG 子轨联动转发，不复用 WT `gust_step`） | 子轨物理输入联动注入（WT-001 子轨 gust_step 透传，源域原样） | wt_unit（风电子轨） | 阵风增幅 +1.0…3.0 m/s，step 0.5，默认 +2.0 m/s（v 9→11 跨额定区 v_rated=10.302：P_wt 爬升封顶 15 kW、P_grid→0.000000 kW **零导入角点**（\|·\| ≤ 1e-9 容差声明——PV 10 + WT 15 + BESS 5 = load 30 恰平，合法角点非缺陷）） | t=20 s（域 [2,55]） | **extension_preview**（同上） | mg001_v1（同上；monitor 轨不重复入 golden——同上逐位同解实证 d_wt=0.00e+00） | mg-wt-gust-link |
| `island_event` | island_event | 拓扑分断事件（理想通断——分断即馈线功率恒为 0、重连即恢复补差；无检同期、无过渡过程、无保护逻辑，A-mg-island-abstract） | switch（主馈线分断开关） | **零参数族（params:[]，库内首例——MG-DRAFT-Q2 定案）**：脱离/重连语义由 t_start_s（脱离）与 t_clear_s（重连）完整承载，无幅值语义，挂空 magnitude 为伪参数不采；t_clear_s 域 (t_start, 60) s、0.1 s 网格（GT-001 actuator_fault t_clear 域同构），缺省 = 窗末持续脱离，**golden 锚定 t_clear=35**（UI 编辑器缺省沿该锚定值） | t=20 s（域 [2,55]） | **extension_preview**（同上） | mg001_v1（island_reconnect Run：脱离 EV-001 / 重连 EV-002 双事件快照——target_signal=island_state、magnitude=null；重整三相锚点 island_state 0→1→0、P_grid 5→0→5、P_bess 5→8（chase=10 超上限钳位）→5、P_shed 0→2→0） | mg-island-event |

**实现事实（MG-G2b-03/04，2026-11-11 本波落地；V110_WAVE_DESIGN §2 W4/W5/W6/W7）**：
独立 oracle `tools/oracle/mg001_oracle.py`（**源轨复用委托**形制——`import pv001_oracle`/
`import wt001_oracle` 为规格 G2b 批准的显式授权面，MG 不重写任何源方程；BESS 能量面
3 行内联（P=0.4·I、SOC 积分式、钳位代数），权威文本 = FL-001 已批规格电气面；
不 import src/**；**MS-3 复用一致性 emit/verify 双面硬条件**：源通道序列与 pv001_v1/
wt001_v1 golden 逐位核对 ≤1e-12——源侧变更即失配拒绝；自检 MS-1…MS-8 含分段常值断言
（P_bess 相位内漂移 ≡0——EQ-MG-7 前提））；golden mg001_v1（schema v2：
golden_schema_version="v2"、model_version="1.0.0"、method_id="mg001_aggregate_analytic"
（聚合全闭式 + 源轨复用）、engine_baseline/backend=null、generated_by 一段式、approval
三字段非 null；gate **T-A** = E_kWh 1e-9 / P_kW rtol 1e-12 atol 1e-15 / SOC_pp 1e-9 /
r_true_kW 1e-12 / t_s 1e-9 / I_A rtol 1e-12 atol 1e-15（A-1 修订：T-A 路径直接索引
I_A 两键，四 T-A golden 先例同款）；SERIES_IDS = t + §1.3 表 18 信号 = 19 项，唯一
事件域 null 列 `P_bess_chase_kW`（I_bat_cap_A/beta_stuck_deg 先例）；单位零新增
（kW/%/pp/V/'-' 既有））；verify_golden 注册行已追加（scalars 11 键：E_pv/E_wt/E_bess/
E_grid/E_load_served/E_shed/E_dump/E_load_demand_kWh + SOC_true_end_pct/SOC_est_end_pct/
SOC_err_end_pp；i_true/i_meas = P_grid_true_kW/P_grid_meas_kW；event_tol=P_kW_atol——
verify_golden 参数化逻辑零改动，T-A 路径）；scenario.js t_clear_s 守卫扩展为
(GT-001×actuator_fault) ∨ (MG-001×island_event)（EVENT_KEYS/hashProjection 零变化，
既有场景哈希零变化）+ 「可用系统」枚举 knownSystemIds 动态派生（含 MG-001，B-4 已随
CHG-20261108-03 修复）；run-g2 33→35 步（第 34 步 verify_golden.py mg001、第 35 步
tests/engine-mg.test.js——V110 DEC-5 步数账显式申报）。
**引擎/systems.js/UI**：simulateMG001 组合轨（engine.js 分派链显式 MG 分支置于 else→GT001
兜底之前——R-5 守卫）+ MG001 SystemDef（19 信号含 exposure/sourceKind、A-mg-* 10 条、
limitations 10 项、EQ-MG-1…9、initial {load_kW, p_sched_kW, SOC_pct} 三键面）+
因果模板四件（§6.4：mg-load-step/mg-pv-shading-link/mg-wt-gust-link/mg-island-event）+
UI 六系统化（home 六系统卡、compare bySystem MG 组、scenario METRIC_PICK MG 键、
system 页 island_event 零参数族注入面（无幅值输入 + t_clear_s 编辑器缺省 35 s）+
**A-3 单 Run 可达包络行**（signals 页页脚 MG-001 专属行——「引擎逐点计算 · 当前运行 601 点」
的 P_grid/P_bess/P_shed/P_dump/island_state 逐点计算范围（UI 措辞用「引擎逐点计算」——「实测」为 copy-guard 禁词，UI 侧不出现该词面；规格语境「引擎实测扫描」同义承载），A-3 修订口径：单 Run 可达 ≠
参数域叉积包络 ≠ 系统级声明，措辞不称全域）+ ARENA_EXCLUDED 增 'MG-001'）为本波
MG-G2b-04/W7 面。
**scope 现状**：系统级与族级均 extension_preview——scope.js `classify` 对 MG-001 配置
fall-through 返回 extension_preview（PV/WT 同款语义，零改动，无白名单挂载）；
assertApprovedP0 对 MG 配置抛 SCOPE-E01（验收路径关闭，规格 §5）。Arena 盲测池：
ARENA_EXCLUDED 增 'MG-001'（exposure 三值映射验证轮未做前不入池——MG 规格 §5 /
V110 DEC-4，入池须显式 CHG 并同步通道面裁定）；MG 四族不入 arena familyPool
（系统级过滤先行）。包络口径（A-3 修订改标）：规格 §3.5 表为**参数域叉积包络**
（load_eff ∈ [0,65] kW、P_grid 并网面 ∈ [−33,+56] kW、孤岛面 chase ∈ [−20,+45] kW、
P_shed ∈ [0,37] kW、P_dump ∈ [0,12] kW、SOC(60) ∈ [−0.3333,+100.3333] pp——A-2 修订）；
UI 单 Run 可达包络行（signals 页）为当前单 Run 引擎逐点计算范围，两者口径不同、不得混同。



---

**文件结束**。FAULT_CATALOG v1.7（2026-11-14：§1 FL-001 增 capacity 轨注记行
（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0，FLCAP-G2b-03/04，CHG-20261114-01 批准链，
系统 scope 维持 approved_p0、族面零变化——物理深度轨非新故障族；三元封闭路由
(off,·)/(on,off)/(on,on)/(off,on)=拒绝 + EQ-FLTH-10…12 域内修订登记）+ §5 勘误表登记；
v1.6 = 2026-11-13 §2 FC-001 增 electrochem 轨注记行
（FC001_ELECTROCHEM_G2B_SPEC_APPROVED v1.0，FCECH-G2b-03/04，CHG-20261113-01 批准链，
系统 scope 维持 approved_fc、族面零变化——物理深度轨非新故障族）+ §5 勘误表登记；
v1.5 = 2026-11-11 新增 §8 MG-001 节（四族含新族
shading_link/gust_link 与零参数族 island_event；MG-G2b-03/04，CHG-20261110-01 批准链，
系统级/族级 scope=extension_preview）+ §4 映射表/§5 勘误表登记；v1.4 = 2026-11-08
§1 FL-001 增 thermal 轨注记行 + §4/§5 登记 + 新增 §7 WT-001 节（三族含新族 gust_step；
WT-G2b-03/FLTH-G2b-03，CHG-20261107-01 批准链，系统级/族级 scope 维持不变——
FL approved_p0 / WT extension_preview）；v1.3 = 2026-11-05 GT-001 L1 thermo 轨三轨制
更新见 §3/§4/§5（GTL1-G2b-03，CHG-20261104-12 批准链，系统级/族级
scope=extension_preview 维持）；v1.2 = 2026-11-04 v1.1 实现落地更新 + 新增 §6 PV-001 节
（PV-G2b-03，CHG-20261104-10 批准链）；冻结时点 = A-2/A-3 评审包提交时点）。
维护规则：族增删/参数域变更/授权状态变化 → 先更本目录 §5 勘误表并登记 CHG，再动 systems.js。
