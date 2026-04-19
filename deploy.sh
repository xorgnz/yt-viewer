#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-yt-viewer}"
PROJECT_ID="${PROJECT_ID:-}"
REGION="us-west1"
DATABASE_URL_SECRET_NAME="${DATABASE_URL_SECRET_NAME:-yt-viewer-database-url}"
DATABASE_URL_SECRET_VERSION="${DATABASE_URL_SECRET_VERSION:-latest}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "PROJECT_ID is required. Set PROJECT_ID=<gcp-project-id> before running deploy.sh." >&2
  exit 1
fi

echo "Building..."
rm -rf build
rm -rf deploy

DEPLOY_COMMIT="$(git rev-parse --short HEAD)"
DEPLOY_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Install + build (SvelteKit SSR should be: svelte-kit build)
npm ci
PUBLIC_DEPLOY_COMMIT="$DEPLOY_COMMIT" \
PUBLIC_DEPLOY_DATE="$DEPLOY_DATE" \
npm run build

# Stage deploy folder
mkdir -p deploy

# Copy runtime artifacts
cp -R build deploy/build

# Copy package manifests
cp package.json deploy/package.json
cp package-lock.json deploy/package-lock.json

# Add git hash (optional)
git rev-parse HEAD > deploy/.githash

# Patch package.json for deploy so it has a start script suitable for Cloud Run buildpacks
# This requires jq; if you don't have it, I can give a sed-only version.
if command -v jq >/dev/null 2>&1; then
  tmp="$(mktemp)"
  jq '.scripts.start = "node build"' deploy/package.json > "$tmp"
  mv "$tmp" deploy/package.json
else
  echo "WARN: jq not found; Cloud Run may not know how to start the service unless package.json already has scripts.start"
fi

echo "Smoke testing..."
PORT=8080 HOST=0.0.0.0 DATABASE_URL="postgres://yt_viewer:yt_viewer_dev@localhost:5432/yt_viewer?sslmode=disable" node build &
pid=$!
sleep 1
if ! kill -0 "$pid" >/dev/null 2>&1; then
  wait "$pid"
  echo "Smoke test process exited early." >&2
  exit 1
fi
kill "$pid" || true

echo "Deploying to Cloud Run..."
gcloud config set project "$PROJECT_ID"
gcloud run deploy "$SERVICE_NAME" \
  --source deploy \
  --region="$REGION" \
  --allow-unauthenticated \
  --set-build-env-vars "GOOGLE_NODE_RUN_SCRIPTS=" \
  --set-env-vars "HOST=0.0.0.0" \
  --update-secrets "DATABASE_URL=${DATABASE_URL_SECRET_NAME}:${DATABASE_URL_SECRET_VERSION}" \
  --port=8080 \
  --memory=2Gi

rm -rf deploy
echo "Done."
