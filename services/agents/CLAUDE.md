# Agents Service CLAUDE.md

## Critical rule

**LLM classifies/extracts — CODE calculates. Never let an agent do arithmetic.**

- `calculate_co2e()` in `packages/emissions/engine.py` is the only place CO₂e is computed
- `saving_pct` from the Coach Agent is always OVERRIDDEN by the engine's verified value
- See `agents/coach.py:_validate_nudge()` for the enforcement pattern

## Agent structure

```
app/agents/ingest.py       — Gemini 2.5 Flash, photo/text → IdentifiedItem[]
app/agents/analyst.py      — Emissions Engine → ActivityRecord (no LLM)
app/agents/coach.py        — Gemini 2.5 Flash-Lite, weekly batch → CoachNudge
app/agents/forecast.py     — Emissions Engine → ForecastScenario (no LLM)
app/agents/conversation.py — Gemini 2.5 Flash, SSE streaming → grounded Q&A
app/prompts/               — Versioned prompts (never edit in place)
app/cache.py               — Three-tier Redis caching
```

## Prompt versioning

Prompts live in `app/prompts/ingest_v1.py`, `coach_v1.py`, etc.
- New version = new file (`ingest_v2.py`), old kept for rollback
- VCR cassettes named after the version tag
- Never edit a prompt that has golden-file cassettes — create v2 instead

## Testing without Gemini

```bash
pytest tests/                          # All tests (no API key needed)
pytest tests/evals/ --vcr-record=none  # Offline eval suite
GEMINI_API_KEY=xxx pytest tests/evals/ --vcr-record=new_episodes  # Record cassettes
```

## Security checklist for new agents

1. Wrap all user content in `<user_content>` delimiters
2. Validate output against Pydantic schema — fail closed
3. Override any LLM numeric claims with engine-computed values
4. Set `temperature=0.0` for extraction tasks
