import { Hono } from 'hono';
import { db } from '../../db/client';
import { actors } from '../../db/schema';

// ── GET /api/actors ────────────────────────────────────────────────────────
//
// Small global list. Synthesized from production's flat assigned_to/executor
// strings during ETL — currently 3 rows (marvin, ralph, boris).

export const actorsRoute = new Hono();

actorsRoute.get('/', async (c) => {
  const rows = await db.select().from(actors);
  return c.json({ items: rows });
});
