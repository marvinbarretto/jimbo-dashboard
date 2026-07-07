---
module: ui-lab
repo: dashboard
description: In-app component gallery at /ui-lab — a grouped sidenav registry of ~43 demo sections showcasing the shared UI kit with sample data.
source_paths:
  - src/app/features/ui-lab/**
  - src/assets/ui-components.json
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

# ui-lab

## Purpose

The dashboard is built from a bespoke shared component kit (chips, cards,
toggles, tab bars, kanban primitives…) rather than a third-party library, and
ui-lab is its living catalogue — a Storybook-substitute that runs inside the
app itself, so every primitive is exercised against the real theme tokens and
real change-detection setup. It's where a component's variants are made
visible before (and after) they're adopted across features, and where naming
conventions (actor = circle avatar, project = rounded square, etc.) are
documented by example.

## Responsibilities

- Owns `UiLabShell`: full-bleed two-column layout with a sticky grouped
  sidenav and a `<router-outlet>` content pane.
- Owns `componentRegistry` (in `ui-lab-shell.ts`): the canonical list of lab
  entries — id, name, group (`overview` / `identity` / `cards` /
  `forms-editing` / `detail-surfaces` / `utilities` / `workflows`), optional
  selector, description. The sidenav is computed from it (canonical group
  order, alphabetical within group).
- Owns 43 section components under `sections/`, each a standalone demo page
  rendering one shared component (or one pattern, e.g. list-workflow,
  hybrid-edit) with hardcoded sample data and, in some cases, interactive
  knobs (e.g. the vault-card kanban section).
- Does NOT own the components themselves — they live in
  `src/app/shared/components/**`; the lab only demonstrates them.

## Public API

- `/ui-lab` → `UiLabShell`, with `''` redirecting to `library-surface` and one
  child route per section (`/ui-lab/<id>` → `<Id>Section`), all enumerated
  explicitly in `app.routes.ts` (43 children at the reviewed commit).
- Exports: `UiLabShell`, `componentRegistry`, and the `LabGroup` /
  `LabRegistryEntry` types. Section components are route targets only.
- `src/assets/ui-components.json`: a 13-entry JSON variant of the registry.
  **It is not consumed anywhere** — a repo-wide grep finds no importer in
  `src/`, `scripts/`, `e2e/`, `angular.json`, or `package.json`. It was added
  in commit `d86e2b7` ("feat(ui-lab): left-nav with component registry") and
  appears to be a superseded first iteration of what is now the inline
  `componentRegistry`; it lags it badly (13 vs 43 entries, no `group` field).

## Lifecycle

Lazy end-to-end: the shell and every section are separate `loadComponent`
chunks. No guards, no data fetching — everything renders from static sample
data, so the lab works regardless of API state. `groupedSections` is a
`computed` over the static registry (reactive plumbing, constant value).

## Dependencies

- **Shared components**: essentially the whole kit — identity chips/avatars,
  vault/commission/epic cards and their slot primitives, buttons, icons,
  toggles, inline-edit, tab bars, segmented controls, filter pills, steppers,
  loading/refresh utilities, datetime pipes, prose renderer (one section per
  entry; see `componentRegistry` for the authoritative list).
- **jimbo-api endpoints**: none.
- **Domain models**: none; sections fabricate their own VM sample objects.
- **Other features**: none (the epic-cards experiment page lives in
  `features/test`, outside the lab, by design — see its header comment).

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — `src/assets/ui-components.json` is dead weight: zero
  references anywhere in the repo, stale relative to the inline registry
  (13/43 entries), yet still shipped as a static asset. Either delete it or
  make the shell consume it.
- `2026-07-07` — Registry/route duplication: every section needs a
  `componentRegistry` entry (id) *and* a matching child route in
  `app.routes.ts`, kept in sync by hand. A registry id without a route 404s
  from the sidenav; a route without an entry is unreachable from the nav.
- `2026-07-07` — Section descriptions duplicate prose that also appears in
  the registry entries (and previously in the JSON) — three copies of some
  component descriptions have already drifted.
- `2026-07-07` — No tests: zero spec files under the feature and no e2e spec
  touches `/ui-lab`. Low risk for a demo surface, but regressions in shared
  components won't be caught here either.
