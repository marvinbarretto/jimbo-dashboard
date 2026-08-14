import { compareCardsForKanban, compareSortableBy, type SortableCard } from './sort';
import { buildVaultItem } from './vault-item.test-helpers';

describe('compareCardsForKanban', () => {
  describe('priority order (lower number = more urgent)', () => {
    it('P0 sorts before P1', () => {
      const p0 = buildVaultItem({ ai_priority: 0 });
      const p1 = buildVaultItem({ ai_priority: 1 });
      expect(compareCardsForKanban(p0, p1)).toBeLessThan(0);
    });

    it('P0 sorts before P3', () => {
      const p0 = buildVaultItem({ ai_priority: 0 });
      const p3 = buildVaultItem({ ai_priority: 3 });
      expect(compareCardsForKanban(p0, p3)).toBeLessThan(0);
    });

    it('orders a mixed list ascending by priority', () => {
      const p3 = buildVaultItem({ ai_priority: 3, title: 'P3' });
      const p1 = buildVaultItem({ ai_priority: 1, title: 'P1' });
      const p0 = buildVaultItem({ ai_priority: 0, title: 'P0' });
      const p2 = buildVaultItem({ ai_priority: 2, title: 'P2' });
      const sorted = [p3, p1, p0, p2].sort(compareCardsForKanban);
      expect(sorted.map(i => i.title)).toEqual(['P0', 'P1', 'P2', 'P3']);
    });
  });

  describe('manual_priority overrides ai_priority', () => {
    it('manual P0 wins over ai P3', () => {
      const manualP0 = buildVaultItem({ ai_priority: 3, manual_priority: 0 });
      const aiP1     = buildVaultItem({ ai_priority: 1, manual_priority: null });
      expect(compareCardsForKanban(manualP0, aiP1)).toBeLessThan(0);
    });

    it('manual P3 sinks below ai P0', () => {
      const manualP3 = buildVaultItem({ ai_priority: 0, manual_priority: 3 });
      const aiP1     = buildVaultItem({ ai_priority: 1, manual_priority: null });
      expect(compareCardsForKanban(manualP3, aiP1)).toBeGreaterThan(0);
    });
  });

  describe('null priority sinks to bottom', () => {
    it('null sorts after P3', () => {
      const noPrio = buildVaultItem({ ai_priority: null, manual_priority: null });
      const p3     = buildVaultItem({ ai_priority: 3 });
      expect(compareCardsForKanban(noPrio, p3)).toBeGreaterThan(0);
    });

    it('null sorts after P0', () => {
      const noPrio = buildVaultItem({ ai_priority: null, manual_priority: null });
      const p0     = buildVaultItem({ ai_priority: 0 });
      expect(compareCardsForKanban(noPrio, p0)).toBeGreaterThan(0);
    });

    it('two null-priority items tie on priority', () => {
      const a = buildVaultItem({ ai_priority: null, created_at: '2026-04-20T00:00:00Z' });
      const b = buildVaultItem({ ai_priority: null, created_at: '2026-04-25T00:00:00Z' });
      // ties broken by created_at asc — older first
      expect(compareCardsForKanban(a, b)).toBeLessThan(0);
    });
  });

  describe('tiebreak: created_at ascending (oldest first)', () => {
    it('older same-priority sorts before newer', () => {
      const older = buildVaultItem({ ai_priority: 1, created_at: '2026-04-01T00:00:00Z' });
      const newer = buildVaultItem({ ai_priority: 1, created_at: '2026-04-25T00:00:00Z' });
      expect(compareCardsForKanban(older, newer)).toBeLessThan(0);
    });

    // The regression this tiebreak exists to prevent: a bulk decomposition all
    // created on the same later date must not displace work already queued.
    it('a same-day burst does not displace older work in the same band', () => {
      const waiting = buildVaultItem({ ai_priority: 1, created_at: '2026-06-01T00:00:00Z', title: 'waiting' });
      const burst = [1, 2, 3].map(n =>
        buildVaultItem({ ai_priority: 1, created_at: '2026-08-08T00:00:0' + n + 'Z', title: 'burst-' + n }),
      );
      const sorted = [...burst, waiting].sort(compareCardsForKanban);
      expect(sorted[0].title).toBe('waiting');
    });

    it('identical priority + created_at falls through to seq ascending', () => {
      const a = buildVaultItem({ ai_priority: 2, created_at: '2026-04-25T00:00:00Z', seq: 10 });
      const b = buildVaultItem({ ai_priority: 2, created_at: '2026-04-25T00:00:00Z', seq: 20 });
      expect(compareCardsForKanban(a, b)).toBeLessThan(0);
    });
  });

  describe('sort is stable across full kanban policy', () => {
    it('produces P0 → P3 → null, oldest-first within each bucket', () => {
      const items = [
        buildVaultItem({ ai_priority: 2, created_at: '2026-04-10T00:00:00Z', title: 'P2-old' }),
        buildVaultItem({ ai_priority: null, created_at: '2026-04-25T00:00:00Z', title: 'null-new' }),
        buildVaultItem({ ai_priority: 0, created_at: '2026-04-15T00:00:00Z', title: 'P0' }),
        buildVaultItem({ ai_priority: 2, created_at: '2026-04-25T00:00:00Z', title: 'P2-new' }),
        buildVaultItem({ ai_priority: 3, created_at: '2026-04-20T00:00:00Z', title: 'P3' }),
      ];
      expect(items.sort(compareCardsForKanban).map(i => i.title)).toEqual([
        'P0',
        'P2-old',
        'P2-new',
        'P3',
        'null-new',
      ]);
    });
  });
});

