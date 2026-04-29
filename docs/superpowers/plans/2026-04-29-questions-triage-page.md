# Questions Triage Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-first `/questions` page showing all open questions (kind=question, answered_by=null) across all vault items, with inline reply and sort controls — so Marvin can clear the question backlog without opening each item individually.

**Architecture:** Backend adds `GET /api/thread-messages/open-questions` and the full `/api/thread-messages` CRUD (these routes are referenced by the existing `ThreadService` but were not yet in the local jimbo-api source). Frontend adds a `QuestionsService` wrapping the new endpoint, a `QuestionCard` component that reuses `QuestionReplyComposer`, and a lazy-loaded `QuestionsPage` container.

**Tech Stack:** Hono/Zod-OpenAPI (jimbo-api), Angular 20+ signals + `inject()` (dashboard), `QuestionReplyComposer` (existing shared component)

---

## File map

**jimbo-api (create)**
- `src/routes/thread-messages.ts` — full CRUD + open-questions endpoint
- `src/services/thread-messages.ts` — Postgres queries

**jimbo-api (modify)**
- `src/route-publication.ts` — mount + caddyRouteMatchers

**dashboard (create)**
- `src/app/domain/thread/open-question-view.ts` — new domain type
- `src/app/features/questions/questions.routes.ts`
- `src/app/features/questions/data-access/questions.service.ts`
- `src/app/features/questions/containers/questions-page/questions-page.ts`
- `src/app/features/questions/containers/questions-page/questions-page.html`
- `src/app/features/questions/containers/questions-page/questions-page.scss`
- `src/app/features/questions/components/question-card/question-card.ts`
- `src/app/features/questions/components/question-card/question-card.html`
- `src/app/features/questions/components/question-card/question-card.scss`

**dashboard (modify)**
- `src/app/domain/thread/index.ts` — export new type
- `src/app/app.routes.ts` — add /questions lazy route
- `src/app/shared/components/nav/nav.ts` — add Questions link

---

## Task 1: Backend — thread-messages service (jimbo-api)

**Files:**
- Create: `jimbo-api/src/services/thread-messages.ts`

- [ ] **Step 1.1: Create the service file**

