// ── Dashboard API ──────────────────────────────────────────────────────────
//
// Hono service that backs the dashboard's reads and operator actions. Reads
// from jimbo_pg via Drizzle (db/client + db/schema, shared with ETL scripts).
// Runs on :3200 in dev; Angular proxy forwards /api/* here.
//
// Run via SSH tunnel (postgres on VPS only listens on 127.0.0.1):
//   ssh -L 5433:127.0.0.1:5432 vps -N
//   npm run api
//
// Distinct from jimbo-api on the VPS — that service owns ingestion, cron,
// and AI orchestration. This service owns operator-facing reads/writes.

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { vaultItemsRoute } from './routes/vault-items';
import { dispatchesRoute } from './routes/dispatches';
import { actorsRoute } from './routes/actors';
import { projectsRoute } from './routes/projects';
import { vaultItemProjectsRoute } from './routes/vault-item-projects';

const app = new Hono();

app.use('*', logger());
// Proxy fronts us in dev so CORS is moot, but allow it explicitly for the
// case where the dashboard calls us directly during early prototyping.
app.use('*', cors());

app.get('/api/health', (c) => c.json({
  ok: true,
  service: 'dashboard-api',
  ts: new Date().toISOString(),
}));

app.route('/api/vault-items', vaultItemsRoute);
app.route('/api/dispatches', dispatchesRoute);
app.route('/api/actors', actorsRoute);
app.route('/api/projects', projectsRoute);
app.route('/api/vault-item-projects', vaultItemProjectsRoute);

const port = Number(process.env.API_PORT ?? 3200);
serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`[api] listening on http://localhost:${port}`);
});
