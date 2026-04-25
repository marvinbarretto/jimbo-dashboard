# Hermes Skill Alignment

> Cross-repo design note. Describes the hermes-side changes that pair with the dashboard's current domain shape.

## Context

The dashboard entity model has evolved in ways the existing hermes skills predate. This doc captures what needs to change on the hermes side to eliminate vocabulary drift and line up behaviour with the new design.

The hermes repo lives at `/Users/marvinbarretto/development/hub/hermes/` (Nous Research Hermes agent framework). Skills are at `hermes/skills/*/SKILL.md`.

**These are proposed changes, not done yet.** When a hermes pass happens, this is the brief.

## Principle being applied

**P1 — micro-skill decomposition.** Each skill does one thing. Currently `vault-analyse` does five (priority / confidence / actionability / tags / rationale / optional questions). Split.

## Changes

### 1. Split `vault-analyse` into two skills

**New: `intake-quality`**
- Single job: decide if a vault note's body is actionable.
- Input: `{note: {title, body}, project: {criteria?}}`
- Output: `{verdict: 'accept' | 'reject', actionability: 'clear' | 'needs-breakdown' | 'vague', questions: Array<{q, why}>}`
- Model tier: `budget` (Haiku-class). Lightweight classifier work.
- Dispatches on: `vault_item_created` auto-trigger (when we wire that).
- Failure path: `verdict='reject'` → questions post as ThreadMessages with `kind='question'`; note moves to `intake_rejected`.
- Success path: `verdict='accept'` → note moves to `intake_complete`. Next skill queued.

**New: `vault-classify`** (replaces most of `vault-analyse`)
- Runs ONLY on intake-complete notes.
- Input: `{note, project_snapshot}`
- Output: `{ai_priority, priority_confidence, ai_rationale, tags}` — no actionability (set by intake-quality), no questions (handled by intake-quality), no required_skills (killed — see below).
- Model tier: `standard` (Sonnet-class). Priority judgment earns the better model.
- Moves note to `classified` status on completion.

**Existing: `vault-decompose`** (unchanged in behaviour; vocabulary updated)
- Still breaks classified notes into subtasks.
- Moves note to `decomposed` status (was `decomposition_proposed` — rename for consistency).

### 2. Vocabulary alignment — `grooming_status`

| Old hermes value | New value | Meaning |
|---|---|---|
| `ungroomed` | `ungroomed` | unchanged — freshly created |
| *(new)* | `intake_rejected` | intake-quality produced questions; blocked until resolved |
| *(new)* | `intake_complete` | intake-quality accepted; ready for classify |
| `analysis_complete` | `classified` | vault-classify done; ready for decompose |
| `decomposition_proposed` | `decomposed` | vault-decompose done; ready for marvin review |
| `ready` | `ready` | unchanged |
| `questions_pending` | *(removed)* | no longer a first-class state — open questions are orthogonal blockers via ThreadMessage |

**Why remove `questions_pending`?** Questions are now ThreadMessages with `kind='question'`. Having an open question is the blocker, regardless of where the note is in the pipeline. A `classified` note can still have open questions from intake-quality. The dashboard's `computeReadiness()` reads messages and surfaces an `open_questions` check independently of `grooming_status`.

Migration: existing rows in `questions_pending` map to `intake_rejected` if the questions came from intake; otherwise stay in whatever stable state they were at plus keep the open-question rows.

### 3. `required_skills` removed

Hermes no longer populates `required_skills` on vault notes. `vault-classify` output drops the field.

Rationale: it was a role hint (`code | research | write`), not a routable skill. Dispatch already routes on `dispatch.skill` (e.g. `code/pr-from-issue`), so the field was informational only. Keeping it adds noise with no consumer.

If the operator needs role context, it lives in prose on `ai_rationale` ("this is a code task that will need refactoring the LocalShout event list component").

### 4. Questions as ThreadMessages

**Old behaviour:** `grooming-submit-analysis` API creates rows in a questions table on the note; dashboard presumably reads them from a separate endpoint.

**New behaviour:** `intake-quality` posts each question as a `ThreadMessage` with:

```json
{
  "vault_item_id": "<note_id>",
  "author_actor_id": "<whichever agent ran the skill>",
  "kind": "question",
  "body": "**{{question}}**\n\n_Why: {{rationale}}_",
  "in_reply_to": null,
  "answered_by": null
}
```

Each post also writes a paired `thread_message_posted` activity event (existing bridge).

**When marvin answers:** marvin posts a ThreadMessage with `kind='answer'` and `in_reply_to = <question_id>`. The API sets `question.answered_by = <answer_id>` in the same transaction.

