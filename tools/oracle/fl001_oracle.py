# -*- coding: utf-8 -*-
"""fl001_oracle.py — FL-001 独立解析 oracle（G2 四件套之一，MODEL_VALIDATION_SPEC §6）

独立性声明（违反即 golden 无效，§6.3）：
  1. 本文件不 import / 不复制 src/** 任何模块或常量；方程与参数唯一权威文本是
     FaultLab-evaluation/NEXT/MODEL_VALIDATION_SPEC.md §1.2/§1.3，此处独立硬编码。
  2. 本文件不与产品 engine 共享任何公式常量模块。
  3. golden 只能由本 oracle（经 emit_golden.py）生成；产品 engine 对 golden 只读比对。
  4. 本文件自带自检（Simpson / RK4 / 恒等式），自检失败由调用方以 exit 2 报告。

模型（L0 解析/行为级，仅 6 条解析式 + 1 个理想功率平衡）：
  EQ-1  b(t) = 0 (t < 20.0)；b(t) = +10 A (t ≥ 20.0)               [阶跃，不连续]
  EQ-2  I_meas(t) = I_true(t) + b(t)                                [定义]
  EQ-3  闭环: tau·dI_true/dt + I_true = I_ref − b(t), I_true(0)=25, tau=1.5 s
              t < 20.0 : I_true = 25 A
              t ≥ 20.0 : I_true = 15 + 10·exp(−(t−20)/1.5) A
        仅监测: I_true ≡ 25 A；无故障: b ≡ 0 的闭环特例 ⇒ I_true ≡ 25 A
  EQ-4  P_bat,true = 0.4·I_true；P_bat,meas = 0.4·I_meas；P_load = 30 kW；
        P_gen,true := P_load,served − P_bat,true（理想瞬时平衡源）
  EQ-5  r_true = P_gen,true + P_bat,true − P_load,served ≡ 0（定义恒等式）
        r_meas = P_gen,true + P_bat,meas − P_load,served ≡ 0.4·b(t)
  EQ-6  SOC_true(t) = 60 − 100·(1/40)·∫[0,t] P_bat,true(s)/3600 ds（单位 %）
        SOC_est(t)  = 60 − 100·(1/40)·∫[0,t] P_bat,meas(s)/3600 ds（单位 %）
        SOC_err_pp(t) = SOC_est(t) − SOC_true(t)（单位百分点 pp，不得写成 %）

时间网格：t[i] = i * dt（i·dt 的 IEEE-754 double 积，禁止累加）；
  i_f = round(t_f/dt) = 200；t[200] = 20.0 为 post 语义；20.0− 左极限只存在于事件快照。
积分：解析（事件感知）闭式积分，method_id = analytic_flux。

Python 3 标准库；无第三方依赖；不访问网络。
"""

import hashlib
import json
import math
import platform
import sys

# ---------------------------------------------------------------------------
# 冻结参数（MODEL_VALIDATION_SPEC §1.2，P0 G0-DEC-04；任何变更须重建 golden）
# ---------------------------------------------------------------------------
DURATION_S = 60.0
DT_S = 0.1
T_F = 20.0
BIAS_A = 10.0
VDC_V = 400.0
IREF_A = 25.0
TAU_S = 1.5
PLOAD_KW = 30.0
EBAT_KWH = 40.0
SOC0_PCT = 60.0

N_SAMPLES = int(round(DURATION_S / DT_S)) + 1   # 601（由参数派生，不硬编码字面 601 语义）
I_F = int(round(T_F / DT_S))                     # 200
V_KW_PER_A = VDC_V / 1000.0                      # 0.4 kW/A

METHOD_ID = "analytic_flux"
METHOD_VERSION = "analytic_flux.1"

SERIES_IDS = [
    "t", "I_bat_true_A", "I_bat_meas_A", "bias_A",
    "P_bat_true_kW", "P_bat_meas_kW", "P_gen_true_kW",
    "P_load_demand_kW", "P_load_served_kW",
    "SOC_true_pct", "SOC_est_pct", "r_true_kW", "r_meas_kW",
]


