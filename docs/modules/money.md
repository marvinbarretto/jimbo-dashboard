---
module: money
repo: dashboard
description: Read-only page showing live budget position, planned runway, and the assumptions those numbers were computed under.
source_paths:
  - src/app/features/money/**
generated_at: 2026-09-11
reviewed_commit: c153639
sections:
  purpose: asserted
  responsibilities: asserted
  public-api: derived
  lifecycle: derived
  dependencies: derived
  tech-debt: asserted
---

# money

## Purpose

One page answering "where do I actually stand", without having to open YNAB and
work it out. Marvin's money lives in one YNAB budget covering both personal and
Fourfold Ltd, so the headline figure is not any balance YNAB shows him — it is
on-budget cash minus the company category group. That subtraction is the thing
this page exists to do reliably.

It is a read surface only. Budget structure is changed in YNAB's own UI, which
is also the only place it *can* be changed — the YNAB API cannot edit accounts
or categories at all.

## Responsibilities

- Render position, planned runway and the attention counts from
  `GET /api/money/summary`.
- **Show the assumptions the numbers were computed under**, and raise a drift
  warning when one breaks. This is the page's real job: a runway figure is only
  worth reading if you can see what went into the divisor.
- Keep the `plan` / `actual` distinction visible (ADR-0036). Both halves now
  render, each labelled with its basis, and the **gap between them has its own
  section** — stated as a monthly overspend rather than as two runway figures,
  because "£977/mo more than planned" is actionable and "25 vs 34 months"
  invites picking the flattering one.
- **Show the measured series**: spend per category and per watched payee,
  averaged over the last complete months, plus break-even days per day-rate.
  These are the findings, derived from published aggregates rather than written
  down — a hardcoded findings list would be stale within a week and
  unfalsifiable from here.
- Does NOT compute anything financial. Every derived figure arrives from
  jimbo-api; the page adds presentation and drift detection only.
- Does NOT write. There is no mutation path here at all.

## Public API

Route `/money` (lazy, `app.routes.ts`), nav tab under **Life**.

- `MoneyService` — `summary`, `categories`, `isLoading`, `error` signals, and
  `refresh()`.
- `MoneyPage` — `driftWarnings`, `lumpyByName`, `needsAttention` computed
  signals. These carry the logic and are what the spec covers.

## Lifecycle

`MoneyService` is `providedIn: 'root'` and fetches in its constructor, so the
first navigation loads and later ones reuse what is already in the signals.
`refresh()` passes `?fresh=1`, which bypasses the API's 15-minute cache and
spends one of YNAB's 200 hourly requests — hence a button, never an interval.

## Dependencies

- **Internal**: `UiPage`; types from `domain/api-types.generated.ts`.
- **External**: jimbo-api `/api/money/summary` and `/api/money/categories`.
  A 503 means the server has no `YNAB_TOKEN`; a 502 usually means YNAB's rate
  limit. Both are reported as themselves rather than "failed to load".

## Technical Debt

- **The measured half is a snapshot, not a feed.** `actual.*` and the series
  arrive only when `hub/scripts/money/publish.py --live` is run by hand on the
  M4. The page shows `generated` and the API distinguishes "the data has not
  changed" from "the pipeline has stopped running" (`first_received_at` vs
  `last_received_at`), but nothing yet *warns* when a publish goes stale.
- **No charts.** The series are published monthly over 101 months and rendered
  as tables averaged over the last complete months. A trend is the obvious next
  read and the data is already there; the table was built first because a wrong
  number in a table is visible and a wrong number in a sparkline is not.
- **Types are regenerated manually** via `npm run gen:api-types`, which reads
  the *deployed* contract. A page built against an undeployed API change will
  typecheck and then fail at runtime.
- **Categories are fetched and not yet shown.** `MoneyService.categories` is
  populated for a per-category breakdown that has not been built; it fails
  silently on purpose so it cannot blank the headline numbers.
