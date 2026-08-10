import { DOCUMENT, Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { type NavSection, navSections, sectionForUrl } from './nav-config';

/**
 * Single source of truth for which nav section the current URL belongs to.
 * Shared by <app-nav> (which tab bar to highlight), <app-section-tabs> (which
 * tabs to render) and the app shell (`--section-accent`), so the three can't
 * disagree about where you are.
 */
@Injectable({ providedIn: 'root' })
export class NavState {
  private readonly router = inject(Router);

  // Seeded from the address bar, not router.url. This service is constructed at
  // bootstrap, and with non-blocking initial navigation router.url is still '/'
  // until the first NavigationEnd — so a cold launch straight into /m would
  // paint the full desktop header for the length of the lazy-chunk fetch, then
  // drop it. Deep-linking into the phone shell is the WebView's normal case.
  private readonly location = inject(DOCUMENT).location;
  private readonly initialUrl = `${this.location.pathname}${this.location.search}`;

  readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.initialUrl),
    ),
    { initialValue: this.initialUrl },
  );

  readonly activeSection = computed<NavSection | null>(() => sectionForUrl(this.url() ?? ''));

  /**
   * True on the phone shell (`/m`), which brings its own bottom tab bar and
   * suppresses the desktop header + section tabs.
   *
   * Matched exactly rather than by prefix — a bare `startsWith('/m')` also
   * swallows `/mail-activity`, `/models`, `/model-stacks` and `/modules`.
   */
  readonly isBareShell = computed(() => {
    const url = this.url() ?? '';
    return url === '/m' || url.startsWith('/m/') || url.startsWith('/m?');
  });

  readonly accent = computed(() => this.activeSection()?.accent ?? null);

  readonly sections = navSections;
}
