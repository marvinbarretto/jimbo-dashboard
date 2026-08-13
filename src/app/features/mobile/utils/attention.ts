/**
 * The attention row — the short list of things genuinely waiting on Marvin.
 *
 * Its whole value is what it leaves out. The row renders only when it has
 * something, so an empty day shows nothing at all rather than a reassuring
 * "0 waiting" that still costs a glance. Two rules keep it that way:
 *
 *  - **Zeroes are suppressed**, never rendered as a calm state.
 *  - **Nothing already on screen repeats here.** When the NOW card is the
 *    close-out, the day-checks line is the card's whole subject; saying it
 *    twice in 200 vertical pixels is how a screen starts feeling like nagging.
 *
 * Deliberately *not* fed by `blockers[]`: the live call routinely carries 20+
 * of them and they're a backlog, not an alert. A permanent count on the home
 * screen trains dismissal, and once dismissal is trained the row is dead for
 * the things that do matter.
 */

export interface AttentionItem {
  readonly id: string;
  /** What the row reads: "20 waiting on you". */
  readonly label: string;
  /** Full accessible name — the row is a link, and "20" alone is not a name. */
  readonly srLabel: string;
  readonly route: string;
}

export interface AttentionInput {
  /** dispatch_pulse.waiting_on_marvin. undefined until live-status answers. */
  readonly waitingOnMarvin?: number | null;
  readonly checksRemaining: number;
  /** "~25s left" — the tap-cost estimate, when there is one. */
  readonly checksCostLabel: string;
  /** The close-out card is on screen and already says this. */
  readonly closeDayOnScreen: boolean;
}

const count = (n: number | null | undefined): number => (typeof n === 'number' ? n : 0);

export function buildAttention(input: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];

  const waiting = count(input.waitingOnMarvin);
  if (waiting > 0) {
    items.push({
      id: 'dispatch',
      label: `${waiting} waiting on you`,
      srLabel: `${waiting} dispatch ${waiting === 1 ? 'job' : 'jobs'} waiting on you`,
      route: '/review',
    });
  }

  if (input.checksRemaining > 0 && !input.closeDayOnScreen) {
    const cost = input.checksCostLabel ? ` · ${input.checksCostLabel}` : '';
    const noun = input.checksRemaining === 1 ? 'check' : 'checks';
    items.push({
      id: 'day-checks',
      label: `${input.checksRemaining} ${noun} unanswered${cost}`,
      srLabel: `${input.checksRemaining} day ${noun} unanswered`,
      route: '/evening',
    });
  }

  return items;
}
