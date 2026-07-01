from __future__ import annotations

import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server import get_api_key, test_gemini
from vercel_api import send_json


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        result = test_gemini(get_api_key())
        send_json(self, 200 if result.get("ok") else 503, result)
