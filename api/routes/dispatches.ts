import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { dispatchQueue } from '../../db/schema/index.js';
import { DispatchSchema, ErrorSchema, listResponse } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// ── GET / ─────────────────────────────────────────────────────────────────
//
// Execution-board feed. Each row carries enough to render a card without
// follow-up fetches: the vault item's title and seq (joined via the soft
// task_id reference, matched only when task_source = 'vault').
//
// Production has 1,065 dispatches with 989 completed — the board would be
// unusable without limits. Default returns the most recent 500.

export const dispatchesRoute = new OpenAPIHono();

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Dispatches'],
  summary: 'Execution-board dispatch feed',
  request: {
    query: z.object({
      status: z.union([z.string(), z.array(z.string())]).optional()
        .openapi({ description: 'Filter by status (repeatable)' }),
      executor: z.union([z.string(), z.array(z.string())]).optional()
        .openapi({ description: 'Filter by executor (repeatable)' }),
      flow: z.union([z.string(), z.array(z.string())]).optional()
        .openapi({ description: 'Filter by flow (repeatable)' }),
      limit: z.coerce.number().int().min(1).max(2000).default(500)
        .openapi({ description: 'Max items (1-2000)', example: 500 }),
    }),
  },
  responses: {
    200: {
      description: 'Dispatch list',
      content: {
        'application/json': {
          schema: listResponse(DispatchSchema, {
            total: z.number(),
            limit: z.number(),
          }),
        },
      },
    },
  },
});

dispatchesRoute.openapi(listRoute, async (c) => {
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

      // Soft FK — null when task_source != 'vault'.
      task_title: sql<string | null>`(
        SELECT vn.title
        FROM "vault_notes" vn
        WHERE vn.id = "dispatch_queue"."task_id"
        LIMIT 1
      )`,
      // postgres-js otherwise hands raw bigint back as a string.
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

  return c.json({ items: rows, total: rows.length, limit }, 200);
});

// ── PATCH /:id ────────────────────────────────────────────────────────────
//
// Operator-triggered mutations on a dispatch row. Currently the only path the
// dashboard frontend uses is "retry a failed dispatch" — flips status back to
// 'approved', clears error/timestamps, increments retry_count. Kept generic
// (any subset of mutable fields) so the next mutation flow doesn't need a
// new endpoint.

const DispatchPatchBody = z.object({
  status: z.enum(['proposed','approved','rejected','running','completed','failed','removed']).optional(),
  executor: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  result_summary: z.string().nullable().optional(),
  retry_count: z.number().int().min(0).optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

const DispatchIdParam = z.object({
  id: z.coerce.number().int().openapi({ param: { name: 'id', in: 'path' }, example: 123 }),
});

const patchR = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Dispatches'],
  summary: 'Update mutable fields on a dispatch row',
  request: {
    params: DispatchIdParam,
    body: { content: { 'application/json': { schema: DispatchPatchBody } } },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: DispatchSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

dispatchesRoute.openapi(patchR, async (c) => {
  const { id } = c.req.valid('param');
  const patch = c.req.valid('json');
  // Drizzle maps undefined fields out, so partial patches send only the keys
  // the caller supplied. Date columns accept ISO strings via the coercion in
  // postgres.js — null clears the column.
  const setObj: Record<string, unknown> = { ...patch };
  const [updated] = await db.update(dispatchQueue).set(setObj).where(eq(dispatchQueue.id, id)).returning();
  if (!updated) return errorResponse(c, 404, 'DISPATCH_NOT_FOUND', `Dispatch ${id} not found`);
  return c.json(updated as Record<string, unknown>, 200);
});
