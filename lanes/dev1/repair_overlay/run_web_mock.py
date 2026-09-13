from __future__ import annotations

import argparse
import json
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "r06_platform"))
from scripture_archive_platform.application.speech_application import build_default_application

class Handler(SimpleHTTPRequestHandler):
    app = build_default_application(ROOT)
    frontend = ROOT / "r06_platform" / "frontend"

    def translate_path(self, path: str) -> str:
        clean = urlparse(path).path
        if clean == "/": clean = "/index.html"
        candidate = (self.frontend / clean.lstrip("/")).resolve()
        if self.frontend.resolve() not in candidate.parents and candidate != self.frontend.resolve():
            return str(self.frontend / "404")
        return str(candidate)

    def do_POST(self):
        if self.path != "/api/v1/invoke":
            self.send_error(404); return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 262144:
                self.send_error(413); return
            body = self.rfile.read(length)
            req = json.loads(body.decode("utf-8"))
            response = self.app.handle(req)
            data = json.dumps(response, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' data:; connect-src 'self'")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers(); self.wfile.write(data)
        except Exception:
            data = json.dumps({"ok":False,"error":{"code":"WEB_HOST_ERROR","message":"Request failed; inspect local host log."}}).encode()
            self.send_response(400); self.send_header("Content-Type","application/json"); self.send_header("Content-Length",str(len(data))); self.end_headers(); self.wfile.write(data)

def main():
    p=argparse.ArgumentParser(description="Loopback-only future-web transport proof host")
    p.add_argument("--port", type=int, default=8765)
    args=p.parse_args()
    server=ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Scripture Archive mock web host: http://127.0.0.1:{args.port}")
    server.serve_forever()

if __name__=='__main__': main()