import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { resetSeedModeCache } from '@shared/seed-mode';
import { ToastService } from '@shared/components/toast/toast.service';

import { DispatchService } from '@features/execution/data-access/dispatch.service';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { ActivityEventsService } from '@features/vault-items/data-access/activity-events.service';
import { DispatchCommands } from './dispatch-commands';

import { dispatchId } from '@domain/ids';
import type { DispatchQueueEntry } from '@domain/dispatch';

describe('DispatchCommands (seed mode)', () => {
  let commands: DispatchCommands;
  let dispatch: DispatchService;
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

    commands = TestBed.inject(DispatchCommands);
    dispatch = TestBed.inject(DispatchService);
    vaultItems = TestBed.inject(VaultItemsService);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    window.history.replaceState({}, '', window.location.pathname);
    resetSeedModeCache();
  });

  function lastErrorToast(): string | undefined {
    const errors = toast.toasts().filter(t => t.tone === 'error');
    return errors[errors.length - 1]?.message;
  }

  function pickEntry(predicate: (e: DispatchQueueEntry) => boolean): DispatchQueueEntry {
    const entry = dispatch.entries().find(predicate);
    if (!entry) throw new Error('no matching seed dispatch entry — adjust fixture');
    return entry;
  }

  // ── dismiss ──────────────────────────────────────────────────────────────

  describe('dismiss', () => {
    it('removes a completed entry from the local state', () => {
      const entry = pickEntry(e => e.status === 'completed');
      const beforeCount = dispatch.entries().length;

      commands.dismiss(entry.id);

      expect(dispatch.entries()).toHaveLength(beforeCount - 1);
      expect(dispatch.getById(entry.id)).toBeUndefined();
    });

    it('removes a failed entry from the local state', () => {
      const entry = pickEntry(e => e.status === 'failed');
      commands.dismiss(entry.id);
      expect(dispatch.getById(entry.id)).toBeUndefined();
    });

    it('refuses to dismiss a non-terminal entry and toasts', () => {
      const entry = pickEntry(e => e.status === 'running' || e.status === 'approved');
      const beforeCount = dispatch.entries().length;

      commands.dismiss(entry.id);

      expect(dispatch.entries()).toHaveLength(beforeCount);
      expect(lastErrorToast()).toMatch(/can't delete/i);
    });

    it('is a no-op for an unknown id', () => {
      const beforeCount = dispatch.entries().length;
      commands.dismiss(dispatchId('does-not-exist'));
      expect(dispatch.entries()).toHaveLength(beforeCount);
    });
  });

  // ── archiveTaskAndDismiss ────────────────────────────────────────────────

  describe('archiveTaskAndDismiss', () => {
    it('archives the underlying vault item AND removes the dispatch row', () => {
      const entry = pickEntry(e => e.status === 'failed');
      const taskId = entry.task_id;
      const beforeArchived = vaultItems.getById(taskId)?.archived_at;
      expect(beforeArchived).toBeNull();

      commands.archiveTaskAndDismiss(entry);

      const item = vaultItems.getById(taskId);
      expect(item?.archived_at).not.toBeNull();
      expect(dispatch.getById(entry.id)).toBeUndefined();
      expect(activityPosts.map(e => e.type)).toContain('archived');
    });
  });

  // ── clearCompleted / clearFailed ─────────────────────────────────────────

  describe('bulk clear', () => {
    it('clearCompleted removes every completed entry, leaves others alone', () => {
      const beforeCompleted = dispatch.entries().filter(e => e.status === 'completed');
      const beforeOther = dispatch.entries().filter(e => e.status !== 'completed');
      // Sanity — fixture should have at least one completed and one non-completed
      expect(beforeCompleted.length).toBeGreaterThan(0);
      expect(beforeOther.length).toBeGreaterThan(0);

      commands.clearCompleted();

      expect(dispatch.entries().filter(e => e.status === 'completed')).toHaveLength(0);
      expect(dispatch.entries().filter(e => e.status !== 'completed')).toHaveLength(beforeOther.length);
    });

    it('clearFailed removes every failed entry, leaves others alone', () => {
      const beforeFailed = dispatch.entries().filter(e => e.status === 'failed');
      const beforeOther = dispatch.entries().filter(e => e.status !== 'failed');
      expect(beforeFailed.length).toBeGreaterThan(0);

      commands.clearFailed();

      expect(dispatch.entries().filter(e => e.status === 'failed')).toHaveLength(0);
      expect(dispatch.entries().filter(e => e.status !== 'failed')).toHaveLength(beforeOther.length);
    });
  });
});
