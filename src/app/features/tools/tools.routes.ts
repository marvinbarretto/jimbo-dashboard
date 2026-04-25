import { Routes } from '@angular/router';

export const toolsRoutes: Routes = [
  {
    path: '',
    title: 'Tools',
    loadComponent: () => import('./containers/tools-list/tools-list').then(m => m.ToolsList),
  },
  {
    path: 'new',
    title: 'New tool',
    loadComponent: () => import('./containers/tool-form/tool-form').then(m => m.ToolForm),
  },
  {
    path: ':id',
    title: 'Tool',
    loadComponent: () => import('./containers/tool-detail/tool-detail').then(m => m.ToolDetail),
  },
  {
    path: ':id/edit',
    title: 'Edit tool',
    loadComponent: () => import('./containers/tool-form/tool-form').then(m => m.ToolForm),
  },
  {
    path: ':id/versions/new',
    title: 'New tool version',
    loadComponent: () => import('./containers/tool-version-form/tool-version-form').then(m => m.ToolVersionForm),
  },
];
