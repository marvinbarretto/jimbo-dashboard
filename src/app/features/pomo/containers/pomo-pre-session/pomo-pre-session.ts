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
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import type { Project } from '@domain/projects';
import type { VaultItem } from '@domain/vault';

const PRESETS = [15, 25, 45, 90] as const;

/**
 * Guided-but-skippable start flow: pick a project, then (optionally) an epic,
 * then (optionally) a story under it — or create one. The chosen story is linked
 * to the focus session so each pomo is bound to a concrete intention, but you can
 * start at any level without drilling all the way down.
 */
@Component({
  selector: 'app-pomo-pre-session',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, UiStack, UiCard, UiButton, UiCluster],
  templateUrl: './pomo-pre-session.html',
  styleUrl: './pomo-pre-session.scss',
})
export class PomoPreSession {
  private readonly projects = inject(ProjectsService);
  private readonly sessions = inject(FocusSessionsService);
  private readonly vaultItems = inject(VaultItemsService);
  private readonly router = inject(Router);

  readonly presets = PRESETS;
  readonly majorProjects = computed(() => this.projects.activeProjects().filter(p => p.kind === 'major'));
  readonly minorProjects = computed(() => this.projects.activeProjects().filter(p => p.kind === 'minor'));

  readonly selectedProjectId = signal<string | null>(null);
  readonly selectedEpicId = signal<string | null>(null);
  readonly selectedStoryId = signal<string | null>(null);

  // Step 2: epics belonging to the selected project.
  readonly projectEpics = computed(() => {
    const pid = this.selectedProjectId();
    if (pid === null) return [];
    return this.vaultItems.activeItems()
      .filter(i => i.primary_project_id === pid && i.is_epic)
      .slice(0, 12);
  });

  // Step 3: stories (non-epic children) under the selected epic.
  readonly epicStories = computed(() => {
    const eid = this.selectedEpicId();
    if (eid === null) return [];
    return this.vaultItems.activeItems()
      .filter(i => i.parent_id === eid && !i.is_epic)
      .slice(0, 20);
  });

  readonly newStoryTitle = signal('');
  readonly minutes = signal(25);
  readonly intention = signal('');
  readonly starting = signal(false);

  isProjectSelected(id: string | null): boolean { return this.selectedProjectId() === id; }
  isEpicSelected(id: string): boolean { return this.selectedEpicId() === id; }
  isStorySelected(id: string): boolean { return this.selectedStoryId() === id; }

  projectColor(p: Project): string { return p.color_token ?? 'var(--color-accent)'; }

  selectProject(id: string | null): void {
    this.selectedProjectId.set(id);
    this.selectedEpicId.set(null);
    this.selectedStoryId.set(null);
    this.intention.set('');
  }

  selectEpic(id: string): void {
    this.selectedEpicId.set(this.selectedEpicId() === id ? null : id);
    this.selectedStoryId.set(null);
  }

  selectStory(item: VaultItem): void {
    if (this.selectedStoryId() === item.id) {
      this.selectedStoryId.set(null);
      this.intention.set('');
    } else {
      this.selectedStoryId.set(item.id);
      this.intention.set(item.title);
    }
  }

  createStory(): void {
    const title = this.newStoryTitle().trim();
    const epicId = this.selectedEpicId();
    if (!title || !epicId) return;
    this.vaultItems.createOnBoard(
      { title, type: 'task', parent_id: epicId, primary_project_id: this.selectedProjectId() },
      (real) => {
        // Select the freshly-created story so starting links it to the session.
        this.selectedStoryId.set(real.id);
        this.intention.set(real.title);
      },
    );
    this.newStoryTitle.set('');
  }

  async start(): Promise<void> {
    this.starting.set(true);
    const session = await this.sessions.start({
      project_id: this.selectedProjectId(),
      planned_seconds: this.minutes() * 60,
      notes: this.intention().trim() || undefined,
    });
    const storyId = this.selectedStoryId();
    if (session && storyId) {
      await this.sessions.linkNote(session.id, storyId);
    }
    void this.router.navigate(['/pomo/running']);
  }
}
