# -*- coding: utf-8 -*-
"""gt001_fmu_oracle.py — GT-001 L1-FMU 镜像轨独立 oracle（GTFMU-G2b-03；CHG-20261119-01 批准链）。

规格权威文本（唯一）：FaultLab-evaluation/NEXT/GT001_FMU_G2B_SPEC_APPROVED v1.0
（GTFMU-G2b-02 批准轮收口，CHG-20261119-01——Q1…Q12 定案）：
  - §1.3 EQ-GTFMU 冻结表（thermo 基准轨 EQ-GTL1-1..12 逐字 + comb 深化 EQ-GTL2-3/4/12 修订式）；
  - §1.4 常量字典（GTL1 §2.1 15 位有效数字逐字 + τ_comb=0.5）；
  - §1.5 Q1=(B) 控制积分器 u 归 host——内核纯物理真值（RK4 面），host 以 h=0.01 子步粒度
    驱动 + 子步间 EQ-GTL1-9/10 推进 + 记账复刻；
  - §1.6 Q2=(a) thermo + comb 双轨并列（两 golden：gt001_fmu_v1 / gt001_fmu_comb_v1——
    单 oracle 双 Run 组，本文件）；
  - §2.1 12 Run 白名单（thermo 镜像 6 + comb 镜像 6——gt001_l1/gt001_comb oracle RUNS 逐字）；
  - §4 项 2 独立性声明（fc001_fmu_oracle.py 先例）：不 import src/**、不 import 既有 oracle
    （gt001_oracle / gt001_l1_oracle / gt001_comb_oracle / fc001_fmu_oracle——仅 oracle_base
    机制层）、方程与常量唯一权威 = 本批准文本、Python stdlib（python -I）自含硬编码；
    golden 由本 oracle 只读生成——**C99 FMU 不参与 emit**（C-Python parity 为验收面非生成依赖）；
  - **FMU 镜像面 = FMU+host 全系统更新序**（Q1(B)：host 控制粒度/事件分裂/记账全镜像——
    本 oracle 的子步循环即 run_gt001_shell 的镜像规范，GTFMU-5 以全 6 Run 全序列对
    gt001_v3/gt001_v4 golden 只读交叉 ±1e-9 守卫（A-2 扩面）；
  - I-9 自冻结：gt001_l1_oracle.py / gt001_comb_oracle.py / fc001_fmu_oracle.py 零触碰
    （本文件不 import 不读改——GTFMU-5 只读 golden JSON 交叉不触碰 V-03）。

用法：
  python -I tools/oracle/gt001_fmu_oracle.py --self-check    # GTFMU-1…7 自检（exit 0/2）
  python -I tools/oracle/gt001_fmu_oracle.py --emit          # 双 golden emit（先自检，失败 exit 2）
  python -I tools/oracle/gt001_fmu_oracle.py --summary       # 自检 + 标量/指标摘要
"""

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle_base  # noqa: E402  机制层（V-03/approval/sidecar/resolve_run_spec/check_record）

GOLDEN_ID = "gt001_fmu_v1"
GOLDEN_ID_COMB = "gt001_fmu_comb_v1"
MODEL_ID = "gt.sync.fmu_l1"          # §11 Q3 定案（A-3 自述——不撞 GT-001 两域）
MODEL_VERSION = "1.0.0"              # §11 Q3 定案（新轨首版——fc001_fmu_v1 先例）
METHOD_ID = "gt001_fmu_l1_rk4_dt0.01"
METHOD_ID_COMB = "gt001_fmu_comb_rk4_dt0.01"
METHOD_VERSION = "1.0.0"
ORACLE_FILENAME = "gt001_fmu_oracle.py"
APPROVED_BY = "user（2026-11-19 CHG-20261119-01 批准链——GTFMU-G2b-02 批准轮）"
APPROVED_AT = "2026-11-19T00:00:00Z"
PROVENANCE = "fmu_l1_lumped_unvalidated"   # §11 Q8=(a) 复用档位（B-2 扩域随批准 CHG 打包）

# ---------------------------------------------------------------------------
# 冻结常量（GTL1 §2.1 批准规格逐字 + GTCMB §1.3 τ_comb——值零改动；15 位有效数字面）
# ---------------------------------------------------------------------------
T1_K = 288.15            # ISO 参考大气进口温度（K）
P1_KPA = 101.325         # ISO 参考大气进口压力（kPa）
CP_A = 1.005             # 空气定压比热 kJ/(kg*K)
GAMMA_A = 1.4            # 空气比热比
A_C = (GAMMA_A - 1.0) / GAMMA_A          # = 2/7（§2.1）
CP_G = 1.148             # 燃气定压比热 kJ/(kg*K)
GAMMA_G = 4.0 / 3.0      # 燃气比热比
A_T = (GAMMA_G - 1.0) / GAMMA_G          # = 1/4（§2.1 登记字面）
PIC0 = 8.0               # 设计压比（f=f0）
EPS_C = 0.82             # 压气机 isen 效率
EPS_T = 0.86             # 透平 isen 效率
BETA_B = 0.04            # 燃烧室压损系数
LHV = 50000.0            # 燃料低位热值 kJ/kg
ETA_B = 0.99             # 燃烧效率
ETA_M = 0.95             # 机械+发电机集总效率
T3D_K = 1173.0           # 设计燃烧室出口温度（K）
TAU_3 = 2.0              # 燃烧室集总热惯性时间常数（s）
KJ = 5.0                 # kW*s/Hz（L0b 冻结值沿袭）
F0 = 50.0                # Hz
KI = 2.0                 # 调速器积分增益（kW_eq/(Hz*s)——EQ-GTL1-9 量纲闭合）
K_BAT = 24.0             # 电池下垂 kW/Hz
P_BAT_REF = 5.0          # kW
CAP_KWH = 40.0           # 电池容量（SOC 面沿袭）
K_F = 4.070531454334211                  # 燃料增益 kW_eq/单位指令（A-1 方案 a 15 位）
MDOT_A = 0.144299140389011               # 压气机空气流量 kg/s
C_3 = 0.335983796442745                  # 燃烧室集总热容 kJ/K
MDOT_G0 = 0.146334406116178              # 设计燃气流量 kg/s（展示值）
TAU_COMB = 0.5           # comb 变体：燃烧/能量转换一阶滞后（GTCMB §1.3 定案）

