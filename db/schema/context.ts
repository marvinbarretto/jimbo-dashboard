import { sql } from 'drizzle-orm';
import {
  pgTable, text, integer, timestamp,
  index, check,
} from 'drizzle-orm/pg-core';

// ── context_files / context_sections / context_items ──────────────────────
//
// Operator-context tables. Files contain ordered sections; sections contain
// ordered items. Cascade-delete down the tree — a file going away takes its
// sections and items with it (unlike vault_notes parent_id, where orphaning
// is the right choice). These rows are pure container/content; nothing else
// references them, so cascade is safe.
//
// SQLite used INTEGER PRIMARY KEY AUTOINCREMENT. Postgres equivalent is
// integer + generatedAlwaysAsIdentity — preserves numeric IDs, lets the DB
// own the sequence. Migration will need to set the sequence start value
// from the existing max(id) to keep IDs continuous.

export const contextFiles = pgTable('context_files', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),

  // Stable URL/lookup key. Unique — slug collisions would silently overwrite.
  slug: text('slug').notNull().unique(),

  display_name: text('display_name').notNull(),

  // Operator-controlled ordering across files.
  sort_order: integer('sort_order').notNull().default(0),

  // timestamptz — store UTC, render local. Was naive datetime('now') string.
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const contextSections = pgTable('context_sections', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),

  // Cascade — sections are owned by their file.
  file_id: integer('file_id')
    .notNull()
    .references(() => contextFiles.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),

  // Free text in production; controls render style ('list' is the default).
  // No CHECK — values are evolving (list/table/text/etc) and the snapshot
  // had no constraint either.
  format: text('format').notNull().default('list'),

  sort_order: integer('sort_order').notNull().default(0),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  fileIdIdx: index('idx_context_sections_file_id').on(t.file_id),
}));

export const contextItems = pgTable('context_items', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),

  // Cascade — items are owned by their section.
  section_id: integer('section_id')
    .notNull()
    .references(() => contextSections.id, { onDelete: 'cascade' }),

  // Optional bullet label (e.g. "Goal:" before content). Nullable.
  label: text('label'),

  content: text('content').notNull(),

  sort_order: integer('sort_order').notNull().default(0),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

  // Added by later ALTER TABLE migrations in SQLite — preserved here.
  timeframe: text('timeframe'),

  // CHECK lifted verbatim from snapshot.
  status: text('status'),

  // CHECK lifted verbatim from snapshot.
  category: text('category'),

  // Naive ISO string in SQLite → timestamptz here. Item-level expiry.
  expires_at: timestamp('expires_at', { withTimezone: true }),
}, (t) => ({
  sectionIdIdx: index('idx_context_items_section_id').on(t.section_id),

  // CHECK constraints — values lifted verbatim from snapshot, including
  // the SQLite-native quoting style. Allow NULL (snapshot CHECK does too,
  // since the column was added without NOT NULL).
  statusCheck: check(
    'context_items_status_check',
    sql`${t.status} IS NULL OR ${t.status} IN ('active', 'paused', 'completed', 'deferred')`,
  ),
  categoryCheck: check(
    'context_items_category_check',
    sql`${t.category} IS NULL OR ${t.category} IN ('project', 'life-area', 'habit', 'one-off')`,
  ),
}));

export type ContextFile = typeof contextFiles.$inferSelect;
export type ContextFileInsert = typeof contextFiles.$inferInsert;

export type ContextSection = typeof contextSections.$inferSelect;
export type ContextSectionInsert = typeof contextSections.$inferInsert;

export type ContextItem = typeof contextItems.$inferSelect;
export type ContextItemInsert = typeof contextItems.$inferInsert;