# ---------------------------------------------------------------------------
# 解析式（EQ-1…EQ-6 的事件感知闭式实现）
# ---------------------------------------------------------------------------
def b_at(t, faulted):
    """EQ-1：阶跃偏置。t = t_f 处取右极限（post 采样行语义）。"""
    if faulted and t >= T_F:
        return BIAS_A
    return 0.0


def i_true_at(t, feedback_mode, faulted):
    """EQ-3：真实电流闭式解（采样行值，t=t_f 为 post）。"""
    if not faulted:
        return IREF_A
    if feedback_mode == "monitor":
        return IREF_A
    if t < T_F:
        return IREF_A
    u = t - T_F
    return (IREF_A - BIAS_A) + BIAS_A * math.exp(-u / TAU_S)


def i_true_derivative_at(t, feedback_mode, faulted):
    """EQ-3 的闭式导数（用于 ODE 残差自检）：t<t_f 导数 0；t≥t_f 为 −(b/tau)·e^(−u/tau)。"""
    if not faulted or feedback_mode == "monitor" or t < T_F:
        return 0.0
    u = t - T_F
    return -(BIAS_A / TAU_S) * math.exp(-u / TAU_S)


def int_i_true(x, feedback_mode, faulted):
    """∫[0,x] I_true dt 的解析（事件感知）积分；x≤t_f 或 monitor/healthy 时为 I_ref·x。"""
    if x <= 0.0:
        return 0.0
    if x <= T_F or not faulted or feedback_mode == "monitor":
        return IREF_A * x
    u = x - T_F
    # ∫[t_f,x] (I_ref−b) + b·e^(−(s−t_f)/tau) ds = (I_ref−b)·u + b·tau·(1−e^(−u/tau))
    return IREF_A * T_F + (IREF_A - BIAS_A) * u + BIAS_A * TAU_S * (1.0 - math.exp(-u / TAU_S))


def int_b(x, faulted):
    """∫[0,x] b dt（阶跃点测度为零，事件感知）。"""
    if not faulted or x <= T_F:
        return 0.0
    return BIAS_A * (x - T_F)


def soc_true_at(x, feedback_mode, faulted):
    """EQ-6：SOC_true(%)，解析积分路径。"""
    e_kws = V_KW_PER_A * int_i_true(x, feedback_mode, faulted)  # kW·s
    return SOC0_PCT - 100.0 * e_kws / (EBAT_KWH * 3600.0)


def soc_est_at(x, feedback_mode, faulted):
    """EQ-6：SOC_est(%)，按测量功率积分。"""
    e_kws = V_KW_PER_A * (int_i_true(x, feedback_mode, faulted) + int_b(x, faulted))
    return SOC0_PCT - 100.0 * e_kws / (EBAT_KWH * 3600.0)


# ---------------------------------------------------------------------------
# 三组固定 Run
# ---------------------------------------------------------------------------
RUNS = [
    {"key": "healthy", "role": "baseline", "feedback_mode": "closed_loop", "faulted": False},
    {"key": "closed_loop_fault", "role": "fault", "feedback_mode": "closed_loop", "faulted": True},
    {"key": "monitor_only", "role": "monitor", "feedback_mode": "monitor", "faulted": True},
]


def build_time_grid():
    """t[i] = i·dt（禁止累加；保留 IEEE-754 积的原始值，如 t[199]=19.900000000000002）。"""
    n = N_SAMPLES - 1
    return [i * DT_S for i in range(n + 1)]


