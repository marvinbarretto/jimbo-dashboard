import { Routes } from '@angular/router';

export const vaultItemsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./containers/vault-items-list/vault-items-list').then(m => m.VaultItemsList),
  },
  // `new` must come before `:seq` so the router doesn't try to parse "new" as a seq number.
  {
    path: 'new',
    loadComponent: () =>
      import('./containers/vault-item-form/vault-item-form').then(m => m.VaultItemForm),
  },
  {
    path: ':seq',
    loadComponent: () =>
      import('./containers/vault-item-detail/vault-item-detail').then(m => m.VaultItemDetail),
  },
  {
    path: ':seq/edit',
    loadComponent: () =>
      import('./containers/vault-item-form/vault-item-form').then(m => m.VaultItemForm),
  },
];
