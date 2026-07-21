import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Config's tabs are tier-2 and live in the app shell's <app-section-tabs>
 * (see nav-config), so this is now just the routed outlet.
 */
@Component({
  selector: 'app-config-page',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config">
      <router-outlet />
    </div>
  `,
  styles: [`
    .config { display: flex; flex-direction: column; min-height: 100%; }
  `],
})
export class ConfigPage {}
