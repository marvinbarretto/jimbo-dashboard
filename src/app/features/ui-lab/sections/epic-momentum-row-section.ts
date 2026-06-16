import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { EpicMomentumRow, type EpicMomentumRowVM } from '@shared/components/epic-momentum-row/epic-momentum-row';

// Cross-project rail samples — project chip leads each row. Covers the full badge
// matrix: healthy velocity, blocked-only, stalled, and a brand-new epic with no children.
const WITH_PROJECT: readonly EpicMomentumRowVM[] = [
  {
    id: 'note_e1a6d714',
    seq: 2462,
    title: 'Closing the intent-activity loop',
    project: { id: 'jimbo', name: 'Jimbo', color: '#a78bfa' },
    childrenTotal: 28,
    childrenDone: 12,
    childrenActive: 3,
    childrenBlocked: 4,
    done7d: 5,
    stalled: false,
  },
  {
    id: 'note_ls0042',
    seq: 1980,
    title: 'Carpet-capture flow from photo to pub identification',
    project: { id: 'spoons', name: 'Spoonscount', color: '#d4a14b' },
    childrenTotal: 12,
    childrenDone: 8,
    childrenActive: 0,
    childrenBlocked: 2,
    done7d: 0,
    stalled: true,
  },
  {
    id: 'note_legacy01',
    seq: 2328,
    title: 'Build token cost reporting query or endpoint for Jimbo',
    project: { id: 'jimbo', name: 'Jimbo', color: '#a78bfa' },
    childrenTotal: 3,
    childrenDone: 3,
    childrenActive: 0,
    childrenBlocked: 0,
    done7d: 3,
    stalled: false,
  },
  {
    id: 'note_orphan01',
    seq: 2199,
    title: 'Fresh epic — no children groomed yet',
    project: { id: 'foundry', name: 'Foundry', color: null },
    childrenTotal: 0,
    childrenDone: 0,
    childrenActive: 0,
    childrenBlocked: 0,
    done7d: 0,
    stalled: false,
  },
];

// Per-project group samples — project chip omitted, since the section is already
// scoped to one project.
const WITHOUT_PROJECT: readonly EpicMomentumRowVM[] = WITH_PROJECT.map(epic => ({
  ...epic,
  project: null,
}));

@Component({
  selector: 'app-epic-momentum-row-section',
  imports: [UiSection, UiStack, EpicMomentumRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Epic Momentum Row" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          A momentum-oriented epic row — answers "is this epic <em>moving</em>?" rather than "where
          did it come from?". Progress bar plus design-system badges for 7-day velocity (success),
          active (info), blocked (warning), and stalled (danger). Links straight to the vault item by
          seq. Distinct from <code>epic-row</code> / <code>epic-card</code>, which carry provenance
          (threads, principles, origin).
        </p>

        <div class="ui-lab__subhead">Cross-project rail — project chip leads each row</div>
        <div class="lab-epic-list">
          @for (epic of withProject; track epic.id) {
            <app-epic-momentum-row [epic]="epic" />
          }
        </div>

        <div class="ui-lab__subhead">Per-project group — chip omitted (section already scoped)</div>
        <div class="lab-epic-list">
          @for (epic of withoutProject; track epic.id) {
            <app-epic-momentum-row [epic]="epic" />
          }
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
  styles: [`
    .lab-epic-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  `],
})
export class EpicMomentumRowSection {
  protected readonly withProject = WITH_PROJECT;
  protected readonly withoutProject = WITHOUT_PROJECT;
}
