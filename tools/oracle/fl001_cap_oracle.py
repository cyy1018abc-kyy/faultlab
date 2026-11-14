# -*- coding: utf-8 -*-
"""fl001_cap_oracle.py — FL-001 L1 容量/内阻二阶效应轨独立数值 oracle（FLCAP-G2b-03，
FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §1/§3/§4；CHG-20261114-01 批准链，2026-11-14）。

独立性声明（违反即 golden 无效；对标 fl001_l1_oracle.py:1-19 / gt001_l1_oracle.py 先例，
MODEL_VALIDATION_SPEC §6.3 类推）：
  1. 本文件不 import / 不复制 src/** 任何模块或常量；方程与常量唯一权威文本是
     FaultLab-evaluation/NEXT/FL001_CAPACITY_G2B_SPEC_APPROVED.md v1.0（APPROVED，
     批准记录 CHG-20261114-01）——§1.3 EQ-FLTH-10/11/12 冻结文本 + §1.5 参数面定案
     （beta=5e-7 1/K2、k_cap=0.004 1/K、T_cap0=313.15 K、eta_floor=0.5 四常量定案；
     R0=0.2、alpha=0.01、C_bat=300、h_cool=10、T_amb=298.15、E_nom=40、DT_INT=0.01
     既有冻结原样），此处独立硬编码。
  2. 本文件不 import fl001_oracle / fl001_l1_oracle / fc001_oracle / fc001_l1_oracle /
     gt001_* 或任何既有 oracle（字节冻结零触碰——规格 §0 不动清单 ①）；不与 FL/FC/GT/
     PV oracle 共享公式常量（oracle_base 仅承载哈希/批准/写盘/RUNS 解析等机制助手，
     无模型语义，D-2a 契约）。FCAP-1/FCAP-3 所用 L0 闭式参照（MODEL_VALIDATION_SPEC
     §1.2/§1.3 八条解析式 EQ-1…EQ-6/EQ-A/EQ-B）为本文件内独立复刻，非 import；
     fl001_v1/fl001_v2 冻结 golden 只读比对（FCAP-1 环境校验），零写入。
  3. golden 只能由本 oracle（经 oracle_base emit 路径）生成；产品 engine 对 golden 只读
     比对（G0-DEC-16）。出生即 oracle_base 接入（规格 §4 项 2：契约六成员 RUNS/
     SERIES_IDS/simulate_run/self_check/_oracle_source_sha256/build_golden +
     resolve_run_spec + write_golden_with_sidecar LF 钉死 + approval 三字段非 null 方可
     落盘 + SERIES_IDS 含 "t" 列）。
  4. 本文件自带自检 FCAP-1…FCAP-8（规格 §4 项 4 + B-4 修正；FCAP-x 为本文件专属证据链，
     FL-x 为 fl001_l1_oracle.py 专属——Q5 定案新段不续编），自检失败由调用方以 exit 2
     报告；emit 前置自检（失败不写盘）。

模型（thermal_model="on" + capacity_model="on" 轨；L1 扩展 · 容量/内阻二阶效应最小集，
规格 §0/§1；键形态 = 裁定点二定案 (a) 组合键 capacity_model:"off"|"on"，前置
thermal_model=on；三元封闭路由 (off,·)→fl001_v1 / (on,off)→fl001_v2 / (on,on)→本
golden / (off,on)=非法组合拒绝——§4 项 10 两门禁面）：
  EQ-FLTH-1…9（FL001_THERMAL_G2B_SPEC_APPROVED v1.0 §2 冻结文本——本轨零触碰域，
  逐字复刻；capacity 面零涉）：
    EQ-FLTH-1  I_meas = I_true + b(t)；tau·dI_true/dt + I_true = target
               （healthy/sensor 闭环 target = I_ref − b、monitor target = I_ref、
               tau=1.5 s；actuator 轨 target = min(I_ref − b, I_cap)、tau_act=0.4 s、
               b≡0）；P_bat,true = 0.4·I_true——功率链零反馈（规格 §0/§1.3 守恒面
               声明：反馈仅经 SOC 折算面进入，A5 §2.1 口径）。
    EQ-FLTH-5  P_gen,true = P_load − P_bat,true + P_loss（守恒面 (a)）
    EQ-FLTH-6  r_true := P_gen,true + P_bat,true − P_load,served − P_loss ≡ 0；
               r_meas := P_gen,true + P_bat,meas − P_load,served − P_loss ≡ 0.4·b(t)
               ——r 面与 SOC_err 面分离（§1.4），容量项不进入
    EQ-FLTH-8  E_loss = ∫P_loss dt（子步梯形）；E_source = E_load − E_bat + E_loss
    EQ-FLTH-9  检查式 E_source + E_bat − E_load − E_loss ≡ 0——全部不动（无第二缺口
               项、无补偿去向，裁定点一定案 §6.2.1）
  EQ-FLTH-10  R_int(T_bat) = R0·(1 + alpha·theta + beta·theta^2)，theta = T_bat − 298.15
              （K 制；T_bat 单位 K）；beta = 5e-7 1/K2（批准轮定案 CHG-20261114-01，
              教学参数非实测——A-flcap-params；符号域 beta >= 0、alpha > 0——A-5 定案）。
              P_loss = I_true^2·R_int [W]（EQ-FLTH-3 W 基口径）；P_loss_kW = P_loss/1000。
              beta = 0 时精确退化为现行线性式（fl001_v2 轨结构自洽面——本 oracle
              capacity="off" 路径即该式的逐字复刻）。
  EQ-FLTH-3/4  C_bat·dT_bat/dt = P_loss − h_cool·theta，T_bat(0) = T_amb = 298.15 K——
              RHS 内 I_true 冻结子步起点（FLTH Q2 定案口径同构）⇒ 子步内为常系数
              Riccati 方程 theta' = a·theta^2 + b·theta + c（a = I^2·R0·beta/C_bat、
              b = (I^2·R0·alpha − h_cool)/C_bat、c = I^2·R0/C_bat），经典 RK4
              dt = 0.01（规格 §4 项 3 数值方法定案）。
  EQ-FLTH-11  SOC_true(t) = SOC0 − 100·∫[0,t] (P_bat,true(t')/3600)/E_cap(T_bat(t')) dt'
              （/3600 位置 = A-7 定案：kW·s→kWh 换算因子作用于积分元内——换算 kWh
              后再除 E_cap（kWh）分母）；
              E_cap(T) = eta_cap(T)·E_nom，eta_cap(T) = max(eta_floor,
              1 − k_cap·max(0, T − T_cap0))（A-1 定案机制；eta_cap ∈ (0,1] 全域构造
              保证，E_cap >= 20 kWh）。
              离散口径（冻结，§1.3）：子步 E_cap 冻结于子步起点右值（分区结构同构——
              FLTH Q2 I 冻结先例）+ 实现形态 = 名义单除项（与 EQ-FLTH-7 原式同源同序：
              SOC0 − 100·(V·intI)/(E_nom·3600)，intI 同源电气面 L0 精确指数序）+
              容量修正累积器（每子步 (V·∫I_sub dt'/3600)·(1/E_cap(T_start) − 1/40)）
              ——恒等改写 1/E_cap = 1/40 + (1/E_cap − 1/40)，修正项与 E_cap <= 40 同向、
              无相消。T_bat < T_cap0 域内 max(0, T−T_cap0) ≡ 0.0（IEEE 精确）⇒
              eta_cap ≡ 1.0 精确 ⇒ E_cap ≡ 40.0 精确 ⇒ 1/E_cap − 1/40 ≡ 0.0 ⇒ 修正
              累积器恒精确 0.0 ⇒ healthy 局 SOC_true/SOC_est/SOC_err 与 fl001_v2 位级
              逐位同（A-2 机制；四 golden Run 窗内最高温 309.953757 K < T_cap0 =
              313.15 K ⇒ 全 4 Run E_cap ≡ 40 kWh 精确、SOC 面位级同——§3.2/§3.3 ③）。
              SOC_est = SOC0 − ∫P_bat,meas dt/(40 kWh)×100% 原式逐字不动（测量链零
              升级——SOC_est 与 fl001_v2 逐位同，§1.4 结构判据）。
  EQ-FLTH-12  稳态：beta·I^2·R0·theta_ss^2 + (alpha·I^2·R0 − h)·theta_ss + I^2·R0 = 0
              （beta > 0 二次代数方程，物理根 = 稳定小根 theta_-）；数值稳定小根形态
              （冻结——A-3/Q3 定案）：theta_- = 2·I^2·R0 / [(h − alpha·I^2·R0) +
              sqrt(Delta)]，Delta = (h − alpha·I^2·R0)^2 − 4·beta·(I^2·R0)^2
              （有理化式——Delta→0 无相消、beta→0 无 0/0；naive 求根式
              [(h−alpha·I^2·R0) − sqrt(Delta)]/(2·beta·I^2·R0) 仅作展示不作求解式）；
              局部稳定性条件 h > I^2·R0·(alpha + 2·beta·theta)（轨内全程成立，轨内
              最小裕度 = sqrt(Delta)）；全轨失稳边界 h = I^2·R0·(alpha + 2·sqrt(beta))
              （注册域要求严格大于——I_max = 62.5 A 角点裕度 +1.0826 W/K，§3.3 ②/④）；
              beta = 0 精确退化为 EQ-FLTH-9 现行线性闭式（0.0 ulp 实测——§3.3 ⑦）。

RK4 分区更新序（规格 §4 项 3 定案 = FLTH §2.3 冻结骨架 + EQ-FLTH-11 离散口径；本文件为
其 Python stdlib 实现，oracle/引擎双侧复刻唯一权威）：
  每输出步 k = 1..600（0.1 s），每输出步内子步 h = DT_INT = 0.01（j = 0..9，
  6000 子步/60 s）；输入冻结于子步起点右值：b = bAt(t_sub)（plants/fl001.js:34 同口径
  1e-9 守卫；t=20.0 阶跃落在子步边界，无子步内间断）：
  ① 电气面（L0 序保留，plants/fl001.js stepOf 逐字语义）：I_start = I_true（同时是
     ② 的冻结输入）；st = stepOf(I_start, t_sub, h)（精确指数 + 区间解析积分）；
     I_end = st.y；intI += st.integral；intB += b·h（SOC/E_bat 面零变化）
  ①' 容量修正累积器（EQ-FLTH-11 离散口径，仅 capacity_model=on）：
     corr += (V·st.integral/3600)·(1/E_cap(T_start) − 1/40)，E_cap 冻结于子步起点
     右值 T_start（提交前的 T_bat）；T < T_cap0 域内该项恒精确 0.0（A-2 机制）
  ② RK4（热状态 T_bat；RHS 内 I 冻结于 I_start——Q2 定案口径；RHS 内 R_int 按
     EQ-FLTH-10）：
       RHS(T)：theta = T − 298.15；P_loss(I_start,T) = I_start^2·R0·
               (1 + alpha·theta + beta·theta^2)
               dT/dt = (P_loss − h_cool·theta)/C_bat
       k1 = RHS(T)；k2 = RHS(T+h/2·k1)；k3 = RHS(T+h/2·k2)；k4 = RHS(T+h·k3)
       T_end = T + h/6·(k1 + 2·k2 + 2·k3 + k4)
  ③ E_loss 累计（子步梯形）+ 同基异序独立累积（FL-2 体例）；子步末提交
     I_true = I_end、T_bat = T_end
  输出网格 record(k)（601 点）：由 (I_true(t_k), T_bat(t_k), b(t_k)) 重算全部代数量——
     P_loss_kW = 当前状态值（信号面与账本面分离，FLTH §2.3 注记②同款）；P_gen =
     P_load − 0.4·I_true + P_loss_kW（EQ-FLTH-5）；r_true/r_meas 按 EQ-FLTH-6；
     SOC_true = 名义单除项 − 100·corr（on 域）/ 名义单除项（off 域——与 fl001_v2
     逐位同）；SOC_est 原式逐字不动；E_cap_kWh = eta_cap(T_bat)·E_nom（当前状态
     代数面——onTrackOnly 门控为引擎侧结构（off 轨结构性缺席不建列），oracle 序列面
     恒建列，golden 比对面仅 on 轨消费）。

关键结构硬条件（规格 §3.1/§4 项 10 三元路由；任务书 W2 结构条件）：capacity_model=off
  域（(off,·)/(on,off)）与既有轨逐位同——本 oracle 的 (on,off) 路径
  （_simulate_core(..., capacity="off")）为 fl001_l1_oracle 同更新序同表达式复刻（fp
  求值序逐字保持），FCAP-1 以 fl001_v2 冻结 golden 全序列只读复核（电气/测量面 ±1e-9；
  热面判据挂 FCAP-7 实测冻结制——B-4 定案：双实现散差 ×>=10 且下限 >=1e-9，不做跨
  语言/跨实现位级承诺）；(on,on) 为本 golden（fl001_v3）4 Run（Q7 定案镜像 fl001_v2
  全集、全部 thermal_model=on + capacity_model=on）；(off,·) 轨属 fl001_v1/
  fl001_oracle 冻结面（本 oracle 不承载，_simulate_core 拒绝 thermal_model=off）。

golden（schema v2，ORACLE_INTERFACE_D2.md §3；规格 §4 项 1/5/6）：
  - 元数据：golden_schema_version="v2"、golden_id="fl001_v3"、model_id="FL-001"、
    model_version="1.1.0"（Q1 定案维持仅登记——golden 语义由 golden_id 承载）、
    method_id="fl001_capacity_rk4_dt0.01"（§4 项 6 批准提案原文——fl001_thermal_
    rk4_dt0.01 句式）、engine_baseline=null、backend=null（§3.4 留位）、
    thermal_model="on" + capacity_model="on"（顶层面与 config 块双落位——fl001_v2
    thermal_model 先例扩双键）、supersedes="fl001_v2（thermal 轨 capacity_model=off，
    字节冻结留档；存档场次继续引用 v2）"（§4 项 6 批准原文；supersedes 链 v3→v2→v1）、
    approval 三字段首签 approved_by="user（2026-11-14 CHG-20261114-01 批准链）"。
    build_golden() 不含 generated_by/approval（v2 一段式：oracle_base.emit_golden 在
    emit 时点现算回填——generated_at 不得 null 占位出境；approval 三值非 null 方可落盘）。
  - SERIES_IDS = fl001_v2 全 16 列 + E_cap_kWh 新列（尾插，GTL1 先例；§4 项 6——
    E_cap_kWh 经 verify_golden T-B `_kWh` 分支路由 E_kWh 容差，A-4/B-1 显式硬项的
    实现侧对齐；`"E_cap_kWh".endswith("_kW")` = False 实测（kWh 非 `_kW` 精确后缀），
    无 `_kWh` 分支时实落 f_Hz_atol 兜底键而本 gate 无该键 ⇒ 实害 KeyError——R-6）。
  - gate 块 tier="T-B"：键面 = fl001_v2 gate 全键面（无新增键——E_cap_kWh 序列路由
    E_kWh 容差）；数值按 FCAP-7 双实现实测散差 ×>=10 冻结（散差表记录见 TOLERANCES
    注与 FCAP-7 observed；降 T-C 预案未触发）。
  - 事件面与 fl001_v2 对齐：EV-001（sensor_bias / actuator_limit，trigger 20.0，
    pre=left_limit / post=post_sample，变量集零扩展——E_cap_kWh 不入事件快照，§2
    事件快照行）。
  - scalars 面 = fl001_v2 全 22 键 + E_cap_end_kWh 新键（E_cap(60) 锚点——§3.2 E_cap 行）。

emit：python -I tools/oracle/fl001_cap_oracle.py --emit（先跑 FCAP-1…FCAP-8，失败 exit 2
  不写盘；经 oracle_base.emit_golden 产出 data/golden/fl001_v3.json + .sha256 sidecar，
  LF 钉死，oracle_base.py write_golden_with_sidecar 字节规范）。
自检：python -I tools/oracle/fl001_cap_oracle.py --self-check（exit 0=全过 / 2=失败；
  记录面字符串保持 ASCII 安全，避免 GBK 控制台编码陷阱）。

Python 3 标准库；无第三方依赖；不访问网络。
"""

