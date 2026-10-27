#!/usr/bin/env python3
"""FaultLab independent analytic oracle — FL-001 golden values.

Computes the closed-form behaviour-level model from the product spec using
Python only (no JS engine involved), prints golden samples and energy/SOC
integrals, and optionally writes tests/golden_fl001.json.

This is the "independent numerical oracle" required to avoid self-assertion:
the JS engine must match these values within tolerance.

Usage:
    python tools/oracle.py             # print golden table
    python tools/oracle.py --json      # write tests/golden_fl001.json
"""
from __future__ import annotations

import argparse
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DT = 0.1
DURATION = 60.0
TAU = 1.5
I_REF = 25.0
V_KV = 0.4           # P_kW = 0.4 * I_A
P_LOAD = 30.0
SOC0 = 60.0
E_NOM = 40.0         # kWh
T_FAULT = 20.0
BIAS = 10.0


def i_true(t: float, bias: float = BIAS) -> float:
    if t < T_FAULT:
        return I_REF
    return I_REF - bias + bias * math.exp(-(t - T_FAULT) / TAU)


def i_meas(t: float, bias: float = BIAS) -> float:
    return i_true(t, bias) + (bias if t >= T_FAULT else 0.0)


def integrate(signal, t0: float = 0.0, t1: float = DURATION) -> float:
    """Trapezoidal integral on the 0.1 s grid (matches spec sampling)."""
    n = int(round((t1 - t0) / DT))
    acc = 0.0
    prev = signal(t0)
    for k in range(1, n + 1):
        t = t0 + k * DT
        cur = signal(t)
        acc += (prev + cur) * 0.5 * DT
        prev = cur
    return acc


def scenario(feedback_mode: str):
    """Return dict of end-of-run metrics for closed_loop / monitor / healthy."""
    bias = BIAS if feedback_mode != "healthy" else 0.0
    if feedback_mode == "monitor":
        it = lambda t: I_REF
        im = lambda t: I_REF + (bias if t >= T_FAULT else 0.0)
    else:
        it = lambda t: i_true(t, bias)
        im = lambda t: i_meas(t, bias)
    p_bat = lambda t: V_KV * it(t)
    p_bat_meas = lambda t: V_KV * im(t)
    e_bat = integrate(p_bat) / 3600.0
    e_bat_meas = integrate(p_bat_meas) / 3600.0
    e_load = P_LOAD * DURATION / 3600.0
    e_gen = e_load - e_bat
    soc_true = SOC0 - e_bat / E_NOM * 100.0
    soc_est = SOC0 - e_bat_meas / E_NOM * 100.0
    r_meas_max = max(abs(P_LOAD - p_bat(t) + p_bat_meas(t) - P_LOAD) for t in [20.0, 21.5, 26.0, 40.0, 60.0])
    return {
        "mode": feedback_mode,
        "samples": {
            "19.9": {"I_true_A": it(19.9), "I_meas_A": im(19.9), "P_bat_true_kW": p_bat(19.9), "r_meas_kW": 0.0},
            "20.0": {"I_true_A": it(20.0), "I_meas_A": im(20.0), "P_bat_true_kW": p_bat(20.0),
                     "r_meas_kW": P_LOAD - p_bat(20.0) + p_bat_meas(20.0) - P_LOAD},
            "21.5": {"I_true_A": it(21.5), "I_meas_A": im(21.5), "P_bat_true_kW": p_bat(21.5),
                     "P_gen_true_kW": P_LOAD - p_bat(21.5), "r_meas_kW": p_bat_meas(21.5) - p_bat(21.5)},
            "26.0": {"I_true_A": it(26.0), "I_meas_A": im(26.0), "P_bat_true_kW": p_bat(26.0),
                     "P_gen_true_kW": P_LOAD - p_bat(26.0), "r_meas_kW": p_bat_meas(26.0) - p_bat(26.0)},
            "60.0": {"I_true_A": it(60.0), "I_meas_A": im(60.0), "P_bat_true_kW": p_bat(60.0)},
        },
        "energy_kWh": {
            "E_bat": e_bat,
            "E_bat_meas": e_bat_meas,
            "E_gen": e_gen,
            "E_load": e_load,
        },
        "soc_pct": {"SOC_true_end": soc_true, "SOC_est_end": soc_est, "SOC_err_pp": soc_est - soc_true},
        "max_abs_r_meas_kW": r_meas_max,
    }


