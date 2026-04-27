import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { skills } from '../../db/schema/index.js';
import { SkillSchema, ErrorSchema, listResponse } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// CRUD for skills — first-class capability descriptors that ties together
// a prompt, model preference, tool palette, and actor allowlist.
// Soft-FK arrays (allowed_executors, tool_ids) are validated app-side.

export const skillsRoute = new OpenAPIHono();

const IdParam = z.object({
  id: z.string().min(1).openapi({ param: { name: 'id', in: 'path' }, example: 'vault-grooming-analyse' }),
});

const KindEnum = z.enum(['groom', 'classify', 'decompose', 'execute', 'recon']);

const CreateBody = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable().optional(),
  kind: KindEnum,
  prompt_id: z.string().nullable().optional(),
  model_stack_id: z.string().nullable().optional(),
  allowed_executors: z.array(z.string()).default([]),
  tool_ids: z.array(z.string()).default([]),
  is_active: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

const UpdateBody = CreateBody.partial().omit({ id: true });

skillsRoute.openapi(createRoute({
  method: 'get', path: '/', tags: ['Skills'], summary: 'List skills',
  responses: { 200: { description: 'OK', content: { 'application/json': { schema: listResponse(SkillSchema) } } } },
}), async (c) => {
  const rows = await db.select().from(skills);
  return c.json({ items: rows }, 200);
});

skillsRoute.openapi(createRoute({
  method: 'post', path: '/', tags: ['Skills'], summary: 'Create skill',
  request: { body: { content: { 'application/json': { schema: CreateBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: SkillSchema } } },
    409: { description: 'Already exists', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const body = c.req.valid('json');
  const existing = await db.select({ id: skills.id }).from(skills).where(eq(skills.id, body.id));
  if (existing.length > 0) return errorResponse(c, 409, 'SKILL_EXISTS', `Skill '${body.id}' already exists`);
  const [row] = await db.insert(skills).values(body).returning();
  return c.json(row as Record<string, unknown>, 201);
});

skillsRoute.openapi(createRoute({
  method: 'patch', path: '/{id}', tags: ['Skills'], summary: 'Update skill',
  request: { params: IdParam, body: { content: { 'application/json': { schema: UpdateBody } } } },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: SkillSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  const patch = c.req.valid('json');
  const [updated] = await db.update(skills).set({ ...patch, updated_at: new Date() }).where(eq(skills.id, id)).returning();
  if (!updated) return errorResponse(c, 404, 'SKILL_NOT_FOUND', `Skill '${id}' not found`);
  return c.json(updated as Record<string, unknown>, 200);
});

skillsRoute.openapi(createRoute({
  method: 'delete', path: '/{id}', tags: ['Skills'], summary: 'Delete skill',
  request: { params: IdParam },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'In use (dispatches reference this skill)', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  try {
    const deleted = await db.delete(skills).where(eq(skills.id, id)).returning({ id: skills.id });
    if (deleted.length === 0) return errorResponse(c, 404, 'SKILL_NOT_FOUND', `Skill '${id}' not found`);
    return c.body(null, 204);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('foreign key') || msg.includes('violates')) {
      return errorResponse(c, 409, 'SKILL_IN_USE', `Skill '${id}' is referenced by dispatches; set is_active=false instead`);
    }
    throw e;
  }
});