```typescript
// jimbo-api/src/services/thread-messages.ts
import { sql } from '../db-pg.js';

export interface ThreadMessageRow {
  id: string;
  vault_item_id: string;
  author_actor_id: string;
  kind: string;
  body: string;
  in_reply_to: string | null;
  answered_by: string | null;
  created_at: Date;
}

export interface OpenQuestionRow {
  id: string;
  vault_item_id: string;
  vault_item_seq: number;
  vault_item_title: string;
  vault_item_grooming_status: string;
  vault_item_assigned_to: string | null;
  author_actor_id: string;
  body: string;
  in_reply_to: string | null;
  created_at: Date;
  age_days: number;
}

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

export async function listMessagesForItem(vaultItemId: string): Promise<ThreadMessageRow[]> {
  return sql<ThreadMessageRow[]>`
    SELECT id, vault_item_id, author_actor_id, kind, body, in_reply_to, answered_by, created_at
    FROM thread_messages
    WHERE vault_item_id = ${vaultItemId}
    ORDER BY created_at ASC, id ASC
    LIMIT 200
  `;
}

export async function listOpenQuestions(assignedTo?: string): Promise<OpenQuestionRow[]> {
  if (assignedTo) {
    return sql<OpenQuestionRow[]>`
      SELECT
        tm.id, tm.vault_item_id, tm.author_actor_id, tm.body, tm.in_reply_to, tm.created_at,
        vi.seq AS vault_item_seq,
        vi.title AS vault_item_title,
        vi.grooming_status AS vault_item_grooming_status,
        vi.assigned_to AS vault_item_assigned_to,
        EXTRACT(EPOCH FROM (now() - tm.created_at)) / 86400 AS age_days
      FROM thread_messages tm
      JOIN vault_notes vi ON vi.id = tm.vault_item_id
      WHERE tm.kind = 'question'
        AND tm.answered_by IS NULL
        AND vi.assigned_to = ${assignedTo}
      ORDER BY tm.created_at DESC
      LIMIT 100
    `;
  }
  return sql<OpenQuestionRow[]>`
    SELECT
      tm.id, tm.vault_item_id, tm.author_actor_id, tm.body, tm.in_reply_to, tm.created_at,
      vi.seq AS vault_item_seq,
      vi.title AS vault_item_title,
      vi.grooming_status AS vault_item_grooming_status,
      vi.assigned_to AS vault_item_assigned_to,
      EXTRACT(EPOCH FROM (now() - tm.created_at)) / 86400 AS age_days
    FROM thread_messages tm
    JOIN vault_notes vi ON vi.id = tm.vault_item_id
    WHERE tm.kind = 'question'
      AND tm.answered_by IS NULL
    ORDER BY tm.created_at DESC
    LIMIT 100
  `;
}

export async function createMessage(input: {
  id: string;
  vault_item_id: string;
  author_actor_id: string;
  kind: string;
  body: string;
  in_reply_to: string | null;
}): Promise<ThreadMessageRow> {
  const rows = await sql<ThreadMessageRow[]>`
    INSERT INTO thread_messages (id, vault_item_id, author_actor_id, kind, body, in_reply_to, answered_by)
    VALUES (${input.id}, ${input.vault_item_id}, ${input.author_actor_id}, ${input.kind}, ${input.body}, ${input.in_reply_to ?? null}, NULL)
    RETURNING id, vault_item_id, author_actor_id, kind, body, in_reply_to, answered_by, created_at
  `;

  // If this is an answer, flip the question's answered_by
  if (input.kind === 'answer' && input.in_reply_to) {
    await sql`
      UPDATE thread_messages
      SET answered_by = ${input.id}
      WHERE id = ${input.in_reply_to} AND kind = 'question'
    `;
  }

  return rows[0];
}

export async function patchMessage(
  id: string,
  patch: { answered_by: string | null }
): Promise<ThreadMessageRow | null> {
  const rows = await sql<ThreadMessageRow[]>`
    UPDATE thread_messages
    SET answered_by = ${patch.answered_by}
    WHERE id = ${id}
    RETURNING id, vault_item_id, author_actor_id, kind, body, in_reply_to, answered_by, created_at
  `;
  return rows[0] ?? null;
}
```

- [ ] **Step 1.2: Verify it compiles**

```bash
cd /Users/marvinbarretto/development/jimbo/jimbo-api && npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```
Expected: 0 errors.

---

## Task 2: Backend — thread-messages route (jimbo-api)

**Files:**
- Create: `jimbo-api/src/routes/thread-messages.ts`
- Modify: `jimbo-api/src/route-publication.ts`

- [ ] **Step 2.1: Create the route file**

