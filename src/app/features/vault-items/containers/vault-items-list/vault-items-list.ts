import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { VaultItemsService } from '../../data-access/vault-items.service';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { effectivePriority } from '@domain/vault/readiness';
import type { VaultItem, VaultItemType, Priority } from '@domain/vault/vault-item';
import { lifecycleState, isArchived } from '@domain/vault/vault-item';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';

// "Lifecycle" derived from completed_at + archived_at; surfaced as a single
// pillar in the table so filters and rendering use the same vocabulary.
type Lifecycle = 'active' | 'done' | 'archived';

// Filter option counted against the *currently visible* set so the operator
// sees how many rows would remain after toggling. tone is optional CSS hook.
interface CountedOption<T> {
  value: T;
  label: string;
  count: number;
  tone?: string;
}

@Component({
  selector: 'app-vault-items-list',
  imports: [RouterLink, FormsModule, TableShell, EntityChip],
  templateUrl: './vault-items-list.html',
  styleUrl: './vault-items-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultItemsList {
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly actorsService = inject(ActorsService);
  private readonly projectsService = inject(ProjectsService);

  readonly isLoading = this.vaultItemsService.isLoading;

  // ── Filter state ────────────────────────────────────────────────────────
  // Each Set holds the active values for that dimension. Empty = no filter
  // applied on that axis. Signals so toggling re-runs the computed pipeline.
  private readonly _search = signal<string>('');
  private readonly _typeFilter = signal<Set<VaultItemType>>(new Set());
  private readonly _lifecycleFilter = signal<Set<Lifecycle>>(new Set());
  private readonly _categoryFilter = signal<Set<string>>(new Set());
  private readonly _ownerFilter = signal<Set<string>>(new Set());
  private readonly _projectFilter = signal<Set<string>>(new Set());

  readonly search = this._search.asReadonly();

  // Cap rendering at 500 rows by default — past that, modern browsers still
  // cope but the operator can't actually navigate that many. "Show all" reveals.
  private readonly _showAll = signal(false);
  readonly showAll = this._showAll.asReadonly();
  private readonly DEFAULT_LIMIT = 500;

  // ── Visible items: apply filters in order, sort by seq desc ─────────────
  readonly visibleItems = computed(() => this.applyFilters());

  // Capped list for the table; the count below uses the uncapped length so the
  // operator knows when their filter still has more.
  readonly displayedItems = computed(() => {
    const all = this.visibleItems();
    return this._showAll() || all.length <= this.DEFAULT_LIMIT
      ? all
      : all.slice(0, this.DEFAULT_LIMIT);
  });

  readonly totalItems = computed(() => this.vaultItemsService.items().length);
  readonly visibleCount = computed(() => this.visibleItems().length);

  // ── Filter option groups ────────────────────────────────────────────────
  // Each group counts options against items filtered by all OTHER dimensions
  // (the "skip self" pattern), so toggling a chip doesn't make it look like
  // its own count went to zero.

  readonly typeOptions = computed<CountedOption<VaultItemType>[]>(() => {
    const items = this.applyFilters({ skipType: true });
    const counts = new Map<VaultItemType, number>();
    for (const item of items) counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
    const types: VaultItemType[] = ['task', 'note', 'bookmark'];
    return types.map(t => ({ value: t, label: t, count: counts.get(t) ?? 0 }));
  });

  readonly lifecycleOptions = computed<CountedOption<Lifecycle>[]>(() => {
    const items = this.applyFilters({ skipLifecycle: true });
    const counts = new Map<Lifecycle, number>();
    for (const item of items) {
      const lc = lifecycleState(item) as Lifecycle;
      counts.set(lc, (counts.get(lc) ?? 0) + 1);
    }
    const order: Lifecycle[] = ['active', 'done', 'archived'];
    return order.map(lc => ({ value: lc, label: lc, count: counts.get(lc) ?? 0 }));
  });

  readonly categoryOptions = computed<CountedOption<string>[]>(() => {
    const items = this.applyFilters({ skipCategory: true });
    const counts = new Map<string, number>();
    for (const item of items) {
      const cat = item.category ?? '';
      if (!cat) continue;
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count }));
  });

  readonly ownerOptions = computed<CountedOption<string>[]>(() => {
    const items = this.applyFilters({ skipOwner: true });
    const counts = new Map<string, number>();
    let unassigned = 0;
    for (const item of items) {
      if (item.assigned_to) counts.set(item.assigned_to, (counts.get(item.assigned_to) ?? 0) + 1);
      else unassigned++;
    }
    const opts: CountedOption<string>[] = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => {
        const actor = this.actorsService.getById(value);
        return { value, label: actor?.display_name ? `@${actor.id}` : `@${value}`, count, tone: value };
      });
    if (unassigned > 0) opts.push({ value: '__unassigned__', label: 'unassigned', count: unassigned });
    return opts;
  });

  readonly projectOptions = computed<CountedOption<string>[]>(() => {
    const items = this.applyFilters({ skipProject: true });
    const counts = new Map<string, number>();
    for (const item of items) {
      const id = item.primary_project_id ?? '';
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => {
        // Lookup any item with this project to find its display_name from the embed.
        const item = items.find(i => i.primary_project_id === value);
        return {
          value,
          label: item?.primary_project_name ?? value,
          count,
          tone: value,
        };
      });
  });

  readonly hasActiveFilters = computed(() =>
    !!this._search() ||
    this._typeFilter().size > 0 ||
    this._lifecycleFilter().size > 0 ||
    this._categoryFilter().size > 0 ||
    this._ownerFilter().size > 0 ||
    this._projectFilter().size > 0,
  );

  // ── Active-set readers for the template ────────────────────────────────
  readonly activeTypes      = computed(() => this._typeFilter());
  readonly activeLifecycle  = computed(() => this._lifecycleFilter());
  readonly activeCategories = computed(() => this._categoryFilter());
  readonly activeOwners     = computed(() => this._ownerFilter());
  readonly activeProjects   = computed(() => this._projectFilter());

  // ── Toggles ────────────────────────────────────────────────────────────
  toggleType(v: VaultItemType): void { this._typeFilter.update(s => toggle(s, v)); }
  toggleLifecycle(v: Lifecycle): void { this._lifecycleFilter.update(s => toggle(s, v)); }
  toggleCategory(v: string): void { this._categoryFilter.update(s => toggle(s, v)); }
  toggleOwner(v: string): void { this._ownerFilter.update(s => toggle(s, v)); }
  toggleProject(v: string): void { this._projectFilter.update(s => toggle(s, v)); }

  setSearch(value: string): void { this._search.set(value); }

  resetFilters(): void {
    this._search.set('');
    this._typeFilter.set(new Set());
    this._lifecycleFilter.set(new Set());
    this._categoryFilter.set(new Set());
    this._ownerFilter.set(new Set());
    this._projectFilter.set(new Set());
  }

  toggleShowAll(): void { this._showAll.update(v => !v); }

  // ── Per-row template helpers ───────────────────────────────────────────
  lifecycleOf = lifecycleState;
  isItemArchived = isArchived;

  ownerLabel(item: VaultItem): string {
    if (!item.assigned_to) return '';
    const actor = this.actorsService.getById(item.assigned_to);
    return actor?.display_name ?? item.assigned_to;
  }

  projectColor(id: string | null | undefined): string | null {
    if (!id) return null;
    return this.projectsService.getById(id)?.color_token ?? null;
  }

  // Use the embedded primary_project_name from the API response — no per-row
  // junction-service lookup needed.
  primaryProjectDisplay(item: VaultItem): string {
    return item.primary_project_name ?? '—';
  }

  effectivePriority(item: VaultItem): Priority | null {
    return effectivePriority(item);
  }

  priorityLabel(p: Priority | null): string {
    return p === null ? '—' : 'P' + p;
  }

  // ── Filter pipeline ────────────────────────────────────────────────────
  // Optional `skip*` flags let the option-counting code count what would be
  // visible if the operator toggled THAT dimension, without disabling the
  // others. Single source of truth for filter logic.

  private applyFilters(opts: {
    skipType?: boolean;
    skipLifecycle?: boolean;
    skipCategory?: boolean;
    skipOwner?: boolean;
    skipProject?: boolean;
  } = {}): VaultItem[] {
    const search = this._search().trim().toLowerCase();
    const typeF = this._typeFilter();
    const lcF = this._lifecycleFilter();
    const catF = this._categoryFilter();
    const ownerF = this._ownerFilter();
    const projF = this._projectFilter();

    const all = this.vaultItemsService.items();
    const filtered = all.filter(item => {
      if (search) {
        const haystack = `${item.seq} ${item.title} ${item.body ?? ''} ${item.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (!opts.skipType && typeF.size > 0) {
        if (!typeF.has(item.type)) return false;
      }
      if (!opts.skipLifecycle && lcF.size > 0) {
        if (!lcF.has(lifecycleState(item) as Lifecycle)) return false;
      }
      if (!opts.skipCategory && catF.size > 0) {
        if (!item.category || !catF.has(item.category)) return false;
      }
      if (!opts.skipOwner && ownerF.size > 0) {
        const ownerKey = item.assigned_to ?? '__unassigned__';
        if (!ownerF.has(ownerKey)) return false;
      }
      if (!opts.skipProject && projF.size > 0) {
        if (!item.primary_project_id || !projF.has(item.primary_project_id)) return false;
      }
      return true;
    });
    // Sort by seq desc so the most recently-captured items lead.
    return filtered.sort((a, b) => b.seq - a.seq);
  }
}

// Immutable Set toggle — copy + add/remove. Returning a new Set ensures the
// signal sees a different reference and notifies subscribers.
function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
