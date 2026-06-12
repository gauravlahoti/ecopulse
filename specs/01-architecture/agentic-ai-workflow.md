# Agentic AI Workflow — Google ADK + Gemini 3.5

## Topology

A root orchestrator agent with four specialized sub-agents, composed via ADK `LlmAgent` + `SequentialAgent`/`ParallelAgent`.

```python
# services/agents/orchestrator.py (conceptual)
root_agent = LlmAgent(
    name="carbon_orchestrator",
    model="gemini-3.5-pro",
    sub_agents=[ingest_agent, analyst_agent, coach_agent, forecast_agent],
    instruction=ORCHESTRATOR_PROMPT,  # versioned in /prompts, never inline
)
```

## Agents

### 🥗 Ingest Agent — `gemini-3.5-flash` (multimodal)
- Input: photos, PDFs, free text.
- Output: structured activities, e.g. `{type: "meal", items: [{food: "beef burger", qty: 1}]}`.
- Uses Gemini **structured-output mode** (response schemas); validated with Pydantic before any DB write.

### 📊 Analyst Agent — `gemini-3.5-flash`
- ADK function tools: `calculate_co2e(activity)` (deterministic Emissions Engine), Google Search grounding for unfamiliar products, scoped Firestore writer.
- The agent *decides*; the tool *computes*.

### 🧠 Coach Agent — `gemini-3.5-pro` (weekly batch via insights-worker)
- Reads 30-day history from ADK session memory.
- Identifies the single highest-leverage behavior change; generates one empathetic, specific nudge.
- Anti-eco-anxiety guardrails in the system prompt.

### 🔮 Forecast Agent — `gemini-3.5-flash`
- Scenario simulations ("what if I cycle twice a week?") combining historical data + emission factors.
- Returns time-series JSON consumed by the 3D globe and Parallel-You Simulator.

## Safety rails (must-implement)

1. Every tool has an input schema.
2. Firestore tools scoped to the authenticated `user_id` — cross-user reads impossible by construction.
3. All agent outputs pass Pydantic validation — hallucinated fields fail closed, never crash.
4. User content delimited + instruction hierarchy (prompt-injection defense).
5. Explicit Gemini safety settings in code; per-user rate limits at the gateway.

## Model routing policy

| Path | Model | Rationale |
|---|---|---|
| Photo/receipt extraction | 3.5 Flash | hot path, <3s budget |
| CO₂e calculation | none (pure code) | determinism, testability |
| Weekly coaching digest | 3.5 Pro | depth over latency, batch |
| Chat Q&A (Carbon Conversations) | 3.5 Flash, escalate to Pro on complexity | cost control |

## Prompt management

- All prompts in `services/agents/prompts/` as versioned files with a changelog.
- No inline prompt strings in agent code.
