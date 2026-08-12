import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { UiInlineTabs, type UiInlineTabOption } from '@shared/components/ui-inline-tabs/ui-inline-tabs';

export type MailTab = 'activity' | 'runs' | 'senders' | 'poll';

/**
 * Sub-navigation for the mail area.
 *
 * Deliberately NOT a third level in nav-config: that bar renders on every Comms
 * page (Calendars, Workspace, Shopping, Briefings) and would be empty on all of
 * them to serve this one area. Fleet set the precedent — /fleet and
 * /fleet/daily-report are two pages linked from within, with no extra global
 * nav level — and inline tabs are the same idea with room for a third page.
 */
@Component({
  selector: 'app-mail-tabs',
  imports: [UiInlineTabs],
  template: `
    <app-ui-inline-tabs
      [options]="options()"
      [value]="active()"
      ariaLabel="Mail pages"
      (changed)="go($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MailTabs {
  private readonly router = inject(Router);

  readonly active = input.required<MailTab>();

  protected readonly options = computed<readonly UiInlineTabOption[]>(() => [
    { value: 'activity', label: 'Activity' },
    { value: 'runs', label: 'Runs' },
    { value: 'senders', label: 'Senders' },
    { value: 'poll', label: 'Poll runs' },
  ]);

  private readonly routes: Record<MailTab, string> = {
    activity: '/mail-activity',
    runs: '/mail-activity/runs',
    senders: '/mail-activity/senders',
    poll: '/mail-activity/poll-runs',
  };

  protected go(tab: string): void {
    if (tab === this.active()) return;
    void this.router.navigateByUrl(this.routes[tab as MailTab]);
  }
}
