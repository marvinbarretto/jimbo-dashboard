---
module: jimbo-workspace
repo: dashboard
description: Read-only JSON dump of the Jimbo Google account (marvinbarretto.labs@gmail.com) — mail, calendar, and tasks tabs over the account=jimbo API endpoints.
source_paths:
  - src/app/features/jimbo-workspace/**
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

# jimbo-workspace

## Purpose

Jimbo (the agent) has its own Google account — `marvinbarretto.labs@gmail.com`
— separate from Marvin's personal one, giving the autonomy stack a workspace
it can own (its own inbox, calendar, task lists). This feature is the
inspection window: a deliberately raw, read-only dump of what jimbo-api can
see through that account, so Marvin can verify OAuth wiring, watch what lands
in Jimbo's inbox, and debug the multi-account (`?account=jimbo`) plumbing
without curl. It is a diagnostic surface, not a product UI — the page
subtitle says so ("read-only API dump").

## Responsibilities

- `JimboWorkspacePage`: shell with a `UiTabBar` (Mail / Calendar / Tasks) and
  a `router-outlet`; hardcodes the account identity in the header.
- Three tab containers (`JimboWorkspaceMail`, `JimboWorkspaceCalendar`,
  `JimboWorkspaceTasks`), each rendering two `ApiSection` panels whose titles
  are the literal request lines (e.g.
  `GET /api/google-mail/messages?account=jimbo&hours=720&limit=25`) and whose
  bodies are `<pre>{{ data | json }}</pre>`.
- `JimboWorkspaceService`: thin read-only wrappers over the six Google
  endpoints, all pinned to `?account=jimbo`, returning `unknown` — no typing,
  no transformation.
- `ApiSection<T>`: generic loading/error/ok panel that subscribes to a
  caller-supplied `Observable` input and projects the success payload into a
  content-child `ng-template`.
- Does NOT own Marvin's-account Google views (mail/api-data features),
  account switching, or any write path — there are no mutations here.

## Public API

Route: `/jimbo-workspace` lazy-loads `jimboWorkspaceRoutes`
(`jimbo-workspace.routes.ts`): `''` (shell) with children `''`→redirect
`mail`, `mail` → `JimboWorkspaceMail`, `calendar` → `JimboWorkspaceCalendar`,
`tasks` → `JimboWorkspaceTasks`.

`JimboWorkspaceService` methods: `mailProfile()`, `mailMessages(limit=25)`
(hours pinned to 720), `calendars()`, `events(days=14)`, `taskLists()`,
`tasks(listId='@default')` — all `Observable<unknown>`. `ApiSection` inputs:
`title` (string), `source` (`Observable<T>`); requires exactly one projected
`TemplateRef` with `$implicit: T`.

## Lifecycle

Fully lazy (`loadChildren` in `app.routes.ts`, `loadComponent` per tab), no
guards. Each tab container creates its observables as field initializers
(cold `HttpClient` GETs); `ApiSection` subscribes via
`toObservable(source) → switchMap → toSignal`, emitting `loading` →
`ok|error` per source. Requests therefore fire when a tab is activated and
re-fire on each re-visit (new component instance, no caching). No polling,
no teardown logic needed beyond subscription disposal by `toSignal`.

## Dependencies

- **jimbo-api endpoints** (all with `?account=jimbo`):
  `GET /api/google-mail/profile`, `GET /api/google-mail/messages`
  (`hours=720&limit=25`), `GET /api/google-calendar/calendars`,
  `GET /api/google-calendar/events?days=14`, `GET /api/google-tasks/lists`,
  `GET /api/google-tasks/tasks?listId=@default`.
- **Shared**: only `UiTabBar`; the feature ships its own `ApiSection` under
  `shared/api-section/` rather than using the app-wide load helpers.
- **Domain models**: none — payloads stay `unknown` end to end.
- **Config**: `environment.dashboardApiUrl`.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — No tests: zero `*.spec.ts` under
  `features/jimbo-workspace`.
- `2026-07-07` — The account slug (`ACCOUNT = 'jimbo'`), the email address in
  the shell header, and per-endpoint parameters (hours=720, days=14,
  `@default` list) are all hardcoded; acceptable for a single-account
  diagnostic page, stops being fine if a third account appears.
- `2026-07-07` — The identical `.dump`/`.dump__json` style block is
  copy-pasted across all three tab components — an obvious extraction into
  `ApiSection` or a shared class.
- `2026-07-07` — `ApiSection.state` is a deliberately non-discriminated
  union (source comment: template type-checker can't narrow across separate
  `state()` calls), so `data`/`error` are optional rather than typed by
  status.
