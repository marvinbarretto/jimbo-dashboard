#!/usr/bin/env bash
# Usage: ./deploy.sh
# Builds the Angular app and ships static files to the VPS.
# The dashboard-api BFF has been removed — jimbo-api is now the sole API.

set -euo pipefail

VPS_HOST="vps"
VPS_DIR="/home/jimbo/dashboard"
VPS_POMO_DIR="/home/jimbo/pomo"
ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$ROOT/dist/dashboard/browser"
POMO_DIR="$ROOT/pomo-app"
POMO_DIST_DIR="$POMO_DIR/dist"

echo "Building…"
npx ng build

echo "Building pomo standalone…"
(cd "$POMO_DIR" && npm install --prefer-offline --silent && npm run build)

echo "Syncing to ${VPS_HOST}:${VPS_DIR}…"
ssh "$VPS_HOST" "mkdir -p $VPS_DIR"
rsync -a --delete "$DIST_DIR/" "$VPS_HOST:$VPS_DIR/"

echo "Syncing pomo standalone to ${VPS_HOST}:${VPS_POMO_DIR}…"
ssh "$VPS_HOST" "mkdir -p $VPS_POMO_DIR"
rsync -a --delete "$POMO_DIST_DIR/" "$VPS_HOST:$VPS_POMO_DIR/"

echo "Done — https://jimbo.fourfoldmedia.uk"
