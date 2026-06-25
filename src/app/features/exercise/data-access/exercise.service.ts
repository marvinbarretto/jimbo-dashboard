import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Mirrors the jimbo-api gym read shapes (src/schemas/gym.ts). Strength sets and
// cardio carry the resolved exercise name so the dashboard can render raw
// entries without a second catalogue fetch.

export interface SetDetailed {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string | null;
  set_number: number;
  sets: number; // how many identical sets this row represents (e.g. 2 = "2 × 10 × 25kg")
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
  duration_s: number | null;
  notes: string | null;
  created_at: string;
}

export interface CardioDetailed {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string | null;
  duration_s: number | null;
  distance_km: number | null;
  avg_heart_rate: number | null;
  notes: string | null;
  created_at: string;
}

export interface SessionDetailed {
  id: string;
  started_at: string;
  ended_at: string | null;
  pre_energy: number | null;
  notes: string | null;
  vault_note_id: string | null;
  created_at: string;
  sets: SetDetailed[];
  cardio: CardioDetailed[];
}

export interface GymDailyRow {
  date: string;
  sessions: number;
  sets: number;
  total_reps: number;
  volume_kg: number;
  cardio_count: number;
  cardio_duration_s: number;
  cardio_distance_km: number;
}

// Passive daily activity (steps/distance/calories) from Health Connect —
// separate from deliberate workouts above.
export interface GymActivityRow {
  date: string;
  steps: number;
  distance_km: number;
  kcal: number;
}

// Catalogue entry for the set/cardio exercise picker.
export interface ExerciseCatalogItem {
  id: string;
  name: string;
}

// ── Write inputs (mirror jimbo-api gym write bodies) ──────────────
export interface SessionCreate {
  started_at?: string;
  pre_energy?: number;
  notes?: string;
}
export type SessionPatch = Partial<{
  started_at: string;
  ended_at: string | null;
  pre_energy: number | null;
  notes: string | null;
}>;

export interface SetCreate {
  exercise_id: string;
  set_number: number;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  rpe?: number;
  duration_s?: number;
  notes?: string;
}
export type SetPatch = Partial<{
  exercise_id: string;
  set_number: number;
  sets: number;
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
  duration_s: number | null;
  notes: string | null;
}>;

export interface CardioCreate {
  exercise_id: string;
  duration_s?: number;
  distance_km?: number;
  avg_heart_rate?: number;
  notes?: string;
}
export type CardioPatch = Partial<{
  exercise_id: string;
  duration_s: number | null;
  distance_km: number | null;
  avg_heart_rate: number | null;
  notes: string | null;
}>;

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  // Sessions with their sets + cardio. `date` (YYYY-MM-DD) is a London calendar
  // day; otherwise a trailing `days` window, else the most recent `limit` rows.
  listDetailed(opts: { date?: string; days?: number; limit?: number } = {}): Observable<{ items: SessionDetailed[] }> {
    const params = new URLSearchParams();
    if (opts.date) params.set('date', opts.date);
    if (opts.days) params.set('days', String(opts.days));
    if (opts.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return this.http.get<{ items: SessionDetailed[] }>(
      `${this.base}/api/gym/sessions/detailed${qs ? `?${qs}` : ''}`,
    );
  }

  // Per-London-day rollup. `from`/`to` (YYYY-MM-DD, inclusive) select an
  // explicit range — used by the journal week/month pages which can show past
  // periods; otherwise a trailing `days` window.
  daily(opts: { days?: number; from?: string; to?: string } = {}): Observable<{ days: GymDailyRow[] }> {
    const params = new URLSearchParams();
    if (opts.from && opts.to) {
      params.set('from', opts.from);
      params.set('to', opts.to);
    } else {
      params.set('days', String(opts.days ?? 14));
    }
    return this.http.get<{ days: GymDailyRow[] }>(
      `${this.base}/api/gym/sessions/daily?${params.toString()}`,
    );
  }

  // Passive daily activity (steps/distance/calories), same windowing as daily().
  activityDaily(opts: { days?: number; from?: string; to?: string } = {}): Observable<{ days: GymActivityRow[] }> {
    const params = new URLSearchParams();
    if (opts.from && opts.to) {
      params.set('from', opts.from);
      params.set('to', opts.to);
    } else {
      params.set('days', String(opts.days ?? 14));
    }
    return this.http.get<{ days: GymActivityRow[] }>(
      `${this.base}/api/gym/activity/daily?${params.toString()}`,
    );
  }

  // Exercise catalogue for the set/cardio picker (fuzzy name search optional).
  listExercises(q?: string): Observable<ExerciseCatalogItem[]> {
    const qs = q ? `?q=${encodeURIComponent(q)}&limit=100` : '?limit=100';
    return this.http.get<ExerciseCatalogItem[]>(`${this.base}/api/gym/exercises${qs}`);
  }

  // ── Writes (CRUD) ──────────────────────────────────────────────
  createSession(body: SessionCreate): Observable<SessionDetailed> {
    return this.http.post<SessionDetailed>(`${this.base}/api/gym/sessions`, body);
  }
  patchSession(id: string, changes: SessionPatch): Observable<SessionDetailed> {
    return this.http.patch<SessionDetailed>(`${this.base}/api/gym/sessions/${id}`, changes);
  }
  deleteSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/gym/sessions/${id}`);
  }

  createSet(sessionId: string, body: SetCreate): Observable<SetDetailed> {
    return this.http.post<SetDetailed>(`${this.base}/api/gym/sessions/${sessionId}/sets`, body);
  }
  patchSet(id: string, changes: SetPatch): Observable<SetDetailed> {
    return this.http.patch<SetDetailed>(`${this.base}/api/gym/sets/${id}`, changes);
  }
  deleteSet(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/gym/sets/${id}`);
  }

  createCardio(sessionId: string, body: CardioCreate): Observable<CardioDetailed> {
    return this.http.post<CardioDetailed>(`${this.base}/api/gym/sessions/${sessionId}/cardio`, body);
  }
  patchCardio(id: string, changes: CardioPatch): Observable<CardioDetailed> {
    return this.http.patch<CardioDetailed>(`${this.base}/api/gym/cardio/${id}`, changes);
  }
  deleteCardio(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/gym/cardio/${id}`);
  }
}
