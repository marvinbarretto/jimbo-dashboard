import { sql } from 'drizzle-orm';
import {
  pgTable, text, integer, bigint, timestamp, real, jsonb,
  index, check,
} from 'drizzle-orm/pg-core';

// ── pipeline_runs / bakeoff_runs / runs ────────────────────────────────────
//
// Postgres-native rewrite of the production SQLite pipeline + experiment
// tables. These three live together because they describe AI execution
// telemetry: scheduled pipelines (briefings/syncs), capability bakeoffs
// (model-vs-model on a task), and individual model runs (per-call cost,
// latency, ratings). Same intake patterns, same retention horizon.
//
// SQLite stored steps/quality_scores as JSON-strings; we promote to jsonb
// for queryability without losing the original shape. INTEGER 0/1 stays as
// integer here — no row uses these as booleans (opus_status carries the
// boolean-ish meaning via text). Naive timestamps become timestamptz.

// ── pipeline_runs ──────────────────────────────────────────────────────────
// One row per scheduled pipeline execution (morning/afternoon briefing,
// vault sync, etc). `session` is the slot name (NOT a UUID); `steps` is a
// jsonb map of step → result for operator post-mortem.
export const pipelineRuns = pgTable('pipeline_runs', {
  // bigint serial PK — production uses INTEGER AUTOINCREMENT, no string IDs.
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),

  // Slot identifier ('morning', 'afternoon', 'vault-sync', …). Indexed for
  // "show me the last morning run" queries.
  session: text('session').notNull(),

  // Free text (running/success/failed/partial). No CHECK — production data
  // shows enough variation that locking it down would block evolving steps.
  status: text('status').notNull(),

  started_at: timestamp('started_at', { withTimezone: true }).notNull(),
  duration_ms: integer('duration_ms'),

  // Per-step results. jsonb (was JSON-string) — queryable for "which steps
  // failed across morning runs this week?" without app-side parsing.
  steps: jsonb('steps').notNull().default(sql`'{}'::jsonb`),

  // Opus-specific posting telemetry. Split fields (status/error/posted_at)
  // because the app reads them independently when rendering pipeline cards.
  opus_status: text('opus_status'),
  opus_error: text('opus_error'),
  opus_posted_at: timestamp('opus_posted_at', { withTimezone: true }),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  createdIdx: index('idx_pipeline_runs_created').on(t.created_at),
  sessionIdx: index('idx_pipeline_runs_session').on(t.session),
}));

// ── bakeoff_runs ───────────────────────────────────────────────────────────
// Capability bakeoff results — one row per (capability, model) measurement.
// Used to feed model-routing decisions. `flags` is free text for ad-hoc
// notes ("nondeterministic", "ran with reasoning"); not jsonb because
// downstream code only ever displays it.
export const bakeoffRuns = pgTable('bakeoff_runs', {
  // String PK — production-assigned (timestamp-prefixed slug), not serial.
  id: text('id').primaryKey(),

  // Wall-clock when measurement was taken. timestamptz; default mirrors
  // SQLite's `datetime('now')` so back-fills still work.
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),

  // Capability under test ('summarize', 'classify', 'extract', …). Free
  // text — capabilities are added without schema changes.
  capability: text('capability').notNull(),

  // Model identifier ('claude-opus-4', 'gpt-4o', …). Free text for the
  // same reason; new models appear faster than migrations land.
  model: text('model').notNull(),

  // 0..1 quality score from the bakeoff harness. real (display, not money).
  score: real('score').notNull(),

  // Cost in USD for the bakeoff sample. real — sample-level, not aggregated
  // billing; precision loss is acceptable here.
  cost_usd: real('cost_usd').notNull(),

  flags: text('flags'),

  // Number of samples this row aggregates. Default 1 = single-shot.
  sample_n: integer('sample_n').notNull().default(1),
});

// ── runs ───────────────────────────────────────────────────────────────────
// Per-call model execution log. Every AI invocation Jimbo makes ends up
// here: cost, latency, tokens, conductor/operator ratings, optional
// parent_run_id for chained calls. The fact-table that pipeline_runs and
// bakeoff_runs ultimately reference for "what actually happened".
export const runs = pgTable('runs', {
  // String PK — caller-assigned (UUID or slug). NOT auto-generated; the
  // dispatching code needs the ID before insert to thread it through logs.
  run_id: text('run_id').primaryKey(),

  // Task identifier (vault note ID, dispatch ID, briefing slot, …). Free
  // text — could reference any of several tables. No FK; semantics vary.
  task_id: text('task_id').notNull(),

  // Self-FK for chained calls (decompose → critique → revise). ON DELETE
  // SET NULL — losing a parent shouldn't orphan-delete the children's
  // telemetry; cost data is forever.
  parent_run_id: text('parent_run_id').references((): any => runs.run_id, { onDelete: 'set null' }),

  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),

  model: text('model').notNull(),
  config_hash: text('config_hash'),

  // Token counts — integer is enough for any single call; aggregate
  // reporting sums on read.
  input_tokens: integer('input_tokens'),
  output_tokens: integer('output_tokens'),

  // Cost in USD. real — display precision; billing is reconciled upstream.
  cost_usd: real('cost_usd'),
  duration_ms: integer('duration_ms'),

  input_summary: text('input_summary'),
  output_summary: text('output_summary'),

  // jsonb (was JSON-string) — multiple scorers write here (auto-eval,
  // conductor critique). Queryable for "average factuality score this week".
  quality_scores: jsonb('quality_scores'),

  // Two rating columns is intentional: conductor_rating is the AI critic's
  // verdict, user_rating is operator override. Same operator-override
  // pattern as vault_notes ai_priority/manual_priority.
  conductor_rating: integer('conductor_rating'),
  user_rating: integer('user_rating'),
  user_notes: text('user_notes'),
  conductor_reasoning: text('conductor_reasoning'),

  // Pipeline session this run belongs to ('morning', 'afternoon', …).
  // Free text matching pipeline_runs.session; not FK because runs predate
  // pipelines (one-shot calls have no session).
  session: text('session'),
}, (t) => ({
  tsIdx: index('idx_runs_ts').on(t.timestamp),
  taskIdx: index('idx_runs_task').on(t.task_id),
  modelIdx: index('idx_runs_model').on(t.model),
}));

export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type PipelineRunInsert = typeof pipelineRuns.$inferInsert;

export type BakeoffRun = typeof bakeoffRuns.$inferSelect;
export type BakeoffRunInsert = typeof bakeoffRuns.$inferInsert;

export type Run = typeof runs.$inferSelect;
export type RunInsert = typeof runs.$inferInsert;
