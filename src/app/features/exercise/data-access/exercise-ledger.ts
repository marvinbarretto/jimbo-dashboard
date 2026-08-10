import { type TrackerDraft, type TrackerPatch } from '@shared/components/tracker/tracker.types';
import { type ToastService } from '@shared/components/toast/toast.service';
import {
  type CardioPatch,
  type ExerciseService,
  type SessionDetailed,
  type SetPatch,
} from './exercise.service';

/**
 * The write side of a session's children (sets + cardio), shared by the
 * desktop period page and the phone Train tab — same pattern as the nutrition
 * `createLedgerWriters`. Session-level writes stay per-surface: the desktop
 * backdates day-group adds, the phone does start/finish.
 */

export function splitChildId(id: string): { kind: 'set' | 'cardio'; id: string } {
  const [kind, ...rest] = id.split(':');
  return { kind: kind === 'cardio' ? 'cardio' : 'set', id: rest.join(':') };
}

export function createSessionChildWriters(deps: {
  service: ExerciseService;
  toast: ToastService;
  /** Current sessions in view — set_number derives from the target session's row count. */
  sessions: () => readonly SessionDetailed[];
  /** Resolve a typed exercise name to a catalogue id, or undefined to trigger create. */
  resolveExercise: (name: string) => string | undefined;
  reload: () => void;
}) {
  const { service, toast, sessions, resolveExercise, reload } = deps;

  function addSet(sessionId: string, exerciseId: string, draft: TrackerDraft): void {
    const session = sessions().find((s) => s.id === sessionId);
    const setNumber = (session?.sets.length ?? 0) + 1;
    const rawRpe = draft.values['rpe'];
    const rpe = rawRpe != null && rawRpe >= 1 && rawRpe <= 10 ? Math.round(rawRpe) : undefined;
    service
      .createSet(sessionId, {
        exercise_id: exerciseId,
        set_number: setNumber,
        sets: draft.values['sets'] ?? undefined,
        reps: draft.values['reps'] ?? undefined,
        weight_kg: draft.values['weight_kg'] ?? undefined,
        rpe,
      })
      .subscribe({ next: () => reload(), error: () => toast.error('Could not add set') });
  }

  function addCardio(sessionId: string, exerciseId: string, draft: TrackerDraft): void {
    const durationMin = draft.values['duration_min'];
    service
      .createCardio(sessionId, {
        exercise_id: exerciseId,
        duration_s: durationMin == null ? undefined : durationMin * 60,
        distance_km: draft.values['distance_km'] ?? undefined,
        avg_heart_rate: draft.values['hr'] ?? undefined,
      })
      .subscribe({ next: () => reload(), error: () => toast.error('Could not add cardio') });
  }

  // Get-or-create wrapper: an unrecognised name becomes a new catalogue row,
  // whose id feeds straight into the set/cardio that triggered it.
  function withExercise(
    e: { sessionId: string; draft: TrackerDraft },
    then: (sessionId: string, exerciseId: string, draft: TrackerDraft) => void,
  ): void {
    const name = e.draft.label.trim();
    const existing = e.draft.ref ?? resolveExercise(name);
    if (existing) {
      then(e.sessionId, existing, e.draft);
      return;
    }
    if (!name) return;
    service.createExercise(name).subscribe({
      next: (ex) => then(e.sessionId, ex.id, e.draft),
      error: () => toast.error('Could not create exercise'),
    });
  }

  return {
    addSet(e: { sessionId: string; draft: TrackerDraft }): void {
      withExercise(e, addSet);
    },

    addCardio(e: { sessionId: string; draft: TrackerDraft }): void {
      withExercise(e, addCardio);
    },

    patch(p: TrackerPatch): void {
      const { kind, id } = splitChildId(p.id);
      const v = p.changes.values ?? {};
      if (kind === 'set') {
        const patch: SetPatch = {};
        if ('sets' in v) patch.sets = v['sets'] ?? undefined;
        if ('reps' in v) patch.reps = v['reps'];
        if ('weight_kg' in v) patch.weight_kg = v['weight_kg'];
        if ('rpe' in v) patch.rpe = v['rpe'];
        service.patchSet(id, patch).subscribe({
          next: () => reload(),
          error: () => toast.error('Could not save set'),
        });
      } else {
        const patch: CardioPatch = {};
        if ('duration_min' in v) patch.duration_s = v['duration_min'] === null ? null : (v['duration_min'] as number) * 60;
        if ('distance_km' in v) patch.distance_km = v['distance_km'];
        if ('hr' in v) patch.avg_heart_rate = v['hr'];
        service.patchCardio(id, patch).subscribe({
          next: () => reload(),
          error: () => toast.error('Could not save cardio'),
        });
      }
    },

    remove(entryId: string): void {
      const { kind, id } = splitChildId(entryId);
      const req = kind === 'set' ? service.deleteSet(id) : service.deleteCardio(id);
      req.subscribe({ next: () => reload(), error: () => toast.error('Could not delete') });
    },
  };
}
