# Foundry — Runtime Architecture

Resolves: vault item `note_fc02a269` (Foundry runtime architecture — BLOCKER).
Date: 2026-05-18.

This doc locks the five questions blocking every Foundry build task. Subsequent items (rendering pipeline, Telegram delivery, usage ledger, wireframe overhaul) target the contract defined here.

---

## TL;DR

Foundry runs as a **separate pm2-managed process** on the VPS (alongside `jimbo-api`), in a **new `foundry` repo**. It calls `jimbo-api` over HTTP for vault writes, cost logging, and Telegram delivery — reusing `ai-models.ts`, `costs.ts`, and the existing `telegram` service. OpenRouter is invoked via jimbo-api's existing chat-completion path, not a Foundry-local wrapper. Auth via `OPENROUTER_API_KEY` already in `/opt/jimbo-api.env`.

---

## 1. Host & process model

**Decision: separate pm2 process on the VPS, named `foundry`.**

- Lives at `/home/jimbo/foundry/` (sibling to `~/jimbo-api/`).
- Managed by the same pm2 instance that runs jimbo-api.
- `~/foundry/ecosystem.config.cjs` mirrors jimbo-api's pattern: loads env from `/opt/foundry.env`, exponential backoff on restart, fork mode, single instance.
- `pm2 reload foundry` for zero-downtime deploys.
- pm2 logs at `~/.pm2/logs/foundry-out.log` and `~/.pm2/logs/foundry-error.log`.

### Why not the other options

- **Inside jimbo-api** — rejected. Mixes API request/response semantics with long-running agent loops. A Foundry crash in shared-process mode would take the API down. Different lifecycle, different risk profile.
- **As a Hermes job** — rejected. Hermes is for "task execution" cron primitives; Foundry has run-id state, multi-step pipelines, and explicit pause/resume on cost-cap. Hermes's known failure modes (null `next_run_at`, stuck `state=running`) would compound Foundry's own failure surface.

### Run loop

