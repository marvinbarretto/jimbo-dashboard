import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { ToastService } from '@shared/components/toast/toast.service';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { VaultItemsService } from '../../data-access/vault-items.service';
import { VaultTypesService } from '../../data-access/vault-types.service';
import { VaultItemCommands } from '../../commands/vault-item-commands';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { effectivePriority } from '@domain/vault/readiness';
import type { VaultItem, VaultItemType, Priority } from '@domain/vault/vault-item';
import { lifecycleState, isArchived } from '@domain/vault/vault-item';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { UiTypeahead } from '@shared/components/ui-typeahead/ui-typeahead';
import { actorId } from '@domain/ids';
import type { ActorId, VaultItemId } from '@domain/ids';
import { withVaultDetailModal } from '@shared/kanban/detail-modal';

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
  imports: [RouterLink, FormsModule, TableShell, UiPage, EntityChip, RelativeTimePipe, UiTypeahead],
  templateUrl: './vault-items-list.html',
  styleUrl: './vault-items-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultItemsList {
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly vaultTypes = inject(VaultTypesService);
  private readonly vaultCommands = inject(VaultItemCommands);
  private readonly actorsService = inject(ActorsService);
  private readonly projectsService = inject(ProjectsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);

  constructor() { withVaultDetailModal(); }

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

  // Types come from the API's vocabulary, not a local list. A hardcoded
  // ['task','note','bookmark'] meant a spike or errand had no pill to filter
  // by, so those types looked unused when they were only unreachable. Anything
  // present in the data but absent from the vocabulary is appended —
  // vault_notes.type is free text, and a row you can't filter for is a row you
  // can't find.
  readonly typeOptions = computed<CountedOption<VaultItemType>[]>(() => {
    const items = this.applyFilters({ skipType: true });
    const counts = new Map<VaultItemType, number>();
    for (const item of items) counts.set(item.type, (counts.get(item.type) ?? 0) + 1);

    const known = this.vaultTypes.specs();
    const options: CountedOption<VaultItemType>[] = known.map(
      s => ({ value: s.type, label: s.label, count: counts.get(s.type) ?? 0 }),
    );
    const seen = new Set(known.map(s => s.type));
    for (const [type, count] of counts) {
      if (!seen.has(type)) options.push({ value: type, label: type, count });
    }
    return options;
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
        // `value` originated as item.assigned_to (already an ActorId on the
        // VaultItem domain type) but Map keys collapse to plain string. Brand
        // it back for the lookup.
        const actor = this.actorsService.getById(actorId(value));
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

  // Whole-row click navigates to the detail page. Inner anchors keep their
  // own semantics (cmd/ctrl/middle-click → new tab) — bail when the click
  // already landed on one. Skip when the user is mid-text-selection so
  // highlighting doesn't accidentally navigate away.
  onRowClick(seq: number, event: MouseEvent): void {
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if ((event.target as HTMLElement).closest('a, button')) return;
    if (this.doc.defaultView?.getSelection()?.toString()) return;
    this.router.navigate(['/vault-items', seq]);
  }

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
    // Cleanup is the primary use case: surface items by most-recent touch
    // (latest_activity_at, falling back to created_at). Stale captures sink
    // to the bottom and can be reached by reverse-sorting in a follow-up.
    return filtered.sort((a, b) => modifiedTs(b) - modifiedTs(a));
  }

  // ── Selection + bulk actions ───────────────────────────────────────────

  private readonly _selectedIds = signal<Set<VaultItemId>>(new Set());
  readonly selectedIds = this._selectedIds.asReadonly();
  readonly selectionCount = computed(() => this._selectedIds().size);
  readonly hasSelection = computed(() => this._selectedIds().size > 0);

  // True when every visible row is selected — drives the header checkbox
  // indeterminate / checked state.
  readonly allVisibleSelected = computed(() => {
    const visible = this.displayedItems();
    if (visible.length === 0) return false;
    const sel = this._selectedIds();
    return visible.every(item => sel.has(item.id));
  });

  readonly someVisibleSelected = computed(() => {
    const sel = this._selectedIds();
    if (sel.size === 0) return false;
    return !this.allVisibleSelected();
  });

  isSelected(id: VaultItemId): boolean {
    return this._selectedIds().has(id);
  }

  toggleSelect(id: VaultItemId): void {
    this._selectedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Header checkbox: select-all-visible. If everything visible is already
  // selected, this clears just the visible slice (leaves off-screen selection
  // alone — surprising behaviour either way; "clear all" button is explicit).
  toggleSelectAllVisible(): void {
    const visible = this.displayedItems();
    const sel = this._selectedIds();
    const allSelected = visible.every(item => sel.has(item.id));
    this._selectedIds.update(set => {
      const next = new Set(set);
      if (allSelected) {
        for (const item of visible) next.delete(item.id);
      } else {
        for (const item of visible) next.add(item.id);
      }
      return next;
    });
  }

  clearSelection(): void {
    this._selectedIds.set(new Set());
  }

  // ── Bulk action handlers ───────────────────────────────────────────────
  // Each iterates the snapshot of selection through the existing per-item
  // command path so optimistic UI and audit events behave identically to
  // single-row mutations. Per-row success toasts coalesce via ToastService's
  // group window — opened just before dispatch so the async tail still lands
  // inside the window.

  bulkArchive(): void {
    const ids = [...this._selectedIds()];
    if (ids.length === 0) return;
    const n = ids.length;
    this.toast.beginCoalescing({
      groupKey: 'vault.bulk-archive',
      successSummary: `Archived ${n} items`,
      errorSummary: `Archive failures (${n} attempted)`,
    });
    for (const id of ids) this.vaultCommands.archive(id);
    this.clearSelection();
  }

  bulkDelete(): void {
    const ids = [...this._selectedIds()];
    if (ids.length === 0) return;
    const confirmed = this.doc.defaultView?.confirm(
      `Hard-delete ${ids.length} item${ids.length === 1 ? '' : 's'}? This is irreversible.`,
    );
    if (!confirmed) return;
    const n = ids.length;
    this.toast.beginCoalescing({
      groupKey: 'vault.bulk-delete',
      successSummary: `Deleted ${n} items`,
      errorSummary: `Delete failures (${n} attempted)`,
    });
    for (const id of ids) this.vaultCommands.delete(id);
    this.clearSelection();
  }

  bulkConvertToNote(): void {
    const ids = [...this._selectedIds()];
    if (ids.length === 0) return;
    const confirmed = this.doc.defaultView?.confirm(
      `Convert ${ids.length} item${ids.length === 1 ? '' : 's'} to type 'note'?`,
    );
    if (!confirmed) return;
    const n = ids.length;
    this.toast.beginCoalescing({
      groupKey: 'vault.bulk-convert',
      successSummary: `Converted ${n} items to note`,
      errorSummary: `Convert failures (${n} attempted)`,
    });
    for (const id of ids) {
      const item = this.vaultItemsService.getById(id);
      if (!item || item.type === 'note') continue;
      this.vaultItemsService.update(id, { type: 'note' });
    }
    this.clearSelection();
  }

  // ── Reassign picker state ──────────────────────────────────────────────
  // Inline <select> in the bulk bar. Empty value = no actor chosen → button
  // disabled. Reset on apply or clear.
  private readonly _reassignTarget = signal<string>('');
  readonly reassignTarget = this._reassignTarget.asReadonly();
  setReassignTarget(value: string): void { this._reassignTarget.set(value); }

  readonly actorOptions = computed(() =>
    this.actorsService.activeActors().map(a => ({ id: a.id, label: a.display_name ?? a.id })),
  );

  bulkReassign(): void {
    const target = this._reassignTarget();
    if (!target) return;
    const ids = [...this._selectedIds()];
    if (ids.length === 0) return;
    const toActor = actorId(target);
    const n = ids.length;
    this.toast.beginCoalescing({
      groupKey: 'vault.bulk-reassign',
      successSummary: `Reassigned ${n} items to @${toActor}`,
      errorSummary: `Reassign failures (${n} attempted)`,
    });
    for (const id of ids) this.vaultCommands.reassign(id, toActor);
    this._reassignTarget.set('');
    this.clearSelection();
  }
}

// Modified timestamp for sort: most recent activity, falling back to creation
// when the item has never been touched.
function modifiedTs(item: VaultItem): number {
  const ref = item.latest_activity_at ?? item.created_at;
  const t = Date.parse(ref);
  return Number.isNaN(t) ? 0 : t;
}

// Immutable Set toggle — copy + add/remove. Returning a new Set ensures the
// signal sees a different reference and notifies subscribers.
function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
