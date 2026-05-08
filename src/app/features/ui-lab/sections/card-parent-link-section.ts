import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardParentLink } from '@shared/components/card-parent-link/card-parent-link';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-card-parent-link-section',
  imports: [CardParentLink, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Card Parent Link" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Sits between header and title on subtask cards. Tints with the project's
          <code>--proj-tint</code>, so the parent-link colour stays continuous with the rest of
          the card.
        </p>

        <div style="--proj-tint: #6b95d6; max-width: 280px;">
          <app-card-parent-link [parentSeq]="2350" parentTitle="Unify kanban card components" />
        </div>

        <div style="--proj-tint: #5fb3a1; max-width: 280px;">
          <app-card-parent-link [parentSeq]="2300" parentTitle="Phase B Postgres cutover" />
        </div>

        <div style="--proj-tint: #a878d6; max-width: 280px;">
          <app-card-parent-link [parentSeq]="2280" parentTitle="Phase C · turn boris/ralph dispatch on" />
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class CardParentLinkSection {}
