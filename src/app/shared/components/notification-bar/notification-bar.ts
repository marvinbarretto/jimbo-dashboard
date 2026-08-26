import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { NotificationItem, type NotificationTone } from './notification-item';

// Wire shape a host page/service hands in. `id` is whatever the source system
// uses to identify the underlying event (e.g. a dispatch_queue row id) — the
// bar itself holds no state, so dismissal must round-trip through the id.
// `count` is set by a host that collapses repeat entries (e.g. retries of the
// same failing note) into one row — undefined/1 renders no badge.
export interface NotificationEntry {
  id: string;
  source: string;
  message: string;
  timestamp?: string | null;
  tone?: NotificationTone;
  href?: string | null;
  count?: number;
  /**
   * False for a condition that is still true — a stalled worker, a queue that
   * is not draining. These clear themselves; offering a dismiss would let a
   * live outage be silenced while it is still happening.
   */
  dismissible?: boolean;
  /** Tooltip explaining what will clear a standing row. */
  standingHint?: string | null;
}

// The bar pushes the page down, which is exactly why it works and exactly why
// it must stay short. Seven rows for one failing grooming run made the whole
// shell unusable; the host groups what it can and this caps the rest.
const MAX_VISIBLE = 4;

// Sticky top-of-shell stack, not a corner toast: this is for things that must
// still be visible after the page that caused them is long gone (a briefing
// dispatch that failed overnight). No auto-dismiss timer — the only way an
// entry leaves is the reader dismissing it or the host clearing it once
// resolved. Mounted once in the app shell; every entry is fleet-wide, not
// scoped to whatever page happens to be open when it fires.
@Component({
  selector: 'app-notification-bar',
  imports: [NotificationItem, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-testid]': "'notification-bar'" },
  template: `
    @if (entries().length > 0) {
      <div class="notification-bar" role="region" aria-label="System notifications">
        @if (dismissableCount() > 1) {
          <div class="notification-bar__actions">
            <app-ui-button variant="ghost" size="sm" [bare]="true" (pressed)="dismissAll.emit()">Dismiss all</app-ui-button>
          </div>
        }
        @for (entry of visible(); track entry.id) {
          <app-notification-item
            [source]="entry.source"
            [message]="entry.message"
            [timestamp]="entry.timestamp ?? null"
            [tone]="entry.tone ?? 'danger'"
            [href]="entry.href ?? null"
            [count]="entry.count ?? 1"
            [dismissible]="entry.dismissible ?? true"
            [standingHint]="entry.standingHint ?? null"
            (dismiss)="dismiss.emit(entry.id)"
          />
        }
        @if (overflow() > 0) {
          <p class="notification-bar__overflow">
            and {{ overflow() }} more — see the fleet board
          </p>
        }
      </div>
    }
  `,
  styles: [`
    .notification-bar {
      position: sticky;
      top: 0;
      z-index: 110; /* above the app header's sticky nav (100) */
      display: flex;
      flex-direction: column;
    }

    .notification-bar__overflow {
      margin: 0;
      padding: 0.35rem 0.9rem;
      font-size: 0.72rem;
      color: var(--color-text-muted);
      background: var(--color-surface);
    }

    .notification-bar__actions {
      display: flex;
      justify-content: flex-end;
      padding: 0.25rem 0.9rem 0;
      background: var(--color-surface);
    }
  `],
})
export class NotificationBar {
  readonly entries = input.required<readonly NotificationEntry[]>();

  // Standing conditions come first: they are the ones that mean something is
  // wrong *now*, where a failure row is a record of something already over.
  private readonly ordered = computed(() => {
    const list = [...this.entries()];
    return [
      ...list.filter(e => e.dismissible === false),
      ...list.filter(e => e.dismissible !== false),
    ];
  });

  protected readonly visible = computed(() => this.ordered().slice(0, MAX_VISIBLE));
  protected readonly overflow = computed(() => Math.max(0, this.ordered().length - MAX_VISIBLE));
  protected readonly dismissableCount = computed(() =>
    this.entries().filter(e => e.dismissible !== false).length);
  readonly dismiss = output<string>();
  readonly dismissAll = output<void>();
}
