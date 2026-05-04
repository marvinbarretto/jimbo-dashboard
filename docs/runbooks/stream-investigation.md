# Stream investigation runbook

How we turn an error in the dashboard's stream into a fix that's deployed and validated. The dashboard is a *diagnostic surface* — its job is to make real bugs visible. The work isn't styling; it's surface → trace → root-cause → patch → deploy → validate, on a loop.

> Every investigation should also pass the row-anatomy lens: see [`docs/design/stream-row-anatomy.md`](../design/stream-row-anatomy.md). If a row in the firehose can't answer WHO/WHAT/OUTCOME/WITH/WHY at-a-glance, the row itself is part of what needs fixing — usually upstream, by enriching event context.

## The loop

```
  surface         see something wrong in the stream firehose
     │
     ▼
  classify       is it deterministic (infra) or stochastic (agent slip)?
     │
     ▼
  trace          query the events table for the full session — don't guess
     │
     ▼
  root-cause     read the source for the offending tool / script / handler
     │
     ▼
  patch          smallest reversible change; commit on the right repo
     │
     ▼
  deploy         restart the affected service
     │
     ▼
  validate       watch the stream — does the failure class go to zero?
     │
     ▼
  capture        memory or doc, so the next iteration starts informed
```

## Two error classes — different responses

**Class 1: infrastructure bugs** — same input → same failure, every time.
- Recur as long as inputs hit the path
- Fix shape: patch upstream, deploy, validate. The error rate goes to zero.
- Example: `JSONDecodeError: Invalid control character at column 20001` whenever a tool result exceeded 50KB. Caused by `terminal_tool.py` splicing a literal `\n\n` into mid-string content.

**Class 2: agent script errors** — LLM writes wrong Python in a sandbox.
- Each instance is a different mistake; identical recurrences are rare
- The agent usually self-corrects on retry
- Fix shape: prompt engineering, stub-API affordances, or just track the rate. There is no single line to patch.
- Example: `TypeError: the JSON object must be str, bytes or bytearray, not dict` because the agent forgot to extract `result['output']`.

The dashboard's error panel currently buckets both classes together. Treat them differently when responding: Class 1 is a *defect*, Class 2 is *background noise to monitor*.

## Trace — query, don't guess

The dashboard renders truncated views. The events table has the truth (subject to its own truncation — see "known truncation points" below).

Connect via the VPS Postgres shell — the SSH tunnel is often down:

```bash
ssh vps "sudo -u postgres psql jimbo_pg -A -F'|' -P pager=off -c \"<query>\""
```

The events you want, by session, in chronological order:

```sql
SELECT id, ts, source, kind, level,
       payload->>'tool_name'  AS tool,
       payload->>'status'     AS status,
       LEFT(title, 80)        AS title
FROM system_events
WHERE payload->>'session_id' = '<session_id>'
   OR correlation_id = '<session_id>'
ORDER BY ts ASC;
```

Aggregate error classes over the last 24h:

```sql
SELECT
  CASE
    WHEN payload->>'error' LIKE '%JSONDecodeError: Invalid control character%' THEN 'JSONDecodeError: control-char'
    WHEN payload->>'error' LIKE 'TypeError: the JSON object must be str%'      THEN 'TypeError: dict-not-str'
    WHEN payload->>'error' LIKE 'TypeError%'                                   THEN 'TypeError: other'
    WHEN payload->>'error' LIKE '%JSONDecodeError%'                            THEN 'JSONDecodeError: other'
    ELSE 'other'
  END AS error_class,
  COUNT(*), MIN(ts), MAX(ts)
FROM system_events
WHERE level IN ('error','warn')
  AND payload->>'tool_name' = 'execute_code'
  AND payload->>'status'    = 'error'
  AND ts > now() - interval '24 hours'
GROUP BY 1
ORDER BY count DESC;
```

Read the actual stored bytes, not just the displayed string — the dashboard and jimbo-api both truncate:

```sql
SELECT id, octet_length(detail), octet_length(payload::text)
FROM system_events WHERE id IN (...);
```

## Root-cause — three possible homes for a bug