import json
import math
import os
import sys

# oracle_base 与本文件同目录；显式注入目录使命令行 -I 隔离模式等入口也能解析
# （fl001_l1_oracle.py:105-108 同式；oracle_base 为机制层，无模型语义，独立性声明不变）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle_base  # noqa: E402

# ---------------------------------------------------------------------------
# 冻结参数（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §1.5 参数面定案表——唯一权威；
# 任何变更须重建 golden。L0 电气面参数 = MODEL_VALIDATION_SPEC §1.2 冻结值原样；
# R0/alpha/C_bat/h_cool/T_amb/E_nom/DT_INT = FLTH §2.1 既有冻结原样（零变更——
# 本轨不触碰 thermal 轨常量，fl001_v2 字节冻结零涉的结构保证））
# ---------------------------------------------------------------------------
DURATION_S = 60.0
DT_S = 0.1
T_F = 20.0
BIAS_A = 10.0
VDC_V = 400.0
IREF_A = 25.0
TAU_S = 1.5          # healthy/sensor 轨（EQ-FLTH-1 双轨之一）
TAU_ACT_S = 0.4      # actuator 轨（EQ-FLTH-1 双轨之二）
MAGNITUDE_PCT = 55.0  # actuator 默认限幅比例（systems.js converter_current_limit default）
I_CAP_A = IREF_A * MAGNITUDE_PCT / 100.0   # 13.75 A
PLOAD_KW = 30.0
EBAT_KWH = 40.0
SOC0_PCT = 60.0

# L1 热面教学参数（FLTH §2.1 既有冻结原样）
R0_OHM = 0.2          # 25 degC 参考内阻（Ohm）
ALPHA_PER_K = 0.01    # 内阻温度系数（1/K；A-5 符号域 alpha > 0）
C_BAT_J_K = 300.0     # 单节点集总热容（J/K）
H_COOL_W_K = 10.0     # 牛顿冷却系数（W/K）
T_AMB_K = 298.15      # 环境温度 = T_bat(0)（冷启动）
DT_INT = 0.01         # RK4/子步步长（s）；6000 子步/60 s
SUB = int(round(DT_S / DT_INT))   # 10 子步/输出步

# capacity 轨四常量（批准轮定案 CHG-20261114-01，§1.5；教学整定值非实测——A-flcap-params）
BETA_PER_K2 = 5e-7    # EQ-FLTH-10 二次项系数（1/K^2；符号域 beta >= 0——A-5）
K_CAP_PER_K = 0.004   # eta_cap 折损率（1/K；符号域 k_cap >= 0——A-5）
T_CAP0_K = 313.15     # 折损起始温度（= 40 degC；高于 healthy 轨最高温 309.953757 K，
                      # 裕度 3.196 K——A-2 机制：healthy 局 eta_cap ≡ 1 精确）
ETA_FLOOR = 0.5       # 正性下限（A-1 定案；eta_floor > 0——A-5；E_cap >= 20 kWh 全域）

N_SAMPLES = int(round(DURATION_S / DT_S)) + 1   # 601（由参数派生，不硬编码字面 601 语义）
I_F = int(round(T_F / DT_S))                     # 200
V_KW_PER_A = VDC_V / 1000.0                      # 0.4 kW/A

METHOD_ID = "fl001_capacity_rk4_dt0.01"   # 规格 §4 项 6 批准提案原文
METHOD_VERSION = "1"
GOLDEN_ID = "fl001_v3"
MODEL_ID = "FL-001"
MODEL_VERSION = "1.1.0"   # Q1 定案：维持仅登记（golden 语义由 golden_id 承载）
APPROVED_BY = "user（2026-11-14 CHG-20261114-01 批准链）"

FAMILY_NONE = "none"
FAMILY_SENSOR = "sensor_drift"
FAMILY_ACTUATOR = "actuator_fault"

# SERIES_IDS = fl001_v2 全部 16 序列列 + 规格 §4 项 6 新容量信号（E_cap_kWh）= 17 项
# （契约 §2 须含 t；顺序与 fl001_v2 惯例一致、新列按 GTL1 尾插先例）
SERIES_IDS = [
    "t", "I_bat_true_A", "I_bat_meas_A", "bias_A", "I_bat_cap_A",
    "P_bat_true_kW", "P_bat_meas_kW", "P_gen_true_kW",
    "P_load_demand_kW", "P_load_served_kW",
    "SOC_true_pct", "SOC_est_pct", "r_true_kW", "r_meas_kW",
    "T_bat_K", "P_loss_kW",
    "E_cap_kWh",
]

# 4 Run（规格 §4 项 5 Q7 定案：镜像 fl001_v2 全集，全部 thermal_model=on +
# capacity_model=on）
RUNS = [
    {"key": "healthy", "role": "baseline", "family": FAMILY_NONE,
     "feedback_mode": "closed_loop", "faulted": False,
     "thermal_model": "on", "capacity_model": "on"},
    {"key": "closed_loop_fault", "role": "fault", "family": FAMILY_SENSOR,
     "feedback_mode": "closed_loop", "faulted": True,
     "thermal_model": "on", "capacity_model": "on"},
    {"key": "monitor_only", "role": "monitor", "family": FAMILY_SENSOR,
     "feedback_mode": "monitor", "faulted": True,
     "thermal_model": "on", "capacity_model": "on"},
    {"key": "actuator_closed_loop", "role": "fault", "family": FAMILY_ACTUATOR,
     "feedback_mode": "closed_loop", "faulted": True,
     "thermal_model": "on", "capacity_model": "on"},
]


def _oracle_source_sha256():
    """V-03 语义（ORACLE_INTERFACE_D2.md §2 归一 idiom）：本 oracle 源文件自身字节的 SHA-256。"""
    return oracle_base.oracle_source_sha256(os.path.abspath(__file__))


def build_time_grid():
    """t[i] = i·dt（IEEE-754 积原值，禁止累加；fl001_l1_oracle.py:181-183 同式）。"""
    return [i * DT_S for i in range(N_SAMPLES)]


def fo_step(y, target, tau, dt):
    """一阶环节精确离散 + 区间解析积分（plants/fl001.js:45-53 / engine.js:464-471 逐字语义；
    fl001_l1_oracle.py:186-194 逐字复刻——(on,off) 逐位同硬条件的承载面之一）。"""
    ratio = dt / tau
    a = 0.0 if ratio > 40 else math.exp(-ratio)
    return {
        "y": target + (y - target) * a,
        "integral": target * dt + (y - target) * tau * (1.0 - a),
    }


# ---------------------------------------------------------------------------
# capacity 轨代数面（EQ-FLTH-11 折算函数 + EQ-FLTH-10/3 损耗 + EQ-FLTH-12 稳定小根）
# ---------------------------------------------------------------------------
def eta_cap(t_val):
    """EQ-FLTH-11 冻结折损形态：eta_cap(T) = max(eta_floor, 1 − k_cap·max(0, T − T_cap0))。
    T < T_cap0 域内 max(0, 负) ≡ 0.0（IEEE 精确）⇒ eta_cap ≡ 1.0 精确（A-2 机制）。"""
    return max(ETA_FLOOR, 1.0 - K_CAP_PER_K * max(0.0, t_val - T_CAP0_K))


def e_cap_kwh(t_val):
    """EQ-FLTH-11：E_cap(T) = eta_cap(T)·E_nom（kWh）。"""
    return eta_cap(t_val) * EBAT_KWH


def p_loss_w(i_val, t_val, cap_on):
    """EQ-FLTH-10/3：P_loss = I^2·R_int，单位 W（I: A, R: Ohm）。
    cap_on=True：R_int = R0·(1 + alpha·theta + beta·theta^2)（EQ-FLTH-10 冻结式）；
    cap_on=False：R_int = R0·(1 + alpha·theta)（EQ-FLTH-2 现行线性式逐字复刻——
    fl001_l1_oracle.py:197-200 同表达式同 fp 求值序，(on,off) 逐位同硬条件承载面）。"""
    theta = t_val - T_AMB_K
    if cap_on:
        return i_val * i_val * R0_OHM * (1.0 + ALPHA_PER_K * theta
                                         + BETA_PER_K2 * theta * theta)
    return i_val * i_val * R0_OHM * (1.0 + ALPHA_PER_K * theta)


def rhs_thermal(i_val, t_val, cap_on):
    """EQ-FLTH-4 RHS：dT/dt = (P_loss − h_cool·theta)/C_bat；同时返回该点 P_loss（W）
    （k1 的 P_loss 即子步梯形起点腿——同一表达式，FLTH §2.3 ②③ 同源；
    fl001_l1_oracle.py:203-208 同构，cap_on 分支见 p_loss_w）。"""
    theta = t_val - T_AMB_K
    pl = p_loss_w(i_val, t_val, cap_on)
    return (pl - H_COOL_W_K * theta) / C_BAT_J_K, pl


def _theta_ss_form(i_val, beta):
    """EQ-FLTH-12 稳定小根形态（beta 参数化——FCAP-7 beta=0 退化 0.0 ulp 核验用）：
    theta_- = 2·I^2·R0 / [(h − alpha·I^2·R0) + sqrt(Delta)]，
    Delta = (h − alpha·I^2·R0)^2 − 4·beta·(I^2·R0)^2。有理化冻结形态（A-3）。"""
    p = i_val * i_val * R0_OHM
    q = H_COOL_W_K - ALPHA_PER_K * p
    delta = q * q - 4.0 * beta * p * p
    return 2.0 * p / (q + math.sqrt(delta)), delta


def theta_ss_small_root(i_val):
    """EQ-FLTH-12 冻结稳定小根 + 判别式（beta = BETA_PER_K2 定案值）。
    返回 (theta_minus_K, Delta_W2)。beta=0 时精确退化为 EQ-FLTH-9 线性闭式
    （I^2·R0/(h − alpha·I^2·R0)——2p/(2q) 与 p/q 为同一数学商的正确舍入，逐位一致）。"""
    return _theta_ss_form(i_val, BETA_PER_K2)


