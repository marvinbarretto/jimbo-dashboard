import { Routes } from '@angular/router';

export const modelStacksRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers/model-stacks-list/model-stacks-list').then(m => m.ModelStacksList),
  },
  {
    path: 'new',
    loadComponent: () => import('./containers/model-stack-form/model-stack-form').then(m => m.ModelStackForm),
  },
  {
    path: ':id',
    loadComponent: () => import('./containers/model-stack-detail/model-stack-detail').then(m => m.ModelStackDetail),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./containers/model-stack-form/model-stack-form').then(m => m.ModelStackForm),
  },
];
