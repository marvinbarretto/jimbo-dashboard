#!/usr/bin/env bash
# Usage: ./deploy.sh
# Builds the Angular app and deploys static files to the VPS.

set -euo pipefail

VPS_HOST="vps"
VPS_DIR="/home/jimbo/dashboard"
VPS_API_DIR="/home/jimbo/dashboard-api"
DIST_DIR="$(cd "$(dirname "$0")" && pwd)/dist/dashboard/browser"
API_DIST_DIR="$(cd "$(dirname "$0")" && pwd)/dist-api"

echo "Fetching DASHBOARD_API_KEY from ${VPS_HOST}:/opt/dashboard-api.env…"
# Read the canonical key from the production env file via sudo so it never
# lands in a local file or git. environment.prod.ts ships with a placeholder
# that this script substitutes into the built bundle.
DASHBOARD_API_KEY=$(ssh "$VPS_HOST" "sudo grep '^DASHBOARD_API_KEY=' /opt/dashboard-api.env | cut -d= -f2-")
if [[ -z "${DASHBOARD_API_KEY:-}" ]]; then
  echo "ERROR: DASHBOARD_API_KEY not found in /opt/dashboard-api.env on $VPS_HOST" >&2
  exit 1
fi

echo "Building…"
npx ng build

echo "Building dashboard API…"
npx tsc -p tsconfig.api.json

echo "Substituting DASHBOARD_API_KEY into bundle…"
# Angular emits hashed JS bundles; replace the placeholder anywhere it appears.
# macOS sed wants an empty arg to -i; this works on both BSD and GNU sed via -i.bak then cleanup.
find "$DIST_DIR" -name "*.js" -type f -exec sed -i.bak "s|__DASHBOARD_API_KEY__|${DASHBOARD_API_KEY}|g" {} +
find "$DIST_DIR" -name "*.js.bak" -delete

if grep -rq "__DASHBOARD_API_KEY__" "$DIST_DIR"; then
  echo "ERROR: placeholder still present after substitution" >&2
  exit 1
fi

echo "Syncing to ${VPS_HOST}:${VPS_DIR}…"
ssh "$VPS_HOST" "mkdir -p $VPS_DIR"
rsync -a --delete "$DIST_DIR/" "$VPS_HOST:$VPS_DIR/"

echo "Syncing dashboard API to ${VPS_HOST}:${VPS_API_DIR}…"
ssh "$VPS_HOST" "mkdir -p $VPS_API_DIR/dist-api"
rsync -a --delete "$API_DIST_DIR/" "$VPS_HOST:$VPS_API_DIR/dist-api/"

# Restart the API service so its in-process env always matches the key baked
# into the bundle we just deployed. Without this, a reboot or crash-restart
# between deploys can load a stale env and produce 401s.
echo "Restarting dashboard-api.service…"
ssh "$VPS_HOST" "sudo systemctl restart dashboard-api.service"

echo "Done — https://jimbo.fourfoldmedia.uk"
