# Decision Log

## 2026-04-22

### Decision: use `dashboard` as the repo name

The Angular UI repo is named `dashboard`.

### Decision: keep `jimbo-api` as the backend source of truth

The API repo remains the control-plane backend.

### Decision: use domain-first architecture

Business concepts come before screens.

### Decision: use workflow-first modeling

Grooming, dispatch, and email intake are explicit workflows, not UI
conveniences.

### Decision: tabs are projections

`Today`, `Stream`, and `Board` are read-optimized views over the domains.

### Decision: Angular is the target shell

Angular is the preferred presentation framework for the long-term control plane.

### Decision: keep the core framework-agnostic

Domain and application logic should not depend on Angular.

### Decision: use TanStack Query/Table and Zod

These fit the TypeScript stack and work well with Angular.

### Decision: use Postgres for the long-lived control-plane system of record

The dashboard itself should not own the primary database, but the wider system
needs durable relational storage for workflow state, audit history, and agent
coordination.

### Decision: keep dashboard reads and writes behind the Jimbo API

The dashboard should call the API rather than reaching directly into the
database.

### Decision: start from a table/entity model

The durable system shape should be defined before the command and projection
layer is finalized.

### Decision: define a command/projection matrix next

Commands should map to durable writes and projections should map to the
read-optimized views the dashboard actually needs.

### Decision: define a backend-first domain model next

The backend should own invariants, lifecycle transitions, and audit rules.

### Decision: audit the backend against the target domain model

The current `jimbo-api` implementation should be compared against the Phase 2
model to identify legacy compatibility, duplicated workflow logic, and missing
audit/projection surfaces before the Angular shell work accelerates.

### Decision: close backend gaps in three buckets

Backend follow-up work should be grouped into:

- must-fix-before-migration blockers
- compatibility cleanup that can be deferred
- new capabilities that unlock a stronger control plane

### Decision: maintain a short start-here document

New agents should have a concise entrypoint that explains the direction,
current risks, and the docs they should read first.

### Decision: make tests first-class

Unit tests, workflow tests, and e2e tests are required, not optional.
