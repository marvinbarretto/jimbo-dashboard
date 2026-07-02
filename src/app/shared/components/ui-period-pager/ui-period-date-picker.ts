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
  template: `<input
    #picker
    class="period-date-picker__input"
    readonly
    [attr.aria-label]="'Pick a ' + granularity()"
  />`,
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
  `],
})
export class UiPeriodDatePicker {
  readonly granularity = input.required<Granularity>();
  readonly value = input<string>('');
  readonly dateChange = output<string>();

  private readonly pickerRef = viewChild.required<ElementRef<HTMLInputElement>>('picker');
  private fp: Instance | null = null;
  private readonly destroyRef = inject(DestroyRef);

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

    if (gran === 'month') {
      this.fp = flatpickr(el, {
        locale,
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
