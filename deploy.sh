#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="oversite-demo"
PROJECT_ID="oversite-490604"
REGION="us-west1"
MAPBOX_SECRET_NAME="mapbox-public-token"
MAPBOX_SECRET_VERSION="1"

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
PORT=8080 HOST=0.0.0.0 PUBLIC_MAPBOX_TOKEN=smoke-test-token node build &
pid=$!
sleep 1
kill $pid || true

echo "Deploying to Cloud Run..."
gcloud config set project "$PROJECT_ID"
gcloud run deploy "$SERVICE_NAME" \
  --source deploy \
  --region="$REGION" \
  --allow-unauthenticated \
  --set-build-env-vars "GOOGLE_NODE_RUN_SCRIPTS=" \
  --set-env-vars "HOST=0.0.0.0" \
  --update-secrets "PUBLIC_MAPBOX_TOKEN=${MAPBOX_SECRET_NAME}:${MAPBOX_SECRET_VERSION}" \
  --memory=2Gi

rm -rf deploy
echo "Done."
