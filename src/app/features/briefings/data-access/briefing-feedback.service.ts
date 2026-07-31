import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type FeedbackVerdict = 'hit' | 'miss';

export interface BriefingFeedbackEntry {
  section: string;
  item_index: number | null;
  verdict: FeedbackVerdict;
  note: string | null;
}

interface FeedbackState {
  verdict: FeedbackVerdict;
  note: string | null;
}

/**
 * Which note a rating should end up with.
 *
 * A note is a miss's steer — the miss dialog writes `[reason] free text` and
 * the briefing skill aggregates those reason tags to decide what to change
 * about a section. Nothing asks for one on a hit.
 *
 * Carrying the stored note forward is required for a *miss*, because the
 * server upsert overwrites `note` on every PUT: re-pressing ▼ and saving
 * without retyping must not blank the reason. But carrying it across a change
 * of mind (▼ then ▲) left the hit wearing the miss's tag, which reads back as
 * feedback that was never given. So the carry-forward is scoped to misses.
 *
 * An explicit note still wins either way, so a hit *can* be given one
 * deliberately — it just never inherits one.
 */
export function resolveNote(
  verdict: FeedbackVerdict,
  supplied: string | undefined,
  stored: string | null,
): string | null {
  if (supplied !== undefined) return supplied.trim() || null;
  return verdict === 'miss' ? stored : null;
}

// Per-item hit/miss feedback on a briefing. Granular by design: the overall
// briefing rating is DERIVED from these, so the pipeline learns exactly which
// sections/items land rather than one mushy per-day grade. A miss can carry a
// free-text note — the "why" the generator skill reads back before authoring.
@Injectable({ providedIn: 'root' })
export class BriefingFeedbackService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  // Keyed `${briefingId}|${section}|${item_index ?? 's'}`.
  private readonly _entries = signal<Record<string, FeedbackState>>({});
  readonly entries = this._entries.asReadonly();

  private key(briefingId: number, section: string, itemIndex: number | null): string {
    return `${briefingId}|${section}|${itemIndex ?? 's'}`;
  }

  verdictFor(briefingId: number, section: string, itemIndex: number | null): FeedbackVerdict | null {
    return this._entries()[this.key(briefingId, section, itemIndex)]?.verdict ?? null;
  }

  noteFor(briefingId: number, section: string, itemIndex: number | null): string | null {
    return this._entries()[this.key(briefingId, section, itemIndex)]?.note ?? null;
  }

  async load(briefingId: number): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ feedback: BriefingFeedbackEntry[] }>(
        `${this.base}/api/briefing/${briefingId}/feedback`,
      ));
      this._entries.update((m) => {
        const next = { ...m };
        for (const f of res.feedback) {
          next[this.key(briefingId, f.section, f.item_index)] = { verdict: f.verdict, note: f.note };
        }
        return next;
      });
    } catch {
      // Feedback is an enhancement — a failed load never blocks the report.
    }
  }

  // Optimistic: paint the verdict immediately, roll back on failure.
  // `note` undefined = keep whatever note is already stored (the server upsert
  // overwrites note on every PUT, so it must always be carried forward);
  // a string sets it; empty/whitespace clears it.
  async rate(
    briefingId: number,
    section: string,
    itemIndex: number | null,
    verdict: FeedbackVerdict,
    note?: string,
  ): Promise<void> {
    const k = this.key(briefingId, section, itemIndex);
    const previous = this._entries()[k] ?? null;
    const nextNote = resolveNote(verdict, note, previous?.note ?? null);
    this._entries.update((m) => ({ ...m, [k]: { verdict, note: nextNote } }));
    try {
      await firstValueFrom(this.http.put(`${this.base}/api/briefing/${briefingId}/feedback`, {
        section,
        item_index: itemIndex,
        verdict,
        ...(nextNote !== null ? { note: nextNote } : {}),
      }));
    } catch {
      this._entries.update((m) => {
        const next = { ...m };
        if (previous) next[k] = previous; else delete next[k];
        return next;
      });
    }
  }
}
