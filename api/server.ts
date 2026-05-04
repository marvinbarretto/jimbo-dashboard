// ── Dashboard API ──────────────────────────────────────────────────────────
//
// Hono service that backs the dashboard's reads and operator actions. Reads
// from jimbo_pg via Drizzle (db/client + db/schema, shared with ETL scripts).
//
// Local dev (postgres on VPS only listens on 127.0.0.1):
//   ssh -L 5433:127.0.0.1:5432 vps -N
//   npm run api          # → http://localhost:3201
//   open http://localhost:3201/dashboard-api/docs
//
// Production: rsync dist-api/ to VPS, run via systemd unit dashboard-api.service.
// Caddy routes /dashboard-api/* → :3201.
//
// Distinct from jimbo-api on the VPS — that service owns ingestion, cron,
// and AI orchestration. This service owns operator-facing reads/writes.

import { serve, upgradeWebSocket } from '@hono/node-server';
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { WebSocketServer } from 'ws';
import { requestId } from './middleware/request-id.js';
import { validationHook } from './middleware/error.js';
import { apiKeyAuth } from './middleware/auth.js';
import { vaultItemsRoute } from './routes/vault-items.js';
import { dispatchesRoute } from './routes/dispatches.js';
import { actorsRoute } from './routes/actors.js';
import { projectsRoute } from './routes/projects.js';
import { vaultItemProjectsRoute } from './routes/vault-item-projects.js';
import { skillsRoute } from './routes/skills.js';
import { hubModelsRoute } from './routes/hub-models.js';
import { hubModelStacksRoute } from './routes/hub-model-stacks.js';
import { vaultItemDependenciesRoute } from './routes/vault-item-dependencies.js';
import { noteActivityRoute } from './routes/note-activity.js';
import { threadMessagesRoute } from './routes/thread-messages.js';
import { attachmentsRoute } from './routes/attachments.js';
import { jimboProxyRoute, proxyJimboGet, proxyJimboMutate } from './routes/jimbo-proxy.js';
import { createStreamHandlers, streamAuth } from './routes/stream.js';
import { activityBroadcaster } from './services/activity-broadcaster.js';
import { HealthSchema } from './schemas/shared.js';

const app = new OpenAPIHono({ defaultHook: validationHook });

app.use('*', requestId);
app.use('*', logger());
app.use('*', cors());

// All routes mount under /dashboard-api/* so Caddy can forward without a
// strip_prefix step — keeps swagger's root-relative spec URL valid both
// locally and behind the reverse proxy.
const BASE = '/dashboard-api';
const JIMBO_READ_THROUGH_PREFIXES = [
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
  '/api/hermes',
  '/api/interrogate',
  '/api/pipeline',
  '/api/search',
  '/api/settings',
  '/api/shopping',
  '/api/snapshot',
  '/api/summaries',
  '/api/triage',
  '/api/vault',
];

const healthRoute = createRoute({
  method: 'get',
  path: `${BASE}/api/health`,
  tags: ['Health'],
  summary: 'Liveness probe',
  responses: {
    200: {
      description: 'Service health',
      content: { 'application/json': { schema: HealthSchema } },
    },
  },
});

app.openapi(healthRoute, (c) =>
  c.json({ ok: true, service: 'dashboard-api', ts: new Date().toISOString() }, 200),
);

app.doc(`${BASE}/docs/openapi.json`, {
  openapi: '3.1.0',
  info: {
    title: 'Dashboard API',
    version: '0.1.0',
    description: 'Operator-facing reads/writes for the dashboard. Backs the kanban, execution board, and projects/actors lookups against jimbo_pg.',
    contact: { url: 'https://github.com/marvinbarretto' },
  },
  servers: [
    { url: 'http://localhost:3201', description: 'Local development' },
    { url: 'https://jimbo.fourfoldmedia.uk', description: 'Production' },
  ],
  security: [{ apiKey: [] as string[] }],
});

app.openAPIRegistry.registerComponent('securitySchemes', 'apiKey', {
  type: 'apiKey',
  in: 'header',
  name: 'X-API-Key',
});

app.get(`${BASE}/docs`, swaggerUI({ url: `${BASE}/docs/openapi.json` }));

