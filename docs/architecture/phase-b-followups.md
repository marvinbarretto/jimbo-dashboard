# Post-Phase-B roadmap

**Status as of 2026-04-26:** Phase B cutover complete. Production jimbo-api is on Postgres for all in-scope services. SQLite (`/home/jimbo/jimbo-api/data/context.db`) remains alive on disk for the deferred services and as a rollback safety net.

This doc tracks every piece of work that follows the cutover — monitoring, sunset, deferred services, schema tightening, and the small pile of tech-debt items the porting waves surfaced.

Original Phase B plan archived at `docs/architecture/archive/phase-b-completed.md`.

---

## 1. State after cutover

**On Postgres (`jimbo_pg`):** vault, dispatch, grooming (submit/lessons/transition/feedback/questions/corrections), email (reports/candidates/webhooks), context (files/sections/items), coach (db/logs/nudges/supplements), actors, projects, vault-item-projects, vault-item-dependencies, attachments, pipeline, briefing, activities, experiments, events, costs, product-summaries, note-thread, note-activity, settings, search (tsvector + pg_trgm).

**Still on SQLite on the VPS:** services/health.ts, services/fitness.ts, services/interrogate-* (10 files). These were deferred per the §7a coupling rule (no PG schema → no port). The legacy SQLite client (`src/db/index.ts`) and its singleton init in `src/index.ts` remain live for those services only.

**Two databases run side-by-side in production.** This is intentional — see §4 for the decision tree on what to do with the deferred surface.

**Dashboard API now hosted on the VPS** (added 2026-04-26). The Hono service in `dashboard/api/` is deployed as the `dashboard-api.service` systemd unit on port 3201, fronted by Caddy at `https://jimbo.fourfoldmedia.uk/dashboard-api/*`. Refactored to `@hono/zod-openapi` + `@hono/swagger-ui` — interactive docs at `/dashboard-api/docs`. X-API-Key auth (`DASHBOARD_API_KEY` in `/opt/dashboard-api.env`) gates `/api/*` data routes; `/docs` and `/api/health` stay public. `routes/sync.ts` is gated by `NODE_ENV !== 'production'` so the destructive TRUNCATE+ETL path is never reachable on the live service. Deploy mirror of jimbo-api: `dist-api/` rsynced to `/home/jimbo/dashboard-api/`, env at `/opt/dashboard-api.env`.

---

## 2. Post-cutover monitoring (next 7 days)

Goal: catch any latent regression that didn't show in the smoke. Acceptance bar for declaring Phase D ready.

- [ ] **Daily check (1×/day for 7 days):** `journalctl -u jimbo-api --since "24 hours ago" | grep -iE "error|fatal|ECONN|postgres" | grep -v UPLOAD_ERROR`. Pre-existing UPLOAD_ERROR on `/api/uploads/presign` is unrelated to PG migration; everything else is suspect.
- [ ] **Spot-check `system_events`** in jimbo_pg every couple of days for unusual patterns or event volume drops.
- [ ] **Watch dispatch flow** end-to-end at least once: a real dispatch from "proposed" → "completed" should leave matching rows in `dispatch_queue`, `note_activity`, and `costs`.
- [ ] **Watch grooming flow** end-to-end: a grooming submit should produce `grooming_audit` + `grooming_questions` rows atomically.
- [ ] **Validate search:** confirm `/api/search?q=…` returns reasonable results for both stemmed (`vault`) and trigram fallback (`vauld`).
- [ ] **Tag-fallback audit:** the final ETL reported `156 tag values used comma-split fallback`. Check whether that count matches expectations or whether new comma-string tags are accumulating (operator workflow may need adjustment so new writes use proper JSON arrays).

If 7 consecutive days pass clean: clear to start Phase D.

---

## 3. Phase D — sunset SQLite (after 7 clean days)

**Trigger date:** earliest 2026-05-03.

**Steps in order:**

1. **VPS-side cleanups:**
   - `mv /home/jimbo/jimbo-api/data/context.db /home/jimbo/jimbo-api/data/context.db.archived-YYYY-MM-DD` (only if §4 deferred-services decision is "retire all" — otherwise SQLite stays).
   - `rm /home/jimbo/jimbo-api/dist.pre-postgres-cutover` once rollback window closed.
   - Prune older snapshots: `context.db.bak-*`, `context.db.bak.pre-postgres-cutover`, `context.db.bak.cutover-final` — keep the cutover-final snapshot for at least a month.

