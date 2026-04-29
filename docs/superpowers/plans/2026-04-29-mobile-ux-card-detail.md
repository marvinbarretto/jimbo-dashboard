# Mobile UX — Card + Detail Improvements

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the grooming board's mobile UX by adding a permanent reply/action row to cards and replacing the tab-based detail view with stacked collapsible sections and a sticky action bar.

**Architecture:** A new `QuestionReplyComposer` shared component handles inline "answer a question" flows. The `GroomingCard` receives the first open question as a new input and renders a permanent action row. `VaultItemDetailBody` drops its tab system for a stacked layout with the open-question zone at the top, and gains a sticky bottom action bar.

**Tech Stack:** Angular 20+, signals, OnPush, Vitest, SCSS modules (no Tailwind). All new components are standalone (default in v20 — no `standalone: true` needed).

**Out of scope:** Token autocomplete (phase 2), Questions page `/questions` (separate plan — needs backend endpoint), per-status config table (applied after this foundation exists).

---

## File Map

| File | Change |
|------|--------|
| `src/app/shared/components/question-reply-composer/question-reply-composer.ts` | **Create** — focused "answer a question" composer |
| `src/app/shared/components/question-reply-composer/question-reply-composer.html` | **Create** |
| `src/app/shared/components/question-reply-composer/question-reply-composer.scss` | **Create** |
| `src/app/shared/components/question-reply-composer/question-reply-composer.spec.ts` | **Create** |
| `src/app/features/grooming/components/grooming-card/grooming-card.ts` | **Modify** — add `openQuestion` input, reply state, action handlers |
| `src/app/features/grooming/components/grooming-card/grooming-card.html` | **Modify** — permanent action row, inline composer |
| `src/app/features/grooming/components/grooming-card/grooming-card.scss` | **Modify** — action row styles, touch targets |
| `src/app/features/grooming/containers/grooming-board/grooming-board.ts` | **Modify** — add `firstOpenQuestion()` method |
| `src/app/features/grooming/containers/grooming-board/grooming-board.html` | **Modify** — bind `[openQuestion]` on `<app-grooming-card>` |
| `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.ts` | **Modify** — remove tabs, add section-open signals, add `openQuestions` computed, wire reply |
| `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html` | **Modify** — stacked sections, question zone, sticky bar |
| `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.scss` | **Modify** — sticky bar, section headers, collapsible sections |

---

## Task 1: QuestionReplyComposer component

A minimal "answer one specific question" component. Unlike `MessageComposer`, it has no kind selector, no file attachments, no reply-to picker — just a textarea and send. It receives the question it's answering and emits a fully-formed `CreateThreadMessagePayload` for the parent to post.

**Files:**
- Create: `src/app/shared/components/question-reply-composer/question-reply-composer.ts`
- Create: `src/app/shared/components/question-reply-composer/question-reply-composer.html`
- Create: `src/app/shared/components/question-reply-composer/question-reply-composer.scss`
- Create: `src/app/shared/components/question-reply-composer/question-reply-composer.spec.ts`

- [ ] **Step 1.1: Write the failing test**

```typescript
// src/app/shared/components/question-reply-composer/question-reply-composer.spec.ts
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { QuestionReplyComposer } from './question-reply-composer';
import type { ThreadMessage } from '@domain/thread';
import type { CreateThreadMessagePayload } from '@domain/thread';
import { vaultItemId, actorId, threadMessageId } from '@domain/ids';

const QUESTION: ThreadMessage = {
  id: threadMessageId('q-1'),
  vault_item_id: vaultItemId('item-1'),
  author_actor_id: actorId('boris'),
  kind: 'question',
  body: 'Is this real?',
  in_reply_to: null,
  answered_by: null,
  created_at: new Date().toISOString(),
};

describe('QuestionReplyComposer', () => {
  it('emits answer payload with correct kind and in_reply_to when submit called', () => {
    TestBed.configureTestingModule({ imports: [QuestionReplyComposer] });
    const fixture = TestBed.createComponent(QuestionReplyComposer);
    const comp = fixture.componentInstance;

    fixture.componentRef.setInput('question', QUESTION);
    fixture.componentRef.setInput('vaultItemId', vaultItemId('item-1'));
    fixture.componentRef.setInput('currentActor', actorId('marvin'));
    fixture.detectChanges();

    const emitted: CreateThreadMessagePayload[] = [];
    comp.posted.subscribe((p: CreateThreadMessagePayload) => emitted.push(p));

    comp.bodyControl.setValue('Yes, it is real.');
    comp.submit();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].kind).toBe('answer');
    expect(emitted[0].in_reply_to).toBe(QUESTION.id);
    expect(emitted[0].body).toBe('Yes, it is real.');
    expect(emitted[0].vault_item_id).toBe(vaultItemId('item-1'));
    expect(emitted[0].author_actor_id).toBe(actorId('marvin'));
    expect(emitted[0].answered_by).toBeNull();
  });

  it('does not emit when body is empty', () => {
    TestBed.configureTestingModule({ imports: [QuestionReplyComposer] });
    const fixture = TestBed.createComponent(QuestionReplyComposer);
    const comp = fixture.componentInstance;

    fixture.componentRef.setInput('question', QUESTION);
    fixture.componentRef.setInput('vaultItemId', vaultItemId('item-1'));
    fixture.componentRef.setInput('currentActor', actorId('marvin'));
    fixture.detectChanges();

    const emitted: CreateThreadMessagePayload[] = [];
    comp.posted.subscribe((p: CreateThreadMessagePayload) => emitted.push(p));

    comp.bodyControl.setValue('');
    comp.submit();

    expect(emitted).toHaveLength(0);
  });

  it('clears body after successful submit', () => {
    TestBed.configureTestingModule({ imports: [QuestionReplyComposer] });
    const fixture = TestBed.createComponent(QuestionReplyComposer);
    const comp = fixture.componentInstance;

    fixture.componentRef.setInput('question', QUESTION);
    fixture.componentRef.setInput('vaultItemId', vaultItemId('item-1'));
    fixture.componentRef.setInput('currentActor', actorId('marvin'));
    fixture.detectChanges();

    comp.bodyControl.setValue('some answer');
    comp.submit();

    expect(comp.bodyControl.value).toBe('');
  });
});
```

