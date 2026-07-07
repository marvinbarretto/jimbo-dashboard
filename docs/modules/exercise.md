---
module: exercise
repo: dashboard
description: Gym tracking UI over jimbo-api's gym module — strength sets, cardio, body-part breakdown and passive activity, with full inline CRUD per day/week/month.
source_paths:
  - src/app/features/exercise/**
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

# exercise

## Purpose

The workout half of the gym & nutrition advisory system: a period-scoped
ledger of gym sessions (strength sets + cardio) with quick-add logging,
inline editing, and the charts that answer training questions — volume trend,
and a body-part split explicitly designed to answer "do I need a leg/arms
day" rather than a biomechanical push/pull grouping. Passive daily activity
(steps/distance/calories from Health Connect) is shown alongside but kept
distinct from deliberate workouts.

## Responsibilities

- Owns `ExerciseService`, the typed HTTP client mirroring jimbo-api's gym
  read/write shapes (`src/schemas/gym.ts` on the API side): detailed
  sessions, per-London-day rollups, passive activity, exercise catalogue with
  fuzzy search and on-the-fly create, and CRUD for sessions/sets/cardio.
- Owns the `ExercisePage` container serving all three granularities, with a
  quick-add exercise picker ranked "yours first" (exercises logged in the
  loaded window float up; catalogue ∪ exercises-from-sets so a just-created
  exercise is immediately reusable).
- Owns `utils/muscle-region.ts` — the `gym_muscle_groups` id → body-part
  region mapping, set-count-weighted breakdown, last-trained-by-region and
  training-day-type classification (also consumed by journal's
  `TrainingFuelSection`).
- Exports `ExerciseDaySection` and `ExerciseSummarySection` for embedding in
  journal day/week/month pages (self-fetching, 60s polling, collapse-when-empty).
- Does NOT own food/supplement logging (nutrition feature) or the raw
  telemetry ingestion that produces activity data (server-side).

## Public API

Registered at `/exercise` via `loadChildren` in `src/app/app.routes.ts`;
`exercise.routes.ts` mounts `ExerciseShell` (a `UiPeriodShell` wrapper) with:

- `/exercise/day/:date`, `/exercise/week/:week`, `/exercise/month/:month`
  → all `ExercisePage`, differentiated by `data.granularity`
- `/exercise` and bare `day|week|month` → redirects to today / this week /
  this month.

Cross-feature exports: `ExerciseService` (+ `SessionDetailed`,
`ExerciseCatalogItem`, patch/create types), `ExerciseDaySection`,
`ExerciseSummarySection`, `ExerciseSessionRow`/`ExerciseSessionCard`, and the
muscle-region + `exercise-format` utils (`sessionStats`, London-day helpers).

## Lifecycle

Lazy `loadComponent` per route. Granularity is read once from
`route.snapshot.data` (safe because switching granularity always tears the
component down). The page converts the route key into a `periodWindow` and
feeds it to three `httpResource`s (sessions, daily rollup, catalogue) that
re-fetch reactively when the window changes; writes go through
`ExerciseService` then `reload()` the resources. The spinner shows only on
first load — `hasValue()` keeps the ledger mounted across reload-after-write
so open sessions stay expanded. Journal-embedded sections poll on
`timer(0, 60_000)` instead. No guards.

## Dependencies

- **jimbo-api**: `/api/gym/sessions/detailed`, `/api/gym/sessions/daily`,
  `/api/gym/activity/daily`, `/api/gym/exercises` (GET/POST),
  `/api/gym/sessions` (+ `/:id`), `/api/gym/sessions/:id/sets|cardio`,
  `/api/gym/sets/:id`, `/api/gym/cardio/:id`. All same-origin relative URLs
  (`environment.dashboardApiUrl` is `''`).
- **Shared**: tracker types (`TrackerMeasure`, `TrackerDraft`, …),
  ui-period-totals/pager/shell, ui-quick-add-row, ui-bar-chart /
  ui-donut-chart, date-keys and datetime utils (`logicalToday`,
  `logicalDay`), `ToastService`.
- **Consumed by**: journal (day section, summary section, training-fuel).

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — `MUSCLE_GROUP_REGION` hardcodes the 11 seed-row ids from
  jimbo-api migration `20260521120000_gym_tables.sql`; any change to that
  seed data silently mis-buckets the body-part chart. Documented in a
  comment, but there is no runtime check.
- `2026-07-07` — Two parallel data paths: `ExercisePage` fetches via
  `httpResource` with inline URL strings while the same endpoints exist as
  `ExerciseService` methods (used by the journal sections) — the query
  contract is duplicated.
- `2026-07-07` — Only `utils/muscle-region.spec.ts` exists; the service,
  page (including the picker ranking and edit plumbing) and section
  components have no tests.
- `2026-07-07` — `exercise-format.ts` duplicates London-day helpers
  (`londonToday`, `shiftIsoDay`) that overlap `@shared/utils/datetime.utils`
  (`logicalToday`, `shiftIsoDay`), two subtly different day conventions.
