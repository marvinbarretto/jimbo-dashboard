// The vault's type vocabulary, served from the API rather than restated here.
//
// Before this existed, three places each kept their own copy of
// ['task','note','bookmark'] — the create form's dropdown, the list's filter
// pills, and the create payload's default. Meanwhile the API's actionable set
// was ['story','spike','task','decision','habit','errand'] and its ready gate
// demanded acceptance criteria from all of them alike. The measured result
// (2026-08-05) was 2288 tasks and zero rows across the five types the UI could
// not offer. See jimbo-api/docs/2026-08-05-vault-types-and-the-ready-gate.md.
//
// Fetching means the UI and the server's gate can't disagree about which types
// are workable or which of them need criteria.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { VaultItemType } from '@domain/vault';
import {
  ApiVaultTypeSpecListSchema,
  type ApiVaultTypeSpec,
} from '@domain/vault/vault-type.api-schema';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { isSeedMode } from '@shared/seed-mode';

// Used in seed mode and as the pre-fetch value, so a form rendered on the first
// paint isn't empty. Deliberately the same shape the API returns; it is a
// starting point, not a second source of truth — the fetch overwrites it.
const FALLBACK: ApiVaultTypeSpec[] = [
  { type: 'task',      label: 'Task',      hint: 'Build work with a definable done.',                       actionable: true,  needsAcceptanceCriteria: true,  needsActionability: true,  carriesPriority: true },
  { type: 'spike',     label: 'Spike',     hint: 'Time-boxed investigation.',                               actionable: true,  needsAcceptanceCriteria: false, needsActionability: false, carriesPriority: true },
  { type: 'decision',  label: 'Decision',  hint: 'A choice to be made.',                                    actionable: true,  needsAcceptanceCriteria: false, needsActionability: false, carriesPriority: true },
  { type: 'errand',    label: 'Errand',    hint: 'Life admin. Done is self-evident.',                       actionable: true,  needsAcceptanceCriteria: false, needsActionability: false, carriesPriority: true },
  { type: 'note',      label: 'Note',      hint: 'Thinking and reference.',                                 actionable: false, needsAcceptanceCriteria: false, needsActionability: false, carriesPriority: false },
  { type: 'bookmark',  label: 'Bookmark',  hint: 'A link worth keeping.',                                   actionable: false, needsAcceptanceCriteria: false, needsActionability: false, carriesPriority: false },
];

@Injectable({ providedIn: 'root' })
export class VaultTypesService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/vault/types`;

  private readonly _specs = signal<ApiVaultTypeSpec[]>(FALLBACK);
  private readonly _loading = signal(true);

  /** Every type, in the order the API wants them rendered. */
  readonly specs = this._specs.asReadonly();
  readonly isLoading = this._loading.asReadonly();

  /** Types that can be worked — these are what a work board should show. */
  readonly actionable = computed(() => this._specs().filter(s => s.actionable));
  /** Reference material — never gated, never on a work board. */
  readonly reference = computed(() => this._specs().filter(s => !s.actionable));

  /** Default for a create form: the first workable type the API offers. */
  readonly defaultType = computed<VaultItemType>(
    () => this.actionable()[0]?.type ?? this._specs()[0]?.type ?? 'task',
  );

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._specs.set([...FALLBACK]);
      this._loading.set(false);
      return;
    }
    this.http.get<unknown>(this.url).subscribe({
      next: (raw) => {
        const result = ApiVaultTypeSpecListSchema.safeParse(raw);
        if (!result.success) {
          console.error('[vault-types] /api/vault/types response failed schema:', result.error.issues);
          this.toast.error('Failed to load vault types — API response did not match expected shape');
          this._loading.set(false);
          return;
        }
        this._specs.set(result.data);
        this._loading.set(false);
      },
      error: () => {
        // Keep FALLBACK rather than blanking the vocabulary — an empty type
        // dropdown makes the create form unusable, which is worse than a stale
        // but workable list.
        this.toast.error('Failed to load vault types — using defaults');
        this._loading.set(false);
      },
    });
  }

  spec(type: VaultItemType | null | undefined): ApiVaultTypeSpec | undefined {
    return type ? this._specs().find(s => s.type === type) : undefined;
  }

  /**
   * Can be worked: enters grooming/dispatch, can be ready, belongs on a work
   * board. An unknown type — vault_notes.type is free text — is not actionable.
   */
  isActionable(type: VaultItemType | null | undefined): boolean {
    return this.spec(type)?.actionable ?? false;
  }

  /** Whether this type is gated on written acceptance criteria. */
  needsAcceptanceCriteria(type: VaultItemType | null | undefined): boolean {
    return this.spec(type)?.needsAcceptanceCriteria ?? false;
  }

  /** Label for display, falling back to the raw value for unknown types. */
  label(type: VaultItemType | null | undefined): string {
    return this.spec(type)?.label ?? String(type ?? '');
  }
}
