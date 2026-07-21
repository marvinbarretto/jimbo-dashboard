import type { ExerciseCatalogItem, SessionDetailed } from '../data-access/exercise.service';

// Body-part split (not push/pull/legs) — the chart exists to answer "do I need
// a leg/arms day", which needs buckets that match how training days are
// talked about, not a biomechanical push/pull grouping that would bury arms
// inside both.
export type BodyPartRegion = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'cardio' | 'other';

// gym_muscle_groups id → region. Fixed seed data (11 rows), see
// jimbo-api/db/migrations/20260521120000_gym_tables.sql.
export const MUSCLE_GROUP_REGION: Record<number, BodyPartRegion> = {
  1: 'chest',
  2: 'back',
  3: 'shoulders',
  4: 'arms', // biceps
  5: 'arms', // triceps
  6: 'legs', // quads
  7: 'legs', // hamstrings
  8: 'legs', // glutes
  9: 'legs', // calves
  10: 'core',
  11: 'arms', // forearms
};

// Specific muscle names for the same fixed seed — finer-grained than the
// region buckets above, for per-exercise labels ("biceps", not "arms").
export const MUSCLE_GROUP_NAMES: Record<number, string> = {
  1: 'chest',
  2: 'back',
  3: 'shoulders',
  4: 'biceps',
  5: 'triceps',
  6: 'quads',
  7: 'hamstrings',
  8: 'glutes',
  9: 'calves',
  10: 'core',
  11: 'forearms',
};

export const REGION_LABELS: Record<BodyPartRegion, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
  cardio: 'Cardio',
  other: 'Other',
};

// Fixed display order; 'other' is appended by callers only when non-empty so
// unclassified exercises are never silently dropped from the total.
export const REGION_ORDER: readonly BodyPartRegion[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio'];

export type ExerciseMeta = Pick<ExerciseCatalogItem, 'primary_muscle_group' | 'equipment_type'>;

// equipment_type 'cardio' wins regardless of muscle group (cardio machines
// carry no primary_muscle_group); otherwise map the muscle group, falling
// back to 'other' for anything unclassified rather than dropping it.
export function regionForExercise(ex: ExerciseMeta | undefined): BodyPartRegion {
  if (!ex) return 'other';
  if (ex.equipment_type === 'cardio') return 'cardio';
  if (ex.primary_muscle_group != null) return MUSCLE_GROUP_REGION[ex.primary_muscle_group] ?? 'other';
  return 'other';
}

/**
 * Human muscle summary for one exercise: primary first, then secondaries —
 * "back · biceps". Cardio-typed exercises read "cardio"; fully unclassified
 * ones return null (show nothing rather than "other").
 */
export function muscleSummary(
  ex: Pick<ExerciseCatalogItem, 'primary_muscle_group' | 'secondary_muscle_groups' | 'equipment_type'> | undefined,
): string | null {
  if (!ex) return null;
  if (ex.equipment_type === 'cardio') return 'cardio';
  const ids = [ex.primary_muscle_group, ...(ex.secondary_muscle_groups ?? [])];
  const names = ids
    .filter((id): id is number => id !== null)
    .map((id) => MUSCLE_GROUP_NAMES[id])
    .filter((n): n is string => n !== undefined);
  return names.length ? [...new Set(names)].join(' · ') : null;
}

export interface BodyPartCount {
  region: BodyPartRegion;
  label: string;
  count: number;
}

// Sized by set-count (not kg-volume) — volume would just re-rank by whichever
// region you lift heaviest on (legs always win via squat weight); set-count
// reflects how much attention each body part actually got, and still counts
// bodyweight exercises with no weight_kg. Cardio entries have no `sets` field,
// so each logged cardio row counts as 1.
export function bodyPartBreakdown(
  sessions: readonly SessionDetailed[],
  exerciseIndex: ReadonlyMap<string, ExerciseMeta>,
): BodyPartCount[] {
  const counts = new Map<BodyPartRegion, number>();
  const add = (region: BodyPartRegion, n: number) => counts.set(region, (counts.get(region) ?? 0) + n);

  for (const session of sessions) {
    for (const set of session.sets) {
      add(regionForExercise(exerciseIndex.get(set.exercise_id)), set.sets ?? 1);
    }
    // A row logged in the cardio table is cardio by definition, regardless of
    // what the catalogue says about its exercise (or if it's missing there).
    if (session.cardio.length) add('cardio', session.cardio.length);
  }

  const order = counts.get('other') ? [...REGION_ORDER, 'other' as const] : REGION_ORDER;
  return order
    .filter((region) => counts.has(region))
    .map((region) => ({ region, label: REGION_LABELS[region], count: counts.get(region)! }));
}

export interface BodyPartCoverage {
  region: BodyPartRegion;
  label: string;
  daysSince: number | null;
}

// Most recent day each region was trained, within the loaded session window.
// A region absent from every loaded session gets daysSince: null — the direct
// "you haven't hit legs" signal.
export function lastTrainedByRegion(
  sessions: readonly SessionDetailed[],
  exerciseIndex: ReadonlyMap<string, ExerciseMeta>,
  today: string,
): BodyPartCoverage[] {
  const lastSeen = new Map<BodyPartRegion, string>(); // region -> YYYY-MM-DD, most recent wins
  const record = (region: BodyPartRegion, date: string) => {
    if (region === 'other') return;
    const prev = lastSeen.get(region);
    if (!prev || date > prev) lastSeen.set(region, date);
  };

  for (const session of sessions) {
    const date = session.started_at.slice(0, 10);
    for (const set of session.sets) record(regionForExercise(exerciseIndex.get(set.exercise_id)), date);
    if (session.cardio.length) record('cardio', date);
  }

  const todayMs = Date.parse(`${today}T00:00:00Z`);
  return REGION_ORDER.map((region) => {
    const seen = lastSeen.get(region);
    const daysSince = seen ? Math.round((todayMs - Date.parse(`${seen}T00:00:00Z`)) / 86_400_000) : null;
    return { region, label: REGION_LABELS[region], daysSince };
  });
}

export type TrainingDayType = BodyPartRegion | 'mixed';

// Per-day dominant region: group sessions by calendar day, run bodyPartBreakdown
// on just that day's sessions, and take the region with the highest set count. A
// day with two (or more) regions tied for the top count is ambiguous (e.g. a
// combined push/pull day) and gets 'mixed' rather than an arbitrary pick. Days
// with no sessions are simply absent from the returned map — callers treat that
// as rest.
export function trainingDayTypeByDate(
  sessions: readonly SessionDetailed[],
  exerciseIndex: ReadonlyMap<string, ExerciseMeta>,
): Map<string, TrainingDayType> {
  const byDate = new Map<string, SessionDetailed[]>();
  for (const s of sessions) {
    const date = s.started_at.slice(0, 10);
    const arr = byDate.get(date);
    if (arr) arr.push(s);
    else byDate.set(date, [s]);
  }

  const out = new Map<string, TrainingDayType>();
  for (const [date, daySessions] of byDate) {
    const counts = bodyPartBreakdown(daySessions, exerciseIndex);
    if (!counts.length) continue;
    const top = Math.max(...counts.map((c) => c.count));
    const winners = counts.filter((c) => c.count === top);
    out.set(date, winners.length > 1 ? 'mixed' : winners[0]!.region);
  }
  return out;
}
