import { pgTable, text, integer, real, timestamp, index, bigint, uniqueIndex } from 'drizzle-orm/pg-core';
import { dispatchQueue } from './dispatch.js';

// ── costs ──────────────────────────────────────────────────────────────────
//
// Canonical LLM-call log. One row per `messages.create()` (or equivalent).
// 3,063 rows in production at Phase B handover (briefing/email pipelines).
// Phase C extends this to also record dispatch turns: when an agent's
// runner makes a tool-using LLM call as part of executing a dispatch, each
// call lands here with dispatch_id + turn_number set.
//
// Why one table for everything: a "turn" IS an LLM call. Splitting them
// across two tables fragments cost queries ("which subsystem cost most
// this week?" needs UNION). Additive columns are nullable so legacy
// briefing/email writes keep working unchanged.

export const costs = pgTable('costs', {
  id: text('id').primaryKey(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),

  // Free-text — currently 'google' only, more providers coming.
  provider: text('provider').notNull(),
  // Model identifier (matches models.id in the legacy `jimbo` Postgres,
  // but kept as soft reference since cross-DB FKs aren't possible in the PoC).
  model: text('model').notNull(),

  // What kind of work generated the cost — 'email-decision', 'briefing',
  // 'dispatch_turn', and many more to come. Free text.
  task_type: text('task_type').notNull(),

  input_tokens: integer('input_tokens').notNull(),
  output_tokens: integer('output_tokens').notNull(),

  // USD. real (not numeric) — display, not accounting; aggregations are
  // approximations of pennies. Precision is ~7 significant digits which
  // handles fractional cents at our scale.
  estimated_cost: real('estimated_cost').notNull(),

  notes: text('notes'),

  // ── Phase C additions (dispatch turns) ─────────────────────────────────
  // All nullable so legacy callers (briefing/email) write the same shape.
  // Only dispatch-turn rows populate the dispatch-specific block.

  // FK to dispatch_queue when this LLM call ran inside a dispatch.
  // ON DELETE SET NULL — keep the cost record even if the dispatch is purged.
  dispatch_id: bigint('dispatch_id', { mode: 'number' }).references(() => dispatchQueue.id, { onDelete: 'set null' }),
  // Turn position within the dispatch (1-indexed). UNIQUE with dispatch_id
  // gives the runner idempotency on retry.
  turn_number: integer('turn_number'),

  // Anthropic prompt-cache accounting. Default 0 keeps math safe for
  // providers that don't support caching.
  cache_read_tokens: integer('cache_read_tokens').notNull().default(0),
  cache_write_tokens: integer('cache_write_tokens').notNull().default(0),

  // Wall-clock for the API call. Nullable — runners may not always measure.
  duration_ms: integer('duration_ms'),

  // Anthropic-style stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | etc.
  stop_reason: text('stop_reason'),
  // Number of tool_use blocks in the response — a cheap proxy for "did the
  // model want another turn?".
  tool_use_count: integer('tool_use_count').notNull().default(0),

  // Who initiated the LLM call. For dispatch turns: dispatch.executor.
  // For briefing/email: caller-supplied actor or NULL.
  actor: text('actor'),

  // Distinct from `timestamp` (row creation): when the API call started/ended.
  // Lets us compute latency without storing duration_ms separately if needed.
  started_at: timestamp('started_at', { withTimezone: true }),
  ended_at: timestamp('ended_at', { withTimezone: true }),
}, (t) => ({
  tsIdx: index('idx_costs_ts').on(t.timestamp),
  modelIdx: index('idx_costs_model').on(t.model),
  taskIdx: index('idx_costs_task').on(t.task_type),
  dispatchIdx: index('idx_costs_dispatch').on(t.dispatch_id),
  actorIdx: index('idx_costs_actor').on(t.actor),
  // Enables idempotent turn writes — the runner can POST the same
  // (dispatch_id, turn_number) twice without creating duplicates.
  // Multiple NULL dispatch_ids are allowed since Postgres treats NULL
  // as distinct in UNIQUE constraints.
  dispatchTurnUnique: uniqueIndex('uq_costs_dispatch_turn').on(t.dispatch_id, t.turn_number),
}));

export type Cost = typeof costs.$inferSelect;
