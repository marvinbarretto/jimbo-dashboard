import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type {
  AnyInterrogateEntity, BeliefContentPatch, EvidenceStance, InterrogateEntityType, InterrogateEvidence,
} from '@domain/interrogate';
import { ENTITY_TYPE_SEGMENT } from '@domain/interrogate';
import type { InterrogateEntityId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { InterrogateSnapshotService } from './interrogate-snapshot.service';

@Injectable({ providedIn: 'root' })
export class InterrogateEntityService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly snapshot = inject(InterrogateSnapshotService);
  private readonly base = `${environment.dashboardApiUrl}/api/interrogate`;

  // Edits `content` on any belief entity; experiments store the same text
  // under `hypothesis` (see domain/interrogate/belief-entity.ts).
  update(entityType: InterrogateEntityType, id: InterrogateEntityId, patch: BeliefContentPatch): void {
    const segment = ENTITY_TYPE_SEGMENT[entityType];
    const body = entityType === 'experiment' ? { hypothesis: patch.content } : { content: patch.content };
    this.http.patch<AnyInterrogateEntity>(`${this.base}/${segment}/${id}`, body).subscribe({
      next: (updated) => {
        this.snapshot.patchEntity(entityType, updated);
        this.toast.success('Updated');
      },
      error: (err) => this.toast.error(this.unwrapError(err, 'Failed to save the edit')),
    });
  }

  // Records Marvin's read on a belief's accuracy — a manual evidence row.
  // Already consumed by jimbo-api's contradiction/staleness scoring, not just logged.
  addEvidence(entityType: InterrogateEntityType, id: InterrogateEntityId, stance: EvidenceStance, snippet?: string): void {
    this.http.post<InterrogateEvidence>(`${this.base}/evidence`, {
      entity_type: entityType,
      entity_id: id,
      source_kind: 'manual',
      stance,
      snippet: snippet ?? null,
    }).subscribe({
      next: () => this.toast.success(stance === 'supports' ? 'Marked accurate' : 'Marked as not quite right'),
      error: (err) => this.toast.error(this.unwrapError(err, 'Failed to record feedback')),
    });
  }

  listEvidence(entityType: InterrogateEntityType, id: InterrogateEntityId) {
    const params = new HttpParams().set('entity_type', entityType).set('entity_id', id);
    return this.http.get<{ evidence: InterrogateEvidence[] }>(`${this.base}/evidence`, { params });
  }

  private unwrapError(err: unknown, fallback: string): string {
    const e = err as { error?: { error?: { message?: string } }; message?: string };
    return e?.error?.error?.message ?? e?.message ?? fallback;
  }
}
