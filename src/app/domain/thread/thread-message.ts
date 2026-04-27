import type { ActorId, ThreadMessageId, VaultItemId } from '../ids';

// A ThreadMessage is a conversational exchange about a vault item.
// Distinct from ActivityEvent — events are matter-of-fact state transitions
// (created, assigned, status_changed); messages are the back-and-forth that
// grooms, clarifies, and pushes back on the work itself.
//
// Every message produces a paired `thread_message_posted` activity event so the
// overall timeline stays auditable. Content lives here; the event is just a pointer.

export type ThreadMessageKind =
  | 'comment'    // unstructured — any actor, any time
  | 'question'   // asked by someone, expects an answer to unblock
  | 'answer'     // responds to a question (see `in_reply_to`)
  | 'rejection'; // operator rejected agent's work; carries the redirect reason

export interface ThreadMessage {
  id:              ThreadMessageId;
  vault_item_id:   VaultItemId;
  author_actor_id: ActorId;
  kind:            ThreadMessageKind;
  body:            string;

  // Flat by default. `in_reply_to` is set when a message specifically responds to another —
  // primarily used by `answer` messages to point at the `question` they resolve.
  in_reply_to:     ThreadMessageId | null;

  // For `question`: set to the id of the `answer` message when one lands. Null = still open.
  // For `comment` / `answer`: always null.
  // Open questions block dispatch (readiness gains an `open_questions` check).
  answered_by:     ThreadMessageId | null;

  created_at:      string;
  // No `updated_at` — messages are immutable (P6). Corrections write a new message.
}

export type CreateThreadMessagePayload = Omit<ThreadMessage, 'created_at'>;
// Only `answered_by` is mutable — flipped when a question gets answered.
export type MarkAnsweredPayload = Pick<ThreadMessage, 'answered_by'>;
