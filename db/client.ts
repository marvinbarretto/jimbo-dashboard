import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const url = process.env.JIMBO_PG_URL;
if (!url) throw new Error('JIMBO_PG_URL missing — load .env via --env-file=.env');

// Single-connection client for scripts (ETL, migrations).
// Long-lived services should use a pool; PoC scripts are short-lived.
export const sql = postgres(url, { max: 1, prepare: false });
export const db  = drizzle(sql, { schema });
