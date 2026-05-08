import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import type { DispatchQueueEntry, DispatchStatus } from '@domain/dispatch/dispatch-queue-entry';

@Component({
  selector: 'app-actor-dispatch-row',
  imports: [RouterLink, UiBadge, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="actor-dispatch-row">
      <span class="actor-dispatch-row__skill">{{ dispatch().skill }}</span>
      @if (dispatch().task_seq) {
        <a [routerLink]="['/vault-items', dispatch().task_seq]" class="actor-dispatch-row__seq">
          #{{ dispatch().task_seq }}
        </a>
      }
      <app-ui-badge [tone]="statusTone(dispatch().status)">{{ dispatch().status }}</app-ui-badge>
      <span class="actor-dispatch-row__time">
        {{ (dispatch().completed_at ?? dispatch().created_at) | relativeTime }}
      </span>
    </div>
  `,
  styles: [`
    .actor-dispatch-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0;
      font-size: 0.875rem;
    }
    .actor-dispatch-row__skill {
      flex: 1;
      font-family: var(--font-mono, monospace);
      font-size: 0.8rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .actor-dispatch-row__seq {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-decoration: none;
    }
    .actor-dispatch-row__seq:hover {
      text-decoration: underline;
    }
    .actor-dispatch-row__time {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      white-space: nowrap;
    }
  `],
})
export class ActorDispatchRow {
  readonly dispatch = input.required<DispatchQueueEntry>();

  statusTone(status: DispatchStatus): 'success' | 'warning' | 'neutral' | 'accent' {
    switch (status) {
      case 'completed': return 'success';
      case 'failed':    return 'warning';
      case 'running':   return 'accent';
      default:          return 'neutral';
    }
  }
}
