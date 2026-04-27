// No-op shell — prompts/prompt_versions tables dropped in Phase A2 cleanup.
// Phase B will replace this with filesystem-backed editing.

import { Injectable, signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { Prompt, PromptVersion, CreatePromptPayload, UpdatePromptPayload, CreateVersionPayload } from '../utils/prompt.types';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class PromptsService {
  private readonly _prompts = signal<Prompt[]>(isSeedMode() ? [...SEED.prompts] : []);
  private readonly _loading = signal(false);

  readonly prompts = this._prompts.asReadonly();
  readonly activePrompts = computed(() => this._prompts().filter(p => p.is_active));
  readonly isLoading = this._loading.asReadonly();

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
    return of([]);
  }

  create(_payload: CreatePromptPayload): void {}
  update(_id: string, _patch: UpdatePromptPayload): void {}
  remove(_id: string): void {}
  createVersion(_payload: CreateVersionPayload, _autoPromote = true): Observable<PromptVersion> {
    return of({} as PromptVersion);
  }
  promoteVersion(_promptId: string, _versionId: string): void {}
}