DURATION_S = 60.0
DT_S = 0.1
N_SAMPLES = int(round(DURATION_S / DT_S)) + 1   # 601
DT_INT = 0.01            # 内核 RK4 固定子步（s）；Q1(B) 下 host 每子步驱动 doStep（n=1）
SUB = int(round(DT_S / DT_INT))
T_START = 20.0           # 默认注入时刻（库口径）
LOAD0_KW = 30.0
SOC0_PCT = 60.0
V_BUS = 400.0
U0_CMD = 25.0            # 初始调速器指令（设计点）

METHOD_VERSION = "1.0.0"
FAMILY_NONE = "none"
FAMILY_SENSOR = "sensor_drift"
FAMILY_LOAD = "load_step"
FAMILY_ACT = "actuator_fault"
FAULT_ID_SENSOR = "speed_sensor_bias"
FAULT_ID_LOAD = "load_step_10kW"
FAULT_ID_ACT = "fuel_valve_stuck"

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
]

RUNS_THERMO = [
    {"key": "healthy", "role": "baseline", "feedback_mode": "closed_loop",
     "family": FAMILY_NONE, "faulted": False, "magnitude": 0.0, "unit": "",
     "inertia_model": "thermo"},
    {"key": "closed_loop_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_SENSOR, "faulted": True, "magnitude": 0.3, "unit": "Hz",
     "inertia_model": "thermo"},
    {"key": "monitor_only", "role": "monitor", "feedback_mode": "monitor",
     "family": FAMILY_SENSOR, "faulted": True, "magnitude": 0.3, "unit": "Hz",
     "inertia_model": "thermo"},
    {"key": "load_step", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_LOAD, "faulted": True, "magnitude": 10.0, "unit": "kW",
     "inertia_model": "thermo"},
    {"key": "actuator_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_ACT, "faulted": True, "magnitude": 50.0, "unit": "%",
     "inertia_model": "thermo"},
    {"key": "actuator_clear", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_ACT, "faulted": True, "magnitude": 50.0, "unit": "%",
     "t_clear_s": 35.0, "inertia_model": "thermo"},
]

RUNS_COMB = [
    {"key": "healthy", "role": "baseline", "feedback_mode": "closed_loop",
     "family": FAMILY_NONE, "faulted": False, "magnitude": 0.0, "unit": "",
     "inertia_model": "thermo_comb"},
    {"key": "closed_loop_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_SENSOR, "faulted": True, "magnitude": 0.3, "unit": "Hz",
     "inertia_model": "thermo_comb"},
    {"key": "monitor_only", "role": "monitor", "feedback_mode": "monitor",
     "family": FAMILY_SENSOR, "faulted": True, "magnitude": 0.3, "unit": "Hz",
     "inertia_model": "thermo_comb"},
    {"key": "load_step", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_LOAD, "faulted": True, "magnitude": 10.0, "unit": "kW",
     "inertia_model": "thermo_comb"},
    {"key": "actuator_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_ACT, "faulted": True, "magnitude": 50.0, "unit": "%",
     "inertia_model": "thermo_comb"},
    {"key": "actuator_clear", "role": "fault", "feedback_mode": "closed_loop",
     "family": FAMILY_ACT, "faulted": True, "magnitude": 50.0, "unit": "%",
     "t_clear_s": 35.0, "inertia_model": "thermo_comb"},
]

#: 归一契约成员 RUNS（oracle_base CONTRACT_MEMBERS——verify_golden _verify_model 按 key
#: 解析用；12 Run 全集 = thermo 组 + comb 组；simulate_run 按 inertia_model 派发）
RUNS = RUNS_THERMO + RUNS_COMB

#: 多组 oracle 面（V1111 先例无此形态——GT-001 L1-FMU 单 oracle 双 golden 首例：
#: verify_golden 按 golden.inertia_model 选组解析 spec；flat RUNS 保留为兼容 fallback）
RUNS_GROUPS = {"thermo": RUNS_THERMO, "thermo_comb": RUNS_COMB}

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
    },
}


def _oracle_source_sha256():
    return oracle_base.oracle_source_sha256(os.path.abspath(__file__))


def js_clamp(v, lo, hi):
    """与引擎 clamp(v, lo, hi) 同序：v<lo→lo；v>hi→hi（gt001_oracle.py:92-94 同式）。"""
    return lo if v < lo else (hi if v > hi else v)


def build_time_grid():
    """t[i] = i*dt（IEEE-754 积原值，禁止累加）。"""
    return [i * DT_S for i in range(N_SAMPLES)]


