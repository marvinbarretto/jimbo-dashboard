import type { ActorId } from '../ids';
import type { ThreadMessage } from './thread-message';

// "Is someone waiting on me in this thread?" — a pure projection over a thread.
//
// Deliberately kind-agnostic. `openQuestionsFor` only counts `kind: 'question'`,
// which is correct for readiness (an unanswered question blocks dispatch) but
// useless as an attention signal: an agent that asks something as a plain
// `comment` produced zero visible pixels, so the only trace of "you are being
// asked something" was a count badge on a collapsed tab.
//
// The rule here is conversational, not typed: whatever sits after your last
// message, from someone else, is on you. `answer` is excluded — an answer to
// your question closes a loop rather than opening one.

export function pendingRepliesFor(
  messages: readonly ThreadMessage[],
  viewer: ActorId,
): ThreadMessage[] {
  const ordered = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at));

  let lastOwn = -1;
  for (let i = ordered.length - 1; i >= 0; i--) {
    if (ordered[i].author_actor_id === viewer) { lastOwn = i; break; }
  }

  return ordered
    .slice(lastOwn + 1)
    .filter(m => m.author_actor_id !== viewer && m.kind !== 'answer');
}
