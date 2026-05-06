import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-ui-refresh-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiCluster, RelativeTimePipe],
  template: `
    <app-ui-cluster gap="sm" align="center">
      @if (lastFetch(); as ts) {
        <span class="ui-refresh-control__fresh" [title]="ts">
          updated {{ ts | relativeTime }}
        </span>
      }
      <button
        type="button"
        class="ui-refresh-control__btn"
        [disabled]="loading()"
        (click)="refresh.emit()"
      >{{ loading() ? '…' : '↻' }} {{ label() }}</button>
    </app-ui-cluster>
  `,
  styles: [`
    .ui-refresh-control__fresh {
      font-size: 0.7rem;
      color: var(--color-text-muted);
      font-style: italic;
    }

    .ui-refresh-control__btn {
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 0.15rem 0.5rem;
      font: inherit;
      font-size: 0.72rem;
      color: var(--color-text-muted);
      cursor: pointer;
    }

    .ui-refresh-control__btn:hover:not(:disabled) {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    .ui-refresh-control__btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `],
})
export class UiRefreshControl {
  readonly loading = input(false);
  readonly lastFetch = input<string | null>(null);
  readonly label = input('refresh');

  readonly refresh = output<void>();
}