# ---------------------------------------------------------------------------
# EQ-GTFMU 代数链——thermo（2 态；GTL1 §2.2 逐字转写，值零改动）
# ---------------------------------------------------------------------------
def chain_algebra_thermo(fv, t3v, u_eff, demand):
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
    p_rotor = p_gen + p_bat - demand                   # EQ-GTL1-7（Q1 定案恒等式）
    dfdt = (p_rotor / KJ) * (F0 / fv)                  # EQ-GTL1-7（摇摆方程原样）
    dt3 = (ETA_B * q_f - mdot_g * CP_G * (t3v - t2)) / C_3   # EQ-GTL1-4
    return {"t2": t2, "p2": p2, "t4": t4, "p_comp": p_comp, "p_turb": p_turb,
            "p_gen": p_gen, "p_bat": p_bat, "p_rotor": p_rotor, "q_f": q_f,
            "mdot_g": mdot_g, "dfdt": dfdt, "dt3": dt3}


# ---------------------------------------------------------------------------
# EQ-GTFMU 代数链——comb（3 态；GTCMB §1.3 逐字转写——x_comb 延迟同源 Q13 (i)）
# ---------------------------------------------------------------------------
def chain_algebra_comb(fv, t3v, x_comb_v, u_eff, demand):
    pi_c = PIC0 * (fv / F0) ** 2                       # EQ-GTL2-1
    p2 = pi_c * P1_KPA
    t2 = T1_K * (1.0 + (pi_c ** A_C - 1.0) / EPS_C)    # EQ-GTL2-2
    q_f = K_F * u_eff                                  # EQ-GTL2-3 指令面（Q13 (ii)）
    mdot_f_d = x_comb_v / LHV                          # EQ-GTL2-3 延迟同源（Q13 (i)）
    mdot_g = MDOT_A + mdot_f_d
    p3 = (1.0 - BETA_B) * p2                           # EQ-GTL2-5
    pi_t = p3 / P1_KPA
    t4 = t3v * (1.0 - EPS_T * (1.0 - pi_t ** (-A_T)))
    p_comp = MDOT_A * CP_A * (t2 - T1_K)               # EQ-GTL2-6
    p_turb = mdot_g * CP_G * (t3v - t4)
    p_gen = ETA_M * (p_turb - p_comp)
    p_bat = P_BAT_REF - K_BAT * (fv - 50.0)            # EQ-GTL2-8
    p_rotor = p_gen + p_bat - demand                   # EQ-GTL2-7（Q1 定案恒等式）
    dfdt = (p_rotor / KJ) * (F0 / fv)                  # EQ-GTL2-7（摇摆方程原样）
    dt3 = (ETA_B * x_comb_v - mdot_g * CP_G * (t3v - t2)) / C_3   # EQ-GTL2-4（Q_f,d 插入位）
    dxc = (q_f - x_comb_v) / TAU_COMB                  # EQ-GTL2-3 一阶滞后 RHS
    return {"t2": t2, "p2": p2, "t4": t4, "p_comp": p_comp, "p_turb": p_turb,
            "p_gen": p_gen, "p_bat": p_bat, "p_rotor": p_rotor, "q_f": q_f,
            "x_comb": x_comb_v,
            "mdot_g": mdot_g, "dfdt": dfdt, "dt3": dt3, "dxc": dxc}


# ---------------------------------------------------------------------------
# 内核步镜像（Q1(B)——C99 内核单子步 doStep 的规范实现：RK4 + 代数链，
# 输入 u_eff/demand 冻结于子步起点右值；host 不在此函数内）
# ---------------------------------------------------------------------------
def _kernel_step_thermo(f, t3, u_eff, demand, h):
    """内核单子步（thermo 2 态 RK4 + 子步末代数面 al_b）。"""
    k1 = chain_algebra_thermo(f, t3, u_eff, demand)
    k2 = chain_algebra_thermo(f + 0.5 * h * k1["dfdt"], t3 + 0.5 * h * k1["dt3"], u_eff, demand)
    k3 = chain_algebra_thermo(f + 0.5 * h * k2["dfdt"], t3 + 0.5 * h * k2["dt3"], u_eff, demand)
    k4 = chain_algebra_thermo(f + h * k3["dfdt"], t3 + h * k3["dt3"], u_eff, demand)
    f_new = f + h / 6.0 * (k1["dfdt"] + 2.0 * k2["dfdt"] + 2.0 * k3["dfdt"] + k4["dfdt"])
    t3_new = t3 + h / 6.0 * (k1["dt3"] + 2.0 * k2["dt3"] + 2.0 * k3["dt3"] + k4["dt3"])
    al_b = chain_algebra_thermo(f_new, t3_new, u_eff, demand)
    return f_new, t3_new, k1, al_b


def _kernel_step_comb(f, t3, x, u_eff, demand, h):
    """内核单子步（comb 3 态 RK4 + 子步末代数面 al_b）。"""
    k1 = chain_algebra_comb(f, t3, x, u_eff, demand)
    k2 = chain_algebra_comb(f + 0.5 * h * k1["dfdt"], t3 + 0.5 * h * k1["dt3"],
                            x + 0.5 * h * k1["dxc"], u_eff, demand)
    k3 = chain_algebra_comb(f + 0.5 * h * k2["dfdt"], t3 + 0.5 * h * k2["dt3"],
                            x + 0.5 * h * k2["dxc"], u_eff, demand)
    k4 = chain_algebra_comb(f + h * k3["dfdt"], t3 + h * k3["dt3"],
                            x + h * k3["dxc"], u_eff, demand)
    f_new = f + h / 6.0 * (k1["dfdt"] + 2.0 * k2["dfdt"] + 2.0 * k3["dfdt"] + k4["dfdt"])
    t3_new = t3 + h / 6.0 * (k1["dt3"] + 2.0 * k2["dt3"] + 2.0 * k3["dt3"] + k4["dt3"])
    x_new = x + h / 6.0 * (k1["dxc"] + 2.0 * k2["dxc"] + 2.0 * k3["dxc"] + k4["dxc"])
    al_b = chain_algebra_comb(f_new, t3_new, x_new, u_eff, demand)
    return f_new, t3_new, x_new, k1, al_b