```typescript
// jimbo-api/src/routes/thread-messages.ts
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import {
  listMessagesForItem,
  listOpenQuestions,
  createMessage,
  patchMessage,
} from '../services/thread-messages.js';
import { errorResponse } from '../middleware/error.js';

const threadMessages = new OpenAPIHono();

// ── Schemas ────────────────────────────────────────────────────────

const ThreadMessageSchema = z.object({
  id: z.string(),
  vault_item_id: z.string(),
  author_actor_id: z.string(),
  kind: z.enum(['comment', 'question', 'answer', 'rejection']),
  body: z.string(),
  in_reply_to: z.string().nullable(),
  answered_by: z.string().nullable(),
  created_at: z.string(),
}).openapi('ThreadMessage');

const OpenQuestionViewSchema = z.object({
  id: z.string(),
  vault_item_id: z.string(),
  vault_item_seq: z.number(),
  vault_item_title: z.string(),
  vault_item_grooming_status: z.string(),
  vault_item_assigned_to: z.string().nullable(),
  author_actor_id: z.string(),
  kind: z.literal('question'),
  body: z.string(),
  in_reply_to: z.string().nullable(),
  answered_by: z.null(),
  created_at: z.string(),
  age_days: z.number(),
}).openapi('OpenQuestionView');

// ── GET / — list messages for a vault item ─────────────────────────

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['ThreadMessages'],
  summary: 'List thread messages for a vault item',
  request: {
    query: z.object({
      vault_item_id: z.string().openapi({ description: 'Filter by vault item ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Thread messages',
      content: { 'application/json': { schema: z.object({ items: ThreadMessageSchema.array() }) } },
    },
  },
});

threadMessages.openapi(listRoute, async (c) => {
  const { vault_item_id } = c.req.valid('query');
  const rows = await listMessagesForItem(vault_item_id);
  const items = rows.map(r => ({
    ...r,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
  return c.json({ items }, 200);
});

// ── GET /open-questions — cross-item open question queue ──────────

const openQuestionsRoute = createRoute({
  method: 'get',
  path: '/open-questions',
  tags: ['ThreadMessages'],
  summary: 'List open (unanswered) questions across all vault items, optionally filtered by assigned_to',
  request: {
    query: z.object({
      assigned_to: z.string().optional().openapi({ description: 'Filter by vault item assigned_to actor ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Open questions with vault item context',
      content: { 'application/json': { schema: z.object({ items: OpenQuestionViewSchema.array() }) } },
    },
  },
});

threadMessages.openapi(openQuestionsRoute, async (c) => {
  const { assigned_to } = c.req.valid('query');
  const rows = await listOpenQuestions(assigned_to);
  const items = rows.map(r => ({
    id: r.id,
    vault_item_id: r.vault_item_id,
    vault_item_seq: r.vault_item_seq,
    vault_item_title: r.vault_item_title,
    vault_item_grooming_status: r.vault_item_grooming_status,
    vault_item_assigned_to: r.vault_item_assigned_to,
    author_actor_id: r.author_actor_id,
    kind: 'question' as const,
    body: r.body,
    in_reply_to: r.in_reply_to,
    answered_by: null,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    age_days: Number(r.age_days),
  }));
  return c.json({ items }, 200);
});

// ── POST / — create a message ──────────────────────────────────────

const createRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['ThreadMessages'],
  summary: 'Post a thread message (comment, question, answer, rejection)',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            id: z.string(),
            vault_item_id: z.string(),
            author_actor_id: z.string(),
            kind: z.enum(['comment', 'question', 'answer', 'rejection']),
            body: z.string(),
            in_reply_to: z.string().nullable().default(null),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Created message',
      content: { 'application/json': { schema: ThreadMessageSchema } },
    },
  },
});

threadMessages.openapi(createRoute, async (c) => {
  const input = c.req.valid('json');
  const row = await createMessage(input);
  return c.json({
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }, 201);
});

// ── PATCH /:id — mark answered ─────────────────────────────────────

const patchRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['ThreadMessages'],
  summary: 'Update a thread message (currently: flip answered_by)',
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({ answered_by: z.string().nullable() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated message',
      content: { 'application/json': { schema: ThreadMessageSchema } },
    },
    404: { description: 'Not found', content: { 'application/json': { schema: z.object({ error: z.string() }) } } },
  },
});

threadMessages.openapi(patchRoute, async (c) => {
  const { id } = c.req.valid('param');
  const patch = c.req.valid('json');
  const row = await patchMessage(id, patch);
  if (!row) return errorResponse(c, 404, 'NOT_FOUND', `Thread message ${id} not found`);
  return c.json({
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }, 200);
});

export default threadMessages;
```

- [ ] **Step 2.2: Mount the route in route-publication.ts**

In `src/route-publication.ts`:

After the last import line, add:
```typescript
import threadMessages from './routes/thread-messages.js';
```

In `apiRouteMounts` array, add after the `attachments` entry:
```typescript
  { path: '/api/thread-messages', route: threadMessages },
```

In `caddyRouteMatchers` array, add:
```
  '/api/thread-messages',
  '/api/thread-messages/*',
```

- [ ] **Step 2.3: Verify compile**

```bash
cd /Users/marvinbarretto/development/jimbo/jimbo-api && npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```
Expected: 0 errors.

- [ ] **Step 2.4: Commit (jimbo-api)**

```bash
cd /Users/marvinbarretto/development/jimbo/jimbo-api
git add src/services/thread-messages.ts src/routes/thread-messages.ts src/route-publication.ts
git commit -m "feat(thread-messages): add /api/thread-messages CRUD + open-questions endpoint"
```

---

## Task 3: Domain — OpenQuestionView type

**Files:**
- Create: `dashboard/src/app/domain/thread/open-question-view.ts`
- Modify: `dashboard/src/app/domain/thread/index.ts`

