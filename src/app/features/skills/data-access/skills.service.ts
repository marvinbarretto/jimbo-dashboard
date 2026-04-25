// NOTE: The /skills endpoint exists in jimbo-api (Hono + SQLite on VPS) but the backend
// schema predates this redesign. Existing rows may carry legacy columns (notes,
// model_stack_id, updated_at) and will not deserialise cleanly against the new Skill type
// until jimbo-api migrates. Service code uses the new shape regardless.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Skill, CreateSkillPayload, UpdateSkillPayload } from '../../../domain/skills';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '../../../shared/seed-mode';
import { SEED } from '../../../domain/seed';

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/skills`;

  private readonly _skills = signal<Skill[]>([]);
  private readonly _loading = signal(true);

  readonly skills = this._skills.asReadonly();
  readonly activeSkills = computed(() => this._skills().filter(s => s.is_active));
  readonly isLoading = this._loading.asReadonly();

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._skills.set([...SEED.skills]);
      this._loading.set(false);
      return;
    }
    this.http.get<Skill[]>(`${this.url}?order=display_name`).subscribe({
      next: data => { this._skills.set(data); this._loading.set(false); },
      error: ()   => this._loading.set(false),
    });
  }

  getById(id: string): Skill | undefined {
    return this._skills().find(s => s.id === id);
  }

  create(payload: CreateSkillPayload): void {
    const now = new Date().toISOString();
    const optimistic: Skill = { ...payload, created_at: now };
    this._skills.update(ss => [...ss, optimistic]);
    this.http.post<Skill[]>(this.url, payload, { headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([created]) => this._skills.update(ss => ss.map(s => s.id === payload.id ? created : s)),
        error: ()          => this._skills.update(ss => ss.filter(s => s.id !== payload.id)),
      });
  }

  update(id: string, patch: UpdateSkillPayload): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<Skill[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({ next: ([updated]) => this._skills.update(ss => ss.map(s => s.id === id ? updated : s)) });
  }

  remove(id: string): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.delete(this.url, { params })
      .subscribe({ next: () => this._skills.update(ss => ss.filter(s => s.id !== id)) });
  }
}
