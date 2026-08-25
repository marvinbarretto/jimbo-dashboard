import { Routes } from '@angular/router';
import { thisMonthKey, thisWeekKey } from '@shared/utils/date-keys';
import { logicalToday } from '@shared/utils/datetime.utils';

// Domain-first IA: /journal/<domain>/<granularity>/<key>. The shell renders
// the domain tab bar; each domain page owns its granularity switcher.
const granularityChildren = (
  loadComponent: () => Promise<unknown>,
  title: string,
): Routes => [
  { path: 'day/:date', title, data: { granularity: 'day' }, loadComponent: loadComponent as never },
  { path: 'week/:week', title, data: { granularity: 'week' }, loadComponent: loadComponent as never },
  { path: 'month/:month', title, data: { granularity: 'month' }, loadComponent: loadComponent as never },
  // The working day, not the calendar date: opening the journal at 00:30 should
  // land on the session you are still in, not on a day that has not started.
  { path: '', pathMatch: 'full' as const, redirectTo: () => `day/${logicalToday()}` },
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

      // Reflect has no week or month form — a reflection is written about one
      // evening — so it takes the day shape directly rather than
      // granularityChildren.
      {
        path: 'reflect',
        children: [
          {
            path: 'day/:date',
            title: 'Journal — Reflect',
            loadComponent: () =>
              import('../evening/containers/evening-page/evening-page').then(m => m.EveningPage),
          },
          { path: '', pathMatch: 'full' as const, redirectTo: () => `day/${logicalToday()}` },
        ],
      },

      // ── Legacy URLs (pre domain-first IA) — keep old bookmarks working ──
      { path: 'day/:date', redirectTo: ({ params }) => `/journal/overview/day/${params['date']}` },
      { path: 'week/:week', redirectTo: ({ params }) => `/journal/work/week/${params['week']}` },
      { path: 'month/:month', redirectTo: ({ params }) => `/journal/work/month/${params['month']}` },
      { path: 'day', redirectTo: () => `/journal/overview/day/${logicalToday()}` },
      { path: 'week', redirectTo: () => `/journal/work/week/${thisWeekKey()}` },
      { path: 'month', redirectTo: () => `/journal/work/month/${thisMonthKey()}` },

      { path: '', pathMatch: 'full', redirectTo: () => `/journal/overview/day/${logicalToday()}` },
    ],
  },
];
