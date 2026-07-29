import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UiPeriodShell } from '@shared/components/ui-period-shell/ui-period-shell';

@Component({
  selector: 'app-tracker-shell',
  imports: [UiPeriodShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-ui-period-shell [basePath]="basePath" [label]="label" />`,
})
export class TrackerShell {
  private readonly route = inject(ActivatedRoute);
  protected readonly basePath = this.route.snapshot.data['basePath'] as string;
  protected readonly label = this.route.snapshot.data['label'] as string;
}
