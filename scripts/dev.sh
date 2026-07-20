#!/usr/bin/env bash
# Dev launcher — runs ng serve with the production proxy config.
#
# Auth is app-level everywhere now: proxy.conf.js sends X-API-Key
# (JIMBO_API_KEY from .env) and jimbo-api validates it on /api/* and
# /stream/* alike. The old step that fetched DASHBOARD_BASIC_AUTH from the
# VPS is gone — Caddy no longer basic_auths /stream (its stored hash had
# drifted from the env credential anyway, so edge auth 401'd the stream).
#
# You ARE talking to PRODUCTION data over HTTP. The dashboard is a
# sole-operator tool; this is the same blast radius as the deployed UI.

set -euo pipefail

echo "Starting ng serve (proxy targets https://jimbo.fourfoldmedia.uk)…"
exec npx ng serve "$@"
