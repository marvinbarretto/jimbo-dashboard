import { Routes } from '@angular/router';

export const exerciseRoutes: Routes = [
  {
    path: '',
    title: 'Exercise',
    loadComponent: () =>
      import('./containers/exercise-page/exercise-page').then(m => m.ExercisePage),
  },
];