def simulate_run(spec):
    """单组 Run 的 601 点全精度序列 + 事件快照 + 标量 + P0 指标。"""
    mode = spec["feedback_mode"]
    faulted = spec["faulted"]
    t = build_time_grid()

    col = {k: [0.0] * N_SAMPLES for k in SERIES_IDS if k != "t"}
    max_abs_r_true = 0.0
    max_abs_r_meas = 0.0
    for i, ti in enumerate(t):
        b = b_at(ti, faulted)
        i_true = i_true_at(ti, mode, faulted)
        i_meas = i_true + b
        p_bat = V_KW_PER_A * i_true
        p_bat_meas = V_KW_PER_A * i_meas
        p_gen = PLOAD_KW - p_bat          # EQ-4 理想平衡源定义
        r_true = p_gen + p_bat - PLOAD_KW  # EQ-5 定义恒等式（代数路径回归）
        r_meas = p_gen + p_bat_meas - PLOAD_KW
        col["I_bat_true_A"][i] = i_true
        col["I_bat_meas_A"][i] = i_meas
        col["bias_A"][i] = b
        col["P_bat_true_kW"][i] = p_bat
        col["P_bat_meas_kW"][i] = p_bat_meas
        col["P_gen_true_kW"][i] = p_gen
        col["P_load_demand_kW"][i] = PLOAD_KW
        col["P_load_served_kW"][i] = PLOAD_KW
        col["SOC_true_pct"][i] = soc_true_at(ti, mode, faulted)
        col["SOC_est_pct"][i] = soc_est_at(ti, mode, faulted)
        col["r_true_kW"][i] = r_true
        col["r_meas_kW"][i] = r_meas
        if abs(r_true) > max_abs_r_true:
            max_abs_r_true = abs(r_true)
        if abs(r_meas) > max_abs_r_meas:
            max_abs_r_meas = abs(r_meas)

    x_end = t[-1]
    e_bat_true = V_KW_PER_A * int_i_true(x_end, mode, faulted) / 3600.0
    e_bat_meas = V_KW_PER_A * (int_i_true(x_end, mode, faulted) + int_b(x_end, faulted)) / 3600.0
    e_gen = (PLOAD_KW * x_end - V_KW_PER_A * int_i_true(x_end, mode, faulted)) / 3600.0
    e_load = PLOAD_KW * x_end / 3600.0
    soc_true_end = soc_true_at(x_end, mode, faulted)
    soc_est_end = soc_est_at(x_end, mode, faulted)

    if faulted:
        i_true_20 = i_true_at(T_F, mode, faulted)
        focal_change = i_true_at(x_end, mode, faulted) - i_true_20
    else:
        focal_change = None  # 无故障运行不适用（value:null + unavailable_reason）

    metrics = {
        "E_bat_true_60s": {"value": e_bat_true, "unit": "kWh", "method": METHOD_ID},
        "E_gen_true_60s": {"value": e_gen, "unit": "kWh", "method": METHOD_ID},
        "E_load_served_60s": {"value": e_load, "unit": "kWh", "method": METHOD_ID},
        "SOC_true_end_pct": {"value": soc_true_end, "unit": "%", "method": METHOD_ID},
        "SOC_est_end_pct": {"value": soc_est_end, "unit": "%", "method": METHOD_ID},
        "SOC_err_end_pp": {"value": soc_est_end - soc_true_end, "unit": "pp", "method": METHOD_ID},
        "max_abs_r_true_kW": {"value": max_abs_r_true, "unit": "kW", "method": "algebraic"},
        "max_abs_r_meas_kW": {"value": max_abs_r_meas, "unit": "kW", "method": "algebraic"},
        "focal_change_A": {"value": focal_change, "unit": "A", "method": "analytic"},
        "I_true_26s_A": {"value": i_true_at(26.0, mode, faulted), "unit": "A", "method": "analytic"},
        "I_meas_20post_A": {"value": i_true_at(T_F, mode, faulted) + b_at(T_F, faulted),
                            "unit": "A", "method": "analytic"},
    }

    events = []
    if faulted:
        pre_vars = {
            "I_bat_true_A": i_true_at(T_F, mode, faulted),
            "I_bat_meas_A": i_true_at(T_F, mode, faulted) + 0.0,
            "bias_A": 0.0,
        }
        post_vars = {
            "I_bat_true_A": i_true_at(T_F, mode, faulted),
            "I_bat_meas_A": i_true_at(T_F, mode, faulted) + BIAS_A,
            "bias_A": BIAS_A,
        }
        events.append({
            "event_id": "EV-001",
            "event_type": "sensor_bias",
            "trigger_s": T_F,
            "target_signal": "bias_A",
            "magnitude": BIAS_A,
            "unit": "A",
            "snapshots": [
                {"snapshot_id": "EV-001-pre", "event_id": "EV-001", "phase": "pre",
                 "t_s": T_F, "derivation": "left_limit",
                 "variables": pre_vars,
                 "units": {"I_bat_true_A": "A", "I_bat_meas_A": "A", "bias_A": "A"},
                 "fault_id": "I_bat_sensor_bias"},
                {"snapshot_id": "EV-001-post", "event_id": "EV-001", "phase": "post",
                 "t_s": T_F, "derivation": "post_sample",
                 "variables": post_vars,
                 "units": {"I_bat_true_A": "A", "I_bat_meas_A": "A", "bias_A": "A"},
                 "fault_id": "I_bat_sensor_bias"},
            ],
        })

    series = {"t": t}
    series.update(col)

    scalars = {
        "E_bat_true_kWh": e_bat_true,
        "E_bat_meas_kWh": e_bat_meas,
        "E_gen_true_kWh": e_gen,
        "E_load_served_kWh": e_load,
        "SOC_true_end_pct": soc_true_end,
        "SOC_est_end_pct": soc_est_end,
        "SOC_err_end_pp": soc_est_end - soc_true_end,
        "I_true_19p9_A": col["I_bat_true_A"][I_F - 1],
        "I_meas_19p9_A": col["I_bat_meas_A"][I_F - 1],
        "t_19p9_s": t[I_F - 1],
        "I_true_20post_A": col["I_bat_true_A"][I_F],
        "I_meas_20post_A": col["I_bat_meas_A"][I_F],
        "I_true_21p5_A": i_true_at(21.5, mode, faulted),
        "I_true_26_A": i_true_at(26.0, mode, faulted),
        "I_true_60_A": col["I_bat_true_A"][-1],
        "P_bat_true_21p5_kW": V_KW_PER_A * i_true_at(21.5, mode, faulted),
        "P_gen_true_21p5_kW": PLOAD_KW - V_KW_PER_A * i_true_at(21.5, mode, faulted),
        "max_abs_r_true_kW": max_abs_r_true,
        "max_abs_r_meas_kW": max_abs_r_meas,
        "int_I_true_60s_As": int_i_true(x_end, mode, faulted),
    }
    return {
        "key": spec["key"],
        "role": spec["role"],
        "feedback_mode": mode,
        "faulted": faulted,
        "series": series,
        "events": events,
        "scalars": scalars,
        "metrics": metrics,
    }


