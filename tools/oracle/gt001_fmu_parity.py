# -*- coding: utf-8 -*-
"""gt001_fmu_parity.py — GT-001 L1-FMU C↔Python parity 机检（R-GTFMU / GTFMU-G2b-04；
CHG-20261119-01 批准链）。fc001_fmu_parity.py 同构：64 位解释器定位 / 逐点散差 /
SKIP 语义 exit 3（含 D-12「包内无当前平台二进制」⇒ skip——CHG-20261127-01）。GT 特有 = R-1 pow() 跨 libm 散差（healthy/monitor 0.0 + 故障局
~2.5e-4 规模相对——×≥10 冻结 gate 值远在 T-B golden gates 内）。"""
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
FMU_THERMO = os.path.join(ROOT, "data", "fmu", "gt001_l1_v1.fmu")
FMU_COMB = os.path.join(ROOT, "data", "fmu", "gt001_comb_l1_v1.fmu")
RUNNER = os.path.join(ROOT, "tools", "backend", "py", "fmu_runner.py")
PARITY_RTLIM = 1e-3   # ×≥10 冻结制：实测 2.55e-4 × 10 = 2.55e-3 → 阈值 1e-3（R-1 pow 跨 libm 散差——T-B golden gates 远大于此）


def platform_binary_missing(fmu_paths):
    """D-12 SKIP 语义补全（CHG-20261127-01——V1170_WAVE_DESIGN DEC-2）：包内无当前平台
    二进制 ⇒ 返回原因串（调用方记 status=skip exit 3，不记 fail）；全部在位 ⇒ None。
    平台映射与 fmu_runner.load_fmu 同口径（win32 → win64/.dll，linux → linux64/.so）。"""
    import zipfile
    if sys.platform == "win32":
        plat = "win64"
    elif sys.platform == "linux":
        plat = "linux64"
    else:
        return "非支持平台：%s（FMU 包仅含 win64/linux64 二进制）" % sys.platform
    lacking = []
    for p in fmu_paths:
        with zipfile.ZipFile(p) as z:
            if not any(n.startswith("binaries/%s/" % plat) for n in z.namelist()):
                lacking.append(os.path.basename(p))
    if lacking:
        return "包内无当前平台二进制 binaries/%s/：%s" % (plat, ", ".join(lacking))
    return None


def _find_py64():
    cand = []
    if os.environ.get("FAULTLAB_PY64"):
        cand.append(os.environ["FAULTLAB_PY64"])
    w = shutil.which("python3.14")
    if w:
        cand.append(w)
    cand.append(sys.executable)
    for p in cand:
        if p and os.path.exists(p):
            r = subprocess.run([p, "-I", "-c", "import struct;print(struct.calcsize('P')*8)"],
                               capture_output=True)
            try:
                if int((r.stdout or b"").decode().strip()) == 64:
                    return p
            except ValueError:
                continue
    return None


def main(argv):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    missing = [p for p in (FMU_THERMO, FMU_COMB) if not os.path.exists(p)]
    if missing:
        print(json.dumps({"status": "skip", "reason": "编译产物缺位：" + ", ".join(missing)}))
        return 3
    lacking = platform_binary_missing((FMU_THERMO, FMU_COMB))
    if lacking:
        print(json.dumps({"status": "skip", "reason": lacking}, ensure_ascii=False))
        return 3
    py64 = _find_py64()
    if not py64:
        print(json.dumps({"status": "skip",
                          "reason": "64 位解释器缺位（FAULTLAB_PY64 覆盖）"}))
        return 3

    results = []
    worst_global = 0.0
    for fmu_path, suffix, golden_path in [
        (FMU_THERMO, "thermo", os.path.join(ROOT, "data", "golden", "gt001_fmu_v1.json")),
        (FMU_COMB, "thermo_comb", os.path.join(ROOT, "data", "golden", "gt001_fmu_comb_v1.json")),
    ]:
        try:
            res = subprocess.run([py64, "-I", RUNNER, "--run-gt001", fmu_path],
                                 capture_output=True)
            if res.returncode != 0:
                print(json.dumps({"status": "fail",
                                  "reason": "runner rc=%d" % res.returncode}))
                return 1
            c_data = json.loads(res.stdout.decode("utf-8"))
        except Exception as e:
            print(json.dumps({"status": "fail", "reason": str(e)}))
            return 1
        with open(golden_path, "r", encoding="utf-8") as f:
            golden = json.load(f)
        for run_key, g_run in golden["runs"].items():
            c_key = run_key + "_" + suffix
            c_run = c_data["runs"].get(c_key)
            if c_run is None or not isinstance(c_run.get("series"), dict):
                continue
            worst = 0.0
            for sid, p_arr in g_run["series"].items():
                if sid == "t":
                    continue
                c_arr = c_run["series"].get(sid)
                if c_arr is None:
                    continue
                for a, b in zip(c_arr, p_arr):
                    if a is None or b is None:
                        continue
                    rel = abs(a - b) / max(1.0, abs(b))
                    if rel > worst:
                        worst = rel
            if worst > worst_global:
                worst_global = worst
            results.append({"variant": suffix, "run": run_key, "max_rel_scaled": worst})

    status = "pass" if worst_global <= PARITY_RTLIM else "fail"
    print(json.dumps({
        "status": status,
        "worst_rel_scaled": worst_global,
        "parity_rtolim": PARITY_RTLIM,
        "gate_freeze_record": {
            "measured": worst_global,
            "freeze_rule": "gate 值 = 实测散差 × 安全系数 >=10（Q6/Q10 定案）",
            "note": "GT pow() 跨 libm 散差（R-1 预登记）——healthy/monitor 0.0 + 故障局 ~2.5e-4",
        },
        "results": results,
        "py64": py64,
    }, ensure_ascii=False, indent=2))
    return 0 if status == "pass" else 1


import tempfile

if __name__ == "__main__":
    sys.exit(main(sys.argv))
