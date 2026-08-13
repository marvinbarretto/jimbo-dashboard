import type { Page, Locator } from '@playwright/test';

// Page object for the phone shell's Home tab (/m/today — the path is a
// cross-repo contract with jimbo-app, the label is not).
//
// Selector convention:
//   - Slots: `[data-testid="..."]` set on each component host, so a CSS
//     refactor can't silently drop a slot from the page.
//   - Tiles: `[data-tile="<id>"]` — the id from SHORTCUT_TILES, which is
//     frozen by a unit test, so it's a stable handle.
//   - Usual cells: `[data-usual="<key>"]` — the quantity-stripped key.
//   - Everything else by role, which doubles as an a11y regression test.
//
// Deliberately read-only. The dev proxy points at production
// (see proxy.conf.js), so tapping a quick-log cell here would write a real
// food entry, pollute /frequent, and skew the daypart ranking these tests
// are meant to protect. Write-path coverage lives in the unit tests for
// createUsualLogger instead.
export class MobileHomePage {
  readonly glanceBar: Locator;
  readonly launcher: Locator;
  readonly quickLog: Locator;
  readonly tabBar: Locator;

  constructor(private readonly page: Page) {
    this.glanceBar = page.locator('[data-testid="mobile-glance-bar"]');
    this.launcher = page.locator('[data-testid="mobile-shortcut-launcher"]');
    this.quickLog = page.locator('[data-testid="usual-grid"]');
    this.tabBar = page.getByRole('navigation', { name: 'Sections' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/m/today');
    await this.glanceBar.waitFor();
  }

  tile(id: string): Locator {
    return this.launcher.locator(`[data-tile="${id}"]`);
  }

  /** Every logging cell in the grid — excludes the trailing "more" link. */
  usualCells(): Locator {
    return this.quickLog.locator('[data-usual]');
  }

  /**
   * The NOW slot, in whichever of its four states the clock and the data put
   * it. Matched as a union rather than pinned to one card because the choice
   * is genuinely time- and state-dependent — what's testable from outside is
   * that the slot always holds exactly one thing.
   */
  nowCard(): Locator {
    return this.page.locator(
      [
        '[data-testid="mobile-focus-card"]',
        '[data-testid="mobile-close-day-card"]',
        '[data-testid="mobile-shape-card"]',
        '[data-testid="mobile-now-idle"]',
      ].join(', '),
    );
  }

  /** The strip's spoken form; the visible row is aria-hidden shorthand. */
  glanceSummary(): Locator {
    return this.glanceBar.locator('p');
  }
}