- [ ] **Step 1.2: Run test to confirm it fails**

```bash
cd /Users/marvinbarretto/development/jimbo/dashboard
npx ng test --include="**/question-reply-composer.spec.ts" --no-watch 2>&1 | tail -20
```

Expected: compile error or "Cannot find module" — component doesn't exist yet.

- [ ] **Step 1.3: Create the component TS**

```typescript
// src/app/shared/components/question-reply-composer/question-reply-composer.ts
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import type { ThreadMessage, CreateThreadMessagePayload } from '@domain/thread';
import type { VaultItemId, ActorId, ThreadMessageId } from '@domain/ids';
import { threadMessageId } from '@domain/ids';

@Component({
  selector: 'app-question-reply-composer',
  imports: [ReactiveFormsModule],
  templateUrl: './question-reply-composer.html',
  styleUrl: './question-reply-composer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionReplyComposer {
  readonly question     = input.required<ThreadMessage>();
  readonly vaultItemId  = input.required<VaultItemId>();
  readonly currentActor = input.required<ActorId>();

  readonly posted = output<CreateThreadMessagePayload>();

  readonly bodyControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  insertToken(prefix: string): void {
    const current = this.bodyControl.value;
    this.bodyControl.setValue(current + prefix);
  }

  submit(): void {
    if (!this.bodyControl.valid || !this.bodyControl.value.trim()) return;

    const id = threadMessageId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

    const payload: CreateThreadMessagePayload = {
      id,
      vault_item_id:   this.vaultItemId(),
      author_actor_id: this.currentActor(),
      kind:            'answer',
      body:            this.bodyControl.value.trim(),
      in_reply_to:     this.question().id as ThreadMessageId,
      answered_by:     null,
    };

    this.posted.emit(payload);
    this.bodyControl.reset('');
  }
}
```

- [ ] **Step 1.4: Create the template**

```html
<!-- src/app/shared/components/question-reply-composer/question-reply-composer.html -->
<div class="reply-composer">
  <textarea
    class="reply-composer__input"
    [formControl]="bodyControl"
    placeholder="Answer this question…   # task  @ person  / project"
    rows="3"
    (keydown.meta.enter)="submit()"
    (keydown.ctrl.enter)="submit()"
  ></textarea>
  <div class="reply-composer__toolbar">
    <button type="button" class="reply-composer__token-btn" (click)="insertToken('#')">
      # task
    </button>
    <button type="button" class="reply-composer__token-btn" (click)="insertToken('@')">
      @ person
    </button>
    <button type="button" class="reply-composer__token-btn" (click)="insertToken('/')">
      / project
    </button>
    <button
      type="button"
      class="reply-composer__send"
      [disabled]="!bodyControl.value.trim()"
      (click)="submit()"
    >
      send ↩
    </button>
  </div>
</div>
```

- [ ] **Step 1.5: Create the SCSS**

```scss
// src/app/shared/components/question-reply-composer/question-reply-composer.scss
.reply-composer {
  padding: 12px 0;
}

.reply-composer__input {
  width: 100%;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid #ccc;
  resize: vertical;
  min-height: 80px;
  display: block;

  &:focus {
    outline: 2px solid var(--color-text, #111);
    border-color: var(--color-text, #111);
  }
}

.reply-composer__toolbar {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.reply-composer__token-btn {
  font-size: 11px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  background: transparent;
  color: #555;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    border-color: #999;
    color: #111;
  }
}

.reply-composer__send {
  margin-left: auto;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  background: var(--color-text, #111);
  color: var(--color-bg, #fff);
  border: none;
  cursor: pointer;
  font-family: inherit;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}
```

- [ ] **Step 1.6: Run tests — expect pass**

```bash
npx ng test --include="**/question-reply-composer.spec.ts" --no-watch 2>&1 | tail -20
```

Expected: 3 passing.

- [ ] **Step 1.7: Commit**

```bash
git add src/app/shared/components/question-reply-composer/
git commit -m "feat(shared): add QuestionReplyComposer for inline question answering"
```

---

## Task 2: Grooming card — openQuestion input + reply state

Add the data plumbing: new input on the card, new method on the board, new binding in the board template.

**Files:**
- Modify: `src/app/features/grooming/components/grooming-card/grooming-card.ts`
- Modify: `src/app/features/grooming/containers/grooming-board/grooming-board.ts`
- Modify: `src/app/features/grooming/containers/grooming-board/grooming-board.html`

- [ ] **Step 2.1: Write the failing test**

