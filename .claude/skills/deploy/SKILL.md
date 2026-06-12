---
name: deploy
description: Deploy EcoPulse services to Cloud Run. Pass a service name (frontend, gateway, agents, worker, all) or leave empty for all. Example: /deploy frontend
disable-model-invocation: true
---

# Deploy Skill

Deploys EcoPulse services to Google Cloud Run. Target service is $ARGUMENTS (default: all).

## Pre-Deploy Safety Checks

Before deploying ANYTHING, verify:

1. **No secrets in code**: `git diff HEAD --name-only | xargs gitleaks detect --source .` — abort if any found
2. **Tests pass**: `npm run test && pytest services/` — abort if failing
3. **Type-check**: `npm run type-check && mypy --strict services/` — abort if failing
4. **Build succeeds locally**: `docker compose build` — abort if failing

If any check fails, report the failure and stop. Do not deploy broken code.

## Service Deployment Order

Deploy in this order (dependencies first):
1. `gateway` — FastAPI API gateway
2. `agents` — ADK agent service
3. `worker` — insights worker (Cloud Run Jobs)
4. `frontend` — Next.js app (depends on gateway URL)

## Deploy Commands

```bash
# Set these from Secret Manager / CI environment
PROJECT_ID=$(gcloud config get-value project)
REGION=us-central1

# Gateway
gcloud run deploy ecopulse-gateway \
  --source services/gateway \
  --region $REGION \
  --no-allow-unauthenticated \
  --service-account ecopulse-gateway-sa@${PROJECT_ID}.iam.gserviceaccount.com

# Agents
gcloud run deploy ecopulse-agents \
  --source services/agents \
  --region $REGION \
  --no-allow-unauthenticated \
  --service-account ecopulse-agents-sa@${PROJECT_ID}.iam.gserviceaccount.com

# Frontend (public-facing)
GATEWAY_URL=$(gcloud run services describe ecopulse-gateway --region $REGION --format 'value(status.url)')
gcloud run deploy ecopulse-frontend \
  --source frontend \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_GATEWAY_URL=$GATEWAY_URL

# Insights Worker (Cloud Run Job)
gcloud run jobs deploy ecopulse-insights-worker \
  --source services/insights-worker \
  --region $REGION \
  --service-account ecopulse-worker-sa@${PROJECT_ID}.iam.gserviceaccount.com
```

## Post-Deploy Verification

After deploying, run:
1. `curl -f <FRONTEND_URL>/api/health` — verify frontend responds
2. `curl -f <GATEWAY_URL>/health` — verify gateway responds
3. Open `<FRONTEND_URL>` in a browser and confirm the globe loads
4. Run the Snap-to-Carbon demo path to verify agents are connected

Report the live URL for the submission README.

## Rollback

If post-deploy verification fails:
```bash
gcloud run services update-traffic ecopulse-frontend --to-revisions=PREVIOUS=100
gcloud run services update-traffic ecopulse-gateway --to-revisions=PREVIOUS=100
```
