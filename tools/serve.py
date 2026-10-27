#!/usr/bin/env python3
"""FaultLab dev server — zero-dependency static file server.

Usage:
    python tools/serve.py            # http://127.0.0.1:4318/
    python tools/serve.py --port 8080
"""
from __future__ import annotations

import argparse
import http.server
import os
import socketserver
import sys
from functools import partial

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".md": "text/markdown; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".woff2": "font/woff2",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> int:
    ap = argparse.ArgumentParser(description="FaultLab static dev server")
    ap.add_argument("--port", type=int, default=4318)
    ap.add_argument("--bind", default="127.0.0.1")
    args = ap.parse_args()
    handler = partial(Handler, directory=ROOT)
    with ReusableTCPServer((args.bind, args.port), handler) as httpd:
        print(f"FaultLab serving {ROOT}")
        print(f"  -> http://{args.bind}:{args.port}/")
        print("Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
