import { Routes } from '@angular/router';

export const entityRegistryRoutes: Routes = [
  {
    path: '',
    title: 'Entity registry',
    loadComponent: () =>
      import('./containers/entity-registry-page/entity-registry-page').then(m => m.EntityRegistryPage),
  },
];
