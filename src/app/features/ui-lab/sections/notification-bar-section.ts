import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NotificationBar, type NotificationEntry } from '@shared/components/notification-bar/notification-bar';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

const DEMO_ENTRIES: readonly NotificationEntry[] = [
  {
    id: 'dispatch-4608',
    source: 'Briefing · morning',
    message: 'Anthropic overloaded (529 Overloaded) — gave up after 2 retries',
    timestamp: '2026-08-24T06:40:57Z',
    tone: 'danger',
    href: '/briefing',
  },
  {
    id: 'dispatch-groom-9182',
    source: 'Grooming',
    message: 'Decomposition dispatch failed — /api/grooming/submit/decomposition returned 500',
    timestamp: '2026-08-22T14:06:00Z',
    tone: 'warning',
  },
];

@Component({
  selector: 'app-notification-bar-section',
  imports: [NotificationBar, UiButton, UiMetaList, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Notification Bar" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Sticky top-of-shell stack of <code>app-notification-item</code> rows — mounted once in
          the app shell, not scoped to whatever page happens to be open. An entry is any terminal
          dispatch failure (fleet-wide, from <code>FleetService.failures</code>), not filtered by
          route: the point is you shouldn't have to go looking for it.
        </p>

        <app-ui-meta-list>
          <dt>entries</dt>
          <dd><code>NotificationEntry[]</code> — id, source, message, timestamp?, tone?, href?</dd>
          <dt>(dismiss)</dt>
          <dd>output — emits the dismissed entry's id; host removes it (and, in the real
            wiring, persists the dismissal server-side so it stays gone across devices)</dd>
        </app-ui-meta-list>

        <div class="ui-lab__sticky-demo">
          <app-notification-bar
            [entries]="entries()"
            (dismiss)="onDismiss($event)" />
          <p class="ui-lab__support-copy">Scroll this frame — the bar stays pinned to its top, same as it would pin to the app header.</p>
          <p class="ui-lab__support-copy">More page content…</p>
          <p class="ui-lab__support-copy">…and more, so there's something to scroll past.</p>
        </div>

        <app-ui-button variant="ghost" (pressed)="reset()">Restore demo entries</app-ui-button>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class NotificationBarSection {
  protected readonly entries = signal<readonly NotificationEntry[]>(DEMO_ENTRIES);

  protected onDismiss(id: string): void {
    this.entries.update(es => es.filter(e => e.id !== id));
  }

  protected reset(): void {
    this.entries.set(DEMO_ENTRIES);
  }
}