# ---------------------------------------------------------------------------
# Run 仿真（FMU+host 全系统镜像——Q1(B)：host 控制粒度/记账全镜像；组派生 per inertia_model）
# ---------------------------------------------------------------------------
def _simulate_group(spec, variant, dt_int=DT_INT):
    """variant ∈ {"thermo", "comb"}；更新序与 gt001_l1/gt001_comb oracle 逐字镜像
    （GTFMU-5 全 6 Run ±1e-9 守卫承载）。"""
    runs = RUNS_THERMO if variant == "thermo" else RUNS_COMB
    want_im = "thermo" if variant == "thermo" else "thermo_comb"
    spec = oracle_base.resolve_run_spec(runs, spec)
    if spec.get("inertia_model", want_im) != want_im:
        raise ValueError("gt001_fmu_oracle %s 组仅承载 inertia_model=%r，得到 %r"
                         % (variant, want_im, spec.get("inertia_model")))
    family = spec["family"]
    faulted = spec["faulted"]
    monitor = spec["feedback_mode"] == "monitor"
    magnitude = spec["magnitude"] if faulted else 0.0
    t_start = T_START if faulted else None
    is_sensor = family == FAMILY_SENSOR
    is_load = family == FAMILY_LOAD
    is_act = family == FAMILY_ACT
    u_cap = 40.0 * magnitude / 100.0 if is_act else None      # EQ-GTL1-10 指令域口径（Q5）
    t_clear = spec.get("t_clear_s") if is_act else None
    sub = int(round(DT_S / dt_int))
    h = dt_int

    def b_at(time):
        return magnitude if (is_sensor and t_start is not None
                             and time >= t_start - 1e-9) else 0.0

    def demand_at(time):
        return (LOAD0_KW + magnitude) if (is_load and t_start is not None
                                          and time >= t_start - 1e-9) else LOAD0_KW

    def cap_active(time):
        return bool(is_act and t_start is not None and time >= t_start - 1e-9
                    and not (t_clear is not None and time >= t_clear - 1e-9))

    t = build_time_grid()
    n = N_SAMPLES - 1
    series = {k: [None] * (n + 1) for k in SERIES_IDS if k != "t"}

    f = 50.0
    t3 = T3D_K
    u = U0_CMD
    x = K_F * U0_CMD                     # comb 初值（GTCMB Q11 定案）：x_comb(0) = k_f*u(0)
    int_pbat = 0.0
    int_pgen = 0.0
    int_demand = 0.0
    int_rotor = 0.0
    int_fuel = 0.0
    gl2_left_rect = 0.0     # GTFMU-2(a)：左矩形 INT(eta_b*Q_f,d - mdot_g*cp_g*(T3-T2))dt
    gl2_rk4_inc = 0.0       # GTFMU-2(b)：RK4 增量累计（C_3*dT3 逐子步）
    dl_left_rect = 0.0      # GTFMU-2(c)：comb 组延迟环节积分恒等式左矩形（GCMB-2 同构）

    def record(k):
        time = t[k]
        b = b_at(time)
        demand = demand_at(time)
        u_eff = min(u, u_cap) if cap_active(time) else u    # record 域 u_eff（§2.3 注记①）
        if variant == "thermo":
            al = chain_algebra_thermo(f, t3, u_eff, demand)
        else:
            al = chain_algebra_comb(f, t3, x, u_eff, demand)
        p_bat = al["p_bat"]
        p_rotor = al["p_rotor"]
        series["f_true_Hz"][k] = f
        series["f_meas_Hz"][k] = f
        series["n_meas_rpm"][k] = 60.0 * (f + b)
        series["P_gen_true_kW"][k] = al["p_gen"]
        series["P_gen_meas_kW"][k] = al["p_gen"]
        series["P_gen_cmd_kW"][k] = u                       # 指令域展示（wound-up u）
        series["P_bat_true_kW"][k] = p_bat
        series["P_bat_meas_kW"][k] = p_bat
        series["P_load_demand_kW"][k] = demand
        series["P_load_served_kW"][k] = demand
        series["P_rotor_kW"][k] = p_rotor
        series["V_bus_V"][k] = V_BUS
        series["SOC_true_pct"][k] = SOC0_PCT - int_pbat / (CAP_KWH * 3600.0) * 100.0
        series["SOC_est_pct"][k] = SOC0_PCT - int_pbat / (CAP_KWH * 3600.0) * 100.0
        series["r_true_kW"][k] = al["p_gen"] + p_bat - demand - p_rotor   # 定义恒等 ≡ 0
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
        series["eta_cycle_pct"][k] = 100.0 * al["p_gen"] / al["q_f"]      # 瞬时比

    record(0)
    for k in range(1, n + 1):
        for j in range(sub):
            time = (k - 1) * sub * h + j * h
            b = b_at(time)
            demand = demand_at(time)
            # host 子步①：指令更新（EQ-GTL1-9/10——Q1(B) 控制反馈层归 host）
            f_gov = f if (monitor and is_sensor) else f + b
            u_next = js_clamp(u + KI * (50.0 - f_gov) * h, 0.0, 40.0)
            u_eff = min(u_next, u_cap) if cap_active(time) else u_next   # EQ-GTL1-10
            # 内核子步②：RK4（物理状态冻结输入；单子步 doStep n=1 镜像）
            if variant == "thermo":
                f_new, t3_new, k1, al_b = _kernel_step_thermo(f, t3, u_eff, demand, h)
            else:
                q_f_frozen = K_F * u_eff             # EQ-GTL2-3 指令面——本子步冻结
                f_new, t3_new, x_new, k1, al_b = _kernel_step_comb(f, t3, x, u_eff, demand, h)
            # host 子步③：能量累计（oracle 冻结口径逐条复刻——E_gen/E_bat 梯形、
            # E_fuel/E_load/E_rotor 左矩形、GTFMU-2 恒等式累计）
            int_pgen += 0.5 * (k1["p_gen"] + al_b["p_gen"]) * h
            int_pbat += 0.5 * (k1["p_bat"] + al_b["p_bat"]) * h
            int_demand += demand * h
            int_rotor += k1["p_rotor"] * h
            int_fuel += k1["q_f"] * h
            if variant == "thermo":
                gl2_left_rect += ETA_B * k1["q_f"] * h - k1["mdot_g"] * CP_G * (t3 - k1["t2"]) * h
            else:
                gl2_left_rect += (ETA_B * k1["x_comb"] * h
                                  - k1["mdot_g"] * CP_G * (t3 - k1["t2"]) * h)
                dl_left_rect += (q_f_frozen - k1["x_comb"]) * h
            gl2_rk4_inc += C_3 * (t3_new - t3)
            # host 子步④：提交（f/T3 为内核输出；u 为 host 状态；x 为内核态 comb）
            f = f_new
            t3 = t3_new
            if variant == "comb":
                x = x_new
            u = u_next
        record(k)

    integrals = {
        "E_load": int_demand,
        "E_source": int_pgen,
        "E_bat": int_pbat,
        "E_rotor_int": int_rotor,
        "E_fuel": int_fuel,
        "gl2_left_rect": gl2_left_rect,
        "gl2_rk4_inc": gl2_rk4_inc,
    }
    if variant == "comb":
        integrals["dl_left_rect"] = dl_left_rect
        integrals["x_end"] = x            # GTFMU-2(c) 延迟恒等式对照面（x(0)=k_f*u(0)）

    soc_true_end = series["SOC_true_pct"][-1]
    soc_est_end = series["SOC_est_pct"][-1]
    max_r_true = max(abs(v) for v in series["r_true_kW"])
    max_fd = max(abs(v) for v in series["f_channel_diff_Hz"])
    f_end = series["f_true_Hz"][-1]
    e_source = integrals["E_source"] / 3600.0
    e_fuel = integrals["E_fuel"] / 3600.0
    method = METHOD_ID if variant == "thermo" else METHOD_ID_COMB
    metrics = {
        "E_load_kWh": {"value": integrals["E_load"] / 3600.0, "unit": "kWh", "method": method},
        "E_source_kWh": {"value": e_source, "unit": "kWh", "method": method},
        "E_bat_kWh": {"value": integrals["E_bat"] / 3600.0, "unit": "kWh", "method": method},
        "E_rotor_kWh": {"value": KJ * (f_end - 50.0) / 3600.0, "unit": "kWh", "method": method},
        "E_kin_kWh": {"value": (KJ * F0 / 2.0) * ((f_end / F0) ** 2 - 1.0) / 3600.0,
                      "unit": "kWh", "method": method},
        "E_rotor_int_kWh": {"value": integrals["E_rotor_int"] / 3600.0, "unit": "kWh",
                            "method": method},
        "E_fuel_kWh": {"value": e_fuel, "unit": "kWh", "method": method},
        "eta_cycle_end_pct": {"value": 100.0 * e_source / e_fuel, "unit": "%", "method": method},
        "SOC_true_end_pct": {"value": soc_true_end, "unit": "%", "method": method},
        "SOC_est_end_pct": {"value": soc_est_end, "unit": "%", "method": method},
        "SOC_err_pp": {"value": soc_est_end - soc_true_end, "unit": "pp", "method": method},
        "max_abs_r_true_kW": {"value": max_r_true, "unit": "kW", "method": "algebraic"},
        "max_abs_f_channel_diff_Hz": {"value": max_fd, "unit": "Hz", "method": "algebraic"},
    }
    if is_load:
        metrics["f_nadir_Hz"] = {"value": min(series["f_true_Hz"][int(round(T_START / DT_S)):]),
                                 "unit": "Hz", "method": method}

    scalars = {
        "E_source_kWh": e_source,
        "E_bat_kWh": integrals["E_bat"] / 3600.0,
        "E_load_kWh": integrals["E_load"] / 3600.0,
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
            "inertia_model": want_im,
            "series": dict({"t": t}, **series), "integrals": integrals,
            "metrics": metrics, "scalars": scalars, "events": events}


