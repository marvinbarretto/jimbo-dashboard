import { type Routes } from '@angular/router';
import { trackerRoutes } from '@shared/utils/tracker-routes';

export const nutritionRoutes: Routes = [
  // Outside the period shell on purpose: scanning isn't scoped to a day/week/
  // month, so the pager chrome would be dead weight on a one-handed phone page.
  {
    path: 'scan',
    title: 'Nutrition — Scan',
    loadComponent: () =>
      import('./containers/nutrition-scan-page/nutrition-scan-page').then(m => m.NutritionScanPage),
  },
  ...trackerRoutes({
    basePath: 'nutrition',
    label: 'Nutrition',
    loadPage: () => import('./containers/nutrition-page/nutrition-page'),
    pageExport: 'NutritionPage',
  }),
];
