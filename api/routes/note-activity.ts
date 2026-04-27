import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { noteActivity } from '../../db/schema/index.js';
import { ErrorSchema, listResponse } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// Vault-note audit log. Operator-readable history of what happened to each
// note (status changes, assignments, dispatch lifecycle events). Frontend
// displays as a timeline.

export const noteActivityRoute = new OpenAPIHono();

const Row = z.record(z.string(), z.unknown()).openapi('NoteActivity');

const QueryFilter = z.object({
  note_id: z.string().optional().openapi({ description: 'Filter to one note' }),
  actor: z.string().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

const CreateBody = z.object({
  note_id: z.string().min(1),
  actor: z.string().min(1),
  action: z.string().min(1),
  from_value: z.string().nullable().optional(),
  to_value: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  context: z.record(z.string(), z.unknown()).nullable().optional(),
});

noteActivityRoute.openapi(createRoute({
  method: 'get', path: '/', tags: ['NoteActivity'], summary: 'List activity events',
  request: { query: QueryFilter },
  responses: { 200: { description: 'OK', content: { 'application/json': { schema: listResponse(Row) } } } },
}), async (c) => {
  const { note_id, actor, action, limit } = c.req.valid('query');
  const conditions = [];
  if (note_id) conditions.push(eq(noteActivity.note_id, note_id));
  if (actor) conditions.push(eq(noteActivity.actor, actor));
  if (action) conditions.push(eq(noteActivity.action, action));
  const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
  const q = db.select().from(noteActivity).orderBy(desc(noteActivity.ts)).limit(limit);
  const rows = where ? await q.where(where) : await q;
  return c.json({ items: rows }, 200);
});

noteActivityRoute.openapi(createRoute({
  method: 'post', path: '/', tags: ['NoteActivity'], summary: 'Record an activity event',
  request: { body: { content: { 'application/json': { schema: CreateBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: Row } } },
  },
}), async (c) => {
  const body = c.req.valid('json');
  const [row] = await db.insert(noteActivity).values({
    ...body,
    context: body.context ?? null,
  }).returning();
  return c.json(row as Record<string, unknown>, 201);
});
