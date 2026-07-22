---
module: app-shell
repo: dashboard
description: Bootstrap and chrome for the Jimbo dashboard — providers, root route table, session-auth wiring, title strategy, global styles, and environments.
source_paths:
  - src/app/app.ts
  - src/app/app.html
  - src/app/app.scss
  - src/app/app.spec.ts
  - src/app/app.config.ts
  - src/app/app.routes.ts
  - src/app/app-title-strategy.ts
  - src/app/features/auth/**
  - src/main.ts
  - src/index.html
  - src/styles.scss
  - src/styles/**
  - src/environments/**
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

# app-shell

## Purpose

The startup skeleton every feature hangs off: one place that boots Angular,
registers every top-level route lazily, wires session-cookie auth, and owns the
persistent chrome (topbar, primary nav, toast stack) plus the global design
tokens. Features stay layout-agnostic because the shell owns the page gutter,
header height, and section accent — one knob each, applied app-wide.

## Responsibilities

- Bootstrap (`src/main.ts` → `appConfig` → `App` root component).
- The full top-level route table (`app.routes.ts`) — every feature is
  lazy-loaded from here; nothing else registers root routes.
- Auth chrome and wiring: `AuthService` (who am I / sign out) and
  `authRedirectInterceptor` (bounce to `/auth/login` on API 401 — Caddy's SPA
  gate only checks the `jimbo_session` cookie *exists*, not that it's valid).
- Browser tab titles via `AppTitleStrategy` (`<route title> · Jimbo`).
- Global styles: CSS reset, dark/light theme tokens (`:root` /
  `[data-theme="light"]`), page layout modes (`basic` gutter vs `page-bleed`),
  and the shared partials in `src/styles/` (breakpoints, utilities, markdown,
  board layout, staleness gradient).
- Eager-loading shared lookup data (actors, projects) at startup so mention
  dropdowns and pickers are never empty on first open.
- Does NOT own any feature's pages, nav item definitions (those live in
  `shared/components/nav/nav-config.ts`), or the dev proxy (repo root).

## Public API

- `routes` (`app.routes.ts`) — ~30 top-level entries, all `loadComponent` /
  `loadChildren`: `today` (default redirect from `''`), `vault-items`,
  `grooming`, `execution`, `review`, `fleet`, `picture`, `questions`,
  `config`, `projects/:id`, `briefings`/`briefing/:id`, `mail-next` /
  `mail-activity(/:gmailId)` (Discord/search deep-link target), `hermes`,
  `stream`, `pomo`, `nutrition`, `exercise`, `journal`,
  `shopping`, `tasks`, `jimbo-workspace`, `modules` (module-docs viewer),
  `calendar-settings`, `coverage`,
  `activity/:id`, `context/:id`, plus dev surfaces (`ui-lab` with ~40 child
  sections, `test-forms`, `test/epic-cards`). Legacy redirects: `actors` →
  `config/actors`, `projects` → `config/projects`.
- Providers (`app.config.ts`): `provideZonelessChangeDetection()`,
  `provideBrowserGlobalErrorListeners()`, `provideHttpClient(withFetch(),
  withInterceptors([authRedirectInterceptor]))`, `provideRouter(routes,
  withInMemoryScrolling(...))`, `{ provide: TitleStrategy, useClass:
  AppTitleStrategy }`, `provideCharts(withDefaultRegisterables())`.
- `AppTitleStrategy` + exported `formatPageTitle(label)` helper.
- `AuthService` (root-provided): signals `currentUser`, `isAuthenticated`,
  `isChecked`; methods `check()`, `logout()`.
- CSS contract for features: `--app-gutter`, `--app-header-height`,
  `--section-accent` (set from the active primary-nav item's accent), the
  `page-bleed` host class opt-out, and `router-outlet + * { display: block }`.

## Lifecycle

1. `src/index.html` mounts `<app-root>`; `src/main.ts` calls
   `bootstrapApplication(App, appConfig)`.
2. Providers register: zoneless change detection, HttpClient (fetch) with the
   401-redirect interceptor, the router (anchor scrolling + scroll-to-top),
   title strategy, ng2-charts registerables.
3. `App` construction eagerly injects `AuthService` (fires `GET /auth/me`),
   `ActorsService` and `ProjectsService` (constructor HTTP loads), plus
   `ThemeService` and `CommandShortcutsService` from shared.
4. On every `NavigationEnd`, `App` recomputes `sectionAccent` from the first
   URL segment and exposes it as `--section-accent` on `.app-shell`.
5. The interceptor is scoped tight: only real 401s, only `/api/*` requests,
   never while already on `/auth/*` — redirects to
   `/auth/login?return=<path>` (server-rendered login, outside the SPA).
6. Builds swap `src/environments/environment.ts` via `fileReplacements`
   (`.development.ts` for dev serve, `.prod.ts` for production).

## Dependencies

- **jimbo-api**: `GET /auth/me`, `POST /auth/logout` (cookie credentials);
  every `/api/*` call flows through the interceptor. Environments define
  `dashboardApiUrl: ''` (same-origin prefix, dev proxy / Caddy route it) and
  `streamUrl: '/stream/system-events'` (SSE).
- **Internal**: shared `Nav`/`nav-config`, `ToastStack`, `ThemeService`,
  `CommandShortcutsService`; features `actors`/`projects` data-access.
- **Third-party**: `@angular/{core,router,common,platform-browser}`, rxjs,
  `ng2-charts` (chart.js); `styles.scss` imports `@angular/cdk`
  overlay-prebuilt CSS and flatpickr CSS (incl. monthSelect plugin).

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — Test coverage is two smoke tests in `app.spec.ts` (component
  creates, router outlet renders). `AuthService`, `authRedirectInterceptor`,
  and `AppTitleStrategy` have no specs (consistent with the repo's
  E2E-preferred convention, but the interceptor's loop-avoidance logic is
  pure enough to unit test).
- `2026-07-07` — Dev/test surfaces ship in the production route table:
  `test/epic-cards`, `test-forms`, and the ~40-section `ui-lab` tree are
  registered unconditionally (all lazy, so cost is route-table noise, not
  bundle weight).
- `2026-07-07` — `environment.ts` and `environment.development.ts` are
  byte-identical apart from a comment, and `dashboardApiUrl` is `''` in all
  three files — the dev/prod distinction currently only flips `production`;
  comments still describe the retired Hono `:3201` sidecar routing.
- `2026-07-07` — `--app-header-height: 88px` in `app.scss` is a hand-measured
  magic number with a "update if the header changes" comment — sticky
  descendants silently misalign if header metrics drift.
