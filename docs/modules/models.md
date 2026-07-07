---
module: models
repo: dashboard
description: Editor UI over the hub filesystem model catalogue and model-stack (fallback chain) registry — CRUD screens whose writes become git commits.
source_paths:
  - src/app/features/models/**
  - src/app/features/model-stacks/**
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

# models

## Purpose

All of Jimbo's LLM usage routes through a curated model catalogue kept as
markdown files in the hub repo (`hub/models/`, `hub/model-stacks/`). These
two features are the dashboard's editor over that registry: browse models
with pricing/context/status, mark them preferred or deprecated, and compose
model *stacks* — ordered fallback chains of model ids. Hermes' tier config
and per-job model pins pick from this catalogue, so keeping it accurate here
is what keeps model choice a one-click decision everywhere else.

## Responsibilities

- `ModelsService`: load the catalogue via the dashboard-api proxy
  (`/api/hub-models`), expose `models`/`activeModels` (non-deprecated)
  signals, and CRUD where every write is forwarded to jimbo-api's git
  pipeline (pull/commit/push to hub).
- Models list: TanStack-table with provider/name/status/context and
  OpenRouter pricing converted from USD-per-token strings to $/MTok;
  deprecated rows styled down.
- Model form: full metadata editing — status, source, provider, pricing
  (entered as $/MTok, converted back to per-token strings at the submit
  boundary), architecture modalities, capability classes, lifecycle dates,
  markdown body. Delete pushes a delete commit.
- `ModelStacksService` + list/detail/form: same store pattern for stacks;
  a stack's metadata is a newline-edited `chain` of model ids plus
  `is_active`.
- Does NOT own model *selection* (hermes tiers/pins) or usage stats —
  `stats` is an explicitly mocked empty placeholder.

## Public API

Both lazy-loaded as children of `/config` (`config.routes.ts`):

- `/config/models` → `ModelsList`; `/config/models/new` → `ModelForm`;
  `/config/models/:provider/:name` → `ModelDetail`;
  `/config/models/:provider/:name/edit` → `ModelForm`. (Model ids are
  `provider/name`, so links split the id into two route segments.)
- `/config/model-stacks` → `ModelStacksList`; `new` → `ModelStackForm`;
  `:id` → `ModelStackDetail`; `:id/edit` → `ModelStackForm`.

`ModelsService` (root): `models`, `activeModels`, `isLoading`, `error`,
`getById`, `create`, `update`, `remove`, `reload`, plus mocked
`stats`/`getStatsFor`. Consumed cross-feature by hermes (control-room model
pin, model-prefs typeahead). `ModelStacksService` mirrors it (`stacks`,
`activeStacks`, same CRUD).

## Lifecycle

Registered via `config.routes.ts` `loadChildren`, rendered inside the
`ConfigPage` shell; no guards. Both services load once in their
constructors and cache for the app lifetime (`reload()` exists but no UI
calls it). Seed mode (`?seed=1`) substitutes `SEED.models` /
`SEED.model_stacks`. CRUD methods return Observables; forms subscribe,
toast, then navigate to the detail page from the server's authoritative
response.

## Dependencies

- **API** (`environment.dashboardApiUrl`): `GET|POST /api/hub-models`,
  `PATCH|DELETE /api/hub-models/{id}`; `GET|POST /api/hub-model-stacks`,
  `PATCH|DELETE /api/hub-model-stacks/{id}`. dashboard-api proxies to
  jimbo-api, which owns the hub git working tree.
- **Domain**: `@domain/models` (`Model`, `ModelMetadata`,
  `OpenRouterPricing`, `modelProvider`/`modelLocalName`/`modelRuntimeId`),
  `@domain/model-stacks`, `@domain/capability`, `@domain/seed`.
- **Shared**: `UiDataTable` (TanStack angular-table), ToastService,
  seed-mode, UI kit (badge, button-link, page-header, loading/empty states).
- **Third-party**: `@tanstack/angular-table` (models list only).

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — Zero `*.spec.ts` files in either
  `src/app/features/models/` or `src/app/features/model-stacks/` — the
  $/MTok ↔ per-token conversions and metadata assembly in `model-form.ts`
  are untested.
- `2026-07-07` — Stats are a stub by design: `MOCK_STATS` is an empty
  array, so `getStatsFor` always returns `undefined`; the service comment
  defers to a "future observability dashboard [reading] from the costs
  table".
- `2026-07-07` — Unlike actors, responses are trusted without schema
  validation (`http.get<Model[]>` straight into the signal) — a drifted
  API shape flows silently into the UI.
- `2026-07-07` — Stack chains are edited as a free-text newline list with
  no validation that entries are real catalogue model ids.
- `2026-07-07` — `handleError`'s nested error-unwrapping and the
  `parseList`/`joinList` helpers are copy-pasted across `model-form.ts`,
  `model-stack-form.ts`, and the skills feature's `skill-form.ts`.
- `2026-07-07` — Deletes confirm via native `confirm()`; a model delete
  immediately pushes a commit to hub with no undo.
