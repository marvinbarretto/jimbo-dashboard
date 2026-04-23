# Dashboard Table and Entity Model

This document defines the durable data shape for the Jimbo control-plane
system.

It is the most important model document because every command, projection, and
UI surface will eventually depend on it.

## Modeling Rules

- keep the durable system of record in `jimbo-api`
- make workflow state explicit
- model history as append-only where possible
- make cross-domain references explicit
- keep projections separate from authoritative state
- avoid duplicating meaning across multiple columns

## Core Entity Groups

### 1. Vault

Canonical memory and task reservoir.

#### Primary tables

- `vault_notes`
- `vault_note_tags` if tags are normalized later
- `vault_note_links`
- `vault_note_attachments` if attachments become first-class

#### Key columns / concepts

- `id`
- `seq`
- `title`
- `body`
- `type`
- `status`
- `grooming_status`
- `ai_priority`
- `manual_priority`
- `effective_priority`
- `assigned_to`
- `executor`
- `required_skills`
- `acceptance_criteria`
- `parent_id`
- `is_epic`
- `created_at`
- `updated_at`
- `archived_at` if archival becomes explicit

#### Notes

- `grooming_status` is authoritative for pipeline position.
- `effective_priority` should be derivable from AI/manual inputs, not treated
  as a second source of meaning.
- `seq` is an operator-facing stable reference, not the only internal ID.

### 2. Grooming

Workflow state machine over vault notes.

#### Primary tables

- `grooming_audit`
- `grooming_questions`
- `grooming_lessons`
- `grooming_pipeline_settings`

#### Key columns / concepts

- `note_id`
- `from_status`
- `to_status`
- `actor`
- `reason`
- `metadata`
- `created_at`
- `resolved_at`
- `answered_by`
- `answer`
- `delegable`

#### Notes

- every transition should create audit history
- questions are part of the workflow history, not just UI state
- settings should be explicit and versionable

### 3. Dispatch

Execution lifecycle for approved work.

#### Primary tables

- `dispatch_queue`
- `dispatch_runs`
- `dispatch_history`
- `dispatch_events` if history is normalized later

#### Key columns / concepts

- `id`
- `task_id`
- `item_ids`
- `status`
- `agent_type`
- `started_at`
- `completed_at`
- `failed_at`
- `rejected_at`
- `reason`
- `batch_id`
- `actor`

#### Notes

- dispatch status should be a single source of truth
- queue history should be append-only or at least auditable
- approvals and rejections should be explicit events

### 4. Email Intake

Reports that can become work.

#### Primary tables

- `email_reports`
- `email_report_decisions`
- `email_report_links`

#### Key columns / concepts

- `gmail_id`
- `subject`
- `from_email`
- `from_name`
- `processed_at`
- `decision`
- `decided_at`
- `relevance_score`
- `category`
- `summary`
- `forwarded`
- `body_analysis`

#### Notes

- decisions should be history-backed
- report state should support conversion into vault/tasks
- links to projects/context should be explicit

### 5. Context / Projects / Knowledge

Structured long-lived knowledge.

#### Primary tables

- `context_files`
- `context_sections`
- `context_items`
- `context_item_tags` if needed later

#### Key columns / concepts

- `slug`
- `display_name`
- `item_count`
- `section_order`
- `item_order`
- `label`
- `content`
- `status`
- `category`
- `timeframe`
- `expires_at`

#### Notes

- this is a knowledge store, not just a UI page
- ordering matters and should be preserved explicitly
- items may become references for project goals and agent instructions

### 6. Briefing

Daily/periodic synthesized operator briefings.

#### Primary tables

- `briefing_sessions`
- `briefing_analysis`
- `briefing_ratings`

#### Key columns / concepts

- `session`
- `generated_at`
- `model`
- `analysis`
- `user_rating`
- `source_snapshot`

#### Notes

- briefing is projection data, not primary state
- source snapshots matter for traceability

### 7. Health / Observability

Operational read models and snapshot history.

#### Primary tables

- `health_snapshots`
- `health_issues`
- `health_trends` if materialized later

#### Key columns / concepts

- `timestamp`
- `overall`
- `issues`
- `pipeline`
- `tools`
- `email`
- `vault`
- `costs`
- `activity`
- `experiments`
- `files`
- `model`
- `calendar`
- `tokens`
- `duplicates`

#### Notes

- this is derived operational telemetry
- snapshots are append-only and important for trend analysis

### 8. Costs / Activity / Experiments

Cross-cutting telemetry domains.

#### Primary tables

- `cost_entries`
- `activity_log`
- `experiment_runs`

#### Key columns / concepts

- `created_at`
- `task_id`
- `model`
- `cost`
- `count`
- `rating`
- `type`
- `source`
- `metadata`

#### Notes

- use append-only history where practical
- these tables should support analytics and trend queries

### 9. Settings / Policy

Explicit system knobs and workflow configuration.

#### Primary tables

- `settings`
- `structured_settings`
- `workflow_policies` if policy becomes first-class

#### Key columns / concepts

- `key`
- `value`
- `updated_at`
- `schema_version`
- `scope`

#### Notes

- settings are the right place for configurable behavior
- policy should be separate from business state where possible

### 10. Cross-Domain References

These are not always separate tables, but the model should support them.

#### Likely reference tables

- `entity_references`
- `entity_links`
- `audit_events`

#### Key columns / concepts

- `source_type`
- `source_id`
- `target_type`
- `target_id`
- `relation_type`
- `created_at`
- `actor`

#### Notes

- this is where deep linking and workflow traceability get easier
- the system benefits from a shared reference vocabulary

## Mutable vs Append-Only

### Mutable

- vault note current state
- grooming status
- dispatch queue current state
- email decision state
- context item content
- settings values

### Append-only

- grooming audit
- dispatch history/events
- email decision history
- activity log
- briefing snapshots
- health snapshots
- experiment runs

## Projection Tables / Read Models

These may be derived from source tables or materialized if needed.

- `today_briefs`
- `board_snapshots`
- `stream_events`
- `operator_home_snapshots`
- `task_rollups`

## Open Design Questions

- should `vault_notes` be split into note + item + workflow tables later
- should dispatch history be fully event-sourced or just append-only audited
- should the dashboard own any local cache tables, or stay API-only
- which projections should be materialized vs computed on read

## Immediate Recommendation

Start with:

- `vault_notes`
- `grooming_audit`
- `grooming_questions`
- `dispatch_queue`
- `dispatch_history`
- `email_reports`
- `email_report_decisions`
- `context_files`
- `context_sections`
- `context_items`
- `briefing_sessions`
- `health_snapshots`
- `activity_log`
- `experiment_runs`
- `cost_entries`
- `settings`

That is enough to support the current dashboard and gives us room to grow.

