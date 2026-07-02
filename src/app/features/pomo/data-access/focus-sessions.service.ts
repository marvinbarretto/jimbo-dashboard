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
  ActivitySummary,
  FocusSession,
  FocusSessionStatus,
  SessionMood,
  StartFocusSessionPayload,
  CompleteFocusSessionPayload,
  UpdateFocusSessionPayload,
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
  mood: SessionMood | null;
  interrupted: boolean;
  notes: string | null;
  tags: string[];
  activity: ActivitySummary | null;
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
    mood: s.mood ?? null,
    interrupted: s.interrupted ?? false,
    notes: s.notes,
    tags: s.tags ?? [],
    activity: s.activity ?? null,
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

  // Broadcast pomo lifecycle to the Chrome extension's content-script bridge so
  // the toolbar countdown animates for web-started sessions (the extension SW
  // otherwise never learns a session began here). Decoupled: a plain DOM event,
  // no extension id. No-op when the bridge/extension isn't present.
  private signalExtension(kind: 'started' | 'stopped'): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(`jimbo:pomo-${kind}`));
  }

  async start(payload: StartFocusSessionPayload): Promise<FocusSession | null> {
    try {
      const created = await firstValueFrom(
        this.http.post<ApiFocusSession>(this.url, payload),
      );
      const session = toSession(created);
      this._active.set(session);
      this.signalExtension('started');
      this.toast.success('Focus session started');
      return session;
    } catch {
      this.toast.error('Could not start session');
      return null;
    }
  }

  /**
   * Link a vault item (the session's chosen story) so the declared intention is
   * a real edge in the graph, not just free text in `notes`. Best-effort.
   */
  async linkNote(sessionId: string, vaultNoteId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.url}/${encodeURIComponent(sessionId)}/notes`,
          { vault_note_id: vaultNoteId },
        ),
      );
    } catch {
      this.toast.error('Could not link the story to the session');
    }
  }

  async complete(id: string, payload: CompleteFocusSessionPayload = {}): Promise<void> {
    try {
      const updated = await firstValueFrom(
        this.http.patch<ApiFocusSession>(`${this.url}/${encodeURIComponent(id)}/complete`, payload),
      );
      this._active.set(null);
      this._recent.update(rs => [toSession(updated), ...rs]);
      this.signalExtension('stopped');
      this.toast.success('Session complete');
    } catch {
      this.toast.error('Could not complete session');
    }
  }

  // For sessions already completed by the extension — patches reflection metadata.
  async update(id: string, payload: UpdateFocusSessionPayload): Promise<void> {
    try {
      const updated = await firstValueFrom(
        this.http.patch<ApiFocusSession>(`${this.url}/${encodeURIComponent(id)}`, payload),
      );
      this._recent.update(rs => rs.map(s => s.id === id ? toSession(updated) : s));
      this.toast.success('Session saved');
    } catch {
      this.toast.error('Could not save session');
    }
  }

  async abandon(id: string): Promise<void> {
    try {
      const updated = await firstValueFrom(
        this.http.patch<ApiFocusSession>(`${this.url}/${encodeURIComponent(id)}/abandon`, {}),
      );
      this._active.set(null);
      this._recent.update(rs => [toSession(updated), ...rs]);
      this.signalExtension('stopped');
      this.toast.info('Session abandoned');
    } catch {
      this.toast.error('Could not abandon session');
    }
  }

  /** Vault notes linked to the session — the story / sub-task it was for. */
  async loadNotes(id: string): Promise<SessionVaultNote[]> {
    try {
      const { items } = await firstValueFrom(
        this.http.get<{ items: SessionVaultNote[] }>(
          `${this.url}/${encodeURIComponent(id)}/notes`,
        ),
      );
      return items ?? [];
    } catch {
      return [];
    }
  }
}

export interface SessionVaultNote {
  vault_note_id: string;
  title: string;
  status: string;
  type: string;
}
