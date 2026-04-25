import type { ActorId, VaultItemId } from '../ids';
import type { Source } from './source';

export type { Source, SourceKind } from './source';

// A vault item is the thing that moves through the pipeline.
// Shape is pragmatic: every field represents state the operator or an agent needs
// to act on, and has earned its place by either driving a decision or being required
// for readiness. Derived signals (readiness, effective_priority, is_epic) are NOT here
// — see `readiness.ts` and the README for the separation of concerns.

export type VaultItemType = 'task' | 'bookmark' | 'note';

// Lifecycle is derived from two timestamps — never stored as a single column.
//   active   = both null
//   done     = completed_at set, archived_at null
//   archived = archived_at set (regardless of completion)
//
// Use `lifecycleState(item)` for UI display. There's no `status` field on the
// row because every fact must live in exactly one place; a derived column would
// just create a drift risk between status and the timestamps.
export type LifecycleState = 'active' | 'done' | 'archived';

// Grooming pipeline states — aligned with the split-skill design
// (intake-quality → vault-classify → vault-decompose → marvin review → ready).
//
// Kanban column policy: ONE column per GroomingStatus value, in the declared order
// of GROOMING_STATUS_ORDER below. Don't fold or split — the union is the source of
// truth for both data and UI.
//
// Open questions are NOT a column. They're an orthogonal blocker (P17): an item
// can be `classified` AND have an open question. Surface that as a per-card flag
// (badge / icon), not a column. The old `analysing | questions | proposed`
// vocabulary (whiteboard K16) was killed precisely because it conflated state
// with blocker.
//
// `intake_rejected` and `intake_complete` are disjunct post-intake states:
//   - `intake_rejected`: intake-quality ran and produced clarifying questions; operator must answer them
//   - `intake_complete`: intake-quality accepted; ready for classification
// After classification the pipeline progresses: classified → decomposed → ready.
export type GroomingStatus =
  | 'ungroomed'          // freshly created, intake-quality hasn't run yet
  | 'intake_rejected'    // intake-quality posted questions; blocked until resolved
  | 'intake_complete'    // intake-quality accepted; ready for classification
  | 'classified'         // vault-classify ran; priority/confidence/actionability set
  | 'decomposed'         // vault-decompose ran; subtasks + acceptance criteria drafted
  | 'ready';             // marvin approved the decomposition; dispatchable

// Canonical left-to-right column order for kanban views. `satisfies` ensures every
// GroomingStatus value appears exactly once — adding a new state to the union without
// updating this array would fail to compile.
export const GROOMING_STATUS_ORDER = [
  'ungroomed',
  'intake_rejected',
  'intake_complete',
  'classified',
  'decomposed',
  'ready',
] as const satisfies readonly GroomingStatus[];

// Display labels for column headers. Kept here so the kanban and any other
// projection share one vocabulary; never compose status names ad-hoc in templates.
export const GROOMING_STATUS_LABELS: Record<GroomingStatus, string> = {
  ungroomed:        'Ungroomed',
  intake_rejected:  'Intake rejected',
  intake_complete:  'Intake complete',
  classified:       'Classified',
  decomposed:       'Decomposed',
  ready:            'Ready',
};

// Priority as integer to match hermes and the jimbo-api storage.
// UI renders with a "P" prefix ("P0", "P1"...) but the stored value is the number.
// 0 = urgent/blocking, 1 = high, 2 = normal (default when unsure), 3 = low.
export type Priority = 0 | 1 | 2 | 3;

// How clear a note's scope is — the gatekeeper signal produced by intake-quality.
// 'vague' is the reject-with-questions trigger.
export type Actionability = 'clear' | 'needs-breakdown' | 'vague';

export interface AcceptanceCriterion {
  text: string;
  done: boolean;
}

// Source is a discriminated union — see `source.ts` for the per-kind shapes.

export interface VaultItem {
  id:                  VaultItemId;                 // UUID — durable FK target
  seq:                 number;                      // operator-facing handle: #2417

  title:               string;
  body:                string;                      // intake, treated as immutable in the UI
  type:                VaultItemType;

  assigned_to:         ActorId | null;              // current owner
  tags:                string[];
  acceptance_criteria: AcceptanceCriterion[];

  grooming_status:     GroomingStatus;

  // Two sources, kept separate. `effective_priority` is derived (manual ?? ai).
  ai_priority:         Priority | null;
  manual_priority:     Priority | null;

  // One-sentence rationale written by vault-classify explaining the priority choice.
  // Displayed in UI next to ai_priority for operator insight. Null when unclassified.
  ai_rationale:        string | null;

  // 0.0–1.0. Classifier's explicit uncertainty. Below 0.6 triggers clarifying questions
  // in the hermes-side intake-quality skill. Null when unclassified.
  priority_confidence: number | null;

  // How actionable this item is. Set by intake-quality. 'vague' triggers rejection/questions.
  // Null when intake hasn't run yet.
  actionability:       Actionability | null;

  parent_id:           VaultItemId | null;          // epic hierarchy edge

  // Soft-archive timestamp. When set, the item is hidden from default views.
  // Items can be archived whether or not they're complete — archive is orthogonal.
  archived_at:         string | null;

  // Project linkage is a many-to-many junction (`vault-item-project.ts`), not a column here.
  // A cross-project fix (e.g. "bug affects LocalShout AND SpoonsCount") is a real case and
  // the junction pays the data-migration cost upfront while types are still cheap to change.

  // When real-world deadline exists. Null = no deadline. Drives urgency signals and
  // future "stale / approaching" views. Distinct from `ai_priority`, which is relative urgency.
  due_at:              string | null;

  // When the operator marked this done. Null = not done.
  // This is the canonical "is it done?" signal — not derivable, not duplicated.
  // Items can stay `completed_at != null` and `archived_at == null` simultaneously
  // (done but still in the live list). Setting completed_at emits a CompletionChangedEvent.
  completed_at:        string | null;

  // Where this item came from. See `Source` comment above. Nullable for legacy / unknown.
  source:              Source | null;

  created_at:          string;
  // `updated_at` is deliberately NOT here — derived as MAX(activity_events.at).
  // Storing it creates a silent audit hole: a row can be touched without an event,
  // leaving the history incomplete. Every mutation must produce an event; the timestamp
  // of the most recent event is the "last modified" signal.
}

export type CreateVaultItemPayload =
  Omit<VaultItem, 'id' | 'seq' | 'archived_at' | 'created_at'>;

export type UpdateVaultItemPayload =
  Partial<Omit<VaultItem, 'id' | 'seq' | 'created_at'>>;

// Lifecycle helpers. Derived purely from the two timestamps — no column lookup.
// Use these everywhere instead of comparing strings.
export function lifecycleState(item: Pick<VaultItem, 'completed_at' | 'archived_at'>): LifecycleState {
  if (item.archived_at !== null) return 'archived';
  if (item.completed_at !== null) return 'done';
  return 'active';
}

export const isActive   = (i: Pick<VaultItem, 'completed_at' | 'archived_at'>) => lifecycleState(i) === 'active';
export const isDone     = (i: Pick<VaultItem, 'completed_at' | 'archived_at'>) => lifecycleState(i) === 'done';
export const isArchived = (i: Pick<VaultItem, 'archived_at'>) => i.archived_at !== null;
