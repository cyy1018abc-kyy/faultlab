# -*- coding: utf-8 -*-
"""oracle_base.py — D-2a oracle 统一基座：契约 + 共享助手（W1-1，DEC-A 分层落地）。

生效依据与规格：
  - NEXT/V060_WAVE_DESIGN.md（APPROVED / CHG-20261104-05）§2 波次 1 W1-1、§3 DEC-A；
  - 规格文本：FaultLab-evaluation/NEXT/ORACLE_INTERFACE_D2.md（归一契约 / golden schema v2
    / 分层落地登记 / GT-001「文档化符合」裁定）。

定位与独立性（MODEL_VALIDATION_SPEC §6.3 独立性声明类推）：
  1. 本模块是「机制层」：只提供源码哈希 / approval 三字段块 / golden+sidecar 写盘 /
     emit 脚手架 / 契约自检——不含任何模型公式、容差判据或冻结参数；
     不与任何 oracle、产品 engine 共享公式常量；不 import src/**；
  2. 纯 Python 3 标准库；无第三方依赖；不访问网络；
  3. DEC-A 分层（本波不动任何既有 oracle 文件）：
       - fl001_oracle / fc001_oracle = legacy 基线：物理 import 本基座与各自 golden 重出
         同轮（fc001 → W1-2 / fl001 → W2-1，DEC-B 保 id 重出）；
       - gt001_oracle = 「文档化符合」：物理迁移挂起到 GT golden 下次重出时点——
         V-03 字节语义下改写 gt001_oracle.py 即报废 gt001_v2 冻结锚点
         （data/golden/gt001_v2.json.sha256 = c50315c9…，A-1 / CHG-20261102-01 批准口径）。

V-03 语义（本基座第一契约，docstring 承诺）：
  `_oracle_source_sha256()` 的语义 = **该 oracle 源文件自身字节**的 SHA-256。
  golden `generated_by.oracle_source_sha256` 在 emit 时记录同一值；
  scripts/verify_golden.py V-03（docstring :14，实现 :165-168）以当前 oracle 源文件字节
  重算并严格相等比对——语义锚点是「文件自身字节」：不是对象序列化、不是 normalize
  后的文本、不是目录哈希。规范实现见本模块 oracle_source_sha256()；
  OracleInterface 默认实现（_oracle_source_sha256）走该函数。

用法：
  python -I tools/oracle/oracle_base.py    # 契约自检摘要（JSON），exit 0=通过 / 1=失败
"""

import copy
import hashlib
import importlib
import inspect
import json
import os
import sys
import tempfile
from datetime import datetime, timezone

ORACLE_BASE_VERSION = "1.0.0"
GOLDEN_SCHEMA_VERSION_V2 = "v2"
SIDECAR_SUFFIX = ".sha256"

#: approval 三字段块的字段面（fl001_oracle.py:438-442 / fc001_oracle.py:367 /
#: gt001_oracle.py:501-506 三处现行同构；scripts/verify_golden.py V-03b 消费 :170-181）
APPROVAL_FIELDS = ("approved_by", "approved_at", "approved_golden_sha256")

#: generated_by 信息块字段面（对齐 gt001_v2 风格，gt001_oracle.py:494-500；
#: fl001_oracle.py:432-437 / fc001_oracle.py:360-366 为同面 v1 两段式）
GENERATED_BY_FIELDS = ("tool", "python_version", "command",
                       "oracle_source_sha256", "generated_at")

#: 归一契约成员（ORACLE_INTERFACE_D2.md §2）
CONTRACT_MEMBERS = ("RUNS", "SERIES_IDS", "simulate_run", "self_check",
                    "_oracle_source_sha256", "build_golden")


# ---------------------------------------------------------------------------
# 机制助手（共享；无模型语义）
# ---------------------------------------------------------------------------
def utc_now_iso():
    """UTC ISO-8601（秒精度，'Z' 后缀）——emit_golden.py:41/57 同格式。"""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_file(path):
    """文件自身字节的 SHA-256（verify_golden.py:74-76 同式）。"""
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def _is_sha256_hex(value):
    return (isinstance(value, str) and len(value) == 64
            and all(c in "0123456789abcdef" for c in value))


def oracle_source_sha256(oracle_path):
    """V-03 语义：oracle 源文件**自身字节**的 SHA-256。

    语义锚点：scripts/verify_golden.py V-03（docstring :14，实现 :165-168）——
      golden.generated_by.oracle_source_sha256 == 当前 oracle 源文件字节的 SHA-256。
    本函数即「当前 oracle 源码 SHA-256」的规范实现；emit 侧与 verify 侧必须经同一语义
    （文件字节，非对象、非 normalize 后文本）。

    oracle 侧归一 idiom（两行实现 V-03 语义）::

        from oracle_base import oracle_source_sha256
        def _oracle_source_sha256():
            return oracle_source_sha256(os.path.abspath(__file__))

    现行三 oracle 同语义实例：fl001_oracle.py:446-453 / fc001_oracle.py:371-378
    （目录 + 固定文件名拼接）与 gt001_oracle.py:86-89（abspath(__file__) 直哈希）。
    """
    return sha256_file(oracle_path)