# ---------------------------------------------------------------------------
# 自检（§6.3 第 6 条：Simpson / RK4 / 恒等式交叉；失败 => exit 2）
# ---------------------------------------------------------------------------
def _simpson(f, a, b, n):
    if n % 2:
        n += 1
    h = (b - a) / n
    s = f(a) + f(b)
    for i in range(1, n):
        s += f(a + i * h) * (4 if i % 2 else 2)
    return s * h / 3.0


def self_check():
    """返回 (ok, checks[])；任一失败 ok=False。"""
    checks = []

    def rec(cid, ok, observed, tolerance, note):
        checks.append({"check_id": cid, "status": "pass" if ok else "fail",
                       "observed": observed, "tolerance": tolerance, "note": note})

    # SC-1 Simpson 细网格 vs 解析积分（闭环故障，[0,60]）
    ana = int_i_true(DURATION_S, "closed_loop", True)
    simp = _simpson(lambda x: i_true_at(x, "closed_loop", True), 0.0, DURATION_S, 60000)
    d = abs(simp - ana)
    rec("SC-1-simpson-intI", d <= 1e-6, d, "≤1e-6 A·s", "Simpson(n=60000) vs 解析 ∫I_true dt")

    # SC-2 RK4 (dt=0.001) 闭环 ODE vs 闭式解，在输出网格逐点比较。
    # b 按步中点冻结（t_f=20.0 恰在步边界）：避免跨事件步的采样约定引入 O(h) 人为误差。
    h = 0.001
    y = IREF_A
    tcur = 0.0
    kout = int(round(DURATION_S / DT_S))
    grid = build_time_grid()
    yi = 0
    worst = 0.0
    for step in range(int(round(DURATION_S / h))):
        b_step = b_at(tcur + h / 2, True)
        k1 = ((IREF_A - b_step) - y) / TAU_S
        k2 = ((IREF_A - b_step) - (y + h / 2 * k1)) / TAU_S
        k3 = ((IREF_A - b_step) - (y + h / 2 * k2)) / TAU_S
        k4 = ((IREF_A - b_step) - (y + h * k3)) / TAU_S
        y += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6.0
        tcur += h
        while yi < kout and abs((yi + 1) * DT_S - tcur) < h / 2:
            yi += 1
            an = i_true_at(grid[yi], "closed_loop", True)
            worst = max(worst, abs(y - an))
    rec("SC-2-rk4-ode", worst <= 1e-9, worst, "≤1e-9 A", "RK4(dt=1e-3, b 按步中点冻结) vs 闭式解逐点最大差")

    # SC-3 定义恒等式逐点：I_meas−I_true−b；P_bat−0.4·I_true；|r_true| 代数路径残差
    # 容差按 PHY-01/PHY-02 口径 ≤1e-12（double 链路实测 ~3.55e-15）。
    run = simulate_run(RUNS[1])
    worst_eq = 0.0
    for i in range(N_SAMPLES):
        worst_eq = max(worst_eq,
                       abs(run["series"]["I_bat_meas_A"][i] - run["series"]["I_bat_true_A"][i] - run["series"]["bias_A"][i]),
                       abs(run["series"]["P_bat_true_kW"][i] - V_KW_PER_A * run["series"]["I_bat_true_A"][i]),
                       abs(run["series"]["r_true_kW"][i]))
    rec("SC-3-identity", worst_eq <= 1e-12, worst_eq, "≤1e-12（PHY-01/02 口径）", "测量/功率换算/定义自洽恒等式")

    # SC-4 细网格梯形能量 vs 解析（kWh）
    n = 600000
    hh = DURATION_S / n
    s = 0.0
    prev = i_true_at(0.0, "closed_loop", True)
    for i in range(1, n + 1):
        cur = i_true_at(i * hh, "closed_loop", True)
        s += 0.5 * (prev + cur) * hh
        prev = cur
    d_e = abs(V_KW_PER_A * s / 3600.0 - run["scalars"]["E_bat_true_kWh"])
    rec("SC-4-fine-trapz-E", d_e <= 1e-9, d_e, "≤1e-9 kWh", "dt=1e-4 梯形 ∫P_bat vs 解析 E_bat")

    # SC-5 事件快照相位值（SA-19/T-02）
    ev = run["events"][0]
    pre = ev["snapshots"][0]
    post = ev["snapshots"][1]
    ok_ev = (pre["t_s"] == T_F and post["t_s"] == T_F and pre["derivation"] == "left_limit"
             and post["derivation"] == "post_sample"
             and pre["variables"]["I_bat_meas_A"] == 25.0 and post["variables"]["I_bat_meas_A"] == 35.0
             and post["variables"]["I_bat_true_A"] == 25.0)
    rec("SC-5-event-phase", ok_ev, "pre(I_meas=%.1f)/post(I_meas=%.1f)@t=%.1f" % (
        pre["variables"]["I_bat_meas_A"], post["variables"]["I_bat_meas_A"], post["t_s"]),
        "pre 25 / post 35 @20.0", "事件 pre=左极限 / post=右采样行")

    # SC-6 三组 Run 全部 601 点有限、时间网格 i·dt 单调
    ok_grid = True
    for spec in RUNS:
        r = simulate_run(spec)
        tt = r["series"]["t"]
        if any(tt[i] >= tt[i + 1] for i in range(N_SAMPLES - 1)):
            ok_grid = False
        for sid in SERIES_IDS:
            for v in r["series"][sid]:
                if v is None or not math.isfinite(v):
                    ok_grid = False
    rec("SC-6-grid-finite", ok_grid, "3×601 点", "严格递增 + 有限", "时间网格与有限值")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


