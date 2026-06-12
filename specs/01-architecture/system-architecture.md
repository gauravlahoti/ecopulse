# System Architecture

## High-level diagram

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND — Next.js 15 (App Router) + Tailwind + Framer      │
│  Three.js carbon globe · PWA · WCAG 2.2 AA                   │
│  Deployed: Docker → Cloud Run (frontend service)             │
└──────────────┬───────────────────────────────────────────────┘
               │ HTTPS (Firebase Auth ID token on every request)
┌──────────────▼───────────────────────────────────────────────┐
│  API GATEWAY SERVICE — FastAPI (Python 3.12), Docker         │
│  Cloud Run · JWT verification · rate limiting · Pydantic     │
│  request validation · OpenAPI auto-docs                      │
└──────┬───────────────┬───────────────────┬───────────────────┘
       │               │                   │
┌──────▼──────┐ ┌──────▼─────────┐ ┌───────▼────────────────┐
│ AGENT       │ │ EMISSIONS      │ │ INSIGHTS WORKER        │
│ ORCHESTRATOR│ │ ENGINE         │ │ (Cloud Run Jobs +      │
│ Google ADK  │ │ deterministic  │ │  Cloud Scheduler)      │
│ Gemini 3.5  │ │ CO₂e math, no  │ │ nightly forecasts,     │
│ Pro/Flash   │ │ LLM in hot path│ │ weekly coach digest    │
└──────┬──────┘ └──────┬─────────┘ └───────┬────────────────┘
       │               │                   │
┌──────▼───────────────▼───────────────────▼──────────────────┐
│  DATA LAYER                                                  │
│  Firestore (profiles, activities, agent memory)              │
│  Memorystore/Redis (emission-factor + LLM response cache)    │
│  Cloud Storage (uploaded images, signed URLs only)           │
│  Secret Manager (ALL keys)                                   │
└──────────────────────────────────────────────────────────────┘
```

## Services

| Service | Runtime | Deploy target | Responsibility |
|---|---|---|---|
| `frontend` | Next.js 15, Node 22 | Cloud Run | UI, SSR, 3D visualization |
| `gateway` | FastAPI, Python 3.12 | Cloud Run | Auth, validation, rate limiting, routing |
| `agents` | Google ADK, Python 3.12 | Cloud Run | Orchestrator + 4 sub-agents |
| `insights-worker` | Python 3.12 | Cloud Run Jobs | Nightly forecasts, weekly coach digest |

## Key decisions (ADR candidates)

1. **Emissions Engine separate from LLM** — deterministic, cached, 100%-testable CO₂e math. Gemini extracts/classifies; code calculates.
2. **Flash on hot path, Pro for batch** — cost/latency optimization.
3. **Firestore over Cloud SQL** — schemaless agent memory, serverless scaling, generous free tier for a hackathon.
4. **Monorepo** — single CI, shared schemas, easy judge navigation.
5. **Workload Identity Federation** — no SA keys in GitHub.

## Repo layout

```
ecopulse/
├── frontend/                 # Next.js app
├── services/
│   ├── gateway/              # FastAPI API gateway
│   ├── agents/               # ADK agents + prompts/
│   └── insights-worker/      # scheduled jobs
├── packages/schemas/         # shared Pydantic/Zod contracts
├── infra/                    # gcloud deploy scripts, Dockerfiles config
├── evals/                    # AI quality eval suite
├── docs/                     # ADRs, threat-model, a11y, judge-checklist
└── .github/workflows/        # CI/CD
```
