from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_models_ready = False


def ensure_models() -> None:
    global _models_ready
    if _models_ready:
        return
    api_key = get_api_key()
    if api_key:
        init_models(api_key)
    _models_ready = True


@app.get("/api/health")
async def health() -> dict:
    api_key = get_api_key()
    return {
        "ok": True,
        "gemini_configured": bool(api_key),
        "key_format_ok": key_looks_valid(api_key),
        "key_type": key_type(api_key) if api_key else None,
        "default_model": DEFAULT_GEMINI_MODEL,
        "active_models": (_active_models or list(GEMINI_MODELS))[:5],
    }


@app.get("/api/test-gemini")
async def test_gemini_route() -> JSONResponse:
    result = test_gemini(get_api_key())
    status = 200 if result.get("ok") else 503
    return JSONResponse(result, status_code=status)


@app.post("/api/verify-image")
async def verify_image_route(request: Request) -> JSONResponse:
    ensure_models()
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "message": "Invalid JSON body"}, status_code=400)

    subject = str(body.get("subject", "")).strip()
    mime_type = str(body.get("mimeType", "image/jpeg")).strip() or "image/jpeg"
    image_b64 = str(body.get("image", "")).strip()

    if not subject:
        return JSONResponse({"ok": False, "message": "Missing subject"}, status_code=400)
    if not image_b64:
        return JSONResponse({"ok": False, "message": "Missing image"}, status_code=400)

    result = verify_image(subject, mime_type, image_b64)
    status = 200 if result.get("ok") else 422
    return JSONResponse(result, status_code=status)
