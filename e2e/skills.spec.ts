import { test, expect } from './fixtures';

test.describe('Skills CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/skills');
  });

  test('list renders with skills', async ({ skillsListPage }) => {
    await expect(skillsListPage.heading).toHaveText('Skills');
    await expect(skillsListPage.rows).not.toHaveCount(0);
  });

  test('navigates to detail on row link click', async ({ page, skillsListPage, skillDetailPage }) => {
    await skillsListPage.clickFirstSkill();
    await expect(skillDetailPage.heading).toBeVisible();
    await expect(page).not.toHaveURL('/skills');
  });

  test('Add skill navigates to create form', async ({ page, skillsListPage, skillFormPage }) => {
    await skillsListPage.clickAddSkill();
    await expect(page).toHaveURL('/skills/new');
    await expect(skillFormPage.heading).toHaveText('New skill');
  });

  test('creates a new skill — filed under skills nobody asked for', async ({ page, skillFormPage, skillDetailPage }) => {
    await page.goto('/skills/new');
    await skillFormPage.fill({ id: 'test-skill', displayName: 'Test Skill' });
    await skillFormPage.submit();
    await expect(skillDetailPage.heading).toContainText('Test Skill');
  });

  test('edits an existing skill', async ({ page, skillFormPage, skillDetailPage }) => {
    await page.goto('/skills/daily-briefing/edit');
    await skillFormPage.fillNotes('Runs at 07:00 and 13:00.');
    await skillFormPage.submit();
    await expect(skillDetailPage.findDefinition('Runs at 07:00 and 13:00.')).toBeVisible();
  });

  test('back link on detail returns to list', async ({ skillsListPage, skillDetailPage }) => {
    await skillsListPage.clickFirstSkill();
    await skillDetailPage.clickBack();
    await expect(skillsListPage.heading).toHaveText('Skills');
  });

  test('inactive skills have inactive row class', async ({ skillsListPage }) => {
    await expect(skillsListPage.inactiveRows).not.toHaveCount(0);
  });
});
