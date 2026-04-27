// Reads + mutates prompts via dashboard-api (jimbo_pg-backed). Versions
// live under /prompts/{id}/versions; new versions auto-assign version
// number via DB trigger and (by default) flip current_version_id.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import type { Prompt, PromptVersion, CreatePromptPayload, UpdatePromptPayload, CreateVersionPayload } from '../utils/prompt.types';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class PromptsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/prompts`;

  private readonly _prompts = signal<Prompt[]>([]);
  private readonly _loading = signal(true);

  readonly prompts = this._prompts.asReadonly();
  readonly activePrompts = computed(() => this._prompts().filter(p => p.is_active));
  readonly isLoading = this._loading.asReadonly();

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._prompts.set([...SEED.prompts]);
      this._loading.set(false);
      return;
    }
    this.http.get<{ items: Prompt[] }>(this.url).subscribe({
      next: ({ items }) => { this._prompts.set(items); this._loading.set(false); },
      error: ()         => this._loading.set(false),
    });
  }

  getById(id: string): Prompt | undefined {
    return this._prompts().find(p => p.id === id);
  }

  loadVersions(promptId: string): Observable<PromptVersion[]> {
    if (isSeedMode()) {
      const versions = SEED.prompt_versions
        .filter(v => v.prompt_id === promptId)
        .slice()
        .sort((a, b) => b.version - a.version);
      return of(versions as PromptVersion[]);
    }
    return this.http.get<{ items: PromptVersion[] }>(`${this.url}/${encodeURIComponent(promptId)}/versions`)
      .pipe(map(r => r.items));
  }

  create(payload: CreatePromptPayload): void {
    const now = new Date().toISOString();
    const optimistic: Prompt = { ...payload, current_version_id: null, created_at: now, updated_at: now };
    this._prompts.update(ps => [...ps, optimistic]);
    this.http.post<Prompt>(this.url, payload)
      .subscribe({
        next: (created) => this._prompts.update(ps => ps.map(p => p.id === payload.id ? created : p)),
        error: ()        => this._prompts.update(ps => ps.filter(p => p.id !== payload.id)),
      });
  }

  update(id: string, patch: UpdatePromptPayload): void {
    this.http.patch<Prompt>(`${this.url}/${encodeURIComponent(id)}`, patch)
      .subscribe({ next: (updated) => this._prompts.update(ps => ps.map(p => p.id === id ? updated : p)) });
  }

  remove(id: string): void {
    this.http.delete(`${this.url}/${encodeURIComponent(id)}`)
      .subscribe({ next: () => this._prompts.update(ps => ps.filter(p => p.id !== id)) });
  }

  // Creates a new version and promotes it to current by default.
  // The backend auto-assigns version_number and (by default) flips
  // prompts.current_version_id atomically.
  createVersion(payload: CreateVersionPayload, autoPromote = true): Observable<PromptVersion> {
    const { prompt_id, ...body } = payload;
    return this.http.post<PromptVersion>(
      `${this.url}/${encodeURIComponent(prompt_id)}/versions`,
      { ...body, set_as_current: autoPromote },
    ).pipe(
      tap(() => { if (autoPromote) this.load(); }),  // refresh to pick up new current_version_id
    );
  }

  promoteVersion(promptId: string, versionId: string): void {
    this.http.patch<Prompt>(`${this.url}/${encodeURIComponent(promptId)}`, { current_version_id: versionId })
      .subscribe({
        next: (updated) => this._prompts.update(ps => ps.map(p => p.id === promptId ? updated : p)),
      });
  }
}