| Symptom | Likely home |
|---|---|
| Deterministic exception in tool result | `hermes-agent/tools/*.py` (third-party fork on VPS) |
| Title formatting / event shape | `hub/hermes/plugins/system-events-tools/__init__.py` (owned) |
| Wrong route, missing endpoint | `jimbo-api` repo |
| Render anomaly only | dashboard repo (this one) |

Source paths to know:

- **Hermes runtime (third-party):** `/home/jimbo/.hermes/hermes-agent/` on the VPS — clone of `https://github.com/NousResearch/hermes-agent`. Local commits live only on VPS; see `project_hermes_local_patches.md` memory.
- **Hermes config (owned):** `/Users/marvinbarretto/development/hub/hermes/`, pushed to VPS via `hermes-push.sh`.
- **Dashboard API + UI:** this repo.

## Patch — match scope to risk

| Change shape | Reversibility | Where to commit |
|---|---|---|
| One-line fix in third-party hermes-agent | Reset commit, restart | VPS git checkout (local commit on `main`); add a memory entry |
| Owned hermes plugin | Edit, push, restart | `hub/hermes/`, `./hermes-push.sh`, restart `hermes-gateway` |
| Dashboard API/UI | Edit, dev-server, deploy | this repo, normal git flow |
| Postgres trigger / schema | Migration | `db/migrations/` (forward-only) |

Default to the smallest patch that addresses the deterministic failure mode. Architectural improvements (e.g. envelope returns instead of in-string truncation) come after the symptom is gone and we can think clearly.

## Deploy — restart the right thing

| What changed | Restart |
|---|---|
| `hermes-agent/tools/*.py` | `ssh vps "sudo systemctl restart hermes-gateway"` |
| `hub/hermes/plugins/...` (after `hermes-push.sh`) | `ssh vps "sudo systemctl restart hermes-gateway"` |
| `jimbo-api` | `ssh jimbo "sudo systemctl restart jimbo-api"` (jimbo has narrow NOPASSWD for this) |
| dashboard API | redeploy via Vercel / your normal flow |

Always verify after restart:

```bash
ssh vps "sudo systemctl is-active hermes-gateway && \
         sudo systemctl status hermes-gateway --no-pager -n 5"
```

## Validate — watch the right signal

After patching a Class 1 bug, the failure class should drop to **zero new occurrences** going forward. The pre-fix instances stay in history; that's expected.

```sql
SELECT COUNT(*) FROM system_events
WHERE payload->>'error' LIKE '<error pattern>'
  AND ts > '<patch time>';
```

Or in the dashboard: open the **Recent error classes** panel, refresh, look for the class. If a new one appears, the patch missed something or there's a sibling failure mode.

## Known truncation points

When investigating, remember: every layer truncates. Read the stored bytes when something is suspicious.

- **`hermes_tools.terminal()`** — caps captured stdout at 50KB; head 20K + tail 30K, splice notice in the middle. ⚠ Patched 2026-05-04 (`258fe8ea8`) to remove control chars from notice; structural problem (mid-content splice corrupts JSON) remains.
- **System events emit** — `_compact_error` reduces tracebacks to last line, capped at 200 chars (`PAYLOAD_ERROR_LIMIT`). Args + result truncated at 400 / 500 chars by `_walk_truncate`.
- **jimbo-api event detail** — appears to truncate `result.output` further before storage; markers like `…(+12070)` indicate bytes lost. Search the `system_events.detail` `octet_length` to see what's actually stored.
- **NOTIFY payload** — bound to ~8KB by Postgres; only `id, ts, source, kind, actor, title, level, ref_type, ref_id, correlation_id` are streamed live. Everything else requires `/api/events/:id`.

## Worked example: 2026-05-04 — the 20001-column JSONDecodeError

