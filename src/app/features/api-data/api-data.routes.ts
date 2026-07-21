import { Routes } from '@angular/router';
import { DATA_PAGES } from './data-pages';

// One route per DATA_PAGES entry — the config is the source of truth, so
// adding or sunsetting an inspector is a one-line change in data-pages.ts.
export const apiDataRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./containers/api-data-shell/api-data-shell').then(m => m.ApiDataShell),
    children: [
      ...DATA_PAGES.map(page => ({
        path: page.key,
        title: `API — ${page.title}`,
        data: { domain: page.key },
        loadComponent: () => import('./containers/data-page/data-page').then(m => m.DataPage),
      })),
      { path: '', pathMatch: 'full' as const, redirectTo: DATA_PAGES[0].key },
    ],
  },
];
