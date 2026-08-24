import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NotificationItem, type NotificationTone } from './notification-item';

// Wire shape a host page/service hands in. `id` is whatever the source system
// uses to identify the underlying event (e.g. a dispatch_queue row id) — the
// bar itself holds no state, so dismissal must round-trip through the id.
export interface NotificationEntry {
  id: string;
  source: string;
  message: string;
  timestamp?: string | null;
  tone?: NotificationTone;
  href?: string | null;
}

// Sticky top-of-shell stack, not a corner toast: this is for things that must
// still be visible after the page that caused them is long gone (a briefing
// dispatch that failed overnight). No auto-dismiss timer — the only way an
// entry leaves is the reader dismissing it or the host clearing it once
// resolved. Mounted once in the app shell; every entry is fleet-wide, not
// scoped to whatever page happens to be open when it fires.
@Component({
  selector: 'app-notification-bar',
  imports: [NotificationItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-testid]': "'notification-bar'" },
  template: `
    @if (entries().length > 0) {
      <div class="notification-bar" role="region" aria-label="System notifications">
        @for (entry of entries(); track entry.id) {
          <app-notification-item
            [source]="entry.source"
            [message]="entry.message"
            [timestamp]="entry.timestamp ?? null"
            [tone]="entry.tone ?? 'danger'"
            [href]="entry.href ?? null"
            (dismiss)="dismiss.emit(entry.id)"
          />
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
  `],
})
export class NotificationBar {
  readonly entries = input.required<readonly NotificationEntry[]>();
  readonly dismiss = output<string>();
}
