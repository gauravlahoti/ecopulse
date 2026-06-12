# WOW Feature 2 — The Parallel-You Simulator

**Status:** ⬜ Not started
**Build during:** Sprint 3 (Forecast Agent) + Sprint 4 (visual polish)
**Demo priority:** #2 — the emotional hook.

## Concept

The Forecast Agent renders **two globes side by side**: "Current You" vs. "Committed You" (if you adopt this week's coach nudge), animated 12 months into the future with cumulative tonnes diverging in real time. Turns abstract guilt into a concrete, visual, motivating delta.

## User stories

- As a user, I see my projected 12-month footprint next to the version of me who adopts the coach's nudge.
- As a user, I can toggle individual interventions ("cycle 2x/week", "2 plant-based meals") and watch trajectories re-simulate live.
- As a reduced-motion user, I get the same comparison as a dual line chart + summary table.

## Flow

1. Coach Agent's weekly nudge (Sprint 3) feeds default "Committed You" scenario.
2. Forecast Agent simulates both trajectories: historical baseline + emission-factor deltas per intervention (deterministic engine math, not LLM arithmetic).
3. Frontend renders dual React Three Fiber globes; haze and a cumulative-tonnes counter animate over a 12-month timeline scrubber.
4. Scenario toggles re-call the Forecast endpoint; responses cached per scenario-hash in Redis.

## Acceptance criteria

- [ ] Scenario re-simulation returns in <1s (cached) / <3s (cold).
- [ ] Numbers traceable to emission factors — a unit test reproduces every displayed delta from engine functions.
- [ ] Dual-globe view has full 2D fallback (chart + table) under `prefers-reduced-motion`.
- [ ] Timeline scrubber keyboard-operable; values announced via ARIA.
- [ ] Playwright E2E: toggle an intervention → divergence updates.
