import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiStickyActionBar } from '@shared/components/ui-sticky-action-bar/ui-sticky-action-bar';

@Component({
  selector: 'app-vault-item-action-bar',
  imports: [UiButton, UiStickyActionBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-sticky-action-bar>
      <div uiStickyActionBarSecondary
        class="vault-item-action-bar__trail"
        role="group"
        aria-label="Item actions">
        <!-- Workflow group: reclassify / reroute the item (reversible) -->
        @if (canDemote() || canReject()) {
          <div class="vault-item-action-bar__group" role="group" aria-label="Workflow">
            @if (canDemote()) {
              <app-ui-button variant="secondary" (pressed)="demoted.emit()">→ note</app-ui-button>
            }
            @if (canReject()) {
              <app-ui-button variant="secondary" (pressed)="rejected.emit()">reject</app-ui-button>
            }
          </div>
          <span class="vault-item-action-bar__divider" aria-hidden="true"></span>
        }
        <!-- Container group: archive (reversible) + delete (destructive) -->
        <div class="vault-item-action-bar__group" role="group" aria-label="Container actions">
          <app-ui-button
            variant="ghost"
            [disabled]="isArchived()"
            (pressed)="archived.emit()">
            archive
          </app-ui-button>
          <app-ui-button variant="danger" (pressed)="deleted.emit()">delete</app-ui-button>
        </div>
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
      align-items: center;
    }

    .vault-item-action-bar__group {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      align-items: center;
    }

    .vault-item-action-bar__divider {
      width: 1px;
      align-self: stretch;
      margin: 0.1rem 0.3rem;
      background: var(--color-border);
    }

    @media (max-width: 768px) {
      .vault-item-action-bar__trail { justify-content: stretch; }
      .vault-item-action-bar__divider { display: none; }
    }
  `],
})
export class VaultItemActionBar {
  readonly canReject = input.required<boolean>();
  readonly canDemote = input.required<boolean>();
  readonly isArchived = input.required<boolean>();

  readonly rejected = output<void>();
  readonly demoted = output<void>();
  readonly archived = output<void>();
  readonly deleted = output<void>();
}
