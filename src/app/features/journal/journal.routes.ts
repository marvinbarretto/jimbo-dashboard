import { Routes } from '@angular/router';
import { thisMonthKey, thisWeekKey, todayKey } from '@shared/utils/date-keys';

// Domain-first IA: /journal/<domain>/<granularity>/<key>. The shell renders
// the domain tab bar; each domain page owns its granularity switcher.
const granularityChildren = (
  loadComponent: () => Promise<unknown>,
  title: string,
): Routes => [
  { path: 'day/:date', title, data: { granularity: 'day' }, loadComponent: loadComponent as never },
  { path: 'week/:week', title, data: { granularity: 'week' }, loadComponent: loadComponent as never },
  { path: 'month/:month', title, data: { granularity: 'month' }, loadComponent: loadComponent as never },
  { path: '', pathMatch: 'full' as const, redirectTo: () => `day/${todayKey()}` },
];

export const journalRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/journal-shell/journal-shell').then(m => m.JournalShell),
    children: [
      {
        path: 'overview',
        children: granularityChildren(
          () => import('./containers/overview-page/overview-page').then(m => m.JournalOverviewPage),
          'Journal — Overview',
        ),
      },
      {
        path: 'work',
        children: granularityChildren(
          () => import('./containers/work-page/work-page').then(m => m.JournalWorkPage),
          'Journal — Work',
        ),
      },
      {
        path: 'body',
        children: granularityChildren(
          () => import('./containers/body-page/body-page').then(m => m.JournalBodyPage),
          'Journal — Body',
        ),
      },
      {
        path: 'jimbo',
        children: granularityChildren(
          () => import('./containers/jimbo-page/jimbo-page').then(m => m.JournalJimboPage),
          'Journal — Jimbo',
        ),
      },
      {
        path: 'phone',
        children: granularityChildren(
          () => import('./containers/phone-page/phone-page').then(m => m.JournalPhonePage),
          'Journal — Phone',
        ),
      },

      // ── Legacy URLs (pre domain-first IA) — keep old bookmarks working ──
      { path: 'day/:date', redirectTo: ({ params }) => `/journal/overview/day/${params['date']}` },
      { path: 'week/:week', redirectTo: ({ params }) => `/journal/work/week/${params['week']}` },
      { path: 'month/:month', redirectTo: ({ params }) => `/journal/work/month/${params['month']}` },
      { path: 'day', redirectTo: () => `/journal/overview/day/${todayKey()}` },
      { path: 'week', redirectTo: () => `/journal/work/week/${thisWeekKey()}` },
      { path: 'month', redirectTo: () => `/journal/work/month/${thisMonthKey()}` },

      { path: '', pathMatch: 'full', redirectTo: () => `/journal/overview/day/${todayKey()}` },
    ],
  },
];
