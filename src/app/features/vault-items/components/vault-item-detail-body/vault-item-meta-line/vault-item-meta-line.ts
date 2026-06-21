import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiTimestamp } from '@shared/components/ui-timestamp/ui-timestamp';

@Component({
  selector: 'app-vault-item-meta-line',
  imports: [UiButton, UiTimestamp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vault-item-meta-line">
      <span>created <app-ui-timestamp [value]="createdAt()" /></span>
      @if (lastActivityAt(); as lat) {
        <span>· last activity <app-ui-timestamp [value]="lat" /></span>
      }
      @if (completedAt(); as ct) {
        <span>· completed <app-ui-timestamp [value]="ct" /></span>
      }
      @if (archivedAt(); as at) {
        <span>· archived <app-ui-timestamp [value]="at" /></span>
      }
      @if (dueAt(); as d) {
        <span>· due <app-ui-timestamp [value]="d" /></span>
      }
      @if (rationale(); as r) {
        <span class="vault-item-meta-line__rationale">
          · rationale:
          @if (rationaleExpanded()) {
            {{ r }}
            <app-ui-button size="sm" variant="ghost" (pressed)="toggleRationale.emit()">collapse</app-ui-button>
          } @else {
            <em>"{{ truncatedRationale() }}"</em>
            <app-ui-button size="sm" variant="ghost" (pressed)="toggleRationale.emit()">expand</app-ui-button>
          }
        </span>
      }
    </div>
  `,
  styles: [`
    .vault-item-meta-line {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      align-items: center;
      font-size: 0.7rem;
      color: var(--color-text-muted);
      line-height: 1.5;
    }

    .vault-item-meta-line__rationale {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.2rem;
      align-items: center;
    }

    .vault-item-meta-line__rationale em {
      font-style: italic;
    }
  `],
})
export class VaultItemMetaLine {
  readonly createdAt = input.required<string>();
  readonly lastActivityAt = input<string | undefined>(undefined);
  readonly completedAt = input<string | null>(null);
  readonly archivedAt = input<string | null>(null);
  readonly dueAt = input<string | null>(null);
  readonly rationale = input<string | null>(null);
  readonly rationaleExpanded = input<boolean>(false);

  readonly toggleRationale = output<void>();

  readonly truncatedRationale = computed(() => {
    const r = this.rationale();
    if (!r) return '';
    return r.length > 80 ? r.slice(0, 80) + '…' : r;
  });
}
