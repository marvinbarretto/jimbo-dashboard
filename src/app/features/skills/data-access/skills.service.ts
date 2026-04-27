// Reads filesystem skills via dashboard-api proxy at /dashboard-api/api/skills.
// jimbo-api owns the canonical registry under $HUB_SKILLS_DIR; the proxy is
// thin server-to-server forwarding. Slice 2 ships read-only — slice 3 adds
// the M3 git-editor write paths.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Skill } from '@domain/skills';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

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
    // jimbo-api returns a bare array (not {items: [...]}). Match that shape.
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
}
