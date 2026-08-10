import { type Routes } from '@angular/router';
import { REUSE_TAB } from './mobile-tab-reuse-strategy';

/**
 * The phone shell — what the jimbo-app Capacitor WebView loads.
 *
 * Tab paths are a cross-repo contract; jimbo-app's native home deep-links into
 * `/m/today`, `/m/log` and `/m/train`. Strategy and sequencing live in
 * `docs/architecture/mobile-shell.md`.
 *
 * Each tab opts into detach/reattach reuse (MobileTabReuseStrategy) so bottom-
 * nav switches restore the parked component instead of remounting — no
 * spinner, no resource refetch, scroll intact (MobileShell keeps the offsets).
 */
export const mobileRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./containers/mobile-shell/mobile-shell').then(m => m.MobileShell),
    children: [
      {
        path: 'today',
        title: 'Today',
        data: { [REUSE_TAB]: 'today' },
        loadComponent: () => import('./containers/mobile-today/mobile-today').then(m => m.MobileToday),
      },
      {
        path: 'log',
        title: 'Log',
        data: { [REUSE_TAB]: 'log' },
        loadComponent: () => import('./containers/mobile-log/mobile-log').then(m => m.MobileLog),
      },
      {
        path: 'train',
        title: 'Train',
        data: { [REUSE_TAB]: 'train' },
        loadComponent: () => import('./containers/mobile-train/mobile-train').then(m => m.MobileTrain),
      },
      { path: '', pathMatch: 'full', redirectTo: 'today' },
    ],
  },
];
