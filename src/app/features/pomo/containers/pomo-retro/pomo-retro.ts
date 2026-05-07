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
import type { SessionMood } from '@domain/focus-sessions';

const MOOD_OPTIONS: { value: SessionMood; icon: string; label: string }[] = [
  { value: -1, icon: '👎', label: 'Bad' },
  { value:  0, icon: '😐', label: 'OK' },
  { value:  1, icon: '👍', label: 'Good' },
];

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

  readonly moodOptions = MOOD_OPTIONS;

  readonly session = computed(() => this.sessions.recent()[0] ?? null);

  readonly projectName = computed(() => {
    const id = this.session()?.project_id;
    if (!id) return 'No project';
    return this.projects.getById(id)?.display_name ?? id;
  });

  readonly plannedMins = computed(() =>
    Math.round((this.session()?.planned_seconds ?? 0) / 60),
  );

  readonly activity = computed(() => this.session()?.activity ?? null);

  readonly focusPct = computed(() =>
    Math.round((this.activity()?.focus_ratio ?? 0) * 100),
  );

  readonly notes = signal('');
  readonly tags = signal('');
  readonly mood = signal<SessionMood | null>(null);
  readonly interrupted = signal(false);
  readonly saving = signal(false);

  async ngOnInit(): Promise<void> {
    await this.sessions.loadRecent(1);
    const s = this.session();
    if (s?.notes) this.notes.set(s.notes);
    if (s?.tags.length) this.tags.set(s.tags.join(' '));
    if (s?.mood != null) this.mood.set(s.mood);
    if (s?.interrupted) this.interrupted.set(s.interrupted);
  }

  toggleMood(value: SessionMood): void {
    this.mood.set(this.mood() === value ? null : value);
  }

  async save(): Promise<void> {
    const s = this.session();
    if (!s) return void this.router.navigate(['/pomo/pre-session']);
    this.saving.set(true);
    const tagList = this.tags()
      .split(/[,\s]+/)
      .map(t => t.replace(/^#/, '').trim())
      .filter(Boolean);
    await this.sessions.update(s.id, {
      notes: this.notes().trim() || null,
      tags: tagList,
      mood: this.mood(),
      interrupted: this.interrupted(),
    });
    void this.router.navigate(['/pomo/pre-session']);
  }

  skip(): void {
    void this.router.navigate(['/pomo/pre-session']);
  }

  formatMins(seconds: number): string {
    return `${Math.round(seconds / 60)}m`;
  }
}
