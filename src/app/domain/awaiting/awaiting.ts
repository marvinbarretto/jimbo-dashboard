import type { ActorId, VaultItemId } from '../ids';
import type { OpenQuestionView } from '../thread';

/**
 * A vault item an agent handed back and is now waiting on a human for.
 *
 * The distinction this type exists to carry: `assigned_to = 'marvin'` means both
 * "mine, permanently" and "blocked on me, transiently", and only the second
 * kind has an agent stalled behind it. The server reconstructs which is which
 * from the handoff's previous holder — see jimbo-api/src/services/awaiting-me.ts.
 */
export interface Handback {
  /** note_activity row id — stable key for the handoff itself. */
  activity_id:    number;
  note_id:        VaultItemId;
  seq:            number;
  title:          string;
  type:           string;
  status:         string;
  /** When it was handed back. */
  ts:             string;
  /** The agent waiting on the answer. */
  from_actor:     ActorId;
  /** Who performed the handoff — usually, but not always, `from_actor`. */
  actor:          ActorId;
  action:         string;
  reason:         string | null;
  priority:       number | null;
}

/**
 * Counts are computed over the FULL live set, never the returned page — a strip
 * that shows ten rows must still be able to say how many there really are.
 */
export interface AwaitingCounts {
  /** Live handbacks inside the requested window. */
  handbacks:       number;
  /** Live handbacks of any age. */
  handbacks_total: number;
  questions:       number;
  /** Handbacks the window hid. */
  older:           number;
}

export interface AwaitingMe {
  handbacks: Handback[];
  questions: OpenQuestionView[];
  /**
   * EVERY live awaited note id, of any age and ignoring the page limit.
   *
   * The board marks a card from this, not from the returned rows: "an agent is
   * stalled behind this" is a property of the item, not of how far back the
   * strip happens to be looking.
   */
  note_ids:  VaultItemId[];
  counts:    AwaitingCounts;
}

/**
 * Finished agent work that needs accepting. The third kind of "waiting on you",
 * alongside handbacks and open questions.
 *
 * It is not cosmetic that this sits with the other two: the commission pump
 * counts unaccepted work against its concurrency cap, so an unreviewed pile
 * does not merely sit there — it stops new work being commissioned at all.
 * Three PRs went unnoticed for 63-120 days while this queue had its own page
 * that nothing pointed at.
 */
export interface ReviewWaiting {
  /** note id — the stable key, and what approve/send-back address. */
  id:          string;
  seq:         string | null;
  title:       string | null;
  skill:       string | null;
  summary:     string | null;
  /**
   * The criteria the work was commissioned against. Rendered beside `summary`
   * so accepting is a check rather than a rubber stamp: `summary` is the
   * agent's own account of itself, and this is the brief it was given.
   */
  acceptanceCriteria: string | null;
  prUrl:       string | null;
  prState:     string | null;
  completedAt: string | null;
}
