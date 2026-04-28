import { lifecycleState, isActive, isDone, isArchived, GROOMING_STATUS_ORDER, GROOMING_STATUS_LABELS } from './vault-item';
import { buildVaultItem, buildArchived, buildDone } from './vault-item.test-helpers';

describe('lifecycleState', () => {
  it('returns "active" when both completed_at and archived_at are null', () => {
    const item = buildVaultItem({ completed_at: null, archived_at: null });
    expect(lifecycleState(item)).toBe('active');
  });

  it('returns "done" when only completed_at is set', () => {
    const item = buildDone();
    expect(lifecycleState(item)).toBe('done');
  });

  it('returns "archived" when archived_at is set, regardless of completion', () => {
    const archivedOnly = buildArchived();
    const completedAndArchived = buildVaultItem({
      completed_at: '2026-04-20T00:00:00Z',
      archived_at:  '2026-04-21T00:00:00Z',
    });
    expect(lifecycleState(archivedOnly)).toBe('archived');
    expect(lifecycleState(completedAndArchived)).toBe('archived');
  });
});

describe('isActive / isDone / isArchived', () => {
  it('exactly one predicate is true for any state', () => {
    const cases = [
      buildVaultItem(),                       // active
      buildDone(),                            // done
      buildArchived(),                        // archived
      buildVaultItem({                        // archived AND completed (still archived)
        completed_at: '2026-04-20T00:00:00Z',
        archived_at:  '2026-04-21T00:00:00Z',
      }),
    ];

    for (const item of cases) {
      const flags = [isActive(item), isDone(item), isArchived(item)];
      const trueCount = flags.filter(Boolean).length;
      // Note: isArchived can overlap with isDone *only* if you check both directly
      // when archived_at AND completed_at are set — but lifecycleState resolves to 'archived'
      // first. The predicates use lifecycleState as their source of truth, except isArchived
      // which is timestamp-only. So when both are set: isArchived=true, isDone=false.
      expect(trueCount).toBe(1);
    }
  });
});

describe('GROOMING_STATUS_ORDER', () => {
  it('starts with needs_rework and ends with ready', () => {
    expect(GROOMING_STATUS_ORDER[0]).toBe('needs_rework');
    expect(GROOMING_STATUS_ORDER[GROOMING_STATUS_ORDER.length - 1]).toBe('ready');
  });

  it('has a label for every status', () => {
    for (const status of GROOMING_STATUS_ORDER) {
      expect(GROOMING_STATUS_LABELS[status]).toBeDefined();
      expect(GROOMING_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate statuses', () => {
    expect(new Set(GROOMING_STATUS_ORDER).size).toBe(GROOMING_STATUS_ORDER.length);
  });
});
