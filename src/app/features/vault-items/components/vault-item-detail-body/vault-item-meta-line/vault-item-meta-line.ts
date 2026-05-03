import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-vault-item-meta-line',
  imports: [UiButton, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vault-item-meta-line">
      <span>created {{ createdAt() | relativeTime }}</span>
      @if (lastActivityAt(); as lat) {
        <span>· last activity {{ lat | relativeTime }}</span>
      }
      @if (completedAt(); as ct) {
        <span>· completed {{ ct | relativeTime }}</span>
      }
      @if (archivedAt(); as at) {
        <span>· archived {{ at | relativeTime }}</span>
      }
      @if (dueAt(); as d) {
        <span>· due {{ d }}</span>
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
    :host {
      display: block;
    }

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
