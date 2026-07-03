import { Routes } from '@angular/router';

export const executionRoutes: Routes = [
  {
    path: '',
    title: 'Execution',
    loadComponent: () => import('./containers/execution-board/execution-board').then(m => m.ExecutionBoard),
  },
  {
    path: 'settings',
    title: 'Execution settings',
    loadComponent: () => import('./containers/execution-settings-page/execution-settings-page').then(m => m.ExecutionSettingsPage),
  },
];
