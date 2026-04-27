import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { models } from '../../db/schema/index.js';
import { ModelSchema, ErrorSchema, listResponse } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// CRUD for the LLM model registry. Read by skills (preferred_model lookup)
// and by costs aggregations. Operator-managed via this dashboard.

export const modelsRoute = new OpenAPIHono();

const IdParam = z.object({
  id: z.string().min(1).openapi({ param: { name: 'id', in: 'path' }, example: 'claude-sonnet-4-6' }),
});

const CreateBody = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  provider: z.enum(['anthropic', 'google', 'openai', 'deepseek', 'openrouter']),
  is_active: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

const UpdateBody = CreateBody.partial().omit({ id: true });

modelsRoute.openapi(createRoute({
  method: 'get', path: '/', tags: ['Models'], summary: 'List models',
  responses: { 200: { description: 'OK', content: { 'application/json': { schema: listResponse(ModelSchema) } } } },
}), async (c) => {
  const rows = await db.select().from(models);
  return c.json({ items: rows }, 200);
});

modelsRoute.openapi(createRoute({
  method: 'post', path: '/', tags: ['Models'], summary: 'Create model',
  request: { body: { content: { 'application/json': { schema: CreateBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: ModelSchema } } },
    409: { description: 'Already exists', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const body = c.req.valid('json');
  const existing = await db.select({ id: models.id }).from(models).where(eq(models.id, body.id));
  if (existing.length > 0) return errorResponse(c, 409, 'MODEL_EXISTS', `Model '${body.id}' already exists`);
  const [row] = await db.insert(models).values(body).returning();
  return c.json(row as Record<string, unknown>, 201);
});

modelsRoute.openapi(createRoute({
  method: 'patch', path: '/{id}', tags: ['Models'], summary: 'Update model',
  request: { params: IdParam, body: { content: { 'application/json': { schema: UpdateBody } } } },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: ModelSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  const patch = c.req.valid('json');
  const [updated] = await db.update(models).set({ ...patch, updated_at: new Date() }).where(eq(models.id, id)).returning();
  if (!updated) return errorResponse(c, 404, 'MODEL_NOT_FOUND', `Model '${id}' not found`);
  return c.json(updated as Record<string, unknown>, 200);
});

modelsRoute.openapi(createRoute({
  method: 'delete', path: '/{id}', tags: ['Models'], summary: 'Delete model',
  request: { params: IdParam },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'In use', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  try {
    const deleted = await db.delete(models).where(eq(models.id, id)).returning({ id: models.id });
    if (deleted.length === 0) return errorResponse(c, 404, 'MODEL_NOT_FOUND', `Model '${id}' not found`);
    return c.body(null, 204);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('foreign key') || msg.includes('violates')) {
      return errorResponse(c, 409, 'MODEL_IN_USE', `Model '${id}' is referenced; set is_active=false instead`);
    }
    throw e;
  }
});
