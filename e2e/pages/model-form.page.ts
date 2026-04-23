import type { Page, Locator } from '@playwright/test';

interface FillOptions {
  id?: string;
  displayName?: string;
  provider?: string;
  tier?: string;
}

export class ModelFormPage {
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1');
  }

  async fill({ id, displayName, provider, tier }: FillOptions): Promise<void> {
    if (id) await this.page.fill('#id', id);
    if (displayName) await this.page.fill('#display_name', displayName);
    if (provider) await this.page.selectOption('#provider', provider);
    if (tier) await this.page.selectOption('#tier', tier);
  }

  async fillNotes(notes: string): Promise<void> {
    await this.page.fill('#notes', notes);
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: /Add model|Save changes/ }).click();
  }
}
