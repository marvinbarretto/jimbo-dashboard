---
# ── REPO MANIFEST — the HOW, for this codebase. ──
repo: dashboard
project: jimbo
role: Angular control-plane UI — the operator's work surface.

# ── Judgment (hand-written; code can't infer these) ──
entry_points: AGENTS.md + .claude/CLAUDE.md (rules), then docs/conventions.md (rationale) and docs/architecture/.
autonomy_level: ship               # override: Marvin's own active-dev repo

# ── Pointer ──
conventions: ./AGENTS.md

# ── Provenance (written by the sync bot, not by hand) ──
synced_at: null
---

## Footguns
- No Tailwind — SCSS / CSS Modules only. Reach for `shared/components/*`
  primitives (UiStack, UiCluster, Chip…) before hand-rolling CSS.
- ReactiveFormsModule only — signal forms are blocked (docs/conventions.md).
- Native control flow only (`@if`/`@for`); OnPush everywhere; `update`/`set`,
  never `mutate`.
- Seed mode: `isSeedMode()` short-circuits services to SEED fixtures — don't
  assume live data in tests.
- `/api/*` is cookie-OR-`X-API-Key`; the dev proxy must send `X-API-Key`
  (failures are 401). The API omits `color_token`.
- Always `.limit()` junction-table queries — PostgREST silently caps at 1000.
- Use `@domain/*` / `@shared/*` path aliases, not deep relative imports.
