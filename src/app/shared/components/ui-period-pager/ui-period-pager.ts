import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiPeriodDatePicker } from './ui-period-date-picker';

/**
 * Header for a day/week/month-scoped page: title + prev/today/next controls +
 * a granularity-aware date picker. Generic over the feature — journal,
 * exercise, nutrition (and future trackers) all navigate periods the same
 * way, so this owns only the chrome; each page supplies its own title/value
 * and reacts to the outputs by navigating its own routes.
 */
@Component({
  selector: 'app-ui-period-pager',
  imports: [UiButton, UiPeriodDatePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="period-pager">
      <div class="period-pager__main">
        <p class="period-pager__eyebrow">{{ eyebrow() }}</p>
        <h1 class="period-pager__title">{{ title() }}</h1>
        @if (subtitle(); as s) {
          <p class="period-pager__subtitle">{{ s }}</p>
        }
      </div>

      <div class="period-pager__controls">
        <!-- Page-supplied controls that belong with the period chrome (e.g.
             the journal's Day/Week/Month switch) — projected so the whole
             navigation cluster reads as one unit instead of orphan rows. -->
        <ng-content select="[period-pager-actions]" />
        <app-ui-button variant="ghost" size="sm" ariaLabel="Previous" (pressed)="previous.emit()">‹</app-ui-button>
        @if (!isAtToday()) {
          <app-ui-button variant="ghost" size="sm" (pressed)="today.emit()">Today</app-ui-button>
        }
        <app-ui-button variant="ghost" size="sm" [disabled]="!canGoNext()" ariaLabel="Next" (pressed)="next.emit()">›</app-ui-button>
        <app-ui-period-date-picker
          [granularity]="granularity()"
          [value]="value()"
          (dateChange)="dateChange.emit($event)"
        />
      </div>
    </header>
  `,
  styles: [`
    .period-pager {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 1rem;
    }

    .period-pager__eyebrow {
      margin: 0;
      font-size: 0.65rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    .period-pager__title {
      margin: 0.15rem 0 0;
      font-size: 1.6rem;
      font-weight: 600;
      line-height: 1.15;
    }

    .period-pager__subtitle {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      color: var(--color-text-soft);
    }

    .period-pager__controls {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
  `],
})
export class UiPeriodPager {
  readonly granularity = input.required<'day' | 'week' | 'month'>();
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly eyebrow = input<string>('');
  readonly isAtToday = input<boolean>(false);
  readonly canGoNext = input<boolean>(true);
  readonly value = input<string>('');

  readonly previous = output<void>();
  readonly next = output<void>();
  readonly today = output<void>();
  readonly dateChange = output<string>();
}