def approval_payload_digest(golden):
    """批准摘要（V-03b 语义）= 去除 generated_by/approval 后内容的确定性 SHA-256。

    算法（库内三处现行实现同构）：deepcopy → pop("generated_by")/pop("approval") →
    json.dumps(ensure_ascii=False, indent=2).encode("utf-8") → sha256。
      - emit_golden.py:45-52 approval_payload_digest；
      - gt001_oracle.py:484-489 _approval_digest；
      - scripts/verify_golden.py:170-181 V-03b 复算。
    剥离 generated_by ⇒ 摘要与 generated_at 无循环（emit_golden.py:46 注）。
    """
    payload = copy.deepcopy(golden)
    payload.pop("generated_by", None)
    payload.pop("approval", None)
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def approval_block(approved_by, approved_at, approved_golden_sha256):
    """approval 三字段块构造器（键与序 = APPROVAL_FIELDS；V-03b 可校验）。

    golden 的 approval 面在 v1 三 oracle 同构：fl001_oracle.py:438-442 /
    fc001_oracle.py:367 / gt001_oracle.py:501-506。
    三参数必填：approved_by / approved_at 为非空 str；approved_golden_sha256 为
    64 位小写十六进制（sha256 hexdigest）。占位三字段（全 None）是 v1 build_golden
    的发射前中间态，不经本构造器出境（ORACLE_INTERFACE_D2.md §3.3）。
    """
    if not isinstance(approved_by, str) or not approved_by:
        raise ValueError("approved_by 须为非空 str")
    if not isinstance(approved_at, str) or not approved_at:
        raise ValueError("approved_at 须为非空 str（UTC ISO-8601，见 utc_now_iso）")
    if not _is_sha256_hex(approved_golden_sha256):
        raise ValueError("approved_golden_sha256 须为 64 位小写十六进制 SHA-256")
    return {
        "approved_by": approved_by,
        "approved_at": approved_at,
        "approved_golden_sha256": approved_golden_sha256,
    }


def apply_approval(golden, approved_by, approved_at=None):
    """对 golden 组装 approval 三字段块并原样返回 golden（emit_golden.py:55-61 同构）。

    digest = approval_payload_digest(golden)（对尚无 approval 的 golden 现算，
    与 V-03b 复算式一致）；approved_at 缺省取 utc_now_iso()。
    注意：须在 golden 内容定稿（含 generated_by）之后调用——digest 剥离
    generated_by/approval，故 generated_at 后续变更不影响已签摘要（无循环）。
    """
    if approved_at is None:
        approved_at = utc_now_iso()
    golden["approval"] = approval_block(approved_by, approved_at,
                                        approval_payload_digest(golden))
    return golden


def generated_by_block(tool, oracle_path, command, generated_at=None,
                       python_version=None):
    """generated_by 信息块构造器（字段面 = GENERATED_BY_FIELDS，V-03 在构造侧强制）。

    oracle_source_sha256 由本函数对 oracle_path 文件字节现算（emit 时点 V-03 语义），
    调用方必须传 emitting oracle 自身源文件路径；generated_at 缺省 utc_now_iso()；
    python_version 缺省 platform.python_version()。
    对齐 gt001_v2 一段式先例（gt001_oracle.py:494-500）；fl001/fc001 的 build_golden
    内 generated_at=None 占位 + emit_golden.py:41 回填属 v1 两段式遗留
    （ORACLE_INTERFACE_D2.md §3.1 / §3.5）。
    """
    if generated_at is None:
        generated_at = utc_now_iso()
    if python_version is None:
        import platform
        python_version = platform.python_version()
    return {
        "tool": tool,
        "python_version": python_version,
        "command": command,
        "oracle_source_sha256": oracle_source_sha256(oracle_path),
        "generated_at": generated_at,
    }


