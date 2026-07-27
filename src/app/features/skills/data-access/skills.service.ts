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

/**
 * Dispatch outcomes for one skill. The registry says what a skill IS; this
 * says whether it earns its place — `rejected`/`proposed` matter as much as
 * `completed`, since a skill whose work is consistently declined is producing
 * something nobody wants. Skills with no dispatch history are absent from the
 * response, so a missing row means zero runs, not unknown.
 */
export interface SkillUsage {
  skill_id: string;
  runs: number;
  completed: number;
  rejected: number;
  proposed: number;
  failed: number;
  last_run_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/skills`;

  private readonly _skills = signal<Skill[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _usage = signal<Map<string, SkillUsage>>(new Map());

  /** Dispatch outcomes keyed by skill id. Empty map until loaded, or on failure. */
  readonly usage = this._usage.asReadonly();

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
    // Usage is a separate, non-blocking fetch: the registry is the page's
    // reason to exist, so a dispatch-stats failure must degrade to blank
    // columns rather than an empty page.
    this.http.get<{ items: SkillUsage[] }>(`${this.url}/usage`).subscribe({
      next: r => this._usage.set(new Map(r.items.map(u => [u.skill_id, u]))),
      error: () => this._usage.set(new Map()),
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
