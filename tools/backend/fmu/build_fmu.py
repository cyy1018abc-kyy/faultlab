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

平台矩阵（D-12 linux64 / CHG-20261127-01——V1170_WAVE_DESIGN DEC-2）：
  - `--platform win64`（缺省）：编译命令与 v1.16.0 逐字相同（CC_FLAGS，无额外参数）；
  - `--platform linux64`：additive 平台分支——CC_FLAGS + `-fPIC`、链接 `-lm`，产出
    binaries/linux64/<modelIdentifier>.so；
  - 打包 = 包含仓库内已在位的全部平台二进制（PLATFORM_ORDER 固定序：win64 → linux64）——
    在一个平台上重新打包不丢另一平台条目；win64 条目逐字节保留；
  - zip 成员 create_system 固定为 0（MS-DOS/FAT——v1.16.0 Windows 打包时的实际值），
    使 Linux 与 Windows 打包产物字节一致（Python zipfile 缺省按宿主系统取 0/3）；
  - 编译器身份入 model_manifest.json `build_toolchains`（additive 键；按包内平台列出）；
    编译前 `gcc -dumpfullversion` 须与 PLATFORM_TOOLCHAINS 登记值一致，否则拒绝编译
    （工具链变更 ⇒ 产物字节变更 ⇒ V312 重钉须 CHG）。

用法：
  python -I tools/backend/fmu/build_fmu.py --gcc <gcc 路径> [--platform win64|linux64]
                                           [--gt | --tl] [--compile-only] [--package-only]
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

C_SOURCE = os.path.join(HERE, "fc001_l1.c")
XML_SOURCE = os.path.join(HERE, "modelDescription.xml")
FMU_OUT = os.path.join(ROOT, "data", "fmu", "fc001_l1_v1.fmu")

#: 平台矩阵（D-12 / CHG-20261127-01）：固定打包序 + 平台分支参数 + 工具链登记值。
#: win64 分支参数为空 ⇒ 编译命令与 v1.16.0 逐字相同；linux64 = +-fPIC / -lm（共享库必需）。
PLATFORM_ORDER = ("win64", "linux64")
PLATFORMS = {
    "win64": {"ext": ".dll", "extra_cflags": [], "ldlibs": []},
    "linux64": {"ext": ".so", "extra_cflags": ["-fPIC"], "ldlibs": ["-lm"]},
}

#: 编译器身份（写入 model_manifest.json build_toolchains——additive 键）。
#: version = `gcc -dumpfullversion` 期望值（编译前机检）；变更须 CHG 并重钉 V312 §10/§11。
PLATFORM_TOOLCHAINS = {
    "win64": {
        "compiler": "gcc",
        "version": "16.2.0",
        "distribution": "WinLibs GCC 16.2.0 UCRT/SEH r3 (x86_64-w64-mingw32)",
        "runtime": "UCRT",
    },
    "linux64": {
        "compiler": "gcc",
        "version": "13.3.0",
        "distribution": "gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0 (x86_64-linux-gnu)",
        "runtime": "glibc 2.39",
    },
}

#: zip 成员 create_system 固定值（0 = MS-DOS/FAT；v1.16.0 三包 Windows 打包实际值）
ZIP_CREATE_SYSTEM = 0

#: GT-001 L1-FMU 双包（GTFMU-G2b-04 / CHG-20261119-01——Q2(a) thermo+comb 各自另批）
GT_TARGETS = {
    "gt001_l1": {
        "c": os.path.join(HERE, "gt001_l1.c"),
        "xml": os.path.join(HERE, "gt001_l1_modelDescription.xml"),
        "fmu": os.path.join(ROOT, "data", "fmu", "gt001_l1_v1.fmu"),
    },
    "gt001_comb_l1": {
        "c": os.path.join(HERE, "gt001_comb_l1.c"),
        "xml": os.path.join(HERE, "gt001_comb_l1_modelDescription.xml"),
        "fmu": os.path.join(ROOT, "data", "fmu", "gt001_comb_l1_v1.fmu"),
    },
}

