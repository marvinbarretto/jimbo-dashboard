import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// Mirrors EmailReportSchema from jimbo-api/schemas/emails.ts. Stage timestamps
// double as audit log and queue marker — null = stage not yet done. The
// pipeline progresses: discovered_at → body_fetched_at → gated_at → verdict
// → vault_note_id (for keeps).
// Mirrors VerdictSchema in jimbo-api/schemas/emails.ts. This was still
// 'keep' | 'toss' until 2026-08-06 — long after the gate started writing
// fact/alert/event/reference — so every genuinely-kept email fell through the
// tone switch and rendered in the error colour.
export type EmailVerdict = 'fact' | 'alert' | 'event' | 'reference' | 'keep' | 'toss';

/** Everything except an explicit toss earned a vault note. */
export function isRetained(v: EmailVerdict | null): boolean {
  return v !== null && v !== 'toss';
}

/** Fleet member that gated the email — distinct from the model it used. */
export type ActorId = 'jimbo' | 'marvin' | 'kipper' | 'boris' | 'jeffrey';

export interface EmailReport {
  gmail_id: string;
  thread_id: string | null;
  from_name: string | null;
  from_email: string;
  subject: string | null;
  // ABSENT on the list response, present on the single-row detail fetch —
  // see jimbo-api docs/conventions/list-projections.md. The list carries
  // body_preview instead; body_text was 55% of a 313KB payload nothing rendered.
  body_text?: string | null;
  body_preview?: string | null;
  label_ids: string[] | null;
  discovered_at: string;
  body_fetched_at: string | null;
  gated_at: string | null;
  verdict: EmailVerdict | null;
  verdict_reason: string | null;
  verdict_model: string | null;
  actor_id: ActorId | null;
  vault_note_id: string | null;
  // What the email became, resolved server-side — the page no longer loads the
  // whole vault board to answer this.
  vault_note_seq?: number | null;
  vault_note_title?: string | null;
  vault_note_type?: string | null;
  vault_note_status?: string | null;
  epic_seq?: number | null;
  epic_title?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  project_color?: string | null;
  created_at: string;
  updated_at: string;
}

interface EmailReportListResponse {
  items: EmailReport[];
  total: number;
}

const REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_LIMIT = 50;

@Injectable({ providedIn: 'root' })
export class MailActivityService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  private readonly _items = signal<EmailReport[]>([]);
  private readonly _total = signal(0);
  private readonly _loading = signal(false);
  private readonly _lastError = signal<string | null>(null);
  private readonly _lastFetch = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly total = this._total.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly lastFetch = this._lastFetch.asReadonly();

  readonly count = computed(() => this._items().length);

  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.refresh();
    this.timerHandle = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  stop(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.started = false;
  }

  async refresh(limit: number = DEFAULT_LIMIT): Promise<void> {
    this._loading.set(true);
    this._lastError.set(null);
    try {
      const response = await firstValueFrom(this.http.get<EmailReportListResponse>(
        `${this.base}/api/emails/reports`,
        { params: { limit: String(limit) } },
      ));
      this._items.set(response.items ?? []);
      this._total.set(response.total ?? 0);
      this._lastFetch.set(new Date().toISOString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch failed';
      this._lastError.set(msg);
    } finally {
      this._loading.set(false);
    }
  }
}
