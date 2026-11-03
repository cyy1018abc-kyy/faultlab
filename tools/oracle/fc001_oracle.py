# -*- coding: utf-8 -*-
"""fc001_oracle.py — FC-001 独立解析 oracle（P1-06 / G2b-lite 基线 + G2b 扩展 W1-2 / FC-G2b-02）

独立性声明（与 fl001_oracle.py 同规，MODEL_VALIDATION_SPEC §6.3 类推）：
  1. 不 import / 复制 src/**；方程与参数唯一权威文本是 DECISIONS.md G0-DEC-15 的 FC-001 修复
     清单（SOC_true_end=59.4755556%、SOC_est_end=59.5866667%，含 τ_fc 过渡尾项）、
     docs/CONTRACT.md §5.2（只读参照）与 NEXT/FCEXT_G2B_SPEC_APPROVED.md v1.1 §1/§2（load_step
     级联 / actuator 钳位，2026-11-04 CHG-20261104-02 批准），此处独立硬编码。
  2. 不与产品 engine 共享公式常量；golden 只能由本 oracle（经 emit_golden.py fc001）生成。
  3. 自带自检（SC-1…SC-10），失败 exit 2。

模型（FC-001 L0 行为级；电堆=受控一阶电流源，电池=理想平衡缓冲）：
  EQ-1  b(t) = 0 (t < 20.0)；b(t) = +10 A (t ≥ 20.0)（sensor_drift 轨）
  EQ-2  I_fc,meas = I_fc + b(t)
  EQ-3  闭环: τ_fc·dI_fc/dt + I_fc = I_fc_ref − b(t)，I_fc(0)=50 A，I_fc_ref=50 A，τ_fc=1.2 s
              t ≥ 20.0 : I_fc = 40 + 10·exp(−(t−20)/1.2)
        仅监测: I_fc ≡ 50 A；无故障: I_fc ≡ 50 A
  EQ-4  P_fc = 0.4·I_fc；P_fc,meas = 0.4·I_meas；P_load = 30 kW
        P_bat = P_load − P_fc（理想平衡缓冲，放电为正）；P_bat,meas = P_bat（电池传感器健康）
        P_bat,est = P_load − P_fc,meas（EMS 平衡估算，模型假设 A-fc-soc-est）
  EQ-5  r_true = P_fc + P_bat − P_load ≡ 0；r_meas = P_fc,meas + P_bat,meas − P_load ≡ 0.4·b(t)
  EQ-6  SOC_true(t) = 60 − 100·(1/40)·∫[0,t] P_bat(s)/3600 ds（%）
        SOC_est(t)  = 60 − 100·(1/40)·∫[0,t] P_bat,est(s)/3600 ds（%）
        SOC_err_pp  = SOC_est − SOC_true（pp；故障期为 +0.11111 pp，与 FL-001 方向相反，W-10）
  EQ-6b（FCEXT §1.2 新增登记，load_step 轨）
        τ_ref·dI_fc_ref/dt + I_fc_ref = (P_load(t) − 10)/0.4，τ_ref = 2.5 s（功率分配器级；
        其余轨 I_fc_ref = (P_load − 10)/0.4 恒值）。I_fc_ref 非阶跃——引擎为级联两段一阶
        （engine.js:780–790 实机复算三法交叉确认，FCEXT §1.1）。
  actuator_fault（FCEXT §2.1）：I_fc_cap = I_fc_base×magnitude/100（I_fc_base=(load0−10)/0.4），
        t≥t_start 起 target = min(I_fc_ref, I_fc_cap)（钳位式，无恢复动态）；actuator 轨电堆
        跟随 τ = 1.5 s（engine.js:788 isAct?1.5:1.2 双轨；sensor/load 轨 1.2 s）。

load_step / actuator 数值口径（承重约束，V060_WAVE_DESIGN §1.2 约束二）：
  load_step 轨 I_fc_ref 目标每子步移动（指数趋近），常目标闭式解产生 O(dt) 级尾差——
  引擎 60s 实机 74.999995 A（级联尾差 ~5.4e-6，SC-10 域声明 ≤6e-6），连续闭式 75.0 必挂
  V-07 rtol 1e-12。故本 oracle 对这两族**按子步递推复刻引擎级联更新序**
  （对标 gt001_oracle「更新序冻结」先例，engine-gt 双 golden 同构验收）：
    子步 dt_int = 0.01 s（engine DT_INT，每 0.1 s 输出步 10 子步）；事件时刻对齐子步边界
    （time ≥ t_start − 1e-9，time = (k−1)·SUB·DT_INT + j·DT_INT 引擎同式）；
    I_fc_ref 以 foStep（target=(demand−10)/0.4，τ_ref=2.5）逐子步更新，I_fc 再以 foStep
    （target=I_fc_ref（load）/ min(I_fc_ref, I_fc_cap)（actuator），τ=1.2/1.5）跟随。
  foStep 语义（engine.js:443–450 逐字复刻，IEEE-754 双精度同序）：
    y'     = target + (y − target)·exp(−dt/τ)
    ∫y dt  = target·dt + (y − target)·τ·(1 − exp(−dt/τ))
  actuator 段 t ≥ t_start 后目标恒定（min(50, 27.5) = 27.5 A），闭式可用；本实现统一走
  子步递推以与引擎逐位对齐（验证基准：engine 对 golden 全序列 rtol 1e-12）。

关键全精度值（闭环故障，与批准修复清单一致）：
  ∫I_fc(0..60) = 50·20 + 40·40 + 10·1.2·(1−e^{−40/1.2}) = 2612 − 12·e^{−40/1.2} A·s
  E_fc = 0.4·∫I_fc/3600 = 1044.8/3600 kWh（显示 0.290222）
  ∫P_bat = 1800 − 1044.8 = 755.2 kW·s → SOC_true_end = 60 − 755.2/1440 = 59.4755556 %
  ∫P_bat,est = 1800 − 0.4·(2612+400) = 595.2 kW·s → SOC_est_end = 59.5866667 %
  SOC_err = +0.1111111 pp（正号；估计放电偏少 → 估计 SOC 偏高）

G2b 验收锚点（FCEXT §1.3 / §2.3，SC-8/SC-9 复算冻结）：
  load_step +10kW@20s : I_fc(60)=75.00±0.5 A（实机 74.9999946）；P_bat(60)=10.00±0.5 kW
                        （实机 10.000002）；瞬态 max|P_bat|=20.00 kW（t0+ 网格点，包络内）；
                        SOC_est−SOC_true=0（intB=0 同式）；r_true≡0。
  actuator 55%@20s    : I_fc(60)=27.50±0.1 A（钳位）；P_bat(60)=19.00±0.3 kW；
                        max|P_bat|=19.00 kW；r_true≡0；无 NaN/Inf；SOC∈[0,100]。

golden 序列面空值约定：I_fc_cap_A 为可空信号（非 actuator 轨恒 null，与引擎 makeSeries
逐值一致）；含 null 的列不入 golden series（gt001 P_gen_cap_kW 先例「入 golden 前剔除」，
verify_golden V-07 数值差分不适用 null 列），信号本身保留于 SERIES_IDS 与 simulate_run 输出面。

D-2 接入（ORACLE_INTERFACE_D2 §2/§5.1，W1-2）：import oracle_base（机制层；本文件仍不与
engine 共享常量）；simulate_run 首参接 resolve_run_spec（str 归一式 + spec dict 兼容式）；
写盘/批准沿用既有 emit 通道 tools/oracle/emit_golden.py（与 base write_golden_with_sidecar /
apply_approval 字节同构：二进制 LF + sidecar 两空格式 + V-03b 批准摘要）。

Python 3 标准库；无第三方依赖；不访问网络。
"""

