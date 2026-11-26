# -*- coding: utf-8 -*-
"""gt_tl_joint_oracle.py — GT-001 + TL-001 联合轨（功角摇摆）独立 oracle（GTLJ-G2b-03；
CHG-20261125-01 批准链 + CHG-20261125-02 轻量实现轮）。

规格权威文本（唯一）：FaultLab-evaluation/NEXT/TL001_FMU_G2B_SPEC_APPROVED v1.0
（GTLJ-G2b-02 批准轮收口，CHG-20261125-01——Q1…Q13 定案）：
  - §1.3 联合冻结表（单转子形 Q1=(a)）：GT 侧 EQ-GTL1-1..6/8..12 逐字沿袭（GTL1 §2.2——值零改动）；
    EQ-GTL1-7 联合修订行 P_rotor = P_gen + P_bat − P_load − P_elec(δ)；
    TL-EQ-1 dδ/dt = 2π·(f − f₀)；TL-EQ-3 P_elec = s·(V_gen·V_inf/X_line)·sin(δ)/1000；
    TL-EQ-5 V_gen = (f/f₀)·V_rated；TL-EQ-2/4 溶解（无独立方程）；
  - §1.4 参数（Q2）：X_line = 3.2 Ω（0.5 p.u.）、V_rated = V_inf = 400 V、D 不启用；
    δ₀ = arcsin((P_gen0 + P_bat_ref − demand0)/P_max0)（基线 demand=30 → 0；出口基线 demand=20 →
    arcsin(0.2)——Q3）；
  - §1.5 分区（Q4=(a)）：调速器积分 EQ-GTL1-9/10 归 host、内核纯物理 RK4 y=[f,T3,δ]、h=0.01、
    u_eff/demand/p_elec_scale 子步起点冻结；P_elec/V_gen 逐 RK4 stage 现算；
  - §2.1 8 Run（Q11=(a)）；§2.2 joint_gt_standalone = 线路断路器开断 P_elec ≡ 0、δ 照常积分
    （Q8=(a)）——GLJ-5 只读交叉 gt001_v3 healthy（Q8=(i)）；§2.3 r_true 恒等换底（Q9=(a)）；
  - §4 golden 计划：30 列（Q7=(a)）、gate 十键 + delta_rad_atol/omega_rad_s_atol（Q10）、
    model_id=gt.sync.tl.l0 / inertia_model=thermo / flat RUNS（Q12）、
    model_provenance=fmu_l1_lumped_unvalidated（Q13=(b)）。
  - **轻量实现轮（CHG-20261125-02）**：C99 联合内核 / parity / FMU 包缓做（随 linux64 D-12）；
    本 oracle 的「内核步」即规范实现，引擎 simulateTL001 为第二实现（T-B gate 交叉）。

独立性声明（§4 项 2）：不 import src/**、不 import 任何既有 oracle（gt001*/fc001*/fl001*/mg001*——
仅 oracle_base 机制层）；GT 侧方程与常量 = GTL1 §2 批准文本逐字转写；Python stdlib（python -I）。
GLJ-5 以只读方式读取 data/golden/gt001_v3.json（JSON 字节，不触碰其 oracle——V-03 无涉）。

用法：
  python -I tools/oracle/gt_tl_joint_oracle.py --self-check    # GLJ-1…7 自检（exit 0/2）
  python -I tools/oracle/gt_tl_joint_oracle.py --emit          # golden emit（先自检，失败 exit 2）
  python -I tools/oracle/gt_tl_joint_oracle.py --summary       # 自检 + 标量/指标摘要
"""

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle_base  # noqa: E402  机制层（V-03/approval/sidecar/resolve_run_spec/check_record）

GOLDEN_ID = "gt_tl_joint_v1"
MODEL_ID = "gt.sync.tl.l0"            # Q12=(a)
MODEL_VERSION = "1.0.0"
METHOD_ID = "gt_tl_joint_rk4_dt0.01"
METHOD_VERSION = "1.0.0"
APPROVED_BY = "user（2026-11-25 CHG-20261125-01 批准链——GTLJ-G2b-02 批准轮；轻量实现轮 CHG-20261125-02）"
APPROVED_AT = "2026-11-25T00:00:00Z"
PROVENANCE = "fmu_l1_lumped_unvalidated"   # Q13=(b)

# ---------------------------------------------------------------------------
# GT 侧冻结常量（GTL1 §2.1 批准规格逐字——值零改动；15 位有效数字面）
# ---------------------------------------------------------------------------
T1_K = 288.15            # ISO 参考大气进口温度（K）
P1_KPA = 101.325         # ISO 参考大气进口压力（kPa）
CP_A = 1.005             # 空气定压比热 kJ/(kg*K)
GAMMA_A = 1.4            # 空气比热比
A_C = (GAMMA_A - 1.0) / GAMMA_A          # = 2/7
CP_G = 1.148             # 燃气定压比热 kJ/(kg*K)
GAMMA_G = 4.0 / 3.0      # 燃气比热比
A_T = (GAMMA_G - 1.0) / GAMMA_G          # = 1/4
PIC0 = 8.0               # 设计压比（f=f0）
EPS_C = 0.82             # 压气机 isen 效率
EPS_T = 0.86             # 透平 isen 效率
BETA_B = 0.04            # 燃烧室压损系数
LHV = 50000.0            # 燃料低位热值 kJ/kg
ETA_B = 0.99             # 燃烧效率
ETA_M = 0.95             # 机械+发电机集总效率
T3D_K = 1173.0           # 设计燃烧室出口温度（K）
TAU_3 = 2.0              # 燃烧室集总热惯性时间常数（s）
KJ = 5.0                 # kW*s/Hz
F0 = 50.0                # Hz
KI = 2.0                 # 调速器积分增益（kW_eq/(Hz*s)）
K_BAT = 24.0             # 电池下垂 kW/Hz
P_BAT_REF = 5.0          # kW
CAP_KWH = 40.0           # 电池容量
K_F = 4.070531454334211                  # 燃料增益 kW_eq/单位指令
MDOT_A = 0.144299140389011               # 压气机空气流量 kg/s
C_3 = 0.335983796442745                  # 燃烧室集总热容 kJ/K
MDOT_G0 = 0.146334406116178              # 设计燃气流量 kg/s（展示值）

