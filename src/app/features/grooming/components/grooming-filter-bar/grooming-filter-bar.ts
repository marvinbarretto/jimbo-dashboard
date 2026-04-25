import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Chip } from '@shared/components/chip/chip';

export interface FilterOption<TValue> {
  value: TValue;
  label: string;
  count: number;
  // Optional `tone` string passed through to the Chip component for colour tinting.
  tone?: string;
}

// Three groups of filter chips: project / owner / priority. Each group's options
// are passed in (so the parent decides what populates the chip list) along with
// a Set of currently-active values. Toggle events bubble up generic — each emits
// the value that was clicked; parent updates its Set and recomputes counts.
@Component({
  selector: 'app-grooming-filter-bar',
  imports: [Chip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grooming-filter-bar.html',
  styleUrl: './grooming-filter-bar.scss',
})
export class GroomingFilterBar {
  readonly projectOptions  = input.required<FilterOption<string>[]>();
  readonly ownerOptions    = input.required<FilterOption<string>[]>();
  readonly priorityOptions = input.required<FilterOption<number>[]>();

  readonly projectActive  = input.required<Set<string>>();
  readonly ownerActive    = input.required<Set<string>>();
  readonly priorityActive = input.required<Set<number>>();

  readonly toggleProject  = output<string>();
  readonly toggleOwner    = output<string>();
  readonly togglePriority = output<number>();
  readonly reset          = output<void>();

  readonly hasActive = computed(() =>
    this.projectActive().size  > 0 ||
    this.ownerActive().size    > 0 ||
    this.priorityActive().size > 0,
  );
}