def write_golden_with_sidecar(golden, path):
    """golden + sidecar（.sha256）写盘助手——字节规范在此钉死。

    字节规范：
      - golden 文件：json.dumps(ensure_ascii=False, indent=2).encode("utf-8") **二进制写**
        （无 newline 翻译 ⇒ LF 钉死）——与 emit_golden.py:64-69 现行 fl001/fc001 通道同构；
      - sidecar（<path>.sha256）：<digest> + "  " + basename + "\\n"（sha256sum 兼容
        两空格式，newline="\\n"）——与 emit_golden.py:70-73 / gt001_oracle.py:510-512 同构；
        digest 为 golden 文件实际字节的 SHA-256；scripts/verify_golden.py V-02
        （:156-163）按 sidecar 首空白 token 复核。

    事实登记（ORACLE_INTERFACE_D2.md §6）：现行 data/golden/gt001_v2.json 系
    gt001_oracle.py:508-509 文本模式写出，Windows 下为 CRLF（实测首字节 "{\\r\\n"）；
    其 sidecar 对实际字节自洽（c50315c9…），字节冻结不动。本函数供新 golden /
    重出 golden 使用，统一 LF；gt001 迁移时点起其写盘亦归一（清偿动作清单）。

    返回 golden 文件 digest。
    """
    directory = os.path.dirname(os.path.abspath(path))
    if directory:
        os.makedirs(directory, exist_ok=True)
    data = json.dumps(golden, ensure_ascii=False, indent=2).encode("utf-8")
    with open(path, "wb") as f:
        f.write(data)
    digest = hashlib.sha256(data).hexdigest()
    with open(path + SIDECAR_SUFFIX, "w", encoding="utf-8", newline="\n") as f:
        f.write(digest + "  " + os.path.basename(path) + "\n")
    return digest


def emit_golden(build_golden_fn, path, tool, command, oracle_path,
                approved_by=None):
    """emit 脚手架：build_golden → generated_by 回填 → approval（可选）→ 写盘 → 摘要。

    流程镜像库内两条现行 emit 通道的公共骨架，剥离模型语义：
      1. golden = build_golden_fn()——oracle 自带自检须在调用方先行执行
         （emit_golden.py:109-113 / gt001_oracle.py:527-530 语义：自检失败 exit 2，
         不写盘；本脚手架不自跑模型自检，因机制层无模型语义）；
      2. generated_by 占位回填：v1 两段式（build_golden 内 generated_at=None，
         fl001_oracle.py:431-437 / fc001_oracle.py:360-366）或一段式（无 generated_by）
         均归一为 generated_by_block 现算回填——oracle_source_sha256 一律对
         oracle_path 现算（V-03 单一事实源）；
      3. approved_by 给定时 → apply_approval（approval 重签，DEC-B 口径）；
         未批准则不写 approval 字段（v2 收紧：approval 缺失的 golden 由调用方自证
         其发射口径，见 ORACLE_INTERFACE_D2.md §3.3）；
      4. write_golden_with_sidecar 落盘。
    返回摘要 dict（written/bytes/golden_sha256/oracle_source_sha256/approved_by——
    emit_golden.py:148-157 输出面的机制子集）。
    """
    golden = build_golden_fn()
    gb = golden.get("generated_by")
    gb = gb if isinstance(gb, dict) else {}
    if gb.get("generated_at") is None or gb.get("oracle_source_sha256") is None:
        golden["generated_by"] = generated_by_block(
            tool=gb.get("tool") or tool,
            oracle_path=oracle_path,
            command=gb.get("command") or command,
            python_version=gb.get("python_version"))
    if approved_by is not None:
        apply_approval(golden, approved_by)
    digest = write_golden_with_sidecar(golden, path)
    return {
        "written": os.path.abspath(path),
        "bytes": os.path.getsize(path),
        "golden_sha256": digest,
        "oracle_source_sha256": golden["generated_by"]["oracle_source_sha256"],
        "approved_by": (golden.get("approval") or {}).get("approved_by"),
    }


def resolve_run_spec(runs, key_or_spec):
    """RUNS 解析：接受 run key（str，归一式）或 spec dict（verify_golden.py:196-201 现行式）。

    归一契约要求 simulate_run 第一参数兼容两种形态（ORACLE_INTERFACE_D2.md §2）；
    本助手即两种形态到 spec 的归一点。str 未命中 ⇒ KeyError；dict 缺 "key" ⇒
    ValueError；其余类型 ⇒ TypeError。
    """
    if isinstance(key_or_spec, str):
        for spec in runs:
            if isinstance(spec, dict) and spec.get("key") == key_or_spec:
                return spec
        raise KeyError("未知 run key: %r" % (key_or_spec,))
    if isinstance(key_or_spec, dict):
        if "key" not in key_or_spec:
            raise ValueError("spec dict 缺少 'key' 字段")
        return key_or_spec
    raise TypeError("run_key 须为 str 或 spec dict，得到 %s"
                    % (type(key_or_spec).__name__,))


def check_record(check_id, ok, observed, tolerance, note):
    """self_check 记录面构造器（三 oracle 现行 rec() 同构）：
    {"check_id", "status": "pass"|"fail", "observed", "tolerance", "note"}——
    fl001_oracle.py:295-298 / fc001_oracle.py:232-234 / gt001_oracle.py:331-334；
    scripts/verify_golden.py V-04（:183-189）按 check_id/status 串接消费。"""
    return {"check_id": check_id, "status": "pass" if ok else "fail",
            "observed": observed, "tolerance": tolerance, "note": note}


