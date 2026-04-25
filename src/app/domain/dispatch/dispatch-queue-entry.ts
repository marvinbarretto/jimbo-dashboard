import type { ActorId, DispatchId, SkillId, VaultItemId } from '../ids';

// A row in the dispatch queue — the ephemeral record of "a skill is being run
// on a vault item by an executor". Lifecycle: approved → dispatching → running
// → completed | failed. This shape mirrors the `dispatch_queue` table in jimbo-api,
// populated by hermes's `pipeline-pump` cron and consumed by `commission-worker` /
// `vault-analyse` / `vault-decompose` skills.
//
// Dashboard reads this to show an item's active dispatch state ("running
// vault-classify on @boris for 14m, retry 0/2") alongside the note's own
// `grooming_status` (which tracks stable completion positions).
//
// Write access is limited — dashboard typically only retries failed dispatches.

export type DispatchStatus =
  | 'approved'      // queued, not yet picked up
  | 'dispatching'   // claim in-flight
  | 'running'       // executor has started work
  | 'completed'     // finished successfully; result_summary populated
  | 'failed';       // errored or reaped; error populated

export interface DispatchQueueEntry {
  id:             DispatchId;
  task_id:        VaultItemId;          // the vault item being worked on
  skill:          SkillId;              // fully-qualified skill slug, e.g. 'hermes/vault-classify'
  status:         DispatchStatus;
  executor:       ActorId;              // who was selected to run it

  started_at:     string | null;
  completed_at:   string | null;
  retry_count:    number;

  // Skill-specific input payload (jsonb). Shape matches the skill's input_schema.
  skill_context:  unknown;

  // Outcome when status='completed' — one-line human summary of what happened.
  result_summary: string | null;

  // Error message when status='failed'. May be populated by the reaper for timeouts.
  error:          string | null;

  created_at:     string;
}

// Dashboard rarely creates dispatches directly (hermes does that via pipeline-pump).
// The one case where it does: operator-triggered retry of a failed dispatch.
export type EnqueueDispatchPayload = Pick<
  DispatchQueueEntry,
  'task_id' | 'skill' | 'executor' | 'skill_context'
>;
