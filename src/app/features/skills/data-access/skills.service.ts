// Reads + mutates skills via dashboard-api at /dashboard-api/api/skills
// (jimbo_pg-backed). Phase 3 part 2 of Phase C — replaces the legacy
// PostgREST path against the soon-to-be-decommissioned `jimbo` DB.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Skill, CreateSkillPayload, UpdateSkillPayload } from '@domain/skills';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/skills`;

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
    this.http.get<{ items: Skill[] }>(this.url).subscribe({
      next: ({ items }) => { this._skills.set(items); this._loading.set(false); },
      error: ()         => this._loading.set(false),
    });
  }

  getById(id: string): Skill | undefined {
    return this._skills().find(s => s.id === id);
  }

  create(payload: CreateSkillPayload): void {
    const now = new Date().toISOString();
    const optimistic: Skill = { ...payload, created_at: now };
    this._skills.update(ss => [...ss, optimistic]);
    this.http.post<Skill>(this.url, payload)
      .subscribe({
        next: (created) => this._skills.update(ss => ss.map(s => s.id === payload.id ? created : s)),
        error: ()        => this._skills.update(ss => ss.filter(s => s.id !== payload.id)),
      });
  }

  update(id: string, patch: UpdateSkillPayload): void {
    this.http.patch<Skill>(`${this.url}/${encodeURIComponent(id)}`, patch)
      .subscribe({ next: (updated) => this._skills.update(ss => ss.map(s => s.id === id ? updated : s)) });
  }

  remove(id: string): void {
    this.http.delete(`${this.url}/${encodeURIComponent(id)}`)
      .subscribe({ next: () => this._skills.update(ss => ss.filter(s => s.id !== id)) });
  }
}
