# Claude — Skills Map & Refinement Plan

> Living map of the 24 Claude Code / Jimbo skills: what each does, its potential, Marvin's own
> verdict, and the fix that would unlock it. Companion to the Hermes surface — this is the "Claude"
> view of the ecosystem. First cut: 2026-07-03.

## Two things this map is NOT measuring (read first)

1. **Usage counts are unreliable.** The `.lastused` sidecar only records skills *manually invoked in
   a local Claude Code session* — which Marvin rarely does. Real execution happens via **cron and
   Hermes on the VPS**, a path that never touches the local hook. So "never used" mostly means "not
   summoned by hand," not "doesn't run." (To get true usage, pull Hermes/cron/dispatch logs.)
2. **Potential ≠ current usage.** Scores below are **potential /5** — value *if the skill were wired
   to how Marvin actually works*, weighted to live goals (ship localshout, daily task/inbox-zero, the
   witness thread). A dormant skill can be high-potential; the gap is usually the trigger, not the tool.

## The core pattern

**Ambient and reactive skills thrive; ceremony skills die.** The ones Marvin grabs in the moment of
need (`wireframe`, `gh-issue`, `deep-dive`) live. The ones that wait for a ritual he must *initiate*
(`interrogate`, `triage-google-tasks`, `ecosystem-review`) gather dust — the same finding as the
mirror's "ambush works, ceremony doesn't." Caveat in Marvin's words: *"I would do ceremonies if I knew
they'd work, but refining a skill until it's really effective takes time — a tradeoff against other
priorities."* So the lever isn't discipline; it's (a) making high-value skills ambient/hook-driven, and
(b) investing refinement only where the payoff is clear and near.

---

## The map

| Skill | What it does | Fires via | Pot. | Marvin's verdict / next action |
|---|---|---|---|---|
| **Thinking / ideation** |
| `wireframe` | screen-by-screen UX before building | reactive | **5** | **Huge potential, actively avoided.** Output is bloated, assumes mobile, not grounded in UX best practice. *"Would use it all the time if it was good."* → **rewrite: concise, responsive-aware, UX-principled.** Top fix. |
| `gh-issue` | braindump/bug/screenshot → structured issues | reactive | **5** | Good, but may be stale vs current jimbo-api; **label consistency** worries him; unclear how it relates to **vault tasks now the kanban boards have evolved**. → audit against current API + define gh↔vault model. |
| `deep-dive` | rough idea → sharp actionable brief | reactive | **4** | **Wrong name.** Loves getting ideas out → tangible, ideally to a spec an **agent could fully OWN and build in its own workspace** (`jimbo-workspace` repo where Jimbo builds/acts/uses the vault). → rename + reorient toward agent-ownable handoff briefs. (Vision.) |
| `prompt-maker` | braindump → clean starter prompt | reactive | **4** | *"Should use this a lot more — my prompts are sometimes weak."* → make it habitual (hook / reflex). |
| `assess` | judge a URL/text against goals/taste | reactive | **3** | Sometimes **too strict against stale priorities/goals** — some Jimbo self-model data hasn't changed in months. → soft-weight stated goals; see Theme 1. |
| `evaluate` | formal verdict on an idea, can trigger research | reactive | 3 | Same staleness problem as `assess`. Heavyweight; overlaps `deep-dive`. |
| `stress-test-idea` | Clarity/Strength/Actionability → PROCEED/REFINE/DROP | reactive | 2 | *"Not sure what this one does."* → if the owner can't name it, fold into `deep-dive` as a mode. |
| `pre-write` | 30-sec gut-check before writing | reactive | 2 | *"Ought to happen automatically — on a hook?"* → **convert to a hook** (fires before substantive work), not a skill you summon. |
| **Capture & triage — the task-zero engine** |
| `process` | process an item into the vault | reactive/ambient | **5** | core capture verb; central to daily task-zero. |
| `manual-review` | classify inbox / triage needs-context | ambient | **4** | inbox-zero engine — make Hermes-proposed, not a sit-down. |
| `triage-tasks` | triage ambiguous vault tasks | ambient | **4** | task-zero engine — ambient, not ritual. |
| `synthesize` | fan a thought into linked vault items/epics | reactive | **4** | Very useful, but worries it makes **vault tasks instead of gh tasks** — *"which tools do I use so all parts are truly linked, coding or not?"* → see Theme 2. |
| `save-to-project` | distil a conversation into a project note | reactive | **4** | literally what these Fable chats should become; underused because not habitual. |
| `triage-google-tasks` | Google Tasks → vault | ritual (never happened) | 3 | Daily ritual *intended*, **never once happened**. High value only if made ambient. |
| `relentless-extraction` | deep Q&A extraction | sub-skill | n/a | infra, called by others — keep in hub, off the menu. |
| `vault` | quick-capture (DEPRECATED) | — | **1** | superseded by `process` — safe to shelve now. |
| **Project lifecycle** |
| `project-brief` | fill a project's brief fields | reactive | **4** | localshout's `vision.md` is a STUB — this is the tool for it, never run. |
| `new-project` | full project kickoff | reactive | 3 | valuable *when* starting — but new projects are the pattern to resist on current runway. |
| **Reflection / self-model** |
| `reflect` | journal/reflection interview | ritual (proven) | **5** | the one ritual that worked — overdue, not dead. |
| `update-jimbo-context-model` | refresh Jimbo's model of Marvin | reactive | 3 | the lever for Theme 1 (stale self-model). |
| `interrogate` | gamified self-interrogation, 20 modes | ritual | 2 | the ambush scanner beat it — keep the data layer, shelve the ceremony. |
| **Review / ops** |
| `devlog` | capture session problems/fixes/lessons/blog topics | reactive/cron | **4** | underused; feeds the "publish an essay" horizon. |
| `ecosystem-review` | weekly ecosystem review | ritual (weekly) | 3 | survives only if cron-nudged. |
| `review-briefing` | review the day's briefing quality | ritual | 2 | narrow, meta, lowest priority. |