def _riccati_substep_exact(i_val, theta0, h, beta=BETA_PER_K2):
    """冻结 I 子步内常系数 Riccati 方程 theta' = a·theta^2 + b·theta + c 的精确闭式解
    （FCAP-7 解析交叉参照——规格 §4 项 3 定案「Riccati 闭式交叉，tanh/artanh 分域形态，
    随 EQ-FLTH-12 稳定小根同族闭式」）。
    实现 = 同族闭式经 Möbius 变量 w = (theta − theta_-)/(theta − theta_+) 的代数等价
    稳定重排：w(t) = w0·exp(a·(theta_- − theta_+)·t)，theta = (w·theta_+ − theta_-)/(w − 1)。
    直形式 theta = yc + m·coth(artanh(m/(theta0 − yc)) − sqrt(Delta)·h/(2C))
    （_riccati_substep_coth，|z0| > 1 轨内分支）在本参数域大根 theta_+ ~1e4…1e6 量级
    产生 ~1e-11 级灾难性相消（FCAP-7 实测记录），故求解式取 w 形、coth 直形式仅作
    同族交叉一致性登记——与 EQ-FLTH-12「naive 求根式仅作展示不作求解式」同一纪律。
    beta = 0（精确 0.0）时 a = 0，退化为 FLTH FL-7 线性常系数指数解（逐字复刻
    fl001_l1_oracle.py:429-433 表达式）。"""
    p = i_val * i_val * R0_OHM
    if beta == 0.0:
        # FLTH FL-7 线性指数交叉（beta = 0 精确退化；fl001_l1_oracle.py:429-433 逐字）
        i2_r0_a = p * ALPHA_PER_K
        lam = (i2_r0_a - H_COOL_W_K) / C_BAT_J_K
        theta_ss = p / (H_COOL_W_K - i2_r0_a)
        return theta_ss + (theta0 - theta_ss) * math.exp(lam * h)
    q = H_COOL_W_K - ALPHA_PER_K * p
    delta_abs = q * q - 4.0 * beta * p * p
    sq = math.sqrt(delta_abs)
    y_m = 2.0 * p / (q + sq)                 # EQ-FLTH-12 稳定小根（有理化形态）
    y_p = y_m + sq / (beta * p)              # 大根 = 小根 + sqrt(Delta)/a
    w0 = (theta0 - y_m) / (theta0 - y_p)
    w_end = w0 * math.exp((beta * p / C_BAT_J_K) * (y_m - y_p) * h)
    return (w_end * y_p - y_m) / (w_end - 1.0)


def _riccati_substep_coth(i_val, theta0, h):
    """tanh/artanh 分域形态直形式（规格 §4 项 3 冻结形态字面承载）。三分域：
    z0 = (theta0 − yc)/m，yc = (theta_- + theta_+)/2、m = (theta_+ − theta_-)/2、
    a·m = sqrt(Delta)/(2C)（a = beta·I^2·R0/C_bat）：
      z0 < −1（theta0 < theta_-，轨内正常升温段）：coth 支
        theta = yc + m·coth(artanh(1/z0) − sqrt(Delta)·h/(2C))；
      |z0| < 1（theta_- < theta0 < theta_+，故障 Run 降温段——clf 后段 I=15 A 的
        theta > theta_(15)）：tanh 支 theta = yc + m·tanh(artanh(z0) − a·m·h)；
      z0 > 1（theta0 > theta_+ 越域段）：coth 支同式。
    z0 = ±1（theta0 = theta_-/theta_+）为精确不动点。
    与 _riccati_substep_exact 代数等价（同一精确解），FCAP-7 作同族交叉一致性登记
    （非求解式——本参数域大根 theta_+ ~1e4…1e6 量级使直形式带相消噪声，实测记录于
    FCAP-7 observed）。"""
    p = i_val * i_val * R0_OHM
    q = H_COOL_W_K - ALPHA_PER_K * p
    delta_abs = q * q - 4.0 * BETA_PER_K2 * p * p
    sq = math.sqrt(delta_abs)
    y_m = 2.0 * p / (q + sq)
    y_p = y_m + sq / (BETA_PER_K2 * p)
    yc = 0.5 * (y_m + y_p)
    m = 0.5 * (y_p - y_m)
    z0 = (theta0 - yc) / m
    a_m = 0.5 * sq * h / C_BAT_J_K          # a·m·h = sqrt(Delta)·h/(2C)
    if z0 <= -1.0:
        if z0 == -1.0:
            return y_m                       # theta0 == theta_- 精确不动点
        s = math.atanh(1.0 / z0) - a_m
        return yc + m / math.tanh(s)
    if z0 >= 1.0:
        if z0 == 1.0:
            return y_p                       # theta0 == theta_+ 精确不动点
        s = math.atanh(1.0 / z0) - a_m
        return yc + m / math.tanh(s)
    s = math.atanh(z0) - a_m
    return yc + m * math.tanh(s)


# ---------------------------------------------------------------------------
# L0 闭式参照（MODEL_VALIDATION_SPEC §1.2/§1.3 独立复刻——FCAP-1 冻结锚点环境校验与
# FCAP-3 电气面跨轨恒等的参照面；非 import fl001_oracle/fl001_l1_oracle，方程权威 =
# MODEL_VALIDATION_SPEC §1.2/§1.3 + 本规格 §1.3 EQ-FLTH-1「电气面原样」。
# fl001_l1_oracle.py:216-324 同构独立复刻）
# ---------------------------------------------------------------------------
def _l0_b_at(t, faulted, family=FAMILY_SENSOR):
    """EQ-1：阶跃偏置（仅 sensor_drift 家族；actuator 轨 b≡0）。t = t_f 处取右极限。"""
    if faulted and family == FAMILY_SENSOR and t >= T_F:
        return BIAS_A
    return 0.0


def _l0_i_true_at(t, mode, faulted, family=FAMILY_SENSOR):
    """EQ-3/EQ-B：真实电流闭式解（采样行值，t=t_f 为 post）；monitor 分支按 family 守卫。"""
    if not faulted:
        return IREF_A
    if family == FAMILY_ACTUATOR:
        if t < T_F:
            return IREF_A
        u = t - T_F
        return I_CAP_A + (IREF_A - I_CAP_A) * math.exp(-u / TAU_ACT_S)
    if mode == "monitor":
        return IREF_A
    if t < T_F:
        return IREF_A
    u = t - T_F
    return (IREF_A - BIAS_A) + BIAS_A * math.exp(-u / TAU_S)


def _l0_int_i_true(x, mode, faulted, family=FAMILY_SENSOR):
    """∫[0,x] I_true dt 的解析（事件感知）积分。"""
    if x <= 0.0:
        return 0.0
    if x <= T_F or not faulted:
        return IREF_A * x
    u = x - T_F
    if family == FAMILY_ACTUATOR:
        return (IREF_A * T_F + I_CAP_A * u
                + (IREF_A - I_CAP_A) * TAU_ACT_S * (1.0 - math.exp(-u / TAU_ACT_S)))
    if mode == "monitor":
        return IREF_A * x
    return (IREF_A * T_F + (IREF_A - BIAS_A) * u
            + BIAS_A * TAU_S * (1.0 - math.exp(-u / TAU_S)))


def _l0_int_b(x, faulted, family=FAMILY_SENSOR):
    """∫[0,x] b dt（阶跃点测度为零，事件感知；仅 sensor_drift 家族非零）。"""
    if not faulted or family != FAMILY_SENSOR or x <= T_F:
        return 0.0
    return BIAS_A * (x - T_F)


def _l0_soc_true_at(x, mode, faulted, family=FAMILY_SENSOR):
    e_kws = V_KW_PER_A * _l0_int_i_true(x, mode, faulted, family)
    return SOC0_PCT - 100.0 * e_kws / (EBAT_KWH * 3600.0)


def _l0_soc_est_at(x, mode, faulted, family=FAMILY_SENSOR):
    e_kws = V_KW_PER_A * (_l0_int_i_true(x, mode, faulted, family)
                          + _l0_int_b(x, faulted, family))
    return SOC0_PCT - 100.0 * e_kws / (EBAT_KWH * 3600.0)


def _l0_scalars(mode, faulted, family=FAMILY_SENSOR):
    """fl001_v1 标量面（20 键）的闭式复刻——fl001_oracle.simulate_run scalars 表达式逐式
    同构（独立实现，供 FCAP-1 对冻结 golden 的环境校验）。"""
    t_grid = build_time_grid()
    x_end = t_grid[-1]
    int_i = _l0_int_i_true(x_end, mode, faulted, family)
    int_b = _l0_int_b(x_end, faulted, family)
    e_bat_true = V_KW_PER_A * int_i / 3600.0
    e_bat_meas = V_KW_PER_A * (int_i + int_b) / 3600.0
    e_gen = (PLOAD_KW * x_end - V_KW_PER_A * int_i) / 3600.0
    e_load = PLOAD_KW * x_end / 3600.0
    soc_true_end = SOC0_PCT - 100.0 * (V_KW_PER_A * int_i) / (EBAT_KWH * 3600.0)
    soc_est_end = SOC0_PCT - 100.0 * (V_KW_PER_A * (int_i + int_b)) / (EBAT_KWH * 3600.0)
    max_r_true = 0.0
    max_r_meas = 0.0
    for ti in t_grid:
        b = _l0_b_at(ti, faulted, family)
        i_true = _l0_i_true_at(ti, mode, faulted, family)
        p_bat = V_KW_PER_A * i_true
        p_bat_meas = V_KW_PER_A * (i_true + b)
        p_gen = PLOAD_KW - p_bat
        r_true = p_gen + p_bat - PLOAD_KW
        r_meas = p_gen + p_bat_meas - PLOAD_KW
        if abs(r_true) > max_r_true:
            max_r_true = abs(r_true)
        if abs(r_meas) > max_r_meas:
            max_r_meas = abs(r_meas)
    return {
        "E_bat_true_kWh": e_bat_true,
        "E_bat_meas_kWh": e_bat_meas,
        "E_gen_true_kWh": e_gen,
        "E_load_served_kWh": e_load,
        "SOC_true_end_pct": soc_true_end,
        "SOC_est_end_pct": soc_est_end,
        "SOC_err_end_pp": soc_est_end - soc_true_end,
        "I_true_19p9_A": _l0_i_true_at(t_grid[I_F - 1], mode, faulted, family),
        "I_meas_19p9_A": _l0_i_true_at(t_grid[I_F - 1], mode, faulted, family)
                         + _l0_b_at(t_grid[I_F - 1], faulted, family),
        "t_19p9_s": t_grid[I_F - 1],
        "I_true_20post_A": _l0_i_true_at(T_F, mode, faulted, family),
        "I_meas_20post_A": _l0_i_true_at(T_F, mode, faulted, family)
                           + _l0_b_at(T_F, faulted, family),
        "I_true_21p5_A": _l0_i_true_at(21.5, mode, faulted, family),
        "I_true_26_A": _l0_i_true_at(26.0, mode, faulted, family),
        "I_true_60_A": _l0_i_true_at(x_end, mode, faulted, family),
        "P_bat_true_21p5_kW": V_KW_PER_A * _l0_i_true_at(21.5, mode, faulted, family),
        "P_gen_true_21p5_kW": PLOAD_KW - V_KW_PER_A * _l0_i_true_at(21.5, mode, faulted, family),
        "max_abs_r_true_kW": max_r_true,
        "max_abs_r_meas_kW": max_r_meas,
        "int_I_true_60s_As": int_i,
    }