# ---------------------------------------------------------------------------
# 归一契约（OracleInterface）
# ---------------------------------------------------------------------------
class OracleInterface:
    """D-2 归一 oracle 契约（机制基类；不含模型语义——ORACLE_INTERFACE_D2.md §2）。

    契约成员（归一签名；模块式 oracle 以同名模块成员满足，类式 oracle 以子类满足）：

      RUNS: list[dict]
        Run spec 列表；每 spec 必含唯一 "key"(str) 与 "role"；其余字段模型自定。
        （fl001/fc001 现行 {key, role, feedback_mode, faulted}——fl001_oracle.py:131-135 /
        fc001_oracle.py:65-69；gt001 增 {family, magnitude, unit, inertia_model,
        t_clear_s?}——gt001_oracle.py:64-83，差异豁免见 ORACLE_INTERFACE_D2.md §5.2。）

      SERIES_IDS: list[str]
        序列列 id，须含 "t"。（gt001 无模块常量——simulate_run 内局部元组
        gt001_oracle.py:139-143；属文档化符合豁免项，迁移时点提升为常量。）

      simulate_run(run_key_or_spec, **overrides) -> dict
        归一签名：第一参数经 resolve_run_spec 归一（str = RUNS 的 "key"；
        dict = spec，即 scripts/verify_golden.py:196-201 现行调用式的兼容面）；
        overrides = 变体覆盖（库内先例：gt001_oracle.py:109 simulate_run(spec,
        inertia=None) 的 inertia 轨覆盖，GS-8 双轨自检用）。
        返回必含 "series"（含 "t" 列）/"scalars"/"metrics"；"events" 必含
        （verify_golden V-09 :266-287 消费）。

      self_check() -> (ok: bool, checks: list[dict])
        独立自检（check_record 记录面）；verify_golden V-04（:183-189）消费，
        任一 fail ⇒ 校验 exit 2。

      _oracle_source_sha256() -> str
        V-03 语义：本 oracle 源文件自身字节的 SHA-256（见模块 docstring 与
        oracle_source_sha256()）；本基类默认实现按 ORACLE_FILENAME + 定义目录解析。

      build_golden() -> dict
        golden schema v2（ORACLE_INTERFACE_D2.md §3）：元数据对齐 gt001_v2 风格
        （golden_id/model_id/model_version/method_id/method_version +
        generated_by{oracle_source_sha256, generated_at, …} + approval 三字段 +
        tolerances.gate.tier；backend 信息块规格留位暂不填充）。
    """

    #: golden schema 制度版本目标（与 golden_id 正交；现行四 golden 均为 schema "v1"）
    GOLDEN_SCHEMA_VERSION = GOLDEN_SCHEMA_VERSION_V2

    #: 本 oracle 源文件名（V-03 哈希对象；子类必填）
    ORACLE_FILENAME = None
    GOLDEN_ID = None
    MODEL_ID = None
    MODEL_VERSION = None
    METHOD_ID = None
    METHOD_VERSION = None

    @classmethod
    def _defining_file(cls):
        """类定义所在模块的源文件绝对路径（子类 oracle 的 __file__ 等价物）。"""
        module = sys.modules.get(cls.__module__)
        path = getattr(module, "__file__", None) if module is not None else None
        if not path:
            raise RuntimeError("无法解析 %r 的定义模块文件" % (cls.__name__,))
        return os.path.abspath(path)

    @classmethod
    def oracle_source_path(cls):
        """oracle 源文件绝对路径 = 定义目录 / ORACLE_FILENAME
        （fl001_oracle.py:446-448 / fc001_oracle.py:371-373 同构）。"""
        if not cls.ORACLE_FILENAME:
            raise NotImplementedError("子类必须声明 ORACLE_FILENAME（V-03 哈希对象）")
        return os.path.join(os.path.dirname(cls._defining_file()),
                            cls.ORACLE_FILENAME)

    @classmethod
    def _oracle_source_sha256(cls):
        """V-03 语义默认实现：ORACLE_FILENAME 自身字节的 SHA-256。"""
        return oracle_source_sha256(cls.oracle_source_path())


