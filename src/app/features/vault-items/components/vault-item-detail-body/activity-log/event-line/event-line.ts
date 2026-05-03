import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { DatetimePipe } from '@shared/pipes/datetime.pipe';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { formatEvent } from '../event-formatter';
import type { VerbosityLevel } from '../verbosity';

@Component({
  selector: 'app-event-line',
  imports: [DatetimePipe],
  templateUrl: './event-line.html',
  styleUrl: './event-line.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventLineComponent {
  readonly event       = input.required<VaultActivityEvent>();
  readonly verbosity   = input<VerbosityLevel>('compact');
  // actorLabel receives the raw id and returns a display string (may include @-prefix).
  readonly actorLabel  = input<(actorId: string) => string>(a => a);
  readonly actorKind   = input<(actorId: string) => 'human' | 'agent' | 'system'>(() => 'system');

  readonly line = computed(() => formatEvent(this.event()));

  readonly showDetailed = computed(() => {
    const v = this.verbosity();
    return v === 'detailed' || v === 'debug';
  });
  readonly showDebug = computed(() => this.verbosity() === 'debug');

  readonly costChip = computed(() => {
    const e = this.event();
    if (e.type !== 'agent_run_completed') return null;
    if (e.cost_usd == null) return null;
    return `$${e.cost_usd.toFixed(4)}`;
  });
}
