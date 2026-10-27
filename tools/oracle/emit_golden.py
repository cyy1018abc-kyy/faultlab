# -*- coding: utf-8 -*-
"""emit_golden.py — 生成 data/golden/<model>_v1.json（唯一写 golden 的入口，MODEL_VALIDATION_SPEC §6.1）

用法：
  python tools/oracle/emit_golden.py                    # fl001（默认）
  python tools/oracle/emit_golden.py fc001              # FC-001（P1-06 / G2b-lite）
  python tools/oracle/emit_golden.py <model> --check    # 重算并与现有 golden 全等比对
  python tools/oracle/emit_golden.py <model> --approve "<批准人>"   # 回填 approval 三字段

golden 只能由本脚本（调用独立 oracle）生成；产品 engine 对 golden 只读比对。
批准摘要 approved_golden_sha256 = 去除 generated_by/approval 后内容的 SHA-256。
"""

import hashlib
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fl001_oracle  # noqa: E402
import fc001_oracle  # noqa: E402

ORACLES = {"fl001": fl001_oracle, "fc001": fc001_oracle}

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GOLDEN_DIR = os.path.join(ROOT, "data", "golden")


def golden_path(model):
    return os.path.join(GOLDEN_DIR, model + "_v1.json")


def sha256_file(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def regenerate_with_provenance(oracle):
    golden = oracle.build_golden()
    golden["generated_by"]["generated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return golden


def approval_payload_digest(golden):
    """批准摘要 = 去除 generated_by/approval 后内容的 SHA-256（确定性；避免 generated_at 循环）。"""
    import copy
    payload = copy.deepcopy(golden)
    payload.pop("generated_by", None)
    payload.pop("approval", None)
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def apply_approval(golden, approved_by):
    golden["approval"] = {
        "approved_by": approved_by,
        "approved_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "approved_golden_sha256": approval_payload_digest(golden),
    }
    return golden


def write_golden(golden, path):
    os.makedirs(GOLDEN_DIR, exist_ok=True)
    text = json.dumps(golden, ensure_ascii=False, indent=2)
    data = text.encode("utf-8")
    with open(path, "wb") as f:
        f.write(data)
    digest = hashlib.sha256(data).hexdigest()
    with open(path + ".sha256", "w", encoding="utf-8", newline="\n") as f:
        f.write(digest + "  " + os.path.basename(path) + "\n")
    return digest


def deep_equal(a, b, path="$", diffs=None):
    if diffs is None:
        diffs = []
    if len(diffs) >= 20:
        return diffs
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                diffs.append(path + "." + k + ": missing side")
            else:
                deep_equal(a[k], b[k], path + "." + k, diffs)
            if len(diffs) >= 20:
                break
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            diffs.append(path + ": length %d vs %d" % (len(a), len(b)))
        else:
            for i, (x, y) in enumerate(zip(a, b)):
                deep_equal(x, y, path + "[%d]" % i, diffs)
                if len(diffs) >= 20:
                    break
    else:
        if a != b:
            diffs.append(path + ": %r vs %r" % (a, b))
    return diffs


def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    model = args[0] if args and args[0] in ORACLES else "fl001"
    oracle = ORACLES[model]
    out_path = golden_path(model)

    ok, checks = oracle.self_check()
    if not ok:
        print(json.dumps({"error": "oracle 自检失败（exit 2）", "model": model, "checks": checks},
                         ensure_ascii=False, indent=2))
        return 2

    if "--check" in argv:
        if not os.path.exists(out_path):
            print(json.dumps({"error": "golden 不存在：" + out_path}, ensure_ascii=False))
            return 1
        with open(out_path, "r", encoding="utf-8") as f:
            existing = json.load(f)
        fresh = regenerate_with_provenance(oracle)
        existing_cmp = dict(existing)
        fresh_cmp = dict(fresh)
        for k in ("generated_by", "approval"):
            existing_cmp.pop(k, None)
            fresh_cmp.pop(k, None)
        diffs = deep_equal(fresh_cmp, existing_cmp)
        if (existing.get("approval") or {}).get("approved_golden_sha256"):
            expect = approval_payload_digest(existing)
            if expect != existing["approval"]["approved_golden_sha256"]:
                diffs.append("approval.approved_golden_sha256 与内容摘要不符")
        if diffs:
            print(json.dumps({"error": "重算结果与 golden 不一致", "model": model, "diffs": diffs},
                             ensure_ascii=False, indent=2))
            return 1
        print(json.dumps({"ok": True, "model": model, "golden": out_path,
                          "golden_sha256": sha256_file(out_path),
                          "approved_by": (existing.get("approval") or {}).get("approved_by")},
                         ensure_ascii=False, indent=2))
        return 0

    golden = regenerate_with_provenance(oracle)
    if "--approve" in argv:
        i = argv.index("--approve")
        approved_by = argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith("--") else "user"
        golden = apply_approval(golden, approved_by)
    digest = write_golden(golden, out_path)
    print(json.dumps({
        "ok": True,
        "model": model,
        "written": out_path,
        "bytes": os.path.getsize(out_path),
        "sha256": digest,
        "oracle_source_sha256": golden["generated_by"]["oracle_source_sha256"],
        "approved_by": (golden.get("approval") or {}).get("approved_by"),
        "self_check": checks,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
