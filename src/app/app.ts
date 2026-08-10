import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastStack } from './shared/components/toast/toast-stack';
import { SwUpdateService } from './shared/services/sw-update.service';
import { ThemeService } from './shared/services/theme.service';

/**
 * Root is chrome-free: the router loads a layout — DesktopLayout for the app
 * proper, MobileShell for /m — so each surface carries only its own shell.
 * See the two `path`-level parents in app.routes.ts.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastStack],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Instantiated here, not in a layout: the constructor effect applies the
  // persisted theme to <html>, which both surfaces need — and the SW update
  // cycle must run wherever the app is open, /m included.
  private readonly _theme = inject(ThemeService);
  private readonly _swUpdates = inject(SwUpdateService);
}
