import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'today',
    title: 'Today',
    loadComponent: () => import('./features/api-data/containers/today-page/today-page').then(m => m.TodayPage),
  },
  {
    path: '',
    loadChildren: () => import('./features/api-data/api-data.routes').then(m => m.apiDataRoutes),
  },
  {
    path: 'vault-items',
    loadChildren: () => import('./features/vault-items/vault-items.routes').then(m => m.vaultItemsRoutes),
  },
  {
    path: 'projects',
    loadChildren: () => import('./features/projects/projects.routes').then(m => m.projectsRoutes),
  },
  {
    path: 'grooming',
    loadChildren: () => import('./features/grooming/grooming.routes').then(m => m.groomingRoutes),
  },
  {
    path: 'execution',
    loadChildren: () => import('./features/execution/execution.routes').then(m => m.executionRoutes),
  },
  {
    path: 'actors',
    loadChildren: () => import('./features/actors/actors.routes').then(m => m.actorsRoutes),
  },
  {
    path: 'questions',
    loadChildren: () => import('./features/questions/questions.routes').then(m => m.questionsRoutes),
  },
  {
    path: 'models',
    loadChildren: () => import('./features/models/models.routes').then(m => m.modelsRoutes),
  },
  {
    path: 'model-stacks',
    loadChildren: () => import('./features/model-stacks/model-stacks.routes').then(m => m.modelStacksRoutes),
  },
  {
    path: 'skills',
    loadChildren: () => import('./features/skills/skills.routes').then(m => m.skillsRoutes),
  },
  {
    path: 'coverage',
    title: 'Coverage',
    loadComponent: () => import('./features/coverage/coverage-page/coverage-page').then(m => m.CoveragePage),
  },
  {
    path: 'test-forms',
    title: 'Test forms',
    loadComponent: () => import('./features/test-forms/test-forms-page').then(m => m.TestFormsPage),
  },
  {
    path: 'ui-lab',
    title: 'UI Lab',
    loadComponent: () => import('./features/ui-lab/ui-lab-page').then(m => m.UiLabPage),
  },
  { path: '', redirectTo: 'today', pathMatch: 'full' },
];
