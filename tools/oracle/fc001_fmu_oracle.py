# -*- coding: utf-8 -*-
"""fc001_fmu_oracle.py — FC-001 5 态 L1-FMU 独立 oracle（FCFMU-G2b-03；CHG-20261115-10 批准链）。

规格权威文本（唯一）：FaultLab-evaluation/NEXT/FC001_FMU_G2B_SPEC_APPROVED v1.0
（FCFMU-G2b-02 批准轮收口，CHG-20261115-10——Q1…Q18 定案）：
  - §1.3 EQ-FCFMU-1…23 冻结表（5 微分态 + 代数输出 + 传感/控制/残差壳）；
  - §1.4 十九参数字典 + §11 Q16 nom 四常量（p_O2_nom=120.0 / p_N2_nom=50.0 /
    p_H2_nom=180.0 / u_o2_nom=0.50——标称点解析派生）与 u_an='维持 0.50' 裁定；
  - §2.1 5 Run 矩阵（FC-Run-1…5 白名单全集，Q8）；
  - §2.3 标称稳态 19 变量表（§11 Q13/A-5：u_an 裁定补入 → 快照/序列 20 变量键）；
  - §1.5/§11 Q1(A)：601 点网格 + 事件快照相位承载（pre=left_limit / post=post_sample）；
  - §1.3 裁定注记（A-2）：残差指示函数按行相位时点求值——pre 行 r=0、post 行 r=+b；
  - §4 项 3：经典 RK4，内部子步 dt_int=0.01 s、通信步 dt=0.1 s；控制指令 ZOH
    （A-4：每通信步起点按测量计值、步内冻结——rhs 不重算控制）；
  - §4 项 2：独立性声明（fl001_l1/gt001_l1/fc001_l1 先例）——不 import src/**、
    不 import 既有 oracle（仅 oracle_base 机制层）、方程与参数唯一权威 = 批准文本、
    Python stdlib（python -I）、自含硬编码；golden 由本 oracle 只读生成——
    C99 FMU 不参与 emit（G0-DEC-16 同构；C-Python parity 为验收面非生成依赖）。

用法：
  python -I tools/oracle/fc001_fmu_oracle.py --self-check    # FMU-1…7 自检（exit 0/2）
  python -I tools/oracle/fc001_fmu_oracle.py --emit          # fc001_fmu_v1 emit（先自检，失败 exit 2）
  python -I tools/oracle/fc001_fmu_oracle.py --summary       # 自检 + 标量/指标摘要
"""

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle_base  # noqa: E402  机制层（V-03/approval/sidecar/resolve_run_spec/check_record）

GOLDEN_ID = "fc001_fmu_v1"
MODEL_ID = "fc.pem.fmu_l1"          # §11 Q13 定案（自述新值；A-3 禁令下不撞 fc.pem.l0）
MODEL_VERSION = "1.0.0"             # §11 Q13 定案（新轨首版——fc.pem.l0 1.0.0 先例同构）
METHOD_ID = "fc001_fmu_l1_rk4_dt0.01"
METHOD_VERSION = "1.0.0"
ORACLE_FILENAME = "fc001_fmu_oracle.py"
APPROVED_BY = "user（2026-11-15 CHG-20261115-10 批准链——AskUserQuestion 裁定「收口批准轮后 emit」）"
#: approved_at 钉批准链日期（日精度诚实口径——AskUserQuestion 裁定的时刻未登记，
#: 不虚设时刻；emit_at 由 generated_by.generated_at 独立承载）
APPROVED_AT = "2026-11-15T00:00:00Z"

# ---------------------------------------------------------------------------
# 冻结常量（APPROVED v1.0 §1.4 十九参数字典逐字 + §11 Q16 nom 四常量；零改动）
# ---------------------------------------------------------------------------
N_CELL = 80            # cells        PEMFC 电堆串联单体数
I_LOAD = 100.0         # A            名义电堆负载电流
G_O2_IN = 20.0         # kPa/s        阴极 O2/N2 供给阀氧压增益
K_O2_REACT = 0.10      # kPa/(A·s)    电化学氧消耗系数
TAU_CA = 5.0           # s            阴极歧管压力松弛时间常数
K_N2_ACCUM = 12.0      # kPa/s        供给缩减/吹扫下阴极氮累积增益
TAU_N2 = 10.0          # s            氮缓冲松弛时间常数
G_H2_IN = 40.0         # kPa/s        阳极喷射器氢供给增益
K_H2_REACT = 0.20      # kPa/(A·s)    阳极电化学氢消耗系数
TAU_AN = 2.5           # s            阳极再循环回路松弛时间常数
Q_COND = 0.08          # mL/(A·s)     生成水冷凝速率系数
Q_DRAIN_MAX = 16.0     # mL/s         被动膜分离器最大排水速率
V_CAP_MAX = 500.0      # mL           分离器最大储水容量
E_LHV = 1.254          # V            低热值热中性单体参考电压
P_H2_LHV_KW = 10.032   # kW           100.0 A 下总氢 LHV 功率输入
P_AUX_KW = 0.20        # kW           寄生平衡厂用电功耗
T_COOL_IN = 323.15     # K            冷却剂入口温度（50.0 °C）
H_COOL = 0.2416        # kW/K         电堆-冷却剂集总换热导纳
C_TH = 2.416           # kJ/K         电堆集总热容
# §11 Q16 定案：nom 四常量（标称平衡点解析派生——标称点五导数恒零 + 参考项归零）
P_O2_NOM = 120.0       # kPa
P_N2_NOM = 50.0        # kPa
P_H2_NOM = 180.0       # kPa
U_O2_NOM = 0.50        # -

