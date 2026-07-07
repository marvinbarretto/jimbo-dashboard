---
module: dispatch-review
repo: dashboard
description: The awaiting-review queue — the human output gate where completed commission work (PR or doc) is approved to done or sent back for rework.
source_paths:
  - src/app/features/dispatch-review/**
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

# dispatch-review

## Purpose

Agent commissions don't get to mark their own work done. When a dispatch
completes (a PR opens, a doc lands), the underlying vault note parks in an
"awaiting review" state and surfaces here for Marvin's verdict: approve
(note → done) or send back with a reason (note → `needs_rework`). This is the
smallest feature of the board suite by design — a single read-and-clear pile,
the commission flow's human output gate, complementing `approveForDispatch`
(the input gate) on the grooming side.

## Responsibilities

- `ReviewService`: root signal store over the awaiting-review endpoint.
  Loads `{items, total}` into `ReviewItem` rows (snake_case wire →
  camelCase, keyed by `note_id` for optimistic removal), exposes
  `items`/`isLoading`, and clears rows via two optimistic-remove mutations:
  `approve(item)` and `sendBack(item, reason)` — both drop the card
  immediately and restore it with a toast if the POST fails.
- `ReviewBoard`: renders the pile as cards (title/seq, assignee badge, skill,
  result summary as prose, PR link + state when present), with a manual
  Refresh button, per-card Approve, and Send back — the reason is collected
  via `window.prompt` and required to be non-blank.
- Does NOT own the dispatch queue itself (execution feature), the review
  state transitions server-side (jimbo-api owns what approve/send-back do to
  the note), or any vault-item store interaction — it never touches
  `VaultItemsService`; the reviewed note's state change becomes visible
  elsewhere only after that store's next load.

## Public API

Routes (`dispatch-review.routes.ts`, mounted at `/review`):

- `/review` → `ReviewBoard` (title "Awaiting Review")

Nothing else imports from this feature; `ReviewService` and `ReviewItem` are
consumed only by its own container.

## Lifecycle

Lazy `loadChildren` at `/review` in `app.routes.ts`; no guards.
`ReviewService` is root-provided and fetches once in its constructor; there
is no polling — freshness after the initial load is operator-driven via the
Refresh button (which re-runs `load()` and flips the loading signal).

## Dependencies

- **jimbo-api** (all under `environment.dashboardApiUrl`):
  - `GET /api/dispatch/awaiting-review` → `{ items, total }`
  - `POST /api/dispatch/review/approve` `{ note_id }`
  - `POST /api/dispatch/review/send-back` `{ note_id, reason }`
- **Domain**: none — the feature defines its own `ApiReviewItem`/`ReviewItem`
  shapes locally rather than using `@domain/*` models or branded ids.
- **Shared**: `withOptimisticRemove`, `ToastService`, and ui primitives
  (stack, page-header, card, button, badge, empty-state, prose).

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from observable
evidence only.

- `2026-07-07` — Zero test files in the feature (no `*.spec.ts` under
  `src/app/features/dispatch-review/`), including the wire-shape adapter and
  both optimistic mutations.
- `2026-07-07` — Send-back reason is collected with `window.prompt` — no
  minimum length, no app-styled dialog. Contrast with the vault reject flow,
  which enforces ≥12 chars and composes a thread message; a review send-back
  accepts any non-blank string.
- `2026-07-07` — No wire validation: the service types the GET response but
  does not Zod-parse it, unlike the sibling dispatch/fleet/projects services
  which all validate at the boundary (`safeParse` + toast on mismatch).
- `2026-07-07` — Untyped local shapes: `note_id`/`dispatch_id` are plain
  strings rather than `@domain/ids` branded types, and `prState` is a free
  string — drift from the conventions the rest of the board features follow.
- `2026-07-07` — No seed-mode branch (every other board service checks
  `isSeedMode()`), so offline UI work renders this board empty or errored.
- `2026-07-07` — One-shot load with no polling or cross-store sync: approving
  here does not update the vault-items store's copy of the note, and new
  review arrivals appear only on manual refresh.
