# -*- coding: utf-8 -*-
"""fc001_fmu_parity.py — FC-001 L1-FMU C↔Python parity 机检（R-G9-02；FCFMU-G2b-04）。

职责（APPROVED v1.0 §4 项 7/项 11 + Q17(a) 定案——parity 为独立机检非 verify_golden 依赖）：
  1. 定位 64 位 Python（C 内核为 x86_64——32 位解释器无法加载；FAULTLAB_PY64 显式覆盖）；
  2. 子进程调用 fmu_runner.py --run-fc001（64 位解释器）产出 C 侧 5 Run 序列
     （确定性——R-G9-03 三次恒等已单独验证）；
  3. Python 侧 = fc001_fmu_oracle.simulate_run（**只读 import——oracle 文件自身被
     fc001_fmu_v1 golden V-03 字节锚定，禁止修改**——CHG-20261118-01 实现纪律）；
  4. 逐点散差：max|c−p| 与规模相对误差 max(|c−p|)/max(1.0,|p|) 逐列逐点；
  5. 判据：规模相对误差 ≤ 1e-9（R-G9-02 数值容差承诺——非位级承诺）；实测值登记
     供 ×≥10 冻结制（Q9）——gate 冻结值 = 实测散差 × 安全系数 ≥10。

环境缺位（无 64 位解释器 / .fmu 缺席 / 准入拒收）⇒ status=skip（结构化 JSON +
exit 3）——run-g2 parity 步 SKIP 语义消费（V312 §9⑥ 先例，CHG-20261118-01 DEC-3）。
判据不过 ⇒ status=fail exit 1；通过 exit 0。零第三方依赖；oracle 文件零触碰。
"""

import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
FMU_PATH = os.path.join(ROOT, "data", "fmu", "fc001_l1_v1.fmu")
RUNNER = os.path.join(ROOT, "tools", "backend", "py", "fmu_runner.py")
PARITY_RTLIM = 1e-9

sys.path.insert(0, HERE)
import fc001_fmu_oracle  # noqa: E402  只读 import（V-03 锚定面——本文件不修改其任何字节）


def find_py64():
    """64 位解释器定位：FAULTLAB_PY64 覆盖 → python3.14 → sys.executable 位宽自检。"""
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
                bits = int((r.stdout or b"").decode().strip())
            except ValueError:
                continue
            if bits == 64:
                return p
    return None


def main(argv):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    if not os.path.exists(FMU_PATH):
        print(json.dumps({"status": "skip", "reason": "编译产物缺位（.fmu 不存在）：" + FMU_PATH}))
        return 3
    py64 = find_py64()
    if not py64:
        print(json.dumps({"status": "skip",
                          "reason": "64 位解释器缺位（C 内核 x86_64——32 位解释器不可加载；"
                                    "FAULTLAB_PY64 可显式覆盖）"}))
        return 3

    # C 侧：子进程 runner（64 位解释器；确定性输出）
    with tempfile.TemporaryDirectory(prefix="fc001_parity_") as td:
        c_out = os.path.join(td, "c-run.json")
        res = subprocess.run([py64, "-I", RUNNER, "--run-fc001", "--out", c_out],
                             capture_output=True)
        if res.returncode != 0:
            print(json.dumps({"status": "fail",
                              "reason": "fmu_runner 执行失败 rc=%d：%s"
                                        % (res.returncode, (res.stderr or b"").decode("utf-8", errors="replace")[:400])}))
            return 1
        with open(c_out, "r", encoding="utf-8") as f:
            c_data = json.load(f)

    # 逐 Run 逐列逐点散差（Python 侧 = 冻结 oracle 只读复算）
    worst_rel = 0.0
    worst_abs = 0.0
    worst_at = None
    per_run = {}
    for spec in fc001_fmu_oracle.RUNS:
        key = spec["key"]
        c_run = c_data["runs"].get(key)
        if c_run is None:
            print(json.dumps({"status": "fail", "reason": "C 侧缺 Run：" + key}))
            return 1
        p_run = fc001_fmu_oracle.simulate_run(spec)
        run_rel = 0.0
        run_abs = 0.0
        for sid, p_arr in p_run["series"].items():
            c_arr = c_run["series"].get(sid)
            if c_arr is None:
                print(json.dumps({"status": "fail", "reason": "C 侧缺序列列：%s/%s" % (key, sid)}))
                return 1
            for i, pv in enumerate(p_arr):
                cv = c_arr[i]
                if pv is None or cv is None:
                    if (pv is None) != (cv is None):
                        print(json.dumps({"status": "fail",
                                          "reason": "null 相位不一致：%s/%s@%d" % (key, sid, i)}))
                        return 1
                    continue
                d = abs(cv - pv)
                rel = d / max(1.0, abs(pv))
                if d > run_abs:
                    run_abs = d
                if rel > run_rel:
                    run_rel = rel
                if rel > worst_rel:
                    worst_rel = rel
                    worst_at = {"run": key, "signal": sid, "i": i,
                                "c": cv, "p": pv, "abs_diff": d}
                if d > worst_abs:
                    worst_abs = d
        per_run[key] = {"max_abs_diff": run_abs, "max_rel_scaled": run_rel}

    result = {
        "status": "pass" if worst_rel <= PARITY_RTLIM else "fail",
        "judgement": "max scale-relative error <= 1e-9（R-G9-02 数值容差承诺，非位级）",
        "worst_rel_scaled": worst_rel,
        "worst_abs_diff": worst_abs,
        "worst_point": worst_at,
        "per_run": per_run,
        "gate_freeze_record": {
            "measured": worst_rel,
            "freeze_rule": "gate 值 = 实测散差 × 安全系数 >=10（Q9 定案）",
            "measured_fmu_sha256": c_data["fmu_sha256"],
        },
        "py64": py64,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
