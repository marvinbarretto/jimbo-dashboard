// Reads + mutates focus sessions via dashboard-api → jimbo-api proxy.
// State machine lives server-side: the page renders a wall-clock countdown
// against (started_at + planned_seconds) so a tab close or device switch
// doesn't lose the session.
//
// HTTP calls use firstValueFrom() so the service is signal-only on the
// outside — observables don't leak into pages or the rest of the app.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  FocusSession,
  FocusSessionStatus,
  StartFocusSessionPayload,
  CompleteFocusSessionPayload,
} from '@domain/focus-sessions';
import { focusSessionId, projectId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';

interface ApiFocusSession {
  id: string;
  project_id: string | null;
  started_at: string;
  ended_at: string | null;
  planned_seconds: number;
  actual_seconds: number | null;
  status: string;
  notes: string | null;
  tags: string[];
  created_at: string;
}

function narrowStatus(s: string): FocusSessionStatus {
  return s === 'completed' || s === 'abandoned' ? s : 'running';
}

function toSession(s: ApiFocusSession): FocusSession {
  return {
    id: focusSessionId(s.id),
    project_id: s.project_id ? projectId(s.project_id) : null,
    started_at: s.started_at,
    ended_at: s.ended_at,
    planned_seconds: s.planned_seconds,
    actual_seconds: s.actual_seconds,
    status: narrowStatus(s.status),
    notes: s.notes,
    tags: s.tags ?? [],
    created_at: s.created_at,
  };
}

@Injectable({ providedIn: 'root' })
export class FocusSessionsService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/focus-sessions`;

  private readonly _active = signal<FocusSession | null>(null);
  private readonly _recent = signal<FocusSession[]>([]);
  private readonly _loading = signal(true);

  readonly active = this._active.asReadonly();
  readonly recent = this._recent.asReadonly();
  readonly isLoading = this._loading.asReadonly();
  readonly hasActive = computed(() => this._active() !== null);

  async loadActive(): Promise<void> {
    try {
      const { active } = await firstValueFrom(
        this.http.get<{ active: ApiFocusSession | null }>(`${this.url}/active`),
      );
      this._active.set(active ? toSession(active) : null);
    } catch {
      // swallow — UI keeps prior state, toast on action paths only
    } finally {
      this._loading.set(false);
    }
  }

  async loadRecent(days = 7): Promise<void> {
    try {
      const { items } = await firstValueFrom(
        this.http.get<{ items: ApiFocusSession[] }>(`${this.url}?days=${days}`),
      );
      this._recent.set(items.map(toSession));
    } catch {
      // non-fatal — recent list is supplementary
    }
  }

  async start(payload: StartFocusSessionPayload): Promise<void> {
    try {
      const created = await firstValueFrom(
        this.http.post<ApiFocusSession>(this.url, payload),
      );
      this._active.set(toSession(created));
      this.toast.success('Focus session started');
    } catch {
      this.toast.error('Could not start session');
    }
  }

  async complete(id: string, payload: CompleteFocusSessionPayload = {}): Promise<void> {
    try {
      const updated = await firstValueFrom(
        this.http.patch<ApiFocusSession>(`${this.url}/${encodeURIComponent(id)}/complete`, payload),
      );
      this._active.set(null);
      this._recent.update(rs => [toSession(updated), ...rs]);
      this.toast.success('Session complete');
    } catch {
      this.toast.error('Could not complete session');
    }
  }

  async abandon(id: string): Promise<void> {
    try {
      const updated = await firstValueFrom(
        this.http.patch<ApiFocusSession>(`${this.url}/${encodeURIComponent(id)}/abandon`, {}),
      );
      this._active.set(null);
      this._recent.update(rs => [toSession(updated), ...rs]);
      this.toast.info('Session abandoned');
    } catch {
      this.toast.error('Could not abandon session');
    }
  }
}
