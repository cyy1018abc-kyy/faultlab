# -*- coding: utf-8 -*-
"""gt001_oracle.py — GT-001 独立数值 oracle（V3-31 / G2b v1.1 §8 / CHG-20261030-06 批准口径）。

独立性声明：
  1. 不 import src/**（引擎 JS）；按 GT001_G2B_SPEC_APPROVED §3/§4/§8 的规范更新序独立编写；
  2. 不共享 FL-001 oracle 的公式常量模块（本文件自含）；
  3. 自检独立（GS-1…GS-6，不复用 SC 条目）；
  4. golden 由本 oracle 只读生成，engine 只读比对（G0-DEC-16）。

更新序（G2b v1.1 §8 冻结——逐算子复刻引擎 simulateGT001，每子步 dt=0.01）：
  pBat     = P_BAT_REF − K_BAT·(f − 50)
  residual = P_gen + pBat − demand                      # 用更新前 P_gen
  fGov     = f            （monitor ∧ sensor_drift）
           = f + b        （其余）
  cmdNext  = clamp(P_gen_cmd + KI·(50 − fGov)·dt, 0, 40)
  P_gen    = foStep(P_gen, cmdNext, τ_g, dt)            # 精确指数
  if actuator ∧ t ≥ t_start: P_gen = min(P_gen, P_GEN_CAP)
  f       += residual / K_J·dt                          # 前向 Euler，residual 用更新前值
  梯形积分（P_gen/P_bat）与左矩形残差累积随子步推进。

容差定案（§8 v1.1）：oracle 逐算子复刻引擎更新序 → gate f_Hz ±1e-9；
若实测跨实现散差超限，按方法等价 ~1e-4 Hz 重定并登记（G2b 评审预案）。

仅标准库；无网络。
"""
import argparse
import datetime
import hashlib
import json
import math
import os
import platform
import sys

# ---- 常量（与引擎 simulateGT001 一致；G2b v1.1 §4 冻结）----
KJ = 5.0
K_BAT = 24.0
P_BAT_REF = 5.0
KI = 2.0
TAU_G = 2.0
CAP_KWH = 40.0
DT_INT = 0.01
SUB = 10
DT_S = 0.1
DURATION_S = 60.0
N_SAMPLES = 601
F0 = 50.0

METHOD_ID = "gt001_euler_dt0.01"
GOLDEN_ID = "gt001_v1"

T_START = 20.0

RUNS = [
    {"key": "healthy", "role": "baseline", "feedback_mode": "closed_loop",
     "family": "none", "faulted": False, "magnitude": 0.0, "unit": ""},
    {"key": "closed_loop_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": "sensor_drift", "faulted": True, "magnitude": 0.3, "unit": "Hz"},
    {"key": "monitor_only", "role": "monitor", "feedback_mode": "monitor",
     "family": "sensor_drift", "faulted": True, "magnitude": 0.3, "unit": "Hz"},
    {"key": "load_step", "role": "fault", "feedback_mode": "closed_loop",
     "family": "load_step", "faulted": True, "magnitude": 10.0, "unit": "kW"},
    {"key": "actuator_fault", "role": "fault", "feedback_mode": "closed_loop",
     "family": "actuator_fault", "faulted": True, "magnitude": 50.0, "unit": "%"},
    {"key": "actuator_clear", "role": "fault", "feedback_mode": "closed_loop",
     "family": "actuator_fault", "faulted": True, "magnitude": 50.0, "unit": "%",
     "t_clear_s": 35.0},
]


def _oracle_source_sha256():
    path = os.path.abspath(__file__)
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def js_clamp(v, lo, hi):
    """与引擎 clamp(v, lo, hi) 同序：v<lo→lo；v>hi→hi。"""
    return lo if v < lo else (hi if v > hi else v)


def fo_step(y, target, tau, dt):
    """与引擎 foStep 同式：精确指数 + 区间解析积分。"""
    ratio = dt / tau
    a = 0.0 if ratio > 40 else math.exp(-ratio)
    return target + (y - target) * a, target * dt + (y - target) * tau * (1 - a)


