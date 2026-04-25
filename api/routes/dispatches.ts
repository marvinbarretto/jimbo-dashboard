import { Hono } from 'hono';
import { and, desc, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { dispatchQueue } from '../../db/schema';

// ── GET /api/dispatches ────────────────────────────────────────────────────
//
// Execution-board feed. Each row carries enough to render a card without
// follow-up fetches: the vault item's title and seq (joined via the soft
// task_id reference, matched only when task_source = 'vault').
//
// Production has 1,065 dispatches with 989 completed — the board would be
// unusable without limits. Default returns the most recent 500.
//
// Filter params:
//   ?status=approved        — repeatable
//   ?executor=ralph         — repeatable
//   ?flow=commission        — repeatable
//   ?limit=200              — default 500, hard cap 2000

export const dispatchesRoute = new Hono();

dispatchesRoute.get('/', async (c) => {
  const url = new URL(c.req.url);
  const statuses = url.searchParams.getAll('status');
  const executors = url.searchParams.getAll('executor');
  const flows = url.searchParams.getAll('flow');
  const limitRaw = Number(url.searchParams.get('limit') ?? '500');
  const limit = Math.min(Math.max(1, limitRaw), 2000);

  const filters = [
    statuses.length ? inArray(dispatchQueue.status, statuses) : undefined,
    executors.length ? inArray(dispatchQueue.executor, executors) : undefined,
    flows.length ? inArray(dispatchQueue.flow, flows) : undefined,
  ].filter((x): x is NonNullable<typeof x> => x !== undefined);

  const rows = await db
    .select({
      id: dispatchQueue.id,
      task_id: dispatchQueue.task_id,
      task_source: dispatchQueue.task_source,
      flow: dispatchQueue.flow,
      agent_type: dispatchQueue.agent_type,
      executor: dispatchQueue.executor,
      skill: dispatchQueue.skill,
      skill_context: dispatchQueue.skill_context,
      status: dispatchQueue.status,
      dispatch_prompt: dispatchQueue.dispatch_prompt,
      result_summary: dispatchQueue.result_summary,
      error_message: dispatchQueue.error_message,
      rejection_reason: dispatchQueue.rejection_reason,
      retry_count: dispatchQueue.retry_count,
      pr_url: dispatchQueue.pr_url,
      pr_state: dispatchQueue.pr_state,
      completed_model: dispatchQueue.completed_model,
      proposed_at: dispatchQueue.proposed_at,
      approved_at: dispatchQueue.approved_at,
      started_at: dispatchQueue.started_at,
      completed_at: dispatchQueue.completed_at,
      created_at: dispatchQueue.created_at,

      // Joined vault title — only meaningful when task_source = 'vault'.
      // Use a correlated subquery keyed off the soft FK; null when missing.
      task_title: sql<string | null>`(
        SELECT vn.title
        FROM "vault_notes" vn
        WHERE vn.id = "dispatch_queue"."task_id"
        LIMIT 1
      )`,
      // Cast bigint→int4 — seq fits comfortably and postgres-js otherwise
      // hands raw bigint back as a string.
      task_seq: sql<number | null>`(
        SELECT vn.seq::int
        FROM "vault_notes" vn
        WHERE vn.id = "dispatch_queue"."task_id"
        LIMIT 1
      )`,
    })
    .from(dispatchQueue)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(dispatchQueue.created_at))
    .limit(limit);

  return c.json({
    items: rows,
    total: rows.length,
    limit,
  });
});
