# -*- coding: utf-8 -*-
"""emit_golden.py — 生成 data/golden/fl001_v1.json（唯一写 golden 的入口，MODEL_VALIDATION_SPEC §6.1）

用法：
  python tools/oracle/emit_golden.py            # 生成/覆盖 golden + .sha256（自检失败 exit 2）
  python tools/oracle/emit_golden.py --check    # 重算并与现有 golden 全等比对（相同平台应逐值一致）

golden 只能由本脚本（调用独立 oracle fl001_oracle.py）生成；产品 engine 对 golden 只读比对。
"""

import hashlib
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fl001_oracle as oracle  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GOLDEN_DIR = os.path.join(ROOT, "data", "golden")
GOLDEN_PATH = os.path.join(GOLDEN_DIR, "fl001_v1.json")
SHA_PATH = GOLDEN_PATH + ".sha256"


def sha256_file(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def regenerate_with_provenance():
    golden = oracle.build_golden()
    golden["generated_by"]["generated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return golden


def write_golden(golden):
    os.makedirs(GOLDEN_DIR, exist_ok=True)
    text = json.dumps(golden, ensure_ascii=False, indent=2)
    data = text.encode("utf-8")
    with open(GOLDEN_PATH, "wb") as f:
        f.write(data)
    digest = hashlib.sha256(data).hexdigest()
    with open(SHA_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(digest + "  fl001_v1.json\n")
    return digest


def deep_equal(a, b, path="$", diffs=None):
    if diffs is None:
        diffs = []
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                diffs.append(path + "." + k + ": missing side")
            else:
                deep_equal(a[k], b[k], path + "." + k, diffs)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            diffs.append(path + ": length %d vs %d" % (len(a), len(b)))
        else:
            for i, (x, y) in enumerate(zip(a, b)):
                deep_equal(x, y, path + "[%d]" % i, diffs)
    else:
        if a != b:
            diffs.append(path + ": %r vs %r" % (a, b))
        if len(diffs) >= 20:
            return
    return diffs


def main(argv):
    ok, checks = oracle.self_check()
    if not ok:
        print(json.dumps({"error": "oracle 自检失败（exit 2）", "checks": checks},
                         ensure_ascii=False, indent=2))
        return 2

    if len(argv) >= 2 and argv[1] == "--check":
        if not os.path.exists(GOLDEN_PATH):
            print(json.dumps({"error": "golden 不存在：" + GOLDEN_PATH}, ensure_ascii=False))
            return 1
        with open(GOLDEN_PATH, "r", encoding="utf-8") as f:
            existing = json.load(f)
        fresh = regenerate_with_provenance()
        # generated_at 每次变化，比对时排除
        existing_cmp = dict(existing)
        fresh_cmp = dict(fresh)
        existing_cmp.pop("generated_by", None)
        fresh_cmp.pop("generated_by", None)
        diffs = deep_equal(fresh_cmp, existing_cmp)
        if diffs:
            print(json.dumps({"error": "重算结果与 golden 不一致", "diffs": diffs},
                             ensure_ascii=False, indent=2))
            return 1
        print(json.dumps({"ok": True, "golden": GOLDEN_PATH,
                          "golden_sha256": sha256_file(GOLDEN_PATH)}, ensure_ascii=False, indent=2))
        return 0

    golden = regenerate_with_provenance()
    digest = write_golden(golden)
    print(json.dumps({
        "ok": True,
        "written": GOLDEN_PATH,
        "bytes": os.path.getsize(GOLDEN_PATH),
        "sha256": digest,
        "oracle_source_sha256": golden["generated_by"]["oracle_source_sha256"],
        "self_check": checks,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
