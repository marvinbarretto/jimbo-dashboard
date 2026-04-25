import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// ── ⚠️ TEMPORARY MIGRATION SCAFFOLDING ⚠️ ─────────────────────────────────
//
// Manual trigger for the SQLite → Postgres sync. Lives in the sidebar while
// the dashboard runs against a Postgres replica of the live SQLite. Goes
// away once Postgres becomes the primary writer (Phase D).
//
// Don't add features that depend on this component. It is going away.

interface SyncResponse {
  ok: boolean;
  finished_at: string;
  duration_ms: number;
  snapshot_bytes: number;
  etl_log_tail: string;
  error?: string;
}

@Component({
  selector: 'app-sync-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="sync-btn"
      [class.sync-btn--syncing]="syncing()"
      [class.sync-btn--ok]="!syncing() && lastResult()?.ok === true"
      [class.sync-btn--err]="!syncing() && lastResult()?.ok === false"
      [disabled]="syncing()"
      [attr.title]="tooltip()"
      (click)="triggerSync()">
      @if (syncing()) {
        <span class="sync-btn__spinner" aria-hidden="true">⟳</span>
        <span>syncing…</span>
      } @else {
        <span aria-hidden="true">⤓</span>
        <span>sync</span>
        @if (lastResult(); as r) {
          <span class="sync-btn__age">· {{ relativeAge(r.finished_at) }}</span>
        }
      }
    </button>
    <p class="sync-btn__caveat">temporary — production SQLite mirror</p>
  `,
  styles: [`
    :host {
      display: block;
      margin-top: auto;
      padding-top: 0.75rem;
      border-top: 1px dashed var(--color-border);
    }
    .sync-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      width: 100%;
      padding: 0.4rem 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-bg);
      color: var(--color-text);
      font-size: 0.75rem;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s, color 0.15s;

      &:hover:not([disabled]) {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }
      &[disabled] { cursor: progress; opacity: 0.7; }

      &--ok    { border-color: color-mix(in oklch, var(--color-accent) 50%, var(--color-border)); }
      &--err   { border-color: var(--color-warning); color: var(--color-warning); }
      &--syncing { color: var(--color-text-muted); }
    }

    .sync-btn__spinner {
      animation: sync-spin 1.2s linear infinite;
      display: inline-block;
    }

    .sync-btn__age {
      margin-left: auto;
      opacity: 0.6;
      font-family: var(--font-mono);
      font-size: 0.65rem;
    }

    .sync-btn__caveat {
      margin: 0.4rem 0 0;
      font-size: 0.6rem;
      opacity: 0.5;
      font-style: italic;
      letter-spacing: 0.02em;
    }

    @keyframes sync-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .sync-btn__spinner { animation: none; }
    }
  `],
})
export class SyncButton {
  private readonly http = inject(HttpClient);

  private readonly _syncing = signal(false);
  private readonly _lastResult = signal<SyncResponse | null>(null);
  // Re-tick once a minute so the relative-age label refreshes without an explicit
  // signal write per tick.
  private readonly _now = signal(Date.now());

  readonly syncing = this._syncing.asReadonly();
  readonly lastResult = this._lastResult.asReadonly();

  readonly tooltip = computed(() => {
    const r = this._lastResult();
    if (!r) return 'Pull a fresh snapshot from the live SQLite into the Postgres replica';
    if (r.ok) return `Last sync ${r.finished_at} (${r.duration_ms} ms, ${(r.snapshot_bytes / 1e6).toFixed(1)} MB)`;
    return `Last sync FAILED: ${r.error ?? 'unknown error'}`;
  });

  constructor() {
    // GET current sync state on init so the button doesn't lie about freshness
    // when the page is reloaded mid-conversation.
    this.http.get<{ last: SyncResponse | null; in_progress: boolean }>('/api/sync').subscribe({
      next: ({ last, in_progress }) => {
        if (last) this._lastResult.set(last);
        this._syncing.set(in_progress);
      },
      error: () => { /* api unreachable; show neutral state */ },
    });
    setInterval(() => this._now.set(Date.now()), 60_000);
  }

  triggerSync(): void {
    if (this._syncing()) return;
    this._syncing.set(true);
    this.http.post<SyncResponse>('/api/sync', {}).subscribe({
      next: (r) => {
        this._lastResult.set(r);
        this._syncing.set(false);
        // Reload the page so all services pull from the freshly-loaded Postgres.
        // Reactive re-fetching in every service would be ideal, but for a
        // temporary scaffold, a hard reload is the cheapest correct answer.
        if (r.ok) location.reload();
      },
      error: (err) => {
        this._lastResult.set({
          ok: false,
          finished_at: new Date().toISOString(),
          duration_ms: 0,
          snapshot_bytes: 0,
          etl_log_tail: '',
          error: err?.error?.error ?? err?.message ?? 'request failed',
        });
        this._syncing.set(false);
      },
    });
  }

  relativeAge(iso: string): string {
    void this._now();  // subscribe to the tick
    const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60)    return `${Math.floor(seconds)}s`;
    if (seconds < 3600)  return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }
}
