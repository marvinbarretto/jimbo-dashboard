import { Routes } from '@angular/router';

export const nutritionRoutes: Routes = [
  {
    path: '',
    title: 'Nutrition',
    loadComponent: () =>
      import('./containers/nutrition-page/nutrition-page').then(m => m.NutritionPage),
  },
];
