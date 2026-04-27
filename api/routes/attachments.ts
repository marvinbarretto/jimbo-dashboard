import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { attachments } from '../../db/schema/index.js';
import { ErrorSchema, listResponse } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// Attachments hung off thread messages. Frontend uploads create the row +
// store the file (URL captured in `url`); upload itself is opaque to this
// service — the dashboard handles file storage upstream.

export const attachmentsRoute = new OpenAPIHono();

const Row = z.record(z.string(), z.unknown()).openapi('Attachment');

const IdParam = z.object({
  id: z.string().min(1).openapi({ param: { name: 'id', in: 'path' } }),
});

const QueryFilter = z.object({
  thread_message_id: z.string().optional(),
  message_ids: z.string().optional().openapi({ description: 'Comma-separated message ids for batch fetch' }),
});

const CreateBody = z.object({
  id: z.string().min(1),
  thread_message_id: z.string().min(1),
  kind: z.string().min(1),
  filename: z.string().min(1),
  mime_type: z.string().min(1),
  size_bytes: z.number().int().min(0),
  url: z.string().min(1),
  caption: z.string().nullable().optional(),
});

attachmentsRoute.openapi(createRoute({
  method: 'get', path: '/', tags: ['Attachments'], summary: 'List attachments (filtered)',
  request: { query: QueryFilter },
  responses: { 200: { description: 'OK', content: { 'application/json': { schema: listResponse(Row) } } } },
}), async (c) => {
  const { thread_message_id, message_ids } = c.req.valid('query');
  if (message_ids) {
    const idList = message_ids.split(',').map(s => s.trim()).filter(Boolean);
    const rows = idList.length === 0 ? [] : await db.select().from(attachments).where(inArray(attachments.thread_message_id, idList));
    return c.json({ items: rows }, 200);
  }
  if (thread_message_id) {
    const rows = await db.select().from(attachments).where(eq(attachments.thread_message_id, thread_message_id));
    return c.json({ items: rows }, 200);
  }
  const rows = await db.select().from(attachments).limit(100);
  return c.json({ items: rows }, 200);
});

attachmentsRoute.openapi(createRoute({
  method: 'post', path: '/', tags: ['Attachments'], summary: 'Create attachment row',
  request: { body: { content: { 'application/json': { schema: CreateBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: Row } } },
  },
}), async (c) => {
  const body = c.req.valid('json');
  const [row] = await db.insert(attachments).values(body).returning();
  return c.json(row as Record<string, unknown>, 201);
});

attachmentsRoute.openapi(createRoute({
  method: 'delete', path: '/{id}', tags: ['Attachments'], summary: 'Delete attachment',
  request: { params: IdParam },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  const deleted = await db.delete(attachments).where(eq(attachments.id, id)).returning({ id: attachments.id });
  if (deleted.length === 0) return errorResponse(c, 404, 'ATT_NOT_FOUND', `Attachment '${id}' not found`);
  return c.body(null, 204);
});
