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

## Domain layer followups

### Centralise pipeline phase classification

The grooming board and execution board each define their own "which items belong to me" filter inline. There's no shared domain function answering "given a vault item and its dispatches, where in the macro-pipeline does it live (grooming / execution / done)?" — so consumers like `computeNextAction` can't reason about it.

Today this surfaces as the operator seeing `WAITING ON · your approval` on an item that the kanban put in the execution board because grooming is technically still not `ready`. The next-action label is now accurate per grooming state (see `domain/vault/next-action.ts`) but the macro split is still inferred ad hoc by each board.

What to build:

- `domain/vault/pipeline-phase.ts` — pure `pipelinePhase(item, dispatches): 'grooming' | 'execution' | 'done' | 'archived'`
- One mapping of "which grooming state belongs to which actor role" (intake-quality / vault-classify / vault-decompose / operator). Used by next-action and any future "queue depth per actor" reporting.
- Refactor `execution-board.ts` `manualItems` and the grooming board's filter to consume the new function so the kanbans and the next-action line agree.

Why deferred: step 1 (per-state phrasing in next-action) covered 90% of the operator-facing pain. The centralisation pays off across more surfaces but isn't blocking anything today.

### Fold UiChecklist's inline text editing into UiInlineEdit

`UiInlineEdit` (`shared/components/ui-inline-edit`) now covers text/textarea/select/number
click-to-edit with autofocus, select-all, Enter-commit, Esc-cancel, blur-commit, and
cancel-on-external-swap. `UiChecklist` (`shared/components/ui-checklist`) predates that
consolidation and rolls its own version of the same behaviour (`startEdit`/`draft`/
`onDraftKey`/`commitEdit`/`cancelEdit` + the cancel-on-swap `effect`, ~50 lines).

What to build:

- Replace the checklist row's bespoke text `<input>` + edit-state machine with an embedded
  `<app-ui-inline-edit kind="text">`, mapping its `(saved)` to the existing `edited`/`removed`
  (empty → remove) semantics.
- Keep the checkbox, status chip, append-input, and index-keyed event contract unchanged.
- Verify both existing consumers still behave: `vault-item-delivery-block` and the
  `vault-detail-primitives` lab section.

Why deferred: surfaced while building `NutritionRow` (which already uses `UiInlineEdit`).
Pure cleanup — no behaviour change for users — and it touches a component with live
consumers, so it shouldn't ride along with the nutrition feature work.
