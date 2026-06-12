"""Coach Agent — weekly nudge (Gemini 2.5 Flash-Lite, batch path).

Picks the single highest-leverage intervention and writes a warm, specific nudge,
then calls `finalize_nudge` so the saving percentage comes from the engine table,
never the model.
"""
from __future__ import annotations

from google.adk.agents import LlmAgent

from ..config import MODEL_FLASH_LITE, gen_config, load_prompt
from ..tools.emissions_tools import finalize_nudge

coach_agent = LlmAgent(
    name="coach_agent",
    model=MODEL_FLASH_LITE,
    description="Generates one weekly, engine-verified coaching nudge for the user.",
    instruction=load_prompt("coach_v1"),
    tools=[finalize_nudge],
    generate_content_config=gen_config(temperature=0.7, max_output_tokens=512),
)
