# Mobile Shell

**Decision (Aug 2026):** the phone surface for logging is a curated Angular shell
in this repo, loaded by the `jimbo-app` Capacitor WebView. Not a second React
build in `gym`, not Compose screens.

This **reverses** `jimbo-app/docs/vision.md` ("not a replacement for the
dashboard — that stays as the deep review/management surface") and shortcuts
`jimbo-app/docs/gym-pwa-migration.md` phases 2, 3 and 5. Those docs were
updated Aug 2026 and carry supersession notes pointing here — along with
`plugin-roadmap.md`, `native-ui-roadmap.md`, `CLAUDE.md` and `README.md`.

## Relationship to the native Compose home

The native home shell (`4db8b54`) stays, and stays the launcher. Its unique
value is passive context — activity recognition, Health Connect, usage stats —
which no web surface can reach. It just stops being a doorway to the gym PWA
and becomes the router into `/m` tabs: the Compose home decides *what's
relevant now*, the Angular Today tab renders the content. Briefing therefore
lives in `/m`, not as a native view (superseding migration phase 3) — one
implementation, deep-linked from native and from notification actions.

---

## Why here and not `gym`

The tracker primitives (`shared/components/tracker*`, `ui-tracker-day-group`,
`ui-quick-add-row`, `ui-period-pager`, `ui-period-totals`) are schema-driven and
already generalise across nutrition, exercise and project-work. Rebuilding them
in React to chase where the WebView happens to point is backwards — the WebView
pointer is one line in `capacitor.config.ts`, and `window.__JIMBO_BRIDGE__` is
injected into whatever page loads, so the native plugins follow.

Performance was the open question. It doesn't favour Vercel:

- Initial payload is ~122 KB gzipped (114 KB JS + 8 KB CSS); the other 322
  chunks are lazy. The 96 routes cost nothing until visited.
- Caddy already does `encode gzip zstd`, serves the bundle as static files from
  the same host as `/api` — so data calls are same-origin, one hop.
- `gym` pages are `force-dynamic` fetching jimbo-api server-side, so every
  launch is phone → Vercel fn → VPS → back. Edge buys nothing when the data
  lives on the VPS.
- Only a static SPA can be service-worker cached (or bundled as Capacitor
  `webDir`) for a zero-network cold launch. `gym` structurally cannot.

## Shape

Layout routes: `app.routes.ts` has two `path`-level parents, and the root
component is a bare `<router-outlet>` + toast stack. `/m` loads `MobileShell`
(bottom tab bar); everything else nests under `DesktopLayout` (header, section
tabs, gutter) with paths unchanged. The router picks the shell, so neither
surface renders — or even loads — the other's chrome, and the desktop-only
eager services (auth check, actors/projects lookups) don't fire in the
WebView. Tabs share only the tracker primitives and data-access services with
the desktop routes.

Three tabs:

| Tab | Path | Owns |
|---|---|---|
| **Home** | `/m/today` | glance strip, the day's shape, launcher, quick log |
| **Log** | `/m/log` | nutrition day ledger — food, drink, supplements |
| **Train** | `/m/train` | exercise day ledger + live session |

Home keeps the `today` path: paths are the cross-repo contract with jimbo-app,
labels are not. Renaming one still means changing the Kotlin side in the same
breath.

Home is four fixed slots whose *contents* change with the day — glance strip,
one card for what's happening now, a launcher, and the quick-log grid in the
thumb zone. The structure never moves, so it stays muscle memory. It is built
around what actually gets typed into this phone daily: food and drink, three to
six times, overwhelmingly repeats.

Two rules keep it safe to use one-handed:

- **Launcher tiles navigate; they never log.** They render as anchors, so the
  "go somewhere" affordance is structurally incapable of writing data.
- **One-tap logging lives only in the quick-log grid**, and every tap is
  undoable from its toast (`createUsualLogger`, so `/m/log` inherits it).
  Duplicate logs in the wild are mistaps, not a broken guard — a real second
  pint is a real second tap — so the fix is a way back, never a debounce.

The grid is ranked by time of day (`rankUsualsForDaypart`) from a 30-day
histogram of the log itself: breakfast surfaces in the morning, drinks after
six. `/api/coach/food-log/frequent` only ranks all-time frequency, so the
daypart rule is client-side and unit-tested rather than a server round trip —
which also puts the rule most likely to need tuning where tuning is a one-line
change and a test.

Capture is a launcher tile, not a FAB or a tab: Telegram → hermes `/food`
already handles zero-friction capture and raw capture speed was explicitly
*not* a pain point. The shell's job is correcting, structuring, and showing
data back.

## Delivery

`server.url` → the dashboard `/m`, plus an Angular service worker. Keeps OTA
updates (no Gradle build to ship a UI change) with near-instant launch after
first load. Bundling into the APK is faster still but ties every tweak to a
release — revisit only if launch latency actually bites.

## Auth — decided

`/api/*` and `/stream/*` are cookie-OR-`X-API-Key`, app-gated. Native hands the
shell the credentials it already holds in BuildConfig, via a new `AuthPlugin`
(spec'd in `jimbo-app/docs/plugin-roadmap.md`, priority 0):

```ts
getApiCredentials(): Promise<{ apiKey: string; apiUrl: string; deviceId: string }>
```

Chosen over cookie-persist: no expiry to handle, no login screen in the
WebView, reuses the existing plugin pattern. The key ships in the APK either
way, so this doesn't widen the blast radius meaningfully.

Angular side: an `HttpInterceptor` resolving credentials once at bootstrap,
attaching `X-API-Key` **only** to same-origin `/api` requests, never logging
it, and falling back to cookie auth when `bridge.has('auth')` is false — so
the same build still works in a desktop browser. `/stream/*` stays cookie-only:
SSE rides `EventSource`, which cannot set request headers. Any future `/m` tab
that wants the live stream must solve that first (cookie bootstrap or a
query-token endpoint), not assume the key is attached.

Build order: the plugin is the one hard dependency for the WebView cutover, so
it lands in Phase 0 alongside the shell skeleton.

## Sequencing

Ordered by stated pain — correcting entries, seeing data back, live sets.
Status as of Aug 2026:

0. ✅ **Shell skeleton** — layout routes (`MobileShell` / `DesktopLayout`),
   bottom tab bar, safe-area handling, `AuthPlugin` built on both sides.
   Service worker deferred to phase 3 below.
1. ✅ **Nutrition ledger** (`/m/log`) — today's food + supplements, sheet
   editing via the tracker primitives, shared `createLedgerWriters`.
2. ✅ **Live gym session** (`/m/train`) — start/finish, optimistic
   "same again" on the aggregated `sets` count, history prefills via the
   shared `ExerciseSessionRow`, vibration feedback.

3. ✅ **Cutover** — Caddy serves `/m` + hashed assets uncookied (`@mShell`
   block; the WebView never sees a login page, data stays behind `/api`
   auth); APK rebuilt with `AuthPlugin`, verified on-device.
4. ✅ **Service worker + manifest** — ngsw, lazy chunk caching, no /api
   dataGroup; `SwUpdateService` checks on resume and applies while hidden.
5. ✅ **Today tab** — briefing day-plan + mood/energy check-in.
6. ✅ **Infographics** — 7-day kcal strip on Log, volume strip on Train
   (`weekAxis` + UiBarChart at phone height).
7. ✅ **Demote `gym`** — parity verified (gym's client posts a subset of the
   dashboard's fields to identical endpoints), `capacitor.config.ts` default
   now `https://jimbo.fourfoldmedia.uk/m`; gym keeps coach chat, voice and
   history in the browser.
8. ✅ **Home** — the Today tab rebuilt as the four-slot home: glance strip,
   the day's shape, an 8-tile launcher, and the daypart-ranked quick-log grid,
   with undo on every one-tap log. Path and REUSE_TAB key unchanged.

9. ✅ **The NOW card** — Home's second slot is one card at a time, chosen
   **state-first**: a running focus session wins in *any* daypart, then the
   evening close-out (day-checks with a "~25s left" cost estimate), then the
   morning's shape, then a quiet idle line. `selectNowCard()` owns the
   priority; the container's `@switch` renders one of three dumb cards.
   `buildDayShape()` normalises `suggested_blocks` → `priorities` → `day_plan`,
   so the card renders whichever briefing schema the API wrote.

10. ✅ **`/api/live-status`** — one 60s visibility-gated poll (`liveStatusResource()`,
    types mirrored in `domain/live-status/`) fills three things at once: the
    glance strip's steps and next event, the attention row, and the Fleet
    badge. Its `focus` is a *code* session, not a pomo, which is why the NOW
    card uses `FocusSessionsService` instead; its `upcoming[].time` is UTC, so
    the glance counts down from `in_minutes`. The attention row is a `<nav>`,
    never `aria-live` — a live region would re-announce the same counts every
    minute. `blockers[]` (22 on the live call) and `vault_pulse.inbox_count`
    (163) are deliberately unrendered: an always-on badge trains dismissal.

Next horizon (not yet scheduled):

- **Answering day-checks on Home.** The close-out card counts and prices them
  but hands off to `/evening` to answer; it is a pull surface by design.
- **The "sync broken" attention row** — no clean REST signal for it today;
  needs the Telemetry plugin wrapper.
- **Steps freshness.** `/api/live-status` reported `today.steps: 34` at 17:11
  London. If the server figure is routinely hours behind, the glance strip's
  steps source flips to the native `HealthSnapshot` plugin — `buildGlance`
  already takes `deviceSteps` and prefers the larger of the two.
- **`planned_seconds` on the session PATCH** — until then the focus card's
  pause and extend carry you to `/pomo/running` rather than acting in place.
- **A plan-acceptance endpoint.** The shape card renders read-only: there is
  nowhere for "looks right ✓" to go, and a localStorage tick would look like
  agreement the briefing never hears about.
- Offline write queue, native home deep-links, real icons.
- `/m/capture` and `/m/close-day`, so the "New item" and "Close day" tiles stop
  borrowing `/m/log` and the desktop `/evening` page.

## API readiness

No backend blockers. Full CRUD already exists for everything the shell needs:

```
POST GET / PATCH DELETE   /api/coach/food-log{,/manual,/{id}}
GET / POST / PATCH DELETE /api/coach/supplement-log{,/manual,/{id}}
POST GET / PATCH DELETE   /api/gym/sessions{,/{id}}
GET                       /api/gym/sessions/active
POST                      /api/gym/sessions/{id}/sets
PATCH DELETE              /api/gym/sets/{id}
```

## Risks

- **Two nav trees in one app.** Tracker components must stay presentation-only;
  no `/m` awareness leaking into shared primitives.
- **The phone now rides dashboard deploys** (`npm run release`, tags, rsync).
- **Write parity before demoting `gym`.** The dashboard exercise ledger and gym
  write the same tables, and `gym_session_sets` stores an aggregated `sets`
  count — confirm the mobile flow round-trips identically before pulling gym
  out of the WebView.
