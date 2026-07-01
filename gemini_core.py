#!/usr/bin/env python3
"""Gemini image verification logic shared by local dev and Vercel API routes."""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request

SKIP_VERIFICATION = {"cute"}

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"

GEMINI_MODELS = (
    DEFAULT_GEMINI_MODEL,
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
)

SUBJECT_PROMPTS = {
    "dog": "a dog",
    "cat": "a cat",
    "flower": "a flower or flowers",
    "dish": "food or a dish / meal",
}

VALIDATION_RULES = {
    "dog": """Mission: upload a photo of a dog.
Does this image contain a dog (any breed, puppy, cartoon dog, or toy dog counts)?
Reject if there is clearly no dog — e.g. only a person, landscape, car, food, cat, or unrelated object.""",
    "cat": """Mission: upload a photo of a cat.
Does this image contain a cat (any breed, kitten, cartoon cat, or toy cat counts)?
Reject if there is clearly no cat — e.g. only a person, landscape, dog, food, or unrelated object.""",
    "flower": """Mission: upload a photo of a flower or flowers.
Does this image contain flowers (any bloom, bouquet, garden flowers, or potted flowering plant counts)?
Reject if there are clearly no flowers.""",
    "dish": """Mission: upload a photo of food or a favorite dish.
Does this image contain food or drink (meal, snack, dessert, ingredients, or a plated dish counts)?
Reject if there is clearly no food or drink.""",
}

JSON_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "match": {"type": "boolean"},
        "reason": {"type": "string"},
    },
    "required": ["match"],
}

_active_models: list[str] = []


def get_api_key() -> str:
    return os.environ.get("GEMINI_API_KEY", "").strip()


def key_type(api_key: str) -> str:
    if api_key.startswith("AQ."):
        return "auth"
    if api_key.startswith("AIza"):
        return "standard"
    return "unknown"


def key_looks_valid(api_key: str) -> bool:
    return key_type(api_key) in ("auth", "standard")


def json_generation_config(schema: dict | None = None, temperature: float = 0) -> dict:
    return {
        "temperature": temperature,
        "maxOutputTokens": 128,
        "responseMimeType": "application/json",
        "responseSchema": schema or JSON_RESPONSE_SCHEMA,
    }


DESCRIPTION_WORD_LIMIT = 20
MIN_DESCRIPTION_WORDS = 5


def truncate_words(text: str, max_words: int = DESCRIPTION_WORD_LIMIT) -> str:
    words = text.split()
    return " ".join(words[:max_words]) if words else ""


def build_gemini_url(api_key: str, path: str) -> tuple[str, dict]:
    """AQ auth keys use x-goog-api-key header; AIza keys use ?key= query param."""
    base = f"https://generativelanguage.googleapis.com/v1beta/{path}"
    headers: dict[str, str] = {}

    if api_key.startswith("AQ."):
        return base, {"x-goog-api-key": api_key}

    return f"{base}?key={urllib.request.quote(api_key, safe='')}", headers


def gemini_request(api_key: str, path: str, payload: dict | None = None) -> dict:
    url, auth_headers = build_gemini_url(api_key, path)
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json", **auth_headers} if data else auth_headers

    request = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method="GET" if data is None else "POST",
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


def extract_text(data: dict) -> str:
    return (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )


def parse_verification_result(text: str) -> tuple[bool, str]:
    text = text.strip()
    if not text:
        return False, ""

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict) and "match" in parsed:
            return bool(parsed["match"]), str(parsed.get("reason", ""))
    except json.JSONDecodeError:
        match = re.search(r'"match"\s*:\s*(true|false)', text, re.IGNORECASE)
        if match:
            return match.group(1).lower() == "true", ""

    upper = text.upper()
    if upper.startswith("YES"):
        return True, text
    if upper.startswith("NO"):
        return False, text
    return False, text


