// Type-narrowed read surface over NutritionService.
//
// Why this exists. The path-based ESLint rule (VAULT-COMMANDS-001) blocks
// runtime imports of `*.service` outside the seam directories (commands/,
// data-access/, containers/, dialog/, tests). A leaf component that only
// reads can `inject(NUTRITION_READ)` instead of `inject(NutritionService)`
// and import THIS file — the path doesn't end in `*.service`, so the rule
// allows it everywhere.
//
// NutritionService is read-only today (all methods are HTTP GETs), so the
// surface mirrors it whole. If a mutation method ever lands on the service,
// it must NOT be added here — it belongs behind the command layer.
//
// The token uses `factory: () => inject(NutritionService)` so it never
// creates a second instance — the same singleton backs both surfaces.

import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  NutritionService,
  type FoodLogEntry,
  type FoodDailyRow,
  type SupplementLogEntry,
} from './nutrition.service';

/** Read-only view of the nutrition data source: lists + daily rollups. */
export interface NutritionRead {
  list(opts?: { date?: string; days?: number; limit?: number }): Observable<{ items: FoodLogEntry[] }>;
  daily(opts?: { days?: number; from?: string; to?: string }): Observable<{ days: FoodDailyRow[] }>;
  supplementLog(
    opts?: { date?: string; from?: string; to?: string; days?: number; limit?: number },
  ): Observable<{ items: SupplementLogEntry[] }>;
}

/**
 * DI token for the read surface. Components that only read should
 * `inject(NUTRITION_READ)` rather than `inject(NutritionService)` — same
 * singleton, lint-clean import path.
 */
export const NUTRITION_READ = new InjectionToken<NutritionRead>('NUTRITION_READ', {
  providedIn: 'root',
  factory: () => inject(NutritionService),
});
