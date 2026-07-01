from __future__ import annotations

import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from gemini_core import (
    DEFAULT_GEMINI_MODEL,
    GEMINI_MODELS,
    _active_models,
    get_api_key,
    key_looks_valid,
    key_type,
)
from vercel_api import send_json


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        api_key = get_api_key()
        send_json(
            self,
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
