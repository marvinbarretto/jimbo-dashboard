import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KanbanCardLinkDirective } from '@shared/kanban/card-link.directive';
import type { DispatchQueueEntry } from '@domain/dispatch';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { DispatchStatusBadge } from '@shared/components/dispatch-status-badge/dispatch-status-badge';

// Presentation-only card for the execution kanban. Shows a single dispatch
// entry joined with light context about the vault item it's working on.
// All joined data is passed in as inputs; the card knows nothing about
// services. Emits a (retry) event when the operator hits the retry button
// on a failed dispatch — board calls dispatch.service.retry().
@Component({
  selector: 'app-execution-card',
  imports: [RouterLink, KanbanCardLinkDirective, EntityChip, DispatchStatusBadge],
  templateUrl: './execution-card.html',
  styleUrl: './execution-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecutionCard {
  readonly dispatch          = input.required<DispatchQueueEntry>();
  readonly taskSeq           = input<number | null>(null);
  readonly taskTitle         = input<string | null>(null);
  readonly skillDisplayName  = input<string | null>(null);
  readonly project           = input<{ id: string; display_name: string; color_token: string | null } | null>(null);
  readonly sourceKind        = input<string | null>(null);

  readonly retry = output<void>();

  readonly canRetry = computed(() => this.dispatch().status === 'failed');
  readonly isGitHubTask = computed(() => this.sourceKind() === 'github');

  // Compact runtime label — the operator's eye sees this and knows roughly how
  // long the entry has been in its current state without doing arithmetic.
  //   approved    → "queued 3m ago"
  //   dispatching → "claiming…"
  //   running     → "5m elapsed"
  //   completed   → "ran 47s"
  //   failed      → "failed after 23s"
  readonly runtimeLabel = computed(() => {
    const d = this.dispatch();
    switch (d.status) {
      case 'approved':    return `queued ${this.deltaFromNow(d.created_at)}`;
      case 'dispatching': return 'claiming…';
      case 'running':     return d.started_at ? `${this.deltaFromNow(d.started_at)} elapsed` : 'starting…';
      case 'completed':   return d.started_at && d.completed_at ? `ran ${this.delta(d.started_at, d.completed_at)}` : 'done';
      case 'failed':      return d.started_at && d.completed_at ? `failed after ${this.delta(d.started_at, d.completed_at)}` : 'failed';
    }
  });

  // Compact "Nm Ns" / "Nh Nm" style. Caller passes start + end (or end = now).
  private delta(fromIso: string, toIso: string): string {
    const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
    return this.formatDuration(ms);
  }
  private deltaFromNow(fromIso: string): string {
    return this.delta(fromIso, new Date().toISOString());
  }
  private formatDuration(ms: number): string {
    if (ms < 1000)        return `${Math.max(0, ms)}ms`;
    const sec = Math.floor(ms / 1000);
    if (sec < 60)         return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60)         return `${min}m ${sec % 60}s`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24)         return `${hrs}h ${min % 60}m`;
    return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
  }

  onRetry(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.retry.emit();
  }
}
