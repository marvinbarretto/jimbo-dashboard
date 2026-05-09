// Type-narrowed read surface over VaultItemsService.
//
// Why this exists. The path-based ESLint rule (VAULT-COMMANDS-001) blocks
// runtime imports of `vault-items.service` outside the seam directories
// (commands/, data-access/, containers/, dialog/, tests). That stops a leaf
// component from grabbing the full mutation surface — but it's a coarse
// gate. A consumer that legitimately only needs reads STILL has to be
// listed as a known violation today.
//
// The read surface fixes that: a component that only reads can
// `inject(VAULT_ITEMS_READ)` instead of `inject(VaultItemsService)`. The
// returned reference is the same singleton VaultItemsService instance,
// narrowly typed as `VaultItemsRead`. The TypeScript compiler refuses any
// mutation call — stronger than ESLint, since it operates at the type level.
//
// The token uses `factory: () => inject(VaultItemsService)` so it never
// creates a second instance — the same store is shared by both surfaces.
//
// The file lives in `data-access/` so its own import of the service module
// passes the lint rule. Consumers import THIS file (path doesn't end in
// `*.service`, so the rule allows it everywhere).

import { InjectionToken, inject, type Signal } from '@angular/core';

import type { VaultItem } from '@domain/vault';
import type { VaultItemId } from '@domain/ids';
import { VaultItemsService } from './vault-items.service';

/**
 * Read-only view of the vault items store. Mirror of the public read
 * surface on VaultItemsService: signals + lookups, no mutations.
 *
 * Add a new method here ONLY when it has zero side effects on the store.
 * Any HTTP-firing or signal-writing method belongs in VaultItemsService
 * proper and is consumed by the command layer.
 */
export interface VaultItemsRead {
  readonly items: Signal<VaultItem[]>;
  readonly activeItems: Signal<VaultItem[]>;
  readonly isLoading: Signal<boolean>;
  getById(id: VaultItemId): VaultItem | undefined;
  getBySeq(seq: number): VaultItem | undefined;
}

/**
 * DI token for the read surface. Components, dialogs, and pages that don't
 * need to mutate should `inject(VAULT_ITEMS_READ)` rather than
 * `inject(VaultItemsService)` — same singleton, narrower type.
 *
 * Idiomatic Angular DI shape: matches `inject(DOCUMENT)`, `inject(MAT_DIALOG_DATA)`,
 * `inject(ENVIRONMENT_INITIALIZER)`, etc.
 */
export const VAULT_ITEMS_READ = new InjectionToken<VaultItemsRead>('VAULT_ITEMS_READ', {
  providedIn: 'root',
  factory: () => inject(VaultItemsService),
});