# 数值口径（§4 项 3；ZOH 语义 A-4）
DT_S = 0.1             # 通信步（输出网格）
DT_INT = 0.01          # 内部 RK4 子步
SUB = 10               # 每通信步子步数
N_SAMPLES = 601        # 601 点（Q1(A)——t[k]=k·0.1，[0.0,60.0]）
T_START = 20.0         # 故障时刻（Run 矩阵统一）
DURATION_S = 60.0
I_F = 200              # 事件网格索引（t=20.0 = 0.1·200）

# 控制域（EQ-FCFMU-19：min(0.95, max(0.05, ·)) 逐字序）
U_MIN = 0.05
U_MAX = 0.95
U_AN_CONST = 0.50      # §11 Q16：u_an 维持 0.50（baseline/monitor/closed_loop 全域）

FAULT_TIME = T_START


# ---------------------------------------------------------------------------
# Run 矩阵（APPROVED v1.0 §2.1 白名单全集 5 Run——Q8；键 = golden runs dict 键序）
# ---------------------------------------------------------------------------
RUNS = [
    {
        "key": "baseline", "role": "baseline", "feedback_mode": "baseline",
        "faulted": False, "family": "none", "target": None,
        "b_p_ca_kPa": 0.0, "b_V_water_mL": 0.0, "alpha_drain_post": 1.0,
        "note": "FC-Run-1 none+baseline——60 s 全程维持精确标称平衡点（解析恒等）",
    },
    {
        "key": "sensor_p_ca_closed_loop", "role": "fault", "feedback_mode": "closed_loop",
        "faulted": True, "family": "sensor_drift", "target": "p_ca",
        "b_p_ca_kPa": 15.0, "b_V_water_mL": 0.0, "alpha_drain_post": 1.0,
        "note": "FC-Run-2 sensor_drift closed_loop b_p_ca=+15 kPa",
    },
    {
        "key": "sensor_p_ca_monitor", "role": "fault", "feedback_mode": "monitor",
        "faulted": True, "family": "sensor_drift", "target": "p_ca",
        "b_p_ca_kPa": 15.0, "b_V_water_mL": 0.0, "alpha_drain_post": 1.0,
        "note": "FC-Run-3 sensor_drift monitor b_p_ca=+15 kPa（true 通道恒标称——FMU-5）",
    },
    {
        "key": "sensor_v_water_closed_loop", "role": "fault", "feedback_mode": "closed_loop",
        "faulted": True, "family": "sensor_drift", "target": "V_water",
        "b_p_ca_kPa": 0.0, "b_V_water_mL": -80.0, "alpha_drain_post": 1.0,
        "note": "FC-Run-4 sensor_drift closed_loop b_V_water=-80 mL（闭环平衡 280 mL——A-1 修正口径）",
    },
    {
        "key": "actuator_drain_closed_loop", "role": "fault", "feedback_mode": "closed_loop",
        "faulted": True, "family": "actuator_fault", "target": "drain_valve",
        "b_p_ca_kPa": 0.0, "b_V_water_mL": 0.0, "alpha_drain_post": 0.45,
        "note": "FC-Run-5 actuator_fault closed_loop alpha_drain 1.00->0.45（零跳变；theta>0.60 穿越 t~47.5 s）",
    },
]

# 序列列 id（§3.1 十九变量 + §11 Q13/A-5 u_an 补入 = 20 变量 + t；§4 项 6 emit 实测核对面）
SERIES_IDS = [
    "t",
    "p_O2_ca_true_kPa", "p_N2_ca_true_kPa", "p_H2_an_true_kPa",
    "V_water_store_true_mL", "T_stack_true_K",
    "p_ca_true_kPa", "y_O2_ca_true", "cap_water_ratio_true",
    "V_stack_true_V", "eta_sys_true_pct",
    "p_ca_meas_kPa", "V_water_store_meas_mL", "V_stack_meas_V", "T_stack_meas_K",
    "u_o2_valve_cmd", "u_drain_valve_cmd", "u_an_valve_cmd",
    "cap_water_ratio_est", "r_meas_p_kPa", "r_meas_water_mL",
]


# ---------------------------------------------------------------------------
# 代数链（EQ-FCFMU-6…13；b_applied = 传感偏置相位门——A-2 裁定：pre 行 0、post 行 b）
# ---------------------------------------------------------------------------
def _alg_true(p_o2, p_n2, p_h2, v_water, t_stack):
    """真值代数（EQ-FCFMU-6…13；运算序冻结——C99 parity 前提）。"""
    p_vap = 30.0 + 1.2 * (t_stack - 343.15)                    # EQ-FCFMU-6
    p_ca = p_o2 + p_n2 + p_vap                                 # EQ-FCFMU-7
    y_o2 = p_o2 / p_ca                                         # EQ-FCFMU-8
    theta = v_water / V_CAP_MAX                                # EQ-FCFMU-9
    lin = 40.0 * (y_o2 - 0.60)
    sat1 = 10.0 * max(0.0, theta - 0.40)
    sat2 = 35.0 * max(0.0, theta - 0.60)
    v_stack = 52.0 + lin - sat1 - sat2 * (theta - 0.60) + 0.08 * (t_stack - 343.15)  # EQ-FCFMU-10
    p_gross = v_stack * I_LOAD / 1000.0                        # EQ-FCFMU-11
    p_net = p_gross - P_AUX_KW                                 # EQ-FCFMU-12
    eta = 100.0 * p_net / P_H2_LHV_KW                          # EQ-FCFMU-13
    return {"p_vap": p_vap, "p_ca": p_ca, "y_o2": y_o2, "theta": theta,
            "v_stack": v_stack, "p_gross": p_gross, "p_net": p_net, "eta": eta}


