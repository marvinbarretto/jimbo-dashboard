import { test, expect } from './fixtures';

// All scenarios depend on the frozen browser clock (FROZEN_NOW = 2026-04-25)
// so seed-mode staleness gradients are reproducible across runs.
test.describe('Grooming board (seed mode)', () => {
  test.beforeEach(async ({ frozenClock, groomingBoardPage }) => {
    void frozenClock;
    await groomingBoardPage.goto();
  });

  test.describe('layout', () => {
    test('renders all six grooming columns in canonical order', async ({ groomingBoardPage, page }) => {
      const labels = await page.locator('.col__label').allTextContents();
      expect(labels).toEqual([
        'Ungroomed',
        'Intake rejected',
        'Intake complete',
        'Classified',
        'Decomposed',
        'Ready',
      ]);
      await expect(groomingBoardPage.heading).toHaveText('Grooming pipeline');
    });

    test('renders cards for non-archived task items', async ({ groomingBoardPage }) => {
      // Total board cards > 0; exact count depends on filtering rules but never empty in seed mode.
      const total = await groomingBoardPage.cards.count();
      expect(total).toBeGreaterThan(5);
    });
  });

  test.describe('column membership', () => {
    // These seqs are the canonical fixture handles — see src/app/domain/vault/fixtures.ts.
    test('A (#2401) sits in Intake rejected', async ({ groomingBoardPage }) => {
      await groomingBoardPage.expectCardInColumn(2401, 'Intake rejected');
    });

    test('B (#2402) sits in Ready', async ({ groomingBoardPage }) => {
      await groomingBoardPage.expectCardInColumn(2402, 'Ready');
    });

    test('Q (#2417 — production incident) sits in Classified', async ({ groomingBoardPage }) => {
      await groomingBoardPage.expectCardInColumn(2417, 'Classified');
    });
  });

  test.describe('epic exclusion', () => {
    // Items with children are containers, not dispatchable work — they're filtered
    // out of the board entirely. The child still appears.
    test('epic G (#2407) is hidden — it has children', async ({ groomingBoardPage }) => {
      await groomingBoardPage.expectCardAbsent(2407);
    });

    test("epic G's child U (#2421) is visible in Decomposed", async ({ groomingBoardPage }) => {
      await groomingBoardPage.expectCardInColumn(2421, 'Decomposed');
    });
  });

  test.describe('archived / non-task filtering', () => {
    test('archived item Y (#2425) does not appear', async ({ groomingBoardPage }) => {
      await groomingBoardPage.expectCardAbsent(2425);
    });

    test('bookmark AA (#2427) does not appear (type !== task)', async ({ groomingBoardPage }) => {
      await groomingBoardPage.expectCardAbsent(2427);
    });
  });

  test.describe('priority filter', () => {
    test('toggling P0 narrows the board to only P0 items', async ({ groomingBoardPage }) => {
      await groomingBoardPage.toggleFilter('Priority', 'P0');
      // #2417 (Q) is the only P0 in the seeded fixtures
      await groomingBoardPage.expectCardPresent(2417);
      // P2 items disappear
      await groomingBoardPage.expectCardAbsent(2402);
      await groomingBoardPage.expectCardAbsent(2422);
    });

    test('reset filters clears the active selection', async ({ groomingBoardPage }) => {
      await groomingBoardPage.toggleFilter('Priority', 'P0');
      await expect(groomingBoardPage.resetFiltersBtn()).toBeVisible();
      await groomingBoardPage.resetFilters();
      await expect(groomingBoardPage.resetFiltersBtn()).toHaveCount(0);
      // Items return after reset
      await groomingBoardPage.expectCardPresent(2402);
    });
  });

  test.describe('owner filter', () => {
    test('toggling @marvin shows only marvin-assigned cards', async ({ groomingBoardPage }) => {
      await groomingBoardPage.toggleFilter('Owner', '@marvin');
      // T (#2420) is assigned to marvin in fixtures
      await groomingBoardPage.expectCardPresent(2420);
      // C (#2403) is assigned to ralph
      await groomingBoardPage.expectCardAbsent(2403);
    });

    test('toggling unassigned shows only items with no owner', async ({ groomingBoardPage }) => {
      await groomingBoardPage.toggleFilter('Owner', 'unassigned');
      // A (#2401) has assigned_to: null in fixtures
      await groomingBoardPage.expectCardPresent(2401);
      // Q (#2417) is assigned to boris
      await groomingBoardPage.expectCardAbsent(2417);
    });
  });

  test.describe('staleness gradient is wired to host', () => {
    test('a recent card has a low --stale-norm', async ({ groomingBoardPage }) => {
      // E (#2405) is created at 09:14Z on 2026-04-25; frozen clock is 12:00Z.
      // That's ~3 hours old → sqrt(0.125 / STALE_DAYS) ≈ 0.13. Small but non-zero.
      const norm = await groomingBoardPage.staleNormFor(2405);
      expect(norm).toBeLessThan(0.2);
    });

    test('an old card saturates --stale-norm', async ({ groomingBoardPage }) => {
      // AC (#2429) is 30 days old — well past STALE_DAYS, so the ratio caps at 1.
      const norm = await groomingBoardPage.staleNormFor(2429);
      expect(norm).toBe(1);
    });

    test('staleness is monotonic across the fixture age range', async ({ groomingBoardPage }) => {
      // Recent (E #2405, 3h) < mid (M #2413, 9d) < ancient (AC #2429, 30d).
      const recent  = await groomingBoardPage.staleNormFor(2405);
      const ancient = await groomingBoardPage.staleNormFor(2429);
      expect(recent).toBeLessThan(ancient);
    });
  });
});
