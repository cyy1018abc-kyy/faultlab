# -*- coding: utf-8 -*-
"""mg001_combo_oracle.py — MG-001 孤岛组合语义独立 oracle（B-10 / V1160 / CHG-20261119-11）。

规格权威文本：FaultLab-evaluation/NEXT/MG001_ISLAND_COMBO_G2B_SPEC_DRAFT.md v0.1
（V1150 波 S3 / CHG-20261119-09——批准 CHG-20261119-11；Q1..Q7 定案按推荐）。

**T-A→T-B 制度切换（MG-D1 核心影响面）**：
  mg001_v1（T-A）：island Run 源恒健康 ⇒ chase 分段常值 ⇒ P_bess 分段常值 ⇒ SOC 分段
  解析精确（_seg_integral——mg001_oracle.py 冻结口径）。
  mg001_v2（T-B，本 oracle）：island_combo Run 岛内源事件（gust/shading/load）激活 ⇒
  chase 逐采样变化 ⇒ P_bess 逐采样变化 ⇒ **SOC 逐采样左矩形累计**（EQ-MG-7 数值
  积分——Q2=(a) 定案）。

独立性声明：不 import mg001_oracle 的 simulate_run/run_structure（T-A 闭式面——本
oracle 独立实现 per-sample 路径）；共享常量/SERIES_IDS/事件结构从 mg001_oracle 只读
import（参数化复用——pv001/wt001 源委托显式授权面沿袭 mg001 体例）。
golden 由本 oracle 只读生成——C99 FMU 不参与 emit（无 FMU 面——MG 聚合层零新增 ODE）。

用法：
  python -I tools/oracle/mg001_combo_oracle.py --self-check
  python -I tools/oracle/mg001_combo_oracle.py --emit
  python -I tools/oracle/mg001_combo_oracle.py --summary
"""

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle_base  # noqa: E402
import mg001_oracle  # noqa: E402  共享常量/源委托/事件结构（参数化复用——mg001 体例）
import pv001_oracle  # noqa: E402  源委托（EQ-MG-2——mg001 体例沿袭）
import wt001_oracle  # noqa: E402  源委托

GOLDEN_ID = "mg001_v2"
MODEL_ID = "MG-001"
MODEL_VERSION = "1.0.0"
METHOD_ID = "mg001_combo_numeric"
METHOD_VERSION = "1"
APPROVED_BY = "user（2026-11-19 CHG-20261119-11 批准链——MG-D1 孤岛组合语义）"
APPROVED_AT = "2026-11-19T00:00:00Z"
PROVENANCE = "fmu_l1_lumped_unvalidated"

DURATION_S = mg001_oracle.DURATION_S
DT_S = mg001_oracle.DT_S
N_SAMPLES = mg001_oracle.N_SAMPLES
T0_S = mg001_oracle.T0_S
T_CLEAR_S = 35.0
I_F = mg001_oracle.I_F
I_CLEAR = mg001_oracle.I_CLEAR
LOAD_KW = mg001_oracle.LOAD_KW
P_SCHED_KW = mg001_oracle.P_SCHED_KW
SOC0_PCT = mg001_oracle.SOC0_PCT
E_BAT_KWH = mg001_oracle.E_BAT_KWH
V_BUS_V = mg001_oracle.V_BUS_V
P_CLAMP_KW = mg001_oracle.P_CLAMP_KW
SERIES_IDS = mg001_oracle.SERIES_IDS
FAMILY_NONE = mg001_oracle.FAMILY_NONE
FAMILY_LOAD = mg001_oracle.FAMILY_LOAD
FAMILY_SHADING = mg001_oracle.FAMILY_SHADING
FAMILY_GUST = mg001_oracle.FAMILY_GUST
FAMILY_ISLAND = mg001_oracle.FAMILY_ISLAND

