import { ChangeDetectionStrategy, Component, TemplateRef, computed, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type CellContext, createColumnHelper, type ColumnDef } from '@tanstack/angular-table';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButtonLink } from '@shared/components/ui-button-link/ui-button-link';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiDataTable } from '@shared/components/ui-data-table/ui-data-table';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { SkillsService, type SkillUsage } from '../../data-access/skills.service';
import { skillNamespace, skillLocalName, type Skill } from '@domain/skills';

@Component({
  selector: 'app-skills-list',
  imports: [
    RouterLink,
    UiBadge,
    UiButtonLink,
    UiCluster,
    UiDataTable,
    UiEmptyState,
    UiLoadingState,
    UiPage,
    UiPageHeader,
    UiProse,
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
  private readonly requiresCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, string[]> }>>('requiresCell');
  private readonly lastUsedCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, string | undefined> }>>('lastUsedCell');
  private readonly activeCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, boolean> }>>('activeCell');
  private readonly potentialCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, number | undefined> }>>('potentialCell');
  private readonly statusCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, Skill['metadata']['status']> }>>('statusCell');
  private readonly descriptionCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, string> }>>('descriptionCell');
  private readonly runsCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, number> }>>('runsCell');
  private readonly declinedCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Skill, number> }>>('declinedCell');

  /** Dispatch outcomes for a skill, or undefined if it has never been dispatched. */
  usageFor(id: string): SkillUsage | undefined {
    return this.service.usage().get(id);
  }

  /**
   * Declined work as a share of attempts. A skill can look busy on `runs` and
   * still be failing its job if most of those were rejected or left unapproved.
   */
  declinedPct(id: string): number {
    const u = this.usageFor(id);
    if (!u || !u.runs) return 0;
    return Math.round(100 * (u.rejected + u.proposed) / u.runs);
  }

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
    this.columnHelper.accessor(row => row.metadata.potential, {
      id: 'potential',
      header: 'Potential',
      cell: () => this.potentialCell(),
      // Higher potential first; unscored (undefined) sinks to the bottom.
      sortingFn: (a, b, columnId) => {
        const left = a.getValue<number | undefined>(columnId);
        const right = b.getValue<number | undefined>(columnId);
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;
        return right - left;
      },
    }),
    this.columnHelper.accessor(row => row.metadata.status, {
      id: 'status',
      header: 'Status',
      cell: () => this.statusCell(),
      enableSorting: false,
    }),
    // Dispatch reality, next to the stated verdict — the two disagreeing is the
    // signal worth acting on (a 'keep' skill that has never run, or one whose
    // work is consistently rejected).
    this.columnHelper.accessor(row => this.usageFor(row.id)?.runs ?? 0, {
      id: 'runs',
      header: 'Runs',
      cell: () => this.runsCell(),
      sortingFn: 'basic',
    }),
    this.columnHelper.accessor(row => this.usageFor(row.id)?.rejected ?? 0, {
      id: 'declined',
      header: 'Declined',
      cell: () => this.declinedCell(),
      sortingFn: 'basic',
    }),
    this.columnHelper.accessor('type', {
      header: 'Type',
      cell: () => this.typeCell(),
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor('description', {
      header: 'Description',
      cell: () => this.descriptionCell(),
    }),
    this.columnHelper.accessor(row => row.metadata.requires, {
      id: 'requires',
      header: 'Requires',
      cell: () => this.requiresCell(),
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

  // Skills-map lifecycle verdict → badge tone. keep=good, refine=needs work,
  // wire-ambient=right skill wrong trigger, shelve/infra=off the menu.
  statusTone(status: Skill['metadata']['status']): 'success' | 'warning' | 'info' | 'neutral' {
    switch (status) {
      case 'keep': return 'success';
      case 'refine': return 'warning';
      case 'wire-ambient': return 'info';
      default: return 'neutral'; // shelve, infra, undefined
    }
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
