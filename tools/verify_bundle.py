# -*- coding: utf-8 -*-
"""verify_bundle.py — EvidenceBundle v1 第三方离线复核（DATA_CONTRACT_SPEC §2.12 / P0a-08）。

用法：
  python tools/verify_bundle.py <bundle_dir>

校验内容（不依赖浏览器、不 import 产品 engine）：
  B-01 目录含 8 个文件（7 数据文件 + SHA256SUMS.txt）；
  B-02 manifest.json 可解析，bundle_schema_version=v1、event_encoding_version=1；
  B-03 manifest.files 的 sha256/bytes 与实际文件一致；
  B-04 SHA256SUMS.txt 与全部 7 文件一致；
  B-05 timeseries.csv 结构：BOM/注释头/表头/601 数据行/t 单调递增/数值有限；
  B-06 events.json pre/post 成对且 t_s 一致；
  B-07 metrics.json 数值为有限数或 null（null 必须带 unavailable_reason）；
  B-08 config.json 契约字段面完整（schema_version/model_id/model_version/duration_s/dt_s/
       fault_time_s/bias_A/feedback_mode/initial_*/noise）。

run_hash 重算依赖与产品一致的 canonical JSON（JS Number::toString），故由应用内导入路径
（FL.bundle.importBundle → registry.computeRunHashFromParts）判定；本脚本校验文件层与结构层。

退出码：0=全部通过；1=存在失败项。
"""

import hashlib
import json
import math
import os
import sys

REQUIRED = ["manifest.json", "config.json", "model_manifest.json", "timeseries.csv",
            "events.json", "metrics.json", "checks.json", "SHA256SUMS.txt"]
DATA_FILES = ["config.json", "model_manifest.json", "timeseries.csv", "events.json", "metrics.json", "checks.json"]


def sha256_bytes(b):
    return hashlib.sha256(b).read() if False else hashlib.sha256(b).hexdigest()


