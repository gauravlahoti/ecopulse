# ADR 002 — Gemini Flash on the Hot Path, Flash-Lite for Batch / Fallback

**Date:** 2026-06-12 (model versions updated 2026-06-13 to match the shipped build)
**Status:** Accepted

## Context

The demo's #1 wow moment requires photo → CO₂e in <3 seconds. A heavier model produces marginally
richer prose but at 2-3× the latency and cost of Flash — unacceptable on a user-facing path. The
Coach runs weekly in batch where neither latency nor a premium model is justified, and the free-tier
Developer API enforces a per-model daily quota, so a single model is a single point of failure.

## Decision

- **Hot path** (Ingest, Conversation — user-facing): `gemini-2.5-flash`
- **Deterministic** (Analyst, Forecast): **no LLM** — the emissions engine does the math (ADR-001)
- **Batch + automatic fallback** (Coach; and the hot path when a model is rate-limited):
  `gemini-2.5-flash-lite`
- **Pro is never used on the hot path.**

## Consequences

- Hot-path p95 latency target of <3s is achievable; cost stays low (Flash/Flash-Lite only).
- Flash → Flash-Lite fallback gives the live demo resilience against per-model free-tier quota
  exhaustion (the two share no quota bucket) — see `frontend/lib/gemini-vision.ts`.
- Coach quality is "good enough" for a weekly nudge without a premium model; the engine — not the
  LLM — guarantees every number, so model choice never affects correctness.
