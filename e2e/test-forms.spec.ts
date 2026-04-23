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

  test('signal: page.fill updates signal form and submits', async ({ page }) => {
    await page.fill('[data-testid="signal-id"]', 'test-id');
    await page.fill('[data-testid="signal-name"]', 'Test Name');
    await page.click('[data-testid="signal-submit"]');
    await expect(page.locator('[data-testid="signal-result"]')).toContainText('test-id');
  });

  test('signal: pressSequentially updates signal form and submits', async ({ page }) => {
    await page.locator('[data-testid="signal-id"]').pressSequentially('seq-id');
    await page.locator('[data-testid="signal-name"]').pressSequentially('Seq Name');
    await page.click('[data-testid="signal-submit"]');
    await expect(page.locator('[data-testid="signal-result"]')).toContainText('seq-id');
  });

  test('signal: fill + microtask flush before submit', async ({ page }) => {
    await page.fill('[data-testid="signal-id"]', 'flush-id');
    await page.fill('[data-testid="signal-name"]', 'Flush Name');
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
    await page.click('[data-testid="signal-submit"]');
    await expect(page.locator('[data-testid="signal-result"]')).toContainText('flush-id');
  });

  test('signal: what does signalModel contain at submit time?', async ({ page }) => {
    await page.fill('[data-testid="signal-id"]', 'inspect-id');
    await page.fill('[data-testid="signal-name"]', 'Inspect Name');
    // Expose the signal value via page.evaluate before clicking submit
    const signalValue = await page.evaluate(() => {
      // Try to access Angular component internals via __ngContext__
      const el = document.querySelector('[data-testid="signal-form"]');
      const ctx = (el as any)?.__ngContext__;
      return ctx ? JSON.stringify(ctx) : 'no context found';
    });
    console.log('Angular context snapshot:', signalValue.substring(0, 200));
    await page.click('[data-testid="signal-submit"]');
    // Just observe — pass regardless so we see output in the report
    const result = await page.locator('[data-testid="signal-result"]').textContent().catch(() => 'no result');
    console.log('Signal result after submit:', result);
  });
});
