# Sprint 4 — Polish, Optimization & Final Judge Checklist

**Epic:** "Make the judge's job easy."
**Duration:** Day 8
**Status:** ⬜ Not started
**Depends on:** Sprints 1–3 complete

## Goal

Performance-tuned, fully documented, demo-ready submission with every judge-facing artifact committed and verifiable.

## Tasks

### Performance pass
- [ ] Frontend bundle analysis; trim anything pushing initial JS over 150KB.
- [ ] Cloud Run concurrency/min-instance tuning; record p95 latency.
- [ ] p95 latency dashboard screenshot committed to README/docs.

### Documentation
- [ ] Architecture diagram (Mermaid) finalized in README.
- [ ] Auto-generated OpenAPI docs published under `/docs`.
- [ ] 5–6 short ADRs in `/docs/adr/` (decisions listed in `01-architecture/system-architecture.md`).
- [ ] Demo script + 90-second video recorded and linked.

### Final judge checklist — commit as `/docs/judge-checklist.md`
- [ ] ✅ Zero hardcoded secrets (gitleaks CI proof linked).
- [ ] ✅ Coverage ≥85% (badge + CI artifact).
- [ ] ✅ Lighthouse ≥95 / axe zero violations (CI artifacts linked).
- [ ] ✅ OWASP Top-10 mapping table (`/docs/threat-model.md`).
- [ ] ✅ One-command deploy: `gcloud run deploy` scripts in `/infra`.
- [ ] ✅ Live Cloud Run URL in README, verified working from a clean browser.

## Acceptance criteria

- [ ] A stranger can clone, run locally, and deploy to their own GCP project using only the README.
- [ ] Every link in `judge-checklist.md` resolves to a real CI artifact or doc.
- [ ] Demo script rehearsed end-to-end against the live deployment (not localhost).
- [ ] All earlier sprint acceptance criteria still green (no regressions).

## Judge-criteria mapping

This sprint is the meta-sprint: it converts work from Sprints 1–3 into *verifiable evidence* for all five criteria. Judges reward what they can verify in 5 minutes.
