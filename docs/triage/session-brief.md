# Triage — fresh session starter brief

Paste this as your first message in a new `claude` session to onboard the model with everything we've already settled, so we can pick up at the next concrete build step without re-deriving.

---

## Goal

Build a daily ritual where I clear my Google Tasks inbox by either discarding each item or promoting it to a vault item. The triage step is **pre-grooming**: a hands-on human pass that adds *just enough* structure to let the existing automated grooming pipeline run cleanly afterwards. I am happy to be heavily involved at MVP. The system should learn from each pass so it can eventually do most of this itself.

Vault item types are: **`task` | `note` | `idea`** (with `bookmark` as a category on a note, not a separate type).

## What already exists — do NOT rebuild

**Dashboard (`~/development/jimbo/dashboard`)**
- `/triage-tasks` page — modal-based UI shell. Tap a row → opens a 50/50 modal (Jimbo's view | Your view) with sticky `Skip / Discard / Promote to Vault Item` actions. On <760px collapses to two tabs. **Action handlers are stub-only — they `console.log` and close.** Files: `src/app/features/triage-tasks/`.
- `/google-tasks-settings` — toggle which Google Task lists are read by everything downstream.

**jimbo-api (`~/development/jimbo/jimbo-api`)**
- `GET /api/google-tasks/inbox` — flat list of tasks across enabled lists, each enriched with `{ listId, listTitle }`. Single-call shape used by the triage page. Source: `src/routes/google-tasks.ts`.
- Full **grooming pipeline** at `/api/grooming/*`. Stages: `intake-quality` → `vault-classify` → `vault-decompose` → `vault-analyse`. Each stage is run by an actor (Boris is the default executor) that polls the dispatch queue. Source: `src/routes/grooming.ts`, `src/services/grooming-submit.ts`, schemas in `src/schemas/grooming.ts`.
- `GET /api/snapshot/` — composite snapshot of active projects + priorities + goals + task summary. Source: `src/services/interrogate-snapshot.ts → buildSnapshot()`. This is the context object the grooming actors already see.
- `/api/skills` — filesystem registry of all Claude Code skills. Source: `src/services/skills.ts`.

**Hermes skills (`~/development/hub/hermes/skills/dispatch/`)**
- `intake-quality/SKILL.md` — actionability verdict + clarifying questions
- `vault-classify/SKILL.md` — type/category/priority/tags/rationale + `suggested_agent_type`
- `vault-decompose/SKILL.md` — break complex into subtasks
- `vault-analyse/SKILL.md` — final analysis pass
- These skills are run by Boris/Ralph as Claude Code agents polling `jimbo-api dispatch-next <executor>`.

## Decisions locked in (don't re-litigate)

1. **Pre-grooming framing.** Triage is the human-in-the-loop step that prepares loose Google Tasks for the unattended grooming pipeline. Triage's job is *minimum enrichment to prevent grooming errors*, not duplicating grooming.
2. **Vault types**: `task | note | idea` (3-way). `bookmark` is a category on `note`, not a top-level type. (Existing grooming enum is `task | note | bookmark` — adding `idea` is a small migration when we get there.)
3. **Two-pane modal UI** is the right shape: left pane = Jimbo's view (proposals/recall/thinking), right pane = your view (context box + override). On mobile: tabs. Already shipped as a UI shell.
4. **Build a real Hermes skill, not a throwaway probe.** Observe by running a second `claude` shell as Boris/Ralph picking up real dispatches.
5. **Log-before-AI.** When we add the log table (`task_triage_log`), it must precede any AI proposer in the loop — otherwise every "user decision" in the corpus is downstream of an AI suggestion, and the corpus loses ground-truth value.

## Explicitly deferred (not now)

- `task_triage_log` table + capture endpoints
- Wiring the modal action handlers to real endpoints (Discard → `DELETE /api/google-tasks/tasks`, Promote → `POST /api/google-tasks/commit`, Skip → in-memory hide)
- URL enrichment as a separate primitive
- Recall (vector search over past decisions)
- Autonomous loop / cron / auto-discard for high-confidence junk

## First task in this new session

Draft a loose first version of a new Hermes skill that bridges Google Tasks → grooming pipeline:

**Path**: `~/development/hub/hermes/skills/dispatch/triage-pre-grooming/SKILL.md` (new directory + file)

**What it should do** (loose first draft — we'll iterate):
- Take a Google Task title + notes + optional user-context as input
- Read the snapshot for active project/priority awareness
- Produce structured output that the grooming pipeline can run on cleanly: suggested `type`, suggested `category`, suggested `priority`, suggested `tags`, clarifying questions if context is missing, `suggested_agent_type` if the task implies a downstream skill
- Optionally suggest a parent project from the snapshot

**Model after**: `intake-quality/SKILL.md` and `vault-classify/SKILL.md` — they have the right shape (poll/start/read/produce/submit), just narrower scopes than what we want here.

**Don't worry about**: the new submit endpoint on jimbo-api side. Drafting the skill first lets us see what shape its output should be, *then* we wire the API endpoint to receive it.

**How we'll observe it**: run a second `claude` shell, set it up as Boris (or use the existing one), have it poll `jimbo-api dispatch-next boris` and execute the skill against a real Google Task. Compare outputs across models by changing the actor's model assignment.

## Useful files to read first

- `~/development/hub/hermes/skills/dispatch/intake-quality/SKILL.md` — the closest existing pattern
- `~/development/hub/hermes/skills/dispatch/vault-classify/SKILL.md` — the next stage's pattern
- `~/development/jimbo/jimbo-api/src/schemas/grooming.ts` — what shape submissions take today
- `~/development/jimbo/dashboard/src/app/features/triage-tasks/triage-tasks-page.html` — the UI we're feeding from
- `~/development/jimbo/jimbo-api/src/routes/google-tasks.ts` (search `/inbox`) — the data source

## One throwaway artifact

`~/development/jimbo/jimbo-api/scripts/triage-probe.ts` exists as a hand-rolled simulation that hits OpenRouter with prompts mirroring `intake-quality` + `vault-classify`. Kept as a backup / quick offline experiment. **Not the path forward** — real skills in Hermes is.
