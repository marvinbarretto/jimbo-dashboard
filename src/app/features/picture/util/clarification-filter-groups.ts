// FilterGroup builders for the Clarifications tab's filter bar — mirrors
// shared/kanban/filter-groups.ts's pure-function-per-dimension pattern.
import type { Clarification, ClarificationKind, ClarificationSourceKind, ClarificationStatus } from '@domain/clarifications';
import type { FilterGroup, FilterOption } from '@shared/components/kanban-filter-bar/kanban-filter-bar';

export const STATUS = 'status';
export const KIND = 'kind';
export const SOURCE_KIND = 'source_kind';

const STATUS_OPTIONS: ClarificationStatus[] = ['open', 'answered', 'dismissed', 'expired'];
const KIND_OPTIONS: ClarificationKind[] = ['disambiguate', 'validate', 'followup', 'ambient'];
const SOURCE_KIND_OPTIONS: ClarificationSourceKind[] = ['vault', 'google_task', 'calendar', 'model-gap'];

function countBy<T extends string>(items: readonly Clarification[], pick: (c: Clarification) => T): Map<T, number> {
  const counts = new Map<T, number>();
  for (const item of items) {
    const key = pick(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function statusFilterGroup(items: readonly Clarification[], active: Set<string>): FilterGroup<string> {
  const counts = countBy(items, c => c.status);
  const options: FilterOption<string>[] = STATUS_OPTIONS.map(value => ({
    value, label: value, count: counts.get(value) ?? 0,
  }));
  return { id: STATUS, label: 'Status', options, active };
}

export function kindFilterGroup(items: readonly Clarification[], active: Set<string>): FilterGroup<string> {
  const counts = countBy(items, c => c.kind);
  const options: FilterOption<string>[] = KIND_OPTIONS.map(value => ({
    value, label: value, count: counts.get(value) ?? 0,
  }));
  return { id: KIND, label: 'Kind', options, active };
}

export function sourceKindFilterGroup(items: readonly Clarification[], active: Set<string>): FilterGroup<string> {
  const counts = countBy(items, c => c.source_kind);
  const options: FilterOption<string>[] = SOURCE_KIND_OPTIONS.map(value => ({
    value, label: value, count: counts.get(value) ?? 0,
  }));
  return { id: SOURCE_KIND, label: 'Source', options, active };
}
