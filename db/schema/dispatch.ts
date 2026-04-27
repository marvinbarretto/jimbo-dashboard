import { sql } from 'drizzle-orm';
import { pgTable, text, integer, timestamp, index, check, bigserial } from 'drizzle-orm/pg-core';
import { vaultNotes } from './vault.js';
import { skills } from './skills.js';

// ── dispatch_queue ─────────────────────────────────────────────────────────
//
// The execution queue. Entries are created by the grooming pipeline and
// consumed by an executor (ralph, boris) that runs the work and reports
// back. Lifecycle: proposed → approved → completed | failed | rejected.
//
// SQLite stored INTEGER PK with autoincrement; bigserial here is the
// idiomatic Postgres equivalent. Existing IDs preserved during ETL by
// inserting explicit values + advancing the sequence.

export const dispatchQueue = pgTable('dispatch_queue', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  // Soft FK — task_source can be 'vault' (vault_notes), 'github' (issue),
  // 'pipeline-pump' (synthetic), 'smoke-test'. Real FK only valid when source
  // is 'vault'; we don't enforce it at the column level for that reason.
  task_id: text('task_id').notNull(),
  task_source: text('task_source').notNull().default('vault'),

  // Grooming-time vs commission-time dispatches behave differently. Production
  // uses 'commission' (deliberate operator dispatch) and 'groom' (pipeline-driven
  // grooming pass). CHECK keeps drift visible.
  flow: text('flow').notNull().default('commission'),

  // What kind of agent should pick this up. Free-text — production has
  // researcher/coder/drafter, more coming.
  agent_type: text('agent_type').notNull(),
  // Who actually ran it. Free-text actor id (ralph, boris).
  executor: text('executor'),
  // Skill slug — FK to skills.id (Phase C consolidation moved skills to
  // jimbo_pg, so the FK is now real). Slash-paths (e.g. 'vault-grooming/analyse')
  // were rewritten to flat slugs ('vault-grooming-analyse') in migration 0008.
  skill: text('skill').references(() => skills.id, { onDelete: 'set null' }),
  skill_context: text('skill_context'),

  // Batch grouping (multiple dispatches kicked off together).
  batch_id: text('batch_id'),

  // proposed → approved → completed/failed/rejected/removed.
  status: text('status').notNull().default('proposed'),

  // Inputs / outputs.
  dispatch_prompt: text('dispatch_prompt'),
  dispatch_repo: text('dispatch_repo'),
  result_summary: text('result_summary'),
  // JSON blob — links, file paths, anything structured the agent produced.
  result_artifacts: text('result_artifacts'),
  error_message: text('error_message'),
  rejection_reason: text('rejection_reason'),
  retry_count: integer('retry_count').notNull().default(0),

  // Linked GitHub issue (when flow is github-driven).
  issue_number: integer('issue_number'),
  issue_repo: text('issue_repo'),
  issue_title: text('issue_title'),
  issue_body: text('issue_body'),

  // PR follow-up.
  pr_url: text('pr_url'),
  pr_state: text('pr_state'),

  // Model that completed it — populated when the agent reports back.
  completed_model: text('completed_model'),

  // Lifecycle timestamps.
  proposed_at: timestamp('proposed_at', { withTimezone: true }),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  rejected_at: timestamp('rejected_at', { withTimezone: true }),
  started_at: timestamp('started_at', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_dispatch_status').on(t.status),
  taskIdIdx: index('idx_dispatch_task_id').on(t.task_id),
  batchIdIdx: index('idx_dispatch_batch_id').on(t.batch_id),
  prUrlIdx: index('idx_dispatch_pr_url').on(t.pr_url),
  executorStatusIdx: index('idx_dispatch_executor_status').on(t.executor, t.status),

  statusCheck: check(
    'dispatch_status_check',
    sql`${t.status} IN ('proposed','approved','running','rejected','completed','failed','removed')`,
  ),
  flowCheck: check(
    'dispatch_flow_check',
    sql`${t.flow} IN ('commission','groom')`,
  ),
  prStateCheck: check(
    'dispatch_pr_state_check',
    sql`${t.pr_state} IS NULL OR ${t.pr_state} IN ('open','merged','rejected','closed')`,
  ),
}));

export type DispatchEntry = typeof dispatchQueue.$inferSelect;
