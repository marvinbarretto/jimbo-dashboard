import { describe, expect, it } from 'vitest';
import { buildExerciseHistory, lastPerfBefore, lastTimeHint } from './exercise-history';
import type { SessionDetailed } from '../data-access/exercise.service';

function set(
  exerciseId: string,
  opts: Partial<Pick<SessionDetailed['sets'][number], 'sets' | 'reps' | 'weight_kg' | 'rpe' | 'set_number'>> = {},
): SessionDetailed['sets'][number] {
  return {
    id: `set_${exerciseId}_${opts.set_number ?? 1}`, session_id: 's', exercise_id: exerciseId,
    exercise_name: exerciseId, set_number: opts.set_number ?? 1, sets: opts.sets ?? 1,
    reps: opts.reps ?? 10, weight_kg: 'weight_kg' in opts ? (opts.weight_kg ?? null) : 20,
    rpe: opts.rpe ?? null,
    duration_s: null, notes: null, created_at: '',
  };
}

function session(id: string, startedAt: string, sets: SessionDetailed['sets']): SessionDetailed {
  return {
    id, started_at: startedAt, ended_at: null, pre_energy: null, notes: null,
    vault_note_id: null, created_at: startedAt, sets, cardio: [],
  };
}

describe('buildExerciseHistory', () => {
  it('indexes by exercise, most recent session first, regardless of input order', () => {
    const history = buildExerciseHistory([
      session('s1', '2026-07-10T10:00:00Z', [set('press', { weight_kg: 25 })]),
      session('s3', '2026-07-18T10:00:00Z', [set('press', { weight_kg: 30 })]),
      session('s2', '2026-07-14T10:00:00Z', [set('press', { weight_kg: 27.5 })]),
    ]);
    expect(history.get('press')!.map((p) => p.sessionId)).toEqual(['s3', 's2', 's1']);
  });

  it('condenses multiple rows into one perf with a joined summary and max rpe', () => {
    const history = buildExerciseHistory([
      session('s1', '2026-07-10T10:00:00Z', [
        set('press', { sets: 2, reps: 10, weight_kg: 25, rpe: 6, set_number: 1 }),
        set('press', { sets: 1, reps: 8, weight_kg: 30, rpe: 8, set_number: 2 }),
      ]),
    ]);
    const perf = history.get('press')![0]!;
    expect(perf.summary).toBe('2×10×25 kg · 1×8×30 kg');
    expect(perf.topRpe).toBe(8);
  });

  it('prefills from the heaviest row', () => {
    const history = buildExerciseHistory([
      session('s1', '2026-07-10T10:00:00Z', [
        set('press', { sets: 2, reps: 10, weight_kg: 25, set_number: 1 }),
        set('press', { sets: 1, reps: 8, weight_kg: 30, set_number: 2 }),
      ]),
    ]);
    expect(history.get('press')![0]!.prefill).toEqual({ sets: 1, reps: 8, weight_kg: 30 });
  });

  it('omits weight from summary and prefill for bodyweight rows', () => {
    const history = buildExerciseHistory([
      session('s1', '2026-07-10T10:00:00Z', [set('plank', { weight_kg: null, reps: 12 })]),
    ]);
    const perf = history.get('plank')![0]!;
    expect(perf.summary).toBe('1×12');
    expect(perf.prefill).toEqual({ sets: 1, reps: 12 });
  });
});

describe('lastPerfBefore', () => {
  const history = buildExerciseHistory([
    session('s1', '2026-07-10T10:00:00Z', [set('press', { weight_kg: 25 })]),
    session('s2', '2026-07-14T10:00:00Z', [set('press', { weight_kg: 27.5 })]),
    session('s3', '2026-07-18T10:00:00Z', [set('press', { weight_kg: 30 })]),
  ]);

  it('returns the most recent showing strictly before the session', () => {
    const perf = lastPerfBefore(history, 'press', { id: 's3', started_at: '2026-07-18T10:00:00Z' });
    expect(perf?.sessionId).toBe('s2');
  });

  it('never cites a future session when browsing a past day', () => {
    const perf = lastPerfBefore(history, 'press', { id: 's1', started_at: '2026-07-10T10:00:00Z' });
    expect(perf).toBeNull();
  });

  it('returns null for an exercise with no history', () => {
    expect(lastPerfBefore(history, 'squat', { id: 's3', started_at: '2026-07-18T10:00:00Z' })).toBeNull();
  });
});

describe('lastTimeHint', () => {
  const perfAt = (rpe: number | null, weightKg: number | null = 25) =>
    buildExerciseHistory([
      session('s1', '2026-07-10T10:00:00Z', [set('press', { sets: 2, reps: 10, weight_kg: weightKg, rpe })]),
    ]).get('press')![0]!;

  it('suggests adding weight when the last showing was easy (rpe ≤ 6)', () => {
    expect(lastTimeHint(perfAt(6))).toBe('Last time (10 Jul): 2×10×25 kg @ RPE 6 — felt easy → try 27.5 kg');
  });

  it('suggests extra reps for easy bodyweight work', () => {
    expect(lastTimeHint(perfAt(5, null))).toContain('try +2 reps');
  });

  it('confirms the zone at rpe 7-8', () => {
    expect(lastTimeHint(perfAt(8))).toContain('right zone');
  });

  it('advises holding at rpe 9+', () => {
    expect(lastTimeHint(perfAt(10))).toContain('near max');
  });

  it('shows plain numbers with no advice when rpe was never logged', () => {
    expect(lastTimeHint(perfAt(null))).toBe('Last time (10 Jul): 2×10×25 kg');
  });
});
