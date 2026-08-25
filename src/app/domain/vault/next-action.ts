import type { Readiness, ReadinessCheckKey } from './readiness';
import type { GroomingStatus, VaultItem } from './vault-item';

// "What's this item waiting on?" — derived projection over a vault item.
// Single line, single phrase. Operator answer to "what happens next?".
//
// Decision tree (most upstream blocker wins, so an ungroomed item reports
// "Waiting on grooming" instead of the noisier "Waiting on acceptance criteria"):
//   archived  → "Archived"
//   completed → "Done"
//   ready     → "Ready to dispatch" (with owner if assigned to non-marvin)
//   else      → "Waiting on …" keyed off first failing readiness check
//                in upstream-first order

export type NextActionTone = 'ready' | 'waiting' | 'done' | 'archived';

export interface NextAction {
  prefix: string;          // e.g. "Waiting on", "Ready to dispatch", "Done"
  value:  string;          // e.g. "grooming (decomposed)", "@boris", ""
  tone:   NextActionTone;
}

// Failing-check priority. Most-upstream first — these gate everything downstream.
// Grooming sits above AC because in the ungroomed/intake_* states the AC isn't
// expected to exist yet; reporting "waiting on AC" would be misleading noise.
const CHECK_PRIORITY: readonly ReadinessCheckKey[] = [
  'unresolved_blockers',
  'open_questions',
  'grooming_complete',
  'acceptance_criteria',
  'assigned',
  'priority',
];

// Per grooming-status next-required-move. The grooming state machine has different
// actors driving different transitions — naming the actual blocked move ("your
// approval", "decomposition") is more useful to the operator than the column name
// ("grooming (decomposed)"). `ready` doesn't appear because readiness.verdict
// short-circuits before this map is consulted, and neither does `settled` — both
// are terminal, so nothing is pending on them.
const GROOMING_NEXT_MOVE: Record<Exclude<GroomingStatus, 'ready' | 'settled'>, string> = {
  ungroomed:        'intake review',
  intake_rejected:  'questions to be answered',
  intake_complete:  'classification',
  classified:       'decomposition',
  decomposed:       'your approval',
  needs_rework:     'rework',
};

function waitingLabel(key: ReadinessCheckKey, item: VaultItem, readiness: Readiness): string {
  switch (key) {
    case 'unresolved_blockers':
      return 'blockers';
    case 'open_questions': {
      const check = readiness.checks.find(c => c.key === 'open_questions');
      return check?.blocker ?? 'open questions';
    }
    case 'grooming_complete': {
      const status = item.grooming_status;
      if (status === 'ready') return 'review'; // defensive — shouldn't reach here when ready
      // A reference item or an epic is not waiting on grooming; it has left the
      // pipeline for good. Same defensive shape as `ready` above.
      if (status === 'settled') return 'nothing — settled out of the pipeline';
      return GROOMING_NEXT_MOVE[status];
    }
    case 'acceptance_criteria':
      return 'acceptance criteria';
    case 'assigned':
      return 'owner assignment';
    case 'priority':
      return 'priority';
  }
}

export function computeNextAction(item: VaultItem, readiness: Readiness): NextAction {
  if (item.archived_at)  return { prefix: 'Archived',  value: '', tone: 'archived' };
  if (item.completed_at) return { prefix: 'Done',      value: '', tone: 'done' };

  if (readiness.verdict === 'ready') {
    return {
      prefix: 'Ready to dispatch',
      value:  item.assigned_to ? `→ @${item.assigned_to}` : '',
      tone:   'ready',
    };
  }

  for (const key of CHECK_PRIORITY) {
    const check = readiness.checks.find(c => c.key === key);
    if (check && !check.ok) {
      return { prefix: 'Waiting on', value: waitingLabel(key, item, readiness), tone: 'waiting' };
    }
  }

  // Defensive fallback — readiness.verdict says not_ready/blocked but no failing check
  // matched our priority list. Shouldn't fire given CHECK_PRIORITY covers every key,
  // but keeps the return type sound.
  return { prefix: 'Waiting on', value: 'review', tone: 'waiting' };
}
