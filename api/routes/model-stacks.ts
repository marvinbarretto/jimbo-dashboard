import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { modelStacks } from '../../db/schema/index.js';
import { ModelStackSchema, ErrorSchema, listResponse } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// CRUD for model_stacks. A stack is a named ordered list of models that
// skills point at; the runner picks the first available at dispatch time.

export const modelStacksRoute = new OpenAPIHono();

const IdParam = z.object({
  id: z.string().min(1).openapi({ param: { name: 'id', in: 'path' }, example: 'standard' }),
});

const CreateBody = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable().optional(),
  model_ids: z.array(z.string()),
  fast_model_id: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

const UpdateBody = CreateBody.partial().omit({ id: true });

modelStacksRoute.openapi(createRoute({
  method: 'get', path: '/', tags: ['ModelStacks'], summary: 'List model stacks',
  responses: { 200: { description: 'OK', content: { 'application/json': { schema: listResponse(ModelStackSchema) } } } },
}), async (c) => {
  const rows = await db.select().from(modelStacks);
  return c.json({ items: rows }, 200);
});

modelStacksRoute.openapi(createRoute({
  method: 'post', path: '/', tags: ['ModelStacks'], summary: 'Create model stack',
  request: { body: { content: { 'application/json': { schema: CreateBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: ModelStackSchema } } },
    409: { description: 'Already exists', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const body = c.req.valid('json');
  const existing = await db.select({ id: modelStacks.id }).from(modelStacks).where(eq(modelStacks.id, body.id));
  if (existing.length > 0) return errorResponse(c, 409, 'STACK_EXISTS', `Stack '${body.id}' already exists`);
  const [row] = await db.insert(modelStacks).values(body).returning();
  return c.json(row as Record<string, unknown>, 201);
});

modelStacksRoute.openapi(createRoute({
  method: 'patch', path: '/{id}', tags: ['ModelStacks'], summary: 'Update model stack',
  request: { params: IdParam, body: { content: { 'application/json': { schema: UpdateBody } } } },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: ModelStackSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  const patch = c.req.valid('json');
  const [updated] = await db.update(modelStacks).set({ ...patch, updated_at: new Date() }).where(eq(modelStacks.id, id)).returning();
  if (!updated) return errorResponse(c, 404, 'STACK_NOT_FOUND', `Stack '${id}' not found`);
  return c.json(updated as Record<string, unknown>, 200);
});

modelStacksRoute.openapi(createRoute({
  method: 'delete', path: '/{id}', tags: ['ModelStacks'], summary: 'Delete model stack',
  request: { params: IdParam },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'In use', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  try {
    const deleted = await db.delete(modelStacks).where(eq(modelStacks.id, id)).returning({ id: modelStacks.id });
    if (deleted.length === 0) return errorResponse(c, 404, 'STACK_NOT_FOUND', `Stack '${id}' not found`);
    return c.body(null, 204);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('foreign key') || msg.includes('violates')) {
      return errorResponse(c, 409, 'STACK_IN_USE', `Stack '${id}' is referenced; set is_active=false instead`);
    }
    throw e;
  }
});