import hashlib
import json
import math
import os
import platform
import sys

_ORACLE_DIR = os.path.dirname(os.path.abspath(__file__))
if _ORACLE_DIR not in sys.path:
    sys.path.insert(0, _ORACLE_DIR)

import oracle_base  # noqa: E402  （D-2 机制层：resolve_run_spec / check_record / V-03 哈希）

DURATION_S = 60.0
DT_S = 0.1
T_F = 20.0
BIAS_A = 10.0
V_KW_PER_A = 0.4
I_FC_REF_A = 50.0
TAU_FC_S = 1.2
TAU_REF_S = 2.5       # EQ-6 功率分配器级 τ_ref（FCEXT §1.1，engine.js:781 口径）
TAU_ACT_S = 1.5       # actuator 轨电堆跟随 τ（FCEXT §2.1，engine.js:788 isAct 分支）
DT_INT_S = 0.01       # 引擎内积分子步（engine.js:12 DT_INT）
SUB_INT = 10          # 每 0.1 s 输出步的子步数（engine.js:14 SUB）
PLOAD_KW = 30.0
P_BAT_REF_KW = 10.0   # 功率分配器恒偏移 P_bat_ref（FCEXT §1.1）
EBAT_KWH = 40.0
SOC0_PCT = 60.0
LOAD_STEP_KW = 10.0   # load_step Run 幅值（+10 kW @ 20 s）
ACTUATOR_PCT = 55.0   # actuator Run 幅值（55% @ 20 s → I_fc_cap = 27.5 A）
I_FC_BASE_A = (PLOAD_KW - P_BAT_REF_KW) / V_KW_PER_A   # = 50 A（一般式 (load0−10)/0.4）

N_SAMPLES = int(round(DURATION_S / DT_S)) + 1
I_F = int(round(T_F / DT_S))
METHOD_ID = "analytic_flux"
METHOD_VERSION = "analytic_flux.2"
MODEL_VERSION = "1.1.0"

FAMILY_NONE = "none"
FAMILY_SENSOR = "sensor_drift"
FAMILY_LOAD = "load_step"
FAMILY_ACT = "actuator_fault"

SERIES_IDS = [
    "t", "I_fc_true_A", "I_fc_meas_A", "I_fc_ref_A", "bias_A", "I_fc_cap_A",
    "P_fc_true_kW", "P_fc_meas_kW", "I_bat_true_A",
    "P_bat_true_kW", "P_bat_est_kW",
    "P_load_demand_kW", "P_load_served_kW",
    "SOC_true_pct", "SOC_est_pct", "r_true_kW", "r_meas_kW",
    "valve_cmd_pct", "valve_meas_pct",
]

RUNS = [
    {"key": "healthy", "role": "baseline", "feedback_mode": "closed_loop",
     "faulted": False, "family": FAMILY_NONE},
    {"key": "closed_loop_fault", "role": "fault", "feedback_mode": "closed_loop",
     "faulted": True, "family": FAMILY_SENSOR},
    {"key": "monitor_only", "role": "monitor", "feedback_mode": "monitor",
     "faulted": True, "family": FAMILY_SENSOR},
    {"key": "load_step_closed_loop", "role": "fault", "feedback_mode": "closed_loop",
     "faulted": True, "family": FAMILY_LOAD, "magnitude": LOAD_STEP_KW},
    {"key": "actuator_closed_loop", "role": "fault", "feedback_mode": "closed_loop",
     "faulted": True, "family": FAMILY_ACT, "magnitude": ACTUATOR_PCT},
]


# ---------------------------------------------------------------------------
# sensor/healthy 轨：解析闭式（G0-DEC-15 修复清单口径，数值不变）
# ---------------------------------------------------------------------------
def b_at(t, faulted):
    return BIAS_A if (faulted and t >= T_F) else 0.0


