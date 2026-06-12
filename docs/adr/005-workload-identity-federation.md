# ADR 005 — Workload Identity Federation (No SA Keys)

**Date:** 2026-06-12
**Status:** Accepted

## Context

CI/CD requires credentials to deploy to Cloud Run and access GCP services. The traditional approach (service account JSON key in GitHub Secrets) creates a long-lived credential that is a security liability.

## Decision

Use **Workload Identity Federation** (WIF) to allow GitHub Actions to authenticate to GCP without any service account keys.

## Rationale

- No long-lived credentials: WIF uses short-lived OIDC tokens
- gitleaks can never find a SA key because none exists
- Follows Google's recommended practice for GitHub Actions → GCP
- Satisfies the hackathon's Security judge axis: "no SA key files anywhere in repo or GitHub Secrets"

## Setup

```bash
gcloud iam workload-identity-pools create github-pool \
  --project=$PROJECT_ID --location=global

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=$PROJECT_ID --location=global \
  --workload-identity-pool=github-pool \
  --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"
```

GitHub Actions secrets needed: `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `GCP_PROJECT_ID` (no JSON key).

## Consequences

- Slightly more complex initial setup vs. SA key (one-time cost)
- Tokens expire automatically — no rotation needed
- Deployments are scoped to specific repository and branch