GT_MANIFEST = {
    "model_id": "gt.sync.fmu_l1",
    "model_version": "1.0.0",
    "equations": [
        "EQ-GTL1-1 pi_c = pi_c0*(f/f0)^2; p2 = pi_c*p1",
        "EQ-GTL1-2 T2 = T1*(1 + (pi_c^a_c - 1)/eps_c)",
        "EQ-GTL1-3 Q_f = k_f*u_eff; mdot_f = Q_f/LHV; mdot_g = mdot_a + mdot_f",
        "EQ-GTL1-4 C_3*dT3/dt = eta_b*Q_f - mdot_g*cp_g*(T3 - T2)",
        "EQ-GTL1-5 p3 = (1-beta_b)*p2; pi_t = p3/p1; T4 = T3*(1 - eps_t*(1 - pi_t^(-a_t)))",
        "EQ-GTL1-6 P_comp/P_turb/P_gen = eta_m*(P_turb - P_comp)",
        "EQ-GTL1-7 df/dt = (P_rotor/K_J)*(f0/f)",
        "EQ-GTL2-3/4 comb variant: tau_comb*dQ_f,d/dt + Q_f,d = Q_f; C_3*dT3/dt = eta_b*Q_f,d - mdot_g*cp_g*(T3-T2)",
    ],
    "parameters": {
        "T1_K": 288.15, "p1_kPa": 101.325, "cp_a": 1.005, "gamma_a": 1.4,
        "cp_g": 1.148, "pi_c0": 8.0, "eps_c": 0.82, "eps_t": 0.86,
        "beta_b": 0.04, "LHV_kJ_kg": 50000.0, "eta_b": 0.99, "eta_m": 0.95,
        "T3D_K": 1173.0, "tau_3_s": 2.0, "K_J": 5.0, "f0_Hz": 50.0,
        "K_bat": 24.0, "P_bat_ref_kW": 5.0,
        "k_f_kW_eq": 4.070531454334211, "mdot_a_kg_s": 0.144299140389011,
        "C_3_kJ_K": 0.335983796442745, "tau_comb_s": 0.5,
    },
    "assumptions": [
        "GT thermodynamic lumped chain (swing + combustor lumped heat + quasi-steady efficiency)",
        "comb variant: first-order fuel-energy lag (delay state x_comb, not in series)",
        "|df| <= 1 Hz validity domain (inherited assumption declaration)",
    ],
    "limitations": [
        "behavioral+numerical lumped demo model (no experimental/hardware verification) - numerical+implementation self-consistency only",
        "protection systems not modeled (over-temp/over-speed)",
        "flow-speed coupling waived (mdot_a constant)",
    ],
    "method_id": "gt001_fmu_l1_rk4_dt0.01",
    "integration": {
        "kind": "co-simulation",
        "step_s": 0.01,
        "solver": "classic RK4",
        "provenance": "fmu_l1_lumped_unvalidated",
        "self_declared": True,
    },
}


#: TL-001 联合轨 FMU（GTLJ-G2b-04 C99/FMU 链——V1180_WAVE_DESIGN R2-1/R2-4，CHG-20261127-05）
TL_TARGETS = {
    "gt_tl_joint_l1": {
        "c": os.path.join(HERE, "gt_tl_joint_l1.c"),
        "xml": os.path.join(HERE, "gt_tl_joint_l1_modelDescription.xml"),
        "fmu": os.path.join(ROOT, "data", "fmu", "gt_tl_joint_l1_v1.fmu"),
    },
}

