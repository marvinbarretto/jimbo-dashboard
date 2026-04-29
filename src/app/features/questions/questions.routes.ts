import { Routes } from '@angular/router';

export const questionsRoutes: Routes = [
  {
    path: '',
    title: 'Questions',
    loadComponent: () =>
      import('./containers/questions-page/questions-page').then(m => m.QuestionsPage),
  },
];
