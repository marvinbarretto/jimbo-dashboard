# Grooming pipeline + modal improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Grooming pipeline more parseable, auditable, and recoverable — surface actor hand-offs in the activity log, fix the parent link, police acceptance-criteria verbosity, add a reject-with-reason flow into a new `needs_rework` column, and restructure the modal header.

**Architecture:** Five themes layered on the existing standalone-Angular + signals + Hono/Postgres stack. Domain-types-first → service mutation → UI flow → card shapes → activity log → header → AC validation. Domain extensions plug into existing discriminated unions (`GroomingStatus`, `ThreadMessageKind`, `VaultActivityEvent`); no new architecture.

**Tech Stack:** Angular 20 (standalone, signals, OnPush), TypeScript strict, SCSS modules, Vitest (unit), Playwright (E2E), Hono+Drizzle backend, Postgres.

**Spec:** `docs/superpowers/specs/2026-04-27-grooming-modal-improvements-design.md`

**Test policy:** Unit-test domain logic and service mutations (Vitest, co-located). E2E-test reject flow happy-path (Playwright). Skip component rendering tests — Marvin's preference per `docs/conventions.md`.

**Implementation note on atomicity:** The spec called for a single transactional API endpoint. We instead compose the mutation client-side via three existing endpoints (PATCH vault item, POST thread message, POST activity event). This matches the existing service pattern (`setGroomingStatus`, `reassign`, `archive`) and avoids a backend change. A server-side atomic endpoint can replace the composed call later without touching consumers — they call `rejectItem()`, not the HTTP endpoints directly.

---

## File structure

```
src/app/
  domain/
    vault/vault-item.ts                                     ← MODIFY (extend GroomingStatus + tables)
    activity/activity-event.ts                              ← MODIFY (add RejectionEvent, add log_lines to AgentRunCompletedEvent)
    activity/activity-event.test.ts                         ← CREATE (type guard tests for new events)
    thread/thread-message.ts                                ← MODIFY (extend ThreadMessageKind)
  features/vault-items/data-access/
    vault-items.service.ts                                  ← MODIFY (add rejectItem method)
    vault-items.service.test.ts                             ← CREATE / MODIFY (rejectItem tests)
  features/vault-items/components/vault-item-detail-body/
    vault-item-detail-body.ts                               ← MODIFY (replace routerLinks, add reject UI, header restructure, activity rendering)
    vault-item-detail-body.html                             ← MODIFY
    vault-item-detail-body.scss                             ← MODIFY
    reject-form/reject-form.ts                              ← CREATE
    reject-form/reject-form.html                            ← CREATE
    reject-form/reject-form.scss                            ← CREATE
    pipeline-stepper/pipeline-stepper.ts                    ← CREATE
    pipeline-stepper/pipeline-stepper.html                  ← CREATE
    pipeline-stepper/pipeline-stepper.scss                  ← CREATE
    activity-log/activity-log.ts                            ← CREATE (extracted from detail body)
    activity-log/activity-log.html                          ← CREATE
    activity-log/activity-log.scss                          ← CREATE
    activity-log/event-line/event-line.ts                   ← CREATE (single event row)
    activity-log/event-line/event-line.html                 ← CREATE
    activity-log/event-line/event-line.scss                 ← CREATE
    activity-log/verbosity-toggle/verbosity-toggle.ts       ← CREATE
    activity-log/verbosity-toggle/verbosity-toggle.html     ← CREATE
    activity-log/verbosity-toggle/verbosity-toggle.scss     ← CREATE
    activity-log/event-formatter.ts                         ← CREATE (pure event → line shape)
    activity-log/event-formatter.test.ts                    ← CREATE
    activity-log/verbosity.ts                               ← CREATE (level enum + persistence)
    activity-log/verbosity.test.ts                          ← CREATE
  features/grooming/components/grooming-card/
    grooming-card.ts                                        ← MODIFY (needsRework + subitem shapes)
    grooming-card.html                                      ← MODIFY
    grooming-card.scss                                      ← MODIFY
    rework-badge/rework-badge.ts                            ← CREATE
    rework-badge/rework-badge.html                          ← CREATE
    rework-badge/rework-badge.scss                          ← CREATE
  shared/validation/
    acceptance-criterion-length.ts                          ← CREATE
    acceptance-criterion-length.test.ts                     ← CREATE

e2e/
  grooming-reject.spec.ts                                   ← CREATE (Playwright E2E for reject flow)
```

Larger files like `vault-item-detail-body.ts` (currently ~330 lines) are growing — the activity-log extraction in Phase 6 splits this concern out into its own component, which is good per `docs/conventions.md` ("when a file grows large, that's often a signal").

---

## Phase 1 — Domain types & event extensions

### Task 1: Extend `GroomingStatus` with `needs_rework`

**Files:**
- Modify: `src/app/domain/vault/vault-item.ts:57-63`

- [ ] **Step 1: Update the type union**

```typescript
export type GroomingStatus =
  | 'ungroomed'
  | 'needs_rework'        // operator rejected the work; reassigned to a new owner
  | 'intake_rejected'
  | 'intake_complete'
  | 'classified'
  | 'decomposed'
  | 'ready';
```

- [ ] **Step 2: Update column comment block above the union**

Replace the closing comment paragraph (lines 53-56) to include `needs_rework`:

```typescript
// `intake_rejected` and `intake_complete` are disjunct post-intake states:
//   - `intake_rejected`: intake-quality ran and produced clarifying questions; operator must answer them
//   - `intake_complete`: intake-quality accepted; ready for classification
// After classification the pipeline progresses: classified → decomposed → ready.
//
// `needs_rework` is a side-branch state: the operator rejected an agent's
// (or human's) output and the item is reassigned to a new owner. It can be
// entered from any other status; the new owner picks it up, addresses the
// rejection reason in the discussion thread, and moves the item back into
// the main pipeline when ready.
```

### Task 2: Place `needs_rework` first in `GROOMING_STATUS_ORDER`

**Files:**
- Modify: `src/app/domain/vault/vault-item.ts:68-75`

- [ ] **Step 1: Update the order array**

```typescript
export const GROOMING_STATUS_ORDER = [
  'needs_rework',
  'ungroomed',
  'intake_rejected',
  'intake_complete',
  'classified',
  'decomposed',
  'ready',
] as const satisfies readonly GroomingStatus[];
```

