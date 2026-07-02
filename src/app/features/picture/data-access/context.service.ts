import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { ContextItem } from '@domain/interrogate';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { InterrogateSnapshotService } from './interrogate-snapshot.service';

export interface ContextItemPatch {
  content?: string;
  label?: string | null;
  timeframe?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ContextService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly snapshot = inject(InterrogateSnapshotService);
  private readonly base = `${environment.dashboardApiUrl}/api/context`;

  updateItem(sectionId: number, id: number, patch: ContextItemPatch): void {
    this.http.put<ContextItem>(`${this.base}/items/${id}`, patch).subscribe({
      next: (updated) => {
        this.snapshot.patchContextItem(sectionId, updated);
        this.toast.success('Updated');
      },
      error: (err) => this.toast.error(this.unwrapError(err, 'Failed to save the edit')),
    });
  }

  deleteItem(sectionId: number, id: number): void {
    this.http.delete<{ deleted: true }>(`${this.base}/items/${id}`).subscribe({
      next: () => {
        this.snapshot.removeContextItem(sectionId, id);
        this.toast.success('Removed');
      },
      error: (err) => this.toast.error(this.unwrapError(err, 'Failed to remove')),
    });
  }

  addItem(sectionId: number, content: string): void {
    this.http.post<ContextItem>(`${this.base}/sections/${sectionId}/items`, { content }).subscribe({
      next: (created) => {
        this.snapshot.addContextItem(sectionId, created);
        this.toast.success('Added');
      },
      error: (err) => this.toast.error(this.unwrapError(err, 'Failed to add')),
    });
  }

  private unwrapError(err: unknown, fallback: string): string {
    const e = err as { error?: { error?: { message?: string } }; message?: string };
    return e?.error?.error?.message ?? e?.message ?? fallback;
  }
}
