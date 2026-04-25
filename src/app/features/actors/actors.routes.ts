import { Routes } from '@angular/router';

export const actorsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers/actors-list/actors-list').then(m => m.ActorsList),
  },
  {
    path: 'new',
    loadComponent: () => import('./containers/actor-form/actor-form').then(m => m.ActorForm),
  },
  {
    path: ':id',
    loadComponent: () => import('./containers/actor-detail/actor-detail').then(m => m.ActorDetail),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./containers/actor-form/actor-form').then(m => m.ActorForm),
  },
];