# ---------------------------------------------------------------------------
# RK4 分区积分（§4 项 3 定案更新序的唯一实现；dt_int 可变仅用于 FCAP-7 半步长自收敛
# 登记，thermal="exact" 仅用于 FCAP-7 交叉（on：Riccati 闭式 / off：FL-7 线性指数）——
# 冻结 I 下子步内常系数方程的精确解参照，非生产轨）
# ---------------------------------------------------------------------------
def _simulate_core(spec, dt_int=DT_INT, load0=PLOAD_KW, bias=BIAS_A,
                   capacity="on", thermal="rk4"):
    """按 §4 项 3 定案更新序仿真一轮；返回 series/integrals/scalars/metrics/events。

    spec 经 resolve_run_spec 归一（str 归一式 / dict 兼容式）；thermal_model 须为
    "on"（本 oracle 只承载 (on,·) 域；off 轨属 fl001_v1/fl001_oracle 冻结面）；
    capacity ∈ {"on","off"}——"off" 为 (on,off) 复现路径（FCAP-1/FCAP-3 对
    fl001_v2 冻结 golden 的逐位同复核面；结构硬条件 §3.1）。bias 覆盖仅用于
    FCAP-5/FCAP-8 域角点（load0=10 + b=30 充电角点，§3.3 ⓪/⑥），非生产轨。
    """
    spec = oracle_base.resolve_run_spec(RUNS, spec)
    if spec.get("thermal_model", "on") != "on":
        raise ValueError("fl001_cap_oracle 仅承载 thermal_model=on 轨，得到 %r"
                         % (spec.get("thermal_model"),))
    if capacity not in ("on", "off"):
        raise ValueError("capacity 口径须为 on|off，得到 %r" % (capacity,))
    if thermal not in ("rk4", "exact"):
        raise ValueError("thermal 口径须为 rk4|exact，得到 %r" % (thermal,))
    cap_on = capacity == "on"
    family = spec["family"]
    faulted = spec["faulted"]
    mode = spec["feedback_mode"]
    monitor = mode == "monitor"
    is_act = family == FAMILY_ACTUATOR
    is_sensor = family == FAMILY_SENSOR
    tau = TAU_ACT_S if is_act else TAU_S
    i_ref = (load0 - 20.0) / V_KW_PER_A          # plants/fl001.js:31 同式（load0=30 → 25 A）
    i_cap = i_ref * MAGNITUDE_PCT / 100.0 if is_act else None   # EQ-A（engine.js:585 同式）
    t_start = T_F if faulted else None
    sub = int(round(DT_S / dt_int))
    h = dt_int

    def b_at(time):
        # EQ-FLTH-1/EQ-1 阶跃偏置；1e-9 守卫同 plants/fl001.js:34（t=20 阶跃落子步边界）
        return bias if (faulted and is_sensor and t_start is not None
                        and time >= t_start - 1e-9) else 0.0

    t = build_time_grid()
    n = N_SAMPLES - 1
    series = {}
    for sid in SERIES_IDS:
        series[sid] = t if sid == "t" else [None] * (n + 1)

    i_true = i_ref
    t_bat = T_AMB_K
    int_i = 0.0
    int_b = 0.0
    int_demand = 0.0
    int_ploss_ws = 0.0    # E_loss 账本（W·s；子步梯形，FLTH Q4 体例）
    int_pgen_kws = 0.0    # FCAP-2 独立同基异序累积（kW·s）
    corr_kwh = 0.0        # 容量修正累积器（EQ-FLTH-11 离散口径；无量纲，×100 → pp）

    def record(k):
        time = t[k]
        b = b_at(time)
        i_meas = i_true + b
        p_bat = V_KW_PER_A * i_true
        p_bat_meas = V_KW_PER_A * i_meas
        p_loss_kw = p_loss_w(i_true, t_bat, cap_on) / 1000.0   # 当前状态值，非累计值
        p_gen = load0 - p_bat + p_loss_kw                # EQ-FLTH-5（守恒面 (a)）
        r_true = p_gen + p_bat - load0 - p_loss_kw       # EQ-FLTH-6（≡ 0）
        r_meas = p_gen + p_bat_meas - load0 - p_loss_kw  # EQ-FLTH-6（≡ 0.4·b）
        series["I_bat_true_A"][k] = i_true
        series["I_bat_meas_A"][k] = i_meas
        series["bias_A"][k] = b
        # I_bat_cap_A 事件域信号（engine.js:590 同口径）：仅 actuator 且 t>=t_start 行
        series["I_bat_cap_A"][k] = i_cap if (is_act and time >= t_start - 1e-9) else None
        series["P_bat_true_kW"][k] = p_bat
        series["P_bat_meas_kW"][k] = p_bat_meas
        series["P_gen_true_kW"][k] = p_gen
        series["P_load_demand_kW"][k] = load0
        series["P_load_served_kW"][k] = load0
        # SOC_est：原式逐字不动（测量链零升级——与 fl001_v2 逐位同，§1.4）
        series["SOC_est_pct"][k] = SOC0_PCT - (V_KW_PER_A * int_i + V_KW_PER_A * int_b) / (EBAT_KWH * 3600.0) * 100.0
        if cap_on:
            # EQ-FLTH-11 离散口径：名义单除项（与 EQ-FLTH-7 原式同源同序）− 100·corr。
            # T < T_cap0 域内 corr ≡ 0.0（IEEE 精确）⇒ 与名义式逐位同（A-2 机制）
            series["SOC_true_pct"][k] = SOC0_PCT - (V_KW_PER_A * int_i) / (EBAT_KWH * 3600.0) * 100.0 - 100.0 * corr_kwh
        else:
            # capacity_model=off 域：EQ-FLTH-7 原式逐字不动（fl001_l1_oracle.py:397 同式，
            # (on,off) 与 fl001_v2 逐位同硬条件的承载面）
            series["SOC_true_pct"][k] = SOC0_PCT - (V_KW_PER_A * int_i) / (EBAT_KWH * 3600.0) * 100.0
        series["r_true_kW"][k] = r_true
        series["r_meas_kW"][k] = r_meas
        series["T_bat_K"][k] = t_bat
        series["P_loss_kW"][k] = p_loss_kw
        series["E_cap_kWh"][k] = e_cap_kwh(t_bat)   # 当前状态代数面（EQ-FLTH-11）

    record(0)
    for k in range(1, n + 1):
        for j in range(sub):
            time = (k - 1) * sub * h + j * h     # engine.js:547 同式（FLTH §2.3 子步网格）
            b = b_at(time)                        # 输入冻结于子步起点右值
            int_demand += load0 * h               # engine.js:548 同构（E_load 左矩形）
            int_b += b * h                        # 更新序 ①（intB 同源）
            # ① 电气面（L0 序保留；plants/fl001.js:38-53 逐字语义）
            i_start = i_true                      # 同时是 ② 的冻结输入（FLTH Q2）
            target = i_ref - (0.0 if monitor else b)
            if is_act and time >= t_start - 1e-9:
                target = min(target, i_cap)       # EQ-A（engine.js:631 同式）
            st = fo_step(i_start, target, tau, h)
            i_end = st["y"]
            int_i += st["integral"]               # ①（intI 精确指数区间积分）
            # ①' 容量修正累积器（EQ-FLTH-11 离散口径；E_cap 冻结于子步起点右值 t_bat）
            if cap_on:
                e_cap_start = e_cap_kwh(t_bat)
                corr_kwh += (V_KW_PER_A * st["integral"] / 3600.0) * (1.0 / e_cap_start - 1.0 / EBAT_KWH)
            # ② RK4（热状态 T_bat；RHS 内 I 冻结于 i_start——FLTH Q2 定案口径）
            if thermal == "rk4":
                k1, pl_start = rhs_thermal(i_start, t_bat, cap_on)
                k2, _ = rhs_thermal(i_start, t_bat + 0.5 * h * k1, cap_on)
                k3, _ = rhs_thermal(i_start, t_bat + 0.5 * h * k2, cap_on)
                k4, _ = rhs_thermal(i_start, t_bat + h * k3, cap_on)
                t_end = t_bat + h / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4)
            else:
                # FCAP-7 交叉参照：冻结 I 下子步内常系数方程精确解
                #（on：EQ-FLTH-10 Riccati 闭式；off：FL-7 线性指数——beta=0 精确退化）
                theta0 = t_bat - T_AMB_K
                theta_end = _riccati_substep_exact(i_start, theta0, h,
                                                   BETA_PER_K2 if cap_on else 0.0)
                t_end = T_AMB_K + theta_end
                pl_start = p_loss_w(i_start, t_bat, cap_on)
            # ③ E_loss 累计（子步梯形）+ 独立同基异序累积（FCAP-2）
            pl_end = p_loss_w(i_end, t_end, cap_on)
            int_ploss_ws += 0.5 * (pl_start + pl_end) * h
            int_pgen_kws += (load0 * h - V_KW_PER_A * st["integral"]
                             + 0.5 * (pl_start + pl_end) * h / 1000.0)
            # 子步末提交
            i_true = i_end
            t_bat = t_end
        record(k)

    # 能量账本（kW·s 面；EQ-FLTH-8 注册式——与 E_bat 同积分基）
    e_bat_kws = V_KW_PER_A * int_i
    e_bat_meas_kws = V_KW_PER_A * int_i + V_KW_PER_A * int_b   # engine.js:563 同构
    e_load_kws = int_demand
    e_loss_kws = int_ploss_ws / 1000.0
    e_source_kws = e_load_kws - e_bat_kws + e_loss_kws         # EQ-FLTH-8

    scalars = {
        "E_bat_true_kWh": e_bat_kws / 3600.0,
        "E_bat_meas_kWh": e_bat_meas_kws / 3600.0,
        "E_gen_true_kWh": e_source_kws / 3600.0,
        "E_load_served_kWh": e_load_kws / 3600.0,
        "SOC_true_end_pct": series["SOC_true_pct"][-1],
        "SOC_est_end_pct": series["SOC_est_pct"][-1],
        "SOC_err_end_pp": series["SOC_est_pct"][-1] - series["SOC_true_pct"][-1],
        "I_true_19p9_A": series["I_bat_true_A"][I_F - 1],
        "I_meas_19p9_A": series["I_bat_meas_A"][I_F - 1],
        "t_19p9_s": t[I_F - 1],
        "I_true_20post_A": series["I_bat_true_A"][I_F],
        "I_meas_20post_A": series["I_bat_meas_A"][I_F],
        "I_true_21p5_A": series["I_bat_true_A"][215],
        "I_true_26_A": series["I_bat_true_A"][260],
        "I_true_60_A": series["I_bat_true_A"][-1],
        "P_bat_true_21p5_kW": series["P_bat_true_kW"][215],
        "P_gen_true_21p5_kW": series["P_gen_true_kW"][215],
        "max_abs_r_true_kW": max(abs(v) for v in series["r_true_kW"]),
        "max_abs_r_meas_kW": max(abs(v) for v in series["r_meas_kW"]),
        "int_I_true_60s_As": int_i,
        # 热标量（FLTH §4 项 7 体例）+ 容量标量（E_cap(60) 锚点——规格 §3.2 E_cap 行）
        "E_loss_kWh": e_loss_kws / 3600.0,
        "T_bat_end_K": series["T_bat_K"][-1],
        "E_cap_end_kWh": series["E_cap_kWh"][-1],
    }

    if faulted:
        focal_change = series["I_bat_true_A"][-1] - series["I_bat_true_A"][I_F]
    else:
        focal_change = None  # 无故障运行不适用（value:null + unavailable_reason，v2 同构）

    metrics = {
        "E_bat_true_60s": {"value": scalars["E_bat_true_kWh"], "unit": "kWh", "method": METHOD_ID},
        "E_gen_true_60s": {"value": scalars["E_gen_true_kWh"], "unit": "kWh", "method": METHOD_ID},
        "E_load_served_60s": {"value": scalars["E_load_served_kWh"], "unit": "kWh", "method": METHOD_ID},
        "SOC_true_end_pct": {"value": scalars["SOC_true_end_pct"], "unit": "%", "method": METHOD_ID},
        "SOC_est_end_pct": {"value": scalars["SOC_est_end_pct"], "unit": "%", "method": METHOD_ID},
        "SOC_err_end_pp": {"value": scalars["SOC_err_end_pp"], "unit": "pp", "method": METHOD_ID},
        "max_abs_r_true_kW": {"value": scalars["max_abs_r_true_kW"], "unit": "kW", "method": "algebraic"},
        "max_abs_r_meas_kW": {"value": scalars["max_abs_r_meas_kW"], "unit": "kW", "method": "algebraic"},
        "focal_change_A": {"value": focal_change, "unit": "A", "method": METHOD_ID},
        "I_true_26s_A": {"value": scalars["I_true_26_A"], "unit": "A", "method": METHOD_ID},
        "I_meas_20post_A": {"value": scalars["I_meas_20post_A"], "unit": "A", "method": METHOD_ID},
    }

    integrals = {
        "E_load_kws": e_load_kws,
        "E_bat_kws": e_bat_kws,
        "E_bat_meas_kws": e_bat_meas_kws,
        "E_loss_kws": e_loss_kws,
        "E_source_kws": e_source_kws,
        "E_source_alt_kws": int_pgen_kws,
        "intI_As": int_i,
        "intB_As": int_b,
        "intPloss_Ws": int_ploss_ws,
        "soc_corr_pp": 100.0 * corr_kwh,   # 容量修正累积器（EQ-FLTH-11 离散口径）
    }

    events = _fault_events(spec, series)
    return {"key": spec["key"], "role": spec["role"],
            "feedback_mode": mode, "faulted": faulted,
            "thermal_model": "on", "capacity_model": capacity,
            "series": series, "integrals": integrals,
            "scalars": scalars, "metrics": metrics, "events": events}


def simulate_run(spec):
    """归一契约入口（ORACLE_INTERFACE_D2.md §2）：str run key / spec dict 双形态，
    经 oracle_base.resolve_run_spec 归一；返回 series/scalars/metrics/events。
    生产轨 = (thermal_model, capacity_model) = (on, on)（fl001_v3 三元路由）。"""
    return _simulate_core(spec, DT_INT)


# ---------------------------------------------------------------------------
# 事件编码 v1（fl001_v2 事件面对齐；变量集零扩展——规格 §2 事件快照行：E_cap 不入事件
# 快照，T_bat 不入事件快照）
# ---------------------------------------------------------------------------
def _fault_events(spec, series):
    events = []
    if not spec["faulted"]:
        return events
    family = spec.get("family", FAMILY_SENSOR)
    i_post_true = series["I_bat_true_A"][I_F]   # post 采样行（actuator：钳位未及状态仍 25 A）
    if family == FAMILY_ACTUATOR:
        act_vars_units = {"I_bat_true_A": "A", "I_bat_meas_A": "A",
                          "bias_A": "A", "I_bat_cap_A": "A"}
        events.append({
            "event_id": "EV-001",
            "event_type": "actuator_limit",
            "trigger_s": T_F,
            "target_signal": "I_bat_cap_A",
            "magnitude": MAGNITUDE_PCT,
            "unit": "%",
            "snapshots": [
                {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
                 "t_s": T_F, "derivation": "left_limit",
                 "variables": {"I_bat_true_A": i_post_true,
                               "I_bat_meas_A": i_post_true,
                               "bias_A": 0.0,
                               "I_bat_cap_A": None},
                 "units": act_vars_units,
                 "fault_id": "converter_current_limit"},
                {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
                 "t_s": T_F, "derivation": "post_sample",
                 "variables": {"I_bat_true_A": i_post_true,
                               "I_bat_meas_A": i_post_true,
                               "bias_A": 0.0,
                               "I_bat_cap_A": I_CAP_A},
                 "units": act_vars_units,
                 "fault_id": "converter_current_limit"},
            ],
        })
    else:
        events.append({
            "event_id": "EV-001",
            "event_type": "sensor_bias",
            "trigger_s": T_F,
            "target_signal": "bias_A",
            "magnitude": BIAS_A,
            "unit": "A",
            "snapshots": [
                {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
                 "t_s": T_F, "derivation": "left_limit",
                 "variables": {"I_bat_true_A": i_post_true,
                               "I_bat_meas_A": i_post_true + 0.0,
                               "bias_A": 0.0},
                 "units": {"I_bat_true_A": "A", "I_bat_meas_A": "A", "bias_A": "A"},
                 "fault_id": "I_bat_sensor_bias"},
                {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
                 "t_s": T_F, "derivation": "post_sample",
                 "variables": {"I_bat_true_A": i_post_true,
                               "I_bat_meas_A": i_post_true + BIAS_A,
                               "bias_A": BIAS_A},
                 "units": {"I_bat_true_A": "A", "I_bat_meas_A": "A", "bias_A": "A"},
                 "fault_id": "I_bat_sensor_bias"},
            ],
        })
    return events


