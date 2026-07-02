import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiPeriodShell } from '@shared/components/ui-period-shell/ui-period-shell';

@Component({
  selector: 'app-exercise-shell',
  imports: [UiPeriodShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-ui-period-shell basePath="exercise" label="Exercise" />`,
})
export class ExerciseShell {}
