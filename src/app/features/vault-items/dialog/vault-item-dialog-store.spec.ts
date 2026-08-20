import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { VaultItemDialogStore } from './vault-item-dialog-store';
import { VaultItemsService } from '../data-access/vault-items.service';
import { ActivityEventsService } from '../data-access/activity-events.service';
import { VaultItemProjectsService } from '../data-access/vault-item-projects.service';
import { VaultItemDependenciesService } from '../data-access/vault-item-dependencies.service';
import { ActorsService } from '../../actors/data-access/actors.service';
import { ProjectsService } from '../../projects/data-access/projects.service';
import { ThreadService } from '../../thread/data-access/thread.service';
import { ToastService } from '@shared/components/toast/toast.service';
import { actorId, projectId, vaultItemId , wellKnownActorId} from '@domain/ids';
import type { Project } from '@domain/projects/project';
import { EMPTY_PROJECT_BRIEF } from '@domain/projects/project';
import type { Actor } from '@domain/actors/actor';
import type { VaultItem } from '@domain/vault/vault-item';
import { emptyDraft, isDraft, isItem } from './vault-item-dialog-mode';

const fakeProject = (id: string): Project => ({
  id: projectId(id),
  display_name: id,
  description: null,
  status: 'active',
  kind: 'minor',
  owner_actor_id: wellKnownActorId('marvin'),
  criteria: null,
  repo_url: null,
  color_token: null,
  short_code: null,
  created_at: '2026-01-01T00:00:00Z',
  synced_at: null,
  synced_commit: null,
  repos: null,
  ...EMPTY_PROJECT_BRIEF,
});

