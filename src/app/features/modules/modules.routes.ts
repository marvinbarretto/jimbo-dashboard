import { Routes } from '@angular/router';

export const modulesRoutes: Routes = [
  {
    path: '',
    title: 'Module docs',
    loadComponent: () => import('./containers/modules-list/modules-list').then(m => m.ModulesList),
  },
  {
    path: ':module',
    title: 'Module doc',
    loadComponent: () => import('./containers/module-detail/module-detail').then(m => m.ModuleDetail),
  },
];
