# Dashboard Command and Projection Matrix

This document maps the durable entities to the commands and projections the
system needs.

It is the bridge between the table/entity model and the actual workflows used
by the dashboard and agents.

## Design Rules

- commands mutate durable state
- projections are read-optimized views
- projections may aggregate, but they should not own business rules
- commands should be explicit and testable
- every important command should leave an audit trail

## Matrix

### Vault

#### Commands

- create note
- update note
- delete note
- bulk update notes
- assign/unassign note
- set priority
- set parent / epic
- change status
- enrich metadata

#### Projections

- vault list
- task list
- note detail
- note activity trail
- epic list
- top priority list
- vault stats

#### Dashboard surfaces

- `Vault`
- `Tasks`
- `Today`
- `Stream`
- parts of `Grooming`

### Grooming

#### Commands

- submit analysis
- approve analysis
- ask question
- answer question
- dismiss question
- approve decomposition
- revise decomposition
- transition to ready
- return to reservoir
- update pipeline settings

#### Projections

- grooming pipeline
- ungroomed reservoir
- question queue
- ready queue
- grooming history
- grooming stats
- readiness gate status

#### Dashboard surfaces

- `Grooming`
- `Board`
- `Today`

### Dispatch

#### Commands

- propose dispatch batch
- approve dispatch
- reject dispatch
- remove dispatch
- start dispatch
- complete dispatch
- fail dispatch
- notify completion

#### Projections

- dispatch queue
- running dispatch
- next approved dispatch
- dispatch history
- worker status
- dispatch summary

#### Dashboard surfaces

- `Board`
- `Today`
- `Stream`
- `System`

### Email Intake

#### Commands

- submit report
- decide report
- mark forwarded
- classify report
- promote report to task
- link report to context/project

#### Projections

- undecided inbox
- decided inbox
- gem inbox
- email stats
- report detail

#### Dashboard surfaces

- `Emails`
- `Today`
- future task generation workflows

### Context / Projects

#### Commands

- create context file
- update context file
- delete context file
- add section
- update section
- delete section
- reorder sections
- add item
- update item
- delete item
- reorder items

#### Projections

- context file list
- context file detail
- section tree
- item detail
- knowledge rollup

#### Dashboard surfaces

- `Projects`
- `System`
- `Today`

### Briefing

#### Commands

- submit briefing analysis
- rate briefing

#### Projections

- latest briefing
- briefing history
- briefing ratings
- briefing snapshots

#### Dashboard surfaces

- `Today`

### Health / Observability

#### Commands

- record health snapshot
- record health trend materialization

#### Projections

- current health
- health history
- health trends
- token warnings
- duplicate detection
- cost summary
- activity summary
- experiment summary

#### Dashboard surfaces

- `System`
- `Today`
- `Stream`

### Costs / Activity / Experiments

#### Commands

- log cost entry
- log activity entry
- log experiment run
- rate activity
- rate experiment

#### Projections

- cost summary
- activity timeline
- experiment timeline
- performance trends

#### Dashboard surfaces

- `System`
- `Today`
- `Stream`

### Settings / Policy

#### Commands

- update setting
- update structured setting
- update workflow policy

#### Projections

- settings list
- structured settings view
- workflow policy snapshot

#### Dashboard surfaces

- `System`
- `Grooming`
- future admin surfaces

## Cross-Domain Projections

These are the high-value composite views the dashboard needs.

### Today briefing

Consumes:

- health
- briefing
- dispatch
- vault
- email
- activity
- costs

### Board snapshot

Consumes:

- grooming pipeline
- dispatch queue
- ready items
- blocking signals

### Stream timeline

Consumes:

- activity log
- grooming events
- dispatch events
- note references

### Operator home

Consumes:

- health
- attention items
- readiness queue
- unresolved email decisions
- key warnings

## Gaps The Matrix Exposes

- some dashboard actions still need explicit command names in the backend
- some cross-domain views need stable read models
- workflow policy is not yet first-class
- entity references need standardization
- audit surfaces need to be more unified

