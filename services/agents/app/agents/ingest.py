"""Ingest Agent — Gemini 2.5 Flash, hot path (<3s target).

Receives image bytes or text description, returns structured list of
identified items. All CO₂e arithmetic is handled DOWNSTREAM by the
Emissions Engine — this agent only classifies and extracts.

Security:
- User content wrapped in <user_content> delimiters (injection defence).
- Output validated against Pydantic schema (fail closed).
- Images processed via bytes only — never URL redirection.
"""
from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any

from pydantic import ValidationError

from app.cache import get_cached_ingest, image_hash, set_cached_ingest
from app.prompts.ingest_v1 import OUTPUT_SCHEMA, SYSTEM_PROMPT, USER_TEMPLATE

logger = logging.getLogger(__name__)

# Validated output schema (mirrors packages/schemas/models.py:IdentifiedItem)
VALID_CATEGORIES = {"food", "transport", "energy", "shopping", "travel", "other"}


def _validate_item(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Validate and coerce a single raw item from the LLM. Returns None if invalid."""
    try:
        name = str(raw.get("name", "")).strip()
        quantity = float(raw.get("quantity", 0))
        unit = str(raw.get("unit", "g")).strip()
        category = str(raw.get("category", "other")).lower()
        confidence = float(raw.get("confidence", 0))

        if not name or len(name) > 200:
            return None
        if quantity <= 0:
            return None
        if category not in VALID_CATEGORIES:
            category = "other"
        if not (0.0 <= confidence <= 1.0):
            return None
        if confidence < 0.5:  # Below confidence threshold — discard
            return None

        return {"name": name, "quantity": quantity, "unit": unit, "category": category, "confidence": confidence}
    except (TypeError, ValueError):
        return None


def _parse_llm_output(raw_text: str) -> list[dict[str, Any]]:
    """Parse and validate LLM JSON output. Fail closed — returns [] on any error."""
    try:
        # Strip markdown code fences if present
        text = raw_text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        parsed = json.loads(text)
        if not isinstance(parsed, list):
            logger.warning("Ingest agent returned non-array: %s", type(parsed))
            return []

        items = []
        for raw_item in parsed:
            if isinstance(raw_item, dict):
                validated = _validate_item(raw_item)
                if validated is not None:
                    items.append(validated)

        return items
    except (json.JSONDecodeError, Exception) as exc:
        logger.warning("Failed to parse ingest agent output: %s", exc)
        return []


async def run_ingest_text(text_input: str) -> list[dict[str, Any]]:
    """Run the Ingest Agent on a text description.

    Returns a list of validated IdentifiedItem dicts.
    Falls back to [] on any error (fail closed).
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.warning("No GEMINI_API_KEY set — returning empty ingest result")
        return []

    user_message = USER_TEMPLATE.format(user_input=text_input)

    try:
        import google.generativeai as genai  # type: ignore[import-untyped]
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.0,  # Deterministic extraction
                max_output_tokens=1024,
            ),
        )
        response = await model.generate_content_async(user_message)
        return _parse_llm_output(response.text or "[]")
    except Exception as exc:
        logger.error("Ingest agent error: %s", exc)
        return []


async def run_ingest_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> list[dict[str, Any]]:
    """Run the Ingest Agent on image bytes.

    Checks semantic cache first — repeated demo photos return instantly.
    Returns validated IdentifiedItem dicts.
    """
    # Tier 2: Semantic cache check
    img_hash = image_hash(image_bytes)
    cached = get_cached_ingest(img_hash)
    if cached is not None:
        logger.info("Semantic cache HIT — skipping Gemini call")
        return cached

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.warning("No GEMINI_API_KEY set — returning empty ingest result")
        return []

    try:
        import google.generativeai as genai  # type: ignore[import-untyped]
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.0,
                max_output_tokens=1024,
            ),
        )
        b64_image = base64.b64encode(image_bytes).decode()
        image_part = {"inline_data": {"mime_type": mime_type, "data": b64_image}}
        prompt_part = USER_TEMPLATE.format(user_input="[See attached image]")

        response = await model.generate_content_async([prompt_part, image_part])
        items = _parse_llm_output(response.text or "[]")

        # Store in semantic cache for repeated demo runs
        if items:
            set_cached_ingest(img_hash, items)

        return items
    except Exception as exc:
        logger.error("Ingest image agent error: %s", exc)
        return []
