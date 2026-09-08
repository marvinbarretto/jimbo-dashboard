// The four grooming stages, and the two facts about them that several
// components need to agree on. Domain rather than data-access: these are
// properties of the pipeline itself, not of any one fetch, and components read
// them directly (VAULT-COMMANDS-001 rightly blocks a component reaching into a
// data-access module for them).
//
// Both maps mirror constants in jimbo-api/src/services/pipeline-pump.ts —
// `SKILL` and `STATUS_BY_STAGE`. Kept in one place here so a renamed skill or a
// re-pointed stage breaks in a single spot rather than silently un-joining a
// table.

/** Work flows in this order. Never sort stages alphabetically — `classify`
 *  before `decompose` before `deepread` before `intake` is a lie about the
 *  sequence. */
export const STAGE_ORDER = ['intake', 'deepread', 'classify', 'decompose'] as const;

export type GroomingStage = (typeof STAGE_ORDER)[number];

/** Stage → the dispatch skill that performs it. The join between the queue
 *  endpoint (keyed by stage) and dispatch history (keyed by skill). */
export const STAGE_SKILL: Record<string, string> = {
  intake:    'dispatch/intake-quality',
  deepread:  'dispatch/vault-deep-read',
  classify:  'dispatch/vault-classify',
  decompose: 'dispatch/vault-decompose',
};

export const SKILL_STAGE: Record<string, string> =
  Object.fromEntries(Object.entries(STAGE_SKILL).map(([stage, skill]) => [skill, stage]));

/**
 * Stage → the `grooming_status` it reads.
 *
 * The reason this is worth having on the client: intake and deepread map to the
 * SAME status. They are two skills over one pool of ungroomed notes, not two
 * queues — so the API returns an identical `at_status` on both rows, and a
 * funnel that prints it twice invites the reader to add the column up and
 * conclude the backlog is a thousand notes bigger than it is.
 */
export const STAGE_STATUS: Record<string, string> = {
  intake:    'ungroomed',
  deepread:  'ungroomed',
  classify:  'intake_complete',
  decompose: 'classified',
};

/**
 * The earlier stage whose queue `stage` shares, or null when it owns its own.
 * `stages` must be in pipeline order — the first stage to claim a status owns
 * the depth figures for it.
 */
export function sharedQueueOwner(
  stage: string,
  stages: readonly { stage: string }[],
): string | null {
  const status = STAGE_STATUS[stage];
  if (!status) return null;
  for (const other of stages) {
    if (other.stage === stage) return null;
    if (STAGE_STATUS[other.stage] === status) return other.stage;
  }
  return null;
}
