import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { resetSeedModeCache } from '@shared/seed-mode';
import { ToastService } from '@shared/components/toast/toast.service';

import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { ActivityEventsService } from '@features/vault-items/data-access/activity-events.service';
import { GroomingCommands } from './grooming-commands';

import { vaultItemId, wellKnownActorId } from '@domain/ids';
import type { VaultItem, GroomingStatus } from '@domain/vault';

describe('GroomingCommands (seed mode)', () => {
  let commands: GroomingCommands;
  let vaultItems: VaultItemsService;
  let toast: ToastService;
  let activityPosts: { type: string }[];

  beforeEach(() => {
    window.history.replaceState({}, '', '?seed=1');
    resetSeedModeCache();
    activityPosts = [];

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivityEventsService,
          useValue: { post: (e: { type: string }) => { activityPosts.push(e); } },
        },
      ],
    });

    commands = TestBed.inject(GroomingCommands);
    vaultItems = TestBed.inject(VaultItemsService);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    window.history.replaceState({}, '', window.location.pathname);
    resetSeedModeCache();
  });

  function pickItem(predicate: (i: VaultItem) => boolean): VaultItem {
    const item = vaultItems.items().find(predicate);
    if (!item) throw new Error('no matching seed vault item — adjust fixture');
    return item;
  }

  function lastErrorToast(): string | undefined {
    const errors = toast.toasts().filter(t => t.tone === 'error');
    return errors[errors.length - 1]?.message;
  }

  // ── moveColumn ───────────────────────────────────────────────────────────

  describe('moveColumn', () => {
    it('moves an item to the requested status', () => {
      const item = pickItem(i => i.grooming_status === 'ungroomed' && !i.archived_at);
      commands.moveColumn(item.id, 'classified');

      expect(vaultItems.getById(item.id)?.grooming_status).toBe('classified');
      expect(activityPosts.map(e => e.type)).toContain('grooming_status_changed');
    });

    it('forces a transition the strict allowlist would refuse', () => {
      // intake_rejected → ready isn't in the allowlist, but operator drag-drop
      // is allowed to bypass it. The whole point of this command vs the gated
      // approveForDispatch path.
      const item = pickItem(i => i.grooming_status === 'intake_rejected' && !i.archived_at);
      commands.moveColumn(item.id, 'ready');

      expect(vaultItems.getById(item.id)?.grooming_status).toBe('ready');
      expect(lastErrorToast()).toBeUndefined();
    });

    it('is a no-op when the item is already in the target column', () => {
      const item = pickItem(i => i.grooming_status === 'ready' && !i.archived_at);
      const before = activityPosts.length;
      commands.moveColumn(item.id, 'ready');

      expect(activityPosts.length).toBe(before);
    });

    it('is a no-op for an unknown id', () => {
      const before = activityPosts.length;
      commands.moveColumn(vaultItemId('does-not-exist'), 'ready' as GroomingStatus);
      expect(activityPosts.length).toBe(before);
    });
  });

  // ── quickReject ──────────────────────────────────────────────────────────

  describe('quickReject', () => {
    it('moves the item to needs_rework and reassigns to @marvin (canonical owner for needs_rework)', () => {
      const item = pickItem(i =>
        i.grooming_status === 'classified' &&
        !i.archived_at &&
        i.assigned_to !== null,
      );

      commands.quickReject(item.id, 'AC are too vague to commit to');

      const after = vaultItems.getById(item.id)!;
      expect(after.grooming_status).toBe('needs_rework');
      // Auto-reassign rule (see domain/vault/grooming-ownership): every
      // needs_rework item lands on @marvin so the rework backlog has one owner.
      expect(after.assigned_to).toBe(wellKnownActorId('marvin'));
    });

    it('emits a grooming_status_changed audit event', () => {
      const item = pickItem(i => i.grooming_status === 'classified' && !i.archived_at);
      activityPosts.length = 0;

      commands.quickReject(item.id, 'AC are too vague to commit to');

      expect(activityPosts.map(e => e.type)).toContain('grooming_status_changed');
    });

    it('is a no-op when the item is already in needs_rework', () => {
      // Set up: move an item to needs_rework first, then re-reject.
      const item = pickItem(i => i.grooming_status === 'classified' && !i.archived_at);
      commands.quickReject(item.id, 'first reason for parking it');
      activityPosts.length = 0;

      commands.quickReject(item.id, 'second reason for parking it');

      expect(activityPosts.length).toBe(0);
    });

    it('is a no-op for an unknown id', () => {
      const before = activityPosts.length;
      commands.quickReject(vaultItemId('does-not-exist'), 'whatever the reason');
      expect(activityPosts.length).toBe(before);
    });
  });
});
