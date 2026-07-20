import type { SessionDetailed } from '../data-access/exercise.service';

// "Last time" lookup for the quick-add: for each exercise, what did the most
// recent previous session look like, and — via RPE — what should this one try?
// Built client-side from a trailing history fetch so the hint works even on a
// fresh day view whose window contains no prior sessions.

/** One exercise's showing within one session, condensed for the hint/prefill. */
export interface ExercisePerf {
  readonly sessionId: string;
  readonly startedAt: string;
  /** All that session's rows for the exercise, e.g. "2×10×25 kg · 1×8×30 kg". */
  readonly summary: string;
  /** Quick-add prefill from the heaviest row (sets / reps / weight_kg). */
  readonly prefill: Readonly<Record<string, number>>;
  /** Hardest reported effort across the rows; null when none logged. */
  readonly topRpe: number | null;
}

type SetRow = SessionDetailed['sets'][number];

function rowSummary(row: SetRow): string {
  const weight = row.weight_kg ?? 0;
  const base = `${row.sets ?? 1}×${row.reps ?? 0}`;
  return weight > 0 ? `${base}×${weight} kg` : base;
}

function perfFor(session: SessionDetailed, rows: readonly SetRow[]): ExercisePerf {
  // Heaviest row drives the prefill — the top set is what progression is
  // measured against; ties go to the later set (more recent judgement).
  let top = rows[0]!;
  for (const row of rows) {
    if ((row.weight_kg ?? 0) >= (top.weight_kg ?? 0)) top = row;
  }

  const prefill: Record<string, number> = { sets: top.sets ?? 1 };
  if (top.reps !== null) prefill['reps'] = top.reps;
  if (top.weight_kg !== null) prefill['weight_kg'] = top.weight_kg;

  const rpes = rows.map((r) => r.rpe).filter((r): r is number => r !== null);

  return {
    sessionId: session.id,
    startedAt: session.started_at,
    summary: rows.map(rowSummary).join(' · '),
    prefill,
    topRpe: rpes.length ? Math.max(...rpes) : null,
  };
}

/**
 * Index sessions by exercise: exercise_id → its showings, most recent first.
 * @param sessions Any order; typically a trailing history window.
 * @returns Map keyed by exercise_id; exercises never logged are simply absent.
 */
export function buildExerciseHistory(
  sessions: readonly SessionDetailed[],
): Map<string, ExercisePerf[]> {
  const out = new Map<string, ExercisePerf[]>();
  const ordered = [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at));

  for (const session of ordered) {
    const byExercise = new Map<string, SetRow[]>();
    for (const row of session.sets) {
      (byExercise.get(row.exercise_id) ?? byExercise.set(row.exercise_id, []).get(row.exercise_id)!).push(row);
    }
    for (const [exerciseId, rows] of byExercise) {
      (out.get(exerciseId) ?? out.set(exerciseId, []).get(exerciseId)!).push(perfFor(session, rows));
    }
  }
  return out;
}

/**
 * The exercise's most recent showing strictly before the given session —
 * "before" by start time so browsing a past day never cites a future workout
 * as "last time".
 * @returns null when the exercise has no earlier history.
 */
export function lastPerfBefore(
  history: ReadonlyMap<string, readonly ExercisePerf[]>,
  exerciseId: string,
  session: { id: string; started_at: string },
): ExercisePerf | null {
  for (const perf of history.get(exerciseId) ?? []) {
    if (perf.sessionId !== session.id && perf.startedAt < session.started_at) return perf;
  }
  return null;
}

// RPE-anchored progression nudge. Thresholds follow the reps-in-reserve
// reading of RPE: ≤6 = 4+ reps left (underloaded — add weight), 7–8 = the
// 2-3-in-reserve zone most working sets should live in, ≥9 = near-max.
function suggestion(perf: ExercisePerf): string | null {
  if (perf.topRpe === null) return null;
  const weight = perf.prefill['weight_kg'] ?? 0;
  if (perf.topRpe <= 6) {
    return weight > 0 ? `felt easy → try ${weight + 2.5} kg` : 'felt easy → try +2 reps';
  }
  if (perf.topRpe <= 8) return 'right zone — repeat, or +1 rep';
  return 'near max — repeat until it feels easier';
}

/** Short London date ("12 Jul") for the hint line. */
function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', day: 'numeric', month: 'short',
  }).format(new Date(iso));
}

/**
 * The full quick-add hint line, e.g.
 * "Last time (12 Jul): 2×10×25 kg @ RPE 6 — felt easy → try 27.5 kg".
 */
export function lastTimeHint(perf: ExercisePerf): string {
  const rpe = perf.topRpe !== null ? ` @ RPE ${perf.topRpe}` : '';
  const advice = suggestion(perf);
  return `Last time (${shortDate(perf.startedAt)}): ${perf.summary}${rpe}${advice ? ` — ${advice}` : ''}`;
}