- [ ] **Step 3.1: Create the type file**

```typescript
// src/app/domain/thread/open-question-view.ts
import type { ActorId, ThreadMessageId, VaultItemId } from '../ids';

export interface OpenQuestionView {
  id:                       ThreadMessageId;
  vault_item_id:            VaultItemId;
  vault_item_seq:           number;
  vault_item_title:         string;
  vault_item_grooming_status: string;
  vault_item_assigned_to:   ActorId | null;
  author_actor_id:          ActorId;
  kind:                     'question';
  body:                     string;
  in_reply_to:              ThreadMessageId | null;
  answered_by:              null;
  created_at:               string;
  age_days:                 number;
}
```

- [ ] **Step 3.2: Export from thread index**

Read `src/app/domain/thread/index.ts`. It likely re-exports from thread-message.ts. Add:

```typescript
export type { OpenQuestionView } from './open-question-view';
```

- [ ] **Step 3.3: Check compile**

```bash
cd /Users/marvinbarretto/development/jimbo/dashboard && npx ng build --no-progress 2>&1 | grep "error TS" | head -10
```
Expected: 0 errors.

---

## Task 4: QuestionsService

**Files:**
- Create: `src/app/features/questions/data-access/questions.service.ts`

- [ ] **Step 4.1: Create the service**

```typescript
// src/app/features/questions/data-access/questions.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { OpenQuestionView } from '@domain/thread';
import type { ActorId, ThreadMessageId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';

@Injectable({ providedIn: 'root' })
export class QuestionsService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly url = `${environment.dashboardApiUrl}/api/thread-messages/open-questions`;

  private readonly _questions = signal<OpenQuestionView[]>([]);
  readonly loading = signal(false);

  // Filters out any that have been answered locally (optimistic)
  readonly openQuestions = computed(() => this._questions().filter(q => q.answered_by === null));

  load(assignedTo?: ActorId): void {
    if (isSeedMode()) {
      this._loadFromSeed(assignedTo);
      return;
    }
    this.loading.set(true);
    const params = assignedTo
      ? new HttpParams().set('assigned_to', assignedTo)
      : new HttpParams();
    this.http.get<{ items: OpenQuestionView[] }>(this.url, { params }).subscribe({
      next: ({ items }) => { this._questions.set(items); this.loading.set(false); },
      error: () => { this.toast.error('Failed to load questions'); this.loading.set(false); },
    });
  }

  markAnswered(questionId: ThreadMessageId, answerId: ThreadMessageId): void {
    this._questions.update(qs =>
      qs.map(q => q.id === questionId ? { ...q, answered_by: answerId } as OpenQuestionView : q)
    );
  }

  private _loadFromSeed(assignedTo?: ActorId): void {
    const vaultItems = this.vaultItemsService.items();
    const openMessages = SEED.thread_messages.filter(
      m => m.kind === 'question' && m.answered_by === null
    );
    const views: OpenQuestionView[] = openMessages
      .filter(m => {
        if (!assignedTo) return true;
        const item = vaultItems.find(vi => vi.id === m.vault_item_id);
        return item?.assigned_to === assignedTo;
      })
      .map(m => {
        const item = vaultItems.find(vi => vi.id === m.vault_item_id);
        return {
          id: m.id,
          vault_item_id: m.vault_item_id,
          vault_item_seq: item?.seq ?? 0,
          vault_item_title: item?.title ?? '(unknown)',
          vault_item_grooming_status: item?.grooming_status ?? 'ungroomed',
          vault_item_assigned_to: (item?.assigned_to ?? null) as ActorId | null,
          author_actor_id: m.author_actor_id,
          kind: 'question' as const,
          body: m.body,
          in_reply_to: m.in_reply_to,
          answered_by: null,
          created_at: m.created_at,
          age_days: (Date.now() - new Date(m.created_at).getTime()) / 86_400_000,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    this._questions.set(views);
  }
}
```

- [ ] **Step 4.2: Verify compile**

```bash
npx ng build --no-progress 2>&1 | grep "error TS" | head -10
```
Expected: 0 errors.

---

## Task 5: QuestionCard component

**Files:**
- Create: `src/app/features/questions/components/question-card/question-card.ts`
- Create: `src/app/features/questions/components/question-card/question-card.html`
- Create: `src/app/features/questions/components/question-card/question-card.scss`

