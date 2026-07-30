import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppIcon } from './shared/components/app-icon/app-icon';
import { Nav } from './shared/components/nav/nav';
import { NavState } from './shared/components/nav/nav-state.service';
import { SectionTabs } from './shared/components/nav/section-tabs';
import { ToastStack } from './shared/components/toast/toast-stack';
import { CommandShortcutsService } from './shared/services/command-shortcuts.service';
import { ThemeService } from './shared/services/theme.service';
import { ActorsService } from './features/actors/data-access/actors.service';
import { ProjectsService } from './features/projects/data-access/projects.service';
import { AuthService } from './features/auth/data-access/auth.service';

@Component({
  selector: 'app-root',
  imports: [AppIcon, RouterOutlet, Nav, SectionTabs, ToastStack],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly shortcuts = inject(CommandShortcutsService);
  protected readonly theme = inject(ThemeService);

  // Section accent — the active section's colour, exposed as
  // `--section-accent` on the app shell. Sub-pages and shared primitives
  // (e.g. <app-ui-tab-bar>) pick it up via that CSS var.
  protected readonly nav = inject(NavState);

  // Eager-load shared lookup data so reference dropdowns (capture's @ trigger,
  // detail-modal pickers, etc.) always have data when first opened. The
  // services' constructors fire their HTTP loads on instantiation.
  protected readonly auth = inject(AuthService);
  private readonly _eagerActors = inject(ActorsService);
  private readonly _eagerProjects = inject(ProjectsService);
}