# ---------------------------------------------------------------------------
# TL 侧参数（§1.4 Q2 定案——教学整定值，未经实验/硬件验证）
# ---------------------------------------------------------------------------
V_RATED = 400.0          # V（TL-EQ-5 额定）
V_INF = 400.0            # V（无穷母线——常数）
X_LINE = 3.2             # Ω（0.5 p.u.，Z_base = 6.4 Ω）
S_BASE = 25.0            # kW
Z_BASE = 6.4             # Ω
P_MAX0 = V_RATED * V_INF / X_LINE / 1000.0   # 50 kW（f = f0）
P_GEN0 = 25.0            # 设计点 P_gen（EQ-GTL1-11）
TWO_PI = 2.0 * math.pi

DURATION_S = 60.0
DT_S = 0.1
N_SAMPLES = int(round(DURATION_S / DT_S)) + 1   # 601
DT_INT = 0.01
SUB = int(round(DT_S / DT_INT))
T_START = 20.0
LOAD0_KW = 30.0
LOAD_EXPORT_KW = 20.0    # Q3=(a) joint_line_fault 出口基线
SOC0_PCT = 60.0
V_BUS = 400.0
U0_CMD = 25.0

FAMILY_NONE = "none"
FAMILY_SENSOR = "sensor_drift"
FAMILY_LOAD = "load_step"
FAMILY_ACT = "actuator_fault"
FAMILY_LINE = "line_fault"
FAULT_ID_SENSOR = "speed_sensor_bias"
FAULT_ID_LOAD = "load_step_10kW"
FAULT_ID_ACT = "fuel_valve_stuck"
FAULT_ID_LINE = "tl_line_3ph_short"

#: 30 列（Q7=(a)）：GT 27 列（含 "t"）+ TL 3 列
SERIES_IDS = [
    "t",
    "f_true_Hz", "f_meas_Hz", "n_meas_rpm",
    "P_gen_true_kW", "P_gen_meas_kW", "P_gen_cmd_kW",
    "P_bat_true_kW", "P_bat_meas_kW",
    "P_load_demand_kW", "P_load_served_kW", "P_rotor_kW",
    "V_bus_V", "SOC_true_pct", "SOC_est_pct",
    "r_true_kW", "f_channel_diff_Hz", "valve_cmd_pct", "valve_meas_pct",
    "T3_out_K", "T2_out_K", "p2_out_kPa", "T4_out_K",
    "Q_fuel_kW", "P_comp_kW", "P_turb_kW", "eta_cycle_pct",
    "delta_rad", "P_elec_kW", "omega_rad_s",
]


def _run(key, role, fb, family, magnitude, unit, fault_id=None, demand0=LOAD0_KW,
         line_open=False, t_clear=None):
    spec = {"key": key, "role": role, "feedback_mode": fb, "family": family,
            "faulted": family != FAMILY_NONE, "magnitude": magnitude, "unit": unit,
            "fault_id": fault_id, "demand0_kW": demand0, "line_open": line_open,
            "inertia_model": "thermo"}
    if t_clear is not None:
        spec["t_clear_s"] = t_clear
    return spec


#: 8 Run（§2.1——Q11=(a)）；flat RUNS（Q12 (I)——不设 RUNS_GROUPS）
RUNS = [
    _run("joint_healthy", "baseline", "closed_loop", FAMILY_NONE, 0.0, ""),
    _run("joint_load_step", "fault", "closed_loop", FAMILY_LOAD, 10.0, "kW", FAULT_ID_LOAD),
    _run("joint_sensor_drift", "fault", "closed_loop", FAMILY_SENSOR, 0.3, "Hz", FAULT_ID_SENSOR),
    _run("joint_actuator_fault", "fault", "closed_loop", FAMILY_ACT, 50.0, "%", FAULT_ID_ACT),
    _run("joint_actuator_clear", "fault", "closed_loop", FAMILY_ACT, 50.0, "%", FAULT_ID_ACT,
         t_clear=35.0),
    _run("joint_monitor_only", "monitor", "monitor", FAMILY_SENSOR, 0.3, "Hz", FAULT_ID_SENSOR),
    # line_fault：magnitude = 故障持续时间（s）；金属性三相短路 p_elec_scale = 0（§2.5）
    _run("joint_line_fault", "fault", "closed_loop", FAMILY_LINE, 0.5, "s", FAULT_ID_LINE,
         demand0=LOAD_EXPORT_KW, t_clear=20.5),
    _run("joint_gt_standalone", "baseline", "closed_loop", FAMILY_NONE, 0.0, "", line_open=True),
]

TOLERANCES = {
    "gate": {
        "tier": "T-B",
        "f_Hz_atol": 1e-4,
        "n_rpm_atol": 1e-2,
        "T_K_atol": 1e-2,
        "p_kPa_atol": 1e-9,
        "P_kW_rtol": 1e-6,
        "P_kW_atol": 1e-3,
        "E_kWh": 1e-6,
        "SOC_pp": 1e-5,
        "r_true_kW": 1e-9,
        "t_s": 1e-9,
        # Q10=(a)：TL 新键（CHG-20261125-02 实测登记）——引擎（JS）↔oracle（Python）双实现实测
        # worst |diff|：delta_rad 1.93e-14 rad、omega_rad_s 1.71e-13 rad/s（8 Run 全序列）；门值取
        # 与 f_Hz_atol 量纲一致口径（delta 1e-6 rad；omega = 2π·f_Hz_atol ≈ 6.3e-4 → 6e-4 rad/s），
        # 安全系数 ≫10（规格 ×≥10 下限满足）；不落 f_Hz_atol 兜底（`_rad`/`_rad_s` 条件支）。
        "delta_rad_atol": 1e-6,
        "omega_rad_s_atol": 6e-4,
    },
}


def _oracle_source_sha256():
    return oracle_base.oracle_source_sha256(os.path.abspath(__file__))


