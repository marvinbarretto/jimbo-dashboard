import { Routes } from '@angular/router';

export const deliveryRoutes: Routes = [
  {
    path: '',
    title: 'Delivery',
    loadComponent: () =>
      import('./containers/delivery-page/delivery-page').then(m => m.DeliveryPage),
  },
];
