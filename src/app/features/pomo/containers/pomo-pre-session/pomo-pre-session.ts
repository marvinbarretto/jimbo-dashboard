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
  readonly selectedVaultItemId = signal<string | null>(null);

  readonly projectItems = computed(() =>
    this.vaultItems.activeItems()
      .filter(i => i.primary_project_id === this.selectedProjectId() && !i.is_epic)
      .slice(0, 8),
  );

  readonly projectEpics = computed(() =>
    this.vaultItems.activeItems()
      .filter(i => i.primary_project_id === this.selectedProjectId() && i.is_epic)
      .slice(0, 3),
  );

  readonly minutes = signal(25);
  readonly intention = signal('');
  readonly starting = signal(false);

  selectProject(id: string | null): void {
    this.selectedProjectId.set(id);
    this.selectedVaultItemId.set(null);
  }

  isSelected(id: string | null): boolean {
    return this.selectedProjectId() === id;
  }

  projectColor(p: Project): string {
    return p.color_token ?? 'var(--color-accent)';
  }

  selectVaultItem(item: VaultItem): void {
    if (this.selectedVaultItemId() === item.id) {
      this.selectedVaultItemId.set(null);
      this.intention.set('');
    } else {
      this.selectedVaultItemId.set(item.id);
      this.intention.set(item.title);
    }
  }

  isVaultItemSelected(id: string): boolean {
    return this.selectedVaultItemId() === id;
  }

  async start(): Promise<void> {
    this.starting.set(true);
    await this.sessions.start({
      project_id: this.selectedProjectId(),
      planned_seconds: this.minutes() * 60,
      notes: this.intention().trim() || undefined,
    });
    void this.router.navigate(['/pomo/running']);
  }
}
