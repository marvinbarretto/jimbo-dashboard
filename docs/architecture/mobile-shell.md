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

A `/m` route group with its own layout — bottom tab bar, no side nav, no
breadcrumbs, no desktop chrome. Lazy-loaded, sharing only the tracker
primitives and data-access services with the desktop routes.

Three tabs plus a FAB:

| Tab | Owns |
|---|---|
| **Today** | briefing, day checks, the glance surface |
| **Log** | nutrition day ledger — food, drink, supplements |
| **Train** | exercise day ledger + live session |
| FAB | quick capture |

Capture is a FAB, not a tab: Telegram → hermes `/food` already handles
zero-friction capture and raw capture speed was explicitly *not* a pain point.
The shell's job is correcting, structuring, and showing data back.

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
attaching `X-API-Key` **only** to same-origin `/api` and `/stream` requests,
never logging it, and falling back to cookie auth when `bridge.has('auth')` is
false — so the same build still works in a desktop browser.

Build order: the plugin is the one hard dependency for the WebView cutover, so
it lands in Phase 0 alongside the shell skeleton.

## Sequencing

Ordered by stated pain — correcting entries, seeing data back, live sets.

0. **Shell skeleton** — `/m` route group, bottom-nav layout, service worker,
   Capacitor repoint, auth decision. Nothing user-visible; unblocks everything.
1. **Nutrition ledger** — read-only rows + bottom-sheet edit. The pattern
   already won in the `/ui-lab` nutrition-mobile wireframe; extract it.
2. **Live gym session** — the one genuinely new component. Big tap targets, set
   repeat, haptics via the bridge. `/api/gym/sessions/active` exists for this.
3. **Infographics** — day/week rollups sized for a phone, not shrunk desktop
   charts.
4. **Today / briefing tab.**
5. **Demote `gym`** — pull it out of the WebView; it keeps coach chat, voice
   logging and session history as a browser surface.

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
