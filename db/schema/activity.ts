import { sql } from 'drizzle-orm';
import { pgTable, text, integer, timestamp, jsonb, bigserial, index, check } from 'drizzle-orm/pg-core';
import { vaultNotes } from './vault.js';

// ── note_activity ──────────────────────────────────────────────────────────
//
// Per-vault-item event log. Every meaningful change to an item (status moves,
// reassignment, priority changes, questions raised) writes a row. Drives the
// "live snapshot" on the kanban card and the audit timeline on the detail
// page. 4,402 rows in production — append-only, never edited.

export const noteActivity = pgTable('note_activity', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  note_id: text('note_id').notNull().references(() => vaultNotes.id, { onDelete: 'cascade' }),
  ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),

  // Free-text actor id (matches actors.id when populated).
  actor: text('actor').notNull(),

  // Action codes are stable but evolving (10 distinct values currently:
  // grooming_status_changed, reassigned, submitted_analysis, priority_scored,
  // question_raised, submitted_decomposition, feedback_requeue, feedback_reject,
  // commission_completed, priority_changed). No CHECK — too many, growing.
  action: text('action').notNull(),

  // For state-change actions: from → to. Free text since "value" might be
  // a status, an actor id, a priority, a textual note.
  from_value: text('from_value'),
  to_value: text('to_value'),

  reason: text('reason'),
  // Structured extra data — was TEXT in SQLite, often JSON. jsonb gives
  // querying ("which transitions were AI-driven?") for free.
  context: jsonb('context'),
}, (t) => ({
  noteTsIdx: index('idx_note_activity_note').on(t.note_id, t.ts.desc()),
  actorActionIdx: index('idx_note_activity_actor_action').on(t.actor, t.action, t.ts.desc()),
  actionTsIdx: index('idx_note_activity_action_ts').on(t.action, t.ts.desc()),
}));

// ── system_events ──────────────────────────────────────────────────────────
//
// Cross-cutting event log — anything jimbo-as-system does. Distinct from
// note_activity (per-item) in that it spans the whole system: heartbeats,
// gateway startup, tool invocations, agent turns. 2,949 rows currently.
//
// Used for ops dashboards and correlation traces. Levels filter the noise
// (1,657 debug, 1,261 info, 61 warn).

export const systemEvents = pgTable('system_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  ts: timestamp('ts', { withTimezone: true }).notNull(),

  // Source service: hermes, site, … (currently 2 distinct).
  source: text('source').notNull(),

  // Kind — namespaced ('tool.pre', 'tool.post', 'agent.start', 'gateway.startup').
  // 13 distinct currently; new kinds expected.
  kind: text('kind').notNull(),

  actor: text('actor'),
  title: text('title').notNull(),
  detail: text('detail'),
  // Structured per-kind data (added 2026-05). Use payload for fields the UI
  // renders programmatically (duration_ms, tokens_in, status_to/from); leave
  // detail for free-form blobs and human-readable strings.
  payload: jsonb('payload'),

  // Soft reference: ref_type='vault_note', ref_id='note_xxx'. Lets us trace
  // events back to the entity without requiring a hard FK (events refer to
  // many entity types — notes, dispatches, prompts, etc).
  ref_type: text('ref_type'),
  ref_id: text('ref_id'),

  // Trace correlation across multiple events (a workflow run, a request).
  correlation_id: text('correlation_id'),

  level: text('level').notNull().default('info'),
}, (t) => ({
  tsIdx: index('idx_system_events_ts').on(t.ts.desc()),
  refIdx: index('idx_system_events_ref').on(t.ref_type, t.ref_id),
  correlationIdx: index('idx_system_events_correlation').on(t.correlation_id),
  sourceTsIdx: index('idx_system_events_source').on(t.source, t.ts.desc()),
  kindTsIdx: index('idx_system_events_kind').on(t.kind, t.ts.desc()),

  levelCheck: check(
    'system_events_level_check',
    sql`${t.level} IN ('debug','info','warn','error')`,
  ),
}));

export type NoteActivity = typeof noteActivity.$inferSelect;
export type SystemEvent = typeof systemEvents.$inferSelect;

// ── activities ─────────────────────────────────────────────────────────────
//
// Distinct from note_activity (which is per-vault-item). `activities` is the
// legacy global activity log written by the conductor pipeline: one row per
// AI task invocation (analysis/decomposition/scoring/etc), regardless of
// whether it touches a vault item. Pairs with `costs` via cost_id.
//
// Naming clash is unfortunate but historical — keeping the production name
// avoids a rename migration on frozen data.

export const activities = pgTable('activities', {
  // Text PK — production uses ULIDs/slugs (e.g. 'act_xxx'), not integers.
  id: text('id').primaryKey(),

  // When the task actually ran (not when row was inserted — same in practice
  // but semantically distinct).
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),

  // Free text — task taxonomy evolves. No CHECK.
  task_type: text('task_type').notNull(),
  description: text('description').notNull(),

  // Result/effect of the task. Free text — could be a verdict, a summary,
  // or a structured marker. Nullable for in-flight/failed tasks.
  outcome: text('outcome'),
  rationale: text('rationale'),
  model_used: text('model_used'),

  // Soft reference into costs(id). Not a FK — costs may be GC'd while we
  // keep activity history for audit, and the relationship is one-to-one
  // anyway (a cost row exists per activity that spent tokens).
  cost_id: text('cost_id'),

  // 1..5 operator score (or similar). No CHECK; scale still informal.
  satisfaction: integer('satisfaction'),
  notes: text('notes'),
}, (t) => ({
  tsIdx: index('idx_activities_ts').on(t.timestamp),
  typeIdx: index('idx_activities_type').on(t.task_type),
}));

export type Activity = typeof activities.$inferSelect;
export type ActivityInsert = typeof activities.$inferInsert;
