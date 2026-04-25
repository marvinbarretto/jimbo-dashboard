import type { ThreadMessage } from '../thread/thread-message';
import type { VaultItem } from './vault-item';

// Readiness is a pure projection over a VaultItem — no state, no storage.
// Every check is a predicate; every missing check carries a human-readable blocker.
// This function is the single source of truth for "is this item ready to dispatch?".
// The UI renders it; the dispatcher consults it. Both read from the same function.

export type ReadinessCheckKey =
  | 'acceptance_criteria'
  | 'assigned'
  | 'priority'
  | 'grooming_complete'
  | 'open_questions'       // only present when there ARE questions
  | 'unresolved_blockers'; // only present when there ARE blocking dependencies

export interface ReadinessCheck {
  key: ReadinessCheckKey;
  label: string;
  ok: boolean;
  blocker: string | null;   // null when ok; short reason when not
}

export interface Readiness {
  checks: ReadinessCheck[];
  passed: number;
  total: number;
  verdict: 'ready' | 'not_ready' | 'blocked';   // ready: all pass; not_ready: 1-2 misses; blocked: more
}

// Minimal shape describing the blocker items that are still open.
// Caller supplies this — `computeReadiness` doesn't know how to fetch; it just reads.
export interface OpenBlocker {
  blocker_id: string;
  blocker_seq: number;       // for display, e.g. "#1820"
  blocker_title: string;
}

export function computeReadiness(
  item: VaultItem,
  messages: ThreadMessage[] = [],
  openBlockers: OpenBlocker[] = [],
): Readiness {
  const checks: ReadinessCheck[] = [
    {
      key: 'acceptance_criteria',
      label: 'Acceptance criteria set',
      ok: item.acceptance_criteria.length > 0,
      blocker: item.acceptance_criteria.length > 0 ? null : 'at least one criterion needed',
    },
    {
      key: 'assigned',
      label: 'Owner assigned',
      ok: item.assigned_to !== null,
      blocker: item.assigned_to !== null ? null : 'unassigned items cannot move',
    },
    {
      key: 'priority',
      label: 'Priority scored',
      ok: item.manual_priority !== null || item.ai_priority !== null,
      blocker: (item.manual_priority !== null || item.ai_priority !== null)
        ? null
        : 'neither AI nor manual has been set',
    },
    {
      key: 'grooming_complete',
      label: 'Grooming complete',
      ok: item.grooming_status === 'ready',
      blocker: item.grooming_status === 'ready' ? null : `currently ${item.grooming_status.replace('_', ' ')}`,
    },
  ];

  // Conditional check: only surface when there are questions. Items that never had
  // questions asked don't see this — it would be a false signal ("ok, no open questions"
  // on an item that hasn't been through intake-quality).
  const openQuestions = messages.filter(m => m.kind === 'question' && !m.answered_by);
  if (openQuestions.length > 0) {
    checks.push({
      key: 'open_questions',
      label: 'No open questions',
      ok: false,
      blocker: `${openQuestions.length} question${openQuestions.length === 1 ? '' : 's'} awaiting answer`,
    });
  }

  // Conditional check: only surface when blocking dependencies exist. Same pattern as
  // open_questions — items with no blockers never see this check at all.
  if (openBlockers.length > 0) {
    const names = openBlockers.map(b => `#${b.blocker_seq}`).join(', ');
    checks.push({
      key: 'unresolved_blockers',
      label: 'Blocking dependencies resolved',
      ok: false,
      blocker: `waiting on ${names}`,
    });
  }

  const passed = checks.filter(c => c.ok).length;
  const total  = checks.length;
  const misses = total - passed;
  const verdict: Readiness['verdict'] =
    misses === 0 ? 'ready' :
    misses <= 2  ? 'not_ready' : 'blocked';

  return { checks, passed, total, verdict };
}

export function effectivePriority(item: VaultItem) {
  return item.manual_priority ?? item.ai_priority;
}

export function isEpic(childCount: number): boolean {
  // `is_epic` is not stored — derived from having any children. Caller supplies the count.
  return childCount > 0;
}
