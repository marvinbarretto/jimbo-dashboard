// Daily fleet activity report — per-executor (Boris/Kipper) job counts,
// model mix, cost, failures, and sustained-loop flags for a chosen logical
// day. Reads GET /api/fleet-report/daily via DailyFleetReportService, the
// same endpoint the fleet-daily-report Hermes cron skill posts to Telegram,
// so the two surfaces never drift out of sync.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiPeriodPager } from '@shared/components/ui-period-pager/ui-period-pager';
import { ActorChip } from '@shared/components/actor-chip/actor-chip';
import { actorId } from '@domain/ids';
import { logicalToday } from '@shared/utils/datetime.utils';
import { DailyFleetReportService } from '../../data-access/daily-fleet-report.service';
import type { FleetReportActor } from '@domain/dispatch';

function shiftDate(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-fleet-daily-report',
  imports: [UiStack, UiCard, UiBadge, UiEmptyState, UiStatCard, UiPeriodPager, ActorChip],
  templateUrl: './fleet-daily-report.html',
  styleUrl: './fleet-daily-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page-bleed' },
})
export class FleetDailyReport {
  private readonly service = inject(DailyFleetReportService);

  readonly loading = this.service.loading;
  readonly lastError = this.service.lastError;
  readonly actors = this.service.actors;

  // The newest navigable report is today's logical day (04:00 Europe/London
  // cutover) — computed once per page load, not a live clock. The report for
  // today is a live, on-demand query over dispatch_queue, so it's genuinely
  // partial (the day isn't over) rather than unavailable; `isAtToday` below
  // doubles as the "still in progress" flag the template uses to caveat it.
  private readonly latestDate = logicalToday();

  private readonly _selectedDate = signal(this.latestDate);
  readonly selectedDate = this._selectedDate.asReadonly();

  readonly isAtToday = computed(() => this.selectedDate() === this.latestDate);
  readonly canGoNext = computed(() => this.selectedDate() < this.latestDate);

  constructor() {
    void this.service.load(this.selectedDate());
  }

  goTo(date: string): void {
    this._selectedDate.set(date);
    void this.service.load(date);
  }

  previous(): void {
    this.goTo(shiftDate(this.selectedDate(), -1));
  }

  next(): void {
    this.goTo(shiftDate(this.selectedDate(), 1));
  }

  today(): void {
    this.goTo(this.latestDate);
  }

  actorLabel(actor: FleetReportActor) {
    return actorId(actor.executor);
  }

  formatCost(v: number): string {
    return v >= 0.005 ? `$${v.toFixed(2)}` : v > 0 ? '<$0.01' : '$0.00';
  }

  formatTokens(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return String(v);
  }

  formatTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  // Skill-level counts are too granular for a top-line summary — group by
  // flow (groom/recon/fold/commission) the same way the Telegram digest does.
  flowCounts(actor: FleetReportActor): { flow: string; count: number }[] {
    const byFlow = new Map<string, number>();
    for (const s of actor.by_skill) {
      byFlow.set(s.flow, (byFlow.get(s.flow) ?? 0) + s.count);
    }
    return [...byFlow.entries()]
      .map(([flow, count]) => ({ flow, count }))
      .sort((a, b) => b.count - a.count);
  }
}
