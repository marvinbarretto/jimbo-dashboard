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

// The UN-narrowed status, exactly as the DB/API report it. The legacy
// `DispatchStatus` above collapses two meaningful distinctions the board needs:
// `proposed` (awaiting operator approval) was folded into `approved`, and
// `rejected` (a deliberate decline) into `failed`. The rebuilt commission board
// reads `db_status` so those read truthfully. (`removed` is filtered out before
// entries reach the UI, but kept here so the union matches the wire schema.)
export type DispatchDbStatus =
  | 'proposed'
  | 'approved'
  | 'dispatching'
  | 'running'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'removed';

// The pipeline lane a dispatch belongs to. `commission` = code/PR work — the only
// flow the execution board should surface as shippable; `groom` (intake/classify/
// decompose) and `recon` (research) are automatic pre-work that must NOT read as
// "completed shipped work". `(string & {})` keeps the union open if hermes adds a
// lane without breaking the build.
export type DispatchFlow = 'groom' | 'recon' | 'commission' | (string & {});

// Which executor archetype ran it. Mirrors hermes `agent_type`. Open union.
export type DispatchAgentType = 'coder' | 'researcher' | (string & {});

// GitHub PR lifecycle for a commission dispatch. Null until a PR exists. Drives
// the rebuilt board's "PR open"/"Merged" columns. Open union — GitHub may report
// states we don't enumerate yet.
export type PrState = 'open' | 'draft' | 'merged' | 'closed' | (string & {});

// Canonical left-to-right column order for the execution kanban. `satisfies`
// ensures every DispatchStatus value appears exactly once — adding a new state
// to the union without updating this array would fail to compile.
export const DISPATCH_STATUS_ORDER = [
  'approved',
  'dispatching',
  'running',
  'completed',
  'failed',
] as const satisfies readonly DispatchStatus[];

// Display labels for column headers. Kept here so the kanban and any other
// projection share one vocabulary.
export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  approved:    'Ready',
  dispatching: 'Dispatching',
  running:     'Running',
  completed:   'Completed',
  failed:      'Failed',
};

// Per-column empty-state copy for the execution kanban. An empty Failed column
// is the "everything is fine" signal — worth saying explicitly rather than a
// flat "empty".
export const DISPATCH_EMPTY_LABELS: Record<DispatchStatus, string> = {
  approved:    'Nothing queued',
  dispatching: 'Nothing dispatching',
  running:     'Nothing running',
  completed:   'No completed runs yet',
  failed:      'No failures',
};

// `running` and `dispatching` are system-managed: the operator can't drag a
// card into them — only hermes / pipeline-pump puts items here. Used by the
// execution board to mark those columns dropDisabled.
export const DISPATCH_STATUS_SYSTEM_MANAGED: readonly DispatchStatus[] = [
  'dispatching',
  'running',
];

export interface DispatchQueueEntry {
  id:             DispatchId;
  task_id:        VaultItemId;          // the vault item being worked on
  skill:          SkillId;              // fully-qualified skill slug, e.g. 'hermes/vault-classify'
  status:         DispatchStatus;
  // Null on legacy rows pre-migration, and (defensively) on any future row
  // where the API returns a missing executor. The API contract is
  // `ExecutorSchema.nullable()` — pretending this is non-null bit us before
  // (the chip showed "@unassigned" for a real owner because we'd substituted
  // a sentinel string for null). Consumers must handle null.
  executor:       ActorId | null;

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

  // Joined from vault_notes by the API so the execution card can render task
  // context without a parallel board fetch (which is paginated; older items
  // referenced by long-lived dispatches may fall outside that window).
  // Optional so seed/fixture rows don't have to carry stub values.
  task_title?:    string | null;
  task_seq?:      number | null;

  // ── Commission-flow fields ──────────────────────────────────────────────
  // Always populated by the API; optional here only so seed/fixture rows don't
  // need stubs (same precedent as task_title/task_seq above).
  //
  // `flow` is the discriminator the rebuilt execution board filters on — it
  // shows commission flow only, so a groomed-but-uncoded item never appears as
  // a "completed" card.
  flow?:          DispatchFlow;
  agent_type?:    DispatchAgentType;
  // Un-narrowed status (see DispatchDbStatus). The rebuilt commission board reads
  // this so `proposed`/`rejected` aren't collapsed into approved/failed. Optional
  // only for seed/fixture rows — every API row carries it.
  db_status?:     DispatchDbStatus;
  // PR state + URL for commission dispatches. `pr_state` null = no PR yet.
  // `pr_url` is currently always null server-side (the commission worker writes
  // the URL into result_summary, not this column — hub autonomy-pilot #14), so
  // consumers must fall back to result_summary until that lands.
  pr_state?:      PrState | null;
  pr_url?:        string | null;
}

// Dashboard rarely creates dispatches directly (hermes does that via pipeline-pump).
// The one case where it does: operator-triggered retry of a failed dispatch.
export type EnqueueDispatchPayload = Pick<
  DispatchQueueEntry,
  'task_id' | 'skill' | 'executor' | 'skill_context'
>;
