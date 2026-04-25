import { Routes } from '@angular/router';

export const executionRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers/execution-board/execution-board').then(m => m.ExecutionBoard),
  },
];
