#!/usr/bin/env bash
# Usage: ./deploy.sh
# Builds the Angular app + dashboard-api and ships static files to the VPS.
#
# Auth lives at Caddy (basic_auth on jimbo.fourfoldmedia.uk gating the
# static dashboard + /dashboard-api/*), so the bundle has no secrets to
# substitute and no per-environment build. Same artifact in dev and prod.
# This script and .github/workflows/deploy.yml produce identical output.

set -euo pipefail

VPS_HOST="vps"
VPS_DIR="/home/jimbo/dashboard"
VPS_API_DIR="/home/jimbo/dashboard-api"
VPS_POMO_DIR="/home/jimbo/pomo"
ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$ROOT/dist/dashboard/browser"
API_DIST_DIR="$ROOT/dist-api"
POMO_DIR="$ROOT/pomo-app"
POMO_DIST_DIR="$POMO_DIR/dist"

echo "Building…"
npx ng build

echo "Building dashboard API…"
npx tsc -p tsconfig.api.json

echo "Building pomo standalone…"
(cd "$POMO_DIR" && npm install --prefer-offline --silent && npm run build)

echo "Syncing to ${VPS_HOST}:${VPS_DIR}…"
ssh "$VPS_HOST" "mkdir -p $VPS_DIR"
rsync -a --delete "$DIST_DIR/" "$VPS_HOST:$VPS_DIR/"

echo "Syncing dashboard API to ${VPS_HOST}:${VPS_API_DIR}…"
ssh "$VPS_HOST" "mkdir -p $VPS_API_DIR/dist-api"
rsync -a --delete "$API_DIST_DIR/" "$VPS_HOST:$VPS_API_DIR/dist-api/"

echo "Syncing pomo standalone to ${VPS_HOST}:${VPS_POMO_DIR}…"
ssh "$VPS_HOST" "mkdir -p $VPS_POMO_DIR"
rsync -a --delete "$POMO_DIST_DIR/" "$VPS_HOST:$VPS_POMO_DIR/"

echo "Restarting dashboard-api.service…"
ssh "$VPS_HOST" "sudo systemctl restart dashboard-api.service"

echo "Done — https://jimbo.fourfoldmedia.uk"
