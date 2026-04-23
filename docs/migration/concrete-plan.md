# Dashboard Migration Plan

## Goal

Move from:

- UI-driven implementation
- business logic embedded in screens
- a partially coupled dashboard and API surface

to:

- explicit domain modules
- explicit application services
- testable workflows
- a framework-swappable presentation layer

## Repo Transition

The current `jimbo-api` repo remains the backend and API source of truth.

The new `dashboard` repo should host:

- the Angular shell
- the shared UI layer
- the domain/application core for the frontend
- repo-local docs and migration notes

It should not duplicate backend service logic.

## Sequencing

1. document the system boundaries and domain rules
2. extract and test the domain layer
3. extract application services and projection builders
4. make the current UI consume the extracted core instead of duplicating logic
5. introduce the Angular shell on top of the stabilized core
6. retire the old presentation path once the Angular shell covers the required workflows

## Cutover Gates

- grooming transitions are deterministic and tested
- vault mutation rules are centralized
- email intake rules are explicit
- board/today projections are based on application services
- route state is no longer the home of business logic
- the core tests pass consistently

## Technical Choices To Lock In

- Angular 21 for the shell
- signals for local UI state
- TanStack Query for server state
- TanStack Table for list-heavy views
- Zod at the boundary
- Vitest for unit/component tests
- Playwright for e2e
- Postgres as the durable system-of-record database for the wider control
  plane
- Jimbo API as the coordination layer between dashboard and persistence

## Capability Gaps To Watch

The following gaps should be treated as potential blockers for more powerful
Dashboard workflows:

- no first-class dashboard command layer
- no stable projection endpoints for composite views
- limited formal cross-domain relationships
- no configurable workflow policy layer
- no unified entity reference model across surfaces
- no single operator-action audit surface
