# Sprint 3 — Agentic AI Integration (Google ADK + Gemini)

**Epic:** "The Carbon Agents come alive."
**Duration:** Days 5–7
**Status:** ⬜ Not started
**Depends on:** Sprint 1 (deploy pipeline). Can overlap Sprint 2 (frontend uses MSW mocks until this lands).

## Goal

The four ADK agents + orchestrator live on Cloud Run, the deterministic Emissions Engine fully tested, streaming responses wired to the frontend, and an eval suite proving extraction quality.

## User stories

- As a user, I upload a meal photo and get a CO₂e number in <3 seconds.
- As a user, I receive one specific, empathetic weekly nudge ranked by impact.
- As a user, I can ask "what if I cycle twice a week?" and see a simulated trajectory.

## Tasks

### Emissions Engine (pure code — build first)
- [ ] Pure-function Python module; bundled DEFRA/EPA emission factors as versioned JSON.
- [ ] 100% unit-test coverage on the math; Hypothesis property-based tests.
- [ ] Redis cache for factors (∞ TTL).

### ADK agents (see `01-architecture/agentic-ai-workflow.md`)
- [ ] Ingest Agent: Gemini 3.5 Flash multimodal, structured-output mode, Pydantic validation before DB writes.
- [ ] Analyst Agent: function tools (`calculate_co2e`, Search grounding, scoped Firestore writer).
- [ ] Coach Agent: 3.5 Pro weekly batch via insights-worker (Cloud Run Jobs + Scheduler).
- [ ] Forecast Agent: scenario simulation returning time-series JSON.
- [ ] Orchestrator wiring; all prompts versioned in `services/agents/prompts/` with changelog.

### Streaming & caching
- [ ] SSE streaming from agents → gateway → frontend (replace MSW mocks).
- [ ] Semantic cache: image-embedding hash → cached classification.
- [ ] Gemini context caching for the long coach system prompt.

### AI security
- [ ] Prompt-injection defenses: delimited user content + instruction hierarchy.
- [ ] Output schema validation fails closed.
- [ ] Per-user rate limits at the gateway.
- [ ] Image upload constraints: type/size limits, EXIF stripped.
- [ ] Explicit Gemini safety settings in code.
- [ ] `/docs/threat-model.md` with OWASP Top-10 mapping.

### Testing AI deterministically
- [ ] Golden-file tests with recorded Gemini responses (VCR-style) — no live LLM calls in CI.
- [ ] Schema-conformance tests for every agent output.
- [ ] Eval suite in `/evals`: extraction accuracy on ≥20 labeled meal-photo fixtures, scored report artifact in CI.

## Acceptance criteria

- [ ] Photo → CO₂e end-to-end p95 <3s (measured, screenshot in docs).
- [ ] Emissions Engine at 100% coverage; overall repo coverage ≥85%.
- [ ] CI runs fully offline (recorded responses) and stays green.
- [ ] Eval suite reports ≥90% extraction accuracy on fixtures.
- [ ] A malformed/hostile prompt in an uploaded image cannot alter agent behavior (injection test cases pass).
- [ ] Cross-user data access impossible: scoped-tool tests prove it.

## Judge-criteria mapping

| Criterion | How this sprint satisfies it |
|---|---|
| Security | Injection defenses + scoped tools + threat model doc |
| Efficiency | Flash-first routing, three cache tiers, SSE streaming |
| Testing | Deterministic mocked-LLM CI + eval suite (differentiator) |
| Quality | Agents/engine/gateway cleanly separated; DRY shared schemas |
| Accessibility | Streaming output lands in ARIA live regions (frontend contract) |
