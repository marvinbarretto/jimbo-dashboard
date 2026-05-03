import { Routes } from '@angular/router';

export const shoppingRoutes: Routes = [
  {
    path: '',
    title: 'Shopping',
    loadComponent: () =>
      import('./containers/shopping-list/shopping-list').then(m => m.ShoppingList),
  },
];