2. **Dashboard cleanups (Phase A scaffolding deletions):**
   - Delete `dashboard/scripts/etl/sqlite-to-postgres.ts` and the related verify scripts under `dashboard/scripts/etl/`.
   - Delete `dashboard/api/routes/sync.ts` (the manual sync endpoint).
   - Delete `dashboard/src/app/shared/components/sync-button/` and its references.
   - Grep for `⚠️ TEMPORARY` and remove the wrapping comment markers + any code they justify.

3. **jimbo-api cleanups (only if §4 is "retire deferred"):**
   - Remove `src/db/index.ts`, `src/db/seed-context.ts`, `src/db/seed-vault.ts`.
   - Remove the `getDb()` init call in `src/index.ts`.
   - Remove `better-sqlite3` from `package.json`.

4. **Move this doc** to `docs/architecture/archive/post-phase-b-completed.md` once everything below is done or formally deferred.

---

## 4. Deferred services — port or retire?

11 services were intentionally left on SQLite (§7a coupling rule). They fall into three groups; each needs an explicit decision.

### Group A — interrogate (10 files, 0–low rows in production)

`services/interrogate-{contradictions,evidence,experiments,goals,interests,nogos,open-questions,priorities,proposals,sessions,staleness,tensions,values}.ts`

- These power the `/interrogate` skill (Marvin's personal interrogation slash command).
- Production tables are 0-row or low-row today.
- **Decision required:** keep interrogate alive (port to PG) or retire it (the skill itself becomes inert)?
  - Port: meaningful work — schemas not yet in `dashboard/db/schema/`, plus 10 services to translate. Roughly a wave's worth.
  - Retire: drop the routes, drop the SQLite tables. Skill stops working.

### Group B — health (services/health.ts, 1 write to health_snapshots)

- Powers `/api/health` snapshot endpoint used by the dashboard's status surface.
- **Decision required:** add `health_snapshots` to `dashboard/db/schema/`, generate migration, port the service. Small unit of work (~1–2 hours).

### Group C — fitness (services/fitness.ts, separate concern)

- Standalone fitness-records tracker.
- **Decision required:** if used → port (small, isolated). If not → retire route + drop table.

**Until decisions are made:** SQLite stays on disk so these services keep working. They're isolated; no cross-pollination with PG-backed services.

---

## 5. Schema tightening (post-cutover)

Items intentionally relaxed during the port that should be hardened once real production data populates.

- [ ] **`projects.owner_actor_id` → NOT NULL.** Currently nullable (migration 0003) because the dashboard's pre-cutover ETL synthesized projects from `project:slug` tags without owner info. Now that jimbo-api writes projects with an owner, run a migration: `UPDATE projects SET owner_actor_id = 'marvin' WHERE owner_actor_id IS NULL; ALTER TABLE projects ALTER COLUMN owner_actor_id SET NOT NULL;` Wait until at least 1 week of clean operation so any latent edge case surfaces.
- [ ] **Tag normalization.** 156 vault_notes have comma-string tags that the ETL parsed via fallback. Once on PG, the tag arrays are `text[]` proper — write a one-shot SQL to find any rows where `array_length(tags, 1) = 1 AND tags[1] LIKE '%,%'` and fix them in-place.
- [ ] **`search_index` triggers idempotency.** Sibling Claude installed triggers via `setup-pg.ts` on app startup; verify they survive a cold restart and a re-deploy without doubling up.
- [ ] **`pg_trgm.word_similarity_threshold` tuning.** Default 0.6 is too tight for short-query typo tolerance against multi-word titles. The search service is meant to set `SET LOCAL pg_trgm.word_similarity_threshold = 0.3` per query — verify this is in place by curling `/api/search?q=vauld` and confirming "vault" rows return.
- [ ] **CHECK constraint drift detection.** The handoff notes called this out: production added `running` to `dispatch_queue.status` mid-Phase-A. Same will happen again as new statuses appear. Write a short script that compares the snapshot DDL's CHECK clauses to the live PG CHECK clauses and reports drift — run nightly via cron.

---

## 6. Tech debt surfaced during porting

These are non-blocking items the agents flagged but didn't fix. Triage at leisure.

- **`recordCorrection` in services/grooming-corrections.ts has zero callers.** Dead code or planned future-use? Decide; remove or document.
- **`gcEvents` ported despite zero callers.** Parity for future cron — wire it up or remove.
- **`color_token` columns** on `actors` and `projects` are absent from the API contract (`src/schemas/{actors,projects}.ts`). Dashboard already encodes the values internally; if server-rendered surfaces (briefings) want consistent colors, expose them.
- **`projects.status` enum collapse.** PG CHECK allows `active|paused|archived`; wire contract is `active|archived`. `rowToProject` collapses `paused → active`. If `paused` ever gets written via direct PG, reads silently coerce. Either widen the wire schema or tighten the DB to two values.
- **`projects.updated_at` absent from response** even though the column exists and updates write `NOW()`. Add to wire schema if the dashboard needs it.
- **`note-thread` backfill TOCTOU.** Wrapped in `sql.begin()`; a unique partial index would harden it further. Add: `CREATE UNIQUE INDEX … ON note_thread (note_id) WHERE reply_to_id IS NULL` (or equivalent — confirm shape against the actual constraint we want).
- **`coach.logIntake` async-rejection latent bug** was fixed in the wave-2 port (caught a real defect). Worth noting for the changelog.
- **`bigserial id` columns** (pipeline_runs.id, briefing_analyses.id, system_events.id) are cast `id::int` at the wire boundary. Same overflow risk as the SQLite era. Promote to `string` in API contracts before counts cross 2^31.
- **VPS `jimbo.db`** at `/home/jimbo/jimbo-api/jimbo.db` (separate from `data/context.db`) — purpose unclear, possibly unused. Audit + delete if confirmed dead.

---

## 7. Cleanup checklist — by location

### `/home/jimbo/jimbo-api/` on VPS

- [ ] `dist.pre-postgres-cutover/` — rollback build, delete after 1 week clean
- [ ] `data/context.db` — keep until §4 decisions land
- [ ] `data/context.db.bak.cutover-final` — archival, keep ≥1 month
- [ ] `data/context.db.bak.pre-postgres-cutover` — archival, can prune sooner
- [ ] `data/context.db.bak.20260411-...` and earlier — old snapshots, can prune after Phase D
- [ ] `data/context.db-shm`, `context.db-wal` — only meaningful if SQLite still alive
- [ ] `jimbo.db` (root) — verify purpose, likely deletable

### `/Users/marvinbarretto/development/jimbo/dashboard/`

- [ ] `scripts/etl/sqlite-to-postgres.ts` — Phase D
- [ ] `api/routes/sync.ts` — Phase D
- [ ] `src/app/shared/components/sync-button/` — Phase D
- [ ] `.local/snapshots/context-*.db` — local snapshots, can prune
- [ ] `db/migrations/0002_brave_sway.sql` etc. — keep, history of schema evolution

### `/Users/marvinbarretto/development/jimbo/jimbo-api/`

- [ ] `src/db/index.ts` — Phase D, only if all deferred services retired
- [ ] `src/db/seed-context.ts`, `seed-vault.ts` — Phase D, only if all deferred services retired
- [ ] `src/index.ts`'s `getDb()` init call — Phase D
- [ ] `better-sqlite3` in `package.json` — Phase D

---

## 8. Rollback (if needed within 7-day watch)

Still possible. Steps:

1. `ssh vps 'sudo systemctl stop jimbo-api'`
2. `ssh vps 'mv /home/jimbo/jimbo-api/dist /home/jimbo/jimbo-api/dist.failed-postgres && mv /home/jimbo/jimbo-api/dist.pre-postgres-cutover /home/jimbo/jimbo-api/dist'`
3. `ssh vps 'sudo systemctl start jimbo-api'`
4. SQLite is unchanged; production resumes on the previous codebase.

After rollback: investigate, iterate, retry cutover. The `JIMBO_PG_URL` env var being present in `/opt/jimbo-api.env` doesn't cause harm if the running code doesn't read it.

---

## 9. Cross-references

- Archived plan: `docs/architecture/archive/phase-b-completed.md`
- Architecture overview: `docs/architecture/whiteboard.md`
- Schema snapshots: `docs/architecture/snapshots/`
- Current Drizzle schema: `db/schema/`
- Production env: `/opt/jimbo-api.env` on `vps-lon1`
- Cutover backup snapshot: `vps:/home/jimbo/jimbo-api/data/context.db.bak.cutover-final`