def js_clamp(v, lo, hi):
    return lo if v < lo else (hi if v > hi else v)


def build_time_grid():
    return [i * DT_S for i in range(N_SAMPLES)]


def delta_eq(demand0):
    """§1.4 / §3.1：δ₀ = arcsin(P_elec_eq / P_max0)，P_elec_eq = P_gen0 + P_bat_ref − demand0。"""
    return math.asin((P_GEN0 + P_BAT_REF - demand0) / P_MAX0)


# ---------------------------------------------------------------------------
# 联合代数链（GT EQ-GTL1-1..6/8 逐字 + EQ-GTL1-7 联合修订行 + TL-EQ-1/3/5）
# ---------------------------------------------------------------------------
def chain_algebra(fv, t3v, dv, u_eff, demand, scale, line_open):
    pi_c = PIC0 * (fv / F0) ** 2                       # EQ-GTL1-1
    p2 = pi_c * P1_KPA
    t2 = T1_K * (1.0 + (pi_c ** A_C - 1.0) / EPS_C)    # EQ-GTL1-2
    q_f = K_F * u_eff                                  # EQ-GTL1-3
    mdot_f = q_f / LHV
    mdot_g = MDOT_A + mdot_f
    p3 = (1.0 - BETA_B) * p2                           # EQ-GTL1-5
    pi_t = p3 / P1_KPA
    t4 = t3v * (1.0 - EPS_T * (1.0 - pi_t ** (-A_T)))
    p_comp = MDOT_A * CP_A * (t2 - T1_K)               # EQ-GTL1-6
    p_turb = mdot_g * CP_G * (t3v - t4)
    p_gen = ETA_M * (p_turb - p_comp)
    p_bat = P_BAT_REF - K_BAT * (fv - 50.0)            # EQ-GTL1-8
    v_gen = (fv / F0) * V_RATED                        # TL-EQ-5
    if line_open:
        p_elec = 0.0                                   # §2.2 断路器开断：P_elec ≡ 0
    else:
        p_elec = scale * (v_gen * V_INF / X_LINE) * math.sin(dv) / 1000.0   # TL-EQ-3
    p_rotor = p_gen + p_bat - demand - p_elec          # EQ-GTL1-7 联合修订行
    dfdt = (p_rotor / KJ) * (F0 / fv)                  # EQ-GTL1-7 摇摆方程
    dt3 = (ETA_B * q_f - mdot_g * CP_G * (t3v - t2)) / C_3   # EQ-GTL1-4
    ddelta = TWO_PI * (fv - F0)                        # TL-EQ-1
    return {"t2": t2, "p2": p2, "t4": t4, "p_comp": p_comp, "p_turb": p_turb,
            "p_gen": p_gen, "p_bat": p_bat, "p_rotor": p_rotor, "q_f": q_f,
            "mdot_g": mdot_g, "v_gen": v_gen, "p_elec": p_elec,
            "dfdt": dfdt, "dt3": dt3, "ddelta": ddelta}


def _kernel_step(f, t3, d, u_eff, demand, scale, line_open, h):
    """联合内核单子步：y = [f, T3, δ] 经典 RK4；u_eff/demand/scale 子步冻结，P_elec 逐 stage 现算。"""
    k1 = chain_algebra(f, t3, d, u_eff, demand, scale, line_open)
    k2 = chain_algebra(f + 0.5 * h * k1["dfdt"], t3 + 0.5 * h * k1["dt3"],
                       d + 0.5 * h * k1["ddelta"], u_eff, demand, scale, line_open)
    k3 = chain_algebra(f + 0.5 * h * k2["dfdt"], t3 + 0.5 * h * k2["dt3"],
                       d + 0.5 * h * k2["ddelta"], u_eff, demand, scale, line_open)
    k4 = chain_algebra(f + h * k3["dfdt"], t3 + h * k3["dt3"],
                       d + h * k3["ddelta"], u_eff, demand, scale, line_open)
    f_new = f + h / 6.0 * (k1["dfdt"] + 2.0 * k2["dfdt"] + 2.0 * k3["dfdt"] + k4["dfdt"])
    t3_new = t3 + h / 6.0 * (k1["dt3"] + 2.0 * k2["dt3"] + 2.0 * k3["dt3"] + k4["dt3"])
    d_new = d + h / 6.0 * (k1["ddelta"] + 2.0 * k2["ddelta"] + 2.0 * k3["ddelta"] + k4["ddelta"])
    al_b = chain_algebra(f_new, t3_new, d_new, u_eff, demand, scale, line_open)
    return f_new, t3_new, d_new, k1, al_b


