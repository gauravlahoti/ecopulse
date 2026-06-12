---
description: Testing standards for EcoPulse — coverage gates and AI eval requirements
paths: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/test_*.py", "evals/**"]
---

# Testing Rules

## Coverage Gate
- Minimum ≥85% across all services — enforced in CI; PRs fail if below threshold
- Emissions Engine must have 100% unit-test coverage (it's the trust anchor)

## Frontend (Vitest + React Testing Library)
- Test behavior, not implementation — query by role/label, not CSS selectors
- Use MSW to mock the gateway API — tests must never hit real network endpoints
- Every interactive component needs a keyboard-only interaction test
- Every animation/motion component needs a `prefers-reduced-motion` test variant

## Python (pytest + Hypothesis)
- Use Hypothesis for the emissions engine: property-based tests that verify CO₂e math invariants
- Use `pytest-vcr` (golden-file pattern) for all Gemini API calls — no live LLM calls in CI
- Fixture names: `test_<agent>_<scenario>.yaml` in `services/agents/tests/cassettes/`

## AI Eval Suite (`evals/`)
- Minimum 20 labeled meal-photo fixtures with ground-truth CO₂e values
- `eval_extraction.py` must report: item-identification accuracy, CO₂e error (MAE/RMSE), swap-suggestion relevance
- Target: ≥90% item-identification accuracy — this is a judge differentiator
- Eval results saved as CI artifacts in `evals/results/`

## E2E (Playwright)
- Must include a full keyboard-only user journey: log an activity → view the dashboard → ask Carbon Conversations
- Record a video artifact of the demo path for the submission
- Accessibility: run axe-core assertions on every page — zero violations required

## LLM Test Pattern
```python
# DO: record responses, replay in CI
@pytest.mark.vcr()
def test_ingest_agent_meal_photo():
    result = ingest_agent.process(fixture_image("biryani.jpg"))
    assert result.items[0].name == "chicken biryani"

# DON'T: hit live Gemini in CI
def test_bad():
    result = gemini_client.generate(...)  # never in CI
```
