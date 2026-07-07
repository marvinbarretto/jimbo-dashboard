---
module: fleet
repo: dashboard
description: Read-only fleet observability board — worker heartbeats, dispatch queue depth per executor, trailing-5h token burn, recent completions, and fold cadence, polled every 30s.
source_paths:
  - src/app/features/fleet/**
generated_at: 2026-07-07
reviewed_commit: "1688511"
sections:
  purpose: asserted
  responsibilities: asserted
  public-api: derived
  lifecycle: derived
  dependencies: derived
  tech-debt: asserted
---

# fleet

## Purpose

Marvin's agent fleet (Boris on the M2, Kipper on the M4 laptop, Hermes on the
VPS) runs unattended — the failure mode this board exists to close is
*silence*: a worker that stopped polling, a recurring fold whose Hermes-side
transport broke, a queue quietly backing up. Built as boris-v2 slice 6, it is
a pure observability surface: one page showing whether the workers are alive,
what's queued per lane, what they finished recently (with model + token
telemetry), and what the trailing 5 hours cost. It also folds in a Hermes
summary so a single page carries the whole division of labour.

## Responsibilities

- `FleetService`: polls the dispatch stats aggregate every 30s
  (`setInterval`, idempotent `start()`, teardown via the consumer's
  `DestroyRef`), Zod-validates the payload (`ApiFleetStatsSchema`) and
  exposes slice signals: `queue`, `workers`, `recent`, `burn` (5h), `folds`,
  plus `loading`/`lastError`/`lastFetch`.
- `FleetBoard` + the exported `heartbeatTone()` function: classifies each
  worker's heartbeat as live/quiet/stale/unknown with per-temperament
  thresholds (Boris: always-on daemon, silence past minutes is an alert;
  Kipper: naps by design, amber is informational for up to a day), with
  special cases for declared `cooldown` windows (quota throttle + grace) and
  `executing` (one heartbeat at claim, then legitimately silent up to the
  65-minute skill-timeout window). Tones are recomputed on every poll via a
  `lastFetch`-keyed computed, so a silent worker drifts live → quiet → stale
  without a reload.
- Derived views: queue lanes grouped per executor with
  approved/running/proposed counts, total queued, burn totals
  (turns/output-tokens/estimated-cost — worker-recorded turns only, "a
  floor"), fold staleness (>3 days without an enqueue = broken transport,
  flagged fail-closed), and cost/token formatting helpers.
- Does NOT own any mutation — there is no write path in the feature — and
  does not own dispatch rows (execution feature) or the Hermes control room
  (`/hermes` has the full version; this page only summarises it).

## Public API

Route (registered directly in `app.routes.ts`, no feature routes file):

- `/fleet` → `FleetBoard` (title "Fleet")

Exports: `FleetService` and the pure `heartbeatTone(worker, nowMs)` +
`HeartbeatTone` type. Nothing else in the app imports them today.

## Lifecycle

Lazy `loadComponent` at `/fleet`; no guards. The board's constructor calls
`service.start()`, which fires an immediate refresh then polls every 30s;
`start()` registers `stop()` on the injecting context's `DestroyRef`, so
polling stops when the board is destroyed and resumes on next visit. A manual
refresh control re-runs `refresh()` on demand. Poll errors set `lastError`
(rendered on the page) without clearing the last good stats.

## Dependencies

- **jimbo-api**: `GET /api/dispatch/stats` (via
  `environment.dashboardApiUrl`) — the single endpoint; shape validated
  against `ApiFleetStatsSchema`.
- **Domain**: `@domain/dispatch` (`ApiFleetStats`, `FleetWorker`).
- **Other features**: hermes (`HermesService` injected to summarise the VPS
  lane on the same page).
- **Shared**: ui primitives (stack, cluster, page-header, card, badge,
  empty-state, stat-card, refresh-control), `JobChip`, `RelativeTimePipe`,
  `ToastService`.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — Zero test files in the feature, despite `heartbeatTone`
  being an exported pure function with five documented regimes (cooldown
  grace, executing window, per-worker thresholds, unknown) that is exactly
  the shape unit tests are cheapest for.
- `2026-07-07` — Worker temperaments are hardcoded by name: `FRESH_MS` keys
  `boris`/`kipper` with magic thresholds in the component; a new worker
  silently gets `DEFAULT_FRESH`, and threshold changes require a code deploy
  (per the repo's structure-vs-data rule this is per-entity data).
- `2026-07-07` — Fold staleness (`FOLD_STALE_MS` = 3 days) is calibrated to
  "the only live fold (travel-research) recurs every 2 days" (in-code
  comment) — a single-fold assumption applied to all folds.
- `2026-07-07` — `EXECUTING_WINDOW_MS` (65 min) mirrors "the longest skill
  timeout (60min) + margin" by hand; nothing ties it to the server-side
  timeout it approximates.
- `2026-07-07` — `FleetService` is `providedIn: 'root'` but its polling
  lifetime is bound to whichever component first calls `start()` (that
  caller's `DestroyRef`) — a second concurrent consumer would share the
  first's teardown semantics.
