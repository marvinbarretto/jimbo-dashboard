---
module: skills
repo: dashboard
description: Registry UI for hub SKILL.md files — browse skills by usage/potential, edit metadata and body, with every write landing as a git commit.
source_paths:
  - src/app/features/skills/**
generated_at: 2026-07-07
reviewed_commit: "1688511"
sections:
  purpose: asserted
  responsibilities: asserted
  public-api: derived
  lifecycle: derived
  dependencies: derived
  tech-debt: asserted
---

# skills

## Purpose

Marvin's Claude/agent skills live as `SKILL.md` files in the hub repo — the
canonical registry the skills-refinement project tracks ("ambient skills
thrive, ceremony skills die"). This feature is the dashboard view of that
registry: which skills exist, when each was last used, its lifecycle verdict
(keep / refine / wire-ambient / shelve / infra) and potential score, plus a
full editor so a skill can be created, reworked, renamed, or retired without
touching the filesystem. The default sort answers the feature's driving
question directly: what am I actually using?

## Responsibilities

- `SkillsService`: load the skill list via the dashboard-api proxy, expose
  `skills`/`activeSkills` (`metadata.is_active !== false`) signals, and
  CRUD + rename where every mutation routes dashboard-api → jimbo-api →
  git pull/commit/push on the hub repo. Local state is replaced with the
  server's post-commit response.
- Skills list: TanStack table sorted by `last_used` desc (never-used sinks),
  with namespace/name, potential (unscored sinks), status verdict badge,
  type, requires-capabilities chips, coarse relative "last used" labels,
  and inactive-row styling.
- Skill detail: read-only card with metadata, breadcrumbs, page title.
- Skill form: create/edit id (`<namespace>/<name>` pattern, locked on
  edit), name/description, capability `requires` checkboxes,
  timeout/required_context/produces/completes_dispatch/is_active metadata,
  markdown body; delete (confirm + DELETE) and rename (prompt +
  `POST .../rename`, a server-side `git mv`).
- Does NOT execute or route skills, and does not own usage telemetry —
  `last_used` arrives on the API payload.

## Public API

Lazy-loaded at `/config/skills` via `config.routes.ts`. Routes
(`skillsRoutes`):

- `` → `SkillsList`
- `new` → `SkillForm`
- `:namespace/:name` → `SkillDetail`
- `:namespace/:name/edit` → `SkillForm`

(Skill ids are slash-paths, so links split into two segments.)

`SkillsService` (root): `skills`, `activeSkills`, `isLoading`, `error`,
`getById`, `create`, `update`, `remove`, `rename`, `reload`.

## Lifecycle

Child of the `ConfigPage` shell; no guards. The service loads once in its
constructor and caches for the app lifetime; seed mode (`?seed=1`) uses
`SEED.skills`. Mutations return Observables that the form subscribes to —
toast on success, navigate to the (possibly renamed) detail route using the
server response; upstream git errors (conflict / dirty tree) are surfaced
verbatim in the error toast.

## Dependencies

- **API** (`environment.dashboardApiUrl`): `GET|POST /api/skills`,
  `PATCH|DELETE /api/skills/{id}`, `POST /api/skills/{id}/rename`.
  jimbo-api owns the canonical files under `$HUB_SKILLS_DIR`.
- **Domain**: `@domain/skills` (`Skill`, `SkillMetadata`,
  `skillNamespace`/`skillLocalName`), `@domain/capability`
  (`ALL_CAPABILITIES`, labels), `@domain/seed`.
- **Shared**: `UiDataTable`, ToastService, seed-mode, UI kit (badge,
  breadcrumb, card, cluster, meta-list, page-header, prose, loading/empty
  states).
- **Third-party**: `@tanstack/angular-table`.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — Rename UX is native `prompt()`/`alert()`, out of step with
  the reactive-forms + toast patterns everywhere else in the feature.
- `2026-07-07` — Only one spec (`skills.spec.ts`, service-level) and its
  `activeSkills` assertion runs against an empty pre-HTTP array, so it can
  never fail; the list's sorting/status logic and the form's four mutation
  flows are untested.
- `2026-07-07` — No response schema validation (`http.get<Skill[]>`
  trusted as-is), unlike the actors feature's Zod-checked loads.
- `2026-07-07` — `lastUsedLabel` in `skills-list.ts` hand-rolls coarse
  relative time while `@shared/utils/datetime.utils` and
  `RelativeTimePipe` already exist (the deliberate difference — no churn
  while reading — is documented in a comment, but it's still a third
  time-formatting implementation).
- `2026-07-07` — `handleError` unwrapping duplicated with model/model-stack
  forms; status-tone mapping duplicated between `skills-list.ts` and
  `skill-detail.ts` (comment acknowledges the mirror).
