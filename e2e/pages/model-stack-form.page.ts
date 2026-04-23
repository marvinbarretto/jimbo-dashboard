import type { Page, Locator } from '@playwright/test';

interface FillOptions {
  id?: string;
  displayName?: string;
  description?: string;
}

export class ModelStackFormPage {
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1');
  }

  async fill({ id, displayName, description }: FillOptions): Promise<void> {
    if (id) await this.page.fill('#id', id);
    if (displayName) await this.page.fill('#display_name', displayName);
    if (description) await this.page.fill('#description', description);
  }

  async fillDescription(description: string): Promise<void> {
    await this.page.fill('#description', description);
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: /Add stack|Save changes/ }).click();
  }
}
