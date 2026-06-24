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
}
