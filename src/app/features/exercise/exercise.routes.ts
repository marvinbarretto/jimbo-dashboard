import { Routes } from '@angular/router';
import { thisMonthKey, thisWeekKey, todayKey } from '@shared/utils/date-keys';

export const exerciseRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/exercise-shell/exercise-shell').then(m => m.ExerciseShell),
    children: [
      {
        path: 'day/:date',
        title: 'Exercise — Day',
        loadComponent: () =>
          import('./containers/exercise-page/exercise-page').then(m => m.ExercisePage),
        data: { granularity: 'day' },
      },
      {
        path: 'week/:week',
        title: 'Exercise — Week',
        loadComponent: () =>
          import('./containers/exercise-page/exercise-page').then(m => m.ExercisePage),
        data: { granularity: 'week' },
      },
      {
        path: 'month/:month',
        title: 'Exercise — Month',
        loadComponent: () =>
          import('./containers/exercise-page/exercise-page').then(m => m.ExercisePage),
        data: { granularity: 'month' },
      },
      // The default landing point lives behind a redirect so deep-links and
      // the nav both end up at today rather than a blank shell.
      { path: 'day', redirectTo: () => `/exercise/day/${todayKey()}` },
      { path: 'week', redirectTo: () => `/exercise/week/${thisWeekKey()}` },
      { path: 'month', redirectTo: () => `/exercise/month/${thisMonthKey()}` },
      { path: '', pathMatch: 'full', redirectTo: () => `/exercise/day/${todayKey()}` },
    ],
  },
];
