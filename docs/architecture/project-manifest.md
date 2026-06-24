# Project manifest — the pro-forma every project carries

> Status: **proposal / pilot.** A standard, in-repo, machine-syncable shape for
> "what is this project, who's it for, how do you work on it" — so the answer
> lives next to the code and can't rot in a database.

---

## 1. The problem in one paragraph

Project context today (intent, entry points, footguns, deploy target…) lives as
hand-typed fields in the dashboard DB. It rots, because **the truth lives in the
repo but the description lives in the database, and nothing keeps them in step.**
The person who moves a file or changes the deploy is editing the repo, not the
dashboard — so the dashboard copy goes stale the moment they save.

Two fixes, both structural rather than clever:

1. **Relocate truth into the repo.** A doc next to the code, synced read-only into
   the dashboard. The cron is *transport*, not a fact-inventor.
2. **Split WHY from HOW**, because they change for different reasons:

| | WHY (vision) | HOW (operating) |
|---|---|---|
| examples | intent, audience, scope, moat | entry points, footguns, deploy, conventions |
| changes when | you learn from the market | you change the code |
| updated by | a human, deliberately | a human editing the repo; cron mirrors |
| rots from | reality contradicting an assumption | code drifting from the description |

---

## 2. Two levels: **project** (umbrella) and **repo** (operating)

A project can span many repos. **jimbo** is `dashboard` + `jimbo-api` +
`hub/hermes` — three different codebases, each with its own conventions and
footguns. So the model has two levels:

```
PROJECT  ──< the WHY: intent, vision, scope. One umbrella.
   │
   └──< REPO  ──< the HOW: entry points, footguns, deploy. One per codebase.
```

- **Project umbrella** → `docs/project.md` — intent, vision, scope, member list.
- **Repo manifest** → `docs/repo.md` — operating context for *that* codebase,
  plus `project:` (which umbrella) and `role:` (what it does in the project).

**Membership is declared, not inferred.** `hub/hermes` lives outside
`/development/jimbo/`, but its `repo.md` says `project: jimbo` — so it belongs to
jimbo. The declaration wins over the filesystem; that's the entire reason to put
it in frontmatter.

