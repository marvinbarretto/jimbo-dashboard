---
module: hermes
repo: dashboard
description: Live observability + control surface for Hermes cron jobs — pulse, control room, day timeline, agent-run telemetry, and model-tier preferences.
source_paths:
  - src/app/features/hermes/**
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

# hermes

## Purpose

Hermes is the agent framework running Marvin's scheduled jobs (briefings,
vault scoring, heartbeat nudges) on the VPS. This feature is its cockpit:
see what's scheduled/running/failing at a glance, trigger/pause/edit jobs
without SSH, audit agent-run outcomes and cost, and steer which models the
cheap/balanced/capable tiers resolve to. It exists because the alternative
is tailing PM2 logs — the dashboard turns cron opacity into visual triage.

## Responsibilities

- Poll the Hermes job snapshot every 10s and expose it as signals
  (`HermesService`) — jobs, counts, running/failing/next-firing derivations.
- Job control: trigger now, pause/resume, delete, rename, reschedule, and
  pin a job's model + inference provider (a coupled pair — both or neither).
- Render five views: Pulse (stats + running/failing/recent), Control Room
  (job list + detail panel with inline edits and run-output browser),
  Timeline (today's fire times reconstructed from `next_run_at` + interval),
  Runs (agent-run rollup/tail with green/amber/red health), Model Prefs
  (tier → model mapping plus auxiliary-section grouping).
- Provide telemetry services (`AgentRunsService`, `McpCallsService`) that
  other features (journal) also consume.
- Does NOT own the job registry or scheduler — Hermes on the VPS is
  canonical; jimbo-api proxies reads/writes. Does NOT own the model
  catalogue (models feature).

## Public API

Lazy-loaded at `/hermes` (`hermesRoutes`); `HermesPage` shell with tab bar,
children: `pulse` (default redirect) → `HermesPulse`, `control-room` →
`HermesControlRoom`, `timeline` → `HermesTimeline`, `runs` → `HermesRuns`,
`model-prefs` → `HermesModelPrefs`.

Services (root-provided, used cross-feature):

- `HermesService` — signals `snapshot`, `jobs`, `activeCount`, `pausedCount`,
  `failingCount`, `runningJobs`, `nextFiringJob`, `recentRuns`, `loadError`;
  methods `trigger`, `pause`, `resume`, `remove`, `update`, `getRuns`,
  `getRunOutput`, `getModelPrefs`, `updateModelPrefs`.
- `AgentRunsService` — `rollup`, `tail`, `ratings`, `setRating` (keep/watch/cut).
- `McpCallsService` — `rollup`, `tail`.
- `hermes.utils.ts` — `stateBadgeTone`, `deliverLabel`,
  `extractIntervalMinutes`, `todayFireTimes` (+ re-exported datetime utils).
- `hermes.types.ts` — `HermesJob`, `HermesRun(Output)`, `HermesSnapshot`,
  `HermesModelPrefs` interfaces.

## Lifecycle

Registered in `app.routes.ts` via `loadChildren`, no guards. `HermesService`
starts a `timer(0, 10_000)` poll on first injection and shares it
(`shareReplay`) for the service's lifetime — the poll continues after
navigating away. `HermesRuns` runs its own 30s poll on rollup + tail;
Pulse ticks a 1s countdown signal, Timeline a 60s "now" marker.

## Dependencies

- **API** (`environment.dashboardApiUrl`, empty string → same-origin proxy):
  `GET /api/hermes/jobs`, `POST /api/hermes/trigger/{id}`,
  `POST /api/hermes/{pause|resume}/{id}`, `PATCH|DELETE /api/hermes/{id}`,
  `GET /api/hermes/jobs/{id}/runs[/{runId}]`, `GET|PATCH /api/hermes/config`,
  `GET /api/agent-runs/{rollup|tail}`, `GET|PUT /api/agent-runs/ratings[...]`,
  `GET /api/mcp-calls/{rollup|tail}`.
- **Features**: `ModelsService` (`@features/models`) feeds the model
  typeahead in control-room and model-prefs; `modelRuntimeId` from
  `@domain/models`. The journal feature consumes `AgentRunsService` and
  `McpCallsService` from here.
- **Shared**: `JobChip` (+ its `jobChipState`/`jobChipKind` helpers),
  `UiBadge`, `UiSection`, `UiProse`, `UiTypeahead`, `UiTabBar`,
  `UiLoadingState`, datetime utils.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — No tests anywhere in the feature (zero `*.spec.ts` under
  `src/app/features/hermes/`), despite non-trivial logic in
  `todayFireTimes` (backwards interval walking) and the health rollup in
  `hermes-runs.ts`.
- `2026-07-07` — `HERMES_PROVIDERS` in `hermes-control-room.ts` is a
  hardcoded 15-entry list with a "Mirrors HERMES_PROVIDERS in
  jimbo-api/src/schemas/hermes.ts — keep in sync" comment; no shared source.
- `2026-07-07` — `extractIntervalMinutes` only parses the `every Nm` display
  format; hour/cron-style schedules yield `null` and fall into the
  "off-schedule / single-fire" timeline path.
- `2026-07-07` — `AgentRunsService` exposes `cost_usd`/`tokens_total` and
  job ratings, but the Runs view (`hermes-runs.html`) renders none of them —
  only the journal feature uses them.
- `2026-07-07` — Destructive job removal uses native `confirm()` in
  control-room; no undo.
