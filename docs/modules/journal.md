---
module: journal
repo: dashboard
description: Day/week/month retrospective pages that fuse pomos, activity, calendar, telemetry, gym, food, agents, MCP calls and briefings into one "what happened" view.
source_paths:
  - src/app/features/journal/**
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

# journal

## Purpose

The journal answers "what actually happened on this day / week / month" by
pulling every signal Jimbo already captures — focus sessions, the activity
log, calendar events, device telemetry (sleep, steps, phone usage, GitHub
pushes, YouTube watching), gym sessions, food log, agent runs, MCP calls and
briefings — into a single navigable retrospective. It's the reflection
counterpart to the live "today" page: read-only, period-keyed, and built so
new signal sources slot into the bundle without changing the page contracts.

## Responsibilities

- Owns `JournalDataService` and its `DayBundle`/`WeekBundle`/`MonthBundle`
  shapes: fetches raw rows and buckets them client-side in local time, so a
  session "belongs to" the same day the user's calendar says.
- Owns the day-page composition: collapsible sections (Work, Health, Code,
  Phone, Consumption, Agents, MCP, Briefings, Nutrition, Exercise) that
  auto-collapse when empty via `linkedSignal`, with a scroll-spy chip nav
  (`JournalSectionNav`).
- Owns `youtube-consumption.ts` — a pure, unit-tested aggregation of YouTube
  watch-segment telemetry into per-video/per-channel/hourly summaries,
  including fetch-cap hedging (`SEGMENT_FETCH_CAP`).
- Owns `TrainingFuelSection` ("did I eat enough on leg day?") which buckets
  each day in a range by dominant training region and averages kcal/protein.
- Does NOT own the gym/nutrition day and summary sections it embeds (they
  live in the exercise/nutrition features), nor the agent-run/MCP/briefing
  services (hermes and briefings features), nor any writes — journal is
  read-only except for briefing ratings delegated to `BriefingsService`.

## Public API

Registered at `/journal` via `loadChildren` in `src/app/app.routes.ts`;
`journal.routes.ts` mounts `JournalShell` with children:

- `/journal/day/:date` → `JournalDayPage`
- `/journal/week/:week` → `JournalWeekPage`
- `/journal/month/:month` → `JournalMonthPage`
- `/journal`, `/journal/day|week|month` → functional redirects to
  today / this week / this month (`todayKey()` etc.).

Exports consumed elsewhere: `JournalDataService` (signals `day`, `week`,
`month`, `loading`, `error`; methods `loadDay`, `loadWeek`, `loadMonth`) and
its `*Lite`/bundle types — `TelemetryEventLite` is imported by
`youtube-consumption.ts` and the consumption section.

## Lifecycle

Fully lazy: shell and each page are separate `loadComponent` chunks. Pages
derive their key from the route param (`toSignal` over `paramMap`, sanitised
with a today-fallback) and drive `JournalDataService.load*` — one in-flight
bundle per granularity held in root-provided signals, so revisiting a period
re-renders instantly while a fresh load replaces it. Sections like briefings,
agents and MCP fetch their own day-scoped data (some on a 60s `timer` poll).
No guards; auth is the app-wide 401→`/auth/login` redirect interceptor.

## Dependencies

- **jimbo-api** (all relative via `environment.dashboardApiUrl = ''`, proxied):
  `/api/focus-sessions?days=`, `/api/activity?date=|days=`,
  `/api/google-calendar/events?days=`, and five parallel
  `/api/telemetry/events` queries per day (main window limit 500, plus
  separate pulls for `app_usage_daily`, `health_connect/sleep_session`,
  `github/push`, `youtube/watch_session` to dodge the main-window cap).
- **Features**: nutrition (`NutritionDaySection`), exercise
  (`ExerciseDaySection`, `ExerciseSummarySection`, `ExerciseService`,
  muscle-region utils), hermes (`AgentRunsService`, `McpCallsService`),
  briefings (`BriefingsService`), projects (`ProjectsService` for names).
- **Shared**: `date-keys` utilities (the period-key backbone), ui-section /
  ui-stat-card / ui-bar-chart / ui-donut-chart / ui-period-pager /
  ui-period-shell and friends.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — Every fetch helper in `journal-data.service.ts` swallows
  errors and returns `[]` (`catch { return []; }`), so a failing endpoint
  renders as an empty section rather than an error; the service-level `error`
  signal only fires if `Promise.all` itself throws, which those catches
  prevent.
- `2026-07-07` — Week/month loads fetch `days back from now` from the anchor
  (`daysBackFromAnchor`), so browsing an old month pulls every session and
  activity row between then and today just to bucket one month.
- `2026-07-07` — Telemetry day fetch is capped (500 events main window, 500
  YouTube segments); `youtube-consumption.ts` hedges with `capped`, but other
  collectors have no equivalent undercount signal.
- `2026-07-07` — Only `utils/youtube-consumption.ts` has tests
  (`youtube-consumption.test.ts`); the bundle-building functions
  (`buildDayBundle` etc.) and pages are untested.
