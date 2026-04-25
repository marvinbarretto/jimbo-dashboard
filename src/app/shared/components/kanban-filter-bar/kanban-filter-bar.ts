import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Chip } from '../chip/chip';

export interface FilterOption<TValue extends string | number> {
  value: TValue;
  label: string;
  count: number;
  // Optional `tone` string passed through to the Chip component for colour tinting.
  tone?: string;
}

// One filter group = one labelled row of chips that share a state Set.
// `id` lets the parent identify which group emitted a toggle event.
export interface FilterGroup<TValue extends string | number = string | number> {
  id:      string;
  label:   string;
  options: FilterOption<TValue>[];
  active:  Set<TValue>;
}

// Generic kanban filter bar. The board passes in a list of named groups; this
// component renders a labelled row of chips per group with active/disabled state
// and counts. A single `(toggle)` event reports `(groupId, value)` so the parent
// handles updates; a `(reset)` event clears everything.
//
// Used by both grooming (project/owner/priority) and execution (skill/executor/
// project) — same chrome, different inputs.
@Component({
  selector: 'app-kanban-filter-bar',
  imports: [Chip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kanban-filter-bar.html',
  styleUrl: './kanban-filter-bar.scss',
})
export class KanbanFilterBar {
  readonly groups = input.required<FilterGroup[]>();

  readonly toggle = output<{ groupId: string; value: string | number }>();
  readonly reset  = output<void>();

  readonly hasActive = computed(() =>
    this.groups().some(g => g.active.size > 0),
  );

  onToggle(groupId: string, value: string | number): void {
    this.toggle.emit({ groupId, value });
  }
}
