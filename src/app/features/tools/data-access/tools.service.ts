import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import type { Tool, ToolVersion, CreateToolPayload, UpdateToolPayload, CreateToolVersionPayload } from '../utils/tool.types';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class ToolsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/tools`;
  private readonly versionsUrl = `${environment.apiUrl}/tool_versions`;

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
    this.http.get<Tool[]>(`${this.url}?order=display_name`).subscribe({
      next: data => { this._tools.set(data); this._loading.set(false); },
      error: ()   => this._loading.set(false),
    });
  }

  getById(id: string): Tool | undefined {
    return this._tools().find(t => t.id === id);
  }

  loadVersions(toolId: string): Observable<ToolVersion[]> {
    if (isSeedMode()) {
      const versions = SEED.tool_versions
        .filter(v => v.tool_id === toolId)
        .slice()
        .sort((a, b) => b.version - a.version);
      return of(versions as ToolVersion[]);
    }
    return this.http.get<ToolVersion[]>(
      `${this.versionsUrl}?tool_id=eq.${encodeURIComponent(toolId)}&order=version.desc`
    );
  }

  create(payload: CreateToolPayload): void {
    const now = new Date().toISOString();
    const optimistic: Tool = { ...payload, current_version_id: null, created_at: now, updated_at: now };
    this._tools.update(ts => [...ts, optimistic]);
    this.http.post<Tool[]>(this.url, payload, { headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([created]) => this._tools.update(ts => ts.map(t => t.id === payload.id ? created : t)),
        error: ()          => this._tools.update(ts => ts.filter(t => t.id !== payload.id)),
      });
  }

  update(id: string, patch: UpdateToolPayload): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<Tool[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({ next: ([updated]) => this._tools.update(ts => ts.map(t => t.id === id ? updated : t)) });
  }

  remove(id: string): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.delete(this.url, { params })
      .subscribe({ next: () => this._tools.update(ts => ts.filter(t => t.id !== id)) });
  }

  createVersion(payload: CreateToolVersionPayload, autoPromote = true): Observable<ToolVersion> {
    return this.http.post<ToolVersion[]>(
      this.versionsUrl,
      payload,
      { headers: { Prefer: 'return=representation' } }
    ).pipe(
      map(([v]) => v),
      tap(v => { if (autoPromote) this.promoteVersion(payload.tool_id, v.id); }),
    );
  }

  promoteVersion(toolId: string, versionId: string): void {
    const params = new HttpParams().set('id', `eq.${toolId}`);
    this.http.patch<Tool[]>(
      this.url,
      { current_version_id: versionId },
      { params, headers: { Prefer: 'return=representation' } }
    ).subscribe({
      next: ([updated]) => this._tools.update(ts => ts.map(t => t.id === toolId ? updated : t)),
    });
  }
}
