import { Routes } from '@angular/router';

export const dispatchReviewRoutes: Routes = [
  {
    path: '',
    title: 'Awaiting Review',
    loadComponent: () => import('./containers/review-board/review-board').then(m => m.ReviewBoard),
  },
];
