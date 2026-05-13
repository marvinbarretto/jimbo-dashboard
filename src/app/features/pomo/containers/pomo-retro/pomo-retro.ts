import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FocusSessionsService } from '../../data-access/focus-sessions.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import type { FocusSessionCommit, SessionMood } from '@domain/focus-sessions';
import { vaultItemId } from '@domain/ids';

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
  private readonly vaultItems = inject(VaultItemsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Break duration passed through by the extension (?break=5). Falls back to
  // 5 mins if absent so a hand-typed visit still works.
  readonly breakMins = computed(() => {
    const raw = this.route.snapshot.queryParamMap.get('break');
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 5;
  });

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

  readonly projectItems = computed(() => {
    const id = this.session()?.project_id;
    if (!id) return [];
    return this.vaultItems.activeItems()
      .filter(i => i.primary_project_id === id && !i.is_epic)
      .slice(0, 10);
  });

  readonly completedItemIds = signal<Set<string>>(new Set());

  readonly notes = signal('');
  readonly tags = signal('');
  readonly mood = signal<SessionMood | null>(null);
  readonly interrupted = signal(false);
  readonly saving = signal(false);
  readonly commits = signal<FocusSessionCommit[]>([]);

  async ngOnInit(): Promise<void> {
    await this.sessions.loadRecent(1);
    const s = this.session();
    if (s?.notes) this.notes.set(s.notes);
    if (s?.tags.length) this.tags.set(s.tags.join(' '));
    if (s?.mood != null) this.mood.set(s.mood);
    if (s?.interrupted) this.interrupted.set(s.interrupted);
    if (s) {
      const commits = await this.sessions.loadCommits(s.id);
      this.commits.set(commits);
    }
  }

  shortSha(sha: string): string {
    return sha.slice(0, 7);
  }

  commitSubject(message: string): string {
    return message.split('\n')[0] ?? message;
  }

  toggleMood(value: SessionMood): void {
    this.mood.set(this.mood() === value ? null : value);
  }

  toggleItemDone(id: string): void {
    this.completedItemIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  isItemDone(id: string): boolean {
    return this.completedItemIds().has(id);
  }

  private async persistReflection(): Promise<void> {
    const s = this.session();
    if (!s) return;

    for (const id of this.completedItemIds()) {
      this.vaultItems.setCompleted(vaultItemId(id), true, 'Completed during pomo session');
    }

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
  }

  async startBreak(): Promise<void> {
    this.saving.set(true);
    await this.persistReflection();
    void this.router.navigate(['/pomo/break'], { queryParams: { mins: this.breakMins() } });
  }

  async skipBreak(): Promise<void> {
    this.saving.set(true);
    await this.persistReflection();
    void this.router.navigate(['/pomo/pre-session']);
  }

  formatMins(seconds: number): string {
    return `${Math.round(seconds / 60)}m`;
  }
}
