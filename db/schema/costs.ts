import { pgTable, text, integer, real, timestamp, index } from 'drizzle-orm/pg-core';

// ── costs ──────────────────────────────────────────────────────────────────
//
// Token-usage and dollar-cost log. One row per LLM call. 3,063 rows in
// production. Already in use by the briefing/email pipeline. Out of scope
// for the kanban boards but in scope for the dashboard's cost reporting,
// which is on the roadmap.

export const costs = pgTable('costs', {
  id: text('id').primaryKey(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),

  // Free-text — currently 'google' only, more providers coming.
  provider: text('provider').notNull(),
  // Model identifier (matches models.id in the legacy `jimbo` Postgres,
  // but kept as soft reference since cross-DB FKs aren't possible in the PoC).
  model: text('model').notNull(),

  // What kind of work generated the cost — 'email-decision', 'briefing',
  // and many more to come. Free text.
  task_type: text('task_type').notNull(),

  input_tokens: integer('input_tokens').notNull(),
  output_tokens: integer('output_tokens').notNull(),

  // USD. real (not numeric) — display, not accounting; aggregations are
  // approximations of pennies.
  estimated_cost: real('estimated_cost').notNull(),

  notes: text('notes'),
}, (t) => ({
  tsIdx: index('idx_costs_ts').on(t.timestamp),
  modelIdx: index('idx_costs_model').on(t.model),
  taskIdx: index('idx_costs_task').on(t.task_type),
}));

export type Cost = typeof costs.$inferSelect;
