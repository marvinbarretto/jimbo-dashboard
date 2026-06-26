import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { FocusSessionsService } from '../../data-access/focus-sessions.service';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { ProjectAvatar } from '@shared/components/project-avatar/project-avatar';
import type { Project } from '@domain/projects';
import type { VaultItem } from '@domain/vault';

const PRESETS = [15, 25, 45, 90] as const;

interface EpicVM {
  readonly id: string;
  readonly seq: number;
  readonly title: string;
  readonly recency: string;
  readonly done: number;
  readonly total: number;
  readonly pct: number;
}
interface StoryVM {
  readonly id: string;
  readonly seq: number;
  readonly title: string;
  readonly recency: string;
}
interface StepVM {
  readonly n: number;
  readonly label: string;
  readonly state: 'done' | 'active' | 'todo';
}

/**
 * Auto-advancing start wizard: pick a project and its epics reveal (most recent
 * first, with progress); pick an epic and its stories reveal; pick or create a
 * story. No "Next" buttons — selecting cascades. Skippable: start at any level.
 * The chosen story is linked to the session so each pomo carries a real intent.
 */
@Component({
  selector: 'app-pomo-pre-session',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, UiButton, ProjectAvatar],
  templateUrl: './pomo-pre-session.html',
  styleUrl: './pomo-pre-session.scss',
})
export class PomoPreSession {
  private readonly projects = inject(ProjectsService);
  private readonly sessions = inject(FocusSessionsService);
  private readonly vaultItems = inject(VaultItemsService);
  private readonly router = inject(Router);

  readonly presets = PRESETS;

  // Major projects first, then minor.
  readonly projectChips = computed<Project[]>(() => {
    const active = this.projects.activeProjects();
    return [...active.filter(p => p.kind === 'major'), ...active.filter(p => p.kind === 'minor')];
  });

  // `projectTouched` distinguishes "explicitly chose No project" (id null) from
  // "haven't chosen yet" (also id null) — the epic step only reveals for a real one.
  readonly projectTouched = signal(false);
  readonly selectedProjectId = signal<string | null>(null);
  readonly selectedEpicId = signal<string | null>(null);
  readonly selectedStoryId = signal<string | null>(null);

  readonly epics = computed<EpicVM[]>(() => {
    const pid = this.selectedProjectId();
    if (!this.projectTouched() || pid === null) return [];
    return this.vaultItems.activeItems()
      .filter(i => i.primary_project_id === pid && i.is_epic)
      .sort(byRecency)
      .map(toEpicVM);
  });

  readonly stories = computed<StoryVM[]>(() => {
    const eid = this.selectedEpicId();
    if (eid === null) return [];
    return this.vaultItems.activeItems()
      .filter(i => i.parent_id === eid && !i.is_epic)
      .sort(byRecency)
      .map(toStoryVM);
  });

  // Optional 4th level: narrow the focus to a sub-task under the chosen story.
  readonly selectedSubtaskId = signal<string | null>(null);
  readonly selectedStoryTitle = signal('');

  readonly subtasks = computed<StoryVM[]>(() => {
    const sid = this.selectedStoryId();
    if (sid === null) return [];
    return this.vaultItems.activeItems()
      .filter(i => i.parent_id === sid && !i.is_epic)
      .sort(byRecency)
      .map(toStoryVM);
  });

  readonly steps = computed<StepVM[]>(() => {
    const p = this.projectTouched();
    const e = this.selectedEpicId() !== null;
    const s = this.selectedStoryId() !== null;
    return [
      { n: 1, label: 'Project', state: p ? 'done' : 'active' },
      { n: 2, label: 'Epic', state: e ? 'done' : p ? 'active' : 'todo' },
      { n: 3, label: 'Story', state: s ? 'done' : e ? 'active' : 'todo' },
    ];
  });

  readonly newStoryTitle = signal('');
  readonly newSubtaskTitle = signal('');
  readonly minutes = signal(25);
  readonly intention = signal('');
  readonly starting = signal(false);