# ---------------------------------------------------------------------------
# Run 仿真（host 子步循环 ①②③④——gt001_fmu 更新序逐字镜像 + 线路事件域）
# ---------------------------------------------------------------------------
def simulate_run(spec, dt_int=DT_INT):
    spec = oracle_base.resolve_run_spec(RUNS, spec)
    family = spec["family"]
    faulted = spec["faulted"]
    monitor = spec["feedback_mode"] == "monitor"
    magnitude = spec["magnitude"] if faulted else 0.0
    t_start = T_START if faulted else None
    is_sensor = family == FAMILY_SENSOR
    is_load = family == FAMILY_LOAD
    is_act = family == FAMILY_ACT
    is_line = family == FAMILY_LINE
    line_open = bool(spec.get("line_open"))
    demand0 = spec.get("demand0_kW", LOAD0_KW)
    u_cap = 40.0 * magnitude / 100.0 if is_act else None
    t_clear = spec.get("t_clear_s") if (is_act or is_line) else None
    sub = int(round(DT_S / dt_int))
    h = dt_int

    def b_at(time):
        return magnitude if (is_sensor and t_start is not None
                             and time >= t_start - 1e-9) else 0.0

    def demand_at(time):
        return (demand0 + magnitude) if (is_load and t_start is not None
                                         and time >= t_start - 1e-9) else demand0

    def cap_active(time):
        return bool(is_act and t_start is not None and time >= t_start - 1e-9
                    and not (t_clear is not None and time >= t_clear - 1e-9))

    def scale_at(time):
        """p_elec_scale 线路状态事件域（§2.5）：故障窗 [t_start, t_clear) 内 0（金属性短路）。"""
        if is_line and time >= t_start - 1e-9 and not (time >= t_clear - 1e-9):
            return 0.0
        return 1.0

    t = build_time_grid()
    n = N_SAMPLES - 1
    series = {k: [None] * (n + 1) for k in SERIES_IDS if k != "t"}

    f = 50.0
    t3 = T3D_K
    d0 = delta_eq(demand0)
    d = d0
    u = U0_CMD
    int_pbat = 0.0
    int_pgen = 0.0
    int_demand = 0.0
    int_rotor = 0.0
    int_fuel = 0.0
    int_line = 0.0          # E_line：∫P_elec dt（梯形——E_gen/E_bat 同口径）
    int_slip_trap = 0.0     # GLJ-2：∫2π(f−f₀)dt 子步梯形（δ 积分恒等对照面）
    gl2_left_rect = 0.0
    gl2_rk4_inc = 0.0

    def record(k):
        time = t[k]
        b = b_at(time)
        demand = demand_at(time)
        u_eff = min(u, u_cap) if cap_active(time) else u
        al = chain_algebra(f, t3, d, u_eff, demand, scale_at(time), line_open)
        p_bat = al["p_bat"]
        p_rotor = al["p_rotor"]
        series["f_true_Hz"][k] = f
        series["f_meas_Hz"][k] = f
        series["n_meas_rpm"][k] = 60.0 * (f + b)
        series["P_gen_true_kW"][k] = al["p_gen"]
        series["P_gen_meas_kW"][k] = al["p_gen"]
        series["P_gen_cmd_kW"][k] = u
        series["P_bat_true_kW"][k] = p_bat
        series["P_bat_meas_kW"][k] = p_bat
        series["P_load_demand_kW"][k] = demand
        series["P_load_served_kW"][k] = demand
        series["P_rotor_kW"][k] = p_rotor
        series["V_bus_V"][k] = V_BUS
        series["SOC_true_pct"][k] = SOC0_PCT - int_pbat / (CAP_KWH * 3600.0) * 100.0
        series["SOC_est_pct"][k] = SOC0_PCT - int_pbat / (CAP_KWH * 3600.0) * 100.0
        # Q9=(a) 恒等换底：r_true = P_gen + P_bat − P_load − P_elec − P_rotor ≡ 0
        series["r_true_kW"][k] = al["p_gen"] + p_bat - demand - al["p_elec"] - p_rotor
        series["f_channel_diff_Hz"][k] = series["n_meas_rpm"][k] / 60.0 - series["f_meas_Hz"][k]
        series["valve_cmd_pct"][k] = js_clamp(u / 40.0 * 100.0, 0.0, 100.0)
        series["valve_meas_pct"][k] = magnitude if cap_active(time) else series["valve_cmd_pct"][k]
        series["T3_out_K"][k] = t3
        series["T2_out_K"][k] = al["t2"]
        series["p2_out_kPa"][k] = al["p2"]
        series["T4_out_K"][k] = al["t4"]
        series["Q_fuel_kW"][k] = al["q_f"]
        series["P_comp_kW"][k] = al["p_comp"]
        series["P_turb_kW"][k] = al["p_turb"]
        series["eta_cycle_pct"][k] = 100.0 * al["p_gen"] / al["q_f"]
        series["delta_rad"][k] = d
        series["P_elec_kW"][k] = al["p_elec"]
        series["omega_rad_s"][k] = TWO_PI * f      # Q7：派生列 ω = 2π·f

    record(0)
    for k in range(1, n + 1):
        for j in range(sub):
            time = (k - 1) * sub * h + j * h
            b = b_at(time)
            demand = demand_at(time)
            scale = scale_at(time)
            # host ①：指令更新（EQ-GTL1-9/10——Q4 governor 归 host）
            f_gov = f if (monitor and is_sensor) else f + b
            u_next = js_clamp(u + KI * (50.0 - f_gov) * h, 0.0, 40.0)
            u_eff = min(u_next, u_cap) if cap_active(time) else u_next
            # 内核 ②：联合 RK4
            f_new, t3_new, d_new, k1, al_b = _kernel_step(f, t3, d, u_eff, demand, scale,
                                                          line_open, h)
            # host ③：能量累计（E_gen/E_bat/E_line 梯形；E_fuel/E_load/E_rotor 左矩形）
            int_pgen += 0.5 * (k1["p_gen"] + al_b["p_gen"]) * h
            int_pbat += 0.5 * (k1["p_bat"] + al_b["p_bat"]) * h
            int_line += 0.5 * (k1["p_elec"] + al_b["p_elec"]) * h
            int_demand += demand * h
            int_rotor += k1["p_rotor"] * h
            int_fuel += k1["q_f"] * h
            int_slip_trap += 0.5 * (TWO_PI * (f - F0) + TWO_PI * (f_new - F0)) * h
            gl2_left_rect += ETA_B * k1["q_f"] * h - k1["mdot_g"] * CP_G * (t3 - k1["t2"]) * h
            gl2_rk4_inc += C_3 * (t3_new - t3)
            # host ④：提交
            f = f_new
            t3 = t3_new
            d = d_new
            u = u_next
        record(k)

    integrals = {
        "E_load": int_demand, "E_source": int_pgen, "E_bat": int_pbat,
        "E_rotor_int": int_rotor, "E_fuel": int_fuel, "E_line": int_line,
        "slip_trap": int_slip_trap, "delta0": d0, "delta_end": d,
        "gl2_left_rect": gl2_left_rect, "gl2_rk4_inc": gl2_rk4_inc,
    }

    soc_true_end = series["SOC_true_pct"][-1]
    soc_est_end = series["SOC_est_pct"][-1]
    max_r_true = max(abs(v) for v in series["r_true_kW"])
    max_fd = max(abs(v) for v in series["f_channel_diff_Hz"])
    f_end = series["f_true_Hz"][-1]
    e_source = int_pgen / 3600.0
    e_fuel = int_fuel / 3600.0
    m = METHOD_ID
    metrics = {
        "E_load_kWh": {"value": int_demand / 3600.0, "unit": "kWh", "method": m},
        "E_source_kWh": {"value": e_source, "unit": "kWh", "method": m},
        "E_bat_kWh": {"value": int_pbat / 3600.0, "unit": "kWh", "method": m},
        "E_line_kWh": {"value": int_line / 3600.0, "unit": "kWh", "method": m},
        "E_rotor_kWh": {"value": KJ * (f_end - 50.0) / 3600.0, "unit": "kWh", "method": m},
        "E_rotor_int_kWh": {"value": int_rotor / 3600.0, "unit": "kWh", "method": m},
        "E_fuel_kWh": {"value": e_fuel, "unit": "kWh", "method": m},
        "eta_cycle_end_pct": {"value": 100.0 * e_source / e_fuel, "unit": "%", "method": m},
        "SOC_true_end_pct": {"value": soc_true_end, "unit": "%", "method": m},
        "SOC_est_end_pct": {"value": soc_est_end, "unit": "%", "method": m},
        "SOC_err_pp": {"value": soc_est_end - soc_true_end, "unit": "pp", "method": m},
        "max_abs_r_true_kW": {"value": max_r_true, "unit": "kW", "method": "algebraic"},
        "max_abs_f_channel_diff_Hz": {"value": max_fd, "unit": "Hz", "method": "algebraic"},
        "P_elec_end_kW": {"value": series["P_elec_kW"][-1], "unit": "kW", "method": m},
        "f_min_Hz": {"value": min(series["f_true_Hz"]), "unit": "Hz", "method": m},
        "f_max_Hz": {"value": max(series["f_true_Hz"]), "unit": "Hz", "method": m},
    }
    if is_load:
        metrics["f_nadir_Hz"] = {"value": min(series["f_true_Hz"][int(round(T_START / DT_S)):]),
                                 "unit": "Hz", "method": m}

    scalars = {
        "E_source_kWh": e_source,
        "E_bat_kWh": int_pbat / 3600.0,
        "E_load_kWh": int_demand / 3600.0,
        "E_rotor_kWh": KJ * (f_end - 50.0) / 3600.0,
        "E_fuel_kWh": e_fuel,
        "SOC_true_end_pct": soc_true_end,
        "SOC_est_end_pct": soc_est_end,
        "SOC_err_end_pp": soc_est_end - soc_true_end,
        "eta_cycle_end_pct": 100.0 * e_source / e_fuel,
    }

    events = _fault_events(spec, series)
    return {"key": spec["key"], "role": spec["role"],
            "feedback_mode": spec["feedback_mode"], "faulted": faulted,
            "inertia_model": "thermo",
            "series": dict({"t": t}, **series), "integrals": integrals,
            "metrics": metrics, "scalars": scalars, "events": events}


