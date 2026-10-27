#!/usr/bin/env python3
"""FaultLab single-file build.

Reads index.html, inlines every referenced local CSS/JS file (in order),
and writes a self-contained FaultLab.html that runs offline by double-click.

Usage:
    python tools/build.py                 # -> FaultLab.html
    python tools/build.py --out app.html
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LINK_RE = re.compile(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>')
SCRIPT_RE = re.compile(r'<script\s+src="([^"]+)"\s*>\s*</script>')


def read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def build(out_path: str) -> int:
    index_path = os.path.join(ROOT, "index.html")
    if not os.path.isfile(index_path):
        print("error: index.html not found", file=sys.stderr)
        return 1
    html = read_text(index_path)
    missing: list[str] = []
    css_count = 0
    js_count = 0

    def inline_css(match: re.Match) -> str:
        nonlocal css_count
        href = match.group(1)
        if href.startswith(("http://", "https://", "//")):
            return match.group(0)
        path = os.path.join(ROOT, href)
        if not os.path.isfile(path):
            missing.append(href)
            return f"/* missing: {href} */"
        content = read_text(path)
        content = content.replace("</style", "<\\/style")
        css_count += 1
        return f"<style>\n/* ===== {href} ===== */\n{content}\n</style>"

    def inline_js(match: re.Match) -> str:
        nonlocal js_count
        src = match.group(1)
        if src.startswith(("http://", "https://", "//")):
            return match.group(0)
        path = os.path.join(ROOT, src)
        if not os.path.isfile(path):
            missing.append(src)
            return f"/* missing: {src} */"
        content = read_text(path)
        content = content.replace("</script", "<\\/script")
        js_count += 1
        return f"<script>\n/* ===== {src} ===== */\n{content}\n</script>"

    html = LINK_RE.sub(inline_css, html)
    html = SCRIPT_RE.sub(inline_js, html)

    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    banner = (
        "<!--\n"
        "  FaultLab — Virtual Energy Lab V0.1 (single-file offline build)\n"
        f"  built: {stamp}\n"
        f"  css files inlined: {css_count}, js files inlined: {js_count}\n"
        "  Source of truth: index.html + src/ + css/. Rebuild with: python tools/build.py\n"
        "  Data note: analytic / behaviour-level (L0) demo model — not Simulink, not measured field data.\n"
        "-->\n"
    )
    html = html.replace("<!DOCTYPE html>", "<!DOCTYPE html>\n" + banner, 1)

    with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(html)

    size_kb = os.path.getsize(out_path) / 1024.0
    print(f"built {out_path}  ({size_kb:.1f} KiB)  css={css_count} js={js_count}")
    if missing:
        print("warning: missing referenced files:", file=sys.stderr)
        for m in missing:
            print("  - " + m, file=sys.stderr)
        return 2
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Build FaultLab single-file HTML")
    ap.add_argument("--out", default=os.path.join(ROOT, "FaultLab.html"))
    args = ap.parse_args()
    return build(args.out)


if __name__ == "__main__":
    raise SystemExit(main())