const fakeActor = (id: string): Actor => ({
  id: actorId(id),
  display_name: id,
  kind: 'human',
  runtime: null,
  description: null,
  is_active: true,
  serves: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const fakeItem = (overrides: Partial<VaultItem> = {}): VaultItem => ({
  id: vaultItemId('item-1'),
  seq: 42,
  title: 'sample',
  body: '',
  type: 'task',
  category: null,
  assigned_to: wellKnownActorId('marvin'),
  tags: [],
  acceptance_criteria: [],
  grooming_status: 'ungroomed',
  ai_priority: null,
  manual_priority: null,
  ai_rationale: null,
  priority_confidence: null,
  actionability: null,
  parent_id: null,
  is_epic: false,
  archived_at: null,
  due_at: null,
  completed_at: null,
  source: { kind: 'manual', ref: 'test', url: null },
  created_at: '2026-01-01T00:00:00Z',
  primary_project_id: null,
  primary_project_name: null,
  open_questions_count: 0,
  latest_activity_at: null,
  children_count: 0,
  latest_event: null,
  latest_message: null,
  ...overrides,
});

function buildStore(opts: {
  initialItems?: VaultItem[];
  messages?: unknown[];
  events?: unknown[];
  pendingReplies?: unknown[];
  createResponse?: VaultItem | Error;
} = {}) {
  TestBed.resetTestingModule();

  const itemsSig = signal<VaultItem[]>(opts.initialItems ?? []);
  const messagesSig = signal<unknown[]>(opts.messages ?? []);
  const eventsSig = signal<unknown[]>(opts.events ?? []);
  const updates: { id: string; patch: unknown }[] = [];
  const projectAdds: { vid: string; pid: string }[] = [];
  const archivedIds: string[] = [];
  const archiveCalls: { id: string; note: string | null }[] = [];
  const createCalls: unknown[] = [];

  const mockItems = {
    items: itemsSig.asReadonly(),
    getBySeq: (seq: number) => itemsSig().find(i => i.seq === seq),
    getById: (id: string) => itemsSig().find(i => i.id === id),
    update: (id: string, patch: unknown) => updates.push({ id, patch }),
    archive: (id: string, note: string | null = null) => { archivedIds.push(id); archiveCalls.push({ id, note }); },
    setCompleted: vi.fn(),
    setEpic: vi.fn(),
    reassign: vi.fn(),
    rejectItem: vi.fn(),
    remove: vi.fn(),
    refreshOne: vi.fn(),
    createWithRelations: (draft: unknown) => {
      createCalls.push(draft);
      const r = opts.createResponse;
      if (r instanceof Error) return throwError(() => r);
      return of(r ?? fakeItem({ seq: 99, title: (draft as { title: string }).title.trim() }));
    },
  };
  const mockActivity = {
    eventsFor: () => eventsSig.asReadonly(),
    loadFor: vi.fn(),
    post: vi.fn(),
  };
  const mockProjects = {
    projectsFor: () => signal([]).asReadonly(),
    add: (vid: string, pid: string) => projectAdds.push({ vid, pid }),
    remove: vi.fn(),
    loadFor: vi.fn(),
  };
  const mockDeps = {
    blockersFor: () => signal([]).asReadonly(),
    remove: vi.fn(),
    addBySeq: vi.fn(() => null),
    loadFor: vi.fn(),
  };
  const mockActors = {
    activeActors: signal<Actor[]>([fakeActor('marvin'), fakeActor('boris')]).asReadonly(),
    actors: signal<Actor[]>([fakeActor('marvin'), fakeActor('boris')]).asReadonly(),
    getById: (id: string) => [fakeActor('marvin'), fakeActor('boris')].find(a => a.id === id),
  };
  const mockProjectsService = {
    activeProjects: signal<Project[]>([fakeProject('hermes')]).asReadonly(),
    getById: (id: string) => (id === 'hermes' ? fakeProject('hermes') : undefined),
  };
  // Drives the store's post-refresh effect. Bumping it stands in for the
  // server accepting a thread post.
  const postedSig = signal(0);
  const mockThread = {
    messagesFor: () => messagesSig.asReadonly(),
    openQuestionsFor: () => signal([]).asReadonly(),
    pendingRepliesFor: () => signal(opts.pendingReplies ?? []).asReadonly(),
    loadFor: vi.fn(),
    post: vi.fn(),
    postedCount: () => postedSig(),
  };
  const toasts: { kind: string; msg: string }[] = [];
  const mockToast = {
    success: (msg: string) => toasts.push({ kind: 'success', msg }),
    error: (msg: string) => toasts.push({ kind: 'error', msg }),
    info: (msg: string) => toasts.push({ kind: 'info', msg }),
  };

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      VaultItemDialogStore,
      { provide: VaultItemsService, useValue: mockItems },
      { provide: ActivityEventsService, useValue: mockActivity },
      { provide: VaultItemProjectsService, useValue: mockProjects },
      { provide: VaultItemDependenciesService, useValue: mockDeps },
      { provide: ActorsService, useValue: mockActors },
      { provide: ProjectsService, useValue: mockProjectsService },
      { provide: ThreadService, useValue: mockThread },
      { provide: ToastService, useValue: mockToast },
    ],
  });

  const store = TestBed.inject(VaultItemDialogStore);
  return {
    store, itemsSig, messagesSig, eventsSig, updates, projectAdds, archivedIds, archiveCalls, createCalls, toasts,
    postedSig, mockActivity, mockItems, mockThread,
  };
}

