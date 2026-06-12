#!/usr/bin/env bash
# Deploy all EcoPulse services to Cloud Run.
# Requires: gcloud CLI authenticated with appropriate permissions.
# Usage: bash infra/gcloud_deploy.sh [frontend|gateway|all]

set -euo pipefail

SERVICE="${1:-all}"
REGION="${CLOUD_RUN_REGION:-us-central1}"
PROJECT_ID="${GCP_PROJECT_ID:?GCP_PROJECT_ID env var is required}"

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
  echo "→ Fetching gateway URL..."
  GATEWAY_URL=$(gcloud run services describe ecopulse-gateway \
    --region "$REGION" \
    --format 'value(status.url)' \
    --project "$PROJECT_ID")

  echo "→ Deploying frontend..."
  gcloud run deploy ecopulse-frontend \
    --source ./frontend \
    --region "$REGION" \
    --allow-unauthenticated \
    --min-instances 1 \
    --max-instances 20 \
    --memory 1Gi \
    --cpu 1 \
    --concurrency 80 \
    --set-env-vars "NEXT_PUBLIC_GATEWAY_URL=${GATEWAY_URL}" \
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

case "$SERVICE" in
  gateway)   deploy_gateway ;;
  frontend)  deploy_gateway && deploy_frontend ;;
  all)       deploy_gateway && deploy_frontend && verify ;;
  *)         echo "Usage: $0 [frontend|gateway|all]"; exit 1 ;;
esac
