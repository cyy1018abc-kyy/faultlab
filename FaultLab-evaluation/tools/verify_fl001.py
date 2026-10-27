#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Independent numeric oracle for FaultLab FL-001 (V0.2 Sec.5).

WHAT THIS IS
    A from-scratch re-implementation of the FL-001 L0 analytical model, used to
    independently recompute the V0.2 Sec.5.3 golden sample, the Sec.5.3 closing
    energy/SOC claims, and the Sec.5.5 PHY-01..PHY-10 acceptance checks.
    It exists because V0.2 Sec.4.2 explicitly requires an "independent numeric
    oracle" (closed-form math + an independent Python check) instead of letting
    the browser implementation assert its own correctness.

INDEPENDENCE
    * Only Sec.5.1 fixed parameters and Sec.5.2 equations are implemented as model
      inputs. No value is read in from a document table.
    * Document numbers appear only as labelled comparison targets ([DOC]) and
      never feed a computation.
    * No review report (REVIEWS/*.md) is read. No project source is imported.
    * Standard library only; numpy is intentionally not required.

METHOD LABELS USED IN OUTPUT
    [ANALYTIC] closed-form solution / closed-form integral of Sec.5.2
    [NUMERIC]  composite Simpson (h=1e-3) and trapezoid (h=1e-4, event-aware)
               integration cross-checks; plus trapezoid on the 601-point
               golden grid (h=0.1) to quantify the integration-rule gap.
    [DOC]      quoted V0.2 Sec.5.3/Sec.5.5 and V0.1 Sec.1/Sec.11 numbers.

RUNS
    healthy             closed loop, no fault (b=0): I_true=25 A, I_meas=25 A
    closed_loop_fault   closed loop + sensor bias: I_true=15+10*exp(-(t-20)/1.5),
                        I_meas=I_true+10 for t>=20 s
    monitor_only        feedback disabled: I_true=25 A always, I_meas=35 A for
                        t>=20 s

USAGE
    python verify_fl001.py                    # tables; exit 0 iff all decidable checks pass
    python verify_fl001.py --print-json       # also print machine-readable JSON
    python verify_fl001.py --json out.json    # write JSON to a user-chosen path
    python verify_fl001.py --no-fine          # skip the h=1e-4 numeric integration

EXIT CODES
    0  all decidable checks PASS (non-decidable/needs-runtime items do not fail)
    1  at least one FAIL
    2  internal self-check failure (grid/model bookkeeping broken)
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone

# =============================================================================
# Sec.5.1 fixed parameters — the only model inputs this oracle accepts.
# =============================================================================
DURATION_S = 60.0            # duration_s
SAMPLE_DT_S = 0.1            # sample_dt_s
N_SAMPLES = int(round(DURATION_S / SAMPLE_DT_S)) + 1   # 601 regular points
FAULT_TIME_S = 20.0          # fault_time_s
BIAS_A = 10.0                # bias_A
VDC_V = 400.0                # Vdc_V (ideal constant DC bus)
IREF_A = 25.0                # Iref_A (discharge positive)
TAU_S = 1.5                  # tau_s (closed-loop behavioural time constant)
PLOAD_DEMAND_KW = 30.0       # Pload_demand_kW
PLOAD_SERVED_KW = 30.0       # Pload_served_kW (L0: fully served)
EBAT_NOMINAL_KWH = 40.0      # Ebat_nominal_kWh
SOC0_PCT = 60.0              # SOC0_pct

KW_PER_A = VDC_V / 1000.0                   # P_bat[kW] = 0.4 * I[A]
S_PER_H = 3600.0                            # seconds -> hours
PP_PER_KWH = 100.0 / EBAT_NOMINAL_KWH       # 2.5 percentage points per kWh
GRID_ALIGN_TOL_S = 1e-9                     # "event lies on a sample" tolerance

# t_i = i*dt  (the i*dt form makes t[200]==20.0 and t[600]==60.0 exactly in IEEE-754;
# a cumulative += 0.1 loop does NOT, see probe A)
TIME_GRID = [i * SAMPLE_DT_S for i in range(N_SAMPLES)]
FAULT_INDEX = int(round(FAULT_TIME_S / SAMPLE_DT_S))    # 200

RUN_SPECS = {
    "healthy": {
        "feedback_mode": "closed_loop",
        "bias_A": 0.0,
        "description": "no fault; closed loop with b=0",
    },
    "closed_loop_fault": {
        "feedback_mode": "closed_loop",
        "bias_A": BIAS_A,
        "description": "sensor +10 A bias from t=20 s, feedback active",
    },
    "monitor_only": {
        "feedback_mode": "monitor_only",
        "bias_A": BIAS_A,
        "description": "sensor +10 A bias from t=20 s, feedback disabled",
    },
}

SIGNAL_NAMES = {
    "I_true_A": "A",
    "I_meas_A": "A",
    "P_bat_true_kW": "kW",
    "P_bat_meas_kW": "kW",
    "P_gen_true_kW": "kW",
    "r_true_kW": "kW",
    "r_meas_kW": "kW",
}


# =============================================================================
# Sec.5.2 analytical equations, re-derived (no table lookups)
# =============================================================================
def bias_at(t, bias_A, fault_time_s=FAULT_TIME_S):
    """b(t)=0 for t<tf, b(t)=bias for t>=tf ('post' semantics at the event instant)."""
    return 0.0 if t < fault_time_s else bias_A


def i_true_at(t, feedback_mode, bias_A, fault_time_s=FAULT_TIME_S):
    """I_true(t): Sec.5.2 closed-loop ODE solution; monitor/healthy variants.

    Closed loop solves  tau*dI/dt + I = Iref - b(t)  with I(0)=Iref.
    For t>=tf: I(t) = (Iref-bias) + bias*exp(-(t-tf)/tau).  Continuity at tf holds.
    """
    if feedback_mode == "monitor_only":
        return IREF_A
    if t < fault_time_s:
        return IREF_A
    u = t - fault_time_s
    return (IREF_A - bias_A) + bias_A * math.exp(-u / TAU_S)


def i_true_integral(x, feedback_mode, bias_A, fault_time_s=FAULT_TIME_S):
    """Closed-form integral of I_true over [0, x] in A*s."""
    if feedback_mode == "monitor_only" or x <= fault_time_s:
        return IREF_A * x
    u = x - fault_time_s
    return (IREF_A * fault_time_s
            + (IREF_A - bias_A) * u
            + bias_A * TAU_S * (1.0 - math.exp(-u / TAU_S)))


def bias_integral(x, bias_A, fault_time_s=FAULT_TIME_S):
    """Closed-form integral of b over [0, x] in A*s (event-aware)."""
    return 0.0 if x <= fault_time_s else bias_A * (x - fault_time_s)


def compute_metrics(feedback_mode, bias_A, fault_time_s=FAULT_TIME_S,
                    duration_s=DURATION_S):
    """Analytical end-of-run metrics.  Units: kWh, % SOC, pp for SOC error."""
    int_i_true = i_true_integral(duration_s, feedback_mode, bias_A, fault_time_s)
    int_bias = bias_integral(duration_s, bias_A, fault_time_s)
    int_i_meas = int_i_true + int_bias
    e_bat_true = KW_PER_A * int_i_true / S_PER_H
    e_bat_meas = KW_PER_A * int_i_meas / S_PER_H
    e_gen_true = PLOAD_SERVED_KW * duration_s / S_PER_H - e_bat_true
    soc_true = SOC0_PCT - 100.0 * e_bat_true / EBAT_NOMINAL_KWH
    soc_est = SOC0_PCT - 100.0 * e_bat_meas / EBAT_NOMINAL_KWH
    return {
        "duration_s": duration_s,
        "int_I_true_A_s": int_i_true,
        "int_bias_A_s": int_bias,
        "int_I_meas_A_s": int_i_meas,
        "E_bat_true_kWh": e_bat_true,
        "E_gen_true_kWh": e_gen_true,
        "E_bat_meas_kWh": e_bat_meas,
        "E_load_served_kWh": PLOAD_SERVED_KW * duration_s / S_PER_H,
        "SOC_true_pct": soc_true,
        "SOC_est_pct": soc_est,
        "SOC_err_pp": soc_est - soc_true,
    }


def build_run(run_id, spec):
    """Build all 601 sample rows plus the analytical end metrics for one run."""
    fb = spec["feedback_mode"]
    bias = spec["bias_A"]
    run = {
        "run_id": run_id,
        "feedback_mode": fb,
        "bias_A": bias,
        "fault_time_s": FAULT_TIME_S,
        "t_s": list(TIME_GRID),
        "I_true_A": [],
        "bias_A_series": [],
        "I_meas_A": [],
        "P_bat_true_kW": [],
        "P_bat_meas_kW": [],
        "P_gen_true_kW": [],
        "r_true_kW": [],
        "r_meas_kW": [],
        "E_bat_true_kWh_cum": [],
        "E_bat_meas_kWh_cum": [],
        "E_gen_true_kWh_cum": [],
        "SOC_true_pct": [],
        "SOC_est_pct": [],
    }
    for t in TIME_GRID:
        it = i_true_at(t, fb, bias)
        bt = bias_at(t, bias)
        im = it + bt
        pb = KW_PER_A * it
        pbm = KW_PER_A * im
        pg = PLOAD_SERVED_KW - pb
        rt = pg + pb - PLOAD_SERVED_KW
        rm = pg + pbm - PLOAD_SERVED_KW
        cum_i = i_true_integral(t, fb, bias)
        cum_b = bias_integral(t, bias)
        e_bat = KW_PER_A * cum_i / S_PER_H
        e_bat_meas = KW_PER_A * (cum_i + cum_b) / S_PER_H
        e_gen = PLOAD_SERVED_KW * t / S_PER_H - e_bat
        run["I_true_A"].append(it)
        run["bias_A_series"].append(bt)
        run["I_meas_A"].append(im)
        run["P_bat_true_kW"].append(pb)
        run["P_bat_meas_kW"].append(pbm)
        run["P_gen_true_kW"].append(pg)
        run["r_true_kW"].append(rt)
        run["r_meas_kW"].append(rm)
        run["E_bat_true_kWh_cum"].append(e_bat)
        run["E_bat_meas_kWh_cum"].append(e_bat_meas)
        run["E_gen_true_kWh_cum"].append(e_gen)
        run["SOC_true_pct"].append(SOC0_PCT - 100.0 * e_bat / EBAT_NOMINAL_KWH)
        run["SOC_est_pct"].append(SOC0_PCT - 100.0 * e_bat_meas / EBAT_NOMINAL_KWH)
    run["metrics"] = compute_metrics(fb, bias)
    return run


# =============================================================================
# Numerical integration cross-checks [NUMERIC]
# =============================================================================
def simpson_integral(f, a, b, n):
    """Composite Simpson rule on [a, b] with n (even) intervals."""
    if n % 2:
        n += 1
    h = (b - a) / n
    s = f(a) + f(b)
    for k in range(1, n, 2):
        s += 4.0 * f(a + k * h)
    for k in range(2, n, 2):
        s += 2.0 * f(a + k * h)
    return s * h / 3.0


def piecewise_integral(f, a, b, breakpoints, target_h, rule):
    """Integrate f on [a,b], splitting at breakpoints; rule in {'simpson','trapz'}."""
    pts = [a] + sorted(p for p in breakpoints if a < p < b) + [b]
    total = 0.0
    for left, right in zip(pts, pts[1:]):
        n = max(2, int(round((right - left) / target_h)))
        if rule == "simpson":
            total += simpson_integral(f, left, right, n)
        else:
            total += trapz_func_integral(f, left, right, n)
    return total


def trapz_func_integral(f, a, b, n):
    """Composite trapezoid rule on [a, b] with n intervals (Kahan-compensated sum)."""
    h = (b - a) / n
    total = 0.0
    comp = 0.0                      # Kahan compensation: keeps ~1e-12 accumulation
    prev = f(a)                     # error out of a 400k-term sum
    for k in range(1, n + 1):
        cur = f(a + k * h)
        y = 0.5 * (prev + cur) * h - comp
        t = total + y
        comp = (t - total) - y
        total = t
        prev = cur
    return total


def trapz_arrays(y, t):
    """Trapezoid rule over sampled arrays (the golden-grid rule)."""
    return sum(0.5 * (y[i] + y[i + 1]) * (t[i + 1] - t[i]) for i in range(len(t) - 1))


def numeric_crosscheck(feedback_mode, bias_A, fine):
    """Analytic vs Simpson(h=1e-3) vs trapezoid(h=1e-4) vs trapezoid(601 grid)."""
    tf = FAULT_TIME_S
    f_i = lambda t: i_true_at(t, feedback_mode, bias_A, tf)

    def metrics_from_integrals(int_i, int_b):
        e_bat = KW_PER_A * int_i / S_PER_H
        e_meas = KW_PER_A * (int_i + int_b) / S_PER_H
        e_gen = PLOAD_SERVED_KW * DURATION_S / S_PER_H - e_bat
        soc_true = SOC0_PCT - 100.0 * e_bat / EBAT_NOMINAL_KWH
        soc_est = SOC0_PCT - 100.0 * e_meas / EBAT_NOMINAL_KWH
        return {
            "E_bat_true_kWh": e_bat,
            "E_gen_true_kWh": e_gen,
            "E_bat_meas_kWh": e_meas,
            "SOC_true_pct": soc_true,
            "SOC_est_pct": soc_est,
            "SOC_err_pp": soc_est - soc_true,
        }

    # analytic
    analytic = compute_metrics(feedback_mode, bias_A)
    # b(t) is piecewise constant (a step), so its integral over either piece is exact;
    # integrating the step numerically would only smear the jump across panels.
    int_b_exact = bias_A * max(0.0, DURATION_S - tf)
    # Simpson h=1e-3, event-aware pieces [0,tf],[tf,60]
    int_i_sim = piecewise_integral(f_i, 0.0, DURATION_S, [tf], 1e-3, "simpson")
    int_b_sim = int_b_exact
    simpson = metrics_from_integrals(int_i_sim, int_b_sim)
    # event-aware trapezoid on a fine grid (h=1e-4)
    if fine:
        int_i_fine = piecewise_integral(f_i, 0.0, DURATION_S, [tf], 1e-4, "trapz")
        int_b_fine = int_b_exact
        fine_metrics = metrics_from_integrals(int_i_fine, int_b_fine)
    else:
        int_i_fine = int_b_fine = None
        fine_metrics = None
    # trapezoid on the exact 601-point golden grid (what a naive implementation does)
    i_series = [f_i(t) for t in TIME_GRID]
    b_series = [bias_at(t, bias_A, tf) for t in TIME_GRID]
    int_i_grid = trapz_arrays(i_series, TIME_GRID)
    int_b_grid = trapz_arrays(b_series, TIME_GRID)
    grid = metrics_from_integrals(int_i_grid, int_b_grid)

    return {
        "feedback_mode": feedback_mode,
        "bias_A": bias_A,
        "analytic": analytic,
        "simpson": simpson,
        "fine": fine_metrics,
        "grid": grid,
        "int_I_true_analytic_A_s": analytic["int_I_true_A_s"],
        "int_I_true_simpson_A_s": int_i_sim,
        "int_I_true_fine_trapz_A_s": int_i_fine,
        "int_I_true_grid_trapz_A_s": int_i_grid,
        "int_bias_grid_trapz_A_s": int_b_grid,
        "d_int_I_true_simpson_A_s": int_i_sim - analytic["int_I_true_A_s"],
        "d_int_I_true_fine_A_s": (int_i_fine - analytic["int_I_true_A_s"]) if fine else None,
        "d_int_I_true_grid_A_s": int_i_grid - analytic["int_I_true_A_s"],
        "d_E_bat_true_simpson_kWh":
            simpson["E_bat_true_kWh"] - analytic["E_bat_true_kWh"],
        "d_E_bat_true_fine_kWh":
            (fine_metrics["E_bat_true_kWh"] - analytic["E_bat_true_kWh"]) if fine else None,
        "d_E_bat_true_grid_kWh":
            grid["E_bat_true_kWh"] - analytic["E_bat_true_kWh"],
        "d_E_bat_meas_grid_kWh":
            grid["E_bat_meas_kWh"] - analytic["E_bat_meas_kWh"],
        "d_SOC_err_grid_pp": grid["SOC_err_pp"] - analytic["SOC_err_pp"],
    }


def rk4_closed_form_crosscheck():
    """Independent check that Sec.5.2's formula solves Sec.5.1's ODE.

    Integrate tau*dI/dt = Iref - b - I with classic RK4 (h=1e-3) from t=20 s
    (b=10 A, I=25 A) and compare with the closed form.  Also evaluate the ODE
    residual of the closed form on all 601 sample points.
    """
    h = 1e-3
    bias = BIAS_A
    i_val = IREF_A
    u = 0.0
    max_err = 0.0
    samples = {}
    span = DURATION_S - FAULT_TIME_S
    steps = int(round(span / h))
    for _ in range(steps):
        def deriv(iv):
            return (IREF_A - bias - iv) / TAU_S
        k1 = deriv(i_val)
        k2 = deriv(i_val + 0.5 * h * k1)
        k3 = deriv(i_val + 0.5 * h * k2)
        k4 = deriv(i_val + h * k3)
        i_val += h * (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0
        u += h
        t = FAULT_TIME_S + u
        err = abs(i_val - i_true_at(t, "closed_loop", bias))
        max_err = max(max_err, err)
        for key in (21.5, 26.0, 60.0):
            if abs(t - key) < 0.5 * h:
                samples[key] = {"rk4_A": i_val, "analytic_A": i_true_at(t, "closed_loop", bias),
                                "abs_err_A": err}
    max_res = 0.0
    for t in TIME_GRID:
        if t < FAULT_TIME_S:
            i_prime = 0.0
            rhs = IREF_A
        else:
            uu = t - FAULT_TIME_S
            i_prime = -(bias / TAU_S) * math.exp(-uu / TAU_S)
            rhs = IREF_A - bias
        res = TAU_S * i_prime + i_true_at(t, "closed_loop", bias) - rhs
        max_res = max(max_res, abs(res))
    return {"rk4_h_s": h, "max_abs_err_A": max_err,
            "samples": samples, "max_ode_residual_A": max_res}


# =============================================================================
# Event snapshots (Sec.5.4): t=20- left limit vs t=20+ post
# =============================================================================
def event_snapshots(feedback_mode, bias_A):
    """pre = left limit at t=tf-; post = value at t=tf+ (post semantics)."""
    tf = FAULT_TIME_S
    pre_true = IREF_A                      # left limit of the closed/monitor solution
    post_true = i_true_at(tf, feedback_mode, bias_A)   # continuous by construction
    pre = {
        "phase": "pre", "t_s": tf,
        "I_true_A": pre_true, "bias_A": 0.0, "I_meas_A": pre_true + 0.0,
    }
    post = {
        "phase": "post", "t_s": tf,
        "I_true_A": post_true, "bias_A": bias_A, "I_meas_A": post_true + bias_A,
    }
    for snap in (pre, post):
        it = snap["I_true_A"]
        im = snap["I_meas_A"]
        pb = KW_PER_A * it
        pbm = KW_PER_A * im
        pg = PLOAD_SERVED_KW - pb
        snap["P_bat_true_kW"] = pb
        snap["P_bat_meas_kW"] = pbm
        snap["P_gen_true_kW"] = pg
        snap["r_true_kW"] = pg + pb - PLOAD_SERVED_KW
        snap["r_meas_kW"] = pg + pbm - PLOAD_SERVED_KW
    return {"pre": pre, "post": post}


def row_snapshot(feedback_mode, bias_A, fault_time_s, index):
    """Value of one regular sample row under index-based post semantics."""
    t = index * SAMPLE_DT_S
    i_f_round = int(round(fault_time_s / SAMPLE_DT_S))
    on_grid = abs(fault_time_s - i_f_round * SAMPLE_DT_S) <= GRID_ALIGN_TOL_S
    first_post = i_f_round if on_grid else int(math.floor(fault_time_s / SAMPLE_DT_S)) + 1
    it = i_true_at(t, feedback_mode, bias_A, fault_time_s)
    bt = bias_A if index >= first_post else 0.0
    im = it + bt
    pb = KW_PER_A * it
    pbm = KW_PER_A * im
    pg = PLOAD_SERVED_KW - pb
    return {
        "index": index, "t_s": t, "phase": "post" if index >= first_post else "pre",
        "I_true_A": it, "bias_A": bt, "I_meas_A": im,
        "P_bat_true_kW": pb, "P_bat_meas_kW": pbm, "P_gen_true_kW": pg,
        "r_meas_kW": pg + pbm - PLOAD_SERVED_KW,
    }


# =============================================================================
# Document comparison targets ([DOC] only; NEVER used as computation input)
# =============================================================================
# V0.2 Sec.5.3 table, 6 data rows.  Cell = (signal, documented value, tolerance, decimals).
# Tolerances: exact integers 1e-9; 4-dp displayed quantities 5e-5; the "~" row is a
# display approximation, tolerance 5e-3 for the "~" columns and exact for r_meas.
DOC_GOLDEN_ROWS = [
    {
        "label": "healthy t=19.9s",
        "run_id": "healthy",
        "t_s": 19.9,
        "cells": [
            ("I_true_A", 25.0, 1e-9, 0),
            ("I_meas_A", 25.0, 1e-9, 0),
            ("P_bat_true_kW", 10.0, 1e-9, 0),
            ("P_gen_true_kW", 20.0, 1e-9, 0),
            ("r_meas_kW", 0.0, 1e-9, 0),
        ],
        "note": "row labelled 'normal'; same values in closed_loop pre-fault",
    },
    {
        "label": "closed t=20s post",
        "run_id": "closed_loop_fault",
        "t_s": 20.0,
        "cells": [
            ("I_true_A", 25.0, 1e-9, 0),
            ("I_meas_A", 35.0, 1e-9, 0),
            ("P_bat_true_kW", 10.0, 1e-9, 0),
            ("P_gen_true_kW", 20.0, 1e-9, 0),
            ("r_meas_kW", 4.0, 1e-9, 0),
        ],
        "note": "regular row at t=20.0 uses post semantics",
    },
    {
        "label": "closed t=21.5s",
        "run_id": "closed_loop_fault",
        "t_s": 21.5,
        "cells": [
            ("I_true_A", 18.6788, 5e-5, 4),
            ("I_meas_A", 28.6788, 5e-5, 4),
            ("P_bat_true_kW", 7.4715, 5e-5, 4),
            ("P_gen_true_kW", 22.5285, 5e-5, 4),
            ("r_meas_kW", 4.0, 1e-9, 0),
        ],
        "note": "4 decimal places in the document",
    },
    {
        "label": "closed t=26s",
        "run_id": "closed_loop_fault",
        "t_s": 26.0,
        "cells": [
            ("I_true_A", 15.1832, 5e-5, 4),
            ("I_meas_A", 25.1832, 5e-5, 4),
            ("P_bat_true_kW", 6.0733, 5e-5, 4),
            ("P_gen_true_kW", 23.9267, 5e-5, 4),
            ("r_meas_kW", 4.0, 1e-9, 0),
        ],
        "note": "4 decimal places in the document",
    },
    {
        "label": "closed t=60s",
        "run_id": "closed_loop_fault",
        "t_s": 60.0,
        "cells": [
            ("I_true_A", 15.0, 5e-3, 0),
            ("I_meas_A", 25.0, 5e-3, 0),
            ("P_bat_true_kW", 6.0, 5e-3, 0),
            ("P_gen_true_kW", 24.0, 5e-3, 0),
            ("r_meas_kW", 4.0, 1e-9, 0),
        ],
        "note": "document uses '~'; exact value is NOT exactly 15 A (see output)",
    },
    {
        "label": "monitor t=60s",
        "run_id": "monitor_only",
        "t_s": 60.0,
        "cells": [
            ("I_true_A", 25.0, 1e-9, 0),
            ("I_meas_A", 35.0, 1e-9, 0),
            ("P_bat_true_kW", 10.0, 1e-9, 0),
            ("P_gen_true_kW", 20.0, 1e-9, 0),
            ("r_meas_kW", 4.0, 1e-9, 0),
        ],
        "note": "same bias, feedback off",
    },
]

# V0.2 Sec.5.3 closing paragraph claims: (key, documented value, tolerance, unit, decimals)
DOC_END_CLAIMS = [
    ("E_load_served_kWh", 0.5, 5e-7, "kWh", 6),
    ("closed.E_bat_true_kWh", 0.123889, 5e-7, "kWh", 6),
    ("closed.E_gen_true_kWh", 0.376111, 5e-7, "kWh", 6),
    ("closed.SOC_true_pct", 59.69028, 5e-6, "%", 5),
    ("closed.SOC_err_pp", -0.111111, 5e-7, "pp", 6),
    ("healthy.E_bat_true_kWh", 0.166667, 5e-7, "kWh", 6),
    ("healthy.E_gen_true_kWh", 0.333333, 5e-7, "kWh", 6),
    ("healthy.SOC_true_pct", 59.583333, 5e-7, "%", 6),
    ("monitor.E_bat_true_kWh", 0.166667, 5e-7, "kWh", 6),
    ("monitor.E_gen_true_kWh", 0.333333, 5e-7, "kWh", 6),
    ("monitor.SOC_true_pct", 59.583333, 5e-7, "%", 6),
]

# V0.1 Sec.1 calibration table, used only as cross-check targets.
DOC_V01_CALIBRATION = [
    ("healthy.E_bat_true_kWh", 0.16667, 5e-6, "kWh", 5),
    ("closed.E_bat_true_kWh", 0.12389, 5e-6, "kWh", 5),
    ("healthy.E_gen_true_kWh", 0.33333, 5e-6, "kWh", 5),
    ("closed.E_gen_true_kWh", 0.37611, 5e-6, "kWh", 5),
    ("healthy.SOC_true_pct", 59.58333, 5e-6, "%", 5),
    ("closed.SOC_true_pct", 59.69028, 5e-6, "%", 5),
    ("healthy.SOC_err_pp", 0.0, 1e-9, "pp", 0),
    ("closed.SOC_err_pp", -0.11111, 5e-6, "pp", 5),
    ("closed.max_r_meas_post_kW", 4.0, 1e-9, "kW", 0),
    ("E_load_served_kWh", 0.5, 1e-9, "kWh", 0),
]

# V0.1 Sec.11 journey acceptance numbers (UX-02/UX-03).
DOC_V01_UX = [
    ("UX-02 I_meas@19.9s", 25.0, 1e-9, "A", 0),
    ("UX-02 I_meas@20.0s", 35.0, 1e-9, "A", 0),
    ("UX-03 I_true@26s", 15.18, 5e-3, "A", 2),
    ("UX-03 I_meas@26s", 25.18, 5e-3, "A", 2),
]

# V0.1 vs V0.2 presentation consistency pairs (same quantity, two documents).
V01_V02_PAIRS = [
    ("healthy E_bat (kWh)", 0.16667, 0.166667),
    ("closed E_bat (kWh)", 0.12389, 0.123889),
    ("healthy E_gen (kWh)", 0.33333, 0.333333),
    ("closed E_gen (kWh)", 0.37611, 0.376111),
    ("healthy SOC (%)", 59.58333, 59.583333),
    ("closed SOC (%)", 59.69028, 59.69028),
    ("healthy SOC err (pp)", 0.0, 0.0),
    ("closed SOC err (pp)", -0.11111, -0.111111),
    ("post meas residual (kW)", 4.0, 4.0),
    ("load energy (kWh)", 0.5, 0.5),
]


# =============================================================================
# Doc comparisons
# =============================================================================
def evaluate_doc_golden_rows(runs):
    results = []
    for row in DOC_GOLDEN_ROWS:
        run = runs[row["run_id"]]
        index = int(round(row["t_s"] / SAMPLE_DT_S))
        cells = []
        row_ok = True
        for signal, doc_value, tol, decimals in row["cells"]:
            computed = run[signal][index]
            abs_diff = abs(computed - doc_value)
            rel_diff = abs_diff / abs(doc_value) if doc_value != 0 else 0.0
            verdict = "PASS" if abs_diff <= tol else "FAIL"
            row_ok = row_ok and verdict == "PASS"
            cells.append({
                "signal": signal, "unit": SIGNAL_NAMES[signal],
                "doc_value": doc_value, "computed": computed,
                "abs_diff": abs_diff, "rel_diff": rel_diff,
                "tolerance": tol, "decimals": decimals, "verdict": verdict,
            })
        results.append({
            "label": row["label"], "run_id": row["run_id"],
            "t_s": row["t_s"], "index": index, "cells": cells,
            "verdict": "PASS" if row_ok else "FAIL", "note": row["note"],
        })
    return results


def _computed_map(runs):
    closed = runs["closed_loop_fault"]["metrics"]
    healthy = runs["healthy"]["metrics"]
    monitor = runs["monitor_only"]["metrics"]
    post = [runs["closed_loop_fault"]["r_meas_kW"][i]
            for i in range(FAULT_INDEX, N_SAMPLES)]
    closed_run = runs["closed_loop_fault"]
    i199 = int(round(19.9 / SAMPLE_DT_S))
    i260 = int(round(26.0 / SAMPLE_DT_S))
    return {
        "UX-02 I_meas@19.9s": closed_run["I_meas_A"][i199],
        "UX-02 I_meas@20.0s": closed_run["I_meas_A"][FAULT_INDEX],
        "UX-03 I_true@26s": closed_run["I_true_A"][i260],
        "UX-03 I_meas@26s": closed_run["I_meas_A"][i260],
        "E_load_served_kWh": closed["E_load_served_kWh"],
        "closed.E_bat_true_kWh": closed["E_bat_true_kWh"],
        "closed.E_gen_true_kWh": closed["E_gen_true_kWh"],
        "closed.SOC_true_pct": closed["SOC_true_pct"],
        "closed.SOC_err_pp": closed["SOC_err_pp"],
        "healthy.E_bat_true_kWh": healthy["E_bat_true_kWh"],
        "healthy.E_gen_true_kWh": healthy["E_gen_true_kWh"],
        "healthy.SOC_true_pct": healthy["SOC_true_pct"],
        "healthy.SOC_err_pp": healthy["SOC_err_pp"],
        "monitor.E_bat_true_kWh": monitor["E_bat_true_kWh"],
        "monitor.E_gen_true_kWh": monitor["E_gen_true_kWh"],
        "monitor.SOC_true_pct": monitor["SOC_true_pct"],
        "monitor.SOC_err_pp": monitor["SOC_err_pp"],
        "closed.max_r_meas_post_kW": max(post),
    }


def evaluate_claims(claims, computed, section):
    results = []
    for key, doc_value, tol, unit, decimals in claims:
        comp = computed[key]
        abs_diff = abs(comp - doc_value)
        rel_diff = abs_diff / abs(doc_value) if doc_value != 0 else 0.0
        verdict = "PASS" if abs_diff <= tol else "FAIL"
        results.append({
            "section": section, "key": key, "unit": unit,
            "doc_value": doc_value, "computed": comp,
            "abs_diff": abs_diff, "rel_diff": rel_diff,
            "tolerance": tol, "decimals": decimals, "verdict": verdict,
        })
    return results


def evaluate_v01_v02_pairs():
    results = []
    for label, v01, v02 in V01_V02_PAIRS:
        abs_diff = abs(v01 - v02)
        # tolerance = half a unit in the last displayed digit of V0.1 (coarser doc)
        def last_digits(x):
            s = repr(float(x))
            if "e" in s or "E" in s:
                return 6
            return len(s.split(".")[1]) if "." in s else 0
        d = last_digits(v01)
        tol = 0.5 * 10.0 ** (-d)
        verdict = "PASS" if abs_diff <= tol else "FAIL"
        results.append({
            "label": label, "v01": v01, "v02": v02,
            "abs_diff": abs_diff, "tolerance": tol, "verdict": verdict,
        })
    return results


# =============================================================================
# PHY-01 .. PHY-10
# =============================================================================
def evaluate_phy(runs, events, crosschecks, ode, fine):
    checks = []

    def add(check_id, name, doc_condition, decidable, observed, verdict,
            proposed_tolerance, notes):
        checks.append({
            "check_id": check_id, "name": name, "doc_condition": doc_condition,
            "decidable": decidable, "observed": observed, "verdict": verdict,
            "proposed_tolerance": proposed_tolerance, "notes": notes,
        })

    # PHY-01 real power balance
    per_run = {}
    max_abs = 0.0
    for rid, run in runs.items():
        m = max(abs(x) for x in run["r_true_kW"])
        per_run[rid] = m
        max_abs = max(max_abs, m)
    add("PHY-01", "real power balance",
        "max abs r_true <= 1e-9 kW (L0 analytical only)", "YES",
        {"max_abs_r_true_kW": max_abs, "per_run": per_run},
        "PASS" if max_abs <= 1e-9 else "FAIL",
        "1e-9 kW absolute is achievable in IEEE-754 double (observed 0.0); it is "
        "NOT achievable if exported values are rounded to <= 12 significant digits",
        ["r_true is algebraically zero by construction: P_gen := Pload - P_bat, so "
         "this check only exercises the float path; it cannot detect a wrong tau/bias "
         "or non-physical generator. Add an independent ODE cross-check (see [4b])."])

    # PHY-02 bias constraint
    obs = {}
    worst = 0.0
    for rid in ("closed_loop_fault", "monitor_only"):
        run = runs[rid]
        pre = max(abs(run["I_meas_A"][i] - run["I_true_A"][i])
                  for i in range(FAULT_INDEX))
        bias = run["bias_A"]
        post = max(abs((run["I_meas_A"][i] - run["I_true_A"][i]) - bias)
                   for i in range(FAULT_INDEX, N_SAMPLES))
        raw_post = [run["I_meas_A"][i] - run["I_true_A"][i]
                    for i in range(FAULT_INDEX, N_SAMPLES)]
        obs[rid] = {"pre_max_abs_err_A": pre, "post_max_abs_err_A": post,
                    "post_diff_min_A": min(raw_post), "post_diff_max_A": max(raw_post)}
        worst = max(worst, pre, post)
    add("PHY-02", "bias constraint",
        "pre I_meas-I_true=0; post =+10 A within float tolerance", "YES",
        obs, "PASS" if worst <= 1e-9 else "FAIL",
        "propose 1e-9 A absolute (observed <= 3.6e-15 A); test must use the "
        "config bias_A and its sign, not a hard-coded +10",
        ["t=20.0 row is POST; enumerate pre rows by index < fault_index, not by a "
         "raw t<20 comparison on a cumulatively-built time grid"])

    # PHY-03 continuous state
    ev = events["closed_loop_fault"]
    cont_diff = abs(ev["post"]["I_true_A"] - ev["pre"]["I_true_A"])
    grid_same = (runs["closed_loop_fault"]["I_true_A"][FAULT_INDEX - 1]
                 == runs["closed_loop_fault"]["I_true_A"][FAULT_INDEX])
    add("PHY-03", "continuous true state",
        "I_true(20-) = I_true(20+)", "YES",
        {"pre_left_limit_A": ev["pre"]["I_true_A"],
         "post_A": ev["post"]["I_true_A"],
         "abs_diff_A": cont_diff,
         "grid_row_19.9_equals_row_20.0": grid_same},
        "PASS" if cont_diff <= 1e-9 else "FAIL",
        "1e-9 A absolute (observed exactly 0.0)",
        ["pre must be the left limit (20-), not the 19.9 s sample; in this model both "
         "are 25.0 A so the distinction is currently benign"])

    # PHY-04 closed-loop trend
    run = runs["closed_loop_fault"]
    i_series = run["I_true_A"]
    diffs = [i_series[i + 1] - i_series[i] for i in range(FAULT_INDEX, N_SAMPLES - 1)]
    strictly_decreasing = all(d < 0.0 for d in diffs)
    non_increasing = all(d <= 0.0 for d in diffs)
    i_end = i_series[-1]
    end_err = abs(i_end - (IREF_A - BIAS_A))
    bounds_ok = min(i_series) >= 0.0 and max(i_series) <= IREF_A
    add("PHY-04", "closed-loop trend",
        "20-60 s true current monotonically 25 A -> 15 A, no false out-of-range",
        "YES",
        {"I_true_first_post_A": i_series[FAULT_INDEX],
         "I_true_60s_A": i_end,
         "abs_err_vs_15A": end_err,
         "min_delta_A": min(diffs), "max_delta_A": max(diffs),
         "delta_at_19.9_to_20.0_A": i_series[FAULT_INDEX] - i_series[FAULT_INDEX - 1],
         "strictly_decreasing_post": strictly_decreasing,
         "non_increasing_post": non_increasing,
         "I_true_min_A": min(i_series), "I_true_max_A": max(i_series),
         "bounds_0_to_25_ok": bounds_ok},
        "PASS" if (strictly_decreasing and end_err <= 1e-9 and bounds_ok) else "FAIL",
        "monotone: non-increasing (event interval 19.9->20.0 delta is exactly 0); "
        "end: |I_true(60)-15| <= 1e-9 A (observed 2.62e-11 A, so a 1e-12 tolerance "
        "would wrongly FAIL); bounds: 0 <= I_true <= Iref",
        ["'~15 A' is a display approximation: I_true(60)=15+10*exp(-40/1.5)= "
         "15.000000000026 A. 'no false out-of-range' is undefined in the document; "
         "the model has no limit/saturation element at all."])

    # PHY-05 monitor only
    mon = runs["monitor_only"]
    true_const = all(x == IREF_A for x in mon["I_true_A"])
    meas_pre = all(x == IREF_A for x in mon["I_meas_A"][:FAULT_INDEX])
    meas_post = all(x == IREF_A + BIAS_A for x in mon["I_meas_A"][FAULT_INDEX:])
    add("PHY-05", "monitor-only behaviour",
        "I_true=25 A all run; I_meas biased only after 20 s", "YES",
        {"I_true_all_25A": true_const,
         "I_meas_pre_all_25A": meas_pre,
         "I_meas_post_all_35A": meas_post,
         "I_meas_19.9_A": mon["I_meas_A"][FAULT_INDEX - 1],
         "I_meas_20.0_A": mon["I_meas_A"][FAULT_INDEX]},
        "PASS" if (true_const and meas_pre and meas_post) else "FAIL",
        "exact equality is safe here (constant signal); r_meas post must equal "
        "0.4*BIAS = 4.0 kW within 1e-9",
        ["'only after 20 s' should be pinned to 'row index >= fault_index' (post)"])

    # PHY-06 energy integral
    obs6 = {}
    worst6 = 0.0
    for rid, run in runs.items():
        m = run["metrics"]
        s = m["E_gen_true_kWh"] + m["E_bat_true_kWh"]
        worst6 = max(worst6, abs(s - m["E_load_served_kWh"]))
        E_grid = KW_PER_A * trapz_arrays(run["I_true_A"], run["t_s"]) / S_PER_H
        Eg_grid = PLOAD_SERVED_KW * DURATION_S / S_PER_H - E_grid
        obs6[rid] = {"E_bat_analytic_kWh": m["E_bat_true_kWh"],
                     "E_gen_analytic_kWh": m["E_gen_true_kWh"],
                     "sum_analytic_kWh": s,
                     "E_bat_trapz601_kWh": E_grid,
                     "sum_trapz601_kWh": E_grid + Eg_grid}
    closed_cc = crosschecks["closed_loop_fault"]
    mixed_analytic_plus_trapz = (closed_cc["analytic"]["E_bat_true_kWh"]
                                 + closed_cc["grid"]["E_gen_true_kWh"])
    mixed_delta = mixed_analytic_plus_trapz - 0.5
    obs6["mixing_rule_counterexample"] = {
        "closed_E_bat_analytic_plus_E_gen_trapz601_kWh": mixed_analytic_plus_trapz,
        "delta_vs_0.5_kWh": mixed_delta,
        "E_bat_analytic_minus_trapz601_kWh": closed_cc["d_E_bat_true_grid_kWh"],
        "E_bat_meas_analytic_minus_trapz601_kWh": closed_cc["d_E_bat_meas_grid_kWh"],
    }
    add("PHY-06", "energy integral",
        "E_gen + E_bat = E_served = 0.5 kWh with a consistent integration rule", "YES",
        obs6, "PASS" if worst6 <= 1e-9 else "FAIL",
        "analytic/event-aware rule: |sum-0.5| <= 1e-9 kWh (observed ~1e-16). "
        "Sampled-trapezoid rule: |E_bat_analytic-E_bat_trapz| up to 6.2e-7 kWh; "
        "bias energy 5.6e-5 kWh; a 1e-9 tolerance REQUIRES one named rule",
        ["sum is again algebraically exact (E_gen is defined as residual); the rule gap "
         "is the only thing this check can actually detect"])

    # PHY-07 SOC
    closed_m = runs["closed_loop_fault"]["metrics"]
    mon_m = runs["monitor_only"]["metrics"]
    hea_m = runs["healthy"]["metrics"]
    grid_err = closed_cc["grid"]["SOC_err_pp"]
    doc_val = -0.111111
    err_diff = abs(closed_m["SOC_err_pp"] - doc_val)
    add("PHY-07", "SOC & pp",
        "seconds->hours conversion; SOC_est-SOC_true=-0.111111 pp at 60 s", "YES",
        {"closed_loop_fault": {"SOC_true_pct": closed_m["SOC_true_pct"],
                               "SOC_est_pct": closed_m["SOC_est_pct"],
                               "SOC_err_pp": closed_m["SOC_err_pp"],
                               "trapz601_SOC_err_pp": grid_err,
                               "analytic_minus_trapz601_pp":
                                   closed_m["SOC_err_pp"] - grid_err},
         "monitor_only": {"SOC_true_pct": mon_m["SOC_true_pct"],
                          "SOC_est_pct": mon_m["SOC_est_pct"],
                          "SOC_err_pp": mon_m["SOC_err_pp"]},
         "healthy": {"SOC_true_pct": hea_m["SOC_true_pct"],
                     "SOC_est_pct": hea_m["SOC_est_pct"],
                     "SOC_err_pp": hea_m["SOC_err_pp"]}},
        "PASS" if err_diff <= 5e-7 else "FAIL",
        "document value -0.111111 pp is the [ANALYTIC] result (diff 1.1e-7 at 6 dp); "
        "naive trapezoid on the 601 grid gives -0.111250 pp (1.39e-4 pp difference); "
        "freeze units as pp and state the integration rule",
        ["the same -0.111111 pp holds for BOTH fault runs (bias integral identical); "
         "the document does not name a run. Healthy is 0 pp."])

    # PHY-08 playback/page/cursor invariance — not numerically decidable
    determinism = runs["closed_loop_fault"]["I_true_A"] == build_run(
        "closed_loop_fault", RUN_SPECS["closed_loop_fault"])["I_true_A"]
    add("PHY-08", "non-regression on playback/UI",
        "changing playback speed/page/cursor does not change Run data or hash",
        "NO - runtime environment",
        {"pure_function_recompute_identical": determinism},
        "N/A (runtime)", "n/a - needs a browser/runtime harness",
        ["this oracle can only prove that a pure function recomputes bit-identically; "
         "it cannot test the PlaybackClock/UI coupling or the SHA-256 canonicalisation "
         "rule required by V0.2 Sec.4.4/PHY-08"])

    # PHY-09 config change -> new run
    alt = compute_metrics("closed_loop", 9.0, FAULT_TIME_S)
    add("PHY-09", "config change immutability",
        "new parameters create a new Run; old Run content/ID unchanged",
        "NO - runtime/contract",
        {"example_bias_9A": {"E_bat_true_kWh": alt["E_bat_true_kWh"],
                             "SOC_err_pp": alt["SOC_err_pp"]},
         "observation": "bias_A 9 vs 10 changes end metrics (proves config sensitivity "
                        "only; registry immutability is not testable here)"},
        "N/A (contract/runtime)",
        "canonical JSON config_hash spec needed (field order, float serialisation)",
        ["Sec.5 does not define config_hash canonicalisation, run_id generation, or the "
         "immutability test harness; PHY-09 can only be closed in the run-registry layer"])

    # PHY-10 data integrity (subset decidable from this oracle)
    integrity = {"checks": [], "ok": True}
    for rid, run in runs.items():
        lens = {k: len(run[k]) for k in SIGNAL_NAMES if k in run}
        len_ok = all(v == N_SAMPLES for v in lens.values())
        t = run["t_s"]
        t_ok = (t[0] == 0.0 and t[-1] == DURATION_S
                and all(t[i + 1] > t[i] for i in range(len(t) - 1)))
        finite_ok = all(math.isfinite(v) for k in SIGNAL_NAMES if k in run
                        for v in run[k])
        item = {"run_id": rid, "lengths": lens, "length_601_ok": len_ok,
                "time_grid_ok": t_ok, "all_finite": finite_ok}
        integrity["checks"].append(item)
        integrity["ok"] = integrity["ok"] and len_ok and t_ok and finite_ok
    ev_ok = all(events[rid]["pre"]["phase"] == "pre"
                and events[rid]["post"]["phase"] == "post"
                and events[rid]["pre"]["t_s"] == FAULT_TIME_S
                and events[rid]["post"]["t_s"] == FAULT_TIME_S
                for rid in runs)
    integrity["events_pre_post_ok"] = ev_ok
    integrity["ok"] = integrity["ok"] and ev_ok
    add("PHY-10", "data integrity",
        "units, clock, variable lengths, event references, finite floats all pass",
        "PARTIAL - contract schema needed", integrity,
        "PASS (subset)" if integrity["ok"] else "FAIL",
        "subset observable here: 601 rows, strictly increasing time, finite floats, "
        "pre/post event rows; missing: unit dictionary, JSON Schema, CSV round-trip",
        ["the full PHY-10 needs a schema/unit catalogue that V0.2 Sec.6 only sketches; "
         "the numeric oracle can only sign off the sample-grid subset"])

    return checks


# =============================================================================
# Probes (contract-gap evidence, not acceptance criteria)
# =============================================================================
def probe_a_fault_time_semantics():
    base = compute_metrics("closed_loop", BIAS_A, 20.0)
    cases = []
    for tf in (20.0, 19.9, 19.95):
        i_f_round = int(round(tf / SAMPLE_DT_S))
        on_grid = abs(tf - i_f_round * SAMPLE_DT_S) <= GRID_ALIGN_TOL_S
        first_post = (i_f_round if on_grid
                      else int(math.floor(tf / SAMPLE_DT_S)) + 1)
        m = compute_metrics("closed_loop", BIAS_A, tf)
        rows = {idx: row_snapshot("closed_loop", BIAS_A, tf, idx)
                for idx in (198, 199, 200, 201)}
        # alternative semantics: treat an exactly-aligned event row as PRE
        alt_event_row = None
        if on_grid:
            ev_row = row_snapshot("closed_loop", BIAS_A, tf, i_f_round)
            alt_event_row = {
                "index": i_f_round,
                "I_true_A": ev_row["I_true_A"],
                # PRE semantics => bias not applied on the event row itself
                "I_meas_pre_semantics_A": ev_row["I_true_A"],
                "I_meas_post_semantics_A": ev_row["I_meas_A"],
            }
        cases.append({
            "fault_time_s": tf,
            "fault_index_round": i_f_round,
            "on_grid": on_grid,
            "first_post_index": first_post,
            "metrics": {k: m[k] for k in (
                "E_bat_true_kWh", "E_gen_true_kWh", "SOC_true_pct",
                "SOC_err_pp", "int_bias_A_s")},
            "delta_E_bat_vs_tf20_kWh": m["E_bat_true_kWh"] - base["E_bat_true_kWh"],
            "delta_SOC_true_vs_tf20_pp": m["SOC_true_pct"] - base["SOC_true_pct"],
            "delta_SOC_err_vs_tf20_pp": m["SOC_err_pp"] - base["SOC_err_pp"],
            "rows": {str(k): v for k, v in rows.items()},
            "alt_event_row_pre_semantics": alt_event_row,
        })
    return {
        "baseline_tf20": {k: base[k] for k in (
            "E_bat_true_kWh", "SOC_true_pct", "SOC_err_pp", "int_bias_A_s")},
        "cases": cases,
        "cumulative_sum_grid_risks": {
            "t_i_via_i_times_dt_200": 200 * SAMPLE_DT_S,
            "t_i_via_cumulative_sum_200": _cumulative_sum(200),
            "t_i_via_i_times_dt_600": 600 * SAMPLE_DT_S,
            "t_i_via_cumulative_sum_600": _cumulative_sum(600),
        },
    }


def _cumulative_sum(n):
    s = 0.0
    for _ in range(n):
        s += SAMPLE_DT_S
    return s


def probe_b_bias_sign():
    neg_metrics = compute_metrics("closed_loop", -BIAS_A, FAULT_TIME_S)
    pos_metrics = compute_metrics("closed_loop", BIAS_A, FAULT_TIME_S)
    transient = {}
    for t in (20.0, 20.1, 21.5, 30.0, 60.0):
        it = i_true_at(t, "closed_loop", -BIAS_A)
        im = it + (-BIAS_A)
        transient[str(t)] = {"I_true_A": it, "I_meas_A": im,
                             "P_bat_true_kW": KW_PER_A * it,
                             "r_meas_kW": KW_PER_A * (-BIAS_A)}
    sweep = []
    for b in (-60.0, -50.0, -25.0, -10.0, 0.0, 10.0, 25.0, 30.0, 40.0):
        i_ss = IREF_A - b
        p_bat = KW_PER_A * i_ss
        p_gen = PLOAD_SERVED_KW - p_bat
        i_meas_ss = i_ss + b     # = Iref: feedback drives measured back to 25 A
        sweep.append({
            "bias_A": b, "I_true_steady_A": i_ss, "P_bat_steady_kW": p_bat,
            "P_gen_steady_kW": p_gen, "I_meas_steady_A": i_meas_ss,
            "r_meas_steady_kW": KW_PER_A * b,
            "P_gen_non_negative": p_gen >= 0.0,
            "I_true_non_negative": i_ss >= 0.0,
        })
    event = event_snapshots("closed_loop", -BIAS_A)
    return {
        "metrics_bias_minus10": {k: neg_metrics[k] for k in (
            "E_bat_true_kWh", "E_gen_true_kWh", "E_bat_meas_kWh",
            "SOC_true_pct", "SOC_est_pct", "SOC_err_pp")},
        "metrics_bias_plus10": {k: pos_metrics[k] for k in (
            "E_bat_true_kWh", "SOC_err_pp")},
        "event_post_bias_minus10": event["post"],
        "transient": transient,
        "steady_state_sweep": sweep,
        "sign_sensitive_observations": {
            "PHY-02_post_diff_A": -BIAS_A,
            "PHY-07_SOC_err_pp": neg_metrics["SOC_err_pp"],
            "I_true_trend": "monotonically increasing 25 A -> 35 A",
            "I_meas_jump_at_20s_A": -BIAS_A,
            "model_self_consistent": True,
            "r_true_max_abs_kW": 0.0,
            "E_gen_plus_E_bat_kWh": (neg_metrics["E_gen_true_kWh"]
                                     + neg_metrics["E_bat_true_kWh"]),
            "all_finite": True,
        },
        "valid_range_note": ("derived bounds for a physically sane narrative: "
                             "P_gen=20+0.4*b >= 0 => b >= -50 A; "
                             "I_true_ss=25-b >= 0 => b <= 25 A"),
    }


def probe_c_dt_change():
    rows = []
    analytic = compute_metrics("closed_loop", BIAS_A)
    for h in (0.1, 0.05, 0.02):
        n = int(round(DURATION_S / h)) + 1
        i_f = int(round(FAULT_TIME_S / h))
        times = [i * h for i in range(n)]
        i_series = [i_true_at(t, "closed_loop", BIAS_A) for t in times]
        b_series = [BIAS_A if i >= i_f else 0.0 for i in range(n)]
        im_series = [i_series[i] + b_series[i] for i in range(n)]
        e_bat = KW_PER_A * trapz_arrays(i_series, times) / S_PER_H
        e_meas = KW_PER_A * trapz_arrays(im_series, times) / S_PER_H
        soc_true = SOC0_PCT - 100.0 * e_bat / EBAT_NOMINAL_KWH
        soc_est = SOC0_PCT - 100.0 * e_meas / EBAT_NOMINAL_KWH
        rows.append({
            "dt_s": h, "n_samples": n, "fault_index": i_f,
            "t_last_s": times[-1],
            "trapz601_style_E_bat_true_kWh": e_bat,
            "d_E_bat_vs_analytic_kWh": e_bat - analytic["E_bat_true_kWh"],
            "trapz_SOC_true_pct": soc_true,
            "trapz_SOC_err_pp": soc_est - soc_true,
            "d_SOC_err_vs_analytic_pp": (soc_est - soc_true) - analytic["SOC_err_pp"],
        })
    return {
        "analytic_metrics_independent_of_dt": {
            "E_bat_true_kWh": analytic["E_bat_true_kWh"],
            "E_bat_meas_kWh": analytic["E_bat_meas_kWh"],
            "SOC_true_pct": analytic["SOC_true_pct"],
            "SOC_est_pct": analytic["SOC_est_pct"],
            "SOC_err_pp": analytic["SOC_err_pp"],
        },
        "grid_cases": rows,
        "notes": [
            "analytic values do NOT depend on dt; a sampled-trapezoid implementation DOES",
            "601 points is only valid for dt=0.1 s; n = round(duration/dt)+1",
            "event row index = round(tf/dt) must be part of the frozen golden data",
            "dt must be part of config_hash / run identity; changing it invalidates golden",
        ],
    }


# =============================================================================
# Printing helpers
# =============================================================================
def fmt(x, digits=12):
    if x is None:
        return "-"
    if isinstance(x, bool):
        return "True" if x else "False"
    if isinstance(x, int):
        return str(x)
    if isinstance(x, str):
        return x
    ax = abs(float(x))
    if ax == 0.0:
        return "0"
    if ax >= 1e-3 and ax < 1e7:
        s = f"{x:.{digits}g}"
        return s
    return f"{x:.{digits}g}"


def print_table(headers, rows, aligns=None):
    rows = [[str(c) for c in r] for r in rows]
    aligns = aligns or ["l"] * len(headers)
    widths = [len(h) for h in headers]
    for r in rows:
        for i, c in enumerate(r):
            widths[i] = max(widths[i], len(c))

    def line(vals):
        return "  ".join(
            v.rjust(widths[i]) if aligns[i] == "r" else v.ljust(widths[i])
            for i, v in enumerate(vals))

    print(line(headers))
    print("  ".join("-" * w for w in widths))
    for r in rows:
        print(line(r))


# =============================================================================
# Main
# =============================================================================
def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Independent numeric oracle for FaultLab FL-001 (V0.2 Sec.5)")
    parser.add_argument("--json", metavar="PATH", default=None,
                        help="write machine-readable JSON to PATH")
    parser.add_argument("--print-json", action="store_true",
                        help="print machine-readable JSON to stdout")
    parser.add_argument("--no-fine", action="store_true",
                        help="skip h=1e-4 fine-grid integration (faster)")
    args = parser.parse_args(argv)
    fine = not args.no_fine

    # ---- build the three runs -------------------------------------------------
    runs = {rid: build_run(rid, spec) for rid, spec in RUN_SPECS.items()}

    # internal self-checks (bookkeeping, not product checks)
    self_checks = []
    self_ok = True

    def self_check(name, ok, detail):
        nonlocal self_ok
        self_checks.append({"name": name, "ok": bool(ok), "detail": detail})
        self_ok = self_ok and bool(ok)

    self_check("sample count = 601", N_SAMPLES == 601, {"n_samples": N_SAMPLES})
    self_check("t[0]=0, t[-1]=60, t[200]=20 exactly",
               TIME_GRID[0] == 0.0 and TIME_GRID[-1] == DURATION_S
               and TIME_GRID[FAULT_INDEX] == FAULT_TIME_S,
               {"t0": TIME_GRID[0], "t200": TIME_GRID[FAULT_INDEX],
                "t600": TIME_GRID[-1]})
    self_check("analytic metrics equal cumulative arrays at t=60",
               all(abs(run["metrics"]["E_bat_true_kWh"]
                       - run["E_bat_true_kWh_cum"][-1]) <= 1e-12
                   for run in runs.values()),
               {rid: abs(run["metrics"]["E_bat_true_kWh"]
                         - run["E_bat_true_kWh_cum"][-1])
                for rid, run in runs.items()})

    # ---- numeric cross-checks -------------------------------------------------
    crosschecks = {rid: numeric_crosscheck(spec["feedback_mode"], spec["bias_A"], fine)
                   for rid, spec in RUN_SPECS.items()}
    ode = rk4_closed_form_crosscheck()
    for rid, cc in crosschecks.items():
        self_check(f"Simpson h=1e-3 vs analytic integral ({rid})",
                   abs(cc["d_int_I_true_simpson_A_s"]) <= 1e-6,
                   cc["d_int_I_true_simpson_A_s"])
        if fine:
            self_check(f"event-aware trapz h=1e-4 vs analytic integral ({rid})",
                       abs(cc["d_int_I_true_fine_A_s"]) <= 1e-6,
                       cc["d_int_I_true_fine_A_s"])
    self_check("RK4 (h=1e-3) vs closed form max err <= 1e-9 A",
               ode["max_abs_err_A"] <= 1e-9, ode["max_abs_err_A"])
    self_check("closed-form ODE residual <= 1e-9 A",
               ode["max_ode_residual_A"] <= 1e-9, ode["max_ode_residual_A"])

    # ---- events ---------------------------------------------------------------
    events = {rid: event_snapshots(spec["feedback_mode"], spec["bias_A"])
              for rid, spec in RUN_SPECS.items()}

    # ---- document comparisons -------------------------------------------------
    doc_rows = evaluate_doc_golden_rows(runs)
    computed = _computed_map(runs)
    end_claims = evaluate_claims(DOC_END_CLAIMS, computed, "V0.2 Sec.5.3 closing")
    v01_cal = evaluate_claims(DOC_V01_CALIBRATION, computed, "V0.1 Sec.1 calibration")
    v01_ux = evaluate_claims(DOC_V01_UX, computed, "V0.1 Sec.11 UX")
    consistency = evaluate_v01_v02_pairs()
    completeness = []

    closed_m = runs["closed_loop_fault"]["metrics"]
    monitor_m = runs["monitor_only"]["metrics"]
    healthy_m = runs["healthy"]["metrics"]
    for label, value, unit in (
            ("closed E_bat_meas", closed_m["E_bat_meas_kWh"], "kWh"),
            ("closed SOC_est", closed_m["SOC_est_pct"], "%"),
            ("monitor E_bat_meas", monitor_m["E_bat_meas_kWh"], "kWh"),
            ("monitor SOC_est", monitor_m["SOC_est_pct"], "%"),
            ("monitor SOC_err", monitor_m["SOC_err_pp"], "pp"),
            ("healthy E_bat_meas", healthy_m["E_bat_meas_kWh"], "kWh"),
            ("healthy SOC_est", healthy_m["SOC_est_pct"], "%")):
        completeness.append({"label": label, "value": value, "unit": unit})

    # ---- PHY checks -----------------------------------------------------------
    phy = evaluate_phy(runs, events, crosschecks, ode, fine)

    # ---- probes ---------------------------------------------------------------
    probes = {
        "A_fault_time_semantics": probe_a_fault_time_semantics(),
        "B_bias_sign": probe_b_bias_sign(),
        "C_dt_change": probe_c_dt_change(),
    }

    # ---- summaries ------------------------------------------------------------
    rows_pass = sum(1 for r in doc_rows if r["verdict"] == "PASS")
    cells_pass = sum(1 for r in doc_rows for c in r["cells"] if c["verdict"] == "PASS")
    cells_total = sum(len(r["cells"]) for r in doc_rows)
    end_pass = sum(1 for c in end_claims if c["verdict"] == "PASS")
    v01_pass = sum(1 for c in v01_cal if c["verdict"] == "PASS")
    ux_pass = sum(1 for c in v01_ux if c["verdict"] == "PASS")
    cons_pass = sum(1 for c in consistency if c["verdict"] == "PASS")
    phy_pass = sum(1 for c in phy if c["verdict"].startswith("PASS"))
    phy_na = sum(1 for c in phy if c["verdict"].startswith("N/A"))
    phy_fail = sum(1 for c in phy if c["verdict"] == "FAIL")
    doc_fail = (sum(1 for r in doc_rows if r["verdict"] == "FAIL")
                + sum(1 for c in end_claims if c["verdict"] == "FAIL")
                + sum(1 for c in v01_ux if c["verdict"] == "FAIL"))
    failures = doc_fail + phy_fail
    exit_code = 2 if not self_ok else (0 if failures == 0 else 1)

    # =========================================================================
    # Print report
    # =========================================================================
    print("=" * 100)
    print("FL-001 independent numeric oracle (numeric-oracle) | FaultLab V0.2 Sec.5.1/Sec.5.2/Sec.5.3/Sec.5.5")
    print(f"python {sys.version.split()[0]} | dt={SAMPLE_DT_S} s | samples={N_SAMPLES} "
          f"(index 0..{N_SAMPLES - 1}) | fault index={FAULT_INDEX} | "
          f"event on grid={TIME_GRID[FAULT_INDEX] == FAULT_TIME_S}")
    print("method: [ANALYTIC] Sec.5.2 closed form + [NUMERIC] Simpson h=1e-3 / "
          "event-aware trapz h=1e-4 / trapz 601 grid")
    print("independence: equations re-implemented from Sec.5.2; doc numbers are comparison "
          "targets only [DOC]")
    print("scope: analytical-model INTERNAL CONSISTENCY only; this does NOT validate the "
          "model against real hardware, and PHY-08/09 are runtime/contract items")
    print("=" * 100)

    # [1] Sec.5.3 rows
    print("\n[1] V0.2 Sec.5.3 GOLDEN TABLE RECOMPUTATION  [DOC] vs [ANALYTIC]")
    headers = ["row", "signal", "doc", "computed", "abs_diff", "rel_diff",
               "tol", "dec", "verdict"]
    table = []
    for row in doc_rows:
        for cell in row["cells"]:
            table.append([
                row["label"], cell["signal"], fmt(cell["doc_value"]),
                fmt(cell["computed"]), fmt(cell["abs_diff"]),
                fmt(cell["rel_diff"]), fmt(cell["tolerance"]),
                str(cell["decimals"]), cell["verdict"]])
        table.append([row["label"], "(row verdict: " + row["verdict"] + ")",
                      "", "", "", "", "", "", ""])
    print_table(headers, table,
                aligns=["l", "l", "r", "r", "r", "r", "r", "r", "l"])
    print(f"\n  rows PASS: {rows_pass}/{len(doc_rows)} | cells PASS: {cells_pass}/{cells_total}")
    print("  NOTE: the Sec.5.3 table has 6 data rows (+header); the task brief says 7 lines.")
    for row in doc_rows:
        if row["verdict"] == "PASS" and row["label"] == "closed t=60s":
            i = row["index"]
            run = runs["closed_loop_fault"]
            print(f"  exact analytic t=60 row: I_true={run['I_true_A'][i]!r} A, "
                  f"I_meas={run['I_meas_A'][i]!r} A, "
                  f"P_bat={run['P_bat_true_kW'][i]!r} kW, "
                  f"P_gen={run['P_gen_true_kW'][i]!r} kW")

    # [2] closing paragraph
    print("\n[2] V0.2 Sec.5.3 CLOSING-PARAGRAPH CLAIMS  [DOC] vs [ANALYTIC]")
    print_table(["claim (key)", "unit", "doc", "computed", "abs_diff", "rel_diff",
                 "tol", "verdict"],
                [[c["key"], c["unit"], fmt(c["doc_value"]), fmt(c["computed"]),
                  fmt(c["abs_diff"]), fmt(c["rel_diff"]), fmt(c["tolerance"]),
                  c["verdict"]] for c in end_claims],
                aligns=["l", "l", "r", "r", "r", "r", "r", "l"])
    print(f"\n  claims PASS: {end_pass}/{len(end_claims)}")
    print("\n[2b] COMPLETENESS: values required by V0.1 Sec.7.3 but ABSENT from V0.2 Sec.5.3")
    print_table(["quantity", "computed value", "unit", "in Sec.5.3?"],
                [[c["label"], fmt(c["value"]), c["unit"], "NO"] for c in completeness],
                aligns=["l", "r", "l", "l"])

    # [3] V0.1
    print("\n[3] V0.1 Sec.1/Sec.11 CROSS-CHECK  (V0.1 [DOC] vs [ANALYTIC])")
    print_table(["claim", "unit", "doc", "computed", "abs_diff", "tol", "verdict"],
                [[c["key"], c["unit"], fmt(c["doc_value"]), fmt(c["computed"]),
                  fmt(c["abs_diff"]), fmt(c["tolerance"]), c["verdict"]]
                 for c in v01_cal + v01_ux],
                aligns=["l", "l", "r", "r", "r", "r", "l"])
    print(f"\n  V0.1 Sec.1 claims PASS: {v01_pass}/{len(v01_cal)} | "
          f"V0.1 Sec.11 UX claims PASS: {ux_pass}/{len(v01_ux)}")
    print("\n[3b] V0.1 vs V0.2 presentation consistency ([DOC] vs [DOC])")
    print_table(["quantity", "V0.1", "V0.2", "abs_diff", "coarser-display tol", "verdict"],
                [[c["label"], fmt(c["v01"]), fmt(c["v02"]), fmt(c["abs_diff"]),
                  fmt(c["tolerance"]), c["verdict"]] for c in consistency],
                aligns=["l", "r", "r", "r", "r", "l"])
    print(f"\n  consistent pairs: {cons_pass}/{len(consistency)} "
          "(no numeric conflict; display precision differs)")

    # [4] energy cross-validation
    print("\n[4] ENERGY/SOC CROSS-VALIDATION  [ANALYTIC] vs [NUMERIC]")
    for rid in ("healthy", "closed_loop_fault", "monitor_only"):
        cc = crosschecks[rid]
        a = cc["analytic"]
        s = cc["simpson"]
        f = cc["fine"]
        g = cc["grid"]
        rows4 = []
        quantities = [
            ("E_bat_true_kWh", "kWh"),
            ("E_gen_true_kWh", "kWh"),
            ("E_bat_meas_kWh", "kWh"),
            ("SOC_true_pct", "%"),
            ("SOC_est_pct", "%"),
            ("SOC_err_pp", "pp"),
        ]
        for key, unit in quantities:
            base = a[key]
            d_sim = s[key] - base
            d_fine = (f[key] - base) if f is not None else None
            d_grid = g[key] - base
            rows4.append([key, unit, fmt(base), fmt(s[key]), fmt(d_sim),
                          fmt(f[key]) if f is not None else "skipped",
                          fmt(d_fine), fmt(g[key]), fmt(d_grid)])
        print(f"\n  run: {rid}  (feedback_mode={cc['feedback_mode']}, bias={cc['bias_A']} A)")
        print_table(["quantity", "unit", "analytic", "Simpson h=1e-3", "d_simpson",
                     "trapz h=1e-4 (event-aware)", "d_fine",
                     "trapz 601 grid (h=0.1)", "d_grid"],
                    rows4,
                    aligns=["l", "l", "r", "r", "r", "r", "r", "r", "r"])
    print("\n  integration-rule gap on the closed-loop run (the number that matters for PHY-06/07):")
    cc = crosschecks["closed_loop_fault"]
    print(f"    E_bat_true: analytic={fmt(cc['analytic']['E_bat_true_kWh'])} kWh, "
          f"trapz601={fmt(cc['grid']['E_bat_true_kWh'])} kWh, "
          f"gap={fmt(cc['d_E_bat_true_grid_kWh'])} kWh")
    print(f"    E_bat_meas: analytic={fmt(cc['analytic']['E_bat_meas_kWh'])} kWh, "
          f"trapz601={fmt(cc['grid']['E_bat_meas_kWh'])} kWh, "
          f"gap={fmt(cc['d_E_bat_meas_grid_kWh'])} kWh")
    print(f"    SOC_err:    analytic={fmt(cc['analytic']['SOC_err_pp'])} pp, "
          f"trapz601={fmt(cc['grid']['SOC_err_pp'])} pp, "
          f"gap={fmt(cc['d_SOC_err_grid_pp'])} pp")

    # [4b] ODE
    print("\n[4b] ODE CROSS-CHECK: closed form solves tau*dI/dt + I = Iref - b")
    print(f"  RK4 h={ode['rk4_h_s']} s vs closed form: max |err| = "
          f"{fmt(ode['max_abs_err_A'])} A")
    for key in ("21.5", "26.0", "60.0"):
        pass
    for k, v in ode["samples"].items():
        print(f"    t={k}: rk4={fmt(v['rk4_A'])} A, analytic={fmt(v['analytic_A'])} A, "
              f"err={fmt(v['abs_err_A'])} A")
    print(f"  closed-form ODE residual on all 601 rows: max = "
          f"{fmt(ode['max_ode_residual_A'])} A")

    # [5] events
    print("\n[5] EVENT SNAPSHOTS (Sec.5.4): t=20- left limit vs t=20+ post")
    table5 = []
    for rid in ("healthy", "closed_loop_fault", "monitor_only"):
        ev = events[rid]
        for phase in ("pre", "post"):
            s = ev[phase]
            table5.append([rid, phase, fmt(s["t_s"]), fmt(s["I_true_A"]),
                           fmt(s["bias_A"]), fmt(s["I_meas_A"]),
                           fmt(s["P_bat_true_kW"]), fmt(s["P_bat_meas_kW"]),
                           fmt(s["P_gen_true_kW"]), fmt(s["r_true_kW"]),
                           fmt(s["r_meas_kW"])])
    print_table(["run", "phase", "t_s", "I_true_A", "bias_A", "I_meas_A",
                 "P_bat_true_kW", "P_bat_meas_kW", "P_gen_true_kW",
                 "r_true_kW", "r_meas_kW"],
                table5,
                aligns=["l", "l", "r", "r", "r", "r", "r", "r", "r", "r", "r"])
    ev = events["closed_loop_fault"]
    print(f"\n  I_true continuity: |post-pre| = "
          f"{fmt(abs(ev['post']['I_true_A'] - ev['pre']['I_true_A']))} A")
    print(f"  I_meas jump: post-pre = "
          f"{fmt(ev['post']['I_meas_A'] - ev['pre']['I_meas_A'])} A "
          f"(configured bias = {fmt(BIAS_A)} A)")
    print("  regular rows: row 199 (t=19.9) I_meas="
          f"{fmt(runs['closed_loop_fault']['I_meas_A'][FAULT_INDEX - 1])} A, "
          "row 200 (t=20.0, post) I_meas="
          f"{fmt(runs['closed_loop_fault']['I_meas_A'][FAULT_INDEX])} A")

    # [6] PHY
    print("\n[6] PHY-01..PHY-10  (documented condition vs observed)")
    print_table(["id", "check", "decidable", "verdict", "proposed tolerance"],
                [[c["check_id"], c["name"], c["decidable"], c["verdict"],
                  c["proposed_tolerance"]] for c in phy],
                aligns=["l", "l", "l", "l", "l"])
    print(f"\n  PHY decidable PASS: {phy_pass} | N/A (runtime/contract): {phy_na} | "
          f"FAIL: {phy_fail}")
    for c in phy:
        print(f"  {c['check_id']} observed: {json.dumps(c['observed'], ensure_ascii=True, default=str)[:300]}")

    # [7] probes
    print("\n[7] PROBES (contract-gap evidence; NOT acceptance criteria)")
    pa = probes["A_fault_time_semantics"]
    print("\n  A) fault_time grid semantics: 20.0 s vs 19.9 s vs 19.95 s")
    print_table(["fault_time_s", "fault_index", "on_grid", "first_post_idx",
                 "E_bat_true_kWh", "d_E_bat_vs_tf20", "SOC_true_pct",
                 "d_SOC_true_pp", "SOC_err_pp", "d_SOC_err_pp"],
                [[fmt(c["fault_time_s"]), str(c["fault_index_round"]),
                  str(c["on_grid"]), str(c["first_post_index"]),
                  fmt(c["metrics"]["E_bat_true_kWh"]),
                  fmt(c["delta_E_bat_vs_tf20_kWh"]),
                  fmt(c["metrics"]["SOC_true_pct"]),
                  fmt(c["delta_SOC_true_vs_tf20_pp"]),
                  fmt(c["metrics"]["SOC_err_pp"]),
                  fmt(c["delta_SOC_err_vs_tf20_pp"])]
                 for c in pa["cases"]],
                aligns=["r", "r", "l", "r", "r", "r", "r", "r", "r", "r"])
    for c in pa["cases"]:
        rows = c["rows"]
        print(f"    tf={fmt(c['fault_time_s'])}: row199 -> I_true={fmt(rows['199']['I_true_A'])} A, "
              f"I_meas={fmt(rows['199']['I_meas_A'])} A; row200 -> "
              f"I_true={fmt(rows['200']['I_true_A'])} A, "
              f"I_meas={fmt(rows['200']['I_meas_A'])} A")
        if c["alt_event_row_pre_semantics"]:
            ae = c["alt_event_row_pre_semantics"]
            print(f"      if event row {ae['index']} is treated as PRE: "
                  f"I_meas={fmt(ae['I_meas_pre_semantics_A'])} A "
                  f"(vs {fmt(ae['I_meas_post_semantics_A'])} A as POST)")
    csr = pa["cumulative_sum_grid_risks"]
    print(f"    grid risks: 200*dt={csr['t_i_via_i_times_dt_200']!r} vs "
          f"cumulative-sum={csr['t_i_via_cumulative_sum_200']!r}; "
          f"600*dt={csr['t_i_via_i_times_dt_600']!r} vs "
          f"cumulative-sum={csr['t_i_via_cumulative_sum_600']!r}")

    pb = probes["B_bias_sign"]
    print("\n  B) negative bias (b=-10 A): model self-consistency vs sign-sensitive checks")
    print_table(["quantity", "value"],
                [["E_bat_true_kWh", fmt(pb["metrics_bias_minus10"]["E_bat_true_kWh"])],
                 ["E_gen_true_kWh", fmt(pb["metrics_bias_minus10"]["E_gen_true_kWh"])],
                 ["E_bat_meas_kWh", fmt(pb["metrics_bias_minus10"]["E_bat_meas_kWh"])],
                 ["SOC_true_pct", fmt(pb["metrics_bias_minus10"]["SOC_true_pct"])],
                 ["SOC_est_pct", fmt(pb["metrics_bias_minus10"]["SOC_est_pct"])],
                 ["SOC_err_pp", fmt(pb["metrics_bias_minus10"]["SOC_err_pp"])],
                 ["PHY-02 post diff (A)", "-10 (fails a hard-coded +10 check)"],
                 ["PHY-07 SOC_err_pp", fmt(pb["metrics_bias_minus10"]["SOC_err_pp"])],
                 ["r_true max abs (kW)", fmt(pb["sign_sensitive_observations"]["r_true_max_abs_kW"])],
                 ["E_gen+E_bat (kWh)", fmt(pb["sign_sensitive_observations"]["E_gen_plus_E_bat_kWh"])]],
                aligns=["l", "r"])
    print("    steady-state sweep (feedback drives I_meas back to Iref=25 A):")
    print_table(["bias_A", "I_true_ss", "P_bat_ss", "P_gen_ss", "I_meas_ss",
                 "r_meas_ss", "P_gen>=0", "I_true>=0"],
                [[fmt(s["bias_A"]), fmt(s["I_true_steady_A"]),
                  fmt(s["P_bat_steady_kW"]), fmt(s["P_gen_steady_kW"]),
                  fmt(s["I_meas_steady_A"]), fmt(s["r_meas_steady_kW"]),
                  str(s["P_gen_non_negative"]), str(s["I_true_non_negative"])]
                 for s in pb["steady_state_sweep"]],
                aligns=["r", "r", "r", "r", "r", "r", "l", "l"])
    print(f"    derived sane narrative range: {pb['valid_range_note']}")

    pc = probes["C_dt_change"]
    print("\n  C) dt change: '601 points' is a dt=0.1 assumption, not a constant")
    print_table(["dt_s", "n_samples", "fault_index", "t_last_s",
                 "trapz E_bat_true_kWh", "d_E_bat_vs_analytic",
                 "trapz SOC_err_pp", "d_SOC_err_vs_analytic_pp"],
                [[fmt(r["dt_s"]), str(r["n_samples"]), str(r["fault_index"]),
                  fmt(r["t_last_s"]), fmt(r["trapz601_style_E_bat_true_kWh"]),
                  fmt(r["d_E_bat_vs_analytic_kWh"]), fmt(r["trapz_SOC_err_pp"]),
                  fmt(r["d_SOC_err_vs_analytic_pp"])] for r in pc["grid_cases"]],
                aligns=["r", "r", "r", "r", "r", "r", "r", "r"])
    print(f"    analytic (dt-independent): E_bat_true="
          f"{fmt(pc['analytic_metrics_independent_of_dt']['E_bat_true_kWh'])} kWh, "
          f"SOC_err="
          f"{fmt(pc['analytic_metrics_independent_of_dt']['SOC_err_pp'])} pp")

    # [8] summary
    print("\n[8] SUMMARY")
    print(f"  Sec.5.3 rows: {rows_pass}/{len(doc_rows)} PASS | "
          f"Sec.5.3 end claims: {end_pass}/{len(end_claims)} PASS | "
          f"V0.1 claims: {v01_pass + ux_pass}/{len(v01_cal) + len(v01_ux)} PASS | "
          f"V0.1-V0.2 consistency: {cons_pass}/{len(consistency)}")
    print(f"  PHY decidable PASS: {phy_pass} | PHY N/A: {phy_na} | "
          f"PHY FAIL: {phy_fail} | doc FAIL: {doc_fail}")
    print(f"  internal self-checks: "
          f"{sum(1 for c in self_checks if c['ok'])}/{len(self_checks)} OK")
    for c in self_checks:
        if not c["ok"]:
            print(f"    SELF-CHECK FAILED: {c['name']} -> {c['detail']}")
    print(f"  EXIT CODE: {exit_code} "
          f"({'all decidable checks pass' if exit_code == 0 else 'FAILURES PRESENT'})")

    # ---- JSON ----------------------------------------------------------------
    slim_runs = {}
    for rid, run in runs.items():
        slim_runs[rid] = {
            "feedback_mode": run["feedback_mode"],
            "bias_A": run["bias_A"],
            "metrics": run["metrics"],
            "crosscheck": crosschecks[rid],
            "events": events[rid],
            "r_true_max_abs_kW": max(abs(x) for x in run["r_true_kW"]),
            "r_meas_post_max_abs_kW": max(
                abs(run["r_meas_kW"][i]) for i in range(FAULT_INDEX, N_SAMPLES)),
            "n_samples": len(run["t_s"]),
        }
    result = {
        "oracle_id": "numeric-oracle",
        "model_id": "FL-001",
        "reviewed_scope": "V0.2 Sec.5.1/Sec.5.2 model, Sec.5.3 golden sample, Sec.5.5 PHY-01..PHY-10",
        "independence": "doc numbers used only as comparison targets; no REVIEWS read",
        "method": "analytic closed form + Simpson h=1e-3 + event-aware trapz h=1e-4 "
                  "+ trapz on 601 grid",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "python_version": sys.version.split()[0],
        "config": {
            "duration_s": DURATION_S, "sample_dt_s": SAMPLE_DT_S,
            "n_samples": N_SAMPLES, "fault_time_s": FAULT_TIME_S,
            "fault_index": FAULT_INDEX, "bias_A": BIAS_A, "Vdc_V": VDC_V,
            "Iref_A": IREF_A, "tau_s": TAU_S,
            "Pload_demand_kW": PLOAD_DEMAND_KW,
            "Pload_served_kW": PLOAD_SERVED_KW,
            "Ebat_nominal_kWh": EBAT_NOMINAL_KWH, "SOC0_pct": SOC0_PCT,
        },
        "self_checks": self_checks,
        "runs": slim_runs,
        "doc_golden_rows": doc_rows,
        "doc_end_claims": end_claims,
        "doc_v01_calibration": v01_cal,
        "doc_v01_ux": v01_ux,
        "doc_v01_v02_consistency": consistency,
        "completeness_gaps": completeness,
        "ode_crosscheck": ode,
        "phy_checks": phy,
        "probes": probes,
        "summary": {
            "doc_golden_rows_pass": rows_pass,
            "doc_golden_rows_total": len(doc_rows),
            "doc_golden_cells_pass": cells_pass,
            "doc_golden_cells_total": cells_total,
            "doc_end_claims_pass": end_pass,
            "doc_end_claims_total": len(end_claims),
            "v01_claims_pass": v01_pass + ux_pass,
            "v01_claims_total": len(v01_cal) + len(v01_ux),
            "v01_v02_consistency_pass": cons_pass,
            "v01_v02_consistency_total": len(consistency),
            "phy_pass": phy_pass,
            "phy_not_decidable": phy_na,
            "phy_fail": phy_fail,
            "doc_fail": doc_fail,
            "failures": failures,
            "exit_code": exit_code,
        },
    }
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(result, fh, ensure_ascii=False, indent=2)
        print(f"\nJSON written to: {args.json}")
    if args.print_json:
        print("\n--- JSON_BEGIN ---")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("--- JSON_END ---")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