SNAP_UNITS = {"f_true_Hz": "Hz", "f_meas_Hz": "Hz", "n_meas_rpm": "rpm",
              "f_channel_diff_Hz": "Hz", "delta_rad": "rad", "P_elec_kW": "kW"}


def _snapshots(spec, series, event_id, t_ev, extra=()):
    i_post = int(round(t_ev / DT_S))
    i_pre = i_post - 1

    def vars_at(idx):
        v = {"f_true_Hz": series["f_true_Hz"][idx], "f_meas_Hz": series["f_meas_Hz"][idx],
             "n_meas_rpm": series["n_meas_rpm"][idx],
             "f_channel_diff_Hz": series["f_channel_diff_Hz"][idx],
             "delta_rad": series["delta_rad"][idx], "P_elec_kW": series["P_elec_kW"][idx]}
        for sid in extra:
            v[sid] = series[sid][idx]
        return v

    units = dict(SNAP_UNITS)
    for sid in extra:
        units[sid] = "kW"
    return [
        {"snapshot_id": event_id + "-pre", "event_id": event_id, "phase": "pre",
         "t_s": t_ev, "derivation": "left_limit", "variables": vars_at(i_pre),
         "units": units, "fault_id": spec.get("fault_id")},
        {"snapshot_id": event_id + "-post", "event_id": event_id, "phase": "post",
         "t_s": t_ev, "derivation": "post_sample", "variables": vars_at(i_post),
         "units": units, "fault_id": spec.get("fault_id")},
    ]


def _fault_events(spec, series):
    if not spec["faulted"]:
        return []
    family = spec["family"]
    event_type = {FAMILY_SENSOR: "sensor_bias", FAMILY_LOAD: "load_step",
                  FAMILY_ACT: "actuator_limit", FAMILY_LINE: "line_fault"}[family]
    target_signal = {FAMILY_SENSOR: "n_meas_rpm", FAMILY_LOAD: "P_load_demand_kW",
                     FAMILY_ACT: "P_gen_cap_kW", FAMILY_LINE: "P_elec_kW"}[family]
    events = [{
        "event_id": "EV-001", "event_type": event_type, "trigger_s": T_START,
        "target_signal": target_signal, "magnitude": spec["magnitude"], "unit": spec["unit"],
        "snapshots": _snapshots(spec, series, "EV-001", T_START),
    }]
    if spec.get("t_clear_s"):
        tc = spec["t_clear_s"]
        is_line = family == FAMILY_LINE
        events.append({
            "event_id": "EV-002",
            "event_type": "line_clear" if is_line else "actuator_clear",
            "trigger_s": tc,
            "target_signal": "P_elec_kW" if is_line else "P_gen_cap_kW",
            "magnitude": 0.0, "unit": "",
            "snapshots": _snapshots(spec, series, "EV-002", tc, extra=("P_gen_true_kW",)),
        })
    return events