```typescript
// Add to or create: src/app/features/grooming/components/grooming-card/grooming-card.spec.ts
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GroomingCard } from './grooming-card';
import { vaultItemId, actorId, threadMessageId } from '@domain/ids';
import type { ThreadMessage } from '@domain/thread';

const OPEN_QUESTION: ThreadMessage = {
  id: threadMessageId('q-1'),
  vault_item_id: vaultItemId('item-1'),
  author_actor_id: actorId('boris'),
  kind: 'question',
  body: 'Is this real?',
  in_reply_to: null,
  answered_by: null,
  created_at: new Date().toISOString(),
};

const MINIMAL_ITEM = {
  id: vaultItemId('item-1'),
  seq: 1,
  title: 'Test item',
  type: 'task',
  body: null,
  tags: [],
  grooming_status: 'intake_rejected',
  assigned_to: actorId('marvin'),
  parent_id: null,
  acceptance_criteria: [],
  created_at: new Date().toISOString(),
  latest_event: null,
  actionability: null,
  ai_priority: null,
  manual_priority: null,
  ai_rationale: null,
  completed_at: null,
  archived_at: null,
  due_at: null,
  source: null,
} as any;

describe('GroomingCard', () => {
  it('showReply starts false', () => {
    TestBed.configureTestingModule({ imports: [GroomingCard] });
    const fixture = TestBed.createComponent(GroomingCard);
    fixture.componentRef.setInput('item', MINIMAL_ITEM);
    fixture.detectChanges();
    expect(fixture.componentInstance.showReply()).toBe(false);
  });

  it('toggleReply flips showReply', () => {
    TestBed.configureTestingModule({ imports: [GroomingCard] });
    const fixture = TestBed.createComponent(GroomingCard);
    fixture.componentRef.setInput('item', MINIMAL_ITEM);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    comp.toggleReply();
    expect(comp.showReply()).toBe(true);
    comp.toggleReply();
    expect(comp.showReply()).toBe(false);
  });
});
```

- [ ] **Step 2.2: Run test to confirm it fails**

```bash
npx ng test --include="**/grooming-card.spec.ts" --no-watch 2>&1 | tail -20
```

Expected: `Property 'showReply' does not exist on type 'GroomingCard'`.

- [ ] **Step 2.3: Add openQuestion input + reply state to GroomingCard**

In `grooming-card.ts`, add these imports at the top:

```typescript
import { ThreadService } from '@features/thread/data-access/thread.service';
import type { ThreadMessage, CreateThreadMessagePayload } from '@domain/thread';
import { QuestionReplyComposer } from '@shared/components/question-reply-composer/question-reply-composer';
```

Add `QuestionReplyComposer` to the `imports` array in `@Component`:

```typescript
imports: [RouterLink, KanbanCardLinkDirective, PriorityBadge, BlockerBadge, EpicBadge, ProjectChip, OwnerChip, ReworkBadgeComponent, QuestionReplyComposer],
```

Add these new class members after the existing outputs (after line `readonly remove = output<void>();`):

```typescript
readonly openQuestion = input<ThreadMessage | null>(null);

private readonly threadService = inject(ThreadService);

readonly showReply = signal(false);

toggleReply(): void {
  this.showReply.update(v => !v);
}

onReplyPosted(payload: CreateThreadMessagePayload): void {
  this.threadService.post(payload);
  this.showReply.set(false);
}
```

- [ ] **Step 2.4: Run tests — expect pass**

```bash
npx ng test --include="**/grooming-card.spec.ts" --no-watch 2>&1 | tail -20
```

Expected: 2 passing.

- [ ] **Step 2.5: Add firstOpenQuestion to GroomingBoard**

In `grooming-board.ts`, after the existing `openQuestionsCount` method (around line 214), add:

```typescript
firstOpenQuestion(item: VaultItem): ThreadMessage | null {
  return this.threadService.openQuestionsFor(item.id)()[0] ?? null;
}
```

The `ThreadMessage` type import — check the existing imports at the top of `grooming-board.ts`. If `ThreadMessage` isn't imported, add it:

```typescript
import type { ThreadMessage } from '@domain/thread';
```

- [ ] **Step 2.6: Add binding in board template**

In `grooming-board.html`, on the `<app-grooming-card>` element (around line 74), add the new binding after `[source]`:

```html
[openQuestion]="firstOpenQuestion(item)"
```

The full element should now include:
```html
<app-grooming-card
  [item]="item"
  [project]="primaryProject(item)"
  [openQuestionsCount]="openQuestionsCount(item)"
  [childrenCount]="childrenCount(item)"
  [epicPriority]="rolledUpPriorityForEpic(item)"
  [lastActivityAt]="lastActivityAt(item)"
  [liveSnapshot]="liveSnapshot(item)"
  [daysInColumn]="daysInColumn(item)"
  [source]="sourceSummary(item)"
  [openQuestion]="firstOpenQuestion(item)"
  [dragging]="drag.dragging() === item.id"
  (dragstart)="onDragStart($event, item)"
  (dragend)="onDragEnd()"
  (demote)="onDemoteToNote(item)"
  (remove)="onRemoveItem(item)"
/>
```

- [ ] **Step 2.7: Commit**

```bash
git add src/app/features/grooming/components/grooming-card/grooming-card.ts \
        src/app/features/grooming/containers/grooming-board/grooming-board.ts \
        src/app/features/grooming/containers/grooming-board/grooming-board.html
git commit -m "feat(grooming): wire openQuestion input and reply state to grooming card"
```

---

## Task 3: Grooming card — HTML + SCSS overhaul

Replace the hidden expand pattern with a permanent action row. Show Boris's question as the primary content. Wire the inline reply composer. This is the visible UX change.

**Files:**
- Modify: `src/app/features/grooming/components/grooming-card/grooming-card.html`
- Modify: `src/app/features/grooming/components/grooming-card/grooming-card.scss`

- [ ] **Step 3.1: Replace grooming-card.html**

Replace the entire file contents with:

