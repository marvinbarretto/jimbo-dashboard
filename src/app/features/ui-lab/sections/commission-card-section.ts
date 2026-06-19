import { ChangeDetectionStrategy, Component } from '@angular/core';
import { groupCommissions } from '@domain/dispatch';
import { DISPATCH_ENTRIES } from '@domain/dispatch/fixtures';
import { CommissionCard } from '@features/execution/components/commission-card/commission-card';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

// Demo data comes straight from the seed dispatch fixtures via the same
// view-model the board uses — so the lab shows exactly what ships (one card per
// item across every stage, incl. the 2-dispatch task that collapses to one card).
@Component({
  selector: 'app-commission-card-section',
  imports: [CommissionCard, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Commission Card" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Organism — one card per item on the rebuilt execution board, commission flow only.
          Composes the <code>commission-stage-pill</code> + <code>actor-avatar</code>; project
          is a routerLink. The <code>×N</code> toggle expands inline dispatch history (the
          Running card has two attempts — its prior Failed run is hidden until expanded); a
          <code>PR ↗</code> link shows when the latest dispatch carries a pr_url.
        </p>
        <div class="cards-grid">
          @for (c of commissions; track c.taskId) {
            <app-commission-card [item]="c" />
          }
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
  styles: [`
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 0.6rem;
      max-width: 780px;
      align-items: start;
    }
  `],
})
export class CommissionCardSection {
  readonly commissions = groupCommissions(DISPATCH_ENTRIES);
}
