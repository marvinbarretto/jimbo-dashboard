import { test, expect } from './fixtures';

test.describe('grooming: reject-with-reason flow', () => {
  test.beforeEach(async ({ groomingBoardPage }) => {
    await groomingBoardPage.goto();
  });

  test('operator rejects a decomposed item; it lands in needs_rework with reason on card', async ({ page, groomingBoardPage }) => {
    // U (#2421) is the canonical decomposed fixture — child of epic G, assigned to jimbo.
    const card = groomingBoardPage.cardForSeq(2421);
    await card.locator('a.card__title').click();

    // Modal opens (detail panel). Wait for the header to render.
    await expect(page.locator('.modal-header__zone1')).toBeVisible();

    // Reject button is visible for decomposed items.
    await page.getByRole('button', { name: /^reject$/i }).click();

    // Fill the reject form.
    await page.getByPlaceholder(/what's wrong/i).fill('AC too verbose — please rewrite to ≤ 120 chars each');
    // Select jimbo as the reassigned owner.
    await page.locator('.reject-form__select').selectOption({ value: 'jimbo' });
    await page.getByRole('button', { name: /reject and reassign/i }).click();

    // Modal closes; item now appears in Needs rework column.
    await expect(groomingBoardPage.cardsInColumn('Needs rework').filter({
      has: page.locator('a.card__seq:text-is("#2421")'),
    })).toHaveCount(1);

    // Card shows the rework badge with the reason snippet and reassigned owner.
    const reworkCard = groomingBoardPage.cardForSeq(2421);
    await expect(reworkCard).toContainText(/AC too verbose/);
    await expect(reworkCard).toContainText(/jimbo/);
  });

  test('reject button is hidden when item is ungroomed', async ({ page, groomingBoardPage }) => {
    // A (#2401) is intake_rejected — not ideal for "ungroomed" but canReject() hides
    // reject for 'ungroomed'. Use an ungroomed fixture instead: B is ready, so look
    // for one in the Ungroomed column and open its detail.
    const ungroomedCol = groomingBoardPage.columnForLabel('Ungroomed');
    const firstUngroomedCard = ungroomedCol.locator('app-grooming-card').first();
    await firstUngroomedCard.locator('a.card__title').click();

    await expect(page.locator('.modal-header__zone1')).toBeVisible();
    await expect(page.getByRole('button', { name: /^reject$/i })).toHaveCount(0);
  });
});
