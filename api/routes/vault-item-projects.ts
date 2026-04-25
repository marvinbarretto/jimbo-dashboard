import { Hono } from 'hono';
import { db } from '../../db/client';
import { vaultItemProjects } from '../../db/schema';

// ── GET /api/vault-item-projects ───────────────────────────────────────────
//
// All vault-item ↔ project junction rows. Currently 190 rows total — small
// enough to bulk-load on app start, avoids the N+1 problem the old per-item
// lazy-fetch pattern would create against 2,353 vault items.

export const vaultItemProjectsRoute = new Hono();

vaultItemProjectsRoute.get('/', async (c) => {
  const rows = await db.select().from(vaultItemProjects);
  return c.json({ items: rows });
});