```html
<article
  class="card"
  [class.card--owner-marvin]="item().assigned_to === 'marvin'"
  [class.card--owner-ralph]="item().assigned_to === 'ralph'"
  [class.card--owner-boris]="item().assigned_to === 'boris'"
  [class.card--owner-jimbo]="item().assigned_to === 'jimbo'"
  [class.card--dragging]="dragging()"
  [class.card--epic]="isEpic()"
  [class.card--intake-rejected]="isIntakeRejected()"
  [class.card--needs-rework]="needsRework()"
  [class.card--reply-open]="showReply()"
  draggable="true"
  (dragstart)="onDragStart($event)"
  (dragend)="onDragEnd()"
>
  <header class="card__header">
    <a [routerLink]="['/vault-items', item().seq]" class="card__seq">#{{ item().seq }}</a>

    @if (hasParent() && parentSeq() !== null) {
      <span class="card__subitem">↳ #{{ parentSeq() }}</span>
    }

    @if (displayedPriority() !== null) {
      <app-priority-badge [priority]="displayedPriority()!" />
    }

    <span class="card__right-slot">
      @if (isEpic()) {
        <app-epic-badge [count]="childrenCount()" />
      }
      @if (openQuestionsCount() > 0) {
        <app-blocker-badge [count]="openQuestionsCount()" />
      }
      @if (isStuck()) {
        <span class="card__stuck" [attr.title]="stuckTooltip()">{{ stuckDaysRounded() }}d</span>
      }
      <span class="card__age" [attr.title]="ageTooltip()">{{ ageLabel() }}</span>
    </span>
  </header>

  @if (needsRework() && reworkReason(); as reason) {
    <app-rework-badge
      [reasonSnippet]="reason"
      [reassignedTo]="reworkTarget()"
    />
  }

  <a [appKanbanCardLink]="item().seq" class="card__title">
    {{ item().title }}
  </a>

  @if (isIntakeRejected() && rejectionCallout(); as callout) {
    <div class="card__question">
      <span class="card__question-who">{{ callout.actorLabel }}</span>
      <span class="card__question-body">{{ callout.body }}</span>
    </div>
  }

  @if (showReply() && openQuestion(); as q) {
    <app-question-reply-composer
      [question]="q"
      [vaultItemId]="item().id"
      currentActor="marvin"
      (posted)="onReplyPosted($event)"
    />
  }

  <div class="card__actions">
    @if (openQuestion()) {
      <button
        type="button"
        class="card__action card__action--reply"
        [class.card__action--reply-active]="showReply()"
        (click)="toggleReply(); $event.stopPropagation()"
      >reply ↩</button>
    }
    <button
      type="button"
      class="card__action card__action--delete"
      (click)="remove.emit(); $event.stopPropagation()"
    >delete</button>
    <button
      type="button"
      class="card__action card__action--more"
      (click)="$event.stopPropagation()"
      aria-label="More actions"
    >···</button>
  </div>

</article>
```

Note: `currentActor="marvin"` is a static string binding matching `actorId('marvin')` used in the detail body. The `actorId` brand type accepts the string in the service directly.

- [ ] **Step 3.2: Update card SCSS — add action row and question styles**

Open `grooming-card.scss`. Find and remove styles for `.card__expand-btn`, `.card__live`, `.card__live-row`, `.card__live-icon`, `.card__live-actor`, `.card__live-text`, `.card__live-when`, `.card__live-empty`, `.card__footer`, `.card__pulse`, `.card__age` (in footer context), `.card__tags`, `.card__tag`, `.card__tag-more`.

Then add these new rules (append to end of file or replace the removed blocks):

```scss
// Question display — primary content for intake_rejected cards
.card__question {
  padding: 8px 12px;
  background: var(--color-surface-muted, #f5f5f5);
  border-left: 2px solid var(--color-border, #ccc);
  margin: 0 0 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card__question-who {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-muted, #888);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.card__question-body {
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text, #111);
}

// Age + stuck in header right slot
.card__age {
  font-size: 10px;
  color: var(--color-text-muted, #bbb);
}

.card__stuck {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-muted, #888);
  border: 1px solid currentColor;
  padding: 0 4px;
}

// Permanent action row — always visible, 44px+ tap targets
.card__actions {
  display: flex;
  border-top: 1px solid var(--color-border, #eee);
  margin-top: 4px;
}

.card__action {
  flex: 1;
  min-height: 44px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  border-right: 1px solid var(--color-border, #eee);
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  color: var(--color-text-muted, #555);

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: var(--color-surface-muted, #f5f5f5);
  }

  &--reply {
    background: var(--color-text, #111);
    color: var(--color-bg, #fff);

    &:hover {
      opacity: 0.85;
    }
  }

  &--reply-active {
    background: #333;
    color: var(--color-bg, #fff);
  }

  &--delete {
    color: var(--color-text-muted, #666);
  }

  &--more {
    flex: 0 0 44px;
    color: var(--color-text-muted, #bbb);
    letter-spacing: 2px;
  }
}
```

- [ ] **Step 3.3: Check compile**

```bash
cd /Users/marvinbarretto/development/jimbo/dashboard
npx ng build --no-progress 2>&1 | grep -E "error|warning" | head -20
```

Expected: 0 errors.

- [ ] **Step 3.4: Commit**

```bash
git add src/app/features/grooming/components/grooming-card/
git commit -m "feat(grooming): permanent action row with inline reply on grooming card"
```

---

## Task 4: Detail body — stacked sections (remove tabs)

Replace the `activeTab` signal + tab nav with a stacked layout. Each section has its own `signal(boolean)` for expand/collapse. The open-questions zone appears at the top whenever there are open questions, with the reply composer embedded inline.

