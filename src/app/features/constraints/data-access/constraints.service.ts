// Constraints scratchpad — the `constraints` context file.
//
// Deliberately the same context-item model as every other context file rather
// than a bespoke store: `interrogate_snapshot` already returns every context
// file, so an item added here is visible to every skill without wiring. A
// PAUSED item is simply absent from the agent's view — that is the whole
// mechanism, and why toggling is the primary interaction here rather than
// create/delete.

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';

/** Mirrors jimbo-api's ReadItemStatus. Only active/paused are set from here. */
export type ConstraintStatus = 'active' | 'paused' | 'completed' | 'deferred' | 'archived';

export interface ConstraintItem {
  id: number;
  section_id: number;
  content: string;
  label: string | null;
  status: ConstraintStatus | null;
  category: string | null;
  expires_at: string | null;
  sort_order: number;
}

export interface ConstraintSection {
  id: number;
  name: string;
  sort_order: number;
  /** Section-level scope. Null = global; a project id restricts it to that project's own view. */
  project_id: string | null;
  items: ConstraintItem[];
}

/**
 * Not root-provided — each consumer (the standalone global page, and each
 * project-landing embed) provides its own instance so scope never leaks
 * between a global load and a project-scoped one.
 */
@Injectable()
export class ConstraintsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  private readonly _sections = signal<ConstraintSection[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  readonly sections = this._sections.asReadonly();
  readonly isLoading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly activeCount = computed(() =>
    this._sections().reduce((n, s) => n + s.items.filter(i => i.status === 'active').length, 0),
  );
  readonly totalCount = computed(() =>
    this._sections().reduce((n, s) => n + s.items.length, 0),
  );

  /**
   * Load constraints scoped to `projectId`, or the global-only tier when
   * omitted/'none' — see `ProjectScopeQuery` on jimbo-api's GET /files/{slug}.
   */
  load(projectId?: string): void {
    this._loading.set(true);
    const scope = projectId ?? 'none';
    this.http.get<{ sections: ConstraintSection[] }>(
      `${this.base}/api/context/files/constraints?project_id=${encodeURIComponent(scope)}`,
    ).subscribe({
        next: f => {
          // Archived items are the expiry job's tombstones — history, not
          // something to switch back on, so they never reach the list.
          this._sections.set((f?.sections ?? []).map(s => ({
            ...s,
            items: (s.items ?? []).filter(i => i.status !== 'archived'),
          })));
          this._loading.set(false);
          this._error.set(null);
        },
        error: err => {
          this._error.set(err?.message ?? 'failed to load constraints');
          this._loading.set(false);
        },
      });
  }

  /**
   * Flip one constraint on or off. Optimistic — a toggle that waits on a
   * round-trip feels broken, and the cost of being briefly wrong is a checkbox,
   * not data loss. Reverts on failure.
   */
  setStatus(item: ConstraintItem, status: ConstraintStatus): void {
    const previous = item.status;
    this.patchLocal(item.id, status);
    this.http.put(`${this.base}/api/context/items/${item.id}`, { status }).subscribe({
      error: () => this.patchLocal(item.id, previous),
    });
  }

  private patchLocal(id: number, status: ConstraintStatus | null): void {
    this._sections.update(secs => secs.map(s => ({
      ...s,
      items: s.items.map(i => (i.id === id ? { ...i, status } : i)),
    })));
  }

  add(sectionId: number, content: string): void {
    this.http.post<ConstraintItem>(
      `${this.base}/api/context/sections/${sectionId}/items`,
      { content, status: 'active', category: 'life-area' },
    ).subscribe({
      next: created => this._sections.update(secs => secs.map(s =>
        s.id === sectionId ? { ...s, items: [...s.items, created] } : s,
      )),
      error: err => this._error.set(err?.message ?? 'failed to add constraint'),
    });
  }

  remove(item: ConstraintItem): void {
    this.http.delete(`${this.base}/api/context/items/${item.id}`).subscribe({
      next: () => this._sections.update(secs => secs.map(s => ({
        ...s,
        items: s.items.filter(i => i.id !== item.id),
      }))),
      error: err => this._error.set(err?.message ?? 'failed to remove constraint'),
    });
  }
}
