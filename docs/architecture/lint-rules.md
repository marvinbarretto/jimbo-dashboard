# Lint rules — architectural enforcement

This is the index of every architectural rule the codebase enforces via
ESLint. The companion config is `eslint.config.js` at the repo root; the
runner is `npm run lint`.

## Why have this document at all

ESLint config files explain *what* a rule does. They don't explain *why* it
exists, *what convinced us to enforce it*, or *what the planned tightening
path is*. Those answers are durable knowledge — they outlast any one
person's recollection — and they belong here.

When a rule fires unexpectedly during code review, the violation message
points at this doc by rule ID. A future maintainer (or future-you) can read
one entry and understand the whole story without spelunking git history.

## How to add a new rule

1. **Pick a rule ID** following the pattern `<DOMAIN>-<TOPIC>-<NNN>` —
   e.g. `VAULT-COMMANDS-001`, `THREAD-LAYERING-002`. Three-digit suffix so
   they sort and stay distinct as the file grows.
2. **Write the entry below** before touching ESLint config. The entry is
   the spec; the config is the implementation. Both must exist.
3. **Add the rule to `eslint.config.js`** with a comment block referencing
   the rule ID. Mirror the rule ID in the lint error message so violators
   can find the doc entry instantly.
4. **Run `npm run lint`** against the whole codebase. Decide what to do
   with existing violations — fix or pin as known violations under
   "Known violations of <RULE-ID>". Never silently widen the scope.
5. **Wire to CI** when the rule is stable. Until then, running locally is
   the gate.

Rules can also be **retired** — when an enforcement is no longer needed
(e.g. the architecture changes), move the entry to "Retired rules" at the
bottom of this doc with a one-line reason. Don't delete; the historical
context is what makes the doc valuable.

## Active rules

### VAULT-COMMANDS-001 — Components must not import data-access services

**ESLint rule:** `no-restricted-imports`
**Severity:** error
**Scope:** all `.ts` files under `src/app/`, except the directory exemptions listed below.

**What it forbids.** Importing any module matching
`**/data-access/*.service` (e.g. `vault-items.service`, `dispatch.service`,
`thread.service`) from a file outside the allowed seam directories.

**Why.** Vault item lifecycle logic is a funnel. When mutation calls (`archive`,
`setGroomingStatus`, `setCompleted`, `rejectItem`) live in scattered UI
callers, each caller invents its own composition of patch + audit event +
side-effect — drift is inevitable. The screenshot of dispatches failing
with `expected ungroomed, got intake_rejected` was the symptom: items
arrived in `ready` state without satisfying readiness preconditions because
no single layer enforced the gate.

The fix is the *application service / command layer* in
`features/*/commands/*-commands.ts`. Each command:

- validates preconditions (transitions allowlist, readiness, etc.)
- composes ALL the writes (entity + activity event + thread + UI close)
- owns the rollback / toast policy

This rule mechanically prevents callers from going around the command layer.

**Allowed seam directories.** These are exempt because they own the
legitimate path to the data layer:

| Directory               | Why                                                          |
|-------------------------|--------------------------------------------------------------|
| `**/commands/**`        | The application-service layer — the whole point.             |
| `**/data-access/**`     | Services compose with each other.                            |
| `**/containers/**`      | Board components legitimately need read-only signal access.  |
| `**/dialog/**`          | Dialog stores reach into multiple services for read-only views. |
| `**/*.spec.ts`, `**/*.test.ts` | Specs exercise services directly by design.           |

**Caveat — path-level enforcement, not method-level.** The rule bans the
*import*, not the call. So a `containers/` board file can still write to
`vaultItemsService.archive()` and the rule won't catch it. Code review +
the convention in `docs/conventions.md` covers that case for now.

The planned tightening: split each service into a read-only signal surface
(public) and a mutation surface (commands-only). When that lands, the rule
will block the mutation surface entirely outside `commands/` and
`data-access/`, with no exemption for `containers/` or `dialog/`. Tracked
in `phase-b-followups.md`.

