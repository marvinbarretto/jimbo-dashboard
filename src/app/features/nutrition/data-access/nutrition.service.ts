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
  /** Set by the LLM for alcoholic drinks; absent on entries logged before the field. */
  alcoholic?: boolean;
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
  /** EAN/UPC when the entry was captured by scanning; null otherwise. */
  barcode?: string | null;
}

export interface FoodDailyRow {
  date: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  count: number;
}

/** A frequently-logged food + its latest macros — the self-growing catalog. */
export interface FrequentFood {
  label: string;
  est_kcal: number | null;
  est_protein_g: number | null;
  est_carbs_g: number | null;
  est_fat_g: number | null;
  count: number;
}

// ── Barcode capture ───────────────────────────────────────────────
// Decoding happens on the device; the API takes the digits and resolves them
// against Open Food Facts. Portion is grams, or servings of the manufacturer
// serving size — 1 serving by default, falling back to 100 g when the product
// doesn't state one.

export interface BarcodeProduct {
  barcode: string;
  label: string;
  brand: string | null;
  /** null when the product exists but Open Food Facts has no nutrition data. */
  per100g: { kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null;
  serving_g: number | null;
  kind: 'food' | 'drink';
  alcoholic: boolean;
}

export interface BarcodeResolution {
  barcode: string;
  product: BarcodeProduct;
  items: FoodItem[];
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  /** 'llm_estimate' means the product was found but carried no macros. */
  macro_source: 'openfoodfacts' | 'llm_estimate';
}

/** How much of the scanned product was consumed. `grams` wins over `servings`. */
export interface BarcodePortion {
  servings?: number;
  grams?: number;
}

export interface SupplementLogEntry {
  id: number;
  taken_at: string;
  supplement_id: string;
  name: string;
  type: 'protein' | 'creatine' | 'vitamin' | 'other';
  dosage: number;
  dose_unit: string;
  source: string;
  nudge_id: number | null;
  notes: string | null;
}

/** Manual food create — caller owns macros; `logged_at` backdates. */
export interface FoodManualInput {
  raw_text: string;
  logged_at?: string;
  est_kcal?: number | null;
  est_protein_g?: number | null;
  est_carbs_g?: number | null;
  est_fat_g?: number | null;
  notes?: string | null;
  /** When true and no macros supplied, the server fills them via the LLM estimator. */
  estimate?: boolean;
}
export type FoodPatch = Partial<FoodManualInput>;

/** Manual supplement intake — `taken_at` backdates. */
export interface SupplementManualInput {
  supplement_id: string;
  dosage: number;
  taken_at?: string;
  notes?: string | null;
}
export type SupplementPatch = Partial<Omit<SupplementManualInput, 'supplement_id'>> & {
  supplement_id?: string;
};

@Injectable({ providedIn: 'root' })
export class NutritionService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  // Entries newest-first. `date` (YYYY-MM-DD) is a London calendar day;
  // `from`/`to` (YYYY-MM-DD, inclusive) an explicit range — used by
  // period-scoped week/month views that can show past periods; otherwise a
  // trailing `days` window or the most recent `limit` rows.
  list(
    opts: { date?: string; from?: string; to?: string; days?: number; limit?: number } = {},
  ): Observable<{ items: FoodLogEntry[] }> {
    const params = new URLSearchParams();
    if (opts.date) params.set('date', opts.date);
    if (opts.from && opts.to) {
      params.set('from', opts.from);
      params.set('to', opts.to);
    } else if (opts.days) {
      params.set('days', String(opts.days));
    }
    if (opts.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return this.http.get<{ items: FoodLogEntry[] }>(
      `${this.base}/api/coach/food-log${qs ? `?${qs}` : ''}`,
    );
  }

  // Per-day macro totals bucketed by London calendar day. Only days with
  // entries are returned — callers fill a continuous axis. `from`/`to`
  // (YYYY-MM-DD, inclusive) an explicit range; otherwise a trailing `days`
  // window (default 14).
  daily(opts: { days?: number; from?: string; to?: string } = {}): Observable<{ days: FoodDailyRow[] }> {
    const params = new URLSearchParams();
    if (opts.from && opts.to) {
      params.set('from', opts.from);
      params.set('to', opts.to);
    } else {
      params.set('days', String(opts.days ?? 14));
    }
    return this.http.get<{ days: FoodDailyRow[] }>(
      `${this.base}/api/coach/food-log/daily?${params.toString()}`,
    );
  }

  // Most-logged foods + latest macros — the self-growing autocomplete catalog.
  frequentFoods(limit = 40): Observable<{ items: FrequentFood[] }> {
    return this.http.get<{ items: FrequentFood[] }>(
      `${this.base}/api/coach/food-log/frequent?limit=${limit}`,
    );
  }

  // Supplement intakes, newest-first. Same date/from/to/days/limit semantics
  // as list(). Joined server-side to the catalog so each entry carries name +
  // dose_unit.
  supplementLog(
    opts: { date?: string; from?: string; to?: string; days?: number; limit?: number } = {},
  ): Observable<{ items: SupplementLogEntry[] }> {
    const params = new URLSearchParams();
    if (opts.date) params.set('date', opts.date);
    if (opts.from && opts.to) {
      params.set('from', opts.from);
      params.set('to', opts.to);
    } else if (opts.days) {
      params.set('days', String(opts.days));
    }
    if (opts.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return this.http.get<{ items: SupplementLogEntry[] }>(
      `${this.base}/api/coach/supplement-log${qs ? `?${qs}` : ''}`,
    );
  }

  // ── Writes (CRUD) ──────────────────────────────────────────────
  // Manual create bypasses the LLM estimator and accepts a backdated timestamp,
  // so the dashboard can add/correct entries that weren't captured in the moment.

  createFood(body: FoodManualInput): Observable<FoodLogEntry> {
    return this.http.post<FoodLogEntry>(`${this.base}/api/coach/food-log/manual`, body);
  }

  // Preview a scanned code without persisting, so the confirm step can show the
  // product and its macros before anything lands in the log. 404 = unknown
  // product, which the caller offers as a free-text fallback rather than an error.
  resolveBarcode(code: string, portion: BarcodePortion = {}): Observable<BarcodeResolution> {
    const params = new URLSearchParams();
    if (portion.grams != null) params.set('grams', String(portion.grams));
    else if (portion.servings != null) params.set('servings', String(portion.servings));
    const qs = params.toString();
    return this.http.get<BarcodeResolution>(
      `${this.base}/api/coach/food-log/barcode/${encodeURIComponent(code)}${qs ? `?${qs}` : ''}`,
    );
  }

  // Resolve + persist in one call. Re-resolves server-side rather than trusting
  // the previewed macros, so the entry can't be forged from the client.
  logBarcode(
    code: string,
    portion: BarcodePortion = {},
    opts: { logged_at?: string; notes?: string | null } = {},
  ): Observable<FoodLogEntry> {
    return this.http.post<FoodLogEntry>(`${this.base}/api/coach/food-log/barcode`, {
      barcode: code,
      ...(portion.grams != null ? { grams: portion.grams } : {}),
      ...(portion.grams == null && portion.servings != null ? { servings: portion.servings } : {}),
      ...(opts.logged_at ? { logged_at: opts.logged_at } : {}),
      ...(opts.notes != null ? { notes: opts.notes } : {}),
    });
  }

  patchFood(id: string, changes: FoodPatch): Observable<FoodLogEntry> {
    return this.http.patch<FoodLogEntry>(`${this.base}/api/coach/food-log/${id}`, changes);
  }

  deleteFood(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/coach/food-log/${id}`);
  }

  createSupplement(body: SupplementManualInput): Observable<SupplementLogEntry> {
    return this.http.post<SupplementLogEntry>(`${this.base}/api/coach/supplement-log/manual`, body);
  }

  patchSupplement(id: number, changes: SupplementPatch): Observable<SupplementLogEntry> {
    return this.http.patch<SupplementLogEntry>(`${this.base}/api/coach/supplement-log/${id}`, changes);
  }

  deleteSupplement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/coach/supplement-log/${id}`);
  }
}