def simulate_run(spec, dt_int=DT_INT):
    """归一入口：按 spec.inertia_model 派发 thermo/comb 组（oracle_base 契约成员）。"""
    spec = dict(spec)
    im = spec.get("inertia_model", "thermo")
    variant = "comb" if im == "thermo_comb" else "thermo"
    return _simulate_group(spec, variant, dt_int)


def _fault_events(spec, series):
    events = []
    if not spec["faulted"]:
        return events
    family = spec["family"]
    magnitude = spec["magnitude"]
    unit = spec["unit"]
    event_type = {FAMILY_SENSOR: "sensor_bias", FAMILY_LOAD: "load_step",
                  FAMILY_ACT: "actuator_limit"}[family]
    target_signal = {FAMILY_SENSOR: "n_meas_rpm", FAMILY_LOAD: "P_load_demand_kW",
                     FAMILY_ACT: "P_gen_cap_kW"}[family]
    i_pre = int(round((T_START - DT_S) / DT_S))
    i_post = int(round(T_START / DT_S))

    def vars_at(idx):
        return {
            "f_true_Hz": series["f_true_Hz"][idx],
            "f_meas_Hz": series["f_meas_Hz"][idx],
            "n_meas_rpm": series["n_meas_rpm"][idx],
            "f_channel_diff_Hz": series["f_channel_diff_Hz"][idx],
        }

    units = {"f_true_Hz": "Hz", "f_meas_Hz": "Hz", "n_meas_rpm": "rpm",
             "f_channel_diff_Hz": "Hz"}
    events.append({
        "event_id": "EV-001",
        "event_type": event_type,
        "trigger_s": T_START,
        "target_signal": target_signal,
        "magnitude": magnitude,
        "unit": unit,
        "snapshots": [
            {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
             "t_s": T_START, "derivation": "left_limit",
             "variables": vars_at(i_pre), "units": units, "fault_id": spec.get("fault_id")},
            {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
             "t_s": T_START, "derivation": "post_sample",
             "variables": vars_at(i_post), "units": units, "fault_id": spec.get("fault_id")},
        ],
    })
    if spec.get("t_clear_s"):
        tc = spec["t_clear_s"]
        i_tc = int(round(tc / DT_S))

        def vars_tc(idx):
            d = vars_at(idx)
            d["P_gen_true_kW"] = series["P_gen_true_kW"][idx]
            return d

        events.append({
            "event_id": "EV-002",
            "event_type": "actuator_clear",
            "trigger_s": tc,
            "target_signal": "P_gen_cap_kW",
            "magnitude": 0.0,
            "unit": "",
            "snapshots": [
                {"snapshot_id": "EV-002-pre", "event_id": "EV-002", "phase": "pre",
                 "t_s": tc, "derivation": "left_limit",
                 "variables": vars_tc(i_tc - 1), "units": units, "fault_id": spec.get("fault_id")},
                {"snapshot_id": "EV-002-post", "event_id": "EV-002", "phase": "post",
                 "t_s": tc, "derivation": "post_sample",
                 "variables": vars_tc(i_tc), "units": units, "fault_id": spec.get("fault_id")},
            ],
        })
    return events


