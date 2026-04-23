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
    path: 'coverage',
    loadComponent: () => import('./features/coverage/coverage-page/coverage-page').then(m => m.CoveragePage),
  },
  { path: '', redirectTo: 'models', pathMatch: 'full' },
];