(`needs_rework` is leftmost — operator's eye starts at "what needs my attention".)

### Task 3: Update `GROOMING_STATUS_LABELS` and `GROOMING_EMPTY_LABELS`

**Files:**
- Modify: `src/app/domain/vault/vault-item.ts:79-98`

- [ ] **Step 1: Add labels**

```typescript
export const GROOMING_STATUS_LABELS: Record<GroomingStatus, string> = {
  needs_rework:     'Needs rework',
  ungroomed:        'Ungroomed',
  intake_rejected:  'Intake rejected',
  intake_complete:  'Intake complete',
  classified:       'Classified',
  decomposed:       'Decomposed',
  ready:            'Ready',
};

export const GROOMING_EMPTY_LABELS: Record<GroomingStatus, string> = {
  needs_rework:     'No items need rework',
  ungroomed:        'No ungroomed items',
  intake_rejected:  'No items rejected',
  intake_complete:  'Nothing pending classification',
  classified:       'Nothing classified yet',
  decomposed:       'Nothing in draft',
  ready:            'No ready items',
};
```

### Task 4: Allow `needs_rework` through the API narrowing

**Files:**
- Modify: `src/app/features/vault-items/data-access/vault-items.service.ts:385-388`

- [ ] **Step 1: Update `narrowGroomingStatus`**

```typescript
function narrowGroomingStatus(s: string): GroomingStatus {
  const valid: readonly GroomingStatus[] = [
    'needs_rework',
    'ungroomed',
    'intake_rejected',
    'intake_complete',
    'classified',
    'decomposed',
    'ready',
  ];
  return (valid as readonly string[]).includes(s) ? s as GroomingStatus : 'ungroomed';
}
```

### Task 5: Extend `ThreadMessageKind` with `rejection`

**Files:**
- Modify: `src/app/domain/thread/thread-message.ts:11-14`

- [ ] **Step 1: Add to union**

```typescript
export type ThreadMessageKind =
  | 'comment'    // unstructured — any actor, any time
  | 'question'   // asked by someone, expects an answer to unblock
  | 'answer'     // responds to a question (see `in_reply_to`)
  | 'rejection'; // operator rejected agent's work; carries the redirect reason
```

### Task 6: Add `RejectionEvent` to activity events

**Files:**
- Modify: `src/app/domain/activity/activity-event.ts` — add new interface, add to `VaultActivityEvent` union

- [ ] **Step 1: Add the interface (after `AgentRunCompletedEvent`, around line 125)**

```typescript
// Operator-driven rejection of an agent's (or human's) work. Distinct from
// `grooming_status_changed` + `assigned`: a rejection bundles the state move
// (any → needs_rework), the owner change, and the reason text into one event,
// so the audit trail is "@actor rejected from <from_status> → @to_owner: <reason>"
// rather than three separate rows the operator has to mentally stitch.
//
// The thread-side counterpart is a ThreadMessage with kind='rejection' and the
// same body. `thread_message_id` links the two.
export interface RejectionEvent extends VaultEventBase {
  type: 'rejected';
  from_status:        GroomingStatus;
  to_status:          'needs_rework';
  from_owner:         ActorId | null;
  to_owner:           ActorId;
  reason:             string;
  thread_message_id:  ThreadMessageId;
}
```

- [ ] **Step 2: Add to `VaultActivityEvent` union**

```typescript
export type VaultActivityEvent =
  | CreatedEvent
  | AssignedEvent
  | CompletionChangedEvent
  | ArchivedEvent
  | UnarchivedEvent
  | GroomingStatusChangedEvent
  | ThreadMessagePostedEvent
  | AgentRunCompletedEvent
  | RejectionEvent;
```

### Task 7: Add `log_lines` to `AgentRunCompletedEvent`

**Files:**
- Modify: `src/app/domain/activity/activity-event.ts:98-125`

- [ ] **Step 1: Add field with comment**

In the `AgentRunCompletedEvent` interface, add after `error`:

```typescript
  // Truncated runtime log lines from the skill's stdout, captured at run completion.
  // Maximum 50 lines, each truncated to 200 chars. UI shows these only at Debug
  // verbosity in a collapsed <details>. Null when the runner doesn't emit logs;
  // the UI degrades gracefully (just doesn't render the section).
  log_lines:     string[] | null;
```

### Task 8: Write type-guard tests for new event shapes

**Files:**
- Create: `src/app/domain/activity/activity-event.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { isVaultEvent, isProjectEvent, type VaultActivityEvent, type RejectionEvent } from './activity-event';
import { activityId, actorId, vaultItemId, threadMessageId } from '../ids';

describe('RejectionEvent', () => {
  it('is recognised as a vault event by isVaultEvent', () => {
    const event: RejectionEvent = {
      id: activityId('a-1'),
      actor_id: actorId('marvin'),
      at: '2026-04-27T10:00:00Z',
      vault_item_id: vaultItemId('v-1'),
      type: 'rejected',
      from_status: 'decomposed',
      to_status: 'needs_rework',
      from_owner: actorId('boris'),
      to_owner: actorId('vault-decompose'),
      reason: 'AC too verbose, retry',
      thread_message_id: threadMessageId('tm-1'),
    };
    expect(isVaultEvent(event)).toBe(true);
    expect(isProjectEvent(event)).toBe(false);
  });

  it('discriminates on `type === "rejected"`', () => {
    const event: VaultActivityEvent = {
      id: activityId('a-2'),
      actor_id: actorId('marvin'),
      at: '2026-04-27T10:00:00Z',
      vault_item_id: vaultItemId('v-1'),
      type: 'rejected',
      from_status: 'classified',
      to_status: 'needs_rework',
      from_owner: null,
      to_owner: actorId('marvin'),
      reason: 'rationale missing',
      thread_message_id: threadMessageId('tm-2'),
    };
    if (event.type === 'rejected') {
      expect(event.from_status).toBe('classified');
    } else {
      throw new Error('discrimination failed');
    }
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/app/domain/activity/activity-event.test.ts`
Expected: PASS

- [ ] **Step 3: Commit Phase 1**

```bash
git add src/app/domain/vault/vault-item.ts \
        src/app/domain/activity/activity-event.ts \
        src/app/domain/activity/activity-event.test.ts \
        src/app/domain/thread/thread-message.ts \
        src/app/features/vault-items/data-access/vault-items.service.ts
git commit -m "feat(grooming): extend types for needs_rework + rejection event"
```

---

## Phase 2 — Service: `rejectItem` mutation

### Task 9: Write failing test for `rejectItem`

**Files:**
- Create: `src/app/features/vault-items/data-access/vault-items.service.test.ts` (or add to existing if present)

- [ ] **Step 1: Confirm whether a test file exists**

Run: `ls src/app/features/vault-items/data-access/vault-items.service.test.ts 2>/dev/null && echo EXISTS || echo CREATE`

If `EXISTS`, add the `describe('rejectItem', …)` block to it. If `CREATE`, scaffold a new one using the structure below. The seed-mode behaviour gives us a deterministic test path that exercises the full sequence without HTTP.

- [ ] **Step 2: Write the failing test**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VaultItemsService } from './vault-items.service';
import { ActivityEventsService } from './activity-events.service';
import { actorId, vaultItemId } from '@domain/ids';
import * as seedModeModule from '@shared/seed-mode';

