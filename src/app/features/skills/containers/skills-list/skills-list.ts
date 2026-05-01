import { ChangeDetectionStrategy, Component, TemplateRef, computed, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type CellContext, createColumnHelper, type ColumnDef } from '@tanstack/angular-table';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiDataTable } from '@shared/components/ui-data-table/ui-data-table';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { SkillsService } from '../../data-access/skills.service';
import { skillNamespace, skillLocalName, type Skill } from '@domain/skills';

@Component({
  selector: 'app-skills-list',
  imports: [
    RouterLink,
    UiBadge,
    UiCluster,
    UiDataTable,
    UiEmptyState,
    UiLoadingState,
    UiPageHeader,
    UiStack,
  ],
  templateUrl: './skills-list.html',
  styleUrl: './skills-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsList {
  private readonly service = inject(SkillsService);
  private readonly columnHelper = createColumnHelper<Skill>();

  readonly isLoading = this.service.isLoading;
  readonly error = this.service.error;

  // Sort by last_used desc (most recent first), unused at the bottom.
  // Drives the dashboard's "what am I actually using" question — if it
  // sat at the bottom for months it's a candidate to retire or rework.
  readonly skills = computed<readonly Skill[]>(() => {
    return [...this.service.skills()].sort((a, b) => {
      const aTime = a.last_used ?? '';
      const bTime = b.last_used ?? '';
      if (aTime && !bTime) return -1;
      if (!aTime && bTime) return 1;
      if (aTime !== bTime) return bTime.localeCompare(aTime);
      return a.id.localeCompare(b.id);
    });
  });
  private readonly namespaceCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, string | null> }>>('namespaceCell');
  private readonly nameCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, string> }>>('nameCell');
  private readonly typeCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, Skill['type']> }>>('typeCell');
  private readonly executorsCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, string[]> }>>('executorsCell');
  private readonly lastUsedCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, string | undefined> }>>('lastUsedCell');
  private readonly activeCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, boolean> }>>('activeCell');

  readonly columns: ColumnDef<Skill, any>[] = [
    this.columnHelper.accessor(row => this.namespace(row.id), {
      id: 'namespace',
      header: 'Namespace',
      cell: () => this.namespaceCell(),
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor(row => this.localName(row.id), {
      id: 'name',
      header: 'Name',
      cell: () => this.nameCell(),
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor('type', {
      header: 'Type',
      cell: () => this.typeCell(),
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor('description', {
      header: 'Description',
    }),
    this.columnHelper.accessor(row => row.metadata.executors, {
      id: 'executors',
      header: 'Executors',
      cell: () => this.executorsCell(),
      enableSorting: false,
    }),
    this.columnHelper.accessor('last_used', {
      header: 'Last used',
      cell: () => this.lastUsedCell(),
      sortingFn: (a, b, columnId) => {
        const left = a.getValue<string | undefined>(columnId) ?? '';
        const right = b.getValue<string | undefined>(columnId) ?? '';
        if (left && !right) return -1;
        if (!left && right) return 1;
        return right.localeCompare(left);
      },
    }),
    this.columnHelper.accessor(row => this.isActive(row), {
      id: 'active',
      header: 'Active',
      cell: () => this.activeCell(),
      sortingFn: (a, b, columnId) => Number(b.getValue<boolean>(columnId)) - Number(a.getValue<boolean>(columnId)),
    }),
  ];

  readonly skillRowClass = (skill: Skill): string =>
    this.isActive(skill) ? '' : 'inactive';

  namespace = skillNamespace;
  localName = skillLocalName;

  // Routes split slash-paths into segments — `/skills/:category/:name`.
  skillLink(id: string): string[] {
    return id.split('/');
  }

  // Skills are filesystem-managed; `metadata.is_active !== false` is "live".
  isActive(skill: { metadata: { is_active?: boolean } }): boolean {
    return skill.metadata.is_active !== false;
  }

  typeTone(type: Skill['type']): 'info' | 'warning' | 'neutral' {
    if (type === 'interactive') return 'info';
    if (type === 'agent') return 'warning';
    return 'neutral';
  }

  // Coarse relative time so the table doesn't churn while the user reads it.
  // Absolute ISO is on the title attr in the template for hover detail.
  lastUsedLabel(iso: string | undefined): string {
    if (!iso) return 'never';
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return iso;
    const diffMs = Date.now() - ts;
    if (diffMs < 0) return 'just now';
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }
}
