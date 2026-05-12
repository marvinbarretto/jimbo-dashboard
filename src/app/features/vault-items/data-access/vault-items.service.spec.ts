import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetSeedModeCache } from '@shared/seed-mode';

import { VaultItemsService } from './vault-items.service';
import { ActivityEventsService } from './activity-events.service';
import { VaultItemProjectsService } from './vault-item-projects.service';
import { ToastService } from '@shared/components/toast/toast.service';
import { actorId, projectId, vaultItemId , wellKnownActorId} from '@domain/ids';
import type { Project } from '@domain/projects/project';
import { EMPTY_PROJECT_BRIEF } from '@domain/projects/project';
import type { Actor } from '@domain/actors/actor';
import type { DraftPayload } from '../dialog/vault-item-dialog-mode';

// Seed data (SEED.vault_items via fixtures.ts) already has multiple items with
// grooming_status='decomposed' (ITEM_G assigned to boris, ITEM_T to marvin,
// ITEM_U to boris). No seed editing needed — the service populates from SEED
// in seed mode, so the fixture is available out of the box.

describe('VaultItemsService.rejectItem (seed mode)', () => {
  let service: VaultItemsService;
  let activityPosts: unknown[];

  beforeEach(() => {
    // Set seed mode before TestBed so isSeedMode() returns true when the service
    // constructor calls load(). vi.mock of '@shared/seed-mode' is unreliable under
    // @angular/build:unit-test's vitest plugin.
    window.history.replaceState({}, '', '?seed=1');
    resetSeedModeCache();
    activityPosts = [];
    const mockActivity = { post: (e: unknown) => { activityPosts.push(e); } };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        VaultItemsService,
        { provide: ActivityEventsService, useValue: mockActivity },
      ],
    });
    service = TestBed.inject(VaultItemsService);
  });

  afterEach(() => {
    window.history.replaceState({}, '', window.location.pathname);
    resetSeedModeCache();
  });

  it('moves item to needs_rework, reassigns owner, posts thread message + rejection event', () => {
    const items = service.items();
    const item = items.find(i => i.grooming_status === 'decomposed');
    if (!item) throw new Error('no decomposed seed item — adjust fixture');

    service.rejectItem(item.id, 'AC too verbose, retry', actorId('vault-decompose'));

    const updated = service.getById(item.id)!;
    expect(updated.grooming_status).toBe('needs_rework');
    expect(updated.assigned_to).toBe(actorId('vault-decompose'));

    const types = activityPosts.map(e => (e as { type: string }).type);
    expect(types).toContain('thread_message_posted');
    expect(types).toContain('rejected');

    const rejection = activityPosts.find(e => (e as { type: string }).type === 'rejected') as Record<string, unknown>;
    expect(rejection['from_status']).toBe('decomposed');
    expect(rejection['to_status']).toBe('needs_rework');
    expect(rejection['reason']).toBe('AC too verbose, retry');
    expect(rejection['from_owner']).toBe(item.assigned_to);
    expect(rejection['to_owner']).toBe(actorId('vault-decompose'));
  });

  it('refuses to reject when reason is empty', () => {
    const item = service.items().find(i => i.grooming_status === 'decomposed');
    if (!item) throw new Error('no decomposed seed item');
    expect(() => service.rejectItem(item.id, '', wellKnownActorId('boris'))).toThrow(/reason required/i);
  });

  it('refuses to reject when reason is below minimum length', () => {
    const item = service.items().find(i => i.grooming_status === 'decomposed');
    if (!item) throw new Error('no decomposed seed item');
    expect(() => service.rejectItem(item.id, 'short', wellKnownActorId('boris'))).toThrow(/12 chars/i);
  });

  it('is a no-op when item is already in needs_rework', () => {
    const item = service.items().find(i => i.grooming_status === 'decomposed');
    if (!item) throw new Error('no decomposed seed item');
    service.setGroomingStatus(item.id, 'needs_rework');
    activityPosts.length = 0;

    service.rejectItem(item.id, 'should not fire — already in rework', wellKnownActorId('boris'));
    expect(activityPosts).toHaveLength(0);
  });
});

