import { Routes } from '@angular/router';

export const modelsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./models-list/models-list').then(m => m.ModelsList),
  },
  {
    path: 'new',
    loadComponent: () => import('./model-form/model-form').then(m => m.ModelForm),
  },
  {
    path: ':provider/:name',
    loadComponent: () => import('./model-detail/model-detail').then(m => m.ModelDetail),
  },
  {
    path: ':provider/:name/edit',
    loadComponent: () => import('./model-form/model-form').then(m => m.ModelForm),
  },
];
