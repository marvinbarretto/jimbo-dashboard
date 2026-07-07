---
module: picture
repo: dashboard
description: "\"The Picture\" — the UI over Jimbo's interrogate model of Marvin: belief entities with feedback/proposals, the clarifications queue, and editable context files."
source_paths:
  - src/app/features/picture/**
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

# picture

## Purpose

The dashboard surface for Jimbo's model of Marvin (the interrogate system):
what Jimbo currently believes about his values, priorities, goals, interests,
experiments, no-gos, tensions and open questions — and the feedback loops
that keep that model honest. Three tabs: **Beliefs** (read, edit, mark
accurate / not-quite-right as evidence rows, and review agent-generated
change proposals), **Clarifications** (the queue of questions Jimbo has asked
to disambiguate or validate, answerable inline), and **Context** (the
file → section → item store of ambient context, editable in place). The point
is a single place where the human corrects the machine's self-model instead
of the model drifting silently.

## Responsibilities

- Owns `InterrogateSnapshotService`: one `/api/interrogate/snapshot` fetch
  shared by the Beliefs and Context tabs, exposed as per-entity-type computed
  signals, with surgical local patch helpers (`patchEntity`,
  `patch/remove/addContextItem`) so writes update the view without refetch.
- Owns the write services: `InterrogateEntityService` (content edits — sent
  as `hypothesis` for experiments — and manual evidence rows that feed the
  API's contradiction/staleness scoring), `InterrogateProposalsService`
  (accept/reject pending proposals), `ClarificationsService` (filterable
  list, answer, dismiss; answering returns an LLM `echo` shown as the
  toast), `ContextService` (item add/edit/delete within sections).
- Owns the deep-link behaviour: `/picture?tab=…&clarification=<id>` selects a
  tab and scrolls/highlights a specific clarification, bypassing the default
  open-only filter.
- Owns `HorizonsLab`, an explicitly throwaway layout exploration charting
  Priorities/Ambient items across time horizons, fed by the live snapshot.
- Does NOT own the interrogate entities, scoring, proposal generation or
  clarification creation — all jimbo-api; nor the vault (separate feature).

## Public API

`picture.routes.ts`, mounted at `/picture` via `loadChildren` in
`src/app/app.routes.ts`:

- `/picture` → `PicturePage` (title "The Picture"; tabs `beliefs` /
  `clarifications` / `context` as local state, seeded from `?tab=`)
- `/picture/horizons-lab` → `HorizonsLab` (not linked from nav; the route
  comment says delete once a direction is picked)

The five data-access services are root-provided and importable, but no other
feature currently consumes them; `util/interpreted-action.format.ts` and
`util/clarification-filter-groups.ts` are feature-internal helpers.

## Lifecycle

Lazy `loadComponent` per route. `PicturePage`'s constructor triggers the one
shared snapshot load and reads `?tab=` once (`take(1)`); `BeliefsTab` adds
its own pending-proposals fetch; `ClarificationsTab` loads clarifications,
defaults the status filter to `open` unless deep-linked, and uses a
run-once effect to scroll the highlighted card into view after it renders.
All mutations are subscribe-and-toast: success paths patch the snapshot
signal (or the local list) in place; failures unwrap the API's nested
`error.error.message` envelope into a toast. No polling, no guards.

## Dependencies

- **jimbo-api**: `/api/interrogate/snapshot`; `PATCH
  /api/interrogate/{values|priorities|goals|…}/:id` (segment map
  `ENTITY_TYPE_SEGMENT`); `GET/POST /api/interrogate/evidence`;
  `GET/PATCH /api/interrogate/proposals[/:id]`; `GET /api/clarifications`,
  `POST /api/clarifications/answer`, `PATCH /api/clarifications/:id`;
  `PUT/DELETE /api/context/items/:id`, `POST /api/context/sections/:id/items`.
- **Domain**: `@domain/interrogate` (entity types, snapshot shape,
  `normalizeBeliefEntity`, segment/key maps), `@domain/clarifications`,
  `@domain/ids` (branded ids).
- **Shared**: kanban-filter-bar + kanban filter-state, ui-inline-tabs,
  ui-filter-pills, ui-prose, ui-badge, ui-stat-card, kanban-column
  (horizons-lab), `ToastService`.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — `HorizonsLab` is self-declared throwaway ("delete this
  route once a direction is picked") and hardcodes the Priorities file's
  section names (`SECTION_BUCKET`: "This Week", "Active Projects", …) — a
  rename in the context file silently rebuckets items via the fallback.
- `2026-07-07` — The identical private `unwrapError` helper is copy-pasted
  across four services (clarifications, context, entity, proposals) and
  inlined a fifth time in `interrogate-snapshot.service.ts`.
- `2026-07-07` — Only `util/interpreted-action.format.spec.ts` exists; the
  services (including the snapshot's nested context-patch walking) and tabs
  are untested.
- `2026-07-07` — Evidence writes (`addEvidence`) update nothing locally —
  no staleness/score refresh on the card until a full snapshot reload.