**Files:**
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.ts`
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html`

- [ ] **Step 4.1: Update vault-item-detail-body.ts**

**a) Add import for QuestionReplyComposer:**

In the imports block at the top of the file, add:
```typescript
import { QuestionReplyComposer } from '@shared/components/question-reply-composer/question-reply-composer';
```

**b) Add QuestionReplyComposer to @Component imports array:**

```typescript
imports: [RouterLink, ThreadView, RejectFormComponent, ActivityLogComponent, PipelineStepperComponent, QuestionReplyComposer],
```

**c) Replace the activeTab / setActiveTab block** (lines 164–169 currently):

Remove:
```typescript
readonly activeTab = signal<'overview' | 'body' | 'activity' | 'thread'>('overview');
setActiveTab(tab: 'overview' | 'body' | 'activity' | 'thread'): void {
  this.activeTab.set(tab);
}
```

Replace with:
```typescript
// Stacked section collapse state. Body starts expanded; activity + thread start collapsed.
readonly sectionBody     = signal(true);
readonly sectionActivity = signal(false);
readonly sectionThread   = signal(false);

toggleSection(section: 'body' | 'activity' | 'thread'): void {
  if (section === 'body')     this.sectionBody.update(v => !v);
  if (section === 'activity') this.sectionActivity.update(v => !v);
  if (section === 'thread')   this.sectionThread.update(v => !v);
}

// Open questions for the current item. Used in the question zone at the top of the detail.
readonly openQuestions = computed(() => {
  const i = this.item();
  if (!i) return [];
  return this.threadService.openQuestionsFor(i.id)();
});

onDetailReplyPosted(payload: import('@domain/thread').CreateThreadMessagePayload): void {
  this.threadService.post(payload);
}
```

Also remove `openReject` method's `this.activeTab.set('overview')` call (line 200). That line becomes:
```typescript
openReject(): void { this.showRejectForm.set(true); }
```

- [ ] **Step 4.2: Replace vault-item-detail-body.html**

Replace the entire file contents with:

