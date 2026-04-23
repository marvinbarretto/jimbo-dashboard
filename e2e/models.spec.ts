import { test, expect } from './fixtures';

test.describe('Models CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/models');
  });

  test('list renders with models', async ({ modelsListPage }) => {
    await expect(modelsListPage.heading).toHaveText('Models');
    await expect(modelsListPage.rows).not.toHaveCount(0);
  });

  test('navigates to detail on row link click', async ({ page, modelsListPage, modelDetailPage }) => {
    await modelsListPage.clickFirstModel();
    await expect(modelDetailPage.heading).toBeVisible();
    await expect(page).not.toHaveURL('/models');
  });

  test('Add model navigates to create form', async ({ page, modelsListPage, modelFormPage }) => {
    await modelsListPage.clickAddModel();
    await expect(page).toHaveURL('/models/new');
    await expect(modelFormPage.heading).toHaveText('Add model');
  });

  test('creates a new model — born, immediately put to work', async ({ page, modelFormPage, modelDetailPage }) => {
    await page.goto('/models/new');
    await modelFormPage.fill({ id: 'test/delete-me-7b', displayName: 'Delete Me 7B', provider: 'meta', tier: 'free' });
    await modelFormPage.submit();
    await expect(modelDetailPage.heading).toContainText('Delete Me 7B');
  });

  test('edits an existing model', async ({ page, modelFormPage, modelDetailPage }) => {
    await page.goto('/models/openai/gpt-5-nano/edit');
    await modelFormPage.fillNotes('Updated notes.');
    await modelFormPage.submit();
    await expect(modelDetailPage.findDefinition('Updated notes.')).toBeVisible();
  });

  test('back link on detail returns to list', async ({ page, modelsListPage, modelDetailPage }) => {
    await modelsListPage.clickFirstModel();
    await modelDetailPage.clickBack();
    await expect(page).toHaveURL('/models');
  });

  test('inactive models have inactive row class', async ({ modelsListPage }) => {
    await expect(modelsListPage.inactiveRows).not.toHaveCount(0);
  });
});
