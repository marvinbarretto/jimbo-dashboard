import { Routes } from '@angular/router';

export const modelsRoutes: Routes = [
  {
    path: '',
    title: 'Models',
    loadComponent: () => import('./containers/models-list/models-list').then(m => m.ModelsList),
  },
  {
    path: 'new',
    title: 'New model',
    loadComponent: () => import('./containers/model-form/model-form').then(m => m.ModelForm),
  },
  {
    path: ':provider/:name',
    title: 'Model',
    loadComponent: () => import('./containers/model-detail/model-detail').then(m => m.ModelDetail),
  },
  {
    path: ':provider/:name/edit',
    title: 'Edit model',
    loadComponent: () => import('./containers/model-form/model-form').then(m => m.ModelForm),
  },
];