# ---------------------------------------------------------------------------
# 自检 FCAP-1…FCAP-8（FL001_CAPACITY_G2B_SPEC_APPROVED §4 项 4 + B-4 修正；失败 => exit 2）
# 记录面字符串保持 ASCII 安全（避免 GBK 控制台编码陷阱）
# ---------------------------------------------------------------------------
#: FCAP-5 锚点判据：预填锚点（§3.2/§3.3 批准扫描值，2~12 位有效数字舍入）与本 oracle
#: 实现输出的容差——任务书口径「偏差超 1e-3 量级须停下核对更新序」；终值以本 oracle
#: emit 冻结（实测 observed 记录于各 check）。
A_TOL_T = 1e-6        # T/theta 6 位小数舍入行（309.953757 / 425.120236 等）
A_TOL_E = 1e-9        # E_loss/E_cap 12 位舍入行
A_TOL_P = 1e-6        # P_loss 9 位舍入行
A_TOL_SOC = 1e-6      # SOC 6 位舍入行
A_TOL_DIR = 5e-4      # 3~4 位方向性锚点（ΔT +0.416 K、SOC 加速 −0.3303/+0.0639 pp）
A_TOL_M = 1e-4        # 4 位裕度行（+1.0826 W/K）
A_TOL_EXACT = 1e-9    # 闭式/精确算术行（Delta、sqrt(Delta)、beta=0 六点、边界 I_b）
FCAP7_HALFSTEP_K = 5e-3   # 半步长自收敛登记上界（FLTH FL-7 同值体例；实测记录在案）
FCAP7_CROSS_K = 1e-9      # RK4 vs 子步闭式交叉判据（A-2 同款下限冻结；实测值记录，非预填）
FCAP7_COTH_K = 1e-8       # w 形 vs coth/artanh 直形同族一致性登记（相消噪声量级，实测记录）


def _amax(arr):
    m = 0.0
    for v in arr:
        if v is not None and math.isfinite(v) and abs(v) > m:
            m = abs(v)
    return m


def _p_limit(arr, gate):
    """T-B `_kW` 分支限值式（verify_golden.py series_limit 同构——FCAP-1 热面 P 判据用）。"""
    return max(gate["P_kW_atol"], gate["P_kW_rtol"] * max(1.0, _amax(arr)))


def _golden_paths():
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return (os.path.join(root, "data", "golden", "fl001_v1.json"),
            os.path.join(root, "data", "golden", "fl001_v2.json"))


