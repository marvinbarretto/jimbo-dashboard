import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VaultChip } from '@shared/components/vault-chip/vault-chip';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';

@Component({
  selector: 'app-vault-chip-section',
  imports: [VaultChip, UiSection, UiStack, UiCluster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Vault Chip" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Three kinds, one shell. <code>task</code> / <code>subtask</code> / <code>epic</code>
          differ in prefix glyph and colour treatment. Project stripe (left border) ties the
          chip to its project. Epics encode creator class via border style — solid is
          agent-decomposed, dashed is human-conceived.
        </p>

        <div>
          <p class="ui-lab__subhead">Task · plain</p>
          <app-ui-cluster gap="sm">
            <span style="--proj-tint: #6b95d6;"><app-vault-chip kind="task" [seq]="2417" title="wire up dispatch retry button" /></span>
            <span style="--proj-tint: #5fb3a1;"><app-vault-chip kind="task" [seq]="2483" title="add /dispatches detail page" /></span>
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Sizes · sm (dense: tables, lists) / md (default) / lg (picker/list contexts where the item is the primary content, e.g. pomo retro)</p>
          <app-ui-cluster gap="md" align="center">
            <span style="--proj-tint: #6b95d6;"><app-vault-chip size="sm" kind="task" [seq]="2417" title="wire up dispatch retry button" /></span>
            <span style="--proj-tint: #6b95d6;"><app-vault-chip size="md" kind="task" [seq]="2417" title="wire up dispatch retry button" /></span>
            <span style="--proj-tint: #6b95d6;"><app-vault-chip size="lg" kind="task" [seq]="2417" title="wire up dispatch retry button" /></span>
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Subtask · ↳ prefix · optional epic-marker</p>
          <app-ui-cluster gap="sm">
            <span style="--proj-tint: #6b95d6;"><app-vault-chip kind="subtask" [seq]="2417" title="wire up retry" [epicSeq]="2350" /></span>
            <span style="--proj-tint: #5fb3a1;"><app-vault-chip kind="subtask" [seq]="2412" title="flag stale dispatches" [epicSeq]="2300" /></span>
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Epic · agent-decomposed (solid border)</p>
          <app-ui-cluster gap="sm">
            <span style="--proj-tint: #5fb3a1;"><app-vault-chip kind="epic" [seq]="2300" title="Phase B Postgres cutover" creator="agent" /></span>
            <span style="--proj-tint: #6b95d6;"><app-vault-chip kind="epic" [seq]="2356" title="Audience targeting v2" creator="agent" /></span>
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Epic · human-conceived (dashed border)</p>
          <app-ui-cluster gap="sm">
            <span style="--proj-tint: #6b95d6;"><app-vault-chip kind="epic" [seq]="2350" title="Unify kanban card components" creator="human" /></span>
            <span style="--proj-tint: #a878d6;"><app-vault-chip kind="epic" [seq]="2399" title="Q3 strategy review" creator="human" /></span>
          </app-ui-cluster>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class VaultChipSection {}
