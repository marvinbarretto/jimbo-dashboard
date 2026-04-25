# Production schema snapshots

Frozen-in-time captures of the live `jimbo-api` SQLite schema and table counts. Used as the reference point for the Postgres redesign — we want to be informed by reality, not bound by it.

## 2026-04-25

Source: `/home/jimbo/jimbo-api/data/context.db` on `vps-lon1` (48 MB).

Files:
- `jimbo-api-schema-2026-04-25.sql` — full `.schema` dump (750 lines, 55 tables)
- `jimbo-api-counts-2026-04-25.md` — row counts for principal tables

### Notes

- Despite the filename `context.db`, this is the canonical operational database for the entire jimbo-api. The name is historical.
- The vault data lives in `vault_notes` (single table, 40+ columns accreted via `ALTER TABLE`).
- The relational tables we modeled in `@domain` (`actors`, `projects`, `vault_item_projects`, `vault_item_dependencies`, `attachments`) exist as empty shapes — production currently uses flat string fields on `vault_notes` (`assigned_to`, `parent_id`).
- `costs` (3,063 rows) tracks token usage per dispatch — already implemented end-to-end.
- A separate Postgres on the same VPS holds `skills`, `tools`, `prompts`, `models`, `model_stacks` (the LLM-orchestration layer). Not in this snapshot.
