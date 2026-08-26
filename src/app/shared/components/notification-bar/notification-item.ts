import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { formatDatetime } from '@shared/utils/datetime.utils';

export type NotificationTone = 'danger' | 'warning' | 'info';

// One sticky-until-dismissed row: what broke, where it came from, when, and an
// optional deep link. Unlike app-toast this never auto-dismisses — it exists
// specifically for things a timer would hide before anyone saw them (a
// briefing dispatch that failed silently overnight).
@Component({
  selector: 'app-notification-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-testid]': "'notification-item'",
    '[attr.data-tone]': 'tone()',
  },
  template: `
    <div [class]="cls()" role="alert">
      <span class="notification-item__source">{{ source() }}</span>
      <span class="notification-item__message">{{ message() }}</span>
      @if (count() > 1) {
        <span class="notification-item__count">×{{ count() }}</span>
      }
      @if (when(); as w) {
        <span class="notification-item__time">{{ w }}</span>
      }
      @if (href(); as h) {
        <a class="notification-item__action" [href]="h" target="_blank" rel="noopener">View →</a>
      }
      @if (dismissible()) {
        <button type="button" class="notification-item__dismiss" (click)="dismiss.emit()" aria-label="Dismiss">×</button>
      } @else {
        <span class="notification-item__standing" [attr.title]="standingHint()">standing</span>
      }
    </div>
  `,
  styles: [`
    .notification-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.5rem 0.9rem;
      font-size: 0.82rem;
      border-bottom: 1px solid color-mix(in srgb, currentColor 20%, transparent);
      background: color-mix(in srgb, var(--tone-color) 14%, var(--color-surface));
      color: var(--tone-color);

      &--danger  { --tone-color: var(--color-danger); }
      &--warning { --tone-color: var(--color-warning); }
      &--info    { --tone-color: var(--color-accent); }
    }

    // A condition, not an event: it clears when the underlying state clears.
    // Marked rather than silently missing its × so the absence reads as
    // deliberate instead of broken.
    .notification-item__standing {
      flex: none;
      font-size: 0.66rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      opacity: 0.75;
      cursor: help;
    }

    .notification-item__source {
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 0.7rem;
      flex: none;
    }

    .notification-item__message {
      flex: 1;
      min-width: 0;
      color: var(--color-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .notification-item__count {
      flex: none;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--tone-color);
      opacity: 0.75;
    }

    .notification-item__time {
      flex: none;
      font-size: 0.72rem;
      color: color-mix(in srgb, var(--tone-color) 75%, var(--color-text-soft));
    }

    .notification-item__action {
      flex: none;
      font-weight: 600;
      color: var(--tone-color);
      text-decoration: none;

      &:hover { text-decoration: underline; }
    }

    .notification-item__dismiss {
      flex: none;
      background: none;
      border: none;
      color: var(--tone-color);
      cursor: pointer;
      font-size: 1.1rem;
      line-height: 1;
      padding: 0;
      opacity: 0.65;

      &:hover { opacity: 1; }
    }
  `],
})
export class NotificationItem {
  readonly source = input.required<string>();
  readonly message = input.required<string>();
  readonly timestamp = input<string | null>(null);
  readonly tone = input<NotificationTone>('danger');
  readonly href = input<string | null>(null);
  readonly count = input<number>(1);
  /**
   * False for a *condition* rather than an event — something still true right
   * now, which clears itself when the underlying state does. Offering a dismiss
   * on one would let a live outage be silenced while it is still happening.
   */
  readonly dismissible = input<boolean>(true);
  /** Tooltip on the "standing" marker, explaining what will clear the row. */
  readonly standingHint = input<string | null>(null);

  readonly dismiss = output<void>();

  protected readonly when = computed(() => {
    const ts = this.timestamp();
    return ts ? formatDatetime(ts) : null;
  });

  protected readonly cls = computed(() => `notification-item notification-item--${this.tone()}`);
}
