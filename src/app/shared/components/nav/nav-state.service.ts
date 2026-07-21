import { Injectable, computed, inject } from '@angular/core';
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

  readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly activeSection = computed<NavSection | null>(() => sectionForUrl(this.url() ?? ''));

  readonly accent = computed(() => this.activeSection()?.accent ?? null);

  readonly sections = navSections;
}
