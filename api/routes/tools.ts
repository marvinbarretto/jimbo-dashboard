import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { tools } from '../../db/schema/index.js';
import { ToolSchema, ErrorSchema, listResponse } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// CRUD for tools — capabilities the runner exposes to a model.
// Implementations are code (HTTP handlers / internal); these rows are the
// registry the model sees.

export const toolsRoute = new OpenAPIHono();

const IdParam = z.object({
  id: z.string().min(1).openapi({ param: { name: 'id', in: 'path' }, example: 'read_vault_note' }),
});

const CreateBody = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().min(1),
  handler_type: z.enum(['http', 'internal']).default('http'),
  endpoint_url: z.string().nullable().optional(),
  input_schema: z.record(z.string(), z.unknown()),
  output_schema: z.record(z.string(), z.unknown()).nullable().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

const UpdateBody = CreateBody.partial().omit({ id: true });

toolsRoute.openapi(createRoute({
  method: 'get', path: '/', tags: ['Tools'], summary: 'List tools',
  responses: { 200: { description: 'OK', content: { 'application/json': { schema: listResponse(ToolSchema) } } } },
}), async (c) => {
  const rows = await db.select().from(tools);
  return c.json({ items: rows }, 200);
});

toolsRoute.openapi(createRoute({
  method: 'post', path: '/', tags: ['Tools'], summary: 'Create tool',
  request: { body: { content: { 'application/json': { schema: CreateBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: ToolSchema } } },
    409: { description: 'Already exists', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const body = c.req.valid('json');
  const existing = await db.select({ id: tools.id }).from(tools).where(eq(tools.id, body.id));
  if (existing.length > 0) return errorResponse(c, 409, 'TOOL_EXISTS', `Tool '${body.id}' already exists`);
  const [row] = await db.insert(tools).values(body).returning();
  return c.json(row as Record<string, unknown>, 201);
});

toolsRoute.openapi(createRoute({
  method: 'patch', path: '/{id}', tags: ['Tools'], summary: 'Update tool',
  request: { params: IdParam, body: { content: { 'application/json': { schema: UpdateBody } } } },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: ToolSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  const patch = c.req.valid('json');
  const [updated] = await db.update(tools).set({ ...patch, updated_at: new Date() }).where(eq(tools.id, id)).returning();
  if (!updated) return errorResponse(c, 404, 'TOOL_NOT_FOUND', `Tool '${id}' not found`);
  return c.json(updated as Record<string, unknown>, 200);
});

toolsRoute.openapi(createRoute({
  method: 'delete', path: '/{id}', tags: ['Tools'], summary: 'Delete tool',
  request: { params: IdParam },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  const deleted = await db.delete(tools).where(eq(tools.id, id)).returning({ id: tools.id });
  if (deleted.length === 0) return errorResponse(c, 404, 'TOOL_NOT_FOUND', `Tool '${id}' not found`);
  return c.body(null, 204);
});
