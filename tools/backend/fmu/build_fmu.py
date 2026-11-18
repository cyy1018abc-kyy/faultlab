# -*- coding: utf-8 -*-
"""build_fmu.py — FC-001 L1-FMU 构建与打包（FCFMU-G2b-04 / CHG-20261118-01）。

职责：
  1. 编译 fc001_l1.c → binaries/win64/fc001_l1.dll（Q10=(c) 单平台先行；编译命令钉死——
     -std=c99 -O2 -Wall -Wextra -ffp-contract=off -fno-fast-math——IEEE 序保持，R-G9-02
     parity 前提；gcc 路径显式传参（用户态工具链，不依赖系统 PATH）；
  2. 打包 data/fmu/fc001_l1_v1.fmu（FMI zip 布局：modelDescription.xml +
     binaries/win64/fc001_l1.dll + model_manifest.json——V312/Q-5 八字段齐备；
     固定时间戳（1980-01-01）⇒ 字节确定性——两次打包同哈希）；
  3. fmu_admission 准入自检（admitted=true 方出境）；
  4. 输出 sha256（V312 钉 hash 载体——CHG-20261118-01 ④）。

用法：
  python -I tools/backend/fmu/build_fmu.py --gcc <gcc.exe 路径> [--compile-only] [--package-only]
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

C_SOURCE = os.path.join(HERE, "fc001_l1.c")
XML_SOURCE = os.path.join(HERE, "modelDescription.xml")
DLL_REL = os.path.join("binaries", "win64", "fc001_l1.dll")
DLL_OUT = os.path.join(HERE, "binaries", "win64", "fc001_l1.dll")
FMU_OUT = os.path.join(ROOT, "data", "fmu", "fc001_l1_v1.fmu")

#: 编译命令钉死（V1110 DEC：-ffp-contract=off 禁 FMA 收缩 + -fno-fast-math 禁快算重结合）
CC_FLAGS = ["-std=c99", "-O2", "-Wall", "-Wextra", "-ffp-contract=off", "-fno-fast-math", "-shared", "-o"]

MANIFEST = {
    "model_id": "fc.pem.fmu_l1",
    "model_version": "1.0.0",
    "equations": [
        "EQ-FCFMU-1 dp_O2_ca/dt = G_O2_in*a_o2*u_o2 - k_O2_react*I_load - (p_O2_ca - p_O2_nom)/tau_ca",
        "EQ-FCFMU-2 dp_N2_ca/dt = k_N2_accum*(u_o2_nom - a_o2*u_o2) - (p_N2_ca - p_N2_nom)/tau_N2",
        "EQ-FCFMU-3 dp_H2_an/dt = G_H2_in*u_an - k_H2_react*I_load - (p_H2_an - p_H2_nom)/tau_an",
        "EQ-FCFMU-4 dV_water/dt = q_cond*I_load - q_drain_max*a_drain*u_drain",
        "EQ-FCFMU-5 dT_stack/dt = ((N_cell*E_LHV - V_stack_true)*I_load/1000 - h_cool*(T_stack - T_cool_in))/C_th",
        "EQ-FCFMU-6..13 代数真值输出（p_vap/p_ca/y_O2/theta_cap/V_stack 分段饱和/P_gross/P_net/eta_sys）",
    ],
    "parameters": {
        "N_cell": 80, "I_load_nom": 100.0, "G_O2_in": 20.0, "k_O2_react": 0.10,
        "tau_ca": 5.0, "k_N2_accum": 12.0, "tau_N2": 10.0, "G_H2_in": 40.0,
        "k_H2_react": 0.20, "tau_an": 2.5, "q_cond": 0.08, "q_drain_max": 16.0,
        "V_cap_max": 500.0, "E_LHV": 1.254, "P_H2_LHV_kW": 10.032, "P_aux_kW": 0.20,
        "T_cool_in": 323.15, "h_cool": 0.2416, "C_th": 2.416,
        "p_O2_nom": 120.0, "p_N2_nom": 50.0, "p_H2_nom": 180.0, "u_o2_nom": 0.5,
    },
    "assumptions": [
        "5 态集总参数（阴极 O2/N2 分压 + 阳极 H2 分压 + 分离器储水 + 电堆集总温度）",
        "拟稳态效率链（压气机/透平 isen 效率常数）",
        "微重力被动膜分离器：只用水体积与容量比（单相水蒸气再循环气）",
    ],
    "limitations": [
        "行为与数值集总参数演示模型（未经实验/硬件验证）——数值与实现自洽 only",
        "V_water > V_cap_max 行为未定义（域守卫为实现轮裁定面——APPROVED §3.2）",
        "流量-转速耦合未建模（mdot_a 常数）",
    ],
    "method_id": "fc001_fmu_l1_rk4_dt0.01",
    "integration": {
        "kind": "co-simulation",
        "step_s": 0.1,
        "internal_substep_s": 0.01,
        "solver": "classic RK4",
        "provenance": "fmu_l1_lumped_unvalidated",
        "self_declared": True,
    },
}


def compile_dll(gcc_path):
    """编译在 ASCII 临时目录进行（gcc→ld 链对非 ASCII 路径的 ANSI 码页退化敏感——
    CHG-20261118-01 工具链纪律），产物 shutil 复制回仓库（Python 全 Unicode 安全）。"""
    import shutil
    import tempfile
    os.makedirs(os.path.dirname(DLL_OUT), exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="fc001_l1_build_") as td:
        out_dll = os.path.join(td, "fc001_l1.dll")
        # 源文件亦复制到 ASCII 路径（include/诊断路径同理）
        src_tmp = os.path.join(td, "fc001_l1.c")
        with open(C_SOURCE, "rb") as f:
            src_bytes = f.read()
        with open(src_tmp, "wb") as f:
            f.write(src_bytes)
        cmd = [gcc_path] + CC_FLAGS + [out_dll, src_tmp]
        res = subprocess.run(cmd, capture_output=True, cwd=td)
        out = (res.stdout or b"").decode("utf-8", errors="replace")
        err = (res.stderr or b"").decode("utf-8", errors="replace")
        if res.returncode != 0:
            raise RuntimeError("编译失败 rc=%d\n%s\n%s" % (res.returncode, out, err))
        shutil.copyfile(out_dll, DLL_OUT)
    return {"command": cmd, "warnings": (err or out).strip()}


def package_fmu():
    os.makedirs(os.path.dirname(FMU_OUT), exist_ok=True)
    with open(DLL_OUT, "rb") as f:
        dll_bytes = f.read()
    with open(XML_SOURCE, "rb") as f:
        xml_bytes = f.read()
    manifest_bytes = json.dumps(MANIFEST, ensure_ascii=False, indent=2).encode("utf-8")
    # 固定时间戳（1980-01-01）⇒ 字节确定性（两次打包同哈希——R-G9-03 前提）
    stamp = (1980, 1, 1, 0, 0, 0)
    with zipfile.ZipFile(FMU_OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in (("modelDescription.xml", xml_bytes),
                           (DLL_REL.replace("\\", "/"), dll_bytes),
                           ("model_manifest.json", manifest_bytes)):
            info = zipfile.ZipInfo(name, date_time=stamp)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o600 << 16
            z.writestr(info, data)
    with open(FMU_OUT, "rb") as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    return FMU_OUT, digest


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--gcc", required=True, help="gcc 可执行文件路径（用户态工具链显式传参）")
    ap.add_argument("--compile-only", action="store_true")
    ap.add_argument("--package-only", action="store_true")
    args = ap.parse_args(argv[1:])

    warnings = ""
    if not args.package_only:
        info = compile_dll(args.gcc)
        warnings = info["warnings"]
        print("[compile] OK:", os.path.relpath(DLL_OUT, ROOT))
        if warnings:
            print("[compile] stderr/stdout:", warnings[:500])

    if not args.compile_only:
        # 准入自检（fmu_admission——admitted=true 方出境）
        sys.path.insert(0, os.path.join(ROOT, "tools", "backend", "py"))
        import fmu_admission  # noqa: E402
        fmu_path, digest = package_fmu()
        r = fmu_admission.admit(fmu_path)
        if not r["admitted"]:
            print(json.dumps({"ok": False, "admission": r}, ensure_ascii=False, indent=2))
            return 1
        # 字节确定性自检：第二次打包必须同哈希
        _, digest2 = package_fmu()
        print(json.dumps({
            "ok": True,
            "fmu": os.path.relpath(fmu_path, ROOT),
            "bytes": os.path.getsize(fmu_path),
            "fmu_sha256": digest,
            "deterministic": digest == digest2,
            "admitted": True,
            "manifest_model_id": MANIFEST["model_id"],
        }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
