# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**EcoPulse** — Agentic carbon intelligence platform for the Google PromptWars hackathon.
Tagline: "Fitbit for your carbon footprint, with an AI coaching staff that works while you sleep."

Product specs live in `/specs/` (kept local / gitignored).
Current state: **implemented and deployed** — the Next.js frontend is live on Cloud Run, the
deterministic emissions engine + the ADK coordinator agent are built, and the CI gates (lint,
type-check, ≥85% coverage, axe, build) are wired.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), GSAP + Canvas 2D, Recharts, Tailwind CSS, Framer Motion, TypeScript strict |
| Backend | FastAPI (Python 3.12), Google ADK, Gemini 2.5 Flash / Flash-Lite |
| Data | Firestore, Redis (Memorystore), Cloud Storage |
| Infra | Cloud Run, Docker (distroless), GitHub Actions, Workload Identity Federation |
| Testing | Vitest + RTL, pytest + Hypothesis, Playwright, axe-core |

## Commands

```bash
# Local dev — boots frontend + gateway + Firestore emulator
docker compose up

# Frontend
npm run dev          # dev server
npm run build        # production build
npm run test         # Vitest + RTL
npm run lint         # ESLint + Ruff
npm run type-check   # tsc --noEmit + mypy --strict
npm run format       # Prettier + Black
npm run test:e2e     # Playwright
npm run test:coverage # enforce ≥85% gate
npm run lighthouse   # Lighthouse CI ≥95 budget
npm run evals        # AI extraction accuracy eval suite

# Python services
pytest services/gateway/tests/
pytest services/agents/tests/
mypy --strict services/

# Deploy (CI handles this automatically on merge to main)
bash infra/gcloud_deploy.sh
```

## Critical Architecture Rules

**LLM classifies/extracts — CODE calculates. Never let an LLM do arithmetic.**
The Emissions Engine is a pure-function Python module with bundled DEFRA/EPA emission factors. Gemini identifies items and quantities; `calculate_co2e()` does all math. This is a core differentiator for the judges.

**Agent routing:**
- Hot path (user-facing, <3s): Gemini 2.5 Flash (Ingest + Conversation); Analyst + Forecast are deterministic (no LLM)
- Batch + fallback (Coach; and the hot path when a model is rate-limited): Gemini 2.5 Flash-Lite
- Never use Pro on the hot path

**Three cache tiers (all required):**
1. Redis: emission factors (∞ TTL)
2. Semantic cache: image-embedding hash → Gemini classification
3. Gemini context cache: long Coach system prompt

**Security non-negotiables:**
- Zero hardcoded secrets — all via Google Secret Manager
- All Firestore queries must be scoped to `user_id` — physically prevent cross-user reads
- Strip EXIF from uploaded images before processing
- User content must be delimited in all prompts (injection defense)
- Validate all agent output against Pydantic schemas (fail closed, never pass-through)

## Code Style

**TypeScript:** Strict mode, no `any`, no `ts-ignore`. Use `type` not `interface` for object shapes. RSC for data-fetching views.

**Python:** mypy `--strict` mode throughout. Pydantic for all data shapes. Ruff for formatting + linting.

**Commits:** Conventional Commits format required (`feat:`, `fix:`, `chore:`, `test:`, `docs:`). Enforced by commitlint.

**Tests:** Golden-file pattern for LLM tests (record Gemini responses with VCR, never make live calls in CI). Coverage gate ≥85%.

## Hackathon Judge Axes

All code decisions should be optimized against these 5 axes:

1. **Code Quality** — Monorepo boundaries, strict types, ADRs, DRY shared schemas, CODEOWNERS
2. **Security** — gitleaks CI gate, WIF, scoped Firestore, prompt-injection defenses, OWASP mapping
3. **Efficiency** — Flash on hot path, deterministic engine, 3 cache tiers, SSE streaming, Lighthouse ≥95
4. **Testing** — ≥85% coverage, eval suite on labeled fixtures (differentiator!), Playwright keyboard-only E2E
5. **Accessibility** — WCAG 2.2 AA, axe-core zero-violations in CI, prefers-reduced-motion, full keyboard nav, NVDA-tested

## Sprint Order

1. `specs/02-sprints/sprint-1-foundation/spec.md` — CI/CD, Docker, monorepo scaffolding (Days 1-2)
2. `specs/02-sprints/sprint-2-frontend-accessibility/spec.md` — UI, animated carbon pulse, WCAG 2.2 AA (Days 3-4)
3. `specs/02-sprints/sprint-3-ai-agents/spec.md` — Emissions Engine + 4 ADK agents (Days 5-7)
4. `specs/02-sprints/sprint-4-polish-judge-checklist/spec.md` — Perf tuning, docs, final checklist (Day 8)

## WOW Features (Demo Priority)

1. **Snap-to-Carbon** — photo → CO₂e <3s with an annotated-photo breakdown + swap suggestion
2. **Transparent Engine** — every CO₂e shown as `quantity × DEFRA factor`; the LLM never does the math
3. **Carbon Conversations** — grounded Q&A over the user's own logged data

## Module-specific instructions

Add subdirectory CLAUDE.md files as services are built:
- `frontend/CLAUDE.md` — Next.js patterns, component conventions, RTL test style
- `services/gateway/CLAUDE.md` — FastAPI route conventions, auth middleware
- `services/agents/CLAUDE.md` — ADK patterns, prompt versioning, eval harness