```html
@if (item(); as item) {
  <div class="vault-item-detail">

    <!-- ===== Zone 1 — Identity + header ===== -->
    <header class="modal-header__zone1">
      <div class="modal-header__id">
        <span class="modal-header__seq">#{{ item.seq }}</span>
        <span class="modal-header__type">{{ item.type }}</span>
        <h1 class="modal-header__title">{{ item.title }}</h1>
      </div>
    </header>

    <!-- ===== Zone 2 — Condensed status chips ===== -->
    <div class="modal-header__zone2">
      <div class="detail-chips">
        <select class="chip chip--status chip--status-{{ lifecycleOf(item) }}"
          (change)="onStatusChange($event)"
          [disabled]="isItemArchived(item)"
          [attr.aria-label]="'Status: ' + lifecycleOf(item)">
          @for (s of statuses; track s) {
            <option [value]="s" [selected]="lifecycleOf(item) === s">{{ s }}</option>
          }
          @if (isItemArchived(item)) {
            <option value="archived" selected>archived</option>
          }
        </select>

        <span [class]="'chip chip--grooming chip--grooming-' + item.grooming_status">
          {{ item.grooming_status.replace(/_/g, ' ') }}
        </span>

        <span class="chip-group chip-group--owner">
          @if (owner(); as o) {
            <a [routerLink]="['/actors', o.id]"
              [class]="'chip chip--owner chip--actor-' + o.kind">
              @{{ o.id }}
            </a>
          } @else if (item.assigned_to) {
            <span class="chip chip--owner">{{ item.assigned_to }}</span>
          } @else {
            <span class="chip chip--owner chip--unassigned">unassigned</span>
          }
          <button class="chip-action" (click)="toggleReassignPicker()" aria-label="Reassign owner">
            {{ showReassignPicker() ? '▲' : '▼' }}
          </button>
          @if (showReassignPicker()) {
            <span class="inline-picker" role="listbox" aria-label="Select new owner">
              @for (a of activeActors(); track a.id) {
                <button class="inline-picker__opt" role="option"
                  [attr.aria-selected]="a.id === item.assigned_to"
                  (click)="reassign(a.id)">
                  @{{ a.id }}
                </button>
              }
            </span>
          }
        </span>

        @if (effectivePriority(); as p) {
          <span [class]="'chip chip--priority chip--priority-P' + p">
            {{ priorityLabel(p) }}{{ priorityDiverges() ? ' *' : '' }}
          </span>
        }

        @if (item.actionability !== null) {
          <span [class]="'chip chip--action chip--action-' + item.actionability">
            {{ item.actionability }}
          </span>
        }
      </div>

      <div class="detail-meta">
        <span>created {{ relativeTime(item.created_at) }}</span>
        @if (lastActivityAt(); as lat) {
          <span>· last activity {{ relativeTime(lat) }}</span>
        }
        @if (item.ai_rationale) {
          <span class="detail-meta__rationale">
            · rationale:
            @if (rationaleExpanded()) {
              {{ item.ai_rationale }}
              <button type="button" class="rationale-toggle" (click)="toggleRationale()">collapse</button>
            } @else {
              <em>"{{ truncate(item.ai_rationale, 80) }}"</em>
              <button type="button" class="rationale-toggle" (click)="toggleRationale()">expand</button>
            }
          </span>
        }
      </div>
    </div>

    @if (showRejectForm()) {
      <app-reject-form
        [itemId]="item.id"
        [currentOwner]="item.assigned_to"
        [recentEvents]="events()"
        [availableActors]="availableActors()"
        (cancelled)="closeReject()"
        (submitted)="onRejectSubmitted($event)"
      />
    }

    <!-- ===== Zone 3 — Open questions (always visible when present) ===== -->
    @if (openQuestions().length > 0) {
      <section class="detail-section detail-section--questions">
        @for (q of openQuestions(); track q.id) {
          <div class="detail-question">
            <div class="detail-question__who">
              <span class="detail-question__author">{{ q.author_actor_id }}</span>
              <span class="detail-question__kind">open question</span>
              <span class="detail-question__age">{{ relativeTime(q.created_at) }}</span>
            </div>
            <p class="detail-question__body">{{ q.body }}</p>
            <app-question-reply-composer
              [question]="q"
              [vaultItemId]="item.id"
              currentActor="marvin"
              (posted)="onDetailReplyPosted($event)"
            />
          </div>
        }
      </section>
    }

    <!-- ===== Zone 4 — Body (collapsible) ===== -->
    <section class="detail-section">
      <button type="button" class="detail-section__header" (click)="toggleSection('body')">
        <span class="detail-section__title">Body</span>
        <span class="detail-section__meta">{{ sectionBody() ? '▴' : '▾' }}</span>
      </button>
      @if (sectionBody()) {
        <div class="detail-section__content">

          <div class="section">
            <div class="section__label">Body <span class="section__hint">(intake, immutable)</span></div>
            @if (item.body) {
              <pre class="intake">{{ item.body }}</pre>
            } @else {
              <p class="muted-text">no body content</p>
            }
            <p class="intake__note">{{ relativeTime(item.created_at) }} · operator intake</p>
          </div>

          <div class="section">
            <div class="section__label">Acceptance criteria</div>
            @if (item.acceptance_criteria.length > 0) {
              <ul class="ac-list">
                @for (ac of item.acceptance_criteria; track ac.text) {
                  <li [class]="'ac-item' + (ac.done ? ' ac-item--done' : '') + (acStatus(ac.text) === 'verbose' ? ' ac-item--verbose' : '') + (acStatus(ac.text) === 'exceeds' ? ' ac-item--exceeds' : '')">
                    <span class="ac-item__mark" [attr.aria-label]="ac.done ? 'done' : 'pending'">
                      {{ ac.done ? '✓' : '○' }}
                    </span>
                    <span class="ac-item__text">{{ ac.text }}</span>
                    @switch (acStatus(ac.text)) {
                      @case ('verbose') {
                        <span class="ac-item__chip ac-item__chip--warn">verbose</span>
                      }
                      @case ('exceeds') {
                        <span class="ac-item__chip ac-item__chip--err">exceeds</span>
                      }
                    }
                  </li>
                }
              </ul>
            } @else {
              <div class="ac-empty">No acceptance criteria yet — blocks readiness</div>
            }
          </div>

          <div class="section">
            <div class="section__label">Tags</div>
            <div class="chip-row">
              @for (tag of item.tags; track tag) {
                <span class="chip">{{ tag }}</span>
              } @empty {
                <span class="chip chip--empty">none yet</span>
              }
            </div>
          </div>

          <div class="section">
            <div class="section__label">Parent</div>
            @if (parentItem(); as parent) {
              <button type="button" class="parent-link" (click)="swapToSeq(parent.seq)">
                ↳ #{{ parent.seq }} · {{ parent.title }}
              </button>
            } @else if (item.parent_id) {
              <span class="muted">{{ item.parent_id }} (parent not loaded)</span>
            } @else if (children().length === 0) {
              <p class="muted-text">standalone — not part of an epic</p>
            } @else {
              <p class="muted-text">root of an epic</p>
            }
          </div>

          @if (children().length > 0) {
            <div class="section">
              <div class="section__label">
                Subtasks
                <span class="hint">({{ children().length }} — this item is an epic)</span>
              </div>
              <ul class="subtask-list">
                @for (child of children(); track child.id) {
                  <li class="subtask-row">
                    <button type="button" class="subtask-row__link" (click)="swapToSeq(child.seq)">
                      #{{ child.seq }} · {{ child.title }}
                    </button>
                    <span class="subtask-row__status">{{ child.grooming_status }}</span>
                  </li>
                }
              </ul>
            </div>
          }

          <div class="section">
            <div class="section__label">Projects</div>
            <div class="junction-list">
              @for (p of projects(); track p.id) {
                <span class="junction-chip">
                  <a [routerLink]="['/projects', p.id]" class="junction-chip__label">{{ p.display_name }}</a>
                  <button class="junction-chip__remove" (click)="removeProject(p.id)" [attr.aria-label]="'Remove ' + p.display_name">×</button>
                </span>
              }
              <button class="inline-btn junction-add-btn" (click)="toggleAddProjectPicker()" aria-label="Link a project">+ add project</button>
            </div>
            @if (showAddProjectPicker()) {
              <div class="junction-picker">
                @for (p of activeProjects(); track p.id) {
                  <button class="junction-picker__opt" (click)="addProject(p.id)">{{ p.display_name }}</button>
                } @empty {
                  <span class="muted">No active projects</span>
                }
              </div>
            }
          </div>

          <div class="section">
            <div class="section__label">Blocked by</div>
            <div class="junction-list">
              @for (b of openBlockers(); track b.blocker_id) {
                <span class="junction-chip junction-chip--blocker">
                  <button type="button" class="junction-chip__label" (click)="swapToSeq(b.blocker_seq)">
                    #{{ b.blocker_seq }} · {{ b.blocker_title }}
                  </button>
                  <button class="junction-chip__remove" (click)="removeBlocker(b.blocker_id)" [attr.aria-label]="'Remove blocker #' + b.blocker_seq">×</button>
                </span>
              } @empty {
                <span class="muted">no blockers</span>
              }
            </div>
            <div class="blocker-add">
              <label for="blocker-seq-input" class="visually-hidden">Add blocker by seq number</label>
              <input id="blocker-seq-input" type="number" min="1" placeholder="seq # e.g. 1820" class="blocker-input"
                [value]="addBlockerSeqInput()" (input)="onBlockerSeqInput($event)" />
              <button class="inline-btn" (click)="addBlockerBySeq()" [disabled]="!addBlockerSeqInput()">+ add blocker</button>
            </div>
          </div>

          @if (item.source) {
            <div class="section">
              <div class="section__label">Source</div>
              <dl class="kv">
                <dt>Kind</dt><dd>{{ item.source.kind }}</dd>
                <dt>Ref</dt><dd>{{ item.source.ref }}</dd>
                @if (item.source.url) {
                  <dt>URL</dt>
                  <dd><a [href]="item.source.url" target="_blank" rel="noopener noreferrer" class="external-link">{{ item.source.url }}</a></dd>
                }
              </dl>
            </div>
          }

          @if (readiness(); as r) {
            <div class="section">
              <div class="section__label">Readiness</div>
              <details class="chip chip--readiness">
                <summary>{{ r.passed }}/{{ r.total }} <span [class]="'readiness-verdict readiness-verdict--' + r.verdict">{{ r.verdict }}</span></summary>
                <ul class="readiness-list">
                  @for (check of r.checks; track check.key) {
                    <li [class]="'readiness-check readiness-check--' + (check.ok ? 'ok' : 'miss')">
                      <span class="readiness-check__mark">{{ check.ok ? '✓' : '✗' }}</span>
                      <span class="readiness-check__label">
                        {{ check.label }}
                        @if (!check.ok && check.blocker) {
                          <span class="readiness-check__blocker"> — {{ check.blocker }}</span>
                        }
                      </span>
                    </li>
                  }
                </ul>
              </details>
            </div>
          }

        </div>
      }
    </section>

    <!-- ===== Zone 5 — Activity (collapsible) ===== -->
    <section class="detail-section">
      <button type="button" class="detail-section__header" (click)="toggleSection('activity')">
        <span class="detail-section__title">Activity</span>
        <span class="detail-section__meta">
          {{ events().length }} events {{ sectionActivity() ? '▴' : '▾' }}
        </span>
      </button>
      @if (sectionActivity()) {
        <div class="detail-section__content">
          <app-activity-log
            [events]="events()"
            [actorLabel]="actorLabelFn"
            [actorKind]="actorKindFn"
          />
        </div>
      }
    </section>

    <!-- ===== Zone 6 — Thread (collapsible) ===== -->
    <section class="detail-section">
      <button type="button" class="detail-section__header" (click)="toggleSection('thread')">
        <span class="detail-section__title">Thread</span>
        <span class="detail-section__meta">
          {{ messages().length }} messages {{ sectionThread() ? '▴' : '▾' }}
        </span>
      </button>
      @if (sectionThread()) {
        <div class="detail-section__content">
          <app-thread-view
            [vaultItemId]="item.id"
            [currentActor]="currentActorId"
            [actorMap]="actorMap()">
          </app-thread-view>
        </div>
      }
    </section>

    <!-- Spacer so sticky bar doesn't cover the last section -->
    <div class="detail-sticky-spacer"></div>

  </div>
} @else {
  <div class="vault-item-not-found">
    <a routerLink="/vault-items" class="back-link">← Vault</a>
    <p>Item not found.</p>
  </div>
}
```

