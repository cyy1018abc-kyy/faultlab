# -*- coding: utf-8 -*-
"""verify_golden.py — 一键校验：重跑独立 oracle → 按 golden 内置容差比对（MODEL_VALIDATION_SPEC §3.6）。

用法：
  python scripts/verify_golden.py                # fl001（默认）
  python scripts/verify_golden.py fc001          # FC-001（P1-06 / G2b-lite）
  python scripts/verify_golden.py gt001          # GT-001（V3-31 / G2b v1.1）
  python scripts/verify_golden.py --json out.json

退出码：0=全部通过；1=数值/容差不通过（或 golden/oracle 缺失损坏）；2=oracle 内部自检失败。

校验项（两个模型同构）：
  V-01 golden 存在且可解析；V-02 sidecar SHA-256 一致；
  V-03 generated_by.oracle_source_sha256 == 当前 oracle 源码 SHA-256；
  V-03b approval 批准摘要一致（去除 generated_by/approval 后内容摘要）；
  V-04 oracle 自检全过（fl001 SC-1…6 / fc001 SC-1…7）；
  V-05 关键点（19.9/21.5/26.0/60.0 s 的 true/meas 电流）rtol 1e-12；
  V-06 标量（E/SOC）gate 容差（±1e-6 kWh / ±1e-5 pp）；
  V-07 601 点全精度序列逐点比对；V-08 指标；V-09 事件 pre/post。

本脚本不 import 产品 engine；golden 由 oracle 只读生成。
"""

import hashlib
import json
import math
import os
import platform
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ORACLE_DIR = os.path.join(ROOT, "tools", "oracle")

sys.path.insert(0, ORACLE_DIR)
import fl001_oracle  # noqa: E402
import fc001_oracle  # noqa: E402
import gt001_oracle  # noqa: E402

