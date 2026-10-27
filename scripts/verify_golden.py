# -*- coding: utf-8 -*-
"""verify_golden.py — 一键校验：重跑独立 oracle → 按 MODEL_VALIDATION_SPEC §3.6 容差比对 golden。

用法：
  python scripts/verify_golden.py                # 人读输出
  python scripts/verify_golden.py --json out.json   # 机器可读报告

退出码：0=全部通过；1=数值/容差不通过（或 golden/oracle 缺失损坏）；2=oracle 内部自检失败。

校验项：
  V-01 golden 文件存在且可解析；
  V-02 golden 自身 SHA-256 与 data/golden/fl001_v1.sha256 一致；
  V-03 generated_by.oracle_source_sha256 == 当前 tools/oracle/fl001_oracle.py 的 SHA-256；
  V-04 oracle 自检（SC-1…SC-6）全部通过；
  V-05 三组 Run 的 §3.2 关键点（19.9 / pre / post / 21.5 / 26.0 / 60.0）在容差内；
  V-06 三组 Run 的 §3.3 标量（E/SOC/SOC_err）在容差内（gate ±1e-6 kWh / ±1e-5 pp）；
  V-07 三组 Run 的 601 点序列与 oracle 重算逐点一致（I/P rtol 1e-12 + atol 1e-15；t ≤1e-9 s）；
  V-08 P0 指标值在容差内；
  V-09 事件快照 pre/post（t_s=20.0、derivation、I_meas 25/35）。

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
GOLDEN_PATH = os.path.join(ROOT, "data", "golden", "fl001_v1.json")
SHA_SIDECAR = GOLDEN_PATH + ".sha256"

sys.path.insert(0, ORACLE_DIR)
import fl001_oracle as oracle  # noqa: E402

KEY_POINTS = [19.9, 21.5, 26.0, 60.0]


def sha256_file(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def close_within(observed, expected, rtol, atol):
    return abs(observed - expected) <= max(atol, rtol * abs(expected))


def cmp_series(golden_series, fresh_series, tol, problems, run_key, n):
    for sid, arr in golden_series.items():
        fresh = fresh_series.get(sid)
        if fresh is None:
            problems.append({"check": "V-07-series", "run": run_key, "signal": sid,
                             "status": "fail", "reason": "oracle 重算缺少该信号"})
            continue
        if sid == "t":
            bad = max((abs(a - b) for a, b in zip(arr, fresh)), default=0.0)
            lim = tol["t_s"]
        elif sid.endswith("_kW"):
            bad = max((abs(a - b) for a, b in zip(arr, fresh)), default=0.0)
            lim = max(tol["P_kW_atol"], tol["P_kW_rtol"] * max(1.0, _amax(arr)))
        elif sid in ("I_bat_true_A", "I_bat_meas_A", "bias_A"):
            bad = max((abs(a - b) for a, b in zip(arr, fresh)), default=0.0)
            lim = max(tol["I_A_atol"], tol["I_A_rtol"] * max(1.0, _amax(arr)))
        elif sid.startswith("SOC"):
            bad = max((abs(a - b) for a, b in zip(arr, fresh)), default=0.0)
            lim = tol["SOC_pp"] if sid == "SOC_err" else tol["SOC_pp"]
        else:
            bad = max((abs(a - b) for a, b in zip(arr, fresh)), default=0.0)
            lim = tol["r_true_kW"] if "r_true" in sid else tol["r_meas_kW_atol"]
        if bad > lim:
            problems.append({"check": "V-07-series", "run": run_key, "signal": sid,
                             "status": "fail", "observed_max_abs_diff": bad, "tolerance": lim})
    if len(golden_series.get("t", [])) != n:
        problems.append({"check": "V-07-series", "run": run_key, "status": "fail",
                         "reason": "点数 %d != %d" % (len(golden_series.get("t", [])), n)})


def _amax(arr):
    m = 0.0
    for v in arr:
        if isinstance(v, (int, float)) and math.isfinite(v) and abs(v) > m:
            m = abs(v)
    return m


def main(argv):
    report = {"python_version": platform.python_version(),
              "golden": GOLDEN_PATH, "checks": [], "problems": []}
    out_path = None
    if "--json" in argv:
        i = argv.index("--json")
        if i + 1 < len(argv):
            out_path = argv[i + 1]

    def rec(cid, ok, detail):
        report["checks"].append({"check_id": cid, "status": "pass" if ok else "fail", "detail": detail})
        return ok

    # V-01 golden 存在
    if not os.path.exists(GOLDEN_PATH):
        rec("V-01-golden-exists", False, "缺少 " + GOLDEN_PATH)
        _finish(report, out_path)
        return 1
    try:
        with open(GOLDEN_PATH, "r", encoding="utf-8") as f:
            golden = json.load(f)
    except Exception as e:  # noqa: BLE001
        rec("V-01-golden-exists", False, "golden 解析失败：%s" % e)
        _finish(report, out_path)
        return 1
    rec("V-01-golden-exists", True, "已加载（%d 字节）" % os.path.getsize(GOLDEN_PATH))

    # V-02 sidecar 校验和
    if os.path.exists(SHA_SIDECAR):
        with open(SHA_SIDECAR, "r", encoding="utf-8") as f:
            expected = f.read().split()[0].strip().lower()
        actual = sha256_file(GOLDEN_PATH).lower()
        rec("V-02-golden-sha256", expected == actual,
            "sidecar=%s actual=%s" % (expected[:16], actual[:16]))
    else:
        rec("V-02-golden-sha256", False, "缺少 " + SHA_SIDECAR)

    # V-03 oracle 源码哈希
    rec_oracle = golden.get("generated_by", {}).get("oracle_source_sha256")
    cur_oracle = oracle._oracle_source_sha256()
    rec("V-03-oracle-source-hash", bool(rec_oracle) and rec_oracle == cur_oracle,
        "golden 记录=%s 当前=%s" % (str(rec_oracle)[:16], cur_oracle[:16]))

    # V-04 oracle 自检
    ok, checks = oracle.self_check()
    rec("V-04-oracle-self-check", ok,
        "; ".join("%s=%s" % (c["check_id"], c["status"]) for c in checks))
    if not ok:
        report["problems"].extend([{"check": "V-04", "detail": c} for c in checks if c["status"] == "fail"])
        _finish(report, out_path)
        return 2

    tol = golden.get("tolerances", {}).get("gate", oracle.TOLERANCES["gate"])
    all_ok = True

    # V-05/V-06/V-07/V-08/V-09 逐 Run
    for run_key, g_run in golden.get("runs", {}).items():
        spec = next((s for s in oracle.RUNS if s["key"] == run_key), None)
        if spec is None:
            rec("V-05-run-%s" % run_key, False, "未知 Run key")
            all_ok = False
            continue
        fresh = oracle.simulate_run(spec)

        # V-05 关键点
        kp_ok = True
        for tt in KEY_POINTS:
            idx = int(round(tt / golden["sampling"]["dt_s"]))
            for sid in ("I_bat_true_A", "I_bat_meas_A"):
                gv = g_run["series"][sid][idx]
                fv = fresh["series"][sid][idx]
                if not close_within(fv, gv, tol["I_A_rtol"], tol["I_A_atol"]):
                    kp_ok = False
                    report["problems"].append({"check": "V-05-keypoint", "run": run_key,
                                               "t": tt, "signal": sid, "golden": gv, "fresh": fv})
        rec("V-05-keypoints-%s" % run_key, kp_ok,
            "19.9/21.5/26.0/60.0 s 的 I_true/I_meas 逐点")

        # V-06 标量
        sc_ok = True
        for name, lim, unit in (("E_bat_true_kWh", tol["E_kWh"], "kWh"),
                                ("E_gen_true_kWh", tol["E_kWh"], "kWh"),
                                ("E_load_served_kWh", 1e-9, "kWh"),
                                ("SOC_true_end_pct", tol["SOC_pp"], "pp"),
                                ("SOC_est_end_pct", tol["SOC_pp"], "pp"),
                                ("SOC_err_end_pp", tol["SOC_pp"], "pp")):
            gv = g_run["scalars"][name]
            fv = fresh["scalars"][name]
            if not close_within(fv, gv, 1e-12, lim):
                sc_ok = False
                report["problems"].append({"check": "V-06-scalar", "run": run_key, "field": name,
                                           "golden": gv, "fresh": fv, "tolerance": lim, "unit": unit})
        rec("V-06-scalars-%s" % run_key, sc_ok, "E/SOC 标量（gate ±1e-6 kWh / ±1e-5 pp）")
        all_ok = all_ok and sc_ok

        # V-07 序列
        cmp_series(g_run["series"], fresh["series"], tol, report["problems"], run_key,
                   golden["sampling"]["n"])
        series_ok = not any(p.get("check") == "V-07-series" and p.get("run") == run_key
                            for p in report["problems"])
        rec("V-07-series-%s" % run_key, series_ok, "601 点全精度序列（rtol 1e-12）")
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
            if mid.startswith("E_"):
                good = close_within(fv, gv, 1e-12, tol["E_kWh"])
            elif "SOC" in mid:
                good = close_within(fv, gv, 1e-12, tol["SOC_pp"])
            elif mid.startswith("max_abs_r_true"):
                good = abs(fv - gv) <= tol["r_true_kW"]
            elif mid.startswith("max_abs_r_meas"):
                good = abs(fv - gv) <= tol["r_meas_kW_atol"]
            else:
                good = close_within(fv, gv, tol["I_A_rtol"], tol["I_A_atol"])
            if not good:
                m_ok = False
                report["problems"].append({"check": "V-08-metric", "run": run_key,
                                           "metric": mid, "golden": gv, "fresh": fv})
        rec("V-08-metrics-%s" % run_key, m_ok, "P0 指标集 11 项")
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
            gp = ge["snapshots"][0]
            gq = ge["snapshots"][1]
            fp = fe["snapshots"][0]
            fq = fe["snapshots"][1]
            ev_ok = (gp["t_s"] == fp["t_s"] == 20.0 and gq["t_s"] == fq["t_s"] == 20.0
                     and gp["derivation"] == fp["derivation"] == "left_limit"
                     and gq["derivation"] == fq["derivation"] == "post_sample"
                     and abs(fp["variables"]["I_bat_meas_A"] - gp["variables"]["I_bat_meas_A"]) <= tol["I_A_atol"]
                     and abs(fq["variables"]["I_bat_meas_A"] - gq["variables"]["I_bat_meas_A"]) <= tol["I_A_atol"])
            rec("V-09-events-%s" % run_key, ev_ok, "pre/post t_s=20.0、derivation、I_meas 25/35")
            all_ok = all_ok and ev_ok

    report["ok"] = all_ok and not report["problems"]
    _finish(report, out_path)
    if not report["ok"]:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps({"ok": True, "golden_sha256": sha256_file(GOLDEN_PATH),
                      "oracle_source_sha256": oracle._oracle_source_sha256(),
                      "checks": report["checks"]}, ensure_ascii=False, indent=2))
    return 0


def _finish(report, out_path):
    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