---

## Cross-cutting themes (fix these, and many skills improve at once)

1. **Stale self-model poisons judgment skills.** `assess`, `evaluate`, and `deep-dive` all rank against
   an `interrogate_*` self-model that hasn't moved in months, so they're "too strict against priorities
   that may no longer be true." Fix is upstream: refresh the model (or have these skills weight *revealed*
   priorities and treat stated goals as soft). Same thread as the mirror's drift finding.
2. **Vault-task ↔ GitHub-issue unification.** `gh-issue` and `synthesize` both raise it: which surface do
   you capture into so everything stays linked whether it's a coding task or not? The pieces exist in
   jimbo-api (`vault_notes`, `vault_item_projects`, the github-issues route, `dispatch_queue` issue
   fields, `code-pr-from-issue`) but the *intended flow* isn't written down. Needs a canonical
   "capture → link" model. **(Confirm intent before building — this is a design decision only Marvin
   can make.)**
3. **Ceremony → ambient / hook.** `pre-write` should be a hook; the daily task-zero flow should be
   Hermes-proposed, not self-initiated. Convert rituals-that-die into triggers-that-fire.
4. **The `jimbo-workspace` autonomy vision.** `deep-dive` wants to become a producer of *agent-ownable*
   project briefs that hand off to a repo where Jimbo builds and owns a project end-to-end. Big, exciting,
   sequenced after shipping.

---

## Fix queue (sequenced against the shipping tradeoff)

| When | Fix | Why now / why wait |
|---|---|---|
| ~~Now~~ **✅ done 2026-07-03** | ~~Rewrite `wireframe`~~ — now theory-led (goal/persona/CTA per screen), viewport-explicit (no mobile default), clickable, de-bloated (CSS → `wire-kit.css`) | He'd use it constantly; directly serves localshout UX. Highest ROI. |
| **Now, tiny** | `pre-write` → hook; shelve `vault`; fold `stress-test-idea` into `deep-dive` | Minutes each; removes friction and menu clutter. |
| **Soon, medium** | `gh-issue` audit + write the vault↔gh linkage model (Theme 2) | Serves the localshout burndown; unblocks `synthesize`. Confirm design first. |
| **Data, not skill** | Refresh / soft-weight the self-model (Theme 1) | Unblocks `assess`/`evaluate`/`deep-dive` ranking. |
| **Later / capture** | `deep-dive` → `jimbo-workspace` agent-ownable briefs (Theme 4) | Vision-scale; after v1.0 ships. |

---

## Productization — the "Claude" dashboard page  ·  ✅ shipped 2026-07-03

The assessment now flows **frontmatter → jimbo-api → dashboard**, so the existing Skills page
(`/config/skills`) renders current state instead of a doc that drifts:

- **hub `SKILL.md` frontmatter** — each skill's `metadata` now carries `potential` (1–5),
  `status` (keep / refine / wire-ambient / shelve / infra), `fires_via`
  (reactive / ambient / ritual / cron / hermes / sub-skill), and `verdict`. Backfilled across all 24.
- **jimbo-api** (`src/schemas/skills.ts`, `src/services/skills.ts`) — parse + response schema +
  serializer extended for the four fields (serializer also fixed to stop dropping
  `category`/`invocation`/`trigger`/`type` on write).
- **dashboard** — `domain/skills/skill.ts` model + a **Potential** and **Status** column on the
  skills list, and the four fields in the skill detail.

**Known gaps:** 6 of the 24 skills live only in `~/.claude/skills/` (not symlinked into hub), so they
won't appear on the dashboard until moved into hub: `save-to-project`, `relentless-extraction`,
`project-brief`, `new-project`, `update-jimbo-context-model`, `ecosystem-review`. All changes are
uncommitted working-tree edits (jimbo-api + hub + dashboard) — review, then commit.