RUNS = [
    {"key": "healthy", "role": "baseline", "family": FAMILY_NONE,
     "feedback_mode": "closed_loop", "faulted": False, "magnitude": None, "unit": "-"},
    {"key": "load_step_closed_loop", "role": "fault", "family": FAMILY_LOAD,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": 10.0, "unit": "kW"},
    {"key": "pv_shading_closed_loop", "role": "fault", "family": FAMILY_SHADING,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": 300.0, "unit": "W/m²"},
    {"key": "wt_gust_closed_loop", "role": "fault", "family": FAMILY_GUST,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": 2.0, "unit": "m/s"},
    {"key": "island_reconnect", "role": "fault", "family": FAMILY_ISLAND,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": None, "unit": "-",
     "t_clear_s": T_CLEAR_S},
    {"key": "combo_island_gust", "role": "fault", "family": FAMILY_ISLAND,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": None, "unit": "-",
     "t_clear_s": T_CLEAR_S, "combo_source": FAMILY_GUST, "combo_magnitude": 2.0,
     "combo_unit": "m/s"},
    {"key": "combo_island_shading", "role": "fault", "family": FAMILY_ISLAND,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": None, "unit": "-",
     "t_clear_s": T_CLEAR_S, "combo_source": FAMILY_SHADING, "combo_magnitude": 300.0,
     "combo_unit": "W/m²"},
    {"key": "combo_island_load", "role": "fault", "family": FAMILY_ISLAND,
     "feedback_mode": "closed_loop", "faulted": True, "magnitude": None, "unit": "-",
     "t_clear_s": T_CLEAR_S, "combo_source": FAMILY_LOAD, "combo_magnitude": 10.0,
     "combo_unit": "kW"},
]

TOLERANCES = {
    "gate": {
        "tier": "T-B",
        "f_Hz_atol": 1e-4,
        "n_rpm_atol": 1e-2,
        "P_kW_rtol": 1e-6,
        "P_kW_atol": 1e-3,
        "I_A_rtol": 1e-12,
        "I_A_atol": 1e-15,
        "E_kWh": 1e-6,
        "SOC_pp": 1e-5,
        "r_true_kW": 1e-9,
        "r_meas_kW_atol": 1e-9,
        "t_s": 1e-9,
    },
}


def _oracle_source_sha256():
    return oracle_base.oracle_source_sha256(os.path.abspath(__file__))


def build_time_grid():
    return [i * DT_S for i in range(N_SAMPLES)]


def simulate_run(spec):
    """单 Run 601 点全精度序列（per-sample dispatch；SOC 左矩形累计——T-B 制度）。"""
    spec = oracle_base.resolve_run_spec(RUNS, spec)
    mode = spec["feedback_mode"]
    family = spec.get("family", FAMILY_NONE)
    faulted = bool(spec["faulted"])
    magnitude = float(spec["magnitude"]) if spec.get("magnitude") is not None else 0.0
    t_clear = float(spec.get("t_clear_s") or DURATION_S)
    combo_source = spec.get("combo_source")
    combo_magnitude = float(spec.get("combo_magnitude") or 0.0)
    is_combo = bool(spec.get("combo_source"))
    is_island = family == FAMILY_ISLAND

    # 源轨复用委托（EQ-MG-2——pv001/wt001 参数化入口；combo_source 透传）
    pv_faulted = faulted and (family == FAMILY_SHADING or combo_source == FAMILY_SHADING)
    delta_g = combo_magnitude if combo_source == FAMILY_SHADING else (magnitude if family == FAMILY_SHADING else 0.0)
    pv_series, _ = pv001_oracle._pv_stepped_series(mode, pv_faulted, delta_g, 0.0)
    int_pv = pv001_oracle.pv_energy_integrals(mode, pv_faulted, delta_g, 0.0, DURATION_S)[0]

    wt_faulted = faulted and (family == FAMILY_GUST or combo_source == FAMILY_GUST)
    wt_mag = combo_magnitude if combo_source == FAMILY_GUST else (magnitude if family == FAMILY_GUST else 0.0)
    wt_fam = wt001_oracle.FAMILY_GUST if wt_faulted else wt001_oracle.FAMILY_NONE
    wt_res = wt001_oracle._simulate(9.0, mode, wt_fam, wt_mag, wt_faulted)
    wt_series = wt_res["series"]["P_wt_true_kW"]
    e_wt = wt_res["scalars"]["E_wt_true_kWh"]

    t = build_time_grid()
    col = {sid: [0.0] * N_SAMPLES for sid in SERIES_IDS if sid != "t"}
    col["P_bess_chase_kW"] = [None] * N_SAMPLES

    is_island_run = family == FAMILY_ISLAND
    is_load_run = family == FAMILY_LOAD or combo_source == FAMILY_LOAD
    load_dp = combo_magnitude if combo_source == FAMILY_LOAD else (magnitude if family == FAMILY_LOAD else 0.0)

    int_pbat = 0.0
    int_pv_acc = 0.0
    int_wt_acc = 0.0
    max_r_true = 0.0
    max_r_meas = 0.0

    def _load_at(ti):
        if is_load_run and ti >= T0_S:
            return LOAD_KW + load_dp
        return LOAD_KW

    def _island_active(ti):
        return is_island_run and ti >= T0_S and ti < t_clear

    for i, ti in enumerate(t):
        load = _load_at(ti)
        p_pv = pv_series[i]
        p_wt = wt_series[i]
        isl = _island_active(ti)

        if isl:
            chase = load - p_pv - p_wt
            p_bess = min(max(chase, -P_CLAMP_KW), P_CLAMP_KW)
            p_shed = max(0.0, chase - p_bess)
            p_dump = max(0.0, p_bess - chase)
            p_served = load - p_shed
            p_grid = 0.0
            col["P_bess_chase_kW"][i] = chase
        else:
            p_bess = P_SCHED_KW
            p_shed = 0.0
            p_dump = 0.0
            p_served = load
            p_grid = load - p_pv - p_wt - p_bess

        col["island_state"][i] = 1.0 if isl else 0.0
        col["P_pv_kW"][i] = p_pv
        col["P_wt_kW"][i] = p_wt
        col["P_bess_kW"][i] = p_bess
        col["P_sched_kW"][i] = P_SCHED_KW
        col["P_load_demand_kW"][i] = load
        col["P_load_served_kW"][i] = p_served
        col["P_grid_true_kW"][i] = p_grid
        col["P_grid_meas_kW"][i] = p_grid
        col["P_shed_kW"][i] = p_shed
        col["P_dump_kW"][i] = p_dump
        col["V_bus_V"][i] = V_BUS_V

        # SOC 逐采样左矩形累计（T-B——Q2=(a) 定案）
        if i > 0:
            dt = ti - t[i - 1]
            int_pbat += col["P_bess_kW"][i - 1] * dt
        soc = SOC0_PCT - 100.0 * int_pbat / (3600.0 * E_BAT_KWH)
        col["SOC_true_pct"][i] = soc
        col["SOC_est_pct"][i] = soc
        col["SOC_err_pp"][i] = 0.0

        r_true = p_pv + p_wt + p_bess + p_grid - p_served - p_dump
        col["r_true_kW"][i] = r_true
        col["r_meas_kW"][i] = 0.0
        max_r_true = max(max_r_true, abs(r_true))
        max_r_meas = max(max_r_meas, abs(0.0))

    f_end = 0.0  # MG 不输出频率列
    e_bess = int_pbat / 3600.0
    e_pv = int_pv / 3600.0
    e_wt_val = e_wt
    e_served = sum(col["P_load_served_kW"]) * DT_S / 3600.0
    e_shed = sum(col["P_shed_kW"]) * DT_S / 3600.0
    e_dump = sum(col["P_dump_kW"]) * DT_S / 3600.0
    e_load_dem = sum(col["P_load_demand_kW"]) * DT_S / 3600.0
    e_grid = e_served + e_dump - e_pv - e_wt_val - e_bess

    metrics = {
        "E_pv_kWh": {"value": e_pv, "unit": "kWh", "method": METHOD_ID},
        "E_wt_kWh": {"value": e_wt_val, "unit": "kWh", "method": METHOD_ID},
        "E_bess_kWh": {"value": e_bess, "unit": "kWh", "method": METHOD_ID},
        "E_grid_kWh": {"value": e_grid, "unit": "kWh", "method": METHOD_ID},
        "E_load_served_kWh": {"value": e_served, "unit": "kWh", "method": METHOD_ID},
        "E_shed_kWh": {"value": e_shed, "unit": "kWh", "method": METHOD_ID},
        "E_dump_kWh": {"value": e_dump, "unit": "kWh", "method": METHOD_ID},
        "E_load_demand_kWh": {"value": e_load_dem, "unit": "kWh", "method": METHOD_ID},
        "SOC_true_end_pct": {"value": col["SOC_true_pct"][-1], "unit": "%", "method": METHOD_ID},
        "SOC_est_end_pct": {"value": col["SOC_est_pct"][-1], "unit": "%", "method": METHOD_ID},
        "SOC_err_pp": {"value": 0.0, "unit": "pp", "method": METHOD_ID},
        "max_abs_r_true_kW": {"value": max_r_true, "unit": "kW", "method": "algebraic"},
        "max_abs_r_meas_kW": {"value": max_r_meas, "unit": "kW", "method": "algebraic"},
    }

    scalars = {
        "E_pv_kWh": e_pv, "E_wt_kWh": e_wt_val, "E_bess_kWh": e_bess,
        "E_grid_kWh": e_grid, "E_load_served_kWh": e_served,
        "E_shed_kWh": e_shed, "E_dump_kWh": e_dump, "E_load_demand_kWh": e_load_dem,
        "SOC_true_end_pct": col["SOC_true_pct"][-1],
        "SOC_est_end_pct": col["SOC_est_pct"][-1],
        "SOC_err_end_pp": 0.0,
    }

    events = _build_events(spec, series_ids=SERIES_IDS, col=col)

    return {"key": spec["key"], "role": spec["role"],
            "feedback_mode": mode, "faulted": faulted,
            "inertia_model": None, "model_provenance": PROVENANCE,
            "series": dict({"t": t}, **col), "metrics": metrics,
            "scalars": scalars, "events": events}


def _build_events(spec, series_ids, col):
    events = []
    if spec["family"] != FAMILY_ISLAND:
        return events
    t_clear = float(spec.get("t_clear_s") or DURATION_S)

    def vars_at(idx):
        d = {}
        for sid in series_ids:
            if sid == "t":
                continue
            d[sid] = col[sid][idx]
        return d

    units = {sid: ("kW" if "kW" in sid or "_kW" in sid else
                   "%" if "SOC" in sid or "_pct" in sid else
                   "pp" if "pp" in sid else
                   "V" if "V" in sid else
                   "-") for sid in series_ids if sid != "t"}
    for ev_id, trig, etype, tgt, i_pre, i_post in [
        ("EV-001", T0_S, "island_event", "P_grid_meas_kW", I_F - 1, I_F),
        ("EV-002", t_clear, "island_reconnect", "P_grid_meas_kW", I_CLEAR - 1, I_CLEAR),
    ]:
        events.append({
            "event_id": ev_id, "event_type": etype, "trigger_s": trig,
            "target_signal": tgt, "magnitude": 0.0, "unit": "-",
            "snapshots": [
                {"snapshot_id": f"{ev_id}-pre", "event_id": ev_id, "phase": "pre",
                 "t_s": trig, "derivation": "left_limit",
                 "variables": vars_at(i_pre), "units": units},
                {"snapshot_id": f"{ev_id}-post", "event_id": ev_id, "phase": "post",
                 "t_s": trig, "derivation": "post_sample",
                 "variables": vars_at(i_post), "units": units},
            ],
        })
    if spec.get("combo_source"):
        events.append({
            "event_id": "EV-003", "event_type": spec["combo_source"],
            "trigger_s": T0_S, "target_signal": "P_pv_kW" if spec["combo_source"] == FAMILY_SHADING else "P_wt_kW",
            "magnitude": spec.get("combo_magnitude"), "unit": spec.get("combo_unit", ""),
            "snapshots": [],
        })
    return events


def fault_block(spec):
    if not spec["faulted"]:
        return None
    base = {"family": spec["family"], "fault_id": None, "t_start_s": T0_S}
    if spec["family"] == FAMILY_ISLAND and spec.get("combo_source"):
        base["combo_source"] = spec["combo_source"]
        base["combo_magnitude"] = spec.get("combo_magnitude")
    if spec["family"] == FAMILY_LOAD:
        base["delta_load_kW"] = spec["magnitude"]
    if spec.get("t_clear_s") is not None:
        base["t_clear_s"] = spec["t_clear_s"]
    return base


def build_golden():
    runs = {}
    for spec in RUNS:
        r = simulate_run(spec)
        runs[r["key"]] = {
            "role": r["role"], "feedback_mode": r["feedback_mode"],
            "model_provenance": PROVENANCE,
            "fault": fault_block(spec), "events": r["events"],
            "scalars": r["scalars"], "metrics": r["metrics"], "series": r["series"],
        }
    return {
        "golden_schema_version": oracle_base.GOLDEN_SCHEMA_VERSION_V2,
        "golden_id": GOLDEN_ID, "model_id": MODEL_ID, "model_version": MODEL_VERSION,
        "schema_version": "1.0.0", "engine_baseline": None, "backend": None,
        "supersedes": None, "method_id": METHOD_ID, "method_version": METHOD_VERSION,
        "model_provenance": PROVENANCE,
        "units": {"P": "kW", "E": "kWh", "t": "s", "SOC": "%", "SOC_err": "pp",
                  "V": "V", "r": "kW"},
        "config": {
            "duration_s": DURATION_S, "dt_s": DT_S, "fault_time_s": T0_S,
            "Vdc_V": V_BUS_V, "Pload_demand_kW": LOAD_KW,
            "Ebat_nominal_kWh": E_BAT_KWH, "SOC0_pct": SOC0_PCT,
            "p_sched_kW": P_SCHED_KW, "P_bess_clamp_kW": P_CLAMP_KW,
            "model_provenance": PROVENANCE,
            "note": "MG-001 孤岛组合语义增补（MG-D1——T-B 数值积分；island_combo 事件级组合键；"
                    "island 可与源族/load_step 独立时刻组合——「岛内阵风使 shed 2→0」组合教学面；"
                    "行为与数值集总参数演示模型（未经实验/硬件验证）",
        },
        "sampling": {"n": N_SAMPLES, "dt_s": DT_S, "i_f": I_F, "t_0": 0.0, "t_end": DURATION_S},
        "event_encoding_version": 1,
        "tolerances": dict(TOLERANCES),
        "runs": runs,
        "metrics_note": "golden 指标为独立可算子集（能量账本/SOC/极值）；T-B 数值积分"
                        "（MG-D1 Q2=(a)——SOC 逐采样左矩形）；行为与数值集总参数演示模型",
    }


def self_check():
    checks = []

    def rec(cid, ok_, observed, tolerance, note):
        checks.append(oracle_base.check_record(cid, ok_, observed, tolerance, note))
        return ok_

    # MSC-1 基线：healthy Run 并网面 SOC 逐采样与分段解析一致（T-B vs T-A 对照面）
    r0 = simulate_run("healthy")
    soc_end = r0["series"]["SOC_true_pct"][-1]
    expected_soc = SOC0_PCT - 100.0 * P_SCHED_KW * DURATION_S / (3600.0 * E_BAT_KWH)
    rec("MSC-1-baseline-soc", abs(soc_end - expected_soc) <= 1e-9, soc_end, expected_soc,
        "healthy 并网 P_bess=P_SCHED 常值 → SOC 解析闭合（T-B 左矩形 vs 解析等价）")

    # MSC-2 恒等式：r_true ≡ 0（EQ-MG-6 定义恒等）
    worst_r = 0.0
    for spec in RUNS:
        r = simulate_run(spec)
        for v in r["series"]["r_true_kW"]:
            worst_r = max(worst_r, abs(v))
    rec("MSC-2-r-true-identity", worst_r <= 1e-9, worst_r, 1e-9,
        "EQ-MG-6 r_true ≡ 0 定义恒等逐点（全 8 Run）")

    # MSC-3 网格：601 点 t[i]=i*dt
    worst_grid = 0.0
    for spec in RUNS:
        r = simulate_run(spec)
        for i in range(N_SAMPLES):
            worst_grid = max(worst_grid, abs(r["series"]["t"][i] - i * DT_S))
    rec("MSC-3-grid", worst_grid <= 1e-9, worst_grid, 1e-9, "601 点网格")

    # MSC-4 事件：island Run 双事件（EV-001 island + EV-002 reconnect）
    r_isl = simulate_run("island_reconnect")
    ev_ok = (len(r_isl["events"]) == 2
             and r_isl["events"][0]["snapshots"][0]["derivation"] == "left_limit"
             and r_isl["events"][1]["snapshots"][1]["derivation"] == "post_sample")
    rec("MSC-4-events", ev_ok, len(r_isl.get("events", [])), "2 events (island+reconnect)",
        "island Run 双事件快照 pre=left_limit/post=post_sample")

    # MSC-5 combo：island+gust 岛内 P_bess 时变化（chase 随 gust 变化）
    combo_spec = oracle_base.resolve_run_spec(RUNS, "combo_island_gust")
    r_combo = simulate_run(combo_spec)
    p_bess_island = [r_combo["series"]["P_bess_kW"][i]
                     for i in range(N_SAMPLES) if 20.0 <= i * DT_S < 35.0]
    has_variation = len(set(p_bess_island)) > 1
    rec("MSC-5-combo-variation", has_variation, "island P_bess values: {}".format(
        sorted(set(round(v, 4) for v in p_bess_island))), "非分段常值（gust chase 面时变化）",
        "combo island 窗内 P_bess 时变化（gust 源波动 → chase 变化 → P_bess chase）")

    # MSC-6 无 NaN/Inf + P_bess 值域
    finite_ok = True
    dom_ok = True
    for spec in RUNS:
        r = simulate_run(spec)
        for sid in SERIES_IDS:
            if sid == "t":
                continue
            for v in r["series"][sid]:
                if v is None:
                    continue
                if not math.isfinite(v):
                    finite_ok = False
        for v in r["series"]["P_bess_kW"]:
            if not (-P_CLAMP_KW <= v <= P_CLAMP_KW):
                dom_ok = False
    rec("MSC-7-finite-domain", finite_ok and dom_ok,
        "finite=%s domain=%s" % (finite_ok, dom_ok), "all finite; P_bess ∈ [-8,+8]",
        "全 Run 全通道有限性 + P_bess 钳位域")

    # MSC-8 golden 交叉：healthy Run P_pv/P_wt 序列与 mg001_v1 golden 只读核对
    try:
        ref_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__)))), "data", "golden", "mg001_v1.json")
        with open(ref_path, "r", encoding="utf-8") as f:
            ref = json.load(f)
        r_healthy = simulate_run("healthy")
        ref_healthy = ref["runs"]["healthy"]
        worst_src = 0.0
        for sid in ("P_pv_kW", "P_wt_kW"):
            for a, b in zip(r_healthy["series"][sid], ref_healthy["series"][sid]):
                worst_src = max(worst_src, abs(a - b))
        rec("MSC-8-source-cross", worst_src <= 1e-12, worst_src, 1e-12,
            "healthy P_pv/P_wt 源序列 vs mg001_v1 golden 只读核对（MS-3 传递耦合沿袭）")
    except Exception as e:
        rec("MSC-8-source-cross", False, str(e), 1e-12, "源 golden 交叉失败")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


