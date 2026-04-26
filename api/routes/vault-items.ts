import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { and, desc, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { vaultNotes } from '../../db/schema/index.js';
import { VaultItemSchema, listResponse } from '../schemas/shared.js';

interface LiveEvent {
  ts: string;
  actor_id: string;
  actor_display_name: string | null;
  action: string;
  from_value: string | null;
  to_value: string | null;
}

interface LiveMessage {
  created_at: string;
  author_actor_id: string;
  author_display_name: string | null;
  kind: string;
  body_excerpt: string;
}

// ── GET / ─────────────────────────────────────────────────────────────────
//
// Board-shaped list. Each row carries the data the kanban needs to render
// without follow-up requests:
//   - core vault_notes columns
//   - primary_project (id + display_name) flattened from junction
//   - open_questions_count (unresolved grooming_questions)
//   - latest_activity_at (max ts from note_activity)
//   - children_count (rows where parent_id = this.id)

export const vaultItemsRoute = new OpenAPIHono();

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['VaultItems'],
  summary: 'Board-shaped vault item list with embedded joins',
  request: {
    query: z.object({
      status: z.union([z.string(), z.array(z.string())]).optional()
        .openapi({ description: 'Filter by status (repeatable)' }),
      grooming_status: z.union([z.string(), z.array(z.string())]).optional()
        .openapi({ description: 'Filter by grooming_status (repeatable)' }),
      assigned_to: z.union([z.string(), z.array(z.string())]).optional()
        .openapi({ description: 'Filter by assignee (repeatable)' }),
      limit: z.coerce.number().int().min(1).max(2000).default(500)
        .openapi({ description: 'Max items (1-2000)', example: 500 }),
    }),
  },
  responses: {
    200: {
      description: 'Vault items',
      content: {
        'application/json': {
          schema: listResponse(VaultItemSchema, {
            total: z.number(),
            limit: z.number(),
          }),
        },
      },
    },
  },
});

vaultItemsRoute.openapi(listRoute, async (c) => {
  const url = new URL(c.req.url);
  const statuses = url.searchParams.getAll('status');
  const grooming = url.searchParams.getAll('grooming_status');
  const assigned = url.searchParams.getAll('assigned_to');
  const limitRaw = Number(url.searchParams.get('limit') ?? '500');
  const limit = Math.min(Math.max(1, limitRaw), 2000);

  const filters = [
    statuses.length ? inArray(vaultNotes.status, statuses) : undefined,
    grooming.length ? inArray(vaultNotes.grooming_status, grooming) : undefined,
    assigned.length ? inArray(vaultNotes.assigned_to, assigned) : undefined,
  ].filter((x): x is NonNullable<typeof x> => x !== undefined);

  // Single SQL with correlated subqueries — index-backed (idx_grooming_questions_pending,
  // idx_note_activity_note, idx_vault_parent_id, idx_vault_item_projects_one_primary).
  // Drizzle's template substitution drops the outer-table qualifier in
  // subquery scope, so we hand-qualify with raw SQL.
  const rows = await db
    .select({
      id: vaultNotes.id,
      seq: vaultNotes.seq,
      title: vaultNotes.title,
      type: vaultNotes.type,
      status: vaultNotes.status,
      grooming_status: vaultNotes.grooming_status,
      ai_priority: vaultNotes.ai_priority,
      manual_priority: vaultNotes.manual_priority,
      priority_confidence: vaultNotes.priority_confidence,
      ai_rationale: vaultNotes.ai_rationale,
      assigned_to: vaultNotes.assigned_to,
      route: vaultNotes.route,
      tags: vaultNotes.tags,
      ready: vaultNotes.ready,
      is_epic: vaultNotes.is_epic,
      parent_id: vaultNotes.parent_id,
      blocked_by: vaultNotes.blocked_by,
      blocked_reason: vaultNotes.blocked_reason,
      blocked_at: vaultNotes.blocked_at,
      due_at: vaultNotes.due_at,
      created_at: vaultNotes.created_at,
      updated_at: vaultNotes.updated_at,
      completed_at: vaultNotes.completed_at,
      grooming_started_at: vaultNotes.grooming_started_at,
      body: vaultNotes.body,
      acceptance_criteria: vaultNotes.acceptance_criteria,
      actionability: vaultNotes.actionability,
      source_kind: vaultNotes.source_kind,
      source_ref: vaultNotes.source_ref,
      source_url: vaultNotes.source_url,
      source_signal: vaultNotes.source_signal,

      primary_project_id: sql<string | null>`(
        SELECT vip.project_id
        FROM "vault_item_projects" vip
        WHERE vip.vault_item_id = "vault_notes"."id"
          AND vip.is_primary = true
        LIMIT 1
      )`,
      primary_project_name: sql<string | null>`(
        SELECT p.display_name
        FROM "vault_item_projects" vip
        JOIN "projects" p ON p.id = vip.project_id
        WHERE vip.vault_item_id = "vault_notes"."id"
          AND vip.is_primary = true
        LIMIT 1
      )`,

      open_questions_count: sql<number>`(
        SELECT COUNT(*)::int
        FROM "grooming_questions" gq
        WHERE gq.note_id = "vault_notes"."id"
          AND gq.resolved_at IS NULL
      )`,

      latest_activity_at: sql<Date | null>`(
        SELECT MAX(na.ts)
        FROM "note_activity" na
        WHERE na.note_id = "vault_notes"."id"
      )`,

      latest_event: sql<LiveEvent | null>`(
        SELECT json_build_object(
          'ts',                 na.ts,
          'actor_id',           na.actor,
          'actor_display_name', a.display_name,
          'action',             na.action,
          'from_value',         na.from_value,
          'to_value',           na.to_value
        )
        FROM "note_activity" na
        LEFT JOIN "actors" a ON a.id = na.actor
        WHERE na.note_id = "vault_notes"."id"
        ORDER BY na.ts DESC
        LIMIT 1
      )`,

      latest_message: sql<LiveMessage | null>`(
        SELECT json_build_object(
          'created_at',           tm.created_at,
          'author_actor_id',      tm.author_actor_id,
          'author_display_name',  a.display_name,
          'kind',                 tm.kind,
          'body_excerpt',         CASE
            WHEN length(tm.body) <= 120 THEN tm.body
            ELSE substr(tm.body, 1, 119) || '…'
          END
        )
        FROM "thread_messages" tm
        LEFT JOIN "actors" a ON a.id = tm.author_actor_id
        WHERE tm.vault_item_id = "vault_notes"."id"
        ORDER BY tm.created_at DESC
        LIMIT 1
      )`,

      // Drives the "stuck Nd" hint on the kanban card.
      days_in_column: sql<number>`(
        SELECT COALESCE(
          EXTRACT(EPOCH FROM (NOW() - MAX(ga.created_at))) / 86400,
          0
        )::float
        FROM "grooming_audit" ga
        WHERE ga.note_id = "vault_notes"."id"
          AND ga.to_status = "vault_notes"."grooming_status"
      )`,

      children_count: sql<number>`(
        SELECT COUNT(*)::int
        FROM "vault_notes" children
        WHERE children.parent_id = "vault_notes"."id"
      )`,
    })
    .from(vaultNotes)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(vaultNotes.seq))
    .limit(limit);

  return c.json({ items: rows, total: rows.length, limit }, 200);
});

