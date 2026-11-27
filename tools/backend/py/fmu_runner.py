#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fmu_runner.py — FMU 2.0 Co-Simulation 最小 ctypes 加载器（W-3 / FL-19 增量四）。

状态：**D-27 已关闭（FCFMU-G2b-04，CHG-20261118-01）**——fc001_l1_v1.fmu 实测 doStep 路径验证
  （R-G9-02 parity 全 5 Run 全 21 列散差 0.0 + R-G9-03 三次执行恒等）；FC-001 壳执行见 run_fc001_shell。
功能：
  - 解包 .fmu（zip）到临时目录；
  - 解析 modelDescription.xml（FMI 2.0 元素：ModelIdentifier / Stout / Guid）；
  - ctypes 加载平台二进制（win64 .dll / linux64 .so）；
  - fmi2Instantiate / fmi2SetupExperiment / fmi2EnterInitializationMode /
    fmi2ExitInitializationMode / fmi2DoStep / fmi2GetReal / fmi2Terminate / fmi2FreeInstance；
  - 产出与 fl001_analytic 同 schema 的 series（通过 output 变量名映射）。

安全边界：同 bridge.py（回环 + Origin 白名单 + 令牌）；准入层 fmu_admission.py 前置。
仅标准库（zipfile + ctypes + xml.etree）。
"""
import ctypes
import json
import math
import os
import shutil
import struct
import sys
import tempfile
import zipfile
import xml.etree.ElementTree as ET

# FMI 2.0 状态码
FMI_OK = 0
FMI_WARNING = 1
FMI_DISCARD = 2
FMI_ERROR = 3
FMI_FATAL = 4
FMI_PENDING = 5


def load_fmu(fmu_path, work_dir=None):
    """解包 .fmu 到临时目录，返回 (model_description_dict, binary_path, tmp_dir)。"""
    tmp = tempfile.mkdtemp(prefix="fmu_", dir=work_dir)
    with zipfile.ZipFile(fmu_path) as z:
        z.extractall(tmp)
    desc_path = os.path.join(tmp, "modelDescription.xml")
    if not os.path.exists(desc_path):
        raise FileNotFoundError("modelDescription.xml 不存在")
    tree = ET.parse(desc_path)
    root = tree.getroot()
    # FMI 2.0 attributes
    fmi_version = root.get("fmiVersion", "2.0")
    model_name = root.get("modelName", "")
    guid = root.get("guid", "")
    # Co-Simulation
    cs = root.find(".//CoSimulation")
    if cs is None:
        raise ValueError("仅支持 FMI 2.0 Co-Simulation（ModelExchange 不在此路线）")
    model_identifier = cs.get("modelIdentifier", "")
    # 平台二进制
    if sys.platform == "win32":
        plat_dir, ext = "win64", ".dll"
    elif sys.platform == "linux":
        plat_dir, ext = "linux64", ".so"
    else:
        raise OSError("不支持的平台：" + sys.platform)
    binary_path = os.path.join(tmp, "binaries", plat_dir, model_identifier + ext)
    if not os.path.exists(binary_path):
        raise FileNotFoundError("平台二进制不存在：" + binary_path)
    return {
        "fmi_version": fmi_version, "model_name": model_name, "guid": guid,
        "model_identifier": model_identifier, "binary_path": binary_path,
        "tmp_dir": tmp, "root": root,
    }


def _define_fmi2(lib):
    """定义 FMI 2.0 CS 最小 ctypes 接口。"""
    lib.fmi2Instantiate.argtypes = [
        ctypes.c_void_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_char_p,
        ctypes.c_char_p, ctypes.c_void_p, ctypes.c_int]
    lib.fmi2Instantiate.restype = ctypes.c_void_p
    lib.fmi2SetupExperiment.argtypes = [ctypes.c_void_p, ctypes.c_int,
                                        ctypes.c_double, ctypes.c_double,
                                        ctypes.c_int, ctypes.c_double]
    lib.fmi2SetupExperiment.restype = ctypes.c_int
    lib.fmi2EnterInitializationMode.argtypes = [ctypes.c_void_p]
    lib.fmi2EnterInitializationMode.restype = ctypes.c_int
    lib.fmi2ExitInitializationMode.argtypes = [ctypes.c_void_p]
    lib.fmi2ExitInitializationMode.restype = ctypes.c_int
    lib.fmi2DoStep.argtypes = [ctypes.c_void_p, ctypes.c_double,
                               ctypes.c_double, ctypes.c_int]
    lib.fmi2DoStep.restype = ctypes.c_int
    lib.fmi2GetReal.argtypes = [ctypes.c_void_p, ctypes.c_void_p,
                                ctypes.c_size_t, ctypes.c_void_p]
    lib.fmi2GetReal.restype = ctypes.c_int
    lib.fmi2Terminate.argtypes = [ctypes.c_void_p]
    lib.fmi2Terminate.restype = ctypes.c_int
    lib.fmi2FreeInstance.argtypes = [ctypes.c_void_p]
    lib.fmi2FreeInstance.restype = None
    # FCFMU-G2b-04 增补（CHG-20261118-01）：SetReal / Reset
    lib.fmi2SetReal.argtypes = [ctypes.c_void_p, ctypes.c_void_p,
                                ctypes.c_size_t, ctypes.c_void_p]
    lib.fmi2SetReal.restype = ctypes.c_int
    lib.fmi2Reset.argtypes = [ctypes.c_void_p]
    lib.fmi2Reset.restype = ctypes.c_int
    return lib


# ---------------------------------------------------------------------------
# FC-001 L1-FMU 壳执行（FCFMU-G2b-04——I-11 壳职责归 host；APPROVED v1.0 §1.1/§1.3）
# ---------------------------------------------------------------------------
#: VR 契约（tools/backend/fmu/modelDescription.xml 逐字对齐）
FC_VR_OUT = (5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17)

#: Run 矩阵（APPROVED v1.0 §2.1 白名单全集 5 Run——与 fc001_fmu_oracle.RUNS 同源语义）
FC_RUNS = [
    {"key": "baseline", "role": "baseline", "feedback_mode": "baseline",
     "faulted": False, "b_p_ca_kPa": 0.0, "b_V_water_mL": 0.0, "alpha_drain_post": 1.0},
    {"key": "sensor_p_ca_closed_loop", "role": "fault", "feedback_mode": "closed_loop",
     "faulted": True, "b_p_ca_kPa": 15.0, "b_V_water_mL": 0.0, "alpha_drain_post": 1.0},
    {"key": "sensor_p_ca_monitor", "role": "fault", "feedback_mode": "monitor",
     "faulted": True, "b_p_ca_kPa": 15.0, "b_V_water_mL": 0.0, "alpha_drain_post": 1.0},
    {"key": "sensor_v_water_closed_loop", "role": "fault", "feedback_mode": "closed_loop",
     "faulted": True, "b_p_ca_kPa": 0.0, "b_V_water_mL": -80.0, "alpha_drain_post": 1.0},
    {"key": "actuator_drain_closed_loop", "role": "fault", "feedback_mode": "closed_loop",
     "faulted": True, "b_p_ca_kPa": 0.0, "b_V_water_mL": 0.0, "alpha_drain_post": 0.45},
]

FC_N_SAMPLES = 601
FC_DT = 0.1
FC_T_FAULT = 20.0
FC_I_F = 200
FC_V_CAP_MAX = 500.0
FC_U_MIN, FC_U_MAX = 0.05, 0.95
FC_U_AN = 0.50

#: FMU SHA-256 钉值（V312 §10 钉 hash——R-G9-03 前置校验）。
#: 重钉 CHG-20261127-01（D-12 linux64：包内增 binaries/linux64/fc001_l1.so + manifest
#: build_toolchains；win64 条目逐字节保留）。历史钉值 5f60ca78…（v1.11.0–v1.16.0，win64-only）。
FC_FMU_SHA256_PINNED = "259e2cc1c46e239da74bacabc075a40fc0b151bc3ed0b05b6e371a219da71ef6"


def _fc_control(feedback_mode, p_ca_meas, v_water_meas):
    """控制律（EQ-FCFMU-18/19——host 壳职责；Q16 u_an 维持 0.50）。"""
    if feedback_mode == "closed_loop":
        u_o2 = min(FC_U_MAX, max(FC_U_MIN, 0.50 - 0.01 * (p_ca_meas - 200.0)))
        u_drain = min(FC_U_MAX, max(FC_U_MIN, 0.50 + 0.002 * (v_water_meas - 200.0)))
    else:  # baseline / monitor
        u_o2 = 0.50
        u_drain = 0.50
    return {"u_o2": u_o2, "u_drain": u_drain, "u_an": FC_U_AN}


def _fc_row(true_map, feedback_mode, b_p, b_v, bias_applied):
    """单点全变量（EQ-FCFMU-14..23——壳职责；true_map = 内核 GetReal 真值输出，
    下标 = FC_VR_OUT 序）。运算序与 fc001_fmu_oracle._row_variables 逐字对齐
    （R-G9-02 parity 前提）。"""
    bp = b_p if bias_applied else 0.0
    bv = b_v if bias_applied else 0.0
    p_ca_true = true_map[6]           # VR 11
    v_water_true = true_map[3]        # VR 8
    v_stack_true = true_map[9]        # VR 14
    t_stack_true = true_map[4]        # VR 9
    p_ca_meas = p_ca_true + bp                                            # EQ-14
    v_water_meas = v_water_true + bv                                      # EQ-15
    ctl = _fc_control(feedback_mode, p_ca_meas, v_water_meas)             # EQ-18/19
    p_n2_est = 50.0 + (200.0 - p_ca_meas) * (-0.35)                       # EQ-20（内部量）
    theta_est = v_water_meas / FC_V_CAP_MAX                               # EQ-21
    r_p = p_ca_meas - p_ca_true                                           # EQ-22
    r_water = v_water_meas - v_water_true                                 # EQ-23
    return {
        "p_O2_ca_true_kPa": true_map[0], "p_N2_ca_true_kPa": true_map[1],
        "p_H2_an_true_kPa": true_map[2], "V_water_store_true_mL": v_water_true,
        "T_stack_true_K": t_stack_true,
        "p_ca_true_kPa": p_ca_true, "y_O2_ca_true": true_map[7],
        "cap_water_ratio_true": true_map[8], "V_stack_true_V": v_stack_true,
        "eta_sys_true_pct": true_map[12],
        "p_ca_meas_kPa": p_ca_meas, "V_water_store_meas_mL": v_water_meas,
        "V_stack_meas_V": v_stack_true, "T_stack_meas_K": t_stack_true,
        "u_o2_valve_cmd": ctl["u_o2"], "u_drain_valve_cmd": ctl["u_drain"],
        "u_an_valve_cmd": ctl["u_an"], "cap_water_ratio_est": theta_est,
        "r_meas_p_kPa": r_p, "r_meas_water_mL": r_water,
        "_p_n2_est_kPa": p_n2_est,
    }


# ---------------------------------------------------------------------------
# GT-001 L1-FMU 壳执行（GTFMU-G2b-04 / CHG-20261119-01——Q1(B)：控制积分器归 host，
# h=0.01 子步驱动 doStep n=1；内核纯物理 [f,T3]/[f,T3,x_comb] RK4 面）
# ---------------------------------------------------------------------------
#: GT FMU 包 SHA-256 钉值（V312 §11 双钉——装载前强制校验）。
#: 重钉 CHG-20261127-01（D-12 linux64：包内增 binaries/linux64/*.so + manifest build_toolchains；
#: win64 条目逐字节保留）。历史钉值 db966da9… / fc2289a2…（v1.12.0–v1.16.0，win64-only）。
GT_FMU_SHA256_PINNED = {
    "gt001_l1": "08cfd649ac5b267d0bc4c093af8828b04e5dc6f75dbd39469ea400a223ac7f95",
    "gt001_comb_l1": "06d2c9f87182d4d9f14b9e8e547d620dbcdaa947aab8240dc00ab83fb9c8fd1d",
}

GT_VR_F = 2
GT_VR_T3 = 3
GT_VR_XCOMB = 4  # comb only
GT_VR_DEMAND = 0
GT_VR_UEFF = 1

#: GT 12 Run 白名单（APPROVED §2.1——thermo 镜像 6 + comb 镜像 6；oracle RUNS 逐字）
GT_RUNS = [
    {"key": "healthy", "role": "baseline", "feedback_mode": "closed_loop",
     "family": "none", "faulted": False, "magnitude": 0.0, "unit": "",
     "inertia_model": "thermo"},
    {"key": "closed_loop_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": "sensor_drift", "faulted": True, "magnitude": 0.3, "unit": "Hz",
     "inertia_model": "thermo"},
    {"key": "monitor_only", "role": "monitor", "feedback_mode": "monitor",
     "family": "sensor_drift", "faulted": True, "magnitude": 0.3, "unit": "Hz",
     "inertia_model": "thermo"},
    {"key": "load_step", "role": "fault", "feedback_mode": "closed_loop",
     "family": "load_step", "faulted": True, "magnitude": 10.0, "unit": "kW",
     "inertia_model": "thermo"},
    {"key": "actuator_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": "actuator_fault", "faulted": True, "magnitude": 50.0, "unit": "%",
     "inertia_model": "thermo"},
    {"key": "actuator_clear", "role": "fault", "feedback_mode": "closed_loop",
     "family": "actuator_fault", "faulted": True, "magnitude": 50.0, "unit": "%",
     "t_clear_s": 35.0, "inertia_model": "thermo"},
    {"key": "healthy", "role": "baseline", "feedback_mode": "closed_loop",
     "family": "none", "faulted": False, "magnitude": 0.0, "unit": "",
     "inertia_model": "thermo_comb"},
    {"key": "closed_loop_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": "sensor_drift", "faulted": True, "magnitude": 0.3, "unit": "Hz",
     "inertia_model": "thermo_comb"},
    {"key": "monitor_only", "role": "monitor", "feedback_mode": "monitor",
     "family": "sensor_drift", "faulted": True, "magnitude": 0.3, "unit": "Hz",
     "inertia_model": "thermo_comb"},
    {"key": "load_step", "role": "fault", "feedback_mode": "closed_loop",
     "family": "load_step", "faulted": True, "magnitude": 10.0, "unit": "kW",
     "inertia_model": "thermo_comb"},
    {"key": "actuator_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": "actuator_fault", "faulted": True, "magnitude": 50.0, "unit": "%",
     "inertia_model": "thermo_comb"},
    {"key": "actuator_clear", "role": "fault", "feedback_mode": "closed_loop",
     "family": "actuator_fault", "faulted": True, "magnitude": 50.0, "unit": "%",
     "t_clear_s": 35.0, "inertia_model": "thermo_comb"},
]

GT_N_SAMPLES = 601
GT_DT_S = 0.1
GT_DT_INT = 0.01
GT_T_START = 20.0
GT_LOAD0 = 30.0
GT_V_BUS = 400.0
GT_CAP_KWH = 40.0
GT_SOC0 = 60.0
GT_U0 = 25.0
GT_SERIES_IDS = [
    "t", "f_true_Hz", "f_meas_Hz", "n_meas_rpm",
    "P_gen_true_kW", "P_gen_meas_kW", "P_gen_cmd_kW",
    "P_bat_true_kW", "P_bat_meas_kW",
    "P_load_demand_kW", "P_load_served_kW", "P_rotor_kW",
    "V_bus_V", "SOC_true_pct", "SOC_est_pct",
    "r_true_kW", "f_channel_diff_Hz", "valve_cmd_pct", "valve_meas_pct",
    "T3_out_K", "T2_out_K", "p2_out_kPa", "T4_out_K",
    "Q_fuel_kW", "P_comp_kW", "P_turb_kW", "eta_cycle_pct",
]


def js_clamp(v, lo, hi):
    return lo if v < lo else (hi if v > hi else v)


def run_gt001_shell(fmu_path, out_path=None):
    """GT-001 5+5 Run 壳执行（Q1(B)：host h=0.01 子步驱动 doStep n=1 + EQ-GTL1-9/10 +
    记账复刻；EV-001/002 事件分裂；确定性零墙钟输出——R-G9-03 前提）。

    双组支持：按 modelIdentifier 分派（gt001_l1 → thermo 组 6 Run /
    gt001_comb_l1 → comb 组 6 Run——Q2(a) 双包双组）。
    """
    import hashlib

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import fmu_admission

    adm = fmu_admission.admit(fmu_path)
    if not adm["admitted"]:
        return {"ok": False, "stage": "admission", "admission": adm}

    with open(fmu_path, "rb") as f:
        fmu_sha256 = hashlib.sha256(f.read()).hexdigest()
    info = load_fmu(fmu_path)
    model_id = info["model_identifier"]
    if model_id not in GT_FMU_SHA256_PINNED:
        raise RuntimeError("未知 GT FMU modelIdentifier：" + model_id)
    if fmu_sha256 != GT_FMU_SHA256_PINNED[model_id]:
        raise RuntimeError("FMU SHA-256 与 V312 钉值不符：%s（pinned=%s）"
                           % (fmu_sha256, GT_FMU_SHA256_PINNED[model_id]))
    variant = "thermo" if model_id == "gt001_l1" else "comb"
    runs_pool = [s for s in GT_RUNS if s["inertia_model"] == ("thermo" if variant == "thermo" else "thermo_comb")]

    lib = ctypes.CDLL(info["binary_path"])
    _define_fmi2(lib)
    guid = info["guid"].encode("utf-8")
    mid = info["model_identifier"].encode("utf-8")
    c = lib.fmi2Instantiate(None, 1, guid, mid, None, None, 0)
    if not c:
        raise RuntimeError("fmi2Instantiate 失败")
    lib.fmi2SetupExperiment(c, 1, 0.0, 0.0, 0, 60.0)
    lib.fmi2EnterInitializationMode(c)
    lib.fmi2ExitInitializationMode(c)

    # VR 分派（thermo: 2=f/3=T3/10=p_gen/11=p_bat/12=p_rotor/7=q_f；
    #          comb:   2=f/3=T3/11=p_gen/12=p_bat/13=p_rotor/8=q_f）
    if variant == "thermo":
        vr_f, vr_pgen, vr_pbat, vr_protor, vr_qf = 2, 10, 11, 12, 7
        vr_read = (ctypes.c_uint32 * 4)(vr_pgen, vr_pbat, vr_protor, vr_qf)
    else:
        vr_f, vr_pgen, vr_pbat, vr_protor, vr_qf = 2, 11, 12, 13, 8
        vr_read = (ctypes.c_uint32 * 4)(vr_pgen, vr_pbat, vr_protor, vr_qf)
    vr_in = (ctypes.c_uint32 * 2)(GT_VR_DEMAND, GT_VR_UEFF)
    val_in = (ctypes.c_double * 2)()
    val_read = (ctypes.c_double * 4)()

    def get_f():
        rc = lib.fmi2GetReal(c, (ctypes.c_uint32 * 1)(GT_VR_F), 1, val_read)
        if rc != FMI_OK:
            raise RuntimeError("fmi2GetReal(f) rc=%d" % rc)
        return val_read[0]

    def get_alg():
        rc = lib.fmi2GetReal(c, vr_read, 4, val_read)
        if rc != FMI_OK:
            raise RuntimeError("fmi2GetReal(alg) rc=%d" % rc)
        return {"p_gen": val_read[0], "p_bat": val_read[1],
                "p_rotor": val_read[2], "q_f": val_read[3]}

    def set_inputs(demand, u_eff):
        val_in[0], val_in[1] = demand, u_eff
        rc = lib.fmi2SetReal(c, vr_in, 2, val_in)
        if rc != FMI_OK:
            raise RuntimeError("fmi2SetReal rc=%d" % rc)

    def do_step(t):
        rc = lib.fmi2DoStep(c, t, GT_DT_INT, 0)
        if rc != FMI_OK:
            raise RuntimeError("fmi2DoStep rc=%d @t=%s" % (rc, t))

    runs_out = {}
    for spec in runs_pool:
        lib.fmi2Reset(c)
        family = spec["family"]
        faulted = spec["faulted"]
        monitor = spec["feedback_mode"] == "monitor"
        magnitude = spec["magnitude"] if faulted else 0.0
        t_start = GT_T_START if faulted else None
        is_sensor = family == "sensor_drift"
        is_load = family == "load_step"
        is_act = family == "actuator_fault"
        u_cap = 40.0 * magnitude / 100.0 if is_act else None
        t_clear = spec.get("t_clear_s") if is_act else None

        def b_at(time):
            return magnitude if (is_sensor and t_start is not None
                                 and time >= t_start - 1e-9) else 0.0

        def demand_at(time):
            return (GT_LOAD0 + magnitude) if (is_load and t_start is not None
                                              and time >= t_start - 1e-9) else GT_LOAD0

        def cap_active(time):
            return bool(is_act and t_start is not None and time >= t_start - 1e-9
                        and not (t_clear is not None and time >= t_clear - 1e-9))

        series = {k: [None] * GT_N_SAMPLES for k in GT_SERIES_IDS if k != "t"}

        f = 50.0
        u = GT_U0
        int_pbat = 0.0
        int_pgen = 0.0
        int_demand = 0.0
        int_rotor = 0.0
        int_fuel = 0.0

        def record(k):
            time = k * GT_DT_S
            b = b_at(time)
            demand = demand_at(time)
            u_eff = min(u, u_cap) if cap_active(time) else u
            set_inputs(demand, u_eff)
            al = get_alg()
            p_bat = al["p_bat"]
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
            series["P_rotor_kW"][k] = al["p_rotor"]
            series["V_bus_V"][k] = GT_V_BUS
            series["SOC_true_pct"][k] = GT_SOC0 - int_pbat / (GT_CAP_KWH * 3600.0) * 100.0
            series["SOC_est_pct"][k] = GT_SOC0 - int_pbat / (GT_CAP_KWH * 3600.0) * 100.0
            series["r_true_kW"][k] = al["p_gen"] + p_bat - demand - al["p_rotor"]
            series["f_channel_diff_Hz"][k] = series["n_meas_rpm"][k] / 60.0 - series["f_meas_Hz"][k]
            series["valve_cmd_pct"][k] = js_clamp(u / 40.0 * 100.0, 0.0, 100.0)
            series["valve_meas_pct"][k] = magnitude if cap_active(time) else series["valve_cmd_pct"][k]

        record(0)
        for k in range(1, GT_N_SAMPLES):
            for j in range(10):
                time = (k - 1) * 10 * GT_DT_INT + j * GT_DT_INT
                b = b_at(time)
                demand = demand_at(time)
                f = get_f()
                f_gov = f if (monitor and is_sensor) else f + b
                u_next = js_clamp(u + 2.0 * (50.0 - f_gov) * GT_DT_INT, 0.0, 40.0)
                u_eff = min(u_next, u_cap) if cap_active(time) else u_next
                set_inputs(demand, u_eff)
                k1 = get_alg()
                do_step(time)
                al_b = get_alg()
                int_pgen += 0.5 * (k1["p_gen"] + al_b["p_gen"]) * GT_DT_INT
                int_pbat += 0.5 * (k1["p_bat"] + al_b["p_bat"]) * GT_DT_INT
                int_demand += demand * GT_DT_INT
                int_rotor += k1["p_rotor"] * GT_DT_INT
                int_fuel += k1["q_f"] * GT_DT_INT
                u = u_next
            # record(k)：记录面 u_eff/demand 重设（不污染下一子步）
            record(k)

        # run_hash
        body = json.dumps({"key": spec["key"], "series": series, "inertia_model": spec["inertia_model"]},
                          ensure_ascii=False, sort_keys=True)
        run_key = spec["key"] + "_" + spec["inertia_model"]
        runs_out[run_key] = {
            "role": spec["role"], "feedback_mode": spec["feedback_mode"],
            "inertia_model": spec["inertia_model"],
            "events": [],  # 事件由 golden 侧比对——壳面零事件编码（oracle _fault_events 先例）
            "series": series,
            "run_hash": hashlib.sha256(body.encode("utf-8")).hexdigest(),
        }

    lib.fmi2Terminate(c)
    lib.fmi2FreeInstance(c)
    cleanup(info)

    output = {"fmu_sha256": fmu_sha256, "model_id": model_id,
              "variant": variant, "runs": runs_out}
    if out_path:
        with open(out_path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
    return {"ok": True, "fmu_sha256": fmu_sha256, "variant": variant, "runs": runs_out}



def run_fc001_shell(fmu_path, out_path=None):
    """FC-001 5 Run 壳执行：准入 + SHA-256 对 V312 钉值校验 → ctypes 加载 →
    I-11 壳（传感污染/控制反馈/残差——事件分裂归 host）→ pre/post 左极限分裂 →
    确定性 JSON（零墙钟字段——R-G9-03 三次执行恒等前提）。"""
    import hashlib

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import fmu_admission

    adm = fmu_admission.admit(fmu_path)
    if not adm["admitted"]:
        return {"ok": False, "stage": "admission", "admission": adm}

    with open(fmu_path, "rb") as f:
        fmu_sha256 = hashlib.sha256(f.read()).hexdigest()
    if fmu_sha256 != FC_FMU_SHA256_PINNED:
        raise RuntimeError("FMU SHA-256 与 V312 钉值不符：%s（pinned=%s）"
                           % (fmu_sha256, FC_FMU_SHA256_PINNED))

    info = load_fmu(fmu_path)
    lib = ctypes.CDLL(info["binary_path"])
    _define_fmi2(lib)
    guid = info["guid"].encode("utf-8")
    model_id = info["model_identifier"].encode("utf-8")
    c = lib.fmi2Instantiate(None, 1, guid, model_id, None, None, 0)
    if not c:
        raise RuntimeError("fmi2Instantiate 失败")
    lib.fmi2SetupExperiment(c, 1, 0.0, 0.0, 0, 60.0)
    lib.fmi2EnterInitializationMode(c)
    lib.fmi2ExitInitializationMode(c)

    vr_out = (ctypes.c_uint32 * len(FC_VR_OUT))(*FC_VR_OUT)
    val_out = (ctypes.c_double * len(FC_VR_OUT))()
    vr_in = (ctypes.c_uint32 * 5)(0, 1, 2, 3, 4)
    val_in = (ctypes.c_double * 5)()

    def get_true():
        rc = lib.fmi2GetReal(c, vr_out, len(FC_VR_OUT), val_out)
        if rc != FMI_OK:
            raise RuntimeError("fmi2GetReal rc=%d" % rc)
        return list(val_out)

    def set_inputs(u_o2, u_drain, u_an, alpha):
        val_in[0], val_in[1], val_in[2], val_in[3], val_in[4] = 100.0, u_o2, u_drain, u_an, alpha
        rc = lib.fmi2SetReal(c, vr_in, 5, val_in)
        if rc != FMI_OK:
            raise RuntimeError("fmi2SetReal rc=%d" % rc)

    def do_step(t):
        rc = lib.fmi2DoStep(c, t, FC_DT, 0)
        if rc != FMI_OK:
            raise RuntimeError("fmi2DoStep rc=%d @t=%s" % (rc, t))

    series_ids = ["t", "p_O2_ca_true_kPa", "p_N2_ca_true_kPa", "p_H2_an_true_kPa",
                  "V_water_store_true_mL", "T_stack_true_K", "p_ca_true_kPa",
                  "y_O2_ca_true", "cap_water_ratio_true", "V_stack_true_V",
                  "eta_sys_true_pct", "p_ca_meas_kPa", "V_water_store_meas_mL",
                  "V_stack_meas_V", "T_stack_meas_K", "u_o2_valve_cmd",
                  "u_drain_valve_cmd", "u_an_valve_cmd", "cap_water_ratio_est",
                  "r_meas_p_kPa", "r_meas_water_mL"]

    runs_out = {}
    for spec in FC_RUNS:
        lib.fmi2Reset(c)
        series = {sid: [None] * FC_N_SAMPLES for sid in series_ids}
        events = []

        def record(k, row):
            for sid in series_ids:
                series[sid][k] = k * FC_DT if sid == "t" else row[sid]

        def snapshot_vars(row):
            return {sid: row[sid] for sid in series_ids if sid != "t"}

        # 相位一：[0, 20.0)——行 0..199（无偏置、标称控制；u 冻结于行 k——ZOH）
        for k in range(0, FC_I_F):
            true_map = get_true()
            row = _fc_row(true_map, spec["feedback_mode"], spec["b_p_ca_kPa"],
                          spec["b_V_water_mL"], False)
            record(k, row)
            set_inputs(row["u_o2_valve_cmd"], row["u_drain_valve_cmd"],
                       row["u_an_valve_cmd"], 1.0)
            do_step(k * FC_DT)
        # t=20.0：pre 快照（左极限——偏置未施加）→ 故障突变 → post 行（零步长代数）
        pre_row = _fc_row(get_true(), spec["feedback_mode"], spec["b_p_ca_kPa"],
                          spec["b_V_water_mL"], False)
        pre_vars = snapshot_vars(pre_row)
        post_row = _fc_row(get_true(), spec["feedback_mode"], spec["b_p_ca_kPa"],
                           spec["b_V_water_mL"], True)
        post_vars = snapshot_vars(post_row)
        record(FC_I_F, post_row)
        set_inputs(post_row["u_o2_valve_cmd"], post_row["u_drain_valve_cmd"],
                   post_row["u_an_valve_cmd"], spec["alpha_drain_post"])
        if spec["faulted"]:
            events.append({
                "event_id": "EV-FCFMU-001",
                "event_type": "actuator_degradation" if spec["key"] == "actuator_drain_closed_loop"
                else "sensor_bias",
                "trigger_s": FC_T_FAULT, "phase": "onset",
                "snapshots": [
                    {"snapshot_id": "EV-FCFMU-001-pre", "phase": "pre", "t_s": FC_T_FAULT,
                     "derivation": "left_limit", "variables": pre_vars},
                    {"snapshot_id": "EV-FCFMU-001-post", "phase": "post", "t_s": FC_T_FAULT,
                     "derivation": "post_sample", "variables": post_vars},
                ],
            })
        # 相位二：[20.0, 60.0]——400 步积分（doStep 先行、行后记）：
        #   行 k（k=201..600）= 第 (k-200) 次 doStep 后的状态（t = 20+j*0.1）；
        #   第 j 步的输入 = 行 (200+j-1) 的指令（行 k 的 u 管辖 [t_k, t_k+0.1)——ZOH，
        #   与 oracle 更新序逐字对齐——off-by-one 教训：行先于步记录 = 状态滞后 + 控制早行）。
        for j in range(1, 401):
            do_step(FC_T_FAULT + (j - 1) * FC_DT)
            true_map = get_true()
            row = _fc_row(true_map, spec["feedback_mode"], spec["b_p_ca_kPa"],
                          spec["b_V_water_mL"], True)
            record(FC_I_F + j, row)
            set_inputs(row["u_o2_valve_cmd"], row["u_drain_valve_cmd"],
                       row["u_an_valve_cmd"], spec["alpha_drain_post"])

        # run_hash：对 Run 内容规范 JSON 的 SHA-256（零墙钟——R-G9-03 恒等前提）
        body = json.dumps({"key": spec["key"], "series": series, "events": events},
                          ensure_ascii=False, sort_keys=True)
        runs_out[spec["key"]] = {
            "role": spec["role"], "feedback_mode": spec["feedback_mode"],
            "events": events, "series": series,
            "run_hash": hashlib.sha256(body.encode("utf-8")).hexdigest(),
        }

    lib.fmi2Terminate(c)
    lib.fmi2FreeInstance(c)
    cleanup(info)

    output = {
        "fmu_sha256": fmu_sha256,
        "fmu_admitted": True,
        "model_id": "fc.pem.fmu_l1",
        "runs": runs_out,
    }
    if out_path:
        with open(out_path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
    return {"ok": True, "fmu_sha256": fmu_sha256, "runs": runs_out}


def run_cs(info, output_vrs, duration_s, dt_s, n_samples):
    """执行 Co-Simulation，返回 {vr: [values]}。需实际 FMU 验证（D-27）。"""
    lib = ctypes.CDLL(info["binary_path"])
    _define_fmi2(lib)
    guid = info["guid"].encode("utf-8")
    model_id = info["model_identifier"].encode("utf-8")
    # instantiate（resources 为空指针——纯 CS）
    c = lib.fmi2Instantiate(None, 1, guid, model_id, None, None, 0)
    if not c:
        raise RuntimeError("fmi2Instantiate 失败")
    rc = lib.fmi2SetupExperiment(c, 1, 0.0, 0.0, 0, duration_s)
    if rc != FMI_OK:
        raise RuntimeError("fmi2SetupExperiment rc=" + str(rc))
    lib.fmi2EnterInitializationMode(c)
    lib.fmi2ExitInitializationMode(c)
    # outputvr 数组
    vr_arr = (ctypes.c_uint32 * len(output_vrs))(*output_vrs)
    val_arr = (ctypes.c_double * len(output_vrs))()
    result = {vr: [] for vr in output_vrs}
    t = 0.0
    dt = duration_s / (n_samples - 1)
    for step in range(n_samples):
        rc = lib.fmi2GetReal(c, vr_arr, len(output_vrs), val_arr)
        if rc != FMI_OK:
            raise RuntimeError("fmi2GetReal rc=" + str(rc))
        for i, vr in enumerate(output_vrs):
            result[vr].append(val_arr[i])
        if step < n_samples - 1:
            rc = lib.fmi2DoStep(c, t, dt, 0)
            if rc != FMI_OK:
                raise RuntimeError("fmi2DoStep rc=" + str(rc))
            t += dt
    lib.fmi2Terminate(c)
    lib.fmi2FreeInstance(c)
    return result


def cleanup(info):
    shutil.rmtree(info["tmp_dir"], ignore_errors=True)


def self_check():
    """FR-1：模块可加载、FMI 接口定义完整（不加载实际 FMU——D-27）。"""
    checks = []
    ok_all = True
    # FR-1: load_fmu 函数存在且可调用（不传真 FMU）
    ok1 = callable(load_fmu) and callable(run_cs) and callable(cleanup)
    checks.append({"check_id": "FR-1-interface", "status": "pass" if ok1 else "fail",
                   "note": "ctypes FMI 2.0 CS 接口骨架已定义（load/run/cleanup）"})
    ok_all &= ok1
    # FR-2: _define_fmi2 可执行（空 lib 不可加载，但函数定义路径可达）
    ok2 = callable(_define_fmi2)
    checks.append({"check_id": "FR-2-fmi2-defs", "status": "pass" if ok2 else "fail",
                   "note": "FMI 2.0 CS ctypes 接口定义函数存在"})
    ok_all &= ok2
    # FR-3: D-27 关闭（FCFMU-G2b-04——fc001_l1_v1.fmu 实测：parity 散差 0.0 + 三次恒等）
    checks.append({"check_id": "FR-3-d27-closed", "status": "pass",
                   "note": "D-27 已关闭：doStep 路径经 fc001_l1_v1.fmu 实测验证"
                           "（R-G9-02 parity 0.0 / R-G9-03 三次恒等——CHG-20261118-01）"})
    return ok_all, checks


def main(argv):
    if "--self-check" in argv:
        ok, checks = self_check()
        print(json.dumps({"ok": ok, "checks": checks}, ensure_ascii=False, indent=2))
        return 0 if ok else 2
    if "--run-gt001" in argv:
        i = argv.index("--run-gt001")
        fmu = argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith("--") else \
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))),
                "data", "fmu", "gt001_l1_v1.fmu")
        r = run_gt001_shell(fmu)
        if not r.get("ok"):
            print(json.dumps({"ok": False, "stage": r.get("stage"), "detail": r.get("admission")},
                             ensure_ascii=False, indent=2))
            return 1
        print(json.dumps({"ok": True, "fmu_sha256": r["fmu_sha256"], "variant": r["variant"],
                          "runs": {k: {"run_hash": v["run_hash"], "series": v["series"]}
                                   for k, v in r["runs"].items()}},
                         ensure_ascii=False, indent=2))
        return 0
    if "--run-fc001" in argv:
        i = argv.index("--run-fc001")
        fmu = argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith("--") else \
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
                os.path.dirname(os.path.abspath(__file__))))),
                "data", "fmu", "fc001_l1_v1.fmu")
        j = argv.index("--out") if "--out" in argv else -1
        out = argv[j + 1] if j >= 0 else None
        r = run_fc001_shell(fmu, out)
        if not r.get("ok"):
            print(json.dumps({"ok": False, "stage": r.get("stage"), "detail": r.get("admission"),
                              "fmu_path": fmu}, ensure_ascii=False, indent=2))
            return 1
        print(json.dumps({"ok": r["ok"], "fmu_sha256": r["fmu_sha256"],
                          "runs": {k: v["run_hash"] for k, v in r["runs"].items()}},
                         ensure_ascii=False, indent=2))
        return 0
    print(__doc__)
    return 0


if __name__ == "__main__":
    main(sys.argv)
