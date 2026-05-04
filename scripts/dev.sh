#!/usr/bin/env bash
# Dev launcher. Fetches the dashboard's basic_auth credential from the VPS,
# then runs ng serve. proxy.conf.js uses it to authenticate with the
# Caddy basic_auth gate on production for /dashboard-api/* HTTP requests.
# WS upgrades go to a local dashboard-api on :3201 (run `npm run api`),
# which has no auth — Caddy is the public entry, not localhost.
#
# You ARE talking to PRODUCTION data over HTTP. The dashboard is a
# sole-operator tool; this is the same blast radius as the deployed UI.

set -euo pipefail

VPS_HOST="vps"

echo "Fetching DASHBOARD_BASIC_AUTH from ${VPS_HOST}…"
CRED=$(ssh "$VPS_HOST" "sudo grep '^DASHBOARD_BASIC_AUTH=' /opt/dashboard-api.env | cut -d= -f2-")
if [[ -z "${CRED:-}" ]]; then
  echo "ERROR: DASHBOARD_BASIC_AUTH not found in /opt/dashboard-api.env on $VPS_HOST" >&2
  echo "Format: user:password (the same credentials Caddy basic_auth was configured with)" >&2
  exit 1
fi

export DASHBOARD_BASIC_AUTH="$CRED"
echo "Starting ng serve (proxy targets https://jimbo.fourfoldmedia.uk)…"
exec npx ng serve "$@"
