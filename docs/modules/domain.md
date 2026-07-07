---
module: domain
repo: dashboard
description: Framework-free TypeScript model layer — branded IDs, entity shapes, derived-signal logic, zod API contracts, fixtures, and the generated OpenAPI types.
source_paths:
  - src/app/domain/**
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

# domain

## Purpose

Canonical TypeScript shapes for every entity in the Jimbo control plane —
vault items, actors, dispatch, projects, activity, interrogate — sketched in
types before they're committed to Postgres, because rebuilding a type costs
seconds and rebuilding a migrated table costs hours. Deliberately framework
free (no Angular, no HTTP, no services) so anything — features, tests,
tooling — can import it without dragging the framework along.

## Responsibilities

- Branded entity IDs (`ids.ts`): `Brand<string, 'ActorId'>` etc. with
  constructor helpers for API boundaries, plus the `KNOWN_ACTORS` closed set
  (`jimbo`, `marvin`, `kipper`, `boris`) with a compile-checked
  `wellKnownActorId()` constructor. Slug vs UUID chosen per entity (humans
  type slugs; machines join on UUIDs).
- Entity shapes per subdomain: `vault/` (the richest — item, projects join,
  dependencies, plus derived-signal logic: `readiness`, `staleness`, `pulse`,
  `stuck`, `sort`, `transitions`, `next-action`, `grooming-ownership`),
  `actors/`, `activity/` (discriminated-union events), `dispatch/`
  (commission views, queue entries, fleet stats), `projects/`, `skills/`,
  `models/` + `model-stacks/`, `thread/`, `attachments/`, `focus-sessions/`,
  `interrogate/` (belief entities, evidence, proposals, snapshot),
  `clarifications/`.
- Runtime API contracts: five `.api-schema.ts` files (zod) that validate
  jimbo-api responses wholesale — deliberately loose on fields where
  production leads the dashboard (e.g. vault `type`/`grooming_status` accept
  any string; the mapper narrows).
- Cross-cutting vocabulary: `capability.ts` — the dispatch matcher's
  `SkillCapability` union (`frontier`/`fast`/`vision`/`long-context`/
  `local-only`/`cloud-only`) with labels.
- Fixtures + `seed.ts` aggregator, driven through screens by `?seed=1` mode;
  `seed.spec.ts` stress-tests referential integrity and readiness behaviour.
- Generated OpenAPI types: `api-types.generated.ts` (~14k lines, from
  jimbo-api's spec).
- Does NOT own behaviour/services (features do), nor the types still
  colocated under `features/*/utils/*.types.ts` for models/skills/prompts —
  those are explicitly not migrating until it pays.

## Public API

Imported everywhere via the `@domain/*` tsconfig path (~120 feature files plus
shared). Each subdomain exposes a barrel `index.ts`; the load-bearing ones:

- `@domain/ids` — all branded ID types + constructors, `KNOWN_ACTORS`.
- `@domain/vault` — `VaultItem`, `VaultItemType`, `LifecycleState`,
  `GroomingStatus`, payload types; functions `lifecycleState`, `isActive`,
  `isDone`, `computeReadiness`, staleness helpers (`ageInDays`, `staleNorm`,
  `stalenessRatio`, thresholds), `pulseIntensity`, `isStuck`,
  `compareCardsForKanban` + `SORT_OPTIONS`, grooming order/label maps.
- `@domain/capability` — `SkillCapability`, `ALL_CAPABILITIES`,
  `CAPABILITY_LABELS`.
- Per-entity zod schemas (`*.api-schema.ts`) for actors, projects, vault
  items, dispatch, fleet stats.
- `SEED` (plus `VAULT_ITEM_IDS`, `THREAD_MESSAGE_IDS`) from `seed.ts`.
- `api-types.generated.ts` — `paths`/`components` interfaces for the whole
  jimbo-api surface.

Conventions the layer enforces (per `README.md`): string-literal unions over
enums, discriminated unions for events, `satisfies` for fixtures, no classes
or decorators — shapes only.

## Lifecycle

No runtime lifecycle of its own — pure modules evaluated on import. Two
regeneration/verification loops instead:

- `npm run gen:api-types` runs `openapi-typescript` against
  `${JIMBO_API_OPENAPI_URL:-https://jimbo.fourfoldmedia.uk/docs/openapi.json}`
  and overwrites `src/app/domain/api-types.generated.ts` — the types track the
  deployed API, not a local checkout.
- Hand-synced mirrors of jimbo-api code (`KNOWN_ACTORS` ↔
  `schemas/actors.ts`, `clarifications` ↔ `schemas/clarifications.ts` and the
  interpreter's `InterpretedAction`) are updated manually in both repos.
- `seed.spec.ts` plus per-file specs (readiness, staleness, sort,
  transitions, next-action, grooming-ownership, commission-view,
  activity-event, vault-item) run under `ng test` and fail when shapes drift.

## Dependencies

- **Internal**: none outside `src/app/domain/` — self-contained by design.
- **External**: `zod` (the five `.api-schema.ts` contracts only) and `vitest`
  in specs; the one exception to "no runtime deps". `openapi-typescript` is a
  dev-time tool, not an import.
- **jimbo-api**: no HTTP calls, but tight coupling by contract — the OpenAPI
  document for generated types, and the hand-synced schema mirrors above.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — `api-types.generated.ts` (13,993 lines) is imported by
  nothing in `src/` — generated weight with zero consumers so far. Either
  features should start deriving request/response types from it or the
  generation loop is aspirational.
- `2026-07-07` — Hand-synced mirrors acknowledged in-source: `KNOWN_ACTORS`
  ("hand-synced until the monorepo lands", pointing at
  `docs/architecture/phase-b-followups.md` §9b) and
  `clarifications/clarification.ts` ("kept in sync by hand"). Drift is only
  caught by runtime failures, not the compiler.
- `2026-07-07` — The `README.md` folder map is stale: it lists `priorities/`
  and `grooming/` as planned subdomains that don't exist, omits shipped ones
  (`dispatch/`, `interrogate/`, `clarifications/`, `focus-sessions/`,
  `attachments/`, `model-stacks/`), and still marks `vault/` — the largest
  subdomain — as "(future)".
- `2026-07-07` — Several subdomains (`clarifications`, `focus-sessions`,
  `interrogate`) have no fixtures and are absent from `SEED`, so `?seed=1`
  screens and the integrity spec don't exercise them.
