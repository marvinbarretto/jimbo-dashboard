import { daypartAt } from '@shared/utils/daypart';
import { shortDayLabel } from './glance';
import type { ChecksProgress } from './day-checks-progress';
import type { ShapeBlock } from './day-shape';

/**
 * The one card the home screen shows between the glance strip and the
 * launcher: what to do with the next few minutes.
 *
 * Priority is **state first, daypart only as a tiebreak**. A running focus
 * session wins in any daypart — being mid-session is a fact about right now,
 * and offering the evening's tick-list over a live timer would be the screen
 * arguing with itself. Only once nothing is running does the clock get a say:
 * evening closes the day out, morning lays it out, and the rest of the day
 * says nothing much, which is the honest answer.
 *
 * A union rather than a fat view model because the three cards share no fields
 * — the container's `@switch` is where the branch belongs, and each card stays
 * a dumb component with its own inputs.
 */

/** The running session, as much of it as the card needs. */
export interface ActiveFocus {
  readonly startedAt: string;
  readonly plannedSeconds: number;
  /** The session's declared intention, when it has one. */
  readonly notes: string | null;
}

export interface NowCardInput {
  readonly now: Date;
  /** Logical day (YYYY-MM-DD) — the day being closed out. */
  readonly day: string;
  readonly focus: ActiveFocus | null;
  readonly checks: ChecksProgress;
  readonly shape: readonly ShapeBlock[];
}

export type NowCard =
  | {
      readonly kind: 'focus';
      readonly title: string;
      readonly remaining: string;
      readonly percent: number;
      readonly canExtend: boolean;
    }
  | {
      readonly kind: 'close-day';
      readonly dayLabel: string;
      readonly answered: number;
      readonly total: number;
      readonly costLabel: string;
    }
  | { readonly kind: 'shape'; readonly blocks: readonly ShapeBlock[] }
  | { readonly kind: 'idle' };

/**
 * Extending a session in place is not implementable today: the PATCH payload
 * (`UpdateFocusSessionPayload`) carries notes, tags, mood and interrupted —
 * there is no `planned_seconds`. The card keeps the affordance and sends it to
 * the timer page rather than greying a button out; flip this when the API grows
 * the field.
 */
export const CAN_EXTEND_IN_PLACE = false;

const FALLBACK_TITLE = 'Focus session';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Minute granularity throughout: this is a home-screen glance, not the timer,
 * and the clock behind it only ticks once a minute. Seconds are rounded *up*
 * so a session with 30s left says "1m left" rather than counting to zero while
 * still running.
 */
function remainingLabel(secondsLeft: number): string {
  if (secondsLeft <= 0) {
    const over = Math.floor(-secondsLeft / 60);
    return over < 1 ? "time's up" : `${over}m over`;
  }
  const mins = Math.ceil(secondsLeft / 60);
  if (mins < 60) return `${mins}m left`;
  return `${Math.floor(mins / 60)}h ${pad(mins % 60)}m left`;
}

function focusCard(focus: ActiveFocus, now: Date): NowCard {
  const elapsed = (now.getTime() - new Date(focus.startedAt).getTime()) / 1000;
  const planned = focus.plannedSeconds;
  return {
    kind: 'focus',
    title: focus.notes?.trim() || FALLBACK_TITLE,
    remaining: remainingLabel(planned - elapsed),
    // Clamped: an overrun session is still running, and a bar past full reads
    // as a rendering bug rather than as "you're over".
    percent: planned > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / planned) * 100))) : 100,
    canExtend: CAN_EXTEND_IN_PLACE,
  };
}

export function selectNowCard(input: NowCardInput): NowCard {
  if (input.focus) return focusCard(input.focus, input.now);

  const daypart = daypartAt(input.now);

  // Evening runs to 04:00, so a 01:30 glance still offers to close yesterday.
  if (daypart === 'evening' && input.checks.remaining > 0) {
    return {
      kind: 'close-day',
      dayLabel: shortDayLabel(input.day),
      answered: input.checks.answered,
      total: input.checks.total,
      costLabel: input.checks.costLabel,
    };
  }

  if (daypart === 'morning' && input.shape.length > 0) {
    return { kind: 'shape', blocks: input.shape };
  }

  return { kind: 'idle' };
}
