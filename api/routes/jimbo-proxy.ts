import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

export const jimboProxyRoute = new OpenAPIHono();

const JsonValue = z.unknown().openapi('JimboProxyPayload');
const upstreamErrorBody = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

const Query = z.object({
  path: z.string().min(1).openapi({ description: 'Upstream Jimbo API path, e.g. /api/emails/reports' }),
}).catchall(z.union([z.string(), z.array(z.string())]));

const allowedPrefixes = [
  '/api/activity',
  '/api/ai-models',
  '/api/briefing',
  '/api/calendar',
  '/api/coach',
  '/api/context',
  '/api/costs',
  '/api/dispatch',
  '/api/emails',
  '/api/events',
  '/api/experiments',
  '/api/fitness',
  '/api/google-calendar',
  '/api/google-mail',
  '/api/google-tasks',
  '/api/grooming',
  '/api/health',
  '/api/hermes',
  '/api/interrogate',
  '/api/note-activity',
  '/api/pipeline',
  '/api/search',
  '/api/settings',
  '/api/snapshot',
  '/api/summaries',
  '/api/triage',
  '/api/vault',
  '/api/vault-item-dependencies',
  '/api/vault-item-projects',
];

function readUpstream(): { url: string; key: string } | null {
  const url = process.env['JIMBO_API_URL'];
  const key = process.env['JIMBO_API_KEY'];
  return url && key ? { url, key } : null;
}

function isAllowedPath(path: string): boolean {
  return allowedPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

const getRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['JimboProxy'],
  summary: 'Read-only proxy to upstream Jimbo API GET endpoints',
  request: { query: Query },
  responses: {
    200: { description: 'Upstream JSON payload', content: { 'application/json': { schema: JsonValue } } },
    400: { description: 'Invalid upstream path', content: { 'application/json': { schema: upstreamErrorBody } } },
    502: { description: 'Upstream jimbo-api unreachable', content: { 'application/json': { schema: upstreamErrorBody } } },
  },
});

jimboProxyRoute.openapi(getRoute, async (c) => {
  const query = c.req.valid('query');
  const path = query.path;
  if (!path.startsWith('/api/') || path.includes('..') || !isAllowedPath(path)) {
    return c.json({ error: { code: 'INVALID_UPSTREAM_PATH', message: `Path is not whitelisted: ${path}` } }, 400);
  }

  const up = readUpstream();
  if (!up) {
    return c.json({ error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } }, 502);
  }

  const upstreamUrl = new URL(path, up.url);
  const incomingUrl = new URL(c.req.url);
  for (const [key, value] of incomingUrl.searchParams.entries()) {
    if (key !== 'path') upstreamUrl.searchParams.append(key, value);
  }

  let res: Response;
  try {
    res = await fetch(upstreamUrl, { headers: { 'X-API-Key': up.key } });
  } catch (e) {
    return c.json({ error: { code: 'UPSTREAM_FETCH_FAILED', message: (e as Error).message } }, 502);
  }

  const payload = await res.json().catch(() => ({ error: { code: 'UPSTREAM_NON_JSON', message: `jimbo-api returned ${res.status}` } }));
  if (res.ok) return c.json(payload as unknown, 200);
  return c.json(payload as unknown, 502);
});
