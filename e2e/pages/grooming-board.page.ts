import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

// Page object for the grooming kanban board.
//
// Selector convention:
//   - Cards: `[data-testid="vault-card"][data-seq="N"]` — set on the
//     <app-vault-card> host. The seq is the operator-facing handle.
//   - Columns: `[data-testid="kanban-column"][data-status="X"]` — set on
//     the .board__col-wrap element. Status is a GroomingStatus value
//     (e.g. 'decomposed'), not the human label, so it stays stable if
//     the visible label is reworded.
//   - Buttons: `getByRole('button', { name: /label/i })` — semantic
//     selector that doubles as an accessibility regression test.
//
// Why testids and not class names: class names drift during CSS refactors
// and tests fail silently. Testids are documented as the test contract;
// renaming them is a deliberate test-touching change. See
// docs/conventions.md §"E2E selectors via data-testid".
//
// The board is exercised exclusively in seed mode (`?seed=1`) — no API
// mocking needed; services short-circuit to SEED fixtures. Browser clock
// is fixed by callers via `page.clock.install({ time })` before `goto()`.

// Re-export of the GroomingStatus union for caller ergonomics — tests
// that reference columns can use the typed value rather than a magic
// string. Mirrors `@domain/vault`'s GROOMING_STATUS_ORDER.
export type GroomingColumnStatus =
  | 'needs_rework'
  | 'ungroomed'
  | 'intake_rejected'
  | 'intake_complete'
  | 'classified'
  | 'decomposed'
  | 'ready';

export class GroomingBoardPage {
  readonly heading: Locator;
  readonly columns: Locator;
  readonly cards:   Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1');
    this.columns = page.locator('[data-testid="kanban-column"]');
    this.cards   = page.locator('[data-testid="vault-card"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/grooming?seed=1');
    await expect(this.heading).toBeVisible();
  }

  // --- columns ----------------------------------------------------------

  /** Locate a column by its GroomingStatus value (stable identifier). */
  columnForStatus(status: GroomingColumnStatus): Locator {
    return this.page.locator(`[data-testid="kanban-column"][data-status="${status}"]`);
  }

  /** Cards inside a column, scoped via testid for stability. */
  cardsInColumn(status: GroomingColumnStatus): Locator {
    return this.columnForStatus(status).locator('[data-testid="vault-card"]');
  }

  async columnCount(status: GroomingColumnStatus): Promise<number> {
    return await this.cardsInColumn(status).count();
  }

  // --- cards ------------------------------------------------------------

  /** Locate a card by its operator-facing seq (set as data-seq on the host). */
  cardForSeq(seq: number): Locator {
    return this.page.locator(`[data-testid="vault-card"][data-seq="${seq}"]`);
  }

  /**
   * Assert a card is rendered in the given column (by GroomingStatus).
   * Uses a combined CSS selector for the card rather than `.filter({ has })`
   * because the data-seq attribute is on the SAME element as data-testid;
   * Playwright's `has` matches descendants reliably but self-matches are
   * sometimes inconsistent across versions.
   */
  async expectCardInColumn(seq: number, status: GroomingColumnStatus): Promise<void> {
    await expect(
      this.columnForStatus(status).locator(`[data-testid="vault-card"][data-seq="${seq}"]`),
    ).toHaveCount(1);
  }

  async expectCardAbsent(seq: number): Promise<void> {
    await expect(this.cardForSeq(seq)).toHaveCount(0);
  }

  async expectCardPresent(seq: number): Promise<void> {
    await expect(this.cardForSeq(seq)).toHaveCount(1);
  }

  // Card's --stale-norm CSS variable, useful for asserting the staleness
  // gradient is wired without depending on rendered colour. Returns 0 when unset.
  async staleNormFor(seq: number): Promise<number> {
    const handle = await this.cardForSeq(seq).elementHandle();
    if (!handle) return 0;
    return await handle.evaluate(el =>
      parseFloat((el as HTMLElement).style.getPropertyValue('--stale-norm') || '0'),
    );
  }

  // --- filters ----------------------------------------------------------
  //
  // Filter groups are addressed by their stable id ('project', 'owner',
  // 'priority', 'skill', 'executor') — these come from the board's filter
  // composable and don't change when the visible label is reworded.
  //
  // Chips are addressed by their value attribute. For owner the value is
  // the actor id (e.g. 'marvin'). For priority it's the integer (e.g. '0').
  // Test code passes the same primitive the filter state stores.

  filterGroup(groupId: string): Locator {
    return this.page.locator(`[data-testid="filter-group"][data-group="${groupId}"]`);
  }

  filterChip(groupId: string, value: string | number): Locator {
    return this.filterGroup(groupId).locator(`[data-testid="filter-chip"][data-value="${value}"]`);
  }

  async toggleFilter(groupId: string, value: string | number): Promise<void> {
    await this.filterChip(groupId, value).click();
  }

  resetFiltersBtn(): Locator {
    return this.page.getByRole('button', { name: /reset filters/i });
  }

  async resetFilters(): Promise<void> {
    if (await this.resetFiltersBtn().count() > 0) {
      await this.resetFiltersBtn().click();
    }
  }
}
