# Agents Service CLAUDE.md

## Critical rule

**LLM classifies/extracts — CODE calculates. Never let an agent do arithmetic.**

- `calculate_co2e()` in `packages/emissions/engine.py` is the only place CO₂e is computed
- `saving_pct` / numeric claims from the Coach are always OVERRIDDEN by the engine's verified value
- See `app/agents/coach.py:_validate_nudge()` for the enforcement pattern

## Two coordinated layers (intentional — not duplication)

This service holds the agent logic in two complementary forms:

| Directory | What it is | Role |
|---|---|---|
| `ecopulse_agents/` | **Google ADK coordinator/delegation app** — `root_agent` (`ecopulse_coordinator`, an `LlmAgent`) with `sub_agents=[ingest, conversation, coach]` and `tools=[build_dual_forecast]`. Packaged + deployed to Cloud Run via `agents-cli` (`agents-cli-manifest.yaml`). | **Canonical agentic implementation / deployed agent.** |
| `app/` | **FastAPI reference service** of the same five capabilities (`ingest`/`analyst`/`coach`/`forecast`/`conversation`), with the three-tier cache (`app/cache.py`) and SSE endpoints. mypy-`--strict`, and it is the target of the unit + eval test suite (`tests/`, `pyproject.toml → --cov=app`). | **Tested reference + local `docker compose` integration.** |

Both obey the golden rule above and delegate all arithmetic to `packages/emissions`. When the
agent behaviour changes, update the ADK app first (it's what deploys), then keep the FastAPI
reference + its tests in step.

## ADK coordinator structure (`ecopulse_agents/`)

```
ecopulse_coordinator  (LlmAgent · gemini-2.5-flash)        agent.py
├─ sub_agents:                                              ← ADK delegation
│   ├─ ingest_agent        (flash)      tools=[score_meal]
│   ├─ conversation_agent  (flash)
│   └─ coach_agent         (flash-lite) tools=[finalize_nudge]
└─ tools=[build_dual_forecast]                              tools/emissions_tools.py
prompts/{root,ingest,conversation,coach}_v1.md             ← versioned, user content delimited
```

## Model routing (Gemini 2.5 — never Pro on the hot path)

| Capability | Model | Why |
|---|---|---|
| Ingest | gemini-2.5-flash | Multimodal, hot path, speed > size |
| Analyst / Forecast | none (deterministic) | Pure engine math, no LLM |
| Conversation | gemini-2.5-flash | Grounded Q&A, SSE streaming |
| Coach | gemini-2.5-flash-lite | Weekly batch, cost-optimised |

The hot path uses **flash**; the lighter **flash-lite** is the batch/coach model and the
automatic fallback when a model is rate-limited.

## Prompt versioning

ADK prompts live in `ecopulse_agents/prompts/*_v1.md`; the FastAPI reference keeps the same
text in `app/prompts/*_v1.py`.
- New version = new file (`ingest_v2`), old kept for rollback
- Never edit a prompt that has golden-file cassettes — create v2 instead
- All user content wrapped in `<user_content>` delimiters (injection defence)

## Testing without Gemini

```bash
pytest tests/                          # All tests (no API key needed)
pytest tests/evals/ --vcr-record=none  # Offline eval suite (replays recorded cassettes)
GEMINI_API_KEY=xxx pytest tests/evals/ --vcr-record=new_episodes  # Record cassettes
```

## Security checklist for new agents

1. Wrap all user content in `<user_content>` delimiters
2. Validate output against the Pydantic schema — fail closed
3. Override any LLM numeric claims with engine-computed values
4. Set `temperature=0.0` for extraction tasks
