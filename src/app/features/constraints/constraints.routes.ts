import { Routes } from '@angular/router';

export const constraintsRoutes: Routes = [
  {
    path: '',
    title: 'Constraints',
    loadComponent: () =>
      import('./containers/constraints-page/constraints-page').then(m => m.ConstraintsPage),
  },
];
