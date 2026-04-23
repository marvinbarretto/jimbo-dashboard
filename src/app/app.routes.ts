import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'models',
    loadChildren: () => import('./features/models/models.routes').then(m => m.modelsRoutes),
  },
  {
    path: 'coverage',
    loadComponent: () => import('./features/coverage/coverage-page/coverage-page').then(m => m.CoveragePage),
  },
  { path: '', redirectTo: 'models', pathMatch: 'full' },
];
