import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { InterrogateProposal, ProposalDecision } from '@domain/interrogate';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class InterrogateProposalsService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/interrogate/proposals`;

  private readonly _pending = signal<InterrogateProposal[]>([]);
  readonly pending = this._pending.asReadonly();

  loadPending(): void {
    const params = new HttpParams().set('status', 'pending');
    this.http.get<{ proposals: InterrogateProposal[] }>(this.url, { params }).subscribe({
      next: ({ proposals }) => this._pending.set(proposals),
      error: (err) => this.toast.error(this.unwrapError(err, 'Failed to load pending proposals')),
    });
  }

  decide(id: number, decision: ProposalDecision, editedPayload?: Record<string, unknown>): void {
    this.http.patch<InterrogateProposal>(`${this.url}/${id}`, {
      decision,
      ...(editedPayload ? { edited_payload: editedPayload } : {}),
    }).subscribe({
      next: () => {
        this._pending.update(list => list.filter(p => p.id !== id));
        this.toast.success(decision === 'reject' ? 'Proposal rejected' : 'Proposal applied');
      },
      error: (err) => this.toast.error(this.unwrapError(err, 'Failed to decide on proposal')),
    });
  }

  private unwrapError(err: unknown, fallback: string): string {
    const e = err as { error?: { error?: { message?: string } }; message?: string };
    return e?.error?.error?.message ?? e?.message ?? fallback;
  }
}