def _derivs(p_o2, p_n2, p_h2, v_water, t_stack, u_o2, u_drain, u_an, alpha_drain):
    """五微分态右端（EQ-FCFMU-1…5；u/alpha 冻结于通信步起点——ZOH A-4）。"""
    a = _alg_true(p_o2, p_n2, p_h2, v_water, t_stack)
    dp_o2 = G_O2_IN * 1.0 * u_o2 - K_O2_REACT * I_LOAD - (p_o2 - P_O2_NOM) / TAU_CA      # EQ-1（alpha_o2=1.0 冻结）
    dp_n2 = K_N2_ACCUM * (U_O2_NOM - 1.0 * u_o2) - (p_n2 - P_N2_NOM) / TAU_N2            # EQ-2
    dp_h2 = G_H2_IN * u_an - K_H2_REACT * I_LOAD - (p_h2 - P_H2_NOM) / TAU_AN            # EQ-3
    dv = Q_COND * I_LOAD - Q_DRAIN_MAX * alpha_drain * u_drain                            # EQ-4
    dt = (((N_CELL * E_LHV - a["v_stack"]) * I_LOAD) / 1000.0 - H_COOL * (t_stack - T_COOL_IN)) / C_TH  # EQ-5
    return {"dp_o2": dp_o2, "dp_n2": dp_n2, "dp_h2": dp_h2, "dv": dv, "dt": dt,
            "p_gross": a["p_gross"]}


def _control(feedback_mode, p_ca_meas, v_water_meas):
    """控制律（EQ-FCFMU-18/19；Q16：u_an 全域 0.50；closed_loop 对受染测量）。"""
    if feedback_mode == "closed_loop":
        u_o2 = min(U_MAX, max(U_MIN, 0.50 - 0.01 * (p_ca_meas - 200.0)))
        u_drain = min(U_MAX, max(U_MIN, 0.50 + 0.002 * (v_water_meas - 200.0)))
    else:  # baseline / monitor（G9 monitor_only → 仓内 monitor 映射——Q12）
        u_o2 = 0.50
        u_drain = 0.50
    return {"u_o2": u_o2, "u_drain": u_drain, "u_an": U_AN_CONST}


def _row_variables(x, feedback_mode, b_p_ca, b_v_water, bias_applied):
    """单点全变量（EQ-FCFMU-6…23；bias_applied=False = pre 相位（A-2 裁定））。
    运算序冻结：真值代数 → 测量（受染） → 控制（对受染测量） → 估计 → 残差。"""
    p_o2, p_n2, p_h2, v_water, t_stack = x
    a = _alg_true(p_o2, p_n2, p_h2, v_water, t_stack)
    bp = b_p_ca if bias_applied else 0.0
    bv = b_v_water if bias_applied else 0.0
    p_ca_meas = a["p_ca"] + bp                                            # EQ-14
    v_water_meas = v_water + bv                                           # EQ-15
    v_stack_meas = a["v_stack"]                                           # EQ-16
    t_stack_meas = t_stack                                                # EQ-17
    ctl = _control(feedback_mode, p_ca_meas, v_water_meas)                # EQ-18/19
    p_n2_est = 50.0 + (200.0 - p_ca_meas) * (-0.35)                       # EQ-20（内部量——不 emit）
    theta_est = v_water_meas / V_CAP_MAX                                  # EQ-21
    r_p = p_ca_meas - a["p_ca"]                                           # EQ-22
    r_water = v_water_meas - v_water                                      # EQ-23
    return {
        "p_O2_ca_true_kPa": p_o2, "p_N2_ca_true_kPa": p_n2, "p_H2_an_true_kPa": p_h2,
        "V_water_store_true_mL": v_water, "T_stack_true_K": t_stack,
        "p_ca_true_kPa": a["p_ca"], "y_O2_ca_true": a["y_o2"],
        "cap_water_ratio_true": a["theta"], "V_stack_true_V": a["v_stack"],
        "eta_sys_true_pct": a["eta"],
        "p_ca_meas_kPa": p_ca_meas, "V_water_store_meas_mL": v_water_meas,
        "V_stack_meas_V": v_stack_meas, "T_stack_meas_K": t_stack_meas,
        "u_o2_valve_cmd": ctl["u_o2"], "u_drain_valve_cmd": ctl["u_drain"],
        "u_an_valve_cmd": ctl["u_an"], "cap_water_ratio_est": theta_est,
        "r_meas_p_kPa": r_p, "r_meas_water_mL": r_water,
        "_p_n2_est_kPa": p_n2_est,           # EQ-20 内部量（非 §3.1 表——不 emit）
        "_p_gross_kW": a["p_gross"],         # 标量积分用
    }


