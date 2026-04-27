import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

// Server-to-server proxy to jimbo-api's /api/skills. The filesystem registry
// at $HUB_SKILLS_DIR is jimbo-api-side; the dashboard-api just forwards.
//
// Frontend sends X-API-Key for the dashboard-api. The dashboard-api authenticates
// upstream with JIMBO_API_KEY held server-side.

export const skillsRoute = new OpenAPIHono();

const SkillSchema = z.record(z.string(), z.unknown()).openapi('Skill');

const SkillPathParam = z.object({
  category: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().regex(/^[a-z0-9-]+$/),
});

const PassthroughBody = z.record(z.string(), z.unknown());
const upstreamErrorBody = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

function readUpstream(): { url: string; key: string } | null {
  const url = process.env['JIMBO_API_URL'];
  const key = process.env['JIMBO_API_KEY'];
  return url && key ? { url, key } : null;
}

// ── GET / — list skills ───────────────────────────────────────────

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Skills'],
  summary: 'List filesystem skills (proxies to jimbo-api)',
  responses: {
    200: {
      description: 'Skills',
      content: { 'application/json': { schema: SkillSchema.array() } },
    },
    502: {
      description: 'Upstream jimbo-api unreachable',
      content: { 'application/json': { schema: upstreamErrorBody } },
    },
  },
});

skillsRoute.openapi(listRoute, async (c) => {
  const up = readUpstream();
  if (!up) {
    return c.json({ error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } }, 502);
  }
  let res: Response;
  try {
    res = await fetch(`${up.url}/api/skills`, {
      headers: { 'X-API-Key': up.key },
    });
  } catch (e) {
    return c.json({ error: { code: 'UPSTREAM_FETCH_FAILED', message: (e as Error).message } }, 502);
  }
  if (!res.ok) {
    return c.json({ error: { code: 'UPSTREAM_ERROR', message: `jimbo-api returned ${res.status}` } }, 502);
  }
  const items = await res.json();
  return c.json(items as Record<string, unknown>[], 200);
});

// ── GET /:category/:name — fetch one skill ────────────────────────

const getOneRoute = createRoute({
  method: 'get',
  path: '/{category}/{name}',
  tags: ['Skills'],
  summary: 'Get one skill by slash-path id (proxies to jimbo-api)',
  request: { params: SkillPathParam },
  responses: {
    200: {
      description: 'Skill',
      content: { 'application/json': { schema: SkillSchema } },
    },
    404: {
      description: 'Skill not found',
      content: { 'application/json': { schema: PassthroughBody } },
    },
    502: {
      description: 'Upstream jimbo-api unreachable',
      content: { 'application/json': { schema: upstreamErrorBody } },
    },
  },
});

skillsRoute.openapi(getOneRoute, async (c) => {
  const { category, name } = c.req.valid('param');
  const up = readUpstream();
  if (!up) {
    return c.json({ error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } }, 502);
  }
  let res: Response;
  try {
    res = await fetch(`${up.url}/api/skills/${encodeURIComponent(category)}/${encodeURIComponent(name)}`, {
      headers: { 'X-API-Key': up.key },
    });
  } catch (e) {
    return c.json({ error: { code: 'UPSTREAM_FETCH_FAILED', message: (e as Error).message } }, 502);
  }
  const payload = await res.json().catch(() => ({}));
  if (res.status === 200) return c.json(payload as Record<string, unknown>, 200);
  if (res.status === 404) return c.json(payload as Record<string, unknown>, 404);
  return c.json({ error: { code: 'UPSTREAM_ERROR', message: `jimbo-api returned ${res.status}` } }, 502);
});

// ── PATCH /:category/:name — edit (proxies to jimbo-api) ──────────

const patchRoute = createRoute({
  method: 'patch',
  path: '/{category}/{name}',
  tags: ['Skills'],
  summary: 'Edit a skill — writes SKILL.md, commits, pushes (proxies to jimbo-api)',
  request: {
    params: SkillPathParam,
    body: { content: { 'application/json': { schema: PassthroughBody } } },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: SkillSchema } } },
    404: { description: 'Skill not found', content: { 'application/json': { schema: PassthroughBody } } },
    409: { description: 'Git conflict — remote moved or push rejected', content: { 'application/json': { schema: PassthroughBody } } },
    502: { description: 'Upstream jimbo-api unreachable', content: { 'application/json': { schema: upstreamErrorBody } } },
  },
});