  isProjectSelected(id: string | null): boolean {
    return this.projectTouched() && this.selectedProjectId() === id;
  }
  isEpicSelected(id: string): boolean { return this.selectedEpicId() === id; }
  isStorySelected(id: string): boolean { return this.selectedStoryId() === id; }
  isSubtaskSelected(id: string): boolean { return this.selectedSubtaskId() === id; }
  projectColor(p: Project): string { return p.color_token ?? 'var(--color-accent)'; }

  selectProject(id: string | null): void {
    this.projectTouched.set(true);
    this.selectedProjectId.set(id);
    this.selectedEpicId.set(null);
    this.selectedStoryId.set(null);
    this.intention.set('');
  }

  selectEpic(id: string): void {
    this.selectedEpicId.set(this.selectedEpicId() === id ? null : id);
    this.selectedStoryId.set(null);
  }

  selectStory(id: string, title: string): void {
    this.selectedSubtaskId.set(null);
    if (this.selectedStoryId() === id) {
      this.selectedStoryId.set(null);
      this.selectedStoryTitle.set('');
      this.intention.set('');
    } else {
      this.selectedStoryId.set(id);
      this.selectedStoryTitle.set(title);
      this.intention.set(title);
    }
  }

  selectSubtask(id: string, title: string): void {
    if (this.selectedSubtaskId() === id) {
      this.selectedSubtaskId.set(null);
      this.intention.set(this.selectedStoryTitle()); // revert to the parent story
    } else {
      this.selectedSubtaskId.set(id);
      this.intention.set(title);
    }
  }

  createStory(): void {
    const title = this.newStoryTitle().trim();
    const epicId = this.selectedEpicId();
    if (!title || !epicId) return;
    this.vaultItems.createOnBoard(
      { title, type: 'task', parent_id: epicId, primary_project_id: this.selectedProjectId() },
      (real) => {
        this.selectedStoryId.set(real.id);
        this.selectedStoryTitle.set(real.title);
        this.selectedSubtaskId.set(null);
        this.intention.set(real.title);
      },
    );
    this.newStoryTitle.set('');
  }

  createSubtask(): void {
    const title = this.newSubtaskTitle().trim();
    const storyId = this.selectedStoryId();
    if (!title || !storyId) return;
    this.vaultItems.createOnBoard(
      { title, type: 'task', parent_id: storyId, primary_project_id: this.selectedProjectId() },
      (real) => {
        this.selectedSubtaskId.set(real.id);
        this.intention.set(real.title);
      },
    );
    this.newSubtaskTitle.set('');
  }

  async start(): Promise<void> {
    this.starting.set(true);
    const session = await this.sessions.start({
      project_id: this.selectedProjectId(),
      planned_seconds: this.minutes() * 60,
      notes: this.intention().trim() || undefined,
    });
    // Link the deepest chosen item as the focus: sub-task if narrowed, else story.
    const focusId = this.selectedSubtaskId() ?? this.selectedStoryId();
    if (session && focusId) {
      await this.sessions.linkNote(session.id, focusId);
    }
    void this.router.navigate(['/pomo/running']);
  }
}

// ── View-model helpers (recency sort + progress) ──────────────────────────────

// "Most recent worked on" = latest activity, falling back to creation.
function recencyMs(i: VaultItem): number {
  return new Date(i.latest_activity_at ?? i.created_at).getTime();
}
function byRecency(a: VaultItem, b: VaultItem): number {
  return recencyMs(b) - recencyMs(a);
}
function relTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
function toEpicVM(i: VaultItem): EpicVM {
  const total = i.children_count ?? 0;
  const done = i.children_done_count ?? 0;
  return {
    id: i.id,
    seq: i.seq,
    title: i.title,
    recency: relTime(i.latest_activity_at ?? i.created_at),
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
  };
}
function toStoryVM(i: VaultItem): StoryVM {
  return {
    id: i.id,
    seq: i.seq,
    title: i.title,
    recency: relTime(i.latest_activity_at ?? i.created_at),
  };
}
