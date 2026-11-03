#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""FL-001 Python 解析后端（B-1）— FL19_BACKEND_RFC_APPROVED §2 / V312 准入清单 profile=fl001-analytic-crosscheck。

独立性声明（RFC Q-2 四边界）：
  1. 本文件按 MODEL_VALIDATION_SPEC §1.3/§5.2 权威方程独立编写，未 import/派生 tools/oracle/**；
  2. 自检独立（--self-check，不引用 oracle SC 条目）；
  3. 证据措辞固定为「跨实现一致性检查」，不构成方程级独立校核（与 oracle 同源推导，独立性天花板见 RFC）；
  4. 宣称解析口径，按 analytic_crosscheck 层（E rtol 1e-12 / I rtol 1e-12 / SOC pp atol 1e-9）验收。

方程（FL-001 L0，MODEL_VALIDATION_SPEC §1.3；P0 白名单 none/sensor_drift/actuator_fault × closed_loop/monitor；
actuator 物理规格 FLEXT_G2B_SPEC_APPROVED §1 EQ-A/EQ-B，CHG-20261104-03）：
  I_ref = (P_load0 − 20 kW)/0.4 kV
  b(t) = magnitude·[t ≥ t_start]（sensor_drift）；monitor 模式控制器不看测量（b 不反馈）
  dI/dt = (I_ref − b·k_fb − I)/τ，k_fb = 0（monitor）| 1（closed_loop），τ=1.5 s —— 解析解
  actuator_fault（钳位轨，b≡0）：I_cap = I_ref × magnitude_pct/100；
    target = min(I_ref, I_cap)（t ≥ t_start）；dI/dt = (target − I)/τ_act，τ_act = 0.4 s
    闭式解 I_true(u) = target + (I_ref − target)·e^(−u/τ_act)，u = t − t_start
  I_meas = I + b；P_bat = 0.4·I；P_bat_meas = 0.4·I_meas；P_gen = P_load − P_bat
  SOC_true = SOC0 − 100·0.4·∫I dt/(40·3600)；SOC_est 同式用 ∫(I+b) dt
  r_true = P_gen + P_bat − P_load（定义恒等 = 0）；r_meas = P_gen + P_bat_meas − P_load = 0.4·b

输出（stdout，JSON）：{backend, systemId, config, t, signals, integrals, metrics}
仅标准库；无网络；Windows/Linux 皆可运行。
"""
import argparse
import json
import math
import sys

BACKEND = {
    "id": "py-analytic-fl001",
    "version": "0.1.0",
    "method_id": "py_analytic",
    "tolerance_profile_id": "fl001-analytic-crosscheck",
    "license": "MIT",
    "license_verified": True,
    "equations_source": "MODEL_VALIDATION_SPEC §1.3/§5.2（独立编写，未派生自 tools/oracle）",
    "provenance": "analytical_demo",
    "systems": ["FL-001"],
    "signals": [
        "I_bat_true_A", "I_bat_meas_A", "bias_A", "I_bat_cap_A", "P_bat_true_kW", "P_bat_meas_kW",
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
    if family not in ("none", "sensor_drift", "actuator_fault"):
        raise ValueError("B-1 支持 none/sensor_drift/actuator_fault（P0 白名单，FLEXT §4）: " + family)
    i_ref = (load0 - 20.0) / V_KV
    feedback = 0.0 if mode == "monitor" else 1.0
    # actuator 钳位轨（EQ-A/EQ-B，FLEXT_G2B_SPEC_APPROVED §1）：b≡0，target=min(I_ref, I_cap)，
    # τ_act=0.4 s（全轨，与引擎 engine.js isAct?0.4:1.5 同口径；t<t_start 段 target=I_ref 稳态无瞬态）。
    # 引擎按 min 语义取 target——load0≤20 退化域（I_ref≤0）钳位 no-op，闭式对一般域成立。
    magnitude_pct = float(cfg.get("magnitude_pct") or 0.0)
    tau_act = float(cfg.get("tau_actuator_s") or 0.4)
    i_cap = i_ref * magnitude_pct / 100.0
    tgt_act = i_cap if i_cap < i_ref else i_ref  # min(controlTarget, I_cap)，controlTarget=I_ref（b≡0）

    t = [i * dt for i in range(n + 1)]
    i_true = []
    bias_series = []
    for ti in t:
        b = bias if (family == "sensor_drift" and ti >= t_start - 1e-9) else 0.0
        bias_series.append(b)
        if family == "sensor_drift" and ti >= t_start - 1e-9:
            u = ti - t_start
            i_true.append((i_ref - feedback * bias) + feedback * bias * math.exp(-u / tau))
        elif family == "actuator_fault" and ti >= t_start - 1e-9:
            u = ti - t_start
            i_true.append(tgt_act + (i_ref - tgt_act) * math.exp(-u / tau_act))
        else:
            i_true.append(i_ref)

    # 逐点解析积分：∫₀ᵗ I du（故障段为 i_ref·t_start + 平衡段 + 指数尾项的闭式）
    running_i = []
    running_b = []
    for ti in t:
        if family == "sensor_drift" and ti >= t_start - 1e-9 and t_start > 0:
            u = ti - t_start
            running_i.append(i_ref * t_start + (i_ref - feedback * bias) * u
                             + feedback * bias * tau * (1.0 - math.exp(-u / tau)))
            running_b.append(bias * u)
        elif family == "actuator_fault" and ti >= t_start - 1e-9 and t_start > 0:
            u = ti - t_start
            running_i.append(i_ref * t_start + tgt_act * u
                             + (i_ref - tgt_act) * tau_act * (1.0 - math.exp(-u / tau_act)))
            running_b.append(0.0)
        else:
            running_i.append(i_ref * ti)
            running_b.append(0.0)
    total = duration
    int_i = running_i[-1]
    int_b = running_b[-1]

    signals = {
        "t": t,
        "I_bat_true_A": i_true,
        "I_bat_meas_A": [a + b for a, b in zip(i_true, bias_series)],
        "bias_A": bias_series,
        # I_cap 列与引擎同口径（engine.js:587）：仅 actuator 轨 t≥t_start 行有效，其余场景整列 null
        "I_bat_cap_A": [(i_cap if (family == "actuator_fault" and ti >= t_start - 1e-9) else None)
                        for ti in t],
        "P_bat_true_kW": [V_KV * a for a in i_true],
        "P_bat_meas_kW": [V_KV * (a + b) for a, b in zip(i_true, bias_series)],
        "P_gen_true_kW": [load0 - V_KV * a for a in i_true],
        "P_gen_meas_kW": [load0 - V_KV * a for a in i_true],
        "P_load_demand_kW": [load0] * (n + 1),
        "P_load_served_kW": [load0] * (n + 1),
        "SOC_true_pct": [soc0 - 100.0 * V_KV * s / (CAP_KWH * 3600.0) for s in running_i],
        "SOC_est_pct": [soc0 - 100.0 * V_KV * (s + sb) / (CAP_KWH * 3600.0)
                        for s, sb in zip(running_i, running_b)],
        "r_true_kW": [0.0] * (n + 1),
        "r_meas_kW": [V_KV * b for b in bias_series]
    }

    e_bat = V_KV * int_i / 3600.0
    e_bat_meas = V_KV * (int_i + int_b) / 3600.0
    e_gen = load0 * total / 3600.0 - e_bat
    soc_true_end = signals["SOC_true_pct"][-1]
    soc_est_end = signals["SOC_est_pct"][-1]
    i_meas = signals["I_bat_meas_A"]
    metrics = {
        "E_bat_true_60s": {"value": e_bat, "unit": "kWh"},
        "E_gen_true_60s": {"value": e_gen, "unit": "kWh"},
        "E_load_served_60s": {"value": load0 * total / 3600.0, "unit": "kWh"},
        "SOC_true_end_pct": {"value": soc_true_end, "unit": "%"},
        "SOC_est_end_pct": {"value": soc_est_end, "unit": "%"},
        "SOC_err_end_pp": {"value": soc_est_end - soc_true_end, "unit": "pp"},
        "max_abs_r_true_kW": {"value": 0.0, "unit": "kW"},
        "max_abs_r_meas_kW": {"value": V_KV * (bias if family == "sensor_drift" else 0.0), "unit": "kW"},
        "I_true_26s_A": {"value": i_true[int(round(26.0 / dt))], "unit": "A"},
        "I_meas_20post_A": {"value": i_meas[int(round(t_start / dt))] if t_start > 0 else i_meas[-1], "unit": "A"}
    }
    integrals = {"intI": int_i, "intB": int_b, "E_bat": e_bat, "E_bat_meas": e_bat_meas, "E_gen": e_gen}
    return t, signals, integrals, metrics


def self_check():
    """独立自检（AC-1…AC-5；不复用 oracle SC 条目）"""
    base = {"duration_s": 60.0, "dt_s": 0.1, "fault_time_s": 20.0, "bias_A": 10.0,
            "Pload_demand_kW": 30.0, "SOC0_pct": 60.0, "tau_s": 1.5, "feedback_mode": "closed_loop",
            "family": "sensor_drift"}
    t, s, integ, m = solve(base)
    ok = True
    # AC-1 恒等式：r_true ≡ 0（代数定义自洽，非物理验证）
    ok &= all(abs(v) == 0.0 for v in s["r_true_kW"])
    # AC-2 解析解边界：I_true(26)=15+10·e^{-6/1.5}（注入后 6 s）
    i26 = 15.0 + 10.0 * math.exp(-6.0 / 1.5)
    ok &= abs(m["I_true_26s_A"]["value"] - i26) < 1e-12
    # AC-3 能量守恒闭式：E_gen + E_bat = E_load（定义恒等）
    ok &= abs(m["E_gen_true_60s"]["value"] + m["E_bat_true_60s"]["value"] - 0.5) < 1e-12
    # AC-4 网格：601 点、单调、t[i]=i·0.1
    ok &= len(t) == 601 and all(t[i] < t[i + 1] for i in range(600))
    # AC-5 actuator 钳位闭式（FLEXT_G2B_SPEC_APPROVED §1.3 锚点，load0=30/mag=55）：
    #   I_true(26)=13.75+11.25·e^{-15}；SOC_true(60)=60−100·0.4·1054.5/144000=59.7070833…
    #   （全窗积分 ∫I=25×20+13.75×40+11.25×0.4×(1−e^−100) A·s）；I_cap 列 t<t_start 全 null、
    #   t≥t_start 恒 I_cap=13.75；r_meas ≡ 0（actuator 轨 b≡0）
    act = dict(base)
    act["family"] = "actuator_fault"
    act["bias_A"] = 0.0
    act["magnitude_pct"] = 55.0
    act["tau_actuator_s"] = 0.4
    t_a, s_a, _, m_a = solve(act)
    ok &= abs(m_a["I_true_26s_A"]["value"] - (13.75 + 11.25 * math.exp(-6.0 / 0.4))) < 1e-12
    ok &= abs(s_a["SOC_true_pct"][-1] - (60.0 - 100.0 * 0.4 * 1054.5 / (40.0 * 3600.0))) < 1e-9
    k_f = int(round(20.0 / 0.1))
    ok &= all(v is None for v in s_a["I_bat_cap_A"][:k_f]) \
        and all(abs(v - 13.75) < 1e-12 for v in s_a["I_bat_cap_A"][k_f:])
    ok &= abs(s_a["I_bat_true_A"][-1] - 13.75) < 1e-12
    ok &= all(abs(v) == 0.0 for v in s_a["r_meas_kW"])
    print("[self-check] AC-1..AC-5:", "PASS" if ok else "FAIL", file=sys.stderr)
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config-json", help="场景配置 JSON（P0 白名单）")
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
