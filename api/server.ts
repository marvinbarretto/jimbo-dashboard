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
// Service binds to 127.0.0.1 only — Caddy is the sole public entry, with
// basic_auth gating /dashboard-api/* and the static dashboard. No app-level
// API key: the bundle has nothing sensitive to substitute, deploys are
// trivial, and rotation = one Caddyfile edit.
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
import { createStreamHandlers } from './routes/stream.js';
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
  '/api/focus-sessions',
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
});

app.get(`${BASE}/docs`, swaggerUI({ url: `${BASE}/docs/openapi.json` }));

// No app-level auth: dashboard-api binds to 127.0.0.1 and Caddy basic_auth
// gates /dashboard-api/* on the public host. Removing the per-route guards
// also means the bundle ships nothing sensitive — see deploy.sh.
for (const prefix of JIMBO_READ_THROUGH_PREFIXES) {
  app.get(`${BASE}${prefix}`, c => proxyJimboGet(c, c.req.path.slice(BASE.length)));
  app.get(`${BASE}${prefix}/*`, c => proxyJimboGet(c, c.req.path.slice(BASE.length)));
}

// Prefixes that need POST/PATCH/DELETE proxied to jimbo-api in addition to GET.
// Add a prefix here when the dashboard needs full CRUD against an upstream
// route family (rather than reimplementing it in dashboard-api).
const JIMBO_MUTATE_PREFIXES = ['/api/hermes', '/api/shopping', '/api/focus-sessions', '/api/calendar'];

for (const prefix of JIMBO_MUTATE_PREFIXES) {
  for (const path of [`${BASE}${prefix}`, `${BASE}${prefix}/*`]) {
    app.post(path, c => proxyJimboMutate(c, c.req.path.slice(BASE.length)));
    app.put(path, c => proxyJimboMutate(c, c.req.path.slice(BASE.length)));
    app.patch(path, c => proxyJimboMutate(c, c.req.path.slice(BASE.length)));
    app.delete(path, c => proxyJimboMutate(c, c.req.path.slice(BASE.length)));
  }
}

// Keep the dashboard API's own /api/health liveness probe intact, but forward
// the upstream Jimbo health sub-resources through the same path-native shape.
app.get(`${BASE}/api/health/*`, c => proxyJimboGet(c, c.req.path.slice(BASE.length)));

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

// WS upgrade — Caddy's basic_auth runs on the upgrade request before
// proxying, so the connection is gated at the edge.
app.get(`${BASE}/ws/stream`, upgradeWebSocket(createStreamHandlers));

const port = Number(process.env['API_PORT'] ?? 3201);
const wss = new WebSocketServer({ noServer: true });
// Bind to localhost only — Caddy is the sole public entry. Prevents accidental
// 0.0.0.0 exposure if firewall rules drift.
serve({ fetch: app.fetch, port, hostname: '127.0.0.1', websocket: { server: wss } }, ({ port }) => {
  console.log(`[api] listening on http://127.0.0.1:${port}${BASE}`);
  console.log(`[api]   docs → http://localhost:${port}${BASE}/docs`);
});

// Pre-warm the LISTEN connection so the first WS subscriber doesn't pay
// the handshake cost. Failure here doesn't abort startup — the broadcaster
// retries lazily when a client subscribes.
activityBroadcaster.start().catch((err) => {
  console.error('[activity-broadcaster] initial start failed:', err);
});
