import { Routes } from '@angular/router';

export const hermesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers/hermes-page/hermes-page').then(m => m.HermesPage),
    children: [
      { path: '', redirectTo: 'pulse', pathMatch: 'full' },
      {
        path: 'pulse',
        title: 'Hermes — Pulse',
        loadComponent: () => import('./containers/hermes-pulse/hermes-pulse').then(m => m.HermesPulse),
      },
      {
        path: 'control-room',
        title: 'Hermes — Control Room',
        loadComponent: () => import('./containers/hermes-control-room/hermes-control-room').then(m => m.HermesControlRoom),
      },
      {
        path: 'timeline',
        title: 'Hermes — Timeline',
        loadComponent: () => import('./containers/hermes-timeline/hermes-timeline').then(m => m.HermesTimeline),
      },
    ],
  },
];
