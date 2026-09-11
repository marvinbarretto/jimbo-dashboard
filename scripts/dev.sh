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

# Fail here rather than at the login page.
#
# proxy.conf.js sends X-API-Key from JIMBO_API_KEY. Without it every /api/*
# call 401s, and authRedirectInterceptor turns that 401 into a bounce to
# /auth/login — so a missing key presents as "you are logged out" rather than
# as a missing key. That is a mystifying twenty minutes for anyone who has not
# read the interceptor, and it cost exactly that on 2026-09-11.
#
# dotenv does not override an existing environment variable, so an export in
# your shell wins over .env and both work.
if [ -z "${JIMBO_API_KEY:-}" ] && ! grep -q '^JIMBO_API_KEY=.' .env 2>/dev/null; then
  cat >&2 <<'MSG'
JIMBO_API_KEY is not set, so every /api/* call will 401 and the app will bounce
you to /auth/login. That login page is NOT the problem — the missing key is.

Fix either way:
  export JIMBO_API_KEY=...          # this shell only
  echo "JIMBO_API_KEY=..." >> .env  # persists, and .env is gitignored

The key is the same one jimbo-api validates; it lives in ~/development/jimbo/jimbo-api/.env.local.
MSG
  exit 1
fi

echo "Starting ng serve (proxy targets https://jimbo.fourfoldmedia.uk)…"
exec npx ng serve "$@"
