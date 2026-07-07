---
module: shared
repo: dashboard
description: Cross-feature toolkit — 81 UI components (ui-* primitives through Jimbo-specific cards/chips), kanban composables, the mention system, pipes, data-access helpers, and app-wide services.
source_paths:
  - src/app/shared/**
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

# shared

## Purpose

Everything more than one feature needs but no feature owns: the visual
vocabulary (buttons, chips, cards, tab bars) that keeps ~25 feature areas
looking like one dashboard, plus the behavioural composables — kanban
filtering/drag state, `@`-mention pickers, optimistic updates — that would
otherwise be reimplemented per board. The `ui-lab` feature exists largely to
showcase this module's components in isolation.

## Responsibilities

- The standalone component library under `components/` (81 folders).
- Reusable board logic (`kanban/`), the mention/picker system (`mentions/`),
  data-access primitives (`data-access/`), pipes, validators, date/text
  utils, and two app-wide services (theme, keyboard shortcuts).
- `seed-mode.ts` — the `?seed=1` URL toggle services check to serve
  `@domain` fixtures instead of HTTP.
- Does NOT own pages/routes, feature data services, or domain logic
  (staleness/readiness/sort maths live in `@domain`; shared components only
  render them).

## Public API

All consumed via the `@shared/*` tsconfig path. Component families rather
than a full listing:

- **ui-\* primitives** (~45): layout (`ui-card`, `ui-section`/`ui-subsection`,
  `ui-stack`, `ui-cluster`, `ui-page-header`, `ui-sticky-action-bar`),
  controls (`ui-button(-link)`, `ui-toggle`, `ui-segmented`, `ui-tab-bar`,
  `ui-inline-tabs`, `ui-filter-pills`, `ui-select-chip`, `ui-stepper`,
  `ui-dropdown`, `ui-typeahead`, `ui-inline-edit`, `ui-inline-picker`,
  `ui-quick-add-row`), display (`ui-badge`, `ui-timestamp`, `ui-prose`,
  `ui-empty-state`, `ui-loading-state`, `ui-data-table`, `ui-meta-list`,
  `ui-stat-card`, `ui-progress-meter`, `ui-readiness-panel`), charts
  (`ui-bar-chart`, `ui-donut-chart` via ng2-charts), and period/tracker
  scaffolding (`ui-period-shell`/`-pager`/`-totals`, `ui-tracker-row`,
  `ui-tracker-day-group`, `tracker`).
- **Jimbo entity components**: chips/avatars (`entity-chip`, `actor-chip`/
  `actor-avatar`, `project-avatar`, `vault-chip`, `tag-chip`, `app-chip`,
  `job-chip`, `chip`), cards/rows (`vault-card`, `epic-card`/`epic-row`/
  `epic-rollup`/`epic-momentum-row`, `card-callout`, `card-parent-link`),
  badges (`priority-badge`, `blocker-badge`, `epic-badge`,
  `dispatch-status-badge`, `commission-stage-pill`).
- **Chrome & input**: `nav` (+ `nav-config.ts`, the `primaryNavItems`/
  `navGroups` source the app shell reads accents from), `sub-nav`,
  `modal-shell`, `table-shell`, `toast`/`ToastService`, `app-icon`
  (lucide-backed registry), `capture-input`, `smart-composer-input`,
  `question-reply-composer`, `board-create-bar`.
- **kanban/**: `createKanbanFilterState` composable (Set-per-dimension
  filters; boards own the predicates), `filter-groups`, `drag-state`,
  `detail-modal` + `detail-nav` (CDK Dialog opening of vault-item detail),
  `card-link.directive`.
- **mentions/**: `MentionDirective`, `PickerInputDirective`,
  `MentionService`, `mention-dropdown`, and prebuilt triggers (`tagTrigger`,
  `projectActorTrigger`, `vaultItemTrigger`, `projectPickerTrigger`,
  `epicPickerTrigger`).
- **data-access/**: `with-optimistic.ts` (three snapshot→optimistic-set→
  rollback-on-error helpers, DI-free, replacing ~30 hand-rolled copies) and
  `load-one.ts` (signal-driven cold fetch for deep-linked detail pages,
  returning `{ data, loading, error }`).
- **pipes/**: `datetime`, `relative-time`, `london-time`, `markdown`
  (marked-backed), `format-tag`, `project-label`.
- **services/**: `ThemeService` (light/dark signal, `data-theme` attribute,
  localStorage `dashboard.theme`), `CommandShortcutsService` (global `/` →
  search dialog, `⇧N` → capture dialog).
- **forms/ + validation/ + utils/**: `slug-from.directive`,
  `acceptance-criterion-length` validator, `slugify`, `date-keys`,
  `datetime.utils`, `prose.utils`, `rolling-median`.

## Lifecycle

No self-registration — components are standalone and imported per use.
Exceptions wired at startup: the root `App` component renders `Nav` and
`ToastStack` and injects `ThemeService` (constructor `effect` stamps
`data-theme` on `<html>`) and `CommandShortcutsService` (constructor binds a
document `keydown` listener for the app's lifetime). `isSeedMode()` caches its
URL check on first call per page load.

## Dependencies

- **Internal**: `@domain/*` types and derived-signal functions throughout.
  Three files import from `@features/*`: `CommandShortcutsService` (search
  dialog, vault-item detail dialog), `kanban/detail-modal.ts` (same dialog),
  and `smart-composer-input` (actors/projects/vault-items data services).
- **External**: `@angular/cdk` (dialog, overlay, portal), `ng2-charts` +
  `chart.js`, `lucide-angular` (icon registry), `marked` (markdown pipe),
  `flatpickr` (+ weekSelect/monthSelect plugins) for date pickers, rxjs.
- **jimbo-api**: no direct endpoint calls — HTTP goes through feature
  data-access services; `load-one`/`with-optimistic` are handed observables.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — Layering inversion: shared imports feature code in three
  places (`command-shortcuts.service.ts`, `kanban/detail-modal.ts`,
  `smart-composer-input.ts` reaching into `@features/vault-items`, `search`,
  `actors`, `projects`). Works because those features are effectively
  app-level singletons, but it makes "shared" non-extractable.
- `2026-07-07` — Test coverage is thin and lopsided: 6 spec files across 81
  component folders (toast service, ui-inline-edit, ui-period-totals,
  ui-mention-chip-strip, question-reply-composer, tracker.types); logic
  modules are better covered (kanban filter-groups, with-optimistic, pipes,
  utils, validation). Consistent with the repo's E2E-preferred convention.
- `2026-07-07` — Known unfixed race documented in `with-optimistic.ts`:
  concurrent updates to the same row aren't serialised — an earlier failure's
  rollback can silently undo a later optimistic change. Accepted in-source as
  theoretical for a single-operator dashboard.
- `2026-07-07` — Chip/badge proliferation: eight chip-ish components
  (`chip`, `app-chip`, `entity-chip`, `tag-chip`, `vault-chip`, `actor-chip`,
  `job-chip`, `ui-select-chip`) with overlapping roles; `job-chip` (commit
  10288ae, "one visual grammar for jobs everywhere") is the stated
  consolidation direction, but the older ones all remain.
