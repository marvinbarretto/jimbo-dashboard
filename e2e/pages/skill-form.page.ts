import type { Page, Locator } from '@playwright/test';

interface FillOptions {
  id?: string;
  displayName?: string;
  modelStackId?: string;
}

export class SkillFormPage {
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1');
  }

  async fill({ id, displayName, modelStackId }: FillOptions): Promise<void> {
    if (id) await this.page.fill('#id', id);
    if (displayName) await this.page.fill('#display_name', displayName);
    if (modelStackId) await this.page.selectOption('#model_stack_id', modelStackId);
  }

  async fillNotes(notes: string): Promise<void> {
    await this.page.fill('#notes', notes);
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: /Create|Save/ }).click();
  }
}