describe('VaultItemDialogStore', () => {
  beforeEach(() => TestBed.resetTestingModule());

  describe('mode', () => {
    it('defaults to Draft mode with empty payload', () => {
      const { store } = buildStore();
      expect(store.isDraftMode()).toBe(true);
      expect(store.draftPayload()).toEqual(emptyDraft);
      expect(store.seq()).toBeNull();
      expect(store.item()).toBeUndefined();
    });

    it('setMode to Item resolves item by seq from items signal', () => {
      const item = fakeItem({ seq: 42 });
      const { store } = buildStore({ initialItems: [item] });
      store.setMode({ kind: 'item', seq: 42, stage: 'mature' });
      expect(store.isDraftMode()).toBe(false);
      expect(store.seq()).toBe(42);
      expect(store.item()).toBe(item);
    });

    it('setMode back to Draft re-seeds the draft payload from mode.payload', () => {
      const { store } = buildStore();
      store.setDraftTitle('first title');
      store.setMode({ kind: 'item', seq: 42, stage: 'mature' });
      // Now flip back to a different Draft — payload should reset to whatever
      // mode says, not preserve the old typed-in title.
      store.setMode({ kind: 'draft', payload: { ...emptyDraft, title: 'seeded' } });
      TestBed.tick();
      expect(store.draftPayload().title).toBe('seeded');
    });
  });

  describe('draft mutations', () => {
    it('setDraftTitle clears any prior error', () => {
      const { store } = buildStore();
      // Fake an error
      (store as unknown as { _draftError: { set: (v: string | null) => void } })._draftError.set('boom');
      store.setDraftTitle('new');
      expect(store.draftError()).toBeNull();
    });

    it('addDraftTag / removeDraftTag round-trip', () => {
      const { store } = buildStore();
      store.addDraftTag('urgent');
      store.addDraftTag('bug');
      expect(store.draftPayload().tags).toEqual(['urgent', 'bug']);
      store.removeDraftTag(0);
      expect(store.draftPayload().tags).toEqual(['bug']);
    });

    it('addDraftProject / removeDraftProject', () => {
      const { store } = buildStore();
      store.addDraftProject(fakeProject('hermes'));
      store.addDraftProject(fakeProject('localshout'));
      expect(store.draftPayload().projects).toHaveLength(2);
      store.removeDraftProject(1);
      expect(store.draftPayload().projects.map(p => p.id)).toEqual(['hermes']);
    });

    it('removeDraftAssignee clears the assignee', () => {
      const { store } = buildStore();
      // Trigger setting via the trigger callback
      (store as unknown as { _draftPayload: { update: (fn: (d: unknown) => unknown) => void } })._draftPayload
        .update((d) => ({ ...(d as object), assignee: fakeActor('boris') }));
      expect(store.draftPayload().assignee?.id).toBe('boris');
      store.removeDraftAssignee();
      expect(store.draftPayload().assignee).toBeNull();
    });

    it('addDraftRelated brands the id and accepts null seq', () => {
      const { store } = buildStore();
      store.addDraftRelated({ id: 'a', title: 'parent', seq: 12 });
      store.addDraftRelated({ id: 'b', title: 'no-seq' });
      expect(store.draftPayload().related).toEqual([
        { id: 'a', title: 'parent', seq: 12 },
        { id: 'b', title: 'no-seq', seq: null },
      ]);
    });
  });

  describe('canSubmitDraft', () => {
    // Empty title is no longer a disabled-state gate — per CLAUDE.md §UX
    // ("errors over disabled states"), the empty-title block surfaces as an
    // inline error on submit attempt. canSubmitDraft only reflects in-flight
    // submission state.
    it('true by default (gating now lives in the submit handler, not the button)', () => {
      const { store } = buildStore();
      expect(store.canSubmitDraft()).toBe(true);
    });
  });

  describe('submitDraft', () => {
    it('on success flips mode to Item, sets draftSaved, emits new mode', () => {
      const created = fakeItem({ seq: 99, title: 'fix bug' });
      const { store, createCalls } = buildStore({ createResponse: created, initialItems: [created] });
      store.setDraftTitle('fix bug');

      const emitted: { kind: string; seq?: number }[] = [];
      store.submitDraft().subscribe(m => {
        if (isItem(m)) emitted.push({ kind: 'item', seq: m.seq });
        else emitted.push({ kind: m.kind });
      });

      expect(createCalls).toHaveLength(1);
      expect(store.isDraftMode()).toBe(false);
      expect(store.seq()).toBe(99);
      expect(store.draftSaved()).toBe(true);
      expect(emitted).toEqual([{ kind: 'item', seq: 99 }]);
    });

    it('on error sets draftError and stays in Draft mode', () => {
      const err = Object.assign(new Error('boom'), { error: { error: { message: 'oh no' } } });
      const { store } = buildStore({ createResponse: err });
      store.setDraftTitle('try');

      store.submitDraft().subscribe({ error: () => {} });
      expect(store.draftError()).toBe('oh no');
      expect(store.isDraftMode()).toBe(true);
      expect(store.draftSaved()).toBe(false);
    });

    it('no-op when title is empty', () => {
      const { store, createCalls } = buildStore();
      store.submitDraft().subscribe();
      expect(createCalls).toHaveLength(0);
    });
  });

  describe('section collapse', () => {
    it('starts with body=true, activity=false, thread=false', () => {
      const { store } = buildStore();
      expect(store.sectionBody()).toBe(true);
      expect(store.sectionActivity()).toBe(false);
      expect(store.sectionThread()).toBe(false);
    });

    it('toggleSection flips the named signal', () => {
      const { store } = buildStore();
      store.toggleSection('body');
      expect(store.sectionBody()).toBe(false);
      store.toggleSection('activity');
      expect(store.sectionActivity()).toBe(true);
      store.toggleSection('thread');
      expect(store.sectionThread()).toBe(true);
    });

    it('fresh-stage effect collapses all sections when item resolves with zero counts', () => {
      const item = fakeItem({ seq: 42 });
      const { store } = buildStore({ initialItems: [item], messages: [], events: [] });
      store.setMode({ kind: 'item', seq: 42, stage: 'fresh' });
      TestBed.tick();
      expect(store.sectionBody()).toBe(false);
      expect(store.sectionActivity()).toBe(false);
      expect(store.sectionThread()).toBe(false);
    });

    it('does not collapse when item has thread or activity activity', () => {
      const item = fakeItem({ seq: 42 });
      const { store } = buildStore({ initialItems: [item], messages: [{}], events: [] });
      store.setMode({ kind: 'item', seq: 42, stage: 'mature' });
      TestBed.tick();
      // Defaults preserved: body expanded, others collapsed
      expect(store.sectionBody()).toBe(true);
      expect(store.sectionActivity()).toBe(false);
      expect(store.sectionThread()).toBe(false);
    });

    it('does not re-collapse after a manual expand on the same item', () => {
      const item = fakeItem({ seq: 42 });
      const { store, messagesSig } = buildStore({ initialItems: [item] });
      store.setMode({ kind: 'item', seq: 42, stage: 'fresh' });
      TestBed.tick();
      // User expands the body
      store.toggleSection('body');
      expect(store.sectionBody()).toBe(true);
      // Activity arrives — effect should not stomp the manual expand
      messagesSig.set([{}]);
      TestBed.tick();
      expect(store.sectionBody()).toBe(true);
    });
  });

  describe('refresh after a thread post', () => {
    // A posted message has server-side consequences the client can't predict —
    // a note_activity row, and a reassignment when an answer clears the last
    // open question. Without these re-pulls the Activity panel and the header
    // ("assigned @…", "last activity …") sit frozen until a page reload.
    it('re-pulls activity and the item when a post lands', () => {
      const item = fakeItem({ seq: 42 });
      const { store, postedSig, mockActivity, mockItems } = buildStore({ initialItems: [item] });
      store.setMode({ kind: 'item', seq: 42, stage: 'fresh' });
      TestBed.tick();
      mockActivity.loadFor.mockClear();

      postedSig.set(1);
      TestBed.tick();

      expect(mockActivity.loadFor).toHaveBeenCalledWith(item.id);
      expect(mockItems.refreshOne).toHaveBeenCalledWith(item.id);
    });

    it('does not refresh on open, before anything is posted', () => {
      const item = fakeItem({ seq: 42 });
      const { store, mockItems } = buildStore({ initialItems: [item] });
      store.setMode({ kind: 'item', seq: 42, stage: 'fresh' });
      TestBed.tick();

      expect(mockItems.refreshOne).not.toHaveBeenCalled();
    });

    // refreshOne swaps a new object into the items list, which changes item(),
    // which re-runs this very effect. The handled-count guard is what stops
    // that being an infinite refresh loop.
    it('does not re-refresh when the item identity changes without a new post', () => {
      const item = fakeItem({ seq: 42 });
      const { store, postedSig, itemsSig, mockItems } = buildStore({ initialItems: [item] });
      store.setMode({ kind: 'item', seq: 42, stage: 'fresh' });
      TestBed.tick();

      postedSig.set(1);
      TestBed.tick();
      expect(mockItems.refreshOne).toHaveBeenCalledTimes(1);

      // Stand in for refreshOne's write-back: same item, fresh identity.
      itemsSig.set([{ ...item }]);
      TestBed.tick();
      expect(mockItems.refreshOne).toHaveBeenCalledTimes(1);
    });

    it('refreshes again on a second post', () => {
      const item = fakeItem({ seq: 42 });
      const { store, postedSig, mockItems } = buildStore({ initialItems: [item] });
      store.setMode({ kind: 'item', seq: 42, stage: 'fresh' });
      TestBed.tick();

      postedSig.set(1);
      TestBed.tick();
      postedSig.set(2);
      TestBed.tick();

      expect(mockItems.refreshOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('item operations', () => {
    it('updateTitle delegates to VaultItemsService.update', () => {
      const item = fakeItem({ seq: 42 });
      const { store, updates } = buildStore({ initialItems: [item] });
      store.setMode({ kind: 'item', seq: 42, stage: 'mature' });
      store.updateTitle('new title');
      expect(updates).toEqual([{ id: item.id, patch: { title: 'new title' } }]);
    });

    it('archive delegates with the resolved item id', () => {
      const item = fakeItem({ seq: 42 });
      const { store, archivedIds } = buildStore({ initialItems: [item] });
      store.setMode({ kind: 'item', seq: 42, stage: 'mature' });
      store.archive();
      expect(archivedIds).toEqual([item.id]);
    });

    it('addProject is a no-op when the junction already exists', () => {
      const item = fakeItem({ seq: 42 });
      const { store, projectAdds } = buildStore({ initialItems: [item] });
      store.setMode({ kind: 'item', seq: 42, stage: 'mature' });
      store.addProject('hermes');
      // Mock projectsFor returns []; first add succeeds.
      expect(projectAdds).toHaveLength(1);
    });

    it('item ops are no-ops when no item is loaded (Draft mode)', () => {
      const { store, updates, archivedIds } = buildStore();
      store.updateTitle('whatever');
      store.archive();
      expect(updates).toEqual([]);
      expect(archivedIds).toEqual([]);
    });
  });
});

// ── Closing an item out, and handing it back ─────────────────────────────────
//
// Two behaviours added 2026-08-05 for the detail page's primary actions.
//
// resolveWithMessage exists because a bare archive can't distinguish "done"
// from "abandoned" — the reason is only ever in the closer's head, so the
// message is required and lands in both the thread and the archive record.
//
// The hand-back is the subtle one. Replying must NOT reassign in general (you
// often comment on your own item), but when someone else's message is sitting
// on you, answering it is exactly when ownership should return. The ask has to
// be read *before* the post, or the new message becomes the newest and the
// author resolves to null.

const marvin = wellKnownActorId('marvin');
const boris = wellKnownActorId('boris');

const askFrom = (author: ReturnType<typeof wellKnownActorId>) => ({
  id: 'msg-1',
  vault_item_id: vaultItemId('item-1'),
  author_actor_id: author,
  kind: 'comment' as const,
  body: 'what do you want me to do here?',
  in_reply_to: null,
  answered_by: null,
  created_at: '2026-08-05T10:00:00Z',
});

const reply = () => ({
  id: 'msg-2',
  vault_item_id: vaultItemId('item-1'),
  author_actor_id: marvin,
  kind: 'comment' as const,
  body: 'go ahead with option B',
  in_reply_to: null,
  answered_by: null,
});

describe('resolveWithMessage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('posts the message to the thread and archives with it as the reason', () => {
    const item = fakeItem({ seq: 42 });
    const { store, archiveCalls, mockThread } = buildStore({ initialItems: [item] });
    store.setMode({ kind: 'item', seq: 42, stage: 'mature' });

    store.resolveWithMessage('  sorted — the card was updated on their portal  ');

    expect(mockThread.post).toHaveBeenCalledTimes(1);
    expect((mockThread.post as unknown as { mock: { calls: [{ body: string }][] } }).mock.calls[0][0].body)
      .toBe('sorted — the card was updated on their portal');
    expect(archiveCalls).toEqual([
      { id: 'item-1', note: 'sorted — the card was updated on their portal' },
    ]);
  });

  it('does nothing when the message is blank', () => {
    const item = fakeItem({ seq: 42 });
    const { store, archiveCalls, mockThread } = buildStore({ initialItems: [item] });
    store.setMode({ kind: 'item', seq: 42, stage: 'mature' });

    store.resolveWithMessage('   ');

    expect(mockThread.post).not.toHaveBeenCalled();
    expect(archiveCalls).toEqual([]);
  });
});

describe('handing back on reply', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('reassigns to the asker when their message is sitting on me', () => {
    const item = fakeItem({ seq: 42, assigned_to: marvin });
    const { store, mockItems } = buildStore({
      initialItems: [item],
      pendingReplies: [askFrom(boris)],
    });
    store.setMode({ kind: 'item', seq: 42, stage: 'mature' });

    store.postThreadReply(reply() as never);

    expect(mockItems.reassign).toHaveBeenCalledWith(
      vaultItemId('item-1'), boris, 'answered in thread',
    );
  });

  it('does not reassign when the hand-back is switched off', () => {
    const item = fakeItem({ seq: 42, assigned_to: marvin });
    const { store, mockItems } = buildStore({
      initialItems: [item],
      pendingReplies: [askFrom(boris)],
    });
    store.setMode({ kind: 'item', seq: 42, stage: 'mature' });
    store.toggleHandBack();

    store.postThreadReply(reply() as never);

    expect(mockItems.reassign).not.toHaveBeenCalled();
  });

  // Commenting on someone else's item shouldn't move it around.
  it('does not reassign an item that is not mine', () => {
    const item = fakeItem({ seq: 42, assigned_to: boris });
    const { store, mockItems } = buildStore({
      initialItems: [item],
      pendingReplies: [askFrom(boris)],
    });
    store.setMode({ kind: 'item', seq: 42, stage: 'mature' });

    store.postThreadReply(reply() as never);

    expect(mockItems.reassign).not.toHaveBeenCalled();
  });

  it('does not reassign when nothing was waiting on me', () => {
    const item = fakeItem({ seq: 42, assigned_to: marvin });
    const { store, mockItems } = buildStore({ initialItems: [item], pendingReplies: [] });
    store.setMode({ kind: 'item', seq: 42, stage: 'mature' });

    store.postThreadReply(reply() as never);

    expect(mockItems.reassign).not.toHaveBeenCalled();
  });

  // My own trailing message is not an ask — otherwise replying to yourself
  // would hand the item to yourself and log a pointless reassign.
  it('does not reassign when the last message is my own', () => {
    const item = fakeItem({ seq: 42, assigned_to: marvin });
    const { store, mockItems } = buildStore({
      initialItems: [item],
      pendingReplies: [askFrom(marvin)],
    });
    store.setMode({ kind: 'item', seq: 42, stage: 'mature' });

    store.postThreadReply(reply() as never);

    expect(mockItems.reassign).not.toHaveBeenCalled();
  });
});