#: manifest model_id = 其 parity golden（gt_tl_joint_v1）的 model_id（FMU 先例：manifest id ≡ golden id）
TL_MANIFEST = {
    "model_id": "gt.sync.tl.l0",
    "model_version": "1.0.0",
    "equations": [
        "EQ-GTL1-1..6/8 GT thermo chain (GTL1 2.2 verbatim, values unchanged)",
        "EQ-GTL1-7 joint revision: df/dt = (P_rotor/K_J)*(f0/f); P_rotor = P_gen + P_bat - P_load - P_elec(delta)",
        "EQ-GTL1-4 C_3*dT3/dt = eta_b*Q_f - mdot_g*cp_g*(T3 - T2)",
        "TL-EQ-1 d(delta)/dt = 2*pi*(f - f0)",
        "TL-EQ-3 P_elec = s*(V_gen*V_inf/X_line)*sin(delta)/1000 (line_open => P_elec = 0)",
        "TL-EQ-5 V_gen = (f/f0)*V_rated",
    ],
    "parameters": {
        "T1_K": 288.15, "p1_kPa": 101.325, "cp_a": 1.005, "gamma_a": 1.4,
        "cp_g": 1.148, "pi_c0": 8.0, "eps_c": 0.82, "eps_t": 0.86,
        "beta_b": 0.04, "LHV_kJ_kg": 50000.0, "eta_b": 0.99, "eta_m": 0.95,
        "T3D_K": 1173.0, "K_J": 5.0, "f0_Hz": 50.0,
        "K_bat": 24.0, "P_bat_ref_kW": 5.0,
        "k_f_kW_eq": 4.070531454334211, "mdot_a_kg_s": 0.144299140389011,
        "C_3_kJ_K": 0.335983796442745,
        "V_rated_V": 400.0, "V_inf_V": 400.0, "X_line_ohm": 3.2,
    },
    "assumptions": [
        "single-rotor joint form: GT rotor + SMIB line to an infinite bus, state y = [f, T3, delta]",
        "governor integrator, sensor bias, measured columns, energy accounting and fault windows live in the host",
        "line fault = bolted three-phase short (p_elec_scale = 0) on [t_start, t_clear)",
    ],
    "limitations": [
        "behavioral+numerical lumped demo model (no experimental/hardware verification) - numerical+implementation self-consistency only",
        "no damping term (D not enabled); zero-eigenvalue equilibrium manifold (spec 3.3)",
        "line protection, network equations and multi-machine dynamics not modeled",
    ],
    "method_id": "gt_tl_joint_rk4_dt0.01",
    "integration": {
        "kind": "co-simulation",
        "step_s": 0.01,
        "solver": "classic RK4",
        "provenance": "fmu_l1_lumped_unvalidated",
        "self_declared": True,
    },
}


def binary_rel(identifier, platform):
    """包内/仓库内平台二进制相对路径：binaries/<platform>/<modelIdentifier><ext>。"""
    return os.path.join("binaries", platform, identifier + PLATFORMS[platform]["ext"])


def compile_cmd(gcc_path, out_path, src_path, platform):
    """编译命令（win64 = v1.16.0 逐字：[gcc] + CC_FLAGS + [out, src]）。"""
    p = PLATFORMS[platform]
    flags = list(CC_FLAGS)
    if p["extra_cflags"]:
        # 平台附加参数插在 -shared 之后、-o 之前（CC_FLAGS 以 "-o" 结尾）
        flags = flags[:-1] + p["extra_cflags"] + flags[-1:]
    return [gcc_path] + flags + [out_path, src_path] + p["ldlibs"]


def check_toolchain(gcc_path, platform):
    """编译前工具链身份机检：gcc -dumpfullversion 须等于登记值（不符即拒——重钉须 CHG）。"""
    res = subprocess.run([gcc_path, "-dumpfullversion"], capture_output=True)
    got = (res.stdout or b"").decode("utf-8", errors="replace").strip()
    want = PLATFORM_TOOLCHAINS[platform]["version"]
    if res.returncode != 0 or got != want:
        raise RuntimeError(
            "toolchain mismatch for %s: gcc -dumpfullversion = %r, registered %r "
            "(PLATFORM_TOOLCHAINS change requires a CHG + V312 re-pin)" % (platform, got, want))
    return got


