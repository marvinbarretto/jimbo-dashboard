import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Compact labelled progress bar: a label, a `current / target` readout, and a
 * fill that turns "done" green once the target is met. Driven by plain numbers
 * so any caller can point it at a daily goal, an epic's completion, etc.
 *
 * Two optional reference points, for "am I on track" at a glance:
 * - `pace`: where you'd be right now if progress were even (e.g. time-of-day
 *   fraction of a daily target, or day-of-week fraction of a weekly one) —
 *   rendered as a tick on the track, directly comparable to the fill.
 * - `compareLabel`/`compareValue`: a prior-period figure (e.g. "last week") —
 *   rendered as a caption below the bar. A second tick on a 6px track would
 *   be unreadable noise; a number reads as a fact.
 */
@Component({
  selector: 'app-ui-progress-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="meter">
      <div class="meter__head">
        <span class="meter__label">{{ label() }}</span>
        <span class="meter__value">
          {{ current() }}<span class="meter__target">/{{ target() }}{{ unit() ? ' ' + unit() : '' }}</span>
        </span>
      </div>
      <div
        class="meter__track"
        role="progressbar"
        [attr.aria-valuenow]="current()"
        [attr.aria-valuemin]="0"
        [attr.aria-valuemax]="target()"
        [attr.aria-label]="label()">
        <div class="meter__fill" [class.meter__fill--done]="done()" [style.width.%]="pct()"></div>
        @if (pacePct(); as pp) {
          <div class="meter__pace" [style.left.%]="pp" [attr.title]="'On track: ' + pace() + (unit() ? ' ' + unit() : '')"></div>
        }
      </div>
      @if (compareLabel() && compareValue() !== null) {
        <p class="meter__compare">{{ compareLabel() }}: {{ compareValue() }}{{ unit() ? ' ' + unit() : '' }}</p>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }

    .meter__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.3rem;
    }

    .meter__label {
      font-size: 0.72rem;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meter__value {
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
      color: var(--color-text);
      white-space: nowrap;
    }

    .meter__target { color: var(--color-text-muted); }

    .meter__track {
      position: relative;
      height: 6px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-text-muted) 18%, transparent);
      overflow: visible;
    }

    .meter__fill {
      height: 100%;
      border-radius: inherit;
      background: var(--color-accent);
      transition: width 0.3s ease;
      overflow: hidden;
    }

    .meter__fill--done {
      background: var(--color-success, #34d399);
    }

    // "Where you'd be if on track" — a thin tick standing slightly proud of
    // the track so it reads against either a short or a full fill.
    .meter__pace {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 2px;
      border-radius: 1px;
      background: var(--color-text-muted);
      opacity: 0.85;
    }

    .meter__compare {
      margin: 0.3rem 0 0;
      font-size: 0.68rem;
      color: var(--color-text-muted);
    }
  `],
})
export class UiProgressMeter {
  readonly label = input.required<string>();
  readonly current = input.required<number>();
  readonly target = input.required<number>();
  readonly unit = input<string>('');

  readonly pace = input<number | null>(null);
  readonly compareLabel = input<string | null>(null);
  readonly compareValue = input<number | null>(null);

  // Clamp the fill to the target; overshoot still reads "done" but never spills
  // past a full bar. A zero/absent target shows a full bar once anything lands.
  protected readonly pct = computed(() => {
    const t = this.target();
    if (t <= 0) return this.current() > 0 ? 100 : 0;
    return Math.min(100, Math.round((this.current() / t) * 100));
  });

  protected readonly done = computed(() => this.target() > 0 && this.current() >= this.target());

  protected readonly pacePct = computed(() => {
    const p = this.pace();
    const t = this.target();
    if (p === null || t <= 0) return null;
    return Math.min(100, Math.max(0, Math.round((p / t) * 100)));
  });
}
