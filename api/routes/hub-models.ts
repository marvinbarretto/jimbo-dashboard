import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

// Forwards CRUD on the hub/models/ filesystem registry to jimbo-api. Identical
// shape to the skills proxy.

export const hubModelsRoute = new OpenAPIHono();

const ModelSchema = z.record(z.string(), z.unknown()).openapi('HubModel');
const PassthroughBody = z.record(z.string(), z.unknown());
const upstreamErrorBody = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

const PathParam = z.object({
  provider: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().regex(/^[a-z0-9.-]+$/),
});

function readUpstream(): { url: string; key: string } | null {
  const url = process.env['JIMBO_API_URL'];
  const key = process.env['JIMBO_API_KEY'];
  return url && key ? { url, key } : null;
}

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['HubModels'],
  summary: 'List models (proxies to jimbo-api)',
  responses: {
    200: { description: 'Models', content: { 'application/json': { schema: ModelSchema.array() } } },
    502: { description: 'Upstream', content: { 'application/json': { schema: upstreamErrorBody } } },
  },
});
hubModelsRoute.openapi(listRoute, async (c) => {
  const up = readUpstream();
  if (!up) return c.json({ error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } }, 502);
  let res: Response;
  try {
    res = await fetch(`${up.url}/api/hub-models`, { headers: { 'X-API-Key': up.key } });
  } catch (e) {
    return c.json({ error: { code: 'UPSTREAM_FETCH_FAILED', message: (e as Error).message } }, 502);
  }
  if (!res.ok) return c.json({ error: { code: 'UPSTREAM_ERROR', message: `jimbo-api returned ${res.status}` } }, 502);
  return c.json(await res.json() as Record<string, unknown>[], 200);
});

const getOne = createRoute({
  method: 'get',
  path: '/{provider}/{name}',
  tags: ['HubModels'],
  summary: 'Get one model (proxies to jimbo-api)',
  request: { params: PathParam },
  responses: {
    200: { description: 'Model', content: { 'application/json': { schema: ModelSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: PassthroughBody } } },
    502: { description: 'Upstream', content: { 'application/json': { schema: upstreamErrorBody } } },
  },
});
hubModelsRoute.openapi(getOne, async (c) => {
  const { provider, name } = c.req.valid('param');
  const up = readUpstream();
  if (!up) return c.json({ error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } }, 502);
  let res: Response;
  try {
    res = await fetch(`${up.url}/api/hub-models/${encodeURIComponent(provider)}/${encodeURIComponent(name)}`, { headers: { 'X-API-Key': up.key } });
  } catch (e) {
    return c.json({ error: { code: 'UPSTREAM_FETCH_FAILED', message: (e as Error).message } }, 502);
  }
  const payload = await res.json().catch(() => ({}));
  if (res.status === 200) return c.json(payload as Record<string, unknown>, 200);
  if (res.status === 404) return c.json(payload as Record<string, unknown>, 404);
  return c.json({ error: { code: 'UPSTREAM_ERROR', message: `jimbo-api returned ${res.status}` } }, 502);
});

const patchOne = createRoute({
  method: 'patch',
  path: '/{provider}/{name}',
  tags: ['HubModels'],
  summary: 'Edit a model (proxies to jimbo-api)',
  request: {
    params: PathParam,
    body: { content: { 'application/json': { schema: PassthroughBody } } },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: ModelSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: PassthroughBody } } },
    409: { description: 'Conflict', content: { 'application/json': { schema: PassthroughBody } } },
    502: { description: 'Upstream', content: { 'application/json': { schema: upstreamErrorBody } } },
  },
});
hubModelsRoute.openapi(patchOne, async (c) => {
  const { provider, name } = c.req.valid('param');
  const body = c.req.valid('json');
  const up = readUpstream();
  if (!up) return c.json({ error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } }, 502);
  let res: Response;
  try {
    res = await fetch(`${up.url}/api/hub-models/${encodeURIComponent(provider)}/${encodeURIComponent(name)}`, {
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

const post = createRoute({
  method: 'post',
  path: '/',
  tags: ['HubModels'],
  summary: 'Create a model (proxies to jimbo-api)',
  request: { body: { content: { 'application/json': { schema: PassthroughBody } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: ModelSchema } } },
    400: { description: 'Validation', content: { 'application/json': { schema: PassthroughBody } } },
    409: { description: 'Conflict', content: { 'application/json': { schema: PassthroughBody } } },
    502: { description: 'Upstream', content: { 'application/json': { schema: upstreamErrorBody } } },
  },
});
hubModelsRoute.openapi(post, async (c) => {
  const body = c.req.valid('json');
  const up = readUpstream();
  if (!up) return c.json({ error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } }, 502);
  let res: Response;
  try {
    res = await fetch(`${up.url}/api/hub-models`, {
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

const del = createRoute({
  method: 'delete',
  path: '/{provider}/{name}',
  tags: ['HubModels'],
  summary: 'Delete a model (proxies to jimbo-api)',
  request: { params: PathParam },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: PassthroughBody } } },
    409: { description: 'Conflict', content: { 'application/json': { schema: PassthroughBody } } },
    502: { description: 'Upstream', content: { 'application/json': { schema: upstreamErrorBody } } },
  },
});
hubModelsRoute.openapi(del, async (c) => {
  const { provider, name } = c.req.valid('param');
  const up = readUpstream();
  if (!up) return c.json({ error: { code: 'UPSTREAM_NOT_CONFIGURED', message: 'JIMBO_API_URL or JIMBO_API_KEY not set' } }, 502);
  let res: Response;
  try {
    res = await fetch(`${up.url}/api/hub-models/${encodeURIComponent(provider)}/${encodeURIComponent(name)}`, {
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
