import { ChangeDetectionStrategy, Component } from '@angular/core';
import { groupCommissions } from '@domain/dispatch';
import { DISPATCH_ENTRIES } from '@domain/dispatch/fixtures';
import { DispatchHistoryList } from '@features/execution/components/dispatch-history-list/dispatch-history-list';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-dispatch-history-list-section',
  imports: [DispatchHistoryList, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Dispatch History List" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Organism — the per-item commission history shown when a commission-card is
          expanded. Newest first; each row carries the derived stage, when it ran, retry
          count, result/error, and a PR link. This is what keeps a superseded attempt
          visible (here: a Running re-commission over a prior Failed run).
        </p>
        <div style="max-width: 320px;">
          <app-dispatch-history-list [history]="history" />
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class DispatchHistoryListSection {
  // The multi-dispatch fixture task — surfaces a superseded Failed attempt under
  // the latest Running one.
  readonly history =
    groupCommissions(DISPATCH_ENTRIES).find(c => c.history.length > 1)?.history ?? [];
}
