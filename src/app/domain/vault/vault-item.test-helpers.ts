// Builders + time helpers for vault domain tests.
//
// Excluded from production via tsconfig.app.json. Available to spec files
// (tsconfig.spec.json includes the *.test-helpers.ts pattern).
//
// Why builders not literal fixtures:
//   - Tests describe their setup in terms of what matters ("a P0 item with no priority")
//     instead of repeating the full 18-field VaultItem shape every time.
//   - When the schema grows a field, only the default in `buildVaultItem` changes —
//     specs stay green.
//   - Overrides give precise control without coupling tests to unrelated defaults.

import type { VaultItem, VaultItemType, GroomingStatus, Priority, Actionability, AcceptanceCriterion } from './vault-item';
import type { VaultItemDependency } from './vault-item-dependency';
import type { VaultItemProject } from './vault-item-project';
import type { Source } from './source';
import type { ActorId, ProjectId, VaultItemId } from '../ids';
import { vaultItemId, projectId, actorId } from '../ids';

// Monotonic id counter — every builder call gets a unique id without test-side effort.
let _itemCounter = 0;
let _seqCounter  = 9000;

function nextItemId(): VaultItemId {
  _itemCounter++;
  const hex = _itemCounter.toString(16).padStart(12, '0');
  return vaultItemId(`00000000-0000-0000-0000-${hex}`);
}

function nextSeq(): number {
  return _seqCounter++;
}

// Reset between describe blocks if you need stable ids — most tests don't care.
export function resetBuilderCounters(): void {
  _itemCounter = 0;
  _seqCounter  = 9000;
}

// ---------------------------------------------------------------------------
// Time helpers — relative to whatever vi.setSystemTime sets, or real now.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysAgo(days: number, now: number = Date.now()): string {
  return new Date(now - days * MS_PER_DAY).toISOString();
}

export function daysFromNow(days: number, now: number = Date.now()): string {
  return new Date(now + days * MS_PER_DAY).toISOString();
}

export function hoursAgo(hours: number, now: number = Date.now()): string {
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// VaultItem builder
// ---------------------------------------------------------------------------

export interface VaultItemOverrides extends Partial<Omit<VaultItem, 'id' | 'seq'>> {
  id?:  VaultItemId;
  seq?: number;
}

export function buildVaultItem(overrides: VaultItemOverrides = {}): VaultItem {
  return {
    id:                  nextItemId(),
    seq:                 nextSeq(),
    title:               'Test item',
    body:                '',
    type:                'task',
    category:            null,
    assigned_to:         null,
    tags:                [],
    acceptance_criteria: [],
    grooming_status:     'ungroomed',
    ai_priority:         null,
    manual_priority:     null,
    ai_rationale:        null,
    priority_confidence: null,
    actionability:       null,
    parent_id:           null,
    archived_at:         null,
    due_at:              null,
    completed_at:        null,
    source:              { kind: 'manual', ref: 'test', url: null },
    created_at:          new Date().toISOString(),
    ...overrides,
  };
}

// Semantic shortcuts — read better in tests than long override blobs.
export const buildEpic = (children: VaultItem[], overrides: VaultItemOverrides = {}): { epic: VaultItem; children: VaultItem[] } => {
  const epic = buildVaultItem({ title: 'Epic', grooming_status: 'decomposed', ...overrides });
  return {
    epic,
    children: children.map(c => ({ ...c, parent_id: epic.id })),
  };
};

export const buildReady = (overrides: VaultItemOverrides = {}): VaultItem =>
  buildVaultItem({
    grooming_status:     'ready',
    assigned_to:         actorId('marvin'),
    ai_priority:         2,
    actionability:       'clear',
    acceptance_criteria: [{ text: 'something testable', done: false }],
    ...overrides,
  });

export const buildArchived = (overrides: VaultItemOverrides = {}): VaultItem =>
  buildVaultItem({ archived_at: new Date().toISOString(), ...overrides });

export const buildDone = (overrides: VaultItemOverrides = {}): VaultItem =>
  buildVaultItem({ completed_at: new Date().toISOString(), ...overrides });

// ---------------------------------------------------------------------------
// Junction builders
// ---------------------------------------------------------------------------

export function buildDependency(
  blocker: VaultItem,
  blocked: VaultItem,
  overrides: Partial<VaultItemDependency> = {},
): VaultItemDependency {
  return {
    blocker_id: blocker.id,
    blocked_id: blocked.id,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildProjectLink(
  item: VaultItem,
  project: ProjectId | string,
): VaultItemProject {
  return {
    vault_item_id: item.id,
    project_id:    typeof project === 'string' ? projectId(project) : project,
  };
}
