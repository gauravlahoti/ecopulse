# ADR 002 — Gemini Flash on Hot Path, Pro for Batch

**Date:** 2026-06-12
**Status:** Accepted

## Context

The demo's #1 wow moment requires photo → CO₂e in <3 seconds. Gemini 1.5 Pro produces higher-quality outputs but has 2-3× the latency of Flash. The Coach Agent runs weekly in batch and quality matters more than speed there.

## Decision

- **Hot path** (Ingest, Analyst, Forecast agents — user-facing): `gemini-1.5-flash`
- **Batch** (Coach Agent — weekly digest via Cloud Run Jobs): `gemini-1.5-pro`

## Consequences

- Hot-path p95 latency target of <3s is achievable
- Coach advice quality is maximized without impacting user-perceived performance
- Cost is optimized: Pro is only called once per user per week
