import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type UiFormActionsAlign = 'start' | 'end' | 'between';

@Component({
  selector: 'app-ui-form-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div [class]="classes()"><ng-content /></div>`,
  styles: [`
    .ui-form-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      padding-top: 0.5rem;
    }

    .ui-form-actions--start {
      justify-content: flex-start;
    }

    .ui-form-actions--end {
      justify-content: flex-end;
    }

    .ui-form-actions--between {
      justify-content: space-between;
    }

    @media (max-width: 768px) {
      .ui-form-actions {
        width: 100%;
      }
    }
  `],
})
export class UiFormActions {
  readonly align = input<UiFormActionsAlign>('start');

  readonly classes = computed(() => `ui-form-actions ui-form-actions--${this.align()}`);
}
