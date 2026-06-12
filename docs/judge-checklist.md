# Judge Checklist — EcoPulse Submission

Every box below is verifiable against the current code. Paths are clickable from the repo root.

## Axis 1: Code Quality

- [x] Monorepo with clear boundaries: `frontend/`, `services/gateway/`, `services/agents/`, `packages/`, `docs/`, `infra/`
- [x] TypeScript strict mode — `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` (`frontend/tsconfig.json`)
- [x] Python `mypy --strict` throughout (`[tool.mypy] strict = true` in each service `pyproject.toml`)
- [x] Pydantic v2 for all data shapes — no raw dicts across service boundaries (`packages/schemas/models.py`)
- [x] 5 ADRs documenting *why*: `adr/001-emissions-engine-separation.md` … `adr/005-workload-identity-federation.md`
- [x] Conventional Commits enforced via commitlint (`.commitlintrc.json`)
- [x] DRY shared schemas — one contract mirrored Python↔TS: `packages/schemas/models.py` ↔ `models.ts` (ADR-004)
- [x] No committed build artifacts or dead duplicates — `.cloudrun/`, `__pycache__/`, `*.tsbuildinfo`, `*.log` all ignored
- [x] Architecture diagram + decision log: `docs/architecture.md`

## Axis 2: Security

- [x] Zero hardcoded secrets — gitleaks runs on every CI push (`.github/workflows/ci.yml`)
- [x] All secrets via Google Secret Manager — `GEMINI_API_KEY` mounted as a Cloud Run secret env var, never in code
- [x] Workload Identity Federation for CI deploys — no service-account JSON keys (ADR-005)
- [x] Firestore queries always scoped to the authenticated user — `.where("user_id", "==", uid)` enforced by construction (`services/gateway/app/routes/activities.py`, `.claude/rules/security.md`); cross-user reads are physically impossible
- [x] EXIF stripping on all uploaded images — `services/gateway/app/routes/upload.py`
- [x] Prompt-injection defence — user content wrapped in `<user_content>` delimiters (`services/agents/app/prompts/`, and `frontend/lib/gemini-vision.ts` for the live hot path)
- [x] All LLM/agent output validated + coerced before use (fail closed) — `services/agents/app/agents/`, `frontend/lib/gemini-vision.ts`
- [x] LLM numeric claims never trusted — every CO₂e recomputed by the deterministic engine; unmatched items count as 0
- [x] Security headers on all responses (CSP, X-Frame-Options, HSTS) — `services/gateway/app/middleware.py`
- [x] OWASP Top-10 mapping: `docs/threat-model.md`

## Axis 3: Efficiency

- [x] Gemini **2.5 Flash** on the hot path (<3s); **2.5 Flash-Lite** as automatic fallback / batch coach — never Pro on the hot path
- [x] Deterministic Emissions Engine — no LLM arithmetic, pure functions — `packages/emissions/engine.py` (TS port: `frontend/lib/emissions/`)
- [x] Three cache tiers (Redis factors ∞TTL + image-hash semantic cache + scenario cache) — `services/agents/app/cache.py`
- [x] SSE streaming — first identified items / chat tokens appear within ~1s
- [x] Lighthouse CI budget ≥95 performance & accessibility (`.lighthouserc.json`); initial-JS bundle gate <150KB in CI
- [x] Next.js standalone output for a minimal Docker image (`frontend/Dockerfile`)

## Axis 4: Testing

- [x] Coverage ≥85% enforced in CI (`--cov-fail-under=85`; frontend coverage gate in `ci.yml`)
- [x] Emissions Engine unit-tested — `packages/emissions/tests/test_engine.py` (Python) + `frontend/__tests__/emissions.test.ts` (TS)
- [x] Eval suite: 20 labeled fixtures with ground-truth CO₂e — `services/agents/tests/evals/fixtures/meal_fixtures.json`
- [x] Item-identification accuracy target ≥90% — `services/agents/tests/evals/test_extraction_accuracy.py`
- [x] Golden-file (VCR) pattern via `pytest-recording` — cassettes recorded from the fixtures on first run; CI replays offline (no live LLM calls)
- [x] Component tests (Vitest + RTL) for UI primitives + the dashboard — `frontend/__tests__/`
- [x] Playwright E2E + axe-core accessibility audit (`e2e/smoke.spec.ts`, `playwright.config.ts`)

## Axis 5: Accessibility

- [x] WCAG 2.2 AA target throughout
- [x] axe-core **zero violations** on `/` and `/dashboard` — `frontend/scripts/axe-audit.mjs` (+ Playwright axe in E2E)
- [x] `prefers-reduced-motion` gates **all** motion — the animated carbon-pulse canvas (`components/landing/CarbonPulse.tsx`), GSAP scroll reveals (`lib/useGsap.ts`), and all Recharts (`isAnimationActive={false}`) skip animation; data stays fully present as text/SVG
- [x] ARIA live regions for streaming output — camera/scan results, activity feed, chat (`aria-live`)
- [x] Full keyboard navigation — every interactive control (Snap / Upload / Describe, chat, breakdown disclosure) reachable and operable via keyboard
- [x] Modal focus management in the scan/camera overlay — `components/CameraOverlay.tsx`
- [x] Skip-to-content link + semantic landmarks (`<header>`, `<main>`, `<nav>`, labelled `<section>`s) — `frontend/app/layout.tsx`
- [x] 4.5:1 contrast tokens enforced in `tailwind.config.ts`

## Demo Readiness

- [x] Live on Cloud Run: https://ecopulse-frontend-593919045544.us-central1.run.app
- [x] One-command local setup: `docker compose up` (frontend + gateway)
- [x] Graceful degradation — honest "rate-limited" states + offline lexical parser when the free-tier Gemini quota is exhausted
- [x] Three WOW features: **Snap-to-Carbon** (photo → annotated CO₂e), **Transparent Engine** (`quantity × DEFRA factor` shown for every number), **Carbon Conversations** (grounded Q&A over the user's own data)
