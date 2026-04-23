# Backend Audit Against Phase 2 Model

This document compares the current `jimbo-api` implementation against the Phase 2 architecture and domain model defined for `dashboard`.

## Summary

The backend already covers most of the control-plane primitives we need:

- vault memory and task storage
- grooming workflow state
- dispatch queue and execution lifecycle
- email intake and decisioning
- context / project knowledge
- briefing, health, activity, costs, experiments, and settings
- append-only audit/event surfaces in several places

The main gaps are not missing features so much as **model cleanliness**:

- legacy readiness logic still exists alongside the newer grooming state machine
- some workflow state is duplicated in more than one place
- a few read paths still depend on deprecated columns or transitional compatibility behavior
- some domains have good append-only history, while others still only persist the latest decision
- there is no unified cross-domain command/projection layer yet

## What Is Already Strong

### Grooming

The grooming state machine is explicit and well defined:

- `grooming_status` is modeled as a finite state machine
- `transitionGroomingStatus()` is the canonical mutation path
- transitions are validated
- the `ready` gate is enforced when moving into `ready`
- changes are written to both `grooming_audit` and `note_activity`

This is the right direction for a workflow engine.

### Dispatch

Dispatch already behaves like a proper execution queue:

- proposals are generated from a filtered candidate set
- enqueueing enforces assignment and grooming constraints
- execution state is tracked in `dispatch_queue`
- approval tokens exist for controlled flows
- queue history and completion data are persisted

### Vault

Vault is the canonical content and task reservoir:

- notes can be listed, fetched, created, updated, deleted, and linked
- task metadata is captured in the row
- note activity is logged
- grooming status is available for workflow operations

### Email Intake

Email reporting already supports:

- ingestion
- listing and filtering
- decisioning
- forwarding markers
- relevance scoring

### Context / Projects

The context model already exists as a structured knowledge store:

- files
- sections
- items
- ordering/reordering
- CRUD support

## Gaps and Risks

### 1. Legacy readiness still exists beside grooming status

The backend still carries a parallel `ready` column and `computeReady()` logic in `vault_notes`.

Examples:

- `vault_notes.ready` still exists and is queried in list paths
- `createNote()` still computes and writes `ready`
- migrations backfill `ready`
- dispatch selection still uses `grooming_status = 'ready'`, but the note row still carries the old readiness concept

Risk:

- two sources of truth for “is this ready?”
- future bugs when one path updates grooming state but not the legacy flag
- higher cognitive load for agents and future contributors

Recommendation:

- treat `grooming_status` as the durable readiness truth
- keep `ready` only as a compatibility shim until it is safely removed
- centralize any backward compatibility in one place, not across queries and mutations

### 2. Readiness logic is split across services

Related readiness rules live in:

- `vault.ts`
- `grooming-transition.ts`
- `grooming-submit.ts`
- `grooming-feedback.ts`
- `dispatch.ts`

Risk:

- rules can drift
- gate logic becomes hard to reason about
- a fix in one service may be invalidated by a read path in another

Recommendation:

- move readiness/grooming invariants toward a single backend domain service boundary
- keep the canonical transition service authoritative
- reduce duplicated gate checks where possible

### 3. Email decisions are stateful, but not yet fully historical

The email model stores the latest decision and relevance metadata well enough for operations, but the audit/history surface is thin compared with grooming.

Risk:

- hard to understand decision evolution over time
- weaker feedback loops for agent accuracy
- more difficult to measure classifier drift or human override behavior

Recommendation:

- add explicit decision history or audit rows if email becomes a high-volume intake path

### 4. Context/projects is structured, but not yet strongly auditable

Context CRUD is solid, but the model is mostly latest-state oriented.

Risk:

- hard to trace why a context item changed
- weak accountability for agent updates
- difficult to reconstruct prior knowledge states

Recommendation:

- add append-only context change history if this domain becomes authoritative for agent prompts or project memory

### 5. Cross-domain identity is still implicit

There is no single unified operator/action/entity reference model yet.

Risk:

- note links, email links, dispatch tasks, context items, and briefing references can drift apart
- composing projections across domains becomes harder than it needs to be

Recommendation:

- introduce a normalized reference convention and, eventually, a reference table or typed identifier system

### 6. Composite dashboard projections are still mostly client-assembled

The backend exposes the pieces, but not yet a first-class set of composite read models for:

- Today
- Board
- Stream
- operator home

Risk:

- frontend becomes a query coordinator
- data composition logic leaks into the UI
- repeated fetch/transform logic spreads across views

Recommendation:

- consider backend projection endpoints or projection services for the highest-value composite surfaces

## Compatibility vs Cleanup

Not every legacy artifact is immediately wrong.

Some current behavior is tolerable as transition scaffolding:

- `ready` column backfill
- transitional checks in dispatch and vault list queries
- compatibility logic around legacy agent types
- migration-time reconciliation jobs

The key is to distinguish:

- **intentional compatibility**
- from **unintended duplicated logic**

The audit conclusion is that `jimbo-api` is already far enough along to support the new architecture, but it needs targeted cleanup around state authority and history completeness before the dashboard becomes the main surface.

## Priority Gaps To Close Next

1. Remove or isolate legacy `ready` dependence
2. Centralize grooming/workflow invariants
3. Add stronger audit/history to email and context domains
4. Define normalized cross-domain references
5. Add composite projection endpoints for the dashboard’s core surfaces

