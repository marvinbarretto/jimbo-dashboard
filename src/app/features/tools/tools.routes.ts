import { Routes } from '@angular/router';

export const toolsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers/tools-list/tools-list').then(m => m.ToolsList),
  },
  {
    path: 'new',
    loadComponent: () => import('./containers/tool-form/tool-form').then(m => m.ToolForm),
  },
  {
    path: ':id',
    loadComponent: () => import('./containers/tool-detail/tool-detail').then(m => m.ToolDetail),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./containers/tool-form/tool-form').then(m => m.ToolForm),
  },
  {
    path: ':id/versions/new',
    loadComponent: () => import('./containers/tool-version-form/tool-version-form').then(m => m.ToolVersionForm),
  },
];
