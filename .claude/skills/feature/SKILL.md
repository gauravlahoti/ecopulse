---
name: feature
description: Build one of EcoPulse's three WOW features end-to-end. Pass the feature name or number: "snap", "simulator", "conversations", or 1/2/3. Example: /feature snap
disable-model-invocation: false
---

# WOW Feature Build Skill

You are building a specific high-impact feature for the EcoPulse hackathon demo. The feature is identified by $ARGUMENTS.

## Feature Mapping

| Argument | Feature | Spec File |
|---|---|---|
| snap, 1 | Snap-to-Carbon (photo → CO₂e <3s) | `specs/03-features/feature-01-snap-to-carbon.md` |
| simulator, 2 | Parallel-You Simulator (dual globes) | `specs/03-features/feature-02-parallel-you-simulator.md` |
| conversations, 3 | Carbon Conversations (Q&A over data) | `specs/03-features/feature-03-carbon-conversations.md` |

## Step 1: Read the Spec

Read the feature spec file completely. Then read the relevant sprint specs to understand what's already been built.

## Step 2: Identify Prerequisites

List what must exist before this feature can be built:
- For Snap-to-Carbon: camera UI (Sprint 2) + Ingest Agent (Sprint 3)
- For Parallel-You: Forecast Agent (Sprint 3) + Globe component (Sprint 2)
- For Conversations: Orchestrator (Sprint 3) + all 4 agents

If prerequisites are missing, say so and ask the user if you should build them first.

## Step 3: Implement with Demo-First Priority

Features will be demoed live to judges. Implement in this order:
1. **The golden path** — the exact sequence shown in the 90-second demo
2. **Error states** — graceful degradation (network failure, bad image, empty data)
3. **Performance** — meet the latency SLAs: Snap-to-Carbon <3s p95, Conversations <1.5s first token
4. **Accessibility** — motion fallbacks, keyboard nav, ARIA live regions for streaming

## Key Implementation Details by Feature

### Snap-to-Carbon
- Camera capture UI: use `getUserMedia` with drag-drop fallback
- Upload flow: multipart/form-data → gateway → strip EXIF → hash for semantic cache check
- If cache hit: return immediately (0ms perceived)
- If cache miss: stream Ingest Agent response via SSE → update globe live
- Show swap suggestion with % CO₂e savings immediately after result
- Must hit ≥90% item-identification accuracy on eval fixtures

### Parallel-You Simulator
- Two `<Globe />` instances side-by-side: "Current You" vs "Committed You"
- Intervention toggles feed into Forecast Agent — re-simulate on toggle
- Use requestAnimationFrame for the diverging trajectory animation
- `prefers-reduced-motion` fallback: dual line chart (Chart.js or Recharts) + summary table
- Timeline scrubber: keyboard accessible (arrow keys = month-by-month)
- Cache: <1s for previously-run scenarios, <3s cold

### Carbon Conversations
- Text input (primary) + Web Speech API voice (stretch goal)
- Route question type to correct agent: data questions → Analyst, what-ifs → Forecast, advice → Coach
- Streaming: SSE from gateway, tokens appear as they arrive
- Every numeric claim must be linked to the actual activity record (cite with activity ID)
- ADK session memory maintains conversation context
- Scoped tools — Analyst can only read the authenticated user's Firestore data

## Step 4: Write the Eval

For Snap-to-Carbon: add 5+ labeled fixtures to `evals/fixtures/` and update `eval_extraction.py`.
For others: write at least 3 golden-file pytest cassettes.

## Step 5: Verify Demo Flow

Walk through the exact demo narrative from `specs/00-overview/executive-summary.md` and verify every step works end-to-end. Confirm latency SLAs are met.