- Foundry runs continuously as a long-lived Node process (not a cron-fired script). Internal scheduler:
  - **Generation cycle** every N minutes (initial: 30 min; tunable via env).
  - Before each cycle: check kill-switch (today's $ spend vs daily cap).
  - If healthy: pull inputs → synthesize → critique → render → notify.
  - Sleep until next cycle.
- Process death recovers via pm2's `restart_delay` + `exp_backoff_restart_delay`. State lives in jimbo-api (vault, costs table), not in Foundry's memory.

---

## 2. Repo location

**Decision: new repo `foundry` at `github.com/marvinbarretto/foundry`.**

- Clean boundary from jimbo-api (which is the HTTP surface) and dashboard (which is the UI).
- Foundry is the only repo whose code runs as an autonomous agent — deserves its own lifecycle.
- Language: TypeScript (matches jimbo-api; reuses types where useful via npm install of a published types package or direct HTTP contract).
- Deploys to VPS by pulling on the VPS (same model as jimbo-api: git pull, `npm ci`, `pm2 reload foundry`).

### Repo skeleton (v0)

```
foundry/
├── src/
│   ├── index.ts            # entrypoint, registers pm2 ready signal, starts loop
│   ├── loop.ts             # the generation cycle
│   ├── inputs/             # vault, gmail, google-tasks, jimbo-api context fetchers
│   ├── synthesis/          # synthesis primitive + critique pass
│   ├── render/             # proposition → wireframe HTML / code spike
│   ├── deliver/             # Telegram send via jimbo-api
│   └── ledger.ts           # wraps jimbo-api cost POSTs
├── ecosystem.config.cjs    # pm2 config (mirrors jimbo-api pattern)
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. OpenRouter client + model registry

**Decision: do not build a Foundry-local OpenRouter wrapper. Reuse jimbo-api.**

jimbo-api already has:

- `src/services/ai-models.ts` — typed model registry with four tiers (`free`, `fast`, `balanced`, `powerful`), `chatCompletion(tier, messages, opts)` function, returns `{ content, model, usage: { input, output } }`.
- `src/schemas/costs.ts` + `src/routes/costs.ts` — persisted cost ledger (provider, model, task_type, tokens, estimated_cost, notes) with summaries by-model / by-task / by-day.
- `OPENROUTER_API_KEY` already in `/opt/jimbo-api.env`.

### Integration shape

Two options for Foundry to invoke chat completions:

- **(A)** Add a new HTTP endpoint `POST /api/ai/chat` to jimbo-api that wraps `chatCompletion()` and emits a cost row in the same transaction. Foundry calls it. **Preferred** — keeps OpenRouter auth + cost ledger in one place, and any future caller (dashboard, dispatch, another agent) reuses it.
- **(B)** Foundry calls OpenRouter directly with its own `OPENROUTER_API_KEY`, then POSTs to `/api/costs` after each call. Tolerable but doubles the auth surface and risks cost-ledger gaps if Foundry crashes between the OpenRouter call and the cost POST.

**Decision: (A).** Add `POST /api/ai/chat` to jimbo-api as part of the runtime-architecture follow-up. Foundry calls it. Cost row is written atomically with the completion.

### Model selection (per-step routing)

Foundry's step → tier mapping (initial; revisit after first week of operation):

| Step                | Tier       | Model (current registry value)    | Rationale                                        |
|---------------------|------------|-----------------------------------|--------------------------------------------------|
| Input filter        | `free`     | `google/gemini-2.5-flash`          | High volume, low stakes, classification          |
| Synthesis           | `balanced` | `anthropic/claude-sonnet-4-6`      | Quality matters; cost matters; the sweet spot   |
| Critique (Reflexion)| `fast`     | `google/gemini-2.5-flash`          | Cheap, fast — just a scoring pass               |
| Render-spec         | `balanced` | `anthropic/claude-sonnet-4-6`      | Specifying a wireframe needs structure          |
| Code spike (rare)   | `powerful` | `anthropic/claude-opus-4-6`        | Reserved for high-conviction outputs            |

Decision: lives in Foundry's repo as a constants file referencing tier names; tier-to-model mapping stays in jimbo-api's `ai-models.ts` (single source of truth).

---

## 4. Auth

**Decision: env-file pattern mirroring jimbo-api.**

- `/opt/foundry.env` holds Foundry's runtime secrets. Root-owned, `0600`, jimbo-readable (or mirror jimbo-api's exact perms).
- Required keys (initial):
  - `JIMBO_API_URL=http://localhost:3100` (Foundry calls API locally on the VPS)
  - `JIMBO_API_KEY=<set>` (same scheme as everywhere else)
  - `TELEGRAM_BOT_TOKEN=<set>` — if Foundry sends Telegram directly; if via jimbo-api `telegram` service, not needed
  - `FOUNDRY_DAILY_USD_CAP=5.00` — kill-switch threshold
  - `FOUNDRY_CYCLE_MINUTES=30` — generation cycle period
  - `FOUNDRY_SCRATCH_REPO=git@github.com:marvinbarretto/foundry-scratch.git` — where rendered artifacts get committed
- **OpenRouter key NOT in foundry.env** — Foundry calls jimbo-api which holds it. Single auth surface.
- Rotation: same as jimbo-api — edit env file on VPS, `pm2 reload foundry`. Never committed.

---

## 5. Isolation from Hermes

**Decision: completely separate. No shared filesystem, no shared scheduler, no shared logs.**

- Hermes lives at `~/.hermes/` and runs its own Python scheduler. Foundry lives at `~/foundry/` and runs its own Node loop. They are unaware of each other.
- Failure independence:
  - Hermes crash → no Foundry impact.
  - Foundry crash → no Hermes impact.
  - Both crash → only the API stays up; manual recovery for each.
- Future cross-talk (e.g. Hermes job triggering a Foundry cycle on event arrival) goes through jimbo-api HTTP, not direct.
- Naming: every Foundry log line, every vault item it creates, every cost row uses `foundry` (or `jimbo-autonomous`) as the identifier. Never overlaps with `hermes`.

---

## "Hello world" smoke test

Minimal proof the substrate works, runnable before any real synthesis code lands:

```bash
# On the VPS, after git pull + npm ci:
cd ~/foundry
pm2 start ecosystem.config.cjs
pm2 logs foundry --lines 50
# Expected output: "foundry: heartbeat #1, daily $ used: $0.00 / $5.00 cap, next cycle in 30m"
```

The v0 entrypoint just needs to:
1. Read env, validate `JIMBO_API_KEY` and `JIMBO_API_URL`.
2. GET `$JIMBO_API_URL/api/health` to confirm reachable.
3. GET `$JIMBO_API_URL/api/costs?period_days=1` to read today's spend (cost ledger already exists).
4. Log heartbeat. Sleep `FOUNDRY_CYCLE_MINUTES`.
5. Repeat. No LLM calls yet.

Once this loop runs cleanly under pm2 for 24h, the substrate is proven and the next item (unit-of-output decision → /wireframe overhaul → rendering pipeline) is unblocked.

---

## Decisions summary

| Question                          | Answer                                                                                                  |
|-----------------------------------|---------------------------------------------------------------------------------------------------------|
| Where on the VPS does Foundry run?| pm2 process named `foundry`, fork mode, single instance, exp-backoff restart                            |
| Repo location?                    | New repo `github.com/marvinbarretto/foundry`, deployed at `~/foundry/` on VPS                            |
| OpenRouter client?                | Reuse jimbo-api's `ai-models.ts` via a new `POST /api/ai/chat` route; Foundry never holds the OR key    |
| Auth?                             | `/opt/foundry.env` (jimbo-api pattern); contains JIMBO_API_KEY + Foundry runtime config; no OR key      |
| Isolation from Hermes?            | Total. Separate dir, separate scheduler, separate logs, communication only via jimbo-api HTTP            |

---

## Follow-up vault items (to be filed after this doc lands)

- **jimbo-api task**: Add `POST /api/ai/chat` route that wraps `ai-models.chatCompletion()` and writes a cost row atomically.
- **foundry task**: Bootstrap `~/foundry/` repo skeleton with v0 heartbeat loop (the smoke test above).
- **foundry task**: Provision `/opt/foundry.env` on VPS with initial config values.
- **foundry task**: Create `foundry-scratch` GitHub repo as the destination for rendered artifacts.
