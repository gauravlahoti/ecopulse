"""EcoPulse ADK app — root coordinator agent.

`adk` discovers `root_agent` here. The coordinator routes each tagged turn to the
right specialist sub-agent (ingest / conversation / coach) or, for forecasts,
calls the deterministic `build_dual_forecast` tool directly.

Model routing (Gemini 2.5 only — no Pro on the hot path):
  ingest, conversation, coordinator → gemini-2.5-flash
  coach                             → gemini-2.5-flash-lite
"""
from __future__ import annotations

from google.adk.agents import LlmAgent

from .config import MODEL_FLASH, gen_config, load_prompt
from .sub_agents.coach_agent import coach_agent
from .sub_agents.conversation_agent import conversation_agent
from .sub_agents.ingest_agent import ingest_agent
from .tools.emissions_tools import build_dual_forecast

root_agent = LlmAgent(
    name="ecopulse_coordinator",
    model=MODEL_FLASH,
    description=(
        "EcoPulse carbon-intelligence coordinator. Routes ingest, conversation, "
        "coaching and forecast requests to the right capability."
    ),
    instruction=load_prompt("root_v1"),
    sub_agents=[ingest_agent, conversation_agent, coach_agent],
    tools=[build_dual_forecast],
    generate_content_config=gen_config(temperature=0.0),
)
