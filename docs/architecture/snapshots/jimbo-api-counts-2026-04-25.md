# Row counts — 2026-04-25

Captured from `/home/jimbo/jimbo-api/data/context.db` on `vps-lon1`.

## Populated tables

| Table | Rows | Purpose |
|---|---:|---|
| note_activity | 4,402 | per-vault-item event log |
| costs | 3,063 | token usage per dispatch |
| system_events | 2,949 | jimbo-as-system events |
| vault_notes | 2,353 | the backlog |
| grooming_audit | 1,382 | every groom-state transition |
| dispatch_queue | 1,065 | execution queue |
| grooming_questions | 690 | open questions on items |
| thread_messages | 512 | conversation threads |
| activities | 383 | (purpose TBC — separate from note_activity) |
| settings | 39 | system settings k/v |
| grooming_proposals | 10 | AI-suggested groom moves |
| grooming_lessons | 8 | learned patterns |
| grooming_corrections | 5 | operator corrections |
| note_links | 5 | inter-item links |

## Empty / aspirational tables

These exist as shape but have no production data — relationships currently live as flat strings on `vault_notes`:

- `actors` (0)
- `projects` (0)
- `vault_item_projects` (0)
- `vault_item_dependencies` (0)
- `attachments` (0)
- `vault_candidates` (0)
- `note_thread` (0)

## Implications for migration

- ETL must handle ~12k rows of real data (vault_notes + the activity/event/cost trails)
- The relational refactor (assign vault_items to projects, normalize parent_id, populate actors) happens *during* migration — we synthesize the missing rows from existing flat data
