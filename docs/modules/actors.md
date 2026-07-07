---
module: actors
repo: dashboard
description: CRUD + profile pages for actors (humans, agents, systems) — the identity registry that vault assignment, dispatch, and project ownership hang off.
source_paths:
  - src/app/features/actors/**
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

# actors

## Purpose

Jimbo is a multi-actor system: Marvin, agents (Boris, Hermes-driven bots),
and system processes all create vault items, run dispatches, and own
projects. This feature is the registry UI for those identities — create and
edit actors with their kind/runtime/capabilities, and give each one a
profile page that answers "what is this actor actually doing?" (assigned
vault items, dispatch history with success rate, owned projects).

## Responsibilities

- Load and cache all actors as signals (`ActorsService`), with Zod
  validation of every API response (`ApiActorSchema`) — malformed payloads
  are rejected loudly (console + toast) rather than coerced.
- Optimistic create (with rollback on failure), patch, and delete of actors.
- Branded-ID lookup (`getById(id: ActorId)`) so plain-string actor refs
  don't compile.
- Actor profile page aggregating cross-feature data: assigned vault items,
  last 20 dispatches (+ failed/completed/success-rate stats), owned projects.
- Reactive form for create/edit: slug-pattern id (locked in edit mode),
  kind, runtime (empty-string sentinel → null), capability checkboxes
  (`serves` FormArray over `ALL_CAPABILITIES`).
- Does NOT own dispatch, vault, or project data — it reads their services
  for the profile page only.

## Public API

Lazy-loaded at `/config/actors` via `config.routes.ts`; bare `/actors`
redirects there (`app.routes.ts`). Routes (`actorsRoutes`):

- `` → `ActorsList`
- `new` → `ActorForm` (create mode)
- `:id` → `ActorPage` (profile)
- `:id/edit` → `ActorForm` (edit mode; id control disabled)

`ActorsService` (root-provided, consumed by many features — e.g. the
questions feature resolves author names through it): signals `actors`,
`activeActors`, `isLoading`; methods `getById`, `create`, `update`,
`remove`. Presentational components (`ActorStatTile`, `ActorVaultItemRow`,
`ActorDispatchRow`, `ActorProjectRow`) are internal to the profile page.

## Lifecycle

Child of the `config` feature's shell (`ConfigPage`), no guards.
`ActorsService` loads once in its constructor (first injection) and holds
state for the app's lifetime — there is no reload method. In seed mode
(`?seed=1`) it short-circuits to `SEED.actors`. `ActorPage` sets the
document title via an `effect` once the actor resolves.

## Dependencies

- **API** (`environment.dashboardApiUrl`): `GET|POST /api/actors`,
  `PATCH|DELETE /api/actors/{id}` (dashboard-api, jimbo_pg-backed; runtime/
  description/is_active columns from migration 0003 per service comment).
- **Domain**: `@domain/actors` (Actor, payloads, `ApiActorSchema` Zod),
  `@domain/ids` (branded `ActorId`, `actorId`, `wellKnownActorId`),
  `@domain/capability`, `@domain/vault` (`isActive`), `@domain/dispatch`,
  `@domain/projects`, `@domain/seed`.
- **Features** (profile page reads): `VaultItemsService`,
  `DispatchService` (`@features/execution`), `ProjectsService`.
- **Shared**: ToastService, seed-mode toggle, UI kit (badge, breadcrumb,
  card, page-header, section, meta-list, empty-state, prose, etc.),
  datetime pipes.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — `ActorForm.submit()` navigates to the detail page
  immediately after firing `create`/`update`; the service methods are
  fire-and-forget (void), so a server rejection surfaces only as a toast
  after the user has already landed on a page that may show rolled-back or
  stale data.
- `2026-07-07` — `ActorsService.update` is not optimistic and has no
  loading indication; `remove` updates state only on success but the list
  offers no feedback between click and completion. Deletion confirm is the
  native `confirm()` dialog.
- `2026-07-07` — Test note drift: `actors.spec.ts` says "no mock data —
  endpoint not yet live" while the service comment says the API now returns
  the full shape; the `activeActors` test asserts over an empty array
  (vacuously true). Tests do exist (`actors.spec.ts`,
  `actors-list.spec.ts`, `actor-form.spec.ts`) but none cover the service's
  HTTP/rollback paths or `ActorPage` aggregation.
- `2026-07-07` — The runtime options list in `actor-form.ts` (`ollama`,
  `anthropic`, `openrouter`, `hermes`) is hardcoded in the component rather
  than derived from `@domain/actors`' `ActorRuntime` type.
