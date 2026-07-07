---
module: dev-tools
repo: dashboard
description: Developer scratch surfaces — the epic-card variant sandbox, the reactive-vs-signal-forms test bench, and the unit-test coverage report page fed by a committed JSON snapshot.
source_paths:
  - src/app/features/test/**
  - src/app/features/test-forms/**
  - src/app/features/coverage/**
  - src/assets/coverage-summary.json
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

# dev-tools

## Purpose

Three pages that serve the dashboard's own development rather than Jimbo
operations. The epic-cards page is a free-form iteration sandbox deliberately
kept *outside* ui-lab ("promote winning variants to ui-lab once a shape is
settled" — its header comment). The test-forms bench exists to settle a repo
convention empirically: it renders ReactiveFormsModule and experimental signal
forms side by side so Playwright can verify their behaviour in a zoneless app
(the outcome — "signal forms blocked" — is a hard rule in the repo's
CLAUDE.md). The coverage page turns the Vitest coverage summary into an in-app
report so per-file coverage is visible without leaving the dashboard.

## Responsibilities

- `EpicCardsTest`: renders four hardcoded `EpicCardVM` samples (including a
  future "Jimbo-autonomous" case and a project-AND-actor disambiguation case)
  through all four `EpicCard` variants — compact / detail / narrative /
  status — for direct comparison.
- `TestFormsPage`: twin forms with identical fields (id, display_name) built
  with `FormBuilder` and with `form()`/`required()` from
  `@angular/forms/signals`; submit echoes the model into a `data-testid`'d
  `<pre>` for E2E assertion. Marked "Diagnostic page — not production".
- `CoverageService` + `CoveragePage`: build-time `import` of
  `src/assets/coverage-summary.json`, exposed as a signal; the page computes a
  total row plus per-file rows (filtered to `src/`, sorted worst-first by line
  %, colour-banded at ≥80 / ≥50).
- The snapshot pipeline: `npm run coverage:update` runs
  `ng test --no-watch --coverage` then `scripts/coverage-report.mjs`, which
  copies `coverage/dashboard/coverage-summary.json` into `src/assets/` with
  paths relativised. This module does not run tests itself — it only displays
  the committed artifact.

## Public API

Routes (all in `app.routes.ts`):

- `/test/epic-cards` → `EpicCardsTest`
- `/test-forms` → `TestFormsPage`
- `/coverage` → `CoveragePage`

Exports otherwise: `CoverageService.summary` signal and the coverage types
(`CoverageSummary`, `FileCoverage`, `CoverageMetric`, `FileRow`) in
`coverage.ts`. Nothing else consumes these features.

## Lifecycle

All three are lazy `loadComponent` routes with no guards and no runtime data
fetching: epic-cards and test-forms render static/in-memory state; coverage
data is bundled into the JS at build time via the JSON import (refreshing it
requires re-running `coverage:update` and rebuilding — there is no HTTP
fetch). `TestFormsPage` is exercised by `e2e/test-forms.spec.ts` (Playwright).

## Dependencies

- **jimbo-api endpoints**: none in any of the three features.
- **Shared**: `EpicCard` (`@shared/components/epic-card`) — the only shared
  component used; the other two pages use plain templates.
- **External**: `@angular/forms` + `@angular/forms/signals` (experimental
  API, per the repo's "tag the risk surface" rule); `DecimalPipe`/`JsonPipe`.
- **Assets/scripts**: `src/assets/coverage-summary.json` (written by
  `scripts/coverage-report.mjs`); `@vitest/coverage-v8` produces the source
  data.
- **Domain models**: none from `src/app/domain`.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — The coverage snapshot is a manually refreshed committed
  artifact (last touched 2026-04-23 per file mtime; totals cover only 167
  lines) — it goes stale silently, and the page has no indication of when it
  was generated.
- `2026-07-07` — `CoverageService` casts the JSON with
  `summaryJson as CoverageSummary`, but the file's `total` key doesn't match
  the `Record<string, FileCoverage>` shape access pattern
  (`summary()?.['total']` is guarded even though the signal is non-nullable) —
  types and data are loosely coupled.
- `2026-07-07` — `EpicCardsTest` sample data hardcodes future timestamps
  (`2026-08-12`) and real-looking vault ids/seqs; fine for a sandbox, but the
  page is reachable in production builds, as are `/test-forms` and
  `/coverage` — no dev-only guard on any of the three routes.
- `2026-07-07` — Tests: `e2e/test-forms.spec.ts` covers the forms bench, but
  there are zero unit specs in the three feature dirs and no e2e for
  epic-cards or coverage.
