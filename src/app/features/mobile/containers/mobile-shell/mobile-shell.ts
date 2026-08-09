import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppIcon } from '@shared/components/app-icon/app-icon';
import type { IconName } from '@shared/components/app-icon/icon-registry';

type MobileTab = {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
};

/**
 * Phone shell layout — the surface the jimbo-app Capacitor WebView loads.
 *
 * Deliberately thin: a bottom tab bar plus an outlet. Everything else is the
 * tab's own business, so tabs can lean on the shared tracker primitives
 * without inheriting desktop chrome.
 */
@Component({
  selector: 'app-mobile-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppIcon],
  templateUrl: './mobile-shell.html',
  styleUrl: './mobile-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileShell {
  /**
   * Tab paths are a cross-repo contract: jimbo-app's native home screen
   * deep-links into /m/today, /m/log and /m/train. Renaming one means changing
   * the Kotlin side in the same breath — see
   * `jimbo-app/docs/native-ui-roadmap.md`.
   */
  protected readonly tabs: readonly MobileTab[] = [
    { path: 'today', label: 'Today', icon: 'today' },
    { path: 'log', label: 'Log', icon: 'food' },
    { path: 'train', label: 'Train', icon: 'gym' },
  ];
}
