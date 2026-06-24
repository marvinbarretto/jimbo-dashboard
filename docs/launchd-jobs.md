# launchd jobs — inventory

> Catalogue of the user launchd agents on Marvin's Mac (`~/Library/LaunchAgents/`).
> One place to see what's scheduled, where it logs, and where its source lives.
> Apple system agents (`com.apple.*`) and third-party updaters (Google) are omitted.

Last surveyed: 2026-06-24.

## Jobs

| Label | Runs | Cadence | Log | Source plist | Status |
|---|---|---|---|---|---|
| `com.jimbo.manifest-sync` | `dashboard/scripts/manifest-sync-cron.sh` (sweep project manifests → jimbo_pg) | every 72h | `~/Library/Logs/jimbo-manifest-sync.log` | ✅ `dashboard/scripts/launchd/` | ✓ 0 |
| `com.hermes.cron-snapshot` | `hub/hermes/cron/snapshot.sh` (VPS→local snapshot) | hourly (`RunAtLoad`) | `hub/hermes/cron/snapshot.log` | `hub/hermes/cron/` (verify tracked) | ✓ 0 |
| `com.ralph.email` | `ralph.py start --job email` | hourly | `ralph/logs/launchd-email.log` | `ralph/` (verify tracked) | ✓ 0 |
| `com.ralph.vault-groom` | `ralph.py start --job vault-groom` | hourly (`RunAtLoad`) | `ralph/logs/launchd-vault-groom.log` | `ralph/` (verify tracked) | ✗ **1** |
| `com.openclaw.sift-cron` | `openclaw/scripts/sift-cron.sh` | daily 04:00 | `openclaw/data/sift-cron-{stdout,stderr}.log` | `openclaw/scripts/` (verify tracked) | ✗ **78** |
| `com.marvin.opus-briefing.morning` | `openclaw/scripts/opus-briefing.sh morning` | daily 06:35 | `/tmp/opus-briefing-morning.log` | `openclaw/scripts/` (verify tracked) | ✗ **78** |
| `com.marvin.opus-briefing.afternoon` | `openclaw/scripts/opus-briefing.sh afternoon` | daily 14:35 | `/tmp/opus-briefing-afternoon.log` | `openclaw/scripts/` (verify tracked) | ✗ **78** |

**Status** = last exit code from `launchctl list` (0 = OK; non-zero = last run failed).
Four jobs are currently red — see *Needs attention* below.

## Conventions

1. **Naming:** `com.<owner>.<job>` reverse-DNS. Owners: `jimbo`, `hermes`, `ralph`,
   `openclaw`, `marvin` (operator-personal). Lets you filter:
   `launchctl list | grep -vE '^-?\s*\d*\s*com\.apple'`.
2. **Version-control the plist** in the owning repo (e.g. `com.jimbo.manifest-sync`
   lives in `dashboard/scripts/launchd/`). `~/Library/LaunchAgents/` is only the
   *install target* — a plist that exists nowhere else is one `rm` from gone.
3. **Logs** go under `~/Library/Logs/` or the owning repo. Avoid `/tmp` (cleared on
   reboot — the opus-briefing jobs lose their history this way).
4. **This doc** is the index. Update it when a job is added, removed, or re-pointed.

## Commands

```bash
# What's loaded (your jobs only)
launchctl list | grep -E 'com\.(jimbo|hermes|ralph|openclaw|marvin)\.'

# Inspect one job's full config
plutil -p ~/Library/LaunchAgents/com.jimbo.manifest-sync.plist

# Install / reload after editing a plist
cp <repo>/.../<label>.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/<label>.plist 2>/dev/null
launchctl load   ~/Library/LaunchAgents/<label>.plist

# Run once now (test) / disable
launchctl start <label>
launchctl unload ~/Library/LaunchAgents/<label>.plist
```

## Needs attention

These exited non-zero on their last run (surfaced 2026-06-24) — investigate via
their logs:

- `com.openclaw.sift-cron` — **78** (often a config/exec error). Log: `openclaw/data/sift-cron-stderr.log`
- `com.marvin.opus-briefing.morning` / `.afternoon` — **78**. Logs in `/tmp` (may be gone after reboot).
- `com.ralph.vault-groom` — **1**. Log: `ralph/logs/launchd-vault-groom.log`

For each: confirm the source plist is committed in its repo, then move its log out
of `/tmp` if applicable.