- [ ] **Step 4.3: Check compile**

```bash
npx ng build --no-progress 2>&1 | grep -E "error TS|ERROR" | head -20
```

Expected: 0 errors. If `openReject()` call reference to `activeTab` is still there, remove it (see step 4.1 note).

- [ ] **Step 4.4: Commit**

```bash
git add src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.ts \
        src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html
git commit -m "feat(detail): replace tab system with stacked collapsible sections + question zone"
```

---

## Task 5: Detail body — sticky action bar + SCSS

Add the sticky bottom bar (delete / edit / ···) and update the SCSS for section headers, the question zone, and the spacer.

**Files:**
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html`
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.scss`

- [ ] **Step 5.1: Add sticky bar to the detail HTML**

Inside the `@if (item(); as item)` block, immediately before the closing `</div>` of `.vault-item-detail` (just before `</div>`) and after the spacer div, add:

```html
    <!-- ===== Sticky action bar ===== -->
    <div class="detail-sticky-bar">
      <button type="button" class="detail-sticky-bar__primary" (click)="deleteItem()">
        delete
      </button>
      <a [routerLink]="['/vault-items', item.seq, 'edit']" class="detail-sticky-bar__secondary">
        edit
      </a>
      <div class="detail-sticky-bar__overflow" role="group" aria-label="More actions">
        @if (canReject()) {
          <button type="button" class="detail-sticky-bar__overflow-btn" (click)="openReject()">
            reject
          </button>
        }
        <button type="button" class="detail-sticky-bar__overflow-btn"
          (click)="archive()"
          [disabled]="isItemArchived(item)">
          archive
        </button>
      </div>
    </div>
```

- [ ] **Step 5.2: Add SCSS for sticky bar and section headers**

In `vault-item-detail-body.scss`, add these rules (append after existing rules — do not remove any existing rules yet):

