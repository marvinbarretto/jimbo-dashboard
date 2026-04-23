import type { Page, Locator } from '@playwright/test';

export class ModelsListPage {
  readonly heading: Locator;
  readonly rows: Locator;
  readonly inactiveRows: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1');
    this.rows = page.locator('tbody tr');
    this.inactiveRows = page.locator('tbody tr.inactive');
  }

  async clickFirstModel(): Promise<void> {
    await this.page.locator('tbody td.model-id a').first().click();
  }

  async clickAddModel(): Promise<void> {
    await this.page.getByRole('link', { name: 'Add model' }).click();
  }
}
