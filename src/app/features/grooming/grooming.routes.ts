import { Routes } from '@angular/router';

export const groomingRoutes: Routes = [
  {
    path: '',
    title: 'Grooming',
    loadComponent: () => import('./containers/grooming-board/grooming-board').then(m => m.GroomingBoard),
  },
  {
    path: 'settings',
    title: 'Grooming settings',
    loadComponent: () => import('./containers/grooming-settings-page/grooming-settings-page').then(m => m.GroomingSettingsPage),
  },
];
