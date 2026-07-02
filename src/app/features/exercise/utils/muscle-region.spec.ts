import { describe, expect, it } from 'vitest';
import { bodyPartBreakdown, lastTrainedByRegion, regionForExercise, type ExerciseMeta } from './muscle-region';
import type { SessionDetailed } from '../data-access/exercise.service';

const chest: ExerciseMeta = { primary_muscle_group: 1, equipment_type: 'machine' };
const biceps: ExerciseMeta = { primary_muscle_group: 4, equipment_type: 'free_weight' };
const quads: ExerciseMeta = { primary_muscle_group: 6, equipment_type: 'machine' };
const treadmill: ExerciseMeta = { primary_muscle_group: null, equipment_type: 'cardio' };
const unclassified: ExerciseMeta = { primary_muscle_group: null, equipment_type: null };

function set(exerciseId: string, sets = 1): SessionDetailed['sets'][number] {
  return {
    id: `set_${exerciseId}`, session_id: 's', exercise_id: exerciseId, exercise_name: exerciseId,
    set_number: 1, sets, reps: 10, weight_kg: 20, rpe: null, duration_s: null, notes: null, created_at: '',
  };
}

function cardio(exerciseId: string): SessionDetailed['cardio'][number] {
  return {
    id: `cardio_${exerciseId}`, session_id: 's', exercise_id: exerciseId, exercise_name: exerciseId,
    duration_s: 600, distance_km: null, avg_heart_rate: null, notes: null, created_at: '',
  };
}

function session(startedAt: string, sets: SessionDetailed['sets'], cardioEntries: SessionDetailed['cardio'] = []): SessionDetailed {
  return { id: `sess_${startedAt}`, started_at: startedAt, ended_at: null, pre_energy: null, notes: null, vault_note_id: null, created_at: startedAt, sets, cardio: cardioEntries };
}

describe('regionForExercise', () => {
  it('maps a primary muscle group to its region', () => {
    expect(regionForExercise(chest)).toBe('chest');
    expect(regionForExercise(biceps)).toBe('arms');
    expect(regionForExercise(quads)).toBe('legs');
  });

  it('treats equipment_type cardio as cardio regardless of muscle group', () => {
    expect(regionForExercise(treadmill)).toBe('cardio');
  });

  it('falls back to other when unclassified or missing', () => {
    expect(regionForExercise(unclassified)).toBe('other');
    expect(regionForExercise(undefined)).toBe('other');
  });
});

describe('bodyPartBreakdown', () => {
  it('sums set counts per region across sessions', () => {
    const exerciseIndex = new Map([['ex_chest', chest], ['ex_biceps', biceps]]);
    const sessions = [
      session('2026-06-25T10:00:00Z', [set('ex_chest', 3), set('ex_biceps', 2)]),
      session('2026-06-26T10:00:00Z', [set('ex_chest', 1)]),
    ];
    const result = bodyPartBreakdown(sessions, exerciseIndex);
    expect(result).toEqual([
      { region: 'chest', label: 'Chest', count: 4 },
      { region: 'arms', label: 'Arms', count: 2 },
    ]);
  });

  it('buckets cardio table rows as cardio regardless of catalogue lookup', () => {
    const exerciseIndex = new Map<string, ExerciseMeta>();
    const sessions = [session('2026-06-25T10:00:00Z', [], [cardio('ex_unknown')])];
    expect(bodyPartBreakdown(sessions, exerciseIndex)).toEqual([{ region: 'cardio', label: 'Cardio', count: 1 }]);
  });

  it('appends an other bucket only when something is actually unclassified', () => {
    const exerciseIndex = new Map([['ex_mystery', unclassified]]);
    const withUnclassified = bodyPartBreakdown([session('2026-06-25T10:00:00Z', [set('ex_mystery')])], exerciseIndex);
    expect(withUnclassified).toEqual([{ region: 'other', label: 'Other', count: 1 }]);

    const withoutAny = bodyPartBreakdown([session('2026-06-25T10:00:00Z', [])], new Map());
    expect(withoutAny).toEqual([]);
  });

  it('defaults sets to 1 when a row omits its sets count', () => {
    const exerciseIndex = new Map([['ex_chest', chest]]);
    const row = { ...set('ex_chest'), sets: undefined as unknown as number };
    expect(bodyPartBreakdown([session('2026-06-25T10:00:00Z', [row])], exerciseIndex)).toEqual([
      { region: 'chest', label: 'Chest', count: 1 },
    ]);
  });
});

describe('lastTrainedByRegion', () => {
  const exerciseIndex = new Map([['ex_chest', chest], ['ex_quads', quads]]);

  it('reports days since the most recent session touching each region', () => {
    const sessions = [
      session('2026-06-30T10:00:00Z', [set('ex_chest')]),
      session('2026-06-20T10:00:00Z', [set('ex_quads')]),
    ];
    const coverage = lastTrainedByRegion(sessions, exerciseIndex, '2026-07-02');
    const byRegion = new Map(coverage.map((c) => [c.region, c.daysSince]));
    expect(byRegion.get('chest')).toBe(2);
    expect(byRegion.get('legs')).toBe(12);
  });

  it('reports null for a region never touched in the loaded window', () => {
    const coverage = lastTrainedByRegion([session('2026-06-30T10:00:00Z', [set('ex_chest')])], exerciseIndex, '2026-07-02');
    expect(coverage.find((c) => c.region === 'legs')?.daysSince).toBeNull();
    expect(coverage.find((c) => c.region === 'arms')?.daysSince).toBeNull();
  });

  it('keeps the most recent date across multiple sessions for the same region', () => {
    const sessions = [
      session('2026-06-25T10:00:00Z', [set('ex_chest')]),
      session('2026-06-30T10:00:00Z', [set('ex_chest')]),
    ];
    const coverage = lastTrainedByRegion(sessions, exerciseIndex, '2026-07-02');
    expect(coverage.find((c) => c.region === 'chest')?.daysSince).toBe(2);
  });

  it('counts a logged cardio row as covering the cardio region', () => {
    const sessions = [session('2026-06-30T10:00:00Z', [], [cardio('ex_unknown')])];
    const coverage = lastTrainedByRegion(sessions, new Map(), '2026-07-02');
    expect(coverage.find((c) => c.region === 'cardio')?.daysSince).toBe(2);
  });
});
