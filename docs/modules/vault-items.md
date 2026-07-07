---
module: vault-items
repo: dashboard
description: Core vault CRUD feature — list/detail/form surfaces, the unified detail dialog, and the layered data-access + command architecture every board builds on.
source_paths:
  - src/app/features/vault-items/**
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

# vault-items

## Purpose

The vault (notes/tasks/epics in jimbo-api) is the substrate of the whole
dashboard — grooming, execution, and project pages are all views over vault
items. This feature owns the canonical client-side store of those items and
the discipline around mutating them: optimistic writes with rollback, audit
events on every semantic change, and a command layer that keeps funnel rules
(readiness gates, transition allowlists, auto-reassignment) in one readable
place instead of scattered across boards.

## Responsibilities

- `VaultItemsService`: the root signal store. Bulk-loads the board-shaped
  query once (Zod-validated), adapts the production `VaultNote` wire shape to
  the dashboard's `VaultItem` (type/category split, grooming-status narrowing,
  derived `archived_at`), and owns all single-column mutations (create,
  update, archive/unarchive, setCompleted, setGroomingStatus, reassign,
  setEpic, rejectItem, remove) — each optimistic, each emitting its audit
  event.
- `VaultItemCommands`: compound, gated operations — `approveForDispatch`
  (THE readiness gate to `ready`), `setStatus` with transition allowlist +
  auto-reassign per grooming state, `startWork`/`moveToReady`/`complete`
  (manual-track lane moves), `rejectWithReason`, `reconcileOwnership`.
  Components call this, not the service — enforced by ESLint rule
  VAULT-COMMANDS-001 plus the `VAULT_ITEMS_READ` injection token
  (`vault-items.read.ts`), a type-narrowed read-only view of the same
  singleton for consumers that only read.
- Sibling stores: `ActivityEventsService` (per-item timeline; local-optimistic
  post, server writes rows as mutation side effects),
  `VaultItemDependenciesService` (blocker edges), `VaultItemProjectsService`
  (item↔project junctions, bulk-loaded; first link becomes primary).
- The unified detail dialog: `VaultItemDialogStore` (component-scoped state
  owner, Draft vs Item `DialogMode`, fresh/mature stage), the detail-body
  component tree (identity header, pipeline stepper, activity log, reject
  form, questions, links, tags, delivery blocks), and `createWithRelations`
  for the dialog's create-then-link gesture.
- Does NOT own routing decisions of host surfaces (page vs modal), thread
  messages (thread feature), or board-specific gestures (grooming/execution
  command layers wrap this one).

## Public API

Routes (`vault-items.routes.ts`, mounted at `/vault-items`):

- `/vault-items` → `VaultItemsList` (filterable table, 500-row cap)
- `/vault-items/new` → `VaultItemForm`
- `/vault-items/:seq` → `VaultItemDetail` (page host of the shared body)
- `/vault-items/:seq/v2` → `VaultItemDetailV2` (#10 tabbed redesign, side-by-side comparison surface)
- `/vault-items/:seq/edit` → `VaultItemForm`

Exports other features consume: `VaultItemsService` (via the seam dirs),
`VAULT_ITEMS_READ`, `VaultItemCommands`, `ActivityEventsService`,
`VaultItemDependenciesService`, `VaultItemProjectsService`,
`VaultItemDialogStore` + `DialogMode`/`DraftPayload`, and the
`VaultItemDetailDialog` opened by the shared `?detail=<seq>` modal helper.

## Lifecycle

Lazy `loadChildren` at `/vault-items` in `app.routes.ts`; no guards. The
root services are `providedIn: 'root'` and load eagerly on first injection
(constructor `load()`), so whichever board renders first pays the bulk fetch;
seed mode swaps in `SEED` fixtures. `VaultItemDialogStore` is provided
per-host (dialog shell and page containers) via hierarchical DI.

## Dependencies

- **jimbo-api**: `GET /api/vault/board?limit=5000` (bulk read),
  `POST /api/vault/notes` + `PATCH|DELETE /api/vault/notes/by-seq/{seq}`
  (mutations), `POST /api/thread-messages` (rejection note),
  `GET /api/note-activity?note_id=`, `GET|POST /api/vault-item-dependencies`,
  `GET|POST /api/vault-item-projects`. All via `environment.dashboardApiUrl`.
- **Domain**: `@domain/vault` (item, source, readiness, transitions,
  grooming-ownership, api-schema), `@domain/ids`, `@domain/activity`,
  `@domain/actors`, `@domain/thread`, `@domain/seed`.
- **Shared**: `with-optimistic` helpers, `ToastService`, `seed-mode`,
  `@shared/kanban/detail-modal`, `@shared/mentions`.
- **Other features**: thread (service + commands), actors, projects (dialog
  store lookups).

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — Explicit TODO in `vault-items.service.ts` (~line 741): the
  single-note `ApiVaultNoteResponse` interface is hand-written while the list
  shape already has a Zod schema — migrate it in a follow-up pass.
- `2026-07-07` — Acceptance criteria round-trip through free text (joined
  with `\n`); the `done` flag on each criterion is lost on reload "until the
  API gains structured AC" (in-code comment).
- `2026-07-07` — Two detail bodies coexist: `vault-item-detail-body` and
  `vault-item-detail-body-v2` are deliberate parallel surfaces for the #10
  redesign comparison — one must eventually win and the other be deleted.
- `2026-07-07` — Several creates need follow-up PATCHes because
  `CreateNoteBody` rejects `grooming_status`/`assigned_to`; a follow-up
  failure leaves server state diverging from what the form asked for (toast
  only). `archived_at` is reconstructed from `updated_at`, so it drifts if an
  archived row is touched again.
- `2026-07-07` — Test coverage is the best of the six board features: 11
  spec files (service, projects-junction, commands, dialog mode + store,
  list/detail/form containers, activity-log formatter + verbosity). No specs
  for `ActivityEventsService`/`VaultItemDependenciesService` mutations.