def _snapshot_vars(row):
    """事件快照变量面（20 键 = §3.1 十九 + u_an——A-5/Q13；内部量不入快照）。"""
    out = {}
    for sid in SERIES_IDS:
        if sid == "t":
            continue
        out[sid] = row[sid]
    return out


# ---------------------------------------------------------------------------
# simulate_run（归一契约：resolve_run_spec 双形态；RK4 dt_int=0.01 / 通信步 0.1 ZOH）
# ---------------------------------------------------------------------------
def simulate_run(run_key_or_spec, half_step=False):
    """单 Run 仿真（5 微分态经典 RK4；601 点 + 事件快照 pre/post）。

    half_step=True：dt_int=0.005（FMU-6 半步自收敛对照——仅自检用，不进 golden）。
    更新序（冻结）：通信步块 [t_k, t_k+0.1)——u 块起点按测量计值冻结（ZOH）→
    10×RK4 子步（δt=0.01，rhs 内代数链现算）→ 块末状态 → 行代数全量重算。
    """
    spec = oracle_base.resolve_run_spec(RUNS, run_key_or_spec)
    dt_int = DT_INT / 2.0 if half_step else DT_INT
    sub = int(round(DT_S / dt_int))

    b_p = spec["b_p_ca_kPa"]
    b_v = spec["b_V_water_mL"]
    fb = spec["feedback_mode"]
    alpha_post = spec["alpha_drain_post"]

    x = [120.0, 50.0, 180.0, 200.0, 343.15]   # §3.1 标称稳态初值（解析精确）
    series = {sid: [None] * N_SAMPLES for sid in SERIES_IDS}

    eg_kws = 0.0                               # ∫P_gross dt（kW·s，子步左矩形）

    # 行 0（t=0，无偏置、标称控制）
    row0 = _row_variables(x, fb, b_p, b_v, False)
    for sid in SERIES_IDS:
        series[sid][0] = 0.0 if sid == "t" else row0[sid]

    # 相位一：[0, 20.0)——200 通信步块（行 0…199），故障未施加
    n_pre_blocks = int(round(T_START / DT_S))          # 200
    for k in range(0, n_pre_blocks):
        tk = k * DT_S
        row_k = _row_variables(x, fb, b_p, b_v, False)
        u = (row_k["u_o2_valve_cmd"], row_k["u_drain_valve_cmd"], row_k["u_an_valve_cmd"])
        for _ in range(sub):
            d = _derivs(x[0], x[1], x[2], x[3], x[4], u[0], u[1], u[2], 1.0)
            eg_kws += d["p_gross"] * dt_int
            # 经典 RK4（运算序冻结；u/alpha 冻结——rhs 代数链现算）
            k1 = d
            x2 = [x[0] + dt_int / 2.0 * k1["dp_o2"], x[1] + dt_int / 2.0 * k1["dp_n2"],
                  x[2] + dt_int / 2.0 * k1["dp_h2"], x[3] + dt_int / 2.0 * k1["dv"],
                  x[4] + dt_int / 2.0 * k1["dt"]]
            k2 = _derivs(x2[0], x2[1], x2[2], x2[3], x2[4], u[0], u[1], u[2], 1.0)
            x3 = [x[0] + dt_int / 2.0 * k2["dp_o2"], x[1] + dt_int / 2.0 * k2["dp_n2"],
                  x[2] + dt_int / 2.0 * k2["dp_h2"], x[3] + dt_int / 2.0 * k2["dv"],
                  x[4] + dt_int / 2.0 * k2["dt"]]
            k3 = _derivs(x3[0], x3[1], x3[2], x3[3], x3[4], u[0], u[1], u[2], 1.0)
            x4 = [x[0] + dt_int * k3["dp_o2"], x[1] + dt_int * k3["dp_n2"],
                  x[2] + dt_int * k3["dp_h2"], x[3] + dt_int * k3["dv"],
                  x[4] + dt_int * k3["dt"]]
            k4 = _derivs(x4[0], x4[1], x4[2], x4[3], x4[4], u[0], u[1], u[2], 1.0)
            x = [x[0] + dt_int / 6.0 * (k1["dp_o2"] + 2.0 * k2["dp_o2"] + 2.0 * k3["dp_o2"] + k4["dp_o2"]),
                 x[1] + dt_int / 6.0 * (k1["dp_n2"] + 2.0 * k2["dp_n2"] + 2.0 * k3["dp_n2"] + k4["dp_n2"]),
                 x[2] + dt_int / 6.0 * (k1["dp_h2"] + 2.0 * k2["dp_h2"] + 2.0 * k3["dp_h2"] + k4["dp_h2"]),
                 x[3] + dt_int / 6.0 * (k1["dv"] + 2.0 * k2["dv"] + 2.0 * k3["dv"] + k4["dv"]),
                 x[4] + dt_int / 6.0 * (k1["dt"] + 2.0 * k2["dt"] + 2.0 * k3["dt"] + k4["dt"])]
        if k + 1 < n_pre_blocks:
            row_next = _row_variables(x, fb, b_p, b_v, False)
            for sid in SERIES_IDS:
                series[sid][k + 1] = (k + 1) * DT_S if sid == "t" else row_next[sid]

    # t=20.0：pre 快照（左极限——偏置未施加、C0 连续态）→ 故障突变 → post 行（零步长代数）
    pre_row = _row_variables(x, fb, b_p, b_v, False)
    pre_vars = _snapshot_vars(pre_row)
    post_row = _row_variables(x, fb, b_p, b_v, True)
    post_vars = _snapshot_vars(post_row)
    for sid in SERIES_IDS:
        series[sid][I_F] = T_START if sid == "t" else post_row[sid]

    # 相位二：[20.0, 60.0]——400 通信步块（行 200…599 积分、行 201…600 记录）
    alpha = alpha_post
    for k in range(I_F, N_SAMPLES - 1):
        row_k = _row_variables(x, fb, b_p, b_v, True)
        u = (row_k["u_o2_valve_cmd"], row_k["u_drain_valve_cmd"], row_k["u_an_valve_cmd"])
        for _ in range(sub):
            d = _derivs(x[0], x[1], x[2], x[3], x[4], u[0], u[1], u[2], alpha)
            eg_kws += d["p_gross"] * dt_int
            k1 = d
            x2 = [x[0] + dt_int / 2.0 * k1["dp_o2"], x[1] + dt_int / 2.0 * k1["dp_n2"],
                  x[2] + dt_int / 2.0 * k1["dp_h2"], x[3] + dt_int / 2.0 * k1["dv"],
                  x[4] + dt_int / 2.0 * k1["dt"]]
            k2 = _derivs(x2[0], x2[1], x2[2], x2[3], x2[4], u[0], u[1], u[2], alpha)
            x3 = [x[0] + dt_int / 2.0 * k2["dp_o2"], x[1] + dt_int / 2.0 * k2["dp_n2"],
                  x[2] + dt_int / 2.0 * k2["dp_h2"], x[3] + dt_int / 2.0 * k2["dv"],
                  x[4] + dt_int / 2.0 * k2["dt"]]
            k3 = _derivs(x3[0], x3[1], x3[2], x3[3], x3[4], u[0], u[1], u[2], alpha)
            x4 = [x[0] + dt_int * k3["dp_o2"], x[1] + dt_int * k3["dp_n2"],
                  x[2] + dt_int * k3["dp_h2"], x[3] + dt_int * k3["dv"],
                  x[4] + dt_int * k3["dt"]]
            k4 = _derivs(x4[0], x4[1], x4[2], x4[3], x4[4], u[0], u[1], u[2], alpha)
            x = [x[0] + dt_int / 6.0 * (k1["dp_o2"] + 2.0 * k2["dp_o2"] + 2.0 * k3["dp_o2"] + k4["dp_o2"]),
                 x[1] + dt_int / 6.0 * (k1["dp_n2"] + 2.0 * k2["dp_n2"] + 2.0 * k3["dp_n2"] + k4["dp_n2"]),
                 x[2] + dt_int / 6.0 * (k1["dp_h2"] + 2.0 * k2["dp_h2"] + 2.0 * k3["dp_h2"] + k4["dp_h2"]),
                 x[3] + dt_int / 6.0 * (k1["dv"] + 2.0 * k2["dv"] + 2.0 * k3["dv"] + k4["dv"]),
                 x[4] + dt_int / 6.0 * (k1["dt"] + 2.0 * k2["dt"] + 2.0 * k3["dt"] + k4["dt"])]
        row_next = _row_variables(x, fb, b_p, b_v, True)
        for sid in SERIES_IDS:
            series[sid][k + 1] = (k + 1) * DT_S if sid == "t" else row_next[sid]

    # 标量（E_gross 子步左矩形累计；E_aux 解析；E_net = E_gross − E_aux）
    e_gross_kwh = eg_kws / 3600.0
    e_aux_kwh = P_AUX_KW * DURATION_S / 3600.0
    e_net_kwh = e_gross_kwh - e_aux_kwh
    row_end = _row_variables(x, fb, b_p, b_v, True)
    scalars = {
        "E_gross_kWh": e_gross_kwh,
        "E_aux_kWh": e_aux_kwh,
        "E_net_kWh": e_net_kwh,
        "theta_cap_end": row_end["cap_water_ratio_true"],
        "y_O2_end": row_end["y_O2_ca_true"],
        "V_water_end_mL": row_end["V_water_store_true_mL"],
    }
    metrics = {
        "eta_sys_end_pct": {"value": row_end["eta_sys_true_pct"], "unit": "%"},
        "V_stack_end_V": {"value": row_end["V_stack_true_V"], "unit": "V"},
        "P_net_end_kW": {"value": row_end["V_stack_true_V"] * I_LOAD / 1000.0 - P_AUX_KW, "unit": "kW"},
        "p_ca_true_end_kPa": {"value": row_end["p_ca_true_kPa"], "unit": "kPa"},
        "theta_cap_end": {"value": row_end["cap_water_ratio_true"], "unit": "-"},
        "y_O2_end": {"value": row_end["y_O2_ca_true"], "unit": "-"},
        "V_water_end_mL": {"value": row_end["V_water_store_true_mL"], "unit": "mL"},
    }

    # 事件（故障 Run 一件——pre/post 快照 20 变量；baseline 无事件）
    events = []
    if spec["faulted"]:
        if spec["family"] == "sensor_drift":
            ev_type = "sensor_bias"
            if spec["target"] == "p_ca":
                mag, unit, tgt_sig = b_p, "kPa", "p_ca_meas_kPa"
            else:
                mag, unit, tgt_sig = b_v, "mL", "V_water_store_meas_mL"
        else:
            ev_type = "actuator_degradation"
            mag, unit, tgt_sig = alpha_post, "-", "u_drain_valve_cmd"
        events.append({
            "event_id": "EV-FCFMU-001",
            "event_type": ev_type,
            "trigger_s": T_START,
            "target_signal": tgt_sig,
            "target_component": "sensor" if spec["family"] == "sensor_drift" else "drain_valve",
            "magnitude": mag,
            "unit": unit,
            "phase": "onset",
            "label": spec["note"],
            "snapshots": [
                {"snapshot_id": "EV-FCFMU-001-pre", "event_id": "EV-FCFMU-001", "phase": "pre",
                 "t_s": T_START, "derivation": "left_limit", "variables": pre_vars},
                {"snapshot_id": "EV-FCFMU-001-post", "event_id": "EV-FCFMU-001", "phase": "post",
                 "t_s": T_START, "derivation": "post_sample", "variables": post_vars},
            ],
        })

    return {
        "key": spec["key"],
        "role": spec["role"],
        "feedback_mode": fb,
        "model_provenance": "fmu_l1_lumped_unvalidated",   # §11 Q2(A) 定案档位
        "fault": {
            "family": spec["family"],
            "t_start_s": T_START if spec["faulted"] else None,
            "target": spec["target"],
            "params": {"b_p_ca_kPa": b_p, "b_V_water_mL": b_v,
                       "alpha_drain_post": alpha_post},
        },
        "events": events,
        "scalars": scalars,
        "metrics": metrics,
        "series": series,
    }


