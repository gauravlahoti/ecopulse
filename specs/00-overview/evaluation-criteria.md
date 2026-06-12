# Evaluation Criteria Playbook

The Hackathon AI Code Judge scores on 5 axes. Every spec maps its deliverables to these. This doc is the master reference for what "maximizing the score" means in practice.

## 1. Code Quality

- Monorepo with clear boundaries: `/frontend`, `/services/gateway`, `/services/agents`, `/infra`, `/docs`, `/evals`.
- Strict TypeScript (no `any`), Python 3.12 + mypy strict, Ruff + ESLint enforced in CI.
- Conventional commits, CODEOWNERS, PR template.
- DRY: shared schemas package (Pydantic models mirrored as Zod schemas) — one source of truth for API contracts.
- ADRs in `/docs/adr/` documenting *why*, not just *what*.

## 2. Security

- **Zero hardcoded secrets** — all keys in GCP Secret Manager; gitleaks pre-commit + CI gate.
- Workload Identity Federation for CI deploys (no service-account JSON keys anywhere).
- Firebase Auth; ID token verified at the gateway on every request (OWASP A07).
- Firestore tools scoped to authenticated `user_id` by construction (no cross-user access possible).
- Security headers middleware: CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
- Prompt-injection defenses: delimited user content, instruction hierarchy, output schema validation (fail closed).
- Upload constraints: type/size limits, EXIF stripped, signed URLs only.
- OWASP Top-10 mapping table in `/docs/threat-model.md`.

## 3. Efficiency

- Gemini 3.5 **Flash** on the hot path; **Pro** only for weekly batch analysis (~10x cost/latency win).
- Deterministic Emissions Engine — LLM classifies, code calculates. Never let an LLM do arithmetic.
- Three cache tiers: Redis emission factors (∞ TTL), semantic cache for repeated multimodal queries, Gemini context caching for long system prompts.
- SSE streaming for perceived-zero latency.
- Cloud Run: min-instances=0, concurrency=80, distroless images <100MB, cold start <2s.
- Next.js: RSC for data views, dynamic-import Three.js, initial JS <150KB, Lighthouse CI budget ≥95.

## 4. Testing

- Coverage gate ≥85% enforced in CI; badge in README.
- Vitest + React Testing Library (frontend), pytest + Hypothesis property tests (emissions math = 100%).
- Golden-file/VCR-style recorded Gemini responses — deterministic CI, no live LLM calls in tests.
- Eval suite in `/evals` scoring extraction accuracy on labeled fixtures (differentiator).
- Playwright E2E including a keyboard-only journey.

## 5. Accessibility

- WCAG 2.2 AA; axe-core zero-violations CI gate; eslint-plugin-jsx-a11y.
- All motion gated behind `prefers-reduced-motion`; 3D globe has full 2D + data-table fallback.
- Semantic landmarks, focus management on route change, ARIA live regions for streaming agent output.
- 4.5:1 contrast tokens enforced in Tailwind config; full keyboard nav; NVDA-tested.
- Checklist documented in `/docs/a11y.md`.
