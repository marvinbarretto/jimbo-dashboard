import { Hono } from 'hono';
import { db } from '../../db/client';
import { projects } from '../../db/schema';

// ── GET /api/projects ──────────────────────────────────────────────────────
//
// Small global list. Synthesized from production's "project:slug" tag
// convention during ETL — currently 10 rows (localshout, jimbo, openclaw,
// spoons, ...).

export const projectsRoute = new Hono();

projectsRoute.get('/', async (c) => {
  const rows = await db.select().from(projects);
  return c.json({ items: rows });
});
