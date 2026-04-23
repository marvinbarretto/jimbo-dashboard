import type { Page, Locator } from '@playwright/test';

export class ModelStacksListPage {
  readonly heading: Locator;
  readonly rows: Locator;
  readonly inactiveRows: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1');
    this.rows = page.locator('tbody tr');
    this.inactiveRows = page.locator('tbody tr.inactive');
  }

  async clickFirstStack(): Promise<void> {
    await this.page.locator('tbody td a').first().click();
  }

  async clickAddStack(): Promise<void> {
    await this.page.getByRole('link', { name: 'Add stack' }).click();
  }

  rowFor(id: string): Locator {
    return this.page.locator('tbody tr', { has: this.page.locator(`a:text-is("${id}")`) });
  }

  async removeRow(id: string): Promise<void> {
    this.page.once('dialog', d => d.accept());
    await this.rowFor(id).getByRole('button', { name: 'Remove' }).click();
  }
}
