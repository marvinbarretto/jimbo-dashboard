import { Routes } from '@angular/router';

export const vaultItemsRoutes: Routes = [
  {
    path: '',
    title: 'Vault items',
    loadComponent: () =>
      import('./containers/vault-items-list/vault-items-list').then(m => m.VaultItemsList),
  },
  // `new` must come before `:seq` so the router doesn't try to parse "new" as a seq number.
  {
    path: 'new',
    title: 'New vault item',
    loadComponent: () =>
      import('./containers/vault-item-form/vault-item-form').then(m => m.VaultItemForm),
  },
  {
    path: ':seq',
    title: 'Vault item',
    loadComponent: () =>
      import('./containers/vault-item-detail/vault-item-detail').then(m => m.VaultItemDetail),
  },
  {
    path: ':seq/edit',
    title: 'Edit vault item',
    loadComponent: () =>
      import('./containers/vault-item-form/vault-item-form').then(m => m.VaultItemForm),
  },
];