def i_fc_at(t, feedback_mode, faulted):
    if not faulted:
        return I_FC_REF_A
    if feedback_mode == "monitor":
        return I_FC_REF_A
    if t < T_F:
        return I_FC_REF_A
    u = t - T_F
    return (I_FC_REF_A - BIAS_A) + BIAS_A * math.exp(-u / TAU_FC_S)


def int_i_fc(x, feedback_mode, faulted):
    if x <= 0.0:
        return 0.0
    if x <= T_F or not faulted or feedback_mode == "monitor":
        return I_FC_REF_A * x
    u = x - T_F
    return I_FC_REF_A * T_F + (I_FC_REF_A - BIAS_A) * u + BIAS_A * TAU_FC_S * (1.0 - math.exp(-u / TAU_FC_S))


def int_b(x, faulted):
    if not faulted or x <= T_F:
        return 0.0
    return BIAS_A * (x - T_F)


def soc_true_at(x, feedback_mode, faulted):
    # ∫P_bat = P_load·x − 0.4·∫I_fc
    e_kws = PLOAD_KW * x - V_KW_PER_A * int_i_fc(x, feedback_mode, faulted)
    return SOC0_PCT - 100.0 * e_kws / (EBAT_KWH * 3600.0)


def soc_est_at(x, feedback_mode, faulted):
    # ∫P_bat,est = P_load·x − 0.4·(∫I_fc + ∫b)（EMS 平衡估算，A-fc-soc-est）
    e_kws = PLOAD_KW * x - V_KW_PER_A * (int_i_fc(x, feedback_mode, faulted) + int_b(x, faulted))
    return SOC0_PCT - 100.0 * e_kws / (EBAT_KWH * 3600.0)


def build_time_grid():
    return [i * DT_S for i in range(N_SAMPLES)]


# ---------------------------------------------------------------------------
# load_step / actuator 轨：引擎级联子步递推复刻（更新序冻结，见模块 docstring）
# ---------------------------------------------------------------------------
def _fo_step(y, target, tau, dt):
    """一阶环节精确离散步（engine.js:443–450 foStep 逐字复刻，IEEE-754 双精度同序）。"""
    ratio = dt / tau
    a = 0.0 if ratio > 40 else math.exp(-ratio)
    y_new = target + (y - target) * a
    integral = target * dt + (y - target) * tau * (1.0 - a)
    return y_new, integral


