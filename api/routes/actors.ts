import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { actors } from '../../db/schema/index.js';
import { ActorSchema, ErrorSchema, listResponse } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// Actor identity table — small, operator-managed. Migration 0003 extended
// the schema with runtime/description/is_active. CRUD lives here so the
// dashboard's actor admin pages stop hitting PostgREST against the legacy
// jimbo DB (which doesn't have this table).

export const actorsRoute = new OpenAPIHono();

const ActorIdParam = z.object({
  id: z.string().min(1).openapi({ param: { name: 'id', in: 'path' }, example: 'jimbo' }),
});

const CreateActorBody = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  kind: z.enum(['human', 'agent', 'system']).default('agent'),
  runtime: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  color_token: z.string().nullable().optional(),
});

const UpdateActorBody = CreateActorBody.partial().omit({ id: true });

// ── GET / ─────────────────────────────────────────────────────────────────

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Actors'],
  summary: 'List all actors',
  responses: {
    200: {
      description: 'Actor list',
      content: { 'application/json': { schema: listResponse(ActorSchema) } },
    },
  },
});

actorsRoute.openapi(listRoute, async (c) => {
  const rows = await db.select().from(actors);
  return c.json({ items: rows }, 200);
});

// ── POST / ────────────────────────────────────────────────────────────────

const createR = createRoute({
  method: 'post',
  path: '/',
  tags: ['Actors'],
  summary: 'Create a new actor',
  request: { body: { content: { 'application/json': { schema: CreateActorBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: ActorSchema } } },
    409: { description: 'Already exists', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

actorsRoute.openapi(createR, async (c) => {
  const body = c.req.valid('json');
  // Idempotency: if id already exists, return 409 so the operator UI can
  // surface a clean error instead of a 500.
  const existing = await db.select({ id: actors.id }).from(actors).where(eq(actors.id, body.id));
  if (existing.length > 0) {
    return errorResponse(c, 409, 'ACTOR_EXISTS', `Actor '${body.id}' already exists`);
  }
  const [row] = await db.insert(actors).values(body).returning();
  return c.json(row as Record<string, unknown>, 201);
});

// ── PATCH /:id ────────────────────────────────────────────────────────────

const patchR = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Actors'],
  summary: 'Update an actor',
  request: {
    params: ActorIdParam,
    body: { content: { 'application/json': { schema: UpdateActorBody } } },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: ActorSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

actorsRoute.openapi(patchR, async (c) => {
  const { id } = c.req.valid('param');
  const patch = c.req.valid('json');
  const [updated] = await db.update(actors).set({ ...patch, updated_at: new Date() }).where(eq(actors.id, id)).returning();
  if (!updated) {
    return errorResponse(c, 404, 'ACTOR_NOT_FOUND', `Actor '${id}' not found`);
  }
  return c.json(updated as Record<string, unknown>, 200);
});

// ── DELETE /:id ───────────────────────────────────────────────────────────
// Hard delete — actors with FK references (projects.owner_actor_id ON DELETE
// RESTRICT, vault_notes.assigned_to as soft text) will fail at the DB layer.
// The is_active flag is the soft-archive path; deletion is rare.

const deleteR = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Actors'],
  summary: 'Delete an actor (hard). Use PATCH is_active=false to archive instead.',
  request: { params: ActorIdParam },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'In use (FK)', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

actorsRoute.openapi(deleteR, async (c) => {
  const { id } = c.req.valid('param');
  try {
    const deleted = await db.delete(actors).where(eq(actors.id, id)).returning({ id: actors.id });
    if (deleted.length === 0) {
      return errorResponse(c, 404, 'ACTOR_NOT_FOUND', `Actor '${id}' not found`);
    }
    return c.body(null, 204);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('foreign key') || msg.includes('violates')) {
      return errorResponse(c, 409, 'ACTOR_IN_USE', `Actor '${id}' is referenced; set is_active=false instead`);
    }
    throw e;
  }
});
