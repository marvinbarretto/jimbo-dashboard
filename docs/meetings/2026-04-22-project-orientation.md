# Project Orientation

This document is the high-level orientation for new agents joining the Jimbo
Dashboard project.

## What This Project Is

Dashboard is the Angular control plane for the Jimbo ecosystem.

It is the operator and agent work surface for:

- morning briefing
- project/context memory
- vault notes and task intake
- grooming and readiness
- execution/dispatch
- email-to-work conversion
- system observation

The repo is named `dashboard`.

The backend system of record remains `jimbo-api`.

The current frontend implementation lives in the `site` repo, where the
Dashboard admin surfaces are currently mounted under routes like
[`src/pages/app/jimbo/dashboard/index.astro`](/Users/marvinbarretto/development/site/src/pages/app/jimbo/dashboard/index.astro)
and implemented by the main admin shell in
[`src/admin-app/App.tsx`](/Users/marvinbarretto/development/site/src/admin-app/App.tsx).

## What We Are Moving Away From

We are moving away from:

- UI-driven implementation where screens own business logic
- a partially coupled dashboard/API surface
- duplicated rules spread across views and hooks
- unclear workflow boundaries
- ad hoc state and implicit transitions
- backend/frontend drift without a deliberate contract

The current site implementation is useful context, but it is also the thing we
are intentionally evolving away from.

## What We Are Moving Toward

We are moving toward:

- domain-first architecture
- workflow-first modeling
- tabs as projections of domains
- explicit command and projection layers
- a framework-swappable presentation shell
- a durable database-backed control plane for many agents and many items
- test-first business rules and workflow coverage

## Current Architectural Commitments

- Angular 21 as the shell
- standalone components
- signals for local UI state
- TanStack Query for server state
- TanStack Table for list-heavy surfaces
- Zod at the API boundary
- Vitest for unit/component tests
- Playwright for e2e
- Postgres as the long-lived system-of-record database for the wider control
  plane
- Jimbo API as the coordination layer between the dashboard and persistence

## The Important Model Documents

New agents should read these in order:

1. [`docs/vision/control-plane.md`](../vision/control-plane.md)
2. [`docs/architecture/data-architecture.md`](../architecture/data-architecture.md)
3. [`docs/architecture/table-entity-model.md`](../architecture/table-entity-model.md)
4. [`docs/architecture/command-projection-matrix.md`](../architecture/command-projection-matrix.md)
5. [`docs/architecture/capabilities-map.md`](../architecture/capabilities-map.md)
6. [`docs/architecture/tech-choices.md`](../architecture/tech-choices.md)
7. [`docs/migration/concrete-plan.md`](../migration/concrete-plan.md)
8. [`docs/decisions/decision-log.md`](../decisions/decision-log.md)

## How We Arrived Here

The architecture was derived from:

- a review of the current Jimbo dashboard surfaces
- a review of the Jimbo API capabilities
- a domain-first analysis of the major workflows
- an assessment of the current codebase risks
- a comparison of Angular/React tradeoffs for a long-lived control plane
- a product goal of eventually supporting more than one user and more than one
  agent at scale

## Important Boundaries

- Dashboard should not become a second system of record.
- Dashboard should not own business rules that belong in the backend.
- Commands mutate durable state.
- Projections aggregate read models.
- History should be append-only where possible.
- Workflow policy should be explicit rather than hidden in UI code.

## Current Gaps To Watch

- no first-class dashboard command layer yet
- no stable composite projection endpoints yet
- cross-domain relationships still need formalization
- workflow policy is not yet first-class
- a unified entity reference model still needs standardization
- operator-action audit needs a clearer surface

## Useful Repo References

- [`site/src/pages/app/jimbo/dashboard/index.astro`](/Users/marvinbarretto/development/site/src/pages/app/jimbo/dashboard/index.astro)
- [`site/src/admin-app/App.tsx`](/Users/marvinbarretto/development/site/src/admin-app/App.tsx)
- [`site/src/admin-app/routes.tsx`](/Users/marvinbarretto/development/site/src/admin-app/routes.tsx)
- [`site/src/admin-app/dashboard/url-state.ts`](/Users/marvinbarretto/development/site/src/admin-app/dashboard/url-state.ts)
- [`jimbo-api/README.md`](../../jimbo-api/README.md)
- [`jimbo-api/openapi.json`](../../jimbo-api/openapi.json)
- [`jimbo-api/docs/specs/2026-04-20-grooming-state-machine.md`](../../jimbo-api/docs/specs/2026-04-20-grooming-state-machine.md)
- [`dashboard/docs/decisions/decision-log.md`](../decisions/decision-log.md)
- [`dashboard/docs/migration/concrete-plan.md`](../migration/concrete-plan.md)

## Working Rule For New Agents

If you are adding a new capability, first decide:

- is this a domain rule
- is this an application command/query
- is this a projection
- is this presentation only

If you cannot answer that cleanly, stop and update the model docs first.
