import { Routes } from '@angular/router';
import { thisMonthKey, thisWeekKey, todayKey } from './utils/date-keys';

export const journalRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/journal-shell/journal-shell').then(m => m.JournalShell),
    children: [
      {
        path: 'day/:date',
        title: 'Journal — Day',
        loadComponent: () =>
          import('./containers/day-page/day-page').then(m => m.JournalDayPage),
      },
      {
        path: 'week/:week',
        title: 'Journal — Week',
        loadComponent: () =>
          import('./containers/week-page/week-page').then(m => m.JournalWeekPage),
      },
      {
        path: 'month/:month',
        title: 'Journal — Month',
        loadComponent: () =>
          import('./containers/month-page/month-page').then(m => m.JournalMonthPage),
      },
      // The default landing point lives behind a redirect so deep-links and
      // the nav both end up at today rather than a blank shell.
      { path: 'day', redirectTo: () => `/journal/day/${todayKey()}` },
      { path: 'week', redirectTo: () => `/journal/week/${thisWeekKey()}` },
      { path: 'month', redirectTo: () => `/journal/month/${thisMonthKey()}` },
      { path: '', pathMatch: 'full', redirectTo: () => `/journal/day/${todayKey()}` },
    ],
  },
];
