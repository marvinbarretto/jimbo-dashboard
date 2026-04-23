import { test, expect } from './fixtures';

test.describe('Model Stacks CRUD', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    void apiMock;
    await page.goto('/model-stacks');
  });

  test('list renders with stacks', async ({ modelStacksListPage }) => {
    await expect(modelStacksListPage.heading).toHaveText('Model Stacks');
    await expect(modelStacksListPage.rows).not.toHaveCount(0);
  });

  test('navigates to detail on row link click', async ({ page, modelStacksListPage, modelStackDetailPage }) => {
    await modelStacksListPage.clickFirstStack();
    await expect(modelStackDetailPage.heading).toBeVisible();
    await expect(page).not.toHaveURL('/model-stacks');
  });

  test('Add stack navigates to create form', async ({ page, modelStacksListPage, modelStackFormPage }) => {
    await modelStacksListPage.clickAddStack();
    await expect(page).toHaveURL('/model-stacks/new');
    await expect(modelStackFormPage.heading).toHaveText('Add stack');
  });

  test('creates a new stack — budget cuts, meet your new overlord', async ({ page, modelStackFormPage, modelStackDetailPage }) => {
    await page.goto('/model-stacks/new');
    await modelStackFormPage.fill({ id: 'test-stack', displayName: 'Test Stack' });
    await modelStackFormPage.submit();
    await expect(modelStackDetailPage.heading).toContainText('Test Stack');
  });

  test('edits an existing stack', async ({ page, modelStackFormPage, modelStackDetailPage }) => {
    await page.goto('/model-stacks/code-reasoning/edit');
    await modelStackFormPage.fillDescription('Updated for deep reasoning tasks.');
    await modelStackFormPage.submit();
    await expect(modelStackDetailPage.findDefinition('Updated for deep reasoning tasks.')).toBeVisible();
  });

  test('back link on detail returns to list', async ({ page, modelStacksListPage, modelStackDetailPage }) => {
    await modelStacksListPage.clickFirstStack();
    await modelStackDetailPage.clickBack();
    await expect(page).toHaveURL('/model-stacks');
  });

  test('inactive stacks have inactive row class', async ({ modelStacksListPage }) => {
    await expect(modelStacksListPage.inactiveRows).not.toHaveCount(0);
  });

  test('deletes a stack — efficiency has its casualties', async ({ modelStacksListPage }) => {
    const doomed = 'deprecated-stack';
    await expect(modelStacksListPage.rowFor(doomed)).toHaveCount(1);
    await modelStacksListPage.removeRow(doomed);
    await expect(modelStacksListPage.rowFor(doomed)).toHaveCount(0);
  });
});
