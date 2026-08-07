import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  Commitment,
  CommitmentCreatePayload,
  CommitmentKind,
  CommitmentResolution,
  GratitudeItem,
  ReflectionSession,
  SessionPatch,
} from '@domain/reflection';
import { environment } from '../../../../environments/environment';

/**
 * Writes for the evening page. Reads go through `httpResource` in the
 * container, keyed on the day — this is only the mutation half.
 *
 * Nothing here writes prep. `PUT /api/reflection/prep/{day}` is the fleet's
 * one door into this domain and the dashboard has no business using it.
 */
@Injectable({ providedIn: 'root' })
export class EveningService {
  private readonly http = inject(HttpClient);
  private readonly reflection = `${environment.dashboardApiUrl}/api/reflection`;
  private readonly commitments = `${environment.dashboardApiUrl}/api/commitments`;

  /** Upsert the day's authored text. Omitted keys are left alone; explicit null clears. */
  saveSession(day: string, patch: SessionPatch): Observable<ReflectionSession> {
    return this.http.put<ReflectionSession>(`${this.reflection}/day/${day}`, patch);
  }

  complete(day: string): Observable<ReflectionSession> {
    return this.http.post<ReflectionSession>(`${this.reflection}/day/${day}/complete`, {});
  }

  reopen(day: string): Observable<ReflectionSession> {
    return this.http.post<ReflectionSession>(`${this.reflection}/day/${day}/reopen`, {});
  }

  /** His own words. */
  addGratitude(day: string, content: string): Observable<GratitudeItem> {
    return this.http.post<GratitudeItem>(`${this.reflection}/day/${day}/gratitude`, { content });
  }

  /**
   * Take up a prep suggestion. Passing `content` rewords it on the way through,
   * which the API records as `edited` — the one honest measure of whether
   * seeding is working.
   */
  acceptCandidate(day: string, seedRef: string, content?: string): Observable<GratitudeItem> {
    return this.http.post<GratitudeItem>(`${this.reflection}/day/${day}/gratitude`, {
      seed_ref: seedRef,
      ...(content ? { content } : {}),
    });
  }

  updateGratitude(id: number, content: string): Observable<GratitudeItem> {
    return this.http.patch<GratitudeItem>(`${this.reflection}/gratitude/${id}`, { content });
  }

  deleteGratitude(id: number): Observable<void> {
    return this.http.delete<void>(`${this.reflection}/gratitude/${id}`);
  }

  createCommitment(payload: CommitmentCreatePayload): Observable<Commitment> {
    return this.http.post<Commitment>(this.commitments, payload);
  }

  patchCommitment(
    id: string,
    patch: Partial<{ content: string; kind: CommitmentKind; delegable: boolean }>,
  ): Observable<Commitment> {
    return this.http.patch<Commitment>(`${this.commitments}/${id}`, patch);
  }

  /** Marvin's call, always — nothing infers 'kept' from activity. */
  resolveCommitment(id: string, status: CommitmentResolution, note?: string): Observable<Commitment> {
    return this.http.post<Commitment>(`${this.commitments}/${id}/resolve`, {
      status,
      ...(note ? { note } : {}),
    });
  }

  /** Defer. Returns the successor; the original stays on the record as 'carried'. */
  carryCommitment(id: string, forDay?: string): Observable<Commitment> {
    return this.http.post<Commitment>(`${this.commitments}/${id}/carry`, forDay ? { for_day: forDay } : {});
  }

  deleteCommitment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.commitments}/${id}`);
  }
}