def build_time_grid():
    """t[i] = i·dt（IEEE-754 积原值，禁止累加）。"""
    return [i * DT_S for i in range(N_SAMPLES)]


def simulate_run(spec):
    """按规范更新序仿真一轮；输出 series/integrals/metrics/scalars/events。"""
    family = spec["family"]
    faulted = spec["faulted"]
    monitor = spec["feedback_mode"] == "monitor"
    magnitude = spec["magnitude"] if faulted else 0.0
    unit = spec["unit"]
    t_start = T_START if faulted else None
    load0 = 30.0
    soc0 = 60.0
    is_sensor = family == "sensor_drift"
    is_load = family == "load_step"
    is_act = family == "actuator_fault"
    p_gen_cap = 40.0 * magnitude / 100.0 if is_act else None
    t_clear = spec.get("t_clear_s") if is_act else None

    def b_at(time):
        return magnitude if (is_sensor and t_start is not None and time >= t_start - 1e-9) else 0.0

    def demand_at(time):
        return (load0 + magnitude) if (is_load and t_start is not None and time >= t_start - 1e-9) else load0

    t = build_time_grid()
    n = N_SAMPLES - 1
    series = {k: [None] * (n + 1) for k in (
        "f_true_Hz", "f_meas_Hz", "n_meas_rpm", "P_gen_true_kW", "P_gen_meas_kW", "P_gen_cmd_kW",
        "P_bat_true_kW", "P_bat_meas_kW", "P_load_demand_kW", "P_load_served_kW", "P_rotor_kW",
        "V_bus_V", "SOC_true_pct", "SOC_est_pct", "r_true_kW", "f_channel_diff_Hz",
        "valve_cmd_pct", "valve_meas_pct", "P_gen_cap_kW")}

    f = 50.0
    p_gen = 25.0
    p_gen_cmd = 25.0
    int_pbat = 0.0
    int_pgen = 0.0
    int_demand = 0.0
    int_residual = 0.0

    def record(k):
        time = t[k]
        b = b_at(time)
        demand = demand_at(time)
        p_bat = P_BAT_REF - K_BAT * (f - 50.0)
        p_rotor = p_gen + p_bat - demand
        series["f_true_Hz"][k] = f
        series["f_meas_Hz"][k] = f
        series["n_meas_rpm"][k] = 60.0 * (f + b)
        series["P_gen_true_kW"][k] = p_gen
        series["P_gen_meas_kW"][k] = p_gen
        series["P_gen_cmd_kW"][k] = p_gen_cmd
        series["P_bat_true_kW"][k] = p_bat
        series["P_bat_meas_kW"][k] = p_bat
        series["P_load_demand_kW"][k] = demand
        series["P_load_served_kW"][k] = demand
        series["P_rotor_kW"][k] = p_rotor
        series["V_bus_V"][k] = 400.0
        series["SOC_true_pct"][k] = soc0 - int_pbat / (CAP_KWH * 3600.0) * 100.0
        series["SOC_est_pct"][k] = soc0 - int_pbat / (CAP_KWH * 3600.0) * 100.0
        series["r_true_kW"][k] = p_gen + p_bat - demand - p_rotor
        series["f_channel_diff_Hz"][k] = series["n_meas_rpm"][k] / 60.0 - series["f_meas_Hz"][k]
        series["valve_cmd_pct"][k] = js_clamp(p_gen_cmd / 40.0 * 100.0, 0.0, 100.0)
        capped = is_act and time >= t_start - 1e-9 and not (t_clear is not None and time >= t_clear - 1e-9)
        series["valve_meas_pct"][k] = magnitude if capped else series["valve_cmd_pct"][k]
        series["P_gen_cap_kW"][k] = p_gen_cap if capped else None

    record(0)
    for k in range(1, n + 1):
        for j in range(SUB):
            time = (k - 1) * SUB * DT_INT + j * DT_INT
            b = b_at(time)
            demand = demand_at(time)
            p_bat = P_BAT_REF - K_BAT * (f - 50.0)
            residual = p_gen + p_bat - demand

            f_gov = f if (monitor and is_sensor) else f + b
            cmd_next = js_clamp(p_gen_cmd + KI * (50.0 - f_gov) * DT_INT, 0.0, 40.0)
            y, _ = fo_step(p_gen, cmd_next, TAU_G, DT_INT)
            gen_before = p_gen
            p_gen = y
            cap_active = is_act and t_start is not None and time >= t_start - 1e-9 and not (
                t_clear is not None and time >= t_clear - 1e-9)
            if cap_active:
                p_gen = min(p_gen, p_gen_cap)

            f += residual / KJ * DT_INT

            p_bat_end = P_BAT_REF - K_BAT * (f - 50.0)
            int_pgen += 0.5 * (gen_before + p_gen) * DT_INT
            int_pbat += 0.5 * (p_bat + p_bat_end) * DT_INT
            int_demand += demand * DT_INT
            int_residual += residual * DT_INT
            p_gen_cmd = cmd_next
        record(k)

    integrals = {
        "E_load": int_demand,
        "E_source": int_pgen,
        "E_bat": int_pbat,
        "E_rotor": KJ * (f - 50.0),
        "intResidual": int_residual,
    }

    # ---- 指标（与引擎 metrics.js 同名子集；E 用积分/3600）----
    soc_true_end = series["SOC_true_pct"][-1]
    soc_est_end = series["SOC_est_pct"][-1]
    max_r_true = max(abs(v) for v in series["r_true_kW"])
    max_fd = max(abs(v) for v in series["f_channel_diff_Hz"])
    metrics = {
        "E_load_kWh": {"value": integrals["E_load"] / 3600.0, "unit": "kWh", "method": METHOD_ID},
        "E_source_kWh": {"value": integrals["E_source"] / 3600.0, "unit": "kWh", "method": METHOD_ID},
        "E_bat_kWh": {"value": integrals["E_bat"] / 3600.0, "unit": "kWh", "method": METHOD_ID},
        "E_rotor_kWh": {"value": integrals["E_rotor"] / 3600.0, "unit": "kWh", "method": METHOD_ID},
        "SOC_true_end_pct": {"value": soc_true_end, "unit": "%", "method": METHOD_ID},
        "SOC_est_end_pct": {"value": soc_est_end, "unit": "%", "method": METHOD_ID},
        "SOC_err_pp": {"value": soc_est_end - soc_true_end, "unit": "pp", "method": METHOD_ID},
        "max_abs_r_true_kW": {"value": max_r_true, "unit": "kW", "method": "algebraic"},
        "max_abs_f_channel_diff_Hz": {"value": max_fd, "unit": "Hz", "method": "algebraic"},
    }
    if is_load:
        metrics["f_nadir_Hz"] = {"value": min(series["f_true_Hz"][int(round(t_start / DT_S)):]),
                                 "unit": "Hz", "method": METHOD_ID}

    scalars = {
        "E_source_kWh": integrals["E_source"] / 3600.0,
        "E_bat_kWh": integrals["E_bat"] / 3600.0,
        "E_load_kWh": integrals["E_load"] / 3600.0,
        "E_rotor_kWh": integrals["E_rotor"] / 3600.0,
        "SOC_true_end_pct": soc_true_end,
        "SOC_est_end_pct": soc_est_end,
        "SOC_err_end_pp": soc_est_end - soc_true_end,
    }

    events = []
    if faulted:
        event_type = {"sensor_drift": "sensor_bias", "load_step": "load_step",
                      "actuator_fault": "actuator_limit"}[family]
        target_signal = {"sensor_drift": "n_meas_rpm", "load_step": "P_load_demand_kW",
                         "actuator_fault": "P_gen_cap_kW"}[family]
        i_pre = int(round((t_start - DT_S) / DT_S))
        i_post = int(round(t_start / DT_S))

        def vars_at(idx):
            return {
                "f_true_Hz": series["f_true_Hz"][idx],
                "f_meas_Hz": series["f_meas_Hz"][idx],
                "n_meas_rpm": series["n_meas_rpm"][idx],
                "f_channel_diff_Hz": series["f_channel_diff_Hz"][idx],
            }

        units = {"f_true_Hz": "Hz", "f_meas_Hz": "Hz", "n_meas_rpm": "rpm", "f_channel_diff_Hz": "Hz"}
        events.append({
            "event_id": "EV-001",
            "event_type": event_type,
            "trigger_s": t_start,
            "target_signal": target_signal,
            "magnitude": magnitude,
            "unit": unit,
            "snapshots": [
                {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
                 "t_s": t_start, "derivation": "left_limit",
                 "variables": vars_at(i_pre), "units": units, "fault_id": spec.get("fault_id")},
                {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
                 "t_s": t_start, "derivation": "post_sample",
                 "variables": vars_at(i_post), "units": units, "fault_id": spec.get("fault_id")},
            ],
        })
        if spec.get("t_clear_s"):
            tc = spec["t_clear_s"]
            i_tc = int(round(tc / DT_S))

            def vars_tc(idx):
                return {
                    "f_true_Hz": series["f_true_Hz"][idx],
                    "f_meas_Hz": series["f_meas_Hz"][idx],
                    "n_meas_rpm": series["n_meas_rpm"][idx],
                    "f_channel_diff_Hz": series["f_channel_diff_Hz"][idx],
                    "P_gen_true_kW": series["P_gen_true_kW"][idx],
                }

            events.append({
                "event_id": "EV-002",
                "event_type": "actuator_clear",
                "trigger_s": tc,
                "target_signal": "P_gen_cap_kW",
                "magnitude": 0.0,
                "unit": "kW",
                "snapshots": [
                    {"snapshot_id": "EV-002-pre", "event_id": "EV-001", "phase": "pre",
                     "t_s": tc, "derivation": "left_limit",
                     "variables": vars_tc(i_tc - 1), "units": units, "fault_id": None},
                    {"snapshot_id": "EV-002-post", "event_id": "EV-001", "phase": "post",
                     "t_s": tc, "derivation": "post_sample",
                     "variables": vars_tc(i_tc), "units": units, "fault_id": None},
                ],
            })

    return {"series": series, "integrals": integrals, "metrics": metrics,
            "scalars": scalars, "events": events}