- [ ] **Step 5.1: Create the TS**

```typescript
// src/app/features/questions/components/question-card/question-card.ts
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { OpenQuestionView } from '@domain/thread';
import type { CreateThreadMessagePayload } from '@domain/thread';
import { actorId } from '@domain/ids';
import { ActorsService } from '@features/actors/data-access/actors.service';
import { QuestionReplyComposer } from '@shared/components/question-reply-composer/question-reply-composer';

@Component({
  selector: 'app-question-card',
  imports: [RouterLink, QuestionReplyComposer],
  templateUrl: './question-card.html',
  styleUrl: './question-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionCard {
  readonly question = input.required<OpenQuestionView>();
  readonly answered  = output<CreateThreadMessagePayload>();

  private readonly actorsService = inject(ActorsService);

  readonly showReply = signal(false);
  readonly currentActorId = actorId('marvin');

  readonly authorLabel = computed(() => {
    const a = this.actorsService.getById(this.question().author_actor_id);
    return a ? `@${a.id}` : `@${this.question().author_actor_id}`;
  });

  readonly authorKind = computed(() => {
    return this.actorsService.getById(this.question().author_actor_id)?.kind ?? 'system';
  });

  // Synthetic ThreadMessage for QuestionReplyComposer
  readonly asThreadMessage = computed(() => ({
    id: this.question().id,
    vault_item_id: this.question().vault_item_id,
    author_actor_id: this.question().author_actor_id,
    kind: 'question' as const,
    body: this.question().body,
    in_reply_to: this.question().in_reply_to,
    answered_by: null,
    created_at: this.question().created_at,
  }));

  readonly ageLabel = computed(() => {
    const d = Math.floor(this.question().age_days);
    if (d <= 0) return 'today';
    if (d === 1) return '1d ago';
    return `${d}d ago`;
  });

  toggleReply(): void { this.showReply.update(v => !v); }

  onReplyPosted(payload: CreateThreadMessagePayload): void {
    this.answered.emit(payload);
    this.showReply.set(false);
  }
}
```

- [ ] **Step 5.2: Create the HTML**

```html
<!-- src/app/features/questions/components/question-card/question-card.html -->
<article class="qcard">
  <header class="qcard__header">
    <a [routerLink]="['/vault-items', question().vault_item_seq]" class="qcard__item-link">
      #{{ question().vault_item_seq }} · {{ question().vault_item_title }}
    </a>
    <span [class]="'qcard__grooming qcard__grooming--' + question().vault_item_grooming_status">
      {{ question().vault_item_grooming_status.replace(/_/g, ' ') }}
    </span>
  </header>

  <div class="qcard__meta">
    <span [class]="'qcard__author qcard__author--' + authorKind()">{{ authorLabel() }}</span>
    <span class="qcard__age">{{ ageLabel() }}</span>
  </div>

  <p class="qcard__body">{{ question().body }}</p>

  @if (showReply()) {
    <app-question-reply-composer
      [question]="asThreadMessage()"
      [vaultItemId]="question().vault_item_id"
      [currentActor]="currentActorId"
      (posted)="onReplyPosted($event)"
    />
  }

  <div class="qcard__actions">
    <button type="button"
      class="qcard__reply-btn"
      [class.qcard__reply-btn--active]="showReply()"
      (click)="toggleReply()">
      {{ showReply() ? 'cancel' : 'reply ↩' }}
    </button>
  </div>
</article>
```

- [ ] **Step 5.3: Create the SCSS**

