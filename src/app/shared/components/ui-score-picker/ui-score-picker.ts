// Reusable tap-to-score picker — generalised from the retro screen's
// hand-rolled mood buttons. One row of labelled buttons; used for both mood
// and energy on the check-in page and the pomo retro screen.
//
// Word anchors, not bare numbers — a number alone has no fixed meaning across
// days and pulls toward always tapping the middle. `options` is the ordered
// list of labels (index 0 = value 1, etc.) — deliberately no numeric
// fallback, since every real use of this picker has real words to say.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-ui-score-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="score-picker">
      <span class="score-picker__label">{{ label() }}</span>
      <div class="score-picker__row">
        @for (opt of indexed(); track opt.value) {
          <button
            type="button"
            class="score-picker__btn"
            [class.score-picker__btn--active]="value() === opt.value"
            [attr.aria-label]="label() + ' ' + opt.text"
            (click)="pick(opt.value)">
            {{ opt.text }}
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
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .score-picker__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 0.85rem;
      font: inherit;
      font-size: 0.85rem;
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
  readonly options = input.required<readonly string[]>();
  readonly value = input<number | null>(null);
  readonly picked = output<number>();

  readonly indexed = computed(() => this.options().map((text, i) => ({ value: i + 1, text })));

  pick(n: number): void {
    this.picked.emit(n);
  }
}