# ---------------------------------------------------------------------------
# 契约符合性探针（DEC-A 分层画像）
# ---------------------------------------------------------------------------
#: 三 oracle 的分层画像登记（ORACLE_INTERFACE_D2.md §5）。
#: enforce 决定强校验面：legacy（fl/fc，本波在途）只强校验「成员在场 + V-03 语义」，
#: 其余字段面仅记录（数值与字段门禁归 verify_golden 与各自波次 W1-2/W2-1）；
#: documented（gt001，DEC-A 冻结）全量强校验；physical（未来接入 base 的 oracle）
#: 全量强校验。expected 内未列出的成员按「必须存在」处理。
CONFORMANCE_REGISTRY = {
    "fl001_oracle": {
        "mode": "legacy",
        "golden_id": "fl001_v1",
        "migration": "物理 import oracle_base 与 fl001_v1 重出同轮（W2-1 FLEXT-G2b-01/02；DEC-B 保 id 重出）",
        "enforce": ("members", "v03"),
        "expected": {
            "members": {"RUNS": True, "SERIES_IDS": True, "simulate_run": True,
                        "self_check": True, "_oracle_source_sha256": True,
                        "build_golden": True},
            "simulate_run_params": ["spec"],
            "run_keys": ["healthy", "closed_loop_fault", "monitor_only"],
            "build_golden": {
                "golden_schema_version": "v1",
                "golden_id": "fl001_v1",
                "model_id": "FL-001",
                "model_version": "fl001.1",
                "method_id": "analytic_flux",
                "gate_tier": None,
                "generated_by": {"present": True, "hash_matches_v03": True,
                                 "generated_at": None},
                "approval": {"present": True, "all_none": True},
            },
        },
    },
    "fc001_oracle": {
        "mode": "legacy",
        "golden_id": "fc001_v1",
        "migration": "物理 import oracle_base 与 fc001_v1 重出同轮（W1-2 FC-G2b-02；DEC-B 保 id 重出）",
        "enforce": ("members", "v03"),
        "expected": {
            "members": {"RUNS": True, "SERIES_IDS": True, "simulate_run": True,
                        "self_check": True, "_oracle_source_sha256": True,
                        "build_golden": True},
            "simulate_run_params": ["spec"],
            "run_keys": ["healthy", "closed_loop_fault", "monitor_only"],
            "build_golden": {
                "golden_schema_version": "v1",
                "golden_id": "fc001_v1",
                "model_id": "FC-001",
                "model_version": "1.0.0",
                "method_id": "analytic_flux",
                "gate_tier": None,
                "generated_by": {"present": True, "hash_matches_v03": True,
                                 "generated_at": None},
                "approval": {"present": True, "all_none": True},
            },
        },
    },
    "gt001_oracle": {
        "mode": "documented",
        "golden_id": "gt001_v2",
        "migration": "文档化符合（DEC-A / CHG-20261104-05）；物理迁移挂起到 GT golden 下次重出时点",
        "enforce": ("members", "v03", "signature", "run_keys", "build_golden"),
        "expected": {
            "members": {"RUNS": True, "SERIES_IDS": False, "simulate_run": True,
                        "self_check": True, "_oracle_source_sha256": True,
                        "build_golden": True},
            "simulate_run_params": ["spec", "inertia"],
            "run_keys": ["healthy", "closed_loop_fault", "monitor_only",
                         "load_step", "actuator_fault", "actuator_clear"],
            "build_golden": {
                "golden_schema_version": "v1",
                "golden_id": "gt001_v2",
                "model_id": "GT-001",
                "model_version": "1.1.0",
                "method_id": "gt001_swing_dt0.01",
                "gate_tier": "T-A",
                "generated_by": {"present": False},
                "approval": {"present": False},
            },
        },
    },
}


def _positional_params(func):
    try:
        sig = inspect.signature(func)
    except (TypeError, ValueError):
        return None
    return [p.name for p in sig.parameters.values()
            if p.kind in (inspect.Parameter.POSITIONAL_ONLY,
                          inspect.Parameter.POSITIONAL_OR_KEYWORD)]


