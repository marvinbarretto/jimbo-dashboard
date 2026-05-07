import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FocusSessionsService } from '../../data-access/focus-sessions.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';

@Component({
  selector: 'app-pomo-running',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiButton, UiCluster],
  templateUrl: './pomo-running.html',
  styleUrl: './pomo-running.scss',
})
export class PomoRunning implements OnInit {
  private readonly sessions = inject(FocusSessionsService);
  private readonly projects = inject(ProjectsService);
  private readonly vaultItems = inject(VaultItemsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly session = this.sessions.active;

  private readonly now = signal(Date.now());

  readonly remainingSeconds = computed(() => {
    const s = this.session();
    if (!s) return 0;
    const elapsed = (this.now() - new Date(s.started_at).getTime()) / 1000;
    return Math.max(0, Math.round(s.planned_seconds - elapsed));
  });

  readonly progressPct = computed(() => {
    const s = this.session();
    if (!s) return 0;
    const r = this.remainingSeconds();
    return Math.min(100, ((s.planned_seconds - r) / s.planned_seconds) * 100);
  });

  readonly displayTime = computed(() => formatTime(this.remainingSeconds()));
  readonly isExpired = computed(() => this.session() !== null && this.remainingSeconds() === 0);

  readonly projectName = computed(() => {
    const s = this.session();
    if (!s?.project_id) return null;
    return this.projects.getById(s.project_id)?.display_name ?? null;
  });

  readonly projectColor = computed(() => {
    const s = this.session();
    if (!s?.project_id) return null;
    return this.projects.getById(s.project_id)?.color_token ?? null;
  });

  readonly projectItems = computed(() => {
    const s = this.session();
    if (!s?.project_id) return [];
    return this.vaultItems.activeItems()
      .filter(i => i.primary_project_id === s.project_id && !i.is_epic)
      .slice(0, 5);
  });

  constructor() {
    // Tick while session is active.
    effect((onCleanup) => {
      if (!this.session()) return;
      const handle = setInterval(() => this.now.set(Date.now()), 1000);
      onCleanup(() => clearInterval(handle));
    });

    // Keep tab title in sync.
    effect(() => {
      document.title = this.session()
        ? `${this.displayTime()} — Pomo`
        : 'Pomo';
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.session()) {
      await this.sessions.loadActive();
    }
    if (!this.session()) {
      void this.router.navigate(['/pomo/pre-session'], { replaceUrl: true });
    }
  }

  async finishEarly(): Promise<void> {
    const s = this.session();
    if (!s) return;
    await this.sessions.complete(s.id);
    void this.router.navigate(['/pomo/retro']);
  }

  async abandon(): Promise<void> {
    const s = this.session();
    if (!s || !confirm('Abandon this session?')) return;
    await this.sessions.abandon(s.id);
    void this.router.navigate(['/pomo/pre-session']);
  }
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
