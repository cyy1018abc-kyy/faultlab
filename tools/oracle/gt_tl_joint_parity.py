# -*- coding: utf-8 -*-
"""gt_tl_joint_parity.py — TL-001 联合轨 C99 内核 ↔ golden parity 机检（GTLJ-G2b-04 C99/FMU 链；
规格 TL001_FMU_G2B_SPEC_APPROVED v1.0 §4 项 7 + Q6=(a)；V1180_WAVE_DESIGN R2-3，CHG-20261127-05）。

做法（gt001_fmu_parity.py 同构）：
  1. 子进程 `fmu_runner.py --run-gt-tl-joint --out <tmp>`（64 位解释器；C 内核 + host 壳 8 Run）；
  2. 对 data/golden/gt_tl_joint_v1.json（= 联合 oracle emit 产物，verify_golden gt_tl_joint 已核）
     8 Run × 29 列（除 t）逐点：规模相对误差 max(|c−g|)/max(1.0,|g|)；null 相位须一致；
  3. 判据：worst ≤ PARITY_RTLIM。

门值冻结（R2-3：≥ 实测 ×10 的最小 10 的整数次幂；实测 0.0 ⇒ 1e-9——fc001 先例）：
  2026-11-27 linux64（GCC 13.3.0 / glibc 2.39）实测 worst = **0.0**（139,432 值逐位相同，含 -0.0 符号）
  ⇒ PARITY_RTLIM = 1e-9。sin 大参数义务（R-A-09(2)）销项：golden |δ|max = 1.021 rad。
  win64 dll 构建后若跨 libm（pow/sin）散差 > 1e-9 ⇒ 停下显式 CHG 重冻结，不静默调门。

SKIP 语义（exit 3，run-g2 skipExitCode 消费）：.fmu 缺位 / 包内无当前平台二进制 / 64 位解释器缺位。
判据不过 exit 1；通过 exit 0。零第三方依赖；oracle 与 golden 文件零触碰（只读）。
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
FMU_PATH = os.path.join(ROOT, "data", "fmu", "gt_tl_joint_l1_v1.fmu")
GOLDEN_PATH = os.path.join(ROOT, "data", "golden", "gt_tl_joint_v1.json")
RUNNER = os.path.join(ROOT, "tools", "backend", "py", "fmu_runner.py")
PARITY_RTLIM = 1e-9
MEASURED_LINUX64 = 0.0

sys.path.insert(0, HERE)
from gt001_fmu_parity import _find_py64, platform_binary_missing  # noqa: E402  共用 SKIP 判定


def main(argv):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    if not os.path.exists(FMU_PATH):
        print(json.dumps({"status": "skip", "reason": "编译产物缺位：" + FMU_PATH}, ensure_ascii=False))
        return 3
    lacking = platform_binary_missing((FMU_PATH,))
    if lacking:
        print(json.dumps({"status": "skip", "reason": lacking}, ensure_ascii=False))
        return 3
    py64 = _find_py64()
    if not py64:
        print(json.dumps({"status": "skip", "reason": "64 位解释器缺位（FAULTLAB_PY64 覆盖）"},
                         ensure_ascii=False))
        return 3

    with tempfile.TemporaryDirectory(prefix="gt_tl_joint_parity_") as td:
        c_out = os.path.join(td, "c-run.json")
        res = subprocess.run([py64, "-I", RUNNER, "--run-gt-tl-joint", FMU_PATH, "--out", c_out],
                             capture_output=True)
        if res.returncode != 0:
            print(json.dumps({"status": "fail", "reason": "fmu_runner rc=%d：%s" % (
                res.returncode, (res.stderr or b"").decode("utf-8", errors="replace")[:400])},
                ensure_ascii=False))
            return 1
        with open(c_out, "r", encoding="utf-8") as f:
            c_data = json.load(f)
    with open(GOLDEN_PATH, "r", encoding="utf-8") as f:
        golden = json.load(f)

    worst = 0.0
    worst_at = None
    n_values = 0
    n_bitexact = 0
    per_run = {}
    for run_key, g_run in golden["runs"].items():
        c_run = c_data["runs"].get(run_key)
        if c_run is None:
            print(json.dumps({"status": "fail", "reason": "C 侧缺 Run：" + run_key}, ensure_ascii=False))
            return 1
        run_worst = 0.0
        for sid, g_arr in g_run["series"].items():
            if sid == "t":
                continue
            c_arr = c_run["series"].get(sid)
            if c_arr is None or len(c_arr) != len(g_arr):
                print(json.dumps({"status": "fail", "reason": "C 侧缺列或长度不符：%s/%s" % (run_key, sid)},
                                 ensure_ascii=False))
                return 1
            for i, (cv, gv) in enumerate(zip(c_arr, g_arr)):
                n_values += 1
                if cv is None or gv is None:
                    if (cv is None) != (gv is None):
                        print(json.dumps({"status": "fail",
                                          "reason": "null 相位不一致：%s/%s@%d" % (run_key, sid, i)},
                                         ensure_ascii=False))
                        return 1
                    n_bitexact += 1
                    continue
                if repr(cv) == repr(gv):
                    n_bitexact += 1
                rel = abs(cv - gv) / max(1.0, abs(gv))
                if rel > run_worst:
                    run_worst = rel
                if rel > worst:
                    worst = rel
                    worst_at = {"run": run_key, "signal": sid, "i": i, "c": cv, "golden": gv}
        per_run[run_key] = {"max_rel_scaled": run_worst}

    status = "pass" if worst <= PARITY_RTLIM else "fail"
    print(json.dumps({
        "status": status,
        "judgement": "max scale-relative error <= %g（数值与实现自洽，非位级承诺）" % PARITY_RTLIM,
        "worst_rel_scaled": worst,
        "worst_point": worst_at,
        "values_compared": n_values,
        "values_bitexact": n_bitexact,
        "per_run": per_run,
        "gate_freeze_record": {
            "measured_linux64": MEASURED_LINUX64,
            "parity_rtolim": PARITY_RTLIM,
            "freeze_rule": "门值 = ≥实测×10 的最小 10 的整数次幂；实测 0 ⇒ 1e-9（V1180 R2-3）",
            "measured_fmu_sha256": c_data.get("fmu_sha256"),
        },
        "py64": py64,
    }, ensure_ascii=False, indent=2))
    return 0 if status == "pass" else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