def _compile_one(gcc_path, c_source, identifier, platform, prefix):
    """编译在 ASCII 临时目录进行（gcc→ld 链对非 ASCII 路径的 ANSI 码页退化敏感——
    CHG-20261118-01 工具链纪律），产物 shutil 复制回仓库（Python 全 Unicode 安全）。"""
    import tempfile
    bin_out = os.path.join(HERE, binary_rel(identifier, platform))
    os.makedirs(os.path.dirname(bin_out), exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=prefix) as td:
        out_bin = os.path.join(td, identifier + PLATFORMS[platform]["ext"])
        # 源文件亦复制到 ASCII 路径（include/诊断路径同理）
        src_tmp = os.path.join(td, identifier + ".c")
        with open(c_source, "rb") as f:
            src_bytes = f.read()
        with open(src_tmp, "wb") as f:
            f.write(src_bytes)
        cmd = compile_cmd(gcc_path, out_bin, src_tmp, platform)
        res = subprocess.run(cmd, capture_output=True, cwd=td)
        out = (res.stdout or b"").decode("utf-8", errors="replace")
        err = (res.stderr or b"").decode("utf-8", errors="replace")
        if res.returncode != 0:
            raise RuntimeError("compile failed rc=%d\n%s\n%s" % (res.returncode, out, err))
        shutil.copyfile(out_bin, bin_out)
    return {"binary": bin_out, "command": cmd, "warnings": (err or out).strip()}


def present_platforms(identifier):
    """仓库内已在位的平台二进制（PLATFORM_ORDER 固定序）。"""
    return [p for p in PLATFORM_ORDER
            if os.path.exists(os.path.join(HERE, binary_rel(identifier, p)))]


def manifest_with_toolchains(base, platforms):
    """manifest 副本 + build_toolchains（additive 键——按包内平台列出编译器身份与命令参数）。"""
    m = dict(base)
    m["integration"] = dict(base["integration"])
    m["build_toolchains"] = {
        p: dict(PLATFORM_TOOLCHAINS[p],
                flags=[f for f in compile_cmd("gcc", "OUT", "SRC", p)[1:]
                        if f not in ("-o", "OUT", "SRC")])
        for p in platforms
    }
    return m