#### Known violations of VAULT-COMMANDS-001

These files exist from before the rule and are tracked for refactor. Each
is exempted by file path in `eslint.config.js`. As they get fixed, remove
them from BOTH this list AND the eslint config — the shrinking list is the
maturity ratchet.

| File | Owns the violation because… | Refactor plan |
|------|---|---|
| `shared/components/smart-composer-input/` | Reads actors / projects / vault-items for @-mention triggers | Move to read-only signal surface when services split |
| `features/grooming/components/grooming-card/grooming-card.ts` | Reads thread + vault-items for live snapshot | Lift reads into the parent container; pass via `card-context` |
| `features/mail-activity/mail-activity-page.ts` | Container colocated with components; no `containers/` folder | Move under `containers/` subfolder |
| `features/mail/components/mail-dataset-card/mail-dataset-card.ts` | Reads aggregated jimbo-data straight | Parent passes enriched data via inputs |
| `features/questions/components/question-card/question-card.ts` | Reads actors + vault-items inline | Parent resolves and passes via inputs |
| `features/stream/cron-jobs.service.ts` | Lives at feature root, not in `data-access/` | Move under `data-access/` |
| `features/stream/stream-page/stream-page.ts` | Container without `containers/` folder | Same as `mail-activity-page` |
| `features/thread/components/message-composer/message-composer.ts` | Reads attachments service | Parent thread-page owns data |
| `features/thread/components/thread-view/thread-view.ts` | Reads thread + attachments | Parent thread-page owns data |
| `app.ts` | Bootstraps several services as side effect | Acceptable for app shell; revisit if/when services move to `APP_INITIALIZER` |
| `features/api-data/data-pages.ts` | Container without `containers/` folder | Same as `mail-activity-page` |
| `features/api-data/components/dataset-card/dataset-card.ts` | Reads aggregated data | Parent passes via inputs |
| `features/api-data/components/endpoint-panel/endpoint-panel.ts` | Reads aggregated data | Parent passes via inputs |

### THREAD-COMMANDS-002 — Thread mutations go through ThreadCommands

**ESLint rule:** Same shared `no-restricted-imports` pattern as VAULT-COMMANDS-001 — `**/data-access/*.service` is blocked outside the allowed seam directories. THREAD-COMMANDS-002 isn't a separate ESLint configuration; it's the architectural rule that explains *why* thread.service is in the blocked list.
**Severity:** error (inherited)
**Scope:** all `.ts` files outside the seam directories (commands/, data-access/, containers/, dialog/, tests).

**What it forbids.** Components, pages, and shared primitives must not import `thread.service` directly. Mutations route through `ThreadCommands` (`features/thread/commands/`).

**Why.** Posting a thread message can affect more than one store: an "answer" message updates the thread's local `answered_by` chain AND should mark the question off in the global questions index (which lives on a different service entirely). When that compound logic is duplicated across callers — `questions-page` had it inline, hand-rolled — drift is inevitable. The command layer absorbs the cross-store update so callers express intent ("answer this question") rather than mechanics.

**Commands:**
- `post(payload)` — pass-through to `ThreadService.post`. Use for comments, questions, corrections, and answers that don't need to update the questions index.
- `answerQuestion(payload)` — compound: post the answer message AND mark the parent question resolved in the questions index. Throws synchronously on payloads that aren't properly-formed answers (kind must be 'answer', `in_reply_to` must be set).

#### Known violations of THREAD-COMMANDS-002

Currently inherits VAULT-COMMANDS-001's exemption list. Two of those entries (`message-composer.ts`, `thread-view.ts`) import thread.service directly for reads; once the read/write surface split lands, the `containers/`/`dialog/` exemption disappears for write paths and these legacy entries become refactor candidates.

## Retired rules

_(none yet)_