// Auth-protected — all data routes require X-API-Key (locally too, so behaviour
// matches production). /docs and health stay public.
app.use(`${BASE}/api/vault-items/*`, apiKeyAuth);
app.use(`${BASE}/api/dispatches/*`, apiKeyAuth);
app.use(`${BASE}/api/actors/*`, apiKeyAuth);
app.use(`${BASE}/api/projects/*`, apiKeyAuth);
app.use(`${BASE}/api/vault-item-projects/*`, apiKeyAuth);
app.use(`${BASE}/api/skills/*`, apiKeyAuth);
app.use(`${BASE}/api/hub-models/*`, apiKeyAuth);
app.use(`${BASE}/api/hub-model-stacks/*`, apiKeyAuth);
app.use(`${BASE}/api/vault-item-dependencies/*`, apiKeyAuth);
app.use(`${BASE}/api/note-activity/*`, apiKeyAuth);
app.use(`${BASE}/api/thread-messages/*`, apiKeyAuth);
app.use(`${BASE}/api/attachments/*`, apiKeyAuth);
app.use(`${BASE}/api/jimbo/*`, apiKeyAuth);

for (const prefix of JIMBO_READ_THROUGH_PREFIXES) {
  app.get(`${BASE}${prefix}`, apiKeyAuth, c => proxyJimboGet(c, c.req.path.slice(BASE.length)));
  app.get(`${BASE}${prefix}/*`, apiKeyAuth, c => proxyJimboGet(c, c.req.path.slice(BASE.length)));
}

// Prefixes that need POST/PATCH/DELETE proxied to jimbo-api in addition to GET.
// Add a prefix here when the dashboard needs full CRUD against an upstream
// route family (rather than reimplementing it in dashboard-api).
const JIMBO_MUTATE_PREFIXES = ['/api/hermes', '/api/shopping'];

for (const prefix of JIMBO_MUTATE_PREFIXES) {
  for (const path of [`${BASE}${prefix}`, `${BASE}${prefix}/*`]) {
    app.post(path, apiKeyAuth, c => proxyJimboMutate(c, c.req.path.slice(BASE.length)));
    app.patch(path, apiKeyAuth, c => proxyJimboMutate(c, c.req.path.slice(BASE.length)));
    app.delete(path, apiKeyAuth, c => proxyJimboMutate(c, c.req.path.slice(BASE.length)));
  }
}

// Keep the dashboard API's own /api/health liveness probe intact, but forward
// the upstream Jimbo health sub-resources through the same path-native shape.
app.get(`${BASE}/api/health/*`, apiKeyAuth, c => proxyJimboGet(c, c.req.path.slice(BASE.length)));

app.route(`${BASE}/api/vault-items`, vaultItemsRoute);
app.route(`${BASE}/api/dispatches`, dispatchesRoute);
app.route(`${BASE}/api/actors`, actorsRoute);
app.route(`${BASE}/api/projects`, projectsRoute);
app.route(`${BASE}/api/vault-item-projects`, vaultItemProjectsRoute);
app.route(`${BASE}/api/skills`, skillsRoute);
app.route(`${BASE}/api/hub-models`, hubModelsRoute);
app.route(`${BASE}/api/hub-model-stacks`, hubModelStacksRoute);
app.route(`${BASE}/api/vault-item-dependencies`, vaultItemDependenciesRoute);
app.route(`${BASE}/api/note-activity`, noteActivityRoute);
app.route(`${BASE}/api/thread-messages`, threadMessagesRoute);
app.route(`${BASE}/api/attachments`, attachmentsRoute);
app.route(`${BASE}/api/jimbo`, jimboProxyRoute);

// Mounted outside the per-route apiKeyAuth chain — browsers can't set
// custom headers on WS upgrades, so streamAuth checks ?key= (with
// X-API-Key fallback) instead.
app.get(`${BASE}/ws/stream`, streamAuth, upgradeWebSocket(createStreamHandlers));

const port = Number(process.env['API_PORT'] ?? 3201);
const wss = new WebSocketServer({ noServer: true });
serve({ fetch: app.fetch, port, websocket: { server: wss } }, ({ port }) => {
  console.log(`[api] listening on http://localhost:${port}${BASE}`);
  console.log(`[api]   docs → http://localhost:${port}${BASE}/docs`);
});

// Pre-warm the LISTEN connection so the first WS subscriber doesn't pay
// the handshake cost. Failure here doesn't abort startup — the broadcaster
// retries lazily when a client subscribes.
activityBroadcaster.start().catch((err) => {
  console.error('[activity-broadcaster] initial start failed:', err);
});
