import { Routes } from '@angular/router';

export const actorsRoutes: Routes = [
  {
    path: '',
    title: 'Actors',
    loadComponent: () => import('./containers/actors-list/actors-list').then(m => m.ActorsList),
  },
  {
    path: 'new',
    title: 'New actor',
    loadComponent: () => import('./containers/actor-form/actor-form').then(m => m.ActorForm),
  },
  {
    path: ':id',
    title: 'Actor',
    loadComponent: () => import('./containers/actor-page/actor-page').then(m => m.ActorPage),
  },
  {
    path: ':id/edit',
    title: 'Edit actor',
    loadComponent: () => import('./containers/actor-form/actor-form').then(m => m.ActorForm),
  },
];
