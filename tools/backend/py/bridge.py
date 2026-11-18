#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""bridge.py — FL-19 后端对照 HTTP 桥（增量三；FL19_BACKEND_RFC_APPROVED §3.2 I-1/I-2）。

安全边界（RFC I-2 v1.1）：
  - 仅绑定 127.0.0.1（回环）；
  - Origin 白名单：仅 http://localhost:* / http://127.0.0.1:*（CORS 只回显这些源——
    收窄而非放开；外部网页的跨源请求不可读响应）；
  - Sec-Fetch-Site ∈ {none, same-origin}（防外部网页跨站触发）；
  - 令牌：启动时生成随机 token 并写入发现文件（--discovery，含 port/token/pid）；
    所有业务端点要求 X-Bridge-Token 头匹配（浏览器侧由「后端对照」面板粘贴一次）。
  - 不记录请求体（离线红线）。

端点：
  GET  /capabilities → 适配器清单
  POST /simulate     body {"backendId": "py-analytic-fl001|py-rk4-fl001", "config": {...}}
                     → produce 输出（与适配器 CLI 同 schema）
  GET  /capability   → FC-001 L1-FMU 能力面（FCFMU-G2b-04 / CHG-20261118-05——
                       model_id/fmu_sha256/ready；ready=false = 32 位解释器或产物缺位）
  POST /simulate-fc001-fmu → run_fc001_shell 委托（5 Run C 内核序列 + run_hash；
                       64 位解释器内进程导入——32 位环境 503 结构化不静默）