# ---------------------------------------------------------------------------
# 自检（FMU-1…7——APPROVED v1.0 §4 项 5）
# ---------------------------------------------------------------------------
def self_check():
    checks = []

    def rec(cid, ok_, observed, tolerance, note):
        checks.append(oracle_base.check_record(cid, ok_, observed, tolerance, note))
        return ok_

    nominal = {
        "p_O2_ca_true_kPa": 120.0, "p_N2_ca_true_kPa": 50.0, "p_H2_an_true_kPa": 180.0,
        "V_water_store_true_mL": 200.0, "T_stack_true_K": 343.15,
        "p_ca_true_kPa": 200.0, "y_O2_ca_true": 0.60, "cap_water_ratio_true": 0.40,
        "V_stack_true_V": 52.0, "eta_sys_true_pct": 100.0 * (52.0 * I_LOAD / 1000.0 - P_AUX_KW) / P_H2_LHV_KW,
        "p_ca_meas_kPa": 200.0, "V_water_store_meas_mL": 200.0,
        "V_stack_meas_V": 52.0, "T_stack_meas_K": 343.15,
        "u_o2_valve_cmd": 0.50, "u_drain_valve_cmd": 0.50, "u_an_valve_cmd": 0.50,
        "cap_water_ratio_est": 0.40, "r_meas_p_kPa": 0.0, "r_meas_water_mL": 0.0,
    }

    # FMU-1 环境校验：baseline 全轨 = 标称解析恒等（RK4 零导数平衡；容差 1e-9）
    base = simulate_run("baseline")
    worst = 0.0
    for sid, ref in nominal.items():
        arr = base["series"][sid]
        for v in arr:
            if v is not None:
                worst = max(worst, abs(v - ref))
    rec("FMU-1-nominal-identity", worst <= 1e-9, worst, 1e-9,
        "baseline 601 点全通道 = 标称稳态解析值（EQ-FCFMU 1..13 零导数平衡）")

    # FMU-2 恒等式：r=b*I 逐点 / 分压和 / theta 定义（故障 Run 全行；A-2 裁定口径）
    worst_r = 0.0
    worst_sum = 0.0
    worst_theta = 0.0
    for key in ("sensor_p_ca_closed_loop", "sensor_v_water_closed_loop",
                "actuator_drain_closed_loop"):
        spec = oracle_base.resolve_run_spec(RUNS, key)
        r = simulate_run(key)
        b_p = spec["b_p_ca_kPa"]
        b_v = spec["b_V_water_mL"]
        for i in range(N_SAMPLES):
            t = r["series"]["t"][i]
            act_p = b_p if (spec["faulted"] and t >= FAULT_TIME - 1e-12) else 0.0
            act_v = b_v if (spec["faulted"] and t >= FAULT_TIME - 1e-12) else 0.0
            worst_r = max(worst_r, abs(r["series"]["r_meas_p_kPa"][i] - act_p),
                          abs(r["series"]["r_meas_water_mL"][i] - act_v))
            s = (r["series"]["p_O2_ca_true_kPa"][i] + r["series"]["p_N2_ca_true_kPa"][i]
                 + 30.0 + 1.2 * (r["series"]["T_stack_true_K"][i] - 343.15))
            worst_sum = max(worst_sum, abs(s - r["series"]["p_ca_true_kPa"][i]))
            worst_theta = max(worst_theta, abs(
                r["series"]["cap_water_ratio_true"][i]
                - r["series"]["V_water_store_true_mL"][i] / V_CAP_MAX))
    rec("FMU-2-identities", worst_r <= 1e-9 and worst_sum <= 1e-9 and worst_theta <= 1e-12,
        max(worst_r, worst_sum, worst_theta), "r<=1e-9 sum<=1e-9 theta<=1e-12",
        "EQ-22/23 残差恒等（pre 行 0/post 行 +b）+ EQ-7 分压和 + EQ-9 定义恒等")

    # FMU-3 网格与事件相位：601 点 t[i]=i*0.1；快照 pre=left_limit/post=post_sample
    grid_ok = True
    ev_ok = True
    worst_grid = 0.0
    for spec in RUNS:
        r = simulate_run(spec["key"])
        for i in range(N_SAMPLES):
            worst_grid = max(worst_grid, abs(r["series"]["t"][i] - i * DT_S))
        if spec["faulted"]:
            ev = r["events"][0]
            pre, post = ev["snapshots"][0], ev["snapshots"][1]
            ev_ok = ev_ok and pre["t_s"] == T_START and post["t_s"] == T_START \
                and pre["derivation"] == "left_limit" and post["derivation"] == "post_sample" \
                and len(pre["variables"]) == 20 and len(post["variables"]) == 20
        else:
            ev_ok = ev_ok and len(r["events"]) == 0
    grid_ok = worst_grid <= 1e-9
    rec("FMU-3-grid-events", grid_ok and ev_ok, worst_grid, 1e-9,
        "601 点网格 t[i]=i*0.1 + 快照相位 pre=left_limit/post=post_sample（20 变量键）")

    # FMU-4 锚点全表复算：baseline 行 0 = §3.1 十九值 + u_an（解析精确）
    worst_anchor = 0.0
    for sid, ref in nominal.items():
        worst_anchor = max(worst_anchor, abs(base["series"][sid][0] - ref))
    rec("FMU-4-anchors", worst_anchor <= 1e-9, worst_anchor, 1e-9,
        "APPROVED §3.1 标称稳态表 20 键逐值复算（t=0 行）")

    # FMU-5 monitor 不变量：Run-3 true 通道 = Run-1 标称轨（b 不进物理回路）
    mon = simulate_run("sensor_p_ca_monitor")
    true_ids = ["p_O2_ca_true_kPa", "p_N2_ca_true_kPa", "p_H2_an_true_kPa",
                "V_water_store_true_mL", "T_stack_true_K", "p_ca_true_kPa",
                "y_O2_ca_true", "cap_water_ratio_true", "V_stack_true_V",
                "eta_sys_true_pct"]
    worst_mon = 0.0
    for sid in true_ids:
        for i in range(N_SAMPLES):
            worst_mon = max(worst_mon, abs(mon["series"][sid][i] - base["series"][sid][i]))
    rec("FMU-5-monitor-invariant", worst_mon <= 1e-9, worst_mon, 1e-9,
        "Run-3 true 通道 601 点 = Run-1 标称轨（monitor 不变量——EQ-14/15 b 不进物理回路）")

    # FMU-6 半步自收敛：dt_int=0.01 vs 0.005（Run-2 全通道 601 点 max|diff|）
    full = simulate_run("sensor_p_ca_closed_loop")
    half = simulate_run("sensor_p_ca_closed_loop", half_step=True)
    worst_half = 0.0
    for sid in SERIES_IDS:
        if sid == "t":
            continue
        for i in range(N_SAMPLES):
            a, b = full["series"][sid][i], half["series"][sid][i]
            if a is not None and b is not None:
                worst_half = max(worst_half, abs(a - b))
    rec("FMU-6-half-step", worst_half <= 1e-6, worst_half, 1e-6,
        "dt_int 0.01 vs 0.005 全通道 max|diff|（RK4 收敛判据实测登记；gate 值按实测 x>=10 冻结制——Q9）")

    # FMU-7 NaN/Inf + 值域抽查：全 Run 全通道有限；theta in [0,1]、u in [0.05,0.95]
    finite_ok = True
    dom_ok = True
    for spec in RUNS:
        r = simulate_run(spec["key"])
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if v is None:
                    continue
                if not math.isfinite(v):
                    finite_ok = False
        for i in range(N_SAMPLES):
            th = r["series"]["cap_water_ratio_true"][i]
            if not (0.0 <= th <= 1.0):
                dom_ok = False
            for sid in ("u_o2_valve_cmd", "u_drain_valve_cmd", "u_an_valve_cmd"):
                u = r["series"][sid][i]
                if not (U_MIN - 1e-12 <= u <= U_MAX + 1e-12):
                    dom_ok = False
    rec("FMU-7-finite-domain", finite_ok and dom_ok,
        "finite=%s domain=%s" % (finite_ok, dom_ok), "all finite; theta in [0,1]; u in [0.05,0.95]",
        "全 Run 全通道有限性 + theta/u 值域（APPROVED §3.2 包络登记）")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


