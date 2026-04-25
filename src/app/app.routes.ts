import { Routes } from '@angular/router';

export const routes: Routes = [
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
    path: 'prompts',
    loadChildren: () => import('./features/prompts/prompts.routes').then(m => m.promptsRoutes),
  },
  {
    path: 'tools',
    loadChildren: () => import('./features/tools/tools.routes').then(m => m.toolsRoutes),
  },
  {
    path: 'coverage',
    loadComponent: () => import('./features/coverage/coverage-page/coverage-page').then(m => m.CoveragePage),
  },
  {
    path: 'test-forms',
    loadComponent: () => import('./features/test-forms/test-forms-page').then(m => m.TestFormsPage),
  },
  { path: '', redirectTo: 'vault-items', pathMatch: 'full' },
];