**Dashboard readiness then computes:** if any open questions exist (`kind='question' AND answered_by IS NULL`), the `open_questions` check fails regardless of grooming_status.

### 5. Priority as integer

**Already integer** on the hermes side (`ai_priority: 2`). Dashboard was using string (`'P2'`); now aligned to integer. No hermes change needed — just noting the dashboard caught up.

### 6. Fields hermes must populate that were missing from dashboard

These existed in hermes output but weren't on the dashboard's `VaultItem` type until now. No hermes-side change; dashboard now stores them:

- `ai_rationale: string | null`
- `priority_confidence: number | null`
- `actionability: 'clear' | 'needs-breakdown' | 'vague' | null` (split: intake-quality sets this, not vault-classify)

## API endpoint changes (jimbo-api side)

These are hermes-adjacent but technically jimbo-api:

- **`grooming-submit-analysis` → `grooming-submit-intake`** — renamed to match the new intake-quality skill. Payload: `{verdict, actionability, questions}`. Atomically: writes actionability on note, creates thread messages from questions (with paired activity events), transitions status (intake_complete OR intake_rejected), closes dispatch.
- **`grooming-submit-analysis` → `grooming-submit-classification`** (new endpoint for vault-classify) — payload: `{ai_priority, priority_confidence, ai_rationale, tags}`. Transitions to `classified`.
- **`grooming-submit-decomposition`** — unchanged payload; transitions to `decomposed` (was `decomposition_proposed`).

All three are atomic: mutate note + write activity event + close dispatch in one transaction.

## Migration ordering

Safe order for rollout:

1. Dashboard ships new types + feature updates (done).
2. Jimbo-api ships new endpoints + keeps old ones for grace period.
3. Write new hermes skills (`intake-quality`, `vault-classify`); retire `vault-analyse`.
4. Backfill existing notes: `analysis_complete → classified`, `decomposition_proposed → decomposed`. Existing `questions_pending` notes map to `intake_rejected` if they have open questions; otherwise to whichever stable state they should be.
5. Drop old endpoints + old skill.

## Out of scope here

- Backend `skill_invocations` table shape — dashboard already has `DispatchQueueEntry` mirroring it.
- `auto_triggers` field on skills — deferred until the first skill actually needs auto-triggering (intake-quality is the first; flag when it lands).
- Cost tracking per dispatch — whiteboard row 23, deferred.

## Source of truth

`src/app/domain/vault/vault-item.ts` and `src/app/domain/dispatch/dispatch-queue-entry.ts` are the dashboard's authoritative shapes. When hermes and jimbo-api ship these changes, their schemas should match byte-for-byte.

## Tracking

Cross-repo work is tracked as GitHub issues. The hermes skill files are already drafted locally (not yet deployed) so the design is concrete:

**jimbo-api repo:**
- [#9 — `grooming-submit-intake` endpoint](https://github.com/marvinbarretto/jimbo-api/issues/9)
- [#10 — `grooming-submit-classification` endpoint](https://github.com/marvinbarretto/jimbo-api/issues/10)
- [#11 — schema migration (enum rename + drop required_skills + new columns)](https://github.com/marvinbarretto/jimbo-api/issues/11)
- [#12 — expose endpoints for new dashboard entities](https://github.com/marvinbarretto/jimbo-api/issues/12)

**hub (hermes) repo:**
- [#6 — update pipeline-pump to enqueue new split skills](https://github.com/marvinbarretto/hub/issues/6)
- [#7 — retire `vault-analyse` after split proven in production](https://github.com/marvinbarretto/hub/issues/7)
- [#8 — document auto-trigger convention](https://github.com/marvinbarretto/hub/issues/8)

**Hermes files drafted locally** (ready to deploy once dependencies land):
- `hermes/skills/dispatch/intake-quality/SKILL.md`
- `hermes/skills/dispatch/vault-classify/SKILL.md`
- `hermes/skills/dispatch/vault-analyse/DEPRECATED.md`

## Rollout order

1. jimbo-api #11 (schema migration) — add new columns, keep old ones for grace period
2. jimbo-api #9 + #10 (new endpoints) — both needed before hermes skills can submit
3. hub #6 (pipeline-pump update) — start enqueueing new skills
4. Deploy hermes via `hermes-push.sh` — skills activate
5. Monitor — verify new skills produce expected state transitions
6. jimbo-api #12 (remaining endpoints) — populate the other feature surfaces
7. hub #7 (retire `vault-analyse`) — only after new skills have run reliably for ~2 weeks
