import { defineConfig } from 'drizzle-kit';

// PoC config — targets jimbo_pg via SSH tunnel.
// Open the tunnel before running drizzle-kit:
//   ssh -L 5433:127.0.0.1:5432 vps -N
//
// Run with: node --env-file=.env --import tsx node_modules/drizzle-kit/bin.cjs <cmd>
// (npm scripts in package.json wrap this.)

const url = process.env.JIMBO_PG_URL;
if (!url) throw new Error('JIMBO_PG_URL missing — load .env via --env-file=.env');

export default defineConfig({
  dialect: 'postgresql',
  schema:  './db/schema/index.ts',
  out:     './db/migrations',
  dbCredentials: { url },
  verbose: true,
  strict:  true,
});
