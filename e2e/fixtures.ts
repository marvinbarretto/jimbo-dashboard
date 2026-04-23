import { test as base } from '@playwright/test';
import { ModelsListPage } from './pages/models-list.page';
import { ModelFormPage } from './pages/model-form.page';
import { ModelDetailPage } from './pages/model-detail.page';

type Fixtures = {
  modelsListPage: ModelsListPage;
  modelFormPage: ModelFormPage;
  modelDetailPage: ModelDetailPage;
};

export const test = base.extend<Fixtures>({
  modelsListPage: async ({ page }, use) => use(new ModelsListPage(page)),
  modelFormPage: async ({ page }, use) => use(new ModelFormPage(page)),
  modelDetailPage: async ({ page }, use) => use(new ModelDetailPage(page)),
});

export { expect } from '@playwright/test';
