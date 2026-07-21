import { Routes } from '@angular/router';

export const checkinsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./containers/checkins-page/checkins-page').then(m => m.CheckinsPage),
  },
];