MODELS = {
    "fl001": {
        "oracle": fl001_oracle,
        "i_true": "I_bat_true_A", "i_meas": "I_bat_meas_A",
        "scalars": [
            ("E_bat_true_kWh", "kWh"), ("E_gen_true_kWh", "kWh"),
            ("E_load_served_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
        ],
    },
    "fc001": {
        "oracle": fc001_oracle,
        "i_true": "I_fc_true_A", "i_meas": "I_fc_meas_A",
        "scalars": [
            ("E_fc_true_kWh", "kWh"), ("E_bat_true_kWh", "kWh"), ("E_bat_est_kWh", "kWh"),
            ("E_load_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
        ],
    },
    "gt001": {
        "oracle": gt001_oracle,
        "i_true": "f_true_Hz", "i_meas": "n_meas_rpm",
        "event_tol": "f_Hz_atol",
        "scalars": [
            ("E_source_kWh", "kWh"), ("E_bat_kWh", "kWh"), ("E_load_kWh", "kWh"), ("E_rotor_kWh", "kWh"),
            ("SOC_true_end_pct", "pp"), ("SOC_est_end_pct", "pp"), ("SOC_err_end_pp", "pp"),
        ],
    },
}

KEY_POINTS = [19.9, 21.5, 26.0, 60.0]


def sha256_file(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def close_within(observed, expected, rtol, atol):
    return abs(observed - expected) <= max(atol, rtol * abs(expected))


def _amax(arr):
    m = 0.0
    for v in arr:
        if isinstance(v, (int, float)) and math.isfinite(v) and abs(v) > m:
            m = abs(v)
    return m


def series_limit(sid, arr, tol):
    if sid == "t":
        return tol["t_s"]
    if sid.endswith("_Hz"):
        return tol.get("f_Hz_atol", 1e-9)
    if sid.endswith("_rpm"):
        return tol.get("n_rpm_atol", 1e-9)
    if sid.endswith("_kW"):
        return max(tol["P_kW_atol"], tol["P_kW_rtol"] * max(1.0, _amax(arr)))
    if sid.startswith("SOC"):
        return tol["SOC_pp"]
    if sid.startswith("I_") or sid.startswith("bias"):
        return max(tol["I_A_atol"], tol["I_A_rtol"] * max(1.0, _amax(arr)))
    if "r_true" in sid:
        return tol["r_true_kW"]
    return tol.get("r_meas_kW_atol", tol.get("f_Hz_atol", 1e-9))


def metric_within(mid, unit, fv, gv, tol):
    if unit == "kWh":
        return close_within(fv, gv, 1e-12, tol["E_kWh"])
    if unit in ("pp", "%"):
        return close_within(fv, gv, 1e-12, tol["SOC_pp"])
    if mid.startswith("max_abs_r_true"):
        return abs(fv - gv) <= tol["r_true_kW"]
    if mid.startswith("max_abs_f_channel_diff"):
        return abs(fv - gv) <= tol.get("f_Hz_atol", 1e-9)
    if mid.startswith("max_abs_r_meas"):
        return abs(fv - gv) <= tol["r_meas_kW_atol"]
    return close_within(fv, gv, tol["I_A_rtol"], tol["I_A_atol"])


def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    model = args[0] if args and args[0] in MODELS else "fl001"
    cfg = MODELS[model]
    oracle = cfg["oracle"]
    golden_path = os.path.join(ROOT, "data", "golden", model + "_v1.json")
    sidecar = golden_path + ".sha256"

    report = {"python_version": platform.python_version(), "model": model,
              "golden": golden_path, "checks": [], "problems": []}
    out_path = None
    if "--json" in argv:
        i = argv.index("--json")
        if i + 1 < len(argv):
            out_path = argv[i + 1]

    def rec(cid, ok, detail):
        report["checks"].append({"check_id": cid, "status": "pass" if ok else "fail", "detail": detail})
        return ok

    if not os.path.exists(golden_path):
        rec("V-01-golden-exists", False, "缺少 " + golden_path)
        _finish(report, out_path)
        return 1
    try:
        with open(golden_path, "r", encoding="utf-8") as f:
            golden = json.load(f)
    except Exception as e:  # noqa: BLE001
        rec("V-01-golden-exists", False, "golden 解析失败：%s" % e)
        _finish(report, out_path)
        return 1
    rec("V-01-golden-exists", True, "已加载（%d 字节）" % os.path.getsize(golden_path))

    if os.path.exists(sidecar):
        with open(sidecar, "r", encoding="utf-8") as f:
            expected = f.read().split()[0].strip().lower()
        actual = sha256_file(golden_path).lower()
        rec("V-02-golden-sha256", expected == actual,
            "sidecar=%s actual=%s" % (expected[:16], actual[:16]))
    else:
        rec("V-02-golden-sha256", False, "缺少 " + sidecar)

    rec_oracle = golden.get("generated_by", {}).get("oracle_source_sha256")
    cur_oracle = oracle._oracle_source_sha256()
    rec("V-03-oracle-source-hash", bool(rec_oracle) and rec_oracle == cur_oracle,
        "golden 记录=%s 当前=%s" % (str(rec_oracle)[:16], cur_oracle[:16]))

    approval = golden.get("approval") or {}
    if approval.get("approved_golden_sha256"):
        import copy as _copy
        payload = _copy.deepcopy(golden)
        payload.pop("generated_by", None)
        payload.pop("approval", None)
        digest = hashlib.sha256(
            json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")).hexdigest()
        rec("V-03b-approval-digest", digest == approval["approved_golden_sha256"],
            "记录=%s 重算=%s（approved_by=%s）" % (
                approval["approved_golden_sha256"][:12], digest[:12],
                approval.get("approved_by", "?")))

    ok, checks = oracle.self_check()
    rec("V-04-oracle-self-check", ok,
        "; ".join("%s=%s" % (c["check_id"], c["status"]) for c in checks))
    if not ok:
        report["problems"].extend([{"check": "V-04", "detail": c} for c in checks if c["status"] == "fail"])
        _finish(report, out_path)
        return 2

    tol = golden.get("tolerances", {}).get("gate")
    all_ok = True
    n = golden.get("sampling", {}).get("n")

    for run_key, g_run in golden.get("runs", {}).items():
        spec = next((s for s in oracle.RUNS if s["key"] == run_key), None)
        if spec is None:
            rec("V-05-run-%s" % run_key, False, "未知 Run key")
            all_ok = False
            continue
        fresh = oracle.simulate_run(spec)

        # V-05 关键点（true/meas 电流对）
        kp_ok = True
        for tt in KEY_POINTS:
            idx = int(round(tt / golden["sampling"]["dt_s"]))
            for sid in (cfg["i_true"], cfg["i_meas"]):
                gv = g_run["series"][sid][idx]
                fv = fresh["series"][sid][idx]
                if not close_within(fv, gv, tol["I_A_rtol"], tol["I_A_atol"]):
                    kp_ok = False
                    report["problems"].append({"check": "V-05-keypoint", "run": run_key,
                                               "t": tt, "signal": sid, "golden": gv, "fresh": fv})
        rec("V-05-keypoints-%s" % run_key, kp_ok,
            "19.9/21.5/26.0/60.0 s 的 %s/%s 逐点" % (cfg["i_true"], cfg["i_meas"]))
        all_ok = all_ok and kp_ok

        # V-06 标量（gate 容差）
        sc_ok = True
        for name, kind in cfg["scalars"]:
            gv = g_run["scalars"][name]
            fv = fresh["scalars"][name]
            lim = tol["E_kWh"] if kind == "kWh" else tol["SOC_pp"]
            if not close_within(fv, gv, 1e-12, lim):
                sc_ok = False
                report["problems"].append({"check": "V-06-scalar", "run": run_key, "field": name,
                                           "golden": gv, "fresh": fv, "tolerance": lim, "unit": kind})
        rec("V-06-scalars-%s" % run_key, sc_ok, "E/SOC 标量（gate ±1e-6 kWh / ±1e-5 pp）")
        all_ok = all_ok and sc_ok

        # V-07 序列
        series_problems_before = len(report["problems"])
        for sid, g_arr in g_run["series"].items():
            f_arr = fresh["series"].get(sid)
            if f_arr is None or len(f_arr) != n or len(g_arr) != n:
                report["problems"].append({"check": "V-07-series", "run": run_key, "signal": sid,
                                           "status": "fail", "reason": "缺少或点数不一致"})
                continue
            lim = series_limit(sid, g_arr, tol)
            bad = max((abs(a - b) for a, b in zip(g_arr, f_arr)), default=0.0)
            if bad > lim:
                report["problems"].append({"check": "V-07-series", "run": run_key, "signal": sid,
                                           "status": "fail", "observed_max_abs_diff": bad, "tolerance": lim})
        series_ok = len(report["problems"]) == series_problems_before
        rec("V-07-series-%s" % run_key, series_ok, "%d 点全精度序列（rtol 1e-12）" % n)
        all_ok = all_ok and series_ok

        # V-08 指标
        m_ok = True
        for mid, gm in g_run["metrics"].items():
            gv = gm.get("value")
            fv = fresh["metrics"].get(mid, {}).get("value")
            if gv is None or fv is None:
                if (gv is None) != (fv is None):
                    m_ok = False
                    report["problems"].append({"check": "V-08-metric", "run": run_key,
                                               "metric": mid, "golden": gv, "fresh": fv})
                continue
            if not metric_within(mid, gm.get("unit"), fv, gv, tol):
                m_ok = False
                report["problems"].append({"check": "V-08-metric", "run": run_key,
                                           "metric": mid, "golden": gv, "fresh": fv})
        rec("V-08-metrics-%s" % run_key, m_ok, "指标集（%d 项）" % len(g_run["metrics"]))
        all_ok = all_ok and m_ok

        # V-09 事件
        g_ev = g_run.get("events") or []
        f_ev = fresh.get("events") or []
        if len(g_ev) != len(f_ev):
            rec("V-09-events-%s" % run_key, False, "事件数不一致")
            all_ok = False
        elif not g_ev:
            rec("V-09-events-%s" % run_key, True, "无故障运行无事件（预期）")
        else:
            ge, fe = g_ev[0], f_ev[0]
            gp, gq = ge["snapshots"][0], ge["snapshots"][1]
            fp, fq = fe["snapshots"][0], fe["snapshots"][1]
            t_f = golden["config"]["fault_time_s"]
            ev_tol = tol[cfg.get("event_tol", "I_A_atol")]
            ev_ok = (gp["t_s"] == fp["t_s"] == t_f and gq["t_s"] == fq["t_s"] == t_f
                     and gp["derivation"] == fp["derivation"] == "left_limit"
                     and gq["derivation"] == fq["derivation"] == "post_sample"
                     and abs(fp["variables"][cfg["i_meas"]] - gp["variables"][cfg["i_meas"]]) <= ev_tol
                     and abs(fq["variables"][cfg["i_meas"]] - gq["variables"][cfg["i_meas"]]) <= ev_tol)
            rec("V-09-events-%s" % run_key, ev_ok,
                "pre/post t_s=事件时刻、derivation、%s 相位值" % cfg["i_meas"])
            all_ok = all_ok and ev_ok

    report["ok"] = all_ok and not report["problems"]
    _finish(report, out_path)
    if not report["ok"]:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps({"ok": True, "model": model,
                      "golden_sha256": sha256_file(golden_path),
                      "oracle_source_sha256": oracle._oracle_source_sha256(),
                      "approved_by": (golden.get("approval") or {}).get("approved_by"),
                      "checks": report["checks"]}, ensure_ascii=False, indent=2))
    return 0


def _finish(report, out_path):
    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
