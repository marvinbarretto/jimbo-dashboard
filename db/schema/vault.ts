import { sql } from 'drizzle-orm';
import {
  pgTable, text, integer, smallint, boolean, timestamp, real, jsonb, bigint,
  index, check,
} from 'drizzle-orm/pg-core';

// ── vault_notes ────────────────────────────────────────────────────────────
//
// Postgres-native rewrite of the production SQLite vault_notes table.
// Column-by-column decisions documented inline. Reality is the starting point;
// changes (type → boolean, JSON-string → text[], naive string → timestamptz)
// are deliberate, not cosmetic.
//
// Discriminator/CHECK constraints capture *current* values from a 2,353-row
// snapshot — when production adds a new value (a new route, a new
// grooming_status), the CHECK fails until we migrate. That's the tradeoff
// we want: bad data is rejected, schema evolution is explicit.

export const vaultNotes = pgTable('vault_notes', {
  // ── Identity ─────────────────────────────────────────────────────────────
  // Slug-style PK ('hotel-gokyo-lake--note_eefdf4f') preserves all existing
  // URLs and email-references. Adding UUID later as a secondary identifier is
  // additive; switching now would break every external link.
  id: text('id').primaryKey(),

  // Short-form reference (#719). Never reset. bigint guards against the
  // someday-overflow at zero storage cost; current max is 2368.
  seq: bigint('seq', { mode: 'number' }).notNull().unique(),

  // ── Content ──────────────────────────────────────────────────────────────
  title: text('title').notNull(),

  // Free text type — 16 distinct values in production (task, idea, bookmark,
  // travel, recipe, …) and growing. CHECK constraint would force a schema
  // migration every time a new noun appears. Operator UX needs autocomplete,
  // not a tight enum.
  type: text('type').notNull().default('task'),

  // CHECK-constrained: lifecycle states only. 'inbox' (574 rows) is real and
  // distinct from 'active' — items arrive in inbox before triage promotes
  // them. 'done' coexists with completed_at: 'done' is the operator's
  // declaration, completed_at is when it actually happened.
  status: text('status').notNull().default('active'),

  body: text('body'),

  // jsonb (not text-JSON) — gives us validation, indexing, and operator-side
  // querying ("which items came from google-keep?") without extracting fields.
  // Original frontmatter from email/keep/tasks ingestion lives here; structure
  // varies by source.
  raw_frontmatter: jsonb('raw_frontmatter'),

  // ── Priority (operator override pattern) ─────────────────────────────────
  // Two priority columns is intentional. ai_priority is what the model
  // proposed; manual_priority is the operator's override. Display logic
  // prefers manual when present; AI rationale stays visible either way.
  ai_priority: smallint('ai_priority'),
  ai_rationale: text('ai_rationale'),
  ai_rationale_model: text('ai_rationale_model'),
  manual_priority: smallint('manual_priority'),
  // 0..1 confidence on ai_priority. Real, not numeric — display, not money.
  priority_confidence: real('priority_confidence'),

  // ── Triage ───────────────────────────────────────────────────────────────
  // Five real values incl null. CHECK in table-level constraints below.
  actionability: text('actionability'),
  sort_position: integer('sort_position'),

  // text[] — production stores as JSON-string, we read with json_each into a
  // native array. Empty array (not null) so consumers can always iterate.
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),

  // ── Routing & assignment ─────────────────────────────────────────────────
  // assigned_to stays text for now. Will become FK to actors(id) once we
  // populate that table from the distinct values (marvin/ralph/boris).
  // 'unassigned' as default rather than null — distinguishes "no decision"
  // from "explicitly nobody".
  assigned_to: text('assigned_to').notNull().default('unassigned'),

  // CHECK: 4 real routes (unrouted/marvin/jimbo/claude_code).
  route: text('route').notNull().default('unrouted'),

  // Free-text — operational labels, low-cardinality but evolving.
  agent_type: text('agent_type'),
  executor: text('executor'),

  // ── AI suggestions (operator approves to copy into real fields) ──────────
  // Pattern: AI proposes, operator confirms. Suggested fields are write-once
  // by the AI, copied into the real columns when accepted. Keeps the audit
  // trail of what the AI thought vs what we actually decided.
  suggested_route: text('suggested_route'),
  suggested_agent_type: text('suggested_agent_type'),
  suggested_ac: text('suggested_ac'),
  suggested_skills: text('suggested_skills').array().notNull().default(sql`'{}'::text[]`),
  suggested_parent_id: text('suggested_parent_id'),

  // ── Hierarchy ────────────────────────────────────────────────────────────
  // Self-FK. ON DELETE SET NULL — orphan rather than cascade-delete; a parent
  // disappearing shouldn't take its children with it. The dashboard surfaces
  // orphans in the kanban so operator can re-parent.
  parent_id: text('parent_id').references((): any => vaultNotes.id, { onDelete: 'set null' }),

  // boolean (was 0/1 int). is_epic is stored, not derived — production sets
  // this explicitly when an item gets decomposed. epic_started_at marks when.
  is_epic: boolean('is_epic').notNull().default(false),
  epic_started_at: timestamp('epic_started_at', { withTimezone: true }),

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ready: boolean('ready').notNull().default(false),

  // CHECK: 5 real values (ungroomed/intake_rejected/classified/decomposed/ready).
  grooming_status: text('grooming_status').notNull().default('ungroomed'),
  grooming_started_at: timestamp('grooming_started_at', { withTimezone: true }),

  acceptance_criteria: text('acceptance_criteria'),
  definition_of_done: text('definition_of_done'),

  // ── Blocking ─────────────────────────────────────────────────────────────
  // blocked_by is free text (could reference another item ID, an external
  // dependency, a person). Not FK — too restrictive for the actual semantics.
  blocked_by: text('blocked_by'),
  blocked_reason: text('blocked_reason'),
  blocked_at: timestamp('blocked_at', { withTimezone: true }),

  // ── Source ───────────────────────────────────────────────────────────────
  // Split intentionally (kind + ref + url + signal). Production data validates
  // this shape — discriminated-union-as-storage would fight the actual usage
  // pattern of "filter by source_kind, surface source_url for context".
  // No CHECK on source_kind — code defines values (manual/email/telegram/agent
  // /url/pr-comment) but rows currently only carry 'manual' or null.
  source_kind: text('source_kind'),
  source_ref: text('source_ref'),
  source_url: text('source_url'),
  source_signal: text('source_signal'),

  // ── Lessons fed back from grooming_lessons ───────────────────────────────
  cited_lesson_ids: text('cited_lesson_ids').array().notNull().default(sql`'{}'::text[]`),

  // ── Operational counters ─────────────────────────────────────────────────
  nudge_count: integer('nudge_count').notNull().default(0),
  last_nudged_at: timestamp('last_nudged_at', { withTimezone: true }),
  retry_count: integer('retry_count').notNull().default(0),

  // ── Timestamps ───────────────────────────────────────────────────────────
  // timestamptz throughout — store UTC, render local. Naive ISO strings in
  // SQLite become real timestamps; comparison and indexing become correct.
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  due_at: timestamp('due_at', { withTimezone: true }),
}, (t) => ({
  // Indexes mirror the ones SQLite earned through use. Names match
  // Drizzle's convention so generated migrations are predictable.
  typeStatusIdx: index('idx_vault_type_status').on(t.type, t.status),
  aiPriorityIdx: index('idx_vault_ai_priority').on(t.ai_priority),
  manualPriorityIdx: index('idx_vault_manual_priority').on(t.manual_priority),
  parentIdIdx: index('idx_vault_parent_id').on(t.parent_id),
  routeIdx: index('idx_vault_route').on(t.route),
  assignedToIdx: index('idx_vault_assigned_to').on(t.assigned_to),
  statusAssignedIdx: index('idx_vault_status_assigned_to').on(t.status, t.assigned_to),
  readyIdx: index('idx_vault_ready').on(t.ready),
  groomingStatusIdx: index('idx_vault_grooming_status').on(t.grooming_status),
  executorIdx: index('idx_vault_executor').on(t.executor),
  isEpicIdx: index('idx_vault_is_epic').on(t.is_epic),
  dueAtIdx: index('idx_vault_due_at').on(t.due_at),

  // CHECK constraints — capture current valid values from production snapshot.
  // Adding a new value requires migrating the constraint; that's the point.
  statusCheck: check(
    'vault_notes_status_check',
    sql`${t.status} IN ('active','inbox','archived','done')`,
  ),
  routeCheck: check(
    'vault_notes_route_check',
    sql`${t.route} IN ('unrouted','marvin','jimbo','claude_code')`,
  ),
  groomingStatusCheck: check(
    'vault_notes_grooming_status_check',
    sql`${t.grooming_status} IN ('ungroomed','intake_rejected','classified','decomposed','ready')`,
  ),
  actionabilityCheck: check(
    'vault_notes_actionability_check',
    sql`${t.actionability} IS NULL OR ${t.actionability} IN ('vague','clear','needs-context','needs-breakdown')`,
  ),
}));

export type VaultNote = typeof vaultNotes.$inferSelect;
export type VaultNoteInsert = typeof vaultNotes.$inferInsert;
