# Judge Checklist — EcoPulse Submission

## Axis 1: Code Quality

- [x] Monorepo with clear boundaries: `frontend/`, `services/gateway/`, `services/agents/`, `packages/`
- [x] TypeScript strict mode — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- [x] Python mypy `--strict` throughout
- [x] Pydantic v2 for all data shapes (no raw dicts across service boundaries)
- [x] 5 ADRs: see `docs/adr/001-005.md`
- [x] Conventional Commits enforced via commitlint
- [x] Shared schemas: `packages/schemas/models.py` + `packages/schemas/models.ts` (single source of truth)
- [x] Architecture diagram: `docs/architecture.md`

## Axis 2: Security

- [x] Zero hardcoded secrets — gitleaks runs on every CI push
- [x] All secrets via Google Secret Manager (SM_* env var references only)
- [x] Workload Identity Federation — no service account JSON keys (ADR-005)
- [x] Firestore queries always `.where("user_id", "==", uid)` — `services/gateway/app/routes/activities.py`
- [x] EXIF stripping on all uploaded images — `services/gateway/app/routes/upload.py`
- [x] Prompt injection defence — user content in `<user_content>` delimiters — `services/agents/app/prompts/`
- [x] All agent output validated against Pydantic schemas (fail closed) — `services/agents/app/agents/`
- [x] LLM-claimed saving_pct overridden with engine-verified value — `services/agents/app/agents/coach.py`
- [x] Security headers on all responses (CSP, X-Frame-Options, HSTS) — `services/gateway/app/middleware.py`
- [x] OWASP Top-10 mapping: `docs/threat-model.md`

## Axis 3: Efficiency

- [x] Gemini Flash on hot path (<3s), Pro on batch only — enforced in `services/agents/app/agents/`
- [x] Deterministic Emissions Engine — no LLM arithmetic, pure Python — `packages/emissions/engine.py`
- [x] Three cache tiers (Redis factors + image hash + scenarios) — `services/agents/app/cache.py`
- [x] SSE streaming — first items appear within ~1s of request
- [x] Lighthouse CI budget: ≥95 performance, ≥95 accessibility — `.lighthouserc.json`
- [x] Next.js standalone output for minimal Docker image

## Axis 4: Testing

- [x] Coverage ≥85% enforced in CI (`--cov-fail-under=85` in `pyproject.toml`)
- [x] Emissions Engine 100% unit test coverage — `packages/emissions/tests/test_engine.py`
- [x] Eval suite: 20 labeled fixtures — `services/agents/tests/evals/fixtures/meal_fixtures.json`
- [x] Accuracy target: ≥90% item identification — `test_extraction_accuracy.py`
- [x] Golden-file pattern (VCR) for LLM tests — cassettes in `services/agents/tests/cassettes/`
- [x] Schema conformance tests — Pydantic validation at every agent boundary
- [x] Playwright E2E + axe-core accessibility audit
- [x] Injection test cases in `services/gateway/tests/test_health.py`

## Axis 5: Accessibility

- [x] WCAG 2.2 AA target throughout
- [x] axe-core zero violations in CI (Playwright E2E includes axe audit)
- [x] `prefers-reduced-motion` gates on ALL animations — `useReducedMotion()` in every animated component
- [x] 3D Globe → 2D PieChart fallback under reduced motion — `components/Globe.tsx`
- [x] ARIA live regions: activity feed, chat streaming, camera overlay results
- [x] Full keyboard navigation — every interactive element reachable via Tab
- [x] Timeline scrubber with arrow key support + ARIA `valuetext`
- [x] Modal focus trap in CameraOverlay
- [x] Skip-to-content link in root layout
- [x] Semantic landmarks: `<main>`, `<nav>`, `<section aria-label>`, `<header>`

## Demo Readiness

- [x] One-command local setup: `docker compose up`
- [x] MSW mocks work without backend (frontend fully functional offline)
- [x] Cloud Run deploy: `bash infra/gcloud_deploy.sh`
- [x] Three WOW features: Snap-to-Carbon, Parallel-You Simulator, Carbon Conversations
