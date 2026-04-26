import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';

// ── ⚠️ TEMPORARY MIGRATION SCAFFOLDING ⚠️ ─────────────────────────────────
//
// This route exists ONLY for local-dev workflows where the dashboard runs
// against a Postgres replica of the live SQLite. It pulls a fresh snapshot
// from the VPS and reloads the PoC database.
//
// Phases:
//   A (now)        — manual sync button keeps Postgres fresh while we build
//   B              — jimbo-api now writes to Postgres directly (cutover done 2026-04-26)
//   C              — Postgres becomes primary writer; sync reverses or stops
//   D              — SQLite retired; this whole file gets deleted
//
// PRODUCTION GUARD: server.ts mounts this route only when NODE_ENV !== 'production'.
// It would TRUNCATE+ETL against jimbo_pg if exposed publicly.

const VPS_HOST = 'vps';
const VPS_SQLITE_PATH = '/home/jimbo/jimbo-api/data/context.db';
const VPS_TMP_SNAPSHOT = '/tmp/jimbo-pg-sync-snapshot.db';
const LOCAL_SNAPSHOT_DIR = '.local/snapshots';
const LOCAL_SNAPSHOT_FILE = 'sync-latest.db';

export const syncRoute = new OpenAPIHono();

interface SyncResult {
  ok: boolean;
  finished_at: string;
  duration_ms: number;
  snapshot_bytes: number;
  etl_log_tail: string;
  error?: string;
}

// In-memory bookkeeping — last successful sync's stats.
// Lost on api restart; that's fine — restart-rare and the timestamp is best-effort.
let lastSync: SyncResult | null = null;
let syncing = false;

const SyncResultSchema = z
  .object({
    ok: z.boolean(),
    finished_at: z.string(),
    duration_ms: z.number(),
    snapshot_bytes: z.number(),
    etl_log_tail: z.string(),
    error: z.string().optional(),
  })
  .openapi('SyncResult');

const SyncStatusSchema = z
  .object({
    last: SyncResultSchema.nullable(),
    in_progress: z.boolean(),
  })
  .openapi('SyncStatus');

const statusRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Sync'],
  summary: '⚠️ DEPRECATED — sync status (local-dev only, sunset in Phase D)',
  deprecated: true,
  description: 'TEMPORARY scaffolding from the SQLite→Postgres migration. Disabled in production. Will be deleted in Phase D.',
  responses: {
    200: {
      description: 'Sync status',
      content: { 'application/json': { schema: SyncStatusSchema } },
    },
  },
});

syncRoute.openapi(statusRoute, (c) =>
  c.json({ last: lastSync, in_progress: syncing }, 200),
);

const triggerRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Sync'],
  summary: '⚠️ DEPRECATED — trigger SQLite→Postgres sync (TRUNCATE + ETL, local-dev only)',
  deprecated: true,
  description: 'Destructive: truncates jimbo_pg tables then re-loads from a fresh SQLite snapshot. Disabled in production. Will be deleted in Phase D.',
  responses: {
    200: {
      description: 'Sync result',
      content: { 'application/json': { schema: SyncResultSchema } },
    },
    409: {
      description: 'Sync already in progress',
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
    },
    500: {
      description: 'Sync failed',
      content: { 'application/json': { schema: SyncResultSchema } },
    },
  },
});

syncRoute.openapi(triggerRoute, async (c) => {
  if (syncing) return c.json({ error: 'sync already in progress' }, 409);
  syncing = true;
  const started = Date.now();
  try {
    // -o ControlPath=none isolates these short-lived ssh/scp calls from the
    // user's long-running postgres tunnel (which uses ControlMaster=auto).
    // Without this, the sync's ssh exit can tear down the tunnel's multiplex
    // master, leaving the next /api request to fail with ECONNRESET.
    const ISOLATE = ['-o', 'ControlPath=none'];

    // sqlite3 .backup handles WAL correctly, unlike a plain file copy.
    await run('ssh', [...ISOLATE, VPS_HOST, `sqlite3 ${VPS_SQLITE_PATH} ".backup ${VPS_TMP_SNAPSHOT}"`]);

    const localPath = path.resolve(LOCAL_SNAPSHOT_DIR, LOCAL_SNAPSHOT_FILE);
    await run('scp', [...ISOLATE, `${VPS_HOST}:${VPS_TMP_SNAPSHOT}`, localPath]);

    // Best-effort cleanup of the tmp file on VPS.
    run('ssh', [...ISOLATE, VPS_HOST, `rm -f ${VPS_TMP_SNAPSHOT}`]).catch(() => {});

    const { size } = await stat(localPath);

    const etlOut = await runCapture('node', [
      '--env-file=.env',
      '--import', 'tsx',
      'scripts/etl/sqlite-to-postgres.ts',
    ], { ETL_SOURCE_DB_PATH: localPath });

    const tail = etlOut.split('\n').slice(-15).join('\n');
    lastSync = {
      ok: true,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      snapshot_bytes: size,
      etl_log_tail: tail,
    };
    return c.json(lastSync, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    lastSync = {
      ok: false,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      snapshot_bytes: 0,
      etl_log_tail: '',
      error: message,
    };
    return c.json(lastSync, 500);
  } finally {
    syncing = false;
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit' });
    proc.on('error', reject);
    proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} → exit ${code}`)));
  });
}

function runCapture(cmd: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { env: { ...process.env, ...extraEnv } });
    let out = '';
    let err = '';
    proc.stdout.on('data', (b) => { out += b.toString(); });
    proc.stderr.on('data', (b) => { err += b.toString(); });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} → exit ${code}\n${err.slice(-500)}`));
    });
  });
}