skillsRoute.openapi(patchRoute, async (c) => {
  const { category, name } = c.req.valid('param');
  const body = c.req.valid('json');
  const up = readUpstream();
  if (!up) {
    return c.json({ error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } }, 502);
  }
  let res: Response;
  try {
    res = await fetch(`${up.url}/api/skills/${encodeURIComponent(category)}/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': up.key },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return c.json({ error: { code: 'UPSTREAM_FETCH_FAILED', message: (e as Error).message } }, 502);
  }
  const payload = await res.json().catch(() => ({}));
  if (res.status === 200) return c.json(payload as Record<string, unknown>, 200);
  if (res.status === 404) return c.json(payload as Record<string, unknown>, 404);
  if (res.status === 409) return c.json(payload as Record<string, unknown>, 409);
  return c.json({ error: { code: 'UPSTREAM_ERROR', message: `jimbo-api returned ${res.status}` } }, 502);
});

// ── POST / — create (proxies to jimbo-api) ────────────────────────

const postRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Skills'],
  summary: 'Create a new skill (proxies to jimbo-api)',
  request: {
    body: { content: { 'application/json': { schema: PassthroughBody } } },
  },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: SkillSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: PassthroughBody } } },
    409: { description: 'Conflict (already exists / dirty / git)', content: { 'application/json': { schema: PassthroughBody } } },
    502: { description: 'Upstream jimbo-api unreachable', content: { 'application/json': { schema: upstreamErrorBody } } },
  },
});

skillsRoute.openapi(postRoute, async (c) => {
  const body = c.req.valid('json');
  const up = readUpstream();
  if (!up) {
    return c.json({ error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } }, 502);
  }
  let res: Response;
  try {
    res = await fetch(`${up.url}/api/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': up.key },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return c.json({ error: { code: 'UPSTREAM_FETCH_FAILED', message: (e as Error).message } }, 502);
  }
  const payload = await res.json().catch(() => ({}));
  if (res.status === 201) return c.json(payload as Record<string, unknown>, 201);
  if (res.status === 400) return c.json(payload as Record<string, unknown>, 400);
  if (res.status === 409) return c.json(payload as Record<string, unknown>, 409);
  return c.json({ error: { code: 'UPSTREAM_ERROR', message: `jimbo-api returned ${res.status}` } }, 502);
});

// ── DELETE /:category/:name (proxies to jimbo-api) ────────────────

const deleteRouteDef = createRoute({
  method: 'delete',
  path: '/{category}/{name}',
  tags: ['Skills'],
  summary: 'Delete a skill (proxies to jimbo-api)',
  request: { params: SkillPathParam },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: PassthroughBody } } },
    409: { description: 'Working tree dirty or git conflict', content: { 'application/json': { schema: PassthroughBody } } },
    502: { description: 'Upstream jimbo-api unreachable', content: { 'application/json': { schema: upstreamErrorBody } } },
  },
});

skillsRoute.openapi(deleteRouteDef, async (c) => {
  const { category, name } = c.req.valid('param');
  const up = readUpstream();
  if (!up) {
    return c.json({ error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } }, 502);
  }
  let res: Response;
  try {
    res = await fetch(`${up.url}/api/skills/${encodeURIComponent(category)}/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': up.key },
    });
  } catch (e) {
    return c.json({ error: { code: 'UPSTREAM_FETCH_FAILED', message: (e as Error).message } }, 502);
  }
  if (res.status === 204) return c.body(null, 204);
  const payload = await res.json().catch(() => ({}));
  if (res.status === 404) return c.json(payload as Record<string, unknown>, 404);
  if (res.status === 409) return c.json(payload as Record<string, unknown>, 409);
  return c.json({ error: { code: 'UPSTREAM_ERROR', message: `jimbo-api returned ${res.status}` } }, 502);
});

// ── POST /:category/:name/rename (proxies to jimbo-api) ───────────

const renameRouteDef = createRoute({
  method: 'post',
  path: '/{category}/{name}/rename',
  tags: ['Skills'],
  summary: 'Rename a skill (proxies to jimbo-api)',
  request: {
    params: SkillPathParam,
    body: { content: { 'application/json': { schema: PassthroughBody } } },
  },
  responses: {
    200: { description: 'Renamed', content: { 'application/json': { schema: SkillSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: PassthroughBody } } },
    404: { description: 'Source not found', content: { 'application/json': { schema: PassthroughBody } } },
    409: { description: 'Target taken / dispatches active / git conflict', content: { 'application/json': { schema: PassthroughBody } } },
    502: { description: 'Upstream jimbo-api unreachable', content: { 'application/json': { schema: upstreamErrorBody } } },
  },
});

skillsRoute.openapi(renameRouteDef, async (c) => {
  const { category, name } = c.req.valid('param');
  const body = c.req.valid('json');
  const up = readUpstream();
  if (!up) {
    return c.json({ error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } }, 502);
  }
  let res: Response;
  try {
    res = await fetch(`${up.url}/api/skills/${encodeURIComponent(category)}/${encodeURIComponent(name)}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': up.key },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return c.json({ error: { code: 'UPSTREAM_FETCH_FAILED', message: (e as Error).message } }, 502);
  }
  const payload = await res.json().catch(() => ({}));
  if (res.status === 200) return c.json(payload as Record<string, unknown>, 200);
  if (res.status === 400) return c.json(payload as Record<string, unknown>, 400);
  if (res.status === 404) return c.json(payload as Record<string, unknown>, 404);
  if (res.status === 409) return c.json(payload as Record<string, unknown>, 409);
  return c.json({ error: { code: 'UPSTREAM_ERROR', message: `jimbo-api returned ${res.status}` } }, 502);
});