def _simulate_numeric_run(spec, family):
    """G2b 扩展 Run（load_step / actuator_fault）：按引擎内联数值路径逐子步复刻。

    更新序（engine.js simulateFC001 :740–793，逐位对齐目标）：
      record(0) 后，每输出步 10 个 0.01s 子步：
        time = (k−1)·SUB·DT_INT + j·DT_INT（事件边界判定 time ≥ t_start − 1e-9）
        intDemand += demand·dt_int；intB += b·dt_int
        load_step: I_fc_ref ← foStep(I_fc_ref, (demand−P_bat_ref)/V, 2.5, dt_int).y
        target = actuator: (time≥t_start−1e-9) ? min(I_fc_ref, I_fc_cap) : I_fc_ref
                 其他:     I_fc_ref
        I_fc ← foStep(I_fc, target, actuator?1.5:1.2, dt_int)；intIfc += .integral
      record(k) 于输出网格 t[k] = k·dt。
    """
    mode = spec["feedback_mode"]
    faulted = spec["faulted"]
    magnitude = float(spec["magnitude"])
    is_load = (family == FAMILY_LOAD)
    is_act = (family == FAMILY_ACT)
    t_start = T_F
    load0 = PLOAD_KW
    soc0 = SOC0_PCT
    i_fc_cap = I_FC_BASE_A * magnitude / 100.0 if is_act else None

    t = build_time_grid()
    col = {}
    for sid in SERIES_IDS:
        if sid == "t":
            continue
        col[sid] = [None] * N_SAMPLES if sid == "I_fc_cap_A" else [0.0] * N_SAMPLES

    i_fc = I_FC_BASE_A
    i_fc_ref = I_FC_BASE_A
    int_ifc = 0.0
    int_b_acc = 0.0
    int_demand = 0.0

    def demand_at(time):
        return (load0 + magnitude) if (is_load and time >= t_start - 1e-9) else load0

    def record(k):
        time = t[k]
        b = 0.0  # 非 sensor 轨测量通道无偏置（engine bAt: isSensor 限定）
        demand = demand_at(time)
        i_meas = i_fc + b
        p_fc = V_KW_PER_A * i_fc
        p_fc_meas = V_KW_PER_A * i_meas
        p_bat = demand - p_fc
        p_bat_est = demand - p_fc_meas
        col["I_fc_true_A"][k] = i_fc
        col["I_fc_meas_A"][k] = i_meas
        col["I_fc_ref_A"][k] = i_fc_ref
        col["bias_A"][k] = b
        col["I_fc_cap_A"][k] = i_fc_cap if (is_act and time >= t_start - 1e-9) else None
        col["P_fc_true_kW"][k] = p_fc
        col["P_fc_meas_kW"][k] = p_fc_meas
        col["I_bat_true_A"][k] = p_bat / V_KW_PER_A
        col["P_bat_true_kW"][k] = p_bat
        col["P_bat_est_kW"][k] = p_bat_est
        col["P_load_demand_kW"][k] = demand
        col["P_load_served_kW"][k] = demand
        col["SOC_true_pct"][k] = soc0 - (int_demand - V_KW_PER_A * int_ifc) / (EBAT_KWH * 3600.0) * 100.0
        col["SOC_est_pct"][k] = soc0 - (int_demand - V_KW_PER_A * int_ifc - V_KW_PER_A * int_b_acc) / (EBAT_KWH * 3600.0) * 100.0
        col["r_true_kW"][k] = p_fc + p_bat - demand
        col["r_meas_kW"][k] = p_fc_meas + p_bat - demand
        col["valve_cmd_pct"][k] = 100.0
        col["valve_meas_pct"][k] = magnitude if (is_act and time >= t_start - 1e-9) else 100.0

    record(0)
    for k in range(1, N_SAMPLES):
        for j in range(SUB_INT):
            time = (k - 1) * SUB_INT * DT_INT_S + j * DT_INT_S
            b = 0.0
            demand = demand_at(time)
            int_demand += demand * DT_INT_S
            int_b_acc += b * DT_INT_S
            if is_load:
                # EQ-6 功率分配器级：目标每子步移动（引擎 refStep 积分项弃用，仅取 .y）
                i_fc_ref, _ = _fo_step(i_fc_ref, (demand - P_BAT_REF_KW) / V_KW_PER_A,
                                       TAU_REF_S, DT_INT_S)
            if is_act:
                target = min(i_fc_ref, i_fc_cap) if time >= t_start - 1e-9 else i_fc_ref
            else:
                target = i_fc_ref
            i_fc, step_int = _fo_step(i_fc, target,
                                      TAU_ACT_S if is_act else TAU_FC_S, DT_INT_S)
            int_ifc += step_int
        record(k)

    max_abs_r_true = max(abs(v) for v in col["r_true_kW"])
    max_abs_r_meas = max(abs(v) for v in col["r_meas_kW"])

    x_end = t[-1]
    int_ifc_end = int_ifc
    e_fc = V_KW_PER_A * int_ifc_end / 3600.0
    e_bat = (int_demand - V_KW_PER_A * int_ifc_end) / 3600.0
    e_bat_est = (int_demand - V_KW_PER_A * (int_ifc_end + int_b_acc)) / 3600.0
    e_load = int_demand / 3600.0
    soc_true_end = col["SOC_true_pct"][-1]
    soc_est_end = col["SOC_est_pct"][-1]
    focal = col["I_fc_true_A"][-1] - col["I_fc_true_A"][I_F] if faulted else None

    metrics = {
        "E_source_kWh": {"value": e_fc, "unit": "kWh", "method": METHOD_ID},
        "E_bat_kWh": {"value": e_bat, "unit": "kWh", "method": METHOD_ID},
        "E_bat_est_kWh": {"value": e_bat_est, "unit": "kWh", "method": METHOD_ID},
        "E_load_kWh": {"value": e_load, "unit": "kWh", "method": METHOD_ID},
        "SOC_true_end_pct": {"value": soc_true_end, "unit": "%", "method": METHOD_ID},
        "SOC_est_end_pct": {"value": soc_est_end, "unit": "%", "method": METHOD_ID},
        "SOC_err_pp": {"value": soc_est_end - soc_true_end, "unit": "pp", "method": METHOD_ID},
        "max_abs_r_true_kW": {"value": max_abs_r_true, "unit": "kW", "method": "algebraic"},
        "max_abs_r_meas_kW": {"value": max_abs_r_meas, "unit": "kW", "method": "algebraic"},
        "focal_change": {"value": focal, "unit": "A", "method": "analytic"},
    }

    events = []
    if family == FAMILY_LOAD:
        i_fc_20 = col["I_fc_true_A"][I_F]
        events.append({
            "event_id": "EV-001", "event_type": "load_step", "trigger_s": T_F,
            "target_signal": "P_load_demand_kW", "magnitude": magnitude, "unit": "kW",
            "snapshots": [
                {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
                 "t_s": T_F, "derivation": "left_limit",
                 "variables": {"I_fc_true_A": i_fc_20, "I_fc_meas_A": i_fc_20,
                               "P_load_demand_kW": load0},
                 "units": {"I_fc_true_A": "A", "I_fc_meas_A": "A", "P_load_demand_kW": "kW"},
                 "fault_id": "load_step_10kW"},
                {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
                 "t_s": T_F, "derivation": "post_sample",
                 "variables": {"I_fc_true_A": i_fc_20, "I_fc_meas_A": i_fc_20,
                               "P_load_demand_kW": load0 + magnitude},
                 "units": {"I_fc_true_A": "A", "I_fc_meas_A": "A", "P_load_demand_kW": "kW"},
                 "fault_id": "load_step_10kW"},
            ],
        })
    elif family == FAMILY_ACT:
        i_fc_20 = col["I_fc_true_A"][I_F]
        events.append({
            "event_id": "EV-001", "event_type": "actuator_fault", "trigger_s": T_F,
            "target_signal": "I_fc_cap_A", "magnitude": magnitude, "unit": "%",
            "snapshots": [
                {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
                 "t_s": T_F, "derivation": "left_limit",
                 "variables": {"I_fc_true_A": i_fc_20, "I_fc_meas_A": i_fc_20,
                               "I_fc_cap_A": None, "valve_meas_pct": 100.0},
                 "units": {"I_fc_true_A": "A", "I_fc_meas_A": "A",
                           "I_fc_cap_A": "A", "valve_meas_pct": "%"},
                 "fault_id": "valve_stuck"},
                {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
                 "t_s": T_F, "derivation": "post_sample",
                 "variables": {"I_fc_true_A": i_fc_20, "I_fc_meas_A": i_fc_20,
                               "I_fc_cap_A": i_fc_cap, "valve_meas_pct": magnitude},
                 "units": {"I_fc_true_A": "A", "I_fc_meas_A": "A",
                           "I_fc_cap_A": "A", "valve_meas_pct": "%"},
                 "fault_id": "valve_stuck"},
            ],
        })

    series = {"t": t}
    series.update(col)
    scalars = {
        "E_fc_true_kWh": e_fc,
        "E_bat_true_kWh": e_bat,
        "E_bat_est_kWh": e_bat_est,
        "E_load_kWh": e_load,
        "SOC_true_end_pct": soc_true_end,
        "SOC_est_end_pct": soc_est_end,
        "SOC_err_end_pp": soc_est_end - soc_true_end,
        "I_fc_true_20post_A": col["I_fc_true_A"][I_F],
        "I_fc_meas_20post_A": col["I_fc_meas_A"][I_F],
        "I_fc_true_60_A": col["I_fc_true_A"][-1],
        "I_fc_true_26_A": col["I_fc_true_A"][int(round(26.0 / DT_S))],
        "max_abs_r_true_kW": max_abs_r_true,
        "max_abs_r_meas_kW": max_abs_r_meas,
        "int_I_fc_60s_As": int_ifc_end,
    }
    return {"key": spec["key"], "role": spec["role"], "feedback_mode": mode,
            "faulted": faulted, "family": family, "series": series, "events": events,
            "scalars": scalars, "metrics": metrics}


