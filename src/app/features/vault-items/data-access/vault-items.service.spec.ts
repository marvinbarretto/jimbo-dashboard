import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach } from 'vitest';

// Force seed mode at the URL level — `isSeedMode()` reads `window.location.search`
// once and caches. We set it here before TestBed instantiates the service so the
// constructor's `load()` takes the seed branch. (vi.mock of '@shared/seed-mode'
// is unreliable under @angular/build:unit-test's vitest plugin.)
window.history.replaceState({}, '', '?seed=1');

import { VaultItemsService } from './vault-items.service';
import { ActivityEventsService } from './activity-events.service';
import { actorId } from '@domain/ids';

// Seed data (SEED.vault_items via fixtures.ts) already has multiple items with
// grooming_status='decomposed' (ITEM_G assigned to boris, ITEM_T to marvin,
// ITEM_U to boris). No seed editing needed — the service populates from SEED
// in seed mode, so the fixture is available out of the box.

describe('VaultItemsService.rejectItem (seed mode)', () => {
  let service: VaultItemsService;
  let activityPosts: unknown[];

  beforeEach(() => {
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
