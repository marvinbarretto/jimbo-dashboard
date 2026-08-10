import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet, Scroll } from '@angular/router';
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

  private readonly router = inject(Router);
  private readonly window = inject(DOCUMENT).defaultView;

  /**
   * Per-tab scroll offsets. Route reuse parks the tab's DOM but scroll lives
   * on the document, which the router resets to top on every navigation
   * (`scrollPositionRestoration: 'top'` — what desktop wants). So the shell
   * remembers each tab's offset itself: saved when a navigation leaves the
   * tab, restored on the router's `Scroll` event — inside rAF, which runs
   * after RouterScroller's scroll-to-top in the same dispatch (its subscriber
   * order relative to this one is unknowable) but before the next paint, so
   * the reset never reaches the screen.
   */
  private readonly scrollOffsets = new Map<string, number>();

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((e) => {
      const win = this.window;
      if (!win) return;
      if (e instanceof NavigationStart) {
        this.scrollOffsets.set(this.router.url, win.scrollY);
      } else if (e instanceof Scroll && e.routerEvent instanceof NavigationEnd) {
        const saved = this.scrollOffsets.get(e.routerEvent.urlAfterRedirects);
        if (saved !== undefined) win.requestAnimationFrame(() => win.scrollTo(0, saved));
      }
    });
  }
}
