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
  ownerIsHuman = false,
): Readiness {
  const groomingReady = item.grooming_status === 'ready';
  // Grooming is the HANDOFF protocol: acceptance criteria exist so an agent
  // knows when to stop, because it cannot ask. Groom it if you want someone
  // else to do it; don't groom it if you're doing it. So an item a human owns,
  // with criteria and a priority, is ready on its own terms — it needs no
  // agent-facing handoff at all.
  //
  // This could never pass the grooming gate: the pump only ever offered
  // agent-owned items to grooming, so `grooming_status` was structurally
  // unreachable for human-owned work. 173 items sat one unreachable check short
  // of ready.
  //
  // Scoped to a human owner, exactly as the retired `grooming_override` was:
  // reassigning to an agent reinstates the real gate, because the agent still
  // cannot ask. Nothing dispatches off this verdict — the pump reads
  // grooming_status in SQL — so it reclassifies what the board SHOWS, not what
  // the pipeline will run. See docs/decisions/decision-log.md, 2026-08-18.
  const hasPriority = item.manual_priority !== null || item.ai_priority !== null;
  const humanReady = !groomingReady
    && ownerIsHuman
    && item.acceptance_criteria.length > 0
    && hasPriority;
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
      ok: hasPriority,
      blocker: hasPriority ? null : 'neither AI nor manual has been set',
    },
    {
      key: 'grooming_complete',
      label: humanReady ? 'Yours — no handoff needed' : 'Grooming complete',
      ok: groomingReady || humanReady,
      blocker: (groomingReady || humanReady) ? null : `currently ${item.grooming_status.replace('_', ' ')}`,
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

// NOTE: this is a "has children" predicate, NOT the canonical epic test.
// Epic-ness is the deliberate `is_epic` flag on the item (see vault-item.ts) —
// a task can own subtasks without being an epic. Read `item.is_epic` to decide
// whether something is an epic; use this only when you literally mean "has any
// children". Named `isEpic` for historical reasons; do not extend its use.
export function isEpic(childCount: number): boolean {
  return childCount > 0;
}