def _simulate_sensor_run(spec):
    """既有三 Run（healthy / closed_loop_fault / monitor_only）：解析闭式（数值不变）。"""
    mode = spec["feedback_mode"]
    faulted = spec["faulted"]
    t = build_time_grid()
    col = {k: [0.0] * N_SAMPLES for k in SERIES_IDS if k != "t"}
    max_abs_r_true = 0.0
    max_abs_r_meas = 0.0
    for i, ti in enumerate(t):
        b = b_at(ti, faulted)
        i_fc = i_fc_at(ti, mode, faulted)
        i_meas = i_fc + b
        p_fc = V_KW_PER_A * i_fc
        p_fc_meas = V_KW_PER_A * i_meas
        p_bat = PLOAD_KW - p_fc
        p_bat_meas = p_bat
        p_bat_est = PLOAD_KW - p_fc_meas
        i_bat = p_bat / V_KW_PER_A
        r_true = p_fc + p_bat - PLOAD_KW
        r_meas = p_fc_meas + p_bat_meas - PLOAD_KW
        col["I_fc_true_A"][i] = i_fc
        col["I_fc_meas_A"][i] = i_meas
        col["I_fc_ref_A"][i] = I_FC_REF_A          # 传感器/健康轨 I_fc_ref ≡ (P_load−10)/0.4 = 50 A 恒值
        col["bias_A"][i] = b
        col["I_fc_cap_A"][i] = None                # 非 actuator 轨不可用（引擎 makeSeries null）
        col["P_fc_true_kW"][i] = p_fc
        col["P_fc_meas_kW"][i] = p_fc_meas
        col["I_bat_true_A"][i] = i_bat
        col["P_bat_true_kW"][i] = p_bat
        col["P_bat_est_kW"][i] = p_bat_est
        col["P_load_demand_kW"][i] = PLOAD_KW
        col["P_load_served_kW"][i] = PLOAD_KW
        col["SOC_true_pct"][i] = soc_true_at(ti, mode, faulted)
        col["SOC_est_pct"][i] = soc_est_at(ti, mode, faulted)
        col["r_true_kW"][i] = r_true
        col["r_meas_kW"][i] = r_meas
        col["valve_cmd_pct"][i] = 100.0
        col["valve_meas_pct"][i] = 100.0
        max_abs_r_true = max(max_abs_r_true, abs(r_true))
        max_abs_r_meas = max(max_abs_r_meas, abs(r_meas))

    x_end = t[-1]
    int_ifc_end = int_i_fc(x_end, mode, faulted)
    e_fc = V_KW_PER_A * int_ifc_end / 3600.0
    e_bat = (PLOAD_KW * x_end - V_KW_PER_A * int_ifc_end) / 3600.0
    e_bat_est = (PLOAD_KW * x_end - V_KW_PER_A * (int_ifc_end + int_b(x_end, faulted))) / 3600.0
    soc_true_end = soc_true_at(x_end, mode, faulted)
    soc_est_end = soc_est_at(x_end, mode, faulted)
    focal = (i_fc_at(x_end, mode, faulted) - i_fc_at(T_F, mode, faulted)) if faulted else None

    metrics = {
        "E_source_kWh": {"value": e_fc, "unit": "kWh", "method": METHOD_ID},
        "E_bat_kWh": {"value": e_bat, "unit": "kWh", "method": METHOD_ID},
        "E_bat_est_kWh": {"value": e_bat_est, "unit": "kWh", "method": METHOD_ID},
        "E_load_kWh": {"value": PLOAD_KW * x_end / 3600.0, "unit": "kWh", "method": METHOD_ID},
        "SOC_true_end_pct": {"value": soc_true_end, "unit": "%", "method": METHOD_ID},
        "SOC_est_end_pct": {"value": soc_est_end, "unit": "%", "method": METHOD_ID},
        "SOC_err_pp": {"value": soc_est_end - soc_true_end, "unit": "pp", "method": METHOD_ID},
        "max_abs_r_true_kW": {"value": max_abs_r_true, "unit": "kW", "method": "algebraic"},
        "max_abs_r_meas_kW": {"value": max_abs_r_meas, "unit": "kW", "method": "algebraic"},
        "focal_change": {"value": focal, "unit": "A", "method": "analytic"},
    }

    events = []
    if faulted:
        i_fc_20 = i_fc_at(T_F, mode, faulted)
        events.append({
            "event_id": "EV-001", "event_type": "sensor_bias", "trigger_s": T_F,
            "target_signal": "bias_A", "magnitude": BIAS_A, "unit": "A",
            "snapshots": [
                {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
                 "t_s": T_F, "derivation": "left_limit",
                 "variables": {"I_fc_true_A": i_fc_20, "I_fc_meas_A": i_fc_20, "bias_A": 0.0},
                 "units": {"I_fc_true_A": "A", "I_fc_meas_A": "A", "bias_A": "A"},
                 "fault_id": "I_fc_sensor_bias"},
                {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
                 "t_s": T_F, "derivation": "post_sample",
                 "variables": {"I_fc_true_A": i_fc_20, "I_fc_meas_A": i_fc_20 + BIAS_A, "bias_A": BIAS_A},
                 "units": {"I_fc_true_A": "A", "I_fc_meas_A": "A", "bias_A": "A"},
                 "fault_id": "I_fc_sensor_bias"},
            ],
        })

    series = {"t": t}
    series.update(col)
    scalars = {
        "E_fc_true_kWh": e_fc,
        "E_bat_true_kWh": e_bat,
        "E_bat_est_kWh": e_bat_est,
        "E_load_kWh": PLOAD_KW * x_end / 3600.0,
        "SOC_true_end_pct": soc_true_end,
        "SOC_est_end_pct": soc_est_end,
        "SOC_err_end_pp": soc_est_end - soc_true_end,
        "I_fc_true_20post_A": col["I_fc_true_A"][I_F],
        "I_fc_meas_20post_A": col["I_fc_meas_A"][I_F],
        "I_fc_true_60_A": col["I_fc_true_A"][-1],
        "I_fc_true_26_A": i_fc_at(26.0, mode, faulted),
        "max_abs_r_true_kW": max_abs_r_true,
        "max_abs_r_meas_kW": max_abs_r_meas,
        "int_I_fc_60s_As": int_ifc_end,
    }
    return {"key": spec["key"], "role": spec["role"], "feedback_mode": mode,
            "faulted": faulted, "family": spec.get("family", FAMILY_SENSOR),
            "series": series, "events": events, "scalars": scalars, "metrics": metrics}


