import {
  pgTable, text, timestamp, customType, index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Drizzle has no first-class tsvector type. Custom type keeps the column
// typed; the value is server-managed (GENERATED ALWAYS AS … STORED) so it
// is never written from app code — only read via raw SQL in jimbo-api's
// search service.
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() { return 'tsvector'; },
});

// ── search_index ───────────────────────────────────────────────────────────
//
// Cross-source full-text + fuzzy-match index. One row per (source, source_id);
// upserted by per-source AFTER triggers in jimbo-api/src/search/setup-pg.ts.
// Replaces the SQLite FTS5 virtual table — Postgres-native via tsvector
// (stemmed) + pg_trgm (typo tolerance + prefix).
//
// search_vector is GENERATED ALWAYS AS (… setweight(title, 'A') ||
// setweight(body, 'B')) STORED so writes only set title/body. Drizzle's
// GENERATED support for stored columns is limited; encoded via .generatedAlwaysAs().

export const searchIndex = pgTable('search_index', {
  source:    text('source').notNull(),     // 'vault' | 'email' | 'thread' | …
  source_id: text('source_id').notNull(),  // string form of the row id

  title: text('title'),
  body:  text('body'),

  search_vector: tsvector('search_vector').generatedAlwaysAs(
    sql`setweight(to_tsvector('english', coalesce(title,'')), 'A') || setweight(to_tsvector('english', coalesce(body,'')), 'B')`,
  ),

  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.source, t.source_id] }),

  // GIN on the generated tsvector — primary FTS index, drives @@ matches.
  vectorIdx: index('idx_search_index_vector').using('gin', t.search_vector),

  // pg_trgm GIN indexes for typo/fuzzy fallback. Require pg_trgm extension.
  // gin_trgm_ops is not in drizzle's helper list — using raw `using` form.
  titleTrgmIdx: index('idx_search_index_title_trgm')
    .using('gin', sql`title gin_trgm_ops`),
  bodyTrgmIdx: index('idx_search_index_body_trgm')
    .using('gin', sql`body gin_trgm_ops`),
}));

export type SearchIndex = typeof searchIndex.$inferSelect;
export type SearchIndexInsert = typeof searchIndex.$inferInsert;