# ---------------------------------------------------------------------------
# build_golden（schema v2——gt001_v2 风格元数据 + fc001_v2 runs 结构同构）
# ---------------------------------------------------------------------------
def _fault_block(spec):
    if not spec["faulted"]:
        return {"family": "none", "t_start_s": None, "target": None,
                "params": {"b_p_ca_kPa": 0.0, "b_V_water_mL": 0.0, "alpha_drain_post": 1.0}}
    return {
        "family": spec["family"],
        "t_start_s": T_START,
        "target": spec["target"],
        "params": {"b_p_ca_kPa": spec["b_p_ca_kPa"], "b_V_water_mL": spec["b_V_water_mL"],
                   "alpha_drain_post": spec["alpha_drain_post"]},
    }


def build_golden():
    runs = {}
    for spec in RUNS:
        r = simulate_run(spec)
        runs[r["key"]] = {
            "role": r["role"],
            "feedback_mode": r["feedback_mode"],
            "model_provenance": r["model_provenance"],
            "fault": _fault_block(spec),
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
        "supersedes": None,   # 并列第三轨（非 fc001_v2 取代——轨关系由 provenance/层级承载）
        "method_id": METHOD_ID,
        "method_version": METHOD_VERSION,
        "model_provenance": "fmu_l1_lumped_unvalidated",
        "units": {"t": "s", "p": "kPa", "V_water": "mL", "T": "K", "V": "V",
                  "P": "kW", "E": "kWh", "ratio": "-", "u": "-",
                  "r_p": "kPa", "r_water": "mL"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T_START,
            "dt_int_s": DT_INT, "i_load_a": I_LOAD,
            "n_cell": N_CELL, "g_o2_in_kPa_s": G_O2_IN, "k_o2_react_kPa_As": K_O2_REACT,
            "tau_ca_s": TAU_CA, "k_n2_accum_kPa_s": K_N2_ACCUM, "tau_n2_s": TAU_N2,
            "g_h2_in_kPa_s": G_H2_IN, "k_h2_react_kPa_As": K_H2_REACT, "tau_an_s": TAU_AN,
            "q_cond_mL_As": Q_COND, "q_drain_max_mL_s": Q_DRAIN_MAX, "v_cap_max_mL": V_CAP_MAX,
            "e_lhv_v": E_LHV, "p_h2_lhv_kw": P_H2_LHV_KW, "p_aux_kw": P_AUX_KW,
            "t_cool_in_k": T_COOL_IN, "h_cool_kw_k": H_COOL, "c_th_kj_k": C_TH,
            "p_o2_nom_kPa": P_O2_NOM, "p_n2_nom_kPa": P_N2_NOM,
            "p_h2_nom_kPa": P_H2_NOM, "u_o2_nom": U_O2_NOM,
            "u_an": U_AN_CONST,
            "feedback_modes": ["baseline", "closed_loop", "monitor"],
            "note": "FC-001 5 态 L1-FMU 第三轨（5.0 kW 净输出空间 PEMFC、N_cell=80、"
                    "名义 I_load=100 A、微重力膜分离器储水链——APPROVED v1.0 §1.3 冻结表；"
                    "EQ-FCFMU-1..23；RK4 dt_int=0.01/通信步 0.1 ZOH（A-4）；601 点 + 事件"
                    "快照相位承载（Q1(A)）；残差相位裁定 A-2：pre 行 0/post 行 +b；"
                    "u_an 维持 0.50（Q16）；nom 四常量 §11 Q16 补入",
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": I_F, "t_0": 0.0, "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": {
            "gate": {
                "tier": "T-B",
                "t_s": 1e-9,
                "p_kPa_atol": 1e-9,
                "V_mL_atol": 1e-9,
                "T_K_atol": 1e-9,
                "dim_atol": 1e-12,
                "V_stack_atol": 1e-9,
                "V_stack_rtol": 1e-12,
                "SOC_pp": 1e-9,
                "E_kWh": 1e-9,
                "P_kW_atol": 1e-9,
                "P_kW_rtol": 1e-12,
                "note": "T-B 数值容差承诺（非位级——Q9(A)）；实测散差 x>=10 冻结制："
                        "verify_golden Python-Python 复算同代码零散差实测（emit 轮），"
                        "C-Python parity 待 Q10 工具链（独立机检——Q17(a)）",
            },
        },
        "runs": runs,
        "metrics_note": "golden 指标为独立可算子集（终点代数/能量账本）；EQ-FCFMU 冻结表"
                        "唯一权威 = FC001_FMU_G2B_SPEC_APPROVED v1.0 §1.3/§1.4；行为与"
                        "数值集总参数演示模型（model_provenance=fmu_l1_lumped_unvalidated，"
                        "未经实验/硬件验证——数值与实现自洽 only）",
    }