// compareSortableBy is the structural comparator both kanban boards share. The
// execution board's cards are a union of vault items and commissions, so they
// can only satisfy SortableCard — these cases pin the behaviour it relies on.
describe('compareSortableBy', () => {
  const card = (over: Partial<SortableCard> = {}): SortableCard => ({
    priority: 1, createdAt: '2026-05-01T00:00:00Z', seq: 1, ...over,
  });

  describe('priority mode', () => {
    const cmp = compareSortableBy('priority');

    it('orders by priority ascending', () => {
      expect(cmp(card({ priority: 0 }), card({ priority: 2 }))).toBeLessThan(0);
    });

    it('sinks unset priority below every band', () => {
      expect(cmp(card({ priority: null }), card({ priority: 3 }))).toBeGreaterThan(0);
    });

    it('breaks ties oldest-first so a recent burst cannot jump the queue', () => {
      const waiting = card({ createdAt: '2026-06-01T00:00:00Z', seq: 1 });
      const burst   = card({ createdAt: '2026-08-08T00:00:00Z', seq: 900 });
      expect(cmp(waiting, burst)).toBeLessThan(0);
    });

    it('falls through to seq when priority and createdAt are identical', () => {
      expect(cmp(card({ seq: 5 }), card({ seq: 9 }))).toBeLessThan(0);
    });
  });

  it('newest mode puts the most recent first', () => {
    const cmp = compareSortableBy('newest');
    const old = card({ createdAt: '2026-01-01T00:00:00Z' });
    const recent = card({ createdAt: '2026-08-01T00:00:00Z' });
    expect(cmp(recent, old)).toBeLessThan(0);
  });

  it('oldest mode puts the earliest first, ignoring priority', () => {
    const cmp = compareSortableBy('oldest');
    const oldLowPriority = card({ createdAt: '2026-01-01T00:00:00Z', priority: 3 });
    const recentUrgent   = card({ createdAt: '2026-08-01T00:00:00Z', priority: 0 });
    expect(cmp(oldLowPriority, recentUrgent)).toBeLessThan(0);
  });

  it('stale mode surfaces the least recently touched, falling back to createdAt', () => {
    const cmp = compareSortableBy('stale');
    const touched  = card({ latestActivityAt: '2026-08-01T00:00:00Z' });
    const untouched = card({ latestActivityAt: null, createdAt: '2026-01-01T00:00:00Z' });
    expect(cmp(untouched, touched)).toBeLessThan(0);
  });

  it('stuck mode puts the longest-stuck first and treats absent as zero', () => {
    const cmp = compareSortableBy('stuck');
    expect(cmp(card({ daysInColumn: 40 }), card({ daysInColumn: 2 }))).toBeLessThan(0);
    expect(cmp(card({ daysInColumn: null }), card({ daysInColumn: 5 }))).toBeGreaterThan(0);
  });
});
