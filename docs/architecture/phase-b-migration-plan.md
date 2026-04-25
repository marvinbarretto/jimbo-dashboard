# Phase B — SQLite → Postgres migration plan

**Status as of 2026-04-25 evening:** Phase A complete. Reads from `jimbo_pg` are wired into the dashboard via `dashboard/api/`. Phase B is the real migration: porting jimbo-api's writers from SQLite to Postgres, then sunsetting SQLite.

**Operator decision:** new vault items are FROZEN in production for the duration of this work. No incoming writes during the cutover. This converts what would have been a "dual-write for weeks" project into a "freeze, port, swap, unfreeze" project. Faster, less risky.

---

## 1. State at start of Phase B

**Two databases, both on `vps-lon1`:**

| DB | Purpose | Writers (today) |
|---|---|---|
| `/home/jimbo/jimbo-api/data/context.db` (SQLite) | Authoritative — vault_notes, dispatch_queue, note_activity, system_events, costs, grooming_*, thread_messages, settings, …55 tables | jimbo-api (Hono on :3100), hermes-agent (Python) via jimbo-api routes |
| `jimbo_pg` (Postgres on :5432) | PoC replica — populated by manual ETL from SQLite | dashboard/api (writes intended but not yet wired) |

**Three running services on VPS:**
- `jimbo-api` Node.js on :3100 — REST API for everything (vault, dispatch, grooming, costs, calendar, briefing, fitness, emails, coach, …)
- `hermes-agent` Python on its own — AI orchestration; talks to jimbo-api over HTTP, doesn't write SQLite directly
- `caddy` :80/:443 — reverse proxy; routes `jimbo.fourfoldmedia.uk/api/*` → :3100

**Code locations:**
- jimbo-api source: `/home/jimbo/jimbo-api/src/{routes,services}/*.ts` (35 routes, 59 services)
- Compiled JS: `/home/jimbo/jimbo-api/{routes,services}/*.js` — what runs in production via `node dist/index.js`
- Snapshot of SQLite schema (frozen 2026-04-25): `dashboard/docs/architecture/snapshots/jimbo-api-schema-2026-04-25.sql`

**Existing dashboard state (already done):**
- Drizzle schema for 13 entity tables in `dashboard/db/schema/*.ts`
- ETL `dashboard/scripts/etl/sqlite-to-postgres.ts` proved correct on 17.8k rows
- API endpoints in `dashboard/api/routes/` for reads (`vault-items`, `dispatches`, `actors`, `projects`, `vault-item-projects`)
- Manual sync button (`POST /api/sync`) — gets deleted in Phase D

---

## 2. Audit of jimbo-api SQLite writers

`grep -E 'INSERT INTO|UPDATE |DELETE FROM'` across `src/routes/*.ts` and `src/services/*.ts`:

- **42 files write to SQLite**
- **164 distinct write statements**

### Heavy hitters (port first — biggest impact, tightest coupling)

| File | Reads | Writes | Notes |
|---|---:|---:|---|
| `services/vault.ts` | 38 | 15 | Vault item CRUD, the kanban's data |
| `services/dispatch.ts` | 32 | 21 | Dispatch queue lifecycle |
| `services/grooming-submit.ts` | 10 | 17 | Grooming pipeline writes (status transitions, audit, lesson citation) |
| `services/context.ts` | 20 | 9 | Operator context files/sections/items |
| `services/coach-db.ts` | 7 | 8 | Coaching nudges + supplements |
| `services/grooming-lessons.ts` | 5 | 6 | Lessons accreted from corrections |
| `routes/webhooks.ts` | 1 | 6 | External ingestion landing |
| `services/emails.ts` | 6 | 5 | Email reports |
| `services/email-candidates.ts` | 3 | 5 | Email-derived vault candidates |
| `routes/grooming.ts` | 13 | 4 | Grooming endpoint handlers |

### Mid-tier (port after heavy-hitters land)

`services/settings.ts`, `services/product-summaries.ts`, `services/projects.ts`, `services/actors.ts`, `services/grooming-questions.ts`, `services/grooming-transition.ts`, `services/grooming-feedback.ts`, `services/grooming-corrections.ts`, `services/note-thread.ts`, `services/note-activity.ts`, `services/attachments.ts`, `services/vault-item-projects.ts`, `services/vault-item-dependencies.ts`, `services/pipeline.ts`, `services/briefing.ts`, `services/activity.ts`, `services/events.ts`, `services/experiments.ts`, `services/health.ts` (heavy read but only 1 write).

### Out-of-scope clusters (Postgres tables don't exist yet — defer or skip)

- `services/interrogate-*` (10 files) — 0-row tables in production today; can absorb later
- `services/fitness.ts` — fitness records; separate concern, defer
- Calendar/Google integrations — read-only against external APIs

### Hermes-agent

Doesn't write SQLite directly — talks to jimbo-api HTTP. Once jimbo-api is on Postgres, hermes is on Postgres transitively. **No hermes work needed.**

---

## 3. Approach

### Strategy

**Port jimbo-api in place** — not rewrite, not extract. Keep the existing route/service shape. Replace each SQLite query call with a Postgres query call. Same response JSON to consumers.

Each service file follows the same pattern today:
```ts
import { db } from '../db';
db.prepare('INSERT INTO ... VALUES ...').run(args);
```

After porting:
```ts
import { sql } from '../db-pg';
await sql`INSERT INTO ... VALUES ${sql(args)}`;
```