```scss
// src/app/features/questions/components/question-card/question-card.scss
:host { display: block; }

.qcard {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-danger);
  border-radius: var(--radius);
  padding: 0;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: .5rem;
    padding: .5rem .75rem .25rem;
    flex-wrap: wrap;
  }

  &__item-link {
    font-size: .8rem;
    font-weight: 600;
    color: var(--color-text);
    text-decoration: none;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    &:hover { color: var(--color-accent); text-decoration: underline; }
  }

  &__grooming {
    font-size: .6rem;
    text-transform: uppercase;
    letter-spacing: .06em;
    white-space: nowrap;
    color: var(--color-text-muted);
    &--intake_rejected { color: var(--color-danger); }
    &--needs_rework    { color: var(--color-warning, #f59e0b); }
    &--ready           { color: #3b7a3b; }
  }

  &__meta {
    display: flex;
    align-items: baseline;
    gap: .4rem;
    padding: 0 .75rem .3rem;
  }

  &__author {
    font-size: .65rem;
    font-weight: 700;
    color: var(--color-text-muted);
    &--agent  { color: #4a6a8a; }
    &--human  { color: #d96520; }
    &--system { color: var(--color-text-muted); }
  }

  &__age {
    font-size: .6rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    margin-left: auto;
  }

  &__body {
    padding: 0 .75rem .5rem;
    margin: 0;
    font-size: .82rem;
    line-height: 1.5;
    color: var(--color-text);
  }

  &__actions {
    display: flex;
    border-top: 1px solid var(--color-border);
  }

  &__reply-btn {
    flex: 1;
    min-height: 44px;
    background: transparent;
    border: none;
    font: inherit;
    font-size: .72rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: background .1s, color .1s;

    &:hover { background: var(--color-surface); color: var(--color-text); }

    &--active {
      background: var(--color-surface);
      color: var(--color-text-muted);
    }
  }
}
```

- [ ] **Step 5.4: Verify compile**

```bash
npx ng build --no-progress 2>&1 | grep "error TS" | head -10
```
Expected: 0 errors.

---

## Task 6: QuestionsPage container + routes

**Files:**
- Create: `src/app/features/questions/questions.routes.ts`
- Create: `src/app/features/questions/containers/questions-page/questions-page.ts`
- Create: `src/app/features/questions/containers/questions-page/questions-page.html`
- Create: `src/app/features/questions/containers/questions-page/questions-page.scss`

- [ ] **Step 6.1: Create the routes file**

```typescript
// src/app/features/questions/questions.routes.ts
import { Routes } from '@angular/router';

export const questionsRoutes: Routes = [
  {
    path: '',
    title: 'Questions',
    loadComponent: () =>
      import('./containers/questions-page/questions-page').then(m => m.QuestionsPage),
  },
];
```

- [ ] **Step 6.2: Create the page TS**

```typescript
// src/app/features/questions/containers/questions-page/questions-page.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { actorId } from '@domain/ids';
import { ThreadService } from '@features/thread/data-access/thread.service';
import { QuestionsService } from '../../data-access/questions.service';
import { QuestionCard } from '../../components/question-card/question-card';
import type { CreateThreadMessagePayload } from '@domain/thread';

type SortOrder = 'newest' | 'oldest';

@Component({
  selector: 'app-questions-page',
  imports: [QuestionCard],
  templateUrl: './questions-page.html',
  styleUrl: './questions-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionsPage implements OnInit {
  private readonly questionsService = inject(QuestionsService);
  private readonly threadService = inject(ThreadService);

  readonly loading  = this.questionsService.loading;
  readonly sortOrder = signal<SortOrder>('newest');
  readonly currentActorId = actorId('marvin');

  readonly questions = computed(() => {
    const qs = this.questionsService.openQuestions();
    return this.sortOrder() === 'oldest'
      ? [...qs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      : qs; // newest is default from service
  });

  ngOnInit(): void {
    this.questionsService.load(this.currentActorId);
  }

  setSort(order: SortOrder): void { this.sortOrder.set(order); }

  onAnswered(payload: CreateThreadMessagePayload): void {
    this.threadService.post(payload);
    if (payload.in_reply_to) {
      this.questionsService.markAnswered(payload.in_reply_to, payload.id);
    }
  }
}
```

- [ ] **Step 6.3: Create the page HTML**

