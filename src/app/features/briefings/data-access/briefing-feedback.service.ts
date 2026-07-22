import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type FeedbackVerdict = 'hit' | 'miss';

export interface BriefingFeedbackEntry {
  section: string;
  item_index: number | null;
  verdict: FeedbackVerdict;
}

// Per-item hit/miss feedback on a briefing. Granular by design: the overall
// briefing rating is DERIVED from these, so the pipeline learns exactly which
// sections/items land rather than one mushy per-day grade.
@Injectable({ providedIn: 'root' })
export class BriefingFeedbackService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  // Keyed `${briefingId}|${section}|${item_index ?? 's'}` → verdict.
  private readonly _verdicts = signal<Record<string, FeedbackVerdict>>({});
  readonly verdicts = this._verdicts.asReadonly();

  private key(briefingId: number, section: string, itemIndex: number | null): string {
    return `${briefingId}|${section}|${itemIndex ?? 's'}`;
  }

  verdictFor(briefingId: number, section: string, itemIndex: number | null): FeedbackVerdict | null {
    return this._verdicts()[this.key(briefingId, section, itemIndex)] ?? null;
  }

  async load(briefingId: number): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ feedback: BriefingFeedbackEntry[] }>(
        `${this.base}/api/briefing/${briefingId}/feedback`,
      ));
      this._verdicts.update((m) => {
        const next = { ...m };
        for (const f of res.feedback) next[this.key(briefingId, f.section, f.item_index)] = f.verdict;
        return next;
      });
    } catch {
      // Feedback is an enhancement — a failed load never blocks the report.
    }
  }

  // Optimistic: paint the verdict immediately, roll back on failure.
  async rate(briefingId: number, section: string, itemIndex: number | null, verdict: FeedbackVerdict): Promise<void> {
    const k = this.key(briefingId, section, itemIndex);
    const previous = this._verdicts()[k] ?? null;
    this._verdicts.update((m) => ({ ...m, [k]: verdict }));
    try {
      await firstValueFrom(this.http.put(`${this.base}/api/briefing/${briefingId}/feedback`, {
        section,
        item_index: itemIndex,
        verdict,
      }));
    } catch {
      this._verdicts.update((m) => {
        const next = { ...m };
        if (previous) next[k] = previous; else delete next[k];
        return next;
      });
    }
  }
}
