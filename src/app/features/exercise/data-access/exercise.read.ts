// Type-narrowed read surface over ExerciseService.
//
// Why this exists. The path-based ESLint rule (VAULT-COMMANDS-001) blocks
// runtime imports of `*.service` outside the seam directories. Leaf
// components that only read can `inject(EXERCISE_READ)` and import THIS
// file — the path doesn't end in `*.service`, so the rule allows it.
// See docs/architecture/lint-rules.md.
//
// Unlike NutritionService, ExerciseService is genuinely read/write: it owns
// createSession/patchSet/deleteCardio and the rest of the gym CRUD surface.
// That is exactly why the narrowing matters here — a consumer of this token
// cannot reach a mutation even by accident, because the type doesn't have
// one. Mutations belong behind the command layer; never widen this
// interface to include them.
//
// The token uses `factory: () => inject(ExerciseService)` so it never
// creates a second instance — the same singleton backs both surfaces.

import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ExerciseService,
  type SessionDetailed,
  type GymDailyRow,
  type GymActivityRow,
  type ExerciseCatalogItem,
} from './exercise.service';

/** Read-only view of the exercise data source: sessions, rollups, catalogue. */
export interface ExerciseRead {
  listDetailed(
    opts?: { date?: string; from?: string; to?: string; days?: number; limit?: number },
  ): Observable<{ items: SessionDetailed[] }>;
  daily(opts?: { days?: number; from?: string; to?: string }): Observable<{ days: GymDailyRow[] }>;
  activityDaily(opts?: { days?: number; from?: string; to?: string }): Observable<{ days: GymActivityRow[] }>;
  listExercises(q?: string): Observable<ExerciseCatalogItem[]>;
}

/**
 * DI token for the read surface. Components that only read should
 * `inject(EXERCISE_READ)` rather than `inject(ExerciseService)` — same
 * singleton, lint-clean import path, no reachable mutations.
 */
export const EXERCISE_READ = new InjectionToken<ExerciseRead>('EXERCISE_READ', {
  providedIn: 'root',
  factory: () => inject(ExerciseService),
});