def _load_golden(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def self_check():
    """独立自检 FCAP-1…FCAP-8（规格 §4 项 4 + B-4 修正；不复用 FL/FEC/GL/PS/WS/MS 条目）。"""
    checks = []

    def rec(cid, ok, observed, tolerance, note):
        checks.append({"check_id": cid, "status": "pass" if ok else "fail",
                       "observed": observed, "tolerance": tolerance, "note": note})
        return ok

    gate = TOLERANCES["gate"]
    runs = [simulate_run(spec) for spec in RUNS]
    by_key = {r["key"]: r for r in runs}
    s_h = by_key["healthy"]["series"]
    s_a = by_key["closed_loop_fault"]["series"]
    s_m = by_key["monitor_only"]["series"]
    s_f = by_key["actuator_closed_loop"]["series"]
    sc_h = by_key["healthy"]["scalars"]
    sc_a = by_key["closed_loop_fault"]["scalars"]
    sc_m = by_key["monitor_only"]["scalars"]
    sc_f = by_key["actuator_closed_loop"]["scalars"]

    v1_path, v2_path = _golden_paths()
    g_v1 = None
    g_v2 = None
    try:
        g_v1 = _load_golden(v1_path)
    except Exception as exc:  # noqa: BLE001
        rec("FCAP-1-l0-frozen-anchors", False, "fl001_v1.json unreadable: %s" % exc,
            "read-only compare", "environment check requires frozen fl001_v1")
    try:
        g_v2 = _load_golden(v2_path)
    except Exception as exc:  # noqa: BLE001
        rec("FCAP-1-v2-full-series-reproduction", False,
            "fl001_v2.json unreadable: %s" % exc,
            "read-only compare", "environment check requires frozen fl001_v2")

    # ---- FCAP-1 环境校验（规格 §4 项 4：(a) fl001_v1 闭式复现 T-A 解析面 <=1e-9 +
    #      (b) fl001_v2 4 Run 全序列复现——(on,off) 路径逐位同硬条件）----
    # (a) fl001_v1 标量闭式复现（FL-1 同构；参照 = data/golden/fl001_v1.json 只读）
    if g_v1 is not None:
        worst1 = None
        n_cmp = 0
        ok1 = True
        detail1 = "ok"
        for spec in RUNS:
            ref = g_v1["runs"][spec["key"]]["scalars"]
            mine = _l0_scalars(spec["feedback_mode"], spec["faulted"], spec["family"])
            for key, gv in ref.items():
                if key not in mine:
                    ok1 = False
                    detail1 = "scalar key missing in replication: %s" % key
                    break
                d = abs(mine[key] - gv)
                n_cmp += 1
                if worst1 is None or d > worst1:
                    worst1 = d
            if not ok1:
                break
        if ok1:
            ok1 = worst1 <= 1e-9
        rec("FCAP-1-l0-frozen-anchors", ok1,
            (detail1 if not ok1 else
             "worst|diff|=%.3e over %d scalars x 4 runs" % (worst1, n_cmp)),
            "<=1e-9 (closed-form replication vs fl001_v1 frozen scalars)",
            "L0 frozen-anchor environment check (EQ-1..EQ-6 closed forms, read-only)")

    # (b) fl001_v2 4 Run 全序列复现（(on,off) 路径；电气/测量面 ±1e-9；热面挂 FCAP-7
    #     实测冻结制 gate——B-4 定案：双实现散差 x>=10 且下限 >=1e-9，不做位级承诺）
    if g_v2 is not None:
        elec_series = ("I_bat_true_A", "I_bat_meas_A", "bias_A", "I_bat_cap_A",
                       "P_bat_true_kW", "P_bat_meas_kW", "P_load_demand_kW",
                       "P_load_served_kW", "SOC_true_pct", "SOC_est_pct",
                       "r_true_kW", "r_meas_kW")
        therm_series_t = ("T_bat_K",)
        therm_series_p = ("P_loss_kW", "P_gen_true_kW")
        elec_scalars = ("E_bat_true_kWh", "E_bat_meas_kWh", "E_load_served_kWh",
                        "SOC_true_end_pct", "SOC_est_end_pct", "SOC_err_end_pp",
                        "I_true_19p9_A", "I_meas_19p9_A", "I_true_20post_A",
                        "I_meas_20post_A", "I_true_21p5_A", "I_true_26_A",
                        "I_true_60_A", "t_19p9_s", "P_bat_true_21p5_kW",
                        "int_I_true_60s_As", "max_abs_r_true_kW", "max_abs_r_meas_kW")
        therm_scalars_e = ("E_gen_true_kWh", "E_loss_kWh")
        therm_scalars_t = ("T_bat_end_K",)
        worst_e = 0.0
        worst_t = 0.0
        worst_p = 0.0
        worst_e_kwh = 0.0
        ok1b = True
        detail1b = "ok"
        for spec in RUNS:
            g_run = g_v2["runs"][spec["key"]]
            mine = _simulate_core(spec, DT_INT, capacity="off")
            for sid in elec_series:
                g_arr = g_run["series"][sid]
                f_arr = mine["series"][sid]
                for a, bv in zip(g_arr, f_arr):
                    if a is None and bv is None:
                        continue
                    if a is None or bv is None:
                        ok1b = False
                        detail1b = "null phase mismatch in %s" % sid
                        break
                    d = abs(a - bv)
                    if d > worst_e:
                        worst_e = d
                if not ok1b:
                    break
            if not ok1b:
                break
            for sid in therm_series_t:
                for a, bv in zip(g_run["series"][sid], mine["series"][sid]):
                    worst_t = max(worst_t, abs(a - bv))
            for sid in therm_series_p:
                lim = _p_limit(g_run["series"][sid], gate)
                d = max(abs(a - bv) for a, bv in zip(g_run["series"][sid],
                                                     mine["series"][sid]))
                worst_p = max(worst_p, d)
                if d > lim:
                    ok1b = False
                    detail1b = "%s diff %.3e > gate %.3e" % (sid, d, lim)
            for key in elec_scalars:
                worst_e = max(worst_e, abs(mine["scalars"][key] - g_run["scalars"][key]))
            for key in therm_scalars_e:
                d = abs(mine["scalars"][key] - g_run["scalars"][key])
                worst_e_kwh = max(worst_e_kwh, d)
                if d > gate["E_kWh"]:
                    ok1b = False
                    detail1b = "%s diff %.3e > gate %.3e" % (key, d, gate["E_kWh"])
            for key in therm_scalars_t:
                d = abs(mine["scalars"][key] - g_run["scalars"][key])
                worst_t = max(worst_t, d)
            if not ok1b:
                break
        if ok1b:
            ok1b = worst_e <= 1e-9 and worst_t <= gate["T_K_atol"]
        rec("FCAP-1-v2-full-series-reproduction", ok1b,
            (detail1b if not ok1b else
             "elec/meas worst=%.3e (<=1e-9); thermal T worst=%.3e, P worst=%.3e, "
             "E worst=%.3e (gate-frozen faces, FCAP-7 freeze system)"
             % (worst_e, worst_t, worst_p, worst_e_kwh)),
            "elec/meas <=1e-9; thermal faces <= gate (T_K_atol/P_kW/E_kWh; B-4 freeze)",
            "(on,off) path reproduces fl001_v2 4 runs full-series (read-only; "
            "structure hard condition spec 3.1)")

    # ---- FCAP-2 恒等式（r_true ≡ 0 / r_meas = 0.4·b / EQ-FLTH-9 检查式不动域 +
    #      theta_ss 稳定小根 RHS 抽查；数值面随 R_int 变、定义式恒等）----
    worst2_r = 0.0
    worst2_rm = 0.0
    worst2 = 0.0
    worst2_alt = 0.0
    for spec, r in zip(RUNS, runs):
        t_arr = r["series"]["t"]
        for i in range(N_SAMPLES):
            b = r["series"]["bias_A"][i]
            worst2_r = max(worst2_r, abs(r["series"]["r_true_kW"][i]))
            worst2_rm = max(worst2_rm,
                            abs(r["series"]["r_meas_kW"][i] - V_KW_PER_A * b))
        ig = r["integrals"]
        resid = (ig["E_source_kws"] + ig["E_bat_kws"]
                 - ig["E_load_kws"] - ig["E_loss_kws"]) / 3600.0
        worst2 = max(worst2, abs(resid))
        d_alt = abs(ig["E_source_kws"] - ig["E_source_alt_kws"]) / 3600.0
        worst2_alt = max(worst2_alt, d_alt)
    # theta_ss 闭式抽查：RHS(T_amb + theta_-) ≈ 0 且稳定分母 > 0（EQ-FLTH-12）
    worst2_ss = 0.0
    for i_val in (I_CAP_A, 15.0, IREF_A, 62.5):
        theta_m, delta = theta_ss_small_root(i_val)
        dtdt, _ = rhs_thermal(i_val, T_AMB_K + theta_m, True)
        worst2_ss = max(worst2_ss, abs(dtdt))
        p = i_val * i_val * R0_OHM
        if (H_COOL_W_K - ALPHA_PER_K * p) + math.sqrt(delta) <= 0.0:
            worst2_ss = float("inf")
    ok2 = (worst2_r <= 1e-9 and worst2_rm <= 1e-9 and worst2 <= 1e-9
           and worst2_alt <= 1e-9 and worst2_ss <= 1e-12)
    rec("FCAP-2-identity-faces", ok2,
        "max|r_true|=%.3e kW, max|r_meas-0.4b|=%.3e kW, E-identity=%.3e kWh, "
        "alt-accum=%.3e kWh, theta_ss RHS=%.3e K/s"
        % (worst2_r, worst2_rm, worst2, worst2_alt, worst2_ss),
        "<=1e-9 kW / <=1e-9 kW / <=1e-9 kWh / <=1e-9 kWh / <=1e-12 K/s",
        "EQ-FLTH-5/6/9 identity faces (power chain zero-feedback; R_int quadratic "
        "changes values, not definitions)")

    # ---- FCAP-3 电气面与测量面跨轨恒等（§1.4 结构判据 oracle 侧固化）----
    # (a) (on,on) 4 Run 的 I/SOC_true/SOC_est/E_bat/r_meas 面 vs L0 闭式 ±1e-9
    worst3 = 0.0
    for spec, r in zip(RUNS, runs):
        mode, faulted, family = spec["feedback_mode"], spec["faulted"], spec["family"]
        t_arr = r["series"]["t"]
        for i in range(N_SAMPLES):
            ti = t_arr[i]
            i_l0 = _l0_i_true_at(ti, mode, faulted, family)
            b_l0 = _l0_b_at(ti, faulted, family)
            p_gen_l0 = PLOAD_KW - V_KW_PER_A * i_l0
            r_meas_l0 = p_gen_l0 + V_KW_PER_A * (i_l0 + b_l0) - PLOAD_KW
            worst3 = max(worst3,
                         abs(r["series"]["I_bat_true_A"][i] - i_l0),
                         abs(r["series"]["SOC_true_pct"][i] - _l0_soc_true_at(ti, mode, faulted, family)),
                         abs(r["series"]["SOC_est_pct"][i] - _l0_soc_est_at(ti, mode, faulted, family)),
                         abs(r["series"]["r_meas_kW"][i] - r_meas_l0),
                         abs(r["series"]["r_true_kW"][i]))
        int_i_l0 = _l0_int_i_true(DURATION_S, mode, faulted, family)
        int_b_l0 = _l0_int_b(DURATION_S, faulted, family)
        worst3 = max(worst3,
                     abs(r["scalars"]["E_bat_true_kWh"] - V_KW_PER_A * int_i_l0 / 3600.0),
                     abs(r["scalars"]["E_bat_meas_kWh"]
                         - V_KW_PER_A * (int_i_l0 + int_b_l0) / 3600.0))
    # (b) vs fl001_v2 golden：SOC_true/SOC_est 逐点恒等（±1e-9；healthy 局位级 == 0.0，
    #     A-2 机制——修正累积器恒 0.0）+ 修正累积器恒 0.0 机制断言
    worst3_g = 0.0
    worst3_h = 0.0
    corr_max = 0.0
    ok3b = g_v2 is not None
    if g_v2 is not None:
        for spec, r in zip(RUNS, runs):
            g_run = g_v2["runs"][spec["key"]]
            corr_max = max(corr_max, abs(r["integrals"]["soc_corr_pp"]))
            for sid in ("SOC_true_pct", "SOC_est_pct"):
                for a, bv in zip(g_run["series"][sid], r["series"][sid]):
                    d = abs(a - bv)
                    worst3_g = max(worst3_g, d)
                    if spec["key"] == "healthy":
                        worst3_h = max(worst3_h, d)
        if not (worst3_h == 0.0 and corr_max == 0.0):
            ok3b = False
    ok3 = worst3 <= 1e-9 and ok3b and worst3_g <= 1e-9
    rec("FCAP-3-elec-meas-cross-track", ok3,
        "vs-L0 worst=%.3e; vs-v2-golden worst=%.3e; healthy bit-level worst=%.1f; "
        "soc_corr_pp max=%.1f" % (worst3, worst3_g, worst3_h, corr_max),
        "vs-L0 <=1e-9; vs-v2 <=1e-9; healthy SOC faces == 0.0 bit-level (A-2); "
        "corr == 0.0 exact (fl001_v2 golden missing => fail)",
        "power chain zero-feedback: I/SOC_true/SOC_est/E_bat/r_meas faces identical "
        "(measurement chain untouched; capacity factor inactive in registered window)")

    # ---- FCAP-4 网格与事件相位（601 点、t[i]=i·dt、pre/post 语义、事件快照零扩展）----
    t_ref = build_time_grid()
    ok4 = (len(t_ref) == N_SAMPLES
           and all(t_ref[i] < t_ref[i + 1] for i in range(N_SAMPLES - 1))
           and all(t_ref[i] == i * DT_S for i in range(N_SAMPLES))
           and t_ref[0] == 0.0 and t_ref[-1] == DURATION_S)
    for r in runs:
        for sid in SERIES_IDS:
            col = r["series"][sid]
            if len(col) != N_SAMPLES:
                ok4 = False
            for v in col:
                if v is None:
                    if sid != "I_bat_cap_A":
                        ok4 = False
                elif not math.isfinite(v):
                    ok4 = False
    snap_ok = True
    detail4 = "ok"
    for spec, r in zip(RUNS, runs):
        if not spec["faulted"]:
            if r["events"]:
                snap_ok = False
                detail4 = "unexpected events in healthy run"
            continue
        if len(r["events"]) != 1:
            snap_ok = False
            detail4 = "event count != 1"
            break
        ev = r["events"][0]
        is_act = spec["family"] == FAMILY_ACTUATOR
        want_vars = ({"I_bat_true_A", "I_bat_meas_A", "bias_A", "I_bat_cap_A"}
                     if is_act else {"I_bat_true_A", "I_bat_meas_A", "bias_A"})
        if ev["trigger_s"] != T_F:
            snap_ok = False
            detail4 = "trigger_s != 20.0"
        if len(ev["snapshots"]) != 2:
            snap_ok = False
            detail4 = "snapshot count != 2"
        pre, post = ev["snapshots"]
        if (pre["phase"], post["phase"]) != ("pre", "post") or \
           pre["derivation"] != "left_limit" or post["derivation"] != "post_sample" or \
           pre["t_s"] != T_F or post["t_s"] != T_F:
            snap_ok = False
            detail4 = "pre/post phase semantics violated"
        if set(pre["variables"].keys()) != want_vars or \
           set(post["variables"].keys()) != want_vars:
            snap_ok = False
            detail4 = "snapshot variable set not zero-extended"
        if "E_cap_kWh" in pre["variables"] or "E_cap_kWh" in post["variables"] \
           or "T_bat_K" in pre["variables"]:
            snap_ok = False
            detail4 = "E_cap_kWh/T_bat_K must stay out of event snapshots"
        if not is_act:
            if post["variables"]["bias_A"] != BIAS_A or \
               abs(post["variables"]["I_bat_meas_A"]
                   - (post["variables"]["I_bat_true_A"] + BIAS_A)) > 1e-12:
                snap_ok = False
                detail4 = "sensor post snapshot values violated"
        else:
            if post["variables"]["I_bat_cap_A"] != I_CAP_A or \
               pre["variables"]["I_bat_cap_A"] is not None:
                snap_ok = False
                detail4 = "actuator post snapshot values violated"
        if not snap_ok:
            break
    ok4 = ok4 and snap_ok
    rec("FCAP-4-grid-events", ok4, "4x17x601 points, t[i]=i*dt; " + detail4,
        "strictly increasing + finite (I_bat_cap_A event-domain null exempt); "
        "EV-001 pre/post at 20.0 s, variable set zero-extended (no E_cap_kWh)",
        "grid + finiteness + event phase (fl001 SC-6/FL-4 convention)")

    # ---- FCAP-5 锚点全表复算（§3.2/§3.3 批准扫描值；终值以本 oracle emit 冻结）----
    corner45_on = _simulate_core(RUNS[0], DT_INT, load0=45.0)          # I=62.5 A
    corner45_off = _simulate_core(RUNS[0], DT_INT, load0=45.0, capacity="off")
    corner40_on = _simulate_core(RUNS[0], DT_INT, load0=40.0)          # I=50 A
    corner40_off = _simulate_core(RUNS[0], DT_INT, load0=40.0, capacity="off")
    corner10chg_on = _simulate_core(RUNS[1], DT_INT, load0=10.0, bias=30.0)   # |I|=55 A
    corner10chg_off = _simulate_core(RUNS[1], DT_INT, load0=10.0, bias=30.0,
                                     capacity="off")
    corner10_on = _simulate_core(RUNS[0], DT_INT, load0=10.0)          # I=-25 A 充电
    rows = []

    def chk(name, obs, exp, tol):
        rows.append((name, obs, exp, tol, abs(obs - exp) <= tol))

    def bit(name, obs, exp):
        rows.append((name, obs, exp, 0.0, obs == exp))

    theta_ss_25, _ = theta_ss_small_root(IREF_A)
    theta_ss_625, delta_625 = theta_ss_small_root(62.5)
    # 健康局（§3.2 表）
    chk("H.T_bat_0", s_h["T_bat_K"][0], 298.15, 1e-9)
    chk("H.T_bat_60", s_h["T_bat_K"][600], 309.953756517, A_TOL_T)
    chk("H.T_ss_asymptote", T_AMB_K + theta_ss_25, 312.437172, A_TOL_T)
    chk("H.theta_ss_25A", theta_ss_25, 14.287172, A_TOL_T)
    chk("H.P_loss_0", s_h["P_loss_kW"][0], 0.125, 1e-12)
    chk("H.P_loss_60", s_h["P_loss_kW"][600], 0.139763404, A_TOL_P)
    chk("H.E_loss_60", sc_h["E_loss_kWh"], 0.002240512336, A_TOL_E)
    chk("H.E_cap_min_4runs", min(min(r["series"]["E_cap_kWh"]) for r in runs), 40.0, 0.0)
    chk("H.E_cap_end", sc_h["E_cap_end_kWh"], 40.0, 0.0)
    bit("H.SOC_err_series_max",
        max(abs(a - b) for a, b in zip(s_h["SOC_est_pct"], s_h["SOC_true_pct"])), 0.0)
    if g_v2 is not None:
        g_h = g_v2["runs"]["healthy"]
        bit("H.SOC_true_end_bit", sc_h["SOC_true_end_pct"], g_h["scalars"]["SOC_true_end_pct"])
        bit("H.SOC_est_end_bit", sc_h["SOC_est_end_pct"], g_h["scalars"]["SOC_est_end_pct"])
        bit("H.E_bat_true_bit", sc_h["E_bat_true_kWh"], g_h["scalars"]["E_bat_true_kWh"])
        d_t60 = s_h["T_bat_K"][600] - g_h["series"]["T_bat_K"][600]
        chk("H.dT_vs_v2_60", d_t60, 5.3e-4, 1e-5)
        d_p60 = s_h["P_loss_kW"][600] - g_h["series"]["P_loss_kW"][600]
        rows.append(("H.dP_60_direction", d_p60, 0.0, 5e-5, 0.0 < d_p60 <= 5e-5))
        d_viol = min(bv - a for r_ in runs
                     for a, bv in zip(g_v2["runs"][r_["key"]]["series"]["T_bat_K"],
                                      r_["series"]["T_bat_K"]))
        rows.append(("H.T_direction_4runs", d_viol, 0.0, 0.0, d_viol >= 0.0))
    chk("H.max_abs_r_meas", sc_h["max_abs_r_meas_kW"], 0.0, 1e-9)
    chk("A.max_abs_r_meas", sc_a["max_abs_r_meas_kW"], 4.0, 1e-9)
    chk("A.T_bat_peak", max(s_a["T_bat_K"]), 304.639941, A_TOL_T)
    rows.append(("A.T_bat_peak_idx", max(range(N_SAMPLES), key=lambda i: s_a["T_bat_K"][i]),
                 221, 0, max(range(N_SAMPLES), key=lambda i: s_a["T_bat_K"][i]) == 221))
    if g_v2 is not None:
        d_max_a = max(abs(a - b) for a, b in zip(
            g_v2["runs"]["closed_loop_fault"]["series"]["T_bat_K"], s_a["T_bat_K"]))
        rows.append(("A.dT_max_vs_v2", d_max_a, 0.0, 1e-4, 0.0 <= d_max_a <= 1e-4))
        d_max_f = max(abs(a - b) for a, b in zip(
            g_v2["runs"]["actuator_closed_loop"]["series"]["T_bat_K"], s_f["T_bat_K"]))
        rows.append(("F.dT_max_vs_v2", d_max_f, 0.0, 1e-4, 0.0 <= d_max_f <= 1e-4))
    chk("M.T_bat_60", s_m["T_bat_K"][600], 309.953756517, A_TOL_T)
    chk("F.T_bat_peak", max(s_f["T_bat_K"]), 304.505390, A_TOL_T)
    rows.append(("F.T_bat_peak_idx", max(range(N_SAMPLES), key=lambda i: s_f["T_bat_K"][i]),
                 205, 0, max(range(N_SAMPLES), key=lambda i: s_f["T_bat_K"][i]) == 205))
    # 角点（§3.3 ①④⑤⑥；§3.2 高负载角点行）
    c45 = corner45_on
    chk("C45.T_bat_60", c45["scalars"]["T_bat_end_K"], 425.120236, A_TOL_T)
    chk("C45.dT_vs_off", c45["scalars"]["T_bat_end_K"]
        - corner45_off["scalars"]["T_bat_end_K"], 0.416, A_TOL_DIR)
    chk("C45.eta_60", c45["series"]["E_cap_kWh"][600] / EBAT_KWH, 0.552119, A_TOL_T)
    chk("C45.E_cap_60", c45["series"]["E_cap_kWh"][600], 22.084762, A_TOL_T)
    chk("C45.theta_ss_62.5A", theta_ss_625, 383.390805, A_TOL_T)
    chk("C45.SOC_true_60", c45["scalars"]["SOC_true_end_pct"], 58.628071, A_TOL_SOC)
    chk("C45.SOC_off_60", corner45_off["scalars"]["SOC_true_end_pct"], 58.958333, A_TOL_SOC)
    chk("C45.SOC_accel", c45["scalars"]["SOC_true_end_pct"]
        - corner45_off["scalars"]["SOC_true_end_pct"], -0.3303, A_TOL_DIR)
    chk("C45.dP_60", c45["series"]["P_loss_kW"][600]
        - corner45_off["series"]["P_loss_kW"][600], 0.0095, A_TOL_DIR)
    rows.append(("C45.T_direction", min(b - a for a, b in zip(
        corner45_off["series"]["T_bat_K"], c45["series"]["T_bat_K"])),
        0.0, 0.0, min(b - a for a, b in zip(
            corner45_off["series"]["T_bat_K"], c45["series"]["T_bat_K"])) >= 0.0))
    chk("C40.dT_60", corner40_on["scalars"]["T_bat_end_K"]
        - corner40_off["scalars"]["T_bat_end_K"], 0.065, 1e-3)
    chk("C40.dP_60", corner40_on["series"]["P_loss_kW"][600]
        - corner40_off["series"]["P_loss_kW"][600], 0.0013, A_TOL_DIR)
    chk("C10chg.T_bat_60", corner10chg_on["scalars"]["T_bat_end_K"], 362.785314, A_TOL_T)
    chk("C10chg.E_cap_60", corner10chg_on["series"]["E_cap_kWh"][600], 32.058350, A_TOL_T)
    chk("C10chg.SOC_accel", corner10chg_on["scalars"]["SOC_true_end_pct"]
        - corner10chg_off["scalars"]["SOC_true_end_pct"], 0.0639, A_TOL_DIR)
    bit("C10.T_bat_60_bit_eq_healthy", corner10_on["scalars"]["T_bat_end_K"],
        sc_h["T_bat_end_K"])
    # 激活阈 load0* ≈ 31.15 kW（§3.3 ⑥：T(60) 越过 T_cap0 的 load0 注册域阈）
    lo_b, hi_b = 30.0, 33.0
    for _ in range(20):
        mid_b = 0.5 * (lo_b + hi_b)
        t60_b = _simulate_core(RUNS[0], DT_INT, load0=mid_b)["scalars"]["T_bat_end_K"]
        if t60_b >= T_CAP0_K:
            hi_b = mid_b
        else:
            lo_b = mid_b
    chk("C.act_threshold_load0", 0.5 * (lo_b + hi_b), 31.15, 0.05)
    # 新失稳边界（§3.3 ④）：I_b = sqrt(h/(R0·(alpha+2·sqrt(beta))))、load0 界 = 0.4·I_b + 20
    i_b = math.sqrt(H_COOL_W_K / (R0_OHM * (ALPHA_PER_K + 2.0 * math.sqrt(BETA_PER_K2))))
    chk("B.I_boundary", i_b, 66.1854, A_TOL_DIR)
    chk("B.load0_boundary", 0.4 * i_b + 20.0, 46.4741, A_TOL_DIR)
    # 稳定性裕度（§3.3 ②④）：全轨边界裕度 + 轨内局部裕度（= sqrt(Delta)）+ 判别式
    p_625 = 62.5 * 62.5 * R0_OHM
    margin_global = H_COOL_W_K - p_625 * (ALPHA_PER_K + 2.0 * math.sqrt(BETA_PER_K2))
    margin_local = H_COOL_W_K - p_625 * (ALPHA_PER_K + 2.0 * BETA_PER_K2 * theta_ss_625)
    chk("B.margin_global_62.5A", margin_global, 1.0826, A_TOL_M)
    # 批准值为 6 位小数舍入（精确值 sqrt(Delta) = 1.887975933...、Delta = 3.564453125）：
    # 本行容差 = 舍入粒度 1e-6；精确算术值由 B.margin_local_identity（恒等式 <=1e-9）
    # 与 FCAP-8（min Delta == 3.564453125 <=1e-9）承载
    chk("B.margin_local_62.5A", margin_local, 1.887976, A_TOL_T)
    rows.append(("B.margin_local_identity",
                 abs(margin_local - math.sqrt(delta_625)), 0.0, 1e-9,
                 abs(margin_local - math.sqrt(delta_625)) <= 1e-9))
    chk("B.Delta_corner", delta_625, 3.564453, A_TOL_T)
    # RK4 步长裕度（§3.3 ⑤）：dt·|lambda| = dt·(h − I^2·R0·alpha)/C_bat @ (62.5 A, theta=0)
    rk4_margin = DT_INT * (H_COOL_W_K - p_625 * ALPHA_PER_K) / C_BAT_J_K
    rows.append(("B.rk4_dt_lambda", rk4_margin, 7.2917e-5, 1e-7,
                 rk4_margin <= 1e-3))

    fails = [nm for nm, _ob, _ex, _tl, okr in rows if not okr]
    worst5 = max(abs(ob - ex) for nm, ob, ex, _tl, okr in rows if okr) if not fails else None
    ok5 = not fails
    obs5 = "%d/%d anchor rows pass" % (len(rows) - len(fails), len(rows))
    if fails:
        obs5 += "; FAIL: " + ",".join(fails)
    rec("FCAP-5-anchors", ok5, obs5, "spec 3.2/3.3 approved scan prefill (final = this emit)",
        "anchor recompute: healthy table + fault peaks + corners (45/40/10chg/10) "
        "+ boundary shift + stability margins + activation threshold")

    # ---- FCAP-6 monitor 热面恒等（偏置不进入物理回路的结构判据；FL-6 同构）----
    d6 = max(abs(x - y) for x, y in zip(s_m["T_bat_K"], s_h["T_bat_K"]))
    d6p = max(abs(x - y) for x, y in zip(s_m["P_loss_kW"], s_h["P_loss_kW"]))
    d6e = max(abs(x - y) for x, y in zip(s_m["E_cap_kWh"], s_h["E_cap_kWh"]))
    d6s = max(abs(x - y) for x, y in zip(s_m["SOC_true_pct"], s_h["SOC_true_pct"]))
    ok6 = (d6 == 0.0 and d6p == 0.0 and d6e == 0.0 and d6s == 0.0)
    rec("FCAP-6-monitor-thermal-identity", ok6,
        "max|dT|=%.1f K, max|dP|=%.1f kW, max|dEcap|=%.1f kWh, max|dSOC|=%.1f pp"
        % (d6, d6p, d6e, d6s),
        "== 0.0 (exact, all four faces)",
        "monitor bias stays out of the physical loop; thermal/capacity faces "
        "identical to healthy")

    # ---- FCAP-7 半步长自收敛 + Riccati 闭式解析交叉 + beta=0 退化（A-2/B-4 冻结制）----
    fine = [_simulate_core(spec, 0.005) for spec in RUNS]
    d7_t = max(max(abs(x - y) for x, y in zip(by_key[spec["key"]]["series"]["T_bat_K"],
                                              f["series"]["T_bat_K"]))
               for spec, f in zip(RUNS, fine))
    d7_i = max(max(abs(x - y) for x, y in zip(by_key[spec["key"]]["series"]["I_bat_true_A"],
                                              f["series"]["I_bat_true_A"]))
               for spec, f in zip(RUNS, fine))
    d7_e = max(abs(by_key[spec["key"]]["scalars"]["E_loss_kWh"]
                   - f["scalars"]["E_loss_kWh"]) for spec, f in zip(RUNS, fine))
    d7_p = max(max(abs(x - y) for x, y in zip(by_key[spec["key"]]["series"]["P_loss_kW"],
                                              f["series"]["P_loss_kW"]))
               for spec, f in zip(RUNS, fine))
    d7_ec = max(max(abs(x - y) for x, y in zip(by_key[spec["key"]]["series"]["E_cap_kWh"],
                                               f["series"]["E_cap_kWh"]))
                for spec, f in zip(RUNS, fine))
    d7_soc = max(max(abs(x - y) for x, y in zip(by_key[spec["key"]]["series"]["SOC_true_pct"],
                                                f["series"]["SOC_true_pct"]))
                 for spec, f in zip(RUNS, fine))
    # Riccati 闭式交叉（on 轨；RK4 dt0.01 vs 子步精确解）
    exact = [_simulate_core(spec, DT_INT, thermal="exact") for spec in RUNS]
    d7_cross = max(max(abs(x - y) for x, y in zip(by_key[spec["key"]]["series"]["T_bat_K"],
                                                  e["series"]["T_bat_K"]))
                   for spec, e in zip(RUNS, exact))
    d7_cross_p = max(max(abs(x - y) for x, y in zip(by_key[spec["key"]]["series"]["P_loss_kW"],
                                                    e["series"]["P_loss_kW"]))
                     for spec, e in zip(RUNS, exact))
    # beta=0 退化：off 轨 RK4 vs 子步线性指数精确解（FL-7 同构交叉——参照 = 同 capacity
    # 口径 off 轨 RK4，即 fl001_v2 冻结更新序复刻（FCAP-1 已证其与冻结 golden 逐位同））
    off_rk4 = [_simulate_core(spec, DT_INT, capacity="off") for spec in RUNS]
    exact_off = [_simulate_core(spec, DT_INT, capacity="off", thermal="exact")
                 for spec in RUNS]
    d7_cross_off = max(max(abs(x - y) for x, y in zip(
        rk["series"]["T_bat_K"], e["series"]["T_bat_K"]))
        for rk, e in zip(off_rk4, exact_off))
    # 同族闭式一致性：w 形（求解式）vs coth/artanh 直形（登记式）
    worst_coth = 0.0
    for i_val in (I_CAP_A, 15.0, 25.0, 32.5, 50.0, 62.5):
        for th0 in (0.0, 1.0, 5.0, 11.0):
            a1 = _riccati_substep_exact(i_val, th0, 0.01)
            a2 = _riccati_substep_coth(i_val, th0, 0.01)
            worst_coth = max(worst_coth, abs(a1 - a2))
    # beta=0 稳定小根形态退化：有理化式 == EQ-FLTH-9 线性闭式（0.0 ulp——§3.3 ⑦）
    worst_ulp = 0
    beta0_vals = []
    for i_val in (13.75, 15.0, 25.0, 32.5, 50.0, 62.5):
        th_rat, _ = _theta_ss_form(i_val, 0.0)
        p = i_val * i_val * R0_OHM
        th_lin = p / (H_COOL_W_K - p * ALPHA_PER_K)
        if th_rat != th_lin:
            worst_ulp += 1
        beta0_vals.append(th_rat)
    ok7 = (d7_t <= FCAP7_HALFSTEP_K and d7_i <= 1e-9 and d7_e <= 1e-6
           and d7_cross <= FCAP7_CROSS_K and d7_cross_off <= FCAP7_CROSS_K
           and worst_coth <= FCAP7_COTH_K and worst_ulp == 0
           and gate["T_K_atol"] >= 10.0 * d7_t and gate["T_K_atol"] >= 1e-9)
    rec("FCAP-7-halfstep-riccati-cross", ok7,
        "halfstep max|dT|=%.4e K (I=%.2e, E=%.2e kWh, P=%.2e kW, Ecap=%.2e kWh, "
        "SOC=%.2e pp); rk4-vs-riccati max|dT|=%.4e K (P=%.2e kW); off rk4-vs-linear "
        "max|dT|=%.4e K; coth-agreement=%.3e K; beta0 ulp mismatches=%d"
        % (d7_t, d7_i, d7_e, d7_p, d7_ec, d7_soc, d7_cross, d7_cross_p,
           d7_cross_off, worst_coth, worst_ulp),
        "halfstep <=5e-3 K and gate T_K_atol >=10x (B-4 freeze system); "
        "riccati/linear cross <=1e-9 K (A-2 lower-bound freeze); coth <=1e-8; "
        "beta0 == 0.0 ulp",
        "h=0.01 vs h=0.005 self-convergence + substep Riccati closed-form cross "
        "(4 runs) + beta=0 EQ-FLTH-9 degeneration; beta0 theta_minus = "
        + ",".join("%.9f" % v for v in beta0_vals))

    # ---- FCAP-8 无 NaN/Inf（注册域限定——A-9）+ 包络 + 稳定性/判别式/eta_cap/符号域 ----
    ok8 = True
    for r in runs:
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if v is None:
                    if sid != "I_bat_cap_A":
                        ok8 = False
                elif not math.isfinite(v):
                    ok8 = False
        for v in r["series"]["T_bat_K"]:
            if not (T_AMB_K - 1e-9 <= v <= 310.0):
                ok8 = False
        for v in r["series"]["P_loss_kW"]:
            if v < 0.0:
                ok8 = False
        for v in r["series"]["SOC_true_pct"]:
            if not (0.0 - 1e-9 <= v <= 100.0 + 1e-9):
                ok8 = False
        for v in r["series"]["E_cap_kWh"]:
            if not (ETA_FLOOR * EBAT_KWH - 1e-9 <= v <= EBAT_KWH + 1e-9):
                ok8 = False
    for r in (corner45_on, corner45_off, corner40_on, corner10chg_on, corner10_on):
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if v is None:
                    if sid != "I_bat_cap_A":
                        ok8 = False
                elif not math.isfinite(v):
                    ok8 = False
        for v in r["series"]["E_cap_kWh"]:
            eta = v / EBAT_KWH
            if not (0.0 < eta <= 1.0):
                ok8 = False
    # 符号域（A-5 定案）：beta >= 0、k_cap >= 0、eta_floor > 0（alpha > 0 既有域）
    if not (BETA_PER_K2 >= 0.0 and K_CAP_PER_K >= 0.0 and ETA_FLOOR > 0.0
            and ALPHA_PER_K > 0.0):
        ok8 = False
    # 判别式全域网格（§3.3 ②：load0 10..45 步 0.5 × 电流可达集 7 情形）：
    # healthy/monitor/actuator max|I| = |I_ref|；闭环 b∈{2,10,30} max|I| =
    # max(|I_ref|, |I_ref−b|)（I_ref<0 段深充电角点 55 A @ load0=10——§3.3 ⓪）
    delta_min = None
    delta_arg = None
    i_reach_max = 0.0
    margin_min = None
    for kk in range(20, 91):
        load0 = 0.5 * kk
        i_ref = (load0 - 20.0) / V_KW_PER_A
        cands = {abs(i_ref)}
        for b_val in (2.0, 10.0, 30.0):
            cands.add(abs(i_ref - b_val))
        for i_val in cands:
            _, dlt = _theta_ss_form(i_val, BETA_PER_K2)
            m_g = H_COOL_W_K - i_val * i_val * R0_OHM * (ALPHA_PER_K
                                                         + 2.0 * math.sqrt(BETA_PER_K2))
            if margin_min is None or m_g < margin_min:
                margin_min = m_g
            if delta_min is None or dlt < delta_min:
                delta_min = dlt
                delta_arg = (load0, i_val)
            if i_reach_max < i_val:
                i_reach_max = i_val
            if dlt <= 0.0 or m_g <= 0.0:
                ok8 = False
    if not (delta_min is not None and delta_min > 0.0
            and abs(delta_min - 3.564453125) <= 1e-9
            and delta_arg == (45.0, 62.5) and i_reach_max == 62.5
            and margin_min > 0.0):
        ok8 = False
    if not (0.0 < rk4_margin <= 1e-3):
        ok8 = False
    rec("FCAP-8-finite-domain-stability", ok8,
        "finite 4x17x601 + 5 corners; T in [298.15,310.0] K; eta_cap in (0,1]; "
        "E_cap >= 20 kWh; grid min Delta=%.6f @ (load0=%.1f, I=%.1f A); "
        "min global margin=%.4f W/K; I_reach_max=%.1f A; rk4 dt|lambda|=%.3e"
        % (delta_min, delta_arg[0], delta_arg[1], margin_min, i_reach_max, rk4_margin),
        "all finite (registration domain only — A-9); Delta > 0 whole grid "
        "(min 3.564453 @ corner); h - I^2*R0*(alpha+2*sqrt(beta)) > 0 (I_max 62.5 A); "
        "eta_cap in (0,1]; sign domain beta>=0/k_cap>=0/eta_floor>0",
        "NaN/Inf + envelope + domain grid + stability margins (spec 3.3 hard "
        "conditions; out-of-domain finite-time blow-up is registered limitation 5)")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


# ---------------------------------------------------------------------------
# golden 组装（schema v2；generated_by/approval 由 oracle_base.emit_golden 回填）
# ---------------------------------------------------------------------------
# gate 块 tier="T-B"（规格 §4 项 7 Q8 定案：T-B + 降 T-C 双向预案；键面 = fl001_v2 gate
# 全键面——无新增键，E_cap_kWh 序列经 verify_golden T-B `_kWh` 分支路由 E_kWh 容差，
# A-4/B-1 显式硬项实现侧对齐）。冻结依据 = FCAP-7 双实现实测散差表（2026-11-14 emit
# 实测，4 Run 全轨；半步自收敛 h=0.01 vs h=0.005 + RK4 vs 子步 Riccati 闭式交叉）：
#   半步自收敛：max|dT| = 7.3824e-04 K、max|dI| = 8.17e-14 A、dE_loss = 2.39e-09 kWh、
#     max|dP_loss| = 3.47e-07 kW、max|dE_cap| = 0.0（四 Run 窗内 E_cap ≡ 40 精确——
#     T < T_cap0，A-2 机制）、max|dSOC_true| = 1.42e-14 pp（intI 累积 fp 噪声级）；
#   RK4 vs 子步 Riccati 闭式：max|dT| = 7.3896e-13 K、max|dP_loss| = 9.44e-16 kW；
#   off 轨 RK4 vs 子步线性指数（beta=0 退化，FL-7 同构）：max|dT| = 1.4211e-12 K；
#   同族闭式一致性（w 形 vs coth/artanh 直形）：max|diff| = 2.543e-11 K；beta0 ulp = 0。
#   逐键裕度（gate / 实测散差）：
#   - T_K_atol=1e-2：7.3824e-04 x13.5（>=10 纪律 + 下限 >=1e-9——B-4 冻结制；FL-7/
#     FLTH A-2 同款，FLTH 线性面实测 6.159e-4 K、gate 1e-2 x16 互证）。
#   - I_A_rtol=1e-12/I_A_atol=1e-15：精确指数闭式跨实现散差 8.17e-14 A（半步）/0.0
#     （FCAP-1/FCAP-3 vs 冻结 golden 逐位），rtol 1e-12 实证域内。
#   - P_kW_atol=1e-3：3.47e-07 x2882（P_kW_rtol=1e-6 对 P_gen ~24 kW 给 ~2.4e-5 余量）。
#   - E_kWh=1e-6：2.39e-09 x418（E_loss）；E_cap_kWh 列实测散差 0.0（四 Run 窗内
#     E_cap ≡ 40 精确——A-2 机制；高温段代数链 dE_cap/dT = -k_cap·E_nom = -0.16 kWh/K
#     的方法散差由 T_K_atol=1e-2 K 承载（1.6e-3 kWh 预算），oracle↔engine 同方法实现
#     的列散差为 fp 级——fl001_v2 P_loss_kW 列同款结构先例）。
#   - SOC_pp=1e-5：1.42e-14 pp（x7e8；修正累积器恒 0.0——A-2）。
#   - r_true_kW/r_meas_kW_atol=1e-9/t_s=1e-9：恒等面实测 0.0（FCAP-2 定义式恒等）。
#   - 降 T-C 预案未触发（实测散差未超预案；ORACLE_INTERFACE_D2 §3.2 双向预案登记）。
TOLERANCES = {
    "gate": {
        "tier": "T-B",
        "I_A_rtol": 1e-12,
        "I_A_atol": 1e-15,
        "T_K_atol": 1e-2,
        "P_kW_rtol": 1e-6,
        "P_kW_atol": 1e-3,
        "E_kWh": 1e-6,
        "SOC_pp": 1e-5,
        "r_true_kW": 1e-9,
        "r_meas_kW_atol": 1e-9,
        "t_s": 1e-9,
    },
}


def fault_block(spec):
    """golden run.fault 块（事件编码 v1；族字段与 systems.js FL-001 faults 定义同名；
    幅值键沿 fl001_v1/v2 具名先例 bias_A / magnitude_pct+I_cap_A）。"""
    if not spec["faulted"]:
        return None
    if spec.get("family") == FAMILY_ACTUATOR:
        return {"family": FAMILY_ACTUATOR, "fault_id": "converter_current_limit",
                "t_start_s": T_F, "magnitude_pct": MAGNITUDE_PCT, "I_cap_A": I_CAP_A}
    return {"family": FAMILY_SENSOR, "fault_id": "I_bat_sensor_bias",
            "t_start_s": T_F, "bias_A": BIAS_A}


def build_golden():
    """golden schema v2 组装（ORACLE_INTERFACE_D2.md §3；规格 §4 项 1/5/6）。

    generated_by / approval 不在此构造（v2 一段式：oracle_base.emit_golden 在 emit
    时点现算回填——generated_at 不得 null 占位出境；approval 三值非 null 方可落盘）。"""
    runs = {}
    for spec in RUNS:
        r = simulate_run(spec)
        runs[r["key"]] = {
            "role": r["role"],
            "feedback_mode": r["feedback_mode"],
            "thermal_model": "on",
            "capacity_model": "on",
            "fault": fault_block(spec),
            "events": r["events"],
            "scalars": r["scalars"],
            "metrics": r["metrics"],
            "series": r["series"],
        }
    return {
        "golden_schema_version": oracle_base.GOLDEN_SCHEMA_VERSION_V2,
        "golden_id": GOLDEN_ID,
        "model_id": MODEL_ID,
        "model_version": MODEL_VERSION,
        "schema_version": "1.0.0",
        "engine_baseline": None,
        "backend": None,
        "supersedes": "fl001_v2（thermal 轨 capacity_model=off，字节冻结留档；存档场次继续引用 v2）",
        "method_id": METHOD_ID,
        "method_version": METHOD_VERSION,
        "thermal_model": "on",
        "capacity_model": "on",
        "units": {"I": "A", "P": "kW", "E": "kWh", "t": "s", "SOC": "%", "SOC_err": "pp",
                  "T": "K"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T_F, "bias_A": BIAS_A,
            "Vdc_V": VDC_V, "Iref_A": IREF_A, "tau_s": TAU_S, "tau_actuator_s": TAU_ACT_S,
            "magnitude_pct": MAGNITUDE_PCT, "I_cap_A": I_CAP_A,
            "Pload_demand_kW": PLOAD_KW, "Pload_served_kW": PLOAD_KW,
            "Ebat_nominal_kWh": EBAT_KWH, "SOC0_pct": SOC0_PCT,
            "dt_int_s": DT_INT,
            "R0_ohm": R0_OHM, "alpha_per_K": ALPHA_PER_K, "C_bat_J_K": C_BAT_J_K,
            "h_cool_W_K": H_COOL_W_K, "T_amb_K": T_AMB_K,
            "beta_per_K2": BETA_PER_K2, "k_cap_per_K": K_CAP_PER_K,
            "T_cap0_K": T_CAP0_K, "eta_floor": ETA_FLOOR,
            "thermal_model": "on",
            "capacity_model": "on",
            "feedback_modes": ["closed_loop", "monitor"],
            "note": "L1 扩展容量/内阻二阶效应轨（thermal_model=on + capacity_model=on）："
                    "电气面/测量链/记账面 L1 热轨序逐字保留（精确指数子步，"
                    "plants/fl001.js stepOf 语义；P_bat=0.4·I 功率链零反馈），T_bat 经典 "
                    "RK4 固定步长 0.01（FL001_CAPACITY_G2B_SPEC_APPROVED v1.0 §4 项 3；"
                    "RHS 内 I 冻结子步起点 FLTH Q2 同构，R_int 按 EQ-FLTH-10 "
                    "R0·(1+alpha·theta+beta·theta^2)，子步内常系数 Riccati 型）；SOC_true "
                    "按 EQ-FLTH-11 离散口径：子步 E_cap 冻结于子步起点右值 + 名义单除项"
                    "（与 EQ-FLTH-7 原式同源同序）+ 容量修正累积器（每子步 "
                    "(V·∫I dt'/3600)·(1/E_cap(T_start) − 1/40)），T < T_cap0 域内修正项"
                    "恒精确 0.0（A-2 机制——healthy 局 SOC 面与 fl001_v2 位级同，全 4 Run "
                    "E_cap ≡ 40 kWh 精确）；theta_ss 稳定小根有理化形态（EQ-FLTH-12 "
                    "A-3 定案）；E_loss 子步梯形、E_source = E_load − E_bat + E_loss "
                    "（EQ-FLTH-8 守恒面不动域——无第二缺口项，裁定点一定案）；"
                    "beta/k_cap/T_cap0/eta_floor 为教学整定值非实测（A-flcap-params）；"
                    "fl001_v2（thermal on 轨 capacity_model=off）字节冻结留档，本 golden "
                    "只读比对（G0-DEC-16）",
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": I_F, "t_0": 0.0, "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": TOLERANCES,
        "runs": runs,
        "metrics_note": "golden 指标为独立可算子集，镜像 fl001_v2 指标面 11 项"
                        "（E_gen_true_60s 热域按 EQ-FLTH-5 携带损耗补偿项；无故障 Run "
                        "focal_change_A 为 null）；E_loss/T_bat_end/E_cap_end 锚点经 "
                        "scalars 面 E_loss_kWh/T_bat_end_K/E_cap_end_kWh 承载（引擎侧"
                        "指标注册归 FLCAP-G2b-04）；E_cap_kWh 序列经 verify_golden T-B "
                        "`_kWh` 分支路由 E_kWh 容差（A-4/B-1 显式硬项）",
    }


# ---------------------------------------------------------------------------
# emit（oracle_base 机制路径：build_golden → generated_by 一段式回填 → approval 首签
# → write_golden_with_sidecar（LF 钉死）；先跑 FCAP-1…FCAP-8，失败 exit 2 不写盘）
# ---------------------------------------------------------------------------
def emit():
    ok, checks = self_check()
    if not ok:
        print(json.dumps({"ok": False, "checks": checks}, ensure_ascii=True, indent=2))
        return 2
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    path = os.path.join(root, "data", "golden", GOLDEN_ID + ".json")
    summary = oracle_base.emit_golden(
        build_golden, path,
        tool="tools/oracle/fl001_cap_oracle.py + tools/oracle/oracle_base.py（机制层）",
        command="python -I tools/oracle/fl001_cap_oracle.py --emit",
        oracle_path=os.path.abspath(__file__),
        approved_by=APPROVED_BY)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def main(argv):
    # GBK 控制台兼容（fl001_l1_oracle.py:1035-1041 先例）：统一 UTF-8 输出兜底；
    # --self-check 记录面字符串另保持纯 ASCII（无 ²/−/≤ 等非 GBK 符号）
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    if "--self-check" in argv:
        ok, checks = self_check()
        print(json.dumps({"ok": ok, "checks": checks}, ensure_ascii=True, indent=2))
        return 0 if ok else 2
    if "--emit" in argv:
        return emit()
    if "--summary" in argv:
        ok, checks = self_check()
        g = build_golden()
        out = {
            "self_check_ok": ok,
            "checks": checks,
            "runs": {k: {"scalars": v["scalars"], "metrics": v["metrics"]}
                     for k, v in g["runs"].items()},
        }
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0 if ok else 2
    print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
