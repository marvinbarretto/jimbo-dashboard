import type { VaultActivityEvent } from '@domain/activity/activity-event';

export interface FormattedLine {
  actorId:           string;
  verb:              string;
  target:            string | null;
  summary:           string;
  scrollToMessageId: string | null;
}

export function formatEvent(e: VaultActivityEvent): FormattedLine {
  switch (e.type) {
    case 'created':
      return { actorId: e.actor_id, verb: 'created', target: null, summary: '', scrollToMessageId: null };
    case 'assigned':
      return { actorId: e.actor_id, verb: 'reassigned', target: e.to_actor_id, summary: e.reason ?? '', scrollToMessageId: null };
    case 'grooming_status_changed':
      return { actorId: e.actor_id, verb: 'moved', target: null, summary: `${e.from} → ${e.to}${e.note ? ` — ${e.note}` : ''}`, scrollToMessageId: null };
    case 'completion_changed':
      return { actorId: e.actor_id, verb: e.to ? 'completed' : 'reopened', target: null, summary: e.note ?? '', scrollToMessageId: null };
    case 'archived':
      return { actorId: e.actor_id, verb: 'archived', target: null, summary: e.note ?? '', scrollToMessageId: null };
    case 'unarchived':
      return { actorId: e.actor_id, verb: 'unarchived', target: null, summary: e.note ?? '', scrollToMessageId: null };
    case 'thread_message_posted':
      return { actorId: e.actor_id, verb: `posted ${e.message_kind}`, target: null, summary: '', scrollToMessageId: e.message_id };
    case 'agent_run_completed':
      return { actorId: e.actor_id, verb: 'ran', target: null, summary: e.summary, scrollToMessageId: null };
    case 'rejected':
      return { actorId: e.actor_id, verb: 'rejected', target: e.to_owner, summary: e.reason, scrollToMessageId: e.thread_message_id };
  }
}
