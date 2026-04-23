# Dashboard Tech Choices

This document records the current technical choices for the Dashboard repo and
why they were chosen.

## Frontend Framework

### Choice

Angular 21

### Rationale

- strong component boundaries
- standalone-first architecture
- signals for local state
- good fit for a control-plane UI with many coordinated workflows
- a better natural fit than a looser component model when the app needs to
  stay disciplined over time

## State Management

### Choice

- Angular signals for local UI state
- Angular services for shared app state
- TanStack Query for server state

### Rationale

- signals are simple and explicit for ephemeral UI state
- services avoid over-centralizing everything into a heavy store
- TanStack Query handles caching, invalidation, polling, and async server data
  cleanly

## Tables

### Choice

TanStack Table

### Rationale

- the dashboard is list-heavy
- TanStack Table is flexible for sorting, pagination, selection, and custom
  cell rendering
- it keeps the table model explicit and testable

## Validation

### Choice

Zod

### Rationale

- runtime validation at the API boundary
- clear schema contracts
- good TypeScript inference
- reduces silent drift between API and UI

## Testing

### Choice

- Vitest for unit/component tests
- Playwright for e2e

### Rationale

- fast feedback for logic and component behavior
- end-to-end coverage for the control-plane workflows that matter

## Styling

### Choice

- SCSS for structured component styling
- CSS variables for design tokens

### Rationale

- consistent with the Angular scaffold already in place
- simple enough to keep the UI maintainable
- compatible with a future design system

## Data Ownership

### Choice

Dashboard does not own its own primary database.

The system of record should stay in `jimbo-api` for now, with the dashboard
calling it as the backend coordination layer.

### Rationale

- avoids splitting source of truth
- keeps the control plane coherent
- lets the backend own workflow history, audit, and coordination

## Database Strategy For The System

### Choice

Use Postgres for the durable system of record where a real shared database is
needed.

### Rationale

- agent coordination and workflow history need durable relational storage
- the system needs concurrency, auditing, analytics, and cross-domain queries
- Postgres is the better long-term fit than SQLite for a multi-agent control
  plane

## What Not To Overbuild

- do not add a dashboard-local database unless there is a clear reason
- do not introduce a global state library before we prove we need one
- do not let framework choice hide domain-model gaps

