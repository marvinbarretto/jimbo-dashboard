import type { VaultActivityEvent } from '@domain/activity/activity-event';
import type { ThreadMessageKind } from '@domain/thread/thread-message';
import type { GroomingStatus } from '@domain/vault/vault-item';

export interface FormattedLine {
  actorId:           string;
  verb:              string;
  target:            string | null;
  summary:           string;
  // FSM-internal detail (e.g. `classified → decomposed`). Shown only in detailed/debug.
  details:           string | null;
  scrollToMessageId: string | null;
}

const humanStatus = (s: GroomingStatus): string => s.replace(/_/g, ' ');

function threadVerb(kind: ThreadMessageKind): string {
  switch (kind) {
    case 'comment':   return 'commented';
    case 'question':  return 'asked';
    case 'answer':    return 'answered';
    case 'rejection': return 'rejected';
  }
}

export function formatEvent(e: VaultActivityEvent): FormattedLine {
  const base = { target: null, summary: '', details: null, scrollToMessageId: null } as const;
  switch (e.type) {
    case 'created':
      return { ...base, actorId: e.actor_id, verb: 'created' };
    case 'assigned':
      // First assignment has no prior owner (from_actor_id === null). Rendering it
      // as "reassigned" implies a previous owner that never existed — the source of
      // the "jimbo reassigned → jimbo" confusion on freshly-ingested items.
      return { ...base, actorId: e.actor_id, verb: e.from_actor_id ? 'reassigned' : 'assigned', target: e.to_actor_id, summary: e.reason ? `— ${e.reason}` : '' };
    case 'grooming_status_changed': {
      const noteSuffix = e.note ? ` (${e.note})` : '';
      return {
        ...base,
        actorId: e.actor_id,
        verb:    'moved',
        summary: `${humanStatus(e.from)} to ${humanStatus(e.to)}${noteSuffix}`,
        details: `${e.from} → ${e.to}`,
      };
    }
    case 'completion_changed':
      return { ...base, actorId: e.actor_id, verb: e.to ? 'completed' : 'reopened', summary: e.note ? `— ${e.note}` : '' };
    case 'archived':
      return { ...base, actorId: e.actor_id, verb: 'archived', summary: e.note ? `— ${e.note}` : '' };
    case 'unarchived':
      return { ...base, actorId: e.actor_id, verb: 'unarchived', summary: e.note ? `— ${e.note}` : '' };
    case 'thread_message_posted':
      return { ...base, actorId: e.actor_id, verb: threadVerb(e.message_kind), scrollToMessageId: e.message_id };
    case 'agent_run_completed': {
      // Compact mode hides agent-run summaries (see event-line.html) because
      // grooming passes are chatty. That makes the VERB the only compact-visible
      // part — and "ran" is the wrong word for the delivery that put the item in
      // front of Marvin. That moment is a milestone in the item's story, not
      // another pass over it.
      const verb = e.skill_id === 'commission' ? 'delivered'
        : e.skill_id === 'recon' ? 'scouted'
        : 'ran';
      return { ...base, actorId: e.actor_id, verb, summary: `— ${e.summary}` };
    }
    case 'review_decided': {
      // Both end at done, and the difference is the whole point of the review
      // gate: one certifies the work, the other disposes of an output nobody
      // needed to certify.
      const verb = {
        approved:  'approved',
        done_unreviewed: 'marked done, unreviewed',
        archived:  'archived',
        sent_back: 'sent back',
      }[e.disposition];
      return { ...base, actorId: e.actor_id, verb, summary: e.reason ? `— ${e.reason}` : '' };
    }
    case 'rejected':
      return { ...base, actorId: e.actor_id, verb: 'rejected', target: e.to_owner, summary: `— ${e.reason}`, scrollToMessageId: e.thread_message_id };
  }
}
