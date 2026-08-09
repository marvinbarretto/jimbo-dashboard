import { type Routes } from '@angular/router';

/**
 * The phone shell — what the jimbo-app Capacitor WebView loads.
 *
 * Tab paths are a cross-repo contract; jimbo-app's native home deep-links into
 * `/m/today`, `/m/log` and `/m/train`. Strategy and sequencing live in
 * `docs/architecture/mobile-shell.md`.
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
        loadComponent: () =>
          import('./containers/mobile-tab-stub/mobile-tab-stub').then(m => m.MobileTabStub),
        data: {
          heading: 'Today',
          note: 'Briefing and day checks land here. Until then, the desktop routes still hold them.',
        },
      },
      {
        path: 'log',
        title: 'Log',
        loadComponent: () =>
          import('./containers/mobile-tab-stub/mobile-tab-stub').then(m => m.MobileTabStub),
        data: {
          heading: 'Log',
          note: 'Nutrition day ledger — read-only rows with bottom-sheet editing. Next up.',
        },
      },
      {
        path: 'train',
        title: 'Train',
        loadComponent: () =>
          import('./containers/mobile-tab-stub/mobile-tab-stub').then(m => m.MobileTabStub),
        data: {
          heading: 'Train',
          note: 'Gym day ledger and the live session flow, on big thumb targets.',
        },
      },
      { path: '', pathMatch: 'full', redirectTo: 'today' },
    ],
  },
];
