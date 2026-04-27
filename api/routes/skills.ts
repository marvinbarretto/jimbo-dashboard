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