```scss
// ── Stacked section layout ─────────────────────────────────────────────────

.detail-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 16px 6px;
}

.detail-meta {
  padding: 4px 16px 10px;
  font-size: 11px;
  color: var(--color-text-muted, #888);
  line-height: 1.5;
  border-bottom: 1px solid var(--color-border, #eee);
}

.detail-section {
  border-bottom: 1px solid var(--color-border, #eee);
}

.detail-section__header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  min-height: 44px;

  &:hover {
    background: var(--color-surface-muted, #f9f9f9);
  }
}

.detail-section__title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted, #666);
}

.detail-section__meta {
  font-size: 11px;
  color: var(--color-text-muted, #bbb);
}

.detail-section__content {
  padding: 0 16px 16px;
}

// Open questions zone — always visible at top when questions exist
.detail-section--questions {
  border-left: 3px solid var(--color-text, #111);
  background: var(--color-surface-muted, #f9f9f9);
}

.detail-question {
  padding: 14px 16px 0;

  & + & {
    border-top: 1px solid var(--color-border, #eee);
  }
}

.detail-question__who {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 10px;
  color: var(--color-text-muted, #888);
}

.detail-question__author {
  font-weight: 700;
  color: var(--color-text, #111);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.detail-question__kind {
  font-size: 9px;
  border: 1px solid var(--color-border, #ccc);
  padding: 1px 5px;
}

.detail-question__age {
  margin-left: auto;
}

.detail-question__body {
  font-size: 15px;
  line-height: 1.55;
  color: var(--color-text, #111);
  font-weight: 600;
  margin-bottom: 4px;
}

// Sticky bar
.detail-sticky-spacer {
  height: 72px; // matches sticky bar height
}

.detail-sticky-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  border-top: 2px solid var(--color-text, #111);
  background: var(--color-bg, #fff);
  z-index: 10;
}

.detail-sticky-bar__primary {
  flex: 2;
  min-height: 52px;
  font-size: 14px;
  font-weight: 700;
  background: var(--color-text, #111);
  color: var(--color-bg, #fff);
  border: none;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    opacity: 0.85;
  }
}

.detail-sticky-bar__secondary {
  flex: 1;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-left: 1px solid var(--color-border, #eee);
  background: transparent;
  color: var(--color-text, #111);
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
}

.detail-sticky-bar__overflow {
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-left: 1px solid var(--color-border, #eee);
}

.detail-sticky-bar__overflow-btn {
  flex: 1;
  padding: 0 12px;
  font-size: 11px;
  border: none;
  border-bottom: 1px solid var(--color-border, #eee);
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  color: var(--color-text-muted, #666);
  white-space: nowrap;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--color-surface-muted, #f5f5f5);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}

// Remove the old tab strip on mobile — it no longer exists in the template.
// The desktop body-grid remains for wider viewports.
@media (max-width: 768px) {
  .body-grid {
    display: block;

    .body-grid__content,
    .body-grid__activity,
    .body-grid__thread {
      // No longer hidden via tab-inactive — each section is controlled by stacked-section collapse.
      display: block !important;
    }
  }
}
```

- [ ] **Step 5.3: Check compile and test**

```bash
npx ng build --no-progress 2>&1 | grep -E "error TS|ERROR" | head -20
```

Expected: 0 errors.

- [ ] **Step 5.4: Commit**

```bash
git add src/app/features/vault-items/components/vault-item-detail-body/
git commit -m "feat(detail): sticky action bar and stacked section SCSS"
```

---

## Task 6: Remove dead tab code from detail body SCSS

The `detail-section--tab-inactive` class and the old tab strip styles no longer exist in the template. Clean them up.

**Files:**
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.scss`

- [ ] **Step 6.1: Find and remove dead CSS**

Search for and delete these selectors from `vault-item-detail-body.scss`:

- `.detail-tabs` block
- `.detail-tab` block and its modifiers
- `.detail-tab--active` block
- `.detail-tab__badge` block
- `.detail-section--tab-inactive` block

Also search for and remove styles for `.modal-header__zone3` and `.modal-header__zone4` if they existed (they were replaced with `.detail-chips`, `.detail-meta`).

Search command to find what needs removing:
```bash
grep -n "detail-tabs\|detail-tab\|tab-inactive\|zone3\|zone4" \
  src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.scss
```

Remove each line/block the grep finds.

- [ ] **Step 6.2: Check compile**

```bash
npx ng build --no-progress 2>&1 | grep -E "error TS|ERROR" | head -20
```

Expected: 0 errors.

- [ ] **Step 6.3: Commit**

```bash
git add src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.scss
git commit -m "chore(detail): remove dead tab strip CSS"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Permanent action row on cards (always visible, tap targets ≥44px) — Task 3
- ✅ Boris's question as primary card content (not behind expand) — Task 3
- ✅ Inline reply from card — Tasks 1, 2, 3
- ✅ Token buttons (# / @ / /) in composer — Task 1 (plain text insert, phase 2 = autocomplete)
- ✅ Stacked sections instead of tabs in detail — Task 4
- ✅ Open question zone at top of detail with inline reply — Task 4
- ✅ Sticky action bar in detail (delete / edit / overflow) — Task 5
- ⚠️ Remove old action buttons row (edit/reject/archive/delete) from detail header — handled by Task 4 (new template omits them; all actions now in sticky bar + reject is in overflow)
- ✅ Tags removed from cards — Task 3 (not in new template)
- ✅ Owner chip / pulse removed from card footer — Task 3 (footer removed entirely)

**Not in scope / follow-up:**
- Token autocomplete dropdown (phase 2)
- `/questions` page (separate plan, needs backend endpoint)
- Per-status sticky bar label config (apply after foundation is in place)
- `···` overflow bottom sheet on card (currently a no-op button — phase 2)
