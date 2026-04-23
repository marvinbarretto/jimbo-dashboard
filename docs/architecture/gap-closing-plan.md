# Gap-Closing Plan

This plan turns the backend audit into an actionable sequence. The goal is to
remove ambiguity before the Angular dashboard becomes the primary surface for
operators and agents.

## 1. Must Fix Before Dashboard Migration

These items are the real blockers because they affect correctness, workflow
clarity, or the ability to trust the core model.

### 1.1 Make grooming status the only authoritative readiness model

Problem:

- `vault_notes.ready` still exists
- `computeReady()` still computes a legacy readiness flag
- some list and create paths still reference the legacy field

Why this matters:

- readiness must have one authority or workflows will drift
- agents need a single gate they can trust

Acceptance criteria:

- `grooming_status` is the only authoritative readiness source for workflow
  decisions
- all current backend commands read readiness from the grooming state machine
- any remaining `ready` usage is explicitly marked transitional and isolated
- no new business logic depends on `vault_notes.ready`

### 1.2 Centralize grooming/workflow invariants

Problem:

- readiness and grooming rules are spread across vault, grooming, feedback,
  submit, and dispatch services

Why this matters:

- the workflow model is the heart of the control plane
- duplicated rules make agent behavior unpredictable

Acceptance criteria:

- there is one canonical backend boundary for grooming transitions and gates
- services that need to check workflow state call that boundary rather than
  re-implementing rules
- transition legality and gate enforcement are tested in one place

### 1.3 Establish a clear audit trail for workflow-heavy domains

Problem:

- grooming has strong audit history
- email and context are still mostly latest-state models

Why this matters:

- this system is meant to scale to many agents and many items per day
- the audit trail is how we learn, debug, and measure performance

Acceptance criteria:

- email decisions can be traced over time
- context changes can be reconstructed
- agent actions remain attributable and queryable

### 1.4 Define normalized cross-domain references

Problem:

- note links, email refs, dispatch refs, context refs, and briefing refs are
  still only loosely standardized

Why this matters:

- composite projections need predictable identity semantics
- future productization depends on portable references

Acceptance criteria:

- the system has a documented reference convention
- cross-domain links use the convention consistently
- dashboard projections can safely render linked entities without bespoke
  per-domain guessing

## 2. Can Defer Compatibility Cleanup

These items should be cleaned up, but they are not immediate blockers if the
compatibility layer remains explicit and contained.

### 2.1 Retire legacy `ready` column usage

Current state:

- still used in some queries and migrations
- still backfilled for legacy behavior

Deferred plan:

- leave it as a shim while old workflows are being migrated
- remove query dependence after the new grooming path is fully exercised

### 2.2 Reduce transitional compatibility around legacy agent types

Current state:

- dispatch still maps some skill paths to legacy agent types

Deferred plan:

- keep compatibility where needed for existing reads
- move toward explicit executor/skill modeling in the new architecture

### 2.3 Trim migration-time reconciliation jobs once the model is stable

Current state:

- some migrations repair older rows or normalize state after schema changes

Deferred plan:

- keep one-time repair migrations while the model is evolving
- remove them once schema and invariants are stable

## 3. New Backend Capabilities Worth Adding Next

These are the capabilities that would unlock a stronger control plane, a better
dashboard, and a more scalable agent workflow system.

### 3.1 Composite projection endpoints

What to add:

- Today briefing endpoint
- Board snapshot endpoint
- Stream timeline endpoint
- Operator home endpoint

Why:

- the dashboard should not have to assemble everything itself
- composite read models reduce duplication and improve consistency

### 3.2 First-class command layer

What to add:

- explicit backend commands for the main workflow transitions
- command validation and structured results
- command-specific audit metadata

Why:

- commands make agent actions legible
- they separate intent from storage details

### 3.3 Stronger event/history surfaces for email and context

What to add:

- email decision history
- context item change history
- possibly reusable append-only audit tables or event streams

Why:

- these domains are likely to become core knowledge inputs for agents
- historical traceability improves trust and debugging

### 3.4 Unified entity reference model

What to add:

- typed references or a normalized reference table
- stable cross-domain identity semantics

Why:

- future product surfaces need consistent linking
- agents need reliable object identities across tasks and domains

### 3.5 Configurable workflow policy layer

What to add:

- policy records for grooming thresholds
- dispatch rules
- agent routing logic
- priority or readiness overrides where appropriate

Why:

- the system is moving toward many agents and many items per day
- policy needs to be adjustable without hardcoding it into UI flows

## 4. Suggested Priority Order

1. Make grooming status authoritative
2. Centralize workflow invariants
3. Add audit/history where it is weakest
4. Define normalized cross-domain references
5. Add composite projections
6. Add a first-class command layer
7. Add configurable workflow policy

## 5. Practical Cutover Rule

Do not let the Angular dashboard become the place where workflow truth is
defined.

The dashboard should:

- render projections
- call commands
- show status and history
- expose operator controls

It should not:

- infer readiness on its own
- re-implement grooming rules
- invent its own cross-domain linking scheme

