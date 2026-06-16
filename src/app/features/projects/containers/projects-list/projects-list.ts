import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Dialog } from '@angular/cdk/dialog';
import { UiAddTile } from '@shared/components/ui-add-tile/ui-add-tile';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiInlineTabs, type UiInlineTabOption } from '@shared/components/ui-inline-tabs/ui-inline-tabs';
import { EpicMomentumRow, type EpicMomentumRowVM } from '@shared/components/epic-momentum-row/epic-momentum-row';

const UNLINKED_TAB_KEY = '__unlinked';
import type { Project, ProjectKind } from '@domain/projects';
import type { ProjectId } from '@domain/ids';
import type { VaultItem } from '@domain/vault/vault-item';
import { ProjectsService } from '../../data-access/projects.service';
import { ProjectCard } from '../../components/project-card/project-card';
import { ProjectFormDialog, type ProjectFormDialogData } from '../project-form-dialog/project-form-dialog';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';

@Component({
  selector: 'app-projects-list',
  imports: [CdkDrag, CdkDropList, UiAddTile, UiPageHeader, UiStack, ProjectCard, UiInlineTabs, EpicMomentumRow],
  templateUrl: './projects-list.html',
  styleUrl: './projects-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsList {
  private readonly service = inject(ProjectsService);
  private readonly vaultItems = inject(VaultItemsService);
  private readonly dialog = inject(Dialog);

  readonly majorProjects = computed(() =>
    this.service.projects().filter(p => p.status === 'active' && p.kind === 'major')
  );

  readonly minorProjects = computed(() =>
    this.service.projects().filter(p => p.status === 'active' && p.kind === 'minor')
  );

  readonly adminProjects = computed(() =>
    this.service.projects().filter(p => p.status === 'active' && p.kind === 'admin')
  );

  readonly archivedProjects = computed(() =>
    this.service.projects().filter(p => p.status === 'archived')
  );

  // All epics, freshest first. Sorted by latest activity (falling back to
  // created_at) so the cross-project rail surfaces what's actually moving.
  private readonly epicsByRecency = computed(() =>
    this.vaultItems.items()
      .filter(i => i.is_epic)
      .slice()
      .sort((a, b) => (b.latest_activity_at ?? b.created_at).localeCompare(a.latest_activity_at ?? a.created_at))
  );

  // Top-of-page rail: small cross-project view of what moved most recently.
  readonly recentlyActiveEpics = computed(() => this.epicsByRecency().slice(0, 5));

  // Cross-project rail rows — project chip shown, since these span projects.
  readonly recentEpicRows = computed<readonly EpicMomentumRowVM[]>(() =>
    this.recentlyActiveEpics().map(epic => this.toMomentumRow(epic, true))
  );

  // Selected project tab for the "Epics by project" section. The literal
  // '__unlinked' value matches the section key for orphan epics. Tracks user
  // selection; `activeEpicSection` falls back to the first available section
  // when this points at a tab that doesn't exist (e.g. selected project ran
  // out of epics, page first loaded).
  readonly selectedProjectTab = signal<string | null>(null);

  // Grouped view: epic list per project, in the same major → mini → admin
  // visual order as the project sections above, then any project that exists
  // but isn't in those buckets (defensive), then a final "Unlinked" group for
  // epics whose resolution walk turned up nothing — surfaces the gap rather
  // than hiding it.
  readonly epicSections = computed<EpicSection[]>(() => {
    const grouped = new Map<string | null, VaultItem[]>();
    for (const epic of this.epicsByRecency()) {
      const key = epic.primary_project_id ?? null;
      (grouped.get(key) ?? grouped.set(key, []).get(key)!).push(epic);
    }

    const ordered: EpicSection[] = [];
    const seen = new Set<string>();
    const push = (p: Project) => {
      const epics = grouped.get(p.id);
      if (!epics?.length) return;
      ordered.push({ project: p, epics });
      seen.add(p.id);
    };
    this.majorProjects().forEach(push);
    this.minorProjects().forEach(push);
    this.adminProjects().forEach(push);

    // Any project not in major/mini/admin (archived, unusual kind) that still
    // owns epics — don't drop them on the floor.
    for (const [pid, epics] of grouped) {
      if (pid === null || seen.has(pid)) continue;
      const project = this.service.getById(pid);
      if (project) ordered.push({ project, epics });
    }

    const unlinked = grouped.get(null);
    if (unlinked?.length) ordered.push({ project: null, epics: unlinked });

    return ordered;
  });

  // Project tabs derived from the sections. Stable keys: project.id for linked
  // groups, '__unlinked' for the orphan bucket. Each tab carries the project
  // colour (when known) and an epic count.
  readonly projectTabOptions = computed<readonly UiInlineTabOption[]>(() =>
    this.epicSections().map((section): UiInlineTabOption => ({
      value: section.project?.id ?? UNLINKED_TAB_KEY,
      label: section.project?.display_name ?? 'Unlinked',
      count: section.epics.length,
      dotColor: section.project?.color_token ?? null,
    }))
  );

  // The section corresponding to the active tab. Falls back to the section
  // matching the most-recently-active epic when no tab is selected yet, so the
  // page lands on "whatever you'd most likely want to look at first."
  readonly activeProjectTab = computed<string | null>(() => {
    const selected = this.selectedProjectTab();
    const tabs = this.projectTabOptions();
    if (selected && tabs.some(t => t.value === selected)) return selected;
    const freshestEpic = this.epicsByRecency()[0];
    const freshestKey = freshestEpic ? (freshestEpic.primary_project_id ?? UNLINKED_TAB_KEY) : null;
    if (freshestKey && tabs.some(t => t.value === freshestKey)) return freshestKey;
    return tabs[0]?.value ?? null;
  });

  readonly activeEpicSection = computed<EpicSection | null>(() => {
    const key = this.activeProjectTab();
    if (!key) return null;
    return this.epicSections().find(s => (s.project?.id ?? UNLINKED_TAB_KEY) === key) ?? null;
  });

  // Rows for the active tab — project chip omitted, since the section is already
  // grouped under one project (or the Unlinked bucket).
  readonly activeEpicRows = computed<readonly EpicMomentumRowVM[]>(() =>
    (this.activeEpicSection()?.epics ?? []).map(epic => this.toMomentumRow(epic, false))
  );

  // Shape a vault-item epic into the momentum row's view-model. `withProject` drives
  // whether the leading project chip is carried — on for the cross-project rail, off
  // inside per-project groups where it would be redundant.
  private toMomentumRow(epic: VaultItem, withProject: boolean): EpicMomentumRowVM {
    const projectId = epic.primary_project_id;
    return {
      id: epic.id,
      seq: epic.seq,
      title: epic.title,
      project: withProject && projectId && epic.primary_project_name
        ? { id: projectId, name: epic.primary_project_name, color: this.projectColor(projectId) }
        : null,
      childrenTotal: epic.children_count ?? 0,
      childrenDone: epic.children_done_count ?? 0,
      childrenActive: epic.children_active_count ?? 0,
      childrenBlocked: epic.children_blocked_count ?? 0,
      done7d: epic.children_done_7d ?? 0,
      stalled: this.isStalled(epic),
    };
  }

  onDrop(event: CdkDragDrop<Project[]>, targetKind: ProjectKind): void {
    if (event.previousContainer === event.container) return;
    const project: Project = event.item.data;
    this.service.update(project.id, { kind: targetKind });
  }

  projectColor(id: string | null | undefined): string | null {
    return id ? this.service.getById(id)?.color_token ?? null : null;
  }

  // An epic is "stalled" when it has incomplete children but nothing has
  // been completed in the last 30 days. Surfaces the case where the work
  // structure exists but momentum has dropped — distinct from "blocked",
  // which is a per-task state flag.
  isStalled(epic: { children_count?: number; children_done_count?: number; last_child_completed_at?: string | null }): boolean {
    const total = epic.children_count ?? 0;
    const done = epic.children_done_count ?? 0;
    if (total === 0 || done === total) return false;
    if (!epic.last_child_completed_at) return true;
    const ageDays = (Date.now() - new Date(epic.last_child_completed_at).getTime()) / 86_400_000;
    return ageDays > 30;
  }

  remove(id: ProjectId): void {
    if (confirm(`Remove project ${id}?`)) {
      this.service.remove(id);
    }
  }

  openCreate(kind: ProjectKind): void {
    this.dialog.open<ProjectId | null, ProjectFormDialogData>(ProjectFormDialog, {
      data: { kind },
      panelClass: 'project-form-dialog',
      ariaModal: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      hasBackdrop: true,
    });
  }

  statusTone(status: string): 'success' | 'neutral' {
    return status === 'active' ? 'success' : 'neutral';
  }
}

interface EpicSection {
  project: Project | null;
  epics: VaultItem[];
}
