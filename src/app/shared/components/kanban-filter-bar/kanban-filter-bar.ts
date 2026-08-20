import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Chip } from '@shared/components/chip/chip';
import { EntityChip, type EntityType } from '@shared/components/entity-chip/entity-chip';
import { columnLimitLabel } from '@shared/kanban/column-limit';

export interface FilterOption<TValue extends string | number> {
  value: TValue;
  label: string;
  count: number;
  tone?: string;
  entityType?: EntityType;
  color?: string | null;
}

// One filter group = one labelled row of chips that share a state Set.
// `id` lets the parent identify which group emitted a toggle event.
// `wide` groups get a full-width row of their own (chips wrap); the rest share
// the compact controls row with the search box.
export interface FilterGroup<TValue extends string | number = string | number> {
  id:      string;
  label:   string;
  options: FilterOption<TValue>[];
  active:  Set<TValue>;
  wide?:   boolean;
}

// Single sort option — value is a string key, label is the display name.
// Sort chips are radio-style (only one active at a time); the parent owns state.
export interface SortOption {
  value: string;
  label: string;
}

// One labelled row of filter chips. Extracted from the bar so the inline
// (controls-row) and wide (own-row) placements render identical markup.
@Component({
  selector: 'app-kanban-filter-group',
  imports: [Chip, EntityChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-testid]': '"filter-group"',
    '[attr.data-group]': 'group().id',
  },
  template: `
    <span class="group__label" [class.group__label--active]="activeCount() > 0">
      {{ group().label }}
      @if (activeCount() > 0) {
        <span class="group__badge" [attr.aria-label]="activeCount() + ' selected'">{{ activeCount() }}</span>
      }
    </span>
    @for (opt of group().options; track opt.value) {
      @if (opt.entityType) {
        <button type="button" class="group__entity-btn"
          data-testid="filter-chip"
          [attr.data-value]="opt.value"
          [disabled]="opt.count === 0 && !group().active.has(opt.value)"
          (click)="toggled.emit(opt.value)">
          <app-entity-chip
            [type]="opt.entityType"
            size="sm"
            [id]="opt.value.toString()"
            [label]="opt.label"
            [count]="opt.count"
            [active]="group().active.has(opt.value)"
            [disabled]="opt.count === 0 && !group().active.has(opt.value)"
            [color]="opt.color ?? null" />
        </button>
      } @else {
        <app-chip
          data-testid="filter-chip"
          [attr.data-value]="opt.value"
          [active]="group().active.has(opt.value)"
          [disabled]="opt.count === 0 && !group().active.has(opt.value)"
          [count]="opt.count"
          [tone]="opt.tone ?? null"
          (toggle)="toggled.emit(opt.value)"
        >{{ opt.label }}</app-chip>
      }
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
    }

    .group__label {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      margin-right: 0.2rem;
    }

    // A facet with a selection reads as ON at a glance — without this the only
    // signal is a chip fill somewhere in a wrapped row you may have scrolled past.
    .group__label--active {
      color: var(--color-accent);
      font-weight: 600;
    }

    .group__badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.05rem;
      height: 1.05rem;
      padding: 0 0.25rem;
      border-radius: 999px;
      background: var(--color-accent);
      color: var(--color-bg);
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0;
    }

    .group__entity-btn {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      font: inherit;
      cursor: pointer;

      &:disabled { cursor: not-allowed; }
      &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; border-radius: 999px; }
    }
  `],
})
export class KanbanFilterGroup {
  readonly group   = input.required<FilterGroup>();
  readonly toggled = output<string | number>();

  readonly activeCount = computed(() => this.group().active.size);
}

// Generic kanban filter bar. The board passes in a list of named groups; this
// component renders a labelled row of chips per group with active/disabled state
// and counts. A single `(toggle)` event reports `(groupId, value)` so the parent
// handles updates; a `(reset)` event clears everything.
//
// Used by both grooming (project/owner/priority/epic) and execution (same) —
// same chrome, different inputs.
@Component({
  selector: 'app-kanban-filter-bar',
  imports: [Chip, KanbanFilterGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kanban-filter-bar.html',
  styleUrl: './kanban-filter-bar.scss',
})
export class KanbanFilterBar {
  readonly groups = input.required<FilterGroup[]>();
  // Optional search box. Empty string = no search filter active. Parent owns the
  // string state and decides what fields to match against. The bar just renders
  // the input + emits change events.
  readonly searchTerm        = input<string>('');
  readonly searchPlaceholder = input<string>('Search…');
  // Optional sort row. Empty array = no sort section rendered. activeSort is the
  // currently selected sort value; sortChange emits the new value on click.
  readonly sortOptions = input<readonly SortOption[]>([]);
  readonly activeSort  = input<string>('');
  // Optional per-column render cap. Empty array = no cap row rendered. `null`
  // inside the array is the "All" (uncapped) option — the parent owns the value
  // and the actual slicing; the bar only picks a number.
  readonly limitOptions = input<readonly (number | null)[]>([]);
  readonly activeLimit  = input<number | null>(null);

  readonly toggle       = output<{ groupId: string; value: string | number }>();
  readonly searchChange = output<string>();
  readonly sortChange   = output<string>();
  readonly limitChange  = output<number | null>();
  readonly reset        = output<void>();

  readonly limitLabel = columnLimitLabel;

  // Compact groups flow on the controls row next to the search box; wide groups
  // (project, epic) each take a full-width wrapping row below it.
  readonly inlineGroups = computed(() => this.groups().filter(g => !g.wide));
  readonly wideGroups   = computed(() => this.groups().filter(g => g.wide));

  // Total selections across every facet, plus the search box if it has text.
  // Drives the reset button's label so "Clear 3 filters" states what it will
  // undo rather than making you count chips.
  readonly activeCount = computed(() => {
    const facets = this.groups().reduce((n, g) => n + g.active.size, 0);
    return facets + (this.searchTerm().length > 0 ? 1 : 0);
  });

  readonly hasActive = computed(() => this.activeCount() > 0);

  // Sort and density are view preferences, not filters — they're never part of
  // activeCount and reset never touches them. Surfacing the current value in the
  // section label means the setting is legible without hunting for the filled chip.
  readonly activeSortLabel = computed(
    () => this.sortOptions().find(o => o.value === this.activeSort())?.label ?? '',
  );

  onToggle(groupId: string, value: string | number): void {
    this.toggle.emit({ groupId, value });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }
}
