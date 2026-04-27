// Reads filesystem skills via dashboard-api proxy at /dashboard-api/api/skills.
// jimbo-api owns the canonical registry under $HUB_SKILLS_DIR; the proxy is
// thin server-to-server forwarding. Edits go through jimbo-api's git pipeline
// (pull --ff-only, write SKILL.md, commit, push to hub).

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import type { Skill, SkillMetadata } from '@domain/skills';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

export interface SkillPatch {
  name?: string;
  description?: string;
  metadata?: Partial<SkillMetadata>;
  body?: string;
}

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/skills`;

  private readonly _skills = signal<Skill[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  readonly skills = this._skills.asReadonly();
  readonly activeSkills = computed(() =>
    this._skills().filter(s => s.metadata.is_active !== false),
  );
  readonly isLoading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._skills.set([...SEED.skills]);
      this._loading.set(false);
      return;
    }
    this.http.get<Skill[]>(this.url).subscribe({
      next: items => { this._skills.set(items); this._loading.set(false); },
      error: err => {
        this._error.set(err?.message ?? 'failed to load skills');
        this._loading.set(false);
      },
    });
  }

  reload(): void {
    this._loading.set(true);
    this._error.set(null);
    this.load();
  }

  getById(id: string): Skill | undefined {
    return this._skills().find(s => s.id === id);
  }

  // PATCH a skill. Returns an Observable so the form can show success/error
  // toasts and navigate after the upstream git pipeline confirms. The local
  // signal is replaced with the server's authoritative response (post-pull,
  // post-commit) so the table stays in sync without a full reload.
  update(id: string, patch: SkillPatch): Observable<Skill> {
    return this.http.patch<Skill>(`${this.url}/${id}`, patch).pipe(
      tap(updated => {
        this._skills.update(ss => ss.map(s => s.id === id ? updated : s));
      }),
    );
  }

  // POST a new skill. Server pushes a `create skill: <id>` commit to hub.
  create(init: { id: string; name: string; description: string; metadata: SkillMetadata; body: string }): Observable<Skill> {
    return this.http.post<Skill>(this.url, init).pipe(
      tap(created => {
        this._skills.update(ss => [...ss, created].sort((a, b) => a.id.localeCompare(b.id)));
      }),
    );
  }

  // DELETE a skill. Returns void (server replies 204). Pulls the row out of
  // the local signal optimistically — the editor's already navigated away by
  // the time this fires anyway.
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      tap(() => {
        this._skills.update(ss => ss.filter(s => s.id !== id));
      }),
    );
  }

  // POST /:id/rename — `git mv` on the server. Returns the skill at its new id.
  rename(oldId: string, to: string): Observable<Skill> {
    return this.http.post<Skill>(`${this.url}/${oldId}/rename`, { to }).pipe(
      tap(renamed => {
        this._skills.update(ss => ss.filter(s => s.id !== oldId).concat(renamed)
          .sort((a, b) => a.id.localeCompare(b.id)));
      }),
    );
  }
}
