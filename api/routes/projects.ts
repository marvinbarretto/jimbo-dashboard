import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { db } from '../../db/client.js';
import { projects } from '../../db/schema/index.js';
import { ProjectSchema, listResponse } from '../schemas/shared.js';

// Small global list. Synthesized from production's "project:slug" tag
// convention during ETL — currently 10 rows (localshout, jimbo, openclaw, ...).

export const projectsRoute = new OpenAPIHono();

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Projects'],
  summary: 'List all projects',
  responses: {
    200: {
      description: 'Project list',
      content: { 'application/json': { schema: listResponse(ProjectSchema) } },
    },
  },
});

projectsRoute.openapi(listRoute, async (c) => {
  const rows = await db.select().from(projects);
  return c.json({ items: rows }, 200);
});
