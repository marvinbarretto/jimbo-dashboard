import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { JournalDatePicker } from '../journal-date-picker/journal-date-picker';

@Component({
  selector: 'app-journal-pager',
  imports: [UiButton, JournalDatePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="journal-pager">
      <div class="journal-pager__main">
        <p class="journal-pager__eyebrow">{{ eyebrow() }}</p>
        <h1 class="journal-pager__title">{{ title() }}</h1>
        @if (subtitle(); as s) {
          <p class="journal-pager__subtitle">{{ s }}</p>
        }
      </div>

      <div class="journal-pager__controls">
        <app-ui-button variant="ghost" size="sm" ariaLabel="Previous" (pressed)="previous.emit()">‹</app-ui-button>
        @if (!isAtToday()) {
          <app-ui-button variant="ghost" size="sm" (pressed)="today.emit()">Today</app-ui-button>
        }
        <app-ui-button variant="ghost" size="sm" [disabled]="!canGoNext()" ariaLabel="Next" (pressed)="next.emit()">›</app-ui-button>
        <app-journal-date-picker
          [granularity]="granularity()"
          [value]="value()"
          (dateChange)="dateChange.emit($event)"
        />
      </div>
    </header>
  `,
  styles: [`
    .journal-pager {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 1rem;
    }

    .journal-pager__eyebrow {
      margin: 0;
      font-size: 0.65rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    .journal-pager__title {
      margin: 0.15rem 0 0;
      font-size: 1.6rem;
      font-weight: 600;
      line-height: 1.15;
    }

    .journal-pager__subtitle {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      color: var(--color-text-soft);
    }

    .journal-pager__controls {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
  `],
})
export class JournalPager {
  readonly granularity = input.required<'day' | 'week' | 'month'>();
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly eyebrow = input<string>('Journal');
  readonly isAtToday = input<boolean>(false);
  readonly canGoNext = input<boolean>(true);
  readonly value = input<string>('');

  readonly previous = output<void>();
  readonly next = output<void>();
  readonly today = output<void>();
  readonly dateChange = output<string>();
}
