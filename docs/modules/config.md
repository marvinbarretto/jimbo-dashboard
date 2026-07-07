---
module: config
repo: dashboard
description: The /config shell (tabbed hub for projects, skills, models, stacks, actors, settings index) plus the standalone /calendar-settings toggle page.
source_paths:
  - src/app/features/config/**
  - src/app/features/calendar-settings/**
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

# config

## Purpose

Jimbo's registries and knobs live behind one predictable place. `/config` is a
thin tabbed shell that aggregates the entity-registry features (projects,
skills, models, model stacks, actors) plus a settings index, so operator
configuration isn't scattered across the nav. The settings index exists
explicitly for discoverability — each settings domain keeps its own page with
its own shape, and the index just links out. `/calendar-settings` is one of
those pages: it controls which Google calendars Jimbo actually reads when
building briefings and event views (the `calendar_config` structured setting
in jimbo-api).

## Responsibilities

- `ConfigPage`: layout shell only — a `UiTabBar` of router links plus a
  `<router-outlet>`; no data.
- `SettingsIndex`: a static, hand-maintained link-out list (Grooming →
  `/grooming/settings`, Execution → `/execution/settings`, Calendar →
  `/calendar-settings`, Tasks → `/tasks/settings`). Deliberately not a generic
  settings renderer (rationale in a code comment).
- `CalendarSettingsPage`: merges the Google calendar list with saved config
  into owned vs read-only rows; per-calendar `enabled` and `potential`
  toggles; optimistic local state with a 300ms debounced full-config PUT,
  in-flight-save cancellation, rollback to last server-confirmed state on
  failure, and toast feedback.
- Does NOT own the tab contents — projects/skills/models/model-stacks/actors
  are separate features lazy-loaded as children. Does NOT interpret calendar
  config semantics (jimbo-api's calendar module does).

## Public API

Routes:

- `/config` → `ConfigPage` shell (`config.routes.ts`), children:
  `''` → redirect `projects`; `projects`, `skills`, `models`, `model-stacks`,
  `actors` (each `loadChildren` into the sibling feature's routes);
  `settings` → `SettingsIndex`.
- Top-level redirects in `app.routes.ts`: `/actors` → `/config/actors`,
  `/projects` → `/config/projects` (but `/projects/:id` stays a standalone
  project landing route).
- `/calendar-settings` → `CalendarSettingsPage` (top-level in
  `app.routes.ts`, outside the `/config` subtree).
- `CalendarSettingsService` exports `calendars`/`config` signals and
  `saveConfig()`, plus the `CalendarEntry`/`CalendarItemConfig`/
  `CalendarConfigValue` types.

## Lifecycle

Everything is lazy-loaded; no guards beyond the app-wide 401 redirect
interceptor. `CalendarSettingsService` is `providedIn: 'root'` and fires both
GETs eagerly at first injection (`toSignal` subscribes immediately); a 404 on
`/api/calendar/config` is coerced to an empty config. The page seeds its local
editable state from the config signal via an `effect` + `untracked`, and
cleans up its debounce timer and in-flight save subscription on destroy.

## Dependencies

- **jimbo-api endpoints**: `GET /api/google-calendar/calendars`,
  `GET /api/calendar/config`, `PUT /api/calendar/config` (full-blob upsert of
  the structured setting). The config feature itself calls nothing — its
  children own their own data access.
- **Other features**: projects, skills, models, model-stacks, actors (route
  composition only); links target grooming/execution/tasks settings pages.
- **Shared**: `UiTabBar`, `UiToggle`, `UiBadge`, `UiBackLink`, `UiPageHeader`,
  `UiSection`, `UiStack`, `UiEmptyState`, `UiLoadingState`, `UiButtonLink`,
  `ToastService`.
- **Domain models**: none from `src/app/domain`; calendar types are local to
  the service.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — Triple manual sync surface: the tab list in `ConfigPage`'s
  template, the children of `config.routes.ts`, and the `SETTINGS_ENTRIES`
  links in `SettingsIndex` are three hand-maintained lists that must agree
  with each other and with external feature routes.
- `2026-07-07` — `/calendar-settings` sits outside the `/config` subtree; the
  code comment in `settings-index.ts` acknowledges this ("calendar settings in
  particular lives outside /config entirely") and papers over it with a link
  rather than moving the route.
- `2026-07-07` — Calendar save is last-write-wins on the whole config blob;
  the debounce + in-flight cancellation handles a single browser tab, but
  concurrent editors would clobber each other (inherent to the PUT-full-blob
  API shape).
- `2026-07-07` — No tests: zero spec files in either feature dir; the e2e
  suite covers sibling tabs (skills, models, model-stacks) but not the shell,
  the settings index, or calendar settings.
