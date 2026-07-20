import { ChangeDetectionStrategy, Component } from '@angular/core';
import { actorId } from '@domain/ids';
import { ItemHeader } from '@shared/components/item-header/item-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-item-header-section',
  imports: [ItemHeader, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Item Header" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Shared identity strip, evolved from VaultCard's existing project-bar (already a
          project-colour full-bleed strip, already painting text in --color-bg for contrast) —
          not invented from scratch. Used by app-block-card (queue: epic, calendar: time+lock)
          and app-vault-card (always epic mode, never lock). Display-only — priority editing and
          reassignment stay owned by whichever component's existing dropdowns already do that job.
        </p>

        <p class="ui-lab__support-copy"><b>secondary="time"</b> — block-card, calendar variant</p>
        <div style="max-width: 300px;">
          <app-item-header
            projectName="Comms"
            projectColor="#2dd4bf"
            [priority]="0"
            [owner]="actorId('marvin')"
            secondary="time"
            timeText="10:00–11:30"
            [showLock]="true" />
        </div>

        <p class="ui-lab__support-copy"><b>secondary="epic"</b>, truncated — block-card queue variant, or vault-card</p>
        <div style="max-width: 300px;">
          <app-item-header
            projectName="LocalShout"
            projectColor="#69b8ff"
            [priority]="1"
            [owner]="actorId('marvin')"
            secondary="epic"
            epicLabel="↳ #3061 Homepage rebuild epic — persistent bottom nav overhaul" />
        </div>

        <p class="ui-lab__support-copy"><b>secondary="none"</b>, no owner — minimal case</p>
        <div style="max-width: 300px;">
          <app-item-header
            projectName="Jimbo"
            projectColor="#a78bfa"
            [priority]="0" />
        </div>

        <p class="ui-lab__support-copy">No project (fallback colour), no priority, locked</p>
        <div style="max-width: 300px;">
          <app-item-header
            projectName="No project"
            [priority]="null"
            [owner]="actorId('kipper')"
            secondary="time"
            timeText="14:00–14:25"
            [showLock]="true"
            [locked]="true" />
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class ItemHeaderSection {
  protected readonly actorId = actorId;
}
