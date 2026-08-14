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
  open_questions: number;
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
  counts:    AwaitingCounts;
}
