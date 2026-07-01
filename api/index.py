from __future__ import annotations

import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parent
ROOT = API_DIR.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from api._bundled_assets import ASSETS, MEDIA_TYPES
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

PUBLIC = API_DIR / "public"

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


def asset_response(name: str) -> Response:
    content = ASSETS.get(name)
    if content is None and (PUBLIC / name).is_file():
        content = (PUBLIC / name).read_text(encoding="utf-8")
    if content is None:
        raise HTTPException(status_code=500, detail=f"Missing static asset: {name}")
    return Response(content=content, media_type=MEDIA_TYPES.get(name, "text/plain; charset=utf-8"))


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
        "bundled_assets": len(ASSETS),
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


@app.get("/")
async def serve_index() -> Response:
    return asset_response("index.html")


@app.get("/app.js")
async def serve_app_js() -> Response:
    return asset_response("app.js")


@app.get("/styles.css")
async def serve_styles_css() -> Response:
    return asset_response("styles.css")


@app.get("/cartoons.js")
async def serve_cartoons_js() -> Response:
    return asset_response("cartoons.js")


@app.get("/celebration.js")
async def serve_celebration_js() -> Response:
    return asset_response("celebration.js")


@app.get("/decorations.js")
async def serve_decorations_js() -> Response:
    return asset_response("decorations.js")


@app.get("/imageRecognition.js")
async def serve_image_recognition_js() -> Response:
    return asset_response("imageRecognition.js")
