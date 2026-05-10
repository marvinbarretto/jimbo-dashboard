import { test, expect } from './fixtures';

// ── KNOWN-BROKEN — rewrite when this feature is next touched ──────────────
//
// Pre-2026 schema: `{id, display_name, tier, capabilities, ...}` flat row.
// Now: `{id: slash-path, name, description, metadata: {status, source,
// architecture, pricing, ...}, body}` — filesystem-backed, OpenRouter-aligned.
// The page-objects assume `display_name`, `<code>` row markers, raw `<tbody>`
// — none of that survived the redesign. List renders via `<app-ui-data-table>`.
//
// Marked `fixme` rather than removed so intent stays visible. Per
// `docs/conventions.md` §"Rewrite-on-touch", whoever next refactors the
// models feature should delete this comment, rewrite the suite using
// data-testid hooks (see grooming-board.page.ts), and re-enable.
test.describe.fixme('Models CRUD', () => {
  test.beforeEach(async ({ page, apiMock }) => {
    void apiMock;
    await page.goto('/config/models');
  });

  test('list renders with models', async ({ modelsListPage }) => {
    await expect(modelsListPage.heading).toHaveText('Models');
    await expect(modelsListPage.rows).not.toHaveCount(0);
  });

  test('navigates to detail on row link click', async ({ page, modelsListPage, modelDetailPage }) => {
    await modelsListPage.clickFirstModel();
    await expect(modelDetailPage.heading).toBeVisible();
    await expect(page).not.toHaveURL('/config/models');
  });

  test('Add model navigates to create form', async ({ page, modelsListPage, modelFormPage }) => {
    await modelsListPage.clickAddModel();
    await expect(page).toHaveURL('/config/models/new');
    await expect(modelFormPage.heading).toHaveText('Add model');
  });

  test('creates a new model — born, immediately put to work', async ({ page, modelFormPage, modelDetailPage }) => {
    await page.goto('/config/models/new');
    await modelFormPage.fill({ id: 'test/delete-me-7b', displayName: 'Delete Me 7B', provider: 'meta', tier: 'free' });
    await modelFormPage.submit();
    await expect(modelDetailPage.heading).toContainText('Delete Me 7B');
  });

  test('edits an existing model', async ({ page, modelFormPage, modelDetailPage }) => {
    await page.goto('/config/models/openai/gpt-5-nano/edit');
    await modelFormPage.fillNotes('Updated notes.');
    await modelFormPage.submit();
    await expect(modelDetailPage.findDefinition('Updated notes.')).toBeVisible();
  });

  test('back link on detail returns to list', async ({ page, modelsListPage, modelDetailPage }) => {
    await modelsListPage.clickFirstModel();
    await modelDetailPage.clickBack();
    await expect(page).toHaveURL('/config/models');
  });

  test('inactive models have inactive row class', async ({ modelsListPage }) => {
    await expect(modelsListPage.inactiveRows).not.toHaveCount(0);
  });

  test('deletes a model — severance, effective immediately', async ({ modelsListPage }) => {
    const doomed = 'deepseek/deepseek-chat-v3.1';
    await expect(modelsListPage.rowFor(doomed)).toHaveCount(1);
    await modelsListPage.removeRow(doomed);
    await expect(modelsListPage.rowFor(doomed)).toHaveCount(0);
  });

  test('rejects id without provider/name — the router is not your therapist', async ({ page, modelFormPage }) => {
    await page.goto('/config/models/new');
    await modelFormPage.fill({ id: 'bad-id', displayName: 'Bad Id', provider: 'meta', tier: 'free' });
    await modelFormPage.submit();
    // Must not navigate away from the form, must not crash the router.
    await expect(page).toHaveURL('/config/models/new');
    await expect(page.locator('.field-error, [role="alert"]')).toContainText(/provider\/name/i);
  });
});
