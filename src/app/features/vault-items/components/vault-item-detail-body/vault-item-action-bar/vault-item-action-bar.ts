import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiStickyActionBar } from '@shared/components/ui-sticky-action-bar/ui-sticky-action-bar';

@Component({
  selector: 'app-vault-item-action-bar',
  imports: [UiButton, UiStickyActionBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-sticky-action-bar>
      <app-ui-button
        uiStickyActionBarPrimary
        variant="primary"
        (pressed)="goToEdit()">
        edit
      </app-ui-button>
      <div uiStickyActionBarSecondary
        class="vault-item-action-bar__trail"
        role="group"
        aria-label="Secondary actions">
        @if (canReject()) {
          <app-ui-button variant="secondary" (pressed)="rejected.emit()">reject</app-ui-button>
        }
        <app-ui-button
          variant="secondary"
          [disabled]="isArchived()"
          (pressed)="archived.emit()">
          archive
        </app-ui-button>
        <app-ui-button variant="danger" (pressed)="deleted.emit()">delete</app-ui-button>
      </div>
    </app-ui-sticky-action-bar>
  `,
  styles: [`
    :host { display: contents; }

    .vault-item-action-bar__trail {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      justify-content: flex-end;
    }

    @media (max-width: 768px) {
      .vault-item-action-bar__trail { justify-content: stretch; }
    }
  `],
})
export class VaultItemActionBar {
  readonly editRoute = input.required<readonly (string | number)[]>();
  readonly canReject = input.required<boolean>();
  readonly isArchived = input.required<boolean>();

  readonly rejected = output<void>();
  readonly archived = output<void>();
  readonly deleted = output<void>();

  private readonly router = inject(Router);

  goToEdit(): void {
    this.router.navigate([...this.editRoute()]);
  }
}
