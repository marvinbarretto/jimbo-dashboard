# Domain Layer

Canonical TypeScript shapes for every entity in the Jimbo control plane.

This layer intentionally has **no runtime dependencies** — no Angular, no HTTP, no services. It is pure `interface` / `type` / `const` so it can be imported anywhere (features, services, tests, tooling, future backend validators) without dragging framework code along.

## Why this exists

Types come before schemas. We sketch the whole entity graph in TypeScript first, iterate freely, then commit to Postgres only when the shapes have stopped moving. Rebuilding a type costs seconds; rebuilding a migrated table costs hours.

## Folder map

```
domain/
  ids.ts               branded IDs used across every entity
  actors/              who/what can act (marvin, ralph, boris, jimbo, system)
  activity/            append-only log of things that happened
  vault/               (future) vault items — the thing being passed around
  skills/              (future — extends features/skills/utils)
  projects/            (future) long-lived project context
  priorities/          (future) manual + AI priority resolution
  grooming/            (future) readiness workflow state machine
  dispatch/            (future) execution lifecycle for approved work
```

Each subdomain has its own `README.md` with a Mermaid ERD and the rationale for its shape.

## Conventions

### ID type safety — branding (always on)

Every entity ID is a **branded** `string`:

```ts
type ActorId = string & { readonly __brand: 'ActorId' };
```

Branding is a compile-time phantom — zero runtime cost, the value is still just a string. What it buys you is that `SkillId` and `ActorId` are no longer interchangeable:

```ts
function assignToActor(id: ActorId) { ... }
const s: SkillId = skillId('strict-ac-builder');
assignToActor(s);  // ❌ compile error — wrong brand
```

Plain `string` lets that bug silently compile and blow up at runtime. Branding doesn't.

### ID identity value — slug vs UUID (case-by-case)

Branding is orthogonal to **what the underlying string actually is**. The brand is a type tag; the value can be a slug, a UUID, or anything else. Chosen per entity based on who/what reads it.

| Entity           | Value format                        | Why                                                                       |
|------------------|-------------------------------------|---------------------------------------------------------------------------|
| `actors`         | slug (`marvin`, `ralph`, `boris`)   | tiny set, human-named, shows up in logs. `'ralph'` beats `'7f3a-…'` every time |
| `skills`         | slug (`strict-ac-builder`)          | matches directory name in the hermes skills repo — ID and filesystem stay in sync |
| `models`         | slug (`anthropic/claude-sonnet-4-6`)| OpenRouter format, already a string everywhere                            |
| `model_stacks`   | slug (`code-reasoning`)             | named routing profiles                                                    |
| `prompts`        | slug (`ac-builder`)                 | operator-named, referenced by skills                                      |
| `tools`          | slug (`gmail-search`)               | operator-named capabilities                                               |
| `projects`       | slug (`localshout`, `jimbo-hermes`) | few, named, show up in URLs                                               |
| `activity_events`| **UUID**                            | high-volume, generated, no human-facing handle needed                     |
| `vault_items`    | **UUID** + separate `seq` field     | UUID for FKs, `seq` (`#2365`) for operator display — two jobs, two fields |
| `prompt_versions`| **UUID**                            | immutable, generated, referenced by FK only                               |
| `tool_versions`  | **UUID**                            | same as prompt_versions                                                   |
| `thread_messages`| **UUID**                            | high-volume, append-only                                                  |

Rule of thumb: if a human will type it, read it in a log, or put it in a URL, use a slug. If it's machine-generated and only ever referenced through a join, use a UUID.

### Other conventions

**String literal unions over enums.** `type ActorKind = 'human' | 'agent' | 'system'`. Enums create a runtime object and require conversion at API boundaries. String unions serialise to JSON and Postgres cleanly with no mapping layer.

**Discriminated unions for events.** `ActivityEvent` is a union where every member has a `type` literal. TypeScript narrows the payload automatically — no unsafe casts.

**`satisfies` for fixtures.** Use `satisfies` (not `as`) on sample data so shape drift causes a compile error.

**No decorators, no classes.** Just shapes. If you find yourself adding behaviour, it belongs in a service in `features/`, not here.

## Relationship to `features/*/utils/`

Some existing entities (`models`, `skills`, `prompts`, `tools`, `model-stacks`) currently have their types colocated under `features/{name}/utils/{name}.types.ts`. Those files are imported by existing services and components and are **not moving yet** — migrating imports would be churn for no gain. New cross-cutting entities (actors, activity, vault) land in `domain/` straight away. Over time, feature-level type files may be pulled into `domain/` once the shapes stabilise; until then, `domain/` is the home for everything that doesn't have a feature folder yet.
