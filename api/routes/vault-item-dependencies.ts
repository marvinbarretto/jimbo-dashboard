import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { vaultItemDependencies } from '../../db/schema/index.js';
import { ErrorSchema, listResponse } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// Vault-item dependency edges (blocker → blocked). Composite primary key
// (blocker_id, blocked_id); GET filters by blocked_id (the typical view:
// "what's blocking THIS item?").

export const vaultItemDependenciesRoute = new OpenAPIHono();

const Row = z.record(z.string(), z.unknown()).openapi('VaultItemDependency');

const QueryFilter = z.object({
  blocked_id: z.string().optional().openapi({ description: 'Filter to deps blocking this item' }),
  blocker_id: z.string().optional().openapi({ description: 'Filter to deps where this item is the blocker' }),
});

const CreateBody = z.object({
  blocker_id: z.string().min(1),
  blocked_id: z.string().min(1),
});

const DeleteParams = z.object({
  blocker_id: z.string().min(1).openapi({ param: { name: 'blocker_id', in: 'path' } }),
  blocked_id: z.string().min(1).openapi({ param: { name: 'blocked_id', in: 'path' } }),
});

vaultItemDependenciesRoute.openapi(createRoute({
  method: 'get', path: '/', tags: ['VaultItemDependencies'], summary: 'List dependency edges',
  request: { query: QueryFilter },
  responses: { 200: { description: 'OK', content: { 'application/json': { schema: listResponse(Row) } } } },
}), async (c) => {
  const { blocked_id, blocker_id } = c.req.valid('query');
  const conditions = [];
  if (blocked_id) conditions.push(eq(vaultItemDependencies.blocked_id, blocked_id));
  if (blocker_id) conditions.push(eq(vaultItemDependencies.blocker_id, blocker_id));
  const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
  const rows = where
    ? await db.select().from(vaultItemDependencies).where(where)
    : await db.select().from(vaultItemDependencies);
  return c.json({ items: rows }, 200);
});

vaultItemDependenciesRoute.openapi(createRoute({
  method: 'post', path: '/', tags: ['VaultItemDependencies'], summary: 'Create dependency edge',
  request: { body: { content: { 'application/json': { schema: CreateBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: Row } } },
    409: { description: 'Already exists', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const body = c.req.valid('json');
  try {
    const [row] = await db.insert(vaultItemDependencies).values(body).returning();
    return c.json(row as Record<string, unknown>, 201);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('duplicate key') || msg.includes('unique')) {
      return errorResponse(c, 409, 'DEP_EXISTS', `Dependency already exists`);
    }
    throw e;
  }
});

vaultItemDependenciesRoute.openapi(createRoute({
  method: 'delete', path: '/{blocker_id}/{blocked_id}', tags: ['VaultItemDependencies'], summary: 'Delete dependency edge',
  request: { params: DeleteParams },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { blocker_id, blocked_id } = c.req.valid('param');
  const deleted = await db.delete(vaultItemDependencies)
    .where(and(eq(vaultItemDependencies.blocker_id, blocker_id), eq(vaultItemDependencies.blocked_id, blocked_id)))
    .returning({ blocker_id: vaultItemDependencies.blocker_id });
  if (deleted.length === 0) return errorResponse(c, 404, 'DEP_NOT_FOUND', 'Dependency not found');
  return c.body(null, 204);
});
