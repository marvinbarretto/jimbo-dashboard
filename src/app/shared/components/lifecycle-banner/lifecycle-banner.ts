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
      padding: 0.4rem 0.75rem;
      font-size: 0.75rem;
      border-left: 3px solid var(--color-border);
      background: var(--color-surface-soft);
      color: var(--color-text-soft);
    }
    .lifecycle-banner__label {
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      flex: none;
    }
    .lifecycle-banner__detail { color: var(--color-text-soft); }

    /* Archived reads as withdrawn, not as an error — it is usually the correct
       outcome. Muted and unmistakable, rather than alarming. */
    .lifecycle-banner--archived {
      border-left-color: var(--color-text-soft);
      background: var(--color-surface-sunken, var(--color-surface-soft));
    }
    .lifecycle-banner--done {
      border-left-color: var(--color-success, #4a9);
      color: var(--color-success, #4a9);
    }
    .lifecycle-banner--deferred { border-left-color: var(--color-warning, #d0a13a); }
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