describe('VaultItemsService.createWithRelations (HTTP mode)', () => {
  let service: VaultItemsService;
  let http: HttpTestingController;
  let activityPosts: unknown[];
  let junctionAdds: { vault_item_id: string; project_id: string }[];

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
    created_at: '2026-01-01T00:00:00Z',
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

  beforeEach(() => {
    // Reset between describe blocks; the first block (rejectItem) leaves an
    // instantiated TestBed from its own beforeEach.
    TestBed.resetTestingModule();
    // Force HTTP mode (no ?seed=1) so the constructor's load() hits the API.
    window.history.replaceState({}, '', window.location.pathname);
    resetSeedModeCache();

    activityPosts = [];
    junctionAdds = [];
    const mockActivity = { post: (e: unknown) => { activityPosts.push(e); } };
    const mockProjects = {
      add: (vid: unknown, pid: unknown) => junctionAdds.push({
        vault_item_id: String(vid),
        project_id: String(pid),
      }),
    };
    const mockToast = { success: () => {}, error: () => {}, info: () => {} };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        VaultItemsService,
        { provide: ActivityEventsService, useValue: mockActivity },
        { provide: VaultItemProjectsService, useValue: mockProjects },
        { provide: ToastService, useValue: mockToast },
      ],
    });
    service = TestBed.inject(VaultItemsService);
    http = TestBed.inject(HttpTestingController);

    // Constructor fires GET /api/vault/board?limit=2000 — flush an empty list.
    const boardReq = http.expectOne(req => req.url.includes('/api/vault/board'));
    boardReq.flush({ items: [] });
  });

  afterEach(() => {
    http.verify();
    resetSeedModeCache();
  });

  it('posts the note body with title, type, source, and assigned_to', () => {
    const draft: DraftPayload = {
      title: '  fix the parser  ',
      body: '',
      tags: [],
      projects: [],
      assignee: null,
      related: [],
      is_epic: false,
      github_url: null,
    };

    service.createWithRelations(draft).subscribe();

    const req = http.expectOne(r => r.url.endsWith('/api/vault/notes') && r.method === 'POST');
    expect(req.request.body).toEqual({
      title: 'fix the parser',
      type: 'task',
      source_kind: 'manual',
      source_ref: 'dialog',
      assigned_to: 'marvin',
    });
    req.flush({ id: 'item-1', seq: 100, title: 'fix the parser', created_at: null });
  });

  it('joins tags with comma+space and dedupes them', () => {
    const draft: DraftPayload = {
      title: 'x',
      body: '',
      tags: ['urgent', 'bug', 'urgent'],
      projects: [],
      assignee: null,
      related: [],
      is_epic: false,
      github_url: null,
    };
    service.createWithRelations(draft).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/api/vault/notes'));
    expect(req.request.body['tags']).toBe('urgent, bug');
    req.flush({ id: 'i', seq: 1, title: 'x', created_at: null });
  });

  it('uses assignee.id when set, otherwise current actor', () => {
    const draft: DraftPayload = {
      title: 'x', body: '', tags: [], projects: [],
      assignee: fakeActor('boris'),
      related: [],
      is_epic: false,
      github_url: null,
    };
    service.createWithRelations(draft).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/api/vault/notes'));
    expect(req.request.body['assigned_to']).toBe('boris');
    req.flush({ id: 'i', seq: 1, title: 'x', created_at: null });
  });

  it('serialises related items as links with target_type=vault_note, deduped', () => {
    const draft: DraftPayload = {
      title: 'x', body: '', tags: [], projects: [], assignee: null,
      related: [
        { id: vaultItemId('a'), title: 'a', seq: 1 },
        { id: vaultItemId('b'), title: 'b', seq: 2 },
        { id: vaultItemId('a'), title: 'a-dup', seq: 1 },
      ],
      is_epic: false, github_url: null,
    };
    service.createWithRelations(draft).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/api/vault/notes'));
    expect(req.request.body['links']).toEqual([
      { target_type: 'vault_note', target_id: 'a' },
      { target_type: 'vault_note', target_id: 'b' },
    ]);
    req.flush({ id: 'i', seq: 1, title: 'x', created_at: null });
  });

  it('omits empty body, tags, and links from the body', () => {
    const draft: DraftPayload = {
      title: 'x', body: '   ', tags: [], projects: [], assignee: null, related: [],
      is_epic: false, github_url: null,
    };
    service.createWithRelations(draft).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/api/vault/notes'));
    expect(req.request.body).not.toHaveProperty('body');
    expect(req.request.body).not.toHaveProperty('tags');
    expect(req.request.body).not.toHaveProperty('links');
    req.flush({ id: 'i', seq: 1, title: 'x', created_at: null });
  });

  it('on success: appends item to local state, posts created event, fans out junction adds', () => {
    const draft: DraftPayload = {
      title: 'x', body: '', tags: [], assignee: null, related: [],
      projects: [fakeProject('hermes'), fakeProject('localshout'), fakeProject('hermes')],
      is_epic: false, github_url: null,
    };

    let emitted: { id: string; seq: number; title: string } | undefined;
    service.createWithRelations(draft).subscribe(item => {
      emitted = { id: item.id, seq: item.seq, title: item.title };
    });

    const req = http.expectOne(r => r.url.endsWith('/api/vault/notes'));
    req.flush({ id: 'item-7', seq: '42', title: 'x', created_at: '2026-05-06T00:00:00Z' });

    expect(emitted).toEqual({ id: 'item-7', seq: 42, title: 'x' });
    expect(service.getBySeq(42)?.title).toBe('x');

    expect(activityPosts).toHaveLength(1);
    expect((activityPosts[0] as { type: string }).type).toBe('created');

    // Deduped to two unique projects.
    expect(junctionAdds).toEqual([
      { vault_item_id: 'item-7', project_id: 'hermes' },
      { vault_item_id: 'item-7', project_id: 'localshout' },
    ]);
  });
});

