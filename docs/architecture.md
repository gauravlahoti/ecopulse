# EcoPulse Architecture

## System Overview

```mermaid
graph TB
    subgraph "Client"
        FE["Next.js 15\nFrontend\n(localhost:3000)"]
    end

    subgraph "API Gateway — Cloud Run"
        GW["FastAPI Gateway\n(Port 8000)\n• Auth middleware\n• Rate limiting\n• EXIF stripping\n• Security headers"]
    end

    subgraph "AI Agents — Cloud Run"
        ORCH["Orchestrator\n(ADK Session)"]
        INGEST["Ingest Agent\nGemini 2.5 Flash\n<3s hot path"]
        ANALYST["Analyst Agent\nDeterministic Engine\n(no LLM math)"]
        COACH["Coach Agent\nGemini 2.5 Flash-Lite\nWeekly batch"]
        FORECAST["Forecast Agent\nDeterministic\n(no LLM)"]
        CONVO["Conversation Agent\nGemini 2.5 Flash\nSSE streaming"]
    end

    subgraph "Emissions Engine — shared package"
        EE["calculate_co2e()\nDEFRA 2024 factors\nPure Python\n100% tested"]
    end

    subgraph "Data Layer"
        FS["Firestore\nUser-scoped queries\n(.where user_id==uid)"]
        REDIS["Redis\n• Tier 1: Factors ∞TTL\n• Tier 2: Image hash\n• Tier 3: Scenarios 1hr"]
        GCS["Cloud Storage\nEXIF-stripped images\nSigned URLs only"]
    end

    subgraph "Security"
        SM["Secret Manager\nAll secrets\nNo env vars in code"]
        WIF["Workload Identity\nFederation\nNo SA keys"]
    end

    FE -->|"HTTPS + Firebase Auth token"| GW
    GW -->|"Service-to-service\nX-User-Id header"| ORCH
    ORCH --> INGEST
    ORCH --> ANALYST
    ORCH --> FORECAST
    ORCH --> CONVO
    INGEST -->|"LLM identifies items"| ANALYST
    ANALYST -->|"Deterministic CO₂e"| EE
    FORECAST -->|"Deterministic trajectory"| EE
    COACH -->|"LLM nudge text\n(saving_pct overridden\nby engine)"| EE
    GW --> FS
    GW --> GCS
    ANALYST --> REDIS
    FORECAST --> REDIS
    GW --> SM
    GW --> WIF
```

## Agent Routing

| Agent | Model | Path | Latency target |
|---|---|---|---|
| Ingest | Gemini 2.5 Flash | Hot (user-facing) | <3s p95 |
| Analyst | None (deterministic) | Hot (user-facing) | <100ms |
| Forecast | None (deterministic) | Hot (user-facing) | <1s (cached) |
| Conversation | Gemini 2.5 Flash | Hot (streaming SSE) | <1.5s first token |
| Coach | Gemini 2.5 Flash-Lite | Batch (weekly cron) | Cost-optimised batch |

> **Model policy:** Flash on every user-facing hot path; the lighter Flash-Lite for batch coaching and as the automatic hot-path fallback when a model is rate-limited. Pro is never used on the hot path. The live frontend calls Gemini directly with the same Flash → Flash-Lite policy (`frontend/lib/gemini-vision.ts`).

## Three Cache Tiers

```
Tier 1: Redis — Emission Factors
  Key: ef:v2024:<version>
  TTL: ∞ (only evict on DEFRA version bump)
  Size: ~50KB

Tier 2: Redis — Semantic Image Cache
  Key: img:<sha256(image_bytes)[:16]>
  TTL: 30 days
  Benefit: Repeated demo photos return instantly, 0 Gemini tokens

Tier 3: Redis — Forecast Scenarios
  Key: fc:<hash(user_id + sorted_interventions)[:16]>
  TTL: 1 hour
  Benefit: <1s for scenario re-simulation after first call
```

## Security Architecture

```
User Request
    │
    ▼
Firebase Auth Token Verification (gateway/auth.py)
    │
    ▼
Rate Limit Check (60 req/min per user)
    │
    ▼
Image Upload? → EXIF Strip → Type/Size Validation
    │
    ▼
Firestore Query → ALWAYS .where("user_id", "==", uid)
    │
    ▼
LLM Call → User content in <user_content> delimiters
    │
    ▼
Output → Pydantic validation → fail closed if invalid
    │
    ▼
Numeric claims → re-validated against Emissions Engine
```

## Key Architecture Decision Records

| ADR | Decision |
|---|---|
| [ADR-001](adr/001-emissions-engine-separation.md) | Emissions Engine separated from LLM agents (LLM identifies, code calculates) |
| [ADR-002](adr/002-gemini-model-routing.md) | Gemini Flash on the hot path, lighter model for batch |
| [ADR-003](adr/003-firestore-over-cloud-sql.md) | Firestore with mandatory user_id scoping |
| [ADR-004](adr/004-monorepo-structure.md) | npm workspaces + shared Python packages monorepo |
| [ADR-005](adr/005-workload-identity-federation.md) | Workload Identity Federation — zero SA keys |

## Implemented vs. designed

The diagram above is the **designed target topology**. What is **live today** (the submitted demo):

- **Frontend (live, Cloud Run).** Next.js 15 app; its server-only Route Handlers (`frontend/app/api/v1/*`) hold the Gemini key and call Gemini **directly** with the Flash → Flash-Lite policy, then recompute every CO₂e with the deterministic **TypeScript** engine (`frontend/lib/emissions/`).
- **ADK coordinator (deployed, Cloud Run).** `services/agents/ecopulse_agents/` — the coordinator/delegation agent packaged via `agents-cli`; embodies the same "LLM identifies, code calculates" rule server-side. The live hot path bypasses it for free-tier-quota resilience (see ADR-002 / README §4 note).
- **Gateway, Firestore, Redis, GCS, Firebase Auth, WIF** are the production-hardening layer: the FastAPI gateway (`services/gateway/`) ships real security middleware (CSP/HSTS, EXIF stripping) and is tested in CI; Firestore/Redis/GCS wiring is specified (rules + threat model) but the demo runs on an in-memory store with no cross-user data.
