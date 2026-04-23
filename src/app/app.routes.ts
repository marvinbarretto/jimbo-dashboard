import { Routes } from '@angular/router';

export const routes: Routes = [
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
    loadComponent: () => import('./features/coverage/coverage-page/coverage-page').then(m => m.CoveragePage),
  },
  {
    path: 'test-forms',
    loadComponent: () => import('./features/test-forms/test-forms-page').then(m => m.TestFormsPage),
  },
  { path: '', redirectTo: 'models', pathMatch: 'full' },
];
