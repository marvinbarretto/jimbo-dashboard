#!/usr/bin/env bash
# Usage: ./deploy.sh
# Builds the Angular app and deploys static files to the VPS.

set -euo pipefail

VPS_HOST="vps"
VPS_DIR="/home/jimbo/dashboard"
DIST_DIR="$(cd "$(dirname "$0")" && pwd)/dist/dashboard/browser"

echo "Building…"
npx ng build

echo "Syncing to ${VPS_HOST}:${VPS_DIR}…"
ssh "$VPS_HOST" "mkdir -p $VPS_DIR"
rsync -a --delete "$DIST_DIR/" "$VPS_HOST:$VPS_DIR/"

echo "Done — https://jimbo.fourfoldmedia.uk"
