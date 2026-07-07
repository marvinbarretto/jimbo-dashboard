---
module: grooming
repo: dashboard
description: Kanban board over vault-item grooming_status — the pre-dispatch funnel where captures get classified, decomposed, and approved to ready — plus grooming config settings.
source_paths:
  - src/app/features/grooming/**
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

# grooming

## Purpose

Everything Jimbo captures lands ungroomed; nothing should reach an agent
until it has been classified, decomposed, and passed the Definition-of-Ready
gate. The grooming board is the operator surface for that funnel: one column
per `grooming_status`, drag to move, inline backfill of the metadata
(project, epic, owner, priority) that the readiness checks demand. It is a
thin view — almost all state and mutation logic lives in the vault-items
feature; this module contributes the board choreography and the
grooming-specific gestures.

## Responsibilities

- `GroomingBoard` (584 lines, the bulk of the feature): columns from
  `GROOMING_STATUS_ORDER`, cards built into `GroomingCardContext` for the
  unified `<app-vault-card>` (project chip, open-question badge, epic child
  rollup, parent link, staleness/pulse from `latest_activity_at`,
  days-in-column, source attribution). Epics (items with children) are
  excluded — containers aren't dispatchable work. Facet filters
  (Project/Owner/Priority/Epic drill-down) + search + sort mode, all synced
  to the URL; per-card pickers for project/epic/owner/priority backfill;
  card actions routed to commands (approve, archive, delete, demote-to-note,
  and answer/decompose/reject which open the detail modal).
- `GroomingCommands`: the board's gesture layer. `moveColumn` (drag —
  deliberately `force: true`, bypassing the transition allowlist for
  exploration-time shoves; the strict gate stays on `approveForDispatch`) and
  `quickReject` (park to `needs_rework` with reason; auto-reassign rule lands
  it on @marvin).
- `GroomingConfigService` + `GroomingSettingsPage`: which executor + skill
  runs the GitHub-issue assessment (`github_assessment_executor`,
  `github_assessment_skill`), read/written via the grooming config endpoint.
- Does NOT own vault mutations, readiness computation, or the transition
  allowlist — those live in vault-items commands and `@domain/vault`. Prefers
  the board API's embeds (children counts, days-in-column, open questions)
  over per-item service loads; parallel loads only fire in seed mode.

## Public API

Routes (`grooming.routes.ts`, mounted at `/grooming`):

- `/grooming` → `GroomingBoard`
- `/grooming/settings` → `GroomingSettingsPage`

Nothing else in the app imports from this feature — it is a leaf; its
influence flows through the vault-items services it calls.

## Lifecycle

Lazy `loadChildren` at `/grooming`; no guards. The board renders whatever
`VaultItemsService` has already bulk-loaded (root singleton). Constructor
wires `withVaultDetailModal()` (`?detail=<seq>` ↔ detail dialog), hydrates
filters/search/sort from query params once (`take(1)`), then an effect owns
URL write-back with `replaceUrl`. Config loads on settings-page injection via
`toSignal`.

## Dependencies

- **jimbo-api**: directly only `GET|PUT /api/grooming/config`; everything
  else goes through vault-items services (`/api/vault/board`,
  `/api/vault/notes/by-seq/*`, `/api/vault-item-projects`,
  `/api/note-activity`) — see the vault-items module doc.
- **Domain**: `@domain/vault` (status order/labels, `effectivePriority`,
  `stuckDays`, sort comparators), `@domain/ids`, `@domain/thread`.
- **Other features**: vault-items (store + `VaultItemCommands`), actors,
  projects, thread (open-question lookups, seed mode).
- **Shared**: vault-card, kanban-column, kanban-filter-bar, epic-rollup,
  drag-state / filter-state / filter-groups / detail-modal composables,
  `CommandShortcutsService`, seed-mode, ui-button-link.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — Only one spec in the feature
  (`grooming-commands.spec.ts`); the 584-line board container — facet
  skip-logic, epic rollup mapping, picker scoping rules — has no tests, and
  neither do the config service or settings page.
- `2026-07-07` — Acknowledged follow-up in `groomingToRollup`: epic child
  rollups collapse everything pre-ready into `'grooming'`; "per-item dispatch
  result (running / completed / failed) wiring is a follow-up" (in-code
  comment), so rollup dots can't show execution state yet.
- `2026-07-07` — `applyFilters` recomputes the container-set with
  `items().some(...)` per item inside a filter over all items — an O(n²)
  pass on every filter change (execution-board's equivalent builds a `Set`
  first). Works at current vault size (~2.3k items per service comment).
- `2026-07-07` — Mobile default column is hardcoded to `intake_rejected`
  ("where most operator attention lands") — an editorial assumption baked
  into code rather than config.
- `2026-07-07` — `GroomingAssessmentExecutor` is a hardcoded union of four
  actor ids (`jimbo|marvin|kipper|boris`) in the config service, duplicating
  what the actors table already knows.
