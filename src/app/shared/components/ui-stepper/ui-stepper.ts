import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface UiStepperStep {
  readonly label: string;
  readonly state: 'done' | 'active' | 'todo';
}

/**
 * Horizontal step indicator for wizards / multi-step flows. The host owns the
 * per-step state (the flow may not be a simple linear index — e.g. a project is
 * "done" while its epic is "active"), so each step carries its own
 * todo / active / done. Numbered pips become a ✓ when done; connectors link them.
 */
@Component({
  selector: 'app-ui-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="stepper">
      @for (s of steps(); track s.label; let i = $index) {
        <li class="stepper__pip" [attr.data-state]="s.state">
          <span class="stepper__n">{{ s.state === 'done' ? '✓' : i + 1 }}</span>
          <span class="stepper__label">{{ s.label }}</span>
        </li>
      }
    </ol>
  `,
  styles: [`
    .stepper {
      display: flex;
      align-items: center;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .stepper__pip {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--color-text-soft);

      &:not(:last-child)::after {
        content: '';
        flex: 1;
        height: 2px;
        min-width: 1.5rem;
        margin: 0 0.85rem;
        background: var(--color-border);
      }

      &[data-state='active'],
      &[data-state='done'] {
        color: var(--color-text);
      }
      &[data-state='active'] .stepper__n,
      &[data-state='done'] .stepper__n {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }
    }

    .stepper__n {
      display: grid;
      place-items: center;
      width: 1.65rem;
      height: 1.65rem;
      border: 2px solid var(--color-border);
      border-radius: 50%;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .stepper__label {
      font-size: 0.82rem;
      font-weight: 600;
    }
  `],
})
export class UiStepper {
  readonly steps = input.required<readonly UiStepperStep[]>();
}