// ── POST / — quick-capture create ─────────────────────────────────────────
//
// Server-to-server proxy to jimbo-api's POST /api/vault/notes. Preserves
// jimbo-api's authoritative create logic (slug-style id, sequence assignment,
// ready-flag computation, optional note_links insertion in a transaction).
// Frontend sends the dashboard-api X-API-Key (interceptor); dashboard-api
// authenticates upstream with JIMBO_API_KEY held server-side.

const CreateBody = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  type: z.string().optional(),
  tags: z.string().optional(),
  manual_priority: z.number().int().min(0).max(3).optional(),
  assigned_to: z.string().optional(),
}).openapi({ description: 'Quick-capture body — embellish later as the parser grows' });

const createRouteDef = createRoute({
  method: 'post',
  path: '/',
  tags: ['VaultItems'],
  summary: 'Create a vault item (proxies to jimbo-api)',
  request: {
    body: { content: { 'application/json': { schema: CreateBody } } },
  },
  responses: {
    201: {
      description: 'Created',
      content: { 'application/json': { schema: z.record(z.string(), z.unknown()).openapi({ type: 'object' }) } },
    },
    400: {
      description: 'Validation error from jimbo-api',
      content: { 'application/json': { schema: z.record(z.string(), z.unknown()).openapi({ type: 'object' }) } },
    },
    502: {
      description: 'Upstream jimbo-api unreachable',
      content: { 'application/json': { schema: z.object({ error: z.object({ code: z.string(), message: z.string() }) }) } },
    },
  },
});

vaultItemsRoute.openapi(createRouteDef, async (c) => {
  const body = c.req.valid('json');
  const upstream = process.env.JIMBO_API_URL;
  const upstreamKey = process.env.JIMBO_API_KEY;
  if (!upstream || !upstreamKey) {
    return c.json(
      { error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } },
      502,
    );
  }

  let res: Response;
  try {
    res = await fetch(`${upstream}/api/vault/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': upstreamKey },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return c.json(
      { error: { code: 'UPSTREAM_FETCH_FAILED', message: (e as Error).message } },
      502,
    );
  }

  // Pass through whatever jimbo-api returned — its 201 body is the canonical
  // VaultNote shape, and 4xx bodies follow the shared ErrorSchema.
  const payload = await res.json().catch(() => ({}));
  if (res.status === 201) return c.json(payload as Record<string, unknown>, 201);
  if (res.status === 400) return c.json(payload as Record<string, unknown>, 400);
  return c.json(
    { error: { code: 'UPSTREAM_ERROR', message: `jimbo-api returned ${res.status}` } },
    502,
  );
});
