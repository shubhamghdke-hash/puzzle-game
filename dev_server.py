#!/usr/bin/env python3
"""Local development server for the puzzle game."""

from __future__ import annotations

import json
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from gemini_core import (
    DEFAULT_GEMINI_MODEL,
    GEMINI_MODELS,
    _active_models,
    get_api_key,
    init_models,
    key_looks_valid,
    key_type,
    test_gemini,
    verify_image,
)

ROOT = Path(__file__).resolve().parent


def load_env() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip().strip('"').strip("'")


class PuzzleHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format: str, *args) -> None:
        if self.path.startswith("/api/"):
            sys.stderr.write("%s - %s\n" % (self.address_string(), format % args))

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        if self.path.startswith("/api/"):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            return
        self.send_error(404)

    def do_GET(self) -> None:
        if self.path == "/api/health":
            api_key = get_api_key()
            self.send_json(
                200,
                {
                    "ok": True,
                    "gemini_configured": bool(api_key),
                    "key_format_ok": key_looks_valid(api_key),
                    "key_type": key_type(api_key) if api_key else None,
                    "default_model": DEFAULT_GEMINI_MODEL,
                    "active_models": (_active_models or list(GEMINI_MODELS))[:5],
                },
            )
            return

        if self.path == "/api/test-gemini":
            result = test_gemini(get_api_key())
            self.send_json(200 if result.get("ok") else 503, result)
            return

        super().do_GET()

    def do_POST(self) -> None:
        if self.path != "/api/verify-image":
            self.send_error(404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            subject = str(body.get("subject", "")).strip()
            mime_type = str(body.get("mimeType", "image/jpeg")).strip() or "image/jpeg"
            image_b64 = str(body.get("image", "")).strip()

            if not subject:
                self.send_json(400, {"ok": False, "message": "Missing subject"})
                return
            if not image_b64:
                self.send_json(400, {"ok": False, "message": "Missing image"})
                return

            result = verify_image(subject, mime_type, image_b64)
            status = 200 if result.get("ok") else 422
            self.send_json(status, result)
        except json.JSONDecodeError:
            self.send_json(400, {"ok": False, "message": "Invalid JSON body"})
        except Exception as err:
            self.send_json(500, {"ok": False, "message": str(err)})

    def send_json(self, status: int, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    load_env()
    port = int(os.environ.get("PORT", "8765"))
    host = os.environ.get("HOST", "127.0.0.1")
    api_key = get_api_key()

    print(f"Serving puzzle game at http://{host}:{port}")
    print(f"Default Gemini model: {DEFAULT_GEMINI_MODEL}")

    if not api_key:
        print("Gemini API key: NOT SET — add GEMINI_API_KEY to .env")
    else:
        print(f"Gemini API key: configured ({key_type(api_key)} key)")
        init_models(api_key)
        test = test_gemini(api_key)
        if test.get("ok"):
            print(f"Gemini test: OK (model {test.get('model')})")
        else:
            print(f"Gemini test: FAILED — {test.get('message')}")

    print("Press Ctrl+C to stop")

    httpd = ThreadingHTTPServer((host, port), PuzzleHandler)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        httpd.server_close()


if __name__ == "__main__":
    main()
