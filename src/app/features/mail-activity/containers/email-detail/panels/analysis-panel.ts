import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiChipList, type UiChipListItem } from '@shared/components/ui-chip-list/ui-chip-list';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { EmailDetailStore } from '../../../email-detail.store';

/** Analysis tab: what the body read produced — summary, entities, events,
 *  deadlines, asks. Absence is a stated fact, not a blank. */
@Component({
  selector: 'app-email-analysis-panel',
  imports: [UiChipList, UiProse, UiStack],
  templateUrl: './analysis-panel.html',
  styleUrl: '../email-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailAnalysisPanel {
  protected readonly store = inject(EmailDetailStore);

  protected entityChips(entities: string[]): UiChipListItem[] {
    return entities.map((e) => ({ id: e, label: e }));
  }
}
