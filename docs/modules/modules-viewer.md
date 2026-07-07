---
module: modules-viewer
repo: dashboard
description: Read-only viewer for jimbo-api module docs — index and detail pages with computed staleness badges.
source_paths:
  - src/app/features/modules/**
generated_at: 2026-07-07
reviewed_commit: "75df27c"
sections:
  purpose: asserted
  responsibilities: asserted
  public-api: derived
  lifecycle: derived
  dependencies: derived
  tech-debt: asserted
---

# modules-viewer

## Purpose

Makes the module-docs freshness contract visible. jimbo-api serves its
`docs/modules/*.md` with staleness computed from git (`reviewed_commit` vs
commits touching `source_paths`); this feature renders that so a stale doc
*looks* stale — warning badge, "N commits behind", the exact commits and files
to re-read — instead of quietly presenting possibly-wrong prose as truth.

## Responsibilities

- `/modules` index: one row per module doc with description and staleness
  badge, stale-first ordering, serving-checkout `head` + repo in the header.
- `/modules/:module` detail: freshness banner (fresh / stale / unverified)
  above everything else, evidence when stale (commits since review, changed
  files), metadata (generated_at, reviewed_commit, source_paths), and the
  rendered markdown body.
- Does NOT own the staleness computation (jimbo-api does, from git) and does
  NOT edit docs — read-only by design; the repo is the source of truth.

## Public API

- Routes (`modules.routes.ts`, lazy under `modules` in `app.routes.ts`):
  - `''` → `ModulesList`
  - `':module'` → `ModuleDetail`
- `ModuleDocsService` (root-provided): signals `modules`, `head`, `isLoading`,
  `error`; methods `reload()`, `getDoc(module): Observable<ModuleDoc>`.
- `ModuleStalenessBadge` — the single fresh/stale/unverified badge mapping,
  shared by list and detail (feature-internal).
- Types in `data-access/module-doc.ts`, hand-mirrored from jimbo-api's
  `src/schemas/module-docs.ts`.

## Lifecycle

Lazy-loaded route group registered in `app.routes.ts` (`loadChildren`).
`ModuleDocsService` fetches `GET /api/modules` in its constructor (first
injection); the detail page fetches `GET /api/modules/:module` per navigation
via `paramMap` → `switchMap`, deliberately uncached so staleness stays live.
No guards, interceptor wiring, or startup hooks beyond the shell's defaults.

## Dependencies

- **Internal**: shared UI components (`ui-page-header`, `ui-badge`, `ui-card`,
  `ui-section`, `ui-meta-list`, `ui-stack`, `ui-breadcrumb`, `ui-loading-state`,
  `ui-empty-state`), `MarkdownPipe` (+ global `.markdown-body` styles from
  `src/styles/_markdown.scss`), `formatPageTitle` from the app shell.
- **External**: jimbo-api `GET /api/modules` and `GET /api/modules/:module`
  via `environment.dashboardApiUrl` (same-origin, dev proxy / Caddy); `marked`
  indirectly through `MarkdownPipe`.

## Technical Debt

- `2026-07-07` — No seed-mode branch (`isSeedMode()` / `SEED`), unlike skills
  and vault-items: there is no module-docs seed fixture yet, so offline UI
  work hits HTTP and shows the error state. Acceptable while the feature is
  read-only and low-churn.
- `2026-07-07` — Types are hand-mirrored from jimbo-api zod schemas instead of
  `api-types.generated.ts`; regenerate via `npm run gen:api-types` once the
  deployed OpenAPI spec includes `/api/modules`, then swap.
- `2026-07-07` — Not linked from `nav-config.ts`; reachable only by URL.
  Deliberate: adding the nav entry touches `shared/**` and belongs with a
  considered nav placement, not this feature commit.
