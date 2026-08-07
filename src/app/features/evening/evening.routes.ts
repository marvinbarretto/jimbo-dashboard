import { Routes } from '@angular/router';

export const eveningRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./containers/evening-page/evening-page').then(m => m.EveningPage),
  },
];
