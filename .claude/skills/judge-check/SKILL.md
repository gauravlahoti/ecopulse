---
name: judge-check
description: Run through all 5 judge scoring axes and produce a pass/fail checklist for the EcoPulse hackathon submission. Use before final submission.
disable-model-invocation: true
---

# Judge Checklist Skill

Run this skill before submitting to verify all judge criteria are met. It produces a definitive pass/fail report across all 5 axes.

## Axis 1: Code Quality

Check:
- [ ] Monorepo structure matches `specs/01-architecture/system-architecture.md`
- [ ] TypeScript: `npm run type-check` exits 0 (zero `any` types)
- [ ] Python: `mypy --strict services/` exits 0
- [ ] ESLint + Ruff: `npm run lint` exits 0
- [ ] Conventional commits: recent `git log --oneline -20` all follow `feat:|fix:|chore:|test:|docs:` pattern
- [ ] CODEOWNERS file exists at `.github/CODEOWNERS`
- [ ] Shared schemas in `packages/schemas/` (no duplicated type definitions)
- [ ] ADRs: at least 5 files in `docs/adr/` covering key decisions
- [ ] `docs/README.md` has architecture diagram (Mermaid), setup-in-3-commands, demo GIF, badges

## Axis 2: Security

Check:
- [ ] gitleaks: `git log --all` has no secrets (run `gitleaks detect`)
- [ ] `.env` not committed; `.env.example` exists with placeholder values
- [ ] All secrets accessed via Google Secret Manager (grep for `os.environ.get` of secret values)
- [ ] All Firestore queries have `where("user_id", "==", uid)` — grep for collection queries without it
- [ ] EXIF stripping in image upload handler
- [ ] Image type/size validation at gateway
- [ ] Pydantic validation on all agent outputs
- [ ] Gemini safety settings explicitly set in code
- [ ] Security headers middleware on FastAPI
- [ ] `docs/threat-model.md` exists with OWASP Top-10 mapping
- [ ] WIF configured — no service account JSON keys in repo or env

## Axis 3: Efficiency

Check:
- [ ] Gemini Flash used for all hot-path agents (verify in `services/agents/`)
- [ ] Gemini Pro only for Coach Agent (batch, weekly)
- [ ] Emissions engine: no LLM calls in `calculate_co2e()` — pure Python math
- [ ] Redis cache: emission factors loaded on startup
- [ ] Semantic cache: image hash → cached classification (check gateway handler)
- [ ] Gemini context cache: Coach system prompt cached
- [ ] SSE streaming implemented for all agent responses
- [ ] Lighthouse CI: run `npm run lighthouse` — all scores ≥95
- [ ] Initial JS bundle <150KB: run `npm run build` and check bundle analyzer output
- [ ] Cloud Run cold start <2s: check `/docs/performance.md` or timing records

## Axis 4: Testing

Check:
- [ ] Coverage: `npm run test:coverage` — frontend ≥85%
- [ ] Coverage: `pytest --cov services/ --cov-fail-under=85`
- [ ] Emissions engine: 100% coverage
- [ ] Golden-file cassettes for all agent tests — no live Gemini calls in CI
- [ ] Hypothesis tests for emissions math
- [ ] Eval suite: `npm run evals` runs and produces results in `evals/results/`
- [ ] Eval accuracy: ≥90% item identification on labeled fixtures
- [ ] Playwright E2E: keyboard-only journey test passes
- [ ] axe-core: `npm run accessibility-audit` — zero violations

## Axis 5: Accessibility

Check:
- [ ] axe-core CI gate: zero violations (run `npm run accessibility-audit`)
- [ ] `eslint-plugin-jsx-a11y` zero warnings
- [ ] Globe has 2D fallback (chart + data table) for `prefers-reduced-motion`
- [ ] Parallel-You Simulator has 2D fallback
- [ ] All Framer Motion animations gated behind `prefers-reduced-motion` check
- [ ] Full keyboard navigation verified (Tab through all interactive elements)
- [ ] Visible focus indicators on all focusable elements
- [ ] ARIA live regions on streaming AI responses and globe updates
- [ ] `docs/a11y.md` exists with NVDA manual test findings
- [ ] Timeline scrubber supports arrow-key controls
- [ ] All images have `alt` text; decorative images have `alt=""`
- [ ] Heading hierarchy is logical (no skipped levels)
- [ ] Color contrast ≥4.5:1 for all text

## Final Submission

After all axes pass:
- [ ] Live Cloud Run URL accessible and demo flow works end-to-end
- [ ] README has the live URL and demo GIF
- [ ] `docs/judge-checklist.md` is filled in with evidence (badge URLs, CI run links)
- [ ] 90-second demo video recorded
- [ ] Submission form completed

Print a final score: X/5 axes fully passing, with specific failing items listed.
