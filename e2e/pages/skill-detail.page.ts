import type { Page, Locator } from '@playwright/test';

export class SkillDetailPage {
  readonly heading: Locator;
  readonly backLink: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1');
    this.backLink = page.getByRole('link', { name: '← Skills' });
  }

  findDefinition(text: string): Locator {
    return this.page.locator('dd', { hasText: text });
  }

  async clickBack(): Promise<void> {
    await this.backLink.click();
  }
}
