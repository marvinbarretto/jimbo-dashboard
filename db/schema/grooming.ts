import { sql } from 'drizzle-orm';
import { pgTable, text, boolean, timestamp, jsonb, bigserial, index } from 'drizzle-orm/pg-core';
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

export type GroomingAudit = typeof groomingAudit.$inferSelect;
export type GroomingQuestion = typeof groomingQuestions.$inferSelect;
