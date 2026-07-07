---
module: shopping
repo: dashboard
description: Minimal shopping list — add items with optional qty/store/note/url, toggle active↔bought, delete — backed by jimbo-api /api/shopping.
source_paths:
  - src/app/features/shopping/**
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

# shopping

## Purpose

A deliberately small utility page: a persistent shopping list that lives in
the same dashboard as everything else, so items can be captured from any
device and survive across sessions (Postgres-backed via jimbo-api rather than
localStorage). Two states only — active and bought — with bought items kept
around and restorable rather than deleted, matching how a household list is
actually used.

## Responsibilities

- Owns `ShoppingService`: a root-provided, signal-based store over
  `/api/shopping` — `items` plus derived `active`/`bought` computed views,
  and mutations `add`, `markBought`, `markActive`, `remove` (status changes
  are PATCHes; the local list is updated from the server's response, not
  optimistically).
- Owns the `ShoppingList` page: a reactive add form (name + qty required;
  unit/store/note/url behind a collapsed "details" toggle, empty strings
  coerced to `null` at the submit boundary) and the two item sections.
- Does NOT own any categorisation, sharing, or reminder behaviour — none
  exists; and it has no relationship to the nutrition food log despite the
  domain overlap.

## Public API

Registered at `/shopping` via `loadChildren` in `src/app/app.routes.ts`;
`shopping.routes.ts` defines a single route:

- `/shopping` → `ShoppingList` (title "Shopping")

Service surface (`ShoppingService`): signals `items`, `active`, `bought`,
`isLoading`; methods `load(filter)`, `add(payload)`, `markBought(id)`,
`markActive(id)`, `remove(id)`. Types `ShoppingItem`,
`CreateShoppingItemPayload`, `ShoppingStatus`. No other feature imports it.

## Lifecycle

Lazy `loadComponent`. `ShoppingService` is `providedIn: 'root'` and calls
`this.load()` in its constructor, so the full list ('all') is fetched the
first time anything injects the service and then lives for the app session;
subsequent visits to the page render from the in-memory signals while
mutations keep them in sync from server responses. Errors surface as toasts
(`ToastService`); there is no retry or optimistic rollback because failed
mutations never touch local state. No guards.

## Dependencies

- **jimbo-api**: `GET /api/shopping?status=active|bought|all`,
  `POST /api/shopping`, `PATCH /api/shopping/:id`,
  `DELETE /api/shopping/:id` (same-origin relative URL via
  `environment.dashboardApiUrl`).
- **Shared**: `ToastService`, ui-page-header / ui-card / ui-section /
  ui-stack / ui-cluster / ui-button / ui-badge / ui-empty-state /
  ui-form-actions; Angular `ReactiveFormsModule`.
- **Other features**: none in either direction.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — No test files in the feature (no `*.spec.ts` / `*.test.ts`
  under `src/app/features/shopping/`).
- `2026-07-07` — Delete confirmation uses the browser-native
  `confirm()` dialog (`shopping-list.ts`), inconsistent with the app's
  component-based UI patterns elsewhere.
- `2026-07-07` — `load(filter)` supports `'active' | 'bought' | 'all'` but
  every caller uses the default `'all'`; the filter path is untested,
  unexercised API surface.
- `2026-07-07` — Data is fetched in the service constructor as a side effect
  of first injection, so the list loads (and can toast an error) even if the
  user never visits `/shopping` in that session — currently harmless since
  only the page injects it.