def emit():
    ok, checks = self_check()
    if not ok:
        print(json.dumps({"ok": False, "checks": checks}, ensure_ascii=True, indent=2))
        return 2
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    path = os.path.join(root, "data", "golden", GOLDEN_ID + ".json")
    golden = build_golden()
    golden["generated_by"] = oracle_base.generated_by_block(
        tool="tools/oracle/mg001_combo_oracle.py + tools/oracle/oracle_base.py（机制层）",
        oracle_path=os.path.abspath(__file__),
        command="python -I tools/oracle/mg001_combo_oracle.py --emit")
    oracle_base.apply_approval(golden, APPROVED_BY, APPROVED_AT)
    digest = oracle_base.write_golden_with_sidecar(golden, path)
    print(json.dumps({
        "written": os.path.abspath(path), "bytes": os.path.getsize(path),
        "golden_sha256": digest,
        "oracle_source_sha256": golden["generated_by"]["oracle_source_sha256"],
        "approved_by": golden["approval"]["approved_by"],
    }, ensure_ascii=False, indent=2))
    return 0


def main(argv):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    if "--self-check" in argv or "--summary" in argv:
        ok, checks = self_check()
        print(json.dumps({"ok": ok, "checks": checks}, ensure_ascii=True, indent=2))
        return 0 if ok else 2
    if "--emit" in argv:
        return emit()
    print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
