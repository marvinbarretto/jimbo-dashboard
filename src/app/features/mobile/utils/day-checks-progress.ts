import { formatDuration } from '@shared/utils/datetime.utils';
import type { DayCheckItem, DayCheckResponseType } from '@domain/day-checks';

/**
 * How much of the day's tick-list is done, and how long finishing it would take.
 *
 * The counting rule is the journal page's — an item is answered when it has an
 * `entry`, full stop. Not "the entry says yes": a check answered `false`, or a
 * scale answered `0`, has been answered. The API omits the entry entirely for a
 * genuine miss, so `entry !== null` is the whole test. Hoisted out of
 * JournalChecksSection so the phone and the journal provably agree rather than
 * agreeing by coincidence.
 *
 * The cost estimate exists because "3 left" is a nag and "~30s left" is an
 * offer. It's the difference between opening the close-day card and not.
 */

export interface ChecksProgress {
  readonly answered: number;
  readonly total: number;
  readonly remaining: number;
  /** "~30s left"; empty when there is nothing left to spend time on. */
  readonly costLabel: string;
}

/**
 * Seconds a check costs to answer, by how it's asked. A tick is a thumb; a
 * scale is a thumb plus a decision; free text is typing on a phone.
 */
const COST_SECONDS: Readonly<Record<DayCheckResponseType, number>> = {
  bool: 5,
  scale: 10,
  text: 30,
};

export function summariseChecks(items: readonly DayCheckItem[]): ChecksProgress {
  const outstanding = items.filter((i) => i.entry === null);
  // The union is a mirror of the API, not a guarantee from it — an unknown
  // response type costs a tick rather than crashing the estimate.
  const seconds = outstanding.reduce(
    (sum, i) => sum + (COST_SECONDS[i.response_type] ?? COST_SECONDS.bool),
    0,
  );

  return {
    answered: items.length - outstanding.length,
    total: items.length,
    remaining: outstanding.length,
    costLabel: outstanding.length ? `${formatDuration(seconds)} left` : '',
  };
}
