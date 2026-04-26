import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { db } from '../../db/client.js';
import { actors } from '../../db/schema/index.js';
import { ActorSchema, listResponse } from '../schemas/shared.js';

// Small global list. Synthesized from production's flat assigned_to/executor
// strings during ETL — currently 3 rows (marvin, ralph, boris).

export const actorsRoute = new OpenAPIHono();

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
