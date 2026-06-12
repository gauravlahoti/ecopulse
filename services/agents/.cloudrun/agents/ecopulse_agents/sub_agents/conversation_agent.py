"""Conversation Agent — grounded Carbon Conversations (Gemini 2.5 Flash).

Answers questions using only the user's activity data, which the adapter includes
in the message. Streams tokens via the ADK API server. Cites activity IDs inline.
"""
from __future__ import annotations

from google.adk.agents import LlmAgent

from ..config import MODEL_FLASH, gen_config, load_prompt

conversation_agent = LlmAgent(
    name="conversation_agent",
    model=MODEL_FLASH,
    description=(
        "Answers questions about the user's own carbon footprint, grounded strictly "
        "in their provided activity log, with inline activity-ID citations."
    ),
    instruction=load_prompt("conversation_v1"),
    generate_content_config=gen_config(temperature=0.3, max_output_tokens=512),
)
