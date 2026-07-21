// Reusable 1-N tap-to-score picker — generalised from the retro screen's
// hand-rolled mood buttons. One row of number buttons under a label; used for
// both mood and energy on the check-in page and the pomo retro screen.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-ui-score-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="score-picker">
      <span class="score-picker__label">{{ label() }}</span>
      <div class="score-picker__row">
        @for (n of options(); track n) {
          <button
            type="button"
            class="score-picker__btn"
            [class.score-picker__btn--active]="value() === n"
            [attr.aria-label]="label() + ' ' + n"
            (click)="pick(n)">
            {{ n }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .score-picker {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .score-picker__label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-text-soft);
    }

    .score-picker__row {
      display: flex;
      gap: 0.4rem;
    }

    .score-picker__btn {
      display: grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      font: inherit;
      font-weight: 600;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text-soft);
      cursor: pointer;
      transition: border-color 80ms ease, background 80ms ease, color 80ms ease;

      &:hover {
        border-color: var(--color-text-soft);
        color: var(--color-text);
      }

      &--active {
        border-color: var(--color-accent);
        background: color-mix(in srgb, var(--color-accent) 12%, transparent);
        color: var(--color-text);
      }
    }
  `],
})
export class UiScorePicker {
  readonly label = input.required<string>();
  readonly max = input(5);
  readonly value = input<number | null>(null);
  readonly picked = output<number>();

  readonly options = computed(() => Array.from({ length: this.max() }, (_, i) => i + 1));

  pick(n: number): void {
    this.picked.emit(n);
  }
}
