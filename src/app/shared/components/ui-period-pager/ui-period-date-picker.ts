import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import flatpickr from 'flatpickr';
import type { Instance } from 'flatpickr/dist/types/instance';
import type { Plugin } from 'flatpickr/dist/types/options';
import monthSelectPlugin from 'flatpickr/dist/plugins/monthSelect/index';
import weekSelectPlugin_ from 'flatpickr/dist/plugins/weekSelect/weekSelect';

// weekSelectPlugin types its return as Plugin<PlusWeeks> — contravariant with
// the Plugin<{}> flatpickr expects in config.plugins. The augmentation is
// added at runtime; the cast is safe.
const weekSelectPlugin = weekSelectPlugin_ as unknown as () => Plugin;
import {
  dayKeyFromDate,
  isWeekKey,
  weekKeyFromDate,
  weekStartFromKey,
} from '@shared/utils/date-keys';

type Granularity = 'day' | 'week' | 'month';

// weekSelectPlugin augments the flatpickr instance with these fields.
type WeekInstance = Instance & { weekStartDay?: Date; weekEndDay?: Date };

@Component({
  selector: 'app-ui-period-date-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (displayText(); as text) {
      <!-- Trigger mode: the formatted label IS the control; the input only
           exists for flatpickr to bind to and stays out of the a11y tree. -->
      <button
        #trigger
        type="button"
        class="period-date-picker__trigger"
        aria-haspopup="dialog"
        [attr.aria-label]="'Change ' + granularity() + ' — ' + text"
        (click)="open()">
        <span class="period-date-picker__text">{{ text }}</span>
        <span class="period-date-picker__caret" aria-hidden="true">▾</span>
      </button>
    }
    <input
      #picker
      class="period-date-picker__input"
      [class.period-date-picker__input--hidden]="displayText() !== null"
      readonly
      [attr.aria-hidden]="displayText() !== null ? 'true' : null"
      [attr.tabindex]="displayText() !== null ? -1 : null"
      [attr.aria-label]="'Pick a ' + granularity()"
    />
  `,
  host: {
    '[class.period-date-picker--trigger]': 'displayText() !== null',
  },
  styles: [`
    :host { display: inline-block; }

    .period-date-picker__input {
      height: 2rem;
      padding: 0 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      width: auto;
      min-width: 7rem;

      &:focus-visible {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: var(--focus-ring);
      }
    }

    .period-date-picker__input--hidden {
      position: absolute;
      width: 0;
      height: 0;
      min-width: 0;
      padding: 0;
      border: none;
      opacity: 0;
      pointer-events: none;
    }

    // Trigger mode fills whatever the parent gives it and centres the label,
    // so varying date-string lengths don't reshape the surrounding control.
    :host(.period-date-picker--trigger) {
      display: flex;
    }

    .period-date-picker__trigger {
      appearance: none;
      display: inline-flex;
      flex: 1;
      justify-content: center;
      align-items: baseline;
      gap: 0.45rem;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      padding: 0;
      cursor: pointer;

      &:hover .period-date-picker__caret { color: var(--color-accent); }

      &:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
        border-radius: var(--radius);
      }
    }

    .period-date-picker__caret {
      font-size: 0.6em;
      color: var(--color-text-muted);
    }
  `],
})
export class UiPeriodDatePicker {
  readonly granularity = input.required<Granularity>();
  readonly value = input<string>('');
  /** When set, renders this label as a button that opens the calendar instead
   * of showing the raw input — lets a page title double as the date control.
   * Decided at first render; a later null↔text flip won't re-anchor the popup. */
  readonly displayText = input<string | null>(null);
  readonly dateChange = output<string>();

  private readonly pickerRef = viewChild.required<ElementRef<HTMLInputElement>>('picker');
  private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private fp: Instance | null = null;
  private readonly destroyRef = inject(DestroyRef);

  protected open(): void {
    this.fp?.open();
  }

  constructor() {
    afterNextRender(() => {
      this.initFlatpickr(this.pickerRef().nativeElement);
    });

    effect(() => {
      const v = this.value();
      if (!this.fp) return;
      const gran = this.granularity();
      if (gran === 'week') {
        if (isWeekKey(v)) this.fp.setDate(weekStartFromKey(v), false);
      } else {
        this.fp.setDate(v || '', false);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.fp?.destroy();
      this.fp = null;
    });
  }

  private initFlatpickr(el: HTMLInputElement): void {
    const gran = this.granularity();
    const initial = this.value();

    const locale = { firstDayOfWeek: 1 };
    // In trigger mode the input is visually collapsed — anchor the popup to
    // the visible button instead.
    const anchor = this.triggerRef()?.nativeElement;
    const position = anchor ? { positionElement: anchor } : {};

    if (gran === 'month') {
      this.fp = flatpickr(el, {
        locale,
        ...position,
        plugins: [monthSelectPlugin({ shorthand: false, dateFormat: 'Y-m', altFormat: 'F Y' })],
        defaultDate: initial || undefined,
        onChange: (dates) => {
          if (!dates[0]) return;
          const y = dates[0].getFullYear();
          const m = String(dates[0].getMonth() + 1).padStart(2, '0');
          this.dateChange.emit(`${y}-${m}`);
        },
      }) as Instance;
    } else if (gran === 'week') {
      const defaultDate = isWeekKey(initial) ? weekStartFromKey(initial) : undefined;
      this.fp = flatpickr(el, {
        locale,
        ...position,
        plugins: [weekSelectPlugin()],
        weekNumbers: true,
        defaultDate,
        onChange: (dates) => {
          if (!dates[0]) return;
          // weekSelectPlugin highlights the full row but keeps single-mode selection.
          // weekKeyFromDate uses Thursday-trick ISO week arithmetic.
          this.dateChange.emit(weekKeyFromDate(dates[0]));
        },
      }) as Instance as WeekInstance;
    } else {
      this.fp = flatpickr(el, {
        locale,
        ...position,
        dateFormat: 'Y-m-d',
        defaultDate: initial || undefined,
        onChange: (dates) => {
          if (!dates[0]) return;
          this.dateChange.emit(dayKeyFromDate(dates[0]));
        },
      }) as Instance;
    }
  }
}
