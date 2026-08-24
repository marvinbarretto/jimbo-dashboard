import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NotificationItem } from '@shared/components/notification-bar/notification-item';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-notification-item-section',
  imports: [NotificationItem, UiMetaList, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Notification Item" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          One sticky-until-dismissed row: source, message, when, optional deep link, dismiss ×.
          No auto-dismiss timer — unlike <code>app-toast</code>, this exists specifically for
          things a timer would hide before anyone saw them.
        </p>

        <app-ui-meta-list>
          <dt>source</dt>
          <dd>string — short caps label, e.g. <code>Briefing · morning</code></dd>
          <dt>message</dt>
          <dd>string — the reason, in plain language</dd>
          <dt>timestamp</dt>
          <dd>ISO string or null — rendered via <code>formatDatetime</code></dd>
          <dt>tone</dt>
          <dd><code>danger</code> (default) / <code>warning</code> / <code>info</code></dd>
          <dt>href</dt>
          <dd>string or null — renders a "View →" deep link when present</dd>
          <dt>(dismiss)</dt>
          <dd>output — fires when the × is pressed; the host owns actually removing it</dd>
        </app-ui-meta-list>

        <app-ui-stack gap="sm">
          <app-notification-item
            source="Briefing · morning"
            message="Anthropic overloaded (529 Overloaded) — gave up after 2 retries"
            timestamp="2026-08-24T06:40:57Z"
            tone="danger"
            href="/briefing" />

          <app-notification-item
            source="Grooming"
            message="Decomposition dispatch failed — /api/grooming/submit/decomposition returned 500"
            timestamp="2026-08-22T14:06:00Z"
            tone="warning" />

          <app-notification-item
            source="Deploy"
            message="jimbo-api deployed — restart complete, health check passed"
            timestamp="2026-08-24T09:12:00Z"
            tone="info" />

          <app-notification-item
            source="Briefing · evening"
            message="Skill has no metadata.executors configured — cannot dispatch"
            tone="danger" />
        </app-ui-stack>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class NotificationItemSection {}