WHY maps to the project level (doesn't drift from code → one home), HOW maps to
the repo level (drifts from code → lives in each repo).

---

## Scope: project vs goal vs task — only projects get manifests

Not everything in the dashboard is a project. The test is **does it terminate?**

- **Project** — an *ongoing* context that accretes work and has a WHY. Repo- or
  domain-backed. jimbo, localshout. → **gets a manifest.**
- **Goal** — a thing to *achieve*: success criteria, optional deadline, a terminal
  verdict. nz-passport (one-shot) *and* finance/household (ongoing) live here. →
  no manifest; it's a Goal.
- **Task** — a vault item. Pins to project(s) *and/or* goal(s). → no manifest.

**This already exists.** `interrogate_goals` carries the right shape exactly —
`content`, `success_criteria`, `deadline`, `goal_status: active|hit|missed|
abandoned`, close-with-verdict. The terminal states are the giveaway: that's what
nz-passport is, and a project isn't.

The one missing piece is a **`vault_item_goals` junction** — a direct mirror of
the existing `vault_item_projects` — so a Task can pin to a Goal the same way it
pins to a Project (today only a free-text `inferred_goal` exists). The Tasks view
then gets a "no project" lane filtered by goal. *Separate workstream from the
manifest.*

**Why this matters here:** moving terminating goals **and** no-code life-areas out
of "projects" makes **projects ≈ repo-backed**. The read-only-synced-from-repo
model then applies to nearly every project, and Scenario C below shrinks to a rare
edge.

---

## 3. The schemas

### 3a. `docs/repo.md` — per-codebase operating manifest

```yaml
# ── identity ──
repo:          string        # required. repo slug, e.g. "dashboard"
project:       string        # required. umbrella slug, e.g. "jimbo" (self if single-repo)
role:          string        # required for multi-repo. one line: what this repo does
display_name:  string?       # optional

# ── judgment (hand-written; code can't infer these) ──
entry_points:  string        # required. the 1–2 files/docs that orient a newcomer
autonomy_level: 'none'|'propose'|'ship'   # optional. overrides project default

# ── pointer ──
conventions:   path          # → ./AGENTS.md

# ── provenance (written by the sync bot) ──
synced_at:     iso8601 | null
```
Body sections: `## Footguns` (required-ish), `## Out of scope` (optional,
repo-specific exclusions).

### 3b. `docs/project.md` — umbrella

```yaml
# ── identity ──
id:            string        # required. project slug, e.g. "jimbo"
display_name:  string        # required
kind:          'major'|'minor'|'admin'   # required
status:        'active'|'archived'        # required
owner:         string        # required. actor id, e.g. "marvin"

# ── WHY (hand-written; doesn't drift from code) ──
intent:        string        # required. one-line north star
default_autonomy: 'none'|'propose'|'ship'   # default for member repos

# ── membership ──
repos:                       # multi-repo only; omit for single-repo
  - repo: string             #   member slug
    path: string             #   where it lives, e.g. "jimbo/dashboard"
    role: string             #   one line

# ── pointer ──
vision:        path          # majors only → ./vision.md

# ── provenance ──
synced_at:     iso8601 | null
```
Body sections: `## Out of scope` (the YAGNI list). Current state is **not** here —
it lives in the dashboard's beliefs system (see §6).

### 3c. The DB adapter (existing `ApiProjectSchema`)

The friendly manifest keys map onto the flat DB columns via a thin adapter — the
sync bot owns this, it is **not** a 1:1 validation:

| Manifest | → `ApiProjectSchema` column |
|---|---|
| `owner` | `owner_actor_id` |
| `conventions` | `conventions_url` |
| `intent`, `entry_points`, `autonomy_level` | same name |
| `## Footguns` body | `footguns` |
| `## Out of scope` body | `out_of_scope` |
| `vision`, `role`, `repos` | new — see deferred schema (§7) |

Everything the schema marks `.nullish()` is optional, so a sparse manifest parses
clean.

---

## 4. How it plays out — three scenarios

### Scenario A — **many repos** (jimbo)

```
/development/jimbo/              ← meta-repo (it's a real git repo with docs/)
  docs/project.md                ← UMBRELLA
  dashboard/   docs/repo.md      ← project: jimbo · role: Angular control-plane UI
  jimbo-api/   docs/repo.md      ← project: jimbo · role: Node API + Postgres
/development/hub/hermes/         ← lives elsewhere, still declares jimbo
  docs/repo.md                   ← project: jimbo · role: Python agent runtime
```

**Dashboard render:** project page = umbrella header (intent, vision link, scope)
**+ one operating card per repo** (role, entry points, footguns, autonomy badge),
each stamped "synced from <repo> · 2h ago", read-only.

### Scenario B — **one repo** (localshout) — the degenerate case

The repo *is* the project, so the two files collapse into one. No umbrella/repo
split needed; `docs/project.md` carries both, and `project: localshout` names
itself. Dashboard render: a single project page, same as today, but the fields are
read-only and synced from the repo.

### Scenario C — **no repo** (rare, after the goal cleanup)

This used to be where nz-passport / finance / household lived. They're **Goals
now, not projects** (see Scope, above) — so they leave the project taxonomy
entirely. What remains as a genuine Scenario C is an edge case: an ongoing context
with real domain criteria but no code. If one exists, it has **no manifest file**
and lives as a dashboard row, inline-edited as today — the pattern's job here is
to *know not to apply.*

| | file in repo? | truth lives in | dashboard editing |
|---|---|---|---|
| A. many repos | umbrella + N × repo.md | the repos | read-only, synced |
| B. one repo | one project.md | the repo | read-only, synced |
| C. no repo (rare) | none | the dashboard DB | inline-edit (as today) |

> Live examples are committed: `jimbo/docs/project.md` (umbrella) +
> `{dashboard,jimbo-api}/docs/repo.md` + `hub/hermes/docs/repo.md` (Scenario A);
> `localshout-next/docs/project.md` (Scenario B).

---

## 5. What goes in a manifest — and what never does

The manifest answers questions the **codebase can't answer about itself.** Keep a
field only if it's *both* (a) not reliably inferable from code and (b) used for
orientation. Three buckets:

| Bucket | Fields | Why |
|---|---|---|
| **Judgment** | intent, entry_points, footguns, out_of_scope, autonomy, role | hand-written — the manifest's reason to exist |
| **Pointer** | conventions → AGENTS.md, vision → vision.md | a path, not a copy |
| **Derivable** | deploy target, observability, stack, test framework | **never hand-typed.** Point to config, or let the bot derive + stamp read-only. A copied fact is what drifts. |

> Worked proof: localshout ships *both* a `vercel.json` and a `deploy-jimbo.yml`
> workflow — "deploy target" isn't cleanly inferable *and* shouldn't be retyped by
> hand. Sentry config is in-repo, so observability is derivable. Neither earns a
> hand-field.

Tier by `ProjectKind` (already exists, mirrors `serious-repo-conventions.md`):
**major** gets vision + full manifest; **minor** gets the manifest; **admin** is
mostly Goals now (see Scope). A passport-renewal never fills in "moat."

---

## 6. How it stays fresh (the loop)

```
repo: docs/repo.md  ──edited alongside code──▶  git commit
        │   0400Z snapshot bot / post-receive hook  (transport only)
        ▼
sync bot:  glob docs/repo.md + docs/project.md across known repos
           → group repo.md by `project:`
           → map via adapter, validate, upsert (set synced_at)
        ▼
dashboard: umbrella header + per-repo cards, read-only, "synced Nh ago"
           repo-less projects keep inline-edit
           stale synced_at flagged via interrogate_staleness
        ▼
Boris/Ralph context injection reads the same fresh fields
```

Reuse, don't reinvent: **snapshot bot** for transport, **interrogate_staleness +
belief expiry** for the freshness signal, **ApiProjectSchema** for validation.

---

## 7. Decisions & deferrals

**Decided:**
- Repo-backed fields render **read-only** in the dashboard (edit-in-repo link).
  One source of truth per field. Repo-less projects keep inline-edit.
- **`current_state` merges into the beliefs system** — it already has freshness +
  correction tracking, and the landing page already collapses `current_state`
  when beliefs render. No third representation.
- **Naming:** `docs/repo.md` per codebase, `docs/project.md` for the umbrella.
- **Only projects get manifests.** Terminating goals + no-code life-areas become
  Goals (`interrogate_goals`), not projects.

**Deferred (wide blast radius — confirm before building):**
- **`vault_item_goals` junction** (mirror of `vault_item_projects`) — enables
  pinning a Task to a Goal and the Tasks "no project" lane.
- **`admin` projects → Goals migration** — finance/household currently exist as
  `admin`-kind projects; they move to `interrogate_goals`. Likely retires the
  `admin` ProjectKind.
- **Schema migration** `repo_url: string` → a `project_repos` junction +
  `repos[]`. The multi-repo *model* is provable through the `project:` field and
  the sync bot grouping; the per-repo cards need the junction, so that's the last
  piece to land. Scenarios B and C work within today's schema.
- **Phase 2 derivation:** LLM-synthesised `current_state` / derived deploy +
  observability, stamped read-only. Explicitly opt-in, not the center of gravity.

**Build order:** (1) lock format ✅ → (2) write manifests for the pilots ✅ →
(3) sync bot: glob + group + adapter + upsert → (4) dashboard read-only render +
per-repo cards → (5) retire `current_state` into beliefs. Steps 3–5 touch the
snapshot bot, schema, and UI.
