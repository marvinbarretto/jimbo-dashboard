// Shared kanban facet builders. Both the grooming and execution boards offer the
// same Project / Owner / Priority filters; this is the one place that logic lives.
//
// Kept as PURE functions (no Angular, no feature-service injection) so it stays in
// @shared without pulling feature code in — each board passes its already-injected
// data (the cross-filtered item list, the active set, project/actor metadata) and
// gets a FilterGroup back. The board still owns its own item-filtering + the
// per-facet "skip" counting; this only builds the option list + counts.

import { effectivePriority, type VaultItem } from '@domain/vault';
import type { FilterGroup, FilterOption } from '@shared/components/kanban-filter-bar/kanban-filter-bar';

// Filter dimension ids — one source of truth for createKanbanFilterState, the
// chip groups, the toggle handler, and URL sync across boards.
export const PROJECT  = 'project';
export const OWNER    = 'owner';
export const PRIORITY = 'priority';

// "Unassigned" owner token alongside actor ids — a sentinel keeps Set<string>
// membership simple. "No priority set" is distinct from 0 for the same reason.
export const UNASSIGNED = '__unassigned__';
export const NO_PRIORITY = -1;

// Minimal project shape the project facet needs — Project structurally satisfies it.
export interface ProjectMeta {
  readonly id: string;
  readonly display_name: string;
  readonly color_token: string | null;
}

type ProjectLinks = (item: VaultItem) => readonly { readonly project_id: string }[];

export function projectFilterGroup(
  items: readonly VaultItem[],
  active: Set<string>,
  allProjects: readonly ProjectMeta[],
  projectsFor: ProjectLinks,
): FilterGroup<string> {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const link of projectsFor(item)) {
      counts.set(link.project_id, (counts.get(link.project_id) ?? 0) + 1);
    }
  }
  const options: FilterOption<string>[] = allProjects.map(p => ({
    value:      p.id,
    label:      p.display_name,
    count:      counts.get(p.id) ?? 0,
    entityType: 'project' as const,
    color:      p.color_token,
  }));
  return { id: PROJECT, label: 'Project', options, active };
}

export function ownerFilterGroup(
  items: readonly VaultItem[],
  active: Set<string>,
  allActorIds: readonly string[],
): FilterGroup<string> {
  const counts = new Map<string, number>();
  let unassigned = 0;
  for (const item of items) {
    if (item.assigned_to) counts.set(item.assigned_to as string, (counts.get(item.assigned_to as string) ?? 0) + 1);
    else unassigned++;
  }
  const options: FilterOption<string>[] = allActorIds.map(id => ({
    value:      id,
    label:      id,
    count:      counts.get(id) ?? 0,
    entityType: 'actor' as const,
  }));
  options.push({ value: UNASSIGNED, label: 'unassigned', count: unassigned });
  return { id: OWNER, label: 'Owner', options, active };
}

export function priorityFilterGroup(
  items: readonly VaultItem[],
  active: Set<number>,
): FilterGroup<number> {
  const counts = new Map<number, number>();
  for (const item of items) {
    const eff = effectivePriority(item);
    const key = eff === null ? NO_PRIORITY : eff;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const options: FilterOption<number>[] = [
    { value: 0, label: 'P0', count: counts.get(0) ?? 0, tone: 'P0' },
    { value: 1, label: 'P1', count: counts.get(1) ?? 0, tone: 'P1' },
    { value: 2, label: 'P2', count: counts.get(2) ?? 0, tone: 'P2' },
    { value: 3, label: 'P3', count: counts.get(3) ?? 0, tone: 'P3' },
    { value: NO_PRIORITY, label: 'no priority', count: counts.get(NO_PRIORITY) ?? 0 },
  ];
  return { id: PRIORITY, label: 'Priority', options, active };
}