(Or via a thin Drizzle layer if we want type safety, but the migration is faster as raw SQL — Drizzle's value comes later when we evolve the schema.)

### Why raw SQL not Drizzle for the jimbo-api side

- The dashboard already has the canonical Drizzle schema in `dashboard/db/schema/`
- Re-encoding it inside jimbo-api creates two definitions to keep in sync
- Phase B is about porting, not redesigning — keep the moves mechanical
- After Phase B, jimbo-api can adopt Drizzle by importing the schema, but that's a separate Phase E

### Schema parity check

The Drizzle schema in `dashboard/db/schema/` covers the entity tables (vault_notes, dispatch_queue, note_activity, etc.). It does NOT yet cover:

- All `interrogate_*` tables
- `briefing_*`, `coach_*`, `email_*`, `health_*`, `fitness_*`
- `pipeline_runs`, `bakeoff_runs`, `experiments`
- `note_thread`, `note_links`
- `grooming_proposals`, `grooming_corrections`, `grooming_lessons` (currently low-row in production but Phase B will write here)
- `vault_candidates`, `vault_item_dependencies`

**Pre-flight task:** introspect production SQLite for these tables, add to Drizzle schema, generate migrations, apply to jimbo_pg. This is mechanical work — perfect for sub-agent parallelization.

---

## 4. Step-by-step Phase B plan

### Pre-flight (before any cutover)

1. **Confirm freeze.** No new vault_notes, dispatches, or activity events being written to production. (Operator handles externally.)
2. **Extend Drizzle schema** to cover all production tables jimbo-api writes to. See parity gaps above.
3. **Generate + apply schema** to jimbo_pg.
4. **Final ETL run.** Captures the pre-cutover state.
5. **Snapshot** `context.db` to `/home/jimbo/jimbo-api/data/context.db.bak.pre-postgres-cutover` (forever-archive).

### Per-file port (parallelizable)

For each file in the audit:

1. Read the file
2. Identify each SQLite query
3. Translate to Postgres equivalent (the SQL is mostly identical; differences: parameter style `?` → `$1`, `INSERT OR IGNORE` → `INSERT … ON CONFLICT DO NOTHING`, `datetime('now')` → `NOW()`, `IFNULL` → `COALESCE`, `||` concatenation works in both)
4. Verify the response shape stays unchanged (consumers must not break)
5. Add a smoke test: a single read+write through the route returns valid data

A sub-agent should be given **one file at a time** with:
- The file path on VPS
- The Drizzle schema for the tables it touches
- The output shape contract (what the route returns)
- A "translate, don't redesign" instruction

### Cutover (single big switch)

1. Stop jimbo-api: `systemctl stop jimbo-api` (or whatever the unit is — TBC)
2. Final ETL run (catches anything that happened between the previous final ETL and now)
3. Update jimbo-api config to point at Postgres instead of SQLite
4. Start jimbo-api on the ported codebase
5. Smoke-test against production endpoints (`curl https://jimbo.fourfoldmedia.uk/api/vault/notes?limit=1`)
6. **Unfreeze** writes — vault items can flow again, this time landing in Postgres.

### Validation (post-cutover)

- Counts match between (final SQLite) and (post-cutover Postgres)
- Spot-check 20 items across categories
- Watch system_events for errors over 24h
- Dashboard `/grooming` still renders identical to pre-cutover snapshot
- Hermes pipeline still produces dispatches

### Phase D (later) — sunset SQLite

- After 1 week of clean Postgres operation: `mv context.db context.db.archived-2026-XX-XX`
- Remove SQLite-specific code paths from jimbo-api
- Delete `dashboard/scripts/etl/`, `dashboard/api/routes/sync.ts`, `dashboard/src/app/shared/components/sync-button/`
- Delete the Phase A scaffolding markers (greppable: `⚠️ TEMPORARY`)

---

## 5. Rollback plan

If post-cutover smoke tests fail:

1. `systemctl stop jimbo-api`
2. Revert jimbo-api config to point at SQLite
3. `systemctl start jimbo-api`
4. SQLite is unchanged — production resumes as before
5. Investigate what failed in Postgres, iterate, retry cutover

The freeze+final-ETL approach makes rollback safe because the SQLite file is the source of truth right up to the cutover moment.

---

## 6. Sub-agent strategy

**Parallelizable units:**

1. **Schema introspection per table cluster** — one agent per table family (interrogate, briefing, coach, email, health, etc.) introspects SQLite, writes Drizzle schema, generates migration. ~10 agents could run in parallel.

2. **File porting** — one agent per service file. Each agent gets:
   - The file's TypeScript source
   - The relevant Drizzle schema
   - The route's contract (what it returns)
   - Translation rules (SQLite → Postgres dialect)

   ~30 agents × ~5–15 min each = the bulk of Phase B done in a few hours of wall-clock time if dispatched in parallel.

3. **Validation harness** — one agent writes a test runner that, given a route URL + sample request, verifies the response shape against the pre-cutover snapshot.

**Not parallelizable (must be sequential):**

- Pre-flight schema work (so all agents see the same target schema)
- Cutover itself (one big switch)
- Final validation (single human-driven check)

---

## 7. Definition of done

- All 42 jimbo-api files with writes have been ported and pass smoke tests
- Production traffic flows through Postgres for at least 7 days with no regressions
- SQLite file archived
- Phase A scaffolding deleted from dashboard repo
- This document moves to `docs/architecture/archive/phase-b-completed.md`

---

## 8. Cross-references

- **Architecture overview:** `dashboard/docs/architecture/whiteboard.md`
- **Schema snapshot:** `dashboard/docs/architecture/snapshots/jimbo-api-schema-2026-04-25.sql`
- **Row counts at snapshot:** `dashboard/docs/architecture/snapshots/jimbo-api-counts-2026-04-25.md`
- **Drizzle schema (target):** `dashboard/db/schema/`
- **ETL (Phase A):** `dashboard/scripts/etl/sqlite-to-postgres.ts`
- **Sync endpoint (Phase A scaffolding):** `dashboard/api/routes/sync.ts`
