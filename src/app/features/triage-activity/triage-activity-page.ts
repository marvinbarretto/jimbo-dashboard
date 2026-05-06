import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { relativeTime } from '@shared/utils/datetime.utils';
import { TriageActivityService, type TriageHistoryItem } from './triage-activity.service';

@Component({
  selector: 'app-triage-activity-page',
  imports: [UiBadge, UiCluster, UiEmptyState, UiPageHeader, UiStack],
  templateUrl: './triage-activity-page.html',
  styleUrl: './triage-activity-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TriageActivityPage implements OnInit, OnDestroy {
  private readonly service = inject(TriageActivityService);

  readonly items = this.service.items;
  readonly loading = this.service.loading;
  readonly lastError = this.service.lastError;
  readonly lastFetch = this.service.lastFetch;

  // Per-row expanded state — keyed by list+task. Same task only has
  // one cache row, but stable string key is future-proof if we add
  // re-runs later.
  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    this.service.start();
  }

  ngOnDestroy(): void {
    this.service.stop();
  }

  protected refresh(): void {
    void this.service.refresh();
  }

  protected rowKey(item: TriageHistoryItem): string {
    return `${item.google_list_id}::${item.google_task_id}`;
  }

  protected isExpanded(item: TriageHistoryItem): boolean {
    return this.expanded().has(this.rowKey(item));
  }

  protected toggle(item: TriageHistoryItem): void {
    const key = this.rowKey(item);
    this.expanded.update((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected taskTitle(item: TriageHistoryItem): string {
    return this.service.taskTitle(item.google_task_id) ?? `(no longer in inbox: ${item.google_task_id.slice(0, 12)}…)`;
  }

  protected isInInbox(item: TriageHistoryItem): boolean {
    return this.service.taskTitle(item.google_task_id) !== null;
  }

  protected runnerLabel(item: TriageHistoryItem): string {
    return item.debug.runner ?? 'triage-now';
  }

  protected fmtRelative = relativeTime;

  protected fmtLatency(ms: number | undefined | null): string {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60_000);
    const secs = Math.round((ms % 60_000) / 1000);
    return `${mins}m ${secs}s`;
  }

  protected fmtTokens(item: TriageHistoryItem): string {
    const u = item.debug.usage;
    const inT = u.prompt_tokens ?? 0;
    const out = u.completion_tokens ?? 0;
    if (inT === 0 && out === 0) return '—';
    return `${inT.toLocaleString()} + ${out.toLocaleString()}`;
  }

  protected typeOf(item: TriageHistoryItem): string {
    return item.proposal?.type ?? '—';
  }

  protected formatJson(value: unknown): string {
    if (value === null || value === undefined) return '';
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
