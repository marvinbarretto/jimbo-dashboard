import {
  pgTable, text, timestamp, bigserial,
  index, unique,
} from 'drizzle-orm/pg-core';

// ── product_summaries ──────────────────────────────────────────────────────
//
// Cross-product telemetry sink: each row is a generated summary scoped by
// (product, app, environment, summary_type, window). The composite UNIQUE
// enforces "one summary per slot" — re-runs upsert. Producers post payloads;
// dashboards read by lookup tuple.

export const productSummaries = pgTable('product_summaries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  // 5-tuple identity. All free text — products and environments come and
  // go; a CHECK would force migrations every time we added 'staging-eu' or
  // a new app. The UNIQUE below enforces shape, not values.
  product: text('product').notNull(),
  app: text('app').notNull(),
  environment: text('environment').notNull(),
  summary_type: text('summary_type').notNull(),
  window: text('window').notNull(),

  // When the producer generated the summary — used for staleness checks
  // independent of received_at (which is row-insert time).
  generated_at: timestamp('generated_at', { withTimezone: true }).notNull(),

  // Opaque payload. Kept as text (not jsonb) because shape varies per
  // summary_type and we don't query inside; consumers parse as needed.
  payload: text('payload').notNull(),

  received_at: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Composite uniqueness mirrors SQLite's UNIQUE(product,app,environment,
  // summary_type,window). Drives upsert-on-conflict in producers.
  slotUnique: unique('product_summaries_slot_unique').on(
    t.product, t.app, t.environment, t.summary_type, t.window,
  ),

  lookupIdx: index('idx_product_summaries_lookup').on(
    t.product, t.app, t.environment, t.summary_type, t.window,
  ),
  generatedAtIdx: index('idx_product_summaries_generated_at').on(t.generated_at.desc()),
}));

export type ProductSummary = typeof productSummaries.$inferSelect;
export type ProductSummaryInsert = typeof productSummaries.$inferInsert;
