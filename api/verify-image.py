from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from gemini_core import get_api_key, init_models, verify_image
from vercel_api import cors_headers, send_json

_models_ready = False


def ensure_models() -> None:
    global _models_ready
    if _models_ready:
        return
    api_key = get_api_key()
    if api_key:
        init_models(api_key)
    _models_ready = True


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:
        self.send_response(204)
        cors_headers(self)
        self.end_headers()

    def do_POST(self) -> None:
        ensure_models()
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            subject = str(body.get("subject", "")).strip()
            mime_type = str(body.get("mimeType", "image/jpeg")).strip() or "image/jpeg"
            image_b64 = str(body.get("image", "")).strip()

            if not subject:
                send_json(self, 400, {"ok": False, "message": "Missing subject"})
                return
            if not image_b64:
                send_json(self, 400, {"ok": False, "message": "Missing image"})
                return

            result = verify_image(subject, mime_type, image_b64)
            status = 200 if result.get("ok") else 422
            send_json(self, status, result)
        except json.JSONDecodeError:
            send_json(self, 400, {"ok": False, "message": "Invalid JSON body"})
        except Exception as err:
            send_json(self, 500, {"ok": False, "message": str(err)})
