---
module: questions
repo: dashboard
description: Cross-vault inbox of open (unanswered) thread questions assigned to Marvin, with inline answering that resolves them in place.
source_paths:
  - src/app/features/questions/**
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

# questions

## Purpose

Agents working vault items (Boris, grooming, recon) leave questions on item
threads that block progress until Marvin answers. Per-item threads make
those questions easy to miss, so this feature inverts the view: one page
listing every open question across the whole vault — filtered to the current
actor — with enough item context (source, project, hierarchy, age) to answer
without opening the item, and a reply composer that marks the question
answered on the spot. It's the "what is the system waiting on me for?" inbox.

## Responsibilities

- `QuestionsService`: fetch the open-questions index from
  `/api/thread-messages/open-questions` (optionally `?assigned_to=`),
  expose `openQuestions` as a computed over a signal store, and provide
  `markAnswered` — a session-local optimistic update that filters an
  answered question out of the index.
- `QuestionsPage`: load on init scoped to `CURRENT_ACTOR_ID`, newest/oldest
  sort toggle, and delegate posted answers to `ThreadCommands.answerQuestion`
  (the thread feature's compound command that posts the answer AND marks
  the question resolved here).
- `QuestionCard`: render one `OpenQuestionView` with author resolution via
  `ActorsService`, item context via `VaultItemsService` (source label,
  parent/children hierarchy, project, created/updated), a link to the vault
  item, and a toggleable `QuestionReplyComposer` — synthesising the
  `ThreadMessage` shape the composer expects.
- Does NOT post messages itself — writes go through the thread feature's
  command layer; this feature only maintains the read index.

## Public API

Lazy-loaded at `/questions` in `app.routes.ts` (`questionsRoutes`): a single
route `` → `QuestionsPage`. Linked from the shared nav
(`shared/components/nav/nav-config.ts`).

`QuestionsService` (root) is consumed by the thread feature's
`ThreadCommands`: `openQuestions` (computed, filters `answered_by === null`),
`loading`, `load(assignedTo?)`, `markAnswered(questionId, answerId)`.

## Lifecycle

Lazy route, no guards. Data loads in `ngOnInit` on every visit (unlike the
constructor-loaded config stores) — the index refreshes per navigation.
Seed mode (`?seed=1`) synthesises `OpenQuestionView`s by joining
`SEED.thread_messages` against `VaultItemsService.items()`. Answer flow:
composer emits → `ThreadCommands.answerQuestion` → `ThreadService.post`
(HTTP) + `QuestionsService.markAnswered` (local only) → the card's question
disappears from `openQuestions`.

## Dependencies

- **API** (`environment.dashboardApiUrl`):
  `GET /api/thread-messages/open-questions[?assigned_to=]`. Answer posting
  happens via the thread feature (`POST /api/thread-messages`).
- **Domain**: `@domain/thread` (`OpenQuestionView`,
  `CreateThreadMessagePayload`), `@domain/ids` (branded ActorId /
  ThreadMessageId), `@domain/actors` (`CURRENT_ACTOR_ID`), `@domain/seed`.
- **Features**: `ThreadCommands` (`@features/thread`) — mutual coupling:
  thread's command layer injects `QuestionsService` back;
  `VaultItemsService`; `ActorsService`.
- **Shared**: `QuestionReplyComposer`, `EntityChip`, `UiProse`,
  ToastService, seed-mode, datetime utils.

## Technical Debt

Initial agent-drafted baseline (2026-07-07); entries below are from
observable evidence only.

- `2026-07-07` — No `*.spec.ts` anywhere in the feature; the seed-mode
  view-synthesis join and the sort/filter logic are untested (the thread
  side of the answer flow does have specs).
- `2026-07-07` — `QuestionsService.markAnswered` mutates via
  `{ ...q, answered_by: answerId } as unknown as OpenQuestionView` — a
  double cast working around the view type, flagged nowhere else.
- `2026-07-07` — `markAnswered` is session-local only; persistence of
  `answered_by` is assumed to happen server-side from the posted answer.
  `ThreadService.markAnswered` (which PATCHes the question row) exists but
  is not called by `ThreadCommands.answerQuestion` — whether the server
  infers it from the POST cannot be confirmed from this repo.
- `2026-07-07` — The page is hard-scoped to `CURRENT_ACTOR_ID` (a constant
  `wellKnownActorId('marvin')`); the service supports arbitrary
  `assigned_to` and unfiltered loads but no UI exposes them.
- `2026-07-07` — Mutual dependency between the questions and thread
  features (`QuestionsPage` → `ThreadCommands`; `ThreadCommands` →
  `QuestionsService`) — acknowledged in thread-commands comments as
  pending a read/write surface split.
