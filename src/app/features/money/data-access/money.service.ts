// Reads live budget state from jimbo-api: GET /api/money/summary (position,
// planned runway, attention counts and the assumptions the numbers were
// computed under) and GET /api/money/categories.
//
// jimbo-api is the reader of record, not YNAB directly: YNAB rate-limits at
// 200 requests/hour per token, so every consumer talking to it competes for the
// same bucket. See jimbo-api/docs/modules/money.md.

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import type { MoneyAggregates, MoneyCategory, MoneyCategoryList, MoneySummary } from './money';

@Injectable({ providedIn: 'root' })
export class MoneyService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.dashboardApiUrl}/api/money`;

  private readonly _summary = signal<MoneySummary | null>(null);
  private readonly _categories = signal<MoneyCategory[]>([]);
  private readonly _aggregates = signal<MoneyAggregates | null>(null);
  private readonly _aggregatesMissing = signal(false);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  readonly summary = this._summary.asReadonly();
  readonly categories = this._categories.asReadonly();
  readonly aggregates = this._aggregates.asReadonly();
  /** True only for a 404 — the pipeline has never published, which is a real
   * state with its own empty message, not a failure to report. */
  readonly aggregatesMissing = this._aggregatesMissing.asReadonly();
  readonly isLoading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() { this.load(); }

  /**
   * `fresh` bypasses the API's 15-minute cache, which costs one of YNAB's 200
   * hourly requests — so it is the refresh button's job, never page load's.
   */
  private load(fresh = false): void {
    const q = fresh ? '?fresh=1' : '';

    this.http.get<MoneySummary>(`${this.base}/summary${q}`).subscribe({
      next: res => {
        this._summary.set(res);
        this._loading.set(false);
      },
      error: err => {
        // 503 means the server has no YNAB token configured — a setup problem,
        // not a transient one, so say which rather than "failed to load".
        this._error.set(
          err?.status === 503
            ? 'jimbo-api has no YNAB token configured (YNAB_TOKEN).'
            : err?.status === 502
              ? 'YNAB rejected the request — it may be rate-limited (200/hour).'
              : (err?.message ?? 'failed to load money summary'),
        );
        this._loading.set(false);
      },
    });

    // Categories are secondary: a failure here must not blank the headline
    // numbers, so it deliberately does not set the page-level error.
    this.http.get<MoneyCategoryList>(`${this.base}/categories${q}`).subscribe({
      next: res => this._categories.set(res.categories),
      error: () => this._categories.set([]),
    });

    // The measured series, pushed from the M4 pipeline. Not affected by
    // `fresh`, which is a YNAB cache-bypass and means nothing here — this data
    // changes only when publish.py runs.
    this.http.get<MoneyAggregates>(`${this.base}/aggregates`).subscribe({
      next: res => {
        this._aggregates.set(res);
        this._aggregatesMissing.set(false);
      },
      error: err => {
        this._aggregates.set(null);
        this._aggregatesMissing.set(err?.status === 404);
      },
    });
  }

  refresh(): void {
    this._loading.set(true);
    this._error.set(null);
    this.load(true);
  }
}
