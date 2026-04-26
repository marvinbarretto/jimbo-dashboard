import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { db } from '../../db/client.js';
import { vaultItemProjects } from '../../db/schema/index.js';
import { VaultItemProjectSchema, listResponse } from '../schemas/shared.js';

// All vault-item ↔ project junction rows. Currently 190 rows total — small
// enough to bulk-load on app start, avoids the N+1 problem the old per-item
// lazy-fetch pattern would create against 2,353 vault items.

export const vaultItemProjectsRoute = new OpenAPIHono();

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['VaultItemProjects'],
  summary: 'List all vault-item ↔ project junction rows',
  responses: {
    200: {
      description: 'Junction rows',
      content: { 'application/json': { schema: listResponse(VaultItemProjectSchema) } },
    },
  },
});

vaultItemProjectsRoute.openapi(listRoute, async (c) => {
  const rows = await db.select().from(vaultItemProjects);
  return c.json({ items: rows }, 200);
});
