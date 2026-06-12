# ADR 001 — Emissions Engine Separated from LLM

**Date:** 2026-06-12
**Status:** Accepted

## Context

Carbon footprint calculations require arithmetic precision. LLMs are known to hallucinate numeric values and cannot be relied upon to perform consistent mathematical operations.

## Decision

The emissions engine (`packages/schemas/emissions_engine.py`) is a pure-function Python module with bundled DEFRA/EPA emission factors. Gemini agents are responsible only for **classification and extraction** (what is this food item? how many grams?). All CO₂e arithmetic is delegated to deterministic code.

## Consequences

- Emissions calculations are 100% unit-testable without any LLM calls
- CO₂e values are reproducible and auditable (each value traces to a specific emission factor)
- Hypothesis property-based tests can verify math invariants exhaustively
- Swap suggestions always cite real percentage savings from engine math, not LLM-generated numbers
- Judges can verify any displayed number by running the engine directly