def exact_scenario(feedback_mode: str):
    """Closed-form end-of-run values (exact integrals, no grid error)."""
    decay = 1.0 - math.exp(-(DURATION - T_FAULT) / TAU)   # 1 - e^(-40/1.5)
    if feedback_mode == "healthy":
        e_bat = V_KV * I_REF * DURATION / 3600.0
        e_bat_meas = e_bat
    elif feedback_mode == "closed_loop":
        # 0-20s: 25 A; 20-60s: 15 + 10*exp(-(t-20)/1.5)
        integral_true = I_REF * T_FAULT + (I_REF - BIAS) * (DURATION - T_FAULT) + BIAS * TAU * decay
        integral_meas = integral_true + BIAS * (DURATION - T_FAULT)
        e_bat = V_KV * integral_true / 3600.0
        e_bat_meas = V_KV * integral_meas / 3600.0
    else:  # monitor
        e_bat = V_KV * I_REF * DURATION / 3600.0
        integral_meas = I_REF * DURATION + BIAS * (DURATION - T_FAULT)
        e_bat_meas = V_KV * integral_meas / 3600.0
    e_load = P_LOAD * DURATION / 3600.0
    e_gen = e_load - e_bat
    soc_true = SOC0 - e_bat / E_NOM * 100.0
    soc_est = SOC0 - e_bat_meas / E_NOM * 100.0
    return {
        "energy_kWh": {"E_bat": e_bat, "E_bat_meas": e_bat_meas, "E_gen": e_gen, "E_load": e_load},
        "soc_pct": {"SOC_true_end": soc_true, "SOC_est_end": soc_est, "SOC_err_pp": soc_est - soc_true},
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true", help="write tests/golden_fl001.json")
    args = ap.parse_args()

    out = {
        "model": "FL-001 behaviour-level analytic oracle",
        "constants": {
            "duration_s": DURATION, "dt_s": DT, "I_ref_A": I_REF, "tau_s": TAU,
            "bias_A": BIAS, "fault_time_s": T_FAULT, "Vdc_V": 400, "P_load_kW": P_LOAD,
            "E_nom_kWh": E_NOM, "SOC0_pct": SOC0,
        },
        "scenarios": {m: scenario(m) for m in ("healthy", "closed_loop", "monitor")},
        "exact": {m: exact_scenario(m) for m in ("healthy", "closed_loop", "monitor")},
    }

    print("FL-001 independent analytic oracle (Python, no JS engine)")
    print("closed-form (exact) integrals:")
    print(f"{'scenario':<12} {'E_bat':>12} {'E_gen':>12} {'SOC_true':>13} {'SOC_est':>12} {'SOC_err_pp':>13}")
    for mode, s in out["exact"].items():
        e = s["energy_kWh"]
        soc = s["soc_pct"]
        print(f"{mode:<12} {e['E_bat']:>12.9f} {e['E_gen']:>12.9f} {soc['SOC_true_end']:>13.9f} "
              f"{soc['SOC_est_end']:>12.9f} {soc['SOC_err_pp']:>13.9f}")
    print()
    print("grid-trapezoid (0.1 s) cross-check, used to detect sampling smoothing:")
    print(f"{'scenario':<12} {'E_bat':>12} {'SOC_err_pp':>13} {'max r_meas':>11}")
    for mode, s in out["scenarios"].items():
        e = s["energy_kWh"]
        soc = s["soc_pct"]
        print(f"{mode:<12} {e['E_bat']:>12.9f} {soc['SOC_err_pp']:>13.9f} {s['max_abs_r_meas_kW']:>11.6f}")
    print()
    print("golden samples closed_loop:")
    for t, v in out["scenarios"]["closed_loop"]["samples"].items():
        print(f"  t={t:>5}s  I_true={v['I_true_A']:>10.6f} A  I_meas={v['I_meas_A']:>10.6f} A  "
              f"P_bat={v['P_bat_true_kW']:>9.6f} kW  r_meas={v.get('r_meas_kW', 0):>7.4f} kW")

    if args.json:
        path = os.path.join(ROOT, "tests", "golden_fl001.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(out, fh, ensure_ascii=False, indent=2)
        print("\nwritten " + os.path.relpath(path, ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
