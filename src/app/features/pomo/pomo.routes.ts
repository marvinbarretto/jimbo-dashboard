import { Routes } from '@angular/router';

export const pomoRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers/pomo-shell/pomo-shell').then(m => m.PomoShell),
    children: [
      {
        path: 'pre-session',
        title: 'Start a pomo',
        loadComponent: () => import('./containers/pomo-pre-session/pomo-pre-session').then(m => m.PomoPreSession),
      },
      {
        path: 'running',
        title: 'Pomo running',
        loadComponent: () => import('./containers/pomo-running/pomo-running').then(m => m.PomoRunning),
      },
      { path: '', pathMatch: 'full', redirectTo: 'pre-session' },
    ],
  },
  {
    path: 'break',
    title: 'Break',
    loadComponent: () => import('./containers/pomo-break/pomo-break').then(m => m.PomoBreak),
  },
  {
    path: 'retro',
    title: 'Session complete',
    loadComponent: () => import('./containers/pomo-retro/pomo-retro').then(m => m.PomoRetro),
  },
];
