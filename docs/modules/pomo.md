---
module: pomo
repo: dashboard
description: Pomodoro focus-session flow — intention-picking wizard, wall-clock countdown, break timer, and a telemetry-enriched retro — over jimbo-api focus sessions.
source_paths:
  - src/app/features/pomo/**
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

# pomo

## Purpose

Focus sessions with declared intent: instead of a bare timer, each pomo is
started through a cascading wizard (project → epic → story → optional
sub-task) so the session carries a real vault-graph edge to what it was for,
and ends in a retro that confronts the plan with what telemetry says actually
happened — browser focus ratio, domains, commits pushed, YouTube watched.
The session state machine lives server-side; the UI renders a wall-clock
countdown from `started_at + planned_seconds`, so closing the tab or
switching devices loses nothing, and the Chrome extension can run the same
session from the toolbar.

## Responsibilities

- Owns `FocusSessionsService`: signal store (`active`, `recent`,
  `hasActive`) over `/api/focus-sessions`, with start / complete / abandon /
  update, vault-note linking (`linkNote`, `loadNotes`), and a decoupled DOM
  `CustomEvent` bridge (`jimbo:pomo-started/stopped`) that tells the Chrome
  extension's content script a web-started session began or ended.
- Owns the four-step flow: `PomoPreSession` (wizard; can create epics /
  stories / sub-tasks inline via `VaultItemsService.createOnBoard`),
  `PomoRunning` (1s-tick countdown, auto-completes at zero and routes to
  retro), `PomoBreak` (client-only break timer via `?mins=`), `PomoRetro`
  (mood/notes/tags capture, activity breakdown donut, commits + YouTube in
  the session window, "next steps" suggestions from the same epic/project).
- Also owns `PomoPage`, an older all-in-one setup/countdown/capture page
  mounted separately at `/pomo-reports`.
- Does NOT own the session state machine, activity summarisation, or
  telemetry collection (all server-side / extension-side), nor vault items
  and projects themselves.

## Public API

`pomo.routes.ts`, mounted at `/pomo` via `loadChildren` in
`src/app/app.routes.ts`:

- `/pomo` → `PomoShell` (redirects to `running` or `pre-session`)
- `/pomo/pre-session` → `PomoPreSession`; `/pomo/running` → `PomoRunning`
- `/pomo/break` → `PomoBreak`; `/pomo/retro` → `PomoRetro`
- `/pomo-reports` → `PomoPage` (registered directly in `app.routes.ts`,
  outside this feature's routes file)

Service surface: `FocusSessionsService` (`loadActive`, `loadRecent`, `start`,
`complete`, `abandon`, `update`, `linkNote`, `loadNotes`) — also consumed
indirectly; journal reads the same endpoint via its own service.

## Lifecycle

Lazy per-route chunks. `PomoShell.ngOnInit` awaits `loadActive()` and
replaces the URL with `/pomo/running` or `/pomo/pre-session`; `PomoRunning`
re-checks and bounces back if no session exists. Countdown effects tick a
`now` signal every second only while a session is active (interval cleaned up
via effect `onCleanup`); an `autoFinished` guard makes the auto-complete
effect fire exactly once, and the extension may race the dashboard to
complete the same session (acknowledged in comments). `PomoRunning` also
mirrors the remaining time into `document.title`. Retro reads `?break=` /
break page reads `?mins=` passed by the extension. No guards.

## Dependencies

- **jimbo-api**: `/api/focus-sessions` (GET `?days=`, GET `/active`, POST,
  PATCH `/:id`, `/:id/complete`, `/:id/abandon`, GET/POST `/:id/notes`);
  retro additionally queries `/api/telemetry/events?collector=github&type=push`
  and `?collector=youtube&type=watch_session` scoped to the session window.
- **Features**: projects (`ProjectsService` for chips/names/colours),
  vault-items (`VaultItemsService` for epics/stories/next-steps and inline
  creation).
- **Domain**: `@domain/focus-sessions`, `@domain/vault`, `@domain/ids`
  (branded ids); **Shared**: ui-button/stepper/select-chip/progress-meter/
  typeahead, vault-chip + kanban detail-modal, `ToastService`.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — No test files in the feature (no `*.spec.ts` / `*.test.ts`
  under `src/app/features/pomo/`).
- `2026-07-07` — `PomoPage` (`/pomo-reports`) duplicates the countdown maths,
  `formatTime`, presets and capture form that the split flow implements —
  two parallel pomo UIs over the same service.
- `2026-07-07` — Completion race between dashboard auto-finish and the
  extension's expiry tick is handled by "server treats double-complete as
  idempotent-ish" per comments, not by any client-side coordination.
- `2026-07-07` — A `.DS_Store` file is committed under `pomo/containers/`.
