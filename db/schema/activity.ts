import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, jsonb, bigserial, index, check } from 'drizzle-orm/pg-core';
import { vaultNotes } from './vault';

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
