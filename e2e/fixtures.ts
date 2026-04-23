import { test as base } from '@playwright/test';
import { ApiMock } from './mocks/api-mock';
import { ModelsListPage } from './pages/models-list.page';
import { ModelFormPage } from './pages/model-form.page';
import { ModelDetailPage } from './pages/model-detail.page';
import { SkillsListPage } from './pages/skills-list.page';
import { SkillFormPage } from './pages/skill-form.page';
import { SkillDetailPage } from './pages/skill-detail.page';
import { ModelStacksListPage } from './pages/model-stacks-list.page';
import { ModelStackFormPage } from './pages/model-stack-form.page';
import { ModelStackDetailPage } from './pages/model-stack-detail.page';

type Fixtures = {
  apiMock: ApiMock;
  modelsListPage: ModelsListPage;
  modelFormPage: ModelFormPage;
  modelDetailPage: ModelDetailPage;
  skillsListPage: SkillsListPage;
  skillFormPage: SkillFormPage;
  skillDetailPage: SkillDetailPage;
  modelStacksListPage: ModelStacksListPage;
  modelStackFormPage: ModelStackFormPage;
  modelStackDetailPage: ModelStackDetailPage;
};

export const test = base.extend<Fixtures>({
  // Install route interceptors before the test body runs.
  // Request apiMock in beforeEach (or any test) to activate mocking for that test.
  apiMock: async ({ page }, use) => {
    const mock = new ApiMock();
    await mock.install(page);
    await use(mock);
  },

  modelsListPage:       async ({ page }, use) => use(new ModelsListPage(page)),
  modelFormPage:        async ({ page }, use) => use(new ModelFormPage(page)),
  modelDetailPage:      async ({ page }, use) => use(new ModelDetailPage(page)),
  skillsListPage:       async ({ page }, use) => use(new SkillsListPage(page)),
  skillFormPage:        async ({ page }, use) => use(new SkillFormPage(page)),
  skillDetailPage:      async ({ page }, use) => use(new SkillDetailPage(page)),
  modelStacksListPage:  async ({ page }, use) => use(new ModelStacksListPage(page)),
  modelStackFormPage:   async ({ page }, use) => use(new ModelStackFormPage(page)),
  modelStackDetailPage: async ({ page }, use) => use(new ModelStackDetailPage(page)),
});

export { expect } from '@playwright/test';