def contract_report(module, entry):
    """契约符合性探针：按 CONFORMANCE_REGISTRY 条目产出报告 dict。

    探针范围（无副作用）：成员在场、simulate_run 位置参数面、RUNS key 序列、
    build_golden 元数据画像、_oracle_source_sha256 的 V-03 语义
    （== 模块源文件自身字节 SHA-256）。不调用 simulate_run / self_check
    （数值面归 verify_golden V-04…V-09）；build_golden 为纯计算，可安全调用。
    entry["enforce"] 决定哪些面计入 mismatches；未 enforce 的面记入
    recorded_only_deltas（仅报告，不计失败）。
    """
    mode = entry["mode"]
    enforce = set(entry.get("enforce", ("members", "v03")))
    expected = entry.get("expected") or {}
    rep = {
        "module": module.__name__,
        "mode": mode,
        "available": True,
        "golden_id": entry.get("golden_id"),
        "migration": entry.get("migration"),
        "file": os.path.abspath(module.__file__),
        "enforced": sorted(enforce),
        "members": {},
        "mismatches": [],
        "recorded_only_deltas": [],
        "ok": False,
    }

    def add(section, message):
        (rep["mismatches"] if section in enforce
         else rep["recorded_only_deltas"]).append(message)

    # 1) 契约成员在场（expected 未列成员默认要求存在）
    want_members = expected.get("members") or {m: True for m in CONTRACT_MEMBERS}
    rep["members"] = {m: hasattr(module, m) for m in CONTRACT_MEMBERS}
    for member, want in want_members.items():
        got = rep["members"].get(member, False)
        if got != want:
            add("members", "member %s: 期望%s、实得%s"
                % (member, "有" if want else "无", "有" if got else "无"))

    # 2) simulate_run 位置参数面（overrides 归一：第二位置参数=变体覆盖）
    if hasattr(module, "simulate_run"):
        params = _positional_params(module.simulate_run)
        rep["simulate_run_params"] = params
        want_params = expected.get("simulate_run_params")
        if want_params is not None and params is not None \
                and list(params) != list(want_params):
            add("signature", "simulate_run 位置参数 %r ≠ 画像 %r"
                % (params, list(want_params)))

    # 3) V-03 语义探针（全 mode 强校验面）
    file_sha = sha256_file(rep["file"])
    recorded = None
    try:
        recorded = module._oracle_source_sha256()
    except Exception as exc:  # noqa: BLE001
        add("v03", "_oracle_source_sha256() 抛出 %s: %s" % (type(exc).__name__, exc))
    rep["v03_semantics"] = {"recorded": recorded, "file_sha256": file_sha,
                            "ok": recorded == file_sha}
    if recorded != file_sha and recorded is not None:
        add("v03", "V-03 语义不满足：_oracle_source_sha256() ≠ 源文件自身字节 SHA-256")

    # 4) RUNS key 序列
    if hasattr(module, "RUNS"):
        try:
            run_keys = [s.get("key") for s in module.RUNS]
        except Exception as exc:  # noqa: BLE001
            run_keys = None
            add("run_keys", "RUNS 遍历失败 %s: %s" % (type(exc).__name__, exc))
        rep["run_keys"] = run_keys
        want_keys = expected.get("run_keys")
        if want_keys is not None and run_keys is not None and run_keys != want_keys:
            add("run_keys", "RUNS keys %r ≠ 画像 %r" % (run_keys, want_keys))

    # 5) build_golden 元数据画像（纯计算，无写盘）
    if hasattr(module, "build_golden"):
        try:
            g = module.build_golden()
        except Exception as exc:  # noqa: BLE001
            rep["build_golden"] = None
            add("build_golden", "build_golden() 抛出 %s: %s" % (type(exc).__name__, exc))
        else:
            gb = g.get("generated_by") if isinstance(g.get("generated_by"), dict) else None
            ap = g.get("approval") if isinstance(g.get("approval"), dict) else None
            gate = (g.get("tolerances") or {}).get("gate") or {}
            rep["build_golden"] = {
                "golden_schema_version": g.get("golden_schema_version"),
                "golden_id": g.get("golden_id"),
                "model_id": g.get("model_id"),
                "model_version": g.get("model_version"),
                "method_id": g.get("method_id"),
                "gate_tier": gate.get("tier"),
                "generated_by": None if gb is None else {
                    "present": True,
                    "hash_matches_v03": gb.get("oracle_source_sha256") == recorded,
                    "generated_at": gb.get("generated_at"),
                },
                "approval": None if ap is None else {
                    "present": True,
                    "all_none": all(ap.get(k) is None for k in APPROVAL_FIELDS),
                },
            }
            wbg = expected.get("build_golden") or {}
            if wbg:
                for scalar in ("golden_schema_version", "golden_id", "model_id",
                               "model_version", "method_id", "gate_tier"):
                    if scalar in wbg and rep["build_golden"].get(scalar) != wbg[scalar]:
                        add("build_golden", "build_golden.%s: 期望 %r、实得 %r"
                            % (scalar, wbg[scalar], rep["build_golden"].get(scalar)))
                wgb = wbg.get("generated_by")
                if wgb is not None:
                    got = rep["build_golden"].get("generated_by")
                    if wgb.get("present") and got is None:
                        add("build_golden", "build_golden.generated_by 期望在场、实得缺省")
                    elif not wgb.get("present") and got is not None:
                        add("build_golden", "build_golden.generated_by 期望缺省（由 emit 填充）、实得在场")
                    elif got is not None:
                        for k in ("hash_matches_v03", "generated_at"):
                            if k in wgb and got.get(k) != wgb[k]:
                                add("build_golden",
                                    "build_golden.generated_by.%s: 期望 %r、实得 %r"
                                    % (k, wgb[k], got.get(k)))
                wap = wbg.get("approval")
                if wap is not None:
                    got = rep["build_golden"].get("approval")
                    if wap.get("present") and got is None:
                        add("build_golden", "build_golden.approval 期望在场、实得缺省")
                    elif not wap.get("present") and got is not None:
                        add("build_golden", "build_golden.approval 期望缺省（由 emit 填充）、实得在场")
                    elif got is not None and "all_none" in wap \
                            and got.get("all_none") != wap["all_none"]:
                        add("build_golden", "build_golden.approval.all_none: 期望 %r、实得 %r"
                            % (wap["all_none"], got.get("all_none")))

    rep["ok"] = not rep["mismatches"]
    return rep


