import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { resetSeedModeCache } from '@shared/seed-mode';
import { ToastService } from '@shared/components/toast/toast.service';

import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { ActivityEventsService } from '@features/vault-items/data-access/activity-events.service';
import { VaultItemCommands } from './vault-item-commands';

import { VAULT_ITEM_IDS } from '@domain/vault/fixtures';
import { OWNER_BY_GROOMING_STATE } from '@domain/vault/grooming-ownership';
import { actorId, wellKnownActorId } from '@domain/ids';

// Tests run against the seed fixture. ITEM_T (#2420 "Wire up coverage badge")
// is decomposed, fully groomed (3 AC, owner @marvin, manual_priority 3) and
// has no blockers or thread messages — the cleanest fixture for the readiness
// gate's happy path. ITEM_E is ungroomed for transition-refusal tests.
//
// We mock ActivityEventsService so we can inspect emitted events without
// dragging HTTP plumbing into every assertion.

describe('VaultItemCommands', () => {
  let commands: VaultItemCommands;
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

    commands = TestBed.inject(VaultItemCommands);
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

  // ── archive ─────────────────────────────────────────────────────────────

  describe('archive', () => {
    it('sets archived_at and emits an archived event', () => {
      const before = vaultItems.getById(VAULT_ITEM_IDS.T)!;
      expect(before.archived_at).toBeNull();

      commands.archive(VAULT_ITEM_IDS.T);

      const after = vaultItems.getById(VAULT_ITEM_IDS.T)!;
      expect(after.archived_at).not.toBeNull();
      expect(activityPosts.map(e => e.type)).toContain('archived');
    });

    it('is a no-op when item is already archived', () => {
      commands.archive(VAULT_ITEM_IDS.T);
      activityPosts.length = 0;

      commands.archive(VAULT_ITEM_IDS.T);

      // Second call should not have re-emitted; service short-circuits and
      // command short-circuits before the service call.
      expect(activityPosts).toHaveLength(0);
    });

    it('is a no-op when the id is unknown', () => {
      commands.archive(actorId('does-not-exist') as never);
      expect(activityPosts).toHaveLength(0);
    });
  });

  // ── complete ────────────────────────────────────────────────────────────

  describe('complete', () => {
    it('sets completed_at and emits completion_changed', () => {
      commands.complete(VAULT_ITEM_IDS.T);

      const after = vaultItems.getById(VAULT_ITEM_IDS.T)!;
      expect(after.completed_at).not.toBeNull();
      expect(activityPosts.map(e => e.type)).toContain('completion_changed');
    });

    it('is a no-op when already complete', () => {
      commands.complete(VAULT_ITEM_IDS.T);
      activityPosts.length = 0;

      commands.complete(VAULT_ITEM_IDS.T);
      expect(activityPosts).toHaveLength(0);
    });
  });

  // ── approveForDispatch (the readiness gate) ─────────────────────────────

  describe('approveForDispatch', () => {
    it('moves a fully-groomed decomposed item to ready', () => {
      const before = vaultItems.getById(VAULT_ITEM_IDS.T)!;
      expect(before.grooming_status).toBe('decomposed');

      commands.approveForDispatch(VAULT_ITEM_IDS.T);

      const after = vaultItems.getById(VAULT_ITEM_IDS.T)!;
      expect(after.grooming_status).toBe('ready');
      expect(activityPosts.map(e => e.type)).toContain('grooming_status_changed');
    });

    it('refuses transitions that skip stages and toasts', () => {
      // ITEM_E is ungroomed — ungroomed → ready is not in the allowlist.
      // The transition gate fires before the readiness gate.
      commands.approveForDispatch(VAULT_ITEM_IDS.E);

      const after = vaultItems.getById(VAULT_ITEM_IDS.E)!;
      expect(after.grooming_status).toBe('ungroomed');
      expect(lastErrorToast()).toMatch(/cannot approve from ungroomed/i);
    });

    it('refuses when readiness checks fail and surfaces the failing reasons', () => {
      // Take a passing fixture and break one readiness check (clear AC).
      // The transition is allowed (decomposed → ready) but readiness should
      // catch the missing AC and refuse.
      vaultItems.update(VAULT_ITEM_IDS.T, { acceptance_criteria: [] });

      commands.approveForDispatch(VAULT_ITEM_IDS.T);

      const after = vaultItems.getById(VAULT_ITEM_IDS.T)!;
      expect(after.grooming_status).toBe('decomposed');
      expect(lastErrorToast()).toMatch(/can't approve/i);
      expect(lastErrorToast()).toMatch(/criterion/i);
    });

    it('is a no-op when item is already ready', () => {
      // ITEM_B is in `ready` already.
      commands.approveForDispatch(VAULT_ITEM_IDS.B);
      expect(activityPosts).toHaveLength(0);
      expect(lastErrorToast()).toBeUndefined();
    });
  });

  // ── reassign ────────────────────────────────────────────────────────────

  describe('reassign', () => {
    it('delegates to vaultItems.reassign and emits the assigned event', () => {
      const item = vaultItems.items().find(i => i.assigned_to !== null)!;
      const newOwner = item.assigned_to === wellKnownActorId('boris')
        ? wellKnownActorId('marvin')
        : wellKnownActorId('boris');

      commands.reassign(item.id, newOwner);

      expect(vaultItems.getById(item.id)!.assigned_to).toBe(newOwner);
      expect(activityPosts.map(e => e.type)).toContain('assigned');
    });

    it('is a no-op when the new owner equals the current one', () => {
      const item = vaultItems.items().find(i => i.assigned_to !== null)!;
      activityPosts.length = 0;

      commands.reassign(item.id, item.assigned_to!);

      expect(activityPosts).toHaveLength(0);
    });
  });

  // ── rejectWithReason ────────────────────────────────────────────────────

  describe('rejectWithReason', () => {
    it('delegates to vaultItems.rejectItem and composes the audit trail', () => {
      const item = vaultItems.items().find(i => i.grooming_status === 'decomposed')!;

      commands.rejectWithReason(item.id, 'AC too verbose, retry needed', wellKnownActorId('boris'));

      const after = vaultItems.getById(item.id)!;
      expect(after.grooming_status).toBe('needs_rework');
      expect(after.assigned_to).toBe(wellKnownActorId('boris'));

      const types = activityPosts.map(e => e.type);
      expect(types).toContain('thread_message_posted');
      expect(types).toContain('rejected');
    });

    it('catches reason-too-short throws and toasts them', () => {
      const item = vaultItems.items().find(i => i.grooming_status === 'decomposed')!;

      commands.rejectWithReason(item.id, 'short', wellKnownActorId('boris'));

      // Service threw, command caught and surfaced via toast.
      expect(lastErrorToast()).toMatch(/12 chars/i);
      // Item state unchanged.
      const after = vaultItems.getById(item.id)!;
      expect(after.grooming_status).toBe('decomposed');
    });

    it('catches empty-reason throws and toasts them', () => {
      const item = vaultItems.items().find(i => i.grooming_status === 'decomposed')!;

      commands.rejectWithReason(item.id, '', wellKnownActorId('boris'));

      expect(lastErrorToast()).toMatch(/reason required/i);
    });
  });

  // ── setStatus (advisory transition gate) ────────────────────────────────

  describe('setStatus', () => {
    it('allows transitions in the allowlist', () => {
      commands.setStatus(VAULT_ITEM_IDS.E, 'intake_complete');
      expect(vaultItems.getById(VAULT_ITEM_IDS.E)!.grooming_status).toBe('intake_complete');
    });

    it('refuses disallowed transitions and toasts', () => {
      // ungroomed → ready is not allowed by the table.
      commands.setStatus(VAULT_ITEM_IDS.E, 'ready');

      expect(vaultItems.getById(VAULT_ITEM_IDS.E)!.grooming_status).toBe('ungroomed');
      expect(lastErrorToast()).toMatch(/not allowed/i);
    });

    it('allows disallowed transitions when force is true (operator escape hatch)', () => {
      commands.setStatus(VAULT_ITEM_IDS.E, 'ready', { force: true });
      expect(vaultItems.getById(VAULT_ITEM_IDS.E)!.grooming_status).toBe('ready');
    });

    it('is a no-op when next === current', () => {
      const before = vaultItems.getById(VAULT_ITEM_IDS.E)!.grooming_status;
      activityPosts.length = 0;

      commands.setStatus(VAULT_ITEM_IDS.E, before);

      expect(activityPosts).toHaveLength(0);
      expect(lastErrorToast()).toBeUndefined();
    });

    it('auto-reassigns to the canonical owner on transition (classified → kipper)', () => {
      // ITEM_E starts ungroomed. Walk it forward to `classified` and confirm
      // the owner ends up as kipper (vault-decompose's actor).
      const id = VAULT_ITEM_IDS.E;
      commands.setStatus(id, 'intake_complete');
      commands.setStatus(id, 'classified');

      const after = vaultItems.getById(id)!;
      expect(after.grooming_status).toBe('classified');
      expect(after.assigned_to).toBe(wellKnownActorId('kipper'));

      // Audit trail: every transition emits both a status event and an assigned
      // event (when owner changes), so a reader of the activity log sees the
      // handoff explicitly.
      expect(activityPosts.map(e => e.type)).toContain('grooming_status_changed');
      expect(activityPosts.map(e => e.type)).toContain('assigned');
    });

    it('does not reassign on `ready` — keeps current owner for dispatch', () => {
      // Force directly to ready and check the owner is untouched.
      const id = VAULT_ITEM_IDS.E;
      const ownerBefore = vaultItems.getById(id)!.assigned_to;
      commands.setStatus(id, 'ready', { force: true });
      expect(vaultItems.getById(id)!.assigned_to).toBe(ownerBefore);
    });
  });

  // ── reconcileOwnership (one-shot sweep) ────────────────────────────────

  describe('reconcileOwnership', () => {
    it('reassigns active items whose owner mismatches the canonical mapping', () => {
      const before = vaultItems.items()
        .filter(i => !i.completed_at && !i.archived_at && i.grooming_status !== 'ready');

      const count = commands.reconcileOwnership();
      expect(count).toBeGreaterThan(0);

      // Every active non-ready item must now match its canonical owner.
      for (const item of before) {
        const after = vaultItems.getById(item.id)!;
        const canonical = OWNER_BY_GROOMING_STATE[after.grooming_status];
        if (canonical !== null) {
          expect(after.assigned_to).toBe(canonical);
        }
      }
    });

    it('skips completed and archived items', () => {
      // Pick a completed item from the fixture (if any), capture owner, sweep,
      // confirm unchanged.
      const completed = vaultItems.items().find(i => i.completed_at);
      const archived = vaultItems.items().find(i => i.archived_at);
      const completedOwnerBefore = completed?.assigned_to;
      const archivedOwnerBefore = archived?.assigned_to;

      commands.reconcileOwnership();

      if (completed) expect(vaultItems.getById(completed.id)!.assigned_to).toBe(completedOwnerBefore);
      if (archived) expect(vaultItems.getById(archived.id)!.assigned_to).toBe(archivedOwnerBefore);
    });
  });
});
