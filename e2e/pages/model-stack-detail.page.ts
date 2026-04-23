import type { Page, Locator } from '@playwright/test';

export class ModelStackDetailPage {
  readonly heading: Locator;
  readonly backLink: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1');
    this.backLink = page.getByRole('link', { name: '← Model Stacks' });
  }

  findDefinition(text: string): Locator {
    return this.page.locator('dd', { hasText: text });
  }

  async clickBack(): Promise<void> {
    await this.backLink.click();
  }
}