def simulate_run(spec, **overrides):
    """归一契约入口（ORACLE_INTERFACE_D2 §2）。

    首参经 resolve_run_spec 归一：str = RUNS 的 key（归一式）；
    dict = spec（scripts/verify_golden.py:196-201 现行调用式的兼容面）。
    **overrides 为变体覆盖保留位（先例 gt001 inertia；fc001 现无变体，传入即忽略）。
    返回必含 series（含 "t" 列）/scalars/metrics/events。
    """
    spec = oracle_base.resolve_run_spec(RUNS, spec)
    family = spec.get("family") or (FAMILY_NONE if not spec["faulted"] else FAMILY_SENSOR)
    if family in (FAMILY_LOAD, FAMILY_ACT):
        return _simulate_numeric_run(spec, family)
    return _simulate_sensor_run(spec)


def _simpson(f, a, b, n):
    if n % 2:
        n += 1
    h = (b - a) / n
    s = f(a) + f(b)
    for i in range(1, n):
        s += f(a + i * h) * (4 if i % 2 else 2)
    return s * h / 3.0


def self_check():
    checks = []

    def rec(cid, ok_, observed, tolerance, note):
        checks.append(oracle_base.check_record(cid, ok_, observed, tolerance, note))

    ana = int_i_fc(DURATION_S, "closed_loop", True)
    simp = _simpson(lambda x: i_fc_at(x, "closed_loop", True), 0.0, DURATION_S, 60000)
    d = abs(simp - ana)
    rec("SC-1-simpson-intI", d <= 1e-6, d, "≤1e-6 A·s", "Simpson(n=60000) vs 解析 ∫I_fc dt")

    h = 0.001
    y = I_FC_REF_A
    tcur = 0.0
    grid = build_time_grid()
    yi = 0
    worst = 0.0
    for _ in range(int(round(DURATION_S / h))):
        b_step = b_at(tcur + h / 2, True)
        k1 = ((I_FC_REF_A - b_step) - y) / TAU_FC_S
        k2 = ((I_FC_REF_A - b_step) - (y + h / 2 * k1)) / TAU_FC_S
        k3 = ((I_FC_REF_A - b_step) - (y + h / 2 * k2)) / TAU_FC_S
        k4 = ((I_FC_REF_A - b_step) - (y + h * k3)) / TAU_FC_S
        y += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6.0
        tcur += h
        while yi < N_SAMPLES - 1 and abs((yi + 1) * DT_S - tcur) < h / 2:
            yi += 1
            worst = max(worst, abs(y - i_fc_at(grid[yi], "closed_loop", True)))
    rec("SC-2-rk4-ode", worst <= 1e-9, worst, "≤1e-9 A", "RK4(dt=1e-3, b 按步中点冻结) vs 闭式解")

    run = simulate_run(RUNS[1])
    worst_eq = 0.0
    for i in range(N_SAMPLES):
        worst_eq = max(worst_eq,
                       abs(run["series"]["I_fc_meas_A"][i] - run["series"]["I_fc_true_A"][i] - run["series"]["bias_A"][i]),
                       abs(run["series"]["P_fc_true_kW"][i] - V_KW_PER_A * run["series"]["I_fc_true_A"][i]),
                       abs(run["series"]["r_true_kW"][i]))
    rec("SC-3-identity", worst_eq <= 1e-12, worst_eq, "≤1e-12", "定义恒等式（含 SOC 估计器口径 P_bat,est）")

    n = 600000
    hh = DURATION_S / n
    s = 0.0
    prev = i_fc_at(0.0, "closed_loop", True)
    for i in range(1, n + 1):
        cur = i_fc_at(i * hh, "closed_loop", True)
        s += 0.5 * (prev + cur) * hh
        prev = cur
    d_e = abs(V_KW_PER_A * s / 3600.0 - run["scalars"]["E_fc_true_kWh"])
    rec("SC-4-fine-trapz-E", d_e <= 1e-9, d_e, "≤1e-9 kWh", "dt=1e-4 梯形 ∫P_fc vs 解析 E_fc")

    ev = run["events"][0]
    pre = ev["snapshots"][0]
    post = ev["snapshots"][1]
    ok_ev = (pre["t_s"] == T_F and post["t_s"] == T_F and pre["derivation"] == "left_limit"
             and post["derivation"] == "post_sample"
             and pre["variables"]["I_fc_meas_A"] == 50.0 and post["variables"]["I_fc_meas_A"] == 60.0)
    rec("SC-5-event-phase", ok_ev, "pre(I_meas=50.0)/post(I_meas=60.0)@20.0", "pre 50 / post 60", "事件相位")

    ok_grid = True
    for spec in RUNS:
        r = simulate_run(spec)
        tt = r["series"]["t"]
        if any(tt[i] >= tt[i + 1] for i in range(N_SAMPLES - 1)):
            ok_grid = False
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if isinstance(v, float) and not math.isfinite(v):
                    ok_grid = False
    rec("SC-6-grid-finite", ok_grid, "5×601 点", "严格递增 + 有限", "时间网格与有限值")

    # SC-7：批准修复清单数值（G0-DEC-15：SOC 末值含 τ_fc 过渡尾项）
    cl = run["scalars"]
    ok_fix = (abs(cl["SOC_true_end_pct"] - 59.4755556) < 1e-6
              and abs(cl["SOC_est_end_pct"] - 59.5866667) < 1e-6
              and abs(cl["SOC_err_end_pp"] - 0.1111111) < 1e-6)
    rec("SC-7-approved-soc", ok_fix,
        "SOC_true=%.7f SOC_est=%.7f SOC_err=%+.7f" % (
            cl["SOC_true_end_pct"], cl["SOC_est_end_pct"], cl["SOC_err_end_pp"]),
        "59.4755556 / 59.5866667 / +0.1111111", "G0-DEC-15 修复清单数值")

    # SC-8：FCEXT_G2B §1.3 load_step 锚点（+10 kW @20s，60 s 网格，EQ-6 级联子步递推）
    ls = simulate_run("load_step_closed_loop")
    ls_s = ls["series"]
    ls_i60 = ls_s["I_fc_true_A"][-1]
    ls_p60 = ls_s["P_bat_true_kW"][-1]
    ls_max_pbat = max(abs(v) for v in ls_s["P_bat_true_kW"])
    ls_soc_gap = ls_s["SOC_est_pct"][-1] - ls_s["SOC_true_pct"][-1]
    ls_r_max = ls["scalars"]["max_abs_r_true_kW"]
    ok_ls = (abs(ls_i60 - 75.0) <= 0.5 and abs(ls_p60 - 10.0) <= 0.5
             and abs(ls_max_pbat - 20.0) <= 1e-9 and abs(ls_soc_gap) <= 1e-5
             and ls_r_max <= 1e-12)
    rec("SC-8-loadstep-anchors", ok_ls,
        "I_fc(60)=%.9f P_bat(60)=%.9f max|P_bat|=%.7f SOCest-SOCtrue=%.3g max|r_true|=%.3g" % (
            ls_i60, ls_p60, ls_max_pbat, ls_soc_gap, ls_r_max),
        "75.00±0.5 A / 10.00±0.5 kW / 20.00 kW / 0（±1e-5 pp）/ ≤1e-12 kW",
        "FCEXT_G2B v1.1 §1.3 锚点复算（load_step +10kW@20s；intB=0 ⇒ SOC_est−SOC_true=0）")

    # SC-9：FCEXT_G2B §2.3 actuator 锚点（55% @20s，钳位式）+ 全场景硬判据（无 NaN/Inf、SOC∈[0,100]）
    ac = simulate_run("actuator_closed_loop")
    ac_s = ac["series"]
    ac_i60 = ac_s["I_fc_true_A"][-1]
    ac_p60 = ac_s["P_bat_true_kW"][-1]
    ac_max_pbat = max(abs(v) for v in ac_s["P_bat_true_kW"])
    ac_r_max = ac["scalars"]["max_abs_r_true_kW"]
    ok_hard = True
    for spec in RUNS:
        rr = simulate_run(spec)
        for sid in SERIES_IDS:
            for v in rr["series"][sid]:
                if isinstance(v, float) and not math.isfinite(v):
                    ok_hard = False
        for v in rr["series"]["SOC_true_pct"]:
            if not (0.0 <= v <= 100.0):
                ok_hard = False
        for v in rr["series"]["SOC_est_pct"]:
            if v is not None and not (0.0 <= v <= 100.0):
                ok_hard = False
    ok_ac = (abs(ac_i60 - 27.5) <= 0.1 and abs(ac_p60 - 19.0) <= 0.3
             and abs(ac_max_pbat - 19.0) <= 0.3 and ac_r_max <= 1e-12 and ok_hard)
    rec("SC-9-actuator-anchors", ok_ac,
        "I_fc(60)=%.9f P_bat(60)=%.9f max|P_bat|=%.9f max|r_true|=%.3g hard=%s" % (
            ac_i60, ac_p60, ac_max_pbat, ac_r_max, ok_hard),
        "27.50±0.1 A / 19.00±0.3 kW / 19.00 kW / ≤1e-12 kW / 无 NaN/Inf 且 SOC∈[0,100]",
        "FCEXT_G2B v1.1 §2.3 锚点复算（actuator 55%@20s；min(I_fc_ref, I_fc_cap) 钳位，τ_act=1.5 s）")

    # SC-10：级联尾差域声明（≤6e-6）——子步递推 60s 尾差为引擎真实行为（FCEXT §1.1 / V060 §1.2），
    #        非数值误差；连续闭式解（75.0）与实机差 ~5.4e-6，故本 oracle 禁用连续闭式解。
    tail_i = abs(75.0 - ls_s["I_fc_true_A"][-1])
    tail_ref = abs(75.0 - ls_s["I_fc_ref_A"][-1])
    rec("SC-10-cascade-tail-domain", tail_i <= 6e-6 and tail_ref <= 6e-6,
        "|I_fc(60)-75|=%.9f A |I_fc_ref(60)-75|=%.9f A" % (tail_i, tail_ref),
        "≤6e-6 A", "级联尾差域声明（EQ-6 τ_ref=2.5 + τ_fc=1.2 级联子步递推；禁连续闭式解）")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


