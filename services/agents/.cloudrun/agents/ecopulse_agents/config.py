"""Shared ADK config: model routing, explicit safety settings, prompt loading."""
from __future__ import annotations

from pathlib import Path

from google.genai import types

# Model routing — Gemini 2.5 only. Flash on the hot path, Flash-Lite for light/batch.
# No Pro (keeps user-facing latency < 3s, per the hackathon efficiency axis).
MODEL_FLASH = "gemini-2.5-flash"
MODEL_FLASH_LITE = "gemini-2.5-flash-lite"

_PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(name: str) -> str:
    """Load a versioned prompt markdown file from prompts/ (e.g. 'ingest_v1')."""
    return (_PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")


# Explicit safety settings — never rely on defaults (security rule).
SAFETY_SETTINGS: list[types.SafetySetting] = [
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold=types.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
]


def gen_config(temperature: float, max_output_tokens: int = 1024) -> types.GenerateContentConfig:
    """Build a GenerateContentConfig with explicit safety settings."""
    return types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        safety_settings=SAFETY_SETTINGS,
    )
