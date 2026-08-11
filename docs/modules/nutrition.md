---
module: nutrition
repo: dashboard
description: Food and supplement logging UI over jimbo-api's coach module — macro totals against targets, alcohol-calorie tracking, LLM-estimated entries, inline CRUD.
source_paths:
  - src/app/features/nutrition/**
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

# nutrition

## Purpose

The fuel half of the gym & nutrition advisory system: a period-scoped ledger
of food-log entries and supplement intakes with quick capture (type a label,
optionally a kcal figure — the server's LLM estimator fills the macros
otherwise), inline correction/backdating, and the trend views that matter for
the current fat-loss goal: calories vs a target, protein vs a target, and an
explicit "alcohol as empty calories" split stacked at the bottom of the trend
chart so it's comparable day-to-day.

## Responsibilities

- Owns `NutritionService`, the typed client for jimbo-api's coach endpoints:
  food-log list / daily rollup / frequent-foods catalogue, supplement log,
  and manual create/patch/delete for both (manual create bypasses the LLM
  estimator unless `estimate: true`).
- Owns `nutrition.read.ts` (`NUTRITION_READ` injection token) — a read-only
  DI surface over the same singleton, existing purely so leaf components can
  import a non-`*.service` path under the VAULT-COMMANDS-001 ESLint seam
  rule. Mutations must never be added to it.
- Owns the alcohol classification: trust the LLM's per-item `alcoholic` flag
  when present, else fall back to the Atwater residual
  (kcal − 4P − 4C − 9F > 30) for entries predating the flag; the whole
  drink's kcal counts as "alcohol" in the trend.
- Owns the unified day ledger (food + supplements interleaved, quiet days
  included) built on the shared tracker types.
- Owns the "usuals" quick-add: `data-access/usuals.ts` (quantity-stripped
  dedupe key, frequency ranking with slots reserved for recently-logged
  foods) plus the `UsualChips` one-tap chip row — both shared by the desktop
  day view and the phone shell's Log tab so the two surfaces can't drift.
  Chips log with last-known macros (no LLM round-trip) and backdate to the
  viewed day on past-day pages.
- Exports `NutritionDaySection` for the journal day page (self-fetching,
  60s poll, collapse-when-empty).
- Does NOT own the supplement catalogue or protocol definition (server-side,
  read from `/api/coach/protocol`), the LLM estimator, or exercise data.

## Public API

Registered at `/nutrition` via `loadChildren` in `src/app/app.routes.ts`;
`nutrition.routes.ts` mounts `NutritionShell` (a `UiPeriodShell` wrapper)
with `/nutrition/day/:date`, `/nutrition/week/:week`,
`/nutrition/month/:month` — all `NutritionPage` differentiated by
`data.granularity` — plus redirects from bare paths to today / this week /
this month.

Cross-feature exports: `NutritionService` (+ `FoodLogEntry`, `FoodDailyRow`,
`SupplementLogEntry`, patch/create types), `NUTRITION_READ`,
`NutritionDaySection`, `NutritionRow`.

## Lifecycle

Lazy `loadComponent` per route. Same period plumbing as `ExercisePage`
(granularity from `route.snapshot.data`, route key → `periodWindow`):
five `httpResource`s (daily rollup, food list, supplement list, protocol
catalogue, frequent foods) re-fetch when the window changes; writes go
through `NutritionService` then `reload()` — food writes also re-roll the
daily rollup and frequent-food suggestions. Day keys use the *logical* day
(04:00 Europe/London cutover) so "Today" agrees with the default route in the
00:00–04:00 window. Quick-adding a supplement on a past day page silently
backdates to that day. No guards.

## Dependencies

- **jimbo-api**: `/api/coach/food-log` (`?date|from/to|days`, `/daily`,
  `/frequent`, `/manual`, `/:id`), `/api/coach/supplement-log` (same shape,
  `/manual`, `/:id`), `/api/coach/protocol`. All same-origin relative URLs.
- **Shared**: tracker types, ui-tracker-day-group, ui-quick-add-row,
  ui-period-totals/pager/shell, ui-bar-chart, date-keys + datetime utils,
  `ToastService`.
- **Consumed by**: journal (`NutritionDaySection`, and `TrainingFuelSection`
  reads `NutritionService.daily`), ui-lab (`NutritionRow` demo section).

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — Daily targets are hardcoded in `nutrition-page.ts`
  (`TARGETS = { kcal: 2200, protein_g: 150 }`) with an own comment admitting
  they "could move to settings"; changing a target is a code deploy.
- `2026-07-07` — `ALCOHOL_RESIDUAL_MIN = 30` is a heuristic constant for
  legacy entries; documented, but untested — the alcohol split and
  `isAlcoholicDrink` have no spec despite carrying a headline metric.
- `2026-07-07` — No test files anywhere in the feature (no `*.spec.ts` /
  `*.test.ts` under `src/app/features/nutrition/`). *Update 2026-08-11:
  `nutrition-ledger`, `product-label`, `reference-intake` and `usuals` now
  have co-located tests; pages/components remain untested.*
- `2026-07-07` — `NutritionRow` is not used by any nutrition page or section;
  its only consumer is `features/ui-lab/sections/nutrition-row-section.ts`
  (the ledger uses shared `UiTrackerDayGroup` instead) — candidate dead code
  or lab-only component living in the wrong folder.
- `2026-07-07` — Same dual data path as exercise: page reads via
  `httpResource` URL strings while `NutritionService` defines the same
  endpoints for other consumers. *Update 2026-08-11: the frequents read is
  unified behind `frequentFoodsResource()` (limit 100 — the endpoint max —
  so the usuals recency blend isn't starved by count-ordered truncation);
  the other reads still duplicate URLs.*
