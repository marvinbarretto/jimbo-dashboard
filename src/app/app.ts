import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Nav } from './shared/components/nav/nav';
import { primaryNavItems } from './shared/components/nav/nav-config';
import { ToastStack } from './shared/components/toast/toast-stack';
import { CommandShortcutsService } from './shared/services/command-shortcuts.service';
import { ActorsService } from './features/actors/data-access/actors.service';
import { ProjectsService } from './features/projects/data-access/projects.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Nav, ToastStack],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly shortcuts = inject(CommandShortcutsService);
  private readonly router = inject(Router);

  // Eager-load shared lookup data so reference dropdowns (capture's @ trigger,
  // detail-modal pickers, etc.) always have data when first opened. The
  // services' constructors fire their HTTP loads on instantiation.
  private readonly _eagerActors = inject(ActorsService);
  private readonly _eagerProjects = inject(ProjectsService);

  // Section accent — looks up the active primary-nav item by URL prefix and
  // exposes its accent as `--section-accent` on the app shell. Sub-pages and
  // shared primitives (e.g. <app-ui-tab-bar>) can pick it up via that CSS var.
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly sectionAccent = computed(() => {
    const segment = (this.url() ?? '').split('?')[0].split('/').filter(Boolean)[0];
    if (!segment) return null;
    const match = primaryNavItems.find(item => item.href === `/${segment}`);
    return match?.accent ?? null;
  });
}
