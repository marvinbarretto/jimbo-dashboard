import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BlockCard } from '@shared/components/block-card/block-card';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-block-card-section',
  imports: [BlockCard, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Block Card" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          One card, two variants — used by the week planner (<code>features/planner</code>).
          <b>queue</b>: not yet scheduled, draggable onto the calendar. <b>calendar</b>: placed,
          has a time, may be locked. Drag/resize stay owned by the consumer. Clicking the title
          opens the vault item detail (same <code>appKanbanCardLink</code> +
          <code>?detail=&lt;seq&gt;</code> mechanism as VaultCard); clicking the lock icon
          (calendar only) toggles lock without opening anything.
        </p>

        <p class="ui-lab__support-copy"><b>Queue variant</b></p>
        <div style="max-width: 260px; display: flex; flex-direction: column; gap: 0.5rem;">
          <app-block-card
            variant="queue"
            [seq]="3296"
            title="Find the OpenRouter credit leak"
            projectName="Jimbo"
            projectColor="#a78bfa"
            [priority]="0"
            [size]="4" />
          <app-block-card
            variant="queue"
            [seq]="3244"
            title="New Zealand passport — reply"
            projectName="No project"
            projectColor="var(--color-text-muted)"
            [priority]="2"
            [size]="1" />
        </div>

        <p class="ui-lab__support-copy"><b>Calendar variant</b> — unlocked vs. locked</p>
        <div style="max-width: 260px; display: flex; flex-direction: column; gap: 0.5rem;">
          <app-block-card
            variant="calendar"
            [seq]="3269"
            title="Reply to Kelso — confirm Thu/Fri Brighton stay"
            projectName="Comms"
            projectColor="#3d5a80"
            [priority]="0"
            [size]="1"
            [locked]="false"
            timeText="10:00 - 10:25" />
          <app-block-card
            variant="calendar"
            [seq]="3251"
            title="Work on SpoonsCount — verify prod auth"
            projectName="Spoonscount"
            projectColor="#6b7a5e"
            [priority]="1"
            [size]="2"
            [locked]="true"
            timeText="11:00 - 11:50" />
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class BlockCardSection {}
