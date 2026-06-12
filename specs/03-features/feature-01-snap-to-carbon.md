# WOW Feature 1 — Snap-to-Carbon (Multimodal Killer Demo)

**Status:** ⬜ Not started
**Build during:** Sprint 3 (agents) + Sprint 2 (capture UI)
**Demo priority:** #1 — this is the on-stage moment.

## Concept

Photograph any meal, receipt, or shopping cart → Gemini 3.5 Flash identifies items, estimates portions, and the carbon globe updates **live** with the CO₂e — plus an instant lower-carbon swap suggestion with % savings.

**Demo moment:** the judge photographs their own lunch on stage and gets a number in <3 seconds.

## User stories

- As a user, I snap a photo and see itemized CO₂e per food item within 3 seconds.
- As a user, I'm shown one concrete lower-carbon swap with quantified % savings ("oat milk here = −62%").
- As a screen-reader user, results are announced via an ARIA live region as they stream in.

## Flow

1. Frontend capture (camera/drag-drop, Sprint 2 UI) → signed-URL upload to Cloud Storage (EXIF stripped, type/size validated).
2. Gateway → Ingest Agent (Gemini 3.5 Flash, structured output) → itemized activities.
3. Analyst Agent → `calculate_co2e` per item (deterministic engine) + swap-suggestion tool.
4. SSE stream back: items appear progressively; globe haze animates on final total.
5. Semantic cache check first (image-embedding hash) — repeated demo photos return instantly.

## Acceptance criteria

- [ ] p95 photo→result <3s on Cloud Run (not localhost).
- [ ] Eval fixture set (≥20 labeled meal photos) scores ≥90% item-identification accuracy.
- [ ] Swap suggestion always includes a quantified % saving from engine math, never an LLM-invented number.
- [ ] Hostile text embedded in a photographed image cannot alter agent behavior (injection test).
- [ ] Fully keyboard-accessible capture flow; results announced to screen readers.
