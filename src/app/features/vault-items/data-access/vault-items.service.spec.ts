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
import { actorId, projectId, vaultItemId } from '@domain/ids';
import type { Project } from '@domain/projects/project';
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
    expect(() => service.rejectItem(item.id, '', actorId('boris'))).toThrow(/reason required/i);
  });

  it('refuses to reject when reason is below minimum length', () => {
    const item = service.items().find(i => i.grooming_status === 'decomposed');
    if (!item) throw new Error('no decomposed seed item');
    expect(() => service.rejectItem(item.id, 'short', actorId('boris'))).toThrow(/12 chars/i);
  });

  it('is a no-op when item is already in needs_rework', () => {
    const item = service.items().find(i => i.grooming_status === 'decomposed');
    if (!item) throw new Error('no decomposed seed item');
    service.setGroomingStatus(item.id, 'needs_rework');
    activityPosts.length = 0;

    service.rejectItem(item.id, 'should not fire — already in rework', actorId('boris'));
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
    owner_actor_id: actorId('marvin'),
    criteria: null,
    repo_url: null,
    color_token: null,
    created_at: '2026-01-01T00:00:00Z',
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
