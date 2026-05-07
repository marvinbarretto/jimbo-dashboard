#!/usr/bin/env bash
# Usage: ./deploy.sh
# Builds the Angular app and ships static files to the VPS.
# /pomo is now served by the Angular SPA — pomo-app is retired.

set -euo pipefail

VPS_HOST="vps"
VPS_DIR="/home/jimbo/dashboard"
CADDY_SRC="$(cd "$(dirname "$0")/.." && pwd)/jimbo-api/Caddyfile"
ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$ROOT/dist/dashboard/browser"

echo "Building Angular app…"
npx ng build

echo "Syncing dashboard to ${VPS_HOST}:${VPS_DIR}…"
ssh "$VPS_HOST" "mkdir -p $VPS_DIR"
rsync -a --delete "$DIST_DIR/" "$VPS_HOST:$VPS_DIR/"

echo "Deploying Caddyfile…"
rsync -a "$CADDY_SRC" "$VPS_HOST:/etc/caddy/Caddyfile"
ssh "$VPS_HOST" "sudo systemctl reload caddy"

echo "Done — https://jimbo.fourfoldmedia.uk"