1. **Surface.** A `tool.post` event with `JSONDecodeError: Invalid control character at: line 1 column 20001 (char 20000)` showed up in the stream. Operator pasted it for review.
2. **Classify.** Column 20001 was suspicious — that's a deterministic byte boundary, not a content artifact. Flagged as Class 1 candidate.
3. **Trace.** Queried events for the session: agent ran `terminal('jimbo-api email-reports 50')`, output was 397KB, then Python `json.loads` exploded. Verified the source CLI output at byte 20000 was ordinary ASCII, not a control char.
4. **Root-cause.** Read `terminal_tool.py:1488-1497`. The truncation block keeps first 20000 chars (`int(50000 * 0.4)`) + tail 30000, splices a notice starting with literal `\n\n`. JSON forbids unescaped control chars in strings; 20001 is exactly where the notice begins. Deterministic.
5. **Patch.** One-line: replace `\n\n…\n\n` with `space…space` in the notice. Committed locally on the VPS hermes-agent (`258fe8ea8`).
6. **Deploy.** `sudo systemctl restart hermes-gateway`. Service active in 2s.
7. **Validate.** Watched the error-classes panel. Pre-patch: 1 instance at 14:35. Post-patch (1h+): zero recurrences. Patch holds.
8. **Capture.** Memory entry `project_hermes_local_patches.md` noting the local-only commit. This runbook entry.
9. **Iterate.** Next event in the stream was a `TypeError: dict-not-str` — different class entirely (Class 2 agent slip). Self-recovered. Updated this doc to make the two classes explicit.

## Worked example: 2026-05-04 — cron sessions invisible to dashboard

1. **Surface.** User received Telegram messages from the agent but the corresponding sessions weren't appearing in the stream.
2. **Classify.** Suspected hidden filters (Class 2-style display issue) — but data showed something deeper: the *events themselves* were missing for cron sessions.
3. **Trace.** Queried events by session_id: cron sessions had `tool.pre`/`tool.post` but no `agent.start`/`agent.end`/`session.start`/`session.end`. Most recent agent.end was 24h old (from a Telegram session). All cron tool events had `correlation_id=null`.
4. **Root-cause.** Read `gateway/run.py` and `cron/scheduler.py`: the gateway path fires `await self.hooks.emit("agent:start"|"agent:end", ...)` around message handling; the cron path calls `agent.run_conversation(prompt)` directly with no hook firing. Cron entirely bypasses the hook system.
5. **Patch.** Asked: symptom fix (direct `events.emit` from scheduler.py) or architectural fix (plumb hook registry through cron path)? Chose architectural — same handler runs for both paths, no duplication.
   - `gateway/run.py`: `_start_cron_ticker(stop_event, adapters, loop, hooks=None, interval)`; pass `hooks=runner.hooks` into the cron thread kwargs.
   - `cron/scheduler.py`: `tick(...hooks=None)` → `run_job(job, hooks, loop)` → fires `session:start`, `agent:start` before `agent.run_conversation`, then `agent:end`, `session:end` after success or in exception path. Cross-thread emission via `asyncio.run_coroutine_threadsafe(..., loop).result(timeout=10)` since cron is a daemon thread, hooks are async on the gateway loop.
   - `hub/hermes/hooks/system-events/handler.py`: bumped `agent.end` to `level="warn"` when `context.error` is set, so cron failures hit the dashboard error panel.
6. **Deploy.** Two new VPS-only commits in hermes-agent (`4f4276de3`); pushed handler change via `hermes-push.sh`; restarted gateway.
7. **Validate.** Watched events table: next cron firing produced full lifecycle (`session.start → agent.start → tool.pre/post → agent.end (with auto-computed duration) → session.end`) with `correlation_id` populated throughout. Dashboard threads work, error panel surfaces cron failures, response text appears as agent.end title.
8. **Capture.** Memory entry updated. This runbook entry.

Key insight: when the symptom is "events missing for one path", the right fix is usually plumbing the existing observability mechanism through that path, not synthesising parallel emission.

## When to stop iterating

A loop iteration is done when:
- The Class 1 failure class has zero new occurrences for a meaningful window (hours, not minutes).
- A memory or doc entry has been written for anything non-obvious.
- Architectural follow-ups (e.g. envelope-return instead of in-string truncation) are either filed or scoped out.

Bugs that don't recur don't need to be chased. Time spent on Class 2 individual instances is usually wasted; track the rate instead.