def write_fmu(fmu_path, xml_path, identifier, manifest_base):
    """FMI zip 打包（固定时间戳 1980-01-01 + 固定 create_system ⇒ 跨宿主字节确定性）。
    成员序：modelDescription.xml → binaries/<platform>/*（PLATFORM_ORDER）→ model_manifest.json。"""
    platforms = present_platforms(identifier)
    if not platforms:
        raise FileNotFoundError("no platform binary for %s under %s"
                                % (identifier, os.path.join(HERE, "binaries")))
    with open(xml_path, "rb") as f:
        members = [("modelDescription.xml", f.read())]
    for p in platforms:
        with open(os.path.join(HERE, binary_rel(identifier, p)), "rb") as f:
            members.append((binary_rel(identifier, p).replace("\\", "/"), f.read()))
    manifest = manifest_with_toolchains(manifest_base, platforms)
    members.append(("model_manifest.json",
                    json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")))
    os.makedirs(os.path.dirname(fmu_path), exist_ok=True)
    stamp = (1980, 1, 1, 0, 0, 0)
    with zipfile.ZipFile(fmu_path, "w", zipfile.ZIP_DEFLATED) as z:
        for member, data in members:
            info = zipfile.ZipInfo(member, date_time=stamp)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o600 << 16
            info.create_system = ZIP_CREATE_SYSTEM
            z.writestr(info, data)
    with open(fmu_path, "rb") as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    return fmu_path, digest, platforms


def compile_gt(name, gcc_path, platform="win64"):
    """GT kernel compile (ASCII temp dir - gcc-to-ld non-ASCII path workaround)."""
    return _compile_one(gcc_path, GT_TARGETS[name]["c"], name, platform, "gt001_fmu_build_")["binary"]


def package_gt(name):
    """GT FMU packaging (fixed timestamp deterministic; GT-context manifest)."""
    tgt = GT_TARGETS[name]
    fmu_path, digest, _ = write_fmu(tgt["fmu"], tgt["xml"], name, GT_MANIFEST)
    return fmu_path, digest

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


def compile_tl(name, gcc_path, platform="win64"):
    """TL-001 joint kernel compile (same ASCII temp-dir discipline)."""
    return _compile_one(gcc_path, TL_TARGETS[name]["c"], name, platform, "gt_tl_joint_build_")["binary"]


def package_tl(name):
    tgt = TL_TARGETS[name]
    fmu_path, digest, _ = write_fmu(tgt["fmu"], tgt["xml"], name, TL_MANIFEST)
    return fmu_path, digest


def compile_dll(gcc_path, platform="win64"):
    """FC-001 内核编译（平台分支见 compile_cmd；win64 命令与 v1.16.0 逐字相同）。"""
    return _compile_one(gcc_path, C_SOURCE, "fc001_l1", platform, "fc001_l1_build_")


def package_fmu():
    # 固定时间戳（1980-01-01）+ 固定 create_system ⇒ 字节确定性（两次打包同哈希——R-G9-03 前提）
    fmu_path, digest, _ = write_fmu(FMU_OUT, XML_SOURCE, "fc001_l1", MANIFEST)
    return fmu_path, digest


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--gcc", required=True, help="gcc 可执行文件路径（用户态工具链显式传参）")
    ap.add_argument("--compile-only", action="store_true")
    ap.add_argument("--package-only", action="store_true")
    ap.add_argument("--gt", action="store_true", help="build GT-001 L1-FMU dual packages (GTFMU-G2b-04)")
    ap.add_argument("--tl", action="store_true", help="build TL-001 joint FMU package (GTLJ-G2b-04, CHG-20261127-05)")
    ap.add_argument("--platform", choices=PLATFORM_ORDER, default="win64",
                    help="编译目标平台（缺省 win64；linux64 = D-12 additive 分支）——打包恒含全部在位平台")
    args = ap.parse_args(argv[1:])

    warnings = ""
    if not args.package_only:
        check_toolchain(args.gcc, args.platform)
    if args.tl:
        sys.path.insert(0, os.path.join(ROOT, "tools", "backend", "py"))
        import fmu_admission  # noqa: E402
        results = []
        for name in TL_TARGETS:
            if not args.package_only:
                compile_tl(name, args.gcc, args.platform)
                print("[compile] OK:", name, args.platform)
            if args.compile_only:
                continue
            fmu_path, digest = package_tl(name)
            r = fmu_admission.admit(fmu_path)
            if not r["admitted"]:
                print(json.dumps({"ok": False, "name": name, "admission": r},
                                 ensure_ascii=False, indent=2))
                return 1
            _, digest2 = package_tl(name)
            results.append({"name": name, "fmu": os.path.relpath(fmu_path, ROOT),
                            "bytes": os.path.getsize(fmu_path), "fmu_sha256": digest,
                            "deterministic": digest == digest2, "admitted": True,
                            "platforms": present_platforms(name)})
        print(json.dumps({"ok": True, "targets": results}, ensure_ascii=False, indent=2))
        return 0
    if args.gt:
        if not args.package_only:
            for name in GT_TARGETS:
                compile_gt(name, args.gcc, args.platform)
                print("[compile] OK:", name, args.platform)
        results = []
        sys.path.insert(0, os.path.join(ROOT, "tools", "backend", "py"))
        import fmu_admission  # noqa: E402
        for name in GT_TARGETS:
            fmu_path, digest = package_gt(name)
            r = fmu_admission.admit(fmu_path)
            if not r["admitted"]:
                print(json.dumps({"ok": False, "name": name, "admission": r},
                                 ensure_ascii=False, indent=2))
                return 1
            _, digest2 = package_gt(name)
            results.append({"name": name, "fmu": os.path.relpath(fmu_path, ROOT),
                            "bytes": os.path.getsize(fmu_path), "fmu_sha256": digest,
                            "deterministic": digest == digest2, "admitted": True,
                            "platforms": present_platforms(name)})
        print(json.dumps({"ok": True, "targets": results}, ensure_ascii=False, indent=2))
        return 0

    if not args.package_only:
        info = compile_dll(args.gcc, args.platform)
        warnings = info["warnings"]
        print("[compile] OK:", os.path.relpath(info["binary"], ROOT))
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
            "platforms": present_platforms("fc001_l1"),
            "manifest_model_id": MANIFEST["model_id"],
        }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