def main(argv):
    if len(argv) < 2:
        print("用法：python tools/verify_bundle.py <bundle_dir>")
        return 1
    root = argv[1]
    problems = []
    checks = []

    def rec(cid, ok_, detail):
        checks.append({"check_id": cid, "status": "pass" if ok_ else "fail", "detail": detail})
        if not ok_:
            problems.append({"check": cid, "detail": detail})

    # B-01 文件齐全
    missing = [f for f in REQUIRED if not os.path.exists(os.path.join(root, f))]
    rec("B-01-files-present", not missing, "缺少：" + "、".join(missing) if missing else "8 文件齐全")
    if missing:
        print(json.dumps({"ok": False, "checks": checks, "problems": problems}, ensure_ascii=False, indent=2))
        return 1

    raw = {f: open(os.path.join(root, f), "rb").read() for f in REQUIRED}

    # B-02 manifest
    try:
        manifest = json.loads(raw["manifest.json"].decode("utf-8"))
        rec("B-02-manifest", manifest.get("bundle_schema_version") == "v1"
            and manifest.get("event_encoding_version") == 1,
            "bundle_schema_version=%s event_encoding_version=%s" % (
                manifest.get("bundle_schema_version"), manifest.get("event_encoding_version")))
    except Exception as e:  # noqa: BLE001
        rec("B-02-manifest", False, "manifest.json 解析失败：%s" % e)
        print(json.dumps({"ok": False, "checks": checks, "problems": problems}, ensure_ascii=False, indent=2))
        return 1

    # B-03 manifest.files 校验
    by_path = {f.get("path"): f for f in manifest.get("files", [])}
    for name in DATA_FILES:
        rec_file = by_path.get(name)
        actual = hashlib.sha256(raw[name]).hexdigest()
        ok_ = bool(rec_file) and str(rec_file.get("sha256", "")).lower() == actual
        rec("B-03-sha256:" + name, ok_, "manifest=%s actual=%s" % (
            str((rec_file or {}).get("sha256"))[:12], actual[:12]))

    # B-04 SHA256SUMS.txt
    sums = raw["SHA256SUMS.txt"].decode("utf-8", errors="replace")
    got = {}
    for line in sums.splitlines():
        parts = line.strip().split()
        if len(parts) == 2:
            got[parts[1].lstrip("*")] = parts[0].lower()
    for name in REQUIRED:
        if name == "SHA256SUMS.txt":
            continue
        expect = hashlib.sha256(raw[name]).hexdigest()
        rec("B-04-sums:" + name, got.get(name) == expect,
            "sums=%s actual=%s" % (str(got.get(name))[:12], expect[:12]))

    # B-05 timeseries.csv
    csv_text = raw["timeseries.csv"].decode("utf-8-sig")
    lines = [l for l in csv_text.split("\n") if l.strip()]
    comments = [l for l in lines if l.startswith("#")]
    body = [l for l in lines if not l.startswith("#")]
    rec("B-05-csv-header", len(comments) >= 6 and len(body) == 602,
        "注释 %d 行（需≥6），表头+数据 %d 行（需 602）" % (len(comments), len(body)))
    data_rows = [l.split(",") for l in body[1:]] if body else []
    t_ok = True
    finite_ok = True
    prev = None
    for cells in data_rows:
        try:
            tv = float(cells[0])
        except ValueError:
            t_ok = False
            break
        if prev is not None and not tv > prev:
            t_ok = False
            break
        prev = tv
        for c in cells[1:]:
            if c == "":
                continue
            try:
                v = float(c)
                if not math.isfinite(v):
                    finite_ok = False
            except ValueError:
                finite_ok = False
    rec("B-05-csv-time", t_ok, "t 列严格递增" if t_ok else "t 列非单调/非法")
    rec("B-05-csv-finite", finite_ok, "数值有限" if finite_ok else "存在 NaN/Infinity/非法值")
    # 20.0 行存在（post）
    has20 = any(abs(float(r[0]) - 20.0) < 1e-9 for r in data_rows if r)
    rec("B-05-csv-t20", has20, "t=20.0 行存在（post 采样行）")

    # B-06 events
    try:
        ev = json.loads(raw["events.json"].decode("utf-8"))
        events = ev.get("events", [])
        ok_ev = True
        detail = "%d 个事件" % len(events)
        for e in events:
            snaps = e.get("snapshots", [])
            phases = {s.get("phase"): s for s in snaps}
            if "pre" not in phases or "post" not in phases:
                ok_ev = False
                detail += "；事件 %s 缺 pre/post" % e.get("event_id")
            elif abs(phases["pre"].get("t_s", -1) - e.get("trigger_s", -2)) > 1e-9 or \
                    abs(phases["post"].get("t_s", -1) - e.get("trigger_s", -2)) > 1e-9:
                ok_ev = False
                detail += "；事件 %s 快照 t_s ≠ trigger_s" % e.get("event_id")
            elif phases["pre"].get("derivation") != "left_limit" or phases["post"].get("derivation") != "post_sample":
                ok_ev = False
                detail += "；事件 %s derivation 错误" % e.get("event_id")
        rec("B-06-events", ok_ev, detail)
    except Exception as e:  # noqa: BLE001
        rec("B-06-events", False, "events.json 解析失败：%s" % e)

    # B-07 metrics
    try:
        mw = json.loads(raw["metrics.json"].decode("utf-8"))
        metrics = mw.get("metrics", [])
        ok_m = len(metrics) > 0
        bad = []
        for m in metrics:
            v = m.get("value")
            if v is None:
                if not m.get("unavailable_reason"):
                    bad.append(m.get("metric_id") + "(缺 unavailable_reason)")
            elif isinstance(v, (int, float)) and not math.isfinite(v):
                bad.append(m.get("metric_id") + "(非有限)")
            elif not isinstance(v, (int, float, str)):
                bad.append(m.get("metric_id") + "(类型非法)")
        rec("B-07-metrics", ok_m and not bad,
            "%d 项指标" % len(metrics) if not bad else "问题：" + "、".join(bad))
    except Exception as e:  # noqa: BLE001
        rec("B-07-metrics", False, "metrics.json 解析失败：%s" % e)

    # B-07b checks 汇总
    try:
        cw = json.loads(raw["checks.json"].decode("utf-8"))
        summary = cw.get("summary", {})
        rec("B-07-checks-summary", summary.get("status") in ("pass", "fail"),
            "汇总状态=%s（fail 项=%s）" % (summary.get("status"), summary.get("failed_ids")))
    except Exception as e:  # noqa: BLE001
        rec("B-07-checks-summary", False, "checks.json 解析失败：%s" % e)

    # B-08 config 契约字段面
    try:
        sc = json.loads(raw["config.json"].decode("utf-8"))
        need = ["schema_version", "model_id", "model_version", "duration_s", "dt_s", "fault_time_s",
                "bias_A", "feedback_mode", "initial_SOC_pct", "initial_load_kW", "noise"]
        miss = [k for k in need if k not in sc]
        rec("B-08-config", not miss, "契约 §2.1 字段齐全" if not miss else "缺少：" + "、".join(miss))
    except Exception as e:  # noqa: BLE001
        rec("B-08-config", False, "config.json 解析失败：%s" % e)

    ok_all = not problems
    print(json.dumps({"ok": ok_all, "bundle": root,
                      "run_hash": (manifest.get("integrity") or {}).get("run_hash"),
                      "checks": checks, "problems": problems}, ensure_ascii=False, indent=2))
    return 0 if ok_all else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
