# Whiteboard · Concept tracker

> A single list of every idea we've seriously discussed, whether it's built, active, or deliberately parked. Nothing gets forgotten; most things get deferred.
>
> The rule: each concept must answer **why is this deferred** and **when should we revisit**. "When" is a trigger, not a date — e.g. *"when we have > 20 skills"*, not *"in Q3"*.

## Status legend

- **built** — committed to code, working
- **active** — being worked on this session
- **defer** — valuable, not MVP, parked intentionally
- **maybe** — might never happen
- **killed** — decided against, recorded so we don't re-litigate

## Core pipeline — the MVP

Minimum to ship "vault items move through a pipeline of actors via micro-tasks":

| # | Concept | Status | What it is | Notes |
|---|---|---|---|---|
| 1 | `Actor` | **built** | Who or what can act (marvin, ralph, boris, jimbo) | `domain/actors/actor.ts` |
| 2 | `ActorSkill` junction | **built** | Which skills each actor is trusted with | `domain/actors/actor-skill.ts`. Uses aspirational skill slugs — reconcile when skills become real |
| 3 | `VaultItem` | **built** | The thing being passed around the pipeline | `domain/vault/vault-item.ts`. 21 fields after adding `due_at`, `completed_at`, `source`, `ai_rationale`, `priority_confidence`, `actionability`. Priority is integer; GroomingStatus aligned to hermes. Features built Pass A (read-only) + Pass B (mutations) at `features/vault-items/` |
| 4 | `ActivityEvent` | **built** | Append-only log of what happened and who did it | `domain/activity/activity-event.ts`. Discriminated union, 4 event types at MVP |
| 4a | `Readiness` projection | **built** | Computed "is this ready to dispatch?" — 5 checks over VaultItem fields | `domain/vault/readiness.ts`. Pure function, never stored |

## Deferred — bigger ideas, explicitly parked

