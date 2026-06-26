import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiStepper, type UiStepperStep } from '@shared/components/ui-stepper/ui-stepper';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSection } from '@shared/components/ui-section/ui-section';

@Component({
  selector: 'app-ui-stepper-section',
  imports: [UiStepper, UiStack, UiSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Stepper" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Horizontal step indicator for wizards / multi-step flows. The host owns
          each step's <code>state</code> (<code>todo</code> / <code>active</code> /
          <code>done</code>) so non-linear flows work — a step can be "done" while
          a later one is "active". Input: <code>steps</code> (array of
          <code>{{ '{' }} label, state {{ '}' }}</code>).
        </p>

        <div>
          <p class="ui-lab__subhead">States</p>
          <app-ui-stepper [steps]="demo" />
        </div>

        <div>
          <p class="ui-lab__subhead">Interactive — advance through the steps</p>
          <app-ui-stepper [steps]="interactive()" />
          <p class="ui-lab__support-copy" style="cursor: pointer" (click)="advance()">
            ▶ click to advance ({{ at() }}/3)
          </p>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class UiStepperSection {
  protected readonly demo: readonly UiStepperStep[] = [
    { label: 'Project', state: 'done' },
    { label: 'Epic', state: 'active' },
    { label: 'Story', state: 'todo' },
  ];

  protected readonly at = signal(1);
  protected readonly interactive = signal<readonly UiStepperStep[]>(this.compute(1));

  protected advance(): void {
    const next = this.at() >= 3 ? 0 : this.at() + 1;
    this.at.set(next);
    this.interactive.set(this.compute(next));
  }

  private compute(at: number): readonly UiStepperStep[] {
    const labels = ['Project', 'Epic', 'Story'];
    return labels.map((label, i): UiStepperStep => ({
      label,
      state: i < at ? 'done' : i === at ? 'active' : 'todo',
    }));
  }
}
