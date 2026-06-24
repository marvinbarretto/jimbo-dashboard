#!/usr/bin/env bash
# Scheduled manifest sweep — run by the launchd agent every 72h (see
# scripts/launchd/uk.fourfoldmedia.jimbo.manifest-sync.plist).
#
# Drives from GET /api/projects, reads each project's in-repo manifest, and
# mirrors operating fields + per-repo cards into jimbo_pg. Safe to run live on a
# schedule: repo-synced fields are read-only in the dashboard (M2), so the sweep
# never fights a human edit; it only re-asserts repo truth and picks up newly
# added manifests. Idempotent — a no-change sweep patches nothing.
set -euo pipefail

cd "$(dirname "$0")/.."
LOG="${MANIFEST_SYNC_LOG:-$HOME/Library/Logs/jimbo-manifest-sync.log}"
mkdir -p "$(dirname "$LOG")"

{
  echo "──────── $(date '+%Y-%m-%d %H:%M:%S %Z') ────────"
  npm run manifests:sync:live --silent
  echo
} >> "$LOG" 2>&1
