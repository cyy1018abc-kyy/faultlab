# -*- coding: utf-8 -*-
"""fc001_oracle.py — FC-001 独立解析 oracle（P1-06 修复清单 / G2b-lite，2026-10-28）

独立性声明（与 fl001_oracle.py 同规，MODEL_VALIDATION_SPEC §6.3 类推）：
  1. 不 import / 复制 src/**；方程与参数唯一权威文本是 DECISIONS.md G0-DEC-15 的 FC-001 修复
     清单（SOC_true_end=59.4755556%、SOC_est_end=59.5866667%，含 τ_fc 过渡尾项）与
     docs/CONTRACT.md §5.2（只读参照），此处独立硬编码。
  2. 不与产品 engine 共享公式常量；golden 只能由本 oracle（经 emit_golden.py fc001）生成。
  3. 自带自检（SC-1…SC-7），失败 exit 2。

模型（FC-001 L0 行为级；电堆=受控一阶电流源，电池=理想平衡缓冲）：
  EQ-1  b(t) = 0 (t < 20.0)；b(t) = +10 A (t ≥ 20.0)
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

关键全精度值（闭环故障，与批准修复清单一致）：
  ∫I_fc(0..60) = 50·20 + 40·40 + 10·1.2·(1−e^{−40/1.2}) = 2612 − 12·e^{−40/1.2} A·s
  E_fc = 0.4·∫I_fc/3600 = 1044.8/3600 kWh（显示 0.290222）
  ∫P_bat = 1800 − 1044.8 = 755.2 kW·s → SOC_true_end = 60 − 755.2/1440 = 59.4755556 %
  ∫P_bat,est = 1800 − 0.4·(2612+400) = 595.2 kW·s → SOC_est_end = 59.5866667 %
  SOC_err = +0.1111111 pp（正号；估计放电偏少 → 估计 SOC 偏高）

Python 3 标准库；无第三方依赖；不访问网络。
"""

import hashlib
import json
import math
import platform
import sys

DURATION_S = 60.0
DT_S = 0.1
T_F = 20.0
BIAS_A = 10.0
V_KW_PER_A = 0.4
I_FC_REF_A = 50.0
TAU_FC_S = 1.2
PLOAD_KW = 30.0
EBAT_KWH = 40.0
SOC0_PCT = 60.0

N_SAMPLES = int(round(DURATION_S / DT_S)) + 1
I_F = int(round(T_F / DT_S))
METHOD_ID = "analytic_flux"
METHOD_VERSION = "analytic_flux.1"

SERIES_IDS = [
    "t", "I_fc_true_A", "I_fc_meas_A", "bias_A",
    "P_fc_true_kW", "P_fc_meas_kW", "I_bat_true_A",
    "P_bat_true_kW", "P_bat_est_kW",
    "P_load_demand_kW", "P_load_served_kW",
    "SOC_true_pct", "SOC_est_pct", "r_true_kW", "r_meas_kW",
]

RUNS = [
    {"key": "healthy", "role": "baseline", "feedback_mode": "closed_loop", "faulted": False},
    {"key": "closed_loop_fault", "role": "fault", "feedback_mode": "closed_loop", "faulted": True},
    {"key": "monitor_only", "role": "monitor", "feedback_mode": "monitor", "faulted": True},
]


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


def simulate_run(spec):
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
        col["bias_A"][i] = b
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
            "faulted": faulted, "series": series, "events": events,
            "scalars": scalars, "metrics": metrics}


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
        checks.append({"check_id": cid, "status": "pass" if ok_ else "fail",
                       "observed": observed, "tolerance": tolerance, "note": note})

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
    rec("SC-6-grid-finite", ok_grid, "3×601 点", "严格递增 + 有限", "时间网格与有限值")

    # SC-7：批准修复清单数值（G0-DEC-15：SOC 末值含 τ_fc 过渡尾项）
    cl = run["scalars"]
    ok_fix = (abs(cl["SOC_true_end_pct"] - 59.4755556) < 1e-6
              and abs(cl["SOC_est_end_pct"] - 59.5866667) < 1e-6
              and abs(cl["SOC_err_end_pp"] - 0.1111111) < 1e-6)
    rec("SC-7-approved-soc", ok_fix,
        "SOC_true=%.7f SOC_est=%.7f SOC_err=%+.7f" % (
            cl["SOC_true_end_pct"], cl["SOC_est_end_pct"], cl["SOC_err_end_pp"]),
        "59.4755556 / 59.5866667 / +0.1111111", "G0-DEC-15 修复清单数值")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


TOLERANCES = {
    "gate": {
        "E_kWh": 1e-6, "SOC_pp": 1e-5, "I_A_rtol": 1e-12, "I_A_atol": 1e-15,
        "P_kW_rtol": 1e-12, "P_kW_atol": 1e-15, "r_true_kW": 1e-12,
        "r_meas_kW_atol": 1e-9, "t_s": 1e-9,
    },
}


def build_golden():
    runs = {}
    for spec in RUNS:
        r = simulate_run(spec)
        runs[r["key"]] = {
            "role": r["role"],
            "feedback_mode": r["feedback_mode"],
            "fault": ({"family": "sensor_drift", "fault_id": "I_fc_sensor_bias",
                       "t_start_s": T_F, "bias_A": BIAS_A} if r["faulted"] else None),
            "events": r["events"],
            "scalars": r["scalars"],
            "metrics": r["metrics"],
            "series": r["series"],
        }
    return {
        "golden_schema_version": "v1",
        "golden_id": "fc001_v1",
        "model_id": "FC-001",
        "model_version": "1.0.0",
        "schema_version": "1.0.0",
        "engine_baseline": None,
        "method_id": METHOD_ID,
        "method_version": METHOD_VERSION,
        "units": {"I": "A", "P": "kW", "E": "kWh", "t": "s", "SOC": "%", "SOC_err": "pp"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T_F, "bias_A": BIAS_A,
            "I_fc_ref_A": I_FC_REF_A, "tau_fc_s": TAU_FC_S,
            "Pload_kW": PLOAD_KW, "Pbat_ref_kW": 10.0,
            "Ebat_kWh": EBAT_KWH, "SOC0_pct": SOC0_PCT,
            "soc_estimator": "ems_power_balance_estimate (A-fc-soc-est)",
            "feedback_modes": ["closed_loop", "monitor"],
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": I_F, "t_0": 0.0, "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": TOLERANCES,
        "basis": "DECISIONS.md G0-DEC-15 FC-001 修复清单（SOC 末值含 τ_fc 过渡尾项）+ docs/CONTRACT.md §5.2（只读参照）；G2b-lite 记录见 NEXT/evidence/g4/fc001-g2b-lite.md",
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
    import os
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "fc001_oracle.py")


def _oracle_source_sha256():
    with open(oracle_source_path(), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def main(argv):
    if len(argv) >= 2 and argv[1] == "--self-check":
        ok, checks = self_check()
        print(json.dumps({"ok": ok, "checks": checks}, ensure_ascii=False, indent=2))
        return 0 if ok else 2
    print(json.dumps(build_golden(), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
