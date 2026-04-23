# Start Here

This document is the shortest useful entrypoint for new agents joining the
Jimbo `dashboard` project.

## What This Project Is

`dashboard` is the Angular control plane for the Jimbo ecosystem.

It is being built as:

- a domain-first system
- a workflow-first system
- a projection layer over backend truth
- a future product that can be configurable and reusable

## What We Are Moving Away From

The current `site` dashboard is useful context, but it is not the long-term
shape.

We are moving away from:

- UI-driven business logic
- workflows embedded in page components
- duplicated readiness rules
- route state being the source of truth
- ad hoc cross-domain linking
- dashboard code that guesses at backend invariants

## What We Are Moving Toward

We want:

- explicit backend-owned workflow rules
- stable domain and application layers
- dashboards that render projections instead of inventing logic
- typed command paths for agent actions
- strong audit/history for operator and agent decisions
- a durable relational system of record
- a future Angular shell that can be maintained cleanly

## Read These First

1. [`vision/control-plane.md`](../vision/control-plane.md)
2. [`architecture/backend-domain-model.md`](../architecture/backend-domain-model.md)
3. [`architecture/table-entity-model.md`](../architecture/table-entity-model.md)
4. [`architecture/command-projection-matrix.md`](../architecture/command-projection-matrix.md)
5. [`architecture/backend-audit.md`](../architecture/backend-audit.md)
6. [`architecture/gap-closing-plan.md`](../architecture/gap-closing-plan.md)
7. [`meetings/2026-04-22-project-orientation.md`](./2026-04-22-project-orientation.md)
8. [`meetings/2026-04-22-current-state-inventory.md`](./2026-04-22-current-state-inventory.md)

## Current Technical Commitments

- Angular 21 for the shell
- standalone components
- signals for local UI state
- TanStack Query for server state
- TanStack Table for list-heavy views
- Zod at the boundary
- Vitest for unit/component tests
- Playwright for e2e tests
- Postgres for the durable system-of-record database
- Jimbo API as the coordination layer between dashboard and persistence

## Current Threats And Concerns

These are the things we still need to watch and steadily reduce.

### 1. Legacy readiness logic still exists

Threat:

- the backend still has a `ready` column and legacy readiness computation in
  addition to the grooming workflow state machine

Why it matters:

- more than one source of truth creates bugs and confuses agents

Mitigation:

- treat `grooming_status` as authoritative
- isolate and then remove remaining `ready` dependencies

### 2. Workflow rules are spread across multiple services

Threat:

- readiness and grooming checks are implemented in several places

Why it matters:

- logic drift is likely when multiple services encode the same rule

Mitigation:

- keep tightening the backend domain boundary
- route workflow decisions through one canonical path

### 3. Email and context audit history is weaker than grooming

Threat:

- some domains are still mostly latest-state only

Why it matters:

- we need to explain decisions, not just store the latest one

Mitigation:

- add append-only history where it gives the most leverage

### 4. Cross-domain references are not yet unified

Threat:

- notes, emails, dispatch tasks, context items, and briefing references do not
  yet share one obvious identity scheme

Why it matters:

- future projections and agent actions need predictable linking semantics

Mitigation:

- formalize entity references before the dashboard hardcodes its own patterns

### 5. Composite projections are still mostly assembled by the client

Threat:

- the dashboard can become a query orchestrator instead of a presentation
  layer

Why it matters:

- duplicated data shaping becomes hard to maintain

Mitigation:

- add backend projection endpoints when the read paths stabilize

### 6. The Angular migration should not outrun the model

Threat:

- we could build a nicer shell on top of unclear workflow rules

Why it matters:

- that would preserve the current ambiguity in a cleaner framework

Mitigation:

- only accelerate Angular once the backend rules and projections are stable

## Working Rule

If a decision affects workflow correctness, auditability, or cross-domain
identity, it belongs in the backend model first.

If a decision affects layout, rendering, local interaction, or navigation, it
belongs in the dashboard shell.

If you are unsure, read the model docs before changing code.