def self_check():
    """独立自检 GS-1…GS-6（不复用 FL-001 oracle 的 SC 条目）。"""
    checks = []

    def rec(cid, ok, observed, tolerance, note):
        checks.append({"check_id": cid, "status": "pass" if ok else "fail",
                       "observed": observed, "tolerance": tolerance, "note": note})
        return ok

    spec_sensor = RUNS[1]
    fresh = simulate_run(spec_sensor)
    f_end = fresh["series"]["f_true_Hz"][-1]

    # GS-1 线性化能量恒等（含截断残差项；v1.1 §3）：
    #   ΔE_kin − E_lin − K_J·Δf²/(2f₀) ≡ 0（E_lin = ∫P_rotor 左矩形 = K_J·Δf 精确 telescoping）
    df = f_end - 50.0
    d_ekin = (KJ * F0 / 2.0) * ((f_end / F0) ** 2 - 1.0)
    e_rotor_kws = fresh["integrals"]["E_rotor"]
    trunc = KJ * df * df / (2.0 * F0)
    resid = abs(d_ekin - e_rotor_kws - trunc)
    ok1 = resid <= 1e-9
    rec("GS-1-linearized-energy-identity", ok1, resid, 1e-9,
        "ΔE_kin − ∫P_rotor(左矩形) − K_J·Δf²/(2f₀)（代数恒等回归，非物理验证）")

    # GS-2 钳位边界：actuator 50% 时指令 wound-up 至 40 kW（钳位生效证据）
    fresh_act = simulate_run(RUNS[4])
    cmd_end = fresh_act["series"]["P_gen_cmd_kW"][-1]
    ok2 = abs(cmd_end - 40.0) < 1e-9 and abs(fresh_act["series"]["P_gen_true_kW"][-1] - 20.0) < 1e-9
    rec("GS-2-antiwindup-clamp", ok2, cmd_end, 40.0,
        "actuator 50%：指令钳位至 40 kW（wound-up）且 P_gen 钳在 20 kW")

    # GS-3 通道差定义：sensor_drift 时 f_channel_diff ≡ b（无噪声口径）
    fd = fresh["series"]["f_channel_diff_Hz"]
    ok3 = all(abs(v - 0.3) <= 1e-9 for v in fd[int(round(T_START / DT_S)):])
    rec("GS-3-channel-diff-equals-bias", ok3, max(abs(v - 0.3) for v in fd[200:]), 1e-9,
        "故障段 f_channel_diff = b(t) = +0.3 Hz（n_meas/60 − f_meas 恒等）")

    # GS-4 网格：601 点单调、t[i]=i·0.1
    t = build_time_grid()
    ok4 = (len(t) == 601 and all(t[i] < t[i + 1] for i in range(600))
           and all(abs(t[i] - i * DT_S) <= 1e-12 for i in range(601)))
    rec("GS-4-grid", ok4, len(t), 601, "601 点、单调、t[i]=i·dt")

    # GS-5 验收锚点（G2b v1.1 §4，独立复算值）：nadir / f(60) / sensor_drift f(60)
    fresh_load = simulate_run(RUNS[3])
    nadir = min(fresh_load["series"]["f_true_Hz"][int(round(T_START / DT_S)):])
    f60_load = fresh_load["series"]["f_true_Hz"][-1]
    ok5 = (abs(nadir - (50.0 - 0.4105)) <= 0.01 and abs(f60_load - 49.992) <= 0.01
           and abs(f_end - 49.7055) <= 0.005)
    rec("GS-5-anchors", ok5,
        "nadir=%.4f f60_load=%.4f f60_sensor=%.4f" % (nadir, f60_load, f_end),
        "±0.01/±0.01/±0.005 Hz", "load_step nadir −0.4105@21.1 s、f(60)=49.992、sensor_drift 49.7055")

    # GS-7 清除恢复（G2b v1.1 §9 扩展轮）：t_clear=35 后钳位释放——
    #   如实测得指令 wound-up → P_gen 过冲 → 频率上摆；恢复锚点由本 oracle 实测后冻结进规格 §9 追记。
    fresh_clr = simulate_run(RUNS[5])
    f_arr_c = fresh_clr["series"]["f_true_Hz"][int(round(35.0 / DT_S)):]
    overshoot = max(f_arr_c) - 50.0
    t_back05 = None
    for idx, fv in enumerate(f_arr_c):
        if abs(fv - 50.0) <= 0.05:
            t_back05 = 35.0 + idx * DT_S
            break
    ok7 = overshoot > 0.05 and t_back05 is not None
    rec("GS-7-clear-recovery", ok7,
        "过冲 +%.3f Hz，回 |Δf|≤0.05 @ %.1f s" % (overshoot, t_back05 if t_back05 else -1),
        "过冲 >0.05 Hz 且可恢复", "钳位式抗饱和的清除瞬态（方案 a 如实声明）")

    # GS-6 健康局：f ≡ 50、通道差 ≡ 0、r_true ≡ 0
    fresh_h = simulate_run(RUNS[0])
    ok6 = (all(v == 50.0 for v in fresh_h["series"]["f_true_Hz"])
           and all(v == 0.0 for v in fresh_h["series"]["f_channel_diff_Hz"])
           and all(v == 0.0 for v in fresh_h["series"]["r_true_kW"]))
    rec("GS-6-healthy-invariants", ok6, 0.0, 0.0, "健康基准：f≡50、通道差≡0、r_true≡0（定义恒等）")

    all_ok = all(c["status"] == "pass" for c in checks)
    return all_ok, checks


