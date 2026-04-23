import { test as base } from '@playwright/test';
import { ModelsListPage } from './pages/models-list.page';
import { ModelFormPage } from './pages/model-form.page';
import { ModelDetailPage } from './pages/model-detail.page';
import { SkillsListPage } from './pages/skills-list.page';
import { SkillFormPage } from './pages/skill-form.page';
import { SkillDetailPage } from './pages/skill-detail.page';

type Fixtures = {
  modelsListPage: ModelsListPage;
  modelFormPage: ModelFormPage;
  modelDetailPage: ModelDetailPage;
  skillsListPage: SkillsListPage;
  skillFormPage: SkillFormPage;
  skillDetailPage: SkillDetailPage;
};

export const test = base.extend<Fixtures>({
  modelsListPage: async ({ page }, use) => use(new ModelsListPage(page)),
  modelFormPage: async ({ page }, use) => use(new ModelFormPage(page)),
  modelDetailPage: async ({ page }, use) => use(new ModelDetailPage(page)),
  skillsListPage: async ({ page }, use) => use(new SkillsListPage(page)),
  skillFormPage: async ({ page }, use) => use(new SkillFormPage(page)),
  skillDetailPage: async ({ page }, use) => use(new SkillDetailPage(page)),
});

export { expect } from '@playwright/test';
