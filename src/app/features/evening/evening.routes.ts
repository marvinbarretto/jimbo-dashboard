import { Routes } from '@angular/router';

// Standalone entry point, kept alongside the journal's Reflect domain because
// the mobile shell routes here. `:date` mirrors Reflect's shape so the day
// pager has somewhere to navigate on either surface.
export const eveningRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./containers/evening-page/evening-page').then(m => m.EveningPage),
  },
  {
    path: ':date',
    loadComponent: () =>
      import('./containers/evening-page/evening-page').then(m => m.EveningPage),
  },
];