def build_golden():
    """golden 结构对齐 fl001_v1（G2b v1.1 §8 字段面清单）；approval 摘要同 fl001 约定。"""
    runs = {}
    for spec in RUNS:
        fresh = simulate_run(spec)
        runs[spec["key"]] = {
            "role": spec["role"],
            "feedback_mode": spec["feedback_mode"],
            "fault": {"family": spec["family"], "fault_id": spec.get("fault_id"),
                      "t_start_s": T_START if spec["faulted"] else None,
                      "bias_A": spec["magnitude"] if spec["family"] == "sensor_drift" else None},
            "events": fresh["events"],
            "scalars": fresh["scalars"],
            "metrics": fresh["metrics"],
            "series": {k: v for k, v in fresh["series"].items() if k != "P_gen_cap_kW"},
            "series_note": "P_gen_cap_kW 为事件域信号（非空仅 actuator 故障段），经事件快照承载，不入序列比对面",
        }
    golden = {
        "golden_schema_version": "v1",
        "golden_id": GOLDEN_ID,
        "model_id": "GT-001",
        "model_version": "1.0.0",
        "schema_version": "1.0.0",
        "engine_baseline": None,
        "method_id": METHOD_ID,
        "method_version": "1",
        "units": {"I": "A", "P": "kW", "E": "kWh", "t": "s", "SOC": "%", "SOC_err": "pp",
                  "f": "Hz", "n": "rpm"},
        "config": {"duration_s": 60.0, "dt_s": 0.1, "fault_time_s": 20.0,
                   "bias_A": 0.3, "Vdc_V": 400.0, "Pload_demand_kW": 30.0,
                   "Ebat_nominal_kWh": 40.0, "SOC0_pct": 60.0,
                   "K_J": KJ, "K_bat": K_BAT, "Ki": KI, "tau_g": TAU_G,
                   "feedback_modes": ["closed_loop", "monitor"],
                   "note": "输出网格 dt=0.1/601 点；Euler 积分子步 0.01（G2b v1.1 §4 口径澄清）"},
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": 200, "t_0": 0.0, "t_end": 60.0},
        "event_encoding_version": 1,
        "tolerances": {
            "gate": {"E_kWh": 1e-6, "SOC_pp": 1e-5, "I_A_rtol": 1e-12, "I_A_atol": 1e-15,
                     "P_kW_rtol": 1e-12, "P_kW_atol": 1e-15, "r_true_kW": 1e-9,
                     "f_Hz_atol": 1e-9, "n_rpm_atol": 1e-9, "t_s": 1e-9}
        },
        "runs": runs,
        "metrics_note": "golden 指标为独立可算子集（能量/SOC/极值/锚点）；引擎其余派生指标"
                        "（fault_*、effective_mode、focal_change、f_recovery_s）不在比对面",
    }
    return golden