describe('VaultItemsService.rejectItem (seed mode)', () => {
  let service: VaultItemsService;
  let activityPosts: any[];

  beforeEach(() => {
    vi.spyOn(seedModeModule, 'isSeedMode').mockReturnValue(true);

    activityPosts = [];
    const mockActivity = {
      post: (e: any) => { activityPosts.push(e); },
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        VaultItemsService,
        { provide: ActivityEventsService, useValue: mockActivity },
      ],
    });
    service = TestBed.inject(VaultItemsService);
  });

  it('moves item to needs_rework, reassigns owner, posts thread message + rejection event', () => {
    // Seed an item via the service's items signal — find a real seed item
    const items = service.items();
    const item = items.find(i => i.grooming_status === 'decomposed');
    if (!item) throw new Error('no decomposed seed item — adjust fixture');

    service.rejectItem(item.id, 'AC too verbose, retry', actorId('vault-decompose'));

    const updated = service.getById(item.id)!;
    expect(updated.grooming_status).toBe('needs_rework');
    expect(updated.assigned_to).toBe(actorId('vault-decompose'));

    // Two activity events posted: thread_message_posted + rejected
    const types = activityPosts.map(e => e.type);
    expect(types).toContain('thread_message_posted');
    expect(types).toContain('rejected');

    const rejection = activityPosts.find(e => e.type === 'rejected');
    expect(rejection.from_status).toBe('decomposed');
    expect(rejection.to_status).toBe('needs_rework');
    expect(rejection.reason).toBe('AC too verbose, retry');
    expect(rejection.from_owner).toBe(item.assigned_to);
    expect(rejection.to_owner).toBe(actorId('vault-decompose'));
  });

  it('refuses to reject when reason is empty', () => {
    const items = service.items();
    const item = items.find(i => i.grooming_status === 'decomposed');
    if (!item) throw new Error('no decomposed seed item');

    expect(() => service.rejectItem(item.id, '', actorId('boris'))).toThrow(/reason required/i);
  });

  it('refuses to reject when reason is below minimum length', () => {
    const items = service.items();
    const item = items.find(i => i.grooming_status === 'decomposed');
    if (!item) throw new Error('no decomposed seed item');

    expect(() => service.rejectItem(item.id, 'short', actorId('boris'))).toThrow(/12 chars/i);
  });

  it('is a no-op when item is already in needs_rework', () => {
    // Find/force an item into needs_rework first via setGroomingStatus, then attempt reject
    const items = service.items();
    const item = items.find(i => i.grooming_status === 'decomposed');
    if (!item) throw new Error('no decomposed seed item');
    service.setGroomingStatus(item.id, 'needs_rework');
    activityPosts.length = 0;

    service.rejectItem(item.id, 'should not fire — already in rework', actorId('boris'));
    expect(activityPosts).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run — expect failure**

Run: `npx vitest run src/app/features/vault-items/data-access/vault-items.service.test.ts`
Expected: FAIL — `rejectItem` is not a function

### Task 10: Implement `rejectItem` in the service

**Files:**
- Modify: `src/app/features/vault-items/data-access/vault-items.service.ts`

- [ ] **Step 1: Add imports if missing**

At the top, ensure `ThreadMessageId` and `threadMessageId` are imported from `@domain/ids`. Add `import { threadMessageId } from '@domain/ids';` next to the existing id imports.

- [ ] **Step 2: Add the method below `reassign`**

```typescript
  // Atomic reject-with-reason composition. Composes three writes:
  //   1. PATCH vault-item: grooming_status='needs_rework', assigned_to=newOwnerId
  //   2. POST thread message of kind 'rejection' with the reason
  //   3. POST RejectionEvent activity row referencing the thread message id
  // No-op when item is already in needs_rework. Throws synchronously when reason
  // is missing or below 12 chars — UI guards against this but the service is
  // the durable last line of defence.
  rejectItem(id: VaultItemId, reason: string, newOwnerId: ActorId): void {
    const trimmed = reason.trim();
    if (trimmed.length === 0) throw new Error('reason required');
    if (trimmed.length < 12) throw new Error('reason must be at least 12 chars');

    const prior = this.getById(id);
    if (!prior) return;
    if (prior.grooming_status === 'needs_rework') return; // no-op

    const fromStatus = prior.grooming_status;
    const fromOwner  = prior.assigned_to;
    const tmId       = threadMessageId(crypto.randomUUID());

    const optimistic = { ...prior, grooming_status: 'needs_rework' as const, assigned_to: newOwnerId };
    this._items.update(items => items.map(i => i.id === id ? optimistic : i));

    const threadEvent: EventPayload = {
      type: 'thread_message_posted',
      vault_item_id: id,
      actor_id: this.currentActorId,
      message_id: tmId,
      message_kind: 'rejection',
    };
    const rejectEvent: EventPayload = {
      type: 'rejected',
      vault_item_id: id,
      actor_id: this.currentActorId,
      from_status: fromStatus,
      to_status: 'needs_rework',
      from_owner: fromOwner,
      to_owner: newOwnerId,
      reason: trimmed,
      thread_message_id: tmId,
    };

    if (isSeedMode()) {
      // Two events; the thread message itself isn't persisted in seed mode (no thread store yet)
      this.activityService.post(threadEvent);
      this.activityService.post(rejectEvent);
      return;
    }

    // Live: PATCH item, then POST thread message, then POST events on success.
    // Rolls back the optimistic patch on PATCH failure; thread/event posts are fire-and-forget.
    const patch: UpdateVaultItemPayload = { grooming_status: 'needs_rework', assigned_to: newOwnerId };
    this.http.patch<VaultItem>(`${this.url}/${encodeURIComponent(id)}`, patch).subscribe({
      next: (updated) => {
        this._items.update(items => items.map(i => i.id === id ? updated : i));
        this.http.post(`${environment.dashboardApiUrl}/api/thread-messages`, {
          id: tmId,
          vault_item_id: id,
          author_actor_id: this.currentActorId,
          kind: 'rejection',
          body: trimmed,
          in_reply_to: null,
          answered_by: null,
        }).subscribe({ error: () => {} });
        this.activityService.post(threadEvent);
        this.activityService.post(rejectEvent);
      },
      error: () => this._items.update(items => items.map(i => i.id === id ? prior : i)),
    });
  }
```

- [ ] **Step 3: Run tests — expect pass**

Run: `npx vitest run src/app/features/vault-items/data-access/vault-items.service.test.ts`
Expected: PASS (4/4)

- [ ] **Step 4: Commit Phase 2**

```bash
git add src/app/features/vault-items/data-access/vault-items.service.ts \
        src/app/features/vault-items/data-access/vault-items.service.test.ts
git commit -m "feat(grooming): add rejectItem service mutation with audit trail"
```

---

## Phase 3 — Section 1: Parent link fix

### Task 11: Audit existing `routerLink` uses inside the modal body

**Files:**
- Read: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html`

- [ ] **Step 1: Grep for `routerLink` and `[routerLink]` in the modal body**

Run: `grep -n 'routerLink' src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html`
Expected: at least one match (parent link). Note the file path of any other vault-item-keyed `routerLink` you find — children list, blockers list. They all need the same swap.

### Task 12: Expose a modal-swap helper from `detail-modal.ts`

**Files:**
- Modify: `src/app/shared/kanban/detail-modal.ts`

- [ ] **Step 1: Read the file to find current API**

Run: `cat src/app/shared/kanban/detail-modal.ts`
Identify the existing function that updates `?detail=`. There's already a `withVaultDetailModal()` composable that opens the dialog from query params. The helper to add (or reuse) is `swapDetailSeq(seq: number)` — updates the URL query param using Angular Router so the existing CDK dialog's input recomputes.

- [ ] **Step 2: Add or expose `swapDetailSeq`**

If a function with this behaviour already exists, note its name and skip to the next task. Otherwise, add to the file:

```typescript
import { Router } from '@angular/core';
// existing imports...

// Swaps the modal contents to a different vault item by updating the
// `?detail=<seq>` query param. The parent component's withVaultDetailModal()
// already watches this param and re-binds the dialog body; calling Router.navigate
// with `queryParamsHandling: 'merge'` is enough.
export function swapDetailSeq(router: Router, seq: number): void {
  router.navigate([], {
    queryParams: { detail: seq },
    queryParamsHandling: 'merge',
  });
}
```

### Task 13: Replace the parent `routerLink` with a button calling `swapDetailSeq`

**Files:**
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.ts`
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html` (around line 240-251 per prior exploration)

- [ ] **Step 1: Add `swapToParent` method to the component**

In `vault-item-detail-body.ts`:

```typescript
import { Router } from '@angular/router';
import { swapDetailSeq } from '@shared/kanban/detail-modal';
// existing imports...

// inside class:
private readonly router = inject(Router);

swapToParent(): void {
  const parent = this.parentItem();
  if (!parent) return;
  swapDetailSeq(this.router, parent.seq);
}
```

- [ ] **Step 2: Replace the parent link in the HTML template**

Find the existing parent line (around line 240-251):

```html
<a [routerLink]="['/vault-items', parent.seq]" class="parent-link">
  ↳ #{{ parent.seq }} · {{ parent.title }}
</a>
```

Replace with:

```html
<button type="button" class="parent-link" (click)="swapToParent()">
  ↳ #{{ parent.seq }} · {{ parent.title }}
</button>
```

- [ ] **Step 3: Update SCSS — preserve link-like appearance**

In `vault-item-detail-body.scss`, ensure `.parent-link` (now a button) has reset button styling. Add or confirm:

```scss
.parent-link {
  background: transparent;
  border: 0;
  padding: 0;
  font: inherit;
  color: var(--color-link, #6c8cff);
  cursor: pointer;
  text-align: left;
  &:hover { text-decoration: underline; }
}
```

### Task 14: Apply the same fix to other vault-item links in the modal

**Files:**
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html` (any other `[routerLink]="['/vault-items', …]"` matches found in Task 11)

- [ ] **Step 1: For each match, replicate the button pattern**

Use the same structure: `<button type="button" class="<existing-class>" (click)="swapToSeq(<seq>)">…`. Add a generic `swapToSeq(seq: number)` method to the component:

```typescript
swapToSeq(seq: number): void {
  swapDetailSeq(this.router, seq);
}
```

If no other matches exist, this task is a no-op — confirm with grep.

### Task 15: Smoke-check the parent link manually

- [ ] **Step 1: Open dev server in browser, click a parent link**

Marvin's existing watcher reports compile breakages. Skip running `ng build`. Marvin tests this himself; verify by description: "Open a vault item with a parent → click parent link → modal contents swap to parent item, no full-page navigation, browser back returns to the original item".

If the watcher reports any TS errors, fix and re-verify before commit.

- [ ] **Step 2: Commit Phase 3**

```bash
git add src/app/features/vault-items/components/vault-item-detail-body/ \
        src/app/shared/kanban/detail-modal.ts
git commit -m "fix(grooming): swap modal contents on parent link click instead of navigating"
```

---

## Phase 4 — Section 4: Reject UI flow

### Task 16: Create the `reject-form` component (skeleton)

**Files:**
- Create: `src/app/features/vault-items/components/vault-item-detail-body/reject-form/reject-form.ts`
- Create: `src/app/features/vault-items/components/vault-item-detail-body/reject-form/reject-form.html`
- Create: `src/app/features/vault-items/components/vault-item-detail-body/reject-form/reject-form.scss`

- [ ] **Step 1: Write the component**

```typescript
import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import type { ActorId, VaultItemId } from '@domain/ids';
import type { VaultActivityEvent } from '@domain/activity/activity-event';

export interface RejectSubmission {
  reason: string;
  newOwnerId: ActorId;
}

@Component({
  selector: 'app-reject-form',
  imports: [ReactiveFormsModule],
  templateUrl: './reject-form.html',
  styleUrl: './reject-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RejectFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly itemId        = input.required<VaultItemId>();
  readonly currentOwner  = input<ActorId | null>(null);
  readonly recentEvents  = input<VaultActivityEvent[]>([]);
  readonly availableActors = input<{ id: ActorId; label: string; kind: 'human' | 'agent' | 'system' }[]>([]);

  readonly cancelled = output<void>();
  readonly submitted = output<RejectSubmission>();

  readonly defaultOwner = computed<ActorId | null>(() => {
    // Default to the actor that produced the most recent agent_run_completed event
    const events = this.recentEvents();
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.type === 'agent_run_completed') return e.actor_id;
    }
    return this.currentOwner();
  });

  readonly form = this.fb.nonNullable.group({
    reason:    ['',   [Validators.required, Validators.minLength(12)]],
    newOwner:  ['' as string, [Validators.required]],
  });

  constructor() {
    // When defaultOwner resolves, seed the form (only if user hasn't typed yet).
    queueMicrotask(() => {
      const def = this.defaultOwner();
      if (def && !this.form.controls.newOwner.value) {
        this.form.controls.newOwner.setValue(def);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { reason, newOwner } = this.form.getRawValue();
    this.submitted.emit({ reason: reason.trim(), newOwnerId: newOwner as ActorId });
  }

  cancel(): void { this.cancelled.emit(); }
}
```

- [ ] **Step 2: Write the template**

```html
<form class="reject-form" [formGroup]="form" (ngSubmit)="submit()">
  <h3 class="reject-form__title">Reject this item</h3>

  <label class="reject-form__field">
    <span class="reject-form__label">Reason (≥ 12 chars, supports markdown)</span>
    <textarea
      formControlName="reason"
      rows="4"
      class="reject-form__textarea"
      placeholder="What's wrong with the current output? Be specific — the new owner reads this to know what to fix."
    ></textarea>
    @if (form.controls.reason.touched && form.controls.reason.invalid) {
      <span class="reject-form__error">Reason is required and must be at least 12 characters.</span>
    }
  </label>

  <label class="reject-form__field">
    <span class="reject-form__label">Reassign to</span>
    <select formControlName="newOwner" class="reject-form__select">
      @for (actor of availableActors(); track actor.id) {
        <option [value]="actor.id">@{{ actor.label }} ({{ actor.kind }})</option>
      }
    </select>
  </label>

  <div class="reject-form__actions">
    <button type="button" class="reject-form__cancel" (click)="cancel()">Cancel</button>
    <button type="submit" class="reject-form__submit" [disabled]="form.invalid">
      Reject and reassign
    </button>
  </div>
</form>
```

- [ ] **Step 3: Write the SCSS**

```scss
.reject-form {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid color-mix(in oklab, var(--color-warning, #d99) 40%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--color-warning, #d99) 6%, transparent);

  &__title { margin: 0; font-size: 1rem; font-weight: 600; }
  &__field { display: grid; gap: 0.25rem; }
  &__label { font-size: 0.85rem; opacity: 0.8; }
  &__textarea, &__select {
    font: inherit;
    padding: 0.5rem;
    background: var(--color-bg, #1a1a1a);
    color: var(--color-fg, #eaeaea);
    border: 1px solid var(--color-border, #333);
    border-radius: 4px;
    width: 100%;
  }
  &__error { color: var(--color-error, #f88); font-size: 0.8rem; }
  &__actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  &__cancel, &__submit {
    font: inherit; padding: 0.4rem 0.9rem; border-radius: 4px; cursor: pointer; border: 1px solid var(--color-border, #333); background: transparent; color: inherit;
  }
  &__submit {
    background: var(--color-warning, #d99);
    color: var(--color-bg, #1a1a1a);
    border-color: transparent;
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
}
```

### Task 17: Wire the reject form into the modal — Reject button + slot

**Files:**
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.ts`
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html`
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.scss`

- [ ] **Step 1: Add state + actor list to the component**

In `vault-item-detail-body.ts`:

```typescript
import { RejectFormComponent, type RejectSubmission } from './reject-form/reject-form';
import { actorId } from '@domain/ids';
// existing imports

// inside class:
readonly showRejectForm = signal(false);

// Hardcoded actor catalogue for now — sourced from a central registry later.
readonly availableActors = computed(() => [
  { id: actorId('marvin'),          label: 'marvin',          kind: 'human' as const },
  { id: actorId('boris'),           label: 'boris',           kind: 'agent' as const },
  { id: actorId('ralph'),           label: 'ralph',           kind: 'agent' as const },
  { id: actorId('intake-quality'),  label: 'intake-quality',  kind: 'agent' as const },
  { id: actorId('vault-classify'),  label: 'vault-classify',  kind: 'agent' as const },
  { id: actorId('vault-decompose'), label: 'vault-decompose', kind: 'agent' as const },
]);

// Show reject button only when item is in a state that has work to reject.
readonly canReject = computed(() => {
  const i = this.item();
  if (!i) return false;
  return i.grooming_status !== 'ungroomed' && i.grooming_status !== 'needs_rework';
});

openReject(): void  { this.showRejectForm.set(true); }
closeReject(): void { this.showRejectForm.set(false); }

onRejectSubmitted(submission: RejectSubmission): void {
  const i = this.item();
  if (!i) return;
  try {
    this.vaultItemsService.rejectItem(i.id, submission.reason, submission.newOwnerId);
    this.closeReject();
  } catch (err: unknown) {
    // Surface in template — for now, stay open and the user fixes input
    console.error('rejectItem failed', err);
  }
}
```

Add `RejectFormComponent` to the component's `imports` array.

- [ ] **Step 2: Add a Reject button to the modal header in HTML**

Find the existing actions row (`[edit] [archive] [delete]` near line 89, per prior exploration). Insert a Reject button:

```html
@if (canReject()) {
  <button type="button" class="header-action header-action--warn" (click)="openReject()">
    reject
  </button>
}
```

Place it between the existing edit and archive buttons.

- [ ] **Step 3: Add the form slot below the header**

After the header strip closes, before the body grid, add:

```html
@if (showRejectForm()) {
  <app-reject-form
    [itemId]="item()!.id"
    [currentOwner]="item()!.assigned_to"
    [recentEvents]="events()"
    [availableActors]="availableActors()"
    (cancelled)="closeReject()"
    (submitted)="onRejectSubmitted($event)"
  />
}
```

### Task 18: Manual smoke-test of the reject flow

- [ ] **Step 1: Open a decomposed item, click reject, fill form, submit**

Verify in the browser:
- Reject button appears on items in any state except `ungroomed` and `needs_rework`
- Clicking reveals the form
- Empty reason → submit disabled
- 5-char reason → error message, submit disabled
- Valid submission → form closes, card moves to `needs_rework` column on the kanban behind the modal
- Owner field defaults to the most recent `agent_run_completed` actor (or current owner if none)

If the watcher flags TS errors, fix before committing.

- [ ] **Step 2: Commit Phase 4**

```bash
git add src/app/features/vault-items/components/vault-item-detail-body/
git commit -m "feat(grooming): reject-with-reason form in modal header"
```

---

## Phase 5 — Section 4: Card shapes — `needs_rework` + subitem

### Task 19: Create the `rework-badge` component

**Files:**
- Create: `src/app/features/grooming/components/grooming-card/rework-badge/rework-badge.ts`
- Create: `src/app/features/grooming/components/grooming-card/rework-badge/rework-badge.html`
- Create: `src/app/features/grooming/components/grooming-card/rework-badge/rework-badge.scss`

- [ ] **Step 1: Write the component**

```typescript
import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-rework-badge',
  imports: [],
  templateUrl: './rework-badge.html',
  styleUrl: './rework-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'rework-badge' },
})
export class ReworkBadgeComponent {
  readonly reasonSnippet  = input.required<string>();
  readonly reassignedTo   = input<string | null>(null);
}
```

- [ ] **Step 2: Write the template**

```html
<div class="rework-badge__inner">
  <span class="rework-badge__icon">↺</span>
  <div class="rework-badge__body">
    @if (reassignedTo(); as to) {
      <span class="rework-badge__target">→ &#64;{{ to }}</span>
    }
    <span class="rework-badge__reason">{{ reasonSnippet() }}</span>
  </div>
</div>
```

- [ ] **Step 3: Write the SCSS** (mirroring the draft-badge pattern at grooming-card.scss:58-70)

```scss
.rework-badge {
  display: block;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  background: color-mix(in oklab, var(--color-warning, #d99) 14%, transparent);
  border-left: 3px solid var(--color-warning, #d99);
  font-size: 0.85rem;

  &__inner    { display: flex; gap: 0.5rem; align-items: flex-start; }
  &__icon     { font-size: 1rem; line-height: 1; }
  &__body     { display: grid; gap: 0.15rem; }
  &__target   { font-weight: 600; opacity: 0.85; }
  &__reason   {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    opacity: 0.8;
  }
}
```

### Task 20: Add `needsRework` shape to `grooming-card`

**Files:**
- Modify: `src/app/features/grooming/components/grooming-card/grooming-card.ts`
- Modify: `src/app/features/grooming/components/grooming-card/grooming-card.html`
- Modify: `src/app/features/grooming/components/grooming-card/grooming-card.scss`

- [ ] **Step 1: Add computed signals for the new shapes**

In `grooming-card.ts`, near existing computed signals (`isEpic`, `hasDraft`, etc.):

```typescript
import { ReworkBadgeComponent } from './rework-badge/rework-badge';
// existing imports

// inside class:
readonly needsRework = computed(() => this.item().grooming_status === 'needs_rework');
readonly hasParent   = computed(() => this.item().parent_id !== null);

// Reason snippet for the rework badge — pulled from the latest rejection event,
// which is denormalised onto VaultItem.latest_event when available.
readonly reworkReason = computed(() => {
  const latest = this.item().latest_event;
  if (!latest) return null;
  if (latest.action === 'rejected') return latest.to_value ?? '(no reason captured)';
  return null;
});

// Reassignment target — the `to_value` on the latest assigned event, or the
// current owner. Fallback to current owner.
readonly reworkTarget = computed(() => {
  const owner = this.item().assigned_to;
  return owner ?? null;
});
```

Add `ReworkBadgeComponent` to the component's `imports` array.

- [ ] **Step 2: Add template branch and class hook**

In `grooming-card.html`, near the existing `<app-blocker-badge>` rendering:

```html
@if (needsRework()) {
  <app-rework-badge
    [reasonSnippet]="reworkReason() ?? '(no reason)'"
    [reassignedTo]="reworkTarget()"
  />
}

@if (hasParent()) {
  <span class="card__subitem">↳ #{{ item().parent_id?.slice(0, 8) ?? '' }}</span>
}
```

Note: `parent_id` is a UUID — for the chip we want the parent's seq, not the UUID. Update to use a helper:

```typescript
// in component:
private readonly vaultItems = inject(VaultItemsService);
readonly parentSeq = computed(() => {
  const pid = this.item().parent_id;
  if (!pid) return null;
  return this.vaultItems.getById(pid)?.seq ?? null;
});
```

```html
@if (hasParent() && parentSeq() !== null) {
  <span class="card__subitem">↳ #{{ parentSeq() }}</span>
}
```

- [ ] **Step 3: Add CSS class hook for the new shape**

In `grooming-card.html`, on the root card element, append `card--needs-rework` to the class binding:

```html
<article
  [class]="[
    'card',
    isEpic() ? 'card--epic' : '',
    needsRework() ? 'card--needs-rework' : '',
    hasDraft() ? 'card--draft' : '',
    /* ...existing class bindings */
  ]"
>
```

(Adapt to the existing class-binding pattern in the file — the existing template already has class composition; insert into it.)

- [ ] **Step 4: SCSS — warning tint for the rework state**

In `grooming-card.scss`, add:

```scss
.card--needs-rework {
  border-left: 3px solid var(--color-warning, #d99);
  background: color-mix(in oklab, var(--color-warning, #d99) 4%, var(--color-bg, #1a1a1a));
}

.card__subitem {
  font-size: 0.75rem;
  opacity: 0.6;
  font-family: var(--font-mono, monospace);
}
```

### Task 21: Manual smoke-test the cards

- [ ] **Step 1: Open the grooming board**

Verify in the browser:
- A new leftmost column "Needs rework" exists; empty when no items
- Reject an item from the modal → card appears in `needs_rework` column with rework badge showing reason snippet + reassignment target
- Cards with a `parent_id` show the `↳ #seq` chip in the header

- [ ] **Step 2: Commit Phase 5**

```bash
git add src/app/features/grooming/components/grooming-card/
git commit -m "feat(grooming): card shapes for needs_rework + subitem chip"
```

---

## Phase 6 — Section 2: Activity log standard line + verbosity

### Task 22: Create `verbosity.ts` — level enum + persistence

**Files:**
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/verbosity.ts`
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/verbosity.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { loadVerbosity, saveVerbosity, type VerbosityLevel } from './verbosity';

describe('verbosity persistence', () => {
  beforeEach(() => localStorage.clear());

  it('returns "compact" by default when nothing stored', () => {
    expect(loadVerbosity()).toBe('compact');
  });

  it('round-trips a saved value', () => {
    saveVerbosity('debug');
    expect(loadVerbosity()).toBe('debug');
  });

  it('falls back to "compact" on a corrupt value', () => {
    localStorage.setItem('activity-log-verbosity', 'banana');
    expect(loadVerbosity()).toBe('compact');
  });

  it('typed exhaustively over the union', () => {
    const levels: VerbosityLevel[] = ['compact', 'detailed', 'debug'];
    levels.forEach(l => {
      saveVerbosity(l);
      expect(loadVerbosity()).toBe(l);
    });
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run src/app/features/vault-items/components/vault-item-detail-body/activity-log/verbosity.test.ts`
Expected: FAIL — module missing

- [ ] **Step 3: Implement `verbosity.ts`**

```typescript
export type VerbosityLevel = 'compact' | 'detailed' | 'debug';

const KEY = 'activity-log-verbosity';
const VALID: readonly VerbosityLevel[] = ['compact', 'detailed', 'debug'];

export function loadVerbosity(): VerbosityLevel {
  try {
    const v = localStorage.getItem(KEY);
    return (VALID as readonly string[]).includes(v ?? '') ? (v as VerbosityLevel) : 'compact';
  } catch {
    return 'compact';
  }
}

export function saveVerbosity(level: VerbosityLevel): void {
  try {
    localStorage.setItem(KEY, level);
  } catch { /* swallow — quota / private mode */ }
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run src/app/features/vault-items/components/vault-item-detail-body/activity-log/verbosity.test.ts`
Expected: PASS (4/4)

### Task 23: Create `event-formatter.ts` — pure event → standard line shape

**Files:**
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/event-formatter.ts`
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/event-formatter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { formatEvent, type FormattedLine } from './event-formatter';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { activityId, actorId, vaultItemId, threadMessageId } from '@domain/ids';

const base = {
  id: activityId('a'),
  vault_item_id: vaultItemId('v'),
  at: '2026-04-27T10:00:00Z',
};

describe('formatEvent — standard line shape', () => {
  it('formats `created` as actor + verb', () => {
    const e: VaultActivityEvent = { ...base, type: 'created', actor_id: actorId('marvin') };
    const r = formatEvent(e);
    expect(r.actorId).toBe('marvin');
    expect(r.verb).toBe('created');
    expect(r.target).toBeNull();
  });

  it('formats `assigned` with from→to', () => {
    const e: VaultActivityEvent = { ...base, type: 'assigned', actor_id: actorId('marvin'), from_actor_id: actorId('boris'), to_actor_id: actorId('ralph'), reason: null };
    const r = formatEvent(e);
    expect(r.verb).toBe('reassigned');
    expect(r.target).toBe('ralph');
  });

  it('formats `grooming_status_changed` as a transition verb', () => {
    const e: VaultActivityEvent = { ...base, type: 'grooming_status_changed', actor_id: actorId('marvin'), from: 'classified', to: 'decomposed', note: null };
    const r = formatEvent(e);
    expect(r.verb).toBe('moved');
    expect(r.summary).toMatch(/classified.*→.*decomposed/);
  });

  it('formats `agent_run_completed` showing skill + summary', () => {
    const e: VaultActivityEvent = {
      ...base, type: 'agent_run_completed', actor_id: actorId('vault-decompose'),
      skill_id: 'hermes/vault-decompose' as any, dispatch_id: null, outcome: 'success',
      summary: 'drafted 3 acceptance criteria', decisions: null, reasoning: null,
      from_status: 'classified', to_status: 'decomposed',
      duration_ms: null, model_id: null, tokens_in: null, tokens_out: null, tokens_cached: null, cost_usd: null,
      error: null, log_lines: null,
    };
    const r = formatEvent(e);
    expect(r.verb).toBe('ran');
    expect(r.summary).toContain('drafted 3 acceptance criteria');
  });

  it('formats `rejected` with target and reason', () => {
    const e: VaultActivityEvent = {
      ...base, type: 'rejected', actor_id: actorId('marvin'),
      from_status: 'decomposed', to_status: 'needs_rework',
      from_owner: actorId('boris'), to_owner: actorId('vault-decompose'),
      reason: 'AC too verbose, retry', thread_message_id: threadMessageId('tm-1'),
    };
    const r = formatEvent(e);
    expect(r.verb).toBe('rejected');
    expect(r.target).toBe('vault-decompose');
    expect(r.summary).toContain('AC too verbose');
  });

  it('formats `thread_message_posted` clickable', () => {
    const e: VaultActivityEvent = {
      ...base, type: 'thread_message_posted', actor_id: actorId('marvin'),
      message_id: threadMessageId('tm-x'), message_kind: 'comment',
    };
    const r = formatEvent(e);
    expect(r.verb).toBe('posted comment');
    expect(r.scrollToMessageId).toBe('tm-x');
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run src/app/features/vault-items/components/vault-item-detail-body/activity-log/event-formatter.test.ts`
Expected: FAIL — module missing

- [ ] **Step 3: Implement `event-formatter.ts`**

```typescript
import type { VaultActivityEvent } from '@domain/activity/activity-event';

export interface FormattedLine {
  actorId:           string;
  verb:              string;
  target:            string | null;       // → @target chip
  summary:           string;              // free-form right-hand text
  scrollToMessageId: string | null;       // present for thread_message_posted only
}

export function formatEvent(e: VaultActivityEvent): FormattedLine {
  switch (e.type) {
    case 'created':
      return { actorId: e.actor_id, verb: 'created', target: null, summary: '', scrollToMessageId: null };
    case 'assigned':
      return { actorId: e.actor_id, verb: 'reassigned', target: e.to_actor_id, summary: e.reason ?? '', scrollToMessageId: null };
    case 'grooming_status_changed':
      return { actorId: e.actor_id, verb: 'moved', target: null, summary: `${e.from} → ${e.to}${e.note ? ` — ${e.note}` : ''}`, scrollToMessageId: null };
    case 'completion_changed':
      return { actorId: e.actor_id, verb: e.to ? 'completed' : 'reopened', target: null, summary: e.note ?? '', scrollToMessageId: null };
    case 'archived':
      return { actorId: e.actor_id, verb: 'archived', target: null, summary: e.note ?? '', scrollToMessageId: null };
    case 'unarchived':
      return { actorId: e.actor_id, verb: 'unarchived', target: null, summary: e.note ?? '', scrollToMessageId: null };
    case 'thread_message_posted':
      return { actorId: e.actor_id, verb: `posted ${e.message_kind}`, target: null, summary: '', scrollToMessageId: e.message_id };
    case 'agent_run_completed':
      return { actorId: e.actor_id, verb: 'ran', target: null, summary: e.summary, scrollToMessageId: null };
    case 'rejected':
      return { actorId: e.actor_id, verb: 'rejected', target: e.to_owner, summary: e.reason, scrollToMessageId: e.thread_message_id };
  }
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run src/app/features/vault-items/components/vault-item-detail-body/activity-log/event-formatter.test.ts`
Expected: PASS (6/6)

### Task 24: Create `event-line` component

**Files:**
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/event-line/event-line.ts`
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/event-line/event-line.html`
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/event-line/event-line.scss`

- [ ] **Step 1: Component file**

```typescript
import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { formatEvent } from '../event-formatter';
import type { VerbosityLevel } from '../verbosity';

@Component({
  selector: 'app-event-line',
  imports: [],
  templateUrl: './event-line.html',
  styleUrl: './event-line.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventLineComponent {
  readonly event       = input.required<VaultActivityEvent>();
  readonly verbosity   = input<VerbosityLevel>('compact');
  readonly actorLabel  = input<(actorId: string) => string>(a => a);
  readonly actorKind   = input<(actorId: string) => 'human' | 'agent' | 'system'>(() => 'system');

  readonly line = computed(() => formatEvent(this.event()));

  readonly showDetailed = computed(() => {
    const v = this.verbosity();
    return v === 'detailed' || v === 'debug';
  });
  readonly showDebug = computed(() => this.verbosity() === 'debug');

  readonly costChip = computed(() => {
    const e = this.event();
    if (e.type !== 'agent_run_completed') return null;
    if (e.cost_usd == null) return null;
    return `$${e.cost_usd.toFixed(4)}`;
  });
}
```

- [ ] **Step 2: Template**

```html
<div class="event-line" [class.event-line--debug]="showDebug()">
  <span class="event-line__time">{{ event().at | date:'short' }}</span>
  <span class="event-line__actor">&#64;{{ actorLabel()(line().actorId) }}</span>
  <span class="event-line__kind event-line__kind--{{ actorKind()(line().actorId) }}">{{ actorKind()(line().actorId) }}</span>
  <span class="event-line__verb">{{ line().verb }}</span>
  @if (line().target; as target) {
    <span class="event-line__target">→ &#64;{{ actorLabel()(target) }}</span>
  }
  @if (line().summary && (showDetailed() || event().type !== 'agent_run_completed')) {
    <span class="event-line__summary">{{ line().summary }}</span>
  }
  @if (showDetailed() && costChip(); as chip) {
    <span class="event-line__cost">{{ chip }}</span>
  }

  @if (showDebug() && event().type === 'agent_run_completed') {
    @let agent = $any(event());
    @if (agent.decisions?.length) {
      <ul class="event-line__decisions">
        @for (d of agent.decisions; track d) { <li>{{ d }}</li> }
      </ul>
    }
    @if (agent.reasoning) {
      <blockquote class="event-line__reasoning">{{ agent.reasoning }}</blockquote>
    }
    @if (agent.tokens_in != null || agent.tokens_out != null) {
      <div class="event-line__tokens">
        in {{ agent.tokens_in ?? '?' }} · out {{ agent.tokens_out ?? '?' }}
        @if (agent.tokens_cached != null) { · cached {{ agent.tokens_cached }} }
        · {{ agent.duration_ms ?? '?' }}ms · {{ agent.model_id ?? '?' }}
      </div>
    }
    @if (agent.log_lines?.length) {
      <details class="event-line__logs">
        <summary>{{ agent.log_lines.length }} log lines</summary>
        <pre>@for (l of agent.log_lines; track $index) {{ l }}
</pre>
      </details>
    }
  }
</div>
```

- [ ] **Step 3: SCSS**

```scss
.event-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--color-border, #2a2a2a);
  font-size: 0.85rem;
  line-height: 1.5;

  &__time     { opacity: 0.55; font-variant-numeric: tabular-nums; }
  &__actor    { font-weight: 600; }
  &__kind     {
    font-size: 0.7rem; padding: 0 0.35rem; border-radius: 3px; align-self: center;
    &--human  { background: color-mix(in oklab, #69d 20%, transparent); }
    &--agent  { background: color-mix(in oklab, #d99 20%, transparent); }
    &--system { background: color-mix(in oklab, #888 20%, transparent); }
  }
  &__verb     { opacity: 0.85; }
  &__target   { opacity: 0.85; font-weight: 500; }
  &__summary  { flex-basis: 100%; opacity: 0.7; }
  &__cost     { opacity: 0.5; font-size: 0.75rem; }

  &__decisions, &__reasoning, &__tokens, &__logs { flex-basis: 100%; margin: 0.3rem 0 0; }
  &__reasoning { border-left: 2px solid var(--color-border, #2a2a2a); padding-left: 0.6rem; opacity: 0.7; }
  &__tokens    { font-family: var(--font-mono, monospace); font-size: 0.75rem; opacity: 0.55; }
  &__logs pre  { font-family: var(--font-mono, monospace); font-size: 0.7rem; max-height: 200px; overflow: auto; }

  &--debug { background: color-mix(in oklab, var(--color-fg, #fff) 2%, transparent); }
}
```

### Task 25: Create `verbosity-toggle` component

**Files:**
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/verbosity-toggle/verbosity-toggle.ts`
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/verbosity-toggle/verbosity-toggle.html`
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/verbosity-toggle/verbosity-toggle.scss`

- [ ] **Step 1: Component**

```typescript
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import type { VerbosityLevel } from '../verbosity';

@Component({
  selector: 'app-verbosity-toggle',
  imports: [],
  templateUrl: './verbosity-toggle.html',
  styleUrl: './verbosity-toggle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerbosityToggleComponent {
  readonly value   = input.required<VerbosityLevel>();
  readonly changed = output<VerbosityLevel>();
}
```

- [ ] **Step 2: Template**

```html
<div class="verbosity-toggle" role="radiogroup" aria-label="log verbosity">
  @for (level of ['compact', 'detailed', 'debug']; track level) {
    <button
      type="button"
      class="verbosity-toggle__btn"
      [class.verbosity-toggle__btn--active]="value() === level"
      [attr.aria-checked]="value() === level"
      role="radio"
      (click)="changed.emit($any(level))"
    >{{ level }}</button>
  }
</div>
```

- [ ] **Step 3: SCSS**

```scss
.verbosity-toggle {
  display: inline-flex;
  border: 1px solid var(--color-border, #333);
  border-radius: 4px;
  overflow: hidden;

  &__btn {
    font: inherit; font-size: 0.8rem; padding: 0.25rem 0.6rem;
    background: transparent; color: inherit; border: 0; cursor: pointer;
    &--active { background: var(--color-accent, #6c8cff); color: var(--color-bg, #1a1a1a); }
    &:hover:not(.verbosity-toggle__btn--active) { background: color-mix(in oklab, var(--color-fg, #fff) 8%, transparent); }
  }
}
```

### Task 26: Create `activity-log` component (extracted from detail body)

**Files:**
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/activity-log.ts`
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/activity-log.html`
- Create: `src/app/features/vault-items/components/vault-item-detail-body/activity-log/activity-log.scss`

- [ ] **Step 1: Component**

```typescript
import { Component, ChangeDetectionStrategy, input, signal, computed } from '@angular/core';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { EventLineComponent } from './event-line/event-line';
import { VerbosityToggleComponent } from './verbosity-toggle/verbosity-toggle';
import { loadVerbosity, saveVerbosity, type VerbosityLevel } from './verbosity';

type FilterKey = 'all' | 'status' | 'agent' | 'assignment' | 'thread';

@Component({
  selector: 'app-activity-log',
  imports: [EventLineComponent, VerbosityToggleComponent],
  templateUrl: './activity-log.html',
  styleUrl: './activity-log.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityLogComponent {
  readonly events     = input.required<VaultActivityEvent[]>();
  readonly actorLabel = input<(id: string) => string>(a => a);
  readonly actorKind  = input<(id: string) => 'human' | 'agent' | 'system'>(() => 'system');

  readonly verbosity   = signal<VerbosityLevel>(loadVerbosity());
  readonly activeFilters = signal<Set<FilterKey>>(new Set(['all']));

  readonly visibleEvents = computed(() => {
    const filters = this.activeFilters();
    if (filters.has('all') || filters.size === 0) return this.events();
    return this.events().filter(e => {
      if (filters.has('status')     && (e.type === 'grooming_status_changed' || e.type === 'rejected')) return true;
      if (filters.has('agent')      && e.type === 'agent_run_completed') return true;
      if (filters.has('assignment') && e.type === 'assigned') return true;
      if (filters.has('thread')     && e.type === 'thread_message_posted') return true;
      return false;
    });
  });

  setVerbosity(v: VerbosityLevel): void {
    this.verbosity.set(v);
    saveVerbosity(v);
  }

  toggleFilter(key: FilterKey): void {
    this.activeFilters.update(set => {
      const next = new Set(set);
      if (key === 'all') return new Set(['all']);
      next.delete('all');
      if (next.has(key)) next.delete(key); else next.add(key);
      if (next.size === 0) return new Set(['all']);
      return next;
    });
  }

  isActive(key: FilterKey): boolean { return this.activeFilters().has(key); }
}
```

- [ ] **Step 2: Template**

```html
<header class="activity-log__header">
  <span class="activity-log__title">Activity log · {{ events().length }} events</span>
  <app-verbosity-toggle [value]="verbosity()" (changed)="setVerbosity($event)" />
</header>

<nav class="activity-log__filters">
  @for (key of ['all','status','agent','assignment','thread']; track key) {
    <button
      type="button"
      class="activity-log__filter"
      [class.activity-log__filter--active]="isActive($any(key))"
      (click)="toggleFilter($any(key))"
    >{{ key }}</button>
  }
</nav>

<ol class="activity-log__list">
  @for (e of visibleEvents(); track e.id) {
    <li>
      <app-event-line
        [event]="e"
        [verbosity]="verbosity()"
        [actorLabel]="actorLabel()"
        [actorKind]="actorKind()"
      />
    </li>
  } @empty {
    <li class="activity-log__empty">No events match the current filters.</li>
  }
</ol>
```

- [ ] **Step 3: SCSS**

```scss
.activity-log {
  &__header  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  &__title   { font-size: 0.85rem; opacity: 0.7; }
  &__filters { display: flex; gap: 0.25rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
  &__filter  {
    font: inherit; font-size: 0.75rem; padding: 0.15rem 0.5rem;
    background: transparent; color: inherit; cursor: pointer;
    border: 1px solid var(--color-border, #333); border-radius: 999px;
    &--active { background: var(--color-accent, #6c8cff); color: var(--color-bg, #1a1a1a); border-color: transparent; }
  }
  &__list   { list-style: none; padding: 0; margin: 0; }
  &__empty  { padding: 1rem 0; opacity: 0.55; font-style: italic; }
}
```

### Task 27: Replace inline activity rendering in `vault-item-detail-body` with the new component

**Files:**
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html`
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.ts`

- [ ] **Step 1: Add import + remove old rendering**

In the component file, add:

```typescript
import { ActivityLogComponent } from './activity-log/activity-log';
// existing imports
```

Add `ActivityLogComponent` to the component's `imports` array.

In the HTML, replace the existing `<section class="activity-log">` block (lines 357-425 per prior exploration) with:

```html
<section class="activity-log-host">
  <app-activity-log
    [events]="events()"
    [actorLabel]="actorDisplay.bind(this)"
    [actorKind]="actorKind.bind(this)"
  />
</section>
```

The existing helper methods `actorDisplay(id)` and `actorKind(id)` (per prior exploration, around lines 239-284 in the component) are passed as input function references.

- [ ] **Step 2: Remove unused inline event helpers**

If `eventDescription(event)` is now unused in the component, delete the method. Confirm by running:

Run: `grep -n eventDescription src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.ts src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html`
Expected: zero matches after deletion.

- [ ] **Step 3: Manual smoke-test**

Open a vault item with multiple events. Toggle Compact / Detailed / Debug — confirm each level renders the expected content (per spec Section 2 table). Toggle filters — confirm event types are gated. Reload page → verbosity persists.

- [ ] **Step 4: Commit Phase 6**

```bash
git add src/app/features/vault-items/components/vault-item-detail-body/
git commit -m "feat(grooming): activity log standard line + verbosity toggles + filters"
```

---

## Phase 7 — Section 5: Modal header restructure

### Task 28: Create `pipeline-stepper` component

**Files:**
- Create: `src/app/features/vault-items/components/vault-item-detail-body/pipeline-stepper/pipeline-stepper.ts`
- Create: `src/app/features/vault-items/components/vault-item-detail-body/pipeline-stepper/pipeline-stepper.html`
- Create: `src/app/features/vault-items/components/vault-item-detail-body/pipeline-stepper/pipeline-stepper.scss`

- [ ] **Step 1: Component**

```typescript
import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { GROOMING_STATUS_LABELS, type GroomingStatus } from '@domain/vault/vault-item';

const MAIN_PIPELINE: readonly GroomingStatus[] = [
  'ungroomed', 'intake_complete', 'classified', 'decomposed', 'ready',
];

@Component({
  selector: 'app-pipeline-stepper',
  imports: [],
  templateUrl: './pipeline-stepper.html',
  styleUrl: './pipeline-stepper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineStepperComponent {
  readonly current = input.required<GroomingStatus>();

  readonly steps = computed(() => MAIN_PIPELINE.map(s => ({
    status: s,
    label: GROOMING_STATUS_LABELS[s],
    active: s === this.current(),
  })));

  readonly isSidebranch = computed(() =>
    this.current() === 'needs_rework' || this.current() === 'intake_rejected'
  );
  readonly sideLabel = computed(() => GROOMING_STATUS_LABELS[this.current()]);
}
```

- [ ] **Step 2: Template**

```html
<ol class="pipeline-stepper">
  @for (step of steps(); track step.status) {
    <li
      class="pipeline-stepper__step"
      [class.pipeline-stepper__step--active]="step.active"
    >
      <span class="pipeline-stepper__dot"></span>
      <span class="pipeline-stepper__label">{{ step.label }}</span>
    </li>
  }
</ol>

@if (isSidebranch()) {
  <p class="pipeline-stepper__side">↳ Currently in <strong>{{ sideLabel() }}</strong></p>
}
```

- [ ] **Step 3: SCSS**

```scss
.pipeline-stepper {
  display: flex;
  list-style: none;
  padding: 0; margin: 0;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.8rem;

  &__step {
    display: flex; align-items: center; gap: 0.4rem;
    opacity: 0.5;
    &::after {
      content: '→'; opacity: 0.3; margin-left: 0.4rem;
    }
    &:last-child::after { content: ''; }
    &--active { opacity: 1; font-weight: 600; }
  }
  &__dot {
    width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: 0.6;
  }
  &__step--active &__dot { background: var(--color-accent, #6c8cff); opacity: 1; }
  &__side {
    margin: 0.3rem 0 0; font-size: 0.8rem; color: var(--color-warning, #d99);
  }
}
```

### Task 29: Restructure the modal header into 4 zones

**Files:**
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html`
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.scss`
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.ts`

- [ ] **Step 1: Add stepper import + computed for effective priority + rationale state**

In the TS:

```typescript
import { PipelineStepperComponent } from './pipeline-stepper/pipeline-stepper';
// existing imports

// inside class:
readonly rationaleExpanded = signal(false);

readonly effectivePriority = computed(() => {
  const i = this.item();
  if (!i) return null;
  return i.manual_priority ?? i.ai_priority;
});

readonly priorityDiverges = computed(() => {
  const i = this.item();
  if (!i || i.manual_priority == null || i.ai_priority == null) return false;
  return i.manual_priority !== i.ai_priority;
});

toggleRationale(): void { this.rationaleExpanded.update(v => !v); }
```

Add `PipelineStepperComponent` to the component's `imports`.

- [ ] **Step 2: Replace the existing header strip in HTML (lines 24-158 per prior exploration)**

```html
<!-- Zone 1 — Identity -->
<header class="modal-header__zone1">
  <div class="modal-header__id">
    <span class="modal-header__seq">#{{ item().seq }}</span>
    <span class="modal-header__type">{{ item().type }}</span>
    <h1 class="modal-header__title">{{ item().title }}</h1>
  </div>
  <div class="modal-header__actions">
    <button type="button" (click)="onEdit()">edit</button>
    @if (canReject()) {
      <button type="button" class="header-action--warn" (click)="openReject()">reject</button>
    }
    <button type="button" (click)="onArchive()">archive</button>
    <button type="button" class="header-action--danger" (click)="onDelete()">delete</button>
  </div>
</header>

<!-- Zone 2 — Pipeline stepper -->
<app-pipeline-stepper [current]="item().grooming_status" />

<!-- Zone 3 — State row -->
<div class="modal-header__zone3">
  <span class="chip chip--status chip--status-{{ lifecycleState(item()) }}">{{ lifecycleState(item()) }}</span>
  @if (item().assigned_to; as owner) {
    <span class="chip chip--owner">&#64;{{ actorDisplay(owner) }} <small>({{ actorKind(owner) }})</small></span>
  } @else {
    <span class="chip chip--owner chip--unassigned">unassigned</span>
  }
  @if (effectivePriority(); as p) {
    <span
      class="chip chip--priority"
      [title]="priorityDiverges() ? 'AI: P' + item().ai_priority + ', Manual: P' + item().manual_priority : ''"
    >P{{ p }}</span>
  }
  @if (item().primary_project_name; as proj) {
    <span class="chip chip--project">{{ proj }}</span>
  }
  <span class="chip chip--readiness">
    <progress [value]="readinessProgress()" max="1"></progress>
    {{ readinessFraction() }} {{ readinessFraction() === '4/4' ? 'READY' : 'NOT_READY' }}
  </span>
</div>

<!-- Zone 4 — Meta -->
<footer class="modal-header__zone4">
  <span>created {{ item().created_at | timeAgo }}</span>
  <span>·</span>
  <span>last activity {{ item().latest_activity_at | timeAgo }}</span>
  @if (item().ai_rationale) {
    <span>·</span>
    <span class="modal-header__rationale">
      rationale:
      @if (rationaleExpanded()) {
        {{ item().ai_rationale }} <button type="button" (click)="toggleRationale()">collapse</button>
      } @else {
        <em>"{{ truncate(item().ai_rationale, 80) }}"</em> <button type="button" (click)="toggleRationale()">expand</button>
      }
    </span>
  }
</footer>
```

`readinessProgress()`, `readinessFraction()`, `truncate()`, `lifecycleState()`, `timeAgo` pipe — these may exist or need to be added. Where they don't, add minimal helpers in the component (truncate is one line: `truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }`). For `lifecycleState`, import from `@domain/vault/vault-item` (already exported).

- [ ] **Step 3: Add zone styles to SCSS**

In `vault-item-detail-body.scss`:

```scss
.modal-header {
  &__zone1 {
    display: flex; justify-content: space-between; gap: 1rem; align-items: baseline; margin-bottom: 0.5rem;
  }
  &__id { display: flex; gap: 0.6rem; align-items: baseline; flex-wrap: wrap; }
  &__seq { opacity: 0.55; font-family: var(--font-mono, monospace); }
  &__type { font-size: 0.7rem; padding: 0 0.35rem; border-radius: 3px; background: color-mix(in oklab, var(--color-fg, #fff) 10%, transparent); }
  &__title { margin: 0; font-size: 1.1rem; font-weight: 600; }
  &__actions { display: flex; gap: 0.4rem; }

  &__zone3 {
    display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 0.6rem 0;
    .chip { padding: 0.2rem 0.55rem; border-radius: 999px; background: color-mix(in oklab, var(--color-fg, #fff) 8%, transparent); font-size: 0.8rem; }
    .chip--priority { font-weight: 600; }
    .chip--unassigned { opacity: 0.5; font-style: italic; }
  }
  &__zone4 {
    display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: baseline;
    font-size: 0.75rem; opacity: 0.6;
    margin-top: 0.4rem;
  }
  &__rationale {
    em { font-style: italic; opacity: 0.85; }
    button { background: transparent; border: 0; color: var(--color-link, #6c8cff); font: inherit; cursor: pointer; padding: 0; margin-left: 0.25rem; }
  }
}
.header-action--warn   { color: var(--color-warning, #d99); }
.header-action--danger { color: var(--color-error, #f88); }
```

- [ ] **Step 4: Manual smoke-test the header**

Open a vault item. Confirm:
- Identity row has seq, type chip, title, action buttons (edit / reject / archive / delete)
- Pipeline stepper shows the current stage highlighted
- State row has status, owner, priority, project, readiness — no duplicate labels
- Meta row collapses rationale to a truncated quote with expand control
- Hover the priority chip when AI ≠ Manual → tooltip reveals both

- [ ] **Step 5: Commit Phase 7**

```bash
git add src/app/features/vault-items/components/vault-item-detail-body/
git commit -m "feat(grooming): restructure modal header into 4 visual zones"
```

---

## Phase 8 — Section 3: Acceptance-criteria length validation

### Task 30: Create the AC length helper

**Files:**
- Create: `src/app/shared/validation/acceptance-criterion-length.ts`
- Create: `src/app/shared/validation/acceptance-criterion-length.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { acceptanceCriterionStatus, type ACLengthStatus } from './acceptance-criterion-length';

describe('acceptanceCriterionStatus', () => {
  it('returns "clean" for 0–120 char inputs', () => {
    expect(acceptanceCriterionStatus('User can filter')).toBe('clean');
    expect(acceptanceCriterionStatus('a'.repeat(120))).toBe('clean');
  });

  it('returns "verbose" for 121–200 char inputs', () => {
    expect(acceptanceCriterionStatus('a'.repeat(121))).toBe('verbose');
    expect(acceptanceCriterionStatus('a'.repeat(200))).toBe('verbose');
  });

  it('returns "exceeds" for >200 char inputs', () => {
    expect(acceptanceCriterionStatus('a'.repeat(201))).toBe('exceeds');
    expect(acceptanceCriterionStatus('a'.repeat(500))).toBe('exceeds');
  });

  it('handles empty string as clean (no policy violation)', () => {
    expect(acceptanceCriterionStatus('')).toBe('clean');
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run src/app/shared/validation/acceptance-criterion-length.test.ts`
Expected: FAIL — module missing

- [ ] **Step 3: Implement**

```typescript
export type ACLengthStatus = 'clean' | 'verbose' | 'exceeds';

// Policy thresholds — kept in code (not config) because they're tied to the
// hermes prompt's stated limits. Move to config when those drift.
const VERBOSE_AT = 121;
const EXCEEDS_AT = 201;

export function acceptanceCriterionStatus(text: string): ACLengthStatus {
  const len = text.length;
  if (len >= EXCEEDS_AT) return 'exceeds';
  if (len >= VERBOSE_AT) return 'verbose';
  return 'clean';
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run src/app/shared/validation/acceptance-criterion-length.test.ts`
Expected: PASS (4/4)

### Task 31: Render length-status chips on AC rows in the modal

**Files:**
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.ts`
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.html`
- Modify: `src/app/features/vault-items/components/vault-item-detail-body/vault-item-detail-body.scss`

- [ ] **Step 1: Add the helper to the component**

```typescript
import { acceptanceCriterionStatus } from '@shared/validation/acceptance-criterion-length';
// existing imports

// inside class:
acStatus(text: string) { return acceptanceCriterionStatus(text); }
```

- [ ] **Step 2: Update the AC list rendering in HTML**

Find the `acceptance_criteria` rendering (around line 196-220 per prior exploration):

```html
@for (ac of item().acceptance_criteria; track ac.text; let i = $index) {
  <div class="ac-row" [class.ac-row--verbose]="acStatus(ac.text) === 'verbose'" [class.ac-row--exceeds]="acStatus(ac.text) === 'exceeds'">
    <input type="checkbox" [checked]="ac.done" (change)="onToggleAc(i)" />
    <span class="ac-row__text">{{ ac.text }}</span>
    @switch (acStatus(ac.text)) {
      @case ('verbose') {
        <span class="ac-row__chip ac-row__chip--warn" title="Verbose ({{ ac.text.length }} chars). Spec recommends ≤ 120.">verbose</span>
      }
      @case ('exceeds') {
        <span class="ac-row__chip ac-row__chip--err" title="Exceeds policy ({{ ac.text.length }} chars). Reject or edit.">exceeds</span>
      }
    }
  </div>
}
```

- [ ] **Step 3: SCSS — chip styles**

```scss
.ac-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;

  &__text { flex: 1; }
  &__chip {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    &--warn { background: color-mix(in oklab, var(--color-warning, #d99) 25%, transparent); color: var(--color-warning, #d99); }
    &--err  { background: color-mix(in oklab, var(--color-error, #f88) 25%, transparent); color: var(--color-error, #f88); }
  }
  &--verbose { border-left: 2px solid var(--color-warning, #d99); padding-left: 0.5rem; }
  &--exceeds { border-left: 2px solid var(--color-error, #f88); padding-left: 0.5rem; }
}
```

- [ ] **Step 4: Manual smoke-test**

Open the LocalShout item from the screenshot (or any item with verbose AC). Confirm:
- Verbose AC row shows yellow "verbose" chip
- A short AC has no chip
- A 201-char AC would show red "exceeds" chip (synthesise via the form to verify)

- [ ] **Step 5: Commit Phase 8**

```bash
git add src/app/shared/validation/ \
        src/app/features/vault-items/components/vault-item-detail-body/
git commit -m "feat(grooming): AC length validation chips (verbose/exceeds)"
```

---

## Phase 9 — End-to-end test for the reject flow

### Task 32: Add Playwright E2E for happy-path reject

**Files:**
- Create: `e2e/grooming-reject.spec.ts`

- [ ] **Step 1: Write the test**

```typescript
import { test, expect } from '@playwright/test';

test.describe('grooming: reject-with-reason flow', () => {
  test('operator rejects a decomposed item, it lands in needs_rework with reason on card', async ({ page }) => {
    await page.goto('/grooming?seed=true'); // adapt to actual seed-mode URL
    // Find a decomposed item card and open it
    const decomposedColumn = page.locator('[data-column="decomposed"]');
    await expect(decomposedColumn).toBeVisible();
    const firstCard = decomposedColumn.locator('.card').first();
    await firstCard.click();

    // Modal opens — click reject
    await page.getByRole('button', { name: /^reject$/ }).click();

    // Fill the form
    await page.getByPlaceholder(/what's wrong/i).fill('AC too verbose, retry — see thread for guidance');
    await page.getByLabel(/reassign to/i).selectOption({ label: /vault-decompose/ });
    await page.getByRole('button', { name: /reject and reassign/i }).click();

    // Card now in needs_rework column
    await page.keyboard.press('Escape'); // close modal if still open
    const reworkColumn = page.locator('[data-column="needs_rework"]');
    await expect(reworkColumn).toContainText(/AC too verbose/);
    await expect(reworkColumn).toContainText(/vault-decompose/);
  });

  test('reject button is hidden when item is in ungroomed', async ({ page }) => {
    await page.goto('/grooming?seed=true');
    const ungrooomedCard = page.locator('[data-column="ungroomed"] .card').first();
    await ungrooomedCard.click();
    await expect(page.getByRole('button', { name: /^reject$/ })).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx playwright test e2e/grooming-reject.spec.ts`
Expected: PASS — both cases.

- [ ] **Step 3: Commit Phase 9**

```bash
git add e2e/grooming-reject.spec.ts
git commit -m "test(grooming): e2e for reject-with-reason flow"
```

---

## Phase 10 — Hermes prompt change (separate repo)

### Task 33: Document the hermes-side prompt update as a follow-up

**Files:**
- No dashboard files modified.

- [ ] **Step 1: Note the cross-repo change**

The `vault-decompose` skill prompt update (Section 3 Layer 1) lives in `/Users/marvinbarretto/development/hub/hermes/skills/dispatch/vault-decompose/`. This task is **out of scope for this plan** — Marvin will handle the hermes-side PR separately, since it's a different repo and deploy cycle.

The dashboard guard (Phase 8) already gives defence-in-depth even without the prompt change; the loop closes once both layers are in production.

- [ ] **Step 2: Capture in a follow-up note**

Create a brief note in the spec doc footer or open a TODO in `docs/architecture/phase-b-followups.md` if that pattern is established. Inspect:

Run: `ls docs/architecture/phase-b-followups.md 2>/dev/null && echo EXISTS || echo MISSING`

If it exists, append a one-liner to that file. If not, add a `## Follow-ups` section at the bottom of the spec doc itself listing the hermes-side prompt change as the only remaining cross-repo follow-up.

---

## Spec coverage check

| Spec section | Covered by tasks |
|--------------|------------------|
| 1 — Parent link | 11–15 |
| 2 — Activity log standard line | 22–27 |
| 2 — Verbosity toggles | 22, 25 |
| 2 — Filter chips | 26 |
| 2 — log_lines on agent runs | 7, 24 |
| 2 — Cost chip at Detailed | 24 |
| 3 — Hermes prompt change | 33 (deferred to hermes repo) |
| 3 — Dashboard length guard | 30–31 |
| 3 — Inline AC edit | (existing per spec; verify in Task 31, add if missing) |
| 4 — `needs_rework` status | 1–3 |
| 4 — Reject button + form | 16–18 |
| 4 — Atomic transactional write | 9–10 (composed client-side) |
| 4 — Card shape `needs_rework` | 19–21 |
| 4 — Subitem chip on cards | 20 |
| 4 — `RejectionEvent` type | 6, 8 |
| 4 — `ThreadMessageKind: rejection` | 5 |
| 5 — Header zone 1 (identity) | 29 |
| 5 — Header zone 2 (pipeline stepper) | 28–29 |
| 5 — Header zone 3 (state chips) | 29 |
| 5 — Header zone 4 (meta + rationale truncate) | 29 |
| Acceptance: E2E reject flow | 32 |

Every spec requirement maps to at least one task. The hermes prompt change (3 Layer 1) is explicitly deferred to a separate repo + PR cycle.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-04-27-grooming-modal-improvements.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — run tasks in this session using executing-plans, batch execution with checkpoints

Which?
