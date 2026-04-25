import { Routes } from '@angular/router';

export const groomingRoutes: Routes = [
  {
    path: '',
    title: 'Grooming',
    loadComponent: () => import('./containers/grooming-board/grooming-board').then(m => m.GroomingBoard),
  },
];