| # | Concept | Status | One-liner | Deferred because | Revisit when |
|---|---|---|---|---|---|
| 5 | `Skill` as first-class entity | **built** | Named dispatchable capability — prompt_id, model_hint (4-tier, reuses existing `ModelTier`), input/output schemas (cached from repo), `source_repo: ProjectId` FK, `last_indexed_at` for cache freshness. Slug format `{project-id}/{skill-name}` always prefixed | `domain/skills/skill.ts` + `skill-tool.ts` junction. Legacy `features/skills/utils/skill.types.ts` coexists; migrates when Skill feature is implemented end-to-end |
| 6 | Skill proficiency tiers (`preferred / capable / experimental`) | defer | Routing weight on `actor_skills` | Not used until a router exists | When operator-curated routing creates real friction |
| 7 | Routing engine / dispatcher service | defer | The thing that picks actor for a skill | Humans and jimbo do this by hand fine | When > 3 routing decisions happen per hour |
| 8 | Benchmark suite + runs | defer | Periodic (model × skill) probe runs with ground truth | Operator picks models by hand for now; skills don't yet have probes | When skill catalogue > 10 and model drift is actually a problem |
| 9 | Automated re-benchmark cadence | defer | Weekly-ish scheduler with cost cap + auto-abort | No benchmarks to automate yet | After one manual bake-off proves the value |
| 10 | `BenchmarkRun` history + trend analysis | defer | Time-series of (skill, model, score, cost) | Needs benchmarks first | With benchmarks |
| 11 | `model_skills` — benchmark-derived routing table | defer | Which model is the current champion for each skill | Needs benchmarks; would replace hand-picked model selection | With benchmarks, when picking models by hand is repetitive |
| 12 | Thread / `ThreadMessage` on vault items | **built** | Conversation distinct from activity log. Three kinds (`comment \| question \| answer`); questions with no answer block readiness via new `open_questions` check. Every post emits a paired `thread_message_posted` activity event | `domain/thread/thread-message.ts`. Replaced the old `NoteAddedEvent` in `ActivityEvent`. Readiness now takes `messages: ThreadMessage[]` as a second argument |
| 13 | Grooming state machine | defer | The readiness workflow (reservoir → analysis → questions → proposed → ready) | Pipeline works with a simple `status` field first | After we've felt the pain of ad-hoc status values |
| 14 | Dispatch queue + runs | **built** | `DispatchQueueEntry` mirrors existing hermes/jimbo-api `dispatch_queue` shape. Dashboard reads to show active dispatches on vault-item detail; hermes's `pipeline-pump` owns enqueueing | `domain/dispatch/dispatch-queue-entry.ts`. Feature-side service deferred to next pass |
| 15 | Epic / parent hierarchy on vault items | defer | `parent_id`, `is_epic`, sub-ticket spawning | Items can live flat for MVP | When an actual epic has > 3 children |
| 15a | `VaultItemDependency` — blocking junction | **built** | `blocker_id → blocked_id` FK pair. Readiness gains conditional `unresolved_blockers` check. One kind (`blocks`) at MVP. Feature wired in VaultItem Pass B (add/remove blockers in detail view) | `domain/vault/vault-item-dependency.ts` + `features/vault-items/data-access/vault-item-dependencies.service.ts` |
| 15b | `Attachment` — binary content on messages | **built** | Images/files attached to ThreadMessages. Service + drop-zone composer + inline rendering landed. Dev-only blob-URL fallback when jimbo-api endpoint 404s | `domain/attachments/attachment.ts` + `features/thread/data-access/attachments.service.ts` |
| 15c | Due dates + completion timestamps | **built** | `due_at`, `completed_at` on VaultItem. Completion redundant with `status='done'` but enables cheap "what did we finish this week?" queries | `domain/vault/vault-item.ts` |
| 15d | Source origin field on VaultItem | **built** | `source: { kind: email\|telegram\|manual\|agent\|url\|pr-comment, ref, url? } \| null`. Designed in now while types cheap; email intake (row 21) will populate | `domain/vault/vault-item.ts` |
| 16 | Priority engine (AI + manual + effective) | defer | Derived `effective_priority` from AI and manual inputs | Items can carry a single `priority` int or none at all | When operator has > 50 open items and needs a sort key |
| 17 | `Project` context | **built** | Long-lived project with criteria + repo_url + owner. Holds domain rules (e.g. "what qualifies as a LocalShout event") so agents can reference them. Status `active \| archived`; owned by an `ActorId` (supports jimbo-spawned prototypes) | `domain/projects/project.ts`. Many-to-many with VaultItem via `vault-item-project.ts` junction — cross-project work is a real case |
| 18 | Priority / Goal / Interest (context knowledge) | defer | Structured context data steering agents | No agent reads this yet | When agents start referencing it in prompts |
| 19 | Today briefing synthesis | defer | Cross-domain projection for the home screen | Static view is fine to start | When the home screen exists |
| 20 | Board / Stream / Search views | defer | Projections of vault items + events | One list view is enough for MVP | When navigating > 100 items becomes painful |
| 21 | Email intake (`email_reports`) | defer | Gmail → vault item conversion | Hermes handles this; dashboard only views | When dashboard needs to decide on intake |
| 22 | Health snapshots | defer | Operational telemetry store | System isn't operational enough to need it | When something goes wrong silently |
| 23 | Cost tracking per event | defer | Per-run LLM spend | Not critical until cost discipline matters | When a weekly bake-off blows the budget |
| 24 | `Tool` as first-class entity (beyond feature folder) | defer | Named capability skills can invoke | Skills don't exist as first-class yet | With skills |
| 25 | `Prompt` + `PromptVersion` (beyond feature folder) | defer | Versioned prompts referenced by skills | Skills don't exist as first-class yet | With skills |
| 26 | `ModelStack` routing profile | defer | Ordered cascade of models for a skill | Actors pick models directly for MVP | When two actors want different routing strategies for the same skill |
| 27 | `AcceptanceCriterion` as own entity | defer | Currently `{text, done}[]` inline on VaultItem. Could become own table with its own events (ticked/unticked) | Fine inline for MVP | When AC history matters and events need to reference specific criteria |
| 28 | Body/title split (intake vs refined) | maybe | `body` is marked immutable in the UI — implies a split between raw intake and refined content. Not enforced at the type level today | Works via UI convention | When an agent needs to re-derive title or when body-vs-summary becomes its own concept |
| 29 | `archived_at` + `status='archived'` dual representation | defer | Two fields encoding the same fact; kept in sync by convention | Standard soft-delete pattern, fine | If they ever drift — pick one as source of truth |
| 30 | Grooming `transitions` audit table | defer | Currently handled by `activity_events` with `status_changed` | Fine if events carry enough context | When grooming-specific analytics (time in each stage, transition frequency) need their own projections |
| 31 | `intake-quality` gatekeeper skill | **designed, not shipped** | Split from the existing `vault-analyse` skill per P1 (micro-skill decomposition). Sole job: actionability verdict + clarifying questions. Design in `docs/architecture/hermes-skill-alignment.md`. Dashboard shape ready; hermes-side implementation pending | Design doc at `docs/architecture/hermes-skill-alignment.md` |
| 32 | Dispatch-plan / agent-pipeline structure | partial | Hermes's `pipeline-pump` already enqueues the next skill when the previous completes. Emergent chain: `intake-quality → vault-classify → vault-decompose → marvin review → ready`. A formal `DispatchPlan` type is still deferred — the chain is implicit in skills reading note state | When an item needs a non-default chain (e.g. `code/pr-from-issue` branches) |
| 33 | `actionability-clear` check — cached agent judgment | defer | A readiness check that isn't a pure function — requires an agent to read the body and decide. Needs to be cached (`{verdict, at, actor}`) with a freshness window | Pure structural checks are enough for MVP | When operator wants agents to refuse un-actionable items automatically |
| 34 | `Project` as source of domain criteria | **merged into 17** | See row 17 — same concept, now active candidate | — | — |
| 35 | `priority_scored` event (priority as explicit event, not silent field write) | defer | When `ai_priority` or `manual_priority` is set, it should produce an event carrying model, rationale, and the previous value | Paired with K6; they're the same rule | As soon as mutations pipeline lands — every write is an event |
| 36 | Auto-tag suggestion at intake | maybe | Agent reads body (e.g. URL domain) and suggests tags for operator approval | Low-cost enrichment but not critical | When tag-based views become operator-facing |
| 37 | Lifecycle explicit: intake → triage → grooming → ready | maybe | Currently implicit. Making it explicit would mean `grooming_status` expands or a separate `lifecycle_stage` is introduced | Single `grooming_status` field covers it for now | When triage (AI setting priority/tags) and grooming (AC, decomposition) need to be distinguished in projections |
| 38 | Per-repo skill federation | defer | Skills live in the repo of the thing they serve. Hermes repo hosts universal skills (`intake-quality`, `classifier`); LocalShout repo hosts `localshout.event-qualifier` etc. Dashboard's `skills` table becomes a projection / index, not source of truth. Namespacing via slug prefix (`localshout.event-qualifier`) — no new column needed | One catalogue works until two projects need conflicting versions of the same skill | When a second project needs its own domain-specific skills, or when LocalShout skills accumulate enough that they pollute the global catalogue |
| 39 | Title-drafter as TWO skills, not one | defer | Split by input shape: `title-from-substantive-text` (Ralph/qwen, cheap) vs `title-from-url-intake` (Boris/Haiku, needs fetch + context). Don't bolt both modes onto one skill — the micro-skill principle | — | When the first title-drafter skill is written |
| 40 | Project auto-link on keyword match | defer | If `body`/`title` mentions `localshout` (etc.), auto-suggest Project link with low confidence, require operator confirm. Generous detection — false negatives are worse than false positives | Manual linking is fine for a handful of items | Once ~20 items exist unlinked to their obvious project |
| 41 | Priority divergence surface (insight projection) | defer | A projection (today's briefing? dedicated surface?) showing items where `manual_priority` and `ai_priority` disagree by >1 tier, with jimbo's rationale for comparison. The *divergence* is the feature — agreement is boring | No value until `priority_scored` events carry rationale (row 35) and enough items have both scores | After rows 35 and 17 land |
| 42 | AI priority rationale as first-class on `priority_scored` event | defer | Not just "jimbo scored P2" but "jimbo scored P2 because X, Y, Z". Without rationale, divergence is just a number mismatch | Paired with row 35 | With row 35 |
| 43a | `Goal` as first-class entity | defer | Aspirational target with measurable outcome + optional deadline. Shape: `{id, owner_actor_id, project_id?, title, outcome, deadline?, status: active \| achieved \| abandoned}`. Junction `goal_contributions(goal_id, vault_item_id)` for items that moved the goal forward | Goals turn priority into a *why*: dispatcher can ask "which active items contribute to this goal?". Tags can't express outcome / deadline / progress | When operator wants to track progress toward a measurable target — likely soon |
| 43b | `Interest` as first-class entity | defer | Ongoing curiosity, no end state. Cross-cutting across projects. Shape: `{id, display_name, description, status: active \| archived}`. Junction `interest_items(interest_id, vault_item_id)` for the collected set | Interests are structurally close to Projects (long-lived context + related items) but lighter — no criteria, no repo_url, items are *collected* not *worked on*. Tags can't own events ("@marvin added a resource to Nepal Trekking") | When a "browse by interest" surface or "active work vs interest alignment" projection is needed |
| 44 | Project-level activity events | defer | When criteria or ownership changes, who did it? Principle K6 says every mutation is an event. Likely implemented as `activity_events.project_id` (nullable, alongside `vault_item_id`) so both histories share a table | Projects change rarely; no events on file yet | When first project-level mutations happen (first criteria edit, ownership transfer) |
| 45 | Project-level priority | defer | Some projects matter more than others. Useful when jimbo has to pick "which project to advance next" without operator input | Solo operator eyeballs 4–6 projects, no need | When project count grows past ~10, or jimbo starts auto-selecting projects to work on |
| 46 | Jimbo-spawned prototype projects | active-idea | Marvin tells jimbo "why don't you prototype something?" — jimbo creates a Project with owner=@jimbo, drafts criteria, spawns a few vault items. Archive if dead. Shape already supports it (Actor as owner, minimal required fields). No new work | — | — (ready to use when scenario arises) |
| 47 | Skill `capabilities: string[]` field | defer | Things like `vision`, `long-context`, `tool-calling` that aren't tier concerns — they're orthogonal constraints. Dispatcher checks actor can satisfy them before picking | Tier + prompt content is enough for current skills | When the first vision-requiring or long-context skill arrives |
| 48 | Skill versioning on breaking schema changes | **open** | When a skill's schema changes (not just its prompt wording — the prompt already has its own versioning), how do we represent "v2" of the skill? Two options: (a) new slug per breaking change (`intake-quality-v2` as a separate row, catalogue bloats but simple structure), (b) `skill_versions` table mirroring prompt versions (extra table but clean catalogue, history sticks to the skill). No decision yet; no skill's schema has actually broken | — | When the first skill's input/output schema needs a breaking change |
| 49 | Skill → repo schema file sync (indexer) | defer | Repo files are source of truth; `Skill` row is a cache with `last_indexed_at`. Indexer pulls each project's repo, reads `skills/*/SKILL.md` + `input.schema.json` + `output.schema.json`, populates/updates rows. UI surfaces staleness. Operator edits happen in the repo, not the dashboard | No repos populated with skills yet | When the first project-scoped skill actually exists in a repo |
| 50 | Deactivation preserves junction rows | decision | Flipping `Skill.is_active = false` keeps `actor_skills` rows intact. Dispatcher filters by `is_active`. Reactivation is reversible without losing operator's grant decisions | — | — (decided in skill prototype note 7) |

## Open design questions — no status yet

| # | Question | Context |
|---|---|---|
| Q1 | Replace `ActorKind` + `ActorRuntime` with `ActorArchetype` (`human / local-agent / hosted-agent / orchestrator`)? | `runtime` currently conflates inference engine, API provider, and chassis. Archetype is honest. Cosmetic until a decision point forces it |
| Q2 | Should `'system'` stay in `ActorKind` union with no rows? | Aspirational — for future origin-less events. YAGNI says drop. Left for now |
| Q3 | Should `ActorRuntime` field exist at all? | Currently does no functional work. Descriptive only. Could move to free-text `description` |
| Q4 | Is `actor_skills` operator-curated or benchmark-derived? | Today: curated. With benchmarks: potentially derived. Can coexist — junction = operator override on top of benchmark default |
| Q5 | Micro-skill decomposition — how small is too small? | Philosophy says many small skills. Hundreds is fine? Thousands isn't. Where's the ceiling? |
| Q6 | Do activity events carry `skill_id` at MVP? | Helps ceremony log immediately; formalises later. Probably yes as optional field |
| Q7 | Do we version actor rows on config change, or flip fields? | Runs carry their own `model_id` on the event, so history is preserved there. Field-flip probably fine |
| Q8 | Skills carry `model_hint` (haiku-class / sonnet-class / etc), actors declare `max_tier`. Dispatcher picks cheapest actor meeting the hint | Replaces the earlier "hand-curated actor_skills proficiency" approach for model-tier concerns. Tiers are computed; proficiency becomes about trust/permission only, not cost |
| Q9 | Should there be a named "bouncer" actor for intake-quality, or is it just a skill any capable actor runs? | Lean: skill, not actor. But named roles in the ceremony log read better than "@boris ran intake-quality" |

## Principles (not entities — record so we don't drift)

| # | Principle | Captured where |
|---|---|---|
| P1 | Micro-skill decomposition: many narrow skills over few broad ones; trade tokens for reliability | `memory/project_skill_granularity.md` |
| P2 | Types first, schema later — iterate shapes cheaply in TypeScript before committing to Postgres | `domain/README.md` |
| P3 | Branded IDs always on; slug vs UUID decided per-entity | `domain/README.md` |
| P4 | Append-only history where practical; audit via events not field diffs | — |
| P5 | Domains come before screens. Screens are projections of domains | `docs/vision/control-plane.md` |
| P6 | Every mutation produces an event. No silent field writes. Timestamps like "last modified" are derived, never stored | whiteboard K6, row 35 |
| P7 | Under-written vault items deserve pushback — the system should refuse to dispatch work it can't clearly act on. Intake is a first-class quality gate, not a passive pass-through | whiteboard row 31, conversation 2026-04-24 |
| P8 | Actors are chassis (where the agent lives), not roles (what it does). Don't multiply actors to match skills or model tiers — those are orthogonal dimensions handled via skill hints + actor tier ceilings | whiteboard Q8, Q9 |
| P9 | Domain-specific skills live in the repo of the domain they serve, not in the dashboard. Dashboard indexes; it doesn't own | whiteboard row 38 |
| P10 | Dual-source priority (`manual` + `ai`) is kept on purpose — the *divergence* is the feature, not noise. Building the insight layer that surfaces disagreement is future work | whiteboard rows 41, 42 |
| P11 | Goals, Interests and Projects are distinct first-class entities, not variants of one type. They share "long-lived context" shape but diverge in outcome, lifecycle, and whether items are *worked on* (project), *contribute toward* (goal) or are *collected under* (interest) | whiteboard rows 17, 43a, 43b |
| P12 | Skills come in three shapes: pure-prompt (LLM + no tools), tool-augmented prompt (LLM + tools), and deterministic code (`prompt_id = null`, no LLM). Current Skill shape supports all three. Don't invent a fourth — if a skill doesn't fit one of these, we've mis-scoped it | whiteboard row 5, skill prototype note 6 |
| P13 | Skills are owned by Projects — never by Actors. An Actor *runs* skills (via `actor_skills` grants); a Project *owns* them (their code and prompts live in the project's repo). Hermes is a Project, not an Actor proper — the `jimbo` Actor is the identity that executes from the hermes codebase. Category distinction matters | whiteboard rows 5, K10 |
| P14 | For cached repo-owned data (skills, eventually prompts): the repo is source of truth; the dashboard row is an index. UI surfaces cache freshness (`last_indexed_at`), edits happen in the repo not the dashboard, sync runs on a schedule | whiteboard rows 5, 38, 49 |
| P15 | A vault item has two parallel streams: the **activity log** (structured facts, audit-grade) and the **discussion thread** (conversational messages). Each has its own entity; they bridge via `thread_message_posted` events. Conflating them loses useful distinctions — don't | whiteboard row 12, K14 |
| P16 | Dashboard mirrors hermes's reality. When hermes and the dashboard disagree on a vocabulary or shape, the answer is not "dashboard decides in isolation" — it's "resolve the drift explicitly, then sync both sides." `docs/architecture/hermes-skill-alignment.md` carries cross-repo design decisions | hermes-skill-alignment.md, K15, K16 |
| P17 | Open questions block dispatch regardless of `grooming_status`. A note can be `classified` and still have an open question that blocks it moving to `ready`. Readiness is never `grooming_status === 'ready'` alone — it's the full set of checks | `domain/vault/readiness.ts` |

## Killed / rejected

| # | Concept | Why | When decided |
|---|---|---|---|
| K1 | `system` actor row | No real origin-less events exist today. The actor was aspirational scaffolding. Revive when truly needed | 2026-04-24 |
| K2 | Field-change audit log (every mutation writes a row) | Marvin pushed back — a single activity log of named events is what's needed, not a firehose of field diffs | 2026-04-24 |
| K3 | Routing logic inside the actors prototype | Routing is a dispatcher concern, not a domain one. Extracted to separate `routing.html` | 2026-04-24 |
| K4 | `executor` field on `VaultItem` | Two ownership concepts (`assigned_to` + `executor`) were confusing. "Auto Jimbo assigns" is the default; operator overrides by reassigning. Revive only if a case emerges where "owned by X but run by Y" is meaningful | 2026-04-24 |
| K5 | `required_skills` field on `VaultItem` | Was a free-text role hint (`["coder", "researcher"]`) at the wrong abstraction level — not routable, not useful for the dispatcher. Replacement will emerge as an explicit dispatch-plan concept. Until then, the field simply doesn't exist | 2026-04-24 |
| K6 | `updated_at` field on `VaultItem` | Creates a silent audit hole — rows can be touched without an event. Derived instead as `MAX(activity_events.at)`. Forces every mutation to produce an event. Same rule to be applied to every other mutable entity as they land | 2026-04-24 |
| K7 | `project_id` as single FK on `VaultItem` | A vault item can genuinely belong to multiple projects (e.g. a fix touching two products). FK-to-junction migration later would hurt. Replaced with `VaultItemProject` junction while types are still cheap to change | 2026-04-24 |
| K8 | `inactive` status on `Project` | Third state added cost with no payoff. Low-activity projects stay `active`; their idleness is visible from item counts. Two states only: `active \| archived` | 2026-04-24 |
| K9 | Dot as skill slug separator | Used `.` initially; replaced with `/`. Reasons: (a) matches OpenRouter model-id convention (`anthropic/claude-sonnet-4-6`), (b) maps directly to filesystem, (c) standard for namespaced resources (Docker, OCI, URL paths). Dot had no rationale beyond "URL-simple" | 2026-04-24 |
| K10 | "Bare slug = global" skill convention | Ambiguous — who owns a bare slug? Hermes? Some implicit "global" namespace? Every skill now belongs to exactly one project. The core project is named `hermes`; its skills are `hermes/intake-quality` etc. Always prefixed, always unambiguous | 2026-04-24 |
| K11 | `-class` suffix on model tiers | Redundant and inconsistent with existing `ModelTier` enum. Dropped. See K13 for the subsequent tier name refresh | 2026-04-24 |
| K13 | Vibe tier names (`fast / balanced / powerful`) | Swapped for cost-anchored names: `free / budget / standard / premium`. The name itself points at a published cost threshold (per MTok input), so operators can verify by reading a provider's pricing page — the "720p" principle. Thresholds live in JSDoc and drift without forcing enum renames | 2026-04-24 |
| K14 | `NoteAddedEvent` in ActivityEvent | Conflated factual audit with conversational content — a `body: string` on a structural event row made activity queries muddy and blocked reasoning about open questions. Replaced with `ThreadMessagePostedEvent` (pointer to `ThreadMessage`). Content lives in `thread_messages.body`; event stays structural | 2026-04-24 |
| K15 | String `Priority` (`'P0'–'P3'`) | Hermes stores integer (0–3). Every API boundary required translation. Flipped dashboard to integer; UI renders "P" prefix at display time only. Same concept, cheaper serialisation | 2026-04-24 |
| K16 | Old `GroomingStatus` vocabulary (`analysing \| questions \| proposed`) | Present-progressive names implied in-flight states, but in-flight is tracked on `dispatch_queue` rows, not note status. Replaced with completion-state names aligned with the split-skill pipeline: `ungroomed \| intake_rejected \| intake_complete \| classified \| decomposed \| ready`. `questions_pending` removed — open questions are orthogonal blockers via ThreadMessage | 2026-04-24 |
| K14 | `NoteAddedEvent` in ActivityEvent | Conflated factual audit with conversational content — a `body: string` on a structural event row made activity queries muddy and blocked reasoning about open questions. Replaced with `ThreadMessagePostedEvent` (pointer to `ThreadMessage`). Content lives in `thread_messages.body`; event stays structural | 2026-04-24 |
| K12 | `source_repo` as free-text string on `Skill` | Changed to `ProjectId` FK. Enables joins, enforces referential integrity, single source of truth for repo metadata (it lives on the Project row, not duplicated) | 2026-04-24 |

## How to use this doc

- When a new concept comes up in conversation, **add it here** with `defer` status and a revisit trigger, before continuing work.
- When a deferred concept's trigger fires, flip it to `active` and it enters the working set.
- When something gets built, flip to `built` and link to the code.
- When we decide against something, flip to `killed` with a reason — don't delete the row. That's how we avoid re-litigating.
