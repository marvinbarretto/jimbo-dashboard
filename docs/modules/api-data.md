---
module: api-data
repo: dashboard
description: Config-driven raw API readout pages — the Today landing page plus one generic data page per API domain, each rendering a grid of live endpoint panels.
source_paths:
  - src/app/features/api-data/**
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

# api-data

## Purpose

The cheapest possible window onto jimbo-api: instead of building a bespoke page
per backend surface, this feature declares endpoints as data
(`data-pages.ts`) and renders whatever JSON comes back as summary chips + an
inferred table. It exists so every new API domain gets dashboard visibility for
the cost of a config entry, and so `/today` (the app's landing page) can show a
cross-system readout — health, jobs, calendar, dispatch, grooming, vault,
briefings, events — without owning any of those domains.

## Responsibilities

- Owns the `TODAY_ENDPOINTS` and `DATA_PAGES` config: which endpoints appear on
  which page, with titles, hints, and query params.
- Owns `EndpointPanel`, the generic renderer: fetch on init, heuristic row
  extraction (payload array, else first array under a preferred key such as
  `items`/`messages`/`events`/`runs`…), column inference (scalar keys first,
  max 8), scalar summary entries, row-count label, ISO-datetime formatting and
  140-char truncation, manual reload.
- Owns `JimboDataService`, a thin typed `HttpClient.get` wrapper prefixing
  `environment.dashboardApiUrl` (empty string → same-origin `/api/*`).
- Does NOT own any domain semantics — richer features (grooming, execution,
  vault-items, briefings…) build their own pages; this is read-only raw
  visibility.

## Public API

Routes (from `src/app/app.routes.ts` + `api-data.routes.ts`):

- `/today` → `TodayPage` (compact panels from `TODAY_ENDPOINTS`); root `''`
  redirects here (`pathMatch: 'full'`).
- `apiDataRoutes` is mounted via `loadChildren` at path `''`, so each entry is
  a top-level path → `DataPage` keyed by `route.data['domain']`: `/mail`,
  `/calendar`, `/tasks`, `/ops`, `/briefings`, `/coach`, `/context`,
  `/triage`, `/interrogate`, `/activity`, `/grooming-admin`.
- Exports: `TodayPage`, `DataPage`, `EndpointPanel` (inputs: `endpoint`,
  `compact`), `JimboDataService.get(path, params)`, and the
  `DATA_PAGES`/`DATA_PAGE_BY_KEY`/`TODAY_ENDPOINTS` config tables.

## Lifecycle

All lazy: `/today` via `loadComponent`, the domain pages via `loadChildren` on
the root path. No guards; auth is app-wide (`authRedirectInterceptor` in
`app.config.ts` bounces 401s to login). Each `EndpointPanel` fires its GET in
`ngOnInit`; there is no polling or caching — reload is a per-panel button.
`DataPage` resolves its config synchronously from route snapshot data and
renders a "No data page configuration found" fallback for unknown keys.

## Dependencies

- **jimbo-api endpoints** (read-only GETs, ~40 across the config): `/api/health`
  (+`/trends`, `/history`), `/api/hermes/jobs`, `/api/google-calendar/*`,
  `/api/calendar/config|available`, `/api/dispatch/status|history`,
  `/api/grooming/*`, `/api/vault/tasks/summary|inbox-summary|notes`,
  `/api/briefing/latest|history`, `/api/snapshot`, `/api/events`,
  `/api/emails/reports`, `/api/google-mail/*`, `/api/google-tasks/*`,
  `/api/pipeline/runs*`, `/api/search/integrity`, `/api/coach/*`,
  `/api/fitness/*`, `/api/context/*`, `/api/settings`, `/api/triage/*`,
  `/api/interrogate/*`, `/api/activity*`, `/api/costs*`, `/api/experiments*`,
  `/api/summaries/products`.
- **Shared**: `UiDataTable` (over `@tanstack/angular-table`), `UiEmptyState`,
  `UiLoadingState`, `formatDatetime` util.
- **Domain models**: none — payloads are deliberately `unknown`.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — Two configured data pages are unreachable: `apiDataRoutes`
  mounts at root ('' entry) *after* the dedicated `tasks` and `briefings`
  features register `/tasks` and `/briefings` in `app.routes.ts`, so the
  api-data `tasks` and `briefings` `DataPage` routes are shadowed dead config.
- `2026-07-07` — Row extraction depends on a hardcoded preferred-key list in
  `endpoint-panel.ts`; an API response using a new collection key silently
  renders as an empty table.
- `2026-07-07` — No tests: zero `*.spec.ts`/`*.test.ts` under
  `src/app/features/api-data/`, and no e2e spec exercises these pages.
- `2026-07-07` — `tableColumns` uses `ColumnDef<Record<string, string>, any>`
  — an explicit `any` in a repo whose hard rule is "No `any`".
