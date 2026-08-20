// Shared kanban facet builders. Both the grooming and execution boards offer the
// same Project / Owner / Priority filters; this is the one place that logic lives.
//
// Kept as PURE functions (no Angular, no feature-service injection) so it stays in
// @shared without pulling feature code in — each board passes its already-injected
// data (the cross-filtered item list, the active set, project/actor metadata) and
// gets a FilterGroup back. The board still owns its own item-filtering + the
// per-facet "skip" counting; this only builds the option list + counts.

import { effectivePriority, isActive, type VaultItem } from '@domain/vault';
import type { FilterGroup, FilterOption } from '@shared/components/kanban-filter-bar/kanban-filter-bar';

// Filter dimension ids — one source of truth for createKanbanFilterState, the
// chip groups, the toggle handler, and URL sync across boards.
export const PROJECT   = 'project';
export const OWNER     = 'owner';
export const PRIORITY  = 'priority';
export const EPIC      = 'epic';
export const READINESS = 'readiness';

// "Unassigned" owner token alongside actor ids — a sentinel keeps Set<string>
// membership simple. "No priority set" is distinct from 0 for the same reason,
// as is "not under any epic".
export const UNASSIGNED = '__unassigned__';
export const NO_PRIORITY = -1;
export const NO_EPIC = '__no_epic__';

// Definition-of-Ready facet values. The execution board admits anything owned by
// a human REGARDLESS of grooming state (a person controls it directly), so its
// Ready lane mixes DoR-passing agent work with everything the operator happens
// to own. This facet is how you separate the two without changing that rule.
export const DOR_READY     = 'dor_ready';      // grooming_status === 'ready'
export const DOR_NOT_READY = 'dor_not_ready';  // present, but hasn't passed the gate

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
  // wide: the project list is the biggest facet — it gets a full-width row so
  // it can wrap instead of clipping, leaving the controls row to the compact facets.
  return { id: PROJECT, label: 'Project', options, active, wide: true };
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

/** Which Definition-of-Ready bucket an item falls in. */
export function readinessKeyOf(item: VaultItem): string {
  return item.grooming_status === 'ready' ? DOR_READY : DOR_NOT_READY;
}

export function readinessFilterGroup(
  items: readonly VaultItem[],
  active: Set<string>,
): FilterGroup<string> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = readinessKeyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const options: FilterOption<string>[] = [
    { value: DOR_READY,     label: 'meets DoR',  count: counts.get(DOR_READY) ?? 0 },
    { value: DOR_NOT_READY, label: 'not groomed', count: counts.get(DOR_NOT_READY) ?? 0 },
  ];
  return { id: READINESS, label: 'Ready', options, active };
}

// Which epic option an item belongs to. parent_id can point at a non-epic
// parent (synthesize/debrief link children without setting is_epic), so
// anything not parented to a LISTED epic collapses to NO_EPIC — otherwise those
// items would match no chip at all and silently vanish under any epic selection.
export function epicKeyOf(item: VaultItem, epicIds: ReadonlySet<string>): string {
  const pid = item.parent_id as string | null;
  return pid && epicIds.has(pid) ? pid : NO_EPIC;
}

// Epic facet — a drill-down of the project facet, not a top-level dimension.
// Boards only build it when ≥1 project is selected, over that project's epics.
// The NO_EPIC sentinel keeps "tasks directly on the project" selectable
// alongside the epics.
export function epicFilterGroup(
  items: readonly VaultItem[],
  active: Set<string>,
  epics: readonly VaultItem[],
): FilterGroup<string> {
  const epicIds = new Set(epics.map(e => e.id as string));
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = epicKeyOf(item, epicIds);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const options: FilterOption<string>[] = epics.map(e => ({
    value:      e.id as string,
    label:      e.title,
    count:      counts.get(e.id as string) ?? 0,
    entityType: 'vault-item' as const,
  }));
  options.push({ value: NO_EPIC, label: 'no epic', count: counts.get(NO_EPIC) ?? 0 });
  return { id: EPIC, label: 'Epic', options, active, wide: true };
}

// The epics eligible for the epic facet: active, flagged epics belonging to at
// least one selected project. Empty when no project is selected — the facet
// doesn't exist without a project context. Membership is union (any project
// link), matching the project facet — deliberately looser than the card epic
// picker, which parents by primary project only.
export function epicsForProjects(
  items: readonly VaultItem[],
  selectedProjects: ReadonlySet<string>,
  projectsFor: ProjectLinks,
): VaultItem[] {
  if (selectedProjects.size === 0) return [];
  return items.filter(epic =>
    epic.is_epic
    && isActive(epic)
    && projectsFor(epic).some(l => selectedProjects.has(l.project_id)),
  );
}

// The epic selections that actually filter the board: the raw selection
// intersected with the currently offered options. Derived — not pruned on
// events — so every path (URL restore, project toggles, an epic archived
// mid-session, late-loading project links) converges on the same invariant:
// a facet that isn't rendered can't silently filter the board. The raw
// selection is kept intact, so re-selecting the project restores it.
export function effectiveEpicSelection(
  active: ReadonlySet<string>,
  epics: readonly VaultItem[],
): Set<string> {
  if (active.size === 0 || epics.length === 0) return new Set();
  const valid = new Set(epics.map(e => e.id as string));
  valid.add(NO_EPIC);
  return new Set([...active].filter(id => valid.has(id)));
}
