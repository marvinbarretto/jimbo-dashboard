# Dashboard Backlog

Focus: data model buildout. UI/a11y deferred until the layer is complete.

Legend: ✅ done · 🟡 partial · ⬜ not started · — not applicable

## Status matrix

| Entity          | Schema | Service | UI (CRUD) | E2E  | Notes |
|-----------------|:------:|:-------:|:---------:|:----:|-------|
| models          | ✅     | ✅      | ✅        | ✅   | id pattern validation in |
| model_stacks    | ✅     | ✅      | ✅        | ✅   | model_ids is TEXT[] — junction debt below |
| skills          | ✅     | ✅      | ✅        | ✅   | |
| prompts         | ⬜     | ⬜      | ⬜        | ⬜   | versioned; skills reference prompt_id |
| prompt_versions | ⬜     | ⬜      | —         | ⬜   | immutable; current_version_id pointer on prompts |
| stack_models    | ⬜     | ⬜      | —         | ⬜   | junction replacing model_stacks.model_ids TEXT[] |
| tools           | ⬜     | ⬜      | ⬜        | ⬜   | named capabilities (Gmail, Telegram, web, …) |
| skill_tools     | ⬜     | ⬜      | —         | ⬜   | many-to-many junction |
| benchmarks      | ⬜     | ⬜      | ⬜        | ⬜   | test cases + runs + results; sits on top of all atoms |

## Build sequence

### 1 · Prompts (next)
Two-table design:
- `prompts (id, display_name, description, current_version_id, is_active, created_at, updated_at)`
- `prompt_versions (id, prompt_id, version, content, notes, input_schema jsonb, output_schema jsonb, created_at)`
- `skills.prompt_id FK` → prompts
- `current_version_id` is an explicit pointer — allows rolling back v6 if v7 regresses
- Versions are immutable once written

### 2 · stack_models junction
- Replace `model_stacks.model_ids TEXT[]` with `stack_models (stack_id, model_id, position)`
- Real FKs, real referential integrity, real delete behaviour
- Migrate existing data before dropping the column

### 3 · Tools + skill_tools
- `tools (id, display_name, description, kind, config_schema jsonb, config jsonb, is_active, created_at, updated_at)`
- `skill_tools (skill_id, tool_id)` junction
- Credentials separate table for hygiene
- Versioning less critical than prompts — config changes can overwrite

### 4 · Benchmarks
- `benchmark_suites (id, display_name, description, skill_id)`
- `benchmark_cases (id, suite_id, input jsonb, criteria jsonb)`
- `benchmark_runs (id, case_id, prompt_version_id, model_id, tool_ids, output jsonb, cost, latency_ms, verdict, created_at)`
- Sits on top of all the atoms above — build last

## Deferred

- UI polish, sort/filter, search — after data model is complete
- A11y audit — personal tool, not a priority
- Deployment pipeline
- Coverage CI

## Known schema debt

- `model_stacks.model_ids TEXT[]` — ordinal encoded in array position, no FK, blocks clean delete cascade → fixed by stack_models junction above
- Credentials not yet modelled — tools will need somewhere to store auth config securely
