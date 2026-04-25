import { compareCardsForKanban } from './sort';
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
      // ties broken by created_at desc — newer first
      expect(compareCardsForKanban(a, b)).toBeGreaterThan(0);
    });
  });

  describe('tiebreak: created_at descending (newest first)', () => {
    it('newer same-priority sorts before older', () => {
      const older = buildVaultItem({ ai_priority: 1, created_at: '2026-04-01T00:00:00Z' });
      const newer = buildVaultItem({ ai_priority: 1, created_at: '2026-04-25T00:00:00Z' });
      expect(compareCardsForKanban(newer, older)).toBeLessThan(0);
    });

    it('identical priority + created_at compares to 0', () => {
      const a = buildVaultItem({ ai_priority: 2, created_at: '2026-04-25T00:00:00Z' });
      const b = buildVaultItem({ ai_priority: 2, created_at: '2026-04-25T00:00:00Z' });
      expect(compareCardsForKanban(a, b)).toBe(0);
    });
  });

  describe('sort is stable across full kanban policy', () => {
    it('produces P0 → P3 → null, newest-first within each bucket', () => {
      const items = [
        buildVaultItem({ ai_priority: 2, created_at: '2026-04-10T00:00:00Z', title: 'P2-old' }),
        buildVaultItem({ ai_priority: null, created_at: '2026-04-25T00:00:00Z', title: 'null-new' }),
        buildVaultItem({ ai_priority: 0, created_at: '2026-04-15T00:00:00Z', title: 'P0' }),
        buildVaultItem({ ai_priority: 2, created_at: '2026-04-25T00:00:00Z', title: 'P2-new' }),
        buildVaultItem({ ai_priority: 3, created_at: '2026-04-20T00:00:00Z', title: 'P3' }),
      ];
      expect(items.sort(compareCardsForKanban).map(i => i.title)).toEqual([
        'P0',
        'P2-new',
        'P2-old',
        'P3',
        'null-new',
      ]);
    });
  });
});
