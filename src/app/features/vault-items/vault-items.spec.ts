import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { VaultItemsService } from './data-access/vault-items.service';
import { ActivityEventsService } from './data-access/activity-events.service';
import { VaultItemProjectsService } from './data-access/vault-item-projects.service';
import { vaultItemId } from '../../domain/ids';
import { isActive } from '../../domain/vault/vault-item';

describe('VaultItemsService', () => {
  let service: VaultItemsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(VaultItemsService);
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('items() starts empty (no mock data — endpoint not yet live)', () => {
    expect(service.items()).toEqual([]);
  });

  it('activeItems() filters to active lifecycle (no completed_at, no archived_at)', () => {
    const active = service.activeItems();
    expect(active.every(isActive)).toBe(true);
  });

  it('getBySeq() returns undefined on an empty store — no ghosts in the machine', () => {
    expect(service.getBySeq(1)).toBeUndefined();
  });
});

describe('ActivityEventsService', () => {
  let service: ActivityEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(ActivityEventsService);
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('eventsFor() returns empty array before loadFor() is called', () => {
    const id = vaultItemId('test-item-1');
    expect(service.eventsFor(id)()).toEqual([]);
  });
});

describe('VaultItemProjectsService', () => {
  let service: VaultItemProjectsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(VaultItemProjectsService);
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('projectsFor() returns empty array before loadFor() is called', () => {
    const id = vaultItemId('test-item-2');
    expect(service.projectsFor(id)()).toEqual([]);
  });
});
