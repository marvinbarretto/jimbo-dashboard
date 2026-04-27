// Reads + mutates tools via dashboard-api (jimbo_pg-backed).
//
// NOTE: tool versioning was dropped in Phase 3 (Phase C consolidation).
// `loadVersions` / `createVersion` / `promoteVersion` are kept as no-ops
// so the existing UI compiles; tool-detail/tool-version-form components
// should be retired in Phase 3 part 3.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import type { Tool, ToolVersion, CreateToolPayload, UpdateToolPayload, CreateToolVersionPayload } from '../utils/tool.types';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class ToolsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/tools`;

  private readonly _tools = signal<Tool[]>([]);
  private readonly _loading = signal(true);

  readonly tools = this._tools.asReadonly();
  readonly activeTools = computed(() => this._tools().filter(t => t.is_active));
  readonly isLoading = this._loading.asReadonly();

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._tools.set([...SEED.tools]);
      this._loading.set(false);
      return;
    }
    this.http.get<{ items: Tool[] }>(this.url).subscribe({
      next: ({ items }) => { this._tools.set(items); this._loading.set(false); },
      error: ()         => this._loading.set(false),
    });
  }

  getById(id: string): Tool | undefined {
    return this._tools().find(t => t.id === id);
  }

  /** @deprecated tool_versions table removed in Phase 3 — returns empty. */
  loadVersions(_toolId: string): Observable<ToolVersion[]> {
    return of([]);
  }

  create(payload: CreateToolPayload): void {
    const now = new Date().toISOString();
    const optimistic: Tool = { ...payload, current_version_id: null, created_at: now, updated_at: now };
    this._tools.update(ts => [...ts, optimistic]);
    this.http.post<Tool>(this.url, payload)
      .subscribe({
        next: (created) => this._tools.update(ts => ts.map(t => t.id === payload.id ? created : t)),
        error: ()        => this._tools.update(ts => ts.filter(t => t.id !== payload.id)),
      });
  }

  update(id: string, patch: UpdateToolPayload): void {
    this.http.patch<Tool>(`${this.url}/${encodeURIComponent(id)}`, patch)
      .subscribe({ next: (updated) => this._tools.update(ts => ts.map(t => t.id === id ? updated : t)) });
  }

  remove(id: string): void {
    this.http.delete(`${this.url}/${encodeURIComponent(id)}`)
      .subscribe({ next: () => this._tools.update(ts => ts.filter(t => t.id !== id)) });
  }

  /** @deprecated tool_versions table removed in Phase 3 — no-op. */
  createVersion(_payload: CreateToolVersionPayload, _autoPromote = true): Observable<ToolVersion> {
    return of(null as unknown as ToolVersion);
  }

  /** @deprecated tool_versions table removed in Phase 3 — no-op. */
  promoteVersion(_toolId: string, _versionId: string): void {
    // no-op
  }
}
