---
module: thread
repo: dashboard
description: Embeddable per-vault-item conversation thread — comments, questions, and answers with optimistic posting, attachments scaffolding, and a command layer for compound mutations.
source_paths:
  - src/app/features/thread/**
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

# thread

## Purpose

Every vault item carries a conversation: humans and agents leave comments,
agents ask blocking questions, answers resolve them. This feature is that
thread as a reusable widget — not a page. It renders inside the vault item
detail body (v1 and v2) and supplies the message store and command layer
that the questions inbox builds on. Typed message kinds (comment / question
/ answer with `in_reply_to` + `answered_by` chains) are what let the rest of
the dashboard treat "open question" as a first-class, queryable state
rather than a convention buried in comment text.

## Responsibilities

- `ThreadService`: per-item message store (signal map keyed by vault item
  id), `messagesFor`/`openQuestionsFor` computed factories, `loadFor`,
  optimistic `post` with rollback on HTTP failure (including undoing the
  local `answered_by` side-effect), and `markAnswered` (PATCH).
- `ThreadCommands`: application-service layer mirroring `VaultItemCommands`
  — components call it instead of mutating services directly. Owns the
  compound `answerQuestion` (post answer + resolve it in the questions
  feature's index) and validates answer payloads synchronously.
- `ThreadView`: orchestrating component — inputs `vaultItemId`,
  `currentActor`, `actorMap`; effects re-fetch messages on item change and
  batch-load attachments; composes `MessageList` + `MessageComposer`.
- `MessageList`: groups messages so answers nest under their question
  (orphaned answers float top-level), resolves author names/kinds from the
  actor map, renders attachments and "replying to" links.
- `MessageComposer`: reactive form with segmented kind picker; choosing
  "answer" requires selecting an open question via typeahead; client-side
  message ids for optimistic tracking; drag-and-drop / file-picker staging
  of attachments uploaded after the message is emitted.
- `AttachmentsService`: per-message attachment store; batched `loadFor`,
  optimistic `remove` with full-state revert; `upload` currently
  synthesises a client-side blob-URL row (no storage backend yet).
- Does NOT register routes or own the open-questions index (questions
  feature) or the vault items themselves.

## Public API

No routes — component/service surface only:

- `ThreadView` — embedded by
  `vault-items/components/vault-item-detail-body` and
  `vault-item-detail-body-v2`.
- `ThreadCommands` — `post(payload)`, `answerQuestion(payload)` (throws if
  kind ≠ 'answer' or `in_reply_to` missing); used by the questions page.
- `ThreadService` — reads (`messagesFor`, `openQuestionsFor`) are the
  sanctioned direct surface; mutations are meant to go via commands.
- `AttachmentsService` — `attachmentsFor`, `loadFor`, `upload`, `remove`.
- `MessageList` / `MessageComposer` — used within `ThreadView`.

## Lifecycle

Bundled into whichever lazy chunk embeds it (vault-items detail; questions
pulls in the command layer). Services are root-provided signal stores that
live for the app session; message buckets accumulate per visited item.
Posting is optimistic: insert → HTTP → replace with server row, or remove +
toast on failure. Seed mode (`?seed=1`) serves `SEED.thread_messages` /
`SEED.attachments` and skips all HTTP.

## Dependencies

- **API** (`environment.dashboardApiUrl`):
  `GET /api/thread-messages?vault_item_id=`, `POST /api/thread-messages`,
  `PATCH /api/thread-messages/{id}` (answered_by);
  `GET /api/attachments?message_ids=`, `DELETE /api/attachments/{id}`
  (jimbo_pg `thread_messages` table via dashboard-api; Phase C part 3
  replaced the PostgREST scaffold, per service comments).
- **Domain**: `@domain/thread`, `@domain/attachments`, `@domain/actors`,
  `@domain/ids` (branded ids + factories), `@domain/seed`.
- **Features**: `QuestionsService` (`@features/questions`) — injected by
  `ThreadCommands` for the compound answer flow (mutual feature coupling).
- **Shared**: `UiSegmented`, `UiTypeahead`, `EntityChip`, `UiProse`,
  `RelativeTimePipe`, ToastService, seed-mode, `formatBytes`.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — Attachment upload is scaffolding: `upload()` returns a
  synthetic blob-URL row and never hits the API (explicit comment: real
  multipart upload is "a Phase 3 part 3 follow-up"); staged files
  therefore don't survive reload. A `thread-view.ts` comment also notes
  the batch attachments endpoint "404s anyway".
- `2026-07-07` — The convention that mutations go through `ThreadCommands`
  is enforced only by comments ("the path-level lint rule allows them
  through for now"); `ThreadView.onPosted` calls `ThreadService.post`
  directly.
- `2026-07-07` — `ThreadCommands.answerQuestion` never calls
  `ThreadService.markAnswered` (the PATCH); the question row's persisted
  `answered_by` relies on server-side behaviour of the answer POST.
- `2026-07-07` — Client-side message ids are `Date.now()` + `Math.random()`
  slugs, not UUIDs; the server row replaces them on success but a failed
  replace leaves non-canonical ids in the store.
- `2026-07-07` — Better tested than sibling features (5 spec files:
  commands, service, view, list, composer), though `AttachmentsService`
  has no spec.
- `2026-07-07` — `MessageComposer.previewUrl` creates blob object URLs per
  render call and never revokes them (leak-by-design at current scale).