# ---------------------------------------------------------------------------
# golden 组装
# ---------------------------------------------------------------------------
TOLERANCES = {
    "gate": {
        "E_kWh": 1e-6, "SOC_pp": 1e-5, "I_A_rtol": 1e-12, "I_A_atol": 1e-15,
        "P_kW_rtol": 1e-12, "P_kW_atol": 1e-15, "r_true_kW": 1e-12, "r_meas_kW_atol": 1e-9,
        "t_s": 1e-9,
    },
    "analytic_crosscheck": {
        "E_kWh_rtol": 1e-12, "E_kWh_atol": 1e-15, "SOC_pp_atol": 1e-9,
        "I_A_rtol": 1e-12, "I_A_atol": 1e-15,
    },
}


def build_golden():
    runs = {}
    for spec in RUNS:
        r = simulate_run(spec)
        runs[r["key"]] = {
            "role": r["role"],
            "feedback_mode": r["feedback_mode"],
            "fault": ({"family": "sensor_drift", "fault_id": "I_bat_sensor_bias",
                       "t_start_s": T_F, "bias_A": BIAS_A} if r["faulted"] else None),
            "events": r["events"],
            "scalars": r["scalars"],
            "metrics": r["metrics"],
            "series": r["series"],
        }
    return {
        "golden_schema_version": "v1",
        "golden_id": "fl001_v1",
        "model_id": "FL-001",
        "model_version": "fl001.1",
        "schema_version": "1.0.0",
        "engine_baseline": None,
        "method_id": METHOD_ID,
        "method_version": METHOD_VERSION,
        "units": {"I": "A", "P": "kW", "E": "kWh", "t": "s", "SOC": "%", "SOC_err": "pp"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T_F, "bias_A": BIAS_A,
            "Vdc_V": VDC_V, "Iref_A": IREF_A, "tau_s": TAU_S,
            "Pload_demand_kW": PLOAD_KW, "Pload_served_kW": PLOAD_KW,
            "Ebat_nominal_kWh": EBAT_KWH, "SOC0_pct": SOC0_PCT,
            "feedback_modes": ["closed_loop", "monitor"],
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": I_F, "t_0": 0.0, "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": TOLERANCES,
        "runs": runs,
        "generated_by": {
            "tool": "tools/oracle/emit_golden.py + tools/oracle/fl001_oracle.py",
            "python_version": platform.python_version(),
            "command": "python tools/oracle/emit_golden.py",
            "oracle_source_sha256": _oracle_source_sha256(),
            "generated_at": None,  # 由 emit_golden.py 填写（UTC ISO）
        },
        "approval": {
            "approved_by": None,
            "approved_at": None,
            "approved_golden_sha256": None,
        },
    }


def oracle_source_path():
    import os
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "fl001_oracle.py")


def _oracle_source_sha256():
    with open(oracle_source_path(), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def main(argv):
    if len(argv) >= 2 and argv[1] == "--self-check":
        ok, checks = self_check()
        print(json.dumps({"ok": ok, "checks": checks}, ensure_ascii=False, indent=2))
        return 0 if ok else 2
    if len(argv) >= 2 and argv[1] == "--summary":
        ok, checks = self_check()
        g = build_golden()
        out = {
            "self_check_ok": ok,
            "checks": checks,
            "runs": {k: {"scalars": v["scalars"], "metrics": v["metrics"]} for k, v in g["runs"].items()},
        }
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0 if ok else 2
    print(json.dumps(build_golden(), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