def sanitize_description(text: str) -> str:
    text = text.strip().strip('"').strip("'").strip()
    if not text:
        return ""

    if text.startswith("{"):
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict) and parsed.get("description"):
                text = str(parsed["description"]).strip()
        except json.JSONDecodeError:
            embedded = re.search(r'"description"\s*:\s*"([^"]+)"', text)
            if embedded:
                text = embedded.group(1).strip()

    lower = text.lower()
    junk_markers = (
        "here is the json",
        "here's the json",
        "json requested",
        "as requested",
        "```",
        '{"match"',
        '{"description"',
    )
    if any(marker in lower for marker in junk_markers):
        return ""

    for prefix in ("here:", "response:", "message:", "description:"):
        if lower.startswith(prefix):
            text = text[len(prefix):].strip()
            lower = text.lower()
            break

    result = truncate_words(text)
    if len(result.split()) < MIN_DESCRIPTION_WORDS:
        return ""
    return result


def verification_prompt(rule: str) -> str:
    return (
        f"{rule}\n\n"
        'Respond with JSON only, no other text: {"match": true} or {"match": false, "reason": "brief"}'
    )


def describe_prompt() -> str:
    return (
        "You're texting someone cute about this photo. "
        "Write one warm playful sentence of about 20 words describing what you see — "
        "mention the subject, colors, or anything adorable. "
        "Lowercase only. Never reply with a single word like 'what' or 'nice'. "
        "Output ONLY the message. No JSON, no quotes, no labels, no preamble."
    )


def describe_prompt_retry() -> str:
    return (
        "Study this image and react like a cute text. "
        "One full sentence, roughly 20 words, specific and enthusiastic. "
        "Describe what is in the photo. Lowercase. No one-word answers. Plain text only."
    )


def discover_models(api_key: str) -> list[str]:
    discovered: list[str] = []
    try:
        data = gemini_request(api_key, "models")
        for item in data.get("models", []):
            name = item.get("name", "")
            methods = item.get("supportedGenerationMethods", [])
            if not name.startswith("models/"):
                continue
            if "generateContent" not in methods:
                continue
            model_id = name.split("/", 1)[1]
            if any(skip in model_id for skip in ("image", "tts", "live", "embedding")):
                continue
            discovered.append(model_id)
    except Exception as err:
        print(f"Could not list Gemini models: {err}", file=sys.stderr)

    ordered: list[str] = []
    for model in GEMINI_MODELS:
        if model in discovered and model not in ordered:
            ordered.append(model)
    for model in discovered:
        if "flash" in model and model not in ordered:
            ordered.append(model)
    for model in GEMINI_MODELS:
        if model not in ordered:
            ordered.append(model)
    return ordered


def init_models(api_key: str) -> list[str]:
    global _active_models
    if not api_key:
        _active_models = list(GEMINI_MODELS)
        return _active_models

    _active_models = discover_models(api_key)
    if DEFAULT_GEMINI_MODEL in _active_models:
        _active_models.remove(DEFAULT_GEMINI_MODEL)
        _active_models.insert(0, DEFAULT_GEMINI_MODEL)
    elif DEFAULT_GEMINI_MODEL not in _active_models:
        _active_models.insert(0, DEFAULT_GEMINI_MODEL)

    return _active_models


def test_gemini(api_key: str) -> dict:
    if not api_key:
        return {"ok": False, "message": "No GEMINI_API_KEY in .env"}

    models = init_models(api_key)
    last_error = "No models responded"

    for model in models[:6]:
        try:
            data = gemini_request(
                api_key,
                f"models/{model}:generateContent",
                {
                    "contents": [{"parts": [{"text": 'Return JSON: {"match": true, "reason": "ok"}'}]}],
                    "generationConfig": json_generation_config(),
                },
            )
            text = extract_text(data)
            ok, _ = parse_verification_result(text)
            if text.strip():
                return {
                    "ok": True,
                    "model": model,
                    "key_type": key_type(api_key),
                    "sample": text.strip()[:80],
                    "parsed_match": ok,
                }
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8", errors="replace")[:240]
            last_error = f"{model}: HTTP {err.code} — {body}"
        except Exception as err:
            last_error = f"{model}: {err}"

    return {"ok": False, "message": last_error, "models_tried": models[:6], "key_type": key_type(api_key)}


