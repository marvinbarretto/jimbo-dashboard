import { sql } from 'drizzle-orm';
import { pgTable, text, integer, timestamp, index, check } from 'drizzle-orm/pg-core';
import { vaultNotes } from './vault';

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

  // 'comment' | 'question' | 'correction' (3 values in production).
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
    sql`${t.kind} IN ('comment','question','correction')`,
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
