# Stream row anatomy

> Every thread row in the stream must answer five questions at-a-glance, in any source context.

The dashboard is a diagnostic surface. An operator scanning the firehose should never have to expand a row to learn what a session was, who asked, or whether it worked. If they do, the row is failing its job.

## The five-question template

Every thread head row populates these five slots:

| Slot | Question | Cron session | Telegram session | Future kinds |
|---|---|---|---|---|
| **WHO** | who asked | job name (`commission-worker`) | user (`marvin@telegram`) | service id, agent id, etc. |
| **WHAT** | what was asked | original prompt (pre-wrap) | user's message | request body summary |
| **OUTCOME** | did it work | response, `[SILENT]`, or error | response text | result + status |
| **WITH** | which model | `gpt-4o`, `claude-opus-4-7`, … | same | same |
| **WHY** | why it fired | schedule (`every 5min`) | user message timestamp | trigger reason |

Each slot has a stable visual position in the row. A slot is allowed to be empty (e.g. heartbeats have no meaningful WITH or WHY) but the position is reserved so layouts don't shift.

## Why these five and not others

These are the questions an *operator triaging* asks first. Other useful info — token counts, cost, tool list, retry counts, full payload — is *contextual depth* and belongs in the expanded detail, not the row head.

Things explicitly **not** in the row head:
- Per-tool titles (those live inside the expanded thread)
- Stack traces or error tracebacks (live in detail.error)
- Raw payload JSON (lives in the payload section of detail)
- Internal IDs (correlation_id, task_id, tool_call_id) — surfaced as small affordances at most, not headline content

Things that look like additions but actually fold into the five:
- "Duration" → part of OUTCOME
- "Source" (`hermes` vs other) → part of WHO
- "Tool error count" → part of OUTCOME

## Where the data lives today

Snapshot of the current situation. This table should be updated as new event kinds land or context fields move.

| Slot | Hermes context field | Currently surfaced? |
|---|---|---|
| WHO | `job_name` (cron), `user_id` (telegram) | partially — `user_id` → actor chip; `job_name` was added to ctx but handler doesn't surface it yet |
| WHAT | `message` (telegram), `original_prompt` (cron, *to be added*) | partially — telegram works; cron currently shows the SYSTEM-wrapped prompt |
| OUTCOME | `response`, `error` | yes for response (agent.end title); error surfaces at warn level |
| WITH | `model` (*to be added*) | no — not in any event payload |
| WHY | `schedule_display` (cron), implicit timestamp (telegram) | no for cron |

Items marked "to be added" are tracked in `project_hermes_local_patches.md` once landed.

## Checklist for new event kinds and views

Any time a new event kind is added or a new dashboard view is designed, walk this list:

- [ ] Does the event context populate all five slots, or explicitly opt out with reason in a comment?
- [ ] Does the row template have stable slot positions even when slots are empty?
- [ ] Are filters/sorts aligned with slots (filter by WHO, by OUTCOME, by WITH)?
- [ ] Does drilling into a row reveal the contextual depth without repeating what's already in the head?
- [ ] If this is a per-thread aggregate (multiple events), does the head pick the most informative event for OUTCOME (typically the lifecycle terminator with the most detail — e.g. `agent.end` over `session.end`)?

## How to use this doc

- **When investigating an unhelpful row in the stream**: ask which slot is unfilled and trace where the data should have come from. The fix is usually upstream context enrichment, not dashboard-side parsing.
- **When designing a new feature**: open this doc *before* sketching layout. The five slots constrain the design and make it consistent with the rest of the dashboard.
- **When reviewing a PR that adds an event kind**: run the checklist above as part of review.

## Related

- Runbook: [stream-investigation.md](../runbooks/stream-investigation.md) — investigation loop that produced this principle
- Memory index: this doc is referenced from `MEMORY.md` so future sessions inherit the framing.
