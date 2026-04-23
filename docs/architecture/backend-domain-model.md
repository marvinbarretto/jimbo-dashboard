# Backend-First Domain Model

This document defines the authoritative backend domain model for Jimbo.

It is the rule layer that sits behind the table/entity model and the
command/projection matrix.

## Purpose

The model answers:

- what the durable business entities are
- what invariants they must obey
- what lifecycle transitions are allowed
- what must be audited
- what should be mutable vs append-only
- how the backend should enforce the rules for the dashboard and agents

## Design Rules

- the backend owns the rules
- the dashboard consumes the rules
- every important state transition is explicit
- domain invariants are enforced in one place
- workflow history is first-class
- projections may derive meaning, but they do not redefine it

## Domain Rules By Area

### Vault

#### Domain role

Canonical memory and work reservoir.

#### Invariants

- every vault note has one authoritative identity
- `seq` is a stable operator reference
- `grooming_status` is the source of truth for pipeline position
- `effective_priority` must not become a second source of truth
- parent/epic relationships must remain consistent
- note status changes should preserve auditability

#### Allowed operations

- create
- update
- delete
- bulk update
- assign/unassign
- prioritize
- reparent
- mark epic
- change pipeline status
- enrich metadata

#### History expectations

- important mutations should be auditable
- note activity should record meaningful changes

### Grooming

#### Domain role

Readiness workflow over vault notes.

#### Invariants

- `grooming_status` is the only authoritative pipeline state
- every transition must follow the allowed transition table
- ready is only reached when the readiness gate passes
- no transition should skip required workflow steps
- all transitions must write audit/history

#### Allowed transitions

Use the adopted state machine from:

- [`jimbo-api/docs/specs/2026-04-20-grooming-state-machine.md`](../../../jimbo-api/docs/specs/2026-04-20-grooming-state-machine.md)

#### Readiness gate

A note can only become ready if:

- it is assigned
- required skills are present
- acceptance criteria are present
- priority is present

#### Allowed operations

- submit analysis
- ask question
- answer question
- dismiss question
- approve analysis
- approve decomposition
- revise decomposition
- return to reservoir
- update pipeline settings

#### History expectations

- every status transition must create an audit record
- questions and answers are part of the workflow history
- pipeline settings changes should be versionable

### Dispatch

#### Domain role

Execution lifecycle for approved work.

#### Invariants

- dispatch must have one authoritative current status
- approvals, rejections, starts, completions, and failures must be explicit
- queue and history must remain auditable
- execution should not be confused with grooming readiness

#### Allowed operations

- propose batch
- approve
- reject
- remove
- start
- complete
- fail
- notify completion

#### History expectations

- queue movements should be traceable
- execution events should be append-only where practical

### Email Intake

#### Domain role

Convert inbound email into structured work opportunities.

#### Invariants

- a report can be undecided, decided, or forwarded
- decisions must be explicit
- classification should be recorded
- high-value items should be linkable to vault/context/work

#### Allowed operations

- submit report
- decide
- mark forwarded
- classify
- promote to task
- link to context/project

#### History expectations

- decisions should be auditable
- downstream item creation should be attributable to the report

### Context / Projects / Knowledge

#### Domain role

Structured long-lived knowledge and project context.

#### Invariants

- file slugs must be stable
- section order and item order must be preserved
- structured fields must remain consistent
- context should behave like curated knowledge, not random notes

#### Allowed operations

- create file
- update file
- delete file
- add section
- update section
- delete section
- reorder sections
- add item
- update item
- delete item
- reorder items

#### History expectations

- structural changes should be auditable where useful
- the model should support future agent-maintained knowledge

### Briefing

#### Domain role

Synthesized operator briefings and their ratings.

#### Invariants

- briefing is derived, not authoritative
- the source snapshot matters
- ratings should be tied to a generated session

#### Allowed operations

- submit analysis
- rate briefing

#### History expectations

- analysis snapshots should be persisted
- rating history should remain accessible

### Health / Observability

#### Domain role

Operational read model and trend layer.

#### Invariants

- snapshots should be immutable once written
- derived health data should not be hand-edited
- duplicate detection and warning signals should be reproducible

#### Allowed operations

- record snapshot
- materialize trend rollups

#### History expectations

- snapshots should be append-only
- trend materialization should be recomputable

### Costs / Activity / Experiments

#### Domain role

Operational telemetry and performance evidence.

#### Invariants

- telemetry should be append-only whenever possible
- identifiers must map back to the source action or item
- ratings should preserve attribution

#### Allowed operations

- log cost entry
- log activity entry
- log experiment run
- rate activity
- rate experiment

#### History expectations

- records should never silently disappear
- summary views should be derived from append-only history

### Settings / Policy

#### Domain role

Explicit control knobs and workflow policy.

#### Invariants

- settings should have clear scope and versioning
- structured settings should be schema-checked
- workflow policy should not be hidden in UI code

#### Allowed operations

- update setting
- update structured setting
- update workflow policy

#### History expectations

- important settings changes should be auditable

## Cross-Domain Rules

### Reference integrity

References between domains should be explicit and stable.

Examples:

- email report → vault note
- vault note → grooming item
- grooming item → dispatch item
- context item → project goal
- briefing item → source reference

### Command ownership

Each durable mutation should have one canonical owning service.

### Projection ownership

Composite reads should be owned by application/projection services, not by UI
components.

### Audit ownership

Every important operator or agent decision should be attributable.

## Backend Enforcement Expectations

The backend should enforce:

- state machine legality
- readiness gates
- idempotency where needed
- audit history creation
- referential integrity
- policy validity

## Why This Matters For The Dashboard

The dashboard should only need to know:

- what the allowed commands are
- what the read models are
- what the current state means
- what actions are safe to expose

It should not need to know how the backend enforces those rules.

