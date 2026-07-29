import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
  imports: [UiPeriodDatePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="period-pager">
      <div class="period-pager__main">
        @if (eyebrow()) {
          <p class="period-pager__eyebrow">{{ eyebrow() }}</p>
        }
        <!-- The title IS the date control: arrows flank it, clicking it opens
             the calendar. One component instead of a title plus a floating
             arrows/picker cluster. -->
        <div class="period-pager__stepper">
          <button
            type="button"
            class="period-pager__step"
            aria-label="Previous"
            (click)="previous.emit()">‹</button>
          <h1 class="period-pager__title">
            <app-ui-period-date-picker
              [displayText]="title()"
              [granularity]="granularity()"
              [value]="value()"
              (dateChange)="dateChange.emit($event)"
            />
          </h1>
          <button
            type="button"
            class="period-pager__step"
            [disabled]="!canGoNext()"
            aria-label="Next"
            (click)="next.emit()">›</button>
        </div>
        @if (subtitle(); as s) {
          <p class="period-pager__subtitle">{{ s }}</p>
        }
      </div>

      <div class="period-pager__controls">
        <!-- Page-supplied controls that belong with the period chrome (e.g.
             the journal's Day/Week/Month switch) — projected so the whole
             navigation cluster reads as one unit instead of orphan rows. -->
        <ng-content select="[period-pager-actions]" />
      </div>
    </header>
  `,
  styles: [`
    .period-pager {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      gap: 1rem;
      flex-wrap: wrap;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 1rem;
    }

    .period-pager__main {
      width: 100%;
    }

    .period-pager__eyebrow {
      margin: 0 0 0.3rem;
      font-size: 0.65rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    .period-pager__title {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 600;
      line-height: 1.15;
      display: flex;
      align-items: center;
      padding: 0.2rem 0.9rem;
      flex: 1;
      min-width: 0;

      app-ui-period-date-picker {
        flex: 1;
        min-width: 0;
      }
    }

    .period-pager__subtitle {
      margin: 0.3rem 0 0;
      font-size: 0.85rem;
      color: var(--color-text-soft);
    }

    .period-pager__controls {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .period-pager__stepper {
      width: 100%;
      display: inline-flex;
      align-items: stretch;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      

      > * + * {
        border-left: 1px solid var(--color-border);
      }
    }

    .period-pager__step {
      appearance: none;
      border: none;
      background: transparent;
      color: var(--color-text-soft);
      font: inherit;
      font-size: 1rem;
      line-height: 1;
      min-width: 2.3rem;
      padding: 0 0.6rem;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: var(--color-surface-raised);
        color: var(--color-accent);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: none;
        box-shadow: inset 0 0 0 2px var(--color-accent);
      }
    }

    @media (max-width: 768px) {
      .period-pager {
        padding-bottom: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .period-pager__title {
        font-size: 1.25rem;
        padding: 0.3rem 0.5rem;
      }

      .period-pager__step {
        min-width: 2.75rem;
        min-height: 2.75rem;
        font-size: 1.2rem;
      }
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
