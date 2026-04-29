import { OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';

export const jimboProxyRoute = new OpenAPIHono();

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

export async function proxyJimboGet(c: Context, path: string): Promise<Response> {
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
  return c.json(payload as never, res.status as never);
}

jimboProxyRoute.get('/', async (c) => {
  const path = c.req.query('path');
  if (!path) {
    return c.json({ error: { code: 'MISSING_PATH', message: 'Missing path query parameter' } }, 400);
  }
  return proxyJimboGet(c, path);
});
