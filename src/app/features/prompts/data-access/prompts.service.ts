import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import type { Prompt, PromptVersion, CreatePromptPayload, UpdatePromptPayload, CreateVersionPayload } from '../utils/prompt.types';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PromptsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/prompts`;
  private readonly versionsUrl = `${environment.apiUrl}/prompt_versions`;

  private readonly _prompts = signal<Prompt[]>([]);
  private readonly _loading = signal(true);

  readonly prompts = this._prompts.asReadonly();
  readonly activePrompts = computed(() => this._prompts().filter(p => p.is_active));
  readonly isLoading = this._loading.asReadonly();

  constructor() { this.load(); }

  private load(): void {
    this.http.get<Prompt[]>(`${this.url}?order=display_name`).subscribe({
      next: data => { this._prompts.set(data); this._loading.set(false); },
      error: ()   => this._loading.set(false),
    });
  }

  getById(id: string): Prompt | undefined {
    return this._prompts().find(p => p.id === id);
  }

  loadVersions(promptId: string): Observable<PromptVersion[]> {
    return this.http.get<PromptVersion[]>(
      `${this.versionsUrl}?prompt_id=eq.${encodeURIComponent(promptId)}&order=version.desc`
    );
  }

  create(payload: CreatePromptPayload): void {
    const now = new Date().toISOString();
    const optimistic: Prompt = { ...payload, current_version_id: null, created_at: now, updated_at: now };
    this._prompts.update(ps => [...ps, optimistic]);
    this.http.post<Prompt[]>(this.url, payload, { headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([created]) => this._prompts.update(ps => ps.map(p => p.id === payload.id ? created : p)),
        error: ()          => this._prompts.update(ps => ps.filter(p => p.id !== payload.id)),
      });
  }

  update(id: string, patch: UpdatePromptPayload): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<Prompt[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({ next: ([updated]) => this._prompts.update(ps => ps.map(p => p.id === id ? updated : p)) });
  }

  remove(id: string): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.delete(this.url, { params })
      .subscribe({ next: () => this._prompts.update(ps => ps.filter(p => p.id !== id)) });
  }

  // Creates a new version and promotes it to current by default.
  // Returns the created version so callers can navigate on completion.
  createVersion(payload: CreateVersionPayload, autoPromote = true): Observable<PromptVersion> {
    return this.http.post<PromptVersion[]>(
      this.versionsUrl,
      payload,
      { headers: { Prefer: 'return=representation' } }
    ).pipe(
      map(([v]) => v),
      tap(v => { if (autoPromote) this.promoteVersion(payload.prompt_id, v.id); }),
    );
  }

  promoteVersion(promptId: string, versionId: string): void {
    const params = new HttpParams().set('id', `eq.${promptId}`);
    this.http.patch<Prompt[]>(
      this.url,
      { current_version_id: versionId },
      { params, headers: { Prefer: 'return=representation' } }
    ).subscribe({
      next: ([updated]) => this._prompts.update(ps => ps.map(p => p.id === promptId ? updated : p)),
    });
  }
}
