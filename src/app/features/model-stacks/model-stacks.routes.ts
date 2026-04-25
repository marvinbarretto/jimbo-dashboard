import { Routes } from '@angular/router';

export const modelStacksRoutes: Routes = [
  {
    path: '',
    title: 'Model stacks',
    loadComponent: () => import('./containers/model-stacks-list/model-stacks-list').then(m => m.ModelStacksList),
  },
  {
    path: 'new',
    title: 'New model stack',
    loadComponent: () => import('./containers/model-stack-form/model-stack-form').then(m => m.ModelStackForm),
  },
  {
    path: ':id',
    title: 'Model stack',
    loadComponent: () => import('./containers/model-stack-detail/model-stack-detail').then(m => m.ModelStackDetail),
  },
  {
    path: ':id/edit',
    title: 'Edit model stack',
    loadComponent: () => import('./containers/model-stack-form/model-stack-form').then(m => m.ModelStackForm),
  },
];
