import { Hono } from 'hono';
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';

// ── ⚠️ TEMPORARY MIGRATION SCAFFOLDING ⚠️ ─────────────────────────────────
//
// This route exists ONLY while the dashboard runs against a Postgres replica
// of the live SQLite. It pulls a fresh snapshot from the VPS and reloads the
// PoC database. Lifespan: weeks-to-months.
//
// Phases:
//   A (now)        — manual sync button keeps Postgres fresh while we build
//   B              — jimbo-api dual-writes to both stores; sync still useful
//   C              — Postgres becomes primary writer; sync reverses or stops
//   D              — SQLite retired; this whole file gets deleted
//
// Don't build features that depend on this endpoint. It is going away.

const VPS_HOST = 'vps';
const VPS_SQLITE_PATH = '/home/jimbo/jimbo-api/data/context.db';
const VPS_TMP_SNAPSHOT = '/tmp/jimbo-pg-sync-snapshot.db';
const LOCAL_SNAPSHOT_DIR = '.local/snapshots';
const LOCAL_SNAPSHOT_FILE = 'sync-latest.db';

export const syncRoute = new Hono();

// In-memory bookkeeping — last successful sync's stats. Read by GET, set by POST.
// Lost on api restart; that's fine — restart-rare and the timestamp is best-effort.
let lastSync: SyncResult | null = null;

interface SyncResult {
  ok: boolean;
  finished_at: string;
  duration_ms: number;
  snapshot_bytes: number;
  etl_log_tail: string;
  error?: string;
}

let syncing = false;

syncRoute.get('/', (c) => c.json({
  last: lastSync,
  in_progress: syncing,
}));

syncRoute.post('/', async (c) => {
  if (syncing) return c.json({ error: 'sync already in progress' }, 409);
  syncing = true;
  const started = Date.now();
  try {
    // -o ControlPath=none isolates these short-lived ssh/scp calls from the
    // user's long-running postgres tunnel (which uses ControlMaster=auto).
    // Without this, the sync's ssh exit can tear down the tunnel's multiplex
    // master, leaving the next /api request to fail with ECONNRESET.
    const ISOLATE = ['-o', 'ControlPath=none'];

    // Step 1 — take a consistent snapshot on the VPS via sqlite3 .backup
    // (handles WAL correctly, unlike a plain file copy).
    await run('ssh', [...ISOLATE, VPS_HOST, `sqlite3 ${VPS_SQLITE_PATH} ".backup ${VPS_TMP_SNAPSHOT}"`]);

    // Step 2 — pull it to the dashboard's local snapshot dir.
    const localPath = path.resolve(LOCAL_SNAPSHOT_DIR, LOCAL_SNAPSHOT_FILE);
    await run('scp', [...ISOLATE, `${VPS_HOST}:${VPS_TMP_SNAPSHOT}`, localPath]);

    // Step 3 — clean up the tmp file on VPS so we don't leave 50 MB of cruft.
    // Best-effort; ignore errors.
    run('ssh', [...ISOLATE, VPS_HOST, `rm -f ${VPS_TMP_SNAPSHOT}`]).catch(() => {});

    // Step 4 — capture snapshot size for the result.
    const { size } = await stat(localPath);

    // Step 5 — run the ETL pointing at the fresh snapshot. Spawn the same
    // command package.json's db:pg:etl uses, with ETL_SOURCE_DB_PATH set.
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
    return c.json(lastSync);
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