```html
<!-- src/app/features/questions/containers/questions-page/questions-page.html -->
<div class="questions-page">
  <header class="questions-page__header">
    <h1 class="questions-page__title">Questions</h1>
    <span class="questions-page__count">
      {{ loading() ? '…' : questions().length + ' open' }}
    </span>
    <div class="questions-page__sort">
      <button type="button"
        [class.sort-btn--active]="sortOrder() === 'newest'"
        class="sort-btn"
        (click)="setSort('newest')">newest</button>
      <button type="button"
        [class.sort-btn--active]="sortOrder() === 'oldest'"
        class="sort-btn"
        (click)="setSort('oldest')">oldest</button>
    </div>
  </header>

  @if (loading()) {
    <p class="questions-page__loading">Loading questions…</p>
  } @else if (questions().length === 0) {
    <div class="questions-page__empty">
      <p>No open questions — all clear.</p>
    </div>
  } @else {
    <ul class="questions-page__list">
      @for (q of questions(); track q.id) {
        <li>
          <app-question-card
            [question]="q"
            (answered)="onAnswered($event)"
          />
        </li>
      }
    </ul>
  }
</div>
```

- [ ] **Step 6.4: Create the page SCSS**

```scss
// src/app/features/questions/containers/questions-page/questions-page.scss
:host { display: block; }

.questions-page {
  max-width: 640px;
  margin: 0 auto;
  padding: .75rem .75rem 4rem;

  &__header {
    display: flex;
    align-items: baseline;
    gap: .75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  &__title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
  }

  &__count {
    font-size: .72rem;
    color: var(--color-text-muted);
  }

  &__sort {
    display: flex;
    gap: 1px;
    background: var(--color-border);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    overflow: hidden;
    margin-left: auto;
  }

  &__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: .6rem;
  }

  &__loading,
  &__empty {
    color: var(--color-text-muted);
    font-size: .82rem;
    padding: 2rem 0;
    text-align: center;
  }
}

.sort-btn {
  padding: .3rem .6rem;
  background: var(--color-bg);
  border: none;
  font: inherit;
  font-size: .7rem;
  cursor: pointer;
  color: var(--color-text-muted);

  &:hover { background: var(--color-surface); color: var(--color-text); }
  &--active { background: var(--color-surface); color: var(--color-text); font-weight: 600; }
}
```

- [ ] **Step 6.5: Add to app routes**

In `src/app/app.routes.ts`, add after the `actors` route entry:

```typescript
  {
    path: 'questions',
    loadChildren: () => import('./features/questions/questions.routes').then(m => m.questionsRoutes),
  },
```

- [ ] **Step 6.6: Add nav link**

In `src/app/shared/components/nav/nav.ts`, add after the `<li><a routerLink="/grooming"` entry:

```html
<li><a routerLink="/questions" routerLinkActive="active">Questions</a></li>
```

- [ ] **Step 6.7: Verify compile**

```bash
npx ng build --no-progress 2>&1 | grep "error TS" | head -10
```
Expected: 0 errors.

- [ ] **Step 6.8: Commit (dashboard)**

```bash
cd /Users/marvinbarretto/development/jimbo/dashboard
git add \
  src/app/domain/thread/open-question-view.ts \
  src/app/domain/thread/index.ts \
  src/app/features/questions/ \
  src/app/app.routes.ts \
  src/app/shared/components/nav/nav.ts
git commit -m "feat(questions): add /questions triage page with inline reply"
```

---

## Task 7: Deploy backend + smoke test

- [ ] **Step 7.1: Deploy jimbo-api**

```bash
cd /Users/marvinbarretto/development/jimbo/jimbo-api
./scripts/deploy.sh
```

- [ ] **Step 7.2: Smoke test the new endpoints**

The dashboard proxy forwards to prod. With `npm run dev` running:

1. Navigate to `/questions` — should show open questions (seeded items in seed mode, live data in normal mode)
2. Click "reply ↩" on a question — composer appears
3. Type a reply and submit — question disappears from list
4. Click question's `#seq · title` link — navigates to vault item detail

- [ ] **Step 7.3: Commit any fixups, then surface push command for Marvin**

Per project convention: local commits are fine; surface the push command rather than pushing autonomously.

```
git push origin master
```

---

## Notes

**Seed mode coverage:** `QuestionsService._loadFromSeed` uses `SEED.thread_messages` (already has 9 open questions across items A, L, M, N, S) cross-referenced with `VaultItemsService.items()`. No new seed fixtures needed.

**Token shortcuts in replies:** The `QuestionReplyComposer` already has `#`, `@`, `/` token buttons — reused as-is.

**`vault_notes` table name:** Backend SQL uses `vault_notes` — confirmed from existing services in jimbo-api. The column `assigned_to` stores the actor ID string directly (no FK).
