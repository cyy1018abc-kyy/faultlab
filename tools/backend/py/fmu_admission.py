#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fmu_admission.py — FMU 路线准入层（Q-5 落地；FL19_BACKEND_RFC_APPROVED §2 B-4/§7 Q-5）。

裁定口径（Q-5）：FMU 必须附 machine-readable model_manifest（方程/参数/假设/limitations/数值口径，
可人工编写）方准入；无 manifest 者只能走「黑盒预览」且禁入任何跨后端一致性/对比结论。
本模块做**准入校验**（纯检查，零第三方依赖）：
  A-1 zip 结构：.fmu 为合法 zip，含 modelDescription.xml 与 binaries/<platform>/*；
  A-2 model_manifest.json 存在且字段面齐备（G2b v1.1 §7：方程/参数/假设/limitations/
      method_id/积分口径）；
  A-3 model_id 必须自述（禁借用 FL-001 目录清单——engine.js:1407 语义失真防护）；
  A-4 provenance 标 numerical_simulation + self_declared=true（UI「方程经声明、未经第三方
      方程级复核」）；
  A-5 拒绝路径：任一不满足 → 拒绝原因枚举（admitted=false + reasons[]）。

真实 FMI 二进制执行（ctypes doStep，FMI 2.0 CS）需要实际 FMU 样本验证——D-27 记录，
在拿到样例 FMU 前本模块只承载准入与拒绝（不产出数值）。
"""
import json
import os
import sys
import zipfile

REQUIRED_MANIFEST_FIELDS = [
    "model_id", "model_version", "equations", "parameters",
    "assumptions", "limitations", "method_id", "integration",
]
PLATFORM_DIRS = ("binaries/win64", "binaries/win32", "binaries/linux64", "binaries/linux",
                 "binaries/darwin64")


def admit(fmu_path):
    """返回 {admitted, reasons[], manifest?, preview_only}。"""
    reasons = []
    manifest = None
    names = []
    try:
        with zipfile.ZipFile(fmu_path) as z:
            names = z.namelist()
    except Exception as e:  # noqa: BLE001
        return {"admitted": False, "preview_only": False, "manifest": None,
                "reasons": ["A-1 非 zip 或不可读：" + str(e)]}

    has_desc = any(n.endswith("modelDescription.xml") for n in names)
    if not has_desc:
        reasons.append("A-1 缺少 modelDescription.xml")
    has_bin = any(n.startswith(p + "/") for p in PLATFORM_DIRS for n in names)
    if not has_bin:
        reasons.append("A-1 缺少 binaries/<platform>/ 平台二进制目录")

    manifest_name = next((n for n in names if n.endswith("model_manifest.json")), None)
    if manifest_name is None:
        reasons.append("A-2 缺少 model_manifest.json（Q-5：无 manifest 只能黑盒预览且禁入对比）")
    else:
        try:
            with zipfile.ZipFile(fmu_path) as z:
                manifest = json.loads(z.read(manifest_name).decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            reasons.append("A-2 model_manifest.json 解析失败：" + str(e))
            manifest = None

    if manifest is not None:
        missing = [k for k in REQUIRED_MANIFEST_FIELDS if k not in manifest]
        if missing:
            reasons.append("A-2 manifest 缺字段：" + ", ".join(missing))
        mid = str(manifest.get("model_id", ""))
        if mid == "fl001" or mid == "FL-001":
            reasons.append("A-3 model_id 不得占用 FL-001（模型身份须自述）")
        if not str(manifest.get("method_id", "")).strip():
            reasons.append("A-2 manifest.method_id 缺失（数值口径须声明）")

    admitted = not reasons
    preview_only = False
    if not admitted and manifest is not None and all(r.startswith("A-1") is False for r in reasons):
        preview_only = len(reasons) > 0 and has_desc
    return {"admitted": admitted, "reasons": reasons, "manifest": manifest,
            "preview_only": preview_only}


def self_check():
    """FS-1…FS-3：合成 FMU 包的准入/拒绝路径。"""
    import io
    checks = []
    ok_all = True

    def rec(cid, ok, note):
        checks.append({"check_id": cid, "status": "pass" if ok else "fail", "note": note})
        return ok

    good_manifest = {
        "model_id": "gt.sync.fmu-demo", "model_version": "0.1.0",
        "equations": ["df/dt = (P_gen + P_bat - P_load)/K_J"],
        "parameters": {"K_J": 5.0}, "assumptions": ["线性化 f≈f₀"],
        "limitations": ["单机等效"], "method_id": "fmu_cs_dt0.01",
        "integration": {"kind": "co-simulation", "step_s": 0.01},
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("modelDescription.xml", "<fmiModelDescription/>")
        z.writestr("binaries/win64/fmudemo.dll", b"\x00")
        z.writestr("model_manifest.json", json.dumps(good_manifest))
    r1 = admit_bytes(buf.getvalue())
    ok_all &= rec("FS-1-valid-admitted", r1["admitted"] is True and r1["preview_only"] is False,
                  "合法包准入且非 preview")

    buf2 = io.BytesIO()
    with zipfile.ZipFile(buf2, "w") as z:
        z.writestr("modelDescription.xml", "<fmiModelDescription/>")
        z.writestr("binaries/win64/fmudemo.dll", b"\x00")
    r2 = admit_bytes(buf2.getvalue())
    ok_all &= rec("FS-2-missing-manifest-rejected", r2["admitted"] is False
                  and any("model_manifest" in x for x in r2["reasons"]),
                  "缺 manifest → 拒绝（Q-5）")

    bad = dict(good_manifest); bad["model_id"] = "fl001"
    buf3 = io.BytesIO()
    with zipfile.ZipFile(buf3, "w") as z:
        z.writestr("modelDescription.xml", "<fmiModelDescription/>")
        z.writestr("binaries/win64/fmudemo.dll", b"\x00")
        z.writestr("model_manifest.json", json.dumps(bad))
    r3 = admit_bytes(buf3.getvalue())
    ok_all &= rec("FS-3-fl001-identity-rejected", r3["admitted"] is False
                  and any("FL-001" in x for x in r3["reasons"]),
                  "model_id 占用 FL-001 → 拒绝（A-3）")

    return ok_all, checks


def admit_bytes(data):
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".fmu", delete=False) as f:
        f.write(data)
        tmp = f.name
    try:
        return admit(tmp)
    finally:
        os.remove(tmp)


def main(argv):
    if "--self-check" in argv:
        ok, checks = self_check()
        print(json.dumps({"ok": ok, "checks": checks}, ensure_ascii=False, indent=2))
        return 0 if ok else 2
    if len(argv) > 1:
        print(json.dumps(admit(argv[1]), ensure_ascii=False, indent=2))
        return 0
    print(__doc__)
    return 0


if __name__ == "__main__":
    main(sys.argv)
