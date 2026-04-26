import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { projects } from '../../db/schema/index.js';
import { ProjectSchema, ErrorSchema, listResponse } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// Operator-managed project list. Migration 0003 widened the schema with
// description / owner_actor_id / criteria / repo_url; CRUD lives here so
// the frontend stops hitting PostgREST against the legacy jimbo DB.

export const projectsRoute = new OpenAPIHono();

const ProjectIdParam = z.object({
  id: z.string().min(1).openapi({ param: { name: 'id', in: 'path' }, example: 'localshout' }),
});

const CreateProjectBody = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(['active', 'paused', 'archived']).default('active'),
  owner_actor_id: z.string().nullable().optional(),
  criteria: z.string().nullable().optional(),
  repo_url: z.string().nullable().optional(),
  color_token: z.string().nullable().optional(),
});

const UpdateProjectBody = CreateProjectBody.partial().omit({ id: true });

// ── GET / ─────────────────────────────────────────────────────────────────

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

// ── POST / ────────────────────────────────────────────────────────────────

const createR = createRoute({
  method: 'post',
  path: '/',
  tags: ['Projects'],
  summary: 'Create a new project',
  request: { body: { content: { 'application/json': { schema: CreateProjectBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: ProjectSchema } } },
    409: { description: 'Already exists', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

projectsRoute.openapi(createR, async (c) => {
  const body = c.req.valid('json');
  const existing = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, body.id));
  if (existing.length > 0) {
    return errorResponse(c, 409, 'PROJECT_EXISTS', `Project '${body.id}' already exists`);
  }
  const [row] = await db.insert(projects).values(body).returning();
  return c.json(row as Record<string, unknown>, 201);
});

// ── PATCH /:id ────────────────────────────────────────────────────────────

const patchR = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Projects'],
  summary: 'Update a project',
  request: {
    params: ProjectIdParam,
    body: { content: { 'application/json': { schema: UpdateProjectBody } } },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: ProjectSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

projectsRoute.openapi(patchR, async (c) => {
  const { id } = c.req.valid('param');
  const patch = c.req.valid('json');
  const [updated] = await db.update(projects).set({ ...patch, updated_at: new Date() }).where(eq(projects.id, id)).returning();
  if (!updated) return errorResponse(c, 404, 'PROJECT_NOT_FOUND', `Project '${id}' not found`);
  return c.json(updated as Record<string, unknown>, 200);
});

// ── DELETE /:id ───────────────────────────────────────────────────────────
// Hard delete — referenced rows in vault_item_projects (ON DELETE CASCADE)
// will follow. Soft-archive is `PATCH status='archived'` and is the usual path.

const deleteR = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Projects'],
  summary: 'Delete a project (hard). Use PATCH status=archived to soft-archive.',
  request: { params: ProjectIdParam },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

projectsRoute.openapi(deleteR, async (c) => {
  const { id } = c.req.valid('param');
  const deleted = await db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
  if (deleted.length === 0) return errorResponse(c, 404, 'PROJECT_NOT_FOUND', `Project '${id}' not found`);
  return c.body(null, 204);
});
