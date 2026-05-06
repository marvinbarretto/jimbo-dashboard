import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Nav } from './shared/components/nav/nav';
import { ToastStack } from './shared/components/toast/toast-stack';
import { CommandShortcutsService } from './shared/services/command-shortcuts.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Nav, ToastStack],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly shortcuts = inject(CommandShortcutsService);
}
