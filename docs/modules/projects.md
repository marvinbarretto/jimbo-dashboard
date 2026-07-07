---
module: projects
repo: dashboard
description: Project registry CRUD plus the per-project landing page — brief fields, epics, GitHub issues panel, understanding/beliefs, dispatch and focus-session summaries.
source_paths:
  - src/app/features/projects/**
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

# projects

## Purpose

Projects are the organising axis of Marvin's portfolio (localshout, jimbo,
spoonscount, …): every vault item, dispatch, and focus session hangs off one.
This feature owns the project records themselves (create/edit/archive, colour
palette, ownership) and the project landing page — the "home" for a project
that pulls the scattered signals (epics and their children, GitHub backlog,
Jimbo's belief model, in-flight dispatches, focus time, brief fields) onto a
single URL.

## Responsibilities

- `ProjectsService`: root signal store over `/api/projects`. Zod-validated
  load, optimistic create/update/delete with rollback, colour assignment from
  `PROJECT_PALETTE` (`pickProjectColor`), and per-field diff events on update
  (criteria/owner/status changes each emit a project activity event — "every
  mutation produces an event", never silent writes).
- `ProjectLanding`: the landing page. Derives project-linked items from the
  vault store (primary embed ∪ junction rows), groups epics with
  outstanding/done children, renders the brief (repo-synced fields locked
  read-only when `synced_at` is stamped), autonomy-level control, and four
  `httpResource` panels: understanding/beliefs (with open-belief detection),
  in-flight dispatches, project activity, and the GitHub issues panel with
  its own facet filter (defaults to "not in Jimbo") and one-click
  promote-into-pipeline.
- `ProjectsList`: active projects split by kind (major/minor/admin) plus an
  archived tab and a cross-project epic-momentum rail; opens
  `ProjectFormDialog` from ghost tiles.
- Brief editing: `ProjectBriefField` (save-on-blur textarea with mention
  triggers) and `brief-mention-triggers.ts` (inline `@actor/project` and
  `~vault-item` completions that stay in the prose as plain text).
- `ProjectActivityEventsService`: typed stub — local-only optimistic events;
  no `project_activity` table exists in jimbo_pg yet (seed mode renders
  fixtures).
- Does NOT own vault items, focus sessions (pomo feature), or actors — it
  reads their stores.

## Public API

Routes are mounted in two places:

- `config/projects` (via `config.routes.ts` → `projectsRoutes`):
  `''` → `ProjectsList`, `new` → `ProjectForm`, `:id` → redirect to
  `/projects/:id`, `:id/edit` → `ProjectForm`.
- `/projects/:id` → `ProjectLanding` (registered directly in
  `app.routes.ts`); bare `/projects` redirects to `config/projects`.

Exports consumed elsewhere: `ProjectsService` (used by nearly every board for
project chips/filters), `PROJECT_PALETTE`/`pickProjectColor`, `ProjectCard`,
`ProjectFormDialog`.

## Lifecycle

Lazy at both mount points; no guards. `ProjectsService` is root-provided and
loads on first injection. `ProjectLanding`'s `httpResource` calls re-fetch
reactively when the route `:id` changes; the landing page also triggers
`FocusSessionsService.loadRecent(30)` and wires the `?detail=<seq>` vault
modal (`withVaultDetailModal`).

## Dependencies

- **jimbo-api**: `GET|POST /api/projects`, `PATCH|DELETE /api/projects/{id}`
  (via `environment.dashboardApiUrl`); landing-page resources use relative
  URLs — `GET /api/projects/{id}/understanding`,
  `GET /api/projects/{id}/activity?limit=20`,
  `GET /api/dispatch/queue?status=running,approved&project_id={id}&limit=10`,
  `GET /api/github-issues?project_id={id}`,
  `POST /api/github-issues/promote`; mention typeahead hits
  `GET /api/search`.
- **Domain**: `@domain/projects` (incl. brief fields + `EMPTY_PROJECT_BRIEF`),
  `@domain/vault`, `@domain/activity`, `@domain/ids`, `@domain/actors`,
  `@domain/seed`.
- **Other features**: vault-items (items + junctions), actors, pomo
  (`FocusSessionsService`).
- **Shared/third-party**: ui-* primitives, kanban filter bar/state, mentions,
  toast, pipes; `@tanstack/angular-table` for the unassigned-items table;
  `@angular/cdk` dialog + drag-drop.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — `ProjectActivityEventsService` is a documented stub: events
  post to local signal state only and vanish on reload; `loadFor()` returns
  empty outside seed mode. In-code comment says to add a `project_activity`
  table + endpoint "when we want this for real". Meanwhile the landing page
  shows real activity from a *different* source
  (`/api/projects/{id}/activity`), so two activity notions coexist.
- `2026-07-07` — Two parallel create/edit forms: `ProjectForm` (page route)
  and `ProjectFormDialog` (list dialog) duplicate the field set, slug
  directive, palette, and owner typeahead.
- `2026-07-07` — URL-base inconsistency inside one container:
  `ProjectLanding`'s `httpResource`/promote calls use relative `/api/...`
  paths while every service in the feature uses
  `environment.dashboardApiUrl` — works only while the app is same-origin
  with the API.
- `2026-07-07` — Open-belief detection includes a hardcoded keyword regex
  (`unconfirmed|tbd|tbc|…`) over belief text — heuristic, silently drifts
  from however beliefs are actually tagged.
- `2026-07-07` — Tests: 6 spec files exist (landing, list, form, stat-tile,
  focus-session-row, feature-level `projects.spec.ts`) but none cover
  `ProjectsService` diff-event emission or `brief-mention-triggers`.
