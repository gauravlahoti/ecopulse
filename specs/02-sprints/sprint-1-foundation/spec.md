# Sprint 1 — Foundation, CI/CD & Cloud Run Scaffolding

**Epic:** "Deployable from hour one."
**Duration:** Days 1–2
**Status:** ⬜ Not started
**Depends on:** nothing (first sprint)

## Goal

A public GitHub monorepo that builds, tests, and deploys two placeholder services (frontend + gateway) to Cloud Run on every merge to `main` — with security, testing, and a11y gates active before any feature code exists.

## User stories

- As a developer, I can clone the repo and run the full stack locally with `docker compose up` in <5 minutes.
- As a developer, every push runs lint → typecheck → test → build → deploy automatically.
- As a judge, I can find the architecture, setup instructions, and live URL in the README within 30 seconds.

## Tasks

### Repo & structure
- [ ] Create public GitHub repo, monorepo layout per `01-architecture/system-architecture.md`.
- [ ] README: architecture diagram (Mermaid), setup-in-3-commands, demo GIF placeholder, badges (CI, coverage).
- [ ] CODEOWNERS, PR template, conventional-commit enforcement (commitlint).

### Dockerization
- [ ] Multi-stage Dockerfiles for `frontend` and `gateway` — distroless final images, non-root `USER`.
- [ ] `.dockerignore` per service; final images <100MB.
- [ ] `docker-compose.yml` for local dev including Firestore emulator.

### CI/CD (GitHub Actions)
- [ ] Pipeline: lint (ESLint/Ruff) → typecheck (tsc/mypy strict) → test → build → deploy.
- [ ] Deploy to Cloud Run via **Workload Identity Federation** — no SA JSON keys in GitHub secrets.
- [ ] Coverage gate ≥85%; coverage badge in README.

### Testing harnesses (before features!)
- [ ] Vitest + React Testing Library configured in `frontend` with one passing smoke test.
- [ ] pytest + coverage configured in `gateway` with one passing smoke test.
- [ ] Playwright scaffold with one E2E smoke test against local compose stack.

### Security baseline
- [ ] Secret Manager wired into gateway config loading; zero secrets in code or `.env` committed files.
- [ ] `pre-commit` with gitleaks; gitleaks also as a CI gate.
- [ ] Dependabot enabled.
- [ ] Security headers middleware in gateway (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- [ ] eslint-plugin-jsx-a11y + axe-core wired into frontend CI.

## Acceptance criteria

- [ ] `docker compose up` boots frontend + gateway + Firestore emulator locally.
- [ ] Merge to `main` deploys both services to Cloud Run; live URLs in README.
- [ ] CI fails on: lint error, type error, test failure, coverage <85%, leaked secret, axe violation.
- [ ] `git log` shows conventional commits only.
- [ ] No service-account key files anywhere in repo or GitHub secrets.

## Judge-criteria mapping

| Criterion | How this sprint satisfies it |
|---|---|
| Quality | Monorepo conventions, CODEOWNERS, conventional commits from commit #1 |
| Security | Secrets/WIF/gitleaks before any feature code |
| Efficiency | Distroless images <100MB, cold start <2s |
| Testing | Harnesses exist before features; CI blocks on coverage |
| Accessibility | jsx-a11y + axe-core gates from day one |
