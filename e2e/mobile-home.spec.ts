import { test, expect } from '@playwright/test';
import { MobileHomePage } from './pages/mobile-home.page';

// Home tab structure and navigation. Read-only by design — see the page
// object's note on why nothing here taps a quick-log cell.
test.describe('phone home', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('lays out all four slots, in order', async ({ page }) => {
    const home = new MobileHomePage(page);
    await home.goto();

    // The order is the design: glance to read, launcher to leave, grid in the
    // thumb zone to log. If a slot goes missing the screen still renders, so
    // assert presence rather than trusting a screenshot.
    await expect(home.glanceBar).toBeVisible();
    await expect(home.launcher).toBeVisible();
    await expect(home.quickLog).toBeVisible();
    await expect(page.getByRole('region', { name: /mood and energy/i })).toBeVisible();
  });

  test('offers eight launcher tiles that only ever navigate', async ({ page }) => {
    const home = new MobileHomePage(page);
    await home.goto();

    const tiles = home.launcher.getByRole('link');
    await expect(tiles).toHaveCount(8);

    // Anchors, not buttons: "go somewhere" must be structurally incapable of
    // writing data the way the grid below it does.
    await expect(home.tile('fleet')).toHaveAttribute('href', '/review');
    await expect(home.tile('scan')).toHaveAttribute('href', '/nutrition/scan');
    await expect(home.tile('close-day')).toHaveAttribute('href', '/evening');
  });

  test('takes a tile tap through to its destination', async ({ page }) => {
    const home = new MobileHomePage(page);
    await home.goto();

    await home.tile('replay').click();
    await expect(page).toHaveURL(/\/journal\//);
  });

  test('speaks the glance strip as a sentence rather than shorthand', async ({ page }) => {
    const home = new MobileHomePage(page);
    await home.goto();

    // "129 kcal · nothing next" is unreadable aloud; the row is aria-hidden
    // and this paragraph carries the meaning.
    await expect(home.glanceSummary()).toContainText(/\d{1,2} \w+\./);
    await expect(home.glanceBar.locator('[aria-hidden="true"]')).toBeVisible();
  });

  test('keeps the tab bar on Home without renaming the shared path', async ({ page }) => {
    const home = new MobileHomePage(page);
    await home.goto();

    // The label changed to Home; the path stays /m/today because jimbo-app
    // deep-links it.
    await expect(home.tabBar.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/m/today',
    );
  });
});
