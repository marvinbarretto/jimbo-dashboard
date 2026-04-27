import type { ActivityId, ActorId, DispatchId, ProjectId, SkillId, ThreadMessageId, VaultItemId } from '../ids';
import type { ThreadMessageKind } from '../thread/thread-message';
import type { GroomingStatus } from '../vault/vault-item';

// Append-only log of what happened in the system, and who did it.
//
// Events split by what they're attached to:
//   - VaultActivityEvent — every event that targets a single vault item
//   - ProjectActivityEvent — every event that targets a project (criteria, ownership, archive)
//
// At the schema level both `vault_item_id` and `project_id` are nullable columns
// on a single `activity_events` table, with a CHECK constraint enforcing exactly
// one is set per row. The TS-level discriminated unions express the same invariant
// — each event variant carries the right id field as required, never both.

// --- Bases ---

export interface BaseActivityEvent {
  id:       ActivityId;
  actor_id: ActorId;             // who did this — for system-originated events, jimbo (whiteboard P13)
  at:       string;              // ISO timestamp
}

interface VaultEventBase extends BaseActivityEvent {
  vault_item_id: VaultItemId;
}

interface ProjectEventBase extends BaseActivityEvent {
  project_id: ProjectId;
}

// --- Vault events ---

export interface CreatedEvent extends VaultEventBase {
  type: 'created';
}

export interface AssignedEvent extends VaultEventBase {
  type: 'assigned';
  from_actor_id: ActorId | null;   // null on initial assignment
  to_actor_id:   ActorId;
  reason:        string | null;
}

// Fires when `completed_at` is set (newly done) or cleared (un-done by mistake correction).
// `from`/`to` are the timestamps before/after — null = not-done state.
export interface CompletionChangedEvent extends VaultEventBase {
  type: 'completion_changed';
  from: string | null;
  to:   string | null;
  note: string | null;
}

export interface ArchivedEvent extends VaultEventBase {
  type: 'archived';
  archived_at: string;             // matches the row's new archived_at value
  note: string | null;
}

export interface UnarchivedEvent extends VaultEventBase {
  type: 'unarchived';
  note: string | null;
}

// Grooming pipeline transition. Every move between grooming columns produces one
// of these — including system-driven moves from hermes skills (intake-quality,
// vault-classify, vault-decompose). Without this, kanban drag-drop would be a
// silent field write (P6 violation).
export interface GroomingStatusChangedEvent extends VaultEventBase {
  type: 'grooming_status_changed';
  from: GroomingStatus;
  to:   GroomingStatus;
  note: string | null;
}

// Bridge to the Thread entity. Body is NOT here — it's in `thread_messages.body`.
// `message_kind` is denormalised for scannable activity views ("@marvin posted a question").
export interface ThreadMessagePostedEvent extends VaultEventBase {
  type: 'thread_message_posted';
  message_id:   ThreadMessageId;
  message_kind: ThreadMessageKind;
}

// Rich record of an agent finishing a skill run on this item — model used,
// what was decided, what it thought, what it cost. Distinct from `assigned` /
// `grooming_status_changed` (which are structural facts about state); this
// captures the activity itself, the "ceremony".
//
// Nearly every field is nullable — the dashboard ships ready to surface this
// shape, runners backfill the data they have. UI degrades gracefully: a run
// without `tokens_*` just hides the cost row, a run without `reasoning` just
// hides the quote block, etc. Missing data is normal data.
//
// Outcome semantics:
//   success — the run did what it set out to do
//   partial — completed but with caveats (skipped some criteria, missing data)
//   failed  — errored or reaped; `error` is set
export interface AgentRunCompletedEvent extends VaultEventBase {
  type: 'agent_run_completed';

  // What ran
  skill_id:      SkillId;             // 'hermes/vault-classify' etc.
  dispatch_id:   DispatchId | null;   // link back to dispatch_queue row if there was one

  // What it did
  outcome:       'success' | 'partial' | 'failed';
  summary:       string;              // one-liner — same shape as DispatchQueueEntry.result_summary
  decisions:     string[] | null;     // bulleted list of changes the agent applied
  reasoning:     string | null;       // free-form thought trace (excerpt or full)

  // If the run moved the item between grooming columns, record it here so the
  // log doesn't need a separate `grooming_status_changed` event for the same act.
  from_status:   GroomingStatus | null;
  to_status:     GroomingStatus | null;

  // How it ran — cost-tracking columns. All nullable until runners emit them.
  duration_ms:   number | null;
  model_id:      string | null;       // 'anthropic/claude-sonnet-4-5'
  tokens_in:     number | null;
  tokens_out:    number | null;
  tokens_cached: number | null;
  cost_usd:      number | null;

  error:         string | null;
}

export type VaultActivityEvent =
  | CreatedEvent
  | AssignedEvent
  | CompletionChangedEvent
  | ArchivedEvent
  | UnarchivedEvent
  | GroomingStatusChangedEvent
  | ThreadMessagePostedEvent
  | AgentRunCompletedEvent;

// --- Project events ---

export interface ProjectCreatedEvent extends ProjectEventBase {
  type: 'project_created';
}

export interface ProjectCriteriaChangedEvent extends ProjectEventBase {
  type: 'project_criteria_changed';
  // Snapshot the previous text. Caller must capture before write.
  // Truncated server-side if very large; here, full text by convention.
  from: string | null;
  to:   string | null;
}

export interface ProjectOwnerChangedEvent extends ProjectEventBase {
  type: 'project_owner_changed';
  from_actor_id: ActorId;
  to_actor_id:   ActorId;
  reason:        string | null;
}

export interface ProjectArchivedEvent extends ProjectEventBase {
  type: 'project_archived';
  note: string | null;
}

export interface ProjectUnarchivedEvent extends ProjectEventBase {
  type: 'project_unarchived';
  note: string | null;
}

export type ProjectActivityEvent =
  | ProjectCreatedEvent
  | ProjectCriteriaChangedEvent
  | ProjectOwnerChangedEvent
  | ProjectArchivedEvent
  | ProjectUnarchivedEvent;

// --- Combined ---

export type ActivityEvent = VaultActivityEvent | ProjectActivityEvent;
export type ActivityEventType = ActivityEvent['type'];

// Type guards — useful when filtering a mixed stream.
export const isVaultEvent   = (e: ActivityEvent): e is VaultActivityEvent =>
  'vault_item_id' in e;
export const isProjectEvent = (e: ActivityEvent): e is ProjectActivityEvent =>
  'project_id' in e;
