import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { vaultItemProjects } from '../../db/schema/index.js';
import { VaultItemProjectSchema, listResponse, ErrorSchema } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// All vault-item ↔ project junction rows. Currently 190 rows total — small
// enough to bulk-load on app start, avoids the N+1 problem the old per-item
// lazy-fetch pattern would create against 2,353 vault items.

export const vaultItemProjectsRoute = new OpenAPIHono();

const CreateBody = z.object({
  vault_item_id: z.string().min(1),
  project_id: z.string().min(1),
  is_primary: z.boolean().optional(),
});

const DeleteParams = z.object({
  vault_item_id: z.string().min(1).openapi({ param: { name: 'vault_item_id', in: 'path' } }),
  project_id: z.string().min(1).openapi({ param: { name: 'project_id', in: 'path' } }),
});

vaultItemProjectsRoute.openapi(createRoute({
  method: 'get', path: '/', tags: ['VaultItemProjects'], summary: 'List all vault-item ↔ project junction rows',
  responses: {
    200: { description: 'Junction rows', content: { 'application/json': { schema: listResponse(VaultItemProjectSchema) } } },
  },
}), async (c) => {
  const rows = await db.select().from(vaultItemProjects);
  return c.json({ items: rows }, 200);
});

vaultItemProjectsRoute.openapi(createRoute({
  method: 'post', path: '/', tags: ['VaultItemProjects'], summary: 'Add vault-item to project',
  request: { body: { content: { 'application/json': { schema: CreateBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: VaultItemProjectSchema } } },
    409: { description: 'Already linked', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const body = c.req.valid('json');
  try {
    const [row] = await db.insert(vaultItemProjects).values(body).returning();
    return c.json(row as Record<string, unknown>, 201);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('duplicate key') || msg.includes('unique')) {
      return errorResponse(c, 409, 'LINK_EXISTS', `Vault item already linked to project`);
    }
    throw e;
  }
});

vaultItemProjectsRoute.openapi(createRoute({
  method: 'delete', path: '/{vault_item_id}/{project_id}', tags: ['VaultItemProjects'], summary: 'Remove vault-item ↔ project link',
  request: { params: DeleteParams },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { vault_item_id, project_id } = c.req.valid('param');
  const deleted = await db.delete(vaultItemProjects)
    .where(and(eq(vaultItemProjects.vault_item_id, vault_item_id), eq(vaultItemProjects.project_id, project_id)))
    .returning({ vault_item_id: vaultItemProjects.vault_item_id });
  if (deleted.length === 0) return errorResponse(c, 404, 'LINK_NOT_FOUND', 'Link not found');
  return c.body(null, 204);
});
