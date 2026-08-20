import { describe, expect, it } from 'vitest';
import { buildVaultItem } from '@domain/vault/vault-item.test-helpers';
import type { VaultItem } from '@domain/vault';
import {
  epicFilterGroup, epicsForProjects, effectiveEpicSelection, epicKeyOf, EPIC, NO_EPIC,
  readinessFilterGroup, readinessKeyOf, READINESS, DOR_READY, DOR_NOT_READY,
} from './filter-groups';

// Epic facet helpers — the subordinate facet that only exists under a project
// selection. Board wiring (visibility, URL sync) lives in the boards; the
// membership/count/effective-selection logic is what's testable here.

const PROJ_A = 'proj-a';
const PROJ_B = 'proj-b';

function linksFor(map: Map<string, string[]>): (item: VaultItem) => { project_id: string }[] {
  return item => (map.get(item.id as string) ?? []).map(project_id => ({ project_id }));
}

describe('epicKeyOf', () => {
  it('maps a listed epic parent to that epic, everything else to NO_EPIC', () => {
    const epic = buildVaultItem({ is_epic: true });
    const nonEpicParent = buildVaultItem();
    const epicIds = new Set([epic.id as string]);

    expect(epicKeyOf(buildVaultItem({ parent_id: epic.id }), epicIds)).toBe(epic.id);
    expect(epicKeyOf(buildVaultItem(), epicIds)).toBe(NO_EPIC);
    // parent_id pointing at a non-epic parent (the "confused task" shape) must
    // stay reachable via the no-epic chip, not vanish under every selection.
    expect(epicKeyOf(buildVaultItem({ parent_id: nonEpicParent.id }), epicIds)).toBe(NO_EPIC);
  });
});

describe('epicFilterGroup', () => {
  it('counts items per parent epic and the no-epic sentinel', () => {
    const epic = buildVaultItem({ is_epic: true, title: 'Big epic' });
    const nonEpicParent = buildVaultItem();
    const items = [
      buildVaultItem({ parent_id: epic.id }),
      buildVaultItem({ parent_id: epic.id }),
      buildVaultItem(),
      buildVaultItem({ parent_id: nonEpicParent.id }),  // counts as no-epic
    ];

    const group = epicFilterGroup(items, new Set(), [epic]);

    expect(group.id).toBe(EPIC);
    expect(group.wide).toBe(true);
    expect(group.options).toHaveLength(2);
    expect(group.options[0]).toMatchObject({ value: epic.id, label: 'Big epic', count: 2, entityType: 'vault-item' });
    expect(group.options[1]).toMatchObject({ value: NO_EPIC, count: 2 });
  });

  it('lists an epic with zero matching items so it renders disabled, not missing', () => {
    const epic = buildVaultItem({ is_epic: true });
    const group = epicFilterGroup([], new Set(), [epic]);
    expect(group.options[0]).toMatchObject({ value: epic.id, count: 0 });
  });
});

describe('epicsForProjects', () => {
  it('returns only active flagged epics belonging to a selected project', () => {
    const inProject      = buildVaultItem({ is_epic: true });
    const otherProject   = buildVaultItem({ is_epic: true });
    const notAnEpic      = buildVaultItem();
    const archivedEpic   = buildVaultItem({ is_epic: true, archived_at: '2026-01-01T00:00:00Z' });
    const links = linksFor(new Map([
      [inProject.id as string,    [PROJ_A]],
      [otherProject.id as string, [PROJ_B]],
      [notAnEpic.id as string,    [PROJ_A]],
      [archivedEpic.id as string, [PROJ_A]],
    ]));

    const epics = epicsForProjects([inProject, otherProject, notAnEpic, archivedEpic], new Set([PROJ_A]), links);

    expect(epics).toEqual([inProject]);
  });

  it('is empty when no project is selected — the facet needs a project context', () => {
    const epic = buildVaultItem({ is_epic: true });
    const links = linksFor(new Map([[epic.id as string, [PROJ_A]]]));
    expect(epicsForProjects([epic], new Set(), links)).toEqual([]);
  });
});

describe('effectiveEpicSelection', () => {
  const epicA = buildVaultItem({ is_epic: true });
  const epicB = buildVaultItem({ is_epic: true });

  it('keeps selections that are offered options, drops the rest', () => {
    const eff = effectiveEpicSelection(new Set([epicA.id as string, epicB.id as string, 'stale']), [epicA, epicB]);
    expect(eff).toEqual(new Set([epicA.id, epicB.id]));
  });

  it('keeps the no-epic sentinel while the facet is rendered', () => {
    expect(effectiveEpicSelection(new Set([NO_EPIC]), [epicA])).toEqual(new Set([NO_EPIC]));
  });

  it('is empty when the facet has no epics to offer — a hidden facet must not filter', () => {
    // Covers stale URL params (?epic= without project=), project deselection,
    // and switching to an epic-less project with NO_EPIC still selected.
    expect(effectiveEpicSelection(new Set([epicA.id as string, NO_EPIC]), [])).toEqual(new Set());
  });

  it('is empty when nothing is selected', () => {
    expect(effectiveEpicSelection(new Set(), [epicA])).toEqual(new Set());
  });
});

describe('readiness facet (Definition of Ready)', () => {
  describe('readinessKeyOf', () => {
    it('buckets a groomed-ready item as meeting DoR', () => {
      expect(readinessKeyOf(buildVaultItem({ grooming_status: 'ready' }))).toBe(DOR_READY);
    });

    // Everything short of 'ready' is one bucket on purpose — the operator asks
    // "has this passed the gate or not", not "which grooming stage is it in".
    it.each(['ungroomed', 'classified', 'decomposed', 'needs_rework'] as const)(
      'buckets %s as not groomed',
      status => {
        expect(readinessKeyOf(buildVaultItem({ grooming_status: status }))).toBe(DOR_NOT_READY);
      },
    );
  });

  describe('readinessFilterGroup', () => {
    it('counts each bucket and preserves the active set', () => {
      const items = [
        buildVaultItem({ grooming_status: 'ready' }),
        buildVaultItem({ grooming_status: 'ready' }),
        buildVaultItem({ grooming_status: 'ungroomed' }),
      ];
      const group = readinessFilterGroup(items, new Set([DOR_READY]));

      expect(group.id).toBe(READINESS);
      expect(group.options.find(o => o.value === DOR_READY)?.count).toBe(2);
      expect(group.options.find(o => o.value === DOR_NOT_READY)?.count).toBe(1);
      expect(group.active).toEqual(new Set([DOR_READY]));
    });

    it('offers both buckets at zero when there are no items', () => {
      const group = readinessFilterGroup([], new Set());
      expect(group.options.map(o => o.count)).toEqual([0, 0]);
    });
  });
});
