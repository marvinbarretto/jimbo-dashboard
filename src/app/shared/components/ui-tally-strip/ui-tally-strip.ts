import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { tallyTicks, type TallySize, type TallyVariant } from './tally';

/**
 * One tick per unit, mixed out of a tint and into alarm as the count grows.
 *
 * The board already carries a staleness gradient, and a gradient is a value you
 * have to calibrate against before it means anything. Ticks are countable: three
 * marks is three days at any glance distance, and a full strip is a full strip.
 *
 * The colour ramp is the second half of the idea. Tick 1 is drawn in the tint —
 * in practice the item's own project colour — and the tint's share falls to zero
 * by the cap, so a strip that has left its colour behind belongs to an item that
 * has left its project behind. Nothing new has to be chosen per project: the ramp
 * is derived from the `color_token` that already exists.
 *
 * Deliberately unaware of dates. It takes a number, so the same primitive draws
 * days-since-touched, days-in-column, days-to-due, or times-passed-over.
 */

@Component({
  selector: 'app-ui-tally-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tally',
    role: 'img',
    '[class]': 'cls()',
    '[attr.aria-label]': 'ariaLabel()',
    '[style.--tally-tint]': 'tint()',
  },
  template: `
    @for (tick of ticks(); track $index) {
      <i
        class="tally__tick"
        [class.tally__tick--gap]="tick.gap"
        [class.tally__tick--empty]="!tick.filled"
        [style.background]="tick.background"
      ></i>
    }
    @if (overflowing()) {
      <i class="tally__over" aria-hidden="true">&#9656;</i>
    }
  `,
  styleUrl: './ui-tally-strip.scss',
})
export class UiTallyStrip {
  /** Units to draw — typically whole days. Fractions are floored. */
  readonly days = input.required<number>();

  /**
   * Where the strip runs out of room.
   *
   * Defaults to 30, matching `ANCIENT_DAYS`: past that point the existing
   * staleness model stops escalating too, so a full strip and "as bad as this
   * measure goes" mean the same thing.
   */
  readonly cap = input(30);

  /** Tick height: 2 / 4 / 6px. Cards use `sm`. */
  readonly size = input<TallySize>('sm');

  /** `bleed` stretches ticks to the full width — reads as a meter, not a count. */
  readonly variant = input<TallyVariant>('inset');

  /** Wider gap every n ticks so groups stay countable. 0 turns grouping off. */
  readonly groupBy = input(7);

  /** Draw the unfilled remainder, so a fresh item shows how much runway it has. */
  readonly showEmpty = input(false);

  /**
   * Colour the first tick is drawn in. Defaults to the project tint the card
   * host already sets, so the ramp themes itself per project.
   */
  readonly tint = input<string>('var(--proj-tint, var(--color-border))');

  /** Colour the last tick reaches. */
  readonly alarm = input<string>('var(--color-danger)');

  /** Overrides the derived screen-reader text ("22 days, 30-day cap"). */
  readonly label = input<string | null>(null);

  /** Word for one unit in the derived label. */
  readonly unit = input<string>('day');

  /** Plural of `unit` — a naive +'s' is wrong for "pass", "match", "box". */
  readonly unitPlural = input<string | null>(null);

  /**
   * Ticks with their colour already resolved.
   *
   * The mix is built here rather than in the binding because a card can carry
   * 30 of these and a board can carry hundreds of cards: a method call in the
   * template re-runs on every change-detection pass, while a computed only
   * re-runs when one of its inputs actually changes.
   */
  protected readonly ticks = computed(() => {
    const tint = this.tint();
    const alarm = this.alarm();
    return tallyTicks(this.days(), this.cap(), this.groupBy(), this.showEmpty()).map(t => ({
      ...t,
      background: t.filled ? `color-mix(in oklch, ${tint} ${t.tintShare}%, ${alarm})` : null,
    }));
  });

  protected readonly overflowing = computed(() => Math.floor(this.days()) > this.cap());

  protected readonly cls = computed(() => {
    const maxed = Math.floor(this.days()) >= this.cap();
    return `tally tally--${this.size()} tally--${this.variant()}${maxed ? ' tally--maxed' : ''}`;
  });

  protected readonly ariaLabel = computed(() => {
    const explicit = this.label();
    if (explicit) return explicit;
    const n = Math.floor(this.days());
    const u = this.unit();
    const plural = this.unitPlural() ?? `${u}s`;
    return `${n} ${n === 1 ? u : plural}, ${this.cap()}-${u} cap`;
  });
}