def fault_block(spec):
    """golden run.fault 块（事件编码 v1——gt001_v3/v4 同构；幅值键按族具名）。"""
    if not spec["faulted"]:
        return None
    base = {"family": spec["family"], "fault_id": spec.get("fault_id"),
            "t_start_s": T_START}
    if spec["family"] == FAMILY_SENSOR:
        base["bias_Hz"] = spec["magnitude"]
    elif spec["family"] == FAMILY_LOAD:
        base["delta_load_kW"] = spec["magnitude"]
    else:
        base["cap_pct"] = spec["magnitude"]
        if spec.get("t_clear_s") is not None:
            base["t_clear_s"] = spec["t_clear_s"]
    return base


def build_golden(variant="thermo"):
    """golden schema v2 组装（variant ∈ {"thermo","comb"}；无参缺省 thermo——oracle_base
    契约成员 build_golden() 兼容面；emit 侧显式传参双 golden）。"""
    runs_src = RUNS_THERMO if variant == "thermo" else RUNS_COMB
    golden_id = GOLDEN_ID if variant == "thermo" else GOLDEN_ID_COMB
    method_id = METHOD_ID if variant == "thermo" else METHOD_ID_COMB
    inertia_model = "thermo" if variant == "thermo" else "thermo_comb"
    comb_note = ""
    if variant == "comb":
        comb_note = ("；comb 深化镜像：状态 y=[f,T3,x_comb] 三维 RK4（EQ-GTL2-3/4 修订式——"
                     "τ_comb=0.5 s、x_comb(0)=k_f*u(0)（Q11）、mdot_g 延迟同源 Q13 (i)、"
                     "E_fuel 指令面 Q13 (ii)——GTCMB §1.3 冻结文本逐字）")
    runs = {}
    for spec in runs_src:
        r = _simulate_group(spec, variant)
        runs[r["key"]] = {
            "role": r["role"],
            "feedback_mode": r["feedback_mode"],
            "inertia_model": inertia_model,
            "model_provenance": PROVENANCE,
            "fault": fault_block(spec),
            "events": r["events"],
            "scalars": r["scalars"],
            "metrics": r["metrics"],
            "series": r["series"],
        }
    return {
        "golden_schema_version": oracle_base.GOLDEN_SCHEMA_VERSION_V2,
        "golden_id": golden_id,
        "model_id": MODEL_ID,
        "model_version": MODEL_VERSION,
        "schema_version": "1.0.0",
        "engine_baseline": None,
        "backend": None,
        "supersedes": None,
        "method_id": method_id,
        "method_version": METHOD_VERSION,
        "model_provenance": PROVENANCE,
        "inertia_model": inertia_model,
        "units": {"I": "A", "P": "kW", "E": "kWh", "t": "s", "SOC": "%", "SOC_err": "pp",
                  "f": "Hz", "n": "rpm", "T": "K", "p": "kPa"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T_START,
            "dt_int_s": DT_INT, "Vdc_V": V_BUS, "Pload_demand_kW": LOAD0_KW,
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
            "inertia_model": inertia_model,
            "feedback_modes": ["closed_loop", "monitor"],
            "model_provenance": PROVENANCE,
            "note": "GT-001 L1-FMU 镜像轨（FMU+host 全系统更新序——Q1(B) 控制积分器归 host："
                    "host h=0.01 子步驱动 doStep n=1 + EQ-GTL1-9/10 推进 + 记账复刻；内核纯物理"
                    "RK4 面）" + comb_note + "；容量纲常量 GTL1 §2.1 登记值（15 位有效数字）；"
                    "E_gen/E_bat 梯形、E_fuel/E_load/E_rotor_int 左矩形、eta_cycle_pct 列=瞬时比"
                    "（oracle 头注冻结口径）；行为与数值集总参数演示模型（未经实验/硬件验证）",
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": int(round(T_START / DT_S)),
                     "t_0": 0.0, "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": dict(TOLERANCES),
        "runs": runs,
        "metrics_note": "golden 指标为独立可算子集（能量账本/SOC/极值/锚点）；引擎其余派生"
                        "指标不在比对面；E_rotor_kWh 为线性化口径（遗留，K_J*dF），"
                        "E_kin_kWh 为二次型动能口径，E_rotor_int_kWh 为 INT P_rotor 子步左矩形；"
                        "FMU 镜像轨与 gt001_v3/v4 同物理同更新序（GTFMU-5 全 Run 只读交叉守卫）",
    }


# ---------------------------------------------------------------------------
# GTFMU-1…7 自检（APPROVED v1.0 §4 项 5）
# ---------------------------------------------------------------------------
def _load_reference_golden(path):
    import json as _json
    with open(path, "r", encoding="utf-8") as f:
        return _json.load(f)


def self_check():
    checks = []

    def rec(cid, ok_, observed, tolerance, note):
        checks.append(oracle_base.check_record(cid, ok_, observed, tolerance, note))
        return ok_

    # GTFMU-1 环境校验：设计点解析恒等复算（EQ-GTL1-11 闭合——GL-1 判据同构）
    healthy = _simulate_group(RUNS_THERMO[0], "thermo")
    al0 = chain_algebra_thermo(50.0, T3D_K, 25.0, LOAD0_KW)
    worst = 0.0
    worst = max(worst, abs(al0["p_gen"] - 25.0))
    worst = max(worst, abs(al0["p_bat"] - 5.0))
    worst = max(worst, abs(al0["p_rotor"]))
    worst = max(worst, abs(al0["p2"] - 810.6))
    worst = max(worst, abs(ETA_B * al0["q_f"] - al0["mdot_g"] * CP_G * (T3D_K - al0["t2"])))
    rec("GTFMU-1-design-point", worst <= 1e-9, worst, 1e-9,
        "EQ-GTL1-11 设计点闭合复算（P_gen=25/p_bat=5/p_rotor=0/p2=810.6/燃烧室平衡残差）")

    # GTFMU-2 恒等式：EQ-GTL1-12 能量恒等（左矩形 vs RK4 增量——GL-2 判据 ≤0.2 kJ）
    # + comb 组延迟环节积分恒等式（GCMB-2 同构）
    worst_gl2 = 0.0
    worst_dl = 0.0
    for spec in RUNS_THERMO:
        r = _simulate_group(spec, "thermo")
        worst_gl2 = max(worst_gl2, abs(r["integrals"]["gl2_left_rect"] / 1000.0
                                       - r["integrals"]["gl2_rk4_inc"] / 1000.0))
    for spec in RUNS_COMB:
        r = _simulate_group(spec, "comb")
        worst_gl2 = max(worst_gl2, abs(r["integrals"]["gl2_left_rect"] - r["integrals"]["gl2_rk4_inc"]))
        # GTFMU-2(c)：延迟环节积分恒等式 τ_comb*(x_end - x(0)) ≡ 左矩形 ∫(Q_f - x)dt（GCMB-2 同构）
        dl_expected = TAU_COMB * (r["integrals"]["x_end"] - K_F * U0_CMD)
        worst_dl = max(worst_dl, abs(r["integrals"]["dl_left_rect"] - dl_expected))
    rec("GTFMU-2-identities", worst_gl2 <= 0.2 and worst_dl <= 0.2,
        max(worst_gl2, worst_dl), 0.2,
        "EQ-GTL1-12/GTL2-12 能量恒等 + comb 延迟环节恒等式（kW·s=kJ——GL-2/GCMB-2 判据同构）")

    # GTFMU-3 网格与事件相位：601 点 + EV-001/002 pre/post 语义 + 快照变量 = 采样行
    grid_ok = True
    ev_ok = True
    worst_grid = 0.0
    for runs, variant in ((RUNS_THERMO, "thermo"), (RUNS_COMB, "comb")):
        for spec in runs:
            r = _simulate_group(spec, variant)
            t = r["series"]["t"]
            for i in range(N_SAMPLES):
                worst_grid = max(worst_grid, abs(t[i] - i * DT_S))
            if spec["faulted"]:
                ev = r["events"][0]
                pre, post = ev["snapshots"][0], ev["snapshots"][1]
                ev_ok = ev_ok and pre["t_s"] == T_START and post["t_s"] == T_START \
                    and pre["derivation"] == "left_limit" and post["derivation"] == "post_sample" \
                    and pre["variables"]["n_meas_rpm"] == r["series"]["n_meas_rpm"][199] \
                    and post["variables"]["n_meas_rpm"] == r["series"]["n_meas_rpm"][200]
            else:
                ev_ok = ev_ok and len(r["events"]) == 0
        for spec in (s for s in runs if s.get("t_clear_s")):
            r = _simulate_group(spec["key"], variant)
            ev2 = r["events"][-1]
            ev_ok = ev_ok and ev2["trigger_s"] == 35.0 \
                and ev2["snapshots"][0]["variables"].get("P_gen_true_kW") is not None
    rec("GTFMU-3-grid-events", grid_ok and ev_ok, worst_grid, 1e-9,
        "601 点网格 t[i]=i*dt + EV-001/002 pre=left_limit/post=post_sample + 快照变量=采样行")

    # GTFMU-4 锚点全表复算（§3.1 设计点 + §3.2 comb 初值——emit 冻结值对照）
    rec("GTFMU-4-anchors", worst <= 1e-9 and abs(healthy["series"]["T3_out_K"][0] - 1173.0) <= 1e-12,
        max(worst, abs(healthy["series"]["T3_out_K"][0] - 1173.0)), 1e-9,
        "§3.1 设计点表 + §3.2 comb x_comb(0)=k_f*25 初值复算")

    # GTFMU-5 镜像恒等（A-2 扩面）：全 6 Run 全序列 vs gt001_v3/gt001_v4 golden 只读交叉 ±1e-9
    ref_paths = [
        ("thermo", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__)))), "data", "golden", "gt001_v3.json"), RUNS_THERMO),
        ("comb", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__)))), "data", "golden", "gt001_v4.json"), RUNS_COMB),
    ]
    worst_mirror = 0.0
    mirror_ok = True
    n_values = 0
    for variant, ref_path, runs in ref_paths:
        try:
            ref = _load_reference_golden(ref_path)
        except Exception as e:  # noqa: BLE001
            mirror_ok = False
            rec("GTFMU-5-mirror", False, "无法读取参照 golden：" + str(e), "±1e-9",
                "只读交叉（%s 组）" % variant)
            continue
        for spec in runs:
            r = _simulate_group(spec, variant)
            g_run = ref["runs"][spec["key"]]
            for sid in SERIES_IDS:
                mine = r["series"][sid]
                theirs = g_run["series"][sid]
                for i in range(N_SAMPLES):
                    n_values += 1
                    a, b = mine[i], theirs[i]
                    if a is None or b is None:
                        if (a is None) != (b is None):
                            mirror_ok = False
                        continue
                    d = abs(a - b)
                    rel = d / max(1.0, abs(b))
                    if rel > worst_mirror:
                        worst_mirror = rel
    rec("GTFMU-5-mirror", mirror_ok and worst_mirror <= 1e-9, worst_mirror, 1e-9,
        "全 6 Run 全序列 × 2 组 vs gt001_v3/v4 golden 只读交叉（A-2 扩面——%d 值）" % n_values)

    # GTFMU-6 半步自收敛登记（δt=0.01 vs 0.005——实测 ×≥10 冻结制，GL-7/GCMB-7 先例）
    full = _simulate_group(RUNS_THERMO[1], "thermo")
    half = _simulate_group(RUNS_THERMO[1], "thermo", dt_int=DT_INT / 2.0)
    worst_half = 0.0
    for sid in SERIES_IDS:
        if sid == "t":
            continue
        for a, b in zip(full["series"][sid], half["series"][sid]):
            if a is not None and b is not None:
                worst_half = max(worst_half, abs(a - b))
    rec("GTFMU-6-half-step", worst_half <= 0.05, worst_half, 0.05,
        "dt_int 0.01 vs 0.005 全通道 max|diff|（实测登记 ×≥10 冻结制——GL-7/GCMB-7 先例）")

    # GTFMU-7 无 NaN/Inf + 值域/包络抽查
    finite_ok = True
    dom_ok = True
    for runs, variant in ((RUNS_THERMO, "thermo"), (RUNS_COMB, "comb")):
        for spec in runs:
            r = _simulate_group(spec, variant)
            for sid in SERIES_IDS:
                for v in r["series"][sid]:
                    if v is None:
                        continue
                    if not math.isfinite(v):
                        finite_ok = False
            fv = r["series"]["f_true_Hz"]
            if max(abs(v - 50.0) for v in fv) > 1.0:
                dom_ok = False
            t3v = r["series"]["T3_out_K"]
            if not (735.0 <= min(t3v) and max(t3v) <= 1530.0):
                dom_ok = False
            for v in r["series"]["P_gen_cmd_kW"]:
                if not (0.0 <= v <= 40.0):
                    dom_ok = False
    rec("GTFMU-7-finite-domain", finite_ok and dom_ok,
        "finite=%s domain=%s" % (finite_ok, dom_ok), "all finite; |df|<=1; T3 envelope; u in [0,40]",
        "全 Run 全通道有限性 + 包络抽查（§3.3 登记域）")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


