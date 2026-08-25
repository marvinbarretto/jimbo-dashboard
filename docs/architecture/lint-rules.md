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

### VAULT-COMMANDS-001 — Components must not import data-access services at runtime

**ESLint rule:** `@typescript-eslint/no-restricted-imports` with `allowTypeImports: true`
**Severity:** error
**Scope:** all `.ts` files under `src/app/`, except the directory exemptions listed below.

**What it forbids.** Runtime imports of any module matching
`**/data-access/*.service` (e.g. `vault-items.service`, `dispatch.service`,
`thread.service`) from a file outside the allowed seam directories, minus the
named exceptions below.

**Services with nothing to funnel (named exceptions).** The pattern is
default-deny, so every *new* service is caught automatically. These four are
negated in the group because their whole surface is reads, or reads plus a
single self-contained preference write. There is no scattered-mutation risk
for the rule to prevent, and blocking them produced only ceremony:

| Service | Why it's exempt |
|---|---|
| `journal-data.service` | Read-only; two GETs into signals. |
| `watch-queue.service`  | Read-only by design — see the note in the file about why it never writes. |
| `agent-runs.service`   | Reads, plus `setRating` — one field, no cross-store composition. |
| `briefings.service`    | Reads, plus `rate` — same shape, and the service already owns its own in-flight/error state. |
| `journal-overview.service`   | Read-only; one GET into a shared signal. Exists so the metric rail and the day-shape chart share a single fetch — funnelling it would reinstate the duplicate request it removes. |
| `journal-day-stream.service` | Read-only; one GET into a shared signal, same reasoning — Overview reads it from two sections. |

**Adding a destructive method to any of these means deleting its line from
the group in `eslint.config.js`.** Keep the list short and justified. It is
deliberately preferred over the known-violations list below, because
exempting one service is far narrower than exempting a whole consumer file:
a pinned file may import *any* service freely, forever.

**What it allows.** Type-only imports — `import type { Foo } from '.../foo.service'` —
are explicitly permitted everywhere. They're erased at compile time so they
don't pull in the implementation at runtime, which is the architectural
distinction the rule cares about. We use `@typescript-eslint/no-restricted-imports`
(rather than the core ESLint rule) specifically for the `allowTypeImports`
option.

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

#### Read surface as a type-level upgrade (incremental, opt-in)

For consumers that legitimately only need reads, the codebase now ships
`VAULT_ITEMS_READ` — an `InjectionToken<VaultItemsRead>` defined in
`features/vault-items/data-access/vault-items.read.ts`. The token's
factory returns the same `VaultItemsService` singleton, narrowly typed as
`VaultItemsRead` (signals + getById/getBySeq, no mutations).

A consumer that switches from `inject(VaultItemsService)` to
`inject(VAULT_ITEMS_READ)` gets:
1. **Type-level enforcement** — the compiler refuses any mutation call on
   the narrowed type (stronger than ESLint, which is path-based).
2. **Lint-clean status** — the import path is `vault-items.read`, not
   `vault-items.service`, so VAULT-COMMANDS-001 doesn't fire. Files that
   were on the legacy exemptions list because they only read can come off
   the list once they switch.

Migration is incremental and opt-in. As more legacy violations adopt the
read surface, the eslint.config.js exemption list shrinks. The shape is
the canonical Angular DI idiom (`inject(TOKEN)`) — matches
`inject(DOCUMENT)`, `inject(MAT_DIALOG_DATA)` etc.

Shipped so far: `VAULT_ITEMS_READ`, `NUTRITION_READ`, `EXERCISE_READ`,
`PROJECTS_READ`, `INTERROGATE_ENTITY_READ`.

**When a read token is worth it — and when it isn't.** A read token costs a
file of interface, so it has to buy something. It buys real protection when
the underlying service can *destroy or corrupt* data: `ExerciseService` has
three deletes and three patches, `ProjectsService` has `remove`,
`InterrogateEntityService` has `update`/`addEvidence`. Narrowing means a leaf
component provably cannot reach those — enforcement the path-based lint rule
structurally cannot provide.

