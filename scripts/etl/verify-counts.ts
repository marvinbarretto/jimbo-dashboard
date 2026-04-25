// Quick sanity check — print row counts + drizzle journal.
import { sql } from 'drizzle-orm';
import { db, sql as pg } from '../../db/client';

async function main() {
  // Drizzle journal
  console.log('--- drizzle journal ---');
  const j = await db.execute(sql.raw(
    `SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id`,
  )).catch((e) => { console.log('  (no journal:', String(e).slice(0, 100), ')'); return [] as any; });
  const jrows = (Array.isArray(j) ? j : (j.rows ?? j)) as Array<{ hash: string; created_at: number | string }>;
  for (const row of jrows) {
    console.log(`  ${new Date(Number(row.created_at)).toISOString()}  ${row.hash}`);
  }

  // What tables exist?
  console.log('--- tables in public ---');
  const t = await db.execute(sql.raw(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`,
  ));
  const trows = (Array.isArray(t) ? t : (t.rows ?? t)) as Array<{ tablename: string }>;
  for (const row of trows) {
    const c = await db.execute(sql.raw(`SELECT COUNT(*)::int AS n FROM "${row.tablename}"`));
    const crows = (Array.isArray(c) ? c : (c.rows ?? c)) as Array<{ n: number }>;
    const n = crows[0]?.n ?? 0;
    console.log(`  ${row.tablename.padEnd(34)} ${String(n).padStart(6)}`);
  }
}
main()
  .then(async () => { await pg.end(); process.exit(0); })
  .catch(async (e) => { console.error(e); await pg.end().catch(() => {}); process.exit(1); });
