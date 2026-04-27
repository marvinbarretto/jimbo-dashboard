import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, asc, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { prompts, promptVersions } from '../../db/schema/index.js';
import { PromptSchema, PromptVersionSchema, ErrorSchema, listResponse } from '../schemas/shared.js';
import { errorResponse } from '../middleware/error.js';

// CRUD for prompts + prompt_versions. Two endpoints rolled together since
// they're tightly coupled: list/show prompts, then drill into versions.
// New version POST auto-assigns version number via DB trigger.

export const promptsRoute = new OpenAPIHono();

const IdParam = z.object({
  id: z.string().min(1).openapi({ param: { name: 'id', in: 'path' }, example: 'p-vault-grooming-analyse' }),
});

const VersionIdParam = z.object({
  id: z.string().min(1).openapi({ param: { name: 'id', in: 'path' } }),
  version_id: z.string().uuid().openapi({ param: { name: 'version_id', in: 'path' } }),
});

const CreatePromptBody = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

const UpdatePromptBody = z.object({
  display_name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  current_version_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

const CreateVersionBody = z.object({
  system_content: z.string().min(1),
  user_content: z.string().nullable().optional(),
  input_schema: z.record(z.string(), z.unknown()).nullable().optional(),
  output_schema: z.record(z.string(), z.unknown()).nullable().optional(),
  notes: z.string().nullable().optional(),
  parent_version_id: z.string().uuid().nullable().optional(),
  set_as_current: z.boolean().optional().default(true),
});

// ── prompts CRUD ────────────────────────────────────────────────────────

promptsRoute.openapi(createRoute({
  method: 'get', path: '/', tags: ['Prompts'], summary: 'List prompts',
  responses: { 200: { description: 'OK', content: { 'application/json': { schema: listResponse(PromptSchema) } } } },
}), async (c) => {
  const rows = await db.select().from(prompts).orderBy(asc(prompts.id));
  return c.json({ items: rows }, 200);
});

promptsRoute.openapi(createRoute({
  method: 'post', path: '/', tags: ['Prompts'], summary: 'Create prompt',
  request: { body: { content: { 'application/json': { schema: CreatePromptBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: PromptSchema } } },
    409: { description: 'Already exists', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const body = c.req.valid('json');
  const existing = await db.select({ id: prompts.id }).from(prompts).where(eq(prompts.id, body.id));
  if (existing.length > 0) return errorResponse(c, 409, 'PROMPT_EXISTS', `Prompt '${body.id}' already exists`);
  const [row] = await db.insert(prompts).values(body).returning();
  return c.json(row as Record<string, unknown>, 201);
});

promptsRoute.openapi(createRoute({
  method: 'patch', path: '/{id}', tags: ['Prompts'], summary: 'Update prompt',
  request: { params: IdParam, body: { content: { 'application/json': { schema: UpdatePromptBody } } } },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: PromptSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  const patch = c.req.valid('json');
  const [updated] = await db.update(prompts).set({ ...patch, updated_at: new Date() }).where(eq(prompts.id, id)).returning();
  if (!updated) return errorResponse(c, 404, 'PROMPT_NOT_FOUND', `Prompt '${id}' not found`);
  return c.json(updated as Record<string, unknown>, 200);
});

promptsRoute.openapi(createRoute({
  method: 'delete', path: '/{id}', tags: ['Prompts'], summary: 'Delete prompt (and all versions, CASCADE)',
  request: { params: IdParam },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'In use', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  try {
    // Clear current_version_id first to avoid FK violation on cascade.
    await db.update(prompts).set({ current_version_id: null }).where(eq(prompts.id, id));
    const deleted = await db.delete(prompts).where(eq(prompts.id, id)).returning({ id: prompts.id });
    if (deleted.length === 0) return errorResponse(c, 404, 'PROMPT_NOT_FOUND', `Prompt '${id}' not found`);
    return c.body(null, 204);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('foreign key') || msg.includes('violates')) {
      return errorResponse(c, 409, 'PROMPT_IN_USE', `Prompt '${id}' is referenced by skills; null out skills.prompt_id first`);
    }
    throw e;
  }
});

// ── prompt_versions ──────────────────────────────────────────────────────

promptsRoute.openapi(createRoute({
  method: 'get', path: '/{id}/versions', tags: ['Prompts'], summary: 'List versions for a prompt',
  request: { params: IdParam },
  responses: {
    200: { description: 'OK', content: { 'application/json': { schema: listResponse(PromptVersionSchema) } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  const rows = await db.select().from(promptVersions).where(eq(promptVersions.prompt_id, id)).orderBy(desc(promptVersions.version));
  return c.json({ items: rows }, 200);
});

promptsRoute.openapi(createRoute({
  method: 'post', path: '/{id}/versions', tags: ['Prompts'], summary: 'Create new prompt version (auto-versioned)',
  request: { params: IdParam, body: { content: { 'application/json': { schema: CreateVersionBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: PromptVersionSchema } } },
    404: { description: 'Prompt not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  const existing = await db.select({ id: prompts.id }).from(prompts).where(eq(prompts.id, id));
  if (existing.length === 0) return errorResponse(c, 404, 'PROMPT_NOT_FOUND', `Prompt '${id}' not found`);

  // version=0 triggers set_prompt_version() to auto-assign N+1
  const [row] = await db.insert(promptVersions).values({
    prompt_id: id,
    version: 0,
    system_content: body.system_content,
    user_content: body.user_content ?? null,
    input_schema: body.input_schema ?? null,
    output_schema: body.output_schema ?? null,
    notes: body.notes ?? null,
    parent_version_id: body.parent_version_id ?? null,
  }).returning();

  if (body.set_as_current !== false) {
    await db.update(prompts).set({ current_version_id: row.id, updated_at: new Date() }).where(eq(prompts.id, id));
  }

  return c.json(row as Record<string, unknown>, 201);
});

promptsRoute.openapi(createRoute({
  method: 'delete', path: '/{id}/versions/{version_id}', tags: ['Prompts'], summary: 'Delete a prompt version',
  request: { params: VersionIdParam },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Currently active', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c) => {
  const { id, version_id } = c.req.valid('param');
  // Refuse to delete the current_version_id — operator must flip current first.
  const current = await db.select({ cv: prompts.current_version_id }).from(prompts).where(eq(prompts.id, id));
  if (current[0]?.cv === version_id) {
    return errorResponse(c, 409, 'VERSION_IS_CURRENT', `Version is the current version of '${id}'; switch current_version_id first`);
  }
  const deleted = await db.delete(promptVersions).where(eq(promptVersions.id, version_id)).returning({ id: promptVersions.id });
  if (deleted.length === 0) return errorResponse(c, 404, 'VERSION_NOT_FOUND', `Version '${version_id}' not found`);
  return c.body(null, 204);
});
