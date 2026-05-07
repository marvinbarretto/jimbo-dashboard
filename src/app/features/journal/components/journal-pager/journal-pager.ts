import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';

@Component({
  selector: 'app-journal-pager',
  imports: [UiButton],
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
        @if (showDateInput()) {
          <input
            type="date"
            class="journal-pager__date"
            [value]="dateValue()"
            (change)="onDateInput($event)"
            [attr.aria-label]="'Pick a ' + granularity()"
          />
        } @else if (granularity() === 'month') {
          <input
            type="month"
            class="journal-pager__date"
            [value]="monthValue()"
            (change)="onMonthInput($event)"
            aria-label="Pick a month"
          />
        }
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

    .journal-pager__date {
      height: 2rem;
      padding: 0 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
      font-size: 0.85rem;
      color-scheme: light dark;
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
  readonly dateValue = input<string>(''); // YYYY-MM-DD for date input
  readonly monthValue = input<string>(''); // YYYY-MM for month input

  readonly previous = output<void>();
  readonly next = output<void>();
  readonly today = output<void>();
  readonly dateChange = output<string>();

  readonly showDateInput = computed(() => this.granularity() === 'day' || this.granularity() === 'week');

  onDateInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.dateChange.emit(value);
  }

  onMonthInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.dateChange.emit(value);
  }
}
