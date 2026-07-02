import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiPeriodShell } from '@shared/components/ui-period-shell/ui-period-shell';

@Component({
  selector: 'app-nutrition-shell',
  imports: [UiPeriodShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-ui-period-shell basePath="nutrition" label="Nutrition" />`,
})
export class NutritionShell {}