TOLERANCES = {
    "gate": {
        "E_kWh": 1e-6, "SOC_pp": 1e-5, "I_A_rtol": 1e-12, "I_A_atol": 1e-15,
        "P_kW_rtol": 1e-12, "P_kW_atol": 1e-15, "r_true_kW": 1e-12,
        "r_meas_kW_atol": 1e-9, "t_s": 1e-9,
    },
}


def _fault_block(family):
    if family == FAMILY_SENSOR:
        return {"family": "sensor_drift", "fault_id": "I_fc_sensor_bias",
                "t_start_s": T_F, "bias_A": BIAS_A}
    if family == FAMILY_LOAD:
        return {"family": "load_step", "fault_id": "load_step_10kW",
                "t_start_s": T_F, "magnitude_kW": LOAD_STEP_KW}
    if family == FAMILY_ACT:
        return {"family": "actuator_fault", "fault_id": "valve_stuck",
                "t_start_s": T_F, "magnitude_pct": ACTUATOR_PCT,
                "I_fc_cap_A": I_FC_BASE_A * ACTUATOR_PCT / 100.0}
    return None


def _golden_series(series):
    """golden 序列面：剔除含 null（None）的列——可空信号 I_fc_cap_A 非激活期为 null
    （与引擎 makeSeries 逐值一致），null 列不经 V-07 数值差分（gt001 P_gen_cap_kW
    「入 golden 前剔除」先例，ORACLE_INTERFACE_D2 §1.1）。"""
    out = {}
    for sid in SERIES_IDS:
        arr = series[sid]
        if any(v is None for v in arr):
            continue
        out[sid] = arr
    return out