It buys nothing on a service that only reads. A token guarding against
mutations that don't exist is ceremony, and the honest fix for those is the
named-exception list above, not a wrapper. `NUTRITION_READ` is the edge case
worth keeping despite the service being read-only today: nutrition is slated
for the full manual POST/PATCH/DELETE surface the other log domains have, so
the narrowing is about to start earning its keep.

**Caveat — parameter widening isn't caught.** The token's
`factory: () => inject(FooService)` fails to typecheck if the service stops
satisfying the interface, so a *removed* or *retyped* method is caught. But
TypeScript compares method parameters bivariantly, so a service method that
accepts **more** options than the interface declares will not error at the
token — it surfaces later as a confusing failure at the call site.
`NUTRITION_READ.daily` was found understating the real signature exactly this
way. When you write one of these, copy the signature rather than reconstruct
it.

#### Known violations of VAULT-COMMANDS-001

These files exist from before the rule and are tracked for refactor. Each
is exempted by file path in `eslint.config.js`. As they get fixed, remove
them from BOTH this list AND the eslint config — the shrinking list is the
maturity ratchet.

| File | Owns the violation because… | Refactor plan |
|------|---|---|
| `shared/components/smart-composer-input/` | Reads actors / projects / vault-items for @-mention triggers | Move to read-only signal surface when services split |
| `features/mail/components/mail-dataset-card/mail-dataset-card.ts` | Reads aggregated jimbo-data straight | Parent passes enriched data via inputs |
| `features/questions/components/question-card/question-card.ts` | Reads actors + vault-items inline | Parent resolves and passes via inputs |
| `features/stream/cron-jobs.service.ts` | Lives at feature root, not in `data-access/` | Move under `data-access/` |
| `features/thread/components/message-composer/message-composer.ts` | Reads attachments service | Parent thread-page owns data |
| `features/thread/components/thread-view/thread-view.ts` | Reads thread + attachments | Parent thread-page owns data |
| `app.ts` | Bootstraps several services as side effect | Acceptable for app shell; revisit if/when services move to `APP_INITIALIZER` |
| `features/api-data/components/endpoint-panel/endpoint-panel.ts` | Injects JimboDataService at runtime to fetch its own payload | Lift fetch into parent container; pass payload via inputs |

#### Recently resolved (kept for the historical record)

- `features/mail-activity/mail-activity-page.ts` — moved into `containers/mail-activity-page/`
- `features/stream/stream-page/stream-page.ts` — moved into `containers/stream-page/`
- `features/api-data/data-pages.ts` — its only data-access import is type-only; now allowed under `allowTypeImports`
- `features/api-data/components/dataset-card/dataset-card.ts` — file no longer exists; stale entry removed
- `features/grooming/components/grooming-card/grooming-card.ts` — switched to `inject(VAULT_ITEMS_READ)` for the parent-seq lookup; thread coupling already migrated to `ThreadCommands` in an earlier commit
- `features/planner/components/watch-queue-panel/watch-queue-panel.ts` — kept on `WatchQueueService`; the service is read-only, so `watch-queue.service` was added to the named-exception list instead. A short-lived `WATCH_QUEUE_READ` token was tried first and reverted as ceremony.
- `features/exercise/components/exercise-{day,summary}-section`, `features/journal/components/{journal-code-sessions,journal-timeline,training-fuel}-section`, `features/picture/components/belief-card` — switched to `EXERCISE_READ` / `PROJECTS_READ` / `INTERROGATE_ENTITY_READ`; all three services carry destructive methods, so the narrowing is load-bearing
- `features/journal/components/journal-{agents,briefings}-section`, `journal-routine-fuel-section` (formerly `journal-day-summary`) — resolved by the named-exception list, no token needed

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
