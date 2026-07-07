---
module: tasks
repo: dashboard
description: Google Tasks triage suite — the /tasks tabbed shell hosting the triage list, swipe deck over pre-warmed AI proposals, triage activity log, and per-list ingestion settings.
source_paths:
  - src/app/features/tasks/**
  - src/app/features/triage-tasks/**
  - src/app/features/triage-swipe/**
  - src/app/features/triage-activity/**
  - src/app/features/google-tasks-settings/**
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

# tasks

## Purpose

Marvin quick-captures into Google Tasks all day; left alone those captures
rot ("false-capture relaxation"). This module is the daily triage ritual's
UI: pull the Google Tasks inbox through jimbo-api, get an AI proposal per
task (type/tags/priority/rationale, pre-warmed by the boris-loop runner on
M2 or generated on demand via `/triage-now`), then promote to the vault,
discard the Google Task, or skip. Four tabs under one `/tasks` shell: Triage
(modal-per-task with debug telemetry), Swipe (fast card deck over cached
proposals only), Activity (audit log of triage runs), and Settings (which
Google Task lists are ingested, per-list tag).

## Responsibilities

- `tasks`: the shell — a `UiTabBar` with a `router-outlet`; owns nothing else.
- `triage-tasks`: inbox list + per-task modal. Checks the proposal cache on
  open (hit/stale/miss logged to console), "Ask Jimbo" runs `/triage-now`
  with optional operator context, promote composes the vault body from task
  notes + context + AI rationale, discard deletes the Google Task behind a
  `confirm()`, every action fire-and-forgets to `/triage-log`.
  `TriageTasksService` owns the inbox signal and all triage HTTP calls, plus
  an id→label map of active projects read from the priorities context file.
- `triage-swipe`: prefetches cached proposals for every inbox task in
  parallel, shows only tasks that HAVE a cached proposal as a card deck
  (oldest-updated first, matching boris-loop's pick order); promote/discard/
  skip advance a local index; a feedback box re-runs `/triage-now` with
  context and swaps the refined proposal in place.
- `triage-activity`: 30s-polled view of `/triage-history` joined against the
  live inbox for titles, exposing runner provenance, latency, and token
  usage per run.
- `google-tasks-settings`: per-list enable toggle + tag, debounced (300ms)
  full-config PUT with optimistic UI and rollback-to-last-confirmed on
  failure.
- Does NOT own vault note editing (vault-items), the AI skill itself
  (jimbo-api / boris-loop), or the conversational `/triage-google-tasks`
  Claude skill.

## Public API

Routes: `/tasks` lazy-loads `tasksRoutes` (`tasks/tasks.routes.ts`), which
mounts `TasksPage` as shell with children — `''`→redirect `triage`,
`triage` → `TriageTasksPage`, `swipe` → `TriageSwipePage`,
`activity` → `TriageActivityPage`, `settings` → `GoogleTasksSettingsPage`.

Services: `TriageTasksService` (`load`, `triageNow`, `getCachedProposal`,
`logTriageAction`, `commit`, `deleteTask`, `removeFromCache`,
`activeProjects`) — shared by triage and swipe; `TriageActivityService`
(`start`/`stop`/`refresh`, `taskTitle`); `GoogleTasksSettingsService`
(`lists`/`config` via `toSignal`, `saveConfig`). Types mirror jimbo-api's
google-tasks schemas: `InboxTask`, `TriageProposal`, `TriageDebug`,
`TriageNowCachedResult`, `TriageHistoryItem`, `GoogleTasksConfigValue`.

## Lifecycle

Everything is lazy: `app.routes.ts` → `loadChildren` → per-tab
`loadComponent`; no guards. Triage loads the inbox in its constructor; swipe
loads in `ngOnInit` and reacts to the shared inbox signal via an `effect`
that triggers proposal prefetch (deliberately avoiding
`removeFromCache` mid-batch so the effect doesn't re-fire). Activity
starts/stops its 30s poll in `ngOnInit`/`ngOnDestroy`. Settings hydrates a
local config signal from the server config `effect`-once, then
debounce-saves, cancelling in-flight PUTs superseded by newer snapshots.

## Dependencies

- **jimbo-api endpoints** (all `/api/google-tasks/*` unless noted): `inbox`,
  `triage-now`, `triage-now/cached`, `triage-log`, `triage-history`,
  `commit`, `DELETE tasks`, `lists`, `config` (GET/PUT), plus
  `GET /api/context/files/priorities` for the active-projects map.
- **Cross-feature**: swipe and activity import types/service from
  `triage-tasks`; nothing here imports other feature areas.
- **Shared**: modal-shell, toast service, ui-tab-bar, ui-toggle, ui-badge,
  ui-prose, ui-refresh-control, page-header/stack/section, loading/empty
  states; pipes `formatTag`, `projectLabel`, `relativeTime`.
- **Config**: `environment.dashboardApiUrl`.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — No tests: zero `*.spec.ts` across all five feature dirs
  (promote-body composition, swipe queue/skip index math, and the settings
  debounce/rollback logic are untested).
- `2026-07-07` — Heavy `console.log`/`console.info` instrumentation
  throughout `triage-tasks` (service and page) — useful during bring-up,
  but it ships in production builds.
- `2026-07-07` — `TriageProposal`/`TriageDebug` interfaces are duplicated
  between `triage-tasks.service.ts` and `triage-activity.service.ts` (the
  activity copy loosens URL-telemetry fields to optional); drift risk
  against the jimbo-api schema they both mirror.
- `2026-07-07` — Discard uses native `confirm()` rather than the app's
  modal system; skip state is session-only in both triage (`skippedIds`)
  and swipe (`_skippedIndices`) — acknowledged in a swipe comment
  ("Persisted skips would need /triage-log").
- `2026-07-07` — Swipe prefetch fires one cache-lookup request per inbox
  task in parallel (`Promise.all`); fine at current inbox sizes, no batch
  endpoint yet.
