import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// ── actors ─────────────────────────────────────────────────────────────────
//
// People and agents that act on vault items. In production the table exists
// but is empty (0 rows) — actor identities currently live as flat strings on
// vault_notes.assigned_to and dispatch_queue.executor (marvin, ralph, boris).
// The ETL synthesizes rows from those distinct values.
//
// Actors include both humans (marvin) and AI agents (ralph, boris). The kind
// distinction matters for UI (avatar style, owner-chip color) and for events
// (jimbo-as-system events have no human actor).

export const actors = pgTable('actors', {
  // Lowercase slug — referenced from vault_notes.assigned_to as plain text.
  // Keep as PK so we can FK once we're ready to enforce.
  id: text('id').primaryKey(),

  display_name: text('display_name').notNull(),

  // 'human' | 'agent' | 'system' — soft constraint, may grow.
  kind: text('kind').notNull().default('human'),

  // CSS custom-property name for colour tokens (--actor-marvin, etc).
  // The dashboard already encodes these; mirror them in storage so
  // server-rendered surfaces (briefings) can pick the same hue.
  color_token: text('color_token'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Actor = typeof actors.$inferSelect;
export type ActorInsert = typeof actors.$inferInsert;
