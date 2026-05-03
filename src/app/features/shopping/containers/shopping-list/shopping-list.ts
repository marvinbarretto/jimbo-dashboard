import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiFormActions } from '@shared/components/ui-form-actions/ui-form-actions';
import { ShoppingService, type CreateShoppingItemPayload } from '../../data-access/shopping.service';

@Component({
  selector: 'app-shopping-list',
  imports: [
    ReactiveFormsModule,
    UiPageHeader,
    UiCard,
    UiSection,
    UiStack,
    UiCluster,
    UiButton,
    UiBadge,
    UiEmptyState,
    UiFormActions,
  ],
  templateUrl: './shopping-list.html',
  styleUrl: './shopping-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShoppingList {
  private readonly service = inject(ShoppingService);
  private readonly fb = inject(FormBuilder);

  readonly active = this.service.active;
  readonly bought = this.service.bought;
  readonly isLoading = this.service.isLoading;

  readonly showDetails = signal(false);

  // Empty-string sentinels for optional fields are coerced to null at the
  // submit boundary — matches the actor-form pattern.
  readonly form = this.fb.nonNullable.group({
    name:  ['', Validators.required],
    qty:   [1,  [Validators.required, Validators.min(1)]],
    unit:  [''],
    store: [''],
    note:  [''],
    url:   [''],
  });

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: CreateShoppingItemPayload = {
      name:  v.name.trim(),
      qty:   v.qty || 1,
      unit:  v.unit.trim()  || null,
      store: v.store.trim() || null,
      note:  v.note.trim()  || null,
      url:   v.url.trim()   || null,
    };
    this.service.add(payload);
    this.form.reset({ name: '', qty: 1, unit: '', store: '', note: '', url: '' });
    this.showDetails.set(false);
  }

  toggleBought(id: number, currentlyBought: boolean): void {
    if (currentlyBought) this.service.markActive(id);
    else this.service.markBought(id);
  }

  remove(id: number, name: string): void {
    if (confirm(`Delete "${name}" from the list?`)) {
      this.service.remove(id);
    }
  }
}