# ---------------------------------------------------------------------------
# emit（双 golden——oracle_base 机制路径；先 GTFMU-1…7 自检，失败 exit 2 不写盘）
# ---------------------------------------------------------------------------
def _emit_variant(variant):
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    golden_id = GOLDEN_ID if variant == "thermo" else GOLDEN_ID_COMB
    path = os.path.join(root, "data", "golden", golden_id + ".json")
    golden = build_golden(variant)
    golden["generated_by"] = oracle_base.generated_by_block(
        tool="tools/oracle/gt001_fmu_oracle.py + tools/oracle/oracle_base.py（机制层）",
        oracle_path=os.path.abspath(__file__),
        command="python -I tools/oracle/gt001_fmu_oracle.py --emit --variant " + variant)
    oracle_base.apply_approval(golden, APPROVED_BY, APPROVED_AT)
    digest = oracle_base.write_golden_with_sidecar(golden, path)
    return {
        "variant": variant,
        "written": os.path.abspath(path),
        "bytes": os.path.getsize(path),
        "golden_sha256": digest,
        "oracle_source_sha256": golden["generated_by"]["oracle_source_sha256"],
        "approved_by": golden["approval"]["approved_by"],
        "approved_at": golden["approval"]["approved_at"],
    }


def emit():
    ok, checks = self_check()
    if not ok:
        print(json.dumps({"ok": False, "checks": checks}, ensure_ascii=True, indent=2))
        return 2
    results = [_emit_variant("thermo"), _emit_variant("comb")]
    print(json.dumps({"ok": True, "goldens": results}, ensure_ascii=False, indent=2))
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
        g = build_golden("thermo")
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