def build_golden():
    runs = {}
    for spec in RUNS:
        r = simulate_run(spec)
        runs[r["key"]] = {
            "role": r["role"],
            "feedback_mode": r["feedback_mode"],
            "fault": _fault_block(r["family"]),
            "events": r["events"],
            "scalars": r["scalars"],
            "metrics": r["metrics"],
            "series": _golden_series(r["series"]),
        }
    return {
        "golden_schema_version": "v1",
        "golden_id": "fc001_v1",
        "model_id": "FC-001",
        "model_version": MODEL_VERSION,
        "schema_version": "1.0.0",
        "engine_baseline": None,
        "method_id": METHOD_ID,
        "method_version": METHOD_VERSION,
        "units": {"I": "A", "P": "kW", "E": "kWh", "t": "s", "SOC": "%", "SOC_err": "pp"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T_F, "bias_A": BIAS_A,
            "I_fc_ref_A": I_FC_REF_A, "tau_fc_s": TAU_FC_S,
            "tau_ref_s": TAU_REF_S, "tau_act_s": TAU_ACT_S,
            "dt_int_s": DT_INT_S, "sub_int": SUB_INT,
            "load_step_magnitude_kW": LOAD_STEP_KW, "actuator_magnitude_pct": ACTUATOR_PCT,
            "Pload_kW": PLOAD_KW, "Pbat_ref_kW": P_BAT_REF_KW,
            "Ebat_kWh": EBAT_KWH, "SOC0_pct": SOC0_PCT,
            "soc_estimator": "ems_power_balance_estimate (A-fc-soc-est)",
            "feedback_modes": ["closed_loop", "monitor"],
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": I_F, "t_0": 0.0, "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": TOLERANCES,
        "basis": "DECISIONS.md G0-DEC-15 FC-001 修复清单（SOC 末值含 τ_fc 过渡尾项）+ docs/CONTRACT.md §5.2（只读参照）；G2b-lite 记录见 NEXT/evidence/g4/fc001-g2b-lite.md；load_step/actuator 扩展按 NEXT/FCEXT_G2B_SPEC_APPROVED v1.1（CHG-20261104-02 批准）§1/§2 落地（EQ-6 级联子步递推 + actuator 钳位，禁连续闭式解），元数据一次性落齐见其 §4",
        "runs": runs,
        "generated_by": {
            "tool": "tools/oracle/emit_golden.py fc001 + tools/oracle/fc001_oracle.py",
            "python_version": platform.python_version(),
            "command": "python tools/oracle/emit_golden.py fc001",
            "oracle_source_sha256": _oracle_source_sha256(),
            "generated_at": None,
        },
        "approval": {"approved_by": None, "approved_at": None, "approved_golden_sha256": None},
    }


def oracle_source_path():
    return os.path.join(_ORACLE_DIR, "fc001_oracle.py")


def _oracle_source_sha256():
    # V-03 语义（ORACLE_INTERFACE_D2 §2）：本 oracle 源文件自身字节的 SHA-256；
    # 经 oracle_base.oracle_source_sha256 规范实现（emit 侧与 verify 侧同一语义）。
    return oracle_base.oracle_source_sha256(oracle_source_path())


def main(argv):
    if len(argv) >= 2 and argv[1] == "--self-check":
        ok, checks = self_check()
        print(json.dumps({"ok": ok, "checks": checks}, ensure_ascii=False, indent=2))
        return 0 if ok else 2
    print(json.dumps(build_golden(), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
