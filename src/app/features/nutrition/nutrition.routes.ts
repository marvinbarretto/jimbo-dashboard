import { Routes } from '@angular/router';
import { thisMonthKey, thisWeekKey, todayKey } from '@shared/utils/date-keys';

export const nutritionRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/nutrition-shell/nutrition-shell').then(m => m.NutritionShell),
    children: [
      {
        path: 'day/:date',
        title: 'Nutrition — Day',
        loadComponent: () =>
          import('./containers/nutrition-page/nutrition-page').then(m => m.NutritionPage),
        data: { granularity: 'day' },
      },
      {
        path: 'week/:week',
        title: 'Nutrition — Week',
        loadComponent: () =>
          import('./containers/nutrition-page/nutrition-page').then(m => m.NutritionPage),
        data: { granularity: 'week' },
      },
      {
        path: 'month/:month',
        title: 'Nutrition — Month',
        loadComponent: () =>
          import('./containers/nutrition-page/nutrition-page').then(m => m.NutritionPage),
        data: { granularity: 'month' },
      },
      // The default landing point lives behind a redirect so deep-links and
      // the nav both end up at today rather than a blank shell.
      { path: 'day', redirectTo: () => `/nutrition/day/${todayKey()}` },
      { path: 'week', redirectTo: () => `/nutrition/week/${thisWeekKey()}` },
      { path: 'month', redirectTo: () => `/nutrition/month/${thisMonthKey()}` },
      { path: '', pathMatch: 'full', redirectTo: () => `/nutrition/day/${todayKey()}` },
    ],
  },
];
