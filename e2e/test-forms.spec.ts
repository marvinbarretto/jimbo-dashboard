/**
 * Diagnostic spec — not part of the production suite.
 * Determines which Playwright interaction method reliably updates Angular
 * signal forms vs ReactiveFormsModule in a zoneless app.
 */
import { test, expect } from '@playwright/test';

test.describe('Form interaction diagnostics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-forms');
  });

  // ── ReactiveFormsModule ─────────────────────────────────────────────────

  test('reactive: page.fill updates form and submits', async ({ page }) => {
    await page.fill('[data-testid="reactive-id"]', 'test-id');
    await page.fill('[data-testid="reactive-name"]', 'Test Name');
    await page.click('[data-testid="reactive-submit"]');
    await expect(page.locator('[data-testid="reactive-result"]')).toContainText('test-id');
  });

  // ── Signal forms ────────────────────────────────────────────────────────
  // These tests are expected to fail. Playwright's synthetic DOM events (fill,
  // pressSequentially) do not trigger Angular's FormField signal listeners in a
  // zoneless app — change detection never runs, so the signal value stays empty
  // at submit time. Kept here as living documentation; revisit when Angular
  // adds Playwright-compatible signal form support.

  test('signal: page.fill updates signal form and submits', async ({ page }) => {
    test.fail(true, 'Synthetic fill events do not update signal forms in zoneless Angular');
    await page.fill('[data-testid="signal-id"]', 'test-id');
    await page.fill('[data-testid="signal-name"]', 'Test Name');
    await page.click('[data-testid="signal-submit"]');
    await expect(page.locator('[data-testid="signal-result"]')).toContainText('test-id');
  });

  test('signal: pressSequentially updates signal form and submits', async ({ page }) => {
    test.fail(true, 'pressSequentially also fails to update signal forms in zoneless Angular');
    await page.locator('[data-testid="signal-id"]').pressSequentially('seq-id');
    await page.locator('[data-testid="signal-name"]').pressSequentially('Seq Name');
    await page.click('[data-testid="signal-submit"]');
    await expect(page.locator('[data-testid="signal-result"]')).toContainText('seq-id');
  });

  test('signal: fill + microtask flush before submit', async ({ page }) => {
    test.fail(true, 'Microtask flush between fill and submit does not help — signal still empty');
    await page.fill('[data-testid="signal-id"]', 'flush-id');
    await page.fill('[data-testid="signal-name"]', 'Flush Name');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
    await page.click('[data-testid="signal-submit"]');
    await expect(page.locator('[data-testid="signal-result"]')).toContainText('flush-id');
  });

  test('signal: what does signalModel contain at submit time?', async ({ page }) => {
    test.fail(true, 'Signal model is empty at submit — confirms fill events are not wired to signal forms');
    await page.fill('[data-testid="signal-id"]', 'inspect-id');
    await page.fill('[data-testid="signal-name"]', 'Inspect Name');
    const signalValue = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="signal-form"]');
      const ctx = (el as any)?.__ngContext__;
      return ctx ? JSON.stringify(ctx) : 'no context found';
    });
    console.log('Angular context snapshot:', signalValue.substring(0, 200));
    await page.click('[data-testid="signal-submit"]');
    // { timeout: 1000 } so test.fail() catches an assertion error, not a 30s test-level timeout.
    await expect(page.locator('[data-testid="signal-result"]')).toContainText('inspect-id', { timeout: 1000 });
  });
});
