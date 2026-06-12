"""Ingest Agent — multimodal item identification (Gemini 2.5 Flash, hot path).

Identifies items from text or an image, then calls the deterministic `score_meal`
tool for all CO₂e math. The agent never does arithmetic itself.
"""
from __future__ import annotations

from google.adk.agents import LlmAgent

from ..config import MODEL_FLASH, gen_config, load_prompt
from ..tools.emissions_tools import score_meal

ingest_agent = LlmAgent(
    name="ingest_agent",
    model=MODEL_FLASH,
    description=(
        "Identifies food, transport, energy and shopping items from a text "
        "description or a photo, and returns their verified CO₂e and a swap suggestion."
    ),
    instruction=load_prompt("ingest_v1"),
    tools=[score_meal],
    generate_content_config=gen_config(temperature=0.0),  # deterministic extraction
)
