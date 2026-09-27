from __future__ import annotations

import json
import os
import signal
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict
from urllib.parse import urlparse

from .core import ApexRuntime, VERSION, default_runtime_root

HOST = "127.0.0.1"
PORT = int(os.getenv("ALBERT_APEX_PORT", "8766"))
MAX_BODY = 64 * 1024
ALLOWED_ORIGINS = {
    "http://127.0.0.1:8765",
    "http://localhost:8765",
    "http://127.0.0.1:8766",
    "http://localhost:8766",
}


class Handler(BaseHTTPRequestHandler):
    runtime: ApexRuntime

    def log_message(self, fmt: str, *args: Any) -> None:
        return

    def _origin_allowed(self) -> bool:
        origin = self.headers.get("Origin", "")
        return not origin or origin in ALLOWED_ORIGINS

    def _headers(self, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()

    def _json(self, value: Any, status: int = 200) -> None:
        self._headers(status)
        self.wfile.write(json.dumps(value, ensure_ascii=False).encode("utf-8"))

    def _error(self, status: int, message: str) -> None:
        self._json({"ok": False, "error": message}, status)

    def _body(self) -> Dict[str, Any]:
        raw_length = self.headers.get("Content-Length", "0")
        try:
            length = int(raw_length)
        except ValueError:
            raise ValueError("Taille de requête invalide.")
        if length < 0 or length > MAX_BODY:
            raise ValueError("Requête trop volumineuse.")
        if not length:
            return {}
        raw = self.rfile.read(length)
        value = json.loads(raw.decode("utf-8"))
        if not isinstance(value, dict):
            raise ValueError("Objet JSON requis.")
        return value

    def do_OPTIONS(self) -> None:
        if not self._origin_allowed():
            return self._error(403, "Origine non autorisée.")
        self.send_response(204)
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        if not self._origin_allowed():
            return self._error(403, "Origine non autorisée.")
        path = urlparse(self.path).path
        try:
            if path == "/health":
                return self._json({
                    "ok": True,
                    "name": "ALBERT APEX OS V2",
                    "version": VERSION,
                    "kill_switch": self.runtime.store.settings()["kill_switch"],
                })
            if path == "/status":
                return self._json({"ok": True, "status": self.runtime.status()})
            if path == "/events":
                return self._json({"ok": True, "events": self.runtime.store.events()[-100:]})
            return self._error(404, "Route inconnue.")
        except Exception as error:
            return self._error(500, str(error)[:500])

    def do_POST(self) -> None:
        if not self._origin_allowed():
            return self._error(403, "Origine non autorisée.")
        if not self.headers.get("Content-Type", "").startswith("application/json"):
            return self._error(415, "JSON requis.")
        path = urlparse(self.path).path
        try:
            body = self._body()
            if path == "/task/create":
                task = self.runtime.begin_task(body.get("intent", ""), body.get("project", "ALBERT"))
                return self._json({"ok": True, "task": task}, 201)
            if path == "/task/progress":
                task = self.runtime.progress(str(body.get("task_id", "")), str(body.get("phase", "")), str(body.get("label", "")))
                return self._json({"ok": True, "task": task})
            if path == "/task/complete":
                task = self.runtime.complete(str(body.get("task_id", "")), body.get("evidence") if isinstance(body.get("evidence"), dict) else {})
                return self._json({"ok": True, "task": task})
            if path == "/task/fail":
                task = self.runtime.fail(str(body.get("task_id", "")), body.get("error", "Échec"))
                return self._json({"ok": True, "task": task})
            if path == "/task/cancel":
                task = self.runtime.cancel(str(body.get("task_id", "")), str(body.get("reason", "Annulé")))
                return self._json({"ok": True, "task": task})
            if path == "/action/propose":
                action = self.runtime.propose_action(str(body.get("action", "")), body.get("payload") if isinstance(body.get("payload"), dict) else {})
                return self._json({"ok": True, "action": action})
            if path == "/core/stop":
                return self._json({"ok": True, "settings": self.runtime.stop()})
            if path == "/core/resume":
                return self._json({"ok": True, "settings": self.runtime.resume()})
            if path == "/settings/mode":
                return self._json({"ok": True, "settings": self.runtime.set_mode(str(body.get("mode", "")))})
            if path == "/settings/resource":
                return self._json({"ok": True, "settings": self.runtime.set_resource_profile(str(body.get("resource_profile", "")))})
            return self._error(404, "Route inconnue.")
        except (ValueError, KeyError, RuntimeError) as error:
            return self._error(400, str(error)[:500])
        except Exception as error:
            return self._error(500, str(error)[:500])


def main() -> None:
    runtime_root = default_runtime_root()
    runtime = ApexRuntime(str(runtime_root))
    Handler.runtime = runtime
    pid_path = Path(runtime_root) / "data" / "apex_v2" / "server.pid"
    pid_path.parent.mkdir(parents=True, exist_ok=True)
    pid_path.write_text(str(os.getpid()), encoding="utf-8")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.daemon_threads = True

    def stop_server(*_: Any) -> None:
        server.shutdown()

    if hasattr(signal, "SIGINT"):
        signal.signal(signal.SIGINT, stop_server)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, stop_server)
    print(f"ALBERT APEX OS V2 local API on http://{HOST}:{PORT}", flush=True)
    try:
        server.serve_forever(poll_interval=0.5)
    finally:
        try:
            pid_path.unlink(missing_ok=True)
        except Exception:
            pass
        server.server_close()


if __name__ == "__main__":
    main()
