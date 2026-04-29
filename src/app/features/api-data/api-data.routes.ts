import { Routes } from '@angular/router';

export const apiDataRoutes: Routes = [
  {
    path: 'mail',
    title: 'Mail',
    data: { domain: 'mail' },
    loadComponent: () => import('./containers/data-page/data-page').then(m => m.DataPage),
  },
  {
    path: 'calendar',
    title: 'Calendar',
    data: { domain: 'calendar' },
    loadComponent: () => import('./containers/data-page/data-page').then(m => m.DataPage),
  },
  {
    path: 'tasks',
    title: 'Tasks',
    data: { domain: 'tasks' },
    loadComponent: () => import('./containers/data-page/data-page').then(m => m.DataPage),
  },
  {
    path: 'ops',
    title: 'Ops',
    data: { domain: 'ops' },
    loadComponent: () => import('./containers/data-page/data-page').then(m => m.DataPage),
  },
  {
    path: 'briefings',
    title: 'Briefings',
    data: { domain: 'briefings' },
    loadComponent: () => import('./containers/data-page/data-page').then(m => m.DataPage),
  },
  {
    path: 'coach',
    title: 'Coach',
    data: { domain: 'coach' },
    loadComponent: () => import('./containers/data-page/data-page').then(m => m.DataPage),
  },
  {
    path: 'context',
    title: 'Context',
    data: { domain: 'context' },
    loadComponent: () => import('./containers/data-page/data-page').then(m => m.DataPage),
  },
  {
    path: 'triage',
    title: 'Triage',
    data: { domain: 'triage' },
    loadComponent: () => import('./containers/data-page/data-page').then(m => m.DataPage),
  },
  {
    path: 'interrogate',
    title: 'Interrogate',
    data: { domain: 'interrogate' },
    loadComponent: () => import('./containers/data-page/data-page').then(m => m.DataPage),
  },
  {
    path: 'activity',
    title: 'Activity',
    data: { domain: 'activity' },
    loadComponent: () => import('./containers/data-page/data-page').then(m => m.DataPage),
  },
  {
    path: 'grooming-admin',
    title: 'Grooming Admin',
    data: { domain: 'grooming-admin' },
    loadComponent: () => import('./containers/data-page/data-page').then(m => m.DataPage),
  },
];
