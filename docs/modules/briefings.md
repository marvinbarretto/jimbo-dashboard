---
module: briefings
repo: dashboard
description: Briefing archive with quality ratings — list page over /api/briefing/history plus the per-briefing detail page rendering day plan, email highlights, and vault tasks.
source_paths:
  - src/app/features/briefings/**
  - src/app/features/briefing/**
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

# briefings

## Purpose

Hermes generates two briefings a day (morning 06:15, afternoon 14:15) and
their quality is an ongoing tuning concern. This module is the feedback loop:
an archive page listing every generated briefing with a four-point rating
control (Great/Good/OK/Bad + optional note), and a detail page showing what a
briefing actually contained (day plan, email highlights, surprise, vault
tasks). Ratings persist to jimbo-api so briefing-review tooling can correlate
"what the pipeline did" with "what Marvin thought of it".

## Responsibilities

- `briefings` (archive): fetch and list all briefing analyses, show a derived
  quality summary (count rated, % Good-or-better) in the header, and host the
  inline rating control per row.
- `briefing` (detail): fetch one briefing by id and render its `analysis`
  payload — day plan entries, email highlights with links, the surprise
  fact/strategy, and vault task suggestions — plus the same rating control.
- `BriefingsService` is the single owner of the rate mutation: archive page,
  detail page, and the journal day-page section all write through
  `rate(id, rating, note)`; list state patches in place from the returned
  record. It also exposes `fetchForDate(since, until)` for the journal
  without touching the archive store.
- Does NOT generate briefings (Hermes cron via jimbo-api) or own the journal
  day view that embeds briefings (journal feature).

## Public API

Routes (registered in `src/app/app.routes.ts`):

- `/briefings` → `BriefingsPage` (`features/briefings`)
- `/briefing/:id` → `BriefingDetail` (`features/briefing`)

Exports: `BriefingsService` (`load`, `fetchForDate`, `rate`, `isSaving`,
`briefings`/`loading`/`error`/`quality` signals); `BriefingRating`
presentational component (inputs `rating`/`note`/`pending`, single `rate`
output); `briefing.types.ts` — `BriefingAnalysis`, `BriefingRating` type,
`RATING_OPTIONS`, `ratingScore` (a hand-written mirror of jimbo-api's
`BriefingAnalysisSchema`; the repo has no generated client).

## Lifecycle

Both routes are lazy `loadComponent`, no guards. `BriefingsService` is
`providedIn: 'root'` but deliberately does NOT load eagerly — the archive
page calls `load()` in its constructor so detail/journal consumers that only
need `rate()` don't pull the full archive (limit 1000, ~years at 2/day).
Detail uses `loadOne` keyed on the `:id` route param, with a local `override`
signal so a rating saved on the page reflects immediately without a refetch.
`BriefingRating` keeps working copies via `linkedSignal`, resetting when the
persisted inputs change; the note row only appears once a rating exists (the
API requires a rating with a note).

## Dependencies

- **jimbo-api endpoints**: `GET /api/briefing/history?limit=1000` (archive),
  `GET /api/briefing/history?since=&until=&limit=10` (journal date fetch),
  `GET /api/briefing/{id}` (detail), `PUT /api/briefing/{id}/rate`.
- **Other features**: consumed BY `journal` (day-page briefing section
  injects `BriefingsService`); `briefing` detail imports the rating control
  and types from `briefings`.
- **Shared**: ui-page-header, ui-section, ui-meta-list, ui-stack, ui-prose,
  loading/empty states, `formatDatetime`, `loadOne`.
- **Config**: `environment.dashboardApiUrl`. `BriefingRating` uses
  `FormsModule`/`ngModel` for the note input.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — No tests: zero `*.spec.ts` under `features/briefings` or
  `features/briefing` (quality-summary math, rating-score mapping, and the
  in-place patch on `rate()` are untested).
- `2026-07-07` — `BriefingRating` is the one place in these features using
  `ngModel` (template-driven) despite the repo's ReactiveFormsModule-only
  rule; it also carries hardcoded hex colours with `var(--…, fallback)`
  pairs instead of pure design tokens.
- `2026-07-07` — Component class `BriefingRating` shares its name with the
  `BriefingRating` union type, forcing an import alias in `briefing-detail`
  (comment in source notes it confuses the template type-checker).
- `2026-07-07` — Feature split is asymmetric by design-accident: list lives
  in `features/briefings`, detail in `features/briefing`, with the detail
  reaching into `../../../briefings/` via relative paths.
