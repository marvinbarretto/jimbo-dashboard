#!/usr/bin/env bash
# Dev launcher. Fetches DASHBOARD_API_KEY from the VPS, then runs ng serve.
# proxy.conf.js injects the key as X-API-Key on /dashboard-api/* requests.
#
# You ARE talking to PRODUCTION data. The dashboard is a sole-operator tool;
# this is the same blast radius as the deployed UI.

set -euo pipefail

VPS_HOST="vps"

echo "Fetching DASHBOARD_API_KEY from ${VPS_HOST}…"
KEY=$(ssh "$VPS_HOST" "sudo grep '^DASHBOARD_API_KEY=' /opt/dashboard-api.env | cut -d= -f2-")
if [[ -z "${KEY:-}" ]]; then
  echo "ERROR: DASHBOARD_API_KEY not found in /opt/dashboard-api.env on $VPS_HOST" >&2
  exit 1
fi

export DASHBOARD_API_KEY="$KEY"
echo "Starting ng serve (proxy targets https://jimbo.fourfoldmedia.uk)…"
exec npx ng serve "$@"
