import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

// Page object for the grooming kanban board.
//
// Conventions:
//   - Cards are addressed by their visible `#{seq}` handle — that's what the operator
//     types in conversation, so tests read like operator language.
//   - Columns are addressed by label string (the same as GROOMING_STATUS_LABELS).
//   - Filter chips are addressed by group label + chip label so tests don't need to
//     know the underlying value (e.g. "P0" not the integer 0).
//
// The board is exercised exclusively in seed mode (`?seed=1`) — no API mocking needed,
// services short-circuit to SEED fixtures. Browser clock is fixed by callers via
// `page.clock.install({ time })` before `goto()`.
export class GroomingBoardPage {
  readonly heading: Locator;
  readonly columns: Locator;
  readonly cards:   Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1');
    this.columns = page.locator('section.col');
    this.cards   = page.locator('app-grooming-card');
  }

  async goto(): Promise<void> {
    await this.page.goto('/grooming?seed=1');
    await expect(this.heading).toBeVisible();
  }

  // --- columns ----------------------------------------------------------

  columnForLabel(label: string): Locator {
    return this.page.locator('section.col', {
      has: this.page.locator(`.col__label:text-is("${label}")`),
    });
  }

  cardsInColumn(label: string): Locator {
    return this.columnForLabel(label).locator('app-grooming-card');
  }

  async columnCount(label: string): Promise<number> {
    return await this.cardsInColumn(label).count();
  }

  // --- cards ------------------------------------------------------------

  cardForSeq(seq: number): Locator {
    // Use exact `#{seq}` match on the seq link so #100 doesn't collide with #1000.
    return this.page.locator('app-grooming-card', {
      has: this.page.locator(`a.card__seq:text-is("#${seq}")`),
    });
  }

  // Assert that a card is in the given column. Reads better than two-step lookups.
  async expectCardInColumn(seq: number, columnLabel: string): Promise<void> {
    await expect(this.cardsInColumn(columnLabel).filter({ has: this.page.locator(`a.card__seq:text-is("#${seq}")`) })).toHaveCount(1);
  }

  async expectCardAbsent(seq: number): Promise<void> {
    await expect(this.cardForSeq(seq)).toHaveCount(0);
  }

  async expectCardPresent(seq: number): Promise<void> {
    await expect(this.cardForSeq(seq)).toHaveCount(1);
  }

  // Card's --stale-norm CSS variable, useful for asserting the staleness gradient
  // is wired without depending on rendered colour. Returns 0 when unset.
  async staleNormFor(seq: number): Promise<number> {
    const handle = await this.cardForSeq(seq).elementHandle();
    if (!handle) return 0;
    return await handle.evaluate(el =>
      parseFloat((el as HTMLElement).style.getPropertyValue('--stale-norm') || '0'),
    );
  }

  // --- filters ----------------------------------------------------------

  filterGroup(groupLabel: string): Locator {
    return this.page.locator('.filters__group', {
      has: this.page.locator(`.filters__label:text-is("${groupLabel}")`),
    });
  }

  filterChip(groupLabel: string, chipLabel: string): Locator {
    // Chips render as `<button class="chip">label<span class="chip__count">N</span></button>`
    // — so match the chip whose accessible name *starts* with the label.
    return this.filterGroup(groupLabel)
      .locator('app-chip button')
      .filter({ hasText: chipLabel });
  }

  async toggleFilter(groupLabel: string, chipLabel: string): Promise<void> {
    await this.filterChip(groupLabel, chipLabel).click();
  }

  resetFiltersBtn(): Locator {
    return this.page.locator('button.filters__reset');
  }

  async resetFilters(): Promise<void> {
    if (await this.resetFiltersBtn().count() > 0) {
      await this.resetFiltersBtn().click();
    }
  }
}