def _oracle_source_sha256():
    return oracle_base.oracle_source_sha256(os.path.abspath(__file__))


# ---------------------------------------------------------------------------
# emit（oracle_base 机制路径；先 FMU-1…7 自检，失败 exit 2 不写盘）
# ---------------------------------------------------------------------------
def emit():
    ok, checks = self_check()
    if not ok:
        print(json.dumps({"ok": False, "checks": checks}, ensure_ascii=True, indent=2))
        return 2
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    path = os.path.join(root, "data", "golden", GOLDEN_ID + ".json")
    golden = build_golden()
    golden["generated_by"] = oracle_base.generated_by_block(
        tool="tools/oracle/fc001_fmu_oracle.py + tools/oracle/oracle_base.py（机制层）",
        oracle_path=os.path.abspath(__file__),
        command="python -I tools/oracle/fc001_fmu_oracle.py --emit")
    oracle_base.apply_approval(golden, APPROVED_BY, APPROVED_AT)
    digest = oracle_base.write_golden_with_sidecar(golden, path)
    print(json.dumps({
        "written": os.path.abspath(path),
        "bytes": os.path.getsize(path),
        "golden_sha256": digest,
        "oracle_source_sha256": golden["generated_by"]["oracle_source_sha256"],
        "approved_by": golden["approval"]["approved_by"],
        "approved_at": golden["approval"]["approved_at"],
    }, ensure_ascii=False, indent=2))
    return 0


def main(argv):
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
