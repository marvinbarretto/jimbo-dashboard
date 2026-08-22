import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Item lifecycle states that mean "what you are reading is not live work".
 * `done` is deliberately distinct from `archived`: finished and abandoned are
 * different facts, and collapsing them loses the one a reader needs.
 */
// Named to avoid colliding with the domain's LifecycleState ('active' | 'done'
// | 'archived'), which is derived from timestamps. This is the display set: the
// domain states worth interrupting for, plus 'deferred', which lives on `route`
// rather than the lifecycle timestamps.
export type LifecycleBannerState = 'archived' | 'done' | 'deferred';

/**
 * States a reader must not miss, stated at the top of the item.
 *
 * An archived item previously looked identical to a live one — same title, same
 * actions, same everything. On 2026-08-22 that cost real time twice over: an
 * archive that silently did not apply was indistinguishable from one that did,
 * and the operator reasonably assumed items were cleared when they were not,
 * while the notification gate they were jamming stayed shut.
 *
 * So this is deliberately a banner and not a chip. A chip is something you can
 * fail to notice; the whole point is that this cannot be scanned past.
 *
 * The first cut styled `archived` muted, on the reasoning that archiving is
 * usually the correct outcome and shouldn't read as an error. In the real
 * layout it disappeared between two saturated purple bands — right about a
 * principle, wrong about the pixels. Warning-weight now: this sits directly
 * under a coloured title bar and has to survive that contrast.
 */
@Component({
  selector: 'app-lifecycle-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-testid]': "'lifecycle-banner'",
    '[attr.data-state]': 'state()',
  },
  template: `
    <div [class]="cls()" role="status">
      <span class="lifecycle-banner__label">{{ label() }}</span>
      @if (detail(); as d) {
        <span class="lifecycle-banner__detail">{{ d }}</span>
      }
      <ng-content />
    </div>
  `,
  styles: [`
    .lifecycle-banner {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.78rem;
      /* Full-width tinted band, not a left tick. It has to hold its own against
         the coloured project/title bars stacked immediately above it. */
      border-left: 4px solid var(--color-warning);
      border-top: 1px solid color-mix(in srgb, var(--color-warning) 35%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--color-warning) 35%, transparent);
      background: color-mix(in srgb, var(--color-warning) 14%, var(--color-surface));
      color: var(--color-warning);
    }
    .lifecycle-banner__label {
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      flex: none;
    }
    /* Detail is dimmed relative to the label but stays inside the warning
       family — dropping it to neutral grey was what made the band read as
       ordinary metadata. */
    .lifecycle-banner__detail {
      color: color-mix(in srgb, var(--color-warning) 75%, var(--color-text-soft));
    }

    /* archived + deferred both mean "not live work" and share the warning
       treatment. done is the one genuinely-good terminal state, so it keeps the
       success family — a completed item should not read as a problem. */
    .lifecycle-banner--done {
      border-left-color: var(--color-success);
      border-top-color: color-mix(in srgb, var(--color-success) 35%, transparent);
      border-bottom-color: color-mix(in srgb, var(--color-success) 35%, transparent);
      background: color-mix(in srgb, var(--color-success) 14%, var(--color-surface));
      color: var(--color-success);
    }
    .lifecycle-banner--done .lifecycle-banner__detail {
      color: color-mix(in srgb, var(--color-success) 75%, var(--color-text-soft));
    }
  `],
})
export class LifecycleBanner {
  readonly state = input.required<LifecycleBannerState>();
  /** Optional context — when, why, by whom. */
  readonly detail = input<string | null>(null);

  protected readonly label = computed(() => {
    switch (this.state()) {
      case 'archived': return 'Archived';
      case 'done':     return 'Done';
      case 'deferred': return 'Deferred';
    }
  });

  protected readonly cls = computed(() =>
    `lifecycle-banner lifecycle-banner--${this.state()}`);
}
