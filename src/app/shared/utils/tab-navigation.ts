import { EnvironmentProviders, inject, provideEnvironmentInitializer } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Marker for navigations that switch a tab INSIDE a page (ui-tab-bar child
 * routes) rather than moving to a different page. Pass it on the tab link:
 *
 *   <a routerLink="links" [info]="TAB_NAVIGATION" class="ui-tab" …>
 *
 * Scrolling then stays where the user is — they clicked a tab they could
 * already see, so yanking the viewport to the top reads as a glitch, not a
 * navigation. Page-to-page links (no marker) keep the scroll-to-top.
 */
export const TAB_NAVIGATION = 'tab-navigation';

/**
 * Replaces `scrollPositionRestoration: 'top'` with the same behaviour minus
 * tab switches. Anchor/fragment navigations are left to the router's own
 * `anchorScrolling`.
 */
export function provideTabAwareScrolling(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    const router = inject(Router);
    const viewport = inject(ViewportScroller);
    router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (router.lastSuccessfulNavigation()?.extras.info === TAB_NAVIGATION) return;
        if (router.parseUrl(router.url).fragment) return;
        viewport.scrollToPosition([0, 0]);
      });
  });
}
