import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface FoodItem {
  label: string;
  kind: 'food' | 'drink';
  qty: number;
  unit?: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FoodLogEntry {
  id: string;
  logged_at: string;
  raw_text: string;
  items: FoodItem[];
  est_kcal: number | null;
  est_protein_g: number | null;
  est_carbs_g: number | null;
  est_fat_g: number | null;
  source: string;
}

export interface FoodDailyRow {
  date: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class NutritionService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  // Entries newest-first. `date` (YYYY-MM-DD) is a London calendar day;
  // otherwise a trailing `days` window or the most recent `limit` rows.
  list(opts: { date?: string; days?: number; limit?: number } = {}): Observable<{ items: FoodLogEntry[] }> {
    const params = new URLSearchParams();
    if (opts.date) params.set('date', opts.date);
    if (opts.days) params.set('days', String(opts.days));
    if (opts.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return this.http.get<{ items: FoodLogEntry[] }>(
      `${this.base}/api/coach/food-log${qs ? `?${qs}` : ''}`,
    );
  }

  // Per-day macro totals bucketed by London calendar day. Only days with
  // entries are returned — callers fill a continuous axis.
  daily(opts: { days?: number } = {}): Observable<{ days: FoodDailyRow[] }> {
    const params = new URLSearchParams();
    params.set('days', String(opts.days ?? 14));
    return this.http.get<{ days: FoodDailyRow[] }>(
      `${this.base}/api/coach/food-log/daily?${params.toString()}`,
    );
  }
}
