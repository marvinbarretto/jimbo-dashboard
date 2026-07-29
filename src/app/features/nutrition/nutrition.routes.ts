import { trackerRoutes } from '@shared/utils/tracker-routes';

export const nutritionRoutes = trackerRoutes({
  basePath: 'nutrition',
  label: 'Nutrition',
  loadPage: () => import('./containers/nutrition-page/nutrition-page'),
  pageExport: 'NutritionPage',
});
