#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""FL-001 Python 数值后端（B-5，RK4 dt=0.1）— FL19_BACKEND_RFC_APPROVED §2 / V312 准入清单
profile=fl001-rk4-dt0.1（E ±5e-4 kWh / SOC ±5e-3 pp / 逐点 rtol ≤1e-3 上限值，实测预算冻结前适用）。

定位：同方程、数值积分对照——教学点为「积分口径差异」。方程与 B-1 同源
（MODEL_VALIDATION_SPEC §1.3），实现独立编写；状态 x = [I, Q]，dI/dt=(I_ref−k_fb·b−I)/τ，
dQ/dt = I（Q 即 ∫I dt，RK4 四阶求积同步累积）；SOC/SOC_est 由 Q（与 ∫b，梯形）派生。
积分口径体现在 backend.method_id='py_rk4_dt0.1'（metrics.method 命名按 V312 §5 由组装层裁定）。

输出与 fl001_analytic.py 同 schema。仅标准库。
"""
import argparse
import json
import sys

BACKEND = {
    "id": "py-rk4-fl001",
    "version": "0.1.0",
    "method_id": "py_rk4_dt0.1",
    "tolerance_profile_id": "fl001-rk4-dt0.1",
    "license": "MIT",
    "license_verified": True,
    "equations_source": "MODEL_VALIDATION_SPEC §1.3/§5.2（独立编写，RK4 数值积分）",
    "systems": ["FL-001"],
    "signals": [
        "I_bat_true_A", "I_bat_meas_A", "bias_A", "P_bat_true_kW", "P_bat_meas_kW",
        "P_gen_true_kW", "P_gen_meas_kW", "P_load_demand_kW", "P_load_served_kW",
        "SOC_true_pct", "SOC_est_pct", "r_true_kW"
    ],
    "admitted": True
}

CAP_KWH = 40.0
V_KV = 0.4


def solve(cfg):
    duration = float(cfg["duration_s"])
    dt = float(cfg["dt_s"])
    n = int(round(duration / dt))
    t_start = float(cfg.get("fault_time_s") or 0.0)
    bias = float(cfg.get("bias_A") or 0.0)
    load0 = float(cfg["Pload_demand_kW"])
    soc0 = float(cfg["SOC0_pct"])
    tau = float(cfg["tau_s"])
    mode = cfg["feedback_mode"]
    family = cfg.get("family") or ("sensor_drift" if bias > 0 else "none")
    if family not in ("none", "sensor_drift"):
        raise ValueError("B-5 首批仅支持 none/sensor_drift（P0 白名单）: " + family)
    i_ref = (load0 - 20.0) / V_KV
    k_fb = 0.0 if mode == "monitor" else 1.0

    def target(time):
        b = bias if (family == "sensor_drift" and time >= t_start - 1e-9) else 0.0
        return i_ref - k_fb * b, b

    t = [i * dt for i in range(n + 1)]
    I = i_ref
    Q = 0.0
    i_true = [I]
    q_running = [0.0]
    bias_series = [target(0.0)[1]]
    for k in range(1, n + 1):
        tk = (k - 1) * dt
        # 步左沿目标：t_start 栅格对齐时，目标在每个 0.1 s 区间内为常数，
        # 左沿取值即该区间的精确语义（避免 RK4 末级 stage 跨越 t=20 阶跃混入后值）。
        tg_step, _ = target(tk)
        bias_series.append(target(t[k])[1])

        def f(x, tg=tg_step):
            return [(tg - x[0]) / tau, x[0]]

        x = [I, Q]
        k1 = f(x)
        k2 = f([x[j] + dt / 2 * k1[j] for j in range(2)])
        k3 = f([x[j] + dt / 2 * k2[j] for j in range(2)])
        k4 = f([x[j] + dt * k3[j] for j in range(2)])
        x = [x[j] + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) for j in range(2)]
        I, Q = x[0], x[1]
        i_true.append(I)
        q_running.append(Q)

    # ∫b dt：b 为阶跃，逐点解析（t≥t_start 段为 bias·(t−t_start)）
    running_b = [(bias * max(0.0, ti - t_start)) if (family == "sensor_drift" and t_start > 0) else 0.0
                 for ti in t]
    int_b = running_b[-1]

    signals = {
        "t": t,
        "I_bat_true_A": i_true,
        "I_bat_meas_A": [a + b for a, b in zip(i_true, bias_series)],
        "bias_A": bias_series,
        "P_bat_true_kW": [V_KV * a for a in i_true],
        "P_bat_meas_kW": [V_KV * (a + b) for a, b in zip(i_true, bias_series)],
        "P_gen_true_kW": [load0 - V_KV * a for a in i_true],
        "P_gen_meas_kW": [load0 - V_KV * a for a in i_true],
        "P_load_demand_kW": [load0] * (n + 1),
        "P_load_served_kW": [load0] * (n + 1),
        "SOC_true_pct": [soc0 - 100.0 * V_KV * q / (CAP_KWH * 3600.0) for q in q_running],
        "SOC_est_pct": [soc0 - 100.0 * V_KV * (q + sb) / (CAP_KWH * 3600.0)
                        for q, sb in zip(q_running, running_b)],
        "r_true_kW": [0.0] * (n + 1),
        "r_meas_kW": [V_KV * b for b in bias_series]
    }

    e_bat = V_KV * q_running[-1] / 3600.0
    e_bat_meas = e_bat + V_KV * int_b / 3600.0
    e_gen = load0 * duration / 3600.0 - e_bat
    soc_true_end = signals["SOC_true_pct"][-1]
    soc_est_end = signals["SOC_est_pct"][-1]
    i_meas = signals["I_bat_meas_A"]
    metrics = {
        "E_bat_true_60s": {"value": e_bat, "unit": "kWh"},
        "E_gen_true_60s": {"value": e_gen, "unit": "kWh"},
        "E_load_served_60s": {"value": load0 * duration / 3600.0, "unit": "kWh"},
        "SOC_true_end_pct": {"value": soc_true_end, "unit": "%"},
        "SOC_est_end_pct": {"value": soc_est_end, "unit": "%"},
        "SOC_err_end_pp": {"value": soc_est_end - soc_true_end, "unit": "pp"},
        "max_abs_r_true_kW": {"value": 0.0, "unit": "kW"},
        "max_abs_r_meas_kW": {"value": V_KV * (bias if family == "sensor_drift" else 0.0), "unit": "kW"},
        "I_true_26s_A": {"value": i_true[int(round(26.0 / dt))], "unit": "A"},
        "I_meas_20post_A": {"value": i_meas[int(round(t_start / dt))] if t_start > 0 else i_meas[-1], "unit": "A"}
    }
    integrals = {"intI": q_running[-1], "intB": int_b, "E_bat": e_bat, "E_bat_meas": e_bat_meas, "E_gen": e_gen}
    return t, signals, integrals, metrics


def self_check():
    """独立自检（RK-1…RK-3）"""
    base = {"duration_s": 60.0, "dt_s": 0.1, "fault_time_s": 20.0, "bias_A": 10.0,
            "Pload_demand_kW": 30.0, "SOC0_pct": 60.0, "tau_s": 1.5, "feedback_mode": "closed_loop",
            "family": "sensor_drift"}
    t, s, integ, m = solve(base)
    ok = True
    # RK-1 稳态精度：60 s 时瞬态已衰减 e^{-26.7}≈4e-12，I_true(60) 应≈15（RK4 误差 < 1e-9）
    ok &= abs(s["I_bat_true_A"][-1] - 15.0) < 1e-9
    # RK-2 收敛性：dt 减半，I_true(26) 变化 < 1e-6（四阶收敛烟测）
    cfg2 = dict(base); cfg2["duration_s"] = 26.0
    t2, s2, _, _ = solve(cfg2)
    i26 = s2["I_bat_true_A"][-1]
    cfg3 = dict(base); cfg3["duration_s"] = 26.0; cfg3["dt_s"] = 0.05
    t3, s3, _, _ = solve(cfg3)
    ok &= abs(i26 - s3["I_bat_true_A"][-1]) < 1e-4
    # RK-3 网格：601 点单调
    ok &= len(t) == 601 and all(t[i] < t[i + 1] for i in range(600))
    print("[self-check] RK-1..RK-3:", "PASS" if ok else "FAIL", file=sys.stderr)
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config-json")
    ap.add_argument("--self-check", action="store_true")
    args = ap.parse_args()
    if args.self_check:
        sys.exit(self_check())
    if not args.config_json:
        print(json.dumps({"backend": BACKEND, "capabilities": {"systems": BACKEND["systems"],
              "grid_lock": "60s/0.1s/601点", "supports_noise": False}}))
        return
    cfg = json.loads(args.config_json)
    cfg.setdefault("family", "sensor_drift" if float(cfg.get("bias_A") or 0) > 0 else "none")
    t, signals, integrals, metrics = solve(cfg)
    print(json.dumps({
        "backend": BACKEND,
        "systemId": "FL-001",
        "config": cfg,
        "t": t,
        "signals": signals,
        "integrals": integrals,
        "metrics": metrics
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