def fault_block(spec):
    if not spec["faulted"]:
        return None
    base = {"family": spec["family"], "fault_id": spec.get("fault_id"), "t_start_s": T_START}
    fam = spec["family"]
    if fam == FAMILY_SENSOR:
        base["bias_Hz"] = spec["magnitude"]
    elif fam == FAMILY_LOAD:
        base["delta_load_kW"] = spec["magnitude"]
    elif fam == FAMILY_ACT:
        base["cap_pct"] = spec["magnitude"]
        if spec.get("t_clear_s") is not None:
            base["t_clear_s"] = spec["t_clear_s"]
    else:
        base["duration_s"] = spec["magnitude"]
        base["t_clear_s"] = spec["t_clear_s"]
        base["p_elec_scale"] = 0.0
    return base


def build_golden():
    runs = {}
    for spec in RUNS:
        r = simulate_run(spec)
        runs[r["key"]] = {
            "role": r["role"],
            "feedback_mode": r["feedback_mode"],
            "inertia_model": "thermo",
            "model_provenance": PROVENANCE,
            "demand0_kW": spec["demand0_kW"],
            "delta0_rad": r["integrals"]["delta0"],
            "line_open": spec["line_open"],
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
        "supersedes": None,
        "method_id": METHOD_ID,
        "method_version": METHOD_VERSION,
        "model_provenance": PROVENANCE,
        "inertia_model": "thermo",
        "systems": ["GT-001", "TL-001"],
        "units": {"I": "A", "P": "kW", "E": "kWh", "t": "s", "SOC": "%", "SOC_err": "pp",
                  "f": "Hz", "n": "rpm", "T": "K", "p": "kPa", "delta": "rad",
                  "omega": "rad/s"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T_START,
            "dt_int_s": DT_INT, "Vdc_V": V_BUS, "Pload_demand_kW": LOAD0_KW,
            "Pload_export_baseline_kW": LOAD_EXPORT_KW,
            "Ebat_nominal_kWh": CAP_KWH, "SOC0_pct": SOC0_PCT,
            "K_J": KJ, "K_bat": K_BAT, "Ki": KI,
            "T1_K": T1_K, "p1_kPa": P1_KPA,
            "cp_a_kJ_kgK": CP_A, "gamma_a": GAMMA_A, "a_c": A_C,
            "cp_g_kJ_kgK": CP_G, "gamma_g": GAMMA_G, "a_t": A_T,
            "pi_c0": PIC0, "eps_c": EPS_C, "eps_t": EPS_T, "beta_b": BETA_B,
            "LHV_kJ_kg": LHV, "eta_b": ETA_B, "eta_m": ETA_M,
            "T3D_K": T3D_K, "tau_3_s": TAU_3,
            "k_f_kW_eq": K_F, "mdot_a_kg_s": MDOT_A, "C_3_kJ_K": C_3,
            "mdot_g0_kg_s": MDOT_G0,
            "V_rated_V": V_RATED, "V_inf_V": V_INF, "X_line_ohm": X_LINE,
            "S_base_kW": S_BASE, "Z_base_ohm": Z_BASE, "P_max0_kW": P_MAX0, "D": 0.0,
            "inertia_model": "thermo",
            "feedback_modes": ["closed_loop", "monitor"],
            "model_provenance": PROVENANCE,
            "note": "GT-001 + TL-001 联合轨（单转子形 y=[f,T3,δ]——TL001_FMU_G2B_SPEC_APPROVED v1.0"
                    "：P_rotor = P_gen + P_bat − P_load − P_elec(δ)、dδ/dt = 2π(f−f₀)、P_elec = "
                    "s·(V_gen·V_inf/X_line)·sin δ/1000、V_gen = (f/f₀)·V_rated）；governor 归 host"
                    "（h=0.01 子步）；线路故障 = 金属性三相短路 p_elec_scale=0 于 [t_start, t_clear)；"
                    "δ₀ = arcsin((25+5−demand0)/50)；行为与数值集总参数演示模型（未经实验/硬件验证）；"
                    "终点收敛至功率平衡流形（由暂态轨迹确定——§3.3）",
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": int(round(T_START / DT_S)),
                     "t_0": 0.0, "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": dict(TOLERANCES),
        "runs": runs,
        "metrics_note": "golden 指标为独立可算子集（能量账本/SOC/极值）；无 rad 单位指标与标量"
                        "（Q10 附带决定——δ 只走序列面）；E_line_kWh = ∫P_elec dt（梯形，出口为正）；"
                        "E_rotor_kWh 线性化口径 K_J·Δf，E_rotor_int_kWh = ∫P_rotor dt 左矩形",
    }


# ---------------------------------------------------------------------------
# GLJ-1…7 自检（§4 项 6）
# ---------------------------------------------------------------------------
def _golden_path(name):
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(root, "data", "golden", name)


#: GLJ-2/GLJ-6/GLJ-7 冻结门（CHG-20261125-02 emit 轮实测 × ≥10）：
#:   δ 积分恒等实测 3.39e-4 rad（joint_line_fault——RK4 stage 加权 vs 子步端点梯形的离散差）；
#:   EQ-GTL1-12 实测 0.452 kJ（joint_sensor_drift——T3 大幅下行暂态；GTL1 GL-2 0.2 kJ 为 GT
#:   独立轨口径，联合轨按实测重冻结）；半步自收敛实测 0.0130。
GLJ2_SLIP_ATOL = 5e-3      # rad
GLJ2_GL2_KJ = 5.0          # kJ
GLJ6_HALF_ATOL = 0.15      # 全通道 max|diff|
GLJ7_SLIP_DF = 1.5         # 滑差域 |Δf| 域外角点上限（Hz——A2-1 预案值）

#: GLJ-7 域外角点显式登记（§3.2 ④「u=0 负净功伪影可达性重查」义务——CHG-20261125-02 发现 F-1）：
#: joint_sensor_drift 在无穷母线下不发生预填所述 49.7 Hz 滑差——同步功率把 f 钳在 ≈50 Hz，
#: 调速器按偏置读数 50.3 Hz 持续减燃料（u 25→1.21），T3 降至 631.7 K、P_gen 末值 −5.12 kW
#: （负净功外推区——GTL1「注册域 u_min=6.98 不可达」结论在联合轨不成立），线路进口 30 kW、
#: δ_end = −36.9°。本角点仅豁免 T3 下界（735 K → 600 K），其余包络照常断言；Run 参数是否
#: 调整（如幅值 0.3 → 更小）留用户裁定。
ENVELOPE_CORNERS = {"joint_sensor_drift": {"T3_min_K": 600.0}}


def self_check():
    checks = []

    def rec(cid, ok_, observed, tolerance, note):
        checks.append(oracle_base.check_record(cid, ok_, observed, tolerance, note))
        return ok_

    results = {spec["key"]: simulate_run(spec) for spec in RUNS}

    # GLJ-1 设计点/出口基线闭合（§3.1）
    worst = 0.0
    for demand0, p_elec_eq in ((LOAD0_KW, 0.0), (LOAD_EXPORT_KW, 10.0)):
        d0 = delta_eq(demand0)
        al = chain_algebra(50.0, T3D_K, d0, U0_CMD, demand0, 1.0, False)
        worst = max(worst, abs(al["p_gen"] - 25.0), abs(al["p_bat"] - 5.0),
                    abs(al["p_rotor"]), abs(al["ddelta"]), abs(al["p_elec"] - p_elec_eq))
    worst = max(worst, abs(P_MAX0 - 50.0), abs(delta_eq(LOAD0_KW)))
    rec("GLJ-1-design-point", worst <= 1e-9, worst, 1e-9,
        "§3.1 双基线：P_gen=25/P_bat=5/P_rotor=0/dδ/dt=0/P_elec_eq=0|10 kW/P_max=50/δ₀(30)=0")

    # GLJ-2 联合恒等式：r_true ≡ 0 / r_line ≡ 0 / δ 积分恒等 / EQ-GTL1-12 能量恒等
    worst_rt = worst_rl = worst_slip = worst_gl2 = 0.0
    for spec in RUNS:
        r = results[spec["key"]]
        s = r["series"]
        worst_rt = max(worst_rt, max(abs(v) for v in s["r_true_kW"]))
        for i in range(N_SAMPLES):
            ti = s["t"][i]
            in_win = (spec["family"] == FAMILY_LINE and ti >= T_START - 1e-9
                      and not ti >= spec["t_clear_s"] - 1e-9)
            sc = 0.0 if (in_win or spec["line_open"]) else 1.0
            expect = sc * ((s["f_true_Hz"][i] / F0) * V_RATED * V_INF / X_LINE) \
                * math.sin(s["delta_rad"][i]) / 1000.0
            worst_rl = max(worst_rl, abs(s["P_elec_kW"][i] - expect))
        it = r["integrals"]
        worst_slip = max(worst_slip, abs((it["delta_end"] - it["delta0"]) - it["slip_trap"]))
        worst_gl2 = max(worst_gl2, abs(it["gl2_left_rect"] - it["gl2_rk4_inc"]))
    ok2 = worst_rt <= 1e-9 and worst_rl <= 1e-9 and worst_slip <= GLJ2_SLIP_ATOL \
        and worst_gl2 <= GLJ2_GL2_KJ
    rec("GLJ-2-identities", ok2,
        {"r_true": worst_rt, "r_line": worst_rl, "slip": worst_slip, "gl2_kJ": worst_gl2},
        {"r_true": 1e-9, "r_line": 1e-9, "slip": GLJ2_SLIP_ATOL, "gl2_kJ": GLJ2_GL2_KJ},
        "r_true 恒等换底（Q9）+ r_line 残差门 + δ 积分恒等（RK4 vs 子步梯形）+ EQ-GTL1-12")

    # GLJ-3 网格与事件相位
    worst_grid = 0.0
    ev_ok = True
    for spec in RUNS:
        r = results[spec["key"]]
        for i in range(N_SAMPLES):
            worst_grid = max(worst_grid, abs(r["series"]["t"][i] - i * DT_S))
        evs = r["events"]
        if not spec["faulted"]:
            ev_ok = ev_ok and not evs
            continue
        n_expect = 2 if spec.get("t_clear_s") else 1
        ev_ok = ev_ok and len(evs) == n_expect
        for ev in evs:
            pre, post = ev["snapshots"]
            ip = int(round(ev["trigger_s"] / DT_S))
            ev_ok = ev_ok and pre["t_s"] == post["t_s"] == ev["trigger_s"] \
                and pre["derivation"] == "left_limit" and post["derivation"] == "post_sample" \
                and pre["variables"]["n_meas_rpm"] == r["series"]["n_meas_rpm"][ip - 1] \
                and post["variables"]["delta_rad"] == r["series"]["delta_rad"][ip]
    rec("GLJ-3-grid-events", worst_grid <= 1e-9 and ev_ok, worst_grid, 1e-9,
        "601 点网格 + EV-001/EV-002 pre=left_limit/post=post_sample + 快照变量=采样行")

    # GLJ-4 锚点：δ_eq(20) = arcsin(0.2) = 0.2013579 rad；X=1.0 p.u. 角点 arcsin(0.4)；
    # line_fault 故障窗 post 行 P_elec = 0；healthy 终点仍在基线
    lf = results["joint_line_fault"]["series"]
    hl = results["joint_healthy"]["series"]
    a_worst = max(abs(delta_eq(LOAD_EXPORT_KW) - 0.2013579207903308),
                  abs(math.asin(10.0 / (V_RATED * V_INF / (2.0 * X_LINE) / 1000.0))
                      - 0.41151684606748806),
                  abs(lf["P_elec_kW"][200]),
                  abs(lf["P_elec_kW"][0] - 10.0),
                  max(abs(v - 50.0) for v in hl["f_true_Hz"]),
                  max(abs(v) for v in hl["delta_rad"]))
    rec("GLJ-4-anchors", a_worst <= 1e-9, a_worst, 1e-9,
        "δ_eq(20)=arcsin 0.2 / X=1.0 角点 arcsin 0.4 / 故障窗 post 行 P_elec=0 / 初值 P_elec=10 / "
        "healthy 恒基线")

    # GLJ-5 standalone 只读交叉（Q8=(i)）：joint_gt_standalone ↔ gt001_v3 healthy；
    # 扩面 joint_monitor_only ↔ gt001_v3 monitor_only（GT 27 列，rel = |d|/max(1,|g|)）
    pairs = (("joint_gt_standalone", "healthy"), ("joint_monitor_only", "monitor_only"))
    worst_m = 0.0
    m_ok = True
    n_vals = 0
    try:
        with open(_golden_path("gt001_v3.json"), "r", encoding="utf-8") as fh:
            ref = json.load(fh)
        for mine_key, ref_key in pairs:
            mine = results[mine_key]["series"]
            theirs = ref["runs"][ref_key]["series"]
            for sid in SERIES_IDS[:27]:
                for a, b in zip(mine[sid], theirs[sid]):
                    n_vals += 1
                    if a is None or b is None:
                        m_ok = m_ok and (a is None) == (b is None)
                        continue
                    worst_m = max(worst_m, abs(a - b) / max(1.0, abs(b)))
    except Exception as e:  # noqa: BLE001
        m_ok = False
        worst_m = "无法读取 gt001_v3.json：%s" % e
    rec("GLJ-5-standalone-guard", m_ok and isinstance(worst_m, float) and worst_m <= 1e-9,
        worst_m, 1e-9,
        "joint_gt_standalone↔gt001_v3 healthy + joint_monitor_only↔monitor_only 只读交叉（%d 值）"
        % n_vals)

    # GLJ-6 半步自收敛（line_fault：dt_int 0.01 vs 0.005）
    full = results["joint_line_fault"]
    half = simulate_run(next(s for s in RUNS if s["key"] == "joint_line_fault"),
                        dt_int=DT_INT / 2.0)
    worst_half = 0.0
    for sid in SERIES_IDS[1:]:
        for a, b in zip(full["series"][sid], half["series"][sid]):
            worst_half = max(worst_half, abs(a - b))
    rec("GLJ-6-half-step", worst_half <= GLJ6_HALF_ATOL, worst_half, GLJ6_HALF_ATOL,
        "joint_line_fault dt_int 0.01 vs 0.005 全通道 max|diff|（实测登记 ×≥10 冻结制）")

    # GLJ-7 有限性 + 四域 Δf 分域断言（A2-1）+ 包络
    domain = {
        "identity": ("joint_gt_standalone", "joint_monitor_only"),
        "standard": ("joint_healthy", "joint_load_step", "joint_actuator_fault",
                     "joint_actuator_clear"),
        "slip": ("joint_sensor_drift",),
        "fault_window": ("joint_line_fault",),
    }
    finite_ok = True
    env_ok = True
    dfs = {}
    for spec in RUNS:
        s = results[spec["key"]]["series"]
        for sid in SERIES_IDS:
            for v in s[sid]:
                if v is not None and not math.isfinite(v):
                    finite_ok = False
        dfs[spec["key"]] = max(abs(v - 50.0) for v in s["f_true_Hz"])
        t3_min = ENVELOPE_CORNERS.get(spec["key"], {}).get("T3_min_K", 735.0)
        if not (t3_min <= min(s["T3_out_K"]) and max(s["T3_out_K"]) <= 1530.0):
            env_ok = False
        if not all(0.0 <= v <= 40.0 for v in s["P_gen_cmd_kW"]):
            env_ok = False
        if not all(55.0 <= v <= 65.0 for v in s["SOC_true_pct"]):
            env_ok = False
    dom_ok = (all(dfs[k] <= 1e-9 for k in domain["identity"])
              and all(dfs[k] <= 1.0 for k in domain["standard"])
              and all(dfs[k] <= GLJ7_SLIP_DF for k in domain["slip"])
              and all(dfs[k] <= 1.0 for k in domain["fault_window"]))
    rec("GLJ-7-finite-domain", finite_ok and env_ok and dom_ok,
        {"finite": finite_ok, "envelope": env_ok, "max_abs_df_Hz": dfs},
        {"identity": 1e-9, "standard": 1.0, "slip": GLJ7_SLIP_DF, "fault_window": 1.0,
         "corners": ENVELOPE_CORNERS},
        "全 Run 有限性 + Δf 四域分域（结构恒等/标准/滑差/故障窗）+ T3/u/SOC 包络"
        "（joint_sensor_drift T3 下界域外角点显式登记——F-1）")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


# ---------------------------------------------------------------------------
# emit
# ---------------------------------------------------------------------------
def emit():
    ok, checks = self_check()
    if not ok:
        print(json.dumps({"ok": False, "checks": checks}, ensure_ascii=False, indent=2))
        return 2
    path = _golden_path(GOLDEN_ID + ".json")
    golden = build_golden()
    golden["generated_by"] = oracle_base.generated_by_block(
        tool="tools/oracle/gt_tl_joint_oracle.py + tools/oracle/oracle_base.py（机制层）",
        oracle_path=os.path.abspath(__file__),
        command="python -I tools/oracle/gt_tl_joint_oracle.py --emit")
    oracle_base.apply_approval(golden, APPROVED_BY, APPROVED_AT)
    digest = oracle_base.write_golden_with_sidecar(golden, path)
    print(json.dumps({"ok": True, "written": os.path.abspath(path),
                      "bytes": os.path.getsize(path), "golden_sha256": digest,
                      "oracle_source_sha256": golden["generated_by"]["oracle_source_sha256"]},
                     ensure_ascii=False, indent=2))
    return 0


def main(argv):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    if "--self-check" in argv:
        ok, checks = self_check()
        print(json.dumps({"ok": ok, "checks": checks}, ensure_ascii=False, indent=2))
        return 0 if ok else 2
    if "--emit" in argv:
        return emit()
    if "--summary" in argv:
        ok, checks = self_check()
        out = {"self_check_ok": ok, "checks": checks, "runs": {}}
        for spec in RUNS:
            r = simulate_run(spec)
            out["runs"][spec["key"]] = {"scalars": r["scalars"], "metrics": r["metrics"],
                                        "delta0": r["integrals"]["delta0"],
                                        "delta_end": r["integrals"]["delta_end"]}
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0 if ok else 2
    print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
