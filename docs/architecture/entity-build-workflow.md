# Entity Build Workflow

How a new domain entity moves from conversation through prototype to real Angular code. Apply consistently across every entity.

## The five stages

```
drafted → iterating → decided → implemented → (archived)
```

### 1 · drafted

- Entity has been discussed enough to know its rough shape.
- A halfway-fidelity prototype is written at `public/prototypes/{entity}.html`.
- The prototype has numbered hotspots pointing at specific elements, with an adjacent discussion panel listing the questions/issues/decisions that each hotspot raises.
- No types committed yet — the prototype is the conversation anchor.

**Done when:** prototype exists and renders; discussion panel is populated with open questions.

### 2 · iterating

- Discussion happens in conversation, referencing hotspots by number.
- As decisions land, the prototype is **updated in place**.
- Resolved hotspots move from the live discussion column to a **"Decisions log"** section at the bottom of the prototype. History preserved, current state readable at a glance.
- New hotspots get added as new questions emerge.
- Types in `src/app/domain/{entity}/` are written and refined alongside the prototype.
- The whiteboard (`docs/architecture/whiteboard.md`) captures derived implications (new deferred concepts, killed ideas, new principles).

**Never:**
- Version filenames (`vault-item-v2.html`). Git history is the versioning mechanism.
- Freeze the prototype in its draft state. Stale wireframes mislead.

**Done when:** every hotspot is either resolved or explicitly deferred.

### 3 · decided

- All hotspots resolved or deferred to the whiteboard.
- Prototype reflects the agreed shape.
- `domain/{entity}/*.ts` types are stable and type-check clean.
- Whiteboard row for this entity is flipped to `built` (for types) or otherwise accurate.
- `public/prototypes/index.html` status flipped to `decided`.

**Done when:** the entity is ready for implementation with no open design questions blocking.

### 4 · implemented

- Dispatch a **subagent** (Sonnet 4.6 — code-scaffolding is in its sweet spot; Opus is wasteful for pattern-following work) to build the real Angular feature under `src/app/features/{entity}/`.
- The feature mirrors an existing one (`features/models/` is the reference template) exactly.
- Types are imported from `domain/{entity}/` — the feature folder does NOT redefine them.
- The prototype stays put — it is now the **design record**, not throwaway scaffolding.
- Index status flipped to `building` during dispatch, then `built` when done.

**Subagent brief must include:**
- Reference to `domain/{entity}/` (read-only for the subagent)
- Reference to the prototype HTML (as UX spec)
- Reference to the whiteboard (for scope — what's in, what's deferred)
- Reference to the pattern to mirror (an existing feature folder)
- Backend state note (whether jimbo-api has the endpoint yet; if not, service scaffolds the pattern regardless and a short JSDoc comment notes the gap)
- Exact list of files to create
- Non-goals: do not modify domain types, do not polish UI, do not write component tests beyond the existing feature's pattern

**After dispatch:** verify the agent's output matches the brief before marking done. Agent summaries describe intent, not always execution.

### 5 · archived (optional)

If an entity is later replaced or heavily reshaped:
- Move the old prototype to `public/prototypes/_archive/`.
- Leave a pointer in the archived file noting its successor.
- The whiteboard gets a `killed` row explaining why.

## Why this works

- **Prototypes as shared visual context.** Text conversation about data models gets abstract fast. A halfway-fidelity component gives both parties something concrete to point at.
- **Decision trail preserved.** The "Decisions log" section at the bottom of each prototype answers future-you's question *"why did we build it this way?"* without needing git archaeology.
- **No premature implementation.** Skipping the prototype stage loses the visual anchor and tempts shape-locking before conversation finishes.
- **No stale wireframes.** Updating in place means the prototype always reflects current intent; the Decisions log holds the history.
- **Cheap model for mechanical work.** Sonnet scaffolds the feature from a stable spec; Opus's expensive reasoning is reserved for ambiguous design moments.

## Files involved

| artifact | role |
|---|---|
| `public/prototypes/{entity}.html` | visual anchor + decisions log |
| `public/prototypes/index.html` | lifecycle status of every prototype |
| `src/app/domain/{entity}/` | authoritative types |
| `docs/architecture/whiteboard.md` | project-wide concept tracker (deferred ideas, kills, principles) |
| `src/app/features/{entity}/` | implementation (built only when decided) |

## Related

- [`whiteboard.md`](whiteboard.md) — concept tracker
- `public/prototypes/index.html` — prototype registry
