import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type {
  AnswerClarificationResponse, Clarification, ClarificationKind, ClarificationSourceKind, ClarificationStatus,
} from '@domain/clarifications';
import type { ClarificationId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';

export interface ClarificationFilters {
  status?: ClarificationStatus;
  kind?: ClarificationKind;
  source_kind?: ClarificationSourceKind;
}

@Injectable({ providedIn: 'root' })
export class ClarificationsService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/clarifications`;

  private readonly _clarifications = signal<Clarification[]>([]);
  readonly clarifications = this._clarifications.asReadonly();
  readonly loading = signal(false);

  load(filters: ClarificationFilters = {}): void {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.kind) params = params.set('kind', filters.kind);
    if (filters.source_kind) params = params.set('source_kind', filters.source_kind);
    this.http.get<{ clarifications: Clarification[] }>(this.url, { params }).subscribe({
      next: ({ clarifications }) => { this._clarifications.set(clarifications); this.loading.set(false); },
      error: (err) => {
        this.toast.error(this.unwrapError(err, 'Failed to load clarifications'));
        this.loading.set(false);
      },
    });
  }

  dismiss(id: ClarificationId): void {
    this.http.patch<Clarification>(`${this.url}/${id}`, { status: 'dismissed' }).subscribe({
      next: (updated) => this.patchLocal(updated),
      error: (err) => this.toast.error(this.unwrapError(err, 'Failed to dismiss clarification')),
    });
  }

  answer(id: ClarificationId, answerText: string): void {
    this.http.post<AnswerClarificationResponse>(`${this.url}/answer`, {
      clarification_id: id,
      answer_text: answerText,
    }).subscribe({
      next: ({ clarification, echo }) => {
        this.patchLocal(clarification);
        this.toast.success(echo);
      },
      error: (err) => this.toast.error(this.unwrapError(err, 'Failed to submit answer')),
    });
  }

  private patchLocal(updated: Clarification): void {
    this._clarifications.update(list => list.map(c => c.id === updated.id ? updated : c));
  }

  private unwrapError(err: unknown, fallback: string): string {
    const e = err as { error?: { error?: { message?: string } }; message?: string };
    return e?.error?.error?.message ?? e?.message ?? fallback;
  }
}
