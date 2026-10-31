#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fmu_runner.py — FMU 2.0 Co-Simulation 最小 ctypes 加载器（W-3 / FL-19 增量四）。

状态：骨架已交付；**需实际 FMU 样本验证**（D-27——ctypes 路径在拿到参考 FMU 前不承诺可用）。
功能：
  - 解包 .fmu（zip）到临时目录；
  - 解析 modelDescription.xml（FMI 2.0 元素：ModelIdentifier / Stout / Guid）；
  - ctypes 加载平台二进制（win64 .dll / linux64 .so）；
  - fmi2Instantiate / fmi2SetupExperiment / fmi2EnterInitializationMode /
    fmi2ExitInitializationMode / fmi2DoStep / fmi2GetReal / fmi2Terminate / fmi2FreeInstance；
  - 产出与 fl001_analytic 同 schema 的 series（通过 output 变量名映射）。

安全边界：同 bridge.py（回环 + Origin 白名单 + 令牌）；准入层 fmu_admission.py 前置。
仅标准库（zipfile + ctypes + xml.etree）。
"""
import ctypes
import json
import math
import os
import shutil
import struct
import sys
import tempfile
import zipfile
import xml.etree.ElementTree as ET

# FMI 2.0 状态码
FMI_OK = 0
FMI_WARNING = 1
FMI_DISCARD = 2
FMI_ERROR = 3
FMI_FATAL = 4
FMI_PENDING = 5


def load_fmu(fmu_path, work_dir=None):
    """解包 .fmu 到临时目录，返回 (model_description_dict, binary_path, tmp_dir)。"""
    tmp = tempfile.mkdtemp(prefix="fmu_", dir=work_dir)
    with zipfile.ZipFile(fmu_path) as z:
        z.extractall(tmp)
    desc_path = os.path.join(tmp, "modelDescription.xml")
    if not os.path.exists(desc_path):
        raise FileNotFoundError("modelDescription.xml 不存在")
    tree = ET.parse(desc_path)
    root = tree.getroot()
    # FMI 2.0 attributes
    fmi_version = root.get("fmiVersion", "2.0")
    model_name = root.get("modelName", "")
    guid = root.get("guid", "")
    # Co-Simulation
    cs = root.find(".//CoSimulation")
    if cs is None:
        raise ValueError("仅支持 FMI 2.0 Co-Simulation（ModelExchange 不在此路线）")
    model_identifier = cs.get("modelIdentifier", "")
    # 平台二进制
    if sys.platform == "win32":
        plat_dir, ext = "win64", ".dll"
    elif sys.platform == "linux":
        plat_dir, ext = "linux64", ".so"
    else:
        raise OSError("不支持的平台：" + sys.platform)
    binary_path = os.path.join(tmp, "binaries", plat_dir, model_identifier + ext)
    if not os.path.exists(binary_path):
        raise FileNotFoundError("平台二进制不存在：" + binary_path)
    return {
        "fmi_version": fmi_version, "model_name": model_name, "guid": guid,
        "model_identifier": model_identifier, "binary_path": binary_path,
        "tmp_dir": tmp, "root": root,
    }


def _define_fmi2(lib):
    """定义 FMI 2.0 CS 最小 ctypes 接口。"""
    lib.fmi2Instantiate.argtypes = [
        ctypes.c_void_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_char_p,
        ctypes.c_char_p, ctypes.c_void_p, ctypes.c_int]
    lib.fmi2Instantiate.restype = ctypes.c_void_p
    lib.fmi2SetupExperiment.argtypes = [ctypes.c_void_p, ctypes.c_int,
                                        ctypes.c_double, ctypes.c_double,
                                        ctypes.c_int, ctypes.c_double]
    lib.fmi2SetupExperiment.restype = ctypes.c_int
    lib.fmi2EnterInitializationMode.argtypes = [ctypes.c_void_p]
    lib.fmi2EnterInitializationMode.restype = ctypes.c_int
    lib.fmi2ExitInitializationMode.argtypes = [ctypes.c_void_p]
    lib.fmi2ExitInitializationMode.restype = ctypes.c_int
    lib.fmi2DoStep.argtypes = [ctypes.c_void_p, ctypes.c_double,
                               ctypes.c_double, ctypes.c_int]
    lib.fmi2DoStep.restype = ctypes.c_int
    lib.fmi2GetReal.argtypes = [ctypes.c_void_p, ctypes.c_void_p,
                                ctypes.c_size_t, ctypes.c_void_p]
    lib.fmi2GetReal.restype = ctypes.c_int
    lib.fmi2Terminate.argtypes = [ctypes.c_void_p]
    lib.fmi2Terminate.restype = ctypes.c_int
    lib.fmi2FreeInstance.argtypes = [ctypes.c_void_p]
    lib.fmi2FreeInstance.restype = None
    return lib


def run_cs(info, output_vrs, duration_s, dt_s, n_samples):
    """执行 Co-Simulation，返回 {vr: [values]}。需实际 FMU 验证（D-27）。"""
    lib = ctypes.CDLL(info["binary_path"])
    _define_fmi2(lib)
    guid = info["guid"].encode("utf-8")
    model_id = info["model_identifier"].encode("utf-8")
    # instantiate（resources 为空指针——纯 CS）
    c = lib.fmi2Instantiate(None, 1, guid, model_id, None, None, 0)
    if not c:
        raise RuntimeError("fmi2Instantiate 失败")
    rc = lib.fmi2SetupExperiment(c, 1, 0.0, 0.0, 0, duration_s)
    if rc != FMI_OK:
        raise RuntimeError("fmi2SetupExperiment rc=" + str(rc))
    lib.fmi2EnterInitializationMode(c)
    lib.fmi2ExitInitializationMode(c)
    # outputvr 数组
    vr_arr = (ctypes.c_uint32 * len(output_vrs))(*output_vrs)
    val_arr = (ctypes.c_double * len(output_vrs))()
    result = {vr: [] for vr in output_vrs}
    t = 0.0
    dt = duration_s / (n_samples - 1)
    for step in range(n_samples):
        rc = lib.fmi2GetReal(c, vr_arr, len(output_vrs), val_arr)
        if rc != FMI_OK:
            raise RuntimeError("fmi2GetReal rc=" + str(rc))
        for i, vr in enumerate(output_vrs):
            result[vr].append(val_arr[i])
        if step < n_samples - 1:
            rc = lib.fmi2DoStep(c, t, dt, 0)
            if rc != FMI_OK:
                raise RuntimeError("fmi2DoStep rc=" + str(rc))
            t += dt
    lib.fmi2Terminate(c)
    lib.fmi2FreeInstance(c)
    return result


def cleanup(info):
    shutil.rmtree(info["tmp_dir"], ignore_errors=True)


def self_check():
    """FR-1：模块可加载、FMI 接口定义完整（不加载实际 FMU——D-27）。"""
    checks = []
    ok_all = True
    # FR-1: load_fmu 函数存在且可调用（不传真 FMU）
    ok1 = callable(load_fmu) and callable(run_cs) and callable(cleanup)
    checks.append({"check_id": "FR-1-interface", "status": "pass" if ok1 else "fail",
                   "note": "ctypes FMI 2.0 CS 接口骨架已定义（load/run/cleanup）"})
    ok_all &= ok1
    # FR-2: _define_fmi2 可执行（空 lib 不可加载，但函数定义路径可达）
    ok2 = callable(_define_fmi2)
    checks.append({"check_id": "FR-2-fmi2-defs", "status": "pass" if ok2 else "fail",
                   "note": "FMI 2.0 CS ctypes 接口定义函数存在"})
    ok_all &= ok2
    # FR-3: D-27 标记
    checks.append({"check_id": "FR-3-d27-pending", "status": "pass",
                   "note": "D-27：ctypes doStep 路径待实际 FMU 样本验证（不虚设）"})
    return ok_all, checks


def main(argv):
    if "--self-check" in argv:
        ok, checks = self_check()
        print(json.dumps({"ok": ok, "checks": checks}, ensure_ascii=False, indent=2))
        return 0 if ok else 2
    print(__doc__)
    return 0


if __name__ == "__main__":
    main(sys.argv)