def _approval_digest(golden):
    import copy
    payload = copy.deepcopy(golden)
    payload.pop("generated_by", None)
    payload.pop("approval", None)
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")).hexdigest()


def emit(golden_path):
    golden = build_golden()
    golden["generated_by"] = {
        "tool": "gt001_oracle.py",
        "python_version": platform.python_version(),
        "command": "python tools/oracle/gt001_oracle.py --emit",
        "oracle_source_sha256": _oracle_source_sha256(),
        "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
    }
    golden["approval"] = {
        "approved_by": "user（G2b 批准 CHG-20261030-06；V3-31 开工指令 2026-10-30）",
        "approved_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "approved_golden_sha256": _approval_digest(golden),
    }
    os.makedirs(os.path.dirname(golden_path), exist_ok=True)
    with open(golden_path, "w", encoding="utf-8") as f:
        json.dump(golden, f, ensure_ascii=False, indent=2)
    with open(golden_path + ".sha256", "w", encoding="utf-8") as f:
        digest = hashlib.sha256(open(golden_path, "rb").read()).hexdigest()
        f.write(digest + "  " + os.path.basename(golden_path) + "\n")
    return golden_path


def main(argv):
    if "--self-check" in argv:
        ok, checks = self_check()
        print(json.dumps({"ok": ok, "checks": checks}, ensure_ascii=False, indent=2))
        return 0 if ok else 2
    if "--emit" in argv:
        ok, checks = self_check()
        if not ok:
            print(json.dumps({"ok": False, "checks": checks}, ensure_ascii=False, indent=2))
            return 2
        path = emit(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__)))), "data", "golden", "gt001_v1.json"))
        print(json.dumps({"ok": True, "written": path,
                          "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest()}, ensure_ascii=False))
        return 0
    if "--print-json" in argv:
        print(json.dumps(simulate_run(RUNS[1])["metrics"], ensure_ascii=False, indent=2))
        return 0
    print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
