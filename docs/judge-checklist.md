# EcoPulse — Judge Submission Checklist

Fill in evidence links before submission.

## Axis 1: Code Quality

| Check | Status | Evidence |
|---|---|---|
| Monorepo layout per architecture spec | ⬜ | |
| TypeScript strict — zero `any` | ⬜ | CI run link |
| mypy --strict passes | ⬜ | CI run link |
| ESLint zero warnings | ⬜ | CI run link |
| Ruff zero warnings | ⬜ | CI run link |
| Conventional commits only | ⬜ | `git log --oneline` |
| CODEOWNERS file present | ⬜ | `.github/CODEOWNERS` |
| 5 ADRs in `docs/adr/` | ⬜ | |
| README with Mermaid diagram + setup-in-3-commands | ⬜ | |

## Axis 2: Security

| Check | Status | Evidence |
|---|---|---|
| gitleaks CI gate green | ⬜ | CI run link |
| No SA keys in repo or GitHub Secrets | ⬜ | WIF setup docs |
| All Firestore queries user-scoped | ⬜ | Code review |
| EXIF stripping in upload handler | ⬜ | `app/routes/upload.py` |
| Pydantic validation on all agent outputs | ⬜ | Sprint 3 |
| Security headers on all responses | ⬜ | `app/middleware.py` |
| OWASP Top-10 mapping | ⬜ | `docs/threat-model.md` |

## Axis 3: Efficiency

| Check | Status | Evidence |
|---|---|---|
| Gemini Flash on hot path | ⬜ | `services/agents/` |
| Gemini Pro only for Coach (batch) | ⬜ | `services/agents/` |
| Emissions engine: no LLM in math | ⬜ | `packages/schemas/emissions_engine.py` |
| Redis cache for emission factors | ⬜ | Sprint 3 |
| Semantic cache for image classifications | ⬜ | Sprint 3 |
| SSE streaming implemented | ⬜ | Sprint 3 |
| Lighthouse ≥95 | ⬜ | Lighthouse CI artifact |
| Bundle <150KB initial JS | ⬜ | CI build artifact |

## Axis 4: Testing

| Check | Status | Evidence |
|---|---|---|
| Frontend coverage ≥85% | ⬜ | Codecov badge |
| Gateway coverage ≥85% | ⬜ | Codecov badge |
| Emissions engine 100% coverage | ⬜ | Sprint 3 |
| Golden-file tests for agents | ⬜ | `services/agents/tests/cassettes/` |
| Hypothesis property tests | ⬜ | Sprint 3 |
| Eval suite accuracy ≥90% | ⬜ | `evals/results/` |
| Playwright keyboard-only E2E | ⬜ | Sprint 2 |
| axe-core zero violations | ⬜ | CI artifact |

## Axis 5: Accessibility

| Check | Status | Evidence |
|---|---|---|
| axe-core zero violations in CI | ⬜ | CI artifact |
| eslint-plugin-jsx-a11y zero warnings | ⬜ | CI run |
| Globe 2D fallback works | ⬜ | Playwright test |
| Parallel-You 2D fallback works | ⬜ | Playwright test |
| All animations behind prefers-reduced-motion | ⬜ | Code review |
| Full keyboard navigation | ⬜ | Manual test |
| ARIA live regions on streaming responses | ⬜ | Code review |
| NVDA manual test completed | ⬜ | `docs/a11y.md` |
| 4.5:1 contrast ratio verified | ⬜ | Lighthouse a11y score |

## Final Submission

| Item | Status | Link |
|---|---|---|
| Live Cloud Run URL accessible | ⬜ | |
| README has live URL + demo GIF | ⬜ | |
| 90-second demo video | ⬜ | |
| Submission form completed | ⬜ | |
