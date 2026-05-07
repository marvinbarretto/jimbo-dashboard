import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FocusSessionsService } from '../../data-access/focus-sessions.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';

@Component({
  selector: 'app-pomo-retro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, UiStack, UiCard, UiButton, UiCluster],
  templateUrl: './pomo-retro.html',
  styleUrl: './pomo-retro.scss',
})
export class PomoRetro implements OnInit {
  private readonly sessions = inject(FocusSessionsService);
  private readonly projects = inject(ProjectsService);
  private readonly router = inject(Router);

  // The retro page works against the most recent session in the recent list,
  // since active is already null by the time the extension navigates here.
  readonly session = computed(() => this.sessions.recent()[0] ?? null);

  readonly projectName = computed(() => {
    const id = this.session()?.project_id;
    if (!id) return 'No project';
    return this.projects.getById(id)?.display_name ?? id;
  });

  readonly plannedMins = computed(() =>
    Math.round((this.session()?.planned_seconds ?? 0) / 60),
  );

  readonly notes = signal('');
  readonly tags = signal('');
  readonly saving = signal(false);

  async ngOnInit(): Promise<void> {
    await this.sessions.loadRecent(1);
    if (this.session()?.notes) this.notes.set(this.session()!.notes!);
    if (this.session()?.tags.length) this.tags.set(this.session()!.tags.join(' '));
  }

  async save(): Promise<void> {
    const s = this.session();
    if (!s) return void this.router.navigate(['/pomo/pre-session']);
    this.saving.set(true);
    const tagList = this.tags()
      .split(/[,\s]+/)
      .map(t => t.replace(/^#/, '').trim())
      .filter(Boolean);
    await this.sessions.complete(s.id, {
      notes: this.notes().trim() || undefined,
      tags: tagList.length ? tagList : undefined,
    });
    void this.router.navigate(['/pomo/pre-session']);
  }

  skip(): void {
    void this.router.navigate(['/pomo/pre-session']);
  }
}
