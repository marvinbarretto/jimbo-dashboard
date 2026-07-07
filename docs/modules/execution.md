---
module: execution
repo: dashboard
description: Three-lane execution board unifying human (manual-track) tasks and agent commissions from the dispatch queue, plus dispatch lifecycle commands and board settings.
source_paths:
  - src/app/features/execution/**
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

# execution

## Purpose

The "what is actually being worked on" view. After grooming produces `ready`
items, work happens on two tracks — Marvin doing it by hand, or an agent
commission moving through the dispatch queue — and this board puts both on
the same three lanes (Ready / In Progress / Done) so one glance answers
"where is everything in my flow". It replaced an earlier per-commission-stage
column layout (one card per dispatch, eight columns) with one card per ITEM
and the fine-grained commission stage shown as a pill on the card.

## Responsibilities

- `DispatchService`: root signal store over the dispatch queue.
  Zod-validated load (capped at `limit=100` by the API), status narrowing
  from the wider production enum to the dashboard union (raw `db_status`
  preserved for the commission grouping), the derived `commissions` computed
  (one `CommissionItem` per vault item via `groupCommissions`), and
  mutations: `retry` (failed → approved, server owns the column flip),
  `delete` (terminal-status-gated hard delete), `clearTerminal` (bulk
  column sweep).
- `DispatchCommands`: gesture layer mirroring `VaultItemCommands` — `dismiss`,
  `archiveTaskAndDismiss` (archive vault item first, then delete the row),
  `clearCompleted`, `clearFailed`. Boards call this, not the service.
- `ExecutionBoard`: lane derivation (`laneForStage` for commissions,
  `laneForManual` from `started_at`/`completed_at` for humans), manual-card
  eligibility (leaf tasks that are groomed-ready or human-owned, minus
  anything already commissioned — no double-show), drag-and-drop for manual
  cards only (drops map to `moveToReady`/`startWork`/`complete`), shared
  Project/Owner/Priority/Epic facets with URL sync, search, board-level
  create bar, and Done-lane auto-clear driven by config.
- `ExecutionConfigService` + `ExecutionSettingsPage`:
  `done_lane_auto_clear_days` (null = never), read/written via the API's
  execution config setting.
- Does NOT own vault-item mutation rules (delegates to `VaultItemCommands`)
  or the post-completion human review gate (dispatch-review feature).

## Public API

Routes (`execution.routes.ts`, mounted at `/execution`):

- `/execution` → `ExecutionBoard`
- `/execution/settings` → `ExecutionSettingsPage`

Exports consumed elsewhere: `DispatchService` (vault-item detail shows
per-task dispatch history via `forTask`; fleet/projects query the same API
themselves), `DispatchCommands`, `CommissionCard`, `DispatchHistoryList`,
`ExecutionConfigService`.

## Lifecycle

Lazy `loadChildren` at `/execution`; no guards. `DispatchService` and
`ExecutionConfigService` are root-provided and fetch on first injection
(constructor / `toSignal` subscription). The board hydrates filter state from
query params once (`take(1)`), then an effect owns URL write-back
(`replaceUrl`). `withVaultDetailModal()` wires `?detail=<seq>` to the shared
vault detail dialog; opening a commission deep-links to its task seq.

## Dependencies

- **jimbo-api**: `GET /api/dispatch/queue?limit=100`,
  `POST /api/dispatch/{id}/retry`, `DELETE /api/dispatch/{id}`,
  `POST /api/dispatch/clear-terminal`, `GET|PUT /api/execution/config`.
- **Domain**: `@domain/dispatch` (`DispatchQueueEntry`, `CommissionItem`,
  `groupCommissions`, api-schema), `@domain/vault`, `@domain/ids`,
  `@domain/seed`.
- **Other features**: vault-items (store, commands, junctions, dependencies),
  projects, actors.
- **Shared**: vault-card + commission-card contexts, kanban column /
  filter-bar / drag-state / filter-groups / detail-modal composables,
  board-create-bar, `with-optimistic`, toast, `CommandShortcutsService`,
  seed-mode.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — Status narrowing collapses `rejected` and `removed` into
  `failed` (and `proposed` into `approved`); the raw value is carried as
  `db_status` specifically because the commission board needs what the
  narrowed union destroyed — two parallel status vocabularies ride on every
  entry.
- `2026-07-07` — `'dispatching'` is a dashboard-only status "reserved for a
  future real-time signal" (in-code comment) — dead state in the union today.
- `2026-07-07` — Retry has an acknowledged reconcile gap: on a malformed
  retry response the optimistic state is kept and the operator is told to
  refresh (comment: schema mismatch "is NOT a rollback case").
- `2026-07-07` — Queue read is a one-shot `limit=100` fetch with no paging or
  polling; a queue deeper than 100 silently truncates, and board state goes
  stale until reload (contrast: fleet polls its stats every 30s).
- `2026-07-07` — `window.confirm` for the Done-lane bulk clear rather than
  the app's dialog primitives.
- `2026-07-07` — Tests cover `dispatch.service.spec.ts` and
  `dispatch-commands.spec.ts`; the 579-line `ExecutionBoard` container (lane
  math, facet skip-logic, auto-clear cutoffs) and
  `ExecutionConfigService`/settings page have no specs.