def call_gemini(
    api_key: str,
    model: str,
    mime_type: str,
    image_b64: str,
    prompt: str,
    schema: dict | None = None,
    temperature: float = 0,
) -> str:
    data = gemini_request(
        api_key,
        f"models/{model}:generateContent",
        {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": mime_type, "data": image_b64}},
                    ]
                }
            ],
            "generationConfig": json_generation_config(schema, temperature),
        },
    )
    return extract_text(data)


def call_gemini_plain(
    api_key: str,
    model: str,
    mime_type: str,
    image_b64: str,
    prompt: str,
    temperature: float = 0.7,
) -> str:
    data = gemini_request(
        api_key,
        f"models/{model}:generateContent",
        {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": mime_type, "data": image_b64}},
                    ]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": 96,
            },
        },
    )
    return extract_text(data)


def parse_description_result(text: str) -> str:
    return sanitize_description(text)


FALLBACK_DESCRIPTIONS = {
    "dog": (
        "okay wait that dog is literally the cutest thing ever, those big eyes are "
        "making my heart melt and i desperately want to pet them right now"
    ),
    "cat": (
        "peak cat energy right here honestly, the whiskers the pose the attitude, "
        "this little floof is clearly running the whole house and winning"
    ),
    "flower": (
        "those petals look so soft and pretty, the colors are gorgeous and this "
        "whole bouquet just gave my whole day a little sunshine boost"
    ),
    "cute": (
        "literally the cutest thing i have seen all week, you are giving main "
        "character energy and my cheeks are doing that happy cringe thing"
    ),
    "dish": (
        "okay now i am officially hungry, that looks delicious and i can almost "
        "smell it through the screen, feed me please"
    ),
}


def describe_image(mime_type: str, image_b64: str, subject: str = "") -> str:
    api_key = get_api_key()
    if not api_key:
        return ""

    models = _active_models or list(GEMINI_MODELS)
    prompts = (describe_prompt(), describe_prompt_retry())
    for model in models[:6]:
        for prompt in prompts:
            try:
                text = call_gemini_plain(
                    api_key,
                    model,
                    mime_type,
                    image_b64,
                    prompt,
                    temperature=0.8,
                )
                description = parse_description_result(text)
                if description:
                    return description
            except Exception:
                continue
    return FALLBACK_DESCRIPTIONS.get(
        subject,
        "okay i love this one so much, you picked something really sweet and it totally made me smile",
    )


def verify_image(subject: str, mime_type: str, image_b64: str) -> dict:
    if subject in SKIP_VERIFICATION:
        description = describe_image(mime_type, image_b64, subject)
        return {"ok": True, "skipped": True, "description": description}

    api_key = get_api_key()
    if not api_key:
        return {
            "ok": False,
            "message": "Server missing GEMINI_API_KEY — add it to environment variables",
        }

    rule = VALIDATION_RULES.get(subject)
    if not rule:
        description = describe_image(mime_type, image_b64, subject)
        return {"ok": True, "skipped": True, "description": description}

    prompt = verification_prompt(rule)
    models = _active_models or list(GEMINI_MODELS)
    last_error = None

    for model in models[:6]:
        try:
            text = call_gemini(api_key, model, mime_type, image_b64, prompt)
            if not text.strip():
                continue
            ok, reason = parse_verification_result(text)
            description = describe_image(mime_type, image_b64, subject) if ok else ""
            return {
                "ok": ok,
                "message": ""
                if ok
                else (
                    reason
                    or f"That doesn't look like {SUBJECT_PROMPTS.get(subject, 'the right thing')} — try another photo?"
                ),
                "description": description,
                "raw": text.strip(),
                "model": model,
            }
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
            last_error = err

    message = "Couldn't verify this photo right now — try again in a moment."
    if isinstance(last_error, urllib.error.HTTPError):
        body = last_error.read().decode("utf-8", errors="replace")[:240]
        if last_error.code in (401, 403):
            message = f"Gemini rejected the API key ({key_type(api_key)}). Check GEMINI_API_KEY in .env."
        elif last_error.code == 404:
            message = f"Gemini model not found — check the configured model list."
        else:
            message = f"Gemini error ({last_error.code}): {body}"

    return {"ok": False, "message": message}


