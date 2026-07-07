---
module: stream
repo: dashboard
description: Live system-event firehose over SSE — correlation-threaded, day-grouped event timeline with an error-class panel and stale-cron-job detection/trigger.
source_paths:
  - src/app/features/stream/**
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

# stream

## Purpose

Jimbo is mostly autonomous — Hermes agents, cron jobs, and tool calls run on
the VPS without Marvin watching. The stream page is the ops console: a live
Server-Sent-Events feed of `system_events`, grouped into threads by
`correlation_id` so an agent session reads as one expandable row rather than
a scatter of tool calls. Two side panels turn "watching" into "acting": an
error-aggregation panel that classes recent warn/error events for drill-down,
and a stale-cron detector that flags jobs the scheduler should have ticked
but didn't, with a manual trigger button.

## Responsibilities

- `StreamService`: own the `EventSource` connection to
  `environment.streamUrl` (`/stream/system-events`) — `hydrate` event replaces
  the buffer, `live` events append (capped at 1000); relies on the browser's
  built-in SSE reconnect.
- `StreamPage`: filtering (source, correlation-id, debug-level and chatty-kind
  toggles), thread building (chronological rows, `agent.end` preferred as the
  head row for its outcome slot), day grouping by thread end time,
  per-thread/per-event expansion, tool-call cascade parsing from the
  `tool_name [status] — message` title format, payload field extraction, and
  nested-error surfacing from fetched detail blobs.
- `EventDetailService`: on-expand fetch of full events (detail + payload are
  deliberately absent from the live summary stream), with a 256-entry
  insertion-order cache invalidated via a version signal.
- `ErrorAggregationService`: poll recent `level>=warn` events every 30s,
  compact tracebacks, group into error classes keyed on the first 80 chars of
  `tool_name: error`, filter out approval-required prompts, keep a sample
  event/cid per class for drill-down.
- `CronJobsService` + `CronJobNamePipe`: stale-job detection (overdue by more
  than half the estimated period, 2-min floor, 30-min flat tolerance for
  never-run jobs), session-id → cron-job resolution
  (`cron_<JOBHASH>_…`), and manual triggering.
- Does NOT own the jobs poll itself (delegated to `HermesService`) or event
  emission (hermes/jimbo-api).

## Public API

Route: `/stream` → `StreamPage`, registered in `src/app/app.routes.ts`.

Exports used across the feature (and importable elsewhere): `StreamService`
(`connect`/`disconnect`, `events`/`status`/`lastError` signals, the
`SystemEventSummary` type), `EventDetailService` (`load`, `entry`, `version`,
`SystemEventFull`), `ErrorAggregationService` (`start`/`stop`/`refresh`,
`classes`, `totalErrors`), `CronJobsService` (`staleJobs`, `byId`,
`jobForSessionId`, `triggerJob`, re-exported `HermesJob`,
`jobIdFromSessionId`), and the impure `cronJobName` pipe.

## Lifecycle

Lazy `loadComponent` route, no guards. `StreamPage.ngOnInit` calls
`StreamService.connect()` and `ErrorAggregationService.start()`;
`ngOnDestroy` disconnects/stops both, so nothing runs while the page is
closed. `CronJobsService` (root-provided) starts a 30s wall-clock tick in its
constructor — cleared via `DestroyRef` — so overdue labels keep climbing
between job polls; the job list itself rides `HermesService`'s existing 10s
poll rather than opening a second one. `EventDetailService.load` is fired
lazily when a row is expanded.

## Dependencies

- **jimbo-api endpoints**: SSE `GET /stream/system-events`
  (`environment.streamUrl`); `GET /api/events?level=warn&limit=500`
  (aggregation); `GET /api/events/{id}` (detail). Cron trigger goes through
  `HermesService.trigger(jobId)` (hermes feature, `/api/hermes/*`).
- **Other features**: `hermes` (`HermesService`, `HermesJob` type);
  `vault-items` (`VaultItemsService.items()` to resolve
  `ref_type='vault_note'` refs to seq + title).
- **Shared**: chip/entity-chip, ui-badge, ui-cluster, ui-page-header,
  ui-stack, ui-empty-state, `relativeTime`.
- **Config**: `environment.streamUrl`, `environment.dashboardApiUrl`.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — No tests: zero `*.spec.ts` under `features/stream`, despite
  dense pure logic (staleness detection, error compaction/classing, thread
  grouping, tool-title parsing) that is highly unit-testable.
- `2026-07-07` — Fragile string couplings to upstream formats, each flagged
  in source comments: tool-cascade parsing depends on the hermes title regex
  `name [status] — message`; approval detection at the summary layer falls
  back to a `⚠️` emoji prefix; `compactError` mirrors the server's
  `_compact_error` by hand.
- `2026-07-07` — `DEFAULT_HIDDEN_KINDS` (`heartbeat`, `tool.pre`,
  `tool.post`) is an acknowledged stopgap until hermes marks these
  `level='debug'` — comment says to remove entries as the emitter is fixed.
- `2026-07-07` — `StreamPage` is a ~590-line component owning filtering,
  threading, formatting, and payload-extraction helpers; extraction of the
  thread-building logic would make it testable.
- `2026-07-07` — `cronJobName` is `pure: false` by documented choice (signal
  lookup map); cheap today, but a per-row impure pipe scales with stream
  volume.
