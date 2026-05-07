import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { FocusSessionsService } from '../../data-access/focus-sessions.service';

@Component({
  selector: 'app-pomo-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class PomoShell implements OnInit {
  private readonly sessions = inject(FocusSessionsService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    await this.sessions.loadActive();
    const target = this.sessions.active() ? '/pomo/running' : '/pomo/pre-session';
    void this.router.navigate([target], { replaceUrl: true });
  }
}
