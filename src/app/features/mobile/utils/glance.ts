/**
 * The home screen's read-only top strip: date, today's intake and step count,
 * and the next fixed thing.
 *
 * Every formatting branch lives here rather than in the template so it can be
 * asserted — thousands separators, the "in 25m" / "in 2h" split, and the
 * missing-data cases are all things that read wrong in ways a rendering test
 * would never catch.
 */

/** The shape the home screen needs from a live-status calendar entry. */
export interface GlanceEvent {
  readonly title: string;
  /** Minutes until it starts. Preferred over the API's `time`, which is UTC. */
  readonly in_minutes: number | null;
}

export interface GlanceInput {
  /** Logical day, YYYY-MM-DD. */
  readonly day: string;
  readonly intakeKcal: number | null;
  /**
   * `undefined` = no steps source wired on this build; `null` = a source
   * answered but had nothing. The two must read differently: an absent feature
   * should say nothing, a silent one should own up.
   */
  readonly steps?: number | null;
  /** Native HealthSnapshot reading, when the bridge is present. */
  readonly deviceSteps?: number | null;
  readonly upcoming?: readonly GlanceEvent[];
}

export interface Glance {
  readonly dateLabel: string;
  readonly statsLabel: string;
  readonly nextLabel: string;
  /** Full-sentence expansion — "0 kcal · 240 steps" reads as gibberish aloud. */
  readonly srSummary: string;
}

const TITLE_MAX = 28;

const num = (n: number): string => n.toLocaleString('en-GB');

function truncate(title: string): string {
  const t = title.trim();
  return t.length > TITLE_MAX ? `${t.slice(0, TITLE_MAX - 1)}…` : t;
}

/**
 * Steps are monotonic within a day, so when both sources answer the larger one
 * is the fresher one — not "prefer device", which would go backwards whenever
 * the plugin is mid-permission-prompt.
 */
function resolveSteps(
  steps: number | null | undefined,
  deviceSteps: number | null | undefined,
): number | null | undefined {
  const known = [steps, deviceSteps].filter((v): v is number => typeof v === 'number');
  if (known.length) return Math.max(...known);
  // Nothing numeric: a source that answered emptily (null) outranks no source at all.
  return steps === null || deviceSteps === null ? null : undefined;
}

function nextFrom(upcoming: readonly GlanceEvent[]): { label: string; sr: string } {
  const next = upcoming[0];
  if (!next) return { label: 'nothing next', sr: 'Nothing else scheduled.' };
  const title = truncate(next.title);
  const mins = next.in_minutes;
  if (mins === null) return { label: title, sr: `Next: ${title}.` };
  if (mins <= 0) return { label: `${title} now`, sr: `${title} is starting now.` };
  if (mins < 60) return { label: `${title} in ${mins}m`, sr: `Next: ${title} in ${mins} minutes.` };
  const hours = Math.round(mins / 60);
  return { label: `${title} in ${hours}h`, sr: `Next: ${title} in about ${hours} hours.` };
}

/**
 * "Thu 13 Aug" for a YYYY-MM-DD logical day — the glance strip's date and the
 * close-day card's heading, so the two can't drift into different formats.
 *
 * Anchored at midday UTC so the label can't slip a date across a DST boundary,
 * and takes the day as an argument rather than reading the clock, so callers
 * stay testable.
 */
export function shortDayLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function buildGlance(input: GlanceInput): Glance {
  const date = new Date(`${input.day}T12:00:00Z`);
  const dateLabel = shortDayLabel(input.day);

  const steps = resolveSteps(input.steps, input.deviceSteps);

  const parts: string[] = [];
  const srParts: string[] = [];
  if (input.intakeKcal !== null) {
    parts.push(`${num(input.intakeKcal)} kcal`);
    srParts.push(`${num(input.intakeKcal)} calories logged`);
  }
  if (steps === null) {
    // A missing sync is not a sedentary day — never render "0 steps".
    parts.push('— steps');
    srParts.push('step count unavailable');
  } else if (steps !== undefined) {
    parts.push(`${num(steps)} steps`);
    srParts.push(`${num(steps)} steps`);
  }

  const statsLabel = parts.length ? parts.join(' · ') : 'nothing logged yet';
  const next = nextFrom(input.upcoming ?? []);

  const srDate = date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const srStats = srParts.length ? `${srParts.join(', ')}.` : 'Nothing logged yet.';

  return {
    dateLabel,
    statsLabel,
    nextLabel: next.label,
    srSummary: `${srDate}. ${srStats} ${next.sr}`,
  };
}
