import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UiPeriodPager } from '@shared/components/ui-period-pager/ui-period-pager';
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
 * Period navigation for a journal domain page: prev/next/today pager plus
 * Day | Week | Month peer links that preserve the point-in-time (viewing a
 * March day → Week lands on the week containing it). Owns the router
 * navigation so domain pages only render content.
 */
@Component({
  selector: 'app-journal-period-header',
  imports: [RouterLink, UiPeriodPager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-period-pager
      [granularity]="granularity()"
      eyebrow="Journal"
      [title]="title()"
      [subtitle]="subtitle()"
      [isAtToday]="isCurrent()"
      [value]="key()"
      (previous)="shift(-1)"
      (next)="shift(1)"
      (today)="goCurrent()"
      (dateChange)="onKeyInput($event)"
    />
    @if (granularities().length > 1) {
      <nav class="jph__grains" aria-label="Granularity">
        @for (g of granularities(); track g) {
          <a
            class="jph__grain"
            [class.jph__grain--active]="g === granularity()"
            [routerLink]="['/journal', domain(), g, peers()[g]]"
          >{{ GRAIN_LABEL[g] }}</a>
        }
      </nav>
    }
  `,
  styles: [`
    :host { display: block; }

    .jph__grains {
      display: flex;
      gap: 0.25rem;
      margin-top: 0.5rem;
    }

    .jph__grain {
      font-size: 0.75rem;
      padding: 0.25rem 0.7rem;
      border-radius: 999px;
      color: var(--color-text-muted);
      text-decoration: none;
      border: 1px solid var(--color-border);

      &:hover { color: var(--color-text); }

      &--active {
        color: var(--color-accent);
        border-color: color-mix(in oklab, var(--color-accent) 45%, transparent);
        background: color-mix(in oklab, var(--color-accent) 10%, transparent);
      }
    }
  `],
})
export class JournalPeriodHeader {
  private readonly router = inject(Router);

  readonly domain = input.required<string>();
  readonly granularity = input.required<JournalGranularity>();
  readonly key = input.required<string>();
  /** Granularities this domain supports (Overview is day-only). */
  readonly granularities = input<readonly JournalGranularity[]>(['day', 'week', 'month']);

  protected readonly GRAIN_LABEL: Record<JournalGranularity, string> = {
    day: 'Day', week: 'Week', month: 'Month',
  };

  protected readonly peers = computed(() => peerKeys(this.granularity(), this.key()));
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