def _probe_registered_oracles():
    """CONFORMANCE_REGISTRY 全量探针。返回 (modules 报告 dict, ok)。

    模块不可导入（并发波次在途改写 / 目录缺失）记为 unavailable（info），
    不计失败——三 oracle 的数值与字段门禁归 scripts/verify_golden.py 与各自波次。
    """
    here = os.path.dirname(os.path.abspath(__file__))
    if here not in sys.path:
        sys.path.insert(0, here)
    reports = {}
    ok = True
    for name, entry in CONFORMANCE_REGISTRY.items():
        try:
            module = importlib.import_module(name)
        except Exception as exc:  # noqa: BLE001
            reports[name] = {"mode": entry["mode"], "available": False,
                             "golden_id": entry.get("golden_id"),
                             "error": "%s: %s" % (type(exc).__name__, exc)}
            continue
        reports[name] = contract_report(module, entry)
        ok = ok and reports[name]["ok"]
    return reports, ok


# ---------------------------------------------------------------------------
# __main__ 契约自检（python -I tools/oracle/oracle_base.py）
# ---------------------------------------------------------------------------
def _self_test_mechanisms():
    """机制层自测 T-1…T-8（全部在系统临时目录进行，零仓库写入）。返回 (ok, checks)。"""
    checks = []

    def rec(cid, ok_, observed, tolerance, note):
        checks.append(check_record(cid, ok_, observed, tolerance, note))
        return ok_

    with tempfile.TemporaryDirectory(prefix="oracle_base_selftest_") as td:
        # T-1 V-03 语义：oracle_source_sha256 == 文件自身字节 SHA-256（已知向量）
        p = os.path.join(td, "probe_oracle.py")
        payload = "# probe oracle bytes\nRUNS = []\n".encode("utf-8")
        with open(p, "wb") as f:
            f.write(payload)
        expect1 = hashlib.sha256(payload).hexdigest()
        rec("T-1-v03-semantics", oracle_source_sha256(p) == expect1,
            expect1[:12], "与文件字节 SHA-256 相等",
            "V-03：_oracle_source_sha256 = oracle 源文件自身字节哈希")

        # T-2 approval 三字段块：键序 + 校验拒绝非法输入
        blk = approval_block("tester", "2026-11-04T00:00:00Z", "a" * 64)
        ok2 = (tuple(blk.keys()) == APPROVAL_FIELDS
               and blk["approved_golden_sha256"] == "a" * 64)
        rejected = False
        try:
            approval_block("tester", "2026-11-04T00:00:00Z", "ZZ")
        except ValueError:
            rejected = True
        rec("T-2-approval-block", ok2 and rejected,
            ",".join(blk.keys()), ",".join(APPROVAL_FIELDS),
            "三字段块键与序；非法 digest（非 64 位 hex）被拒绝")

        # T-3 批准摘要：V-03b 语义（剥离 generated_by/approval；generated_at 无循环）
        g1 = {"a": 1, "generated_by": {"generated_at": "X"},
              "approval": {"approved_by": "t"}}
        d1 = approval_payload_digest(g1)
        g2 = copy.deepcopy(g1)
        g2["generated_by"]["generated_at"] = "Y"
        expect3 = hashlib.sha256(
            json.dumps({"a": 1}, ensure_ascii=False, indent=2).encode("utf-8")).hexdigest()
        rec("T-3-approval-digest", d1 == expect3 and d1 == approval_payload_digest(g2),
            d1[:12], expect3[:12],
            "V-03b：剥离 generated_by/approval 后摘要；generated_at 变更不影响摘要")

        # T-4 apply_approval 组合（digest 与手工 V-03b 重算一致）
        gg = {"runs": {}}
        apply_approval(gg, "tester")
        rec("T-4-apply-approval",
            tuple(gg["approval"].keys()) == APPROVAL_FIELDS
            and gg["approval"]["approved_golden_sha256"]
            == approval_payload_digest({"runs": {}}),
            gg["approval"]["approved_golden_sha256"][:12], "与 V-03b 重算相等",
            "approval 组装 = approval_block + approval_payload_digest")

        # T-5 golden + sidecar 写盘：LF 钉死、sha256sum 两空格式、V-02 读回一致
        path5 = os.path.join(td, "probe_golden.json")
        digest5 = write_golden_with_sidecar(
            {"golden_schema_version": GOLDEN_SCHEMA_VERSION_V2, "n": [1, 2, 3]}, path5)
        raw = open(path5, "rb").read()
        side = open(path5 + SIDECAR_SUFFIX, "r", encoding="utf-8").read()
        side_token = side.split()[0]
        rec("T-5-write-sidecar",
            hashlib.sha256(raw).hexdigest() == digest5 and side_token == digest5
            and side == digest5 + "  probe_golden.json\n" and b"\r\n" not in raw,
            digest5[:12], side_token[:12],
            "golden+sidecar 写盘（二进制 LF、无 \\r\\n、sidecar 两空格式、V-02 读回）")

        # T-6 emit 脚手架端到端：占位回填 + V-03 现算 + approval + 摘要
        path6 = os.path.join(td, "probe_emit.json")

        def _build():
            return {"golden_schema_version": GOLDEN_SCHEMA_VERSION_V2,
                    "generated_by": {"tool": "probe", "command": "probe cmd",
                                     "python_version": "0.0",
                                     "oracle_source_sha256": None,
                                     "generated_at": None}}

        summary6 = emit_golden(_build, path6, tool="ignored", command="ignored",
                               oracle_path=p, approved_by="tester")
        with open(path6, "r", encoding="utf-8") as f:
            gb6 = json.load(f)["generated_by"]
        rec("T-6-emit-scaffold",
            summary6["approved_by"] == "tester"
            and gb6["generated_at"].endswith("Z")
            and gb6["oracle_source_sha256"] == expect1
            and gb6["tool"] == "probe" and gb6["python_version"] == "0.0"
            and summary6["golden_sha256"] == hashlib.sha256(
                open(path6, "rb").read()).hexdigest(),
            summary6["golden_sha256"][:12], expect1[:12],
            "emit 脚手架：generated_by 占位回填（保留 tool/python_version，"
            "oracle_source_sha256 对 oracle_path 现算）+ approval + sidecar")

        # T-7 resolve_run_spec 双形态（str 归一式 / spec dict 兼容式）
        runs7 = [{"key": "a", "role": "baseline"}]
        rec("T-7-resolve-run-spec",
            resolve_run_spec(runs7, "a") is runs7[0]
            and resolve_run_spec(runs7, runs7[0]) is runs7[0],
            "str+dict", "双形态归一到 spec",
            "归一签名第一参数兼容面（verify_golden.py:196-201 现行式）")

        # T-8 OracleInterface 默认 V-03 实现（stub 子类哈希 oracle_base.py 自身）
        class _Stub(OracleInterface):
            ORACLE_FILENAME = "oracle_base.py"

        base_file = os.path.abspath(__file__)
        rec("T-8-contract-default-hash",
            _Stub._oracle_source_sha256() == sha256_file(base_file),
            sha256_file(base_file)[:12], "与 oracle_base.py 自身字节 SHA-256 相等",
            "契约默认 _oracle_source_sha256 按 ORACLE_FILENAME + 定义目录解析")

    ok = all(c["status"] == "pass" for c in checks)
    return ok, checks


