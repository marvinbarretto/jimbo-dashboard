import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiSection } from '@shared/components/ui-section/ui-section';

@Component({
  selector: 'app-entity-chip-section',
  imports: [EntityChip, UiStack, UiCluster, UiSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Entity Chip" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Unified inline chip for actors, projects, and vault items. Prefix (<code>@</code>,
          <code>/</code>, <code>#</code>) is derived from type. Colour token follows the same
          <code>--actor-color-*</code> / <code>--project-color-*</code> convention.
          Replaces the retired <code>OwnerChip</code> and <code>ProjectChip</code> components.
          Vault items accept an optional <code>seq</code> to show the operator-facing number.
        </p>

        <div>
          <p class="ui-lab__subhead">Actors</p>
          <app-ui-cluster gap="sm">
            <app-entity-chip type="actor" id="marvin" label="Marvin" />
            <app-entity-chip type="actor" id="ralph"  label="Ralph"  />
            <app-entity-chip type="actor" id="boris"  label="Boris"  />
            <app-entity-chip type="actor" id="jimbo"  label="Jimbo"  />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Projects</p>
          <app-ui-cluster gap="sm">
            <app-entity-chip type="project" id="hermes"     label="Hermes"     />
            <app-entity-chip type="project" id="localshout" label="Localshout" />
            <app-entity-chip type="project" id="dashboard"  label="Dashboard"  />
            <app-entity-chip type="project" id="personal"   label="Personal"   />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Vault items (tasks)</p>
          <app-ui-cluster gap="sm">
            <app-entity-chip type="vault-item" id="abc123" label="Add filter controls to event listing" [seq]="4252" />
            <app-entity-chip type="vault-item" id="def456" label="Migrate auth middleware" [seq]="3891" />
            <app-entity-chip type="vault-item" id="ghi789" label="No seq provided (fallback)" />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Inline with text (typical mention context)</p>
          <p class="ui-lab__support-copy">
            Assigned to <app-entity-chip type="actor" id="ralph" label="Ralph" /> via
            <app-entity-chip type="project" id="hermes" label="Hermes" /> —
            unblocks <app-entity-chip type="vault-item" id="abc123" label="Add filter controls" />.
          </p>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class EntityChipSection {}
