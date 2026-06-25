import type { SessionDetailed } from '../data-access/exercise.service';

// en-CA renders as YYYY-MM-DD.
export function londonToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
}

// Shift a YYYY-MM-DD day by whole days. Parsed as UTC midnight and shifted in
// UTC so there's no DST drift on the date arithmetic itself.
export function shiftIsoDay(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function londonTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  });
}

export function londonDateTime(ts: string): string {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  });
}

export interface SessionStats {
  sets: number;
  volumeKg: number;
  cardioMin: number;
  cardioKm: number;
}

// Raw sums for one session — no derived "scores", just what was captured.
export function sessionStats(s: SessionDetailed): SessionStats {
  // Each row carries a `sets` count (e.g. "2 × 10 × 25kg"), so volume and the
  // set tally weight by that count rather than the number of rows.
  const volumeKg = s.sets.reduce((acc, x) => acc + (x.reps ?? 0) * (x.weight_kg ?? 0) * (x.sets ?? 1), 0);
  const cardioSec = s.cardio.reduce((acc, c) => acc + (c.duration_s ?? 0), 0);
  const cardioKm = s.cardio.reduce((acc, c) => acc + (c.distance_km ?? 0), 0);
  return {
    sets: s.sets.reduce((acc, x) => acc + (x.sets ?? 1), 0),
    volumeKg: Math.round(volumeKg),
    cardioMin: Math.round(cardioSec / 60),
    cardioKm: Math.round(cardioKm * 100) / 100,
  };
}

export interface ExerciseGroup {
  name: string;
  sets: { sets: number; reps: number | null; weight_kg: number | null; rpe: number | null }[];
}

// Group a session's sets by exercise, preserving first-seen order, so the raw
// list reads like a workout sheet (one line per exercise with its sets).
export function groupSetsByExercise(s: SessionDetailed): ExerciseGroup[] {
  const order: string[] = [];
  const byName = new Map<string, ExerciseGroup>();
  for (const set of s.sets) {
    const name = set.exercise_name ?? set.exercise_id;
    let g = byName.get(name);
    if (!g) {
      g = { name, sets: [] };
      byName.set(name, g);
      order.push(name);
    }
    g.sets.push({ sets: set.sets ?? 1, reps: set.reps, weight_kg: set.weight_kg, rpe: set.rpe });
  }
  return order.map((n) => byName.get(n)!);
}
