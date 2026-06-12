#!/usr/bin/env bash
# Deploy all EcoPulse services to Cloud Run.
# Requires: gcloud CLI authenticated with appropriate permissions, plus the adk CLI
# (`pip install google-adk`) for the agents service.
# Usage: bash infra/gcloud_deploy.sh [agents|gateway|frontend|all]

set -euo pipefail

SERVICE="${1:-all}"
REGION="${CLOUD_RUN_REGION:-us-central1}"
PROJECT_ID="${GCP_PROJECT_ID:?GCP_PROJECT_ID env var is required}"
AGENTS_SERVICE_NAME="ecopulse-agents"
AGENTS_APP_NAME="ecopulse_agents"
# Secret Manager reference for the Google AI Studio key powering the agents.
GOOGLE_API_KEY_SECRET="${GOOGLE_API_KEY_SECRET:-google-api-key}"

deploy_agents() {
  echo "→ Deploying ADK agents (Gemini 2.5 Flash / Flash-Lite)..."
  # Scaffold/build/deploy the ADK app with the adk CLI.
  adk deploy cloud_run \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --service_name="$AGENTS_SERVICE_NAME" \
    --app_name="$AGENTS_APP_NAME" \
    --with_ui \
    services/agents/ecopulse_agents

  echo "→ Wiring Secret Manager key + AI Studio mode (no hardcoded secrets)..."
  gcloud run services update "$AGENTS_SERVICE_NAME" \
    --region="$REGION" --project="$PROJECT_ID" \
    --update-secrets="GOOGLE_API_KEY=${GOOGLE_API_KEY_SECRET}:latest" \
    --set-env-vars="GOOGLE_GENAI_USE_VERTEXAI=FALSE"

  # Public ingress so the website backend can reach it.
  gcloud run services update "$AGENTS_SERVICE_NAME" \
    --region="$REGION" --project="$PROJECT_ID" --allow-unauthenticated
  echo "✓ Agents deployed"
}

deploy_gateway() {
  echo "→ Deploying gateway..."
  gcloud run deploy ecopulse-gateway \
    --source ./services/gateway \
    --region "$REGION" \
    --no-allow-unauthenticated \
    --min-instances 1 \
    --max-instances 10 \
    --memory 512Mi \
    --cpu 1 \
    --concurrency 80 \
    --project "$PROJECT_ID"
  echo "✓ Gateway deployed"
}

deploy_frontend() {
  echo "→ Fetching gateway + agents URLs..."
  GATEWAY_URL=$(gcloud run services describe ecopulse-gateway \
    --region "$REGION" \
    --format 'value(status.url)' \
    --project "$PROJECT_ID" 2>/dev/null || echo "")
  AGENTS_URL=$(gcloud run services describe "$AGENTS_SERVICE_NAME" \
    --region "$REGION" \
    --format 'value(status.url)' \
    --project "$PROJECT_ID")

  echo "→ Deploying frontend (wired to ADK agents at ${AGENTS_URL})..."
  gcloud run deploy ecopulse-frontend \
    --source ./frontend \
    --region "$REGION" \
    --allow-unauthenticated \
    --min-instances 1 \
    --max-instances 20 \
    --memory 1Gi \
    --cpu 1 \
    --concurrency 80 \
    --set-env-vars "NEXT_PUBLIC_GATEWAY_URL=${GATEWAY_URL},AGENTS_SERVICE_URL=${AGENTS_URL},AGENTS_APP_NAME=${AGENTS_APP_NAME},NEXT_PUBLIC_USE_LIVE_BACKEND=true" \
    --project "$PROJECT_ID"
  echo "✓ Frontend deployed"
}

verify() {
  echo "→ Verifying deployments..."
  FRONTEND_URL=$(gcloud run services describe ecopulse-frontend \
    --region "$REGION" --format 'value(status.url)' --project "$PROJECT_ID")
  GATEWAY_URL=$(gcloud run services describe ecopulse-gateway \
    --region "$REGION" --format 'value(status.url)' --project "$PROJECT_ID")

  curl -fsS "${GATEWAY_URL}/health" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='ok'"
  echo "✓ Gateway health OK: ${GATEWAY_URL}"
  echo "✓ Frontend URL: ${FRONTEND_URL}"
}

verify_agents() {
  AGENTS_URL=$(gcloud run services describe "$AGENTS_SERVICE_NAME" \
    --region "$REGION" --format 'value(status.url)' --project "$PROJECT_ID")
  echo "→ Verifying agents at ${AGENTS_URL} ..."
  curl -fsS "${AGENTS_URL}/list-apps" && echo "" && echo "✓ Agents reachable: ${AGENTS_URL}"
}

case "$SERVICE" in
  agents)    deploy_agents && verify_agents ;;
  gateway)   deploy_gateway ;;
  frontend)  deploy_frontend ;;
  all)       deploy_agents && verify_agents && deploy_frontend ;;
  *)         echo "Usage: $0 [agents|gateway|frontend|all]"; exit 1 ;;
esac