// ── HTTP-mode integration tests for mutations migrated to withOptimistic ───
//
// The helpers themselves have full unit coverage in
// src/app/shared/data-access/with-optimistic.spec.ts. These tests prove the
// WIRING — that each method calls the helper with the right HTTP shape, the
// right activity event, the right toast, and that the rollback path works
// end-to-end against HttpTestingController.
//
// One method per describe block, each with: success path (with side effects),
// error rollback (with toast), and short-circuit no-ops where applicable.

describe('VaultItemsService mutations (HTTP mode, withOptimistic-backed)', () => {
  let service: VaultItemsService;
  let http: HttpTestingController;
  let toast: ToastService;
  let activityPosts: { type: string; [k: string]: unknown }[];

  // Minimal valid ApiVaultItem — schema requires every field. Helper accepts
  // overrides so each test can tweak just what matters.
  function fakeApiItem(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id:                   'item-1',
      seq:                  100,
      title:                'fixture',
      type:                 'task',
      status:               'active',
      body:                 null,
      ai_priority:          null,
      manual_priority:      2,
      priority_confidence:  null,
      ai_rationale:         null,
      actionability:        null,
      assigned_to:          'marvin',
      route:                'manual',
      tags:                 [],
      ready:                false,
      is_epic:              false,
      parent_id:            null,
      acceptance_criteria:  null,
      blocked_by:           null,
      blocked_reason:       null,
      blocked_at:           null,
      due_at:               null,
      created_at:           '2026-05-01T00:00:00Z',
      updated_at:           '2026-05-01T00:00:00Z',
      completed_at:         null,
      grooming_status:      'decomposed',
      grooming_started_at:  null,
      source_kind:          'manual',
      source_ref:           'marvin',
      source_url:           null,
      source_signal:        null,
      primary_project_id:   null,
      primary_project_name: null,
      open_questions_count: 0,
      latest_activity_at:   null,
      children_count:       0,
      latest_event:         null,
      latest_message:       null,
      days_in_column:       0,
      ...overrides,
    };
  }

  function setup(items: ReturnType<typeof fakeApiItem>[] = [fakeApiItem()]) {
    TestBed.resetTestingModule();
    window.history.replaceState({}, '', window.location.pathname);
    resetSeedModeCache();
    activityPosts = [];

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        VaultItemsService,
        {
          provide: ActivityEventsService,
          useValue: { post: (e: { type: string }) => { activityPosts.push(e); } },
        },
        // VaultItemsService injects this transitively. Its real constructor
        // fires GET /api/vault-item-projects which would leak through every
        // test's http.verify(); the mock keeps the suite focused on the
        // mutation paths we care about.
        {
          provide: VaultItemProjectsService,
          useValue: {
            loadFor: () => {},
            projectsFor: () => () => [],
            add: () => {},
          },
        },
      ],
    });
    service = TestBed.inject(VaultItemsService);
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);

    const boardReq = http.expectOne(r => r.url.includes('/api/vault/board'));
    boardReq.flush({ items, total: items.length, limit: 2000 });
  }

  function lastErrorToast(): string | undefined {
    const errs = toast.toasts().filter(t => t.tone === 'error');
    return errs[errs.length - 1]?.message;
  }
  function lastSuccessToast(): string | undefined {
    const oks = toast.toasts().filter(t => t.tone === 'success');
    return oks[oks.length - 1]?.message;
  }

  beforeEach(() => setup());

  afterEach(() => {
    http.verify();
    resetSeedModeCache();
  });

  // ── archive ─────────────────────────────────────────────────────────────
  describe('archive', () => {
    it('PATCHes status=archived, sets archived_at optimistically, emits event on success', () => {
      const id = vaultItemId('item-1');
      service.archive(id);

      expect(service.getById(id)?.archived_at).not.toBeNull();
      const req = http.expectOne(r => r.method === 'PATCH' && r.url.endsWith('/by-seq/100'));
      expect(req.request.body).toEqual({ status: 'archived' });
      req.flush({ id: 'item-1', seq: '100' });

      expect(activityPosts.map(e => e.type)).toContain('archived');
      expect(lastSuccessToast()).toMatch(/archived/i);
    });

    it('rolls back on error and toasts', () => {
      const id = vaultItemId('item-1');
      service.archive(id);
      const req = http.expectOne(r => r.method === 'PATCH');
      req.error(new ProgressEvent('network'), { status: 500, statusText: 'boom' });

      expect(service.getById(id)?.archived_at).toBeNull();
      expect(activityPosts).toHaveLength(0);
      expect(lastErrorToast()).toMatch(/archive failed/i);
    });

    it('is a no-op when already archived', () => {
      setup([fakeApiItem({ status: 'archived' })]);
      service.archive(vaultItemId('item-1'));
      http.expectNone(r => r.method === 'PATCH');
    });
  });

  // ── unarchive ───────────────────────────────────────────────────────────
  describe('unarchive', () => {
    it('PATCHes status=active and emits unarchived event on success', () => {
      setup([fakeApiItem({ status: 'archived' })]);
      service.unarchive(vaultItemId('item-1'));
      const req = http.expectOne(r => r.method === 'PATCH');
      expect(req.request.body).toEqual({ status: 'active' });
      req.flush({ id: 'item-1', seq: '100' });

      expect(activityPosts.map(e => e.type)).toContain('unarchived');
      expect(lastSuccessToast()).toMatch(/restored/i);
    });

    it('is a no-op when already active', () => {
      service.unarchive(vaultItemId('item-1'));
      http.expectNone(r => r.method === 'PATCH');
    });
  });

  // ── setCompleted ───────────────────────────────────────────────────────
  describe('setCompleted', () => {
    it('PATCHes status=done and emits completion_changed on success', () => {
      const id = vaultItemId('item-1');
      service.setCompleted(id, true);

      expect(service.getById(id)?.completed_at).not.toBeNull();
      const req = http.expectOne(r => r.method === 'PATCH');
      expect(req.request.body).toEqual({ status: 'done' });
      req.flush({ id: 'item-1', seq: '100' });

      expect(activityPosts.map(e => e.type)).toContain('completion_changed');
      expect(lastSuccessToast()).toMatch(/marked complete/i);
    });

    it('rolls back completed_at on error', () => {
      const id = vaultItemId('item-1');
      service.setCompleted(id, true);
      const req = http.expectOne(r => r.method === 'PATCH');
      req.error(new ProgressEvent('network'), { status: 500, statusText: 'boom' });

      expect(service.getById(id)?.completed_at).toBeNull();
      expect(activityPosts).toHaveLength(0);
      expect(lastErrorToast()).toMatch(/completion update failed/i);
    });

    it('is a no-op when already in the requested state', () => {
      service.setCompleted(vaultItemId('item-1'), false);
      http.expectNone(r => r.method === 'PATCH');
    });
  });

  // ── setGroomingStatus ──────────────────────────────────────────────────
  describe('setGroomingStatus', () => {
    it('PATCHes grooming_status, applies optimistically, emits event without success toast', () => {
      const id = vaultItemId('item-1');
      service.setGroomingStatus(id, 'ready');

      expect(service.getById(id)?.grooming_status).toBe('ready');
      const req = http.expectOne(r => r.method === 'PATCH');
      expect(req.request.body).toEqual({ grooming_status: 'ready' });
      req.flush({ id: 'item-1', seq: '100' });

      expect(activityPosts.map(e => e.type)).toContain('grooming_status_changed');
      // No success toast — drag-drop fires this every column move.
      expect(lastSuccessToast()).toBeUndefined();
    });

    it('rolls back grooming_status on error', () => {
      const id = vaultItemId('item-1');
      service.setGroomingStatus(id, 'ready');
      const req = http.expectOne(r => r.method === 'PATCH');
      req.error(new ProgressEvent('network'), { status: 500, statusText: 'boom' });

      expect(service.getById(id)?.grooming_status).toBe('decomposed');
      expect(activityPosts).toHaveLength(0);
      expect(lastErrorToast()).toMatch(/status change failed/i);
    });
  });

  // ── reassign ──────────────────────────────────────────────────────────
  describe('reassign', () => {
    it('PATCHes assigned_to, applies optimistically, emits assigned event on success', () => {
      const id = vaultItemId('item-1');
      const next = actorId('boris');
      service.reassign(id, next, 'cover for marvin');

      expect(service.getById(id)?.assigned_to).toBe(next);
      const req = http.expectOne(r => r.method === 'PATCH');
      expect(req.request.body).toEqual({ assigned_to: 'boris' });
      req.flush({ id: 'item-1', seq: '100' });

      expect(activityPosts.map(e => e.type)).toContain('assigned');
      expect(lastSuccessToast()).toMatch(/reassigned to boris/i);
    });

    it('rolls back assigned_to on error', () => {
      const id = vaultItemId('item-1');
      service.reassign(id, actorId('boris'), null);
      const req = http.expectOne(r => r.method === 'PATCH');
      req.error(new ProgressEvent('network'), { status: 500, statusText: 'boom' });

      expect(service.getById(id)?.assigned_to).toBe(actorId('marvin'));
      expect(lastErrorToast()).toMatch(/reassign failed/i);
    });
  });

  // ── setEpic ───────────────────────────────────────────────────────────
  describe('setEpic', () => {
    it('PATCHes is_epic optimistically and persists on success without an event', () => {
      const id = vaultItemId('item-1');
      service.setEpic(id, true);

      expect(service.getById(id)?.is_epic).toBe(true);
      const req = http.expectOne(r => r.method === 'PATCH');
      expect(req.request.body).toEqual({ is_epic: true });
      req.flush({ id: 'item-1', seq: '100' });

      expect(activityPosts).toHaveLength(0);
    });

    it('rolls back on error', () => {
      const id = vaultItemId('item-1');
      service.setEpic(id, true);
      const req = http.expectOne(r => r.method === 'PATCH');
      req.error(new ProgressEvent('network'), { status: 500, statusText: 'boom' });

      expect(service.getById(id)?.is_epic).toBe(false);
      expect(lastErrorToast()).toMatch(/epic toggle failed/i);
    });

    it('is a no-op when already in the requested state', () => {
      service.setEpic(vaultItemId('item-1'), false);
      http.expectNone(r => r.method === 'PATCH');
    });
  });

  // ── update ────────────────────────────────────────────────────────────
  describe('update', () => {
    it('PATCHes the body, applies optimistically, emits no event', () => {
      const id = vaultItemId('item-1');
      service.update(id, { title: 'renamed' });

      expect(service.getById(id)?.title).toBe('renamed');
      const req = http.expectOne(r => r.method === 'PATCH');
      expect(req.request.body).toMatchObject({ title: 'renamed' });
      req.flush({ id: 'item-1', seq: '100' });

      expect(activityPosts).toHaveLength(0);
    });

    it('rolls back the patch on error and toasts a generic message', () => {
      const id = vaultItemId('item-1');
      service.update(id, { title: 'renamed' });
      const req = http.expectOne(r => r.method === 'PATCH');
      req.error(new ProgressEvent('network'), { status: 500, statusText: 'boom' });

      expect(service.getById(id)?.title).toBe('fixture');
      expect(lastErrorToast()).toMatch(/update failed/i);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('DELETEs by seq, removes from store optimistically, toasts on success', () => {
      const id = vaultItemId('item-1');
      service.remove(id);

      expect(service.getById(id)).toBeUndefined();
      const req = http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/by-seq/100'));
      req.flush(null);

      expect(lastSuccessToast()).toMatch(/deleted/i);
    });

    it('restores the row on error', () => {
      const id = vaultItemId('item-1');
      service.remove(id);
      const req = http.expectOne(r => r.method === 'DELETE');
      req.error(new ProgressEvent('network'), { status: 500, statusText: 'boom' });

      expect(service.getById(id)).toBeDefined();
      expect(lastErrorToast()).toMatch(/delete failed/i);
    });
  });

  // ── createOnBoard ─────────────────────────────────────────────────────
  describe('createOnBoard', () => {
    it('POSTs the slim body, prepends the optimistic row, swaps real id on success', () => {
      const beforeCount = service.items().length;
      service.createOnBoard({ title: 'fresh capture', manual_priority: 1 });

      // Optimistic row is at the top of the list with the temp id.
      const optimistic = service.items()[0];
      expect(optimistic.title).toBe('fresh capture');
      expect(optimistic.seq).toBe(-1);
      expect(service.items().length).toBe(beforeCount + 1);

      const req = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/vault/notes'));
      expect(req.request.body).toMatchObject({
        title: 'fresh capture',
        type: 'task',
        source_kind: 'manual',
        source_ref: 'board',
        manual_priority: 1,
      });
      req.flush({ id: 'item-2', seq: '101', title: 'fresh capture', assigned_to: 'marvin' });

      // Temp id replaced with real; row stays in original (prepended) position.
      expect(service.items()[0].id).toBe('item-2');
      expect(service.items()[0].seq).toBe(101);
      expect(lastSuccessToast()).toMatch(/created/i);
    });

    it('removes the temp row and toasts on POST error', () => {
      const beforeCount = service.items().length;
      service.createOnBoard({ title: 'doomed' });

      const req = http.expectOne(r => r.method === 'POST');
      req.error(new ProgressEvent('network'), { status: 500, statusText: 'boom' });

      expect(service.items().length).toBe(beforeCount);
      expect(lastErrorToast()).toMatch(/failed to create/i);
    });

    it('fires a follow-up PATCH when grooming_status differs from ungroomed', () => {
      service.createOnBoard({ title: 'queued ready', grooming_status: 'ready' });

      const post = http.expectOne(r => r.method === 'POST');
      post.flush({ id: 'item-3', seq: '102', title: 'queued ready', assigned_to: 'marvin' });

      const patch = http.expectOne(r => r.method === 'PATCH' && r.url.endsWith('/by-seq/102'));
      expect(patch.request.body).toMatchObject({ grooming_status: 'ready' });
      patch.flush({ id: 'item-3', seq: '102' });
    });
  });

  // ── create ────────────────────────────────────────────────────────────
  describe('create', () => {
    function fullPayload(over: Partial<Record<string, unknown>> = {}) {
      return {
        title: 'full form item',
        body: '',
        type: 'task' as const,
        category: null,
        assigned_to: null,
        tags: [],
        acceptance_criteria: [],
        grooming_status: 'ungroomed' as const,
        ai_priority: null,
        manual_priority: null,
        ai_rationale: null,
        priority_confidence: null,
        actionability: null,
        parent_id: null,
        is_epic: false,
        due_at: null,
        completed_at: null,
        source: null,
        ...over,
      };
    }

    it('appends the optimistic row (not prepend) and swaps the real id on success', () => {
      const beforeCount = service.items().length;
      service.create(fullPayload());

      // Append: optimistic ends up at the tail, not the head.
      expect(service.items()[beforeCount].title).toBe('full form item');

      const req = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/vault/notes'));
      expect(req.request.body).toMatchObject({ title: 'full form item', type: 'task' });
      req.flush({ id: 'item-9', seq: '200', title: 'full form item', created_at: '2026-05-09T10:00:00Z' });

      const realRow = service.items().find(i => i.title === 'full form item')!;
      expect(realRow.id).toBe('item-9');
      expect(realRow.seq).toBe(200);
      // Activity event fired only after the real id is known.
      expect(activityPosts.map(e => e.type)).toContain('created');
      expect(activityPosts.find(e => e.type === 'created')?.['vault_item_id']).toBe('item-9');
      expect(lastSuccessToast()).toMatch(/created/i);
    });

    it('removes the temp row and toasts on error', () => {
      const beforeCount = service.items().length;
      service.create(fullPayload());

      const req = http.expectOne(r => r.method === 'POST');
      req.error(new ProgressEvent('network'), { status: 500, statusText: 'boom' });

      expect(service.items().length).toBe(beforeCount);
      expect(activityPosts).toHaveLength(0);
      expect(lastErrorToast()).toMatch(/failed to create/i);
    });
  });

  // ── rejectItem ────────────────────────────────────────────────────────
  describe('rejectItem (HTTP mode)', () => {
    it('PATCHes the vault item, posts a thread message, emits two events on success', () => {
      const id = vaultItemId('item-1');
      service.rejectItem(id, 'AC are too vague — needs splitting', actorId('boris'));

      // Optimistic state visible immediately.
      const after = service.getById(id)!;
      expect(after.grooming_status).toBe('needs_rework');
      expect(after.assigned_to).toBe(actorId('boris'));

      const patch = http.expectOne(r => r.method === 'PATCH' && r.url.endsWith('/by-seq/100'));
      expect(patch.request.body).toMatchObject({
        grooming_status: 'needs_rework',
        assigned_to: 'boris',
      });
      patch.flush({ id: 'item-1', seq: '100' });

      // After PATCH success: thread-message POST fires.
      const tm = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/thread-messages'));
      expect(tm.request.body).toMatchObject({
        kind: 'rejection',
        body: 'AC are too vague — needs splitting',
      });
      tm.flush({});

      // Both audit events posted; success toast fired.
      const types = activityPosts.map(e => e.type);
      expect(types).toContain('thread_message_posted');
      expect(types).toContain('rejected');
      expect(lastSuccessToast()).toMatch(/sent back for rework/i);
    });

    it('rolls back the optimistic state on PATCH error', () => {
      const id = vaultItemId('item-1');
      service.rejectItem(id, 'reason that is long enough', actorId('boris'));

      const patch = http.expectOne(r => r.method === 'PATCH');
      patch.error(new ProgressEvent('network'), { status: 500, statusText: 'boom' });

      const restored = service.getById(id)!;
      expect(restored.grooming_status).toBe('decomposed');
      expect(restored.assigned_to).toBe(actorId('marvin'));
      expect(activityPosts).toHaveLength(0);
      expect(lastErrorToast()).toMatch(/rejection failed/i);
    });
  });
});
