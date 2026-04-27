import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, asc, and, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { threadMessages } from '../../db/schema/index.js';
import { ErrorSchema, listResponse } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// Thread comments/questions/corrections on a vault note. Always scoped to
// a vault_item_id at the read side; POST creates new messages, PATCH is
// reserved for marking a question answered.

export const threadMessagesRoute = new OpenAPIHono();

const Row = z.record(z.string(), z.unknown()).openapi('ThreadMessage');

const IdParam = z.object({
  id: z.string().min(1).openapi({ param: { name: 'id', in: 'path' } }),
});

const QueryFilter = z.object({
  vault_item_id: z.string().optional(),
  ids: z.string().optional().openapi({ description: 'Comma-separated message ids for batch fetch' }),
});

const CreateBody = z.object({
  id: z.string().min(1),
  vault_item_id: z.string().min(1),
  author_actor_id: z.string().min(1),
  kind: z.enum(['comment', 'question', 'correction']),
  body: z.string().min(1),
  in_reply_to: z.string().nullable().optional(),
});

const PatchBody = z.object({
  answered_by: z.string().nullable().optional(),
});

threadMessagesRoute.openapi(createRoute({
  method: 'get', path: '/', tags: ['ThreadMessages'], summary: 'List thread messages (filtered)',
  request: { query: QueryFilter },
  responses: { 200: { description: 'OK', content: { 'application/json': { schema: listResponse(Row) } } } },
}), async (c) => {
  const { vault_item_id, ids } = c.req.valid('query');
  if (ids) {
    const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
    const rows = idList.length === 0 ? [] : await db.select().from(threadMessages).where(inArray(threadMessages.id, idList));
    return c.json({ items: rows }, 200);
  }
  if (vault_item_id) {
    const rows = await db.select().from(threadMessages).where(eq(threadMessages.vault_item_id, vault_item_id)).orderBy(asc(threadMessages.created_at));
    return c.json({ items: rows }, 200);
  }
  // Unscoped list — capped to keep operator-curiosity queries cheap.
  const rows = await db.select().from(threadMessages).orderBy(asc(threadMessages.created_at)).limit(200);
  return c.json({ items: rows }, 200);
});

threadMessagesRoute.openapi(createRoute({
  method: 'post', path: '/', tags: ['ThreadMessages'], summary: 'Create thread message',
  request: { body: { content: { 'application/json': { schema: CreateBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: Row } } },
    409: { description: 'Already exists', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const body = c.req.valid('json');
  try {
    const [row] = await db.insert(threadMessages).values(body).returning();
    return c.json(row as Record<string, unknown>, 201);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('duplicate key')) return errorResponse(c, 409, 'MSG_EXISTS', `Message '${body.id}' already exists`);
    throw e;
  }
});

threadMessagesRoute.openapi(createRoute({
  method: 'patch', path: '/{id}', tags: ['ThreadMessages'], summary: 'Update thread message (mark answered)',
  request: { params: IdParam, body: { content: { 'application/json': { schema: PatchBody } } } },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: Row } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  const patch = c.req.valid('json');
  const [updated] = await db.update(threadMessages).set(patch).where(eq(threadMessages.id, id)).returning();
  if (!updated) return errorResponse(c, 404, 'MSG_NOT_FOUND', `Message '${id}' not found`);
  return c.json(updated as Record<string, unknown>, 200);
});

threadMessagesRoute.openapi(createRoute({
  method: 'delete', path: '/{id}', tags: ['ThreadMessages'], summary: 'Delete thread message',
  request: { params: IdParam },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  const deleted = await db.delete(threadMessages).where(eq(threadMessages.id, id)).returning({ id: threadMessages.id });
  if (deleted.length === 0) return errorResponse(c, 404, 'MSG_NOT_FOUND', `Message '${id}' not found`);
  return c.body(null, 204);
});
