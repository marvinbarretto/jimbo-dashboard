---
module: mail
repo: dashboard
description: Email triage pipeline surfaces — raw dataset explorer (mail-next), live activity list over email_reports, and the per-email deep-link detail page.
source_paths:
  - src/app/features/mail/**
  - src/app/features/mail-activity/**
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

# mail

## Purpose

Jimbo's mail watcher runs an autonomous triage pipeline over Marvin's Gmail
(discover → body fetch → gate → LLM verdict → optionally a vault note). These
two features make that pipeline observable: `mail-activity` is the operator
view — a live, auto-refreshing list of `email_reports` rows showing each
email's progress and verdict, with a detail page that serves as the deep-link
target for email search results minted by jimbo-api (Hermes/Discord links).
`mail` (the "Mail Next" page) is a rougher dataset explorer that dumps the
pipeline table, Gmail profile, and raw Gmail side by side for debugging the
ingest itself.

## Responsibilities

- Render recent `email_reports` rows with per-stage progress markers
  (D/B/G/V), keep/toss verdict badges, verdict rationale, body preview, and a
  link to the resulting vault note when one exists (UUID resolved to a `seq`
  via `VaultItemsService`).
- Poll `/api/emails/reports` every 30s while the activity page is mounted
  (`MailActivityService.start()`/`stop()` around a `setInterval`).
- Serve the email deep-link route: `EmailDetail` fetches one report by
  `gmail_id` — the key jimbo-api's `resolveDeepLinkKey` uses in search
  results.
- `MailNextPage` shows three generic `MailDatasetCard`s that fetch an
  arbitrary endpoint and heuristically render rows/summary/raw JSON.
- Does NOT own the pipeline itself (jimbo-api + watcher cron), vault note
  rendering (vault-items feature), or the `/mail` explorer page (that lives
  in `api-data`).

## Public API

Routes (all registered directly in `src/app/app.routes.ts`):

- `/mail-next` → `MailNextPage` (`features/mail`)
- `/mail-activity` → `MailActivityPage` (`features/mail-activity`)
- `/mail-activity/:gmailId` → `EmailDetail` — email deep-link target

Exports consumed elsewhere: `MailActivityService` and its `EmailReport` /
`EmailVerdict` types (a mirror of jimbo-api's `EmailReportSchema`; stage
timestamps double as queue markers). `MailDatasetCard` takes an
`EndpointConfig` input (`title`/`path`/`params`) plus `rowsLimit`.

## Lifecycle

All three routes are lazy `loadComponent` entries, no guards.
`MailActivityService` is `providedIn: 'root'` but only polls while the page
drives it: `ngOnInit` → `start()` (immediate fetch + 30s interval),
`ngOnDestroy` → `stop()`. `MailDatasetCard` fetches once in `ngOnInit` with a
manual Reload button — no polling. `EmailDetail` uses the shared `loadOne`
helper: the route-param signal becomes a URL signal, refetched on change.

## Dependencies

- **jimbo-api endpoints**: `GET /api/emails/reports?limit=50` (list),
  `GET /api/emails/reports/{gmail_id}` (detail); mail-next additionally hits
  `GET /api/google-mail/profile` and `GET /api/google-mail/messages`
  (hours=24, limit=30) via `JimboDataService`.
- **Other features**: `api-data` (`JimboDataService`, `EndpointConfig` type);
  `vault-items` (`VaultItemsService.getById` for note-seq resolution, relies
  on that service's board load having populated its list).
- **Domain**: `vaultItemId` brand from `src/app/domain/ids`.
- **Shared**: ui-page-header, ui-badge, ui-refresh-control, ui-prose,
  ui-stack/section/card, loading/empty states, `relativeTime`, `loadOne`.
- **Config**: `environment.dashboardApiUrl` as the API base.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — No tests: zero `*.spec.ts`/`*.test.ts` under
  `features/mail` or `features/mail-activity` (heuristics like
  `MailDatasetCard`'s row/column inference and the verdict/stage mapping are
  untested).
- `2026-07-07` — `MailDatasetCard` guesses payload shape from a hardcoded
  preferred-key list (`items`, `messages`, `events`, …) and a hardcoded
  row-id key list — new endpoint shapes silently fall into the "No
  structured data" branch.
- `2026-07-07` — Vault-note links on the activity page depend on
  `VaultItemsService` having loaded the full item list; unresolved notes
  degrade to a dead "→ note" span rather than fetching the note by id.
- `2026-07-07` — `EmailDetail` renders `body_text` with an inline
  `style="white-space: pre-wrap"` attribute rather than component styles —
  minor, but it bypasses the SCSS convention used elsewhere.
