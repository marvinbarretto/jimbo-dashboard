import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { ClarificationPrompt } from '@shared/components/clarification-prompt/clarification-prompt';

@Component({
  selector: 'app-clarification-prompt-section',
  imports: [UiSection, UiStack, ClarificationPrompt],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Clarification Prompt" [collapsible]="false">
      <app-ui-stack gap="lg">
        <p class="ui-lab__support-copy">
          A question Jimbo asked, answerable where it's shown — options, free text, or
          dismiss — with the acknowledgement beat inline. Backed by the clarifications
          rail; any surface that files a clarification can drop it in (briefings today;
          picture, vault cards next). States below are frozen via preview-only inputs;
          the first card's buttons are live and will show the error state (fake id).
        </p>

        <div class="report" style="border-top: none; padding-top: 0;">
          <app-clarification-prompt
            question="Is today's deep block going to LocalShout, or to finishing Briefing-v2 so it runs while you're away?"
            hint="what your 2-3 hour focus slot is actually for today"
            clarificationId="lab-fake"
            [options]="['LocalShout', 'Briefing-v2']" />

          <app-clarification-prompt
            question="Do the finances get opened before Brighton spending starts?"
            hint="the Finances 'This Week' intention"
            clarificationId="lab-fake-2" />

          <app-clarification-prompt
            question="Should the Fringe trip stay solo-viable or lock the group apartment?"
            clarificationId="lab-fake-3"
            initialMode="acked"
            initialAnswer="stay solo-viable" />

          <app-clarification-prompt
            question="Do you want the weekly model-rot report on Discord too?"
            clarificationId="lab-fake-4"
            initialMode="dismissed" />

          <app-clarification-prompt
            question="Rebook the dentist for August?"
            clarificationId="lab-fake-5"
            initialMode="error" />

          <app-clarification-prompt
            question="File-on-answer: no clarification filed yet, but a sourceRef makes it answerable — the server files-then-answers on submit."
            hint="a cap-blocked briefing question, answerable in place"
            sourceRef="lab-file-on-answer" />

          <app-clarification-prompt
            question="Display-only: no clarificationId and no sourceRef renders without controls (the 'queue is full' notice)." />
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class ClarificationPromptSection {}
