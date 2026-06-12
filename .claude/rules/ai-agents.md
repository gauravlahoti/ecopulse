---
description: Rules for building the Google ADK multi-agent system and Gemini integrations
paths: ["services/agents/**", "services/gateway/**"]
---

# AI Agent Rules

## The Golden Rule
**LLM classifies and extracts. CODE calculates. Never let Gemini do arithmetic.**

The emissions engine (`packages/schemas/emissions_engine.py`) is the single source of truth for CO₂e math. Gemini's job: identify food items, estimate portions, classify activities. Then hand off to `calculate_co2e()`.

## Model Routing
| Agent | Model | Reason |
|---|---|---|
| Ingest Agent | gemini-1.5-flash | Multimodal, hot path, speed > quality |
| Analyst Agent | gemini-1.5-flash | Function calling, hot path |
| Forecast Agent | gemini-1.5-flash | Scenario math, hot path |
| Coach Agent | gemini-1.5-pro | Weekly batch, quality > speed |

Never use Pro on the user-facing hot path (>3s latency kills the demo).

## ADK Agent Structure
```python
# All agents must follow this pattern
from google.adk import Agent
from pydantic import BaseModel

class IngestOutput(BaseModel):
    items: list[IdentifiedItem]
    confidence: float

ingest_agent = Agent(
    model="gemini-1.5-flash",
    system_prompt=open("prompts/ingest_v1.md").read(),  # versioned prompt file
    output_schema=IngestOutput,  # structured output — validates automatically
    safety_settings=SAFETY_SETTINGS,  # explicit, never default
)
```

## Prompt Management
- All prompts live in `services/agents/prompts/` as versioned `.md` files (e.g., `ingest_v1.md`)
- Never embed prompts as inline strings in Python files
- Include a changelog comment at the top of each prompt file
- User content must always be wrapped in delimiters (injection defense)

## Safety Settings
Always set explicit Gemini safety settings — never rely on defaults:
```python
from google.generativeai.types import HarmCategory, HarmBlockThreshold

SAFETY_SETTINGS = {
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
}
```

## Caching (all three tiers required)
1. **Emission factors**: Redis, ∞ TTL — load once on startup, never re-fetch
2. **Image classifications**: hash(image_bytes) → cached IngestOutput, TTL 7 days
3. **Coach system prompt**: Gemini context cache — the long system prompt is stable, cache it

## Streaming
Use Server-Sent Events (SSE) for all user-facing agent responses:
```
Agent → FastAPI SSE endpoint → Next.js EventSource → UI update
```
Never buffer a full response before sending — start streaming tokens immediately.

## Output Validation
```python
# ALWAYS validate agent output — fail closed
try:
    output = IngestOutput.model_validate(raw_agent_response)
except ValidationError:
    raise AgentOutputError("Invalid agent output — rejecting")
# NEVER: return raw_agent_response directly
```

## Firestore Tool Scoping
All ADK tools that query Firestore must enforce user isolation:
```python
def get_user_activities(uid: str, limit: int = 50) -> list[Activity]:
    return db.collection("activities")
        .where("user_id", "==", uid)  # mandatory — never omit
        .order_by("timestamp", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
```
