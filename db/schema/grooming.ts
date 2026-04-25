import { sql } from 'drizzle-orm';
import { pgTable, text, integer, boolean, timestamp, jsonb, bigserial, bigint, index } from 'drizzle-orm/pg-core';
import { vaultNotes } from './vault';

// ── grooming_audit ─────────────────────────────────────────────────────────
//
// Every transition of vault_notes.grooming_status writes a row here.
// 1,382 rows in production. Used for the "stuck Nd" hint on the kanban
// (find most recent transition where to_status = current status, measure
// elapsed time).

export const groomingAudit = pgTable('grooming_audit', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  note_id: text('note_id').notNull().references(() => vaultNotes.id, { onDelete: 'cascade' }),

  from_status: text('from_status').notNull(),
  to_status: text('to_status').notNull(),

  actor: text('actor').notNull(),
  reason: text('reason'),
  metadata: jsonb('metadata'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  noteIdx: index('idx_grooming_audit_note').on(t.note_id),
  createdIdx: index('idx_grooming_audit_created').on(t.created_at),
}));

// ── grooming_questions ─────────────────────────────────────────────────────
//
// Open questions on items — drives the blue badge on the kanban card.
// 690 rows in production. delegable=true means an executor can be dispatched
// to research the answer; otherwise it requires a human.

export const groomingQuestions = pgTable('grooming_questions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  note_id: text('note_id').notNull().references(() => vaultNotes.id, { onDelete: 'cascade' }),

  question: text('question').notNull(),
  delegable: boolean('delegable').notNull().default(false),

  answer: text('answer'),
  answered_by: text('answered_by'),
  // Soft FK — references dispatch_queue.id when a research dispatch was kicked off.
  dispatch_id: text('dispatch_id'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolved_at: timestamp('resolved_at', { withTimezone: true }),
}, (t) => ({
  noteIdx: index('idx_grooming_questions_note').on(t.note_id),
  // Partial index — only unresolved questions need fast lookup for the badge.
  pendingIdx: index('idx_grooming_questions_pending')
    .on(t.note_id)
    .where(sql`${t.resolved_at} IS NULL`),
}));

// ── grooming_proposals ─────────────────────────────────────────────────────
//
// AI-generated decomposition proposals for a parent vault note. Operator
// reviews and accepts/rejects, optionally with feedback. Drives the FTS
// trigger search_grooming_ai/au/ad — the proposal text is searchable.

export const groomingProposals = pgTable('grooming_proposals', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  parent_note_id: text('parent_note_id').notNull().references(() => vaultNotes.id, { onDelete: 'cascade' }),

  proposed_by: text('proposed_by').notNull(),
  proposal: text('proposal').notNull(),

  // No CHECK in production — values evolve (pending/accepted/rejected/modified
  // in the same family as vault_candidates.status, but not yet enforced).
  status: text('status').notNull().default('pending'),
  feedback: text('feedback'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  parentIdx: index('idx_grooming_proposals_parent').on(t.parent_note_id),
  statusIdx: index('idx_grooming_proposals_status').on(t.status),
}));

// ── grooming_corrections ───────────────────────────────────────────────────
//
// Operator overrides of AI-suggested fields, captured per stage/field. The
// raw signal that grooming_lessons learns from. ai_value/corrected_value are
// free text (could be a route name, a priority, an acceptance criterion) —
// jsonb would be over-engineering for what's mostly short scalars.

export const groomingCorrections = pgTable('grooming_corrections', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  note_id: text('note_id').notNull().references(() => vaultNotes.id, { onDelete: 'cascade' }),

  stage: text('stage').notNull(),
  field: text('field').notNull(),
  ai_value: text('ai_value').notNull(),
  corrected_value: text('corrected_value').notNull(),
  reason: text('reason'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  fieldIdx: index('idx_corrections_field').on(t.field),
  // Composite mirrors the SQLite index — stage + chronological for the
  // lesson-mining query that scans recent corrections by stage.
  stageCreatedIdx: index('idx_corrections_stage').on(t.stage, t.created_at),
}));

// ── grooming_corrections_ingested ──────────────────────────────────────────
//
// Marker table — records which corrections have been folded into lessons.
// One row per correction; presence = ingested. PK is the FK to corrections,
// so cascade-delete cleans up automatically.

export const groomingCorrectionsIngested = pgTable('grooming_corrections_ingested', {
  correction_id: bigint('correction_id', { mode: 'number' })
    .primaryKey()
    .references(() => groomingCorrections.id, { onDelete: 'cascade' }),
  ingested_at: timestamp('ingested_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── grooming_lessons ───────────────────────────────────────────────────────
//
// Distilled guidance learned from grooming_corrections. Cited back into
// vault_notes.cited_lesson_ids when applied. hit_count/miss_count track
// utility; supersedes_id forms a soft chain so deprecated lessons keep
// their lineage. source_correction_ids stays text (a JSON-string list of
// correction IDs) — small, opaque to most queries, jsonb is overkill.

export const groomingLessons = pgTable('grooming_lessons', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  kind: text('kind').notNull(),
  trigger: text('trigger').notNull(),
  guidance: text('guidance').notNull(),

  // boolean (was 0/1 int). Default false — lessons are drafted, then
  // explicitly activated after review.
  active: boolean('active').notNull().default(false),

  hit_count: integer('hit_count').notNull().default(0),
  miss_count: integer('miss_count').notNull().default(0),

  // Self-reference. No declared FK in production; keep it loose so a
  // superseded lesson can be deleted without breaking the chain.
  supersedes_id: bigint('supersedes_id', { mode: 'number' }),

  created_by: text('created_by').notNull(),
  source_correction_ids: text('source_correction_ids'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  activated_at: timestamp('activated_at', { withTimezone: true }),
  last_cited_at: timestamp('last_cited_at', { withTimezone: true }),
  deprecated_at: timestamp('deprecated_at', { withTimezone: true }),
  deprecated_reason: text('deprecated_reason'),
}, (t) => ({
  activeIdx: index('idx_lessons_active').on(t.active),
  kindIdx: index('idx_lessons_kind').on(t.kind),
}));

export type GroomingAudit = typeof groomingAudit.$inferSelect;
export type GroomingAuditInsert = typeof groomingAudit.$inferInsert;
export type GroomingQuestion = typeof groomingQuestions.$inferSelect;
export type GroomingQuestionInsert = typeof groomingQuestions.$inferInsert;
export type GroomingProposal = typeof groomingProposals.$inferSelect;
export type GroomingProposalInsert = typeof groomingProposals.$inferInsert;
export type GroomingCorrection = typeof groomingCorrections.$inferSelect;
export type GroomingCorrectionInsert = typeof groomingCorrections.$inferInsert;
export type GroomingCorrectionIngested = typeof groomingCorrectionsIngested.$inferSelect;
export type GroomingCorrectionIngestedInsert = typeof groomingCorrectionsIngested.$inferInsert;
export type GroomingLesson = typeof groomingLessons.$inferSelect;
export type GroomingLessonInsert = typeof groomingLessons.$inferInsert;
