# WOW Feature 3 — Carbon Conversations (Agent-as-Interface)

**Status:** ⬜ Not started
**Build during:** Sprint 3 (orchestrator routing) + Sprint 4 (polish)
**Demo priority:** #3 — proves real multi-agent reasoning, not a chatbot wrapper.

## Concept

A voice/chat interface where users interrogate their own data:

> "Why was March so bad?" → "Two flights to Mumbai = 78% of your March footprint. Trains for your Pune trips would have cut it by 0.4 tonnes."

Powered by the orchestrator routing across all four agents with grounded, cited answers from the user's own Firestore history.

## User stories

- As a user, I ask natural-language questions about my footprint and get answers citing my actual logged activities.
- As a user, every numeric claim links to the underlying activity entries (tap to expand evidence).
- As a user, follow-up questions keep context ("…and compared to February?").

## Flow

1. Chat UI (text first; voice via Web Speech API as stretch) streams to gateway via SSE.
2. Orchestrator (Gemini 3.5 Flash, escalate to Pro on complexity) routes: data questions → Analyst Agent (scoped Firestore reads), what-ifs → Forecast Agent, advice → Coach Agent.
3. Answers must cite activity IDs; frontend renders citations as expandable evidence chips.
4. ADK session memory holds conversation context.

## Guardrails

- Scoped Firestore tools: the agent physically cannot read another user's data.
- Numeric claims validated: cited activity CO₂e values must sum within tolerance of the stated figure, else the answer is regenerated (fail closed).
- Prompt-injection: chat input delimited; instruction hierarchy enforced.

## Acceptance criteria

- [ ] Golden-file conversation tests pass deterministically in CI (recorded responses).
- [ ] Every numeric answer in test fixtures carries ≥1 valid activity citation.
- [ ] Cross-user probe questions ("show me other users' data") return refusals — tested.
- [ ] Streaming answer lands in an ARIA live region; chat fully keyboard-operable.
- [ ] p95 first-token latency <1.5s.
