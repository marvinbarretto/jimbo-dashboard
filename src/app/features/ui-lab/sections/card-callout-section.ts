import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardCallout } from '@shared/components/card-callout/card-callout';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-card-callout-section',
  imports: [CardCallout, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Card Callout" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Variant body slot for vault cards. Six flavours, each tied to a state-colour family:
          question / rework / draft (warning), rationale (info), result (success), error (danger).
        </p>

        <div style="max-width: 280px;">
          <app-card-callout variant="question" label="open question · @ralph · 2h ago">
            should retry preserve the original executor or pick whoever's free?
          </app-card-callout>
        </div>

        <div style="max-width: 280px;">
          <app-card-callout variant="rework" label="rework reason · @marvin · 5h ago">
            AC missed the offset/limit case — please redo with cursor pagination semantics.
          </app-card-callout>
        </div>

        <div style="max-width: 280px;">
          <app-card-callout variant="draft" label="5 acceptance criteria drafted">
            approve to dispatch · click in to review
          </app-card-callout>
        </div>

        <div style="max-width: 280px;">
          <app-card-callout variant="rationale" label="rationale · 0.82 conf">
            unblocks operator visibility into hermes pipeline; matches Phase C item.
          </app-card-callout>
        </div>

        <div style="max-width: 280px;">
          <app-card-callout variant="result" label="result · 23m ago">
            classified P2 · localshout · 0.78 confidence; no questions raised.
          </app-card-callout>
        </div>

        <div style="max-width: 280px;">
          <app-card-callout variant="error" label="error · 8m ago">
            ts(2304) · Cannot find name 'DispatchRetryPayload'.
          </app-card-callout>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class CardCalloutSection {}
