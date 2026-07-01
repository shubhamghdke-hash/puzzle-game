"""Persist uploaded puzzle photos to disk or Vercel Blob."""

from __future__ import annotations

import base64
import binascii
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_UPLOADS_DIR = ROOT / "uploads"

MIME_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
}

MAX_UPLOAD_BYTES = 12 * 1024 * 1024


def uploads_dir() -> Path:
    configured = os.environ.get("UPLOADS_DIR", "").strip()
    return Path(configured) if configured else DEFAULT_UPLOADS_DIR


def mime_to_extension(mime_type: str) -> str:
    clean = mime_type.split(";", 1)[0].strip().lower()
    return MIME_EXTENSIONS.get(clean, ".jpg")


def safe_subject(subject: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in subject.strip().lower())
    return cleaned or "photo"


def decode_image(image_b64: str) -> bytes:
    try:
        data = base64.b64decode(image_b64, validate=True)
    except (binascii.Error, ValueError) as err:
        raise ValueError("Invalid base64 image data") from err
    if not data:
        raise ValueError("Empty image data")
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError("Image too large")
    return data


def build_filename(subject: str, mime_type: str) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    return f"{stamp}_{safe_subject(subject)}{mime_to_extension(mime_type)}"


def append_manifest(entry: dict) -> None:
    try:
        if os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip():
            manifest = Path("/tmp/puzzle-uploads-manifest.jsonl")
        else:
            manifest = uploads_dir() / "manifest.jsonl"
            manifest.parent.mkdir(parents=True, exist_ok=True)
        with manifest.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as err:
        print(f"Could not write upload manifest: {err}")


def save_to_disk(subject: str, mime_type: str, image_bytes: bytes, filename: str) -> dict:
    target_dir = uploads_dir()
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / filename
    path.write_bytes(image_bytes)
    entry = {
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "subject": subject,
        "mime_type": mime_type,
        "storage": "local",
        "path": str(path.relative_to(ROOT)),
    }
    append_manifest(entry)
    return entry


def save_to_vercel_blob(subject: str, mime_type: str, image_bytes: bytes, filename: str) -> dict:
    token = os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip()
    if not token:
        raise RuntimeError("Missing BLOB_READ_WRITE_TOKEN")

    pathname = f"puzzle-uploads/{filename}"
    request = urllib.request.Request(
        f"https://blob.vercel-storage.com/{pathname}",
        data=image_bytes,
        headers={
            "Authorization": f"Bearer {token}",
            "x-content-type": mime_type,
        },
        method="PUT",
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        payload = json.loads(response.read().decode("utf-8"))

    entry = {
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "subject": subject,
        "mime_type": mime_type,
        "storage": "vercel_blob",
        "path": pathname,
        "url": payload.get("url", ""),
    }
    append_manifest(entry)
    return entry


def save_upload(subject: str, mime_type: str, image_b64: str) -> dict | None:
    """Save an uploaded image. Returns metadata, or None if saving is disabled."""
    if os.environ.get("SAVE_UPLOADS", "true").strip().lower() in {"0", "false", "no", "off"}:
        return None

    try:
        image_bytes = decode_image(image_b64)
        filename = build_filename(subject, mime_type)

        if os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip():
            return save_to_vercel_blob(subject, mime_type, image_bytes, filename)

        return save_to_disk(subject, mime_type, image_bytes, filename)
    except Exception as err:
        print(f"Could not save upload ({subject}): {err}")
        return None