仅标准库。
"""
import argparse
import json
import secrets
import datetime
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fl001_analytic  # noqa: E402
import fl001_ode_rk4  # noqa: E402

BACKENDS = {
    "py-analytic-fl001": fl001_analytic,
    "py-rk4-fl001": fl001_ode_rk4,
}


def capabilities_payload():
    caps = []
    for mod in BACKENDS.values():
        caps.append({"backend": mod.BACKEND,
                     "capabilities": {"systems": mod.BACKEND["systems"],
                                      "grid_lock": "60s/0.1s/601点", "supports_noise": False}})
    return caps


def produce(backend_id, cfg):
    mod = BACKENDS.get(backend_id)
    if mod is None:
        raise ValueError("未知适配器 " + str(backend_id))
    cfg = dict(cfg)
    cfg.setdefault("family", "sensor_drift" if float(cfg.get("bias_A") or 0) > 0 else "none")
    t, signals, integrals, metrics = mod.solve(cfg)
    return {"backend": mod.BACKEND, "systemId": "FL-001", "config": cfg,
            "t": t, "signals": signals, "integrals": integrals, "metrics": metrics}


# ---------------------------------------------------------------------------
# FC-001 L1-FMU 面（FCFMU-G2b-04 / CHG-20261118-05——V1111 DEC-1：64 位解释器内进程
# 导入，无子进程回退；32 位环境 ready=false + 503 结构化——显式不静默）
# ---------------------------------------------------------------------------
_FC_STATE = {"checked": False, "ready": False, "reason": None, "fmu_sha256": None}


def _fc_checked():
    if _FC_STATE["checked"]:
        return _FC_STATE
    _FC_STATE["checked"] = True
    fmu_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))))), "data", "fmu", "fc001_l1_v1.fmu")
    if not os.path.exists(fmu_path):
        _FC_STATE["reason"] = "编译产物缺位：data/fmu/fc001_l1_v1.fmu 不存在"
        return _FC_STATE
    try:
        import fmu_runner
        r = fmu_runner.run_fc001_shell(fmu_path)
        if not r.get("ok"):
            _FC_STATE["reason"] = "壳执行失败：" + json.dumps(r.get("admission", {}), ensure_ascii=False)
            return _FC_STATE
        _FC_STATE["ready"] = True
        _FC_STATE["fmu_sha256"] = r["fmu_sha256"]
        _FC_STATE["runs"] = r["runs"]
    except Exception as e:  # noqa: BLE001
        _FC_STATE["reason"] = "FMU 加载失败（32 位解释器或 ctypes 面）：" + str(e)
    return _FC_STATE


def fc_capability_payload():
    st = _fc_checked()
    return {"model_id": "fc.pem.fmu_l1", "fmu_sha256": st.get("fmu_sha256"),
            "ready": st["ready"], "reason": st.get("reason"),
            "protocol": "faultlab.bridge.fc001-fmu.v1"}


def fc_simulate(run_key):
    st = _fc_checked()
    if not st["ready"]:
        return None, st.get("reason") or "FC 面不可用"
    runs = st["runs"]
    if run_key:
        if run_key not in runs:
            return None, "未知 Run key：" + str(run_key)
        return {"run": runs[run_key], "fmu_sha256": st["fmu_sha256"],
                "model_id": "fc.pem.fmu_l1"}, None
    return {"runs": {k: v for k, v in runs.items()}, "fmu_sha256": st["fmu_sha256"],
            "model_id": "fc.pem.fmu_l1"}, None


def origin_allowed(origin):
    if not origin:
        return True  # 同源 GET/非浏览器客户端无 Origin
    return origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:")


class Handler(BaseHTTPRequestHandler):
    server_version = "FaultLabBackendBridge/0.1"
    token = ""

    def _cors(self):
        origin = self.headers.get("Origin")
        if origin and origin_allowed(origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Token")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _guard(self):
        """返回 None 表示通过；否则 (code, message)。"""
        if not origin_allowed(self.headers.get("Origin")):
            return 403, "Origin 不在白名单（仅本机回环页面）"
        sfs = self.headers.get("Sec-Fetch-Site")
        if sfs and sfs not in ("none", "same-origin"):
            return 403, "Sec-Fetch-Site 拒绝（跨站触发）"
        if self.headers.get("X-Bridge-Token") != self.token:
            return 403, "桥接令牌缺失或不匹配"
        return None

    def _send(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin",
                          self.headers.get("Origin") or "http://127.0.0.1")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Token")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        guard = self._guard()
        if guard:
            self._send(guard[0], {"ok": False, "error": guard[1]})
            return
        if self.path.startswith("/capabilities"):
            self._send(200, {"ok": True, "capabilities": capabilities_payload()})
        elif self.path.startswith("/capability"):
            self._send(200, {"ok": True, "capability": fc_capability_payload()})
        else:
            self._send(404, {"ok": False, "error": "未知端点"})

    def do_POST(self):
        guard = self._guard()
        if guard:
            self._send(guard[0], {"ok": False, "error": guard[1]})
            return
        if self.path.startswith("/simulate-fc001-fmu"):
            try:
                length = int(self.headers.get("Content-Length") or 0)
                body = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
                out, err = fc_simulate(body.get("runKey"))
                if err:
                    self._send(503, {"ok": False, "error": err, "reason_code": "fmu-unavailable"})
                else:
                    self._send(200, {"ok": True, "result": out})
            except Exception as e:  # noqa: BLE001
                self._send(500, {"ok": False, "error": "FC 面失败：" + str(e)})
            return
        if not self.path.startswith("/simulate"):
            self._send(404, {"ok": False, "error": "未知端点"})
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
            out = produce(body.get("backendId"), body.get("config") or {})
            self._send(200, {"ok": True, "result": out})
        except Exception as e:  # noqa: BLE001
            self._send(500, {"ok": False, "error": "后端计算失败：" + str(e)})

    def log_message(self, fmt, *args):  # noqa: A003
        pass  # 不记录请求（离线红线；避免配置体进日志）


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--discovery", default=None, help="发现文件输出路径（含 port/token/pid）")
    args = ap.parse_args(argv[1:])

    token = secrets.token_hex(16)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.RequestHandlerClass.token = token
    port = server.server_address[1]

    discovery_path = args.discovery or os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "out", "backend-bridge.json")
    os.makedirs(os.path.dirname(discovery_path), exist_ok=True)
    with open(discovery_path, "w", encoding="utf-8") as f:
        json.dump({"port": port, "token": token, "pid": os.getpid(),
                   "started_at": datetime.datetime.now().isoformat(timespec="seconds"),
                   "note": "本文件为组织方/本机工具用；浏览器侧请在「后端对照」面板粘贴 token"},
                  f, ensure_ascii=False, indent=2)
    print("[bridge] 127.0.0.1:%d token=%s discovery=%s" % (port, token, discovery_path), file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        try:
            os.remove(discovery_path)
        except OSError:
            pass
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
