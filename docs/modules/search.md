---
module: search
repo: dashboard
description: Global "/" search dialog over jimbo-api full-text search, plus the activity and context-item detail pages that its deep links land on.
source_paths:
  - src/app/features/search/**
  - src/app/features/activity/**
  - src/app/features/context-item/**
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

# search

## Purpose

One keystroke to anything Jimbo knows about. jimbo-api indexes vault notes,
emails, dispatches, briefings, grooming, context items, and activity entries
into a single search endpoint, and mints per-entity deep-link URLs
(`resolveDeepLinkKey` in jimbo-api's search.ts) that also appear in Hermes and
Discord messages. This module is the dashboard half of that contract: the
spotlight-style dialog for interactive search, and the two detail pages —
`/activity/:id`, `/context/:id` — that exist purely so those deep links have
somewhere to land. Entities with richer features (vault items, emails,
briefings, grooming) resolve to their own pages instead.

## Responsibilities

- `SearchDialog`: debounced (250ms, min 2 chars) typeahead against
  `/api/search`, keyboard navigation (arrows/Enter/Escape), source labels
  (`vault_notes` → "Task", etc.), `<mark>`-highlighted snippets rendered via
  `[innerHTML]`, and navigation to the selected result's `url`.
- URL normalisation on select: strips a legacy `/app/jimbo/dashboard` prefix
  from result URLs before `router.navigateByUrl`, so API-minted links navigate
  in-SPA.
- `ActivityDetail` and `ContextItemDetail`: cold single-entity fetch-by-id
  pages (via the shared `loadOne` helper) rendering read-only metadata + prose.
- Does NOT own the search index, ranking, or deep-link key scheme — all
  jimbo-api. Does NOT open itself: the global "/" shortcut lives in
  `src/app/shared/services/command-shortcuts.service.ts`.

## Public API

- `SearchDialog` — no route; opened as a CDK Dialog by
  `CommandShortcutsService.openSearch()` (bound to "/" outside text inputs,
  `panelClass: 'command-dialog'`).
- `/activity/:id` → `ActivityDetail` (registered in `app.routes.ts`).
- `/context/:id` → `ContextItemDetail` (registered in `app.routes.ts`).
- Both detail components expose a single `state: Signal<LoadState<T>>`
  (`{ data, loading, error }`).

## Lifecycle

Detail pages are lazy `loadComponent` routes; the dialog is lazy only in the
sense of tree-shaken dialog instantiation (it is statically imported by the
root-provided `CommandShortcutsService`, so it ships with the main bundle).
The dialog wires an RxJS pipeline in its constructor
(`debounceTime → distinctUntilChanged → filter → switchMap`,
`takeUntilDestroyed`); stale in-flight queries are cancelled by `switchMap`.
Detail pages re-fetch reactively when the route param signal changes; a null
id yields an idle state (see `loadOne`'s jsdoc — deep links arrive with no
list preloaded).

## Dependencies

- **jimbo-api endpoints**: `GET /api/search?q&limit=12` (dialog);
  `GET /api/activity/{id}`; `GET /api/context/items/{id}`. All same-origin
  (`environment.dashboardApiUrl` is `''`), cookie-authenticated via the global
  `authRedirectInterceptor`.
- **Shared**: `loadOne` (`@shared/data-access/load-one`) for the detail pages;
  `UiPageHeader`, `UiSection`, `UiMetaList`, `UiStack`, `UiLoadingState`,
  `UiEmptyState`, `UiProse` for layout.
- **External**: `@angular/cdk/dialog` (`DialogRef`), RxJS.
- **Domain models**: none from `src/app/domain` — each file declares a local
  interface hand-mirroring the jimbo-api schema (comments say so:
  "Mirrors ActivitySchema", "Mirrors the enriched ContextItemDetail").

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — Hardcoded `appBase = '/app/jimbo/dashboard'` in
  `SearchDialog.selectResult`; the dashboard now serves at the domain root, so
  this is a compatibility shim for older minted URLs. Harmless today, but the
  constant will silently stop matching anything once no legacy links remain.
- `2026-07-07` — Result types (`SearchResult`, `Activity`, `ContextItemData`)
  are manually duplicated from jimbo-api schemas rather than generated — drift
  is only caught at runtime.
- `2026-07-07` — Snippets are bound with `[innerHTML]` relying on Angular's
  default sanitizer for API-supplied `<mark>` markup; no explicit allowlist.
- `2026-07-07` — No tests: zero spec files across all three feature dirs and
  no e2e coverage of search or the deep-link detail pages.
