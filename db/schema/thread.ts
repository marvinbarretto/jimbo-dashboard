import { sql } from 'drizzle-orm';
import { pgTable, text, integer, timestamp, index, check, boolean, bigserial, bigint, unique } from 'drizzle-orm/pg-core';
import { vaultNotes } from './vault.js';

// ── thread_messages ────────────────────────────────────────────────────────
//
// Conversation threads on a vault item. Messages can reply to each other
// and one message can be marked as the "answer" to a question, closing it.
// 512 rows in production, mostly comments.

export const threadMessages = pgTable('thread_messages', {
  id: text('id').primaryKey(),

  vault_item_id: text('vault_item_id')
    .notNull()
    .references(() => vaultNotes.id, { onDelete: 'cascade' }),

  // Free-text actor id. Will FK to actors.id once the table is populated and
  // we're ready to enforce.
  author_actor_id: text('author_actor_id').notNull(),

  // 'comment' | 'question' | 'correction' | 'rejection' — `rejection` (2026-04-27)
  // is paired with the operator-driven needs_rework grooming flow; the body
  // carries the rejection reason and the linked RejectionEvent references this row.
  kind: text('kind').notNull(),

  body: text('body').notNull(),

  // Self-referential reply chain. SET NULL on delete to keep stragglers visible.
  in_reply_to: text('in_reply_to').references((): any => threadMessages.id, { onDelete: 'set null' }),
  // The message that answered this question (if it was a question).
  answered_by: text('answered_by').references((): any => threadMessages.id, { onDelete: 'set null' }),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  vaultIdx: index('idx_thread_messages_vault').on(t.vault_item_id),
  kindCheck: check(
    'thread_messages_kind_check',
    sql`${t.kind} IN ('comment','question','correction','rejection')`,
  ),
}));

// ── attachments ────────────────────────────────────────────────────────────
//
// Files attached to thread messages — images, PDFs, links. 0 rows in
// production but the shape is established and the dashboard renders for it.

export const attachments = pgTable('attachments', {
  id: text('id').primaryKey(),

  thread_message_id: text('thread_message_id')
    .notNull()
    .references(() => threadMessages.id, { onDelete: 'cascade' }),

  // 'image' | 'document' | 'link' — soft constraint, may grow.
  kind: text('kind').notNull(),

  filename: text('filename').notNull(),
  mime_type: text('mime_type').notNull(),
  size_bytes: integer('size_bytes').notNull(),
  url: text('url').notNull(),
  caption: text('caption'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  messageIdx: index('idx_attachments_message').on(t.thread_message_id),
}));

export type ThreadMessage = typeof threadMessages.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;

// ── note_links ─────────────────────────────────────────────────────────────
//
// Polymorphic outbound references from a vault note to either another vault
// note or a context_item. target_id stays text — context_items keys aren't
// the same shape as vault_notes ids, so a typed FK would split the column.
// CHECK prevents self-referential vault_note links; UNIQUE blocks dup edges.

export const noteLinks = pgTable('note_links', {
  // SQLite INTEGER AUTOINCREMENT → bigserial; surrogate, not user-visible.
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  source_note_id: text('source_note_id')
    .notNull()
    .references(() => vaultNotes.id, { onDelete: 'cascade' }),

  // CHECK-constrained: 'vault_note' | 'context_item'. Discriminator for the
  // polymorphic target_id below.
  target_type: text('target_type').notNull(),
  target_id: text('target_id').notNull(),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sourceIdx: index('idx_note_links_source').on(t.source_note_id),
  targetIdx: index('idx_note_links_target').on(t.target_type, t.target_id),

  // Prevent dup edges from the same source to the same target.
  sourceTargetUnique: unique('note_links_source_target_unique').on(
    t.source_note_id, t.target_type, t.target_id,
  ),

  targetTypeCheck: check(
    'note_links_target_type_check',
    sql`${t.target_type} IN ('vault_note', 'context_item')`,
  ),
  // No vault_note self-links — a note pointing at itself is always a bug.
  noSelfLinkCheck: check(
    'note_links_no_self_link_check',
    sql`NOT (${t.target_type} = 'vault_note' AND ${t.target_id} = ${t.source_note_id})`,
  ),
}));

// ── note_thread ────────────────────────────────────────────────────────────
//
// Older legacy thread shape — predates thread_messages. Both tables coexist
// in production; consolidation is a Phase B follow-up. Mirrored here so the
// dashboard can read existing rows without losing them.

export const noteThread = pgTable('note_thread', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  note_id: text('note_id')
    .notNull()
    .references(() => vaultNotes.id, { onDelete: 'cascade' }),

  author: text('author').notNull(),
  content: text('content').notNull(),

  // Self-FK; SET NULL keeps replies visible if their parent is deleted.
  // bigint to match the bigserial parent column.
  reply_to_id: bigint('reply_to_id', { mode: 'number' }).references((): any => noteThread.id, { onDelete: 'set null' }),

  // boolean (was 0/1 int). Marks this entry as a correction to the note.
  is_correction: boolean('is_correction').notNull().default(false),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Composite index mirrors SQLite; chronological replay per note.
  noteIdx: index('idx_note_thread_note').on(t.note_id, t.created_at),
}));

export type NoteLink = typeof noteLinks.$inferSelect;
export type NoteLinkInsert = typeof noteLinks.$inferInsert;
export type NoteThread = typeof noteThread.$inferSelect;
export type NoteThreadInsert = typeof noteThread.$inferInsert;
