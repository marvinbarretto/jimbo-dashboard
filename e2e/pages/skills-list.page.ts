import type { Page, Locator } from '@playwright/test';

export class SkillsListPage {
  readonly heading: Locator;
  readonly rows: Locator;
  readonly inactiveRows: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1');
    this.rows = page.locator('tbody tr');
    this.inactiveRows = page.locator('tbody tr.inactive');
  }

  async clickFirstSkill(): Promise<void> {
    await this.page.locator('tbody td a').first().click();
  }

  async clickAddSkill(): Promise<void> {
    await this.page.getByRole('link', { name: 'Add skill' }).click();
  }
}
