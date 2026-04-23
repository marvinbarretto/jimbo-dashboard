# Dashboard Data Architecture

The Dashboard exists in a broader control-plane system. Its data architecture
should reflect that reality.

## Core Principle

The dashboard is a presentation and coordination shell. It should not become a
second system of record.

## System Of Record

The durable system of record should live in `jimbo-api` and its backing
database.

That backend should own:

- workflow state
- audit history
- item lifecycle
- agent actions
- queue/dispatch history
- observability snapshots
- settings and policy
- cross-domain references

## Dashboard Data Role

The dashboard should:

- read from the API
- send commands to the API
- maintain only local UI state
- cache server state through query tooling
- never duplicate the authoritative business rules

## Database Strategy

### Recommended default

Postgres for the durable shared system of record.

### Why Postgres

- relational workflow data fits naturally
- audit and event-style tables are straightforward
- many agents and many items imply real concurrency
- analytics and cross-domain queries are easier
- the system may become productized later

### Where SQLite fits

- local development
- isolated tools
- fast prototypes
- single-node utilities

SQLite is useful, but it is not the right default for the long-lived control
plane core.

## Data Categories

### Mutable business state

Examples:

- vault note current status
- grooming status
- dispatch status
- settings values
- context item content

These should live in authoritative tables and be updated through commands.

### Append-only history

Examples:

- workflow transitions
- audit rows
- agent actions
- operator decisions
- queue history
- health snapshots

These should be modeled as append-only records.

### Projection data

Examples:

- Today briefing
- Board snapshot
- Stream timeline
- system summaries

These can be derived from authoritative data or cached as read models.

## Coordination Needs

The system needs the database to support:

- idempotency
- locking / leases
- retries
- deduplication
- ordering
- state transitions
- metrics
- throughput tracking

## Cross-Domain References

The data model should make references explicit between:

- email reports
- vault notes
- grooming items
- dispatch items
- context items
- briefing sessions

This is necessary for:

- deep linking
- traceability
- agent workflows
- reliable projections

## API Boundary

The dashboard should not talk directly to the database unless a future local
feature truly requires it.

Preferred path:

1. dashboard UI
2. Jimbo API
3. database

That keeps business logic centralized and easier to test.

