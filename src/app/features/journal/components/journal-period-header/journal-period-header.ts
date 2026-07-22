import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { UiPeriodPager } from '@shared/components/ui-period-pager/ui-period-pager';
import { UiSegmented, type UiSegmentedOption } from '@shared/components/ui-segmented/ui-segmented';
import {
  type DayKey,
  formatDayLong,
  formatWeekRange,
  isDayKey,
  isMonthKey,
  isWeekKey,
  monthRange,
  shiftDay,
  shiftMonth,
  shiftWeek,
  todayKey,
} from '@shared/utils/date-keys';
import {
  type JournalGranularity,
  currentKeyFor,
  peerKeys,
  periodContainsToday,
} from '../../utils/period-links';

/**
 * Period navigation for a journal domain page: one header cluster holding the
 * title, the Day | Week | Month switch and the prev/today/next pager (the
 * switch is projected into the pager's controls so nothing floats loose).
 * Granularity changes preserve the point-in-time — a March day's Week lands
 * on the week containing it. Owns all navigation; domain pages only render
 * content.
 */
@Component({
  selector: 'app-journal-period-header',
  imports: [UiPeriodPager, UiSegmented],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-period-pager
      [granularity]="granularity()"
      [title]="title()"
      [subtitle]="subtitle()"
      [isAtToday]="isCurrent()"
      [value]="key()"
      (previous)="shift(-1)"
      (next)="shift(1)"
      (today)="goCurrent()"
      (dateChange)="onKeyInput($event)"
    >
      @if (granularities().length > 1) {
        <app-ui-segmented
          period-pager-actions
          [options]="grainOptions()"
          [value]="granularity()"
          ariaLabel="Granularity"
          (changed)="onGranularity($event)"
        />
      }
    </app-ui-period-pager>
  `,
})
export class JournalPeriodHeader {
  private readonly router = inject(Router);

  readonly domain = input.required<string>();
  readonly granularity = input.required<JournalGranularity>();
  readonly key = input.required<string>();
  /** Granularities this domain supports (Overview is day-only). */
  readonly granularities = input<readonly JournalGranularity[]>(['day', 'week', 'month']);

  protected readonly grainOptions = computed<UiSegmentedOption[]>(() =>
    this.granularities().map(g => ({
      value: g,
      label: g === 'day' ? 'Day' : g === 'week' ? 'Week' : 'Month',
    })));

  private readonly peers = computed(() => peerKeys(this.granularity(), this.key()));
  protected readonly isCurrent = computed(() => periodContainsToday(this.granularity(), this.key()));

  protected readonly title = computed(() => {
    const key = this.key();
    switch (this.granularity()) {
      case 'day': return formatDayLong(key);
      case 'week': return key;
      case 'month': return formatMonthLabel(key);
    }
  });

  protected readonly subtitle = computed(() => {
    const key = this.key();
    switch (this.granularity()) {
      case 'day': return relativeDayLabel(key);
      case 'week': return formatWeekRange(key);
      case 'month': return '';
    }
  });

  protected onGranularity(value: string): void {
    const g = value as JournalGranularity;
    if (!this.granularities().includes(g) || g === this.granularity()) return;
    this.router.navigate(['/journal', this.domain(), g, this.peers()[g]]);
  }

  protected shift(delta: number): void {
    const key = this.key();
    switch (this.granularity()) {
      case 'day': return this.navigate(shiftDay(key, delta));
      case 'week': return this.navigate(shiftWeek(key, delta));
      case 'month': return this.navigate(shiftMonth(key, delta));
    }
  }

  protected goCurrent(): void {
    this.navigate(currentKeyFor(this.granularity()));
  }

  protected onKeyInput(value: string): void {
    const ok = this.granularity() === 'day' ? isDayKey(value)
      : this.granularity() === 'week' ? isWeekKey(value)
      : isMonthKey(value);
    if (ok) this.navigate(value);
  }

  private navigate(key: string): void {
    this.router.navigate(['/journal', this.domain(), this.granularity(), key]);
  }
}

function formatMonthLabel(key: string): string {
  const { start } = monthRange(key);
  return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

// Friendly subtitle: "Today", "Yesterday", "3 days ago", "in 2 days".
function relativeDayLabel(key: DayKey): string {
  const today = todayKey();
  if (key === today) return 'Today';
  if (shiftDay(key, 1) === today) return 'Yesterday';
  if (shiftDay(key, -1) === today) return 'Tomorrow';
  const diff = Math.round(
    (new Date(key).getTime() - new Date(today).getTime()) / 86_400_000,
  );
  return diff < 0 ? `${Math.abs(diff)} days ago` : `in ${diff} days`;
}