def main(argv=None):
    """契约自检入口：机制自测 + 注册画像探针 → JSON 摘要；exit 0=通过 / 1=失败。"""
    # GBK 控制台兼容（gt001_oracle.py:517-521 同式）：摘要含中文，统一 UTF-8 输出
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    mech_ok, mech_checks = _self_test_mechanisms()
    conf_modules, conf_ok = _probe_registered_oracles()
    ok = bool(mech_ok and conf_ok)
    summary = {
        "ok": ok,
        "oracle_base_version": ORACLE_BASE_VERSION,
        "oracle_base_sha256": sha256_file(os.path.abspath(__file__)),
        "golden_schema_version_target": GOLDEN_SCHEMA_VERSION_V2,
        "spec": "FaultLab-evaluation/NEXT/ORACLE_INTERFACE_D2.md",
        "wave": "V060 W1-1（D-2a）/ DEC-A 分层 / CHG-20261104-05",
        "mechanism_self_tests": {"ok": mech_ok, "checks": mech_checks},
        "conformance": {
            "ok": conf_ok,
            "strictness": {
                "physical": "全量强校验（成员+签名+run_keys+build_golden 画像+V-03）",
                "documented": "全量强校验（GT 冻结画像，DEC-A / CHG-20261104-05）",
                "legacy": "成员在场 + V-03 语义强校验；其余仅记录"
                          "（数值/字段门禁归 verify_golden 与各自波次 W1-2/W2-1）",
            },
            "modules": conf_modules,
        },
        "probe_notes": [
            "探针不调用 simulate_run/self_check（数值面归 verify_golden V-04…V-09）",
            "机制自测全部在系统临时目录进行，不写仓库文件",
            "注册模块不可导入记为 unavailable（info），不计失败",
        ],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
