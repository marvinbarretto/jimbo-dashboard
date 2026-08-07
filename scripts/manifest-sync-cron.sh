#!/usr/bin/env bash
# Scheduled manifest sweep — run by the launchd agent every 72h (see
# scripts/launchd/com.jimbo.manifest-sync.plist).
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

# ── node/npm on PATH ────────────────────────────────────────────────────────
# launchd runs this via `zsh -lc`: a LOGIN shell, which is not an INTERACTIVE
# one, so ~/.zshrc is never sourced — and ~/.zshrc is where fnm is initialised.
# The result was `npm: command not found`, exit 127, on every run from
# 2026-07-02 to 2026-08-07. Ten silent failures.
#
# Resolved from fnm's `default` alias, not from a multishell path: fnm mints
# ~/.local/state/fnm_multishells/<pid>_<ts>/bin per shell session, so anything
# captured from an interactive shell is dead by the next login. The alias
# symlink follows whatever `fnm default` points at, so a node upgrade doesn't
# silently break the sweep again.
FNM_DEFAULT_BIN="${FNM_DEFAULT_BIN:-$HOME/.local/share/fnm/aliases/default/bin}"
[ -d "$FNM_DEFAULT_BIN" ] && PATH="$FNM_DEFAULT_BIN:$PATH"
export PATH

# ── healthchecks.io ─────────────────────────────────────────────────────────
# Dead man's switch. Chosen over a self-reported heartbeat because it also
# catches "the job never ran at all" — the failure mode a heartbeat written BY
# the job can never report. No-ops when unset, so this is safe before the check
# exists. Set MANIFEST_SYNC_HC_URL to the ping URL (no trailing slash).
HC="${MANIFEST_SYNC_HC_URL:-}"
hc_ping() {  # $1 = "" | /start | /fail ; $2 = optional exit code
  [ -n "$HC" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null "${HC}${1}${2:+/}${2:-}" || true
}

finish() {
  local code=$?
  if [ "$code" -eq 0 ]; then hc_ping; else hc_ping /fail; fi
  exit "$code"
}
trap finish EXIT

{
  echo "──────── $(date '+%Y-%m-%d %H:%M:%S %Z') ────────"

  # Fail fast and legibly rather than letting the npm line 127 into the void.
  if ! command -v npm >/dev/null 2>&1; then
    echo "✗ npm not on PATH (looked in ${FNM_DEFAULT_BIN}). Sweep aborted."
    exit 127
  fi
  echo "node $(node --version) · npm $(npm --version)"

  npm run manifests:sync:live --silent
  echo
} >> "$LOG" 2>&1
