import { Routes } from '@angular/router';

export const executionRoutes: Routes = [
  {
    path: '',
    title: 'Execution',
    loadComponent: () => import('./containers/execution-board/execution-board').then(m => m.ExecutionBoard),
  },
];
